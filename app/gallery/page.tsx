import type { Metadata } from "next";
import { Gallery } from "@/components/gallery/Gallery";
import { PageShell } from "@/components/ui/PageShell";

export const metadata: Metadata = { title: "图片画廊" };

export default function GalleryPage() {
  return <PageShell eyebrow="Gallery" title="图片画廊"><Gallery /></PageShell>;
}
