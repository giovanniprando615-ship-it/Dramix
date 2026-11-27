import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface Props extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string; hint?: string }

export const Field = forwardRef<HTMLInputElement, Props>(({ label, error, hint, id, className, ...props }, ref) => {
  const fid = id ?? props.name;
  return (
    <div className="space-y-1">
      <label htmlFor={fid} className="block text-[11px] font-medium text-gray-400">{label}</label>
      <input
        ref={ref}
        id={fid}
        aria-invalid={!!error}
        aria-describedby={error ? `${fid}-error` : undefined}
        className={cn('h-11 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-brand', error && 'border-red-500/60', className)}
        {...props}
      />
      {error ? <p id={`${fid}-error`} className="text-[11px] text-red-400">{error}</p> : hint ? <p className="text-[11px] text-gray-500">{hint}</p> : null}
    </div>
  );
});
Field.displayName = 'Field';
