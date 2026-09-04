import Link from "next/link";
import { ArrowRight, BookOpenText, Images } from "lucide-react";
import { HOME_DEMO_COPY } from "@/components/home/demo-data";
import { CharacterBadge } from "@/components/theme/CharacterBadge";
import { CharacterIllustration } from "@/components/theme/CharacterIllustration";
import type { WorkRecord } from "@/types/workshop";

interface WelcomeHeroProps {
  workCount: number;
  imageCount: number;
  recentWork?: WorkRecord;
  onCreateWork: () => void;
}

export function WelcomeHero({ workCount, imageCount, recentWork, onCreateWork }: WelcomeHeroProps) {
  return (
    <section className="welcome-hero decorative-panel" aria-labelledby="welcome-title" data-character-theme="balanced">
      <span aria-hidden="true" />
      <div className="welcome-hero-copy">
        <p className="home-eyebrow">{HOME_DEMO_COPY.eyebrow}</p>
        <h1 id="welcome-title">今天也一起看看，这个世界还有什么新的故事吧。</h1>
        <p className="welcome-description">{HOME_DEMO_COPY.description}</p>

        <dl className="welcome-stats" aria-label="本地工坊统计">
          <div><BookOpenText aria-hidden="true" size={16} /><dt>作品</dt><dd>{workCount}</dd></div>
          <div><Images aria-hidden="true" size={16} /><dt>图片</dt><dd>{imageCount}</dd></div>
        </dl>

        {recentWork ? (
          <Link className="hero-continue" href={`/workbench?work=${recentWork.id}`}>
            <span><small>继续创作</small><strong>{recentWork.title}</strong></span>
            <ArrowRight aria-hidden="true" size={19} />
          </Link>
        ) : (
          <button className="hero-continue" type="button" onClick={onCreateWork}>
            <span><small>从第一张纸开始</small><strong>新建作品</strong></span>
            <ArrowRight aria-hidden="true" size={19} />
          </button>
        )}
        <CharacterBadge character="noval" label="诺瓦尔 · 今日同行" />
      </div>
      <CharacterIllustration character="noval" variant="welcome" placement="right" size="lg" fade priority />
    </section>
  );
}
