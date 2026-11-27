import { useEffect, useState } from 'react';
import { AnimatePresence, m as motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Info, Play } from 'lucide-react';
import type { Series } from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { useUI } from '@/store/ui';
import { cn, freeLabel, prefersReducedMotion, safeImg } from '@/lib/utils';

/** Destaque principal: até 5 séries, troca sozinho a cada 7 s (pausa com o mouse em cima ou movimento reduzido). */
export function Hero({ items }: { items: Series[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const play = useUI(s => s.play);
  const s = items[index];

  useEffect(() => {
    if (paused || items.length < 2 || prefersReducedMotion()) return;
    const t = setInterval(() => setIndex(i => (i + 1) % items.length), 7000);
    return () => clearInterval(t);
  }, [paused, items.length]);

  if (!s) return null;
  return (
    <section
      className="relative h-[68vh] min-h-[460px] max-h-[620px] overflow-hidden rounded-3xl border border-white/10 bg-ink-800"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carrossel"
      aria-label="Destaques"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.img
          key={s.id}
          src={safeImg(s.backdrop_url || s.poster_url)}
          alt=""
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-black/30" />

      <div className="relative z-10 flex h-full max-w-2xl flex-col justify-end gap-4 p-6 md:p-12">
        <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {s.weekly_rank && s.weekly_rank <= 10 && <span className="rounded-md bg-brand px-2 py-0.5 font-black text-white">Top {s.weekly_rank} da semana</span>}
            <span className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 font-bold text-gray-200">{s.content_rating}</span>
            {freeLabel(s.free_episodes_count) && <span className="font-bold text-emerald-300">{freeLabel(s.free_episodes_count)}</span>}
            <span className="text-gray-300">{s.genres.join(', ')}</span>
          </div>
          <h1 className="text-balance text-3xl font-black leading-[1.05] text-white drop-shadow md:text-5xl">{s.title}</h1>
          <p className="line-clamp-3 max-w-xl text-sm leading-relaxed text-gray-300">{s.synopsis}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button size="lg" onClick={() => play(s.id, 1)}><Play className="h-4 w-4 fill-current" aria-hidden />Assistir grátis</Button>
            <Link to={`/series/${s.id}`} className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur hover:bg-white/20">
              <Info className="h-4 w-4" aria-hidden />Ver episódios
            </Link>
          </div>
        </motion.div>
      </div>

      {items.length > 1 && (
        <div className="absolute bottom-5 right-6 z-10 flex gap-1.5" role="tablist" aria-label="Escolher destaque">
          {items.map((it, i) => (
            <button
              key={it.id}
              role="tab"
              aria-selected={i === index}
              aria-label={it.title}
              onClick={() => setIndex(i)}
              className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-7 bg-white' : 'w-3 bg-white/35 hover:bg-white/60')}
            />
          ))}
        </div>
      )}
    </section>
  );
}
