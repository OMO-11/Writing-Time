"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MouseEvent } from "react";
import { useUIStore } from "@/stores/ui-store";

export function HomeButton() {
  const router = useRouter();
  const flushSave = useUIStore((state) => state.flushSave);

  const goHome = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    await flushSave();
    router.push("/workshop");
  };

  return (
    <Link className="global-home-button" href="/workshop" onClick={(event) => void goHome(event)} aria-label="保存并返回 Fantasy Workshop 首页">
      <span className="workshop-sigil"><svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="m18 5 9 15-9 15-8-15 8-15Zm0 0v30M10 20h17" stroke="currentColor" strokeWidth=".9"/><path d="M8 30C0 18 31 2 34 13S15 39 8 30Z" stroke="currentColor" strokeWidth=".7"/><circle cx="33" cy="15" r="2" fill="currentColor"/></svg></span>
      <span><strong>幻想工坊</strong><small>FANTASY WORKSHOP</small></span>
    </Link>
  );
}
