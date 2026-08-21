# 更新のあて方

**毎回この形で渡す。** どのファイルをどこに置くかを、渡すたびに一覧で示す。

---

## 勧め — フォルダごと入れ替える

**取りこぼしが出ない。** 個別に置き換えると、1つ忘れて動かなくなる
(実際に `?v=` `fetch` `import` の3回それで落ちた)。

```bash
# 1. いまのリポジトリの場所へ
cd sokuseki-guzen-ikemen-maker

# 2. .git だけ残して中身を消す
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

# 3. 新しい zip の中身を入れる(zip を展開したフォルダの中身をコピー)
cp -a ../展開したフォルダ/sokuseki-guzen-ikemen-maker/. .

# 4. 確かめてから上げる
npm test
git add -A
git status          # 消えた・増えたが意図どおりか目で見る
git commit -m "何を直したか"
git push
```

**Windows(PowerShell)なら**

```powershell
cd sokuseki-guzen-ikemen-maker
Get-ChildItem -Force | Where-Object Name -ne '.git' | Remove-Item -Recurse -Force
Copy-Item ..\展開したフォルダ\sokuseki-guzen-ikemen-maker\* . -Recurse -Force
npm test
git add -A; git status
git commit -m "何を直したか"; git push
```

`.git` を消さないこと。消すと履歴とリモートの設定が消える。

---

## ブラウザで上げるとき

変更のあったファイルだけを置き換える。**フォルダの位置を間違えない。**

GitHub のファイル一覧で、そのファイルを開く → 右上の **鉛筆(Edit)** →
中身を貼り替える → **Commit changes**。

新しいファイルは **Add file → Create new file**。
名前欄に `tools/boot_check.mjs` のように**フォルダから打つ**。

画像などテキストでないものは、そのフォルダを開いて
**Add file → Upload files**。

---

## 上げたあと

1. **Actions タブが緑か**(39項目)
2. Pages を開いて **Ctrl + Shift + R**
3. 緑の帯が `v0.9300`、顔が出て、左右の端に人物像が並ぶ
4. F12 のコンソールに赤が無い

赤が出たら、そのまま貼ってもらえば直す。

---

## 今回(2026-08-21)置き換えるもの

前回上げたところからの差分。**14ファイル。**
`assets/16_glass/` の110点と `assets/crop.json` は**上げ済み**なので、今回は含まない。

### リポジトリ直下

| ファイル | 何を直したか |
|---|---|
| `index.html` | `fetch` のパス / `HUE` の読み込み / ガチャで微調整も引く / 🎲 の直し |
| `app.js` | `?v=` を 09300 に |
| `warp.js` | `?v=` を 09300 に |
| `.gitignore` | `.boot_check.mjs` を除く |
| `README.md` | 検査の説明 |

### `engine/`

| ファイル | 何を直したか |
|---|---|
| `engine/face_text.js` | プリセット無しでも止まらない / `naturalAdj` を追加 |
| `engine/base_card.mjs` | 手で選んだ値を最後にかぶせる(🎲が効くように) |
| `engine/profile_view.js` | 身長・体重・体型を別の行に |
| `engine/crop.json` | 眼鏡の切り抜きを更新(110件) |

### `tools/`

| ファイル | |
|---|---|
| `tools/boot_check.mjs` | **新規。** 画面を最後まで組み上げてみる |
| `tools/dom_stub.mjs` | **新規。** その代役の DOM |
| `tools/preflight.mjs` | 検査を39項目に |
| `tools/apply_patches.py` | 上の直しをパッチ側にも |
| `tools/clean_glass.py` | 眼鏡の掃除 |

### `docs/`

| ファイル | |
|---|---|
| `docs/RUN.md` | 微調整の抽選・体重の算出を追記 |
| `docs/EDIT_ASSETS.md` | 眼鏡の掃除の記録 |
| `docs/DEPLOY.md` | **新規。** この文書 |

### `assets/` — 今回は無し

`assets/16_glass/` の110点と `assets/crop.json` は上げ済み。

**ただし `engine/crop.json` は別のファイル。** 検査を単体で回すためのコピーで、
`assets/crop.json` と同じ中身にしておく。上の一覧に入っている。
