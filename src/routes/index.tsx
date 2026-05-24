import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Scissors, Instagram, MapPin, LogIn, CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HaircutCatalog } from "@/components/haircut-catalog";
import textureBg from "@/assets/texture-bg.jpg";
import logoUrl from "@/assets/manoelves-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Barbearia Mano Elves — Agendamento Online" },
      {
        name: "description",
        content:
          "Escolha seu barbeiro e agende seu corte na Barbearia Mano Elves em segundos.",
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
    <div className="dark relative min-h-screen bg-background text-foreground">
      {/* Textured background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.18] mix-blend-screen"
        style={{
          backgroundImage: `url(${textureBg})`,
          backgroundSize: "640px 640px",
          backgroundRepeat: "repeat",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,transparent_0%,hsl(var(--background))_75%)]"
      />

      <header className="relative border-b border-border/40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            {shop?.logo_url ? (
              <img
                src={shop.logo_url}
                alt={shop?.name ?? "Logo"}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <Scissors className="h-5 w-5" />
            )}
            <span className="font-display text-xl tracking-wider">
              {shop?.name?.toUpperCase() ?? "MANO ELVES"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogIn className="h-3.5 w-3.5" /> Área do cliente
            </Link>
          </div>
        </div>
      </header>

      {shop?.banner_url && (
        <div className="mx-auto max-w-5xl px-5 pt-6">
          <img
            src={shop.banner_url}
            alt="Banner Mano Elves"
            className="aspect-[4/1] w-full rounded-xl border border-border object-cover"
          />
        </div>
      )}

      <section className="relative mx-auto max-w-5xl px-5 py-16 text-center">
        {shop?.logo_url && (
          <img
            src={shop.logo_url}
            alt={shop?.name ?? "Logo"}
            className="mx-auto mb-6 h-24 w-24 rounded-full border border-border/60 object-cover shadow-[0_0_40px_0_rgba(255,255,255,0.08)]"
          />
        )}
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Barbearia
        </p>
        <h1 className="mt-4 font-display text-6xl sm:text-7xl">
          {shop?.name ?? "Mano Elves"}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Corte, barba e atendimento de primeira. Escolha seu barbeiro e reserve
          em segundos.
        </p>
        {shop?.address && (
          <p className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {shop.address}
          </p>
        )}
        <div className="mt-8 flex justify-center">
          <Link
            to="/agendar"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-8 py-4 text-sm font-semibold uppercase tracking-widest text-background shadow-[0_0_0_0_rgba(255,255,255,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_30px_0_rgba(255,255,255,0.25)]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
            <CalendarCheck className="h-4 w-4" />
            Agendar agora
          </Link>
        </div>
      </section>


      <section className="mx-auto max-w-5xl px-5 pb-10">
        <HaircutCatalog />
      </section>



      <section id="barbeiros" className="mx-auto max-w-5xl px-5 pb-20 scroll-mt-20">
        <h2 className="font-display text-2xl tracking-wider">Nossos barbeiros</h2>


        {!barbers || barbers.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nenhum barbeiro ativo ainda. Faça login no{" "}
            <Link to="/login" className="underline">
              painel
            </Link>{" "}
            para cadastrar a equipe.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.map((b) => (
              <Link
                key={b.id}
                to="/$slug"
                params={{ slug: b.slug! }}
                className="group rounded-xl border border-border bg-card p-5 transition hover:border-foreground/40"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-secondary text-lg font-display">
                    {b.avatar_url ? (
                      <img
                        src={b.avatar_url}
                        alt={b.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      b.full_name?.slice(0, 1) || "B"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-lg tracking-wide">
                      {b.full_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      barber.me/{b.slug}
                    </p>
                  </div>
                </div>
                {b.bio && (
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {b.bio}
                  </p>
                )}
                <p className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-foreground">
                  Agendar →
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        <Instagram className="mx-auto h-4 w-4" />
        <p className="mt-2">@barbearia.mano.elves</p>
      </footer>
    </div>
  );
}
