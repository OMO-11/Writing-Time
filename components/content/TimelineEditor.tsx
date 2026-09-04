"use client";

import { CalendarPlus, GripVertical, Trash2 } from "lucide-react";
import type { ContentItem } from "@/types/content";

export function TimelineEditor({ content, onChange }: { content: ContentItem<"timeline">; onChange: (next: ContentItem<"timeline">) => void }) {
  const events = content.payload.events;
  const patchEvents = (next: typeof events) => onChange({ ...content, payload: { events: next } });
  const move = (from: number, to: number) => { const next = [...events]; const [event] = next.splice(from, 1); next.splice(to, 0, event); patchEvents(next); };
  return <section className="typed-editor timeline-content-editor"><header><div><span>Timeline</span><h2>时间线事件</h2></div><button className="primary-paper-button" type="button" onClick={() => patchEvents([...events, { id: crypto.randomUUID(), date: "", title: "新事件", description: "", relatedContentIds: [] }])}><CalendarPlus aria-hidden="true" size={17} />添加事件</button></header><div className="timeline-event-list">{events.map((item, index) => <article key={item.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => move(Number(event.dataTransfer.getData("text/plain")), index)}><GripVertical aria-hidden="true" size={16} /><div><input aria-label="事件日期" value={item.date} placeholder="日期或纪年" onChange={(event) => patchEvents(events.map((entry) => entry.id === item.id ? { ...entry, date: event.target.value } : entry))} /><input aria-label="事件标题" value={item.title} onChange={(event) => patchEvents(events.map((entry) => entry.id === item.id ? { ...entry, title: event.target.value } : entry))} /><textarea aria-label="事件说明" value={item.description} onChange={(event) => patchEvents(events.map((entry) => entry.id === item.id ? { ...entry, description: event.target.value } : entry))} /></div><button type="button" aria-label="删除事件" onClick={() => patchEvents(events.filter((entry) => entry.id !== item.id))}><Trash2 aria-hidden="true" size={16} /></button></article>)}{!events.length ? <p className="typed-empty">添加第一个故事事件、项目节点或世界纪年。</p> : null}</div></section>;
}
