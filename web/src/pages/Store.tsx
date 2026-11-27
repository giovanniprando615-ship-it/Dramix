import { Link } from 'react-router-dom';
import { Gift, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { useAction, usePackages, useSession, useSettings, useWallet, queryClient } from '@/lib/queries';
import { useUI } from '@/store/ui';
import { brl, cn, formatDate } from '@/lib/utils';

/** Pilha de moedas em leque: cresce com o tamanho do pacote. */
function CoinStack({ level }: { level: number }) {
  const mid = (level - 1) / 2;
  return (
    <div className="relative h-14 w-24" aria-hidden>
      {Array.from({ length: level }, (_, i) => (
        <span key={i} className="absolute" style={{ left: `${30 + (i - mid) * 13}px`, top: `${10 - (mid - Math.abs(i - mid)) * 4}px`, transform: `rotate(${(i - mid) * 10}deg)`, zIndex: 10 - Math.abs(i - mid) }}>
          <CoinIcon className="h-10 w-10 drop-shadow-[0_6px_12px_rgba(0,0,0,0.55)]" />
        </span>
      ))}
    </div>
  );
}

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

  const base = packages?.[0] ? packages[0].price / packages[0].coins : 0;
  const price = settings.episode_price_coins;
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
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-[44px] leading-none text-white md:text-[56px]">Loja de moedas</h1>
          <p className="mt-2 text-sm text-gray-400">1 episódio = {price} moedas. Desbloqueou uma vez, é seu para sempre.</p>
        </div>
        {user && (
          <div className="flex items-center gap-4 rounded-3xl border border-coin/25 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(245,184,61,0.25),transparent_60%),#0E1322] px-6 py-4">
            <CoinIcon className="h-12 w-12 drop-shadow-[0_8px_20px_rgba(245,184,61,0.45)]" />
            <div>
              <p className="text-[11px] font-semibold text-gray-400">Seu saldo</p>
              <p className="font-display text-[44px] leading-none text-white" data-testid="store-balance">{user.coins}</p>
            </div>
          </div>
        )}
      </header>

      {returnTo && user && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-brand/30 bg-brand/10 p-4 sm:flex-row sm:items-center">
          <p className="text-sm text-gray-100">Você estava no episódio {returnTo.episode}. Ele custa {price} moedas.</p>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" size="sm" onClick={() => setReturnTo(null)}>Dispensar</Button>
            <Button size="sm" disabled={user.coins < price} onClick={unlockReturn}>
              {user.coins >= price ? 'Desbloquear e assistir' : `Faltam ${price - user.coins} moedas`}
            </Button>
          </div>
        </div>
      )}

      {!user && (
        <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-coin/25 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(245,184,61,0.22),transparent_55%),#0E1322] p-6 sm:flex-row sm:items-center">
          <p className="text-sm text-gray-200"><span className="font-display block text-[28px] leading-none text-white">Comece com {settings.welcome_bonus_coins} moedas grátis</span>
            <span className="mt-1.5 block text-gray-400">Crie sua conta e ganhe mais {settings.daily_gift_coins} por dia no presente diário.</span></p>
          <Button variant="coin" onClick={() => openAuth('register')} className="rounded-full">Criar conta grátis</Button>
        </div>
      )}

      <section aria-labelledby="pkgs">
        <h2 id="pkgs" className="sr-only">Pacotes de moedas</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 lg:gap-4">
          {packages?.map((p, i) => {
            const total = p.coins + p.bonus_coins;
            const saving = base ? Math.round((1 - p.price / total / base) * 100) : 0;
            const bonusPct = p.bonus_coins ? Math.round((p.bonus_coins / p.coins) * 100) : 0;
            const best = p.badge === 'Melhor valor';
            const popular = p.badge === 'Mais escolhido';
            return (
              <button key={p.id} onClick={() => (user ? openCheckout('coins', p.id) : openAuth('register'))} data-testid={`pkg-${p.id}`}
                className={cn('group relative flex flex-col items-start overflow-hidden rounded-3xl border p-4 pt-5 text-left transition duration-300 hover:-translate-y-1',
                  best ? 'border-coin/60 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(245,184,61,0.28),transparent_60%),#141A2E] shadow-[0_20px_50px_-20px_rgba(245,184,61,0.55)]'
                    : popular ? 'border-brand/50 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(229,46,77,0.22),transparent_60%),#121729]'
                    : 'border-white/10 bg-ink-700 hover:border-white/25',
                  i === 4 && 'col-span-2 md:col-span-1')}>
                {p.badge && (
                  <span className={cn('absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold', best ? 'bg-coin text-black' : 'bg-brand text-white')}>{p.badge}</span>
                )}
                <CoinStack level={Math.min(i + 1, 5)} />
                <p className="font-display mt-3 text-[40px] leading-none text-white">{total.toLocaleString('pt-BR')}</p>
                <p className="text-[11px] text-gray-400">moedas</p>
                <div className="mt-2 min-h-[34px] space-y-0.5 text-[11px]">
                  {bonusPct > 0 ? <p className="inline-flex items-center gap-1 font-semibold text-emerald-300"><Sparkles className="h-3 w-3" aria-hidden />+{bonusPct}% de bônus</p> : <p className="text-gray-500">Sem bônus</p>}
                  <p className="text-gray-400">≈ {Math.floor(total / price)} episódios{saving > 0 ? ` · ${saving}% mais barato` : ''}</p>
                </div>
                <span className={cn('mt-4 w-full rounded-full py-2.5 text-center text-sm font-black transition',
                  best ? 'bg-coin text-black group-hover:bg-amber-300' : popular ? 'bg-brand text-white group-hover:bg-brand-hover' : 'bg-white/10 text-white group-hover:bg-white/20')}>
                  {brl(p.price)}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-400">
          <span>As moedas não expiram. PIX ou cartão.</span>
          <Link to="/plans" className="underline-offset-4 hover:text-white hover:underline">Prefere assistir sem limite? Conheça o Premium</Link>
          {user && <button onClick={() => restore.mutate(undefined)} className="inline-flex items-center gap-1 underline-offset-4 hover:text-white hover:underline"><RotateCcw className="h-3 w-3" aria-hidden />Restaurar compras</button>}
        </div>
      </section>

      {user && (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <section className="flex flex-col justify-between gap-5 rounded-3xl border border-white/10 bg-ink-700 p-6" aria-labelledby="gift-title">
            <div>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-coin/15 text-coin"><Gift className="h-5 w-5" aria-hidden /></span>
              <h2 id="gift-title" className="font-display mt-4 text-[28px] leading-none text-white">Presente diário</h2>
              <p className="mt-2 text-xs text-gray-400">{wallet?.gift.available ? `${wallet.gift.amount} moedas grátis esperando por você.` : `Você já resgatou hoje. Volte amanhã para mais ${settings.daily_gift_coins}.`}</p>
            </div>
            <Button variant={wallet?.gift.available ? 'coin' : 'secondary'} className="rounded-full" disabled={!wallet?.gift.available} loading={claim.isPending} onClick={() => claim.mutate(undefined)}>
              <CoinIcon />{wallet?.gift.available ? `Resgatar ${wallet.gift.amount} moedas` : 'Resgatado hoje'}
            </Button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-ink-700 p-6" aria-labelledby="history">
            <h2 id="history" className="font-display mb-3 text-[28px] leading-none text-white">Extrato</h2>
            {!wallet?.transactions.length ? <p className="text-xs text-gray-400">Nenhuma movimentação ainda.</p> : (
              <ul className="max-h-[360px] divide-y divide-white/5 overflow-y-auto pr-1">
                {wallet.transactions.slice(0, 50).map(t => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-xs">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', t.amount > 0 ? 'bg-emerald-500/15' : 'bg-white/5')}><CoinIcon className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{t.description}</p>
                        <p className="text-[11px] text-gray-500">{formatDate(t.created_at, true)}</p>
                      </div>
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
      )}
    </div>
  );
}
