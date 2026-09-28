import { articleContentFromWork, db } from "@/lib/db";
import { MarkdownService } from "@/lib/markdown-service";
import { rebuildReferencesFor } from "@/lib/content-service";

export async function createRevision(sourceId: string, markdown?: string) {
  const source = await db.works.get(sourceId);
  if (!source) throw new Error("源作品不存在");
  const text = markdown ?? source.markdown;
  const processed = await MarkdownService.process(text);
  const id = crypto.randomUUID(), now = Date.now();
  const work = { ...source, id, sourceWorkId: sourceId, slug: `revision-${id}`, title: `${source.title}（修订）`, markdown: text, renderedHtml: processed.renderedHtml, plainText: processed.plainText, excerptHtml: processed.excerptHtml, headings: processed.headings, finalizedAt: undefined, status: "draft" as const, createdAt: now, updatedAt: now };
  await db.transaction("rw", db.works, db.contents, db.contentReferences, async () => {
    await db.works.add(work);
    const content = articleContentFromWork(work);
    await db.contents.add(content);
    await rebuildReferencesFor(content);
  });
  return work;
}
