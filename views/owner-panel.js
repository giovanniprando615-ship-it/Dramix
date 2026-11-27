/**
 * DRAMIX — Painel Administrativo Exclusivo do Owner
 * Controle completo e profissional:
 * - Métricas de audiência, receita, assinantes ativos e desbloqueios de anúncios.
 * - Gestão de monetização: preços dos planos, regras de moedas e pacotes da loja.
 * - Chamados de suporte enviados pelos usuários.
 * - Publicação e gestão completa de minisséries e episódios (vídeos, capas, trailers).
 * - Definição da produção em destaque na Home e reordenação de fileiras.
 * - Restrição estrita de acesso: apenas usuários com role 'owner'.
 */

(function(root) {
  'use strict';

  class DramixOwnerPanelView {
    constructor(api) {
      this.api = api || root.dramixAPI;
      this.activeTab = 'stats'; // 'stats', 'monetization', 'coins', 'series', 'episodes', 'home_layout', 'support'
      this.selectedSeriesForEpisodes = null;
    }

    render(container) {
      const user = this.api.getCurrentUser();

      // Validação de Permissão: Apenas Owner
      if (!user || user.role !== 'owner') {
        container.innerHTML = `
          <div class="py-24 text-center space-y-4 max-w-md mx-auto">
            <div class="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
            </div>
            <h2 class="text-xl font-bold text-white">Acesso Restrito ao Proprietário</h2>
            <p class="text-xs text-gray-400">
              Esta área é exclusiva para a diretoria e administradores do DRAMIX. Usuários comuns não possuem permissão de gerenciamento.
            </p>
          </div>
        `;
        return;
      }

      // Estatísticas gerais
      const stats = this.api.getAdminStats(user.id);
      const plans = this.api.getSubscriptionPlans();
      const seriesList = this.api.db.table('series').all();

      container.innerHTML = `
        <div class="space-y-8 pb-24 pt-2">
          
          <!-- Cabeçalho do Painel com Estilo Executivo -->
          <div class="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#12172B] via-[#0E1322] to-black border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider">
                  PAINEL ADMINISTRATIVO
                </span>
                <span class="text-xs text-gray-400 font-medium">Controle de Streaming & Monetização</span>
              </div>
              <h1 class="text-2xl md:text-3xl font-black text-white">Painel do Owner</h1>
              <p class="text-xs text-gray-400">Gerencie títulos, precificação de planos, episódios gratuitos e layouts da Home.</p>
            </div>

            <div class="flex items-center gap-2">
              <button id="owner-btn-view-as-user" class="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer">
                Ver plataforma como espectador
              </button>
            </div>
          </div>

          <!-- Cards de Métricas em Tempo Real -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div class="p-4 rounded-2xl bg-[#0E1322] border border-white/10 space-y-1">
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Assinantes Ativos</span>
              <span class="text-xl md:text-2xl font-black text-amber-400">${stats.activeSubscribers}</span>
              <span class="text-[10px] text-gray-500 block">Planos vigentes</span>
            </div>

            <div class="p-4 rounded-2xl bg-[#0E1322] border border-white/10 space-y-1">
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Usuários Gratuitos</span>
              <span class="text-xl md:text-2xl font-black text-white">${stats.freeUsers}</span>
              <span class="text-[10px] text-gray-500 block">Espectadores free</span>
            </div>

            <div class="p-4 rounded-2xl bg-[#0E1322] border border-white/10 space-y-1">
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Receita Acumulada</span>
              <span class="text-xl md:text-2xl font-black text-emerald-400">R$ ${stats.totalRevenue.toFixed(2).replace('.', ',')}</span>
              <span class="text-[10px] text-gray-500 block">Assinaturas ${root.dramixUI.brl(stats.subscriptionRevenue)} • Moedas ${root.dramixUI.brl(stats.coinRevenue)}</span>
            </div>

            <div class="p-4 rounded-2xl bg-[#0E1322] border border-white/10 space-y-1">
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Moedas gastas</span>
              <span class="text-xl md:text-2xl font-black text-amber-300">${stats.coinsSpent}</span>
              <span class="text-[10px] text-gray-500 block">${stats.coinUnlocks} episódios desbloqueados</span>
            </div>

            <div class="p-4 rounded-2xl bg-[#0E1322] border border-white/10 space-y-1">
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Moedas em carteiras</span>
              <span class="text-xl md:text-2xl font-black text-white">${stats.coinsInCirculation}</span>
              <span class="text-[10px] text-gray-500 block">Saldo somado dos usuários</span>
            </div>

            <div class="p-4 rounded-2xl bg-[#0E1322] border border-white/10 space-y-1">
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Visualizações</span>
              <span class="text-xl md:text-2xl font-black text-white">${(stats.totalViews / 1000000).toFixed(1)}M</span>
              <span class="text-[10px] text-gray-500 block">Reproduções no catálogo</span>
            </div>

            <div class="p-4 rounded-2xl bg-[#0E1322] border border-white/10 space-y-1">
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Desbloqueios de Ads</span>
              <span class="text-xl md:text-2xl font-black text-purple-400">${stats.totalRewardedAdUnlocks}</span>
              <span class="text-[10px] text-gray-500 block">Anúncios completados</span>
            </div>
          </div>

          <!-- Abas de Navegação Administrativa -->
          <div class="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
            <button class="owner-nav-tab py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.activeTab === 'stats' ? 'bg-[#E52E4D] text-white shadow' : 'bg-transparent text-gray-400 hover:text-white'}" data-tab="stats">
              Visão Geral
            </button>
            <button class="owner-nav-tab py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.activeTab === 'monetization' ? 'bg-[#E52E4D] text-white shadow' : 'bg-transparent text-gray-400 hover:text-white'}" data-tab="monetization">
              Planos
            </button>
            <button class="owner-nav-tab py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.activeTab === 'coins' ? 'bg-[#E52E4D] text-white shadow' : 'bg-transparent text-gray-400 hover:text-white'}" data-tab="coins">
              Moedas e loja
            </button>
            <button class="owner-nav-tab py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.activeTab === 'series' ? 'bg-[#E52E4D] text-white shadow' : 'bg-transparent text-gray-400 hover:text-white'}" data-tab="series">
              Minisséries (${seriesList.length})
            </button>
            <button class="owner-nav-tab py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.activeTab === 'episodes' ? 'bg-[#E52E4D] text-white shadow' : 'bg-transparent text-gray-400 hover:text-white'}" data-tab="episodes">
              Gerenciar Episódios
            </button>
            <button class="owner-nav-tab py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.activeTab === 'home_layout' ? 'bg-[#E52E4D] text-white shadow' : 'bg-transparent text-gray-400 hover:text-white'}" data-tab="home_layout">
              Organizar Home
            </button>
            <button class="owner-nav-tab py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.activeTab === 'support' ? 'bg-[#E52E4D] text-white shadow' : 'bg-transparent text-gray-400 hover:text-white'}" data-tab="support">
              Suporte (${stats.openTickets})
            </button>
          </div>

          <!-- Conteúdo da Aba Ativa -->
          <div id="owner-active-tab-container">
            ${this.activeTab === 'stats' ? this.renderStatsTab(stats, seriesList) : ''}
            ${this.activeTab === 'monetization' ? this.renderMonetizationTab(plans) : ''}
            ${this.activeTab === 'coins' ? this.renderCoinsTab() : ''}
            ${this.activeTab === 'support' ? this.renderSupportTab(user) : ''}
            ${this.activeTab === 'series' ? this.renderSeriesTab(seriesList) : ''}
            ${this.activeTab === 'episodes' ? this.renderEpisodesTab(seriesList) : ''}
            ${this.activeTab === 'home_layout' ? this.renderHomeLayoutTab(seriesList) : ''}
          </div>

        </div>
      `;

      this.bindEvents(container, user);
    }

    renderStatsTab(stats, seriesList) {
      return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="p-6 rounded-3xl bg-[#0E1322] border border-white/10 space-y-4">
            <h3 class="text-sm font-bold text-white uppercase tracking-wider">Top Produções por Audiência</h3>
            <div class="space-y-3">
              ${[...seriesList].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 5).map((s, idx) => `
                <div class="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                  <div class="flex items-center gap-3 min-w-0">
                    <span class="font-bold text-gray-400 w-4">${idx + 1}</span>
                    <img src="${root.dramixUI.safeUrl(s.poster_url)}" alt="" class="w-8 h-12 object-cover rounded-md flex-shrink-0" />
                    <span class="font-semibold text-white truncate">${root.dramixUI.esc(s.title)}</span>
                  </div>
                  <span class="font-mono text-gray-300 font-bold ml-2">${(s.views_count / 1000000).toFixed(1)}M views</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="p-6 rounded-3xl bg-[#0E1322] border border-white/10 space-y-4">
            <h3 class="text-sm font-bold text-white uppercase tracking-wider">Regras de Monetização Ativas</h3>
            ${(() => { const st = this.api.settings(); const { brl } = root.dramixUI; return `
            <div class="space-y-3 text-xs text-gray-300">
              <div class="p-3 rounded-xl bg-white/5 flex items-center justify-between"><span>Episódios grátis por padrão</span><span class="font-bold text-emerald-400">1 a ${st.default_free_episodes}</span></div>
              <div class="p-3 rounded-xl bg-white/5 flex items-center justify-between"><span>Preço por episódio</span><span class="font-bold text-amber-300">${st.episode_price_coins} moedas</span></div>
              <div class="p-3 rounded-xl bg-white/5 flex items-center justify-between"><span>Bônus de cadastro / presente diário</span><span class="font-bold text-amber-300">${st.welcome_bonus_coins} / ${st.daily_gift_coins} moedas</span></div>
              <div class="p-3 rounded-xl bg-white/5 flex items-center justify-between"><span>Anúncio recompensado</span><span class="font-bold text-purple-400">1 a cada ${st.rewarded_ad_cooldown_hours}h</span></div>
              ${this.api.getSubscriptionPlans().map(p => `<div class="p-3 rounded-xl bg-white/5 flex items-center justify-between"><span>${root.dramixUI.esc(p.name)}</span><span class="font-bold text-white font-mono">${brl(p.price)} (${p.duration_days} dias)</span></div>`).join('')}
            </div>`; })()}
          </div>
        </div>
      `;
    }

    renderMonetizationTab(plans) {
      return `
        <div class="space-y-6">
          <div class="p-6 rounded-3xl bg-[#0E1322] border border-white/10 space-y-4">
            <div class="space-y-1">
              <h3 class="text-base font-bold text-white">Configuração dos Preços de Assinatura</h3>
              <p class="text-xs text-gray-400">Ajuste os valores dos planos de assinatura do DRAMIX em tempo real no banco de dados.</p>
            </div>

            <form id="owner-form-plans" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              ${plans.map(p => `
                <div class="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                  <label for="price-${p.id}" class="text-xs font-bold text-white block">${root.dramixUI.esc(p.name)}</label>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400 font-bold">R$</span>
                    <input id="price-${p.id}" type="number" step="0.01" min="0" class="plan-price-input w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-amber-400" data-plan-id="${p.id}" value="${p.price.toFixed(2)}" />
                  </div>
                  <span class="text-[10px] text-gray-500 block">Duração: ${p.duration_days} dias</span>
                </div>
              `).join('')}

              <div class="sm:col-span-3 flex justify-end pt-2">
                <button type="submit" class="py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-lg transition-all cursor-pointer">
                  Salvar Novos Preços
                </button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    renderSeriesTab(seriesList) {
      return `
        <div class="space-y-6">
          
          <!-- Formulário de Criação de Minissérie -->
          <div class="p-6 rounded-3xl bg-[#0E1322] border border-white/10 space-y-4">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              Publicar nova minissérie no catálogo
            </h3>

            <form id="owner-form-create-series" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="text-[11px] text-gray-400 block mb-1">Título da Produção</label>
                  <input type="text" id="new-series-title" required placeholder="ex: O Retorno do Herdeiro Sombrio" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label class="text-[11px] text-gray-400 block mb-1">Gêneros (separados por vírgula, sem emojis)</label>
                  <input type="text" id="new-series-genres" required placeholder="Romance, CEO, Drama" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400" />
                </div>
              </div>

              <div>
                <label class="text-[11px] text-gray-400 block mb-1">Sinopse Completa</label>
                <textarea id="new-series-synopsis" required rows="3" placeholder="Sinopse detalhada da minissérie vertical..." class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400"></textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label class="text-[11px] text-gray-400 block mb-1">URL da Capa (Pôster Vertical 9:16)</label>
                  <input type="text" id="new-series-poster" required placeholder="https://..." class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label class="text-[11px] text-gray-400 block mb-1">URL da Capa Horizontal (Banner)</label>
                  <input type="text" id="new-series-backdrop" placeholder="https://..." class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label class="text-[11px] text-gray-400 block mb-1">Classificação Indicativa</label>
                  <select id="new-series-rating" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400">
                    <option value="Livre">Livre</option>
                    <option value="12+">12+</option>
                    <option value="14+" selected>14+</option>
                    <option value="16+">16+</option>
                    <option value="18+">18+</option>
                  </select>
                </div>
                <div>
                  <label class="text-[11px] text-gray-400 block mb-1">Episódios Gratuitos</label>
                  <input type="number" id="new-series-free-eps" value="${this.api.settings().default_free_episodes}" min="0" max="50" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400" />
                </div>
              </div>

              <div class="flex items-center justify-between pt-2">
                <label class="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                  <input type="checkbox" id="new-series-featured" class="accent-amber-400" />
                  <span>Definir como Destaque Principal da Home</span>
                </label>

                <button type="submit" class="py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-lg transition-all cursor-pointer">
                  Publicar Produção no Catálogo
                </button>
              </div>
            </form>
          </div>

          <!-- Lista de Minisséries com Ações -->
          <div class="space-y-3">
            <h3 class="text-sm font-bold text-white uppercase tracking-wider">Minisséries Cadastradas (${seriesList.length})</h3>

            <div class="space-y-3">
              ${seriesList.map(s => `
                <div class="p-4 rounded-2xl bg-[#0E1322] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div class="flex items-center gap-4 min-w-0">
                    <img src="${root.dramixUI.safeUrl(s.poster_url)}" alt="" class="w-12 h-[72px] object-cover rounded-lg border border-white/10 flex-shrink-0" />
                    <div class="min-w-0 space-y-1">
                      <div class="flex items-center gap-2">
                        <h4 class="text-sm font-bold text-white truncate">${root.dramixUI.esc(s.title)}</h4>
                        ${s.is_featured ? `<span class="px-2 py-0.5 rounded bg-amber-500 text-black text-[9px] font-black uppercase">Destaque Home</span>` : ''}
                      </div>
                      <p class="text-xs text-gray-400 truncate">${root.dramixUI.esc((s.genres || []).join(', '))} • ${root.dramixUI.esc(s.content_rating)} • ${Number(s.episodes_count) || 0} eps</p>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <label class="flex items-center gap-1.5 text-[11px] text-gray-400">Grátis
                      <input type="number" min="0" max="50" value="${this.api.getFreeEpisodesCount(s)}" class="series-free-input w-14 bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-xs text-white" data-id="${s.id}" aria-label="Episódios grátis de ${root.dramixUI.esc(s.title)}" />
                    </label>
                    <button class="py-1.5 px-3 rounded-lg text-xs font-bold transition-all series-toggle-featured-btn ${s.is_featured ? 'bg-amber-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'}" data-id="${s.id}">
                      ${s.is_featured ? 'Destaque ativo' : 'Definir destaque'}
                    </button>
                    <button class="py-1.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold series-delete-btn" data-id="${s.id}">
                      Excluir
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      `;
    }

    renderEpisodesTab(seriesList) {
      const selectedSeriesId = this.selectedSeriesForEpisodes || (seriesList[0] ? seriesList[0].id : null);
      const selectedSeries = seriesList.find(s => s.id === selectedSeriesId);
      const episodes = selectedSeries ? this.api.db.table('episodes').find(e => e.series_id === selectedSeriesId).sort((a, b) => a.episode_number - b.episode_number) : [];

      return `
        <div class="space-y-6">
          
          <!-- Seletor de Minissérie -->
          <div class="p-4 rounded-2xl bg-[#0E1322] border border-white/10 flex items-center justify-between gap-4">
            <span class="text-xs text-gray-400 font-bold uppercase">Selecione a Minissérie:</span>
            <select id="owner-select-series-episodes" class="bg-black/60 border border-white/15 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-400 flex-1 max-w-md">
              ${seriesList.map(s => `
                <option value="${s.id}" ${s.id === selectedSeriesId ? 'selected' : ''}>${root.dramixUI.esc(s.title)}</option>
              `).join('')}
            </select>
          </div>

          ${selectedSeries ? `
            <!-- Formulário Adicionar Novo Episódio -->
            <div class="p-6 rounded-2xl bg-[#0E1322] border border-white/10 space-y-4">
              <h4 class="text-xs font-bold uppercase tracking-wider text-white">Adicionar novo episódio em "${root.dramixUI.esc(selectedSeries.title)}"</h4>
              
              <form id="owner-form-create-episode" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input type="text" id="new-ep-title" placeholder="Título do Episódio (ex: O Confronto)" required class="bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400" />
                <input type="text" id="new-ep-video" placeholder="URL do Vídeo MP4 Vertical" value="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" required class="bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400" />
                <input type="number" id="new-ep-duration" placeholder="Duração em segundos" value="120" required class="bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-400" />
                
                <div class="sm:col-span-3 flex justify-end">
                  <button type="submit" class="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md transition-all cursor-pointer">
                    Adicionar Episódio ${episodes.length + 1}
                  </button>
                </div>
              </form>
            </div>

            <!-- Lista de Episódios -->
            <div class="space-y-2">
              <h4 class="text-xs font-bold uppercase tracking-wider text-white">Episódios Existentes (${episodes.length})</h4>
              
              <div class="space-y-2">
                ${episodes.map(ep => `
                  <div class="p-3.5 rounded-xl bg-[#0E1322] border border-white/10 flex items-center justify-between gap-3 text-xs">
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white flex-shrink-0">${ep.episode_number}</span>
                      <div class="min-w-0">
                        <p class="font-bold text-white truncate">${root.dramixUI.esc(ep.title)}</p>
                        <span class="text-[10px] text-gray-400 font-mono">${ep.duration_seconds}s</span>
                      </div>
                    </div>

                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${ep.episode_number <= this.api.getFreeEpisodesCount(selectedSeries) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'}">
                        ${ep.episode_number <= this.api.getFreeEpisodesCount(selectedSeries) ? 'Grátis' : 'Bloqueado'}
                      </span>
                      <button class="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[11px] font-bold episode-delete-btn" data-id="${ep.id}" aria-label="Excluir episódio ${ep.episode_number}">
                        Excluir
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

        </div>
      `;
    }

    renderHomeLayoutTab(seriesList) {
      const sections = this.api.db.table('homepage_sections').all().sort((a, b) => a.order - b.order);

      return `
        <div class="space-y-6">
          <div class="p-6 rounded-3xl bg-[#0E1322] border border-white/10 space-y-4">
            <h3 class="text-base font-bold text-white">Organização das Fileiras da Página Inicial</h3>
            <p class="text-xs text-gray-400">Alterne a visibilidade e organize a ordem visual dos carrosséis que aparecem para os espectadores.</p>

            <div class="space-y-2 pt-2">
              ${sections.map((sec, idx) => `
                <div class="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-4 text-xs">
                  <div class="flex items-center gap-3">
                    <span class="w-6 h-6 rounded-full bg-white/10 text-white font-bold flex items-center justify-center">${sec.order}</span>
                    <span class="font-bold text-white">${root.dramixUI.esc(sec.title)}</span>
                  </div>

                  <div class="flex items-center gap-3">
                    <label class="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" class="toggle-home-section-cb accent-emerald-500" data-id="${sec.id}" ${sec.is_enabled ? 'checked' : ''} />
                      <span class="${sec.is_enabled ? 'text-emerald-400 font-bold' : 'text-gray-500'}">${sec.is_enabled ? 'Ativo' : 'Oculto'}</span>
                    </label>

                    <div class="flex items-center gap-1">
                      <button class="p-1 px-2 rounded bg-white/5 hover:bg-white/15 text-white disabled:opacity-30 sec-up-btn" data-id="${sec.id}" aria-label="Subir ${root.dramixUI.esc(sec.title)}" ${idx === 0 ? 'disabled' : ''}>↑</button>
                      <button class="p-1 px-2 rounded bg-white/5 hover:bg-white/15 text-white disabled:opacity-30 sec-down-btn" data-id="${sec.id}" aria-label="Descer ${root.dramixUI.esc(sec.title)}" ${idx === sections.length - 1 ? 'disabled' : ''}>↓</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    renderCoinsTab() {
      const st = this.api.settings();
      const { brl } = root.dramixUI;
      const packages = this.api.db.table('coin_packages').all().sort((a, b) => a.order - b.order);
      const field = (id, label, value, hint) => `
        <div>
          <label for="set-${id}" class="text-[11px] text-gray-400 block mb-1">${label}</label>
          <input id="set-${id}" data-key="${id}" type="number" min="0" value="${value}" class="app-setting-input w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-amber-400" />
          ${hint ? `<span class="text-[10px] text-gray-500">${hint}</span>` : ''}
        </div>`;
      return `
        <div class="space-y-6">
          <form id="owner-form-settings" class="p-6 rounded-3xl bg-[#0E1322] border border-white/10 space-y-4">
            <div>
              <h3 class="text-base font-bold text-white">Regras de moedas</h3>
              <p class="text-xs text-gray-400">Valem para novas contas e novos desbloqueios. Moedas já creditadas não mudam.</p>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              ${field('welcome_bonus_coins', 'Bônus de cadastro', st.welcome_bonus_coins, 'Uma vez por conta')}
              ${field('daily_gift_coins', 'Presente diário', st.daily_gift_coins, '1 resgate por dia')}
              ${field('episode_price_coins', 'Preço por episódio', st.episode_price_coins, 'Em moedas')}
              ${field('series_bundle_discount_percent', 'Desconto do pacote da série (%)', st.series_bundle_discount_percent, 'Máximo 90')}
              ${field('default_free_episodes', 'Episódios grátis padrão', st.default_free_episodes, 'Para novas séries')}
              ${field('rewarded_ad_cooldown_hours', 'Intervalo do anúncio (horas)', st.rewarded_ad_cooldown_hours, '1 desbloqueio por intervalo')}
            </div>
            <div class="flex justify-end">
              <button type="submit" class="py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs">Salvar regras</button>
            </div>
          </form>

          <form id="owner-form-packages" class="p-6 rounded-3xl bg-[#0E1322] border border-white/10 space-y-4">
            <div>
              <h3 class="text-base font-bold text-white">Pacotes da loja</h3>
              <p class="text-xs text-gray-400">Preço em reais, moedas base e moedas de bônus. Desmarque para esconder o pacote.</p>
            </div>
            <div class="space-y-2">
              ${packages.map(p => `
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center p-3 rounded-xl bg-black/40 border border-white/10 text-xs" data-pkg="${p.id}">
                  <span class="font-bold text-white">${p.coins + p.bonus_coins} moedas • ${brl(p.price)}</span>
                  <label class="flex items-center gap-1 text-gray-400">R$ <input type="number" step="0.01" min="0.5" value="${p.price.toFixed(2)}" data-f="price" class="w-full bg-white/10 border border-white/15 rounded-lg px-2 py-1 text-white font-mono" /></label>
                  <label class="flex items-center gap-1 text-gray-400">Base <input type="number" min="1" value="${p.coins}" data-f="coins" class="w-full bg-white/10 border border-white/15 rounded-lg px-2 py-1 text-white font-mono" /></label>
                  <label class="flex items-center gap-1 text-gray-400">Bônus <input type="number" min="0" value="${p.bonus_coins}" data-f="bonus_coins" class="w-full bg-white/10 border border-white/15 rounded-lg px-2 py-1 text-white font-mono" /></label>
                  <label class="flex items-center gap-1.5 text-gray-300"><input type="checkbox" data-f="is_active" ${p.is_active ? 'checked' : ''} class="accent-emerald-500" /> Ativo</label>
                </div>
              `).join('')}
            </div>
            <div class="flex justify-end">
              <button type="submit" class="py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs">Salvar pacotes</button>
            </div>
          </form>
        </div>
      `;
    }

    renderSupportTab(user) {
      const { esc } = root.dramixUI;
      const tickets = this.api.getSupportTickets(user.id);
      if (!tickets.length) {
        return '<div class="p-10 rounded-3xl bg-[#0E1322] border border-white/10 text-center text-xs text-gray-400">Nenhum chamado de suporte ainda.</div>';
      }
      return `
        <div class="space-y-3">
          ${tickets.map(t => `
            <div class="p-4 rounded-2xl bg-[#0E1322] border ${t.status === 'open' ? 'border-amber-400/30' : 'border-white/10 opacity-60'} space-y-2 text-xs">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="font-bold text-white">${esc(t.subject)}</span>
                <span class="text-gray-500">${new Date(t.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
              <p class="text-gray-300 whitespace-pre-line">${esc(t.message)}</p>
              <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                <a class="text-sky-300 underline" href="mailto:${esc(t.email)}?subject=${encodeURIComponent('Re: ' + t.subject)}">${esc(t.name || 'Usuário')} • ${esc(t.email)}</a>
                ${t.status === 'open' ? `<button class="ticket-close-btn px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold" data-id="${esc(t.id)}">Marcar como resolvido</button>` : '<span class="text-emerald-400 font-bold">Resolvido</span>'}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    bindEvents(container, user) {
      const toast = root.dramixUI.toast;
      const safe = (fn, okMsg) => {
        try {
          fn();
          if (okMsg) toast(okMsg, 'success');
          this.render(container);
        } catch (err) {
          toast(err.message, 'error');
        }
      };

      const formSettings = container.querySelector('#owner-form-settings');
      if (formSettings) {
        formSettings.onsubmit = (e) => {
          e.preventDefault();
          const updates = {};
          container.querySelectorAll('.app-setting-input').forEach(i => { updates[i.dataset.key] = parseInt(i.value, 10); });
          safe(() => this.api.updateAppSettings(user.id, updates), 'Regras de moedas salvas.');
        };
      }

      const formPackages = container.querySelector('#owner-form-packages');
      if (formPackages) {
        formPackages.onsubmit = (e) => {
          e.preventDefault();
          safe(() => container.querySelectorAll('[data-pkg]').forEach(row => {
            const val = (f) => row.querySelector(`[data-f="${f}"]`);
            this.api.updateCoinPackage(user.id, row.dataset.pkg, {
              price: parseFloat(val('price').value),
              coins: parseInt(val('coins').value, 10),
              bonus_coins: parseInt(val('bonus_coins').value, 10),
              is_active: val('is_active').checked
            });
          }), 'Pacotes salvos.');
        };
      }

      container.querySelectorAll('.ticket-close-btn').forEach(btn => {
        btn.onclick = () => safe(() => this.api.closeSupportTicket(user.id, btn.dataset.id), 'Chamado resolvido.');
      });

      container.querySelectorAll('.series-free-input').forEach(input => {
        input.onchange = () => safe(() => this.api.updateSeriesFreeEpisodes(user.id, input.dataset.id, input.value), 'Episódios grátis atualizados.');
      });

      const viewAsUserBtn = container.querySelector('#owner-btn-view-as-user');
      if (viewAsUserBtn) {
        viewAsUserBtn.onclick = () => {
          window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'home' } }));
        };
      }

      container.querySelectorAll('.owner-nav-tab').forEach(btn => {
        btn.onclick = () => {
          this.activeTab = btn.dataset.tab;
          this.render(container);
        };
      });

      // Salvar Preços dos Planos
      const formPlans = container.querySelector('#owner-form-plans');
      if (formPlans) {
        formPlans.onsubmit = (e) => {
          e.preventDefault();
          safe(() => container.querySelectorAll('.plan-price-input').forEach(input => {
            this.api.updateSubscriptionPlan(user.id, input.dataset.planId, { price: parseFloat(input.value) });
          }), 'Preços dos planos salvos.');
        };
      }

      // Criar Minissérie
      const formCreateSeries = container.querySelector('#owner-form-create-series');
      if (formCreateSeries) {
        formCreateSeries.onsubmit = (e) => {
          e.preventDefault();
          const title = container.querySelector('#new-series-title').value;
          const synopsis = container.querySelector('#new-series-synopsis').value;
          const poster_url = container.querySelector('#new-series-poster').value;
          const backdrop_url = container.querySelector('#new-series-backdrop').value || poster_url;
          const genresStr = container.querySelector('#new-series-genres').value;
          const genres = genresStr.split(',').map(g => g.trim()).filter(Boolean);
          const content_rating = container.querySelector('#new-series-rating').value;
          const free_episodes_count = parseInt(container.querySelector('#new-series-free-eps').value, 10);
          const is_featured = container.querySelector('#new-series-featured').checked;

          if (!/^https?:\/\//i.test(poster_url)) {
            toast('A URL da capa precisa começar com http:// ou https://', 'error');
            return;
          }

          safe(() => {
            const created = this.api.createSeries(user.id, {
              title, synopsis, poster_url, backdrop_url, genres, content_rating,
              free_episodes_count: Number.isFinite(free_episodes_count) ? free_episodes_count : undefined,
              is_featured
            });
            // Cria 8 episódios provisórios; troque os vídeos na aba Gerenciar Episódios
            for (let i = 1; i <= 8; i++) {
              this.api.createEpisode(user.id, created.id, {
                title: `Episódio ${i}`,
                duration_seconds: 120,
                video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
              });
            }
          }, `"${title}" publicada. Ela já aparece no catálogo.`);
        };
      }

      // Alternar Destaque Hero
      container.querySelectorAll('.series-toggle-featured-btn').forEach(btn => {
        btn.onclick = () => {
          safe(() => this.api.setFeaturedHero(user.id, btn.dataset.id), 'Destaque da Home atualizado.');
        };
      });

      // Excluir Minissérie
      container.querySelectorAll('.series-delete-btn').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.id;
          if (confirm('Excluir esta minissérie e todos os episódios dela? Esta ação não pode ser desfeita.')) {
            safe(() => this.api.deleteSeries(user.id, id), 'Minissérie excluída.');
          }
        };
      });

      // Select de Série na aba de episódios
      const seriesSelect = container.querySelector('#owner-select-series-episodes');
      if (seriesSelect) {
        seriesSelect.onchange = () => {
          this.selectedSeriesForEpisodes = seriesSelect.value;
          this.render(container);
        };
      }

      // Adicionar Episódio
      const formEp = container.querySelector('#owner-form-create-episode');
      if (formEp) {
        formEp.onsubmit = (e) => {
          e.preventDefault();
          const seriesId = this.selectedSeriesForEpisodes || container.querySelector('#owner-select-series-episodes').value;
          const title = container.querySelector('#new-ep-title').value;
          const video_url = container.querySelector('#new-ep-video').value;
          const duration_seconds = container.querySelector('#new-ep-duration').value;

          if (!/^https?:\/\//i.test(video_url)) {
            toast('A URL do vídeo precisa começar com http:// ou https://', 'error');
            return;
          }
          safe(() => this.api.createEpisode(user.id, seriesId, { title, video_url, duration_seconds }), 'Episódio adicionado.');
        };
      }

      // Excluir Episódio
      container.querySelectorAll('.episode-delete-btn').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.id;
          if (confirm('Excluir este episódio? Os seguintes serão renumerados.')) {
            safe(() => this.api.deleteEpisode(user.id, id), 'Episódio excluído.');
          }
        };
      });

      // Reordenação de Home
      container.querySelectorAll('.sec-up-btn').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.id;
          const list = this.api.db.table('homepage_sections').all().sort((a, b) => a.order - b.order);
          const idx = list.findIndex(s => s.id === id);
          if (idx > 0) {
            const temp = list[idx - 1];
            list[idx - 1] = list[idx];
            list[idx] = temp;
            safe(() => this.api.reorderHomeSections(user.id, list));
          }
        };
      });

      container.querySelectorAll('.sec-down-btn').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.id;
          const list = this.api.db.table('homepage_sections').all().sort((a, b) => a.order - b.order);
          const idx = list.findIndex(s => s.id === id);
          if (idx < list.length - 1) {
            const temp = list[idx + 1];
            list[idx + 1] = list[idx];
            list[idx] = temp;
            safe(() => this.api.reorderHomeSections(user.id, list));
          }
        };
      });

      container.querySelectorAll('.toggle-home-section-cb').forEach(cb => {
        cb.onchange = () => {
          const id = cb.dataset.id;
          safe(() => this.api.setHomeSectionEnabled(user.id, id, cb.checked));
        };
      });
    }
  }

  root.DramixOwnerPanelView = DramixOwnerPanelView;
})(typeof window !== 'undefined' ? window : global);
