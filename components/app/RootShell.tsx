"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { ReturnToMap } from "@/components/app/ReturnToMap";

export function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortalSurface = pathname === "/" || pathname.startsWith("/archive-gallery");

  if (isPortalSurface) {
    return <>{children}<ReturnToMap key={pathname} /></>;
  }

  return <><AppShell>{children}</AppShell><ReturnToMap key={pathname} /></>;
}
