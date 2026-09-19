import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifySubscriptionCreatedByStaff } from "@/lib/push.server";

// ============================================================
// Server fns de push — chamadas do navegador (o middleware
// global attachSupabaseAuth anexa o Bearer token da sessão).
// ============================================================

/** Salva/atualiza a subscrição push deste usuário logado. */
export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        endpoint: z.string().url(),
        keys: z.object({ p256dh: z.string(), auth: z.string() }),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        keys: { p256dh: data.keys.p256dh, auth: data.keys.auth },
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Avisa o dono quando um membro da equipe cria uma assinatura na tela
 * interna. Se quem criou for o próprio dono, não notifica (evita avisar
 * a si mesmo por algo que acabou de fazer).
 */
export const notifySubscriptionCreated = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ subscriptionId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; notified: boolean }> => {
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, client_name, plan_name")
      .eq("id", data.subscriptionId)
      .maybeSingle();
    if (!sub) return { ok: true, notified: false };

    const { data: creatorOwner } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "owner")
      .maybeSingle();
    if (creatorOwner) return { ok: true, notified: false };

    const { data: creatorProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", context.userId)
      .maybeSingle();

    await notifySubscriptionCreatedByStaff({
      id: sub.id,
      clientName: sub.client_name ?? "Cliente",
      planName: sub.plan_name ?? "Plano",
      creatorName: creatorProfile?.full_name ?? "equipe",
    });
    return { ok: true, notified: true };
  });
