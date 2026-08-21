/* profile_view.js — 人物像を、画面に並べられる形で持つ。
 *
 *   sections(person)  → [{ id, title, rows:[{label, value, key, pool}] }]
 *   options(poolKey)  → 選択肢の配列
 *
 * 項目と並びは偶然メーカーの結果画面に合わせた。**行の組み立てはこちらで書く。**
 * 偶然の `buildInnerSection` / `buildUniformEditRows` は、画面のカテゴリ表示状態や
 * `window` を見ているので、そのままでは呼べない(呼ぶと空か例外になる)。
 *
 * 編集は2種類。
 *   pool がある行  → ▼ 選び直す。`buildBaseCard({ person: { key: 値 } })` に流す
 *   pool が無い行  → 🎲 引き直すだけ。文章として組み立てられていて、候補が無い
 */
import { pools, buildPrompt } from './guzen.js';

/** 選択肢。pools_person の42キーがそのまま使える */
export function options(poolKey) {
  const v = pools[poolKey];
  if (!v) return [];
  return Array.isArray(v) ? v.slice() : Object.keys(v);
}

const j = a => (Array.isArray(a) ? a.filter(Boolean).join('・') : a) || '';
const headRatio = p => (buildPrompt(Object.assign({}, p, { __faceBlock: '' }), true)
  .match(/約[\d.]+頭身/) || [''])[0];

/* 行の作り方
 *   [表示名, 値, 人物のキー, 選択肢の pools キー]
 * 3つ目が無い行は編集できない(組み立てた文)。4つ目が無い行は 🎲 だけ。 */
const R = (label, value, key, pool) => ({ label, value: String(value ?? '—'), key, pool });

export function sections(p) {
  return [
    { id: 'basic', title: 'プロフィール', open: true, rows: [
      R('名前', p.name, 'name'),
      R('呼ばれ方', p.nicknameText, 'nicknameText'),
      R('年齢', `${p.age}歳`, 'age', 'ages'),
      R('年代・季節', `${p.eraYear}年・${p.season}`, 'season', 'seasons'),
      R('国籍・人種', `${p.nationality}・${p.ethnicity}`, 'nationality', 'nationalities'),
      R('職業', p.role, 'role', 'roles'),
      R('雰囲気', p.vibe, 'vibe', 'vibes'),
      R('MBTI', `${p.mbti}（${p.personality}）`, 'mbti', 'mbtis'),
      R('一人称', p.pronoun, 'pronoun'),
      R('キャッチ', p.catchText || p.bioText, 'catchText'),
    ] },

    { id: 'abc', title: 'ABC', open: true, rows: [
      R('A', `${p.measurementA}cm`, 'measurementA'),
      R('B', `${p.measurementB}cm（A比 ${p.measurementA
        ? Math.round(p.measurementB / p.measurementA * 100) : '-'}%）`, 'measurementB'),
      R('C', p.measurementC, 'measurementC'),
    ] },

    { id: 'body', title: '体型', open: true, rows: [
      R('身長・体重', `${p.height}・${p.weight}`, 'heightRaw'),
      R('体型', p.bodyType, 'bodyType', 'bodyTypes'),
      R('頭身', headRatio(p)),
      R('足', `${p.footSize}・${p.footShape}`, 'footShape', 'footShapes'),
      R('体毛', p.bodyHairOverall, 'bodyHairOverall', 'bodyHairOverall'),
      R('姿勢', p.posture, 'posture'),
      R('基準服装', `${p.boxerBrand || ''}${p.boxerColor ? '・' + p.boxerColor : ''}`
        + `${p.baseWearType ? '・' + p.baseWearType : ''}`, 'boxerBrand', 'boxerBrands'),
    ] },

    /* ここから右端。**偶然の結果画面と同じカテゴリ・同じ項目・同じ並び。**
       出どころは偶然の catLines(【基本】【暮らし・家族】【日常・嗜好】【内面】
       【ファッション】【過去・人間関係】【オトナの事情】)。増減させない。 */
    { id: 'gbasic', title: '基本', open: true, rows: [
      R('生年月日', p.birthdateText, 'birthdateText'),
      R('出身地', String(p.birthplaceText || '').replace('：', ''), 'birthplaceText'),
      R('血液型', p.bloodType, 'bloodType'),
      R('一人称', p.pronoun, 'pronoun'),
      R('口調', p.speechText, 'speechText'),
      R('あだ名', p.nicknameText, 'nicknameText'),
    ] },

    { id: 'life', title: '暮らし・家族', open: true, rows: [
      R('結婚', p.maritalText, 'maritalText'),
      R('恋人', p.loverText, 'loverText'),
      R('家族構成', p.familyText, 'familyText'),
      R('同居', p.livingText, 'livingText'),
      R('住居', p.residenceText, 'residenceText'),
      R('出自', p.originText, 'originText'),
      R('学歴', p.educationText, 'educationText'),
      R('収入', p.incomeText, 'incomeText'),
      R('資産', p.assetText, 'assetText'),
    ] },

    { id: 'daily', title: '日常・嗜好', open: true, rows: [
      R('健康', p.healthText, 'healthText'),
      R('趣味', p.hobbyText, 'hobbyText'),
      R('マイブーム', p.myBoomText, 'myBoomText'),
      R('好物', p.foodLikeText, 'foodLikeText'),
      R('苦手', p.foodHateText, 'foodHateText'),
    ] },

    { id: 'mind', title: '内面', open: true, rows: [
      R('行動原理', p.principleText, 'principleText'),
      R('夢', p.innerDream, 'innerDream'),
      R('本音の欲望', p.innerDesire, 'innerDesire'),
      R('弱点', `${p.weaknessMind || ''}・${p.weaknessBody || ''}`, 'weaknessMind'),
      R('才能', p.innerTalent, 'innerTalent'),
      R('コンプレックス', p.complexText, 'complexText'),
      R('許せないこと', p.unforgivableText, 'unforgivableText'),
      R('好きな言葉', p.favoriteWordText, 'favoriteWordText'),
      R('コーデ基準', p.fashionSenseText, 'fashionSenseText'),
    ] },

    { id: 'fashion', title: 'ファッション', open: false, rows: [
      R('重視', p.fashionValueText, 'fashionValueText'),
      R('好きなブランド', `服は${p.favBrandText || '—'}・靴は${p.favShoeBrandText || '—'}`, 'favBrandText'),
      R('サイズ感', p.sizeFeelText, 'sizeFeelText'),
      R('丈感', p.hemPrefText, 'hemPrefText'),
      R('スラックス', `${p.slacksFitText || '—'}・${p.hemFinishText || '—'}`, 'slacksFitText'),
      R('基調色', `${p.baseColorText || '—'}（${p.colorSchemeText || '—'}）`, 'baseColorText'),
      R('靴下・買い替え', p.sockCycleText, 'sockCycleText'),
      R('靴下・内訳', p.sockDrawerText, 'sockDrawerText'),
      R('靴下・連続着用', p.sockWearText, 'sockWearText'),
      R('靴下・ニオイ', p.sockSmellText, 'sockSmellText'),
      R('靴下・悩み', p.sockTroubleText, 'sockTroubleText'),
      R('靴下・合わせ方', p.sockPairText, 'sockPairText'),
    ] },

    { id: 'past', title: '過去・人間関係', open: true, rows: [
      R('少年時代', p.pastUpbringing, 'pastUpbringing'),
      R('トラウマ', String(p.pastTrauma || '').replace(/^トラウマ：/, ''), 'pastTrauma'),
      R('思い出', p.memoryText, 'memoryText'),
      R('親友', String(p.friendText || '').replace(/〔.*?〕/, ''), 'friendText'),
      R('恋愛対象', p.loveTarget, 'loveTarget'),
      R('恋愛経験', p.loveCountText, 'loveCountText'),
    ] },

    { id: 'adult', title: 'オトナの事情', open: false, rows: [
      R('飲酒', p.drinkText, 'drinkText'),
      R('喫煙', p.smokeText, 'smokeText'),
      R('ギャンブル歴', p.gambleText, 'gambleText'),
      R('風俗経験', p.fuzokuText, 'fuzokuText'),
      R('初めての体験', p.firstExpText, 'firstExpText'),
      R('経験人数', p.expCountText, 'expCountText'),
      R('週頻度', `相手あり ${p.weekFreqText || '—'}・セルフ ${p.selfFreqText || '—'}`, 'weekFreqText'),
    ] },

    { id: 'outfit', title: '提案服装', open: false, rows: [
      R('職業服装', p.workUniform || `${p.outfitBrand || ''}・${p.outfitType || ''}`,
        'outfitType', 'outfitTypes'),
      R('ブランド', p.outfitBrand, 'outfitBrand', 'outfitBrands'),
      R('上着（平日）', p.jacket, 'jacket', 'jackets'),
      R('トップス（平日）', p.top, 'top', 'tops'),
      R('ボトムス（平日）', p.bottom, 'bottom', 'bottoms'),
      R('靴（平日）', p.shoes, 'shoes', 'shoes'),
      R('靴下', `${p.sockBrand || ''}・${p.sockColor || ''}・${p.sockType || ''}`,
        'sockType', 'sockTypes'),
      R('アクセサリー（平日）', j(p.accessories) || 'なし', 'accessories'),
      R('私服', p.holidayOutfitType, 'holidayOutfitType', 'outfitTypes'),
      R('上着（休日）', p.holidayJacket, 'holidayJacket', 'jackets'),
      R('トップス（休日）', p.holidayTop, 'holidayTop', 'tops'),
      R('ボトムス（休日）', p.holidayBottom, 'holidayBottom', 'bottoms'),
      R('靴（休日）', p.holidayShoes, 'holidayShoes', 'shoes'),
      R('アクセサリー（休日）', j(p.holidayAccessories) || 'なし', 'holidayAccessories'),
      R('着こなしメモ', p.holidayStyleNote || p.styleNote, 'holidayStyleNote'),
    ] },
  ];
}

/** カテゴリの色。見出しの帯と文字に使う。
 *  彩度を落とした同じ明度の9色。**どれも背景から浮きすぎない**ようにしてある。 */
export const HUE = {
  basic:   '#0a7d4a',   // 緑 — アプリの基調色
  abc:     '#1f6f8b',   // 藍
  body:    '#3a5fa5',   // 青
  gbasic:  '#5a55a3',   // 菫
  life:    '#8a4f9e',   // 紫
  daily:   '#a8497a',   // 梅
  mind:    '#b05545',   // 錆
  fashion: '#9a6b2f',   // 黄土
  past:    '#5f7a3a',   // 苔
  adult:   '#6b6b70',   // 鼠 — 目立たせない
  outfit:  '#2f7d7d',   // 青緑
};

/** 画面の3つの列への振り分け。左端 / 右端 */
export const LAYOUT = {
  left: ['basic', 'abc', 'body'],
  right: ['gbasic', 'life', 'daily', 'mind', 'fashion', 'past', 'adult', 'outfit'],
};
