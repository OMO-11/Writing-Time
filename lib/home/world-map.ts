export const WORLD = { width: 1672, height: 941 } as const;
export type Point = { x: number; y: number };
export type Camera = { x: number; y: number; scale: number };
export type Destination = {
  id: 'home' | 'workshop' | 'gallery'; title: string; description: string;
  href?: string; asset: string; position: Point; width: number; regionId: string; facing?: number;
};

export const destinations: Destination[] = [
  { id: 'home', title: '窗边居所', description: '留一盏灯，等故事归来。', asset: '/assets/world-map/landmarks/home.webp', position: { x: 824, y: 572 }, width: 124, regionId: 'beginning' },
  { id: 'workshop', title: '幻想工坊', description: '让灵感落在纸上，让故事慢慢生长。', href: '/workshop', asset: '/assets/world-map/landmarks/workshop.webp', position: { x: 590, y: 418 }, width: 142, regionId: 'beginning', facing: -1 },
  { id: 'gallery', title: '拾光画廊', description: '收藏目光停留的瞬间。', href: '/archive-gallery', asset: '/assets/world-map/landmarks/gallery.webp', position: { x: 1070, y: 480 }, width: 150, regionId: 'beginning' },
];
export const regions = [
  { id: 'beginning', bounds: { x: 480, y: 350, width: 750, height: 390 }, status: 'available' },
  { id: 'west', bounds: { x: 120, y: 190, width: 400, height: 370 }, status: 'reserved' },
  { id: 'north', bounds: { x: 500, y: 20, width: 560, height: 290 }, status: 'reserved' },
  { id: 'east', bounds: { x: 1200, y: 290, width: 390, height: 370 }, status: 'reserved' },
] as const;
export const routes = [
  { id: 'home-workshop', from: 'home', to: 'workshop', points: [{ x: 824, y: 572 }, { x: 741, y: 524 }, { x: 685, y: 469 }, { x: 590, y: 418 }], status: 'active' },
  { id: 'home-gallery', from: 'home', to: 'gallery', points: [{ x: 824, y: 572 }, { x: 919, y: 566 }, { x: 1004, y: 530 }, { x: 1070, y: 480 }], status: 'active' },
] as const;
export const terrainAsset = '/assets/world-map/terrain-detailed.webp';
export const pieceAssets = { noval: '/assets/world-map/pieces/noval-chess.webp', eden: '/assets/world-map/pieces/eden-chess.webp' };
export const mapAssets = [terrainAsset, ...destinations.map(item => item.asset), ...Object.values(pieceAssets)];

export type PlaceId = Destination['id'];
const locationKey = 'writing-time-map-location-v2';
export function readMapLocation(): PlaceId {
  try {
    const id = sessionStorage.getItem(locationKey);
    return destinations.find(item => item.id === id)?.id ?? 'home';
  } catch { return 'home'; }
}
export function rememberMapLocation(id: PlaceId) {
  try { sessionStorage.setItem(locationKey, id); sessionStorage.setItem('writing-time-map-scene-v1', 'map'); } catch { /* storage unavailable */ }
}
/** Routes connect through home; never send the chess pieces straight across a river. */
export function journeyPoints(from: PlaceId, to: PlaceId): Point[] {
  if (from === to) return [destinations.find(item => item.id === from)!.position];
  const first = from === 'home' ? [destinations[0].position] : [...routes.find(route => route.to === from)!.points].reverse();
  return to === 'home' ? first : [...first, ...routes.find(route => route.to === to)!.points.slice(1)];
}
export function pointAlongPath(points: Point[], progress: number): Point {
  if (points.length === 1) return points[0];
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) * Math.max(0, Math.min(1, progress));
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] ? remaining / lengths[i] : 0;
      return { x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t };
    }
    remaining -= lengths[i];
  }
  return points[points.length - 1];
}

export function project(point: Point, camera: Camera, width: number, height: number): Point {
  return { x: width / 2 + (point.x - camera.x) * camera.scale, y: height / 2 + (point.y - camera.y) * camera.scale };
}
export function unproject(point: Point, camera: Camera, width: number, height: number): Point {
  return { x: camera.x + (point.x - width / 2) / camera.scale, y: camera.y + (point.y - height / 2) / camera.scale };
}
export function overviewScale(width: number, height: number) { return Math.min(width / WORLD.width, height / WORLD.height) * .94; }
export function minScale(width: number, height: number) { return overviewScale(width, height) * .85; }
export function maxScale(width: number, height: number) { return Math.max(2.1, overviewScale(width, height) * 3.1); }
export function clampCamera(camera: Camera, width: number, height: number): Camera {
  const scale = Math.max(minScale(width, height), Math.min(maxScale(width, height), camera.scale));
  // Allow a narrow cloud margin, but never expose an empty canvas edge.
  const margin = 56;
  const halfX = Math.max(0, (width / 2 - margin) / scale);
  const halfY = Math.max(0, (height / 2 - margin) / scale);
  const limit = (value: number, world: number, half: number) => half >= world / 2 ? world / 2 : Math.max(half, Math.min(world - half, value));
  return { x: limit(camera.x, WORLD.width, halfX), y: limit(camera.y, WORLD.height, halfY), scale };
}
export function zoomAt(camera: Camera, factor: number, anchor: Point, width: number, height: number): Camera {
  const world = unproject(anchor, camera, width, height);
  const scale = Math.max(minScale(width, height), Math.min(maxScale(width, height), camera.scale * factor));
  return clampCamera({ x: world.x - (anchor.x - width / 2) / scale, y: world.y - (anchor.y - height / 2) / scale, scale }, width, height);
}
export function initialCamera(width: number, height: number): Camera {
  const scale = width < 620
    ? Math.max(.72, Math.min(height / 1050, .9))
    : Math.max(overviewScale(width, height) * 1.22, Math.min(width / 790, height / 510, 1.55));
  return clampCamera({ x: width < 620 ? 824 : 835, y: width < 620 ? 535 : 505, scale }, width, height);
}

const ready = new Map<string, Promise<void>>();
export function prepareMapAssets(force = false): Promise<void> {
  return Promise.all(mapAssets.map(src => {
    if (force) ready.delete(src);
    if (!ready.has(src)) ready.set(src, new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => { (image.decode?.() ?? Promise.resolve()).then(resolve, reject); };
      image.onerror = () => reject(new Error(`地图素材加载失败：${src}`));
      image.src = src;
    }).catch(error => { ready.delete(src); throw error; }));
    return ready.get(src)!;
  })).then(() => undefined);
}
