/** Original instrument drawings: each surface gets its own silhouette. */
export type AtelierMotif = "observatory" | "index" | "frame" | "balance" | "search" | "writing";
export function AtelierDrawing({ motif, className = "" }: { motif: AtelierMotif; className?: string }) {
  return <svg className={`atelier-drawing ${className}`} data-drawing={motif} viewBox="0 0 320 220" fill="none" aria-hidden="true" focusable="false">
    {motif === "observatory" && <>
      <ellipse cx="174" cy="110" rx="112" ry="42" transform="rotate(-24 174 110)" stroke="var(--atelier-violet)" strokeWidth=".8" />
      <path d="M88 166A91 91 0 1 1 258 77M75 181h210M174 14v15m0 166v12M70 110h16m179 0h17" stroke="var(--atelier-blue)" strokeWidth=".8" />
      <path d="m168 44 35 64-35 71-33-71 33-64Z" fill="var(--atelier-wash)" stroke="var(--atelier-blue)" strokeWidth="1" />
      <path d="m168 44 4 67-37-3m37 3 31-3m-31 3-4 68" stroke="var(--atelier-blue)" strokeWidth=".7" />
      <circle cx="267" cy="75" r="4" fill="var(--atelier-gold)" /><circle cx="82" cy="140" r="2" fill="var(--atelier-violet)" />
      <path d="M30 180h25m-12-12v25M229 31l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" stroke="var(--atelier-violet)" strokeWidth=".8" />
    </>}
    {motif === "index" && <>
      <path d="M68 63h174v117H68z" fill="var(--atelier-wash)" stroke="var(--atelier-blue)" strokeWidth=".8" />
      <path d="M78 63V46h65l10 9h98v112m-158-121V32h57l12 9h104v111" stroke="var(--atelier-violet)" strokeWidth=".8" />
      <path d="M96 94h67m-67 16h103M96 146h25m8 0h8m65-12v22m7-22v22m4-22v22m7-22v22" stroke="var(--atelier-blue)" strokeWidth="1" />
      <path d="m48 117 7-13 7 13-7 16-7-16Zm7-13v29M249 187h31" stroke="var(--atelier-violet)" strokeWidth=".8" />
      <circle cx="240" cy="36" r="3" fill="var(--atelier-gold)" />
    </>}
    {motif === "frame" && <>
      <path d="M66 48h178v124H66z" stroke="var(--atelier-violet)" strokeWidth=".8" /><path d="M81 62h148v94H81z" fill="var(--atelier-wash)" />
      <path d="m81 144 47-46 30 30 30-19 41 34M46 67V29h42m138 0h38v38m0 87v37h-38M88 191H46v-37" stroke="var(--atelier-blue)" strokeWidth=".8" />
      <circle cx="191" cy="83" r="11" stroke="var(--atelier-violet)" strokeWidth=".8" /><path d="M128 201h55" stroke="var(--atelier-violet)" /><circle cx="193" cy="201" r="2" fill="var(--atelier-gold)" />
    </>}
    {motif === "balance" && <>
      <path d="M76 54h174M76 109h174M76 165h174" stroke="var(--atelier-blue)" strokeWidth=".8" />
      <circle cx="119" cy="54" r="14" fill="var(--atelier-paper)" stroke="var(--atelier-violet)" /><circle cx="211" cy="109" r="14" fill="var(--atelier-paper)" stroke="var(--atelier-blue)" /><circle cx="146" cy="165" r="14" fill="var(--atelier-paper)" stroke="var(--atelier-violet)" />
      <path d="M119 48v12m-6-6h12m86 49v12m-6-6h12m-65 56h12M62 40v137m-6-137h12m-12 137h12" stroke="var(--atelier-blue)" strokeWidth=".8" />
      <circle cx="263" cy="54" r="2" fill="var(--atelier-gold)" />
    </>}
    {motif === "search" && <>
      <circle cx="153" cy="99" r="60" stroke="var(--atelier-violet)" strokeWidth=".8" /><circle cx="153" cy="99" r="43" fill="var(--atelier-wash)" stroke="var(--atelier-blue)" strokeWidth=".8" />
      <path d="m198 144 47 46M153 21v20m0 116v20M75 99h20m116 0h20m-101 0h46m-23-23v46" stroke="var(--atelier-blue)" strokeWidth=".8" /><circle cx="169" cy="84" r="3" fill="var(--atelier-gold)" />
    </>}
    {motif === "writing" && <>
      <path d="m90 178 19-50L218 26l16 17-110 102-34 33Z" fill="var(--atelier-wash)" stroke="var(--atelier-blue)" strokeWidth=".8" /><path d="m109 128 15 17m-34 33 26-41M71 190h177M78 67h47m-47 17h30m70 99v14m18-14v14m18-14v14" stroke="var(--atelier-blue)" strokeWidth=".8" />
      <path d="M186 64c57 5 65 60 40 87" stroke="var(--atelier-violet)" strokeWidth=".8" strokeDasharray="2 5" /><circle cx="228" cy="150" r="3" fill="var(--atelier-gold)" />
    </>}
  </svg>;
}
