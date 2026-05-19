import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE = "https://bbblepjlvjtuatqdiwla.supabase.co/functions/v1/api";

async function getKey() {
  const { data, error } = await supabaseAdmin
    .from("integration_settings")
    .select("sighor_api_key")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const key = (data as { sighor_api_key?: string } | null)?.sighor_api_key;
  if (!key) throw new Error("Sighor não configurado. Adicione a chave em Configurações.");
  return key;
}

type Json = null | string | number | boolean | Json[] | { [k: string]: Json };

async function sighor(
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, string> } = {},
): Promise<Json> {
  const key = await getKey();
  const qs = init.query ? "?" + new URLSearchParams(init.query).toString() : "";
  const res = await fetch(BASE + path + qs, {
    method: init.method ?? "GET",
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
    },
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
      `Sighor API ${res.status}`;
    throw new Error(String(msg));
  }
  return json;
}

/* --------------------- Media --------------------- */

export const listMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => sighor("/media"));

const mediaSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["image", "video", "url", "html", "youtube", "google_drive", "rss"]),
  url: z.string().url().max(2000),
  description: z.string().max(1000).optional().nullable(),
});

export const createMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => mediaSchema.parse(d))
  .handler(async ({ data }) => sighor("/media", { method: "POST", body: data }));

export const deleteMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => sighor(`/media/${data.id}`, { method: "DELETE" }));

/* --------------------- Playlists --------------------- */

export const listPlaylists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => sighor("/playlists"));

export const createPlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => sighor("/playlists", { method: "POST", body: data }));

/* --------------------- Displays --------------------- */

export const listDisplays = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => sighor("/displays"));

/* --------------------- Schedules --------------------- */

export const listSchedules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => sighor("/schedules"));
