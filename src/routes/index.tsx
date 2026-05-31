import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
        content:
          "Escolha seu barbeiro e agende seu corte na Barbearia Manoel Eves em segundos.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
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
        <Gallery />
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
