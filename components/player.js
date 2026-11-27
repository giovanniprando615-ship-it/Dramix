/**
 * DRAMIX — Player de Minisséries Vertical (9:16)
 * Proporção vertical cinematográfica estilo VibeShort/Netflix.
 * Inclui:
 * - Autoplay com contagem regressiva visual 3, 2, 1 ao finalizar o episódio
 * - Botão "Próximo Episódio" com avanço imediato e opção de cancelamento
 * - Regra estrita: Episódio 1 livre, Episódio 2+ com cadeado "Desbloquear com Premium"
 * - Suporte a tela cheia vertical, controle de volume, scrubbing e histórico de progresso em tempo real
 */

(function(root) {
  'use strict';

  class DramixPlayer {
    constructor(api) {
      this.api = api || root.dramixAPI;
      this.currentSeries = null;
      this.currentEpisode = null;
      this.episodesList = [];
      this.videoEl = null;
      this.containerEl = null;
      this.progressInterval = null;
      this.autoplayCountdownTimer = null;
      this.autoplayNext = true;
      this.initDOM();
    }

    initDOM() {
      let modal = document.getElementById('dramix-player-view');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dramix-player-view';
        modal.className = 'fixed inset-0 z-50 bg-[#060810]/95 backdrop-blur-md hidden flex items-center justify-center p-0 md:p-6 transition-all duration-300';
        modal.innerHTML = `
          <!-- Container Central Vertical 9:16 -->
          <div class="relative w-full h-full md:max-w-[420px] md:h-[92vh] bg-black md:rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col justify-between">
            
            <!-- Barra Superior Flutuante -->
            <div class="absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between pointer-events-auto">
              <button id="player-btn-back" class="w-10 h-10 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center border border-white/15 transition-transform active:scale-95 cursor-pointer">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              </button>

              <div class="flex-1 px-3 text-center min-w-0">
                <h3 id="player-series-title" class="text-xs font-bold text-white truncate drop-shadow">Título da Minissérie</h3>
                <p id="player-episode-title" class="text-[11px] text-gray-300 truncate">Episódio 1</p>
              </div>

              <div class="flex items-center gap-2">
                <!-- Status do Episódio -->
                <span id="player-access-badge" class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white">Ep 1 Livre</span>
                
                <button id="player-btn-close" class="w-10 h-10 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center border border-white/15 transition-transform active:scale-95 cursor-pointer">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            <!-- Área de Vídeo Vertical -->
            <div class="relative flex-1 bg-black flex items-center justify-center overflow-hidden cursor-pointer" id="player-video-wrapper">
              <video id="player-html5-video" class="w-full h-full object-cover" playsinline preload="auto"></video>
              
              <!-- Loader de Buffering -->
              <div id="player-loading-spinner" class="absolute z-20 hidden">
                <div class="w-12 h-12 rounded-full border-4 border-white/20 border-t-[#E52E4D] animate-spin"></div>
              </div>

              <!-- Ícone Central de Play quando Pausado -->
              <div id="player-center-play-icon" class="absolute z-20 w-16 h-16 rounded-full bg-black/60 text-white flex items-center justify-center border border-white/20 pointer-events-none opacity-0 transition-opacity">
                <svg class="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>

              <!-- OVERLAY DE AUTOPLAY COM CONTAGEM REGRESSIVA (3, 2, 1) -->
              <div id="player-autoplay-overlay" class="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm hidden flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div class="relative w-20 h-20 rounded-full border-4 border-white/10 flex items-center justify-center">
                  <div class="absolute inset-0 rounded-full border-4 border-t-[#E52E4D] animate-spin"></div>
                  <span id="player-autoplay-counter" class="text-3xl font-black text-white">3</span>
                </div>

                <div class="space-y-1">
                  <h4 class="text-sm font-bold text-gray-300 uppercase tracking-wider">Próximo Episódio</h4>
                  <p id="player-autoplay-next-title" class="text-base font-black text-white max-w-[280px] truncate">Episódio 2</p>
                </div>

                <div class="flex items-center gap-3 pt-2">
                  <button id="player-autoplay-btn-now" class="py-2.5 px-5 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-bold text-xs shadow-lg shadow-[#E52E4D]/40 transition-all flex items-center gap-1.5 cursor-pointer">
                    <svg class="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Próximo Episódio
                  </button>
                  <button id="player-autoplay-btn-cancel" class="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-semibold border border-white/10 transition-colors cursor-pointer">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>

            <!-- Controles Inferiores Flutuantes -->
            <div class="absolute bottom-0 inset-x-0 z-30 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-2.5 pointer-events-auto">
              
              <!-- Barra de Progresso Interativa -->
              <div class="flex items-center gap-3">
                <span id="player-time-current" class="text-[11px] font-mono text-gray-300 w-10 text-right">0:00</span>
                <div id="player-progress-container" class="relative flex-1 h-2 bg-white/20 hover:h-3 rounded-full cursor-pointer transition-all overflow-hidden">
                  <div id="player-progress-buffered" class="absolute inset-y-0 left-0 bg-white/30 rounded-full w-0"></div>
                  <div id="player-progress-fill" class="absolute inset-y-0 left-0 bg-[#E52E4D] rounded-full w-0 transition-all duration-75"></div>
                </div>
                <span id="player-time-total" class="text-[11px] font-mono text-gray-300 w-10 text-left">2:00</span>
              </div>

              <!-- Linha de Botões de Controle -->
              <div class="flex items-center justify-between pt-1">
                
                <!-- Botão Episódio Anterior -->
                <button id="player-btn-prev" class="p-2 text-white/80 hover:text-white transition-colors cursor-pointer" title="Episódio Anterior">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                </button>

                <!-- Botão Central Play/Pause -->
                <button id="player-btn-play-pause" class="w-12 h-12 rounded-full bg-[#E52E4D] hover:bg-[#c92440] text-white flex items-center justify-center shadow-lg shadow-[#E52E4D]/40 transition-transform active:scale-95 cursor-pointer">
                  <svg id="icon-play" class="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  <svg id="icon-pause" class="w-6 h-6 hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>

                <!-- Botão Próximo Episódio -->
                <button id="player-btn-next" class="p-2 text-white/80 hover:text-white transition-colors cursor-pointer" title="Próximo Episódio">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                </button>

                <!-- Controle de Áudio -->
                <button id="player-btn-volume" class="p-2 text-white/80 hover:text-white transition-colors cursor-pointer" title="Áudio">
                  <svg id="icon-vol-on" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                  <svg id="icon-vol-off" class="w-5 h-5 hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                </button>

                <!-- Gaveta de Lista de Episódios -->
                <button id="player-btn-episodes-drawer" class="p-2 text-white/80 hover:text-white transition-colors cursor-pointer" title="Lista de Episódios">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>
                </button>

                <!-- Tela Cheia -->
                <button id="player-btn-fullscreen" class="p-2 text-white/80 hover:text-white transition-colors cursor-pointer" title="Tela Cheia">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
                </button>

              </div>
            </div>

            <!-- Drawer Inferior de Episódios com Selos Grátis / Premium -->
            <div id="player-episodes-drawer" class="absolute inset-x-0 bottom-0 z-40 bg-[#0A0D18]/95 border-t border-white/10 rounded-t-2xl p-4 max-h-[60%] overflow-y-auto hidden transition-all">
              <div class="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h4 class="text-xs font-bold text-white uppercase tracking-wider">Lista de Episódios</h4>
                  <p class="text-[10px] text-gray-400">Episódio 1 livre • Episódio 2 em diante com Premium</p>
                </div>
                <button id="player-drawer-close" class="text-white/60 hover:text-white text-xs">&times; Fechar</button>
              </div>
              <div id="player-drawer-episodes-list" class="space-y-1.5 pt-3">
                <!-- Injetado dinamicamente -->
              </div>
            </div>

          </div>
        `;
        document.body.appendChild(modal);
      }

      this.containerEl = document.getElementById('dramix-player-view');
      this.videoEl = document.getElementById('player-html5-video');
      this.bindEvents();
    }

    bindEvents() {
      const closeBtn = document.getElementById('player-btn-close');
      const backBtn = document.getElementById('player-btn-back');
      if (closeBtn) closeBtn.onclick = () => this.close();
      if (backBtn) backBtn.onclick = () => this.close();

      const playPauseBtn = document.getElementById('player-btn-play-pause');
      const videoWrapper = document.getElementById('player-video-wrapper');
      if (playPauseBtn) playPauseBtn.onclick = () => this.togglePlay();
      if (videoWrapper) videoWrapper.onclick = (e) => {
        if (e.target === this.videoEl || e.target === videoWrapper) this.togglePlay();
      };

      const prevBtn = document.getElementById('player-btn-prev');
      const nextBtn = document.getElementById('player-btn-next');
      if (prevBtn) prevBtn.onclick = () => this.playPreviousEpisode();
      if (nextBtn) nextBtn.onclick = () => this.playNextEpisode();

      const volBtn = document.getElementById('player-btn-volume');
      if (volBtn) volBtn.onclick = () => this.toggleMute();

      const drawerBtn = document.getElementById('player-btn-episodes-drawer');
      const drawerCloseBtn = document.getElementById('player-drawer-close');
      const drawer = document.getElementById('player-episodes-drawer');
      if (drawerBtn) drawerBtn.onclick = () => drawer.classList.toggle('hidden');
      if (drawerCloseBtn) drawerCloseBtn.onclick = () => drawer.classList.add('hidden');

      const fullBtn = document.getElementById('player-btn-fullscreen');
      if (fullBtn) fullBtn.onclick = () => this.toggleFullscreen();

      // Botões do Overlay de Autoplay
      const btnNow = document.getElementById('player-autoplay-btn-now');
      const btnCancel = document.getElementById('player-autoplay-btn-cancel');
      if (btnNow) {
        btnNow.onclick = () => {
          this.cancelAutoplayCountdown();
          this.playNextEpisode();
        };
      }
      if (btnCancel) {
        btnCancel.onclick = () => {
          this.cancelAutoplayCountdown();
          const overlay = document.getElementById('player-autoplay-overlay');
          if (overlay) overlay.classList.add('hidden');
        };
      }

      // Barra de progresso interativa
      const progressContainer = document.getElementById('player-progress-container');
      if (progressContainer) {
        progressContainer.onclick = (e) => {
          if (!this.videoEl || !this.videoEl.duration) return;
          const rect = progressContainer.getBoundingClientRect();
          const pos = (e.clientX - rect.left) / rect.width;
          this.videoEl.currentTime = pos * this.videoEl.duration;
        };
      }

      // Eventos do elemento de vídeo
      if (this.videoEl) {
        this.videoEl.ontimeupdate = () => this.onTimeUpdate();
        this.videoEl.onended = () => this.onEpisodeEnded();
        this.videoEl.onwaiting = () => {
          const spinner = document.getElementById('player-loading-spinner');
          if (spinner) spinner.classList.remove('hidden');
        };
        this.videoEl.onplaying = () => {
          const spinner = document.getElementById('player-loading-spinner');
          if (spinner) spinner.classList.add('hidden');
          this.updatePlayPauseUI(true);
        };
        this.videoEl.onpause = () => {
          this.updatePlayPauseUI(false);
        };
      }

      // Atalhos de teclado
      document.addEventListener('keydown', (e) => {
        if (!this.containerEl || this.containerEl.classList.contains('hidden')) return;
        if (e.key === 'Escape') this.close();
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          this.togglePlay();
        }
        if (e.key === 'ArrowRight') {
          if (this.videoEl) this.videoEl.currentTime += 5;
        }
        if (e.key === 'ArrowLeft') {
          if (this.videoEl) this.videoEl.currentTime -= 5;
        }
      });
    }

    /**
     * Inicia a reprodução de um episódio específico.
     * Valida no backend se é o Ep 1 (grátis) ou Ep 2+ (Premium).
     */
    open(series, episodeNumber, startTimestamp = 0) {
      this.cancelAutoplayCountdown();
      const overlay = document.getElementById('player-autoplay-overlay');
      if (overlay) overlay.classList.add('hidden');

      this.currentSeries = series;
      this.episodesList = this.api.db.table('episodes')
        .find(e => e.series_id === series.id)
        .sort((a, b) => a.episode_number - b.episode_number);

      const targetEp = this.episodesList.find(e => e.episode_number === episodeNumber) || this.episodesList[0];
      if (!targetEp) return;

      this.currentEpisode = targetEp;

      // Validação de acesso pelo Backend
      const user = this.api.getCurrentUser();
      const access = this.api.validateEpisodeAccess(user ? user.id : null, series.id, targetEp.episode_number);

      if (!access.allowed) {
        // Bloqueio Paywall: Interrompe e aciona o modal de monetização
        this.handlePaywallBlock(series, targetEp, access);
        return;
      }

      // Atualiza textos da barra
      document.getElementById('player-series-title').textContent = series.title;
      document.getElementById('player-episode-title').textContent = targetEp.title;
      
      const badge = document.getElementById('player-access-badge');
      if (badge) {
        if (targetEp.episode_number === 1) {
          badge.textContent = 'Ep 1 Livre';
          badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white';
        } else if (access.accessType === 'premium') {
          badge.textContent = 'Premium';
          badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-black';
        } else {
          badge.textContent = 'Desbloqueado';
          badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500 text-white';
        }
      }

      // Renderiza lista no drawer
      this.renderDrawerEpisodes();

      // Carrega vídeo e posiciona timestamp salvo
      this.videoEl.src = targetEp.video_url;
      this.videoEl.currentTime = startTimestamp || 0;
      
      this.containerEl.classList.remove('hidden');
      document.body.style.overflow = 'hidden';

      const playPromise = this.videoEl.play();
      if (playPromise) {
        playPromise.catch(() => {
          this.videoEl.muted = true;
          this.updateMuteUI(true);
          this.videoEl.play();
        });
      }

      // Inicia tracking periódico de progresso
      this.startProgressTracking();
    }

    close() {
      this.cancelAutoplayCountdown();
      this.stopProgressTracking();
      if (this.videoEl) {
        this.videoEl.pause();
        this.videoEl.removeAttribute('src');
        this.videoEl.load();
      }
      if (this.containerEl) {
        this.containerEl.classList.add('hidden');
      }
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('dramix-player-closed'));
    }

    togglePlay() {
      if (!this.videoEl) return;
      if (this.videoEl.paused) {
        this.videoEl.play();
      } else {
        this.videoEl.pause();
      }
    }

    updatePlayPauseUI(isPlaying) {
      const iconPlay = document.getElementById('icon-play');
      const iconPause = document.getElementById('icon-pause');
      const centerPlay = document.getElementById('player-center-play-icon');

      if (isPlaying) {
        if (iconPlay) iconPlay.classList.add('hidden');
        if (iconPause) iconPause.classList.remove('hidden');
        if (centerPlay) centerPlay.classList.add('opacity-0');
      } else {
        if (iconPlay) iconPlay.classList.remove('hidden');
        if (iconPause) iconPause.classList.add('hidden');
        if (centerPlay) centerPlay.classList.remove('opacity-0');
      }
    }

    toggleMute() {
      if (!this.videoEl) return;
      this.videoEl.muted = !this.videoEl.muted;
      this.updateMuteUI(this.videoEl.muted);
    }

    updateMuteUI(isMuted) {
      const volOn = document.getElementById('icon-vol-on');
      const volOff = document.getElementById('icon-vol-off');
      if (isMuted) {
        if (volOn) volOn.classList.add('hidden');
        if (volOff) volOff.classList.remove('hidden');
      } else {
        if (volOn) volOn.classList.remove('hidden');
        if (volOff) volOff.classList.add('hidden');
      }
    }

    toggleFullscreen() {
      if (!document.fullscreenElement) {
        if (this.containerEl.requestFullscreen) {
          this.containerEl.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }

    onTimeUpdate() {
      if (!this.videoEl || !this.videoEl.duration) return;
      const cur = this.videoEl.currentTime;
      const dur = this.videoEl.duration;

      const fill = document.getElementById('player-progress-fill');
      if (fill) fill.style.width = `${(cur / dur) * 100}%`;

      const curLabel = document.getElementById('player-time-current');
      const durLabel = document.getElementById('player-time-total');
      if (curLabel) curLabel.textContent = this.formatTime(cur);
      if (durLabel) durLabel.textContent = this.formatTime(dur);
    }

    /**
     * Ao finalizar o episódio:
     * Dispara a contagem regressiva 3, 2, 1 do Autoplay e botão Próximo Episódio.
     */
    onEpisodeEnded() {
      const user = this.api.getCurrentUser();
      if (user && this.currentSeries && this.currentEpisode) {
        this.api.saveWatchProgress(user.id, this.currentSeries.id, this.currentEpisode.id, this.videoEl.duration, this.videoEl.duration);
      }

      if (!this.currentEpisode || !this.episodesList.length) return;
      const nextNum = this.currentEpisode.episode_number + 1;
      const nextEp = this.episodesList.find(e => e.episode_number === nextNum);

      if (!nextEp) {
        alert('Você chegou ao último episódio desta minissérie!');
        return;
      }

      // Exibe overlay com contagem 3, 2, 1
      const overlay = document.getElementById('player-autoplay-overlay');
      const counterEl = document.getElementById('player-autoplay-counter');
      const titleEl = document.getElementById('player-autoplay-next-title');

      if (overlay && counterEl && titleEl) {
        titleEl.textContent = nextEp.title;
        overlay.classList.remove('hidden');

        let secondsRemaining = 3;
        counterEl.textContent = secondsRemaining;

        this.autoplayCountdownTimer = setInterval(() => {
          secondsRemaining--;
          if (secondsRemaining > 0) {
            counterEl.textContent = secondsRemaining;
          } else {
            this.cancelAutoplayCountdown();
            overlay.classList.add('hidden');
            this.playNextEpisode();
          }
        }, 1000);
      } else {
        this.playNextEpisode();
      }
    }

    cancelAutoplayCountdown() {
      if (this.autoplayCountdownTimer) {
        clearInterval(this.autoplayCountdownTimer);
        this.autoplayCountdownTimer = null;
      }
    }

    playNextEpisode() {
      this.cancelAutoplayCountdown();
      if (!this.currentEpisode || !this.episodesList.length) return;
      const nextNum = this.currentEpisode.episode_number + 1;
      const nextEp = this.episodesList.find(e => e.episode_number === nextNum);

      if (nextEp) {
        this.open(this.currentSeries, nextNum);
      }
    }

    playPreviousEpisode() {
      this.cancelAutoplayCountdown();
      if (!this.currentEpisode || !this.episodesList.length) return;
      const prevNum = this.currentEpisode.episode_number - 1;
      if (prevNum < 1) return;
      this.open(this.currentSeries, prevNum);
    }

    startProgressTracking() {
      this.stopProgressTracking();
      this.progressInterval = setInterval(() => {
        const user = this.api.getCurrentUser();
        if (user && this.currentSeries && this.currentEpisode && this.videoEl && !this.videoEl.paused) {
          this.api.saveWatchProgress(
            user.id,
            this.currentSeries.id,
            this.currentEpisode.id,
            this.videoEl.currentTime,
            this.videoEl.duration || this.currentEpisode.duration_seconds
          );
        }
      }, 4000);
    }

    stopProgressTracking() {
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
      }
    }

    renderDrawerEpisodes() {
      const listContainer = document.getElementById('player-drawer-episodes-list');
      if (!listContainer) return;

      const user = this.api.getCurrentUser();

      listContainer.innerHTML = this.episodesList.map(ep => {
        const isCurrent = this.currentEpisode && this.currentEpisode.id === ep.id;
        const access = this.api.validateEpisodeAccess(user ? user.id : null, this.currentSeries.id, ep.episode_number);
        const isFree = ep.episode_number === 1;

        return `
          <div class="p-2.5 rounded-xl border flex items-center justify-between cursor-pointer drawer-ep-item transition-all ${isCurrent ? 'bg-[#E52E4D]/20 border-[#E52E4D] text-white' : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'}" data-ep-num="${ep.episode_number}">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-6 text-center font-bold text-xs ${isCurrent ? 'text-[#E52E4D]' : 'text-gray-400'}">${ep.episode_number}</span>
              <div class="min-w-0">
                <p class="text-xs font-semibold truncate text-white">${ep.title}</p>
                <span class="text-[10px] text-gray-400">${Math.round(ep.duration_seconds / 60)} min</span>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0">
              ${isFree ? `
                <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">Livre</span>
              ` : access.allowed ? `
                <span class="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold uppercase">Liberado</span>
              ` : `
                <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                  Desbloquear com Premium
                </span>
              `}
            </div>
          </div>
        `;
      }).join('');

      listContainer.querySelectorAll('.drawer-ep-item').forEach(item => {
        item.onclick = () => {
          const num = parseInt(item.dataset.epNum, 10);
          document.getElementById('player-episodes-drawer').classList.add('hidden');
          this.open(this.currentSeries, num);
        };
      });
    }

    handlePaywallBlock(series, episode, accessInfo) {
      window.dispatchEvent(new CustomEvent('dramix-paywall-triggered', {
        detail: {
          series,
          episode,
          accessInfo
        }
      }));
    }

    formatTime(seconds) {
      if (isNaN(seconds)) return '0:00';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    }
  }

  root.DramixPlayer = DramixPlayer;
})(typeof window !== 'undefined' ? window : global);
