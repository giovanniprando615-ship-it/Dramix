import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import type { Series } from '@/domain/types';
import { cn, freeLabel, safeImg } from '@/lib/utils';

export function SeriesCard({ series, className, progress }: { series: Series; className?: string; progress?: number }) {
  const free = freeLabel(series.free_episodes_count);
  return (
    <Link to={`/series/${series.id}`} className={cn('group block w-36 shrink-0 snap-start sm:w-40 md:w-44', className)} aria-label={series.title}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-xl border border-white/10 bg-ink-800 transition duration-300 group-hover:border-brand/70 group-hover:shadow-xl group-hover:shadow-brand/10">
        <img src={safeImg(series.poster_url)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {series.badge && <span className="rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-black text-white">{series.badge}</span>}
          {free && <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 backdrop-blur">{free}</span>}
        </div>
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-gray-300">{series.content_rating}</span>
        <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-brand/90 text-white shadow-lg"><Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden /></span>
        </span>
        {progress !== undefined && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20"><div className="h-full bg-brand" style={{ width: `${progress}%` }} /></div>
        )}
      </div>
      <h3 className="mt-2 truncate text-xs font-bold text-white group-hover:text-brand">{series.title}</h3>
      <p className="truncate text-[11px] text-gray-400">{series.episodes_count} episódios • {series.genres.slice(0, 2).join(', ')}</p>
    </Link>
  );
}
