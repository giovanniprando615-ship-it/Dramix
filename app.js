/**
 * DRAMIX — Aplicação Principal, Roteador e Controlador Global
 * - Rotas com endereço próprio (#/series/ser-01, #/store, #/settings/terms...) e botão voltar do navegador
 * - Cabeçalho com saldo de moedas (0 para visitantes), menu do usuário e busca
 * - Barra de navegação inferior no celular
 * - Login, cadastro (com bônus de boas-vindas), recuperação de senha e onboarding
 * - Logout limpa sessão, player, modais e estado das telas
 */

(function(root) {
  'use strict';

  const VIEW_ROUTES = {
    home: '',
    discover: 'discover',
    'series-details': 'series',
    subscription: 'plans',
    store: 'store',
    profile: 'profile',
    settings: 'settings',
    owner: 'owner'
  };
  const ROUTE_VIEWS = Object.fromEntries(Object.entries(VIEW_ROUTES).map(([v, r]) => [r, v]));

  const ICONS = {
    home: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
    discover: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>',
    store: '<circle cx="12" cy="12" r="8.5" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M12 7.5v9M9.5 9.5h3.8a1.6 1.6 0 010 3.2h-2.6a1.6 1.6 0 000 3.2h3.8"/>',
    favorites: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>',
    profile: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>'
  };

  class DramixApp {
    constructor() {
      this.api = root.dramixAPI;
      this.player = new root.DramixPlayer(this.api);
      this.rewardedAdModal = new root.DramixRewardedAdModal(this.api);
      this.checkoutModal = new root.DramixCheckoutModal(this.api);
      this.onboarding = new root.DramixOnboardingModal(this.api);

      this.views = {
        home: new root.DramixHomeView(this.api),
        discover: new root.DramixDiscoverView(this.api),
        'series-details': new root.DramixSeriesDetailsView(this.api),
        subscription: new root.DramixSubscriptionView(this.api),
        store: new root.DramixStoreView(this.api),
        profile: new root.DramixProfileView(this.api),
        settings: new root.DramixSettingsView(this.api),
        owner: new root.DramixOwnerPanelView(this.api)
      };

      this.currentView = 'home';
      this.currentViewParams = {};
      this.pendingParams = {};
    }

    init() {
      // Sem login automático: quem abre o app entra como visitante (0 moedas).
      this.renderHeader();
      this.renderBottomNav();
      this.initAuthModal();
      this.bindGlobalEvents();
      window.addEventListener('hashchange', () => this.renderFromHash());
      this.renderFromHash();

      const user = this.api.getCurrentUser();
      if (user && !user.onboarded && user.role !== 'owner') this.onboarding.open(() => this.refresh());
    }

    // ==================== ROTEAMENTO ====================
    buildHash(view, params = {}) {
      const route = VIEW_ROUTES[view] !== undefined ? VIEW_ROUTES[view] : '';
      const parts = [route];
      if (view === 'series-details' && params.seriesId) parts.push(encodeURIComponent(params.seriesId));
      if (view === 'settings' && params.page && params.page !== 'index') parts.push(encodeURIComponent(params.page));
      if (view === 'profile' && params.tab) parts.push(encodeURIComponent(params.tab));
      let hash = '#/' + parts.filter((p, i) => p || i === 0).join('/');
      if (view === 'discover' && (params.search || params.genre)) {
        const q = new URLSearchParams();
        if (params.search) q.set('q', params.search);
        if (params.genre) q.set('genre', params.genre);
        hash += '?' + q.toString();
      }
      return hash.replace(/\/$/, '') || '#/';
    }

    parseHash() {
      const raw = (location.hash || '#/').slice(1);
      const [path, query] = raw.split('?');
      const segs = path.split('/').filter(Boolean).map(decodeURIComponent);
      const view = ROUTE_VIEWS[segs[0] || ''] || 'home';
      const params = {};
      if (view === 'series-details') params.seriesId = segs[1];
      if (view === 'settings') params.page = segs[1] || 'index';
      if (view === 'profile' && segs[1]) params.tab = segs[1];
      if (view === 'discover' && query) {
        const q = new URLSearchParams(query);
        if (q.has('q')) params.search = q.get('q');
        if (q.has('genre')) params.genre = q.get('genre');
      }
      return { view, params };
    }

    navigate(viewName, params = {}) {
      const { view, ...rest } = params;
      const target = this.buildHash(viewName, rest);
      this.pendingParams = rest; // parâmetros que não cabem na URL (ex.: returnTo, openEdit)
      if (location.hash === target || (target === '#/' && !location.hash)) {
        this.renderFromHash();
      } else {
        location.hash = target;
      }
    }

    renderFromHash() {
      const { view, params } = this.parseHash();
      const merged = { ...params, ...this.pendingParams };
      this.pendingParams = {};
      this.renderView(view, merged);
    }

    renderView(viewName, params = {}) {
      const mainContainer = document.getElementById('dramix-main-content');
      if (!mainContainer) return;
      const changed = viewName !== this.currentView || params.seriesId !== this.currentViewParams.seriesId || params.page !== this.currentViewParams.page;
      this.currentView = viewName;
      this.currentViewParams = params;

      if (viewName === 'series-details') this.views[viewName].render(mainContainer, params.seriesId);
      else if (this.views[viewName]) this.views[viewName].render(mainContainer, params);
      else this.views.home.render(mainContainer, params);

      this.updateActiveNav();
      if (changed) {
        window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
        const titles = { home: 'Início', discover: 'Descobrir', subscription: 'Planos', store: 'Loja de moedas', profile: 'Perfil', settings: 'Configurações', owner: 'Painel Owner' };
        document.title = viewName === 'series-details'
          ? `${(this.api.db.table('series').findById(params.seriesId) || {}).title || 'Minissérie'} — DRAMIX`
          : `${titles[viewName] || 'Início'} — DRAMIX`;
      }
    }

    refresh() {
      this.renderHeader();
      this.renderBottomNav();
      this.renderView(this.currentView, this.currentViewParams);
    }

    updateActiveNav() {
      const isFavs = this.currentView === 'profile' && this.currentViewParams.tab === 'favorites';
      document.querySelectorAll('[data-nav]').forEach(link => {
        const key = link.dataset.nav;
        const active = key === 'favorites' ? isFavs : key === this.currentView && !(key === 'profile' && isFavs);
        link.classList.toggle('dx-active', active);
        if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
      });
    }

    // ==================== CABEÇALHO ====================
    renderHeader() {
      const headerEl = document.getElementById('dramix-header');
      if (!headerEl) return;
      const { esc, safeUrl, coinIcon } = root.dramixUI;
      const user = this.api.getCurrentUser();
      const gift = user ? this.api.getDailyGiftStatus(user.id) : null;
      const coins = user ? user.coins : 0;

      headerEl.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div class="flex items-center gap-8 min-w-0">
            <a href="#/" class="flex items-center gap-2.5 flex-shrink-0" aria-label="DRAMIX, página inicial">
              <span class="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#E52E4D] to-[#ff5b79] flex items-center justify-center font-black text-white text-base shadow-md shadow-[#E52E4D]/30">D</span>
              <span class="text-xl font-black tracking-wider text-white">DRAMIX</span>
            </a>
            <nav class="hidden md:flex items-center gap-1 text-xs font-semibold text-gray-300" aria-label="Principal">
              <a href="#/" data-nav="home" class="dx-nav px-3.5 py-2 rounded-xl hover:text-white hover:bg-white/5">Início</a>
              <a href="#/discover" data-nav="discover" class="dx-nav px-3.5 py-2 rounded-xl hover:text-white hover:bg-white/5">Descobrir</a>
              <a href="#/store" data-nav="store" class="dx-nav px-3.5 py-2 rounded-xl hover:text-white hover:bg-white/5">Loja</a>
              <a href="#/plans" data-nav="subscription" class="dx-nav px-3.5 py-2 rounded-xl hover:text-white hover:bg-white/5">Planos</a>
              ${user ? '<a href="#/profile/favorites" data-nav="favorites" class="dx-nav px-3.5 py-2 rounded-xl hover:text-white hover:bg-white/5">Minha Lista</a>' : ''}
            </nav>
          </div>

          <div class="flex items-center gap-2 sm:gap-3">
            <form id="header-search-form" class="relative hidden sm:block w-40 lg:w-60" role="search">
              <label for="header-quick-search" class="sr-only">Buscar minisséries</label>
              <input type="search" id="header-quick-search" placeholder="Buscar minisséries" class="w-full bg-white/5 border border-white/10 focus:border-[#E52E4D] focus:bg-black/60 text-xs text-white placeholder-gray-500 rounded-full pl-8 pr-3 py-1.5 outline-none" />
              <svg class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">${ICONS.discover}</svg>
            </form>
            <a href="#/discover" class="sm:hidden w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300" aria-label="Buscar">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">${ICONS.discover}</svg>
            </a>

            <button id="header-coins" class="relative flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-xs font-black text-white" aria-label="${coins} moedas. Abrir loja${gift && gift.available ? '. Presente diário disponível' : ''}">
              ${coinIcon('w-4 h-4')}
              <span data-coin-balance>${coins}</span>
              ${gift && gift.available ? '<span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#E52E4D] ring-2 ring-[#060810]" aria-hidden="true"></span>' : ''}
            </button>

            ${user && user.role === 'owner' ? `
              <a href="#/owner" data-nav="owner" class="dx-nav hidden sm:inline-flex py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold">Painel Owner</a>
            ` : ''}

            ${user ? `
              <div class="relative">
                <button id="header-user-btn" class="flex items-center gap-2 p-1 md:pl-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white" aria-haspopup="menu" aria-expanded="false" aria-controls="header-user-menu">
                  <span class="text-right min-w-0 hidden md:block">
                    <span class="block font-bold text-white text-[11px] truncate leading-tight max-w-[90px]">${esc(user.name.split(' ')[0])}</span>
                    <span class="block text-[9px] font-black ${user.isPremium ? 'text-amber-400' : 'text-gray-400'}">${user.isPremium ? 'PREMIUM' : 'GRÁTIS'}</span>
                  </span>
                  <img src="${safeUrl(user.avatar)}" alt="" class="w-7 h-7 rounded-full object-cover bg-gradient-to-tr from-[#E52E4D] to-amber-500" />
                </button>
                <div id="header-user-menu" role="menu" class="absolute right-0 top-full mt-2 w-56 bg-[#0E1322] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 hidden space-y-0.5">
                  <div class="px-3 py-2 border-b border-white/10 mb-1">
                    <p class="text-xs font-bold text-white truncate">${esc(user.name)}</p>
                    <span class="text-[10px] text-gray-400 truncate block">${esc(user.email || user.phone)}</span>
                  </div>
                  <a role="menuitem" href="#/profile" class="block px-3 py-2 rounded-xl hover:bg-white/5 text-xs text-gray-300 hover:text-white">Meu perfil</a>
                  <a role="menuitem" href="#/store" class="block px-3 py-2 rounded-xl hover:bg-white/5 text-xs text-gray-300 hover:text-white">Carteira e loja</a>
                  <a role="menuitem" href="#/plans" class="block px-3 py-2 rounded-xl hover:bg-white/5 text-xs text-gray-300 hover:text-white">Planos Premium</a>
                  <a role="menuitem" href="#/settings" class="block px-3 py-2 rounded-xl hover:bg-white/5 text-xs text-gray-300 hover:text-white">Configurações</a>
                  ${user.role === 'owner' ? '<a role="menuitem" href="#/owner" class="sm:hidden block px-3 py-2 rounded-xl hover:bg-white/5 text-xs text-amber-300">Painel Owner</a>' : ''}
                  <button role="menuitem" id="header-logout" class="w-full text-left px-3 py-2 rounded-xl hover:bg-red-500/10 text-xs text-red-400">Sair da conta</button>
                </div>
              </div>
            ` : `
              <button id="header-btn-login" class="py-1.5 px-4 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white text-xs font-bold shadow-md shadow-[#E52E4D]/25">Entrar</button>
            `}
          </div>
        </div>
      `;

      this.bindHeaderEvents();
      this.updateActiveNav();
    }

    bindHeaderEvents() {
      const loginBtn = document.getElementById('header-btn-login');
      if (loginBtn) loginBtn.onclick = () => this.openAuthModal('login');

      document.getElementById('header-coins').onclick = () => {
        if (this.api.getCurrentUser()) this.navigate('store');
        else this.openAuthModal('register');
      };

      const form = document.getElementById('header-search-form');
      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          const q = document.getElementById('header-quick-search').value.trim();
          this.navigate('discover', { search: q });
        };
      }

      const userBtn = document.getElementById('header-user-btn');
      const menu = document.getElementById('header-user-menu');
      if (userBtn && menu) {
        const setOpen = (open) => {
          menu.classList.toggle('hidden', !open);
          userBtn.setAttribute('aria-expanded', String(open));
        };
        userBtn.onclick = (e) => {
          e.stopPropagation();
          setOpen(menu.classList.contains('hidden'));
        };
        menu.onclick = () => setOpen(false);
        menu.onkeydown = (e) => { if (e.key === 'Escape') { setOpen(false); userBtn.focus(); } };
        if (!this.menuOutsideBound) {
          this.menuOutsideBound = true;
          document.addEventListener('click', () => {
            const m = document.getElementById('header-user-menu');
            const b = document.getElementById('header-user-btn');
            if (m && !m.classList.contains('hidden')) { m.classList.add('hidden'); if (b) b.setAttribute('aria-expanded', 'false'); }
          });
        }
      }

      const logout = document.getElementById('header-logout');
      if (logout) logout.onclick = () => this.logout();
    }

    // ==================== NAVEGAÇÃO INFERIOR (CELULAR) ====================
    renderBottomNav() {
      let nav = document.getElementById('dramix-bottom-nav');
      if (!nav) {
        nav = document.createElement('nav');
        nav.id = 'dramix-bottom-nav';
        nav.setAttribute('aria-label', 'Navegação');
        nav.className = 'md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#060810]/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]';
        document.body.appendChild(nav);
      }
      const user = this.api.getCurrentUser();
      const item = (href, key, label) => `
        <a href="${href}" data-nav="${key}" class="dx-tab flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold text-gray-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">${ICONS[key]}</svg>
          ${label}
        </a>`;
      nav.innerHTML = `
        <div class="flex items-stretch">
          ${item('#/', 'home', 'Início')}
          ${item('#/discover', 'discover', 'Descobrir')}
          ${item('#/store', 'store', 'Loja')}
          ${item(user ? '#/profile/favorites' : '#/profile', 'favorites', 'Minha Lista')}
          ${item('#/profile', 'profile', user ? 'Perfil' : 'Entrar')}
        </div>
      `;
      this.updateActiveNav();
    }

    // ==================== EVENTOS GLOBAIS ====================
    bindGlobalEvents() {
      window.addEventListener('dramix-navigate-view', (e) => this.navigate(e.detail.view, e.detail));

      window.addEventListener('dramix-play-episode', (e) => {
        const { series, episodeNumber, startTimestamp } = e.detail;
        this.player.open(series, episodeNumber, startTimestamp || 0);
      });

      window.addEventListener('dramix-paywall-triggered', (e) => {
        const { series, episode } = e.detail;
        this.rewardedAdModal.showPaywall(series, episode, (unlockedSeries, unlockedEpNum) => {
          this.player.open(unlockedSeries, unlockedEpNum);
        });
      });

      window.addEventListener('dramix-open-checkout', (e) => this.checkoutModal.open(e.detail.plan));
      window.addEventListener('dramix-open-coin-checkout', (e) => this.checkoutModal.openCoinPackage(e.detail.pkg));

      window.addEventListener('dramix-open-auth-modal', (e) => this.openAuthModal((e.detail && e.detail.mode) || 'login'));
      window.addEventListener('dramix-open-onboarding', () => this.onboarding.open(() => this.refresh()));

      window.addEventListener('dramix-auth-state-changed', () => this.refresh());
      window.addEventListener('dramix-subscription-updated', () => this.refresh());
      window.addEventListener('dramix-wallet-updated', () => {
        // Atualiza saldo no cabeçalho e re-renderiza a tela atual (exceto com o player aberto)
        this.renderHeader();
        const playerOpen = !document.getElementById('dramix-player-view').classList.contains('hidden');
        if (!playerOpen) this.renderView(this.currentView, this.currentViewParams);
      });

      window.addEventListener('dramix-player-closed', () => {
        if (['home', 'series-details', 'profile'].includes(this.currentView)) this.renderView(this.currentView, this.currentViewParams);
      });

      // Sessão alterada em outra aba (login/logout): sincroniza esta
      window.addEventListener('storage', (e) => {
        if (e.key === this.api.sessionKey) {
          this.closeAllOverlays();
          this.refresh();
        }
      });
    }

    closeAllOverlays() {
      if (!document.getElementById('dramix-player-view').classList.contains('hidden')) this.player.close();
      this.rewardedAdModal.close();
      this.checkoutModal.close();
      this.closeAuthModal();
      const onb = document.getElementById('dramix-onboarding-modal');
      if (onb) onb.classList.add('hidden');
      document.body.style.overflow = '';
    }

    logout() {
      this.api.logout();
      this.closeAllOverlays();
      // Zera o estado das telas para a próxima conta não ver nada da anterior
      this.views.profile.activeTab = 'subscription';
      this.views.store.returnTo = null;
      this.views.discover.searchQuery = '';
      this.views.owner.activeTab = 'stats';
      root.dramixUI.toast('Você saiu da conta.', 'info');
      this.renderHeader();
      this.renderBottomNav();
      this.navigate('home');
    }

    // ==================== LOGIN, CADASTRO E RECUPERAÇÃO DE SENHA ====================
    initAuthModal() {
      let modal = document.getElementById('dramix-auth-modal');
      if (!modal) {
        const bonus = this.api.settings().welcome_bonus_coins;
        modal = document.createElement('div');
        modal.id = 'dramix-auth-modal';
        modal.className = 'fixed inset-0 z-[60] bg-black/85 backdrop-blur-md hidden flex items-end sm:items-center justify-center p-0 sm:p-4';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'auth-title');
        modal.innerHTML = `
          <div class="relative w-full sm:max-w-md bg-[#0E1322] border border-white/15 rounded-t-3xl sm:rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
            <button id="auth-modal-close" class="absolute top-4 right-4 text-gray-400 hover:text-white w-10 h-10 rounded-full text-xl font-bold" aria-label="Fechar">&times;</button>

            <h2 id="auth-title" class="text-xl font-black text-white pr-10">Entrar no DRAMIX</h2>

            <div class="flex items-center gap-2 p-1 bg-black/40 rounded-xl border border-white/10" role="tablist">
              <button id="auth-tab-login" role="tab" class="flex-1 py-2 rounded-lg text-xs font-bold">Entrar</button>
              <button id="auth-tab-register" role="tab" class="flex-1 py-2 rounded-lg text-xs font-bold">Criar conta</button>
            </div>

            <p id="auth-bonus-note" class="hidden text-xs text-amber-200 bg-amber-400/10 border border-amber-400/25 rounded-xl px-3 py-2.5">
              Contas novas ganham ${bonus} moedas para desbloquear episódios.
            </p>

            <form id="auth-form" class="space-y-4" novalidate>
              <div id="auth-field-name" class="space-y-1 hidden">
                <label for="auth-input-name" class="text-[11px] text-gray-400 block">Nome</label>
                <input type="text" id="auth-input-name" autocomplete="name" placeholder="Como quer ser chamado" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#E52E4D]" />
              </div>
              <div class="space-y-1">
                <label for="auth-input-email" class="text-[11px] text-gray-400 block">E-mail ou celular</label>
                <input type="text" id="auth-input-email" autocomplete="username" required placeholder="seu@email.com" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#E52E4D]" />
              </div>
              <div class="space-y-1">
                <label for="auth-input-password" class="text-[11px] text-gray-400 block">Senha</label>
                <input type="password" id="auth-input-password" autocomplete="current-password" required placeholder="Mínimo de 6 caracteres" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#E52E4D]" />
              </div>
              <p id="auth-error" class="text-xs text-red-400 hidden" role="alert"></p>
              <button type="submit" id="auth-submit-btn" class="w-full py-3.5 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-black text-sm shadow-lg shadow-[#E52E4D]/30">Entrar</button>
              <button type="button" id="auth-forgot" class="w-full text-xs text-gray-400 hover:text-white">Esqueci minha senha</button>
            </form>

            <p class="text-[11px] text-gray-500 text-center leading-relaxed">
              Ao continuar, você concorda com os <a href="#/settings/terms" class="underline hover:text-white auth-legal">Termos de uso</a> e a <a href="#/settings/privacy" class="underline hover:text-white auth-legal">Política de privacidade</a>.
            </p>
          </div>
        `;
        modal.addEventListener('click', (e) => { if (e.target === modal) this.closeAuthModal(); });
        document.body.appendChild(modal);
      }
      this.bindAuthModalEvents();
    }

    setAuthMode(mode) {
      this.authMode = mode;
      const isReg = mode === 'register';
      const on = 'flex-1 py-2 rounded-lg text-xs font-bold bg-[#E52E4D] text-white';
      const off = 'flex-1 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-white';
      document.getElementById('auth-tab-login').className = isReg ? off : on;
      document.getElementById('auth-tab-register').className = isReg ? on : off;
      document.getElementById('auth-tab-login').setAttribute('aria-selected', String(!isReg));
      document.getElementById('auth-tab-register').setAttribute('aria-selected', String(isReg));
      document.getElementById('auth-field-name').classList.toggle('hidden', !isReg);
      document.getElementById('auth-bonus-note').classList.toggle('hidden', !isReg);
      document.getElementById('auth-forgot').classList.toggle('hidden', isReg);
      document.getElementById('auth-title').textContent = isReg ? 'Criar sua conta' : 'Entrar no DRAMIX';
      document.getElementById('auth-submit-btn').textContent = isReg ? 'Criar conta e ganhar moedas' : 'Entrar';
      document.getElementById('auth-input-password').setAttribute('autocomplete', isReg ? 'new-password' : 'current-password');
      document.getElementById('auth-error').classList.add('hidden');
    }

    bindAuthModalEvents() {
      document.getElementById('auth-modal-close').onclick = () => this.closeAuthModal();
      document.getElementById('auth-tab-login').onclick = () => this.setAuthMode('login');
      document.getElementById('auth-tab-register').onclick = () => this.setAuthMode('register');
      document.querySelectorAll('.auth-legal').forEach(a => { a.onclick = () => this.closeAuthModal(); });

      const showError = (msg) => {
        const el = document.getElementById('auth-error');
        el.textContent = msg;
        el.classList.remove('hidden');
      };

      document.getElementById('auth-forgot').onclick = () => {
        const ident = document.getElementById('auth-input-email').value;
        if (!ident.trim()) return showError('Digite seu e-mail ou celular acima e toque de novo em "Esqueci minha senha".');
        try {
          const res = this.api.resetPassword(ident);
          root.dramixUI.toast(res.message, 'success');
        } catch (err) {
          showError(err.message);
        }
      };

      document.getElementById('auth-form').onsubmit = (e) => {
        e.preventDefault();
        const emailOrPhone = document.getElementById('auth-input-email').value;
        const password = document.getElementById('auth-input-password').value;
        const name = document.getElementById('auth-input-name').value;
        const isRegister = this.authMode === 'register';

        try {
          const user = isRegister
            ? this.api.register({ name, emailOrPhone, password })
            : this.api.login({ emailOrPhone, password });

          this.closeAuthModal();
          document.getElementById('auth-form').reset();
          this.refresh();

          if (isRegister) root.dramixUI.toast(`Conta criada. Você ganhou ${user.coins} moedas.`, 'coins');
          else root.dramixUI.toast(`Olá, ${user.name.split(' ')[0]}.`, 'info');

          if (!user.onboarded && user.role !== 'owner') this.onboarding.open(() => this.refresh());
        } catch (err) {
          showError(err.message);
        }
      };
    }

    openAuthModal(mode = 'login') {
      this.setAuthMode(mode);
      const modal = document.getElementById('dramix-auth-modal');
      modal.classList.remove('hidden');
      const first = mode === 'register' ? 'auth-input-name' : 'auth-input-email';
      setTimeout(() => document.getElementById(first).focus(), 30);
    }

    closeAuthModal() {
      const modal = document.getElementById('dramix-auth-modal');
      if (modal) modal.classList.add('hidden');
    }
  }

  root.DramixApp = DramixApp;

  window.addEventListener('DOMContentLoaded', () => {
    window.dramixInstance = new DramixApp();
    window.dramixInstance.init();
  });
})(typeof window !== 'undefined' ? window : global);
