"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Filter, LockKeyhole, Plus, Search, Star, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ContentIcon } from "@/components/content/ContentIcon";
import { CharacterEmptyState } from "@/components/theme/CharacterEmptyState";
import { CONTENT_TYPES, CONTENT_TYPE_REGISTRY, getContentHref } from "@/lib/content-registry";
import { createContent, deleteWorkspaceContent, ensureUnifiedContentModel, toggleFavorite } from "@/lib/content-service";
import { createBlankWork, db } from "@/lib/db";
import { PaperDialog } from "@/components/ui/PaperDialog";
import { CompanionEmblem } from "@/components/ui/CompanionEmblem";
import type { ContentItem, ContentType } from "@/types/content";

export function ContentWorkspace({ initialType }: { initialType?: string }) {
  const router = useRouter();
  const contents = useLiveQuery(() => db.contents.orderBy("updatedAt").reverse().toArray(), [], []);
  const [type, setType] = useState<ContentType | "all" | "finished">(initialType === "finished" ? "finished" : CONTENT_TYPES.includes(initialType as ContentType) ? initialType as ContentType : "all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ContentItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteLock = useRef(false);
  const deleteContent = async () => {
    if (!deleting || deleteLock.current) return;
    deleteLock.current = true; setDeleteBusy(true); setDeleteError("");
    try { await deleteWorkspaceContent(deleting.id, deleting.updatedAt); setDeleting(null); }
    catch (error) { setDeleteError(error instanceof Error ? error.message : "删除失败，请重试。"); }
    finally { deleteLock.current = false; setDeleteBusy(false); }
  };

  useEffect(() => { void ensureUnifiedContentModel(); }, []);
  const filtered = useMemo(() => contents.filter((content) => {
    const haystack = `${content.title} ${content.summary} ${content.tags.join(" ")}`.toLocaleLowerCase("zh-CN");
    return content.type !== "project" && (type === "all" || content.type === type || (type === "finished" && content.type === "article" && !!content.payload.finalizedAt)) && (status === "all" || content.status === status) && haystack.includes(query.trim().toLocaleLowerCase("zh-CN"));
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
      <aside className="content-type-rail" aria-label="内容类型"><CompanionEmblem variant="duet" className="content-rail-emblem" />
        <button type="button" data-active={type === "all"} onClick={() => setType("all")}><Filter aria-hidden="true" size={17} /><span>全部内容</span><b>{contents.filter((content) => content.type !== "project").length}</b></button>
        {[{ title: "创作内容", items: CONTENT_TYPES.filter((item) => item === "article" || item === "note") }, { title: "素材与设定", items: CONTENT_TYPES.filter((item) => !["project", "article", "note"].includes(item)) }].map((group) => <div className="content-rail-group" key={group.title}><h2>{group.title}</h2>{group.items.map((item) => <button key={item} type="button" aria-pressed={type === item} data-active={type === item} onClick={() => setType(item)}><ContentIcon type={item} /><span>{CONTENT_TYPE_REGISTRY[item].pluralLabel}</span><b>{contents.filter((content) => content.type === item).length}</b></button>)}</div>)}
        <div className="content-rail-group"><h2>定稿档案</h2><button type="button" aria-pressed={type === "finished"} data-active={type === "finished"} onClick={() => setType("finished")}><LockKeyhole size={17} aria-hidden="true" /><span>已完成作品</span><b>{contents.filter((item) => item.type === "article" && item.payload.finalizedAt).length}</b></button></div>
        <Link href="/projects">前往项目 · 编订书籍 →</Link>
      </aside>
      <div className="content-catalog">
        <div className="content-section-intro"><h2>{type === "finished" ? "已完成作品" : "手稿与资料，各归其位"}</h2><p>{type === "finished" ? "原稿只读，可创建修订草稿或收录到书籍。" : "整理创作中的故事、旅途拾起的素材与世界设定。"}</p></div>
        <header className="content-catalog-tools">
          <label><Search aria-hidden="true" size={17} /><span className="sr-only">筛选内容</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="筛选标题、摘要或标签…" /></label>
          <select aria-label="按状态筛选" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">全部状态</option><option value="draft">草稿</option><option value="active">进行中</option><option value="completed">完成状态（含定稿）</option><option value="archived">已归档</option></select>
          <div className="content-create-menu">
            <button className="primary-paper-button" type="button" aria-expanded={creating} onClick={() => setCreating((value) => !value)}><Plus aria-hidden="true" size={17} />创建内容</button>
            {creating ? <div role="menu">{CONTENT_TYPES.filter((item) => item !== "project").map((item) => <button key={item} type="button" role="menuitem" onClick={() => void create(item)}><ContentIcon type={item} /><span><strong>{CONTENT_TYPE_REGISTRY[item].label}</strong><small>{CONTENT_TYPE_REGISTRY[item].description}</small></span></button>)}</div> : null}
          </div>
        </header>
        <div className="content-grid">
          {filtered.map((content) => (
            <article className="content-card" data-accent={CONTENT_TYPE_REGISTRY[content.type].accent} key={content.id}>
              <div className="content-card-meta"><span><ContentIcon type={content.type} size={15} />{CONTENT_TYPE_REGISTRY[content.type].label}</span><button type="button" aria-label={content.favorite ? "取消收藏" : "收藏"} aria-pressed={content.favorite} onClick={() => void toggleFavorite(content.id)}><Star aria-hidden="true" size={16} fill={content.favorite ? "currentColor" : "none"} /></button></div>
              <CompanionEmblem variant={content.type === "image" || content.type === "gallery" || content.type === "exhibition" ? "lunar" : "blossom"} className="content-card-emblem" /><h2><Link href={content.type === "article" && content.payload.finalizedAt ? `/work/${content.payload.slug}` : getContentHref(content)}>{content.title}</Link></h2>
              {content.type === "article" && <div className="content-work-state">{content.payload.finalizedAt ? <span className="finalized-badge"><LockKeyhole size={12} aria-hidden="true" />已定稿 · 只读</span> : <span>{content.status === "completed" ? "写作完成 · 可编辑" : content.status === "archived" ? "已归档" : "草稿 · 可编辑"}</span>}</div>}
              <p>{content.summary || CONTENT_TYPE_REGISTRY[content.type].description}</p>
              <footer><span>{content.tags.length ? content.tags.slice(0, 3).map((tag) => `#${tag}`).join(" · ") : "尚未归类"}</span><time dateTime={new Date(content.updatedAt).toISOString()}>{new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(content.updatedAt)}</time></footer>
              <div className="content-card-actions"><button type="button" disabled={content.type === "article" && !!content.payload.finalizedAt} title={content.type === "article" && content.payload.finalizedAt ? "定稿作品受只读保护" : undefined} aria-label={`删除「${content.title}」`} onClick={() => { setDeleteError(""); setDeleting(content); }}><Trash2 size={14} aria-hidden="true" />{content.type === "article" && content.payload.finalizedAt ? "定稿保护" : "删除"}</button></div>
              {content.type === "article" && content.payload.finalizedAt && <Link className="content-collect-link" href={`/projects?collect=${encodeURIComponent(content.id)}`}>收录到书籍 →</Link>}
            </article>
          ))}
          {!filtered.length ? contents.length ? (
            <div className="content-empty">
              <ContentIcon type={type === "all" || type === "finished" ? "note" : type} size={28} />
              <h2>这一区还很安静</h2>
              <p>调整筛选条件，或创建一种新的内容。</p>
              <button type="button" className="primary-paper-button" onClick={() => { setQuery(""); setStatus("all"); setType("all"); }}>清除筛选</button>
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
      {deleting && <PaperDialog title="删除内容" busy={deleteBusy} onClose={() => { setDeleting(null); setDeleteError(""); }}><div className="paper-dialog-body"><p>确认删除「{deleting.title}」？</p><p>{deleting.type === "image" ? "图片原文件也会删除。" : deleting.type === "article" ? "草稿、编辑会话及恢复记录将一并删除。" : "仅删除此条目，不删除其包含的其他作品或图片。"}删除后只能通过已有备份恢复。</p>{deleteError && <p role="alert" className="paper-error">{deleteError}</p>}</div><footer className="paper-dialog-actions"><button disabled={deleteBusy} onClick={() => setDeleting(null)}>取消</button><button className="danger-paper-button" disabled={deleteBusy} onClick={() => void deleteContent()}>{deleteBusy ? "删除中…" : "确认删除"}</button></footer></PaperDialog>}
    </section>
  );
}
