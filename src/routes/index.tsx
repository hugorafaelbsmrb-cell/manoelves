import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

import { Hero } from "@/components/landing/Hero";
import { Services } from "@/components/landing/Services";
import { Team } from "@/components/landing/Team";
import { Gallery } from "@/components/landing/Gallery";
import { Plans } from "@/components/landing/Plans";
import { Testimonials } from "@/components/landing/Testimonials";
import { Location } from "@/components/landing/Location";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Barbearia Manoel Eves — Agendamento Online" },
      {
        name: "description",
        content: "Escolha seu barbeiro e agende seu corte na Barbearia Manoel Eves em segundos.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const { user, loading, isOwner } = useAuth();

  // No app instalado (PWA standalone), não mostramos a landing: quem não
  // tem sessão vai direto ao login; quem já tem sessão salva vai direto
  // ao painel (sem precisar logar de novo, até deslogar dentro do sistema).
  useEffect(() => {
    if (loading) return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
    } else {
      navigate({ to: isOwner ? "/dashboard" : "/agenda", replace: true });
    }
  }, [loading, user, isOwner, navigate]);

  const { data: shop } = useQuery({
    queryKey: ["barbershop"],
    queryFn: async () => {
      const { data } = await supabase.from("barbershop").select("*").limit(1).single();
      return data;
    },
  });

  const { data: barbers } = useQuery({
    queryKey: ["public-barbers"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "barber");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, slug, bio, avatar_url")
        .in("id", ids)
        .eq("is_active", true)
        .not("slug", "is", null);
      return data ?? [];
    },
  });

  return (
    <div className="dark min-h-screen bg-[#0a0a0a] text-gray-200 font-sans selection:bg-[#d4a857] selection:text-black">
      <Hero shop={shop} />

      <div id="servicos">
        <Services />
      </div>

      <div id="equipe">
        <Team barbers={barbers || []} />
      </div>

      <div id="galeria">
        <Gallery shop={shop} />
      </div>

      <div id="planos">
        <Plans />
      </div>

      <div id="depoimentos">
        <Testimonials />
      </div>

      <div id="contato">
        <Location shop={shop} />
      </div>

      <Footer shop={shop} />
    </div>
  );
}
