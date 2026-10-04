import Link from "next/link";
import { ArrowRight, BookOpenText, Images } from "lucide-react";
import { AtelierDrawing } from "@/components/ui/AtelierDrawing";
import type { WorkRecord } from "@/types/workshop";

interface WelcomeHeroProps {
  workCount: number;
  imageCount: number;
  recentWork?: WorkRecord;
  onCreateWork: () => void;
}

export function WelcomeHero({ workCount, imageCount, recentWork, onCreateWork }: WelcomeHeroProps) {
  return (
    <section className="welcome-hero atelier-welcome" aria-labelledby="welcome-title" data-character-theme="balanced">
      <span aria-hidden="true" />
      <div className="welcome-hero-copy">
        <p className="home-eyebrow">幻想工坊 / 日常手记</p>
        <h1 id="welcome-title">在微光里，<br />续写你的世界。</h1>
        <p className="welcome-description">写下一段故事，留住一次发现。让尚未成形的想象，慢慢拥有自己的轮廓。</p>

        <dl className="welcome-stats" aria-label="本地工坊统计">
          <div><BookOpenText aria-hidden="true" size={16} /><dt>作品</dt><dd>{workCount}</dd></div>
          <div><Images aria-hidden="true" size={16} /><dt>图片</dt><dd>{imageCount}</dd></div>
        </dl>

        {recentWork ? (
          <Link className="hero-continue" href={recentWork.finalizedAt ? `/work/${recentWork.slug}` : `/workbench?work=${recentWork.id}`}>
            <span><small>{recentWork.finalizedAt ? "阅读定稿" : "继续创作"}</small><strong>{recentWork.title}</strong></span>
            <ArrowRight aria-hidden="true" size={19} />
          </Link>
        ) : (
          <button className="hero-continue" type="button" onClick={onCreateWork}>
            <span><small>从第一张纸开始</small><strong>新建作品</strong></span>
            <ArrowRight aria-hidden="true" size={19} />
          </button>
        )}
        <p className="atelier-hero-note">文字 · 图像 · 世界设定</p>
      </div>
      <figure className="atelier-observatory"><AtelierDrawing motif="observatory" /><figcaption><span>01 / 观测手记</span><i />每一个世界，始于一次发现。</figcaption></figure>
    </section>
  );
}
