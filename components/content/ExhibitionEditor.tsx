"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { GripVertical, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ImagePicker } from "@/components/content/ImagePicker";
import { db } from "@/lib/db";
import type { ContentItem, ExhibitionBlock, ExhibitionBlockType, ExhibitionTheme } from "@/types/content";

const blockLabels: Record<ExhibitionBlockType, string> = { text: "文本", image: "单图", "image-grid": "图片网格", quote: "引语", divider: "分隔线", gallery: "图片集", record: "设定卡", cover: "封面" };
const themeLabels: Record<ExhibitionTheme, string> = { storybook: "Noval Morning Storybook", gallery: "Eden Night Archive", "character-file": "Duo Journey Workshop", minimal: "极简作品集" };

export function ExhibitionEditor({ content, onChange }: { content: ContentItem<"exhibition">; onChange: (next: ContentItem<"exhibition">) => void }) {
  const [imageBlockId, setImageBlockId] = useState<string>();
  const linkedContents = useLiveQuery(() => db.contents.where("type").anyOf(["gallery", "record"]).toArray(), [], []);
  const blocks = content.payload.blocks;
  const patchBlocks = (next: typeof blocks) => onChange({ ...content, payload: { ...content.payload, blocks: next } });
  const updateBlock = (id: string, patch: Partial<ExhibitionBlock>) => patchBlocks(blocks.map((block) => block.id === id ? { ...block, ...patch } : block));
  const addBlock = (type: ExhibitionBlockType) => patchBlocks([...blocks, { id: crypto.randomUUID(), type, content: type === "divider" ? "" : "" }]);
  const move = (from: number, to: number) => { const next = [...blocks]; const [block] = next.splice(from, 1); next.splice(to, 0, block); patchBlocks(next); };
  const activeImageBlock = blocks.find((block) => block.id === imageBlockId);

  return <section className="typed-editor exhibition-content-editor"><header><div><span>Exhibition Builder</span><h2>展览编排</h2></div><label><span className="sr-only">展览主题</span><select value={content.payload.theme} onChange={(event) => onChange({ ...content, payload: { ...content.payload, theme: event.target.value as ExhibitionTheme } })}>{Object.entries(themeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></header><div className="exhibition-layout"><aside><h3>添加区块</h3>{(Object.keys(blockLabels) as ExhibitionBlockType[]).map((type) => <button key={type} type="button" onClick={() => addBlock(type)}><Plus aria-hidden="true" size={14} />{blockLabels[type]}</button>)}</aside><div className="exhibition-blocks" data-theme={content.payload.theme}>{blocks.map((block, index) => <article key={block.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => move(Number(event.dataTransfer.getData("text/plain")), index)}><header><span><GripVertical aria-hidden="true" size={15} />{blockLabels[block.type]}</span><div><button type="button" disabled={index === 0} onClick={() => move(index, index - 1)}>上移</button><button type="button" disabled={index === blocks.length - 1} onClick={() => move(index, index + 1)}>下移</button><button type="button" aria-label="删除区块" onClick={() => patchBlocks(blocks.filter((item) => item.id !== block.id))}><Trash2 aria-hidden="true" size={15} /></button></div></header>{block.type === "divider" ? <hr /> : block.type === "text" || block.type === "quote" ? <textarea rows={block.type === "text" ? 6 : 3} value={block.content ?? ""} onChange={(event) => updateBlock(block.id, { content: event.target.value })} placeholder={block.type === "quote" ? "输入引语" : "输入展览文本，支持 Markdown 与 Wiki Link"} /> : block.type === "image" || block.type === "image-grid" || block.type === "cover" ? <button className="exhibition-resource-button" type="button" onClick={() => setImageBlockId(block.id)}><ImagePlus aria-hidden="true" size={17} />{block.imageIds?.length ? `已选择 ${block.imageIds.length} 张图片` : "从图片库选择"}</button> : <label className="exhibition-resource-select"><span>选择{blockLabels[block.type]}</span><select value={block.contentId ?? ""} onChange={(event) => updateBlock(block.id, { contentId: event.target.value || undefined })}><option value="">尚未选择</option>{linkedContents.filter((item) => item.type === block.type).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}</article>)}{!blocks.length ? <div className="typed-empty"><h3>展厅还没有布置</h3><p>从左侧添加封面、文本、图片、图片集或设定卡区块。</p></div> : null}</div></div><ImagePicker open={Boolean(imageBlockId)} multiple={activeImageBlock?.type === "image-grid"} selectedIds={activeImageBlock?.imageIds ?? []} onClose={() => setImageBlockId(undefined)} onSelect={(ids) => { if (imageBlockId) updateBlock(imageBlockId, { imageIds: ids }); }} /></section>;
}
