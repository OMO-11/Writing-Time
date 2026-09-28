"use client";
import Link from "next/link";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { exportBook } from "@/lib/export-service";
import type { BookRecord } from "@/types/workshop";

function move<T>(items: T[], index: number, offset: number) {
  const next = [...items];
  [next[index], next[index + offset]] = [next[index + offset], next[index]];
  return next;
}

export function BookProjects() {
  const books = useLiveQuery(() => db.books.orderBy("updatedAt").reverse().toArray(), [], []);
  const works = useLiveQuery(() => db.works.filter((work) => !!work.finalizedAt).toArray(), [], []);
  const legacy = useLiveQuery(() => db.contents.where("type").equals("project").toArray(), [], []);
  const [activeId, setActiveId] = useState<string | undefined>(() => { try { return typeof window !== "undefined" ? localStorage.getItem("active-book") ?? undefined : undefined; } catch { return undefined; } });
  const [query, setQuery] = useState("");
  const selectBook = (id: string) => { setActiveId(id); try { localStorage.setItem("active-book", id); } catch {} };
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = books.find((book) => book.id === activeId);
  const run = async (task: () => Promise<unknown>) => {
    setBusy(true); setError("");
    try { await task(); } catch (error) { setError(error instanceof Error ? error.message : "保存失败，请重试。"); }
    finally { setBusy(false); }
  };
  const create = () => {
    const title = window.prompt("书籍名称");
    if (!title?.trim()) return;
    void run(async () => {
      const id = crypto.randomUUID();
      await db.books.add({ id, title: title.trim(), chapters: [], createdAt: Date.now(), updatedAt: Date.now() });
      selectBook(id);
    });
  };
  const save = (book: BookRecord) => void run(async () => {
    let conflict = false;
    await db.transaction("rw", db.books, db.works, async () => {
      for (const id of book.chapters.flatMap((chapter) => chapter.workIds)) {
        if (!(await db.works.get(id))?.finalizedAt) throw new Error("只能收录已完全保存的作品");
      }
      const current = await db.books.get(book.id);
      if (current && current.updatedAt !== book.updatedAt) {
        await db.books.add({ ...book, id: crypto.randomUUID(), title: book.title + "（冲突副本）", createdAt: Date.now(), updatedAt: Date.now() });
        conflict = true; return;
      }
      await db.books.put({ ...book, updatedAt: Math.max(Date.now(), book.updatedAt + 1) });
    });
    if (conflict) throw new Error("其他标签页已修改目录。你的编订已另存为书架中的冲突副本。");
  });
  const rename = (label: string, value: string, apply: (title: string) => void) => {
    const title = window.prompt(label, value);
    if (title?.trim()) apply(title.trim());
  };
  return <section className="book-projects">
    <header><p>把已完成作品编成书，按章节组织目录，并随时收录新的作品。</p><button className="primary-paper-button" disabled={busy} onClick={create}>创建书籍</button><Link href="/library?type=finished">查看已完成作品</Link></header>
    {error && <p role="alert">{error}</p>}
    <div className="book-layout"><aside aria-label="书架">
      {books.map((book) => <button key={book.id} aria-pressed={activeId === book.id} onClick={() => selectBook(book.id)}><strong>{book.title}</strong><small>{book.chapters.length} 章 · {book.chapters.reduce((n, c) => n + c.workIds.length, 0)} 篇作品</small></button>)}
      {!books.length && <p>还没有书籍。创建第一本书，开始编订目录。</p>}
      {!!legacy.length && <><h2>原有项目</h2>{legacy.map((item) => <Link key={item.id} href={`/content/${item.id}`}>{item.title}</Link>)}</>}
    </aside><div className="book-editor">
      {active ? <fieldset disabled={busy}><legend className="sr-only">编订书籍目录</legend><header><h2>{active.title}</h2><Link href={`/books/${active.id}`}>整书阅读</Link><button onClick={() => void run(() => exportBook(active, "html"))}>导出离线 HTML</button><button onClick={() => void run(() => exportBook(active, "zip"))}>导出 Markdown 包</button><button onClick={() => rename("书籍名称", active.title, (title) => save({ ...active, title }))}>修改书名</button><button onClick={() => rename("新章节名称", `第 ${active.chapters.length + 1} 章`, (title) => save({ ...active, chapters: [...active.chapters, { id: crypto.randomUUID(), title, workIds: [] }] }))}>添加章节</button><span role="status">{busy ? "处理中…" : error ? "操作失败" : "目录已保存"}</span></header>
        <label>搜索候选作品<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        {!active.chapters.length && <p>先添加章节，再从已完成作品中选择多篇作品编入书中。</p>}
        {active.chapters.map((chapter, index) => {
          const patch = (workIds: string[]) => save({ ...active, chapters: active.chapters.map((c) => c.id === chapter.id ? { ...c, workIds } : c) });
          return <section className="book-chapter" key={chapter.id}><header><h3>{index + 1}. {chapter.title}</h3><button aria-label={`上移章节 ${chapter.title}`} disabled={index === 0} onClick={() => save({ ...active, chapters: move(active.chapters, index, -1) })}>↑</button><button aria-label={`下移章节 ${chapter.title}`} disabled={index === active.chapters.length - 1} onClick={() => save({ ...active, chapters: move(active.chapters, index, 1) })}>↓</button><button onClick={() => rename("章节名称", chapter.title, (title) => save({ ...active, chapters: active.chapters.map((c) => c.id === chapter.id ? { ...c, title } : c) }))}>重命名</button><button onClick={() => { if (window.confirm("移除此章节及其目录条目？已完成作品仍会保留。")) save({ ...active, chapters: active.chapters.filter((c) => c.id !== chapter.id) }); }}>移除章节</button></header>
            <ol>{chapter.workIds.map((id, position) => {
              const work = works.find((item) => item.id === id);
              return <li key={id}>{work ? <Link href={`/work/${work.slug}`}>{work.title}</Link> : <span>作品不可用</span>}<div><button aria-label={`上移作品 ${work?.title}`} disabled={position === 0} onClick={() => patch(move(chapter.workIds, position, -1))}>↑</button><button aria-label={`下移作品 ${work?.title}`} disabled={position === chapter.workIds.length - 1} onClick={() => patch(move(chapter.workIds, position, 1))}>↓</button><select aria-label={`将 ${work?.title} 移到章节`} value="" onChange={(event) => save({ ...active, chapters: active.chapters.map((c) => c.id === chapter.id ? { ...c, workIds: c.workIds.filter((w) => w !== id) } : c.id === event.target.value ? { ...c, workIds: [...c.workIds, id] } : c) })}><option value="">移到章节…</option>{active.chapters.filter((c) => c.id !== chapter.id && !c.workIds.includes(id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select><button onClick={() => patch(chapter.workIds.filter((w) => w !== id))}>移出目录</button></div></li>;
            })}</ol>
            <label>收录已完成作品<select aria-label={`向 ${chapter.title} 添加作品`} value="" onChange={(event) => { if (event.target.value) patch([...chapter.workIds, event.target.value]); }}><option value="">选择作品…</option>{works.filter((work) => work.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && !active.chapters.some((c) => c.workIds.includes(work.id))).map((work) => <option key={work.id} value={work.id}>{work.title}</option>)}</select></label>
          </section>;
        })}
        {!works.length && <p>还没有可收录的作品。请在创作工坊中使用“完全保存”定稿。</p>}
      </fieldset> : <p>从左侧选择一本书，或创建新书。</p>}
    </div></div>
  </section>;
}
