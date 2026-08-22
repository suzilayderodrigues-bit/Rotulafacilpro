import { hashPassword, verifyPassword } from "./password";
import { createRawToken, hashToken } from "./token";
import { loginSchema, registerSchema, resetRequestSchema } from "./validation";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
};

export type AuthRepository = {
  createUser(data: { name: string; email: string; passwordHash: string }): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
};

export type AuthResult =
  | { ok: true; user: Pick<UserRecord, "id" | "name" | "email"> }
  | { ok: false; reason: "invalid" | "unavailable" };

export async function registerAccount(
  repository: AuthRepository,
  input: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }
): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  try {
    const user = await repository.createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password)
    });

    return {
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export async function loginAccount(
  repository: AuthRepository,
  input: {
    email: string;
    password: string;
  }
): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, reason: "invalid" };
  }

  const user = await repository.findUserByEmail(parsed.data.email);

  if (!user) {
    return { ok: false, reason: "invalid" };
  }

  const passwordIsValid = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!passwordIsValid) {
    return { ok: false, reason: "invalid" };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  };
}

export async function requestPasswordReset(
  repository: AuthRepository,
  input: {
    email: string;
  }
) {
  const parsed = resetRequestSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const user = await repository.findUserByEmail(parsed.data.email);

  if (user) {
    const minutes = Number(process.env.PASSWORD_RESET_TOKEN_MINUTES ?? "30");
    const expiresAt = new Date(Date.now() + (Number.isFinite(minutes) ? minutes : 30) * 60 * 1000);
    const token = createRawToken();

    await repository.createPasswordResetToken({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt
    });
  }

  return { ok: true as const };
}
