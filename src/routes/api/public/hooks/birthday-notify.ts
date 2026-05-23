import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function normalizeNumber(raw: string) {
  const digits = (raw ?? "").replace(/\D+/g, "");
  if (!digits) return digits;
  if (digits.length <= 11) return "55" + digits;
  return digits;
}

function applyTemplate(
  tmpl: string,
  vars: { nome: string; desconto: number },
): string {
  return tmpl
    .replaceAll("{nome}", vars.nome)
    .replaceAll("{desconto}", String(Math.round(vars.desconto)));
}

/**
 * Cron diário — envia mensagem de aniversário antecipada via uazapi.
 * Chamado por pg_cron uma vez por dia. Não exige header de auth, mas:
 *  - Valida que o envio ainda não foi feito no ano corrente (tabela de log).
 *  - Roda só se birthday_notifications_enabled = true.
 */
export const Route = createFileRoute("/api/public/hooks/birthday-notify")({
  server: {
    handlers: {
      POST: async () => {
        const { data: settings, error: sErr } = await supabaseAdmin
          .from("integration_settings")
          .select(
            "uazapi_url, uazapi_token, birthday_days_before, birthday_discount_pct, birthday_message_template, birthday_notifications_enabled",
          )
          .limit(1)
          .maybeSingle();
        if (sErr) {
          return new Response(JSON.stringify({ error: sErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (!settings || !settings.birthday_notifications_enabled) {
          return Response.json({ ok: true, skipped: "disabled" });
        }
        const base = (settings.uazapi_url ?? "").replace(/\/+$/, "");
        const token = settings.uazapi_token ?? "";
        if (!base || !token) {
          return Response.json({ ok: true, skipped: "uazapi-not-configured" });
        }

        const daysBefore = settings.birthday_days_before ?? 7;
        const discountPct = Number(settings.birthday_discount_pct ?? 15);
        const template = settings.birthday_message_template ?? "";
        const year = new Date().getUTCFullYear();

        // Pega todos os clientes com aniversário cadastrado e ainda não notificados este ano.
        const { data: clients, error: cErr } = await supabaseAdmin
          .from("clients")
          .select("id, name, whatsapp, birthday");
        if (cErr) {
          return new Response(JSON.stringify({ error: cErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: alreadySent } = await supabaseAdmin
          .from("birthday_notifications_log")
          .select("client_id")
          .eq("sent_for_year", year);
        const sentSet = new Set((alreadySent ?? []).map((r) => r.client_id));

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        let sent = 0;
        let failed = 0;
        const results: Array<{ id: string; status: string }> = [];

        for (const c of clients ?? []) {
          if (!c.birthday || !c.whatsapp || sentSet.has(c.id)) continue;
          // Calcula a próxima data do aniversário (mesmo mês/dia, ano corrente).
          const [, m, d] = c.birthday.split("-").map(Number);
          if (!m || !d) continue;
          const nextBday = new Date(Date.UTC(year, m - 1, d));
          if (nextBday < today) nextBday.setUTCFullYear(year + 1);
          const diffDays = Math.floor(
            (nextBday.getTime() - today.getTime()) / 86_400_000,
          );
          if (diffDays !== daysBefore) continue;

          const firstName = (c.name ?? "").split(" ")[0] || "tudo bem";
          const text = applyTemplate(template, {
            nome: firstName,
            desconto: discountPct,
          });
          const number = normalizeNumber(c.whatsapp);

          try {
            const res = await fetch(`${base}/send/text`, {
              method: "POST",
              headers: { token, "Content-Type": "application/json" },
              body: JSON.stringify({ number, text }),
            });
            if (!res.ok) throw new Error(`uazapi ${res.status}`);
            await supabaseAdmin.from("birthday_notifications_log").insert({
              client_id: c.id,
              sent_for_year: year,
            });
            await supabaseAdmin.from("messages_log").insert({
              kind: "confirmation",
              to_phone: number,
              to_name: c.name,
              payload: `[ANIVERSÁRIO] ${text}`,
            });
            sent++;
            results.push({ id: c.id, status: "sent" });
          } catch (e) {
            failed++;
            results.push({
              id: c.id,
              status: e instanceof Error ? e.message : "error",
            });
          }
        }

        return Response.json({ ok: true, sent, failed, results });
      },
    },
  },
});
