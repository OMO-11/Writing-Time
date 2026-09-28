"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareMapAssets } from '@/lib/home/world-map';

export type Scene = 'home' | 'map';
export type Phase = 'idle' | 'covering' | 'covered' | 'revealing' | 'error';
const STALE = Symbol('stale transition');
const waitFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

export function usePortalTransition() {
  const [scene, setScene] = useState<Scene>('home');
  const [phase, setPhase] = useState<Phase>('idle');
  const [target, setTarget] = useState<Scene>('home');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const fog = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene>('home');
  const phaseRef = useRef<Phase>('idle');
  const targetRef = useRef<Scene>('home');
  const id = useRef(0);
  const progress = useRef(0);
  const mounted = useRef(true);
  const reduced = useRef(false);

  const changePhase = useCallback((next: Phase) => { phaseRef.current = next; setPhase(next); }, []);
  const animate = useCallback((to: number, duration: number, transitionId: number) => new Promise<void>((resolve, reject) => {
    const start = performance.now(), from = progress.current;
    const tick = (time: number) => {
      if (!mounted.current || transitionId !== id.current) { reject(STALE); return; }
      const t = duration ? Math.min(1, (time - start) / duration) : 1;
      const eased = t * t * (3 - 2 * t);
      progress.current = from + (to - from) * eased;
      if (fog.current) fog.current.style.opacity = String(progress.current);
      if (t < 1) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  }), []);

  const requestScene = useCallback((requested: Scene, retry = false) => {
    const current = sceneRef.current;
    if (phaseRef.current === 'idle' && requested === current) return;
    if (phaseRef.current !== 'idle' && requested === targetRef.current && !retry) return;
    const transitionId = ++id.current;
    targetRef.current = requested;
    setTarget(requested); setError(''); setLoading(false);
    const run = async () => {
      try {
        if (requested !== current) {
          changePhase('covering');
          await animate(1, reduced.current ? 120 : Math.max(80, 380 * (1 - progress.current)), transitionId);
          changePhase('covered');
          // Paint the opaque frame before changing which scene is active.
          await waitFrame(); await waitFrame();
          if (transitionId !== id.current) throw STALE;
          if (requested === 'map') {
            const feedback = window.setTimeout(() => { if (id.current === transitionId) setLoading(true); }, 700);
            let timeout: number | undefined;
            try {
              await Promise.race([prepareMapAssets(retry), new Promise<never>((_, reject) => { timeout = window.setTimeout(() => reject(new Error('地图加载超时，请重试。')), 8000); })]);
            } finally { window.clearTimeout(feedback); if (timeout) window.clearTimeout(timeout); if (id.current === transitionId) setLoading(false); }
          }
          if (transitionId !== id.current) throw STALE;
          if (requested === 'map') {
            const deadline = performance.now() + 1200;
            while (!document.querySelector('.world-map[data-ready="true"]')) {
              if (transitionId !== id.current) throw STALE;
              if (performance.now() > deadline) throw new Error('地图布局暂时不可用，请重试。');
              await waitFrame();
            }
          }
          sceneRef.current = requested; setScene(requested);
          try { sessionStorage.setItem('writing-time-map-scene-v1', requested); } catch { /* storage may be disabled */ }
          await waitFrame(); await waitFrame();
          if (transitionId !== id.current) throw STALE;
        }
        changePhase('revealing');
        await animate(0, reduced.current ? 130 : Math.max(80, 480 * progress.current), transitionId);
        if (transitionId !== id.current) throw STALE;
        changePhase('idle');
      } catch (cause) {
        if (cause === STALE || transitionId !== id.current || !mounted.current) return;
        progress.current = 1;
        if (fog.current) fog.current.style.opacity = '1';
        setError(cause instanceof Error ? cause.message : '地图暂时无法展开。');
        changePhase('error');
      }
    };
    void run();
  }, [animate, changePhase]);

  useEffect(() => {
    mounted.current = true;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reduced.current = preference.matches; };
    update(); preference.addEventListener('change', update);
    let saved: string | null = null;
    try { saved = sessionStorage.getItem('writing-time-map-scene-v1'); } catch { /* storage may be disabled */ }
    const bootId = id.current;
    const invalidateTransition = () => { id.current += 1; };
    if (saved === 'map') {
      progress.current = 1;
      if (fog.current) fog.current.style.opacity = '1';
      queueMicrotask(() => { if (mounted.current && id.current === bootId) changePhase('covered'); });
      prepareMapAssets().then(async () => {
        if (!mounted.current || id.current !== bootId) return;
        sceneRef.current = 'map'; setScene('map');
        await waitFrame(); await waitFrame();
        if (!mounted.current || id.current !== bootId) return;
        const deadline = performance.now() + 1200;
        while (!document.querySelector('.world-map[data-ready="true"]')) {
          if (!mounted.current || id.current !== bootId) return;
          if (performance.now() > deadline) throw new Error('地图布局暂时不可用，请重试。');
          await waitFrame();
        }
        setBooting(false); changePhase('revealing');
        await animate(0, reduced.current ? 130 : 480, bootId);
        if (mounted.current && id.current === bootId) changePhase('idle');
      }).catch(cause => { if (mounted.current) { setBooting(false); setError(cause instanceof Error ? cause.message : '地图暂时无法展开。'); changePhase('error'); } });
    } else queueMicrotask(() => { if (mounted.current && id.current === bootId) setBooting(false); });
    return () => { mounted.current = false; invalidateTransition(); preference.removeEventListener('change', update); };
  }, [animate, changePhase]);

  const returnHome = useCallback(() => {
    if (phaseRef.current === 'error') { ++id.current; setError(''); setBooting(false); sceneRef.current = 'home'; setScene('home'); progress.current = 0; if (fog.current) fog.current.style.opacity = '0'; changePhase('idle'); try { sessionStorage.setItem('writing-time-map-scene-v1', 'home'); } catch {} return; }
    requestScene('home');
  }, [requestScene, changePhase]);
  return { scene, phase, target, error, loading, booting, fog, requestScene, returnHome };
}
