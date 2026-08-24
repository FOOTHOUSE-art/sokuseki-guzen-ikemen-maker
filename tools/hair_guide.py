#!/usr/bin/env python3
"""新しい髪型を足すための道具。

  python3 tools/hair_guide.py base          → build/hair_base.png と _guide.png
  python3 tools/hair_guide.py mark <画像>    → その画像に目安線を引く
  python3 tools/hair_guide.py check <画像>   → 座標が合っているかを測る

**なぜ下敷きが要るか。**
素材は全点が同じ座標に描かれている。虹彩の中心 (512,486)、頭頂 y=154、
あご y=769。GPT に「1024×1024で頭頂をy=154に」と文章で頼んでも合わない。
**素体そのものを見せて「この頭に髪を足して」と言うほうが確実。**

`base` は、髪も眉も眼鏡も無い素体を1024×1024で書き出す。**2枚出る。**

  hair_base.png        線なし。**これを GPT に渡す**
  hair_base_guide.png  線あり。自分が位置を確かめるため

アプリで作った顔(「画像を保存」)を渡したいときは `mark` で線を引いて確かめる。
**GPT に渡すのは線の無いほうにする。** 線ごと描き写してくる。
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
A = ROOT / 'assets'
IRIS = (512, 486)
TOP, CHIN = 154, 769


def place(canvas, rel, crop):
    if rel not in crop:
        return
    x, y, w, h = crop[rel]
    im = Image.open(A / rel).convert('RGBA')
    canvas.alpha_composite(im, (x, y))


def compose(outline='egg'):
    crop = json.loads((A / 'crop.json').read_text(encoding='utf-8'))
    cv = Image.new('RGBA', (1024, 1024), (255, 255, 255, 255))
    # 髪・眉・眼鏡・服は載せない。**髪を描く相手だけを見せる**
    for rel in [f'02_body/body_common_final.webp',
                f'01_face/face_{outline}.webp',
                f'12_ear/ear_{outline}.webp']:
        place(cv, rel, crop)

    return cv


def add_lines(cv):
    d = ImageDraw.Draw(cv)
    if True:
        for y, label in [(TOP, '頭頂 y=154'), (IRIS[1], '虹彩 y=486'), (CHIN, 'あご y=769')]:
            d.line([(0, y), (1024, y)], fill=(255, 90, 90, 120), width=1)
            d.text((8, y + 3), label, fill=(200, 40, 40, 200))
        d.line([(512, 0), (512, 1024)], fill=(255, 90, 90, 90), width=1)
        d.rectangle([0, 0, 1023, 1023], outline=(255, 90, 90, 140), width=2)
    return cv


def build_base(outline='egg'):
    out = ROOT / 'build'
    out.mkdir(parents=True, exist_ok=True)
    cv = compose(outline)
    cv.convert('RGB').save(out / 'hair_base.png')
    add_lines(cv.copy()).convert('RGB').save(out / 'hair_base_guide.png')
    print('build/hair_base.png       線なし。**これを GPT に渡す**')
    print('build/hair_base_guide.png 線あり。位置を確かめるため')

    return cv


def check(path):
    """返ってきた絵が使えるかを測る。合成の前に弾く。"""
    im = Image.open(path).convert('RGBA')
    ng = []
    print(f'{path}  {im.size[0]}×{im.size[1]}')
    if im.size != (1024, 1024):
        ng.append(f'大きさが 1024×1024 でない({im.size[0]}×{im.size[1]})')

    import numpy as np
    a = np.array(im.convert('RGB')).astype(int)
    h, w = a.shape[:2]
    lum = a[:, :, 0] * .299 + a[:, :, 1] * .587 + a[:, :, 2] * .114

    # 背景が白で均一か。抽出は背景との差で髪を切る
    # 下辺は肩が写るので見ない。上辺と左右の上半分だけを見る
    edge = np.concatenate([a[0:8].reshape(-1, 3),
                           a[0:400, 0:8].reshape(-1, 3), a[0:400, -8:].reshape(-1, 3)])
    if edge.std() > 6 or edge.mean() < 235:
        ng.append(f'背景が白く均一でない(平均 {edge.mean():.0f} / ばらつき {edge.std():.1f})')

    # 頭頂とあご。髪があるぶん頭頂は上がるので、そこは緩く見る
    dark = lum < 225
    rows = np.where(dark.any(axis=1))[0]
    if len(rows) == 0:
        ng.append('何も写っていない')
    else:
        top, bottom = int(rows.min()), int(rows.max())
        print(f'  いちばん上 y={top} / いちばん下 y={bottom}')
        if not (60 <= top <= 200):
            ng.append(f'頭のてっぺんが y={top}。髪込みで 60〜200 に収める')
        if bottom < 700:
            ng.append(f'下端が y={bottom}。あご(769)より上で切れている')

    # 赤い目安線が残っていないか
    red = (a[:, :, 0] > 200) & (a[:, :, 1] < 120) & (a[:, :, 2] < 120)
    if red.sum() > 400:
        ng.append(f'赤い目安線が残っている({int(red.sum())}px)。線の無い絵を出させる')

    print('  ' + ('使える' if not ng else 'このままでは使えない'))
    for x in ng:
        print('   - ' + x)
    return 1 if ng else 0


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a:
        print(__doc__); sys.exit(2)
    if a[0] == 'base':
        build_base(*(a[1:2] or ['egg']))
    elif a[0] == 'mark':
        im = Image.open(a[1]).convert('RGBA')
        p = ROOT / 'build' / (Path(a[1]).stem + '_guide.png')
        p.parent.mkdir(parents=True, exist_ok=True)
        add_lines(im).convert('RGB').save(p)
        print(f'{p} を書き出した')
    elif a[0] == 'check':
        sys.exit(check(a[1]))
    else:
        print(__doc__); sys.exit(2)
