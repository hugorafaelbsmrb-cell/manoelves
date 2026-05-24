/* Static mockups for the sales presentation.
   Lightweight, fictitious data — no iframes, instant load. */
import {
  Calendar, Clock, Scissors, User, CheckCircle2, DollarSign,
  TrendingUp, Users, MessageCircle, Phone, Search, Bell,
  Settings, Package, CreditCard, BarChart3, LayoutGrid, ChevronRight,
  Star, MapPin, Instagram, ShoppingBag, Wallet, Repeat,
} from "lucide-react";

/* ============ PUBLIC (light) ============ */

export function MK_Landing() {
  return (
    <div className="h-[800px] bg-white text-neutral-900">
      <header className="flex items-center justify-between border-b border-neutral-200 px-10 py-4">
        <div className="flex items-center gap-2 font-semibold tracking-wide">
          <Scissors className="h-4 w-4" /> MANO ELVES
        </div>
        <nav className="flex items-center gap-6 text-xs text-neutral-600">
          <span>Barbeiros</span><span>Serviços</span><span>Contato</span>
          <button className="rounded-md bg-neutral-900 px-3 py-1.5 text-white">Agendar</button>
        </nav>
      </header>
      <section className="px-10 py-16 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Barbearia</p>
        <h1 className="mt-3 text-6xl font-bold tracking-tight">Mano Elves</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-neutral-600">
          Corte, barba e atendimento de primeira. Escolha seu barbeiro e reserve em segundos.
        </p>
        <p className="mt-3 inline-flex items-center gap-1 text-xs text-neutral-500">
          <MapPin className="h-3 w-3" /> Av. Brasil, 1024 — Marabá/PA
        </p>
        <button className="mt-6 rounded-full bg-neutral-900 px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white">
          Agendar agora
        </button>
      </section>
      <section className="px-10">
        <h2 className="mb-4 text-lg font-semibold">Nossos barbeiros</h2>
        <div className="grid grid-cols-3 gap-4">
          {["Hugo Rafael", "Pedro Lima", "Caio Mendes"].map((n, i) => (
            <div key={n} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 font-bold">
                  {n[0]}
                </div>
                <div>
                  <p className="font-semibold">{n}</p>
                  <p className="text-[10px] text-neutral-500">manoelves.com.br/{n.toLowerCase().split(" ")[0]}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-neutral-600">
                {["Especialista em degradê e barba.","Cortes clássicos e modernos.","Navalhada e visagismo."][i]}
              </p>
              <p className="mt-3 text-xs font-semibold">Agendar →</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function MK_BarberPublic() {
  return (
    <div className="h-[672px] overflow-hidden bg-white text-neutral-900">
      <div className="h-32 bg-gradient-to-br from-neutral-800 to-neutral-600" />
      <div className="-mt-12 flex flex-col items-center px-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-neutral-200 text-2xl font-bold shadow">
          H
        </div>
        <h2 className="mt-3 text-xl font-bold">Hugo Rafael Sousa</h2>
        <p className="text-[11px] text-neutral-500">Barbeiro · Mano Elves</p>
        <div className="mt-2 flex items-center gap-1 text-xs">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="font-semibold">4.9</span>
          <span className="text-neutral-500">(287 avaliações)</span>
        </div>
        <button className="mt-4 w-full rounded-lg bg-neutral-900 py-3 text-xs font-semibold uppercase tracking-wider text-white">
          Agendar horário
        </button>
      </div>
      <div className="mt-5 px-5">
        <p className="mb-2 text-[11px] font-semibold uppercase text-neutral-500">Serviços</p>
        {[
          ["Corte Masculino", "30 min", "R$ 45"],
          ["Barba Completa", "25 min", "R$ 35"],
          ["Corte + Barba", "50 min", "R$ 70"],
        ].map(([n, t, p]) => (
          <div key={n} className="mb-2 flex items-center justify-between rounded-lg border border-neutral-200 p-3">
            <div>
              <p className="text-sm font-semibold">{n}</p>
              <p className="text-[10px] text-neutral-500">{t}</p>
            </div>
            <span className="text-sm font-bold">{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MK_BookFlow() {
  return (
    <div className="h-[672px] overflow-hidden bg-white p-5 text-neutral-900">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-1 flex-1 rounded-full bg-neutral-900" />
        <div className="h-1 flex-1 rounded-full bg-neutral-900" />
        <div className="h-1 flex-1 rounded-full bg-neutral-200" />
      </div>
      <p className="text-[10px] uppercase tracking-widest text-neutral-500">Passo 2 de 3</p>
      <h3 className="mt-1 text-lg font-bold">Escolha o horário</h3>
      <p className="mb-3 text-xs text-neutral-600">Corte + Barba · Hugo Rafael</p>

      <div className="mb-3 flex gap-2">
        {["Qua 12","Qui 13","Sex 14","Sáb 15"].map((d,i)=>(
          <div key={d} className={`flex-1 rounded-lg border p-2 text-center text-[11px] ${i===2?"border-neutral-900 bg-neutral-900 text-white":"border-neutral-200"}`}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {["09:00","09:30","10:00","10:30","11:00","11:30","14:00","14:30","15:00"].map((h,i)=>(
          <div key={h} className={`rounded-md border py-2 text-center text-xs ${i===4?"border-neutral-900 bg-neutral-900 text-white font-semibold":i===2||i===6?"border-neutral-200 text-neutral-300 line-through":"border-neutral-200"}`}>
            {h}
          </div>
        ))}
      </div>

      <button className="mt-5 w-full rounded-lg bg-neutral-900 py-3 text-xs font-semibold uppercase tracking-wider text-white">
        Continuar
      </button>
    </div>
  );
}

export function MK_ClientArea() {
  return (
    <div className="h-[672px] overflow-hidden bg-white text-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
        <div>
          <p className="text-[10px] text-neutral-500">Olá,</p>
          <p className="text-sm font-bold">Lucas Almeida</p>
        </div>
        <Bell className="h-4 w-4 text-neutral-500" />
      </div>
      <div className="p-5">
        <div className="rounded-xl bg-neutral-900 p-4 text-white">
          <p className="text-[10px] uppercase tracking-widest opacity-70">Próximo agendamento</p>
          <p className="mt-1 text-lg font-bold">Sexta, 14 de jun · 15:00</p>
          <p className="mt-1 text-xs opacity-80">Corte + Barba com Hugo Rafael</p>
          <div className="mt-3 flex gap-2">
            <button className="flex-1 rounded-md bg-white/15 py-1.5 text-[10px] font-semibold">Remarcar</button>
            <button className="flex-1 rounded-md bg-white/15 py-1.5 text-[10px] font-semibold">Cancelar</button>
          </div>
        </div>

        <p className="mt-5 mb-2 text-[11px] font-semibold uppercase text-neutral-500">Histórico</p>
        {[
          ["28 mai","Corte + Barba","R$ 70"],
          ["14 mai","Corte Masculino","R$ 45"],
          ["02 mai","Barba","R$ 35"],
        ].map(([d,s,p])=>(
          <div key={d} className="mb-2 flex items-center justify-between rounded-lg border border-neutral-200 p-3">
            <div>
              <p className="text-xs font-semibold">{s}</p>
              <p className="text-[10px] text-neutral-500">{d}</p>
            </div>
            <span className="text-xs font-bold">{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ ADMIN (dark) ============ */

function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-[800px] bg-neutral-950 text-neutral-100">
      <aside className="flex w-52 flex-col border-r border-neutral-800 bg-neutral-900 p-4">
        <div className="mb-6 flex items-center gap-2 font-bold tracking-wide">
          <Scissors className="h-4 w-4" /> MANO ELVES
        </div>
        {([
          [LayoutGrid,"Dashboard"],[Calendar,"Agenda"],[Users,"Clientes"],
          [Scissors,"Barbeiros"],[Package,"Produtos"],[CreditCard,"Comanda"],
          [Repeat,"Assinaturas"],[BarChart3,"Financeiro"],[Settings,"Configurações"],
        ] as const).map(([Icon,label])=>(
          <div key={label} className={`mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${label===title?"bg-white text-neutral-900 font-semibold":"text-neutral-400"}`}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </div>
        ))}
        <div className="mt-auto flex items-center gap-2 rounded-md bg-neutral-800 p-2 text-xs">
          <div className="h-6 w-6 rounded-full bg-emerald-500" />
          <div className="min-w-0">
            <p className="truncate font-semibold">Mano Elves</p>
            <p className="truncate text-[10px] text-neutral-400">admin</p>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

export function MK_Barbers() {
  return (
    <AdminShell title="Barbeiros">
      <div className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Barbeiros</h2>
            <p className="text-xs text-neutral-400">Gerencie sua equipe</p>
          </div>
          <button className="rounded-md bg-white px-4 py-2 text-xs font-semibold text-neutral-900">+ Novo barbeiro</button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Hugo Rafael", "12 agend.", "R$ 1.840"],
            ["Pedro Lima", "9 agend.", "R$ 1.260"],
            ["Caio Mendes", "11 agend.", "R$ 1.580"],
            ["Bruno Costa", "7 agend.", "R$ 980"],
            ["Júlio Reis", "10 agend.", "R$ 1.420"],
            ["Diego Pires", "8 agend.", "R$ 1.120"],
          ].map(([n,a,r])=>(
            <div key={n} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-neutral-700 font-bold grid place-items-center">{n[0]}</div>
                <div>
                  <p className="text-sm font-semibold">{n}</p>
                  <p className="text-[10px] text-neutral-400">Ativo · hoje</p>
                </div>
              </div>
              <div className="mt-4 flex justify-between text-[11px]">
                <span className="text-neutral-400">{a}</span>
                <span className="font-bold text-emerald-400">{r}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

export function MK_Agenda() {
  const hours = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
  const barbers = ["Hugo","Pedro","Caio","Bruno"];
  const cells: Record<string,{label:string; color:string}> = {
    "0-0":{label:"Lucas A. · Corte",color:"bg-blue-500/30 border-blue-400"},
    "1-0":{label:"Marcos · Barba",color:"bg-emerald-500/30 border-emerald-400"},
    "3-1":{label:"Tiago · Corte+Barba",color:"bg-purple-500/30 border-purple-400"},
    "5-2":{label:"João · Corte",color:"bg-blue-500/30 border-blue-400"},
    "6-0":{label:"Pedro M. · Barba",color:"bg-emerald-500/30 border-emerald-400"},
    "2-3":{label:"Rafael · Corte",color:"bg-blue-500/30 border-blue-400"},
    "7-1":{label:"André · Combo",color:"bg-purple-500/30 border-purple-400"},
  };
  return (
    <AdminShell title="Agenda">
      <div className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Agenda</h2>
            <p className="text-xs text-neutral-400">Sexta, 14 de junho de 2026</p>
          </div>
          <div className="flex gap-2 text-xs">
            <button className="rounded-md border border-neutral-700 px-3 py-1.5">Hoje</button>
            <button className="rounded-md bg-white px-3 py-1.5 font-semibold text-neutral-900">+ Agendar</button>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-neutral-800">
          <div className="grid" style={{gridTemplateColumns:"60px repeat(4,1fr)"}}>
            <div className="bg-neutral-900 p-2 text-[10px]"></div>
            {barbers.map(b=>(
              <div key={b} className="border-l border-neutral-800 bg-neutral-900 p-2 text-center text-xs font-semibold">{b}</div>
            ))}
            {hours.map((h,hi)=>(
              <>
                <div key={h} className="border-t border-neutral-800 bg-neutral-900 p-2 text-[10px] text-neutral-500">{h}</div>
                {barbers.map((_,bi)=>{
                  const c = cells[`${hi}-${bi}`];
                  return (
                    <div key={`${hi}-${bi}`} className="border-l border-t border-neutral-800 p-1 min-h-[52px]">
                      {c && <div className={`h-full rounded border px-2 py-1 text-[10px] ${c.color}`}>{c.label}</div>}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

export function MK_Dashboard() {
  return (
    <AdminShell title="Dashboard">
      <div className="p-6">
        <h2 className="text-xl font-bold">Visão geral</h2>
        <p className="text-xs text-neutral-400">Últimos 30 dias</p>
        <div className="mt-5 grid grid-cols-4 gap-3">
          {[
            [DollarSign,"Faturamento","R$ 42.380","+18%"],
            [Calendar,"Agendamentos","312","+9%"],
            [Users,"Clientes ativos","186","+12%"],
            [TrendingUp,"Ticket médio","R$ 135","+4%"],
          ].map((row)=>{
            const Icon = row[0] as React.ComponentType<{className?: string}>;
            const [, label, val, delta] = row as [unknown,string,string,string];
            return (
            <div key={label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-neutral-400" />
                <span className="text-[10px] font-semibold text-emerald-400">{delta}</span>
              </div>
              <p className="mt-3 text-[10px] uppercase text-neutral-500">{label}</p>
              <p className="text-xl font-bold">{val}</p>
            </div>
          );})}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="col-span-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-xs font-semibold">Faturamento por dia</p>
            <div className="mt-4 flex h-40 items-end gap-2">
              {[40,55,38,68,72,90,62,80,95,70,84,100,75,88].map((h,i)=>(
                <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-emerald-700 to-emerald-400" style={{height:`${h}%`}} />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-xs font-semibold">Top barbeiros</p>
            <div className="mt-3 space-y-2 text-xs">
              {[["Hugo Rafael",92],["Caio Mendes",78],["Pedro Lima",64],["Bruno Costa",51]].map(([n,p])=>(
                <div key={n as string}>
                  <div className="flex justify-between"><span>{n as string}</span><span className="text-neutral-400">{p}%</span></div>
                  <div className="mt-1 h-1.5 rounded bg-neutral-800"><div className="h-full rounded bg-white" style={{width:`${p}%`}}/></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

export function MK_Comanda() {
  return (
    <AdminShell title="Comanda">
      <div className="p-6">
        <h2 className="text-xl font-bold">Comanda aberta</h2>
        <p className="text-xs text-neutral-400">Lucas Almeida · Hugo Rafael · 15:00</p>
        <div className="mt-5 grid grid-cols-3 gap-4">
          <div className="col-span-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="mb-3 text-xs font-semibold">Itens</p>
            {[
              ["Corte Masculino","R$ 45,00"],
              ["Barba Completa","R$ 35,00"],
              ["Pomada Modeladora","R$ 38,00"],
            ].map(([n,p])=>(
              <div key={n} className="mb-2 flex items-center justify-between rounded-md border border-neutral-800 p-3 text-sm">
                <span>{n}</span><span className="font-semibold">{p}</span>
              </div>
            ))}
            <button className="mt-2 w-full rounded-md border border-dashed border-neutral-700 py-2 text-xs text-neutral-400">+ Adicionar produto/serviço</button>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-xs font-semibold">Resumo</p>
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-neutral-400">Subtotal</span><span>R$ 118,00</span></div>
              <div className="flex justify-between"><span className="text-neutral-400">Desconto</span><span>- R$ 0,00</span></div>
              <div className="mt-2 flex justify-between border-t border-neutral-800 pt-2 text-base font-bold"><span>Total</span><span>R$ 118,00</span></div>
            </div>
            <p className="mt-4 text-[10px] uppercase text-neutral-500">Pagamento</p>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
              {["Pix","Crédito","Débito"].map((m,i)=>(
                <div key={m} className={`rounded border py-1.5 text-center ${i===0?"border-emerald-400 bg-emerald-500/10 text-emerald-300 font-semibold":"border-neutral-700"}`}>{m}</div>
              ))}
            </div>
            <button className="mt-4 w-full rounded-md bg-emerald-500 py-2 text-xs font-bold text-neutral-900">Finalizar</button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

export function MK_Subscriptions() {
  return (
    <AdminShell title="Assinaturas">
      <div className="p-6">
        <h2 className="text-xl font-bold">Planos de assinatura</h2>
        <p className="text-xs text-neutral-400">Receita recorrente previsível</p>
        <div className="mt-5 grid grid-cols-3 gap-4">
          {[
            ["Essencial","R$ 89","2 cortes/mês",["Corte mensal","Agendamento prioritário"]],
            ["Premium","R$ 149","Corte + barba",["4 atendimentos/mês","Produtos com 10% off","Suporte VIP"]],
            ["VIP","R$ 249","Ilimitado",["Atendimentos ilimitados","Cabine privativa","Bebida cortesia"]],
          ].map(([n,p,t,feats],i)=>(
            <div key={n as string} className={`rounded-xl border p-5 ${i===1?"border-emerald-400 bg-emerald-500/5":"border-neutral-800 bg-neutral-900"}`}>
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{n as string}</p>
              <p className="mt-2 text-3xl font-bold">{p as string}<span className="text-xs font-normal text-neutral-400">/mês</span></p>
              <p className="text-[11px] text-neutral-400">{t as string}</p>
              <ul className="mt-4 space-y-1.5 text-xs">
                {(feats as string[]).map(f=>(
                  <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-400"/>{f}</li>
                ))}
              </ul>
              <p className="mt-4 text-[10px] text-neutral-500">{i===0?12:i===1?28:7} assinantes ativos</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase text-neutral-500">MRR (receita recorrente mensal)</p>
              <p className="text-2xl font-bold">R$ 6.842</p>
            </div>
            <span className="rounded bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-400">+23% este mês</span>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

export function MK_Waitlist() {
  return (
    <AdminShell title="Agenda">
      <div className="p-6">
        <h2 className="text-xl font-bold">Fila de espera</h2>
        <p className="text-xs text-neutral-400">Clientes notificados automaticamente quando vaga abrir</p>
        <div className="mt-5 space-y-2">
          {[
            ["Marcelo Souza","Corte + Barba","Hugo Rafael","Hoje, qualquer horário","esperando"],
            ["Felipe Andrade","Corte","Caio Mendes","Sexta após 17h","notificado"],
            ["Rodrigo Pinto","Barba","Pedro Lima","Sábado manhã","esperando"],
            ["Vinícius Lopes","Combo","Qualquer","Hoje","aceito"],
          ].map(([n,s,b,w,st])=>(
            <div key={n} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3">
              <div>
                <p className="text-sm font-semibold">{n}</p>
                <p className="text-[11px] text-neutral-400">{s} · {b} · {w}</p>
              </div>
              <span className={`rounded px-2 py-1 text-[10px] font-semibold ${st==="aceito"?"bg-emerald-500/15 text-emerald-400":st==="notificado"?"bg-blue-500/15 text-blue-400":"bg-neutral-800 text-neutral-300"}`}>{st}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

export function MK_Reengage() {
  return (
    <AdminShell title="Clientes">
      <div className="p-6">
        <h2 className="text-xl font-bold">Reengajamento automático</h2>
        <p className="text-xs text-neutral-400">Clientes sem agendar há mais de 45 dias</p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[["38","Clientes inativos"],["14","Mensagens enviadas hoje"],["6","Retornaram esta semana"]].map(([v,l])=>(
            <div key={l} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <p className="text-2xl font-bold">{v}</p>
              <p className="text-[10px] uppercase text-neutral-500">{l}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-2">
          {[
            ["Diego Martins","último corte há 62 dias","WhatsApp enviado"],
            ["Cleber Souza","último corte há 51 dias","Agendou! 18/06"],
            ["Roberto Lima","último corte há 78 dias","Aguardando resposta"],
            ["Eduardo Cruz","último corte há 49 dias","WhatsApp enviado"],
          ].map(([n,d,s])=>(
            <div key={n} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3">
              <div>
                <p className="text-sm font-semibold">{n}</p>
                <p className="text-[11px] text-neutral-400">{d}</p>
              </div>
              <span className={`text-[11px] ${s.startsWith("Agendou")?"text-emerald-400 font-semibold":"text-neutral-400"}`}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

export function MK_Financial() {
  return (
    <AdminShell title="Financeiro">
      <div className="p-6">
        <h2 className="text-xl font-bold">Meu financeiro</h2>
        <p className="text-xs text-neutral-400">Hugo Rafael · Junho 2026</p>
        <div className="mt-5 grid grid-cols-4 gap-3">
          {[["R$ 4.860","Bruto"],["R$ 1.458","Comissão (30%)"],["R$ 3.402","Líquido"],["38","Atendimentos"]].map(([v,l])=>(
            <div key={l} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <p className="text-xl font-bold">{v}</p>
              <p className="text-[10px] uppercase text-neutral-500">{l}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="mb-3 text-xs font-semibold">Atendimentos recentes</p>
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-neutral-500">
              <tr><th className="text-left py-2">Data</th><th className="text-left">Cliente</th><th className="text-left">Serviço</th><th className="text-right">Valor</th><th className="text-right">Comissão</th></tr>
            </thead>
            <tbody>
              {[
                ["14/06","Lucas Almeida","Corte + Barba","R$ 70","R$ 21"],
                ["13/06","Marcos Vinicius","Barba","R$ 35","R$ 10,50"],
                ["13/06","Tiago Reis","Combo","R$ 70","R$ 21"],
                ["12/06","João Mendes","Corte","R$ 45","R$ 13,50"],
                ["12/06","Pedro Martins","Barba","R$ 35","R$ 10,50"],
              ].map(r=>(
                <tr key={r.join("-")} className="border-t border-neutral-800">
                  {r.map((c,i)=><td key={i} className={`py-2 ${i>=3?"text-right font-semibold":""}`}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

export function MK_Settings() {
  return (
    <AdminShell title="Configurações">
      <div className="p-6">
        <h2 className="text-xl font-bold">Configurações</h2>
        <p className="text-xs text-neutral-400">Personalize sua barbearia</p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs font-semibold uppercase text-neutral-400">Identidade</p>
            <div className="mt-3 space-y-2 text-xs">
              <div><p className="text-neutral-500">Nome</p><p>Barbearia Mano Elves</p></div>
              <div><p className="text-neutral-500">Endereço</p><p>Av. Brasil, 1024 — Marabá/PA</p></div>
              <div><p className="text-neutral-500">Telefone</p><p>(94) 99934-5048</p></div>
            </div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs font-semibold uppercase text-neutral-400">Horários</p>
            <div className="mt-3 space-y-1 text-xs">
              {[["Seg–Sex","09:00 – 20:00"],["Sábado","08:00 – 18:00"],["Domingo","Fechado"]].map(([d,h])=>(
                <div key={d} className="flex justify-between"><span className="text-neutral-500">{d}</span><span>{h}</span></div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs font-semibold uppercase text-neutral-400">Pagamentos</p>
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between"><span>Pix</span><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400"/></div>
              <div className="flex justify-between"><span>Crédito / Débito</span><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400"/></div>
              <div className="flex justify-between"><span>Dinheiro</span><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400"/></div>
            </div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <p className="text-xs font-semibold uppercase text-neutral-400">Notificações</p>
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between"><span>WhatsApp confirmação</span><span className="text-emerald-400">ativo</span></div>
              <div className="flex justify-between"><span>Lembrete 24h antes</span><span className="text-emerald-400">ativo</span></div>
              <div className="flex justify-between"><span>Reengajamento 45 dias</span><span className="text-emerald-400">ativo</span></div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

export function MK_Products() {
  return (
    <AdminShell title="Produtos">
      <div className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Produtos</h2>
            <p className="text-xs text-neutral-400">Estoque e vendas</p>
          </div>
          <button className="rounded-md bg-white px-4 py-2 text-xs font-semibold text-neutral-900">+ Novo produto</button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            ["Pomada Modeladora","R$ 38","24 un"],
            ["Óleo p/ Barba","R$ 45","18 un"],
            ["Shampoo Masculino","R$ 32","31 un"],
            ["Minoxidil","R$ 89","12 un"],
            ["Balm Pós-barba","R$ 42","9 un"],
            ["Pente Profissional","R$ 28","22 un"],
            ["Navalha Premium","R$ 120","5 un"],
            ["Kit Cuidados","R$ 159","7 un"],
          ].map(([n,p,e])=>(
            <div key={n} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="mb-3 grid h-20 place-items-center rounded-md bg-neutral-800"><ShoppingBag className="h-6 w-6 text-neutral-500"/></div>
              <p className="text-xs font-semibold">{n}</p>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="font-bold">{p}</span>
                <span className="text-neutral-400">{e}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
