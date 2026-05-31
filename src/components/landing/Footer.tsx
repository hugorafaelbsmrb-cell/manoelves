import { Instagram, Facebook } from "lucide-react";
import logoUrl from "@/assets/manoelves-logo.png";

interface FooterProps {
  shop: any;
}

export function Footer({ shop }: FooterProps) {
  const logo = shop?.logo_url || logoUrl;
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#050505] border-t border-white/5 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center text-center mb-12">
          <img
            src={logo}
            alt={shop?.name ?? "Manoel Eves"}
            className="h-16 w-16 rounded-full object-contain border border-white/10 mb-6"
          />
          <h2 className="font-display text-2xl tracking-[0.2em] text-white mb-6">
            {shop?.name?.toUpperCase() ?? "MANOEL EVES"}
          </h2>
          
          <div className="flex gap-6 mb-8">
            <a href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-[#d4a857] hover:border-[#d4a857] transition-all">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-[#d4a857] hover:border-[#d4a857] transition-all">
              <Facebook className="h-4 w-4" />
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 font-light uppercase tracking-wider">
            <a href="#servicos" className="hover:text-white transition-colors">Serviços</a>
            <a href="#equipe" className="hover:text-white transition-colors">Equipe</a>
            <a href="/assinaturas" className="hover:text-white transition-colors">Clube</a>
            <a href="#contato" className="hover:text-white transition-colors">Contato</a>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600 font-light">
          <p>&copy; {currentYear} {shop?.name ?? "Manoel Eves"}. Todos os direitos reservados.</p>
          <p>Feito para cavalheiros.</p>
        </div>
      </div>
    </footer>
  );
}
