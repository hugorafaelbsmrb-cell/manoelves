import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, createHmac, randomInt, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizePhone } from "@/lib/phone";

// ---------- uazapi mínimo (server-only) ----------
async function getUazapi() {
  const { data, error } = await supabaseAdmin
    .from("integration_settings")
    .select("uazapi_url, uazapi_token")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const url = data?.uazapi_url?.trim();
  const token = data?.uazapi_token?.trim();
  if (!url || !token) throw new Error("WhatsApp não configurado pelo lojista.");
  return { base: url.replace(/\/+$/, ""), token };
}

async function sendWhatsAppText(number: string, text: string) {
  const { base, token } = await getUazapi();
  const res = await fetch(base + "/send/text", {
    method: "POST",
    headers: { token, "Content-Type": "application/json" },
    body: JSON.stringify({ number, text }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Falha ao enviar WhatsApp: ${res.status} ${t}`);
  }
}

// ---------- Hash + Token ----------
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function getSecret() {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Servidor sem configuração de segredo.");
  return s;
}

function hashCode(phone: string, code: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

function b64url(buf: Buffer | string) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
function fromB64url(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

function signToken(phone: string) {
  const payload = { phone, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

function verifyToken(token: string): { phone: string } {
  const [body, sig] = token.split(".");
  if (!body || !sig) throw new Error("Token inválido.");
  const expected = b64url(createHmac("sha256", getSecret()).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Token inválido.");
  const payload = JSON.parse(fromB64url(body).toString("utf8")) as {
    phone: string;
    exp: number;
  };
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Sessão expirada.");
  return { phone: payload.phone };
}

// ---------- requestClientOtp ----------
// Código válido por 48h. Se já existir um código não expirado para o telefone,
// não reenviamos a mensagem (economia de envios via API).
const OTP_TTL_MS = 48 * 60 * 60 * 1000;

export const requestClientOtp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ phone: z.string().min(8).max(20) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true; reused: boolean }> => {
    const phone = normalizePhone(data.phone);
    if (phone.length < 12) throw new Error("Número de telefone inválido.");

    // Reaproveita código válido existente — não reenvia mensagem.
    const { data: existing } = await supabaseAdmin
      .from("client_otp_codes")
      .select("expires_at")
      .eq("phone", phone)
      .maybeSingle();
    if (existing && new Date(existing.expires_at).getTime() > Date.now()) {
      return { ok: true, reused: true };
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const code_hash = hashCode(phone, code);
    const expires_at = new Date(Date.now() + OTP_TTL_MS).toISOString();

    const { error } = await supabaseAdmin
      .from("client_otp_codes")
      .upsert(
        { phone, code_hash, expires_at, attempts: 0, created_at: new Date().toISOString() },
        { onConflict: "phone" },
      );
    if (error) throw new Error(error.message);

    const { data: shop } = await supabaseAdmin
      .from("barbershop")
      .select("name")
      .limit(1)
      .maybeSingle();
    const shopName = shop?.name ?? "a barbearia";
    const text =
      `Seu código de acesso na *${shopName}*: *${code}*\n` +
      `Válido por 48 horas. Se não foi você, ignore esta mensagem.`;

    await sendWhatsAppText(phone, text);
    return { ok: true, reused: false };
  });

// ---------- verifyClientOtp ----------
export const verifyClientOtp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        phone: z.string().min(8).max(20),
        code: z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos"),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true; token: string }> => {
    const phone = normalizePhone(data.phone);
    const { data: row, error } = await supabaseAdmin
      .from("client_otp_codes")
      .select("code_hash, expires_at, attempts")
      .eq("phone", phone)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Código não encontrado. Solicite um novo.");
    if (row.attempts >= 5) {
      await supabaseAdmin.from("client_otp_codes").delete().eq("phone", phone);
      throw new Error("Tentativas excedidas. Solicite um novo código.");
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("Código expirado. Solicite um novo.");
    }

    const incoming = hashCode(phone, data.code);
    const a = Buffer.from(incoming, "hex");
    const b = Buffer.from(row.code_hash, "hex");
    const ok = a.length === b.length && timingSafeEqual(a, b);

    if (!ok) {
      await supabaseAdmin
        .from("client_otp_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("phone", phone);
      throw new Error("Código incorreto.");
    }

    // Mantém o código válido até expirar (48h) — apenas zera as tentativas.
    await supabaseAdmin
      .from("client_otp_codes")
      .update({ attempts: 0 })
      .eq("phone", phone);
    return { ok: true, token: signToken(phone) };
  });

// ---------- getClientPortalData ----------
type PortalAppointment = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  total_cents: number;
  barber_id: string;
  barber_name: string | null;
  barber_slug: string | null;
  services: { name: string }[];
};

export const getClientPortalData = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    const { phone } = verifyToken(data.token);

    const [apptsRes, subsRes, productsRes] = await Promise.all([
      supabaseAdmin
        .from("appointments")
        .select(
          "id, start_at, end_at, status, total_cents, barber_id, client_name, appointment_items(service_id, services(name))",
        )
        .eq("client_whatsapp", phone)
        .order("start_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("subscriptions")
        .select(
          "id, plan_name, monthly_price_cents, credits_remaining, next_charge_at, is_active, mp_status",
        )
        .eq("client_whatsapp", phone)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("products")
        .select("id, name, price_cents, image_url")
        .eq("is_active", true)
        .eq("is_internal_use", false)
        .order("name"),
    ]);

    if (apptsRes.error) throw new Error(apptsRes.error.message);
    if (subsRes.error) throw new Error(subsRes.error.message);
    if (productsRes.error) throw new Error(productsRes.error.message);

    const barberIds = Array.from(
      new Set((apptsRes.data ?? []).map((a) => a.barber_id)),
    );
    const { data: barbers } = barberIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, full_name, slug")
          .in("id", barberIds)
      : { data: [] as { id: string; full_name: string; slug: string | null }[] };
    const byBarber = new Map((barbers ?? []).map((b) => [b.id, b]));

    const appointments: PortalAppointment[] = (apptsRes.data ?? []).map((a) => {
      const b = byBarber.get(a.barber_id);
      type Item = { services: { name: string } | { name: string }[] | null };
      const items = (a.appointment_items ?? []) as Item[];
      return {
        id: a.id,
        start_at: a.start_at,
        end_at: a.end_at,
        status: a.status,
        total_cents: a.total_cents,
        barber_id: a.barber_id,
        barber_name: b?.full_name ?? null,
        barber_slug: b?.slug ?? null,
        services: items
          .flatMap((it) =>
            Array.isArray(it.services) ? it.services : it.services ? [it.services] : [],
          )
          .map((s) => ({ name: s.name })),
      };
    });

    const clientName =
      (apptsRes.data ?? []).find((a) => a.client_name)?.client_name ?? null;

    return {
      phone,
      clientName,
      appointments,
      subscriptions: subsRes.data ?? [],
      products: productsRes.data ?? [],
    };
  });

// ---------- cancelClientAppointment ----------
export const cancelClientAppointment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ token: z.string().min(10), appointmentId: z.string().uuid() })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { phone } = verifyToken(data.token);
    const { data: appt, error } = await supabaseAdmin
      .from("appointments")
      .select("id, client_whatsapp, start_at, status")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!appt) throw new Error("Agendamento não encontrado.");
    if (normalizePhone(appt.client_whatsapp) !== phone) {
      throw new Error("Agendamento não pertence a este cliente.");
    }
    if (new Date(appt.start_at).getTime() < Date.now()) {
      throw new Error("Não é possível cancelar horários passados.");
    }
    if (appt.status === "cancelled") return { ok: true };

    const { error: upErr } = await supabaseAdmin
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", data.appointmentId);
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });
