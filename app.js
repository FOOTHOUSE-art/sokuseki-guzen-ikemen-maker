/* 即席イケメンメーカー — アプリ本体 */
import * as E from './engine.js?v=09157';
import { warpToOutline } from './warp.js?v=09157';
import { initLoader, load, cacheCount, cacheBytes } from "./loader.js?v=09157";

export let M = null;                       // parts.json
const C = new E.Compositor();

export async function init() {
  await initLoader();
  M = await (await fetch('assets/parts.json')).json();
  await loadMetrics();
  return M;
}

/* ---------- PRNG と重み付き抽選 ---------- */
export function mulberry32(a) {
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
const pickId = (rnd, opts) => pick(rnd, opts).id;

/* ---------- 1回の抽選 ---------- */
/** ov で軸を固定できる。UIの個別選択と「眼鏡を必ず付ける」に使う。
 * 抽選の順序は変えないので、固定しない軸は同じシードで同じ結果になる。 */
export function roll(seed, ov = {}) {
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

/* ---------- 素材のパス ---------- */
const P = {
  body: () => '02_body/body_common_final.webp',
  face: s => `01_face/face_${s.outline}.webp`,
  ear: s => `12_ear/ear_${s.outline}.webp`,
  eye: (s, side, kind) => `${s.eyeFolder}/${s.eye}_${side}_${kind}.webp`,
  sclera: (s, side) => `15_sclera/${s.eye}_${side}.webp`,
  nose: s => `03_nose/${s.nose}.webp`,
  mouth: s => `04_mouth/${s.mouth}.webp`,
  brow: (s, side) => `08_brow/${s.brow}_${side}.webp`,
  tear: (s, side) => `09_tear/${s.tear}_${side}.webp`,
  skin: id => `13_skin/${id}.webp`,
  hair: s => `11_hair/${s.hair}.webp`,
  glass: s => `16_glass/glass_${s.glass}_${s.outline}.webp`,
  cloth: s => `10_cloth/${s.cloth.id}.webp`,
  tie: () => '10_cloth/cloth01_necktie.webp',
  beard: s => `14_beard/${s.beard}.webp`,
};

export function neededFiles(s) {
  const L = [P.body(), P.face(s), P.ear(s), P.nose(s), P.mouth(s), P.hair(s)];
  if (s.cloth.id !== 'none') L.push(P.cloth(s));
  for (const side of ['R', 'L']) {
    L.push(P.eye(s, side, 'shade'), P.eye(s, side, 'core'), P.brow(s, side), P.sclera(s, side));
    if (s.tear !== 'none') L.push(P.tear(s, side));
  }
  L.push(P.skin(s.socket), P.skin(s.pimple));
  for (const k of ['redness', 'pores', 'freckle', 'acnemark', 'mole'])
    if (s[k] !== 'none') L.push(P.skin(s[k]));
  if (s.beard !== 'none') L.push(P.beard(s));
  if (s.glass !== 'none') L.push(P.glass(s));
  if (s.tie) L.push(P.tie());
  return L;
}

/* ---------- 合成 ---------- */
export async function compose(s, bg = [246, 246, 248], adj = null, stamps = []) {
  const D = normAdj(adj);
  const g = async p => await load(p);
  const tone = s.tone.rgb;
  const buf = C.begin(bg);
  const tint = l => E.tintSkin(l, tone);
  // 人中の比率は口を縦に動かして変える。肌ディテールの削りにも同じ層を使う。
  // 唇の厚さは口の中心を軸に縦だけ伸縮する
  const mm = MET && MET.mouth ? MET.mouth[s.mouth] : null;
  let mouthLayer = await g(P.mouth(s));
  if (mouthLayer && D.lipWidth !== 1) mouthLayer = E.warpX(mouthLayer, D.lipWidth, 512, 0);
  if (mouthLayer && D.lipThick !== 1)
    mouthLayer = E.warpY(mouthLayer, D.lipThick, mm ? mm.cy : 678, 0);
  if (mouthLayer && D.mouthCorner !== 0)
    mouthLayer = E.shearSym(mouthLayer, D.mouthCorner, 512, (mm ? mm.w : 160) / 2);
  mouthLayer = E.translate(mouthLayer, 0, D.mouthY);

  // 輪郭の変形。基準は(512, 486)。顔と眼鏡は形を変え、耳と髪は位置だけ連動する。
  const FCX = 512, FCY = 486;
  const faceT = l => {
    if (!l) return l;
    let o = D.faceW !== 1 ? E.warpX(l, D.faceW, FCX, 0) : l;
    if (D.faceH !== 1) o = E.warpY(o, D.faceH, FCY, 0);
    if (D.chinY !== 0) o = E.stretchBelow(o, 660, D.chinY, 90);   // あごだけ伸ばす
    return o;
  };
  const followY = y => (y - FCY) * (D.faceH - 1);
  E.over(buf, tint(await g(P.body())));
  E.over(buf, faceT(tint(await g(P.face(s)))));
  // 目は左右対称に動かす。R は画像の左側なので符号を反転する。
  const EYC = { R: 419, L: 605 }, EYY = 486;
  const ir = MET && MET.iris ? MET.iris[s.eye] : null;
  const kx = D.eyeScale * D.eyeWidth, ky = D.eyeScale * D.eyeHeight;
  const eyeT = (l, side) => {
    if (!l) return l;
    // 虹彩の中心。素材はRを実測し、Lは左右反転なので鏡像を使う
    const icx = ir ? (side === 'R' ? ir.cx : 1024 - ir.cx) : EYC[side];
    const icy = ir ? ir.cy : EYY;
    let o = l;
    if (kx !== 1) o = E.warpX(o, kx, icx, ir ? ir.rx : 0);
    if (ky !== 1) o = E.warpY(o, ky, icy, ir ? ir.ry : 0);
    o = E.shearEye(o, { lidDrop: D.lidDrop, lidRise: D.lidRise,
                        innerY: D.innerY, outerY: D.outerY }, icx, icy, 46, side);
    return E.translate(o, side === 'R' ? -D.eyeGap / 2 : D.eyeGap / 2, D.eyeY);
  };
  for (const side of ['R', 'L']) E.multiply(buf, eyeT(await g(P.eye(s, side, 'shade')), side));
  {
    let nl = await g(P.nose(s));
    if (D.noseW !== 1) nl = E.warpX(nl, D.noseW, 512, 0);
    E.multiply(buf, E.translate(nl, 0, D.noseY));
  }
  E.multiply(buf, mouthLayer);
  for (const side of ['R', 'L']) E.over(buf, eyeT(await g(P.eye(s, side, 'core')), side));
  // 涙袋は目の縦の開きに連動させない(拡大すると不自然になる)
  const tearT = (l, side) => {
    if (!l) return l;
    const icx = ir ? (side === 'R' ? ir.cx : 1024 - ir.cx) : EYC[side];
    let o = l;
    if (kx !== 1) o = E.warpX(o, kx, icx, ir ? ir.rx : 0);   // 横だけ追従。縦は変えない
    return E.translate(o, side === 'R' ? -D.eyeGap / 2 : D.eyeGap / 2, D.eyeY);
  };
  if (s.tear !== 'none') for (const side of ['R', 'L']) E.multiply(buf, tearT(await g(P.tear(s, side)), side));
  // 白目を肌トーンから外す
  for (const side of ['R', 'L']) E.untintSclera(buf, eyeT(await g(P.sclera(s, side)), side), tone);
  // 肌ディテールは唇の芯までしか除外していない。選ばれた口のαで削る。
  // 以前は10種の口の和を4px膨張した穴が焼き込まれており、赤みが届かない
  // リングが口のまわりに白く残っていた(mouth10 で 5,857px)。
  for (const k of ['socket', 'redness', 'pores', 'freckle', 'acnemark', 'pimple', 'mole']) {
    const id = s[k];
    if (!id || id === 'none') continue;
    let sl = E.maskBy(await g(P.skin(id)), mouthLayer, true);
    // 眼窩は目の位置に追従する。左右に割って動かすと中央の切断面が
    // 重なったり離れたりするので、横方向の連続変形で外へ広げる。
    if (k === 'socket' && (D.eyeY !== 0 || D.eyeGap !== 0)) {
      const halfDist = 93;                       // 目の中心と顔の中心の距離
      const kk = (halfDist + D.eyeGap / 2) / halfDist;
      let o2 = kk !== 1 ? E.warpX(sl, kk, 512, 0) : sl;
      E.multiply(buf, E.translate(o2, 0, D.eyeY));
      continue;
    }
    E.multiply(buf, sl);
  }
  if (s.beard !== 'none') {
    // ひげは egg 輪郭まで抽出済み。選ばれた輪郭で切り、選ばれた口で削る
    let b = await g(P.beard(s));
    if (s.outline !== 'egg') b = await warpToOutline(b, s.outline);
    b = faceT(b);                                   // ひげも輪郭に追従
    b = E.maskBy(b, faceT(await g(P.face(s))), false);
    b = E.maskBy(b, mouthLayer, true);
    b = E.scaleAlpha(b, s.beardStrength.alpha);
    E.multiply(buf, b);
  }
  // 眉は目の変形に連動させない。上下の移動だけ効かせる。
  const hp = M.palettes && M.palettes.hair ? M.palettes.hair.entries[s.hairColor] : null;
  const BRC = { R: 395, L: 629 };            // 眉のおおよその中心
  for (const side of ['R', 'L']) {
    let bl = await g(P.brow(s, side));
    if (D.browColor && BROW_PAL[D.browColor]) {
      const bp = BROW_PAL[D.browColor];
      bl = E.tintBrow(bl, bp[0], bp[1]);
    } else if (D.browHair && hp) bl = E.tintBrow(bl, hp[0], hp[1]);
    // 眉頭と眉尻の上下。差がそのまま傾きになる。
    // 眉全体の傾きは、眉頭と眉尻を逆向きに動かすのと同じ
    const tilt = D.browTilt;
    bl = E.shearEye(bl, { innerY: D.browInner + tilt, outerY: D.browOuter - tilt },
                    BRC[side], 470, 80, side);
    if (D.browAlpha !== 1) bl = E.scaleAlpha(bl, D.browAlpha);
    E.over(buf, E.translate(bl, side === 'R' ? -D.browGap / 2 : D.browGap / 2, D.browY));
  }
  // スタンプ(ニキビ・ほくろ)。顔のパーツの後、耳と髪の前に置く
  for (const st of stamps) {
    if (st.layer) {
      const l2 = faceT(st.layer);                     // ブラシも輪郭変形に追従
      if (st.over) E.over(buf, l2); else E.multiply(buf, l2);
    } else E.multiply(buf, E.stamp(st.kind, st.x, st.y, st.size || 1, st.seed || 0));
  }
  // 耳は顔と同じ変形をかける。顔素材の中に耳が描かれている(耳マスクの99.8%が一致)ため、
  // 耳だけ位置を動かすと顔側の耳と二重に見える。
  E.over(buf, faceT(tint(await g(P.ear(s)))));
  // 髪は egg 基準で抽出されているので、選ばれた輪郭に合わせて横方向へ変形する
  let hairLayer = await g(P.hair(s));
  if (s.outline !== 'egg') hairLayer = await warpToOutline(hairLayer, s.outline);
  // 髪も輪郭に追従させる
  hairLayer = faceT(hairLayer);
  E.over(buf, E.colorizeHair(hairLayer, s.hairColor));
  if (s.glass !== 'none') E.over(buf, faceT(E.colorizeGlass(await g(P.glass(s)), s.glassColor)));
  const cm = MET && MET.cloth ? MET.cloth : null;
  if (s.cloth.id !== 'none') {
    const cc = cm ? cm[s.cloth.id] : null;
    E.over(buf, cc ? E.colorizeCloth(await g(P.cloth(s)), CLOTH_PAL[s.clothColor], cc.lo, cc.hi)
                   : await g(P.cloth(s)));
  }
  if (s.tie) {
    const tc = cm ? cm['cloth01_necktie'] : null;
    E.over(buf, tc ? E.colorizeCloth(await g(P.tie()), CLOTH_PAL[s.tieColor], tc.lo, tc.hi)
                   : await g(P.tie()));
  }
  return C.finish();
}

/* ---------- イケメン度 ----------
 * 顔の黄金比を実測した幾何から算出する。素材のbboxを事前計測した
 * metrics.json を使い、次の8項目を0〜1で評価して重み付けする。
 *   縦の3分割 1:1:1 / 横の5分割 / 目の間隔=目幅 / 眉と目の距離
 *   小鼻の幅=目の間隔 / 人中 1:2 / Vライン / 左右対称
 * 肌の均一さ(ニキビ・跡・青ひげ・毛穴)は減点で反映する。 */
export let MET = null;
export async function loadMetrics() {
  if (MET) return MET;
  try {
    const r = await fetch('assets/metrics.json');
    if (!r.ok) throw new Error('metrics.json が見つかりません (' + r.status + ')');
    MET = await r.json();
  } catch (e) {
    console.error(e);
    MET = null;                       // 無くてもアプリは動く。スコアだけ既定値になる
  }
  return MET;
}
const HAIRLINE = 310;            // 素体の解剖学的な生え際。髪に隠れる位置ではない
const W = { s3: 16, s5: 13, gap: 11, brow: 11, nose: 9, jin: 11, v: 11, mouth: 9, sym: 9 };

const FCY_G = 486;
export function geometry(s, adj = null) {
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

export function ikemenScore(s, adj = null, stamps = []) {
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
export function rank(v) {
  if (v >= 90) return 'SS';
  if (v >= 84) return 'S';
  if (v >= 78) return 'A';
  if (v >= 71) return 'B';
  if (v >= 64) return 'C';
  return 'D';
}
/** 各項目の内訳。UIで内訳を出せるようにする。 */
export const AXIS_JA = { s3: '縦の3分割', s5: '横の5分割', gap: '目の間隔', brow: '眉と目の距離',
  nose: '小鼻の幅', jin: '人中の比率', v: 'Vライン', mouth: '口の幅と口角', sym: '左右対称' };

/* ---------- レア判定(顔の項目で組む) ---------- */
function weightOf(axis, id) {
  const o = (M.axes[axis]?.options || []).find(x => x.id === id);
  const tot = (M.axes[axis]?.options || []).reduce((s, x) => s + (x.w ?? 1), 0);
  return o ? (o.w ?? 1) / tot : 1;
}
export function rarity(s) {
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

/* ---------- プロフィール文(顔のみ) ---------- */
const JA = {
  outline: { egg: '卵型', round: '丸型', square: '四角い', long: '面長の', slim: '細面の', rect: '長方形の', diamond: 'ひし形の', hex: '六角形の', invtri: '逆三角の', pear: '洋なし型の', homeplate: 'ホームベース型の' },
  eyeGroup: { '一重': '一重', '二重': '二重', '奥二重': '奥二重' },
  eyeShape: { almond: 'アーモンド型', narrow: '切れ長', round: '丸い', droop: 'たれ目', upturn: 'つり目', slim: '細い', large: '大きな', halflid: '眠たげな', sanpaku: '三白眼', deepset: '奥まった' },
  nose: { straight: 'すっと通った鼻筋', aquiline: 'わし鼻', button: '小さく丸い鼻', small: '控えめな鼻', upturned: '上向きの鼻', wide: '横に広い鼻', longhigh: '高く長い鼻筋', flat: '平坦な鼻', greek: '整ったギリシャ鼻', droop: '下がり気味の鼻' },
  mouth: { standard: '標準的な口元', thin: '薄い唇', full: '厚い唇', downturn: '口角の下がった口元', upturn: '口角の上がった口元', small: '小さな口', wide: '大きな口', bow: '弓形の唇', fulllow: '下唇の厚い口元', parted: 'わずかに開いた口元' },
  brow: { straight: '直線的な眉', arch: 'アーチ眉', angled: '角のある眉', thick: '太い眉', narrow: '細い眉', short: '短い眉', long: '長い眉', upturn: '上がり眉', droop: '下がり眉', rounded: '丸みのある眉', messy: '無造作な眉', sharpangle: '鋭角の眉', boldflat: '太く平らな眉', sword: '剣眉', longtail: '長い眉尻', softinner: '眉頭のやわらかい眉', stepped: '段のある眉', thickdroop: '太い下がり眉', sharparch: '鋭いアーチ眉', bushy: '濃く豊かな眉' },
  hairColor: { kuro: '黒髪', ankasshoku: '暗褐色の髪', kuriiro: '栗色の髪', akaruicha: '明るい茶髪', beju: 'ベージュの髪' },
  tone: { light: '色白', neutral: '標準的な肌', tan: '小麦色の肌', deep: '褐色の肌' },
  beard: { beard_shaved: '剃った跡の残る口元', beard_chin: '顎の無精ひげ', beard_mous: '鼻下の無精ひげ', beard_full: '無精ひげ' },
};
export const JA_LABEL = JA;
const strip = (v, re) => v.replace(re, '');
export function profileText(s) {
  const eS = JA.eyeShape[strip(s.eye, /^eye[ABC]\d+_/)] || '';
  const parts = [];
  parts.push(`${JA.outline[s.outline]}輪郭に、${JA.eyeGroup[s.eyeGroup]}の${eS}。`);
  parts.push(`${JA.nose[strip(s.nose, /^nose\d+_/)]}と${JA.mouth[strip(s.mouth, /^mouth\d+_/)]}。`);
  parts.push(`${JA.brow[strip(s.browShape, /^\d+_/)]}${s.browDensity === 'S' ? '(やや薄め)' : ''}。`);
  const d = [];
  if (s.tear !== 'none') d.push('涙袋');
  if (s.mole !== 'none') d.push('ほくろ');
  if (s.freckle !== 'none') d.push('そばかす');
  if (s.pimple !== 'pimple_n0') d.push('ニキビ');
  if (s.acnemark !== 'none') d.push('ニキビ跡');
  if (d.length) parts.push(`${d.join('と')}が目を引く。`);
  parts.push(`${JA.hairColor[s.hairColor]}。${JA.tone[s.tone.id]}。`);
  if (s.beard !== 'none') parts.push(JA.beard[s.beard] + '。');
  if (s.glass !== 'none') parts.push('眼鏡をかけている。');
  return parts.join('');
}

export const CLOTH_PAL = {
  white:[238,238,240], lightgray:[198,200,204], gray:[150,152,158],
  saxe:[122,158,196], navy:[44,58,96], beige:[206,188,158],
  olive:[104,110,74], wine:[120,52,60], charcoal:[78,80,86], black:[38,38,42],
};
export const CLOTH_PAL_JA = { white:'白', lightgray:'ライトグレー', gray:'グレー',
  saxe:'サックス', navy:'ネイビー', beige:'ベージュ', olive:'オリーブ',
  wine:'ワイン', charcoal:'チャコール', black:'黒' };
/** 眉の色。髪と別に選べるようにする。[影, 山] の2色でランプを作る。 */
export const BROW_PAL = {
  black:    [[10, 10, 12], [96, 92, 92]],
  darkbrown:[[26, 20, 16], [124, 104, 86]],
  brown:    [[46, 32, 22], [156, 124, 92]],
  lightbrown:[[78, 56, 38], [190, 156, 118]],
};
export const BROW_PAL_JA = { black:'黒', darkbrown:'焦茶', brown:'茶', lightbrown:'明るい茶' };
export const VERSION = '0.9300';

/** 微調整。すべて0が既定。単位はピクセル、eyeScale だけ倍率。 */
/** eyeScale は縦横に等しく効く。eyeWidth と eyeHeight はそれぞれの方向に上乗せする。
 * いずれも虹彩の大きさは保たれる(素材ごとに実測した半径を使う)。 */
export const ADJ0 = {
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
export function normAdj(a) {
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
export const stats = () => ({ count: cacheCount(), bytes: cacheBytes() });
