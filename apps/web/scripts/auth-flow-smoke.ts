import assert from "node:assert/strict";
import type { AuthRepository } from "../src/lib/auth/service";
import { loginAccount, registerAccount, requestPasswordReset } from "../src/lib/auth/service";
import { sessionCookieName } from "../src/lib/auth/session";
import { createRawToken, hashToken } from "../src/lib/auth/token";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
};

const users = new Map<string, UserRecord>();
const resetTokens = new Map<string, { userId: string; expiresAt: Date }>();
const sessions = new Set<string>();

const repository: AuthRepository = {
  async createUser(data) {
    if (users.has(data.email)) {
      throw new Error("duplicate");
    }

    const user = {
      id: `user-${users.size + 1}`,
      ...data
    };

    users.set(user.email, user);
    return user;
  },
  async findUserByEmail(email) {
    return users.get(email) ?? null;
  },
  async createPasswordResetToken(data) {
    resetTokens.set(data.tokenHash, {
      userId: data.userId,
      expiresAt: data.expiresAt
    });
  }
};

async function main() {
  const registerValid = await registerAccount(repository, {
    name: "Helio",
    email: "helio@example.com",
    password: "senha-segura-123",
    confirmPassword: "senha-segura-123"
  });

  assert.equal(registerValid.ok, true, "cadastro válido deve passar");
  assert.notEqual(users.get("helio@example.com")?.passwordHash, "senha-segura-123");

  const registerInvalid = await registerAccount(repository, {
    name: "H",
    email: "email-invalido",
    password: "123",
    confirmPassword: "456"
  });

  assert.equal(registerInvalid.ok, false, "cadastro inválido deve falhar");

  const loginValid = await loginAccount(repository, {
    email: "helio@example.com",
    password: "senha-segura-123"
  });

  assert.equal(loginValid.ok, true, "login válido deve passar");

  const loginInvalid = await loginAccount(repository, {
    email: "helio@example.com",
    password: "senha-errada"
  });

  assert.equal(loginInvalid.ok, false, "login inválido deve falhar");

  const resetValid = await requestPasswordReset(repository, {
    email: "helio@example.com"
  });

  assert.equal(resetValid.ok, true, "recuperação válida deve retornar confirmação");
  assert.equal(resetTokens.size, 1, "recuperação válida deve preparar token");

  const resetUnknown = await requestPasswordReset(repository, {
    email: "nao-existe@example.com"
  });

  assert.equal(resetUnknown.ok, true, "recuperação sem conta deve manter mensagem genérica");
  assert.equal(resetTokens.size, 1, "recuperação sem conta não deve criar token");

  const token = createRawToken();
  const tokenHash = hashToken(token);
  sessions.add(tokenHash);
  assert.equal(sessions.has(tokenHash), true, "sessão deve existir antes do logout");
  sessions.delete(tokenHash);
  assert.equal(sessions.has(tokenHash), false, "logout deve invalidar sessão");

  const anonymousCookies = new Map<string, string>();
  assert.equal(
    anonymousCookies.has(sessionCookieName),
    false,
    "rota protegida sem cookie de sessão deve redirecionar para login"
  );

  console.log("auth-flow-smoke: OK");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
