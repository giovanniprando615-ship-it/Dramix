import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatViews = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')} mi` : n >= 1000 ? `${Math.round(n / 1000)} mil` : String(n);

export const formatTime = (s: number) => {
  if (!Number.isFinite(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

export const formatDate = (iso: string, withTime = false) =>
  new Date(iso).toLocaleString('pt-BR', withTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' });

export const formatCountdown = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}h ${m}min` : `${m}min`;
};

/** Só aceita imagens http(s) ou data:image — bloqueia javascript: e afins em src. */
export const safeImg = (url: string | undefined | null) =>
  url && (/^https?:\/\//i.test(url) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(url)) ? url : undefined;

export const freeLabel = (free: number) => (free <= 0 ? null : free === 1 ? 'Ep. 1 grátis' : `${free} eps grátis`);

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
