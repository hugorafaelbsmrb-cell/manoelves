import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Scissors, Calendar, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl, minutesLabel } from "@/lib/format";

export const Route = createFileRoute("/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Agendar com ${params.slug} — Mano Elves` },
      {
        name: "description",
        content: `Agende seu corte com o barbeiro ${params.slug} na Barbearia Mano Elves.`,
      },
    ],
  }),
  component: BarberPage,
});

function BarberPage() {
  const { slug } = Route.useParams();

  const { data: barber, isLoading } = useQuery({
    queryKey: ["barber", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, slug, bio, avatar_url, phone")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const { data: combos } = useQuery({
    queryKey: ["combos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("combos")
        .select("id, name, price_cents, combo_services(service_id, services(duration_minutes, name))")
        .eq("is_active", true);
      return data ?? [];
    },
  });

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, duration_minutes, price_cents")
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-xl items-center justify-between px-5 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Mano Elves
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Scissors className="h-3.5 w-3.5" /> barber.me/{barber?.slug}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-xl px-5 py-10 text-center">
        <div className="mx-auto h-28 w-28 overflow-hidden rounded-full bg-secondary">
          {barber?.avatar_url ? (
            <img
              src={barber.avatar_url}
              alt={barber.full_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-3xl">
              {barber?.full_name?.slice(0, 1)}
            </div>
          )}
        </div>
        <h1 className="mt-4 font-display text-4xl tracking-wide">
          {barber?.full_name}
        </h1>
        {barber?.bio && (
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
            {barber.bio}
          </p>
        )}
      </section>

      <section className="mx-auto max-w-xl px-5 pb-24">
        <h2 className="font-display text-xl tracking-wider">Combos</h2>
        <div className="mt-3 space-y-2">
          {combos?.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum combo configurado.</p>
          )}
          {combos?.map((c) => {
            const totalMin = (c.combo_services ?? []).reduce(
              (s: number, cs) =>
                s + ((cs.services as { duration_minutes?: number } | null)?.duration_minutes ?? 0),
              0,
            );
            return (
              <Link
                key={c.id}
                to="/b/$slug/agendar"
                params={{ slug: slug }}
                search={{ comboId: c.id }}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition hover:border-foreground/40"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {minutesLabel(totalMin)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg">{brl(c.price_cents)}</p>
                  <p className="text-xs text-muted-foreground">Agendar →</p>
                </div>
              </Link>
            );
          })}
        </div>

        <h2 className="mt-8 font-display text-xl tracking-wider">Serviços</h2>
        <div className="mt-3 space-y-2">
          {services?.map((s) => (
            <Link
              key={s.id}
              to="/b/$slug/agendar"
              params={{ slug }}
              search={{ serviceId: s.id }}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition hover:border-foreground/40"
            >
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {minutesLabel(s.duration_minutes)}
                </p>
              </div>
              <p className="font-display text-lg">{brl(s.price_cents)}</p>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-dashed border-border p-6 text-center">
          <Calendar className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">
            Selecione um combo ou serviço acima para escolher dia e horário.
          </p>
        </div>
      </section>
    </div>
  );
}
