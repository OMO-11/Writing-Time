"use client";

import { Link2, Plus } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { createRecordFields, RECORD_TEMPLATE_FIELDS, RECORD_TEMPLATE_LABELS } from "@/lib/content-registry";
import { db } from "@/lib/db";
import type { ContentItem, RecordTemplate } from "@/types/content";

export function RecordEditor({ content, onChange }: { content: ContentItem<"record">; onChange: (next: ContentItem<"record">) => void }) {
  const candidates = useLiveQuery(() => db.contents.where("type").anyOf(["article", "image", "project", "record"]).toArray(), [], []);
  const changeTemplate = (template: RecordTemplate) => onChange({ ...content, payload: { ...content.payload, template, fields: createRecordFields(template) } });
  const fields = RECORD_TEMPLATE_FIELDS[content.payload.template];
  const recordTheme = content.payload.template === "character" || content.payload.template === "costume" ? "noval" : "eden";
  return (
    <section className="typed-editor record-content-editor" data-character-theme={recordTheme}>
      <header><div><span>Structured Record</span><h2>{RECORD_TEMPLATE_LABELS[content.payload.template]}设定卡</h2></div><select aria-label="设定卡模板" value={content.payload.template} onChange={(event) => changeTemplate(event.target.value as RecordTemplate)}>{Object.entries(RECORD_TEMPLATE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}模板</option>)}</select></header>
      <div className="record-field-grid">{fields.map((field) => <label key={field}><span>{field}</span><input value={content.payload.fields[field] ?? ""} onChange={(event) => onChange({ ...content, payload: { ...content.payload, fields: { ...content.payload.fields, [field]: event.target.value } } })} /></label>)}</div>
      <label className="record-notes"><span>Markdown 备注</span><textarea rows={10} value={content.payload.notesMarkdown} onChange={(event) => onChange({ ...content, payload: { ...content.payload, notesMarkdown: event.target.value } })} placeholder="补充背景、关系、对白，支持 [[内容标题]] Wiki Link。" /></label>
      <div className="relation-picker"><span><Link2 aria-hidden="true" size={16} />关联内容</span><div>{content.payload.relatedContentIds.map((id) => { const item = candidates.find((candidate) => candidate.id === id); return item ? <button key={id} type="button" onClick={() => onChange({ ...content, payload: { ...content.payload, relatedContentIds: content.payload.relatedContentIds.filter((itemId) => itemId !== id) } })}>{item.title} ×</button> : null; })}</div><label><Plus aria-hidden="true" size={15} /><span className="sr-only">添加关联内容</span><select value="" onChange={(event) => { if (event.target.value) onChange({ ...content, payload: { ...content.payload, relatedContentIds: [...new Set([...content.payload.relatedContentIds, event.target.value])] } }); }}><option value="">添加关联…</option>{candidates.filter((item) => item.id !== content.id && !content.payload.relatedContentIds.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>
    </section>
  );
}
