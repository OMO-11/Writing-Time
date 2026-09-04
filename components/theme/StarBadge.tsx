import { Star } from "lucide-react";
export function StarBadge({ label, active = false }: { label: string; active?: boolean }) { return <span className="star-badge" data-active={active}><Star aria-hidden="true" size={14} fill={active ? "currentColor" : "none"} />{label}</span>; }
