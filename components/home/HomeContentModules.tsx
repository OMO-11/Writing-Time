"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Eye, EyeOff, FolderKanban, Image as ImageIcon, Send, Settings2, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import { ContentIcon } from "@/components/content/ContentIcon";
import { CharacterBadge } from "@/components/theme/CharacterBadge";
import { BlobImage } from "@/components/ui/BlobImage";
import { getContentHref } from "@/lib/content-registry";
import { createContent, saveContent } from "@/lib/content-service";
import type { ActivityRecord, ContentItem } from "@/types/content";
import type { ImageRecord } from "@/types/workshop";

export type HomeModuleKey = "continue" | "quick-capture" | "active-projects" | "recent-works" | "recent-images" | "unsorted" | "favorites" | "daily-activity";
export interface HomeModuleSetting { key: HomeModuleKey; visible: boolean }
export const DEFAULT_HOME_MODULES: HomeModuleSetting[] = [
  { key: "continue", visible: true }, { key: "quick-capture", visible: true }, { key: "active-projects", visible: true }, { key: "recent-works", visible: true }, { key: "recent-images", visible: true }, { key: "unsorted", visible: true }, { key: "favorites", visible: true }, { key: "daily-activity", visible: true },
];
const labels: Record<HomeModuleKey, string> = { continue: "继续编辑", "quick-capture": "快速记录", "active-projects": "活跃项目", "recent-works": "最近作品", "recent-images": "最近图片", unsorted: "待整理", favorites: "收藏", "daily-activity": "今日活动" };

export function QuickCapture({ onSaved }: { onSaved?: (message: string) => void }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const capture = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const note = await createContent("note", text.trim().slice(0, 28));
    note.summary = text.trim().slice(0, 80);
    note.payload.text = text.trim();
    await saveContent(note, false);
    setText(""); setSaving(false); onSaved?.("灵感已收进本地卡片盒。");
  };
  return <section className="home-module quick-capture-module" data-character-theme="noval"><header><div><p className="home-eyebrow">QUICK CAPTURE</p><h2>快速记录</h2></div><CharacterBadge character="noval" label="新发现" /></header><div><textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder="一句对白、一个角色动作，或刚刚看见的颜色……" onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") void capture(); }} /><button type="button" disabled={!text.trim() || saving} onClick={() => void capture()}><Send aria-hidden="true" size={16} />{saving ? "保存中" : "收进卡片盒"}</button></div><small>Ctrl/Cmd + Enter 保存 · 之后可转换为文章、设定卡或项目任务</small></section>;
}

export function ActiveProjects({ projects }: { projects: Array<ContentItem<"project">> }) {
  return <section className="home-module active-projects-module"><header><div><p className="home-eyebrow">ACTIVE PROJECTS</p><h2>活跃项目</h2></div><Link href="/library">全部内容 <ArrowRight aria-hidden="true" size={15} /></Link></header><div>{projects.slice(0, 3).map((project) => <Link href={`/content/${project.id}`} key={project.id}><span><FolderKanban aria-hidden="true" size={18} /></span><div><strong>{project.title}</strong><small>{project.payload.memberContentIds.length} 项内容 · {project.payload.milestones.filter((item) => item.completed).length}/{project.payload.milestones.length} 里程碑</small><i><b style={{ width: `${project.payload.progress}%` }} /></i></div><em>{project.payload.progress}%</em></Link>)}{!projects.length ? <p>创建项目后，可在这里查看进度、看板与最近编辑。</p> : null}</div></section>;
}

export function RecentImagesModule({ images }: { images: ImageRecord[] }) {
  return <section className="home-module recent-images-module" data-character-theme="eden"><header><div><p className="home-eyebrow">NIGHT ARCHIVE</p><h2>星夜收藏室</h2></div><CharacterBadge character="eden" label="伊登整理" /><Link href="/gallery">图片库 <ArrowRight aria-hidden="true" size={15} /></Link></header><div>{images.slice(0, 4).map((image) => <Link href={`/content/${image.id}`} key={image.id}><BlobImage blob={image.thumbnail ?? image.blob} alt={image.altText || image.title} width={image.width || 320} height={image.height || 240} /><span>{image.title}</span></Link>)}{!images.length ? <p><ImageIcon aria-hidden="true" size={20} />粘贴或拖入图片后，伊登会在这里整理缩略图。</p> : null}</div></section>;
}

function ContentMiniList({ title, eyebrow, icon, items, empty }: { title: string; eyebrow: string; icon: "unsorted" | "favorite"; items: ContentItem[]; empty: string }) {
  return <section className="home-module content-mini-module"><header><div><p className="home-eyebrow">{eyebrow}</p><h2>{title}</h2></div>{icon === "favorite" ? <Star aria-hidden="true" size={18} /> : <Sparkles aria-hidden="true" size={18} />}</header><div>{items.slice(0, 5).map((item) => <Link href={getContentHref(item)} key={item.id}><ContentIcon type={item.type} /><span><strong>{item.title}</strong><small>{item.tags.length ? item.tags.join(" · ") : "未归类"}</small></span><ArrowRight aria-hidden="true" size={14} /></Link>)}{!items.length ? <p>{empty}</p> : null}</div></section>;
}
export function UnsortedItems({ items }: { items: ContentItem[] }) { return <ContentMiniList title="待整理" eyebrow="UNSORTED" icon="unsorted" items={items} empty="所有内容都已找到自己的位置。" />; }
export function Favorites({ items }: { items: ContentItem[] }) { return <ContentMiniList title="收藏" eyebrow="FAVORITES" icon="favorite" items={items} empty="点亮内容上的星标，常用条目会留在这里。" />; }

export function DailyActivity({ activity }: { activity: ActivityRecord[] }) {
  return <section className="home-module daily-activity-module"><header><div><p className="home-eyebrow">DAILY ACTIVITY</p><h2>今日活动</h2></div><span>{activity.length} 次</span></header><ol>{activity.slice(0, 8).map((item) => <li key={item.id}><i /><span>{item.label}</span><time>{new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(item.createdAt)}</time></li>)}{!activity.length ? <p>今天还没有修改记录。</p> : null}</ol></section>;
}

export function HomeModuleControls({ modules, onChange }: { modules: HomeModuleSetting[]; onChange: (next: HomeModuleSetting[]) => void }) {
  const move = (index: number, direction: -1 | 1) => { const to = index + direction; if (to < 0 || to >= modules.length) return; const next = [...modules]; const [item] = next.splice(index, 1); next.splice(to, 0, item); onChange(next); };
  return <details className="home-module-controls"><summary><Settings2 aria-hidden="true" size={16} />定制主页模块</summary><div>{modules.map((module, index) => <div key={module.key}><button type="button" aria-label={module.visible ? `隐藏${labels[module.key]}` : `显示${labels[module.key]}`} onClick={() => onChange(modules.map((item) => item.key === module.key ? { ...item, visible: !item.visible } : item))}>{module.visible ? <Eye aria-hidden="true" size={15} /> : <EyeOff aria-hidden="true" size={15} />}</button><span>{labels[module.key]}</span><button type="button" disabled={index === 0} aria-label={`上移${labels[module.key]}`} onClick={() => move(index, -1)}><ArrowUp aria-hidden="true" size={14} /></button><button type="button" disabled={index === modules.length - 1} aria-label={`下移${labels[module.key]}`} onClick={() => move(index, 1)}><ArrowDown aria-hidden="true" size={14} /></button></div>)}</div></details>;
}
