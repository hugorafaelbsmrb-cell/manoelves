import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, MessageCircle, CreditCard, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
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
  name: string;
  whatsapp: string;
  lastVisit: string | null;
  visits: number;
  totalSpent: number;
};

function normalizePhone(raw: string | null | undefined) {
  return (raw ?? "").replace(/\D+/g, "");
}

function Page() {
  const [search, setSearch] = useState("");

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

  const clients = useMemo<ClientRow[]>(() => {
    const map = new Map<string, ClientRow>();
    for (const a of appts ?? []) {
      const key = normalizePhone(a.client_whatsapp);
      if (!key) continue;
      const prev = map.get(key);
      if (prev) {
        prev.visits += 1;
        prev.totalSpent += a.total_cents ?? 0;
      } else {
        map.set(key, {
          name: a.client_name ?? "—",
          whatsapp: a.client_whatsapp ?? "",
          lastVisit: a.start_at,
          visits: 1,
          totalSpent: a.total_cents ?? 0,
        });
      }
    }
    // garantir que assinantes sem agendamento também apareçam
    for (const s of subs ?? []) {
      const key = normalizePhone(s.client_whatsapp);
      if (!key || map.has(key)) continue;
      map.set(key, {
        name: s.client_name,
        whatsapp: s.client_whatsapp,
        lastVisit: null,
        visits: 0,
        totalSpent: 0,
      });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [appts, subs]);

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
        c.name.toLowerCase().includes(q) ||
        normalizePhone(c.whatsapp).includes(normalizePhone(q)),
    );
  }, [clients, search]);

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-wider">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Base de clientes consolidada por WhatsApp — visitas, total gasto e
            planos assinados.
          </p>
        </div>
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone"
            className="pl-8"
          />
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
              return (
                <tr key={key} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.whatsapp || "—"}
                  </td>
                  <td className="px-4 py-3">{c.visits}</td>
                  <td className="px-4 py-3">{brl(c.totalSpent)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.lastVisit
                      ? new Date(c.lastVisit).toLocaleDateString("pt-BR")
                      : "—"}
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
                  <td className="px-4 py-3 text-right">
                    {c.whatsapp && (
                      <a
                        href={`https://wa.me/${normalizePhone(c.whatsapp)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
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
                      {s.plan_name} · {brl(s.monthly_price_cents)} /mês ·{" "}
                      {s.credits_remaining} créditos
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
              value={brl(
                clients.reduce((acc, c) => acc + c.totalSpent, 0),
              )}
            />
            <Stat
              label="Visitas registradas"
              value={String(clients.reduce((acc, c) => acc + c.visits, 0))}
            />
          </div>
        </div>
      </div>
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
