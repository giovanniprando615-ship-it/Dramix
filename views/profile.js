/**
 * DRAMIX — Página de Perfil Editável & Gerenciamento de Conta
 * - Botão "Editar Perfil" com modal para trocar foto (upload ou avatar), editar nome, e-mail/celular e senha
 * - Atualização imediata no cabeçalho e menu
 * - Abas: Assinatura e Pagamentos (Status, Plano atual, botão Fazer Upgrade, Histórico de cobranças),
 *         Carteira de moedas, Minha Lista (com 3 sugestões clicáveis quando vazia) e Histórico.
 */

(function(root) {
  'use strict';

  class DramixProfileView {
    constructor(api) {
      this.api = api || root.dramixAPI;
      this.activeTab = 'subscription'; // 'subscription', 'wallet', 'favorites', 'history'
      this.avatarPresets = [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
        'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80',
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
      ];
    }

    render(container, params = {}) {
      if (params.tab) this.activeTab = params.tab;
      if (params.openEdit) this.openEditOnRender = true;
      const { esc, safeUrl, coinIcon } = root.dramixUI;
      const user = this.api.getCurrentUser();

      if (!user) {
        container.innerHTML = `
          <div class="py-24 text-center space-y-4 max-w-md mx-auto">
            <div class="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            </div>
            <h2 class="text-xl font-bold text-white">Faça login para acessar seu perfil</h2>
            <p class="text-xs text-gray-400">Sua carteira de moedas, assinatura, lista e histórico ficam salvos na sua conta.</p>
            <button id="profile-btn-auth" class="w-full py-3 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-bold text-xs shadow-lg transition-all cursor-pointer">
              Entrar ou Criar Conta
            </button>
          </div>
        `;
        const authBtn = container.querySelector('#profile-btn-auth');
        if (authBtn) authBtn.onclick = () => window.dispatchEvent(new CustomEvent('dramix-open-auth-modal'));
        return;
      }

      const activeSub = this.api.getUserSubscription(user.id);
      const favs = this.api.getFavorites(user.id);
      const cwList = this.api.getContinueWatching(user.id);
      const payments = this.api.db.table('payments').find(p => p.user_id === user.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const coinTx = this.api.getCoinTransactions(user.id);

      container.innerHTML = `
        <div class="max-w-4xl mx-auto space-y-8 pb-24 pt-2">
          
          <!-- Cabeçalho do Perfil com Avatar e Botão Editar Perfil -->
          <div class="p-6 md:p-8 rounded-3xl bg-[#0E1322] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div class="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
              <div class="relative w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-tr from-[#E52E4D] to-amber-500 p-0.5 shadow-xl flex-shrink-0">
                <img id="profile-header-avatar" src="${safeUrl(user.avatar)}" alt="" class="w-full h-full object-cover rounded-2xl" />
              </div>

              <div class="space-y-1">
                <div class="flex items-center gap-2 justify-center md:justify-start">
                  <h1 class="text-xl md:text-2xl font-black text-white" id="profile-header-name">${esc(user.name)}</h1>
                  ${user.isPremium ? `
                    <span class="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[10px] font-black uppercase tracking-wider shadow">
                      ${activeSub && activeSub.is_trial ? 'VIP 3 DIAS' : 'PREMIUM'}
                    </span>
                  ` : `
                    <span class="px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300 text-[10px] font-bold uppercase tracking-wider">
                      Plano Gratuito
                    </span>
                  `}
                </div>
                <p class="text-xs text-gray-400">${esc(user.email || user.phone || 'Conta DRAMIX')}</p>
                <button id="profile-btn-wallet-chip" class="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-200 text-xs font-bold">${coinIcon('w-3.5 h-3.5')} ${user.coins} moedas</button>
              </div>
            </div>

            <!-- Botões de Ação do Cabeçalho -->
            <div class="flex flex-wrap items-center justify-center gap-2">
              <button id="profile-btn-settings" class="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold">Configurações</button>
              <button id="profile-btn-edit-modal" class="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                Editar Perfil
              </button>

              <button id="profile-btn-logout" class="py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors cursor-pointer">
                Sair
              </button>
            </div>
          </div>

          <!-- Abas de Navegação -->
          <div class="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
            <button class="profile-tab-btn flex-shrink-0 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.activeTab === 'subscription' ? 'bg-[#E52E4D] text-white shadow-lg shadow-[#E52E4D]/30' : 'bg-transparent text-gray-400 hover:text-white'}" data-tab="subscription">
              Assinatura e Pagamentos
            </button>
            <button class="profile-tab-btn flex-shrink-0 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.activeTab === 'wallet' ? 'bg-[#E52E4D] text-white shadow-lg shadow-[#E52E4D]/30' : 'bg-transparent text-gray-400 hover:text-white'}" data-tab="wallet">
              Carteira (${user.coins})
            </button>
            <button class="profile-tab-btn flex-shrink-0 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.activeTab === 'favorites' ? 'bg-[#E52E4D] text-white shadow-lg shadow-[#E52E4D]/30' : 'bg-transparent text-gray-400 hover:text-white'}" data-tab="favorites">
              Minha Lista (${favs.length})
            </button>
            <button class="profile-tab-btn flex-shrink-0 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${this.activeTab === 'history' ? 'bg-[#E52E4D] text-white shadow-lg shadow-[#E52E4D]/30' : 'bg-transparent text-gray-400 hover:text-white'}" data-tab="history">
              Histórico (${cwList.length})
            </button>
          </div>

          <!-- Conteúdo da Aba Ativa -->
          <div id="profile-tab-content">
            ${this.activeTab === 'subscription' ? this.renderSubscriptionTab(activeSub, payments) : ''}
            ${this.activeTab === 'wallet' ? this.renderWalletTab(user, coinTx) : ''}
            ${this.activeTab === 'favorites' ? this.renderFavoritesTab(favs, user.id) : ''}
            ${this.activeTab === 'history' ? this.renderHistoryTab(cwList) : ''}
          </div>

          <!-- MODAL DE EDIÇÃO DE PERFIL -->
          <div id="modal-edit-profile" class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md hidden flex items-center justify-center p-4">
            <div class="relative w-full max-w-lg bg-[#0E1322] border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              
              <div class="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 class="text-base font-bold text-white">Editar Perfil</h3>
                <button id="modal-edit-profile-close" class="text-gray-400 hover:text-white text-xl font-bold">&times;</button>
              </div>

              <!-- Escolha de Foto: Upload ou Presets -->
              <div class="space-y-3">
                <label class="text-xs font-bold text-gray-300 block uppercase tracking-wider">Foto de Perfil</label>
                
                <div class="flex items-center gap-4">
                  <div class="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#E52E4D] bg-black flex-shrink-0">
                    <img id="edit-avatar-preview" src="${safeUrl(user.avatar)}" alt="Prévia da foto" class="w-full h-full object-cover" />
                  </div>
                  <div class="space-y-1.5 flex-1">
                    <label class="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 cursor-pointer inline-block">
                      Fazer Upload de Imagem
                      <input type="file" id="edit-avatar-file-input" accept="image/*" class="hidden" />
                    </label>
                    <p class="text-[10px] text-gray-400">PNG, JPG ou WEBP (Max 2MB)</p>
                  </div>
                </div>

                <!-- Presets Rápidos de Avatares -->
                <div class="space-y-1.5 pt-2">
                  <span class="text-[11px] text-gray-400 block font-semibold">Ou escolha um avatar:</span>
                  <div class="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    ${this.avatarPresets.map((av, idx) => `
                      <button type="button" class="preset-avatar-btn w-10 h-10 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${av === user.avatar ? 'border-[#E52E4D] scale-105' : 'border-transparent opacity-70 hover:opacity-100'}" data-avatar="${av}" aria-label="Avatar ${idx + 1}">
                        <img src="${av}" alt="" class="w-full h-full object-cover" />
                      </button>
                    `).join('')}
                  </div>
                </div>
              </div>

              <!-- Campos de Texto -->
              <form id="edit-profile-form" class="space-y-4 pt-2">
                <div class="space-y-1">
                  <label class="text-[11px] text-gray-400 block font-medium">Nome Completo</label>
                  <input type="text" id="edit-name-input" value="${esc(user.name)}" required class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E52E4D]" />
                </div>

                <div class="space-y-1">
                  <label class="text-[11px] text-gray-400 block font-medium">E-mail ou Celular</label>
                  <input type="text" id="edit-ident-input" value="${esc(user.email || user.phone)}" required class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E52E4D]" />
                </div>

                <div class="space-y-1 pt-2 border-t border-white/10">
                  <label class="text-[11px] text-gray-400 block font-medium">Trocar Senha (opcional)</label>
                  <input type="password" id="edit-password-input" placeholder="Nova senha (deixe em branco para manter)" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E52E4D]" />
                </div>

                <div class="pt-4 flex items-center justify-end gap-3">
                  <button type="button" id="modal-edit-cancel-btn" class="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold">
                    Cancelar
                  </button>
                  <button type="submit" class="py-2.5 px-6 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white text-xs font-bold shadow-lg shadow-[#E52E4D]/30 transition-all cursor-pointer">
                    Salvar Alterações
                  </button>
                </div>
              </form>

            </div>
          </div>

        </div>
      `;

      this.bindEvents(container);
    }

    renderSubscriptionTab(activeSub, payments) {
      return `
        <div class="space-y-6">
          
          <!-- Card de Assinatura Ativa -->
          <div class="p-6 rounded-3xl bg-[#0E1322] border border-white/10 space-y-4 shadow-xl">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold uppercase tracking-wider text-white">Status da Assinatura</h3>
              <button id="profile-btn-upgrade-top" class="py-1.5 px-3.5 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white text-xs font-bold shadow-md shadow-[#E52E4D]/30 transition-all cursor-pointer">
                Fazer Upgrade
              </button>
            </div>

            ${activeSub ? `
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="text-base font-bold text-white">${root.dramixUI.esc(activeSub.plan_name)}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${activeSub.auto_renew ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'}">
                      ${activeSub.is_trial ? 'Período de Degustação' : activeSub.auto_renew ? 'Renovação Ativa' : 'Cancelamento Agendado'}
                    </span>
                  </div>
                  <p class="text-xs text-gray-400">
                    Válido até: <b class="text-white">${new Date(activeSub.end_date).toLocaleDateString('pt-BR')} às ${new Date(activeSub.end_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</b>
                  </p>
                </div>

                <div class="flex items-center gap-2">
                  <button id="profile-btn-change-plan" class="py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer">
                    Trocar Plano
                  </button>

                  ${activeSub.auto_renew && !activeSub.is_trial ? `
                    <button id="profile-btn-cancel-sub" class="py-2 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 transition-all cursor-pointer">
                      Cancelar Renovação
                    </button>
                  ` : ''}
                </div>
              </div>
            ` : `
              <div class="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="space-y-1">
                  <h4 class="text-sm font-bold text-white">Você está utilizando o Plano Gratuito</h4>
                  <p class="text-xs text-gray-400">Desbloqueie todo o acervo sem travas assinando o DRAMIX Premium ou testando 3 dias grátis.</p>
                </div>
                <div class="flex items-center gap-2">
                  <button id="profile-btn-test-trial" class="py-2.5 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black transition-all cursor-pointer">
                    Testar 3 dias grátis
                  </button>
                  <button id="profile-btn-upgrade" class="py-2.5 px-5 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white text-xs font-bold shadow-lg shadow-[#E52E4D]/30 transition-all cursor-pointer">
                    Fazer Upgrade
                  </button>
                </div>
              </div>
            `}
          </div>

          <!-- Histórico de Transações de Pagamento -->
          <div class="p-6 rounded-3xl bg-[#0E1322] border border-white/10 space-y-4 shadow-xl">
            <h3 class="text-sm font-bold uppercase tracking-wider text-white">Histórico de Cobranças</h3>

            ${payments.length === 0 ? `
              <p class="text-xs text-gray-400">Nenhum pagamento registrado nesta conta.</p>
            ` : `
              <div class="space-y-2">
                ${payments.map(p => `
                  <div class="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <p class="font-bold text-white">${p.kind === 'coins' ? `${Number(p.coins_total)} moedas` : 'Assinatura Premium'} • ${p.method === 'pix' ? 'PIX' : 'Cartão de crédito'}</p>
                      <span class="text-[10px] text-gray-400 font-mono">${new Date(p.created_at).toLocaleDateString('pt-BR')} • ${root.dramixUI.esc(p.id)}</span>
                    </div>

                    <div class="text-right">
                      <p class="font-black text-white">${root.dramixUI.brl(p.amount)}</p>
                      <span class="text-[10px] font-bold ${p.status === 'paid' ? 'text-emerald-400' : 'text-amber-400'} uppercase">
                        ${p.status === 'paid' ? 'Confirmado' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

        </div>
      `;
    }

    renderWalletTab(user, coinTx) {
      const { esc, coinIcon } = root.dramixUI;
      const gift = this.api.getDailyGiftStatus(user.id);
      return `
        <div class="space-y-6">
          <div class="p-6 rounded-3xl bg-gradient-to-br from-[#1A150A] to-[#0E1322] border border-amber-400/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              ${coinIcon('w-10 h-10')}
              <div>
                <span class="text-3xl font-black text-white">${user.coins}</span>
                <span class="text-xs text-gray-400 block">moedas disponíveis</span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              ${gift.available ? `<button id="profile-btn-gift" class="py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black">Resgatar ${gift.amount} moedas</button>` : ''}
              <button id="profile-btn-store" class="py-2.5 px-4 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white text-xs font-bold">Comprar moedas</button>
            </div>
          </div>
          <div class="p-6 rounded-3xl bg-[#0E1322] border border-white/10 space-y-3">
            <h3 class="text-sm font-bold text-white">Extrato</h3>
            ${coinTx.length === 0 ? '<p class="text-xs text-gray-400">Nenhuma movimentação ainda.</p>' : `
              <ul class="divide-y divide-white/5">
                ${coinTx.slice(0, 30).map(t => `
                  <li class="py-3 flex items-center justify-between gap-3 text-xs">
                    <div class="min-w-0">
                      <p class="font-semibold text-white truncate">${esc(t.description)}</p>
                      <span class="text-[11px] text-gray-500">${new Date(t.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                    <span class="font-black ${t.amount >= 0 ? 'text-emerald-400' : 'text-white'}">${t.amount >= 0 ? '+' : ''}${t.amount}</span>
                  </li>
                `).join('')}
              </ul>
            `}
          </div>
        </div>
      `;
    }

    renderFavoritesTab(favs, userId) {
      const { esc, safeUrl, freeLabel } = root.dramixUI;
      if (favs.length === 0) {
        const suggestions = this.api.getSuggestionsForEmptyList(3, userId);

        return `
          <div class="space-y-6">
            <div class="py-12 text-center space-y-2 bg-[#0E1322] rounded-3xl border border-white/10 p-6">
              <div class="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
              </div>
              <p class="text-sm font-bold text-white">Sua lista está vazia</p>
              <p class="text-xs text-gray-400 max-w-md mx-auto">Você ainda não adicionou nenhuma minissérie. Que tal começar com uma das mais recomendadas abaixo?</p>
            </div>

            <!-- 3 SUGESTÕES CLICÁVEIS QUANDO A LISTA ESTÁ VAZIA -->
            <div class="space-y-3">
              <h4 class="text-xs font-bold uppercase tracking-wider text-gray-400">Minisséries Recomendadas para Você:</h4>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                ${suggestions.map(s => `
                  <div class="p-3 rounded-2xl bg-[#0E1322] border border-white/10 hover:border-[#E52E4D] space-y-2 group cursor-pointer fav-card transition-all" data-id="${s.id}">
                    <div class="relative aspect-[9/16] rounded-xl overflow-hidden bg-black shadow-lg">
                      <img src="${safeUrl(s.poster_url)}" alt="" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-emerald-400 text-[9px] font-bold">
                        ${freeLabel(s)}
                      </div>
                    </div>
                    <div>
                      <h4 class="text-xs font-bold text-white group-hover:text-[#E52E4D] truncate">${esc(s.title)}</h4>
                      <p class="text-[10px] text-gray-400 truncate">${esc((s.genres || []).join(', '))}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      }

      return `
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          ${favs.map(s => `
            <div class="space-y-1.5 group cursor-pointer fav-card" data-id="${s.id}">
              <div class="relative aspect-[9/16] rounded-xl overflow-hidden bg-black border border-white/10 group-hover:border-[#E52E4D] shadow-lg transition-all group-hover:scale-[1.03]">
                <img src="${safeUrl(s.poster_url)}" alt="" class="w-full h-full object-cover" />
                <div class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-emerald-400 text-[9px] font-bold">
                  ${freeLabel(s)}
                </div>
              </div>
              <div>
                <h4 class="text-xs font-bold text-white group-hover:text-[#E52E4D] truncate">${esc(s.title)}</h4>
                <p class="text-[10px] text-gray-400 truncate">${esc((s.genres || []).join(', '))}</p>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    renderHistoryTab(cwList) {
      const { esc, safeUrl } = root.dramixUI;
      if (cwList.length === 0) {
        return `
          <div class="py-16 text-center space-y-2 bg-[#0E1322] rounded-3xl border border-white/10 p-6">
            <p class="text-sm font-bold text-white">Nenhum histórico recente</p>
            <p class="text-xs text-gray-400">Assista a qualquer episódio e ele aparece aqui para você continuar de onde parou.</p>
          </div>
        `;
      }

      return `
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          ${cwList.map(item => `
            <div class="space-y-1.5 group cursor-pointer history-card" data-id="${item.series.id}" data-ep="${item.episode.episode_number}" data-progress="${item.progressSeconds}">
              <div class="relative aspect-[9/16] rounded-xl overflow-hidden bg-black border border-white/10 group-hover:border-[#E52E4D] shadow-lg transition-all group-hover:scale-[1.03]">
                <img src="${safeUrl(item.series.poster_url)}" alt="" class="w-full h-full object-cover" />
                <div class="absolute bottom-0 inset-x-0 h-1.5 bg-white/20">
                  <div class="h-full bg-[#E52E4D]" style="width: ${item.progressPercent}%"></div>
                </div>
              </div>
              <div>
                <h4 class="text-xs font-bold text-white group-hover:text-[#E52E4D] truncate">${esc(item.series.title)}</h4>
                <p class="text-[10px] text-gray-400">Episódio ${item.episode.episode_number} • ${item.progressPercent}% assistido</p>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    bindEvents(container) {
      const user = this.api.getCurrentUser();

      // Logout
      const logoutBtn = container.querySelector('#profile-btn-logout');
      if (logoutBtn) {
        logoutBtn.onclick = () => {
          this.api.logout();
          window.dispatchEvent(new CustomEvent('dramix-auth-state-changed'));
          window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'home' } }));
        };
      }

      // Abas
      container.querySelectorAll('.profile-tab-btn').forEach(btn => {
        btn.onclick = () => {
          this.activeTab = btn.dataset.tab;
          this.render(container);
        };
      });

      // Botoes de Upgrade
      const upgradeBtns = container.querySelectorAll('#profile-btn-upgrade, #profile-btn-upgrade-top, #profile-btn-change-plan');
      upgradeBtns.forEach(b => {
        b.onclick = () => window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'subscription' } }));
      });

      // Testar 3 Dias Grátis
      const trialBtn = container.querySelector('#profile-btn-test-trial');
      if (trialBtn) {
        trialBtn.onclick = () => {
          try {
            const res = this.api.activateFreeTrial(user.id);
            root.dramixUI.toast(res.message, 'success');
            window.dispatchEvent(new CustomEvent('dramix-subscription-updated'));
            this.render(container);
          } catch (err) {
            root.dramixUI.toast(err.message, 'error');
          }
        };
      }

      // Cancelar renovação
      const cancelSubBtn = container.querySelector('#profile-btn-cancel-sub');
      if (cancelSubBtn) {
        cancelSubBtn.onclick = () => {
          if (confirm('Tem certeza que deseja cancelar a renovação automática da sua assinatura? Seu acesso continuará ativo até o final do período pago.')) {
            this.api.cancelSubscription(user.id);
            root.dramixUI.toast('Renovação automática desativada. Seu acesso continua até o fim do período pago.', 'success');
            this.render(container);
          }
        };
      }

      // Cliques nos cards
      container.querySelectorAll('.fav-card').forEach(card => {
        card.onclick = () => {
          window.dispatchEvent(new CustomEvent('dramix-navigate-view', {
            detail: { view: 'series-details', seriesId: card.dataset.id }
          }));
        };
      });

      container.querySelectorAll('.history-card').forEach(card => {
        card.onclick = () => {
          const series = this.api.db.table('series').findById(card.dataset.id);
          const ep = parseInt(card.dataset.ep, 10);
          const prog = parseFloat(card.dataset.progress);
          if (series) {
            window.dispatchEvent(new CustomEvent('dramix-play-episode', {
              detail: { series, episodeNumber: ep, startTimestamp: prog }
            }));
          }
        };
      });

      // MODAL EDITAR PERFIL
      const editModal = container.querySelector('#modal-edit-profile');
      const openEditBtn = container.querySelector('#profile-btn-edit-modal');
      const closeEditBtn = container.querySelector('#modal-edit-profile-close');
      const cancelEditBtn = container.querySelector('#modal-edit-cancel-btn');
      const editForm = container.querySelector('#edit-profile-form');
      const previewImg = container.querySelector('#edit-avatar-preview');
      const fileInput = container.querySelector('#edit-avatar-file-input');

      let selectedAvatar = user.avatar;

      if (openEditBtn && editModal) {
        openEditBtn.onclick = () => editModal.classList.remove('hidden');
      }
      if (closeEditBtn && editModal) {
        closeEditBtn.onclick = () => editModal.classList.add('hidden');
      }
      if (cancelEditBtn && editModal) {
        cancelEditBtn.onclick = () => editModal.classList.add('hidden');
      }

      // Presets de Avatar
      container.querySelectorAll('.preset-avatar-btn').forEach(btn => {
        btn.onclick = () => {
          selectedAvatar = btn.dataset.avatar;
          if (previewImg) previewImg.src = selectedAvatar;
          container.querySelectorAll('.preset-avatar-btn').forEach(b => {
            b.classList.remove('border-[#E52E4D]', 'scale-105');
            b.classList.add('border-transparent', 'opacity-70');
          });
          btn.classList.add('border-[#E52E4D]', 'scale-105');
          btn.classList.remove('border-transparent', 'opacity-70');
        };
      });

      // Upload de Imagem de Perfil com FileReader
      if (fileInput) {
        fileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (file && file.size > 2 * 1024 * 1024) {
            root.dramixUI.toast('A imagem precisa ter no máximo 2 MB.', 'error');
            fileInput.value = '';
            return;
          }
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              selectedAvatar = event.target.result;
              if (previewImg) previewImg.src = selectedAvatar;
            };
            reader.readAsDataURL(file);
          }
        };
      }

      // Submissão do Formulário de Edição
      if (editForm) {
        editForm.onsubmit = (e) => {
          e.preventDefault();
          const name = container.querySelector('#edit-name-input').value;
          const emailOrPhone = container.querySelector('#edit-ident-input').value;
          const newPassword = container.querySelector('#edit-password-input').value;

          try {
            this.api.updateUserProfile(user.id, {
              name,
              emailOrPhone,
              photo: selectedAvatar,
              newPassword
            });

            // Atualiza sessão e notifica cabeçalho e menu na hora
            window.dispatchEvent(new CustomEvent('dramix-auth-state-changed'));
            root.dramixUI.toast('Perfil atualizado.', 'success');
            if (editModal) editModal.classList.add('hidden');
            this.render(container);
          } catch (err) {
            root.dramixUI.toast(err.message, 'error');
          }
        };
      }

      // Carteira, loja e configurações
      const goStore = () => window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'store' } }));
      ['#profile-btn-store', '#profile-btn-wallet-chip'].forEach(sel => {
        const b = container.querySelector(sel);
        if (b) b.onclick = goStore;
      });
      const settingsBtn = container.querySelector('#profile-btn-settings');
      if (settingsBtn) settingsBtn.onclick = () => window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'settings' } }));
      const giftBtn = container.querySelector('#profile-btn-gift');
      if (giftBtn) {
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

      if (this.openEditOnRender && editModal) {
        this.openEditOnRender = false;
        editModal.classList.remove('hidden');
      }
    }
  }

  root.DramixProfileView = DramixProfileView;
})(typeof window !== 'undefined' ? window : global);
