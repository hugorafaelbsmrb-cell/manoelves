import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { filterClients, loadKnownClients } from "@/lib/clients";

export interface ClientPick {
  name: string;
  phone: string;
}

interface Props {
  value: ClientPick;
  onChange: (v: ClientPick) => void;
}

export function ClientCombobox({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"pick" | "new">("pick");

  const { data: clients = [], isPending } = useQuery({
    queryKey: ["known-clients"],
    queryFn: () => loadKnownClients(500),
    // Lista de clientes muda raramente durante o expediente; evita refetch
    // (2 consultas) a cada abertura do combobox — importante no Android.
    staleTime: 5 * 60_000,
  });

  const results = useMemo(() => filterClients(clients, query), [clients, query]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Fecha ao tocar/clicar fora. Sem overlay fixo: dentro de um Dialog (que
  // aplica transform no content) um elemento fixed vira um "muro" que cobre
  // o modal e trava a rolagem — a lista não aparecia no celular.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (mode === "new") {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setMode("pick")}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          ← Buscar cliente existente
        </button>
        <div className="space-y-1.5">
          <Label htmlFor="cc-name">Nome</Label>
          <Input
            id="cc-name"
            autoFocus
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cc-phone">WhatsApp</Label>
          <Input
            id="cc-phone"
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
            maxLength={20}
            placeholder="(11) 91234-5678"
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative space-y-2">
      <Label>Cliente</Label>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between"
        onClick={() => setOpen((o) => !o)}
      >
        {value.name ? (
          <span className="truncate">
            {value.name} <span className="text-xs text-muted-foreground">· {value.phone}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Buscar por nome ou telefone…</span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              autoFocus
              className="h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Buscar cliente…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[280px] overflow-y-auto p-1">
            {isPending ? (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                Carregando clientes…
              </div>
            ) : results.length === 0 ? (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                Nenhum cliente encontrado.
              </div>
            ) : (
              results.map((c) => {
                const selected = c.phone === value.phone && c.name === value.name;
                return (
                  <button
                    key={c.phone}
                    type="button"
                    onClick={() => {
                      onChange({ name: c.name, phone: c.phone });
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground ${
                      selected ? "bg-accent text-accent-foreground" : ""
                    }`}
                  >
                    <Check
                      className={`h-4 w-4 shrink-0 ${selected ? "opacity-100" : "opacity-0"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{c.name || "—"}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {c.phone}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setOpen(false);
                setMode("new");
                onChange({ name: "", phone: "" });
              }}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Cadastrar novo cliente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
