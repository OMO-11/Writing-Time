import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";

export function MarkdownPreview({ html }: { html: string }) {
  return <MarkdownRenderer html={html} className="mx-auto w-full max-w-[760px] px-5 py-8 sm:px-8 sm:py-10" />;
}
