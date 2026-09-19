#!/usr/bin/env node
// ============================================================
// Mano Elves — gera ANON_KEY e SERVICE_ROLE_KEY (JWT HS256)
// a partir do JWT_SECRET do Supabase self-hosted.
//
// Payloads oficiais do Supabase self-hosted (role + iss),
// no mesmo padrão das chaves geradas pela plataforma
// (validade de ~10 anos).
//
// Uso (Node 16+, na sua máquina):
//   node generate-jwt-keys.mjs "COLE_AQUI_O_JWT_SECRET"
// ou
//   JWT_SECRET=... node generate-jwt-keys.mjs
// ============================================================
import crypto from "node:crypto";

const secret = process.argv[2] || process.env.JWT_SECRET;
if (!secret) {
  console.error("Informe o JWT_SECRET como argumento ou na variável JWT_SECRET.");
  console.error("Ex.: node generate-jwt-keys.mjs $(openssl rand -hex 32)");
  process.exit(1);
}

const b64url = (buf) => Buffer.from(buf).toString("base64url");

function signJwt(payload, secretKey) {
  const header = { alg: "HS256", typ: "JWT" };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(signingInput)
    .digest("base64url");
  return `${signingInput}.${signature}`;
}

const now = Math.floor(Date.now() / 1000);
const inTenYears = now + 10 * 365 * 24 * 3600;

const anonKey = signJwt(
  { role: "anon", iss: "supabase", iat: now, exp: inTenYears },
  secret,
);
const serviceRoleKey = signJwt(
  { role: "service_role", iss: "supabase", iat: now, exp: inTenYears },
  secret,
);

console.log("ANON_KEY=" + anonKey);
console.log();
console.log("SERVICE_ROLE_KEY=" + serviceRoleKey);
console.log();
console.log("Cole esses valores no .env do Supabase (supabase/docker/.env).");
console.log("Use a ANON_KEY também como SUPABASE_PUBLISHABLE_KEY no .env do app.");
