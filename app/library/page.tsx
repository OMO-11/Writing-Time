import type { Metadata } from "next";
import { ContentWorkspace } from "@/components/content/ContentWorkspace";
import { PageShell } from "@/components/ui/PageShell";

export const metadata: Metadata = { title: "内容工作区" };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  return <PageShell eyebrow="Content Atlas" title="内容工作区"><ContentWorkspace initialType={type} /></PageShell>;
}
