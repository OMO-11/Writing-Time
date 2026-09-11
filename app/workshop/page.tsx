import type { Metadata } from "next";
import { HomeDashboard } from "@/components/home/HomeDashboard";

export const metadata: Metadata = {
  title: "Fantasy Workshop",
  description: "写作、Markdown 内容与插画管理工作区。",
};

export default function WorkshopHomePage() {
  return <HomeDashboard />;
}
