import Link from "next/link";
import { BookOpenText, Images, Layers3, ArrowRight } from "lucide-react";

export default function PortalHomePage() {
  return (
    <main className="portal-home">
      <section className="portal-hero">
        <div className="portal-eyebrow">WRITING TIME</div>
        <h1>你的个人创作工作空间</h1>
        <p>
          这里将作为整个项目的总入口。现有的写作、Markdown 内容与插画管理功能已经整理为一个独立模块，后续可以继续加入更多工具与工作区。
        </p>
      </section>

      <section className="portal-module-grid" aria-label="功能模块">
        <Link className="portal-module-card portal-module-card-primary" href="/workshop">
          <div className="portal-module-icon"><Layers3 aria-hidden="true" size={24} /></div>
          <div className="portal-module-content">
            <span className="portal-module-kicker">当前可用</span>
            <h2>Fantasy Workshop</h2>
            <p>进入原有的写作、Markdown 内容管理与插画管理工作区。</p>
          </div>
          <span className="portal-module-enter">进入工作区 <ArrowRight aria-hidden="true" size={17} /></span>
        </Link>

        <article className="portal-module-card portal-module-card-muted" aria-disabled="true">
          <div className="portal-module-icon"><BookOpenText aria-hidden="true" size={24} /></div>
          <div className="portal-module-content">
            <span className="portal-module-kicker">预留模块</span>
            <h2>新的创作工具</h2>
            <p>这里暂时作为未来功能入口占位，后续可按你的具体设计继续扩展。</p>
          </div>
        </article>

        <article className="portal-module-card portal-module-card-muted" aria-disabled="true">
          <div className="portal-module-icon"><Images aria-hidden="true" size={24} /></div>
          <div className="portal-module-content">
            <span className="portal-module-kicker">预留模块</span>
            <h2>更多内容空间</h2>
            <p>可以继续加入角色、设定、素材、项目管理或其他独立工作区。</p>
          </div>
        </article>
      </section>
    </main>
  );
}
