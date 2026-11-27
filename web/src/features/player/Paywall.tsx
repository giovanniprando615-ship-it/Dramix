import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown, Clapperboard } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { CoinAmount, CoinIcon } from '@/components/ui/CoinIcon';
import { api } from '@/lib/api';
import { useAction, useAdEligibility, useSeries, useSession, useSettings } from '@/lib/queries';
import { useUI } from '@/store/ui';
import { formatCountdown } from '@/lib/utils';
import type { EpisodeAccess, Series } from '@/domain/types';

const AD_SECONDS = 15;

/** Tela de episódio bloqueado: moedas, pacote da série, anúncio diário ou Premium. */
export function Paywall({ series, episodeNumber, access, onUnlocked }: { series: Series; episodeNumber: number; access: EpisodeAccess; onUnlocked: () => void }) {
  const { data: user } = useSession();
  const { data: settings } = useSettings();
  const { data: details } = useSeries(series.id);
  const { data: ad } = useAdEligibility();
  const { openAuth, closePlayer, setReturnTo } = useUI();
  const navigate = useNavigate();
  const [adLeft, setAdLeft] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>();

  const unlockOne = useAction(() => api.unlockEpisode(series.id, episodeNumber), { silentError: true });
  const unlockAll = useAction(() => api.unlockSeries(series.id), { silentError: true });
  const unlockAd = useAction(() => api.unlockWithAd(series.id, episodeNumber));

  useEffect(() => () => clearInterval(timer.current), []);

  const goStore = () => {
    setReturnTo({ seriesId: series.id, episode: episodeNumber });
    closePlayer();
    navigate('/store');
  };

  const spend = async (fn: () => Promise<{ balance: number }>, label: string) => {
    try {
      const r = await fn();
      toast.success(`${label} Saldo: ${r.balance} moedas.`, { icon: <CoinIcon /> });
      onUnlocked();
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'INSUFFICIENT_COINS') goStore();
      else toast.error(e.message);
    }
  };

  const startAd = () => {
    setAdLeft(AD_SECONDS);
    timer.current = setInterval(() => {
      setAdLeft(s => {
        if (s === null) return s;
        if (s <= 1) {
          clearInterval(timer.current);
          unlockAd.mutateAsync(undefined).then(() => { toast.success('Episódio desbloqueado.'); onUnlocked(); }).catch(() => setAdLeft(null));
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  if (adLeft !== null) {
    return (
      <div className="w-full max-w-sm space-y-4 text-center" role="dialog" aria-label="Anúncio">
        <div className="flex items-center justify-between text-xs text-gray-300">
          <span className="font-bold text-coin">Anúncio</span>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono font-bold text-white" aria-live="polite">{adLeft}s</span>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
          <video src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" autoPlay muted playsInline className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20"><div className="h-full bg-coin transition-all duration-1000" style={{ width: `${((AD_SECONDS - adLeft) / AD_SECONDS) * 100}%` }} /></div>
        </div>
        <p className="text-xs text-gray-300">Assista até o fim para desbloquear o episódio {episodeNumber}.</p>
        <button onClick={() => { clearInterval(timer.current); setAdLeft(null); }} className="text-xs text-red-300 hover:text-red-200">Sair sem desbloquear</button>
      </div>
    );
  }

  const header = (
    <div className="space-y-2 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-coin/15 text-coin"><Lock className="h-6 w-6" aria-hidden /></span>
      <h2 className="font-display text-[34px] leading-none text-white">Episódio {episodeNumber}</h2>
      <p className="text-xs text-gray-400">Os episódios 1 a {access.freeLimit} são grátis. Escolha como continuar a história:</p>
    </div>
  );

  if (!user) {
    return (
      <div className="w-full max-w-sm space-y-5">
        {header}
        <p className="text-center text-sm text-gray-200">Crie sua conta grátis e ganhe <b className="text-coin">{settings?.welcome_bonus_coins ?? 50} moedas</b> para desbloquear.</p>
        <Button size="lg" className="w-full" onClick={() => openAuth('register')}>Criar conta ou entrar</Button>
      </div>
    );
  }

  const price = access.priceCoins;
  const bundle = details?.bundle;
  return (
    <div className="w-full max-w-sm space-y-5" data-testid="paywall">
      {header}
      <p className="flex items-center justify-center gap-2 text-xs text-gray-300">Seu saldo: <CoinAmount value={user.coins} className="text-white" /></p>
      <div className="space-y-2.5">
        {user.coins >= price ? (
          <Button size="lg" className="w-full justify-between" loading={unlockOne.isPending} onClick={() => spend(() => unlockOne.mutateAsync(undefined), 'Episódio desbloqueado.')} data-testid="unlock-coins">
            Desbloquear este episódio <CoinAmount value={price} className="rounded-lg bg-black/25 px-2 py-1 text-xs" />
          </Button>
        ) : (
          <Button size="lg" className="w-full justify-between" onClick={goStore} data-testid="buy-coins">
            Comprar moedas <span className="rounded-lg bg-black/25 px-2 py-1 text-xs">faltam {price - user.coins}</span>
          </Button>
        )}
        {bundle && (
          <Button variant="secondary" className="w-full justify-between text-xs" loading={unlockAll.isPending}
            onClick={() => spend(() => unlockAll.mutateAsync(undefined), `${bundle.lockedCount} episódios desbloqueados.`)}>
            <span>Os {bundle.lockedCount} restantes <span className="text-emerald-400">-{bundle.discount}%</span></span>
            <CoinAmount value={bundle.price} />
          </Button>
        )}
        <Button variant="secondary" className="w-full justify-between text-xs" disabled={!ad?.eligible} onClick={startAd}>
          <span className="flex items-center gap-2"><Clapperboard className="h-4 w-4" aria-hidden />Assistir anúncio de 15s</span>
          <span className="font-semibold text-gray-300">{ad?.eligible ? '1 grátis hoje' : `em ${formatCountdown(ad?.remainingSeconds ?? 0)}`}</span>
        </Button>
        <Button variant="coin" className="w-full justify-between text-xs" onClick={() => { closePlayer(); navigate('/plans'); }}>
          <span className="flex items-center gap-2"><Crown className="h-4 w-4" aria-hidden />Premium: tudo liberado</span>
          <span>desde R$ 7,90</span>
        </Button>
      </div>
    </div>
  );
}
