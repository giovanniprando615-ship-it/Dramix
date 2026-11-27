import { Link } from 'react-router-dom';
import { Check, Crown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { useAction, usePlans, useSession, useTrialUsed } from '@/lib/queries';
import { useUI } from '@/store/ui';
import { brl, cn, formatDate } from '@/lib/utils';

const BENEFITS = ['Todos os episódios de todas as séries', 'Sem gastar moedas', 'Sem anúncios para desbloquear', 'Cancele quando quiser'];

export default function Plans() {
  const { data: plans, isLoading } = usePlans();
  const { data: user } = useSession();
  const { data: trialUsed } = useTrialUsed();
  const { openAuth, openCheckout } = useUI();
  const trial = useAction(() => api.startTrial(), { success: 'Teste de 3 dias ativado. Todos os episódios estão liberados.' });
  const monthly = plans?.find(p => p.id === 'plan-monthly');
  const sub = user?.subscription;

  const choose = (planId: string) => (user ? openCheckout('subscription', planId) : openAuth('register'));

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="mx-auto max-w-2xl space-y-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-coin/30 bg-coin/10 px-3 py-1 text-xs font-bold text-coin"><Crown className="h-3.5 w-3.5" aria-hidden />DRAMIX Premium</span>
        <h1 className="text-balance text-3xl font-black text-white md:text-5xl">Todas as histórias, sem travas</h1>
        <p className="text-sm text-gray-300">Assista a todos os episódios de todas as minisséries sem gastar moedas.</p>
      </header>

      {sub && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-3xl border border-coin/30 bg-gradient-to-r from-coin/15 to-transparent p-6 md:flex-row">
          <div className="text-center md:text-left">
            <p className="text-xs font-bold text-coin">Assinatura ativa</p>
            <p className="text-lg font-bold text-white">{sub.is_trial ? 'Teste grátis' : `Premium ${sub.plan_name}`}</p>
            <p className="text-xs text-gray-300">Acesso liberado até {formatDate(sub.end_date)}.</p>
          </div>
          <Link to="/profile" className="rounded-xl bg-white/10 px-5 py-2.5 text-xs font-bold text-white hover:bg-white/20">Gerenciar assinatura</Link>
        </div>
      )}

      {!sub && !trialUsed && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center">
          <p className="text-xs text-gray-300"><b className="block text-sm text-white">Experimente 3 dias grátis</b>Todos os episódios liberados. Sem cobrança automática no fim do teste.</p>
          <Button variant="coin" loading={trial.isPending} onClick={() => (user ? trial.mutate(undefined) : openAuth('register'))}>Começar teste grátis</Button>
        </div>
      )}

      <div className="grid items-stretch gap-6 md:grid-cols-3">
        {isLoading ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-96 rounded-3xl" />) : plans?.map(p => {
          const annual = p.id === 'plan-annual';
          const saving = annual && monthly ? Math.round((1 - p.price / (monthly.price * 12)) * 100) : 0;
          const current = sub?.plan_id === p.id;
          return (
            <article key={p.id} className={cn('relative flex flex-col rounded-3xl border p-6 md:p-8', annual ? 'border-coin/50 bg-ink-600 shadow-2xl shadow-coin/10 md:-translate-y-2' : 'border-white/10 bg-ink-700')}>
              {p.badge && <span className={cn('absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-black', annual ? 'bg-coin text-black' : 'bg-brand text-white')}>{p.badge}</span>}
              <h2 className="text-lg font-black text-white">{p.name}</h2>
              <p className="mt-1 min-h-[32px] text-xs text-gray-400">{p.description}</p>
              <div className="my-5 border-y border-white/10 py-4">
                <p className="flex items-baseline gap-1"><span className="text-4xl font-black text-white">{brl(p.price)}</span><span className="text-xs text-gray-400">/ {p.duration_days} dias</span></p>
                <p className="mt-1.5 text-[11px] text-gray-400">
                  {annual && saving > 0 ? <span className="font-semibold text-coin">{brl(p.price / 12)} por mês. Economia de {saving}% sobre o mensal.</span> : `Cerca de ${brl(p.price / p.duration_days)} por dia.`}
                </p>
              </div>
              <ul className="mb-6 space-y-2.5 text-xs text-gray-300">
                {BENEFITS.map(b => <li key={b} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />{b}</li>)}
              </ul>
              <Button variant={annual ? 'coin' : 'primary'} size="lg" className="mt-auto w-full" disabled={current} onClick={() => choose(p.id)} data-testid={`plan-${p.id}`}>
                {current ? 'Seu plano atual' : `Assinar ${p.name.toLowerCase()}`}
              </Button>
            </article>
          );
        })}
      </div>

      <section className="grid gap-4 rounded-3xl border border-white/10 bg-ink-700 p-6 text-xs text-gray-400 md:grid-cols-3">
        <div><p className="mb-1 font-bold text-gray-200">Renovação automática</p><p>Renova ao fim de cada período pelo mesmo valor. Avisamos antes de qualquer mudança de preço.</p></div>
        <div><p className="mb-1 font-bold text-gray-200">Cancelamento</p><p>Em Perfil, a qualquer momento e sem multa. O acesso continua até o fim do período pago.</p></div>
        <div><p className="mb-1 font-bold text-gray-200">Arrependimento em 7 dias</p><p>Reembolso integral em até 7 dias da primeira contratação. <Link to="/settings/subscription-policy" className="underline hover:text-white">Política completa</Link></p></div>
      </section>
    </div>
  );
}
