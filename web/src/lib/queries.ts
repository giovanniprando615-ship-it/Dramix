import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from './api';
import { AppError } from '@/services/dramix-service';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: (n, err) => !(err instanceof AppError) && n < 2, refetchOnWindowFocus: false } }
});

// Leituras
export const useSession = () => useQuery({ queryKey: ['session'], queryFn: () => api.getSession() });
export const useHome = () => useQuery({ queryKey: ['home'], queryFn: () => api.getHome() });
export const useCatalog = () => useQuery({ queryKey: ['catalog'], queryFn: () => api.getCatalog() });
export const useFeed = () => useQuery({ queryKey: ['feed'], queryFn: () => api.getFeed() });
export const useSeries = (id: string) => useQuery({ queryKey: ['series', id], queryFn: () => api.getSeries(id), enabled: !!id });
export const usePlayback = (seriesId: string, ep: number) =>
  useQuery({ queryKey: ['playback', seriesId, ep], queryFn: () => api.getEpisodePlayback(seriesId, ep), enabled: !!seriesId });
export const useGift = () => useQuery({ queryKey: ['gift'], queryFn: () => api.getDailyGift() });
export const useWallet = (enabled = true) => useQuery({ queryKey: ['wallet'], queryFn: () => api.getWallet(), enabled });
export const useLibrary = (enabled = true) => useQuery({ queryKey: ['library'], queryFn: () => api.getLibrary(), enabled });
export const usePlans = () => useQuery({ queryKey: ['plans'], queryFn: () => api.getPlans() });
export const usePackages = () => useQuery({ queryKey: ['packages'], queryFn: () => api.getCoinPackages() });
export const usePayments = (enabled = true) => useQuery({ queryKey: ['payments'], queryFn: () => api.getPayments(), enabled });
export const useTrialUsed = () => useQuery({ queryKey: ['trial'], queryFn: () => api.hasUsedTrial() });
export const useAdEligibility = () => useQuery({ queryKey: ['ad'], queryFn: () => api.getAdEligibility() });
export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: async () => api.settings() });

/**
 * Mutação padrão: depois de qualquer escrita, revalida todas as leituras.
 * Com dados locais isso custa quase nada e garante que saldo, acesso e listas nunca fiquem velhos.
 */
export function useAction<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>, opts: { success?: string | ((r: TResult) => string); silentError?: boolean } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: r => {
      qc.invalidateQueries();
      const msg = typeof opts.success === 'function' ? opts.success(r) : opts.success;
      if (msg) toast.success(msg);
    },
    onError: (err: Error) => {
      if (!opts.silentError) toast.error(err.message);
    }
  });
}

/** Troca de conta: apaga todo o cache para nada da conta anterior aparecer na próxima. */
export async function resetAllData() {
  // resetQueries volta tudo ao estado inicial e busca de novo o que está na tela
  await queryClient.resetQueries();
}
