import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Scissors, Calendar, Smartphone, CreditCard, Repeat, Tv, Bell,
  MessageCircle, Wallet, Settings, TrendingUp, ChevronLeft, ChevronRight,
  Maximize, Play, Clock, Star, CheckCircle2, BarChart3, Users, Sparkles,
  LogIn, MapPin, Instagram, ArrowLeft, Calendar as CalIcon,
  KeyRound, Download, Cake, Gift, Image as ImageIcon, BellRing, Lock,
  Package, ShoppingBag, Plus, Minus,
} from "lucide-react";
import logoUrl from "@/assets/manoelves-logo.png";
import cutFadeAlto from "@/assets/cuts/fade-alto.jpg";
import cutMidTaper from "@/assets/cuts/mid-taper.jpg";
import cutBuzzCut from "@/assets/cuts/buzz-cut.jpg";
import cutTexturizado from "@/assets/cuts/texturizado.jpg";
import cutPompadour from "@/assets/cuts/pompadour.jpg";
import cutCrewCut from "@/assets/cuts/crew-cut.jpg";
import cutBarbaCompleta from "@/assets/cuts/barba-completa.jpg";
import cutUndercut from "@/assets/cuts/undercut.jpg";


export const Route = createFileRoute("/apresentacao")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mano Elves — Apresentação do Sistema" },
      { name: "description", content: "Demonstração interativa do sistema de gestão da Barbearia Mano Elves." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PresentationPage,
});

/* =====================================================================
   SHELL
===================================================================== */

function PresentationPage() {
  const [i, setI] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const slides = useMemo(() => SLIDES, []);
  const total = slides.length;

  const go = useCallback((n: number) => setI((p) => Math.max(0, Math.min(total - 1, n))), [total]);
  const next = useCallback(() => go(i + 1), [go, i]);
  const prev = useCallback(() => go(i - 1), [go, i]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(total - 1);
      else if (e.key.toLowerCase() === "f") toggleFull();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, go, total]);

  function toggleFull() {
    const el = wrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  const Current = slides[i].component;

  return (
    <div
      ref={wrapRef}
      className="relative min-h-screen w-full overflow-hidden bg-neutral-950 text-neutral-100"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* slide canvas */}
      <div className="flex min-h-screen items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[1280px]">
          <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl">
            <div key={i} className="h-full w-full animate-fade-in">
              <Current />
            </div>
          </div>

          {/* footer controls */}
          <div className="mt-4 flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="font-mono">{String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
              <span className="hidden sm:inline">— {slides[i].title}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={prev}
                disabled={i === 0}
                className="flex h-9 items-center gap-1 rounded-md border border-neutral-800 px-3 hover:bg-neutral-800 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
              <button
                onClick={next}
                disabled={i === total - 1}
                className="flex h-9 items-center gap-1 rounded-md border border-neutral-800 bg-neutral-100 px-3 text-neutral-900 hover:bg-white disabled:opacity-30"
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={toggleFull}
                className="flex h-9 items-center gap-1 rounded-md border border-neutral-800 px-3 hover:bg-neutral-800"
                title="Tela cheia (F)"
              >
                <Maximize className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* dots */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {slides.map((s, idx) => (
              <button
                key={s.title}
                onClick={() => go(idx)}
                className={`h-1.5 flex-1 min-w-[14px] rounded-full transition-colors ${
                  idx === i ? "bg-neutral-100" : "bg-neutral-800 hover:bg-neutral-700"
                }`}
                title={`${idx + 1}. ${s.title}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   SLIDE FRAMEWORK
===================================================================== */

function Slide({
  kicker,
  title,
  description,
  children,
}: {
  kicker?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid h-full w-full grid-cols-1 lg:grid-cols-[42%_58%]">
      {/* texto */}
      <div className="flex flex-col justify-between bg-neutral-950 p-8 lg:p-12">
        <div className="space-y-3">
          {kicker ? (
            <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">{kicker}</p>
          ) : null}
          <h2
            className="text-4xl leading-[0.95] lg:text-6xl"
            style={{ fontFamily: '"Bebas Neue", Inter, sans-serif', letterSpacing: "0.01em" }}
          >
            {title}
          </h2>
          {description ? (
            <p className="max-w-prose text-sm leading-relaxed text-neutral-400 lg:text-base">
              {description}
            </p>
          ) : null}
        </div>
        <div className="mt-6 text-[10px] uppercase tracking-[0.3em] text-neutral-700">
          Mano Elves · Demo
        </div>
      </div>

      {/* mockup */}
      <div className="relative flex items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950 p-6 lg:p-10">
        <div className="w-full max-w-[640px] animate-scale-in">{children}</div>
      </div>
    </div>
  );
}

function Value({ items }: { items: { icon: React.ElementType; label: string; text: string }[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((v) => (
        <li key={v.label} className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-900">
            <v.icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-100">{v.label}</p>
            <p className="text-xs leading-relaxed text-neutral-400">{v.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* mockup chrome (browser + phone)
   When `src` is provided, embeds the actual app route in an iframe scaled
   to fit the chrome — so the slide always shows the real system UI. */
function ScaledIframe({
  src, baseWidth, baseHeight, dark = false,
}: { src: string; baseWidth: number; baseHeight: number; dark?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / baseWidth);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseWidth]);
  return (
    <div
      ref={wrapRef}
      className={`relative w-full overflow-hidden ${dark ? "bg-neutral-950" : "bg-white"}`}
      style={{ height: baseHeight * scale }}
    >
      <iframe
        src={src}
        title={src}
        loading="lazy"
        className="absolute left-0 top-0 border-0"
        style={{
          width: baseWidth,
          height: baseHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}

function Browser({ url, src, children }: { url: string; src?: string; children?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-300 bg-white shadow-xl">
      <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 text-[11px] text-neutral-500 ring-1 ring-neutral-200">
          {url}
        </div>
      </div>
      {src ? (
        <ScaledIframe src={src} baseWidth={1280} baseHeight={800} />
      ) : (
        <div className="bg-white text-neutral-900">{children}</div>
      )}
    </div>
  );
}

function Phone({ src, children }: { src?: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto w-[290px] rounded-[36px] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl">
      <div className="relative overflow-hidden rounded-[26px] bg-white">
        <div className="absolute left-1/2 top-1.5 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-neutral-900" />
        {src ? (
          <div className="overflow-hidden rounded-[26px]">
            <ScaledIframe src={src} baseWidth={390} baseHeight={672} />
          </div>
        ) : (
          <div className="h-[500px] overflow-hidden text-neutral-900">{children}</div>
        )}
      </div>
    </div>
  );
}

/* =====================================================================
   SLIDES
===================================================================== */

function S_Cover() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-neutral-950 p-12 text-neutral-100">
      <div className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px, 60px 60px",
        }}
      />
      <div className="relative max-w-3xl text-center">
        <img src={logoUrl} alt="Barbearia Mano Elves" className="mx-auto h-32 w-32 object-contain opacity-95" />
        <div className="mx-auto mt-2 inline-flex items-center gap-2 rounded-full border border-neutral-800 px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-neutral-400">
          <Sparkles className="h-3 w-3" /> Pitch de venda · 7 min
        </div>
        <h1
          className="mx-auto mt-6 max-w-2xl text-4xl leading-[0.95] lg:text-6xl"
          style={{ fontFamily: '"Bebas Neue", Inter, sans-serif' }}
        >
          A barbearia que fatura mais sem trabalhar mais.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm text-neutral-400 lg:text-base">
          Mano Elves é o sistema que enche a agenda, cobra automático e
          fideliza por assinatura — no piloto automático.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[11px] text-neutral-500">
          <Chip>+30% ocupação</Chip>
          <Chip>−70% no-show</Chip>
          <Chip>MRR recorrente</Chip>
          <Chip>0 planilha</Chip>
        </div>
      </div>
    </div>
  );
}

function S_Problem() {
  const dores = [
    { icon: Clock, t: "Agenda furada", d: "Cliente esquece, não avisa, e a cadeira fica vazia. Cada no-show é R$ 50–R$ 80 jogados fora." },
    { icon: MessageCircle, t: "WhatsApp virou recepcionista", d: "Você responde horário no sábado de manhã, na hora do almoço, no jantar. Cansa e ainda perde cliente." },
    { icon: Wallet, t: "Receita imprevisível", d: "Mês bom, mês ruim. Sem assinatura recorrente, todo dia 1 começa do zero." },
    { icon: BarChart3, t: "Caderno e planilha", d: "Não sabe quanto cada barbeiro faturou, quem é o melhor cliente, nem quem sumiu há 60 dias." },
  ];
  return (
    <div className="flex h-full w-full flex-col justify-center bg-neutral-950 p-10 text-neutral-100 lg:p-14">
      <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-500">O problema</p>
      <h2 className="mt-3 max-w-3xl text-3xl leading-[0.95] lg:text-5xl" style={{ fontFamily: '"Bebas Neue", Inter, sans-serif' }}>
        Sua barbearia está perdendo dinheiro todo dia — e você nem percebe.
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {dores.map((d) => (
          <div key={d.t} className="flex gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900">
              <d.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{d.t}</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-400">{d.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function S_Solution() {
  const pilares = [
    { icon: Calendar, t: "Agenda que vende sozinha", d: "Link único por barbeiro. Cliente agenda no Instagram às 23h sem você responder nada." },
    { icon: CreditCard, t: "Cobrança automática", d: "PIX e cartão no Mercado Pago. Lembrete e confirmação no WhatsApp — fim do no-show." },
    { icon: Repeat, t: "Assinatura recorrente", d: "Plano mensal de cortes. MRR previsível entrando todo dia 5." },
    { icon: Bell, t: "Relacionamento no automático", d: "Aniversário, retorno em 30 dias, reengajamento de quem sumiu — tudo disparado pelo sistema." },
  ];
  return (
    <div className="flex h-full w-full flex-col justify-center bg-neutral-950 p-10 text-neutral-100 lg:p-14">
      <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-500">A solução</p>
      <h2 className="mt-3 max-w-3xl text-3xl leading-[0.95] lg:text-5xl" style={{ fontFamily: '"Bebas Neue", Inter, sans-serif' }}>
        Um sistema. Quatro motores trabalhando por você.
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {pilares.map((d) => (
          <div key={d.t} className="flex gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900">
              <d.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{d.t}</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-400">{d.d}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 text-xs text-neutral-500">A seguir: 5 telas do sistema funcionando de verdade.</p>
    </div>
  );
}

function S_Proof() {
  return (
    <div className="flex h-full w-full flex-col justify-center bg-neutral-950 p-10 text-neutral-100 lg:p-14">
      <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-500">O retorno</p>
      <h2 className="mt-3 max-w-3xl text-3xl leading-[0.95] lg:text-5xl" style={{ fontFamily: '"Bebas Neue", Inter, sans-serif' }}>
        Conta de padaria: o sistema se paga na 1ª semana.
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { v: "+30%", l: "ocupação da agenda", d: "Fila de espera + reengajamento ativos." },
          { v: "−70%", l: "no-show", d: "Lembrete + PIX de garantia." },
          { v: "+R$ 8k", l: "MRR de assinaturas", d: "50 clientes × R$ 159/mês." },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-5xl" style={{ fontFamily: '"Bebas Neue", Inter, sans-serif' }}>{s.v}</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-neutral-400">{s.l}</p>
            <p className="mt-2 text-xs text-neutral-500">{s.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 text-sm text-neutral-300">
        <span className="font-semibold text-neutral-100">Exemplo real:</span> evitar 4 no-shows por semana = R$ 1.200/mês recuperados.
        Conquistar 10 assinantes = R$ 1.590/mês recorrentes. Em 30 dias, +R$ 2.790 no caixa.
      </div>
    </div>
  );
}

function S_Offer() {
  const inclusos = [
    { icon: Settings, t: "Implantação completa", d: "Setup do sistema + treinamento da equipe." },
    { icon: Sparkles, t: "Domínio + Hospedagem", d: "1 ano inclusos, sem custo adicional." },
    { icon: MessageCircle, t: "WhatsApp automático", d: "1 ano de envios (confirmação, lembrete, reengajamento)." },
    { icon: CheckCircle2, t: "5 ajustes inclusos", d: "Customizações sob medida após a entrega." },
  ];
  return (
    <div className="flex h-full w-full flex-col justify-center bg-neutral-950 p-10 text-neutral-100 lg:p-14">
      <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-500">A oferta</p>
      <h2 className="mt-3 max-w-3xl text-3xl leading-[0.95] lg:text-5xl" style={{ fontFamily: '"Bebas Neue", Inter, sans-serif' }}>
        Investimento único. Tudo incluso. Sem mensalidade.
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* Preço */}
        <div className="rounded-2xl border-2 border-neutral-100 bg-neutral-900 p-6 shadow-[0_0_40px_-10px_rgba(255,255,255,0.4)]">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-neutral-100">Pacote completo</p>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-semibold text-neutral-900">MELHOR OFERTA</span>
          </div>

          <div className="mt-5 flex items-baseline gap-2">
            <p className="text-5xl lg:text-6xl" style={{ fontFamily: '"Bebas Neue", Inter, sans-serif' }}>R$ 1.350</p>
            <span className="text-sm text-neutral-400">à vista</span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">PIX ou cartão · pagamento único</p>

          <div className="my-4 h-px bg-neutral-800" />

          <div className="flex items-baseline gap-2">
            <p className="text-2xl lg:text-3xl text-neutral-300" style={{ fontFamily: '"Bebas Neue", Inter, sans-serif' }}>R$ 500 + 4× R$ 300</p>
          </div>
          <p className="mt-1 text-xs text-neutral-500">entrada de R$ 500 e 4 parcelas de R$ 300 · total parcelado: R$ 1.700</p>

          <p className="mt-6 text-[11px] uppercase tracking-widest text-emerald-400">
            Economize R$ 350 pagando à vista
          </p>
        </div>

        {/* Inclusos */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <p className="text-xs uppercase tracking-widest text-neutral-400">O que está incluso</p>
          <ul className="mt-4 space-y-3">
            {inclusos.map((it) => (
              <li key={it.t} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900">
                  <it.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-100">{it.t}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-400">{it.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 text-xs text-neutral-500">
        Após 1 ano, renovação opcional de domínio + WhatsApp por valor simbólico.
      </p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-neutral-800 px-3 py-1">{children}</span>;
}

/* ---------- Reusable "real system" UI fragments (dark theme like the app) ---------- */

function AppBrowser({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-700 bg-neutral-950 shadow-2xl">
      <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 flex-1 truncate rounded-md bg-neutral-950 px-3 py-1 text-[11px] text-neutral-400 ring-1 ring-neutral-800">
          {url}
        </div>
      </div>
      <div className="bg-neutral-950 text-neutral-100">{children}</div>
    </div>
  );
}

function DarkPhone({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[290px] rounded-[36px] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl">
      <div className="relative overflow-hidden rounded-[26px] bg-neutral-950">
        <div className="absolute left-1/2 top-1.5 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-neutral-900" />
        <div className="h-[500px] overflow-hidden text-neutral-100">{children}</div>
      </div>
    </div>
  );
}

function S_Home() {
  return (
    <Slide
      kicker="Página 1 · Home pública"
      title="Vitrine digital da barbearia"
      description="A home pública apresenta a marca, os barbeiros e o caminho direto para o agendamento — tema escuro, tipografia forte, zero fricção."
    >
      <AppBrowser url="manoelves.com.br">
        {/* header igual ao /index */}
        <div className="flex items-center justify-between border-b border-neutral-800/60 px-5 py-3">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            <span style={{ fontFamily: '"Bebas Neue"' }} className="text-base tracking-wider">MANO ELVES</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 px-2 py-1 text-[10px] text-neutral-400">
            <LogIn className="h-3 w-3" /> Painel
          </span>
        </div>
        {/* hero */}
        <div className="px-5 py-7 text-center">
          <img src={logoUrl} alt="" className="mx-auto h-16 w-16 object-contain opacity-90" />
          <p className="mt-3 text-[9px] uppercase tracking-[0.3em] text-neutral-500">Barbearia</p>
          <h1 style={{ fontFamily: '"Bebas Neue"' }} className="mt-1 text-4xl tracking-wide">Mano Elves</h1>
          <p className="mx-auto mt-2 max-w-xs text-[10px] text-neutral-400">
            Corte, barba e atendimento de primeira. Escolha seu barbeiro e reserve em segundos.
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-[9px] text-neutral-500">
            <MapPin className="h-2.5 w-2.5" /> Rua das Tesouras, 123 — Centro
          </p>
        </div>
        {/* barbeiros */}
        <div className="px-5 pb-5">
          <h2 style={{ fontFamily: '"Bebas Neue"' }} className="text-sm tracking-wider">Nossos barbeiros</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {["João","Pedro","Carlos"].map((n) => (
              <div key={n} className="rounded-lg border border-neutral-800 bg-neutral-900 p-2">
                <div className="flex items-center gap-2">
                  <div style={{ fontFamily: '"Bebas Neue"' }} className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-sm">{n[0]}</div>
                  <div className="min-w-0">
                    <p style={{ fontFamily: '"Bebas Neue"' }} className="truncate text-[11px] tracking-wide">{n}</p>
                    <p className="truncate text-[8px] text-neutral-500">barber.me/{n.toLowerCase()}</p>
                  </div>
                </div>
                <p className="mt-2 text-[8px] text-neutral-100">Agendar →</p>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-neutral-800/60 py-2 text-center text-[8px] text-neutral-500">
          <Instagram className="mx-auto h-3 w-3" /> @barbearia.mano.elves
        </div>
      </AppBrowser>
      <Value
        items={[
          { icon: Sparkles, label: "Marca forte", text: "Identidade visual coesa que transmite profissionalismo desde o primeiro clique." },
          { icon: Users, label: "Captura de clientes", text: "Convite claro para agendar — transforma visitas em horários marcados." },
        ]}
      />
    </Slide>
  );
}

function S_BarberLanding() {
  return (
    <Slide
      kicker="Página 2 · Landing do barbeiro"
      title="Cada barbeiro com sua própria página"
      description="Um link único para cada profissional (ex.: /b/joao). Ele compartilha no Instagram, no status do WhatsApp, no cartão — e o cliente cai direto na agenda dele."
    >
      <DarkPhone>
        {/* header igual ao /b/$slug */}
        <div className="flex items-center justify-between border-b border-neutral-800/60 px-4 py-3 pt-7">
          <span className="inline-flex items-center gap-1 text-[9px] text-neutral-400">
            <ArrowLeft className="h-2.5 w-2.5" /> Mano Elves
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] text-neutral-400">
            <Scissors className="h-2.5 w-2.5" /> barber.me/joao
          </span>
        </div>
        {/* avatar + nome + bio */}
        <div className="px-5 py-5 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-neutral-800">
            <span style={{ fontFamily: '"Bebas Neue"' }} className="text-3xl">J</span>
          </div>
          <h1 style={{ fontFamily: '"Bebas Neue"' }} className="mt-3 text-2xl tracking-wide">João Silva</h1>
          <p className="mx-auto mt-1 max-w-[200px] text-[10px] leading-snug text-neutral-400">
            Barbeiro há 8 anos. Especialista em fade e barba na navalha.
          </p>
        </div>
        {/* combos */}
        <div className="px-4">
          <h2 style={{ fontFamily: '"Bebas Neue"' }} className="text-[13px] tracking-wider">Combos</h2>
          <div className="mt-1.5 space-y-1.5">
            <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-2.5">
              <div>
                <p className="text-[11px] font-medium">Corte + Barba</p>
                <p className="text-[9px] text-neutral-500">50 min</p>
              </div>
              <div className="text-right">
                <p style={{ fontFamily: '"Bebas Neue"' }} className="text-base">R$ 75</p>
                <p className="text-[8px] text-neutral-500">Agendar →</p>
              </div>
            </div>
          </div>
          {/* serviços */}
          <h2 style={{ fontFamily: '"Bebas Neue"' }} className="mt-3 text-[13px] tracking-wider">Serviços</h2>
          <div className="mt-1.5 space-y-1.5">
            {[
              {n:"Corte tradicional", d:"30 min", p:"R$ 50"},
              {n:"Barba na navalha", d:"20 min", p:"R$ 35"},
            ].map((s) => (
              <div key={s.n} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-2.5">
                <div>
                  <p className="text-[11px] font-medium">{s.n}</p>
                  <p className="text-[9px] text-neutral-500">{s.d}</p>
                </div>
                <p style={{ fontFamily: '"Bebas Neue"' }} className="text-base">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </DarkPhone>
      <Value
        items={[
          { icon: Smartphone, label: "Marketing pessoal", text: "Cada barbeiro vira embaixador: link próprio, próprio portfólio, próprios clientes." },
          { icon: TrendingUp, label: "Mais reservas", text: "Sem ligações, sem mensagens — o cliente escolhe serviço e horário sozinho." },
          { icon: Star, label: "Mesmo visual do sistema", text: "Página pública usa exatamente os mesmos componentes do painel — consistência total." },
        ]}
      />
    </Slide>
  );
}


function S_PublicBooking() {
  return (
    <Slide
      kicker="Página 3 · Agendamento + login por SMS"
      title="Agenda, recebe código, já entra no app"
      description="O cliente escolhe serviço e horário, recebe um código de 6 dígitos no WhatsApp (válido por 48h para economizar mensagens) e é direcionado para a área dele — pronto para virar cliente recorrente."
    >
      <div className="grid grid-cols-2 gap-4">
        <DarkPhone>
          <div className="px-4 pt-8 animate-fade-in">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">Escolha o horário</p>
            <p className="mt-1 text-[12px] font-semibold">Quarta, 21 de maio</p>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {["09:00","09:30","10:00","10:30","11:00","11:30","14:00","14:30","15:00"].map((h, idx) => (
                <div
                  key={h}
                  className={`rounded-md border py-1.5 text-center text-[10px] ${
                    idx === 4 ? "border-neutral-100 bg-neutral-100 text-neutral-900" : "border-neutral-800 text-neutral-300"
                  }`}
                >{h}</div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 p-2.5">
              <p className="text-[9px] uppercase tracking-widest text-neutral-500">Resumo</p>
              <p className="mt-1 text-[11px] font-semibold">Corte + Barba · 50 min</p>
              <p className="text-[10px] text-neutral-500">Qua 21/05 · 11:00 · R$ 75</p>
            </div>
            <div className="mt-2 rounded-md bg-neutral-100 py-2 text-center text-[11px] font-semibold text-neutral-900">
              Receber código no WhatsApp
            </div>
          </div>
        </DarkPhone>
        <DarkPhone>
          <div className="px-4 pt-8 animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-400">
              <KeyRound className="h-3.5 w-3.5" />
              <p className="text-[10px] uppercase tracking-widest">Confirme seu número</p>
            </div>
            <p className="mt-2 text-[11px] text-neutral-300">Enviamos um código para</p>
            <p className="text-[12px] font-semibold">+55 11 9•••• 4321</p>
            <div className="mt-3 grid grid-cols-6 gap-1">
              {["4","8","2","9","1","7"].map((d, i) => (
                <div key={i} className="flex h-9 items-center justify-center rounded-md border border-neutral-700 bg-neutral-900 text-[14px] font-bold">
                  {d}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[9px] text-neutral-500">Código válido por 48h · economiza envios</p>
            <div className="mt-3 rounded-md bg-emerald-500/15 p-2 text-[10px] text-emerald-300">
              ✓ Agendamento confirmado<br />Redirecionando para sua área…
            </div>
          </div>
        </DarkPhone>
      </div>
      <Value
        items={[
          { icon: KeyRound, label: "Autenticação sem fricção", text: "Sem senha, sem cadastro chato — código no WhatsApp e pronto." },
          { icon: Wallet, label: "Economia no envio", text: "Código vale 48h: 1 mensagem cobre várias sessões do mesmo cliente." },
        ]}
      />
    </Slide>
  );
}

function S_Catalog() {
  return (
    <Slide
      kicker="Novidade · Catálogo de cortes"
      title="Carrossel visual para o cliente escolher o estilo"
      description="O dono sobe fotos dos cortes pelo painel. O carrossel aparece na home e na área do cliente — quem agenda já sabe exatamente o que quer."
    >
      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
        <p className="text-[10px] uppercase tracking-widest text-neutral-500">Catálogo de cortes</p>
        <p style={{ fontFamily: '"Bebas Neue"' }} className="text-xl tracking-wider text-neutral-100">Inspirações da casa</p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            { n: "Fade alto", src: cutFadeAlto },
            { n: "Mid taper", src: cutMidTaper },
            { n: "Buzz cut", src: cutBuzzCut },
            { n: "Texturizado", src: cutTexturizado },
            { n: "Pompadour", src: cutPompadour },
            { n: "Crew cut", src: cutCrewCut },
            { n: "Barba completa", src: cutBarbaCompleta },
            { n: "Undercut", src: cutUndercut },
          ].map((c, i) => (
            <div
              key={c.n}
              className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900"
              style={{ animation: `fade-in 0.4s ease-out ${i * 60}ms both` }}
            >
              <img
                src={c.src}
                alt={c.n}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/85 via-black/30 to-transparent p-2">
                <p className="text-[10px] font-semibold text-neutral-100">{c.n}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-[9px] text-neutral-500">
          <span>← Deslize para ver mais</span>
          <span>8 estilos · gerenciado em /configurações</span>
        </div>
      </div>
      <Value
        items={[
          { icon: Sparkles, label: "Vende o resultado", text: "Cliente compra estilo, não corte genérico — eleva ticket e satisfação." },
          { icon: ImageIcon, label: "Editável pelo dono", text: "Sem mexer em código: upload de foto, nome e ordem — pronto." },
        ]}
      />
    </Slide>
  );
}

function S_ClientArea() {
  return (
    <Slide
      kicker="Novidade · Área do cliente"
      title="Cada cliente com seu app de bolso"
      description="Histórico, próximos cortes, catálogo e ofertas — tudo na palma da mão. Instalável como app (PWA) e popup pedindo a data de nascimento na primeira entrada."
    >
      <div className="relative grid grid-cols-2 gap-4">
        <DarkPhone>
          <div className="px-4 pt-8 animate-fade-in">
            <p style={{ fontFamily: '"Bebas Neue"' }} className="text-xl tracking-wider">Olá, Lucas</p>
            <p className="text-[9px] text-neutral-500">cliente desde mar/2024</p>

            <div className="mt-3 rounded-lg border border-primary/40 bg-primary/10 p-2.5">
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/20 text-primary">
                  <Download className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold text-neutral-100">Instale o app</p>
                  <p className="text-[8px] text-neutral-400">Acesso rápido ao seu agendamento</p>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[9px] uppercase tracking-widest text-neutral-500">Próximo corte</p>
            <div className="mt-1 rounded-lg border border-neutral-800 bg-neutral-900 p-2">
              <p className="text-[11px] font-semibold">Qua, 21/05 · 11:00</p>
              <p className="text-[9px] text-neutral-500">Corte + Barba · com João</p>
            </div>

            <p className="mt-3 text-[9px] uppercase tracking-widest text-neutral-500">Inspirações</p>
            <div className="mt-1 flex gap-1.5 overflow-hidden">
              {["Fade","Taper","Buzz","Pomp"].map((n, i) => (
                <div
                  key={n}
                  className="aspect-[3/4] w-12 shrink-0 overflow-hidden rounded-md border border-neutral-800 bg-gradient-to-br from-neutral-700 to-neutral-900 p-1"
                  style={{ animation: `slide-in-right 0.35s ease-out ${i * 80}ms both` }}
                >
                  <p className="mt-auto text-[7px] font-semibold text-neutral-200">{n}</p>
                </div>
              ))}
            </div>
          </div>
        </DarkPhone>
        <DarkPhone>
          <div className="relative px-4 pt-8">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 opacity-50">
              <p className="text-[10px] text-neutral-500">Olá, Lucas…</p>
              <div className="mt-2 h-12 rounded bg-neutral-800" />
              <div className="mt-2 h-10 rounded bg-neutral-800" />
            </div>
            {/* popup aniversário */}
            <div
              className="absolute inset-x-3 top-12 rounded-xl border border-pink-500/40 bg-neutral-950 p-3 shadow-2xl"
              style={{ animation: "scale-in 0.4s ease-out 0.2s both" }}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500/20 text-pink-300">
                  <Cake className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-neutral-100">Quando você nasceu?</p>
                  <p className="text-[8px] text-neutral-400">Para ganhar mimo de aniversário 🎁</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <div className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-center text-[10px]">15</div>
                <div className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-center text-[10px]">Jun</div>
                <div className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-center text-[10px]">1992</div>
              </div>
              <div className="mt-2 rounded-md bg-pink-500 py-1.5 text-center text-[10px] font-semibold text-white">
                Salvar
              </div>
            </div>
          </div>
        </DarkPhone>
      </div>
      <Value
        items={[
          { icon: Smartphone, label: "PWA instalável", text: "Banner discreto convida a instalar — o cliente vira recorrente." },
          { icon: Gift, label: "Aniversário capturado", text: "Popup amigável na primeira entrada alimenta campanhas automáticas." },
        ]}
      />
    </Slide>
  );
}

function S_OwnerNotification() {
  return (
    <Slide
      kicker="Novidade · Alerta em tempo real"
      title="Novo agendamento? O dono ouve na hora"
      description="Toda reserva dispara um toast no painel do dono — com som de alerta sintetizado (sem arquivo externo). Operação acompanha o pulso da loja sem precisar dar F5."
    >
      <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 p-4 shadow-2xl">
        {/* fake dashboard background */}
        <div className="opacity-40">
          <p style={{ fontFamily: '"Bebas Neue"' }} className="text-lg tracking-wider text-neutral-100">Agenda · hoje</p>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-neutral-800" />
            ))}
          </div>
        </div>

        {/* toast notification animated in */}
        <div
          className="absolute right-4 top-4 w-[260px] rounded-xl border border-emerald-500/40 bg-neutral-900 p-3 shadow-2xl"
          style={{ animation: "slide-in-right 0.5s ease-out 0.3s both" }}
        >
          <div className="flex items-start gap-2">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                <BellRing className="h-4 w-4" />
              </div>
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" style={{ animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite" }} />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-neutral-100">Novo agendamento</p>
              <p className="text-[10px] text-neutral-400">Lucas marcou Corte + Barba</p>
              <p className="mt-0.5 text-[10px] text-emerald-300">Hoje · 11:00 · com João</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[9px] text-neutral-500">
            <span>🔔 ding · 0.4s</span>
            <span>Agora</span>
          </div>
        </div>
      </div>
      <Value
        items={[
          { icon: BellRing, label: "Som sintetizado", text: "Ding gerado via WebAudio (A5 + E6) — sem dependência de arquivo MP3." },
          { icon: Bell, label: "Realtime do banco", text: "Postgres changes via Supabase Realtime — toast aparece em < 1s." },
        ]}
      />
    </Slide>
  );
}

function S_AdminAccess() {
  return (
    <Slide
      kicker="Segurança · Contas controladas"
      title="Só o dono cria barbeiros"
      description="Login público de equipe foi removido. Quem entra no painel é cadastrado pelo dono na tela de Barbeiros — zero risco de auto-cadastro indevido."
    >
      <Browser url="app.manoelves.com.br/barbeiros">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <p style={{ fontFamily: '"Bebas Neue"' }} className="text-lg tracking-wider">Equipe</p>
            <div className="rounded-md bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold text-white">
              + Novo barbeiro
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {[
              {n:"João Silva",e:"joao@manoelves.com.br",r:"barbeiro"},
              {n:"Pedro Alves",e:"pedro@manoelves.com.br",r:"barbeiro"},
              {n:"Elves (dono)",e:"elves@manoelves.com.br",r:"dono"},
            ].map((u) => (
              <div key={u.e} className="flex items-center justify-between rounded-lg border border-neutral-200 p-2.5 text-[11px]">
                <div>
                  <p className="font-semibold">{u.n}</p>
                  <p className="text-[9px] text-neutral-500">{u.e}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${u.r==="dono"?"bg-neutral-900 text-white":"bg-neutral-100 text-neutral-700"}`}>{u.r}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-[10px] text-amber-800">
            <Lock className="mr-1 inline h-3 w-3" />
            Página de login não tem mais "Criar conta" — apenas e-mail e senha.
          </div>
        </div>
      </Browser>
      <Value
        items={[
          { icon: Lock, label: "Sem auto-cadastro", text: "Ninguém entra no painel sem aprovação do dono." },
          { icon: Users, label: "Papéis claros", text: "owner × barber separados via user_roles + RLS — segurança em camadas." },
        ]}
      />
    </Slide>
  );
}


function S_Agenda() {
  return (
    <Slide
      kicker="Painel 1 · Agenda"
      title="O dia inteiro em uma tela"
      description="Visão por barbeiro ou consolidada da loja. Arrastar para remarcar, clicar para abrir comanda, status colorido por situação."
    >
      <Browser url="app.manoelves.com.br/agenda">
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Quarta, 21 maio</p>
            <div className="flex gap-1 text-[10px]">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">Confirmados 12</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Em atendimento 2</span>
            </div>
          </div>
          <div className="grid grid-cols-[40px_1fr_1fr_1fr] gap-1 text-[10px]">
            <div />
            <div className="text-center font-semibold">João</div>
            <div className="text-center font-semibold">Pedro</div>
            <div className="text-center font-semibold">Carlos</div>
            {["09","10","11","12","14","15","16"].map((h, row) => (
              <div key={h} className="contents">
                <div className="py-2 text-right text-neutral-400">{h}h</div>
                {[0,1,2].map((c) => {
                  const filled = (row + c) % 2 === 0;
                  return (
                    <div key={c} className={`h-10 rounded ${
                      filled
                        ? c === 1 ? "bg-amber-200" : "bg-emerald-200"
                        : "bg-neutral-100"
                    } flex items-center px-1.5`}>
                      {filled ? <span className="truncate text-[9px] font-semibold text-neutral-800">Cliente {row+c+1}</span> : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Browser>
      <Value
        items={[
          { icon: Calendar, label: "Operação fluida", text: "Toda a equipe enxerga o mesmo painel em tempo real, sem agenda de papel." },
          { icon: Clock, label: "Mais atendimentos/dia", text: "Buffer inteligente entre serviços evita atrasos em cadeia." },
        ]}
      />
    </Slide>
  );
}

function S_Dashboard() {
  const bars = [42, 55, 38, 70, 62, 48, 80, 73, 90, 65, 78, 95, 82, 110];
  const maxBar = Math.max(...bars);
  return (
    <Slide
      kicker="Painel · Dashboard"
      title="O dono vê o negócio em um piscar"
      description="Faturamento do mês, comandas fechadas, ticket médio e margem do dono — tudo em tempo real. Gráfico dos últimos 14 dias e ranking dos barbeiros."
    >
      <Browser url="app.manoelves.com.br/dashboard">
        <div className="p-4">
          <p style={{ fontFamily: '"Bebas Neue"' }} className="text-xl tracking-wider">Dashboard</p>
          <p className="text-[10px] text-neutral-500">Visão maio/2026 · dados em tempo real</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              { l: "Faturamento", v: "R$ 28.450" },
              { l: "Comandas", v: "186" },
              { l: "Ticket médio", v: "R$ 153" },
              { l: "Margem dono", v: "R$ 14.225" },
            ].map((k) => (
              <div key={k.l} className="rounded-lg border border-neutral-200 p-2">
                <p className="text-[8px] uppercase tracking-widest text-neutral-500">{k.l}</p>
                <p style={{ fontFamily: '"Bebas Neue"' }} className="mt-0.5 text-lg tracking-wide">{k.v}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-neutral-200 p-3">
            <p style={{ fontFamily: '"Bebas Neue"' }} className="text-[12px] tracking-wider">Últimos 14 dias</p>
            <div className="mt-2 flex h-24 items-end gap-1">
              {bars.map((b, i) => (
                <div key={i} className="flex-1 rounded-t bg-neutral-900" style={{ height: `${(b/maxBar)*100}%` }} />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[7px] text-neutral-400">
              <span>08/05</span><span>14/05</span><span>21/05</span>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-neutral-200 p-3">
            <p style={{ fontFamily: '"Bebas Neue"' }} className="text-[12px] tracking-wider">Ranking de barbeiros · mês</p>
            <ul className="mt-1 divide-y divide-neutral-200 text-[10px]">
              {[
                { n: "João Silva", v: "R$ 11.820" },
                { n: "Pedro Alves", v: "R$ 9.140" },
                { n: "Carlos Mendes", v: "R$ 7.490" },
              ].map((r, i) => (
                <li key={r.n} className="flex items-center justify-between py-1">
                  <span className="flex items-center gap-2">
                    <span style={{ fontFamily: '"Bebas Neue"' }} className="w-4 text-center text-sm">{i+1}</span>
                    {r.n}
                  </span>
                  <span className="font-medium">{r.v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Browser>
      <Value
        items={[
          { icon: BarChart3, label: "Decisão por dado", text: "Sai do achismo: dono vê o que dá dinheiro e onde investir." },
          { icon: TrendingUp, label: "Ranking saudável", text: "Time vê a performance — gera competitividade positiva entre barbeiros." },
          { icon: CalIcon, label: "Tempo real", text: "Cada comanda fechada atualiza os KPIs imediatamente." },
        ]}
      />
    </Slide>
  );
}

function S_Comanda() {

  return (
    <Slide
      kicker="Painel 2 · Comanda + Mercado Pago"
      title="Do atendimento ao recebimento"
      description="Abre comanda direto do agendamento, adiciona produtos, fecha com PIX ou cartão via Mercado Pago. O recebimento é confirmado por webhook."
    >
      <Browser url="app.manoelves.com.br/comanda">
        <div className="grid grid-cols-[1fr_180px] gap-3 p-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">Comanda #1042</p>
            <p className="text-sm font-semibold">Lucas — João Silva</p>
            <ul className="mt-3 space-y-1.5 text-[11px]">
              <li className="flex justify-between border-b border-dashed border-neutral-200 pb-1">
                <span>Corte tradicional</span><span>R$ 50,00</span>
              </li>
              <li className="flex justify-between border-b border-dashed border-neutral-200 pb-1">
                <span>Barba na navalha</span><span>R$ 35,00</span>
              </li>
              <li className="flex justify-between border-b border-dashed border-neutral-200 pb-1">
                <span>Pomada modeladora ×1</span><span>R$ 45,00</span>
              </li>
              <li className="flex justify-between pt-1 text-[13px] font-semibold">
                <span>Total</span><span>R$ 130,00</span>
              </li>
            </ul>
          </div>
          <div className="space-y-1.5">
            <button className="w-full rounded-md bg-neutral-900 py-2 text-[11px] font-semibold text-white">
              Cobrar Mercado Pago
            </button>
            <button className="w-full rounded-md border border-neutral-300 py-2 text-[11px]">PIX direto</button>
            <button className="w-full rounded-md border border-neutral-300 py-2 text-[11px]">Dinheiro</button>
            <div className="mt-3 rounded-md bg-emerald-50 p-2 text-[10px] text-emerald-700">
              ✓ Pagamento confirmado<br/>às 11:54
            </div>
          </div>
        </div>
      </Browser>
      <Value
        items={[
          { icon: CreditCard, label: "Caixa digital", text: "Sem maquininha perdida, sem erro de troco. Recebimento rastreado por venda." },
          { icon: BarChart3, label: "Comissão na hora", text: "Cada pagamento já calcula a parte do barbeiro e da casa." },
        ]}
      />
    </Slide>
  );
}

/* ===== WhatsApp mockup helpers ===== */
function WAPhone({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[300px] rounded-[36px] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl">
      <div className="relative overflow-hidden rounded-[26px]">
        <div className="absolute left-1/2 top-1.5 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-neutral-900" />
        {/* WhatsApp header */}
        <div className="flex items-center gap-2 bg-[#075E54] px-3 pb-2 pt-6 text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-bold text-emerald-900">ME</div>
          <div className="flex-1 leading-tight">
            <p className="text-[12px] font-semibold">Mano Elves</p>
            <p className="text-[9px] text-emerald-100">online</p>
          </div>
          <MessageCircle className="h-4 w-4 opacity-80" />
        </div>
        {/* chat bg */}
        <div
          className="h-[510px] overflow-hidden px-3 py-3 text-neutral-900"
          style={{ background: "#ECE5DD" }}
        >
          <div className="flex flex-col gap-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

function WABubble({
  text,
  time,
  delay = 0,
}: {
  text: React.ReactNode;
  time: string;
  delay?: number;
}) {
  return (
    <div
      className="max-w-[85%] self-end rounded-lg rounded-br-sm bg-[#DCF8C6] px-2.5 py-1.5 text-[11px] leading-snug shadow-sm animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div>{text}</div>
      <div className="mt-0.5 text-right text-[9px] text-neutral-500">{time} ✓✓</div>
    </div>
  );
}

function S_WhatsAppFlows() {
  return (
    <Slide
      kicker="Mensageria · WhatsApp via UazAPI"
      title="Cliente sempre avisado, no canal que ele já usa"
      description="Toda interação importante vira mensagem no WhatsApp: código de acesso, confirmação de agendamento, lembrete, link de pagamento PIX ao fechar a comanda, aniversário e reengajamento."
    >
      <div className="grid items-center gap-6 lg:grid-cols-[260px_1fr]">
        <WAPhone>
          <WABubble
            delay={0}
            time="09:12"
            text={
              <>
                <span className="font-semibold">Mano Elves:</span> seu código de acesso é <span className="font-mono font-bold">482910</span>. Válido por 48h.
              </>
            }
          />
          <WABubble
            delay={150}
            time="09:14"
            text={
              <>
                ✅ <span className="font-semibold">Agendamento confirmado</span><br />
                Lucas · Corte + Barba<br />
                Sex, 24/05 às <span className="font-semibold">15:30</span>
              </>
            }
          />
          <WABubble
            delay={300}
            time="14:30"
            text={
              <>
                ⏰ Faltam <span className="font-semibold">1h</span> para o seu horário com o Lucas. Te esperamos!
              </>
            }
          />
          <WABubble
            delay={450}
            time="16:02"
            text={
              <>
                💳 <span className="font-semibold">Sua comanda: R$ 130,00</span><br />
                Pague no PIX:<br />
                <span className="font-mono text-[10px] break-all">00020126…5204000053039865802BR…6304A1B2</span><br />
                <span className="text-emerald-700">Toque para copiar</span>
              </>
            }
          />
          <WABubble
            delay={600}
            time="16:03"
            text={
              <>
                🎉 Pagamento recebido. Obrigado, João! Já liberamos sua próxima reserva.
              </>
            }
          />
          <WABubble
            delay={750}
            time="ontem"
            text={
              <>
                🎂 <span className="font-semibold">Feliz aniversário, João!</span> Presente da casa: <span className="font-semibold">20% off</span> no próximo corte.
              </>
            }
          />
        </WAPhone>
        <Value
          items={[
            { icon: KeyRound, label: "Login sem senha", text: "OTP de 6 dígitos enviado no WhatsApp, válido por 48h." },
            { icon: CheckCircle2, label: "Confirmação + lembrete", text: "Resumo do horário na hora da reserva e aviso 1h antes." },
            { icon: CreditCard, label: "PIX no fechamento", text: "Ao finalizar a comanda, o copia-e-cola PIX vai direto pro chat." },
            { icon: Cake, label: "Aniversário e retorno", text: "Mensagens automáticas em datas e quando o cliente some." },
          ]}
        />
      </div>
    </Slide>
  );
}


function S_Subscriptions() {
  return (
    <Slide
      kicker="Painel 3 · Assinaturas"
      title="Receita recorrente com Mercado Pago"
      description="Planos mensais (ex.: corte ilimitado, combo quinzenal) cobrados automaticamente. Previsibilidade de caixa e cliente fiel."
    >
      <Browser url="app.manoelves.com.br/assinaturas">
        <div className="p-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { p: "Essencial", v: "R$ 79", d: "1 corte / mês" },
              { p: "Clássico", v: "R$ 139", d: "Cortes ilimitados" },
              { p: "Premium", v: "R$ 199", d: "Cortes + barba" },
            ].map((pl, i) => (
              <div key={pl.p} className={`rounded-lg border p-3 ${i===1 ? "border-neutral-900 bg-neutral-950 text-white" : "border-neutral-200"}`}>
                <p className="text-[10px] uppercase tracking-widest opacity-70">{pl.p}</p>
                <p className="mt-1 text-lg font-bold">{pl.v}<span className="text-[10px] opacity-70">/mês</span></p>
                <p className="mt-1 text-[10px] opacity-80">{pl.d}</p>
                <p className="mt-2 text-[9px] opacity-60">Renovação automática</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-md border border-neutral-200 p-3">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">MRR atual</p>
            <p className="text-2xl font-bold">R$ 8.420<span className="text-[11px] text-emerald-600"> +12%</span></p>
            <p className="text-[10px] text-neutral-500">62 assinantes ativos</p>
          </div>
        </div>
      </Browser>
      <Value
        items={[
          { icon: Repeat, label: "Caixa previsível", text: "Receita recorrente que entra todo mês sem depender do movimento da rua." },
          { icon: Users, label: "Fidelização", text: "Cliente assinante volta 2-3× mais que o cliente avulso." },
        ]}
      />
    </Slide>
  );
}

function S_Signage() {
  return (
    <Slide
      kicker="Painel 4 · Signage TV"
      title="TV da loja vira ferramenta de operação"
      description="Playlist do YouTube no centro, fila de atendimento à esquerda, próximos agendamentos à direita. O cliente sabe quanto falta — e a sala fica entretida."
    >
      <div className="overflow-hidden rounded-xl border border-neutral-300 bg-neutral-950 p-2 shadow-xl">
        <div className="grid grid-cols-[1fr_2fr_1fr] gap-2 text-white">
          <div className="rounded-md bg-neutral-900 p-2">
            <p className="text-[8px] uppercase tracking-widest text-neutral-400">Atendendo agora</p>
            {[{n:"Lucas",b:"João"},{n:"Bruno",b:"Pedro"}].map((a) => (
              <div key={a.n} className="mt-1.5 rounded bg-neutral-800 p-1.5">
                <p className="text-[11px] font-bold">{a.n}</p>
                <p className="text-[9px] text-neutral-400">com {a.b}</p>
              </div>
            ))}
          </div>
          <div className="flex aspect-video items-center justify-center rounded-md bg-black">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600">
              <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
            </div>
          </div>
          <div className="rounded-md bg-neutral-900 p-2">
            <p className="text-[8px] uppercase tracking-widest text-neutral-400">Próximos</p>
            {[
              {n:"Felipe", t:"12:00"},
              {n:"Diego", t:"12:30"},
              {n:"Marco", t:"13:00"},
            ].map((a, i) => (
              <div key={a.n} className="mt-1.5 flex items-center justify-between" style={{opacity: 1 - i*0.2}}>
                <p className="text-[10px]">{a.n}</p>
                <p className="text-[10px] font-mono">{a.t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Value
        items={[
          { icon: Tv, label: "Experiência no salão", text: "Cliente entretido espera melhor — e percebe organização profissional." },
          { icon: Sparkles, label: "Mídia da casa", text: "A TV também roda promoções, novos produtos e redes sociais da barbearia." },
        ]}
      />
    </Slide>
  );
}

function S_Waitlist() {
  return (
    <Slide
      kicker="Painel 5 · Fila de espera"
      title="Nenhum cliente perdido por falta de horário"
      description="Quando a agenda lota, o cliente entra na fila. Ao abrir um espaço, o sistema notifica automaticamente pelo WhatsApp."
    >
      <Browser url="app.manoelves.com.br/fila-espera">
        <div className="p-4">
          <p className="text-[11px] uppercase tracking-widest text-neutral-500">Fila ativa</p>
          <div className="mt-2 space-y-1.5">
            {[
              {n:"Rafael",p:"Manhã", w:"2h"},
              {n:"Vitor",p:"Tarde", w:"5h"},
              {n:"André",p:"Qualquer", w:"1h"},
              {n:"Tiago",p:"Noite", w:"30min"},
            ].map((c, i) => (
              <div key={c.n} className="flex items-center justify-between rounded border border-neutral-200 p-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-[10px] text-white">{i+1}</span>
                  <div>
                    <p className="font-semibold">{c.n}</p>
                    <p className="text-[9px] text-neutral-500">Prefere: {c.p} · espera {c.w}</p>
                  </div>
                </div>
                <button className="rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  Avisar
                </button>
              </div>
            ))}
          </div>
        </div>
      </Browser>
      <Value
        items={[
          { icon: Bell, label: "Cancelamento = oportunidade", text: "Espaço aberto é preenchido em minutos com aviso automático." },
          { icon: TrendingUp, label: "Mais faturamento", text: "Aproveita 100% da agenda mesmo com cancelamentos de última hora." },
        ]}
      />
    </Slide>
  );
}

function S_Reengagement() {
  return (
    <Slide
      kicker="Painel 6 · Reengajamento"
      title="Traz de volta quem sumiu"
      description="O sistema identifica clientes que não voltam há 30, 45 ou 60 dias e dispara mensagens personalizadas — direto pelo WhatsApp."
    >
      <Browser url="app.manoelves.com.br/reengajamento">
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              {l:"30+ dias", n:"24"},
              {l:"45+ dias", n:"11"},
              {l:"60+ dias", n:"7"},
            ].map((s) => (
              <div key={s.l} className="rounded-lg border border-neutral-200 p-3">
                <p className="text-2xl font-bold">{s.n}</p>
                <p className="text-[9px] uppercase tracking-widest text-neutral-500">{s.l}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-neutral-200 p-3">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">Mensagem sugerida</p>
            <p className="mt-1 rounded bg-emerald-50 p-2 text-[11px] leading-snug text-neutral-700">
              Oi, Lucas! Faz 32 dias que você não passa aqui. Que tal agendar
              seu corte? Reservei um horário pra você 👇
            </p>
            <button className="mt-2 w-full rounded-md bg-emerald-500 py-1.5 text-[11px] font-semibold text-white">
              Enviar para 24 clientes
            </button>
          </div>
        </div>
      </Browser>
      <Value
        items={[
          { icon: MessageCircle, label: "Recuperação ativa", text: "Cliente inativo é receita parada — uma campanha bem feita reativa 20-30%." },
          { icon: TrendingUp, label: "ROI imediato", text: "Cada mensagem custa centavos e pode trazer um corte de R$ 75." },
        ]}
      />
    </Slide>
  );
}

function S_Financial() {
  return (
    <Slide
      kicker="Painel 7 · Financeiro do barbeiro"
      title="Cada barbeiro vê o que ganhou"
      description="Comissão por serviço e por produto, fechamento por dia/semana/mês. Transparência total e zero conflito sobre números."
    >
      <Browser url="app.manoelves.com.br/meu-financeiro">
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Faturei (mês)" v="R$ 4.820" />
            <Stat label="Comissão" v="R$ 2.410" hl />
            <Stat label="Atendimentos" v="63" />
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-widest text-neutral-500">Últimos pagamentos</p>
          <ul className="mt-1 space-y-1 text-[11px]">
            {[
              {d:"21/05",c:"Lucas",v:"R$ 75,00", co:"R$ 37,50"},
              {d:"21/05",c:"Bruno",v:"R$ 50,00", co:"R$ 25,00"},
              {d:"20/05",c:"Felipe",v:"R$ 130,00", co:"R$ 65,00"},
              {d:"20/05",c:"Diego",v:"R$ 75,00", co:"R$ 37,50"},
            ].map((p, i) => (
              <li key={i} className="flex justify-between border-b border-dashed border-neutral-200 py-1">
                <span className="text-neutral-500">{p.d} · {p.c}</span>
                <span><span className="text-neutral-500">{p.v}</span> → <span className="font-semibold">{p.co}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </Browser>
      <Value
        items={[
          { icon: Wallet, label: "Transparência", text: "Barbeiro vê em tempo real o que entrou e quanto é dele — confiança total." },
          { icon: BarChart3, label: "Dono enxerga o todo", text: "Dashboard consolidado mostra faturamento, comissões e produtos vendidos." },
        ]}
      />
    </Slide>
  );
}

function Stat({ label, v, hl }: { label: string; v: string; hl?: boolean }) {
  return (
    <div className={`rounded-lg p-2 ${hl ? "bg-neutral-900 text-white" : "border border-neutral-200"}`}>
      <p className="text-[8px] uppercase tracking-widest opacity-70">{label}</p>
      <p className="mt-0.5 text-base font-bold">{v}</p>
    </div>
  );
}

function S_Settings() {
  return (
    <Slide
      kicker="Painel 8 · Configurações"
      title="Tudo conectado em um só lugar"
      description="Mercado Pago, WhatsApp e signage Sighor configurados pelo próprio dono. Sem ligar para suporte, sem desenvolvedor."
    >
      <Browser url="app.manoelves.com.br/configuracoes">
        <div className="p-4">
          <div className="space-y-2 text-[11px]">
            {[
              {n:"Mercado Pago", s:"Conectado", ok:true, d:"Cobranças, assinaturas, webhooks"},
              {n:"WhatsApp (uazapi)", s:"Conectado", ok:true, d:"Códigos de acesso, lembretes, reengajamento"},
              {n:"Catálogo de cortes", s:"8 itens", ok:true, d:"Carrossel da home e da área do cliente"},
              {n:"Signage Sighor", s:"Conectado", ok:true, d:"Displays, playlists, agendamentos de mídia"},
              {n:"Domínio próprio", s:"Configurar", ok:false, d:"manoelves.com.br"},
            ].map((it) => (
              <div key={it.n} className="flex items-center justify-between rounded-lg border border-neutral-200 p-2.5">
                <div>
                  <p className="font-semibold">{it.n}</p>
                  <p className="text-[9px] text-neutral-500">{it.d}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  it.ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}>{it.s}</span>
              </div>
            ))}
          </div>
        </div>
      </Browser>
      <Value
        items={[
          { icon: Settings, label: "Autonomia", text: "Dono troca chave do gateway, atualiza WhatsApp e signage sem chamar técnico." },
          { icon: CheckCircle2, label: "Segurança", text: "Chaves ficam no servidor, nunca expostas no navegador do cliente." },
        ]}
      />
    </Slide>
  );
}

function S_Closing() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-neutral-950 p-12 text-neutral-100">
      <h2
        className="max-w-4xl text-center text-4xl leading-[0.95] lg:text-6xl"
        style={{ fontFamily: '"Bebas Neue", Inter, sans-serif' }}
      >
        Vamos ativar sua barbearia ainda esta semana?
      </h2>
      <a
        href="https://wa.me/5594999345048?text=Quero%20ativar%20a%20Mano%20Elves"
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-neutral-100 px-8 py-4 text-sm font-semibold uppercase tracking-widest text-neutral-900 transition hover:scale-105"
      >
        <MessageCircle className="h-4 w-4" /> Falar agora no WhatsApp
      </a>
    </div>

  );
}

function S_Store() {
  const produtos = [
    { n: "Pomada Matte", p: "R$ 45,00", s: 12, img: "🧴" },
    { n: "Óleo p/ Barba", p: "R$ 38,00", s: 8, img: "🧴" },
    { n: "Shampoo Premium", p: "R$ 52,00", s: 4, img: "🧴", low: true },
    { n: "Kit Navalha", p: "R$ 120,00", s: 6, img: "🪒" },
  ];
  return (
    <Slide
      kicker="Painel 9 · Loja & Produtos"
      title="Sua barbearia também vende"
      description="Catálogo de produtos com foto, preço e estoque. Vendido no balcão (vira item de comanda) ou na vitrine do cliente — com alerta automático de estoque baixo."
    >
      <Browser url="app.manoelves.com.br/produtos">
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <p className="text-sm font-semibold">Catálogo</p>
            </div>
            <button className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1 text-[10px] font-semibold text-white">
              <Plus className="h-3 w-3" /> Novo produto
            </button>
          </div>
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <div className="grid grid-cols-[1fr_70px_80px_60px] gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-neutral-500">
              <span>Produto</span>
              <span className="text-right">Preço</span>
              <span className="text-right">Estoque</span>
              <span className="text-right">Vendas</span>
            </div>
            {produtos.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_70px_80px_60px] items-center gap-2 border-b border-neutral-100 px-3 py-2 last:border-0 text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-neutral-100 text-base">{p.img}</div>
                  <span className="font-medium">{p.n}</span>
                </div>
                <span className="text-right font-semibold">{p.p}</span>
                <span className="text-right">
                  <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${p.low ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {p.s} un{p.low ? " · baixo" : ""}
                  </span>
                </span>
                <span className="text-right text-neutral-500">{[23,18,9,5][i]}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
            <BellRing className="h-3 w-3" /> Shampoo Premium com estoque baixo — pedir reposição.
          </div>
        </div>
      </Browser>
      <Value
        items={[
          { icon: ShoppingBag, label: "Ticket maior", text: "Produto agregado vira +R$ 30–R$ 50 em cada comanda. Margem alta, esforço zero." },
          { icon: BellRing, label: "Estoque vigiado", text: "Alerta automático quando bate o mínimo — você nunca mais vende o que não tem." },
        ]}
      />
    </Slide>
  );
}

/* =====================================================================
   REGISTRY
===================================================================== */

const SLIDES: { title: string; component: () => React.ReactElement }[] = [
  // ABERTURA — pitch
  { title: "Gancho", component: S_Cover },
  { title: "Problema", component: S_Problem },
  { title: "Solução", component: S_Solution },

  // DEMO — captura do cliente
  { title: "Vitrine pública", component: S_Home },
  { title: "Catálogo de cortes", component: S_Catalog },
  { title: "Landing do barbeiro", component: S_BarberLanding },
  { title: "Agendamento + SMS", component: S_PublicBooking },
  { title: "Área do cliente (PWA)", component: S_ClientArea },

  // DEMO — operação diária
  { title: "Agenda interna", component: S_Agenda },
  { title: "Alerta de novo agendamento", component: S_OwnerNotification },
  { title: "Comanda + Mercado Pago", component: S_Comanda },
  { title: "Loja & Produtos", component: S_Store },

  // DEMO — receita recorrente
  { title: "Assinaturas (MRR)", component: S_Subscriptions },
  { title: "Signage TV", component: S_Signage },

  // DEMO — relacionamento e gestão
  { title: "WhatsApp automático", component: S_WhatsAppFlows },
  { title: "Fila de espera", component: S_Waitlist },
  { title: "Reengajamento", component: S_Reengagement },
  { title: "Dashboard do dono", component: S_Dashboard },
  { title: "Financeiro do barbeiro", component: S_Financial },

  // ADMIN
  { title: "Configurações & integrações", component: S_Settings },
  { title: "Acesso restrito ao dono", component: S_AdminAccess },

  // FECHAMENTO — pitch
  { title: "Prova · ROI", component: S_Proof },
  { title: "Oferta · Planos", component: S_Offer },
  { title: "CTA · Próximo passo", component: S_Closing },
];


