import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageCircle, Trash2 } from "lucide-react";

export const Route = createFileRoute("/fila-espera")({
  ssr: false,
  head: () => ({ meta: [{ title: "Fila de espera — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

function Page() {
  const { user, isOwner } = useAuth();
  const qc = useQueryClient();

  const { data: items } = useQuery({
    queryKey: ["waitlist", user?.id, isOwner],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("waitlist")
        .select("id, client_name, client_whatsapp, preferred_period, created_at, notified_at, barber_id")
        .order("created_at", { ascending: false });
      if (!isOwner) q = q.eq("barber_id", user!.id);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: barbers } = useQuery({
    queryKey: ["wl-barbers"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      return data ?? [];
    },
  });

  async function notify(id: string, name: string, phone: string) {
    await supabase
      .from("waitlist")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", id);
    await supabase.from("messages_log").insert({
      kind: "waitlist",
      to_name: name,
      to_phone: phone,
      payload: `Olá ${name}! Acabou de vagar um horário aqui na Mano Elves. Quer garantir? Toque aqui para agendar.`,
    });
    toast.success("WhatsApp simulado enviado");
    qc.invalidateQueries({ queryKey: ["waitlist"] });
  }

  async function remove(id: string) {
    await supabase.from("waitlist").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["waitlist"] });
  }

  const barberName = (id: string) =>
    barbers?.find((b) => b.id === id)?.full_name ?? "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Fila de espera</h1>
        <p className="text-sm text-muted-foreground">
          Quando uma cadeira vagar, dispare a oferta para reocupar.
        </p>
      </div>

      <div className="grid gap-3">
        {items?.map((w) => (
          <Card key={w.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <div className="font-medium">{w.client_name}</div>
                <div className="text-xs text-muted-foreground">
                  {w.client_whatsapp} · com {barberName(w.barber_id)}
                  {w.preferred_period ? ` · ${w.preferred_period}` : ""}
                  {w.notified_at
                    ? ` · notificado em ${new Date(w.notified_at).toLocaleString("pt-BR")}`
                    : ""}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => notify(w.id, w.client_name, w.client_whatsapp)}
                >
                  <MessageCircle className="mr-1 h-3.5 w-3.5" /> Oferecer vaga
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(w.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!items?.length && (
          <p className="text-sm text-muted-foreground">Fila vazia.</p>
        )}
      </div>
    </div>
  );
}
