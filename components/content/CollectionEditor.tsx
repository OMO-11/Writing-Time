"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Plus, X } from "lucide-react";
import { ContentIcon } from "@/components/content/ContentIcon";
import { db } from "@/lib/db";
import type { ContentItem } from "@/types/content";

export function CollectionEditor({ content, onChange }: { content: ContentItem<"collection">; onChange: (next: ContentItem<"collection">) => void }) {
  const all = useLiveQuery(() => db.contents.orderBy("updatedAt").reverse().toArray(), [], []);
  const ids = content.payload.memberContentIds;
  const patch = (memberContentIds: string[]) => onChange({ ...content, payload: { memberContentIds } });
  return <section className="typed-editor collection-content-editor"><header><div><span>Collection</span><h2>合集书架</h2></div><label><Plus aria-hidden="true" size={16} /><span className="sr-only">向合集添加内容</span><select value="" onChange={(event) => { if (event.target.value) patch([...new Set([...ids, event.target.value])]); }}><option value="">添加内容…</option>{all.filter((item) => item.id !== content.id && !ids.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></header><div className="collection-members">{ids.map((id) => { const item = all.find((candidate) => candidate.id === id); return item ? <article key={id}><ContentIcon type={item.type} /><div><strong>{item.title}</strong><span>{item.type}</span></div><button type="button" onClick={() => patch(ids.filter((itemId) => itemId !== id))} aria-label={`从合集移除 ${item.title}`}><X aria-hidden="true" size={16} /></button></article> : null; })}{!ids.length ? <p className="typed-empty">合集可以跨类型收纳文章、图片、灵感、设定卡和项目。</p> : null}</div></section>;
}
