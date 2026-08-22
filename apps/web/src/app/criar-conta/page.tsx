import Link from "next/link";
import { Button, Input, Label } from "@/components/design-system";
import { AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { registerAction } from "@/lib/auth/actions";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RegisterPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const error = firstValue(params.error);

  return (
    <AuthShell title="Criar conta" description="Crie o primeiro acesso usando nome, e-mail e senha.">
      {error ? (
        <AuthMessage type="error">Não foi possível criar a conta com os dados informados.</AuthMessage>
      ) : null}
      <form action={registerAction} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirmar senha</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Criar conta
        </Button>
      </form>
      <p className="mt-5 text-sm text-[var(--muted)]">
        Já tem conta?{" "}
        <Link className="font-semibold text-[var(--brand-petrol)] hover:text-[var(--brand-tiffany)]" href="/login">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
