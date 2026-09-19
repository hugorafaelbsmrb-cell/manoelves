import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizePhone } from "@/lib/phone";
import {
  assertWapiConfigured,
  normalizeWapiNumber,
  wapiSendButtonsAction,
  wapiSendImage,
  wapiSendText,
  wapiSendVideo,
} from "@/lib/wapi.functions";
import type { Database } from "@/integrations/supabase/types";

// ============================================================
// Módulo de Marketing — campanhas de WhatsApp para os clientes
// cadastrados, com texto/imagem gerados por IA (openai.functions)
// ou upload próprio. Envio imediato ou agendado (pg_cron a cada 5 min).
// ============================================================

const APP_URL = "https://manoelves.vhex.app";

// A W-API limita delayMessage a 1–15s. Enviamos em levas de BATCH_SIZE
// mensagens com delay de BATCH_DELAY — o cron processa a próxima leva.
const BATCH_SIZE = 12;
const BATCH_DELAY = 15;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

type CampaignRow = Database["public"]["Tables"]["marketing_campaigns"]["Row"];
type CampaignAudience = { barber_id?: string | null };

async function assertOwner(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  if (!data) throw new Error("Acesso restrito ao dono.");
}

function audienceOf(campaign: CampaignRow): CampaignAudience {
  return (campaign.audience ?? {}) as unknown as CampaignAudience;
}

function bookingUrl(campaign: CampaignRow): string {
  if (campaign.link_target === "barber" && campaign.barber_slug) {
    return `${APP_URL}/${campaign.barber_slug}/agendar`;
  }
  return `${APP_URL}/agendar`;
}

async function buildAudience(barberId: string | null) {
  let query = supabaseAdmin
    .from("clients")
    .select("id, name, whatsapp")
    .order("name");
  if (barberId) {
    const { data: appts, error } = await supabaseAdmin
      .from("appointments")
      .select("client_whatsapp")
      .eq("barber_id", barberId)
      .not("client_whatsapp", "is", null);
    if (error) throw new Error(error.message);
    const phones = Array.from(
      new Set((appts ?? []).map((a) => normalizePhone(a.client_whatsapp!))),
    );
    if (phones.length === 0) return { clients: [] };
    query = query.in("whatsapp", phones);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { clients: data ?? [] };
}

// ---------- composição do envio ----------

type ClientRec = { id: string | null; name: string | null; phone: string };

async function sendComposed(
  campaign: CampaignRow,
  rec: ClientRec,
  delayMessage?: number,
): Promise<string | null> {
  const phone = normalizeWapiNumber(rec.phone);
  const linkUrl = bookingUrl(campaign);
  const textWithLink =
    campaign.link_mode === "text"
      ? `${campaign.message_text}\n\n👉 Agende seu horário aqui:\n${linkUrl}`
      : campaign.message_text;
  const buttonMsg = "👇 Toque no botão para garantir seu horário:";
  const urlButton = [
    { type: "URL" as const, buttonText: "Agendar horário", url: linkUrl },
  ];

  let messageId: string | undefined;

  if (campaign.media_kind === "image" && campaign.media_url) {
    const r = await wapiSendImage(phone, campaign.media_url, textWithLink || undefined, delayMessage);
    messageId = r.messageId;
    if (campaign.link_mode === "button") {
      const b = await wapiSendButtonsAction(phone, buttonMsg, urlButton, delayMessage);
      messageId = b.messageId ?? messageId;
    }
  } else if (campaign.media_kind === "video" && campaign.media_url) {
    const r = await wapiSendVideo(phone, campaign.media_url, textWithLink || undefined, delayMessage);
    messageId = r.messageId;
    if (campaign.link_mode === "button") {
      const b = await wapiSendButtonsAction(phone, buttonMsg, urlButton, delayMessage);
      messageId = b.messageId ?? messageId;
    }
  } else if (campaign.link_mode === "button") {
    const r = await wapiSendButtonsAction(phone, textWithLink, urlButton, delayMessage);
    messageId = r.messageId;
  } else {
    const r = await wapiSendText(phone, textWithLink, delayMessage);
    messageId = r.messageId;
  }
  return messageId ?? null;
}

// ---------- processamento em levas (usado pelo envio imediato e pelo cron) ----------

export async function processCampaignBatch(campaignId: string) {
  const { data: campaign, error: cErr } = await supabaseAdmin
    .from("marketing_campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (cErr) throw new Error(cErr.message);
  if (!campaign || campaign.status !== "sending") {
    return { sent: 0, failed: 0, remaining: 0, done: true };
  }

  const { data: batch } = await supabaseAdmin
    .from("marketing_campaign_recipients")
    .select("id, client_id, phone, name")
    .eq("campaign_id", campaignId)
    .eq("status", "queued")
    .order("phone")
    .limit(BATCH_SIZE);

  let sent = 0;
  let failed = 0;

  for (const rec of batch ?? []) {
    try {
      const messageId = await sendComposed(
        campaign,
        { id: rec.client_id, name: rec.name, phone: rec.phone },
        BATCH_DELAY,
      );
      await supabaseAdmin
        .from("marketing_campaign_recipients")
        .update({
          status: "sent",
          wapi_message_id: messageId,
          error: null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", rec.id);
      await supabaseAdmin.from("messages_log").insert({
        kind: "marketing",
        to_phone: normalizeWapiNumber(rec.phone),
        to_name: rec.name,
        payload: `[CAMPANHA] ${campaign.title} :: ${campaign.message_text.slice(0, 120)}`,
      });
      sent++;
    } catch (e) {
      await supabaseAdmin
        .from("marketing_campaign_recipients")
        .update({
          status: "error",
          error: (e instanceof Error ? e.message : "erro").slice(0, 500),
        })
        .eq("id", rec.id);
      failed++;
    }
  }

  const { data: cur } = await supabaseAdmin
    .from("marketing_campaigns")
    .select("sent_count, failed_count")
    .eq("id", campaignId)
    .maybeSingle();
  await supabaseAdmin
    .from("marketing_campaigns")
    .update({
      sent_count: (cur?.sent_count ?? 0) + sent,
      failed_count: (cur?.failed_count ?? 0) + failed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  const { count } = await supabaseAdmin
    .from("marketing_campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "queued");

  let done = false;
  if ((count ?? 0) === 0) {
    await supabaseAdmin
      .from("marketing_campaigns")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
    done = true;
  }

  return { sent, failed, remaining: count ?? 0, done };
}

// ---------- dispatch do cron (campanhas agendadas vencidas + levas em andamento) ----------

export async function dispatchScheduledCampaigns() {
  const started: string[] = [];
  const batches: Array<{ id: string; sent: number; failed: number }> = [];

  // 1. campanhas agendadas cujo horário chegou → começam a enviar.
  const { data: due } = await supabaseAdmin
    .from("marketing_campaigns")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());

  for (const c of due ?? []) {
    const { count } = await supabaseAdmin
      .from("marketing_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", c.id);
    if ((count ?? 0) === 0) {
      const { clients } = await buildAudience(audienceOf(c).barber_id ?? null);
      if (clients.length > 0) {
        await supabaseAdmin.from("marketing_campaign_recipients").insert(
          clients.map((cl) => ({
            campaign_id: c.id,
            client_id: cl.id,
            phone: normalizeWapiNumber(cl.whatsapp),
            name: cl.name,
            status: "queued",
          })),
        );
      }
    }
    await supabaseAdmin
      .from("marketing_campaigns")
      .update({
        status: "sending",
        scheduled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", c.id);
    started.push(c.id);
  }

  // 2. campanhas em andamento → próxima leva.
  const { data: sending } = await supabaseAdmin
    .from("marketing_campaigns")
    .select("id")
    .eq("status", "sending");
  for (const c of sending ?? []) {
    const r = await processCampaignBatch(c.id);
    batches.push({ id: c.id, sent: r.sent, failed: r.failed });
  }

  return { started, batches };
}

// ============================================================
// Server fns (UI /marketing — somente dono)
// ============================================================

const campaignDraftSchema = z.object({
  title: z.string().trim().min(2).max(120),
  message_text: z.string().max(4000),
  media_kind: z.enum(["none", "image", "video"]).default("none"),
  media_url: z.string().max(1000).nullable().default(null),
  media_path: z.string().max(500).nullable().default(null),
  link_mode: z.enum(["none", "button", "text"]).default("button"),
  link_target: z.enum(["general", "barber"]).default("general"),
  barber_slug: z.string().max(120).nullable().default(null),
  audience: z
    .object({ barber_id: z.string().uuid().nullable() })
    .default({ barber_id: null }),
  delay_seconds: z.number().int().min(1).max(900).default(45),
});

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.userId);
    const { data, error } = await supabaseAdmin
      .from("marketing_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { campaigns: data ?? [] };
  });

export const saveCampaignDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => campaignDraftSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("marketing_campaigns")
      .insert({ ...data, status: "draft", created_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { campaign: row };
  });

export const updateCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      campaignId: z.string().uuid(),
      data: campaignDraftSchema.partial(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    const { data: existing } = await supabaseAdmin
      .from("marketing_campaigns")
      .select("status")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (!existing) throw new Error("Campanha não encontrada.");
    if (existing.status === "sending" || existing.status === "sent") {
      throw new Error("Campanhas enviadas não podem ser editadas.");
    }
    const { data: row, error } = await supabaseAdmin
      .from("marketing_campaigns")
      .update({ ...data.data, updated_at: new Date().toISOString() })
      .eq("id", data.campaignId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { campaign: row };
  });

export const duplicateCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ campaignId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    const { data: src } = await supabaseAdmin
      .from("marketing_campaigns")
      .select("*")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (!src) throw new Error("Campanha não encontrada.");
    const { data: row, error } = await supabaseAdmin
      .from("marketing_campaigns")
      .insert({
        title: `${src.title} (cópia)`,
        message_text: src.message_text,
        media_kind: src.media_kind,
        media_url: src.media_url,
        media_path: src.media_path,
        link_mode: src.link_mode,
        link_target: src.link_target,
        barber_slug: src.barber_slug,
        audience: src.audience,
        delay_seconds: src.delay_seconds,
        status: "draft",
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { campaign: row };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ campaignId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    const { data: existing } = await supabaseAdmin
      .from("marketing_campaigns")
      .select("status")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (!existing) throw new Error("Campanha não encontrada.");
    if (existing.status === "sending" || existing.status === "sent") {
      throw new Error("Campanhas enviadas não podem ser excluídas.");
    }
    const { error } = await supabaseAdmin
      .from("marketing_campaigns")
      .delete()
      .eq("id", data.campaignId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const campaignAudienceCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ barber_id: z.string().uuid().nullable().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    const { clients } = await buildAudience(data.barber_id ?? null);
    return { count: clients.length };
  });

export const uploadCampaignMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        dataBase64: z.string().min(1),
        fileName: z.string().min(1).max(200),
        contentType: z.string().min(1).max(100),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    const isVideo = data.contentType.startsWith("video/");
    const isImage = data.contentType.startsWith("image/");
    if (!isVideo && !isImage) throw new Error("Envie apenas imagem ou vídeo MP4.");
    if (isVideo && data.contentType !== "video/mp4") {
      throw new Error("O vídeo precisa ser MP4.");
    }
    const base64 = data.dataBase64.replace(/^data:[^;]+;base64,/, "");
    const bytes = Buffer.from(base64, "base64");
    const max = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (bytes.length > max) {
      throw new Error(isVideo ? "Vídeo acima de 25MB." : "Imagem acima de 8MB.");
    }
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const { error } = await supabaseAdmin.storage
      .from("marketing")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("marketing").getPublicUrl(path);
    return { url: pub.publicUrl, path };
  });

export const sendCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ campaignId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    await assertWapiConfigured();
    const { data: campaign } = await supabaseAdmin
      .from("marketing_campaigns")
      .select("*")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (!campaign) throw new Error("Campanha não encontrada.");
    if (campaign.status === "sending") throw new Error("A campanha já está sendo enviada.");
    if (!campaign.message_text.trim()) throw new Error("A campanha precisa de um texto.");

    const { count } = await supabaseAdmin
      .from("marketing_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id);
    if ((count ?? 0) === 0) {
      const { clients } = await buildAudience(audienceOf(campaign).barber_id ?? null);
      if (clients.length === 0) {
        throw new Error("Nenhum cliente no público desta campanha.");
      }
      const { error } = await supabaseAdmin
        .from("marketing_campaign_recipients")
        .insert(
          clients.map((cl) => ({
            campaign_id: campaign.id,
            client_id: cl.id,
            phone: normalizeWapiNumber(cl.whatsapp),
            name: cl.name,
            status: "queued",
          })),
        );
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin
      .from("marketing_campaigns")
      .update({
        status: "sending",
        scheduled_at: null,
        sent_count: 0,
        failed_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);

    const res = await processCampaignBatch(campaign.id);
    return { ok: true, ...res };
  });

export const sendCampaignTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        campaignId: z.string().uuid(),
        phone: z.string().min(8).max(20),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    await assertWapiConfigured();
    const { data: campaign } = await supabaseAdmin
      .from("marketing_campaigns")
      .select("*")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (!campaign) throw new Error("Campanha não encontrada.");
    if (!campaign.message_text.trim()) throw new Error("A campanha precisa de um texto.");
    await sendComposed(campaign, { id: null, name: "Teste", phone: data.phone });
    await supabaseAdmin.from("messages_log").insert({
      kind: "marketing",
      to_phone: normalizeWapiNumber(data.phone),
      to_name: "Teste",
      payload: `[TESTE] ${campaign.title}`,
    });
    return { ok: true };
  });

export const scheduleCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        campaignId: z.string().uuid(),
        scheduledAt: z.string().min(10),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    const when = new Date(data.scheduledAt);
    if (isNaN(when.getTime())) throw new Error("Data inválida.");
    if (when.getTime() <= Date.now()) throw new Error("Agende para um horário futuro.");
    const { data: existing } = await supabaseAdmin
      .from("marketing_campaigns")
      .select("status")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (!existing) throw new Error("Campanha não encontrada.");
    if (existing.status === "sending" || existing.status === "sent") {
      throw new Error("Campanha já enviada.");
    }
    await supabaseAdmin
      .from("marketing_campaigns")
      .update({
        status: "scheduled",
        scheduled_at: when.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.campaignId);
    return { ok: true };
  });

export const cancelScheduledCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ campaignId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    const { data: existing } = await supabaseAdmin
      .from("marketing_campaigns")
      .select("status")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (!existing) throw new Error("Campanha não encontrada.");
    if (existing.status !== "scheduled") throw new Error("Campanha não está agendada.");
    await supabaseAdmin
      .from("marketing_campaigns")
      .update({
        status: "draft",
        scheduled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.campaignId);
    return { ok: true };
  });
