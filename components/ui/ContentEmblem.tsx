import type { ContentType } from "@/types/content";
import type { ReactNode } from "react";

// Each content type has its own silhouette; no shared flower/moon fallback.
const drawings: Record<ContentType, ReactNode> = {
  article: <><path d="M19 49 25 32 48 9c8 12 2 23-11 29l-12 3-6 8Z" fill="#e7eff0"/><path d="m19 49 25-29m-18 13 11-1m-4-7 9-1M15 54h30"/></>,
  image: <><path d="M12 14h40v36H12z"/><path d="m16 44 11-13 8 8 6-5 7 10"/><circle cx="41" cy="24" r="4" fill="#ddd5e8"/><path d="M9 24V11h13m20 42h13V40"/></>,
  gallery: <><path d="m13 20 18-7 15 35-18 7Z" fill="#eee7da"/><path d="m22 13 20-3 7 38-20 3Z" fill="#f8f7f2"/><path d="M32 15h21v38H32z" fill="#f8f7f2"/><path d="M37 21h11v18H37zM38 46h9"/></>,
  record: <><path d="M32 8 49 15v20c0 10-10 18-17 22-7-4-17-12-17-22V15Z" fill="#ebe7ef"/><path d="m32 17 8 15-8 16-8-16Z M32 17v31m-8-16h16"/><path d="M11 24H7m46 0h4"/></>,
  project: <><path d="M11 18h42v34H11zM11 27h42"/><path d="M19 11v13m26-13v13M20 35h7v9h-7zm17 0h7m-7 7h7"/></>,
  collection: <><path d="M10 18c8-3 15-2 22 2 7-4 14-5 22-2v31c-8-3-15-2-22 2-7-4-14-5-22-2Z" fill="#e8eee7"/><path d="M32 20v31M17 26l8 1m-8 6 8 1m15-9v15l4-3 4 2V23"/></>,
  timeline: <><path d="M10 45c18 0 9-26 25-26h18"/><circle cx="12" cy="45" r="4" fill="#eee3cf"/><circle cx="30" cy="29" r="4" fill="#f8f7f2"/><path d="m49 13 7 6-7 6M12 35v-9m18 13v12"/></>,
  note: <><path d="M32 10c-4 12-16 12-16 25 0 10 7 16 16 16 11 0 18-11 13-20-2 7-6 8-8 6 4-9 1-18-5-27Z" fill="#f0e8d6"/><path d="M28 46c-6-7 3-9 4-16 6 6 8 13 3 18M10 16l4 3m34-5-3 5m8 26 4 1"/></>,
  exhibition: <><path d="M11 13h42v39H11zM17 13v39m30-39v39"/><path d="M22 22h20v16H22z" fill="#e9e2ed"/><path d="M25 44h14M7 55h50M22 9h20"/></>,
};
export function ContentEmblem({ type }: { type: ContentType }) {
  return <svg className="content-type-emblem" data-content-emblem={type} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{drawings[type]}</svg>;
}
