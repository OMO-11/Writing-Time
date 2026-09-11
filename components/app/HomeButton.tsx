"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Castle } from "lucide-react";
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
      <span className="workshop-sigil"><Castle aria-hidden="true" size={19} strokeWidth={1.55} /></span>
      <span><strong>Fantasy Workshop</strong><small>幻想作品工坊</small></span>
    </Link>
  );
}
