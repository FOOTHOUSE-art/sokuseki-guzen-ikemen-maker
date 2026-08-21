#!/usr/bin/env python3
"""偶然イケメンメーカーの index.html から、指定した関数群の依存閉包を切り出す。

  python3 tools/extract_person.py index.html generateCharacter,buildPrompt

手で拾うと二重定義の死んだほうを掴む(8件ある)。位置で切ると隣を巻き込む
(即席で4関数を巻き込んで消した)。**宣言の範囲を数えて機械的に取る。**

出力:
  build/person_core.js  依存閉包のソース
  build/report.json     取り込んだ宣言、DOM依存、顔立ちキーの参照、乱数の数
"""
import json
import os
import re
import sys

TOP = re.compile(r"^\s*(?:export\s+)?(?:async\s+)?(function|const|let|var)\s+([A-Za-z0-9_$]+)")

FACE_KEYS = """facePresets faceLines faceRatios faceSpacings faceAsyms eyes eyeShapes
eyelids eyeBalances eyelashes eyeBagsPool tearBags eyebrows eyebrowDensities eyebrowGaps
eyebrowGrooms browRidges nose mouth lips lipTones mouthPos jawChins jawAngles foreheads
cheeks dimples moles ears hairStyles hairColors hairTextures hairFinishes hairVolumes
hairlines bangs skin skinDetails glasses facialHair facialHairGrooms ageLooks""".split()

DOM = ["document", "window", "localStorage", "alert", "confirm", "navigator",
       "indexedDB", "setTimeout", "requestAnimationFrame", "FileReader", "Image"]

# 決定G。グループ・友人ペアの生成機能は持ち込まない(内面の友人3関数は別物なので残す)
GROUP_DROP = """buildGroupCtx pickGroupSetting groupSceneBySetting buildGroupPrompt
buildGroupMainPrompt buildGroupOutfitPrompt buildGroupCardPrompt isCombinedGroup
groupMemberIntro buildGroupDistinctionBlock renderGroupUI mbtiFriendWeights createFriend
renderFriendPanel friendRelationText friendPairOutfitPhrase friendPairScene
friendPairCountEn buildFriendPairPrompt renderFriendPairControls""".split()


def strip_code(src):
    """文字列・テンプレート・正規表現・コメントを空白に潰す。深さの計数と識別子の
    抽出の両方で使う。潰さないと、プロンプト文中の波かっこで宣言の範囲がずれる。"""
    out = []
    i, n = 0, len(src)
    prev = ""                # 直前の意味のある文字。/ が除算か正規表現かの判別に使う
    REGEX_OK = set("(,=:[!&|?{};+-*%~^<>") | {""}
    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ""
        if c == "/" and nxt not in "/*" and prev in REGEX_OK:
            # 正規表現リテラル。/"/g のような形を文字列と誤認すると宣言の範囲が壊れる
            j, cls = i + 1, False
            while j < n:
                if src[j] == "\\": j += 2; continue
                if src[j] == "[": cls = True
                elif src[j] == "]": cls = False
                elif src[j] == "/" and not cls: break
                elif src[j] == "\n": break
                j += 1
            if j < n and src[j] == "/":
                j += 1
                while j < n and src[j].isalpha(): j += 1
                out.append(" " * (j - i)); prev = "x"; i = j; continue
        if c == "/" and nxt == "/":
            j = src.find("\n", i)
            j = n if j < 0 else j
            out.append(" " * (j - i)); i = j; continue
        if c == "/" and nxt == "*":
            j = src.find("*/", i + 2)
            j = n if j < 0 else j + 2
            out.append(re.sub(r"[^\n]", " ", src[i:j])); i = j; continue
        if c in "'\"":
            j = i + 1
            while j < n and src[j] != c:
                j += 2 if src[j] == "\\" else 1
            j = min(j + 1, n)
            out.append(re.sub(r"[^\n]", " ", src[i:j])); prev = "x"; i = j; continue
        if c == "`":
            # テンプレート。${ } の中だけはコードとして残す
            out.append(" "); i += 1
            while i < n:
                if src[i] == "\\":
                    out.append("  "); i += 2; continue
                if src[i] == "`":
                    out.append(" "); prev = "x"; i += 1; break
                if src[i] == "$" and i + 1 < n and src[i + 1] == "{":
                    out.append("  "); i += 2
                    depth = 1
                    start = i
                    while i < n and depth:
                        if src[i] == "{": depth += 1
                        elif src[i] == "}": depth -= 1
                        i += 1
                    out.append(strip_code(src[start:i - 1]) + " ")
                    continue
                out.append("\n" if src[i] == "\n" else " "); i += 1
            continue
        out.append(c)
        if not c.isspace(): prev = c
        i += 1
    return "".join(out)


def split_declarations(body):
    """トップレベル(インデント2)の宣言を、かっこの深さを数えて切り出す。
    同名が2回出たら **後のほうが生きている**(JSの関数宣言は後勝ち)。"""
    clean = strip_code(body).split("\n")
    lines = body.split("\n")
    # 波かっこの深さを行頭ごとに数える。IIFEの中(深さ1)にあるものが本当のトップレベル。
    # 字下げでは判定できない。4字下げのまま置かれた宣言が実在する(chooseFashionProfile)
    at_start, dep = [], 0
    for cl in clean:
        at_start.append(dep)
        dep += cl.count("{") - cl.count("}")
    decls, order = {}, []
    i = 0
    while i < len(lines):
        m = TOP.match(lines[i])
        if not m or at_start[i] != 1:
            i += 1; continue
        name = m.group(2)
        depth = 0
        j = i
        while j < len(lines):
            for ch in clean[j]:
                if ch in "({[": depth += 1
                elif ch in ")}]": depth -= 1
            if depth <= 0:
                break
            j += 1
        src = "\n".join(lines[i:j + 1])
        if name in decls:
            decls[name]["dup"].append(i + 1)
            decls[name]["src"] = src            # 後勝ち
            decls[name]["line"] = i + 1
        else:
            decls[name] = {"src": src, "line": i + 1, "dup": []}
            order.append(name)
        i = j + 1
    return decls, order


def main(html_path, roots):
    roots = [r.strip() for r in roots.split(',') if r.strip()]
    s = open(html_path, encoding="utf-8").read()
    a = s.find("<script"); a = s.find(">", a) + 1
    body = s[a:s.rfind("</script>")]
    decls, order = split_declarations(body)

    dups = {k: v["dup"] + [v["line"]] for k, v in decls.items() if v["dup"]}
    names = set(decls)

    # 依存閉包。文字列を潰してから識別子を拾う
    def refs(name):
        code = strip_code(decls[name]["src"])
        return {t for t in re.findall(r"[A-Za-z_$][A-Za-z0-9_$]*", code)} & names

    keep, stack = set(), list(roots)
    while stack:
        cur = stack.pop()
        if cur in keep or cur not in decls:
            continue
        keep.add(cur)
        stack.extend(r for r in refs(cur) - keep if r not in GROUP_DROP)

    kept = [n for n in order if n in keep]
    out = "\n\n".join(decls[n]["src"] for n in kept)

    dom_hits = {}
    for n in kept:
        code = strip_code(decls[n]["src"])
        hit = [d for d in DOM if re.search(r"\b" + d + r"\b", code)]
        if hit:
            dom_hits[n] = hit

    face_hits = {}
    for n in kept:
        code = strip_code(decls[n]["src"])
        hit = [k for k in FACE_KEYS if re.search(r"\b" + k + r"\b", code)]
        if hit:
            face_hits[n] = hit

    os.makedirs("build", exist_ok=True)
    open("build/core.js", "w", encoding="utf-8").write(out)
    report = {
        "roots": roots,
        "declarations_total": len(decls),
        "kept": len(kept),
        "kept_names": kept,
        "duplicates": dups,
        "dom_dependent": dom_hits,
        "face_key_refs": face_hits,
        "math_random": len(re.findall(r"Math\.random", strip_code(out))),
        "group_dropped": sorted(set(GROUP_DROP) & names),
    }
    json.dump(report, open("build/report.json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    missing = [r for r in roots if r not in decls]
    if missing: raise SystemExit("入口が見つからない: " + ", ".join(missing))
    print(f"宣言 {len(decls)} → 依存閉包 {len(kept)}  (入口 {', '.join(roots)})")
    print(f"二重定義 {len(dups)}件(後勝ちを採用)")
    print(f"DOMに触る宣言 {len(dom_hits)}件")
    print(f"顔立ちキーに触る宣言 {len(face_hits)}件")
    print(f"Math.random {report['math_random']}か所")
    print(f"Gで落とした {len(report['group_dropped'])}件")


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) != 2:
        print(__doc__); sys.exit(2)
    main(*args)
