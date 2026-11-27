import { useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionTitle } from './SectionTitle';

/** Fileira horizontal: arrastar no celular, setas no computador. */
export function Row({ title, children, to, sub }: { title: string; children: ReactNode; to?: string; sub?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className="group/row relative" aria-label={title}>
      <SectionTitle title={title} to={to} sub={sub} />
      <div className="relative">
        <button onClick={() => scroll(-1)} aria-label={`Voltar em ${title}`} className="absolute -left-4 top-[42%] z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/80 text-white opacity-0 transition hover:bg-brand group-hover/row:opacity-100 md:grid">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div ref={ref} className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 pt-1 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:gap-4 lg:-mx-8 lg:scroll-px-8 lg:px-8">{children}</div>
        <button onClick={() => scroll(1)} aria-label={`Avançar em ${title}`} className="absolute -right-4 top-[42%] z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/80 text-white opacity-0 transition hover:bg-brand group-hover/row:opacity-100 md:grid">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
