import JSZip from "jszip";
import { validateBackup } from "@/lib/backup-validation";
import { MarkdownService } from "@/lib/markdown-service";
import { useUIStore } from "@/stores/ui-store";
import { db } from "@/lib/db";
import { rebuildAllReferences } from "@/lib/content-service";
import type { BookRecord } from "@/types/workshop";
import type { ContentItem } from "@/types/content";

interface BackupImage {
  id: string; name: string; title: string; mimeType: string; width?: number; height?: number;
  tags: string[]; collectionIds: string[]; relatedContentIds: string[]; workId?: string; altText: string; caption?: string;
  createdAt: number; updatedAt: number; blob: string; thumbnail?: string;
}

export interface WorkshopBackup {
  format: "fantasy-workshop-backup";
  version: 3 | 4;
  exportedAt: number;
  contents: ContentItem[];
  books?: BookRecord[];
  images: BackupImage[];
  editorSessions: unknown[];
  recoverySnapshots: unknown[];
  activity: unknown[];
  settings: Array<{ key: string; value: unknown }>;
}

function safeName(value: string) { return value.replace(/[\\/:*?"<>|]/g, "-").trim() || "untitled"; }
function download(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
function blobToDataUrl(blob: Blob) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); }); }
function dataUrlToBlob(source: string) { const [header, body] = source.split(","); const mime = header.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream"; const bytes = Uint8Array.from(atob(body), (character) => character.charCodeAt(0)); return new Blob([bytes], { type: mime }); }

export async function createJsonBackup() {
  await useUIStore.getState().flushSave();
  const [contents, images, editorSessions, recoverySnapshots, activity, settings, books] = await db.transaction("r", [db.contents, db.images, db.editorSessions, db.recoverySnapshots, db.activity, db.settings, db.books], () => Promise.all([db.contents.toArray(), db.images.toArray(), db.editorSessions.toArray(), db.recoverySnapshots.toArray(), db.activity.toArray(), db.settings.toArray(), db.books.toArray()]));
  const backup: WorkshopBackup = {
    format: "fantasy-workshop-backup", version: 4, exportedAt: Date.now(), contents, books,
    images: await Promise.all(images.map(async (image) => ({ ...image, blob: await blobToDataUrl(image.blob), thumbnail: image.thumbnail ? await blobToDataUrl(image.thumbnail) : undefined }))),
    editorSessions, recoverySnapshots, activity, settings,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  download(blob, `fantasy-workshop-backup-${new Date().toISOString().slice(0, 10)}.json`);
  await db.settings.put({ key: "last-backup-at", value: backup.exportedAt });
}

export async function readJsonBackup(file: File) {
  if (file.size > 256 * 1024 * 1024) throw new Error("备份超过 256 MiB，请拆分后导入。");
  return validateBackup(JSON.parse(await file.text()));
}

export async function previewRestore(backup: WorkshopBackup) {
  const existing = await db.contents.toArray();
  const locked = new Set(existing.filter((item) => item.type === "article" && item.payload.finalizedAt).map((item) => item.id));
  const ids = new Set(existing.map((item) => item.id));
  return { added: backup.contents.filter((item) => !ids.has(item.id)).length, overwritten: backup.contents.filter((item) => ids.has(item.id) && !locked.has(item.id)).length, skipped: backup.contents.filter((item) => locked.has(item.id)).length };
}

export async function restoreJsonBackup(file: File, replace = false, prepared?: WorkshopBackup) {
  await useUIStore.getState().flushSave();
  if (replace) throw new Error("为保护定稿，暂不支持清空替换；请使用合并恢复。");
  const backup = prepared ? await validateBackup(prepared) : await readJsonBackup(file);
  const decoded = backup.images.map((image) => ({ ...image, blob: dataUrlToBlob(image.blob), thumbnail: image.thumbnail ? dataUrlToBlob(image.thumbnail) : undefined }));
  let contentCount = 0, imageCount = 0, skippedCount = 0;
  await db.transaction("rw", [db.books, db.contents, db.images, db.works, db.collections, db.contentReferences, db.editorSessions, db.recoverySnapshots, db.activity, db.settings], async () => {
    const works = await db.works.toArray();
    const lockedWorks = works.filter((work) => !!work.finalizedAt);
    const lockedIds = new Set(lockedWorks.map((work) => work.id));
    const lockedContents = await db.contents.filter((content) => content.type === "article" && !!content.payload.finalizedAt).toArray();
    lockedContents.forEach((content) => lockedIds.add(content.id));
    const protectedImages = new Set<string>();
    for (const work of lockedWorks) {
      if (work.coverImageId) protectedImages.add(work.coverImageId);
      for (const match of work.markdown.matchAll(/fw-asset:\/\/([\w-]+)/g)) protectedImages.add(match[1]);
    }
    for (const content of lockedContents) {
      if (content.coverImageId) protectedImages.add(content.coverImageId);
      if (content.type === "article") for (const match of content.payload.markdown.matchAll(/fw-asset:\/\/([\w-]+)/g)) protectedImages.add(match[1]);
    }
    const accepted = backup.contents.filter((content) => !lockedIds.has(content.id) && !protectedImages.has(content.id));
    const acceptedImages = decoded.filter((image) => !protectedImages.has(image.id));
    const allContents = new Map((await db.contents.toArray()).map((item) => [item.id, item]));
    accepted.forEach((item) => {
      if (allContents.has(item.id) && allContents.get(item.id)!.type !== item.type) throw new Error("同 ID 内容类型冲突：" + item.id);
      if (allContents.has(item.id)) item.updatedAt = Math.max(Date.now(), allContents.get(item.id)!.updatedAt + 1);
      allContents.set(item.id, item);
    });
    const imageIds = new Set([...(await db.images.toCollection().primaryKeys()), ...acceptedImages.map((image) => image.id)]);
    for (const item of accepted) {
      const assets = [item.coverImageId, ...(item.type === "article" ? [...item.payload.markdown.matchAll(/fw-asset:\/\/([\w-]+)/g)].map((match) => match[1]) : item.type === "image" ? [item.payload.assetId] : item.type === "gallery" || item.type === "note" ? item.payload.imageIds : [])].filter(Boolean);
      for (const id of assets) if (!imageIds.has(id!)) throw new Error("备份引用缺失图片：" + id);
      const related = [...item.collectionIds, ...(item.type === "project" || item.type === "collection" ? item.payload.memberContentIds : item.type === "record" || item.type === "image" ? item.payload.relatedContentIds : item.type === "timeline" ? item.payload.events.flatMap((event) => event.relatedContentIds) : item.type === "exhibition" ? item.payload.blocks.flatMap((block) => block.contentId ? [block.contentId] : []) : item.type === "note" && item.payload.projectId ? [item.payload.projectId] : [])];
      for (const id of related) if (!allContents.has(id)) throw new Error("备份引用缺失内容：" + id);
      if (item.type === "exhibition") for (const id of item.payload.blocks.flatMap((block) => block.imageIds ?? [])) if (!imageIds.has(id)) throw new Error("展览引用缺失图片：" + id);
    }
    const articles = accepted.filter((content): content is ContentItem<"article"> => content.type === "article");
    const finalIds = new Set([...lockedIds, ...articles.filter((item) => item.payload.finalizedAt).map((item) => item.id)]);
    for (const book of backup.books ?? []) for (const chapter of book.chapters) for (const id of chapter.workIds) if (!finalIds.has(id)) throw new Error("书籍引用了缺失或未定稿作品：" + id);
    // Restoring a draft must not invalidate an already existing book.
    for (const book of await db.books.toArray()) for (const chapter of book.chapters) for (const id of chapter.workIds) if (!finalIds.has(id)) throw new Error("恢复会破坏已有书籍关联：" + id);
    await db.contents.bulkPut(accepted);
    for (const book of backup.books ?? []) {
      const previous = await db.books.get(book.id);
      await db.books.put({ ...book, updatedAt: previous ? Math.max(Date.now(), previous.updatedAt + 1) : book.updatedAt });
    }
    await db.images.bulkPut(acceptedImages);
    if (articles.length) await db.works.bulkPut(articles.map((article) => ({ sourceWorkId: article.payload.sourceWorkId, finalizedAt: article.payload.finalizedAt, id: article.id, slug: article.payload.slug, title: article.title, markdown: article.payload.markdown, renderedHtml: article.payload.renderedHtml, plainText: article.payload.plainText, excerptHtml: article.payload.excerptHtml, headings: article.payload.headings, tags: article.tags, collectionIds: article.collectionIds, coverImageId: article.coverImageId, status: article.status === "active" ? "draft" : article.status, createdAt: article.createdAt, updatedAt: article.updatedAt })));
    const collections = accepted.filter((content): content is ContentItem<"collection"> => content.type === "collection");
    if (collections.length) await db.collections.bulkPut(collections.map((item) => ({ id: item.id, name: item.title, workIds: item.payload.memberContentIds, createdAt: item.createdAt, updatedAt: item.updatedAt })));
    if (backup.editorSessions.length) await db.editorSessions.bulkPut(backup.editorSessions as never[]);
    if (backup.recoverySnapshots.length) await db.recoverySnapshots.bulkPut(backup.recoverySnapshots as never[]);
    if (backup.activity.length) await db.activity.bulkPut(backup.activity as never[]);
    await db.settings.bulkPut(backup.settings.filter((setting) => !["unified-content-v3", "last-backup-at"].includes(setting.key)));
    await rebuildAllReferences();
    contentCount = accepted.length; imageCount = acceptedImages.length;
    skippedCount = backup.contents.length - contentCount + backup.images.length - imageCount;
  });
  return { contentCount, imageCount, skippedCount };
}

export async function exportArticleMarkdown(article: ContentItem<"article">) {
  download(new Blob([article.payload.markdown], { type: "text/markdown;charset=utf-8" }), `${safeName(article.title)}.md`);
}

async function packageContents(roots: ContentItem[], name: string, book?: BookRecord, bookHtml?: string) {
  const zip = new JSZip();
  const visited = new Map<string, ContentItem>();
  const assets = new Set<string>();
  const collect = async (content: ContentItem) => {
    if (visited.has(content.id)) return;
    visited.set(content.id, content);
    if (content.coverImageId) assets.add(content.coverImageId);
    if (content.type === "image") assets.add(content.payload.assetId);
    if (content.type === "gallery" || content.type === "note") content.payload.imageIds.forEach((id) => assets.add(id));
    for (const match of JSON.stringify(content.payload).matchAll(/fw-asset:\/\/([\w-]+)/g)) assets.add(match[1]);
    const children = content.type === "project" || content.type === "collection" ? content.payload.memberContentIds : content.type === "exhibition" ? content.payload.blocks.flatMap((block) => { block.imageIds?.forEach((id) => assets.add(id)); return block.contentId ? [block.contentId] : []; }) : [];
    for (const id of children) { const child = await db.contents.get(id); if (!child) throw new Error("导出缺失内容：" + id); await collect(child); }
  };
  for (const root of roots) await collect(root);
  const mapping: Record<string, string> = {};
  for (const id of assets) {
    const image = await db.images.get(id);
    if (!image) throw new Error("导出缺失图片：" + id);
    const path = "images/" + safeName(id) + "-" + safeName(image.name);
    mapping["fw-asset://" + id] = path;
    zip.file(path, image.blob);
  }
  const rewrite = (value: string, prefix = "") => value.replace(/fw-asset:\/\/([\w-]+)/g, (url) => mapping[url] ? prefix + mapping[url] : url);
  zip.file("content.json", rewrite(JSON.stringify([...visited.values()], null, 2)));
  zip.file("resource-map.json", JSON.stringify(mapping, null, 2));
  if (book) {
    zip.file("book.json", JSON.stringify(book, null, 2));
    zip.file("book.md", "# " + book.title + "\n\n" + book.chapters.map((chapter) => "## " + chapter.title + "\n\n" + chapter.workIds.map((id) => { const item = visited.get(id)!; return "- [" + item.title + "](articles/" + safeName(id) + "-" + safeName(item.title) + ".md)"; }).join("\n")).join("\n\n"));
  }
  for (const item of visited.values()) if (item.type === "article") zip.file("articles/" + safeName(item.id) + "-" + safeName(item.title) + ".md", rewrite(item.payload.markdown, "../"));
  const bodies = await Promise.all([...visited.values()].map(async (item) => "<section><h1>" + escapeHtml(item.title) + "</h1>" + await contentHtml(item) + "</section>"));
  zip.file("index.html", htmlDocument(name, rewrite(bookHtml ?? bodies.join("\n"))));
  download(await zip.generateAsync({ type: "blob" }), safeName(name) + ".zip");
}
export async function exportGalleryZip(content: ContentItem<"gallery">) { return packageContents([content], content.title); }
export async function exportProjectZip(content: ContentItem<"project">) { return packageContents([content], content.title); }
export async function exportContentPackage(content: ContentItem) { return packageContents([content], content.title); }

async function contentHtml(content: ContentItem): Promise<string> {
  let body = content.type === "article" ? await MarkdownService.renderHtml(content.payload.markdown) : content.type === "note" || content.type === "record" ? await MarkdownService.renderHtml(content.type === "note" ? content.payload.text : content.payload.notesMarkdown) : "<p>" + escapeHtml(content.summary) + "</p>";
  const imageIds = content.type === "image" ? [content.payload.assetId] : content.type === "gallery" || content.type === "note" ? [...content.payload.imageIds] : [];
  if (content.coverImageId) imageIds.unshift(content.coverImageId);
  body += imageIds.map((id) => '<img alt="" src="fw-asset://' + id + '">').join("");
  return body;
}
function htmlDocument(title: string, body: string) {
  return '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeHtml(title) + '</title><style>body{max-width:760px;margin:48px auto;padding:0 24px;font:17px/1.85 Georgia,serif}img{max-width:100%}section{margin-bottom:48px}</style><main>' + body + '</main></html>';
}
async function embedAssets(body: string) {
  for (const id of new Set([...body.matchAll(/fw-asset:\/\/([\w-]+)/g)].map((match) => match[1]))) {
    const image = await db.images.get(id);
    if (!image) throw new Error("导出缺失图片：" + id);
    body = body.replaceAll("fw-asset://" + id, await blobToDataUrl(image.blob));
  }
  return body;
}
export async function exportBook(book: BookRecord, format: "html" | "zip") {
  const contents: ContentItem[] = [];
  let body = '<h1>' + escapeHtml(book.title) + '</h1><nav>' + book.chapters.map((chapter, index) => '<a href="#chapter-' + index + '">' + escapeHtml(chapter.title) + '</a> ').join("") + '</nav>';
  for (const [index, chapter] of book.chapters.entries()) {
    body += '<section id="chapter-' + index + '"><h2>' + escapeHtml(chapter.title) + '</h2>';
    for (const id of chapter.workIds) {
      const content = await db.contents.get(id);
      if (!content || content.type !== "article" || !content.payload.finalizedAt) throw new Error("书籍包含缺失或未定稿作品：" + id);
      contents.push(content);
      body += '<h3>' + escapeHtml(content.title) + '</h3>' + await contentHtml(content);
    }
    body += '</section>';
  }
  if (format === "zip") return packageContents(contents, book.title, book, body);
  download(new Blob([htmlDocument(book.title, await embedAssets(body))], { type: "text/html;charset=utf-8" }), safeName(book.title) + ".html");
}

function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
export async function exportStaticHtml(content: ContentItem) {
  const html = htmlDocument(content.title, await embedAssets(await contentHtml(content)));
  download(new Blob([html], { type: "text/html;charset=utf-8" }), safeName(content.title) + ".html");
}
