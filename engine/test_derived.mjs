/* 手順8の検査。基準カードから派生プロンプトへつながるか。 */
import fs from 'fs';
import { buildBaseCard, DERIVED_TYPES } from './base_card.mjs';
import { setPresets } from './base_card.mjs';

setPresets(JSON.parse(fs.readFileSync(new URL('./face_presets.json', import.meta.url), 'utf8')));

let ng = 0;
const ok = (n, c, note='') => { console.log((c?'  OK  ':'  NG  ')+n+(note?'  '+note:'')); if(!c) ng++; };

const r = buildBaseCard({ seed: 2024 });

// 決定f: 17種すべて出す
const TYPES = DERIVED_TYPES;
const outs = TYPES.map(t => [t, r.derived(t)]);

ok('派生が全種類できる', outs.every(([, p]) => p && p.length > 300),
   TYPES.length + '種');
ok('種類ごとに中身が違う', new Set(outs.map(([, p]) => p)).size === TYPES.length);
ok('すべて参照画像前提になっている',
   outs.every(([, p]) => p.includes('添付した基準リファレンスカード')));
// トレーディングカードは buildPrompt を通らない別経路。単体モードで顔が落ちる
ok('単体モードでも全種類に顔が入る',
   TYPES.every(t => r.derived(t, '単体で完結（フル記述）').includes(r.block.slice(0, 20))));
ok('使い方の注記が付く', outs[0][1].includes('基準リファレンスカードで生成した画像を添付'));
ok('英語が混ざっていない', !/\b(Create|Generate the EXACT|He wears)\b/.test(outs[0][1]));
ok('同じシードで同じ派生になる',
   buildBaseCard({ seed: 2024 }).derived('フル設定資料シート') === r.derived('フル設定資料シート'));

// 単体で完結モードでは、基準カード前提の前置きが消えること
const solo = r.derived('人物ポスター（職業・人物像）', '単体で完結（フル記述）');
ok('単体モードでは前置きが消える', !solo.includes('添付した基準リファレンスカード'));

// 決定I。国籍も人種も日本で固定。舞台も日本になること
const nats = [], eths = [];
for (let i = 0; i < 60; i++) { const x = buildBaseCard({ seed: i }); nats.push(x.person.nationality); eths.push(x.person.ethnicity); }
ok('国籍が日本で固定されている', nats.every(n => n === '日本'));
ok('人種が素材に合わせて固定されている', eths.every(e => e === '日本人'));
ok('舞台が日本になっている', !/舞台は(?!日本)/.test(buildBaseCard({ seed: 3 }).prompt));

console.log('\n' + (ng ? `NG ${ng}件` : 'すべて通過'));
process.exit(ng ? 1 : 0);
