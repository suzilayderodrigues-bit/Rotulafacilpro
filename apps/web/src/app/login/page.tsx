import Link from "next/link";
import { Button, Input, Label } from "@/components/design-system";
import { AuthMessage, AuthShell } from "@/components/auth/auth-shell";
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
    <AuthShell title="Entrar" description="Acesse sua conta para validar a sessão do sistema.">
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
        <div>
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link className="font-semibold text-[var(--brand-petrol)] hover:text-[var(--brand-tiffany)]" href="/recuperar-senha">
          Esqueci minha senha
        </Link>
        <Link className="font-semibold text-[var(--brand-petrol)] hover:text-[var(--brand-tiffany)]" href="/criar-conta">
          Criar conta
        </Link>
      </div>
    </AuthShell>
  );
}
