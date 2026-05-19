import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getSettings() {
  const { data } = await supabaseAdmin
    .from("integration_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  return data;
}

async function fetchPayment(token: string, id: string) {
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.ok ? await r.json() : null;
}

async function fetchPreapproval(token: string, id: string) {
  const r = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.ok ? await r.json() : null;
}

export const Route = createFileRoute("/api/public/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const settings = await getSettings();
        if (!settings?.mp_access_token) return new Response("not configured", { status: 200 });

        if (settings.mp_webhook_secret) {
          const provided = url.searchParams.get("secret") ?? request.headers.get("x-webhook-secret");
          if (provided !== settings.mp_webhook_secret) {
            return new Response("unauthorized", { status: 401 });
          }
        }

        let body: any = {};
        try {
          body = await request.json();
        } catch {}
        const type = body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
        const dataId = body?.data?.id ?? url.searchParams.get("id") ?? url.searchParams.get("data.id");
        if (!type || !dataId) return new Response("ok");

        try {
          if (type === "payment") {
            const pay = await fetchPayment(settings.mp_access_token, String(dataId));
            const ref = pay?.external_reference;
            if (pay && ref) {
              await supabaseAdmin
                .from("orders")
                .update({
                  mp_payment_id: String(pay.id),
                  payment_status: pay.status, // approved | pending | rejected | etc
                })
                .eq("id", ref);
            }
          } else if (type === "preapproval" || type === "subscription_preapproval") {
            const pre = await fetchPreapproval(settings.mp_access_token, String(dataId));
            const ref = pre?.external_reference;
            if (pre && ref) {
              await supabaseAdmin
                .from("subscriptions")
                .update({
                  mp_status: pre.status, // authorized | pending | cancelled | paused
                  is_active: pre.status === "authorized",
                })
                .eq("id", ref);
            }
          }
        } catch (e) {
          console.error("MP webhook error", e);
        }

        return new Response("ok");
      },
      GET: async () => new Response("ok"),
    },
  },
});
