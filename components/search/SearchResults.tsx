"use client";

import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SearchResultItem } from "@/components/search/SearchResultItem";
import { CharacterEmptyState } from "@/components/theme/CharacterEmptyState";
import { db } from "@/lib/db";
import { SearchService, type GlobalSearchResult, type SearchEntityType } from "@/lib/search-service";
import { CONTENT_TYPES, CONTENT_TYPE_REGISTRY } from "@/lib/content-registry";
import type { ContentStatus } from "@/types/content";

export function SearchResults() {
  const params = useSearchParams();
  const initialQuery = params.get("q") ?? "";
  const contents = useLiveQuery(() => db.contents.toArray(), [], []);
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<SearchEntityType | "all">("all");
  const [status, setStatus] = useState<ContentStatus | "all">("all");
  const [tag, setTag] = useState(params.get("tag") ?? "");
  const [collectionId, setCollectionId] = useState("");
  const [updatedDays, setUpdatedDays] = useState("all");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const tags = useMemo(() => [...new Set(contents.flatMap((content) => content.tags))].sort(), [contents]);
  const collections = useMemo(() => contents.filter((content) => content.type === "collection"), [contents]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const updatedAfter = updatedDays === "all" ? undefined : Date.now() - Number(updatedDays) * 86400000;
      void SearchService.search(query, { type, status, tag: tag || undefined, collectionId: collectionId || undefined, updatedAfter }, 100).then((next) => {
        if (!cancelled) { setResults(next); setLoading(false); }
      });
    }, 120);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [collectionId, query, status, tag, type, updatedDays]);

  return (
    <div className="search-page" data-character-theme="eden">
      <section className="search-query-panel" aria-label="搜索条件">
        <label className="search-page-input"><Search aria-hidden="true" size={20} /><span className="sr-only">搜索关键词</span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setLoading(true); }} placeholder="输入标题、正文、标签或图片说明…" autoFocus /></label>
        <div className="search-filters">
          <label><span>类型</span><select value={type} onChange={(event) => { setType(event.target.value as SearchEntityType | "all"); setLoading(true); }}><option value="all">全部</option>{CONTENT_TYPES.map((item) => <option key={item} value={item}>{CONTENT_TYPE_REGISTRY[item].label}</option>)}<option value="tag">标签</option><option value="book">书籍</option></select></label>
          <label><span>状态</span><select value={status} onChange={(event) => { setStatus(event.target.value as ContentStatus | "all"); setLoading(true); }}><option value="all">全部</option><option value="draft">草稿</option><option value="active">进行中</option><option value="completed">已完成</option><option value="archived">已归档</option></select></label>
          <label><span>标签</span><select value={tag} onChange={(event) => { setTag(event.target.value); setLoading(true); }}><option value="">全部</option>{tags.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>合集</span><select value={collectionId} onChange={(event) => { setCollectionId(event.target.value); setLoading(true); }}><option value="">全部</option>{collections.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label><span>更新时间</span><select value={updatedDays} onChange={(event) => { setUpdatedDays(event.target.value); setLoading(true); }}><option value="all">不限</option><option value="7">近 7 天</option><option value="30">近 30 天</option><option value="365">近一年</option></select></label>
        </div>
      </section>
      <section className="search-results-panel" aria-live="polite">
        <header><h2>{query ? `“${query}” 的结果` : "输入关键词开始搜索"}</h2><span>{loading ? "正在搜索…" : `${results.length} 项`}</span></header>
        {!loading && !results.length ? <div className="search-character-empty"><CharacterEmptyState character="eden" variant="search" title={query ? "索引中暂时没有线索" : "从星夜索引开始查找"} description={query ? "可以减少筛选条件、尝试相关标签，或换一个更短的关键词。" : "输入标题、正文、标签、合集或图片说明，伊登会在本地档案中查找。"} /></div> : null}
        <div className="search-full-list">{results.map((result) => <SearchResultItem key={result.id} result={result} />)}</div>
      </section>
    </div>
  );
}
