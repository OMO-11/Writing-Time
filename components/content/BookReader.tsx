"use client";
import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { PaperDialog } from "@/components/ui/PaperDialog";
import { db } from "@/lib/db";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";

export function BookReader({ id }: { id: string }) {
  const [tocOpen, setTocOpen] = useState(false);
  const data = useLiveQuery(async () => {
    const book = await db.books.get(id);
    if (!book) return null;
    const works = await db.works.bulkGet(book.chapters.flatMap((chapter) => chapter.workIds));
    return { book, works };
  }, [id]);
  useEffect(() => {
    if (!data) return;
    let timer: ReturnType<typeof setTimeout>;
    try { const section = localStorage.getItem(`book-position:${id}`); if (section) document.getElementById(section)?.scrollIntoView(); } catch {}
    const save = () => { clearTimeout(timer); timer = setTimeout(() => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-book-section]"));
      const visible = sections.filter((section) => section.getBoundingClientRect().top <= 160).at(-1);
      if (visible) try { localStorage.setItem(`book-position:${id}`, visible.id); } catch {}
    }, 300); };
    window.addEventListener("scroll", save);
    return () => { clearTimeout(timer); window.removeEventListener("scroll", save); };
  }, [data, id]);
  if (data === undefined) return <p>正在打开书籍…</p>;
  if (!data) return <p>书籍不存在。<Link href="/projects">返回书架</Link></p>;
  const jump = (event: MouseEvent<HTMLAnchorElement>, targetId: string) => {
    event.preventDefault(); setTocOpen(false);
    requestAnimationFrame(() => { const target = document.getElementById(targetId); if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); target.scrollIntoView(); } });
  };
  const toc = <nav aria-label="书籍目录">{data.book.chapters.map((chapter, index) => <div key={chapter.id}><a href={`#chapter-${chapter.id}`} onClick={(event) => jump(event, `chapter-${chapter.id}`)}>{String(index + 1).padStart(2, "0")} · {chapter.title}</a>{chapter.workIds.map((workId) => <a className="book-toc-work" key={workId} href={`#work-${workId}`} onClick={(event) => jump(event, `work-${workId}`)}>{data.works.find((work) => work?.id === workId)?.title ?? "作品不可用"}</a>)}</div>)}</nav>;
  return <main className="book-reader"><header className="book-reader-heading"><Link href="/projects">← 返回编订</Link><p>THE COLLECTED STORIES</p><h1>{data.book.title}</h1><span>{data.book.chapters.length} 章 · {data.works.length} 篇作品</span><button className="book-reader-toc-toggle" onClick={() => setTocOpen(true)}>打开目录</button></header><div className="book-reader-layout"><aside className="book-reader-toc"><h2>书籍目录</h2>{toc}</aside><article className="book-reader-pages">{data.book.chapters.map((chapter) => <section className="book-reading-chapter" key={chapter.id} id={`chapter-${chapter.id}`} data-book-section><h2>{chapter.title}</h2>{chapter.workIds.map((workId) => { const work = data.works.find((item) => item?.id === workId); return <section className="book-reading-work" key={workId} id={`work-${workId}`} data-book-section><h3>{work?.title ?? "作品不可用"}</h3>{work && <MarkdownRenderer html={work.renderedHtml} />}</section>; })}</section>)}</article></div>{tocOpen && <PaperDialog title="书籍目录" drawer onClose={() => setTocOpen(false)}><div className="paper-dialog-body book-reader-mobile-toc">{toc}</div></PaperDialog>}</main>;
}
