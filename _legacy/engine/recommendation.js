/**
 * DRAMIX - Motor de Recomendações Personalizadas
 * Algoritmo híbrido: Similaridade de conteúdo (Jaccard + pesos vetoriais em Tags/Gêneros/Temas),
 * Histórico de exibição, Minisséries concluídas, Favoritos, Popularidade e Intervenção Editorial (Owner).
 */

class DramixRecommendationEngine {
  constructor(catalog) {
    this.catalog = catalog || window.DRAMIX_MINISERIES_CATALOG || [];
  }

  setCatalog(catalog) {
    this.catalog = catalog;
  }

  // Similaridade de Jaccard ponderada entre duas minisséries
  calculateSimilarity(seriesA, seriesB) {
    if (!seriesA || !seriesB || seriesA.id === seriesB.id) return 0;

    // Gêneros (peso 2.0)
    const genresA = new Set(seriesA.genres || []);
    const genresB = new Set(seriesB.genres || []);
    const genreOverlap = [...genresA].filter(x => genresB.has(x)).length;
    const genreUnion = new Set([...genresA, ...genresB]).size;
    const genreScore = genreUnion ? (genreOverlap / genreUnion) * 2.0 : 0;

    // Categorias (peso 2.5)
    const catsA = new Set(seriesA.categories || []);
    const catsB = new Set(seriesB.categories || []);
    const catOverlap = [...catsA].filter(x => catsB.has(x)).length;
    const catUnion = new Set([...catsA, ...catsB]).size;
    const catScore = catUnion ? (catOverlap / catUnion) * 2.5 : 0;

    // Tags & Temas (peso 3.0)
    const tagsA = new Set([...(seriesA.tags || []), ...(seriesA.themes || [])]);
    const tagsB = new Set([...(seriesB.tags || []), ...(seriesB.themes || [])]);
    const tagOverlap = [...tagsA].filter(x => tagsB.has(x)).length;
    const tagUnion = new Set([...tagsA, ...tagsB]).size;
    const tagScore = tagUnion ? (tagOverlap / tagUnion) * 3.0 : 0;

    const totalWeight = 2.0 + 2.5 + 3.0; // 7.5
    const similarity = (genreScore + catScore + tagScore) / totalWeight;
    return similarity;
  }

  // Encontrar minisséries similares a uma específica
  getSimilarSeries(targetSeriesId, limit = 6) {
    const target = this.catalog.find(s => s.id === targetSeriesId);
    if (!target) return [];

    const scored = this.catalog
      .filter(s => s.id !== targetSeriesId)
      .map(s => ({
        series: s,
        similarity: this.calculateSimilarity(target, s),
        affinityPercent: Math.min(99, Math.round(50 + this.calculateSimilarity(target, s) * 49))
      }))
      .filter(entry => entry.similarity > 0.15)
      .sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, limit);
  }

  // Gerar o feed personalizado "Para Você" para um perfil de usuário
  getRecommendationsForUser(userProfile, options = {}) {
    if (!userProfile) return [];

    const {
      manualPinnedIds = [], // Minisséries destacadas manualmente pelo Owner
      limit = 10,
      includeCompleted = false
    } = options;

    const watchHistoryIds = new Set((userProfile.watchHistory || []).map(h => h.miniseriesId));
    const favoriteIds = new Set(userProfile.favorites || []);
    const completedIds = new Set(
      (userProfile.watchHistory || [])
        .filter(h => h.completed || h.progressPercent >= 90)
        .map(h => h.miniseriesId)
    );

    // Mapear minisséries de referência que o usuário amou
    const anchorSeriesList = this.catalog.filter(s => favoriteIds.has(s.id) || completedIds.has(s.id));

    // Vetor de preferências do usuário
    const prefGenres = new Set(userProfile.preferredGenres || []);
    const prefCategories = new Set(userProfile.preferredCategories || []);
    const prefTags = new Set((userProfile.preferredTags || []).map(t => t.toLowerCase()));

    const scoredList = [];

    for (const series of this.catalog) {
      // Pular concluídas se solicitado
      if (!includeCompleted && completedIds.has(series.id)) {
        continue;
      }

      let score = 0;
      let reason = 'Recomendado para o seu perfil';
      let bestAnchorMatch = null;
      let highestSimilarityWithAnchor = 0;

      // 1. Similaridade com itens que o usuário favoritou ou concluiu
      for (const anchor of anchorSeriesList) {
        const sim = this.calculateSimilarity(anchor, series);
        if (sim > highestSimilarityWithAnchor) {
          highestSimilarityWithAnchor = sim;
          bestAnchorMatch = anchor;
        }
      }

      if (bestAnchorMatch && highestSimilarityWithAnchor > 0.2) {
        score += highestSimilarityWithAnchor * 60;
        reason = `Porque você assistiu "${bestAnchorMatch.title}"`;
      }

      // 2. Compatibilidade direta com gêneros preferidos
      const matchedGenresCount = (series.genres || []).filter(g => prefGenres.has(g)).length;
      score += matchedGenresCount * 18;

      // 3. Compatibilidade com categorias preferidas
      const matchedCatsCount = (series.categories || []).filter(c => prefCategories.has(c)).length;
      score += matchedCatsCount * 22;

      // 4. Compatibilidade com tags preferidas
      const matchedTagsCount = (series.tags || []).filter(t => prefTags.has(t.toLowerCase())).length;
      score += matchedTagsCount * 25;

      // Se encontrou tags favoritas fortes e não tinha âncora
      if (!bestAnchorMatch && matchedTagsCount > 0) {
        const firstTag = (series.tags || []).find(t => prefTags.has(t.toLowerCase()));
        reason = `Baseado em seu interesse por "${firstTag}"`;
      }

      // 5. Bônus de Popularidade e Avaliação (Métricas Reais)
      const popularityBonus = ((series.metrics?.trendingScore || 50) / 100) * 15;
      const ratingBonus = ((series.metrics?.rating || 4.5) / 5) * 10;
      score += popularityBonus + ratingBonus;

      // 6. Bônus para Lançamentos recentes
      if (series.isNewRelease) {
        score += 8;
      }

      // 7. Intervenção do Owner (Minisséries Fixadas Manualmente)
      if (manualPinnedIds.includes(series.id)) {
        score += 200; // Garante topo
        reason = 'Destaque Editorial Especial';
      }

      // Normalizar porcentagem de afinidade (65% a 99%)
      const affinity = Math.min(99, Math.max(68, Math.round(55 + score * 0.35)));

      scoredList.push({
        series,
        score: Math.round(score * 10) / 10,
        affinityPercent: affinity,
        reason,
        isPinnedByOwner: manualPinnedIds.includes(series.id),
        isFavorite: favoriteIds.has(series.id),
        isWatched: watchHistoryIds.has(series.id)
      });
    }

    // Ordenar por pontuação final
    scoredList.sort((a, b) => b.score - a.score);

    return scoredList.slice(0, limit);
  }
}

window.DramixRecommendationEngine = DramixRecommendationEngine;
