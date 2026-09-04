"use client";

import { CrystalStatusIcon } from "@/components/theme/CrystalStatusIcon";
import type { SaveState } from "@/types/workshop";

export function EditorStatusBar({ wordCount, paragraphCount, line, column, saveState }: {
  wordCount: number;
  paragraphCount: number;
  line: number;
  column: number;
  saveState: SaveState;
}) {
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 400));
  return (
    <footer className="editor-status-bar" aria-label="编辑器状态">
      <span>{wordCount.toLocaleString("zh-CN")} 字</span>
      <span>{paragraphCount} 段</span>
      <span>约 {readingMinutes} 分钟阅读</span>
      <span>第 {line} 行，第 {column} 列</span>
      <span className="editor-status-save" data-state={saveState}><CrystalStatusIcon state={saveState} /></span>
    </footer>
  );
}
