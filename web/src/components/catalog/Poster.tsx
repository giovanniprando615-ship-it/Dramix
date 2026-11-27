import { useState } from 'react';
import type { Series } from '@/domain/types';
import { cn, safeImg } from '@/lib/utils';

/**
 * Pôster da série: foto com tratamento de cor + título composto sobre a imagem,
 * como a capa de um filme. Se a imagem falhar, fica o fundo em gradiente com o título.
 */
export function Poster({ series, size = 'md', className, showTitle = true }: { series: Series; size?: 'sm' | 'md' | 'lg'; className?: string; showTitle?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = safeImg(series.poster_url);
  const titleSize = { sm: 'text-[15px]', md: 'text-[19px] sm:text-[21px]', lg: 'text-[30px] md:text-[38px]' }[size];
  return (
    <div className={cn('poster-grade relative aspect-[9/16] overflow-hidden bg-gradient-to-br from-[#3a0f1f] via-ink-600 to-ink-800', className)}>
      {src && !failed && (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)}
          className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]" />
      )}
      {showTitle && (
        <p className={cn('poster-title absolute inset-x-0 bottom-0 z-10 line-clamp-4 p-3 text-white', titleSize, size === 'lg' && 'p-5')}>
          {series.title}
        </p>
      )}
    </div>
  );
}
