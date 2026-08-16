# Rotula Fácil Pro

Fundação inicial do projeto Rotula Fácil Pro.

## Stack

- Next.js
- Fastify
- Prisma
- PostgreSQL via Neon
- Tailwind CSS
- shadcn/ui
- TypeScript
- Zod
- ESLint
- Prettier

## Organização

- `apps/web`: aplicação web.
- `apps/api`: API.
- `packages/db`: Prisma e acesso ao banco.
- `packages/ui`: componentes compartilhados.
- `packages/config`: configurações compartilhadas.
- `packages/types`: tipos compartilhados.

## Como executar no Windows PowerShell

### Instalar pnpm, caso necessário

```powershell
corepack enable
corepack prepare pnpm@11.9.0 --activate
```

### Instalar dependências

```powershell
pnpm install
```

### Iniciar web e API

```powershell
pnpm dev
```

### Iniciar somente a web

```powershell
pnpm dev:web
```

### Iniciar somente a API

```powershell
pnpm dev:api
```

### Executar lint

```powershell
pnpm lint
```

### Executar typecheck

```powershell
pnpm typecheck
```

### Executar build

```powershell
pnpm build
```

### Executar Prisma generate

```powershell
pnpm prisma:generate
```
