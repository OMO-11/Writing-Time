import { AtelierDrawing, type AtelierMotif } from "@/components/ui/AtelierDrawing";
const identities: Record<string, { number: string; motif: AtelierMotif; description: string }> = {
  "Content Atlas": { number: "02", motif: "index", description: "将散落的文字、设定与灵感，收进自己的秩序。" },
  Gallery: { number: "04", motif: "frame", description: "光影停留的地方，也是下一个故事的起点。" },
  Settings: { number: "06", motif: "balance", description: "调节书写的节奏，照看每一份本地收藏。" },
  Search: { number: "05", motif: "search", description: "沿着一个词，找回曾经留下的线索。" },
  Reading: { number: "03", motif: "writing", description: "让文字回到阅读本身。" },
};
export function PageShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  const identity = identities[eyebrow];
  return <main className="page-shell" data-page-kind={identity?.motif ?? "index"}>
    <header className="page-title-band atelier-title-band">
      <div><p className="eyebrow"><span className="atelier-section-number">{identity?.number ?? "—"}</span>幻想工坊 / {eyebrow}</p><h1>{title}</h1>{identity && <p className="atelier-page-description">{identity.description}</p>}</div>
      {identity && <AtelierDrawing motif={identity.motif} />}
    </header>{children}
  </main>;
}
