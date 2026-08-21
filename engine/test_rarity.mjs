/* 手順7の検査。顔と人物像のレア判定を足しても、二重にならないか。 */
import fs from 'fs';
import { buildBaseCard } from './base_card.mjs';
import { setPresets } from './base_card.mjs';
import { judge, DROP, lines, pointOf } from './rarity.js';
import { rarityBreakdown } from './guzen.js';

setPresets(JSON.parse(fs.readFileSync(new URL('./face_presets.json', import.meta.url), 'utf8')));

let ng = 0;
const ok = (n, c, note='') => { console.log((c?'  OK  ':'  NG  ')+n+(note?'  '+note:'')); if(!c) ng++; };

const N = 400;
const runs = [];
for (let i = 0; i < N; i++) {
  const r = buildBaseCard({ seed: i });
  runs.push({ r, j: judge(r.face, r.person) });
}

// 常に当たる規則が残っていないか。残っていれば全員に同じ点が乗るだけ
const fire = {};
for (const { j } of runs) for (const h of j.hits) fire[h.label] = (fire[h.label] || 0) + 1;
const always = Object.entries(fire).filter(([, n]) => n === N).map(([l]) => l);
ok('常に当たる規則が無い', always.length === 0, always.join(','));

// 落とすと決めた規則が本当に出ていないか
const leaked = Object.keys(DROP).filter(l => fire[l]);
ok('落とした規則が漏れていない', leaked.length === 0, leaked.join(','));

// 同じ特徴を顔と人物の両方から数えていないか
const pairs = [['ほくろ', '泣きぼくろ'], ['明るい髪色', '明色髪'], ['そばかす', 'レアな肌の特徴']];
const dbl = pairs.filter(([a, b]) => fire[a] && fire[b]);
ok('同じ特徴を二重に数えていない', dbl.length === 0, dbl.map(p => p.join('×')).join(','));

// 顔由来の点は即席からだけ出ること
const faceLabels = new Set(runs.flatMap(x => x.j.hits.filter(h => h.from === '顔').map(h => h.label)));
ok('顔のレアは即席が出している', faceLabels.size > 0, [...faceLabels].join(','));

// イケメン度は実測(即席)であること。分布が引き継ぎ資料と合うか
const iv = runs.map(x => x.j.ikemen).sort((a, b) => a - b);
const med = iv[Math.floor(iv.length / 2)];
ok('イケメン度の中央が資料どおり(77前後)', Math.abs(med - 77) <= 3, '中央 ' + med);
ok('イケメン度の幅が資料どおり(51〜93)', iv[0] >= 48 && iv[iv.length-1] <= 95,
   iv[0] + '〜' + iv[iv.length-1]);

// 点の変換。確率が小さいほど高い
ok('確率が小さいほど点が高い', pointOf(0.033) > pointOf(0.25) && pointOf(0.25) >= 2,
   `p=0.033→${pointOf(0.033)}pt / p=0.25→${pointOf(0.25)}pt`);

// 段の分布。LEGEND が出すぎ / 出なさすぎでないか
const R = {};
for (const { j } of runs) R[j.rank] = (R[j.rank] || 0) + 1;
const leg = (R['LEGEND'] || 0) / N;
ok('LEGEND が 0〜8%に収まる', leg <= 0.08, (leg * 100).toFixed(1) + '%');
ok('NORMAL が半分を超えない', (R['NORMAL'] || 0) / N <= 0.5,
   ((R['NORMAL'] || 0) / N * 100).toFixed(0) + '%');

// 再現性
const a = judge(...[buildBaseCard({ seed: 55 })].map(x => [x.face, x.person]).flat());
const b = judge(...[buildBaseCard({ seed: 55 })].map(x => [x.face, x.person]).flat());
ok('同じシードで同じ判定になる', a.score === b.score && a.rank === b.rank);

console.log('\n段の分布: ' + Object.entries(R).sort((x,y)=>y[1]-x[1])
  .map(([k, n]) => `${k} ${(n/N*100).toFixed(0)}%`).join(' / '));
const ex = runs.find(x => x.j.rank === 'SUPER RARE') || runs[0];
console.log(`\n例: ${ex.r.person.name} ${ex.r.person.age}歳 / ${ex.j.rank} ${ex.j.score}pt / ` +
  `イケメン度 ${ex.j.ikemen} ${ex.j.ikemenRank}`);
console.log(lines(ex.j).map(s => '  ' + s).join('\n'));
console.log('\n' + (ng ? `NG ${ng}件` : 'すべて通過'));
process.exit(ng ? 1 : 0);
