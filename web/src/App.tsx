import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Footer } from '@/components/layout/Footer';
import { PageLoader } from '@/components/ui/Skeleton';
import { Empty } from '@/components/ui/Empty';
import { LazyMotion, domAnimation } from 'framer-motion';
import { useSession } from '@/lib/queries';
import { useUI } from '@/store/ui';
import Home from '@/pages/Home';

// Cada página é baixada só quando aberta; o painel administrativo (com gráficos) só por quem é Owner
const Discover = lazy(() => import('@/pages/Discover'));
const SeriesPage = lazy(() => import('@/pages/SeriesPage'));
const Feed = lazy(() => import('@/pages/Feed'));
const Store = lazy(() => import('@/pages/Store'));
const Plans = lazy(() => import('@/pages/Plans'));
const Library = lazy(() => import('@/pages/Library'));
const Profile = lazy(() => import('@/pages/Profile'));
const Settings = lazy(() => import('@/pages/Settings'));
const Owner = lazy(() => import('@/pages/Owner'));

// Janelas e player também só carregam quando abertos (login usa Zod e react-hook-form; player usa hls.js)
const AuthDialog = lazy(() => import('@/features/auth/AuthDialog').then(m => ({ default: m.AuthDialog })));
const OnboardingDialog = lazy(() => import('@/features/auth/OnboardingDialog').then(m => ({ default: m.OnboardingDialog })));
const CheckoutDialog = lazy(() => import('@/features/checkout/CheckoutDialog').then(m => ({ default: m.CheckoutDialog })));
const PlayerOverlay = lazy(() => import('@/features/player/PlayerOverlay').then(m => ({ default: m.PlayerOverlay })));

function Overlays() {
  const { auth, onboardingOpen, checkout, player } = useUI();
  return (
    <Suspense fallback={null}>
      {auth.open && <AuthDialog />}
      {onboardingOpen && <OnboardingDialog />}
      {checkout && <CheckoutDialog />}
      {player && <PlayerOverlay />}
    </Suspense>
  );
}

const TITLES: Record<string, string> = {
  '': 'Início', feed: 'Para você', discover: 'Descobrir', series: 'Minissérie', store: 'Loja de moedas',
  plans: 'Planos Premium', library: 'Minha Lista', profile: 'Perfil', settings: 'Configurações', owner: 'Painel Owner'
};

function Shell() {
  const { pathname } = useLocation();
  const { data: user } = useSession();
  const setOnboarding = useUI(s => s.setOnboarding);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${TITLES[pathname.split('/')[1] ?? ''] ?? 'DRAMIX'} — DRAMIX`;
  }, [pathname]);

  // Conta que pulou o onboarding em outra sessão: pergunta de novo uma vez
  useEffect(() => {
    if (user && !user.onboarded && user.role !== 'owner') setOnboarding(true);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isFeed = pathname === '/feed';
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-xl focus:bg-brand focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white">Pular para o conteúdo</a>
      <Header />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10 lg:px-8">
        <Suspense fallback={<PageLoader />}><Outlet /></Suspense>
      </main>
      {!isFeed && <Footer />}
      <BottomNav />
      <Overlays />
    </div>
  );
}

export default function App() {
  return (
    <LazyMotion features={domAnimation} strict>
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="feed" element={<Feed />} />
          <Route path="discover" element={<Discover />} />
          <Route path="series/:id" element={<SeriesPage />} />
          <Route path="store" element={<Store />} />
          <Route path="plans" element={<Plans />} />
          <Route path="library" element={<Library />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings/:page?" element={<Settings />} />
          <Route path="owner" element={<Owner />} />
          <Route path="*" element={<Empty icon={Compass} title="Página não encontrada" text="O endereço pode estar errado ou a página mudou de lugar." />} />
        </Route>
      </Routes>
    </HashRouter>
    </LazyMotion>
  );
}
