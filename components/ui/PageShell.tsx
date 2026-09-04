export function PageShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <main className="page-shell">
      <header className="page-title-band"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></header>
      {children}
    </main>
  );
}
