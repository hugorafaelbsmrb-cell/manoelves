import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Search,
  MessageCircle,
  CreditCard,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/clientes")({
  ssr: false,
  head: () => ({ meta: [{ title: "Clientes — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

type ClientRow = {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  birthday: string | null;
  notes: string | null;
  lastVisit: string | null;
  visits: number;
  totalSpent: number;
};

function normalizePhone(raw: string | null | undefined) {
  return (raw ?? "").replace(/\D+/g, "");
}

// Link do WhatsApp: adiciona o DDI do Brasil quando o número é só DDD+telefone.
function waLink(phone: string) {
  const digits = normalizePhone(phone);
  if (digits.length < 10) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function Page() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [removing, setRemoving] = useState<ClientRow | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: clientsRaw } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name, whatsapp, email, birthday, notes")
        .order("name");
      return data ?? [];
    },
  });

  const { data: appts } = useQuery({
    queryKey: ["clients-appts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("client_name, client_whatsapp, start_at, total_cents")
        .order("start_at", { ascending: false })
        .limit(1000);
      return data ?? [];
    },
  });

  const { data: subs } = useQuery({
    queryKey: ["clients-subs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select(
          "id, client_name, client_whatsapp, plan_name, monthly_price_cents, credits_remaining, next_charge_at, is_active, mp_status",
        )
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Estatísticas por telefone vindas dos agendamentos.
  const statsByPhone = useMemo(() => {
    const m = new Map<string, { visits: number; totalSpent: number; lastVisit: string | null }>();
    for (const a of appts ?? []) {
      const key = normalizePhone(a.client_whatsapp);
      if (!key) continue;
      const cur = m.get(key) ?? {
        visits: 0,
        totalSpent: 0,
        lastVisit: null as string | null,
      };
      cur.visits += 1;
      cur.totalSpent += a.total_cents ?? 0;
      if (!cur.lastVisit || new Date(a.start_at) > new Date(cur.lastVisit)) {
        cur.lastVisit = a.start_at;
      }
      m.set(key, cur);
    }
    return m;
  }, [appts]);

  const clients = useMemo<ClientRow[]>(() => {
    return (clientsRaw ?? [])
      .map((c) => {
        const s = statsByPhone.get(normalizePhone(c.whatsapp));
        return {
          ...c,
          lastVisit: s?.lastVisit ?? null,
          visits: s?.visits ?? 0,
          totalSpent: s?.totalSpent ?? 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [clientsRaw, statsByPhone]);

  const subsByPhone = useMemo(() => {
    const m = new Map<string, typeof subs>();
    for (const s of subs ?? []) {
      const key = normalizePhone(s.client_whatsapp);
      if (!key) continue;
      const arr = m.get(key) ?? [];
      arr.push(s);
      m.set(key, arr);
    }
    return m;
  }, [subs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || normalizePhone(c.whatsapp).includes(normalizePhone(q)),
    );
  }, [clients, search]);

  async function saveClient(form: {
    name: string;
    whatsapp: string;
    email: string;
    birthday: string;
    notes: string;
  }) {
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        whatsapp: normalizePhone(form.whatsapp),
        email: form.email.trim() || null,
        birthday: form.birthday || null,
        notes: form.notes.trim() || null,
      };
      if (!payload.name || !payload.whatsapp) {
        toast.error("Nome e WhatsApp são obrigatórios.");
        return;
      }
      if (editing) {
        const { error } = await supabase.from("clients").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Cliente atualizado.");
      } else {
        const { error } = await supabase.from("clients").insert(payload);
        if (error) throw error;
        toast.success("Cliente cadastrado.");
      }
      await queryClient.invalidateQueries({ queryKey: ["clients-list"] });
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar cliente");
    } finally {
      setSaving(false);
    }
  }

  async function removeClient() {
    if (!removing) return;
    try {
      const { error } = await supabase.from("clients").delete().eq("id", removing.id);
      if (error) throw error;
      toast.success("Cliente removido.");
      await queryClient.invalidateQueries({ queryKey: ["clients-list"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover cliente");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-wider">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro de clientes — com visitas, total gasto e planos assinados consolidados do
            histórico de agendamentos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone"
              className="pl-8"
            />
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Novo cliente
          </Button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Cliente</th>
              <th className="px-4 py-2 text-left">WhatsApp</th>
              <th className="px-4 py-2 text-left">Visitas</th>
              <th className="px-4 py-2 text-left">Total gasto</th>
              <th className="px-4 py-2 text-left">Última visita</th>
              <th className="px-4 py-2 text-left">Plano</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const key = normalizePhone(c.whatsapp);
              const cSubs = subsByPhone.get(key) ?? [];
              const active = cSubs.find((s) => s.is_active);
              const wa = waLink(c.whatsapp);
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.name}</p>
                    {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.whatsapp || "—"}</td>
                  <td className="px-4 py-3">{c.visits}</td>
                  <td className="px-4 py-3">{brl(c.totalSpent)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.lastVisit ? new Date(c.lastVisit).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                        <CreditCard className="h-3 w-3" />
                        {active.plan_name} · {active.credits_remaining} créd.
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {wa && (
                        <a
                          href={`https://wa.me/${wa}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Chamar no WhatsApp"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        title="Editar cliente"
                        onClick={() => {
                          setEditing(c);
                          setFormOpen(true);
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        title="Remover cliente"
                        onClick={() => setRemoving(c)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-lg tracking-wide">
            <CreditCard className="h-4 w-4" /> Assinaturas ativas
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(subs ?? [])
              .filter((s) => s.is_active)
              .map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between border-b border-border pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">{s.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.plan_name} · {brl(s.monthly_price_cents)} /mês · {s.credits_remaining}{" "}
                      créditos
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
                      s.mp_status === "authorized"
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.mp_status ?? "pending"}
                  </span>
                </li>
              ))}
            {(subs ?? []).filter((s) => s.is_active).length === 0 && (
              <li className="text-xs text-muted-foreground">
                Nenhuma assinatura ativa.{" "}
                <Link to="/assinaturas" className="text-primary hover:underline">
                  Criar
                </Link>
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-lg tracking-wide">
            <CalendarDays className="h-4 w-4" /> Resumo
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Stat label="Clientes cadastrados" value={String(clients.length)} />
            <Stat
              label="Assinantes ativos"
              value={String((subs ?? []).filter((s) => s.is_active).length)}
            />
            <Stat
              label="Total gasto (histórico)"
              value={brl(clients.reduce((acc, c) => acc + c.totalSpent, 0))}
            />
            <Stat
              label="Visitas registradas"
              value={String(clients.reduce((acc, c) => acc + c.visits, 0))}
            />
          </div>
        </div>
      </div>

      <ClientFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        initial={editing}
        saving={saving}
        onSave={saveClient}
      />

      <AlertDialog
        open={!!removing}
        onOpenChange={(o) => {
          if (!o) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <span className="font-medium">{removing?.name}</span>?
              Essa ação não apaga os agendamentos nem as assinaturas do cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeClient}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl tracking-wide">{value}</p>
    </div>
  );
}

function ClientFormDialog({
  open,
  onOpenChange,
  initial,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ClientRow | null;
  saving: boolean;
  onSave: (form: {
    name: string;
    whatsapp: string;
    email: string;
    birthday: string;
    notes: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [notes, setNotes] = useState("");
  const [formKey, setFormKey] = useState(0);

  // O form é remontado (key) a cada abertura para carregar os valores
  // do cliente em edição ou limpar para um novo cadastro.
  function handleOpen(o: boolean) {
    if (o) {
      setName(initial?.name ?? "");
      setWhatsapp(initial?.whatsapp ?? "");
      setEmail(initial?.email ?? "");
      setBirthday(initial?.birthday ?? "");
      setNotes(initial?.notes ?? "");
      setFormKey((k) => k + 1);
    }
    onOpenChange(o);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide">
            {initial ? "Editar cliente" : "Novo cliente"}
          </DialogTitle>
        </DialogHeader>
        <form
          key={formKey}
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ name, whatsapp, email, birthday, notes });
          }}
          className="mt-4 space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="client-name">Nome *</Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do cliente"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-whatsapp">WhatsApp *</Label>
            <Input
              id="client-whatsapp"
              type="tel"
              inputMode="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(94) 99999-0000"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-email">E-mail</Label>
            <Input
              id="client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@email.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-birthday">Aniversário</Label>
            <Input
              id="client-birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-notes">Observações</Label>
            <Textarea
              id="client-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferências, alergias, observações..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
