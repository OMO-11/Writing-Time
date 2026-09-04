"use client";

import { Heading2, Image, LayoutTemplate, List, ListChecks, Minus, Quote, SquareCode, Table } from "lucide-react";
import type { CSSProperties } from "react";
import type { MarkdownCommand } from "@/components/workbench/markdown-commands";

const slashCommands: Array<{ command: MarkdownCommand; label: string; keywords: string; icon: typeof Heading2 }> = [
  { command: "h2", label: "标题", keywords: "heading title 标题", icon: Heading2 },
  { command: "bulletList", label: "无序列表", keywords: "list 列表", icon: List },
  { command: "taskList", label: "任务列表", keywords: "task todo 任务", icon: ListChecks },
  { command: "quote", label: "引用", keywords: "quote 引用", icon: Quote },
  { command: "codeBlock", label: "代码块", keywords: "code 代码", icon: SquareCode },
  { command: "table", label: "表格", keywords: "table 表格", icon: Table },
  { command: "image", label: "图片", keywords: "image 图片", icon: Image },
  { command: "divider", label: "分割线", keywords: "divider hr 分割", icon: Minus },
  { command: "template", label: "场景模板", keywords: "template scene 模板", icon: LayoutTemplate },
];

export function SlashCommandMenu({ query, position, onSelect }: { query: string; position: { x: number; y: number }; onSelect: (command: MarkdownCommand) => void }) {
  const visible = slashCommands.filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(query.toLowerCase()));
  const style = { "--menu-x": `${position.x}px`, "--menu-y": `${position.y}px` } as CSSProperties;
  return (
    <div className="slash-command-menu" role="menu" aria-label="斜杠命令" style={style}>
      <p>插入内容</p>
      {visible.map(({ command, label, icon: Icon }) => <button key={command} type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(command)}><Icon aria-hidden="true" size={17} /><span>{label}</span></button>)}
      {!visible.length && <span className="slash-empty">没有匹配命令</span>}
    </div>
  );
}
