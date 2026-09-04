import type { ContentItem, ContentPayloadMap, ContentType, RecordTemplate } from "@/types/content";

export interface ContentTypeDefinition {
  type: ContentType;
  label: string;
  pluralLabel: string;
  description: string;
  icon: string;
  accent: "blue" | "lavender" | "gold" | "green";
  defaultTitle: string;
  createPayload: () => ContentPayloadMap[ContentType];
}

const emptyBoard = () => [
  { id: crypto.randomUUID(), title: "待整理", cards: [] },
  { id: crypto.randomUUID(), title: "进行中", cards: [] },
  { id: crypto.randomUUID(), title: "已完成", cards: [] },
];

export const CONTENT_TYPE_REGISTRY: Record<ContentType, ContentTypeDefinition> = {
  article: {
    type: "article", label: "文章", pluralLabel: "文章与作品", icon: "FileText", accent: "blue",
    description: "长篇 Markdown、随笔与章节。", defaultTitle: "未命名作品",
    createPayload: () => ({ slug: "", markdown: "", renderedHtml: "", plainText: "", excerptHtml: "", headings: [] }),
  },
  image: {
    type: "image", label: "图片", pluralLabel: "图片资源", icon: "Image", accent: "lavender",
    description: "可复用的插画、参考图与封面。", defaultTitle: "未命名图片",
    createPayload: () => ({ assetId: "", altText: "", caption: "", relatedContentIds: [] }),
  },
  gallery: {
    type: "gallery", label: "图片集", pluralLabel: "图片集", icon: "Images", accent: "gold",
    description: "排序、编排并展示一组图片。", defaultTitle: "新的图片集",
    createPayload: () => ({ imageIds: [], captions: {}, layout: "grid" }),
  },
  record: {
    type: "record", label: "设定卡", pluralLabel: "设定卡", icon: "ContactRound", accent: "lavender",
    description: "角色、地点、物品、服装与魔法设定。", defaultTitle: "新的设定",
    createPayload: () => ({ template: "character", fields: createRecordFields("character"), notesMarkdown: "", relatedContentIds: [] }),
  },
  project: {
    type: "project", label: "项目", pluralLabel: "项目", icon: "FolderKanban", accent: "blue",
    description: "聚合内容、进度、看板与里程碑。", defaultTitle: "新的项目",
    createPayload: () => ({ description: "", progress: 0, memberContentIds: [], board: emptyBoard(), milestones: [] }),
  },
  collection: {
    type: "collection", label: "合集", pluralLabel: "合集", icon: "LibraryBig", accent: "green",
    description: "跨类型整理内容的轻量书架。", defaultTitle: "新的合集",
    createPayload: () => ({ memberContentIds: [] }),
  },
  timeline: {
    type: "timeline", label: "时间线", pluralLabel: "时间线", icon: "Milestone", accent: "gold",
    description: "故事事件、版本历史与世界年表。", defaultTitle: "新的时间线",
    createPayload: () => ({ events: [] }),
  },
  note: {
    type: "note", label: "灵感", pluralLabel: "灵感卡片", icon: "Lightbulb", accent: "gold",
    description: "快速记下文字、Markdown、图片与链接。", defaultTitle: "一闪而过的灵感",
    createPayload: () => ({ format: "plain", text: "", imageIds: [], links: [] }),
  },
  exhibition: {
    type: "exhibition", label: "展览", pluralLabel: "展览", icon: "PanelsTopLeft", accent: "lavender",
    description: "用可排序区块编排对外展示。", defaultTitle: "新的展览",
    createPayload: () => ({ theme: "storybook", blocks: [] }),
  },
};

export const CONTENT_TYPES = Object.keys(CONTENT_TYPE_REGISTRY) as ContentType[];

export const RECORD_TEMPLATE_LABELS: Record<RecordTemplate, string> = {
  character: "角色",
  location: "地点",
  item: "物品",
  costume: "服装",
  magic: "魔法",
};

export const RECORD_TEMPLATE_FIELDS: Record<RecordTemplate, string[]> = {
  character: ["身份", "年龄", "阵营", "外貌", "性格", "动机"],
  location: ["区域", "气候", "居民", "地标", "氛围"],
  item: ["类别", "材质", "来源", "能力", "持有者"],
  costume: ["风格", "材质", "配色", "季节", "穿戴者"],
  magic: ["体系", "媒介", "代价", "效果", "限制"],
};

export function createRecordFields(template: RecordTemplate) {
  return Object.fromEntries(RECORD_TEMPLATE_FIELDS[template].map((field) => [field, ""]));
}

export function createContentItem<T extends ContentType>(type: T, title?: string): ContentItem<T> {
  const definition = CONTENT_TYPE_REGISTRY[type];
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    type,
    title: title?.trim() || definition.defaultTitle,
    summary: "",
    tags: [],
    collectionIds: [],
    status: type === "project" ? "active" : "draft",
    favorite: false,
    createdAt: now,
    updatedAt: now,
    payload: definition.createPayload(),
  } as unknown as ContentItem<T>;
}

export function getContentHref(content: Pick<ContentItem, "id" | "type">) {
  if (content.type === "article") return `/workbench?work=${content.id}`;
  if (content.type === "image") return `/gallery?image=${content.id}`;
  return `/content/${content.id}`;
}
