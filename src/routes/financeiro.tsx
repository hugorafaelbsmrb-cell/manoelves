import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { brl } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/financeiro")({
  ssr: false,
  head: () => ({ meta: [{ title: "Financeiro — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <FinanceiroPage />
    </AppShell>
  ),
});

type Preset = "today" | "7d" | "30d" | "month" | "custom";

const PRESET_LABELS: Record<Preset, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  month: "Mês atual",
  custom: "Período",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  debit: "Débito",
  credit: "Crédito",
  card: "Cartão",
  transfer: "Transferência",
  other: "Outro",
};

function rangeFor(preset: Preset, from?: string, to?: string) {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now), label: "Hoje" };
    case "7d":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now), label: "Últimos 7 dias" };
    case "30d":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now), label: "Últimos 30 dias" };
    case "month":
      return {
        from: startOfMonth(now),
        to: endOfDay(now),
        label: format(now, "MMMM/yyyy", { locale: ptBR }),
      };
    case "custom": {
      const f = from ? startOfDay(new Date(from)) : startOfDay(subDays(now, 6));
      const t = to ? endOfDay(new Date(to)) : endOfDay(now);
      return { from: f, to: t, label: `${format(f, "dd/MM")} – ${format(t, "dd/MM")}` };
    }
  }
}

function FinanceiroPage() {
  const { isOwner } = useAuth();
  const [preset, setPreset] = useState<Preset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [barberFilter, setBarberFilter] = useState<string>("all");

  const range = useMemo(
    () => rangeFor(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const { data: today } = useQuery({
    queryKey: ["fin-kpis-today"],
    queryFn: async () => {
      const now = new Date();
      const [{ data: pays }, { data: monthPays }] = await Promise.all([
        supabase
          .from("payments")
          .select("total_cents")
          .gte("paid_at", startOfDay(now).toISOString())
          .lte("paid_at", endOfDay(now).toISOString()),
        supabase
          .from("payments")
          .select("total_cents")
          .gte("paid_at", startOfMonth(now).toISOString())
          .lte("paid_at", endOfMonth(now).toISOString()),
      ]);
      return {
        today: (pays ?? []).reduce((s, p) => s + p.total_cents, 0),
        todayCount: (pays ?? []).length,
        month: (monthPays ?? []).reduce((s, p) => s + p.total_cents, 0),
        monthCount: (monthPays ?? []).length,
      };
    },
  });

  const { data: barbers } = useQuery({
    queryKey: ["fin-barbers"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
      return data ?? [];
    },
  });

  const { data: sales, isLoading } = useQuery({
    queryKey: ["fin-sales", preset, customFrom, customTo, methodFilter, barberFilter],
    queryFn: async () => {
      const fromISO = range.from.toISOString();
      const toISO = range.to.toISOString();
      let q = supabase
        .from("payments")
        .select(
          "id, paid_at, method, total_cents, owner_amount_cents, barber_amount_cents, barber_id, order_id, orders(client_name, invoice_number, payment_status)",
        )
        .gte("paid_at", fromISO)
        .lte("paid_at", toISO)
        .order("paid_at", { ascending: false });
      if (methodFilter !== "all") q = q.eq("method", methodFilter);
      if (barberFilter !== "all") q = q.eq("barber_id", barberFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const totals = useMemo(() => {
    const list = sales ?? [];
    return {
      revenue: list.reduce((s, p) => s + p.total_cents, 0),
      owner: list.reduce((s, p) => s + p.owner_amount_cents, 0),
      barber: list.reduce((s, p) => s + p.barber_amount_cents, 0),
      count: list.length,
    };
  }, [sales]);

  const byMethod = useMemo(() => {
    const map: Record<string, { cents: number; count: number }> = {};
    (sales ?? []).forEach((p) => {
      const k = p.method ?? "other";
      if (!map[k]) map[k] = { cents: 0, count: 0 };
      map[k].cents += p.total_cents;
      map[k].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].cents - a[1].cents);
  }, [sales]);

  function exportCSV() {
    const rows = [
      ["Data", "Cliente", "Barbeiro", "Método", "Total", "Dono", "Barbeiro_cut", "Comanda"],
      ...(sales ?? []).map((p) => {
        const barberName = barbers?.find((b) => b.id === p.barber_id)?.full_name ?? "—";
        const client = (p.orders as { client_name?: string } | null)?.client_name ?? "—";
        const inv = (p.orders as { invoice_number?: string } | null)?.invoice_number ?? "";
        return [
          format(new Date(p.paid_at), "dd/MM/yyyy HH:mm"),
          client,
          barberName,
          METHOD_LABELS[p.method] ?? p.method,
          (p.total_cents / 100).toFixed(2).replace(".", ","),
          (p.owner_amount_cents / 100).toFixed(2).replace(".", ","),
          (p.barber_amount_cents / 100).toFixed(2).replace(".", ","),
          inv,
        ];
      }),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendas-${format(range.from, "yyyy-MM-dd")}_${format(range.to, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!isOwner) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta seção é exclusiva do dono. Barbeiros podem ver suas vendas em{" "}
        <strong>Meu financeiro</strong>.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-wider">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Vendas e faturamento.{" "}
            <span className="font-medium text-foreground">{range.label}</span>
          </p>
        </div>
      </div>

      {/* KPIs fixos: hoje e mês */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Faturamento de hoje"
          value={brl(today?.today ?? 0)}
          sub={`${today?.todayCount ?? 0} venda(s)`}
        />
        <Kpi
          label="Faturamento do mês"
          value={brl(today?.month ?? 0)}
          sub={`${today?.monthCount ?? 0} venda(s)`}
        />
        <Kpi
          label={`Receita no período`}
          value={brl(totals.revenue)}
          sub={`${totals.count} venda(s)`}
        />
        <Kpi label="Margem dono (período)" value={brl(totals.owner)} sub={`Barbeiros: ${brl(totals.barber)}`} />
      </div>

      {/* Filtros */}
      <section className="mt-6 rounded-xl border border-border bg-card p-4">
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

          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Método</Label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            >
              <option value="all">Todos</option>
              {Object.entries(METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Barbeiro</Label>
            <select
              value={barberFilter}
              onChange={(e) => setBarberFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            >
              <option value="all">Todos</option>
              {(barbers ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.full_name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={exportCSV}
            className="ml-auto h-8 rounded-md border border-border px-3 text-xs hover:bg-secondary"
          >
            Exportar CSV
          </button>
        </div>

        {byMethod.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {byMethod.map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1"
              >
                <span className="text-muted-foreground">{METHOD_LABELS[k] ?? k}</span>
                <span className="font-medium">{brl(v.cents)}</span>
                <span className="text-muted-foreground">· {v.count}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Tabela */}
      <section className="mt-6 rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="font-display text-lg tracking-wide">Vendas do período</h2>
        </div>
        {isLoading ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Carregando...</p>
        ) : !sales || sales.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            Nenhuma venda registrada no período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-left">Cliente</th>
                  <th className="px-4 py-2 text-left">Barbeiro</th>
                  <th className="px-4 py-2 text-left">Método</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-right">Dono</th>
                  <th className="px-4 py-2 text-right">Barbeiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sales.map((p) => {
                  const barberName =
                    barbers?.find((b) => b.id === p.barber_id)?.full_name ?? "—";
                  const order = p.orders as
                    | { client_name?: string; invoice_number?: string }
                    | null;
                  return (
                    <tr key={p.id} className="hover:bg-secondary/30">
                      <td className="whitespace-nowrap px-4 py-2 text-xs">
                        {format(new Date(p.paid_at), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="px-4 py-2">
                        {order?.client_name ?? "—"}
                        {order?.invoice_number && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            #{order.invoice_number}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">{barberName}</td>
                      <td className="px-4 py-2 text-xs">
                        {METHOD_LABELS[p.method] ?? p.method}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {brl(p.total_cents)}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                        {brl(p.owner_amount_cents)}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                        {brl(p.barber_amount_cents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-secondary/30 text-sm font-medium">
                  <td className="px-4 py-2" colSpan={4}>
                    Total ({totals.count})
                  </td>
                  <td className="px-4 py-2 text-right">{brl(totals.revenue)}</td>
                  <td className="px-4 py-2 text-right">{brl(totals.owner)}</td>
                  <td className="px-4 py-2 text-right">{brl(totals.barber)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl tracking-wide">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
