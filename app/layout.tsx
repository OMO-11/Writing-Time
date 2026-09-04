import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app/AppShell";
import "./globals.css";
import "./workflow.css";

export const metadata: Metadata = {
  title: { default: "Fantasy Workshop", template: "%s · Fantasy Workshop" },
  description: "一个 local-first 的 Markdown 与插画个人作品工坊。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f0e8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
