import type { Metadata } from "next";
import { Gallery } from "@/components/gallery/Gallery";
import { PageShell } from "@/components/ui/PageShell";

export const metadata: Metadata = { title: "图片资源库" };

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ image?: string }> }) {
  const { image } = await searchParams;
  return <PageShell eyebrow="Gallery" title="图片画廊"><Gallery key={image ?? "all"} requestedImageId={image} /></PageShell>;
}
