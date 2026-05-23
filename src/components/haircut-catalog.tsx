import { useQuery } from "@tanstack/react-query";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function HaircutCatalog({
  title = "Catálogo de cortes",
  subtitle = "Inspire-se nos estilos que fazemos.",
  className,
}: Props) {
  const { data: styles, isLoading } = useQuery({
    queryKey: ["haircut-styles-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("haircut_styles")
        .select("id, name, description, image_url, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  if (isLoading || !styles || styles.length === 0) return null;

  return (
    <section className={className}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl tracking-wider">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      <Carousel opts={{ align: "start", loop: styles.length > 3 }} className="w-full">
        <CarouselContent className="-ml-3">
          {styles.map((s) => (
            <CarouselItem
              key={s.id}
              className="basis-2/3 pl-3 sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
            >
              <figure className="group overflow-hidden rounded-xl border border-border bg-card">
                <div className="aspect-[3/4] w-full overflow-hidden bg-secondary">
                  <img
                    src={s.image_url}
                    alt={s.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <figcaption className="p-3">
                  <p className="font-display text-base tracking-wide">{s.name}</p>
                  {s.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {s.description}
                    </p>
                  )}
                </figcaption>
              </figure>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </section>
  );
}
