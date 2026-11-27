/**
 * DRAMIX — Checkout (Assinatura Premium e Pacotes de Moedas)
 * PIX (QR Code + copia e cola) ou cartão de crédito.
 *
 * MODO DE TESTE: ainda não há gateway de pagamento conectado. O botão "Confirmar"
 * simula a aprovação. Em produção, a confirmação vem do webhook do gateway no servidor
 * (Mercado Pago / Pagar.me / Stripe) e esta tela apenas aguarda o status.
 */

(function(root) {
  'use strict';

  const TAB_ON = 'py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs bg-[#E52E4D]/20 border-[#E52E4D] text-white';
  const TAB_OFF = 'py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs bg-white/5 border-white/10 text-gray-300 hover:bg-white/10';

  class DramixCheckoutModal {
    constructor(api) {
      this.api = api || root.dramixAPI;
      this.order = null;
      this.currentMethod = 'pix';
      this.initDOM();
    }

    initDOM() {
      let modal = document.getElementById('dramix-checkout-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dramix-checkout-modal';
        modal.className = 'fixed inset-0 z-[60] bg-black/85 backdrop-blur-md hidden flex items-end sm:items-center justify-center p-0 sm:p-4';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'checkout-plan-title');
        modal.innerHTML = `
          <div class="relative w-full sm:max-w-lg bg-[#0E1322] border border-white/15 rounded-t-3xl sm:rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 max-h-[94vh] overflow-y-auto">
            <button id="checkout-btn-close" class="absolute top-4 right-4 text-gray-400 hover:text-white w-10 h-10 rounded-full text-xl font-bold" aria-label="Fechar">&times;</button>

            <div class="space-y-1 pr-10">
              <span id="checkout-kind-label" class="text-xs font-bold text-[#E52E4D]">Assinatura</span>
              <h3 id="checkout-plan-title" class="text-2xl font-black text-white">Plano</h3>
              <p id="checkout-plan-desc" class="text-xs text-gray-400"></p>
            </div>

            <div class="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <span class="text-xs text-gray-400 block">Total</span>
                <span id="checkout-plan-price" class="text-2xl font-black text-white">R$ 0,00</span>
              </div>
              <span id="checkout-plan-period" class="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold"></span>
            </div>

            <div class="p-3 rounded-xl bg-sky-500/10 border border-sky-500/25 text-[11px] text-sky-200 leading-relaxed">
              Modo de teste: nenhum valor é cobrado. A confirmação abaixo simula a aprovação do pagamento.
            </div>

            <div class="space-y-2">
              <span class="text-xs font-bold text-gray-400 block">Forma de pagamento</span>
              <div class="grid grid-cols-2 gap-3" role="tablist">
                <button id="checkout-method-pix" class="${TAB_ON}" role="tab" aria-selected="true">PIX</button>
                <button id="checkout-method-card" class="${TAB_OFF}" role="tab" aria-selected="false">Cartão de crédito</button>
              </div>
            </div>

            <div id="checkout-area-pix" class="space-y-4 p-4 rounded-2xl bg-black/40 border border-white/10 text-center">
              <div class="w-40 h-40 mx-auto bg-white p-2 rounded-xl flex items-center justify-center" aria-label="QR Code PIX ilustrativo">
                <svg viewBox="0 0 100 100" class="w-full h-full text-black" aria-hidden="true">
                  <rect width="100" height="100" fill="white" />
                  <path d="M10,10 h30 v30 h-30 z M15,15 v20 h20 v-20 z M20,20 h10 v10 h-10 z" fill="black" />
                  <path d="M60,10 h30 v30 h-30 z M65,15 v20 h20 v-20 z M70,20 h10 v10 h-10 z" fill="black" />
                  <path d="M10,60 h30 v30 h-30 z M15,65 v20 h20 v-20 z M20,70 h10 v10 h-10 z" fill="black" />
                  <circle cx="50" cy="50" r="10" fill="black" />
                  <rect x="55" y="60" width="10" height="25" fill="black" />
                  <rect x="70" y="55" width="20" height="10" fill="black" />
                  <rect x="75" y="75" width="15" height="15" fill="black" />
                </svg>
              </div>
              <div class="space-y-1.5">
                <label for="checkout-pix-copia-cola" class="text-xs font-semibold text-gray-300 block">Escaneie o QR Code ou copie o código PIX</label>
                <div class="flex items-center gap-2">
                  <input type="text" id="checkout-pix-copia-cola" readonly class="flex-1 min-w-0 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-[11px] font-mono text-gray-300 outline-none" value="" />
                  <button id="checkout-btn-copy-pix" class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold">Copiar</button>
                </div>
              </div>
            </div>

            <form id="checkout-area-card" class="space-y-3 hidden" novalidate>
              <div>
                <label for="card-number" class="text-[11px] text-gray-400 block mb-1">Número do cartão</label>
                <input type="text" id="card-number" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#E52E4D]" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="card-expiry" class="text-[11px] text-gray-400 block mb-1">Validade (MM/AA)</label>
                  <input type="text" id="card-expiry" inputmode="numeric" autocomplete="cc-exp" placeholder="12/28" maxlength="5" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#E52E4D]" />
                </div>
                <div>
                  <label for="card-cvv" class="text-[11px] text-gray-400 block mb-1">CVV</label>
                  <input type="text" id="card-cvv" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#E52E4D]" />
                </div>
              </div>
              <p id="card-error" class="text-[11px] text-red-400 hidden" role="alert"></p>
            </form>

            <button id="checkout-btn-confirm" class="w-full py-4 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] disabled:opacity-60 text-white font-black text-sm flex items-center justify-center gap-2">
              <span id="checkout-confirm-text">Confirmar pagamento</span>
            </button>

            <p id="checkout-footnote" class="text-[11px] text-gray-400 text-center leading-relaxed"></p>
          </div>
        `;
        document.body.appendChild(modal);
      }
      this.bindEvents();
    }

    bindEvents() {
      document.getElementById('checkout-btn-close').onclick = () => this.close();

      const pixTab = document.getElementById('checkout-method-pix');
      const cardTab = document.getElementById('checkout-method-card');
      const setMethod = (method) => {
        this.currentMethod = method;
        const isPix = method === 'pix';
        pixTab.className = isPix ? TAB_ON : TAB_OFF;
        cardTab.className = isPix ? TAB_OFF : TAB_ON;
        pixTab.setAttribute('aria-selected', String(isPix));
        cardTab.setAttribute('aria-selected', String(!isPix));
        document.getElementById('checkout-area-pix').classList.toggle('hidden', !isPix);
        document.getElementById('checkout-area-card').classList.toggle('hidden', isPix);
        if (this.order) this.api.setPaymentMethod(this.order.transactionId, method);
      };
      pixTab.onclick = () => setMethod('pix');
      cardTab.onclick = () => setMethod('credit_card');
      this.setMethod = setMethod;

      const copyPixBtn = document.getElementById('checkout-btn-copy-pix');
      copyPixBtn.onclick = async () => {
        const input = document.getElementById('checkout-pix-copia-cola');
        try {
          await navigator.clipboard.writeText(input.value);
        } catch (e) {
          input.select();
          document.execCommand('copy');
        }
        copyPixBtn.textContent = 'Copiado';
        setTimeout(() => { copyPixBtn.textContent = 'Copiar'; }, 2000);
      };

      // Máscaras simples nos campos do cartão
      const num = document.getElementById('card-number');
      num.oninput = () => { num.value = num.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 '); };
      const exp = document.getElementById('card-expiry');
      exp.oninput = () => { const d = exp.value.replace(/\D/g, '').slice(0, 4); exp.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };
      const cvv = document.getElementById('card-cvv');
      cvv.oninput = () => { cvv.value = cvv.value.replace(/\D/g, '').slice(0, 4); };

      document.getElementById('checkout-btn-confirm').onclick = () => this.processPaymentConfirmation();

      document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('dramix-checkout-modal');
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) this.close();
      });
    }

    validateCard() {
      const digits = document.getElementById('card-number').value.replace(/\D/g, '');
      const exp = document.getElementById('card-expiry').value;
      const cvv = document.getElementById('card-cvv').value;

      let sum = 0;
      for (let i = 0; i < digits.length; i++) {
        let d = parseInt(digits[digits.length - 1 - i], 10);
        if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
        sum += d;
      }
      if (digits.length < 13 || sum % 10 !== 0) return 'Confira o número do cartão.';

      const m = exp.match(/^(\d{2})\/(\d{2})$/);
      if (!m || +m[1] < 1 || +m[1] > 12) return 'Use a validade no formato MM/AA.';
      const expEnd = new Date(2000 + +m[2], +m[1], 1);
      if (expEnd <= new Date()) return 'Este cartão está vencido.';

      if (!/^\d{3,4}$/.test(cvv)) return 'O CVV tem 3 ou 4 dígitos.';
      return null;
    }

    // Assinatura (mantém a assinatura antiga do método: open(plan))
    open(plan) {
      this.openOrder('subscription', plan);
    }

    openCoinPackage(pkg, options = {}) {
      this.openOrder('coins', pkg, options);
    }

    openOrder(kind, item, options = {}) {
      const { brl } = root.dramixUI;
      const user = this.api.getCurrentUser();
      if (!user) {
        window.dispatchEvent(new CustomEvent('dramix-open-auth-modal'));
        return;
      }

      try {
        this.order = kind === 'coins'
          ? this.api.createCoinOrder(user.id, item.id, this.currentMethod)
          : this.api.createCheckoutOrder(user.id, item.id, this.currentMethod);
      } catch (err) {
        root.dramixUI.toast(err.message, 'error');
        return;
      }
      this.options = options;

      const total = item.coins + (item.bonus_coins || 0);
      document.getElementById('checkout-kind-label').textContent = kind === 'coins' ? 'Loja de moedas' : 'Assinatura Premium';
      document.getElementById('checkout-plan-title').textContent = kind === 'coins' ? `${total} moedas` : item.name;
      document.getElementById('checkout-plan-desc').textContent = kind === 'coins'
        ? (item.bonus_coins ? `${item.coins} moedas + ${item.bonus_coins} de bônus. As moedas não expiram.` : 'As moedas não expiram.')
        : item.description;
      document.getElementById('checkout-plan-price').textContent = brl(item.price);
      document.getElementById('checkout-plan-period').textContent = kind === 'coins' ? 'Pagamento único' : `Por ${item.duration_days} dias`;
      document.getElementById('checkout-pix-copia-cola').value = this.order.pixCode;
      document.getElementById('checkout-confirm-text').textContent = kind === 'coins' ? 'Confirmar compra' : 'Confirmar e ativar Premium';
      document.getElementById('checkout-footnote').textContent = kind === 'coins'
        ? 'As moedas entram na sua carteira assim que o pagamento é aprovado.'
        : 'Renovação automática. Cancele quando quiser em Perfil > Assinatura, sem multa.';
      document.getElementById('card-error').classList.add('hidden');

      document.getElementById('dramix-checkout-modal').classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      document.getElementById('checkout-btn-close').focus();
    }

    processPaymentConfirmation() {
      if (!this.order) return;
      const confirmBtn = document.getElementById('checkout-btn-confirm');
      const textSpan = document.getElementById('checkout-confirm-text');
      const cardError = document.getElementById('card-error');

      if (this.currentMethod === 'credit_card') {
        const problem = this.validateCard();
        if (problem) {
          cardError.textContent = problem;
          cardError.classList.remove('hidden');
          return;
        }
        cardError.classList.add('hidden');
      }

      confirmBtn.disabled = true; // evita duplo clique
      textSpan.textContent = 'Confirmando pagamento...';

      setTimeout(() => {
        try {
          const result = this.api.confirmPayment(this.order.transactionId);
          const order = this.order;
          this.close();
          if (result.kind === 'coins') {
            root.dramixUI.toast(result.message, 'coins');
            window.dispatchEvent(new CustomEvent('dramix-wallet-updated', { detail: { order, options: this.options } }));
          } else {
            root.dramixUI.toast(result.message, 'success');
            window.dispatchEvent(new CustomEvent('dramix-subscription-updated'));
          }
        } catch (e) {
          root.dramixUI.toast('Não foi possível confirmar o pagamento: ' + e.message, 'error');
          confirmBtn.disabled = false;
          textSpan.textContent = 'Confirmar pagamento';
        }
      }, 900);
    }

    close() {
      const modal = document.getElementById('dramix-checkout-modal');
      if (modal) modal.classList.add('hidden');
      document.body.style.overflow = '';
      this.order = null;
      const confirmBtn = document.getElementById('checkout-btn-confirm');
      if (confirmBtn) confirmBtn.disabled = false;
      ['card-number', 'card-expiry', 'card-cvv'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    }
  }

  root.DramixCheckoutModal = DramixCheckoutModal;
})(typeof window !== 'undefined' ? window : global);
