import { prisma } from "../index";
import { buildBaseRotulaIngredientCreateManyInput } from "./base-rotula-ingredients";

const laticiniosCategory = "Laticínios";

async function main() {
  const data = buildBaseRotulaIngredientCreateManyInput();

  if (data.length !== 15) {
    throw new Error(`Base Rotula Laticínios esperava 15 registros, encontrou ${data.length}.`);
  }

  const existingCount = await prisma.ingredient.count({
    where: {
      source: "BASE_ROTULA",
      category: laticiniosCategory
    }
  });

  if (existingCount > 0) {
    throw new Error(
      `Importação interrompida: já existem ${existingCount} registros BASE_ROTULA em Laticínios.`
    );
  }

  await prisma.ingredient.createMany({ data });

  const count = await prisma.ingredient.count({
    where: { source: "BASE_ROTULA", category: laticiniosCategory }
  });

  if (count !== 15) {
    throw new Error(`Importação esperava 15 registros, encontrou ${count}.`);
  }

  console.log("BASE_ROTULA_LATICINIOS_IMPORTED=15");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Erro desconhecido na importação.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
