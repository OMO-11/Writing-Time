/** An upright gemstone held by a crescent; deliberately legible at 40px. */
export function WorkshopLogo() {
  return <svg className="workshop-logo" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
    {/* Circular arcs share mirrored tips around y=32, keeping the crescent balanced. */}
    <path d="M36 7A25 25 0 0 0 36 57A27 27 0 0 1 36 7Z" fill="#d9d1e4" stroke="#9483a7" strokeWidth="1.25" />
    <path d="m35 12 13 20-13 24-13-24Z" fill="#e1edf0" stroke="#66899a" strokeWidth="1.4" />
    <path d="m35 12-5 20 5 24 5-24-5-20ZM22 32h26" stroke="#799aaa" strokeWidth=".9" />
    <path d="m52 16 1.7 4.3L58 22l-4.3 1.7L52 28l-1.7-4.3L46 22l4.3-1.7Z" fill="#c0aa7f" />
  </svg>;
}
