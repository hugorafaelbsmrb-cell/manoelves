import { MapPin, Clock, MessageCircle } from "lucide-react";

interface LocationProps {
  shop: {
    address?: string | null;
    phone?: string | null;
    working_hours?: string | null;
    map_embed_url?: string | null;
  } | null | undefined;
}

export function Location({ shop }: LocationProps) {
  const address = shop?.address?.trim() || "Rua Fictícia, 123 - Centro, Cidade - UF";
  const phone = shop?.phone?.trim() || "";
  const waNumber = phone.replace(/\D/g, "");
  const whatsappLink = waNumber ? `https://wa.me/${waNumber}` : "https://wa.me/5511999999999";
  const whatsappLabel = phone || "+55 (11) 99999-9999";
  const hours =
    shop?.working_hours?.trim() ||
    "Seg a Sex: 09h às 20h\nSábado: 09h às 18h\nDomingo: Fechado";
  // Mapa: usa o embed salvo em Configurações; sem ele, gera do endereço.
  const mapSrc =
    shop?.map_embed_url?.trim() ||
    `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

  return (
    <section className="bg-[#0a0a0a] py-24 relative border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div className="order-2 lg:order-1 h-[400px] lg:h-[500px] w-full border border-white/10 relative group">
            {/* Overlay para não roubar scroll na primeira interação */}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent pointer-events-none transition-colors duration-500 z-10"></div>
            <iframe 
              src={mapSrc}
              width="100%" 
              height="100%" 
              style={{ border: 0, filter: "grayscale(1) contrast(1.2) opacity(0.8)" }} 
              allowFullScreen={false} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              title="Localização Manoel Eves"
            ></iframe>
          </div>

          <div className="order-1 lg:order-2">
            <p className="text-[#d4a857] text-xs uppercase tracking-[0.3em] font-medium mb-3">Visite-nos</p>
            <h2 className="font-display text-4xl md:text-5xl text-white mb-8">Localização & Contato</h2>
            
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="mt-1 w-10 h-10 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-[#d4a857]" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1 uppercase tracking-wider text-sm">Endereço</h3>
                  <p className="text-gray-400 font-light">{address}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 w-10 h-10 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-[#d4a857]" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1 uppercase tracking-wider text-sm">Horário de Funcionamento</h3>
                  <p className="text-gray-400 font-light whitespace-pre-line">{hours}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 w-10 h-10 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-5 w-5 text-[#d4a857]" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1 uppercase tracking-wider text-sm">WhatsApp</h3>
                  <a href={whatsappLink} target="_blank" rel="noreferrer" className="text-gray-400 font-light hover:text-[#d4a857] transition-colors">
                    {whatsappLabel}
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <a 
                href={whatsappLink}
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-transparent border border-[#d4a857] text-[#d4a857] hover:bg-[#d4a857] hover:text-black px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
