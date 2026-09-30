import type { Metadata } from "next";
import { ArchiveGallery } from "@/components/archive-gallery/ArchiveGallery";
import "./archive-gallery.css";

export const metadata: Metadata = {
  title: "拾光画廊 · 晨花与星藏",
  description: "在诺瓦尔的晨光与伊登的星夜之间，收藏旅途中的每一帧光。",
};

export default function ArchiveGalleryPage() {
  return <ArchiveGallery />;
}
