"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type Destination, type PlaceId, type Point, destinations, journeyPoints, pointAlongPath, rememberMapLocation } from '@/lib/home/world-map';

export function useMapJourney(onReturn: () => void, onPosition: (point: Point) => void) {
  const router = useRouter();
  const [location, setLocation] = useState<PlaceId>('home');
  const [journey, setJourney] = useState<{ target: PlaceId; point: Point; lift: number; progress: number } | null>(null);
  const [departing, setDeparting] = useState(false);
  const current = useRef<PlaceId>('home');
  const running = useRef(false);
  const frame = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacks = useRef({ onReturn, onPosition });
  useEffect(() => { callbacks.current = { onReturn, onPosition }; }, [onReturn, onPosition]);
  const restore = useCallback((id: PlaceId) => { current.current = id; setLocation(id); }, []);
  const cancel = useCallback(() => {
    running.current = false; cancelAnimationFrame(frame.current);
    if (timer.current) clearTimeout(timer.current);
    setJourney(null); setDeparting(false);
  }, []);
  useEffect(() => () => { running.current = false; cancelAnimationFrame(frame.current); if (timer.current) clearTimeout(timer.current); }, []);

  const travel = (destination: Destination) => {
    if (running.current) return;
    running.current = true;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const path = journeyPoints(current.current, destination.id);
    const duration = reduced ? 100 : path.length === 1 ? 250 : Math.min(1800, 900 + path.length * 90);
    if (destination.href) router.prefetch(destination.href);
    let elapsed = 0, previous = performance.now();
    const tick = (now: number) => {
      if (!running.current) return;
      // Hidden-tab time does not teleport pieces to their destination.
      if (!document.hidden) elapsed += Math.min(50, now - previous);
      previous = now;
      const t = Math.min(1, elapsed / duration);
      const point = pointAlongPath(path, t * t * (3 - 2 * t));
      setJourney({ target: destination.id, point, progress: t, lift: reduced ? 0 : Math.sin(Math.PI * t) * 23 });
      callbacks.current.onPosition(point);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else {
        current.current = destination.id; setLocation(destination.id); rememberMapLocation(destination.id);
        timer.current = setTimeout(() => {
          if (!running.current) return;
          if (!destination.href) { running.current = false; setJourney(null); callbacks.current.onReturn(); return; }
          setDeparting(true);
          timer.current = setTimeout(() => {
            if (!running.current) return;
            router.push(destination.href!);
            timer.current = setTimeout(cancel, 5000);
          }, reduced ? 100 : 260);
        }, reduced ? 0 : 180);
      }
    };
    frame.current = requestAnimationFrame(tick);
  };
  return { location, currentPlace: destinations.find(item => item.id === location)!, journey, departing, running, restore, cancel, travel };
}
