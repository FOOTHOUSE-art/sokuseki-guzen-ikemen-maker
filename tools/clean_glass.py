#!/usr/bin/env python3
"""眼鏡素材から、眼鏡でないものを消す。

  python3 clean_glass.py <16_glass のフォルダ> <crop.json> <出力先>

**残っていたもの**
  - レンズの中に目(まぶた・虹彩)がそのまま焼き込まれている
  - こめかみから外側に、耳や髪や肌の破片が散っている

**分け方**
  レンズの中を測ると、はっきり2つに割れる。

    明るさで切る    → メタルフレームが消える
    α で切る        → 縁なし・ハーフリムの細いリムが消える
    小さい順に捨てる → 縁なしの枠線は78px。まぶたの弧より小さい

  **効いたのは「全ファイルに同じ形で写っているものは眼鏡ではない」。**
  フレームは種類ごとに形が違う。まぶたの弧は元が同じ写真なので、
  110点すべてに1px単位で同じ位置に出る。

  1. 全ファイルに共通して写っている画素(まぶたの弧)を消す
  2. 残りを連結成分にして、小さく散ったものを捨てる(こめかみの外の粒)
  3. **薄いというだけでは捨てない。** ハーフリムの下リムは α 中央55・輝度205 で、
     残骸と見分けが付かない。それでもフレームなので残す
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

MIN_AREA = 60    # これより小さい連結成分は捨てる(こめかみの外に散った粒)
SHARED = 0.95    # この割合以上のファイルに共通して写っている画素 = まぶたの残骸
BRIDGE = 48      # 中央のこの幅は鼻当て。共通していても消さない
GROW_R = 6       # 残骸のまわりも消す。弧の芯だけ消すと薄い縁が残る


def residue_mask(files, crop):
    """**全ファイルに同じ形で写っているものは、眼鏡ではない。**
    フレームは種類ごとに形が違う。まぶたの弧は元が同じ写真なので、
    110点すべてに1px単位で同じ位置に出る。そこだけを消す。

    大きさや明るさでは分けられない。縁なしのレンズ枠線は 78px の細い線で、
    まぶたの弧(168〜325px)より小さい。**小さいものを捨てると枠線が消える。**"""
    cnt = np.zeros((1024, 1024), np.int16)
    for f in files:
        x, y, w, h = crop['16_glass/' + f.name]
        a = np.array(Image.open(f).convert('RGBA'))
        o = np.zeros((1024, 1024, 4), np.uint8)
        o[y:y + h, x:x + w] = a
        cnt += (o[:, :, 3] > 16)
    X = np.arange(1024)[None, :].repeat(1024, 0)
    m = (cnt >= len(files) * SHARED) & (np.abs(X - 512) >= BRIDGE)
    return ndimage.binary_dilation(m, np.ones((GROW_R * 2 + 1, GROW_R * 2 + 1)))


def clean(rgba, residue):
    before = int((rgba[:, :, 3] > 0).sum())
    rgba = rgba.copy()
    rgba[residue, 3] = 0          # まぶたの残骸を先に消す
    a = rgba[:, :, 3]

    # **薄いというだけで捨てない。** ハーフリムの下リムは α の中央値が55、
    # 輝度205 で、まぶたの残骸と見分けが付かない。**それでもフレームである。**
    # 残骸は上で位置から消してあるので、ここは「離れて散った小さな粒」だけを見る。
    core = a > 16
    lab, n = ndimage.label(core, structure=np.ones((3, 3)))
    if n == 0:
        return rgba, 0, 0
    sizes = ndimage.sum(core, lab, range(1, n + 1))
    keep = np.zeros_like(core)
    for i, s in enumerate(sizes, start=1):
        if s >= MIN_AREA:
            keep |= (lab == i)
    # 枠が閉じている眼鏡は、レンズの穴の中に何も無いのが正しい。
    # 穴があるものだけ、芯以外の小さい成分を捨てる。
    # **縁なし・ハーフリムは穴が無い。** そこで同じことをすると、
    # レンズの枠線(78px の細い線)まで消える
    main = (lab == (int(np.argmax(sizes)) + 1))
    holes = ndimage.binary_fill_holes(main) & ~main
    if holes.sum() > 500:
        for i, sz in enumerate(sizes, start=1):
            if sz < 300 and not (lab == i)[main].any():
                keep &= ~(lab == i)

    out = rgba.copy()
    out[~keep, 3] = 0
    removed = before - int((out[:, :, 3] > 0).sum())
    return out, removed, int(n - (sizes >= MIN_AREA).sum())


def main(src, crop_path, dst):
    src, dst = Path(src), Path(dst)
    crop = json.loads(Path(crop_path).read_text(encoding='utf-8'))
    dst.mkdir(parents=True, exist_ok=True)
    new_crop = {}
    files = sorted(src.glob('*.webp'))
    residue = residue_mask(files, crop)
    print(f'全ファイル共通の残骸 {int(residue.sum()):,}px を消す\n')
    tot_rm = tot_keep = 0
    for f in files:
        key = '16_glass/' + f.name
        x, y, w, h = crop[key]
        img = np.array(Image.open(f).convert('RGBA'))
        canvas = np.zeros((1024, 1024, 4), np.uint8)
        canvas[y:y + h, x:x + w] = img
        before = int((canvas[:, :, 3] > 0).sum())
        cleaned, removed, drops = clean(canvas, residue)
        after = int((cleaned[:, :, 3] > 0).sum())

        ys, xs = np.where(cleaned[:, :, 3] > 0)
        if len(xs) == 0:
            print(f'!! {f.name} が空になった。SOLID を下げる')
            continue
        nx, ny = int(xs.min()), int(ys.min())
        nw, nh = int(xs.max() - nx + 1), int(ys.max() - ny + 1)
        Image.fromarray(cleaned[ny:ny + nh, nx:nx + nw]).save(
            dst / f.name, 'WEBP', lossless=True)
        new_crop[key] = [nx, ny, nw, nh]
        tot_rm += removed; tot_keep += after
        print(f'{f.name:34} {before:6} → {after:6}  消した {removed:6}  破片 {drops:3}')
    Path(dst / 'crop_16_glass.json').write_text(
        json.dumps(new_crop, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'\n{len(new_crop)}点  残した {tot_keep:,}px / 消した {tot_rm:,}px')


if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) != 3:
        print(__doc__); sys.exit(2)
    main(*a)
