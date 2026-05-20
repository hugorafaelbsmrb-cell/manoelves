import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Settings = { uazapi_url?: string | null; uazapi_token?: string | null };
type Json = null | string | number | boolean | Json[] | { [k: string]: Json };

async function getConfig() {
  const { data, error } = await supabaseAdmin
    .from("integration_settings")
    .select("uazapi_url, uazapi_token")
    .limit(1)
    .maybeSingle<Settings>();
  if (error) throw new Error(error.message);
  const url = data?.uazapi_url?.trim();
  const token = data?.uazapi_token?.trim();
  if (!url || !token) {
    throw new Error("uazapi não configurada. Adicione URL e token em Configurações.");
  }
  return { base: url.replace(/\/+$/, ""), token };
}

async function uazapi(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<Json> {
  const { base, token } = await getConfig();
  const res = await fetch(base + path, {
    method: init.method ?? "GET",
    headers: { token, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let json: Json = null;
  try {
    json = text ? (JSON.parse(text) as Json) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    const obj = json && typeof json === "object" && !Array.isArray(json) ? json : null;
    const msg =
      (obj && typeof obj.error === "string" && obj.error) ||
      (obj && typeof obj.message === "string" && obj.message) ||
      `uazapi ${res.status}`;
    throw new Error(String(msg));
  }
  return json;
}

function normalizeNumber(raw: string) {
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return digits;
  if (digits.length <= 11) return "55" + digits;
  return digits;
}

export const uazapiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => uazapi("/instance/status"));

const sendTextSchema = z.object({
  number: z.string().min(8).max(20),
  text: z.string().min(1).max(4096),
});

export const uazapiSendText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sendTextSchema.parse(d))
  .handler(async ({ data }): Promise<{ ok: true; number: string }> => {
    const number = normalizeNumber(data.number);
    await uazapi("/send/text", {
      method: "POST",
      body: { number, text: data.text },
    });
    return { ok: true, number };
  });

const connectSchema = z.object({ phone: z.string().max(20).optional() }).optional();

export const uazapiConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => connectSchema.parse(d) ?? {})
  .handler(async ({ data }) => {
    const body: Record<string, string> = {};
    if (data?.phone) body.phone = normalizeNumber(data.phone);
    const res = (await uazapi("/instance/connect", {
      method: "POST",
      body,
    })) as Record<string, unknown> | null;
    const obj = (res && typeof res === "object" ? res : {}) as Record<string, unknown>;
    const instance = (obj.instance ?? {}) as Record<string, unknown>;
    const qrcode =
      (typeof obj.qrcode === "string" && obj.qrcode) ||
      (typeof instance.qrcode === "string" && instance.qrcode) ||
      (typeof obj.qr === "string" && obj.qr) ||
      null;
    const paircode =
      (typeof obj.paircode === "string" && obj.paircode) ||
      (typeof instance.paircode === "string" && instance.paircode) ||
      null;
    const status =
      (typeof obj.status === "string" && obj.status) ||
      (typeof instance.status === "string" && instance.status) ||
      null;
    return { qrcode, paircode, status };
  });

export const uazapiDisconnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => uazapi("/instance/disconnect", { method: "POST" }));

// Public — chamado pelo fluxo de agendamento (cliente não autenticado).
// Valida o appointment via service role e envia a confirmação por WhatsApp.
const sendBookingConfirmationSchema = z.object({
  appointmentId: z.string().uuid(),
});

export const sendBookingConfirmation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => sendBookingConfirmationSchema.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; skipped?: string }> => {
    const { data: appt, error } = await supabaseAdmin
      .from("appointments")
      .select("id, client_name, client_whatsapp, start_at, barber_id, status")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!appt) throw new Error("Agendamento não encontrado");
    if (!appt.client_whatsapp) return { ok: false, skipped: "sem telefone" };

    const { data: barber } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", appt.barber_id)
      .maybeSingle();
    const { data: shop } = await supabaseAdmin
      .from("barbershop")
      .select("name")
      .limit(1)
      .maybeSingle();

    const when = new Date(appt.start_at);
    const dia = when.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const hora = when.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const firstName = (appt.client_name ?? "").split(" ")[0] || "tudo bem";
    const barberName = barber?.full_name ?? "nosso barbeiro";
    const shopName = shop?.name ?? "a barbearia";
    const text =
      `Olá, ${firstName}! 👋\n` +
      `Seja bem-vindo(a) à ${shopName}.\n\n` +
      `Seu horário com *${barberName}* está confirmado para *${dia}* às *${hora}*.\n\n` +
      `Qualquer imprevisto, é só responder esta mensagem. Até breve! ✂️`;

    const number = normalizeNumber(appt.client_whatsapp);
    try {
      await uazapi("/send/text", {
        method: "POST",
        body: { number, text },
      });
    } catch (e) {
      // log mesmo em falha p/ rastreio
      await supabaseAdmin.from("messages_log").insert({
        kind: "confirmation",
        to_phone: number,
        to_name: appt.client_name,
        appointment_id: appt.id,
        payload: `[ERRO] ${e instanceof Error ? e.message : String(e)} :: ${text}`,
      });
      throw e;
    }

    await supabaseAdmin.from("messages_log").insert({
      kind: "confirmation",
      to_phone: number,
      to_name: appt.client_name,
      appointment_id: appt.id,
      payload: text,
    });
    return { ok: true };
  });

