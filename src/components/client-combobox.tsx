import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  const [mode, setMode] = useState<"pick" | "new">(value.name ? "pick" : "pick");

  const { data: clients = [] } = useQuery({
    queryKey: ["known-clients"],
    queryFn: () => loadKnownClients(500),
    staleTime: 60_000,
  });

  const results = useMemo(() => filterClients(clients, query), [clients, query]);

  useEffect(() => {
    if (!open) setQuery("");
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
    <div className="space-y-2">
      <Label>Cliente</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between"
          >
            {value.name ? (
              <span className="truncate">
                {value.name}{" "}
                <span className="text-xs text-muted-foreground">
                  · {value.phone}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Buscar por nome ou telefone…</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar cliente…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                <div className="py-3 text-center text-xs text-muted-foreground">
                  Nenhum cliente encontrado.
                </div>
              </CommandEmpty>
              <CommandGroup>
                {results.map((c) => {
                  const selected =
                    c.phone === value.phone && c.name === value.name;
                  return (
                    <CommandItem
                      key={c.phone}
                      value={`${c.name} ${c.phone}`}
                      onSelect={() => {
                        onChange({ name: c.name, phone: c.phone });
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`}
                      />
                      <div className="flex flex-col">
                        <span>{c.name || "—"}</span>
                        <span className="text-xs text-muted-foreground">{c.phone}</span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
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
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
