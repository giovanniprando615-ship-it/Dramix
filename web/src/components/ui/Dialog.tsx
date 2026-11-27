import * as RD from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  hideTitle?: boolean;
  children: ReactNode;
  className?: string;
  dismissible?: boolean;
}

/** Janela acessível (foco preso, Esc fecha). No celular vira painel que sobe de baixo. */
export function Dialog({ open, onOpenChange, title, description, hideTitle, children, className, dismissible = true }: Props) {
  return (
    <RD.Root open={open} onOpenChange={o => (dismissible || o) && onOpenChange(o)}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm" />
        <RD.Content
          onEscapeKeyDown={e => !dismissible && e.preventDefault()}
          onPointerDownOutside={e => !dismissible && e.preventDefault()}
          className={cn(
            'fixed z-[61] bottom-0 inset-x-0 max-h-[94vh] overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-700 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl outline-none',
            'sm:bottom-auto sm:right-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-7',
            className
          )}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" aria-hidden />
          <RD.Title className={cn('font-display pr-10 text-[30px] leading-[0.95] text-white', hideTitle && 'sr-only')}>{title}</RD.Title>
          {description ? <RD.Description className="mt-1 text-xs text-gray-400">{description}</RD.Description> : <RD.Description className="sr-only">{title}</RD.Description>}
          {dismissible && (
            <RD.Close className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full text-gray-400 hover:bg-white/5 hover:text-white" aria-label="Fechar">
              <X className="h-5 w-5" />
            </RD.Close>
          )}
          <div className={cn(!hideTitle && 'mt-5')}>{children}</div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
