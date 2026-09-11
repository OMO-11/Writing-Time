"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";

export function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortalSurface = pathname === "/" || pathname.startsWith("/archive-gallery");

  if (isPortalSurface) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
