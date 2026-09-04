"use client";

import Link from "next/link";
import { Hash } from "lucide-react";
import { ContentIcon } from "@/components/content/ContentIcon";
import type { GlobalSearchResult } from "@/lib/search-service";

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const query = terms.filter(Boolean).sort((a, b) => b.length - a.length);
  if (!query.length) return text;
  const pattern = new RegExp(`(${query.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text.split(pattern).map((part, index) => query.some((term) => part.toLocaleLowerCase("zh-CN") === term.toLocaleLowerCase("zh-CN"))
    ? <mark key={`${part}-${index}`}>{part}</mark>
    : part);
}

export function SearchResultItem({ result, active, onFocus }: { result: GlobalSearchResult; active?: boolean; onFocus?: () => void }) {
  const excerpt = result.plainText.split("\n\n").find(Boolean) ?? result.tags;
  return (
    <Link className="search-result-item" data-active={active} href={result.href} onMouseEnter={onFocus}>
      <span className="search-result-icon">{result.type === "tag" ? <Hash aria-hidden="true" size={17} /> : <ContentIcon type={result.type} size={17} />}</span>
      <span className="search-result-copy">
        <strong><Highlight text={result.title} terms={result.terms} /></strong>
        {excerpt && <small><Highlight text={excerpt.slice(0, 100)} terms={result.terms} /></small>}
      </span>
      {result.type !== "tag" && result.status && <i>{result.status === "draft" ? "草稿" : result.status === "active" ? "进行中" : result.status === "completed" ? "已完成" : "已归档"}</i>}
    </Link>
  );
}
