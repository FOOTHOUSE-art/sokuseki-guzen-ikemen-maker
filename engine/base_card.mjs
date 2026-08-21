/* base_card.js — 1つのシードから、顔・人物像・基準カードのプロンプトまでを組む。
 *
 *   const r = buildBaseCard({ seed: 12345, adj, ov });
 *   r.face    即席の抽選結果(合成にそのまま渡せる)
 *   r.person  人物像 229キー
 *   r.block   【顔】に入った日本語
 *   r.prompt  基準リファレンスカードのプロンプト(日本語・ChatGPT向け)
 *
 * 3段のパイプラインの [1]→[2] をつなぐところ。
 *   [1] 即席が顔を合成 → [2] このプロンプト + 顔参照画像 → [3] 派生
 *
 * 顔は即席が正、人物像は偶然が正、年齢は顔に足す(決定H)。
 */
import { roll } from './sokuseki.js';
import { faceToJa, refPrefixFace, collarNote } from './face_text.js';
import { setSeed, setConfig, generateCharacter, buildPrompt, buildDerivedPrompt,
         buildFullProfileText, ensureProfileMeasurements } from './guzen.js';

/* 顔立ちプリセット35種。**読み込みは呼ぶ側にまかせる。**
   node は fs、ブラウザは fetch。ここで片方に決めると、もう片方で動かない。 */
let PRESETS = null;
export function setPresets(p) { PRESETS = (p && p.presets) || p; }

/* 決定f: 派生は17種すべて出す。UIのメニューはこの順で作る。
 * 偶然の outputTypes 20種 + トレーディングカード。refSheetKind が分岐を持っている。
 * 「16:9のリファレンスカード」は基準カードと同じ形なので、派生としては使わない
 * (基準カードは buildBaseCard().prompt のほう)。 */
export const DERIVED_TYPES = [
  '前面・側面を1枚にまとめた設定画像',
  '前面・側面・背面を1枚にまとめた設定画像',
  '服装基準カード（職業服装）',
  '服装基準カード（私服）',
  '表情AUリファレンスシート',
  '表情差分リファレンスシート',
  '比較リファレンスシート（下着×私服・靴なし）',
  '段階着装リファレンスシート',
  'フル設定資料シート',
  '偶然人物ブループリントシート',
  '服装リファレンスシート（職業背景）',
  '偶然足元強調場面シート',
  'SNSプロフィール風画像',
  '就活写真風画像',
  'スポーツ選手紹介風画像',
  '人物ポスター（職業・人物像）',
  '街で見かけたイケメンシート：職業編',
  '街で見かけたイケメンシート：オフ編',
  '人物特集雑誌ページ',
  'トレーディングカード',
];

/** 基準カードは無地スタジオ・均一光で固定する(決定E)。抽選しない。 */
export const BASE_SCENE = {
  background: 'シンプルなグレーバック',
  lighting: '写真館風の正面ライト。',
  // 6d の結果を受けて '雑誌グラビアではなく設定資料風' から変えた。
  // 資料であることはパネル構成が担っているので、質感は写真に寄せてよい
  quality: 'AI感を抑えた自然写真',
  count: '1枚',
  outputType: '16:9の基準リファレンスカード',
  promptLanguage: '日本語',
  promptTarget: 'ChatGPT',
};

/* 決定I: 国籍は日本、舞台も日本で固定する。
 * 人種は素材に合わせる。
 * 即席の素材は日本人の顔で作られている(顔立ちプリセットに しょうゆ顔・縄文/弥生 がある)。
 * 偶然の既定は国籍も人種も「ランダム」なので、放っておくと27か国から一様に引き、
 * 実測で97%が外国籍・大半が非アジア系になる。**画像と文章が食い違う。**
 * 人種だけ日本人に寄せれば、国籍の多様さは保ったまま顔と矛盾しなくなる
 * 国籍も日本に固定したので、舞台・街並み・看板もすべて日本になる。 */
export const DEFAULT_FIXED = { nationality: '日本', ethnicity: '日本人' };

/** プロフィール文を、画面に振り分けられる形に切る。 */
export function profileSections(p) {
  const t = buildFullProfileText(p);
  const line = k => (t.match(new RegExp('^' + k + '：(.*)$', 'm')) || [, ''])[1];
  const after = k => { const i = t.indexOf(k); return i < 0 ? '' : t.slice(i + k.length).split('――――')[0].trim(); };
  return {
    text: t,
    // 左端 — 基本プロフィール / ABC / 体型
    head: (t.match(/^■ (.*)$/m) || [, ''])[1],
    basic: line('基本'),
    abc: line('計測'),
    catch: line('キャッチ'),
    person: line('人物'),
    // 左端 — 体型
    body: [
      ['身長・体重', `${p.height}・${p.weight}`],
      ['体型', p.bodyType],
      // 頭身はプロンプトの中で計算されている。同じ値を拾う
      ['頭身', (buildPrompt(Object.assign({}, p, { __faceBlock: '' }), true)
        .match(/約[\d.]+頭身/) || [''])[0]],
      ['足', `${p.footSize}・${p.footShape}`],
      ['体毛', p.bodyHairOverall],
    ].filter(r => r[1]),
    // 右端 — 背景 / 内面 / 提案服装
    background: [
      ['年代', `${p.eraYear}年・${p.season}`],
      ['生年月日', p.birthdateText],
      ['出身', p.birthplaceText],
      ['育ち', p.originText],
      ['家族', p.familyText],
      ['住まい', p.residenceText],
      ['少年時代', p.pastUpbringing],
      ['', p.pastTrauma],
    ].filter(r => r[1]),
    inner: after('―――― 内面・背景 ――――'),
    outfit: after('―――― 提案服装 ――――'),
  };
}

export function buildBaseCard({ seed, adj = {}, ov = {}, initial = {}, fixed = {}, person: fixPerson = {} } = {}) {
  fixed = Object.assign({}, DEFAULT_FIXED, fixed);
  // --- [1] 顔。素材から抽選して、そのまま語彙に変える
  const face = roll(seed, ov);
  const f = faceToJa(face, adj, PRESETS);

  // --- [2] 人物像。同じシード。顔立ちは層1から渡す
  setConfig({ initial, fixed, face: f.inject, person: fixPerson, strictFace: true });
  setSeed(seed);
  const person = generateCharacter('full');
  // 計測A/B/C の補完は、偶然では画面を描くときに呼ばれていた。
  // ここでは画面が無いので自分で呼ぶ。呼ばないと B が null のまま出る
  ensureProfileMeasurements(person);
  // **手で選んだ値を最後にもう一度かぶせる。**
  // base への注入は「そこから先の生成が追随する」ぶん強いが、
  // 内面(principleText など)は generateInnerProfile が後から上書きしてしまう。
  // 体型のように追随してほしいものは base で、追随の要らないものはここで効く。
  Object.assign(person, fixPerson);

  // 年齢が決まってから、顔に年齢の差分を足す(決定H)
  const aged = faceToJa(face, adj, PRESETS, { age: person.age });

  // --- [3] プロンプト。偶然の基準カードの型に、即席の顔を差し込む
  // 年齢の差分は前置きに入る。【顔】にも入れると同じ指示が2回出る。
  // ただし派生の「単体で完結」モードには前置きが付かないので、そちらでは【顔】に入れる。
  const c = Object.assign({}, person, BASE_SCENE, {
    __faceBlock: aged.block,
    __faceAging: '',
    __refPrefix: refPrefixFace({ age: person.age, collar: !!collarNote(face) }),
  });
  const cSolo = Object.assign({}, c, { __faceAging: aged.aging, __refPrefix: '' });
  const prompt = buildPrompt(c, true);

  return {
    seed, face, person,
    block: aged.block,
    aging: aged.aging,
    nearest: f.nearest,
    collar: collarNote(face),      // 顔参照画像の襟元。文章の服装とは別(決定B)
    inject: f.inject,
    prompt,
    /** 人物像の文章。偶然の buildFullProfileText をそのまま使い、
     *  見出し(■ / ―――― X ――――)で切り分ける。画面の欄に振り分けるため */
    get profile() { return profileSections(person); },
    /** [3] 派生。基準カードで生成した画像を添付して使う(手順8)。
     *  偶然の buildDerivedPrompt をそのまま通す。参照画像前提(簡潔版)が既定。 */
    derived(type, mode = '参照画像前提（簡潔版）') {
      setConfig({ initial, fixed, face: f.inject, person: fixPerson, strictFace: true, derivedType: type });
      setSeed(seed);
      const solo = mode === '単体で完結（フル記述）';
      let out = buildDerivedPrompt(
        Object.assign({}, solo ? cSolo : c, { derivedMode: mode }), false);
      // トレーディングカードだけは buildPrompt を通らない別経路で、
      // 【顔】が入らない。参照画像モードなら画像が顔を持つので問題ないが、
      // 単体モードでは顔の指定が丸ごと落ちる。型で分岐せず、無ければ足す
      if (solo && aged.block && !out.includes(aged.block)) {
        out = `【顔】${aged.block}${aged.aging || ''}\n` + out;
      }
      return out;
    },
  };
}
