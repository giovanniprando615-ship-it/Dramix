import { beforeEach, describe, expect, it } from 'vitest';
import { DramixService } from './dramix-service';
import { memoryStorage } from './local-store';

let clock: Date;
let api: DramixService;

beforeEach(() => {
  clock = new Date('2026-11-27T12:00:00');
  api = new DramixService(memoryStorage(), () => clock);
});

const register = (email: string) => api.register({ name: 'Teste', identifier: email, password: '123456' });

describe('moedas e sessão', () => {
  it('visitante tem 0, cadastro dá 50, presente dá 20, logout zera e login recupera', async () => {
    expect(await api.getSession()).toBeNull();
    expect((await register('ana@teste.com')).coins).toBe(50);
    await api.claimDailyGift();
    expect((await api.getSession())!.coins).toBe(70);
    await expect(api.claimDailyGift()).rejects.toMatchObject({ code: 'ALREADY_CLAIMED' });

    await api.logout();
    expect(await api.getSession()).toBeNull();
    expect((await api.login({ identifier: 'ANA@teste.com', password: '123456' })).coins).toBe(70);
  });

  it('presente volta no dia seguinte', async () => {
    await register('ana@teste.com');
    await api.claimDailyGift();
    clock = new Date('2026-11-28T00:05:00');
    await api.claimDailyGift();
    expect((await api.getSession())!.coins).toBe(90);
  });

  it('cada conta tem saldo próprio e o e-mail não repete', async () => {
    await register('ana@teste.com');
    await api.claimDailyGift();
    await api.logout();
    expect((await register('bia@teste.com')).coins).toBe(50);
    await api.logout();
    await expect(register('bia@teste.com')).rejects.toMatchObject({ code: 'DUPLICATE' });
  });
});

describe('acesso aos episódios', () => {
  it('1 a 5 grátis para visitante, 6 pede login', async () => {
    expect((await api.getEpisodePlayback('ser-01', 5)).access.accessType).toBe('free');
    expect((await api.getEpisodePlayback('ser-01', 6)).access.accessType).toBe('auth_required');
  });

  it('desbloqueio cobra uma vez só e não vaza para outra conta', async () => {
    await register('bia@teste.com');
    const first = await api.unlockEpisode('ser-01', 6);
    expect(first).toMatchObject({ spent: 25, balance: 25, alreadyUnlocked: false });
    expect(await api.unlockEpisode('ser-01', 6)).toMatchObject({ alreadyUnlocked: true, balance: 25 });
    await api.unlockEpisode('ser-01', 7);
    await expect(api.unlockEpisode('ser-01', 8)).rejects.toMatchObject({ code: 'INSUFFICIENT_COINS', meta: { missing: 25 } });

    await api.logout();
    await register('ana@teste.com');
    expect((await api.getEpisodePlayback('ser-01', 6)).access.accessType).toBe('paywall');
  });

  it('pacote da série cobra o restante com 20% de desconto', async () => {
    await register('bia@teste.com');
    const tx = await api.createOrder('coins', 'pkg-150', 'pix');
    await api.confirmPayment(tx.transactionId);
    const details = await api.getSeries('ser-01');
    expect(details.bundle).toMatchObject({ lockedCount: 5, fullPrice: 125, price: 100 });
    expect(await api.unlockSeries('ser-01')).toMatchObject({ unlocked: 5, spent: 100, balance: 100 });
    expect((await api.getEpisodePlayback('ser-01', 10)).access.allowed).toBe(true);
  });

  it('anúncio libera 1 episódio a cada 24 h', async () => {
    await register('bia@teste.com');
    await api.unlockWithAd('ser-02', 6);
    expect((await api.getEpisodePlayback('ser-02', 6)).access.accessType).toBe('unlocked');
    await expect(api.unlockWithAd('ser-02', 7)).rejects.toMatchObject({ code: 'AD_COOLDOWN' });
    clock = new Date(clock.getTime() + 24 * 3_600_000);
    await api.unlockWithAd('ser-02', 7);
  });

  it('Premium libera tudo; teste grátis só uma vez', async () => {
    await register('ana@teste.com');
    await api.startTrial();
    expect((await api.getEpisodePlayback('ser-03', 9)).access.accessType).toBe('premium');
    clock = new Date(clock.getTime() + 4 * 86_400_000);
    expect((await api.getEpisodePlayback('ser-03', 9)).access.allowed).toBe(false);
    await expect(api.startTrial()).rejects.toMatchObject({ code: 'TRIAL_USED' });
  });
});

describe('pagamentos', () => {
  it('confirmar duas vezes credita uma vez; restaurar não duplica', async () => {
    await register('bia@teste.com');
    const order = await api.createOrder('coins', 'pkg-600', 'pix');
    await api.confirmPayment(order.transactionId);
    expect((await api.confirmPayment(order.transactionId)).alreadyConfirmed).toBe(true);
    expect((await api.getSession())!.coins).toBe(770);
    expect((await api.restorePurchases()).coinsRestored).toBe(0);
    expect((await api.getSession())!.coins).toBe(770);
  });

  it('não confirma pagamento de outra conta', async () => {
    await register('ana@teste.com');
    const order = await api.createOrder('subscription', 'plan-monthly', 'pix');
    await api.logout();
    await register('bia@teste.com');
    await expect(api.confirmPayment(order.transactionId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('catálogo e administração', () => {
  it('menor de idade não vê 18+', async () => {
    await register('jovem@teste.com');
    await api.savePreferences({ ageRange: '13-17', genres: ['Romance'] });
    const { series } = await api.getCatalog();
    expect(series.some(s => s.content_rating === '18+')).toBe(false);
    await expect(api.getSeries('ser-06')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('usuário comum não acessa o painel; owner renumera episódios ao excluir', async () => {
    await register('bia@teste.com');
    await expect(api.getAdminStats()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await api.logout();
    await api.login({ identifier: 'owner@dramix.tv', password: 'owner123' });
    const s = await api.adminCreateSeries({ title: 'Nova', synopsis: '', poster_url: 'https://x/y.jpg', genres: ['Drama'], content_rating: '14+' });
    for (let i = 0; i < 3; i++) await api.adminAddEpisode(s.id, { title: '', video_url: 'https://x/v.mp4', duration_seconds: 60 });
    const eps = await api.adminListEpisodes(s.id);
    await api.adminDeleteEpisode(eps[1].id);
    expect((await api.adminListEpisodes(s.id)).map(e => e.episode_number)).toEqual([1, 2]);
  });
});
