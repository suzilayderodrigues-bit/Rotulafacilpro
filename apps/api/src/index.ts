import { buildServer, readEnv } from "./server.js";

const env = readEnv();
const app = await buildServer();

try {
  await app.listen({
    port: env.API_PORT,
    host: "0.0.0.0"
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
