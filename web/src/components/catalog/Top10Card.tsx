import { Link } from 'react-router-dom';
import type { Series } from '@/domain/types';
import { safeImg } from '@/lib/utils';

export function Top10Card({ series, rank }: { series: Series; rank: number }) {
  return (
    <Link to={`/series/${series.id}`} className="group flex shrink-0 snap-start items-end" aria-label={`${rank}º lugar: ${series.title}`}>
      <span className="text-outline -mr-3 select-none text-[7.5rem] font-black leading-[0.8] tracking-tighter md:text-[9rem]" aria-hidden>{rank}</span>
      <div className="relative aspect-[9/16] w-28 overflow-hidden rounded-xl border border-white/10 transition group-hover:border-brand/70 md:w-32">
        <img src={safeImg(series.poster_url)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      </div>
    </Link>
  );
}
