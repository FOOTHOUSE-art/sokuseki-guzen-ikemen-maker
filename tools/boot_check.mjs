#!/usr/bin/env node
/* boot_check.mjs — index.html を、DOM の代役を立てて最後まで走らせる。
 *
 *   node tools/boot_check.mjs
 *
 * **静的検査では取れない事故を取るため。** 実際にこれで3回踏んだ。
 *   ?v= の食い違い     → loader.js が二重に読まれ crop が null
 *   fetch のパス違い   → boot が途中で落ち、微調整も背景も作られない
 *   import の書き漏れ  → HUE is not defined で右端が空のまま
 *
 * どれも構文チェックにもファイル存在チェックにも出ない。**走らせるしかない。**
 * 合成そのものは代役のキャンバスなので確かめられない。**画面が組み上がるかだけ**を見る。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const { ids } = await import('./dom_stub.mjs');

const h = fs.readFileSync('index.html', 'utf8');
let js = h.slice(h.indexOf('<script type="module">') + 22, h.lastIndexOf('</script>'));
js = js.replace(/from '\.\//g, `from '${root}/`).replace(/from "\.\//g, `from "${root}/`);
const tmp = path.join(root, '.boot_check.mjs');
fs.writeFileSync(tmp, js);

let boom = null;
try { await import('file://' + tmp); } catch (e) { boom = e; }
await new Promise(r => setTimeout(r, 1500));
fs.unlinkSync(tmp);

const len = k => (ids.get(k)?.innerHTML || ids.get(k)?.value || ids.get(k)?.textContent || '').length;
const need = [
  ['adjBox', 2000, '微調整のスライダー'],
  ['bg', 100, '背景の選択肢'],
  ['edit', 500, '構成のセレクタ'],
  ['pfleft', 500, '左端の人物像'],
  ['pfright', 2000, '右端の人物像'],
  ['cardPrompt', 1000, '基準カードのプロンプト'],
];
let ng = boom ? 1 : 0;
if (boom) console.log('  NG  読み込みで落ちた  ' + boom.message);
for (const [k, min, ja] of need) {
  const n = len(k);
  const good = n >= min;
  if (!good) ng++;
  console.log(`  ${good ? 'OK' : 'NG'}  ${ja.padEnd(22)} ${n} 文字`);
}
// **人物像の手直しが画面に出るか。** 出ないことが実際にあった
//(buildBaseCard に person を渡し忘れていて、選び直しても値が変わらなかった)
{
  const before = ids.get('pfright')?.innerHTML || '';
  const g = globalThis;
  if (typeof g.__pfix === 'object' && typeof g.__redraw === 'function') {
    g.__pfix.role = '寿司職人';
    await g.__redraw();
    await new Promise(r => setTimeout(r, 400));
    const after = ids.get('pfleft')?.innerHTML || '';
    const good = after.includes('寿司職人');
    if (!good) { ng++; console.log('  NG  手直しが画面に出る  選び直しても値が変わらない'); }
    else console.log('  OK  手直しが画面に出る');
  } else {
    console.log('  --  手直しの確認  index.html が窓口を出していない');
  }
}

// **ボタンを実際に押してみる。** 付いているだけで動かないものが無いか。
// 「配線したつもり」を見つけるのはここしかない
const press = async (id, ja, check) => {
  const el = ids.get(id);
  if (!el || typeof el.onclick !== 'function') { ng++; console.log(`  NG  ${ja}  処理が付いていない`); return; }
  try {
    await el.onclick({ preventDefault() {} });
    await new Promise(r => setTimeout(r, 300));
    const msg = check ? check() : '';
    if (msg) { ng++; console.log(`  NG  ${ja}  ${msg}`); }
    else console.log(`  OK  ${ja}`);
  } catch (e) { ng++; console.log(`  NG  ${ja}  ${e.message}`); }
};

const store = await import('../engine/store.js?v=09300');
const el = id => { if (!ids.has(id)) return null; return ids.get(id); };
const before = store.all().length;
if (el('pfTitle')) el('pfTitle').value = '検査';
await press('pfSave', '保存', () => store.all().length > before ? '' : '増えていない');
await press('pfDb', '保存した人物…');
await press('copyCard', '基準カードを写す');
if (el('derivedType')) el('derivedType').value = 'フル設定資料シート';
await press('copyDerived', '派生を写す');
await press('pfReset', '編集を戻す');
await press('go', 'ガチャを回す', () => (ids.get('cardPrompt')?.value || '').length > 1000 ? '' : 'プロンプトが出ない');
await press('share', 'URLをコピー');
// 微調整の2つのボタン。押しても何も起きないことがあった
{
  const g = globalThis;
  const before = JSON.stringify(g.__adj ? g.__adj() : null);
  await press('adjZero', '完全初期化', () => {
    const a = g.__adj ? g.__adj() : null;
    return a && Object.values(a).some(v => typeof v === 'number' && v !== 0 && v !== 1)
      ? '既定に戻っていない' : '';
  });
  await press('adjSuggest', '提案に戻す');
}

// **保存 → 読み込みが往復するか。** db.html から送られてくるのと同じ形で試す
{
  const rec = store.all()[0];
  const g = globalThis;
  if (rec && typeof g.__pfix === 'object') {
    g.__pfix.role = '書き換え';
    await g.__redraw(); await new Promise(r => setTimeout(r, 300));
    // 保存した人物を読み直す
    if (typeof g.__load === 'function') await g.__load(rec);
    else { console.log('  --  保存した人物を開く  窓口が無い'); }
    await new Promise(r => setTimeout(r, 400));
    const now = ids.get('pfleft')?.innerHTML || '';
    now.includes('書き換え')
      ? (ng++, console.log('  NG  保存した人物を開く  編集が残ったまま'))
      : console.log('  OK  保存した人物を開く');
  }
}

const err = ids.get('err')?.textContent || '';
if (/失敗/.test(err)) { ng++; console.log('  NG  画面のエラー欄  ' + err); }
console.log(ng ? `\nNG ${ng}件` : '\n画面が組み上がった');
process.exit(ng ? 1 : 0);
