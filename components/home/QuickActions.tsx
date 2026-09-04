"use client";

import { BookPlus, ImagePlus, Lightbulb, ScrollText, type LucideIcon } from "lucide-react";

interface QuickActionsProps {
  onNewWork: () => void;
  onCaptureNote: () => void;
  onAddImages: () => void;
  onCreateRecord: () => void;
}

function QuickAction({ icon: Icon, title, detail, onClick }: {
  icon: LucideIcon;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button className="quick-action" type="button" onClick={onClick}>
      <span className="quick-action-icon"><Icon aria-hidden="true" size={21} strokeWidth={1.6} /></span>
      <span><strong>{title}</strong><small>{detail}</small></span>
    </button>
  );
}

export function QuickActions(props: QuickActionsProps) {
  return (
    <section className="quick-actions" aria-labelledby="quick-actions-title">
      <div className="section-heading compact-heading">
        <div><p className="home-eyebrow">QUICK START</p><h2 id="quick-actions-title">开始制作</h2></div>
        <span>常用入口</span>
      </div>
      <div className="quick-actions-grid">
        <QuickAction icon={BookPlus} title="新建文章" detail="从一张干净的旅行纸页开始" onClick={props.onNewWork} />
        <QuickAction icon={Lightbulb} title="记录灵感" detail="先接住突然出现的小念头" onClick={props.onCaptureNote} />
        <QuickAction icon={ImagePlus} title="上传图片" detail="交给伊登收进星夜收藏室" onClick={props.onAddImages} />
        <QuickAction icon={ScrollText} title="创建设定" detail="整理角色、地点、物品与魔法" onClick={props.onCreateRecord} />
      </div>
    </section>
  );
}
