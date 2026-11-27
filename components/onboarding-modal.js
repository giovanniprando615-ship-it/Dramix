/**
 * DRAMIX — Onboarding do primeiro acesso
 * Pergunta a faixa etária e os gêneros favoritos. As respostas alimentam
 * "Recomendado para você" e escondem produções 18+ de contas menores de idade.
 */

(function(root) {
  'use strict';

  const AGE_RANGES = [
    { id: '13-17', label: '13 a 17' },
    { id: '18-24', label: '18 a 24' },
    { id: '25-34', label: '25 a 34' },
    { id: '35-44', label: '35 a 44' },
    { id: '45+', label: '45 ou mais' }
  ];

  const CHIP_ON = 'bg-[#E52E4D] border-[#E52E4D] text-white';
  const CHIP_OFF = 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10';

  class DramixOnboardingModal {
    constructor(api) {
      this.api = api || root.dramixAPI;
      this.age = null;
      this.genres = new Set();
    }

    open(onDone) {
      const user = this.api.getCurrentUser();
      if (!user) return;
      const { esc, coinIcon } = root.dramixUI;
      this.onDone = onDone;
      this.age = user.ageRange;
      this.genres = new Set(user.preferredGenres || []);
      const genres = this.api.db.table('genres').all();

      let modal = document.getElementById('dramix-onboarding-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dramix-onboarding-modal';
        modal.className = 'fixed inset-0 z-[65] bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'onboarding-title');
        document.body.appendChild(modal);
      }
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';

      modal.innerHTML = `
        <div class="w-full sm:max-w-lg bg-[#0E1322] border border-white/15 rounded-t-3xl sm:rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[94vh] overflow-y-auto">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold">
              ${coinIcon('w-3.5 h-3.5')} ${user.coins} moedas na sua carteira
            </div>
            <h2 id="onboarding-title" class="text-2xl font-black text-white">Oi, ${esc(user.name.split(' ')[0])}. Vamos montar sua lista.</h2>
            <p class="text-xs text-gray-400">Duas perguntas rápidas para recomendar as histórias certas para você.</p>
          </div>

          <fieldset class="space-y-2">
            <legend class="text-sm font-bold text-white mb-2">Qual é a sua idade?</legend>
            <div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
              ${AGE_RANGES.map(a => `
                <button type="button" class="onb-age px-2 py-2.5 rounded-xl border text-xs font-semibold ${this.age === a.id ? CHIP_ON : CHIP_OFF}" data-age="${a.id}" aria-pressed="${this.age === a.id}">${a.label}</button>
              `).join('')}
            </div>
          </fieldset>

          <fieldset class="space-y-2">
            <legend class="text-sm font-bold text-white mb-2">Quais gêneros você mais gosta? <span class="text-gray-400 font-normal">Escolha quantos quiser.</span></legend>
            <div class="flex flex-wrap gap-2">
              ${genres.map(g => `
                <button type="button" class="onb-genre px-3.5 py-2 rounded-xl border text-xs font-semibold ${this.genres.has(g.name) ? CHIP_ON : CHIP_OFF}" data-genre="${esc(g.name)}" aria-pressed="${this.genres.has(g.name)}">${esc(g.name)}</button>
              `).join('')}
            </div>
          </fieldset>

          <p id="onb-error" class="text-xs text-red-400 hidden" role="alert">Escolha sua faixa etária para continuar.</p>

          <div class="flex items-center justify-between gap-3 pt-2">
            <button type="button" id="onb-skip" class="text-xs text-gray-400 hover:text-white px-2 py-2">Pular por enquanto</button>
            <button type="button" id="onb-save" class="py-3 px-6 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-black text-sm">Ver minhas recomendações</button>
          </div>
        </div>
      `;

      modal.querySelectorAll('.onb-age').forEach(btn => {
        btn.onclick = () => {
          this.age = btn.dataset.age;
          modal.querySelectorAll('.onb-age').forEach(b => {
            const on = b === btn;
            b.className = `onb-age px-2 py-2.5 rounded-xl border text-xs font-semibold ${on ? CHIP_ON : CHIP_OFF}`;
            b.setAttribute('aria-pressed', String(on));
          });
        };
      });

      modal.querySelectorAll('.onb-genre').forEach(btn => {
        btn.onclick = () => {
          const g = btn.dataset.genre;
          if (this.genres.has(g)) this.genres.delete(g); else this.genres.add(g);
          const on = this.genres.has(g);
          btn.className = `onb-genre px-3.5 py-2 rounded-xl border text-xs font-semibold ${on ? CHIP_ON : CHIP_OFF}`;
          btn.setAttribute('aria-pressed', String(on));
        };
      });

      modal.querySelector('#onb-skip').onclick = () => this.finish(user.id, { ageRange: this.age, preferredGenres: [...this.genres] });
      modal.querySelector('#onb-save').onclick = () => {
        if (!this.age) {
          modal.querySelector('#onb-error').classList.remove('hidden');
          return;
        }
        this.finish(user.id, { ageRange: this.age, preferredGenres: [...this.genres] });
      };

      const first = modal.querySelector('.onb-age');
      if (first) first.focus();
    }

    finish(userId, prefs) {
      this.api.savePreferences(userId, prefs);
      const modal = document.getElementById('dramix-onboarding-modal');
      if (modal) modal.classList.add('hidden');
      document.body.style.overflow = '';
      if (this.onDone) this.onDone();
    }
  }

  root.DramixOnboardingModal = DramixOnboardingModal;
})(typeof window !== 'undefined' ? window : global);
