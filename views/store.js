/**
 * DRAMIX — Loja de Moedas e Carteira
 * - Saldo atual e presente diário
 * - Pacotes de moedas com bônus progressivo (preço e bônus editáveis no Painel Owner)
 * - Extrato completo de entradas e saídas
 * - Quando o usuário chega pelo paywall, oferece voltar ao episódio após a compra
 */

(function(root) {
  'use strict';

  const TYPE_LABEL = {
    welcome_bonus: 'Bônus de boas-vindas',
    daily_gift: 'Presente diário',
    purchase: 'Compra',
    episode_unlock: 'Episódio desbloqueado',
    series_unlock: 'Série desbloqueada'
  };

  class DramixStoreView {
    constructor(api) {
      this.api = api || root.dramixAPI;
      this.returnTo = null;
    }

    render(container, params = {}) {
      if (params.returnTo) this.returnTo = params.returnTo;
      const { esc, brl, coinIcon } = root.dramixUI;
      const user = this.api.getCurrentUser();
      const packages = this.api.getCoinPackages();
      const settings = this.api.settings();
      const basePerCoin = packages.length ? packages[0].price / packages[0].coins : 0;

      if (!user) {
        container.innerHTML = `
          <div class="max-w-md mx-auto py-20 text-center space-y-4">
            <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">${coinIcon('w-9 h-9')}</div>
            <h1 class="text-2xl font-black text-white">Sua carteira de moedas</h1>
            <p class="text-sm text-gray-400">Crie uma conta grátis e ganhe ${settings.welcome_bonus_coins} moedas de boas-vindas, mais ${settings.daily_gift_coins} moedas por dia no presente diário.</p>
            <button id="store-btn-auth" class="w-full py-3.5 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-bold text-sm">Criar conta grátis</button>
          </div>
        `;
        container.querySelector('#store-btn-auth').onclick = () =>
          window.dispatchEvent(new CustomEvent('dramix-open-auth-modal', { detail: { mode: 'register' } }));
        return;
      }

      const gift = this.api.getDailyGiftStatus(user.id);
      const tx = this.api.getCoinTransactions(user.id);
      const ret = this.returnTo ? this.api.db.table('series').findById(this.returnTo.seriesId) : null;
      const retPrice = ret ? this.api.getEpisodePrice(ret) : 0;

      container.innerHTML = `
        <div class="max-w-5xl mx-auto space-y-8 pb-24 pt-2">

          <div class="flex flex-col md:flex-row gap-4">
            <section class="flex-1 p-6 rounded-3xl bg-gradient-to-br from-[#1A150A] to-[#0E1322] border border-amber-400/25" aria-labelledby="wallet-title">
              <h1 id="wallet-title" class="text-sm font-bold text-gray-300">Seu saldo</h1>
              <div class="flex items-center gap-3 mt-2">
                ${coinIcon('w-10 h-10')}
                <span class="text-5xl font-black text-white tracking-tight" data-coin-balance>${user.coins}</span>
                <span class="text-sm text-gray-400 self-end pb-2">moedas</span>
              </div>
              <p class="text-xs text-gray-400 mt-3">1 episódio = ${settings.episode_price_coins} moedas. Desbloqueou uma vez, é seu para sempre.</p>
            </section>

            <section class="md:w-80 p-6 rounded-3xl bg-[#0E1322] border border-white/10 flex flex-col justify-between gap-4" aria-labelledby="gift-title">
              <div>
                <h2 id="gift-title" class="text-sm font-bold text-white">Presente diário</h2>
                <p class="text-xs text-gray-400 mt-1">${gift.available ? `Resgate ${gift.amount} moedas grátis hoje.` : `Você já resgatou hoje. Volte amanhã para ganhar mais ${gift.amount}.`}</p>
              </div>
              <button id="store-btn-gift" class="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${gift.available ? 'bg-amber-400 hover:bg-amber-300 text-black' : 'bg-white/5 text-white/40 cursor-not-allowed'}" ${gift.available ? '' : 'disabled'}>
                ${coinIcon('w-4 h-4')} ${gift.available ? `Resgatar ${gift.amount} moedas` : 'Resgatado hoje'}
              </button>
            </section>
          </div>

          ${ret ? `
            <div class="p-4 rounded-2xl bg-[#E52E4D]/10 border border-[#E52E4D]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p class="text-xs text-gray-200">Você estava em <b class="text-white">${esc(ret.title)}</b>, episódio ${Number(this.returnTo.episodeNumber)}. Ele custa ${retPrice} moedas.</p>
              <div class="flex items-center gap-2 flex-shrink-0">
                <button id="store-btn-dismiss-return" class="text-xs text-gray-400 hover:text-white px-3 py-2">Dispensar</button>
                <button id="store-btn-return" class="py-2 px-4 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white text-xs font-bold ${user.coins >= retPrice ? '' : 'opacity-50 cursor-not-allowed'}" ${user.coins >= retPrice ? '' : 'disabled'}>
                  ${user.coins >= retPrice ? 'Desbloquear e assistir' : `Faltam ${retPrice - user.coins} moedas`}
                </button>
              </div>
            </div>
          ` : ''}

          <section class="space-y-4" aria-labelledby="packages-title">
            <div>
              <h2 id="packages-title" class="text-lg font-bold text-white">Comprar moedas</h2>
              <p class="text-xs text-gray-400">Pacotes maiores dão mais moedas de bônus. Pagamento por PIX ou cartão.</p>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              ${packages.map(p => {
                const total = p.coins + (p.bonus_coins || 0);
                const eps = Math.floor(total / settings.episode_price_coins);
                const saving = basePerCoin ? Math.round((1 - (p.price / total) / basePerCoin) * 100) : 0;
                const highlight = !!p.badge;
                return `
                  <button class="store-pkg relative text-left p-4 rounded-2xl border flex flex-col gap-3 ${highlight ? 'bg-[#141A2E] border-amber-400/50' : 'bg-[#0E1322] border-white/10 hover:border-white/25'}" data-id="${esc(p.id)}">
                    ${p.badge ? `<span class="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black">${esc(p.badge)}</span>` : ''}
                    <span class="flex items-center gap-1.5">${coinIcon('w-5 h-5')}<span class="text-2xl font-black text-white">${total}</span></span>
                    <span class="text-[11px] ${p.bonus_coins ? 'text-emerald-400' : 'text-gray-500'}">${p.bonus_coins ? `${p.coins} + ${p.bonus_coins} de bônus` : 'Sem bônus'}</span>
                    <span class="text-[11px] text-gray-400">≈ ${eps} episódios${saving > 0 ? ` • ${saving}% mais barato` : ''}</span>
                    <span class="mt-auto w-full py-2 rounded-xl text-center text-sm font-black ${highlight ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}">${brl(p.price)}</span>
                  </button>
                `;
              }).join('')}
            </div>
            <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-gray-400">
              <span>As moedas não expiram.</span>
              <button id="store-btn-plans" class="underline hover:text-white">Prefere assistir sem limite? Veja os planos Premium</button>
              <button id="store-btn-restore" class="underline hover:text-white">Restaurar compras</button>
            </div>
          </section>

          <section class="p-6 rounded-3xl bg-[#0E1322] border border-white/10 space-y-4" aria-labelledby="history-title">
            <h2 id="history-title" class="text-sm font-bold text-white">Extrato de moedas</h2>
            ${tx.length === 0 ? `
              <p class="text-xs text-gray-400">Nenhuma movimentação ainda.</p>
            ` : `
              <ul class="divide-y divide-white/5">
                ${tx.slice(0, 50).map(t => `
                  <li class="py-3 flex items-center justify-between gap-3 text-xs">
                    <div class="min-w-0">
                      <p class="font-semibold text-white truncate">${esc(t.description || TYPE_LABEL[t.type] || 'Movimentação')}</p>
                      <span class="text-[11px] text-gray-500">${new Date(t.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                    <div class="text-right flex-shrink-0">
                      <p class="font-black ${t.amount >= 0 ? 'text-emerald-400' : 'text-white'}">${t.amount >= 0 ? '+' : ''}${t.amount}</p>
                      <span class="text-[11px] text-gray-500">saldo ${t.balance_after}</span>
                    </div>
                  </li>
                `).join('')}
              </ul>
            `}
          </section>
        </div>
      `;

      this.bindEvents(container, user);
    }

    bindEvents(container, user) {
      const giftBtn = container.querySelector('#store-btn-gift');
      if (giftBtn && !giftBtn.disabled) {
        giftBtn.onclick = () => {
          try {
            const res = this.api.claimDailyGift(user.id);
            root.dramixUI.toast(`+${res.amount} moedas. Saldo: ${res.balance}.`, 'coins');
            window.dispatchEvent(new CustomEvent('dramix-wallet-updated'));
          } catch (err) {
            root.dramixUI.toast(err.message, 'error');
          }
        };
      }

      container.querySelectorAll('.store-pkg').forEach(btn => {
        btn.onclick = () => {
          const pkg = this.api.db.table('coin_packages').findById(btn.dataset.id);
          if (pkg) window.dispatchEvent(new CustomEvent('dramix-open-coin-checkout', { detail: { pkg } }));
        };
      });

      const plansBtn = container.querySelector('#store-btn-plans');
      if (plansBtn) plansBtn.onclick = () => window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'subscription' } }));

      const restoreBtn = container.querySelector('#store-btn-restore');
      if (restoreBtn) {
        restoreBtn.onclick = () => {
          const res = this.api.restorePurchases(user.id);
          root.dramixUI.toast(res.message, res.coinsRestored ? 'coins' : 'info');
          window.dispatchEvent(new CustomEvent('dramix-wallet-updated'));
        };
      }

      const dismiss = container.querySelector('#store-btn-dismiss-return');
      if (dismiss) dismiss.onclick = () => { this.returnTo = null; this.render(container); };

      const ret = container.querySelector('#store-btn-return');
      if (ret && !ret.disabled) {
        ret.onclick = () => {
          const { seriesId, episodeNumber } = this.returnTo;
          try {
            this.api.unlockEpisodeWithCoins(user.id, seriesId, episodeNumber);
            this.returnTo = null;
            window.dispatchEvent(new CustomEvent('dramix-wallet-updated'));
            const series = this.api.db.table('series').findById(seriesId);
            window.dispatchEvent(new CustomEvent('dramix-play-episode', { detail: { series, episodeNumber, startTimestamp: 0 } }));
          } catch (err) {
            root.dramixUI.toast(err.message, 'error');
          }
        };
      }
    }
  }

  root.DramixStoreView = DramixStoreView;
})(typeof window !== 'undefined' ? window : global);
