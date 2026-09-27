"use client";

import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LayoutDashboard, LogOut, Settings } from "lucide-react";

type UserMenuProps = {
  name: string;
  role: string;
  initials: string;
  showAdmin: boolean;
};

export function UserMenu({ name, role, initials, showAdmin }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Abrir menú de usuario"
        className="flex items-center gap-1.5 rounded-full p-1 pr-1.5 outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 cursor-pointer"
      >
        <Avatar className="h-8 w-8 ring-1 ring-slate-200">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <ChevronDown className="size-3.5 text-slate-400" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <span className="block max-w-full truncate text-[13px] font-semibold text-slate-900">
            {name}
          </span>
          <Badge className="mt-1.5" variant="default">
            {role}
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/dashboard" role="menuitem">
            <LayoutDashboard aria-hidden />
            Panel
          </Link>
        </DropdownMenuItem>
        {showAdmin && (
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/admin" role="menuitem">
              <Settings aria-hidden />
              Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <form action={logoutAction} className="p-0">
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" role="menuitem" className="w-full cursor-pointer">
              <LogOut aria-hidden />
              Salir
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
