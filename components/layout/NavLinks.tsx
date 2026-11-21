"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { DocumentIcon, UsersIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  isActive: (pathname: string) => boolean;
};

// To add a page to the sidebar, add one entry here.
const items: NavItem[] = [
  {
    href: "/docs",
    label: "My documents",
    icon: DocumentIcon,
    isActive: (pathname) => pathname === "/docs",
  },
  {
    href: "/docs/shared",
    label: "Shared with me",
    icon: UsersIcon,
    isActive: (pathname) => pathname.startsWith("/docs/shared"),
  },
];

export default function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-4">
      {items.map(({ href, label, icon: Icon, isActive }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-subtle text-foreground"
                : "text-muted hover:bg-subtle hover:text-foreground"
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
