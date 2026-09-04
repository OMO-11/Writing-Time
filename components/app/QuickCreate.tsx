"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, FileDown, FilePlus2, Images, Lightbulb, FolderKanban } from "lucide-react";
import { useRef } from "react";
import { createBlankWork } from "@/lib/db";
import { importMarkdownWork } from "@/lib/work-import";
import { createContent } from "@/lib/content-service";
import { useUIStore } from "@/stores/ui-store";

export function QuickCreate() {
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const showToast = useUIStore((state) => state.showToast);
  const flushSave = useUIStore((state) => state.flushSave);

  return (
    <details className="quick-create" ref={detailsRef}>
      <summary><FilePlus2 aria-hidden="true" size={17} /><span>快速创建</span><ChevronDown aria-hidden="true" size={14} /></summary>
      <div>
        <button type="button" onClick={() => void flushSave().then(createBlankWork).then((work) => { detailsRef.current?.removeAttribute("open"); router.push(`/workbench?work=${work.id}`); })}>
          <FilePlus2 aria-hidden="true" size={17} /><span><strong>新建作品</strong><small>打开空白 Markdown</small></span>
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          <FileDown aria-hidden="true" size={17} /><span><strong>导入 Markdown</strong><small>读取正文与 Frontmatter</small></span>
        </button>
        <button type="button" onClick={() => void flushSave().then(() => createContent("note")).then((content) => { detailsRef.current?.removeAttribute("open"); router.push(`/content/${content.id}`); })}>
          <Lightbulb aria-hidden="true" size={17} /><span><strong>灵感卡片</strong><small>先记下，再慢慢发展</small></span>
        </button>
        <button type="button" onClick={() => void flushSave().then(() => createContent("gallery")).then((content) => { detailsRef.current?.removeAttribute("open"); router.push(`/content/${content.id}`); })}>
          <Images aria-hidden="true" size={17} /><span><strong>新建图片集</strong><small>从图片库选择与排序</small></span>
        </button>
        <button type="button" onClick={() => void flushSave().then(() => createContent("project")).then((content) => { detailsRef.current?.removeAttribute("open"); router.push(`/content/${content.id}`); })}>
          <FolderKanban aria-hidden="true" size={17} /><span><strong>新建项目</strong><small>汇总内容、进度与里程碑</small></span>
        </button>
      </div>
      <input ref={fileRef} className="sr-only" type="file" accept=".md,text/markdown" onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        if (file) void flushSave().then(() => importMarkdownWork(file)).then((work) => { detailsRef.current?.removeAttribute("open"); router.push(`/workbench?work=${work.id}`); }).catch(() => showToast("导入失败，请检查 Markdown 文件。", "error"));
        event.currentTarget.value = "";
      }} />
    </details>
  );
}
