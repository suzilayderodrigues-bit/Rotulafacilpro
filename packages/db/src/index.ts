import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const rootEnvPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".env");

if (!process.env.DATABASE_URL && existsSync(rootEnvPath)) {
  loadEnvFile(rootEnvPath);
}

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({ connectionString });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type {
  Barcode,
  BarcodeType,
  BarcodeValueFormat,
  CommercialPlan,
  Ingredient,
  IngredientBaseUnit,
  IngredientSource,
  Prisma,
  Recipe,
  RecipeCrossContaminationRisk,
  RecipeDisclosureStatus,
  RecipeIngredient,
  RecipePhysicalState,
  User
} from "@prisma/client";

export { FrontOfPackPackagingCondition, FrontOfPackRegulatoryCategory } from "@prisma/client";

