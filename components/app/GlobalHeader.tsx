"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { MouseEvent } from "react";
import { GlobalSearch } from "@/components/app/GlobalSearch";
import { HomeButton } from "@/components/app/HomeButton";
import { QuickCreate } from "@/components/app/QuickCreate";
import { ToastAndSaveStatus } from "@/components/app/ToastAndSaveStatus";
import { useUIStore } from "@/stores/ui-store";

const routeNames: Record<string, string> = {
  "/workshop": "主页",
  "/library": "作品库",
  "/gallery": "图片展览",
  "/settings": "设置",
  "/search": "搜索",
  "/workbench": "创作工坊",
  "/content": "内容工作区",
};

export function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const activeWorkTitle = useUIStore((state) => state.activeWorkTitle);
  const flushSave = useUIStore((state) => state.flushSave);
  const showBreadcrumbs = pathname === "/workbench" || pathname.startsWith("/work/") || pathname.startsWith("/content/");
  const crumbs: Array<{ label: string; href?: string }> = pathname === "/workshop" ? [] : pathname === "/workbench" || pathname.startsWith("/work/")
    ? [{ label: "作品库", href: "/library" }, ...(activeWorkTitle ? [{ label: activeWorkTitle }] : [])]
    : pathname.startsWith("/content/") ? [{ label: "内容工作区", href: "/library" }, { label: "内容编辑" }] : [{ label: routeNames[pathname] ?? "页面" }];

  const navigate = async (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    await flushSave();
    router.push(href);
  };

  return (
    <header className="global-header">
      <HomeButton />
      {showBreadcrumbs ? <nav className="global-breadcrumbs" aria-label="面包屑">
        <Link href="/workshop" onClick={(event) => void navigate(event, "/workshop")}>首页</Link>
        {crumbs.map((crumb, index) => <span key={`${crumb.label}-${index}`}><ChevronRight aria-hidden="true" size={13} />{crumb.href ? <Link href={crumb.href} onClick={(event) => void navigate(event, crumb.href!)}>{crumb.label}</Link> : <b aria-current={index === crumbs.length - 1 ? "page" : undefined}>{crumb.label}</b>}</span>)}
      </nav> : <nav className="global-primary-nav" aria-label="主要导航">
        <Link href="/workshop" aria-current={pathname === "/workshop" ? "page" : undefined}>主页</Link>
        <Link href="/workbench">创作</Link>
        <Link href="/library">资料库</Link>
        <Link href="/library?type=project">项目</Link>
        <Link href="/library?type=exhibition">展览</Link>
      </nav>}
      <GlobalSearch />
      <div className="global-header-tools"><ToastAndSaveStatus /><QuickCreate /></div>
    </header>
  );
}
