import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const VARIANTS = {
  primary: 'bg-brand hover:bg-brand-hover text-white shadow-lg shadow-brand/25',
  coin: 'bg-coin hover:bg-amber-300 text-black',
  secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/10',
  ghost: 'text-gray-300 hover:text-white hover:bg-white/5',
  danger: 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30'
} as const;

const SIZES = { sm: 'h-9 px-3.5 text-xs', md: 'h-11 px-5 text-sm', lg: 'h-12 px-6 text-sm' } as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant], SIZES[size], className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
