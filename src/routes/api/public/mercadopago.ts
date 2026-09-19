import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyPaymentReceived, notifySubscriptionActivated, notifySubscriptionPaymentReceived } from "@/lib/push.server";

async function getSettings() {
  const { data } = await supabaseAdmin
    .from("integration_settings")
    .select("mp_access_token, mp_webhook_secret")
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

/**
 * Valida a assinatura do Mercado Pago (header x-signature: ts=...,v1=...).
 * O MP assina com HMAC-SHA256 usando o webhook secret. Aceita os dois
 * formatos conhecidos de mensagem; rejeita timestamps fora de 5 minutos.
 */
function verifySignature(
  secret: string,
  dataId: string,
  tsHeader: string | null,
  v1Header: string | null,
): boolean {
  if (!tsHeader || !v1Header) return false;
  const ts = Number(tsHeader);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const candidates = [`${dataId}.${ts}`, `id:${dataId};ts:${ts}`];
  for (const message of candidates) {
    const expected = createHmac("sha256", secret).update(message).digest();
    const provided = Buffer.from(v1Header, "hex");
    if (expected.length === provided.length && timingSafeEqual(expected, provided)) {
      return true;
    }
  }
  return false;
}

/**
 * Idempotência: o MP pode reenviar o mesmo evento. event_key = type:dataId.
 * Se já foi processado, ignoramos silenciosamente.
 */
async function markProcessed(type: string, dataId: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from("mp_webhook_events").insert({
    event_key: `${type}:${dataId}`,
    type,
    data_id: dataId,
  });
  // 23505 = unique violation → já processado antes
  return !error;
}

export const Route = createFileRoute("/api/public/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const settings = await getSettings();
        if (!settings?.mp_access_token) return new Response("not configured", { status: 200 });

        // Autenticação do webhook: assinatura x-signature ou secret na URL/header.
        const querySecret = url.searchParams.get("secret");
        const headerSecret = request.headers.get("x-webhook-secret");
        if (settings.mp_webhook_secret) {
          const sigHeader = request.headers.get("x-signature") ?? "";
          const [ts, v1] = ["ts", "v1"].map((k) => {
            const m = sigHeader.match(new RegExp(`${k}=([^,;\\s]+)`));
            return m?.[1] ?? null;
          });
          const signedOk = verifySignature(
            settings.mp_webhook_secret,
            String(url.searchParams.get("data.id") ?? ""),
            ts,
            v1,
          );
          const secretOk =
            querySecret === settings.mp_webhook_secret ||
            headerSecret === settings.mp_webhook_secret;
          if (!signedOk && !secretOk) {
            return new Response("unauthorized", { status: 401 });
          }
        }

        let body: any = {};
        try {
          body = await request.json();
        } catch {}
        const type = body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
        const dataId = String(body?.data?.id ?? url.searchParams.get("id") ?? url.searchParams.get("data.id") ?? "");
        if (!type || !dataId) return new Response("ok");

        // Idempotência — evento já processado.
        if (!(await markProcessed(type, dataId))) return new Response("ok");

        try {
          if (type === "payment") {
            const pay = await fetchPayment(settings.mp_access_token, dataId);
            const ref = pay?.external_reference;
            if (pay && ref) {
              // Validação de valor: o total pago precisa bater com a comanda.
              const { data: order } = await supabaseAdmin
                .from("orders")
                .select("total_cents, client_name")
                .eq("id", ref)
                .maybeSingle();
              if (!order) {
                // PIX do 1º mês de assinatura usa external_reference "sub:<id>".
                if (ref.startsWith("sub:")) {
                  const subId = ref.slice(4);
                  const { data: sub } = await supabaseAdmin
                    .from("subscriptions")
                    .select("id, client_name, plan_name, monthly_price_cents")
                    .eq("id", subId)
                    .maybeSingle();
                  if (sub && pay.status === "approved") {
                    void notifySubscriptionPaymentReceived({
                      id: sub.id,
                      clientName: sub.client_name ?? "Cliente",
                      planName: sub.plan_name ?? "Plano",
                      amountCents: sub.monthly_price_cents,
                    }).catch((e) => console.error("[push] assinatura paga:", e));
                  }
                } else {
                  console.error("MP webhook: comanda não encontrada", ref);
                }
                return new Response("ok");
              }
              const expected = order.total_cents / 100;
              const paid = Number(pay.transaction_amount ?? 0);
              if (Math.abs(paid - expected) > 0.01) {
                console.error(
                  `MP webhook: valor divergente order=${ref} esperado=${expected} pago=${paid}`,
                );
                return new Response("ok");
              }
              await supabaseAdmin
                .from("orders")
                .update({
                  mp_payment_id: String(pay.id),
                  payment_status: pay.status, // approved | pending | rejected | etc
                })
                .eq("id", ref);

              // Notifica o dono quando o pagamento é aprovado.
              if (pay.status === "approved") {
                void notifyPaymentReceived({
                  orderId: ref,
                  clientName: order.client_name ?? "Cliente",
                  amountCents: order.total_cents,
                }).catch((e) => console.error("[push] pagamento recebido:", e));
              }
            }
          } else if (type === "preapproval" || type === "subscription_preapproval") {
            const pre = await fetchPreapproval(settings.mp_access_token, dataId);
            const ref = pre?.external_reference;
            if (pre && ref) {
              await supabaseAdmin
                .from("subscriptions")
                .update({
                  mp_status: pre.status, // authorized | pending | cancelled | paused
                  is_active: pre.status === "authorized",
                })
                .eq("id", ref);

              // Notifica o dono quando a assinatura é autorizada.
              if (pre.status === "authorized") {
                const { data: sub } = await supabaseAdmin
                  .from("subscriptions")
                  .select("id, client_name, plan_name")
                  .eq("id", ref)
                  .maybeSingle();
                if (sub) {
                  void notifySubscriptionActivated({
                    id: sub.id,
                    clientName: sub.client_name ?? "Cliente",
                    planName: sub.plan_name ?? "Plano",
                  }).catch((e) => console.error("[push] assinatura ativa:", e));
                }
              }
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
