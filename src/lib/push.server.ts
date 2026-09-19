import webpush from "web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============================================================
// Push web (VAPID) — SERVER ONLY (.server.ts): nunca entra no
// bundle do navegador. Envia notificações para os navegadores
// que salvaram subscrição na tabela push_subscriptions.
// ============================================================

const VAPID_SUBJECT = "mailto:contato@manoelves.vhex.app";

let vapidReady = false;
function ensureVapid(): boolean {
  if (vapidReady) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    console.error("[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ausentes no ambiente");
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, pub, priv);
  vapidReady = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

type SubRow = {
  id: string;
  user_id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<number> {
  if (!ensureVapid()) return 0;
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return 0;

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, keys, user_id")
    .in("user_id", unique);
  if (!subs || subs.length === 0) return 0;

  console.log(`[push] enviando "${payload.title}" para ${subs.length} dispositivo(s)`);

  let sent = 0;
  for (const sub of subs as unknown as SubRow[]) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url ?? "/",
          tag: payload.tag,
        }),
        { TTL: 3600 },
      );
      sent++;
      await supabaseAdmin
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", sub.id);
    } catch (e) {
      const err = e as { statusCode?: number; message?: string };
      // 404/410 = subscrição expirada/inválida → remove do banco.
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        console.error("[push] falha ao enviar:", err.statusCode ?? err.message ?? e);
      }
    }
  }
  return sent;
}

export async function sendPushToRole(
  role: "owner" | "barber",
  payload: PushPayload,
): Promise<number> {
  const { data: rows } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", role);
  return sendPushToUsers(
    (rows ?? []).map((r) => r.user_id),
    payload,
  );
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// ---------- gatilhos de negócio ----------

/** Novo agendamento → barbeiro responsável + dono(s). */
export async function notifyNewAppointment(a: {
  id: string;
  clientName: string;
  startAt: string;
  barberId: string;
  pendingPayment: boolean;
}): Promise<void> {
  const { data: owners } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "owner");
  const targets = [a.barberId, ...(owners ?? []).map((o) => o.user_id)];
  await sendPushToUsers(targets, {
    title: "Novo agendamento",
    body: `${a.clientName} — ${fmtDateTime(a.startAt)}${a.pendingPayment ? " (aguardando PIX)" : ""}`,
    url: "/agenda",
    tag: `appt-${a.id}`,
  });
}

/** Sinal PIX do agendamento confirmado → barbeiro + dono. */
export async function notifyAppointmentPaymentConfirmed(a: {
  id: string;
  clientName: string;
  startAt: string;
  barberId: string;
}): Promise<void> {
  const { data: owners } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "owner");
  const targets = [a.barberId, ...(owners ?? []).map((o) => o.user_id)];
  await sendPushToUsers(targets, {
    title: "Sinal PIX confirmado",
    body: `${a.clientName} — ${fmtDateTime(a.startAt)}`,
    url: "/agenda",
    tag: `appt-paid-${a.id}`,
  });
}

/** Pagamento de comanda aprovado (webhook MP) → dono. */
export async function notifyPaymentReceived(p: {
  orderId: string;
  clientName: string;
  amountCents: number;
}): Promise<void> {
  const brl = (p.amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  await sendPushToRole("owner", {
    title: "Pagamento recebido",
    body: `${brl} · ${p.clientName}`,
    url: "/comanda",
    tag: `order-paid-${p.orderId}`,
  });
}

/** PIX do 1º mês de assinatura aprovado (webhook MP) → dono. */
export async function notifySubscriptionPaymentReceived(s: {
  id: string;
  clientName: string;
  planName: string;
  amountCents: number;
}): Promise<void> {
  const brl = (s.amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  await sendPushToRole("owner", {
    title: "Assinatura paga (1º mês)",
    body: `${brl} · ${s.clientName} · ${s.planName}`,
    url: "/assinaturas",
    tag: `sub-paid-${s.id}`,
  });
}

/** Assinatura ativada no MP (preapproval authorized) → dono. */
export async function notifySubscriptionActivated(s: {
  id: string;
  clientName: string;
  planName: string;
}): Promise<void> {
  await sendPushToRole("owner", {
    title: "Nova assinatura ativa",
    body: `${s.clientName} · ${s.planName}`,
    url: "/assinaturas",
    tag: `sub-${s.id}`,
  });
}

/** Assinatura criada pela equipe (barbeiro) na tela interna → dono. */
export async function notifySubscriptionCreatedByStaff(s: {
  id: string;
  clientName: string;
  planName: string;
  creatorName: string;
}): Promise<void> {
  await sendPushToRole("owner", {
    title: "Nova assinatura criada",
    body: `${s.clientName} · ${s.planName} (por ${s.creatorName})`,
    url: "/assinaturas",
    tag: `sub-created-${s.id}`,
  });
}
