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
