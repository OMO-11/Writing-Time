import MiniSearch from "minisearch";
import { liveQuery, type Subscription } from "dexie";
import { getContentHref } from "@/lib/content-registry";
import { db } from "@/lib/db";
import type { ContentItem, ContentStatus, ContentType } from "@/types/content";

export type SearchEntityType = ContentType | "tag" | "book";

export interface SearchDocument {
  id: string;
  entityId: string;
  type: SearchEntityType;
  href: string;
  title: string;
  plainText: string;
  tags: string;
  collectionNames: string;
  imageCaptions: string;
  frontmatter: string;
  status: string;
  updatedAt: number;
  collectionIds: string[];
}

export interface GlobalSearchResult extends SearchDocument {
  score: number;
  terms: string[];
}

export interface SearchFilters {
  type?: SearchEntityType | "all";
  status?: ContentStatus | "all";
  tag?: string;
  collectionId?: string;
  updatedAfter?: number;
}

function createIndex() {
  return new MiniSearch<SearchDocument>({
    fields: ["title", "plainText", "tags", "collectionNames", "imageCaptions", "frontmatter"],
    storeFields: ["entityId", "type", "href", "title", "plainText", "tags", "collectionNames", "imageCaptions", "frontmatter", "status", "updatedAt", "collectionIds"],
    tokenize: (text) => text.toLocaleLowerCase("zh-CN").split(/[\s,，。；;：:\/|#]+/).filter(Boolean).flatMap((part) => {
      if (!/\p{Script=Han}/u.test(part)) return [part];
      const characters = [...part];
      const pairs = characters.slice(0, -1).map((character, index) => `${character}${characters[index + 1]}`);
      return [...new Set([...characters, ...pairs, part])];
    }),
    processTerm: (term) => term.toLocaleLowerCase("zh-CN"),
  });
}

function payloadText(content: ContentItem) {
  if (content.type === "article") return { plainText: content.payload.plainText, imageCaptions: "", frontmatter: content.payload.markdown.match(/^---[\s\S]*?---/)?.[0] ?? "" };
  if (content.type === "image") return { plainText: content.payload.caption || content.summary, imageCaptions: `${content.payload.altText} ${content.payload.caption}`, frontmatter: "" };
  if (content.type === "gallery") return { plainText: content.summary, imageCaptions: Object.values(content.payload.captions).join(" "), frontmatter: "" };
  if (content.type === "record") return { plainText: `${content.summary} ${Object.values(content.payload.fields).join(" ")} ${content.payload.notesMarkdown}`, imageCaptions: "", frontmatter: "" };
  if (content.type === "project") return { plainText: `${content.summary} ${content.payload.description} ${content.payload.board.flatMap((column) => column.cards.map((card) => card.title)).join(" ")} ${content.payload.milestones.map((item) => item.title).join(" ")}`, imageCaptions: "", frontmatter: "" };
  if (content.type === "timeline") return { plainText: content.payload.events.map((event) => `${event.date} ${event.title} ${event.description}`).join(" "), imageCaptions: "", frontmatter: "" };
  if (content.type === "note") return { plainText: `${content.summary} ${content.payload.text} ${content.payload.links.join(" ")}`, imageCaptions: "", frontmatter: "" };
  if (content.type === "exhibition") return { plainText: `${content.summary} ${content.payload.blocks.map((block) => block.content ?? "").join(" ")}`, imageCaptions: "", frontmatter: "" };
  return { plainText: content.summary, imageCaptions: "", frontmatter: "" };
}

class LocalSearchService {
  private index = createIndex();
  private subscription?: Subscription;
  private ready?: Promise<void>;
  private generation = 0;
  private appliedGeneration = 0;
  private documents = new Map<string, string>();

  private async buildDocuments() {
    const [contents, books] = await db.transaction("r", db.contents, db.books, () =>
      Promise.all([db.contents.toArray(), db.books.toArray()]));
    const collectionNames = new Map(contents.filter((item) => item.type === "collection").map((item) => [item.id, item.title]));
    const documents: SearchDocument[] = contents.map((content) => {
      const text = payloadText(content);
      return {
        id: `${content.type}:${content.id}`,
        entityId: content.id,
        type: content.type,
        href: getContentHref(content),
        title: content.title,
        plainText: text.plainText,
        tags: content.tags.join(" "),
        collectionNames: content.collectionIds.map((id) => collectionNames.get(id) ?? "").join(" "),
        imageCaptions: text.imageCaptions,
        frontmatter: text.frontmatter,
        status: content.status,
        updatedAt: content.updatedAt,
        collectionIds: content.collectionIds,
      };
    });
    const tagNames = [...new Set(contents.flatMap((content) => content.tags))];
    documents.push(...tagNames.map((tag) => ({
      id: `tag:${tag}`, entityId: tag, type: "tag" as const,
      href: `/search?q=${encodeURIComponent(tag)}&tag=${encodeURIComponent(tag)}`,
      title: `#${tag}`, plainText: tag, tags: tag, collectionNames: "", imageCaptions: "", frontmatter: "", status: "", updatedAt: 0, collectionIds: [],
    })));
    documents.push(...books.map((book) => ({ id: "book:" + book.id, entityId: book.id, type: "book" as const, href: "/books/" + book.id, title: book.title, plainText: book.chapters.map((chapter) => chapter.title).join(" "), tags: "", collectionNames: "", imageCaptions: "", frontmatter: "", status: "active", updatedAt: book.updatedAt, collectionIds: [] })));
    return documents;
  }

  async rebuild() {
    const generation = ++this.generation;
    const documents = await this.buildDocuments();
    this.applyDocuments(documents, generation);
  }

  private applyDocuments(documents: SearchDocument[], generation: number) {
    if (generation < this.appliedGeneration) return;
    const next = new Map(documents.map((document) => [document.id, JSON.stringify(document)]));
    for (const id of this.documents.keys()) if (!next.has(id)) this.index.discard(id);
    for (const document of documents) if (this.documents.get(document.id) !== next.get(document.id)) {
      if (this.index.has(document.id)) this.index.replace(document); else this.index.add(document);
    }
    this.documents = next;
    this.appliedGeneration = generation;
  }

  async initialize() {
    if (this.ready) return this.ready;
    if (typeof window === "undefined") {
      this.ready = this.rebuild().catch((error) => { this.ready = undefined; throw error; });
    } else {
      this.ready = new Promise<void>((resolve, reject) => {
        this.subscription = liveQuery(async () => {
          const generation = ++this.generation;
          return { generation, documents: await this.buildDocuments() };
        }).subscribe({
          next: ({ documents, generation }) => {
            this.applyDocuments(documents, generation);
            resolve();
          },
          error: (error) => {
            this.subscription?.unsubscribe();
            this.subscription = undefined;
            this.ready = undefined;
            reject(error);
          },
        });
      });
    }
    return this.ready;
  }

  async search(query: string, filters: SearchFilters = {}, limit = 20): Promise<GlobalSearchResult[]> {
    await this.initialize();
    const normalized = query.trim();
    if (!normalized) return [];
    const results = this.index.search(normalized, {
      prefix: true,
      fuzzy: .2,
      boost: { title: 5, tags: 3, collectionNames: 2, plainText: 1 },
      combineWith: "AND",
    });
    return results
      .map((result) => result as unknown as GlobalSearchResult)
      .filter((result) => !filters.type || filters.type === "all" || result.type === filters.type)
      .filter((result) => !filters.status || filters.status === "all" || result.status === filters.status)
      .filter((result) => !filters.tag || result.tags.split(" ").includes(filters.tag))
      .filter((result) => !filters.collectionId || result.collectionIds.includes(filters.collectionId))
      .filter((result) => !filters.updatedAfter || result.updatedAt >= filters.updatedAfter)
      .slice(0, limit);
  }
}

export const SearchService = new LocalSearchService();
