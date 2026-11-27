/**
 * DRAMIX - Player Modal de Prévias e Trailers Cinematográficos
 * Reprodução vertical 9:16 estilo ReelShort/DramaBox com áudio, controles e informações completas.
 */

class DramixPlayerModal {
  constructor() {
    this.modalEl = null;
    this.videoEl = null;
    this.currentSeries = null;
    this.initDOM();
  }

  initDOM() {
    // Cria o elemento modal no body se não existir
    let container = document.getElementById('dramix-preview-modal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'dramix-preview-modal';
      container.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md hidden transition-all duration-300';
      container.innerHTML = `
        <div class="relative w-full max-w-4xl max-h-[90vh] bg-[#121520] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
          
          <!-- Botão Fechar -->
          <button id="modal-close-btn" class="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-transform active:scale-95 cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>

          <!-- Coluna Esquerda: Player de Vídeo Vertical (9:16) -->
          <div class="relative w-full md:w-[380px] bg-black flex-shrink-0 flex items-center justify-center overflow-hidden aspect-[9/16] md:aspect-auto">
            
            <video id="preview-video-element" class="w-full h-full object-cover" playsinline loop></video>

            <!-- Overlay de Gradiente -->
            <div class="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/90 via-transparent to-black/40"></div>

            <!-- Controles Sobrepostos no Vídeo -->
            <div class="absolute inset-x-0 bottom-0 p-4 z-20 flex flex-col gap-2">
              <div class="flex items-center justify-between text-xs text-white/80 font-medium">
                <span id="video-time-readout">0:00 / 0:45</span>
                <span class="px-2 py-0.5 rounded bg-[#ff2e5b] text-white font-bold tracking-wider text-[10px] uppercase">Prévia Oficial</span>
              </div>
              <div class="w-full bg-white/20 h-1.5 rounded-full overflow-hidden cursor-pointer" id="video-progress-bar">
                <div id="video-progress-fill" class="bg-[#ff2e5b] h-full w-0 transition-all duration-100"></div>
              </div>
              <div class="flex items-center justify-between pt-1">
                <button id="video-play-btn" class="text-white hover:text-[#ff2e5b] flex items-center gap-1.5 text-xs font-semibold">
                  <svg id="play-icon" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  <span id="play-label">Pausar</span>
                </button>
                <button id="video-mute-btn" class="text-white/80 hover:text-white text-xs flex items-center gap-1">
                  <svg id="volume-icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                  <span id="mute-label">Som</span>
                </button>
              </div>
            </div>

            <!-- Botão Play Central quando pausado -->
            <button id="center-play-trigger" class="absolute z-20 w-16 h-16 rounded-full bg-[#ff2e5b]/90 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 hidden">
              <svg class="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>

          <!-- Coluna Direita: Informações, Ficha Técnica e Ações -->
          <div class="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto max-h-[50vh] md:max-h-none">
            
            <div class="space-y-4">
              <!-- Badges de Topo -->
              <div class="flex flex-wrap items-center gap-2">
                <span id="modal-match-badge" class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">98% Relevância</span>
                <span id="modal-episodes-badge" class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/80">78 Episódios</span>
                <span id="modal-status-badge" class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e5a93c]/20 text-[#e5a93c] border border-[#e5a93c]/30">Completa</span>
              </div>

              <!-- Título & Tagline -->
              <div>
                <h2 id="modal-title" class="text-2xl md:text-3xl font-extrabold text-white leading-tight">Título da Minissérie</h2>
                <p id="modal-tagline" class="text-xs md:text-sm text-[#ff2e5b] font-medium mt-1">Ele perdeu seu nome, mas não sua coroa.</p>
              </div>

              <!-- Sinopse -->
              <p id="modal-synopsis" class="text-sm text-gray-300 leading-relaxed">
                Sinopse detalhada da minissérie dramática com todos os pontos de conflito e tensão romântica.
              </p>

              <!-- Elenco & Personagens Principais -->
              <div class="pt-2 border-t border-white/10">
                <h4 class="text-xs font-bold uppercase text-white/50 tracking-wider mb-2">Personagens Principais</h4>
                <div id="modal-characters-list" class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <!-- Injetado dinamicamente -->
                </div>
              </div>

              <!-- Tags e Temas -->
              <div class="pt-2">
                <h4 class="text-xs font-bold uppercase text-white/50 tracking-wider mb-1.5">Gêneros & Tags</h4>
                <div id="modal-tags-list" class="flex flex-wrap gap-1.5">
                  <!-- Injetado dinamicamente -->
                </div>
              </div>
            </div>

            <!-- Botões de Ação na Base -->
            <div class="pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3">
              <button id="modal-start-watching-btn" class="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-[#ff2e5b] to-[#ff5b79] hover:from-[#e0264f] hover:to-[#ff4567] text-white font-bold text-sm shadow-lg shadow-[#ff2e5b]/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Iniciar História (Ep. 1 Grátis)
              </button>

              <button id="modal-toggle-fav-btn" class="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm flex items-center justify-center gap-2 border border-white/15 transition-all active:scale-95 cursor-pointer">
                <svg id="fav-icon-modal" class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                <span id="fav-label-modal">Minha Lista</span>
              </button>
            </div>

          </div>

        </div>
      `;
      document.body.appendChild(container);
    }

    this.modalEl = document.getElementById('dramix-preview-modal');
    this.videoEl = document.getElementById('preview-video-element');
    this.bindEvents();
  }

  bindEvents() {
    // Botão Fechar
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.onclick = () => this.close();

    // Fechar ao clicar fora
    this.modalEl.onclick = (e) => {
      if (e.target === this.modalEl) this.close();
    };

    // Fechar com tecla ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modalEl.classList.contains('hidden')) {
        this.close();
      }
    });

    // Controles do Vídeo
    const playBtn = document.getElementById('video-play-btn');
    const centerPlayBtn = document.getElementById('center-play-trigger');
    const muteBtn = document.getElementById('video-mute-btn');
    const progressBar = document.getElementById('video-progress-bar');

    const togglePlay = () => {
      if (!this.videoEl) return;
      if (this.videoEl.paused) {
        this.videoEl.play();
        document.getElementById('play-label').textContent = 'Pausar';
        centerPlayBtn.classList.add('hidden');
      } else {
        this.videoEl.pause();
        document.getElementById('play-label').textContent = 'Reproduzir';
        centerPlayBtn.classList.remove('hidden');
      }
    };

    if (playBtn) playBtn.onclick = togglePlay;
    if (centerPlayBtn) centerPlayBtn.onclick = togglePlay;

    if (muteBtn) {
      muteBtn.onclick = () => {
        if (!this.videoEl) return;
        this.videoEl.muted = !this.videoEl.muted;
        document.getElementById('mute-label').textContent = this.videoEl.muted ? 'Mudo' : 'Som';
      };
    }

    if (this.videoEl) {
      this.videoEl.addEventListener('timeupdate', () => {
        if (!this.videoEl.duration) return;
        const progress = (this.videoEl.currentTime / this.videoEl.duration) * 100;
        const fill = document.getElementById('video-progress-fill');
        if (fill) fill.style.width = `${progress}%`;

        const curMin = Math.floor(this.videoEl.currentTime / 60);
        const curSec = Math.floor(this.videoEl.currentTime % 60).toString().padStart(2, '0');
        const durMin = Math.floor(this.videoEl.duration / 60);
        const durSec = Math.floor(this.videoEl.duration % 60).toString().padStart(2, '0');
        const readout = document.getElementById('video-time-readout');
        if (readout) readout.textContent = `${curMin}:${curSec} / ${durMin}:${durSec}`;
      });

      this.videoEl.addEventListener('click', togglePlay);
    }

    if (progressBar) {
      progressBar.onclick = (e) => {
        if (!this.videoEl || !this.videoEl.duration) return;
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        this.videoEl.currentTime = pos * this.videoEl.duration;
      };
    }

    // Iniciar história
    const startBtn = document.getElementById('modal-start-watching-btn');
    if (startBtn) {
      startBtn.onclick = () => {
        if (this.currentSeries) {
          alert(`Iniciando episódio 1 de "${this.currentSeries.title}"! Bom dorama!`);
          this.close();
        }
      };
    }

    // Toggle Favorito
    const favBtn = document.getElementById('modal-toggle-fav-btn');
    if (favBtn) {
      favBtn.onclick = () => {
        if (this.currentSeries) {
          this.toggleFavorite(this.currentSeries.id);
        }
      };
    }
  }

  open(series) {
    if (!series) return;
    this.currentSeries = series;

    // Atualizar textos e informações
    document.getElementById('modal-title').textContent = series.title;
    document.getElementById('modal-tagline').textContent = series.tagline || series.originalTitle;
    document.getElementById('modal-synopsis').textContent = series.synopsis;
    document.getElementById('modal-episodes-badge').textContent = `${series.episodesCount} Episódios`;
    document.getElementById('modal-match-badge').textContent = `${Math.round((series.metrics?.trendingScore || 90))}% Relevância`;
    document.getElementById('modal-status-badge').textContent = series.isCompleted ? 'Completa' : 'Em Lançamento';

    // Lista de Personagens
    const charList = document.getElementById('modal-characters-list');
    charList.innerHTML = '';
    if (series.characters && series.characters.length > 0) {
      series.characters.forEach(c => {
        const div = document.createElement('div');
        div.className = 'p-2 rounded-lg bg-white/5 border border-white/5';
        div.innerHTML = `<span class="font-bold text-white block">${c.name}</span><span class="text-white/60 text-[11px]">${c.role}</span>`;
        charList.appendChild(div);
      });
    } else {
      charList.innerHTML = '<span class="text-white/50">Elenco não cadastrado.</span>';
    }

    // Tags
    const tagsList = document.getElementById('modal-tags-list');
    tagsList.innerHTML = '';
    const allTags = [...(series.genres || []), ...(series.tags || [])];
    allTags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'px-2 py-0.5 rounded-md bg-white/10 text-white/80 text-[11px] font-medium';
      span.textContent = tag;
      tagsList.appendChild(span);
    });

    // Atualizar status do botão de favorito
    this.updateFavButtonState(series.id);

    // Carregar Vídeo do Trailer
    if (this.videoEl) {
      this.videoEl.src = series.trailerUrl || series.previewClipUrl;
      this.videoEl.poster = series.posterUrl;
      this.videoEl.currentTime = 0;
      this.videoEl.muted = false;

      // Autoplay com fallback
      const playPromise = this.videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay foi bloqueado por permissão do navegador -> toca mutado
          this.videoEl.muted = true;
          document.getElementById('mute-label').textContent = 'Mudo';
          this.videoEl.play();
        });
      }
    }

    // Exibir Modal
    this.modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.removeAttribute('src');
      this.videoEl.load();
    }
    this.modalEl.classList.add('hidden');
    document.body.style.overflow = '';
    this.currentSeries = null;
  }

  updateFavButtonState(seriesId) {
    const isFav = this.isSeriesFavorite(seriesId);
    const favLabel = document.getElementById('fav-label-modal');
    const favIcon = document.getElementById('fav-icon-modal');
    if (isFav) {
      favLabel.textContent = 'Salvo na Lista';
      favIcon.setAttribute('fill', 'currentColor');
    } else {
      favLabel.textContent = 'Minha Lista';
      favIcon.setAttribute('fill', 'none');
    }
  }

  isSeriesFavorite(seriesId) {
    try {
      const favs = JSON.parse(localStorage.getItem('dramix_user_favorites') || '[]');
      return favs.includes(seriesId);
    } catch (e) {
      return false;
    }
  }

  toggleFavorite(seriesId) {
    try {
      let favs = JSON.parse(localStorage.getItem('dramix_user_favorites') || '[]');
      if (favs.includes(seriesId)) {
        favs = favs.filter(id => id !== seriesId);
      } else {
        favs.push(seriesId);
      }
      localStorage.setItem('dramix_user_favorites', JSON.stringify(favs));
      this.updateFavButtonState(seriesId);
      window.dispatchEvent(new CustomEvent('dramix-favorite-changed', { detail: { seriesId } }));
    } catch (e) {}
  }
}

window.DramixPlayerModal = DramixPlayerModal;
