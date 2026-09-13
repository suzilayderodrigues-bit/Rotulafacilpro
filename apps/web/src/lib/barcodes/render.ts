import type { BarcodeType, BarcodeValueFormat } from "@rotula-facil-pro/db";
import bwipjs from "bwip-js/node";
import { validateOfficialGtin } from "./domain";

export const barcodeSymbologies = {
  GTIN_8: "EAN-8",
  GTIN_12: "UPC-A",
  GTIN_13: "EAN-13",
  GTIN_14: "ITF-14",
  INTERNAL: "Code 128"
} as const;

export type BarcodeRenderInput = { value: string; type: BarcodeType; format: BarcodeValueFormat };
export type BarcodeRenderResult =
  | { status: "READY"; svg: string; symbology: string }
  | { status: "UNAVAILABLE"; svg: null; symbology: string };

const encoders = {
  GTIN_8: "ean8",
  GTIN_12: "upca",
  GTIN_13: "ean13",
  GTIN_14: "itf14",
  INTERNAL: "code128"
} as const;

export function renderBarcodeSvg(input: BarcodeRenderInput): BarcodeRenderResult {
  if (input.type === "OFFICIAL_GTIN") {
    const validated = validateOfficialGtin(input.value);
    if (validated.format !== input.format) throw new Error("Formato GTIN incompatível.");
  } else if (input.type !== "INTERNAL" || input.format !== "INTERNAL" || !/^RF-I-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.value)) {
    throw new Error("Código interno inválido.");
  }

  try {
    const svg = bwipjs.toSVG({
      bcid: encoders[input.format],
      text: input.value,
      scale: 2,
      height: 12,
      includetext: true,
      textxalign: "center"
    });

    return { status: "READY", svg, symbology: barcodeSymbologies[input.format] };
  } catch {
    return { status: "UNAVAILABLE", svg: null, symbology: barcodeSymbologies[input.format] };
  }
}
