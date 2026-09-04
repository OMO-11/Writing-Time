"use client";

import { ArrowRight, FileText, FolderKanban, ImagePlus, Link2, MapPin, UserRound } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { ImagePicker } from "@/components/content/ImagePicker";
import { convertNote } from "@/lib/content-service";
import { db } from "@/lib/db";
import type { ContentItem } from "@/types/content";

export function NoteEditor({ content, onChange }: { content: ContentItem<"note">; onChange: (next: ContentItem<"note">) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const projects = useLiveQuery(() => db.contents.where("type").equals("project").toArray(), [], []);
  const patchPayload = (patch: Partial<ContentItem<"note">["payload"]>) => onChange({ ...content, payload: { ...content.payload, ...patch } });
  return (
    <section className="typed-editor note-content-editor">
      <header><div><span>Quick Note</span><h2>灵感卡片</h2></div><div className="segmented-control"><button type="button" aria-pressed={content.payload.format === "plain"} onClick={() => patchPayload({ format: "plain" })}>纯文本</button><button type="button" aria-pressed={content.payload.format === "markdown"} onClick={() => patchPayload({ format: "markdown" })}>Markdown</button></div></header>
      <textarea className="note-canvas" autoFocus value={content.payload.text} onChange={(event) => patchPayload({ text: event.target.value })} placeholder="记下一个画面、一句对白，或者尚未成形的想法……" />
      <div className="note-attachments">
        <button type="button" onClick={() => setPickerOpen(true)}><ImagePlus aria-hidden="true" size={16} />图片 {content.payload.imageIds.length || ""}</button>
        <label><Link2 aria-hidden="true" size={16} /><span className="sr-only">相关链接</span><input value={content.payload.links.join(", ")} onChange={(event) => patchPayload({ links: event.target.value.split(/[,，]/).map((item) => item.trim()).filter(Boolean) })} placeholder="添加链接，用逗号分隔" /></label>
        <label><FolderKanban aria-hidden="true" size={16} /><span className="sr-only">所属项目</span><select value={content.payload.projectId ?? ""} onChange={(event) => patchPayload({ projectId: event.target.value || undefined })}><option value="">不属于项目</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
      </div>
      <div className="conversion-strip"><span>转换为</span><button type="button" onClick={() => void convertNote(content, "article")}><FileText aria-hidden="true" size={16} />文章<ArrowRight aria-hidden="true" size={14} /></button><button type="button" onClick={() => void convertNote(content, "character")}><UserRound aria-hidden="true" size={16} />角色设定<ArrowRight aria-hidden="true" size={14} /></button><button type="button" onClick={() => void convertNote(content, "location")}><MapPin aria-hidden="true" size={16} />地点设定<ArrowRight aria-hidden="true" size={14} /></button><button type="button" disabled={!content.payload.projectId} onClick={() => void convertNote(content, "project-task")}><FolderKanban aria-hidden="true" size={16} />项目任务<ArrowRight aria-hidden="true" size={14} /></button></div>
      <ImagePicker open={pickerOpen} multiple selectedIds={content.payload.imageIds} onClose={() => setPickerOpen(false)} onSelect={(ids) => patchPayload({ imageIds: ids })} />
    </section>
  );
}
