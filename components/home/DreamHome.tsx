"use client";

import Image from "next/image";
import { LightingSlider } from "./LightingSlider";
import { RelightScene } from "./RelightScene";
import { WorldMapScene } from "./WorldMapScene";
import { usePortalTransition } from "./usePortalTransition";
import { Camera, prepareMapAssets } from "@/lib/home/world-map";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, Compass, Moon, Pause, Play, Sun, X } from "lucide-react";

function atmosphere(hour: number) {
  const sun = Math.max(0, Math.sin((hour - 6) * Math.PI / 12));
  const day = Math.min(1, sun * 2.4);
  const warmth = Math.max(0, 1 - Math.abs(hour - 17.5) / 2) + Math.max(0, 1 - Math.abs(hour - 6.5) / 1.5) * .65;
  return { day, warmth, label: hour < 5 || hour >= 20 ? "静夜" : hour < 8 ? "晨曦" : hour < 16 ? "白昼" : "薄暮" };
}

export function DreamHome() {
  const [now, setNow] = useState<Date | null>(null);
  const { scene, phase, booting, fog, requestScene, returnHome, loading, error } = usePortalTransition();
  const [mapMounted, setMapMounted] = useState(false);
  const [savedCamera, setSavedCamera] = useState<Camera | null>(null);
  const [lightingOpen, setLightingOpen] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [motionStatus, setMotionStatus] = useState("正在加载场景动效…");
  const [moving, setMoving] = useState(true);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [allowReducedMotion, setAllowReducedMotion] = useState(false);
  const motionBlockedBySystem = systemReducedMotion && !allowReducedMotion;
  const motionEnabled = moving && !motionBlockedBySystem;
  const [softness, setSoftness] = useState(.4);
  const [sheen, setSheen] = useState(.5);
  const [exposure, setExposure] = useState(0);
  const [styleStrength, setStyleStrength] = useState(.85);
  const [view, setView] = useState(0);
  const [atmosphereStrength, setAtmosphereStrength] = useState(.75);
  const trigger = useRef<HTMLButtonElement>(null);
  const wasMap = useRef(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setSystemReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (scene === "map") wasMap.current = true;
    else if (wasMap.current && phase === "idle") { trigger.current?.focus({ preventScroll: true }); wasMap.current = false; }
  }, [scene, phase]);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("writing-time-map-camera-v1");
      if (raw) {
        const candidate = JSON.parse(raw) as Camera;
        if ([candidate.x, candidate.y, candidate.scale].every(Number.isFinite) && candidate.x >= 0 && candidate.x <= 1672 && candidate.y >= 0 && candidate.y <= 941 && candidate.scale > .1 && candidate.scale < 5) queueMicrotask(() => setSavedCamera(candidate));
      }
      if (sessionStorage.getItem("writing-time-map-scene-v1") === "map") queueMicrotask(() => setMapMounted(true));
    } catch { /* storage may be disabled */ }
    const warm = () => { void prepareMapAssets().catch(() => undefined); };
    const idle = window.requestIdleCallback?.(warm, { timeout: 2500 });
    const fallback = idle === undefined ? window.setTimeout(warm, 1800) : undefined;
    return () => { if (idle !== undefined) window.cancelIdleCallback?.(idle); if (fallback !== undefined) window.clearTimeout(fallback); };
  }, []);
  const saveCamera = (camera: Camera) => {
    try { sessionStorage.setItem("writing-time-map-camera-v1", JSON.stringify(camera)); } catch { /* storage may be disabled */ }
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (phase !== "idle" || scene === "map") returnHome();
        else setLightingOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, scene, returnHome]);

  const hour = preview ?? (now ? now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600 : 14);
  const light = atmosphere(hour);
  const actualHour = now?.getHours() ?? 14;
  const greeting = actualHour < 5 ? "夜深了，留一盏灯给灵感。" : actualHour < 11 ? "早安，新的故事正要开始。" : actualHour < 18 ? "日光正好，欢迎回来。" : "晚上好，欢迎回到故事里。";
  const enterMap = () => { setMapMounted(true); setLightingOpen(false); requestScene("map"); };

  return (
    <main className="portal-root" data-scene={scene} data-phase={phase} data-booting={booting}>
    <div data-bright={view === 1 || view === 0 && light.day > .7} className={`dream-home${motionEnabled ? "" : " is-still"}`} inert={scene !== "home" || phase !== "idle"} aria-hidden={scene !== "home"}>
      <div className="dream-scene" aria-hidden="true">
        <Image src="/assets/home/enhance-noval-observatory.webp" alt="" fill priority sizes="(max-width: 760px) 180vh, 100vw" className="dream-art" />
        <RelightScene active={scene === "home"} onMotionStatus={setMotionStatus} previewing={preview !== null} bloom={.16} threshold={.9} radius={1} styleStrength={styleStrength} hour={hour} softness={softness} sheen={sheen} exposure={exposure} view={view} moving={moving} allowReducedMotion={allowReducedMotion} atmosphere={atmosphereStrength} />
      </div>

      <header className="dream-header">
        <Link className="dream-brand" href="/" aria-label="Writing Time 主页"><span className="dream-brand-mark"><Compass size={25} strokeWidth={1.2} /></span><span>WRITING TIME<small>A LITTLE SPACE FOR WONDER</small></span></Link>
        <span className="dream-header-note">在文字与光之间</span>
      </header>
      <section className="dream-welcome" aria-label="欢迎回来">
        <div className="dream-date">{now ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(now) : "正在读取本地时间"}<span>LOCAL TIME</span></div>
        <time className="dream-clock" dateTime={now?.toISOString()}>{now ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}` : "--:--"}<span>{now ? String(now.getSeconds()).padStart(2, "0") : "--"}</span></time>
        <div className="dream-greeting"><span className="dream-small-line" /><p>属于你的片刻宁静</p><h1>{greeting}</h1><p className="dream-description">把世界的喧嚣留在窗外，<br />这里，还有未写完的梦。</p></div>
        <button ref={trigger} className="dream-enter" onClick={enterMap} onPointerEnter={() => { void prepareMapAssets().catch(() => undefined); }} onFocus={() => { void prepareMapAssets().catch(() => undefined); }}><Compass size={18} strokeWidth={1.4} /><span>开启我的空间</span><ChevronRight size={17} /></button>
        <span className="dream-enter-note">循着雾，去往故事所在的地方</span>
      </section>
      <footer className="dream-footer">
        <div className="dream-light-area">
          <button className="dream-light-toggle" onClick={() => setLightingOpen(!lightingOpen)} aria-expanded={lightingOpen} aria-controls="dream-light-controls">{light.day > .2 ? <Sun size={16} /> : <Moon size={16} />}<span>{light.label}</span><i /><span>{preview === null ? "光影随时间流转" : "正在预览光影"}</span></button>
          {lightingOpen && <section id="dream-light-controls" className="dream-light-controls" aria-label="光影调色手记">
            <div className="light-notebook-heading"><div><span>ATELIER / LIGHT STUDY</span><h2>窗边 · 调色手记</h2></div><button aria-label="关闭光影参数" onClick={() => setLightingOpen(false)}><X size={18} /></button></div>
            <p className="light-notebook-intro">借一点光，为此刻添上自己的颜色。</p>
            <LightingSlider id="hour" label="光影时刻" value={hour} min={0} max={23.99} step={.05} display={`${String(Math.floor(hour)).padStart(2,"0")}:${String(Math.floor(hour%1*60)).padStart(2,"0")}`} onChange={setPreview} />
            <div className="light-time-actions"><span>静夜 · 晨曦 · 白昼 · 薄暮</span><button onClick={() => setPreview(null)} disabled={preview === null}>跟随当前时间</button></div>
            <div className="light-section-caption"><span>光与笔触</span><span>LIGHT & PIGMENT</span></div>
            <div className="light-parameter-grid">
              <LightingSlider id="exposure" label="曝光补偿" value={exposure} min={-2} max={1} step={.01} display={`${exposure.toFixed(2)} EV`} onChange={setExposure} />
              <LightingSlider id="style" label="手绘光影" value={styleStrength} min={0} max={1} step={.01} display={`${Math.round(styleStrength*100)}%`} onChange={setStyleStrength} />
              <LightingSlider id="softness" label="边缘柔和" value={softness} min={0} max={1} step={.01} display={`${Math.round(softness*100)}%`} onChange={setSoftness} />
              <LightingSlider id="sheen" label="发丝柔光" value={sheen} min={0} max={1} step={.01} display={`${Math.round(sheen*100)}%`} onChange={setSheen} />
              <LightingSlider id="atmosphere" label="光束与浮尘" value={atmosphereStrength} min={0} max={1.5} step={.05} display={`${Math.round(atmosphereStrength*100)}%`} onChange={setAtmosphereStrength} />
            </div>
            <p className="light-exposure-note">夜深时自动补光 +1 EV，叠加于曝光设置。</p>
            <div className="light-presets"><button onClick={() => {setExposure(-.22);setStyleStrength(1);setSoftness(1);setSheen(.46);}}>柔绘配方</button><button onClick={() => {setExposure(0);setStyleStrength(.85);setSoftness(.4);setSheen(.5);setAtmosphereStrength(.75);}}>恢复默认</button></div>
            <div className="dream-view-modes" role="group" aria-label="光照对比">{["光照效果", "底图", "法线图"].map((label, index) => <button key={label} aria-pressed={view === index} onClick={() => setView(index)}>{label}</button>)}</div>
            <p className="light-exposure-note" role="status">{motionStatus}</p>
            {motionBlockedBySystem && <p className="light-exposure-note">已遵循系统设置暂停动效。你仍可手动开启，仅对本次页面访问生效。</p>}
            <button className="dream-motion-toggle" onClick={() => {
              if (motionBlockedBySystem) { setAllowReducedMotion(true); setMoving(true); }
              else { setMoving(!moving); if (moving) setAllowReducedMotion(false); }
            }}>{motionEnabled ? <Pause size={14} /> : <Play size={14} />}{motionEnabled ? "暂停场景动效" : "开启场景动效"}</button>
          </section>}
        </div>
        <span className="dream-caption">NOVAL’S ATELIER <span>·</span> 灵感常在，故事未完</span>
      </footer>
    </div>
    {mapMounted && <div className="portal-map-layer" inert={scene !== "map" || phase !== "idle"} aria-hidden={scene !== "map"}><WorldMapScene active={scene === "map" && phase === "idle"} onReturn={returnHome} onCameraChange={saveCamera} savedCamera={savedCamera} /></div>}
    <div ref={fog} className="portal-fog" data-phase={phase} aria-hidden="true" />
    {(loading || error) && <div className="portal-fog-status" role="status"><p>{error || "正在展开地图…"}</p>{error ? <><button onClick={() => requestScene("map", true)}>重试</button><button onClick={returnHome}>返回窗边</button></> : <button onClick={returnHome}>取消</button>}</div>}
    </main>
  );
}










