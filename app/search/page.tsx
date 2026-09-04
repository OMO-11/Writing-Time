import { Suspense } from "react";
import { SearchResults } from "@/components/search/SearchResults";
import { PageShell } from "@/components/ui/PageShell";

export default function SearchPage() {
  return <PageShell eyebrow="Search" title="搜索整个工坊"><Suspense fallback={<div className="detail-loading">正在准备本地索引…</div>}><SearchResults /></Suspense></PageShell>;
}
