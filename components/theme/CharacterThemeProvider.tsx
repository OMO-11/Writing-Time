"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { db } from "@/lib/db";
import { useUIStore } from "@/stores/ui-store";
import type { CharacterTheme } from "@/types/theme";

function routeTheme(pathname: string): CharacterTheme {
  if (pathname === "/" || pathname.startsWith("/content") || pathname.startsWith("/library") || pathname.startsWith("/settings")) return "balanced";
  if (pathname.startsWith("/workbench") || pathname.startsWith("/work/")) return "noval";
  if (pathname.startsWith("/gallery") || pathname.startsWith("/search") || pathname.startsWith("/wiki")) return "eden";
  return "balanced";
}

export function CharacterThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { illustrationMode, textureMode, motionMode, themePreference, setCharacterPreferences } = useUIStore();
  const theme = useMemo(() => themePreference === "auto" ? routeTheme(pathname) : themePreference, [pathname, themePreference]);

  useEffect(() => {
    void db.settings.get("character-display-preferences").then((record) => {
      if (record?.value && typeof record.value === "object") setCharacterPreferences(record.value);
    });
  }, [setCharacterPreferences]);

  useEffect(() => {
    document.documentElement.dataset.characterTheme = theme;
    document.documentElement.dataset.characterDisplay = illustrationMode;
    document.documentElement.dataset.decorativeTexture = textureMode;
    document.documentElement.dataset.characterMotion = motionMode;
  }, [illustrationMode, motionMode, textureMode, theme]);

  return <div className="character-theme-root" data-character-theme={theme} data-character-display={illustrationMode} data-decorative-texture={textureMode} data-character-motion={motionMode}>{children}</div>;
}
