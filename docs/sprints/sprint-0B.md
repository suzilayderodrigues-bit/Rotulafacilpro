# Sprint 0B - Ambiente Executavel

## Objetivo principal

Transformar a fundacao criada na Sprint 0A em um ambiente local executavel e validado.

## Escopo

- Dependencias base do monorepo.
- Scripts principais da raiz.
- Pagina tecnica temporaria do Next.js.
- Inicializacao tecnica do Fastify.
- Rota `GET /health`.
- Prisma generate sem migrations e sem modelos de produto.
- Variaveis de ambiente somente com placeholders.
- Configuracao inicial de ESLint e Prettier.

## Fora do escopo

- Funcionalidades de negocio.
- Autenticacao.
- Banco definitivo.
- Telas reais do produto.
- Migrations.
- Deploy.

## Bloqueio encontrado e resolvido

A primeira tentativa de instalacao das dependencias nao foi concluida porque o disco `C:` estava sem espaco livre.

Depois da liberacao de espaco, a sprint foi retomada sem recriar arquivos existentes.

## Validacoes concluidas

- `pnpm install`
- `pnpm prisma:generate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- Build individual da web
- Build individual da API
- Inicializacao local da web
- Inicializacao local da API
- Teste de `GET /health`
