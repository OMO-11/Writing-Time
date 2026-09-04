"use client";

import Link from "next/link";
import { PencilLine } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import { AppIcon } from "@/components/ui/AppIcon";
import { db, ensureStarterData, hydrateWorkDocument } from "@/lib/db";
import { useUIStore } from "@/stores/ui-store";

export function WorkDetail({ slug }: { slug: string }) {
  const work = useLiveQuery(async () => {
    const found = await db.works.where("slug").equals(slug).first();
    return found ? hydrateWorkDocument(found) : found;
  }, [slug]);
  const setActiveWorkTitle = useUIStore((state) => state.setActiveWorkTitle);
  useEffect(() => { void ensureStarterData(); }, []);
  useEffect(() => { setActiveWorkTitle(work?.title ?? ""); return () => setActiveWorkTitle(""); }, [setActiveWorkTitle, work?.title]);
  if (work === undefined) return <div className="detail-loading">正在从本地书架取来作品…</div>;
  if (!work) return <div className="detail-loading">没有找到这篇作品。<Link href="/library">返回作品库</Link></div>;
  return (
    <div className="work-detail">
      <header><p>{work.tags.join(" · ") || "未分类作品"}</p><h2>{work.title}</h2><span>{work.status === "draft" ? "草稿" : work.status === "completed" ? "已完成" : "已归档"}</span><Link href={`/workbench?work=${work.id}`}><AppIcon icon={PencilLine} />继续编辑</Link></header>
      <MarkdownRenderer html={work.renderedHtml} className="mx-auto w-full max-w-[760px] px-5 py-8 sm:px-8 sm:py-10" />
    </div>
  );
}
