import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WorkCard } from "@/components/home/WorkCard";
import type { ImageRecord, WorkRecord } from "@/types/workshop";

export interface RecentWorkItem {
  work: WorkRecord;
  cover?: ImageRecord;
}

export function RecentWorks({ items }: { items: RecentWorkItem[] }) {
  return (
    <section className="recent-works" aria-labelledby="recent-works-title">
      <div className="section-heading">
        <div><p className="home-eyebrow">RECENT WORKS</p><h2 id="recent-works-title">最近作品</h2></div>
        <Link className="section-link" href="/library?sort=recent">查看全部 <ArrowRight aria-hidden="true" size={16} /></Link>
      </div>
      {items.length > 0 ? (
        <div className="recent-work-grid">
          {items.map((item, index) => <WorkCard key={item.work.id} {...item} index={index} />)}
        </div>
      ) : (
        <p className="inline-empty">完成新建或导入后，最近作品会出现在这里。</p>
      )}
    </section>
  );
}
