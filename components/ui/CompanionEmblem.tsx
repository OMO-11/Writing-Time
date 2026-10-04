/** Symmetric crystal, five radial petals and a geometrically constructed crescent. */
export function CompanionEmblem({ variant = "crest", className = "" }: { variant?: "crest" | "blossom" | "lunar" | "duet"; className?: string }) {
  return <svg className={`companion-emblem ${className}`} data-emblem={variant} viewBox="0 0 120 120" fill="none" aria-hidden="true" focusable="false">
    {variant === "crest" && <>
      <ellipse cx="60" cy="60" rx="47" ry="17" stroke="currentColor" strokeWidth="1.6" />
      <path d="M60 13 80 60 60 107 40 60Z" fill="var(--emblem-paper,#f7f7f2)" stroke="currentColor" strokeWidth="1.6" />
      <path d="M60 13v94M40 60h40M60 13 51 60 60 107M60 13 69 60 60 107" stroke="currentColor" strokeWidth=".9" />
      <path d="M13 60a47 17 0 0 0 94 0" stroke="currentColor" strokeWidth="1.6" /><circle cx="107" cy="60" r="3" fill="currentColor" />
    </>}
    {(variant === "blossom" || variant === "duet") && <g transform={variant === "duet" ? "translate(-8 10) scale(.8)" : undefined}>
      <path d="M55 66c0 17-6 28-14 43m11-18c-15-2-24-12-22-23 15 4 21 11 22 23m3-12c13-1 21-10 21-21-13 3-20 10-21 21" stroke="#849fa7" strokeWidth="1" />
      <g transform="translate(55 43)" stroke="#718f9d" strokeWidth="1" fill="#fcfcf8">{[0,72,144,216,288].map(angle=><path key={angle} transform={`rotate(${angle})`} d="M0-3C-18-15-13-33 0-31 13-33 18-15 0-3Z" />)}<circle r="4" fill="#c5ad79" stroke="none" /></g>
      <path d="M87 65v20m0 0 7 12-7 16-7-16 7-12Zm0 0v28m-7-16h14" stroke="#829ba9" strokeWidth="1" />
    </g>}
    {(variant === "lunar" || variant === "duet") && <g transform={variant === "duet" ? "translate(45 0) scale(.68)" : undefined}>
      <path d="M72 12a46 46 0 1 0 0 92 49 49 0 0 1 0-92Z" fill="#e9e4f0" stroke="#9383a6" strokeWidth="1.2" />
      <path d="m79 37 3 9 9 3-9 3-3 9-3-9-9-3 9-3Zm18 37 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" stroke="#9383a6" strokeWidth="1" />
      <path d="m79 62 18 12m-4 18-18 15" stroke="#b0a2bd" strokeWidth=".9" strokeDasharray="2 4"/><circle cx="75" cy="107" r="2" fill="#c5ad79" />
    </g>}
  </svg>;
}
