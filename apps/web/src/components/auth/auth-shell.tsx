import Image from "next/image";
import icon from "../../../../../assets/branding/icone.png.jpg";
import { Card } from "@/components/design-system";

export function AuthShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8 text-[var(--foreground)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-6 flex items-center gap-3">
          <Image
            src={icon}
            alt="Ícone oficial do Rotula Fácil Pro"
            className="size-11 rounded-[var(--radius-md)] object-cover"
            priority
          />
          <p className="text-base font-semibold">Rotula Fácil Pro</p>
        </div>
        <Card className="p-6">
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
          <div className="mt-6">{children}</div>
        </Card>
      </div>
    </main>
  );
}

export function AuthMessage({
  type,
  children
}: {
  type: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        type === "error"
          ? "mb-4 rounded-[var(--radius-md)] border border-[#f0c4c0] bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)]"
          : "mb-4 rounded-[var(--radius-md)] border border-[#bfead4] bg-[var(--success-bg)] px-3 py-2 text-sm text-[var(--success)]"
      }
    >
      {children}
    </div>
  );
}
