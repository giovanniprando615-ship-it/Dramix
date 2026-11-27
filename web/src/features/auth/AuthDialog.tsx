import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { api } from '@/lib/api';
import { resetAllData, useSettings } from '@/lib/queries';
import { useUI, type AuthMode } from '@/store/ui';
import { cn } from '@/lib/utils';

const identifier = z.string().trim().min(1, 'Informe seu e-mail ou celular.').refine(
  v => (v.includes('@') ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) : /^\+?\d{10,14}$/.test(v.replace(/[\s()-]/g, ''))),
  'Use um e-mail válido ou celular com DDD.'
);
const loginSchema = z.object({ name: z.string().optional(), identifier, password: z.string().min(1, 'Informe sua senha.') });
const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, 'Como quer ser chamado?'),
  password: z.string().min(6, 'Use pelo menos 6 caracteres.')
});
type FormData = z.infer<typeof loginSchema>;

export function AuthDialog() {
  const { open, mode } = useUI(s => s.auth);
  const { closeAuth, setOnboarding } = useUI();
  const [current, setCurrent] = useState<AuthMode>(mode);
  const [serverError, setServerError] = useState<string | null>(null);
  const { data: settings } = useSettings();
  const isRegister = current === 'register';

  const form = useForm<FormData>({ resolver: zodResolver(isRegister ? registerSchema : loginSchema), defaultValues: { name: '', identifier: '', password: '' } });
  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues, reset, clearErrors } = form;

  useEffect(() => {
    if (open) {
      setCurrent(mode);
      setServerError(null);
    }
  }, [open, mode]);

  const switchMode = (m: AuthMode) => { setCurrent(m); setServerError(null); clearErrors(); };

  const onSubmit = handleSubmit(async values => {
    setServerError(null);
    try {
      const user = isRegister
        ? await api.register({ name: values.name ?? '', identifier: values.identifier, password: values.password })
        : await api.login({ identifier: values.identifier, password: values.password });
      await resetAllData();
      reset();
      closeAuth();
      if (isRegister) toast.success(`Conta criada. Você ganhou ${user.coins} moedas.`, { icon: <CoinIcon /> });
      else toast(`Olá, ${user.name.split(' ')[0]}.`);
      if (!user.onboarded && user.role !== 'owner') setOnboarding(true);
    } catch (err) {
      setServerError((err as Error).message);
    }
  });

  const forgot = async () => {
    const ident = getValues('identifier');
    if (!ident.trim()) return setServerError('Digite seu e-mail ou celular e toque de novo em "Esqueci minha senha".');
    try {
      toast.success(await api.requestPasswordReset(ident));
    } catch (err) {
      setServerError((err as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && closeAuth()} title={isRegister ? 'Criar sua conta' : 'Entrar no DRAMIX'}>
      <div className="mb-5 flex gap-1 rounded-xl border border-white/10 bg-black/40 p-1" role="tablist">
        {(['login', 'register'] as const).map(m => (
          <button key={m} role="tab" aria-selected={current === m} onClick={() => switchMode(m)} className={cn('flex-1 rounded-lg py-2 text-xs font-bold', current === m ? 'bg-brand text-white' : 'text-gray-400 hover:text-white')}>
            {m === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        ))}
      </div>

      {isRegister && settings && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-coin/25 bg-coin/10 px-3 py-2.5 text-xs text-amber-100">
          <CoinIcon className="h-5 w-5" /> Contas novas ganham {settings.welcome_bonus_coins} moedas, mais {settings.daily_gift_coins} por dia no presente diário.
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {isRegister && <Field label="Nome" autoComplete="name" placeholder="Como quer ser chamado" error={errors.name?.message} {...register('name')} id="auth-name" />}
        <Field label="E-mail ou celular" autoComplete="username" placeholder="seu@email.com" error={errors.identifier?.message} {...register('identifier')} id="auth-identifier" />
        <Field label="Senha" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder={isRegister ? 'Mínimo de 6 caracteres' : 'Sua senha'} error={errors.password?.message} {...register('password')} id="auth-password" />
        {serverError && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{serverError}</p>}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting} data-testid="auth-submit">
          {isRegister ? 'Criar conta e ganhar moedas' : 'Entrar'}
        </Button>
        {!isRegister && <button type="button" onClick={forgot} className="w-full text-xs text-gray-400 hover:text-white">Esqueci minha senha</button>}
      </form>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-gray-500">
        Ao continuar, você concorda com os <Link to="/settings/terms" onClick={closeAuth} className="underline hover:text-white">Termos de uso</Link> e a{' '}
        <Link to="/settings/privacy" onClick={closeAuth} className="underline hover:text-white">Política de privacidade</Link>.
      </p>
    </Dialog>
  );
}
