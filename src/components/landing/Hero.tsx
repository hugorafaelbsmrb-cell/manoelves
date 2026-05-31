import { Link } from "@tanstack/react-router";
import { LogIn, CalendarCheck } from "lucide-react";
import logoUrl from "@/assets/manoelves-logo.png";
import textureBg from "@/assets/texture-bg.jpg";

interface HeroProps {
  shop: any;
}

export function Hero({ shop }: HeroProps) {
  const logo = shop?.logo_url || logoUrl;

  return (
    <div
      className="relative min-h-[90vh] flex flex-col"
      style={{
        backgroundColor: "#0a0a0a",
        backgroundImage: `linear-gradient(to bottom, rgba(10,10,10,0.8), rgba(10,10,10,0.95)), url(${textureBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <header className="relative border-b border-white/5 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt={shop?.name ?? "Manoel Eves"}
              className="h-10 w-10 rounded-full object-contain border border-[#d4a857]/30"
            />
            <span className="font-display text-2xl tracking-widest text-[#d4a857]">
              {shop?.name?.toUpperCase() ?? "MANOEL EVES"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all backdrop-blur-sm"
            >
              <LogIn className="h-4 w-4" /> Área do Cliente
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center relative z-10 px-6 py-20 text-center">
        <div className="max-w-3xl">
          <p className="text-[#d4a857] text-sm uppercase tracking-[0.4em] font-medium mb-6">
            Experiência Premium
          </p>
          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl text-white leading-tight drop-shadow-2xl">
            A Arte da <span className="text-[#d4a857] italic">Barbearia</span> Clássica
          </h1>
          <p className="mt-8 text-lg sm:text-xl text-gray-400 font-light max-w-xl mx-auto leading-relaxed">
            Mais do que um corte de cabelo, um ritual de cuidado masculino desenhado para o homem contemporâneo.
          </p>
          
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <Link
              to="/agendar"
              className="group relative inline-flex items-center justify-center gap-3 rounded-full bg-[#d4a857] px-8 py-4 text-sm font-bold uppercase tracking-widest text-black overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(212,168,87,0.4)] w-full sm:w-auto"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
              <CalendarCheck className="h-5 w-5" />
              Agendar Agora
            </Link>
          </div>
        </div>
      </main>

      {/* Decorative lines */}
      <div className="absolute left-10 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent hidden md:block"></div>
      <div className="absolute right-10 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent hidden md:block"></div>
    </div>
  );
}
