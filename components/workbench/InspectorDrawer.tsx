"use client";

import { ImagePlus, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { WorkDocument, WorkStatus } from "@/types/workshop";

export function InspectorDrawer({ open, work, onClose, onChange, onCover }: {
  open: boolean;
  work?: WorkDocument;
  onClose: () => void;
  onChange: (patch: Partial<WorkDocument>) => void;
  onCover: (file?: File) => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.aside className="inspector-drawer story-panel" aria-label="作品属性抽屉" aria-hidden={!open} inert={!open} initial={false} animate={{ x: open ? 0 : "calc(100% + 18px)", opacity: open ? 1 : .4 }} transition={{ duration: reduceMotion ? 0 : .24 }}>
      <div className="drawer-heading"><div><p className="eyebrow">Details</p><h2>作品属性</h2></div><button type="button" onClick={onClose} aria-label="收起作品属性"><X aria-hidden="true" size={18} /></button></div>
      {work ? <div className="inspector-form">
        <label><span className="field-label">标题</span><input className="field-input" value={work.title} onChange={(event) => onChange({ title: event.target.value })} /></label>
        <div><span className="field-label">封面</span><label className="cover-picker"><ImagePlus aria-hidden="true" size={18} /><span>{work.coverImageId ? "更换封面" : "选择一张图片"}</span><input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => onCover(event.target.files?.[0])} /></label></div>
        <label><span className="field-label">标签</span><input className="field-input" value={work.tags.join(", ")} placeholder="旅途, 魔法" onChange={(event) => onChange({ tags: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
        <label><span className="field-label">状态</span><select className="field-input" value={work.status} onChange={(event) => onChange({ status: event.target.value as WorkStatus })}><option value="draft">草稿</option><option value="completed">已完成</option><option value="archived">已归档</option></select></label>
        <fieldset className="export-options"><legend className="field-label">导出选项</legend><label><input type="checkbox" defaultChecked /> 包含 Frontmatter</label><label><input type="checkbox" defaultChecked /> 保留图片引用</label></fieldset>
      </div> : null}
    </motion.aside>
  );
}
