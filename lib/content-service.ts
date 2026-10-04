import { createContentItem } from "@/lib/content-registry";
import {
  articleContentFromWork,
  collectionContentFromRecord,
  db,
  imageContentFromRecord,
  recordActivity,
} from "@/lib/db";
import { MarkdownService, wikiTargets } from "@/lib/markdown-service";
import type { ContentItem, ContentReference, ContentType, WikiLinkTarget } from "@/types/content";
import type { CollectionRecord, ImageRecord, WorkDocument } from "@/types/workshop";

function wikiSource(content: ContentItem) {
  if (content.type === "article") return content.payload.markdown;
  if (content.type === "note") return content.payload.text;
  if (content.type === "record") return content.payload.notesMarkdown;
  if (content.type === "project") return content.payload.description;
  if (content.type === "exhibition") return content.payload.blocks.map((block) => block.content ?? "").join("\n");
  if (content.type === "timeline") return content.payload.events.map((event) => `${event.title}\n${event.description}`).join("\n");
  return content.summary;
}

export function extractWikiLinks(source: string): WikiLinkTarget[] {
  return wikiTargets(source);
}

function payloadRelations(content: ContentItem) {
  if (content.type === "image") return content.payload.relatedContentIds;
  if (content.type === "record") return content.payload.relatedContentIds;
  if (content.type === "project") return content.payload.memberContentIds;
  if (content.type === "collection") return content.payload.memberContentIds;
  if (content.type === "timeline") return content.payload.events.flatMap((event) => event.relatedContentIds);
  if (content.type === "gallery") return content.payload.imageIds;
  if (content.type === "note") return [...content.payload.imageIds, ...(content.payload.projectId ? [content.payload.projectId] : [])];
  if (content.type === "exhibition") return content.payload.blocks.flatMap((block) => [block.contentId, ...(block.imageIds ?? [])].filter(Boolean) as string[]);
  return [];
}

function referenceIndex(contents: ContentItem[]) {
  const byTitle = new Map<string, ContentItem>();
  const ambiguous = new Set<string>();
  for (const item of contents) {
    const title = item.title.toLocaleLowerCase("zh-CN");
    if (byTitle.has(title)) ambiguous.add(title);
    byTitle.set(title, item);
  }
  for (const title of ambiguous) byTitle.delete(title);
  return { byTitle, byId: new Map(contents.map((item) => [item.id, item])) };
}

export async function rebuildReferencesFor(content: ContentItem, index?: ReturnType<typeof referenceIndex>) {
  const now = Date.now();
  const references: ContentReference[] = [];
  const { byTitle, byId } = index ?? referenceIndex(await db.contents.toArray());
  for (const link of extractWikiLinks(wikiSource(content))) {
    const target = byId.get(link.title) ?? byTitle.get(link.title.toLocaleLowerCase("zh-CN"));
    if (!target) continue;
    references.push({ id: `${content.id}:wiki:${target.id}:${link.heading ?? ""}`, sourceId: content.id, targetId: target.id, targetHeading: link.heading, kind: "wiki", updatedAt: now });
  }
  if (content.coverImageId) references.push({ id: `${content.id}:cover:${content.coverImageId}`, sourceId: content.id, targetId: content.coverImageId, kind: "cover", updatedAt: now });
  for (const targetId of [...new Set(payloadRelations(content))]) {
    if (targetId === content.id) continue;
    const kind = content.type === "gallery" || content.type === "note" ? "asset" : content.type === "project" || content.type === "collection" ? "membership" : "relation";
    references.push({ id: `${content.id}:${kind}:${targetId}`, sourceId: content.id, targetId, kind, updatedAt: now });
  }
  if (content.type === "article") {
    for (const match of content.payload.markdown.matchAll(/fw-asset:\/\/([\w-]+)/g)) {
      references.push({ id: `${content.id}:asset:${match[1]}`, sourceId: content.id, targetId: match[1], kind: "asset", updatedAt: now });
    }
  }
  await db.transaction("rw", db.contentReferences, async () => {
    await db.contentReferences.where("sourceId").equals(content.id).delete();
    if (references.length) await db.contentReferences.bulkPut(references);
  });
}

export async function rebuildAllReferences() {
  const contents = await db.contents.toArray();
  const index = referenceIndex(contents);
  for (const content of contents) await rebuildReferencesFor(content, index);
}

function contentToWork(content: ContentItem<"article">): WorkDocument {
  return {
    id: content.id,
    sourceWorkId: content.payload.sourceWorkId,
    finalizedAt: content.payload.finalizedAt,
    slug: content.payload.slug || `work-${content.id.slice(0, 8)}`,
    title: content.title,
    markdown: content.payload.markdown,
    renderedHtml: content.payload.renderedHtml,
    plainText: content.payload.plainText,
    excerptHtml: content.payload.excerptHtml,
    headings: content.payload.headings,
    tags: content.tags,
    collectionIds: content.collectionIds,
    coverImageId: content.coverImageId,
    status: content.status === "active" ? "draft" : content.status,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt,
  };
}

let migration: Promise<void> | undefined;
export function ensureUnifiedContentModel() {
  return migration ??= migrateUnifiedContentModel().catch((error) => { migration = undefined; throw error; });
}
async function migrateUnifiedContentModel() {
  if (await db.settings.get("unified-content-v3")) return;
  const [works, images, collections] = await Promise.all([db.works.toArray(), db.images.toArray(), db.collections.toArray()]);
  const existing = new Map((await db.contents.toArray()).map((item) => [item.id, item]));
  const migrated: ContentItem[] = [
    ...works.filter((work) => !work.finalizedAt || !existing.has(work.id)).map((work) => ({ ...articleContentFromWork(work), favorite: existing.get(work.id)?.favorite ?? false })),
    ...images.map((image) => ({ ...imageContentFromRecord(image), favorite: existing.get(image.id)?.favorite ?? false })),
    ...collections.map((collection) => ({ ...collectionContentFromRecord(collection), favorite: existing.get(collection.id)?.favorite ?? false })),
  ];
  if (migrated.length) await db.contents.bulkPut(migrated);
  await rebuildAllReferences();
  await db.settings.put({ key: "unified-content-v3", value: { syncedAt: Date.now() } });
}

export async function saveContent(content: ContentItem, activity = true) {
  const previousContent = await db.contents.get(content.id);
  const next = { ...content, updatedAt: Math.max(Date.now(), content.updatedAt + 1) } as ContentItem;
  let conflict = false;
  await db.transaction("rw", [db.contents, db.works, db.images, db.collections, db.activity, db.contentReferences], async () => {
    const current = await db.contents.get(content.id);
    if (current) next.favorite = current.favorite;
    if (current && current.updatedAt !== content.updatedAt) {
      const copy = { ...next, id: crypto.randomUUID(), title: `${next.title}（冲突副本）`, createdAt: Date.now() } as ContentItem;
      if (copy.type === "article") copy.payload = { ...copy.payload, finalizedAt: undefined, slug: `conflict-${copy.id}` };
      await db.contents.add(copy);
      if (copy.type === "article") await db.works.add(contentToWork(copy));
      await rebuildReferencesFor(copy);
      conflict = true;
      return;
    }
    await db.contents.put(next);
    if (next.type === "article") await db.works.put(contentToWork(next));
    if (next.type === "image") {
      const image = await db.images.get(next.payload.assetId);
      if (image) await db.images.put({
        ...image,
        title: next.title,
        altText: next.payload.altText,
        caption: next.payload.caption,
        tags: next.tags,
        collectionIds: next.collectionIds,
        relatedContentIds: next.payload.relatedContentIds,
        updatedAt: next.updatedAt,
      });
    }
    if (next.type === "collection") {
      const record: CollectionRecord = { id: next.id, name: next.title, workIds: next.payload.memberContentIds, createdAt: next.createdAt, updatedAt: next.updatedAt };
      await db.collections.put(record);
    }
    if (activity) await recordActivity(next.id, "updated", `更新「${next.title}」`);
    if (!previousContent || previousContent.title !== next.title) await rebuildAllReferences();
    else await rebuildReferencesFor(next);
  });
  if (conflict) throw new Error("其他标签页已修改此内容。你的草稿已另存为工作区中的冲突副本，请重新打开后比较。");
  return next;
}

export async function createContent<T extends Exclude<ContentType, "article" | "image">>(type: T, title?: string) {
  const content = createContentItem(type, title);
  await db.transaction("rw", db.contents, db.collections, db.activity, async () => {
    await db.contents.add(content);
    if (content.type === "collection") await db.collections.put({ id: content.id, name: content.title, workIds: [], createdAt: content.createdAt, updatedAt: content.updatedAt });
    await recordActivity(content.id, "created", `创建${content.title}`);
  });
  await rebuildAllReferences();
  return content;
}

export async function toggleFavorite(id: string) {
  const content = await db.contents.get(id);
  if (!content) return;
  await db.contents.update(id, { favorite: !content.favorite });
}

export async function getContentReferences(id: string) {
  const [forward, backward] = await Promise.all([
    db.contentReferences.where("sourceId").equals(id).toArray(),
    db.contentReferences.where("targetId").equals(id).toArray(),
  ]);
  return { forward, backward };
}

export async function getImageReferences(imageId: string) {
  return db.contentReferences.where("targetId").equals(imageId).toArray();
}

export async function deleteImageAsset(imageId: string, force = false) {
  return db.transaction("rw", [db.images, db.contents, db.contentReferences, db.works], async () => {
    await rebuildAllReferences();
    const references = await getImageReferences(imageId);
    const locked = await db.works.filter((work) => !!work.finalizedAt && (work.coverImageId === imageId || work.markdown.includes("fw-asset://" + imageId))).count();
    const lockedContent = await db.contents.filter((item) => item.type === "article" && !!item.payload.finalizedAt && (item.coverImageId === imageId || item.payload.markdown.includes("fw-asset://" + imageId))).count();
    if (locked || lockedContent) throw new Error("此图片被已定稿作品使用，不能删除。");
    if (references.length && !force) return { deleted: false, references };
    await db.images.delete(imageId);
    await db.contents.delete(imageId);
    await db.contentReferences.where("targetId").equals(imageId).delete();
    await db.contentReferences.where("sourceId").equals(imageId).delete();
    return { deleted: true, references };
  });
}

export async function convertNote(note: ContentItem<"note">, target: "article" | "character" | "location" | "project-task") {
  if (target === "project-task") {
    if (!note.payload.projectId) throw new Error("请先为灵感卡选择项目");
    const project = await db.contents.get(note.payload.projectId);
    if (!project || project.type !== "project") throw new Error("关联项目不存在");
    const firstColumn = project.payload.board[0];
    const updated = { ...project, payload: { ...project.payload, board: project.payload.board.map((column) => column.id === firstColumn.id ? { ...column, cards: [...column.cards, { id: crypto.randomUUID(), title: note.title, contentId: note.id }] } : column) } };
    await saveContent(updated);
    return updated;
  }
  if (target === "character" || target === "location") {
    const record = createContentItem("record", note.title);
    record.summary = note.summary;
    record.tags = note.tags;
    record.payload.template = target;
    record.payload.fields = target === "character"
      ? { 身份: "", 年龄: "", 阵营: "", 外貌: "", 性格: "", 动机: "" }
      : { 区域: "", 气候: "", 居民: "", 地标: "", 氛围: "" };
    record.payload.notesMarkdown = note.payload.text;
    await db.contents.add(record);
    await recordActivity(record.id, "converted", `将灵感转换为${target === "character" ? "角色" : "地点"}设定「${record.title}」`);
    return record;
  }
  const processed = await MarkdownService.process(note.payload.text);
  const article = createContentItem("article", note.title);
  article.summary = note.summary || processed.plainText;
  article.tags = note.tags;
  article.payload = {
    slug: `work-${article.id.slice(0, 8)}`,
    markdown: note.payload.text,
    renderedHtml: processed.renderedHtml,
    plainText: processed.plainText,
    excerptHtml: processed.excerptHtml,
    headings: processed.headings,
  };
  await db.transaction("rw", db.contents, db.works, db.activity, async () => {
    await db.contents.add(article);
    await db.works.add(contentToWork(article));
    await recordActivity(article.id, "converted", `将灵感转换为文章「${article.title}」`);
  });
  return article;
}

export async function updateImageRecord(image: ImageRecord) {
  await db.images.put(image);
  const previous = await db.contents.get(image.id);
  await db.contents.put({ ...imageContentFromRecord(image), favorite: previous?.favorite ?? false });
  await rebuildReferencesFor({ ...imageContentFromRecord(image), favorite: previous?.favorite ?? false });
}

/** Delete an unreferenced workspace item and its backing record atomically. */
export async function deleteWorkspaceContent(id: string, expectedUpdatedAt: number) {
  await db.transaction("rw", [db.contents, db.works, db.images, db.collections, db.books, db.contentReferences, db.editorSessions, db.recoverySnapshots], async () => {
    const content = await db.contents.get(id);
    if (!content) return;
    if (content.updatedAt !== expectedUpdatedAt) throw new Error("内容刚刚发生修改，请关闭弹窗并重新确认删除。");
    const work = await db.works.get(id);
    if ((content.type === "article" && content.payload.finalizedAt) || work?.finalizedAt) throw new Error("已定稿作品受只读保护，不能删除。");
    await rebuildAllReferences();
    const incoming = await db.contentReferences.where("targetId").equals(id).filter(ref => ref.sourceId !== id).count();
    const memberships = await db.contents.filter(item => item.id !== id && item.collectionIds.includes(id)).count();
    const bookReferences = await db.books.filter(book => book.chapters.some(chapter => chapter.workIds.includes(id))).count();
    const collectionReferences = await db.collections.filter(collection => collection.id !== id && collection.workIds.includes(id)).count();
    const imageReferences = content.type === "image" ? await db.works.filter(item => item.coverImageId === id || item.markdown.includes("fw-asset://" + id)).count() : 0;
    if (incoming || memberships || bookReferences || collectionReferences || imageReferences) throw new Error("此内容仍被其他条目、合集或书籍引用。请先解除引用，再删除。");
    if (content.type === "article") {
      await db.works.delete(id);
      await db.editorSessions.delete(id);
      await db.recoverySnapshots.where("workId").equals(id).delete();
    }
    if (content.type === "image") await db.images.delete(content.payload.assetId || id);
    if (content.type === "collection") await db.collections.delete(id);
    await db.contents.delete(id);
    await db.contentReferences.where("sourceId").equals(id).delete();
    await db.contentReferences.where("targetId").equals(id).delete();
  });
}
