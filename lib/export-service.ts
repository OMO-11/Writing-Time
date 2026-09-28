import JSZip from "jszip";
import { db } from "@/lib/db";
import { ensureUnifiedContentModel } from "@/lib/content-service";
import type { BookRecord } from "@/types/workshop";
import type { ContentItem } from "@/types/content";

interface BackupImage {
  id: string; name: string; title: string; mimeType: string; width?: number; height?: number;
  tags: string[]; collectionIds: string[]; relatedContentIds: string[]; workId?: string; altText: string; caption?: string;
  createdAt: number; updatedAt: number; blob: string; thumbnail?: string;
}

export interface WorkshopBackup {
  format: "fantasy-workshop-backup";
  version: 3;
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
  const [contents, images, editorSessions, recoverySnapshots, activity, settings] = await Promise.all([db.contents.toArray(), db.images.toArray(), db.editorSessions.toArray(), db.recoverySnapshots.toArray(), db.activity.toArray(), db.settings.toArray()]);
  const backup: WorkshopBackup = {
    format: "fantasy-workshop-backup", version: 3, exportedAt: Date.now(), contents, books: await db.books.toArray(),
    images: await Promise.all(images.map(async (image) => ({ ...image, blob: await blobToDataUrl(image.blob), thumbnail: image.thumbnail ? await blobToDataUrl(image.thumbnail) : undefined }))),
    editorSessions, recoverySnapshots, activity, settings,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  download(blob, `fantasy-workshop-backup-${new Date().toISOString().slice(0, 10)}.json`);
}

export async function restoreJsonBackup(file: File, replace = false) {
  const backup = JSON.parse(await file.text()) as WorkshopBackup;
  if (backup.format !== "fantasy-workshop-backup" || !Array.isArray(backup.contents) || !Array.isArray(backup.images)) throw new Error("不是有效的 Fantasy Workshop 备份");
  await db.transaction("rw", [db.books, db.contents, db.images, db.works, db.collections, db.contentReferences, db.editorSessions, db.recoverySnapshots, db.activity, db.settings], async () => {
    if (replace) await Promise.all([db.books.clear(), db.contents.clear(), db.images.clear(), db.works.clear(), db.collections.clear(), db.contentReferences.clear(), db.editorSessions.clear(), db.recoverySnapshots.clear(), db.activity.clear()]);
    const lockedIds = new Set((await db.works.filter((work) => !!work.finalizedAt).toArray()).map((work) => work.id));
    await db.contents.bulkPut(backup.contents.filter((content) => !lockedIds.has(content.id)));
    if (backup.books?.length) await db.books.bulkPut(backup.books);
    await db.images.bulkPut(backup.images.map((image) => ({ ...image, blob: dataUrlToBlob(image.blob), thumbnail: image.thumbnail ? dataUrlToBlob(image.thumbnail) : undefined })));
    const articles = backup.contents.filter((content): content is ContentItem<"article"> => content.type === "article" && !lockedIds.has(content.id));
    if (articles.length) await db.works.bulkPut(articles.map((article) => ({ finalizedAt: article.payload.finalizedAt, id: article.id, slug: article.payload.slug, title: article.title, markdown: article.payload.markdown, renderedHtml: article.payload.renderedHtml, plainText: article.payload.plainText, excerptHtml: article.payload.excerptHtml, headings: article.payload.headings, tags: article.tags, collectionIds: article.collectionIds, coverImageId: article.coverImageId, status: article.status === "active" ? "draft" : article.status, createdAt: article.createdAt, updatedAt: article.updatedAt })));
    const collections = backup.contents.filter((content): content is ContentItem<"collection"> => content.type === "collection");
    if (collections.length) await db.collections.bulkPut(collections.map((collection) => ({ id: collection.id, name: collection.title, workIds: collection.payload.memberContentIds, createdAt: collection.createdAt, updatedAt: collection.updatedAt })));
    if (backup.editorSessions.length) await db.editorSessions.bulkPut(backup.editorSessions as never[]);
    if (backup.recoverySnapshots?.length) await db.recoverySnapshots.bulkPut(backup.recoverySnapshots as never[]);
    if (backup.activity?.length) await db.activity.bulkPut(backup.activity as never[]);
    await db.settings.bulkPut(backup.settings.filter((setting) => setting.key !== "unified-content-v3"));
  });
  await ensureUnifiedContentModel();
  return { contentCount: backup.contents.length, imageCount: backup.images.length };
}

export async function exportArticleMarkdown(article: ContentItem<"article">) {
  download(new Blob([article.payload.markdown], { type: "text/markdown;charset=utf-8" }), `${safeName(article.title)}.md`);
}

async function addImage(zip: JSZip, imageId: string, folder = "images") {
  const image = await db.images.get(imageId);
  if (!image) return;
  zip.file(`${folder}/${safeName(image.name)}`, image.blob);
}

export async function exportGalleryZip(gallery: ContentItem<"gallery">) {
  const zip = new JSZip();
  zip.file("gallery.json", JSON.stringify(gallery, null, 2));
  for (const id of gallery.payload.imageIds) await addImage(zip, id);
  download(await zip.generateAsync({ type: "blob" }), `${safeName(gallery.title)}.zip`);
}

export async function exportProjectZip(project: ContentItem<"project">) {
  const zip = new JSZip();
  const members = (await db.contents.bulkGet(project.payload.memberContentIds)).filter(Boolean) as ContentItem[];
  zip.file("project.json", JSON.stringify({ project, members }, null, 2));
  for (const member of members) {
    if (member.type === "article") zip.file(`articles/${safeName(member.title)}.md`, member.payload.markdown);
    if (member.type === "image") await addImage(zip, member.id);
    if (member.coverImageId) await addImage(zip, member.coverImageId, "covers");
    if (member.type === "gallery") for (const id of member.payload.imageIds) await addImage(zip, id);
  }
  download(await zip.generateAsync({ type: "blob" }), `${safeName(project.title)}.zip`);
}

export async function exportContentPackage(content: ContentItem) {
  const zip = new JSZip();
  zip.file("content.json", JSON.stringify(content, null, 2));
  if (content.type === "article") zip.file(`${safeName(content.title)}.md`, content.payload.markdown);
  const imageIds = new Set<string>();
  if (content.coverImageId) imageIds.add(content.coverImageId);
  if (content.type === "image") imageIds.add(content.id);
  if (content.type === "gallery") content.payload.imageIds.forEach((id) => imageIds.add(id));
  if (content.type === "note") content.payload.imageIds.forEach((id) => imageIds.add(id));
  if (content.type === "exhibition") content.payload.blocks.flatMap((block) => block.imageIds ?? []).forEach((id) => imageIds.add(id));
  if (content.type === "article") for (const match of content.payload.markdown.matchAll(/fw-asset:\/\/([\w-]+)/g)) imageIds.add(match[1]);
  for (const id of imageIds) await addImage(zip, id);
  download(await zip.generateAsync({ type: "blob" }), `${safeName(content.title)}-package.zip`);
}

function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
export async function exportStaticHtml(content: ContentItem) {
  const body = content.type === "article" ? content.payload.renderedHtml : content.type === "note" || content.type === "record" ? `<p>${escapeHtml(content.type === "note" ? content.payload.text : content.payload.notesMarkdown).replaceAll("\n", "<br>")}</p>` : `<p>${escapeHtml(content.summary)}</p>`;
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(content.title)}</title><style>body{max-width:760px;margin:64px auto;padding:0 24px;background:#f4f0e8;color:#4f4b48;font:17px/1.85 Georgia,"Noto Serif SC",serif}img{max-width:100%}a{color:#55647a}hr{border:0;border-top:1px solid rgba(91,99,116,.2)}</style></head><body><main><h1>${escapeHtml(content.title)}</h1>${body}</main></body></html>`;
  download(new Blob([html], { type: "text/html;charset=utf-8" }), `${safeName(content.title)}.html`);
}
