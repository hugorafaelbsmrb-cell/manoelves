import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import logoUrl from "@/assets/manoelves-logo.png";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  requestClientOtp,
  verifyClientOtp,
} from "@/lib/client-auth.functions";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Mano Elves" }] }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <Link to="/" className="mb-8 flex flex-col items-center justify-center gap-3">
          <img src={logoUrl} alt="Mano Elves" className="h-20 w-auto" />
          <span className="font-display text-xl tracking-wider">MANO ELVES</span>
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <Tabs defaultValue="cliente" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cliente">Sou cliente</TabsTrigger>
              <TabsTrigger value="equipe">Equipe</TabsTrigger>
            </TabsList>
            <TabsContent value="cliente" className="mt-6">
              <ClientLoginForm />
            </TabsContent>
            <TabsContent value="equipe" className="mt-6">
              <StaffLoginForm />
            </TabsContent>
          </Tabs>
        </div>

        <Link
          to="/"
          className="mt-6 text-center text-xs text-muted-foreground hover:text-foreground"
        >
          ← Voltar para o site
        </Link>
      </div>
    </div>
  );
}

function ClientLoginForm() {
  const navigate = useNavigate();
  const askOtp = useServerFn(requestClientOtp);
  const checkOtp = useServerFn(verifyClientOtp);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await askOtp({ data: { phone } });
      toast.success("Enviamos um código no seu WhatsApp.");
      setStep("code");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar código");
    } finally {
      setLoading(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await checkOtp({ data: { phone, code } });
      localStorage.setItem("client_token", res.token);
      toast.success("Bem-vindo!");
      navigate({ to: "/cliente" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Código inválido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl tracking-wide">Acesso do cliente</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Entre apenas com seu número de WhatsApp.
      </p>

      {step === "phone" ? (
        <form onSubmit={sendCode} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              placeholder="(11) 91234-5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              maxLength={20}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Receber código no WhatsApp"}
          </Button>
        </form>
      ) : (
        <form onSubmit={confirm} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Código de 6 dígitos</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enviado para <span className="font-medium">{phone}</span>.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
            {loading ? "Verificando..." : "Entrar"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setCode("");
            }}
            className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Alterar número
          </button>
        </form>
      )}
    </div>
  );
}

function StaffLoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate({ to: "/agenda" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl tracking-wide">Entrar no painel</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Acesso para dono e barbeiros.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Aguarde..." : "Entrar"}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Apenas o dono pode criar novas contas pelo painel de barbeiros.
      </p>
    </div>
  );
}
