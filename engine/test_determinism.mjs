/* 手順1〜3の完了条件を機械で確かめる。 */
import { setSeed, setConfig, generateCharacter, pools } from './guzen.js';
import fs from 'fs';

const META = ['createdAt'];   // 生成時刻。人物の内容ではない
const body = c => { const o = {...c}; META.forEach(k => delete o[k]); return JSON.stringify(o); };
const gen = (s, cfg = {}) => { setConfig(cfg); setSeed(s); return generateCharacter('full'); };

let ng = 0;
const check = (name, ok, note = '') => { console.log((ok ? '  OK  ' : '  NG  ') + name + (note ? '  ' + note : '')); if (!ok) ng++; };

const a = gen(12345), b = gen(12345), c = gen(99999);
check('同じシードで完全に一致する', body(a) === body(b));
check('別のシードでは変わる', body(a) !== body(c));
check('IDもシードから決まる', a.id === b.id, a.id);

// 途中に別のシードを挟んでも戻れること(山札やカーソルが残っていないか)
gen(777); const a2 = gen(12345);
check('別の生成を挟んでも同じ結果に戻る', body(a) === body(a2));

// 連続生成の2人目も再現すること
setConfig({}); setSeed(555); const p1 = generateCharacter('full'), p2 = generateCharacter('full');
setConfig({}); setSeed(555); const q1 = generateCharacter('full'), q2 = generateCharacter('full');
check('連続生成の2人目まで再現する', body(p1) === body(q1) && body(p2) === body(q2));

check('固定の指定が効く', gen(1, { fixed: { nationality: 'イタリア' } }).nationality === 'イタリア');
check('初期設定の指定が効く', gen(2, { initial: { eraYear: '1975' } }).eraYear === '1975');

const src = fs.readFileSync(new URL('./guzen.js', import.meta.url), 'utf8');
check("Math.random が残っていない", !/Math\.random/.test(src));
// 文字列の中の 'document' は数えない(英語のプロンプト文に出てくる)
const codeOnly = src.replace(/`[^`]*`/g, '``').replace(/'[^'\n]*'/g, "''").replace(/"[^"\n]*"/g, '""');
check('DOM を読んでいない', !/document\./.test(codeOnly));

const FACE = 'facePresets faceLines faceRatios faceSpacings faceAsyms eyes eyeShapes eyelids eyeBalances eyelashes eyeBagsPool tearBags eyebrows eyebrowDensities eyebrowGaps eyebrowGrooms browRidges nose mouth lips lipTones mouthPos jawChins jawAngles foreheads cheeks dimples moles ears hairStyles hairColors hairTextures hairFinishes hairVolumes hairlines bangs skin skinDetails glasses facialHair facialHairGrooms ageLooks'.split(' ');
// 手順2b は「消す」ではなく「注入する」。顔立ちの語彙は、渡されなかったときの
// 保険として pools に残す。層2が勝手に顔を決めないことは strictFace で担保する
// (検査は test_face_bridge.mjs 側)。
const inPools = FACE.filter(k => k in pools);
console.log('\n  --  pools に残した顔立ちの語彙(保険) ' + inPools.length + 'キー');

console.log(`\n手順1〜3: ${ng ? 'NG ' + ng + '件' : 'すべて通過'}   人物のキー数 ${Object.keys(a).length}`);
console.log(`例: ${a.name} / ${a.age}歳 / ${a.nationality} / ${a.role} / ${a.height} / ${a.bodyType}`);
process.exit(ng ? 1 : 0);
