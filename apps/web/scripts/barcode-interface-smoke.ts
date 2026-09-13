import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInternalBarcodeDraft, validateOfficialGtin } from "../src/lib/barcodes/domain";
import { barcodeSymbologies, renderBarcodeSvg } from "../src/lib/barcodes/render";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  const official = validateOfficialGtin("036000291452");
  const internal = createInternalBarcodeDraft();
  const officialRender = renderBarcodeSvg(official);
  const internalRender = renderBarcodeSvg(internal);

  assert(officialRender.status === "READY" && officialRender.svg.includes("<svg"), "GTIN-12 deve gerar SVG.");
  assert(internalRender.status === "READY" && internalRender.svg.includes("<svg"), "INTERNAL deve gerar SVG.");
  assert(official.value === "036000291452", "Renderer não pode alterar zeros à esquerda.");
  assert(internal.value.startsWith("RF-I-"), "Código interno deve permanecer separado do GTIN.");
  assert(barcodeSymbologies.GTIN_8 === "EAN-8", "Mapa GTIN-8 incorreto.");
  assert(barcodeSymbologies.GTIN_12 === "UPC-A", "Mapa GTIN-12 incorreto.");
  assert(barcodeSymbologies.GTIN_13 === "EAN-13", "Mapa GTIN-13 incorreto.");
  assert(barcodeSymbologies.GTIN_14 === "ITF-14", "Mapa GTIN-14 incorreto.");
  assert(barcodeSymbologies.INTERNAL === "Code 128", "Mapa interno incorreto.");

  for (const value of ["96385074", "4006381333931", "10012345000017"]) {
    const gtin = validateOfficialGtin(value);
    const rendered = renderBarcodeSvg(gtin);
    assert(rendered.status === "READY" && rendered.svg.includes("<svg"), `${gtin.format} deve gerar SVG.`);
    assert(gtin.value === value, "Renderização não pode alterar o valor persistido.");
  }

  let rejected = false;
  try {
    renderBarcodeSvg({ type: "OFFICIAL_GTIN", format: "GTIN_13", value: "4006381333932" });
  } catch {
    rejected = true;
  }
  assert(rejected, "GTIN inválido deve ser rejeitado antes da renderização.");

  const page = readFileSync(resolve(process.cwd(), "src/app/codigo-de-barras/page.tsx"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/barcodes/actions.ts"), "utf8");
  assert(page.includes("display.status === \"UNAVAILABLE\""), "Tela deve tolerar renderer indisponível.");
  assert(page.includes("Você ainda não criou nenhum código de barras."), "Estado vazio ausente.");
  assert(page.includes("Meus códigos"), "Listagem ausente.");
  assert(actions.includes("requireUser()"), "Ações devem buscar o usuário no servidor.");
  assert(actions.includes("deleteBarcode(user.id, rawId)"), "Exclusão deve ser filtrada pelo usuário.");
  assert(actions.includes("duplicado"), "Erro amigável de duplicidade ausente.");

  console.log(JSON.stringify({ gtin8Svg: "OK", gtin12Svg: "OK", gtin13Svg: "OK", gtin14Svg: "OK", internalSvg: "OK", invalidRejected: "OK", symbologies: "OK", valuePreserved: "OK", pageStates: "OK", authenticatedActions: "OK" }, null, 2));
}

main();
