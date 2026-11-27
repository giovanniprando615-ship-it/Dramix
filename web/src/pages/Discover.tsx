import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SearchX } from 'lucide-react';
import { SeriesCard } from '@/components/catalog/SeriesCard';
import { Empty } from '@/components/ui/Empty';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCatalog } from '@/lib/queries';
import { cn } from '@/lib/utils';

const RATINGS = ['Livre', '12+', '14+', '16+', '18+'];
const SORTS = { popular: 'Mais populares', new: 'Lançamentos', title: 'Ordem alfabética' } as const;
type SortKey = keyof typeof SORTS;

const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Discover() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const genre = params.get('genre') ?? '';
  const rating = params.get('rating') ?? '';
  const sort = (params.get('sort') as SortKey) || 'popular';
  const { data, isLoading } = useCatalog();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const results = useMemo(() => {
    if (!data) return [];
    const term = strip(q.trim());
    const list = data.series.filter(s =>
      (!term || [s.title, s.synopsis, ...s.genres, ...s.tropes].some(f => strip(f).includes(term))) &&
      (!genre || s.genres.includes(genre)) &&
      (!rating || s.content_rating === rating)
    );
    const sorters: Record<SortKey, (a: typeof list[0], b: typeof list[0]) => number> = {
      popular: (a, b) => b.views_count - a.views_count,
      new: (a, b) => b.created_at.localeCompare(a.created_at),
      title: (a, b) => a.title.localeCompare(b.title, 'pt-BR')
    };
    return list.sort(sorters[sort]);
  }, [data, q, genre, rating, sort]);

  const pill = (on: boolean) => cn('shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold', on ? 'bg-brand text-white' : 'border border-white/5 bg-white/5 text-gray-300 hover:bg-white/10');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-black text-white md:text-3xl">Descobrir</h1>
        <p className="text-sm text-gray-400">Todo o catálogo do DRAMIX em um lugar.</p>
      </header>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-ink-700 p-4 md:p-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input type="search" value={q} onChange={e => set('q', e.target.value)} aria-label="Pesquisar minisséries" placeholder="Título, gênero, tema ou sinopse"
            className="h-12 w-full rounded-xl border border-white/15 bg-black/50 pl-10 pr-4 text-sm text-white outline-none placeholder:text-gray-500 focus:border-brand" data-testid="discover-search" />
        </div>
        <div className="scrollbar-none flex gap-2 overflow-x-auto" role="group" aria-label="Gênero">
          <button className={pill(!genre)} aria-pressed={!genre} onClick={() => set('genre', '')}>Todos</button>
          {data?.genres.map(g => <button key={g} className={pill(genre === g)} aria-pressed={genre === g} onClick={() => set('genre', g)}>{g}</button>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Classificação">
            <span className="mr-1 text-gray-400">Classificação:</span>
            <button className={pill(!rating)} aria-pressed={!rating} onClick={() => set('rating', '')}>Todas</button>
            {RATINGS.map(r => <button key={r} className={pill(rating === r)} aria-pressed={rating === r} onClick={() => set('rating', r)}>{r}</button>)}
          </div>
          <label className="flex items-center gap-2 text-gray-400">Ordenar por
            <select value={sort} onChange={e => set('sort', e.target.value)} className="h-9 rounded-lg border border-white/15 bg-black/60 px-2 text-white outline-none focus:border-brand">
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
      </div>

      <p className="text-xs text-gray-400" aria-live="polite">{isLoading ? 'Carregando…' : `${results.length} ${results.length === 1 ? 'título encontrado' : 'títulos encontrados'}`}</p>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-[9/16]" />)}</div>
      ) : results.length === 0 ? (
        <Empty icon={SearchX} title="Nenhuma minissérie encontrada" text='Tente um termo mais amplo, como "Romance" ou "Vingança".'
          action={<Button variant="secondary" size="sm" onClick={() => setParams({}, { replace: true })}>Limpar filtros</Button>} />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map(s => <SeriesCard key={s.id} series={s} className="w-auto sm:w-auto md:w-auto" />)}
        </div>
      )}
    </div>
  );
}
