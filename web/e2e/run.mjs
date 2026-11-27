// Teste de ponta a ponta no navegador (Playwright), contra o build de arquivo único.
// Uso: npm run build:single && npm run test:e2e
// Rede externa bloqueada de propósito: imagens e vídeos de exemplo não carregam, o app tem que funcionar mesmo assim.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const URL_ = `file://${ROOT}dist-single/index.html`;
const SHOTS = `${ROOT}e2e/screens`;
mkdirSync(SHOTS, { recursive: true });

let passed = 0;
const ok = (cond, msg) => {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
  passed++;
  console.log(`ok - ${msg}`);
};

const browser = await chromium.launch();
const errors = [];

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, ...opts });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => (d.type() === 'prompt' ? d.accept('EXCLUIR') : d.accept()));
  return page;
}

const page = await newPage();
const coins = async () => (await page.getByTestId('coin-balance').textContent()).trim();
const go = hash => page.evaluate(h => { location.hash = h; }, hash);
const wait = ms => page.waitForTimeout(ms);

async function register(name, email, password) {
  await page.getByRole('tab', { name: 'Criar conta' }).click();
  await page.locator('#auth-name').fill(name);
  await page.locator('#auth-identifier').fill(email);
  await page.locator('#auth-password').fill(password);
  await page.getByTestId('auth-submit').click();
}
async function logout() {
  await page.getByTestId('user-menu').click();
  await page.getByTestId('logout').click();
  await wait(200);
}

try {
  await page.goto(URL_);
  await page.getByTestId('coin-balance').waitFor();
  ok(await coins() === '0', 'visitante vê 0 moedas');
  await wait(400);
  await page.screenshot({ path: `${SHOTS}/01-home.png` });

  await page.getByTestId('home-register').click();
  await register('Ana Souza', 'ana@teste.com', '123456');
  await page.getByTestId('onboarding-save').waitFor();
  ok(await coins() === '50', 'cadastro dá 50 moedas');
  await page.screenshot({ path: `${SHOTS}/02-onboarding.png` });
  await page.getByTestId('onboarding-save').click();
  ok(await page.getByText('Escolha sua faixa etária').isVisible(), 'onboarding exige faixa etária');
  await page.locator('[data-age="25-34"]').click();
  await page.getByRole('button', { name: 'Romance' }).click();
  await page.getByTestId('onboarding-save').click();
  await wait(300);

  await page.getByTestId('claim-gift').click();
  await wait(300);
  ok(await coins() === '70', 'presente diário soma 20 (total 70)');
  ok(await page.getByTestId('claim-gift').count() === 0, 'presente some depois de resgatado');

  await logout();
  ok(await coins() === '0', 'logout zera moedas exibidas');
  await page.getByTestId('login-btn').click();
  await page.locator('#auth-identifier').fill('ana@teste.com');
  await page.locator('#auth-password').fill('errada');
  await page.getByTestId('auth-submit').click();
  ok(await page.getByRole('alert').filter({ hasText: 'incorretos' }).isVisible(), 'senha errada mostra erro');
  await page.locator('#auth-password').fill('123456');
  await page.getByTestId('auth-submit').click();
  await wait(300);
  ok(await coins() === '70', 'login de novo recupera 70');

  await logout();
  await page.getByTestId('login-btn').click();
  await register('Bia', 'bia@teste.com', 'abcdef');
  await page.getByText('Pular por enquanto').click();
  await wait(300);
  ok(await coins() === '50', 'outra conta começa com 50 próprios');

  await go('#/series/ser-01');
  await page.locator('[data-ep="6"]').waitFor();
  await page.screenshot({ path: `${SHOTS}/03-serie.png`, fullPage: true });
  await page.locator('[data-ep="6"]').click();
  await page.getByTestId('paywall').waitFor();
  await page.screenshot({ path: `${SHOTS}/04-paywall.png` });
  await page.getByTestId('unlock-coins').click();
  await page.getByTestId('player-video').waitFor();
  ok(true, 'player abre o episódio depois de desbloquear');
  await page.getByTestId('player-close').click();
  await wait(300);
  ok(await coins() === '25', 'desbloqueio cobra 25');
  await page.locator('[data-ep="6"]').click();
  await page.getByTestId('player-video').waitFor();
  ok(await page.getByTestId('paywall').count() === 0, 'episódio 6 não pede pagamento de novo');
  await page.keyboard.press('ArrowDown');
  await page.getByTestId('paywall').waitFor();
  ok(true, 'seta para baixo vai ao episódio 7, que está bloqueado');
  await page.getByTestId('unlock-coins').click();
  await page.getByTestId('player-video').waitFor();
  await page.keyboard.press('ArrowDown');
  await page.getByTestId('buy-coins').waitFor();
  ok(true, 'sem saldo, o episódio 8 oferece comprar moedas');
  await page.getByTestId('buy-coins').click();
  await page.waitForURL(/#\/store/);
  await page.getByText('Você estava no episódio 8').waitFor();
  ok(true, 'loja lembra o episódio de onde veio');

  await page.getByTestId('pkg-pkg-600').click();
  await page.getByTestId('checkout-confirm').waitFor();
  await page.screenshot({ path: `${SHOTS}/05-checkout.png` });
  await page.getByRole('tab', { name: 'Cartão de crédito' }).click();
  await page.locator('#cc-number').fill('4111 1111 1111 1112');
  await page.locator('#cc-exp').fill('1230');
  await page.locator('#cc-cvv').fill('123');
  await page.getByTestId('checkout-confirm').click();
  ok(await page.getByText('Confira o número do cartão').isVisible(), 'cartão inválido é recusado (Luhn)');
  await page.locator('#cc-number').fill('4111 1111 1111 1111');
  await page.getByTestId('checkout-confirm').click();
  await page.getByTestId('checkout-confirm').waitFor({ state: 'detached' });
  await wait(300);
  ok(await coins() === '720', 'compra de 720 moedas creditada uma vez');
  await page.screenshot({ path: `${SHOTS}/06-loja.png`, fullPage: true });

  await go('#/discover?q=mafia');
  await page.getByRole('link', { name: 'Pacto com o Mafioso Bilionário' }).waitFor();
  ok(true, 'busca sem acento encontra a série pelo tema "Máfia"');

  await go('#/settings/support');
  await page.getByTestId('support-message').waitFor();
  await page.getByTestId('support-message').fill('Não consigo assistir o episódio 7.');
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  ok(await page.getByText('Mensagem enviada').isVisible(), 'suporte grava chamado');
  await go('#/settings/terms');
  await page.getByTestId('legal').waitFor();
  ok(true, 'termos de uso renderizam');

  await logout();
  await page.getByTestId('login-btn').click();
  await register('<img src=x onerror="window.__xss=1">', 'x@teste.com', 'abcdef');
  await page.getByText('Pular por enquanto').click();
  await go('#/profile');
  await page.getByRole('button', { name: 'Editar perfil' }).waitFor();
  ok(!(await page.evaluate(() => window.__xss)), 'nome com HTML não executa script (XSS)');

  await go('#/owner');
  await page.getByText('Acesso restrito').waitFor();
  ok(true, 'usuário comum não entra no painel');
  await logout();
  await page.getByTestId('login-btn').click();
  await page.locator('#auth-identifier').fill('owner@dramix.tv');
  await page.locator('#auth-password').fill('owner123');
  await page.getByTestId('auth-submit').click();
  await wait(300);
  await go('#/owner');
  await page.getByText('Receita dos últimos 14 dias').waitFor();
  await wait(500);
  await page.screenshot({ path: `${SHOTS}/07-owner.png`, fullPage: true });
  await page.getByRole('tab', { name: 'Catálogo' }).click();
  await page.locator('#ns-title').fill('Série Nova');
  await page.locator('#ns-genres').fill('Drama');
  await page.locator('#ns-poster').fill('https://exemplo.com/capa.jpg');
  await page.getByRole('button', { name: 'Publicar' }).click();
  await page.getByRole('button', { name: 'Adicionar' }).waitFor();
  ok(await page.getByText('Série Nova').first().isVisible(), 'owner publica série');

  const mobile = await newPage({ ...devices['iPhone 13'] });
  await mobile.goto(URL_);
  await mobile.getByTestId('coin-balance').waitFor();
  ok(await mobile.getByRole('navigation', { name: 'Navegação' }).isVisible(), 'barra inferior no celular');
  ok(!(await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'sem rolagem horizontal no celular');
  await mobile.waitForTimeout(400);
  await mobile.screenshot({ path: `${SHOTS}/08-mobile-home.png` });
  await mobile.getByRole('link', { name: 'Para você' }).click();
  await mobile.waitForTimeout(400);
  await mobile.screenshot({ path: `${SHOTS}/09-mobile-feed.png` });
  await mobile.evaluate(() => { location.hash = '#/series/ser-02'; });
  await mobile.locator('[data-ep="1"]').click();
  await mobile.getByTestId('player-video').waitFor();
  await mobile.waitForTimeout(400);
  await mobile.screenshot({ path: `${SHOTS}/10-mobile-player.png` });
  ok(true, 'player abre no celular');

  ok(errors.length === 0, `sem erros de JavaScript${errors.length ? ': ' + errors.join(' | ') : ''}`);
  console.log(`\nE2E OK: ${passed} verificações`);
} catch (err) {
  await page.screenshot({ path: `${SHOTS}/falha.png` }).catch(() => {});
  console.error(err.message);
  if (errors.length) console.error('Erros JS:', errors.join(' | '));
  process.exitCode = 1;
} finally {
  await browser.close();
}
