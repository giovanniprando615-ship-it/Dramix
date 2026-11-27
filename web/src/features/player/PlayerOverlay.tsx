import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, m as motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Heart, ListVideo, Lock, Pause, Play, Share2, Volume2, VolumeX, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useUI } from '@/store/ui';
import { api } from '@/lib/api';
import { useAction, usePlayback, useSeries, useSession } from '@/lib/queries';
import { cn, formatTime, safeImg } from '@/lib/utils';
import { Video } from './Video';
import { Paywall } from './Paywall';

const SAVE_EVERY_MS = 5000;

export function PlayerOverlay() {
  const player = useUI(s => s.player);
  if (!player) return null;
  return <PlayerScreen key={player.seriesId} {...player} />;
}

function PlayerScreen({ seriesId, episode: initialEp, start }: { seriesId: string; episode: number; start: number }) {
  const { closePlayer, openAuth } = useUI();
  const qc = useQueryClient();
  const [ep, setEp] = useState(initialEp);
  const [startAt, setStartAt] = useState(start);
  const [dir, setDir] = useState(1);
  const { data, isLoading, refetch } = usePlayback(seriesId, ep);
  const { data: details } = useSeries(seriesId);
  const { data: user } = useSession();
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState({ cur: 0, dur: 0 });
  const [drawer, setDrawer] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [failedEp, setFailedEp] = useState<number | null>(null);
  const failed = failedEp === ep;
  const lastSave = useRef(0);
  const touchY = useRef<number | null>(null);
  const wheelLock = useRef(0);
  const fav = useAction(() => api.toggleFavorite(seriesId), { success: r => (r ? 'Adicionada à Minha Lista.' : 'Removida da Minha Lista.') });

  const total = data?.episodes.length ?? 0;
  const allowed = !!data?.access.allowed;

  // Sincroniza com um novo pedido de play vindo de fora (ex.: "voltar ao episódio" depois da compra)
  useEffect(() => { setEp(initialEp); setStartAt(start); }, [initialEp, start]);

  // Trava a rolagem da página enquanto o player está aberto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const save = useCallback((force = false) => {
    const v = video.current;
    if (!v || !data?.access.allowed || !v.duration) return;
    if (!force && Date.now() - lastSave.current < SAVE_EVERY_MS) return;
    lastSave.current = Date.now();
    void api.saveProgress(seriesId, data.episode.id, v.currentTime, v.duration);
  }, [data, seriesId]);

  const close = useCallback(() => {
    save(true);
    qc.invalidateQueries();
    closePlayer();
  }, [save, qc, closePlayer]);

  const go = useCallback((n: number) => {
    if (n < 1 || n > total || n === ep) return;
    save(true);
    setCountdown(null);
    setFailedEp(null);
    setDir(n > ep ? 1 : -1);
    setStartAt(0);
    setEp(n);
  }, [ep, total, save]);

  const toggle = useCallback(() => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  // Teclado: espaço pausa, setas sobem/descem episódio e avançam 5 s, Esc fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, [role="dialog"] button')) return;
      if (e.key === 'Escape') { if (drawer) setDrawer(false); else close(); }
      else if (e.key === ' ') { e.preventDefault(); toggle(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); go(ep + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); go(ep - 1); }
      else if (e.key === 'ArrowRight' && video.current) video.current.currentTime += 5;
      else if (e.key === 'ArrowLeft' && video.current) video.current.currentTime -= 5;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, toggle, go, ep, drawer]);

  // Contagem para o próximo episódio
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { go(ep + 1); return; }
    const t = setTimeout(() => setCountdown(c => (c === null ? c : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, go, ep]);

  const onEnded = () => {
    save(true);
    if (ep < total) setCountdown(3);
    else toast('Você chegou ao último episódio desta minissérie.');
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchY.current === null || drawer) return;
    const dy = e.changedTouches[0].clientY - touchY.current;
    touchY.current = null;
    if (Math.abs(dy) > 70) go(dy < 0 ? ep + 1 : ep - 1);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (drawer || Math.abs(e.deltaY) < 40 || Date.now() - wheelLock.current < 700) return;
    wheelLock.current = Date.now();
    go(e.deltaY > 0 ? ep + 1 : ep - 1);
  };

  const share = async () => {
    const url = `${location.origin}${location.pathname}#/series/${seriesId}`;
    try {
      if (navigator.share) await navigator.share({ title: data?.series.title, url });
      else { await navigator.clipboard.writeText(url); toast.success('Link copiado.'); }
    } catch { /* cancelado */ }
  };

  const series = data?.series;
  const poster = safeImg(series?.poster_url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black md:bg-black/95" role="dialog" aria-modal="true" aria-label={series ? `Assistindo ${series.title}` : 'Player'}>
      {poster && <img src={poster} alt="" className="absolute inset-0 hidden h-full w-full scale-110 object-cover opacity-25 blur-2xl md:block" />}

      <div
        className="relative h-full w-full overflow-hidden bg-black md:h-[94vh] md:max-w-[440px] md:rounded-3xl md:border md:border-white/10 md:shadow-2xl"
        onTouchStart={e => { touchY.current = e.touches[0].clientY; }}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
      >
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={ep}
            custom={dir}
            initial={{ y: `${dir * 100}%` }}
            animate={{ y: 0 }}
            exit={{ y: `${dir * -100}%` }}
            transition={{ type: 'tween', duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0"
          >
            {isLoading || !data ? (
              <div className="grid h-full place-items-center"><span className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-brand" aria-label="Carregando" /></div>
            ) : allowed ? (
              <>
                <Video
                  ref={video}
                  src={data.episode.video_url}
                  startAt={startAt}
                  autoPlay
                  muted={muted}
                  className="h-full w-full object-cover"
                  onClick={toggle}
                  onPlay={() => setPlaying(true)}
                  onPause={() => { setPlaying(false); save(true); }}
                  onTimeUpdate={e => { const v = e.currentTarget; setTime({ cur: v.currentTime, dur: v.duration || 0 }); save(); }}
                  onEnded={onEnded}
                  onError={e => { if (e.currentTarget.currentSrc) setFailedEp(ep); }}
                  data-testid="player-video"
                />
                {!playing && !failed && countdown === null && (
                  <button onClick={toggle} className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur" aria-label="Reproduzir">
                    <Play className="ml-1 h-8 w-8 fill-current" />
                  </button>
                )}
              </>
            ) : (
              <div className="relative grid h-full place-items-center px-6">
                {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-[6px]" />}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,16,0.55),rgba(6,8,16,0.82)_45%,#060810)]" />
                <div className="relative z-10 flex w-full justify-center">
                  <Paywall series={data.series} episodeNumber={ep} access={data.access} onUnlocked={() => { refetch(); qc.invalidateQueries(); }} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {failed && allowed && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/80 p-8 text-center">
            <div className="space-y-3">
              <AlertTriangle className="mx-auto h-8 w-8 text-coin" aria-hidden />
              <p className="text-sm font-bold text-white">Não foi possível carregar este vídeo.</p>
              <p className="text-xs text-gray-400">Confira sua conexão e tente de novo.</p>
              <button onClick={() => { setFailedEp(null); setStartAt(video.current?.currentTime ?? 0); refetch(); }} className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20">Tentar de novo</button>
            </div>
          </div>
        )}

        {countdown !== null && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/80 backdrop-blur-sm">
            <div className="space-y-4 text-center">
              <p className="text-xs font-bold text-gray-300">Próximo episódio em</p>
              <p className="text-6xl font-black text-white" aria-live="assertive">{countdown}</p>
              <div className="flex gap-2">
                <button onClick={() => go(ep + 1)} className="rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white">Assistir agora</button>
                <button onClick={() => setCountdown(null)} className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-gray-200">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Topo */}
        <div className="absolute inset-x-0 top-0 z-30 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button onClick={close} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/50 text-white backdrop-blur" aria-label="Fechar player" data-testid="player-close">
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-display truncate text-[20px] leading-tight text-white">{series?.title}</p>
            <p className="truncate text-[11px] text-gray-300">Episódio {ep} de {total}{data && ` • ${data.episode.title}`}</p>
          </div>
          <button onClick={() => setDrawer(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/50 text-white backdrop-blur" aria-label="Lista de episódios">
            <ListVideo className="h-5 w-5" />
          </button>
        </div>

        {/* Ações laterais (só com o vídeo tocando, para não cobrir a tela de desbloqueio) */}
        {allowed && <div className="absolute bottom-28 right-3 z-30 flex flex-col items-center gap-4 text-white">
          <RailButton label={details?.isFavorite ? 'Remover da Minha Lista' : 'Adicionar à Minha Lista'} onClick={() => (user ? fav.mutate(undefined) : openAuth('login'))}>
            <Heart className={cn('h-6 w-6', details?.isFavorite && 'fill-brand text-brand')} />
          </RailButton>
          <RailButton label="Compartilhar" onClick={share}><Share2 className="h-6 w-6" /></RailButton>
          <RailButton label={muted ? 'Ativar som' : 'Silenciar'} onClick={() => setMuted(m => !m)}>
            {muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </RailButton>
          <div className="hidden flex-col gap-2 md:flex">
            <RailButton label="Episódio anterior" onClick={() => go(ep - 1)} disabled={ep <= 1}><ChevronUp className="h-6 w-6" /></RailButton>
            <RailButton label="Próximo episódio" onClick={() => go(ep + 1)} disabled={ep >= total}><ChevronDown className="h-6 w-6" /></RailButton>
          </div>
        </div>}

        {/* Progresso */}
        {allowed && (
          <div className="absolute inset-x-0 bottom-0 z-30 space-y-1 bg-gradient-to-t from-black/90 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
            <div className="flex items-center gap-3">
              <button onClick={toggle} aria-label={playing ? 'Pausar' : 'Reproduzir'} className="text-white">
                {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
              </button>
              <input
                type="range"
                min={0}
                max={time.dur || 0}
                step={0.1}
                value={time.cur}
                onChange={e => { if (video.current) video.current.currentTime = Number(e.target.value); }}
                aria-label="Posição do vídeo"
                className="h-1 flex-1 cursor-pointer accent-brand"
              />
              <span className="w-20 text-right font-mono text-[11px] text-gray-300">{formatTime(time.cur)} / {formatTime(time.dur)}</span>
            </div>
            <p className="text-center text-[10px] text-gray-500 md:hidden">Deslize para cima para o próximo episódio</p>
          </div>
        )}

        {/* Gaveta de episódios */}
        <AnimatePresence>
          {drawer && data && (
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'tween', duration: 0.25 }}
              className="absolute inset-x-0 bottom-0 z-40 max-h-[65%] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-800/95 p-5 backdrop-blur"
              role="dialog" aria-label="Lista de episódios"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Episódios</p>
                  <p className="text-[11px] text-gray-400">1 a {data.access.freeLimit} grátis • depois {data.access.priceCoins} moedas cada</p>
                </div>
                <button onClick={() => setDrawer(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white" aria-label="Fechar lista"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {data.episodes.map(e => (
                  <button
                    key={e.id}
                    onClick={() => { setDrawer(false); go(e.episode_number); }}
                    aria-label={`Episódio ${e.episode_number}${e.access.allowed ? '' : ', bloqueado'}`}
                    aria-current={e.episode_number === ep}
                    className={cn('relative grid aspect-square place-items-center rounded-xl border text-sm font-bold',
                      e.episode_number === ep ? 'border-brand bg-brand text-white' : 'border-white/10 bg-white/5 text-white hover:bg-white/10')}
                  >
                    {e.episode_number}
                    {!e.access.allowed && <Lock className="absolute right-1 top-1 h-3 w-3 text-coin" aria-hidden />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function RailButton({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label} className="grid h-11 w-11 place-items-center rounded-full bg-black/40 backdrop-blur transition hover:bg-black/70 disabled:opacity-30">
      {children}
    </button>
  );
}
