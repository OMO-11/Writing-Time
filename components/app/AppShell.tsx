"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CommandPalette } from "@/components/app/CommandPalette";
import { GlobalHeader } from "@/components/app/GlobalHeader";
import { useUIStore } from "@/stores/ui-store";
import { ensureDerivedWorkData } from "@/lib/db";
import { ensureUnifiedContentModel } from "@/lib/content-service";
import { CharacterThemeProvider } from "@/components/theme/CharacterThemeProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const flushSave = useUIStore((state) => state.flushSave);

  useEffect(() => {
    void ensureDerivedWorkData().then(ensureUnifiedContentModel);
  }, []);

  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      const commandKey = event.ctrlKey || event.metaKey;
      if (commandKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (commandKey && event.shiftKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        void flushSave().then(() => router.push("/"));
      }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [flushSave, router, setCommandPaletteOpen]);

  return (
    <CharacterThemeProvider><div className="app-shell">
      <a className="skip-link" href="#app-content">跳到主要内容</a>
      <GlobalHeader />
      <div id="app-content" className="app-shell-content" tabIndex={-1}>{children}</div>
      <CommandPalette />
    </div></CharacterThemeProvider>
  );
}
