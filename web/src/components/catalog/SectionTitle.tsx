import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export function SectionTitle({ title, to, sub }: { title: string; to?: string; sub?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-[26px] leading-none text-white md:text-[32px]">{title}</h2>
        {sub && <p className="mt-1.5 text-xs text-gray-400">{sub}</p>}
      </div>
      {to && (
        <Link to={to} className="group inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-gray-400 hover:text-white">
          Ver tudo<ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
