/**
 * DRAMIX — Utilitários de interface compartilhados
 * - esc(): escapa texto antes de inserir em innerHTML (proteção contra XSS)
 * - safeUrl(): só aceita URLs http(s) ou imagens data: em src/href
 * - toast(): aviso discreto no lugar de alert()
 * - brl(), coinIcon(), freeLabel()
 */

(function(root) {
  'use strict';

  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[&<>"'`]/g, ch => ESC_MAP[ch]);
  }

  function safeUrl(value) {
    const url = String(value || '').trim();
    if (/^https?:\/\//i.test(url) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(url)) return esc(url);
    return '';
  }

  function brl(amount) {
    return (Number(amount) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function coinIcon(cls = 'w-4 h-4') {
    return `<svg class="${cls} flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#F5B83D"/><circle cx="12" cy="12" r="7" fill="none" stroke="#B57F14" stroke-width="1.5"/><path d="M12 7.5v9M9.5 9.5h3.8a1.6 1.6 0 010 3.2h-2.6a1.6 1.6 0 000 3.2h3.8" fill="none" stroke="#7A520A" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  }

  function freeLabel(series) {
    const n = series && Number.isFinite(series.free_episodes_count) ? series.free_episodes_count : 5;
    if (n <= 0) return '';
    return n === 1 ? 'Ep. 1 grátis' : `${n} eps grátis`;
  }

  function toast(message, type = 'info') {
    let host = document.getElementById('dramix-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'dramix-toast-host';
      host.className = 'fixed z-[70] left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 flex flex-col items-center gap-2 w-[calc(100%-32px)] max-w-sm pointer-events-none';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    const colors = {
      success: 'border-emerald-500/40 bg-[#0E1A17]',
      error: 'border-red-500/40 bg-[#1A0E12]',
      coins: 'border-amber-400/40 bg-[#1A150A]',
      info: 'border-white/15 bg-[#0E1322]'
    };
    const el = document.createElement('div');
    el.className = `pointer-events-auto w-full px-4 py-3 rounded-2xl border text-xs font-semibold text-white shadow-2xl flex items-center gap-2 transition-all duration-300 opacity-0 translate-y-2 ${colors[type] || colors.info}`;
    el.innerHTML = `${type === 'coins' ? coinIcon('w-4 h-4') : ''}<span>${esc(message)}</span>`;
    host.appendChild(el);
    while (host.children.length > 3) host.firstElementChild.remove();
    requestAnimationFrame(() => el.classList.remove('opacity-0', 'translate-y-2'));
    setTimeout(() => {
      el.classList.add('opacity-0');
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  root.dramixUI = { esc, safeUrl, brl, coinIcon, freeLabel, toast };
})(typeof window !== 'undefined' ? window : global);
