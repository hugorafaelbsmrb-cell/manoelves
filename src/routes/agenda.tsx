import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { brl } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ManualBookingWizard } from "@/components/manual-booking-wizard";

export const Route = createFileRoute("/agenda")({
  ssr: false,
  head: () => ({ meta: [{ title: "Agenda — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <AgendaPage />
    </AppShell>
  ),
});

type ApptRow = {
  id: string;
  client_name: string;
  client_whatsapp: string;
  start_at: string;
  end_at: string;
  status: string;
  total_cents: number;
  barber_id: string;
};

function AgendaPage() {
  const { user, isOwner } = useAuth();
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);
  const day = startOfDay(addDays(new Date(), offset));

  const { data: appointments } = useQuery({
    queryKey: ["agenda-appts", user?.id, offset],
    enabled: !!user,
    queryFn: async () => {
      const start = day.toISOString();
      const end = addDays(day, 1).toISOString();
      const { data } = await supabase
        .from("appointments")
        .select(
          "id, client_name, client_whatsapp, start_at, end_at, status, total_cents, barber_id",
        )
        .gte("start_at", start)
        .lt("start_at", end)
        .order("start_at");
      return (data ?? []) as ApptRow[];
    },
  });

  const { data: barbers } = useQuery({
    queryKey: ["barbers-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      const map: Record<string, string> = {};
      (data ?? []).forEach((p) => (map[p.id] = p.full_name));
      return map;
    },
  });

  async function updateStatus(id: string, status: string) {
    await supabase
      .from("appointments")
      .update({ status: status as never })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["agenda-appts", user?.id, offset] });
  }

  const list = appointments ?? [];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-wider">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? "Você vê todos os agendamentos da barbearia."
              : "Você vê apenas seus próprios agendamentos."}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <ManualBookingWizard />
          <div className="flex flex-1 items-center gap-2 sm:flex-none">
            <Button variant="outline" size="sm" onClick={() => setOffset((o) => o - 1)}>
              ←
            </Button>
            <div className="min-w-[140px] flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-center text-sm font-medium sm:min-w-[180px]">
              {format(day, "EEEE, dd/MM", { locale: ptBR })}
            </div>
            <Button variant="outline" size="sm" onClick={() => setOffset((o) => o + 1)}>
              →
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>
              Hoje
            </Button>
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="mt-6 rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Nenhum agendamento neste dia.
        </div>
      ) : (
        <>
          {/* Cards — celular */}
          <div className="mt-6 space-y-3 md:hidden">
            {list.map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-lg tracking-wide">
                    {format(new Date(a.start_at), "HH:mm")} — {format(new Date(a.end_at), "HH:mm")}
                  </p>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-2 font-medium">{a.client_name}</p>
                <p className="text-xs text-muted-foreground">
                  {a.client_whatsapp} · {barbers?.[a.barber_id] ?? "—"}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                  <span className="font-medium">{brl(a.total_cents)}</span>
                  <StatusSelect value={a.status} onChange={(v) => updateStatus(a.id, v)} />
                </div>
              </div>
            ))}
          </div>

          {/* Tabela — desktop */}
          <div className="mt-6 hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Barbeiro</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {format(new Date(a.start_at), "HH:mm")} —{" "}
                      {format(new Date(a.end_at), "HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{a.client_name}</p>
                      <p className="text-xs text-muted-foreground">{a.client_whatsapp}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {barbers?.[a.barber_id] ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{brl(a.total_cents)}</td>
                    <td className="px-4 py-3 text-right">
                      <StatusSelect value={a.status} onChange={(v) => updateStatus(a.id, v)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
    >
      <option value="pending_payment">Aguardando Pix</option>
      <option value="confirmed">Confirmado</option>
      <option value="completed">Concluído</option>
      <option value="cancelled">Cancelado</option>
      <option value="no_show">No-show</option>
    </select>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending_payment: { label: "Aguardando Pix", cls: "bg-accent text-accent-foreground" },
    confirmed: { label: "Confirmado", cls: "bg-success/15 text-success" },
    completed: { label: "Concluído", cls: "bg-secondary text-secondary-foreground" },
    cancelled: { label: "Cancelado", cls: "bg-destructive/10 text-destructive" },
    no_show: { label: "No-show", cls: "bg-destructive/10 text-destructive" },
  };
  const s = map[status] ?? { label: status, cls: "bg-secondary" };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
