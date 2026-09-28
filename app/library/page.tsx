import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ContentWorkspace } from "@/components/content/ContentWorkspace";
import { PageShell } from "@/components/ui/PageShell";

export const metadata: Metadata = { title: "内容工作区" };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  if (type === "project") redirect("/projects");
  return <PageShell eyebrow="Content Atlas" title="内容工作区"><ContentWorkspace key={type ?? "all"} initialType={type} /></PageShell>;
}
