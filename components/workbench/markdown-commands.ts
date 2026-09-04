import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

export type MarkdownCommand =
  | "h1" | "h2" | "h3" | "bold" | "italic" | "strike" | "quote"
  | "bulletList" | "orderedList" | "taskList" | "inlineCode" | "codeBlock"
  | "link" | "image" | "table" | "divider" | "template";

function replace(view: EditorView, from: number, to: number, insert: string, anchor: number, head = anchor) {
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.range(anchor, head),
    scrollIntoView: true,
  });
  view.focus();
}

function wrap(view: EditorView, prefix: string, suffix: string, placeholder: string) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  const content = selected || placeholder;
  const insert = `${prefix}${content}${suffix}`;
  replace(view, from, to, insert, from + prefix.length, from + prefix.length + content.length);
}

function prefixLines(view: EditorView, prefix: (index: number) => string) {
  const selection = view.state.selection.main;
  const first = view.state.doc.lineAt(selection.from);
  const last = view.state.doc.lineAt(selection.to);
  const original = view.state.sliceDoc(first.from, last.to);
  const insert = original.split("\n").map((line, index) => `${prefix(index)}${line}`).join("\n");
  replace(view, first.from, last.to, insert, first.from, first.from + insert.length);
}

function heading(view: EditorView, level: 1 | 2 | 3) {
  const selection = view.state.selection.main;
  const line = view.state.doc.lineAt(selection.from);
  const text = line.text.replace(/^#{1,6}\s+/, "");
  const insert = `${"#".repeat(level)} ${text || "标题"}`;
  const start = line.from + level + 1;
  replace(view, line.from, line.to, insert, start, start + (text || "标题").length);
}

export function applyMarkdownCommand(view: EditorView, command: MarkdownCommand) {
  switch (command) {
    case "h1": return heading(view, 1);
    case "h2": return heading(view, 2);
    case "h3": return heading(view, 3);
    case "bold": return wrap(view, "**", "**", "粗体文本");
    case "italic": return wrap(view, "*", "*", "斜体文本");
    case "strike": return wrap(view, "~~", "~~", "删除文本");
    case "inlineCode": return wrap(view, "`", "`", "code");
    case "link": return wrap(view, "[", "](https://)", "链接文字");
    case "image": return wrap(view, "![", "](image-url)", "图片说明");
    case "quote": return prefixLines(view, () => "> ");
    case "bulletList": return prefixLines(view, () => "- ");
    case "orderedList": return prefixLines(view, (index) => `${index + 1}. `);
    case "taskList": return prefixLines(view, () => "- [ ] ");
    case "codeBlock": return wrap(view, "```\n", "\n```", "代码");
    case "table": return wrap(view, "", "", "| 列一 | 列二 |\n| --- | --- |\n| 内容 | 内容 |");
    case "divider": return wrap(view, "\n\n", "\n\n", "---");
    case "template": return wrap(view, "", "", "## 场景\n\n时间：\n地点：\n出场角色：\n\n### 正文\n\n");
  }
}
