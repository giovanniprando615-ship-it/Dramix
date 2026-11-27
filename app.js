/**
 * DRAMIX — Aplicação Principal, Roteador e Controlador Global
 * Orquestra as visualizações (Home, Descobrir, Detalhes, Planos, Perfil, Owner),
 * modais de autenticação, checkout e player vertical 9:16.
 */

(function(root) {
  'use strict';

  class DramixApp {
    constructor() {
      this.api = root.dramixAPI;
      this.player = new root.DramixPlayer(this.api);
      this.rewardedAdModal = new root.DramixRewardedAdModal(this.api);
      this.checkoutModal = new root.DramixCheckoutModal(this.api);

      // Instâncias de visualizações
      this.views = {
        home: new root.DramixHomeView(this.api),
        discover: new root.DramixDiscoverView(this.api),
        'series-details': new root.DramixSeriesDetailsView(this.api),
        subscription: new root.DramixSubscriptionView(this.api),
        profile: new root.DramixProfileView(this.api),
        owner: new root.DramixOwnerPanelView(this.api)
      };

      this.currentView = 'home';
      this.currentViewParams = {};
    }

    init() {
      // Se não houver sessão ativa, faz login com a conta de usuário padrão para conveniência
      if (!this.api.getCurrentUser()) {
        try {
          this.api.login({ email: 'usuario@dramix.tv', password: 'user123' });
        } catch (e) {}
      }

      this.renderHeader();
      this.initAuthModal();
      this.bindGlobalEvents();
      this.navigate('home');
    }

    // ==================== CABEÇALHO PROFISSIONAL VIBESHORT ====================
    renderHeader() {
      const headerEl = document.getElementById('dramix-header');
      if (!headerEl) return;

      const user = this.api.getCurrentUser();

      headerEl.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          <!-- Logo & Navegação Principal -->
          <div class="flex items-center gap-8">
            <button id="nav-brand-logo" class="flex items-center gap-2.5 cursor-pointer text-left">
              <span class="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#E52E4D] to-[#ff5b79] flex items-center justify-center font-black text-white text-base shadow-md shadow-[#E52E4D]/30">D</span>
              <span class="text-xl font-black tracking-wider text-white">DRAMIX</span>
            </button>

            <nav class="hidden md:flex items-center gap-1 text-xs font-semibold text-gray-300">
              <button class="nav-link px-3.5 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors cursor-pointer" data-view="home">Início</button>
              <button class="nav-link px-3.5 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors cursor-pointer" data-view="discover">Descobrir</button>
              <button class="nav-link px-3.5 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors cursor-pointer" data-view="subscription">Planos</button>
              ${user ? `
                <button class="nav-link px-3.5 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors cursor-pointer" data-view="profile" data-tab="favorites">Minha Lista</button>
              ` : ''}
            </nav>
          </div>

          <!-- Busca Rápida e Ações de Usuário -->
          <div class="flex items-center gap-3">
            
            <!-- Barra de Busca Rápida -->
            <div class="relative hidden sm:block w-48 lg:w-64">
              <input 
                type="text" 
                id="header-quick-search" 
                placeholder="Buscar minisséries..." 
                class="w-full bg-white/5 border border-white/10 focus:border-[#E52E4D] focus:bg-black/60 text-xs text-white placeholder-gray-500 rounded-full pl-8 pr-3 py-1.5 outline-none transition-colors"
              />
              <svg class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>

            <!-- Botão Painel Owner se for Owner -->
            ${user && user.role === 'owner' ? `
              <button id="header-btn-owner" class="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer">
                <span>👑</span>
                <span>Painel Owner</span>
              </button>
            ` : ''}

            <!-- Perfil / Login -->
            ${user ? `
              <div class="relative group">
                <button id="header-user-btn" class="flex items-center gap-2 p-1 pl-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white cursor-pointer">
                  <div class="text-right min-w-0 hidden md:block">
                    <p class="font-bold text-white text-[11px] truncate leading-tight">${user.name.split(' ')[0]}</p>
                    <span class="text-[9px] font-black uppercase ${user.isPremium ? 'text-amber-400' : 'text-gray-400'}">${user.isPremium ? 'PREMIUM' : 'FREE'}</span>
                  </div>
                  <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E52E4D] to-amber-500 flex items-center justify-center font-bold text-white text-xs">
                    ${user.name.charAt(0).toUpperCase()}
                  </div>
                </button>

                <!-- Dropdown do Usuário -->
                <div class="absolute right-0 top-full mt-2 w-48 bg-[#0E1322] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 hidden group-hover:block space-y-1">
                  <div class="px-3 py-2 border-b border-white/10">
                    <p class="text-xs font-bold text-white truncate">${user.name}</p>
                    <span class="text-[10px] text-gray-400">${user.email}</span>
                  </div>
                  <button class="dropdown-item w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-xs text-gray-300 hover:text-white" data-action="profile">
                    Meu Perfil
                  </button>
                  <button class="dropdown-item w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-xs text-gray-300 hover:text-white" data-action="subscription">
                    Planos Premium
                  </button>
                  <button class="dropdown-item w-full text-left px-3 py-2 rounded-xl hover:bg-red-500/10 text-xs text-red-400" data-action="logout">
                    Sair
                  </button>
                </div>
              </div>
            ` : `
              <button id="header-btn-login" class="py-1.5 px-4 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white text-xs font-bold transition-all shadow-md shadow-[#E52E4D]/25 cursor-pointer">
                Entrar
              </button>
            `}

          </div>

        </div>
      `;

      this.bindHeaderEvents();
    }

    bindHeaderEvents() {
      const logo = document.getElementById('nav-brand-logo');
      if (logo) logo.onclick = () => this.navigate('home');

      document.querySelectorAll('.nav-link').forEach(link => {
        link.onclick = () => {
          const view = link.dataset.view;
          const tab = link.dataset.tab;
          if (view === 'profile' && tab) {
            this.views.profile.activeTab = tab;
          }
          this.navigate(view);
        };
      });

      const ownerBtn = document.getElementById('header-btn-owner');
      if (ownerBtn) {
        ownerBtn.onclick = () => this.navigate('owner');
      }

      const loginBtn = document.getElementById('header-btn-login');
      if (loginBtn) {
        loginBtn.onclick = () => this.openAuthModal();
      }

      const quickSearch = document.getElementById('header-quick-search');
      if (quickSearch) {
        quickSearch.onkeydown = (e) => {
          if (e.key === 'Enter') {
            const q = quickSearch.value.trim();
            this.views.discover.searchQuery = q;
            this.navigate('discover');
          }
        };
      }

      document.querySelectorAll('.dropdown-item').forEach(item => {
        item.onclick = () => {
          const action = item.dataset.action;
          if (action === 'profile') this.navigate('profile');
          if (action === 'subscription') this.navigate('subscription');
          if (action === 'logout') {
            this.api.logout();
            this.renderHeader();
            this.navigate('home');
          }
        };
      });
    }

    // ==================== ROTEAMENTO E NAVEGAÇÃO ====================
    navigate(viewName, params = {}) {
      this.currentView = viewName;
      this.currentViewParams = params;

      const mainContainer = document.getElementById('dramix-main-content');
      if (!mainContainer) return;

      // Atualiza aba ativa na navbar
      document.querySelectorAll('.nav-link').forEach(link => {
        if (link.dataset.view === viewName) {
          link.classList.add('bg-white/10', 'text-white');
        } else {
          link.classList.remove('bg-white/10', 'text-white');
        }
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });

      switch (viewName) {
        case 'home':
          this.views.home.render(mainContainer);
          break;
        case 'discover':
          this.views.discover.render(mainContainer);
          break;
        case 'series-details':
          this.views['series-details'].render(mainContainer, params.seriesId);
          break;
        case 'subscription':
          this.views.subscription.render(mainContainer);
          break;
        case 'profile':
          this.views.profile.render(mainContainer);
          break;
        case 'owner':
          this.views.owner.render(mainContainer);
          break;
        default:
          this.views.home.render(mainContainer);
      }
    }

    // ==================== EVENTOS GLOBAIS DO SISTEMA ====================
    bindGlobalEvents() {
      // Navegação
      window.addEventListener('dramix-navigate-view', (e) => {
        this.navigate(e.detail.view, e.detail);
      });

      // Reprodução de Episódio
      window.addEventListener('dramix-play-episode', (e) => {
        const { series, episodeNumber, startTimestamp } = e.detail;
        this.player.open(series, episodeNumber, startTimestamp || 0);
      });

      // Interceptador de Paywall
      window.addEventListener('dramix-paywall-triggered', (e) => {
        const { series, episode } = e.detail;
        this.rewardedAdModal.showPaywall(series, episode, (unlockedSeries, unlockedEpNum) => {
          // Quando o anúncio é concluído com sucesso, inicia o episódio no player
          this.player.open(unlockedSeries, unlockedEpNum);
        });
      });

      // Abertura de Checkout de Assinatura
      window.addEventListener('dramix-open-checkout', (e) => {
        this.checkoutModal.open(e.detail.plan);
      });

      // Abertura do Modal de Login
      window.addEventListener('dramix-open-auth-modal', () => {
        this.openAuthModal();
      });

      // Atualizações de Sessão ou Assinatura
      window.addEventListener('dramix-auth-state-changed', () => {
        this.renderHeader();
      });

      window.addEventListener('dramix-subscription-updated', () => {
        this.renderHeader();
        this.navigate(this.currentView, this.currentViewParams);
      });

      window.addEventListener('dramix-player-closed', () => {
        if (this.currentView === 'home') {
          this.navigate('home');
        }
      });
    }

    // ==================== MODAL DE AUTENTICAÇÃO REAL ====================
    initAuthModal() {
      let modal = document.getElementById('dramix-auth-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dramix-auth-modal';
        modal.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md hidden flex items-center justify-center p-4 transition-all duration-300';
        modal.innerHTML = `
          <div class="relative w-full max-w-md bg-[#0E1322] border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            
            <button id="auth-modal-close" class="absolute top-4 right-4 text-gray-400 hover:text-white p-2 text-xl font-bold">&times;</button>

            <!-- Abas Login / Cadastro -->
            <div class="flex items-center gap-2 p-1 bg-black/40 rounded-xl border border-white/10">
              <button id="auth-tab-login" class="flex-1 py-2 rounded-lg text-xs font-bold transition-all bg-[#E52E4D] text-white">Entrar</button>
              <button id="auth-tab-register" class="flex-1 py-2 rounded-lg text-xs font-bold transition-all text-gray-400 hover:text-white">Criar Conta</button>
            </div>

            <!-- Formulário -->
            <form id="auth-form" class="space-y-4">
              <div id="auth-field-name" class="space-y-1 hidden">
                <label class="text-[11px] text-gray-400 block">Nome Completo</label>
                <input type="text" id="auth-input-name" placeholder="Seu nome" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E52E4D]" />
              </div>

              <div class="space-y-1">
                <label class="text-[11px] text-gray-400 block">E-mail</label>
                <input type="email" id="auth-input-email" required placeholder="seu@email.com" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E52E4D]" />
              </div>

              <div class="space-y-1">
                <label class="text-[11px] text-gray-400 block">Senha</label>
                <input type="password" id="auth-input-password" required placeholder="Sua senha" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E52E4D]" />
              </div>

              <button type="submit" id="auth-submit-btn" class="w-full py-3.5 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-black text-xs shadow-lg shadow-[#E52E4D]/30 transition-all cursor-pointer">
                Entrar no DRAMIX
              </button>
            </form>

            <!-- Atalhos de Demonstração / Testes Rápidos -->
            <div class="pt-4 border-t border-white/10 space-y-2">
              <span class="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">Acesso Rápido para Testes:</span>
              <div class="grid grid-cols-2 gap-2">
                <button id="auth-fill-owner" class="py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/20 text-left">
                  👑 Entrar como Owner
                </button>
                <button id="auth-fill-free" class="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-bold border border-white/10 text-left">
                  👤 Usuário Gratuito
                </button>
              </div>
            </div>

          </div>
        `;
        document.body.appendChild(modal);
      }

      this.bindAuthModalEvents();
    }

    bindAuthModalEvents() {
      const modal = document.getElementById('dramix-auth-modal');
      const closeBtn = document.getElementById('auth-modal-close');
      const tabLogin = document.getElementById('auth-tab-login');
      const tabRegister = document.getElementById('auth-tab-register');
      const fieldName = document.getElementById('auth-field-name');
      const submitBtn = document.getElementById('auth-submit-btn');
      const form = document.getElementById('auth-form');

      let mode = 'login'; // 'login' ou 'register'

      if (closeBtn) closeBtn.onclick = () => this.closeAuthModal();

      if (tabLogin && tabRegister) {
        tabLogin.onclick = () => {
          mode = 'login';
          tabLogin.className = 'flex-1 py-2 rounded-lg text-xs font-bold transition-all bg-[#E52E4D] text-white';
          tabRegister.className = 'flex-1 py-2 rounded-lg text-xs font-bold transition-all text-gray-400 hover:text-white';
          fieldName.classList.add('hidden');
          submitBtn.textContent = 'Entrar no DRAMIX';
        };

        tabRegister.onclick = () => {
          mode = 'register';
          tabRegister.className = 'flex-1 py-2 rounded-lg text-xs font-bold transition-all bg-[#E52E4D] text-white';
          tabLogin.className = 'flex-1 py-2 rounded-lg text-xs font-bold transition-all text-gray-400 hover:text-white';
          fieldName.classList.remove('hidden');
          submitBtn.textContent = 'Criar Nova Conta';
        };
      }

      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          const email = document.getElementById('auth-input-email').value;
          const password = document.getElementById('auth-input-password').value;
          const name = document.getElementById('auth-input-name').value;

          try {
            if (mode === 'login') {
              this.api.login({ email, password });
            } else {
              this.api.register({ name, email, password });
            }
            this.closeAuthModal();
            this.renderHeader();
            this.navigate(this.currentView, this.currentViewParams);
          } catch (err) {
            alert(err.message);
          }
        };
      }

      // Atalhos de teste
      const fillOwner = document.getElementById('auth-fill-owner');
      if (fillOwner) {
        fillOwner.onclick = () => {
          document.getElementById('auth-input-email').value = 'owner@dramix.tv';
          document.getElementById('auth-input-password').value = 'owner123';
          form.dispatchEvent(new Event('submit'));
        };
      }

      const fillFree = document.getElementById('auth-fill-free');
      if (fillFree) {
        fillFree.onclick = () => {
          document.getElementById('auth-input-email').value = 'usuario@dramix.tv';
          document.getElementById('auth-input-password').value = 'user123';
          form.dispatchEvent(new Event('submit'));
        };
      }
    }

    openAuthModal() {
      const modal = document.getElementById('dramix-auth-modal');
      if (modal) modal.classList.remove('hidden');
    }

    closeAuthModal() {
      const modal = document.getElementById('dramix-auth-modal');
      if (modal) modal.classList.add('hidden');
    }
  }

  root.DramixApp = DramixApp;

  // Inicialização no DOM
  window.addEventListener('DOMContentLoaded', () => {
    window.dramixInstance = new DramixApp();
    window.dramixInstance.init();
  });
})(typeof window !== 'undefined' ? window : global);
