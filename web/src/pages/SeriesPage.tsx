import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, Lock, Play, Share2, Film } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { CoinAmount, CoinIcon } from '@/components/ui/CoinIcon';
import { Empty } from '@/components/ui/Empty';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { useAction, useSeries, useSession } from '@/lib/queries';
import { useUI } from '@/store/ui';
import { cn, formatViews, safeImg } from '@/lib/utils';

export default function SeriesPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useSeries(id);
  const { data: user } = useSession();
  const { play, openAuth } = useUI();
  const fav = useAction(() => api.toggleFavorite(id), { success: r => (r ? 'Adicionada à Minha Lista.' : 'Removida da Minha Lista.') });
  const bundle = useAction(() => api.unlockSeries(id), { silentError: true });

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-[420px] rounded-3xl" /><Skeleton className="h-40" /></div>;
  if (error || !data) {
    return <Empty icon={Film} title="Minissérie não encontrada" text="Ela pode ter saído do catálogo ou o link está incorreto."
      action={<Button size="sm" onClick={() => navigate('/')}>Voltar ao início</Button>} />;
  }

  const { series: s, episodes, progress, freeEpisodesCount, priceCoins } = data;
  const resume = progress && progress.progressPercent < 90;

  const share = async () => {
    const url = `${location.origin}${location.pathname}#/series/${s.id}`;
    try {
      if (navigator.share) await navigator.share({ title: s.title, url });
      else { await navigator.clipboard.writeText(url); toast.success('Link copiado.'); }
    } catch { /* cancelado */ }
  };

  const buyBundle = async () => {
    if (!data.bundle || !confirm(`Desbloquear ${data.bundle.lockedCount} episódios por ${data.bundle.price} moedas?`)) return;
    try {
      const r = await bundle.mutateAsync(undefined);
      toast.success(`${r.unlocked} episódios desbloqueados. Saldo: ${r.balance} moedas.`, { icon: <CoinIcon /> });
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'INSUFFICIENT_COINS') { toast.error(e.message); navigate('/store'); } else toast.error(e.message);
    }
  };

  return (
    <div className="space-y-10">
      <button onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))} className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden />Voltar
      </button>

      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-700">
        <img src={safeImg(s.backdrop_url)} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-700 via-ink-700/85 to-transparent" />
        <div className="relative flex flex-col items-start gap-8 p-6 md:flex-row md:p-10">
          <img src={safeImg(s.poster_url)} alt={`Pôster de ${s.title}`} className="mx-auto aspect-[9/16] w-44 shrink-0 rounded-2xl border border-white/15 object-cover shadow-2xl md:mx-0 md:w-56" />
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-300">
              <span className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 font-bold">{s.content_rating}</span>
              <span className="font-semibold">{s.genres.join(', ')}</span>
              <span className="text-gray-400">{s.episodes_count} episódios • {s.total_minutes} min</span>
              <span className="text-gray-400">{formatViews(s.views_count)} visualizações</span>
            </div>
            <h1 className="text-balance text-2xl font-black leading-tight text-white md:text-4xl">{s.title}</h1>
            {s.tropes.length > 0 && <div className="flex flex-wrap gap-1.5">{s.tropes.map(t => <span key={t} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-gray-300">{t}</span>)}</div>}
            <p className="max-w-3xl text-sm leading-relaxed text-gray-300">{s.synopsis}</p>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 font-bold text-emerald-300">Episódios 1 a {freeEpisodesCount} grátis</span>
              {user?.isPremium
                ? <span className="rounded-lg bg-coin/15 px-2.5 py-1 font-bold text-coin">Tudo liberado pelo Premium</span>
                : <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 font-semibold text-gray-300"><CoinIcon className="h-3.5 w-3.5" />{priceCoins} moedas por episódio depois</span>}
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button size="lg" onClick={() => (resume ? play(s.id, progress!.episode.episode_number, progress!.progressSeconds) : play(s.id, progress && progress.episode.episode_number < s.episodes_count ? progress.episode.episode_number + 1 : 1))} data-testid="series-play">
                <Play className="h-4 w-4 fill-current" aria-hidden />
                {resume ? `Continuar do episódio ${progress!.episode.episode_number}` : progress ? 'Assistir próximo episódio' : 'Assistir episódio 1 grátis'}
              </Button>
              <Button size="lg" variant="secondary" aria-pressed={data.isFavorite} onClick={() => (user ? fav.mutate(undefined) : openAuth('login'))}>
                <Heart className={cn('h-4 w-4', data.isFavorite && 'fill-brand text-brand')} aria-hidden />{data.isFavorite ? 'Na Minha Lista' : 'Minha Lista'}
              </Button>
              <Button size="lg" variant="secondary" onClick={share}><Share2 className="h-4 w-4" aria-hidden />Compartilhar</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="eps-title">
        <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-end">
          <div>
            <h2 id="eps-title" className="text-lg font-bold text-white">Episódios</h2>
            <p className="text-xs text-gray-400">Desbloqueou uma vez, fica liberado para sempre na sua conta.</p>
          </div>
          {data.bundle && (
            <Button variant="secondary" size="sm" className="border-coin/30 bg-coin/10 text-amber-100 hover:bg-coin/20" loading={bundle.isPending} onClick={buyBundle}>
              Desbloquear os {data.bundle.lockedCount} restantes <CoinAmount value={data.bundle.price} /> <span className="text-emerald-400">-{data.bundle.discount}%</span>
            </Button>
          )}
        </div>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {episodes.map(e => {
            const current = progress?.episode.id === e.id;
            return (
              <li key={e.id}>
                <button onClick={() => play(s.id, e.episode_number, current && resume ? progress!.progressSeconds : 0)} data-ep={e.episode_number}
                  className={cn('group flex w-full items-center justify-between gap-3 rounded-2xl border bg-ink-700 p-3.5 text-left hover:border-brand/50', current ? 'border-brand/60' : 'border-white/10')}
                  aria-label={`Episódio ${e.episode_number}: ${e.title}${e.access.allowed ? '' : ', bloqueado'}`}>
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-bold text-white group-hover:bg-brand', current ? 'bg-brand' : 'bg-white/5')}>{e.episode_number}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-white">{e.title}</span>
                      <span className="text-[11px] text-gray-400">{Math.max(1, Math.round(e.duration_seconds / 60))} min{current ? ' • parou aqui' : ''}</span>
                    </span>
                  </span>
                  {e.access.accessType === 'free' ? <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">Grátis</span>
                    : e.access.allowed ? <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-300">{e.access.accessType === 'premium' ? 'Premium' : 'Desbloqueado'}</span>
                    : <span className="inline-flex items-center gap-1 rounded-md bg-coin/10 px-2 py-0.5 text-[10px] font-bold text-coin"><Lock className="h-3 w-3" aria-hidden /><CoinIcon className="h-3 w-3" />{priceCoins}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
