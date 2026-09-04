import type { WorkStatus } from "@/types/workshop";

export const HOME_DEMO_COPY = {
  eyebrow: "LOCAL-FIRST CREATIVE STUDIO",
  title: "把沿途拾起的故事，留在纸页与画布之间。",
  description: "整理 Markdown 手稿、角色设定与插画收藏，让每一次灵感都能回到正在生长的世界。",
  emptyTitle: "工坊的第一张纸正等着你",
  emptyDescription: "新建一篇手稿，或把已有的 Markdown 与插画带进来。所有内容都会先保存在这台设备上。",
} as const;

export const WORK_STATUS_META: Record<WorkStatus, { label: string; className: string }> = {
  draft: { label: "草稿", className: "is-draft" },
  completed: { label: "已完成", className: "is-complete" },
  archived: { label: "已归档", className: "is-archived" },
};

export function formatHomeDate(date: number | Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getMarkdownWordCount(markdown: string) {
  const body = markdown
    .replace(/^---[\s\S]*?---/m, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`\[\]()-]/g, " ");
  const hanCount = body.match(/\p{Script=Han}/gu)?.length ?? 0;
  const wordCount = body.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length ?? 0;
  return hanCount + wordCount;
}

export function getCurrentChapter(markdown: string) {
  return markdown.match(/^#{2,3}\s+(.+)$/m)?.[1]?.trim() || "正文 · 最近编辑";
}
