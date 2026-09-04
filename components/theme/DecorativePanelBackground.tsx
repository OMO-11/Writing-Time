import type { CharacterTheme } from "@/types/theme";
export function DecorativePanelBackground({ theme, children, className = "" }: { theme: CharacterTheme; children: React.ReactNode; className?: string }) { return <div className={`decorative-panel ${className}`} data-panel-theme={theme}><span aria-hidden="true" />{children}</div>; }
