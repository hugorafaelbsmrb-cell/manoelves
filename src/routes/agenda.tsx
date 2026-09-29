import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, Unlock } from "lucide-react";
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

// Grade fixa de atendimento: das 09h às 20h, de hora em hora.
const HOURS = Array.from({ length: 12 }, (_, i) => `${9 + i}:00`);

function AgendaPage() {
  const { user, isOwner } = useAuth();
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);
  const day = startOfDay(addDays(new Date(), offset));
  const dayKey = format(day, "yyyy-MM-dd");

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
      return data ?? [];
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

  const { data: blocked } = useQuery({
    queryKey: ["blocked-slots", dayKey],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("blocked_slots").select("*").eq("slot_date", dayKey);
      return data ?? [];
    },
  });

  async function updateStatus(id: string, status: string) {
    await supabase
      .from("appointments")
      .update({ status: status as never })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["agenda-appts", user?.id, offset] });
  }

  async function toggleBlock(hour: string, slotId?: string) {
    try {
      if (slotId) {
        const { error } = await supabase.from("blocked_slots").delete().eq("id", slotId);
        if (error) throw error;
        toast.success(`${hour} desbloqueado.`);
      } else {
        const { error } = await supabase.from("blocked_slots").insert({
          slot_date: dayKey,
          start_at: hour,
          created_by: user?.id ?? null,
        });
        if (error) throw error;
        toast.success(`${hour} bloqueado.`);
      }
      qc.invalidateQueries({ queryKey: ["blocked-slots", dayKey] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar horário");
    }
  }

  // Agrupa os agendamentos do dia pela hora de início (09:00–20:00).
  const byHour = new Map<string, typeof appointments>();
  for (const a of appointments ?? []) {
    const h = format(new Date(a.start_at), "HH");
    const key = `${h}:00`;
    const arr = byHour.get(key) ?? [];
    arr.push(a);
    byHour.set(key, arr);
  }
  const offHours = (appointments ?? []).filter((a) => {
    const key = `${format(new Date(a.start_at), "HH")}:00`;
    return !HOURS.includes(key);
  });

  const blockedMap = new Map((blocked ?? []).map((b) => [b.start_at, b.id] as const));

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
        <div className="grid grid-cols-[64px_1fr_auto] gap-0 border-b border-border bg-secondary/50 px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground">
          <span>Hora</span>
          <span>Agendamentos</span>
          <span className="text-right">Horário</span>
        </div>
        {HOURS.map((hour) => {
          const hourAppts = byHour.get(hour) ?? [];
          const slotId = blockedMap.get(hour);
          const isBlocked = !!slotId;
          return (
            <div
              key={hour}
              className={`grid grid-cols-[64px_1fr_auto] gap-0 border-b border-border px-4 py-2 text-sm last:border-0 ${
                isBlocked ? "bg-destructive/5" : ""
              }`}
            >
              <span className="self-center font-medium">
                {hour}
                {isBlocked && (
                  <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                    <Lock className="h-3 w-3" /> Bloqueado
                  </span>
                )}
              </span>
              <div className="flex flex-wrap items-center gap-1.5 py-1">
                {hourAppts.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {isBlocked ? "Horário indisponível" : "—"}
                  </span>
                ) : (
                  hourAppts.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs"
                    >
                      <span className="font-medium">
                        {format(new Date(a.start_at), "HH:mm")} · {a.client_name}
                      </span>
                      <span className="text-muted-foreground">{barbers?.[a.barber_id] ?? "—"}</span>
                      <StatusBadge status={a.status} />
                      <select
                        value={a.status}
                        onChange={(e) => updateStatus(a.id, e.target.value)}
                        className="rounded border border-border bg-background px-1 py-0.5 text-[11px]"
                      >
                        <option value="pending_payment">Aguardando Pix</option>
                        <option value="confirmed">Confirmado</option>
                        <option value="completed">Concluído</option>
                        <option value="cancelled">Cancelado</option>
                        <option value="no_show">No-show</option>
                      </select>
                      <span className="text-muted-foreground">{brl(a.total_cents)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="self-center text-right">
                {isOwner ? (
                  <Button
                    size="sm"
                    variant={isBlocked ? "destructive" : "outline"}
                    onClick={() => toggleBlock(hour, slotId)}
                  >
                    {isBlocked ? (
                      <>
                        <Unlock className="mr-1 h-3.5 w-3.5" /> Desbloquear
                      </>
                    ) : (
                      <>
                        <Lock className="mr-1 h-3.5 w-3.5" /> Bloquear
                      </>
                    )}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {isBlocked ? "Bloqueado" : ""}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {offHours.length > 0 && (
          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              Fora da grade (antes das 09h ou depois das 20h):
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {offHours.map((a) => (
                <span
                  key={a.id}
                  className="rounded-md border border-border bg-background px-2 py-1"
                >
                  {format(new Date(a.start_at), "HH:mm")} · {a.client_name} ·{" "}
                  {barbers?.[a.barber_id] ?? "—"} <StatusBadge status={a.status} />
                </span>
              ))}
            </div>
          </div>
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
