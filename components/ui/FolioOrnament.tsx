import { CompanionEmblem } from "@/components/ui/CompanionEmblem";
/** The binding and dialogs use the same accurately drawn companion symbols. */
export function FolioOrnament({ variant = "paired", className = "" }: { variant?: "paired" | "flower" | "moon"; className?: string }) {
  return <CompanionEmblem variant={variant === "flower" ? "blossom" : variant === "moon" ? "lunar" : "duet"} className={`folio-ornament ${className}`} />;
}
