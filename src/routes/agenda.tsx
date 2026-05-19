import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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

function AgendaPage() {
  const { user, isOwner } = useAuth();
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
          "id, client_name, client_whatsapp, start_at, end_at, status, total_cents, barber_id"
        )
        .gte("start_at", start)
        .lt("start_at", end)
        .order("start_at");
      return data ?? [];
    },
  });

  const { data: barbers } = useQuery({
    queryKey: ["barbers-map"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name");
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
  }

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
        <div className="flex items-center gap-2">
          <ManualBookingWizard />
          <Button variant="outline" size="sm" onClick={() => setOffset((o) => o - 1)}>
            ←
          </Button>
          <div className="min-w-[180px] rounded-md border border-border bg-card px-3 py-1.5 text-center text-sm font-medium">
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

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        {!appointments || appointments.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum agendamento neste dia.
          </div>
        ) : (
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
              {appointments.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {format(new Date(a.start_at), "HH:mm")} —{" "}
                    {format(new Date(a.end_at), "HH:mm")}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.client_whatsapp}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {barbers?.[a.barber_id] ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {brl(a.total_cents)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={a.status}
                      onChange={(e) => updateStatus(a.id, e.target.value)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    >
                      <option value="pending_payment">Aguardando Pix</option>
                      <option value="confirmed">Confirmado</option>
                      <option value="completed">Concluído</option>
                      <option value="cancelled">Cancelado</option>
                      <option value="no_show">No-show</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
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
