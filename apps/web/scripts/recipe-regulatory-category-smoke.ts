import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FrontOfPackRegulatoryCategory } from "@rotula-facil-pro/db";
import {
  evaluateFrontOfPackApplicability,
  frontOfPackRegulatoryCategoryOptions
} from "../src/lib/regulatory";
import {
  RecipeValidationError,
  validateRecipeInformationInput,
  validateRecipeInput,
  validateRegulatoryCategory
} from "../src/lib/recipes/domain";

const optionValues = frontOfPackRegulatoryCategoryOptions.map(({ value }) => value).sort();
const enumValues = Object.values(FrontOfPackRegulatoryCategory).sort();
assert.deepEqual(optionValues, enumValues, "A triagem deve exibir exatamente todas as categorias do enum.");
assert.equal(new Set(optionValues).size, optionValues.length, "A triagem não pode duplicar categorias.");

assert.equal(validateRegulatoryCategory("OUTSIDE_ANNEX_XVI"), "OUTSIDE_ANNEX_XVI");
assert.equal(validateRegulatoryCategory("CHEESE"), "CHEESE");
assert.equal(validateRegulatoryCategory("MAMMAL_MILK"), "MAMMAL_MILK");
assert.throws(
  () => validateRegulatoryCategory("PALHA_ITALIANA"),
  (error: unknown) => error instanceof RecipeValidationError && error.code === "invalid-regulatory-category"
);
assert.throws(
  () => validateRecipeInformationInput({ regulatoryCategory: null, reviewed: true }),
  (error: unknown) => error instanceof RecipeValidationError && error.code === "invalid-regulatory-category"
);

const legacy = validateRecipeInput({
  name: "Receita antiga",
  foodCategory: "Palha italiana",
  physicalState: "SOLID_OR_SEMISOLID",
  finalYieldUnit: "GRAM"
});
assert.equal(legacy.regulatoryCategory, null, "Receita antiga deve permanecer sem classificação.");
assert.notEqual(legacy.regulatoryCategory, "OUTSIDE_ANNEX_XVI", "Nome comercial não pode ser classificado por heurística.");

const information = validateRecipeInformationInput({
  regulatoryCategory: "CHEESE",
  glutenStatus: "DOES_NOT_CONTAIN",
  lactoseStatus: "CONTAINS",
  crossContaminationRisk: "NO",
  reviewed: true
});
assert.equal(information.regulatoryCategory, "CHEESE");
assert.equal(evaluateFrontOfPackApplicability({ regulatoryCategory: information.regulatoryCategory }).status, "REQUIRES_REVIEW");
assert.equal(evaluateFrontOfPackApplicability({ regulatoryCategory: "MAMMAL_MILK" }).status, "NOT_APPLICABLE");

const previewSource = readFileSync(new URL("../src/lib/final-label/preview.ts", import.meta.url), "utf8");
const summarySource = readFileSync(new URL("../src/app/receitas/[recipeId]/page.tsx", import.meta.url), "utf8");
const informationSource = readFileSync(new URL("../src/app/receitas/[recipeId]/informacoes/page.tsx", import.meta.url), "utf8");
const migrationSource = readFileSync(
  new URL("../../../packages/db/prisma/migrations/20260921120000_recipe_regulatory_category/migration.sql", import.meta.url),
  "utf8"
);

assert(previewSource.includes("regulatoryCategory: recipe.regulatoryCategory"));
assert(summarySource.includes("regulatoryCategory: recipe.regulatoryCategory"));
assert(informationSource.includes('defaultValue={recipe.regulatoryCategory ?? ""}'));
assert(migrationSource.includes('ADD COLUMN "regulatoryCategory" "FrontOfPackRegulatoryCategory";'));
assert(!migrationSource.includes("NOT NULL"), "A coluna de receitas antigas deve permanecer nullable.");
assert(!migrationSource.match(/UPDATE|DELETE|DROP TABLE/i), "A migration deve ser somente aditiva.");

console.log("Classificação regulatória: taxonomia, validação, legado null, triagem e fluxo 7J: OK.");
