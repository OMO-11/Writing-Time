import Link from "next/link";
import { ArrowUpRight, Feather } from "lucide-react";
import { formatHomeDate, WORK_STATUS_META } from "@/components/home/demo-data";
import { BlobImage } from "@/components/ui/BlobImage";
import { MarkdownExcerpt } from "@/components/markdown/MarkdownExcerpt";
import type { ImageRecord, WorkRecord } from "@/types/workshop";

export function WorkCard({ work, cover, index = 0 }: { work: WorkRecord; cover?: ImageRecord; index?: number }) {
  const status = WORK_STATUS_META[work.status];
  const tone = ["mist", "lavender", "gold", "slate"][index % 4];

  return (
    <article className="work-card">
      <Link className="work-card-cover" href={`/work/${work.slug}`} aria-label={`查看《${work.title}》`}>
        {cover ? (
          <BlobImage blob={cover.blob} alt="" width={600} height={420} className="work-card-cover-image" />
        ) : (
          <span className="paper-cover paper-cover-card" data-tone={tone} aria-hidden="true">
            <Feather size={22} strokeWidth={1.25} />
            <i />
            <b>{work.title.slice(0, 10)}</b>
          </span>
        )}
      </Link>
      <div className="work-card-body">
        <div className="work-card-topline">
          <span className={`work-status ${status.className}`}>{status.label}</span>
          <time dateTime={new Date(work.updatedAt).toISOString()}>{formatHomeDate(work.updatedAt)}</time>
        </div>
        <h3><Link href={`/work/${work.slug}`}>{work.title}</Link></h3>
        {work.excerptHtml ? <MarkdownExcerpt html={work.excerptHtml} /> : <p>尚未写下摘要。</p>}
        <footer>
          <div className="work-tags" aria-label="标签">
            {work.tags.slice(0, 2).map((tag) => <span key={tag}>#{tag}</span>)}
            {work.tags.length === 0 && <span>#未分类</span>}
          </div>
          <Link href={`/workbench?work=${work.id}`} aria-label={`编辑《${work.title}》`}><ArrowUpRight aria-hidden="true" size={17} /></Link>
        </footer>
      </div>
    </article>
  );
}
