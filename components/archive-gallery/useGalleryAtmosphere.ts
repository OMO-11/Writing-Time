"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { db } from "@/lib/db";

type Atmosphere = "morning" | "night";
const SETTING_KEY = "archive-gallery-atmosphere";
const TRANSITION_CLASS = "gallery-theme-transition";

/** Both snapshots are actual rendered pages; only the new page's clip is animated. */
export function useGalleryAtmosphere(onSaveError: () => void) {
  const stored = useLiveQuery(() => db.settings.get(SETTING_KEY), []);
  const [chosen, setChosen] = useState<Atmosphere | null>(null);
  const [switching, setSwitching] = useState(false);
  const atmosphere = chosen ?? (stored?.value === "night" ? "night" : "morning");
  const busy = useRef(false);
  const mounted = useRef(false);
  const active = useRef<ViewTransition | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.skipTransition();
      document.documentElement.classList.remove(TRANSITION_CLASS);
    };
  }, []);

  const changeAtmosphere = async (next: Atmosphere, event: MouseEvent<HTMLButtonElement>) => {
    if (busy.current || next === atmosphere) return;
    const button = event.currentTarget;
    const bounds = button.getBoundingClientRect();
    // Keyboard/assistive activations have detail=0 and no meaningful pointer coordinates.
    const x = event.detail === 0 ? bounds.left + bounds.width / 2 : event.clientX;
    const y = event.detail === 0 ? bounds.top + bounds.height / 2 : event.clientY;
    const root = document.documentElement;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    busy.current = true;
    setSwitching(true);
    let applied = false;
    const commit = () => {
      if (applied || !mounted.current) return;
      applied = true;
      // Commit React's actual colors, text, portrait and controls before the new snapshot.
      flushSync(() => setChosen(next));
      void db.settings.put({ key: SETTING_KEY, value: next }).catch(() => {
        if (mounted.current) onSaveError();
      });
    };

    try {
      if (reducedMotion || !document.startViewTransition) {
        commit();
        return;
      }

      // Both portraits stay mounted and load eagerly. Allow decoding before snapshotting,
      // but a slow image must not hold the theme control indefinitely.
      const portraits = button.closest("main")?.querySelectorAll<HTMLImageElement>(`[data-portrait="${next}"] img`);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          Promise.allSettled(Array.from(portraits ?? []).map(image => image.decode())),
          new Promise<void>(resolve => { timer = setTimeout(resolve, 700); }),
        ]);
      } finally { clearTimeout(timer); }
      if (!mounted.current) return;

      // The farthest corner is the combination of the farthest horizontal/vertical edge.
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 2;
      root.classList.add(TRANSITION_CLASS);
      const transition = document.startViewTransition(commit);
      active.current = transition;
      // A skipped/hidden-tab transition still updates the real DOM; handle both promises.
      const finished = transition.finished.catch(() => {});
      await transition.ready;
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 1000, easing: "cubic-bezier(.45, 0, .2, 1)", pseudoElement: "::view-transition-new(root)", fill: "both" },
      );
      await finished;
    } catch {
      active.current?.skipTransition();
      commit();
    } finally {
      active.current = null;
      root.classList.remove(TRANSITION_CLASS);
      busy.current = false;
      if (mounted.current) setSwitching(false);
    }
  };

  return { atmosphere, switching, changeAtmosphere };
}
