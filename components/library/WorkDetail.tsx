"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createRevision } from "@/lib/revision-service";
import { RecoveryHistory } from "@/components/workbench/RecoveryHistory";
import { PencilLine } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { AppIcon } from "@/components/ui/AppIcon";
import { db, ensureStarterData, hydrateWorkDocument } from "@/lib/db";
import { useUIStore } from "@/stores/ui-store";

export function WorkDetail({ slug }: { slug: string }) {
  const router = useRouter();
  const work = useLiveQuery(async () => {
    const found = await db.works.where("slug").equals(slug).first();
    return found ? hydrateWorkDocument(found) : null;
  }, [slug]);
  const setActiveWorkTitle = useUIStore((state) => state.setActiveWorkTitle);
  useEffect(() => { void ensureStarterData(); }, []);
  useEffect(() => { setActiveWorkTitle(work?.title ?? ""); return () => setActiveWorkTitle(""); }, [setActiveWorkTitle, work?.title]);
  if (work === undefined) return <div className="detail-loading">正在从本地书架取来作品…</div>;
  if (!work) return <div className="detail-loading">没有找到这篇作品。<Link href="/library">返回工作区</Link></div>;
  return (
    <div className="work-detail">
      <header><p>{work.tags.join(" · ") || "未分类作品"}</p><h2>{work.title}</h2>{!work.finalizedAt && <span>{work.status === "draft" ? "草稿" : work.status === "completed" ? "写作完成 · 可编辑" : "已归档"}</span>}{work.finalizedAt ? <span className="finalized-badge">已完全保存 · 只读</span> : <Link href={`/workbench?work=${work.id}`}><AppIcon icon={PencilLine} />继续编辑</Link>}</header>
      {work.finalizedAt && <div className="work-finalized-actions"><p>原稿保持只读。修订会创建独立草稿，书籍中的原引用不变。</p><Link href={`/projects?collect=${encodeURIComponent(work.id)}`}>收录到书籍</Link><button onClick={() => void createRevision(work.id).then((next) => router.push(`/workbench?work=${next.id}`)).catch((error) => useUIStore.getState().showToast(String(error), "error"))}>创建修订草稿</button></div>}
      <RecoveryHistory workId={work.id} markdown={work.markdown} />
      <MarkdownRenderer html={work.renderedHtml} className="mx-auto w-full max-w-[760px] px-5 py-8 sm:px-8 sm:py-10" />
    </div>
  );
}
