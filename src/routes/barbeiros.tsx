import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/format";
import {
  createBarber,
  deleteBarber,
  updateBarberPassword,
} from "@/lib/barbers.functions";

export const Route = createFileRoute("/barbeiros")({
  ssr: false,
  head: () => ({ meta: [{ title: "Barbeiros — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <BarbeirosPage />
    </AppShell>
  ),
});

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function BarbeirosPage() {
  const { isOwner } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const createBarberFn = useServerFn(createBarber);
  const deleteBarberFn = useServerFn(deleteBarber);
  const updatePasswordFn = useServerFn(updateBarberPassword);

  const { data: barbers } = useQuery({
    queryKey: ["barbers-list"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "barber");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .in("id", ids)
        .order("full_name");
      return data ?? [];
    },
  });

  const { data: hours } = useQuery({
    queryKey: ["working-hours", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase
        .from("working_hours")
        .select("*")
        .eq("barber_id", selected!)
        .order("weekday");
      return data ?? [];
    },
  });

  if (!isOwner) {
    return (
      <p className="text-sm text-muted-foreground">Apenas o dono pode gerenciar barbeiros.</p>
    );
  }

  async function updateProfile(id: string, patch: Partial<{ full_name: string; slug: string | null; phone: string | null; avatar_url: string | null; bio: string | null; is_active: boolean }>) {
    await supabase.from("profiles").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["barbers-list"] });
  }

  return (
    <>
      <h1 className="font-display text-3xl tracking-wider">Barbeiros</h1>
      <p className="text-sm text-muted-foreground">
        Cadastre novos barbeiros, defina perfil público, slug e horários.
      </p>

      <NewBarberForm
        onCreate={async (payload) => {
          await createBarberFn({ data: payload });
          await qc.invalidateQueries({ queryKey: ["barbers-list"] });
          toast.success("Barbeiro cadastrado");
        }}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-xl border border-border bg-card p-2">
          {(barbers ?? []).length === 0 && (
            <p className="p-6 text-center text-xs text-muted-foreground">
              Nenhum barbeiro. Peça que se cadastrem em /login.
            </p>
          )}
          {(barbers ?? []).map((b) => (
            <button
              key={b.id}
              onClick={() => setSelected(b.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                selected === b.id ? "bg-secondary" : "hover:bg-secondary/50"
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-display">
                {b.full_name?.slice(0, 1)}
              </span>
              <span className="min-w-0">
                <p className="truncate font-medium">{b.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  /b/{b.slug ?? "—"}
                </p>
              </span>
            </button>
          ))}
        </div>

        <div>
          {!selected ? (
            <p className="text-sm text-muted-foreground">
              Selecione um barbeiro à esquerda.
            </p>
          ) : (
            (barbers ?? []).filter((x) => x.id === selected).map((b) => (
                <div key={b.id} className="space-y-6">
                  <section className="rounded-xl border border-border bg-card p-5">
                    <h2 className="font-display text-xl tracking-wide">Perfil</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Nome"
                        defaultValue={b.full_name}
                        onSave={(v) => updateProfile(b.id, { full_name: v })}
                      />
                      <Field
                        label="Slug (link da bio)"
                        defaultValue={b.slug ?? slugify(b.full_name)}
                        onSave={(v) => updateProfile(b.id, { slug: slugify(v) })}
                      />
                      <Field
                        label="WhatsApp"
                        defaultValue={b.phone ?? ""}
                        onSave={(v) => updateProfile(b.id, { phone: v })}
                      />
                      <Field
                        label="Foto (URL)"
                        defaultValue={b.avatar_url ?? ""}
                        onSave={(v) => updateProfile(b.id, { avatar_url: v })}
                      />
                      <div className="sm:col-span-2">
                        <Field
                          label="Bio"
                          defaultValue={b.bio ?? ""}
                          onSave={(v) => updateProfile(b.id, { bio: v })}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateProfile(b.id, { is_active: !b.is_active })
                        }
                      >
                        {b.is_active ? "Desativar" : "Reativar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const pw = window.prompt("Nova senha (mín. 8 caracteres)");
                          if (!pw || pw.length < 8) return;
                          try {
                            await updatePasswordFn({ data: { barber_id: b.id, password: pw } });
                            toast.success("Senha atualizada");
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        Trocar senha
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={async () => {
                          if (!window.confirm(`Remover ${b.full_name}? Esta ação não pode ser desfeita.`)) return;
                          try {
                            await deleteBarberFn({ data: { barber_id: b.id } });
                            await qc.invalidateQueries({ queryKey: ["barbers-list"] });
                            setSelected(null);
                            toast.success("Barbeiro removido");
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  </section>


                  <section className="rounded-xl border border-border bg-card p-5">
                    <h2 className="font-display text-xl tracking-wide">Horários</h2>
                    <p className="text-xs text-muted-foreground">
                      Defina os blocos disponíveis para cada dia da semana.
                    </p>
                    <div className="mt-3 space-y-2">
                      {WEEKDAYS.map((label, wd) => {
                        const block = (hours ?? []).find((h) => h.weekday === wd);
                        return (
                          <WeekRow
                            key={wd}
                            label={label}
                            block={block}
                            onSave={async (start, end) => {
                              if (block) {
                                await supabase
                                  .from("working_hours")
                                  .update({ start_time: start, end_time: end })
                                  .eq("id", block.id);
                              } else {
                                await supabase.from("working_hours").insert({
                                  barber_id: b.id,
                                  weekday: wd,
                                  start_time: start,
                                  end_time: end,
                                });
                              }
                              qc.invalidateQueries({ queryKey: ["working-hours", b.id] });
                              toast.success("Horário salvo");
                            }}
                            onDelete={async () => {
                              if (!block) return;
                              await supabase
                                .from("working_hours")
                                .delete()
                                .eq("id", block.id);
                              qc.invalidateQueries({ queryKey: ["working-hours", b.id] });
                            }}
                          />
                        );
                      })}
                    </div>
                  </section>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  defaultValue,
  onSave,
}: {
  label: string;
  defaultValue: string;
  onSave: (v: string) => void;
}) {
  const [v, setV] = useState(defaultValue);
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <Input value={v} onChange={(e) => setV(e.target.value)} />
        <Button variant="outline" size="sm" onClick={() => onSave(v)}>
          OK
        </Button>
      </div>
    </div>
  );
}

function WeekRow({
  label,
  block,
  onSave,
  onDelete,
}: {
  label: string;
  block?: { start_time: string; end_time: string };
  onSave: (start: string, end: string) => void;
  onDelete: () => void;
}) {
  const [start, setStart] = useState(block?.start_time?.slice(0, 5) ?? "09:00");
  const [end, setEnd] = useState(block?.end_time?.slice(0, 5) ?? "18:00");
  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
      <span className="w-10 font-medium">{label}</span>
      <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-28" />
      <span className="text-muted-foreground">→</span>
      <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-28" />
      <Button variant="outline" size="sm" onClick={() => onSave(start, end)}>
        Salvar
      </Button>
      {block && (
        <Button variant="ghost" size="sm" onClick={onDelete}>
          Limpar
        </Button>
      )}
    </div>
  );
}




interface NewBarberPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
}

function NewBarberForm({ onCreate }: { onCreate: (p: NewBarberPayload) => Promise<void> }) {
  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!full_name || !email || password.length < 8) {
      toast.error("Preencha nome, e-mail e senha (mín. 8 caracteres).");
      return;
    }
    setBusy(true);
    try {
      await onCreate({ full_name, email, password, phone: phone || null });
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="lg:col-span-5">
        <h2 className="font-display text-lg tracking-wide">Cadastrar novo barbeiro</h2>
        <p className="text-xs text-muted-foreground">
          O barbeiro receberá acesso com este e-mail e senha. Compartilhe com ele para o primeiro login.
        </p>
      </div>
      <Input placeholder="Nome completo" value={full_name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input placeholder="Senha (mín. 8)" type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Input placeholder="WhatsApp (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Button type="submit" disabled={busy}>
        {busy ? "Criando..." : "Cadastrar"}
      </Button>
    </form>
  );
}

