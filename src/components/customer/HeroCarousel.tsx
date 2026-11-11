import { useEffect, useState } from "react";
import { ArrowUpRight, Flame, Pause, Play, Utensils } from "lucide-react";
import type { MenuItem } from "../../config/supabase";
import { getProductImages } from "../../utils/menuItem";

interface HeroCarouselProps {
  items: MenuItem[];
  onOpen: (item: MenuItem) => void;
}

export const HeroCarousel = ({ items, onOpen }: HeroCarouselProps) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const slides = items.map((item) => ({ item, image: getProductImages(item)[0]?.url })).filter((slide) => slide.image);
  const count = slides.length;
  const activeIndex = count ? index % count : 0;

  useEffect(() => {
    if (count < 2 || paused || hovered || focused) return;
    const timer = window.setInterval(() => {
      if (!document.hidden && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setIndex((current) => (current + 1) % count);
      }
    }, 6000);
    return () => window.clearInterval(timer);
  }, [count, index, paused, hovered, focused]);

  return (
    <div className="relative order-1 min-w-0 pb-2 pr-2 md:order-2 sm:pb-3 sm:pr-3"
      role="region" aria-roledescription="carrusel" aria-label="Platos destacados"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div aria-hidden="true" className="absolute inset-0 left-2 top-2 bg-yellow-400 sm:left-3 sm:top-3" />
      {count > 0 ? (
        <div className="relative border-2 border-yellow-400 bg-zinc-950">
          <div className="grid overflow-hidden" aria-live={paused || focused ? "polite" : "off"}>
            {slides.map(({ item, image }, slideIndex) => {
              const active = slideIndex === activeIndex;
              return (
                <button key={item.id} type="button" onClick={() => onOpen(item)}
                  aria-label={`Ver ${item.name}`} aria-hidden={!active} inert={!active} tabIndex={active ? 0 : -1}
                  className={`group col-start-1 row-start-1 flex min-w-0 w-full flex-col text-left transition-opacity duration-700 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white motion-reduce:transition-none ${active ? "z-10 opacity-100" : "pointer-events-none opacity-0"}`}>
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-900">
                    <img src={image} alt={item.name} fetchPriority={slideIndex === 0 ? "high" : "auto"} decoding="async"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transform-none motion-reduce:transition-none" />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 border-2 border-black bg-yellow-400 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wide text-black shadow-[3px_3px_0_0_#000] sm:left-4 sm:top-4 sm:text-[10px]">
                      <Flame aria-hidden="true" className="h-3.5 w-3.5" /> Antojo de la casa
                    </span>
                  </div>
                  <div className="flex w-full flex-1 items-center justify-between gap-4 border-t-4 border-yellow-400 bg-zinc-950 p-4 sm:p-5">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-yellow-400">Cero tacañería</p>
                      <p className="mt-2 break-words text-lg font-black uppercase leading-tight text-white sm:text-2xl">{item.name}</p>
                      <p className="mt-2 text-xs font-bold text-white/60">Mira lo que incluye</p>
                    </div>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center border-2 border-yellow-400 bg-yellow-400 text-black transition-colors group-hover:bg-black group-hover:text-yellow-400">
                      <ArrowUpRight aria-hidden="true" className="h-5 w-5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {count > 1 && (
            <div className="flex items-center justify-between gap-2 border-t border-white/15 px-3 py-1">
              <div className="flex flex-wrap items-center" role="group" aria-label="Elegir plato destacado">
                {slides.map(({ item }, slideIndex) => (
                  <button key={item.id} type="button" onClick={() => setIndex(slideIndex)} aria-label={`Mostrar ${item.name}`} aria-pressed={activeIndex === slideIndex}
                    className="flex h-11 w-9 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400">
                    <span className={`h-1.5 transition-all duration-300 motion-reduce:transition-none ${activeIndex === slideIndex ? "w-6 bg-yellow-400" : "w-3 bg-white/35"}`} />
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setPaused((current) => !current)} aria-label={paused ? "Reanudar rotación" : "Pausar rotación"} aria-pressed={paused}
                className="flex h-11 w-11 shrink-0 items-center justify-center text-yellow-400 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400">
                {paused ? <Play aria-hidden="true" className="h-4 w-4" /> : <Pause aria-hidden="true" className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative flex aspect-[4/3] flex-col items-center justify-center gap-4 border-2 border-yellow-400 bg-zinc-950 p-6 text-center">
          <Utensils aria-hidden="true" className="h-12 w-12 text-yellow-400" />
          <p className="text-xl font-black uppercase text-white">Puro exceso. Cero miedo.</p>
          <a href="#catalogo" className="text-xs font-bold text-yellow-400 underline underline-offset-4">Explora el menú</a>
        </div>
      )}
    </div>
  );
};
