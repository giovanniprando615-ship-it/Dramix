import type { Episode, Series, Tables } from './types';

// Catálogo e regras iniciais do DRAMIX (mesmo conteúdo da versão anterior).
// Imagens: Unsplash. Vídeos: amostras públicas do Google, até a produção própria ficar pronta.

const img = (id: string, w = 800) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
const clip = (name: string) => `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${name}.mp4`;
const CLIPS = ['ForBiggerBlazes', 'ForBiggerEscapes', 'ForBiggerFun', 'ForBiggerJoyBlazes', 'WeAreGoingOnBullrun', 'TearsOfSteel'].map(clip);
const T0 = '2026-01-01T00:00:00.000Z';

type SeedSeries = Omit<Series, 'episodes_count' | 'total_minutes' | 'is_published' | 'free_episodes_count' | 'is_featured' | 'price_coins'> & { is_featured?: boolean };

const SERIES: SeedSeries[] = [
  {
    id: 'ser-01', title: 'O Retorno do Bilionário Desconhecido',
    synopsis: 'Traído por seus sócios e dado como morto em um naufrágio, Lucca Silveira volta à alta sociedade disfarçado de motorista particular. Enquanto desvenda a conspiração que quase destruiu sua vida, descobre que Gabriela foi a única que nunca duvidou da sua inocência.',
    poster_url: img('photo-1506794778202-cad84cf45f1d'), backdrop_url: img('photo-1507679799987-c73779587ccf', 1600), trailer_url: CLIPS[0],
    genres: ['Romance', 'Drama', 'Vingança', 'CEO'], tropes: ['Bilionário', 'Identidade secreta', 'Vingança'],
    badge: 'Em alta', content_rating: '14+', views_count: 3840200, weekly_rank: 1, created_at: '2026-10-15T00:00:00.000Z', is_featured: true
  },
  {
    id: 'ser-02', title: 'Casamento por Contrato com o Tirano',
    synopsis: 'Para salvar a fundação médica da família, Sophie aceita um acordo de um ano com Alexander Vance, o executivo mais frio do mercado. O contrato proibia sentimentos, mas os segredos do passado derrubam cada barreira.',
    poster_url: img('photo-1534528741775-53994a69daeb'), backdrop_url: img('photo-1519741497674-611481863552', 1600), trailer_url: CLIPS[1],
    genres: ['Romance', 'Drama', 'CEO'], tropes: ['Casamento por contrato', 'Inimigos que se apaixonam'],
    badge: 'Novo', content_rating: '14+', views_count: 3120000, weekly_rank: 2, created_at: '2026-11-01T00:00:00.000Z'
  },
  {
    id: 'ser-03', title: 'A Vingança da Herdeira Renascida',
    synopsis: 'Traída e despojada da herança, Valéria acorda cinco anos antes da sua queda. Sabendo tudo o que vai acontecer, ela assume as negociações da família para derrubar quem a destruiu.',
    poster_url: img('photo-1517841905240-472988babdf9'), backdrop_url: img('photo-1509198397868-475647b2a1e5', 1600), trailer_url: CLIPS[2],
    genres: ['Drama', 'Vingança', 'Suspense'], tropes: ['Reencarnação', 'Herdeira', 'Traição'],
    badge: 'Completa', content_rating: '16+', views_count: 2980000, weekly_rank: 3, created_at: '2026-11-08T00:00:00.000Z'
  },
  {
    id: 'ser-04', title: 'O Amor Proibido do Guarda-Costas',
    synopsis: 'Encarregado de proteger a herdeira mais visada da cidade, o ex-agente Ryan precisa sobreviver a ataques de facções rivais e a um sentimento proibido que cresce a cada perigo.',
    poster_url: img('photo-1500648767791-00dcc994a43e'), backdrop_url: img('photo-1518199266791-5375a83190b7', 1600), trailer_url: CLIPS[3],
    genres: ['Ação', 'Suspense', 'Romance'], tropes: ['Amor proibido', 'Guarda-costas'],
    badge: 'Em alta', content_rating: '16+', views_count: 2450000, weekly_rank: 4, created_at: '2026-08-10T00:00:00.000Z'
  },
  {
    id: 'ser-05', title: 'Segunda Chance para o Nosso Destino',
    synopsis: 'Três anos depois de uma separação forjada por intrigas, Clara reaparece como executiva de sucesso, acompanhada de um menino muito parecido com o magnata Rafael.',
    poster_url: img('photo-1544005313-94ddf0286df2'), backdrop_url: img('photo-1499209974431-9dddcece7f88', 1600), trailer_url: CLIPS[4],
    genres: ['Romance', 'Drama', 'CEO'], tropes: ['Segunda chance', 'Filho secreto'],
    badge: 'Novo', content_rating: '12+', views_count: 2210000, weekly_rank: 5, created_at: '2026-10-30T00:00:00.000Z'
  },
  {
    id: 'ser-06', title: 'Pacto com o Mafioso Bilionário',
    synopsis: 'Elena é arrastada para o submundo das altas finanças ao aceitar a proteção de Dante Moretti, um homem cuja influência vai muito além da lei.',
    poster_url: img('photo-1507003211169-0a1dd7228f2d'), backdrop_url: img('photo-1509198397868-475647b2a1e5', 1600), trailer_url: CLIPS[0],
    genres: ['Suspense', 'Ação', 'Drama'], tropes: ['Máfia', 'Bilionário', 'Perigo'],
    badge: 'Em alta', content_rating: '18+', views_count: 3410000, weekly_rank: 6, created_at: '2026-11-10T00:00:00.000Z'
  },
  {
    id: 'ser-07', title: 'A Esposa Misteriosa do Magnata',
    synopsis: 'Casada por arranjo familiar com um herdeiro temporariamente incapacitado, Lin Yu guarda o segredo da sua verdadeira identidade: uma das médicas mais renomadas do país.',
    poster_url: img('photo-1524504388940-b1c1722653e1'), backdrop_url: img('photo-1563245372-f21724e3856d', 1600), trailer_url: CLIPS[5],
    genres: ['Drama', 'Mistério', 'Romance'], tropes: ['Identidade secreta', 'Casamento por contrato'],
    badge: 'Completa', content_rating: '14+', views_count: 2890000, weekly_rank: 7, created_at: '2026-07-15T00:00:00.000Z'
  },
  {
    id: 'ser-08', title: 'Reencarnei como a Vilã do Romance',
    synopsis: 'Ao acordar no corpo da marquesa destinada a perder tudo no fim da história, Helena usa a astúcia moderna para reescrever as alianças do império e conquistar os antigos inimigos.',
    poster_url: img('photo-1531746020798-e6953c6e8e04'), backdrop_url: img('photo-1518709268805-4e9042af9f23', 1600), trailer_url: CLIPS[1],
    genres: ['Fantasia', 'Drama', 'Comédia'], tropes: ['Reencarnação', 'Vilã', 'Fantasia'],
    badge: 'Novo', content_rating: '12+', views_count: 2050000, weekly_rank: 8, created_at: '2026-09-12T00:00:00.000Z'
  }
];

const EPISODE_TITLES = [
  'O despertar do passado', 'O encontro inesperado', 'Cláusula confidencial', 'Sob o mesmo teto', 'A quebra das regras',
  'Segredos revelados', 'A conspiração se fecha', 'Afronta pública', 'Ponto sem retorno', 'O julgamento final'
];

function buildEpisodes(): Episode[] {
  const out: Episode[] = [];
  for (const s of SERIES) {
    for (let n = 1; n <= 10; n++) {
      out.push({
        id: `ep-${s.id}-${n}`,
        series_id: s.id,
        episode_number: n,
        title: EPISODE_TITLES[n - 1],
        video_url: CLIPS[(n - 1) % CLIPS.length],
        duration_seconds: 110 + n * 5,
        created_at: s.created_at
      });
    }
  }
  return out;
}

export function createSeed(): Tables {
  const episodes = buildEpisodes();
  return {
    users: [{
      id: 'usr-owner-01', email: 'owner@dramix.tv', phone: '', password_hash: 'owner123',
      name: 'Diretoria DRAMIX', avatar: img('photo-1534528741775-53994a69daeb', 200), role: 'owner', created_at: T0
    }],
    user_profiles: [{
      id: 'pro-owner-01', user_id: 'usr-owner-01', avatar: img('photo-1534528741775-53994a69daeb', 200),
      preferred_genres: [], age_range: '35-44', onboarded: true
    }],
    series: SERIES.map(s => {
      const eps = episodes.filter(e => e.series_id === s.id);
      return {
        ...s,
        is_featured: !!s.is_featured,
        is_published: true,
        free_episodes_count: 5,
        price_coins: null,
        episodes_count: eps.length,
        total_minutes: Math.round(eps.reduce((sum, e) => sum + e.duration_seconds, 0) / 60)
      };
    }),
    episodes,
    genres: ['Romance', 'Drama', 'Vingança', 'CEO', 'Ação', 'Suspense', 'Fantasia', 'Comédia', 'Mistério']
      .map(name => ({ id: `gen-${name}`, name, slug: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') })),
    subscription_plans: [
      { id: 'plan-trial', name: 'Teste grátis', price: 0, duration_days: 3, description: '3 dias com tudo liberado.', badge: null, is_active: true },
      { id: 'plan-weekly', name: 'Semanal', price: 7.9, duration_days: 7, description: 'Para maratonar uma história no fim de semana.', badge: null, is_active: true },
      { id: 'plan-monthly', name: 'Mensal', price: 29.9, duration_days: 30, description: 'Todo o catálogo liberado, cancele quando quiser.', badge: 'Mais escolhido', is_active: true },
      { id: 'plan-annual', name: 'Anual', price: 199.9, duration_days: 365, description: '12 meses pelo menor preço por mês.', badge: 'Melhor custo-benefício', is_active: true }
    ],
    subscriptions: [],
    payments: [],
    coin_packages: [
      { id: 'pkg-150', coins: 150, bonus_coins: 0, price: 4.9, badge: null, is_active: true, sort_order: 1 },
      { id: 'pkg-300', coins: 300, bonus_coins: 30, price: 9.9, badge: null, is_active: true, sort_order: 2 },
      { id: 'pkg-600', coins: 600, bonus_coins: 120, price: 19.9, badge: 'Mais escolhido', is_active: true, sort_order: 3 },
      { id: 'pkg-1200', coins: 1200, bonus_coins: 360, price: 39.9, badge: null, is_active: true, sort_order: 4 },
      { id: 'pkg-2400', coins: 2400, bonus_coins: 960, price: 79.9, badge: 'Melhor valor', is_active: true, sort_order: 5 }
    ],
    coin_transactions: [],
    episode_unlocks: [],
    rewarded_ad_unlocks: [],
    watch_history: [],
    favorites: [],
    home_sections: [
      { id: 'sec-hero', title: 'Em destaque', row_type: 'hero', filter_key: null, sort_order: 1, is_enabled: true },
      { id: 'sec-continue', title: 'Continue assistindo', row_type: 'continue_watching', filter_key: null, sort_order: 2, is_enabled: true },
      { id: 'sec-top10', title: 'Top 10 da semana no Brasil', row_type: 'top10', filter_key: null, sort_order: 3, is_enabled: true },
      { id: 'sec-recommended', title: 'Recomendado para você', row_type: 'recommended', filter_key: null, sort_order: 4, is_enabled: true },
      { id: 'sec-new', title: 'Lançamentos', row_type: 'row', filter_key: 'new', sort_order: 5, is_enabled: true },
      { id: 'sec-romance', title: 'Romances', row_type: 'row', filter_key: 'genre:Romance', sort_order: 6, is_enabled: true },
      { id: 'sec-revenge', title: 'Drama e vingança', row_type: 'row', filter_key: 'genre:Drama,Vingança', sort_order: 7, is_enabled: true },
      { id: 'sec-action', title: 'Ação e suspense', row_type: 'row', filter_key: 'genre:Ação,Suspense', sort_order: 8, is_enabled: true },
      { id: 'sec-fantasy', title: 'Fantasia', row_type: 'row', filter_key: 'genre:Fantasia', sort_order: 9, is_enabled: true }
    ],
    app_settings: [{
      id: 'settings', welcome_bonus_coins: 50, daily_gift_coins: 20, episode_price_coins: 25,
      series_bundle_discount_percent: 20, default_free_episodes: 5, rewarded_ad_cooldown_hours: 24,
      support_email: 'suporte@dramix.tv'
    }],
    support_tickets: []
  };
}
