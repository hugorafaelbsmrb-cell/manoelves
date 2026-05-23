import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { brl } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dashboard — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <DashboardPage />
    </AppShell>
  ),
});

type Preset = "7d" | "14d" | "30d" | "month" | "prev_month" | "3m" | "custom";

const PRESET_LABELS: Record<Preset, string> = {
  "7d": "7 dias",
  "14d": "14 dias",
  "30d": "30 dias",
  month: "Mês atual",
  prev_month: "Mês anterior",
  "3m": "3 meses",
  custom: "Personalizado",
};

function rangeFor(preset: Preset, customFrom?: string, customTo?: string) {
  const now = new Date();
  switch (preset) {
    case "7d":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now), label: "Últimos 7 dias" };
    case "14d":
      return { from: startOfDay(subDays(now, 13)), to: endOfDay(now), label: "Últimos 14 dias" };
    case "30d":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now), label: "Últimos 30 dias" };
    case "month":
      return { from: startOfMonth(now), to: endOfDay(now), label: format(now, "MMMM/yyyy", { locale: ptBR }) };
    case "prev_month": {
      const prev = subMonths(now, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev), label: format(prev, "MMMM/yyyy", { locale: ptBR }) };
    }
    case "3m":
      return { from: startOfDay(subDays(now, 89)), to: endOfDay(now), label: "Últimos 3 meses" };
    case "custom": {
      const from = customFrom ? startOfDay(new Date(customFrom)) : startOfDay(subDays(now, 6));
      const to = customTo ? endOfDay(new Date(customTo)) : endOfDay(now);
      return {
        from,
        to,
        label: `${format(from, "dd/MM")} – ${format(to, "dd/MM")}`,
      };
    }
  }
}

function loadStoredPreset(): { preset: Preset; from?: string; to?: string } {
  if (typeof window === "undefined") return { preset: "30d" };
  try {
    const raw = localStorage.getItem("dash_period");
    if (!raw) return { preset: "30d" };
    return JSON.parse(raw);
  } catch {
    return { preset: "30d" };
  }
}

function DashboardPage() {
  const { isOwner } = useAuth();
  const stored = loadStoredPreset();
  const [preset, setPreset] = useState<Preset>(stored.preset);
  const [customFrom, setCustomFrom] = useState<string>(stored.from ?? "");
  const [customTo, setCustomTo] = useState<string>(stored.to ?? "");

  useEffect(() => {
    localStorage.setItem(
      "dash_period",
      JSON.stringify({ preset, from: customFrom, to: customTo }),
    );
  }, [preset, customFrom, customTo]);

  const range = useMemo(
    () => rangeFor(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const { data } = useQuery({
    queryKey: ["dashboard-data", preset, customFrom, customTo],
    queryFn: async () => {
      const fromISO = range.from.toISOString();
      const toISO = range.to.toISOString();

      const [{ data: payments }, { data: appts }, { data: profiles }] =
        await Promise.all([
          supabase
            .from("payments")
            .select("total_cents, owner_amount_cents, barber_amount_cents, barber_id, paid_at")
            .gte("paid_at", fromISO)
            .lte("paid_at", toISO),
          supabase
            .from("appointments")
            .select("id, start_at, status, total_cents")
            .gte("start_at", fromISO)
            .lte("start_at", toISO),
          supabase.from("profiles").select("id, full_name"),
        ]);

      const revenue = (payments ?? []).reduce((s, p) => s + p.total_cents, 0);
      const ownerCut = (payments ?? []).reduce((s, p) => s + p.owner_amount_cents, 0);
      const barberCut = (payments ?? []).reduce((s, p) => s + p.barber_amount_cents, 0);
      const orders = (payments ?? []).length;
      const ticket = orders ? Math.round(revenue / orders) : 0;

      // Granularidade: ≤31 dias = diário; senão semanal
      const totalDays = differenceInCalendarDays(range.to, range.from) + 1;
      const weekly = totalDays > 31;

      const buckets: Record<string, number> = {};
      if (weekly) {
        const numBuckets = Math.ceil(totalDays / 7);
        for (let i = 0; i < numBuckets; i++) {
          const start = subDays(range.to, totalDays - 1 - i * 7);
          buckets[format(start, "dd/MM")] = 0;
        }
      } else {
        for (let i = 0; i < totalDays; i++) {
          const d = subDays(range.to, totalDays - 1 - i);
          buckets[format(d, "dd/MM")] = 0;
        }
      }

      (appts ?? []).forEach((a) => {
        if (a.status === "cancelled" || a.status === "no_show") return;
        const d = new Date(a.start_at);
        let key: string;
        if (weekly) {
          const daysFromStart = differenceInCalendarDays(d, range.from);
          const bucketIdx = Math.floor(daysFromStart / 7);
          const start = subDays(range.to, totalDays - 1 - bucketIdx * 7);
          key = format(start, "dd/MM");
        } else {
          key = format(d, "dd/MM");
        }
        if (key in buckets) buckets[key] += a.total_cents;
      });
      const series = Object.entries(buckets).map(([day, cents]) => ({ day, cents }));

      // ranking por barbeiro
      const map: Record<string, number> = {};
      (payments ?? []).forEach((p) => {
        map[p.barber_id] = (map[p.barber_id] ?? 0) + p.total_cents;
      });
      const ranking = Object.entries(map)
        .map(([id, cents]) => ({
          name: profiles?.find((pr) => pr.id === id)?.full_name ?? "—",
          cents,
        }))
        .sort((a, b) => b.cents - a.cents);

      // Ranking de serviços (a partir dos appointment_items dos agendamentos do período)
      const validAppts = (appts ?? []).filter(
        (a) => a.status !== "cancelled" && a.status !== "no_show",
      );
      const apptIds = validAppts.map((a) => a.id);
      let servicesRanking: Array<{ name: string; qty: number; cents: number }> = [];
      if (apptIds.length) {
        const { data: items } = await supabase
          .from("appointment_items")
          .select("service_id, price_cents, services(name)")
          .in("appointment_id", apptIds);
        const svcMap: Record<string, { name: string; qty: number; cents: number }> = {};
        (items ?? []).forEach((it) => {
          const name = (it.services as { name?: string } | null)?.name ?? "—";
          const key = it.service_id;
          if (!svcMap[key]) svcMap[key] = { name, qty: 0, cents: 0 };
          svcMap[key].qty += 1;
          svcMap[key].cents += it.price_cents ?? 0;
        });
        servicesRanking = Object.values(svcMap).sort((a, b) => b.qty - a.qty);
      }

      // Ranking de produtos (order_items, kind=product, vinculados a orders fechadas no período)
      const { data: closedOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("status", "closed")
        .gte("closed_at", fromISO)
        .lte("closed_at", toISO);
      const orderIds = (closedOrders ?? []).map((o) => o.id);
      let productsRanking: Array<{ name: string; qty: number; cents: number }> = [];
      if (orderIds.length) {
        const { data: oItems } = await supabase
          .from("order_items")
          .select("description, qty, total_cents, kind")
          .in("order_id", orderIds)
          .eq("kind", "product");
        const pMap: Record<string, { name: string; qty: number; cents: number }> = {};
        (oItems ?? []).forEach((it) => {
          const key = it.description;
          if (!pMap[key]) pMap[key] = { name: it.description, qty: 0, cents: 0 };
          pMap[key].qty += it.qty ?? 1;
          pMap[key].cents += it.total_cents ?? 0;
        });
        productsRanking = Object.values(pMap).sort((a, b) => b.qty - a.qty);
      }

      return {
        revenue,
        ownerCut,
        barberCut,
        ticket,
        orders,
        series,
        ranking,
        servicesRanking,
        productsRanking,
        weekly,
      };
    },
  });

  if (!isOwner) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta tela é exclusiva do dono. Acesse <strong>Meu financeiro</strong>.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-wider">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Período: <span className="font-medium text-foreground">{range.label}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1">
            {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`rounded-md border px-3 py-1.5 text-xs transition ${
                  preset === p
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {PRESET_LABELS[p]}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="flex items-end gap-2">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">De</Label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 w-36 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Até</Label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 w-36 text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Faturamento" value={brl(data?.revenue ?? 0)} />
        <Kpi label="Comandas fechadas" value={String(data?.orders ?? 0)} />
        <Kpi label="Ticket médio" value={brl(data?.ticket ?? 0)} />
        <Kpi label="Margem (dono)" value={brl(data?.ownerCut ?? 0)} />
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-xl tracking-wide">
          {data?.weekly ? "Faturamento semanal" : "Faturamento diário"}
        </h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.series ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickFormatter={(v) => brl(Number(v))}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
                formatter={(v: number) => brl(v)}
              />
              <Bar dataKey="cents" fill="var(--foreground)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-xl tracking-wide">Ranking de barbeiros</h2>
        {!data?.ranking || data.ranking.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Sem pagamentos registrados no período.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {data.ranking.map((r, i) => (
              <li key={r.name} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2">
                  <span className="font-display text-lg w-6 text-center">{i + 1}</span>
                  {r.name}
                </span>
                <span className="font-medium">{brl(r.cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl tracking-wide">{value}</p>
    </div>
  );
}
