import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

// ============================================================
// Configurações de integração — SERVER ONLY.
// Segredos (mp_access_token, mp_webhook_secret, wapi_token,
// openai_api_key, sighor_api_key, whatsapp_*) NUNCA voltam para o cliente.
// O cliente só recebe flags "configured" e campos públicos.
// ============================================================

async function assertOwner(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  if (!data) throw new Error("Acesso restrito ao dono.");
}

export type PublicIntegrationSettings = {
  mp_configured: boolean;
  mp_public_key: string;
  mp_webhook_configured: boolean;
  whatsapp_configured: boolean;
  sighor_configured: boolean;
  uazapi_url: string;
  uazapi_configured: boolean;
  wapi_configured: boolean;
  openai_configured: boolean;
  birthday_notifications_enabled: boolean;
  birthday_days_before: number;
  birthday_discount_pct: number;
  birthday_message_template: string;
};

export const getIntegrationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PublicIntegrationSettings> => {
    await assertOwner(context.userId);
    const { data } = await supabaseAdmin
      .from("integration_settings")
      .select(
        "mp_access_token, mp_public_key, mp_webhook_secret, whatsapp_token, whatsapp_phone_id, sighor_api_key, uazapi_url, uazapi_token, wapi_token, wapi_instance_id, openai_api_key, birthday_notifications_enabled, birthday_days_before, birthday_discount_pct, birthday_message_template",
      )
      .limit(1)
      .maybeSingle();
    if (!data) throw new Error("Configurações não encontradas.");

    return {
      mp_configured: Boolean(data.mp_access_token),
      mp_public_key: data.mp_public_key ?? "",
      mp_webhook_configured: Boolean(data.mp_webhook_secret),
      whatsapp_configured: Boolean(data.whatsapp_token && data.whatsapp_phone_id),
      sighor_configured: Boolean(data.sighor_api_key),
      uazapi_url: data.uazapi_url ?? "",
      uazapi_configured: Boolean(data.uazapi_url && data.uazapi_token),
      wapi_configured: Boolean(data.wapi_token && data.wapi_instance_id),
      openai_configured: Boolean(data.openai_api_key),
      birthday_notifications_enabled: data.birthday_notifications_enabled ?? true,
      birthday_days_before: data.birthday_days_before ?? 7,
      birthday_discount_pct: Number(data.birthday_discount_pct ?? 15),
      birthday_message_template: data.birthday_message_template ?? "",
    };
  });

// Semântica de cada campo:
//  - undefined (não enviado) → mantém o valor atual
//  - null → limpa o valor
//  - string → atualiza
const saveSettingsSchema = z.object({
  mp_access_token: z.string().max(500).nullable().optional(),
  mp_public_key: z.string().max(500).nullable().optional(),
  mp_webhook_secret: z.string().max(500).nullable().optional(),
  whatsapp_token: z.string().max(500).nullable().optional(),
  whatsapp_phone_id: z.string().max(200).nullable().optional(),
  sighor_api_key: z.string().max(500).nullable().optional(),
  uazapi_url: z.string().max(500).nullable().optional(),
  uazapi_token: z.string().max(500).nullable().optional(),
  wapi_token: z.string().max(500).nullable().optional(),
  wapi_instance_id: z.string().max(200).nullable().optional(),
  openai_api_key: z.string().max(500).nullable().optional(),
  birthday_notifications_enabled: z.boolean().optional(),
  birthday_days_before: z.number().int().min(0).max(60).optional(),
  birthday_discount_pct: z.number().min(0).max(100).optional(),
  birthday_message_template: z.string().max(2000).optional(),
});

export const saveIntegrationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveSettingsSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);

    const patch: Database["public"]["Tables"]["integration_settings"]["Update"] = {
      updated_at: new Date().toISOString(),
    };
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      (patch as Record<string, unknown>)[key] = value === "" ? null : value;
    }

    const { data: row } = await supabaseAdmin
      .from("integration_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    let error;
    if (row?.id) {
      ({ error } = await supabaseAdmin
        .from("integration_settings")
        .update(patch)
        .eq("id", row.id));
    } else {
      ({ error } = await supabaseAdmin.from("integration_settings").insert(patch));
    }
    if (error) throw new Error(error.message);
    return { ok: true };
  });
