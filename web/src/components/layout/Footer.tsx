import { Link } from 'react-router-dom';
import { Logo } from './Header';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-ink-900 pb-24 pt-10 md:pb-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:px-6 md:flex-row lg:px-8">
        <div className="flex flex-col items-center gap-1 md:items-start">
          <Logo />
          <p className="text-[11px] text-gray-400">Minisséries em episódios curtos. 5 episódios grátis em cada história.</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-semibold text-gray-400" aria-label="Informações">
          <Link to="/settings/terms" className="hover:text-white">Termos de uso</Link>
          <Link to="/settings/privacy" className="hover:text-white">Privacidade</Link>
          <Link to="/settings/subscription-policy" className="hover:text-white">Assinaturas e moedas</Link>
          <Link to="/settings/support" className="hover:text-white">Suporte</Link>
        </nav>
        <p className="text-xs text-gray-500">&copy; 2026 DRAMIX</p>
      </div>
    </footer>
  );
}
