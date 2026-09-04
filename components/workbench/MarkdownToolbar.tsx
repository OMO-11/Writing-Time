"use client";

import { Bold, Code, FileSearch, Heading1, Heading2, Heading3, Image, Italic, Link, List, ListChecks, ListOrdered, Minus, Quote, Redo2, SquareCode, Strikethrough, Table, Undo2 } from "lucide-react";
import type { MarkdownCommand } from "@/components/workbench/markdown-commands";

const commands: Array<{ command: MarkdownCommand; label: string; icon: typeof Bold }> = [
  { command: "h1", label: "一级标题", icon: Heading1 }, { command: "h2", label: "二级标题", icon: Heading2 }, { command: "h3", label: "三级标题", icon: Heading3 },
  { command: "bold", label: "粗体", icon: Bold }, { command: "italic", label: "斜体", icon: Italic }, { command: "strike", label: "删除线", icon: Strikethrough },
  { command: "quote", label: "引用", icon: Quote }, { command: "bulletList", label: "无序列表", icon: List }, { command: "orderedList", label: "有序列表", icon: ListOrdered },
  { command: "taskList", label: "任务列表", icon: ListChecks }, { command: "inlineCode", label: "行内代码", icon: Code }, { command: "codeBlock", label: "代码块", icon: SquareCode },
  { command: "link", label: "链接", icon: Link }, { command: "image", label: "图片", icon: Image }, { command: "table", label: "表格", icon: Table }, { command: "divider", label: "分割线", icon: Minus },
];

export function MarkdownToolbar({ onCommand, onUndo, onRedo, onFind, onPickImage }: { onCommand: (command: MarkdownCommand) => void; onUndo: () => void; onRedo: () => void; onFind: () => void; onPickImage?: () => void }) {
  return (
    <div className="markdown-toolbar" role="toolbar" aria-label="Markdown 格式工具栏">
      <div className="markdown-toolbar-group">
        <button type="button" title="撤销 (Ctrl/Cmd+Z)" aria-label="撤销" onClick={onUndo}><Undo2 aria-hidden="true" size={17} /></button>
        <button type="button" title="重做" aria-label="重做" onClick={onRedo}><Redo2 aria-hidden="true" size={17} /></button>
        <button type="button" title="查找与替换" aria-label="查找与替换" onClick={onFind}><FileSearch aria-hidden="true" size={17} /></button>
      </div>
      <div className="markdown-toolbar-group">
        {commands.map(({ command, label, icon: Icon }) => <button key={command} type="button" title={label} aria-label={label} onClick={() => command === "image" && onPickImage ? onPickImage() : onCommand(command)}><Icon aria-hidden="true" size={17} /></button>)}
      </div>
    </div>
  );
}
