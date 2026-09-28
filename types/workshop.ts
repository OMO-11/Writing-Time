export type WorkStatus = "draft" | "completed" | "archived";
export type EditorMode = "edit" | "preview" | "split";
export type SaveState = "saved" | "saving" | "error";
export type LineBreakMode = "standard" | "single";

export interface HeadingItem {
  id: string;
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  from: number;
}

export interface ExtractedImage {
  alt: string;
  url: string;
  title?: string;
}

export interface BookRecord {
 id: string; title: string; chapters: { id: string; title: string; workIds: string[] }[]; createdAt: number; updatedAt: number;
}

export interface WorkDocument {
  finalizedAt?: number;
  id: string;
  slug: string;
  title: string;
  markdown: string;
  renderedHtml: string;
  plainText: string;
  excerptHtml: string;
  headings: HeadingItem[];
  tags: string[];
  collectionIds: string[];
  coverImageId?: string;
  status: WorkStatus;
  createdAt: number;
  updatedAt: number;
}

export type WorkRecord = WorkDocument;

export interface EditorSession {
  workId: string;
  cursorFrom: number;
  cursorTo: number;
  scrollTop: number;
  editorMode: EditorMode;
  outlineOpen: boolean;
  updatedAt: number;
}

export interface RecoverySnapshot {
  id: string;
  workId: string;
  markdown: string;
  createdAt: number;
}

export interface ImageRecord {
  id: string;
  name: string;
  title: string;
  blob: Blob;
  thumbnail?: Blob;
  mimeType: string;
  width?: number;
  height?: number;
  tags: string[];
  collectionIds: string[];
  relatedContentIds: string[];
  workId?: string;
  altText: string;
  caption?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionRecord {
  id: string;
  name: string;
  workIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}
