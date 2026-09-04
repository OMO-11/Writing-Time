"use client";

import { FilePlus2, ScrollText, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { WorkDocument } from "@/types/workshop";

export function WorkDrawer({ open, works, activeId, onClose, onSelect, onCreate }: {
  open: boolean;
  works: WorkDocument[];
  activeId?: string;
  onClose: () => void;
  onSelect: (work: WorkDocument) => void;
  onCreate: () => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.aside className="work-drawer story-panel" aria-label="作品抽屉" aria-hidden={!open} inert={!open} initial={false} animate={{ x: open ? 0 : "calc(-100% - 18px)", opacity: open ? 1 : .4 }} transition={{ duration: reduceMotion ? 0 : .24 }}>
      <div className="drawer-heading"><div><p className="eyebrow">Manuscripts</p><h2>作品抽屉</h2></div><button type="button" onClick={onClose} aria-label="收起作品抽屉"><X aria-hidden="true" size={18} /></button></div>
      <button type="button" className="drawer-create" onClick={onCreate}><FilePlus2 aria-hidden="true" size={18} />新建一页</button>
      <div className="work-list">{works.map((work) => <button key={work.id} type="button" data-active={activeId === work.id} onClick={() => onSelect(work)}><ScrollText aria-hidden="true" size={18} /><span><strong>{work.title}</strong><small>{work.status === "draft" ? "草稿" : work.status === "completed" ? "已完成" : "已归档"}</small></span></button>)}</div>
    </motion.aside>
  );
}
