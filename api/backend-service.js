/**
 * DRAMIX — Backend Service & Access Control Engine
 * Implementa autenticação real (e-mail/celular, Google OAuth simulation, recuperação de senha),
 * perfil editável, controle rígido de acesso (Ep 1 livre, Ep 2+ Premium com cadeado),
 * teste grátis de 3 dias, coleções, rankings, tropes e preparação para Firebase Auth.
 */

(function(root) {
  'use strict';

  class DramixBackendService {
    constructor(db) {
      this.db = db || root.dramixDB;
      this.sessionKey = 'dramix_active_session_v3';
      this.initFirebaseAuthBridge();
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
            user = this.db.table('users').insert({
              name: fbUser.displayName || 'Usuário DRAMIX',
              email: fbUser.email,
              avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
              role: 'user',
              firebase_uid: fbUser.uid
            });
            this.db.table('user_profiles').insert({
              user_id: user.id,
              avatar: user.avatar,
              preferred_genres: ['Romance', 'Drama']
            });
          }
          this.setSession(user.id);
          return this.getCurrentUser();
        }
      };
    }

    // ==================== 2. AUTENTICAÇÃO REAL & GESTÃO DE CONTAS ====================
    getCurrentUser() {
      try {
        const stored = localStorage.getItem(this.sessionKey);
        if (stored) {
          const session = JSON.parse(stored);
          const user = this.db.table('users').findById(session.userId);
          if (user) {
            const isPrem = this.isUserPremium(user.id);
            const profile = this.db.table('user_profiles').findOne(p => p.user_id === user.id);
            const avatar = (profile && profile.avatar) || user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

            return {
              id: user.id,
              name: user.name,
              email: user.email || '',
              phone: user.phone || '',
              avatar,
              role: user.role || 'user',
              isPremium: isPrem,
              activeSubscription: isPrem ? this.getUserSubscription(user.id) : null
            };
          }
        }
      } catch (e) {
        console.error('Erro na sessão DRAMIX:', e);
      }
      return null;
    }

    register({ name, emailOrPhone, password, avatar }) {
      const cleanIdent = (emailOrPhone || '').trim().toLowerCase();
      if (!cleanIdent) throw new Error('Informe um e-mail ou celular válido.');
      if (!password || password.length < 4) throw new Error('A senha deve conter pelo menos 4 caracteres.');

      const isEmail = cleanIdent.includes('@');
      const existing = this.db.table('users').findOne(u => 
        (isEmail && u.email && u.email.toLowerCase() === cleanIdent) ||
        (!isEmail && u.phone && u.phone === cleanIdent)
      );

      if (existing) {
        throw new Error('Este e-mail ou celular já está cadastrado no DRAMIX.');
      }

      const defaultAvatar = avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

      const newUser = this.db.table('users').insert({
        name: (name || 'Espectador').trim(),
        email: isEmail ? cleanIdent : '',
        phone: !isEmail ? cleanIdent : '',
        password_hash: password,
        avatar: defaultAvatar,
        role: 'user'
      });

      this.db.table('user_profiles').insert({
        user_id: newUser.id,
        avatar: defaultAvatar,
        preferred_genres: ['Romance', 'Drama']
      });

      this.setSession(newUser.id);
      return this.getCurrentUser();
    }

    login({ emailOrPhone, password }) {
      const cleanIdent = (emailOrPhone || '').trim().toLowerCase();
      const isEmail = cleanIdent.includes('@');

      const user = this.db.table('users').findOne(u => {
        const matchesIdent = (isEmail && u.email && u.email.toLowerCase() === cleanIdent) ||
                             (!isEmail && u.phone && u.phone === cleanIdent) ||
                             (u.email && u.email.toLowerCase() === cleanIdent);
        return matchesIdent && u.password_hash === password;
      });

      if (!user) {
        throw new Error('E-mail/celular ou senha incorretos.');
      }

      this.setSession(user.id);
      return this.getCurrentUser();
    }

    loginWithGoogle({ name, email, avatar }) {
      const cleanEmail = (email || 'google.user@dramix.tv').toLowerCase();
      let user = this.db.table('users').findOne(u => u.email && u.email.toLowerCase() === cleanEmail);

      if (!user) {
        user = this.db.table('users').insert({
          name: name || 'Usuário Google',
          email: cleanEmail,
          password_hash: 'google_oauth_' + Math.random().toString(36),
          avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          role: 'user'
        });
        this.db.table('user_profiles').insert({
          user_id: user.id,
          avatar: user.avatar,
          preferred_genres: ['Romance', 'CEO']
        });
      }

      this.setSession(user.id);
      return this.getCurrentUser();
    }

    resetPassword(emailOrPhone) {
      const cleanIdent = (emailOrPhone || '').trim().toLowerCase();
      const isEmail = cleanIdent.includes('@');
      const user = this.db.table('users').findOne(u => 
        (isEmail && u.email && u.email.toLowerCase() === cleanIdent) ||
        (!isEmail && u.phone && u.phone === cleanIdent)
      );

      if (!user) {
        throw new Error('Não encontramos nenhuma conta com este e-mail ou celular.');
      }

      // Em produção: dispara e-mail/SMS com token. Aqui simulamos envio do link
      return {
        success: true,
        message: `Instruções de redefinição de senha enviadas com sucesso para ${cleanIdent}.`
      };
    }

    updateUserProfile(userId, { name, emailOrPhone, photo, newPassword }) {
      const user = this.db.table('users').findById(userId);
      if (!user) throw new Error('Usuário não encontrado.');

      const updates = {};
      if (name && name.trim()) updates.name = name.trim();

      if (emailOrPhone && emailOrPhone.trim()) {
        const cleanIdent = emailOrPhone.trim();
        if (cleanIdent.includes('@')) {
          updates.email = cleanIdent.toLowerCase();
        } else {
          updates.phone = cleanIdent;
        }
      }

      if (photo) updates.avatar = photo;
      if (newPassword && newPassword.length >= 4) updates.password_hash = newPassword;

      this.db.table('users').update(userId, updates);

      // Atualiza também perfil
      const profile = this.db.table('user_profiles').findOne(p => p.user_id === userId);
      if (profile) {
        this.db.table('user_profiles').update(profile.id, {
          avatar: photo || profile.avatar
        });
      } else {
        this.db.table('user_profiles').insert({
          user_id: userId,
          avatar: photo || user.avatar,
          preferred_genres: ['Drama', 'Romance']
        });
      }

      return this.getCurrentUser();
    }

    logout() {
      localStorage.removeItem(this.sessionKey);
      return true;
    }

    setSession(userId) {
      localStorage.setItem(this.sessionKey, JSON.stringify({
        userId,
        timestamp: Date.now()
      }));
    }

    // ==================== 3. CONTROLE DE ACESSO & PAYWALL (EP 1 LIVRE, EP 2+ PREMIUM) ====================
    isUserPremium(userId) {
      if (!userId) return false;
      const now = new Date().toISOString();
      const sub = this.db.table('subscriptions').findOne(s => 
        s.user_id === userId && s.status === 'active' && s.end_date > now
      );
      return !!sub;
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

    /**
     * Validação rígida de acesso ao episódio pelo Backend.
     * REGRA OBRIGATÓRIA: Episódio 1 é livre para todos. Episódio 2 em diante com cadeado "Desbloquear com Premium".
     */
    validateEpisodeAccess(userId, seriesId, episodeNumber) {
      const series = this.db.table('series').findById(seriesId);
      if (!series) {
        return { allowed: false, accessType: 'denied', reason: 'Série não encontrada.' };
      }

      // REGRA 1: Episódio 1 SEMPRE livre e gratuito
      if (episodeNumber === 1) {
        return {
          allowed: true,
          accessType: 'free',
          freeLimit: 1,
          message: 'Episódio 1 está disponível gratuitamente.'
        };
      }

      // Episódio 2 em diante: Exige autenticação e assinatura Premium ou Desbloqueio
      if (!userId) {
        return {
          allowed: false,
          accessType: 'auth_required',
          freeLimit: 1,
          episodeNumber,
          reason: 'Faça login ou assine o DRAMIX Premium para assistir aos episódios a partir do 2.',
          message: 'Desbloquear com Premium'
        };
      }

      // REGRA 2: Usuário com Premium ou Teste Grátis de 3 dias ativo tem acesso TOTAL
      if (this.isUserPremium(userId)) {
        return {
          allowed: true,
          accessType: 'premium',
          freeLimit: 1,
          message: 'Acesso liberado via assinatura DRAMIX Premium.'
        };
      }

      // REGRA 3: Desbloqueio individual (anúncio recompensado diário ou avulso)
      const episode = this.db.table('episodes').findOne(e => e.series_id === seriesId && e.episode_number === episodeNumber);
      if (episode) {
        const unlock = this.db.table('episode_unlocks').findOne(u => u.user_id === userId && u.episode_id === episode.id);
        if (unlock) {
          return {
            allowed: true,
            accessType: 'unlocked',
            freeLimit: 1,
            unlockedAt: unlock.unlocked_at,
            message: 'Episódio liberado via desbloqueio.'
          };
        }
      }

      // REGRA 4: Bloqueio com cadeado "Desbloquear com Premium"
      return {
        allowed: false,
        accessType: 'paywall_required',
        reason: 'PAYWALL',
        freeLimit: 1,
        episodeNumber,
        message: 'Desbloquear com Premium'
      };
    }

    // ==================== 4. TESTE 3 DIAS GRÁTIS & MONETIZAÇÃO ====================
    activateFreeTrial(userId) {
      if (!userId) throw new Error('Faça login para ativar seu teste de 3 dias grátis.');

      const existingTrial = this.db.table('subscriptions').findOne(s => s.user_id === userId && s.is_trial);
      if (existingTrial) {
        throw new Error('Você já utilizou o teste gratuito de 3 dias nesta conta.');
      }

      const now = new Date();
      const trialEndDate = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 dias

      const sub = this.db.table('subscriptions').insert({
        user_id: userId,
        plan_id: 'plan-trial',
        status: 'active',
        is_trial: true,
        start_date: now.toISOString(),
        end_date: trialEndDate.toISOString(),
        auto_renew: false,
        gateway: 'trial'
      });

      return {
        success: true,
        expiresAt: trialEndDate.toISOString(),
        message: 'Parabéns! Seus 3 dias de acesso VIP grátis foram ativados com sucesso!'
      };
    }

    getSubscriptionPlans() {
      return this.db.table('subscription_plans').find(p => p.is_active && p.id !== 'plan-trial');
    }

    createCheckoutOrder(userId, planId, paymentMethod) {
      const user = this.db.table('users').findById(userId);
      if (!user) throw new Error('Usuário não autenticado.');

      const plan = this.db.table('subscription_plans').findById(planId);
      if (!plan) throw new Error('Plano de assinatura não encontrado.');

      const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const now = new Date().toISOString();

      const payment = this.db.table('payments').insert({
        id: txId,
        user_id: userId,
        plan_id: planId,
        amount: plan.price,
        status: 'pending',
        method: paymentMethod || 'pix',
        pix_code: paymentMethod === 'pix' ? `00020126580014br.gov.bcb.pix0136${txId}520400005303986540${plan.price.toFixed(2)}5802BR5915DRAMIX STREAM6009SAO PAULO62070503***6304` : null,
        created_at: now
      });

      return {
        transactionId: txId,
        plan,
        amount: plan.price,
        paymentMethod: paymentMethod || 'pix',
        pixCode: payment.pix_code,
        pixQrData: payment.pix_code,
        status: 'pending'
      };
    }

    confirmPayment(transactionId) {
      const payment = this.db.table('payments').findById(transactionId);
      if (!payment) throw new Error('Transação não encontrada.');

      if (payment.status === 'paid') {
        return { success: true, message: 'Pagamento já confirmado.' };
      }

      const plan = this.db.table('subscription_plans').findById(payment.plan_id);
      if (!plan) throw new Error('Plano associado inválido.');

      const now = new Date();
      const endDate = new Date(now.getTime() + (plan.duration_days * 24 * 60 * 60 * 1000));

      this.db.table('payments').update(transactionId, {
        status: 'paid',
        paid_at: now.toISOString()
      });

      const existingSub = this.db.table('subscriptions').findOne(s => s.user_id === payment.user_id);
      if (existingSub) {
        this.db.table('subscriptions').update(existingSub.id, {
          plan_id: plan.id,
          status: 'active',
          is_trial: false,
          start_date: now.toISOString(),
          end_date: endDate.toISOString(),
          auto_renew: true,
          gateway: payment.method,
          transaction_id: transactionId
        });
      } else {
        this.db.table('subscriptions').insert({
          user_id: payment.user_id,
          plan_id: plan.id,
          status: 'active',
          is_trial: false,
          start_date: now.toISOString(),
          end_date: endDate.toISOString(),
          auto_renew: true,
          gateway: payment.method,
          transaction_id: transactionId
        });
      }

      return {
        success: true,
        transactionId,
        planName: plan.name,
        expiresAt: endDate.toISOString(),
        message: 'Pagamento confirmado! Acesso DRAMIX Premium liberado com sucesso.'
      };
    }

    cancelSubscription(userId) {
      const sub = this.db.table('subscriptions').findOne(s => s.user_id === userId && s.status === 'active');
      if (!sub) throw new Error('Nenhuma assinatura ativa encontrada para cancelamento.');

      this.db.table('subscriptions').update(sub.id, {
        auto_renew: false
      });

      return {
        success: true,
        message: 'Renovação automática desativada. Seu acesso Premium continua até o fim do ciclo vigente.',
        expiresAt: sub.end_date
      };
    }

    // ==================== 5. ANÚNCIOS RECOMPENSADOS (1 A CADA 24 HORAS) ====================
    checkRewardedAdEligibility(userId) {
      if (!userId) return { eligible: false, reason: 'Usuário não autenticado.' };

      const userAdUnlocks = this.db.table('rewarded_ad_unlocks')
        .find(u => u.user_id === userId && u.completed === true)
        .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime());

      if (userAdUnlocks.length === 0) return { eligible: true, cooldownSeconds: 0 };

      const lastUnlock = userAdUnlocks[0];
      const lastTime = new Date(lastUnlock.unlocked_at).getTime();
      const elapsedMs = Date.now() - lastTime;
      const cooldownMs = 24 * 60 * 60 * 1000;

      if (elapsedMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        return {
          eligible: false,
          remainingSeconds,
          formattedRemaining: `${hours}h ${minutes}m`,
          nextAvailableAt: new Date(lastTime + cooldownMs).toISOString(),
          message: 'Você já utilizou seu desbloqueio com anúncio de hoje.\nAssine o DRAMIX Premium para maratonar sem travas.'
        };
      }

      return { eligible: true, cooldownSeconds: 0 };
    }

    completeRewardedAdUnlock(userId, seriesId, episodeId, adVerificationPayload) {
      const eligibility = this.checkRewardedAdEligibility(userId);
      if (!eligibility.eligible) {
        throw new Error(eligibility.message || 'Desbloqueio não permitido antes do período de 24 horas.');
      }

      const now = new Date().toISOString();
      this.db.table('rewarded_ad_unlocks').insert({
        user_id: userId,
        episode_id: episodeId,
        ad_token: (adVerificationPayload && adVerificationPayload.token) || `token_${Date.now()}`,
        completed: true,
        unlocked_at: now
      });

      this.db.table('episode_unlocks').insert({
        user_id: userId,
        series_id: seriesId,
        episode_id: episodeId,
        unlock_type: 'rewarded_ad',
        unlocked_at: now
      });

      return { success: true, message: 'Episódio desbloqueado com sucesso!' };
    }

    // ==================== 6. HISTÓRICO & CONTINUE ASSISTINDO ====================
    saveWatchProgress(userId, seriesId, episodeId, progressSeconds, durationSeconds) {
      if (!userId || !seriesId || !episodeId) return;
      const completed = progressSeconds >= (durationSeconds * 0.9);
      const now = new Date().toISOString();

      const existing = this.db.table('watch_history').findOne(w => w.user_id === userId && w.series_id === seriesId);
      if (existing) {
        this.db.table('watch_history').update(existing.id, {
          episode_id: episodeId,
          progress_seconds: Math.round(progressSeconds),
          duration_seconds: Math.round(durationSeconds),
          completed,
          updated_at: now
        });
      } else {
        this.db.table('watch_history').insert({
          user_id: userId,
          series_id: seriesId,
          episode_id: episodeId,
          progress_seconds: Math.round(progressSeconds),
          duration_seconds: Math.round(durationSeconds),
          completed,
          updated_at: now
        });
      }
    }

    getContinueWatching(userId) {
      if (!userId) return [];
      const history = this.db.table('watch_history')
        .find(w => w.user_id === userId)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      return history.map(item => {
        const series = this.db.table('series').findById(item.series_id);
        const episode = this.db.table('episodes').findById(item.episode_id);
        if (!series || !episode) return null;

        const progressPercent = Math.min(100, Math.round((item.progress_seconds / (item.duration_seconds || 1)) * 100));
        return {
          series,
          episode,
          progressSeconds: item.progress_seconds,
          durationSeconds: item.duration_seconds,
          progressPercent,
          updatedAt: item.updated_at
        };
      }).filter(Boolean);
    }

    // ==================== 7. MINHA LISTA & SUGESTÕES ====================
    toggleFavorite(userId, seriesId) {
      if (!userId) throw new Error('Faça login para salvar minisséries na sua lista.');
      const existing = this.db.table('favorites').findOne(f => f.user_id === userId && f.series_id === seriesId);
      if (existing) {
        this.db.table('favorites').delete(existing.id);
        return { isFavorite: false };
      } else {
        this.db.table('favorites').insert({ user_id: userId, series_id: seriesId });
        return { isFavorite: true };
      }
    }

    isFavorite(userId, seriesId) {
      if (!userId) return false;
      return !!this.db.table('favorites').findOne(f => f.user_id === userId && f.series_id === seriesId);
    }

    getFavorites(userId) {
      if (!userId) return [];
      const favs = this.db.table('favorites').find(f => f.user_id === userId);
      return favs.map(f => this.db.table('series').findById(f.series_id)).filter(Boolean);
    }

    getSuggestionsForEmptyList(limit = 3) {
      const all = this.db.table('series').find(s => s.is_published);
      return [...all].sort((a, b) => (b.views_count || 0) - (a.views_count || 0)).slice(0, limit);
    }

    // ==================== 8. COLEÇÕES, RANKINGS & PARA VOCÊ ====================
    getCollections() {
      const cols = this.db.table('collections').all();
      return cols.map(c => {
        const series = (c.seriesIds || []).map(id => this.db.table('series').findById(id)).filter(Boolean);
        return {
          ...c,
          series
        };
      });
    }

    getCollectionById(collectionId) {
      const col = this.db.table('collections').findById(collectionId);
      if (!col) return null;
      const series = (col.seriesIds || []).map(id => this.db.table('series').findById(id)).filter(Boolean);
      return { ...col, series };
    }

    getRankingsData() {
      const all = this.db.table('series').find(s => s.is_published);

      // Top 10 da Semana no Brasil ordenado por weekly_rank
      const top10 = [...all].sort((a, b) => (a.weekly_rank || 99) - (b.weekly_rank || 99));

      // Mais Maratonados ordenado por marathon_score
      const mostMarathoned = [...all].sort((a, b) => (b.marathon_score || 0) - (a.marathon_score || 0));

      // Em Alta Hoje ordenado por views_count
      const trendingToday = [...all].sort((a, b) => (b.views_count || 0) - (a.views_count || 0));

      return {
        top10WeeklyBrasil: top10.slice(0, 10),
        mostMarathoned: mostMarathoned.slice(0, 10),
        trendingToday: trendingToday.slice(0, 10)
      };
    }

    getForYou(userId) {
      const all = this.db.table('series').find(s => s.is_published);
      const favs = this.getFavorites(userId);
      const history = this.getContinueWatching(userId);

      const preferredGenres = new Set();
      favs.forEach(f => (f.genres || []).forEach(g => preferredGenres.add(g)));
      history.forEach(h => (h.series.genres || []).forEach(g => preferredGenres.add(g)));

      let recommendations = [];
      if (preferredGenres.size > 0) {
        recommendations = all.filter(s => 
          (s.genres || []).some(g => preferredGenres.has(g)) &&
          !favs.some(f => f.id === s.id)
        );
      }

      if (recommendations.length < 4) {
        recommendations = [...all].sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
      }

      return recommendations;
    }

    // ==================== 9. CATÁLOGO HOME & DETALHES ====================
    getFeaturedSeries() {
      const featured = this.db.table('series').findOne(s => s.is_featured && s.is_published);
      return featured || this.db.table('series').findOne(s => s.is_published) || null;
    }

    getHomeCatalog(userId) {
      const allSeries = this.db.table('series').find(s => s.is_published);
      const sections = this.db.table('homepage_sections').find(sec => sec.is_enabled).sort((a, b) => a.order - b.order);

      const rows = [];
      for (const sec of sections) {
        if (sec.row_type === 'hero' || sec.row_type === 'tropes_bar') continue;

        if (sec.row_type === 'continue_watching') {
          const cwList = this.getContinueWatching(userId);
          if (cwList.length > 0) {
            rows.push({
              id: sec.id,
              title: sec.title,
              type: 'continue_watching',
              items: cwList
            });
          }
          continue;
        }

        if (sec.row_type === 'recommended') {
          const recs = this.getForYou(userId);
          rows.push({
            id: sec.id,
            title: sec.title,
            type: 'standard',
            items: recs
          });
          continue;
        }

        let items = [];
        switch (sec.filter_key) {
          case 'new_releases':
            items = [...allSeries].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
          case 'popular':
            items = [...allSeries].sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
            break;
          case 'genre_romance':
            items = allSeries.filter(s => s.genres.includes('Romance'));
            break;
          case 'genre_drama_vinganca':
            items = allSeries.filter(s => s.genres.includes('Drama') || s.genres.includes('Vingança'));
            break;
          case 'genre_acao_suspense':
            items = allSeries.filter(s => s.genres.includes('Ação') || s.genres.includes('Suspense'));
            break;
          case 'genre_fantasia':
            items = allSeries.filter(s => s.genres.includes('Fantasia'));
            break;
          default:
            items = allSeries;
        }

        if (items.length > 0) {
          rows.push({
            id: sec.id,
            title: sec.title,
            type: 'standard',
            items
          });
        }
      }

      return {
        featured: this.getFeaturedSeries(),
        continueWatching: this.getContinueWatching(userId),
        rows
      };
    }

    getSeriesDetails(seriesId, userId) {
      const series = this.db.table('series').findById(seriesId);
      if (!series) return null;

      const episodes = this.db.table('episodes')
        .find(e => e.series_id === seriesId)
        .sort((a, b) => a.episode_number - b.episode_number);

      const episodesWithAccess = episodes.map(ep => {
        const access = this.validateEpisodeAccess(userId, seriesId, ep.episode_number);
        return {
          ...ep,
          hasAccess: access.allowed,
          accessType: access.accessType,
          isFreeByDefault: ep.episode_number === 1
        };
      });

      return {
        series,
        episodes: episodesWithAccess,
        isFavorite: this.isFavorite(userId, seriesId),
        totalEpisodes: episodes.length,
        freeEpisodesCount: 1
      };
    }

    // ==================== 10. ADMIN OWNER ====================
    requireOwner(userId) {
      const user = this.db.table('users').findById(userId);
      if (!user || user.role !== 'owner') {
        throw new Error('Acesso negado. Apenas administradores DRAMIX têm acesso.');
      }
    }

    getAdminStats(userId) {
      this.requireOwner(userId);
      const users = this.db.table('users').all();
      const now = new Date().toISOString();
      const activeSubs = this.db.table('subscriptions').find(s => s.status === 'active' && s.end_date > now);
      const paidPayments = this.db.table('payments').find(p => p.status === 'paid');
      const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const adUnlocks = this.db.table('rewarded_ad_unlocks').all();
      const allSeries = this.db.table('series').all();
      const totalViews = allSeries.reduce((sum, s) => sum + (s.views_count || 0), 0);

      return {
        totalUsers: users.length,
        activeSubscribers: activeSubs.length,
        freeUsers: Math.max(0, users.length - activeSubs.length),
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalViews,
        totalRewardedAdUnlocks: adUnlocks.length
      };
    }
  }

  root.DramixBackendService = DramixBackendService;
  root.dramixAPI = new DramixBackendService(root.dramixDB);
})(typeof window !== 'undefined' ? window : global);
