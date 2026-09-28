"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowUpRight, Compass, Crosshair, Minus, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { Camera, clampCamera, destinations, initialCamera, overviewScale, routes, WORLD, zoomAt, terrainAsset, readMapLocation, type Destination, type PlaceId } from '@/lib/home/world-map';
import { useMapJourney } from './useMapJourney';

type Props = { active: boolean; onReturn: () => void; onCameraChange: (camera: Camera) => void; savedCamera: Camera | null; };

export function WorldMapScene({ active, onReturn, onCameraChange, savedCamera }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const pointer = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ camera: Camera; x: number; y: number; distance?: number; midpoint?: { x: number; y: number }; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [size, setSize] = useState({ width: 1440, height: 900 });
  const [camera, setCamera] = useState<Camera>({ x: 835, y: 505, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const [touchPlace, setTouchPlace] = useState<PlaceId | null>(null);
  const cameraRef = useRef(camera);
  const initialized = useRef(false);
  const setView = useCallback((next: Camera) => { cameraRef.current = next; setCamera(next); }, []);
  const { location, currentPlace, departing, restore, cancel, travel, running } = useMapJourney(onReturn);
  const returnHome = () => { cancel(); onReturn(); };
  const visit = (item: Destination, event?: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return;
    event?.preventDefault();
    if (!active || running.current) return;
    if (event && event.detail > 0 && matchMedia('(hover: none)').matches && touchPlace !== item.id) { setTouchPlace(item.id); return; }
    setNavOpen(false); setTouchPlace(null); onCameraChange(cameraRef.current); travel(item);
  };

  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width, height = entry.contentRect.height;
      if (!width || !height) return;
      setSize({ width, height });
      if (!initialized.current) {
        const id = readMapLocation();
        restore(id);
        const place = destinations.find(item => item.id === id)!;
        const start = savedCamera ?? initialCamera(width, height);
        setView(clampCamera(id === 'home' ? start : { ...start, x: place.position.x, y: place.position.y - 35 }, width, height));
        initialized.current = true;
      } else setView(clampCamera(cameraRef.current, width, height));
      setLaidOut(true);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [savedCamera, restore, setView]);
  useEffect(() => { if (!laidOut) return; const timer = setTimeout(() => onCameraChange(camera), 180); return () => clearTimeout(timer); }, [camera, laidOut, onCameraChange]);
  useEffect(() => {
    if (active) { title.current?.focus({ preventScroll: true }); queueMicrotask(() => restore(readMapLocation())); }
    else queueMicrotask(() => { if (running.current) cancel(); });
  }, [active, restore, cancel, running]);
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!active || running.current || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      setView(zoomAt(cameraRef.current, event.deltaY < 0 ? 1.12 : 1 / 1.12, { x: event.clientX - rect.left, y: event.clientY - rect.top }, rect.width, rect.height));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [active, running, setView]);

  const update = useCallback((next: Camera) => setView(clampCamera(next, size.width, size.height)), [size, setView]);
  const zoom = (factor: number, anchor = { x: size.width / 2, y: size.height / 2 }) => setView(zoomAt(cameraRef.current, factor, anchor, size.width, size.height));
  const overview = () => update({ x: WORLD.width / 2, y: WORLD.height / 2, scale: overviewScale(size.width, size.height) });
  const locate = () => update({ ...camera, x: currentPlace.position.x, y: currentPlace.position.y - 35, scale: Math.max(camera.scale, Math.min(size.width / 680, size.height / 500, 1.6)) });
  const focusDestination = (id: string) => {
    const destination = destinations.find(item => item.id === id);
    if (!destination) return;
    update({ ...camera, x: destination.position.x, y: destination.position.y - 32, scale: Math.max(camera.scale, Math.min(size.width / 680, size.height / 500, 1.55)) });
    setNavOpen(false);
    setTouchPlace(matchMedia('(hover: none)').matches ? destination.id : null);
  };
  const relative = (event: { clientX: number; clientY: number }) => {
    const bounds = viewport.current!.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!active || running.current) return;
    suppressClick.current = false;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if ((event.target as HTMLElement).closest('[data-map-control]')) return;
    const p = relative(event);
    pointer.current.set(event.pointerId, p);
    if (pointer.current.size === 1) gesture.current = { camera: cameraRef.current, x: p.x, y: p.y, moved: false };
    else if (pointer.current.size === 2) {
      const [a, b] = [...pointer.current.values()];
      for (const id of pointer.current.keys()) if (!viewport.current?.hasPointerCapture(id)) viewport.current?.setPointerCapture(id);
      gesture.current = { camera: cameraRef.current, x: 0, y: 0, distance: Math.hypot(a.x - b.x, a.y - b.y), midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, moved: true };
    }
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointer.current.has(event.pointerId) || !gesture.current) return;
    const p = relative(event);
    pointer.current.set(event.pointerId, p);
    const g = gesture.current;
    if (pointer.current.size === 2 && g.distance && g.midpoint) {
      const [a, b] = [...pointer.current.values()];
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const next = zoomAt(g.camera, Math.hypot(a.x - b.x, a.y - b.y) / g.distance, g.midpoint, size.width, size.height);
      update({ ...next, x: next.x - (midpoint.x - g.midpoint.x) / next.scale, y: next.y - (midpoint.y - g.midpoint.y) / next.scale });
      setDragging(true);
    } else if (pointer.current.size === 1) {
      const dx = p.x - g.x, dy = p.y - g.y;
      if (Math.hypot(dx, dy) > 7) { g.moved = true; setDragging(true); if (!viewport.current?.hasPointerCapture(event.pointerId)) viewport.current?.setPointerCapture(event.pointerId); }
      if (g.moved) update({ ...g.camera, x: g.camera.x - dx / g.camera.scale, y: g.camera.y - dy / g.camera.scale });
    }
  };
  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointer.current.has(event.pointerId)) return;
    if (gesture.current?.moved || pointer.current.size > 1) {
      suppressClick.current = true;
    }
    pointer.current.delete(event.pointerId);
    if (viewport.current?.hasPointerCapture(event.pointerId)) viewport.current.releasePointerCapture(event.pointerId);
    if (pointer.current.size === 1) {
      const p = [...pointer.current.values()][0];
      gesture.current = { camera: cameraRef.current, x: p.x, y: p.y, moved: true };
    } else { gesture.current = null; setDragging(false); }
  };
  const transform = `translate(${size.width / 2 - camera.x * camera.scale}px, ${size.height / 2 - camera.y * camera.scale}px) scale(${camera.scale})`;
  return <section className="world-map" aria-label="雾行图世界地图" data-ready={laidOut} data-location={location} data-departing={departing}
    onKeyDownCapture={event => { if (event.key === 'Escape' && running.current) { event.stopPropagation(); cancel(); } }}>
    <div ref={viewport} className={`world-map-viewport${dragging ? ' is-dragging' : ''}`} aria-label="可拖动和缩放的地图"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endPointer} onPointerCancel={endPointer} onLostPointerCapture={endPointer}
      onClickCapture={event => { if (suppressClick.current && event.detail > 0) { suppressClick.current = false; event.preventDefault(); event.stopPropagation(); } }}>
      <div className="world-map-world" style={{ width: WORLD.width, height: WORLD.height, transform, '--map-inverse': 1 / camera.scale } as CSSProperties}>
        <Image className="world-map-terrain" src={terrainAsset} alt="" width={3344} height={1882} unoptimized draggable={false} />
        <svg className="world-map-routes" aria-hidden="true" viewBox={`0 0 ${WORLD.width} ${WORLD.height}`}>
          {routes.map(route => <polyline key={route.id} points={route.points.map(p => `${p.x},${p.y}`).join(' ')} />)}
        </svg>
      <div className="world-map-hotspots">
        {destinations.map(item => {
          const image = <><span className="world-map-building" style={{ transform: `scaleX(${item.facing ?? 1})` }}><Image src={item.asset} alt="" width={item.id === 'home' ? 1204 : item.id === 'workshop' ? 1077 : 1298} height={item.id === 'home' ? 987 : item.id === 'workshop' ? 1033 : 1070} unoptimized draggable={false} /></span><span className="world-map-label"><small>{location === item.id ? 'CURRENT LOCATION · 当前所在' : 'DISCOVER · 探访此地'}</small><strong>{item.title}</strong><span>{item.description}</span><i>{item.href ? '前往此地' : '返回窗边'} <ArrowUpRight size={13} /></i></span></>;
          const style = { left: item.position.x, top: item.position.y, width: item.width };
          return item.href ? <Link data-map-place={item.id} data-revealed={touchPlace === item.id} key={item.id} className="world-map-landmark" style={style} href={item.href} onClick={event => visit(item, event)} aria-label={`前往${item.title}：${item.description}`}>{image}</Link>
            : <button data-map-place={item.id} data-revealed={touchPlace === item.id} key={item.id} type="button" className="world-map-landmark" style={style} onClick={event => visit(item, event)} aria-label="返回窗边居所">{image}</button>;
        })}

      </div>
      <div className="world-map-cloud-bank" aria-hidden="true"><span /><span /><span /><span /></div>
      </div>
    </div>
    <div className="world-map-heading"><span>WRITING TIME <i /> WORLD ATLAS</span><h2 ref={title} tabIndex={-1}>雾行图</h2><p>山川有迹，故事无尽。</p></div>
    <button data-map-control className="world-map-return" onClick={returnHome}><ArrowLeft size={16} strokeWidth={1.3} />返回窗边</button>
    <div data-map-control className="world-map-controls" aria-label="地图视野控制">
      <button disabled={departing} onClick={() => zoom(1.2)} aria-label="放大地图" title="放大地图"><Plus size={18} strokeWidth={1.4} /></button>
      <button disabled={departing} onClick={() => zoom(1 / 1.2)} aria-label="缩小地图" title="缩小地图"><Minus size={18} strokeWidth={1.4} /></button>
      <span />
      <button disabled={departing} onClick={overview} aria-label="查看世界总览" title="世界总览"><Compass size={19} strokeWidth={1.3} /></button>
      <button disabled={departing} onClick={locate} aria-label="定位当前位置" title="定位当前位置"><Crosshair size={18} strokeWidth={1.3} /></button>
    </div>
    <div data-map-control className="world-map-destinations"><button aria-label="目的地" aria-expanded={navOpen} aria-controls="world-map-nav" onClick={() => setNavOpen(value => !value)}><Compass size={20} strokeWidth={1.2} /><span>去往何处<small>DESTINATIONS</small></span></button>
      {navOpen && <nav id="world-map-nav" aria-label="地图目的地"><div><strong>目的地</strong><button aria-label="关闭目的地列表" onClick={() => setNavOpen(false)}><X size={17} /></button></div>
        {destinations.map(item => <div key={item.id} className="world-map-nav-row"><button disabled={departing} onClick={() => focusDestination(item.id)} aria-label={`在地图上查看${item.title}`}>{item.title}<small>{location === item.id ? '此刻所在' : item.description}</small></button>{item.href ? <Link href={item.href} onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return; event.preventDefault(); setTouchPlace(item.id); setNavOpen(false); travel(item); }} aria-label={`进入${item.title}`}><ArrowUpRight size={18} /></Link> : <button onClick={() => travel(item)} aria-label="返回窗边居所"><ArrowLeft size={17} /></button>}</div>)}
      </nav>}
    </div>
    <div className="world-map-footer"><span className="world-map-current"><i />{currentPlace.title}</span></div>
    <div className="world-map-departure" aria-hidden="true" />
  </section>;
}
