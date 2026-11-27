/**
 * DRAMIX — Página Individual da Minissérie
 * Ficha técnica detalhada com pôster vertical cinematográfico, sinopse,
 * lista de episódios com regra: Ep 1 livre, Ep 2 em diante com cadeado "Desbloquear com Premium".
 */

(function(root) {
  'use strict';

  class DramixSeriesDetailsView {
    constructor(api) {
      this.api = api || root.dramixAPI;
    }

    render(container, seriesId) {
      const user = this.api.getCurrentUser();
      const details = this.api.getSeriesDetails(seriesId, user ? user.id : null);

      if (!details) {
        container.innerHTML = `
          <div class="py-20 text-center space-y-4">
            <h2 class="text-xl font-bold text-white">Minissérie não encontrada</h2>
            <button class="px-4 py-2 rounded-xl bg-[#E52E4D] text-white text-xs font-bold" id="btn-back-home">Voltar ao Início</button>
          </div>
        `;
        const btnBack = container.querySelector('#btn-back-home');
        if (btnBack) btnBack.onclick = () => window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'home' } }));
        return;
      }

      const s = details.series;
      const eps = details.episodes;
      const isFav = details.isFavorite;

      container.innerHTML = `
        <div class="space-y-10 pb-20">
          
          <!-- Botão Voltar -->
          <div>
            <button id="details-btn-back" class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              Voltar ao catálogo
            </button>
          </div>

          <!-- Banner Principal e Ficha Técnica da Minissérie -->
          <div class="relative rounded-3xl overflow-hidden bg-[#0E1322] border border-white/10 shadow-2xl">
            <!-- Imagem de Fundo com Fade -->
            <img src="${s.backdrop_url || s.poster_url}" class="absolute inset-0 w-full h-full object-cover object-top opacity-30" />
            <div class="absolute inset-0 bg-gradient-to-t from-[#0E1322] via-[#0E1322]/80 to-transparent"></div>

            <div class="relative z-10 p-6 md:p-10 flex flex-col md:flex-row gap-8 items-start">
              
              <!-- Pôster Vertical 9:16 com Selo de Status -->
              <div class="relative w-44 md:w-56 aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-white/15 flex-shrink-0 mx-auto md:mx-0">
                <img src="${s.poster_url}" class="w-full h-full object-cover" />
                
                ${s.badge ? `
                  <div class="absolute top-3 left-3 z-10">
                    <span class="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-lg ${s.badge_color || 'bg-[#E52E4D] text-white'}">
                      ${s.badge}
                    </span>
                  </div>
                ` : ''}
              </div>

              <!-- Informações -->
              <div class="flex-1 space-y-4">
                
                <div class="flex flex-wrap items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded bg-white/10 text-gray-300 text-xs font-bold border border-white/10">
                    ${s.content_rating || '14+'}
                  </span>
                  <span class="text-xs text-gray-300 font-semibold">
                    ${s.genres.join(' • ')}
                  </span>
                  <span class="text-xs text-gray-400">• ${eps.length} Episódios</span>
                  <span class="text-xs text-gray-400">• ${s.total_duration || '~20 min'}</span>
                  <span class="text-xs text-emerald-400 font-bold">• Ep. 1 Livre para todos</span>
                </div>

                <h1 class="text-2xl md:text-4xl font-black text-white leading-tight">
                  ${s.title}
                </h1>

                <!-- Tropes / Temas em destaque -->
                ${s.tropes ? `
                  <div class="flex flex-wrap gap-1.5 pt-1">
                    ${s.tropes.map(t => `
                      <span class="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-[10px] font-semibold">
                        #${t}
                      </span>
                    `).join('')}
                  </div>
                ` : ''}

                <p class="text-xs md:text-sm text-gray-300 leading-relaxed max-w-3xl pt-1">
                  ${s.synopsis}
                </p>

                <!-- Botões de Ação -->
                <div class="flex flex-wrap items-center gap-3 pt-3">
                  <button id="details-btn-start" class="py-3 px-6 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-black text-xs md:text-sm shadow-xl shadow-[#E52E4D]/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer">
                    <svg class="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Assistir Episódio 1 (Grátis)
                  </button>

                  <button id="details-btn-fav" class="py-3 px-5 rounded-xl border border-white/15 hover:bg-white/10 text-white font-bold text-xs md:text-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${isFav ? 'bg-white/15 text-[#E52E4D] border-[#E52E4D]/40' : 'bg-black/40'}">
                    <svg class="w-4 h-4 ${isFav ? 'text-[#E52E4D]' : 'text-gray-400'}" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                    <span>${isFav ? 'Na Minha Lista' : 'Adicionar à Minha Lista'}</span>
                  </button>
                </div>

              </div>

            </div>
          </div>

          <!-- Lista Completa de Episódios: Ep 1 Livre / Ep 2 em diante com Cadeado -->
          <div class="space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 class="text-lg font-bold text-white tracking-wide">Episódios</h3>
                <p class="text-xs text-gray-400">Episódio 1 livre para degustação. Episódio 2 em diante bloqueado para assinantes Premium.</p>
              </div>
              <span class="text-xs text-gray-400 font-medium">${eps.length} no total</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              ${eps.map(ep => {
                const isFree = ep.episode_number === 1;
                const hasAccess = ep.hasAccess;

                return `
                  <div class="p-3.5 rounded-2xl bg-[#0E1322] border border-white/10 hover:border-[#E52E4D]/50 flex items-center justify-between gap-3 group cursor-pointer episode-item-trigger transition-all" data-ep-num="${ep.episode_number}">
                    
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs text-white group-hover:bg-[#E52E4D] group-hover:text-white transition-colors flex-shrink-0">
                        ${ep.episode_number}
                      </div>

                      <div class="min-w-0">
                        <h4 class="text-xs font-bold text-white truncate group-hover:text-[#E52E4D] transition-colors">
                          ${ep.title}
                        </h4>
                        <span class="text-[10px] text-gray-400 font-mono">
                          ${Math.round(ep.duration_seconds / 60)} min • Ep. ${ep.episode_number}
                        </span>
                      </div>
                    </div>

                    <div class="flex-shrink-0">
                      ${isFree ? `
                        <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                          Grátis
                        </span>
                      ` : hasAccess ? `
                        <span class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider border border-purple-500/30">
                          Liberado
                        </span>
                      ` : `
                        <span class="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30 flex items-center gap-1">
                          <svg class="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                          Desbloquear com Premium
                        </span>
                      `}
                    </div>

                  </div>
                `;
              }).join('')}
            </div>
          </div>

        </div>
      `;

      this.bindEvents(container, s);
    }

    bindEvents(container, series) {
      const backBtn = container.querySelector('#details-btn-back');
      if (backBtn) {
        backBtn.onclick = () => window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'home' } }));
      }

      const startBtn = container.querySelector('#details-btn-start');
      if (startBtn) {
        startBtn.onclick = () => {
          window.dispatchEvent(new CustomEvent('dramix-play-episode', {
            detail: { series, episodeNumber: 1, startTimestamp: 0 }
          }));
        };
      }

      const favBtn = container.querySelector('#details-btn-fav');
      if (favBtn) {
        favBtn.onclick = () => {
          const user = this.api.getCurrentUser();
          if (!user) {
            window.dispatchEvent(new CustomEvent('dramix-open-auth-modal'));
            return;
          }
          this.api.toggleFavorite(user.id, series.id);
          this.render(container, series.id);
        };
      }

      container.querySelectorAll('.episode-item-trigger').forEach(item => {
        item.onclick = () => {
          const epNum = parseInt(item.dataset.epNum, 10);
          window.dispatchEvent(new CustomEvent('dramix-play-episode', {
            detail: { series, episodeNumber: epNum, startTimestamp: 0 }
          }));
        };
      });
    }
  }

  root.DramixSeriesDetailsView = DramixSeriesDetailsView;
})(typeof window !== 'undefined' ? window : global);
