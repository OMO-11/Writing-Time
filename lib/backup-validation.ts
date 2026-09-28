import { createContentItem } from "@/lib/content-registry";
import { MarkdownService } from "@/lib/markdown-service";
import type { WorkshopBackup } from "@/lib/export-service";
import type { ContentType } from "@/types/content";

function assert(valid: unknown, message: string): asserts valid { if (!valid) throw new Error(`备份校验失败：${message}`); }
function object(value: unknown): asserts value is Record<string, unknown> { assert(value && typeof value === "object" && !Array.isArray(value), "字段应为对象"); }
function text(value: unknown): asserts value is string { assert(typeof value === "string" && value.length <= 5_000_000, "文本字段缺失或过大"); }
function strings(value: unknown) { assert(Array.isArray(value) && value.every((item) => typeof item === "string"), "列表应仅包含字符串"); }
function rows(value: unknown): Record<string, unknown>[] { assert(Array.isArray(value) && value.length <= 100_000, "列表缺失或过大"); value.forEach(object); return value; }
function identity(value: Record<string, unknown>) { text(value.id); assert(/^[\w-]+$/.test(value.id), "ID 格式无效"); }
function dates(value: Record<string, unknown>) { assert([value.createdAt, value.updatedAt].every((time) => typeof time === "number" && Number.isSafeInteger(time) && time >= 0 && time < 8_640_000_000_000_000), "时间字段无效"); }
function unique(values: unknown[]) { assert(new Set(values).size === values.length, "存在重复 ID"); }

export async function validateBackup(input: unknown): Promise<WorkshopBackup> {
  object(input);
  assert(input.format === "fantasy-workshop-backup" && (input.version === 3 || input.version === 4), "不支持的格式或版本（支持 v3/v4）");
  assert(Number.isFinite(input.exportedAt), "备份时间无效");
  const contents = rows(input.contents), images = rows(input.images), books = rows(input.books ?? []);
  unique(contents.map((item) => item.id)); unique(images.map((item) => item.id)); unique(books.map((item) => item.id));
  const types = ["article", "image", "gallery", "record", "project", "collection", "timeline", "note", "exhibition"];
  for (const item of contents) {
    identity(item); dates(item); text(item.title); text(item.summary); strings(item.tags); strings(item.collectionIds);
    assert(types.includes(String(item.type)), "未知内容类型");
    assert(["active", "draft", "completed", "archived"].includes(String(item.status)) && typeof item.favorite === "boolean", "状态无效");
    if (item.coverImageId !== undefined) text(item.coverImageId);
    object(item.payload); const p = item.payload;
    const defaults = createContentItem(item.type as ContentType).payload;
    for (const [key, value] of Object.entries(defaults)) {
      if (["renderedHtml", "plainText", "excerptHtml", "headings"].includes(key)) continue;
      if (typeof value === "string") text(p[key]);
      else if (typeof value === "number") assert(Number.isFinite(p[key]), `${key} 无效`);
      else if (Array.isArray(value)) assert(Array.isArray(p[key]), `${key} 应为列表`);
      else object(p[key]);
    }
    for (const key of ["imageIds", "relatedContentIds", "memberContentIds", "links"]) if (key in p) strings(p[key]);
    if (item.type === "article") {
      if (p.sourceWorkId !== undefined) text(p.sourceWorkId);
      if (p.finalizedAt !== undefined) assert(typeof p.finalizedAt === "number" && p.finalizedAt > 0, "定稿时间无效");
      const result = await MarkdownService.process(p.markdown as string);
      Object.assign(p, { renderedHtml: result.renderedHtml, plainText: result.plainText, excerptHtml: result.excerptHtml, headings: result.headings });
    }
    if (item.type === "record") { assert(["character", "location", "item", "costume", "magic"].includes(String(p.template)), "未知设定模板"); object(p.fields); Object.values(p.fields).forEach(text); }
    if (item.type === "gallery") { assert(["grid", "masonry", "slideshow"].includes(String(p.layout)), "图片集布局无效"); object(p.captions); Object.values(p.captions).forEach(text); }
    if (item.type === "note") assert(["plain", "markdown"].includes(String(p.format)), "灵感格式无效");
    if (item.type === "project") {
      for (const column of rows(p.board)) { identity(column); text(column.title); for (const card of rows(column.cards)) { identity(card); text(card.title); if (card.contentId !== undefined) text(card.contentId); } }
      for (const milestone of rows(p.milestones)) { identity(milestone); text(milestone.title); assert(typeof milestone.completed === "boolean", "里程碑状态无效"); }
    }
    if (item.type === "timeline") for (const event of rows(p.events)) { identity(event); text(event.title); text(event.date); text(event.description); strings(event.relatedContentIds); }
    if (item.type === "exhibition") {
      assert(["storybook", "gallery", "character-file", "minimal"].includes(String(p.theme)), "展览主题无效");
      for (const block of rows(p.blocks)) { identity(block); assert(["text", "image", "image-grid", "quote", "divider", "gallery", "record", "cover"].includes(String(block.type)), "展览区块无效"); if (block.content !== undefined) text(block.content); if (block.imageIds !== undefined) strings(block.imageIds); }
    }
  }
  for (const item of images) {
    identity(item); dates(item); text(item.name); text(item.title); text(item.altText); strings(item.tags); strings(item.collectionIds); strings(item.relatedContentIds);
    assert(["image/png", "image/jpeg", "image/webp", "image/gif"].includes(String(item.mimeType)), "不支持的图片类型");
    for (const key of ["blob", "thumbnail"]) {
      if (key === "thumbnail" && item[key] === undefined) continue;
      assert(typeof item[key] === "string" && item[key].length <= 80_000_000 && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]*={0,2}$/.test(item[key]), "图片编码无效或过大");
    }
  }
  for (const book of books) {
    identity(book); dates(book); text(book.title);
    const chapters = rows(book.chapters); unique(chapters.map((chapter) => chapter.id));
    const ids: string[] = [];
    for (const chapter of chapters) { identity(chapter); text(chapter.title); strings(chapter.workIds); ids.push(...chapter.workIds as string[]); }
    unique(ids);
  }
  for (const session of rows(input.editorSessions ?? [])) { text(session.workId); for (const key of ["cursorFrom", "cursorTo", "scrollTop", "updatedAt"]) assert(Number.isFinite(session[key]), "会话位置无效"); assert(["edit", "preview", "split"].includes(String(session.editorMode)) && typeof session.outlineOpen === "boolean", "会话模式无效"); }
  for (const snapshot of rows(input.recoverySnapshots ?? [])) { identity(snapshot); text(snapshot.workId); text(snapshot.markdown); assert(Number.isFinite(snapshot.createdAt), "快照时间无效"); }
  for (const event of rows(input.activity ?? [])) { identity(event); text(event.contentId); text(event.label); assert(["created", "updated", "imported", "converted"].includes(String(event.action)) && Number.isFinite(event.createdAt), "活动记录无效"); }
  for (const setting of rows(input.settings ?? [])) {
    text(setting.key);
    if (setting.key === "line-break-mode") assert(["single", "standard"].includes(String(setting.value)), "换行设置无效");
    if (setting.key === "archive-gallery-image-ids") strings(setting.value);
    if (setting.key === "character-display-preferences") {
      object(setting.value);
      const choices: Record<string, string[]> = { illustrationMode: ["full", "compact", "off"], textureMode: ["on", "off"], motionMode: ["full", "reduced", "off"], themePreference: ["auto", "noval", "eden", "balanced"] };
      for (const [key, value] of Object.entries(setting.value)) assert(choices[key]?.includes(String(value)), "角色偏好无效");
    }
    if (setting.key === "home-module-layout") for (const homeModule of rows(setting.value)) { text(homeModule.key); assert(["continue", "quick-capture", "active-projects", "recent-works", "recent-images", "unsorted", "favorites", "daily-activity"].includes(homeModule.key) && typeof homeModule.visible === "boolean", "首页模块设置无效"); }
  }
  return { ...input, books, editorSessions: input.editorSessions ?? [], recoverySnapshots: input.recoverySnapshots ?? [], activity: input.activity ?? [], settings: input.settings ?? [] } as unknown as WorkshopBackup;
}
