"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";

export function BookReader({ id }: { id: string }) {
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
  return <main className="book-reader" style={{ maxWidth: 850, margin: "auto", padding: 24 }}><Link href="/projects">返回书架</Link><h1>{data.book.title}</h1><nav aria-label="书籍目录">{data.book.chapters.map((chapter) => <p key={chapter.id}><a href={`#chapter-${chapter.id}`}>{chapter.title}</a></p>)}</nav>{data.book.chapters.map((chapter) => <section key={chapter.id} id={`chapter-${chapter.id}`} data-book-section><h2>{chapter.title}</h2>{chapter.workIds.map((workId) => { const work = data.works.find((item) => item?.id === workId); return <section key={workId} id={`work-${workId}`} data-book-section><h3>{work?.title ?? "作品不可用"}</h3>{work && <MarkdownRenderer html={work.renderedHtml} />}</section>; })}</section>)}</main>;
}
