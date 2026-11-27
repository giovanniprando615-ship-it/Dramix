import { Link } from 'react-router-dom';
import { Gift, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { useAction, usePackages, useSession, useSettings, useWallet, queryClient } from '@/lib/queries';
import { useUI } from '@/store/ui';
import { brl, cn, formatDate } from '@/lib/utils';

export default function Store() {
  const { data: user, isLoading } = useSession();
  const { data: settings } = useSettings();
  const { data: packages } = usePackages();
  const { data: wallet } = useWallet(!!user);
  const { openAuth, openCheckout, returnTo, setReturnTo, play } = useUI();
  const claim = useAction(() => api.claimDailyGift(), { success: r => `+${r.amount} moedas. Saldo: ${r.balance}.` });
  const restore = useAction(() => api.restorePurchases(), {
    success: r => r.coinsRestored || r.subscriptionRestored ? `Compras restauradas${r.coinsRestored ? `: ${r.coinsRestored} moedas devolvidas` : ''}.` : r.checked ? 'Tudo certo: suas compras já estavam ativas.' : 'Nenhuma compra encontrada nesta conta.'
  });

  if (isLoading || !settings) return <Skeleton className="h-96 rounded-3xl" />;

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <CoinIcon className="mx-auto h-14 w-14" />
        <h1 className="text-2xl font-black text-white">Sua carteira de moedas</h1>
        <p className="text-sm text-gray-400">Crie uma conta grátis e ganhe {settings.welcome_bonus_coins} moedas de boas-vindas, mais {settings.daily_gift_coins} por dia no presente diário.</p>
        <Button size="lg" className="w-full" onClick={() => openAuth('register')}>Criar conta grátis</Button>
      </div>
    );
  }

  const base = packages?.[0] ? packages[0].price / packages[0].coins : 0;
  const unlockReturn = async () => {
    if (!returnTo) return;
    try {
      await api.unlockEpisode(returnTo.seriesId, returnTo.episode);
      await queryClient.invalidateQueries();
      play(returnTo.seriesId, returnTo.episode);
      setReturnTo(null);
    } catch (err) { toast.error((err as Error).message); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row">
        <section className="flex-1 rounded-3xl border border-coin/25 bg-gradient-to-br from-coin-bg to-ink-700 p-6" aria-labelledby="wallet-title">
          <h1 id="wallet-title" className="text-sm font-bold text-gray-300">Seu saldo</h1>
          <p className="mt-2 flex items-center gap-3"><CoinIcon className="h-10 w-10" /><span className="text-5xl font-black tabular-nums text-white" data-testid="store-balance">{user.coins}</span><span className="self-end pb-2 text-sm text-gray-400">moedas</span></p>
          <p className="mt-3 text-xs text-gray-400">1 episódio = {settings.episode_price_coins} moedas. Desbloqueou uma vez, é seu para sempre.</p>
        </section>
        <section className="flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-ink-700 p-6 md:w-80" aria-labelledby="gift-title">
          <div>
            <h2 id="gift-title" className="flex items-center gap-2 text-sm font-bold text-white"><Gift className="h-4 w-4 text-coin" aria-hidden />Presente diário</h2>
            <p className="mt-1 text-xs text-gray-400">{wallet?.gift.available ? `Resgate ${wallet.gift.amount} moedas grátis hoje.` : `Você já resgatou hoje. Volte amanhã para ganhar mais ${settings.daily_gift_coins}.`}</p>
          </div>
          <Button variant="coin" disabled={!wallet?.gift.available} loading={claim.isPending} onClick={() => claim.mutate(undefined)}>
            <CoinIcon />{wallet?.gift.available ? `Resgatar ${wallet.gift.amount} moedas` : 'Resgatado hoje'}
          </Button>
        </section>
      </div>

      {returnTo && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-brand/30 bg-brand/10 p-4 sm:flex-row sm:items-center">
          <p className="text-xs text-gray-200">Você estava no episódio {returnTo.episode}. Ele custa {settings.episode_price_coins} moedas.</p>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" size="sm" onClick={() => setReturnTo(null)}>Dispensar</Button>
            <Button size="sm" disabled={user.coins < settings.episode_price_coins} onClick={unlockReturn}>
              {user.coins >= settings.episode_price_coins ? 'Desbloquear e assistir' : `Faltam ${settings.episode_price_coins - user.coins} moedas`}
            </Button>
          </div>
        </div>
      )}

      <section className="space-y-4" aria-labelledby="pkgs">
        <div>
          <h2 id="pkgs" className="text-lg font-bold text-white">Comprar moedas</h2>
          <p className="text-xs text-gray-400">Pacotes maiores dão mais moedas de bônus. PIX ou cartão.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {packages?.map(p => {
            const total = p.coins + p.bonus_coins;
            const saving = base ? Math.round((1 - p.price / total / base) * 100) : 0;
            return (
              <button key={p.id} onClick={() => openCheckout('coins', p.id)} data-testid={`pkg-${p.id}`}
                className={cn('relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5', p.badge ? 'border-coin/50 bg-ink-600' : 'border-white/10 bg-ink-700 hover:border-white/25')}>
                {p.badge && <span className="absolute -top-2.5 left-3 rounded-full bg-coin px-2 py-0.5 text-[10px] font-black text-black">{p.badge}</span>}
                <span className="flex items-center gap-1.5"><CoinIcon className="h-5 w-5" /><span className="text-2xl font-black text-white">{total}</span></span>
                <span className={cn('text-[11px]', p.bonus_coins ? 'text-emerald-400' : 'text-gray-500')}>{p.bonus_coins ? `${p.coins} + ${p.bonus_coins} de bônus` : 'Sem bônus'}</span>
                <span className="text-[11px] text-gray-400">≈ {Math.floor(total / settings.episode_price_coins)} episódios{saving > 0 ? ` • ${saving}% mais barato` : ''}</span>
                <span className={cn('mt-auto rounded-xl py-2 text-center text-sm font-black', p.badge ? 'bg-coin text-black' : 'bg-white/10 text-white')}>{brl(p.price)}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-gray-400">
          <span>As moedas não expiram.</span>
          <Link to="/plans" className="underline hover:text-white">Prefere assistir sem limite? Veja o Premium</Link>
          <button onClick={() => restore.mutate(undefined)} className="inline-flex items-center gap-1 underline hover:text-white"><RotateCcw className="h-3 w-3" aria-hidden />Restaurar compras</button>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-ink-700 p-6" aria-labelledby="history">
        <h2 id="history" className="mb-3 text-sm font-bold text-white">Extrato de moedas</h2>
        {!wallet?.transactions.length ? <p className="text-xs text-gray-400">Nenhuma movimentação ainda.</p> : (
          <ul className="divide-y divide-white/5">
            {wallet.transactions.slice(0, 50).map(t => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{t.description}</p>
                  <p className="text-[11px] text-gray-500">{formatDate(t.created_at, true)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn('font-black tabular-nums', t.amount > 0 ? 'text-emerald-400' : 'text-white')}>{t.amount > 0 ? '+' : ''}{t.amount}</p>
                  <p className="text-[11px] text-gray-500">saldo {t.balance_after}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
