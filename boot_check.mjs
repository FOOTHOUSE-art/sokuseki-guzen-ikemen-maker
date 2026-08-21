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
const err = ids.get('err')?.textContent || '';
if (/失敗/.test(err)) { ng++; console.log('  NG  画面のエラー欄  ' + err); }
console.log(ng ? `\nNG ${ng}件` : '\n画面が組み上がった');
process.exit(ng ? 1 : 0);
