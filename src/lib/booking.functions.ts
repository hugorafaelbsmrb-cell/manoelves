import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyToken } from "@/lib/client-auth.functions";
import { normalizePhone } from "@/lib/phone";

// ============================================================
// Agendamento público — SERVER ONLY.
// Antes: o cliente anônimo inseria direto em appointments (policy
// "appt public insert"), confiando em valores enviados pelo browser.
// Agora: criação validada no servidor —
//  1. token do cliente (OTP verificado) obrigatório, telefone bate
//  2. rate limit: máx 3 agendamentos por telefone em 24h
//  3. conflito de horário verificado no servidor
//  4. preço/duração recalculados no servidor (ignora valores do cliente)
// ============================================================

const MAX_BOOKINGS_PER_PHONE_24H = 3;

const createPublicBookingSchema = z.object({
  barberId: z.string().uuid(),
  clientName: z.string().trim().min(2).max(120),
  clientWhatsapp: z.string().trim().min(8).max(20),
  startAt: z.string().datetime(),
  serviceIds: z.array(z.string().uuid()).min(1).max(10),
  comboId: z.string().uuid().optional(),
  token: z.string().min(10),
});

export const createPublicBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createPublicBookingSchema.parse(d))
  .handler(async ({ data }): Promise<{ id: string; requiresPix: boolean }> => {
    // 1) Token do cliente (OTP verificado) — telefone precisa bater.
    let phone: string;
    try {
      phone = verifyToken(data.token).phone;
    } catch {
      throw new Error("Sessão de cliente inválida. Confirme seu código de WhatsApp.");
    }
    if (normalizePhone(phone) !== normalizePhone(data.clientWhatsapp)) {
      throw new Error("Token não corresponde ao WhatsApp informado.");
    }

    const whatsapp = normalizePhone(data.clientWhatsapp);
    const name = data.clientName.trim();
    const start = new Date(data.startAt);
    if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
      throw new Error("Horário inválido.");
    }

    // 2) Rate limit por telefone (24h).
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("client_whatsapp", whatsapp)
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_BOOKINGS_PER_PHONE_24H) {
      throw new Error(
        "Limite de agendamentos atingido. Fale com a barbearia pelo WhatsApp.",
      );
    }

    // 3) Barbeiro existe e está ativo.
    const { data: barber } = await supabaseAdmin
      .from("profiles")
      .select("id, is_active")
      .eq("id", data.barberId)
      .maybeSingle();
    if (!barber || barber.is_active === false) {
      throw new Error("Barbeiro indisponível.");
    }

    // 4) Preço e duração recalculados no servidor.
    let totalCents = 0;
    let durationMin = 0;
    if (data.comboId) {
      const { data: combo } = await supabaseAdmin
        .from("combos")
        .select("id, price_cents, is_active")
        .eq("id", data.comboId)
        .maybeSingle();
      if (!combo || combo.is_active === false) throw new Error("Combo indisponível.");
      totalCents = combo.price_cents;
      const { data: citems } = await supabaseAdmin
        .from("combo_services")
        .select("service_id")
        .eq("combo_id", combo.id);
      const ids = (citems ?? []).map((c) => c.service_id);
      const { data: cservices } = await supabaseAdmin
        .from("services")
        .select("duration_minutes")
        .in("id", ids);
      durationMin = (cservices ?? []).reduce((s, x) => s + x.duration_minutes, 0);
    } else {
      const { data: services } = await supabaseAdmin
        .from("services")
        .select("id, price_cents, duration_minutes, is_active")
        .in("id", data.serviceIds);
      if (!services || services.length !== data.serviceIds.length) {
        throw new Error("Serviço indisponível.");
      }
      if (services.some((s) => s.is_active === false)) {
        throw new Error("Serviço indisponível.");
      }
      totalCents = services.reduce((s, x) => s + x.price_cents, 0);
      durationMin = services.reduce((s, x) => s + x.duration_minutes, 0);
    }
    if (durationMin <= 0) throw new Error("Duração inválida.");

    const end = new Date(start.getTime() + durationMin * 60 * 1000);

    // 5) Conflito de horário verificado no servidor.
    const { data: conflicts } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("barber_id", data.barberId)
      .in("status", ["pending_payment", "confirmed"])
      .lt("start_at", end.toISOString())
      .gt("end_at", start.toISOString());
    if (conflicts && conflicts.length > 0) {
      throw new Error("Horário não está mais disponível. Escolha outro.");
    }

    // 6) Proteção de no-show (sinal PIX) — flag da barbearia.
    const { data: shop } = await supabaseAdmin
      .from("barbershop")
      .select("no_show_protection")
      .limit(1)
      .maybeSingle();
    const requiresPix = shop?.no_show_protection ?? true;

    // 7) Upsert do cliente + insert do agendamento e itens.
    const { data: client } = await supabaseAdmin
      .from("clients")
      .upsert({ name, whatsapp }, { onConflict: "whatsapp" })
      .select("id")
      .maybeSingle();

    const { data: appt, error } = await supabaseAdmin
      .from("appointments")
      .insert({
        barber_id: data.barberId,
        client_name: name,
        client_whatsapp: whatsapp,
        client_id: client?.id ?? null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: requiresPix ? "pending_payment" : "confirmed",
        total_cents: totalCents,
        combo_id: data.comboId ?? null,
      })
      .select("id")
      .single();
    if (error || !appt) {
      throw new Error("Não foi possível criar o agendamento. Tente novamente.");
    }

    if (data.comboId) {
      const { data: citems } = await supabaseAdmin
        .from("combo_services")
        .select("service_id")
        .eq("combo_id", data.comboId);
      const items = (citems ?? []).map((c) => ({ service_id: c.service_id }));
      const { data: cservices } = await supabaseAdmin
        .from("services")
        .select("id, price_cents, duration_minutes")
        .in("id", items.map((i) => i.service_id));
      await supabaseAdmin.from("appointment_items").insert(
        (cservices ?? []).map((s) => ({
          appointment_id: appt.id,
          service_id: s.id,
          price_cents: s.price_cents,
          duration_minutes: s.duration_minutes,
        })),
      );
    } else {
      const { data: services } = await supabaseAdmin
        .from("services")
        .select("id, price_cents, duration_minutes")
        .in("id", data.serviceIds);
      await supabaseAdmin.from("appointment_items").insert(
        (services ?? []).map((s) => ({
          appointment_id: appt.id,
          service_id: s.id,
          price_cents: s.price_cents,
          duration_minutes: s.duration_minutes,
        })),
      );
    }

    return { id: appt.id, requiresPix };
  });

// ============================================================
// MOCK: confirmação de pagamento do sinal (PIX).
// TODO: substituir por pagamento real (Mercado Pago) e webhook.
// Enquanto isso, apenas marca pending_payment → confirmed.
// ============================================================
export const confirmBookingPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ appointmentId: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("id, status")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (!appt) throw new Error("Agendamento não encontrado.");
    if (appt.status !== "pending_payment") return { ok: true };
    const { error } = await supabaseAdmin
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", appt.id)
      .eq("status", "pending_payment");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
