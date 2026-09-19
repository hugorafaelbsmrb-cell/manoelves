// ============================================================
// Tokens de cliente — SERVER ONLY (usa "crypto" do Node).
// NUNCA importar este arquivo a partir de código executado no
// navegador: o Vite não consegue empacotar "crypto" no client.
// Tokens assinados com HMAC-SHA256 (segredo = service role key).
// ============================================================
import { createHash, createHmac, randomInt, timingSafeEqual } from "crypto";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function getSecret() {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Servidor sem configuração de segredo.");
  return s;
}

export function hashCode(phone: string, code: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export function hashEqualsHex(aHex: string, bHex: string) {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
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

export function signToken(phone: string) {
  const payload = { phone, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(token: string): { phone: string } {
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
