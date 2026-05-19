import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { brl, minutesLabel } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/servicos")({
  ssr: false,
  head: () => ({ meta: [{ title: "Serviços — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <ServicosPage />
    </AppShell>
  ),
});

function ServicosPage() {
  const { isOwner } = useAuth();
  const qc = useQueryClient();

  const { data: services } = useQuery({
    queryKey: ["services-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("*")
        .order("created_at");
      return data ?? [];
    },
  });

  const { data: combos } = useQuery({
    queryKey: ["combos-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("combos")
        .select("id, name, price_cents, is_active, combo_services(service_id)")
        .order("created_at");
      return data ?? [];
    },
  });

  if (!isOwner) {
    return (
      <p className="text-sm text-muted-foreground">
        Apenas o dono pode gerenciar serviços.
      </p>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl tracking-wider">Serviços & Combos</h1>
      <p className="text-sm text-muted-foreground">
        Cadastre os serviços oferecidos e monte combos (ex: Cabelo + Barba).
      </p>

      <section className="mt-6">
        <h2 className="font-display text-xl tracking-wide">Serviços</h2>
        <ServiceForm onCreated={() => qc.invalidateQueries({ queryKey: ["services-admin"] })} />

        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          {!services || services.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum serviço ainda.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Duração</th>
                  <th className="px-4 py-3 text-right">Preço</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <ServiceRow
                    key={s.id}
                    service={s}
                    onChanged={() => qc.invalidateQueries({ queryKey: ["services-admin"] })}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl tracking-wide">Combos</h2>
        <ComboForm
          services={services ?? []}
          onCreated={() => qc.invalidateQueries({ queryKey: ["combos-admin"] })}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(combos ?? []).map((c) => {
            const ids = (c.combo_services as { service_id: string }[]).map(
              (cs) => cs.service_id
            );
            const names = (services ?? [])
              .filter((s) => ids.includes(s.id))
              .map((s) => s.name)
              .join(" + ");
            return (
              <ComboCard
                key={c.id}
                combo={{ id: c.id, name: c.name, price_cents: c.price_cents, names }}
                onChanged={() => qc.invalidateQueries({ queryKey: ["combos-admin"] })}
              />
            );
          })}
        </div>
      </section>
    </>
  );
}

function ServiceForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(price.replace(",", ".")) * 100);
    if (!name || !cents || !duration) return;
    const { error } = await supabase.from("services").insert({
      name,
      duration_minutes: parseInt(duration),
      price_cents: cents,
    });
    if (error) return toast.error(error.message);
    toast.success("Serviço criado");
    setName("");
    setPrice("");
    setDuration("30");
    onCreated();
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex-1 min-w-[160px]">
        <label className="text-xs text-muted-foreground">Nome</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Corte degradê" />
      </div>
      <div className="w-28">
        <label className="text-xs text-muted-foreground">Duração (min)</label>
        <Input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
      </div>
      <div className="w-32">
        <label className="text-xs text-muted-foreground">Preço (R$)</label>
        <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="50,00" />
      </div>
      <Button type="submit">
        <Plus className="mr-1 h-4 w-4" /> Adicionar
      </Button>
    </form>
  );
}

function ComboForm({
  services,
  onCreated,
}: {
  services: { id: string; name: string }[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(price.replace(",", ".")) * 100);
    if (!name || !cents || selected.length === 0) {
      return toast.error("Preencha nome, preço e ao menos 1 serviço");
    }
    const { data: combo, error } = await supabase
      .from("combos")
      .insert({ name, price_cents: cents })
      .select()
      .single();
    if (error || !combo) return toast.error(error?.message ?? "Erro");
    await supabase.from("combo_services").insert(
      selected.map((sid) => ({ combo_id: combo.id, service_id: sid }))
    );
    toast.success("Combo criado");
    setName("");
    setPrice("");
    setSelected([]);
    onCreated();
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground">Nome do combo</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cabelo + Barba" />
        </div>
        <div className="w-32">
          <label className="text-xs text-muted-foreground">Preço (R$)</label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="75,00" />
        </div>
        <Button type="submit">
          <Plus className="mr-1 h-4 w-4" /> Criar combo
        </Button>
      </div>
      <div className="mt-3">
        <p className="text-xs text-muted-foreground">Serviços incluídos:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {services.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`rounded-full border px-3 py-1 text-xs ${
                selected.includes(s.id)
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
