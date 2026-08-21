/* 素材の読み込み。切り抜き済みWebPを取得し、engine の Layer 形式で返す。
 * Layer = { data: Uint8Array(w*h*4), x0, y0, w, h }
 * 全画面で持つと1枚4MB。切り抜きなら平均6.9%で済む(実測 1.63GB → 0.11GB)。 */

const ROOT = 'assets/';
const cache = new Map();
let crop = null, scratch = null;

export async function initLoader() {
  if (!crop) crop = await (await fetch(ROOT + 'crop.json')).json();
  return crop;
}

function canvasFor(w, h) {
  if (!scratch || scratch.width < w || scratch.height < h) {
    scratch = (typeof OffscreenCanvas !== 'undefined')
      ? new OffscreenCanvas(Math.max(w, 1), Math.max(h, 1))
      : Object.assign(document.createElement('canvas'), { width: w, height: h });
  }
  return scratch;
}

/** rel は crop.json のキー(例 '01_face/face_egg.webp') */
export async function load(rel) {
  const hit = cache.get(rel);
  if (hit !== undefined) return hit;
  const box = crop[rel];
  if (!box) { cache.set(rel, null); return null; }
  const [x0, y0, w, h] = box;
  const bmp = await createImageBitmap(await (await fetch(ROOT + rel)).blob());
  const cv = canvasFor(w, h);
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(bmp, 0, 0);
  bmp.close?.();
  const src = ctx.getImageData(0, 0, w, h).data;
  // ImageData の buffer は offset が 0 とは限らない。要素単位でコピーする。
  const rec = { data: Uint8Array.from(src), x0, y0, w, h };
  cache.set(rel, rec);
  return rec;
}

export function preload(list) { return Promise.all(list.map(load)); }
export function cacheCount() { return cache.size; }
export function cacheBytes() {
  let n = 0;
  for (const v of cache.values()) if (v) n += v.data.byteLength;
  return n;
}
