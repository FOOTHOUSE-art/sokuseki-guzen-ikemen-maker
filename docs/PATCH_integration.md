# アプリ側にあてる変更 — 統合エンジンの組み込み

> **当てた状態のものが `ikemen_v0930_local.zip` にある。**
> 素の v0.9157 から作り直すなら `python3 tools/apply_patches.py <アプリ> <engine>`。
> 3本まとめて機械的に当たる。2回当てても壊れない(当たっていれば飛ばす)。

`engine/` を即席メーカーに載せる。**`app.js` と `index.html` は 1か所ずつしか触らない。**

前提: `docs/PATCH_cloth_none.md` と `docs/PATCH_url_state.md` を先に当てておく。

---

## 1. 写しを持たないための入れ替え

node で検査するために、即席の抽選とイケメン度は `sokuseki.js` に切り出してある。
**これは `app.js` からの生成物で、手で写したものではない。**

```bash
python3 tools/extract_sokuseki.py app.js sokuseki.js   # node 用を作り直す
```

**ブラウザでは、この生成物を捨てて `app.js` を直接読む。**

```bash
mv sokuseki.browser.js sokuseki.js               # 中身は app.js の再輸出1行
```

`base_card.mjs` と `rarity.js` はどちらでも同じ名前で読めるので、
**ファイルを置き換えるだけで、両方の環境で動く。**
引き継ぎ資料 §5-6「UIとエンジンで同じ処理を二重に持たない」への答えがこれ。

## 2. 置くファイル

アプリの直下に置く。`.mjs` は `.js` にリネームしてよい(中身は同じ)。

| ファイル | 中身 | 依存 |
|---|---|---|
| `guzen.js` | 人物像と偶然のプロンプト。`index.html` から生成 | なし |
| `face_text.js` | 素材ID→日本語、しきい値、層2への注入値 | なし |
| `base_card.mjs` | 1シード → 顔・人物像・基準カード・派生20種 | 上の3つ |
| `rarity.js` | レア判定の統合 | `sokuseki` / `guzen` |
| `url_state.js` | 共有URL | なし |
| `sokuseki.js` | ← `sokuseki.browser.js` を置く | `app.js` |

`parts.json` `metrics.json` はアプリのものを使う(`assets/` にある)。
**`engine/` に入っているコピーは検査用。アプリには持ち込まない。**

## 3. `index.html` — 読み込みと呼び出し

```js
import { buildBaseCard, setPresets, DERIVED_TYPES } from './base_card.mjs?v=09157';
import { judge, lines } from './rarity.js?v=09157';

// 顔立ちプリセットは呼ぶ側が読む。node は fs、ブラウザは fetch
setPresets(await (await fetch('face_presets.json')).json());
```

`draw()` の最後で、いまの状態からプロンプトを作る。

```js
const r = buildBaseCard({ seed: cur.seed, ov: OV, adj: ADJ });
$('cardPrompt').value = r.prompt;                 // 基準カード
$('faceText').textContent = r.block;              // 【顔】の日本語
const j = judge(cur, r.person, ADJ, STAMPS);      // レアとイケメン度
```

**`buildBaseCard` は内部で `roll(seed, ov)` をもう一度回す。**
画面が持っている `cur` と同じものが返るので、渡す必要はない。
ただし**同じ `ov` と `adj` を渡すこと。** 渡し忘れると、画面の顔と文章がずれる。

## 4. `index.html` — 派生のメニュー

```js
$('derivedType').innerHTML =
  DERIVED_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
$('derivedBtn').onclick = () => {
  $('derivedPrompt').value = r.derived($('derivedType').value, $('derivedMode').value);
};
```

`derivedMode` は `参照画像前提（簡潔版）` と `単体で完結（フル記述）` の2つ。
既定は前者。**基準カードで生成した画像を添付して使う。**

## 5. 画面に出すもの

| | 中身 |
|---|---|
| 顔の記述 | `r.block`。素材IDから作った日本語。いまのプロフィール文の隣でよい |
| 基準カードのプロンプト | `r.prompt`。コピーボタンを付ける |
| 派生 | 20種のセレクタ + コピーボタン |
| 人物像 | `r.person`。名前・年齢・職業・身長・体重・MBTI あたりを出す |
| レア | `j.rank` `j.score` と `lines(j)` の内訳 |
| イケメン度 | `j.ikemen`。**いまの表示と同じ値**(即席の実測をそのまま使っている) |

## 6. 確認すること

1. 顔を変えると `r.block` が変わり、プロンプトの【顔】も変わる
2. 微調整を動かすと「目の間隔がはっきり狭い」などの語が増減する
3. **画面のイケメン度と `j.ikemen` が一致する**(ずれたら `adj` の渡し忘れ)
4. 派生20種すべてが空でなく出る
5. URLを共有して開き直すと、顔・微調整・プロンプトが同じ
6. `node test_*.mjs` が6本とも通る(`sokuseki.js` を node 用に戻してから)

## 7. 気をつけること

**`guzen.js` と `sokuseki.js` は生成物。手で編集しない。**
偶然メーカーか `app.js` を直したら、`extract_person.py` → `build.py`、
`extract_sokuseki.py` を流し直す。手で直すと、次に流したとき静かに戻る。

**`extract_sokuseki.py` は識別子の名前で依存を辿る。**
関数の中のローカル変数が、同じ名前のトップレベル宣言を連れてくることがある。
実際に `geometry` の中の `const C`(人中の長さ)が、合成器の `const C` を
連れてきて node で落ちた。`EXCLUDE` に名前を書いて外してある。
**`app.js` に新しいトップレベル宣言を足したら、生成物を流し直して node で動くか見る。**
