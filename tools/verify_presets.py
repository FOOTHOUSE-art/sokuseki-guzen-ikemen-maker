#!/usr/bin/env python3
"""face_presets.json を parts.json の素材IDに突き合わせる。

  python3 verify_presets.py face_presets.json ikemen_v0913/assets/parts.json

1. fix の軸と値が実在するか
2. adj のキーが ADJ0 の25軸に含まれるか
3. プリセット同士の固定軸の一致率(似すぎている組の検出)

2026-08-20 時点の v0.9157 では 1 と 2 は不整合0件。
3 だけが残課題(塩顔系×しょうゆ顔 77% ほか)。
"""
import json
import sys
from itertools import combinations

# app.js の ADJ0 と同じ25軸。app.js を変えたらここも変える。
ADJ = set("""eyeGap eyeScale eyeWidth eyeHeight eyeY lidDrop lidRise innerY outerY
browY browGap browInner browOuter browTilt browAlpha noseY noseW lipThick lipWidth
mouthCorner mouthY faceW faceH chinY centri""".split())

SIMILAR_LIMIT = 0.70   # これ以上の一致率は「似すぎ」として報告する


def build_valid(parts):
    A = parts["axes"]
    ids = {k: {o["id"] for o in (v.get("options") or [])}
           for k, v in A.items() if isinstance(v, dict)}
    valid = {k: ids[k] for k in
             ("outline skinTone eye nose mouth tear hair hairColor glass glassColor "
              "beard cloth clothColor tieColor pimple pores").split() if k in ids}
    # 眉だけは形と濃さが別の配列に分かれている
    valid["brow"] = {o["id"] for o in A["brow"]["options"]}
    valid["browDensity"] = {o["id"] for o in A["brow"]["density"]}
    valid["beardStrength"] = {o["id"] for o in A["beard"].get("strength", [])}
    valid["tie"] = {"on", "none"}
    return valid


def main(fp_path, parts_path):
    presets = json.load(open(fp_path, encoding="utf-8"))["presets"]
    valid = build_valid(json.load(open(parts_path, encoding="utf-8")))

    bad = []
    for name, pr in presets.items():
        for k, v in pr.get("fix", {}).items():
            if k not in valid:
                bad.append((name, "未知の軸", k, v))
            elif v not in valid[k]:
                bad.append((name, "不正な値", k, v))
        for k in pr.get("adj", {}):
            if k not in ADJ:
                bad.append((name, "未知の微調整", k, ""))

    print(f"プリセット {len(presets)}種 / 不整合 {len(bad)}件")
    for b in bad:
        print("  -", " / ".join(map(str, b)))

    pairs = []
    for a, b in combinations(presets, 2):
        A, B = presets[a].get("fix", {}), presets[b].get("fix", {})
        keys = set(A) | set(B)
        same = sum(1 for k in keys if A.get(k) == B.get(k))
        pairs.append((same / len(keys), same, len(keys), a, b))
    pairs.sort(reverse=True)

    over = [p for p in pairs if p[0] >= SIMILAR_LIMIT]
    print(f"\n固定軸の一致率が {SIMILAR_LIMIT:.0%} 以上の組: {len(over)}件")
    for r, same, tot, a, b in pairs[:10]:
        mark = "!" if r >= SIMILAR_LIMIT else " "
        print(f" {mark} {r*100:4.0f}%  {same}/{tot}  {a} × {b}")

    return 1 if bad else 0


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(*args))
