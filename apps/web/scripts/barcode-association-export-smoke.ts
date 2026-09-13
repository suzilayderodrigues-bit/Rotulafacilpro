import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { barcodeDownloadName } from "../src/lib/barcodes/download";
import { createInternalBarcodeDraft, validateOfficialGtin } from "../src/lib/barcodes/domain";
import { renderBarcodePng, renderBarcodeSvg } from "../src/lib/barcodes/render";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

async function main() {
  for (const value of ["96385074", "036000291452", "4006381333931", "10012345000017"]) {
    const barcode = validateOfficialGtin(value);
    const rendered = renderBarcodeSvg(barcode);
    assert.equal(rendered.status, "READY");
    if (rendered.status === "READY") assert.match(rendered.svg, /<svg[\s>]/);
    assert.equal(barcode.value, value);
    const png = await renderBarcodePng(barcode);
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  }
  const internal = createInternalBarcodeDraft();
  const internalSvg = renderBarcodeSvg(internal);
  assert.equal(internalSvg.status, "READY");
  assert.equal((await renderBarcodePng(internal)).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(barcodeDownloadName("RF-I-abc/def", "svg"), "codigo-barra-RF-I-abc-def.svg");

  const repository = source("src/lib/barcodes/repository.ts");
  const actions = source("src/lib/barcodes/actions.ts");
  const page = source("src/app/codigo-de-barras/page.tsx");
  const recipePage = source("src/app/receitas/[recipeId]/page.tsx");
  const route = source("src/app/codigo-de-barras/[barcodeId]/download/[format]/route.ts");
  assert.match(repository, /where: \{ id: recipeId, userId \}/);
  assert.match(repository, /where: \{ id: barcodeId, userId \}/);
  assert.match(repository, /data: \{ recipeId: null \}/);
  assert.match(repository, /where: \{ id: barcode\.id, userId \}/);
  assert.match(actions, /receita-ocupada/);
  assert.match(page, /availableRecipes\.some\(\(recipe\) => recipe\.id === query\.recipeId\)/);
  assert.match(recipePage, /findBarcodeByRecipe\(user\.id, recipe\.id\)/);
  assert.match(route, /findBarcode\(user\.id, barcodeId\)/);
  assert.match(route, /Content-Disposition/);
  console.log("Associação, isolamento, SVG e PNG: smoke focado OK (fluxos de banco verificados estaticamente).");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
