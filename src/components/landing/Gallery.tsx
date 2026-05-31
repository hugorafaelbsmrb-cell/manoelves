const images = [
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1512496015851-a1cbf2155bc8?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=800"
];

export function Gallery() {
  return (
    <section className="bg-[#111] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <p className="text-[#d4a857] text-xs uppercase tracking-[0.3em] font-medium mb-3">Nosso Trabalho</p>
          <h2 className="font-display text-4xl md:text-5xl text-white">Galeria</h2>
          <div className="h-px w-20 bg-[#d4a857] mx-auto mt-8"></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((src, i) => (
            <div key={i} className="group relative overflow-hidden aspect-square bg-[#1a1a1a]">
              <img 
                src={src} 
                alt={`Corte ${i + 1}`} 
                className="w-full h-full object-cover filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/10 group-hover:ring-[#d4a857]/50 transition-colors duration-500"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
