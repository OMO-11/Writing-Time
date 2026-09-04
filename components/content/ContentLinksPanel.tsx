"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowDownLeft, ArrowUpRight, Link2, Sparkles } from "lucide-react";
import { getContentHref } from "@/lib/content-registry";
import { db } from "@/lib/db";

export function ContentLinksPanel({ contentId }: { contentId: string }) {
  const references = useLiveQuery(async () => ({
    forward: await db.contentReferences.where("sourceId").equals(contentId).toArray(),
    backward: await db.contentReferences.where("targetId").equals(contentId).toArray(),
  }), [contentId], { forward: [], backward: [] });
  const ids = [...new Set([...references.forward.map((item) => item.targetId), ...references.backward.map((item) => item.sourceId)])];
  const linked = useLiveQuery(() => db.contents.bulkGet(ids), [ids.join("|")], []);
  const byId = new Map(linked.filter(Boolean).map((item) => [item!.id, item!]));
  const related = useLiveQuery(async () => {
    const [current, all] = await Promise.all([db.contents.get(contentId), db.contents.toArray()]);
    if (!current) return [];
    return all.filter((item) => item.id !== contentId).map((item) => ({ item, score: item.tags.filter((tag) => current.tags.includes(tag)).length * 3 + item.collectionIds.filter((id) => current.collectionIds.includes(id)).length * 2 })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || b.item.updatedAt - a.item.updatedAt).slice(0, 5).map(({ item }) => item);
  }, [contentId], []);
  return <aside className="content-links-panel"><header><Link2 aria-hidden="true" size={17} /><h2>内容关联</h2></header><section><h3><ArrowUpRight aria-hidden="true" size={15} />正向链接</h3>{references.forward.map((reference) => { const item = byId.get(reference.targetId); return item ? <Link key={reference.id} href={getContentHref(item)}><span>{item.title}</span><small>{reference.targetHeading ? `#${reference.targetHeading}` : reference.kind}</small></Link> : null; })}{!references.forward.length ? <p>尚未链接其他内容。可在 Markdown 中写入 [[内容标题]]。</p> : null}</section><section><h3><ArrowDownLeft aria-hidden="true" size={15} />反向链接</h3>{references.backward.map((reference) => { const item = byId.get(reference.sourceId); return item ? <Link key={reference.id} href={getContentHref(item)}><span>{item.title}</span><small>{reference.kind}</small></Link> : null; })}{!references.backward.length ? <p>暂时没有内容引用这里。</p> : null}</section><section><h3><Sparkles aria-hidden="true" size={15} />相关内容</h3>{related.map((item) => <Link key={item.id} href={getContentHref(item)}><span>{item.title}</span><small>{item.tags.slice(0, 2).join(" · ")}</small></Link>)}{!related.length ? <p>添加相同标签或合集后，相关内容会出现在这里。</p> : null}</section></aside>;
}
