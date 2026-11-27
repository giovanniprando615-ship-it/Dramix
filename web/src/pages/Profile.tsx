import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { LogIn, Pencil, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { CoinAmount } from '@/components/ui/CoinIcon';
import { Dialog } from '@/components/ui/Dialog';
import { Empty } from '@/components/ui/Empty';
import { Field } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { useLogout } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { useAction, usePayments, useSession, useTrialUsed } from '@/lib/queries';
import { useUI } from '@/store/ui';
import { brl, cn, formatDate, safeImg } from '@/lib/utils';

const AVATARS = ['photo-1534528741775-53994a69daeb', 'photo-1507003211169-0a1dd7228f2d', 'photo-1517841905240-472988babdf9', 'photo-1500648767791-00dcc994a43e',
  'photo-1544005313-94ddf0286df2', 'photo-1524504388940-b1c1722653e1', 'photo-1531746020798-e6953c6e8e04', 'photo-1535713875002-d1d0cf377fde']
  .map(id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=200&q=80`);

const tabCls = 'rounded-xl px-4 py-2.5 text-xs font-bold text-gray-400 hover:text-white data-[state=active]:bg-brand data-[state=active]:text-white';

export default function Profile() {
  const { data: user, isLoading } = useSession();
  const { data: payments } = usePayments(!!user);
  const { data: trialUsed } = useTrialUsed();
  const openAuth = useUI(s => s.openAuth);
  const logout = useLogout();
  const [editing, setEditing] = useState(false);
  const cancel = useAction(() => api.cancelRenewal(), { success: d => `Renovação desativada. Seu acesso continua até ${formatDate(d)}.` });
  const trial = useAction(() => api.startTrial(), { success: 'Teste de 3 dias ativado.' });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!user) return <Empty icon={LogIn} title="Entre na sua conta" text="Moedas, assinatura, lista e histórico ficam salvos na sua conta." action={<Button size="sm" onClick={() => openAuth('login')}>Entrar ou criar conta</Button>} />;
  const sub = user.subscription;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-white/10 bg-ink-700 p-6 md:flex-row md:p-8">
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
          <img src={safeImg(user.avatar)} alt="" className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-brand to-coin object-cover p-0.5" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <h1 className="font-display text-[34px] leading-none text-white md:text-[40px]">{user.name}</h1>
              <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-black', user.isPremium ? 'bg-coin text-black' : 'bg-white/10 text-gray-300')}>{user.isPremium ? 'PREMIUM' : 'PLANO GRÁTIS'}</span>
            </div>
            <p className="text-xs text-gray-400">{user.email || user.phone}</p>
            <Link to="/store" className="inline-flex rounded-full border border-coin/30 bg-coin/10 px-2.5 py-1 text-xs text-amber-100"><CoinAmount value={user.coins} />&nbsp;moedas</Link>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" aria-hidden />Editar perfil</Button>
          <Link to="/settings" className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 text-xs font-bold text-white hover:bg-white/10"><SettingsIcon className="h-3.5 w-3.5" aria-hidden />Configurações</Link>
          <Button variant="danger" size="sm" onClick={logout}>Sair</Button>
        </div>
      </section>

      <Tabs.Root defaultValue="subscription">
        <Tabs.List className="mb-5 flex gap-2 overflow-x-auto border-b border-white/10 pb-2" aria-label="Seções do perfil">
          <Tabs.Trigger value="subscription" className={tabCls}>Assinatura</Tabs.Trigger>
          <Tabs.Trigger value="payments" className={tabCls}>Pagamentos ({payments?.length ?? 0})</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="subscription" className="rounded-3xl border border-white/10 bg-ink-700 p-6">
          {sub ? (
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <p className="flex flex-wrap items-center gap-2 text-base font-bold text-white">
                  {sub.is_trial ? 'Teste grátis' : `Premium ${sub.plan_name}`}
                  <span className={cn('rounded px-2 py-0.5 text-[10px] font-bold', sub.auto_renew ? 'bg-emerald-500/15 text-emerald-300' : 'bg-coin/15 text-coin')}>
                    {sub.is_trial ? 'Sem cobrança no fim' : sub.auto_renew ? 'Renovação ativa' : 'Não vai renovar'}
                  </span>
                </p>
                <p className="text-xs text-gray-400">Acesso liberado até <b className="text-white">{formatDate(sub.end_date, true)}</b></p>
              </div>
              <div className="flex gap-2">
                <Link to="/plans" className="inline-flex h-9 items-center rounded-xl bg-white/10 px-3.5 text-xs font-bold text-white hover:bg-white/20">Trocar plano</Link>
                {sub.auto_renew && !sub.is_trial && (
                  <Button variant="danger" size="sm" loading={cancel.isPending} onClick={() => confirm('Desativar a renovação automática? O acesso continua até o fim do período pago.') && cancel.mutate(undefined)}>Cancelar renovação</Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-bold text-white">Você está no plano grátis</p>
                <p className="text-xs text-gray-400">Libere todos os episódios com o Premium{!trialUsed && ' ou teste 3 dias grátis'}.</p>
              </div>
              <div className="flex gap-2">
                {!trialUsed && <Button variant="coin" size="sm" loading={trial.isPending} onClick={() => trial.mutate(undefined)}>Testar 3 dias grátis</Button>}
                <Link to="/plans" className="inline-flex h-9 items-center rounded-xl bg-brand px-3.5 text-xs font-bold text-white hover:bg-brand-hover">Ver planos</Link>
              </div>
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="payments" className="rounded-3xl border border-white/10 bg-ink-700 p-6">
          {!payments?.length ? <p className="text-xs text-gray-400">Nenhum pagamento nesta conta.</p> : (
            <ul className="divide-y divide-white/5">
              {payments.map(p => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-white">{p.kind === 'coins' ? `${p.coins_total} moedas` : 'Assinatura Premium'} • {p.method === 'pix' ? 'PIX' : 'Cartão'}</p>
                    <p className="truncate font-mono text-[10px] text-gray-500">{formatDate(p.created_at)} • {p.id}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-black text-white">{brl(p.amount)}</p>
                    <p className={cn('text-[10px] font-bold', p.status === 'paid' ? 'text-emerald-400' : 'text-coin')}>{p.status === 'paid' ? 'Confirmado' : 'Pendente'}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>
      </Tabs.Root>

      <EditProfileDialog open={editing} onClose={() => setEditing(false)} />
    </div>
  );
}

export function EditProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: user } = useSession();
  const [form, setForm] = useState({ name: '', identifier: '', password: '', avatar: '' });
  const save = useAction((f: typeof form) => api.updateProfile({ name: f.name, identifier: f.identifier, avatar: f.avatar, newPassword: f.password || undefined }), { success: 'Perfil atualizado.' });

  useEffect(() => {
    if (open && user) setForm({ name: user.name, identifier: user.email || user.phone, password: '', avatar: user.avatar });
  }, [open, user]);

  const upload = (file?: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('A imagem precisa ter no máximo 2 MB.');
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, avatar: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await save.mutateAsync(form).then(onClose).catch(() => {});
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()} title="Editar perfil">
      <form onSubmit={submit} className="space-y-5">
        <div className="flex items-center gap-4">
          <img src={safeImg(form.avatar)} alt="Prévia da foto" className="h-16 w-16 rounded-2xl border-2 border-brand object-cover" />
          <label className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20">
            Enviar foto
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={e => upload(e.target.files?.[0])} />
          </label>
        </div>
        <div className="grid grid-cols-8 gap-2" role="group" aria-label="Escolher avatar">
          {AVATARS.map((a, i) => (
            <button key={a} type="button" aria-label={`Avatar ${i + 1}`} aria-pressed={form.avatar === a} onClick={() => setForm(f => ({ ...f, avatar: a }))}
              className={cn('overflow-hidden rounded-xl border-2', form.avatar === a ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100')}>
              <img src={a} alt="" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
        <Field label="Nome" id="edit-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        <Field label="E-mail ou celular" id="edit-ident" value={form.identifier} onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))} required />
        <Field label="Nova senha" id="edit-pass" type="password" autoComplete="new-password" hint="Deixe em branco para manter a atual." value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={save.isPending}>Salvar alterações</Button>
        </div>
      </form>
    </Dialog>
  );
}
