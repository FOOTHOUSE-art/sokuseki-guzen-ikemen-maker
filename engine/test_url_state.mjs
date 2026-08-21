/* 共有URLの検査。詰めた顔が、URLだけで戻るか。 */
import { encodeState, decodeState, shareNote } from './url_state.js';
import { roll, ADJ0, normAdj } from './sokuseki.js';

let ng = 0;
const ok = (n, c, note='') => { console.log((c?'  OK  ':'  NG  ')+n+(note?'  '+note:'')); if(!c) ng++; };

// 従来の #3361465794 がそのまま読めること
const old = decodeState('#3361465794', ADJ0);
ok('従来のURLがそのまま読める', old.seed === 3361465794 &&
   Object.keys(old.ov).length === 0 && Object.keys(old.adj).length === 0);

// 画面の状態を往復させる
const ov = { cloth: 'none', eye: 'eyeA09_sanpaku', hair: 'hair05_spiky' };
const adj = Object.assign({}, ADJ0, { eyeGap: -24, eyeHeight: 0.75, lidDrop: 16,
  innerY: -12, browY: 19, faceW: 1.0 });
const url = encodeState({ seed: 3361465794, ov, adj, adj0: ADJ0, version: '0.9157' });
console.log('  URL: #' + url + `  (${url.length}文字)`);
const got = decodeState(url, ADJ0);

ok('シードが戻る', got.seed === 3361465794);
ok('固定した軸が戻る', JSON.stringify(got.ov) === JSON.stringify(
   Object.fromEntries(Object.keys(ov).sort().map(k => [k, ov[k]]))));
for (const k of ['eyeGap', 'eyeHeight', 'lidDrop', 'innerY', 'browY'])
  ok(`微調整が戻る「${k}」`, got.adj[k] === adj[k], String(got.adj[k]));
ok('既定と同じ軸は載らない', !('faceW' in got.adj) && !('eyeScale' in got.adj));
ok('版が載る', got.version === '0.9157');
ok('URLが短い', url.length < 160, url.length + '文字');

// 復元した状態で、同じ顔になること
const a = roll(3361465794, ov), b = roll(got.seed, got.ov);
ok('URLから同じ顔に戻る', JSON.stringify(a) === JSON.stringify(b));
const na = normAdj(Object.assign({}, ADJ0, adj));
const nb = normAdj(Object.assign({}, ADJ0, got.adj));
ok('URLから同じ微調整に戻る', JSON.stringify(na) === JSON.stringify(nb));

// 総当たりの往復。倍率と真偽値の取り違えを拾う
let bad = 0;
for (let i = 0; i < 300; i++) {
  const r = Math.random;
  const A = Object.assign({}, ADJ0);
  for (const k of Object.keys(ADJ0)) {
    const d = ADJ0[k];
    if (typeof d === 'boolean') A[k] = r() < 0.5;
    else if (typeof d === 'number') A[k] = d === 1 ? Math.round((0.8 + r() * 0.5) * 100) / 100
                                                   : Math.round((r() * 40 - 20));
  }
  const back = decodeState(encodeState({ seed: i, adj: A, adj0: ADJ0 }), ADJ0).adj;
  const merged = Object.assign({}, ADJ0, back);
  for (const k of Object.keys(ADJ0)) {
    if (typeof ADJ0[k] === 'string') continue;
    if (Math.abs((merged[k] === true ? 1 : merged[k] === false ? 0 : merged[k]) -
                 (A[k] === true ? 1 : A[k] === false ? 0 : A[k])) > 1e-9) bad++;
  }
}
ok('300通りの往復で値が変わらない', bad === 0, bad + '件ずれ');

ok('URLに載らないものを知らせる', shareNote([{}, {}], [{}]).includes('3'));
ok('何も無ければ黙っている', shareNote([], []) === '');

console.log('\n' + (ng ? `NG ${ng}件` : 'すべて通過'));
process.exit(ng ? 1 : 0);
