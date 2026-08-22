import Link from "next/link";
import { Button, Checkbox, Input, Label } from "@/components/design-system";
import { AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { loginAction } from "@/lib/auth/actions";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const error = firstValue(params.error);
  const status = firstValue(params.status);

  return (
    <AuthShell title="Entrar" description="Acesse sua conta para continuar no Rotula Fácil Pro.">
      {error && error !== "auth-required" ? (
        <AuthMessage type="error">E-mail ou senha inválidos.</AuthMessage>
      ) : null}
      {status === "logged-out" ? <AuthMessage type="success">Sessão encerrada com sucesso.</AuthMessage> : null}
      {error === "auth-required" ? (
        <AuthMessage type="error">Entre com sua conta para continuar.</AuthMessage>
      ) : null}
      <form action={loginAction} className="space-y-4">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <PasswordField id="password" name="password" label="Senha" autoComplete="current-password" required />
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Checkbox label="Lembrar de mim" name="remember" className="accent-[var(--accent-orange)]" />
          <Link className="font-semibold text-[var(--brand-petrol)] hover:text-[var(--accent-orange)]" href="/recuperar-senha">
            Esqueci minha senha
          </Link>
        </div>
        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-[var(--muted)]">
        Ainda não tem conta?{" "}
        <Link className="font-semibold text-[var(--brand-petrol)] hover:text-[var(--accent-orange)]" href="/criar-conta">
          Criar conta
        </Link>
      </p>
    </AuthShell>
  );
}

