#!/usr/bin/env python3
"""build/core.js から build/guzen.js を組み立てる。extract_person.py の後に実行する。

当てるもの:
  手順1  乱数の一本化(Math.random → rand)、読み込み時の状態をシードで作り直す
  手順2  DOM を読む5関数を setConfig() からの読み出しに変える
  手順2b 顔立ちを層1から注入する。年齢による顔立ちの上書きを止める(決定H)
  手順6b 基準カードのプロンプトの【顔】を、即席の記述に差し替える
  手順6c 顔参照画像の前置きを先頭に差し込む

**生成物は手で編集しない。** 偶然メーカー側を直したら流し直す。
"""
import re
import sys

sys.path.insert(0, '.')
from extract_person import strip_code

SRC, DST = 'build/core.js', 'build/guzen.js'

DOM_PATCH = {
    'getInitial': """  function getInitial(){
    const d = { nationality:'', ethnicity:'', ageMin:20, ageMax:32,
      vibe:'ランダム', eraYear:'2026', season:'ランダム', occupation:'ランダム',
      trainingMode:'ランダム', sportsBodyInfluence:'ランダム',
      promptLanguage:'日本語', promptTarget:'ChatGPT' };
    const c = Object.assign({}, d, CFG.initial || {});
    if(c.ageMin > c.ageMax){ const t=c.ageMin; c.ageMin=c.ageMax; c.ageMax=t; }
    return c;
  }""",
    'getFixed': "  function getFixed(){ return Object.assign({}, CFG.fixed || {}); }",
    'readCardFields': "  function readCardFields(scope){ return Object.assign({}, (CFG.cardFields||{})[scope] || {}); }",
    'readCaptionFields': "  function readCaptionFields(scope){ return Object.assign({}, (CFG.captionFields||{})[scope] || {}); }",
    # 画面で組んだレイアウトを読む機能。基準カードでは使わない
    'layoutRefFormat': "  function layoutRefFormat(c, english){ return ''; }",
    # 画面で選んだ派生の種類。CFG.derivedType から取る(手順8)
    'currentDerivedType': ("  function currentDerivedType(){ return CFG.derivedType"
                           " || 'トレーディングカード'; }"),
}

INJECT = """;
    // 手順2b: 層2は顔立ちを決めない。CFG.face(即席が決めた顔立ち)を流し込む。
    // 削除ではなく注入。偶然側は facePreset や hairStyle を服装・雰囲気・レア判定の
    // 重みに使うので、消すと人物の筋が通らなくなる。
    // pickFace / pickHair は、渡されなかったときだけ動く保険になる。
    Object.assign(base, CFG.face || {});
    if(CFG.strictFace){
      const miss = ['facePreset','faceLine','eyelid','eyeShape','nose','lips','skin',
        'hairStyle','hairColor','glasses','facialHair'].filter(k => base[k] == null);
      if(miss.length) throw new Error('層2に顔立ちが渡されていない: ' + miss.join(', '));
    }"""

AGE_OLD = 'let facePreset = chooseFaceAgeCompatible(rawFacePreset, ageAppearance, vibe, age);'
AGE_NEW = ('let facePreset = (CFG.face && CFG.face.facePreset) ? rawFacePreset\n'
           '      : chooseFaceAgeCompatible(rawFacePreset, ageAppearance, vibe, age);'
           '  // 決定H: 顔は画像が正。年齢で選び直さない')

HEAD = """/* 偶然エンジン(層2 + 層3の型) — 偶然イケメンメーカー V4.6.4 から機械生成
   extract_person.py が generateCharacter と buildPrompt の依存閉包を切り出し、
   build.py が手順1・2・2b・6b・6c を当てたもの。**手で編集しない。**
   決定G: グループ・友人ペアの生成20関数は閉包から除外ずみ */
let RNG = () => { throw new Error('setSeed() を先に呼ぶこと。種なしの生成は再現できない'); };
const rand = () => RNG();
export function setSeed(seed){
  let a = seed | 0;
  RNG = function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  resetDecks();
}
let CFG = { initial:{}, fixed:{}, face:null, strictFace:false };
export function setConfig(c){ CFG = Object.assign({initial:{},fixed:{},face:null,strictFace:false}, c); }
"""

TAIL = ("\nexport { generateCharacter, buildPrompt, buildDerivedPrompt, pools,\n"
        "  rarityBreakdown, scoreRarity };\n")


def decl_span(s, name):
    m = re.search(r'\n\s*function ' + name + r'\s*\(', s)
    if not m:
        raise SystemExit(f'{name} が見つからない')
    i = m.start() + 1
    depth, j = 0, i
    while j < len(s):
        ch = s[j]
        if ch in '({[':
            depth += 1
        elif ch in ')}]':
            depth -= 1
            if depth == 0 and ch == '}':
                j += 1
                break
        j += 1
    return i, j


def main():
    src = open(SRC, encoding='utf-8').read()

    # --- 手順1 ------------------------------------------------------------
    clean = strip_code(src)
    out, prev = [], 0
    for m in re.finditer(r'Math\.random\(\)', clean):
        out.append(src[prev:m.start()])
        out.append('rand()')
        prev = m.end()
    out.append(src[prev:])
    src = ''.join(out)

    # 読み込み時に作られる状態を、シードのたびに作り直す。
    # 計測値は事前にシャッフルした山札から順に引く方式で、山札とカーソルの両方が
    # 呼び出しをまたいで残る。ここを直さないと2回目の生成が1回目と変わる。
    m = re.search(r'\n(\s*)const measurementDeckState = \{', src)
    i = m.start() + 1
    j = src.index('};', i) + 2
    block = src[i:j].replace('const measurementDeckState', 'measurementDeckState', 1)
    src = (src[:i] + '  let measurementDeckState = null;\n  function resetDecks(){\n  '
           + block + '\n  }\n' + src[j:])

    # 人物IDは時刻ではなくシードから決める。同じURLで同じIDに戻る
    src = re.sub(r'const uniqId = \(\) =>.*?;',
                 "const uniqId = () => 'p' + Math.floor(rand() * 0xFFFFFFFF).toString(36)"
                 " + Math.floor(rand() * 0xFFFFFFFF).toString(36);", src, count=1)

    # --- 手順2 ------------------------------------------------------------
    for name, body in DOM_PATCH.items():
        a, b = decl_span(src, name)
        src = src[:a] + body + src[b:]

    # --- 手順2b -----------------------------------------------------------
    m = re.search(r'\n(\s*)const base = current && partialMode', src)
    i = m.start() + 1
    j = src.index('\n', i)
    src = src[:i] + src[i:j].rstrip().rstrip(';') + INJECT + src[j:]
    assert AGE_OLD in src
    src = src.replace(AGE_OLD, AGE_NEW)

    # --- 手順6b -----------------------------------------------------------
    # 偶然の【顔】は c.faceLine / c.tearBags / c.nose … と自前の語彙を読む。
    # ここだけを、即席の素材IDから作った記述(c.__faceBlock)に入れ替える。
    # 偶然の【顔】には、顔の語彙のほかに **語彙に依存しない指示**が混ざっている。
    #   realismSpec  実写らしさ(毛穴・色ムラ・AI美形を避ける)  ← いちばん効く
    #   teethLine    歯並びと色。基準カードに歯のパネルがある(決定D)
    #   faceExtraLine / hairDetailLine / originFaceLine
    # **これらは残す。** 最初は【顔】をまるごと差し替えて realismSpec を消してしまい、
    # 生成した顔がイラスト調になった(6d)。差し替えるのは語彙の部分だけにする。
    a = src.index('【顔】${facePresetPhrase(c)}')
    b = src.index('${realismSpec(c, false)}', a)
    n_face = b - a
    src = src[:a] + "【顔】${c.__faceBlock || ''}${c.__faceAging || ''}" + src[b:]

    # 肌・ひげ・眼鏡・髪は即席の記述に入っているので、偶然側の文は落とす。
    # ただし hairDetailLine(前髪・毛量・整髪)と originFaceLine は残す
    a2 = src.index('肌は${c.skin}。')
    b2 = src.index('${hairDetailLine(c, false)}', a2)
    n_face += b2 - a2
    src = src[:a2] + src[b2:]


    # --- 6d の反映 ---------------------------------------------------------
    # j: 「顔：斜め(45度)」を正式なパネルにする。指示していないのに毎回増えたうえ、
    #    資料としては正面と側面の間を埋めるので有用だった
    old_j = '全身の前面・側面、顔の正面・側面、顔正面（歯が見える）'
    assert src.count(old_j) >= 1
    src = src.replace(old_j, '全身の前面・側面、顔の正面・側面・斜め45度、顔正面（歯が見える）')

    # k: 歯のパネルが自然な笑顔で返っていた。原因は teethLine の
    #    「歯は笑ったときに自然に見える範囲でのみ描写し」が、パネルの指示と喧嘩すること。
    #    出力形式の側に同じ趣旨の但し書きが既にあるので、teethLine の末尾は落とす
    old_k = '。歯は笑ったときに自然に見える範囲でのみ描写し、常に歯を見せた表情にはしない。`'
    assert old_k in src
    src = src.replace(old_k, '。`')

    #    そのうえでパネルの指示を強める
    old_k2 = ('顔正面（歯が見える）パネルは、「イー」と口を横に広げて上下の歯列を見せる、'
              '歯科の資料撮影風の即物的な表情にする')
    assert old_k2 in src
    src = src.replace(old_k2, old_k2 + (
        '。笑顔にしない。口角は上げず、唇を左右いっぱいまで水平に引いて、'
        '上下の歯列全体と歯ぐきの際まで見えるようにする'))

    # --- 手順6c -----------------------------------------------------------
    a2 = src.index('return `成人男性キャラクター「${c.name}」の非性的な全身画像を作成する。')
    src = src[:a2] + "return `${c.__refPrefix || ''}" + src[a2 + len('return `'):]

    open(DST, 'w', encoding='utf-8').write(HEAD + src + TAIL)
    left = len(re.findall(r'Math\.random', strip_code(src)))
    print(f'guzen.js を生成。Math.random の残り {left} / '
          f'document. の残り {src.count("document.")} / 差し替えた【顔】 {n_face}文字')


if __name__ == '__main__':
    main()
