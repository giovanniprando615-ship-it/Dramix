import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Copy, CreditCard, QrCode } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { api } from '@/lib/api';
import { useUI } from '@/store/ui';
import { brl, cn } from '@/lib/utils';
import type { CheckoutOrder, PaymentMethod } from '@/domain/types';

/** Luhn: confere se o número do cartão é plausível antes de enviar ao gateway. */
export function luhnValid(digits: string) {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

function cardProblem(number: string, expiry: string, cvv: string): string | null {
  if (!luhnValid(number.replace(/\D/g, ''))) return 'Confira o número do cartão.';
  const m = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!m || +m[1] < 1 || +m[1] > 12) return 'Use a validade no formato MM/AA.';
  if (new Date(2000 + +m[2], +m[1], 1) <= new Date()) return 'Este cartão está vencido.';
  if (!/^\d{3,4}$/.test(cvv)) return 'O CVV tem 3 ou 4 dígitos.';
  return null;
}

const input = 'h-11 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 text-sm text-white outline-none focus:border-brand';

export function CheckoutDialog() {
  const checkout = useUI(s => s.checkout);
  const close = useUI(s => s.closeCheckout);
  const returnTo = useUI(s => s.returnTo);
  const { play, setReturnTo } = useUI();
  const qc = useQueryClient();
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!checkout) return;
    setOrder(null); setError(null); setCard({ number: '', expiry: '', cvv: '' }); setMethod('pix');
    api.createOrder(checkout.kind, checkout.itemId, 'pix').then(setOrder).catch(err => { toast.error(err.message); close(); });
  }, [checkout, close]);

  const changeMethod = (m: PaymentMethod) => {
    setMethod(m);
    if (order) void api.setOrderMethod(order.transactionId, m);
  };

  const copyPix = async () => {
    if (!order) return;
    await navigator.clipboard?.writeText(order.pixCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirm = async () => {
    if (!order || busy) return;
    if (method === 'credit_card') {
      const problem = cardProblem(card.number, card.expiry, card.cvv);
      if (problem) return setError(problem);
    }
    setError(null);
    setBusy(true);
    try {
      await new Promise(r => setTimeout(r, 700)); // simula a resposta do gateway
      const res = await api.confirmPayment(order.transactionId);
      await qc.invalidateQueries();
      close();
      if (res.kind === 'coins' && returnTo) {
        toast.success(res.message, {
          icon: <CoinIcon />,
          action: { label: 'Voltar ao episódio', onClick: () => { play(returnTo.seriesId, returnTo.episode); setReturnTo(null); } }
        });
      } else toast.success(res.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!checkout} onOpenChange={o => !o && !busy && close()} title={order?.title ?? 'Preparando pagamento'} description={order?.description}>
      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
          <div>
            <span className="block text-xs text-gray-400">Total</span>
            <span className="text-2xl font-black text-white">{order ? brl(order.amount) : '—'}</span>
          </div>
          <span className="rounded-full bg-coin/15 px-3 py-1 text-xs font-bold text-coin">{checkout?.kind === 'coins' ? 'Pagamento único' : 'Renovação automática'}</span>
        </div>

        <p className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-3 text-[11px] leading-relaxed text-sky-200">
          Modo de teste: nenhum valor é cobrado. Confirmar simula a aprovação do pagamento.
        </p>

        <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Forma de pagamento">
          {([['pix', 'PIX', QrCode], ['credit_card', 'Cartão de crédito', CreditCard]] as const).map(([m, label, Icon]) => (
            <button key={m} role="tab" aria-selected={method === m} onClick={() => changeMethod(m)} className={cn('flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-bold', method === m ? 'border-brand bg-brand/15 text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10')}>
              <Icon className="h-4 w-4" aria-hidden />{label}
            </button>
          ))}
        </div>

        {method === 'pix' ? (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-center">
            <div className="mx-auto grid h-36 w-36 place-items-center rounded-xl bg-white p-2" aria-label="QR Code PIX ilustrativo">
              <QrCode className="h-full w-full text-black" strokeWidth={1.2} aria-hidden />
            </div>
            <label htmlFor="pix-code" className="block text-xs font-semibold text-gray-300">Escaneie o QR Code ou copie o código PIX</label>
            <div className="flex gap-2">
              <input id="pix-code" readOnly value={order?.pixCode ?? ''} className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/60 px-3 font-mono text-[11px] text-gray-300" />
              <Button variant="secondary" size="sm" onClick={copyPix} aria-live="polite">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copiado' : 'Copiar'}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor="cc-number" className="mb-1 block text-[11px] text-gray-400">Número do cartão</label>
              <input id="cc-number" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" className={input} value={card.number}
                onChange={e => setCard(c => ({ ...c, number: e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ') }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cc-exp" className="mb-1 block text-[11px] text-gray-400">Validade (MM/AA)</label>
                <input id="cc-exp" inputMode="numeric" autoComplete="cc-exp" placeholder="12/28" className={input} value={card.expiry}
                  onChange={e => { const d = e.target.value.replace(/\D/g, '').slice(0, 4); setCard(c => ({ ...c, expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d })); }} />
              </div>
              <div>
                <label htmlFor="cc-cvv" className="mb-1 block text-[11px] text-gray-400">CVV</label>
                <input id="cc-cvv" inputMode="numeric" autoComplete="cc-csc" placeholder="123" className={input} value={card.cvv}
                  onChange={e => setCard(c => ({ ...c, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))} />
              </div>
            </div>
          </div>
        )}

        {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

        <Button size="lg" className="w-full" onClick={confirm} loading={busy} disabled={!order} data-testid="checkout-confirm">
          {busy ? 'Confirmando pagamento' : checkout?.kind === 'coins' ? 'Confirmar compra' : 'Confirmar e ativar Premium'}
        </Button>
        <p className="text-center text-[11px] text-gray-500">
          {checkout?.kind === 'coins' ? 'As moedas entram na carteira assim que o pagamento é aprovado.' : 'Cancele quando quiser em Perfil > Assinatura, sem multa.'}
        </p>
      </div>
    </Dialog>
  );
}
