"use client";

import { Columns2, Download, Eye, Focus, Hash, ListTree, PenLine, TextCursorInput } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import type { EditorMode, WorkDocument } from "@/types/workshop";

const modes: Array<{ value: EditorMode; label: string; icon: typeof PenLine }> = [
  { value: "edit", label: "编辑", icon: PenLine },
  { value: "split", label: "分屏", icon: Columns2 },
  { value: "preview", label: "预览", icon: Eye },
];

export function EditorHeader({ work, outlineOpen, onTitleChange, onToggleOutline, onExport }: {
  work?: WorkDocument;
  outlineOpen: boolean;
  onTitleChange: (title: string) => void;
  onToggleOutline: () => void;
  onExport: () => void;
}) {
  const { editorMode, setEditorMode, focusMode, typewriterMode, lineNumbers, toggleFocusMode, toggleTypewriterMode, toggleLineNumbers } = useUIStore();
  return (
    <header className="editor-header">
      <label className="editor-title-field"><span className="sr-only">作品标题</span><input value={work?.title ?? "正在准备稿纸…"} disabled={!work} onChange={(event) => onTitleChange(event.target.value)} /></label>
      <div className="mode-switcher" aria-label="编辑器模式">{modes.map(({ value, label, icon: Icon }) => <button key={value} type="button" aria-pressed={editorMode === value} onClick={() => setEditorMode(value)}><Icon aria-hidden="true" size={16} /><span>{label}</span></button>)}</div>
      <div className="editor-view-tools" role="toolbar" aria-label="编辑视图">
        <button type="button" aria-pressed={outlineOpen} title="文档大纲" onClick={onToggleOutline}><ListTree aria-hidden="true" size={17} /><span>大纲</span></button>
        <button type="button" aria-pressed={lineNumbers} title="显示行号" onClick={toggleLineNumbers}><Hash aria-hidden="true" size={17} /><span>行号</span></button>
        <button type="button" aria-pressed={typewriterMode} title="打字机模式" onClick={toggleTypewriterMode}><TextCursorInput aria-hidden="true" size={17} /><span>打字机</span></button>
        <button type="button" aria-pressed={focusMode} title="专注模式" onClick={toggleFocusMode}><Focus aria-hidden="true" size={17} /><span>专注</span></button>
      </div>
      <button className="editor-export" type="button" onClick={onExport} disabled={!work}><Download aria-hidden="true" size={16} /><span>导出</span></button>
    </header>
  );
}
