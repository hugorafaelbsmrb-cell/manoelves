import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { startOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { brl } from "@/lib/format";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/meu-financeiro")({
  ssr: false,
  head: () => ({ meta: [{ title: "Meu financeiro — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <MeuFinanceiroPage />
    </AppShell>
  ),
});

function MeuFinanceiroPage() {
  const { user, isBarber } = useAuth();

  const { data } = useQuery({
    queryKey: ["my-financials", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const monthStart = startOfMonth(new Date()).toISOString();
      const { data: payments } = await supabase
        .from("payments")
        .select("total_cents, barber_amount_cents, paid_at, order_id")
        .eq("barber_id", user!.id)
        .gte("paid_at", monthStart)
        .order("paid_at", { ascending: false });
      const total = (payments ?? []).reduce((s, p) => s + p.barber_amount_cents, 0);
      const gross = (payments ?? []).reduce((s, p) => s + p.total_cents, 0);
      return { payments: payments ?? [], total, gross };
    },
  });

  if (!isBarber) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta tela é exclusiva dos barbeiros.
      </p>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl tracking-wider">Meu financeiro</h1>
      <p className="text-sm text-muted-foreground">
        Apenas você enxerga estes números — {format(new Date(), "MMMM/yyyy", { locale: ptBR })}.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Kpi label="Sua comissão (mês)" value={brl(data?.total ?? 0)} highlight />
        <Kpi label="Atendimentos pagos" value={String(data?.payments.length ?? 0)} />
        <Kpi label="Faturamento gerado" value={brl(data?.gross ?? 0)} />
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-xl tracking-wide">Últimos pagamentos</h2>
        {!data?.payments || data.payments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Ainda sem pagamentos.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2">Quando</th>
                <th className="py-2 text-right">Bruto</th>
                <th className="py-2 text-right">Sua comissão</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((p, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-2">
                    {format(new Date(p.paid_at), "dd/MM HH:mm")}
                  </td>
                  <td className="py-2 text-right">{brl(p.total_cents)}</td>
                  <td className="py-2 text-right font-medium">
                    {brl(p.barber_amount_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function Kpi({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlight ? "border-foreground bg-foreground text-background" : "border-border bg-card"
      }`}
    >
      <p
        className={`text-xs uppercase tracking-wider ${
          highlight ? "text-background/70" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>
      <p className="mt-2 font-display text-3xl tracking-wide">{value}</p>
    </div>
  );
}
