/* url_state.js — 共有URLに「シード・固定した軸・微調整」を載せる。
 *
 *   location.hash = encodeState({ seed, ov: OV, adj: ADJ, version: A.VERSION });
 *   const st = decodeState(location.hash);
 *
 * いまの `#3361465794` はシードしか持っていない。**固定と微調整が復元されない。**
 * 顔の参照画像メーカーとしては、詰めた顔が共有で戻らないのは致命的なので直す。
 *
 * 形:
 *   3361465794                                     ← 従来。そのまま読める
 *   3361465794!cloth:none!eyeGap:-24,eyeHeight:75!0.9157
 *   ^シード     ^固定した軸    ^既定と違う微調整      ^版
 *
 * 区切りは `!` `,` `:` だけ。いずれもURLの断片でそのまま使える文字。
 *
 * **素材IDをそのまま載せる。** 選択肢の番号にすると1文字で済むが、
 * 素材を1つ足しただけで昔のURLが別の顔になる。長さより壊れないことを取る。
 *
 * **スタンプとブラシは載せない。** 筆1本ごとに座標が要るのでURLに入らない。
 * 載っていないことを画面に出す(下記 note)。
 */

/* 倍率で持つ軸。URLには百分率の整数で書く(画面の表示と同じ数字になる) */
export const ADJ_RATE = ['eyeScale', 'eyeWidth', 'eyeHeight', 'noseW',
  'lipThick', 'lipWidth', 'faceW', 'faceH', 'browAlpha'];

const isRate = k => ADJ_RATE.includes(k);
const SEP = '!', PAIR = ',', KV = ':';

/** @param {{seed:number, ov?:object, adj?:object, adj0?:object, version?:string}} s */
export function encodeState({ seed, ov = {}, adj = {}, adj0 = {}, version = '' }) {
  const o = Object.keys(ov).sort()
    .filter(k => ov[k] != null && ov[k] !== '')
    .map(k => k + KV + ov[k]).join(PAIR);

  const a = Object.keys(adj).sort().filter(k => {
    if (k.startsWith('_')) return false;              // _strokes などの内部値
    const d = adj0[k];
    return d !== undefined && adj[k] !== d;           // 既定と同じなら書かない
  }).map(k => {
    const v = adj[k];
    if (typeof v === 'boolean') return k + KV + (v ? 1 : 0);
    if (typeof v === 'number') return k + KV + (isRate(k) ? Math.round(v * 100) : v);
    return k + KV + v;
  }).join(PAIR);

  let s = String(seed >>> 0);
  if (o || a || version) s += SEP + o;
  if (a || version) s += SEP + a;
  if (version) s += SEP + version;
  return s;
}

/** @returns {{seed:number|null, ov:object, adj:object, version:string}} */
export function decodeState(hash, adj0 = {}) {
  const raw = String(hash || '').replace(/^#/, '');
  const [seedStr = '', ovStr = '', adjStr = '', version = ''] = raw.split(SEP);
  const seed = /^\d+$/.test(seedStr) ? (parseInt(seedStr, 10) >>> 0) : null;

  const ov = {};
  for (const p of ovStr.split(PAIR)) {
    if (!p) continue;
    const i = p.indexOf(KV);
    if (i > 0) ov[p.slice(0, i)] = p.slice(i + 1);
  }

  const adj = {};
  for (const p of adjStr.split(PAIR)) {
    if (!p) continue;
    const i = p.indexOf(KV);
    if (i <= 0) continue;
    const k = p.slice(0, i), v = p.slice(i + 1);
    const d = adj0[k];
    if (typeof d === 'boolean') adj[k] = v === '1';
    else if (typeof d === 'number' || d === undefined) {
      const n = Number(v);
      adj[k] = Number.isFinite(n) ? (isRate(k) ? n / 100 : n) : v;
    } else adj[k] = v;
  }
  return { seed, ov, adj, version };
}

/** 画面に出す注意書き。URLに載らないものを黙って捨てない */
export function shareNote(stamps = [], strokes = []) {
  const n = (stamps.length || 0) + (strokes.length || 0);
  return n ? `スタンプと筆(${n})はURLに含まれません` : '';
}
