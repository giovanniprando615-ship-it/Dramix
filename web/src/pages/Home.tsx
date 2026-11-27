import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Hero } from '@/components/catalog/Hero';
import { Row } from '@/components/catalog/Row';
import { SeriesCard } from '@/components/catalog/SeriesCard';
import { Top10Card } from '@/components/catalog/Top10Card';
import { SectionTitle } from '@/components/catalog/SectionTitle';
import { Skeleton } from '@/components/ui/Skeleton';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { api } from '@/lib/api';
import { useAction, useCatalog, useGift, useHome, useSession, useSettings } from '@/lib/queries';
import { useUI } from '@/store/ui';
import { safeImg } from '@/lib/utils';
import type { ContinueItem, Series } from '@/domain/types';

// Temas com a cor de cada clima de história
const THEMES: { label: string; q: string; tone: string }[] = [
  { label: 'CEO e bilionários', q: 'Bilionário', tone: 'from-[#C9952B]/80' },
  { label: 'Vingança', q: 'Vingança', tone: 'from-[#E52E4D]/85' },
  { label: 'Casamento por contrato', q: 'Casamento por contrato', tone: 'from-[#B0306A]/85' },
  { label: 'Amor proibido', q: 'Amor proibido', tone: 'from-[#7A1E3A]/90' },
  { label: 'Reencarnação', q: 'Reencarnação', tone: 'from-[#5B3FB5]/85' },
  { label: 'Segunda chance', q: 'Segunda chance', tone: 'from-[#2C7A8C]/85' },
  { label: 'Máfia e perigo', q: 'Máfia', tone: 'from-[#1E2A44]/95' },
  { label: 'Identidade secreta', q: 'Identidade secreta', tone: 'from-[#4A5568]/90' }
];

function CoinStrip() {
  const { data: user } = useSession();
  const { data: gift } = useGift();
  const { data: settings } = useSettings();
  const openAuth = useUI(s => s.openAuth);
  const claim = useAction(() => api.claimDailyGift(), { success: r => `+${r.amount} moedas. Saldo: ${r.balance}.` });
  if (!settings || (user && !gift?.available)) return null;

  const amount = user ? gift!.amount : settings.welcome_bonus_coins;
  return (
    <div className="relative overflow-hidden rounded-3xl border border-coin/25 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(245,184,61,0.22),transparent_55%),linear-gradient(90deg,#16120A,#0E1322)] p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 shrink-0" aria-hidden>
            <CoinIcon className="absolute left-0 top-2 h-10 w-10 -rotate-12 opacity-70" />
            <CoinIcon className="absolute right-0 top-0 h-11 w-11 rotate-6 drop-shadow-[0_6px_18px_rgba(245,184,61,0.45)]" />
          </div>
          <div>
            <p className="font-display text-[26px] leading-none text-white sm:text-[30px]">
              {user ? 'Seu presente de hoje chegou' : `${amount} moedas grátis para começar`}
            </p>
            <p className="mt-1.5 text-xs text-gray-300">
              {user ? `Resgate ${amount} moedas e continue suas histórias. Amanhã tem mais.` : `Crie sua conta e desbloqueie episódios depois dos ${settings.default_free_episodes} grátis.`}
            </p>
          </div>
        </div>
        <button
          onClick={() => (user ? claim.mutate(undefined) : openAuth('register'))}
          disabled={claim.isPending}
          data-testid={user ? 'claim-gift' : 'home-register'}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-coin px-6 text-sm font-bold text-black transition hover:bg-amber-300 active:scale-[0.98] disabled:opacity-60"
        >
          <CoinIcon />{user ? `Resgatar ${amount} moedas` : 'Criar conta grátis'}
        </button>
      </div>
    </div>
  );
}

function ContinueCard({ c }: { c: ContinueItem }) {
  const play = useUI(s => s.play);
  return (
    <button
      onClick={() => play(c.series.id, c.episode.episode_number, c.progressPercent >= 90 ? 0 : c.progressSeconds)}
      className="group w-[280px] shrink-0 snap-start text-left sm:w-[320px]"
      aria-label={`Continuar ${c.series.title}, episódio ${c.episode.episode_number}`}
    >
      <div className="relative aspect-video overflow-hidden rounded-2xl ring-1 ring-white/10 transition group-hover:ring-brand/60">
        <img src={safeImg(c.series.backdrop_url || c.series.poster_url)} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-90 shadow-xl transition group-hover:scale-110" aria-hidden>
          <Play className="ml-0.5 h-5 w-5 fill-current" />
        </span>
        <div className="absolute inset-x-3 bottom-3">
          <p className="truncate text-sm font-bold text-white">{c.series.title}</p>
          <p className="text-[11px] text-gray-300">Episódio {c.episode.episode_number} de {c.series.episodes_count}</p>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15"><div className="h-full bg-brand" style={{ width: `${c.progressPercent}%` }} /></div>
      </div>
    </button>
  );
}

function ThemeTiles({ series }: { series: Series[] }) {
  return (
    <section aria-labelledby="themes">
      <SectionTitle title="Escolha o seu drama" to="/discover" sub="Os temas mais assistidos do momento" />
      <h2 id="themes" className="sr-only">Temas</h2>
      <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {THEMES.map((t, i) => {
          const cover = series.find(s => [...s.tropes, ...s.genres].some(x => x.toLowerCase().includes(t.q.toLowerCase()))) ?? series[i % series.length];
          return (
            <Link key={t.label} to={`/discover?q=${encodeURIComponent(t.q)}`} className="group relative h-[124px] w-[200px] shrink-0 snap-start overflow-hidden rounded-2xl ring-1 ring-white/10 sm:w-[230px]">
              {cover && <img src={safeImg(cover.backdrop_url || cover.poster_url)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover grayscale transition duration-700 group-hover:scale-110 group-hover:grayscale-0" />}
              <div className={`absolute inset-0 bg-gradient-to-tr ${t.tone} to-transparent mix-blend-hard-light`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <span className="font-display absolute bottom-3 left-3 right-3 text-[24px] leading-[0.9] text-white">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function Home() {
  const { data, isLoading } = useHome();
  const { data: catalog } = useCatalog();

  if (isLoading || !data) {
    return (
      <div className="space-y-10" role="status" aria-label="Carregando">
        <Skeleton className="full-bleed -mt-[5.5rem] h-[86svh] max-h-[860px] rounded-none" />
        <div className="flex gap-3 overflow-hidden">{Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="aspect-[9/16] w-[150px] shrink-0 rounded-2xl" />)}</div>
      </div>
    );
  }

  // Fileira com menos de 4 séries parece vazia na vitrine; elas continuam acessíveis em Descobrir
  const rows = data.rows.filter(r => r.items.length >= 4);
  const [top, ...rest] = rows;
  const topIsTen = top?.kind === 'top10';
  const rowLink = (id: string) => ({ 'sec-romance': '/discover?genre=Romance', 'sec-revenge': '/discover?genre=Vingança', 'sec-action': '/discover?genre=Ação', 'sec-fantasy': '/discover?genre=Fantasia', 'sec-new': '/discover?sort=new' } as Record<string, string>)[id];

  return (
    <div className="space-y-12 md:space-y-16">
      <Hero items={data.featured} />
      <CoinStrip />

      {data.continueWatching.length > 0 && (
        <Row title="Continue assistindo" to="/library">
          {data.continueWatching.map(c => <ContinueCard key={c.series.id} c={c} />)}
        </Row>
      )}

      {topIsTen && (
        <Row title={top.title} sub="As séries mais vistas nos últimos 7 dias">
          {top.items.map((s, i) => <Top10Card key={s.id} series={s} rank={i + 1} />)}
        </Row>
      )}

      {(topIsTen ? rest : rows).slice(0, 1).map(row => (
        <Row key={row.id} title={row.title} to={rowLink(row.id)}>{row.items.map(s => <SeriesCard key={s.id} series={s} />)}</Row>
      ))}

      {catalog && <ThemeTiles series={catalog.series} />}

      {(topIsTen ? rest : rows).slice(1).map(row => (
        <Row key={row.id} title={row.title} to={rowLink(row.id)}>
          {row.kind === 'top10' ? row.items.map((s, i) => <Top10Card key={s.id} series={s} rank={i + 1} />) : row.items.map(s => <SeriesCard key={s.id} series={s} />)}
        </Row>
      ))}
    </div>
  );
}
