import { FileDown, FilePlus2 } from "lucide-react";
import { HOME_DEMO_COPY } from "@/components/home/demo-data";

export function EmptyState({ onNewWork, onImportMarkdown }: { onNewWork: () => void; onImportMarkdown: () => void }) {
  return (
    <section className="home-empty-state" data-character-theme="noval" aria-labelledby="home-empty-title">
      <span className="atelier-first-page" aria-hidden="true"><b>00</b><i />起笔之前</span>
      <div>
        <p className="home-eyebrow">YOUR FIRST PAGE</p>
        <h2 id="home-empty-title">{HOME_DEMO_COPY.emptyTitle}</h2>
        <p>{HOME_DEMO_COPY.emptyDescription}</p>
        <div className="empty-actions">
          <button className="paper-button paper-button-primary" type="button" onClick={onNewWork}><FilePlus2 aria-hidden="true" size={17} />新建作品</button>
          <button className="paper-button paper-button-secondary" type="button" onClick={onImportMarkdown}><FileDown aria-hidden="true" size={17} />导入 Markdown</button>
        </div>
      </div>
    </section>
  );
}
