import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Heart, Lock, Play, Share2, Film } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { Empty } from '@/components/ui/Empty';
import { Skeleton } from '@/components/ui/Skeleton';
import { Poster } from '@/components/catalog/Poster';
import { Row } from '@/components/catalog/Row';
import { SeriesCard } from '@/components/catalog/SeriesCard';
import { api } from '@/lib/api';
import { useAction, useCatalog, useSeries, useSession } from '@/lib/queries';
import { useUI } from '@/store/ui';
import { cn, formatViews, safeImg } from '@/lib/utils';

export default function SeriesPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useSeries(id);
  const { data: user } = useSession();
  const { data: catalog } = useCatalog();
  const { play, openAuth } = useUI();
  const [expanded, setExpanded] = useState(false);
  const fav = useAction(() => api.toggleFavorite(id), { success: r => (r ? 'Adicionada à Minha Lista.' : 'Removida da Minha Lista.') });
  const bundle = useAction(() => api.unlockSeries(id), { silentError: true });

  const similar = useMemo(() => {
    if (!data || !catalog) return [];
    const g = new Set(data.series.genres);
    return catalog.series
      .filter(s => s.id !== data.series.id)
      .map(s => ({ s, score: s.genres.filter(x => g.has(x)).length }))
      .sort((a, b) => b.score - a.score || b.s.views_count - a.s.views_count)
      .slice(0, 10)
      .map(x => x.s);
  }, [data, catalog]);

  if (isLoading) {
    return <div className="space-y-8"><Skeleton className="full-bleed -mt-[5.5rem] h-[70svh] rounded-none" /><Skeleton className="h-40" /></div>;
  }
  if (error || !data) {
    return <Empty icon={Film} title="Minissérie não encontrada" text="Ela pode ter saído do catálogo ou o link está incorreto."
      action={<Button size="sm" onClick={() => navigate('/')}>Voltar ao início</Button>} />;
  }

  const { series: s, episodes, progress, freeEpisodesCount, priceCoins } = data;
  const resume = progress && progress.progressPercent < 90;
  const nextEp = progress ? (resume ? progress.episode.episode_number : Math.min(progress.episode.episode_number + 1, s.episodes_count)) : 1;
  const startLabel = resume ? `Continuar episódio ${nextEp}` : progress ? `Assistir episódio ${nextEp}` : 'Assistir episódio 1';
  const unlockedCount = episodes.filter(e => e.access.allowed).length;

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
      toast.error(e.message);
      if (e.code === 'INSUFFICIENT_COINS') navigate('/store');
    }
  };

  const roundBtn = 'grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20';

  return (
    <div className="space-y-12">
      {/* Cabeçalho imersivo */}
      <section className="full-bleed -mt-[5.5rem] overflow-hidden bg-ink">
        <picture className="absolute inset-0">
          <source media="(min-width: 768px)" srcSet={safeImg(s.backdrop_url)} />
          <img src={safeImg(s.poster_url)} alt="" className="h-full w-full object-cover object-[50%_20%] md:opacity-45 md:blur-[2px]" />
        </picture>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,16,0.7)_0%,rgba(6,8,16,0)_25%,rgba(6,8,16,0.35)_50%,#060810_92%)]" />
        <div className="absolute inset-0 hidden bg-[radial-gradient(70%_80%_at_25%_60%,rgba(229,46,77,0.18),transparent)] md:block" />

        <div className="relative mx-auto flex min-h-[82svh] max-w-7xl flex-col justify-end gap-8 px-4 pb-8 pt-40 sm:px-6 md:min-h-0 md:flex-row md:items-end md:pb-14 md:pt-36 lg:px-8">
          <button onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))} className="absolute left-4 top-[5.25rem] grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur sm:left-6 lg:left-8" aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="hidden w-[260px] shrink-0 overflow-hidden rounded-3xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/15 md:block">
            <Poster series={s} size="lg" showTitle={false} />
          </div>

          <div className="min-w-0 flex-1 md:pb-2">
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-gray-200">
              {s.weekly_rank && s.weekly_rank <= 10 && <span className="rounded-full bg-brand px-2.5 py-0.5 font-bold text-white">#{s.weekly_rank} no Brasil</span>}
              <span className="rounded-md border border-white/25 px-1.5 py-0.5 text-[11px]">{s.content_rating}</span>
              <span>{s.genres.join(' · ')}</span>
            </div>
            <h1 className="poster-title text-balance text-[48px] text-white sm:text-[60px] lg:text-[76px]">{s.title}</h1>
            <p className="mt-3 text-xs text-gray-300">
              {s.episodes_count} episódios · {s.total_minutes} min · {formatViews(s.views_count)} visualizações
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button onClick={() => play(s.id, nextEp, resume ? progress!.progressSeconds : 0)} data-testid="series-play"
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand px-7 text-sm font-bold text-white shadow-[0_12px_30px_-8px_rgba(229,46,77,0.7)] transition hover:bg-brand-hover active:scale-[0.98] sm:flex-none">
                <Play className="h-4 w-4 fill-current" aria-hidden />{startLabel}
              </button>
              <button onClick={() => (user ? fav.mutate(undefined) : openAuth('login'))} aria-pressed={data.isFavorite} aria-label={data.isFavorite ? 'Remover da Minha Lista' : 'Adicionar à Minha Lista'} className={roundBtn}>
                <Heart className={cn('h-5 w-5', data.isFavorite && 'fill-brand text-brand')} />
              </button>
              <button onClick={share} aria-label="Compartilhar" className={roundBtn}><Share2 className="h-5 w-5" /></button>
            </div>

            <div className="mt-6 max-w-2xl">
              <p className={cn('text-sm leading-relaxed text-gray-300', !expanded && 'line-clamp-3 md:line-clamp-none')}>{s.synopsis}</p>
              <button onClick={() => setExpanded(e => !e)} className="mt-1 text-xs font-semibold text-white md:hidden">{expanded ? 'Ler menos' : 'Ler mais'}</button>
              {s.tropes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.tropes.map(t => <span key={t} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-gray-200">{t}</span>)}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Episódios em grade */}
      <section aria-labelledby="eps-title">
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 id="eps-title" className="font-display text-[30px] leading-none text-white md:text-[34px]">Episódios</h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
              <span><b className="text-emerald-300">1 a {freeEpisodesCount}</b> grátis</span>
              {user?.isPremium
                ? <span className="text-coin">Tudo liberado pelo Premium</span>
                : <span className="inline-flex items-center gap-1">depois <CoinIcon className="h-3.5 w-3.5" />{priceCoins} por episódio</span>}
              <span>{unlockedCount} de {episodes.length} liberados</span>
            </p>
          </div>
          {data.bundle && (
            <button onClick={buyBundle} disabled={bundle.isPending}
              className="inline-flex items-center justify-between gap-4 rounded-2xl border border-coin/30 bg-[linear-gradient(90deg,rgba(245,184,61,0.14),rgba(245,184,61,0.04))] px-4 py-3 text-left transition hover:border-coin/60 disabled:opacity-60">
              <span>
                <span className="block text-sm font-bold text-white">Liberar os {data.bundle.lockedCount} restantes</span>
                <span className="text-[11px] text-gray-400"><s>{data.bundle.fullPrice}</s> · economize {data.bundle.discount}%</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-coin px-3 py-1.5 text-sm font-black text-black"><CoinIcon />{data.bundle.price}</span>
            </button>
          )}
        </div>

        <ol className="grid grid-cols-5 gap-2.5 sm:grid-cols-8 lg:grid-cols-10">
          {episodes.map(e => {
            const current = progress?.episode.id === e.id;
            const locked = !e.access.allowed;
            return (
              <li key={e.id}>
                <button onClick={() => play(s.id, e.episode_number, current && resume ? progress!.progressSeconds : 0)} data-ep={e.episode_number}
                  aria-label={`Episódio ${e.episode_number}: ${e.title}${locked ? `, bloqueado, ${priceCoins} moedas` : ''}${current ? ', você parou aqui' : ''}`}
                  title={e.title}
                  className={cn('group relative flex aspect-[4/5] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border transition',
                    current ? 'border-brand bg-brand/15 shadow-[0_0_0_1px_rgba(229,46,77,0.6)]'
                      : locked ? 'border-white/[0.06] bg-white/[0.03] hover:border-coin/40'
                      : 'border-white/10 bg-ink-700 hover:border-white/30 hover:bg-ink-600')}>
                  <span className={cn('font-display text-[30px] leading-none md:text-[34px]', locked ? 'text-white/35' : 'text-white')}>{e.episode_number}</span>
                  <span className="mt-1.5 text-[10px] font-semibold">
                    {locked ? <span className="inline-flex items-center gap-0.5 text-coin"><Lock className="h-3 w-3" aria-hidden />{priceCoins}</span>
                      : e.access.accessType === 'free' ? <span className="text-emerald-300">Grátis</span>
                      : <span className="inline-flex items-center gap-0.5 text-violet-300"><Check className="h-3 w-3" aria-hidden />Seu</span>}
                  </span>
                  {current && (
                    <span className="absolute inset-x-0 bottom-0 h-1 bg-white/15"><span className="block h-full bg-brand" style={{ width: `${progress!.progressPercent}%` }} /></span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {similar.length >= 3 && (
        <Row title="Mais como esta">{similar.map(x => <SeriesCard key={x.id} series={x} />)}</Row>
      )}
    </div>
  );
}
