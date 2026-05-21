import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CalendarDays,
  CalendarPlus,
  Clock,
  CreditCard,
  LogOut,
  Scissors,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  cancelClientAppointment,
  getClientPortalData,
} from "@/lib/client-auth.functions";

export const Route = createFileRoute("/cliente")({
  head: () => ({ meta: [{ title: "Área do cliente — Mano Elves" }] }),
  component: ClientePage,
});

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function ClientePage() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("client_token") : null;
    if (!t) {
      navigate({ to: "/login" });
      return;
    }
    setToken(t);
  }, [navigate]);

  const fetchData = useServerFn(getClientPortalData);
  const cancelFn = useServerFn(cancelClientAppointment);

  const query = useQuery({
    queryKey: ["client-portal", token],
    enabled: !!token,
    queryFn: () => fetchData({ data: { token: token! } }),
    retry: false,
  });

  useEffect(() => {
    if (query.error) {
      localStorage.removeItem("client_token");
      toast.error("Sessão expirada. Faça login novamente.");
      navigate({ to: "/login" });
    }
  }, [query.error, navigate]);

  const cancelMut = useMutation({
    mutationFn: (appointmentId: string) =>
      cancelFn({ data: { token: token!, appointmentId } }),
    onSuccess: () => {
      toast.success("Agendamento cancelado.");
      query.refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const data = query.data;

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const all = data?.appointments ?? [];
    return {
      upcoming: all
        .filter(
          (a) => a.status !== "cancelled" && new Date(a.start_at).getTime() >= now,
        )
        .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at)),
      past: all
        .filter((a) => new Date(a.start_at).getTime() < now)
        .slice(0, 10),
    };
  }, [data]);

  function logout() {
    localStorage.removeItem("client_token");
    navigate({ to: "/login" });
  }

  if (!token || query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Carregando...
      </div>
    );
  }
  if (!data) return null;

  const firstName = (data.clientName ?? "").split(" ")[0] || "cliente";
  const sub = data.subscriptions[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            <span className="font-display tracking-wider">MANO ELVES</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-5 py-6">
        <div>
          <h1 className="font-display text-3xl tracking-wide">Olá, {firstName} 👋</h1>
          <p className="text-sm text-muted-foreground">Sua área pessoal.</p>
        </div>

        {/* Assinatura */}
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg tracking-wide">Minha assinatura</h2>
          </div>
          {sub ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{sub.plan_name}</span>
                <Badge variant="secondary">{brl(sub.monthly_price_cents)}/mês</Badge>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span>
                  Créditos restantes:{" "}
                  <span className="font-medium text-foreground">
                    {sub.credits_remaining}
                  </span>
                </span>
                {sub.next_charge_at && (
                  <span>
                    Próxima cobrança:{" "}
                    <span className="font-medium text-foreground">
                      {new Date(sub.next_charge_at).toLocaleDateString("pt-BR")}
                    </span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Você ainda não tem um plano ativo.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link to="/">Ver planos disponíveis</Link>
              </Button>
            </div>
          )}
        </Card>

        {/* Próximos agendamentos */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg tracking-wide">Próximos horários</h2>
            </div>
            <Button asChild size="sm">
              <Link to="/">
                <CalendarPlus className="mr-2 h-4 w-4" /> Agendar
              </Link>
            </Button>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum horário marcado. Que tal agendar agora?
            </p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((a) => {
                const f = fmtDateTime(a.start_at);
                return (
                  <li
                    key={a.id}
                    className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {f.date} · {f.time}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {a.barber_name ?? "Barbeiro"}
                        {a.services.length > 0 && (
                          <> · {a.services.map((s) => s.name).join(", ")}</>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={cancelMut.isPending}
                      onClick={() => {
                        if (confirm("Cancelar este agendamento?")) {
                          cancelMut.mutate(a.id);
                        }
                      }}
                    >
                      Cancelar
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Histórico */}
        {past.length > 0 && (
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg tracking-wide">Histórico</h2>
            </div>
            <ul className="divide-y divide-border/60 text-sm">
              {past.map((a) => {
                const f = fmtDateTime(a.start_at);
                return (
                  <li key={a.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">
                        {f.date} · {f.time}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.barber_name ?? "—"}
                        {a.services.length > 0 && (
                          <> · {a.services.map((s) => s.name).join(", ")}</>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{brl(a.total_cents)}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {a.status === "completed"
                          ? "Concluído"
                          : a.status === "cancelled"
                            ? "Cancelado"
                            : a.status === "no_show"
                              ? "Não compareceu"
                              : a.status}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {/* Loja de conveniência */}
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg tracking-wide">Loja de conveniência</h2>
          </div>
          {data.products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum produto disponível no momento.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                Peça com o seu barbeiro no balcão.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data.products.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-border/60 p-3 text-center"
                  >
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {brl(p.price_cents)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
