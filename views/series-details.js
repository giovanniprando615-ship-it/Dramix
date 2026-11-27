/**
 * DRAMIX — Página Individual da Minissérie
 * Ficha técnica com pôster vertical, sinopse, temas e lista de episódios:
 * episódios gratuitos (padrão 1 a 5), desbloqueados pela conta e bloqueados com preço em moedas.
 * Oferece desbloquear todos os episódios restantes com desconto.
 */

(function(root) {
  'use strict';

  const LOCK_SVG = '<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>';

  class DramixSeriesDetailsView {
    constructor(api) {
      this.api = api || root.dramixAPI;
    }

    render(container, seriesId) {
      const { esc, safeUrl, coinIcon } = root.dramixUI;
      const user = this.api.getCurrentUser();
      const details = this.api.getSeriesDetails(seriesId, user ? user.id : null);

      if (!details || !details.series.is_published) {
        container.innerHTML = `
          <div class="py-20 text-center space-y-4">
            <h2 class="text-xl font-bold text-white">Minissérie não encontrada</h2>
            <p class="text-xs text-gray-400">Ela pode ter saído do catálogo ou o link está incorreto.</p>
            <button class="px-4 py-2 rounded-xl bg-[#E52E4D] text-white text-xs font-bold" id="btn-back-home">Voltar ao início</button>
          </div>
        `;
        container.querySelector('#btn-back-home').onclick = () => window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'home' } }));
        return;
      }

      const s = details.series;
      const eps = details.episodes;
      const isFav = details.isFavorite;
      const free = details.freeEpisodesCount;
      const price = details.priceCoins;
      const bundle = details.bundle;
      const progress = user ? this.api.getContinueWatching(user.id).find(c => c.series.id === s.id) : null;
      const startLabel = progress ? `Continuar do episódio ${progress.episode.episode_number}` : 'Assistir episódio 1 grátis';

      container.innerHTML = `
        <div class="space-y-10 pb-20">

          <div>
            <button id="details-btn-back" class="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              Voltar
            </button>
          </div>

          <div class="relative rounded-3xl overflow-hidden bg-[#0E1322] border border-white/10 shadow-2xl">
            <img src="${safeUrl(s.backdrop_url || s.poster_url)}" alt="" class="absolute inset-0 w-full h-full object-cover object-top opacity-30" />
            <div class="absolute inset-0 bg-gradient-to-t from-[#0E1322] via-[#0E1322]/80 to-transparent"></div>

            <div class="relative z-10 p-6 md:p-10 flex flex-col md:flex-row gap-8 items-start">
              <div class="relative w-44 md:w-56 aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-white/15 flex-shrink-0 mx-auto md:mx-0">
                <img src="${safeUrl(s.poster_url)}" alt="Pôster de ${esc(s.title)}" class="w-full h-full object-cover" />
                ${s.badge ? `
                  <div class="absolute top-3 left-3 z-10">
                    <span class="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-lg ${esc(s.badge_color || 'bg-[#E52E4D] text-white')}">${esc(s.badge)}</span>
                  </div>
                ` : ''}
              </div>

              <div class="flex-1 space-y-4 min-w-0">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span class="px-2.5 py-0.5 rounded bg-white/10 text-gray-300 text-xs font-bold border border-white/10">${esc(s.content_rating || '14+')}</span>
                  <span class="text-xs text-gray-300 font-semibold">${esc((s.genres || []).join(', '))}</span>
                  <span class="text-xs text-gray-400">${eps.length} episódios</span>
                  <span class="text-xs text-gray-400">${esc(s.total_duration || '')}</span>
                </div>

                <h1 class="text-2xl md:text-4xl font-black text-white leading-tight">${esc(s.title)}</h1>

                ${s.tropes && s.tropes.length ? `
                  <div class="flex flex-wrap gap-1.5 pt-1">
                    ${s.tropes.map(t => `<span class="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-[10px] font-semibold">${esc(t)}</span>`).join('')}
                  </div>
                ` : ''}

                <p class="text-xs md:text-sm text-gray-300 leading-relaxed max-w-3xl pt-1">${esc(s.synopsis)}</p>

                <div class="flex flex-wrap items-center gap-2 text-[11px] text-gray-300 pt-1">
                  <span class="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 font-bold">Episódios 1 a ${free} grátis</span>
                  ${user && user.isPremium ? `
                    <span class="px-2.5 py-1 rounded-lg bg-amber-400/15 text-amber-300 font-bold">Tudo liberado pelo Premium</span>
                  ` : `
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 font-semibold">${coinIcon('w-3.5 h-3.5')} ${price} moedas por episódio depois</span>
                  `}
                </div>

                <div class="flex flex-wrap items-center gap-3 pt-3">
                  <button id="details-btn-start" class="py-3 px-6 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-black text-xs md:text-sm shadow-xl shadow-[#E52E4D]/30 flex items-center gap-2 transition-all active:scale-95">
                    <svg class="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                    ${startLabel}
                  </button>

                  <button id="details-btn-fav" aria-pressed="${isFav}" class="py-3 px-5 rounded-xl border border-white/15 hover:bg-white/10 text-white font-bold text-xs md:text-sm flex items-center gap-2 transition-all active:scale-95 ${isFav ? 'bg-white/15 border-[#E52E4D]/40' : 'bg-black/40'}">
                    <svg class="w-4 h-4 ${isFav ? 'text-[#E52E4D]' : 'text-gray-400'}" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                    <span>${isFav ? 'Na Minha Lista' : 'Adicionar à Minha Lista'}</span>
                  </button>

                  <button id="details-btn-share" class="py-3 px-4 rounded-xl border border-white/15 bg-black/40 hover:bg-white/10 text-white font-bold text-xs md:text-sm">Compartilhar</button>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h2 class="text-lg font-bold text-white tracking-wide">Episódios</h2>
                <p class="text-xs text-gray-400">Desbloqueou uma vez, fica liberado para sempre na sua conta.</p>
              </div>
              ${bundle && bundle.lockedCount > 1 ? `
                <button id="details-btn-bundle" class="py-2.5 px-4 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-200 text-xs font-bold inline-flex items-center gap-2">
                  Desbloquear os ${bundle.lockedCount} restantes
                  <span class="inline-flex items-center gap-1 text-white">${coinIcon('w-3.5 h-3.5')} ${bundle.price}</span>
                  <span class="text-emerald-400">-${bundle.discount}%</span>
                </button>
              ` : ''}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              ${eps.map(ep => {
                const isCurrent = progress && progress.episode.id === ep.id;
                let status;
                if (ep.accessType === 'free') {
                  status = '<span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">Grátis</span>';
                } else if (ep.hasAccess) {
                  status = `<span class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">${ep.accessType === 'premium' ? 'Premium' : 'Desbloqueado'}</span>`;
                } else {
                  status = `<span class="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-bold border border-amber-500/30 inline-flex items-center gap-1">${LOCK_SVG} ${coinIcon('w-3 h-3')} ${price}</span>`;
                }
                return `
                  <button class="p-3.5 rounded-2xl bg-[#0E1322] border ${isCurrent ? 'border-[#E52E4D]/60' : 'border-white/10'} hover:border-[#E52E4D]/50 flex items-center justify-between gap-3 group text-left episode-item-trigger transition-all" data-ep-num="${Number(ep.episode_number)}" aria-label="Episódio ${Number(ep.episode_number)}: ${esc(ep.title)}${ep.hasAccess ? '' : ', bloqueado'}">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-10 h-10 rounded-xl ${isCurrent ? 'bg-[#E52E4D]' : 'bg-white/5'} border border-white/10 flex items-center justify-center font-bold text-xs text-white group-hover:bg-[#E52E4D] transition-colors flex-shrink-0">${Number(ep.episode_number)}</div>
                      <div class="min-w-0">
                        <h3 class="text-xs font-bold text-white truncate group-hover:text-[#E52E4D] transition-colors">${esc(ep.title)}</h3>
                        <span class="text-[10px] text-gray-400">${Math.max(1, Math.round(ep.duration_seconds / 60))} min${isCurrent ? ' • parou aqui' : ''}</span>
                      </div>
                    </div>
                    <div class="flex-shrink-0">${status}</div>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

        </div>
      `;

      this.bindEvents(container, s, progress, bundle);
    }

    bindEvents(container, series, progress, bundle) {
      const play = (episodeNumber, startTimestamp = 0) =>
        window.dispatchEvent(new CustomEvent('dramix-play-episode', { detail: { series, episodeNumber, startTimestamp } }));

      container.querySelector('#details-btn-back').onclick = () => history.length > 1 ? history.back() :
        window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'home' } }));

      container.querySelector('#details-btn-start').onclick = () => {
        if (progress) play(progress.episode.episode_number, progress.progressPercent >= 90 ? 0 : progress.progressSeconds);
        else play(1);
      };

      container.querySelector('#details-btn-fav').onclick = () => {
        const user = this.api.getCurrentUser();
        if (!user) {
          window.dispatchEvent(new CustomEvent('dramix-open-auth-modal'));
          return;
        }
        const res = this.api.toggleFavorite(user.id, series.id);
        root.dramixUI.toast(res.isFavorite ? 'Adicionada à Minha Lista.' : 'Removida da Minha Lista.', 'success');
        this.render(container, series.id);
      };

      container.querySelector('#details-btn-share').onclick = async () => {
        const url = `${location.origin}${location.pathname}#/series/${encodeURIComponent(series.id)}`;
        try {
          if (navigator.share) await navigator.share({ title: series.title, url });
          else {
            await navigator.clipboard.writeText(url);
            root.dramixUI.toast('Link copiado.', 'success');
          }
        } catch (e) { /* compartilhamento cancelado */ }
      };

      const bundleBtn = container.querySelector('#details-btn-bundle');
      if (bundleBtn) {
        bundleBtn.onclick = () => {
          const user = this.api.getCurrentUser();
          if (!confirm(`Desbloquear ${bundle.lockedCount} episódios por ${bundle.price} moedas?`)) return;
          try {
            const res = this.api.unlockSeriesWithCoins(user.id, series.id);
            root.dramixUI.toast(`${res.unlockedCount || 0} episódios desbloqueados. Saldo: ${res.balance} moedas.`, 'coins');
            window.dispatchEvent(new CustomEvent('dramix-wallet-updated'));
          } catch (err) {
            if (err.code === 'INSUFFICIENT_COINS') {
              root.dramixUI.toast(`Faltam ${err.missing} moedas.`, 'error');
              window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'store' } }));
            } else {
              root.dramixUI.toast(err.message, 'error');
            }
          }
        };
      }

      container.querySelectorAll('.episode-item-trigger').forEach(item => {
        item.onclick = () => {
          const epNum = parseInt(item.dataset.epNum, 10);
          const resume = progress && progress.episode.episode_number === epNum && progress.progressPercent < 90;
          play(epNum, resume ? progress.progressSeconds : 0);
        };
      });
    }
  }

  root.DramixSeriesDetailsView = DramixSeriesDetailsView;
})(typeof window !== 'undefined' ? window : global);
