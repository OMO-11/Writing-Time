export function MarkdownExcerpt({ html, className = "" }: { html: string; className?: string }) {
  return <div className={`markdown-excerpt ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
