/* eslint-disable @typescript-eslint/no-require-imports -- Real modules, isolated adapters: no database connection. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText;
  vm.runInNewContext(code, { exports, require: id => {
    if (!(id in mocks)) throw new Error(`Unexpected import: ${id}`);
    return mocks[id];
  }, Date, Buffer, console });
  return exports;
}
const allergy = load('packages/db/src/allergens.ts');
const importer = load('packages/db/src/imports/expanded-base.ts', { '../allergens': allergy });
const raw = { name: 'Teste', category: 'Teste', dataOrigin: 'TACO', sourceCode: 'TEST', baseUnit: 'GRAM', baseQuantity: 100, nutrients: { caloriesKcal: null, sodiumMg: 0 } };
const unknown = importer.validateExpandedRow(raw);
assert.equal(unknown.allergenStatus, 'UNKNOWN');
assert.equal(unknown.allergens, null);
assert.equal(unknown.caloriesKcal, null);
assert.equal(unknown.sodiumMg, '0.00');
assert.equal(importer.validateExpandedRow({ ...raw, allergens: [] }).allergenStatus, 'UNKNOWN');
assert.equal(importer.validateExpandedRow({ ...raw, allergens: [], allergenStatus: 'NONE' }).allergenStatus, 'NONE');
assert.equal(importer.validateExpandedRow({ ...raw, allergens: ['Leite'] }).allergenStatus, 'KNOWN');
assert.throws(() => importer.validateExpandedRow({ ...raw, allergenStatus: 'NONE' }));
assert.throws(() => importer.validateExpandedRow({ ...raw, allergens: ['Leite'], allergenStatus: 'UNKNOWN' }));
assert.throws(() => importer.validateExpandedRow({ ...raw, allergenStatus: 'INVALID' }));
assert.equal(allergy.allergenStorage(unknown).allergenStatus, 'UNKNOWN');
const table = { status: 'COMPLETE', rows: [], missingNutrients: [] };
const nutrition = { sodiumMg: null, transFatG: 0 };
const compositor = load('apps/web/src/lib/final-label/preview.ts', {
  '@/lib/recipes/product-information': load('apps/web/src/lib/recipes/product-information.ts', {
    '@rotula-facil-pro/db/allergens': allergy,
    './domain': load('apps/web/src/lib/recipes/domain.ts', { './main-panel': load('apps/web/src/lib/recipes/main-panel.ts') })
  }),
  '@/lib/ingredients/complement': load('apps/web/src/lib/ingredients/complement.ts', {
    '@rotula-facil-pro/db/allergens': allergy,
    './nutrition': load('apps/web/src/lib/ingredients/nutrition.ts'),
    '@/lib/final-label/visual': load('apps/web/src/lib/final-label/visual.ts')
  }),
  '@rotula-facil-pro/db/allergens': allergy,
  '@/lib/barcodes/repository': {}, '@/lib/barcodes/render': {}, '@/lib/recipes/repository': {},
  '@/lib/recipes/main-panel': { deriveRecipeMainPanelAreaCm2: () => 85 },
  '@/lib/nutrition': { calculateRecipeNutrition: () => nutrition, NutritionCalculationError: class extends Error {} },
  '@/lib/regulatory': {
    calculateNutritionPerServing: value => value, formatNutritionForDeclaration: value => value,
    buildNutritionTableViewModel: value => { assert.equal(value, nutrition); return table; },
    evaluateFrontOfPack: value => { assert.equal(value, nutrition); return {}; },
    evaluateFrontOfPackApplicability: () => ({ status: 'APPLICABLE' }),
    composeFrontOfPackDecision: applicability => ({ applicability, hasUnknownData: false })
  }
});
const recipe = { id: 'test', name: 'Teste', physicalState: 'SOLID_OR_SEMISOLID', netQuantity: 100, netQuantityUnit: 'GRAM',
  informationReviewedAt: new Date(), confirmedAllergens: [], glutenStatus: 'DOES_NOT_CONTAIN', lactoseStatus: 'DOES_NOT_CONTAIN',
  crossContaminationRisk: 'NO', crossContaminationAllergens: [], servingSize: 50,
  ingredients: [{ amount: 100, ingredient: { name: 'Teste', source: 'BASE_ROTULA', allergens: [] } }] };
const compose = (state, allergens = [], confirmedAllergens = []) => compositor.composeFinalLabelPreview({ ...recipe, confirmedAllergens,
  ingredients: [{ ...recipe.ingredients[0], ingredient: { ...recipe.ingredients[0].ingredient, allergenStatus: state, allergens } }] }, null);
const legacy = compose(undefined);
assert.equal(legacy.allergenStatus, 'UNKNOWN');
assert.equal(legacy.status, 'REQUIRES_REVIEW');
assert.equal(compose('UNKNOWN', [], ['LEITE']).status, 'REQUIRES_REVIEW', 'General confirmation cannot erase source uncertainty');
assert.equal(compose('KNOWN', ['Leite']).status, 'REQUIRES_REVIEW');
assert.equal(compose('KNOWN', ['Leite'], ['LEITE']).status, 'READY');
assert.equal(compose('NONE').status, 'READY');
assert.equal(compose('NONE').allergenStatus, 'NONE');
assert.equal(legacy.nutritionTable, table);
assert.equal(nutrition.sodiumMg, null);
assert.equal(nutrition.transFatG, 0);
const pdf = load('apps/web/src/lib/final-label/pdf.ts', {
  pdfkit: require('pdfkit'), '@/lib/barcodes/render': {},
  './visual': load('apps/web/src/lib/final-label/visual.ts')
});
assert.equal(pdf.assessFinalLabelPdf({ ...legacy, status: 'READY' }, 'CINTA').code, 'REQUIRES_REVIEW');
assert.equal(pdf.assessFinalLabelPdf(compose('NONE'), 'CINTA').allowed, true);
assert.equal(pdf.assessFinalLabelPdf(compose('KNOWN', ['Leite'], ['LEITE']), 'CINTA').allowed, true);
assert.equal(pdf.nutritionPdfCell(null), '—');
console.log('UNKNOWN ≠ NONE: importer, legacy fallback, explicit confirmation, compositor, PDF guard and null/zero: OK. No DB connection.');
