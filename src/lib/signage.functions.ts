import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const BASE = "https://bbblepjlvjtuatqdiwla.supabase.co/functions/v1/api";
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://oofelrvpupitncswylcm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZmVscnZwdXBpdG5jc3d5bGNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDU0ODQsImV4cCI6MjA5NDcyMTQ4NH0.QtqCLvf8X0qqF0eTUKeSquVxcRwUgv4rMgYxLiSfLm8";

async function getAuthenticatedSupabase() {
  const request = getRequest();
  const authHeader = request?.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Sessão expirada. Entre novamente e tente de novo.");
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Error("Sessão expirada. Entre novamente e tente de novo.");
  }

  return supabase;
}

async function getKey() {
  const supabase = await getAuthenticatedSupabase();
  const { data, error } = await supabase
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

const ORIENTATIONS = ["landscape", "portrait"] as const;

export const createDisplay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(200),
        location: z.string().max(200).optional(),
        description: z.string().max(1000).optional(),
        resolution: z.string().max(20).optional(),
        orientation: z.enum(ORIENTATIONS).optional(),
        settings: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => sighor("/displays", { method: "POST", body: data }));

export const updateDisplay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().min(1),
        name: z.string().min(1).max(200).optional(),
        location: z.string().max(200).optional(),
        description: z.string().max(1000).optional(),
        resolution: z.string().max(20).optional(),
        orientation: z.enum(ORIENTATIONS).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { id, ...body } = data;
    return sighor(`/displays/${id}`, { method: "PUT", body });
  });

export const deleteDisplay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => sighor(`/displays/${data.id}`, { method: "DELETE" }));

export const linkDisplay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().min(1),
        pairing_code: z.string().regex(/^[0-9]{6}$/, "Código de 6 dígitos"),
      })
      .parse(d),
  )
  .handler(async ({ data }) =>
    sighor(`/displays/${data.id}/link`, {
      method: "POST",
      body: { pairing_code: data.pairing_code },
    }),
  );

export const listDisplayPlaylists = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => sighor(`/displays/${data.id}/playlists`));

export const assignPlaylistToDisplay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().min(1),
        playlist_id: z.string().min(1),
        priority: z.number().int().min(0).max(99).optional(),
        is_active: z.boolean().optional(),
        weekdays: z.array(z.number().int().min(0).max(6)).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { id, ...body } = data;
    return sighor(`/displays/${id}/playlists`, { method: "POST", body });
  });

export const unassignPlaylistFromDisplay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().min(1), assignment_id: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) =>
    sighor(`/displays/${data.id}/playlists/${data.assignment_id}`, { method: "DELETE" }),
  );

/* --------------------- Schedules --------------------- */

export const listSchedules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => sighor("/schedules"));
