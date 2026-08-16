import Image from "next/image";
import { Bell, Search, UserCircle } from "lucide-react";
import icon from "../../../../../assets/branding/icone.png.jpg";
import { Button } from "@/components/design-system/button";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-[var(--brand-navy)] px-4 text-white shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src={icon}
          alt="Ícone oficial do Rotula Fácil Pro"
          className="size-9 rounded-[var(--radius-md)] object-cover"
          priority
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">Rotula Fácil Pro</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="hidden h-9 border-white/10 px-2 text-white hover:bg-white/10 sm:inline-flex" aria-label="Buscar">
          <Search className="size-4" />
        </Button>
        <Button variant="ghost" className="h-9 border-white/10 px-2 text-white hover:bg-white/10" aria-label="Notificações">
          <Bell className="size-4" />
        </Button>
        <Button variant="ghost" className="h-9 border-white/10 px-2 text-white hover:bg-white/10" aria-label="Perfil">
          <UserCircle className="size-5" />
        </Button>
      </div>
    </header>
  );
}
