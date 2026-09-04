import type { Metadata } from "next";
import { ContentDetail } from "@/components/content/ContentDetail";

export const metadata: Metadata = { title: "内容编辑" };
export default async function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContentDetail id={id} />;
}
