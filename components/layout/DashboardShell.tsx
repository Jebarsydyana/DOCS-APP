"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import NavLinks from "@/components/layout/NavLinks";
import NewDocumentButton from "@/components/documents/NewDocumentButton";
import Avatar from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import { signOutAction } from "@/app/docs/actions";
import { appName } from "@/lib/config";

type DashboardShellProps = {
  user: { name: string | null; email: string };
  children: ReactNode;
};

export default function DashboardShell({ user, children }: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const displayName = user.name || user.email;

  // Same sidebar content is used for the desktop sidebar and the mobile drawer.
  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between px-5">
        <Link href="/docs" onClick={closeMenu} className="text-lg font-semibold tracking-tight">
          {appName}
        </Link>
        <button
          type="button"
          onClick={closeMenu}
          aria-label="Close menu"
          className="rounded-md p-1 text-muted hover:bg-subtle md:hidden"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="px-3">
        <NewDocumentButton fullWidth />
      </div>

      <NavLinks onNavigate={closeMenu} />

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3">
          <Avatar name={displayName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
            {user.name && <p className="truncate text-xs text-muted">{user.email}</p>}
          </div>
        </div>
        <form action={signOutAction} className="mt-3">
          <Button type="submit" variant="secondary" size="sm" className="w-full">
            Log out
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-surface md:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="absolute inset-0 bg-black/30"
          />
          <aside className="relative h-full w-64 bg-surface shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="md:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1 text-muted hover:bg-subtle"
          >
            <MenuIcon />
          </button>
          <span className="font-semibold tracking-tight">{appName}</span>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
