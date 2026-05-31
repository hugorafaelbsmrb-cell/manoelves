import { Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";

interface TeamProps {
  barbers: any[];
}

export function Team({ barbers }: TeamProps) {
  return (
    <section className="bg-[#0a0a0a] py-24 border-y border-white/5 relative">
      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="text-center mb-16">
          <p className="text-[#d4a857] text-xs uppercase tracking-[0.3em] font-medium mb-3">A Arte em Mãos</p>
          <h2 className="font-display text-4xl md:text-5xl text-white">Nossa Equipe</h2>
          <div className="h-px w-20 bg-[#d4a857] mx-auto mt-8"></div>
        </div>

        {!barbers || barbers.length === 0 ? (
          <div className="rounded-none border border-dashed border-white/20 bg-[#111] p-12 text-center text-sm text-gray-500">
            Nenhum barbeiro ativo ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {barbers.map((b) => (
              <div key={b.id} className="group text-center">
                <div className="relative mx-auto w-48 h-48 mb-6 overflow-hidden rounded-full border-2 border-white/10 group-hover:border-[#d4a857] transition-colors duration-500">
                  {b.avatar_url ? (
                    <img
                      src={b.avatar_url}
                      alt={b.full_name}
                      className="h-full w-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-[#1a1a1a] text-4xl font-display text-white">
                      {b.full_name?.slice(0, 1) || "B"}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500"></div>
                </div>
                
                <h3 className="font-display text-2xl text-white mb-1">{b.full_name}</h3>
                <p className="text-[#d4a857] text-xs uppercase tracking-widest mb-4">Master Barber</p>
                
                {b.bio && (
                  <p className="text-gray-400 text-sm font-light line-clamp-2 px-4 mb-6">
                    {b.bio}
                  </p>
                )}
                
                <div className="flex items-center justify-center gap-4">
                  <a href={`#`} className="text-gray-500 hover:text-[#d4a857] transition-colors">
                    <Instagram className="h-4 w-4" />
                  </a>
                  <Link
                    to="/$slug"
                    params={{ slug: b.slug! }}
                    className="text-xs font-medium text-white hover:text-[#d4a857] uppercase tracking-wider border-b border-transparent hover:border-[#d4a857] transition-all pb-1"
                  >
                    Agendar Horário
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
