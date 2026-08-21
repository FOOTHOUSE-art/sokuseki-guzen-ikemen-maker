# GitHub に上げる

このリポジトリをそのまま置くだけ。ビルドも依存パッケージも要らない。

---

## 上げる前に

**1. `LICENSE.md` を読む。**
`engine/guzen.js` は偶然イケメンメーカーの `index.html` から436宣言を切り出した生成物、
`engine/sokuseki.js` は即席メーカーの `app.js` からの生成物。
**このリポジトリの公開範囲は、元の2つより緩くできない。**
両方とも自分のものなら、あとは好きに決めてよい。

**2. リポジトリを公開にするか決める。**
上の理由で迷うなら **Private** で作る。あとから Public に変えられる。
逆は履歴が残るので、**先に Private が安全**。

**3. 手元で全部を通す。**

```bash
npm test          # = npm run preflight
```

GitHub Actions が走らせるものと同じことを、先に手元でやる。
**ここが緑なら向こうも緑になる。**

```
■ 検査          test_*.mjs 7本
■ 顔立ちプリセット  素材IDとの突き合わせ / 似すぎたプリセット
■ コマンド        基準カード / 一式 / 派生20種 / 状態ファイル / 一覧
■ 書いたものの整合  ドキュメントの参照 / 生成物の断り書き
■ 上げるもの      入れないものが混ざっていないか / 隠しファイルの有無

通った。上げてよい　(OK 19 / 飛ばした 1)
```

python が無い環境ではプリセットの項目だけ飛ばす(`--` と出る)。
`git init` 前は「上げるもの」の1項目を飛ばすので、**`git add` のあとにもう一度流す**。

---

## 手順A ブラウザだけで上げる（git を使わない）

1. GitHub → 右上の **＋** → **New repository**
2. **Repository name** に `sokuseki-guzen-ikemen-maker`
3. **Private** を選ぶ(公開すると決めているなら Public)
4. **Add a README file のチェックは外す。**このリポジトリに既にある
5. **Create repository**
6. 次の画面の **uploading an existing file** を押す
7. `sokuseki-guzen-ikemen-maker` フォルダの**中身**をまとめてドラッグする
   (フォルダごとではなく、`README.md` や `engine` が直下に来るように)
8. 下の **Commit changes**

### この方法の注意

**`.github` と `.gitignore` は、ドラッグでは上がらないことがある。**
先頭が `.` のファイルは OS が隠すため。上がっていなかったら、
リポジトリの **Add file → Create new file** で名前を手打ちして作る。

- `.gitignore` — 中身をコピーして貼る
- `.github/workflows/test.yml` — 名前欄に `.github/workflows/test.yml` と入れると
  フォルダごと作られる

---

## 手順B コマンドで上げる（おすすめ）

隠しファイルの取りこぼしがない。

```bash
cd sokuseki-guzen-ikemen-maker

git init
git add -A
npm test                   # ここで「入れないものが無い」まで見られる
git commit -m "即席偶然イケメンメーカー 統合エンジン"

git branch -M main
git remote add origin https://github.com/<自分のID>/sokuseki-guzen-ikemen-maker.git
git push -u origin main
```

リポジトリは GitHub 側で先に作っておく(手順Aの1〜5と同じ。**README のチェックは外す**)。

`git status` で `assets/` や `*.zip` が出てこないことを確かめる。
`.gitignore` で除いてあるが、目で見ておく。

---

## 上げたあと

**GitHub Actions が自動で走る。** リポジトリの **Actions** タブに緑のチェックが付く。

| 走るもの | |
|---|---|
| engine | 検査7本 |
| presets | 顔立ちプリセット35種の突き合わせ |
| cli | プロンプトが出るか |

赤くなったら、そのログに落ちた項目名が出る。
**手元で `npm test` が通っていれば、ここも通る。**

---

## GitHub Pages で動かす

**このリポジトリはそのまま Pages で動く。** ビルドも設定ファイルも要らない。
サーバ側の処理が無く、素材も一緒に入っているため。

1. リポジトリの **Settings → Pages**
2. **Source** を `Deploy from a branch`
3. **Branch** を `main` / フォルダは `/ (root)`
4. **Save**。1〜2分で `https://<ID>.github.io/<リポジトリ名>/` が開く

`.nojekyll` を置いてあるので、Jekyll の変換は走らない(置かないと `_` で始まる
ファイルが無視される)。

### ここは注意する

| | |
|---|---|
| **無料アカウントの Pages は Public のリポジトリだけ** | Private で公開したいなら GitHub Pro が要る。**先に `LICENSE.md` を読む** |
| **キャッシュ** | Pages は10分ほどキャッシュする。JS を直したら `?v=` を上げる。`npm test` が古いままだと落とす |
| **大文字小文字** | GitHub は区別する。手元(Windows/Mac)で動いても Pages で落ちることがある。`npm test` の「index.html の読み込み先」が見ている |
| **保存した人物** | ブラウザごと・URLごとに分かれる。**手元と Pages では別々**。移すには「書き出す」でJSONを渡す |

### 動いているか確かめる

1. 上の緑の帯が **v0.9300**
2. 「ガチャを回す」で顔が出る
3. 左右の端に人物像が出る
4. F12 のコンソールに赤が無い

赤が出たら、たいていは読み込み先の綴りかキャッシュ。**Ctrl + Shift + R**。

## 素材(6.27MB)をどうするか

**サイズは問題にならない。** GitHub の上限は1ファイル100MB、リポジトリの目安は1GB。
最大の素材でも 180KB(`bg_pop_comic.webp`)、485点で 6.27MB。Git LFS を使うほどではない。

問題はサイズではなく、**どこまでを1つのリポジトリにするか**。

**素材はこのリポジトリに入っている**(485点 / 6.27MB)。全体で9MBほど。
GitHub の上限は1ファイル100MB、リポジトリの目安は1GB。Git LFS を使うほどではない。

### 履歴が膨らむのが気になるとき

WebP は非可逆で圧縮済みなので、**Git の差分圧縮がほとんど効かない。**
1点を直して push するとその1点まるごと(数十KB)が履歴に積まれる。
全485点を差し替えると毎回 6.27MB。**10回やって 60MB** — それでも実用の範囲。

繰り返しが多くなりそうなら、素材は履歴に入れず
**Releases に zip で添付する**手もある。版ごとに配れて、履歴は汚れない。

## 上げないもの

`.gitignore` で除いてある。

| | 理由 |
|---|---|
| `assets/` | 素材 485点 / 6.27MB。**上の判断しだいで外す** |
| `*.zip` | 配布用に固めたもの |
| `ikemen_v*/` | 元アプリを展開したもの |
| `build/` | 生成の途中でできるもの |

---

## 上げたあと最初にやること

1. **Actions が緑になっているか**見る
2. `README.md` がトップに出ているか見る
3. `docs/PLAN.md` を開いて、決定A〜Lの表が読めるか見る
4. Settings → General → **Features** で Issues を有効にしておく
   (残っている作業を Issue にしておくと、次に開いたとき思い出せる)

### 残っている作業

Issue にするならこの3つ。

- **差分3本をアプリに当てる** — `docs/PATCH_cloth_none.md` /
  `docs/PATCH_url_state.md` / `docs/PATCH_integration.md`
- **実機で動かして出たズレを直す**
- **素材は当面触らない** — 測った結果は `docs/EDIT_ASSETS.md` §12
