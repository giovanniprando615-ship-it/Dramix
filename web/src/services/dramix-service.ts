import type {
  AdEligibility, AdminStats, AgeRange, AppSettings, BundleQuote, CheckoutOrder, CoinPackage, CoinTransaction,
  ContinueItem, DailyGiftStatus, Episode, EpisodeAccess, HomeData, HomeRow, Payment, PaymentMethod,
  Series, SeriesDetails, SessionUser, SubscriptionPlan, SupportTicket, Tables
} from '@/domain/types';
import { LocalStore, type KeyValueStorage } from './local-store';

/**
 * Regras de negócio do DRAMIX.
 *
 * Todos os métodos são assíncronos de propósito: a interface já trata carregamento e erro,
 * então trocar esta implementação local pelo Supabase não muda nenhuma tela.
 *
 * shortcut: roda no navegador sobre localStorage, então um usuário técnico consegue alterar
 * o próprio saldo. Antes de cobrar dinheiro real, as funções de moedas e pagamentos precisam
 * rodar no servidor (supabase/migrations/0002_coin_functions.sql).
 */

export class AppError extends Error {
  constructor(message: string, public code: string = 'ERROR', public meta: Record<string, number> = {}) {
    super(message);
  }
}

const DAY_MS = 86_400_000;
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
const SESSION_KEY = 'dramix_web_session_v1';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const round2 = (n: number) => Math.round(n * 100) / 100;
const norm = (v: string | undefined | null) => (v ?? '').trim().toLowerCase();
export const localDateKey = (d = new Date()) => d.toLocaleDateString('sv-SE'); // AAAA-MM-DD no fuso do usuário

export class DramixService {
  readonly store: LocalStore;

  constructor(private storage: KeyValueStorage, private now: () => Date = () => new Date()) {
    this.store = new LocalStore(storage);
  }

  // ================= Utilitários =================
  settings(): AppSettings {
    return this.store.byId('app_settings', 'settings') as AppSettings;
  }

  private findUserByIdent(ident: string) {
    const clean = norm(ident);
    if (!clean) return undefined;
    return this.store.findOne('users', u => (!!u.email && u.email === clean) || (!!u.phone && u.phone === clean));
  }

  private profile(userId: string) {
    return this.store.findOne('user_profiles', p => p.user_id === userId);
  }

  private sessionUserId(): string | null {
    try {
      const raw = this.storage.getItem(SESSION_KEY);
      if (!raw) return null;
      const { userId } = JSON.parse(raw) as { userId: string };
      return this.store.byId('users', userId) ? userId : null;
    } catch {
      return null;
    }
  }

  private requireUser(): string {
    const id = this.sessionUserId();
    if (!id) throw new AppError('Entre na sua conta para continuar.', 'AUTH_REQUIRED');
    return id;
  }

  private requireOwner(): string {
    const id = this.requireUser();
    if (this.store.byId('users', id)?.role !== 'owner') throw new AppError('Acesso restrito à administração do DRAMIX.', 'FORBIDDEN');
    return id;
  }

  // ================= Sessão e conta =================
  async getSession(): Promise<SessionUser | null> {
    const id = this.sessionUserId();
    if (!id) return null;
    const user = this.store.byId('users', id)!;
    const profile = this.profile(id);
    const sub = this.activeSubscription(id);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: profile?.avatar || user.avatar || DEFAULT_AVATAR,
      role: user.role,
      isPremium: !!sub,
      subscription: sub,
      coins: this.balance(id),
      preferredGenres: profile?.preferred_genres ?? [],
      ageRange: profile?.age_range ?? null,
      onboarded: !!profile?.onboarded
    };
  }

  private setSession(userId: string) {
    this.storage.setItem(SESSION_KEY, JSON.stringify({ userId, at: Date.now() }));
  }

  private createUser(input: { name: string; email: string; phone: string; password: string }) {
    const user = this.store.insert('users', {
      name: input.name.trim() || 'Espectador',
      email: input.email,
      phone: input.phone,
      // shortcut: senha sem hash no modo local; em produção quem guarda a senha é o Supabase Auth
      password_hash: input.password,
      avatar: DEFAULT_AVATAR,
      role: 'user'
    });
    this.store.insert('user_profiles', { user_id: user.id, avatar: DEFAULT_AVATAR, preferred_genres: [], age_range: null, onboarded: false });
    const bonus = this.settings().welcome_bonus_coins;
    if (bonus > 0) this.addCoins(user.id, bonus, 'welcome_bonus', 'Bônus de boas-vindas', 'welcome_bonus');
    return user;
  }

  async register(input: { name: string; identifier: string; password: string }): Promise<SessionUser> {
    const ident = norm(input.identifier);
    if (!ident) throw new AppError('Informe um e-mail ou celular.', 'VALIDATION');
    const isEmail = ident.includes('@');
    if (isEmail && !EMAIL_RE.test(ident)) throw new AppError('Informe um e-mail válido, como nome@exemplo.com.', 'VALIDATION');
    if (!isEmail && !/^\+?\d{10,14}$/.test(ident.replace(/[\s()-]/g, ''))) throw new AppError('Informe um celular com DDD, só números.', 'VALIDATION');
    if (input.password.length < 6) throw new AppError('A senha precisa ter pelo menos 6 caracteres.', 'VALIDATION');
    const phone = isEmail ? '' : ident.replace(/[\s()-]/g, '');
    if (this.findUserByIdent(isEmail ? ident : phone)) throw new AppError('Este e-mail ou celular já tem uma conta. Entre com ele.', 'DUPLICATE');

    const user = this.createUser({ name: input.name, email: isEmail ? ident : '', phone, password: input.password });
    this.setSession(user.id);
    return (await this.getSession())!;
  }

  async login(input: { identifier: string; password: string }): Promise<SessionUser> {
    const ident = norm(input.identifier).replace(/^(\+?\d[\d\s()-]+)$/, m => m.replace(/[\s()-]/g, ''));
    const user = this.findUserByIdent(ident);
    if (!user || user.password_hash !== input.password) throw new AppError('E-mail/celular ou senha incorretos.', 'BAD_CREDENTIALS');
    this.setSession(user.id);
    return (await this.getSession())!;
  }

  async logout(): Promise<void> {
    this.storage.removeItem(SESSION_KEY);
  }

  async requestPasswordReset(identifier: string): Promise<string> {
    if (!this.findUserByIdent(identifier)) throw new AppError('Não encontramos uma conta com este e-mail ou celular.', 'NOT_FOUND');
    // Em produção: supabase.auth.resetPasswordForEmail()
    return `Enviamos as instruções de redefinição para ${norm(identifier)}.`;
  }

  async updateProfile(input: { name?: string; identifier?: string; avatar?: string; newPassword?: string }): Promise<SessionUser> {
    const id = this.requireUser();
    const patch: Partial<Tables['users'][number]> = {};
    if (input.name?.trim()) patch.name = input.name.trim();
    if (input.identifier?.trim()) {
      const ident = norm(input.identifier);
      const other = this.findUserByIdent(ident);
      if (other && other.id !== id) throw new AppError('Este e-mail ou celular já pertence a outra conta.', 'DUPLICATE');
      if (ident.includes('@')) {
        if (!EMAIL_RE.test(ident)) throw new AppError('E-mail inválido.', 'VALIDATION');
        patch.email = ident;
      } else patch.phone = ident;
    }
    if (input.newPassword) {
      if (input.newPassword.length < 6) throw new AppError('A nova senha precisa ter pelo menos 6 caracteres.', 'VALIDATION');
      patch.password_hash = input.newPassword;
    }
    this.store.update('users', id, patch);
    if (input.avatar) {
      const p = this.profile(id);
      if (p) this.store.update('user_profiles', p.id, { avatar: input.avatar });
    }
    return (await this.getSession())!;
  }

  async savePreferences(input: { ageRange: AgeRange | null; genres: string[] }): Promise<SessionUser> {
    const id = this.requireUser();
    const p = this.profile(id);
    const patch = { age_range: input.ageRange, preferred_genres: input.genres, onboarded: true };
    if (p) this.store.update('user_profiles', p.id, patch);
    else this.store.insert('user_profiles', { user_id: id, avatar: DEFAULT_AVATAR, ...patch });
    return (await this.getSession())!;
  }

  async deleteAccount(): Promise<void> {
    const id = this.requireUser();
    if (this.store.byId('users', id)?.role === 'owner') throw new AppError('A conta de administração não pode ser excluída por aqui.', 'FORBIDDEN');
    const mine = (r: { user_id: string | null }) => r.user_id === id;
    for (const t of ['user_profiles', 'favorites', 'watch_history', 'episode_unlocks', 'rewarded_ad_unlocks', 'coin_transactions', 'subscriptions'] as const) {
      this.store.remove(t, mine as never);
    }
    // Registros de pagamento ficam (obrigação fiscal), desvinculados da pessoa
    this.store.find('payments', mine).forEach(p => this.store.update('payments', p.id, { user_id: 'deleted' }));
    this.store.remove('users', u => u.id === id);
    await this.logout();
  }

  // ================= Moedas =================
  private balance(userId: string): number {
    return this.store.find('coin_transactions', t => t.user_id === userId).reduce((s, t) => s + t.amount, 0);
  }

  /** Lança crédito (+) ou débito (-). A mesma `ref` nunca é lançada duas vezes: é o que impede bônus e cobrança em dobro. */
  private addCoins(userId: string, amount: number, type: CoinTransaction['type'], description: string, ref: string | null) {
    if (ref) {
      const dup = this.store.findOne('coin_transactions', t => t.user_id === userId && t.ref === ref);
      if (dup) return { duplicate: true, tx: dup };
    }
    const balance = this.balance(userId);
    if (amount < 0 && balance + amount < 0) {
      throw new AppError(`Você precisa de ${-amount} moedas e tem ${balance}.`, 'INSUFFICIENT_COINS', { missing: -amount - balance });
    }
    const tx = this.store.insert('coin_transactions', { user_id: userId, amount, type, description, ref, balance_after: balance + amount });
    return { duplicate: false, tx };
  }

  async getWallet(): Promise<{ balance: number; transactions: CoinTransaction[]; gift: DailyGiftStatus }> {
    const id = this.requireUser();
    return {
      balance: this.balance(id),
      transactions: this.store.find('coin_transactions', t => t.user_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)),
      gift: this.giftStatus(id)
    };
  }

  private giftStatus(userId: string | null): DailyGiftStatus {
    const amount = this.settings().daily_gift_coins;
    if (!userId) return { available: false, amount, nextAvailableAt: null };
    const today = `daily_gift:${localDateKey(this.now())}`;
    const claimed = !!this.store.findOne('coin_transactions', t => t.user_id === userId && t.ref === today);
    const tomorrow = new Date(this.now());
    tomorrow.setHours(24, 0, 0, 0);
    return { available: amount > 0 && !claimed, amount, nextAvailableAt: claimed ? tomorrow.toISOString() : null };
  }

  async getDailyGift(): Promise<DailyGiftStatus> {
    return this.giftStatus(this.sessionUserId());
  }

  async claimDailyGift(): Promise<{ amount: number; balance: number }> {
    const id = this.requireUser();
    const status = this.giftStatus(id);
    if (!status.available) throw new AppError('Você já resgatou o presente de hoje. Volte amanhã.', 'ALREADY_CLAIMED');
    this.addCoins(id, status.amount, 'daily_gift', 'Presente diário', `daily_gift:${localDateKey(this.now())}`);
    return { amount: status.amount, balance: this.balance(id) };
  }

  // ================= Acesso aos episódios =================
  private activeSubscription(userId: string) {
    const nowIso = this.now().toISOString();
    const sub = this.store.findOne('subscriptions', s => s.user_id === userId && s.status === 'active' && s.end_date > nowIso);
    if (!sub) return null;
    return { ...sub, plan_name: this.store.byId('subscription_plans', sub.plan_id)?.name ?? 'Premium' };
  }

  freeLimit(series: Series): number {
    return Number.isFinite(series.free_episodes_count) ? series.free_episodes_count : this.settings().default_free_episodes;
  }

  price(series: Series): number {
    return series.price_coins ?? this.settings().episode_price_coins;
  }

  private access(userId: string | null, series: Series, episode: Episode): EpisodeAccess {
    const freeLimit = this.freeLimit(series);
    const priceCoins = this.price(series);
    const base = { freeLimit, priceCoins };
    if (episode.episode_number <= freeLimit) return { ...base, allowed: true, accessType: 'free' };
    if (!userId) return { ...base, allowed: false, accessType: 'auth_required' };
    if (this.activeSubscription(userId)) return { ...base, allowed: true, accessType: 'premium' };
    if (this.store.findOne('episode_unlocks', u => u.user_id === userId && u.episode_id === episode.id)) return { ...base, allowed: true, accessType: 'unlocked' };
    return { ...base, allowed: false, accessType: 'paywall' };
  }

  private episodesOf(seriesId: string) {
    return this.store.find('episodes', e => e.series_id === seriesId).sort((a, b) => a.episode_number - b.episode_number);
  }

  private recordUnlock(userId: string, seriesId: string, episodeId: string, type: 'coins' | 'coins_bundle' | 'rewarded_ad') {
    if (!this.store.findOne('episode_unlocks', u => u.user_id === userId && u.episode_id === episodeId)) {
      this.store.insert('episode_unlocks', { user_id: userId, series_id: seriesId, episode_id: episodeId, unlock_type: type });
    }
  }

  async getEpisodePlayback(seriesId: string, episodeNumber: number): Promise<{ series: Series; episode: Episode; access: EpisodeAccess; episodes: (Episode & { access: EpisodeAccess })[] }> {
    const series = this.store.byId('series', seriesId);
    if (!series) throw new AppError('Minissérie não encontrada.', 'NOT_FOUND');
    const userId = this.sessionUserId();
    const episodes = this.episodesOf(seriesId).map(e => ({ ...e, access: this.access(userId, series, e) }));
    const episode = episodes.find(e => e.episode_number === episodeNumber) ?? episodes[0];
    if (!episode) throw new AppError('Esta minissérie ainda não tem episódios.', 'NOT_FOUND');
    // shortcut: a URL do vídeo vai junto mesmo quando bloqueado; em produção, URL assinada só depois da checagem
    return { series, episode, access: episode.access, episodes };
  }

  async unlockEpisode(seriesId: string, episodeNumber: number): Promise<{ alreadyUnlocked: boolean; balance: number; spent: number }> {
    const userId = this.requireUser();
    const series = this.store.byId('series', seriesId);
    const episode = this.store.findOne('episodes', e => e.series_id === seriesId && e.episode_number === episodeNumber);
    if (!series || !episode) throw new AppError('Episódio não encontrado.', 'NOT_FOUND');
    if (this.access(userId, series, episode).allowed) return { alreadyUnlocked: true, balance: this.balance(userId), spent: 0 };
    const cost = this.price(series);
    this.addCoins(userId, -cost, 'episode_unlock', `${series.title} — episódio ${episodeNumber}`, `unlock:${episode.id}`);
    this.recordUnlock(userId, seriesId, episode.id, 'coins');
    return { alreadyUnlocked: false, balance: this.balance(userId), spent: cost };
  }

  private bundleQuote(userId: string | null, series: Series): BundleQuote {
    const locked = this.episodesOf(series.id).filter(e => !this.access(userId, series, e).allowed);
    const unitPrice = this.price(series);
    const fullPrice = locked.length * unitPrice;
    const discount = this.settings().series_bundle_discount_percent;
    return {
      lockedCount: locked.length,
      lockedEpisodeIds: locked.map(e => e.id),
      unitPrice,
      fullPrice,
      discount,
      price: Math.ceil((fullPrice * (100 - discount)) / 100)
    };
  }

  async unlockSeries(seriesId: string): Promise<{ unlocked: number; balance: number; spent: number }> {
    const userId = this.requireUser();
    const series = this.store.byId('series', seriesId);
    if (!series) throw new AppError('Minissérie não encontrada.', 'NOT_FOUND');
    const q = this.bundleQuote(userId, series);
    if (q.lockedCount === 0) return { unlocked: 0, balance: this.balance(userId), spent: 0 };
    this.addCoins(userId, -q.price, 'series_unlock', `${series.title} — ${q.lockedCount} episódios`, `bundle:${seriesId}:${q.lockedEpisodeIds.join(',')}`);
    q.lockedEpisodeIds.forEach(id => this.recordUnlock(userId, seriesId, id, 'coins_bundle'));
    return { unlocked: q.lockedCount, balance: this.balance(userId), spent: q.price };
  }

  private adEligibility(userId: string): AdEligibility {
    const last = this.store.find('rewarded_ad_unlocks', u => u.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (!last) return { eligible: true, remainingSeconds: 0 };
    const cooldown = this.settings().rewarded_ad_cooldown_hours * 3_600_000;
    const elapsed = this.now().getTime() - new Date(last.created_at).getTime();
    return elapsed >= cooldown ? { eligible: true, remainingSeconds: 0 } : { eligible: false, remainingSeconds: Math.ceil((cooldown - elapsed) / 1000) };
  }

  async getAdEligibility(): Promise<AdEligibility> {
    const id = this.sessionUserId();
    return id ? this.adEligibility(id) : { eligible: false, remainingSeconds: 0 };
  }

  async unlockWithAd(seriesId: string, episodeNumber: number): Promise<void> {
    const userId = this.requireUser();
    if (!this.adEligibility(userId).eligible) throw new AppError('O desbloqueio com anúncio de hoje já foi usado.', 'AD_COOLDOWN');
    const episode = this.store.findOne('episodes', e => e.series_id === seriesId && e.episode_number === episodeNumber);
    if (!episode) throw new AppError('Episódio não encontrado.', 'NOT_FOUND');
    // Em produção: só desbloquear depois da verificação server-side (SSV) da rede de anúncios
    this.store.insert('rewarded_ad_unlocks', { user_id: userId, episode_id: episode.id, created_at: this.now().toISOString() });
    this.recordUnlock(userId, seriesId, episode.id, 'rewarded_ad');
  }

  // ================= Catálogo =================
  private visibleSeries(userId: string | null): Series[] {
    const minor = userId ? this.profile(userId)?.age_range === '13-17' : false;
    return this.store.find('series', s => s.is_published && !(minor && s.content_rating === '18+'));
  }

  private continueWatching(userId: string | null): ContinueItem[] {
    if (!userId) return [];
    return this.store.find('watch_history', w => w.user_id === userId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .flatMap(w => {
        const series = this.store.byId('series', w.series_id);
        const episode = this.store.byId('episodes', w.episode_id);
        if (!series || !episode || !series.is_published) return [];
        return [{
          series, episode, progressSeconds: w.progress_seconds, updatedAt: w.updated_at,
          progressPercent: Math.min(100, Math.round((w.progress_seconds / Math.max(1, w.duration_seconds)) * 100))
        }];
      });
  }

  /** Gêneros do onboarding pesam 3, dos favoritos 2 e do histórico 1. Empate desempata por audiência. */
  private recommendations(userId: string | null): Series[] {
    const all = this.visibleSeries(userId);
    const byViews = [...all].sort((a, b) => b.views_count - a.views_count);
    if (!userId) return byViews;
    const w = new Map<string, number>();
    const bump = (g: string, n: number) => w.set(g, (w.get(g) ?? 0) + n);
    this.profile(userId)?.preferred_genres.forEach(g => bump(g, 3));
    const favIds = new Set(this.store.find('favorites', f => f.user_id === userId).map(f => f.series_id));
    all.filter(s => favIds.has(s.id)).forEach(s => s.genres.forEach(g => bump(g, 2)));
    this.continueWatching(userId).forEach(c => c.series.genres.forEach(g => bump(g, 1)));
    const score = (s: Series) => s.genres.reduce((sum, g) => sum + (w.get(g) ?? 0), 0);
    const ranked = all.filter(s => !favIds.has(s.id)).sort((a, b) => score(b) - score(a) || b.views_count - a.views_count);
    return ranked.length >= 4 ? ranked : byViews;
  }

  async getHome(): Promise<HomeData> {
    const userId = this.sessionUserId();
    const all = this.visibleSeries(userId);
    const sections = this.store.find('home_sections', s => s.is_enabled).sort((a, b) => a.sort_order - b.sort_order);
    const rows: HomeRow[] = [];
    for (const sec of sections) {
      let items: Series[] = [];
      if (sec.row_type === 'top10') items = all.filter(s => s.weekly_rank).sort((a, b) => a.weekly_rank! - b.weekly_rank!).slice(0, 10);
      else if (sec.row_type === 'recommended') items = this.recommendations(userId);
      else if (sec.row_type === 'row') {
        if (sec.filter_key === 'new') items = [...all].sort((a, b) => b.created_at.localeCompare(a.created_at));
        else if (sec.filter_key?.startsWith('genre:')) {
          const gs = sec.filter_key.slice(6).split(',');
          items = all.filter(s => s.genres.some(g => gs.includes(g)));
        } else items = all;
      } else continue;
      if (items.length) rows.push({ id: sec.id, title: sec.title, kind: sec.row_type === 'top10' ? 'top10' : 'row', items });
    }
    const featuredOn = sections.some(s => s.row_type === 'hero');
    const featured = featuredOn
      ? [...all.filter(s => s.is_featured), ...[...all].filter(s => !s.is_featured).sort((a, b) => (a.weekly_rank ?? 99) - (b.weekly_rank ?? 99))].slice(0, 5)
      : [];
    return {
      featured,
      continueWatching: sections.some(s => s.row_type === 'continue_watching') ? this.continueWatching(userId) : [],
      rows
    };
  }

  async getCatalog(): Promise<{ series: Series[]; genres: string[] }> {
    return {
      series: this.visibleSeries(this.sessionUserId()),
      genres: this.store.all('genres').map(g => g.name)
    };
  }

  async getFeed(): Promise<Series[]> {
    return this.recommendations(this.sessionUserId()).filter(s => s.trailer_url);
  }

  async getSeries(seriesId: string): Promise<SeriesDetails> {
    const series = this.store.byId('series', seriesId);
    const userId = this.sessionUserId();
    if (!series || !this.visibleSeries(userId).some(s => s.id === seriesId)) throw new AppError('Minissérie não encontrada.', 'NOT_FOUND');
    const episodes = this.episodesOf(seriesId).map(e => ({ ...e, access: this.access(userId, series, e) }));
    const premium = !!userId && !!this.activeSubscription(userId);
    const bundle = userId && !premium ? this.bundleQuote(userId, series) : null;
    return {
      series,
      episodes,
      isFavorite: !!userId && !!this.store.findOne('favorites', f => f.user_id === userId && f.series_id === seriesId),
      freeEpisodesCount: this.freeLimit(series),
      priceCoins: this.price(series),
      bundle: bundle && bundle.lockedCount > 1 ? bundle : null,
      progress: this.continueWatching(userId).find(c => c.series.id === seriesId) ?? null
    };
  }

  async saveProgress(seriesId: string, episodeId: string, seconds: number, duration: number): Promise<void> {
    const userId = this.sessionUserId();
    if (!userId || !duration) return;
    const fields = {
      episode_id: episodeId,
      progress_seconds: Math.round(seconds),
      duration_seconds: Math.round(duration),
      completed: seconds >= duration * 0.9,
      updated_at: this.now().toISOString()
    };
    const existing = this.store.findOne('watch_history', w => w.user_id === userId && w.series_id === seriesId);
    if (existing) this.store.update('watch_history', existing.id, fields);
    else this.store.insert('watch_history', { user_id: userId, series_id: seriesId, ...fields });
  }

  async clearHistory(): Promise<void> {
    const id = this.requireUser();
    this.store.remove('watch_history', w => w.user_id === id);
  }

  async getLibrary(): Promise<{ favorites: Series[]; history: ContinueItem[]; suggestions: Series[] }> {
    const id = this.requireUser();
    const favIds = this.store.find('favorites', f => f.user_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(f => f.series_id);
    const visible = this.visibleSeries(id);
    return {
      favorites: favIds.map(fid => visible.find(s => s.id === fid)).filter((s): s is Series => !!s),
      history: this.continueWatching(id),
      suggestions: this.recommendations(id).slice(0, 6)
    };
  }

  async toggleFavorite(seriesId: string): Promise<boolean> {
    const id = this.requireUser();
    const existing = this.store.findOne('favorites', f => f.user_id === id && f.series_id === seriesId);
    if (existing) {
      this.store.remove('favorites', f => f.id === existing.id);
      return false;
    }
    this.store.insert('favorites', { user_id: id, series_id: seriesId });
    return true;
  }

  // ================= Loja, assinatura e pagamentos =================
  async getPlans(): Promise<SubscriptionPlan[]> {
    return this.store.find('subscription_plans', p => p.is_active && p.id !== 'plan-trial');
  }

  async getCoinPackages(): Promise<CoinPackage[]> {
    return this.store.find('coin_packages', p => p.is_active).sort((a, b) => a.sort_order - b.sort_order);
  }

  async hasUsedTrial(): Promise<boolean> {
    const id = this.sessionUserId();
    return !!id && !!this.store.findOne('subscriptions', s => s.user_id === id && s.is_trial);
  }

  async startTrial(): Promise<void> {
    const id = this.requireUser();
    if (this.store.findOne('subscriptions', s => s.user_id === id && s.is_trial)) throw new AppError('Você já usou o teste grátis nesta conta.', 'TRIAL_USED');
    if (this.activeSubscription(id)) throw new AppError('Sua conta já tem uma assinatura ativa.', 'ALREADY_PREMIUM');
    const start = this.now();
    this.store.insert('subscriptions', {
      user_id: id, plan_id: 'plan-trial', status: 'active', is_trial: true, auto_renew: false, transaction_id: null,
      start_date: start.toISOString(), end_date: new Date(start.getTime() + 3 * DAY_MS).toISOString()
    });
  }

  private pix(txId: string, amount: number) {
    return `00020126580014br.gov.bcb.pix0136${txId}520400005303986540${amount.toFixed(2)}5802BR5915DRAMIX STREAM6009SAO PAULO62070503***6304`;
  }

  async createOrder(kind: 'subscription' | 'coins', itemId: string, method: PaymentMethod): Promise<CheckoutOrder> {
    const userId = this.requireUser();
    const txId = `tx_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    if (kind === 'coins') {
      const pkg = this.store.byId('coin_packages', itemId);
      if (!pkg?.is_active) throw new AppError('Pacote indisponível.', 'NOT_FOUND');
      const total = pkg.coins + pkg.bonus_coins;
      this.store.insert('payments', {
        id: txId, kind, user_id: userId, plan_id: null, package_id: pkg.id, coins_total: total,
        amount: pkg.price, status: 'pending', method, pix_code: this.pix(txId, pkg.price), paid_at: null
      });
      return {
        transactionId: txId, kind, amount: pkg.price, pixCode: this.pix(txId, pkg.price), title: `${total} moedas`,
        description: pkg.bonus_coins ? `${pkg.coins} moedas + ${pkg.bonus_coins} de bônus. As moedas não expiram.` : 'As moedas não expiram.'
      };
    }
    const plan = this.store.byId('subscription_plans', itemId);
    if (!plan?.is_active || plan.id === 'plan-trial') throw new AppError('Plano indisponível.', 'NOT_FOUND');
    this.store.insert('payments', {
      id: txId, kind, user_id: userId, plan_id: plan.id, package_id: null, coins_total: null,
      amount: plan.price, status: 'pending', method, pix_code: this.pix(txId, plan.price), paid_at: null
    });
    return { transactionId: txId, kind, amount: plan.price, pixCode: this.pix(txId, plan.price), title: `Premium ${plan.name}`, description: plan.description };
  }

  async setOrderMethod(txId: string, method: PaymentMethod): Promise<void> {
    const p = this.store.byId('payments', txId);
    if (p && p.status === 'pending') this.store.update('payments', txId, { method });
  }

  private activatePlan(payment: Payment, plan: SubscriptionPlan, start: Date) {
    const fields = {
      plan_id: plan.id, status: 'active' as const, is_trial: false, auto_renew: true, transaction_id: payment.id,
      start_date: start.toISOString(), end_date: new Date(start.getTime() + plan.duration_days * DAY_MS).toISOString()
    };
    const existing = this.store.findOne('subscriptions', s => s.user_id === payment.user_id);
    if (existing) this.store.update('subscriptions', existing.id, fields);
    else this.store.insert('subscriptions', { user_id: payment.user_id, ...fields });
  }

  /**
   * Confirma um pagamento. Pagamento já confirmado não gera nada de novo.
   * shortcut: chamado pelo navegador (modo de teste). Em produção, só o webhook do gateway chama isto.
   */
  async confirmPayment(txId: string): Promise<{ kind: 'subscription' | 'coins'; message: string; alreadyConfirmed: boolean }> {
    const userId = this.requireUser();
    const payment = this.store.byId('payments', txId);
    if (!payment || payment.user_id !== userId) throw new AppError('Pagamento não encontrado.', 'NOT_FOUND');
    if (payment.status === 'paid') return { kind: payment.kind, message: 'Pagamento já confirmado.', alreadyConfirmed: true };
    const now = this.now();
    this.store.update('payments', txId, { status: 'paid', paid_at: now.toISOString() });
    if (payment.kind === 'coins') {
      this.addCoins(userId, payment.coins_total!, 'purchase', `Compra de ${payment.coins_total} moedas`, `payment:${txId}`);
      return { kind: 'coins', message: `${payment.coins_total} moedas adicionadas à sua carteira.`, alreadyConfirmed: false };
    }
    const plan = this.store.byId('subscription_plans', payment.plan_id!)!;
    this.activatePlan(payment, plan, now);
    return { kind: 'subscription', message: `Premium ${plan.name} ativado. Todos os episódios estão liberados.`, alreadyConfirmed: false };
  }

  async cancelRenewal(): Promise<string> {
    const id = this.requireUser();
    const sub = this.activeSubscription(id);
    if (!sub) throw new AppError('Nenhuma assinatura ativa.', 'NOT_FOUND');
    this.store.update('subscriptions', sub.id, { auto_renew: false });
    return sub.end_date;
  }

  async getPayments(): Promise<Payment[]> {
    const id = this.requireUser();
    return this.store.find('payments', p => p.user_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  /** Confere cada pagamento aprovado e devolve o que faltar (moedas não creditadas, assinatura vigente não ativa). */
  async restorePurchases(): Promise<{ checked: number; coinsRestored: number; subscriptionRestored: boolean }> {
    const id = this.requireUser();
    const paid = this.store.find('payments', p => p.user_id === id && p.status === 'paid');
    let coinsRestored = 0;
    for (const p of paid.filter(p => p.kind === 'coins')) {
      const r = this.addCoins(id, p.coins_total!, 'purchase', `Compra de ${p.coins_total} moedas (restaurada)`, `payment:${p.id}`);
      if (!r.duplicate) coinsRestored += p.coins_total!;
    }
    let subscriptionRestored = false;
    const lastSub = paid.filter(p => p.kind === 'subscription').sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''))[0];
    if (lastSub && !this.activeSubscription(id)) {
      const plan = this.store.byId('subscription_plans', lastSub.plan_id!);
      const paidAt = new Date(lastSub.paid_at!);
      if (plan && paidAt.getTime() + plan.duration_days * DAY_MS > this.now().getTime()) {
        this.activatePlan(lastSub, plan, paidAt);
        subscriptionRestored = true;
      }
    }
    return { checked: paid.length, coinsRestored, subscriptionRestored };
  }

  // ================= Suporte =================
  async createTicket(input: { name: string; email: string; subject: string; message: string }): Promise<void> {
    const email = norm(input.email);
    if (!EMAIL_RE.test(email)) throw new AppError('Informe um e-mail válido para receber a resposta.', 'VALIDATION');
    if (input.message.trim().length < 10) throw new AppError('Descreva o problema com pelo menos 10 caracteres.', 'VALIDATION');
    this.store.insert('support_tickets', {
      user_id: this.sessionUserId(), name: input.name.trim(), email, subject: input.subject, message: input.message.trim(), status: 'open'
    });
  }

  // ================= Administração (Owner) =================
  async getAdminStats(): Promise<AdminStats> {
    this.requireOwner();
    const nowIso = this.now().toISOString();
    const paid = this.store.find('payments', p => p.status === 'paid');
    const sum = (l: Payment[]) => round2(l.reduce((s, p) => s + p.amount, 0));
    const tx = this.store.all('coin_transactions');
    const days: AdminStats['revenueByDay'] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(this.now().getTime() - i * DAY_MS);
      const key = localDateKey(d);
      const ofDay = paid.filter(p => p.paid_at && localDateKey(new Date(p.paid_at)) === key);
      days.push({
        day: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        assinaturas: sum(ofDay.filter(p => p.kind === 'subscription')),
        moedas: sum(ofDay.filter(p => p.kind === 'coins'))
      });
    }
    return {
      totalUsers: this.store.all('users').length,
      activeSubscribers: this.store.find('subscriptions', s => s.status === 'active' && s.end_date > nowIso).length,
      totalRevenue: sum(paid),
      subscriptionRevenue: sum(paid.filter(p => p.kind === 'subscription')),
      coinRevenue: sum(paid.filter(p => p.kind === 'coins')),
      coinsInCirculation: tx.reduce((s, t) => s + t.amount, 0),
      coinsSpent: -tx.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0),
      coinUnlocks: this.store.find('episode_unlocks', u => u.unlock_type !== 'rewarded_ad').length,
      adUnlocks: this.store.all('rewarded_ad_unlocks').length,
      totalViews: this.store.all('series').reduce((s, x) => s + x.views_count, 0),
      openTickets: this.store.find('support_tickets', t => t.status === 'open').length,
      revenueByDay: days
    };
  }

  async adminListSeries(): Promise<Series[]> {
    this.requireOwner();
    return [...this.store.all('series')].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async adminListEpisodes(seriesId: string): Promise<Episode[]> {
    this.requireOwner();
    return this.episodesOf(seriesId);
  }

  private refreshCounters(seriesId: string) {
    const eps = this.episodesOf(seriesId);
    this.store.update('series', seriesId, {
      episodes_count: eps.length,
      total_minutes: Math.round(eps.reduce((s, e) => s + e.duration_seconds, 0) / 60)
    });
  }

  async adminCreateSeries(input: { title: string; synopsis: string; poster_url: string; backdrop_url?: string; trailer_url?: string; genres: string[]; content_rating: Series['content_rating']; free_episodes_count?: number; is_featured?: boolean }): Promise<Series> {
    this.requireOwner();
    if (!input.title.trim()) throw new AppError('Informe o título.', 'VALIDATION');
    if (input.is_featured) this.store.all('series').forEach(s => s.is_featured && this.store.update('series', s.id, { is_featured: false }));
    return this.store.insert('series', {
      title: input.title.trim(),
      synopsis: input.synopsis.trim(),
      poster_url: input.poster_url,
      backdrop_url: input.backdrop_url || input.poster_url,
      trailer_url: input.trailer_url ?? '',
      genres: input.genres,
      tropes: [],
      badge: 'Novo',
      content_rating: input.content_rating,
      free_episodes_count: input.free_episodes_count ?? this.settings().default_free_episodes,
      price_coins: null,
      is_featured: !!input.is_featured,
      is_published: true,
      views_count: 0,
      weekly_rank: null,
      episodes_count: 0,
      total_minutes: 0
    });
  }

  async adminUpdateSeries(seriesId: string, patch: Partial<Pick<Series, 'free_episodes_count' | 'is_published' | 'title' | 'synopsis' | 'price_coins'>>): Promise<void> {
    this.requireOwner();
    if (patch.free_episodes_count !== undefined && (!Number.isInteger(patch.free_episodes_count) || patch.free_episodes_count < 0)) {
      throw new AppError('Episódios grátis precisa ser um número inteiro, 0 ou mais.', 'VALIDATION');
    }
    this.store.update('series', seriesId, patch);
  }

  async adminSetFeatured(seriesId: string): Promise<void> {
    this.requireOwner();
    this.store.all('series').forEach(s => {
      if (s.is_featured !== (s.id === seriesId)) this.store.update('series', s.id, { is_featured: s.id === seriesId });
    });
  }

  async adminDeleteSeries(seriesId: string): Promise<void> {
    this.requireOwner();
    this.store.remove('episodes', e => e.series_id === seriesId);
    this.store.remove('favorites', f => f.series_id === seriesId);
    this.store.remove('watch_history', w => w.series_id === seriesId);
    this.store.remove('series', s => s.id === seriesId);
  }

  async adminAddEpisode(seriesId: string, input: { title: string; video_url: string; duration_seconds: number }): Promise<Episode> {
    this.requireOwner();
    if (!this.store.byId('series', seriesId)) throw new AppError('Minissérie não encontrada.', 'NOT_FOUND');
    if (!/^https?:\/\//i.test(input.video_url)) throw new AppError('A URL do vídeo precisa começar com http:// ou https://', 'VALIDATION');
    const n = this.episodesOf(seriesId).reduce((m, e) => Math.max(m, e.episode_number), 0) + 1;
    const ep = this.store.insert('episodes', {
      series_id: seriesId, episode_number: n, title: input.title.trim() || `Episódio ${n}`,
      video_url: input.video_url, duration_seconds: Math.max(1, Math.round(input.duration_seconds) || 120)
    });
    this.refreshCounters(seriesId);
    return ep;
  }

  async adminDeleteEpisode(episodeId: string): Promise<void> {
    this.requireOwner();
    const ep = this.store.byId('episodes', episodeId);
    if (!ep) return;
    this.store.remove('episodes', e => e.id === episodeId);
    // Mantém a numeração em sequência
    this.store.find('episodes', e => e.series_id === ep.series_id && e.episode_number > ep.episode_number)
      .forEach(e => this.store.update('episodes', e.id, { episode_number: e.episode_number - 1 }));
    this.refreshCounters(ep.series_id);
  }

  async adminListPlans(): Promise<SubscriptionPlan[]> {
    this.requireOwner();
    return this.store.find('subscription_plans', p => p.id !== 'plan-trial');
  }

  async adminUpdatePlan(planId: string, price: number): Promise<void> {
    this.requireOwner();
    if (!Number.isFinite(price) || price <= 0) throw new AppError('Preço inválido.', 'VALIDATION');
    this.store.update('subscription_plans', planId, { price: round2(price) });
  }

  async adminListPackages(): Promise<CoinPackage[]> {
    this.requireOwner();
    return [...this.store.all('coin_packages')].sort((a, b) => a.sort_order - b.sort_order);
  }

  async adminUpdatePackage(id: string, patch: Pick<CoinPackage, 'coins' | 'bonus_coins' | 'price' | 'is_active'>): Promise<void> {
    this.requireOwner();
    if (!(patch.coins > 0) || patch.bonus_coins < 0 || !(patch.price > 0)) throw new AppError('Confira moedas, bônus e preço do pacote.', 'VALIDATION');
    this.store.update('coin_packages', id, { ...patch, coins: Math.round(patch.coins), bonus_coins: Math.round(patch.bonus_coins), price: round2(patch.price) });
  }

  async adminUpdateSettings(patch: Partial<Omit<AppSettings, 'id'>>): Promise<void> {
    this.requireOwner();
    const clean: Partial<AppSettings> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'support_email') {
        if (typeof v === 'string' && EMAIL_RE.test(v)) clean.support_email = v.trim();
      } else if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
        (clean as Record<string, number>)[k] = Math.round(v);
      }
    }
    if ((clean.series_bundle_discount_percent ?? 0) > 90) clean.series_bundle_discount_percent = 90;
    this.store.update('app_settings', 'settings', clean);
  }

  async adminListSections() {
    this.requireOwner();
    return [...this.store.all('home_sections')].sort((a, b) => a.sort_order - b.sort_order);
  }

  async adminMoveSection(id: string, dir: -1 | 1): Promise<void> {
    this.requireOwner();
    const list = [...this.store.all('home_sections')].sort((a, b) => a.sort_order - b.sort_order);
    const i = list.findIndex(s => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((s, idx) => this.store.update('home_sections', s.id, { sort_order: idx + 1 }));
  }

  async adminToggleSection(id: string, enabled: boolean): Promise<void> {
    this.requireOwner();
    this.store.update('home_sections', id, { is_enabled: enabled });
  }

  async adminListTickets(): Promise<SupportTicket[]> {
    this.requireOwner();
    return [...this.store.all('support_tickets')].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async adminCloseTicket(id: string): Promise<void> {
    this.requireOwner();
    this.store.update('support_tickets', id, { status: 'closed' });
  }
}
