import { BookOpenText, MoonStar, Route } from "lucide-react";
import type { CharacterName } from "@/types/theme";

export function CharacterBadge({ character, label }: { character: CharacterName; label?: string }) {
  const Icon = character === "noval" ? BookOpenText : character === "eden" ? MoonStar : Route;
  return <span className="character-badge" data-character={character}><Icon aria-hidden="true" size={15} /><span>{label ?? (character === "noval" ? "Noval · 晨雾手记" : character === "eden" ? "Eden · 星夜档案" : "Duo · 共同旅途")}</span></span>;
}
