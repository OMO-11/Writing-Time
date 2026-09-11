import type { Metadata } from "next";
import { ArchiveGallery } from "@/components/archive-gallery/ArchiveGallery";

export const metadata: Metadata = {
  title: "Archive Gallery",
  description: "可循环浏览、增减档案并预览图片的独立画廊模块。",
};

export default function ArchiveGalleryPage() {
  return <ArchiveGallery />;
}
