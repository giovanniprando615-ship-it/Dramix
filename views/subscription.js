/**
 * DRAMIX — Página de Planos e Assinatura Premium
 * Apresentação profissional dos três planos obrigatórios:
 * - Semanal: R$ 7,90 (7 dias)
 * - Mensal: R$ 29,90 (30 dias)
 * - Anual: R$ 199,90 (12 meses, destaque de economia de 44% e melhor custo-benefício)
 */

(function(root) {
  'use strict';

  class DramixSubscriptionView {
    constructor(api) {
      this.api = api || root.dramixAPI;
    }

    render(container) {
      const plans = this.api.getSubscriptionPlans();
      const user = this.api.getCurrentUser();
      const activeSub = user ? user.activeSubscription : null;

      container.innerHTML = `
        <div class="max-w-5xl mx-auto space-y-12 pb-24 pt-4">
          
          <!-- Cabeçalho Principal -->
          <div class="text-center space-y-3 max-w-2xl mx-auto">
            <span class="px-3.5 py-1 rounded-full bg-gradient-to-r from-[#E52E4D]/20 to-amber-500/20 text-[#E52E4D] border border-[#E52E4D]/30 text-xs font-black uppercase tracking-wider">
              DRAMIX Premium
            </span>
            <h1 class="text-3xl md:text-5xl font-black text-white tracking-tight">
              Acesso Ilimitado a Todas as Histórias
            </h1>
            <p class="text-sm md:text-base text-gray-300 leading-relaxed">
              Assista a episódios completos sem interrupções, sem limites diários e sem anúncios obrigatórios.
            </p>
          </div>

          <!-- Banner de Status se o Usuário já for Premium -->
          ${activeSub ? `
            <div class="p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#E52E4D]/15 to-transparent border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
              <div class="space-y-1 text-center md:text-left">
                <span class="text-xs font-bold uppercase tracking-wider text-amber-400">Assinatura Ativa</span>
                <h3 class="text-lg font-bold text-white">Você é assinante ${activeSub.plan_name}</h3>
                <p class="text-xs text-gray-300">Seu acesso está liberado até <b>${new Date(activeSub.end_date).toLocaleDateString('pt-BR')}</b>.</p>
              </div>
              <button id="sub-view-btn-manage" class="py-2.5 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer">
                Gerenciar Assinatura
              </button>
            </div>
          ` : ''}

          <!-- Grid dos 3 Cards de Assinatura -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            ${plans.map(plan => {
              const isAnnual = plan.id === 'plan-annual';
              const isMonthly = plan.id === 'plan-monthly';

              return `
                <div class="relative flex flex-col justify-between p-6 md:p-8 rounded-3xl border transition-all duration-300 ${isAnnual ? 'bg-[#10172A] border-amber-500/50 shadow-2xl shadow-amber-500/10 md:-translate-y-2' : 'bg-[#0E1322] border-white/10 hover:border-white/20 shadow-xl'}">
                  
                  <!-- Badge Flutuante no Topo -->
                  ${plan.badge ? `
                    <div class="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span class="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg ${isAnnual ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black' : 'bg-[#E52E4D] text-white'}">
                        ${plan.badge}
                      </span>
                    </div>
                  ` : ''}

                  <!-- Cabeçalho do Card -->
                  <div class="space-y-4">
                    <div>
                      <h3 class="text-lg font-black text-white">${plan.name}</h3>
                      <p class="text-xs text-gray-400 mt-1 min-h-[32px]">${plan.description}</p>
                    </div>

                    <!-- Preço -->
                    <div class="py-4 border-y border-white/10">
                      <div class="flex items-baseline gap-1">
                        <span class="text-sm font-bold text-gray-300">R$</span>
                        <span class="text-4xl font-black text-white tracking-tight">${plan.price.toFixed(2).replace('.', ',')}</span>
                        <span class="text-xs text-gray-400 font-medium">/ ${plan.duration_days} dias</span>
                      </div>

                      ${isAnnual ? `
                        <div class="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-semibold leading-tight">
                          Economia de 44% em relação a 12 meses avulsos (R$ 358,80).
                        </div>
                      ` : isMonthly ? `
                        <p class="text-[11px] text-gray-400 mt-1.5">Apenas ~R$ 0,99 por dia de entretenimento.</p>
                      ` : `
                        <p class="text-[11px] text-gray-400 mt-1.5">Perfeito para maratonar no fim de semana.</p>
                      `}
                    </div>

                    <!-- Lista de Benefícios -->
                    <ul class="space-y-2.5 text-xs text-gray-300">
                      <li class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                        <span>Acesso completo ao catálogo Premium</span>
                      </li>
                      <li class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                        <span>Zero anúncios obrigatórios de desbloqueio</span>
                      </li>
                      <li class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                        <span>Reprodução ilimitada sem travas diárias</span>
                      </li>
                      <li class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                        <span>Qualidade Full HD e carregamento veloz</span>
                      </li>
                    </ul>
                  </div>

                  <!-- Botão de Ação -->
                  <div class="pt-6">
                    <button class="w-full py-3.5 rounded-xl font-black text-xs md:text-sm transition-all shadow-lg active:scale-95 cursor-pointer select-plan-btn ${isAnnual ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black shadow-amber-500/20' : 'bg-[#E52E4D] hover:bg-[#c92440] text-white shadow-[#E52E4D]/25'}" data-plan-id="${plan.id}">
                      Assinar agora
                    </button>
                  </div>

                </div>
              `;
            }).join('')}
          </div>

          <!-- Informações Legais Claras e Transparentes -->
          <div class="p-6 md:p-8 rounded-3xl bg-[#0E1322] border border-white/10 space-y-4 text-xs text-gray-400">
            <h4 class="text-sm font-bold text-white uppercase tracking-wider">Condições e Transparência da Assinatura</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p class="font-bold text-gray-300 mb-1">Período de Validade e Cobrança</p>
                <p class="leading-relaxed">O plano semanal é cobrado a cada 7 dias (R$ 7,90), o mensal a cada 30 dias (R$ 29,90) e o anual a cada 12 meses (R$ 199,90).</p>
              </div>
              <div>
                <p class="font-bold text-gray-300 mb-1">Renovação e Cancelamento</p>
                <p class="leading-relaxed">A renovação automática pode ser desativada a qualquer momento diretamente no seu Perfil, mantendo seu acesso até o fim do ciclo pago.</p>
              </div>
              <div>
                <p class="font-bold text-gray-300 mb-1">Confirmação Imediata</p>
                <p class="leading-relaxed">O acesso Premium é liberado automaticamente após a confirmação do pagamento no backend via PIX ou Cartão de Crédito.</p>
              </div>
            </div>
          </div>

        </div>
      `;

      this.bindEvents(container);
    }

    bindEvents(container) {
      container.querySelectorAll('.select-plan-btn').forEach(btn => {
        btn.onclick = () => {
          const planId = btn.dataset.planId;
          const plan = this.api.db.table('subscription_plans').findById(planId);
          if (plan) {
            window.dispatchEvent(new CustomEvent('dramix-open-checkout', { detail: { plan } }));
          }
        };
      });

      const manageBtn = container.querySelector('#sub-view-btn-manage');
      if (manageBtn) {
        manageBtn.onclick = () => {
          window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'profile' } }));
        };
      }
    }
  }

  root.DramixSubscriptionView = DramixSubscriptionView;
})(typeof window !== 'undefined' ? window : global);
