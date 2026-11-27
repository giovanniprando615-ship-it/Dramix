import { useEffect, useState } from 'react';
import { AnimatePresence, m as motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, Plus } from 'lucide-react';
import type { Series } from '@/domain/types';
import { useUI } from '@/store/ui';
import { cn, formatViews, freeLabel, prefersReducedMotion, safeImg } from '@/lib/utils';

const INTERVAL = 8000;

/**
 * Destaque de ponta a ponta, por baixo do cabeçalho transparente.
 * Celular usa a arte vertical; computador usa o banner horizontal e miniaturas para escolher.
 */
export function Hero({ items }: { items: Series[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const play = useUI(s => s.play);
  const s = items[index];
  const auto = items.length > 1 && !paused && !prefersReducedMotion();

  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => setIndex(i => (i + 1) % items.length), INTERVAL);
    return () => clearTimeout(t);
  }, [auto, index, items.length]);

  if (!s) return null;
  const free = freeLabel(s.free_episodes_count);

  return (
    <section
      className="full-bleed -mt-[5.5rem] h-[86svh] min-h-[560px] max-h-[860px] overflow-hidden bg-ink"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carrossel"
      aria-label="Destaques"
    >
      <AnimatePresence initial={false}>
        <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }} className="absolute inset-0">
          <picture>
            <source media="(min-width: 768px)" srcSet={safeImg(s.backdrop_url)} />
            <img src={safeImg(s.poster_url)} alt="" className="animate-kenburns h-full w-full object-cover object-[50%_20%]" />
          </picture>
        </motion.div>
      </AnimatePresence>

      {/* Leitura do texto: escurece de baixo para cima e da esquerda para a direita */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,16,0.75)_0%,rgba(6,8,16,0)_22%,rgba(6,8,16,0)_45%,rgba(6,8,16,0.92)_82%,#060810_100%)]" />
      <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(6,8,16,0.92)_0%,rgba(6,8,16,0.55)_38%,rgba(6,8,16,0)_65%)] md:block" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_15%_85%,rgba(229,46,77,0.22),transparent)]" />

      <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-10 sm:px-6 md:pb-16 lg:px-8">
        <motion.div key={s.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="max-w-2xl">
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-gray-200">
            {s.weekly_rank && s.weekly_rank <= 10 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 font-bold text-white">
                <span className="font-display text-sm leading-none">#{s.weekly_rank}</span> no Brasil<span className="hidden sm:inline"> esta semana</span>
              </span>
            )}
            <span className="rounded-md border border-white/25 px-1.5 py-0.5 text-[11px]">{s.content_rating}</span>
            <span>{s.genres.slice(0, 3).join(' · ')}</span>
          </div>

          <h1 className="poster-title text-balance text-[52px] text-white sm:text-[68px] md:text-[86px]">{s.title}</h1>

          <p className="mt-4 line-clamp-2 max-w-xl text-sm leading-relaxed text-gray-300 md:line-clamp-3 md:text-[15px]">{s.synopsis}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button onClick={() => play(s.id, 1)} className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-ink transition hover:bg-white/85 active:scale-[0.98]">
              <Play className="h-4 w-4 fill-current" aria-hidden />Assistir episódio 1
            </button>
            <Link to={`/series/${s.id}`} className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20">
              <Plus className="h-4 w-4" aria-hidden />Episódios
            </Link>
            <span className="text-xs text-gray-300">
              {free && <b className="font-semibold text-emerald-300">{free}</b>}{free && ' · '}{formatViews(s.views_count)} visualizações
            </span>
          </div>
        </motion.div>

        {items.length > 1 && (
          <div className="mt-8 flex items-end gap-3 md:absolute md:bottom-16 md:right-6 md:mt-0 lg:right-8" role="tablist" aria-label="Escolher destaque">
            {items.map((it, i) => {
              const active = i === index;
              return (
                <button key={it.id} role="tab" aria-selected={active} aria-label={it.title} onClick={() => setIndex(i)}
                  className={cn('group relative overflow-hidden rounded-xl ring-1 transition-all duration-500',
                    'h-1.5 w-8 md:h-auto md:w-[72px]', active ? 'ring-white md:w-[88px]' : 'ring-white/15 opacity-60 hover:opacity-100')}>
                  <img src={safeImg(it.poster_url)} alt="" className="hidden aspect-[9/16] w-full object-cover md:block" />
                  <span className={cn('absolute inset-0 md:hidden', active ? 'bg-white/30' : 'bg-white/25')} />
                  {active && (
                    <span className="absolute inset-x-0 bottom-0 h-full bg-white md:h-1" style={auto ? { animation: `heroProgress ${INTERVAL}ms linear forwards`, transformOrigin: 'left' } : undefined} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <style>{'@keyframes heroProgress { from { transform: scaleX(0) } to { transform: scaleX(1) } }'}</style>
    </section>
  );
}
