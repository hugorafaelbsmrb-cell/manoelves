import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, addMinutes, format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Check, Copy, QrCode } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl, minutesLabel } from "@/lib/format";

const searchSchema = z.object({
  comboId: z.string().optional(),
  serviceId: z.string().optional(),
});

export const Route = createFileRoute("/$slug_/agendar")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Agendar — Mano Elves" }] }),
  component: BookingPage,
});

interface Selection {
  name: string;
  totalMinutes: number;
  totalCents: number;
  comboId?: string;
  serviceIds: string[];
}

function BookingPage() {
  const { slug } = Route.useParams();
  const { comboId, serviceId } = Route.useSearch();

  const [step, setStep] = useState<"date" | "form" | "pix" | "done">("date");
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientWhatsapp, setClientWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const { data: barber } = useQuery({
    queryKey: ["barber", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, slug, avatar_url")
        .eq("slug", slug)
        .maybeSingle();
      return data;
    },
  });

  const { data: shop } = useQuery({
    queryKey: ["barbershop"],
    queryFn: async () => {
      const { data } = await supabase.from("barbershop").select("*").limit(1).single();
      return data;
    },
  });

  const { data: selection } = useQuery<Selection | null>({
    queryKey: ["selection", comboId, serviceId],
    enabled: !!(comboId || serviceId),
    queryFn: async () => {
      if (comboId) {
        const { data: combo } = await supabase
          .from("combos")
          .select("id, name, price_cents, combo_services(service_id, services(id, duration_minutes))")
          .eq("id", comboId)
          .maybeSingle();
        if (!combo) return null;
        const items = combo.combo_services ?? [];
        return {
          name: combo.name,
          totalCents: combo.price_cents,
          totalMinutes: items.reduce(
            (s, cs) =>
              s +
              ((cs.services as { duration_minutes?: number } | null)?.duration_minutes ?? 0),
            0,
          ),
          comboId: combo.id,
          serviceIds: items.map((cs) => cs.service_id),
        };
      }
      if (serviceId) {
        const { data: svc } = await supabase
          .from("services")
          .select("id, name, duration_minutes, price_cents")
          .eq("id", serviceId)
          .maybeSingle();
        if (!svc) return null;
        return {
          name: svc.name,
          totalCents: svc.price_cents,
          totalMinutes: svc.duration_minutes,
          serviceIds: [svc.id],
        };
      }
      return null;
    },
  });

  const { data: workingHours } = useQuery({
    queryKey: ["wh", barber?.id],
    enabled: !!barber?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("working_hours")
        .select("weekday, start_time, end_time")
        .eq("barber_id", barber!.id);
      return data ?? [];
    },
  });

  const { data: buffer } = useQuery({
    queryKey: ["buffer", barber?.id],
    enabled: !!barber?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("buffer_settings")
        .select("buffer_minutes")
        .eq("barber_id", barber!.id)
        .maybeSingle();
      return data?.buffer_minutes ?? 10;
    },
  });

  const dayStart = startOfDay(selectedDate);
  const dayEnd = addDays(dayStart, 1);
  const { data: dayAppointments } = useQuery({
    queryKey: ["appts", barber?.id, dayStart.toISOString()],
    enabled: !!barber?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("start_at, end_at, status")
        .eq("barber_id", barber!.id)
        .gte("start_at", dayStart.toISOString())
        .lt("start_at", dayEnd.toISOString())
        .in("status", ["pending_payment", "confirmed"]);
      return data ?? [];
    },
  });

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i)), []);

  const slots = useMemo(() => {
    if (!selection || !workingHours) return [] as Date[];
    const weekday = selectedDate.getDay();
    const windows = workingHours.filter((w) => w.weekday === weekday);
    if (windows.length === 0) return [];
    const stepMin = 15;
    const totalMin = selection.totalMinutes + (buffer ?? 10);
    const result: Date[] = [];
    for (const w of windows) {
      const [sh, sm] = w.start_time.split(":").map(Number);
      const [eh, em] = w.end_time.split(":").map(Number);
      const start = new Date(selectedDate);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(eh, em, 0, 0);
      for (let t = start; addMinutes(t, totalMin) <= end; t = addMinutes(t, stepMin)) {
        const slotEnd = addMinutes(t, totalMin);
        const conflict = (dayAppointments ?? []).some((a) => {
          const aS = new Date(a.start_at);
          const aE = new Date(a.end_at);
          return t < aE && slotEnd > aS;
        });
        if (!conflict && t > new Date()) result.push(new Date(t));
      }
    }
    return result;
  }, [selection, workingHours, selectedDate, buffer, dayAppointments]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate]);

  async function submitBooking() {
    if (!barber || !selection || !selectedSlot) return;
    setSubmitting(true);
    try {
      const start = selectedSlot;
      const end = addMinutes(start, selection.totalMinutes);
      const requiresPix = shop?.no_show_protection ?? true;

      const { data: appt, error } = await supabase
        .from("appointments")
        .insert({
          barber_id: barber.id,
          client_name: clientName,
          client_whatsapp: clientWhatsapp,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          status: requiresPix ? "pending_payment" : "confirmed",
          total_cents: selection.totalCents,
          combo_id: selection.comboId,
        })
        .select("id")
        .single();
      if (error) throw error;
      setCreatedId(appt.id);

      // serviços do combo/serviço
      if (selection.serviceIds.length) {
        const { data: svcs } = await supabase
          .from("services")
          .select("id, price_cents, duration_minutes")
          .in("id", selection.serviceIds);
        await supabase.from("appointment_items").insert(
          (svcs ?? []).map((s) => ({
            appointment_id: appt.id,
            service_id: s.id,
            price_cents: s.price_cents,
            duration_minutes: s.duration_minutes,
          })),
        );
      }

      if (requiresPix) {
        setStep("pix");
      } else {
        await logWhatsAppConfirmation(appt.id, clientName, clientWhatsapp, start);
        setStep("done");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao agendar");
    } finally {
      setSubmitting(false);
    }
  }

  async function simulatePixPaid() {
    if (!createdId || !selectedSlot) return;
    await supabase.from("appointments").update({ status: "confirmed" }).eq("id", createdId);
    await logWhatsAppConfirmation(createdId, clientName, clientWhatsapp, selectedSlot);
    toast.success("Pagamento aprovado (simulado).");
    setStep("done");
  }

  async function logWhatsAppConfirmation(apptId: string, name: string, phone: string, when: Date) {
    await supabase.from("messages_log").insert([
      {
        kind: "confirmation",
        to_phone: phone,
        to_name: name,
        appointment_id: apptId,
        payload: `Olá ${name}! Seu horário com ${barber?.full_name} está confirmado para ${format(when, "dd/MM 'às' HH:mm", { locale: ptBR })}.`,
      },
    ]);
  }

  const pixCode = useMemo(
    () =>
      `00020126360014BR.GOV.BCB.PIX0114${shop?.pix_key ?? "manoelves@pix"}5204000053039865802BR5913MANO ELVES6009SAO PAULO62070503***6304ABCD`,
    [shop?.pix_key],
  );

  if (!selection) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Selecione um combo ou serviço.
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-xl items-center justify-between px-5 py-4">
          <Link
            to="/$slug"
            params={{ slug }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
          <p className="text-xs text-muted-foreground">{barber?.full_name}</p>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-5 py-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Você está agendando
          </p>
          <div className="mt-1 flex items-center justify-between">
            <p className="font-display text-xl tracking-wide">{selection.name}</p>
            <p className="font-display text-xl">{brl(selection.totalCents)}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Duração: {minutesLabel(selection.totalMinutes)}
            {buffer ? ` (+${buffer}min de preparo)` : ""}
          </p>
        </div>

        {step === "date" && (
          <>
            <h3 className="mt-6 font-display text-lg tracking-wider">Escolha o dia</h3>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {days.map((d) => {
                const active = isSameDay(d, selectedDate);
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => setSelectedDate(d)}
                    className={`flex min-w-[64px] flex-col items-center rounded-lg border px-3 py-2 text-xs ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="uppercase">{format(d, "EEE", { locale: ptBR })}</span>
                    <span className="font-display text-xl">{format(d, "dd")}</span>
                  </button>
                );
              })}
            </div>

            <h3 className="mt-6 font-display text-lg tracking-wider">Horários disponíveis</h3>
            {slots.length === 0 ? (
              <div className="mt-3 space-y-3 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                <p>Nenhum horário disponível neste dia.</p>
                {barber && (
                  <WaitlistJoin
                    barberId={barber.id}
                    period={format(selectedDate, "EEEE", { locale: ptBR })}
                  />
                )}
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <button
                    key={s.toISOString()}
                    onClick={() => {
                      setSelectedSlot(s);
                      setStep("form");
                    }}
                    className="rounded-lg border border-border py-2 text-sm hover:border-foreground"
                  >
                    {format(s, "HH:mm")}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {step === "form" && selectedSlot && (
          <>
            <button
              onClick={() => setStep("date")}
              className="mt-6 text-xs text-muted-foreground hover:text-foreground"
            >
              ← Trocar horário
            </button>
            <div className="mt-2 rounded-lg border border-border bg-card p-3 text-sm">
              <span className="text-muted-foreground">Horário:</span>{" "}
              <span className="font-medium">
                {format(selectedSlot, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitBooking();
              }}
              className="mt-6 space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="name">Seu nome</Label>
                <Input
                  id="name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wpp">WhatsApp (com DDD)</Label>
                <Input
                  id="wpp"
                  value={clientWhatsapp}
                  onChange={(e) => setClientWhatsapp(e.target.value)}
                  required
                  maxLength={20}
                  placeholder="(11) 91234-5678"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Enviando..." : "Confirmar agendamento"}
              </Button>
            </form>
          </>
        )}

        {step === "pix" && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6 text-center">
            <QrCode className="mx-auto h-10 w-10" />
            <h3 className="mt-3 font-display text-xl tracking-wider">
              Pague o sinal para garantir
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {brl(shop?.no_show_deposit_cents ?? 2000)} de sinal — descontado no atendimento.
            </p>
            <div className="mt-4 break-all rounded-md border border-border bg-background p-3 text-left text-[10px] text-muted-foreground">
              {pixCode}
            </div>
            <Button
              variant="secondary"
              className="mt-3 w-full"
              onClick={() => {
                navigator.clipboard.writeText(pixCode);
                toast.success("Pix copiado!");
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copiar Pix
            </Button>
            <Button onClick={simulatePixPaid} className="mt-2 w-full">
              <Check className="mr-2 h-4 w-4" /> Simular pagamento aprovado
            </Button>
            <p className="mt-3 text-[10px] text-muted-foreground">
              {/* TODO: integrar provedor Pix real (Mercado Pago / Asaas) */}
              Pix integrado em produção via provedor (mock para demo).
            </p>
          </div>
        )}

        {step === "done" && selectedSlot && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-success-foreground">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="mt-3 font-display text-2xl tracking-wider">
              Agendamento confirmado!
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {format(selectedSlot, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Enviamos a confirmação no seu WhatsApp (simulado).
            </p>
            <Link
              to="/$slug"
              params={{ slug }}
              className="mt-4 inline-block text-xs text-muted-foreground underline"
            >
              Voltar para a página do barbeiro
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function WaitlistJoin({ barberId, period }: { barberId: string; period: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);

  async function join() {
    if (!name || !phone) {
      toast.error("Preencha nome e WhatsApp");
      return;
    }
    const { error } = await supabase.from("waitlist").insert({
      barber_id: barberId,
      client_name: name,
      client_whatsapp: phone,
      preferred_period: period,
    });
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Você está na fila! Avisaremos por WhatsApp.");
  }

  if (sent) {
    return <p className="text-xs text-foreground">✓ Adicionado à fila de espera.</p>;
  }

  return (
    <div className="space-y-2 text-left">
      <p className="text-xs">Entre na fila — avisamos se vagar:</p>
      <Input
        placeholder="Seu nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        placeholder="WhatsApp"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <Button size="sm" className="w-full" onClick={join}>
        Entrar na fila
      </Button>
    </div>
  );
}
