/* 手順6a + 2b の検査。即席の顔 → 語彙 → 層2への注入 が一本で通るか。 */
import fs from 'fs';
import { roll } from './sokuseki.js';
import { faceToJa, nearestPreset } from './face_text.js';
import { setSeed, setConfig, generateCharacter, pools } from './guzen.js';

const PRESETS = JSON.parse(fs.readFileSync(new URL('./face_presets.json', import.meta.url), 'utf8')).presets;
let ng = 0;
const ok = (n, c, note='') => { console.log((c?'  OK  ':'  NG  ')+n+(note?'  '+note:'')); if(!c) ng++; };

const build = (seed, adj = {}, ov = {}) => {
  const s = roll(seed, ov);
  const f = faceToJa(s, adj, PRESETS);
  setConfig({ face: f.inject, strictFace: true });
  setSeed(seed);
  return { s, f, c: generateCharacter('full') };
};

const { s, f, c } = build(2024);

const KEYS = ['facePreset','faceLine','eyelid','eyeShape','eyes','eyeBalance','tearBags',
  'eyebrow','eyebrowGap','nose','mouth','lips','mouthPos','faceSpacing','faceRatio',
  'faceAsym','skin','skinDetail','facialHair','hairStyle','hairColor','bangs',
  'hairFinish','hairVolume','glasses'];
const bad = KEYS.filter(k => c[k] !== f.inject[k]);
ok('層2の顔立ちが即席の値と一致する', bad.length === 0, bad.length ? '不一致: '+bad.join(',') : KEYS.length+'キー');

// 顔だけ変えたとき、人物側の顔立ちも追随すること
const b = build(2024, {}, { hair:'hair24_spiralperm', hairColor:'beju' });
ok('髪を変えると層2の髪も変わる', b.c.hairStyle === 'スパイラルパーマ' && b.c.hairColor === 'ミルクティーベージュ',
   b.c.hairStyle + ' / ' + b.c.hairColor);

// 顔を渡さなければ止まること(層2が勝手に顔を決めるのを防ぐ)
let threw = false;
try { setConfig({ strictFace: true }); setSeed(1); generateCharacter('full'); } catch(e){ threw = true; }
ok('顔を渡さないと例外になる', threw);

// 微調整のしきい値
const adj = { eyeGap:-14, browY:8, chinY:3, lipThick:1.12, eyeScale:1.06, mouthCorner:-6, faceW:0.95 };
const g = faceToJa(roll(7), adj, PRESETS);
ok('しきい値内(chinY 3)は書かれない', !/あご/.test(g.block));
ok('はっきり(eyeGap -14)が語になる', /目の間隔がはっきり狭い/.test(g.block));
ok('やや(eyeScale 1.06)が語になる', /目がやや大きい/.test(g.block));
ok('求心が層2に伝わる', /求心/.test(g.inject.faceSpacing), g.inject.faceSpacing);

// **名前は層2と共有の語彙。** 変えると偶然側の重みづけ(vibeProfile の
// facePresets、RARE_RULES の「普通顔×180cm+」など)が静かに外れる
const names = Object.keys(PRESETS);
ok('プリセット名が層2の語彙と一致する',
   names.length === pools.facePresets.length &&
   names.every(n => pools.facePresets.includes(n)),
   names.filter(n => !pools.facePresets.includes(n)).join(',') || names.length + '種');

// 35プリセットすべてで逆算が自分自身に戻るか
let hit = 0;
for (const [name, p] of Object.entries(PRESETS)) {
  const st = roll(1, p.fix);
  if (nearestPreset(st, PRESETS) === name) hit++;
}
ok('プリセットの逆算が自分に戻る', hit >= 30, hit + '/35');

console.log('\n--- 例(seed 2024) ---');
console.log('顔立ち:', f.nearest);
console.log(f.block);
console.log('\n層2へ渡した値(抜粋):', JSON.stringify({
  facePreset:f.inject.facePreset, hairStyle:f.inject.hairStyle, hairColor:f.inject.hairColor,
  eyelid:f.inject.eyelid, eyeShape:f.inject.eyeShape, skin:f.inject.skin, glasses:f.inject.glasses
}, null, 0));
console.log('人物:', c.name, c.age+'歳', c.nationality, c.role, c.height, c.bodyType);
console.log(ng ? `\nNG ${ng}件` : '\n顔の橋渡し: すべて通過');

/* 決定H: 顔の雰囲気を保ったまま年齢の顔にする */
import { ageFaceNote, refPrefixFace, BASE_AGE } from './face_text.js';
console.log('\n--- 決定H 年齢 ---');
let ng2 = 0;
const ok2 = (n, c, note='') => { console.log((c?'  OK  ':'  NG  ')+n+(note?'  '+note:'')); if(!c) ng2++; };
ok2('基準の幅(25歳)では何も足さない', ageFaceNote(25) === '');
ok2('19歳は若い側の指定が出る', /張り/.test(ageFaceNote(19)));
ok2('35歳は笑いじわだけ', /笑いじわ/.test(ageFaceNote(35)) && !/ほうれい線/.test(ageFaceNote(35)));
ok2('47歳で白髪が混じる', /白髪/.test(ageFaceNote(47)));
ok2('65歳は首のしわまで', /首のしわ/.test(ageFaceNote(65)));
for (const a of [18, 25, 33, 45, 55, 70]) {
  const n = ageFaceNote(a);
  ok2(`${a}歳の指定が一意に決まる`, typeof n === 'string');
}
// 顔と年齢が離れた組み合わせで、前置きが年齢を明示するか
const pf = refPrefixFace({ age: 58, collar: true });
ok2('前置きに年齢が入る', /58歳の顔として/.test(pf));
ok2('前置きが別人化を止める', /別人にしない/.test(pf));
ok2('前置きが襟元を除外する', /襟元/.test(pf));
console.log('\n' + refPrefixFace({ age: 58, collar: true }).trim());
console.log(ng2 ? `\nNG ${ng2}件` : '\n年齢: すべて通過');
process.exit(ng + ng2 ? 1 : 0);
