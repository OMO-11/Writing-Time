import Dexie, { type EntityTable } from "dexie";
import { MarkdownService } from "@/lib/markdown-service";
import type { ActivityRecord, ContentItem, ContentReference } from "@/types/content";
import type {
  BookRecord,
  CollectionRecord,
  EditorSession,
  ImageRecord,
  LineBreakMode,
  RecoverySnapshot,
  SettingRecord,
  WorkDocument,
  WorkStatus,
} from "@/types/workshop";

type LegacyWork = Partial<Omit<WorkDocument, "createdAt" | "updatedAt" | "status">> & {
  id: string;
  title?: string;
  markdown?: string;
  htmlCache?: string;
  excerpt?: string;
  status?: WorkStatus | "polishing" | "complete";
  createdAt?: number | Date;
  updatedAt?: number | Date;
};

function timestamp(value: number | Date | undefined) {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  return Date.now();
}

function normalizeStatus(status: LegacyWork["status"]): WorkStatus {
  if (status === "complete") return "completed";
  if (status === "polishing") return "draft";
  if (status === "completed" || status === "archived") return status;
  return "draft";
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

class FantasyWorkshopDB extends Dexie {
  books!: EntityTable<BookRecord, "id">;
  works!: EntityTable<WorkDocument, "id">;
  images!: EntityTable<ImageRecord, "id">;
  collections!: EntityTable<CollectionRecord, "id">;
  settings!: EntityTable<SettingRecord, "key">;
  editorSessions!: EntityTable<EditorSession, "workId">;
  recoverySnapshots!: EntityTable<RecoverySnapshot, "id">;
  contents!: EntityTable<ContentItem, "id">;
  contentReferences!: EntityTable<ContentReference, "id">;
  activity!: EntityTable<ActivityRecord, "id">;

  constructor() {
    super("FantasyWorkshop");
    this.version(1).stores({
      works: "id, slug, title, status, updatedAt, *tags",
      images: "id, title, workId, createdAt, *tags",
      collections: "id, name, updatedAt, *workIds",
      settings: "key",
    });
    this.version(2).stores({
      works: "id, slug, title, status, updatedAt, *tags, *collectionIds",
      images: "id, title, workId, createdAt, *tags",
      collections: "id, name, updatedAt, *workIds",
      settings: "key",
      editorSessions: "workId, updatedAt",
      recoverySnapshots: "id, workId, createdAt",
    }).upgrade(async (transaction) => {
      const table = transaction.table<LegacyWork, string>("works");
      const works = await table.toArray();
      await table.bulkPut(works.map((work) => {
        const markdown = work.markdown ?? "";
        const title = work.title ?? "未命名作品";
        return {
          ...work,
          title,
          markdown,
          slug: work.slug ?? `work-${work.id.slice(0, 8)}`,
          renderedHtml: work.renderedHtml ?? work.htmlCache ?? "",
          plainText: work.plainText ?? work.excerpt ?? "",
          excerptHtml: work.excerptHtml ?? (work.excerpt ? `<p>${escapeHtml(work.excerpt)}</p>` : ""),
          headings: work.headings ?? [],
          tags: work.tags ?? [],
          collectionIds: work.collectionIds ?? [],
          status: normalizeStatus(work.status),
          createdAt: timestamp(work.createdAt),
          updatedAt: timestamp(work.updatedAt),
        };
      }));
    });
    this.version(3).stores({
      works: "id, slug, title, status, updatedAt, *tags, *collectionIds",
      images: "id, title, workId, createdAt, updatedAt, *tags, *collectionIds, *relatedContentIds",
      collections: "id, name, updatedAt, *workIds",
      settings: "key",
      editorSessions: "workId, updatedAt",
      recoverySnapshots: "id, workId, createdAt",
      contents: "id, type, title, status, updatedAt, favorite, *tags, *collectionIds",
      contentReferences: "id, sourceId, targetId, kind, updatedAt",
      activity: "id, contentId, action, createdAt",
    }).upgrade(async (transaction) => {
      const works = await transaction.table<WorkDocument, string>("works").toArray();
      const images = await transaction.table<ImageRecord, string>("images").toArray();
      const collections = await transaction.table<CollectionRecord, string>("collections").toArray();
      const now = Date.now();
      await transaction.table<ImageRecord, string>("images").bulkPut(images.map((image) => ({
        ...image,
        altText: image.altText ?? image.title,
        collectionIds: image.collectionIds ?? [],
        relatedContentIds: image.relatedContentIds ?? (image.workId ? [image.workId] : []),
        updatedAt: image.updatedAt ?? image.createdAt ?? now,
      })));
      const contents: ContentItem[] = [
        ...works.map(articleContentFromWork),
        ...images.map((image) => imageContentFromRecord({
          ...image,
          altText: image.altText ?? image.title,
          collectionIds: image.collectionIds ?? [],
          relatedContentIds: image.relatedContentIds ?? (image.workId ? [image.workId] : []),
          updatedAt: image.updatedAt ?? image.createdAt ?? now,
        })),
        ...collections.map(collectionContentFromRecord),
      ];
      if (contents.length) await transaction.table<ContentItem, string>("contents").bulkPut(contents);
    });
    this.version(4).stores({ books: "id, title, updatedAt" });
    this.works.hook("updating", (changes, _key, work) => {
      if (work.finalizedAt && Object.keys(changes).length) throw new Error("已完全保存的作品不能修改");
    });
    this.works.hook("deleting", (_key, work) => {
      if (work.finalizedAt) throw new Error("已完全保存的作品不能删除");
    });
    this.contents.hook("updating", (changes, _key, content) => {
      if (content.type === "article" && content.payload.finalizedAt && Object.keys(changes).some((key) => key !== "favorite")) throw new Error("已完全保存的作品不能修改");
    });
  }
}

export const db = new FantasyWorkshopDB();

export function articleContentFromWork(work: WorkDocument): ContentItem<"article"> {
  return {
    id: work.id,
    type: "article",
    title: work.title,
    summary: work.plainText,
    coverImageId: work.coverImageId,
    tags: work.tags,
    collectionIds: work.collectionIds,
    status: work.status,
    favorite: false,
    createdAt: work.createdAt,
    updatedAt: work.updatedAt,
    payload: {
      sourceWorkId: work.sourceWorkId,
      finalizedAt: work.finalizedAt,
      slug: work.slug,
      markdown: work.markdown,
      renderedHtml: work.renderedHtml,
      plainText: work.plainText,
      excerptHtml: work.excerptHtml,
      headings: work.headings,
    },
  };
}

export function imageContentFromRecord(image: ImageRecord): ContentItem<"image"> {
  return {
    id: image.id,
    type: "image",
    title: image.title,
    summary: image.caption ?? "",
    tags: image.tags,
    collectionIds: image.collectionIds,
    status: "completed",
    favorite: false,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
    payload: { assetId: image.id, altText: image.altText, caption: image.caption ?? "", relatedContentIds: image.relatedContentIds },
  };
}

export function collectionContentFromRecord(collection: CollectionRecord): ContentItem<"collection"> {
  return {
    id: collection.id,
    type: "collection",
    title: collection.name,
    summary: "",
    tags: [],
    collectionIds: [],
    status: "active",
    favorite: false,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    payload: { memberContentIds: collection.workIds },
  };
}

export async function recordActivity(contentId: string, action: ActivityRecord["action"], label: string) {
  await db.activity.add({ id: crypto.randomUUID(), contentId, action, label, createdAt: Date.now() });
}

export async function getLineBreakMode(): Promise<LineBreakMode> {
  const record = await db.settings.get("line-break-mode");
  return record?.value === "single" ? "single" : "standard";
}

export async function createBlankWork(): Promise<WorkDocument> {
  const now = Date.now();
  const id = crypto.randomUUID();
  const markdown = "# 未命名作品\n\n从这里开始写下你的故事……\n";
  const processed = await MarkdownService.process(markdown, await getLineBreakMode());
  const work: WorkDocument = {
    id,
    slug: `untitled-${id.slice(0, 8)}`,
    title: "未命名作品",
    markdown,
    renderedHtml: processed.renderedHtml,
    plainText: processed.plainText,
    excerptHtml: processed.excerptHtml,
    headings: processed.headings,
    tags: [],
    collectionIds: [],
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction("rw", db.works, db.contents, db.activity, async () => {
    await db.works.add(work);
    await db.contents.put(articleContentFromWork(work));
    await recordActivity(work.id, "created", `创建文章「${work.title}」`);
  });
  return work;
}

export async function hydrateWorkDocument(work: WorkDocument): Promise<WorkDocument> {
  const processed = await MarkdownService.process(work.markdown, await getLineBreakMode());
  const next = {
    ...work,
    renderedHtml: processed.renderedHtml,
    plainText: processed.plainText,
    excerptHtml: processed.excerptHtml,
    headings: processed.headings,
  };
  return next;
}

export async function ensureDerivedWorkData() {
  const completed = await db.settings.get("derived-work-v2");
  if (completed) return;
  const mode = await getLineBreakMode();
  const works = await db.works.toArray();
  for (const work of works) {
    if (work.finalizedAt) continue;
    const processed = await MarkdownService.process(work.markdown, mode);
    const next = {
      ...work,
      renderedHtml: processed.renderedHtml,
      plainText: processed.plainText,
      excerptHtml: processed.excerptHtml,
      headings: processed.headings,
    };
    await db.works.put(next);
    const previous = await db.contents.get(next.id);
    await db.contents.put({ ...articleContentFromWork(next), favorite: previous?.favorite ?? false });
  }
  await db.settings.put({ key: "derived-work-v2", value: true });
}

export async function importImageFile(file: File, workId?: string) {
  const id = crypto.randomUUID();
  const image = await readImageSize(file);
  const thumbnail = await createImageThumbnail(file);
  const record: ImageRecord = {
    id,
    name: file.name,
    title: file.name.replace(/\.[^.]+$/, ""),
    blob: file,
    thumbnail,
    mimeType: file.type,
    width: image.width,
    height: image.height,
    tags: [],
    collectionIds: [],
    relatedContentIds: workId ? [workId] : [],
    workId,
    altText: file.name.replace(/\.[^.]+$/, ""),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.transaction("rw", db.images, db.contents, db.activity, async () => {
    await db.images.add(record);
    await db.contents.put(imageContentFromRecord(record));
    await recordActivity(record.id, "imported", `导入图片「${record.title}」`);
  });
  return record;
}

async function createImageThumbnail(blob: Blob, maxSide = 720): Promise<Blob | undefined> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return await new Promise((resolve) => canvas.toBlob((result) => resolve(result ?? undefined), "image/webp", .82));
  } catch {
    return undefined;
  }
}

function readImageSize(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}

export async function createRecoverySnapshot(workId: string, markdown: string) {
  const now = Date.now();
  const snapshots = await db.recoverySnapshots.where("workId").equals(workId).sortBy("createdAt");
  if (snapshots.at(-1)?.markdown === markdown) return;
  await db.recoverySnapshots.add({ id: crypto.randomUUID(), workId, markdown, createdAt: now });
  if (snapshots.length >= 30) await db.recoverySnapshots.bulkDelete(snapshots.slice(0, snapshots.length - 29).map((item) => item.id));
  const expired = await db.recoverySnapshots.where("createdAt").below(now - 24 * 60 * 60 * 1000).primaryKeys();
  if (expired.length) await db.recoverySnapshots.bulkDelete(expired);
}

export async function ensureStarterData() {
  const seeded = await db.settings.get("starter-data");
  if (seeded) return;

  const now = Date.now();
  const workId = "starter-road-to-workshop";
  const markdown = "---\ntitle: 沿着道路进入工坊\ntags: [旅途, 工坊]\nstatus: draft\n---\n\n# 沿着道路进入工坊\n\n银蓝色的风越过山谷，带来纸张与颜料的气息。\n\n这里保存你的故事、设定与旅途中拾起的每一幅画。\n\n## 今日的清单\n\n- 导入 Markdown\n- 安静地写作\n- 将灵感留在本地\n";
  const processed = await MarkdownService.process(markdown, await getLineBreakMode());
  const starterWork: WorkDocument = {
    id: workId,
    slug: "road-to-workshop",
    title: "沿着道路进入工坊",
    markdown,
    renderedHtml: processed.renderedHtml,
    plainText: processed.plainText,
    excerptHtml: processed.excerptHtml,
    headings: processed.headings,
    tags: ["旅途", "工坊"],
    collectionIds: [],
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction("rw", db.works, db.contents, async () => {
    await db.works.put(starterWork);
    await db.contents.put(articleContentFromWork(starterWork));
  });

  const samples = [
    { path: "/images/apprentice.png", title: "银蓝旅人", tags: ["角色", "旅途"] },
    { path: "/images/moon-witch.png", title: "月星见习魔女", tags: ["角色", "魔法"] },
    { path: "/images/workshop-landscape.png", title: "通往工坊的道路", tags: ["风景", "城镇"] },
  ];
  for (const sample of samples) {
    const response = await fetch(sample.path);
    const blob = await response.blob();
    const starterImage: ImageRecord = {
      id: sample.path.split("/").pop()!.replace(".png", ""),
      name: sample.path.split("/").pop()!,
      title: sample.title,
      blob,
      thumbnail: await createImageThumbnail(blob),
      mimeType: blob.type || "image/png",
      tags: sample.tags,
      collectionIds: [],
      relatedContentIds: [workId],
      workId,
      altText: sample.title,
      createdAt: now,
      updatedAt: now,
    };
    await db.images.put(starterImage);
    await db.contents.put(imageContentFromRecord(starterImage));
  }
  await db.settings.put({ key: "starter-data", value: true });
}
