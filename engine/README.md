# engine

node でそのまま動く。依存パッケージなし。

```bash
node make_prompt.mjs 2024 --all
for t in test_*.mjs; do node $t; done
```

**`guzen.js` と `sokuseki.js` は生成物。手で編集しない**(作り直しは `../tools/`)。
それ以外は手で直してよい。とくに `face_presets.json` は手で書くためのファイル。
直したら `python3 ../tools/verify_presets.py face_presets.json parts.json` と
`node test_face_bridge.mjs` を流す。**プリセットの名前は変えない**(層2と共有の語彙)。

`parts.json` `metrics.json` `crop.json` `face_presets.json` は即席メーカーのもののコピー。
検査を単体で回すために置いてある。**アプリに組み込むときは `assets/` の本物を使う。**
