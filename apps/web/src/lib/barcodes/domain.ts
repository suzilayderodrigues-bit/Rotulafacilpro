import { randomUUID } from "node:crypto";

export const gtinLengths = [8, 12, 13, 14] as const;

export type GtinLength = (typeof gtinLengths)[number];
export type OfficialGtinFormat = `GTIN_${GtinLength}`;

export type BarcodeDraft =
  | { type: "OFFICIAL_GTIN"; value: string; format: OfficialGtinFormat }
  | { type: "INTERNAL"; value: string; format: "INTERNAL" };

export type BarcodeValidationErrorCode =
  | "empty-value"
  | "invalid-characters"
  | "invalid-length"
  | "invalid-check-digit"
  | "cross-tenant-association";

export class BarcodeValidationError extends Error {
  constructor(public readonly code: BarcodeValidationErrorCode) {
    super(code);
  }
}

export function normalizeGtinInput(input: string) {
  return input.trim();
}

function gtinFormat(length: GtinLength): OfficialGtinFormat {
  return `GTIN_${length}`;
}

export function calculateGtinCheckDigit(body: string) {
  if (!/^\d+$/.test(body)) {
    throw new BarcodeValidationError(body.length === 0 ? "empty-value" : "invalid-characters");
  }

  let sum = 0;

  for (let index = body.length - 1, position = 0; index >= 0; index -= 1, position += 1) {
    const digit = body.charCodeAt(index) - 48;
    sum += digit * (position % 2 === 0 ? 3 : 1);
  }

  return String((10 - (sum % 10)) % 10);
}

export function validateOfficialGtin(input: string): Extract<BarcodeDraft, { type: "OFFICIAL_GTIN" }> {
  const value = normalizeGtinInput(input);

  if (!value) throw new BarcodeValidationError("empty-value");
  if (!/^\d+$/.test(value)) throw new BarcodeValidationError("invalid-characters");
  if (!gtinLengths.includes(value.length as GtinLength)) {
    throw new BarcodeValidationError("invalid-length");
  }

  const body = value.slice(0, -1);
  if (calculateGtinCheckDigit(body) !== value.at(-1)) {
    throw new BarcodeValidationError("invalid-check-digit");
  }

  return {
    type: "OFFICIAL_GTIN",
    value,
    format: gtinFormat(value.length as GtinLength)
  };
}

export function createInternalBarcodeDraft(
  createIdentifier: () => string = randomUUID
): Extract<BarcodeDraft, { type: "INTERNAL" }> {
  return {
    type: "INTERNAL",
    value: `RF-I-${createIdentifier()}`,
    format: "INTERNAL"
  };
}

export function assertBarcodeRecipeOwnership(
  authenticatedUserId: string,
  barcodeUserId: string,
  recipeUserId: string
) {
  if (barcodeUserId !== authenticatedUserId || recipeUserId !== authenticatedUserId) {
    throw new BarcodeValidationError("cross-tenant-association");
  }
}
