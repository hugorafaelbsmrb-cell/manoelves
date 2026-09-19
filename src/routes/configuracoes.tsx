import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { uazapiStatus, uazapiConnect, uazapiDisconnect } from "@/lib/uazapi.functions";
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
  uazapi_url: string;
  uazapi_token: string;
  mp_configured: boolean;
  mp_webhook_configured: boolean;
  whatsapp_configured: boolean;
  sighor_configured: boolean;
  uazapi_configured: boolean;
};

const empty: Settings = {
  mp_access_token: "",
  mp_public_key: "",
  mp_webhook_secret: "",
  whatsapp_token: "",
  whatsapp_phone_id: "",
  sighor_api_key: "",
  uazapi_url: "",
  uazapi_token: "",
  mp_configured: false,
  mp_webhook_configured: false,
  whatsapp_configured: false,
  sighor_configured: false,
  uazapi_configured: false,
};

type Shop = { id?: string; banner_url: string };
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
  const [shop, setShop] = useState<Shop>({ banner_url: "" });
  const [bday, setBday] = useState<Birthday>({
    enabled: true,
    daysBefore: 7,
    discountPct: 15,
    template:
      "Olá {nome}! 🎉 Seu aniversário está chegando e queremos comemorar com você! Use o cupom *ANIVER{desconto}* e ganhe {desconto}% de desconto em qualquer serviço durante o mês do seu aniversário. Agende seu horário e venha celebrar! ✂️🎂",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: shopRow }, settings] = await Promise.all([
        supabase.from("barbershop").select("id, banner_url").limit(1).maybeSingle(),
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
          uazapi_url: settings.uazapi_url ?? "",
          uazapi_configured: settings.uazapi_configured,
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
      if (shopRow) setShop({ id: shopRow.id, banner_url: (shopRow as { banner_url?: string }).banner_url ?? "" });
    })();
  }, [getSettingsFn]);

  if (loading) return null;
  if (!isOwner) {
    return <p className="text-sm text-muted-foreground">Acesso restrito ao dono.</p>;
  }

  async function saveShopBanner(url: string) {
    setShop((prev) => ({ ...prev, banner_url: url }));
    if (shop.id) {
      await supabase.from("barbershop").update({ banner_url: url || null }).eq("id", shop.id);
    } else {
      const { data } = await supabase.from("barbershop").insert({ banner_url: url || null, name: "Mano Elves" }).select("id").maybeSingle();
      if (data) setShop({ id: data.id, banner_url: url });
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
          uazapi_url: toValue(s.uazapi_url),
          uazapi_token: toValue(s.uazapi_token),
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
        uazapi_token: prev.uazapi_token === CLEAR ? "" : prev.uazapi_token,
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
                Envia mensagem via WhatsApp (uazapi) X dias antes do aniversário do cliente.
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
          <CardTitle className="text-base">uazapi — WhatsApp API</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="URL do servidor"
            placeholder="https://seusubdominio.uazapi.com"
            value={s.uazapi_url}
            onChange={(v) => setS({ ...s, uazapi_url: v })}
          />
          <Field
            label="Token da instância"
            placeholder="seu_token_da_instancia"
            value={s.uazapi_token}
            onChange={(v) => setS({ ...s, uazapi_token: v })}
            type="password"
            masked={s.uazapi_configured}
            onClear={() => setS({ ...s, uazapi_token: CLEAR })}
          />
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <TestUazapi />
            <ConnectUazapi />
            <DisconnectUazapi />
            <p className="text-xs text-muted-foreground">
              Salve antes de usar. Conectar gera um QR code para parear o WhatsApp.
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

function TestUazapi() {
  const status = useServerFn(uazapiStatus);
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
          const r = (await status()) as { instance?: { status?: string } } | Record<string, unknown>;
          const st =
            (r as { instance?: { status?: string } }).instance?.status ??
            (r as { status?: string }).status ??
            "ok";
          toast.success(`uazapi: ${st}`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Falha ao consultar uazapi");
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Testando..." : "Testar conexão"}
    </Button>
  );
}

function ConnectUazapi() {
  const connect = useServerFn(uazapiConnect);
  const statusFn = useServerFn(uazapiStatus);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [pair, setPair] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = (await statusFn()) as
          | { instance?: { status?: string } }
          | { status?: string }
          | Record<string, unknown>;
        const st =
          (r as { instance?: { status?: string } }).instance?.status ??
          (r as { status?: string }).status ??
          null;
        if (!stop && st) {
          setStatus(st);
          if (st === "connected" || st === "open") {
            setQr(null);
            setPair(null);
            toast.success("WhatsApp conectado");
            setOpen(false);
          }
        }
      } catch {
        // ignore polling errors
      }
    };
    const id = setInterval(tick, 3000);
    void tick();
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [open, statusFn]);

  async function run(usePhone: boolean) {
    setLoading(true);
    setQr(null);
    setPair(null);
    setStatus(null);
    try {
      const r = await connect({ data: usePhone && phone ? { phone } : {} });
      setQr(r.qrcode);
      setPair(r.paircode);
      setStatus(r.status);
      if (!r.qrcode && !r.paircode) {
        toast.success(`Status: ${r.status ?? "ok"}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao conectar");
    } finally {
      setLoading(false);
    }
  }

  const qrSrc = qr
    ? qr.startsWith("data:")
      ? qr
      : `data:image/png;base64,${qr}`
    : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) void run(false);
      }}
    >
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Conectar instância
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
          <DialogDescription>
            Escaneie o QR code no WhatsApp → Aparelhos conectados, ou use o código de
            pareamento informando seu número.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Gerando…</p>}
          {qrSrc && (
            <div className="flex justify-center">
              <img src={qrSrc} alt="QR code" className="h-64 w-64" />
            </div>
          )}
          {pair && (
            <p className="text-center font-mono text-lg tracking-widest">{pair}</p>
          )}
          {status && (
            <p className="text-center text-xs text-muted-foreground">Status: {status}</p>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Número com DDD (opcional, p/ paircode)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void run(true)}
            >
              Código
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={loading}
              onClick={() => void run(false)}
            >
              Atualizar QR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DisconnectUazapi() {
  const disconnect = useServerFn(uazapiDisconnect);
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
          await disconnect();
          toast.success("Instância desconectada");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Falha ao desconectar");
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Desconectando..." : "Desconectar"}
    </Button>
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
