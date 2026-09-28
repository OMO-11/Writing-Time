"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { safeHtml } from "@/lib/html-safety";

export function MarkdownRenderer({ html, className = "" }: { html: string; className?: string }) {
  const [hydratedHtml, setHydratedHtml] = useState("");

  useEffect(() => {
    const urls: string[] = [];
    let cancelled = false;
    const assetIds = [...html.matchAll(/fw-asset:\/\/([a-zA-Z0-9-]+)/g)].map((match) => match[1]);
    void (async () => {
      let next = safeHtml(html);
      for (const id of [...new Set(assetIds)]) {
        const image = await db.images.get(id);
        if (cancelled) return;
        if (!image) continue;
        const url = URL.createObjectURL(image.blob);
        urls.push(url);
        next = next.replaceAll(`fw-asset://${id}`, url);
      }
      if (!cancelled) {
        setHydratedHtml(next);
        requestAnimationFrame(() => { if (!cancelled && location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(); });
      }
    })();
    return () => { cancelled = true; urls.forEach(URL.revokeObjectURL); };
  }, [html]);

  return <article className={`markdown-body ${className}`} dangerouslySetInnerHTML={{ __html: hydratedHtml }} />;
}
