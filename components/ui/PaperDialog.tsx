"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { FolioOrnament } from "@/components/ui/FolioOrnament";

/** Native modal provides inert background, Escape handling and keyboard focus containment. */
export function PaperDialog({ title, children, onClose, busy = false, drawer = false, folio = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; drawer?: boolean; folio?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>('input:not([type="checkbox"])')?.focus();
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus(); };
  }, []);
  return <dialog ref={ref} className={`paper-dialog${drawer ? " paper-drawer" : ""}${folio ? " folio-dialog" : ""}`} aria-labelledby={id} aria-modal="true" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    {folio && <div className="folio-dialog-engraving"><FolioOrnament /></div>}
    <header className="paper-dialog-heading"><h2 id={id}>{title}</h2><button type="button" aria-label="关闭对话框" disabled={busy} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
    {children}
  </dialog>;
}
