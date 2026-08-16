import cors from "@fastify/cors";
import Fastify from "fastify";
import { z } from "zod";

const envSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(3333),
  CORS_ORIGIN: z.string().optional(),
  NODE_ENV: z.string().default("development")
});

export function readEnv() {
  return envSchema.parse(process.env);
}

export async function buildServer() {
  const env = readEnv();
  const app = Fastify({
    logger: true
  });

  const corsOrigin =
    env.CORS_ORIGIN ?? (env.NODE_ENV === "production" ? false : "http://localhost:3000");

  await app.register(cors, {
    origin: corsOrigin
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "rotula-facil-pro-api"
  }));

  return app;
}
