import matter from "gray-matter";
import { AsyncCache } from "@/lib/async-cache";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Content, Heading, Image, Paragraph, Root, Text, PhrasingContent } from "mdast";
import type { ExtractedImage, HeadingItem, LineBreakMode, WorkDocument } from "@/types/workshop";

export interface ParsedMarkdown {
  content: string;
  frontmatter: Record<string, unknown>;
  tree: Root;
  offset: number;
}

// Source budget is measured in UTF-16 code units, not total heap size.
const processedCache = new AsyncCache<ProcessedMarkdown>(16, 500_000);
const RENDER_VERSION = 1;

export interface ProcessedMarkdown extends ParsedMarkdown {
  renderedHtml: string;
  plainText: string;
  excerptHtml: string;
  headings: HeadingItem[];
  images: ExtractedImage[];
}

export interface SearchDocumentInput {
  work: WorkDocument;
  collectionNames?: string[];
  imageCaptions?: string[];
  frontmatter?: Record<string, unknown>;
}

const sanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: "",
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src ?? []), "fw-asset", "data"],
  },
};

function headingIds() {
  return (tree: Root) => {
    const counts = new Map<string, number>();
    visit(tree, "heading", (node: Heading) => {
      node.data = { ...node.data, hProperties: { id: `section-${slugHeading(nodeText(node).trim(), counts)}` } };
    });
  };
}

export function wikiTargets(source: string) {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(matter(source).content);
  const targets: { title: string; heading?: string }[] = [];
  visit(tree, "text", (node: Text, _index, parent) => {
    if (parent?.type === "link" || parent?.type === "linkReference") return;
    for (const match of node.value.matchAll(/\[\[([^\]#]+?)(?:#([^\]]+))?\]\]/g)) targets.push({ title: match[1].trim(), heading: match[2]?.trim() });
  });
  return targets;
}
function wikiLinks() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined || parent.type === "link" || parent.type === "linkReference") return;
      const children: PhrasingContent[] = []; let offset = 0;
      for (const match of node.value.matchAll(/\[\[([^\]#]+?)(?:#([^\]]+))?\]\]/g)) {
        children.push({ type: "text", value: node.value.slice(offset, match.index) });
        const title = match[1].trim(), heading = match[2]?.trim();
        children.push({ type: "link", url: `/wiki/${encodeURIComponent(title)}${heading ? `?heading=${encodeURIComponent(heading)}` : ""}`, children: [{ type: "text", value: title + (heading ? `#${heading}` : "") }] });
        offset = match.index! + match[0].length;
      }
      if (!offset) return;
      children.push({ type: "text", value: node.value.slice(offset) });
      (parent.children as PhrasingContent[]).splice(index, 1, ...children);
      return index + children.length;
    });
  };
}

function nodeText(node: Content | Root): string {
  if ("value" in node && typeof node.value === "string") return node.value;
  if (node.type === "image") return node.alt ?? "";
  if ("children" in node && Array.isArray(node.children)) {
    const inline = ["paragraph", "heading", "emphasis", "strong", "delete", "link", "linkReference", "tableCell"].includes(node.type);
    return node.children.map((child) => nodeText(child as Content)).join(inline ? "" : "\n");
  }
  return "";
}

function slugHeading(value: string, counts: Map<string, number>) {
  const base = value.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "section";
  const count = counts.get(base) ?? 0;
  counts.set(base, count + 1);
  return count ? `${base}-${count + 1}` : base;
}

async function renderTree(tree: Root) {
  const processor = unified()
    .use(wikiLinks)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify);
  const hast = await processor.run(tree);
  return processor.stringify(hast);
}

export const MarkdownService = {
  parseMarkdown(markdown: string): ParsedMarkdown {
    const parsed = matter(markdown);
    const tree = unified().use(remarkParse).use(remarkGfm).parse(parsed.content) as Root;
    return { content: parsed.content, frontmatter: parsed.data, tree, offset: markdown.length - parsed.content.length };
  },

  async renderHtml(markdown: string, lineBreakMode: LineBreakMode = "standard") {
    const parsed = matter(markdown);
    const processor = unified().use(remarkParse).use(remarkGfm);
    if (lineBreakMode === "single") processor.use(remarkBreaks);
    const file = await processor
      .use(wikiLinks)
      .use(headingIds)
      .use(remarkRehype)
      .use(rehypeSanitize, sanitizeSchema)
      .use(rehypeStringify)
      .process(parsed.content);
    return String(file);
  },

  extractPlainText(input: string | ParsedMarkdown) {
    const parsed = typeof input === "string" ? this.parseMarkdown(input) : input;
    return parsed.tree.children
      .map((node) => nodeText(node).trim())
      .filter(Boolean)
      .join("\n\n");
  },

  async createExcerpt(input: string | ParsedMarkdown, paragraphCount = 3) {
    const parsed = typeof input === "string" ? this.parseMarkdown(input) : input;
    const paragraphs = parsed.tree.children.filter((node): node is Paragraph => node.type === "paragraph" && Boolean(nodeText(node).trim()));
    const excerptTree: Root = { type: "root", children: structuredClone(paragraphs.slice(0, paragraphCount)) };
    return renderTree(excerptTree);
  },

  extractHeadings(input: string | ParsedMarkdown) {
    const parsed = typeof input === "string" ? this.parseMarkdown(input) : input;
    const counts = new Map<string, number>();
    const headings: HeadingItem[] = [];
    const headingTree = structuredClone(parsed.tree);
    wikiLinks()(headingTree);
    visit(headingTree, "heading", (node: Heading) => {
      const text = nodeText(node).trim();
      headings.push({
        id: `section-${slugHeading(text, counts)}`,
        text,
        level: node.depth,
        from: (node.position?.start.offset ?? 0) + parsed.offset,
      });
    });
    return headings;
  },

  extractImages(input: string | ParsedMarkdown) {
    const parsed = typeof input === "string" ? this.parseMarkdown(input) : input;
    const images: ExtractedImage[] = [];
    visit(parsed.tree, "image", (node: Image) => {
      images.push({ alt: node.alt ?? "", url: node.url, title: node.title ?? undefined });
    });
    return images;
  },

  buildSearchDocument({ work, collectionNames = [], imageCaptions = [], frontmatter = {} }: SearchDocumentInput) {
    return {
      id: `work:${work.id}`,
      entityId: work.id,
      type: "work" as const,
      href: `/workbench?work=${work.id}`,
      title: work.title,
      plainText: work.plainText,
      tags: work.tags.join(" "),
      collectionNames: collectionNames.join(" "),
      imageCaptions: imageCaptions.join(" "),
      frontmatter: Object.entries(frontmatter).map(([key, value]) => `${key}: ${String(value)}`).join("\n"),
      status: work.status,
      updatedAt: work.updatedAt,
      collectionIds: work.collectionIds,
    };
  },

  async process(markdown: string, lineBreakMode: LineBreakMode = "standard"): Promise<ProcessedMarkdown> {
    return processedCache.get(`${RENDER_VERSION}:${lineBreakMode}:${markdown}`, async () => {
      const parsed = this.parseMarkdown(markdown);
      const [renderedHtml, excerptHtml] = await Promise.all([
        this.renderHtml(markdown, lineBreakMode),
        this.createExcerpt(parsed),
      ]);
      return {
        ...parsed,
        renderedHtml,
        plainText: this.extractPlainText(parsed),
        excerptHtml,
        headings: this.extractHeadings(parsed),
        images: this.extractImages(parsed),
      };
    });
  },
};

export function frontmatterString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function frontmatterTags(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}
