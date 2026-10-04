import type { ReactNode } from "react";
import { CharacterIllustration } from "@/components/theme/CharacterIllustration";
import type { CharacterName, CharacterVariant } from "@/types/theme";

export function CharacterEmptyState({ character, variant, title, description, actions, compact = false }: { character: CharacterName; variant: CharacterVariant; title: string; description: string; actions?: ReactNode; compact?: boolean }) {
  return <section className="character-empty-state" data-character={character} data-compact={compact}><CharacterIllustration character={character} variant={variant} placement="left" size={compact ? "sm" : "md"} /><div><h2>{title}</h2><p>{description}</p>{actions ? <div className="character-empty-actions">{actions}</div> : null}</div></section>;
}
