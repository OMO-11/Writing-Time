import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContentWorkspace } from "@/components/content/ContentWorkspace";
import { PageShell } from "@/components/ui/PageShell";

export const metadata: Metadata = { title: "工作区" };
export default async function ContentPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  if (type === "project") redirect("/projects");
  return <PageShell eyebrow="Content Atlas" title="工作区"><ContentWorkspace key={type ?? "all"} initialType={type} /></PageShell>;
}
