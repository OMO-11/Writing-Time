"use client";
import { useMemo, useSyncExternalStore } from "react";
import { safeHtml } from "@/lib/html-safety";

const subscribe = () => () => {};
export function MarkdownExcerpt({ html, className = "" }: { html: string; className?: string }) {
  const browser = useSyncExternalStore(subscribe, () => true, () => false);
  const safe = useMemo(() => browser ? safeHtml(html) : "", [browser, html]);
  return <div className={`markdown-excerpt ${className}`} dangerouslySetInnerHTML={{ __html: safe }} />;
}
