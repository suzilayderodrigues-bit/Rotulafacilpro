/* eslint-disable @typescript-eslint/no-require-imports -- Runs inside the isolated real-module harness, without DB access. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

module.exports = async function testNutritionTablePdf({ load, ready, preview, partial, mocks, recipe, compositor, hydrate, ingredient, barcodes }) {
  const domain = load('apps/web/src/lib/nutrition-table/export.ts');
  const pdf = load('apps/web/src/lib/nutrition-table/pdf.ts');
  const copy = value => JSON.parse(JSON.stringify(value));
  const snapshot = JSON.stringify(ready);
  assert(domain.assessNutritionTablePdf(ready).allowed);
  assert.equal(pdf.nutritionTablePdfLayout.bodyFontSize, 8);
  assert.equal(pdf.nutritionTablePdfLayout.titleFontSize, 10);
  const normal = await pdf.renderNutritionTablePdf(ready);
  assert.equal(normal.status, 'READY');
  assert.equal(normal.buffer.subarray(0, 5).toString(), '%PDF-');
  assert.equal(normal.filename, pdf.nutritionTablePdfFilename(ready.name));
  assert.equal(pdf.nutritionTablePdfFilename('../../Olá / Produto'), 'tabela-nutricional-ola-produto.pdf');
  const production = domain.prepareNutritionTableProduction(ready);
  assert(production.downloadHref.endsWith('/tabela/download'));
  assert(production.printHref.endsWith('/tabela/download?mode=print'));
  assert(!production.downloadHref.includes('format='));
  const legacyPdf = load('apps/web/src/lib/final-label/pdf.ts');
  const contradictions = [];
  for (const [field, status, code, label] of [
    ['containsGluten', 'glutenStatus', 'GLUTEN_CONTRADICTION', 'glúten'],
    ['containsLactose', 'lactoseStatus', 'LACTOSE_CONTRADICTION', 'lactose']
  ]) {
    const stored = { ...hydrate(recipe), [status]: 'DOES_NOT_CONTAIN', ingredients: [{ ...hydrate(recipe).ingredients[0], ingredient: { ...ingredient, allergenStatus: 'NONE', [field]: true } }] };
    const conflict = compositor.composeFinalLabelPreview(stored, null);
    assert(conflict.issues.some(issue => issue.code === code && issue.message.includes(label)));
    assert.equal(domain.assessNutritionTablePdf(conflict).allowed, false);
    assert.equal(legacyPdf.assessFinalLabelPdf(conflict, 'CINTA').allowed, false);
    assert(domain.assessNutritionTablePdf(conflict).message.includes(label));
    assert.equal((await legacyPdf.renderFinalLabelPdf(conflict, 'CINTA', 'ESSENCIAL')).status, 'BLOCKED');
    contradictions.push(conflict);
    const corrected = compositor.composeFinalLabelPreview({ ...stored, [status]: 'CONTAINS' }, null);
    assert(domain.assessNutritionTablePdf(corrected).allowed);
    assert(legacyPdf.assessFinalLabelPdf(corrected, 'CINTA').allowed);
  }
  const blocked = [...contradictions, preview, partial,
    { ...ready, status: 'INCOMPLETE' },
    { ...ready, status: 'REQUIRES_REVIEW' },
    { ...ready, allergenStatus: 'UNKNOWN' },
    { ...ready, glutenStatus: 'NEEDS_REVIEW' },
    { ...ready, lactoseStatus: null },
    { ...ready, crossContaminationRisk: 'UNKNOWN' },
    { ...ready, crossContaminationRisk: 'YES', crossContaminationAllergens: [] },
    { ...ready, issues: [{ severity: 'BLOCK', code: 'MANDATORY', message: 'Missing' }] },
    { ...ready, issues: [{ severity: 'REVIEW', code: 'MANDATORY', message: 'Review' }] },
    { ...ready, nutritionTable: null },
    { ...ready, frontOfPack: null },
    { ...ready, frontOfPack: { ...ready.frontOfPack, hasUnknownData: true } },
    { ...ready, frontOfPack: { ...ready.frontOfPack, applicability: { ...ready.frontOfPack.applicability, status: 'REQUIRES_REVIEW' } } },
    { ...ready, ingredients: [] },
    { ...ready, netQuantityLabel: null }
  ];
  for (const field of ['servingLabel', 'householdMeasure', 'servingsPerPackageLabel', 'dailyValueFootnote']) {
    const value = copy(ready); value.nutritionTable.isIndividualPackage = false; value.nutritionTable[field] = null; blocked.push(value);
  }
  for (const flag of ['configurationRequired', 'status', 'missingNutrients']) {
    const value = copy(ready); value.nutritionTable[flag] = flag === 'status' ? 'INCOMPLETE' : flag === 'missingNutrients' ? ['Sódio'] : true; blocked.push(value);
  }
  for (const row of ready.nutritionTable.rows) {
    for (const field of ['per100Value', 'perServingValue', ...(row.hasEstablishedDailyValue ? ['dailyValuePercent'] : [])]) {
      const value = copy(ready); value.nutritionTable.rows.find(item => item.nutrient === row.nutrient)[field] = null; blocked.push(value);
    }
  }
  for (const bad of ['UNKNOWN', 'NaN', '', '-1']) {
    const value = copy(ready); value.nutritionTable.rows[0].per100Value = bad; blocked.push(value);
  }
  const missingRow = copy(ready); missingRow.nutritionTable.rows.pop(); blocked.push(missingRow);
  const duplicateRow = copy(ready); duplicateRow.nutritionTable.rows[1] = duplicateRow.nutritionTable.rows[0]; blocked.push(duplicateRow);
  for (const value of blocked) {
    assert.equal(domain.assessNutritionTablePdf(value).allowed, false);
    assert.equal((await pdf.renderNutritionTablePdf(value)).status, 'BLOCKED');
    assert.equal(domain.prepareNutritionTableProduction(value).downloadHref, null);
  }
  const optional = { ...ready, barcode: null, issues: [{ severity: 'WARNING', code: 'OPTIONAL', message: 'Optional' }] };
  assert(domain.assessNutritionTablePdf(optional).allowed, 'Optional fields and barcode do not block table');
  assert.equal((await pdf.renderNutritionTablePdf({ ...ready, ingredientsText: 'Ingredient '.repeat(2000) })).status, 'READY', 'No old label-size overflow guard');
  assert.equal(pdf.nutritionWarningArtwork(ready), null, 'No warning below thresholds');

  const raw = hydrate(recipe);
  const highIngredient = { ...ingredient, allergenStatus: 'NONE', caloriesKcal: 300, carbohydratesG: 40, sugarsG: 20, addedSugarsG: 20,
    proteinsG: 6, totalFatG: 10, saturatedFatG: 8, transFatG: 0, fiberG: 4, sodiumMg: 700 };
  const rawHigh = { ...raw, finalYieldAmount: 100, finalYieldUnit: 'GRAM', netQuantity: 100, netQuantityUnit: 'GRAM', servingSize: 25,
    servingUnit: 'GRAM', householdMeasure: '1/2 unidade', servingsPerPackage: 4, isIndividualPackage: false,
    ingredients: [{ ...raw.ingredients[0], amount: 100, ingredient: highIngredient }] };
  const high = compositor.composeFinalLabelPreview(rawHigh, barcodes[0]);
  assert.equal(high.status, 'READY');
  assert.equal(high.frontOfPack.finalHighIn.length, 3);
  assert(domain.assessNutritionTablePdf(high).allowed);
  const highPdf = await pdf.renderNutritionTablePdf(high);
  assert.equal(highPdf.status, 'READY');
  const knownOrder = ['addedSugars', 'saturatedFat', 'sodium'];
  for (let mask = 1; mask < 8; mask++) {
    const finalHighIn = high.frontOfPack.finalHighIn.filter(item => mask & (1 << knownOrder.indexOf(item.nutrient)));
    const art = pdf.nutritionWarningArtwork({ ...high, frontOfPack: { ...high.frontOfPack, finalHighIn } });
    assert(art.png.startsWith('iVBOR'));
    assert(art.widthPt > 0 && art.heightPt > 0);
  }
  const largePanelArt = pdf.nutritionWarningArtwork({ ...high, mainPanelAreaCm2: 200 });
  assert(largePanelArt.widthPt > pdf.nutritionWarningArtwork(high).widthPt, 'Print size uses real panel area');
  blocked.push({ ...high, mainPanelAreaCm2: null });
  const liquid = compositor.composeFinalLabelPreview({ ...rawHigh, physicalState: 'LIQUID', finalYieldUnit: 'MILLILITER',
    netQuantityUnit: 'MILLILITER', servingUnit: 'MILLILITER' }, null);
  assert.equal(liquid.nutritionTable.basisLabel, '100 ml');
  assert.equal(liquid.nutritionTable.servingLabel, '25 ml');
  assert.equal(liquid.frontOfPack.finalHighIn.length, 3);
  const liquidPdf = await pdf.renderNutritionTablePdf(liquid); assert.equal(liquidPdf.status, 'READY');
  const individual = compositor.composeFinalLabelPreview({ ...rawHigh, netQuantity: 25, isIndividualPackage: true, servingsPerPackage: null }, null);
  assert.equal(individual.nutritionTable.servingsPerPackageLabel, null);
  const individualPdf = await pdf.renderNutritionTablePdf(individual); assert.equal(individualPdf.status, 'READY');
  const single = compositor.composeFinalLabelPreview({ ...rawHigh, ingredients: [{ ...rawHigh.ingredients[0], ingredient: {
    ...highIngredient, totalFatG: 0, saturatedFatG: 0, sodiumMg: 0
  } }] }, null);
  assert.equal(single.frontOfPack.finalHighIn.length, 1);
  const singlePdf = await pdf.renderNutritionTablePdf(single); assert.equal(singlePdf.status, 'READY');
  const exemption = compositor.composeFinalLabelPreview(rawHigh, null, { packagingCondition: 'PACKED_AT_POINT_OF_SALE_AT_CONSUMER_REQUEST' });
  assert.equal(exemption.frontOfPack.shouldDisplayOfficialWarning, false);
  assert(domain.assessNutritionTablePdf(exemption).allowed);
  assert.equal(pdf.nutritionWarningArtwork(exemption), null);
  for (const nutrient of ['sodiumMg', 'addedSugarsG', 'saturatedFatG']) {
    const unknown = compositor.composeFinalLabelPreview({ ...rawHigh, ingredients: [{ ...rawHigh.ingredients[0], ingredient: { ...highIngredient, [nutrient]: null } }] }, null);
    assert.equal(unknown.nutritionTable.rows.find(row => row.nutrient === nutrient).per100Value, null);
    assert.equal(domain.assessNutritionTablePdf(unknown).allowed, false);
    blocked.push(unknown);
  }
  const noBarcodePdf = await pdf.renderNutritionTablePdf({ ...high, barcode: null });
  // PDF identity excludes timestamps/IDs; compare PDF page content through visual/extraction QA too.
  assert.equal(noBarcodePdf.status, 'READY');
  assert.equal(noBarcodePdf.buffer.length, highPdf.buffer.length, 'Barcode has no effect on the new PDF');

  // Route isolation: authenticate, scope by owner, rebuild data, then export or reject.
  let current = ready;
  const auth = mocks['@/lib/auth/session'];
  const oldAuth = auth.getCurrentUser;
  let calls = 0;
  mocks['@/lib/final-label/preview'] = { buildFinalLabelPreview: async (id, user) => {
    calls++; assert.equal(id, recipe.id); assert.equal(user, 'owner'); return current;
  } };
  const route = load('apps/web/src/app/rotulo-final/[recipeId]/tabela/download/route.ts');
  const legacyRoute = load('apps/web/src/app/rotulo-final/[recipeId]/download/route.ts');
  const legacyRequest = () => legacyRoute.GET(new Request('https://example.invalid/rotulo-final/' + recipe.id + '/download?format=CINTA'), { params: Promise.resolve({ recipeId: recipe.id }) });
  const request = (suffix = '') => route.GET(new Request('https://example.invalid/rotulo-final/' + recipe.id + '/tabela/download' + suffix), { params: Promise.resolve({ recipeId: recipe.id }) });
  try {
    auth.getCurrentUser = async () => null;
    assert.equal((await request()).status, 401); assert.equal((await legacyRequest()).status, 401); assert.equal(calls, 0);
    auth.getCurrentUser = oldAuth;
    current = null; assert.equal((await request()).status, 404); assert.equal((await legacyRequest()).status, 404);
    for (const value of blocked) {
      current = value;
      const response = await request('?mode=print&format=POUCH&template=CLEAN');
      assert.equal(response.status, 409);
      assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
      assert.notEqual((await response.json()).code, undefined);
    }
    current = preview;
    assert.equal((await legacyRequest()).status, 409, 'UNKNOWN blocks the old direct export too');
    for (const conflict of contradictions) {
      current = conflict;
      for (const response of [await request(), await request('?mode=print'), await legacyRequest()]) {
        assert.equal(response.status, 409, 'Direct exports must reject current ingredient contradictions');
        assert((await response.json()).message.includes('Revise a declaração'));
      }
    }
    current = ready;
    assert.equal((await legacyRequest()).status, 200);
    for (const [suffix, disposition] of [['', 'attachment'], ['?mode=print', 'inline'], ['?format=INVALID&template=INVALID', 'attachment']]) {
      const response = await request(suffix);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Content-Type'), 'application/pdf');
      assert(response.headers.get('Content-Disposition').startsWith(disposition + ';'));
      assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
      assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
    }
  } finally {
    auth.getCurrentUser = oldAuth;
    delete mocks['@/lib/final-label/preview'];
  }
  assert.equal(JSON.stringify(ready), snapshot, 'Export never mutates nutrition or decisions');
  if (process.env.NUTRITION_PDF_OUTPUT_DIR) {
    fs.mkdirSync(process.env.NUTRITION_PDF_OUTPUT_DIR, { recursive: true });
    for (const [name, result, data] of [['solid', normal, ready], ['high-three', highPdf, high], ['liquid', liquidPdf, liquid], ['individual', individualPdf, individual], ['high-one', singlePdf, single]]) {
      fs.writeFileSync(path.join(process.env.NUTRITION_PDF_OUTPUT_DIR, name + '.pdf'), result.buffer);
      fs.writeFileSync(path.join(process.env.NUTRITION_PDF_OUTPUT_DIR, name + '.json'), JSON.stringify(data, null, 2));
      const { NutritionFactsTable } = load('apps/web/src/components/nutrition/nutrition-facts-table.tsx');
      fs.writeFileSync(path.join(process.env.NUTRITION_PDF_OUTPUT_DIR, name + '.html'), renderToStaticMarkup(React.createElement(NutritionFactsTable, { model: data.nutritionTable, showAvailableValues: true })));
    }
  }
  console.log('TABLE PDF LOCAL OK: real calculations, 10 mandatory rows, all missing-cell guards, null/UNKNOWN, serving/package metadata, 7 official warnings, solid/liquid/exempt, no barcode, no label presets; authenticated route 401/404/409/200 and download/print; no DB connection.');
};
