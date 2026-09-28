import type { HeadingItem, WorkStatus } from "@/types/workshop";

export type ContentType =
  | "article"
  | "image"
  | "gallery"
  | "record"
  | "project"
  | "collection"
  | "timeline"
  | "note"
  | "exhibition";

export type ContentStatus = WorkStatus | "active";
export type GalleryLayout = "grid" | "masonry" | "slideshow";
export type RecordTemplate = "character" | "location" | "item" | "costume" | "magic";
export type ExhibitionTheme = "storybook" | "gallery" | "character-file" | "minimal";

export interface ContentPayloadMap {
  article: {
    sourceWorkId?: string;
    finalizedAt?: number;
    slug: string;
    markdown: string;
    renderedHtml: string;
    plainText: string;
    excerptHtml: string;
    headings: HeadingItem[];
  };
  image: {
    assetId: string;
    altText: string;
    caption: string;
    relatedContentIds: string[];
  };
  gallery: {
    imageIds: string[];
    captions: Record<string, string>;
    layout: GalleryLayout;
  };
  record: {
    template: RecordTemplate;
    fields: Record<string, string>;
    notesMarkdown: string;
    relatedContentIds: string[];
  };
  project: {
    description: string;
    progress: number;
    memberContentIds: string[];
    board: ProjectBoardColumn[];
    milestones: ProjectMilestone[];
  };
  collection: {
    memberContentIds: string[];
  };
  timeline: {
    events: TimelineEvent[];
  };
  note: {
    format: "plain" | "markdown";
    text: string;
    imageIds: string[];
    links: string[];
    projectId?: string;
  };
  exhibition: {
    theme: ExhibitionTheme;
    blocks: ExhibitionBlock[];
  };
}

export interface ProjectBoardCard {
  id: string;
  title: string;
  contentId?: string;
}

export interface ProjectBoardColumn {
  id: string;
  title: string;
  cards: ProjectBoardCard[];
}

export interface ProjectMilestone {
  id: string;
  title: string;
  dueAt?: number;
  completed: boolean;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  relatedContentIds: string[];
}

export type ExhibitionBlockType = "text" | "image" | "image-grid" | "quote" | "divider" | "gallery" | "record" | "cover";

export interface ExhibitionBlock {
  id: string;
  type: ExhibitionBlockType;
  content?: string;
  contentId?: string;
  imageIds?: string[];
}

export interface BaseContent<T extends ContentType> {
  id: string;
  type: T;
  title: string;
  summary: string;
  coverImageId?: string;
  tags: string[];
  collectionIds: string[];
  status: ContentStatus;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export type ContentItem<T extends ContentType = ContentType> = {
  [K in T]: BaseContent<K> & { payload: ContentPayloadMap[K] }
}[T];

export interface ContentReference {
  id: string;
  sourceId: string;
  targetId: string;
  targetHeading?: string;
  kind: "wiki" | "asset" | "relation" | "cover" | "membership";
  updatedAt: number;
}

export interface ActivityRecord {
  id: string;
  contentId: string;
  action: "created" | "updated" | "imported" | "converted";
  label: string;
  createdAt: number;
}

export interface WikiLinkTarget {
  title: string;
  heading?: string;
}
