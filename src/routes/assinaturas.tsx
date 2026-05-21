import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { brl } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, RefreshCw, ExternalLink, Pencil } from "lucide-react";
import { createSubscriptionPreapproval } from "@/lib/payments.functions";

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
  const { isOwner } = useAuth();
  const [form, setForm] = useState({
    client_name: "",
    client_whatsapp: "",
    plan_id: "",
  });

  const { data: plans } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("monthly_price_cents");
      return data ?? [];
    },
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
    const plan = plans?.find((p) => p.id === form.plan_id);
    if (!plan) {
      toast.error("Selecione um plano");
      return;
    }
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    const { error } = await supabase.from("subscriptions").insert({
      client_name: form.client_name,
      client_whatsapp: form.client_whatsapp,
      plan_name: plan.name,
      monthly_price_cents: plan.monthly_price_cents,
      credits_remaining: plan.credits,
      next_charge_at: next.toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Assinatura criada");
    setForm({ client_name: "", client_whatsapp: "", plan_id: "" });
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

  const preapprovalFn = useServerFn(createSubscriptionPreapproval);
  async function generateMPLink(id: string) {
    const email = window.prompt("E-mail do cliente para Mercado Pago:");
    if (!email) return;
    try {
      const r = await preapprovalFn({ data: { subscriptionId: id, payerEmail: email } });
      window.open(r.init_point, "_blank");
      toast.success("Link de assinatura gerado");
      qc.invalidateQueries({ queryKey: ["subs"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Assinaturas</h1>
        <p className="text-sm text-muted-foreground">
          Planos recorrentes com Pix automático e créditos mensais.
        </p>
      </div>

      {isOwner && <PlansManager />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova assinatura</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
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
          <Select
            value={form.plan_id}
            onValueChange={(v) => setForm({ ...form, plan_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um plano" />
            </SelectTrigger>
            <SelectContent>
              {(plans ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} · {brl(p.monthly_price_cents)} · {p.credits} créditos
                </SelectItem>
              ))}
              {!plans?.length && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Nenhum plano cadastrado.
                </div>
              )}
            </SelectContent>
          </Select>
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
                  variant="secondary"
                  onClick={() => generateMPLink(s.id)}
                >
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                  {s.mp_init_point ? "Reabrir link MP" : "Gerar link MP"}
                </Button>
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

function PlansManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    monthly_price_cents: 8990,
    credits: 4,
    description: "",
  });

  const { data: plans } = useQuery({
    queryKey: ["subscription-plans-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("monthly_price_cents");
      return data ?? [];
    },
  });

  function reset() {
    setEditing(null);
    setForm({ name: "", monthly_price_cents: 8990, credits: 4, description: "" });
  }

  async function save() {
    if (!form.name || form.monthly_price_cents <= 0) {
      toast.error("Informe nome e preço.");
      return;
    }
    if (editing) {
      const { error } = await supabase
        .from("subscription_plans")
        .update(form)
        .eq("id", editing);
      if (error) return toast.error(error.message);
      toast.success("Plano atualizado");
    } else {
      const { error } = await supabase.from("subscription_plans").insert(form);
      if (error) return toast.error(error.message);
      toast.success("Plano cadastrado");
    }
    reset();
    qc.invalidateQueries({ queryKey: ["subscription-plans"] });
    qc.invalidateQueries({ queryKey: ["subscription-plans-all"] });
  }

  async function toggle(id: string, is_active: boolean) {
    await supabase.from("subscription_plans").update({ is_active: !is_active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["subscription-plans"] });
    qc.invalidateQueries({ queryKey: ["subscription-plans-all"] });
  }

  async function remove(id: string) {
    if (!window.confirm("Remover este plano?")) return;
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["subscription-plans"] });
    qc.invalidateQueries({ queryKey: ["subscription-plans-all"] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Planos cadastrados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr_2fr_auto_auto]">
          <Input
            placeholder="Nome do plano"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Preço (centavos)"
            value={form.monthly_price_cents}
            onChange={(e) =>
              setForm({ ...form, monthly_price_cents: Number(e.target.value) })
            }
          />
          <Input
            type="number"
            placeholder="Créditos/mês"
            value={form.credits}
            onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })}
          />
          <Input
            placeholder="Descrição (opcional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Button onClick={save}>{editing ? "Atualizar" : "Adicionar"}</Button>
          {editing && (
            <Button variant="ghost" onClick={reset}>
              Cancelar
            </Button>
          )}
        </div>

        <div className="divide-y divide-border rounded-md border border-border">
          {(plans ?? []).map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">
                  {p.name}{" "}
                  {!p.is_active && (
                    <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                      inativo
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {brl(p.monthly_price_cents)}/mês · {p.credits} créditos
                  {p.description ? ` · ${p.description}` : ""}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(p.id);
                    setForm({
                      name: p.name,
                      monthly_price_cents: p.monthly_price_cents,
                      credits: p.credits,
                      description: p.description ?? "",
                    });
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggle(p.id, p.is_active)}>
                  {p.is_active ? "Desativar" : "Ativar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {!plans?.length && (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              Nenhum plano cadastrado. Crie o primeiro acima.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
