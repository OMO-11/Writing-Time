import type { Metadata, Viewport } from "next";
import { RootShell } from "@/components/app/RootShell";
import "./globals.css";
import "./workflow.css";
import "./portal.css";

export const metadata: Metadata = {
  title: { default: "Writing Time", template: "%s · Writing Time" },
  description: "个人创作与内容管理工作空间。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f0e8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body><RootShell>{children}</RootShell></body>
    </html>
  );
}
