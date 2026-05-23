import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Receipt, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { brl } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientCombobox, type ClientPick } from "@/components/client-combobox";
import { upsertClient } from "@/lib/clients";
import { createOrderCheckout, createOrderPix } from "@/lib/payments.functions";
import { sendOrderPixWhatsApp } from "@/lib/uazapi.functions";

export const Route = createFileRoute("/comanda")({
  ssr: false,
  head: () => ({ meta: [{ title: "Comanda — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <ComandaPage />
    </AppShell>
  ),
});

type Item = {
  kind: "service" | "product";
  ref_id: string;
  description: string;
  qty: number;
  unit_price_cents: number;
};

function ComandaPage() {
  const { user, isOwner } = useAuth();
  const qc = useQueryClient();
  const [clientPick, setClientPick] = useState<ClientPick>({ name: "", phone: "" });
  const clientName = clientPick.name;
  const clientWhats = clientPick.phone;
  const [items, setItems] = useState<Item[]>([]);
  const [method, setMethod] = useState<"pix" | "cash" | "credit" | "debit">("pix");
  const [closed, setClosed] = useState<{
    invoice: string;
    owner: number;
    barber: number;
    total: number;
    orderId: string;
    initPoint?: string | null;
    pixCode?: string | null;
    pixQr?: string | null;
    whatsSent?: boolean;
  } | null>(null);
  const checkoutFn = useServerFn(createOrderCheckout);
  const pixFn = useServerFn(createOrderPix);
  const sendPixWhatsFn = useServerFn(sendOrderPixWhatsApp);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatingPix, setGeneratingPix] = useState(false);

  const { data: services } = useQuery({
    queryKey: ["pdv-services"],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, price_cents")
        .eq("is_active", true);
      return data ?? [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["pdv-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price_cents, stock")
        .eq("is_active", true)
        .eq("is_internal_use", false);
      return data ?? [];
    },
  });

  const { data: commission } = useQuery({
    queryKey: ["commission", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("commission_rules")
        .select("*")
        .eq("barber_id", user!.id)
        .maybeSingle();
      return data ?? { service_pct: 50, product_pct: 10 };
    },
  });

  // Clientes com agendamento na janela [-30min, +30min] — atalho do PDV
  const { data: nearby } = useQuery({
    queryKey: ["comanda-nearby", user?.id, isOwner],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const from = new Date(Date.now() - 30 * 60_000).toISOString();
      const to = new Date(Date.now() + 30 * 60_000).toISOString();
      let q = supabase
        .from("appointments")
        .select("id, client_name, client_whatsapp, start_at, status, barber_id")
        .gte("start_at", from)
        .lte("start_at", to)
        .neq("status", "canceled" as never)
        .order("start_at", { ascending: true });
      if (!isOwner) q = q.eq("barber_id", user!.id);
      const { data } = await q;
      return data ?? [];
    },
  });

  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price_cents, 0);


  function addItem(it: Item) {
    setItems((prev) => {
      const existing = prev.find((p) => p.ref_id === it.ref_id);
      if (existing) {
        return prev.map((p) =>
          p.ref_id === it.ref_id ? { ...p, qty: p.qty + 1 } : p
        );
      }
      return [...prev, it];
    });
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function closeOrder() {
    if (!user) return;
    if (!clientName.trim()) return toast.error("Informe o nome do cliente");
    if (items.length === 0) return toast.error("Adicione ao menos 1 item");

    const servicePct = Number(commission?.service_pct ?? 50) / 100;
    const productPct = Number(commission?.product_pct ?? 10) / 100;

    const barberAmount = items.reduce((acc, it) => {
      const pct = it.kind === "service" ? servicePct : productPct;
      return acc + it.qty * it.unit_price_cents * pct;
    }, 0);
    const ownerAmount = subtotal - barberAmount;

    // upsert do cliente se houver whatsapp (registra na tabela clients)
    if (clientWhats.trim()) {
      await upsertClient({ name: clientName, whatsapp: clientWhats });
    }

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        barber_id: user.id,
        client_name: clientName,
        client_whatsapp: clientWhats.trim() || null,
        subtotal_cents: subtotal,
        total_cents: subtotal,
        status: "closed" as never,
        closed_at: new Date().toISOString(),
        invoice_number: `NFS-${Date.now().toString().slice(-6)}`,
      })
      .select()
      .single();
    if (error || !order) return toast.error(error?.message ?? "Erro");

    await supabase.from("order_items").insert(
      items.map((it) => ({
        order_id: order.id,
        kind: it.kind,
        ref_id: it.ref_id,
        description: it.description,
        qty: it.qty,
        unit_price_cents: it.unit_price_cents,
        total_cents: it.qty * it.unit_price_cents,
      }))
    );

    await supabase.from("payments").insert({
      order_id: order.id,
      barber_id: user.id,
      method: method as never,
      total_cents: subtotal,
      owner_amount_cents: Math.round(ownerAmount),
      barber_amount_cents: Math.round(barberAmount),
    });

    // baixa de estoque para produtos
    for (const it of items.filter((i) => i.kind === "product")) {
      const prod = products?.find((p) => p.id === it.ref_id);
      if (prod) {
        await supabase
          .from("products")
          .update({ stock: Math.max(0, prod.stock - it.qty) })
          .eq("id", prod.id);
      }
    }

    const baseClosed = {
      invoice: order.invoice_number!,
      owner: Math.round(ownerAmount),
      barber: Math.round(barberAmount),
      total: subtotal,
      orderId: order.id,
      initPoint: null as string | null,
      pixCode: null as string | null,
      pixQr: null as string | null,
      whatsSent: false,
    };
    setClosed(baseClosed);
    setItems([]);
    const savedWhats = clientWhats.trim();
    setClientPick({ name: "", phone: "" });
    qc.invalidateQueries({ queryKey: ["pdv-products"] });
    toast.success("Comanda fechada • NFS-e emitida (simulado)");

    // Fluxo automático: PIX + envio do copia-e-cola via WhatsApp
    if (method === "pix") {
      setGeneratingPix(true);
      try {
        const pix = await pixFn({ data: { orderId: order.id } });
        let whatsSent = false;
        if (savedWhats) {
          try {
            await sendPixWhatsFn({ data: { orderId: order.id } });
            whatsSent = true;
            toast.success("PIX enviado no WhatsApp do cliente");
          } catch (e: any) {
            toast.error(`WhatsApp: ${e.message ?? "falha no envio"}`);
          }
        }
        setClosed({
          ...baseClosed,
          pixCode: pix.pix_code,
          pixQr: pix.qr_base64,
          whatsSent,
        });
      } catch (e: any) {
        toast.error(e.message ?? "Erro ao gerar PIX");
      } finally {
        setGeneratingPix(false);
      }
    }
  }

  async function generatePaymentLink() {
    if (!closed) return;
    setGeneratingLink(true);
    try {
      const r = await checkoutFn({ data: { orderId: closed.orderId } });
      setClosed({ ...closed, initPoint: r.init_point });
      window.open(r.init_point, "_blank");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao gerar link");
    } finally {
      setGeneratingLink(false);
    }
  }

  if (closed) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h1 className="mt-4 font-display text-2xl tracking-wider">Comanda fechada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          NFS-e <span className="font-mono">{closed.invoice}</span> emitida (mock)
        </p>
        <div className="mt-6 space-y-2 text-sm">
          <Row label="Total" value={brl(closed.total)} strong />
          <Row label="Comissão do barbeiro" value={brl(closed.barber)} />
          <Row label="Dono da barbearia" value={brl(closed.owner)} />
        </div>

        {generatingPix && (
          <p className="mt-4 text-xs text-muted-foreground">Gerando PIX…</p>
        )}

        {closed.pixCode && (
          <div className="mt-6 space-y-3 rounded-lg border border-border bg-background p-4 text-left">
            <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              PIX Copia e Cola
            </p>
            {closed.pixQr && (
              <img
                src={`data:image/png;base64,${closed.pixQr}`}
                alt="QR Code PIX"
                className="mx-auto h-44 w-44 rounded-md border border-border bg-white p-2"
              />
            )}
            <textarea
              readOnly
              value={closed.pixCode}
              className="h-20 w-full resize-none rounded-md border border-border bg-card p-2 font-mono text-[10px]"
            />
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(closed.pixCode!);
                toast.success("Código PIX copiado");
              }}
            >
              Copiar código
            </Button>
            <Button
              size="sm"
              className="w-full"
              disabled={generatingPix}
              onClick={async () => {
                try {
                  await sendPixWhatsFn({ data: { orderId: closed.orderId } });
                  setClosed({ ...closed, whatsSent: true });
                  toast.success("PIX reenviado no WhatsApp");
                } catch (e: any) {
                  toast.error(e.message ?? "Falha ao enviar");
                }
              }}
            >
              {closed.whatsSent ? "Reenviar no WhatsApp" : "Enviar no WhatsApp"}
            </Button>
          </div>
        )}

        <Button
          className="mt-6 w-full"
          variant="secondary"
          onClick={generatePaymentLink}
          disabled={generatingLink}
        >
          <ExternalLink className="mr-1 h-4 w-4" />
          {closed.initPoint ? "Reabrir checkout MP" : generatingLink ? "Gerando..." : "Pagar com Mercado Pago"}
        </Button>
        <Button className="mt-2 w-full" onClick={() => setClosed(null)}>
          Abrir nova comanda
        </Button>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl tracking-wider">Comanda / PDV</h1>
      <p className="text-sm text-muted-foreground">
        Adicione serviços e produtos. Ao fechar, o sistema calcula o split entre dono e
        barbeiro e simula a emissão da NFS-e.
      </p>

      {(nearby ?? []).length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Clientes agora · ±30 min
          </p>
          <div className="mt-3 flex gap-4 overflow-x-auto pb-1">
            {nearby!.map((a) => {
              const hhmm = new Date(a.start_at).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const initials = (a.client_name ?? "?")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join("");
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    setClientName(a.client_name);
                    setClientWhats(a.client_whatsapp ?? "");
                    toast.success(`Cliente ${a.client_name} carregado`);
                  }}
                  className="flex w-20 shrink-0 flex-col items-center gap-1 text-center"
                  title={`${a.client_name} — ${hhmm}`}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-border bg-background font-display text-lg tracking-wider transition hover:border-primary hover:bg-secondary">
                    {initials || "?"}
                  </div>
                  <span className="line-clamp-1 text-xs font-medium">
                    {a.client_name.split(" ")[0]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{hhmm}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}


      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Cliente</label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                WhatsApp (para envio automático do PIX)
              </label>
              <Input
                value={clientWhats}
                onChange={(e) => setClientWhats(e.target.value)}
                placeholder="(11) 99999-9999"
                inputMode="tel"
              />
            </div>
          </div>

          <Section title="Serviços">
            <div className="flex flex-wrap gap-2">
              {(services ?? []).map((s) => (
                <button
                  key={s.id}
                  onClick={() =>
                    addItem({
                      kind: "service",
                      ref_id: s.id,
                      description: s.name,
                      qty: 1,
                      unit_price_cents: s.price_cents,
                    })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-left text-sm hover:bg-secondary"
                >
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{brl(s.price_cents)}</p>
                </button>
              ))}
              {(services ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Cadastre serviços primeiro.</p>
              )}
            </div>
          </Section>

          <Section title="Produtos">
            <div className="flex flex-wrap gap-2">
              {(products ?? []).map((p) => (
                <button
                  key={p.id}
                  onClick={() =>
                    addItem({
                      kind: "product",
                      ref_id: p.id,
                      description: p.name,
                      qty: 1,
                      unit_price_cents: p.price_cents,
                    })
                  }
                  className="rounded-lg border border-border bg-background px-3 py-2 text-left text-sm hover:bg-secondary"
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {brl(p.price_cents)} · estoque {p.stock}
                  </p>
                </button>
              ))}
              {(products ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Sem produtos cadastrados.</p>
              )}
            </div>
          </Section>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-lg tracking-wide">
            <Receipt className="h-4 w-4" /> Itens
          </h2>
          {items.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">Nenhum item ainda.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {items.map((it, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">{it.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.qty} × {brl(it.unit_price_cents)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{brl(it.qty * it.unit_price_cents)}</p>
                    <button
                      className="text-xs text-destructive"
                      onClick={() => removeItem(i)}
                    >
                      remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="font-display text-lg">Total</span>
            <span className="font-display text-2xl">{brl(subtotal)}</span>
          </div>

          <div className="mt-3">
            <label className="text-xs text-muted-foreground">Forma de pagamento</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
            >
              <option value="pix">Pix</option>
              <option value="cash">Dinheiro</option>
              <option value="credit">Crédito</option>
              <option value="debit">Débito</option>
            </select>
          </div>

          <Button className="mt-4 w-full" onClick={closeOrder}>
            <Plus className="mr-1 h-4 w-4" /> Fechar comanda
          </Button>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {/* TODO: integrar provedor de pagamento (Mercado Pago / Asaas) */}
            Split e NFS-e simulados.
          </p>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-display text-lg tracking-wide">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-display text-lg" : "font-medium"}>{value}</span>
    </div>
  );
}
