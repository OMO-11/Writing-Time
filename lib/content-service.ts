import { createContentItem } from "@/lib/content-registry";
import {
  articleContentFromWork,
  collectionContentFromRecord,
  db,
  imageContentFromRecord,
  recordActivity,
} from "@/lib/db";
import { MarkdownService } from "@/lib/markdown-service";
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
  return [...source.matchAll(/\[\[([^\]#]+?)(?:#([^\]]+))?\]\]/g)].map((match) => ({
    title: match[1].trim(),
    heading: match[2]?.trim(),
  })).filter((link) => link.title);
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

async function rebuildReferencesFor(content: ContentItem) {
  const now = Date.now();
  const references: ContentReference[] = [];
  const contents = await db.contents.toArray();
  const byTitle = new Map(contents.map((item) => [item.title.toLocaleLowerCase("zh-CN"), item]));
  for (const link of extractWikiLinks(wikiSource(content))) {
    const target = byTitle.get(link.title.toLocaleLowerCase("zh-CN"));
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

async function rebuildAllReferences() {
  for (const content of await db.contents.toArray()) await rebuildReferencesFor(content);
}

function contentToWork(content: ContentItem<"article">): WorkDocument {
  return {
    id: content.id,
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

export async function ensureUnifiedContentModel() {
  const [works, images, collections] = await Promise.all([db.works.toArray(), db.images.toArray(), db.collections.toArray()]);
  const existing = new Map((await db.contents.toArray()).map((item) => [item.id, item]));
  const migrated: ContentItem[] = [
    ...works.map((work) => ({ ...articleContentFromWork(work), favorite: existing.get(work.id)?.favorite ?? false })),
    ...images.map((image) => ({ ...imageContentFromRecord(image), favorite: existing.get(image.id)?.favorite ?? false })),
    ...collections.map((collection) => ({ ...collectionContentFromRecord(collection), favorite: existing.get(collection.id)?.favorite ?? false })),
  ];
  if (migrated.length) await db.contents.bulkPut(migrated);
  for (const content of [...migrated, ...[...existing.values()].filter((item) => !migrated.some((next) => next.id === item.id))]) {
    await rebuildReferencesFor(content);
  }
  await db.settings.put({ key: "unified-content-v3", value: { syncedAt: Date.now() } });
}

export async function saveContent(content: ContentItem, activity = true) {
  const previousContent = await db.contents.get(content.id);
  const next = { ...content, updatedAt: Date.now() } as ContentItem;
  await db.transaction("rw", db.contents, db.works, db.images, db.collections, db.activity, async () => {
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
  });
  if (!previousContent || previousContent.title !== next.title) await rebuildAllReferences();
  else await rebuildReferencesFor(next);
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
  await db.contents.update(id, { favorite: !content.favorite, updatedAt: Date.now() });
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
  const references = await getImageReferences(imageId);
  if (references.length && !force) return { deleted: false, references };
  await db.transaction("rw", db.images, db.contents, db.contentReferences, async () => {
    await db.images.delete(imageId);
    await db.contents.delete(imageId);
    await db.contentReferences.where("targetId").equals(imageId).delete();
    await db.contentReferences.where("sourceId").equals(imageId).delete();
  });
  return { deleted: true, references };
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
