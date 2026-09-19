import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ImagePlus,
  Megaphone,
  Pencil,
  Copy,
  Trash2,
  Send,
  Sparkles,
  CalendarClock,
  CalendarX2,
  Upload,
  Video,
} from "lucide-react";
import {
  campaignAudienceCount,
  cancelScheduledCampaign,
  deleteCampaign,
  duplicateCampaign,
  listCampaigns,
  saveCampaignDraft,
  scheduleCampaign,
  sendCampaign,
  sendCampaignTest,
  updateCampaign,
  uploadCampaignMedia,
} from "@/lib/marketing.functions";
import {
  generateCampaignImage,
  generateCampaignText,
} from "@/lib/openai.functions";
import type { Database } from "@/integrations/supabase/types";

type CampaignRow = Database["public"]["Tables"]["marketing_campaigns"]["Row"];

type Draft = {
  title: string;
  message_text: string;
  media_kind: "none" | "image" | "video";
  media_url: string | null;
  link_mode: "none" | "button" | "text";
  link_target: "general" | "barber";
  barber_slug: string | null;
  barber_id: string | null;
  delay_seconds: number;
};

const emptyDraft: Draft = {
  title: "",
  message_text: "",
  media_kind: "none",
  media_url: null,
  link_mode: "button",
  link_target: "general",
  barber_slug: null,
  barber_id: null,
  delay_seconds: 45,
};

export const Route = createFileRoute("/marketing")({
  ssr: false,
  head: () => ({ meta: [{ title: "Marketing — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  sending: "Enviando",
  sent: "Enviada",
  cancelled: "Cancelada",
};

function Page() {
  const { isOwner, loading, user } = useAuth();
  const listFn = useServerFn(listCampaigns);
  const saveFn = useServerFn(saveCampaignDraft);
  const updateFn = useServerFn(updateCampaign);
  const deleteFn = useServerFn(deleteCampaign);
  const dupFn = useServerFn(duplicateCampaign);
  const countFn = useServerFn(campaignAudienceCount);
  const uploadFn = useServerFn(uploadCampaignMedia);
  const sendFn = useServerFn(sendCampaign);
  const testFn = useServerFn(sendCampaignTest);
  const scheduleFn = useServerFn(scheduleCampaign);
  const cancelFn = useServerFn(cancelScheduledCampaign);
  const textFn = useServerFn(generateCampaignText);
  const imageFn = useServerFn(generateCampaignImage);

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [barbers, setBarbers] = useState<
    { id: string; full_name: string; slug: string | null; is_active: boolean }[]
  >([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [audCount, setAudCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [schedOpen, setSchedOpen] = useState(false);
  const [schedAt, setSchedAt] = useState("");
  const [testOpen, setTestOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [gptOpen, setGptOpen] = useState(false);
  const [gptIdea, setGptIdea] = useState("");
  const [gptTone, setGptTone] = useState<"casual" | "professional" | "urgency">(
    "casual",
  );
  const [gptBusy, setGptBusy] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [refUrl, setRefUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const refFileRef = useRef<HTMLInputElement>(null);

  const refreshList = useCallback(async () => {
    try {
      const r = await listFn();
      setCampaigns(r.campaigns);
    } catch {
      /* silencioso — a lista pode falhar sem quebrar a tela */
    }
  }, [listFn]);

  useEffect(() => {
    void refreshList();
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, slug, is_active")
        .order("full_name");
      setBarbers(data ?? []);
    })();
  }, [refreshList]);

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const r = await countFn({ data: { barber_id: draft.barber_id } });
        if (!stop) setAudCount(r.count);
      } catch {
        if (!stop) setAudCount(null);
      }
    })();
    return () => {
      stop = true;
    };
  }, [draft.barber_id, countFn]);

  if (loading) return null;
  if (!isOwner) {
    return <p className="text-sm text-muted-foreground">Acesso restrito ao dono.</p>;
  }

  async function persistDraft(): Promise<string> {
    const payload = {
      title: draft.title.trim(),
      message_text: draft.message_text,
      media_kind: draft.media_kind,
      media_url: draft.media_url,
      link_mode: draft.link_mode,
      link_target: draft.link_target,
      barber_slug: draft.link_target === "barber" ? draft.barber_slug : null,
      audience: { barber_id: draft.barber_id },
      delay_seconds: draft.delay_seconds,
    };
    if (editingId) {
      const r = await updateFn({ data: { campaignId: editingId, data: payload } });
      return r.campaign.id;
    }
    const r = await saveFn({ data: payload });
    setEditingId(r.campaign.id);
    return r.campaign.id;
  }

  async function saveDraft() {
    if (!draft.title.trim()) {
      toast.error("Dê um título para a campanha.");
      return;
    }
    setBusy(true);
    try {
      await persistDraft();
      toast.success("Rascunho salvo");
      await refreshList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  async function openConfirm() {
    if (!draft.title.trim()) {
      toast.error("Dê um título para a campanha.");
      return;
    }
    if (!draft.message_text.trim()) {
      toast.error("A campanha precisa de um texto.");
      return;
    }
    setBusy(true);
    try {
      await persistDraft();
      await refreshList();
      setConfirmOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSend() {
    if (!editingId) return;
    setBusy(true);
    try {
      const r = await sendFn({ data: { campaignId: editingId } });
      toast.success(
        `Campanha iniciada! Primeira leva: ${r.sent} enviada(s)${
          r.failed ? `, ${r.failed} falha(s)` : ""
        }${r.remaining ? `. Restam ${r.remaining} — o envio continua em segundo plano.` : ""}`,
      );
      setConfirmOpen(false);
      resetComposer();
      await refreshList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar");
    } finally {
      setBusy(false);
    }
  }

  async function openSchedule() {
    if (!draft.title.trim()) {
      toast.error("Dê um título para a campanha.");
      return;
    }
    setBusy(true);
    try {
      await persistDraft();
      await refreshList();
      const now = new Date(Date.now() + 60 * 60 * 1000);
      now.setMinutes(0, 0, 0);
      setSchedAt(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:00`,
      );
      setSchedOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSchedule() {
    if (!editingId || !schedAt) return;
    setBusy(true);
    try {
      await scheduleFn({
        data: { campaignId: editingId, scheduledAt: new Date(schedAt).toISOString() },
      });
      toast.success("Campanha agendada");
      setSchedOpen(false);
      resetComposer();
      await refreshList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao agendar");
    } finally {
      setBusy(false);
    }
  }

  async function openTest() {
    if (!draft.title.trim() || !draft.message_text.trim()) {
      toast.error("Dê um título e um texto para a campanha.");
      return;
    }
    setBusy(true);
    try {
      await persistDraft();
      await refreshList();
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", user!.id)
        .maybeSingle();
      setTestPhone(profile?.phone ?? "");
      setTestOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  async function confirmTest() {
    if (!editingId) return;
    setBusy(true);
    try {
      await testFn({ data: { campaignId: editingId, phone: testPhone } });
      toast.success("Mensagem de teste enviada");
      setTestOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no teste");
    } finally {
      setBusy(false);
    }
  }

  function resetComposer() {
    setDraft(emptyDraft);
    setEditingId(null);
  }

  function edit(c: CampaignRow) {
    const audience = (c.audience ?? {}) as { barber_id?: string | null };
    setDraft({
      title: c.title,
      message_text: c.message_text,
      media_kind: (c.media_kind as Draft["media_kind"]) ?? "none",
      media_url: c.media_url,
      link_mode: (c.link_mode as Draft["link_mode"]) ?? "button",
      link_target: (c.link_target as Draft["link_target"]) ?? "general",
      barber_slug: c.barber_slug,
      barber_id: audience.barber_id ?? null,
      delay_seconds: c.delay_seconds,
    });
    setEditingId(c.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function runGptText() {
    if (!gptIdea.trim()) {
      toast.error("Descreva a ideia da campanha.");
      return;
    }
    setGptBusy(true);
    try {
      const r = await textFn({ data: { idea: gptIdea, tone: gptTone } });
      setDraft((p) => ({ ...p, message_text: r.text }));
      setGptOpen(false);
      toast.success("Texto gerado com IA");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar texto");
    } finally {
      setGptBusy(false);
    }
  }

  async function runGptImage() {
    const text = draft.message_text.trim();
    if (!text) {
      toast.error(
        "Escreva (ou gere com GPT) o texto da campanha antes de gerar a imagem.",
      );
      return;
    }
    setImgBusy(true);
    try {
      const r = await imageFn({
        data: { campaignText: text, referenceUrl: refUrl },
      });
      setDraft((p) => ({ ...p, media_kind: "image", media_url: r.url }));
      toast.success("Imagem gerada com IA");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar imagem");
    } finally {
      setImgBusy(false);
    }
  }

  async function onFilePick(file: File | undefined) {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast.error("Envie apenas imagem ou vídeo MP4.");
      return;
    }
    if (isVideo && file.type !== "video/mp4") {
      toast.error("O vídeo precisa ser MP4.");
      return;
    }
    const maxMb = isVideo ? 25 : 8;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Arquivo acima de ${maxMb}MB.`);
      return;
    }
    setBusy(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
        reader.readAsDataURL(file);
      });
      const r = await uploadFn({
        data: {
          dataBase64: dataUrl,
          fileName: file.name,
          contentType: file.type,
        },
      });
      setDraft((p) => ({
        ...p,
        media_kind: isVideo ? "video" : "image",
        media_url: r.url,
      }));
      toast.success(isVideo ? "Vídeo enviado" : "Imagem enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setBusy(false);
    }
  }

  async function onRefPick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("A referência precisa ser uma imagem.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem de referência acima de 8MB.");
      return;
    }
    setBusy(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
        reader.readAsDataURL(file);
      });
      const r = await uploadFn({
        data: {
          dataBase64: dataUrl,
          fileName: file.name,
          contentType: file.type,
        },
      });
      setRefUrl(r.url);
      toast.success("Referência anexada — será a base da próxima geração.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload da referência");
    } finally {
      setBusy(false);
    }
  }

  function previewLink() {
    if (draft.link_mode === "none") return null;
    if (draft.link_target === "barber" && draft.barber_slug) {
      return `https://manoelves.vhex.app/${draft.barber_slug}/agendar`;
    }
    return "https://manoelves.vhex.app/agendar";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Marketing</h1>
          <p className="text-sm text-muted-foreground">
            Campanhas de WhatsApp para os clientes cadastrados, com texto e
            imagem gerados por IA.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------- Compositor ---------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Editar campanha" : "Nova campanha"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Título (interno)</Label>
              <Input
                value={draft.title}
                placeholder="Ex.: Promo de sábado"
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Texto da mensagem</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setGptOpen(true)}
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5" /> Escrever com GPT
                </Button>
              </div>
              <Textarea
                rows={5}
                value={draft.message_text}
                placeholder="Digite aqui ou use o GPT..."
                onChange={(e) =>
                  setDraft({ ...draft, message_text: e.target.value })
                }
              />
            </div>

            {/* Mídia */}
            <div className="space-y-1.5">
              <Label className="text-xs">Mídia (opcional)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="mr-1 h-3.5 w-3.5" /> Upload
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={imgBusy}
                  onClick={() => void runGptImage()}
                >
                  <ImagePlus className="mr-1 h-3.5 w-3.5" />
                  {imgBusy ? "Gerando..." : refUrl ? "Gerar com referência" : "Gerar imagem do texto"}
                </Button>
                {draft.media_kind !== "none" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() =>
                      setDraft({ ...draft, media_kind: "none", media_url: null })
                    }
                  >
                    Remover
                  </Button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/mp4"
                  className="hidden"
                  onChange={(e) => void onFilePick(e.target.files?.[0])}
                />
              </div>
              {/* Imagem de referência: base criativa para a geração da IA */}
              <div className="space-y-1.5 rounded-md border border-border p-3">
                <Label className="text-xs">Imagem de referência (opcional)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => refFileRef.current?.click()}
                  >
                    <Upload className="mr-1 h-3.5 w-3.5" /> Enviar referência
                  </Button>
                  {refUrl && (
                    <>
                      <HoverMedia url={refUrl} kind="image" className="h-10 w-10" />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => setRefUrl(null)}
                      >
                        Remover
                      </Button>
                    </>
                  )}
                  <input
                    ref={refFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void onRefPick(e.target.files?.[0])}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  A IA usa essa imagem como base criativa (identidade visual e
                  estilo) ao gerar a arte da campanha.
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                A imagem é gerada a partir do texto da campanha, com visual
                clean e minimalista.
              </p>
              {draft.media_url && (
                <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-secondary/30 p-2">
                  <HoverMedia
                    url={draft.media_url}
                    kind={draft.media_kind === "video" ? "video" : "image"}
                    className={draft.media_kind === "video" ? "h-8 w-8" : "h-14 w-14"}
                  />
                  <span className="truncate text-xs text-muted-foreground">
                    {draft.media_kind === "video" ? "Vídeo MP4 anexado" : "Imagem anexada"}
                  </span>
                </div>
              )}
            </div>

            {/* Link de agendamento */}
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Botão "Agendar horário"</Label>
                <Switch
                  checked={draft.link_mode !== "none"}
                  onCheckedChange={(v) =>
                    setDraft({
                      ...draft,
                      link_mode: v ? "button" : "none",
                    })
                  }
                />
              </div>
              {draft.link_mode !== "none" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={draft.link_target}
                    onValueChange={(v) =>
                      setDraft({
                        ...draft,
                        link_target: v as "general" | "barber",
                        barber_slug: v === "barber" ? draft.barber_slug : null,
                      })
                    }
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Agendamento geral</SelectItem>
                      <SelectItem value="barber">Por barbeiro</SelectItem>
                    </SelectContent>
                  </Select>
                  {draft.link_target === "barber" && (
                    <Select
                      value={draft.barber_slug ?? ""}
                      onValueChange={(v) =>
                        setDraft({ ...draft, barber_slug: v })
                      }
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Escolha o barbeiro" />
                      </SelectTrigger>
                      <SelectContent>
                        {barbers
                          .filter((b) => b.slug && b.is_active)
                          .map((b) => (
                            <SelectItem key={b.id} value={b.slug!}>
                              {b.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>

            {/* Público */}
            <div className="space-y-2 rounded-md border border-border p-3">
              <Label className="text-xs">Público</Label>
              <Select
                value={draft.barber_id ?? "all"}
                onValueChange={(v) =>
                  setDraft({ ...draft, barber_id: v === "all" ? null : v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      Clientes de {b.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {audCount === null
                  ? "…"
                  : `${audCount} cliente(s) neste público`}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Intervalo entre envios (segundos) — {draft.delay_seconds}s
              </Label>
              <Input
                type="number"
                min={15}
                max={900}
                value={draft.delay_seconds}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    delay_seconds: Math.min(
                      900,
                      Math.max(15, Number(e.target.value) || 15),
                    ),
                  })
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Envios em levas automáticas de 12 mensagens (a cada ~5 min).
              </p>
            </div>

            {/* Prévia */}
            <div className="rounded-lg bg-[#0b141a] p-4">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-white/50">
                Prévia
              </p>
              <div className="ml-auto w-fit max-w-[90%] rounded-lg rounded-tr-none bg-[#005c4b] px-3 py-2 shadow">
                {draft.media_url && draft.media_kind === "image" && (
                  <HoverMedia
                    url={draft.media_url}
                    kind="image"
                    className="mb-2 max-h-40 w-full"
                    tooltipSide="top"
                  />
                )}
                <p className="whitespace-pre-wrap text-[13px] leading-snug text-white">
                  {draft.message_text || "Sua mensagem aparecerá aqui..."}
                </p>
                {previewLink() && draft.link_mode === "button" && (
                  <p className="mt-2 w-fit rounded bg-white/10 px-2 py-1 text-[12px] text-white">
                    ➜ Agendar horário
                  </p>
                )}
                {previewLink() && draft.link_mode === "text" && (
                  <p className="mt-1 text-[12px] text-white/80">{previewLink()}</p>
                )}
                <p className="mt-1 text-right text-[10px] text-white/40">
                  {new Date().toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={busy} onClick={() => void saveDraft()}>
                Salvar rascunho
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => void openTest()}>
                <Send className="mr-1 h-3.5 w-3.5" /> Testar
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void openSchedule()}
              >
                <CalendarClock className="mr-1 h-3.5 w-3.5" /> Agendar
              </Button>
              <Button disabled={busy} onClick={() => void openConfirm()}>
                <Megaphone className="mr-1 h-3.5 w-3.5" /> Enviar agora
              </Button>
              {editingId && (
                <Button
                  variant="ghost"
                  className="text-muted-foreground"
                  disabled={busy}
                  onClick={resetComposer}
                >
                  Nova campanha
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ---------- Lista ---------- */}
        <div className="space-y-3">
          <h2 className="font-display text-xl tracking-wide">Campanhas</h2>
          {campaigns.map((c) => (
            <Card key={c.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("pt-BR")}
                      {c.scheduled_at &&
                        c.status === "scheduled" &&
                        ` · agendada para ${new Date(c.scheduled_at).toLocaleString("pt-BR")}`}
                    </div>
                  </div>
                  <Badge
                    variant={
                      c.status === "sent"
                        ? "default"
                        : c.status === "sending"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {STATUS_LABEL[c.status] ?? c.status}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {c.message_text}
                </p>
                {(c.status === "sending" || c.status === "sent") && (
                  <p className="text-xs text-muted-foreground">
                    {c.sent_count} enviada(s) · {c.failed_count} falha(s)
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {c.status !== "sending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => edit(c)}
                    >
                      <Pencil className="mr-1 h-3 w-3" /> Editar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await dupFn({ data: { campaignId: c.id } });
                        toast.success("Campanha duplicada");
                        await refreshList();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Falha ao duplicar");
                      }
                    }}
                  >
                    <Copy className="mr-1 h-3 w-3" /> Duplicar
                  </Button>
                  {c.status === "scheduled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await cancelFn({ data: { campaignId: c.id } });
                          toast.success("Agendamento cancelado");
                          await refreshList();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Falha ao cancelar");
                        }
                      }}
                    >
                      <CalendarX2 className="mr-1 h-3 w-3" /> Cancelar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={async () => {
                      if (!confirm("Excluir esta campanha?")) return;
                      try {
                        await deleteFn({ data: { campaignId: c.id } });
                        toast.success("Campanha excluída");
                        if (editingId === c.id) resetComposer();
                        await refreshList();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Falha ao excluir");
                      }
                    }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!campaigns.length && (
            <p className="text-sm text-muted-foreground">
              Nenhuma campanha ainda. Crie a primeira à esquerda. 🚀
            </p>
          )}
        </div>
      </div>

      {/* ---------- Dialog: GPT texto ---------- */}
      <Dialog open={gptOpen} onOpenChange={setGptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escrever com GPT</DialogTitle>
            <DialogDescription>
              Descreva a ideia e o GPT escreve a mensagem no tom da barbearia.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              rows={4}
              placeholder="Ex.: Promoção de corte + barba para o sábado à tarde, destacando o visual premium"
              value={gptIdea}
              onChange={(e) => setGptIdea(e.target.value)}
            />
            <Select
              value={gptTone}
              onValueChange={(v) =>
                setGptTone(v as "casual" | "professional" | "urgency")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Tom descontraído</SelectItem>
                <SelectItem value="professional">Tom profissional</SelectItem>
                <SelectItem value="urgency">Tom de urgência</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              disabled={gptBusy}
              onClick={() => void runGptText()}
            >
              <Sparkles className="mr-1 h-4 w-4" />
              {gptBusy ? "Gerando..." : "Gerar texto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---------- Dialog: confirmar envio ---------- */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar campanha agora?</DialogTitle>
            <DialogDescription>
              {audCount === null
                ? "A campanha será enviada para o público escolhido."
                : `A campanha será enviada para ${audCount} cliente(s).`}{" "}
              O envio acontece em levas automáticas e continua em segundo plano.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Voltar
            </Button>
            <Button disabled={busy} onClick={() => void confirmSend()}>
              {busy ? "Iniciando..." : "Enviar agora"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---------- Dialog: agendar ---------- */}
      <Dialog open={schedOpen} onOpenChange={setSchedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar envio</DialogTitle>
            <DialogDescription>
              Escolha data e hora. O envio começa automaticamente (checado a
              cada 5 minutos).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="datetime-local"
              value={schedAt}
              onChange={(e) => setSchedAt(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSchedOpen(false)}>
                Voltar
              </Button>
              <Button
                disabled={busy || !schedAt}
                onClick={() => void confirmSchedule()}
              >
                {busy ? "Agendando..." : "Agendar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---------- Dialog: teste ---------- */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar teste</DialogTitle>
            <DialogDescription>
              Receba a campanha no seu WhatsApp antes de disparar para todos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Seu número com DDD"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTestOpen(false)}>
                Voltar
              </Button>
              <Button
                disabled={busy || !testPhone}
                onClick={() => void confirmTest()}
              >
                {busy ? "Enviando..." : "Enviar teste"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Miniatura de mídia com preview ampliado no hover
 * (imagem em 288px; vídeo com player embutido).
 */
function HoverMedia({
  url,
  kind,
  className,
  tooltipSide = "right",
}: {
  url: string;
  kind: "image" | "video";
  className?: string;
  tooltipSide?: "right" | "top" | "bottom" | "left";
}) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          {kind === "video" ? (
            <Video
              className={cn(
                "shrink-0 cursor-zoom-in text-muted-foreground",
                className,
              )}
            />
          ) : (
            <img
              src={url}
              alt="Mídia"
              className={cn(
                "shrink-0 cursor-zoom-in rounded object-cover",
                className,
              )}
            />
          )}
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className="p-1.5">
          {kind === "video" ? (
            <video
              src={url}
              controls
              muted
              autoPlay
              loop
              className="h-64 max-w-[320px] rounded"
            />
          ) : (
            <img
              src={url}
              alt="Prévia ampliada"
              className="h-72 w-72 rounded object-cover"
            />
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
