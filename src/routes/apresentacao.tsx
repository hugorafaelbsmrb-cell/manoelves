import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Scissors, Calendar, Smartphone, CreditCard, Repeat, Tv, Bell,
  MessageCircle, Wallet, Settings, TrendingUp, ChevronLeft, ChevronRight,
  Maximize, Play, Clock, Star, CheckCircle2, BarChart3, Users, Sparkles,
  LogIn, MapPin, Instagram, ArrowLeft, ArrowRight, Calendar as CalIcon,
} from "lucide-react";
import logoUrl from "@/assets/manoelves-logo.png";


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
            <Current />
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
      <div className="relative flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 p-6 lg:p-10">
        <div className="w-full max-w-[640px]">{children}</div>
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

/* mockup chrome (browser + phone) */
function Browser({ url, children }: { url: string; children: React.ReactNode }) {
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
      <div className="bg-white text-neutral-900">{children}</div>
    </div>
  );
}

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[290px] rounded-[36px] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl">
      <div className="relative overflow-hidden rounded-[26px] bg-white">
        <div className="absolute left-1/2 top-1.5 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-neutral-900" />
        <div className="h-[500px] overflow-hidden text-neutral-900">{children}</div>
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
      <div className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px, 60px 60px",
        }}
      />
      <div className="relative max-w-3xl text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-800 px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] text-neutral-400">
          <Scissors className="h-3 w-3" /> Sistema de gestão · Demo
        </div>
        <h1
          className="text-7xl leading-none lg:text-9xl"
          style={{ fontFamily: '"Bebas Neue", Inter, sans-serif', letterSpacing: "0.02em" }}
        >
          MANO ELVES
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-neutral-400 lg:text-base">
          Plataforma completa para a barbearia: agenda, comandas, assinaturas,
          TVs, financeiro e relacionamento com o cliente — em um único lugar.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-[11px] text-neutral-500">
          <Chip>Agenda online</Chip>
          <Chip>Mercado Pago</Chip>
          <Chip>Assinaturas</Chip>
          <Chip>Signage TV</Chip>
          <Chip>WhatsApp</Chip>
          <Chip>Financeiro</Chip>
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-neutral-800 px-3 py-1">{children}</span>;
}

function S_Home() {
  return (
    <Slide
      kicker="Página 1 · Home"
      title="Vitrine digital da barbearia"
      description="A home pública apresenta a marca, os barbeiros e o caminho direto para o agendamento — sem fricção, sem app para baixar."
    >
      <Browser url="manoelves.com.br">
        <div className="relative">
          <div className="h-44 bg-neutral-950 px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <p style={{ fontFamily: '"Bebas Neue"' }} className="text-3xl tracking-wider">MANO ELVES</p>
              <span className="text-[10px] uppercase tracking-widest text-neutral-400">Barbearia</span>
            </div>
            <h3 className="mt-6 text-2xl font-semibold leading-tight">Tradição. Estilo. Mano Elves.</h3>
            <p className="mt-1 text-xs text-neutral-400">Agende online em menos de 1 minuto.</p>
            <button className="mt-3 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900">
              Agendar agora →
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 p-4">
            {["Corte", "Barba", "Combo"].map((s) => (
              <div key={s} className="rounded-md border border-neutral-200 p-3">
                <Scissors className="h-4 w-4 text-neutral-900" />
                <p className="mt-2 text-[11px] font-semibold">{s}</p>
                <p className="text-[10px] text-neutral-500">A partir de R$ 40</p>
              </div>
            ))}
          </div>
        </div>
      </Browser>
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
      <Phone>
        <div className="px-4 pt-10">
          <div className="mx-auto h-16 w-16 rounded-full bg-neutral-200 ring-2 ring-neutral-900" />
          <p className="mt-3 text-center text-base font-semibold">João Silva</p>
          <p className="text-center text-[11px] text-neutral-500">Barbeiro · Mano Elves</p>
          <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-amber-500">
            <Star className="h-3 w-3 fill-amber-500" /> 4.9 · 312 avaliações
          </div>
          <div className="mt-4 space-y-2">
            {[
              { n: "Corte tradicional", t: "30 min · R$ 50" },
              { n: "Barba na navalha", t: "20 min · R$ 35" },
              { n: "Combo corte + barba", t: "50 min · R$ 75" },
            ].map((s) => (
              <div key={s.n} className="flex items-center justify-between rounded-lg border border-neutral-200 p-2.5">
                <div>
                  <p className="text-[12px] font-semibold">{s.n}</p>
                  <p className="text-[10px] text-neutral-500">{s.t}</p>
                </div>
                <button className="rounded-md bg-neutral-900 px-2.5 py-1 text-[10px] font-semibold text-white">
                  Agendar
                </button>
              </div>
            ))}
          </div>
        </div>
      </Phone>
      <Value
        items={[
          { icon: Smartphone, label: "Marketing pessoal", text: "Cada barbeiro vira embaixador: link próprio, próprio portfólio, próprios clientes." },
          { icon: TrendingUp, label: "Mais reservas", text: "Sem ligações, sem mensagens — o cliente escolhe serviço e horário sozinho." },
        ]}
      />
    </Slide>
  );
}

function S_PublicBooking() {
  return (
    <Slide
      kicker="Página 3 · Agendamento público"
      title="Reserva online em 3 toques"
      description="Serviço, horário e dados do cliente. Confirmação automática via WhatsApp, com lembretes e proteção contra no-show via PIX."
    >
      <Phone>
        <div className="px-4 pt-8">
          <p className="text-[11px] uppercase tracking-widest text-neutral-500">Escolha o horário</p>
          <p className="mt-1 text-sm font-semibold">Quarta, 21 de maio</p>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {["09:00","09:30","10:00","10:30","11:00","11:30","14:00","14:30","15:00"].map((h, idx) => (
              <button
                key={h}
                className={`rounded-md border py-2 text-[11px] ${
                  idx === 4 ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200"
                }`}
              >{h}</button>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-neutral-200 p-3">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500">Resumo</p>
            <p className="mt-1 text-[12px] font-semibold">Corte + Barba · 50 min</p>
            <p className="text-[11px] text-neutral-500">Quarta 21/05 às 11:00</p>
            <p className="mt-1 text-[12px] font-semibold">R$ 75,00</p>
          </div>
          <button className="mt-3 w-full rounded-md bg-neutral-900 py-2.5 text-[12px] font-semibold text-white">
            Confirmar agendamento
          </button>
          <p className="mt-1 text-center text-[9px] text-neutral-500">
            Você receberá a confirmação no WhatsApp
          </p>
        </div>
      </Phone>
      <Value
        items={[
          { icon: CheckCircle2, label: "Zero retrabalho", text: "A agenda nunca dá conflito: o sistema controla buffers entre atendimentos." },
          { icon: Bell, label: "Confirmações automáticas", text: "Cliente recebe lembrete no WhatsApp — reduz drasticamente o no-show." },
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
              {n:"WhatsApp Business", s:"Conectado", ok:true, d:"Confirmações, lembretes, reengajamento"},
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
      <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-500">Por que Mano Elves</p>
      <h2
        className="mt-3 max-w-4xl text-center text-4xl leading-[0.95] lg:text-6xl"
        style={{ fontFamily: '"Bebas Neue", Inter, sans-serif' }}
      >
        Uma operação digital. Caixa previsível. Cliente fiel.
      </h2>
      <div className="mt-10 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { v: "+30%", l: "ocupação da agenda", d: "Com fila de espera e reengajamento ativos." },
          { v: "+R$ 8k", l: "MRR de assinaturas", d: "Receita recorrente via Mercado Pago." },
          { v: "-70%", l: "no-show", d: "Lembretes e proteção PIX." },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <p
              className="text-4xl"
              style={{ fontFamily: '"Bebas Neue", Inter, sans-serif' }}
            >{s.v}</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-neutral-400">{s.l}</p>
            <p className="mt-2 text-xs text-neutral-500">{s.d}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-xs text-neutral-500">
        Pronto para começar? <span className="text-neutral-100">contato@manoelves.com.br</span>
      </p>
    </div>
  );
}

/* =====================================================================
   REGISTRY
===================================================================== */

const SLIDES: { title: string; component: () => React.ReactElement }[] = [
  { title: "Capa", component: S_Cover },
  { title: "Home pública", component: S_Home },
  { title: "Landing do barbeiro", component: S_BarberLanding },
  { title: "Agendamento público", component: S_PublicBooking },
  { title: "Agenda interna", component: S_Agenda },
  { title: "Comanda + Mercado Pago", component: S_Comanda },
  { title: "Assinaturas recorrentes", component: S_Subscriptions },
  { title: "Signage TV", component: S_Signage },
  { title: "Fila de espera", component: S_Waitlist },
  { title: "Reengajamento WhatsApp", component: S_Reengagement },
  { title: "Financeiro do barbeiro", component: S_Financial },
  { title: "Configurações & integrações", component: S_Settings },
  { title: "Fechamento", component: S_Closing },
];
