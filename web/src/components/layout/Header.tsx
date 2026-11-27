import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import * as DM from '@radix-ui/react-dropdown-menu';
import { Search, Crown } from 'lucide-react';
import { useGift, useSession, resetAllData } from '@/lib/queries';
import { api } from '@/lib/api';
import { useUI } from '@/store/ui';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { Button } from '@/components/ui/Button';
import { cn, safeImg } from '@/lib/utils';
import { toast } from 'sonner';

export function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="DRAMIX, página inicial">
      <img src="./icon.svg" alt="" className="h-8 w-8 rounded-[10px] shadow-lg shadow-brand/40" />
      <span className="font-display text-[26px] leading-none tracking-wide text-white">DRAMIX</span>
    </Link>
  );
}

const NAV = [
  { to: '/', label: 'Início', end: true },
  { to: '/feed', label: 'Para você' },
  { to: '/discover', label: 'Descobrir' },
  { to: '/store', label: 'Loja' },
  { to: '/plans', label: 'Planos' }
];

export function useLogout() {
  const navigate = useNavigate();
  const resetUI = useUI(s => s.resetForLogout);
  return async () => {
    await api.logout();
    resetUI();
    await resetAllData();
    navigate('/');
    toast('Você saiu da conta.');
  };
}

export function Header() {
  const { data: user } = useSession();
  const { data: gift } = useGift();
  const openAuth = useUI(s => s.openAuth);
  const navigate = useNavigate();
  const logout = useLogout();
  const [q, setQ] = useState('');
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const overHero = (pathname === '/' || pathname.startsWith('/series/')) && !scrolled;

  const search = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/discover?q=${encodeURIComponent(q.trim())}`);
  };

  const coins = user?.coins ?? 0;
  const giftReady = !!user && !!gift?.available;

  return (
    <header className={cn('sticky top-0 z-40 border-b transition-[background-color,border-color] duration-300', overHero ? 'border-transparent bg-transparent' : 'border-white/[0.06] bg-ink/80 backdrop-blur-2xl')}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 text-xs font-semibold md:flex" aria-label="Principal">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('relative px-3 py-2 text-[13px] text-gray-300 transition hover:text-white', isActive && 'text-white after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-brand')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <form onSubmit={search} role="search" className="relative hidden w-44 sm:block lg:w-60">
            <label htmlFor="header-search" className="sr-only">Buscar minisséries</label>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" aria-hidden />
            <input id="header-search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar minisséries" className="h-9 w-full rounded-full border border-white/10 bg-black/30 pl-8 pr-3 text-xs text-white outline-none backdrop-blur placeholder:text-gray-400 focus:border-brand focus:bg-black/60" />
          </form>
          <Link to="/discover" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-gray-300 sm:hidden" aria-label="Buscar">
            <Search className="h-4 w-4" />
          </Link>

          <button
            data-testid="coin-chip"
            onClick={() => (user ? navigate('/store') : openAuth('register'))}
            className="relative flex h-9 items-center gap-1.5 rounded-full border border-coin/30 bg-coin/10 pl-2 pr-3 text-xs font-black text-white hover:bg-coin/20"
            aria-label={`${coins} moedas. ${user ? 'Abrir loja' : 'Criar conta e ganhar moedas'}${giftReady ? '. Presente diário disponível' : ''}`}
          >
            <CoinIcon />
            <span data-testid="coin-balance" className="tabular-nums">{coins}</span>
            {giftReady && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-ink" aria-hidden />}
          </button>

          {user ? (
            <DM.Root>
              <DM.Trigger className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 hover:bg-white/10 md:pl-2.5" aria-label="Menu da conta" data-testid="user-menu">
                <span className="hidden text-right md:block">
                  <span className="block max-w-[96px] truncate text-[11px] font-bold leading-tight text-white">{user.name.split(' ')[0]}</span>
                  <span className={cn('block text-[9px] font-black', user.isPremium ? 'text-coin' : 'text-gray-400')}>{user.isPremium ? 'PREMIUM' : 'GRÁTIS'}</span>
                </span>
                <img src={safeImg(user.avatar)} alt="" className="h-7 w-7 rounded-full bg-gradient-to-tr from-brand to-coin object-cover" />
              </DM.Trigger>
              <DM.Portal>
                <DM.Content align="end" sideOffset={8} className="z-50 w-60 rounded-2xl border border-white/15 bg-ink-700 p-2 shadow-2xl">
                  <div className="mb-1 border-b border-white/10 px-3 py-2">
                    <p className="truncate text-xs font-bold text-white">{user.name}</p>
                    <p className="truncate text-[11px] text-gray-400">{user.email || user.phone}</p>
                  </div>
                  {[
                    ['/profile', 'Meu perfil'], ['/library', 'Minha Lista e histórico'], ['/store', 'Carteira e loja'],
                    ['/plans', 'Planos Premium'], ['/settings', 'Configurações'], ...(user.role === 'owner' ? [['/owner', 'Painel Owner']] : [])
                  ].map(([to, label]) => (
                    <DM.Item key={to} onSelect={() => navigate(to)} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs text-gray-300 outline-none data-[highlighted]:bg-white/5 data-[highlighted]:text-white">
                      {to === '/owner' && <Crown className="h-3.5 w-3.5 text-coin" aria-hidden />}{label}
                    </DM.Item>
                  ))}
                  <DM.Separator className="my-1 h-px bg-white/10" />
                  <DM.Item onSelect={logout} data-testid="logout" className="cursor-pointer rounded-xl px-3 py-2 text-xs text-red-400 outline-none data-[highlighted]:bg-red-500/10">Sair da conta</DM.Item>
                </DM.Content>
              </DM.Portal>
            </DM.Root>
          ) : (
            <Button size="sm" onClick={() => openAuth('login')} data-testid="login-btn">Entrar</Button>
          )}
        </div>
      </div>
    </header>
  );
}
