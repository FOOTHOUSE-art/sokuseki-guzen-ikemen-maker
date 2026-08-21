/* face_text.js — 即席の顔(素材ID + 微調整)を日本語にする。手順6a。
 *
 *   faceToJa(s, adj, presets)
 *     → { block, inject, nearest }
 *
 *   block  : 基準カードのプロンプトの【顔】に差し込む日本語
 *   inject : 層2(person.js)に渡す顔立ちの値。setConfig({ face: inject })
 *   nearest: 素材から逆算した顔立ちプリセット名(35種)
 *
 * 素材ID → 語彙は一対一なので情報が落ちない。落ちるのは逆向き(語彙 → 素材)。
 * ここは即席が土台だから成立している。
 *
 * 微調整は「数値 → 語」に変える。**しきい値は下の表だけで決める。**
 * 書き手の感覚で「やや」と書くと、同じ値が日によって違う語になる。
 */

/* ============================================================
 * 1. 素材ID → 日本語(記述用)
 * ========================================================== */
export const JA = {
  // 「〜の輪郭」まで含めて持つ。'面長の' と '卵型' が混在すると文が崩れる
  outline: { egg:'卵型の輪郭', round:'丸型の輪郭', square:'四角い輪郭',
    long:'面長の輪郭', slim:'細面の輪郭', rect:'長方形の輪郭', diamond:'ひし形の輪郭',
    hex:'六角形の輪郭', invtri:'逆三角の輪郭', pear:'洋なし型の輪郭',
    homeplate:'ホームベース型の輪郭' },
  eyeGroup: { '一重':'一重', '二重':'二重', '奥二重':'奥二重' },
  // 文にそのまま置ける形にする。app.js の JA は '奥まった' のような連体形なので
  // 「二重の奥まった。」になってしまう。ここは名詞句で持つ
  eyeShape: { almond:'アーモンド型の目', narrow:'切れ長の目', round:'丸い目',
    droop:'たれ目', upturn:'つり目', slim:'細い目', large:'大きな目',
    halflid:'眠たげな目', sanpaku:'三白眼', deepset:'奥まった目' },
  nose: { straight:'すっと通った鼻筋', aquiline:'わし鼻', button:'小さく丸い鼻',
    small:'控えめな鼻', upturned:'上向きの鼻', wide:'横に広い鼻',
    longhigh:'高く長い鼻筋', flat:'平坦な鼻', greek:'整ったギリシャ鼻',
    droop:'下がり気味の鼻' },
  mouth: { standard:'標準的な口元', thin:'薄い唇', full:'厚い唇',
    downturn:'口角の下がった口元', upturn:'口角の上がった口元', small:'小さな口',
    wide:'大きな口', bow:'弓形の唇', fulllow:'下唇の厚い口元',
    parted:'わずかに開いた口元' },
  brow: { straight:'直線的な眉', arch:'アーチ眉', angled:'角のある眉', thick:'太い眉',
    narrow:'細い眉', short:'短い眉', long:'長い眉', upturn:'上がり眉', droop:'下がり眉',
    rounded:'丸みのある眉', messy:'無造作な眉', sharpangle:'鋭角の眉',
    boldflat:'太く平らな眉', sword:'剣眉', longtail:'長い眉尻',
    softinner:'眉頭のやわらかい眉', stepped:'段のある眉', thickdroop:'太い下がり眉',
    sharparch:'鋭いアーチ眉', bushy:'濃く豊かな眉' },
  hair: { hair01_buzz:'坊主', hair02_softmohawk:'ソフトモヒカン',
    hair03_fadeshort:'フェードの短髪', hair04_skinfade:'スキンフェード',
    hair05_spiky:'束感のある短髪', hair06_upbang:'アップバング',
    hair07_sidepart:'サイドパート', hair08_crop:'クロップ',
    hair09_pompadour:'撫でつけたポンパドール', hair10_shortlayer:'ショートレイヤー',
    hair11_mushroom:'マッシュ', hair12_centerpart:'センターパート',
    hair13_koreanpart:'韓国風センターパート', hair14_mushwolf:'マッシュウルフ',
    hair15_seethrough:'シースルーのマッシュ', hair16_onelength:'ワンレングス',
    hair17_sweptpart:'かき上げのサイドパート', hair18_mushfade:'フェードのマッシュ',
    hair19_permmush:'パーマのマッシュ', hair20_shortpart:'短めのサイドパート',
    hair21_mediumstraight:'ストレートのミディアム', hair22_mediumlayer:'ミディアムレイヤー',
    hair23_looseperm:'ゆるいパーマ', hair24_spiralperm:'スパイラルパーマ',
    hair25_twistperm:'ツイストパーマ', hair26_wolfmedium:'ウルフミディアム',
    hair27_centermedium:'センターパートのミディアム',
    hair28_sweptmedium:'かき上げのミディアム', hair29_wavymedium:'波巻きのミディアム',
    hair30_mediummush:'ミディアムマッシュ' },
  // 「髪は{色}の{髪型}」に置くので、色の側に '髪' を付けない
  hairColor: { kuro:'黒', ankasshoku:'暗褐色', kuriiro:'栗色',
    akaruicha:'明るい茶', beju:'ベージュ' },
  tone: { light:'色白', neutral:'標準的な明るさ', tan:'小麦色', deep:'褐色' },
  beard: { beard_shaved:'剃った跡の残る口元', beard_chin:'顎の無精ひげ',
    beard_mous:'鼻下の無精ひげ', beard_full:'無精ひげ' },
  glass: { boston:'ボストン型の眼鏡', browline:'サーモント型の眼鏡',
    halfrim:'ハーフリムの眼鏡', metalsquare:'メタルスクエアの眼鏡',
    oval:'オーバル型の眼鏡', rimless:'縁なしの眼鏡', round:'丸眼鏡',
    square:'スクエア型の眼鏡', thick:'太縁の眼鏡', wellington:'ウェリントン型の眼鏡' },
  tear: { tear01_subtle:'控えめな涙袋', tear02_natural:'涙袋', tear03_strong:'はっきりした涙袋' },
  cloth: { none:'', cloth01_dressshirt:'ドレスシャツ', cloth02_shirt:'シャツ', cloth03_tshirt:'Tシャツ',
    cloth04_opencollar:'オープンカラーシャツ', cloth05_sleeveless:'ノースリーブ',
    cloth06_tanktop:'タンクトップ' },
  clothColor: { white:'白', lightgray:'ライトグレー', gray:'グレー', saxe:'サックス',
    navy:'ネイビー', beige:'ベージュ', olive:'オリーブ', wine:'ワイン',
    charcoal:'チャコール', black:'黒' },
};

/* ============================================================
 * 2. 微調整 → 語。しきい値の表
 * ------------------------------------------------------------
 * t : [無視する上限, はっきりの下限]。あいだが「やや」。
 * px は基準値0、rate は基準値1.0 からの隔たりで見る。
 * plus / minus は正負それぞれの語。null はその向きを書かない。
 * ========================================================== */
export const ADJ_RULES = {
  // 目
  eyeGap:      { kind:'px',   t:[3, 9],    plus:'目の間隔が{d}広い',   minus:'目の間隔が{d}狭い' },
  eyeScale:    { kind:'rate', t:[0.03, 0.09], plus:'目が{d}大きい',     minus:'目が{d}小さい' },
  eyeWidth:    { kind:'rate', t:[0.03, 0.09], plus:'目の横幅が{d}広い', minus:'目の横幅が{d}狭い' },
  eyeHeight:   { kind:'rate', t:[0.03, 0.09], plus:'目の縦幅が{d}大きい', minus:'目が{d}細い' },
  eyeY:        { kind:'px',   t:[3, 8],    plus:'目の位置が{d}低い',   minus:'目の位置が{d}高い' },
  lidDrop:     { kind:'px',   t:[3, 8],    plus:'上まぶたが{d}かぶさる', minus:'目が{d}大きく開いている' },
  lidRise:     { kind:'px',   t:[3, 8],    plus:'下まぶたが{d}持ち上がる', minus:null },
  innerY:      { kind:'px',   t:[3, 8],    plus:'目頭が{d}下がる',     minus:'目頭が{d}上がる' },
  outerY:      { kind:'px',   t:[3, 8],    plus:'目尻が{d}下がる',     minus:'目尻が{d}上がる' },
  // 眉
  browY:       { kind:'px',   t:[3, 9],    plus:'眉と目の距離が{d}近い', minus:'眉と目の距離が{d}遠い' },
  browGap:     { kind:'px',   t:[3, 9],    plus:'眉間が{d}広い',       minus:'眉間が{d}狭い' },
  browInner:   { kind:'px',   t:[3, 8],    plus:'眉頭が{d}下がる',     minus:'眉頭が{d}上がる' },
  browOuter:   { kind:'px',   t:[3, 8],    plus:'眉尻が{d}下がる',     minus:'眉尻が{d}上がる' },
  browTilt:    { kind:'px',   t:[1, 5],    plus:'眉が{d}下がり気味',   minus:'眉が{d}上がり気味' },
  browAlpha:   { kind:'rate', t:[0.05, 0.20], plus:'眉が{d}濃い',      minus:'眉が{d}薄い' },
  // 鼻
  noseY:       { kind:'px',   t:[3, 8],    plus:'鼻の位置が{d}低い',   minus:'鼻の位置が{d}高い' },
  noseW:       { kind:'rate', t:[0.04, 0.10], plus:'小鼻が{d}広い',    minus:'小鼻が{d}狭い' },
  // 口
  lipThick:    { kind:'rate', t:[0.04, 0.10], plus:'唇が{d}厚い',      minus:'唇が{d}薄い' },
  lipWidth:    { kind:'rate', t:[0.04, 0.10], plus:'口幅が{d}広い',    minus:'口幅が{d}狭い' },
  mouthCorner: { kind:'px',   t:[2, 7],    plus:'口角が{d}下がる',     minus:'口角が{d}上がる' },
  mouthY:      { kind:'px',   t:[3, 8],    plus:'口の位置が{d}低い',   minus:'口の位置が{d}高い' },
  // 輪郭
  faceW:       { kind:'rate', t:[0.03, 0.08], plus:'顔幅が{d}広い',    minus:'顔幅が{d}狭い' },
  faceH:       { kind:'rate', t:[0.03, 0.08], plus:'顔が{d}面長',      minus:'顔が{d}短い' },
  chinY:       { kind:'px',   t:[3, 8],    plus:'あごが{d}長い',       minus:'あごが{d}短い' },
  centri:      { kind:'px',   t:[5, 15],   plus:'パーツが{d}中央に寄る', minus:'パーツが{d}外へ開く' },
};

const WORD = { mid:'やや', strong:'はっきり' };

/** 数値1つを語にする。しきい値の外は空を返す(= その行を書かない)。 */
export function adjPhrase(key, value) {
  const r = ADJ_RULES[key];
  if (!r || value == null) return '';
  const base = r.kind === 'rate' ? 1 : 0;
  const d = value - base;
  const a = Math.abs(d);
  if (a <= r.t[0]) return '';                      // 無視する
  const tmpl = d > 0 ? r.plus : r.minus;
  if (!tmpl) return '';
  return tmpl.replace('{d}', a >= r.t[1] ? WORD.strong : WORD.mid);
}

/* ============================================================
 * 3. 素材ID → 偶然の語彙(層2へ注入する値)
 * ------------------------------------------------------------
 * 偶然側は facePreset や hairStyle を服装・雰囲気・レア判定の重みに使う。
 * 捨てずに **即席が決めた値を渡す**。捨てると人物の筋が通らなくなる。
 * ========================================================== */
const M = {
  faceLine: { egg:'卵型のフェイスライン', round:'丸顔寄りのフェイスライン',
    square:'ベース型のフェイスライン', long:'面長のフェイスライン',
    slim:'シャープなフェイスライン', rect:'やや角ばったフェイスライン',
    diamond:'シャープなフェイスライン', hex:'やや角ばったフェイスライン',
    invtri:'逆三角形に近いフェイスライン',
    pear:'卵型寄りのベース型（顎まわりに厚み）', homeplate:'ホームベース型のフェイスライン' },
  eyelid: { '一重':'一重', '二重':'平行二重', '奥二重':'奥二重' },
  eyeShape: { almond:'アーモンド形の目', narrow:'切れ長の目', round:'丸みのある目',
    droop:'たれ目気味の目', upturn:'つり目気味の目', slim:'細めの目',
    large:'丸みのある目', halflid:'細めの目', sanpaku:'標準的な目の形',
    deepset:'標準的な目の形' },
  eyes: { almond:'落ち着いた目元', narrow:'涼しげな目元', round:'親しみやすい目元',
    droop:'優しい目元', upturn:'鋭い目元', slim:'知的な目元', large:'親しみやすい目元',
    halflid:'眠たげな目元', sanpaku:'鋭い目元', deepset:'力強い目元' },
  tearBags: { none:'なし', tear01_subtle:'控えめ', tear02_natural:'自然', tear03_strong:'ふっくら' },
  nose: { straight:'通った鼻筋', aquiline:'わし鼻気味の鼻', button:'鼻先の丸い鼻',
    small:'控えめで自然な鼻', upturned:'鼻先の丸い鼻', wide:'小鼻の張った鼻',
    longhigh:'高めの鼻筋', flat:'高さ控えめで平たい鼻', greek:'すっきりした鼻筋',
    droop:'しっかりした鼻' },
  lips: { standard:'標準的な厚さの唇', thin:'薄い唇', full:'厚めの唇',
    downturn:'引き締まった一文字の唇', upturn:'口角のきゅっと上がった唇',
    small:'標準的な厚さの唇', wide:'標準的な厚さの唇', bow:'ふっくらした唇',
    fulllow:'上唇が薄く下唇が厚い唇', parted:'標準的な厚さの唇' },
  mouthPos: { standard:'標準的な位置・大きさの口', small:'小さめの口',
    wide:'口角の横幅が広い口' },
  skin: { light:'色白の肌', neutral:'自然な肌質', tan:'小麦色に日焼けした肌', deep:'褐色の肌' },
  facialHair: { none:'なし', beard_shaved:'自然な青ひげ', beard_chin:'あごひげ',
    beard_mous:'口ひげ', beard_full:'短い無精ひげ' },
  glasses: { none:'なし', boston:'丸メガネ', browline:'黒縁メガネ', halfrim:'ハーフリムメガネ',
    metalsquare:'メタルフレームメガネ', oval:'丸メガネ', rimless:'縁なしメガネ',
    round:'丸メガネ', square:'メタルフレームメガネ', thick:'黒縁メガネ',
    wellington:'黒縁メガネ' },
  hairColor: { kuro:'黒', ankasshoku:'黒に近いダークブラウン', kuriiro:'自然な茶髪',
    akaruicha:'明るめブラウン', beju:'ミルクティーベージュ' },
  // 髪型は 3つ組。[hairStyle, bangs, hairFinish]
  hair: {
    hair01_buzz:        ['短髪', '指定なし', 'ツヤを抑えたナチュラルセット'],
    hair02_softmohawk:  ['ソフトモヒカン', 'アップバングで額を出した前髪', 'ワックスの束感セット'],
    hair03_fadeshort:   ['ショートフェード', '短く切り揃えた前髪', 'ツヤを抑えたナチュラルセット'],
    hair04_skinfade:    ['スキンフェード', '短く切り揃えた前髪', 'ツヤを抑えたナチュラルセット'],
    hair05_spiky:       ['短髪', '軽く上げた前髪', 'ワックスの束感セット'],
    hair06_upbang:      ['アップバング', 'アップバングで額を出した前髪', 'ワックスの束感セット'],
    hair07_sidepart:    ['サイドパート', '斜めに流した前髪（左流し）', 'ツヤを抑えたナチュラルセット'],
    hair08_crop:        ['クロップスタイル', '短く切り揃えた前髪', '無造作セット'],
    hair09_pompadour:   ['アップバング', 'オールバック風に上げた前髪', 'きっちり撫でつけたセット'],
    hair10_shortlayer:  ['短髪', '自然に下ろした前髪', '無造作セット'],
    hair11_mushroom:    ['マッシュ', '眉にかかる重め前髪', 'ツヤを抑えたナチュラルセット'],
    hair12_centerpart:  ['センターパート', 'センターパートで左右に分けた前髪', 'ツヤを抑えたナチュラルセット'],
    hair13_koreanpart:  ['韓国風センターパート', 'センターパートで左右に分けた前髪', 'ツヤを抑えたナチュラルセット'],
    hair14_mushwolf:    ['マッシュウルフ', '眉にかかる重め前髪', '無造作セット'],
    hair15_seethrough:  ['マッシュ', '自然に下ろした前髪', 'ツヤを抑えたナチュラルセット'],
    hair16_onelength:   ['ロング寄りミディアム', '眉にかかる重め前髪', 'ツヤを抑えたナチュラルセット'],
    hair17_sweptpart:   ['サイドパート', 'かき上げ風前髪', 'ワックスの束感セット'],
    hair18_mushfade:    ['ソフトツーブロック', '眉にかかる重め前髪', 'ツヤを抑えたナチュラルセット'],
    hair19_permmush:    ['ニュアンスパーマ', '眉にかかる重め前髪', 'パーマ風の動きを出したセット'],
    hair20_shortpart:   ['ビジネス短髪', '斜めに流した前髪（左流し）', 'きっちり撫でつけたセット'],
    hair21_mediumstraight:['ロング寄りミディアム', '自然に下ろした前髪', 'ツヤを抑えたナチュラルセット'],
    hair22_mediumlayer: ['ウルフミディアム', '両サイドに流した前髪', '無造作セット'],
    hair23_looseperm:   ['ニュアンスパーマ', '自然に下ろした前髪', 'パーマ風の動きを出したセット'],
    hair24_spiralperm:  ['スパイラルパーマ', '斜めに流した前髪（右流し）', 'パーマ風の動きを出したセット'],
    hair25_twistperm:   ['ツイストパーマ', '軽く上げた前髪', 'パーマ風の動きを出したセット'],
    hair26_wolfmedium:  ['ウルフミディアム', '両サイドに流した前髪', '無造作セット'],
    hair27_centermedium:['センターパート', 'センターパートで左右に分けた前髪', 'ツヤを抑えたナチュラルセット'],
    hair28_sweptmedium: ['ロング寄りミディアム', 'かき上げ風前髪', 'ワックスの束感セット'],
    hair29_wavymedium:  ['波巻きパーマ', '額に一束落ちる長め前髪', 'パーマ風の動きを出したセット'],
    hair30_mediummush:  ['マッシュ', '眉にかかる重め前髪', 'ツヤを抑えたナチュラルセット'],
  },
  // 眉。形20種 → 偶然13種。濃さは browDensity と browAlpha から別に決める
  brow: { straight:'標準的な直線眉', arch:'標準的なゆるいアーチ眉', angled:'眉山のはっきりした眉',
    thick:'太めの直線眉', narrow:'やや細めの直線眉', short:'短めで力強い眉',
    long:'標準的な直線眉', upturn:'眉尻の上がったアーチ眉', droop:'眉尻の下がった優しい眉',
    rounded:'太めのアーチ眉', messy:'標準的な直線眉', sharpangle:'整えたシャープな直線眉',
    boldflat:'太めの直線眉', sword:'眉尻の上がった太めの直線眉', longtail:'標準的な直線眉',
    softinner:'標準的なゆるいアーチ眉', stepped:'眉山のはっきりした眉',
    thickdroop:'への字型の眉', sharparch:'眉尻の上がったアーチ眉', bushy:'太めのアーチ眉' },
  // 肌ディテール。スタンプとブラシから拾う。最大2つまで
  skinDetail: { beard_shaved:'うっすら青ひげ（剃り跡）', mole:'頬の小さなほくろ',
    freckle:'頬にそばかす', acnemark:'頬にニキビ跡（薄い凹凸）',
    pores:'頬の毛穴感（自然な質感）', redness:'頬の自然な赤み', pimple:'額に小さなニキビ' },
};

const strip = (v, re) => String(v || '').replace(re, '');
const eyeKey = s => strip(s.eye, /^eye[ABC]\d+_/);
const noseKey = s => strip(s.nose, /^nose\d+_/);
const mouthKey = s => strip(s.mouth, /^mouth\d+_/);
const browKey = s => strip(s.browShape, /^\d+_/);

/* ============================================================
 * 4. 素材から顔立ちプリセットを逆算する
 * ------------------------------------------------------------
 * 抽選で顔を作ったときも、偶然側に渡すプリセット名が要る(服装と雰囲気の重みに使う)。
 * 層2に選ばせると「層2が顔を決める」ことになるので、**画像から逆算する**。
 * ========================================================== */
export function nearestPreset(s, presets) {
  if (!presets) return null;
  const cur = { outline:s.outline, skinTone:s.tone && s.tone.id, eye:s.eye,
    brow:s.browShape, browDensity:s.browDensity, nose:s.nose, mouth:s.mouth,
    tear:s.tear, hair:s.hair, hairColor:s.hairColor, beard:s.beard,
    glass:s.glass, cloth:s.cloth && s.cloth.id, clothColor:s.clothColor };
  // 目・輪郭・鼻・口の一致を重く見る。服や色は顔立ちの判別に効かない
  const W = { outline:3, eye:3, nose:2, mouth:2, brow:2, skinTone:1, browDensity:1,
    tear:1, hair:1, hairColor:1, beard:1, glass:1, cloth:0, clothColor:0 };
  let best = null, bestScore = -1;
  for (const [name, p] of Object.entries(presets)) {
    let sc = 0, tot = 0;
    for (const [k, v] of Object.entries(p.fix || {})) {
      const w = W[k] ?? 1;
      tot += w;
      if (cur[k] === v) sc += w;
    }
    const r = tot ? sc / tot : 0;
    if (r > bestScore) { bestScore = r; best = name; }
  }
  return best;
}

/* ============================================================
 * 5. 本体
 * ========================================================== */
export function faceToJa(s, adj = {}, presets = null, opt = {}) {
  const eK = eyeKey(s), nK = noseKey(s), mK = mouthKey(s), bK = browKey(s);
  const A = k => adjPhrase(k, adj[k]);

  /* --- 記述(【顔】に入れる) --- */
  const L = [];
  L.push(`${JA.outline[s.outline]}。`);

  const eye = [`${JA.eyeGroup[s.eyeGroup]}の${JA.eyeShape[eK]}`];
  for (const k of ['eyeScale','eyeWidth','eyeHeight','eyeGap','lidDrop','lidRise',
                   'innerY','outerY','eyeY']) { const p = A(k); if (p) eye.push(p); }
  L.push(eye.join('。') + '。');

  const brow = [`${JA.brow[bK]}${s.browDensity === 'S' ? '(やや薄め)' : ''}`];
  for (const k of ['browY','browGap','browInner','browOuter','browTilt','browAlpha'])
    { const p = A(k); if (p) brow.push(p); }
  L.push(brow.join('。') + '。');

  const nm = [JA.nose[nK], JA.mouth[mK]];
  for (const k of ['noseW','noseY','lipThick','lipWidth','mouthCorner','mouthY'])
    { const p = A(k); if (p) nm.push(p); }
  L.push(nm.join('。') + '。');

  const shape = [];
  for (const k of ['faceW','faceH','chinY','centri']) { const p = A(k); if (p) shape.push(p); }
  if (shape.length) L.push(shape.join('。') + '。');

  // none の軸は書かない。「〜なし」と書くと否定形になり、指示として弱くなる。
  // **どこに何があるかまで書く。** 6dで「ニキビ跡」とだけ書いたら、
  // そばかす状の点として描かれた。跡は点ではなく薄い凹凸
  const d = [];
  if (s.tear !== 'none') d.push(JA.tear[s.tear]);
  if (s.mole !== 'none') d.push('左頬に小さなほくろがひとつ');
  if (s.freckle !== 'none') d.push('鼻から頬にかけて薄いそばかす');
  if (s.pimple !== 'pimple_n0') d.push('額に小さなニキビ');
  if (s.acnemark !== 'none') d.push('頬に薄いニキビ跡の凹凸(色の点ではなく、浅いくぼみとして描く)');
  if (s.pores !== 'none') d.push('小鼻と頬に毛穴');
  if (s.redness !== 'none') d.push('小鼻のまわりにわずかな赤み');
  if (d.length) L.push(d.join('。') + '。');

  L.push(`髪は${JA.hairColor[s.hairColor]}の${JA.hair[s.hair]}。`);
  L.push(`肌は${JA.tone[s.tone.id]}。`);
  if (s.beard !== 'none') L.push(JA.beard[s.beard] + '。');
  if (s.glass !== 'none') L.push(JA.glass[s.glass] + '。');

  /* --- 層2へ渡す値 --- */
  const [hairStyle, bangs, hairFinish] = M.hair[s.hair] || ['短髪','指定なし','指定なし'];
  const details = [];
  if (s.beard === 'beard_shaved') details.push(M.skinDetail.beard_shaved);
  for (const k of ['mole','freckle','acnemark','pores','redness'])
    if (s[k] && s[k] !== 'none') details.push(M.skinDetail[k]);
  if (s.pimple && s.pimple !== 'pimple_n0') details.push(M.skinDetail.pimple);

  const gap = adj.browGap || 0;
  const scale = (adj.eyeScale || 1) * (adj.eyeWidth || 1);
  const centri = (adj.centri || 0) + (-(adj.eyeGap || 0) / 2);

  const inject = {
    // プリセット表を読めなかったときも止めない。**strictFace が facePreset を
    // 要求するので、null のままだと生成そのものが落ちる。**
    // 「普通顔」は偶然側の語彙にもある、当たり障りのない既定
    facePreset: nearestPreset(s, presets) || '普通顔',
    faceLine: M.faceLine[s.outline],
    eyelid: M.eyelid[s.eyeGroup],
    eyeShape: M.eyeShape[eK],
    eyes: M.eyes[eK],
    eyeBalance: eK === 'sanpaku'
      ? '三白眼（黒目が小さめで左右と下に白目が見える）' : '標準的な黒目の位置',
    eyelash: '標準的な長さのまつ毛',          // 素材に差が無い
    tearBags: M.tearBags[s.tear],
    eyebrow: M.brow[bK],
    eyebrowDensity: s.browDensity === 'S' ? '薄めの眉'
      : (adj.browAlpha || 1) > 1.05 ? '濃い眉' : '標準的な濃さの眉',
    eyebrowGap: gap > 3 ? '眉間は離れ気味' : gap < -3 ? '眉間は近め' : '標準的な眉間',
    eyebrowGroom: '自然に整えている',
    nose: M.nose[nK],
    mouth: '落ち着いた無表情',                // 基準カードは無表情。表情は派生で付ける
    lips: M.lips[mK],
    mouthPos: mK === 'small' ? M.mouthPos.small
      : mK === 'wide' ? M.mouthPos.wide : M.mouthPos.standard,
    faceSpacing: centri > 12 ? 'はっきり求心的な配置（自然範囲の上限）'
      : centri > 4 ? 'やや求心寄りの配置'
      : centri < -12 ? 'はっきり遠心的な配置（自然範囲の上限）'
      : centri < -4 ? 'やや遠心寄りの配置' : '標準的な配置',
    faceRatio: scale >= 1.08 ? '目が大きめで存在感のある比率'
      : scale <= 0.94 ? '目が小さめ・切れ長寄りの比率' : '標準的なバランスの比率',
    faceAsym: '左右対称に近い整った顔',       // 素材が左右反転なので必ず対称
    skin: M.skin[s.tone.id],
    skinDetail: details[0] || 'なし（クリアな肌）',
    skinDetail2: details[1] || 'なし（クリアな肌）',
    facialHair: M.facialHair[s.beard] || 'なし',
    hairStyle, bangs, hairFinish,
    hairColor: M.hairColor[s.hairColor],
    hairTexture: /perm|wavy/.test(s.hair) ? 'ゆるいくせ毛' : '直毛',
    hairVolume: s.hair === 'hair15_seethrough' ? '毛量少なめ' : '標準的な毛量',
    glasses: M.glasses[s.glass] || 'なし',
  };

  // 決定H: 年齢は層2が持つ。顔の雰囲気は保ったまま、その年齢の顔にする。
  // 記述本体には混ぜず、別の行として返す。混ぜると画像の顔立ちと区別が付かなくなる
  const aging = ageFaceNote(opt.age);

  return { block: L.join(''), aging, inject, nearest: inject.facePreset };
}

/* 服は顔参照画像の襟元だけを担う(決定B)。文章とプロンプトは層2の語彙が正。
 * 「なし」を選ぶと服のレイヤーを描かない。素体は鎖骨から上の素肌なので、
 * 胸像のように収まる。**参照画像としてはこれがいちばん安全**で、
 * 襟が本文の服装に混ざる余地がなくなる。 */
export function collarNote(s) {
  const c = s.cloth && s.cloth.id;
  if (!c || c === 'none') return '';
  return `${JA.clothColor[s.clothColor] || ''}の${JA.cloth[c] || ''}`;
}

/* ============================================================
 * 6. 年齢(決定H)
 * ------------------------------------------------------------
 * 顔は画像が正。年齢は層2が持つ。両方を立てるために、
 * **雰囲気を保ったまま、その年齢の顔にする**と指示する。
 *
 * 素材の年齢は1つしかない。素体はおおよそ20代半ばなので、そこを基準にして
 * 差分だけを書く。基準の幅に入っていれば何も書かない(= 画像のまま)。
 * 髪色は画像が正なので変えない。45歳以上だけ「こめかみに白髪が混じる」を足す。
 * 髪型そのものを年齢で変えると、髪は書き換えられやすい部位なので画像から離れる。
 * ========================================================== */
export const BASE_AGE = [22, 29];      // 素材が素のまま通る年齢の幅

export const AGE_STEPS = [
  { max: 21, note: '肌の張りが強く、頬にわずかな丸みが残る。目の下と口元にしわを作らない。' },
  { max: 29, note: '' },
  { max: 39, note: '肌の張りをわずかに落とし、目尻に薄い笑いじわを入れる。フェイスラインは保つ。' },
  { max: 49, note: '目尻の笑いじわとほうれい線を薄く入れ、上まぶたがわずかにかぶさる。'
              + '頬の張りを少し落とし、こめかみに白髪をわずかに混ぜる。' },
  { max: 59, note: '目尻と額に浅いしわ、ほうれい線をはっきり入れる。上まぶたのかぶさりと'
              + '目の下のたるみを加え、フェイスラインをやや緩める。白髪を全体に少し混ぜる。' },
  { max: 200, note: '額と目尻に深いしわ、ほうれい線と首のしわを入れる。まぶたのたるみを強め、'
              + 'フェイスラインを緩め、眉と髪に白髪をはっきり混ぜる。' },
];

/** その年齢の顔にするための追記。基準の幅なら空を返す(= 画像のまま)。 */
export function ageFaceNote(age) {
  const a = Number(age) || 0;
  if (!a) return '';
  if (a >= BASE_AGE[0] && a <= BASE_AGE[1]) return '';
  return (AGE_STEPS.find(x => a <= x.max) || {}).note || '';
}

/* ============================================================
 * 7. 顔参照画像を添付するための前置き(手順6c)
 * ------------------------------------------------------------
 * 偶然の refPrefix() は「添付 = 基準カード」の前提で書かれていて使えない。
 * 添付するのはバストアップ・襟元だけ・正面のみ。作らせたいのは全身・下着・複数ビュー。
 * **画像と指示は意図的に食い違う。** ここを書かないと襟と構図が漏れる。
 * ========================================================== */
/* 参照画像を実写に置き換えるための指示。
 * 6dで分かったこと: **参照画像の画風まで写してくる。** 素材を合成した絵をそのまま
 * 渡すと、顔がイラスト調で返る。「イラストにしない」と否定形で書くより、
 * **写真の作りを具体的に書いたほうが効く**(OpenAIの原則7)。
 * 造作(何が写っているか)と画風(どう描かれているか)を、はっきり分けて指示する。 */
export const PHOTOREAL = [
  '【画風】参照画像は素材を合成した絵。ここから読み取るのは造作だけにする。'
  + '目・鼻・口・眉・輪郭の位置と形と比率、髪の生え方と流れ、肌の明るさ。'
  + '線の引き方・塗り・陰影の付け方は写真に置き換える。',
  '【実写の作り】85mm相当のレンズで撮った日本人男性の写真として描く。'
  + '肌は毛穴と産毛が見え、額と鼻筋にわずかな皮脂の照りがある。'
  + '眉と睫毛は一本ずつ生えている。唇には縦の細かいしわ。'
  + '虹彩には放射状の繊維と外周の暗いリングがあり、角膜のハイライトは光源ひとつぶん。'
  + '髪は毛束を線で囲まず、生え際は地肌が透けて一本ずつ植わって見える。'
  + '肌の色は面で塗り分けず、連続した階調でつなぐ。'
  + '骨格の陰影(眼窩・頬骨・下顎角)を、光の回り込みとして自然に出す。',
];

export function refPrefixFace(opt = {}) {
  const age = Number(opt.age) || 0;
  const aging = ageFaceNote(age);
  const L = [];
  // 偶然のプロンプトは「〜する」で書かれている。混ぜると指示の粒がそろわないので合わせる
  L.push('【参照画像あり・重要】添付した画像は、この人物の顔だけの参照。'
    + '顔立ち・髪型・髪色・肌の色と質は、この画像に従う。');
  if (age) {
    // 基準の幅に入っていれば足すものが無い。「年を重ねた姿」と書くと嘘になる
    // 素材の年齢は1つで、上にも下にもずらす。「年を重ねた」「若いころ」と向きを
    // 書くと、参照画像に年齢があるかのように読める。**向きは書かない。**
    L.push(aging
      ? `【年齢】画像の顔の雰囲気と造作を保ったまま、${age}歳の顔として描く。`
        + `同じ人物の姿とし、別人にしない。${aging}`
      : `【年齢】${age}歳。画像のままの年齢感で描く。`);
  }
  // 襟が写っているかどうかで書き分ける。写っていないのに「襟元は仮」と書くと、
  // 存在しないものへの指示になって、かえって迷わせる
  L.push('【画像から読み取らないもの】服装・構図・画角・背景・パネル構成は本文の指示に従う。'
    + (opt.collar
        ? '画像の襟元は顔を見せるための仮のもので、着ている服の指定ではない。'
        : '画像は肩から上だけを写したもので、服装の情報は含まない。'));
  L.push('【側面】顔の側面は、画像の正面から自然に推定して描く。');
  if (opt.photoreal !== false) L.push(...PHOTOREAL);
  L.push('【描き直す】画像を切り貼りせず、本文の光と画角に合わせて一から描き直す。'
    + '肌の質感・光の向き・影・色味を全体でそろえ、1枚として自然に撮影された画像に仕上げる。');
  return L.join('\n') + '\n\n';
}


/* ============================================================
 * 8. 微調整を自然な範囲で引く
 * ------------------------------------------------------------
 * 素のままだと25軸すべてが既定値で、顔の差が「素材の組み合わせ」だけになる。
 * 実際の顔は、同じ目の素材でも間隔や高さが少しずつ違う。
 *
 * **幅は狭く取る。** スライダーの上限まで振ると漫画になる。
 * 中央に寄る分布(一様乱数を2つ足す)を使い、極端な値が出にくいようにした。
 * ========================================================== */
const NAT = {
  faceW: ['r', 0.03], faceH: ['r', 0.03], chinY: ['p', 5], centri: ['p', 10],
  eyeGap: ['p', 8], eyeScale: ['r', 0.05], eyeWidth: ['r', 0.04], eyeHeight: ['r', 0.06],
  eyeY: ['p', 4], lidDrop: ['p', 5], lidRise: ['p', 3], innerY: ['p', 5], outerY: ['p', 5],
  browY: ['p', 8], browGap: ['p', 6], browInner: ['p', 4], browOuter: ['p', 4],
  browTilt: ['p', 3], browAlpha: ['r', 0.08],
  noseY: ['p', 4], noseW: ['r', 0.05],
  lipThick: ['r', 0.07], lipWidth: ['r', 0.05], mouthCorner: ['p', 4], mouthY: ['p', 5],
};

/** @param {number} seed @param {object} adj0 app.js の ADJ0 */
export function naturalAdj(seed, adj0 = {}) {
  let a = (seed ^ 0x9e3779b9) | 0;
  const rnd = () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const tri = () => rnd() + rnd() - 1;        // -1〜1。中央に寄る
  const out = Object.assign({}, adj0);
  for (const [k, [kind, w]] of Object.entries(NAT)) {
    if (!(k in out)) continue;
    out[k] = kind === 'p'
      ? Math.round(tri() * w)                          // px はそのまま
      : Math.round((1 + tri() * w) * 100) / 100;       // 倍率は小数2桁(URLは%で持つ)
  }
  return out;
}

/** 自然な範囲で何度か引いて、**いちばんイケメン度が高いものを採る**。
 *
 *   bestAdj(seed, adj0, adj => ikemenScore(state, adj), 24)
 *
 * 上限まで振って作るのとは違う。**振れ幅は naturalAdj のまま**で、
 * その中から良いものを選ぶだけなので、顔は自然な範囲に収まる。
 * 回数を増やすほど上がるが、24回で頭打ちに近い。
 */
export function bestAdj(seed, adj0, score, tries = 24) {
  let best = null, top = -Infinity;
  for (let i = 0; i < tries; i++) {
    const a = naturalAdj((seed + i * 0x9e3779b1) >>> 0, adj0);
    const v = score(a);
    if (v > top) { top = v; best = a; }
  }
  return best || Object.assign({}, adj0);
}
