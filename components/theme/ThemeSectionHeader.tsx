import { CharacterBadge } from "@/components/theme/CharacterBadge";
import type { CharacterName } from "@/types/theme";
export function ThemeSectionHeader({ character, eyebrow, title, action }: { character: CharacterName; eyebrow?: string; title: string; action?: React.ReactNode }) { return <header className="theme-section-header"><div>{eyebrow ? <p>{eyebrow}</p> : null}<h2>{title}</h2></div><CharacterBadge character={character} />{action}</header>; }
