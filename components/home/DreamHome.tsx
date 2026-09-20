"use client";

import Image from "next/image";
import { LightingSlider } from "./LightingSlider";
import { RelightScene } from "./RelightScene";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, ChevronRight, Compass, ImageIcon, Moon, Pause, Play, Plus, Sun, X } from "lucide-react";

const destinations = [
  { id: "01", title: "Fantasy Workshop", subtitle: "幻想工坊", description: "让灵感落在纸上，让故事慢慢生长。", href: "/workshop", icon: BookOpen, label: "开始创作", kind: "workshop" },
  { id: "02", title: "Archive Gallery", subtitle: "拾光画廊", description: "收藏目光停留的瞬间，重访每一份心动。", href: "/archive-gallery", icon: ImageIcon, label: "浏览画廊", kind: "gallery" },
];

function atmosphere(hour: number) {
  const sun = Math.max(0, Math.sin((hour - 6) * Math.PI / 12));
  const day = Math.min(1, sun * 2.4);
  const warmth = Math.max(0, 1 - Math.abs(hour - 17.5) / 2) + Math.max(0, 1 - Math.abs(hour - 6.5) / 1.5) * .65;
  return { day, warmth, label: hour < 5 || hour >= 20 ? "静夜" : hour < 8 ? "晨曦" : hour < 16 ? "白昼" : "薄暮" };
}

export function DreamHome() {
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const [lightingOpen, setLightingOpen] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [moving, setMoving] = useState(true);
  const [softness, setSoftness] = useState(.4);
  const [sheen, setSheen] = useState(.5);
  const [exposure, setExposure] = useState(0);
  const [bloom, setBloom] = useState(.16);
  const [threshold, setThreshold] = useState(.9);
  const [radius, setRadius] = useState(1);
  const [styleStrength, setStyleStrength] = useState(.85);
  const [view, setView] = useState(0);
  const [atmosphereStrength, setAtmosphereStrength] = useState(.75);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (open) closeButton.current?.focus({ preventScroll: true });
    else if (wasOpen.current) trigger.current?.focus({ preventScroll: true });
    wasOpen.current = open;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false); setLightingOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const hour = preview ?? (now ? now.getHours() + now.getMinutes() / 60 : 14);
  const light = atmosphere(hour);
  const actualHour = now?.getHours() ?? 14;
  const greeting = actualHour < 5 ? "夜深了，留一盏灯给灵感。" : actualHour < 11 ? "早安，新的故事正要开始。" : actualHour < 18 ? "日光正好，欢迎回来。" : "晚上好，欢迎回到故事里。";
  const close = () => setOpen(false);

  return (
    <main data-bright={view === 1 || view === 0 && light.day > .7} className={`dream-home${open ? " is-open" : ""}${moving ? "" : " is-still"}`}
      onTouchStart={(event) => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
      onTouchEnd={(event) => {
        if (!touch.current || (event.target as HTMLElement).closest("input, button, a")) return;
        const dx = event.changedTouches[0].clientX - touch.current.x;
        const dy = event.changedTouches[0].clientY - touch.current.y;
        if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) setOpen(true); else close(); }
        touch.current = null;
      }}>
      <div className="dream-scene" aria-hidden="true">
        <Image src="/assets/home/enhance-noval-observatory.webp" alt="" fill priority sizes="(max-width: 760px) 180vh, 100vw" className="dream-art" />
        <RelightScene bloom={bloom} threshold={threshold} radius={radius} styleStrength={styleStrength} hour={hour} softness={softness} sheen={sheen} exposure={exposure} view={view} moving={moving} atmosphere={atmosphereStrength} />
      </div>

      <header className="dream-header">
        <Link className="dream-brand" href="/" aria-label="Writing Time 主页"><span className="dream-brand-mark"><Compass size={25} strokeWidth={1.2} /></span><span>WRITING TIME<small>A LITTLE SPACE FOR WONDER</small></span></Link>
        <span className="dream-header-note">在文字与光之间</span>
      </header>
      <section className="dream-welcome" aria-label="欢迎回来">
        <div className="dream-date">{now ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(now) : "正在读取本地时间"}<span>LOCAL TIME</span></div>
        <time className="dream-clock" dateTime={now?.toISOString()}>{now ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}` : "--:--"}<span>{now ? String(now.getSeconds()).padStart(2, "0") : "--"}</span></time>
        <div className="dream-greeting"><span className="dream-small-line" /><p>属于你的片刻宁静</p><h1>{greeting}</h1><p className="dream-description">把世界的喧嚣留在窗外，<br />这里，还有未写完的梦。</p></div>
        <button ref={trigger} className="dream-enter" onClick={() => { setOpen(!open); setLightingOpen(false); }} aria-expanded={open} aria-controls="dream-destinations"><span>{open ? "返回窗边" : "开启我的空间"}</span>{open ? <ArrowLeft size={19} /> : <ChevronRight size={19} />}</button>
        <span className="dream-enter-note">{open ? "让灵感，再停留一会儿" : "创作 · 收藏 · 更多可能"}</span>
      </section>
      <aside id="dream-destinations" className="dream-drawer" inert={!open} aria-hidden={!open} aria-labelledby="dream-drawer-title">
        <div className="dream-drawer-top"><span>YOUR CREATIVE UNIVERSE</span><button ref={closeButton} onClick={close} aria-label="关闭空间选择"><X size={21} /></button></div>
        <div className="dream-drawer-heading"><span>每一次出发，都始于一个念头</span><h2 id="dream-drawer-title">今天，想去哪里？</h2><p>挑选一扇门，继续你的奇妙旅程。</p></div>
        <nav className="dream-destinations" aria-label="选择功能空间">{destinations.map(({ icon: Icon, ...item }) => <Link key={item.id} href={item.href} className={`dream-card dream-card-${item.kind}`}>
          <div className="dream-card-top"><Icon size={23} strokeWidth={1.3} /><span>{item.id} / EXPLORE</span><ArrowUpRight className="dream-card-arrow" size={21} /></div>
          <div className="dream-card-copy"><span>{item.subtitle}</span><h3>{item.title}</h3><p>{item.description}</p></div>
          <div className="dream-card-bottom"><span>{item.label}</span><ChevronRight size={16} /></div>
        </Link>)}</nav>
        <div className="dream-coming" aria-disabled="true"><Plus size={21} strokeWidth={1.3} /><div><h3>故事，还在延续</h3><p>更多空间，正在慢慢酝酿。</p></div><span>COMING SOON</span></div>
        <div className="dream-drawer-footer"><span>保持好奇，让想象自由生长。</span><span>01 — ∞</span></div>
      </aside>
      <footer className="dream-footer">
        <div className="dream-light-area">
          <button className="dream-light-toggle" onClick={() => setLightingOpen(!lightingOpen)} aria-expanded={lightingOpen} aria-controls="dream-light-controls">{light.day > .2 ? <Sun size={16} /> : <Moon size={16} />}<span>{light.label}</span><i /><span>{preview === null ? "光影随时间流转" : "正在预览光影"}</span></button>
          {lightingOpen && <section id="dream-light-controls" className="dream-light-controls" aria-label="光影调色手记">
            <div className="light-notebook-heading"><div><span>ATELIER / LIGHT STUDY</span><h2>窗边 · 调色手记</h2></div><button aria-label="关闭光影参数" onClick={() => setLightingOpen(false)}><X size={18} /></button></div>
            <p className="light-notebook-intro">借一点光，为此刻添上自己的颜色。</p>
            <LightingSlider id="hour" label="光影时刻" value={hour} min={0} max={23.99} step={.05} display={`${String(Math.floor(hour)).padStart(2,"0")}:${String(Math.floor(hour%1*60)).padStart(2,"0")}`} onChange={setPreview} />
            <div className="light-time-actions"><span>静夜 · 晨曦 · 白昼 · 薄暮</span><button onClick={() => setPreview(null)} disabled={preview === null}>跟随当前时间</button></div>
            <div className="light-parameter-grid">
              <LightingSlider id="exposure" label="曝光" english="Exposure" value={exposure} min={-2} max={1} step={.01} display={`${exposure.toFixed(2)} EV`} onChange={setExposure} />
              <LightingSlider id="bloom" label="泛光" english="Bloom" value={bloom} min={0} max={.6} step={.01} display={bloom.toFixed(2)} onChange={setBloom} />
              <LightingSlider id="threshold" label="高亮阈值" value={threshold} min={.3} max={2} step={.01} display={threshold.toFixed(2)} onChange={setThreshold} />
              <LightingSlider id="radius" label="扩散半径" value={radius} min={.25} max={2} step={.01} display={`${radius.toFixed(2)} ×`} onChange={setRadius} />
              <LightingSlider id="style" label="手绘光影" value={styleStrength} min={0} max={1} step={.01} display={`${Math.round(styleStrength*100)}%`} onChange={setStyleStrength} />
              <LightingSlider id="softness" label="边缘柔和" value={softness} min={0} max={1} step={.01} display={`${Math.round(softness*100)}%`} onChange={setSoftness} />
              <LightingSlider id="sheen" label="发丝柔光" value={sheen} min={0} max={1} step={.01} display={`${Math.round(sheen*100)}%`} onChange={setSheen} />
              <LightingSlider id="atmosphere" label="光束与浮尘" value={atmosphereStrength} min={0} max={1.5} step={.05} display={`${Math.round(atmosphereStrength*100)}%`} onChange={setAtmosphereStrength} />
            </div>
            <p className="light-exposure-note">夜深时自动补光 +1 EV，叠加于曝光设置。</p>
            <div className="light-presets"><button onClick={() => {setExposure(-.22);setBloom(.05);setThreshold(1.05);setRadius(.71);setStyleStrength(1);setSoftness(1);setSheen(.46);}}>参考图配方</button><button onClick={() => {setExposure(0);setBloom(.16);setThreshold(.9);setRadius(1);setStyleStrength(.85);setSoftness(.4);setSheen(.5);setAtmosphereStrength(.75);}}>恢复默认</button></div>
            <div className="dream-view-modes" role="group" aria-label="光照对比">{["光照效果", "底图", "法线图"].map((label, index) => <button key={label} aria-pressed={view === index} onClick={() => setView(index)}>{label}</button>)}</div>
            <button className="dream-motion-toggle" onClick={() => setMoving(!moving)}>{moving ? <Pause size={14} /> : <Play size={14} />}{moving ? "暂停场景动效" : "开启场景动效"}</button>
          </section>}
        </div>
        <span className="dream-caption">NOVAL’S ATELIER <span>·</span> 灵感常在，故事未完</span>
      </footer>
    </main>
  );
}










