/* 即席イケメンメーカー — 合成エンジン v2(切り抜き保持版)
 *
 * v1 は素材を 1024x1024 の生RGBA で持っていた。1枚 4MB なので、
 * 実測で 327枚キャッシュした時点で 1.28 GB。スマホでは落ちる。
 * bbox 面積は平均6.9%・中央値4.2%しかないので、切り抜いて持てば
 * 全417点でも 0.11 GB に収まる(15分の1)。
 *
 * Layer = { data: Uint8Array(w*h*4), x0, y0, w, h }
 * 全面が空の素材は null。
 *
 * 乗算式は Canvas 標準の multiply とは違う:
 *   out = base * (1 - a + a * rgb / 232)
 */

export const NEUTRAL = 232;
export const BASE_SKIN = [240, 205, 178];
export const W = 1024, H = 1024;
const NPX = W * H;

export function newBuffer(rgb) {  // 旧API。Compositor を使うこと
  const b = new Float64Array(NPX * 4);
  for (let i = 0; i < NPX; i++) {
    const o = i * 4;
    b[o] = rgb[0]; b[o + 1] = rgb[1]; b[o + 2] = rgb[2]; b[o + 3] = 255;
  }
  return b;
}

/** Uint8ClampedArray は四捨五入する。参照実装(numpy astype)は切り捨てなので
 *  ここで明示的に floor する。直接代入すると 4.7% の画素が 1 ずれる。 */
export function toU8(buf) {
  const out = new Uint8ClampedArray(buf.length);
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i];
    out[i] = v <= 0 ? 0 : v >= 255 ? 255 : Math.floor(v);
  }
  return out;
}

/** 全面 RGBA から不透明部分だけを切り出す */
export function crop(full) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    const r = y * W;
    for (let x = 0; x < W; x++) {
      if (full[(r + x) * 4 + 3] !== 0) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const src = ((y0 + y) * W + x0) * 4;
    data.set(full.subarray(src, src + w * 4), y * w * 4);
  }
  return { data, x0, y0, w, h };
}

/* base は RGB 3チャンネル。背景が不透明なので出力αは常に255になり、
 * αチャンネルを持つ意味がない。25%のメモリ帯域を節約できる。 */
export function over(base, L) {
  // 被覆率の更新。乗算は下地を変えないので over だけが対象。
  if (base.cov && L) {
    const cv = base.cov, { data: cd, x0: cx0, y0: cy0, w: cw, h: ch } = L;
    for (let y = 0; y < ch; y++) {
      const gy = cy0 + y;
      if (gy < 0 || gy >= H) continue;
      let si = (y * cw) * 4 + 3, di = gy * W + cx0;
      for (let x = 0; x < cw; x++, si += 4, di++) {
        const gx = cx0 + x;
        if (gx < 0 || gx >= W) continue;
        const a = cd[si] / 255;
        if (a > 0) cv[di] = cv[di] + a * (1 - cv[di]);
      }
    }
  }
  if (!L) return base;
  const { data, x0, y0, w, h } = L;
  for (let y = 0; y < h; y++) {
    let s = y * w * 4;
    let d = ((y0 + y) * W + x0) * 3;
    for (let x = 0; x < w; x++, s += 4, d += 3) {
      const a8 = data[s + 3];
      if (a8 === 0) continue;
      if (a8 === 255) {
        base[d] = data[s]; base[d + 1] = data[s + 1]; base[d + 2] = data[s + 2];
        continue;
      }
      const a = a8 / 255, ia = 1 - a;
      base[d] = base[d] * ia + data[s] * a;
      base[d + 1] = base[d + 1] * ia + data[s + 1] * a;
      base[d + 2] = base[d + 2] * ia + data[s + 2] * a;
    }
  }
  return base;
}

export function multiply(base, L, k = 1.0) {
  if (!L) return base;
  const { data, x0, y0, w, h } = L;
  for (let y = 0; y < h; y++) {
    let s = y * w * 4;
    let d = ((y0 + y) * W + x0) * 3;
    for (let x = 0; x < w; x++, s += 4, d += 3) {
      const a8 = data[s + 3];
      if (a8 === 0) continue;
      let a = a8 / 255 * k;
      if (a > 1) a = 1;
      const ia = 1 - a;
      for (let c = 0; c < 3; c++) {
        const v = base[d + c] * ia + base[d + c] * (data[s + c] / NEUTRAL) * a;
        base[d + c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
  }
  return base;
}

/* ---------- 着色。切り抜き分だけを走査するので v1 より大幅に軽い ---------- */

/* 画素ごとのコールバックは V8 が展開しきれず、実測で 3倍以上遅くなった
 * (切り抜き23レイヤーで 30ms → 95ms)。各関数でループを直接書く。 */

export function tintSkin(L, target) {
  if (!L) return null;
  const r = target[0] / BASE_SKIN[0], g = target[1] / BASE_SKIN[1], b = target[2] / BASE_SKIN[2];
  const s = L.data, n = s.length, o = new Uint8Array(n);
  for (let i = 0; i < n; i += 4) {
    const a = s[i + 3];
    if (a === 0) continue;
    let v;
    v = s[i] * r;     o[i]     = v > 255 ? 255 : v;
    v = s[i + 1] * g; o[i + 1] = v > 255 ? 255 : v;
    v = s[i + 2] * b; o[i + 2] = v > 255 ? 255 : v;
    o[i + 3] = a;
  }
  return { data: o, x0: L.x0, y0: L.y0, w: L.w, h: L.h };
}

export const HAIR_PALETTE = {
  kuro: [[14, 13, 15], [132, 124, 124], 0.95],
  ankasshoku: [[32, 26, 22], [182, 152, 122], 0.78],
  kuriiro: [[52, 36, 26], [206, 158, 112], 0.72],
  akaruicha: [[86, 60, 40], [228, 186, 136], 0.65],
  beju: [[124, 102, 72], [244, 224, 192], 0.60],
};

export function colorizeHair(L, name) {
  if (!L) return null;
  const [sh, hi, gm] = HAIR_PALETTE[name];
  const d0 = hi[0] - sh[0], d1 = hi[1] - sh[1], d2 = hi[2] - sh[2];
  // 輝度は 0..255 の 256 通りしかない。1画素ごとに pow を呼ばず表を引く。
  const lut0 = new Float64Array(256), lut1 = new Float64Array(256), lut2 = new Float64Array(256);
  for (let v = 0; v < 256; v++) {
    let t = (v - 40) / 180; t = t < 0 ? 0 : t > 1 ? 1 : t; t = Math.pow(t, gm);
    lut0[v] = sh[0] + d0 * t; lut1[v] = sh[1] + d1 * t; lut2[v] = sh[2] + d2 * t;
  }
  const s = L.data, n = s.length, o = new Uint8Array(n);
  for (let i = 0; i < n; i += 4) {
    const a = s[i + 3];
    if (a === 0) continue;
    const lum = (s[i] + s[i + 1] + s[i + 2]) / 3;
    const k = lum | 0, f = lum - k;
    // 平均は .333 刻みになるので線形補間して丸め誤差を作らない
    const j = k < 255 ? k + 1 : 255;
    o[i]     = lut0[k] + (lut0[j] - lut0[k]) * f;
    o[i + 1] = lut1[k] + (lut1[j] - lut1[k]) * f;
    o[i + 2] = lut2[k] + (lut2[j] - lut2[k]) * f;
    o[i + 3] = a;
  }
  return { data: o, x0: L.x0, y0: L.y0, w: L.w, h: L.h };
}

export const GLASS_PALETTE = {
  black: [30, 28, 28], brown: [74, 50, 34], silver: [126, 130, 136],
  gold: [150, 124, 66], navy: [38, 46, 78],
};

/** フレームとレンズは「アルファ」で分ける。輝度で分けるとフレームの
 *  ハイライト(L>=170)が白く抜けて斑点になる。 */
export function colorizeGlass(L, name) {
  if (!L) return null;
  const b = GLASS_PALETTE[name];
  const s = L.data, n = s.length, o = new Uint8Array(n);
  const g0 = b[0] * 2.3 + 35 - b[0], g1 = b[1] * 2.3 + 35 - b[1], g2 = b[2] * 2.3 + 35 - b[2];
  for (let i = 0; i < n; i += 4) {
    const a = s[i + 3];
    if (a === 0) continue;
    if (a <= 127.5) { o[i] = o[i + 1] = o[i + 2] = 236; o[i + 3] = a; continue; }
    const lum = (s[i] + s[i + 1] + s[i + 2]) / 3;
    let t = (lum - 30) / 180; t = t < 0 ? 0 : t > 1 ? 1 : t;
    // Uint8Array への代入は 256 で折り返す。silver は最大325、gold は380 に達するので
    // 明示的に丸めないと虹色のノイズになる。
    let v;
    v = b[0] + g0 * t; o[i]     = v > 255 ? 255 : v;
    v = b[1] + g1 * t; o[i + 1] = v > 255 ? 255 : v;
    v = b[2] + g2 * t; o[i + 2] = v > 255 ? 255 : v;
    o[i + 3] = a;
  }
  return { data: o, x0: L.x0, y0: L.y0, w: L.w, h: L.h };
}

export function bytesOf(L) { return L ? L.data.byteLength : 0; }

/* ---------- 着色結果の記憶化 ----------
 * 着色は1回の合成で 28ms 前後かかる(切り抜き23レイヤー中5枚)。
 * 肌トーンは4種、髪色5種、眼鏡色5種しかないので、同じ組み合わせは使い回せる。
 * 上限を超えたら古いものから捨てる(Map は挿入順を保つ)。 */
const tintCache = new Map();
let tintBytes = 0;
export let TINT_CACHE_LIMIT = 96 * 1024 * 1024;   // 96 MB

export function colorized(key, L, kind, arg) {
  const hit = tintCache.get(key);
  if (hit) { tintCache.delete(key); tintCache.set(key, hit); return hit; }
  const out = kind === 'skin' ? tintSkin(L, arg)
            : kind === 'hair' ? colorizeHair(L, arg)
            : kind === 'glass' ? colorizeGlass(L, arg) : L;
  tintCache.set(key, out);
  tintBytes += bytesOf(out);
  while (tintBytes > TINT_CACHE_LIMIT && tintCache.size > 1) {
    const k = tintCache.keys().next().value;
    tintBytes -= bytesOf(tintCache.get(k));
    tintCache.delete(k);
  }
  return out;
}
export function tintCacheStats() { return { entries: tintCache.size, bytes: tintBytes }; }

/* ---------- 合成器(バッファ使い回し) ----------
 * 実測で newBuffer が 43.6ms、toU8 が 14.6ms を占めていた。どちらも
 * 4M要素の確保が原因。1回だけ確保して使い回し、背景は memcpy で戻す。 */
export class Compositor {
  constructor() {
    this.buf = new Float64Array(NPX * 3);      // RGBのみ
    this.tpl = new Float64Array(NPX * 3);
    // Uint8ClampedArray への代入は毎回クランプ判定が走る。同じ ArrayBuffer に
    // Uint8Array のビューを重ね、書き込みはそちら経由で行う。
    this.ab = new ArrayBuffer(NPX * 4);
    this.outFast = new Uint8Array(this.ab);
    this.out = new Uint8ClampedArray(this.ab);  // ImageData 用
    this.tplKey = null;
    // 被覆率。背景を後から差し替えられるように、人物が覆った割合を持つ
    this.cov = new Float32Array(NPX);
  }
  begin(rgb) {
    const key = rgb.join(',');
    if (key !== this.tplKey) {
      const t = this.tpl;
      for (let i = 0; i < NPX; i++) {
        const o = i * 3;
        t[o] = rgb[0]; t[o + 1] = rgb[1]; t[o + 2] = rgb[2];
      }
      this.tplKey = key;
    }
    this.buf.set(this.tpl);
    this.cov.fill(0);
    this.buf.cov = this.cov;
    return this.buf;
  }
  /** 出力。α は人物の被覆率。半透明の縁では下地(begin で塗った色)の寄与を
   * 差し引いてから返すので、別の背景に重ねても縁がにじまない。 */
  finish() {
    const b = this.buf, o = this.outFast, cov = this.cov, bg = this.tpl;
    // 値は 0..255 に収まっているので Math.floor より | 0 の方が速い
    for (let i = 0, j = 0, p = 0; i < b.length; i += 3, j += 4, p++) {
      const c = cov[p];
      let r, g2, bl;
      if (c >= 0.999) { r = b[i]; g2 = b[i + 1]; bl = b[i + 2]; }
      else if (c <= 0.0001) { r = bg[i]; g2 = bg[i + 1]; bl = bg[i + 2]; }
      else {
        const inv = 1 / c, k = (1 - c);
        r = (b[i] - bg[i] * k) * inv;
        g2 = (b[i + 1] - bg[i + 1] * k) * inv;
        bl = (b[i + 2] - bg[i + 2] * k) * inv;
      }
      let v;
      v = r;  o[j]     = v <= 0 ? 0 : v >= 255 ? 255 : v | 0;
      v = g2; o[j + 1] = v <= 0 ? 0 : v >= 255 ? 255 : v | 0;
      v = bl; o[j + 2] = v <= 0 ? 0 : v >= 255 ? 255 : v | 0;
      const cv = c * 255;
      o[j + 3] = cv <= 0 ? 0 : cv >= 255 ? 255 : cv | 0;
    }
    return o;
  }
}


/** 白目は乗算で作られているため肌トーンに追従してしまう。
 * 目shadeを乗算した直後に、マスク内の画素を肌トーンの比率で割り戻す。
 * マスクは 15_sclera に目の種類ごとに用意してある。 */
export function untintSclera(base, mask, tone) {
  if (!mask) return base;
  const r = tone[0] / BASE_SKIN[0], g = tone[1] / BASE_SKIN[1], b = tone[2] / BASE_SKIN[2];
  const { data, x0, y0, w, h } = mask;
  for (let y = 0; y < h; y++) {
    let s = y * w * 4;
    let d = ((y0 + y) * W + x0) * 3;
    for (let x = 0; x < w; x++, s += 4, d += 3) {
      if (data[s + 3] === 0) continue;
      let v;
      v = base[d] / r;     base[d]     = v > 255 ? 255 : v;
      v = base[d + 1] / g; base[d + 1] = v > 255 ? 255 : v;
      v = base[d + 2] / b; base[d + 2] = v > 255 ? 255 : v;
    }
  }
  return base;
}

/** レイヤーのαを別レイヤーのαで削る。ひげを口と輪郭で切るのに使う。 */
export function maskBy(layer, by, invert = true) {
  if (!layer) return null;
  const out = new Uint8Array(layer.data);
  const { x0, y0, w, h } = layer;
  for (let y = 0; y < h; y++) {
    const gy = y0 + y;
    for (let x = 0; x < w; x++) {
      const gx = x0 + x;
      let a = 0;
      if (by && gx >= by.x0 && gx < by.x0 + by.w && gy >= by.y0 && gy < by.y0 + by.h)
        a = by.data[((gy - by.y0) * by.w + (gx - by.x0)) * 4 + 3];
      const i = (y * w + x) * 4 + 3;
      out[i] = invert ? (out[i] * (255 - a) / 255) : (out[i] * a / 255);
    }
  }
  return { data: out, x0, y0, w, h };
}

/** αを一律に倍率で変える。ひげの濃さに使う。 */
export function scaleAlpha(layer, k) {
  if (!layer || k === 1) return layer;
  const out = new Uint8Array(layer.data);
  for (let i = 3; i < out.length; i += 4) out[i] = Math.min(255, out[i] * k);
  return { data: out, x0: layer.x0, y0: layer.y0, w: layer.w, h: layer.h };
}

/* ---------- 変形 ---------- */

/** 平行移動。切り抜きレイヤーなので原点を動かすだけで済む。 */
export function translate(layer, dx, dy) {
  if (!layer || (dx === 0 && dy === 0)) return layer;
  return { data: layer.data, x0: layer.x0 + Math.round(dx), y0: layer.y0 + Math.round(dy),
           w: layer.w, h: layer.h };
}

/** (cx,cy) を中心に k 倍する。双一次補間。 */
export function scaleAbout(layer, k, cx, cy) {
  if (!layer || k === 1) return layer;
  const { data, x0, y0, w, h } = layer;
  const nw = Math.max(1, Math.round(w * k)), nh = Math.max(1, Math.round(h * k));
  const nx0 = Math.round(cx + (x0 - cx) * k), ny0 = Math.round(cy + (y0 - cy) * k);
  const out = new Uint8Array(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    const sy = y / k;
    const j0 = Math.min(h - 1, Math.floor(sy)), j1 = Math.min(h - 1, j0 + 1), fy = sy - j0;
    for (let x = 0; x < nw; x++) {
      const sx = x / k;
      const i0 = Math.min(w - 1, Math.floor(sx)), i1 = Math.min(w - 1, i0 + 1), fx = sx - i0;
      const a = (j0 * w + i0) * 4, b = (j0 * w + i1) * 4;
      const cc = (j1 * w + i0) * 4, d = (j1 * w + i1) * 4;
      const o = (y * nw + x) * 4;
      for (let ch = 0; ch < 4; ch++) {
        const top = data[a + ch] * (1 - fx) + data[b + ch] * fx;
        const bot = data[cc + ch] * (1 - fx) + data[d + ch] * fx;
        out[o + ch] = top * (1 - fy) + bot * fy;
      }
    }
  }
  return { data: out, x0: nx0, y0: ny0, w: nw, h: nh };
}

/** 手続き生成のスタンプ。ニキビとほくろを任意の位置に置く。
 * 乗算レイヤーとして作るので、既存の 13_skin と同じ流儀で合成できる。 */
export function stamp(kind, cx, cy, size = 1, seed = 0) {
  if (kind === 'acnescar') return acneScar(cx, cy, size, seed);
  if (kind === 'blotch') return blotch(cx, cy, size, seed);
  let t = (seed | 0) || 1;
  const rnd = () => { t ^= t << 13; t ^= t >>> 17; t ^= t << 5; return ((t >>> 0) % 10000) / 10000; };
  const isMole = kind === 'mole';
  const flatRed = kind === 'pimpleB';   // 赤みだけのニキビ
  /* 参照画像の実測(地肌との差):
   *   ニキビ 芯 -16/-19/-16、頂点はわずかに明るい。最大面積198px → 半径約8
   *   ほくろ   -21/-24/-23、周囲にわずかに明るい輪。最大面積250px → 半径約9 */
  const R = Math.ceil((isMole ? 7 : 15) * size * 1.8);
  const w = R * 2 + 1, h = w;
  const x0 = Math.round(cx) - R, y0 = Math.round(cy) - R;
  const out = new Uint8Array(w * h * 4);
  // ほくろは 2.5〜5.5px。顔に対して大きすぎると貼り付けたように見える。
  // ほくろは小さく濃く。1.8〜3.8px。
  const rr = (isMole ? 1.8 + rnd() * 2.0 : 7.5 * (0.75 + rnd() * 0.6)) * size;
  const el = 0.72 + rnd() * 0.5, rot = rnd() * Math.PI;
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const irr = 0.16 + rnd() * (isMole ? 0.26 : 0.14);      // 輪郭のゆらぎ
  const ph = rnd() * 6.283;
  // ほくろは大きさ・濃さ・色味の幅を広く取る。同じ形が並ぶと貼り付けたように見える。
  const depth = isMole ? 0.80 + rnd() * 0.20 : 0.6 + rnd() * 0.4;
  const moleWarm = rnd();                       // 0=灰茶 1=赤茶
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - R, dy = y - R;
      const u = (dx * ca + dy * sa), v = (-dx * sa + dy * ca) / el;
      const ang = Math.atan2(v, u);
      const rEff = rr * (1 + irr * Math.sin(ang * 3 + ph) * 0.5 + irr * Math.sin(ang * 5 - ph) * 0.3);
      const d = Math.hypot(u, v) / Math.max(rEff, 0.5);
      const i = (y * w + x) * 4;
      if (d < 1) {
        const core = Math.pow(1 - d, isMole ? 0.55 : 0.9);
        if (isMole) {
          // 濃い茶。中心ほど濃い。色味は灰茶〜赤茶の間で振れる
          // 濃い焦茶。乗算なので値が小さいほど濃くなる
          out[i] = 150 + moleWarm * 22;
          out[i + 1] = 126 - moleWarm * 10;
          out[i + 2] = 112 - moleWarm * 16;
          out[i + 3] = Math.round(core * 250 * depth);
        } else if (flatRed) {
          // ニキビB。盛り上がらず赤みだけ
          out[i] = 246; out[i + 1] = 176; out[i + 2] = 170;
          out[i + 3] = Math.round(core * 130 * depth);
        } else {
          // ニキビA。赤い丘。頂点は白っぽく光る
          const tip = d < 0.35 ? (0.35 - d) / 0.35 : 0;
          out[i] = 246 - tip * 8; out[i + 1] = 186 + tip * 40; out[i + 2] = 178 + tip * 44;
          out[i + 3] = Math.round((core * 150 + tip * 60) * depth);
        }
      } else if (d < 1.55) {
        // 周囲の輪。ほくろは明るく、ニキビは赤みが広がる
        const k = Math.pow(1 - (d - 1) / 0.55, 2);
        if (isMole) { out[i] = 246; out[i + 1] = 240; out[i + 2] = 234; out[i + 3] = Math.round(k * 46); }
        else { out[i] = 244; out[i + 1] = 198; out[i + 2] = 190;
               out[i + 3] = Math.round(k * (flatRed ? 84 : 62) * depth); }
      } else out[i + 3] = 0;
    }
  }
  return { data: out, x0, y0, w, h };
}


/** レイヤーを x=512 で左右に割る。耳のように左右対に配置されたものを
 * 別々に動かすのに使う。 */
export function splitHalves(layer, cx = 512) {
  if (!layer) return { L: null, R: null };
  const { data, x0, y0, w, h } = layer;
  const make = (from, to) => {
    const nw = to - from;
    if (nw <= 0) return null;
    const out = new Uint8Array(nw * h * 4);
    for (let y = 0; y < h; y++)
      out.set(data.subarray((y * w + from) * 4, (y * w + to) * 4), y * nw * 4);
    return { data: out, x0: x0 + from, y0, w: nw, h };
  };
  const cut = Math.max(0, Math.min(w, Math.round(cx - x0)));
  return { R: make(0, cut), L: make(cut, w) };   // R は画像の左側
}

/** ブラシ。乗算レイヤーとして描く。中立値232より明るければ明るくなる。 */
/* 参照画像の実測から比を出して乗算値(中立232)に換算している。
 * 例: 青ひげの点は地肌より -17/-19/-21 → 比 0.91/0.90/0.90 → 232倍で (211,209,208) */
const BRUSH = {
  shine:   { rgb: [255, 252, 246], dot: 0 },
  // 白い艶は乗算では表現できない(上限が 255/232 = 1.099 倍)。over で重ねる。
  gloss:   { rgb: [255, 255, 255], dot: 0, over: true },
  shadow:  { rgb: [200, 186, 176], dot: 0 },
  // 青ひげ。淡い面に濃い点を重ねる二層構成
  // 面は青み(R-Bが62→33に下がる)、点は濃い青灰。二層で自然な青ひげにする
  stubble: { rgb: [210, 218, 240], dot: 1.85, veil: 0.55, hard: [168, 172, 196], per: 44 },
  // 毛穴。面は塗らず、濃い点だけ
  // 毛穴。点は最小(半径1.1px)、色は肌の極暗色。肌(240,205,178)が(124,80,57)になる
  pore:    { rgb: [150, 118, 100], dot: 1.1, veil: 0.0, hard: [120, 90, 74], per: 13 },
  blush:   { rgb: [236, 176, 168], dot: 0 },
};
export const BRUSH_KINDS = Object.keys(BRUSH);
export function brush(kind, cx, cy, radius = 40, strength = 0.5, seed = 1) {
  const spec = BRUSH[kind] || BRUSH.shadow;
  const r = Math.max(3, Math.round(radius));
  const w = r * 2 + 1, h = w;
  const x0 = Math.round(cx) - r, y0 = Math.round(cy) - r;
  const out = new Uint8Array(w * h * 4);
  let t = (seed | 0) || 1;
  const rnd = () => { t ^= t << 13; t ^= t >>> 17; t ^= t << 5; return ((t >>> 0) % 10000) / 10000; };
  const amax = Math.round(255 * Math.min(1, Math.max(0, strength)));
  const cov = new Float32Array(w * h);
  if (spec.dot > 0) {
    // 点描。青ひげは半径2.0px、毛穴は2.4px。参照画像の実測値。
    const n = Math.max(1, Math.round(Math.PI * r * r / (spec.per || 100)));
    for (let k = 0; k < n; k++) {
      const ang = rnd() * Math.PI * 2, rad = Math.sqrt(rnd()) * r;
      const px = r + Math.cos(ang) * rad, py = r + Math.sin(ang) * rad;
      const fall = Math.max(0, 1 - rad / r);
      const pr = spec.dot * (0.7 + rnd() * 0.7);
      const dep = (0.55 + rnd() * 0.45) * fall;
      const span = Math.ceil(pr * 2);
      for (let y = Math.max(0, (py - span) | 0); y < Math.min(h, py + span); y++)
        for (let x = Math.max(0, (px - span) | 0); x < Math.min(w, px + span); x++) {
          const d = Math.hypot(x - px, y - py) / pr;
          if (d >= 1) continue;
          const i2 = y * w + x;
          const v = dep * (1 - d * d);
          if (v > cov[i2]) cov[i2] = v;
        }
    }
  } else {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const d = Math.hypot(x - r, y - r) / r;
        cov[y * w + x] = d >= 1 ? 0 : (1 - d) * (1 - d);
      }
  }
  const veil = spec.veil || 0;
  const hard = spec.hard || spec.rgb;
  for (let i = 0, p = 0; i < cov.length; i++, p += 4) {
    const x = i % w, y = (i / w) | 0;
    const d = Math.hypot(x - r, y - r) / r;
    const base = veil > 0 && d < 1 ? (1 - d) * (1 - d) * veil : 0;
    const dot = cov[i];
    // 点の方が濃い。面(veil)は下地としてうっすら敷く
    const a = Math.max(base, dot);
    const mix = a > 0 ? dot / a : 0;
    out[p]     = spec.rgb[0] + (hard[0] - spec.rgb[0]) * mix;
    out[p + 1] = spec.rgb[1] + (hard[1] - spec.rgb[1]) * mix;
    out[p + 2] = spec.rgb[2] + (hard[2] - spec.rgb[2]) * mix;
    out[p + 3] = Math.round(a * amax);
  }
  return { data: out, x0, y0, w, h, over: !!spec.over };
}

export function shearEye(layer, o, cx, cy, halfW, side) {
  if (!layer) return layer;
  const { lidDrop = 0, lidRise = 0, innerY = 0, outerY = 0 } = o || {};
  if (!lidDrop && !lidRise && !innerY && !outerY) return layer;
  const { data, x0, y0, w, h } = layer;
  const pad = Math.ceil(Math.max(Math.abs(lidDrop), Math.abs(lidRise), Math.abs(innerY), Math.abs(outerY))) + 2;
  const nh = h + pad * 2, ny0 = y0 - pad;
  const out = new Uint8Array(w * nh * 4);
  const inSign = side === 'R' ? 1 : -1;      // 目頭の向き(中央側)
  for (let x = 0; x < w; x++) {
    const gx = x0 + x;
    const t = Math.max(-1, Math.min(1, (gx - cx) / Math.max(halfW, 1)));
    const wIn = Math.max(0, t * inSign);     // 中央側で1
    const wOut = Math.max(0, -t * inSign);   // 外側で1
    const dyCol = innerY * wIn * wIn + outerY * wOut * wOut;
    for (let y = 0; y < nh; y++) {
      const gy = ny0 + y;
      // 上まぶたは虹彩の中心より上、下まぶたは下だけ効かせる
      const u = Math.max(0, Math.min(1, (cy - gy) / 26));
      const dn = Math.max(0, Math.min(1, (gy - cy) / 26));
      const j = (gy - dyCol - lidDrop * u * u + lidRise * dn * dn) - y0;
      if (j < 0 || j > h - 1) continue;
      const j0 = Math.floor(j), j1 = Math.min(h - 1, j0 + 1), fy = j - j0;
      const a = (j0 * w + x) * 4, b = (j1 * w + x) * 4, p = (y * w + x) * 4;
      for (let ch = 0; ch < 4; ch++) out[p + ch] = data[a + ch] * (1 - fy) + data[b + ch] * fy;
    }
  }
  return { data: out, x0, y0: ny0, w, h: nh };
}


/** ニキビ跡。浅いくぼみが集まった見た目にする。
 * 一つひとつは「縁がわずかに明るく、中が赤茶に沈む」形。 */
function acneScar(cx, cy, size = 1, seed = 1) {
  let t = (seed | 0) || 1;
  const rnd = () => { t ^= t << 13; t ^= t >>> 17; t ^= t << 5; return ((t >>> 0) % 10000) / 10000; };
  const R = Math.round(26 * size);
  const w = R * 2 + 1, h = w;
  const x0 = Math.round(cx) - R, y0 = Math.round(cy) - R;
  const acc = new Float32Array(w * h);        // 負=沈む 正=浮く
  const n = 4 + Math.floor(rnd() * 5);
  for (let k = 0; k < n; k++) {
    const ang = rnd() * Math.PI * 2, rad = Math.pow(rnd(), 0.7) * R * 0.72;
    const px = R + Math.cos(ang) * rad, py = R + Math.sin(ang) * rad;
    const pr = (2.2 + rnd() * 4.2) * size;    // くぼみの半径
    const depth = 0.35 + rnd() * 0.65;
    const el = 0.6 + rnd() * 0.8, rot = rnd() * Math.PI;
    const ca = Math.cos(rot), sa = Math.sin(rot);
    const span = Math.ceil(pr * 2.6);
    for (let y = Math.max(0, py - span | 0); y < Math.min(h, py + span); y++) {
      for (let x = Math.max(0, px - span | 0); x < Math.min(w, px + span); x++) {
        const dx = x - px, dy = y - py;
        const u = (dx * ca + dy * sa) / pr, v = (-dx * sa + dy * ca) / (pr * el);
        const d = Math.hypot(u, v);
        if (d >= 2.2) continue;
        const i = y * w + x;
        if (d < 1) acc[i] -= depth * (1 - d) * (1 - d);            // 中は沈む
        else acc[i] += depth * 0.30 * Math.pow(1 - (d - 1) / 1.2, 2); // 縁はわずかに浮く
      }
    }
  }
  const out = new Uint8Array(w * h * 4);
  for (let i = 0, p = 0; i < acc.length; i++, p += 4) {
    const v = acc[i];
    if (Math.abs(v) < 0.02) { out[p + 3] = 0; continue; }
    if (v < 0) {                       // 沈み = 赤茶に暗く
      out[p] = 214; out[p + 1] = 176; out[p + 2] = 166;
      out[p + 3] = Math.min(150, Math.round(-v * 165));
    } else {                           // 縁 = わずかに明るく
      out[p] = 244; out[p + 1] = 238; out[p + 2] = 232;
      out[p + 3] = Math.min(70, Math.round(v * 120));
    }
  }
  return { data: out, x0, y0, w, h };
}

/** ある高さより下だけを縦に伸ばす。あごの高さの調整に使う。
 * splitY から下へ ramp px かけて効果を1にし、それ以降は一定の伸び。 */
export function stretchBelow(layer, splitY, dy, ramp = 90) {
  if (!layer || !dy) return layer;
  const { data, x0, y0, w, h } = layer;
  const pad = Math.ceil(Math.abs(dy)) + 2;
  const nh = h + pad * 2, ny0 = y0 - pad;
  const out = new Uint8Array(w * nh * 4);
  for (let y = 0; y < nh; y++) {
    const gy = ny0 + y;
    const t = Math.max(0, Math.min(1, (gy - splitY) / ramp));
    const s = t * t * (3 - 2 * t);            // なめらかに立ち上げる
    const j = gy - dy * s - y0;
    if (j < 0 || j > h - 1) continue;
    const j0 = Math.floor(j), j1 = Math.min(h - 1, j0 + 1), fy = j - j0;
    for (let x = 0; x < w; x++) {
      const a = (j0 * w + x) * 4, b = (j1 * w + x) * 4, p = (y * w + x) * 4;
      for (let ch = 0; ch < 4; ch++) out[p + ch] = data[a + ch] * (1 - fy) + data[b + ch] * fy;
    }
  }
  return { data: out, x0, y0: ny0, w, h: nh };
}

/* ---- 以下は brush の書き換え時に誤って削除したもの。復元。 ---- */

/** 縦方向だけを ky 倍する。keepR を与えると中心から±keepR の帯は倍率1のまま残し、
 * そこから滑らかに ky へ移す。虹彩の高さを保ったまま目の開きだけ変えられる。 */
export function warpY(layer, ky, cy, keepR = 0) {
  if (!layer || ky === 1) return layer;
  const { data, x0, y0, w, h } = layer;
  const nh = Math.ceil(h * Math.max(ky, 1)) + 4;
  const ny0 = Math.round(cy - (cy - y0) * ky) - 2;
  const out = new Uint8Array(w * nh * 4);
  for (let y = 0; y < nh; y++) {
    const dy = (ny0 + y) - cy;
    let g;
    if (keepR > 0) {
      const t = Math.min(1, Math.abs(dy) / (keepR * 2.4));
      const wgt = 1 - t * t * (3 - 2 * t);
      g = wgt + (1 - wgt) / ky;
    } else g = 1 / ky;
    const j = cy + dy * g - y0;
    if (j < -1 || j > h) continue;
    const j0 = Math.min(h - 1, Math.max(0, Math.floor(j)));
    const j1 = Math.min(h - 1, j0 + 1), fy = Math.min(1, Math.max(0, j - j0));
    for (let x = 0; x < w; x++) {
      const a = (j0 * w + x) * 4, b = (j1 * w + x) * 4, o = (y * w + x) * 4;
      for (let ch = 0; ch < 4; ch++) out[o + ch] = data[a + ch] * (1 - fy) + data[b + ch] * fy;
    }
  }
  return { data: out, x0, y0: ny0, w, h: nh };
}

/** 横方向だけを kx 倍する。warpY の横版。 */
export function warpX(layer, kx, cx, keepR = 0) {
  if (!layer || kx === 1) return layer;
  const { data, x0, y0, w, h } = layer;
  const nw = Math.ceil(w * Math.max(kx, 1)) + 4;
  const nx0 = Math.round(cx - (cx - x0) * kx) - 2;
  const out = new Uint8Array(nw * h * 4);
  const map = new Float64Array(nw);
  for (let x = 0; x < nw; x++) {
    const dx = (nx0 + x) - cx;
    let g;
    if (keepR > 0) {
      const t = Math.min(1, Math.abs(dx) / (keepR * 2.4));
      const wg = 1 - t * t * (3 - 2 * t);
      g = wg + (1 - wg) / kx;
    } else g = 1 / kx;
    map[x] = cx + dx * g - x0;
  }
  for (let y = 0; y < h; y++) {
    const row = y * w * 4, orow = y * nw * 4;
    for (let x = 0; x < nw; x++) {
      const i = map[x];
      if (i < -1 || i > w) continue;
      const i0 = Math.min(w - 1, Math.max(0, Math.floor(i)));
      const i1 = Math.min(w - 1, i0 + 1), fx = Math.min(1, Math.max(0, i - i0));
      const a = row + i0 * 4, b = row + i1 * 4, o = orow + x * 4;
      for (let ch = 0; ch < 4; ch++) out[o + ch] = data[a + ch] * (1 - fx) + data[b + ch] * fx;
    }
  }
  return { data: out, x0: nx0, y0, w: nw, h };
}

/** 眉を髪色に合わせる。眉の素材は輝度がほぼ一定(109〜112)なので色の置換にする。 */
export function tintBrow(layer, shadow, highlight, mix = 0.36) {
  if (!layer) return layer;
  const { data: s, x0, y0, w, h } = layer;
  const o = new Uint8Array(s.length);
  const c = [shadow[0] + (highlight[0] - shadow[0]) * mix,
             shadow[1] + (highlight[1] - shadow[1]) * mix,
             shadow[2] + (highlight[2] - shadow[2]) * mix];
  for (let i = 0; i < s.length; i += 4) {
    const a = s[i + 3];
    o[i + 3] = a;
    if (a === 0) continue;
    const k = (s[i] + s[i + 1] + s[i + 2]) / 3 / 110;
    o[i] = Math.min(255, c[0] * k);
    o[i + 1] = Math.min(255, c[1] * k);
    o[i + 2] = Math.min(255, c[2] * k);
  }
  return { data: o, x0, y0, w, h };
}

/** 服の着色。素材はほぼグレースケールなので輝度を影〜ハイライトのランプへ写像する。 */
export function colorizeCloth(layer, rgb, lo, hi) {
  if (!layer || !rgb) return layer;
  const { data: s, x0, y0, w, h } = layer;
  const o = new Uint8Array(s.length);
  const sh = [rgb[0] * 0.55, rgb[1] * 0.55, rgb[2] * 0.55];
  const hl = [Math.min(255, rgb[0] * 1.28 + 18), Math.min(255, rgb[1] * 1.28 + 18),
              Math.min(255, rgb[2] * 1.28 + 18)];
  const g0 = hl[0] - sh[0], g1 = hl[1] - sh[1], g2 = hl[2] - sh[2];
  const span = Math.max(hi - lo, 1);
  for (let i = 0; i < s.length; i += 4) {
    const a = s[i + 3];
    if (a === 0) { o[i + 3] = 0; continue; }
    const lum = (s[i] + s[i + 1] + s[i + 2]) / 3;
    let t = (lum - lo) / span; t = t < 0 ? 0 : t > 1 ? 1 : t;
    let v;
    v = sh[0] + g0 * t; o[i]     = v > 255 ? 255 : v;
    v = sh[1] + g1 * t; o[i + 1] = v > 255 ? 255 : v;
    v = sh[2] + g2 * t; o[i + 2] = v > 255 ? 255 : v;
    o[i + 3] = a;
  }
  return { data: o, x0, y0, w, h };
}


/** しみ。ほくろと違って盛り上がらず、輪郭がぼやけた薄い色むら。
 * 大きさの幅を広く取り、濃さは抑える。 */
function blotch(cx, cy, size = 1, seed = 1) {
  let t = (seed | 0) || 1;
  const rnd = () => { t ^= t << 13; t ^= t >>> 17; t ^= t << 5; return ((t >>> 0) % 10000) / 10000; };
  const rr = (7 + rnd() * 11) * size;
  const R = Math.ceil(rr * 2.0);
  const w = R * 2 + 1, h = w;
  const x0 = Math.round(cx) - R, y0 = Math.round(cy) - R;
  const el = 0.6 + rnd() * 0.7, rot = rnd() * Math.PI;
  const ca = Math.cos(rot), sa = Math.sin(rot);
  // 輪郭のゆらぎを大きめに。しみは境目がはっきりしない
  const a3 = 0.20 + rnd() * 0.25, a5 = 0.10 + rnd() * 0.20, ph = rnd() * 6.283;
  const warm = rnd();                         // 0=灰茶 1=黄茶
  const amax = 86 + rnd() * 74;
  const soft = 1.4 + rnd() * 1.4;             // 減衰のなだらかさ
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - R, dy = y - R;
      const u = dx * ca + dy * sa, v = (-dx * sa + dy * ca) / el;
      const ang = Math.atan2(v, u);
      const rEff = rr * (1 + a3 * Math.sin(ang * 3 + ph) + a5 * Math.sin(ang * 5 - ph * 1.7));
      const d = Math.hypot(u, v) / Math.max(rEff, 0.5);
      const i = (y * w + x) * 4;
      if (d >= 1) { out[i + 3] = 0; continue; }
      out[i] = 214 + warm * 8;
      out[i + 1] = 186 - warm * 8;
      out[i + 2] = 168 - warm * 24;
      out[i + 3] = Math.round(Math.pow(1 - d, soft) * amax);
    }
  }
  return { data: out, x0, y0, w, h };
}

/** 左右対称のせん断。中心からの距離の二乗で縦にずらす。
 * 口角の上下に使う(正で下がる)。 */
export function shearSym(layer, amount, cx, halfW) {
  if (!layer || !amount) return layer;
  const { data, x0, y0, w, h } = layer;
  const pad = Math.ceil(Math.abs(amount)) + 2;
  const nh = h + pad * 2, ny0 = y0 - pad;
  const out = new Uint8Array(w * nh * 4);
  for (let x = 0; x < w; x++) {
    const t = Math.min(1, Math.abs((x0 + x) - cx) / Math.max(halfW, 1));
    const dy = amount * t * t;
    for (let y = 0; y < nh; y++) {
      const j = (ny0 + y - dy) - y0;
      if (j < 0 || j > h - 1) continue;
      const j0 = Math.floor(j), j1 = Math.min(h - 1, j0 + 1), fy = j - j0;
      const a = (j0 * w + x) * 4, b = (j1 * w + x) * 4, p = (y * w + x) * 4;
      for (let ch = 0; ch < 4; ch++) out[p + ch] = data[a + ch] * (1 - fy) + data[b + ch] * fy;
    }
  }
  return { data: out, x0, y0: ny0, w, h: nh };
}
