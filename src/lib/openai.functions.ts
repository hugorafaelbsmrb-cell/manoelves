import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import OpenAI from "openai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============================================================
// OpenAI — textos (gpt-4o-mini) e imagens (gpt-image-1) para as
// campanhas de marketing. A chave fica em integration_settings
// (openai_api_key) e NUNCA vai para o cliente.
// ============================================================

const MAX_AI_GENERATIONS_PER_DAY = 50;

// Guard de custo: limite diário em memória (zera se o processo reiniciar).
let aiCounter = { date: "", count: 0 };
function consumeAiBudget() {
  const today = new Date().toISOString().slice(0, 10);
  if (aiCounter.date !== today) aiCounter = { date: today, count: 0 };
  aiCounter.count++;
  if (aiCounter.count > MAX_AI_GENERATIONS_PER_DAY) {
    throw new Error(
      "Limite diário de gerações com IA atingido. Tente novamente amanhã.",
    );
  }
}

async function getOpenAiClient() {
  const { data, error } = await supabaseAdmin
    .from("integration_settings")
    .select("openai_api_key")
    .limit(1)
    .maybeSingle<{ openai_api_key?: string | null }>();
  if (error) throw new Error(error.message);
  const key = data?.openai_api_key?.trim();
  if (!key) {
    throw new Error("OpenAI não configurada. Adicione a API Key em Configurações.");
  }
  return new OpenAI({ apiKey: key });
}

function friendlyOpenAiError(e: unknown): Error {
  if (e instanceof Error) {
    const msg = e.message.toLowerCase();
    if (e.message.includes("401") || msg.includes("invalid api key") || msg.includes("incorrect api key")) {
      return new Error("Chave da OpenAI inválida. Confira em Configurações.");
    }
    if (e.message.includes("429") || msg.includes("insufficient_quota") || msg.includes("quota")) {
      return new Error("Sem créditos na OpenAI. Verifique o saldo da sua conta.");
    }
    if (msg.includes("400") || msg.includes("request")) {
      return new Error("A OpenAI recusou a solicitação. Tente outro texto de ideia.");
    }
    return e;
  }
  return new Error("Falha ao gerar com IA.");
}

async function getShopContext() {
  const [{ data: shop }, { data: services }] = await Promise.all([
    supabaseAdmin.from("barbershop").select("name").limit(1).maybeSingle(),
    supabaseAdmin
      .from("products")
      .select("name")
      .eq("is_active", true)
      .eq("is_internal_use", false)
      .order("name")
      .limit(6),
  ]);
  return {
    shopName: shop?.name ?? "Mano Elves",
    serviceNames: (services ?? []).map((s) => s.name),
  };
}

const TONES: Record<string, string> = {
  casual: "descontraído e próximo, como um amigo indicando a barbearia",
  professional: "profissional e direto, destacando qualidade e confiança",
  urgency: "de urgência amigável, incentivando o cliente a agendar logo",
};

export const generateCampaignText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        idea: z.string().min(3).max(2000),
        tone: z.enum(["casual", "professional", "urgency"]).default("casual"),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ text: string }> => {
    consumeAiBudget();
    const client = await getOpenAiClient();
    const { shopName, serviceNames } = await getShopContext();

    const system =
      `Você escreve mensagens de marketing por WhatsApp para a barbearia "${shopName}". ` +
      `Serviços disponíveis: ${serviceNames.join(", ") || "cortes e cuidados masculinos"}. ` +
      `Regras: tom ${TONES[data.tone] ?? TONES.casual}; texto em português brasileiro; ` +
      `máximo 450 caracteres; no máximo 2 emojis; pode usar *negrito* e quebras de linha; ` +
      `nunca invente preços, promoções específicas ou links — apenas o que a ideia pedir; ` +
      `não inclua saudação com nome ("Olá, Fulano") nem link de agendamento (o sistema adiciona depois). ` +
      `Responda apenas com o texto final da mensagem, sem aspas e sem comentários.`;

    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.idea },
        ],
        max_tokens: 350,
        temperature: 0.8,
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) throw new Error("A IA não retornou texto.");
      return { text };
    } catch (e) {
      throw friendlyOpenAiError(e);
    }
  });

export const generateCampaignImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ prompt: z.string().min(3).max(1000) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ url: string }> => {
    consumeAiBudget();
    const client = await getOpenAiClient();
    const { shopName } = await getShopContext();

    const fullPrompt =
      `Imagem promocional para campanha de WhatsApp da barbearia "${shopName}". ` +
      `Estética: barbearia moderna masculina, cores escuras com dourado, visual premium e profissional. ` +
      `Sem texto, sem palavras, sem logotipos e sem rostos de pessoas reais. ` +
      `Ideia da campanha: ${data.prompt}`;

    try {
      const res = await client.images.generate({
        model: "gpt-image-1",
        prompt: fullPrompt,
        size: "1024x1024",
        quality: "medium",
        n: 1,
      });
      const b64 = res.data?.[0]?.b64_json;
      if (!b64) throw new Error("A IA não retornou imagem.");
      const bytes = Buffer.from(b64, "base64");
      const fileName = `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      const { error } = await supabaseAdmin.storage
        .from("marketing")
        .upload(fileName, bytes, { contentType: "image/png", upsert: false });
      if (error) throw new Error(error.message);
      const { data: pub } = supabaseAdmin.storage.from("marketing").getPublicUrl(fileName);
      return { url: pub.publicUrl };
    } catch (e) {
      throw friendlyOpenAiError(e);
    }
  });
