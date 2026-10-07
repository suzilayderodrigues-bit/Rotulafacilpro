# Preparação da Base Rotula Ampliada — Sprint 1A

Nenhuma planilha é importada automaticamente. O importador antigo dos 15 laticínios permanece separado.

Entrada: array JSON canônico (não lê XLSX). Campos: `name`, `category`, `dataOrigin`, `sourceCode`, `baseQuantity: 100`, `baseUnit: GRAM | MILLILITER`, `nutrients` (os 12 campos existentes), e opcionais `allergens`, `allergenStatus`, `normalizedName`, `dataOriginUrl`, `sourceVersion`, `sourceDescription`, `containsGluten`, `containsLactose`, `notes`. O conversor da futura planilha deve mapear DataOrigin/SourceCode/etc. explicitamente; cabeçalhos desconhecidos são rejeitados, não descartados.

Sprint 1C: `UNKNOWN` não é `NONE`. Alergênicos ausentes/null ou lista vazia sem confirmação viram `UNKNOWN`, com valor canônico null. Lista não vazia vira `KNOWN`. `NONE` exige estado explícito e lista vazia explícita. Combinações contraditórias são rejeitadas. No banco a lista Prisma não admite null: o container vazio acompanha obrigatoriamente `UNKNOWN` ou `NONE`, nunca decide sozinho ausência. O novo estado nullable não faz backfill: históricos com estado null e lista vazia são tratados como desconhecidos; lista histórica não vazia continua conhecida. Ingredientes desconhecidos exigem revisão e bloqueiam o PDF mesmo após confirmação geral da receita. Glúten/lactose continuam independentes e nullable.

Ausência, null, Tr e NA nutricionais viram null, nunca zero. Zero deve ser explícito. Valores negativos, inválidos, acima de Decimal(10,2), mais de duas casas e base diferente de 100 são rejeitados, sem arredondamento silencioso. Não há inferência de alergênicos/glúten/lactose.

Identidade: par exato `dataOrigin + sourceCode`, com código obrigatório. Nome não define identidade; versão diferente é conflito, não novo registro. Não alterar grafia/capitalização dos identificadores da fonte sem revisão. A migration preparada adiciona `sourceDescription` nullable e índice único parcial apenas para BASE_ROTULA. Não altera nutrientes, IDs nem registros históricos. Duplicatas já existentes fazem a migration falhar para revisão, nunca serem apagadas. O índice parcial é mantido em SQL (documentado no schema), não por db push.

Antes da futura importação: aplicar as duas migrations preparadas (`20261002120000_expanded_base_identity` e `20261002130000_ingredient_allergen_status`) **somente após autorização separada**, gerar o Prisma Client, revisar identidade, status, licenças e dados de origem. O dry-run usa projeção legada e leitura JSON dos campos opcionais; funciona antes dessas migrations. Não disponibilizar o novo fluxo de escrita/formulário em ambiente conectado antes das migrations. Nesta etapa nenhuma é aplicada e nenhum ingrediente é importado.

Importabilidade técnica não autoriza importação em massa. Separar PARCIAL rastreável, PENDENTE, REVISÃO NECESSÁRIA e identidades ausentes. Preservar os 15 históricos sem updates, mesmo quando diferirem em metadados. Dados nutricionais incompletos continuam null e não tornam o rótulo pronto automaticamente.

Dry-run, na raiz (somente leitura no banco escolhido):

`pnpm --filter @rotula-facil-pro/web exec tsx ../../packages/db/src/imports/import-expanded-base.ts caminho/arquivo.json`

Estados por linha: INVALID, CONFLICT (campos divergentes/identidade duplicada), EXISTING, WOULD_CREATE. Nenhum update/delete é executado. A escrita futura exige autorização do ambiente, relatório revisado e flags `--apply --confirm-reviewed-report`; o CLI recusa qualquer erro/conflito no relatório inicial. Reexecuções só inserem o que faltar; conflitos concorrentes são relidos e reportados. Em falha operacional pode haver inserções válidas já realizadas; reexecutar dry-run, nunca apagar/recriar a base.

Testes desta sprint usam adaptadores em memória e módulos reais, sem conexão ao Neon. O índice SQL deve ser validado adicionalmente em banco isolado antes da aplicação em produção.
