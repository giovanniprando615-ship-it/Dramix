# DRAMIX Web 2.0

App de minisséries verticais em React + TypeScript, pronto para virar produto: moedas, loja, Premium,
player vertical com deslize entre episódios, feed "Para você", Painel Owner com gráficos e banco Supabase
com as regras de dinheiro no servidor.

## Rodar

Precisa do [Node.js 22](https://nodejs.org).

```bash
cd web
npm install
npm run dev
```

Abra o endereço que aparecer (normalmente `http://localhost:5173`). No celular, na mesma rede Wi-Fi:

```bash
npm run dev -- --host
```

**Arquivo único para testar sem instalar nada:** `npm run build:single` gera `dist-single/index.html`.
Dê duplo clique nele e o app abre no navegador.

**Conta de administração (só nos dados de exemplo):** `owner@dramix.tv` / `owner123`.

## Testes

| Comando | O que testa |
| :--- | :--- |
| `npm run typecheck` | Tipos do TypeScript em todo o código |
| `npm test` | 12 testes das regras: moedas, presente diário, desbloqueio, pacote, anúncio, Premium, pagamentos, 18+, Owner |
| `npm run build:single && npm run test:e2e` | 27 verificações no navegador (computador e celular), incluindo XSS e cobrança dupla |
| `bash supabase/tests/run.sh` | 29 testes das migrations num Postgres local: regras e permissões (RLS) |

O GitHub Actions (`.github/workflows/web.yml`) roda tudo isso a cada push.

## Tecnologias

| Para quê | Biblioteca |
| :--- | :--- |
| Base | React 18, TypeScript (strict), Vite |
| Visual | Tailwind CSS compilado, fonte Plus Jakarta Sans embutida, ícones Lucide |
| Rotas | React Router (rotas por `#/`, funciona em qualquer hospedagem estática) |
| Dados e cache | TanStack Query (carregamento, erro e atualização automática do saldo) |
| Estado da tela | Zustand (player, janelas, retorno ao episódio depois da compra) |
| Acessibilidade | Radix UI (janelas e menus com foco preso, Esc e leitor de tela) |
| Formulários | react-hook-form + Zod (validação campo a campo) |
| Animação | Framer Motion (troca de episódio e destaque), respeitando "reduzir movimento" |
| Vídeo | hls.js para streaming adaptativo (.m3u8), baixado só quando o vídeo é HLS |
| Gráficos | Recharts (Painel Owner, baixado só por quem é Owner) |
| Avisos | Sonner |
| App instalável | vite-plugin-pwa (ícone na tela inicial, abre em tela cheia) |
| Testes | Vitest, Playwright, Postgres |

## Estrutura

```
web/
├── src/
│   ├── domain/          types.ts (modelo de dados) e seed.ts (catálogo de exemplo)
│   ├── services/        dramix-service.ts (todas as regras) + testes; local-store.ts (dados locais)
│   ├── lib/             api (ponto único de acesso), queries (TanStack Query), utils
│   ├── store/ui.ts      estado global da interface (Zustand)
│   ├── components/      ui/ (botão, janela, campo...), catalog/ (card, fileira, Top 10, destaque), layout/
│   ├── features/        auth/ (login, onboarding), checkout/, player/ (player, paywall, vídeo HLS)
│   └── pages/           Home, Feed, Discover, SeriesPage, Store, Plans, Library, Profile, Settings, Owner
├── supabase/
│   ├── migrations/      0001 tabelas + RLS, 0002 funções de moedas e pagamento, 0003 dados iniciais
│   └── tests/           teste das migrations em Postgres
└── e2e/run.mjs          teste de ponta a ponta (Playwright)
```

## Como ligar no Supabase

O app hoje roda com `LocalStore` (dados no navegador). As regras são as mesmas do banco.

1. Crie o projeto no Supabase e rode as 3 migrations no SQL Editor, em ordem.
2. Torne sua conta Owner (comando no fim de `0003_seed.sql`).
3. Crie um bucket privado `episodes` no Storage para os vídeos.
4. Escreva um `SupabaseService` com os mesmos métodos de `DramixService`, chamando:
   - `supabase.auth.signUp / signInWithPassword / signOut` para conta;
   - `supabase.from('series' | 'episodes' | ...)` para leituras (a RLS já filtra);
   - `supabase.rpc('claim_daily_gift' | 'unlock_episode' | 'unlock_series' | 'create_order' | 'start_trial' | 'cancel_renewal' | 'restore_purchases' | 'my_balance')` para dinheiro.
5. Troque a linha em `src/lib/api.ts`. Nenhuma tela muda.
6. Pagamento: o webhook do gateway (Edge Function com a `service_role`) chama `confirm_payment`.
   Anúncio: a verificação server-side da rede de anúncios chama `grant_ad_unlock`.
   Vídeo: uma Edge Function checa `has_episode_access` e devolve a URL assinada do Storage.

## O que é simulado

- **Pagamento:** o botão "Confirmar" simula a aprovação, com aviso "Modo de teste" na tela.
- **Anúncio recompensado:** vídeo de exemplo, sem rede de anúncios.
- **Recuperar senha:** mostra a confirmação, mas não envia e-mail (no Supabase é `resetPasswordForEmail`).
- **Vídeos e imagens:** amostras públicas do Google e do Unsplash.
- **Textos legais:** modelo com campos `[ENTRE COLCHETES]` para preencher e revisar com advogado.
