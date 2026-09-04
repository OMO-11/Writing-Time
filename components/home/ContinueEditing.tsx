import Link from "next/link";
import { ArrowRight, Feather, FileText } from "lucide-react";
import { formatHomeDate, getCurrentChapter, getMarkdownWordCount } from "@/components/home/demo-data";
import { BlobImage } from "@/components/ui/BlobImage";
import { MarkdownExcerpt } from "@/components/markdown/MarkdownExcerpt";
import type { ImageRecord, WorkRecord } from "@/types/workshop";

export function ContinueEditing({ work, cover }: { work: WorkRecord; cover?: ImageRecord }) {
  return (
    <section className="continue-editing" aria-labelledby="continue-title">
      <div className="continue-cover">
        {cover ? (
          <BlobImage blob={cover.blob} alt={cover.title} width={640} height={800} className="continue-cover-image" loading="eager" />
        ) : (
          <div className="paper-cover paper-cover-large" aria-hidden="true">
            <Feather size={28} strokeWidth={1.35} />
            <span>FANTASY<br />WORKSHOP</span>
          </div>
        )}
      </div>
      <div className="continue-copy">
        <p className="home-eyebrow">CONTINUE EDITING</p>
        <h2 id="continue-title">{work.title}</h2>
        <p className="continue-chapter">{getCurrentChapter(work.markdown)}</p>
        {work.excerptHtml ? <MarkdownExcerpt html={work.excerptHtml} className="continue-excerpt" /> : <p className="continue-excerpt">这篇手稿还没有摘要，回到工坊继续写下第一段吧。</p>}
        <dl className="continue-meta">
          <div><dt>字数</dt><dd>{getMarkdownWordCount(work.markdown).toLocaleString("zh-CN")}</dd></div>
          <div><dt>更新时间</dt><dd>{formatHomeDate(work.updatedAt)}</dd></div>
          <div><dt>格式</dt><dd><FileText aria-hidden="true" size={13} /> Markdown</dd></div>
        </dl>
        <Link className="text-action text-action-strong" href={`/workbench?work=${work.id}`}>
          继续编辑 <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </div>
    </section>
  );
}
