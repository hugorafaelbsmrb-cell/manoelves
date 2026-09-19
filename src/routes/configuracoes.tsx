import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { wapiStatus, wapiQr } from "@/lib/wapi.functions";
import { getIntegrationSettings, saveIntegrationSettings } from "@/lib/settings.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BannerUpload } from "@/components/banner-upload";
import { HaircutCatalogManager } from "@/components/haircut-catalog-manager";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/configuracoes")({
  ssr: false,
  head: () => ({ meta: [{ title: "Configurações — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

// Marcador para "limpar" um segredo no salvamento.
const CLEAR = "__CLEAR__";

type Settings = {
  mp_access_token: string;
  mp_public_key: string;
  mp_webhook_secret: string;
  whatsapp_token: string;
  whatsapp_phone_id: string;
  sighor_api_key: string;
  wapi_token: string;
  wapi_instance_id: string;
  openai_api_key: string;
  mp_configured: boolean;
  mp_webhook_configured: boolean;
  whatsapp_configured: boolean;
  sighor_configured: boolean;
  wapi_configured: boolean;
  openai_configured: boolean;
};

const empty: Settings = {
  mp_access_token: "",
  mp_public_key: "",
  mp_webhook_secret: "",
  whatsapp_token: "",
  whatsapp_phone_id: "",
  sighor_api_key: "",
  wapi_token: "",
  wapi_instance_id: "",
  openai_api_key: "",
  mp_configured: false,
  mp_webhook_configured: false,
  whatsapp_configured: false,
  sighor_configured: false,
  wapi_configured: false,
  openai_configured: false,
};

type Shop = {
  id?: string;
  name: string;
  address: string;
  phone: string;
  working_hours: string;
  map_embed_url: string;
  banner_url: string;
  logo_url: string;
  gallery_urls: string[];
};
type Birthday = {
  enabled: boolean;
  daysBefore: number;
  discountPct: number;
  template: string;
};

function Page() {
  const { isOwner, loading } = useAuth();
  const getSettingsFn = useServerFn(getIntegrationSettings);
  const saveSettingsFn = useServerFn(saveIntegrationSettings);
  const [s, setS] = useState<Settings>(empty);
  const [shop, setShop] = useState<Shop>({
    name: "",
    address: "",
    phone: "",
    working_hours: "",
    map_embed_url: "",
    banner_url: "",
    logo_url: "",
    gallery_urls: [],
  });
  const [bday, setBday] = useState<Birthday>({
    enabled: true,
    daysBefore: 7,
    discountPct: 15,
    template:
      "Olá {nome}! 🎉 Seu aniversário está chegando e queremos comemorar com você! Use o cupom *ANIVER{desconto}* e ganhe {desconto}% de desconto em qualquer serviço durante o mês do seu aniversário. Agende seu horário e venha celebrar! ✂️🎂",
  });
  const [saving, setSaving] = useState(false);
  const [shopSaving, setShopSaving] = useState(false);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [{ data: shopRow }, settings] = await Promise.all([
        supabase
          .from("barbershop")
          .select(
            "id, name, address, phone, working_hours, map_embed_url, banner_url, logo_url, gallery_urls",
          )
          .limit(1)
          .maybeSingle(),
        getSettingsFn().catch(() => null),
      ]);
      if (settings) {
        setS({
          ...empty,
          mp_public_key: settings.mp_public_key ?? "",
          mp_configured: settings.mp_configured,
          mp_webhook_configured: settings.mp_webhook_configured,
          whatsapp_configured: settings.whatsapp_configured,
          sighor_configured: settings.sighor_configured,
          wapi_configured: settings.wapi_configured,
          openai_configured: settings.openai_configured,
        });
        setBday({
          enabled: settings.birthday_notifications_enabled ?? true,
          daysBefore: settings.birthday_days_before ?? 7,
          discountPct: Number(settings.birthday_discount_pct ?? 15),
          template:
            settings.birthday_message_template ??
            "Olá {nome}! 🎉 Use o cupom *ANIVER{desconto}* para {desconto}% off no mês do seu aniversário.",
        });
      }
      if (shopRow) {
        const r = shopRow as Record<string, unknown>;
        setShop({
          id: r.id as string,
          name: (r.name as string) ?? "",
          address: (r.address as string) ?? "",
          phone: (r.phone as string) ?? "",
          working_hours: (r.working_hours as string) ?? "",
          map_embed_url: (r.map_embed_url as string) ?? "",
          banner_url: (r.banner_url as string) ?? "",
          logo_url: (r.logo_url as string) ?? "",
          gallery_urls: Array.isArray(r.gallery_urls)
            ? (r.gallery_urls as string[])
            : [],
        });
      }
    })();
  }, [getSettingsFn]);

  if (loading) return null;
  if (!isOwner) {
    return <p className="text-sm text-muted-foreground">Acesso restrito ao dono.</p>;
  }

  async function persistShop(patch: Partial<Shop>) {
    if (shop.id) {
      const { error } = await supabase
        .from("barbershop")
        .update(patch)
        .eq("id", shop.id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("barbershop")
        .insert({ name: "Mano Elves", ...patch })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (data) setShop((prev) => ({ ...prev, id: data.id }));
    }
  }

  async function saveShopBanner(url: string) {
    setShop((prev) => ({ ...prev, banner_url: url }));
    try {
      // vazio = sem banner (a landing cai no fundo padrão)
      await persistShop({ banner_url: url });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar banner");
    }
  }

  async function saveShopData() {
    setShopSaving(true);
    try {
      await persistShop({
        name: shop.name.trim() || "Mano Elves",
        address: shop.address.trim(),
        phone: shop.phone.trim(),
        working_hours: shop.working_hours.trim(),
        map_embed_url: shop.map_embed_url.trim(),
      });
      toast.success("Dados da barbearia salvos");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setShopSaving(false);
    }
  }

  async function addGalleryImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem.");
    if (file.size > 8 * 1024 * 1024) return toast.error("Imagem deve ter no máximo 8MB.");
    setGalleryBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `gallery/gallery-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const next = [...shop.gallery_urls, data.publicUrl];
      setShop((prev) => ({ ...prev, gallery_urls: next }));
      await persistShop({ gallery_urls: next });
      toast.success("Imagem adicionada à galeria");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGalleryBusy(false);
    }
  }

  async function removeGalleryImage(url: string) {
    const next = shop.gallery_urls.filter((u) => u !== url);
    setShop((prev) => ({ ...prev, gallery_urls: next }));
    try {
      await persistShop({ gallery_urls: next });
      toast.success("Imagem removida");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao remover");
    }
  }

  async function save() {
    setSaving(true);
    // vazio = mantém; CLEAR = limpa; preenchido = atualiza.
    const toValue = (v: string) => (v === CLEAR ? null : v === "" ? undefined : v);
    try {
      await saveSettingsFn({
        data: {
          mp_access_token: toValue(s.mp_access_token),
          mp_public_key: toValue(s.mp_public_key),
          mp_webhook_secret: toValue(s.mp_webhook_secret),
          whatsapp_token: toValue(s.whatsapp_token),
          whatsapp_phone_id: toValue(s.whatsapp_phone_id),
          sighor_api_key: toValue(s.sighor_api_key),
          wapi_token: toValue(s.wapi_token),
          wapi_instance_id: toValue(s.wapi_instance_id),
          openai_api_key: toValue(s.openai_api_key),
          birthday_notifications_enabled: bday.enabled,
          birthday_days_before: bday.daysBefore,
          birthday_discount_pct: bday.discountPct,
          birthday_message_template: bday.template,
        },
      });
      toast.success("Configurações salvas");
      // limpa marcadores de "limpar" após salvar
      setS((prev) => ({
        ...prev,
        mp_access_token: prev.mp_access_token === CLEAR ? "" : prev.mp_access_token,
        mp_webhook_secret: prev.mp_webhook_secret === CLEAR ? "" : prev.mp_webhook_secret,
        whatsapp_token: prev.whatsapp_token === CLEAR ? "" : prev.whatsapp_token,
        whatsapp_phone_id: prev.whatsapp_phone_id === CLEAR ? "" : prev.whatsapp_phone_id,
        sighor_api_key: prev.sighor_api_key === CLEAR ? "" : prev.sighor_api_key,
        wapi_token: prev.wapi_token === CLEAR ? "" : prev.wapi_token,
        openai_api_key: prev.openai_api_key === CLEAR ? "" : prev.openai_api_key,
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/public/mercadopago`
      : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Credenciais das integrações. Visíveis apenas para o dono.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Banner da barbearia</CardTitle>
        </CardHeader>
        <CardContent>
          <BannerUpload
            folder="barbershop"
            url={shop.banner_url}
            onSaved={(u) => void saveShopBanner(u)}
            label="Banner exibido no topo do site"
            hint="Recomendado 1920×480 (proporção 4:1). Aparece na página inicial."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da barbearia — site</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <Input
              value={shop.name}
              onChange={(e) => setShop({ ...shop, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">WhatsApp (com DDI e DDD)</Label>
            <Input
              value={shop.phone}
              onChange={(e) => setShop({ ...shop, phone: e.target.value })}
              placeholder="+55 11 99999-9999"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Endereço</Label>
            <Input
              value={shop.address}
              onChange={(e) => setShop({ ...shop, address: e.target.value })}
              placeholder="Rua, número - bairro, cidade - UF"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Horários (uma linha por dia)</Label>
            <Textarea
              rows={3}
              value={shop.working_hours}
              onChange={(e) =>
                setShop({ ...shop, working_hours: e.target.value })
              }
              placeholder={"Seg a Sex: 09h às 20h\nSábado: 09h às 18h\nDomingo: Fechado"}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Mapa (link de incorporação do Google Maps)</Label>
            <Textarea
              rows={3}
              value={shop.map_embed_url}
              onChange={(e) =>
                setShop({ ...shop, map_embed_url: e.target.value })
              }
              placeholder={"Cole o link src do embed (Google Maps → Compartilhar → Incorporar mapa). Vazio = mapa gerado pelo endereço."}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="button" onClick={() => void saveShopData()} disabled={shopSaving}>
              {shopSaving ? "Salvando..." : "Salvar dados do site"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Galeria da landing page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {shop.gallery_urls.map((url, i) => (
              <div key={url} className="relative">
                <img
                  src={url}
                  alt={`Imagem ${i + 1}`}
                  className="h-24 w-24 rounded-md border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => void removeGalleryImage(url)}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs text-white"
                  title="Remover"
                >
                  ×
                </button>
              </div>
            ))}
            <label className="cursor-pointer">
              <input
                ref={galleryFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={galleryBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void addGalleryImage(f);
                  e.target.value = "";
                }}
              />
              <span className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-border text-2xl text-muted-foreground hover:bg-secondary">
                +
              </span>
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {galleryBusy
              ? "Enviando…"
              : "Fotos exibidas na seção Galeria do site. Sem fotos, o site mostra as imagens de demonstração."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catálogo de cortes</CardTitle>
        </CardHeader>
        <CardContent>
          <HaircutCatalogManager />
        </CardContent>
      </Card>



      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aniversários — mensagem automática</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Notificações de aniversário</p>
              <p className="text-xs text-muted-foreground">
                Envia mensagem via WhatsApp (W-API) X dias antes do aniversário do cliente.
              </p>
            </div>
            <Switch
              checked={bday.enabled}
              onCheckedChange={(v) => setBday({ ...bday, enabled: v })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Antecedência (dias)</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={bday.daysBefore}
                onChange={(e) => setBday({ ...bday, daysBefore: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Desconto (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={bday.discountPct}
                onChange={(e) => setBday({ ...bday, discountPct: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Mensagem (placeholders: {"{nome}"}, {"{desconto}"})</Label>
            <Textarea
              rows={5}
              value={bday.template}
              onChange={(e) => setBday({ ...bday, template: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mercado Pago</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Access Token (privado)"
            placeholder="APP_USR-... ou TEST-..."
            value={s.mp_access_token}
            onChange={(v) => setS({ ...s, mp_access_token: v })}
            type="password"
            masked={s.mp_configured}
            onClear={() => setS({ ...s, mp_access_token: CLEAR })}
          />
          <Field
            label="Public Key"
            placeholder="APP_USR-..."
            value={s.mp_public_key}
            onChange={(v) => setS({ ...s, mp_public_key: v })}
          />
          <Field
            label="Webhook secret"
            placeholder="qualquer string forte"
            value={s.mp_webhook_secret}
            onChange={(v) => setS({ ...s, mp_webhook_secret: v })}
            masked={s.mp_webhook_configured}
            onClear={() => setS({ ...s, mp_webhook_secret: CLEAR })}
          />
          <div className="sm:col-span-2 rounded-md border border-dashed border-border bg-secondary/30 p-3 text-xs">
            <p className="font-medium text-foreground">URL de notificação (cole no painel do Mercado Pago):</p>
            <code className="mt-1 block break-all">{webhookUrl}</code>
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sighor — Signage TV</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="API Key"
            placeholder="sk_live_..."
            value={s.sighor_api_key}
            onChange={(v) => setS({ ...s, sighor_api_key: v })}
            type="password"
            masked={s.sighor_configured}
            onClear={() => setS({ ...s, sighor_api_key: CLEAR })}
          />
          <div className="rounded-md border border-dashed border-border bg-secondary/30 p-3 text-xs">
            <p className="font-medium text-foreground">Como obter:</p>
            <p className="mt-1 text-muted-foreground">
              Painel Sighor → Configurações → Chaves de API.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">W-API — WhatsApp API</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Token"
            placeholder="seu_token_do_painel"
            value={s.wapi_token}
            onChange={(v) => setS({ ...s, wapi_token: v })}
            type="password"
            masked={s.wapi_configured}
            onClear={() => setS({ ...s, wapi_token: CLEAR })}
          />
          <Field
            label="Instance ID"
            placeholder="ex.: X1A2B3-C4D5E6-F7G8H9"
            value={s.wapi_instance_id}
            onChange={(v) => setS({ ...s, wapi_instance_id: v })}
          />
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <TestWapi />
            <QrWapi />
            <p className="text-xs text-muted-foreground">
              Salve antes de usar. O QR code expira em ~20s (feche e abra de
              novo para atualizar). Também dá para conectar pelo painel da
              W-API.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">OpenAI — GPT (marketing)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="API Key"
            placeholder="sk-..."
            value={s.openai_api_key}
            onChange={(v) => setS({ ...s, openai_api_key: v })}
            type="password"
            masked={s.openai_configured}
            onClear={() => setS({ ...s, openai_api_key: CLEAR })}
          />
          <div className="rounded-md border border-dashed border-border bg-secondary/30 p-3 text-xs">
            <p className="font-medium text-foreground">Como obter:</p>
            <p className="mt-1 text-muted-foreground">
              plataforma.openai.com → API keys. Usada para escrever textos
              (gpt-4o-mini) e gerar imagens (gpt-image-1) das campanhas.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
}

function TestWapi() {
  const status = useServerFn(wapiStatus);
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const r = (await status()) as Record<string, unknown>;
          const st =
            (typeof r.state === "string" && r.state) ||
            (typeof r.status === "string" && r.status) ||
            "ok";
          toast.success(`W-API: ${st}`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Falha ao consultar W-API");
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Testando..." : "Testar conexão"}
    </Button>
  );
}

function QrWapi() {
  const qr = useServerFn(wapiQr);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        size="sm"
        disabled={loading}
        onClick={async () => {
          setOpen(true);
          setLoading(true);
          try {
            const r = await qr();
            setCode(r.qrcode);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Falha ao gerar QR");
          } finally {
            setLoading(false);
          }
        }}
      >
        Conectar via QR
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Escaneie no WhatsApp → Aparelhos conectados. O código expira em
            ~20s — feche e abra de novo para atualizar.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          {loading && <p className="text-sm text-muted-foreground">Gerando…</p>}
          {code && !loading && (
            <img
              src={code.startsWith("data:") ? code : `data:image/png;base64,${code}`}
              alt="QR code"
              className="h-64 w-64"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  masked,
  onClear,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  // Segredos nunca voltam do servidor: quando configurado, mostramos
  // placeholder indicando que está salvo; "Limpar" marca para apagar.
  masked?: boolean;
  onClear?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-muted-foreground hover:text-destructive"
          >
            Limpar
          </button>
        )}
      </div>
      <Input
        type={type}
        value={value}
        placeholder={masked ? "(salvo — deixe vazio para manter)" : placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
