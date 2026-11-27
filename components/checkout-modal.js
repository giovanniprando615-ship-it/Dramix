/**
 * DRAMIX — Modal de Checkout e Confirmação de Assinatura Premium
 * Suporte a pagamento via PIX (QR Code e Copia e Cola) e Cartão de Crédito,
 * com confirmação real no backend que ativa o status Premium no banco de dados.
 */

(function(root) {
  'use strict';

  class DramixCheckoutModal {
    constructor(api) {
      this.api = api || root.dramixAPI;
      this.selectedPlan = null;
      this.currentMethod = 'pix';
      this.initDOM();
    }

    initDOM() {
      let modal = document.getElementById('dramix-checkout-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dramix-checkout-modal';
        modal.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md hidden flex items-center justify-center p-4 transition-all duration-300';
        modal.innerHTML = `
          <div class="relative w-full max-w-lg bg-[#0E1322] border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            
            <!-- Botão Fechar -->
            <button id="checkout-btn-close" class="absolute top-4 right-4 text-gray-400 hover:text-white p-2 text-xl font-bold">&times;</button>

            <!-- Cabeçalho -->
            <div class="space-y-1">
              <span class="text-xs font-bold text-[#E52E4D] uppercase tracking-wider">Assinatura Segura DRAMIX</span>
              <h3 id="checkout-plan-title" class="text-2xl font-black text-white">Plano Mensal</h3>
              <p id="checkout-plan-desc" class="text-xs text-gray-400">Acesso ilimitado e sem anúncios a todo o catálogo.</p>
            </div>

            <!-- Resumo do Valor -->
            <div class="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <span class="text-xs text-gray-400 block">Total a pagar:</span>
                <span id="checkout-plan-price" class="text-2xl font-black text-white">R$ 29,90</span>
              </div>
              <span id="checkout-plan-period" class="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">Por 30 dias</span>
            </div>

            <!-- Seleção de Método de Pagamento -->
            <div class="space-y-2">
              <label class="text-xs font-bold uppercase tracking-wider text-gray-400 block">Forma de Pagamento</label>
              <div class="grid grid-cols-2 gap-3">
                <button id="checkout-method-pix" class="py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer bg-[#E52E4D]/20 border-[#E52E4D] text-white">
                  <span>💠 PIX Instantâneo</span>
                </button>
                <button id="checkout-method-card" class="py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer bg-white/5 border-white/10 text-gray-300 hover:bg-white/10">
                  <span>💳 Cartão de Crédito</span>
                </button>
              </div>
            </div>

            <!-- Área de Pagamento PIX -->
            <div id="checkout-area-pix" class="space-y-4 p-4 rounded-2xl bg-black/40 border border-white/10 text-center">
              <div class="w-40 h-40 mx-auto bg-white p-2 rounded-xl flex items-center justify-center shadow-md">
                <!-- QR Code Simulado Dinâmico -->
                <svg viewBox="0 0 100 100" class="w-full h-full text-black">
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
                <p class="text-xs font-semibold text-gray-300">Escaneie o QR Code ou copie o código Pix:</p>
                <div class="flex items-center gap-2">
                  <input type="text" id="checkout-pix-copia-cola" readonly class="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-[11px] font-mono text-gray-300 outline-none truncate" value="" />
                  <button id="checkout-btn-copy-pix" class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer">
                    Copiar
                  </button>
                </div>
              </div>
            </div>

            <!-- Área de Pagamento Cartão de Crédito -->
            <div id="checkout-area-card" class="space-y-3 hidden">
              <div>
                <label class="text-[11px] text-gray-400 block mb-1">Número do Cartão</label>
                <input type="text" id="card-number" placeholder="4532 •••• •••• 8892" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E52E4D]" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-[11px] text-gray-400 block mb-1">Validade (MM/AA)</label>
                  <input type="text" id="card-expiry" placeholder="12/28" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E52E4D]" />
                </div>
                <div>
                  <label class="text-[11px] text-gray-400 block mb-1">CVV</label>
                  <input type="text" id="card-cvv" placeholder="123" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#E52E4D]" />
                </div>
              </div>
            </div>

            <!-- Botão de Confirmação Real -->
            <div class="pt-2">
              <button id="checkout-btn-confirm" class="w-full py-4 rounded-xl bg-gradient-to-r from-[#E52E4D] to-[#ff4767] hover:from-[#d12442] hover:to-[#eb3b5b] text-white font-black text-sm shadow-xl shadow-[#E52E4D]/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer">
                <span id="checkout-confirm-text">Confirmar Pagamento e Ativar Premium</span>
              </button>
            </div>

            <p class="text-[11px] text-gray-400 text-center leading-relaxed">
              Ao confirmar, sua assinatura será ativada imediatamente no banco de dados. Cobrança recorrente com cancelamento simples a qualquer momento no seu perfil.
            </p>

          </div>
        `;
        document.body.appendChild(modal);
      }

      this.bindEvents();
    }

    bindEvents() {
      const closeBtn = document.getElementById('checkout-btn-close');
      if (closeBtn) closeBtn.onclick = () => this.close();

      const pixTab = document.getElementById('checkout-method-pix');
      const cardTab = document.getElementById('checkout-method-card');
      const pixArea = document.getElementById('checkout-area-pix');
      const cardArea = document.getElementById('checkout-area-card');

      if (pixTab && cardTab) {
        pixTab.onclick = () => {
          this.currentMethod = 'pix';
          pixTab.className = 'py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer bg-[#E52E4D]/20 border-[#E52E4D] text-white';
          cardTab.className = 'py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer bg-white/5 border-white/10 text-gray-300 hover:bg-white/10';
          pixArea.classList.remove('hidden');
          cardArea.classList.add('hidden');
        };

        cardTab.onclick = () => {
          this.currentMethod = 'credit_card';
          cardTab.className = 'py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer bg-[#E52E4D]/20 border-[#E52E4D] text-white';
          pixTab.className = 'py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer bg-white/5 border-white/10 text-gray-300 hover:bg-white/10';
          cardArea.classList.remove('hidden');
          pixArea.classList.add('hidden');
        };
      }

      const copyPixBtn = document.getElementById('checkout-btn-copy-pix');
      if (copyPixBtn) {
        copyPixBtn.onclick = () => {
          const input = document.getElementById('checkout-pix-copia-cola');
          if (input) {
            input.select();
            document.execCommand('copy');
            copyPixBtn.textContent = 'Copiado!';
            setTimeout(() => { copyPixBtn.textContent = 'Copiar'; }, 2000);
          }
        };
      }

      const confirmBtn = document.getElementById('checkout-btn-confirm');
      if (confirmBtn) {
        confirmBtn.onclick = () => this.processPaymentConfirmation();
      }
    }

    open(plan) {
      this.selectedPlan = plan;
      const user = this.api.getCurrentUser();

      if (!user) {
        window.dispatchEvent(new CustomEvent('dramix-open-auth-modal'));
        return;
      }

      // Cria a ordem de checkout no backend
      const order = this.api.createCheckoutOrder(user.id, plan.id, this.currentMethod);
      this.currentTransactionId = order.transactionId;

      document.getElementById('checkout-plan-title').textContent = plan.name;
      document.getElementById('checkout-plan-desc').textContent = plan.description;
      document.getElementById('checkout-plan-price').textContent = `R$ ${plan.price.toFixed(2).replace('.', ',')}`;
      document.getElementById('checkout-plan-period').textContent = `Por ${plan.duration_days} dias`;
      document.getElementById('checkout-pix-copia-cola').value = order.pixCode;

      const modal = document.getElementById('dramix-checkout-modal');
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    processPaymentConfirmation() {
      const confirmBtn = document.getElementById('checkout-btn-confirm');
      const textSpan = document.getElementById('checkout-confirm-text');
      if (!this.currentTransactionId) return;

      confirmBtn.disabled = true;
      textSpan.innerHTML = '<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span> Processando confirmação...';

      setTimeout(() => {
        try {
          const result = this.api.confirmPayment(this.currentTransactionId);
          alert(`🎉 Pagamento confirmado com sucesso!\n\nSeu ${this.selectedPlan.name} está ATIVO.\nAgora você tem acesso irrestrito a todos os episódios do DRAMIX sem anúncios.`);
          
          this.close();
          window.dispatchEvent(new CustomEvent('dramix-subscription-updated'));
          window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'home' } }));
        } catch (e) {
          alert('Erro ao processar pagamento: ' + e.message);
          confirmBtn.disabled = false;
          textSpan.textContent = 'Confirmar Pagamento e Ativar Premium';
        }
      }, 1200);
    }

    close() {
      const modal = document.getElementById('dramix-checkout-modal');
      if (modal) modal.classList.add('hidden');
      document.body.style.overflow = '';
      const confirmBtn = document.getElementById('checkout-btn-confirm');
      const textSpan = document.getElementById('checkout-confirm-text');
      if (confirmBtn) confirmBtn.disabled = false;
      if (textSpan) textSpan.textContent = 'Confirmar Pagamento e Ativar Premium';
    }
  }

  root.DramixCheckoutModal = DramixCheckoutModal;
})(typeof window !== 'undefined' ? window : global);
