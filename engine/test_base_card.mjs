/* 手順6b・6c の検査。基準カードのプロンプトが、即席の顔で組めているか。 */
import fs from 'fs';
import { buildBaseCard } from './base_card.mjs';
import { setPresets } from './base_card.mjs';
import { faceToJa } from './face_text.js';

setPresets(JSON.parse(fs.readFileSync(new URL('./face_presets.json', import.meta.url), 'utf8')));

let ng = 0;
const ok = (n, c, note='') => { console.log((c?'  OK  ':'  NG  ')+n+(note?'  '+note:'')); if(!c) ng++; };

const r = buildBaseCard({ seed: 2024 });
const p = r.prompt;

ok('前置きが先頭にある', p.startsWith('【参照画像あり・重要】'));
ok('即席の顔がそのまま入っている', p.includes('【顔】' + r.block));

// 偶然の顔の語彙が残っていないこと。残っていたら差し替えが効いていない
for (const w of ['年齢感は' + r.person.ageAppearance, 'フェイスラインは', '涙袋は', '基本表情は', '目鼻口の比率は', '髪は' + r.person.hairColor])
  ok(`偶然の顔の語彙が消えている「${w}」`, !p.includes(w));

// 決定D。基準カードの構成をそのまま引き継いでいること
for (const w of ['全身の前面・側面', '顔正面（歯が見える）', '足裏', '情報欄',
                 '斜め45度', '笑顔にしない'])
  ok(`基準カードの要素が残っている「${w}」`, p.includes(w));
// 基準服装(下着)は年代設定で品目が変わる。品目名ではなく形で見る
ok('基準服装が下着だけになっている', /基準服装は.{2,30}のみ。/.test(p),
   (p.match(/基準服装は.{2,30}のみ。/) || [''])[0]);

// 決定D §4-3。非性的の担保を縮めていないこと
for (const w of ['非性的', '即物的', '性的な演出・強調・ポーズは一切しない', '未成年'])
  ok(`非性的の担保が残っている「${w}」`, p.includes(w));

// 決定E。基準カードは無地スタジオ固定
ok('背景が無地に固定されている', p.includes('シンプルなグレーバック'));

// 決定B。顔参照画像の襟元は文章に出さない
ok('襟元の服が本文に混ざっていない', !p.includes(r.collar), r.collar);

// 6d の反映。実写化の指示が入っていること
for (const w of ['生物学的リアリズム', '毛穴', '陶器のように均一に滑らか', '歯並びは',
                 '85mm相当', '虹彩には放射状の繊維', '線の引き方・塗り・陰影の付け方は写真に置き換える'])
  ok(`実写化の指示が入っている「${w.slice(0,10)}」`, p.includes(w));
ok('画質が写真寄りになっている', p.includes('AI感を抑えた自然写真'));
// k: teethLine の「歯は笑ったときに自然に見える範囲でのみ」は、歯のパネルの
// 指示と喧嘩する。出力形式の但し書きに一本化したので、1回だけのはず
ok('歯の但し書きが1か所だけ',
   (p.match(/歯は笑ったときに自然に見える範囲/g) || []).length === 1);
// 年齢は向きを書かない
ok('年齢の向きを書いていない', !/年を重ねた|若いころ/.test(p));

// 決定C。日本語・ChatGPT向け
ok('英語が混ざっていない', !/\b(Create|reference card|He wears)\b/.test(p));
ok('ChatGPT向けの指示が入っている', p.includes('画像内の文字は指定どおり正確に描き'));

// 再現性
const a = buildBaseCard({ seed: 777 }), b = buildBaseCard({ seed: 777 });
ok('同じシードで同じプロンプトになる', a.prompt === b.prompt);
ok('別のシードでは変わる', a.prompt !== p);

// 決定H。年齢が高いと顔に差分が入る
const old = buildBaseCard({ seed: 4, initial: { ageMin: 56, ageMax: 60 } });
ok('高齢だと年齢の差分が入る', /白髪|しわ/.test(old.prompt) && old.person.age >= 56,
   old.person.age + '歳');
const young = buildBaseCard({ seed: 4, initial: { ageMin: 24, ageMax: 27 } });
ok('基準の幅なら差分を足さない', young.prompt.includes('画像のままの年齢感で描く'),
   young.person.age + '歳');

// 顔を変えるとプロンプトの顔も変わる
const g = buildBaseCard({ seed: 2024, ov: { hair: 'hair24_spiralperm' } });
ok('髪を変えるとプロンプトも変わる', /スパイラルパーマ/.test(g.prompt));
// 微調整が語になってプロンプトに出る
const adj = buildBaseCard({ seed: 2024, adj: { eyeGap: -14, chinY: 9 } });
ok('微調整が語になって入る', /目の間隔がはっきり狭い/.test(adj.prompt) && /あごがはっきり長い/.test(adj.prompt));

console.log('\n' + (ng ? `NG ${ng}件` : 'すべて通過') +
  `   プロンプト ${p.length}文字 / 顔 ${r.block.length}文字`);
process.exit(ng ? 1 : 0);
