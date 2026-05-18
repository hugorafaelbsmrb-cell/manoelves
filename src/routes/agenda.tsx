import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LogOut, Scissors, Calendar, Users, Package, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/agenda")({
  ssr: false,
  head: () => ({ meta: [{ title: "Agenda — Mano Elves" }] }),
  component: AgendaPage,
});

function AgendaPage() {
  const { user, isOwner, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const { data: appointments } = useQuery({
    queryKey: ["agenda-appts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("appointments")
        .select("id, client_name, start_at, end_at, status, total_cents, barber_id, profiles!appointments_barber_id_fkey(full_name)")
        .gte("start_at", today.toISOString())
        .order("start_at");
      return data ?? [];
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            <span className="font-display text-lg tracking-wider">MANO ELVES</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-xs text-muted-foreground">
              {user.email} {isOwner && "· dono"}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-1 h-3.5 w-3.5" /> Sair
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5 pb-2 text-sm">
          <NavItem to="/agenda" icon={<Calendar className="h-4 w-4" />} label="Agenda" />
          {isOwner && (
            <>
              <NavItem to="/agenda" icon={<Users className="h-4 w-4" />} label="Barbeiros (em breve)" disabled />
              <NavItem to="/agenda" icon={<Package className="h-4 w-4" />} label="Estoque (em breve)" disabled />
              <NavItem to="/agenda" icon={<BarChart3 className="h-4 w-4" />} label="Dashboard (em breve)" disabled />
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="font-display text-3xl tracking-wider">Agenda</h1>
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? "Você vê todos os agendamentos da barbearia."
            : "Você vê apenas seus próprios agendamentos."}
        </p>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          {!appointments || appointments.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nenhum agendamento ainda. Compartilhe o link da bio de um barbeiro
              para começar.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Quando</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Barbeiro</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      {format(new Date(a.start_at), "dd/MM HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3 font-medium">{a.client_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {(a.profiles as { full_name?: string } | null)?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {brl(a.total_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Próximos passos</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            <li>Calendário drag-and-drop visual</li>
            <li>PDV / comanda com produtos e split de pagamento</li>
            <li>Dashboards financeiros (dono e barbeiro)</li>
            <li>CRUD de barbeiros, serviços, estoque</li>
            <li>Clube de assinatura, fila de espera, reengajamento</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  disabled,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground/50">
        {icon} {label}
      </span>
    );
  }
  return (
    <Link
      to={to}
      activeProps={{ className: "bg-secondary text-foreground" }}
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
    >
      {icon} {label}
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending_payment: { label: "Aguardando Pix", cls: "bg-accent text-accent-foreground" },
    confirmed: { label: "Confirmado", cls: "bg-success/15 text-success" },
    completed: { label: "Concluído", cls: "bg-secondary text-secondary-foreground" },
    cancelled: { label: "Cancelado", cls: "bg-destructive/10 text-destructive" },
    no_show: { label: "No-show", cls: "bg-destructive/10 text-destructive" },
  };
  const s = map[status] ?? { label: status, cls: "bg-secondary" };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
