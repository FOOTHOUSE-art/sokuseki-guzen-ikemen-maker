/* 輪郭に合わせた横方向の変形。
 * 髪とひげは egg 基準で抽出されているので、選ばれた輪郭へ写像する。
 * 幅は耳を除いて測り61行で平滑化する。耳の張り出しが段差になり、
 * そのまま比を取ると耳のまわりだけ歪む(実測: y420→440 で 413→465px の段差)。 */
import { load } from "./loader.js?v=09157";
const W = 1024, H = 1024, SMOOTH = 61, CLAMP = [0.85, 1.15];
const profiles = new Map();

function edgeProfile(faceLayer, earLayer) {
  const lo = new Float64Array(H).fill(NaN), hi = new Float64Array(H).fill(NaN);
  const inFace = (x, y) => {
    if (!faceLayer) return false;
    const { data, x0, y0, w, h } = faceLayer;
    if (x < x0 || x >= x0 + w || y < y0 || y >= y0 + h) return false;
    return data[((y - y0) * w + (x - x0)) * 4 + 3] > 128;
  };
  const inEar = (x, y) => {
    if (!earLayer) return false;
    const { data, x0, y0, w, h } = earLayer;
    if (x < x0 || x >= x0 + w || y < y0 || y >= y0 + h) return false;
    return data[((y - y0) * w + (x - x0)) * 4 + 3] > 60;
  };
  for (let y = 0; y < H; y++) {
    let a = -1, b = -1;
    for (let x = 0; x < W; x++) if (inFace(x, y) && !inEar(x, y)) { if (a < 0) a = x; b = x; }
    if (a >= 0) { lo[y] = a; hi[y] = b; }
  }
  // 欠けた行を線形補間
  const idx = []; for (let y = 0; y < H; y++) if (!Number.isNaN(lo[y])) idx.push(y);
  if (!idx.length) return null;
  const fill = arr => {
    for (let y = 0; y < idx[0]; y++) arr[y] = arr[idx[0]];
    for (let y = idx[idx.length - 1] + 1; y < H; y++) arr[y] = arr[idx[idx.length - 1]];
    for (let k = 0; k + 1 < idx.length; k++) {
      const a = idx[k], b = idx[k + 1];
      for (let y = a + 1; y < b; y++) arr[y] = arr[a] + (arr[b] - arr[a]) * (y - a) / (b - a);
    }
  };
  fill(lo); fill(hi);
  const sm = arr => {
    const out = new Float64Array(H), r = (SMOOTH - 1) / 2;
    for (let y = 0; y < H; y++) {
      let s = 0, n = 0;
      for (let k = Math.max(0, y - r); k <= Math.min(H - 1, y + r); k++) { s += arr[k]; n++; }
      out[y] = s / n;
    }
    return out;
  };
  return { lo: sm(lo), hi: sm(hi) };
}

async function getProfile(outline) {
  if (profiles.has(outline)) return profiles.get(outline);
  const [fe, ee, fo, eo] = await Promise.all([
    load('01_face/face_egg.webp'), load('12_ear/ear_egg.webp'),
    load(`01_face/face_${outline}.webp`), load(`12_ear/ear_${outline}.webp`)]);
  const src = edgeProfile(fe, ee), dst = edgeProfile(fo, eo);
  if (!src || !dst) { profiles.set(outline, null); return null; }
  const sc = new Float64Array(H), sctr = new Float64Array(H), dctr = new Float64Array(H);
  for (let y = 0; y < H; y++) {
    const sw = Math.max((src.hi[y] - src.lo[y]) / 2, 1), dw = Math.max((dst.hi[y] - dst.lo[y]) / 2, 1);
    sc[y] = Math.min(CLAMP[1], Math.max(CLAMP[0], sw / dw));
    sctr[y] = (src.lo[y] + src.hi[y]) / 2;
    dctr[y] = (dst.lo[y] + dst.hi[y]) / 2;
  }
  const p = { sc, sctr, dctr };
  profiles.set(outline, p);
  return p;
}

/** 切り抜きレイヤーを変形する。出力も切り抜きレイヤー。 */
export async function warpToOutline(layer, outline) {
  if (!layer) return layer;
  const p = await getProfile(outline);
  if (!p) return layer;
  // 変形後にはみ出す分を見込んで左右に余白を取る
  const pad = 40;
  const nx0 = Math.max(0, layer.x0 - pad), nx1 = Math.min(W, layer.x0 + layer.w + pad);
  const nw = nx1 - nx0, nh = layer.h, ny0 = layer.y0;
  const out = new Uint8Array(nw * nh * 4);
  const { data, x0, y0, w, h } = layer;
  for (let y = 0; y < nh; y++) {
    const gy = ny0 + y;
    const s = p.sc[gy], sc0 = p.sctr[gy], dc0 = p.dctr[gy];
    for (let x = 0; x < nw; x++) {
      const gx = nx0 + x;
      const sx = sc0 + (gx - dc0) * s;
      const lx = sx - x0, ly = gy - y0;
      if (lx < 0 || lx >= w - 1 || ly < 0 || ly >= h) continue;
      const i0 = Math.floor(lx), f = lx - i0;
      const a = ((ly * w) + i0) * 4, b = a + 4, o = (y * nw + x) * 4;
      for (let c = 0; c < 4; c++) out[o + c] = data[a + c] * (1 - f) + data[b + c] * f;
    }
  }
  return { data: out, x0: nx0, y0: ny0, w: nw, h: nh };
}
