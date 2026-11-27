import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import type { Series } from '@/domain/types';
import { cn } from '@/lib/utils';
import { Poster } from './Poster';

const BADGE: Record<string, string> = {
  'Em alta': 'bg-brand text-white',
  Novo: 'bg-white text-ink',
  Completa: 'bg-black/60 text-white ring-1 ring-white/25 backdrop-blur'
};

export function SeriesCard({ series, className, progress }: { series: Series; className?: string; progress?: number }) {
  return (
    <Link to={`/series/${series.id}`} className={cn('group block w-[132px] shrink-0 snap-start sm:w-[150px] lg:w-[168px]', className)} aria-label={series.title}>
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/[0.08] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_-12px_rgba(229,46,77,0.45)] group-hover:ring-brand/60">
        <Poster series={series} />
        {series.badge && (
          <span className={cn('absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold', BADGE[series.badge] ?? BADGE['Em alta'])}>{series.badge}</span>
        )}
        <span className="absolute right-2 top-2 z-10 grid h-9 w-9 scale-75 place-items-center rounded-full bg-brand text-white opacity-0 shadow-lg transition duration-300 group-hover:scale-100 group-hover:opacity-100" aria-hidden>
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </span>
        {progress !== undefined && (
          <div className="absolute inset-x-0 bottom-0 z-20 h-1 bg-white/15"><div className="h-full bg-brand" style={{ width: `${progress}%` }} /></div>
        )}
      </div>
      <p className="mt-2 truncate text-[11px] text-gray-400">{series.genres.slice(0, 2).join(' · ')} · {series.episodes_count} eps</p>
    </Link>
  );
}
