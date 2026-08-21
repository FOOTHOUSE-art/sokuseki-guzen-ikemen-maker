#!/usr/bin/env node
/* make_prompt.mjs — シードを渡すと、基準カードのプロンプトを出す。
 *
 *   node make_prompt.mjs 2024                     画面に出す
 *   node make_prompt.mjs 2024 > card.txt          ファイルに落とす
 *   node make_prompt.mjs 2024 --all               プロフィール文とレア判定も出す
 *   node make_prompt.mjs 2024 --derived 表情差分リファレンスシート
 *   node make_prompt.mjs 2024 --derived all      派生20種をまとめて出す
 *   node make_prompt.mjs --list                  派生の種類を並べる
 *   node make_prompt.mjs 2024 --age 58            年齢を指定する
 *   node make_prompt.mjs --state state.json       画面の状態をそのまま渡す
 *   node make_prompt.mjs                          シードを乱数で選ぶ
 *
 * --state に渡す JSON は { seed, ov, adj } の形。ov は「構成」の各軸、
 * adj は「微調整」。画面の URL をコピーしたものと同じ内容を手で書ける。
 */
import fs from 'fs';
import { buildBaseCard, DERIVED_TYPES } from './base_card.mjs';
import { setPresets } from './base_card.mjs';
import { judge, lines } from './rarity.js';

setPresets(JSON.parse(fs.readFileSync(new URL('./face_presets.json', import.meta.url), 'utf8')));

const argv = process.argv.slice(2);
const flag = n => { const i = argv.indexOf(n); return i < 0 ? null : (argv[i + 1] ?? true); };
const statePath = flag('--state');
const st = statePath && statePath !== true
  ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
const seed = Number(argv[0]) || st.seed || Math.floor(Math.random() * 1e9);
const age = Number(flag('--age')) || 0;
const derived = flag('--derived');
const all = argv.includes('--all');

const initial = Object.assign({}, st.initial, age ? { ageMin: age, ageMax: age } : {});
if (argv.includes('--list')) {
  DERIVED_TYPES.forEach((t, i) => console.log(String(i + 1).padStart(2) + '. ' + t));
  process.exit(0);
}

const r = buildBaseCard({ seed, initial, fixed: st.fixed || {},
                          ov: st.ov || {}, adj: st.adj || {} });

if (derived === 'all') {
  DERIVED_TYPES.forEach((t, i) => {
    console.log('='.repeat(60));
    console.log((i + 1) + '. ' + t);
    console.log('='.repeat(60));
    console.log(r.derived(t));
    console.log();
  });
} else if (derived && derived !== true) {
  console.log(r.derived(derived));
} else if (!all) {
  console.log(r.prompt);
} else {
  const j = judge(r.face, r.person);
  const out = [];
  out.push(`# seed ${seed}`);
  out.push(`顔立ち: ${r.nearest} / 襟元(画像のみ): ${r.collar}`);
  out.push(`人物: ${r.person.name} ${r.person.age}歳 ${r.person.nationality} ${r.person.role}`);
  out.push(`イケメン度: ${j.ikemen} (${j.ikemenRank}) / レア: ${j.rank} ${j.score}pt`);
  out.push(lines(j).map(s => '  ' + s).join('\n'));
  out.push('');
  out.push('## 顔の記述(即席の素材IDから)');
  out.push(r.block + (r.aging ? '\n' + r.aging : ''));
  out.push('');
  out.push('## 基準リファレンスカードのプロンプト');
  out.push(r.prompt);
  console.log(out.join('\n'));
}
