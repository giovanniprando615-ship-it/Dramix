// Modelo de dados do DRAMIX. Os nomes das tabelas e colunas são os mesmos
// das migrations do Supabase (supabase/migrations), para a troca de backend ser direta.

export type ContentRating = 'Livre' | '12+' | '14+' | '16+' | '18+';
export type AgeRange = '13-17' | '18-24' | '25-34' | '35-44' | '45+';
export type Role = 'user' | 'owner';

export interface User {
  id: string;
  email: string;
  phone: string;
  password_hash: string | null;
  name: string;
  avatar: string;
  role: Role;
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  avatar: string;
  preferred_genres: string[];
  age_range: AgeRange | null;
  onboarded: boolean;
}

export interface Series {
  id: string;
  title: string;
  synopsis: string;
  poster_url: string;
  backdrop_url: string;
  trailer_url: string;
  genres: string[];
  tropes: string[];
  badge: string | null;
  content_rating: ContentRating;
  free_episodes_count: number;
  price_coins?: number | null;
  is_featured: boolean;
  is_published: boolean;
  views_count: number;
  weekly_rank: number | null;
  episodes_count: number;
  total_minutes: number;
  created_at: string;
}

export interface Episode {
  id: string;
  series_id: string;
  episode_number: number;
  title: string;
  video_url: string;
  duration_seconds: number;
  created_at: string;
}

export interface Genre { id: string; name: string; slug: string }

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  description: string;
  badge: string | null;
  is_active: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'canceled';
  is_trial: boolean;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  transaction_id: string | null;
  created_at: string;
}

export type PaymentKind = 'subscription' | 'coins';
export type PaymentMethod = 'pix' | 'credit_card';

export interface Payment {
  id: string;
  kind: PaymentKind;
  user_id: string;
  plan_id: string | null;
  package_id: string | null;
  coins_total: number | null;
  amount: number;
  status: 'pending' | 'paid';
  method: PaymentMethod;
  pix_code: string;
  created_at: string;
  paid_at: string | null;
}

export interface CoinPackage {
  id: string;
  coins: number;
  bonus_coins: number;
  price: number;
  badge: string | null;
  is_active: boolean;
  sort_order: number;
}

export type CoinTxType = 'welcome_bonus' | 'daily_gift' | 'purchase' | 'episode_unlock' | 'series_unlock';

export interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: CoinTxType;
  description: string;
  ref: string | null;
  balance_after: number;
  created_at: string;
}

export type UnlockType = 'coins' | 'coins_bundle' | 'rewarded_ad';

export interface EpisodeUnlock {
  id: string;
  user_id: string;
  series_id: string;
  episode_id: string;
  unlock_type: UnlockType;
  created_at: string;
}

export interface RewardedAdUnlock { id: string; user_id: string; episode_id: string; created_at: string }

export interface WatchHistory {
  id: string;
  user_id: string;
  series_id: string;
  episode_id: string;
  progress_seconds: number;
  duration_seconds: number;
  completed: boolean;
  updated_at: string;
  created_at: string;
}

export interface Favorite { id: string; user_id: string; series_id: string; created_at: string }

export interface HomeSection {
  id: string;
  title: string;
  row_type: 'hero' | 'continue_watching' | 'top10' | 'recommended' | 'row';
  filter_key: string | null;
  sort_order: number;
  is_enabled: boolean;
}

export interface AppSettings {
  id: 'settings';
  welcome_bonus_coins: number;
  daily_gift_coins: number;
  episode_price_coins: number;
  series_bundle_discount_percent: number;
  default_free_episodes: number;
  rewarded_ad_cooldown_hours: number;
  support_email: string;
}

export interface SupportTicket {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'open' | 'closed';
  created_at: string;
}

export interface Tables {
  users: User[];
  user_profiles: UserProfile[];
  series: Series[];
  episodes: Episode[];
  genres: Genre[];
  subscription_plans: SubscriptionPlan[];
  subscriptions: Subscription[];
  payments: Payment[];
  coin_packages: CoinPackage[];
  coin_transactions: CoinTransaction[];
  episode_unlocks: EpisodeUnlock[];
  rewarded_ad_unlocks: RewardedAdUnlock[];
  watch_history: WatchHistory[];
  favorites: Favorite[];
  home_sections: HomeSection[];
  app_settings: AppSettings[];
  support_tickets: SupportTicket[];
}

// ---------- Objetos que a camada de serviço devolve para a interface ----------

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role: Role;
  isPremium: boolean;
  subscription: (Subscription & { plan_name: string }) | null;
  coins: number;
  preferredGenres: string[];
  ageRange: AgeRange | null;
  onboarded: boolean;
}

export type AccessType = 'free' | 'premium' | 'unlocked' | 'auth_required' | 'paywall';

export interface EpisodeAccess {
  allowed: boolean;
  accessType: AccessType;
  freeLimit: number;
  priceCoins: number;
}

export interface EpisodeWithAccess extends Episode {
  access: EpisodeAccess;
}

export interface BundleQuote {
  lockedCount: number;
  lockedEpisodeIds: string[];
  unitPrice: number;
  fullPrice: number;
  discount: number;
  price: number;
}

export interface ContinueItem {
  series: Series;
  episode: Episode;
  progressSeconds: number;
  progressPercent: number;
  updatedAt: string;
}

export interface HomeRow { id: string; title: string; kind: 'row' | 'top10'; items: Series[] }

export interface HomeData {
  featured: Series[];
  continueWatching: ContinueItem[];
  rows: HomeRow[];
}

export interface SeriesDetails {
  series: Series;
  episodes: EpisodeWithAccess[];
  isFavorite: boolean;
  freeEpisodesCount: number;
  priceCoins: number;
  bundle: BundleQuote | null;
  progress: ContinueItem | null;
}

export interface DailyGiftStatus { available: boolean; amount: number; nextAvailableAt: string | null }

export interface AdEligibility { eligible: boolean; remainingSeconds: number }

export interface CheckoutOrder {
  transactionId: string;
  kind: PaymentKind;
  title: string;
  description: string;
  amount: number;
  pixCode: string;
}

export interface AdminStats {
  totalUsers: number;
  activeSubscribers: number;
  totalRevenue: number;
  subscriptionRevenue: number;
  coinRevenue: number;
  coinsInCirculation: number;
  coinsSpent: number;
  coinUnlocks: number;
  adUnlocks: number;
  totalViews: number;
  openTickets: number;
  revenueByDay: { day: string; assinaturas: number; moedas: number }[];
}
