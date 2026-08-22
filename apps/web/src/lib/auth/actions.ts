"use server";

import { redirect } from "next/navigation";
import { prismaAuthRepository } from "./repository";
import { createSession, destroySession } from "./session";
import { loginAccount, registerAccount, requestPasswordReset } from "./service";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function registerAction(formData: FormData) {
  const result = await registerAccount(prismaAuthRepository, {
    name: formValue(formData, "name"),
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword")
  });

  if (!result.ok) {
    redirect(`/criar-conta?error=${result.reason}`);
  }

  await createSession(result.user.id);
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const result = await loginAccount(prismaAuthRepository, {
    email: formValue(formData, "email"),
    password: formValue(formData, "password")
  });

  if (!result.ok) {
    redirect("/login?error=invalid");
  }

  await createSession(result.user.id);
  redirect("/dashboard");
}

export async function requestPasswordResetAction(formData: FormData) {
  const result = await requestPasswordReset(prismaAuthRepository, {
    email: formValue(formData, "email")
  });

  if (!result.ok) {
    redirect("/recuperar-senha?error=invalid");
  }

  redirect("/recuperar-senha?sent=1");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login?status=logged-out");
}

