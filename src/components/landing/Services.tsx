import { Scissors, Droplet, Coffee, Crown } from "lucide-react";

const services = [
  {
    icon: <Scissors className="h-6 w-6" />,
    title: "Corte Clássico",
    desc: "Corte na tesoura ou máquina, com lavagem, massagem capilar e finalização.",
    price: "R$ 60"
  },
  {
    icon: <Droplet className="h-6 w-6" />,
    title: "Barboterapia",
    desc: "Ritual com toalha quente, óleos essenciais, massagem facial e navalha.",
    price: "R$ 50"
  },
  {
    icon: <Crown className="h-6 w-6" />,
    title: "Combo Premium",
    desc: "A experiência completa de Corte e Barboterapia com hidratação.",
    price: "R$ 100"
  },
  {
    icon: <Coffee className="h-6 w-6" />,
    title: "Pezinho & Acabamento",
    desc: "Alinhamento de perfil, nuca e sobrancelhas com precisão.",
    price: "R$ 30"
  }
];

export function Services() {
  return (
    <section className="bg-[#111] py-24 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="text-center mb-16">
          <p className="text-[#d4a857] text-xs uppercase tracking-[0.3em] font-medium mb-3">Nossa Especialidade</p>
          <h2 className="font-display text-4xl md:text-5xl text-white">Serviços Premium</h2>
          <div className="h-px w-20 bg-[#d4a857] mx-auto mt-8"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((svc, idx) => (
            <div 
              key={idx}
              className="group bg-[#1a1a1a] border border-white/5 p-8 hover:border-[#d4a857]/30 transition-all duration-500 hover:-translate-y-2 relative"
            >
              <div className="text-[#d4a857] mb-6 group-hover:scale-110 transition-transform duration-500">
                {svc.icon}
              </div>
              <h3 className="font-display text-2xl text-white mb-3">{svc.title}</h3>
              <p className="text-gray-400 text-sm font-light leading-relaxed mb-6">
                {svc.desc}
              </p>
              <div className="mt-auto border-t border-white/10 pt-4 flex items-center justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-wider">A partir de</span>
                <span className="text-[#d4a857] font-display text-xl">{svc.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#d4a857]/5 rounded-full blur-[120px] pointer-events-none"></div>
    </section>
  );
}
