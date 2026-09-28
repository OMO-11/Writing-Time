"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, Link2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BlobImage } from "@/components/ui/BlobImage";
import { deleteImageAsset, getImageReferences, saveContent } from "@/lib/content-service";
import { db } from "@/lib/db";
import { useUIStore } from "@/stores/ui-store";
import type { ContentItem } from "@/types/content";

export function ImageContentEditor({ content, onChange }: { content: ContentItem<"image">; onChange: (next: ContentItem<"image">) => void }) {
  const router = useRouter();
  const image = useLiveQuery(() => db.images.get(content.payload.assetId), [content.payload.assetId]);
  const allContents = useLiveQuery(() => db.contents.where("type").notEqual("image").toArray(), [], []);
  const references = useLiveQuery(() => getImageReferences(content.id), [content.id], []);
  const [deleteWarning, setDeleteWarning] = useState(false);
  const patch = (payload: Partial<typeof content.payload>) => onChange({ ...content, payload: { ...content.payload, ...payload } });
  if (!image) return <div className="typed-empty">图片文件已不可用，但元数据仍保留在内容库中。</div>;
  return <section className="typed-editor image-content-editor"><header><div><span>Asset Inspector</span><h2>图片资源</h2></div><span className="reference-badge"><Link2 aria-hidden="true" size={15} />{references.length ? `${references.length} 处引用` : "未引用"}</span></header><div className="image-editor-layout"><figure><BlobImage blob={image.blob} alt={content.payload.altText || content.title} width={image.width || 1200} height={image.height || 900} /><figcaption>{image.width} × {image.height} · {image.mimeType}</figcaption></figure><div className="image-metadata-form"><label><span>Alt 文本</span><input value={content.payload.altText} onChange={(event) => patch({ altText: event.target.value })} /></label><label><span>图片说明</span><textarea rows={4} value={content.payload.caption} onChange={(event) => patch({ caption: event.target.value })} /></label><label><span>关联内容</span><select value="" onChange={(event) => { if (event.target.value) patch({ relatedContentIds: [...new Set([...content.payload.relatedContentIds, event.target.value])] }); }}><option value="">添加关联…</option>{allContents.filter((item) => !content.payload.relatedContentIds.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><div className="relation-chips">{content.payload.relatedContentIds.map((id) => <button key={id} type="button" onClick={() => patch({ relatedContentIds: content.payload.relatedContentIds.filter((item) => item !== id) })}>{allContents.find((item) => item.id === id)?.title ?? id} ×</button>)}</div><label><span>设置为内容封面</span><select value="" onChange={(event) => { const target = allContents.find((item) => item.id === event.target.value); if (target) void saveContent({ ...target, coverImageId: content.id }); }}><option value="">选择内容…</option>{allContents.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><button className="danger-paper-button" type="button" onClick={() => setDeleteWarning(true)}><Trash2 aria-hidden="true" size={16} />删除图片</button></div></div>{deleteWarning ? <div className="inline-delete-warning" role="alert"><AlertTriangle aria-hidden="true" size={18} /><div><strong>{references.length ? "这张图片仍被引用" : "确认删除这张图片？"}</strong><p>{references.length ? `删除会影响 ${references.length} 处封面、图片集或内容引用。` : "删除后只能通过备份恢复。"}</p></div><button type="button" onClick={() => setDeleteWarning(false)}>取消</button><button className="danger-paper-button" type="button" onClick={() => void useUIStore.getState().flushSave().then(() => deleteImageAsset(content.id, true)).then((result) => { if (result.deleted) router.push("/gallery"); }).catch((error) => useUIStore.getState().showToast(String(error), "error"))}>仍然删除</button></div> : null}</section>;
}
