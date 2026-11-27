/**
 * DRAMIX — Paywall de Episódio e Anúncio Recompensado
 * Abre quando o episódio está além do limite gratuito da série. Opções:
 * 1. Desbloquear o episódio com moedas (ou comprar moedas se faltar saldo).
 * 2. Desbloquear todos os episódios restantes da série com desconto.
 * 3. Assistir a um anúncio de 15s não pulável (1 desbloqueio a cada 24h).
 * 4. Assinar o DRAMIX Premium.
 * Visitantes são convidados a criar conta (e ganham o bônus de boas-vindas).
 */

(function(root) {
  'use strict';

  const LOCK_ICON = '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>';

  class DramixRewardedAdModal {
    constructor(api) {
      this.api = api || root.dramixAPI;
      this.currentSeries = null;
      this.currentEpisode = null;
      this.timerInterval = null;
      this.timeLeft = 15;
      this.initDOM();
    }

    initDOM() {
      let modal = document.getElementById('dramix-rewarded-ad-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dramix-rewarded-ad-modal';
        modal.className = 'fixed inset-0 z-[60] bg-black/90 backdrop-blur-md hidden flex items-end sm:items-center justify-center p-0 sm:p-4';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
          <div id="rewarded-ad-card" class="relative w-full sm:max-w-md bg-[#0E1322] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 md:p-7 shadow-2xl text-center max-h-[92vh] overflow-y-auto"></div>
        `;
        modal.addEventListener('click', (e) => { if (e.target === modal && !this.timerInterval) this.close(); });
        document.body.appendChild(modal);
      }
    }

    showPaywall(series, episode, onUnlockSuccess) {
      this.currentSeries = series;
      this.currentEpisode = episode;
      this.onUnlockSuccess = onUnlockSuccess;

      const { esc, coinIcon } = root.dramixUI;
      const user = this.api.getCurrentUser();
      const modal = document.getElementById('dramix-rewarded-ad-modal');
      const card = document.getElementById('rewarded-ad-card');
      if (!modal || !card) return;

      const freeLimit = this.api.getFreeEpisodesCount(series);
      const price = this.api.getEpisodePrice(series);
      const welcome = this.api.settings().welcome_bonus_coins;

      const header = `
        <div class="space-y-2">
          <div class="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-300 mx-auto flex items-center justify-center">${LOCK_ICON}</div>
          <h3 class="text-lg font-black text-white leading-snug">${esc(series.title)}</h3>
          <p class="text-xs text-gray-400">Episódio ${episode.episode_number} • os episódios 1 a ${freeLimit} são grátis</p>
        </div>
      `;

      if (!user) {
        card.innerHTML = `
          <div class="space-y-5">
            ${header}
            <p class="text-sm text-gray-300 leading-relaxed">
              Crie sua conta grátis e ganhe <b class="text-amber-300">${welcome} moedas</b> para continuar esta história.
            </p>
            <div class="flex flex-col gap-2">
              <button id="paywall-btn-login" class="w-full py-3.5 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-bold text-sm">Criar conta ou entrar</button>
              <button id="paywall-btn-close-auth" class="w-full py-2.5 rounded-xl text-gray-400 hover:text-white text-xs font-semibold">Agora não</button>
            </div>
          </div>
        `;
        document.getElementById('paywall-btn-login').onclick = () => {
          this.close();
          window.dispatchEvent(new CustomEvent('dramix-open-auth-modal', { detail: { mode: 'register' } }));
        };
        document.getElementById('paywall-btn-close-auth').onclick = () => this.close();
        this.open();
        return;
      }

      const balance = user.coins;
      const canAfford = balance >= price;
      const bundle = this.api.getSeriesBundleQuote(user.id, series.id);
      const showBundle = bundle && bundle.lockedCount > 1;
      const eligibility = this.api.checkRewardedAdEligibility(user.id);

      card.innerHTML = `
        <div class="space-y-5">
          ${header}

          <div class="flex items-center justify-center gap-2 text-xs text-gray-300">
            <span>Seu saldo:</span>
            <span class="inline-flex items-center gap-1 font-black text-white">${coinIcon('w-4 h-4')} ${balance}</span>
          </div>

          <div class="flex flex-col gap-2.5 text-left">
            ${canAfford ? `
              <button id="paywall-btn-coins" class="w-full py-3.5 px-4 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-bold text-sm flex items-center justify-between">
                <span>Desbloquear este episódio</span>
                <span class="inline-flex items-center gap-1 text-xs bg-black/25 px-2 py-1 rounded-lg">${coinIcon('w-3.5 h-3.5')} ${price}</span>
              </button>
            ` : `
              <button id="paywall-btn-buy" class="w-full py-3.5 px-4 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-bold text-sm flex items-center justify-between">
                <span>Comprar moedas</span>
                <span class="text-xs bg-black/25 px-2 py-1 rounded-lg">faltam ${price - balance}</span>
              </button>
            `}

            ${showBundle ? `
              <button id="paywall-btn-bundle" class="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center justify-between">
                <span>Desbloquear os ${bundle.lockedCount} episódios restantes <span class="text-emerald-400">(-${bundle.discount}%)</span></span>
                <span class="inline-flex items-center gap-1 font-bold">${coinIcon('w-3.5 h-3.5')} ${bundle.price}</span>
              </button>
            ` : ''}

            <button id="paywall-btn-watch-ad" class="w-full py-3 px-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${eligibility.eligible ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' : 'bg-transparent border-white/5 text-white/40 cursor-not-allowed'}" ${eligibility.eligible ? '' : 'disabled'}>
              <span>Assistir anúncio de 15s</span>
              <span class="text-[11px]">${eligibility.eligible ? '1 grátis hoje' : `disponível em ${esc(eligibility.formattedRemaining)}`}</span>
            </button>

            <button id="paywall-btn-subscribe" class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black text-xs font-black flex items-center justify-between">
              <span>Assinar Premium e liberar tudo</span>
              <span class="text-[11px]">a partir de R$ 7,90</span>
            </button>
          </div>

          <button id="paywall-btn-cancel" class="text-xs text-gray-400 hover:text-white">Agora não</button>
        </div>
      `;

      const coinsBtn = document.getElementById('paywall-btn-coins');
      if (coinsBtn) coinsBtn.onclick = () => this.unlockWithCoins();

      const buyBtn = document.getElementById('paywall-btn-buy');
      if (buyBtn) buyBtn.onclick = () => this.goToStore();

      const bundleBtn = document.getElementById('paywall-btn-bundle');
      if (bundleBtn) bundleBtn.onclick = () => this.unlockBundle(bundle);

      const adBtn = document.getElementById('paywall-btn-watch-ad');
      if (adBtn && eligibility.eligible) adBtn.onclick = () => this.startRewardedAdFlow();

      document.getElementById('paywall-btn-subscribe').onclick = () => {
        this.close();
        window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'subscription' } }));
      };
      document.getElementById('paywall-btn-cancel').onclick = () => this.close();

      this.open();
    }

    open() {
      document.getElementById('dramix-rewarded-ad-modal').classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      const first = document.querySelector('#rewarded-ad-card button:not([disabled])');
      if (first) first.focus();
    }

    goToStore() {
      this.close();
      window.dispatchEvent(new CustomEvent('dramix-navigate-view', {
        detail: { view: 'store', returnTo: { seriesId: this.currentSeries.id, episodeNumber: this.currentEpisode.episode_number } }
      }));
    }

    finishUnlock(message) {
      window.dispatchEvent(new CustomEvent('dramix-wallet-updated'));
      root.dramixUI.toast(message, 'coins');
      this.close();
      if (this.onUnlockSuccess) this.onUnlockSuccess(this.currentSeries, this.currentEpisode.episode_number);
    }

    unlockWithCoins() {
      const user = this.api.getCurrentUser();
      try {
        const res = this.api.unlockEpisodeWithCoins(user.id, this.currentSeries.id, this.currentEpisode.episode_number);
        this.finishUnlock(res.alreadyUnlocked ? 'Episódio já estava desbloqueado.' : `Episódio desbloqueado. Saldo: ${res.balance} moedas.`);
      } catch (err) {
        if (err.code === 'INSUFFICIENT_COINS') return this.goToStore();
        root.dramixUI.toast(err.message, 'error');
      }
    }

    unlockBundle(bundle) {
      const user = this.api.getCurrentUser();
      if (!confirm(`Desbloquear ${bundle.lockedCount} episódios por ${bundle.price} moedas?`)) return;
      try {
        const res = this.api.unlockSeriesWithCoins(user.id, this.currentSeries.id);
        this.finishUnlock(`${res.unlockedCount || 0} episódios desbloqueados. Saldo: ${res.balance} moedas.`);
      } catch (err) {
        if (err.code === 'INSUFFICIENT_COINS') return this.goToStore();
        root.dramixUI.toast(err.message, 'error');
      }
    }

    startRewardedAdFlow() {
      const { esc } = root.dramixUI;
      const card = document.getElementById('rewarded-ad-card');
      this.timeLeft = 15;

      card.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between text-xs text-gray-400 border-b border-white/10 pb-3">
            <span class="font-bold text-amber-300">Anúncio</span>
            <span id="ad-countdown" class="font-mono text-white bg-white/10 px-2.5 py-0.5 rounded-full font-bold" aria-live="polite">15s</span>
          </div>

          <div class="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
            <video id="rewarded-ad-video" class="w-full h-full object-cover" autoplay playsinline>
              <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
            </video>
            <div class="absolute inset-x-0 bottom-0 h-1.5 bg-white/20">
              <div id="ad-progress-bar" class="h-full bg-amber-400 w-0 transition-all duration-1000"></div>
            </div>
          </div>

          <p class="text-xs text-gray-300">Assista até o fim para desbloquear <b class="text-white">${esc(this.currentEpisode.title)}</b>.</p>

          <button id="ad-btn-skip-warning" class="text-xs text-red-400/80 hover:text-red-400">Sair do anúncio sem desbloquear</button>
        </div>
      `;

      const video = document.getElementById('rewarded-ad-video');
      if (video) video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });

      document.getElementById('ad-btn-skip-warning').onclick = () => {
        if (confirm('Se você sair agora, o episódio não será desbloqueado. Sair mesmo assim?')) this.cancelAd();
      };

      this.timerInterval = setInterval(() => {
        this.timeLeft--;
        const countdownEl = document.getElementById('ad-countdown');
        const progressEl = document.getElementById('ad-progress-bar');
        if (countdownEl) countdownEl.textContent = `${this.timeLeft}s`;
        if (progressEl) progressEl.style.width = `${((15 - this.timeLeft) / 15) * 100}%`;
        if (this.timeLeft <= 0) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
          this.completeAdSuccess();
        }
      }, 1000);
    }

    cancelAd() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = null;
      const video = document.getElementById('rewarded-ad-video');
      if (video) video.pause();
      this.close();
    }

    completeAdSuccess() {
      const { esc } = root.dramixUI;
      const user = this.api.getCurrentUser();
      const token = `ad_token_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      try {
        this.api.completeRewardedAdUnlock(user.id, this.currentSeries.id, this.currentEpisode.id, {
          token, verifiedCompletion: true, durationWatched: 15
        });

        const card = document.getElementById('rewarded-ad-card');
        card.innerHTML = `
          <div class="space-y-4 py-4">
            <div class="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>
            <h3 class="text-xl font-black text-white">Episódio desbloqueado</h3>
            <p class="text-sm text-gray-300"><b class="text-white">${esc(this.currentEpisode.title)}</b> fica liberado na sua conta para sempre.</p>
            <p class="text-xs text-amber-300">O próximo desbloqueio com anúncio fica disponível em 24 horas.</p>
            <button id="ad-btn-play-now" class="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm">Assistir agora</button>
          </div>
        `;
        document.getElementById('ad-btn-play-now').onclick = () => {
          this.close();
          if (this.onUnlockSuccess) this.onUnlockSuccess(this.currentSeries, this.currentEpisode.episode_number);
        };
      } catch (err) {
        root.dramixUI.toast(err.message || 'Não foi possível registrar o desbloqueio.', 'error');
        this.close();
      }
    }

    close() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = null;
      const video = document.getElementById('rewarded-ad-video');
      if (video) video.pause();
      const modal = document.getElementById('dramix-rewarded-ad-modal');
      if (modal) modal.classList.add('hidden');
      const playerOpen = !document.getElementById('dramix-player-view')?.classList.contains('hidden');
      if (!playerOpen) document.body.style.overflow = '';
    }
  }

  root.DramixRewardedAdModal = DramixRewardedAdModal;
})(typeof window !== 'undefined' ? window : global);
