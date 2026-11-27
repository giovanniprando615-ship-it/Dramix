import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Info, Play, Volume2, VolumeX } from 'lucide-react';
import { api } from '@/lib/api';
import { useAction, useFeed, useLibrary, useSession } from '@/lib/queries';
import { useUI } from '@/store/ui';
import { cn, freeLabel, safeImg } from '@/lib/utils';
import type { Series } from '@/domain/types';

/** "Para você": trailers verticais, um por tela. Só o trailer visível toca; os outros ficam pausados. */
export default function Feed() {
  const { data } = useFeed();
  const [muted, setMuted] = useState(true);
  const [active, setActive] = useState(0);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index)); }),
      { root, threshold: 0.6 }
    );
    root.querySelectorAll('[data-index]').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [data]);

  return (
    <div className="-mx-4 -mt-6 sm:-mx-6 md:mx-auto md:mt-0 md:max-w-[440px]">
      <div ref={container} className="scrollbar-none h-[calc(100dvh-4rem-64px)] snap-y snap-mandatory overflow-y-scroll md:h-[calc(100dvh-8rem)] md:rounded-3xl md:border md:border-white/10" aria-label="Trailers recomendados">
        {data?.map((s, i) => <FeedItem key={s.id} series={s} index={i} active={i === active} muted={muted} onToggleMute={() => setMuted(m => !m)} />)}
      </div>
    </div>
  );
}

function FeedItem({ series, index, active, muted, onToggleMute }: { series: Series; index: number; active: boolean; muted: boolean; onToggleMute: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const { data: user } = useSession();
  const { data: library } = useLibrary(!!user);
  const { play, openAuth } = useUI();
  const fav = useAction(() => api.toggleFavorite(series.id), { success: r => (r ? 'Adicionada à Minha Lista.' : 'Removida da Minha Lista.') });
  const isFav = !!library?.favorites.some(f => f.id === series.id);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (active) v.play().catch(() => {});
    else { v.pause(); v.currentTime = 0; }
  }, [active]);

  return (
    <section data-index={index} className="relative h-full w-full snap-start snap-always overflow-hidden bg-black" aria-label={series.title}>
      <video ref={video} src={series.trailer_url} poster={safeImg(series.poster_url)} muted={muted} loop playsInline preload={active ? 'auto' : 'none'}
        className="absolute inset-0 h-full w-full object-cover" onClick={() => play(series.id, 1)} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/40" />

      <button onClick={onToggleMute} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur" aria-label={muted ? 'Ativar som' : 'Silenciar'}>
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      <div className="absolute bottom-28 right-3 flex flex-col gap-4">
        <button onClick={() => (user ? fav.mutate(undefined) : openAuth('login'))} className="grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white backdrop-blur" aria-label={isFav ? 'Remover da Minha Lista' : 'Adicionar à Minha Lista'}>
          <Heart className={cn('h-6 w-6', isFav && 'fill-brand text-brand')} />
        </button>
        <Link to={`/series/${series.id}`} className="grid h-11 w-11 place-items-center rounded-full bg-black/40 text-white backdrop-blur" aria-label="Ver episódios">
          <Info className="h-6 w-6" />
        </Link>
      </div>

      <div className="absolute inset-x-0 bottom-0 space-y-3 p-5 pr-20">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {freeLabel(series.free_episodes_count) && <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-300">{freeLabel(series.free_episodes_count)}</span>}
          <span className="text-gray-300">{series.genres.slice(0, 3).join(', ')}</span>
        </div>
        <h2 className="text-xl font-black leading-tight text-white">{series.title}</h2>
        <p className="line-clamp-2 text-xs text-gray-300">{series.synopsis}</p>
        <button onClick={() => play(series.id, 1)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-hover">
          <Play className="h-4 w-4 fill-current" aria-hidden />Assistir episódio 1
        </button>
      </div>
    </section>
  );
}
