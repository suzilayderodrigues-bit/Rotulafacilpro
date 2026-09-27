import { buildServer, readEnv, resolvePort } from "./server.js";

const env = readEnv();
const app = await buildServer();

try {
  await app.listen({
    port: resolvePort(env),
    host: "0.0.0.0"
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
