import { cn } from '@/lib/utils';

export function CoinIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('h-4 w-4 shrink-0', className)} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#F5B83D" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#B57F14" strokeWidth="1.5" />
      <path d="M12 7.5v9M9.5 9.5h3.8a1.6 1.6 0 010 3.2h-2.6a1.6 1.6 0 000 3.2h3.8" fill="none" stroke="#7A520A" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CoinAmount({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 font-black tabular-nums', className)}>
      <CoinIcon /> {value}
    </span>
  );
}
