# アプリ側にあてる変更 — 共有URLに固定と微調整を載せる

`ikemen_v09157.zip` に対する差分。**ファイル1つ追加 + `index.html` の4か所。**

いまの `#3361465794` はシードしか持っていない。
**固定した軸と微調整25項目が、共有した相手に戻らない。**
顔の参照画像メーカーとしては、詰めた顔が共有で消えるのは致命的なので直す。

コーデックは `url_state.js` として動くものを用意した(往復の検査ずみ)。

```
変更前  #3361465794
変更後  #3361465794!cloth:none,eye:eyeA09_sanpaku!browY:19,eyeGap:-24,eyeHeight:75!0.9157
        ^シード     ^固定した軸               ^既定と違う微調整          ^版
```

**従来のURLはそのまま読める。** シードだけの形も受け付ける。

---

## 0. `url_state.js` を置く

`engine/url_state.js` をアプリの直下にコピーする。依存なし。

## 1. `index.html` — 読み込み(299行目あたり)

```js
// 変更前
const seed = parseInt(location.hash.slice(1),10);
await draw(Number.isFinite(seed) ? seed>>>0 : (Math.random()*4294967296)>>>0);

// 変更後
const st = decodeState(location.hash, A.ADJ0);
if(st.version && st.version !== A.VERSION)
  console.warn('URLの版が違う: ' + st.version + ' → ' + A.VERSION);
OV = st.ov;
ADJ = Object.assign({}, A.ADJ0, st.adj);
syncAdjUI();                                   // ← 3で足す
await draw(st.seed != null ? st.seed : (Math.random()*4294967296)>>>0);
```

冒頭の import に足す。

```js
import { encodeState, decodeState, shareNote } from './url_state.js?v=09157';
```

**`buildAdjUI(); wireAdj();` より後で `ADJ` を差し替えること。**
先に入れると UI の初期化に上書きされる。

**軸の固定は何もしなくてよい。** `buildEditor()` が `OV[axis]` を見て
選択状態を決めているので、`draw()` の前に `OV` を入れておけばセレクタに反映される。

## 2. `index.html` — 書き出し(477行目あたり)

```js
// 変更前
location.hash=seed;

// 変更後
location.hash = encodeState({ seed, ov: OV, adj: ADJ, adj0: A.ADJ0, version: A.VERSION });
```

## 3. `index.html` — スライダーに値を戻す関数を足す

`buildAdjUI()`(318行目)の直後に置く。
**URLから復元しても、つまみが元の位置のままだと直したくなる。**

既存の `PCT`(317行目)をそのまま使う。倍率かどうかの判定を新しく書かない。

```js
function syncAdjUI(){
  for(const [, rows] of GROUPS) for(const [k] of rows){
    const el = $('a_' + k); if(!el) continue;
    const v = PCT.has(k) ? Math.round(ADJ[k] * 100) : ADJ[k];
    el.value = v;
    const out = $('v_' + k); if(out) out.textContent = PCT.has(k) ? v + '%' : String(v);
  }
}
```

**`index.html` の `PCT` と `url_state.js` の `ADJ_RATE` は同じ集合。**
いまはどちらも9軸(`eyeScale` `eyeWidth` `eyeHeight` `faceW` `faceH` `lipThick`
`lipWidth` `noseW` `browAlpha`)。**片方だけ増やすと、その軸だけ100倍ずれる。**
引き継ぎ資料 §5-6「UIとエンジンで同じ処理を二重に持たない」と同じ形の地雷なので、
どちらかを直したら必ずもう片方を見る。

## 4. `index.html` — 共有ボタン(847行目あたり)

```js
// 変更前
const url=location.origin+location.pathname+'#'+(cur?cur.seed:0);

// 変更後
const url = location.origin + location.pathname + '#' +
  encodeState({ seed: cur ? cur.seed : 0, ov: OV, adj: ADJ, adj0: A.ADJ0, version: A.VERSION });
const note = shareNote(STAMPS, STROKES);
```

`note` が空でなければボタンの下に出す。**URLに載らないものを黙って捨てない。**

---

## 載せないもの

| | 理由 |
|---|---|
| スタンプ | 1個ごとに種類・座標・大きさ・シード。数が増えるとURLに入らない |
| ブラシの筆跡 | 1本ごとに座標列。もっと入らない |
| 背景の選択 | 顔の再現には関わらない。必要なら1文字足すだけで入る |

スタンプと筆を共有したくなったら、URLではなく JSON の書き出し/読み込みにする。
`make_prompt.mjs --state` が読む形式と同じにしておくと、二重に持たなくて済む。

## なぜ素材IDをそのまま書くか

選択肢の番号にすれば1文字で済むが、**素材を1つ足しただけで昔のURLが別の顔になる。**
長さより壊れないことを取った。それでも120文字前後に収まっている。

版(`0.9157`)を末尾に付けてあるのは、抽選の順序が変わったときに気づけるようにするため。
違っていたらコンソールに警告を出す。**止めはしない。**

## 確認すること

1. 従来の `#3361465794` を開いて、これまでどおり動く
2. 微調整をいじってURLをコピー → 別のタブで開く → **つまみの位置まで同じ**
3. 軸を固定してURLをコピー → 開く → 「固定 N項目」の表示が同じ
4. スタンプを打った状態でコピーすると、載らない旨が出る
5. URLの版と `A.VERSION` が違うとき、コンソールに警告が出る

## 検査

`node engine/test_url_state.mjs`(16項目)。往復・既定の省略・倍率と真偽値の取り違え・
従来URLの読み込みを見ている。**`ADJ0` を増やしたら、この検査を先に流す。**
