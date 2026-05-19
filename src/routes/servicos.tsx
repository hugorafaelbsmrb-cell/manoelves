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

function ServiceRow({
  service,
  onChanged,
}: {
  service: { id: string; name: string; duration_minutes: number; price_cents: number };
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(service.name);
  const [duration, setDuration] = useState(String(service.duration_minutes));
  const [price, setPrice] = useState((service.price_cents / 100).toFixed(2));

  async function save() {
    const cents = Math.round(parseFloat(price.replace(",", ".")) * 100);
    if (!name || !cents || !duration) return toast.error("Preencha todos os campos.");
    const { error } = await supabase
      .from("services")
      .update({ name, duration_minutes: parseInt(duration), price_cents: cents })
      .eq("id", service.id);
    if (error) return toast.error(error.message);
    toast.success("Serviço atualizado");
    setEditing(false);
    onChanged();
  }

  if (editing) {
    return (
      <tr className="border-b border-border bg-secondary/30 last:border-0">
        <td className="px-4 py-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
        </td>
        <td className="px-4 py-2">
          <Input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="h-8 w-24"
          />
        </td>
        <td className="px-4 py-2 text-right">
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="ml-auto h-8 w-24"
          />
        </td>
        <td className="px-4 py-2 text-right">
          <Button size="sm" onClick={save} className="mr-1">
            Salvar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            X
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 font-medium">{service.name}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {minutesLabel(service.duration_minutes)}
      </td>
      <td className="px-4 py-3 text-right font-medium">{brl(service.price_cents)}</td>
      <td className="px-4 py-3 text-right">
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            if (!window.confirm(`Remover ${service.name}?`)) return;
            await supabase.from("services").delete().eq("id", service.id);
            onChanged();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

function ComboCard({
  combo,
  onChanged,
}: {
  combo: { id: string; name: string; price_cents: number; names: string };
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(combo.name);
  const [price, setPrice] = useState((combo.price_cents / 100).toFixed(2));

  async function save() {
    const cents = Math.round(parseFloat(price.replace(",", ".")) * 100);
    if (!name || !cents) return toast.error("Preencha nome e preço.");
    const { error } = await supabase
      .from("combos")
      .update({ name, price_cents: cents })
      .eq("id", combo.id);
    if (error) return toast.error(error.message);
    toast.success("Combo atualizado");
    setEditing(false);
    onChanged();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
          ) : (
            <p className="font-display text-lg tracking-wide">{combo.name}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{combo.names || "—"}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
            {editing ? "X" : "Editar"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (!window.confirm(`Remover ${combo.name}?`)) return;
              await supabase.from("combos").delete().eq("id", combo.id);
              onChanged();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {editing ? (
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-8 w-28"
          />
          <Button size="sm" onClick={save}>
            Salvar
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xl font-display">{brl(combo.price_cents)}</p>
      )}
    </div>
  );
}
