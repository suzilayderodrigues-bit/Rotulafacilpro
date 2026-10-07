import assert from "node:assert/strict";
import { prisma } from "@rotula-facil-pro/db";

/** Snapshot IDs and all persisted values; expansion never changes the expected count to a new magic number. */
export async function snapshotBaseRotula() {
  return prisma.ingredient.findMany({ where: { source: "BASE_ROTULA" }, orderBy: { id: "asc" } });
}
export async function assertBaseRotulaPreserved(before: Awaited<ReturnType<typeof snapshotBaseRotula>>) {
  const after = await snapshotBaseRotula();
  const current = new Map(after.map((row) => [row.id, row]));
  for (const row of before) assert.deepEqual(current.get(row.id), row, `Ingrediente histórico alterado/removido: ${row.id}`);
}
