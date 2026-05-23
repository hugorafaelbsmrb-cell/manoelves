import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Som curto de "ding" sintetizado via WebAudio — não precisa de asset.
 */
function playDing() {
  try {
    type WindowWithWebkit = Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const w = window as WindowWithWebkit;
    const Ctor = window.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const playNote = (freq: number, start: number, dur: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + start);
      g.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur);
    };
    playNote(880, 0, 0.25); // A5
    playNote(1318.5, 0.18, 0.35); // E6
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    /* noop */
  }
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NewAppointmentNotifier() {
  const queryClient = useQueryClient();
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    const channel = supabase
      .channel("owner-new-appointments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments" },
        (payload) => {
          const row = payload.new as {
            id: string;
            client_name: string;
            start_at: string;
            created_at: string;
          };
          // Ignora linhas antigas reentregues
          if (new Date(row.created_at).getTime() < mountedAt.current - 5000) {
            return;
          }
          playDing();
          toast.success("Novo agendamento!", {
            description: `${row.client_name} — ${fmtTime(row.start_at)}`,
            duration: 8000,
            icon: <CalendarPlus className="h-4 w-4" />,
          });
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return null;
}
