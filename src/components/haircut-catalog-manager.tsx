import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, ArrowUp, ArrowDown, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Style = {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};

async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `haircuts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

export function HaircutCatalogManager() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: styles } = useQuery({
    queryKey: ["haircut-styles-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("haircut_styles")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      return (data ?? []) as Style[];
    },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["haircut-styles-admin"] });
    qc.invalidateQueries({ queryKey: ["haircut-styles-public"] });
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione uma imagem.");
      if (!name.trim()) throw new Error("Informe o nome do corte.");
      const url = await uploadImage(file);
      const nextOrder = (styles?.length ?? 0) + 1;
      const { error } = await supabase.from("haircut_styles").insert({
        name: name.trim(),
        description: description.trim() || null,
        image_url: url,
        sort_order: nextOrder,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setDescription("");
      setFile(null);
      refresh();
      toast.success("Corte adicionado");
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setBusy(false),
  });

  async function toggleActive(s: Style) {
    const { error } = await supabase
      .from("haircut_styles")
      .update({ is_active: !s.is_active })
      .eq("id", s.id);
    if (error) toast.error(error.message);
    else refresh();
  }

  async function remove(s: Style) {
    if (!confirm(`Remover "${s.name}"?`)) return;
    const { error } = await supabase.from("haircut_styles").delete().eq("id", s.id);
    if (error) toast.error(error.message);
    else {
      refresh();
      toast.success("Removido");
    }
  }

  async function move(s: Style, dir: -1 | 1) {
    if (!styles) return;
    const idx = styles.findIndex((x) => x.id === s.id);
    const swap = styles[idx + dir];
    if (!swap) return;
    await supabase.from("haircut_styles").update({ sort_order: swap.sort_order }).eq("id", s.id);
    await supabase.from("haircut_styles").update({ sort_order: s.sort_order }).eq("id", swap.id);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs">Nome do corte</Label>
          <Input
            placeholder="Ex.: Low Fade"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Imagem</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button
          onClick={() => {
            setBusy(true);
            create.mutate();
          }}
          disabled={busy || create.isPending}
        >
          <Plus className="mr-1 h-4 w-4" />
          {create.isPending ? "Enviando..." : "Adicionar"}
        </Button>
        <div className="sm:col-span-3 space-y-1.5">
          <Label className="text-xs">Descrição (opcional)</Label>
          <Textarea
            rows={2}
            placeholder="Detalhes, indicação, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {!styles || styles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum corte cadastrado ainda. Adicione o primeiro acima.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {styles.map((s, i) => (
            <li
              key={s.id}
              className="flex gap-3 rounded-md border border-border bg-card p-3"
            >
              <img
                src={s.image_url}
                alt={s.name}
                className="h-24 w-20 flex-shrink-0 rounded-md object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate font-medium">{s.name}</p>
                {s.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {s.description}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Switch
                      checked={s.is_active}
                      onCheckedChange={() => toggleActive(s)}
                    />
                    <span className="text-muted-foreground">
                      {s.is_active ? "Ativo" : "Oculto"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={i === 0}
                      onClick={() => move(s, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={i === styles.length - 1}
                      onClick={() => move(s, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(s)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
