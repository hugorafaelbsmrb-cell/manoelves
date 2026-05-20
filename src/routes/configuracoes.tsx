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
import { uazapiStatus } from "@/lib/uazapi.functions";

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
          <div className="sm:col-span-2 flex items-center gap-2">
            <TestUazapi />
            <p className="text-xs text-muted-foreground">
              Salve antes de testar. Verifica o status da instância em <code>/instance/status</code>.
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
