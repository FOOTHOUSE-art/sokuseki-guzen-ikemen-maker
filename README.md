# 即席偶然イケメンメーカー

**顔の参照画像が作れるメーカー。** 1つのシードから、顔・人物像・生成AI向けプロンプトを出す。

即席イケメンメーカー(顔を描く)に、偶然イケメンメーカー(人物像を作る)を合流させたもの。
**素材を含めて一式が入っている。** ブラウザだけで動く。

```
python3 serve.py          # → http://localhost:8000/
```

Windows は `start.bat`。GitHub Pages に置けばそのまま公開できる(`docs/UPLOAD.md`)。

---

## 何をするものか

```
[1] 顔を合成               1024×1024 / 正面バストアップ / 無地背景
        ↓ 顔の参照画像として添付
[2] 基準リファレンスカード   16:9 / 全身前面・側面 / 顔正面・側面・斜め45度 / 歯 /
                            足と足裏 / 下着 / 情報欄
        ↓ 生成された画像を添付
[3] 派生 20種               服装シート・場面・ポスター・トレカ など
```

顔は素材IDが正、人物像は偶然が正。**素材ID → 語彙は一対一なので情報が落ちない。**
逆(語彙 → 素材)だと多対一に潰れる。土台を即席にしたことでこの向きになった。

## 画面

| 列 | 中身 |
|---|---|
| 左端 | プロフィール / ABC / 体型 |
| 左 | イケメン度 / 顔の記述 / 生成AI向けプロンプト |
| 中央 | 合成画像 |
| 右 | 構成25軸 / 微調整25 / スタンプ・ブラシ |
| 右端 | 偶然と同じ7カテゴリ(基本・暮らし・日常・内面・ファッション・過去・オトナ) / 提案服装 |

人物像の項目は **▼ で選び直す**(22行)か **🎲 で引き直す**。顔は変わらない。
名前を付けて保存すると `db.html`(別タブ)にサムネイル付きで並ぶ。

## 中身

| | |
|---|---|
| 直下 | アプリ本体。`index.html` `app.js` `engine.js` `warp.js` `loader.js` `assets/` |
| `engine/` | 統合エンジン。node でも動く。検査もここ |
| `docs/` | 設計・実装記録・差分・素材の直し方・上げ方(`DEPLOY.md` が更新手順) |
| `tools/` | 生成と検査。`preflight.mjs` `apply_patches.py` `mask_editor.html` |
| `samples/` | 出力の例 |

### `engine/` の主なもの

| | |
|---|---|
| `base_card.mjs` | 入口。`buildBaseCard({seed, ov, adj, person})` |
| `face_text.js` | 素材ID → 日本語。微調整のしきい値。層2への注入値 |
| `profile_view.js` | 人物像の項目定義とカテゴリの色 |
| `guzen.js` | 人物像とプロンプトの型。**生成物** |
| `sokuseki.js` | ブラウザなら `../app.js`、node なら生成物。**ここだけが分かれ目** |
| `rarity.js` | 顔と人物像のレア判定を足す |
| `url_state.js` / `store.js` | 共有URL / 保存 |

## 検査

```bash
npm test          # = node tools/preflight.mjs
```

検査7本・プロンプトの生成・ドキュメントの参照・Pages で要るファイル・
`?v=` がそろっているか・`fetch` の行き先が実在するか、まで見る。

**最後に `index.html` を DOM の代役で最後まで走らせる**(`tools/boot_check.mjs`)。
`?v=` の食い違い・`fetch` のパス違い・`import` の書き漏れは、
**構文チェックにもファイル存在チェックにも出ない。** 実際にこれで3回落ちた。

push すると GitHub Actions でも同じものが走る。

## 生成物を手で編集しない

`engine/guzen.js` と `engine/sokuseki.node.js` は、元のアプリから機械で切り出したもの。

```bash
python3 tools/extract_person.py index.html generateCharacter,buildPrompt,buildDerivedPrompt,rarityBreakdown,scoreRarity,buildFullProfileText,buildInnerSection,buildUniformEditRows
python3 tools/build.py                       # → engine/guzen.js
python3 tools/extract_sokuseki.py app.js     # → engine/sokuseki.node.js
```

**手で直すと、次に流し直したとき静かに戻る。**

## 素材を直すとき

輪郭・髪型などの WebP を描き直してよい。`docs/EDIT_ASSETS.md`。
**サイズを変えなければ上書きだけで反映される。**変えると黙ってずれる(エラーは出ない)。

```bash
node engine/test_vocab.mjs   # 語彙・実測・crop・undefined を突き合わせる
```

`tools/mask_editor.html` で、抜けを原画から戻す / 残骸を消す ができる。

## 公開について

**上げる前に `LICENSE.md` を読むこと。**
`engine/guzen.js` には偶然イケメンメーカーのソースがほぼそのまま入っている(442宣言)。
**GitHub Pages で公開するなら、リポジトリも公開になる。**

## 決まっていること

`docs/PLAN.md` §0 に一覧。要点だけ。

| | |
|---|---|
| 顔立ち | 即席が正。偶然の顔の語彙は持ち込まない |
| 人物像 | 偶然のすべて。体毛も靴下も削らない |
| 服装 | 即席の服は顔参照画像の襟元だけ。文章は偶然の語彙が正 |
| プロンプト | 日本語・ChatGPT向け |
| 基準カード | 偶然のものを引き継ぐ。レイアウトも基準服装(下着)も |
| 背景 | 基準カードは無地スタジオ固定。場面は派生で足す |
| 年齢 | 顔の雰囲気を保ったまま、その年齢の顔にする |
| 国籍 | 日本で固定。舞台も日本 |
| 複数人 | 作らない |
