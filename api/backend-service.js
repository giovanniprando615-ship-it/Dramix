/**
 * DRAMIX — Backend Service & Access Control Engine
 *
 * Camada de regras de negócio usada por todas as telas:
 * - Autenticação (e-mail ou celular), perfil editável, preferências de onboarding.
 * - Carteira de moedas com extrato: bônus de boas-vindas, presente diário, compras e gastos.
 * - Controle de acesso: episódios gratuitos por série (padrão 5), depois moedas, anúncio ou Premium.
 * - Loja de moedas, assinaturas, restauração de compras e proteção contra cobrança duplicada.
 * - Funções administrativas do Owner (catálogo, preços, regras de moedas, layout da Home).
 *
 * IMPORTANTE: tudo aqui roda no navegador sobre localStorage (ambiente de desenvolvimento).
 * Em produção, estas mesmas regras precisam rodar no servidor (Supabase: RLS + funções RPC),
 * porque qualquer usuário consegue alterar o localStorage pelo console do navegador.
 */

(function(root) {
  'use strict';

  const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
  const DAY_MS = 24 * 60 * 60 * 1000;

  class DramixBackendService {
    constructor(db) {
      this.db = db || root.dramixDB;
      this.sessionKey = 'dramix_active_session_v3';
      this.initFirebaseAuthBridge();
    }

    // ==================== 0. UTILITÁRIOS ====================
    settings() {
      return this.db.table('app_settings').findById('settings') || {
        welcome_bonus_coins: 50,
        daily_gift_coins: 20,
        episode_price_coins: 25,
        series_bundle_discount_percent: 20,
        default_free_episodes: 5,
        rewarded_ad_cooldown_hours: 24,
        support_email: 'suporte@dramix.tv'
      };
    }

    normalizeIdent(value) {
      return (value || '').trim().toLowerCase();
    }

    findUserByIdent(ident) {
      const clean = this.normalizeIdent(ident);
      if (!clean) return null;
      return this.db.table('users').findOne(u =>
        (u.email && u.email.toLowerCase() === clean) || (u.phone && u.phone === clean)
      );
    }

    localDateKey(date = new Date()) {
      // AAAA-MM-DD no fuso do usuário
      return date.toLocaleDateString('sv-SE');
    }

    getProfile(userId) {
      return this.db.table('user_profiles').findOne(p => p.user_id === userId);
    }

    // ==================== 1. PREPARAÇÃO PARA FIREBASE AUTH ====================
    initFirebaseAuthBridge() {
      root.DramixFirebaseAuth = {
        isConfigured: false,
        config: null,
        initialize: (config) => {
          root.DramixFirebaseAuth.config = config;
          root.DramixFirebaseAuth.isConfigured = true;
          console.info('DRAMIX Firebase Auth bridge inicializada com sucesso.');
        },
        syncWithFirebaseUser: (fbUser) => {
          if (!fbUser) return null;
          let user = this.db.table('users').findOne(u => u.email === fbUser.email);
          if (!user) {
            user = this.createUserRecord({
              name: fbUser.displayName || 'Usuário DRAMIX',
              email: fbUser.email,
              avatar: fbUser.photoURL,
              extra: { firebase_uid: fbUser.uid }
            });
          }
          this.setSession(user.id);
          return this.getCurrentUser();
        }
      };
    }

    // ==================== 2. AUTENTICAÇÃO & CONTAS ====================
    getCurrentUser() {
      try {
        const stored = localStorage.getItem(this.sessionKey);
        if (!stored) return null;
        const session = JSON.parse(stored);
        const user = this.db.table('users').findById(session.userId);
        if (!user) return null;

        const isPrem = this.isUserPremium(user.id);
        const profile = this.getProfile(user.id);
        const avatar = (profile && profile.avatar) || user.avatar || DEFAULT_AVATAR;

        return {
          id: user.id,
          name: user.name,
          email: user.email || '',
          phone: user.phone || '',
          avatar,
          role: user.role || 'user',
          isPremium: isPrem,
          activeSubscription: isPrem ? this.getUserSubscription(user.id) : null,
          coins: this.getCoinBalance(user.id),
          preferredGenres: (profile && profile.preferred_genres) || [],
          ageRange: (profile && profile.age_range) || null,
          onboarded: !!(profile && profile.onboarded)
        };
      } catch (e) {
        console.error('Erro na sessão DRAMIX:', e);
      }
      return null;
    }

    // Cria usuário + perfil + bônus de boas-vindas (uma única vez por conta)
    createUserRecord({ name, email = '', phone = '', password = null, avatar, extra = {} }) {
      const finalAvatar = avatar || DEFAULT_AVATAR;
      const user = this.db.table('users').insert({
        name: (name || 'Espectador').trim(),
        email,
        phone,
        password_hash: password,
        avatar: finalAvatar,
        role: 'user',
        ...extra
      });

      this.db.table('user_profiles').insert({
        user_id: user.id,
        avatar: finalAvatar,
        preferred_genres: [],
        age_range: null,
        onboarded: false
      });

      const bonus = this.settings().welcome_bonus_coins;
      if (bonus > 0) {
        this.addCoinTransaction(user.id, {
          amount: bonus,
          type: 'welcome_bonus',
          description: 'Bônus de boas-vindas',
          ref: 'welcome_bonus'
        });
      }
      return user;
    }

    register({ name, email, emailOrPhone, password }) {
      const cleanIdent = this.normalizeIdent(emailOrPhone || email);
      if (!cleanIdent) throw new Error('Informe um e-mail ou celular válido.');
      const isEmail = cleanIdent.includes('@');
      if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdent)) {
        throw new Error('Informe um e-mail válido, como nome@exemplo.com.');
      }
      if (!password || password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
      if (this.findUserByIdent(cleanIdent)) {
        throw new Error('Este e-mail ou celular já tem uma conta. Entre com ele ou use outro.');
      }

      const user = this.createUserRecord({
        name,
        email: isEmail ? cleanIdent : '',
        phone: isEmail ? '' : cleanIdent,
        password
      });

      this.setSession(user.id);
      return this.getCurrentUser();
    }

    login({ email, emailOrPhone, password }) {
      const user = this.findUserByIdent(emailOrPhone || email);
      if (!user || !user.password_hash || user.password_hash !== password) {
        throw new Error('E-mail/celular ou senha incorretos.');
      }
      this.setSession(user.id);
      return this.getCurrentUser();
    }

    loginWithGoogle({ name, email, avatar }) {
      const cleanEmail = this.normalizeIdent(email);
      if (!cleanEmail) throw new Error('Login com Google indisponível: e-mail não informado.');
      let user = this.findUserByIdent(cleanEmail);
      if (!user) {
        user = this.createUserRecord({ name: name || 'Usuário Google', email: cleanEmail, avatar });
      }
      this.setSession(user.id);
      return this.getCurrentUser();
    }

    resetPassword(emailOrPhone) {
      const cleanIdent = this.normalizeIdent(emailOrPhone);
      if (!this.findUserByIdent(cleanIdent)) {
        throw new Error('Não encontramos nenhuma conta com este e-mail ou celular.');
      }
      // Em produção: Supabase Auth envia o e-mail de redefinição (resetPasswordForEmail).
      return {
        success: true,
        message: `Enviamos as instruções de redefinição para ${cleanIdent}.`
      };
    }

    updateUserProfile(userId, { name, emailOrPhone, photo, newPassword }) {
      const user = this.db.table('users').findById(userId);
      if (!user) throw new Error('Usuário não encontrado.');

      const updates = {};
      if (name && name.trim()) updates.name = name.trim();

      if (emailOrPhone && emailOrPhone.trim()) {
        const cleanIdent = this.normalizeIdent(emailOrPhone);
        const owner = this.findUserByIdent(cleanIdent);
        if (owner && owner.id !== userId) {
          throw new Error('Este e-mail ou celular já pertence a outra conta.');
        }
        if (cleanIdent.includes('@')) updates.email = cleanIdent;
        else updates.phone = cleanIdent;
      }

      if (photo) updates.avatar = photo;
      if (newPassword) {
        if (newPassword.length < 6) throw new Error('A nova senha precisa ter pelo menos 6 caracteres.');
        updates.password_hash = newPassword;
      }

      this.db.table('users').update(userId, updates);

      const profile = this.getProfile(userId);
      if (profile) {
        this.db.table('user_profiles').update(profile.id, { avatar: photo || profile.avatar });
      } else {
        this.db.table('user_profiles').insert({
          user_id: userId,
          avatar: photo || user.avatar,
          preferred_genres: [],
          onboarded: false
        });
      }

      return this.getCurrentUser();
    }

    // Onboarding: faixa etária e gêneros favoritos
    savePreferences(userId, { ageRange, preferredGenres }) {
      if (!userId) throw new Error('Faça login para salvar suas preferências.');
      const profile = this.getProfile(userId);
      const updates = {
        age_range: ageRange || null,
        preferred_genres: Array.isArray(preferredGenres) ? preferredGenres : [],
        onboarded: true
      };
      if (profile) this.db.table('user_profiles').update(profile.id, updates);
      else this.db.table('user_profiles').insert({ user_id: userId, ...updates });
      return this.getCurrentUser();
    }

    deleteAccount(userId) {
      const user = this.db.table('users').findById(userId);
      if (!user) throw new Error('Usuário não encontrado.');
      if (user.role === 'owner') throw new Error('A conta Owner não pode ser excluída por aqui.');
      const owned = ['user_profiles', 'favorites', 'watch_history', 'episode_unlocks',
        'rewarded_ad_unlocks', 'coin_transactions', 'subscriptions'];
      for (const t of owned) {
        this.db.table(t).find(r => r.user_id === userId).forEach(r => this.db.table(t).delete(r.id));
      }
      // Pagamentos ficam guardados (obrigação fiscal), mas desvinculados de dados pessoais
      this.db.table('payments').find(p => p.user_id === userId)
        .forEach(p => this.db.table('payments').update(p.id, { user_id: 'deleted_user' }));
      this.db.table('users').delete(userId);
      this.logout();
      return { success: true };
    }

    logout() {
      localStorage.removeItem(this.sessionKey);
      return true;
    }

    setSession(userId) {
      localStorage.setItem(this.sessionKey, JSON.stringify({ userId, timestamp: Date.now() }));
    }

    // ==================== 3. CARTEIRA DE MOEDAS ====================
    getCoinBalance(userId) {
      if (!userId) return 0;
      return this.db.table('coin_transactions')
        .find(t => t.user_id === userId)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    }

    getCoinTransactions(userId) {
      if (!userId) return [];
      return this.db.table('coin_transactions')
        .find(t => t.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    /**
     * Grava um crédito (+) ou débito (-). Se `ref` já existir para o usuário,
     * a operação não se repete: é isso que impede bônus e cobranças em dobro.
     */
    addCoinTransaction(userId, { amount, type, description, ref }) {
      if (ref) {
        const existing = this.db.table('coin_transactions').findOne(t => t.user_id === userId && t.ref === ref);
        if (existing) return { duplicate: true, transaction: existing };
      }
      const balance = this.getCoinBalance(userId);
      if (amount < 0 && balance + amount < 0) {
        throw new Error('Saldo de moedas insuficiente.');
      }
      const transaction = this.db.table('coin_transactions').insert({
        user_id: userId,
        amount,
        type,
        description,
        ref: ref || null,
        balance_after: balance + amount
      });
      return { duplicate: false, transaction };
    }

    getDailyGiftStatus(userId) {
      const amount = this.settings().daily_gift_coins;
      if (!userId) return { available: false, amount, reason: 'auth_required' };
      const todayRef = `daily_gift:${this.localDateKey()}`;
      const claimed = !!this.db.table('coin_transactions').findOne(t => t.user_id === userId && t.ref === todayRef);
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      return { available: !claimed && amount > 0, claimedToday: claimed, amount, nextAvailableAt: tomorrow.toISOString() };
    }

    claimDailyGift(userId) {
      if (!userId) throw new Error('Entre na sua conta para resgatar o presente diário.');
      const status = this.getDailyGiftStatus(userId);
      if (!status.available) throw new Error('Você já resgatou o presente de hoje. Volte amanhã.');
      this.addCoinTransaction(userId, {
        amount: status.amount,
        type: 'daily_gift',
        description: 'Presente diário',
        ref: `daily_gift:${this.localDateKey()}`
      });
      return { success: true, amount: status.amount, balance: this.getCoinBalance(userId) };
    }

    // ==================== 4. CONTROLE DE ACESSO & PAYWALL ====================
    isUserPremium(userId) {
      if (!userId) return false;
      const now = new Date().toISOString();
      return !!this.db.table('subscriptions').findOne(s =>
        s.user_id === userId && s.status === 'active' && s.end_date > now
      );
    }

    getUserSubscription(userId) {
      if (!userId) return null;
      const now = new Date().toISOString();
      const sub = this.db.table('subscriptions').findOne(s =>
        s.user_id === userId && s.status === 'active' && s.end_date > now
      );
      if (!sub) return null;

      const plan = this.db.table('subscription_plans').findById(sub.plan_id);
      return {
        ...sub,
        plan_name: plan ? plan.name : (sub.is_trial ? 'Teste 3 Dias Grátis' : 'Plano Especial'),
        plan_price: plan ? plan.price : 0,
        billing_period: plan ? plan.billing_period : 'mensal',
        is_trial: !!sub.is_trial
      };
    }

    getFreeEpisodesCount(series) {
      if (series && Number.isFinite(series.free_episodes_count)) return series.free_episodes_count;
      return this.settings().default_free_episodes;
    }

    getEpisodePrice(series) {
      if (series && Number.isFinite(series.price_coins)) return series.price_coins;
      return this.settings().episode_price_coins;
    }

    /**
     * Regras de acesso:
     * 1. Episódios até o limite gratuito da série: livres para todos (inclusive visitantes).
     * 2. Assinante Premium (ou teste grátis ativo): tudo liberado.
     * 3. Episódio já desbloqueado pela conta (moedas ou anúncio): liberado para sempre.
     * 4. Caso contrário: paywall (moedas, anúncio diário ou assinatura).
     */
    validateEpisodeAccess(userId, seriesId, episodeNumber) {
      const series = this.db.table('series').findById(seriesId);
      if (!series) return { allowed: false, accessType: 'denied', reason: 'Série não encontrada.' };

      const freeLimit = this.getFreeEpisodesCount(series);
      const priceCoins = this.getEpisodePrice(series);

      if (episodeNumber <= freeLimit) {
        return { allowed: true, accessType: 'free', freeLimit, message: 'Episódio gratuito.' };
      }

      if (!userId) {
        return {
          allowed: false, accessType: 'auth_required', freeLimit, priceCoins, episodeNumber,
          reason: `Entre na sua conta para continuar a partir do episódio ${freeLimit + 1}.`
        };
      }

      if (this.isUserPremium(userId)) {
        return { allowed: true, accessType: 'premium', freeLimit, message: 'Liberado pela assinatura Premium.' };
      }

      const episode = this.db.table('episodes').findOne(e => e.series_id === seriesId && e.episode_number === episodeNumber);
      if (episode) {
        const unlock = this.db.table('episode_unlocks').findOne(u => u.user_id === userId && u.episode_id === episode.id);
        if (unlock) {
          return { allowed: true, accessType: 'unlocked', freeLimit, unlockedAt: unlock.unlocked_at, message: 'Episódio desbloqueado.' };
        }
      }

      return { allowed: false, accessType: 'paywall_required', reason: 'PAYWALL', freeLimit, priceCoins, episodeNumber };
    }

    recordUnlock(userId, seriesId, episodeId, unlockType) {
      const existing = this.db.table('episode_unlocks').findOne(u => u.user_id === userId && u.episode_id === episodeId);
      if (existing) return existing;
      return this.db.table('episode_unlocks').insert({
        user_id: userId,
        series_id: seriesId,
        episode_id: episodeId,
        unlock_type: unlockType,
        unlocked_at: new Date().toISOString()
      });
    }

    unlockEpisodeWithCoins(userId, seriesId, episodeNumber) {
      if (!userId) throw new Error('Entre na sua conta para desbloquear episódios.');
      const series = this.db.table('series').findById(seriesId);
      const episode = this.db.table('episodes').findOne(e => e.series_id === seriesId && e.episode_number === episodeNumber);
      if (!series || !episode) throw new Error('Episódio não encontrado.');

      const access = this.validateEpisodeAccess(userId, seriesId, episodeNumber);
      if (access.allowed) {
        return { success: true, alreadyUnlocked: true, balance: this.getCoinBalance(userId) };
      }

      const price = this.getEpisodePrice(series);
      const balance = this.getCoinBalance(userId);
      if (balance < price) {
        const err = new Error(`Você precisa de ${price} moedas e tem ${balance}.`);
        err.code = 'INSUFFICIENT_COINS';
        err.missing = price - balance;
        throw err;
      }

      this.addCoinTransaction(userId, {
        amount: -price,
        type: 'episode_unlock',
        description: `${series.title} — Episódio ${episodeNumber}`,
        ref: `unlock:${episode.id}`
      });
      this.recordUnlock(userId, seriesId, episode.id, 'coins');

      return { success: true, alreadyUnlocked: false, spent: price, balance: this.getCoinBalance(userId) };
    }

    getSeriesBundleQuote(userId, seriesId) {
      const series = this.db.table('series').findById(seriesId);
      if (!series) return null;
      const locked = this.db.table('episodes')
        .find(e => e.series_id === seriesId)
        .filter(e => !this.validateEpisodeAccess(userId, seriesId, e.episode_number).allowed)
        .sort((a, b) => a.episode_number - b.episode_number);
      const unitPrice = this.getEpisodePrice(series);
      const fullPrice = locked.length * unitPrice;
      const discount = this.settings().series_bundle_discount_percent || 0;
      const price = Math.ceil(fullPrice * (100 - discount) / 100);
      return { lockedCount: locked.length, lockedEpisodes: locked, unitPrice, fullPrice, discount, price };
    }

    unlockSeriesWithCoins(userId, seriesId) {
      if (!userId) throw new Error('Entre na sua conta para desbloquear episódios.');
      const quote = this.getSeriesBundleQuote(userId, seriesId);
      if (!quote) throw new Error('Série não encontrada.');
      if (quote.lockedCount === 0) return { success: true, alreadyUnlocked: true, balance: this.getCoinBalance(userId) };

      const balance = this.getCoinBalance(userId);
      if (balance < quote.price) {
        const err = new Error(`Você precisa de ${quote.price} moedas e tem ${balance}.`);
        err.code = 'INSUFFICIENT_COINS';
        err.missing = quote.price - balance;
        throw err;
      }

      const series = this.db.table('series').findById(seriesId);
      const ids = quote.lockedEpisodes.map(e => e.id).join(',');
      this.addCoinTransaction(userId, {
        amount: -quote.price,
        type: 'series_unlock',
        description: `${series.title} — ${quote.lockedCount} episódios`,
        ref: `bundle:${seriesId}:${ids}`
      });
      quote.lockedEpisodes.forEach(ep => this.recordUnlock(userId, seriesId, ep.id, 'coins_bundle'));

      return { success: true, spent: quote.price, unlockedCount: quote.lockedCount, balance: this.getCoinBalance(userId) };
    }

    // ==================== 5. TESTE GRÁTIS, ASSINATURAS & LOJA ====================
    activateFreeTrial(userId) {
      if (!userId) throw new Error('Entre na sua conta para ativar o teste de 3 dias grátis.');
      const existingTrial = this.db.table('subscriptions').findOne(s => s.user_id === userId && s.is_trial);
      if (existingTrial) throw new Error('Você já usou o teste gratuito de 3 dias nesta conta.');
      if (this.isUserPremium(userId)) throw new Error('Sua conta já tem uma assinatura ativa.');

      const now = new Date();
      const trialEndDate = new Date(now.getTime() + 3 * DAY_MS);
      this.db.table('subscriptions').insert({
        user_id: userId,
        plan_id: 'plan-trial',
        status: 'active',
        is_trial: true,
        start_date: now.toISOString(),
        end_date: trialEndDate.toISOString(),
        auto_renew: false,
        gateway: 'trial'
      });

      return { success: true, expiresAt: trialEndDate.toISOString(), message: 'Teste de 3 dias ativado. Todos os episódios estão liberados.' };
    }

    getSubscriptionPlans() {
      return this.db.table('subscription_plans').find(p => p.is_active && p.id !== 'plan-trial');
    }

    getCoinPackages() {
      return this.db.table('coin_packages').find(p => p.is_active).sort((a, b) => a.order - b.order);
    }

    buildPixCode(txId, amount) {
      return `00020126580014br.gov.bcb.pix0136${txId}520400005303986540${amount.toFixed(2)}5802BR5915DRAMIX STREAM6009SAO PAULO62070503***6304`;
    }

    createCheckoutOrder(userId, planId, paymentMethod) {
      const user = this.db.table('users').findById(userId);
      if (!user) throw new Error('Entre na sua conta para assinar.');
      const plan = this.db.table('subscription_plans').findById(planId);
      if (!plan) throw new Error('Plano de assinatura não encontrado.');

      const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const method = paymentMethod || 'pix';
      const payment = this.db.table('payments').insert({
        id: txId,
        kind: 'subscription',
        user_id: userId,
        plan_id: planId,
        amount: plan.price,
        status: 'pending',
        method,
        pix_code: this.buildPixCode(txId, plan.price)
      });

      return {
        transactionId: txId, kind: 'subscription', plan, amount: plan.price,
        paymentMethod: method, pixCode: payment.pix_code, pixQrData: payment.pix_code, status: 'pending'
      };
    }

    createCoinOrder(userId, packageId, paymentMethod) {
      const user = this.db.table('users').findById(userId);
      if (!user) throw new Error('Entre na sua conta para comprar moedas.');
      const pkg = this.db.table('coin_packages').findById(packageId);
      if (!pkg || !pkg.is_active) throw new Error('Pacote de moedas indisponível.');

      const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const method = paymentMethod || 'pix';
      const payment = this.db.table('payments').insert({
        id: txId,
        kind: 'coins',
        user_id: userId,
        package_id: pkg.id,
        coins_total: pkg.coins + (pkg.bonus_coins || 0),
        amount: pkg.price,
        status: 'pending',
        method,
        pix_code: this.buildPixCode(txId, pkg.price)
      });

      return {
        transactionId: txId, kind: 'coins', package: pkg, coinsTotal: payment.coins_total, amount: pkg.price,
        paymentMethod: method, pixCode: payment.pix_code, pixQrData: payment.pix_code, status: 'pending'
      };
    }

    setPaymentMethod(transactionId, method) {
      const payment = this.db.table('payments').findById(transactionId);
      if (payment && payment.status === 'pending') this.db.table('payments').update(transactionId, { method });
    }

    activateSubscriptionFromPayment(payment, plan, now = new Date()) {
      const endDate = new Date(now.getTime() + plan.duration_days * DAY_MS);
      const fields = {
        plan_id: plan.id,
        status: 'active',
        is_trial: false,
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        auto_renew: true,
        gateway: payment.method,
        transaction_id: payment.id
      };
      const existingSub = this.db.table('subscriptions').findOne(s => s.user_id === payment.user_id);
      if (existingSub) this.db.table('subscriptions').update(existingSub.id, fields);
      else this.db.table('subscriptions').insert({ user_id: payment.user_id, ...fields });
      return endDate;
    }

    /**
     * Confirma um pagamento (assinatura ou moedas).
     * Pagamento já confirmado não gera nada de novo: sem crédito ou cobrança em dobro.
     * Em produção, quem chama isto é o webhook do gateway (Mercado Pago, Stripe, Pagar.me), nunca o navegador.
     */
    confirmPayment(transactionId) {
      const payment = this.db.table('payments').findById(transactionId);
      if (!payment) throw new Error('Transação não encontrada.');
      if (payment.status === 'paid') {
        return { success: true, alreadyConfirmed: true, kind: payment.kind || 'subscription', message: 'Pagamento já confirmado.' };
      }

      const now = new Date();

      if (payment.kind === 'coins') {
        this.db.table('payments').update(transactionId, { status: 'paid', paid_at: now.toISOString() });
        this.addCoinTransaction(payment.user_id, {
          amount: payment.coins_total,
          type: 'purchase',
          description: `Compra de ${payment.coins_total} moedas`,
          ref: `payment:${transactionId}`
        });
        return {
          success: true, kind: 'coins', transactionId, coins: payment.coins_total,
          balance: this.getCoinBalance(payment.user_id),
          message: `${payment.coins_total} moedas adicionadas à sua carteira.`
        };
      }

      const plan = this.db.table('subscription_plans').findById(payment.plan_id);
      if (!plan) throw new Error('Plano associado inválido.');
      this.db.table('payments').update(transactionId, { status: 'paid', paid_at: now.toISOString() });
      const endDate = this.activateSubscriptionFromPayment(payment, plan, now);

      return {
        success: true, kind: 'subscription', transactionId, planName: plan.name,
        expiresAt: endDate.toISOString(),
        message: `${plan.name} ativado. Todos os episódios estão liberados.`
      };
    }

    cancelSubscription(userId) {
      const sub = this.db.table('subscriptions').findOne(s => s.user_id === userId && s.status === 'active');
      if (!sub) throw new Error('Nenhuma assinatura ativa encontrada.');
      this.db.table('subscriptions').update(sub.id, { auto_renew: false });
      return {
        success: true,
        message: 'Renovação automática desativada. Seu acesso continua até o fim do período pago.',
        expiresAt: sub.end_date
      };
    }

    /**
     * Restaurar compras: confere cada pagamento confirmado da conta e
     * devolve o que estiver faltando (moedas não creditadas ou assinatura vigente não ativa).
     */
    restorePurchases(userId) {
      if (!userId) throw new Error('Entre na sua conta para restaurar compras.');
      const paid = this.db.table('payments').find(p => p.user_id === userId && p.status === 'paid');
      let coinsRestored = 0;
      let subscriptionRestored = false;

      for (const p of paid) {
        if (p.kind === 'coins') {
          const res = this.addCoinTransaction(userId, {
            amount: p.coins_total,
            type: 'purchase',
            description: `Compra de ${p.coins_total} moedas (restaurada)`,
            ref: `payment:${p.id}`
          });
          if (!res.duplicate) coinsRestored += p.coins_total;
        }
      }

      const lastSubPayment = paid
        .filter(p => (p.kind || 'subscription') === 'subscription')
        .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))[0];
      if (lastSubPayment && !this.isUserPremium(userId)) {
        const plan = this.db.table('subscription_plans').findById(lastSubPayment.plan_id);
        if (plan) {
          const paidAt = new Date(lastSubPayment.paid_at);
          if (paidAt.getTime() + plan.duration_days * DAY_MS > Date.now()) {
            this.activateSubscriptionFromPayment(lastSubPayment, plan, paidAt);
            subscriptionRestored = true;
          }
        }
      }

      return {
        success: true,
        checked: paid.length,
        coinsRestored,
        subscriptionRestored,
        message: coinsRestored || subscriptionRestored
          ? 'Compras restauradas.'
          : paid.length ? 'Tudo certo: suas compras já estavam ativas.' : 'Nenhuma compra encontrada nesta conta.'
      };
    }

    // ==================== 6. ANÚNCIOS RECOMPENSADOS ====================
    checkRewardedAdEligibility(userId) {
      if (!userId) return { eligible: false, reason: 'Usuário não autenticado.' };

      const last = this.db.table('rewarded_ad_unlocks')
        .find(u => u.user_id === userId && u.completed === true)
        .sort((a, b) => new Date(b.unlocked_at) - new Date(a.unlocked_at))[0];
      if (!last) return { eligible: true, cooldownSeconds: 0 };

      const lastTime = new Date(last.unlocked_at).getTime();
      const cooldownMs = (this.settings().rewarded_ad_cooldown_hours || 24) * 60 * 60 * 1000;
      const elapsedMs = Date.now() - lastTime;

      if (elapsedMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        return {
          eligible: false,
          remainingSeconds,
          formattedRemaining: `${hours}h ${minutes}m`,
          nextAvailableAt: new Date(lastTime + cooldownMs).toISOString(),
          message: 'Você já usou o desbloqueio com anúncio de hoje.'
        };
      }
      return { eligible: true, cooldownSeconds: 0 };
    }

    completeRewardedAdUnlock(userId, seriesId, episodeId, adVerificationPayload) {
      const eligibility = this.checkRewardedAdEligibility(userId);
      if (!eligibility.eligible) throw new Error(eligibility.message || 'Desbloqueio com anúncio indisponível agora.');

      const now = new Date().toISOString();
      this.db.table('rewarded_ad_unlocks').insert({
        user_id: userId,
        episode_id: episodeId,
        ad_token: (adVerificationPayload && adVerificationPayload.token) || `token_${Date.now()}`,
        completed: true,
        unlocked_at: now
      });
      this.recordUnlock(userId, seriesId, episodeId, 'rewarded_ad');
      return { success: true, message: 'Episódio desbloqueado.' };
    }

    // ==================== 7. HISTÓRICO & CONTINUE ASSISTINDO ====================
    saveWatchProgress(userId, seriesId, episodeId, progressSeconds, durationSeconds) {
      if (!userId || !seriesId || !episodeId) return;
      const completed = progressSeconds >= durationSeconds * 0.9;
      const now = new Date().toISOString();
      const fields = {
        episode_id: episodeId,
        progress_seconds: Math.round(progressSeconds),
        duration_seconds: Math.round(durationSeconds),
        completed,
        updated_at: now
      };
      const existing = this.db.table('watch_history').findOne(w => w.user_id === userId && w.series_id === seriesId);
      if (existing) this.db.table('watch_history').update(existing.id, fields);
      else this.db.table('watch_history').insert({ user_id: userId, series_id: seriesId, ...fields });
    }

    getContinueWatching(userId) {
      if (!userId) return [];
      return this.db.table('watch_history')
        .find(w => w.user_id === userId)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .map(item => {
          const series = this.db.table('series').findById(item.series_id);
          const episode = this.db.table('episodes').findById(item.episode_id);
          if (!series || !episode) return null;
          return {
            series,
            episode,
            progressSeconds: item.progress_seconds,
            durationSeconds: item.duration_seconds,
            progressPercent: Math.min(100, Math.round((item.progress_seconds / (item.duration_seconds || 1)) * 100)),
            updatedAt: item.updated_at
          };
        })
        .filter(Boolean);
    }

    clearWatchHistory(userId) {
      this.db.table('watch_history').find(w => w.user_id === userId).forEach(w => this.db.table('watch_history').delete(w.id));
    }

    // ==================== 8. MINHA LISTA & CATÁLOGO VISÍVEL ====================
    /**
     * Séries publicadas que a conta pode ver.
     * Contas que informaram faixa etária menor de 18 não veem produções 18+.
     */
    getVisibleSeries(userId) {
      const profile = userId ? this.getProfile(userId) : null;
      const isMinor = profile && profile.age_range === '13-17';
      return this.db.table('series').find(s => s.is_published && !(isMinor && s.content_rating === '18+'));
    }

    toggleFavorite(userId, seriesId) {
      if (!userId) throw new Error('Entre na sua conta para salvar minisséries na sua lista.');
      const existing = this.db.table('favorites').findOne(f => f.user_id === userId && f.series_id === seriesId);
      if (existing) {
        this.db.table('favorites').delete(existing.id);
        return { isFavorite: false };
      }
      this.db.table('favorites').insert({ user_id: userId, series_id: seriesId });
      return { isFavorite: true };
    }

    isFavorite(userId, seriesId) {
      if (!userId) return false;
      return !!this.db.table('favorites').findOne(f => f.user_id === userId && f.series_id === seriesId);
    }

    getFavorites(userId) {
      if (!userId) return [];
      return this.db.table('favorites').find(f => f.user_id === userId)
        .map(f => this.db.table('series').findById(f.series_id)).filter(Boolean);
    }

    getSuggestionsForEmptyList(limit = 3, userId = null) {
      return [...this.getVisibleSeries(userId)].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, limit);
    }

    // ==================== 9. COLEÇÕES, RANKINGS & PARA VOCÊ ====================
    getCollections() {
      return this.db.table('collections').all().map(c => ({
        ...c,
        series: (c.seriesIds || []).map(id => this.db.table('series').findById(id)).filter(Boolean)
      }));
    }

    getCollectionById(collectionId) {
      const col = this.db.table('collections').findById(collectionId);
      if (!col) return null;
      return { ...col, series: (col.seriesIds || []).map(id => this.db.table('series').findById(id)).filter(Boolean) };
    }

    getRankingsData(userId = null) {
      const all = this.getVisibleSeries(userId);
      return {
        top10WeeklyBrasil: [...all].sort((a, b) => (a.weekly_rank || 99) - (b.weekly_rank || 99)).slice(0, 10),
        mostMarathoned: [...all].sort((a, b) => (b.marathon_score || 0) - (a.marathon_score || 0)).slice(0, 10),
        trendingToday: [...all].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 10)
      };
    }

    /**
     * Recomendação: gêneros escolhidos no onboarding (peso 3), gêneros dos favoritos (2)
     * e do histórico (1). Séries já favoritadas ficam de fora. Empate desfeito por audiência.
     */
    getForYou(userId) {
      const all = this.getVisibleSeries(userId);
      if (!userId) return [...all].sort((a, b) => (b.views_count || 0) - (a.views_count || 0));

      const weights = new Map();
      const bump = (genre, w) => weights.set(genre, (weights.get(genre) || 0) + w);
      const profile = this.getProfile(userId);
      ((profile && profile.preferred_genres) || []).forEach(g => bump(g, 3));
      const favs = this.getFavorites(userId);
      favs.forEach(f => (f.genres || []).forEach(g => bump(g, 2)));
      this.getContinueWatching(userId).forEach(h => (h.series.genres || []).forEach(g => bump(g, 1)));

      const favIds = new Set(favs.map(f => f.id));
      const scored = all
        .filter(s => !favIds.has(s.id))
        .map(s => ({ s, score: (s.genres || []).reduce((sum, g) => sum + (weights.get(g) || 0), 0) }))
        .sort((a, b) => b.score - a.score || (b.s.views_count || 0) - (a.s.views_count || 0))
        .map(x => x.s);

      return scored.length >= 4 ? scored : [...all].sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    }

    // ==================== 10. CATÁLOGO HOME & DETALHES ====================
    getFeaturedSeries(userId = null) {
      const visible = this.getVisibleSeries(userId);
      return visible.find(s => s.is_featured) || visible[0] || null;
    }

    getHomeCatalog(userId) {
      const allSeries = this.getVisibleSeries(userId);
      const sections = this.db.table('homepage_sections').find(sec => sec.is_enabled).sort((a, b) => a.order - b.order);
      const hasGenre = (s, g) => (s.genres || []).includes(g);

      const rows = [];
      for (const sec of sections) {
        if (sec.row_type === 'hero' || sec.row_type === 'tropes_bar' || sec.row_type === 'continue_watching') continue;

        let items;
        if (sec.row_type === 'recommended') {
          items = this.getForYou(userId);
        } else {
          switch (sec.filter_key) {
            case 'new_releases': items = [...allSeries].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
            case 'popular': items = [...allSeries].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)); break;
            case 'genre_romance': items = allSeries.filter(s => hasGenre(s, 'Romance')); break;
            case 'genre_drama_vinganca': items = allSeries.filter(s => hasGenre(s, 'Drama') || hasGenre(s, 'Vingança')); break;
            case 'genre_acao_suspense': items = allSeries.filter(s => hasGenre(s, 'Ação') || hasGenre(s, 'Suspense')); break;
            case 'genre_fantasia': items = allSeries.filter(s => hasGenre(s, 'Fantasia')); break;
            default: items = allSeries;
          }
        }
        if (items.length > 0) rows.push({ id: sec.id, title: sec.title, type: 'standard', items });
      }

      const cwSection = sections.find(s => s.row_type === 'continue_watching');
      return {
        featured: sections.some(s => s.row_type === 'hero') ? this.getFeaturedSeries(userId) : null,
        continueWatching: cwSection ? this.getContinueWatching(userId) : [],
        showTropes: sections.some(s => s.row_type === 'tropes_bar'),
        rows
      };
    }

    getSeriesDetails(seriesId, userId) {
      const series = this.db.table('series').findById(seriesId);
      if (!series) return null;

      const episodes = this.db.table('episodes')
        .find(e => e.series_id === seriesId)
        .sort((a, b) => a.episode_number - b.episode_number);
      const freeLimit = this.getFreeEpisodesCount(series);

      return {
        series,
        episodes: episodes.map(ep => {
          const access = this.validateEpisodeAccess(userId, seriesId, ep.episode_number);
          return { ...ep, hasAccess: access.allowed, accessType: access.accessType, isFreeByDefault: ep.episode_number <= freeLimit };
        }),
        isFavorite: this.isFavorite(userId, seriesId),
        totalEpisodes: episodes.length,
        freeEpisodesCount: freeLimit,
        priceCoins: this.getEpisodePrice(series),
        bundle: userId && !this.isUserPremium(userId) ? this.getSeriesBundleQuote(userId, seriesId) : null
      };
    }

    // ==================== 11. SUPORTE ====================
    createSupportTicket(userId, { name, email, subject, message }) {
      const cleanEmail = this.normalizeIdent(email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Informe um e-mail válido para receber a resposta.');
      if (!message || message.trim().length < 10) throw new Error('Descreva o problema com pelo menos 10 caracteres.');
      const ticket = this.db.table('support_tickets').insert({
        user_id: userId || null,
        name: (name || '').trim(),
        email: cleanEmail,
        subject: subject || 'Outro assunto',
        message: message.trim(),
        status: 'open'
      });
      return { success: true, ticketId: ticket.id };
    }

    // ==================== 12. ADMIN OWNER ====================
    requireOwner(userId) {
      const user = this.db.table('users').findById(userId);
      if (!user || user.role !== 'owner') throw new Error('Acesso negado. Apenas administradores DRAMIX têm acesso.');
    }

    getAdminStats(userId) {
      this.requireOwner(userId);
      const users = this.db.table('users').all();
      const now = new Date().toISOString();
      const activeSubs = this.db.table('subscriptions').find(s => s.status === 'active' && s.end_date > now);
      const paid = this.db.table('payments').find(p => p.status === 'paid');
      const sum = (list) => Math.round(list.reduce((s, p) => s + (p.amount || 0), 0) * 100) / 100;
      const coinTx = this.db.table('coin_transactions').all();

      return {
        totalUsers: users.length,
        activeSubscribers: activeSubs.length,
        freeUsers: Math.max(0, users.length - activeSubs.length),
        totalRevenue: sum(paid),
        subscriptionRevenue: sum(paid.filter(p => (p.kind || 'subscription') === 'subscription')),
        coinRevenue: sum(paid.filter(p => p.kind === 'coins')),
        coinsInCirculation: coinTx.reduce((s, t) => s + t.amount, 0),
        coinsSpent: -coinTx.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0),
        coinUnlocks: this.db.table('episode_unlocks').find(u => (u.unlock_type || '').startsWith('coins')).length,
        totalViews: this.db.table('series').all().reduce((s, x) => s + (x.views_count || 0), 0),
        totalRewardedAdUnlocks: this.db.table('rewarded_ad_unlocks').all().length,
        openTickets: this.db.table('support_tickets').find(t => t.status === 'open').length
      };
    }

    updateSubscriptionPlan(userId, planId, { price }) {
      this.requireOwner(userId);
      if (!Number.isFinite(price) || price < 0) throw new Error('Preço inválido.');
      return this.db.table('subscription_plans').update(planId, { price: Math.round(price * 100) / 100 });
    }

    updateCoinPackage(userId, packageId, { coins, bonus_coins, price, is_active }) {
      this.requireOwner(userId);
      const updates = {};
      if (Number.isFinite(coins) && coins > 0) updates.coins = Math.round(coins);
      if (Number.isFinite(bonus_coins) && bonus_coins >= 0) updates.bonus_coins = Math.round(bonus_coins);
      if (Number.isFinite(price) && price > 0) updates.price = Math.round(price * 100) / 100;
      if (typeof is_active === 'boolean') updates.is_active = is_active;
      return this.db.table('coin_packages').update(packageId, updates);
    }

    updateAppSettings(userId, updates) {
      this.requireOwner(userId);
      const allowed = ['welcome_bonus_coins', 'daily_gift_coins', 'episode_price_coins',
        'series_bundle_discount_percent', 'default_free_episodes', 'rewarded_ad_cooldown_hours'];
      const clean = {};
      for (const key of allowed) {
        const v = updates[key];
        if (Number.isFinite(v) && v >= 0) clean[key] = Math.round(v);
      }
      if (clean.series_bundle_discount_percent > 90) clean.series_bundle_discount_percent = 90;
      if (typeof updates.support_email === 'string' && updates.support_email.includes('@')) {
        clean.support_email = updates.support_email.trim();
      }
      return this.db.table('app_settings').update('settings', clean);
    }

    createSeries(userId, data) {
      this.requireOwner(userId);
      if (!data.title || !data.title.trim()) throw new Error('Informe o título da minissérie.');
      if (data.is_featured) this.db.table('series').all().forEach(s => s.is_featured && this.db.table('series').update(s.id, { is_featured: false }));
      const free = Number.isFinite(data.free_episodes_count) ? data.free_episodes_count : this.settings().default_free_episodes;
      return this.db.table('series').insert({
        title: data.title.trim(),
        synopsis: (data.synopsis || '').trim(),
        poster_url: data.poster_url,
        backdrop_url: data.backdrop_url || data.poster_url,
        trailer_url: data.trailer_url || '',
        genres: data.genres || [],
        tropes: data.tropes || [],
        badge: 'NOVO',
        badge_color: 'bg-emerald-500',
        content_rating: data.content_rating || '14+',
        free_episodes_count: free,
        is_featured: !!data.is_featured,
        is_published: true,
        views_count: 0,
        episodes_count: 0,
        total_duration: '~0 min'
      });
    }

    refreshSeriesCounters(seriesId) {
      const eps = this.db.table('episodes').find(e => e.series_id === seriesId);
      const totalSec = eps.reduce((s, e) => s + (Number(e.duration_seconds) || 0), 0);
      this.db.table('series').update(seriesId, { episodes_count: eps.length, total_duration: `~${Math.round(totalSec / 60)} min` });
    }

    createEpisode(userId, seriesId, { title, video_url, duration_seconds }) {
      this.requireOwner(userId);
      const series = this.db.table('series').findById(seriesId);
      if (!series) throw new Error('Minissérie não encontrada.');
      if (!video_url) throw new Error('Informe a URL do vídeo.');
      const existing = this.db.table('episodes').find(e => e.series_id === seriesId);
      const number = existing.reduce((m, e) => Math.max(m, e.episode_number), 0) + 1;
      const ep = this.db.table('episodes').insert({
        id: `ep-${seriesId}-${number}-${Date.now().toString(36)}`,
        series_id: seriesId,
        episode_number: number,
        title: (title || `Episódio ${number}`).trim(),
        video_url,
        duration_seconds: Math.max(1, parseInt(duration_seconds, 10) || 120),
        is_free: number <= this.getFreeEpisodesCount(series)
      });
      this.refreshSeriesCounters(seriesId);
      return ep;
    }

    deleteEpisode(userId, episodeId) {
      this.requireOwner(userId);
      const ep = this.db.table('episodes').findById(episodeId);
      if (!ep) return false;
      this.db.table('episodes').delete(episodeId);
      // Mantém a numeração em sequência (1, 2, 3...) depois da exclusão
      this.db.table('episodes')
        .find(e => e.series_id === ep.series_id && e.episode_number > ep.episode_number)
        .forEach(e => this.db.table('episodes').update(e.id, { episode_number: e.episode_number - 1 }));
      this.refreshSeriesCounters(ep.series_id);
      return true;
    }

    deleteSeries(userId, seriesId) {
      this.requireOwner(userId);
      this.db.table('episodes').find(e => e.series_id === seriesId).forEach(e => this.db.table('episodes').delete(e.id));
      this.db.table('favorites').find(f => f.series_id === seriesId).forEach(f => this.db.table('favorites').delete(f.id));
      this.db.table('watch_history').find(w => w.series_id === seriesId).forEach(w => this.db.table('watch_history').delete(w.id));
      return this.db.table('series').delete(seriesId);
    }

    setFeaturedHero(userId, seriesId) {
      this.requireOwner(userId);
      this.db.table('series').all().forEach(s => {
        const should = s.id === seriesId;
        if (!!s.is_featured !== should) this.db.table('series').update(s.id, { is_featured: should });
      });
    }

    updateSeriesFreeEpisodes(userId, seriesId, count) {
      this.requireOwner(userId);
      const n = Math.max(0, parseInt(count, 10) || 0);
      this.db.table('series').update(seriesId, { free_episodes_count: n });
      this.db.table('episodes').find(e => e.series_id === seriesId)
        .forEach(e => this.db.table('episodes').update(e.id, { is_free: e.episode_number <= n }));
    }

    reorderHomeSections(userId, orderedList) {
      this.requireOwner(userId);
      orderedList.forEach((sec, idx) => this.db.table('homepage_sections').update(sec.id, { order: idx + 1 }));
    }

    setHomeSectionEnabled(userId, sectionId, enabled) {
      this.requireOwner(userId);
      this.db.table('homepage_sections').update(sectionId, { is_enabled: !!enabled });
    }

    getSupportTickets(userId) {
      this.requireOwner(userId);
      return this.db.table('support_tickets').all().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    closeSupportTicket(userId, ticketId) {
      this.requireOwner(userId);
      this.db.table('support_tickets').update(ticketId, { status: 'closed' });
    }
  }

  root.DramixBackendService = DramixBackendService;
  root.dramixAPI = new DramixBackendService(root.dramixDB);
})(typeof window !== 'undefined' ? window : global);
