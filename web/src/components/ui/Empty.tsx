import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function Empty({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-ink-700 px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-gray-400"><Icon className="h-6 w-6" aria-hidden /></span>
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="max-w-sm text-xs text-gray-400">{text}</p>
      {action}
    </div>
  );
}
