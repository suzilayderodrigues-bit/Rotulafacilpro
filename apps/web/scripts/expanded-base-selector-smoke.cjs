/* eslint-disable @typescript-eslint/no-require-imports -- Isolated harness executes real modules without a database connection. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const root = path.resolve(__dirname, '../../..');
function source(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function load(file, mocks = {}) {
  const exports = {};
  const output = ts.transpileModule(source(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(output, { exports, require: (id) => {
    if (id === '../allergens') return load('packages/db/src/allergens.ts');
    if (!(id in mocks)) throw new Error(`Unexpected import: ${id}`);
    return mocks[id];
  }, URL, Response, console, Date });
  return exports;
}
const importer = load('packages/db/src/imports/expanded-base.ts');
const allergy = load('packages/db/src/allergens.ts');
const historical = load('packages/db/src/imports/base-rotula-ingredients.ts').baseRotulaIngredientImportRows;
function raw(code, overrides = {}) {
  return { name: `Alimento ${code}`, category: 'Miscelâneas', dataOrigin: 'TACO', sourceCode: code,
    sourceVersion: '4', sourceDescription: `Descrição ${code}`, baseQuantity: 100, baseUnit: 'GRAM',
    allergens: [], nutrients: { caloriesKcal: '100', fiberG: 'Tr', sodiumMg: 'NA', transFatG: '0' }, ...overrides };
}
async function testImport() {
  assert.equal(allergy.normalizeAllergenDeclaration(null).allergenStatus, 'UNKNOWN');
  assert.equal(allergy.normalizeAllergenDeclaration(null).allergens, null);
  assert.equal(allergy.normalizeAllergenDeclaration([]).allergenStatus, 'UNKNOWN');
  assert.equal(allergy.normalizeAllergenDeclaration([], 'NONE').allergenStatus, 'NONE');
  assert.equal(allergy.normalizeAllergenDeclaration(['Leite']).allergenStatus, 'KNOWN');
  assert.throws(() => allergy.normalizeAllergenDeclaration(null, 'NONE'));
  assert.throws(() => allergy.normalizeAllergenDeclaration(['Leite'], 'NONE'));
  assert.throws(() => allergy.normalizeAllergenDeclaration([], 'KNOWN'));
  assert.equal(allergy.resolveIngredientAllergenState({ allergens: [] }), 'UNKNOWN');
  assert.equal(allergy.resolveIngredientAllergenState({ allergens: ['Leite'] }), 'KNOWN');
  assert.equal(allergy.resolveIngredientAllergenState({ allergens: [], allergenStatus: 'NONE' }), 'NONE');
  const rows = new Map(historical.map((row) => {
    const canonical = importer.validateExpandedRow(row);
    return [JSON.stringify([canonical.dataOrigin, canonical.sourceCode]), canonical];
  }));
  const historicalBefore = JSON.stringify([...rows]);
  const store = {
    find: async (origin, code) => rows.has(JSON.stringify([origin, code])) ? [rows.get(JSON.stringify([origin, code]))] : [],
    insert: async (row) => {
      const key = JSON.stringify([row.dataOrigin, row.sourceCode]);
      if (rows.has(key)) throw Object.assign(new Error('identity'), { code: 'P2002', constraint: 'ingredients_base_source_identity_key' });
      rows.set(key, row);
    },
    isIdentityConflict: (error) => error.code === 'P2002' && error.constraint === 'ingredients_base_source_identity_key'
  };
  const inputs = Array.from({ length: 320 }, (_, i) => raw(`LOCAL-${i}`));
  const baseline = rows.size;
  const dryRun = await importer.importExpandedBase(inputs, store);
  assert(dryRun.every((row) => row.status === 'WOULD_CREATE'));
  assert.equal(rows.size, baseline, 'Dry-run wrote data');
  const reports = await Promise.all([importer.importExpandedBase(inputs, store, true), importer.importExpandedBase(inputs, store, true)]);
  assert.equal(rows.size, baseline + inputs.length);
  assert.equal(reports.flat().filter((row) => row.status === 'CREATED').length, inputs.length);
  assert((await importer.importExpandedBase(inputs, store, true)).every((row) => row.status === 'EXISTING'));
  assert.equal(JSON.stringify([...rows].slice(0, baseline)), historicalBefore);
  const race = await Promise.all([
    importer.importExpandedBase([raw('race', { name: 'Nome A' })], store, true),
    importer.importExpandedBase([raw('race', { name: 'Nome B' })], store, true)
  ]);
  assert.equal(race.flat().filter((row) => row.status === 'CREATED').length, 1);
  assert.equal(race.flat().filter((row) => row.status === 'CONFLICT').length, 1);
  const value = rows.get(JSON.stringify(['TACO', 'LOCAL-0']));
  assert.equal(value.fiberG, null); assert.equal(value.sodiumMg, null);
  assert.equal(value.addedSugarsG, null); assert.equal(value.transFatG, '0.00');
  assert.equal(value.sourceDescription, 'Descrição LOCAL-0');
  for (const input of [raw('invalid', { baseQuantity: 50 }), raw('invalid', { sourceCode: null }), raw('invalid', { nutrients: { fiberG: -1 } }), raw('invalid', { nutrients: { sodiumMg: '0.001' } }), raw('invalid', { containsGluten: 'false' }), raw('invalid', { unexpected: true })]) {
    assert.equal((await importer.importExpandedBase([input], store, true))[0].status, 'INVALID');
  }
  const conflicting = await importer.importExpandedBase([raw('LOCAL-0', { name: 'Outro nome' }), raw('LOCAL-1', { sourceVersion: '5' })], store, true);
  assert(conflicting.every((row) => row.status === 'CONFLICT'));
  assert((await importer.importExpandedBase([raw('DUP'), raw('DUP')], store, true)).every((row) => row.status === 'CONFLICT'));
  const mixed = await importer.importExpandedBase([raw('valid-extra'), raw('bad-base', { baseQuantity: 1 })], store, true);
  assert.equal(mixed[0].status, 'CREATED'); assert.equal(mixed[1].status, 'INVALID');
  assert.equal(rows.size, baseline + inputs.length + 2);
  assert.equal(JSON.stringify([...rows].slice(0, baseline)), historicalBefore);
  // An incoming historical entry with altered nutrition must not change that ingredient.
  const altered = { ...historical[0], nutrients: { ...historical[0].nutrients, caloriesKcal: '999' } };
  assert.equal((await importer.importExpandedBase([altered], store, true))[0].status, 'CONFLICT');
  assert.equal(JSON.stringify([...rows].slice(0, baseline)), historicalBefore);
  const migration = source('packages/db/prisma/migrations/20261002120000_expanded_base_identity/migration.sql');
  assert(migration.includes('CREATE UNIQUE INDEX'));
  assert(migration.includes('WHERE "source" = \'BASE_ROTULA\''));
  assert(!/DELETE|UPDATE|DROP\s+TABLE|TRUNCATE/i.test(migration));
  // Real local SQL uniqueness check, in memory only; this is NOT a PostgreSQL migration application.
  const sql = new DatabaseSync(':memory:');
  try {
    sql.exec('CREATE TABLE ingredients (id TEXT, source TEXT, dataOrigin TEXT, sourceCode TEXT, sourceVersion TEXT)');
    const insert = sql.prepare('INSERT INTO ingredients (id, source, dataOrigin, sourceCode, sourceVersion) VALUES (?, ?, ?, ?, ?)');
    insert.run('historic', 'BASE_ROTULA', 'TACO', 'H1', '4');
    sql.exec(migration);
    assert.equal(sql.prepare('SELECT sourceDescription FROM ingredients WHERE id = ?').get('historic').sourceDescription, null);
    assert.throws(() => insert.run('duplicate', 'BASE_ROTULA', 'TACO', 'H1', '5'), /UNIQUE constraint failed/);
    insert.run('custom-A', 'CUSTOM', 'TACO', 'H1', '4');
    insert.run('custom-B', 'CUSTOM', 'TACO', 'H1', '4');
    assert.equal(sql.prepare('SELECT count(*) AS count FROM ingredients').get().count, 3);
  } finally { sql.close(); }
}
function matches(row, where) {
  if (!where) return true;
  return Object.entries(where).every(([key, value]) => {
    if (key === 'AND') return value.every((part) => matches(row, part));
    if (key === 'OR') return value.some((part) => matches(row, part));
    if (value && typeof value === 'object' && 'contains' in value) return row[key].toLowerCase().includes(value.contains.toLowerCase());
    if (value && typeof value === 'object' && 'startsWith' in value) return row[key].toLowerCase().startsWith(value.startsWith.toLowerCase());
    return row[key] === value;
  });
}
async function testSelector() {
  const normalize = (name) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const ingredients = Array.from({ length: 52 }, (_, i) => ({
    id: `base-${i}`, name: `Açúcar ${String(i).padStart(2, '0')}`, normalizedName: normalize(`Açúcar ${String(i).padStart(2, '0')}`),
    category: 'Açúcares', source: 'BASE_ROTULA', userId: null, baseUnit: 'GRAM',
    ...Object.fromEntries(importer.expandedNutrients.map((key) => [key, key === 'fiberG' ? null : key === 'transFatG' ? 0 : 10]))
  }));
  ingredients.push({ ...ingredients[0], id: 'own', name: 'Meu cacau', normalizedName: 'meu cacau', source: 'CUSTOM', userId: 'A' });
  ingredients.push({ ...ingredients[0], id: 'foreign', name: 'Secreto B', normalizedName: 'secreto b', source: 'CUSTOM', userId: 'B' });
  for (const [id, name, source, userId] of [
    ['genuine', 'Genuine chocolate em pó 50%', 'BASE_ROTULA', null],
    ['condensed', 'Camponesa leite condensado integral 395 g', 'BASE_ROTULA', null],
    ['biscuit', 'Biscoito Marilan Maizena 300 g', 'BASE_ROTULA', null],
    ['private-chocolate', 'Meu chocolate em pó Genuine', 'CUSTOM', 'A'],
    ['foreign-chocolate', 'Meu chocolate em pó Genuine', 'CUSTOM', 'B']
  ]) ingredients.push({ ...ingredients[0], id, name, normalizedName: normalize(name), source, userId });
  const records = [];
  let lastQuery;
  const prisma = {
    ingredient: {
      findMany: async (query) => {
        lastQuery = query;
        return ingredients.filter((row) => matches(row, query.where)).sort((a, b) => a.name.localeCompare(b.name)).slice(query.skip, query.skip + query.take).map((row) => Object.fromEntries(Object.keys(query.select).map((key) => [key, row[key]])));
      },
      findFirst: async ({ where }) => ingredients.find((row) => matches(row, where)) ?? null
    },
    recipe: { findFirst: async ({ where }) => where.id === 'recipe-A' && where.userId === 'A' ? { id: 'recipe-A' } : null },
    recipeIngredient: {
      findUnique: async ({ where }) => records.find((row) => row.recipeId === where.recipeId_ingredientId.recipeId && row.ingredientId === where.recipeId_ingredientId.ingredientId) ?? null,
      create: async ({ data }) => { const row = { ...data, id: `item-${records.length}` }; records.push(row); return row; },
      findFirst: async ({ where }) => where.recipe.userId === 'A' ? records.find((row) => row.id === where.id) ?? null : null,
      update: async ({ where, data }) => Object.assign(records.find((row) => row.id === where.id), data),
      deleteMany: async ({ where }) => { const i = where.recipe.userId === 'A' ? records.findIndex((row) => row.id === where.id) : -1; if (i < 0) return { count: 0 }; records.splice(i, 1); return { count: 1 }; }
    }
  };
  const ingredientRepo = load('apps/web/src/lib/ingredients/repository.ts', { '@rotula-facil-pro/db': { prisma } });
  const first = await ingredientRepo.searchAccessibleIngredients('A', 'acucar', 0);
  assert.equal(first.items.length, 20); assert.equal(first.hasMore, true);
  assert.equal(lastQuery.take, 21); assert.equal(lastQuery.skip, 0);
  assert(first.items.every((row) => !('userId' in row) && !('caloriesKcal' in row)));
  const second = await ingredientRepo.searchAccessibleIngredients('A', 'acucar', 1);
  assert.equal(new Set([...first.items, ...second.items].map((row) => row.id)).size, 40);
  assert.equal((await ingredientRepo.searchAccessibleIngredients('A', 'Meu', 0)).items[0].id, 'own');
  assert.equal((await ingredientRepo.searchAccessibleIngredients('A', 'cacau', 0)).items[0].id, 'own', 'Interior words find private ingredients for their owner');
  assert.equal((await ingredientRepo.searchAccessibleIngredients('B', 'cacau', 0)).items.length, 0);
  assert.equal((await ingredientRepo.searchAccessibleIngredients('A', 'secreto', 0)).items.length, 0);
  for (const term of ['chocolate em pó', 'CHOCOLATE EM PO', 'Genuine']) {
    const a = (await ingredientRepo.searchAccessibleIngredients('A', term, 0)).items.map(row => row.id).sort();
    assert.equal(JSON.stringify(a), JSON.stringify(['genuine', 'private-chocolate']));
    const b = (await ingredientRepo.searchAccessibleIngredients('B', term, 0)).items.map(row => row.id).sort();
    assert.equal(JSON.stringify(b), JSON.stringify(['foreign-chocolate', 'genuine']));
  }
  assert.equal((await ingredientRepo.searchAccessibleIngredients('A', 'leite condensado', 0)).items[0].id, 'condensed');
  for (const term of ['maisena', 'MAIZENA']) assert.equal((await ingredientRepo.searchAccessibleIngredients('A', term, 0)).items[0].id, 'biscuit');
  const added = Array.from({length: 45}, (_, i) => ({ ...ingredients[0], id: 'match-'+i, name: 'Marca Chocolate em pó '+i, normalizedName: 'marca chocolate em po '+i }));
  ingredients.push(...added);
  const pages = await Promise.all([0,1,2].map(page => ingredientRepo.searchAccessibleIngredients('A', 'chocolate em pó', page)));
  assert.equal(pages[0].items.length,20); assert.equal(pages[1].items.length,20); assert.equal(pages[2].items.length,7);
  assert.equal(pages[0].hasMore,true); assert.equal(pages[1].hasMore,true); assert.equal(pages[2].hasMore,false);
  assert.equal(new Set(pages.flatMap(page => page.items.map(row => row.id))).size,47);
  ingredients.splice(ingredients.length-added.length,added.length);
  const panel = load('apps/web/src/lib/recipes/main-panel.ts');
  const domain = load('apps/web/src/lib/recipes/domain.ts', { './main-panel': panel });
  const recipeRepo = load('apps/web/src/lib/recipes/repository.ts', { '@rotula-facil-pro/db': { prisma }, '@/lib/ingredients/repository': ingredientRepo, './domain': domain, './product-information': load('apps/web/src/lib/recipes/product-information.ts', { '@rotula-facil-pro/db/allergens': allergy, './domain': domain }) });
  const calculator = load('apps/web/src/lib/nutrition/calculator.ts');
  const ingredient = ingredients[0];
  const before = { id: 'recipe-A', physicalState: 'SOLID_OR_SEMISOLID', finalYieldAmount: '500', finalYieldUnit: 'GRAM', unitWeight: 50, ingredients: [{ id: 'item-0', amount: '250', unit: 'GRAM', ingredient }] };
  await recipeRepo.addRecipeIngredient('A', 'recipe-A', { ingredientId: first.items[0].id, amount: '250', unit: first.items[0].baseUnit });
  const hydrated = { ...before, ingredients: records.map((item) => ({ id: item.id, amount: item.amount, unit: item.unit, ingredient: ingredients.find((i) => i.id === item.ingredientId) })) };
  assert.equal(JSON.stringify(calculator.calculateRecipeNutrition(hydrated)), JSON.stringify(calculator.calculateRecipeNutrition(before)));
  assert.equal(calculator.calculateRecipeNutrition(hydrated).nutrients.fiberG.isComplete, false);
  assert.equal(calculator.calculateRecipeNutrition(hydrated).nutrients.transFatG.isComplete, true);
  for (const [user, recipe, input, code] of [
    ['A', 'recipe-A', { ingredientId: ingredient.id, amount: 1, unit: 'GRAM' }, 'duplicate-ingredient'],
    ['B', 'recipe-A', { ingredientId: ingredient.id, amount: 1, unit: 'GRAM' }, 'recipe-not-found'],
    ['A', 'recipe-A', { ingredientId: 'foreign', amount: 1, unit: 'GRAM' }, 'ingredient-not-found'],
    ['A', 'recipe-A', { ingredientId: 'own', amount: 1, unit: 'MILLILITER' }, 'unit-mismatch']
  ]) await assert.rejects(recipeRepo.addRecipeIngredient(user, recipe, input), (error) => error.code === code);
  records[0].ingredient = ingredient;
  assert.equal(await recipeRepo.updateRecipeIngredient('B', 'item-0', { amount: 2, unit: 'GRAM' }), null);
  await recipeRepo.updateRecipeIngredient('A', 'item-0', { amount: 125, unit: 'GRAM' });
  assert.equal(String(records[0].amount), '125');
  assert.equal((await recipeRepo.removeRecipeIngredient('B', 'item-0')).count, 0);
  assert.equal((await recipeRepo.removeRecipeIngredient('A', 'item-0')).count, 1);
  let user = { id: 'A' };
  const route = load('apps/web/src/app/receitas/[recipeId]/ingredientes/busca/route.ts', {
    '@/lib/auth/session': { getCurrentUser: async () => user },
    '@/lib/ingredients/repository': ingredientRepo, '@/lib/recipes/repository': recipeRepo
  });
  const get = (query = '', recipeId = 'recipe-A') => route.GET(new Request(`https://example.invalid/busca${query}`), { params: Promise.resolve({ recipeId }) });
  assert.equal((await get('?q=acucar')).status, 200);
  for (const term of ['chocolate em pó', 'Genuine', 'leite condensado', 'maisena']) {
    const response=await get('?q='+encodeURIComponent(term));assert.equal(response.status,200);
    const data=await response.json();assert(data.items.length>0);assert(!data.items.some(row=>row.id==='foreign-chocolate'));
  }
  assert.equal((await get('?page=-1')).status, 400);
  assert.equal((await get('', 'recipe-B')).status, 404);
  user = { id: 'B' }; assert.equal((await get()).status, 404);
  user = null; assert.equal((await get()).status, 401);
  const page = source('apps/web/src/app/receitas/[recipeId]/ingredientes/page.tsx');
  const selector = source('apps/web/src/app/receitas/[recipeId]/ingredientes/ingredient-selector.tsx');
  assert(!page.includes('listAccessibleIngredients'));
  assert(selector.includes('action={addRecipeIngredientAction}'));
  assert(selector.includes('value={selected.id}'));
  assert(selector.includes('showModal()') && selector.includes('max-h-[45dvh]') && selector.includes('aria-labelledby'));
}
(async () => {
  if (!process.argv.includes('--selector-only')) await testImport();
  await testSelector();
  if (process.argv.includes('--selector-only')) { console.log('SELECTOR LOCAL OK: substring, case/accent, maisena/maizena, 20-item pagination, private ownership, recipe ownership and routes. No import function, SQL or migration executed.'); return; }
  console.log('LOCAL OK: históricos, 320 inclusões, dry-run, idempotência/concorrência simulada, índice parcial em SQLite em memória, conflitos, null/zero, base100, busca/paginação, ownership, CRUD e regressão nutricional. Nenhuma conexão ao Neon.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
