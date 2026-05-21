import { supabase } from "@/integrations/supabase/client";

export interface KnownClient {
  name: string;
  phone: string;
  last_at: string;
}

/**
 * Lista clientes únicos (por WhatsApp) a partir do histórico de agendamentos.
 * Mais recente primeiro. Retorna até `limit` registros.
 */
export async function loadKnownClients(limit = 200): Promise<KnownClient[]> {
  const { data } = await supabase
    .from("appointments")
    .select("client_name, client_whatsapp, created_at")
    .order("created_at", { ascending: false })
    .limit(1500);

  const map = new Map<string, KnownClient>();
  for (const row of data ?? []) {
    const phone = (row.client_whatsapp ?? "").trim();
    if (!phone) continue;
    if (map.has(phone)) continue;
    map.set(phone, {
      name: row.client_name ?? "",
      phone,
      last_at: row.created_at,
    });
    if (map.size >= limit) break;
  }
  return Array.from(map.values());
}

export function filterClients(list: KnownClient[], q: string): KnownClient[] {
  const term = q.trim().toLowerCase();
  if (!term) return list.slice(0, 20);
  const digits = term.replace(/\D+/g, "");
  return list
    .filter((c) => {
      const nameHit = c.name.toLowerCase().includes(term);
      const phoneHit = digits.length > 0 && c.phone.replace(/\D+/g, "").includes(digits);
      return nameHit || phoneHit;
    })
    .slice(0, 30);
}
