"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Filter, Plus, Search, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ContentIcon } from "@/components/content/ContentIcon";
import { CharacterEmptyState } from "@/components/theme/CharacterEmptyState";
import { CONTENT_TYPES, CONTENT_TYPE_REGISTRY, getContentHref } from "@/lib/content-registry";
import { createContent, ensureUnifiedContentModel, toggleFavorite } from "@/lib/content-service";
import { createBlankWork, db } from "@/lib/db";
import type { ContentType } from "@/types/content";

export function ContentWorkspace({ initialType }: { initialType?: string }) {
  const router = useRouter();
  const contents = useLiveQuery(() => db.contents.orderBy("updatedAt").reverse().toArray(), [], []);
  const [type, setType] = useState<ContentType | "all">(CONTENT_TYPES.includes(initialType as ContentType) ? initialType as ContentType : "all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);

  useEffect(() => { void ensureUnifiedContentModel(); }, []);
  const filtered = useMemo(() => contents.filter((content) => {
    const haystack = `${content.title} ${content.summary} ${content.tags.join(" ")}`.toLocaleLowerCase("zh-CN");
    return (type === "all" || content.type === type) && (status === "all" || content.status === status) && haystack.includes(query.trim().toLocaleLowerCase("zh-CN"));
  }), [contents, query, status, type]);

  const create = async (nextType: ContentType) => {
    setCreating(false);
    if (nextType === "article") {
      const work = await createBlankWork();
      router.push(`/workbench?work=${work.id}`);
      return;
    }
    if (nextType === "image") {
      router.push("/gallery?upload=1");
      return;
    }
    const content = await createContent(nextType);
    router.push(`/content/${content.id}`);
  };

  return (
    <section className="content-workspace" aria-label="统一内容工作区">
      <aside className="content-type-rail" aria-label="内容类型">
        <button type="button" data-active={type === "all"} onClick={() => setType("all")}><Filter aria-hidden="true" size={17} /><span>全部内容</span><b>{contents.length}</b></button>
        {CONTENT_TYPES.map((item) => <button key={item} type="button" data-active={type === item} onClick={() => setType(item)}><ContentIcon type={item} /><span>{CONTENT_TYPE_REGISTRY[item].pluralLabel}</span><b>{contents.filter((content) => content.type === item).length}</b></button>)}
      </aside>
      <div className="content-catalog">
        <header className="content-catalog-tools">
          <label><Search aria-hidden="true" size={17} /><span className="sr-only">筛选内容</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="筛选标题、摘要或标签…" /></label>
          <select aria-label="按状态筛选" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">全部状态</option><option value="draft">草稿</option><option value="active">进行中</option><option value="completed">已完成</option><option value="archived">已归档</option></select>
          <div className="content-create-menu">
            <button className="primary-paper-button" type="button" aria-expanded={creating} onClick={() => setCreating((value) => !value)}><Plus aria-hidden="true" size={17} />创建内容</button>
            {creating ? <div role="menu">{CONTENT_TYPES.map((item) => <button key={item} type="button" role="menuitem" onClick={() => void create(item)}><ContentIcon type={item} /><span><strong>{CONTENT_TYPE_REGISTRY[item].label}</strong><small>{CONTENT_TYPE_REGISTRY[item].description}</small></span></button>)}</div> : null}
          </div>
        </header>
        <div className="content-grid">
          {filtered.map((content) => (
            <article className="content-card" data-accent={CONTENT_TYPE_REGISTRY[content.type].accent} key={content.id}>
              <div className="content-card-meta"><span><ContentIcon type={content.type} size={15} />{CONTENT_TYPE_REGISTRY[content.type].label}</span><button type="button" aria-label={content.favorite ? "取消收藏" : "收藏"} aria-pressed={content.favorite} onClick={() => void toggleFavorite(content.id)}><Star aria-hidden="true" size={16} fill={content.favorite ? "currentColor" : "none"} /></button></div>
              <h2><Link href={getContentHref(content)}>{content.title}</Link></h2>
              <p>{content.summary || CONTENT_TYPE_REGISTRY[content.type].description}</p>
              <footer><span>{content.tags.length ? content.tags.slice(0, 3).map((tag) => `#${tag}`).join(" · ") : "尚未归类"}</span><time dateTime={new Date(content.updatedAt).toISOString()}>{new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(content.updatedAt)}</time></footer>
            </article>
          ))}
          {!filtered.length ? contents.length ? (
            <div className="content-empty">
              <ContentIcon type={type === "all" ? "note" : type} size={28} />
              <h2>这一区还很安静</h2>
              <p>调整筛选条件，或创建一种新的内容。</p>
            </div>
          ) : (
            <div className="content-empty-character">
              <CharacterEmptyState
                character="eden"
                variant="archive"
                title="档案架正在等待第一份资料"
                description="先写下一篇作品，或建立一张设定卡。伊登会把后续的标签、关联和归档线索整理在一起。"
                actions={(
                  <>
                    <button className="primary-paper-button" type="button" onClick={() => void create("article")}>新建文章</button>
                    <button className="primary-paper-button" type="button" onClick={() => void create("record")}>创建设定</button>
                  </>
                )}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
