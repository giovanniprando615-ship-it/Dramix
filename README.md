# DRAMIX — Minisséries em episódios curtos

Plataforma de streaming de minisséries verticais (romance, drama, ação, suspense) com episódios curtos,
moedas virtuais, loja, assinatura Premium e painel administrativo.

> **Estado atual: protótipo funcional de front-end.** Todas as regras rodam no navegador e os dados ficam
> no `localStorage`. Serve para validar telas, fluxos e regras de negócio. **Não serve para cobrar
> usuários reais**: qualquer pessoa consegue alterar o `localStorage` pelo console. Veja
> [Caminho para produção](#caminho-para-produção).

---

## Como executar

Abra `index.html` no navegador (duplo clique) ou rode o servidor local:

```powershell
powershell -ExecutionPolicy Bypass -File server.ps1
```

Acesse `http://127.0.0.1:8080`.

**Conta administrativa de desenvolvimento:** `owner@dramix.tv` / `owner123`. Essa conta existe só nos dados de
exemplo (`db/database.js`) e não aparece em nenhum botão da interface. Troque antes de publicar.

Para recomeçar do zero, apague o item `dramix_database_v4` do `localStorage` (DevTools > Application).

## Testes

```bash
node tests/api.test.js
```

Cobre as regras de dinheiro e acesso: 0 moedas para visitante, 50 no cadastro, +20 no presente diário (70),
logout sem sessão, contas separadas, desbloqueio cobrado uma vez só, compra creditada uma vez só,
restauração sem duplicar, pacote da série com desconto, Premium, filtro 18+ e permissões do Owner.

---

## Regras de negócio

| Regra | Valor padrão | Onde muda |
| :--- | :--- | :--- |
| Episódios grátis por série | 1 a 5 | Painel Owner > Minisséries (por série) e Moedas e loja (padrão) |
| Bônus de cadastro | 50 moedas, uma vez por conta | Painel Owner > Moedas e loja |
| Presente diário | 20 moedas, 1 resgate por dia | Painel Owner > Moedas e loja |
| Preço por episódio | 25 moedas | Painel Owner > Moedas e loja |
| Pacote "desbloquear o resto da série" | 20% de desconto | Painel Owner > Moedas e loja |
| Anúncio recompensado | 1 episódio a cada 24 h | Painel Owner > Moedas e loja |
| Premium | Libera tudo enquanto ativo | Painel Owner > Planos |

**Comportamento das moedas**

- Visitante vê **0 moedas**. Logout remove a sessão e a tela volta a 0.
- Cada conta tem saldo próprio, calculado a partir do extrato (`coin_transactions`).
- Cada lançamento tem uma referência única (`welcome_bonus`, `daily_gift:AAAA-MM-DD`, `unlock:<episódio>`,
  `payment:<transação>`). Repetir a mesma operação não credita nem cobra de novo.
- Episódio desbloqueado fica liberado para sempre na conta.

**Loja de moedas (sugestão inicial)**

| Pacote | Moedas | Bônus | Total | ≈ episódios |
| :--- | ---: | ---: | ---: | ---: |
| R$ 4,90 | 150 | 0 | 150 | 6 |
| R$ 9,90 | 300 | 30 | 330 | 13 |
| R$ 19,90 (mais escolhido) | 600 | 120 | 720 | 28 |
| R$ 39,90 | 1.200 | 360 | 1.560 | 62 |
| R$ 79,90 (melhor valor) | 2.400 | 960 | 3.360 | 134 |

**Planos Premium:** semanal R$ 7,90, mensal R$ 29,90, anual R$ 199,90, teste grátis de 3 dias (uma vez por conta).

---

## Estrutura

```
dramix/
├── index.html                  Página única: cabeçalho, conteúdo, rodapé e carregamento dos scripts
├── app.js                      Roteador (#/rota), cabeçalho, barra inferior no celular, login/cadastro, logout
├── server.ps1                  Servidor estático local (porta 8080)
├── db/database.js              "Banco" em localStorage + dados de exemplo (séries, planos, pacotes, regras)
├── api/backend-service.js      Todas as regras: contas, moedas, acesso, pagamentos, Owner
├── components/
│   ├── ui.js                   esc() contra XSS, safeUrl(), toast(), brl(), ícone de moeda
│   ├── player.js               Player vertical 9:16 com autoplay, progresso e lista de episódios
│   ├── rewarded-ad-modal.js    Paywall: moedas, pacote da série, anúncio diário, Premium
│   ├── checkout-modal.js       Checkout PIX/cartão para planos e pacotes de moedas (modo de teste)
│   └── onboarding-modal.js     Faixa etária e gêneros favoritos no primeiro acesso
├── views/
│   ├── home.js                 Destaque, continue assistindo, presente diário, temas, fileiras
│   ├── discover.js             Busca por título/gênero/tema/sinopse, filtros e ordenação
│   ├── series-details.js       Ficha, episódios grátis/desbloqueados/bloqueados, pacote, compartilhar
│   ├── store.js                Carteira, presente diário, pacotes, extrato, restaurar compras
│   ├── subscription.js         Planos, teste grátis, condições
│   ├── profile.js              Assinatura, carteira, Minha Lista, histórico, editar perfil
│   ├── settings.js             Conta, idioma, restaurar compras, suporte, termos, privacidade, política
│   └── owner-panel.js          Métricas, planos, regras de moedas, pacotes, séries, episódios, Home, suporte
├── tests/api.test.js           Testes das regras (Node)
└── _legacy/                    Módulos antigos que não eram carregados pelo index.html (guardados para consulta)
```

### Rotas

`#/` início • `#/discover?q=...` • `#/series/<id>` • `#/store` • `#/plans` • `#/profile[/favorites|wallet|history]`
• `#/settings[/account|language|restore|support|terms|privacy|subscription-policy]` • `#/owner`

---

## O que é simulado hoje

| Item | Situação | O que falta |
| :--- | :--- | :--- |
| Login e senhas | Local, senha sem criptografia | Supabase Auth |
| Login com Facebook/Google | Não incluído | Provedor OAuth no Supabase Auth + app no Facebook Developers |
| Recuperar senha | Mostra confirmação, não envia e-mail | `resetPasswordForEmail` do Supabase |
| Pagamento PIX/cartão | Botão "Confirmar" simula aprovação (aviso visível na tela) | Gateway (Mercado Pago, Pagar.me ou Stripe) + webhook no servidor |
| Anúncio recompensado | Vídeo de exemplo, sem rede de anúncios | Google AdMob / AdSense for Games com verificação no servidor (SSV) |
| Idiomas | Só português; inglês e espanhol marcados como "em breve" | Arquivos de tradução e catálogo legendado |
| Vídeos | MP4 de exemplo do Google | Hospedagem com streaming adaptativo (Cloudflare Stream, Mux ou Bunny) |
| Textos legais | Modelo baseado em CDC e LGPD com campos `[ENTRE COLCHETES]` | Preencher dados da empresa e revisão jurídica |

## Caminho para produção

1. **Supabase**: criar as tabelas com os mesmos nomes de `db/database.js` e ativar RLS (cada usuário só lê e escreve as próprias linhas).
2. **Moedas no servidor**: `claim_daily_gift`, `unlock_episode`, `unlock_series` e `confirm_payment` viram funções RPC
   (`security definer`) com `unique (user_id, ref)` em `coin_transactions`. O navegador nunca grava saldo.
3. **Pagamentos**: o webhook do gateway chama `confirm_payment`. A tela só acompanha o status.
4. **Vídeos protegidos**: episódios bloqueados servidos por URL assinada e com validade curta, gerada só depois da checagem de acesso.
5. **Tailwind compilado**: trocar a tag da CDN pelo CSS gerado no build.
