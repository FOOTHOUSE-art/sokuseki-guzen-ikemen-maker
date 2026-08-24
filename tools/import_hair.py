#!/usr/bin/env python3
"""import_hair.py — 素体との差分で髪を切り出す。

  python3 tools/import_hair.py <画像> <id> <日本語名>
  python3 tools/import_hair.py --batch <一覧ファイル>
  python3 tools/import_hair.py --install        切り出したものを5か所に反映する

**なぜ差分で切れるか。**
`tools/hair_guide.py base` で出した素体を渡して描かせているので、
返ってくる絵は**顔・耳・首・肩が素体とほぼ同じ**。実測すると顎の先が ±5px、
耳の高さの顔幅が ±3px に収まる。だから「素体と違うところ = 髪」で足りる。

局所分散を使う `pipeline_v18.py` は、素体が無い原画のためのもの。
**素体から作った絵なら、こちらのほうが確実。**

出るもの
  build/hair/<id>.webp        切り抜き済み(可逆WebP)
  build/hair/manifest.json    crop / hairline / parts / 語彙の追記案
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'build' / 'hair_base.png'
OUT = ROOT / 'build' / 'hair'

DIFF = 26        # 素体との差がこれ以上なら「素体でない」
DARK = 150       # 髪は暗い。これより明るいものは拾わない
OPEN = 3         # これより細い線は落とす。顎の輪郭線を髪と間違えないため
MIN_AREA = 400   # 小さく散った粒は捨てる
FEATHER = 90.0   # α の傾き。素体との差をこれで割る


def lum(a):
    return a[:, :, 0] * .299 + a[:, :, 1] * .587 + a[:, :, 2] * .114


def cut(img_path):
    if not BASE.exists():
        raise SystemExit('素体が無い。先に python3 tools/hair_guide.py base')
    base = np.array(Image.open(BASE).convert('RGB')).astype(float)
    im = Image.open(img_path).convert('RGB')
    if im.size != (1024, 1024):
        im = im.resize((1024, 1024), Image.LANCZOS)
    a = np.array(im).astype(float)

    bl, al = lum(base), lum(a)
    diff = np.abs(a - base).max(axis=2)

    # 髪の芯 = 素体と違い、かつ暗い
    core = (diff > DIFF) & (al < DARK)

    # 首から下は拾わない。髪はここまで来ない
    core[820:, :] = False

    # **顎や首の輪郭線を髪と間違える。** GPT が線を引き直すので素体と差が出て、
    # しかも暗い。髪は太く、輪郭線は細いので、細いものを落とせば分かれる
    core = ndimage.binary_opening(core, np.ones((OPEN, OPEN)))

    # 小さく散ったものを捨て、穴を埋める
    lab, n = ndimage.label(core, np.ones((3, 3)))
    if n:
        sizes = ndimage.sum(core, lab, range(1, n + 1))
        keep = np.zeros_like(core)
        for i, s in enumerate(sizes, 1):
            if s >= MIN_AREA:
                keep |= (lab == i)
        core = keep
    core = ndimage.binary_closing(core, np.ones((5, 5)))
    core = ndimage.binary_fill_holes(core)

    # α は「素体からどれだけ暗くなったか」。毛先の透けを残す
    alpha = np.clip((bl - al) / FEATHER, 0, 1)
    alpha = np.where(core, np.maximum(alpha, 0.85), alpha)
    # 芯から離れた薄いものは残骸。2px まで
    near = ndimage.binary_dilation(core, np.ones((5, 5)))
    alpha = np.where(near, alpha, 0)
    alpha = np.clip(alpha, 0, 1)

    rgba = np.dstack([a, alpha * 255]).astype(np.uint8)
    return rgba


def save(rgba, hid):
    ys, xs = np.where(rgba[:, :, 3] > 0)
    if len(xs) == 0:
        raise SystemExit(f'{hid}: 何も切り出せなかった')
    x0, y0 = int(xs.min()), int(ys.min())
    w, h = int(xs.max() - x0 + 1), int(ys.max() - y0 + 1)
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba[y0:y0 + h, x0:x0 + w]).save(OUT / f'{hid}.webp', 'WEBP', lossless=True)

    # 生え際 = 中央帯(x 452-572)で α>128 の一番下の行
    band = rgba[:, 452:573, 3] > 128
    rows = np.where(band.any(axis=1))[0]
    hairline = int(rows.max()) if len(rows) else 0
    return [x0, y0, w, h], hairline, int((rgba[:, :, 3] > 0).sum())


def run(items):
    man = {'crop': {}, 'hairline': {}, 'parts': [], 'ja': {}, 'map': {}}
    for path, hid, ja, mapping in items:
        rgba = cut(path)
        crop, hairline, px = save(rgba, hid)
        key = f'11_hair/{hid}.webp'
        short = hid.split('_')[0]
        man['crop'][key] = crop
        man['hairline'][short] = {'hairline': hairline}
        man['parts'].append({'id': hid, 'w': 1})
        man['ja'][hid] = ja
        man['map'][hid] = mapping
        print(f'{hid:24} {ja:14} {px:7,}px  crop {crop}  生え際 {hairline}')
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'manifest.json').write_text(
        json.dumps(man, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'\n{OUT}/manifest.json に、5か所への追記案を書いた')


def install():
    """**5か所に入れる。** 1つでも忘れると、その髪型が出たとき undefined が混ざる。"""
    man = json.loads((OUT / 'manifest.json').read_text(encoding='utf-8'))
    A = ROOT / 'assets'
    import shutil

    for key in man['crop']:
        hid = key.split('/')[1]
        shutil.copy(OUT / hid, A / '11_hair' / hid)
    print(f"1. assets/11_hair に {len(man['crop'])}点 置いた")

    crop = json.loads((A / 'crop.json').read_text(encoding='utf-8'))
    crop.update(man['crop'])
    txt = json.dumps(crop, ensure_ascii=False, indent=1)
    (A / 'crop.json').write_text(txt, encoding='utf-8')
    (ROOT / 'engine' / 'crop.json').write_text(txt, encoding='utf-8')
    print('2. crop.json を更新(engine のコピーも)')

    met = json.loads((A / 'metrics.json').read_text(encoding='utf-8'))
    met['hair'].update(man['hairline'])
    txt = json.dumps(met, ensure_ascii=False, indent=1)
    (A / 'metrics.json').write_text(txt, encoding='utf-8')
    (ROOT / 'engine' / 'metrics.json').write_text(txt, encoding='utf-8')
    print('3. metrics.json の hairline を更新(engine のコピーも)')

    parts = json.loads((A / 'parts.json').read_text(encoding='utf-8'))
    have = {o['id'] for o in parts['axes']['hair']['options']}
    add = [o for o in man['parts'] if o['id'] not in have]
    parts['axes']['hair']['options'].extend(add)
    txt = json.dumps(parts, ensure_ascii=False, indent=1)
    (A / 'parts.json').write_text(txt, encoding='utf-8')
    # **engine のコピーも同じにする。** ここを忘れると node 側だけ古い素材で動き、
    # 「指定した髪型にならない」になる(実際に踏んだ)
    (ROOT / 'engine' / 'parts.json').write_text(txt, encoding='utf-8')
    print(f"4. parts.json に {len(add)}点 足した(合計 {len(parts['axes']['hair']['options'])}、engine のコピーも)")

    ft = ROOT / 'engine' / 'face_text.js'
    t = ft.read_text(encoding='utf-8')
    for hid, ja in man['ja'].items():
        if hid in t:
            continue
        t = t.replace("    hair30_mediummush:'ミディアムマッシュ' },",
                      f"    hair30_mediummush:'ミディアムマッシュ',\n    {hid}:'{ja}' }},", 1)
        m = man['map'][hid]
        t = t.replace("  },\n  // 眉。形20種",
                      f"    {hid}: ['{m[0]}', '{m[1]}', '{m[2]}'],\n  }},\n  // 眉。形20種", 1)
    ft.write_text(t, encoding='utf-8')
    print('5. engine/face_text.js の JA.hair と M.hair に語彙を足した')
    print('\n  node engine/test_vocab.mjs で確かめる')


if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) == 3:
        run([(a[0], a[1], a[2], ['短髪', '自然に下ろした前髪', 'ツヤを抑えたナチュラルセット'])])
    elif len(a) == 1 and a[0] == '--install':
        install()
    elif len(a) == 2 and a[0] == '--batch':
        items = json.loads(Path(a[1]).read_text(encoding='utf-8'))
        run([(i['path'], i['id'], i['ja'], i['map']) for i in items])
    else:
        print(__doc__); sys.exit(2)
