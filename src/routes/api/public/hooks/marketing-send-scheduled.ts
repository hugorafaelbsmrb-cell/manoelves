import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { dispatchScheduledCampaigns } from "@/lib/marketing.functions";

/**
 * Cron (pg_cron, a cada 5 min) — dispara campanhas agendadas vencidas
 * e processa a próxima leva de envios das campanhas em andamento.
 * Protegido por secret (mesmo padrão do birthday-notify):
 *  - Exige ?secret=<internal_hooks_secret> ou header x-webhook-secret.
 */
export const Route = createFileRoute("/api/public/hooks/marketing-send-scheduled")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const { data: settings } = await supabaseAdmin
          .from("integration_settings")
          .select("internal_hooks_secret")
          .limit(1)
          .maybeSingle();

        if (settings?.internal_hooks_secret) {
          const provided =
            url.searchParams.get("secret") ??
            request.headers.get("x-webhook-secret");
          if (provided !== settings.internal_hooks_secret) {
            return new Response("unauthorized", { status: 401 });
          }
        }

        try {
          const res = await dispatchScheduledCampaigns();
          return Response.json({ ok: true, ...res });
        } catch (e) {
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "erro" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
