"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { getContentHref } from "@/lib/content-registry";
import { db } from "@/lib/db";

function headingSlug(value: string) { return value.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "section"; }

export function WikiRedirect({ title }: { title: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    void db.contents.filter((content) => content.title.toLocaleLowerCase("zh-CN") === title.toLocaleLowerCase("zh-CN")).first().then((content) => {
      if (!content) { router.replace(`/search?q=${encodeURIComponent(title)}`); return; }
      const heading = searchParams.get("heading");
      if (content.type === "article" && heading) router.replace(`/work/${content.payload.slug}#${headingSlug(heading)}`);
      else router.replace(getContentHref(content));
    });
  }, [router, searchParams, title]);
  return <main className="content-detail-loading" aria-live="polite">正在沿着 Wiki Link 寻找「{title}」…</main>;
}
