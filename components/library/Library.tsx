"use client";

import Link from "next/link";
import { BookOpenText, FilePlus2, Search } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { MarkdownExcerpt } from "@/components/markdown/MarkdownExcerpt";
import { AppIcon } from "@/components/ui/AppIcon";
import { db, ensureStarterData } from "@/lib/db";

export function Library() {
  const works = useLiveQuery(() => db.works.orderBy("updatedAt").reverse().toArray(), [], []);
  const [query, setQuery] = useState("");
  useEffect(() => { void ensureStarterData(); }, []);
  const filtered = useMemo(() => works.filter((work) => `${work.title} ${work.tags.join(" ")} ${work.plainText}`.toLowerCase().includes(query.toLowerCase())), [query, works]);
  return (
    <div className="library-page">
      <label className="library-search"><AppIcon icon={Search} /><span className="sr-only">筛选当前作品库</span><input type="search" placeholder="在当前作品库中筛选…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="library-list">
        <Link href="/workbench" className="new-work-sheet"><AppIcon icon={FilePlus2} size={24} /><strong>打开一张新纸</strong><span>在创作工坊里开始书写</span></Link>
        {filtered.map((work) => (
          <article key={work.id} className="work-sheet">
            <div><span>{work.status === "draft" ? "草稿" : work.status === "completed" ? "已完成" : "已归档"}</span><time dateTime={new Date(work.updatedAt).toISOString()}>{new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date(work.updatedAt))}</time></div>
            <AppIcon icon={BookOpenText} size={20} />
            <h2><Link href={`/work/${work.slug}`}>{work.title}</Link></h2>
            {work.excerptHtml ? <MarkdownExcerpt html={work.excerptHtml} /> : <p>尚未写下正文。</p>}
            <footer>{work.tags.map((tag) => <span key={tag}>{tag}</span>)}<Link href={`/workbench?work=${work.id}`}>继续编辑</Link></footer>
          </article>
        ))}
      </div>
    </div>
  );
}
