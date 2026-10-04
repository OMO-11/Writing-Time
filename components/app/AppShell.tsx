"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CommandPalette } from "@/components/app/CommandPalette";
import { GlobalHeader } from "@/components/app/GlobalHeader";
import { useUIStore } from "@/stores/ui-store";
import { ensureDerivedWorkData } from "@/lib/db";
import { ensureUnifiedContentModel } from "@/lib/content-service";
import { CharacterThemeProvider } from "@/components/theme/CharacterThemeProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const flushSave = useUIStore((state) => state.flushSave);

  useEffect(() => {
    void ensureDerivedWorkData().then(ensureUnifiedContentModel);
  }, []);

  useEffect(() => {
    const navigate = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element).closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || !useUIStore.getState().saveHandler) return;
      const target = new URL(anchor.href, location.href);
      if (target.origin !== location.origin || target.pathname === location.pathname && target.search === location.search) return;
      event.preventDefault(); event.stopPropagation();
      void flushSave().then(() => router.push(target.pathname + target.search + target.hash)).catch(() => {});
    };
    document.addEventListener("click", navigate, true);
    return () => document.removeEventListener("click", navigate, true);
  }, [flushSave, router]);

  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      const commandKey = event.ctrlKey || event.metaKey;
      if (commandKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (commandKey && event.shiftKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        void flushSave().then(() => router.push("/workshop"));
      }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [flushSave, router, setCommandPaletteOpen]);

  return (
    <CharacterThemeProvider><div className={`app-shell${pathname === "/workshop" ? "" : " atelier-shell"}`} data-surface={pathname.split("/")[1] || "workshop"}>
      <a className="skip-link" href="#app-content">跳到主要内容</a>
      <GlobalHeader />
      <div id="app-content" className="app-shell-content" tabIndex={-1}>{children}</div>
      <CommandPalette />
    </div></CharacterThemeProvider>
  );
}
