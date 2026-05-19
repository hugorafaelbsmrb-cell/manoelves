import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/reengajamento")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reengajamento — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

type Row = {
  client_name: string;
  client_whatsapp: string;
  barber_id: string;
  last_at: string;
  days: number;
};

function Page() {
  const { user, isOwner } = useAuth();
  const qc = useQueryClient();

  const { data: appts } = useQuery({
    queryKey: ["reeng-appts", user?.id, isOwner],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("appointments")
        .select("client_name, client_whatsapp, barber_id, start_at")
        .order("start_at", { ascending: false })
        .limit(1000);
      if (!isOwner) q = q.eq("barber_id", user!.id);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: barbers } = useQuery({
    queryKey: ["reeng-barbers"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, slug");
      return data ?? [];
    },
  });

  const rows: Row[] = useMemo(() => {
    if (!appts) return [];
    const map = new Map<string, Row>();
    for (const a of appts) {
      const key = `${a.client_whatsapp}|${a.barber_id}`;
      const existing = map.get(key);
      if (!existing || new Date(a.start_at) > new Date(existing.last_at)) {
        map.set(key, {
          client_name: a.client_name,
          client_whatsapp: a.client_whatsapp,
          barber_id: a.barber_id,
          last_at: a.start_at,
          days: Math.floor(
            (Date.now() - new Date(a.start_at).getTime()) / 86400000
          ),
        });
      }
    }
    return [...map.values()]
      .filter((r) => r.days >= 45)
      .sort((a, b) => b.days - a.days);
  }, [appts]);

  const barberOf = (id: string) => barbers?.find((b) => b.id === id);

  async function send(r: Row) {
    const b = barberOf(r.barber_id);
    const link = b?.slug ? `${location.origin}/${b.slug}` : `${location.origin}/`;
    const text = `Olá ${r.client_name}, o ${b?.full_name ?? "seu barbeiro"} está com saudades! Faz ${r.days} dias que você não cuida do visual. Toque aqui para garantir seu horário: ${link}`;
    await supabase.from("messages_log").insert({
      kind: "reengagement",
      to_name: r.client_name,
      to_phone: r.client_whatsapp,
      payload: text,
    });
    toast.success(`Mensagem simulada enviada para ${r.client_name}`);
    qc.invalidateQueries({ queryKey: ["reeng-log"] });
  }

  const { data: log } = useQuery({
    queryKey: ["reeng-log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages_log")
        .select("id, to_name, to_phone, payload, created_at")
        .eq("kind", "reengagement")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Reengajamento</h1>
        <p className="text-sm text-muted-foreground">
          Clientes ausentes há 45 dias ou mais. Dispare a mensagem de saudade.
        </p>
      </div>

      <div className="grid gap-3">
        {rows.map((r) => (
          <Card key={`${r.client_whatsapp}-${r.barber_id}`}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <div className="font-medium">{r.client_name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.client_whatsapp} · {barberOf(r.barber_id)?.full_name} ·{" "}
                  <span className="text-foreground">{r.days} dias</span> sem voltar
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => send(r)}>
                <MessageCircle className="mr-1 h-3.5 w-3.5" /> Enviar WhatsApp
              </Button>
            </CardContent>
          </Card>
        ))}
        {!rows.length && (
          <p className="text-sm text-muted-foreground">
            Ninguém precisa de reengajamento agora. 🎉
          </p>
        )}
      </div>

      {!!log?.length && (
        <div>
          <h2 className="mb-2 font-display text-xl tracking-wide">Histórico</h2>
          <div className="space-y-2">
            {log.map((m) => (
              <Card key={m.id}>
                <CardContent className="py-3 text-xs">
                  <div className="font-medium">
                    {m.to_name} · {m.to_phone}
                  </div>
                  <div className="text-muted-foreground">{m.payload}</div>
                  <div className="text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("pt-BR")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
