import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, AUTH_MIRROR_KEY } from "@/integrations/supabase/client";

export type AppRole = "owner" | "barber";

export interface AuthState {
  loading: boolean;
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  isOwner: boolean;
  isBarber: boolean;
}

const EMPTY: AuthState = {
  loading: true,
  user: null,
  session: null,
  roles: [],
  isOwner: false,
  isBarber: false,
};

const AuthContext = createContext<AuthState | null>(null);

// Espelho da sessão gravada pelo supabase-js (ver client.ts). Permite boot
// instantâneo no PWA sem esperar o getSession/refresh de rede — que é lento
// no Android quando o token expirou e "deslogava" o usuário por timeout.
function readMirrorSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_MIRROR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.access_token && parsed.user) {
      return parsed as Session;
    }
  } catch {
    /* espelho corrompido: ignora e segue sem sessão */
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // loading=true só no primeiro frame (hidratação); o espelho é aplicado no
  // primeiro effect, então o app abre direto com a última sessão conhecida.
  const [state, setState] = useState<AuthState>(EMPTY);

  useEffect(() => {
    let alive = true;

    const applySession = (s: Session | null) => {
      if (!alive) return;
      setState((prev) => ({ ...prev, session: s, user: s?.user ?? null }));
    };

    const loadRoles = async (userId: string) => {
      try {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
        if (!alive) return;
        const roles = (data ?? []).map((r) => r.role as AppRole);
        setState((prev) => ({
          ...prev,
          roles,
          isOwner: roles.includes("owner"),
          isBarber: roles.includes("barber"),
        }));
      } catch (e) {
        console.error("[auth] erro ao carregar roles:", e);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (!alive) return;
      if (event === "SIGNED_OUT") {
        setState({ ...EMPTY, loading: false });
        return;
      }
      applySession(s);
      if (
        s?.user &&
        (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "USER_UPDATED")
      ) {
        loadRoles(s.user.id);
      }
    });

    // Boot síncrono pós-hidratação: renderiza já com a sessão do espelho;
    // o supabase-js valida/renova o token em background (TOKEN_REFRESHED ou
    // SIGNED_OUT atualizam este estado quando a rede responder).
    const mirror = readMirrorSession();
    if (mirror) {
      applySession(mirror);
      setState((prev) => ({ ...prev, loading: false }));
      loadRoles(mirror.user.id);
    } else {
      setState((prev) => ({ ...prev, loading: false }));
    }

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
