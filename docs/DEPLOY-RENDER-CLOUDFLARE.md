# Deploy manual no Render e Cloudflare

Este guia prepara a publicação do Rotula Fácil Pro sem colocar segredos no Git. A criação dos serviços, os domínios e o DNS devem ser feitos manualmente.

## 1. Arquitetura final

- Frontend Next.js: `https://rotulafacilpro.com.br`
- API Fastify: `https://api.rotulafacilpro.com.br`
- Banco: PostgreSQL existente no Neon
- Hospedagem: dois Web Services no Render
- DNS e domínio: Cloudflare

O frontend acessa hoje o Neon diretamente pelo Prisma no servidor. A API atual expõe `/health`, mas o frontend ainda não consome `NEXT_PUBLIC_API_URL`.

## 2. Pré-requisitos

Antes de começar:

1. Enviar para o repositório remoto um commit aprovado contendo esta preparação.
2. Ter acesso ao repositório no Render.
3. Ter a connection string do Neon guardada fora do Git.
4. Gerar um `AUTH_SECRET` longo e aleatório, também fora do Git.
5. Ter o domínio `rotulafacilpro.com.br` ativo no Cloudflare.
6. Usar `NODE_VERSION=24.18.0` (versão utilizada na validação local) e pnpm 11.9.0. O projeto aceita Node 22.12+ e Node 24, com limite por versão principal.

Não envie `.env`, senhas, tokens, connection strings ou chaves para o Git.

## 3. Frontend no Render

No painel do Render, escolha **New > Web Service**, conecte o repositório e preencha:

| Campo | Valor |
| --- | --- |
| Name | `rotula-facil-pro-web` |
| Language/Runtime | Node |
| Branch | `master` |
| Root Directory | deixar vazio (raiz do monorepo) |
| Build Command | `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm render:build:web` |
| Start Command | `pnpm render:start:web` |
| Health Check Path | `/login` |
| Auto-Deploy | escolher conforme a política do projeto |

O diretório raiz precisa permanecer na raiz do monorepo: `apps/web` depende de `packages/db`, `packages/ui` e do lockfile central.

Escolha a região desejada e uma instância com memória suficiente para build/execução; esses campos dependem da conta e do orçamento. Não crie disco persistente para estes serviços. `--prod=false` mantém TypeScript, Prisma CLI e demais ferramentas necessárias ao build mesmo no ambiente de produção.

O script de start usa `next start --hostname 0.0.0.0`. O Next.js lê automaticamente a variável `PORT` fornecida pelo Render.

### Variáveis do frontend

Cadastre no serviço web:

| Variável | Obrigatória | Conteúdo |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Connection string do Neon; marcar como secreta |
| `AUTH_SECRET` | Sim | Segredo longo, aleatório e exclusivo de produção |
| `AUTH_SESSION_DAYS` | Não | `7`, se quiser manter o padrão atual |
| `PASSWORD_RESET_TOKEN_MINUTES` | Não | `30`, se quiser manter o padrão atual |
| `NODE_ENV` | Automática | O Render/Next define produção; confirmar que resulte em `production` |
| `NODE_VERSION` | Recomendado | `24.18.0` |

`NEXT_PUBLIC_API_URL` existe apenas no exemplo local e não é consumida pelo código atual. Não é necessária para este deploy e não deve ser criada como dependência artificial.

## 4. API no Render

Crie outro **Web Service** ligado ao mesmo repositório:

| Campo | Valor |
| --- | --- |
| Name | `rotula-facil-pro-api` |
| Language/Runtime | Node |
| Branch | `master` |
| Root Directory | deixar vazio (raiz do monorepo) |
| Build Command | `corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm render:build:api` |
| Start Command | `pnpm render:start:api` |
| Health Check Path | `/health` |
| Auto-Deploy | escolher conforme a política do projeto |

A API escuta em `0.0.0.0` e prioriza a variável `PORT` fornecida pelo Render. Para desenvolvimento local, continua aceitando `API_PORT`, cujo padrão é `3333`.

### Variáveis da API

| Variável | Obrigatória | Conteúdo |
| --- | --- | --- |
| `CORS_ORIGIN` | Sim em produção | `https://rotulafacilpro.com.br` |
| `NODE_ENV` | Automática | Confirmar `production` |
| `NODE_VERSION` | Recomendado | `24.18.0` |
| `PORT` | Automática | Não definir manualmente; o Render fornece |
| `API_PORT` | Não | Somente para desenvolvimento fora do Render |

A API atual não acessa o banco e não precisa de `DATABASE_URL`. Se isso mudar no futuro, reavaliar antes de acrescentar a variável.

## 5. Banco, Prisma e migrations

O Prisma Client é usado pelo frontend e precisa ser gerado antes do build do Next.js. Isso já ocorre em `pnpm render:build:web`.

Não use em produção:

- `prisma db push`
- `prisma migrate reset`
- comandos de seed não revisados

As migrations são versionadas em `packages/db/prisma/migrations`. Quando existir migration nova, execute uma única vez, de forma controlada, no Shell do serviço web:

```sh
pnpm prisma:migrate:deploy
```

O comando usa `prisma migrate deploy`, aplica somente migrations pendentes e exige `DATABASE_URL` configurada. Antes e depois, confira o status das migrations e faça backup quando a alteração justificar. Não coloque migration no start normal do serviço.

## 6. CORS

Em produção, defina exatamente:

```text
CORS_ORIGIN=https://rotulafacilpro.com.br
```

Não use `*`. Sem `CORS_ORIGIN`, a API não habilita CORS no modo de produção; em desenvolvimento o fallback continua sendo `http://localhost:3000`. CORS controla o acesso pelo navegador e não substitui autenticação: uma consulta direta a `/health` ainda pode retornar HTTP 200.

Teste no navegador, a partir do domínio do frontend, uma chamada para `https://api.rotulafacilpro.com.br/health`. Uma origem diferente não deve receber autorização CORS.

## 7. Autenticação e cookies

A autenticação é própria e não usa OAuth, NextAuth ou Auth.js. A sessão fica em cookie:

- `HttpOnly`: ativo
- `Secure`: ativo quando `NODE_ENV=production`
- `SameSite`: `lax`
- `Path`: `/`
- `Domain`: não definido, portanto restrito ao host do frontend

Essa configuração é adequada para login em `https://rotulafacilpro.com.br`; não há necessidade atual de compartilhar a sessão com `api.rotulafacilpro.com.br`.

Após configurar o domínio:

1. Abra o site somente por HTTPS.
2. Crie uma sessão ou faça login.
3. Confirme que o cookie `rotula_facil_session` aparece como HttpOnly e Secure.
4. Atualize uma página autenticada e confirme que a sessão continua válida.
5. Saia e confirme que a sessão foi removida.

## 8. Domínios personalizados no Render

Depois que os dois serviços estiverem saudáveis:

1. No serviço web, abra **Settings > Custom Domains** e adicione `rotulafacilpro.com.br`.
2. No serviço da API, adicione `api.rotulafacilpro.com.br`.
3. O Render mostrará os destinos DNS reais. Copie-os exatamente e anote:

```text
FRONTEND_RENDER_TARGET=<fornecido pelo Render>
API_RENDER_TARGET=<fornecido pelo Render>
```

Não invente nem antecipe esses targets.

## 9. DNS no Cloudflare

Use os valores fornecidos pelo Render para criar os registros solicitados por ele. A configuração esperada, sujeita às instruções exibidas pelo Render, é:

| Nome | Destino |
| --- | --- |
| `@` / `rotulafacilpro.com.br` | `FRONTEND_RENDER_TARGET` |
| `api` / `api.rotulafacilpro.com.br` | `API_RENDER_TARGET` |

Copie do Render o tipo de registro, nome e destino exatos. Crie os CNAMEs com proxy **DNS only** durante a validação do domínio e emissão do certificado. Se o Render também adicionar `www`, configure esse registro com o target do frontend. Revise registros conflitantes para esses hosts, incluindo AAAA; preserve registros de e-mail e outros serviços. No Cloudflare, use SSL/TLS **Full**, evitando Flexible. Só considere ativar o proxy depois de os certificados do Render aparecerem válidos. Consulte as [instruções oficiais do Render para Cloudflare](https://render.com/docs/configure-cloudflare-dns).

Depois da propagação:

- confirme `https://rotulafacilpro.com.br` sem alerta de certificado;
- confirme `https://api.rotulafacilpro.com.br/health` retornando status `ok`;
- confirme que HTTP redireciona para HTTPS;
- confira que os dois domínios aparecem como verificados no Render.

## 10. Verificação da conexão com Neon

No frontend publicado:

1. Abra uma página que faça leitura autenticada do banco.
2. Faça login e confirme a persistência da sessão.
3. Consulte uma receita/ingrediente sem executar seed ou alterar a Base Rótula.
4. Examine os logs do Render apenas para confirmar conexão; nunca copie a connection string para tickets ou mensagens.

Se houver erro, confirme a presença de `DATABASE_URL`, SSL exigido pelo Neon e as permissões do usuário do banco. Não use `db push` como correção.

## 11. Checklist final

- [ ] Serviços web e API criados a partir da raiz do monorepo
- [ ] Node 24.18.0 e pnpm 11.9.0 reconhecidos nos logs
- [ ] Build do frontend concluiu e gerou o Prisma Client
- [ ] Build da API concluiu
- [ ] Nenhum segredo foi adicionado ao Git
- [ ] `DATABASE_URL` existe somente no frontend e está secreta
- [ ] `AUTH_SECRET` de produção foi configurado
- [ ] `CORS_ORIGIN=https://rotulafacilpro.com.br`
- [ ] `/health` da API responde `status: ok`
- [ ] Targets reais do Render foram copiados para o Cloudflare
- [ ] Domínio raiz abre por HTTPS
- [ ] Subdomínio `api` abre por HTTPS
- [ ] Login, persistência e logout funcionam no domínio final
- [ ] Cookie de sessão está HttpOnly e Secure
- [ ] Origem não autorizada não passa no CORS
- [ ] Conexão do frontend com o Neon foi confirmada
- [ ] Migrations pendentes, se houver, foram aplicadas somente com `prisma migrate deploy`

## 12. Futuro Asaas

Não há integração Asaas neste momento. Quando ela for projetada, deverá considerar:

- frontend base: `https://rotulafacilpro.com.br`;
- API base: `https://api.rotulafacilpro.com.br`;
- webhook: `https://api.rotulafacilpro.com.br/<rota-futura>`;
- URLs de retorno baseadas no domínio do frontend;
- nomes futuros para segredo da API, segredo/validação do webhook e ambiente sandbox/produção.

Não defina agora a rota nem nomes definitivos de variáveis. As credenciais do Asaas deverão ficar exclusivamente nos secrets do Render, nunca no frontend ou no Git.

## 13. Validação local desta preparação

- Node utilizado: 24.18.0; Next.js instalado: 16.3.0.
- API: build aprovado, `PORT` priorizado, `/health` HTTP 200 e CORS oficial confirmado na execução anterior.
- Prisma Client: geração aprovada na execução anterior; não foi necessário repetir.
- Frontend: build de produção aprovado, incluindo TypeScript e geração das páginas.
- Start de produção: `0.0.0.0`, porta recebida por `PORT`; `/login` HTTP 200 com formulário presente.
- Lint focado aprovado e `git diff --check` sem erros.
- Não foram executados login real, escrita no banco, migration, deploy ou alterações DNS nesta validação.

Os executáveis já instalados foram utilizados localmente. A instalação completa com lockfile e os comandos pnpm devem ser confirmados nos logs do primeiro build Linux no Render; nenhuma dependência foi reinstalada nesta preparação. Os scripts de smoke estão excluídos do build do aplicativo, mas continuam disponíveis para execução separada.

Ajustes necessários para compilação: o domínio de receitas usa imports somente de tipos e a mesma lista de valores regulatórios, evitando carregar o driver PostgreSQL no navegador; o download PNG adapta os mesmos bytes para `Uint8Array`; verificações de existência deixam explícitos os valores já garantidos pelas consultas de quota. Nenhuma regra funcional foi alterada.
