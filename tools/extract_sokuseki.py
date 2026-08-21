#!/usr/bin/env python3
"""即席の `app.js` から、抽選・イケメン度・レア判定だけを切り出して
node で動く `sokuseki.js` を作る。

  python3 tools/extract_sokuseki.py app.js

**手で写さない。** 手で写すと `app.js` と二重に持つことになり、片方だけ直して
「直った」と誤認する(引き継ぎ資料 §5-6 で実際に起きた)。ここは生成物にして、
`app.js` を直したら流し直す。

ブラウザでは、この生成物のかわりに1行の再輸出を置く(`sokuseki.browser.js`)。
`base_card.mjs` と `rarity.js` は、どちらでも同じ名前で読める。

切り出す入口:
  roll / ikemenScore / rank / rarity / normAdj / geometry / ADJ0
合成(engine.js / warp.js / loader.js)には触らない。だから node で動く。
"""
import re
import sys

sys.path.insert(0, '.')
from extract_person import split_declarations, strip_code

ROOTS = ['roll', 'ikemenScore', 'rank', 'rarity', 'normAdj', 'geometry', 'ADJ0']

# 識別子を拾う方式なので、**関数の中のローカル変数と同じ名前のトップレベル宣言**を
# 巻き込む。`geometry` の中の `const C = chin - noseBase;`(人中の長さ)が、
# トップレベルの `const C = new E.Compositor();`(合成器)を連れてきていた。
# 合成器は engine を要求するので node で落ちる。名前で外す。
EXCLUDE = {'C'}

HEAD = '''/* sokuseki.js — 即席 app.js から機械生成。**手で編集しない。**
   `python3 extract_sokuseki.py app.js` で作り直す。
   合成(engine/warp/loader)には触っていないので node で動く。
   ブラウザでは sokuseki.browser.js(app.js の再輸出)に差し替える。 */
import fs from 'fs';
const here = u => new URL(u, import.meta.url);
export const M   = JSON.parse(fs.readFileSync(here('./parts.json'), 'utf8'));
export const MET = JSON.parse(fs.readFileSync(here('./metrics.json'), 'utf8'));

'''


def main(app_path, out_path='sokuseki.js'):
    src = open(app_path, encoding='utf-8').read()
    # split_declarations は「IIFEの中(深さ1)」を前提にしている。app.js は
    # モジュールなので深さ0。1段だけ包んで同じ道具を使う
    decls, order = split_declarations('(function(){\n' + src + '\n})();')

    names = set(decls)
    missing = [r for r in ROOTS if r not in decls]
    if missing:
        raise SystemExit('入口が見つからない: ' + ', '.join(missing))

    def refs(name):
        return set(re.findall(r'[A-Za-z_$][A-Za-z0-9_$]*',
                              strip_code(decls[name]['src']))) & names

    keep, stack = set(), list(ROOTS)
    while stack:
        cur = stack.pop()
        if cur in keep or cur in EXCLUDE:
            continue
        keep.add(cur)
        stack.extend(refs(cur) - keep - EXCLUDE)

    kept = [n for n in order if n in keep]
    body = '\n\n'.join(decls[n]['src'] for n in kept)
    body = body.replace('export function ', 'function ').replace('export const ', 'const ')

    # M と MET は上で読み込んでいる。二重宣言になるので落とす
    for n in ('M', 'MET'):
        if n in keep:
            body = re.sub(r'\n?(?:export )?let ' + n + r'\s*=[^\n]*\n', '\n', body, count=1)

    # M と MET は HEAD で読み込んで export ずみ。ここで出すと二重になる
    names_out = sorted(keep - {'M', 'MET'})
    out = HEAD + body + '\n\nexport { ' + ', '.join(names_out) + ' };\n'
    open(out_path, 'w', encoding='utf-8').write(out)

    # engine を呼ぶものが残っていたら node で落ちる。名前で確かめる
    ext = [n for n in kept if re.search(r'\bE\.(Compositor|over|multiply|tint|warp|shear)',
                                        strip_code(decls[n]['src']))]
    print(f'{app_path} の {len(decls)} 宣言 → {len(kept)} を切り出した')
    print('  入口: ' + ', '.join(ROOTS))
    if ext:
        print('  ※ engine を呼ぶものが混ざっている: ' + ', '.join(ext))


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a:
        print(__doc__)
        sys.exit(2)
    main(*a)
