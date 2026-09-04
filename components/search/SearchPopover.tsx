"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SearchResultItem } from "@/components/search/SearchResultItem";
import type { GlobalSearchResult, SearchEntityType } from "@/lib/search-service";

const groupLabels: Record<SearchEntityType, string> = {
  article: "文章",
  image: "图片",
  gallery: "图片集",
  record: "设定卡",
  project: "项目",
  collection: "合集",
  timeline: "时间线",
  note: "灵感",
  exhibition: "展览",
  tag: "标签",
};

export function SearchPopover({ query, results, activeIndex, loading, onActiveChange }: {
  query: string;
  results: GlobalSearchResult[];
  activeIndex: number;
  loading: boolean;
  onActiveChange: (index: number) => void;
}) {
  const groups = (["article", "note", "record", "project", "image", "gallery", "collection", "timeline", "exhibition", "tag"] as SearchEntityType[])
    .map((type) => ({ type, items: results.map((result, index) => ({ result, index })).filter((item) => item.result.type === type) }))
    .filter((group) => group.items.length);

  return (
    <div className="search-popover" role="listbox" aria-label="全局搜索结果">
      {loading ? <p className="search-popover-state">正在检索本地索引…</p> : null}
      {!loading && query && !results.length ? <p className="search-popover-state">没有找到匹配内容，试试标题、标签或正文片段。</p> : null}
      {groups.map((group) => (
        <section key={group.type} aria-label={groupLabels[group.type]}>
          <h2>{groupLabels[group.type]}</h2>
          {group.items.slice(0, 4).map(({ result, index }) => (
            <SearchResultItem key={result.id} result={result} active={activeIndex === index} onFocus={() => onActiveChange(index)} />
          ))}
        </section>
      ))}
      {query && (
        <Link className="search-view-all" href={`/search?q=${encodeURIComponent(query)}`}>
          查看全部结果 <ArrowRight aria-hidden="true" size={16} />
        </Link>
      )}
    </div>
  );
}
