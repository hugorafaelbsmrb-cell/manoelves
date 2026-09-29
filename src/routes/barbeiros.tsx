import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BannerUpload } from "@/components/banner-upload";
import { slugify } from "@/lib/format";
import {
  createBarber,
  deleteBarber,
  updateBarberPassword,
  listOwners,
  grantOwnerByEmail,
  removeOwnerAccess,
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
  const { isOwner, user } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const createBarberFn = useServerFn(createBarber);
  const deleteBarberFn = useServerFn(deleteBarber);
  const updatePasswordFn = useServerFn(updateBarberPassword);
  const listOwnersFn = useServerFn(listOwners);
  const grantOwnerFn = useServerFn(grantOwnerByEmail);
  const removeOwnerFn = useServerFn(removeOwnerAccess);

  const [owners, setOwners] = useState<{ user_id: string; full_name: string; email: string }[]>([]);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerBusy, setOwnerBusy] = useState(false);

  async function loadOwners() {
    try {
      setOwners(await listOwnersFn());
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  useEffect(() => {
    listOwnersFn()
      .then(setOwners)
      .catch((e) => toast.error((e as Error).message));
  }, [listOwnersFn]);

  async function addOwner() {
    const email = ownerEmail.trim();
    if (!email) {
      toast.error("Informe o e-mail da conta.");
      return;
    }
    setOwnerBusy(true);
    try {
      await grantOwnerFn({ data: { email } });
      toast.success("Acesso de dono concedido.");
      setOwnerEmail("");
      await loadOwners();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOwnerBusy(false);
    }
  }

  async function removeOwner(userId: string) {
    try {
      await removeOwnerFn({ data: { user_id: userId } });
      toast.success("Acesso de dono removido.");
      await loadOwners();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const { data: barbers } = useQuery({
    queryKey: ["barbers-list"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "barber");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data } = await supabase.from("profiles").select("*").in("id", ids).order("full_name");
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

  const { data: commission } = useQuery({
    queryKey: ["commission-rules", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data } = await supabase
        .from("commission_rules")
        .select("*")
        .eq("barber_id", selected!)
        .maybeSingle();
      return data;
    },
  });

  async function saveCommission(barberId: string, service_pct: number, product_pct: number) {
    const { error } = await supabase
      .from("commission_rules")
      .upsert({ barber_id: barberId, service_pct, product_pct }, { onConflict: "barber_id" });
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["commission-rules", barberId] });
    toast.success("Comissão salva");
  }

  async function saveWeekdayHours(barberId: string, wd: number, active: string[]) {
    const { error: delErr } = await supabase
      .from("working_hours")
      .delete()
      .eq("barber_id", barberId)
      .eq("weekday", wd);
    if (delErr) throw new Error(delErr.message);
    const blocks = hoursToBlocks(active);
    if (blocks.length > 0) {
      const { error } = await supabase.from("working_hours").insert(
        blocks.map((blk) => ({
          barber_id: barberId,
          weekday: wd,
          start_time: blk.start_time,
          end_time: blk.end_time,
        })),
      );
      if (error) throw new Error(error.message);
    }
    await qc.invalidateQueries({ queryKey: ["working-hours", barberId] });
  }

  if (!isOwner) {
    return <p className="text-sm text-muted-foreground">Apenas o dono pode gerenciar barbeiros.</p>;
  }

  async function updateProfile(
    id: string,
    patch: Partial<{
      full_name: string;
      slug: string | null;
      phone: string | null;
      avatar_url: string | null;
      banner_url: string | null;
      bio: string | null;
      is_active: boolean;
    }>,
  ) {
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
          toast.success(payload.role === "owner" ? "Dono cadastrado" : "Barbeiro cadastrado");
        }}
      />

      <OwnersSection
        owners={owners}
        currentUserId={user?.id}
        ownerEmail={ownerEmail}
        ownerBusy={ownerBusy}
        onEmailChange={setOwnerEmail}
        onAdd={addOwner}
        onRemove={removeOwner}
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
                <p className="truncate text-xs text-muted-foreground">/{b.slug ?? "—"}</p>
              </span>
            </button>
          ))}
        </div>

        <div>
          {!selected ? (
            <p className="text-sm text-muted-foreground">Selecione um barbeiro à esquerda.</p>
          ) : (
            (barbers ?? [])
              .filter((x) => x.id === selected)
              .map((b) => (
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
                      <div className="sm:col-span-2">
                        <AvatarUpload
                          barberId={b.id}
                          url={b.avatar_url ?? ""}
                          onSaved={(u: string) => updateProfile(b.id, { avatar_url: u })}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <BannerUpload
                          folder={`barbers/${b.id}`}
                          url={(b as { banner_url?: string | null }).banner_url ?? ""}
                          onSaved={(u) => updateProfile(b.id, { banner_url: u || null })}
                          label="Banner do perfil"
                          hint="Aparece no topo da página pública do barbeiro. Recomendado 1920×480."
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Field
                          label="Bio"
                          defaultValue={b.bio ?? ""}
                          onSave={(v) => updateProfile(b.id, { bio: v })}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {b.slug && (
                        <>
                          <Button asChild variant="outline" size="sm">
                            <a href={`/${b.slug}`} target="_blank" rel="noreferrer">
                              Ver página pública
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(`${location.origin}/${b.slug}`);
                              toast.success("Link copiado");
                            }}
                          >
                            Copiar link
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateProfile(b.id, { is_active: !b.is_active })}
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
                          if (
                            !window.confirm(
                              `Remover ${b.full_name}? Esta ação não pode ser desfeita.`,
                            )
                          )
                            return;
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

                  <CommissionSection
                    key={`comm-${b.id}`}
                    servicePct={Number(commission?.service_pct ?? 50)}
                    productPct={Number(commission?.product_pct ?? 10)}
                    onSave={(s, p) => saveCommission(b.id, s, p)}
                  />

                  <HourAvailabilitySection
                    key={`hours-${b.id}`}
                    hours={hours ?? []}
                    onSave={(wd, active) => saveWeekdayHours(b.id, wd, active)}
                  />
                </div>
              ))
          )}
        </div>
      </div>
    </>
  );
}

function CommissionSection({
  servicePct,
  productPct,
  onSave,
}: {
  servicePct: number;
  productPct: number;
  onSave: (service: number, product: number) => void;
}) {
  const [service, setService] = useState(String(servicePct));
  const [product, setProduct] = useState(String(productPct));
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-xl tracking-wide">Comissão (margem do barbeiro)</h2>
      <p className="text-xs text-muted-foreground">
        Percentual que o barbeiro recebe sobre serviços e produtos vendidos (0–100%).
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label className="text-xs text-muted-foreground">Serviços (%)</label>
          <Input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={service}
            onChange={(e) => setService(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Produtos (%)</label>
          <Input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            const s = Number(service);
            const p = Number(product);
            if (Number.isNaN(s) || Number.isNaN(p) || s < 0 || s > 100 || p < 0 || p > 100) {
              toast.error("Informe valores entre 0 e 100.");
              return;
            }
            onSave(s, p);
          }}
        >
          Salvar comissão
        </Button>
      </div>
    </section>
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

const HOURS_GRID = Array.from({ length: 12 }, (_, i) => `${9 + i}:00`);

function hoursToBlocks(active: string[]): { start_time: string; end_time: string }[] {
  const sorted = [...active].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const blocks: { start_time: string; end_time: string }[] = [];
  for (const h of sorted) {
    const n = parseInt(h, 10);
    const last = blocks[blocks.length - 1];
    if (last && parseInt(last.end_time, 10) === n) {
      last.end_time = `${n + 1}:00`;
    } else {
      blocks.push({ start_time: h, end_time: `${n + 1}:00` });
    }
  }
  return blocks;
}

function blocksToActiveHours(
  blocks: { weekday: number; start_time: string; end_time: string }[],
): Map<number, string[]> {
  const byWd = new Map<number, Set<string>>();
  for (const b of blocks) {
    if (!byWd.has(b.weekday)) byWd.set(b.weekday, new Set());
    const [sh] = b.start_time.split(":").map(Number);
    const [eh] = b.end_time.split(":").map(Number);
    for (let h = sh; h < eh; h++) byWd.get(b.weekday)!.add(`${h}:00`);
  }
  const out = new Map<number, string[]>();
  for (const [wd, set] of byWd) out.set(wd, [...set]);
  return out;
}

function HourAvailabilitySection({
  hours,
  onSave,
}: {
  hours: { weekday: number; start_time: string; end_time: string }[];
  onSave: (weekday: number, active: string[]) => Promise<void>;
}) {
  const [local, setLocal] = useState<Record<number, string[]>>({});
  const [savingWd, setSavingWd] = useState<number | null>(null);

  useEffect(() => {
    const byWd = blocksToActiveHours(hours);
    const next: Record<number, string[]> = {};
    for (let wd = 0; wd < 7; wd++) {
      const hasData = hours.some((h) => h.weekday === wd);
      next[wd] = hasData ? (byWd.get(wd) ?? []) : [...HOURS_GRID];
    }
    setLocal(next);
  }, [hours]);

  async function toggle(wd: number, hour: string) {
    const cur = local[wd] ?? [...HOURS_GRID];
    const active = cur.includes(hour) ? cur.filter((h) => h !== hour) : [...cur, hour];
    setLocal((p) => ({ ...p, [wd]: active }));
    setSavingWd(wd);
    try {
      await onSave(wd, active);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingWd(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-xl tracking-wide">Horários de atendimento</h2>
      <p className="text-xs text-muted-foreground">
        De hora em hora, das 09h às 20h. Barbeiro novo começa com tudo livre — toque numa hora para
        bloquear (cinza) ou liberar de novo. Salvo automaticamente.
      </p>
      <div className="mt-3 space-y-3">
        {WEEKDAYS.map((label, wd) => (
          <div key={wd} className="rounded-md border border-border p-3 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">
                {savingWd === wd
                  ? "Salvando..."
                  : `${(local[wd] ?? HOURS_GRID).length} de 12 horas livres`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {HOURS_GRID.map((hour) => {
                const active = (local[wd] ?? HOURS_GRID).includes(hour);
                return (
                  <button
                    key={hour}
                    type="button"
                    disabled={savingWd === wd}
                    onClick={() => toggle(wd, hour)}
                    className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground line-through"
                    }`}
                  >
                    {hour.slice(0, 5)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

interface NewBarberPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string | null;
  role: "barber" | "owner";
}

function NewBarberForm({ onCreate }: { onCreate: (p: NewBarberPayload) => Promise<void> }) {
  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"barber" | "owner">("barber");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!full_name || !email || password.length < 8) {
      toast.error("Preencha nome, e-mail e senha (mín. 8 caracteres).");
      return;
    }
    setBusy(true);
    try {
      await onCreate({ full_name, email, password, phone: phone || null, role });
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setRole("barber");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-6"
    >
      <div className="sm:col-span-2 lg:col-span-6">
        <h2 className="font-display text-lg tracking-wide">Cadastrar novo acesso</h2>
        <p className="text-xs text-muted-foreground">
          Crie a conta e escolha o papel: barbeiro (vê apenas a própria operação) ou dono (acesso
          total ao sistema).
        </p>
      </div>
      <Input
        placeholder="Nome completo"
        value={full_name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        placeholder="E-mail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        placeholder="Senha (mín. 8)"
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Input
        placeholder="WhatsApp (opcional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as "barber" | "owner")}
        className="rounded-md border border-border bg-background px-3 text-sm"
      >
        <option value="barber">Barbeiro</option>
        <option value="owner">Dono (admin)</option>
      </select>
      <Button type="submit" disabled={busy}>
        {busy ? "Criando..." : "Cadastrar"}
      </Button>
    </form>
  );
}
interface OwnerInfo {
  user_id: string;
  full_name: string;
  email: string;
}

function OwnersSection({
  owners,
  currentUserId,
  ownerEmail,
  ownerBusy,
  onEmailChange,
  onAdd,
  onRemove,
}: {
  owners: OwnerInfo[];
  currentUserId?: string;
  ownerEmail: string;
  ownerBusy: boolean;
  onEmailChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (userId: string) => void;
}) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-lg tracking-wide">Donos — acesso total</h2>
      <p className="text-xs text-muted-foreground">
        Quem tem acesso de dono vê e gerencia tudo: financeiro, assinaturas, marketing,
        configurações e o cadastro da equipe.
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {owners.map((o) => (
          <li
            key={o.user_id}
            className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {o.full_name}
                {o.user_id === currentUserId && (
                  <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">{o.email}</p>
            </div>
            {o.user_id !== currentUserId && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onRemove(o.user_id)}
              >
                Remover acesso
              </Button>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1">
          <label className="text-xs text-muted-foreground">
            Adicionar dono pelo e-mail da conta existente
          </label>
          <Input
            type="email"
            placeholder="email@cadastrado.com"
            value={ownerEmail}
            onChange={(e) => onEmailChange(e.target.value)}
          />
        </div>
        <Button onClick={onAdd} disabled={ownerBusy}>
          {ownerBusy ? "Adicionando..." : "Tornar dono"}
        </Button>
      </div>
    </div>
  );
}

function AvatarUpload({
  barberId,
  url,
  onSaved,
}: {
  barberId: string;
  url: string;
  onSaved: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB.");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${barberId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      onSaved(data.publicUrl);
      toast.success("Foto atualizada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="text-xs text-muted-foreground">Foto de perfil</label>
      <div className="mt-1 flex items-center gap-3">
        {url ? (
          <img
            src={url}
            alt="Avatar"
            className="h-16 w-16 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
            sem foto
          </div>
        )}
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <span className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm hover:bg-secondary">
            {busy ? "Enviando..." : url ? "Trocar foto" : "Enviar foto"}
          </span>
        </label>
        {url && (
          <Button variant="ghost" size="sm" onClick={() => onSaved("")}>
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}
