import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Hero } from '@/components/catalog/Hero';
import { Row } from '@/components/catalog/Row';
import { SeriesCard } from '@/components/catalog/SeriesCard';
import { Top10Card } from '@/components/catalog/Top10Card';
import { PageLoader } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { api } from '@/lib/api';
import { useAction, useGift, useHome, useSession, useSettings } from '@/lib/queries';
import { useUI } from '@/store/ui';
import { safeImg } from '@/lib/utils';

const THEMES = ['CEO', 'Vingança', 'Bilionário', 'Casamento por contrato', 'Amor proibido', 'Reencarnação', 'Segunda chance', 'Máfia'];

function CoinBanner() {
  const { data: user } = useSession();
  const { data: gift } = useGift();
  const { data: settings } = useSettings();
  const openAuth = useUI(s => s.openAuth);
  const claim = useAction(() => api.claimDailyGift(), { success: r => `+${r.amount} moedas. Saldo: ${r.balance}.` });

  if (!settings) return null;
  if (user && !gift?.available) return null;
  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-coin/25 bg-gradient-to-r from-coin-bg to-ink-700 p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <CoinIcon className="h-9 w-9" />
        <p className="text-xs text-gray-300">
          <b className="block text-sm text-white">{user ? 'Seu presente diário está pronto' : `Ganhe ${settings.welcome_bonus_coins} moedas ao criar sua conta`}</b>
          {user ? `Resgate ${gift!.amount} moedas grátis. Amanhã tem mais.` : `Use para continuar as histórias depois dos ${settings.default_free_episodes} episódios grátis.`}
        </p>
      </div>
      {user ? (
        <Button variant="coin" size="sm" onClick={() => claim.mutate(undefined)} loading={claim.isPending} data-testid="claim-gift">Resgatar {gift!.amount} moedas</Button>
      ) : (
        <Button variant="coin" size="sm" onClick={() => openAuth('register')} data-testid="home-register">Criar conta grátis</Button>
      )}
    </div>
  );
}

export default function Home() {
  const { data, isLoading } = useHome();
  const play = useUI(s => s.play);
  if (isLoading || !data) return <PageLoader />;

  return (
    <div className="space-y-10">
      <Hero items={data.featured} />
      <CoinBanner />

      {data.continueWatching.length > 0 && (
        <Row title="Continue assistindo">
          {data.continueWatching.map(c => (
            <button key={c.series.id} onClick={() => play(c.series.id, c.episode.episode_number, c.progressPercent >= 90 ? 0 : c.progressSeconds)}
              className="group flex w-72 shrink-0 snap-start items-center gap-3 rounded-2xl border border-white/10 bg-ink-700 p-3 text-left hover:border-brand/50"
              aria-label={`Continuar ${c.series.title}, episódio ${c.episode.episode_number}`}>
              <img src={safeImg(c.series.poster_url)} alt="" className="h-24 w-16 rounded-xl object-cover" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="truncate text-xs font-bold text-white group-hover:text-brand">{c.series.title}</p>
                <p className="text-[11px] text-gray-400">Episódio {c.episode.episode_number} • {c.progressPercent}%</p>
                <div className="h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-brand" style={{ width: `${c.progressPercent}%` }} /></div>
                <span className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-[10px] font-black text-white"><Play className="h-3 w-3 fill-current" aria-hidden />Continuar</span>
              </div>
            </button>
          ))}
        </Row>
      )}

      <section aria-label="Temas populares" className="rounded-2xl border border-white/10 bg-ink-700 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-300">Temas populares</h2>
          <Link to="/discover" className="text-[11px] font-bold text-brand hover:underline">Ver catálogo completo</Link>
        </div>
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          {THEMES.map(t => (
            <Link key={t} to={`/discover?q=${encodeURIComponent(t)}`} className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-gray-300 hover:border-brand/40 hover:bg-brand/15 hover:text-white">{t}</Link>
          ))}
        </div>
      </section>

      {data.rows.map(row => (
        <Row key={row.id} title={row.title}>
          {row.kind === 'top10'
            ? row.items.map((s, i) => <Top10Card key={s.id} series={s} rank={i + 1} />)
            : row.items.map(s => <SeriesCard key={s.id} series={s} />)}
        </Row>
      ))}
    </div>
  );
}
