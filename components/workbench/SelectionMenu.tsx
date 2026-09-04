"use client";

import { Bold, Code, Italic, Link, Strikethrough } from "lucide-react";
import type { CSSProperties } from "react";
import type { MarkdownCommand } from "@/components/workbench/markdown-commands";

const actions: Array<{ command: MarkdownCommand; label: string; icon: typeof Bold }> = [
  { command: "bold", label: "粗体", icon: Bold }, { command: "italic", label: "斜体", icon: Italic },
  { command: "strike", label: "删除线", icon: Strikethrough }, { command: "link", label: "链接", icon: Link }, { command: "inlineCode", label: "行内代码", icon: Code },
];

export function SelectionMenu({ position, onSelect }: { position: { x: number; y: number }; onSelect: (command: MarkdownCommand) => void }) {
  const style = { "--menu-x": `${position.x}px`, "--menu-y": `${position.y}px` } as CSSProperties;
  return <div className="selection-menu" role="toolbar" aria-label="选中文本格式" style={style}>{actions.map(({ command, label, icon: Icon }) => <button key={command} type="button" title={label} aria-label={label} onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(command)}><Icon aria-hidden="true" size={16} /></button>)}</div>;
}
