import { Suspense } from "react";
import { WikiRedirect } from "@/components/content/WikiRedirect";

export default async function WikiPage({ params }: { params: Promise<{ title: string }> }) {
  const { title } = await params;
  return <Suspense fallback={<main className="content-detail-loading">正在解析链接…</main>}><WikiRedirect title={decodeURIComponent(title)} /></Suspense>;
}
