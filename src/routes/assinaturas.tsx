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
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Trash2,
  RefreshCw,
  ExternalLink,
  Pencil,
  Plus,
  Check,
  Calendar,
  Send,
} from "lucide-react";
import {
  createSubscriptionPreapproval,
  createSubscriptionFirstPix,
} from "@/lib/payments.functions";
import { sendSubscriptionLinksWhatsApp } from "@/lib/uazapi.functions";
import { ClientCombobox, type ClientPick } from "@/components/client-combobox";

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
      const r = await preapprovalFn({
        data: { subscriptionId: id, payerEmail: email },
      });
      window.open(r.init_point, "_blank");
      toast.success("Link de assinatura gerado");
      qc.invalidateQueries({ queryKey: ["subs"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Assinaturas</h1>
          <p className="text-sm text-muted-foreground">
            Planos recorrentes com Pix automático e créditos mensais.
          </p>
        </div>
        <NewSubscriptionWizard />
      </div>

      {isOwner && <PlansManager />}

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

/* ---------------- Wizard de nova assinatura ---------------- */

function NewSubscriptionWizard() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [client, setClient] = useState<ClientPick>({ name: "", phone: "" });
  const [planId, setPlanId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const createPix = useServerFn(createSubscriptionFirstPix);
  const createMP = useServerFn(createSubscriptionPreapproval);
  const sendLinks = useServerFn(sendSubscriptionLinksWhatsApp);

  const { data: plans } = useQuery({
    queryKey: ["subscription-plans"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("monthly_price_cents");
      return data ?? [];
    },
  });

  function reset() {
    setStep(1);
    setClient({ name: "", phone: "" });
    setPlanId("");
  }

  async function finalize() {
    const plan = plans?.find((p) => p.id === planId);
    if (!plan || !client.name || !client.phone) {
      toast.error("Preencha cliente e plano.");
      return;
    }
    setBusy(true);
    try {
      const next = new Date();
      next.setMonth(next.getMonth() + 1);
      const { data: sub, error } = await supabase
        .from("subscriptions")
        .insert({
          client_name: client.name,
          client_whatsapp: client.phone,
          plan_name: plan.name,
          monthly_price_cents: plan.monthly_price_cents,
          credits_remaining: plan.credits,
          next_charge_at: next.toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;

      const email = `sub+${sub.id.slice(0, 8)}@manoelves.app`;
      const [mp, pix] = await Promise.all([
        createMP({ data: { subscriptionId: sub.id, payerEmail: email } }),
        createPix({ data: { subscriptionId: sub.id } }),
      ]);

      await sendLinks({
        data: {
          subscriptionId: sub.id,
          mpInitPoint: mp.init_point,
          pixCode: pix.pix_code,
        },
      });

      toast.success("Assinatura criada e links enviados no WhatsApp!");
      qc.invalidateQueries({ queryKey: ["subs"] });
      qc.invalidateQueries({ queryKey: ["known-clients"] });
      setOpen(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> Nova assinatura
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider">
            Nova assinatura
          </DialogTitle>
          <DialogDescription>Passo {step} de 3</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <ClientCombobox value={client} onChange={setClient} />
            <Button
              className="w-full"
              disabled={!client.name || !client.phone}
              onClick={() => setStep(2)}
            >
              Continuar
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Escolha o plano</p>
            <div className="grid gap-2">
              {(plans ?? []).map((p) => {
                const active = planId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlanId(p.id)}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
                      active
                        ? "border-foreground bg-secondary"
                        : "border-border hover:border-foreground"
                    }`}
                  >
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.credits} créditos/mês
                        {p.description ? ` · ${p.description}` : ""}
                      </p>
                    </div>
                    <span className="font-display">
                      {brl(p.monthly_price_cents)}
                    </span>
                  </button>
                );
              })}
              {!plans?.length && (
                <p className="text-xs text-muted-foreground">
                  Cadastre um plano primeiro.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                Voltar
              </Button>
              <Button
                className="flex-1"
                disabled={!planId}
                onClick={() => setStep(3)}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-card p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Cliente:</span>{" "}
                <span className="font-medium">{client.name}</span> ·{" "}
                {client.phone}
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Plano:</span>{" "}
                <span className="font-medium">
                  {plans?.find((p) => p.id === planId)?.name}
                </span>{" "}
                ·{" "}
                {brl(
                  plans?.find((p) => p.id === planId)?.monthly_price_cents ?? 0,
                )}
                /mês
              </p>
            </div>
            <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
              Ao confirmar enviaremos no WhatsApp do cliente dois botões:
              <ul className="ml-4 mt-1 list-disc">
                <li>💳 Assinar com cartão (cobrança automática)</li>
                <li>📱 Pix do 1º mês (copia e cola)</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setStep(2)}
              >
                Voltar
              </Button>
              <Button className="flex-1" disabled={busy} onClick={finalize}>
                <Send className="mr-2 h-4 w-4" />
                {busy ? "Enviando..." : "Confirmar e enviar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Planos ---------------- */

function PlansManager() {
  const qc = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

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

  async function toggle(id: string, is_active: boolean) {
    await supabase
      .from("subscription_plans")
      .update({ is_active: !is_active })
      .eq("id", id);
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

  const editingPlan = plans?.find((p) => p.id === editing) ?? null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Planos de assinatura</CardTitle>
          <p className="text-xs text-muted-foreground">
            Cadastre, edite ou remova os planos disponíveis para os clientes.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setWizardOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Novo plano
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
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
                <PlanWindowsDialog planId={p.id} planName={p.name} />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(p.id);
                    setWizardOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggle(p.id, p.is_active)}
                >
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
              Nenhum plano cadastrado. Clique em "Novo plano" para começar.
            </p>
          )}
        </div>
      </CardContent>

      <PlanWizard
        open={wizardOpen}
        onOpenChange={(v) => {
          setWizardOpen(v);
          if (!v) setEditing(null);
        }}
        initial={
          editingPlan
            ? {
                id: editingPlan.id,
                name: editingPlan.name,
                monthly_price_cents: editingPlan.monthly_price_cents,
                credits: editingPlan.credits,
                description: editingPlan.description ?? "",
              }
            : null
        }
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["subscription-plans"] });
          qc.invalidateQueries({ queryKey: ["subscription-plans-all"] });
        }}
      />
    </Card>
  );
}

/* ---------------- Wizard de plano ---------------- */

type PlanForm = {
  id?: string;
  name: string;
  monthly_price_cents: number;
  credits: number;
  description: string;
};

function PlanWizard({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: PlanForm | null;
  onSaved: () => void;
}) {
  const isEdit = !!initial?.id;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<PlanForm>(
    initial ?? { name: "", monthly_price_cents: 8990, credits: 4, description: "" },
  );
  const [priceReais, setPriceReais] = useState(
    ((initial?.monthly_price_cents ?? 8990) / 100).toFixed(2).replace(".", ","),
  );
  const [saving, setSaving] = useState(false);

  // sincroniza quando abrir
  function handleOpenChange(v: boolean) {
    if (v) {
      setStep(1);
      const base =
        initial ?? { name: "", monthly_price_cents: 8990, credits: 4, description: "" };
      setForm(base);
      setPriceReais((base.monthly_price_cents / 100).toFixed(2).replace(".", ","));
    }
    onOpenChange(v);
  }

  function parsePrice(v: string) {
    const cleaned = v.replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  }

  async function save() {
    const cents = parsePrice(priceReais);
    if (!form.name.trim() || cents <= 0) {
      toast.error("Informe nome e preço válido.");
      setStep(1);
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      monthly_price_cents: cents,
      credits: form.credits,
      description: form.description?.trim() || null,
    };
    try {
      if (isEdit && initial?.id) {
        const { error } = await supabase
          .from("subscription_plans")
          .update(payload)
          .eq("id", initial.id);
        if (error) throw error;
        toast.success("Plano atualizado");
      } else {
        const { error } = await supabase.from("subscription_plans").insert(payload);
        if (error) throw error;
        toast.success("Plano cadastrado");
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const cents = parsePrice(priceReais);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar plano" : "Novo plano de assinatura"}</DialogTitle>
          <DialogDescription>
            Passo {step} de 3 ·{" "}
            {step === 1 ? "Identificação" : step === 2 ? "Preço e créditos" : "Revisão"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome do plano</Label>
              <Input
                autoFocus
                placeholder="Ex.: Clube do Corte"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Ex.: 4 cortes por mês + 10% off em produtos"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Preço mensal (R$)</Label>
              <Input
                inputMode="decimal"
                placeholder="89,90"
                value={priceReais}
                onChange={(e) => setPriceReais(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Valor cobrado mensalmente do cliente.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Créditos por mês</Label>
              <Input
                type="number"
                min={0}
                value={form.credits}
                onChange={(e) =>
                  setForm({ ...form, credits: Math.max(0, Number(e.target.value)) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Quantos agendamentos o cliente pode marcar por mês com a assinatura.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nome</span>
              <span className="font-medium">{form.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Preço/mês</span>
              <span className="font-medium">{brl(cents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Créditos/mês</span>
              <span className="font-medium">{form.credits}</span>
            </div>
            {form.description && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Descrição</span>
                <span className="max-w-[60%] text-right font-medium">
                  {form.description}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={() => (step === 1 ? onOpenChange(false) : setStep(step - 1))}
            disabled={saving}
          >
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 1 && !form.name.trim()) {
                  toast.error("Informe o nome do plano.");
                  return;
                }
                if (step === 2 && parsePrice(priceReais) <= 0) {
                  toast.error("Informe um preço válido.");
                  return;
                }
                setStep(step + 1);
              }}
            >
              Continuar
            </Button>
          ) : (
            <Button onClick={save} disabled={saving}>
              <Check className="mr-1 h-4 w-4" />
              {saving ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar plano"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


/* ---------------- Janelas exclusivas por plano ---------------- */

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function PlanWindowsDialog({
  planId,
  planName,
}: {
  planId: string;
  planName: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [wd, setWd] = useState(1);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");

  const { data: windows } = useQuery({
    queryKey: ["plan-windows", planId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plan_windows")
        .select("*")
        .eq("plan_id", planId)
        .order("weekday");
      return data ?? [];
    },
  });

  async function add() {
    const { error } = await supabase.from("subscription_plan_windows").insert({
      plan_id: planId,
      weekday: wd,
      start_time: start,
      end_time: end,
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["plan-windows", planId] });
    toast.success("Janela adicionada");
  }

  async function remove(id: string) {
    await supabase.from("subscription_plan_windows").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["plan-windows", planId] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Calendar className="mr-1 h-3.5 w-3.5" /> Agenda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agenda exclusiva — {planName}</DialogTitle>
          <DialogDescription>
            Assinantes desse plano só podem agendar nas janelas abaixo. Se
            estiver vazio, o plano usa a agenda padrão do barbeiro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {(windows ?? []).map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <span>
                {WEEKDAYS[w.weekday]} · {w.start_time.slice(0, 5)} →{" "}
                {w.end_time.slice(0, 5)}
              </span>
              <Button size="sm" variant="ghost" onClick={() => remove(w.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {!windows?.length && (
            <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
              Sem janelas exclusivas — usa a agenda padrão.
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <Label>Adicionar janela</Label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={wd}
              onChange={(e) => setWd(Number(e.target.value))}
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
            >
              {WEEKDAYS.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
            <Input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-28"
            />
            <span className="text-muted-foreground">→</span>
            <Input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-28"
            />
            <Button size="sm" onClick={add}>
              <Check className="mr-1 h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
