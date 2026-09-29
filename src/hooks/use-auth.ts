import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "barber";

export interface AuthState {
  loading: boolean;
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  isOwner: boolean;
  isBarber: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const finishLoading = () => {
      if (alive) setLoading(false);
    };

    const loadRoles = async (userId: string, onDone?: () => void) => {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        if (alive) setRoles((data ?? []).map((r) => r.role as AppRole));
      } catch (e) {
        console.error("[auth] erro ao carregar roles:", e);
      } finally {
        onDone?.();
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!alive) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // diferir para não chamar dentro do callback
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setRoles([]);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        if (!alive) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          loadRoles(s.user.id, finishLoading);
        } else {
          finishLoading();
        }
      })
      .catch((e) => {
        console.error("[auth] getSession falhou:", e);
        finishLoading();
      });

    // Rede/limite de segurança: nunca deixar a tela presa em "Carregando...".
    const safety = setTimeout(finishLoading, 10000);

    return () => {
      alive = false;
      clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    loading,
    user,
    session,
    roles,
    isOwner: roles.includes("owner"),
    isBarber: roles.includes("barber"),
  };
}
