/* rarity.js — レア判定とイケメン度の統合。手順7。
 *
 *   judge(faceState, person, adj, stamps) → { score, rank, ikemen, ikemenRank, hits }
 *
 * 方針(計画 §「イケメン度とレア判定をどうするか」)
 *   イケメン度 : **即席の実測を使う。** 偶然の語彙加点は使わない。測れるものは測る
 *   レア判定   : **顔は即席、人物像は偶然。足す。二重に数えない**
 *
 * 即席は確率(掛け算)、偶然は点(足し算)で持っている。**点にそろえた。**
 * 確率のままだと、人物像側の31規則と足し合わせられない。
 */
import { ikemenScore, rank as ikemenRankOf, rarity as faceRarity } from './sokuseki.js';
import { rarityBreakdown } from './guzen.js';

/* ============================================================
 * 落とす規則
 * ------------------------------------------------------------
 * 300シードで発火率を測って決めた。理由を残さないと、あとで戻される。
 * ========================================================== */
export const DROP = {
  // 常に当たる。即席の素材は左右反転なので、顔は必ず対称になる。
  // 残すと全員に +8pt が乗るだけで、判定として意味がない(実測 100%)
  '左右対称に近い顔': '素材が左右反転なので常に成立する',

  // 即席が同じ特徴を見ている。両方数えると二重になる
  '明色髪': '即席の「明るい髪色」と重複',
  '泣きぼくろ': '即席の「ほくろ」と重複',
  'レアな肌の特徴': '即席の「ほくろ」「そばかす」と重複',

  // 層2が値を持たなくなった軸を見ている。いまは当たらないが、
  // あとで誰かが値を足したとき静かに効きだす。先に外しておく
  '長いまつ毛': '即席に差が無いので「標準」で固定。当たらない',
  '彫りの深い顔立ち': 'browRidge を層2が持たない',
  '整った歯列': 'teethAlign を層2が持たない(§判断)',
  'えくぼ': 'dimple を層2が持たない',
};

/** 即席の確率を点にする。p が小さいほど高い。偶然の 5〜30pt に合わせた。 */
export function pointOf(p) {
  return Math.max(2, Math.min(30, Math.round(6 * Math.log10(1 / Math.max(p, 1e-6)))));
}

/* 段の境目。600シードの分布から取った。
 * 偶然の段(66/48/30)をそのまま使うと、常時+8だった「左右対称」を落とし、
 * さらに決定Iで「外国籍」が当たらなくなったぶん、全体が下へ寄って
 * NORMAL が81%になる。**規則を変えたら段も引き直す。**
 *   800シード: 中央13 / 85%が24 / 96%が32 / 最大65 */
const BANDS = [[38, 'LEGEND'], [25, 'SUPER RARE'], [13, 'RARE'], [0, 'NORMAL']];

export function judge(faceState, person, adj = null, stamps = []) {
  const hits = [];

  // --- 顔(即席)。確率を点にする
  for (const h of faceRarity(faceState).hits) {
    hits.push({ from: '顔', label: h.label, pt: pointOf(h.p), p: h.p });
  }

  // --- 人物像(偶然)。落とす規則を除く
  for (const [label, pt] of rarityBreakdown(person)) {
    if (DROP[label]) continue;
    hits.push({ from: '人物', label, pt });
  }

  const score = hits.reduce((a, h) => a + h.pt, 0);
  const rank = (BANDS.find(([n]) => score >= n) || BANDS[3])[1];
  const ikemen = ikemenScore(faceState, adj, stamps);

  return { score, rank, ikemen, ikemenRank: ikemenRankOf(ikemen), hits };
}

/** 内訳の1行表示。UIに出すとき用。 */
export const lines = r => r.hits
  .slice().sort((a, b) => b.pt - a.pt)
  .map(h => `${h.from === '顔' ? '顔' : '像'} ${String(h.pt).padStart(2)}pt  ${h.label}`);
