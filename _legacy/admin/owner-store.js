/**
 * DRAMIX - Gerenciador de Estado do Painel do Proprietário (Owner Store)
 * Persistência reativa via localStorage com controle total sobre:
 * Categorias, Coleções, Ordem de Seções da Home, Banners, Destaques e Recomendações Manuais.
 */

class DramixOwnerStore {
  constructor() {
    this.storageKey = 'dramix_owner_config_v1';
    this.subscribers = [];
    this.load();
  }

  getDefaultConfig() {
    return {
      // 1. Categorias Oficiais
      categories: JSON.parse(JSON.stringify(window.DRAMIX_DEFAULT_CATEGORIES || [])),

      // 2. Coleções Temáticas Editoriais
      collections: JSON.parse(JSON.stringify(window.DRAMIX_DEFAULT_COLLECTIONS || [])),

      // 3. Ordem e Visibilidade das Seções na Página DESCUBRIR
      homeSections: [
        { id: 'sec-hero', name: 'Banner Principal (Hero Carousel)', type: 'hero', enabled: true, order: 1 },
        { id: 'sec-categories-chips', name: 'Barra Rápida de Categorias', type: 'category_chips', enabled: true, order: 2 },
        { id: 'sec-recommendations', name: 'Para Você (Recomendações Inteligentes)', type: 'recommendations', enabled: true, order: 3 },
        { id: 'sec-top10', name: 'Top 10 da Semana (Numerais Gigantes)', type: 'top10', enabled: true, order: 4 },
        { id: 'sec-collections', name: 'Coleções Temáticas Editoriais', type: 'collections', enabled: true, order: 5 },
        { id: 'sec-trending', name: 'Em Alta (Trending Now)', type: 'trending', enabled: true, order: 6 },
        { id: 'sec-new-releases', name: 'Lançamentos Recentes', type: 'new_releases', enabled: true, order: 7 },
        { id: 'sec-most-watched', name: 'Mais Assistidas', type: 'most_watched', enabled: true, order: 8 },
        { id: 'sec-most-unlocked', name: 'Mais Desbloqueadas (Moedas)', type: 'most_unlocked', enabled: true, order: 9 },
        { id: 'sec-most-favorited', name: 'Mais Favoritadas', type: 'most_favorited', enabled: true, order: 10 },
        { id: 'sec-exclusive', name: 'Exclusivas DRAMIX Originals', type: 'exclusive', enabled: true, order: 11 },
        { id: 'sec-free', name: 'Gratuitas para Maratonar', type: 'free', enabled: true, order: 12 },
        { id: 'sec-releasing', name: 'Em Lançamento (Novos Episódios)', type: 'releasing', enabled: true, order: 13 },
        { id: 'sec-completed', name: 'Completas para Assistir Tudo', type: 'completed', enabled: true, order: 14 }
      ],

      // 4. Banners do Hero
      heroBanners: [
        {
          id: 'banner-01',
          seriesId: 'dmx-01',
          headline: 'O Retorno do Bilionário Desconhecido',
          subtitle: 'Ele finge ser um motorista comum, mas comanda um império de bilhões e jurou vingança.',
          badge: '#1 NO RANKING BRASIL',
          active: true
        },
        {
          id: 'banner-02',
          seriesId: 'dmx-02',
          headline: 'Casamento por Contrato com o Tirano',
          subtitle: 'O acordo estipulava não se apaixonar. Mas o CEO mais frio quebrou todas as regras.',
          badge: 'ESTREIA EXCLUSIVA',
          active: true
        },
        {
          id: 'banner-03',
          seriesId: 'dmx-10',
          headline: 'Pacto com o Mafioso Bilionário',
          subtitle: 'Elena pensou que estava pagando uma dívida. Descobriu que era o amor da vida de um homem letal.',
          badge: 'TENSÃO TOTAL',
          active: true
        }
      ],

      // 5. Minisséries em Destaque Especial
      featuredSeriesIds: ['dmx-01', 'dmx-02', 'dmx-03', 'dmx-05', 'dmx-10'],

      // 6. Recomendações Manuais Fixadas no "Para Você"
      manualRecommendedIds: ['dmx-01', 'dmx-03'],

      // 7. Configurações Editoriais de Lançamentos
      releaseOverrides: {
        'dmx-01': { isNewRelease: true, badge: 'Super Estreia' },
        'dmx-02': { isReleasing: true, badge: 'Episódios Diários' }
      }
    };
  }

  load() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.config = JSON.parse(stored);
        // Garantir integridade caso falte algum campo
        const def = this.getDefaultConfig();
        this.config = { ...def, ...this.config };
      } else {
        this.config = this.getDefaultConfig();
        this.save();
      }
    } catch (e) {
      console.warn('Erro ao carregar owner config do localStorage:', e);
      this.config = this.getDefaultConfig();
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
      this.notifySubscribers();
    } catch (e) {
      console.error('Erro ao salvar owner config no localStorage:', e);
    }
  }

  resetToDefaults() {
    this.config = this.getDefaultConfig();
    this.save();
    return this.config;
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notifySubscribers() {
    for (const cb of this.subscribers) {
      try {
        cb(this.config);
      } catch (e) {
        console.error('Subscriber callback error:', e);
      }
    }
  }

  // ===================== CRUD DE CATEGORIAS =====================
  getCategories() {
    return [...this.config.categories].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  addCategory(category) {
    const newId = category.id || `cat-custom-${Date.now()}`;
    const newCat = {
      id: newId,
      name: category.name || 'Nova Categoria',
      slug: (category.slug || category.name || 'categoria').toLowerCase().replace(/\s+/g, '-'),
      icon: category.icon || '🎬',
      order: this.config.categories.length + 1,
      description: category.description || 'Descrição da nova categoria.'
    };
    this.config.categories.push(newCat);
    this.save();
    return newCat;
  }

  updateCategory(id, updates) {
    const idx = this.config.categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.config.categories[idx] = { ...this.config.categories[idx], ...updates };
      this.save();
      return this.config.categories[idx];
    }
    return null;
  }

  deleteCategory(id) {
    this.config.categories = this.config.categories.filter(c => c.id !== id);
    this.save();
    return true;
  }

  reorderCategories(orderedIds) {
    orderedIds.forEach((id, index) => {
      const cat = this.config.categories.find(c => c.id === id);
      if (cat) cat.order = index + 1;
    });
    this.save();
  }

  // ===================== CRUD DE COLEÇÕES =====================
  getCollections() {
    return [...this.config.collections];
  }

  addCollection(collection) {
    const newId = collection.id || `col-custom-${Date.now()}`;
    const newCol = {
      id: newId,
      title: collection.title || 'Nova Coleção',
      subtitle: collection.subtitle || 'Subtítulo da coleção editorial.',
      badge: collection.badge || 'Coleção Especial',
      banner: collection.banner || 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
      miniseriesIds: collection.miniseriesIds || []
    };
    this.config.collections.push(newCol);
    this.save();
    return newCol;
  }

  updateCollection(id, updates) {
    const idx = this.config.collections.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.config.collections[idx] = { ...this.config.collections[idx], ...updates };
      this.save();
      return this.config.collections[idx];
    }
    return null;
  }

  deleteCollection(id) {
    this.config.collections = this.config.collections.filter(c => c.id !== id);
    this.save();
    return true;
  }

  setCollectionSeries(collectionId, seriesIds) {
    const col = this.config.collections.find(c => c.id === collectionId);
    if (col) {
      col.miniseriesIds = seriesIds;
      this.save();
      return col;
    }
    return null;
  }

  // ===================== ORGANIZAR HOME / SEÇÕES =====================
  getHomeSections() {
    return [...this.config.homeSections].sort((a, b) => a.order - b.order);
  }

  toggleSection(id, enabled) {
    const sec = this.config.homeSections.find(s => s.id === id);
    if (sec) {
      sec.enabled = enabled !== undefined ? enabled : !sec.enabled;
      this.save();
    }
  }

  moveSection(id, direction) {
    // direction: 'up' or 'down'
    const sections = this.getHomeSections();
    const idx = sections.findIndex(s => s.id === id);
    if (idx === -1) return;

    if (direction === 'up' && idx > 0) {
      const prev = sections[idx - 1];
      const curr = sections[idx];
      const tempOrder = prev.order;
      prev.order = curr.order;
      curr.order = tempOrder;
    } else if (direction === 'down' && idx < sections.length - 1) {
      const next = sections[idx + 1];
      const curr = sections[idx];
      const tempOrder = next.order;
      next.order = curr.order;
      curr.order = tempOrder;
    }

    this.config.homeSections = sections;
    this.save();
  }

  // ===================== BANNERS HERO =====================
  getHeroBanners() {
    return [...this.config.heroBanners];
  }

  addHeroBanner(banner) {
    const newBanner = {
      id: `banner-${Date.now()}`,
      seriesId: banner.seriesId,
      headline: banner.headline || 'Destaque DRAMIX',
      subtitle: banner.subtitle || '',
      badge: banner.badge || 'EXCLUSIVO',
      active: true
    };
    this.config.heroBanners.push(newBanner);
    this.save();
    return newBanner;
  }

  updateHeroBanner(id, updates) {
    const idx = this.config.heroBanners.findIndex(b => b.id === id);
    if (idx !== -1) {
      this.config.heroBanners[idx] = { ...this.config.heroBanners[idx], ...updates };
      this.save();
      return this.config.heroBanners[idx];
    }
    return null;
  }

  deleteHeroBanner(id) {
    this.config.heroBanners = this.config.heroBanners.filter(b => b.id !== id);
    this.save();
    return true;
  }

  // ===================== DESTAQUES E RECOMENDAÇÕES MANUAIS =====================
  getFeaturedSeriesIds() {
    return this.config.featuredSeriesIds || [];
  }

  toggleFeaturedSeries(seriesId) {
    let ids = this.config.featuredSeriesIds || [];
    if (ids.includes(seriesId)) {
      ids = ids.filter(id => id !== seriesId);
    } else {
      ids.push(seriesId);
    }
    this.config.featuredSeriesIds = ids;
    this.save();
    return ids;
  }

  getManualRecommendedIds() {
    return this.config.manualRecommendedIds || [];
  }

  toggleManualRecommendation(seriesId) {
    let ids = this.config.manualRecommendedIds || [];
    if (ids.includes(seriesId)) {
      ids = ids.filter(id => id !== seriesId);
    } else {
      ids.push(seriesId);
    }
    this.config.manualRecommendedIds = ids;
    this.save();
    return ids;
  }
}

window.DramixOwnerStore = DramixOwnerStore;
