/* sokuseki.js — 即席 app.js から機械生成。**手で編集しない。**
   `python3 extract_sokuseki.py app.js` で作り直す。
   合成(engine/warp/loader)には触っていないので node で動く。
   ブラウザでは sokuseki.browser.js(app.js の再輸出)に差し替える。 */
import fs from 'fs';
const here = u => new URL(u, import.meta.url);
export const M   = JSON.parse(fs.readFileSync(here('./parts.json'), 'utf8'));
export const MET = JSON.parse(fs.readFileSync(here('./metrics.json'), 'utf8'));



function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function pick(rnd, opts) {
  const tot = opts.reduce((s, o) => s + (o.w ?? 1), 0);
  let r = rnd() * tot;
  for (const o of opts) { r -= (o.w ?? 1); if (r <= 0) return o; }
  return opts[opts.length - 1];
}

function roll(seed, ov = {}) {
  const r = mulberry32(seed), A = M.axes;
  const s = { seed, ov };
  const P2 = (axis, opts) => {
    const v = pick(r, opts);                 // 乱数は必ず消費する
    if (ov[axis] == null) return v;
    return opts.find(o => o.id === ov[axis]) || v;
  };
  s.outline = P2('outline', A.outline.options).id;
  s.tone = P2('skinTone', A.skinTone.options);
  const eye = P2('eye', A.eye.options);
  s.eye = eye.id; s.eyeFolder = eye.folder; s.eyeGroup = eye.group;
  s.nose = P2('nose', A.nose.options).id;
  s.mouth = P2('mouth', A.mouth.options).id;
  s.browDensity = P2('browDensity', A.brow.density).id;
  s.browShape = P2('browShape', A.brow.options).id;
  s.brow = 'brow' + s.browDensity + s.browShape;
  s.tear = P2('tear', A.tear.options).id;
  s.cloth = P2('cloth', A.cloth.options);
  // ドレスシャツは前立てが素材に無く、ネクタイなしだと胸元が肌のまま裂けて見える。
  // 素材の作りとしてセットが前提なので、常に付ける。
  r();                                   // 乱数の消費位置は維持する
  s.tie = s.cloth.id === 'cloth01_dressshirt';
  if (ov.tie === 'none') s.tie = false;
  if (ov.tie === 'on' && s.cloth.id === 'cloth01_dressshirt') s.tie = true;
  s.hair = P2('hair', A.hair.options).id;
  s.hairColor = P2('hairColor', A.hairColor.options).id;
  s.glass = P2('glass', A.glass.options).id;
  s.glassColor = P2('glassColor', A.glassColor.options).id;
  s.socket = P2('socket', A.socket.options).id;
  s.pimple = P2('pimple', A.pimple.options).id;
  s.beard = P2('beard', A.beard.options).id;
  s.beardStrength = P2('beardStrength', A.beard.strength);
  for (const k of ['redness', 'pores', 'freckle', 'acnemark', 'mole'])
    s[k] = P2(k, A[k].options).id;
  s.clothColor = P2('clothColor', A.clothColor.options).id;
  s.tieColor = P2('tieColor', A.tieColor.options).id;
  return s;
}


const HAIRLINE = 310;            // 素体の解剖学的な生え際。髪に隠れる位置ではない

const W = { s3: 16, s5: 13, gap: 11, brow: 11, nose: 9, jin: 11, v: 11, mouth: 9, sym: 9 };

const FCY_G = 486;

function geometry(s, adj = null) {
  if (!MET || !MET.outline) return null;
  const D = normAdj(adj);
  const O = MET.outline[s.outline], E = MET.eye[s.eye];
  const B = MET.brow[s.brow], N = MET.nose[s.nose], M2 = MET.mouth[s.mouth];
  if (!O || !E || !B || !N || !M2) return null;
  const browBottom = B.bottom + D.browY + (D.browInner + D.browOuter) / 2;
  const eyeTop = E.cy - (E.cy - E.top) * D.eyeScale * D.eyeHeight;
  const kxg = D.eyeScale * D.eyeWidth;
  const eyeW = E.w * D.eyeScale * D.eyeWidth;
  // 目の間隔は左右を gap/2 ずつ外へ動かした結果。目を拡大すると内側の縁が
  // 虹彩中心から外へ広がるので、その分だけ間隔が狭まる。
  const eyeGap = Math.max(4, E.gap + D.eyeGap - (eyeW - E.w));
  const mc = M2.cy || 678;
  const mouthW = M2.w * D.lipWidth;
  const mouthTop = mc + (M2.top - mc) * D.lipThick + D.mouthY;
  const mouthBottom = mc + (M2.bottom - mc) * D.lipThick + D.mouthY;
  const noseBase = N.base + D.noseY;
  const chin = O.chin + (O.chin - FCY_G) * (D.faceH - 1) + D.chinY;
  const A = browBottom - HAIRLINE, Bv = noseBase - browBottom, C = chin - noseBase;
  const tot = A + Bv + C, ideal = tot / 3;
  const s3 = 1 - Math.min(1, (Math.abs(A - ideal) + Math.abs(Bv - ideal) + Math.abs(C - ideal)) / (tot * 0.5));
  // 横の5分割は「目の高さでの顔幅」が基準。頬幅ではない。
  // 顔素材には耳が描かれているので、耳を除いた幅を実測して使う(348〜388px)。
  const faceWpx = (O.wEyeNoEar || O.wCheek) * D.faceW;
  const s5 = 1 - Math.min(1, Math.abs(eyeW * 5 - faceWpx) / (faceWpx * 0.35));
  const gap = 1 - Math.min(1, Math.abs(eyeGap - eyeW) / eyeW);
  const brow = 1 - Math.min(1, Math.max(0, (eyeTop - browBottom) - 22) / 40);
  // 小鼻の幅は「顔幅の約1/5」が基準。目の間隔と比べる形もあるが、
  // 素体は目の間隔が広い(120px)ため、そちらを基準にすると常に低く出る。
  // 幅の計測は小鼻の輪郭線から取る(旧: 陰影まで含めて最大244pxになっていた)。
  const noseWpx = (N.wing2 || N.wing) * D.noseW;
  const noseIdeal = faceWpx / 5;
  const nose = 1 - Math.min(1, Math.abs(noseWpx - noseIdeal) / (noseIdeal * 0.45));
  const ph = mouthTop - noseBase, pl = chin - mouthBottom;
  const jin = ph > 0 ? 1 - Math.min(1, Math.abs(pl - 2 * ph) / Math.max(2 * ph, 1)) : 0.3;
  const v = 1 - Math.min(1, Math.abs(O.taper / D.faceW - 0.60) / 0.25);
  // 口の横幅は顔幅のおよそ半分が目安。口角は上がっているほど良い。
  const mw = 1 - Math.min(1, Math.abs(mouthW - faceWpx * 0.45) / (faceWpx * 0.22));
  const corner = 1 - Math.min(1, Math.max(0, D.mouthCorner + 2) / 12);
  const mouth = mw * 0.65 + corner * 0.35;
  return { s3, s5, gap, brow, nose, jin, v, mouth, sym: 1 };
}

function ikemenScore(s, adj = null, stamps = []) {
  const g = geometry(s, adj);
  if (!g) return 50;
  const wsum = Object.values(W).reduce((a, b) => a + b, 0);
  let v = 30 + (Object.keys(W).reduce((a, k) => a + g[k] * W[k], 0) / wsum) * 70;
  const pim = parseInt(String(s.pimple).replace('pimple_n', ''), 10) || 0;
  v -= ({ 0: 0, 1: 2, 2: 4, 3: 7, 5: 10, 8: 14 })[pim] ?? 0;
  if (s.acnemark !== 'none') v -= 5;
  if (s.beard === 'beard_shaved') v -= 4;      // 青ひげ
  if (s.beard === 'beard_full') v -= 2;
  if (s.pores !== 'none') v -= 2;
  if (s.freckle !== 'none') v -= 2;
  const sock = parseInt(String(s.socket).split('_')[1], 10);
  v += (sock >= 2 && sock <= 4) ? 3 : -2;
  // スタンプも肌の均一さに効く
  // スタンプとブラシの減点は、それぞれ最大2.5点まで。
  // 1個ずつ引くと、描き込むほど際限なく下がってしまう。
  let sp = 0;
  for (const st of stamps) {
    if (st.layer) continue;
    sp += st.kind === 'mole' ? 0.25 : st.kind === 'acnescar' ? 0.6 : 0.5;
  }
  v -= Math.min(2.5, sp);
  const nst = adj && typeof adj._strokes === 'number' ? adj._strokes : 0;
  if (nst > 0) v -= Math.min(2.5, nst * 0.35);
  return Math.max(0, Math.min(100, Math.round(v)));
}

function rank(v) {
  if (v >= 90) return 'SS';
  if (v >= 84) return 'S';
  if (v >= 78) return 'A';
  if (v >= 71) return 'B';
  if (v >= 64) return 'C';
  return 'D';
}

function weightOf(axis, id) {
  const o = (M.axes[axis]?.options || []).find(x => x.id === id);
  const tot = (M.axes[axis]?.options || []).reduce((s, x) => s + (x.w ?? 1), 0);
  return o ? (o.w ?? 1) / tot : 1;
}

function rarity(s) {
  const hits = [];
  const add = (label, p) => hits.push({ label, p });
  if (weightOf('hairColor', s.hairColor) <= 0.07) add('明るい髪色', weightOf('hairColor', s.hairColor));
  if (s.glass !== 'none') add('眼鏡あり', 0.3);
  if (/sanpaku/.test(s.eye)) add('三白眼', 0.033);
  if (s.pimple === 'pimple_n8') add('ニキビ8個', weightOf('pimple', s.pimple));
  if (s.beard === 'beard_full') add('無精ひげ', weightOf('beard', s.beard));
  if (s.beard === 'beard_mous') add('口ひげのみ', weightOf('beard', s.beard));
  if (s.mole !== 'none') add('ほくろ', 0.25);
  if (s.freckle !== 'none') add('そばかす', 0.22);
  if (s.tone.id === 'deep') add('褐色の肌', 0.10);
  if (s.browDensity === 'S') add('薄い眉', 0.28);
  if (s.tie) add('ネクタイ', 0.09);
  const p = hits.reduce((a, h) => a * h.p, 1);
  const stars = p < 1e-5 ? 5 : p < 2e-4 ? 4 : p < 3e-3 ? 3 : p < 4e-2 ? 2 : 1;
  return { hits, stars, p };
}

const ADJ0 = {
  eyeGap: 0, eyeScale: 1.0, eyeWidth: 1.0, eyeHeight: 1.0,
  eyeY: 0, browY: 0, mouthY: 0,
  lidDrop: 0, innerY: 0, outerY: 0,     // 上まぶた・目頭・目尻の上下
  browGap: 0, browInner: 0, browOuter: 0,   // 眉の間隔・眉頭と眉尻の上下(差が傾き)
  noseY: 0, noseW: 1.0,                     // 鼻の高さ・小鼻の幅
  chinY: 0,                                 // あごの高さ
  centri: 0,        // 求心(正)と遠心(負)。目・眉・鼻・口をまとめて中央へ寄せる
  browTilt: 0,      // 眉全体の傾き
  browAlpha: 1.0,   // 眉の濃さ
  lidRise: 0,       // 下まぶたを平行に上げる
  mouthCorner: 0,   // 口角の上下(正で下がる)
  lipWidth: 1.0,    // 唇の幅
  faceW: 1.0, faceH: 1.0,        // 輪郭の横・縦。耳と髪は大きさを変えず位置だけ連動する
  lipThick: 1.0,                 // 唇の厚さ
  browHair: false,               // 眉を髪色に合わせる
  browColor: '',                 // 眉の色。空なら素材のまま
};

function normAdj(a) {
  const D = Object.assign({}, ADJ0, a || {});
  // 求心的な顔はパーツが中央に寄る。遠心的は外へ開く。
  // 合成とイケメン度の両方で効くよう、ここで各軸へ畳み込む。
  const ce = (D.centri || 0) / 100;
  if (ce) {
    D.eyeGap  -= ce * 26;
    D.browGap -= ce * 22;
    D.noseY   -= ce * 10;
    D.mouthY  -= ce * 14;
    D.centri = 0;
  }
  return D;
}

export { ADJ0, FCY_G, HAIRLINE, W, geometry, ikemenScore, mulberry32, normAdj, pick, rank, rarity, roll, weightOf };
