# Ensaio isolado — 527 TACO PARCIAL

Só aceita DATABASE_URL em memória com hostname `ep-lucky-lake-ac4x96r1.sa-east-1.aws.neon.tech`. Não lê `.env`, não importa o cliente compartilhado, não executa migrations/seed e não atualiza ingredientes existentes. Não usar em produção.

Arquivo único: `EProjetosRotulafacilprobase-rotula-ampliada (2).xlsx.xlsx`, 102469 bytes; SHA256 `afe5c1206766ae7395acad83b401ec1c0ad3533d19aa82ac8ce4bd1b21c65b31`. As 527 identidades também têm hash fixo, independente da contagem. Leitura do XLSX real mantém status até o filtro TACO + PARCIAL, excluindo históricos. Outros status/origens nunca chegam ao núcleo de importação.

Prerequisito: Python já existente em `%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`. O leitor usa apenas biblioteca padrão, sem instalar pacotes. Ausência desse runtime ou arquivo divergente bloqueia antes da escrita.

Preflight read-only confirma migrations/checksums, colunas, enum, constraint, índice, 15 identidades históricas e exatamente 527 WOULD_CREATE. Snapshots integrais de ingredientes (incluindo CUSTOM), usuários, receitas e barcodes ficam apenas em memória, nunca são impressos.

Uma única transação SERIALIZABLE, timeout 300 segundos, sem retries automáticos. Bloqueia alterações concorrentes nas quatro tabelas protegidas durante o ensaio. Revalida migrations, baseline e dry-run antes do primeiro INSERT. Reutiliza `importExpandedBase` com adapter transacional; erro PostgreSQL aborta, sem continuar na transação invalidada.

Antes do commit: exige 527 CREATED, BASE_ROTULA 542, conjunto exato autorizado, UNKNOWN, todos os valores canônicos iguais à fonte e snapshots protegidos intactos. Executa novamente o mesmo núcleo dentro da transação: exige 527 EXISTING, 0 INSERT e snapshot completo inalterado. Só então permite commit. Falha de preservação/idempotência também faz rollback do primeiro lote.

## Execução manual futura — não executada durante implementação

Na janela com conexão temporária, partindo de `E:\Projetos\Rotulafacilpro`:

Dry-run:

```powershell
pnpm --filter @rotula-facil-pro/web exec tsx ../../packages/db/src/imports/trial-expanded-base.ts
```

Aplicação somente após revisão/autorização do ensaio manual:

```powershell
pnpm --filter @rotula-facil-pro/web exec tsx ../../packages/db/src/imports/trial-expanded-base.ts --apply --confirm-test-branch
```

O pnpm exec usa apps/web como diretório: o executor aceita raiz/apps/web e ancora todas as leituras na raiz calculada pelo próprio arquivo.

Sucesso: TEST_BRANCH_TRIAL_COMMITTED, inserted 527, secondInserted 0, baseRotula 542, historicalPreserved 15, unknownAllergens 527. Falha: mensagem sanitizada e exit code 1. Não repetir automaticamente. Falha de rede durante COMMIT pode deixar resultado indeterminado: verificar somente leitura antes de nova tentativa.

Uma invocação posterior com 542 BASE_ROTULA para no baseline 15: não reimporta nem altera nada. O teste de idempotência já está incorporado à única execução transacional.

## Testes locais

```powershell
node packages/db/scripts/expanded-base-trial-smoke.cjs
```

Planilha e módulos reais, cliente transacional em memória, sem Neon. Guards, seleção, 2614 nulls/174 zeros, preservação e rollback simulado em 16 falhas, incluindo segunda execução. Rollback real em PostgreSQL será validado apenas no ensaio manual autorizado.
