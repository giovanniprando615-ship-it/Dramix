import { Link } from 'react-router-dom';
import type { Series } from '@/domain/types';
import { Poster } from './Poster';

/** Número gigante atrás do pôster, como a vitrine de mais vistos dos grandes streamings. */
export function Top10Card({ series, rank }: { series: Series; rank: number }) {
  return (
    <Link to={`/series/${series.id}`} className="group relative flex w-[200px] shrink-0 snap-start items-end sm:w-[226px]" aria-label={`${rank}º lugar: ${series.title}`}>
      <span
        aria-hidden
        className="font-display pointer-events-none absolute -left-1 bottom-[-0.12em] select-none text-[150px] leading-none sm:text-[176px]"
        style={{ WebkitTextStroke: '3px rgba(229,46,77,0.9)', color: '#060810', textShadow: '0 0 40px rgba(229,46,77,0.25)' }}
      >
        {rank}
      </span>
      <div className="relative ml-auto w-[128px] overflow-hidden rounded-2xl ring-1 ring-white/10 transition duration-300 group-hover:-translate-y-1 group-hover:ring-brand/60 sm:w-[142px]">
        <Poster series={series} size="sm" />
      </div>
    </Link>
  );
}
