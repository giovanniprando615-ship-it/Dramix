import { useEffect, useState, type FormEvent } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, Lock, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { Field } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { useAction, useSession, useSettings } from '@/lib/queries';
import { brl, cn, formatDate, formatViews, safeImg } from '@/lib/utils';
import type { AppSettings, CoinPackage, ContentRating } from '@/domain/types';

const tab = 'shrink-0 rounded-xl px-4 py-2 text-xs font-bold text-gray-400 hover:text-white data-[state=active]:bg-brand data-[state=active]:text-white';
const card = 'rounded-3xl border border-white/10 bg-ink-700 p-6';
const num = 'h-9 w-full rounded-lg border border-white/15 bg-black/50 px-2 font-mono text-xs text-white outline-none focus:border-coin';

export default function Owner() {
  const { data: user, isLoading } = useSession();
  if (isLoading) return <Skeleton className="h-96" />;
  if (user?.role !== 'owner') return <Empty icon={Lock} title="Acesso restrito" text="Esta área é exclusiva da administração do DRAMIX." />;
  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-coin/30 bg-gradient-to-r from-ink-600 via-ink-700 to-black p-6 md:p-8">
        <p className="text-xs font-bold text-coin">Painel administrativo</p>
        <h1 className="text-2xl font-black text-white md:text-3xl">Painel do Owner</h1>
        <p className="text-xs text-gray-400">Receita, catálogo, preços, regras de moedas, layout da Home e suporte.</p>
      </header>
      <Tabs.Root defaultValue="overview">
        <Tabs.List className="scrollbar-none mb-6 flex gap-2 overflow-x-auto border-b border-white/10 pb-2">
          {[['overview', 'Visão geral'], ['catalog', 'Catálogo'], ['coins', 'Moedas e loja'], ['plans', 'Planos'], ['home', 'Home'], ['support', 'Suporte']].map(([v, l]) => (
            <Tabs.Trigger key={v} value={v} className={tab}>{l}</Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="overview"><Overview /></Tabs.Content>
        <Tabs.Content value="catalog"><Catalog /></Tabs.Content>
        <Tabs.Content value="coins"><Coins /></Tabs.Content>
        <Tabs.Content value="plans"><PlansAdmin /></Tabs.Content>
        <Tabs.Content value="home"><HomeLayout /></Tabs.Content>
        <Tabs.Content value="support"><Support /></Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-700 p-4">
      <p className="text-[11px] font-semibold text-gray-400">{label}</p>
      <p className={cn('text-2xl font-black text-white tabular-nums', tone)}>{value}</p>
      {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}

function Overview() {
  const { data: s } = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => api.getAdminStats() });
  if (!s) return <Skeleton className="h-80" />;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Receita total" value={brl(s.totalRevenue)} sub={`Assinaturas ${brl(s.subscriptionRevenue)} • Moedas ${brl(s.coinRevenue)}`} tone="text-emerald-400" />
        <Stat label="Assinantes ativos" value={s.activeSubscribers} sub={`${s.totalUsers} contas no total`} tone="text-coin" />
        <Stat label="Moedas gastas" value={s.coinsSpent} sub={`${s.coinUnlocks} episódios desbloqueados`} />
        <Stat label="Moedas em carteiras" value={s.coinsInCirculation} sub={`${s.adUnlocks} desbloqueios por anúncio`} />
      </div>
      <section className={card} aria-labelledby="rev">
        <h2 id="rev" className="mb-4 text-sm font-bold text-white">Receita dos últimos 14 dias</h2>
        <div className="h-64" role="img" aria-label="Gráfico de receita diária por assinaturas e moedas">
          <ResponsiveContainer>
            <AreaChart data={s.revenueByDay} margin={{ left: -16, right: 8 }}>
              <defs>
                <linearGradient id="gSub" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E52E4D" stopOpacity={0.5} /><stop offset="1" stopColor="#E52E4D" stopOpacity={0} /></linearGradient>
                <linearGradient id="gCoin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F5B83D" stopOpacity={0.5} /><stop offset="1" stopColor="#F5B83D" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0E1322', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, fontSize: 12 }} formatter={(v: number) => brl(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="assinaturas" name="Assinaturas" stroke="#E52E4D" fill="url(#gSub)" strokeWidth={2} />
              <Area type="monotone" dataKey="moedas" name="Moedas" stroke="#F5B83D" fill="url(#gCoin)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
      <p className="text-[11px] text-gray-500">{formatViews(s.totalViews)} visualizações no catálogo • {s.openTickets} chamados de suporte abertos</p>
    </div>
  );
}

function Catalog() {
  const { data: settings } = useSettings();
  const { data: series } = useQuery({ queryKey: ['admin', 'series'], queryFn: () => api.adminListSeries() });
  const [selected, setSelected] = useState<string | null>(null);
  const update = useAction((a: { id: string; patch: Parameters<typeof api.adminUpdateSeries>[1] }) => api.adminUpdateSeries(a.id, a.patch), { success: 'Série atualizada.' });
  const featured = useAction((id: string) => api.adminSetFeatured(id), { success: 'Destaque da Home atualizado.' });
  const remove = useAction((id: string) => api.adminDeleteSeries(id), { success: 'Minissérie excluída.' });
  const create = useAction((f: NewSeries) => api.adminCreateSeries({
    title: f.title, synopsis: f.synopsis, poster_url: f.poster, backdrop_url: f.backdrop || undefined, trailer_url: f.trailer || undefined,
    genres: f.genres.split(',').map(g => g.trim()).filter(Boolean), content_rating: f.rating, free_episodes_count: f.free, is_featured: f.featured
  }), { success: s => `"${s.title}" publicada. Adicione os episódios abaixo.` });

  const empty: NewSeries = { title: '', synopsis: '', poster: '', backdrop: '', trailer: '', genres: '', rating: '14+', free: settings?.default_free_episodes ?? 5, featured: false };
  const [form, setForm] = useState<NewSeries>(empty);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return setFormError('Informe o título.');
    if (!/^https?:\/\//i.test(form.poster)) return setFormError('A URL da capa precisa começar com http:// ou https://');
    setFormError(null);
    const s = await create.mutateAsync(form);
    setForm(empty);
    setSelected(s.id);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className={cn(card, 'space-y-4')} noValidate>
        <h2 className="text-base font-bold text-white">Publicar nova minissérie</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título" id="ns-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Field label="Gêneros (separados por vírgula)" id="ns-genres" placeholder="Romance, Drama" value={form.genres} onChange={e => setForm(f => ({ ...f, genres: e.target.value }))} />
        </div>
        <label className="block space-y-1"><span className="text-[11px] text-gray-400">Sinopse</span>
          <textarea rows={3} value={form.synopsis} onChange={e => setForm(f => ({ ...f, synopsis: e.target.value }))} className="w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand" />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="URL da capa vertical (9:16)" id="ns-poster" placeholder="https://" value={form.poster} onChange={e => setForm(f => ({ ...f, poster: e.target.value }))} />
          <Field label="URL do banner horizontal" id="ns-backdrop" placeholder="Opcional" value={form.backdrop} onChange={e => setForm(f => ({ ...f, backdrop: e.target.value }))} />
          <Field label="URL do trailer (feed Para você)" id="ns-trailer" placeholder="Opcional, .mp4 ou .m3u8" value={form.trailer} onChange={e => setForm(f => ({ ...f, trailer: e.target.value }))} />
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="space-y-1"><span className="block text-[11px] text-gray-400">Classificação</span>
            <select value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value as ContentRating }))} className="h-11 rounded-xl border border-white/15 bg-black/50 px-3 text-sm text-white">
              {['Livre', '12+', '14+', '16+', '18+'].map(r => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="w-32 space-y-1"><span className="block text-[11px] text-gray-400">Episódios grátis</span>
            <input type="number" min={0} max={50} value={form.free} onChange={e => setForm(f => ({ ...f, free: Number(e.target.value) }))} className={cn(num, 'h-11')} />
          </label>
          <label className="flex h-11 items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} className="accent-coin" />Destaque principal da Home</label>
          <Button type="submit" variant="coin" className="ml-auto" loading={create.isPending}>Publicar</Button>
        </div>
        {formError && <p role="alert" className="text-xs text-red-400">{formError}</p>}
      </form>

      <section className="space-y-3" aria-labelledby="list">
        <h2 id="list" className="text-sm font-bold text-white">Minisséries ({series?.length ?? 0})</h2>
        {series?.map(s => (
          <div key={s.id} className="rounded-2xl border border-white/10 bg-ink-700 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <img src={safeImg(s.poster_url)} alt="" className="h-[72px] w-12 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-bold text-white">{s.title}{s.is_featured && <Star className="h-3.5 w-3.5 shrink-0 fill-coin text-coin" aria-label="Destaque" />}</p>
                  <p className="truncate text-xs text-gray-400">{s.genres.join(', ')} • {s.content_rating} • {s.episodes_count} eps • {formatViews(s.views_count)} views</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <label className="flex items-center gap-1.5 text-gray-400">Grátis
                  <input type="number" min={0} max={50} defaultValue={s.free_episodes_count} className={cn(num, 'w-16')} aria-label={`Episódios grátis de ${s.title}`}
                    onBlur={e => Number(e.target.value) !== s.free_episodes_count && update.mutate({ id: s.id, patch: { free_episodes_count: Number(e.target.value) } })} />
                </label>
                <label className="flex items-center gap-1.5 text-gray-300"><input type="checkbox" checked={s.is_published} className="accent-emerald-500" onChange={e => update.mutate({ id: s.id, patch: { is_published: e.target.checked } })} />Publicada</label>
                {!s.is_featured && <Button size="sm" variant="secondary" onClick={() => featured.mutate(s.id)}>Destacar</Button>}
                <Button size="sm" variant="secondary" onClick={() => setSelected(selected === s.id ? null : s.id)} aria-expanded={selected === s.id}>Episódios</Button>
                <Button size="sm" variant="danger" aria-label={`Excluir ${s.title}`} onClick={() => confirm(`Excluir "${s.title}" e todos os episódios? Não dá para desfazer.`) && remove.mutate(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {selected === s.id && <EpisodesManager seriesId={s.id} free={s.free_episodes_count} />}
          </div>
        ))}
      </section>
    </div>
  );
}

interface NewSeries { title: string; synopsis: string; poster: string; backdrop: string; trailer: string; genres: string; rating: ContentRating; free: number; featured: boolean }

function EpisodesManager({ seriesId, free }: { seriesId: string; free: number }) {
  const { data: eps } = useQuery({ queryKey: ['admin', 'episodes', seriesId], queryFn: () => api.adminListEpisodes(seriesId) });
  const [form, setForm] = useState({ title: '', video: '', duration: 120 });
  const add = useAction((f: typeof form) => api.adminAddEpisode(seriesId, { title: f.title, video_url: f.video, duration_seconds: f.duration }), { success: e => `Episódio ${e.episode_number} adicionado.` });
  const del = useAction((id: string) => api.adminDeleteEpisode(id), { success: 'Episódio excluído e numeração ajustada.' });
  return (
    <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
      <form onSubmit={e => { e.preventDefault(); add.mutateAsync(form).then(() => setForm({ title: '', video: '', duration: 120 })).catch(() => {}); }} className="grid gap-2 sm:grid-cols-[1fr_2fr_110px_auto]">
        <input placeholder="Título do episódio" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={cn(num, 'h-10')} aria-label="Título do episódio" />
        <input placeholder="URL do vídeo (.mp4 ou .m3u8)" value={form.video} onChange={e => setForm(f => ({ ...f, video: e.target.value }))} className={cn(num, 'h-10')} aria-label="URL do vídeo" required />
        <input type="number" min={1} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} className={cn(num, 'h-10')} aria-label="Duração em segundos" />
        <Button size="sm" variant="coin" type="submit" className="h-10" loading={add.isPending}>Adicionar</Button>
      </form>
      <ol className="grid gap-2 sm:grid-cols-2">
        {eps?.map(e => (
          <li key={e.id} className="flex items-center justify-between gap-2 rounded-xl bg-black/30 px-3 py-2 text-xs">
            <span className="min-w-0 truncate"><b className="text-white">{e.episode_number}.</b> <span className="text-gray-300">{e.title}</span> <span className="text-gray-500">{e.duration_seconds}s</span></span>
            <span className="flex shrink-0 items-center gap-2">
              <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', e.episode_number <= free ? 'bg-emerald-500/15 text-emerald-300' : 'bg-coin/15 text-coin')}>{e.episode_number <= free ? 'Grátis' : 'Bloqueado'}</span>
              <button onClick={() => confirm(`Excluir o episódio ${e.episode_number}?`) && del.mutate(e.id)} className="text-red-400 hover:text-red-300" aria-label={`Excluir episódio ${e.episode_number}`}><Trash2 className="h-3.5 w-3.5" /></button>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const SETTING_FIELDS: [keyof AppSettings, string, string][] = [
  ['welcome_bonus_coins', 'Bônus de cadastro', 'Uma vez por conta'],
  ['daily_gift_coins', 'Presente diário', '1 resgate por dia'],
  ['episode_price_coins', 'Preço por episódio', 'Em moedas'],
  ['series_bundle_discount_percent', 'Desconto do pacote da série (%)', 'Máximo 90'],
  ['default_free_episodes', 'Episódios grátis padrão', 'Para novas séries'],
  ['rewarded_ad_cooldown_hours', 'Intervalo do anúncio (horas)', '1 desbloqueio por intervalo']
];

function Coins() {
  const { data: settings } = useSettings();
  const { data: packages } = useQuery({ queryKey: ['admin', 'packages'], queryFn: () => api.adminListPackages() });
  const [draft, setDraft] = useState<Partial<AppSettings>>({});
  const [pk, setPk] = useState<CoinPackage[]>([]);
  const saveSettings = useAction((p: Partial<AppSettings>) => api.adminUpdateSettings(p), { success: 'Regras de moedas salvas.' });
  const savePackages = useAction(async (list: CoinPackage[]) => { for (const p of list) await api.adminUpdatePackage(p.id, p); }, { success: 'Pacotes salvos.' });

  useEffect(() => { if (settings) setDraft(settings); }, [settings]);
  useEffect(() => { if (packages) setPk(packages); }, [packages]);
  const setP = (id: string, patch: Partial<CoinPackage>) => setPk(list => list.map(p => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-6">
      <form onSubmit={e => { e.preventDefault(); saveSettings.mutate(draft); }} className={cn(card, 'space-y-4')}>
        <div><h2 className="text-base font-bold text-white">Regras de moedas</h2><p className="text-xs text-gray-400">Valem para novas contas e novos desbloqueios. Moedas já creditadas não mudam.</p></div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {SETTING_FIELDS.map(([k, label, hint]) => (
            <Field key={k} label={label} hint={hint} id={`set-${k}`} type="number" min={0} value={String(draft[k] ?? '')} onChange={e => setDraft(d => ({ ...d, [k]: Number(e.target.value) }))} />
          ))}
          <Field label="E-mail de suporte" id="set-email" type="email" value={draft.support_email ?? ''} onChange={e => setDraft(d => ({ ...d, support_email: e.target.value }))} />
        </div>
        <div className="flex justify-end"><Button type="submit" variant="coin" loading={saveSettings.isPending}>Salvar regras</Button></div>
      </form>

      <form onSubmit={e => { e.preventDefault(); savePackages.mutate(pk); }} className={cn(card, 'space-y-4')}>
        <div><h2 className="text-base font-bold text-white">Pacotes da loja</h2><p className="text-xs text-gray-400">Preço em reais, moedas base e bônus. Desmarque para esconder o pacote.</p></div>
        {pk.map(p => (
          <div key={p.id} className="grid grid-cols-2 items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-3 text-xs sm:grid-cols-5">
            <span className="font-bold text-white">{p.coins + p.bonus_coins} moedas • {brl(p.price)}</span>
            <label className="flex items-center gap-1 text-gray-400">R$<input type="number" step="0.01" min={0.5} value={p.price} onChange={e => setP(p.id, { price: Number(e.target.value) })} className={num} /></label>
            <label className="flex items-center gap-1 text-gray-400">Base<input type="number" min={1} value={p.coins} onChange={e => setP(p.id, { coins: Number(e.target.value) })} className={num} /></label>
            <label className="flex items-center gap-1 text-gray-400">Bônus<input type="number" min={0} value={p.bonus_coins} onChange={e => setP(p.id, { bonus_coins: Number(e.target.value) })} className={num} /></label>
            <label className="flex items-center gap-1.5 text-gray-300"><input type="checkbox" checked={p.is_active} onChange={e => setP(p.id, { is_active: e.target.checked })} className="accent-emerald-500" />Ativo</label>
          </div>
        ))}
        <div className="flex justify-end"><Button type="submit" variant="coin" loading={savePackages.isPending}>Salvar pacotes</Button></div>
      </form>
    </div>
  );
}

function PlansAdmin() {
  const { data: plans } = useQuery({ queryKey: ['admin', 'plans'], queryFn: () => api.adminListPlans() });
  const [prices, setPrices] = useState<Record<string, number>>({});
  const save = useAction(async (p: Record<string, number>) => { for (const [id, v] of Object.entries(p)) await api.adminUpdatePlan(id, v); }, { success: 'Preços dos planos salvos.' });
  useEffect(() => { if (plans) setPrices(Object.fromEntries(plans.map(p => [p.id, p.price]))); }, [plans]);
  return (
    <form onSubmit={e => { e.preventDefault(); save.mutate(prices); }} className={cn(card, 'space-y-4')}>
      <h2 className="text-base font-bold text-white">Preços dos planos Premium</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {plans?.map(p => <Field key={p.id} label={`${p.name} (${p.duration_days} dias)`} id={`plan-${p.id}`} type="number" step="0.01" min={0} value={String(prices[p.id] ?? '')} onChange={e => setPrices(x => ({ ...x, [p.id]: Number(e.target.value) }))} />)}
      </div>
      <div className="flex justify-end"><Button type="submit" variant="coin" loading={save.isPending}>Salvar preços</Button></div>
    </form>
  );
}

function HomeLayout() {
  const { data: sections } = useQuery({ queryKey: ['admin', 'sections'], queryFn: () => api.adminListSections() });
  const move = useAction((a: { id: string; dir: -1 | 1 }) => api.adminMoveSection(a.id, a.dir));
  const toggle = useAction((a: { id: string; on: boolean }) => api.adminToggleSection(a.id, a.on));
  return (
    <section className={cn(card, 'space-y-2')}>
      <h2 className="mb-2 text-base font-bold text-white">Fileiras da página inicial</h2>
      {sections?.map((s, i) => (
        <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
          <span className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 font-bold text-white">{i + 1}</span><span className="font-bold text-white">{s.title}</span></span>
          <span className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-gray-300"><input type="checkbox" checked={s.is_enabled} onChange={e => toggle.mutate({ id: s.id, on: e.target.checked })} className="accent-emerald-500" />Visível</label>
            <button disabled={i === 0} onClick={() => move.mutate({ id: s.id, dir: -1 })} aria-label={`Subir ${s.title}`} className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white hover:bg-white/15 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
            <button disabled={i === sections.length - 1} onClick={() => move.mutate({ id: s.id, dir: 1 })} aria-label={`Descer ${s.title}`} className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white hover:bg-white/15 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
          </span>
        </div>
      ))}
    </section>
  );
}

function Support() {
  const { data: tickets } = useQuery({ queryKey: ['admin', 'tickets'], queryFn: () => api.adminListTickets() });
  const close = useAction((id: string) => api.adminCloseTicket(id), { success: 'Chamado resolvido.' });
  if (!tickets?.length) return <p className={cn(card, 'text-center text-xs text-gray-400')}>Nenhum chamado de suporte ainda.</p>;
  return (
    <div className="space-y-3">
      {tickets.map(t => (
        <article key={t.id} className={cn('space-y-2 rounded-2xl border p-4 text-xs', t.status === 'open' ? 'border-coin/30 bg-ink-700' : 'border-white/10 bg-ink-700 opacity-60')}>
          <div className="flex flex-wrap justify-between gap-2"><b className="text-white">{t.subject}</b><span className="text-gray-500">{formatDate(t.created_at, true)}</span></div>
          <p className="whitespace-pre-line text-gray-300">{t.message}</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a href={`mailto:${t.email}?subject=${encodeURIComponent(`Re: ${t.subject}`)}`} className="text-sky-300 underline">{t.name || 'Usuário'} • {t.email}</a>
            {t.status === 'open' ? <Button size="sm" variant="secondary" onClick={() => close.mutate(t.id)}>Marcar como resolvido</Button> : <span className="font-bold text-emerald-400">Resolvido</span>}
          </div>
        </article>
      ))}
    </div>
  );
}
