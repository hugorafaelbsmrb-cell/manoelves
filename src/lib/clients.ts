import { supabase } from "@/integrations/supabase/client";

export interface KnownClient {
  id?: string;
  name: string;
  phone: string;
  email?: string | null;
  birthday?: string | null;
  last_at: string;
}

function normalizePhone(raw: string | null | undefined) {
  return (raw ?? "").replace(/\D+/g, "");
}

/**
 * Lista clientes cadastrados (tabela clients) + fallback do histórico de
 * agendamentos para clientes legados ainda não migrados.
 */
export async function loadKnownClients(limit = 500): Promise<KnownClient[]> {
  const map = new Map<string, KnownClient>();

  // 1) clientes cadastrados (fonte primária)
  const { data: registered } = await supabase
    .from("clients")
    .select("id, name, whatsapp, email, birthday, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  for (const c of registered ?? []) {
    const key = normalizePhone(c.whatsapp);
    if (!key) continue;
    map.set(key, {
      id: c.id,
      name: c.name ?? "",
      phone: c.whatsapp ?? "",
      email: c.email,
      birthday: c.birthday,
      last_at: c.updated_at ?? c.created_at ?? new Date().toISOString(),
    });
  }

  // 2) legado vindo de appointments
  const { data: appts } = await supabase
    .from("appointments")
    .select("client_name, client_whatsapp, created_at")
    .order("created_at", { ascending: false })
    .limit(1500);

  for (const row of appts ?? []) {
    const key = normalizePhone(row.client_whatsapp);
    if (!key || map.has(key)) continue;
    map.set(key, {
      name: row.client_name ?? "",
      phone: row.client_whatsapp ?? "",
      last_at: row.created_at,
    });
    if (map.size >= limit + 200) break;
  }

  return Array.from(map.values());
}

export function filterClients(list: KnownClient[], q: string): KnownClient[] {
  const term = q.trim().toLowerCase();
  if (!term) return list.slice(0, 30);
  const digits = term.replace(/\D+/g, "");
  return list
    .filter((c) => {
      const nameHit = c.name.toLowerCase().includes(term);
      const phoneHit = digits.length > 0 && c.phone.replace(/\D+/g, "").includes(digits);
      return nameHit || phoneHit;
    })
    .slice(0, 40);
}

/**
 * Cria ou atualiza um cliente pelo whatsapp. Idempotente — usado após
 * agendamentos públicos, comandas e wizard manual.
 */
export async function upsertClient(input: {
  name: string;
  whatsapp: string;
  email?: string | null;
  birthday?: string | null;
}): Promise<string | null> {
  const whats = (input.whatsapp ?? "").trim();
  if (!whats || !input.name?.trim()) return null;
  const payload = {
    name: input.name.trim(),
    whatsapp: whats,
    email: input.email ?? null,
    birthday: input.birthday ?? null,
  };
  const { data, error } = await supabase
    .from("clients")
    .upsert(payload, { onConflict: "whatsapp" })
    .select("id")
    .maybeSingle();
  if (error) {
    console.warn("upsertClient:", error.message);
    return null;
  }
  return data?.id ?? null;
}
