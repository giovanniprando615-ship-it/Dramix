# DRAMIX — Plataforma Profissional de Streaming de Minisséries Verticais

Redesign completo e implementação da plataforma de streaming vertical **DRAMIX**, inspirada na estética cinematográfica e minimalista do **VibeShort** e grandes plataformas de streaming.

---

## 📁 Estrutura da Arquitetura

```
dramix/
├── index.html                     # Interface principal cinematográfica (Tailwind CSS Dark Cinema)
├── server.ps1                     # Servidor HTTP e API REST em PowerShell (Porta 8080)
├── README.md                      # Documentação técnica e guia de testes
│
├── db/
│   └── database.js                # Banco de dados relacional de 14 tabelas com persistência ACID local
│
├── api/
│   └── backend-service.js         # Backend de autenticação, paywall, anúncios de 24h e assinaturas
│
├── components/
│   ├── player.js                  # Player vertical 9:16 profissional (histórico, retomada e paywall)
│   ├── rewarded-ad-modal.js       # Player de anúncio recompensado (15s não pulável, bloqueio diário de 24h)
│   └── checkout-modal.js          # Checkout PIX e Cartão de Crédito com confirmação real de pagamento
│
└── views/
    ├── home.js                    # Página Inicial: Hero configurável pelo Owner, fileiras horizontais com setas
    ├── discover.js                # Página Descobrir: busca multi-campo, filtros por gênero e classificação indicativa
    ├── series-details.js          # Página da Minissérie: ficha técnica, episódios 1-5 grátis e 6+ Premium com cadeado
    ├── subscription.js            # Planos Premium: R$ 7,90 (semanal), R$ 29,90 (mensal), R$ 199,90 (anual)
    ├── profile.js                 # Perfil do Usuário: cancelamento de assinatura, histórico e Minha Lista
    └── owner-panel.js             # Painel Owner: métricas, preços, CRUD de minisséries/episódios e layout
```

---

## 🎨 1. Identidade Visual (VibeShort Reference)

- **Fundo Cinematográfico:** Predominantemente preto e azul-marinho profundo (`#060810` / `#0A0D18`).
- **Tipografia & Estilo:** Minimalista, cantos discretamente arredondados, moderna e de alta legibilidade.
- **Elementos Removidos:**
  - ❌ Sem emojis de coração para romance.
  - ❌ Sem emojis nas categorias ou gêneros.
  - ❌ Sem etiquetas genéricas como "99% compatível" ou poluição de badges coloridas.
  - ❌ Sem repetição de capas e imagens.
- **Responsividade Total:** Computador (com setas laterais de navegação), tablet e smartphone (com deslize por toque).

---

## 🎬 2. Catálogo e Página Inicial

- **Destaque Principal da Home (Hero Banner):**
  - Minissérie selecionada e configurada pelo Owner no Painel Administrativo.
  - Imagem cinematográfica, título, sinopse, gêneros e classificação indicativa.
  - Botões *"Assistir"* e *"Ver detalhes"*.
- **Fileiras Horizontais (com setas de avançar/voltar e suporte a swipe):**
  1. *Continue assistindo* (com barra de progresso em tempo real)
  2. *Recomendado para você* (baseado no histórico e favoritos)
  3. *Lançamentos*
  4. *Mais populares*
  5. *Romances*
  6. *Drama e vingança*
  7. *Ação e suspense*
  8. *Fantasia*
- **Cards Verticais 9:16:** Pôster cinematográfico, título, classificação e quantidade de episódios.

---

## 🔒 3. Regras Reais de Monetização & Paywall

### Episódios Gratuitos
- Os primeiros **5 episódios** (Ep 1, 2, 3, 4 e 5) são **100% gratuitos** por padrão e **nunca são bloqueados**.
- O Owner pode modificar a quantidade de episódios gratuitos por produção no Painel Administrativo.

### Episódio 6 em Diante (Bloqueio Paywall)
Ao tentar reproduzir a partir do episódio 6 sem assinatura ativa:
1. O player é pausado imediatamente.
2. O backend valida a permissão e emite bloqueio paywall.
3. Abre-se o modal oferecendo duas opções reais:
   - **Desbloquear 1 episódio com anúncio recompensado** (1 a cada 24 horas).
   - **Assinar DRAMIX Premium**.

### Anúncios Recompensados (Limite Rígido de 24 Horas)
- Usuários gratuitos podem desbloquear no máximo **1 episódio a cada 24 horas**.
- O anúncio possui **15 segundos de contagem regressiva não pulável**.
- Se o usuário fechar o anúncio antes do término, **o episódio não é liberado**.
- Quando o limite de 24 horas já foi atingido, o sistema bloqueia e exibe:
  > *"Você já utilizou seu desbloqueio gratuito de hoje.*  
  > *Assine o DRAMIX Premium para continuar assistindo a todas as histórias sem limites."*
  Mostrando um contador exato de horas, minutos e segundos até o próximo desbloqueio.
- O desbloqueio é gravado no banco de dados na tabela `rewarded_ad_unlocks` e `episode_unlocks` por conta de usuário.

---

## 👑 4. Planos de Assinatura DRAMIX Premium

Preços obrigatórios implementados e configuráveis pelo Owner:

| Plano | Duração | Preço | Destaque Visual |
| :--- | :--- | :--- | :--- |
| **Plano Semanal** | 7 dias | **R$ 7,90** | Perfeito para maratonar |
| **Plano Mensal** | 30 dias | **R$ 29,90** | Popular (~R$ 0,99/dia) |
| **Plano Anual** | 12 meses | **R$ 199,90** | **Melhor Custo-Benefício** (Economia de 44% vs 12x mensal R$ 358,80) |

- **Checkout Real:** Suporte a **PIX** (com QR Code e Copia e Cola) e **Cartão de Crédito**.
- **Confirmação Real no Backend:** A assinatura só é ativada após a confirmação do pagamento, gravando a transação na tabela `payments` e gerando o registro na tabela `subscriptions` com data de expiração calculada.
- **Benefícios Premium:**
  - Acesso ilimitado e imediato a todos os episódios (sem travas a partir do ep. 6).
  - Eliminação de anúncios obrigatórios.
  - Badge Premium no perfil.
  - Gestão de cancelamento de renovação automática no perfil do usuário.

---

## 🛠️ 5. Painel Owner (Administrativo)

Acesso restrito exclusivo para a conta com `role: 'owner'`:
- **Dashboard de Métricas:** Assinantes ativos, usuários gratuitos, receita acumulada (R$), visualizações e desbloqueios de anúncios.
- **Monetização:** Edição dos preços semanal, mensal e anual em tempo real.
- **Minisséries:** Publicação de novas minisséries (título, sinopse, capa vertical 9:16, banner horizontal, gêneros, classificação e episódios gratuitos padrão).
- **Episódios:** Adição de episódios com título, vídeo e duração.
- **Home:** Definição da produção que ocupa o Hero Banner de destaque e reordenação das fileiras horizontais.

---

## 🗄️ 6. Banco de Dados Relacional (14 Tabelas)

1. `users` (id, email, password_hash, name, role, created_at)
2. `user_profiles` (user_id, avatar, preferred_genres)
3. `series` (id, title, synopsis, poster_url, backdrop_url, trailer_url, genres, content_rating, free_episodes_count, is_featured, is_published, views_count)
4. `episodes` (id, series_id, episode_number, title, video_url, duration_seconds, is_free)
5. `genres` (id, name, slug)
6. `categories` (id, name, slug, order)
7. `subscriptions` (id, user_id, plan_id, status, start_date, end_date, auto_renew, transaction_id)
8. `subscription_plans` (id, name, price, duration_days, billing_period, is_active)
9. `payments` (id, user_id, plan_id, amount, status, method, created_at)
10. `episode_unlocks` (id, user_id, series_id, episode_id, unlock_type, unlocked_at)
11. `rewarded_ad_unlocks` (id, user_id, episode_id, ad_token, completed, unlocked_at)
12. `watch_history` (id, user_id, series_id, episode_id, progress_seconds, duration_seconds, completed)
13. `favorites` (id, user_id, series_id)
14. `homepage_sections` (id, title, row_type, filter_key, order, is_enabled)

---

## 🧪 7. Guia de Testes dos 20 Itens Obrigatórios

| # | Teste | Como Testar | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| 1 | **Cadastro de novo usuário** | Clique em "Entrar" -> aba "Criar Conta" -> preencha nome, email e senha. | Usuário criado no banco e logado com role 'user'. |
| 2 | **Login** | Clique em "Entrar" -> informe email e senha (ou use atalho "Usuário Gratuito"). | Sessão iniciada e nome exibido no cabeçalho. |
| 3 | **Carregamento da página inicial** | Abra a Home. | Carrega Hero Banner e todas as fileiras cinematográficas. |
| 4 | **Catálogo horizontal** | Passe o mouse sobre qualquer fileira e clique nas setas `<` e `>` (ou arraste). | Deslocamento horizontal suave dos cards. |
| 5 | **Busca de minisséries** | Vá em "Descobrir" e digite "Contrato" ou "Bilionário". | Filtra em tempo real por título, gênero e sinopse. |
| 6 | **Página de detalhes** | Clique em qualquer card de minissérie. | Exibe pôster 9:16, sinopse, classificação e lista de episódios. |
| 7 | **Reprodução dos episódios gratuitos** | Clique no Episódio 1, 2, 3, 4 ou 5. | O player vertical 9:16 abre e inicia o vídeo normalmente. |
| 8 | **Bloqueio após o quinto episódio** | Clique no Episódio 6 com usuário gratuito. | O player bloqueia o vídeo e abre o modal de Paywall. |
| 9 | **Desbloqueio com anúncio** | No modal de Paywall, clique em "Assistir anúncio recompensado". | Exibe player de 15s com barra e, ao finalizar, libera o episódio. |
| 10 | **Limite de 1 anúncio a cada 24h** | Tente desbloquear o Episódio 7 com anúncio no mesmo dia. | Mensagem de bloqueio de 24h com contador regressivo ativo. |
| 11 | **Plano Semanal R$ 7,90** | Vá na aba "Planos" -> Card Semanal. | Exibe R$ 7,90 por 7 dias. |
| 12 | **Plano Mensal R$ 29,90** | Aba "Planos" -> Card Mensal. | Exibe R$ 29,90 por 30 dias. |
| 13 | **Plano Anual R$ 199,90** | Aba "Planos" -> Card Anual. | Exibe R$ 199,90 por 12 meses com economia destacada (44%). |
| 14 | **Ativação Premium após pagamento** | Selecione qualquer plano -> clique em "Confirmar Pagamento". | Pagamento confirmado no banco e badge PREMIUM ativado. |
| 15 | **Cancelamento de renovação** | Vá em "Meu Perfil" -> "Cancelar Renovação". | Auto-renovação desativada, acesso mantido até expiração. |
| 16 | **Expiração de assinatura** | Verificado no backend quando `end_date < now()`. | Retorno automático para a categoria de usuário gratuito. |
| 17 | **Acesso Premium completo** | Com conta Premium ativa, clique no Episódio 6, 7, 8, etc. | Todos os episódios reproduzem direto sem anúncios ou bloqueios. |
| 18 | **Painel Owner** | Entre com a conta `owner@dramix.tv` (senha `owner123`). | Botão "Painel Owner" acessível com dashboard de métricas. |
| 19 | **Publicação de minissérie** | No Painel Owner -> aba "Minisséries" -> preencha e publique. | Produção gravada com sucesso no banco de dados. |
| 20 | **Aparição automática no catálogo** | Volte para a Home ou aba "Descobrir". | A nova produção aparece automaticamente nas fileiras e filtros. |

---

## 🚀 Como Executar

### Opção 1: Diretamente no Navegador
Dê um duplo clique no arquivo [`index.html`](file:///C:/Users/55119/.gemini/antigravity/scratch/dramix/index.html) ou abra pelo caminho:
```text
C:\Users\55119\.gemini\antigravity\scratch\dramix\index.html
```

### Opção 2: Servidor Local PowerShell (Porta 8080)
Execute no PowerShell dentro da pasta do projeto:
```powershell
cd C:\Users\55119\.gemini\antigravity\scratch\dramix
powershell -ExecutionPolicy Bypass -File server.ps1
```
Acesse: `http://127.0.0.1:8080`
