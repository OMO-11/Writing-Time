import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** A bespoke colophon: Noval's flower/crystal and Eden's lunar archive. */
export function BookWelcome({ onCreate }: { onCreate: () => void }) {
  return <section className="book-colophon" aria-label="开始编订第一本书">
    <div className="colophon-copy"><p className="colophon-index">序 / 00</p><h2>尚未命名的故事，<br />从这里开始。</h2><p className="colophon-description">为完成的文字留一个位置。<br />收录、编排，慢慢成为一本书。</p><button className="colophon-create" onClick={onCreate}>创建第一本书<ArrowUpRight size={20} strokeWidth={1.25} aria-hidden="true" /></button><Link className="colophon-library" href="/library?type=finished">浏览已完成作品</Link></div>
    <figure className="colophon-emblem"><svg viewBox="0 0 400 430" fill="none" aria-hidden="true">
      <path d="M222 57c78 11 132 72 132 143 0 80-59 146-139 152 63-26 103-84 103-152 0-61-36-115-96-143Z" fill="#d8d7e1" fillOpacity=".38" stroke="#9b9aa9" strokeWidth=".8" />
      <path d="M289 96c-29-30-70-43-114-37M99 326c37 27 83 37 128 24" stroke="#c5c5cd" strokeWidth=".7" />
      <path d="M107 336c19-55 54-100 71-151 9-27 11-60 1-90" stroke="#7d939c" strokeWidth="1.2" />
      <path d="M149 258c-30 1-51-12-56-35 28 1 48 13 56 35ZM162 223c27-8 42-25 40-49-26 10-38 27-40 49ZM122 301c-23-5-37-19-37-37 23 5 33 18 37 37Z" fill="#e6ebeb" stroke="#9caeb2" strokeWidth=".8" />
      <g transform="translate(179 123)" stroke="#879ca4" strokeWidth=".9" fill="#faf9f5"><path d="M0-5C-27-35-16-59 0-56 18-53 21-28 0-5Z"/><path d="M5 0C32-34 57-29 55-12 53 7 28 14 5 0Z"/><path d="M3 6C44 17 47 43 30 48 12 53-3 31 3 6Z"/><path d="M-4 6C-4 49-27 60-37 45-48 28-30 8-4 6Z"/><path d="M-6-1C-47 12-65-7-52-21-39-35-14-24-6-1Z"/><circle r="5" fill="#c6b68f" stroke="#b6a27a"/></g>
      <path d="M196 233v96m0 0-14 25 14 36 14-36-14-25Zm-14 25h28m-14-25v61" stroke="#829cae" strokeWidth=".9" /><path d="m196 329-14 25 14 36V329Z" fill="#b6cad7" fillOpacity=".28" />
      <path d="m279 171 3 10 10 3-10 3-3 10-3-10-10-3 10-3 3-10Zm-27 64 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" stroke="#a39bb1" strokeWidth=".8"/><path d="m282 188-29 53 37 40" stroke="#c4becd" strokeDasharray="2 6" strokeWidth=".7"/><circle cx="290" cy="281" r="2" fill="#a59bae" />
      <path d="M48 390h77m151 0h76" stroke="#c9c5be" strokeWidth=".7"/><circle cx="59" cy="120" r="2" fill="#acb8bd" />
    </svg></figure>
    <footer className="colophon-note"><span>文字由你写下，次序也由你决定。</span><span>定稿原文保留 · 目录可随时编订</span></footer>
  </section>;
}
