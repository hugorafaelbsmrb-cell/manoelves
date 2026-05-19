import { ReactNode, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Calendar,
  Scissors,
  Users,
  Package,
  BarChart3,
  Wallet,
  LogOut,
  Receipt,
  CreditCard,
  Clock,
  Heart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface NavLink {
  to: string;
  label: string;
  icon: ReactNode;
  ownerOnly?: boolean;
  barberOnly?: boolean;
}

const links: NavLink[] = [
  { to: "/agenda", label: "Agenda", icon: <Calendar className="h-4 w-4" /> },
  { to: "/comanda", label: "Comanda", icon: <Receipt className="h-4 w-4" /> },
  { to: "/dashboard", label: "Dashboard", icon: <BarChart3 className="h-4 w-4" />, ownerOnly: true },
  { to: "/meu-financeiro", label: "Meu financeiro", icon: <Wallet className="h-4 w-4" />, barberOnly: true },
  { to: "/servicos", label: "Serviços", icon: <Package className="h-4 w-4" />, ownerOnly: true },
  { to: "/barbeiros", label: "Barbeiros", icon: <Users className="h-4 w-4" />, ownerOnly: true },
  { to: "/assinaturas", label: "Assinaturas", icon: <CreditCard className="h-4 w-4" />, ownerOnly: true },
  { to: "/fila-espera", label: "Fila", icon: <Clock className="h-4 w-4" /> },
  { to: "/reengajamento", label: "Reengajar", icon: <Heart className="h-4 w-4" />, ownerOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, isOwner, isBarber } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

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

  const visible = links.filter((l) => {
    if (l.ownerOnly && !isOwner) return false;
    if (l.barberOnly && !isBarber) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            <span className="font-display text-lg tracking-wider">MANO ELVES</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user.email} {isOwner ? "· dono" : isBarber ? "· barbeiro" : ""}
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-1 h-3.5 w-3.5" /> Sair
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5 pb-2 text-sm">
          {visible.map((l) => {
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs ${
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {l.icon} {l.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
