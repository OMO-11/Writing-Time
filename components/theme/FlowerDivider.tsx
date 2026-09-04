export function FlowerDivider({ decorative = true }: { decorative?: boolean }) { return <span className="flower-divider" aria-hidden={decorative || undefined}><i /><b /><i /></span>; }
