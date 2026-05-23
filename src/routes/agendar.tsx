import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/agendar")({
  head: () => ({
    meta: [
      { title: "Escolha seu barbeiro — Mano Elves" },
      {
        name: "description",
        content:
          "Escolha o barbeiro de sua preferência e siga para o agendamento na Barbearia Mano Elves.",
      },
    ],
  }),
  component: AgendarPage,
});

function AgendarPage() {
  const { data: barbers, isLoading } = useQuery({
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
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            <span className="font-display text-xl tracking-wider">MANO ELVES</span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-12 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Passo 1 de 3
        </p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">
          Escolha seu barbeiro
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Selecione o profissional de sua preferência para ver serviços, combos
          e horários disponíveis.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20">
        {isLoading ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Carregando barbeiros...
          </div>
        ) : !barbers || barbers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Nenhum barbeiro disponível no momento.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.map((b) => (
              <Link
                key={b.id}
                to="/$slug"
                params={{ slug: b.slug! }}
                className="group rounded-xl border border-border bg-card p-5 transition hover:border-foreground/40 hover:shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-secondary text-xl font-display">
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
                <p className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-foreground transition group-hover:gap-2">
                  Agendar com {b.full_name?.split(" ")[0]} →
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
