/**
 * DRAMIX - Mecanismo de Rankings Baseado em Métricas Reais
 * Calcula tabelas de líderes e seleções editoriais com base em:
 * Visualizações, Desbloqueios com Moedas, Favoritos, Avaliações e Velocidade de Reprodução.
 */

class DramixRankingsEngine {
  constructor(catalog) {
    this.catalog = catalog || window.DRAMIX_MINISERIES_CATALOG || [];
  }

  setCatalog(catalog) {
    this.catalog = catalog;
  }

  // Top 10 Oficial da Semana (Exibido com números gigantes estilizados)
  getTop10Weekly(limit = 10) {
    return [...this.catalog]
      .sort((a, b) => {
        // Usa weeklyRank explícito ou calcula por engajamento composto
        const rankA = a.metrics?.weeklyRank || 999;
        const rankB = b.metrics?.weeklyRank || 999;
        if (rankA !== rankB) return rankA - rankB;
        return (b.metrics?.views || 0) - (a.metrics?.views || 0);
      })
      .slice(0, limit);
  }

  // Mais Assistidas (Classificadas por contagem total de visualizações)
  getMostWatched(limit = 10) {
    return [...this.catalog]
      .sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0))
      .slice(0, limit);
  }

  // Mais Populares (Classificadas pela pontuação de popularidade e nota)
  getMostPopular(limit = 10) {
    return [...this.catalog]
      .sort((a, b) => {
        const scoreA = (a.metrics?.trendingScore || 0) * (a.metrics?.rating || 4);
        const scoreB = (b.metrics?.trendingScore || 0) * (b.metrics?.rating || 4);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  // Em Alta (Trending - Maior velocidade de engajamento nos últimos dias)
  getTrending(limit = 10) {
    return [...this.catalog]
      .sort((a, b) => (b.metrics?.trendingScore || 0) - (a.metrics?.trendingScore || 0))
      .slice(0, limit);
  }

  // Mais Favoritadas (Classificadas por likes e adições à lista)
  getMostFavorited(limit = 10) {
    return [...this.catalog]
      .sort((a, b) => (b.metrics?.likes || 0) - (a.metrics?.likes || 0))
      .slice(0, limit);
  }

  // Mais Desbloqueadas (Classificadas por desbloqueios de episódios com moedas)
  getMostUnlocked(limit = 10) {
    return [...this.catalog]
      .sort((a, b) => (b.metrics?.unlocks || 0) - (a.metrics?.unlocks || 0))
      .slice(0, limit);
  }

  // Novidades / Lançamentos Recentes (Classificadas por data de estreia)
  getNewReleases(limit = 10) {
    return [...this.catalog]
      .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
      .slice(0, limit);
  }

  // Obter sumário completo de todos os rankings
  getAllRankings() {
    return {
      top10: this.getTop10Weekly(10),
      mostWatched: this.getMostWatched(10),
      mostPopular: this.getMostPopular(10),
      trending: this.getTrending(10),
      mostFavorited: this.getMostFavorited(10),
      mostUnlocked: this.getMostUnlocked(10),
      newReleases: this.getNewReleases(10)
    };
  }
}

window.DramixRankingsEngine = DramixRankingsEngine;
