import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { brl } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/produtos")({
  ssr: false,
  head: () => ({ meta: [{ title: "Produtos — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <ProdutosPage />
    </AppShell>
  ),
});

function ProdutosPage() {
  const { isOwner } = useAuth();
  const qc = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ["products-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .order("created_at");
      return data ?? [];
    },
  });

  if (!isOwner) {
    return (
      <p className="text-sm text-muted-foreground">
        Apenas o dono pode gerenciar produtos.
      </p>
    );
  }

  async function patch(id: string, p: Partial<{ name: string; price_cents: number; cost_cents: number; stock: number; low_stock_alert: number; is_active: boolean; is_internal_use: boolean }>) {
    const { error } = await supabase.from("products").update(p).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["products-admin"] });
  }

  return (
    <>
      <h1 className="font-display text-3xl tracking-wider">Produtos</h1>
      <p className="text-sm text-muted-foreground">
        Cadastre produtos para revenda e uso interno; gerencie estoque e alertas.
      </p>

      <ProductForm onCreated={() => qc.invalidateQueries({ queryKey: ["products-admin"] })} />

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        {!products || products.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Nenhum produto cadastrado.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3 text-right">Preço</th>
                <th className="px-4 py-3 text-right">Custo</th>
                <th className="px-4 py-3 text-right">Estoque</th>
                <th className="px-4 py-3 text-right">Alerta</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const low = p.stock <= p.low_stock_alert;
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">
                      <EditCell value={p.name} onSave={(v) => patch(p.id, { name: v })} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <EditCell
                        value={(p.price_cents / 100).toFixed(2)}
                        onSave={(v) =>
                          patch(p.id, {
                            price_cents: Math.round(parseFloat(v.replace(",", ".")) * 100),
                          })
                        }
                        suffix={brl(p.price_cents)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      <EditCell
                        value={(p.cost_cents / 100).toFixed(2)}
                        onSave={(v) =>
                          patch(p.id, {
                            cost_cents: Math.round(parseFloat(v.replace(",", ".")) * 100),
                          })
                        }
                        suffix={brl(p.cost_cents)}
                      />
                    </td>
                    <td className={`px-4 py-3 text-right ${low ? "text-destructive" : ""}`}>
                      <EditCell
                        value={String(p.stock)}
                        onSave={(v) => patch(p.id, { stock: parseInt(v) || 0 })}
                        suffix={
                          <span className="inline-flex items-center gap-1">
                            {low && <AlertTriangle className="h-3 w-3" />}
                            {p.stock}
                          </span>
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      <EditCell
                        value={String(p.low_stock_alert)}
                        onSave={(v) => patch(p.id, { low_stock_alert: parseInt(v) || 0 })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => patch(p.id, { is_internal_use: !p.is_internal_use })}
                        className="rounded-full border border-border px-2 py-0.5 text-xs"
                      >
                        {p.is_internal_use ? "Uso interno" : "Revenda"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => patch(p.id, { is_active: !p.is_active })}
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          p.is_active
                            ? "bg-foreground text-background"
                            : "border border-border text-muted-foreground"
                        }`}
                      >
                        {p.is_active ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!window.confirm(`Remover ${p.name}?`)) return;
                          const { error } = await supabase
                            .from("products")
                            .delete()
                            .eq("id", p.id);
                          if (error) return toast.error(error.message);
                          qc.invalidateQueries({ queryKey: ["products-admin"] });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function EditCell({
  value,
  onSave,
  suffix,
}: {
  value: string;
  onSave: (v: string) => void;
  suffix?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  if (!editing) {
    return (
      <button
        className="hover:underline"
        onClick={() => {
          setV(value);
          setEditing(true);
        }}
      >
        {suffix ?? value}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <Input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave(v);
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-7 w-24"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          onSave(v);
          setEditing(false);
        }}
      >
        OK
      </Button>
    </span>
  );
}

function ProductForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("0");
  const [internal, setInternal] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const price_cents = Math.round(parseFloat(price.replace(",", ".")) * 100);
    const cost_cents = Math.round(parseFloat((cost || "0").replace(",", ".")) * 100);
    if (!name || !price_cents) return toast.error("Preencha nome e preço.");
    const { error } = await supabase.from("products").insert({
      name,
      price_cents,
      cost_cents,
      stock: parseInt(stock) || 0,
      is_internal_use: internal,
    });
    if (error) return toast.error(error.message);
    toast.success("Produto cadastrado");
    setName("");
    setPrice("");
    setCost("");
    setStock("0");
    setInternal(false);
    onCreated();
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex-1 min-w-[180px]">
        <label className="text-xs text-muted-foreground">Nome</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pomada modeladora" />
      </div>
      <div className="w-32">
        <label className="text-xs text-muted-foreground">Preço (R$)</label>
        <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="45,00" />
      </div>
      <div className="w-32">
        <label className="text-xs text-muted-foreground">Custo (R$)</label>
        <Input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="20,00" />
      </div>
      <div className="w-24">
        <label className="text-xs text-muted-foreground">Estoque</label>
        <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={internal}
          onChange={(e) => setInternal(e.target.checked)}
        />
        Uso interno
      </label>
      <Button type="submit">
        <Plus className="mr-1 h-4 w-4" /> Adicionar
      </Button>
    </form>
  );
}
