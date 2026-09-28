"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Compass, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { rememberMapLocation, type PlaceId } from '@/lib/home/world-map';
import { useUIStore } from '@/stores/ui-store';

/** A persistent way back, including gallery (which has no AppShell). */
export function ReturnToMap() {
  const pathname = usePathname();
  const router = useRouter();
  const flushSave = useUIStore(state => state.flushSave);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const place: PlaceId = pathname.startsWith('/archive-gallery') ? 'gallery' : 'workshop';
  useEffect(() => { if (pathname !== '/') rememberMapLocation(place); }, [pathname, place]);
  if (pathname === '/') return null;
  const go = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      await flushSave();
      rememberMapLocation(place);
      router.push('/');
    } catch { setError('内容暂未保存，请重试。'); pending.current = false; setBusy(false); }
  };
  return <div className="atlas-return-dock">
    {error && <span role="alert">{error}</span>}
    <Link href="/" onClick={event => void go(event)} aria-label="保存并返回地图" aria-busy={busy}>
      {busy ? <LoaderCircle size={18} className="atlas-return-spinner" /> : <Compass size={20} strokeWidth={1.2} />}
      <span>{busy ? '正在返回…' : '返回地图'}<small>WORLD ATLAS</small></span>
    </Link>
  </div>;
}
