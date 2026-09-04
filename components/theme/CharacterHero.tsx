import type { ReactNode } from "react";
import { CharacterIllustration } from "@/components/theme/CharacterIllustration";
import type { CharacterName, CharacterVariant } from "@/types/theme";

export function CharacterHero({ character, variant, eyebrow, title, description, children, priority = false, className = "" }: { character: CharacterName; variant: CharacterVariant; eyebrow?: string; title: string; description?: string; children?: ReactNode; priority?: boolean; className?: string }) {
  return <section className={`character-hero ${className}`} data-character-hero={character}><div className="character-hero-copy">{eyebrow ? <p className="theme-eyebrow">{eyebrow}</p> : null}<h1>{title}</h1>{description ? <p>{description}</p> : null}{children}</div><CharacterIllustration character={character} variant={variant} placement="right" size="lg" fade priority={priority} /></section>;
}
