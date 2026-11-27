/**
 * DRAMIX — Camada de Banco de Dados Relacional & Seed Engine
 * Estrutura completa de tabelas com persistência em localStorage, integridade referencial e dados cinematográficos.
 * Tabelas: users, user_profiles, series, episodes, genres, categories, collections,
 *          subscriptions, subscription_plans, payments, episode_unlocks, rewarded_ad_unlocks,
 *          watch_history, favorites, homepage_sections.
 */

(function(root) {
  'use strict';

  const STORAGE_KEY = 'dramix_database_v4';

  class DramixDatabase {
    constructor() {
      this.data = null;
      this.listeners = [];
      this.init();
    }

    init() {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          this.data = JSON.parse(stored);
          // Garantir integridade de novas tabelas se banco antigo existir
          if (!this.data.collections) {
            this.data.collections = this.getSeedCollections();
          }
          // Garante as tabelas de moedas, loja e suporte em bancos criados antes delas
          const commerce = this.getSeedCommerce();
          for (const key of Object.keys(commerce)) {
            if (!this.data[key]) this.data[key] = commerce[key];
          }
          this.save();
        } catch (e) {
          console.error('Erro ao ler banco de dados. Recriando banco padrão...', e);
          this.data = this.getSeedData();
          this.save();
        }
      } else {
        this.data = this.getSeedData();
        this.save();
      }
    }

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        this.notify();
      } catch (e) {
        console.error('Erro ao salvar no banco de dados:', e);
      }
    }

    reset() {
      this.data = this.getSeedData();
      this.save();
      return this.data;
    }

    subscribe(callback) {
      this.listeners.push(callback);
      return () => {
        this.listeners = this.listeners.filter(cb => cb !== callback);
      };
    }

    notify() {
      for (const cb of this.listeners) {
        try { cb(this.data); } catch (e) { console.error(e); }
      }
    }

    // ==================== OPERAÇÕES GENÉRICAS DE TABELA ====================
    table(tableName) {
      if (!this.data[tableName]) {
        this.data[tableName] = [];
      }
      return {
        all: () => [...this.data[tableName]],
        findById: (id) => this.data[tableName].find(item => item.id === id) || null,
        find: (predicate) => this.data[tableName].filter(predicate),
        findOne: (predicate) => this.data[tableName].find(predicate) || null,
        insert: (record) => {
          const item = { ...record };
          if (!item.id) item.id = `${tableName.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          if (!item.created_at) item.created_at = new Date().toISOString();
          this.data[tableName].push(item);
          this.save();
          return item;
        },
        update: (id, updates) => {
          const idx = this.data[tableName].findIndex(item => item.id === id);
          if (idx !== -1) {
            this.data[tableName][idx] = { ...this.data[tableName][idx], ...updates, updated_at: new Date().toISOString() };
            this.save();
            return this.data[tableName][idx];
          }
          return null;
        },
        delete: (id) => {
          const initialLen = this.data[tableName].length;
          this.data[tableName] = this.data[tableName].filter(item => item.id !== id);
          const changed = this.data[tableName].length !== initialLen;
          if (changed) this.save();
          return changed;
        }
      };
    }

    // ==================== DADOS INICIAIS (SEED) ====================
    getSeedData() {
      return {
        // 1. USUÁRIOS (Sem usuário fixo Lucas Silva. Apenas conta administrativa do Owner para testes)
        users: [
          {
            id: 'usr-owner-01',
            email: 'owner@dramix.tv',
            phone: '+5511999999999',
            password_hash: 'owner123',
            name: 'Diretoria DRAMIX',
            role: 'owner',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            created_at: '2026-01-01T00:00:00.000Z'
          }
        ],

        // 2. PERFIS DE USUÁRIOS
        user_profiles: [
          {
            user_id: 'usr-owner-01',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            preferred_genres: ['Drama', 'Romance', 'Suspense']
          }
        ],

        // 3. PLANOS DE ASSINATURA (Semanal R$ 7,90, Mensal R$ 29,90, Anual R$ 199,90 e Teste Grátis 3 dias)
        subscription_plans: [
          {
            id: 'plan-trial',
            name: 'Teste 3 Dias Grátis',
            price: 0.00,
            duration_days: 3,
            billing_period: 'trial',
            description: 'Experimente 3 dias de acesso VIP ilimitado sem cobrança imediata.',
            badge: 'Experimente Grátis',
            savings_text: 'Acesso VIP sem compromisso',
            is_active: true
          },
          {
            id: 'plan-weekly',
            name: 'Plano Semanal',
            price: 7.90,
            duration_days: 7,
            billing_period: 'semanal',
            description: 'Acesso Premium completo por 7 dias. Ideal para maratonar sua minissérie favorita.',
            badge: null,
            savings_text: null,
            is_active: true
          },
          {
            id: 'plan-monthly',
            name: 'Plano Mensal',
            price: 29.90,
            duration_days: 30,
            billing_period: 'mensal',
            description: 'Acesso ilimitado a todo o catálogo por 30 dias. Cancele quando quiser.',
            badge: 'Mais Escolhido',
            savings_text: 'Melhor para quem assiste toda semana',
            is_active: true
          },
          {
            id: 'plan-annual',
            name: 'Plano Anual',
            price: 199.90,
            duration_days: 365,
            billing_period: 'anual',
            description: '12 meses de acesso ilimitado sem interrupções. Melhor custo-benefício para fãs de streaming.',
            badge: 'Melhor Custo-Benefício',
            savings_text: 'Economize 44% em comparação com 12 pagamentos mensais (R$ 358,80)',
            is_active: true
          }
        ],

        // 4. ASSINATURAS ATIVAS / HISTÓRICAS
        subscriptions: [],

        // 5. TRANSAÇÕES DE PAGAMENTO
        payments: [],

        // 6. GÊNEROS (SEM EMOJIS)
        genres: [
          { id: 'gen-romance', name: 'Romance', slug: 'romance' },
          { id: 'gen-drama', name: 'Drama', slug: 'drama' },
          { id: 'gen-vinganca', name: 'Vingança', slug: 'vinganca' },
          { id: 'gen-ceo', name: 'CEO', slug: 'ceo' },
          { id: 'gen-acao', name: 'Ação', slug: 'acao' },
          { id: 'gen-suspense', name: 'Suspense', slug: 'suspense' },
          { id: 'gen-fantasia', name: 'Fantasia', slug: 'fantasia' },
          { id: 'gen-comedia', name: 'Comédia', slug: 'comedia' },
          { id: 'gen-escolar', name: 'Escolar', slug: 'escolar' },
          { id: 'gen-misterio', name: 'Mistério', slug: 'misterio' }
        ],

        // 7. CATEGORIAS EDITORIAIS COMPLETAS (SEM EMOJIS)
        categories: [
          { id: 'cat-romance', name: 'Romance', slug: 'romance', order: 1, description: 'Histórias apaixonantes de amor, encontros e reviravoltas intensas.' },
          { id: 'cat-drama', name: 'Drama', slug: 'drama', order: 2, description: 'Emoções à flor da pele, dilemas de honra e conflitos familiares.' },
          { id: 'cat-vinganca', name: 'Vingança', slug: 'vinganca', order: 3, description: 'Acertos de contas implacáveis e o doce sabor da retribuição.' },
          { id: 'cat-ceo', name: 'CEO', slug: 'ceo', order: 4, description: 'Poderosos magnatas, executivos dominantes e acordos corporativos.' },
          { id: 'cat-acao', name: 'Ação', slug: 'acao', order: 5, description: 'Cenas eletrizantes, perseguições e adrenalina vertiginosa.' },
          { id: 'cat-suspense', name: 'Suspense', slug: 'suspense', order: 6, description: 'Reviravoltas imprevisíveis e tensão a cada segundo.' },
          { id: 'cat-fantasia', name: 'Fantasia', slug: 'fantasia', order: 7, description: 'Mundos míticos, poderes ancestrais e destinos selados.' },
          { id: 'cat-comedia', name: 'Comédia', slug: 'comedia', order: 8, description: 'Romance leve, situações hilárias e desencontros divertidos.' },
          { id: 'cat-escolar', name: 'Escolar', slug: 'escolar', order: 9, description: 'Dramas de juventude, rivalidades de colégio e amores de elite.' },
          { id: 'cat-misterio', name: 'Mistério', slug: 'misterio', order: 10, description: 'Identidades ocultas, conspirações e segredos guardados a sete chaves.' },
          { id: 'cat-romance-coreano', name: 'Romance Coreano', slug: 'romance-coreano', order: 11, description: 'Dramas no formato clássico K-Drama com fotografia primorosa.' },
          { id: 'cat-romance-chines', name: 'Romance Chinês', slug: 'romance-chines', order: 12, description: 'Tramas chinesas com herdeiros modernos e intrigas refinadas.' },
          { id: 'cat-bilionarios', name: 'Histórias de Bilionários', slug: 'bilionarios', order: 13, description: 'Luxo, iates, heranças bilionárias e segredos da alta sociedade.' },
          { id: 'cat-casamento-contrato', name: 'Casamento por Contrato', slug: 'casamento-por-contrato', order: 14, description: 'Um acordo rígido no papel que se transforma em paixão avassaladora.' },
          { id: 'cat-amor-proibido', name: 'Amor Proibido', slug: 'amor-proibido', order: 15, description: 'Paixões perigosas que desafiam limites morais e famílias rivais.' },
          { id: 'cat-reencarnacao', name: 'Reencarnação', slug: 'reencarnacao', order: 16, description: 'Despertar no passado mantendo as memórias para reescrever o destino.' },
          { id: 'cat-traicao', name: 'Traição', slug: 'traicao', order: 17, description: 'Desilusões amorosas, farsas desmascaradas e superação total.' },
          { id: 'cat-segunda-chance', name: 'Segunda Chance', slug: 'segunda-chance', order: 18, description: 'O recomeço maduro de quem nunca deixou de se amar.' }
        ],

        // 8. COLEÇÕES TEMÁTICAS (CEOs Apaixonados, Vingança Implacável, Amor Proibido, Casamento por Contrato)
        collections: this.getSeedCollections(),

        // 9. MINISSÉRIES (CATÁLOGO PROFISSIONAL, CAPAS CINEMATOGRÁFICAS SEM REPETIÇÃO, BADGES E TROPES)
        series: [
          {
            id: 'ser-01',
            title: 'O Retorno do Bilionário Desconhecido',
            synopsis: 'Traído por seus sócios e dado como morto em um trágico naufrágio, Lucca Silveira retorna disfarçado à alta sociedade sob o disfarce de motorista particular. Enquanto desvenda a conspiração que quase destruiu sua vida, ele descobre que Gabriela, a mulher que jurou protegê-lo, foi a única que nunca desacreditou em sua inocência.',
            poster_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
            backdrop_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1600&q=80',
            trailer_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            genres: ['Romance', 'Drama', 'Vingança', 'CEO'],
            tropes: ['CEO', 'Bilionário', 'Vingança', 'Identidade Secreta'],
            badge: 'EM ALTA',
            badge_color: 'bg-[#E52E4D]',
            content_rating: '14+',
            free_episodes_count: 5,
            is_featured: true,
            is_published: true,
            views_count: 3840200,
            completion_rate: 98,
            weekly_rank: 1,
            rank_movement: '▲ 2',
            marathon_score: 99,
            total_duration: '~21 min',
            episodes_count: 10,
            created_at: '2026-10-15T00:00:00.000Z'
          },
          {
            id: 'ser-02',
            title: 'Casamento por Contrato com o Tirano',
            synopsis: 'Para salvar a fundação médica de sua família da falência iminente, Sophie aceita um rigoroso acordo de conveniência de um ano com Alexander Vance, o presidente mais frio e exigente do mercado financeiro. O contrato proibia envolvimentos emocionais, mas os segredos do passado passam a desmoronar cada barreira estabelecida.',
            poster_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
            backdrop_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80',
            trailer_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            genres: ['Romance', 'Drama', 'CEO'],
            tropes: ['Casamento por Contrato', 'CEO', 'Inimigos para Amantes', 'Bilionário'],
            badge: 'NOVO',
            badge_color: 'bg-emerald-500',
            content_rating: '14+',
            free_episodes_count: 5,
            is_featured: false,
            is_published: true,
            views_count: 3120000,
            completion_rate: 95,
            weekly_rank: 2,
            rank_movement: '▲ 1',
            marathon_score: 97,
            total_duration: '~20 min',
            episodes_count: 10,
            created_at: '2026-11-01T00:00:00.000Z'
          },
          {
            id: 'ser-03',
            title: 'A Vingança da Herdeira Renascida',
            synopsis: 'Após ser traída e despojada de seus direitos legítimos, Valéria ganha uma segunda chance ao despertar cinco anos antes de sua queda. Armada com a precisão dos acontecimentos futuros e determinação inabalável, ela assume o controle das negociações familiares para derrubar seus algozes sem piedade.',
            poster_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
            backdrop_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
            trailer_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
            genres: ['Drama', 'Vingança', 'Suspense'],
            tropes: ['Vingança', 'Reencarnação', 'Herdeira', 'Traição'],
            badge: 'FINALIZADO',
            badge_color: 'bg-amber-500 text-black',
            content_rating: '16+',
            free_episodes_count: 5,
            is_featured: false,
            is_published: true,
            views_count: 2980000,
            completion_rate: 93,
            weekly_rank: 3,
            rank_movement: 'Estreia',
            marathon_score: 95,
            total_duration: '~23 min',
            episodes_count: 10,
            created_at: '2026-11-08T00:00:00.000Z'
          },
          {
            id: 'ser-04',
            title: 'O Amor Proibido do Guarda-Costas',
            synopsis: 'Designado para a segurança da herdeira mais visada da metrópole, o ex-agente tático Ryan precisa navegar entre ataques de facções rivais e um sentimento proibido que cresce a cada momento de perigo compartilhado.',
            poster_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
            backdrop_url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1600&q=80',
            trailer_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
            genres: ['Ação', 'Suspense', 'Romance'],
            tropes: ['Amor Proibido', 'Guarda-Costas', 'Ação', 'Proteção'],
            badge: 'EM ALTA',
            badge_color: 'bg-[#E52E4D]',
            content_rating: '16+',
            free_episodes_count: 5,
            is_featured: false,
            is_published: true,
            views_count: 2450000,
            completion_rate: 91,
            weekly_rank: 4,
            rank_movement: '▼ 1',
            marathon_score: 92,
            total_duration: '~19 min',
            episodes_count: 10,
            created_at: '2026-08-10T00:00:00.000Z'
          },
          {
            id: 'ser-05',
            title: 'Segunda Chance para o Nosso Destino',
            synopsis: 'Três anos após uma separação amarga forjada por intrigas externas, Clara reaparece consolidada no mercado executivo, acompanhada de um herdeiro cuja semelhança com o magnata Rafael é inegável.',
            poster_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
            backdrop_url: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=1600&q=80',
            trailer_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
            genres: ['Romance', 'Drama', 'CEO'],
            tropes: ['Gravidez', 'Segunda Chance', 'Filho Secreto', 'CEO'],
            badge: 'NOVO',
            badge_color: 'bg-emerald-500',
            content_rating: '12+',
            free_episodes_count: 5,
            is_featured: false,
            is_published: true,
            views_count: 2210000,
            completion_rate: 89,
            weekly_rank: 5,
            rank_movement: '▲ 3',
            marathon_score: 90,
            total_duration: '~21 min',
            episodes_count: 10,
            created_at: '2026-10-30T00:00:00.000Z'
          },
          {
            id: 'ser-06',
            title: 'Pacto com o Mafioso Bilionário',
            synopsis: 'Elena é arrastada para o submundo das altas finanças e acordos obscuros ao aceitar a proteção de Dante Moretti, um homem cuja influência ultrapassa as fronteiras legais.',
            poster_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
            backdrop_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
            trailer_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            genres: ['Suspense', 'Ação', 'Drama'],
            tropes: ['Bilionário', 'Máfia', 'Casamento por Contrato', 'Perigo'],
            badge: 'EM ALTA',
            badge_color: 'bg-[#E52E4D]',
            content_rating: '18+',
            free_episodes_count: 5,
            is_featured: false,
            is_published: true,
            views_count: 3410000,
            completion_rate: 96,
            weekly_rank: 6,
            rank_movement: '▲ 1',
            marathon_score: 96,
            total_duration: '~22 min',
            episodes_count: 10,
            created_at: '2026-11-10T00:00:00.000Z'
          },
          {
            id: 'ser-07',
            title: 'A Esposa Misteriosa do Magnata',
            synopsis: 'Casada através de arranjo familiar com um herdeiro temporariamente incapacitado, Lin Yu preserva o segredo de sua verdadeira identidade como uma das mais renomadas especialistas médicas do país.',
            poster_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
            backdrop_url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1600&q=80',
            trailer_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            genres: ['Drama', 'Mistério', 'Romance'],
            tropes: ['Casamento por Contrato', 'Identidade Secreta', 'Médica Gênio', 'Romance Chinês'],
            badge: 'FINALIZADO',
            badge_color: 'bg-amber-500 text-black',
            content_rating: '14+',
            free_episodes_count: 5,
            is_featured: false,
            is_published: true,
            views_count: 2890000,
            completion_rate: 94,
            weekly_rank: 7,
            rank_movement: '▼ 2',
            marathon_score: 93,
            total_duration: '~24 min',
            episodes_count: 10,
            created_at: '2026-07-15T00:00:00.000Z'
          },
          {
            id: 'ser-08',
            title: 'Reencarnei como a Vilã do Romance',
            synopsis: 'Ao despertar no corpo da temida Marquesa destinada a perder tudo no final do enredo literário, Helena usa sua astúcia moderna para reescrever as alianças do império e conquistar a lealdade de seus antigos adversários.',
            poster_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=80',
            backdrop_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
            trailer_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            genres: ['Fantasia', 'Drama', 'Comédia'],
            tropes: ['Reencarnação', 'Vilã Nobre', 'Fantasia', 'Amor Proibido'],
            badge: 'NOVO',
            badge_color: 'bg-emerald-500',
            content_rating: '12+',
            free_episodes_count: 5,
            is_featured: false,
            is_published: true,
            views_count: 2050000,
            completion_rate: 87,
            weekly_rank: 8,
            rank_movement: '▲ 2',
            marathon_score: 88,
            total_duration: '~20 min',
            episodes_count: 10,
            created_at: '2026-09-12T00:00:00.000Z'
          }
        ],

        // 10. EPISÓDIOS (EPISÓDIOS 1 A 5 GRÁTIS, 6 EM DIANTE COM MOEDAS, ANÚNCIO OU PREMIUM)
        episodes: this.generateSeedEpisodes(),

        // 11. DESBLOQUEIOS DE EPISÓDIOS
        episode_unlocks: [],

        // 12. REGISTRO DE ANÚNCIOS RECOMPENSADOS
        rewarded_ad_unlocks: [],

        // 13. HISTÓRICO DE REPRODUÇÃO ("CONTINUE ASSISTINDO")
        watch_history: [],

        // 14. MINHA LISTA (FAVORITOS)
        favorites: [],

        // 15. MOEDAS, LOJA, CONFIGURAÇÕES E SUPORTE
        ...this.getSeedCommerce(),

        // 16. SEÇÕES DA HOME
        homepage_sections: [
          { id: 'sec-hero', title: 'Em Destaque', row_type: 'hero', filter_key: 'featured', order: 1, is_enabled: true },
          { id: 'sec-continue', title: 'Continue Assistindo', row_type: 'continue_watching', filter_key: null, order: 2, is_enabled: true },
          { id: 'sec-tropes', title: 'Temas & Tropes Populares', row_type: 'tropes_bar', filter_key: null, order: 3, is_enabled: true },
          { id: 'sec-recommended', title: 'Recomendado para Você', row_type: 'recommended', filter_key: null, order: 4, is_enabled: true },
          { id: 'sec-releases', title: 'Lançamentos', row_type: 'horizontal_row', filter_key: 'new_releases', order: 5, is_enabled: true },
          { id: 'sec-popular', title: 'Mais Populares', row_type: 'horizontal_row', filter_key: 'popular', order: 6, is_enabled: true },
          { id: 'sec-romance', title: 'Romances', row_type: 'horizontal_row', filter_key: 'genre_romance', order: 7, is_enabled: true },
          { id: 'sec-drama-vengeance', title: 'Drama e Vingança', row_type: 'horizontal_row', filter_key: 'genre_drama_vinganca', order: 8, is_enabled: true },
          { id: 'sec-action-suspense', title: 'Ação e Suspense', row_type: 'horizontal_row', filter_key: 'genre_acao_suspense', order: 9, is_enabled: true },
          { id: 'sec-fantasy', title: 'Fantasia', row_type: 'horizontal_row', filter_key: 'genre_fantasia', order: 10, is_enabled: true }
        ]
      };
    }

    getSeedCommerce() {
      return {
        // Regras de moedas editáveis no Painel Owner
        app_settings: [
          {
            id: 'settings',
            welcome_bonus_coins: 50,
            daily_gift_coins: 20,
            episode_price_coins: 25,
            series_bundle_discount_percent: 20,
            default_free_episodes: 5,
            rewarded_ad_cooldown_hours: 24,
            support_email: 'suporte@dramix.tv'
          }
        ],
        // Pacotes de moedas (bonus_coins entra além das moedas base)
        coin_packages: [
          { id: 'pkg-150', coins: 150, bonus_coins: 0, price: 4.90, badge: null, is_active: true, order: 1 },
          { id: 'pkg-300', coins: 300, bonus_coins: 30, price: 9.90, badge: null, is_active: true, order: 2 },
          { id: 'pkg-600', coins: 600, bonus_coins: 120, price: 19.90, badge: 'Mais escolhido', is_active: true, order: 3 },
          { id: 'pkg-1200', coins: 1200, bonus_coins: 360, price: 39.90, badge: null, is_active: true, order: 4 },
          { id: 'pkg-2400', coins: 2400, bonus_coins: 960, price: 79.90, badge: 'Melhor valor', is_active: true, order: 5 }
        ],
        // Extrato de moedas: cada linha é um crédito (+) ou débito (-). Saldo = soma.
        coin_transactions: [],
        support_tickets: []
      };
    }

    getSeedCollections() {
      return [
        {
          id: 'col-ceos-apaixonados',
          title: 'CEOs Apaixonados',
          subtitle: 'Magnatas implacáveis de terno que se rendem completamente ao amor.',
          badge: 'Coleção Editorial',
          banner: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
          seriesIds: ['ser-01', 'ser-02', 'ser-05', 'ser-06']
        },
        {
          id: 'col-vinganca-implacavel',
          title: 'Vingança Implacável',
          subtitle: 'Humilhados no passado, implacáveis no presente. O acerto de contas definitivo.',
          badge: 'Reviravoltas Chocantes',
          banner: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
          seriesIds: ['ser-03', 'ser-01', 'ser-06']
        },
        {
          id: 'col-amor-proibido',
          title: 'Amor Proibido',
          subtitle: 'Fronteiras perigosas, lealdades testadas e paixão que desafia o perigo.',
          badge: 'Tensão Máxima',
          banner: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200&q=80',
          seriesIds: ['ser-04', 'ser-08', 'ser-02']
        },
        {
          id: 'col-casamento-contrato',
          title: 'Casamento por Contrato',
          subtitle: 'Assinaram um acordo falso. Não previram que a química seria real.',
          badge: 'Favorito do Público',
          banner: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
          seriesIds: ['ser-02', 'ser-07', 'ser-06']
        }
      ];
    }

    generateSeedEpisodes() {
      const episodes = [];
      const seriesList = [
        { id: 'ser-01', titlePrefix: 'O Retorno', total: 10 },
        { id: 'ser-02', titlePrefix: 'O Contrato', total: 10 },
        { id: 'ser-03', titlePrefix: 'A Vingança', total: 10 },
        { id: 'ser-04', titlePrefix: 'O Resgate', total: 10 },
        { id: 'ser-05', titlePrefix: 'O Reencontro', total: 10 },
        { id: 'ser-06', titlePrefix: 'O Pacto', total: 10 },
        { id: 'ser-07', titlePrefix: 'A Revelação', total: 10 },
        { id: 'ser-08', titlePrefix: 'O Destino', total: 10 }
      ];

      const videoClips = [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
      ];

      for (const s of seriesList) {
        for (let epNum = 1; epNum <= s.total; epNum++) {
          // Episódios 1 a 5 gratuitos por padrão
          const isFree = epNum <= 5;
          episodes.push({
            id: `ep-${s.id}-${epNum}`,
            series_id: s.id,
            episode_number: epNum,
            title: `Episódio ${epNum} — ${this.getEpisodeTitle(epNum)}`,
            duration_seconds: 110 + (epNum * 5),
            is_free: isFree,
            video_url: videoClips[(epNum - 1) % videoClips.length],
            created_at: '2026-10-15T00:00:00.000Z'
          });
        }
      }

      return episodes;
    }

    getEpisodeTitle(epNum) {
      const titles = [
        'O Despertar do Passado',
        'O Encontro Inesperado',
        'Cláusula Confidencial',
        'Sob o Mesmo Teto',
        'A Quebra das Regras',
        'Segredos Revelados',
        'A Conspiração se Fecha',
        'Afronta Pública',
        'Ponto sem Retorno',
        'O Julgamento Final'
      ];
      return titles[(epNum - 1) % titles.length];
    }
  }

  root.DramixDatabase = DramixDatabase;
  root.dramixDB = new DramixDatabase();
})(typeof window !== 'undefined' ? window : global);
