import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import OpenAI from "openai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { composeCampaignLogo } from "@/lib/campaign-image.server";

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
    supabaseAdmin.from("barbershop").select("name, logo_url").limit(1).maybeSingle(),
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
    logoUrl: shop?.logo_url ?? null,
    serviceNames: (services ?? []).map((s) => s.name),
  };
}

const TONES: Record<string, string> = {
  casual: "descontraído e próximo, como um amigo que entende do assunto indicando a barbearia",
  professional: "profissional e direto, destacando qualidade, técnica e confiança",
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
      `Você é um copywriter sênior e estrategista de marketing especializado em barbearias de alto nível, ` +
      `com profundo conhecimento do consumidor masculino premium e de campanhas de WhatsApp que convertem. ` +
      `Barbearia: "${shopName}". Serviços disponíveis: ${serviceNames.join(", ") || "cortes e cuidados masculinos"}. ` +
      `Regras de escrita: tom ${TONES[data.tone] ?? TONES.casual}; ` +
      `português brasileiro natural e sofisticado, sem clichês baratos; ` +
      `estrutura de copy de elite: abertura que prende em até 1 linha, 1–2 benefícios concretos, ` +
      `fechamento com incentivo sutil à ação; ` +
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
    z
      .object({
        campaignText: z.string().min(10).max(4000),
        referenceUrl: z.string().max(1000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ url: string }> => {
    consumeAiBudget();
    const client = await getOpenAiClient();
    const { shopName, logoUrl } = await getShopContext();

    // A imagem nasce do texto da campanha (e, se enviada, da imagem de
    // referência do usuário): o GPT-Image recebe a mensagem pronta e a
    // instrução de representá-la com visual clean/minimalista.
    const trimmed = data.campaignText.trim().slice(0, 1500);
    const promptBase =
      `Você é um diretor de arte especializado em marketing de barbearias premium de alto nível. ` +
      `Crie uma imagem promocional para uma campanha de WhatsApp da barbearia "${shopName}". ` +
      `A imagem deve representar visualmente o tema desta mensagem de campanha: "${trimmed}". ` +
      `Priorize um visual clean: composição minimalista, fundo limpo, poucos elementos, ` +
      `bastante espaço negativo, iluminação suave e profissional. ` +
      `Estética de barbearia masculina premium, cores escuras com detalhes dourados. ` +
      `Sem texto, sem palavras, sem números, sem logotipos e sem rostos de pessoas reais.`;

    try {
      let b64: string | undefined;

      if (data.referenceUrl) {
        // Upload do usuário vira a base criativa (image-to-image).
        const refRes = await fetch(data.referenceUrl);
        if (!refRes.ok) {
          throw new Error("Não foi possível baixar a imagem de referência.");
        }
        const refBuf = Buffer.from(await refRes.arrayBuffer());
        const file = await OpenAI.toFile(refBuf, "referencia.png", {
          type: "image/png",
        });
        const edited = await client.images.edit({
          model: "gpt-image-1",
          image: file,
          prompt:
            promptBase +
            ` Use a imagem de referência como base criativa: mantenha a identidade visual ` +
            `e o estilo dela, elevando ao padrão de campanha premium da barbearia.`,
          size: "1024x1024",
          n: 1,
        });
        b64 = edited.data?.[0]?.b64_json;
      } else {
        const res = await client.images.generate({
          model: "gpt-image-1",
          prompt: promptBase,
          size: "1024x1024",
          quality: "medium",
          n: 1,
        });
        b64 = res.data?.[0]?.b64_json;
      }

      if (!b64) throw new Error("A IA não retornou imagem.");
      const raw = Buffer.from(b64, "base64");
      // Aplica a logo do sistema (se disponível) antes de publicar.
      const bytes = await composeCampaignLogo(raw, logoUrl);
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
