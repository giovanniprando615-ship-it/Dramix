import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { api } from '@/lib/api';
import { resetAllData, useAction, usePayments, usePlans, useSession, useSettings } from '@/lib/queries';
import { useUI } from '@/store/ui';
import { brl } from '@/lib/utils';
import { EditProfileDialog } from './Profile';

// Textos legais: modelo inicial baseado no CDC e na LGPD. Preencha os colchetes e peça revisão jurídica.
const COMPANY = '[RAZÃO SOCIAL DA EMPRESA]';
const CNPJ = '[CNPJ]';
const UPDATED = '27 de novembro de 2026';

export default function Settings() {
  const { page = 'index' } = useParams();
  const pages: Record<string, () => ReactNode> = {
    index: () => <Index />, account: () => <Account />, language: () => <Language />, restore: () => <Restore />,
    support: () => <Support />, terms: () => <Legal title="Termos de uso"><Terms /></Legal>,
    privacy: () => <Legal title="Política de privacidade"><Privacy /></Legal>,
    'subscription-policy': () => <Legal title="Política de assinaturas e moedas"><SubscriptionPolicy /></Legal>
  };
  return <div className="mx-auto max-w-2xl">{(pages[page] ?? pages.index)()}</div>;
}

function Back() {
  return (
    <Link to="/settings" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white">
      <ArrowLeft className="h-4 w-4" aria-hidden />Configurações
    </Link>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-xs font-bold text-gray-400">{title}</h2>
      <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-ink-700">{children}</ul>
    </section>
  );
}

function Item({ to, title, desc }: { to: string; title: string; desc?: string }) {
  return (
    <li>
      <Link to={`/settings/${to}`} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-white/5">
        <span><span className="block text-sm font-semibold text-white">{title}</span>{desc && <span className="mt-0.5 block text-[11px] text-gray-400">{desc}</span>}</span>
        <ChevronRight className="h-4 w-4 text-gray-500" aria-hidden />
      </Link>
    </li>
  );
}

function Index() {
  const { data: user } = useSession();
  return (
    <>
      <h1 className="font-display mb-6 text-[44px] leading-none text-white">Configurações</h1>
      <div className="space-y-6">
        <Group title="Conta">
          <Item to="account" title={user ? 'Configurações da conta' : 'Entrar ou criar conta'} desc={user ? 'Nome, e-mail, senha, preferências e exclusão' : 'Ganhe moedas de boas-vindas'} />
          <Item to="language" title="Idioma" desc="Português (Brasil)" />
        </Group>
        <Group title="Compras">
          <Item to="restore" title="Restaurar compras" desc="Recupere moedas e assinaturas já pagas" />
          <Item to="subscription-policy" title="Política de assinaturas e moedas" desc="Renovação, cancelamento e reembolso" />
        </Group>
        <Group title="Ajuda e informações">
          <Item to="support" title="Suporte ao usuário" desc="Fale com a equipe DRAMIX" />
          <Item to="terms" title="Termos de uso" />
          <Item to="privacy" title="Política de privacidade" desc="Como tratamos seus dados (LGPD)" />
        </Group>
      </div>
      <p className="mt-8 text-center text-[11px] text-gray-500">DRAMIX 2.0.0</p>
    </>
  );
}

function Account() {
  const { data: user } = useSession();
  const { openAuth, setOnboarding, resetForLogout } = useUI();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const clear = useAction(() => api.clearHistory(), { success: 'Histórico apagado.' });

  if (!user) {
    return (<><Back /><div className="space-y-4 rounded-3xl border border-white/10 bg-ink-700 p-6 text-center">
      <h1 className="text-xl font-black text-white">Entre na sua conta</h1>
      <p className="text-xs text-gray-400">Suas moedas, sua lista e seu histórico ficam salvos na sua conta.</p>
      <Button className="w-full" onClick={() => openAuth('login')}>Entrar ou criar conta</Button>
    </div></>);
  }

  const remove = async () => {
    if (prompt('Para excluir sua conta para sempre, digite EXCLUIR') !== 'EXCLUIR') return;
    try {
      await api.deleteAccount();
      resetForLogout();
      await resetAllData();
      toast('Conta excluída.');
      navigate('/');
    } catch (err) { toast.error((err as Error).message); }
  };

  const row = (k: string, v: string) => <div className="flex justify-between gap-3"><span className="text-gray-400">{k}</span><span className="break-all text-right font-semibold text-white">{v}</span></div>;
  return (
    <>
      <Back />
      <h1 className="mb-6 text-2xl font-black text-white">Configurações da conta</h1>
      <div className="space-y-5 text-xs">
        <section className="space-y-3 rounded-2xl border border-white/10 bg-ink-700 p-5">
          {row('Nome', user.name)}{row('E-mail ou celular', user.email || user.phone)}{row('Plano', user.isPremium ? 'Premium' : 'Grátis')}
          <Button variant="secondary" size="sm" className="w-full" onClick={() => setEditing(true)}>Editar nome, e-mail, foto ou senha</Button>
        </section>
        <section className="space-y-3 rounded-2xl border border-white/10 bg-ink-700 p-5">
          <h2 className="text-sm font-bold text-white">Preferências de conteúdo</h2>
          {row('Faixa etária', user.ageRange ?? 'Não informada')}{row('Gêneros favoritos', user.preferredGenres.join(', ') || 'Nenhum')}
          <Button variant="secondary" size="sm" className="w-full" onClick={() => setOnboarding(true)}>Alterar preferências</Button>
        </section>
        <section className="space-y-3 rounded-2xl border border-white/10 bg-ink-700 p-5">
          <h2 className="text-sm font-bold text-white">Privacidade</h2>
          <Button variant="secondary" size="sm" className="w-full" loading={clear.isPending} onClick={() => confirm('Apagar todo o histórico de reprodução?') && clear.mutate(undefined)}>Limpar histórico de reprodução</Button>
        </section>
        <section className="space-y-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <h2 className="text-sm font-bold text-red-300">Excluir conta</h2>
          <p className="leading-relaxed text-gray-400">Apaga perfil, lista, histórico, moedas e episódios desbloqueados. Esta ação não pode ser desfeita.</p>
          <Button variant="danger" size="sm" className="w-full" onClick={remove}>Excluir minha conta</Button>
        </section>
      </div>
      <EditProfileDialog open={editing} onClose={() => setEditing(false)} />
    </>
  );
}

function Language() {
  return (
    <>
      <Back />
      <h1 className="mb-2 text-2xl font-black text-white">Idioma</h1>
      <p className="mb-6 text-xs text-gray-400">O DRAMIX está em português do Brasil. Inglês e espanhol chegam com o catálogo dublado e legendado.</p>
      <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-ink-700" role="radiogroup" aria-label="Idioma">
        <li role="radio" aria-checked="true" className="flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-white">Português (Brasil)<Check className="h-4 w-4 text-brand" aria-hidden /></li>
        {['English', 'Español'].map(l => <li key={l} role="radio" aria-checked="false" aria-disabled="true" className="flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-white opacity-50">{l}<span className="text-[11px] text-gray-400">Em breve</span></li>)}
      </ul>
    </>
  );
}

function Restore() {
  const { data: user } = useSession();
  const { data: payments } = usePayments(!!user);
  const openAuth = useUI(s => s.openAuth);
  const [result, setResult] = useState<string | null>(null);
  const restore = useAction(() => api.restorePurchases());
  const paid = payments?.filter(p => p.status === 'paid').length ?? 0;

  const run = async () => {
    const r = await restore.mutateAsync(undefined);
    const parts = [r.coinsRestored ? `${r.coinsRestored} moedas devolvidas à carteira.` : '', r.subscriptionRestored ? 'Assinatura Premium reativada.' : ''].filter(Boolean);
    setResult(parts.length ? `Compras restauradas. ${parts.join(' ')}` : r.checked ? 'Tudo certo: suas compras já estavam ativas.' : 'Nenhuma compra encontrada nesta conta.');
  };

  return (
    <>
      <Back />
      <h1 className="mb-2 text-2xl font-black text-white">Restaurar compras</h1>
      <p className="mb-6 text-xs leading-relaxed text-gray-400">Conferimos cada pagamento aprovado da sua conta. Moedas que não entraram na carteira, ou uma assinatura paga e ainda vigente que não está ativa, voltam agora. Nada é cobrado de novo.</p>
      {user ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-ink-700 p-5">
          <p className="text-xs text-gray-300">{paid} {paid === 1 ? 'pagamento aprovado' : 'pagamentos aprovados'} nesta conta.</p>
          <Button className="w-full" loading={restore.isPending} onClick={run}>Restaurar compras</Button>
          {result && <p role="status" className="text-xs text-emerald-300">{result}</p>}
        </div>
      ) : <Button className="w-full" onClick={() => openAuth('login')}>Entre para restaurar suas compras</Button>}
    </>
  );
}

const FAQ = [
  ['Quantos episódios são grátis?', 'Os 5 primeiros de cada minissérie, salvo quando a página da série indicar outro número.'],
  ['Paguei e as moedas não apareceram.', 'Use Configurações > Restaurar compras. Se continuar faltando, mande uma mensagem com a data e o valor.'],
  ['Desbloqueei um episódio. Vou pagar de novo?', 'Não. O episódio fica liberado na sua conta para sempre, em qualquer aparelho.'],
  ['Como cancelo a assinatura?', 'Em Perfil > Assinatura > Cancelar renovação. O acesso continua até o fim do período pago.']
];

function Support() {
  const { data: user } = useSession();
  const { data: settings } = useSettings();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', subject: 'Pagamento ou moedas', message: '' });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try { await api.createTicket(form); setSent(true); } catch (err) { setError((err as Error).message); }
  };
  return (
    <>
      <Back />
      <h1 className="mb-2 text-2xl font-black text-white">Suporte ao usuário</h1>
      <p className="mb-6 text-xs text-gray-400">Respondemos em até 2 dias úteis. Ou escreva para <a className="text-white underline" href={`mailto:${settings?.support_email}`}>{settings?.support_email}</a>.</p>
      <div className="mb-8 divide-y divide-white/5 rounded-2xl border border-white/10 bg-ink-700">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group px-4 py-3.5">
            <summary className="flex cursor-pointer list-none justify-between gap-3 text-sm font-semibold text-white">{q}<span className="text-gray-500 transition group-open:rotate-45" aria-hidden>+</span></summary>
            <p className="mt-2 text-xs leading-relaxed text-gray-400">{a}</p>
          </details>
        ))}
      </div>
      {sent ? <p role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm font-semibold text-emerald-300">Mensagem enviada. Vamos responder no e-mail informado em até 2 dias úteis.</p> : (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-ink-700 p-5" noValidate>
          <h2 className="text-sm font-bold text-white">Enviar mensagem</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome" id="sup-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Field label="E-mail para resposta" id="sup-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <label className="block space-y-1"><span className="text-[11px] text-gray-400">Assunto</span>
            <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="h-11 w-full rounded-xl border border-white/15 bg-black/50 px-3 text-sm text-white">
              {['Pagamento ou moedas', 'Assinatura', 'Problema no vídeo', 'Minha conta', 'Sugestão de história', 'Outro assunto'].map(o => <option key={o}>{o}</option>)}
            </select>
          </label>
          <label className="block space-y-1"><span className="text-[11px] text-gray-400">Mensagem</span>
            <textarea rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand" data-testid="support-message" />
          </label>
          {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
          <Button type="submit" className="w-full">Enviar mensagem</Button>
        </form>
      )}
    </>
  );
}

function Legal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Back />
      <article className="space-y-5 text-[13px] leading-relaxed text-gray-300 [&_h2]:pt-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5" data-testid="legal">
        <header><h1 className="text-2xl font-black text-white">{title}</h1><p className="text-[11px] text-gray-500">Última atualização: {UPDATED}</p></header>
        {children}
      </article>
    </>
  );
}

function Terms() {
  const { data: s } = useSettings();
  return (<>
    <p>Estes termos regulam o uso do DRAMIX, serviço de minisséries em episódios curtos oferecido por {COMPANY}, CNPJ {CNPJ}. Ao criar uma conta ou assistir a qualquer conteúdo, você concorda com eles.</p>
    <h2>1. Conta</h2><p>É preciso ter pelo menos 13 anos. Menores de 18 anos devem usar o serviço com autorização dos responsáveis. Cada pessoa recebe o bônus de boas-vindas uma única vez; contas criadas só para acumular bônus podem ser encerradas.</p>
    <h2>2. Conteúdo</h2><p>As minisséries são licenciadas para uso pessoal e não comercial. É proibido copiar, gravar, redistribuir ou exibir publicamente o conteúdo. Algumas produções são criadas com apoio de inteligência artificial.</p>
    <h2>3. Moedas</h2><p>Moedas são crédito virtual usado só dentro do DRAMIX. Não têm valor monetário, não podem ser trocadas por dinheiro nem transferidas entre contas. Moedas compradas não expiram.</p>
    <h2>4. Episódios desbloqueados</h2><p>Ficam disponíveis na sua conta enquanto ela existir e o título estiver no catálogo. Se um título sair do catálogo, as moedas dos episódios ainda não assistidos voltam para a carteira.</p>
    <h2>5. Pagamentos e assinaturas</h2><p>Preços, renovação, cancelamento e reembolso estão na Política de assinaturas e moedas, que faz parte destes termos.</p>
    <h2>6. Uso proibido</h2><p>Não é permitido burlar bloqueios, manipular saldo de moedas, usar robôs ou compartilhar contas de forma comercial. Isso pode levar à suspensão da conta.</p>
    <h2>7. Contato</h2><p>Dúvidas: {s?.support_email}. Fica eleito o foro do domicílio do consumidor.</p>
  </>);
}

function Privacy() {
  const { data: s } = useSettings();
  return (<>
    <p>Esta política explica como {COMPANY}, CNPJ {CNPJ}, controladora dos dados, trata suas informações pessoais no DRAMIX, de acordo com a LGPD (Lei 13.709/2018).</p>
    <h2>Dados que coletamos</h2>
    <ul>
      <li>Cadastro: nome, e-mail ou celular, senha (guardada criptografada) e foto, se você enviar.</li>
      <li>Preferências: faixa etária e gêneros favoritos.</li>
      <li>Uso: episódios assistidos, progresso, lista, desbloqueios e movimentações de moedas.</li>
      <li>Pagamentos: valor, data, forma e status. Os dados do cartão ficam com o intermediador de pagamento.</li>
      <li>Suporte: as mensagens que você nos envia.</li>
    </ul>
    <h2>Para que usamos</h2><p>Manter sua conta, liberar episódios desbloqueados, processar compras, recomendar histórias, proteger menores de conteúdo impróprio, prevenir fraude e responder ao suporte.</p>
    <h2>Com quem compartilhamos</h2><p>Só com prestadores necessários ao serviço: hospedagem, pagamento, envio de e-mail e, se você aceitar, parceiros de anúncios. Não vendemos seus dados.</p>
    <h2>Por quanto tempo</h2><p>Enquanto a conta existir. Ao excluir a conta, apagamos seus dados, exceto registros de pagamento que a lei manda guardar por até 5 anos.</p>
    <h2>Seus direitos</h2><p>Acessar, corrigir, exportar ou apagar seus dados e revogar consentimentos, em Configurações ou pelo e-mail {s?.support_email}. Você também pode reclamar à ANPD.</p>
    <h2>Encarregado de dados (DPO)</h2><p>[NOME DO ENCARREGADO] — [E-MAIL DO ENCARREGADO].</p>
  </>);
}

function SubscriptionPolicy() {
  const { data: plans } = usePlans();
  return (<>
    <h2>Planos Premium</h2>
    <ul>{plans?.map(p => <li key={p.id}>{p.name}: {brl(p.price)} a cada {p.duration_days} dias.</li>)}</ul>
    <p>O Premium libera todos os episódios enquanto estiver ativo, sem gastar moedas e sem anúncios de desbloqueio.</p>
    <h2>Renovação automática</h2><p>Renova ao fim de cada período pelo mesmo valor e forma de pagamento. Avisamos por e-mail antes de qualquer mudança de preço.</p>
    <h2>Cancelamento</h2><p>Em Perfil, Assinatura, Cancelar renovação, sem multa. O acesso continua até o fim do período pago.</p>
    <h2>Direito de arrependimento</h2><p>Pelo artigo 49 do Código de Defesa do Consumidor, você pode pedir reembolso integral em até 7 dias após a primeira contratação de um plano ou a compra de moedas ainda não usadas.</p>
    <h2>Teste grátis</h2><p>3 dias, uma vez por conta, sem cobrança automática ao terminar.</p>
    <h2>Moedas</h2><p>Pacotes são pagamento único. Moedas compradas não expiram e continuam na carteira se você cancelar a assinatura.</p>
  </>);
}
