"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type Destination, type PlaceId, destinations, rememberMapLocation } from '@/lib/home/world-map';

export function useMapJourney(onReturn: () => void) {
  const router = useRouter();
  const [location, setLocation] = useState<PlaceId>('home');
  const [departing, setDeparting] = useState(false);
  const running = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restore = useCallback((id: PlaceId) => setLocation(id), []);
  const cancel = useCallback(() => {
    running.current = false;
    if (timer.current) clearTimeout(timer.current);
    setDeparting(false);
  }, []);
  useEffect(() => () => {
    running.current = false;
    if (timer.current) clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !running.current) return;
      // Capture before the portal's global Escape-to-home handler.
      event.preventDefault(); event.stopImmediatePropagation(); cancel();
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [cancel]);

  const travel = (destination: Destination) => {
    if (running.current) return;
    if (!destination.href) {
      setLocation(destination.id);
      rememberMapLocation(destination.id, false);
      onReturn();
      return;
    }
    running.current = true;
    router.prefetch(destination.href);
    setDeparting(true);
    const href = destination.href;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    timer.current = setTimeout(() => {
      if (!running.current) return;
      setLocation(destination.id);
      rememberMapLocation(destination.id);
      router.push(href);
      timer.current = setTimeout(cancel, 5000);
    }, reduced ? 100 : 260);
  };
  return { location, currentPlace: destinations.find(item => item.id === location)!, departing, running, restore, cancel, travel };
}
