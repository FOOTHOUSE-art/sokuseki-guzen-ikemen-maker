/* 素材と語彙の突き合わせ。**素材を足したり差し替えたりしたとき、ここが落ちる。**
 * 語彙が無い素材が選ばれると、プロンプトに undefined が混ざる。
 * 生成AIには意味が通らないうえ、画面を見ただけでは気づきにくい。 */
import fs from 'fs';
import { JA } from './face_text.js';
import { faceToJa } from './face_text.js';
import { roll } from './sokuseki.js';

const A = JSON.parse(fs.readFileSync(new URL('./parts.json', import.meta.url), 'utf8')).axes;
const PRESETS = JSON.parse(fs.readFileSync(new URL('./face_presets.json', import.meta.url), 'utf8')).presets;
const MET = JSON.parse(fs.readFileSync(new URL('./metrics.json', import.meta.url), 'utf8'));
const CROP = JSON.parse(fs.readFileSync(new URL('./crop.json', import.meta.url), 'utf8'));

let ng = 0;
const ok = (n, c, note='') => { console.log((c?'  OK  ':'  NG  ')+n+(note?'  '+note:'')); if(!c) ng++; };
const ids = k => (A[k].options || []).map(o => o.id);
const strip = (v, re) => v.replace(re, '');

/* 1. 素材IDに日本語があるか */
const miss = [];
const chk = (label, list, get) => list.forEach(id => { if (id !== 'none' && !get(id)) miss.push(label + '/' + id); });
chk('outline', ids('outline'), id => JA.outline[id]);
chk('hair', ids('hair'), id => JA.hair[id]);
chk('glass', ids('glass'), id => JA.glass[id]);
chk('nose', ids('nose'), id => JA.nose[strip(id, /^nose\d+_/)]);
chk('mouth', ids('mouth'), id => JA.mouth[strip(id, /^mouth\d+_/)]);
chk('eye', ids('eye'), id => JA.eyeShape[strip(id, /^eye[ABC]\d+_/)]);
chk('brow', A.brow.options.map(o => o.id), id => JA.brow[strip(id, /^\d+_/)]);
chk('hairColor', ids('hairColor'), id => JA.hairColor[id]);
chk('cloth', ids('cloth'), id => JA.cloth[id]);
chk('tear', ids('tear'), id => JA.tear[id]);
chk('beard', ids('beard'), id => JA.beard[id]);
chk('skinTone', A.skinTone.options.map(o => o.id), id => JA.tone[id]);
ok('すべての素材に日本語がある', miss.length === 0, miss.join(', '));

/* 2. metrics.json に実測があるか。無いとイケメン度と変形が狂う */
const m = [];
ids('outline').forEach(id => { if (!MET.outline[id]) m.push('outline/' + id); });
ids('eye').forEach(id => { if (!MET.eye[id]) m.push('eye/' + id); });
ids('nose').forEach(id => { if (!MET.nose[id]) m.push('nose/' + id); });
ids('mouth').forEach(id => { if (!MET.mouth[id]) m.push('mouth/' + id); });
ok('すべての素材に実測がある', m.length === 0, m.join(', '));

/* 3. crop.json にあるか。無いと読み込みで落ちてアプリ全体が止まる */
const c = [];
ids('outline').forEach(id => { if (!CROP['01_face/face_' + id + '.webp']) c.push('face_' + id); });
ids('hair').forEach(id => { if (!CROP['11_hair/' + id + '.webp']) c.push(id); });
ids('nose').forEach(id => { if (!CROP['03_nose/' + id + '.webp']) c.push(id); });
ids('mouth').forEach(id => { if (!CROP['04_mouth/' + id + '.webp']) c.push(id); });
ok('すべての素材が crop.json にある', c.length === 0, c.join(', '));

/* 4. 実際に全部の軸を一周させて、undefined が混ざらないか */
const holes = [];
const sweep = (axis, list) => list.forEach(id => {
  const s = roll(1, { [axis]: id });
  const b = faceToJa(s, {}, PRESETS).block;
  if (/undefined|NaN/.test(b)) holes.push(axis + '/' + id);
});
['outline', 'eye', 'nose', 'mouth', 'hair', 'hairColor', 'glass', 'tear', 'beard', 'cloth']
  .forEach(ax => sweep(ax, ids(ax)));
sweep('browShape', A.brow.options.map(o => o.id));
ok('全素材を一周して undefined が出ない', holes.length === 0, holes.join(', '));

console.log('\n' + (ng ? `NG ${ng}件` : 'すべて通過') +
  `　素材 ${Object.keys(CROP).length}点 / 軸 ${Object.keys(A).length}`);
process.exit(ng ? 1 : 0);
