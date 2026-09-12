import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertBarcodeRecipeOwnership,
  BarcodeValidationError,
  createInternalBarcodeDraft,
  validateOfficialGtin
} from "../src/lib/barcodes/domain";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectError(input: string, code: BarcodeValidationError["code"]) {
  try {
    validateOfficialGtin(input);
  } catch (error) {
    assert(error instanceof BarcodeValidationError && error.code === code, `${input}: erro ${code} esperado.`);
    return;
  }

  throw new Error(`${input}: entrada inválida foi aceita.`);
}

function expectCrossTenant(run: () => unknown) {
  try {
    run();
  } catch (error) {
    assert(
      error instanceof BarcodeValidationError && error.code === "cross-tenant-association",
      "Associação cruzada deve ser rejeitada."
    );
    return;
  }

  throw new Error("Associação cruzada foi aceita.");
}

function main() {
  const validCases = [
    ["96385074", "GTIN_8"],
    ["036000291452", "GTIN_12"],
    ["4006381333931", "GTIN_13"],
    ["10012345000017", "GTIN_14"]
  ] as const;

  for (const [value, format] of validCases) {
    const result = validateOfficialGtin(value);
    assert(result.value === value, `${format}: valor não foi preservado.`);
    assert(result.format === format, `${value}: formato incorreto.`);
    assert(result.type === "OFFICIAL_GTIN", `${value}: tipo oficial incorreto.`);
  }

  const leadingZero = validateOfficialGtin(" 00012348 ");
  assert(leadingZero.value === "00012348", "Zeros à esquerda devem ser preservados como string.");
  assert(typeof leadingZero.value === "string", "GTIN nunca pode ser convertido para Number.");

  expectError("96385075", "invalid-check-digit");
  expectError("1234567", "invalid-length");
  expectError("40063813A3931", "invalid-characters");
  expectError("40063813-3931", "invalid-characters");
  expectError("", "empty-value");
  expectError("   ", "empty-value");

  const internal = createInternalBarcodeDraft(() => "123e4567-e89b-42d3-a456-426614174000");
  assert(internal.type === "INTERNAL", "Código interno deve ter tipo INTERNAL.");
  assert(internal.format === "INTERNAL", "Código interno deve ter formato de valor INTERNAL.");
  assert(internal.value === "RF-I-123e4567-e89b-42d3-a456-426614174000", "Prefixo INTERNAL incorreto.");
  assert(!/^\d+$/.test(internal.value), "INTERNAL não pode parecer um GTIN/EAN puramente numérico.");

  assertBarcodeRecipeOwnership("user-a", "user-a", "user-a");
  expectCrossTenant(() => assertBarcodeRecipeOwnership("user-a", "user-b", "user-a"));
  expectCrossTenant(() => assertBarcodeRecipeOwnership("user-a", "user-a", "user-b"));

  const schema = readFileSync(resolve(process.cwd(), "../../packages/db/prisma/schema.prisma"), "utf8");
  assert(schema.includes("recipeId  String?            @unique"), "Recipe deve aceitar no máximo um Barcode.");
  assert(schema.includes("@@unique([userId, value])"), "Valor deve ser único apenas dentro do usuário.");
  assert(!schema.includes("value     String             @unique"), "Valor não pode ter unicidade global.");
  assert(schema.includes("recipe Recipe?"), "Barcode deve poder existir sem Recipe.");

  console.log(
    JSON.stringify(
      {
        gtin8: "OK",
        gtin12: "OK",
        gtin13: "OK",
        gtin14: "OK",
        checkDigit: "OK",
        invalidLength: "OK",
        invalidCharacters: "OK",
        leadingZeroPreserved: "OK",
        stringOnly: "OK",
        internalSeparated: "OK",
        internalPrefix: "OK",
        uniquePerUserSchema: "OK",
        sameValueAcrossUsersSchema: "OK",
        oneBarcodePerRecipeSchema: "OK",
        optionalRecipe: "OK",
        crossTenantAssociationBlocked: "OK"
      },
      null,
      2
    )
  );
}

main();
