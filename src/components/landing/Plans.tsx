import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Classic",
    price: "120",
    period: "mês",
    desc: "Para quem mantém o visual sempre em dia.",
    features: ["2 Cortes por mês", "1 Barboterapia", "10% off em produtos", "Bebida cortesia"],
    highlight: false
  },
  {
    name: "Premium",
    price: "180",
    period: "mês",
    desc: "A experiência completa para cavalheiros exigentes.",
    features: ["Cortes ilimitados", "Barboterapia ilimitada", "20% off em produtos", "Prioridade de agendamento"],
    highlight: true
  },
  {
    name: "Barba",
    price: "90",
    period: "mês",
    desc: "Foco total no cuidado e alinhamento facial.",
    features: ["Barboterapia ilimitada", "Design de sobrancelha", "Hidratação facial", "Bebida cortesia"],
    highlight: false
  }
];

export function Plans() {
  return (
    <section className="bg-[#0a0a0a] py-24 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="text-center mb-16">
          <p className="text-[#d4a857] text-xs uppercase tracking-[0.3em] font-medium mb-3">Clube Manoel Eves</p>
          <h2 className="font-display text-4xl md:text-5xl text-white">Assinaturas</h2>
          <div className="h-px w-20 bg-[#d4a857] mx-auto mt-8"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {plans.map((plan, idx) => (
            <div 
              key={idx} 
              className={`relative bg-[#111] border ${plan.highlight ? 'border-[#d4a857] shadow-[0_0_30px_rgba(212,168,87,0.15)] md:-translate-y-4' : 'border-white/10'} p-10 flex flex-col h-full`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#d4a857] text-black text-[10px] font-bold uppercase tracking-widest py-1 px-4">
                  Mais Escolhido
                </div>
              )}
              
              <h3 className="font-display text-3xl text-white mb-2 text-center">{plan.name}</h3>
              <p className="text-center text-sm text-gray-400 font-light mb-8">{plan.desc}</p>
              
              <div className="text-center mb-8">
                <span className="text-xl text-gray-500">R$</span>
                <span className="text-5xl font-display text-white mx-1">{plan.price}</span>
                <span className="text-gray-500">/{plan.period}</span>
              </div>
              
              <ul className="space-y-4 mb-10 flex-1">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-300 font-light">
                    <Check className="h-4 w-4 text-[#d4a857] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              
              <Link
                to="/assinaturas"
                className={`w-full block text-center py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                  plan.highlight 
                    ? 'bg-[#d4a857] text-black hover:bg-white' 
                    : 'border border-white/20 text-white hover:border-[#d4a857] hover:text-[#d4a857]'
                }`}
              >
                Assinar Agora
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
