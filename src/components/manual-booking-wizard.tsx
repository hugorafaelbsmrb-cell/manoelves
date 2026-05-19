import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMinutes, format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, ChevronLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { brl, minutesLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(isOwner ? "barber" : "service");
  const [barberId, setBarberId] = useState<string | null>(isOwner ? null : user?.id ?? null);
  const [service, setService] = useState<SelectedService | null>(null);
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [slot, setSlot] = useState<Date | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setStep(isOwner ? "barber" : "service");
    setBarberId(isOwner ? null : user?.id ?? null);
    setService(null);
    setDate(startOfDay(new Date()));
    setSlot(null);
    setName("");
    setPhone("");
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
    if (!service || !workingHours) return [] as Date[];
    const weekday = date.getDay();
    const windows = workingHours.filter((w) => w.weekday === weekday);
    if (windows.length === 0) return [];
    const stepMin = 15;
    const totalMin = service.duration_minutes + (buffer ?? 10);
    const out: Date[] = [];
    for (const w of windows) {
      const [sh, sm] = w.start_time.split(":").map(Number);
      const [eh, em] = w.end_time.split(":").map(Number);
      const start = new Date(date);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(date);
      end.setHours(eh, em, 0, 0);
      for (let t = start; addMinutes(t, totalMin) <= end; t = addMinutes(t, stepMin)) {
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
  }, [service, workingHours, date, buffer, dayAppts]);

  useEffect(() => {
    setSlot(null);
  }, [date]);

  async function submit() {
    if (!barberId || !service || !slot) return;
    setSubmitting(true);
    try {
      const start = slot;
      const end = addMinutes(start, service.duration_minutes);
      const { data: appt, error } = await supabase
        .from("appointments")
        .insert({
          barber_id: barberId,
          client_name: name,
          client_whatsapp: phone,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          status: "confirmed",
          total_cents: service.price_cents,
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("appointment_items").insert({
        appointment_id: appt.id,
        service_id: service.id,
        price_cents: service.price_cents,
        duration_minutes: service.duration_minutes,
      });
      toast.success("Agendamento criado!");
      qc.invalidateQueries({ queryKey: ["agenda-appts"] });
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
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
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
          <div className="space-y-2">
            <StepBack onBack={() => isOwner && setStep("barber")} show={isOwner} />
            <p className="text-sm text-muted-foreground">Selecione o serviço</p>
            <div className="grid max-h-[320px] gap-2 overflow-y-auto">
              {(services ?? []).map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setService(s);
                    setStep("datetime");
                  }}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:border-foreground"
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {minutesLabel(s.duration_minutes)}
                    </p>
                  </div>
                  <span className="font-display">{brl(s.price_cents)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "datetime" && service && (
          <div className="space-y-3">
            <StepBack onBack={() => setStep("service")} show />
            <div className="rounded-md border border-border bg-card p-2 text-xs">
              <span className="text-muted-foreground">Serviço:</span>{" "}
              <span className="font-medium">{service.name}</span> ·{" "}
              {minutesLabel(service.duration_minutes)}
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
                <div className="grid max-h-[200px] grid-cols-4 gap-2 overflow-y-auto">
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

        {step === "client" && slot && service && (
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
                <span className="text-muted-foreground">Serviço:</span>{" "}
                <span className="font-medium">{service.name}</span> ·{" "}
                {brl(service.price_cents)}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-name">Nome do cliente</Label>
              <Input
                id="m-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-phone">WhatsApp</Label>
              <Input
                id="m-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={20}
                placeholder="(11) 91234-5678"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              <Check className="mr-2 h-4 w-4" />
              {submitting ? "Criando..." : "Confirmar agendamento"}
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
