/**
 * DRAMIX — Página Inicial (Catálogo Cinematográfico & Experiência Que Prende e Vende)
 * - Destaque Principal Cinematográfico configurável
 * - Seção "Continue Assistindo" no topo da Home com barra de progresso e botão "Continuar do Ep. X"
 * - Barra interativa de Tropes Populares (CEO, Vingança, Bilionário, Gravidez, etc.)
 * - Cards verticais 9:16 com nº de episódios, duração total e selos NOVO, EM ALTA, FINALIZADO
 * - Fileiras horizontais com navegação por setas laterais no computador e touch scroll no mobile
 */

(function(root) {
  'use strict';

  class DramixHomeView {
    constructor(api) {
      this.api = api || root.dramixAPI;
    }

    render(container) {
      const user = this.api.getCurrentUser();
      const catalogData = this.api.getHomeCatalog(user ? user.id : null);
      const featured = catalogData.featured;
      const continueWatchingList = catalogData.continueWatching || [];

      const popularTropes = [
        { label: 'CEO', icon: '👔' },
        { label: 'Vingança', icon: '⚔️' },
        { label: 'Bilionário', icon: '💎' },
        { label: 'Gravidez', icon: '🍼' },
        { label: 'Casamento por Contrato', icon: '💍' },
        { label: 'Amor Proibido', icon: '🔥' },
        { label: 'Reencarnação', icon: '⏳' },
        { label: 'Segunda Chance', icon: '🔄' }
      ];

      container.innerHTML = `
        <div class="space-y-10 pb-20">
          
          <!-- 1. DESTAQUE PRINCIPAL CINEMATOGRÁFICO (HERO BANNER) -->
          ${featured ? `
            <div class="relative w-full h-[460px] md:h-[540px] rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
              <!-- Imagem de Fundo com Fade Cinematográfico -->
              <img src="${featured.backdrop_url || featured.poster_url}" class="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-1000 group-hover:scale-105" />
              <div class="absolute inset-0 bg-gradient-to-r from-[#060810] via-[#060810]/85 to-transparent"></div>
              <div class="absolute inset-0 bg-gradient-to-t from-[#060810] via-transparent to-black/30"></div>

              <!-- Conteúdo Textual e Ações -->
              <div class="relative z-10 h-full max-w-2xl flex flex-col justify-end p-6 md:p-12 space-y-4">
                
                <div class="flex flex-wrap items-center gap-2.5">
                  <span class="px-2.5 py-0.5 rounded bg-[#E52E4D] text-white text-[10px] font-black uppercase tracking-wider">
                    Destaque
                  </span>
                  ${featured.badge ? `
                    <span class="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${featured.badge_color || 'bg-amber-500 text-black'}">
                      ${featured.badge}
                    </span>
                  ` : ''}
                  <span class="px-2 py-0.5 rounded bg-white/10 backdrop-blur-sm text-gray-300 text-xs font-bold border border-white/10">
                    ${featured.content_rating || '14+'}
                  </span>
                  <span class="text-xs text-emerald-400 font-bold">
                    Ep. 1 Livre
                  </span>
                  <span class="text-xs text-gray-300 font-medium">
                    ${featured.genres.join(' • ')}
                  </span>
                </div>

                <h1 class="text-3xl md:text-5xl font-black text-white leading-tight drop-shadow-md">
                  ${featured.title}
                </h1>

                <p class="text-xs md:text-sm text-gray-300 line-clamp-3 leading-relaxed drop-shadow max-w-xl">
                  ${featured.synopsis}
                </p>

                <!-- Botões de Ação do Hero -->
                <div class="flex items-center gap-3 pt-2">
                  <button class="hero-play-btn py-3 px-6 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-black text-xs md:text-sm shadow-xl shadow-[#E52E4D]/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer" data-id="${featured.id}">
                    <svg class="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Assistir Ep. 1 Grátis
                  </button>

                  <button class="hero-details-btn py-3 px-5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs md:text-sm backdrop-blur-md border border-white/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer" data-id="${featured.id}">
                    Ver Detalhes
                  </button>
                </div>

              </div>
            </div>
          ` : ''}

          <!-- 2. SEÇÃO CONTINUE ASSISTINDO NO TOPO DA HOME (SE HOUVER HISTÓRICO) -->
          ${continueWatchingList.length > 0 ? `
            <div class="space-y-3 relative group/continue">
              <div class="flex items-center justify-between px-1">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#E52E4D] animate-pulse"></span>
                  <h2 class="text-base md:text-lg font-bold text-white tracking-wide">Continue Assistindo</h2>
                </div>
                <span class="text-[11px] text-gray-400 font-medium">${continueWatchingList.length} em andamento</span>
              </div>

              <div class="flex gap-4 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
                ${continueWatchingList.map(item => this.renderContinueWatchingHeroCard(item)).join('')}
              </div>
            </div>
          ` : ''}

          <!-- 3. BARRA DE BUSCA RÁPIDA POR TROPES / TEMAS POPULARES -->
          <div class="p-4 md:p-5 rounded-2xl bg-[#0E1322] border border-white/10 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-gray-400">Buscar por Tropes Populares:</span>
              <span class="text-[11px] text-[#E52E4D] font-bold cursor-pointer hover:underline" id="home-view-all-categories">Ver todas as categorias &rarr;</span>
            </div>
            
            <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              ${popularTropes.map(t => `
                <button class="home-trope-chip flex-shrink-0 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-[#E52E4D]/20 text-gray-300 hover:text-white border border-white/10 hover:border-[#E52E4D]/40 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95" data-trope="${t.label}">
                  <span>${t.icon}</span>
                  <span>${t.label}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- 4. FILEIRAS HORIZONTAIS COM NAVEGAÇÃO LATERAL -->
          <div class="space-y-8">
            ${catalogData.rows.map((row, rowIdx) => `
              <div class="space-y-3 relative group/row">
                
                <div class="flex items-center justify-between px-1">
                  <h2 class="text-base md:text-lg font-bold text-white tracking-wide">
                    ${row.title}
                  </h2>
                  <span class="text-[11px] text-gray-400 font-medium">
                    ${row.items.length} produções
                  </span>
                </div>

                <div class="relative">
                  <!-- Seta Esquerda (Desktop) -->
                  <button class="row-scroll-btn-left absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/80 hover:bg-[#E52E4D] text-white flex items-center justify-center border border-white/20 opacity-0 group-hover/row:opacity-100 transition-all hidden md:flex cursor-pointer shadow-xl" data-target="row-container-${rowIdx}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                  </button>

                  <!-- Container Scrollável -->
                  <div id="row-container-${rowIdx}" class="flex gap-3 md:gap-4 overflow-x-auto pb-4 scrollbar-none scroll-smooth">
                    ${row.type === 'continue_watching' 
                      ? row.items.map(item => this.renderContinueWatchingHeroCard(item)).join('')
                      : row.items.map(series => this.renderSeriesCard(series)).join('')
                    }
                  </div>

                  <!-- Seta Direita (Desktop) -->
                  <button class="row-scroll-btn-right absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/80 hover:bg-[#E52E4D] text-white flex items-center justify-center border border-white/20 opacity-0 group-hover/row:opacity-100 transition-all hidden md:flex cursor-pointer shadow-xl" data-target="row-container-${rowIdx}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>

              </div>
            `).join('')}
          </div>

        </div>
      `;

      this.bindEvents(container);
    }

    renderSeriesCard(series) {
      return `
        <div class="flex-shrink-0 w-[145px] sm:w-[165px] md:w-[180px] space-y-1.5 group/card cursor-pointer series-card-trigger" data-id="${series.id}">
          <div class="relative aspect-[9/16] rounded-xl overflow-hidden bg-[#0A0D18] border border-white/10 group-hover/card:border-[#E52E4D] shadow-lg transition-all duration-300 group-hover/card:scale-[1.03]">
            <img src="${series.poster_url}" class="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105" loading="lazy" />
            
            <!-- Badges no Topo: Selos NOVO / EM ALTA / FINALIZADO -->
            <div class="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
              ${series.badge ? `
                <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shadow-md ${series.badge_color || 'bg-[#E52E4D] text-white'}">
                  ${series.badge}
                </span>
              ` : ''}
              <span class="px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-emerald-400 text-[9px] font-bold uppercase tracking-wider border border-white/10">
                Ep 1 Livre
              </span>
            </div>

            <!-- Overlay de Hover com Botão Play -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
              <div class="w-11 h-11 rounded-full bg-[#E52E4D] text-white flex items-center justify-center shadow-lg shadow-[#E52E4D]/40 transform scale-75 group-hover/card:scale-100 transition-transform">
                <svg class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>

            <!-- Duração & Rating no Rodapé do Card -->
            <div class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-gray-300 text-[9px] font-mono">
              ${series.content_rating || '14+'}
            </div>
          </div>

          <div>
            <h4 class="text-xs font-bold text-white group-hover/card:text-[#E52E4D] truncate transition-colors">
              ${series.title}
            </h4>
            <div class="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
              <span>${series.episodes_count || 10} eps • ${series.total_duration || '~20m'}</span>
            </div>
          </div>
        </div>
      `;
    }

    renderContinueWatchingHeroCard(item) {
      const s = item.series;
      const ep = item.episode;
      return `
        <div class="flex-shrink-0 w-[240px] sm:w-[280px] p-3 rounded-2xl bg-[#0E1322] border border-white/10 hover:border-[#E52E4D]/50 space-y-2 group cursor-pointer continue-card-trigger transition-all" data-id="${s.id}" data-ep="${ep.episode_number}" data-progress="${item.progressSeconds}">
          <div class="flex gap-3 items-center">
            <div class="relative w-16 h-24 rounded-xl overflow-hidden bg-black flex-shrink-0">
              <img src="${s.poster_url}" class="w-full h-full object-cover" />
            </div>

            <div class="min-w-0 flex-1 space-y-1">
              <h4 class="text-xs font-bold text-white truncate group-hover:text-[#E52E4D] transition-colors">${s.title}</h4>
              <p class="text-[11px] text-gray-300 truncate">Episódio ${ep.episode_number}</p>
              
              <!-- Botão Continuar do Ep. X -->
              <button class="py-1 px-3 rounded-lg bg-[#E52E4D] hover:bg-[#c92440] text-white text-[10px] font-black flex items-center gap-1 shadow transition-all">
                <svg class="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Continuar do Ep. ${ep.episode_number}
              </button>
            </div>
          </div>

          <!-- Barra de Progresso com % -->
          <div class="space-y-1">
            <div class="flex justify-between text-[9px] text-gray-400">
              <span>Progresso</span>
              <span>${item.progressPercent}%</span>
            </div>
            <div class="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div class="h-full bg-[#E52E4D] rounded-full" style="width: ${item.progressPercent}%"></div>
            </div>
          </div>
        </div>
      `;
    }

    bindEvents(container) {
      // Setas laterais de navegação
      container.querySelectorAll('.row-scroll-btn-left').forEach(btn => {
        btn.onclick = () => {
          const target = document.getElementById(btn.dataset.target);
          if (target) target.scrollBy({ left: -360, behavior: 'smooth' });
        };
      });

      container.querySelectorAll('.row-scroll-btn-right').forEach(btn => {
        btn.onclick = () => {
          const target = document.getElementById(btn.dataset.target);
          if (target) target.scrollBy({ left: 360, behavior: 'smooth' });
        };
      });

      // Cliques em cards
      container.querySelectorAll('.series-card-trigger').forEach(card => {
        card.onclick = () => {
          window.dispatchEvent(new CustomEvent('dramix-navigate-view', {
            detail: { view: 'series-details', seriesId: card.dataset.id }
          }));
        };
      });

      container.querySelectorAll('.continue-card-trigger').forEach(card => {
        card.onclick = () => {
          const id = card.dataset.id;
          const ep = parseInt(card.dataset.ep, 10);
          const progress = parseFloat(card.dataset.progress);
          const series = this.api.db.table('series').findById(id);
          if (series) {
            window.dispatchEvent(new CustomEvent('dramix-play-episode', {
              detail: { series, episodeNumber: ep, startTimestamp: progress }
            }));
          }
        };
      });

      // Botões do Hero
      const heroPlay = container.querySelector('.hero-play-btn');
      if (heroPlay) {
        heroPlay.onclick = () => {
          const id = heroPlay.dataset.id;
          const series = this.api.db.table('series').findById(id);
          if (series) {
            window.dispatchEvent(new CustomEvent('dramix-play-episode', {
              detail: { series, episodeNumber: 1, startTimestamp: 0 }
            }));
          }
        };
      }

      const heroDetails = container.querySelector('.hero-details-btn');
      if (heroDetails) {
        heroDetails.onclick = () => {
          const id = heroDetails.dataset.id;
          window.dispatchEvent(new CustomEvent('dramix-navigate-view', {
            detail: { view: 'series-details', seriesId: id }
          }));
        };
      }

      // Chips de Tropes
      container.querySelectorAll('.home-trope-chip').forEach(chip => {
        chip.onclick = () => {
          const trope = chip.dataset.trope;
          window.dispatchEvent(new CustomEvent('dramix-navigate-view', {
            detail: { view: 'discover', search: trope }
          }));
        };
      });

      const viewAllCat = container.querySelector('#home-view-all-categories');
      if (viewAllCat) {
        viewAllCat.onclick = () => {
          window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'categories' } }));
        };
      }
    }
  }

  root.DramixHomeView = DramixHomeView;
})(typeof window !== 'undefined' ? window : global);
