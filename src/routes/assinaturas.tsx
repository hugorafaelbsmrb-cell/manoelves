import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/assinaturas")({
  ssr: false,
  head: () => ({ meta: [{ title: "Assinaturas — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

function Page() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    client_name: "",
    client_whatsapp: "",
    plan_name: "Plano Mensal",
    monthly_price_cents: 8990,
    credits: 4,
  });

  const { data: subs } = useQuery({
    queryKey: ["subs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function create() {
    if (!form.client_name || !form.client_whatsapp) {
      toast.error("Preencha nome e WhatsApp");
      return;
    }
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    const { error } = await supabase.from("subscriptions").insert({
      client_name: form.client_name,
      client_whatsapp: form.client_whatsapp,
      plan_name: form.plan_name,
      monthly_price_cents: form.monthly_price_cents,
      credits_remaining: form.credits,
      next_charge_at: next.toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Assinatura criada (Pix recorrente simulado)");
    setForm({ ...form, client_name: "", client_whatsapp: "" });
    qc.invalidateQueries({ queryKey: ["subs"] });
  }

  async function recharge(id: string, credits: number) {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    await supabase
      .from("subscriptions")
      .update({ credits_remaining: credits + 4, next_charge_at: next.toISOString() })
      .eq("id", id);
    toast.success("Cobrança simulada · créditos renovados");
    qc.invalidateQueries({ queryKey: ["subs"] });
  }

  async function cancel(id: string) {
    await supabase.from("subscriptions").update({ is_active: false }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["subs"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Assinaturas</h1>
        <p className="text-sm text-muted-foreground">
          Planos recorrentes com Pix automático (simulado) e créditos mensais.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova assinatura</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-5">
          <Input
            placeholder="Nome do cliente"
            value={form.client_name}
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
          />
          <Input
            placeholder="WhatsApp"
            value={form.client_whatsapp}
            onChange={(e) => setForm({ ...form, client_whatsapp: e.target.value })}
          />
          <Input
            placeholder="Plano"
            value={form.plan_name}
            onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Preço (centavos)"
            value={form.monthly_price_cents}
            onChange={(e) =>
              setForm({ ...form, monthly_price_cents: Number(e.target.value) })
            }
          />
          <Button onClick={create}>Criar</Button>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {subs?.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <div className="font-medium">{s.client_name}</div>
                <div className="text-xs text-muted-foreground">
                  {s.plan_name} · {brl(s.monthly_price_cents)}/mês ·{" "}
                  {s.credits_remaining} créditos · próx.{" "}
                  {new Date(s.next_charge_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => recharge(s.id, s.credits_remaining)}
                >
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> Cobrar agora
                </Button>
                <Button size="sm" variant="ghost" onClick={() => cancel(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!subs?.length && (
          <p className="text-sm text-muted-foreground">Nenhuma assinatura ativa.</p>
        )}
      </div>
    </div>
  );
}
