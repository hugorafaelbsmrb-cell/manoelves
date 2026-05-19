import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getSettings() {
  const { data, error } = await supabaseAdmin
    .from("integration_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.mp_access_token) throw new Error("Mercado Pago não configurado");
  return data;
}

async function getOrigin() {
  const url = process.env.VITE_APP_URL || process.env.APP_URL || "";
  return url;
}

/** Cria preferência de checkout para uma comanda (Pix/cartão). */
export const createOrderCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const settings = await getSettings();

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Comanda não encontrada");

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", data.orderId);

    const origin = await getOrigin();

    const body = {
      items: (items ?? []).map((i) => ({
        title: i.description,
        quantity: i.qty,
        unit_price: Number((i.unit_price_cents / 100).toFixed(2)),
        currency_id: "BRL",
      })),
      payer: { name: order.client_name },
      external_reference: order.id,
      notification_url: origin
        ? `${origin}/api/public/mercadopago?secret=${settings.mp_webhook_secret ?? ""}`
        : undefined,
      back_urls: origin
        ? {
            success: `${origin}/comanda?paid=1`,
            failure: `${origin}/comanda?paid=0`,
            pending: `${origin}/comanda?paid=pending`,
          }
        : undefined,
      auto_return: "approved",
    };

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.mp_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      id?: string;
      init_point?: string;
      message?: string;
    };
    if (!res.ok || !json.init_point) {
      throw new Error(`Mercado Pago: ${json.message ?? "falha ao criar preferência"}`);
    }

    await supabaseAdmin
      .from("orders")
      .update({
        mp_preference_id: json.id,
        mp_init_point: json.init_point,
        payment_status: "pending",
      })
      .eq("id", order.id);

    return { init_point: json.init_point, preference_id: json.id };
  });

/** Cria assinatura recorrente (preapproval) no Mercado Pago. */
export const createSubscriptionPreapproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subscriptionId: string; payerEmail: string }) =>
    z
      .object({
        subscriptionId: z.string().uuid(),
        payerEmail: z.string().email(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const settings = await getSettings();

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("id", data.subscriptionId)
      .maybeSingle();
    if (!sub) throw new Error("Assinatura não encontrada");

    const origin = await getOrigin();

    const body = {
      reason: sub.plan_name,
      external_reference: sub.id,
      payer_email: data.payerEmail,
      back_url: origin ? `${origin}/assinaturas?ok=1` : "https://www.mercadopago.com.br",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: Number((sub.monthly_price_cents / 100).toFixed(2)),
        currency_id: "BRL",
      },
    };

    const res = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.mp_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      id?: string;
      init_point?: string;
      message?: string;
    };
    if (!res.ok || !json.init_point) {
      throw new Error(`Mercado Pago: ${json.message ?? "falha ao criar assinatura"}`);
    }

    await supabaseAdmin
      .from("subscriptions")
      .update({
        mp_preapproval_id: json.id,
        mp_init_point: json.init_point,
        mp_status: "pending",
      })
      .eq("id", sub.id);

    return { init_point: json.init_point, preapproval_id: json.id };
  });
