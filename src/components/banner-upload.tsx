import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function BannerUpload({
  folder,
  url,
  onSaved,
  label = "Banner",
  hint = "Recomendado 1920×480 (proporção 4:1).",
}: {
  folder: string;
  url: string;
  onSaved: (url: string) => void;
  label?: string;
  hint?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem.");
    if (file.size > 8 * 1024 * 1024) return toast.error("Imagem deve ter no máximo 8MB.");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${folder}/banner-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      onSaved(data.publicUrl);
      toast.success("Banner atualizado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1 space-y-2">
        {url ? (
          <img
            src={url}
            alt="Banner"
            className="h-32 w-full rounded-md border border-border object-cover"
          />
        ) : (
          <div className="flex h-32 w-full items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
            sem banner
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <span className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm hover:bg-secondary">
              {busy ? "Enviando..." : url ? "Trocar banner" : "Enviar banner"}
            </span>
          </label>
          {url && (
            <Button variant="ghost" size="sm" onClick={() => onSaved("")}>
              Remover
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
