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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/configuracoes")({
  ssr: false,
  head: () => ({ meta: [{ title: "Configurações — Mano Elves" }] }),
  component: () => (
    <AppShell>
      <Page />
    </AppShell>
  ),
});

type Settings = {
  id?: string;
  mp_access_token: string;
  mp_public_key: string;
  mp_webhook_secret: string;
  whatsapp_token: string;
  whatsapp_phone_id: string;
  sighor_api_key: string;
  uazapi_url: string;
  uazapi_token: string;
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
};

function Page() {
  const { isOwner, loading } = useAuth();
  const [s, setS] = useState<Settings>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("integration_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (data) {
        const d = data as typeof data & {
          sighor_api_key?: string | null;
          uazapi_url?: string | null;
          uazapi_token?: string | null;
        };
        setS({
          id: data.id,
          mp_access_token: data.mp_access_token ?? "",
          mp_public_key: data.mp_public_key ?? "",
          mp_webhook_secret: data.mp_webhook_secret ?? "",
          whatsapp_token: data.whatsapp_token ?? "",
          whatsapp_phone_id: data.whatsapp_phone_id ?? "",
          sighor_api_key: d.sighor_api_key ?? "",
          uazapi_url: d.uazapi_url ?? "",
          uazapi_token: d.uazapi_token ?? "",
        });
      }
    })();
  }, []);

  if (loading) return null;
  if (!isOwner) {
    return <p className="text-sm text-muted-foreground">Acesso restrito ao dono.</p>;
  }

  async function save() {
    setSaving(true);
    const payload = {
      mp_access_token: s.mp_access_token || null,
      mp_public_key: s.mp_public_key || null,
      mp_webhook_secret: s.mp_webhook_secret || null,
      whatsapp_token: s.whatsapp_token || null,
      whatsapp_phone_id: s.whatsapp_phone_id || null,
      sighor_api_key: s.sighor_api_key || null,
      uazapi_url: s.uazapi_url || null,
      uazapi_token: s.uazapi_token || null,
      updated_at: new Date().toISOString(),
    } as never;
    let res;
    if (s.id) {
      res = await supabase.from("integration_settings").update(payload).eq("id", s.id);
    } else {
      res = await supabase.from("integration_settings").insert(payload);
    }
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Configurações salvas");
  }

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/public/mercadopago${
          s.mp_webhook_secret ? `?secret=${encodeURIComponent(s.mp_webhook_secret)}` : ""
        }`
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
          <CardTitle className="text-base">Mercado Pago</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Access Token (privado)"
            placeholder="APP_USR-... ou TEST-..."
            value={s.mp_access_token}
            onChange={(v) => setS({ ...s, mp_access_token: v })}
            type="password"
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
          />
          <div className="sm:col-span-2 rounded-md border border-dashed border-border bg-secondary/30 p-3 text-xs">
            <p className="font-medium text-foreground">URL de notificação (cole no painel do Mercado Pago):</p>
            <code className="mt-1 block break-all">{webhookUrl}</code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">WhatsApp Cloud API</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Access Token"
            placeholder="EAAG..."
            value={s.whatsapp_token}
            onChange={(v) => setS({ ...s, whatsapp_token: v })}
            type="password"
          />
          <Field
            label="Phone Number ID"
            placeholder="1234567890"
            value={s.whatsapp_phone_id}
            onChange={(v) => setS({ ...s, whatsapp_phone_id: v })}
          />
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
