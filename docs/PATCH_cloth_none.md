# アプリ側にあてる変更 — 服「なし」の追加

`ikemen_v09157.zip` に対する差分。**3か所だけ。** 素材の追加は要らない。

素体 `02_body/body_common_final.webp` は鎖骨から上の素肌で描かれている。
服のレイヤーを飛ばすと胸像のように収まる。

**参照画像としては「なし」がいちばん安全**で、襟が本文の服装に混ざる余地がなくなる。

---

## 1. `assets/parts.json`

`axes.cloth.options` の先頭に足す。重みは既存が各1なので、6 だと「なし」が約半分になる。
既定にするならこのまま、たまに出る程度でよければ 1〜2 に落とす。

```json
{ "id": "none", "label": "なし", "w": 6 }
```

## 2. `app.js` — 必要なファイル(96行目あたり)

`P.cloth(s)` を無条件に積んでいる。`none` のときは積まない。

```js
// 変更前
const L = [P.body(), P.face(s), P.ear(s), P.nose(s), P.mouth(s), P.hair(s), P.cloth(s)];

// 変更後
const L = [P.body(), P.face(s), P.ear(s), P.nose(s), P.mouth(s), P.hair(s)];
if (s.cloth.id !== 'none') L.push(P.cloth(s));
```

**ここを直し忘れると、存在しないファイルを取りに行ってアプリ全体が止まる。**
`metrics.json` が漏れたときと同じ壊れ方をする(引き継ぎ資料 §2)。

## 3. `app.js` — 合成(237行目あたり)

```js
// 変更前
const cm = MET && MET.cloth ? MET.cloth : null;
const cc = cm ? cm[s.cloth.id] : null;
E.over(buf, cc ? E.colorizeCloth(await g(P.cloth(s)), CLOTH_PAL[s.clothColor], cc.lo, cc.hi)
               : await g(P.cloth(s)));

// 変更後
const cm = MET && MET.cloth ? MET.cloth : null;
if (s.cloth.id !== 'none') {
  const cc = cm ? cm[s.cloth.id] : null;
  E.over(buf, cc ? E.colorizeCloth(await g(P.cloth(s)), CLOTH_PAL[s.clothColor], cc.lo, cc.hi)
                 : await g(P.cloth(s)));
}
```

---

## 触らなくていいところ

| | 理由 |
|---|---|
| ネクタイ | `s.tie = s.cloth.id === 'cloth01_dressshirt'` なので `none` では自動的に付かない |
| 服の色のセレクタ | 値は残るが描画されない。灰色にするかは好みの範囲 |
| UIのセレクタ | `parts.json` から作っているなら自動で「なし」が出る |
| イケメン度 | 服を見ていない。影響なし |
| レア判定 | 「ネクタイ」の当たる率だけ下がる。段は引き直しずみ |

## 確認すること

1. 服を「なし」にして合成が通る(ファイル取得のエラーが出ない)
2. 鎖骨から下が素肌で、途中で切れて見えない
3. ドレスシャツに戻すとネクタイが復活する
4. 画面のバージョン表示が上がっている(`serve.py` を使う)
