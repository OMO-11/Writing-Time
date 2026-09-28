"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getContentHref } from "@/lib/content-registry";
import { db } from "@/lib/db";
import type { ContentItem } from "@/types/content";
export function WikiRedirect({ title }: { title: string }) {
  const router = useRouter(), params = useSearchParams();
  const contents = useLiveQuery(() => db.contents.filter((content) => content.id === title || content.title.toLocaleLowerCase("zh-CN") === title.toLocaleLowerCase("zh-CN")).toArray(), [title]);
  const heading = params.get("heading");
  const href = useCallback((content: ContentItem) => content.type === "article" && heading ? "/work/" + content.payload.slug + "#section-" + (heading.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "section") : getContentHref(content), [heading]);
  useEffect(() => { if (contents?.length === 1) router.replace(href(contents[0])); }, [contents, router, href]);
  return <main className="content-detail-loading">{!contents ? "正在查找…" : !contents.length ? <p>没有找到「{title}」。<Link href={"/search?q=" + encodeURIComponent(title)}>搜索内容</Link></p> : contents.length > 1 ? <div><p>存在同名内容，请选择；可使用 [[内容 ID]] 建立固定引用。</p>{contents.map((content) => <p key={content.id}><Link href={href(content)}>{content.title} · {content.type} · {content.id}</Link></p>)}</div> : "正在打开…"}</main>;
}
