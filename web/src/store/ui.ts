import { create } from 'zustand';

export type AuthMode = 'login' | 'register';
export interface EpisodeRef { seriesId: string; episode: number }

interface UIState {
  auth: { open: boolean; mode: AuthMode };
  onboardingOpen: boolean;
  checkout: { kind: 'subscription' | 'coins'; itemId: string } | null;
  player: (EpisodeRef & { start: number }) | null;
  returnTo: EpisodeRef | null;
  openAuth: (mode?: AuthMode) => void;
  closeAuth: () => void;
  setOnboarding: (open: boolean) => void;
  openCheckout: (kind: 'subscription' | 'coins', itemId: string) => void;
  closeCheckout: () => void;
  play: (seriesId: string, episode: number, start?: number) => void;
  closePlayer: () => void;
  setReturnTo: (ref: EpisodeRef | null) => void;
  resetForLogout: () => void;
}

export const useUI = create<UIState>(set => ({
  auth: { open: false, mode: 'login' },
  onboardingOpen: false,
  checkout: null,
  player: null,
  returnTo: null,
  openAuth: (mode = 'login') => set({ auth: { open: true, mode } }),
  closeAuth: () => set(s => ({ auth: { ...s.auth, open: false } })),
  setOnboarding: open => set({ onboardingOpen: open }),
  openCheckout: (kind, itemId) => set({ checkout: { kind, itemId } }),
  closeCheckout: () => set({ checkout: null }),
  play: (seriesId, episode, start = 0) => set({ player: { seriesId, episode, start } }),
  closePlayer: () => set({ player: null }),
  setReturnTo: returnTo => set({ returnTo }),
  resetForLogout: () => set({ checkout: null, player: null, returnTo: null, onboardingOpen: false })
}));
