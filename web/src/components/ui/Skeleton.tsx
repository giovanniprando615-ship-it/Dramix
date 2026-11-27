import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl bg-white/5', className)} aria-hidden>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="space-y-6" role="status" aria-label="Carregando">
      <Skeleton className="h-[420px] w-full rounded-3xl" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-[9/16] w-40 shrink-0" />)}
      </div>
    </div>
  );
}
