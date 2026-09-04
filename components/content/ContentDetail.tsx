"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Check, Download, ExternalLink, LoaderCircle, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CollectionEditor } from "@/components/content/CollectionEditor";
import { CommonContentFields } from "@/components/content/CommonContentFields";
import { ContentIcon } from "@/components/content/ContentIcon";
import { ContentLinksPanel } from "@/components/content/ContentLinksPanel";
import { ExhibitionEditor } from "@/components/content/ExhibitionEditor";
import { GalleryEditor } from "@/components/content/GalleryEditor";
import { ImageContentEditor } from "@/components/content/ImageContentEditor";
import { NoteEditor } from "@/components/content/NoteEditor";
import { ProjectEditor } from "@/components/content/ProjectEditor";
import { RecordEditor } from "@/components/content/RecordEditor";
import { TimelineEditor } from "@/components/content/TimelineEditor";
import { CONTENT_TYPE_REGISTRY, getContentHref } from "@/lib/content-registry";
import { saveContent } from "@/lib/content-service";
import { db } from "@/lib/db";
import { exportArticleMarkdown, exportContentPackage, exportGalleryZip, exportProjectZip, exportStaticHtml } from "@/lib/export-service";
import type { ContentItem } from "@/types/content";

function TypedEditor({ content, onChange }: { content: ContentItem; onChange: (next: ContentItem) => void }) {
  if (content.type === "gallery") return <GalleryEditor content={content} onChange={onChange} />;
  if (content.type === "note") return <NoteEditor content={content} onChange={onChange} />;
  if (content.type === "record") return <RecordEditor content={content} onChange={onChange} />;
  if (content.type === "project") return <ProjectEditor content={content} onChange={onChange} />;
  if (content.type === "timeline") return <TimelineEditor content={content} onChange={onChange} />;
  if (content.type === "exhibition") return <ExhibitionEditor content={content} onChange={onChange} />;
  if (content.type === "collection") return <CollectionEditor content={content} onChange={onChange} />;
  if (content.type === "image") return <ImageContentEditor content={content} onChange={onChange} />;
  return <section className="typed-editor article-content-launch"><h2>文章由 Markdown 工坊编辑</h2><p>继续使用 CodeMirror、预览、文档大纲和自动保存工作流。</p><Link className="primary-paper-button" href={getContentHref(content)}>打开创作工坊<ExternalLink aria-hidden="true" size={16} /></Link></section>;
}

export function ContentDetail({ id }: { id: string }) {
  const stored = useLiveQuery(() => db.contents.get(id), [id]);
  const [draft, setDraft] = useState<ContentItem>();
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const hydratedId = useRef<string | undefined>(undefined);
  const lastSaved = useRef("");
  useEffect(() => { if (stored && hydratedId.current !== stored.id) { hydratedId.current = stored.id; lastSaved.current = JSON.stringify(stored); setDraft(stored); } }, [stored]);
  useEffect(() => {
    if (!draft || JSON.stringify(draft) === lastSaved.current) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => { void saveContent(draft).then((next) => { lastSaved.current = JSON.stringify(next); setDraft(next); setSaveState("saved"); }).catch(() => setSaveState("error")); }, 700);
    return () => window.clearTimeout(timer);
  }, [draft]);
  if (stored === undefined && !draft) return <main className="content-detail-loading"><LoaderCircle aria-hidden="true" size={22} />正在打开内容…</main>;
  if (!draft) return <main className="content-detail-loading">没有找到这项内容。</main>;
  const definition = CONTENT_TYPE_REGISTRY[draft.type];
  return <main className="content-detail-page"><header className="content-detail-header"><Link href="/library" aria-label="返回内容工作区"><ArrowLeft aria-hidden="true" size={18} /></Link><span data-accent={definition.accent}><ContentIcon type={draft.type} />{definition.label}</span><div><h1>{draft.title}</h1><p>{definition.description}</p></div><details className="content-export-menu"><summary><Download aria-hidden="true" size={17} />导出</summary><div><button type="button" onClick={() => void exportStaticHtml(draft)}>静态 HTML</button><button type="button" onClick={() => void exportContentPackage(draft)}>内容与图片 ZIP</button>{draft.type === "article" ? <button type="button" onClick={() => void exportArticleMarkdown(draft)}>单篇 Markdown</button> : null}{draft.type === "gallery" ? <button type="button" onClick={() => void exportGalleryZip(draft)}>图片集 ZIP</button> : null}{draft.type === "project" ? <button type="button" onClick={() => void exportProjectZip(draft)}>项目 ZIP</button> : null}</div></details><button type="button" aria-pressed={draft.favorite} onClick={() => setDraft({ ...draft, favorite: !draft.favorite } as ContentItem)}><Star aria-hidden="true" size={17} fill={draft.favorite ? "currentColor" : "none"} />{draft.favorite ? "已收藏" : "收藏"}</button><span className="content-save-indicator" data-state={saveState}>{saveState === "saving" ? <LoaderCircle aria-hidden="true" size={15} /> : <Check aria-hidden="true" size={15} />}{saveState === "saving" ? "保存中" : saveState === "error" ? "保存失败" : "已保存"}</span></header><div className="content-detail-layout"><div className="content-detail-main"><CommonContentFields content={draft} onChange={setDraft} /><TypedEditor content={draft} onChange={setDraft} /></div><ContentLinksPanel contentId={draft.id} /></div></main>;
}
