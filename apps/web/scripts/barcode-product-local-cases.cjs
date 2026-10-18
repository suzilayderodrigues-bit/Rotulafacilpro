/* eslint-disable @typescript-eslint/no-require-imports -- Real services and routes, isolated in-memory adapters only. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

module.exports = async function testProductBarcode({ load, harness, elements, action, mocks, recipes, barcodes, repo, usage }) {
  const before = { recipes: recipes.length, barcodes: barcodes.length, used: usage.get() };
  const commercial = mocks['./commercial'];
  const originalCreate = commercial.createBarcodeWithEntitlement;
  const auth = mocks['@/lib/auth/session'];
  const originalAuth = { requireUser: auth.requireUser, getCurrentUser: auth.getCurrentUser };
  const hooks = Object.fromEntries(['useState', 'useRef', 'useEffect'].map(key => [key, mocks.react[key]]));
  let failure = null;
  commercial.createBarcodeWithEntitlement = async (owner, draft, recipeId) => {
    if (failure === 'DUPLICATE') throw { code: 'P2002' };
    if (failure) throw new commercial.BarcodeEntitlementError(failure);
    if (!recipes.some(recipe => recipe.id === recipeId && recipe.userId === owner)) throw new commercial.BarcodeEntitlementError('RECIPE_NOT_FOUND');
    if (barcodes.some(code => code.userId === owner && code.recipeId === recipeId)) throw { code: 'P2002' };
    return originalCreate(owner, draft, recipeId);
  };
  try {
    const product = await repo.createRecipe('owner', { name: 'Produto com código próprio', physicalState: 'SOLID_OR_SEMISOLID', finalYieldUnit: 'GRAM' });
    const second = await repo.createRecipe('owner', { name: 'Outro produto', physicalState: 'SOLID_OR_SEMISOLID', finalYieldUnit: 'GRAM' });
    const foreign = await repo.createRecipe('other', { name: 'Produto de outra conta', physicalState: 'SOLID_OR_SEMISOLID', finalYieldUnit: 'GRAM' });
    const barcodeActions = load('apps/web/src/lib/barcodes/actions.ts');
    const render = load('apps/web/src/lib/barcodes/render.ts');
    const domain = load('apps/web/src/lib/barcodes/domain.ts');
    const printer = load('apps/web/src/lib/barcodes/print.ts');
    const { CreateBarcodeForm } = load('apps/web/src/app/codigo-de-barras/create-barcode-form.tsx');
    const { ProductBarcodeSection } = load('apps/web/src/app/receitas/[recipeId]/rendimento/product-barcode-section.tsx');
    const fixed = harness(CreateBarcodeForm, { internal: true, recipes: [{ id: second.id, name: second.name }], fixedProduct: product });
    const form = fixed.render();
    assert(elements(form).some(e => e.props.name === 'recipeId' && e.props.type === 'hidden' && e.props.value === product.id));
    assert(!elements(form).some(e => e.type === 'select'), 'The product cannot be accidentally changed in the inline form');
    const create = (recipeId, returnTo = 'product') => action(barcodeActions.createInternalBarcodeAction, { recipeId, returnTo });
    assert.equal(await create(product.id), `/receitas/${product.id}/rendimento?barcodeStatus=interno-criado#codigo-interno`);
    const barcode = barcodes.find(code => code.recipeId === product.id);
    assert(barcode);
    assert.equal(barcode.userId, 'owner');
    assert.equal(barcode.type, 'INTERNAL'); assert.equal(barcode.format, 'INTERNAL');
    assert(/^RF-I-[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(barcode.value));
    assert.equal(render.renderBarcodeSvg(barcode).symbology, 'Code 128');
    assert.equal(usage.get(), before.used + 1);
    assert((await create(product.id)).includes('barcodeStatus=receita-ocupada'));
    assert.equal(usage.get(), before.used + 1, 'Reopening or repeated generation does not consume another code');
    assert.equal(barcodes.filter(code => code.recipeId === product.id).length, 1);
    for (const [code, status] of [['FREE_LIMIT_REACHED', 'limite-gratis'], ['MONTHLY_LIMIT_REACHED', 'limite-mensal'], ['MISSING_BILLING_CYCLE', 'ciclo-indisponivel'], ['SUBSCRIPTION_REQUIRES_REVIEW', 'plano-revisao'], ['RECIPE_NOT_FOUND', 'receita-nao-encontrada'], ['DUPLICATE', 'duplicado']]) {
      failure = code;
      assert((await create(second.id)).includes('barcodeStatus=' + status));
      assert.equal(usage.get(), before.used + 1);
    }
    failure = null;
    auth.requireUser = async () => ({ id: 'other' });
    assert((await create(product.id)).includes('barcodeStatus=receita-nao-encontrada'));
    assert.equal(usage.get(), before.used + 1);
    auth.requireUser = originalAuth.requireUser;
    const legacy = new URL(await create(second.id, 'https://example.invalid'), 'https://example.invalid');
    assert.equal(legacy.pathname, '/codigo-de-barras', 'Only the explicit product context changes the old return route');
    assert.equal(legacy.searchParams.get('status'), 'interno-criado');

    const section = ProductBarcodeSection({ recipeId: product.id, recipeName: product.name, barcode });
    assert(JSON.stringify(section).includes('Código interno — não substitui GTIN oficial'));
    assert(elements(section).some(e => e.props.href === `/codigo-de-barras/${barcode.id}/download/svg`));
    assert(elements(section).some(e => e.props.href === `/codigo-de-barras/${barcode.id}/download/png`));
    assert(elements(section).some(e => e.props.href === `/codigo-de-barras/${barcode.id}/imprimir?recipeId=${product.id}`));
    assert(!elements(section).some(e => e.type === CreateBarcodeForm), 'Existing associations are never replaced by inline generation');
    const gtinBody = '1234567';
    const official = { ...barcode, type: 'OFFICIAL_GTIN', format: 'GTIN_8', value: gtinBody + domain.calculateGtinCheckDigit(gtinBody) };
    const officialSection = ProductBarcodeSection({ recipeId: product.id, recipeName: product.name, barcode: official });
    assert(JSON.stringify(officialSection).includes('Código oficial GTIN'));
    assert(!JSON.stringify(officialSection).includes('Código interno — não substitui GTIN oficial'));
    assert(!elements(officialSection).some(e => e.type === CreateBarcodeForm));

    const downloads = load('apps/web/src/app/codigo-de-barras/[barcodeId]/download/[format]/route.ts');
    const print = load('apps/web/src/app/codigo-de-barras/[barcodeId]/imprimir/route.ts');
    const download = (format, id = barcode.id) => downloads.GET(new Request('https://example.invalid/download'), { params: Promise.resolve({ barcodeId: id, format }) });
    const printCode = (recipeId = product.id, id = barcode.id) => print.GET(new Request('https://example.invalid/imprimir?recipeId=' + encodeURIComponent(recipeId)), { params: Promise.resolve({ barcodeId: id }) });
    auth.getCurrentUser = async () => null;
    assert.equal((await download('svg')).status, 401); assert.equal((await printCode()).status, 401);
    auth.getCurrentUser = originalAuth.getCurrentUser;
    assert.equal((await download('pdf')).status, 404);
    assert.equal((await download('svg', 'missing')).status, 404);
    assert.equal((await printCode(product.id, 'missing')).status, 404);
    assert.equal((await printCode(second.id)).status, 404, 'A stale link cannot print the code for another product');
    barcodes.push({ ...barcode, id: 'foreign-code', userId: 'other', recipeId: foreign.id });
    assert.equal((await download('png', 'foreign-code')).status, 404);
    assert.equal((await printCode(foreign.id, 'foreign-code')).status, 404);
    const svgResponse = await download('svg');
    assert.equal(svgResponse.status, 200);
    assert(svgResponse.headers.get('Content-Type').includes('image/svg+xml'));
    assert(svgResponse.headers.get('Content-Disposition').endsWith('.svg"'));
    assert.equal(await svgResponse.text(), render.renderBarcodeSvg(barcode).svg);
    const pngResponse = await download('png');
    assert.equal(pngResponse.status, 200);
    assert.equal(pngResponse.headers.get('Content-Type'), 'image/png');
    assert.equal(pngResponse.headers.get('Cache-Control'), 'private, no-store');
    assert(Buffer.from(await pngResponse.arrayBuffer()).equals(await render.renderBarcodePng(barcode)));
    const printed = await printCode();
    assert.equal(printed.status, 200, 'Printing is independent of missing recipe/nutrition data');
    assert.equal(printed.headers.get('Content-Type'), 'application/pdf');
    assert(printed.headers.get('Content-Disposition').startsWith('inline;'));
    assert.equal(printed.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(Buffer.from(await printed.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
    const associatedRecipeId = barcode.recipeId;
    barcode.recipeId = second.id;
    assert.equal((await printCode(product.id)).status, 404, 'Association is checked again at print time');
    barcode.recipeId = foreign.id;
    assert.equal((await printCode(foreign.id)).status, 404, 'The product must also belong to the current user');
    barcode.recipeId = associatedRecipeId;
    const originalValue = barcode.value; barcode.value = 'INVALID';
    assert.equal((await download('svg')).status, 503); assert.equal((await printCode()).status, 503);
    assert(!elements(ProductBarcodeSection({ recipeId: product.id, recipeName: product.name, barcode })).some(e => e.props.href?.includes('/imprimir')));
    barcode.value = originalValue;
    const snapshot = JSON.stringify({ recipes, barcodes, used: usage.get() });
    for (const [name, value] of [['random', barcode.value], ['wide', 'RF-I-ffffffff-ffff-ffff-ffff-ffffffffffff'], ['compact', 'RF-I-00000000-0000-0000-0000-000000000000']]) {
      const input = { ...barcode, value };
      const result = await printer.renderBarcodePrintPdf(input, product.name);
      const { image, quietZone, margin, pageWidth, pageHeight, nativeWidth, nativeHeight } = result.layout;
      assert(image.x - quietZone >= margin);
      assert(image.x + image.width + quietZone <= pageWidth - margin);
      assert(image.y - quietZone >= margin);
      assert(image.y + image.height + quietZone <= pageHeight - margin);
      assert(Math.abs(image.width / image.height - nativeWidth / nativeHeight) < 1e-9, 'Never stretch or crop the image');
      assert.equal(result.buffer.subarray(0, 5).toString(), '%PDF-');
      if (process.env.BARCODE_PRINT_OUTPUT_DIR) {
        fs.mkdirSync(process.env.BARCODE_PRINT_OUTPUT_DIR, { recursive: true });
        fs.writeFileSync(path.join(process.env.BARCODE_PRINT_OUTPUT_DIR, name + '.pdf'), result.buffer);
        fs.writeFileSync(path.join(process.env.BARCODE_PRINT_OUTPUT_DIR, name + '.json'), JSON.stringify({ value, productName: product.name, layout: result.layout }, null, 2));
        fs.writeFileSync(path.join(process.env.BARCODE_PRINT_OUTPUT_DIR, name + '-source.png'), await render.renderBarcodePng(input));
      }
    }
    assert.equal(JSON.stringify({ recipes, barcodes, used: usage.get() }), snapshot, 'Download and print never allocate numbers or change associations');
    for (const name of Object.keys(hooks)) mocks.react[name] = React[name];
    const productPage = await load('apps/web/src/app/receitas/[recipeId]/rendimento/page.tsx').default({ params: Promise.resolve({ recipeId: product.id }) });
    assert(elements(productPage).some(e => e.type === ProductBarcodeSection && e.props.barcode?.id === barcode.id));
    const html = renderToStaticMarkup(productPage);
    assert(html.includes('Código interno — não substitui GTIN oficial'));
    assert(html.includes('/imprimir?recipeId=' + product.id));
    if (process.env.BARCODE_PRINT_OUTPUT_DIR) fs.writeFileSync(path.join(process.env.BARCODE_PRINT_OUTPUT_DIR, 'product.html'), html);
  } finally {
    Object.assign(auth, originalAuth); Object.assign(mocks.react, hooks);
    commercial.createBarcodeWithEntitlement = originalCreate;
    recipes.splice(before.recipes); barcodes.splice(before.barcodes); usage.set(before.used);
  }
  console.log('PRODUCT BARCODE LOCAL OK: existing RF-I/Code128 generation, fixed product association and ownership, existing limits/duplicates, unchanged SVG/PNG routes, separate print PDF with quiet margins/no cropping, print-time association guards, no new numbers on download/print; no DB connection.');
};
