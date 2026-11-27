/**
 * DRAMIX — Página Descobrir (Busca, Categorias e Filtros por Gênero/Classificação)
 * Interface limpa sem emojis, com busca multi-campo em tempo real e filtros refinados.
 */

(function(root) {
  'use strict';

  class DramixDiscoverView {
    constructor(api) {
      this.api = api || root.dramixAPI;
      this.searchQuery = '';
      this.selectedGenre = 'all';
      this.selectedRating = 'all';
      this.selectedSort = 'popularity';
    }

    render(container) {
      const allSeries = this.api.db.table('series').find(s => s.is_published);
      const genres = this.api.db.table('genres').all();
      const ratings = ['Livre', '12+', '14+', '16+', '18+'];

      // Aplicação dos filtros e busca
      let filtered = allSeries.filter(s => {
        // Busca textual
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase().trim();
          const matchTitle = (s.title || '').toLowerCase().includes(q);
          const matchSynopsis = (s.synopsis || '').toLowerCase().includes(q);
          const matchGenres = (s.genres || []).some(g => g.toLowerCase().includes(q));
          if (!matchTitle && !matchSynopsis && !matchGenres) return false;
        }

        // Filtro por gênero
        if (this.selectedGenre !== 'all') {
          if (!s.genres.includes(this.selectedGenre)) return false;
        }

        // Filtro por classificação indicativa
        if (this.selectedRating !== 'all') {
          if (s.content_rating !== this.selectedRating) return false;
        }

        return true;
      });

      // Ordenação
      if (this.selectedSort === 'popularity') {
        filtered.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
      } else if (this.selectedSort === 'newest') {
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else if (this.selectedSort === 'title') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
      }

      container.innerHTML = `
        <div class="space-y-8 pb-20">
          
          <!-- Cabeçalho da Página Descobrir -->
          <div class="space-y-2">
            <h1 class="text-2xl md:text-3xl font-black text-white tracking-wide">Descobrir</h1>
            <p class="text-xs md:text-sm text-gray-400">Explore todo o catálogo de minisséries verticais do DRAMIX.</p>
          </div>

          <!-- Barra de Pesquisa e Filtros -->
          <div class="p-4 md:p-6 rounded-2xl bg-[#0E1322] border border-white/10 space-y-4 shadow-lg">
            
            <!-- Input de Pesquisa -->
            <div class="relative">
              <input 
                type="text" 
                id="discover-search-input" 
                value="${this.searchQuery}" 
                placeholder="Pesquisar por título, gênero, sinopse, palavras-chave..." 
                class="w-full bg-black/60 border border-white/15 focus:border-[#E52E4D] text-xs md:text-sm text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-3 outline-none transition-colors"
              />
              <svg class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>

            <!-- Chips de Gênero (Sem emojis) -->
            <div class="space-y-1.5">
              <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Gêneros</span>
              <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button class="genre-filter-btn flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${this.selectedGenre === 'all' ? 'bg-[#E52E4D] text-white shadow' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'}" data-genre="all">
                  Todos
                </button>
                ${genres.map(g => `
                  <button class="genre-filter-btn flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${this.selectedGenre === g.name ? 'bg-[#E52E4D] text-white shadow' : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'}" data-genre="${g.name}">
                    ${g.name}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Filtro de Classificação Indicativa e Ordenação -->
            <div class="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10 text-xs">
              <div class="flex items-center gap-2">
                <span class="text-gray-400">Classificação:</span>
                <div class="flex items-center gap-1.5">
                  <button class="rating-filter-btn px-2.5 py-1 rounded text-[11px] font-bold ${this.selectedRating === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}" data-rating="all">Todas</button>
                  ${ratings.map(r => `
                    <button class="rating-filter-btn px-2.5 py-1 rounded text-[11px] font-bold ${this.selectedRating === r ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}" data-rating="${r}">${r}</button>
                  `).join('')}
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-gray-400">Ordenar por:</span>
                <select id="discover-sort-select" class="bg-black/60 border border-white/15 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[#E52E4D]">
                  <option value="popularity" ${this.selectedSort === 'popularity' ? 'selected' : ''}>Mais Populares</option>
                  <option value="newest" ${this.selectedSort === 'newest' ? 'selected' : ''}>Lançamentos</option>
                  <option value="title" ${this.selectedSort === 'title' ? 'selected' : ''}>Ordem Alfabética</option>
                </select>
              </div>
            </div>

          </div>

          <!-- Resultados em Grade -->
          <div>
            <div class="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <span class="text-xs text-gray-400 font-medium">${filtered.length} títulos encontrados</span>
            </div>

            ${filtered.length === 0 ? `
              <div class="py-16 text-center space-y-2">
                <p class="text-sm font-semibold text-white">Nenhuma minissérie encontrada com esses critérios.</p>
                <p class="text-xs text-gray-400">Tente buscar por termos mais genéricos como "Romance" ou "Vingança".</p>
              </div>
            ` : `
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                ${filtered.map(series => `
                  <div class="space-y-1.5 group cursor-pointer discover-series-card" data-id="${series.id}">
                    <div class="relative aspect-[9/16] rounded-xl overflow-hidden bg-[#0A0D18] border border-white/10 group-hover:border-[#E52E4D] shadow-lg transition-all duration-300 group-hover:scale-[1.03]">
                      <img src="${series.poster_url}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      
                      <div class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-gray-300 text-[9px] font-mono">
                        ${series.content_rating || '14+'}
                      </div>
                    </div>

                    <div>
                      <h4 class="text-xs font-bold text-white group-hover:text-[#E52E4D] truncate transition-colors">
                        ${series.title}
                      </h4>
                      <p class="text-[10px] text-gray-400 truncate">
                        ${series.genres ? series.genres.join(' • ') : ''}
                      </p>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

        </div>
      `;

      this.bindEvents(container);
    }

    bindEvents(container) {
      const searchInput = container.querySelector('#discover-search-input');
      if (searchInput) {
        searchInput.oninput = (e) => {
          this.searchQuery = e.target.value;
          this.render(container);
          // Manter foco e cursor
          const newEl = container.querySelector('#discover-search-input');
          if (newEl) {
            newEl.focus();
            newEl.setSelectionRange(newEl.value.length, newEl.value.length);
          }
        };
      }

      container.querySelectorAll('.genre-filter-btn').forEach(btn => {
        btn.onclick = () => {
          this.selectedGenre = btn.dataset.genre;
          this.render(container);
        };
      });

      container.querySelectorAll('.rating-filter-btn').forEach(btn => {
        btn.onclick = () => {
          this.selectedRating = btn.dataset.rating;
          this.render(container);
        };
      });

      const sortSelect = container.querySelector('#discover-sort-select');
      if (sortSelect) {
        sortSelect.onchange = () => {
          this.selectedSort = sortSelect.value;
          this.render(container);
        };
      }

      container.querySelectorAll('.discover-series-card').forEach(card => {
        card.onclick = () => {
          const id = card.dataset.id;
          window.dispatchEvent(new CustomEvent('dramix-navigate-view', {
            detail: { view: 'series-details', seriesId: id }
          }));
        };
      });
    }
  }

  root.DramixDiscoverView = DramixDiscoverView;
})(typeof window !== 'undefined' ? window : global);
