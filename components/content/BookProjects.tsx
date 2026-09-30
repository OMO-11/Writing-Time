"use client";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowDown, ArrowUp, BookOpen, ChevronDown, LockKeyhole, Plus, Sparkle } from "lucide-react";
import { db } from "@/lib/db";
import { exportBook } from "@/lib/export-service";
import { BookCover } from "@/components/content/BookCover";
import { BookCollectionDrawer } from "@/components/content/BookCollectionDrawer";
import { PaperDialog } from "@/components/ui/PaperDialog";
import { BookWelcome } from "@/components/content/BookWelcome";
import type { BookRecord } from "@/types/workshop";

function move<T>(items: T[], index: number, offset: number) {
  const next = [...items];
  [next[index], next[index + offset]] = [next[index + offset], next[index]];
  return next;
}
type EditDialog = { title: string; label?: string; value: string; description?: string; confirm?: string; apply: (value: string) => Promise<boolean> };
function BookEditDialog({ edit, busy, error, onClose, recovery }: { edit: EditDialog; busy: boolean; error: string; onClose: () => void; recovery?: ReactNode }) {
  const [value, setValue] = useState(edit.value);
  return <PaperDialog title={edit.title} busy={busy} onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); if (busy || (edit.label && !value.trim())) return; if (await edit.apply(value.trim())) onClose(); }}>
    <div className="paper-dialog-body">{edit.description && <p>{edit.description}</p>}{edit.label && <label className="book-field">{edit.label}<input required maxLength={200} value={value} disabled={busy} onChange={(event) => setValue(event.target.value)} /></label>}{error && <p role="alert" className="paper-error">{error}</p>}</div>
    <footer className="paper-dialog-actions">{recovery}<button type="button" disabled={busy} onClick={onClose}>取消</button><button className="book-primary" disabled={busy || (!!edit.label && !value.trim())} type="submit">{busy ? "保存中…" : edit.confirm ?? "保存"}</button></footer>
  </form></PaperDialog>;
}
export function BookProjects() {
  const books = useLiveQuery(() => db.books.orderBy("updatedAt").reverse().toArray());
  const works = useLiveQuery(() => db.works.filter((work) => !!work.finalizedAt).toArray(), [], []);
  const legacy = useLiveQuery(() => db.contents.where("type").equals("project").toArray(), [], []);
  const searchParams = useSearchParams();
  const initialWork = searchParams.get("collect") ?? undefined;
  const [activeId, setActiveId] = useState<string | undefined>(() => { try { return typeof window !== "undefined" ? localStorage.getItem("active-book") ?? undefined : undefined; } catch { return undefined; } });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [edit, setEdit] = useState<EditDialog | null>(null);
  const [collect, setCollect] = useState<{ chapter?: string } | null>(null);
  const [conflictId, setConflictId] = useState<string>();
  const active = books?.find((book) => book.id === activeId) ?? books?.[0];
  const selectBook = (id: string) => { setActiveId(id); setError(""); try { localStorage.setItem("active-book", id); } catch {} };
  const run = async (task: () => Promise<unknown>) => {
    if (busyRef.current) return false;
    busyRef.current = true; setBusy(true); setError(""); setConflictId(undefined);
    try { await task(); return true; } catch (error) { setError(error instanceof Error ? error.message : "保存失败，请重试。"); return false; }
    finally { busyRef.current = false; setBusy(false); }
  };
  const save = (book: BookRecord) => run(async () => {
    let conflict: string | undefined;
    await db.transaction("rw", db.books, db.works, async () => {
      const ids = book.chapters.flatMap((chapter) => chapter.workIds);
      if (new Set(ids).size !== ids.length) throw new Error("同一本书不能重复收录作品");
      for (const id of ids) if (!(await db.works.get(id))?.finalizedAt) throw new Error("只能收录已完全保存的作品");
      const current = await db.books.get(book.id);
      if (!current) throw new Error("这本书已不存在，请重新打开书架。");
      if (current.updatedAt !== book.updatedAt) {
        conflict = crypto.randomUUID();
        await db.books.add({ ...book, id: conflict, title: book.title + "（冲突副本）", createdAt: Date.now(), updatedAt: Date.now() });
        return;
      }
      await db.books.put({ ...book, updatedAt: Math.max(Date.now(), book.updatedAt + 1) });
    });
    if (conflict) { setConflictId(conflict); throw new Error("其他标签页已修改目录。你的编订已另存为冲突副本。"); }
  });
  const openEdit = (value: EditDialog) => { setError(""); setEdit(value); };
  const create = () => openEdit({ title: "创建书籍", label: "书籍名称", value: "", confirm: "创建书籍", apply: (title) => run(async () => {
    const id = crypto.randomUUID();
    await db.books.add({ id, title, chapters: [], createdAt: Date.now(), updatedAt: Date.now() }); selectBook(id);
  }) });
  const addChapter = () => { if (active) openEdit({ title: "添加章节", label: "章节名称", value: `第 ${active.chapters.length + 1} 章`, confirm: "添加章节", apply: (title) => save({ ...active, chapters: [...active.chapters, { id: crypto.randomUUID(), title, workIds: [] }] }) }); };
  const openCollection = (chapter?: string) => { setError(""); setCollect({ chapter }); };
  const recovery = conflictId ? <button type="button" onClick={() => { setEdit(null); setCollect(null); selectBook(conflictId); setConflictId(undefined); }}>打开冲突副本</button> : undefined;
  if (!books) return <section className="book-projects" aria-busy="true"><p className="book-empty-note">正在取来书架与目录…</p></section>;
  return <section className="book-projects" onKeyDown={(event) => { if (event.key === "Escape") { const menu = (event.target as HTMLElement).closest("details"); if (menu) { menu.removeAttribute("open"); menu.querySelector("summary")?.focus(); } } }}>
    <header className="book-page-heading"><div className="book-page-intro"><span className="book-section-label">幻想工坊 / 故事编订</span><h1>书籍项目<Sparkle className="book-heading-mark" size={23} strokeWidth={1.25} aria-hidden="true" /></h1><p>把已完成的故事，编成一路同行的书。</p></div><div className="book-heading-tools"><span className="book-shelf-count">{books.length} 本书籍<span aria-hidden="true"> / </span>{works.length} 篇定稿</span><button className="book-primary" disabled={busy} onClick={create}><Plus size={17} aria-hidden="true" />创建书籍</button></div></header>
    {error && !edit && !collect && <p className="paper-error" role="alert">{error}</p>}
    {conflictId && <button className="book-conflict-link" onClick={() => { setEdit(null); setCollect(null); selectBook(conflictId); setConflictId(undefined); }}>打开冲突副本</button>}
    {initialWork && <p className="book-collection-hint">{works.find((work) => work.id === initialWork)?.title ?? "已完成作品"} · 请选择书籍和章节，然后点击“收录作品”。</p>}
    {!books.length ? <BookWelcome onCreate={create} /> : <>
      <label className="book-mobile-picker">当前书籍<select value={active?.id ?? ""} onChange={(event) => selectBook(event.target.value)}>{books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select></label>
      <div className="book-layout"><aside className="book-shelf" aria-label="书架"><h2>我的书架 <span>{String(books.length).padStart(2, "0")}</span></h2>
        {books.map((book) => <button className="book-shelf-item" key={book.id} aria-pressed={active?.id === book.id} onClick={() => selectBook(book.id)}><BookCover id={book.id} title={book.title} /><span><strong>{book.title}</strong><small>{book.chapters.length} 章 · {book.chapters.reduce((n, c) => n + c.workIds.length, 0)} 篇作品</small><small>{active?.id === book.id ? "正在编订" : new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(book.updatedAt) + "更新"}</small></span></button>)}
        <Link className="book-shelf-finished" href="/library?type=finished">查看已完成作品 →</Link>
      </aside><div className="book-editor">{active && <fieldset disabled={busy}><legend className="sr-only">编订书籍目录</legend>
        <header className="book-editor-heading"><div><h2>{active.title}</h2><p role="status">{busy ? "正在保存…" : error ? "操作未完成" : "已保存到本机"}</p></div><div className="book-action-row"><Link href={`/books/${active.id}`}><BookOpen size={16} aria-hidden="true" />整书阅读</Link><details className="book-menu"><summary>导出 <ChevronDown size={14} aria-hidden="true" /></summary><div><button onClick={() => void run(() => exportBook(active, "html"))}>导出离线 HTML</button><button onClick={() => void run(() => exportBook(active, "zip"))}>导出 Markdown 包</button></div></details><details className="book-menu"><summary>更多</summary><div><button onClick={() => openEdit({ title: "修改书名", label: "书籍名称", value: active.title, apply: (title) => save({ ...active, title }) })}>修改书名</button></div></details></div></header>
        <div className="book-directory-toolbar"><h3>书籍目录</h3><div className="book-action-row"><button onClick={addChapter}>添加章节</button><button className="book-primary" onClick={() => openCollection()}><Plus size={17} aria-hidden="true" />收录作品</button></div></div>
        {!active.chapters.length && <div className="book-empty-note"><BookOpen size={32} aria-hidden="true" /><h3>为这本书写下第一章的名字</h3><p>添加章节后，就可以收录多篇已完成作品。</p><button onClick={addChapter}>添加第一个章节</button></div>}
        {active.chapters.map((chapter, index) => {
          const patch = (workIds: string[]) => save({ ...active, chapters: active.chapters.map((c) => c.id === chapter.id ? { ...c, workIds } : c) });
          return <section className="book-chapter" key={chapter.id}><header className="book-chapter-heading"><h3>{index + 1}. {chapter.title}</h3><small>{chapter.workIds.length} 篇</small><details className="book-menu"><summary aria-label={`章节操作 ${chapter.title}`}>操作</summary><div><button aria-label={`上移章节 ${chapter.title}`} disabled={index === 0} onClick={() => save({ ...active, chapters: move(active.chapters, index, -1) })}>上移章节</button><button aria-label={`下移章节 ${chapter.title}`} disabled={index === active.chapters.length - 1} onClick={() => save({ ...active, chapters: move(active.chapters, index, 1) })}>下移章节</button><button onClick={() => openEdit({ title: "重命名章节", label: "章节名称", value: chapter.title, apply: (title) => save({ ...active, chapters: active.chapters.map((c) => c.id === chapter.id ? { ...c, title } : c) }) })}>重命名</button><button onClick={() => openEdit({ title: "移除章节", value: "", description: `移除「${chapter.title}」及其 ${chapter.workIds.length} 篇目录条目？原作品仍会保留。`, confirm: "移除章节", apply: () => save({ ...active, chapters: active.chapters.filter((c) => c.id !== chapter.id) }) })}>移除章节</button></div></details></header>
            <ol>{chapter.workIds.map((id, position) => { const work = works.find((item) => item.id === id); return <li key={id}><span className="book-work-number" aria-hidden="true">{String(position + 1).padStart(2, "0")}</span>{work ? <Link href={`/work/${work.slug}`}>{work.title}</Link> : <span>作品不可用</span>}<span className="finalized-badge"><LockKeyhole size={12} aria-hidden="true" />已定稿 · 只读</span><div className="book-work-actions"><button aria-label={`上移作品 ${work?.title}`} disabled={position === 0} onClick={() => patch(move(chapter.workIds, position, -1))}><ArrowUp size={16} aria-hidden="true" /></button><button aria-label={`下移作品 ${work?.title}`} disabled={position === chapter.workIds.length - 1} onClick={() => patch(move(chapter.workIds, position, 1))}><ArrowDown size={16} aria-hidden="true" /></button><details className="book-menu"><summary aria-label={`作品操作 ${work?.title}`}>更多</summary><div><label>移动到<select aria-label={`将 ${work?.title} 移到章节`} value="" onChange={(event) => { const target = event.target.value; if (target) void save({ ...active, chapters: active.chapters.map((c) => c.id === chapter.id ? { ...c, workIds: c.workIds.filter((w) => w !== id) } : c.id === target ? { ...c, workIds: [...c.workIds, id] } : c) }); }}><option value="">移到章节…</option>{active.chapters.filter((c) => c.id !== chapter.id && !c.workIds.includes(id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label><button onClick={() => patch(chapter.workIds.filter((w) => w !== id))}>移出目录</button></div></details></div></li>; })}</ol>
            <button className="book-chapter-add" aria-label={`向 ${chapter.title} 添加作品`} onClick={() => openCollection(chapter.id)}><Plus size={15} aria-hidden="true" />{chapter.workIds.length ? "继续收录作品" : "这个章节还很安静 · 收录作品"}</button>
          </section>;
        })}
      </fieldset>}</div></div>
    </>}
    {!!legacy.length && <details className="book-legacy"><summary>原有项目 · {legacy.length}</summary>{legacy.map((item) => <Link key={item.id} href={`/content/${item.id}`}>{item.title}</Link>)}</details>}
    {edit && <BookEditDialog edit={edit} busy={busy} error={error} recovery={recovery} onClose={() => { setEdit(null); setError(""); }} />}
    {collect && active && <BookCollectionDrawer key={active.id} book={active} works={works} initialChapter={collect.chapter} initialWork={initialWork} save={save} busy={busy} error={error} recovery={recovery} onClose={() => { setCollect(null); setError(""); }} />}
  </section>;
}
