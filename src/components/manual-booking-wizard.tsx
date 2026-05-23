import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { addDays, addMinutes, format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, ChevronLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { brl, minutesLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClientCombobox, type ClientPick } from "@/components/client-combobox";
import { upsertClient } from "@/lib/clients";
import { sendBookingConfirmation } from "@/lib/uazapi.functions";

type Step = "barber" | "service" | "datetime" | "client";

interface SelectedService {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
}

export function ManualBookingWizard() {
  const { isOwner, user } = useAuth();
  const qc = useQueryClient();
  const sendConfirmationFn = useServerFn(sendBookingConfirmation);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(isOwner ? "barber" : "service");
  const [barberId, setBarberId] = useState<string | null>(isOwner ? null : user?.id ?? null);
  const [selected, setSelected] = useState<SelectedService[]>([]);
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [slot, setSlot] = useState<Date | null>(null);
  const [client, setClient] = useState<ClientPick>({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const totalMinutes = useMemo(
    () => selected.reduce((s, x) => s + x.duration_minutes, 0),
    [selected],
  );
  const totalCents = useMemo(
    () => selected.reduce((s, x) => s + x.price_cents, 0),
    [selected],
  );

  function reset() {
    setStep(isOwner ? "barber" : "service");
    setBarberId(isOwner ? null : user?.id ?? null);
    setSelected([]);
    setDate(startOfDay(new Date()));
    setSlot(null);
    setClient({ name: "", phone: "" });
  }

  useEffect(() => {
    if (!open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const { data: barbers } = useQuery({
    queryKey: ["wizard-barbers"],
    enabled: open && isOwner,
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "barber");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids)
        .eq("is_active", true);
      return data ?? [];
    },
  });

  const { data: services } = useQuery({
    queryKey: ["wizard-services"],
    enabled: open && step === "service",
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, duration_minutes, price_cents")
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
  });

  const { data: workingHours } = useQuery({
    queryKey: ["wizard-wh", barberId],
    enabled: !!barberId && step === "datetime",
    queryFn: async () => {
      const { data } = await supabase
        .from("working_hours")
        .select("weekday, start_time, end_time")
        .eq("barber_id", barberId!);
      return data ?? [];
    },
  });

  const { data: buffer } = useQuery({
    queryKey: ["wizard-buffer", barberId],
    enabled: !!barberId && step === "datetime",
    queryFn: async () => {
      const { data } = await supabase
        .from("buffer_settings")
        .select("buffer_minutes")
        .eq("barber_id", barberId!)
        .maybeSingle();
      return data?.buffer_minutes ?? 10;
    },
  });

  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  const { data: dayAppts } = useQuery({
    queryKey: ["wizard-appts", barberId, dayStart.toISOString()],
    enabled: !!barberId && step === "datetime",
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("start_at, end_at")
        .eq("barber_id", barberId!)
        .gte("start_at", dayStart.toISOString())
        .lt("start_at", dayEnd.toISOString())
        .in("status", ["pending_payment", "confirmed"]);
      return data ?? [];
    },
  });

  const [daysCount, setDaysCount] = useState(7);
  const days = useMemo(
    () => Array.from({ length: daysCount }, (_, i) => addDays(startOfDay(new Date()), i)),
    [daysCount],
  );

  const slots = useMemo(() => {
    if (totalMinutes === 0 || !workingHours) return [] as Date[];
    const weekday = date.getDay();
    const windows = workingHours.filter((w) => w.weekday === weekday);
    if (windows.length === 0) return [];
    const stepMin = 15;
    const totalMin = totalMinutes + (buffer ?? 10);
    const now = new Date();
    const out: Date[] = [];
    for (const w of windows) {
      const [sh, sm] = w.start_time.split(":").map(Number);
      const [eh, em] = w.end_time.split(":").map(Number);
      const start = new Date(date);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(date);
      end.setHours(eh, em, 0, 0);
      for (let t = start; addMinutes(t, totalMin) <= end; t = addMinutes(t, stepMin)) {
        // oculta horários que já passaram
        if (t <= now) continue;
        const slotEnd = addMinutes(t, totalMin);
        const conflict = (dayAppts ?? []).some((a) => {
          const aS = new Date(a.start_at);
          const aE = new Date(a.end_at);
          return t < aE && slotEnd > aS;
        });
        if (!conflict) out.push(new Date(t));
      }
    }
    return out;
  }, [totalMinutes, workingHours, date, buffer, dayAppts]);

  useEffect(() => {
    setSlot(null);
  }, [date]);

  function toggleService(s: SelectedService) {
    setSelected((prev) =>
      prev.find((x) => x.id === s.id)
        ? prev.filter((x) => x.id !== s.id)
        : [...prev, s],
    );
  }

  async function submit() {
    if (!barberId || selected.length === 0 || !slot || !client.name || !client.phone) return;
    setSubmitting(true);
    try {
      const start = slot;
      const end = addMinutes(start, totalMinutes);
      const clientId = await upsertClient({
        name: client.name,
        whatsapp: client.phone,
      });
      const { data: appt, error } = await supabase
        .from("appointments")
        .insert({
          barber_id: barberId,
          client_name: client.name,
          client_whatsapp: client.phone,
          client_id: clientId,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          status: "confirmed",
          total_cents: totalCents,
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("appointment_items").insert(
        selected.map((s) => ({
          appointment_id: appt.id,
          service_id: s.id,
          price_cents: s.price_cents,
          duration_minutes: s.duration_minutes,
        })),
      );
      // Notifica o cliente no WhatsApp
      try {
        await sendConfirmationFn({ data: { appointmentId: appt.id } });
      } catch (e) {
        console.warn("Falha ao enviar WhatsApp:", e);
      }
      toast.success("Agendamento criado e cliente notificado!");
      qc.invalidateQueries({ queryKey: ["agenda-appts"] });
      qc.invalidateQueries({ queryKey: ["known-clients"] });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar agendamento");
    } finally {
      setSubmitting(false);
    }
  }

  const stepIndex = isOwner
    ? { barber: 1, service: 2, datetime: 3, client: 4 }[step]
    : { service: 1, datetime: 2, client: 3 }[step as Exclude<Step, "barber">];
  const stepTotal = isOwner ? 4 : 3;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> Novo agendamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider">
            Novo agendamento manual
          </DialogTitle>
          <DialogDescription>
            Passo {stepIndex} de {stepTotal}
          </DialogDescription>
        </DialogHeader>

        {step === "barber" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Selecione o barbeiro</p>
            <div className="grid gap-2">
              {(barbers ?? []).map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setBarberId(b.id);
                    setStep("service");
                  }}
                  className="rounded-md border border-border px-3 py-2 text-left text-sm hover:border-foreground"
                >
                  {b.full_name}
                </button>
              ))}
              {barbers && barbers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum barbeiro cadastrado.
                </p>
              )}
            </div>
          </div>
        )}

        {step === "service" && (
          <div className="space-y-3">
            <StepBack onBack={() => isOwner && setStep("barber")} show={isOwner} />
            <p className="text-sm text-muted-foreground">
              Selecione um ou mais serviços
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(services ?? []).map((s) => {
                const active = selected.some((x) => x.id === s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleService(s)}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                      active
                        ? "border-foreground bg-secondary"
                        : "border-border hover:border-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border"
                        }`}
                      >
                        {active && <Check className="h-3 w-3" />}
                      </span>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {minutesLabel(s.duration_minutes)}
                        </p>
                      </div>
                    </div>
                    <span className="font-display">{brl(s.price_cents)}</span>
                  </button>
                );
              })}
            </div>
            {selected.length > 0 && (
              <div className="flex items-center justify-between rounded-md border border-border bg-card p-3 text-sm">
                <span>
                  {selected.length} serviço(s) · {minutesLabel(totalMinutes)}
                </span>
                <span className="font-display">{brl(totalCents)}</span>
              </div>
            )}
            <Button
              className="w-full"
              disabled={selected.length === 0}
              onClick={() => setStep("datetime")}
            >
              Continuar
            </Button>
          </div>
        )}

        {step === "datetime" && selected.length > 0 && (
          <div className="space-y-3">
            <StepBack onBack={() => setStep("service")} show />
            <div className="rounded-md border border-border bg-card p-2 text-xs">
              <span className="text-muted-foreground">Serviços:</span>{" "}
              <span className="font-medium">
                {selected.map((s) => s.name).join(" + ")}
              </span>{" "}
              · {minutesLabel(totalMinutes)} · {brl(totalCents)}
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Dia
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {days.map((d) => {
                  const active = isSameDay(d, date);
                  return (
                    <button
                      key={d.toISOString()}
                      onClick={() => setDate(d)}
                      className={`flex min-w-[56px] flex-col items-center rounded-md border px-2 py-1.5 text-[10px] ${
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="uppercase">{format(d, "EEE", { locale: ptBR })}</span>
                      <span className="font-display text-base">{format(d, "dd")}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setDaysCount((n) => n + 7)}
                  className="flex min-w-[56px] flex-col items-center justify-center rounded-md border border-dashed border-border px-2 py-1.5 text-[10px] text-muted-foreground hover:border-foreground hover:text-foreground"
                  aria-label="Carregar mais dias"
                >
                  <span className="text-base">→</span>
                  <span>+7 dias</span>
                </button>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                Horário
              </p>
              {slots.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Nenhum horário disponível neste dia.
                </p>
              ) : (
                <div className="grid grid-cols-6 gap-1.5">
                  {slots.map((s) => (
                    <button
                      key={s.toISOString()}
                      onClick={() => {
                        setSlot(s);
                        setStep("client");
                      }}
                      className="rounded-md border border-border py-1.5 text-xs hover:border-foreground"
                    >
                      {format(s, "HH:mm")}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === "client" && slot && selected.length > 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-3"
          >
            <StepBack onBack={() => setStep("datetime")} show />
            <div className="rounded-md border border-border bg-card p-3 text-xs">
              <p>
                <span className="text-muted-foreground">Quando:</span>{" "}
                <span className="font-medium">
                  {format(slot, "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Serviços:</span>{" "}
                <span className="font-medium">
                  {selected.map((s) => s.name).join(" + ")}
                </span>{" "}
                · {brl(totalCents)}
              </p>
            </div>
            <ClientCombobox value={client} onChange={setClient} />
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !client.name || !client.phone}
            >
              <Check className="mr-2 h-4 w-4" />
              {submitting ? "Criando..." : "Confirmar e notificar cliente"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepBack({ onBack, show }: { onBack: () => void; show: boolean }) {
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="h-3 w-3" /> Voltar
    </button>
  );
}
