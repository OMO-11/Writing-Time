"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, FolderPlus, GripVertical, Milestone, Plus, Trash2 } from "lucide-react";
import { CharacterBadge } from "@/components/theme/CharacterBadge";
import { CharacterIllustration } from "@/components/theme/CharacterIllustration";
import { db } from "@/lib/db";
import type { ContentItem, ProjectBoardCard } from "@/types/content";

export function ProjectEditor({ content, onChange }: { content: ContentItem<"project">; onChange: (next: ContentItem<"project">) => void }) {
  const allContents = useLiveQuery(() => db.contents.orderBy("updatedAt").reverse().toArray(), [], []);
  const payload = content.payload;
  const patch = (next: Partial<typeof payload>) => onChange({ ...content, payload: { ...payload, ...next } });
  const addMember = (id: string) => { if (id) patch({ memberContentIds: [...new Set([...payload.memberContentIds, id])] }); };
  const addCard = (columnId: string) => {
    const title = window.prompt("任务名称");
    if (!title?.trim()) return;
    patch({ board: payload.board.map((column) => column.id === columnId ? { ...column, cards: [...column.cards, { id: crypto.randomUUID(), title: title.trim() }] } : column) });
  };
  const moveCard = (card: ProjectBoardCard, fromId: string, toId: string) => patch({ board: payload.board.map((column) => column.id === fromId ? { ...column, cards: column.cards.filter((item) => item.id !== card.id) } : column.id === toId ? { ...column, cards: [...column.cards, card] } : column) });
  return (
    <section className="typed-editor project-content-editor" data-character-theme="balanced">
      <div className="project-character-hero decorative-panel"><span aria-hidden="true" /><div><CharacterBadge character="duo" /><h2>一起把旅途整理成可以完成的计划</h2><p>诺瓦尔照看创作与灵感，伊登收好资料与素材；所有内容仍留在同一项目中。</p></div><CharacterIllustration character="duo" variant="project" placement="right" size="lg" fade /></div>
      <header><div><span>Project Atlas</span><h2>项目总览</h2></div><label className="project-progress"><span>{payload.progress}%</span><input aria-label="项目进度" type="range" min="0" max="100" value={payload.progress} onChange={(event) => patch({ progress: Number(event.target.value) })} /></label></header>
      <label className="project-description"><span>项目简介</span><textarea rows={4} value={payload.description} onChange={(event) => patch({ description: event.target.value })} placeholder="这个项目正在创造什么？" /></label>
      <section className="project-members"><header><h3>项目内容</h3><label><FolderPlus aria-hidden="true" size={16} /><span className="sr-only">添加项目内容</span><select value="" onChange={(event) => addMember(event.target.value)}><option value="">添加内容…</option>{allContents.filter((item) => item.id !== content.id && !payload.memberContentIds.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></header><div>{payload.memberContentIds.map((id) => { const item = allContents.find((candidate) => candidate.id === id); return item ? <article key={id}><strong>{item.title}</strong><span>{item.type}</span><button type="button" onClick={() => patch({ memberContentIds: payload.memberContentIds.filter((itemId) => itemId !== id) })} aria-label={`从项目移除 ${item.title}`}><Trash2 aria-hidden="true" size={15} /></button></article> : null; })}{!payload.memberContentIds.length ? <p>文章、图片、设定卡、图片集与展览都可以汇入同一个项目。</p> : null}</div></section>
      {payload.memberContentIds.length ? <section className="project-recent"><h3>最近编辑</h3><ol>{allContents.filter((item) => payload.memberContentIds.includes(item.id)).slice(0, 5).map((item) => <li key={item.id}><span>{item.title}</span><time dateTime={new Date(item.updatedAt).toISOString()}>{new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(item.updatedAt)}</time></li>)}</ol></section> : null}
      <section className="project-board"><header><h3>简单看板</h3><span>拖动卡片跨列移动，也可使用方向按钮</span></header><div>{payload.board.map((column, columnIndex) => <section key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const data = JSON.parse(event.dataTransfer.getData("application/json") || "null") as { card: ProjectBoardCard; fromId: string } | null; if (data) moveCard(data.card, data.fromId, column.id); }}><header><strong>{column.title}</strong><button type="button" aria-label={`在${column.title}添加任务`} onClick={() => addCard(column.id)}><Plus aria-hidden="true" size={16} /></button></header>{column.cards.map((card) => <article draggable key={card.id} onDragStart={(event) => event.dataTransfer.setData("application/json", JSON.stringify({ card, fromId: column.id }))}><GripVertical aria-hidden="true" size={14} /><span>{card.title}</span><div><button type="button" disabled={columnIndex === 0} aria-label={`将${card.title}移到上一列`} onClick={() => moveCard(card, column.id, payload.board[columnIndex - 1].id)}><ChevronLeft aria-hidden="true" size={14} /></button><button type="button" disabled={columnIndex === payload.board.length - 1} aria-label={`将${card.title}移到下一列`} onClick={() => moveCard(card, column.id, payload.board[columnIndex + 1].id)}><ChevronRight aria-hidden="true" size={14} /></button></div></article>)}</section>)}</div></section>
      <section className="project-milestones"><header><h3><Milestone aria-hidden="true" size={17} />里程碑</h3><button type="button" onClick={() => { const title = window.prompt("里程碑名称"); if (title?.trim()) patch({ milestones: [...payload.milestones, { id: crypto.randomUUID(), title: title.trim(), completed: false }] }); }}><Plus aria-hidden="true" size={16} />添加</button></header>{payload.milestones.map((item) => <button type="button" key={item.id} onClick={() => patch({ milestones: payload.milestones.map((milestone) => milestone.id === item.id ? { ...milestone, completed: !milestone.completed } : milestone) })}>{item.completed ? <CheckCircle2 aria-hidden="true" size={17} /> : <Circle aria-hidden="true" size={17} />}<span>{item.title}</span></button>)}{!payload.milestones.length ? <p>还没有里程碑。</p> : null}</section>
    </section>
  );
}
