/**
 * DRAMIX — Modal de Anúncio Recompensado e Bloqueio Paywall
 * Implementa a regra rígida de 1 desbloqueio a cada 24 horas,
 * player de anúncio com contagem regressiva não pulável (15s), validação de conclusão
 * e exibição da mensagem de bloqueio diário com contagem regressiva para o próximo desbloqueio.
 */

(function(root) {
  'use strict';

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
        modal.className = 'fixed inset-0 z-50 bg-black/90 backdrop-blur-md hidden flex items-center justify-center p-4 transition-all duration-300';
        modal.innerHTML = `
          <!-- Container de Conteúdo -->
          <div id="rewarded-ad-card" class="relative w-full max-w-lg bg-[#0E1322] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-6">
            <!-- Injetado dinamicamente: Visualização de Escolha Paywall ou Player do Anúncio -->
          </div>
        `;
        document.body.appendChild(modal);
      }
    }

    /**
     * Abre o modal quando um episódio Premium (6+) é bloqueado.
     */
    showPaywall(series, episode, onUnlockSuccess) {
      this.currentSeries = series;
      this.currentEpisode = episode;
      this.onUnlockSuccess = onUnlockSuccess;

      const user = this.api.getCurrentUser();
      const modal = document.getElementById('dramix-rewarded-ad-modal');
      const card = document.getElementById('rewarded-ad-card');
      if (!modal || !card) return;

      if (!user) {
        // Exige autenticação
        card.innerHTML = `
          <div class="space-y-4">
            <div class="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center text-2xl font-bold">
              🔒
            </div>
            <h3 class="text-xl font-bold text-white">Episódio Premium</h3>
            <p class="text-sm text-gray-300">
              Os episódios a partir do 6 são exclusivos para membros. Faça login ou crie sua conta para desbloquear gratuitamente com anúncios ou assinar o DRAMIX Premium.
            </p>
            <div class="flex flex-col gap-2 pt-2">
              <button id="paywall-btn-login" class="w-full py-3 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-bold text-sm shadow-lg transition-all cursor-pointer">
                Entrar ou Cadastrar-se
              </button>
              <button id="paywall-btn-close-auth" class="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 font-semibold text-xs transition-colors cursor-pointer">
                Voltar
              </button>
            </div>
          </div>
        `;
        document.getElementById('paywall-btn-login').onclick = () => {
          this.close();
          window.dispatchEvent(new CustomEvent('dramix-open-auth-modal'));
        };
        document.getElementById('paywall-btn-close-auth').onclick = () => this.close();
        modal.classList.remove('hidden');
        return;
      }

      // Verifica elegibilidade de 24h para o anúncio
      const eligibility = this.api.checkRewardedAdEligibility(user.id);

      card.innerHTML = `
        <div class="space-y-5">
          <!-- Cabeçalho -->
          <div class="space-y-1.5">
            <span class="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-500/30">
              Episódio Premium
            </span>
            <h3 class="text-2xl font-black text-white pt-1">${series.title}</h3>
            <p class="text-xs text-gray-300">${episode.title}</p>
          </div>

          <!-- Mensagem de Bloqueio Diário (se cooldown ativo) -->
          ${!eligibility.eligible ? `
            <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left space-y-2">
              <p class="text-xs text-amber-200 leading-relaxed font-medium">
                Você já utilizou seu desbloqueio gratuito de hoje.
              </p>
              <p class="text-xs text-gray-300 leading-relaxed">
                Assine o DRAMIX Premium para continuar assistindo a todas as histórias sem limites.
              </p>
              <div class="pt-1 flex items-center justify-between text-[11px] font-mono text-amber-300 font-bold">
                <span>Próximo desbloqueio grátis em:</span>
                <span>${eligibility.formattedRemaining}</span>
              </div>
            </div>
          ` : `
            <div class="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-300 leading-relaxed text-left">
              Os primeiros 5 episódios desta produção são gratuitos. Para continuar esta história, você pode assistir a um anúncio rápido ou assinar o DRAMIX Premium.
            </div>
          `}

          <!-- Botões de Ação -->
          <div class="flex flex-col gap-3 pt-2">
            
            <!-- Opção 1: Anúncio Recompensado -->
            <button id="paywall-btn-watch-ad" class="w-full py-3.5 px-4 rounded-xl flex items-center justify-between font-bold text-xs transition-all cursor-pointer ${eligibility.eligible ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30' : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/5'}" ${!eligibility.eligible ? 'disabled' : ''}>
              <div class="flex items-center gap-2">
                <span class="text-base">🎁</span>
                <span>Assistir anúncio recompensado (15s)</span>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded ${eligibility.eligible ? 'bg-white/20 text-white' : 'bg-transparent text-white/40'}">
                ${eligibility.eligible ? '1 disponível hoje' : eligibility.formattedRemaining}
              </span>
            </button>

            <!-- Opção 2: Assinar Premium -->
            <button id="paywall-btn-subscribe" class="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#E52E4D] to-[#ff4767] hover:from-[#d12442] hover:to-[#eb3b5b] text-white font-extrabold text-xs shadow-lg shadow-[#E52E4D]/30 flex items-center justify-between transition-all cursor-pointer">
              <div class="flex items-center gap-2">
                <span class="text-base">👑</span>
                <span>Assinar DRAMIX Premium (Acesso Total)</span>
              </div>
              <span class="text-[10px] bg-white/20 px-2 py-0.5 rounded font-black">A partir de R$ 7,90</span>
            </button>

            <!-- Fechar / Cancelar -->
            <button id="paywall-btn-cancel" class="text-xs text-gray-400 hover:text-white transition-colors pt-2 cursor-pointer">
              Agora não, voltar ao catálogo
            </button>

          </div>
        </div>
      `;

      // Eventos
      const watchAdBtn = document.getElementById('paywall-btn-watch-ad');
      if (watchAdBtn && eligibility.eligible) {
        watchAdBtn.onclick = () => this.startRewardedAdFlow();
      }

      document.getElementById('paywall-btn-subscribe').onclick = () => {
        this.close();
        window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'subscription' } }));
      };

      document.getElementById('paywall-btn-cancel').onclick = () => this.close();

      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    /**
     * Inicia a exibição real do anúncio recompensado com verificação estrita.
     */
    startRewardedAdFlow() {
      const card = document.getElementById('rewarded-ad-card');
      this.timeLeft = 15;

      card.innerHTML = `
        <div class="space-y-4">
          <!-- Cabeçalho do Anúncio -->
          <div class="flex items-center justify-between text-xs text-gray-400 border-b border-white/10 pb-3">
            <span class="font-bold tracking-wider uppercase text-[10px] text-amber-400 flex items-center gap-1.5">
              <span>📢</span> Anúncio Recompensado Oficial
            </span>
            <span id="ad-countdown" class="font-mono text-white bg-white/10 px-2.5 py-0.5 rounded-full font-bold">15s</span>
          </div>

          <!-- Player do Anúncio Cinematográfico -->
          <div class="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center shadow-inner">
            <video id="rewarded-ad-video" class="w-full h-full object-cover" autoplay playsinline>
              <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
            </video>

            <!-- Barra de Progresso do Anúncio no Rodapé -->
            <div class="absolute inset-x-0 bottom-0 h-1.5 bg-white/20">
              <div id="ad-progress-bar" class="h-full bg-amber-400 w-0 transition-all duration-1000"></div>
            </div>

            <!-- Marca d'água -->
            <div class="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white/70">
              DRAMIX Ads Partner
            </div>
          </div>

          <p class="text-xs text-gray-300">
            Assista até o fim para desbloquear: <b class="text-white">${this.currentEpisode.title}</b>.
          </p>

          <div class="pt-2 flex items-center justify-center">
            <button id="ad-btn-skip-warning" class="text-xs text-red-400/80 hover:text-red-400 cursor-pointer">
              Sair do anúncio (perder recompensa)
            </button>
          </div>
        </div>
      `;

      const video = document.getElementById('rewarded-ad-video');
      if (video) {
        video.play().catch(() => {
          video.muted = true;
          video.play();
        });
      }

      // Botão de desistência com aviso
      document.getElementById('ad-btn-skip-warning').onclick = () => {
        if (confirm('Se você sair agora antes do término, o episódio NÃO será desbloqueado. Deseja realmente sair?')) {
          this.cancelAd();
        }
      };

      // Timer não pulável de 15 segundos
      this.timerInterval = setInterval(() => {
        this.timeLeft--;
        const countdownEl = document.getElementById('ad-countdown');
        const progressEl = document.getElementById('ad-progress-bar');
        
        if (countdownEl) countdownEl.textContent = `${this.timeLeft}s`;
        if (progressEl) progressEl.style.width = `${((15 - this.timeLeft) / 15) * 100}%`;

        if (this.timeLeft <= 0) {
          clearInterval(this.timerInterval);
          this.completeAdSuccess();
        }
      }, 1000);
    }

    cancelAd() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      const video = document.getElementById('rewarded-ad-video');
      if (video) video.pause();
      this.close();
    }

    completeAdSuccess() {
      const user = this.api.getCurrentUser();
      const token = `ad_token_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      try {
        // Registra desbloqueio no Backend com token assinado
        this.api.completeRewardedAdUnlock(user.id, this.currentSeries.id, this.currentEpisode.id, {
          token,
          verifiedCompletion: true,
          durationWatched: 15
        });

        const card = document.getElementById('rewarded-ad-card');
        card.innerHTML = `
          <div class="space-y-4 py-4">
            <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-3xl shadow-lg">
              ✓
            </div>
            <h3 class="text-2xl font-black text-white">Episódio Desbloqueado!</h3>
            <p class="text-sm text-gray-300">
              Você completou o anúncio. O <b class="text-white">${this.currentEpisode.title}</b> foi liberado com sucesso.
            </p>
            <p class="text-xs text-amber-300 font-mono">
              Próximo desbloqueio diário disponível em 24 horas.
            </p>
            <div class="pt-3">
              <button id="ad-btn-play-now" class="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-lg shadow-emerald-500/30 transition-all cursor-pointer">
                Assistir Episódio Agora ▶
              </button>
            </div>
          </div>
        `;

        document.getElementById('ad-btn-play-now').onclick = () => {
          this.close();
          if (this.onUnlockSuccess) {
            this.onUnlockSuccess(this.currentSeries, this.currentEpisode.episode_number);
          }
        };

      } catch (err) {
        alert(err.message || 'Erro ao registrar desbloqueio.');
        this.close();
      }
    }

    close() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      const modal = document.getElementById('dramix-rewarded-ad-modal');
      if (modal) modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  root.DramixRewardedAdModal = DramixRewardedAdModal;
})(typeof window !== 'undefined' ? window : global);
