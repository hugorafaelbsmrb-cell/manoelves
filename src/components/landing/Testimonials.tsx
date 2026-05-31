import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Arthur Mendes",
    text: "Atendimento impecável. O ambiente é sensacional e os barbeiros realmente entendem de visagismo. Saí de lá com a autoestima renovada.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"
  },
  {
    name: "Carlos Ferreira",
    text: "Frequento a Manoel Eves há 2 anos. O Clube de Assinatura foi a melhor invenção, praticidade incrível para agendar pelo app.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200"
  },
  {
    name: "Henrique Silva",
    text: "A barboterapia é um ritual à parte. Toalha quente, produtos premium e muita técnica. Recomendo de olhos fechados.",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200"
  }
];

export function Testimonials() {
  return (
    <section className="bg-[#111] py-24 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <p className="text-[#d4a857] text-xs uppercase tracking-[0.3em] font-medium mb-3">O Que Dizem</p>
          <h2 className="font-display text-4xl md:text-5xl text-white">Depoimentos</h2>
          <div className="h-px w-20 bg-[#d4a857] mx-auto mt-8"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((test, idx) => (
            <div key={idx} className="bg-[#1a1a1a] p-8 border border-white/5 flex flex-col">
              <div className="flex gap-1 mb-6 text-[#d4a857]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-gray-400 font-light italic mb-8 flex-1 leading-relaxed">
                "{test.text}"
              </p>
              <div className="flex items-center gap-4 border-t border-white/10 pt-6">
                <img 
                  src={test.avatar} 
                  alt={test.name} 
                  className="w-12 h-12 rounded-full object-cover filter grayscale"
                />
                <div>
                  <p className="text-white font-medium text-sm">{test.name}</p>
                  <p className="text-gray-500 text-xs uppercase tracking-wider mt-1">Cliente</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
