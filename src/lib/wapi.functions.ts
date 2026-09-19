import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyToken } from "@/lib/client-token.server";
import { normalizePhone } from "@/lib/phone";

// ============================================================
// Gateway W-API (https://docs.w-api.app) — substitui a uazapi.
// Auth: Authorization: Bearer <wapi_token> + instanceId na query.
// Plano PRO: botões de ação (CALL/URL) via /v1/message/send-buttons-action.
// ============================================================

export const WAPI_BASE = "https://api.w-api.app";

type Json = null | string | number | boolean | Json[] | { [k: string]: Json };

type WapiSettings = { wapi_token?: string | null; wapi_instance_id?: string | null };

export type WapiSendResponse = {
  instanceId?: string;
  messageId?: string;
  insertedId?: string;
};

async function getConfig() {
  const { data, error } = await supabaseAdmin
    .from("integration_settings")
    .select("wapi_token, wapi_instance_id")
    .limit(1)
    .maybeSingle<WapiSettings>();
  if (error) throw new Error(error.message);
  const token = data?.wapi_token?.trim();
  const instanceId = data?.wapi_instance_id?.trim();
  if (!token || !instanceId) {
    throw new Error(
      "W-API não configurada. Adicione Token e Instance ID em Configurações.",
    );
  }
  return { token, instanceId };
}

// Usado por outros módulos (marketing) para validar antes de enviar.
export async function assertWapiConfigured(): Promise<void> {
  await getConfig();
}

async function wapi<T = Json>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { token, instanceId } = await getConfig();
  const url = new URL(WAPI_BASE + path);
  url.searchParams.set("instanceId", instanceId);
  const res = await fetch(url.toString(), {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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
      `W-API ${res.status}`;
    throw new Error(String(msg));
  }
  return json as T;
}

export function normalizeWapiNumber(raw: string) {
  const digits = (raw ?? "").replace(/\D+/g, "");
  if (!digits) return digits;
  if (digits.length <= 11) return "55" + digits;
  return digits;
}

// delayMessage da W-API aceita 1–15 segundos (ritmo entre envios na fila).
function clampDelay(seconds?: number) {
  if (!seconds || seconds < 1) return undefined;
  return Math.min(15, Math.max(1, Math.round(seconds)));
}

// ---------- envios brutos (server-side, reutilizados por outras libs) ----------

export async function wapiSendText(
  phone: string,
  message: string,
  delayMessage?: number,
): Promise<WapiSendResponse> {
  return wapi<WapiSendResponse>("/v1/message/send-text", {
    method: "POST",
    body: { phone, message, ...(clampDelay(delayMessage) ? { delayMessage: clampDelay(delayMessage) } : {}) },
  });
}

export async function wapiSendImage(
  phone: string,
  imageUrl: string,
  caption?: string,
  delayMessage?: number,
): Promise<WapiSendResponse> {
  return wapi<WapiSendResponse>("/v1/message/send-image", {
    method: "POST",
    body: {
      phone,
      image: imageUrl,
      ...(caption ? { caption } : {}),
      ...(clampDelay(delayMessage) ? { delayMessage: clampDelay(delayMessage) } : {}),
    },
  });
}

export async function wapiSendVideo(
  phone: string,
  videoUrl: string,
  caption?: string,
  delayMessage?: number,
): Promise<WapiSendResponse> {
  return wapi<WapiSendResponse>("/v1/message/send-video", {
    method: "POST",
    body: {
      phone,
      video: videoUrl,
      ...(caption ? { caption } : {}),
      ...(clampDelay(delayMessage) ? { delayMessage: clampDelay(delayMessage) } : {}),
    },
  });
}

export type WapiButtonAction = {
  type: "CALL" | "URL" | "REPLY";
  buttonText: string;
  url?: string;
  phone?: string;
};

export async function wapiSendButtonsAction(
  phone: string,
  message: string,
  buttonActions: WapiButtonAction[],
  delayMessage?: number,
): Promise<WapiSendResponse> {
  return wapi<WapiSendResponse>("/v1/message/send-buttons-action", {
    method: "POST",
    body: {
      phone,
      message,
      buttonActions,
      ...(clampDelay(delayMessage) ? { delayMessage: clampDelay(delayMessage) } : {}),
    },
  });
}

// ---------- instância (usado pela tela de Configurações) ----------

export async function wapiConnectionState(): Promise<Json> {
  try {
    return await wapi("/v1/instance/connection-state");
  } catch {
    // Fallback para instâncias sem endpoint de estado: info da instância.
    return wapi("/v1/instance/info");
  }
}

export async function wapiQrCodeBase64(): Promise<string> {
  const res = await wapi<{ qrcode?: string; error?: boolean }>(
    "/v1/instance/qr-code?image=disable",
  );
  if (!res?.qrcode) {
    throw new Error(
      "W-API não retornou QR code. A instância já pode estar conectada.",
    );
  }
  return res.qrcode;
}

export const wapiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const res = await wapiConnectionState();
    return res;
  });

export const wapiQr = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const qrcode = await wapiQrCodeBase64();
    return { qrcode };
  });

// ============================================================
// Confirmação de agendamento.
// Public — chamado pelo fluxo de agendamento (cliente não autenticado).
// Exige o token do cliente (OTP verificado) e confere se o telefone do
// agendamento bate com o telefone do token — evita envio abusivo de WhatsApp.
// ============================================================
const sendBookingConfirmationSchema = z.object({
  appointmentId: z.string().uuid(),
  token: z.string().min(10),
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

    // Token do cliente precisa bater com o WhatsApp do agendamento.
    try {
      const { phone } = verifyToken(data.token);
      if (normalizePhone(phone) !== normalizePhone(appt.client_whatsapp)) {
        return { ok: false, skipped: "token não corresponde" };
      }
    } catch {
      return { ok: false, skipped: "token inválido" };
    }

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

    const number = normalizeWapiNumber(appt.client_whatsapp);
    try {
      await wapiSendText(number, text);
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

// ============================================================
// Envio de cobrança PIX (copia e cola) via WhatsApp.
// W-API não oferece botão "copiar código" — o código vai como
// texto monoespaçado (selecionável no WhatsApp).
// ============================================================
const sendOrderPixSchema = z.object({ orderId: z.string().uuid() });

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export const sendOrderPixWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sendOrderPixSchema.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; skipped?: string }> => {
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, client_name, client_whatsapp, total_cents, invoice_number, pix_code",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Comanda não encontrada");
    if (!order.client_whatsapp) return { ok: false, skipped: "sem telefone" };
    if (!order.pix_code) return { ok: false, skipped: "sem código pix" };

    const { data: shop } = await supabaseAdmin
      .from("barbershop")
      .select("name")
      .limit(1)
      .maybeSingle();

    const firstName = (order.client_name ?? "").split(" ")[0] || "tudo bem";
    const shopName = shop?.name ?? "a barbearia";
    const valor = brl(order.total_cents);
    const text =
      `Olá, ${firstName}! ✂️\n` +
      `Aqui está o PIX da sua comanda *${order.invoice_number ?? ""}* na ${shopName}.\n\n` +
      `Valor: *${valor}*\n\n` +
      `Copie o código abaixo, abra o app do seu banco em *Pix › Pix Copia e Cola* e cole o código. Pronto! 🚀\n\n` +
      `*Código PIX (copia e cola):*\n` +
      "```" +
      `\n${order.pix_code}\n` +
      "```";

    const number = normalizeWapiNumber(order.client_whatsapp);

    try {
      await wapiSendText(number, text);
    } catch (e) {
      await supabaseAdmin.from("messages_log").insert({
        kind: "pix",
        to_phone: number,
        to_name: order.client_name,
        payload: `[ERRO] ${e instanceof Error ? e.message : String(e)}`,
      });
      throw e;
    }

    await supabaseAdmin.from("messages_log").insert({
      kind: "pix",
      to_phone: number,
      to_name: order.client_name,
      payload: `PIX ${order.invoice_number ?? ""} ${valor}`,
    });
    return { ok: true };
  });

// ============================================================
// Envio dos links de assinatura (cartão recorrente + Pix do 1º mês).
// PRO: botão de ação com URL do checkout + código PIX como texto
// (a W-API não tem botão "copiar"). Fallback LITE: texto puro.
// ============================================================
const sendSubscriptionLinksSchema = z.object({
  subscriptionId: z.string().uuid(),
  mpInitPoint: z.string().url(),
  pixCode: z.string().min(1),
});

export const sendSubscriptionLinksWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sendSubscriptionLinksSchema.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; skipped?: string }> => {
    const { data: sub, error } = await supabaseAdmin
      .from("subscriptions")
      .select("id, client_name, client_whatsapp, plan_name, monthly_price_cents")
      .eq("id", data.subscriptionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sub) throw new Error("Assinatura não encontrada");
    if (!sub.client_whatsapp) return { ok: false, skipped: "sem telefone" };

    const { data: shop } = await supabaseAdmin
      .from("barbershop")
      .select("name")
      .limit(1)
      .maybeSingle();

    const firstName = (sub.client_name ?? "").split(" ")[0] || "tudo bem";
    const shopName = shop?.name ?? "a barbearia";
    const valor = brl(sub.monthly_price_cents);
    const intro =
      `Olá, ${firstName}! ✂️\n` +
      `Sua assinatura *${sub.plan_name}* na ${shopName} está pronta!\n\n` +
      `Valor: *${valor}/mês*\n\n` +
      `Toque no botão abaixo para assinar com cartão, ou use o PIX do 1º mês.`;
    const pixText =
      `📱 *Pix do 1º mês (copia e cola):*\n` +
      "```" +
      `\n${data.pixCode}\n` +
      "```";

    const number = normalizeWapiNumber(sub.client_whatsapp);

    try {
      // 1º — botão de ação com o checkout do cartão (plano PRO).
      await wapiSendButtonsAction(number, intro, [
        { type: "URL", buttonText: "💳 Assinar com cartão", url: data.mpInitPoint },
      ]);
      // 2º — código PIX como texto.
      await wapiSendText(number, pixText);
    } catch (e) {
      // Fallback (plano LITE ou falha de botões): texto puro com link e código.
      try {
        await wapiSendText(
          number,
          `${intro}\n\n💳 *Assinar com cartão:* ${data.mpInitPoint}\n\n${pixText}`,
        );
      } catch (err) {
        await supabaseAdmin.from("messages_log").insert({
          kind: "subscription",
          to_phone: number,
          to_name: sub.client_name,
          payload: `[ERRO] ${err instanceof Error ? err.message : String(err)} :: ${e instanceof Error ? e.message : String(e)}`,
        });
        throw err;
      }
    }

    await supabaseAdmin.from("messages_log").insert({
      kind: "subscription",
      to_phone: number,
      to_name: sub.client_name,
      payload: `Links assinatura ${sub.plan_name} (${valor})`,
    });
    return { ok: true };
  });
