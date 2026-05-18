import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { startOfMonth, format, subDays } from "date-fns";
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

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dashboard — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <DashboardPage />
    </AppShell>
  ),
});

function DashboardPage() {
  const { isOwner } = useAuth();

  const { data } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: async () => {
      const monthStart = startOfMonth(new Date()).toISOString();
      const since = subDays(new Date(), 14).toISOString();

      const [{ data: payments }, { data: appts }, { data: profiles }] =
        await Promise.all([
          supabase
            .from("payments")
            .select("total_cents, owner_amount_cents, barber_amount_cents, barber_id, paid_at")
            .gte("paid_at", monthStart),
          supabase
            .from("appointments")
            .select("start_at, status, total_cents")
            .gte("start_at", since),
          supabase.from("profiles").select("id, full_name"),
        ]);

      const revenue = (payments ?? []).reduce((s, p) => s + p.total_cents, 0);
      const ownerCut = (payments ?? []).reduce((s, p) => s + p.owner_amount_cents, 0);
      const barberCut = (payments ?? []).reduce((s, p) => s + p.barber_amount_cents, 0);
      const orders = (payments ?? []).length;
      const ticket = orders ? Math.round(revenue / orders) : 0;

      // série diária
      const byDay: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "dd/MM");
        byDay[d] = 0;
      }
      (appts ?? []).forEach((a) => {
        if (a.status === "cancelled" || a.status === "no_show") return;
        const d = format(new Date(a.start_at), "dd/MM");
        if (d in byDay) byDay[d] += a.total_cents;
      });
      const series = Object.entries(byDay).map(([day, cents]) => ({ day, cents }));

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

      return { revenue, ownerCut, barberCut, ticket, orders, series, ranking };
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
      <h1 className="font-display text-3xl tracking-wider">Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Visão {format(new Date(), "MMMM/yyyy", { locale: ptBR })} • dados em tempo real.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Faturamento (mês)" value={brl(data?.revenue ?? 0)} />
        <Kpi label="Comandas fechadas" value={String(data?.orders ?? 0)} />
        <Kpi label="Ticket médio" value={brl(data?.ticket ?? 0)} />
        <Kpi label="Sua margem (dono)" value={brl(data?.ownerCut ?? 0)} />
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-xl tracking-wide">Últimos 14 dias</h2>
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
        <h2 className="font-display text-xl tracking-wide">Ranking de barbeiros (mês)</h2>
        {!data?.ranking || data.ranking.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Sem pagamentos registrados ainda.
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
