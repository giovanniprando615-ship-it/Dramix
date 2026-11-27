import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { CoinAmount } from '@/components/ui/CoinIcon';
import { useAction, useCatalog, useSession } from '@/lib/queries';
import { api } from '@/lib/api';
import { useUI } from '@/store/ui';
import type { AgeRange } from '@/domain/types';
import { cn } from '@/lib/utils';

const AGES: { id: AgeRange; label: string }[] = [
  { id: '13-17', label: '13 a 17' }, { id: '18-24', label: '18 a 24' }, { id: '25-34', label: '25 a 34' },
  { id: '35-44', label: '35 a 44' }, { id: '45+', label: '45 ou mais' }
];

const chip = (on: boolean) => cn('rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition', on ? 'border-brand bg-brand text-white' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10');

export function OnboardingDialog() {
  const open = useUI(s => s.onboardingOpen);
  const setOpen = useUI(s => s.setOnboarding);
  const { data: user } = useSession();
  const { data: catalog } = useCatalog();
  const [age, setAge] = useState<AgeRange | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const save = useAction((p: { ageRange: AgeRange | null; genres: string[] }) => api.savePreferences(p));

  useEffect(() => {
    if (open && user) { setAge(user.ageRange); setGenres(user.preferredGenres); setError(false); }
  }, [open, user]);

  if (!user) return null;
  const finish = async (requireAge: boolean) => {
    if (requireAge && !age) return setError(true);
    await save.mutateAsync({ ageRange: age, genres });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && finish(false)} title={`Oi, ${user.name.split(' ')[0]}. Vamos montar sua lista.`} description="Duas perguntas rápidas para recomendar as histórias certas.">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-coin/30 bg-coin/10 px-3 py-1 text-xs text-amber-100">
          <CoinAmount value={user.coins} /> moedas na sua carteira
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-white">Qual é a sua idade?</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {AGES.map(a => <button key={a.id} type="button" aria-pressed={age === a.id} onClick={() => { setAge(a.id); setError(false); }} className={chip(age === a.id)} data-age={a.id}>{a.label}</button>)}
          </div>
          {error && <p role="alert" className="mt-2 text-xs text-red-400">Escolha sua faixa etária para continuar.</p>}
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-white">Quais gêneros você mais gosta? <span className="font-normal text-gray-400">Escolha quantos quiser.</span></legend>
          <div className="flex flex-wrap gap-2">
            {catalog?.genres.map(g => (
              <button key={g} type="button" aria-pressed={genres.includes(g)} onClick={() => setGenres(gs => (gs.includes(g) ? gs.filter(x => x !== g) : [...gs, g]))} className={chip(genres.includes(g))}>{g}</button>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => finish(false)} className="px-2 py-2 text-xs text-gray-400 hover:text-white">Pular por enquanto</button>
          <Button onClick={() => finish(true)} loading={save.isPending} data-testid="onboarding-save">Ver minhas recomendações</Button>
        </div>
      </div>
    </Dialog>
  );
}
