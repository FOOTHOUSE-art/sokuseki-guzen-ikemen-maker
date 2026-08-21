#!/usr/bin/env node
/* preflight.mjs — 上げる前に、手元で全部を通す。
 *
 *   node tools/preflight.mjs
 *
 * GitHub Actions が走らせるものと同じことを、先に手元でやる。
 * ここが緑なら向こうも緑になる。python が無い環境ではその項目だけ飛ばす。
 */
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const R = { ok: 0, ng: 0, skip: 0 };
const line = (mark, name, note = '') =>
  console.log(`  ${mark}  ${name}${note ? '  ' + note : ''}`);
const ok = (n, note) => { R.ok++; line('OK  ', n, note); };
const ng = (n, note) => { R.ng++; line('NG  ', n, note); };
const skip = (n, note) => { R.skip++; line('--  ', n, note); };

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'pipe', encoding: 'utf8' });
const has = cmd => { try { execSync(process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`, { stdio: 'ignore' }); return true; } catch { return false; } };

console.log('\n■ 検査');
for (const f of fs.readdirSync('engine').filter(f => /^test_.*\.mjs$/.test(f)).sort()) {
  try { run(process.execPath, [path.join('engine', f)]); ok(f); }
  catch (e) {
    const out = (e.stdout || '') + (e.stderr || '');
    ng(f, (out.match(/^\s*NG\s+.*$/m) || [''])[0].trim());
  }
}

console.log('\n■ 顔立ちプリセット');
const py = has('python3') ? 'python3' : has('python') ? 'python' : null;
if (!py) skip('verify_presets.py', 'python が見つからない');
else {
  try {
    const out = run(py, ['tools/verify_presets.py', 'engine/face_presets.json', 'engine/parts.json']);
    const bad = /不整合 (\d+)件/.exec(out);
    const near = /70% 以上の組: (\d+)件/.exec(out);
    if (bad && bad[1] !== '0') ng('素材IDとの突き合わせ', bad[1] + '件の不整合');
    else ok('素材IDとの突き合わせ', '35種 / 不整合0');
    if (near && near[1] !== '0') ng('似すぎたプリセット', near[1] + '組が70%以上');
    else ok('似すぎたプリセット', '70%以上なし');
  } catch (e) { ng('verify_presets.py', String(e.status)); }
}

console.log('\n■ コマンド');
const cli = [
  ['基準カード', ['engine/make_prompt.mjs', '2024']],
  ['一式', ['engine/make_prompt.mjs', '2024', '--all']],
  ['派生20種', ['engine/make_prompt.mjs', '2024', '--derived', 'all']],
  ['状態ファイル', ['engine/make_prompt.mjs', '--state', 'samples/state_3361465794.json']],
  ['一覧', ['engine/make_prompt.mjs', '--list']],
];
for (const [name, args] of cli) {
  try {
    const out = run(process.execPath, args);
    if (out.length < 100) ng(name, '出力が短い(' + out.length + '文字)');
    else if (/undefined|NaN|\[object/.test(out)) ng(name, 'undefined か NaN が混ざっている');
    else ok(name, out.length.toLocaleString() + '文字');
  } catch (e) { ng(name, (e.stderr || '').split('\n')[0]); }
}

console.log('\n■ 書いたものの整合');
// docs と README の相対リンクが、実在するファイルを指しているか
const mds = ['README.md', 'LICENSE.md', 'engine/README.md',
  ...fs.readdirSync('docs').map(f => path.join('docs', f))];
const broken = [];
for (const md of mds) {
  const text = fs.readFileSync(md, 'utf8');
  for (const m of text.matchAll(/`([A-Za-z0-9_./-]+\.(?:md|mjs|js|json|py|html|yml))`/g)) {
    const rel = m[1];
    if (rel.startsWith('./') || rel.includes('/') || /^[A-Za-z0-9_-]+\.(md|mjs|js|json|py|html|yml)$/.test(rel)) {
      const cands = [rel, path.join('engine', rel), path.join('docs', rel),
        path.join('tools', rel), path.join('samples', rel), path.join('.github/workflows', rel)];
      // 即席メーカー本体にあるものは、このリポジトリには無くてよい
      const external = /^assets\/|index\.html|app\.js|engine\.js|warp\.js|loader\.js|serve\.py|start\.bat|pipeline_v18\.py|src_normalize\.py|warp_outline\.py|HANDOVER|PLAN_integration|KNOWLEDGE|card\.txt|state\.json|package-lock/;
      if (!cands.some(c => fs.existsSync(c)) && !external.test(rel))
        broken.push(`${md} → ${rel}`);
    }
  }
}
broken.length ? ng('ドキュメントの参照', broken.slice(0, 5).join(' / ')) : ok('ドキュメントの参照', mds.length + 'ファイル');

// 生成物が、生成した時のまま残っているか(手で編集していないか)の目印
for (const f of ['engine/guzen.js', 'engine/sokuseki.node.js']) {
  const head = fs.readFileSync(f, 'utf8').slice(0, 400);
  head.includes('機械生成') && head.includes('手で編集しない')
    ? ok(path.basename(f), '生成物の断り書きがある')
    : ng(path.basename(f), '断り書きが消えている。手で編集していないか');
}

console.log('\n■ 上げるもの');
if (!has('git')) skip('git status', 'git が見つからない');
else {
  try { run('git', ['rev-parse', '--is-inside-work-tree']); } catch { /* まだ init していない */ }
  try {
    const files = run('git', ['status', '--porcelain', '-uall'])
      .split('\n').filter(Boolean).map(l => l.slice(3));
    const bad = files.filter(f => /^assets\/|\.zip$|^ikemen_v|^build\/|^node_modules\//.test(f));
    bad.length ? ng('入れないものが混ざっている', bad.slice(0, 4).join(' '))
               : ok('入れないものが無い', files.length + 'ファイルが対象');
  } catch { skip('git status', 'まだ git init していない'); }
}

// 隠しファイル。ブラウザからのアップロードで落ちやすい
// GitHub Pages で動かすのに要るもの
for (const f of ['index.html', 'db.html', 'app.js', 'engine.js', 'assets/parts.json',
                 'engine/sokuseki.js', '.nojekyll'])
  fs.existsSync(f) ? ok(f) : ng(f, '無い');

// ブラウザから読む先が実在するか。**GitHub は大文字小文字を区別する**
{
  const h = fs.readFileSync('index.html', 'utf8');
  const miss = [...h.matchAll(/from '(\.\/[A-Za-z0-9_./]+?)(?:\?|')/g)]
    .map(m => m[1]).filter(p => !fs.existsSync(p));
  miss.length ? ng('index.html の読み込み先', miss.join(' ')) : ok('index.html の読み込み先');
  // ?v= を据え置くと、Pages のキャッシュで古い JS を掴む
  /\?v=09157/.test(h) ? ng('?v= が古いまま') : ok('?v= が今の版');
}

for (const f of ['.gitignore', '.github/workflows/test.yml'])
  fs.existsSync(f) ? ok(f) : ng(f, '無い。ブラウザで上げると落ちやすい');

console.log(`\n${R.ng ? `NG ${R.ng}件。直してからにする` : '通った。上げてよい'}` +
  `　(OK ${R.ok} / 飛ばした ${R.skip})\n`);
process.exit(R.ng ? 1 : 0);
