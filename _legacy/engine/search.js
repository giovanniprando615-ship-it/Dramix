/**
 * DRAMIX - Mecanismo de Pesquisa Inteligente
 * Pesquisa ponderada multi-campo: Títulos, Sinopses, Gêneros, Tags, Temas e Personagens.
 * Histórico em localStorage, autocomplete em tempo real, sugestões populares e filtros avançados.
 */

class DramixSearchEngine {
  constructor(catalog) {
    this.catalog = catalog || window.DRAMIX_MINISERIES_CATALOG || [];
    this.historyStorageKey = 'dramix_search_history';
    this.popularSearches = [
      'romance CEO',
      'Casamento por Contrato',
      'Vingança da Herdeira',
      'Alexander Vance',
      'Bilionário Secreto',
      'Reencarnação',
      'K-Drama Coreano',
      'Amor Proibido',
      'Máfia Bilionária',
      'Bebê Secreto do CEO'
    ];
  }

  setCatalog(catalog) {
    this.catalog = catalog;
  }

  // Normalização de texto (remove acentos, pontuação e converte para minúsculas)
  normalize(text) {
    if (!text) return '';
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  // Obter histórico de buscas salvo
  getHistory() {
    try {
      const stored = localStorage.getItem(this.historyStorageKey);
      return stored ? JSON.parse(stored) : ['romance CEO', 'casamento por contrato', 'vingança'];
    } catch (e) {
      return ['romance CEO', 'casamento por contrato'];
    }
  }

  // Adicionar ao histórico de buscas
  addToHistory(query) {
    const trimmed = (query || '').trim();
    if (!trimmed || trimmed.length < 2) return;

    let history = this.getHistory();
    // Remove ocorrência anterior se existir
    history = history.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
    // Adiciona no topo
    history.unshift(trimmed);
    // Limita aos 10 termos mais recentes
    history = history.slice(0, 10);

    try {
      localStorage.setItem(this.historyStorageKey, JSON.stringify(history));
    } catch (e) {
      console.warn('Erro ao salvar histórico de pesquisa:', e);
    }
    return history;
  }

  // Remover item específico do histórico
  removeFromHistory(item) {
    let history = this.getHistory();
    history = history.filter(h => h.toLowerCase() !== (item || '').toLowerCase());
    try {
      localStorage.setItem(this.historyStorageKey, JSON.stringify(history));
    } catch (e) {}
    return history;
  }

  // Limpar todo o histórico
  clearHistory() {
    try {
      localStorage.removeItem(this.historyStorageKey);
    } catch (e) {}
    return [];
  }

  // Obter buscas populares / trending
  getPopularSearches() {
    return this.popularSearches;
  }

  // Gerar sugestões automáticas (autocomplete)
  getSuggestions(query, limit = 8) {
    const raw = (query || '').trim();
    if (!raw) return [];

    const normQuery = this.normalize(raw);
    const suggestions = [];
    const seen = new Set();

    // 1. Sugestões de Título
    for (const item of this.catalog) {
      const normTitle = this.normalize(item.title);
      if (normTitle.includes(normQuery)) {
        if (!seen.has(item.title)) {
          suggestions.push({
            text: item.title,
            type: 'Título',
            icon: '🎬',
            targetId: item.id
          });
          seen.add(item.title);
        }
      }
    }

    // 2. Sugestões de Personagens
    for (const item of this.catalog) {
      if (item.characters && Array.isArray(item.characters)) {
        for (const char of item.characters) {
          const normChar = this.normalize(char.name);
          if (normChar.includes(normQuery)) {
            const label = `${char.name} (${item.title})`;
            if (!seen.has(label)) {
              suggestions.push({
                text: char.name,
                subtitle: `Personagem em ${item.title}`,
                type: 'Personagem',
                icon: '👤',
                targetId: item.id
              });
              seen.add(label);
            }
          }
        }
      }
    }

    // 3. Sugestões de Tags e Temas
    for (const item of this.catalog) {
      const combined = [...(item.tags || []), ...(item.themes || []), ...(item.genres || [])];
      for (const tag of combined) {
        const normTag = this.normalize(tag);
        if (normTag.includes(normQuery)) {
          if (!seen.has(tag.toLowerCase())) {
            suggestions.push({
              text: tag,
              type: 'Tema / Gênero',
              icon: '🏷️'
            });
            seen.add(tag.toLowerCase());
          }
        }
      }
    }

    return suggestions.slice(0, limit);
  }

  // Algoritmo de Pesquisa com Pontuação de Relevância
  search(query, options = {}) {
    const {
      filterGenre = 'all',
      filterStatus = 'all', // 'all', 'free', 'exclusive', 'completed', 'releasing'
      filterCategory = 'all',
      sortBy = 'relevance' // 'relevance', 'popularity', 'views', 'rating', 'newest'
    } = options;

    const rawQuery = (query || '').trim();
    const normQuery = this.normalize(rawQuery);
    const queryTokens = normQuery.split(/\s+/).filter(t => t.length > 0);

    // Se a busca estiver vazia, retorna catálogo filtrado e ordenado
    if (!normQuery) {
      let filtered = [...this.catalog];
      filtered = this.applyFilters(filtered, filterGenre, filterStatus, filterCategory);
      filtered = this.sortResults(filtered, sortBy === 'relevance' ? 'popularity' : sortBy);
      return {
        query: '',
        totalResults: filtered.length,
        items: filtered.map(item => ({ item, score: 0, matchedFields: [] }))
      };
    }

    // Calcular pontuação de relevância para cada minissérie
    const scoredResults = [];

    for (const series of this.catalog) {
      let score = 0;
      const matchedFields = [];

      const normTitle = this.normalize(series.title);
      const normOrigTitle = this.normalize(series.originalTitle);
      const normSynopsis = this.normalize(series.synopsis);
      const normTagline = this.normalize(series.tagline);
      const normGenres = (series.genres || []).map(g => this.normalize(g));
      const normTags = (series.tags || []).map(t => this.normalize(t));
      const normThemes = (series.themes || []).map(t => this.normalize(t));
      const charNames = (series.characters || []).map(c => this.normalize(c.name));
      const actorNames = (series.characters || []).map(c => this.normalize(c.actor));

      // 1. Correspondência exata da frase inteira
      if (normTitle === normQuery) {
        score += 200;
        matchedFields.push('Título Exato');
      } else if (normTitle.includes(normQuery)) {
        score += 100;
        matchedFields.push('Título');
      }

      if (normTags.some(t => t === normQuery || t.includes(normQuery))) {
        score += 80;
        matchedFields.push('Tag');
      }

      if (normThemes.some(th => th.includes(normQuery))) {
        score += 60;
        matchedFields.push('Tema');
      }

      if (charNames.some(c => c.includes(normQuery))) {
        score += 75;
        matchedFields.push('Personagem');
      }

      if (actorNames.some(a => a.includes(normQuery))) {
        score += 50;
        matchedFields.push('Ator/Elenco');
      }

      if (normSynopsis.includes(normQuery) || normTagline.includes(normQuery)) {
        score += 30;
        matchedFields.push('Sinopse');
      }

      // 2. Correspondência token por token (ex: "romance" e "CEO")
      let tokenMatchesCount = 0;
      for (const token of queryTokens) {
        let tokenFound = false;

        if (normTitle.includes(token)) {
          score += 35;
          tokenFound = true;
        }
        if (normTags.some(t => t.includes(token))) {
          score += 25;
          tokenFound = true;
        }
        if (normGenres.some(g => g.includes(token))) {
          score += 20;
          tokenFound = true;
        }
        if (normThemes.some(th => th.includes(token))) {
          score += 20;
          tokenFound = true;
        }
        if (charNames.some(c => c.includes(token))) {
          score += 25;
          tokenFound = true;
        }
        if (normSynopsis.includes(token)) {
          score += 10;
          tokenFound = true;
        }

        if (tokenFound) tokenMatchesCount++;
      }

      // Bônus se todos os tokens da busca foram encontrados (ex: "romance" E "CEO")
      if (queryTokens.length > 1 && tokenMatchesCount === queryTokens.length) {
        score += 50; // Super bônus para match completo multi-termo
        matchedFields.push('Todos os Termos');
      }

      // Se encontrou algo, adiciona peso de popularidade e avaliação
      if (score > 0) {
        // Normalização de métricas: rating 4.8 dá +4.8 pts, trendingScore 95 dá +9.5 pts
        const popBonus = (series.metrics?.trendingScore || 50) * 0.1 + (series.metrics?.rating || 4) * 2;
        score += popBonus;

        scoredResults.push({
          item: series,
          score: Math.round(score * 10) / 10,
          matchedFields: [...new Set(matchedFields)]
        });
      }
    }

    // Filtragem
    let filteredResults = scoredResults.filter(entry => {
      const s = entry.item;
      // Gênero
      if (filterGenre !== 'all' && !(s.genres || []).includes(filterGenre)) {
        return false;
      }
      // Categoria
      if (filterCategory !== 'all' && !(s.categories || []).includes(filterCategory)) {
        return false;
      }
      // Status
      if (filterStatus === 'free' && !s.isFree) return false;
      if (filterStatus === 'exclusive' && !s.isExclusive) return false;
      if (filterStatus === 'completed' && !s.isCompleted) return false;
      if (filterStatus === 'releasing' && !s.isReleasing) return false;

      return true;
    });

    // Ordenação
    filteredResults = this.sortSearchResults(filteredResults, sortBy);

    return {
      query: rawQuery,
      totalResults: filteredResults.length,
      items: filteredResults
    };
  }

  applyFilters(list, filterGenre, filterStatus, filterCategory) {
    return list.filter(s => {
      if (filterGenre !== 'all' && !(s.genres || []).includes(filterGenre)) return false;
      if (filterCategory !== 'all' && !(s.categories || []).includes(filterCategory)) return false;
      if (filterStatus === 'free' && !s.isFree) return false;
      if (filterStatus === 'exclusive' && !s.isExclusive) return false;
      if (filterStatus === 'completed' && !s.isCompleted) return false;
      if (filterStatus === 'releasing' && !s.isReleasing) return false;
      return true;
    });
  }

  sortSearchResults(results, sortBy) {
    const list = [...results];
    switch (sortBy) {
      case 'relevance':
        return list.sort((a, b) => b.score - a.score);
      case 'popularity':
        return list.sort((a, b) => (b.item.metrics?.trendingScore || 0) - (a.item.metrics?.trendingScore || 0));
      case 'views':
        return list.sort((a, b) => (b.item.metrics?.views || 0) - (a.item.metrics?.views || 0));
      case 'rating':
        return list.sort((a, b) => (b.item.metrics?.rating || 0) - (a.item.metrics?.rating || 0));
      case 'newest':
        return list.sort((a, b) => new Date(b.item.releaseDate) - new Date(a.item.releaseDate));
      default:
        return list.sort((a, b) => b.score - a.score);
    }
  }

  sortResults(list, sortBy) {
    const sorted = [...list];
    switch (sortBy) {
      case 'popularity':
        return sorted.sort((a, b) => (b.metrics?.trendingScore || 0) - (a.metrics?.trendingScore || 0));
      case 'views':
        return sorted.sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0));
      case 'rating':
        return sorted.sort((a, b) => (b.metrics?.rating || 0) - (a.metrics?.rating || 0));
      case 'newest':
        return sorted.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
      default:
        return sorted;
    }
  }
}

window.DramixSearchEngine = DramixSearchEngine;
