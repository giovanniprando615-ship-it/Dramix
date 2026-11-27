import { NavLink } from 'react-router-dom';
import { Home, Flame, Search, Bookmark, User } from 'lucide-react';
import { useSession } from '@/lib/queries';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const { data: user } = useSession();
  const items = [
    { to: '/', label: 'Início', icon: Home, end: true },
    { to: '/feed', label: 'Para você', icon: Flame },
    { to: '/discover', label: 'Descobrir', icon: Search },
    { to: '/library', label: 'Minha Lista', icon: Bookmark },
    { to: '/profile', label: user ? 'Perfil' : 'Entrar', icon: User }
  ];
  return (
    <nav aria-label="Navegação" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/95 backdrop-blur-xl md:hidden">
      <div className="flex">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold', isActive ? 'text-white' : 'text-gray-400')}>
            {({ isActive }) => (<><Icon className={cn('h-5 w-5', isActive && 'text-brand')} aria-hidden />{label}</>)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
