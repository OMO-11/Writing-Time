"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ImagePlus } from "lucide-react";
import { useState } from "react";
import { ImagePicker } from "@/components/content/ImagePicker";
import { db } from "@/lib/db";
import type { ContentItem, ContentStatus } from "@/types/content";

export function CommonContentFields({ content, onChange }: { content: ContentItem; onChange: (next: ContentItem) => void }) {
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const collections = useLiveQuery(() => db.contents.where("type").equals("collection").toArray(), [], []);
  const patch = (next: Partial<ContentItem>) => onChange({ ...content, ...next } as ContentItem);
  return (
    <section className="common-content-fields" aria-labelledby="common-fields-title">
      <h2 id="common-fields-title">基本信息</h2>
      <label><span>标题</span><input value={content.title} onChange={(event) => patch({ title: event.target.value })} /></label>
      <label><span>摘要</span><textarea rows={3} value={content.summary} onChange={(event) => patch({ summary: event.target.value })} placeholder="用一两句话说明这项内容。" /></label>
      <div>
        <label><span>状态</span><select value={content.status} onChange={(event) => patch({ status: event.target.value as ContentStatus })}><option value="draft">草稿</option><option value="active">进行中</option><option value="completed">已完成</option><option value="archived">已归档</option></select></label>
        <label><span>标签</span><input value={content.tags.join(", ")} onChange={(event) => patch({ tags: event.target.value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean) })} placeholder="角色, 月色, 第一章" /></label>
      </div>
      <div className="common-relations-row">
        <label><span>所属合集</span><select value="" onChange={(event) => { if (event.target.value) patch({ collectionIds: [...new Set([...content.collectionIds, event.target.value])] }); }}><option value="">添加合集…</option>{collections.filter((item) => !content.collectionIds.includes(item.id) && item.id !== content.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        {content.type !== "image" ? <button type="button" onClick={() => setCoverPickerOpen(true)}><ImagePlus aria-hidden="true" size={16} />{content.coverImageId ? "更换封面" : "选择封面"}</button> : <span />}
      </div>
      {content.collectionIds.length ? <div className="common-collection-chips">{content.collectionIds.map((id) => <button key={id} type="button" onClick={() => patch({ collectionIds: content.collectionIds.filter((item) => item !== id) })}>{collections.find((item) => item.id === id)?.title ?? "未知合集"} ×</button>)}</div> : null}
      <ImagePicker open={coverPickerOpen} selectedIds={content.coverImageId ? [content.coverImageId] : []} onClose={() => setCoverPickerOpen(false)} onSelect={(ids) => patch({ coverImageId: ids[0] })} />
    </section>
  );
}
