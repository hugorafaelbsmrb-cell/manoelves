import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SIGHOR_BASE = "https://bbblepjlvjtuatqdiwla.supabase.co/functions/v1/api";

async function getKey(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("integration_settings")
    .select("sighor_api_key")
    .limit(1)
    .maybeSingle();
  return (data as { sighor_api_key?: string } | null)?.sighor_api_key ?? null;
}

export const Route = createFileRoute("/api/public/signage/playlist/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        if (!/^[0-9a-f-]{8,}$/i.test(id)) {
          return new Response("Invalid id", { status: 400 });
        }
        const key = await getKey();
        if (!key) {
          return new Response(
            JSON.stringify({ error: "sighor_not_configured" }),
            { status: 503, headers: { "content-type": "application/json" } },
          );
        }
        const [pl, items] = await Promise.all([
          fetch(`${SIGHOR_BASE}/playlists/${id}`, { headers: { "X-API-Key": key } }),
          fetch(`${SIGHOR_BASE}/playlists/${id}/items`, { headers: { "X-API-Key": key } }),
        ]);
        if (!items.ok) {
          return new Response(
            JSON.stringify({ error: "sighor_error", status: items.status }),
            { status: 502, headers: { "content-type": "application/json" } },
          );
        }
        const playlist = pl.ok ? await pl.json() : null;
        const itemsJson = await items.json();
        return new Response(
          JSON.stringify({ playlist, items: itemsJson }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "public, max-age=20",
            },
          },
        );
      },
    },
  },
});
