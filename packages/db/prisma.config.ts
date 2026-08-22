import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const rootEnvPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".env");

if (!process.env.DATABASE_URL && existsSync(rootEnvPath)) {
  loadEnvFile(rootEnvPath);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url:
      process.env.DATABASE_URL ?? "postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
  }
});
