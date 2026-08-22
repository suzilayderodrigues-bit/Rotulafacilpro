import { createHmac, randomBytes } from "node:crypto";

function getAuthSecret() {
  return process.env.AUTH_SECRET ?? "development-auth-secret-change-before-production";
}

export function hashToken(token: string) {
  return createHmac("sha256", getAuthSecret()).update(token).digest("hex");
}

export function createRawToken() {
  return randomBytes(32).toString("base64url");
}
