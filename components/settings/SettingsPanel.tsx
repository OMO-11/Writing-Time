"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { AlignLeft, Database, Download, MoonStar, RotateCcw, ShieldCheck } from "lucide-react";
import { useRef } from "react";
import { articleContentFromWork, db } from "@/lib/db";
import { createJsonBackup, restoreJsonBackup, readJsonBackup, previewRestore } from "@/lib/export-service";
import { MarkdownService } from "@/lib/markdown-service";
import { SearchService } from "@/lib/search-service";
import { useUIStore } from "@/stores/ui-store";
import type { LineBreakMode } from "@/types/workshop";
import { StorageHealth } from "@/components/settings/StorageHealth";
import { CharacterDisplaySettings } from "@/components/theme/CharacterDisplaySettings";

export function SettingsPanel() {
  const restoreRef = useRef<HTMLInputElement>(null);
  const counts = useLiveQuery(async () => ({ works: await db.works.count(), images: await db.images.count() }), [], { works: 0, images: 0 });
  const lineBreakMode = useLiveQuery(async () => (await db.settings.get("line-break-mode"))?.value === "single" ? "single" : "standard", [], "standard");
  const showToast = useUIStore((state) => state.showToast);

  const changeLineBreakMode = async (mode: LineBreakMode) => {
    await db.settings.put({ key: "line-break-mode", value: mode });
    const works = await db.works.toArray();
    for (const work of works) {
      if (work.finalizedAt) continue;
      const processed = await MarkdownService.process(work.markdown, mode);
      const next = { ...work, renderedHtml: processed.renderedHtml, plainText: processed.plainText, excerptHtml: processed.excerptHtml, headings: processed.headings };
      await db.works.put(next);
      const previous = await db.contents.get(work.id);
      await db.contents.put({ ...articleContentFromWork(next), favorite: previous?.favorite ?? false });
    }
    await SearchService.rebuild();
    showToast("换行模式已应用到全部本地作品。", "success");
  };

  return (
    <div className="settings-page">
      <CharacterDisplaySettings />
      <section><Database aria-hidden="true" size={23} /><div><h2>本地存储</h2><p>当前有 {counts.works} 篇作品与 {counts.images} 幅图片保存在浏览器 IndexedDB 中。</p><StorageHealth /></div></section>
      <section><Download aria-hidden="true" size={23} /><div><h2>备份与恢复</h2><p>完整 JSON 备份包含统一内容、图片原文件、编辑会话与设置。恢复前建议先导出当前备份。</p><div className="settings-actions"><button type="button" onClick={() => void createJsonBackup().then(() => showToast("完整备份已生成。", "success")).catch((error) => showToast(String(error), "error"))}><Download aria-hidden="true" size={16} />导出完整 JSON</button><button type="button" onClick={() => restoreRef.current?.click()}><RotateCcw aria-hidden="true" size={16} />恢复 JSON 备份</button></div><input ref={restoreRef} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void (async () => { const backup = await readJsonBackup(file); const preview = await previewRestore(backup); if (!window.confirm(`将新增 ${preview.added} 项、覆盖 ${preview.overwritten} 项、跳过 ${preview.skipped} 项定稿。定稿图片也会跳过；无效引用将中止恢复。继续吗？`)) return; const result = await restoreJsonBackup(file, false, backup); showToast(`已恢复 ${result.contentCount} 项内容与 ${result.imageCount} 张图片，跳过 ${result.skippedCount} 项受保护记录。`, "success"); })().catch((error) => showToast(error instanceof Error ? error.message : "备份恢复失败。", "error")); event.currentTarget.value = ""; }} /></div></section>
      <section><AlignLeft aria-hidden="true" size={23} /><div><h2>Markdown 换行模式</h2><p>标准模式遵循 CommonMark；单次换行模式会把正文中的每个换行直接显示出来。</p><label className="settings-select"><span className="sr-only">换行模式</span><select value={lineBreakMode} onChange={(event) => void changeLineBreakMode(event.target.value as LineBreakMode)}><option value="standard">标准 Markdown</option><option value="single">单次换行直接显示</option></select></label></div></section>
      <section><ShieldCheck aria-hidden="true" size={23} /><div><h2>内容安全</h2><p>导入与渲染统一经过 rehype-sanitize 清理；第一阶段不会上传到服务器。</p></div></section>
      <section><MoonStar aria-hidden="true" size={23} /><div><h2>动效偏好</h2><p>界面自动遵循系统的“减少动态效果”设置。</p></div></section>
    </div>
  );
}
