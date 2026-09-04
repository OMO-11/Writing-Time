import { articleContentFromWork, db, getLineBreakMode, recordActivity } from "@/lib/db";
import { frontmatterString, frontmatterTags, MarkdownService } from "@/lib/markdown-service";
import type { WorkDocument, WorkStatus } from "@/types/workshop";

const WORK_STATUSES: WorkStatus[] = ["draft", "completed", "archived"];

export function isMarkdownFile(file: File) {
  return file.name.toLowerCase().endsWith(".md") || file.type === "text/markdown";
}

export function isSupportedImageFile(file: File) {
  return /\.(png|jpe?g|webp)$/i.test(file.name);
}

export async function importMarkdownWork(file: File): Promise<WorkDocument> {
  const markdown = await file.text();
  const processed = await MarkdownService.process(markdown, await getLineBreakMode());
  const now = Date.now();
  const id = crypto.randomUUID();
  const rawStatus = frontmatterString(processed.frontmatter.status, "draft") as WorkStatus;
  const status = WORK_STATUSES.includes(rawStatus) ? rawStatus : "draft";
  const title = frontmatterString(processed.frontmatter.title, file.name.replace(/\.md$/i, ""));
  const slugBase = title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "work";

  const work: WorkDocument = {
    id,
    slug: `${slugBase}-${id.slice(0, 6)}`,
    title,
    markdown,
    renderedHtml: processed.renderedHtml,
    plainText: processed.plainText,
    excerptHtml: processed.excerptHtml,
    headings: processed.headings,
    tags: frontmatterTags(processed.frontmatter.tags),
    collectionIds: [],
    status,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction("rw", db.works, db.contents, db.activity, async () => {
    await db.works.add(work);
    await db.contents.put(articleContentFromWork(work));
    await recordActivity(work.id, "imported", `导入文章「${work.title}」`);
  });
  return work;
}
