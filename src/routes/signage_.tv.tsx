import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signage_/tv")({
  ssr: false,
  head: () => ({ meta: [{ title: "TV — Mano Elves" }] }),
  component: TVPage,
  validateSearch: (s: Record<string, unknown>) => ({
    playlist: typeof s.playlist === "string" ? s.playlist : "",
    video: typeof s.video === "string" ? s.video : "",
    barber: typeof s.barber === "string" ? s.barber : "",
    sighor: typeof s.sighor === "string" ? s.sighor : "",
  }),
});

type SighorMedia = {
  id: string;
  name: string;
  type: "image" | "video" | "url" | "html" | "youtube" | "google_drive" | "rss";
  url: string;
};
type SighorItem = {
  id: string;
  position: number;
  duration: number | null;
  media?: SighorMedia | null;
};

type Appt = {
  id: string;
  client_name: string;
  start_at: string;
  end_at: string;
  status: string;
  barber_id: string;
};

type Profile = { id: string; full_name: string };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function TVPage() {
  const { playlist, video, barber } = Route.useSearch();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => new Date());
  const [shop, setShop] = useState<{ name: string; logo_url: string | null } | null>(null);

  // tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // load appointments today (+ refresh on tick)
  useEffect(() => {
    let cancel = false;
    async function load() {
      const startDay = new Date();
      startDay.setHours(0, 0, 0, 0);
      const endDay = new Date();
      endDay.setHours(23, 59, 59, 999);
      let q = supabase
        .from("appointments")
        .select("id, client_name, start_at, end_at, status, barber_id")
        .gte("start_at", startDay.toISOString())
        .lte("start_at", endDay.toISOString())
        .order("start_at", { ascending: true });
      if (barber) q = q.eq("barber_id", barber);
      const { data } = await q;
      if (cancel) return;
      const list = (data ?? []) as Appt[];
      setAppts(list);
      const ids = Array.from(new Set(list.map((a) => a.barber_id)));
      if (ids.length) {
        const { data: pr } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        if (!cancel) {
          const map: Record<string, string> = {};
          (pr as Profile[] | null)?.forEach((p) => (map[p.id] = p.full_name));
          setProfiles(map);
        }
      }
      const { data: bs } = await supabase.from("barbershop").select("name, logo_url").limit(1).maybeSingle();
      if (!cancel && bs) setShop(bs as { name: string; logo_url: string | null });
    }
    load();
    return () => {
      cancel = true;
    };
  }, [barber, now]);

  const { current, upcoming } = useMemo(() => {
    const nowMs = now.getTime();
    const current = appts.filter((a) => {
      const s = new Date(a.start_at).getTime();
      const e = new Date(a.end_at).getTime();
      return s <= nowMs && nowMs < e && a.status !== "cancelled";
    });
    const upcoming = appts
      .filter((a) => new Date(a.start_at).getTime() > nowMs && a.status !== "cancelled")
      .slice(0, 3);
    return { current, upcoming };
  }, [appts, now]);

  const ytSrc = playlist
    ? `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(
        playlist,
      )}&autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&rel=0`
    : video
      ? `https://www.youtube.com/embed/${encodeURIComponent(
          video,
        )}?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&rel=0&playlist=${encodeURIComponent(video)}`
      : null;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          {shop?.logo_url ? (
            <img src={shop.logo_url} alt="" className="h-9 w-9 rounded object-cover" />
          ) : null}
          <h1 className="font-display text-2xl tracking-wider">{shop?.name ?? "Barbearia"}</h1>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl tabular-nums">
            {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
        </div>
      </header>

      {/* Main grid: left = current, center = video, right = upcoming */}
      <main className="grid flex-1 grid-cols-12 gap-4 overflow-hidden p-4">
        {/* Current */}
        <section className="col-span-3 flex flex-col gap-3 overflow-hidden">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Em atendimento
          </h2>
          {current.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Nenhum atendimento agora
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-3 overflow-auto">
              {current.map((a) => (
                <article
                  key={a.id}
                  className="rounded-xl border border-primary/40 bg-primary/10 p-4 shadow-lg"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                    Agora
                  </p>
                  <p className="mt-1 truncate text-2xl font-bold">{a.client_name}</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {profiles[a.barber_id] ?? "Barbeiro"}
                  </p>
                  <p className="mt-2 font-mono text-lg tabular-nums">
                    {fmtTime(a.start_at)} → {fmtTime(a.end_at)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Video */}
        <section className="col-span-6 flex flex-col overflow-hidden">
          <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-black">
            {ytSrc ? (
              <iframe
                key={ytSrc}
                src={ytSrc}
                title="YouTube"
                className="absolute inset-0 h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
                <p className="mb-2 text-lg font-semibold text-foreground">Configure a playlist</p>
                <p className="max-w-md">
                  Adicione <code className="rounded bg-muted px-1">?playlist=PLAYLIST_ID</code> ou
                  <code className="ml-1 rounded bg-muted px-1">?video=VIDEO_ID</code> na URL para
                  exibir conteúdo do YouTube.
                </p>
                <p className="mt-3 text-xs">
                  Ex.:{" "}
                  <code className="rounded bg-muted px-1">/signage/tv?playlist=PLrAXtmRdnEQy...</code>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Upcoming */}
        <section className="col-span-3 flex flex-col gap-3 overflow-hidden">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Próximos
          </h2>
          {upcoming.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Sem agendamentos
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-3 overflow-auto">
              {upcoming.map((a, i) => (
                <article
                  key={a.id}
                  className="rounded-xl border border-border bg-card p-4"
                  style={{ opacity: 1 - i * 0.15 }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-mono text-2xl font-bold tabular-nums">
                      {fmtTime(a.start_at)}
                    </p>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      #{i + 1}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-lg font-semibold">{a.client_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {profiles[a.barber_id] ?? "Barbeiro"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-border px-6 py-2 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <Link to="/signage" className="hover:text-foreground">
          {shop?.name ?? "Mano Elves"} · Signage
        </Link>
      </footer>
    </div>
  );
}
