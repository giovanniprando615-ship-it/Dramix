/**
 * DRAMIX — Configurações e Páginas Informativas
 * Rotas: #/settings, #/settings/account, #/settings/language, #/settings/restore,
 *        #/settings/support, #/settings/terms, #/settings/privacy, #/settings/subscription-policy
 *
 * Os textos legais são um modelo inicial baseado no CDC e na LGPD. Antes do lançamento,
 * substitua os campos entre colchetes e peça a revisão de um advogado.
 */

(function(root) {
  'use strict';

  const COMPANY = '[RAZÃO SOCIAL DA EMPRESA]';
  const CNPJ = '[CNPJ]';
  const UPDATED = '27 de novembro de 2026';

  const CHEVRON = '<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';

  class DramixSettingsView {
    constructor(api) {
      this.api = api || root.dramixAPI;
    }

    nav(page) {
      window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'settings', page } }));
    }

    render(container, params = {}) {
      const page = params.page || 'index';
      const pages = {
        index: () => this.renderIndex(),
        account: () => this.renderAccount(),
        language: () => this.renderLanguage(),
        restore: () => this.renderRestore(),
        support: () => this.renderSupport(),
        terms: () => this.renderLegal('Termos de uso', this.termsHtml()),
        privacy: () => this.renderLegal('Política de privacidade', this.privacyHtml()),
        'subscription-policy': () => this.renderLegal('Política de assinaturas e moedas', this.subscriptionPolicyHtml())
      };
      container.innerHTML = `<div class="max-w-2xl mx-auto pb-24 pt-2">${(pages[page] || pages.index)()}</div>`;
      this.bindEvents(container, page);
    }

    backButton(label = 'Configurações', page = 'index') {
      return `
        <button class="settings-back inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white mb-6" data-page="${page}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          ${label}
        </button>
      `;
    }

    row(page, title, desc) {
      return `
        <li>
          <button class="settings-link w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-white/5" data-page="${page}">
            <span>
              <span class="block text-sm font-semibold text-white">${title}</span>
              ${desc ? `<span class="block text-[11px] text-gray-400 mt-0.5">${desc}</span>` : ''}
            </span>
            ${CHEVRON}
          </button>
        </li>
      `;
    }

    group(title, rows) {
      return `
        <section class="space-y-2">
          <h2 class="text-xs font-bold text-gray-400 px-1">${title}</h2>
          <ul class="rounded-2xl bg-[#0E1322] border border-white/10 divide-y divide-white/5 overflow-hidden">${rows}</ul>
        </section>
      `;
    }

    renderIndex() {
      const user = this.api.getCurrentUser();
      return `
        <h1 class="text-2xl font-black text-white mb-6">Configurações</h1>
        <div class="space-y-6">
          ${this.group('Conta', `
            ${user ? this.row('account', 'Configurações da conta', 'Nome, e-mail, senha, preferências e exclusão da conta') : this.row('account', 'Entrar ou criar conta', 'Ganhe moedas de boas-vindas')}
            ${this.row('language', 'Idioma', 'Português (Brasil)')}
          `)}
          ${this.group('Compras', `
            ${this.row('restore', 'Restaurar compras', 'Recupere moedas e assinaturas já pagas')}
            ${this.row('subscription-policy', 'Política de assinaturas e moedas', 'Renovação, cancelamento e reembolso')}
          `)}
          ${this.group('Ajuda e informações', `
            ${this.row('support', 'Suporte ao usuário', 'Fale com a equipe DRAMIX')}
            ${this.row('terms', 'Termos de uso')}
            ${this.row('privacy', 'Política de privacidade', 'Como tratamos seus dados (LGPD)')}
          `)}
        </div>
        <p class="text-[11px] text-gray-500 text-center mt-8">DRAMIX versão 1.0.0</p>
      `;
    }

    renderAccount() {
      const { esc } = root.dramixUI;
      const user = this.api.getCurrentUser();
      if (!user) {
        return `
          ${this.backButton()}
          <div class="p-6 rounded-3xl bg-[#0E1322] border border-white/10 text-center space-y-4">
            <h1 class="text-xl font-black text-white">Entre na sua conta</h1>
            <p class="text-xs text-gray-400">Suas moedas, sua lista e seu histórico ficam salvos na sua conta.</p>
            <button class="settings-auth w-full py-3 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-bold text-sm">Entrar ou criar conta</button>
          </div>
        `;
      }
      const genres = (user.preferredGenres || []).join(', ') || 'Nenhum escolhido';
      return `
        ${this.backButton()}
        <h1 class="text-2xl font-black text-white mb-6">Configurações da conta</h1>
        <div class="space-y-6">
          <section class="p-5 rounded-2xl bg-[#0E1322] border border-white/10 space-y-3 text-xs">
            <div class="flex justify-between gap-3"><span class="text-gray-400">Nome</span><span class="text-white font-semibold text-right">${esc(user.name)}</span></div>
            <div class="flex justify-between gap-3"><span class="text-gray-400">E-mail ou celular</span><span class="text-white font-semibold text-right break-all">${esc(user.email || user.phone)}</span></div>
            <div class="flex justify-between gap-3"><span class="text-gray-400">Plano</span><span class="text-white font-semibold">${user.isPremium ? 'Premium' : 'Gratuito'}</span></div>
            <button class="settings-edit-profile w-full mt-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold">Editar nome, e-mail, foto ou senha</button>
          </section>

          <section class="p-5 rounded-2xl bg-[#0E1322] border border-white/10 space-y-3 text-xs">
            <h2 class="text-sm font-bold text-white">Preferências de conteúdo</h2>
            <div class="flex justify-between gap-3"><span class="text-gray-400">Faixa etária</span><span class="text-white font-semibold">${esc(user.ageRange || 'Não informada')}</span></div>
            <div class="flex justify-between gap-3"><span class="text-gray-400">Gêneros favoritos</span><span class="text-white font-semibold text-right">${esc(genres)}</span></div>
            <button class="settings-prefs w-full mt-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold">Alterar preferências</button>
          </section>

          <section class="p-5 rounded-2xl bg-[#0E1322] border border-white/10 space-y-3 text-xs">
            <h2 class="text-sm font-bold text-white">Privacidade</h2>
            <button class="settings-clear-history w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold">Limpar histórico de reprodução</button>
          </section>

          <section class="p-5 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-3 text-xs">
            <h2 class="text-sm font-bold text-red-300">Excluir conta</h2>
            <p class="text-gray-400 leading-relaxed">Apaga seu perfil, lista, histórico, moedas e episódios desbloqueados. Assinaturas ativas não são reembolsadas automaticamente. Esta ação não pode ser desfeita.</p>
            <button class="settings-delete-account w-full py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 font-bold border border-red-500/30">Excluir minha conta</button>
          </section>
        </div>
      `;
    }

    renderLanguage() {
      return `
        ${this.backButton()}
        <h1 class="text-2xl font-black text-white mb-2">Idioma</h1>
        <p class="text-xs text-gray-400 mb-6">O DRAMIX está disponível em português do Brasil. Inglês e espanhol chegam junto com o catálogo dublado e legendado.</p>
        <ul class="rounded-2xl bg-[#0E1322] border border-white/10 divide-y divide-white/5 overflow-hidden" role="radiogroup" aria-label="Idioma do aplicativo">
          <li class="px-4 py-3.5 flex items-center justify-between" role="radio" aria-checked="true">
            <span class="text-sm font-semibold text-white">Português (Brasil)</span>
            <span class="w-5 h-5 rounded-full border-[6px] border-[#E52E4D]" aria-hidden="true"></span>
          </li>
          <li class="px-4 py-3.5 flex items-center justify-between opacity-50" role="radio" aria-checked="false" aria-disabled="true">
            <span class="text-sm font-semibold text-white">English</span><span class="text-[11px] text-gray-400">Em breve</span>
          </li>
          <li class="px-4 py-3.5 flex items-center justify-between opacity-50" role="radio" aria-checked="false" aria-disabled="true">
            <span class="text-sm font-semibold text-white">Español</span><span class="text-[11px] text-gray-400">Em breve</span>
          </li>
        </ul>
      `;
    }

    renderRestore() {
      const user = this.api.getCurrentUser();
      const paid = user ? this.api.db.table('payments').find(p => p.user_id === user.id && p.status === 'paid') : [];
      return `
        ${this.backButton()}
        <h1 class="text-2xl font-black text-white mb-2">Restaurar compras</h1>
        <p class="text-xs text-gray-400 mb-6 leading-relaxed">Conferimos cada pagamento aprovado da sua conta. Se alguma compra de moedas não entrou na carteira, ou se uma assinatura paga e ainda vigente não está ativa, ela é devolvida agora. Nada é cobrado de novo.</p>
        ${user ? `
          <div class="p-5 rounded-2xl bg-[#0E1322] border border-white/10 space-y-4">
            <p class="text-xs text-gray-300">${paid.length} ${paid.length === 1 ? 'pagamento aprovado' : 'pagamentos aprovados'} nesta conta.</p>
            <button class="settings-restore w-full py-3 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-bold text-sm">Restaurar compras</button>
            <p id="settings-restore-result" class="text-xs text-gray-300 hidden" role="status"></p>
          </div>
        ` : `
          <button class="settings-auth w-full py-3 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-bold text-sm">Entre para restaurar suas compras</button>
        `}
      `;
    }

    renderSupport() {
      const { esc } = root.dramixUI;
      const user = this.api.getCurrentUser();
      const email = this.api.settings().support_email;
      const faq = [
        ['Quantos episódios são grátis?', 'Os primeiros 5 episódios de cada minissérie, salvo quando a página da série indicar outro número.'],
        ['Paguei e as moedas não apareceram.', 'Use Configurações > Restaurar compras. Se continuar faltando, mande uma mensagem abaixo com a data e o valor do pagamento.'],
        ['Desbloqueei um episódio. Vou pagar de novo?', 'Não. O episódio fica liberado na sua conta para sempre, em qualquer aparelho.'],
        ['Como cancelo a assinatura?', 'Em Perfil > Assinatura e pagamentos > Cancelar renovação. O acesso continua até o fim do período pago.']
      ];
      return `
        ${this.backButton()}
        <h1 class="text-2xl font-black text-white mb-2">Suporte ao usuário</h1>
        <p class="text-xs text-gray-400 mb-6">Respondemos em até 2 dias úteis no e-mail informado. Você também pode escrever para <a class="text-white underline" href="mailto:${esc(email)}">${esc(email)}</a>.</p>

        <section class="space-y-2 mb-8">
          <h2 class="text-xs font-bold text-gray-400 px-1">Perguntas frequentes</h2>
          <div class="rounded-2xl bg-[#0E1322] border border-white/10 divide-y divide-white/5">
            ${faq.map(([q, a]) => `
              <details class="group px-4 py-3.5">
                <summary class="text-sm font-semibold text-white cursor-pointer list-none flex justify-between gap-3">${q}<span class="text-gray-500 group-open:rotate-45 transition-transform" aria-hidden="true">+</span></summary>
                <p class="text-xs text-gray-400 mt-2 leading-relaxed">${a}</p>
              </details>
            `).join('')}
          </div>
        </section>

        <form id="support-form" class="p-5 rounded-2xl bg-[#0E1322] border border-white/10 space-y-4" novalidate>
          <h2 class="text-sm font-bold text-white">Enviar mensagem</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="support-name" class="text-[11px] text-gray-400 block mb-1">Nome</label>
              <input id="support-name" value="${esc(user ? user.name : '')}" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#E52E4D]" />
            </div>
            <div>
              <label for="support-email" class="text-[11px] text-gray-400 block mb-1">E-mail para resposta</label>
              <input id="support-email" type="email" required value="${esc(user ? user.email : '')}" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#E52E4D]" />
            </div>
          </div>
          <div>
            <label for="support-subject" class="text-[11px] text-gray-400 block mb-1">Assunto</label>
            <select id="support-subject" class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#E52E4D]">
              <option>Pagamento ou moedas</option>
              <option>Assinatura</option>
              <option>Problema no vídeo</option>
              <option>Minha conta</option>
              <option>Sugestão de história</option>
              <option>Outro assunto</option>
            </select>
          </div>
          <div>
            <label for="support-message" class="text-[11px] text-gray-400 block mb-1">Mensagem</label>
            <textarea id="support-message" rows="4" required class="w-full bg-black/60 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#E52E4D]"></textarea>
          </div>
          <p id="support-error" class="text-xs text-red-400 hidden" role="alert"></p>
          <button type="submit" class="w-full py-3 rounded-xl bg-[#E52E4D] hover:bg-[#c92440] text-white font-bold text-sm">Enviar mensagem</button>
        </form>
      `;
    }

    renderLegal(title, body) {
      return `
        ${this.backButton()}
        <article class="legal-text">
          <h1 class="text-2xl font-black text-white mb-1">${title}</h1>
          <p class="text-[11px] text-gray-500 mb-6">Última atualização: ${UPDATED}</p>
          <div class="space-y-5 text-[13px] leading-relaxed text-gray-300">${body}</div>
        </article>
      `;
    }

    h(text) { return `<h2 class="text-base font-bold text-white pt-2">${text}</h2>`; }

    termsHtml() {
      return `
        <p>Estes termos regulam o uso do DRAMIX, serviço de minisséries em episódios curtos oferecido por ${COMPANY}, CNPJ ${CNPJ}. Ao criar uma conta ou assistir a qualquer conteúdo, você concorda com eles.</p>
        ${this.h('1. Conta')}
        <p>Você precisa ter pelo menos 13 anos para criar uma conta. Menores de 18 anos devem usar o serviço com autorização dos responsáveis. Você é responsável por manter sua senha em sigilo e pelas atividades feitas na sua conta. Cada pessoa pode receber o bônus de boas-vindas uma única vez; contas criadas apenas para acumular bônus podem ser encerradas.</p>
        ${this.h('2. Conteúdo')}
        <p>As minisséries são licenciadas para uso pessoal e não comercial. É proibido copiar, gravar, redistribuir ou exibir publicamente o conteúdo. Algumas produções são criadas com apoio de inteligência artificial. O catálogo pode mudar a qualquer momento.</p>
        ${this.h('3. Moedas')}
        <p>Moedas são um crédito virtual usado apenas dentro do DRAMIX para desbloquear episódios. Elas não têm valor monetário, não podem ser trocadas por dinheiro, transferidas entre contas ou vendidas. Moedas compradas não expiram. Moedas de bônus (boas-vindas e presente diário) podem ter regras próprias divulgadas no aplicativo.</p>
        ${this.h('4. Episódios desbloqueados')}
        <p>Um episódio desbloqueado com moedas ou anúncio fica disponível na sua conta enquanto ela existir e enquanto o título estiver no catálogo. Se um título for removido, as moedas usadas nos episódios ainda não assistidos serão devolvidas à sua carteira.</p>
        ${this.h('5. Pagamentos e assinaturas')}
        <p>Preços, renovação, cancelamento e reembolso estão descritos na Política de assinaturas e moedas, que faz parte destes termos.</p>
        ${this.h('6. Uso proibido')}
        <p>Não é permitido burlar bloqueios de episódios, manipular saldo de moedas, usar robôs, compartilhar contas de forma comercial ou interferir no funcionamento do serviço. Essas condutas podem levar à suspensão da conta sem reembolso das moedas obtidas indevidamente.</p>
        ${this.h('7. Alterações e contato')}
        <p>Podemos atualizar estes termos e avisaremos no aplicativo quando houver mudanças relevantes. Dúvidas: ${root.dramixUI.esc(this.api.settings().support_email)}. Fica eleito o foro do domicílio do consumidor.</p>
      `;
    }

    privacyHtml() {
      return `
        <p>Esta política explica como ${COMPANY}, CNPJ ${CNPJ}, controladora dos dados, trata suas informações pessoais no DRAMIX, de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
        ${this.h('Dados que coletamos')}
        <ul class="list-disc pl-5 space-y-1">
          <li>Cadastro: nome, e-mail ou celular, senha (guardada de forma criptografada) e foto de perfil, se você enviar.</li>
          <li>Preferências: faixa etária e gêneros favoritos informados no primeiro acesso.</li>
          <li>Uso: episódios assistidos, progresso, lista, desbloqueios e movimentações de moedas.</li>
          <li>Pagamentos: valor, data, forma de pagamento e status. Os dados do cartão são processados pelo intermediador de pagamento e não ficam guardados no DRAMIX.</li>
          <li>Suporte: as mensagens que você nos envia.</li>
        </ul>
        ${this.h('Para que usamos')}
        <p>Para criar e manter sua conta, liberar os episódios que você desbloqueou, processar compras, recomendar histórias, proteger menores de conteúdo impróprio, prevenir fraude e responder ao suporte. Bases legais: execução de contrato, cumprimento de obrigação legal, legítimo interesse e consentimento quando aplicável.</p>
        ${this.h('Com quem compartilhamos')}
        <p>Somente com prestadores necessários ao serviço: hospedagem e banco de dados, processamento de pagamento, envio de e-mails e, se você aceitar, parceiros de anúncios recompensados. Não vendemos seus dados.</p>
        ${this.h('Por quanto tempo guardamos')}
        <p>Enquanto sua conta existir. Ao excluir a conta, apagamos seus dados pessoais, exceto registros de pagamento que a lei manda guardar por até 5 anos.</p>
        ${this.h('Seus direitos')}
        <p>Você pode acessar, corrigir, exportar ou apagar seus dados, além de revogar consentimentos. Use Configurações > Configurações da conta ou escreva para ${root.dramixUI.esc(this.api.settings().support_email)}. Você também pode reclamar à ANPD.</p>
        ${this.h('Encarregado de dados (DPO)')}
        <p>[NOME DO ENCARREGADO] — [E-MAIL DO ENCARREGADO].</p>
      `;
    }

    subscriptionPolicyHtml() {
      const plans = this.api.getSubscriptionPlans();
      const { brl } = root.dramixUI;
      return `
        ${this.h('Planos Premium')}
        <ul class="list-disc pl-5 space-y-1">
          ${plans.map(p => `<li>${p.name}: ${brl(p.price)} a cada ${p.duration_days} dias.</li>`).join('')}
        </ul>
        <p>O Premium libera todos os episódios de todas as minisséries enquanto estiver ativo, sem gastar moedas e sem anúncios de desbloqueio.</p>
        ${this.h('Renovação automática')}
        <p>A assinatura renova sozinha ao fim de cada período, pelo mesmo valor, na mesma forma de pagamento. Avisaremos por e-mail antes de qualquer mudança de preço.</p>
        ${this.h('Cancelamento')}
        <p>Cancele quando quiser em Perfil > Assinatura e pagamentos > Cancelar renovação. Não há multa. O acesso continua até o fim do período já pago.</p>
        ${this.h('Direito de arrependimento')}
        <p>Conforme o artigo 49 do Código de Defesa do Consumidor, você pode pedir reembolso integral em até 7 dias após a primeira contratação de um plano ou a compra de moedas, desde que as moedas compradas não tenham sido usadas. Peça pelo Suporte.</p>
        ${this.h('Teste grátis')}
        <p>O teste de 3 dias pode ser usado uma vez por conta e não gera cobrança automática ao terminar.</p>
        ${this.h('Moedas')}
        <p>Pacotes de moedas são pagamento único, sem renovação. Moedas compradas não expiram e ficam na carteira mesmo se você cancelar a assinatura. Use Restaurar compras se algum pagamento aprovado não aparecer na carteira.</p>
      `;
    }

    bindEvents(container, page) {
      container.querySelectorAll('.settings-link, .settings-back').forEach(btn => {
        btn.onclick = () => this.nav(btn.dataset.page);
      });

      container.querySelectorAll('.settings-auth').forEach(btn => {
        btn.onclick = () => window.dispatchEvent(new CustomEvent('dramix-open-auth-modal'));
      });

      const edit = container.querySelector('.settings-edit-profile');
      if (edit) edit.onclick = () => window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'profile', openEdit: true } }));

      const prefs = container.querySelector('.settings-prefs');
      if (prefs) prefs.onclick = () => window.dispatchEvent(new CustomEvent('dramix-open-onboarding'));

      const user = this.api.getCurrentUser();

      const clear = container.querySelector('.settings-clear-history');
      if (clear) {
        clear.onclick = () => {
          if (!confirm('Apagar todo o seu histórico de reprodução? "Continue assistindo" ficará vazio.')) return;
          this.api.clearWatchHistory(user.id);
          root.dramixUI.toast('Histórico apagado.', 'success');
        };
      }

      const del = container.querySelector('.settings-delete-account');
      if (del) {
        del.onclick = () => {
          const typed = prompt('Para excluir sua conta para sempre, digite EXCLUIR');
          if (typed !== 'EXCLUIR') return;
          try {
            this.api.deleteAccount(user.id);
            window.dispatchEvent(new CustomEvent('dramix-auth-state-changed'));
            root.dramixUI.toast('Conta excluída.', 'info');
            window.dispatchEvent(new CustomEvent('dramix-navigate-view', { detail: { view: 'home' } }));
          } catch (err) {
            root.dramixUI.toast(err.message, 'error');
          }
        };
      }

      const restore = container.querySelector('.settings-restore');
      if (restore) {
        restore.onclick = () => {
          const res = this.api.restorePurchases(user.id);
          const out = container.querySelector('#settings-restore-result');
          const extra = [
            res.coinsRestored ? `${res.coinsRestored} moedas devolvidas à carteira.` : '',
            res.subscriptionRestored ? 'Assinatura Premium reativada.' : ''
          ].filter(Boolean).join(' ');
          out.textContent = `${res.message} ${extra}`.trim();
          out.classList.remove('hidden');
          window.dispatchEvent(new CustomEvent('dramix-wallet-updated', { detail: { silent: true } }));
        };
      }

      const form = container.querySelector('#support-form');
      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          const err = container.querySelector('#support-error');
          try {
            this.api.createSupportTicket(user ? user.id : null, {
              name: container.querySelector('#support-name').value,
              email: container.querySelector('#support-email').value,
              subject: container.querySelector('#support-subject').value,
              message: container.querySelector('#support-message').value
            });
            form.innerHTML = '<p class="text-sm text-emerald-300 font-semibold" role="status">Mensagem enviada. Vamos responder no e-mail informado em até 2 dias úteis.</p>';
          } catch (ex) {
            err.textContent = ex.message;
            err.classList.remove('hidden');
          }
        };
      }
    }
  }

  root.DramixSettingsView = DramixSettingsView;
})(typeof window !== 'undefined' ? window : global);
