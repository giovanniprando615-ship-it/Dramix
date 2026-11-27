/**
 * Testes das regras de moedas, acesso e pagamentos.
 * Rodar: node tests/api.test.js
 */
const assert = require('assert');
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
require('../db/database.js');
require('../api/backend-service.js');
const api = global.dramixAPI;

// Visitante: 0 moedas, ep 1-5 livres, ep 6 exige login
assert.strictEqual(api.getCurrentUser(), null);
assert.strictEqual(api.getCoinBalance(null), 0);
assert.ok(api.validateEpisodeAccess(null, 'ser-01', 5).allowed);
assert.strictEqual(api.validateEpisodeAccess(null, 'ser-01', 6).accessType, 'auth_required');

// Cadastro: 50 moedas; presente diário: +20 = 70; não repete no mesmo dia
let a = api.register({ name: 'Ana', email: 'ana@teste.com', password: '123456' });
assert.strictEqual(a.coins, 50);
api.claimDailyGift(a.id);
assert.strictEqual(api.getCurrentUser().coins, 70);
assert.throws(() => api.claimDailyGift(a.id));
assert.strictEqual(api.getCoinBalance(a.id), 70);

// Logout: nenhuma sessão, saldo exibido 0; login de novo: 70
api.logout();
assert.strictEqual(api.getCurrentUser(), null);
a = api.login({ email: 'ANA@teste.com', password: '123456' });
assert.strictEqual(a.coins, 70);

// Outra conta: começa com 50 próprios, não herda os 70
api.logout();
let b = api.register({ name: 'Bia', emailOrPhone: 'bia@teste.com', password: 'abcdef' });
assert.strictEqual(b.coins, 50);
assert.throws(() => api.register({ name: 'X', email: 'bia@teste.com', password: 'abcdef' }));

// Desbloqueio com moedas: cobra 25 uma vez, segunda chamada não cobra
assert.strictEqual(api.validateEpisodeAccess(b.id, 'ser-01', 6).accessType, 'paywall_required');
let r = api.unlockEpisodeWithCoins(b.id, 'ser-01', 6);
assert.strictEqual(r.balance, 25);
r = api.unlockEpisodeWithCoins(b.id, 'ser-01', 6);
assert.ok(r.alreadyUnlocked);
assert.strictEqual(api.getCoinBalance(b.id), 25);
assert.ok(api.validateEpisodeAccess(b.id, 'ser-01', 6).allowed);
api.unlockEpisodeWithCoins(b.id, 'ser-01', 7);
assert.throws(() => api.unlockEpisodeWithCoins(b.id, 'ser-01', 8), e => e.code === 'INSUFFICIENT_COINS');
assert.strictEqual(api.getCoinBalance(b.id), 0);
// Desbloqueio de Bia não libera para Ana
assert.ok(!api.validateEpisodeAccess(a.id, 'ser-01', 6).allowed);

// Compra de moedas: confirmar 2x credita 1x; restaurar não duplica
const order = api.createCoinOrder(b.id, 'pkg-600', 'pix');
api.confirmPayment(order.transactionId);
assert.ok(api.confirmPayment(order.transactionId).alreadyConfirmed);
assert.strictEqual(api.getCoinBalance(b.id), 720);
assert.strictEqual(api.restorePurchases(b.id).coinsRestored, 0);
assert.strictEqual(api.getCoinBalance(b.id), 720);

// Pacote da série: 3 eps restantes (8,9,10) x 25 = 75, -20% = 60
const q = api.getSeriesBundleQuote(b.id, 'ser-01');
assert.strictEqual(q.lockedCount, 3);
assert.strictEqual(q.price, 60);
api.unlockSeriesWithCoins(b.id, 'ser-01');
assert.strictEqual(api.getCoinBalance(b.id), 660);
assert.ok(api.validateEpisodeAccess(b.id, 'ser-01', 10).allowed);

// Assinatura libera tudo
const sub = api.createCheckoutOrder(a.id, 'plan-weekly', 'pix');
api.confirmPayment(sub.transactionId);
assert.ok(api.validateEpisodeAccess(a.id, 'ser-02', 9).allowed);

// Menor de idade não vê 18+
api.savePreferences(b.id, { ageRange: '13-17', preferredGenres: ['Romance'] });
assert.ok(!api.getVisibleSeries(b.id).some(s => s.content_rating === '18+'));
assert.ok(api.getVisibleSeries(a.id).some(s => s.content_rating === '18+'));

// Owner: usuário comum não acessa; owner cria série com episódios
assert.throws(() => api.getAdminStats(b.id));
const owner = api.login({ email: 'owner@dramix.tv', password: 'owner123' });
const s = api.createSeries(owner.id, { title: 'Teste', poster_url: 'https://x/y.jpg', genres: ['Drama'] });
for (let i = 0; i < 3; i++) api.createEpisode(owner.id, s.id, { video_url: 'https://x/v.mp4', duration_seconds: 60 });
const e2 = api.db.table('episodes').findOne(e => e.series_id === s.id && e.episode_number === 2);
api.deleteEpisode(owner.id, e2.id);
const nums = api.db.table('episodes').find(e => e.series_id === s.id).map(e => e.episode_number).sort();
assert.deepStrictEqual(nums, [1, 2]);

console.log('OK: todos os testes de regras passaram');
