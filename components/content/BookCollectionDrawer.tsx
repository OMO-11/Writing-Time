"use client";
import { useState, type ReactNode } from "react";
import { LockKeyhole, Search } from "lucide-react";
import { PaperDialog } from "@/components/ui/PaperDialog";
import type { BookRecord, WorkDocument } from "@/types/workshop";

export function BookCollectionDrawer({ book, works, initialChapter, initialWork, busy, error, save, onClose, recovery }: { book: BookRecord; works: WorkDocument[]; initialChapter?: string; initialWork?: string; busy: boolean; error: string; save: (book: BookRecord) => Promise<boolean>; onClose: () => void; recovery?: ReactNode }) {
  const [selected, setSelected] = useState<string[]>(initialWork ? [initialWork] : []);
  const [chapterId, setChapterId] = useState(initialChapter ?? book.chapters[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const candidates = works.filter((work) => !book.chapters.some((chapter) => chapter.workIds.includes(work.id)));
  const chosen = selected.filter((id) => candidates.some((work) => work.id === id));
  const matching = candidates.filter((work) => work.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const visible = onlySelected ? chosen.map((id) => candidates.find((work) => work.id === id)!) : matching;
  const hidden = chosen.filter((id) => !matching.some((work) => work.id === id)).length;
  const destination = book.chapters.find((chapter) => chapter.id === chapterId);
  return <PaperDialog folio title="收录作品" drawer busy={busy} onClose={() => chosen.length ? setConfirmClose(true) : onClose()}>
    <fieldset disabled={busy} className="collection-body"><legend className="sr-only">选择已完成作品</legend>
      <p className="book-muted">原稿保持只读，按勾选顺序追加到目录。</p>
      <label className="book-field">搜索候选作品<span className="book-search"><Search size={17} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索已完成作品…" /></span></label>
      <label className="book-field">目标章节<select value={destination?.id ?? ""} onChange={(event) => setChapterId(event.target.value)}><option value="">选择目标章节…</option>{book.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select></label>
      <div className="book-action-row"><button type="button" aria-pressed={!onlySelected} onClick={() => setOnlySelected(false)}>全部候选</button><button type="button" aria-pressed={onlySelected} onClick={() => setOnlySelected(true)}>仅看已选 {chosen.length}</button></div>
      <div className="book-action-row"><button type="button" disabled={!matching.length} onClick={() => setSelected([...new Set([...chosen, ...matching.map((work) => work.id)])])}>全选搜索结果</button><button type="button" disabled={!chosen.length} onClick={() => setSelected([])}>清空选择</button></div>
      <div className="collection-list" role="group" aria-label="批量选择已完成作品">{visible.map((work) => <label className="collection-choice" key={work.id} data-selected={chosen.includes(work.id)}><input type="checkbox" checked={chosen.includes(work.id)} onChange={(event) => setSelected(event.target.checked ? [...chosen, work.id] : chosen.filter((id) => id !== work.id))} /><span><strong>{work.title}</strong><small><LockKeyhole size={12} aria-hidden="true" />已定稿 · 只读</small></span></label>)}{!visible.length && <p className="book-empty-note">{onlySelected ? "尚未选择作品。" : candidates.length ? "没有匹配的作品，请调整搜索。" : "暂无可收录作品，请先在创作工坊完全保存作品。"}</p>}</div>
      {!book.chapters.length && <p>请先关闭面板并添加章节。</p>}
    </fieldset>
    <footer className="collection-footer"><p role="status">已选 {chosen.length} 篇{hidden > 0 && <small>其中 {hidden} 篇不在当前搜索结果</small>}</p>{error && <p role="alert" className="paper-error">{error}</p>}{recovery}
      {confirmClose ? <div className="collection-discard"><p>还有未收录的选择，是否放弃？</p><button disabled={busy} onClick={() => setConfirmClose(false)}>继续选择</button><button disabled={busy} onClick={onClose}>放弃并关闭</button></div> : <button className="book-primary" disabled={busy || !chosen.length || !destination} onClick={async () => { if (await save({ ...book, chapters: book.chapters.map((chapter) => chapter.id === destination?.id ? { ...chapter, workIds: [...chapter.workIds, ...chosen] } : chapter) })) onClose(); }}>{busy ? "正在收录…" : "收录到章节"}</button>}
    </footer>
  </PaperDialog>;
}
