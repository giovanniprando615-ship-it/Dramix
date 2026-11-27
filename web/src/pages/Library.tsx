import { Bookmark, History, LogIn } from 'lucide-react';
import { SeriesCard } from '@/components/catalog/SeriesCard';
import { Empty } from '@/components/ui/Empty';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useLibrary, useSession } from '@/lib/queries';
import { useUI } from '@/store/ui';

export default function Library() {
  const { data: user, isLoading: loadingUser } = useSession();
  const { data, isLoading } = useLibrary(!!user);
  const openAuth = useUI(s => s.openAuth);

  if (loadingUser) return <Skeleton className="h-64" />;
  if (!user) return <Empty icon={LogIn} title="Entre para ver sua lista" text="Sua lista e seu histórico ficam salvos na sua conta, em qualquer aparelho." action={<Button size="sm" onClick={() => openAuth('login')}>Entrar</Button>} />;
  if (isLoading || !data) return <Skeleton className="h-64" />;

  const grid = 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';
  return (
    <div className="space-y-10">
      <section className="space-y-4" aria-labelledby="fav">
        <h1 id="fav" className="text-2xl font-black text-white">Minha Lista</h1>
        {data.favorites.length ? (
          <div className={grid}>{data.favorites.map(s => <SeriesCard key={s.id} series={s} className="w-auto sm:w-auto md:w-auto" />)}</div>
        ) : (
          <>
            <Empty icon={Bookmark} title="Sua lista está vazia" text="Toque no coração de uma série para guardar aqui. Que tal começar por estas?" />
            <div className={grid}>{data.suggestions.map(s => <SeriesCard key={s.id} series={s} className="w-auto sm:w-auto md:w-auto" />)}</div>
          </>
        )}
      </section>
      <section className="space-y-4" aria-labelledby="hist">
        <h2 id="hist" className="text-lg font-bold text-white">Histórico</h2>
        {data.history.length ? (
          <div className={grid}>{data.history.map(h => <SeriesCard key={h.series.id} series={h.series} progress={h.progressPercent} className="w-auto sm:w-auto md:w-auto" />)}</div>
        ) : <Empty icon={History} title="Nada assistido ainda" text="Os episódios que você assistir aparecem aqui para continuar de onde parou." />}
      </section>
    </div>
  );
}
