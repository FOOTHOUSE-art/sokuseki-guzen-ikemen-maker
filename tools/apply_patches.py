#!/usr/bin/env python3
"""apply_patches.py — 即席メーカーに、統合エンジンの差分3本を当てる。

  python3 apply_patches.py <アプリのフォルダ> <統合エンジンのフォルダ>

当てるもの
  1. 服「なし」          docs/PATCH_cloth_none.md      parts.json / app.js ×2
  2. 共有URL            docs/PATCH_url_state.md       url_state.js / index.html ×4
  3. 統合エンジンの組み込み docs/PATCH_integration.md    engine の6本 / index.html

**同じ置換を2回当てない。** 当てた形が既にあれば飛ばす。
置換は「見つからなければ止める」。文字列の置換は空振りしても通ってしまうため
(引き継ぎ資料 §5-7 で実際に踏んだ)。
"""
import json
import re
import shutil
import sys
from pathlib import Path


def sub1(text, old, new, what):
    """1か所だけ置き換える。見つからなければ止める。既に当たっていれば飛ばす。"""
    if new in text and old not in text:
        print(f'  -- {what}(当たっている)')
        return text
    n = text.count(old)
    if n != 1:
        raise SystemExit(f'!! {what}: 見つからないか複数ある({n}か所)')
    print(f'  ok {what}')
    return text.replace(old, new, 1)


def main(app_dir, eng_dir):
    app, eng = Path(app_dir), Path(eng_dir)
    idx = app / 'index.html'
    js = app / 'app.js'

    # ---- 1. 服「なし」 ----------------------------------------------------
    print('1. 服「なし」')
    parts = json.loads((app / 'assets/parts.json').read_text(encoding='utf-8'))
    opts = parts['axes']['cloth']['options']
    if not any(o['id'] == 'none' for o in opts):
        opts.insert(0, {'id': 'none', 'label': 'なし', 'w': 6})
        parts['axes']['cloth']['note'] = \
            'none は服のレイヤーを描かない。素体は鎖骨から上の素肌で、そのまま出せる'
        (app / 'assets/parts.json').write_text(
            json.dumps(parts, ensure_ascii=False, indent=1), encoding='utf-8')
        print('  ok parts.json に none を足した')
    else:
        print('  -- parts.json(当たっている)')

    t = js.read_text(encoding='utf-8')
    t = sub1(t,
             "const L = [P.body(), P.face(s), P.ear(s), P.nose(s), P.mouth(s), P.hair(s), P.cloth(s)];",
             "const L = [P.body(), P.face(s), P.ear(s), P.nose(s), P.mouth(s), P.hair(s)];\n"
             "  if (s.cloth.id !== 'none') L.push(P.cloth(s));",
             'app.js 必要なファイル')
    t = sub1(t,
             """  const cc = cm ? cm[s.cloth.id] : null;
  E.over(buf, cc ? E.colorizeCloth(await g(P.cloth(s)), CLOTH_PAL[s.clothColor], cc.lo, cc.hi)
                 : await g(P.cloth(s)));""",
             """  if (s.cloth.id !== 'none') {
    const cc = cm ? cm[s.cloth.id] : null;
    E.over(buf, cc ? E.colorizeCloth(await g(P.cloth(s)), CLOTH_PAL[s.clothColor], cc.lo, cc.hi)
                   : await g(P.cloth(s)));
  }""",
             'app.js 合成')
    js.write_text(t, encoding='utf-8')

    # ---- 2. 共有URL ------------------------------------------------------
    print('2. 共有URL')
    # url_state.js は engine/ から読む。直下には置かない
    h = idx.read_text(encoding='utf-8')
    h = sub1(h,
             "import { load, preload } from './loader.js?v=09157';",
             "import { load, preload } from './loader.js?v=09157';\n"
             "import { encodeState, decodeState, shareNote } from './engine/url_state.js?v=09300';",
             'index.html 読み込み')
    h = sub1(h,
             """  const seed = parseInt(location.hash.slice(1),10);
  await draw(Number.isFinite(seed) ? seed>>>0 : (Math.random()*4294967296)>>>0);""",
             """  const st = decodeState(location.hash, A.ADJ0);
  if(st.version && st.version !== A.VERSION)
    console.warn('URLの版が違う: ' + st.version + ' → ' + A.VERSION);
  OV = st.ov;
  ADJ = Object.assign({}, A.ADJ0, st.adj);
  syncAdjUI();
  await draw(st.seed != null ? st.seed : (Math.random()*4294967296)>>>0);""",
             'index.html シードの読み込み')
    h = sub1(h, "    location.hash=seed;",
             "    location.hash = encodeState({ seed, ov: OV, adj: ADJ, adj0: A.ADJ0, version: A.VERSION });",
             'index.html シードの書き出し')
    h = sub1(h,
             "  const url=location.origin+location.pathname+'#'+(cur?cur.seed:0);",
             "  const url = location.origin + location.pathname + '#' +\n"
             "    encodeState({ seed: cur ? cur.seed : 0, ov: OV, adj: ADJ, adj0: A.ADJ0, version: A.VERSION });\n"
             "  const note = shareNote(STAMPS, STROKES);\n"
             "  if(note) $('perf').textContent = note;",
             'index.html 共有ボタン')
    # スライダーに値を戻す。既存の PCT をそのまま使う
    h = sub1(h, "const AXGROUPS = [",
             """function syncAdjUI(){
  for(const [, rows] of GROUPS) for(const [k] of rows){
    const el = $('a_' + k); if(!el) continue;
    const v = PCT.has(k) ? Math.round(ADJ[k] * 100) : ADJ[k];
    el.value = v;
    const out = $('v_' + k); if(out) out.textContent = PCT.has(k) ? v + '%' : String(v);
  }
}

const AXGROUPS = [""",
             'index.html スライダーを戻す')

    # ---- 3. 統合エンジン --------------------------------------------------
    print('3. 統合エンジン')
    # **engine の中身は移さない。** 同じものを2か所に置くと、
    # 片方だけ直して「直った」と誤認する(引き継ぎ資料 §5-6)。
    # アプリ側から engine/ を読む。engine/sokuseki.js が
    # ブラウザなら ../app.js、node なら生成物、と切り替える
    dst = app / 'engine'
    dst.mkdir(exist_ok=True)
    for f in eng.iterdir():
        if f.is_file() and f.name != 'report.json':
            shutil.copy(f, dst / f.name)
    shutil.copy(eng / 'db.html', app / 'db.html')
    print(f'  ok engine/ を置いた({len(list(dst.iterdir()))}ファイル)')

    h = sub1(h,
             "import { encodeState, decodeState, shareNote } from './engine/url_state.js?v=09300';",
             "import { encodeState, decodeState, shareNote } from './engine/url_state.js?v=09300';\n"
             "import { buildBaseCard, setPresets, DERIVED_TYPES } from './engine/base_card.mjs?v=09300';\n"
             "import { judge, lines as rareLines } from './engine/rarity.js?v=09300';\n"
             "import { sections, options, LAYOUT, HUE } from './engine/profile_view.js?v=09300';\n"
             "import * as Store from './engine/store.js?v=09300';\n"
             "import { naturalAdj } from './engine/face_text.js?v=09300';",
             'index.html 統合エンジンの読み込み')
    h = sub1(h, "  M = await A.init();",
             "  M = await A.init();\n"
             "  try{ setPresets(await (await fetch('engine/face_presets.json')).json()); }\n"
             "  catch(e){ console.error('顔立ちプリセットを読めない:', e); }",
             'index.html プリセットの読み込み')

    # 画面。プロフィールのカードの下に足す
    h = sub1(h,
             """      <div class="card">
        <h2>プロフィール</h2>
        <div class="prof" id="prof">「ガチャを回す」を押してください。</div>
      </div>""",
             """      <div class="card">
        <h2>プロフィール</h2>
        <div class="prof" id="prof">「ガチャを回す」を押してください。</div>
      </div>
      <div class="card">
        <h2>人物像</h2>
        <div class="prof" id="person">—</div>
        <div class="tags" id="rareTags" style="margin-top:6px"></div>
      </div>
      <div class="card">
        <h2>生成AI向け</h2>
        <div class="prof" id="faceLine" style="margin-bottom:8px">—</div>
        <textarea id="cardPrompt" readonly
          style="width:100%;height:150px;font-size:11px;line-height:1.6;resize:vertical"></textarea>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button id="copyCard" style="flex:1">基準カードを写す</button>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <select id="derivedType" style="flex:1;min-width:0"></select>
          <button id="copyDerived">派生を写す</button>
        </div>
      </div>""",
             'index.html 画面')


    # 枠の幅。列を5つにするので、画像が元の大きさ(720px)のまま入るところまで広げる。
    #   300 + 280 + 720 + 560 + 320 = 2180
    h = h.replace('max-width:1560px', 'max-width:2180px')
    # **?v= を上げる。** GitHub Pages はキャッシュを持つので、
    # ここを据え置くと直したのに古いものが動く。
    # **index.html だけ上げてはいけない。** app.js や warp.js の中にも ?v= があり、
    # 食い違うと同じファイルが別のモジュールとして2回読まれる。
    # loader.js が2つになり、片方の crop が null のまま落ちる(実際に踏んだ)
    h = h.replace('?v=09157', '?v=09300')
    for f in ('app.js', 'warp.js', 'engine.js', 'loader.js'):
        q = app / f
        if q.exists():
            q.write_text(q.read_text(encoding='utf-8').replace('?v=09157', '?v=09300'),
                         encoding='utf-8')

    # 画面の列を5つにする。イケメン度の左と、構成の右に足す
    h = sub1(h,
             "  .work{display:grid;grid-template-columns:280px minmax(0,1fr) 560px}",
             "  .work{display:grid;grid-template-columns:300px 280px minmax(0,1fr) 560px 320px}\n"
             "  .farcol{padding:18px;display:flex;flex-direction:column;gap:14px;min-width:0}\n"
             "  .farleft{border-right:1px solid var(--line)}\n"
             "  .farright{border-left:1px solid var(--line)}\n"
             "  .kv{display:grid;grid-template-columns:76px minmax(0,1fr);gap:2px 8px;font-size:12px;line-height:1.7}\n"
             "  .pfrows{display:flex;flex-direction:column;gap:1px}\n"
             "  .pfrow{display:grid;grid-template-columns:82px minmax(0,1fr) 22px;gap:6px;align-items:start;\n"
             "    font-size:12px;line-height:1.65;padding:2px 0;border-bottom:1px solid var(--line)}\n"
             "  .pfrow b{color:var(--muted);font-weight:600}\n"
             "  .pfrow.pf-on{background:rgba(10,125,74,.07)}\n"
             "  .pfrow.pf-on b{color:#0a7d4a}\n"
             "  .pf-b{border:0;background:transparent;cursor:pointer;font-size:11px;color:var(--muted);padding:0}\n"
             "  .pf-b:hover{color:var(--fg)}\n"
             "  .pfsec>summary{cursor:pointer;list-style:none;display:flex;align-items:center}\n"
             "  .pfsec>summary::-webkit-details-marker{display:none}\n"
             "  .pfsec>summary::before{content:\'\\25b8\';margin-right:6px;color:var(--muted);\n"
             "    transition:transform .12s;display:inline-block}\n"
             "  .pfsec[open]>summary::before{transform:rotate(90deg)}\n"
             "  .pfsec>summary h2{margin:0;display:flex;align-items:center;gap:6px}\n"
             "  .pfn{font-size:10px;color:var(--muted);font-weight:400}\n"
             "  .pfsec[open]>summary{margin-bottom:6px}\n"
             "  .pfsec{border-left:3px solid var(--c);padding-left:11px}\n"
             "  .pfsec>summary::before{color:var(--c)}\n"
             "  .pfsec>summary h2{color:var(--c)}\n"
             "  .pfsec>summary:hover{background:color-mix(in srgb,var(--c) 7%,transparent);\n"
             "    border-radius:6px}\n"
             "  .pfsec .pfrow b{color:color-mix(in srgb,var(--c) 62%,var(--muted))}\n"
             "  .pfsec .pfrow.pf-on{background:color-mix(in srgb,var(--c) 9%,transparent)}\n"
             "  .pfsec .pfrow.pf-on b{color:var(--c)}\n"
             "  .pfn{background:color-mix(in srgb,var(--c) 12%,transparent);border-radius:999px;\n"
             "    padding:0 6px;color:var(--c)}\n"
             "  .kv b{color:var(--muted);font-weight:600}\n"
             "  .flow{font-size:12px;line-height:1.85;white-space:pre-wrap;word-break:break-word}\n"
             "  @media(max-width:1700px){\n"
             "    .work{grid-template-columns:280px minmax(0,1fr) 560px}\n"
             "    .farcol{grid-column:1/-1;border:0;border-top:1px solid var(--line);\n"
             "      display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}\n"
             "  }",
             'index.html 列を5つに')

    # 最左列。イケメン度の左
    h = sub1(h, '  <div class="work">\n    <div class="leftcol">',
             """  <div class="work">
    <div class="farcol farleft">
      <div id="pfleft"></div>
      <div class="card">
        <h2>この人物</h2>
        <label class="chk" style="display:flex;gap:6px;align-items:center;margin-bottom:8px">
          <input type="checkbox" id="adjRandom" checked>微調整も自然な範囲で引く</label>
        <div style="display:flex;gap:6px">
          <input id="pfTitle" placeholder="名前を付けて保存" style="flex:1;min-width:0">
          <button id="pfSave">保存</button>
        </div>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button id="pfDb" style="flex:1">保存した人物…</button>
          <button id="pfReset">編集を戻す</button>
        </div>
        <div class="muted" id="pfState" style="margin-top:6px"></div>
      </div>
    </div>
    <div class="leftcol">""",
             'index.html 最左列')

    # 最右列。構成の右。side の閉じ(perf の後)に足す
    h = sub1(h, '      <div class="muted" id="perf"></div>',
             """      <div class="muted" id="perf"></div>
    </div>
    <div class="farcol farright">
      <div id="pfright"></div>""",
             'index.html 最右列')

    # **ガチャのときだけ微調整も引き直す。**
    # URLや保存から戻したときに引き直すと、同じ人物が別の顔になる
    h = sub1(h, "$('go').onclick=()=>draw((Math.random()*4294967296)>>>0);",
             """$('go').onclick=()=>{
  const s=(Math.random()*4294967296)>>>0;
  if($('adjRandom').checked){ ADJ = naturalAdj(s, A.ADJ0); syncAdjUI(); }
  draw(s);
};""",
             'index.html ガチャで微調整も引く')

    # draw() の最後で作る。$('perf') を書いている行の直前に差す
    # 「眼鏡を必ず付ける」は OV ではなく draw の中の ov に足される。
    # OV を渡すと、画像に眼鏡があるのに文章に無い、という食い違いが起きる。
    # 実際に合成に使った ov と adj をそのまま渡す
    h = sub1(h, "    const st=A.stats();",
             """    try{ renderPrompt(seed, ov, adjUsed); }
    catch(e){ $('faceLine').textContent = 'プロンプト: ' + e.message; }
    const st=A.stats();""",
             'index.html draw から呼ぶ')
    # イケメン度の計算に使った adj を、あとで使えるように取っておく
    h = sub1(h,
             "    const sc=A.ikemenScore(s, Object.assign({_strokes:STROKES.filter(x=>x.kind!=='eraser').length}, ADJ), STAMPS), rk=A.rank(sc), ra=A.rarity(s);",
             "    const adjUsed = Object.assign({_strokes:STROKES.filter(x=>x.kind!=='eraser').length}, ADJ);\n"
             "    const sc=A.ikemenScore(s, adjUsed, STAMPS), rk=A.rank(sc), ra=A.rarity(s);",
             'index.html 使った adj を取っておく')

    h = sub1(h, "$('share').onclick=async()=>{",
             """let LAST = null;
const PFIX = {};        // 人物像で手で選んだ項目。抽選より優先する
const PFOPEN = {};      // カテゴリの開け閉め
function renderPrompt(seed, ov, adjUsed){
  // **合成に使ったものと同じ ov / adj を渡す。** 渡し忘れると画像と文章がずれる。
  // イケメン度が画面の数字と一致するかで、渡せているか分かる
  LAST = buildBaseCard({ seed, ov, adj: adjUsed });
  const p = LAST.person;
  const j = judge(cur, p, adjUsed, STAMPS);
  $('faceLine').textContent = LAST.block;
  $('person').textContent =
    `${p.name}／${p.age}歳・${p.role}／${p.height}・${p.weight}／${p.bodyType}／MBTI ${p.mbti}`;
  $('rareTags').innerHTML =
    `<span class="tag">${j.rank} ${j.score}pt</span>` +
    rareLines(j).slice(0,6).map(s=>`<span class="tag">${s.replace(/\\s+/g,' ')}</span>`).join('');
  $('cardPrompt').value = LAST.prompt;
  renderPerson(p);
  const sel = $('derivedType');
  if(!sel.options.length)
    sel.innerHTML = DERIVED_TYPES.map(t=>`<option>${t}</option>`).join('');
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function renderPerson(p){
  const secs = sections(p);
  const box = id => secs.filter(s => LAYOUT[id].includes(s.id)).map(s => `
    <details class="card pfsec" data-sec="${s.id}" style="--c:${HUE[s.id] || '#8a8a8e'}"${PFOPEN[s.id] ?? s.open ? ' open' : ''}>
    <summary><h2>${s.title}<span class="pfn">${s.rows.length}</span></h2></summary>
    <div class="pfrows">` + s.rows.map(r => {
      const opts = r.pool ? options(r.pool) : [];
      const btn = !r.key ? ''
        : opts.length ? `<button class="pf-b" data-sel="${r.key}" data-pool="${r.pool}" title="選び直す">▼</button>`
                      : `<button class="pf-b" data-dice="${r.key}" title="引き直す">&#127922;</button>`;
      const on = PFIX[r.key] != null ? ' pf-on' : '';
      return `<div class="pfrow${on}"><b>${esc(r.label)}</b><span>${esc(r.value)}</span>${btn}</div>`;
    }).join('') + `</div></details>`).join('');
  $('pfleft').innerHTML = box('left');
  $('pfright').innerHTML = box('right');
  const n = Object.keys(PFIX).length;
  $('pfState').textContent = n ? `${n}項目を手で選んでいる` : '抽選のまま';
  // 開け閉めを覚えておく。引き直すたびに閉じると使いものにならない
  document.querySelectorAll('.pfsec').forEach(d =>
    d.ontoggle = () => { PFOPEN[d.dataset.sec] = d.open; });
  document.querySelectorAll('[data-sel]').forEach(b => b.onclick = () => openPick(b));
  document.querySelectorAll('[data-dice]').forEach(b => b.onclick = () => {
    // 候補が無い項目は、別のシードで引き直してその項目だけ持ってくる。
    // **引き直す項目を PFIX に入れたまま渡さない。** 渡すとその値で固定され、
    // 何度押しても同じものが返る(最初これで動かなかった)
    const k = b.dataset.dice;
    const rest = Object.assign({}, PFIX); delete rest[k];
    const alt = buildBaseCard({ seed: (cur_seed ^ (Date.now() & 0xffff)) >>> 0,
      ov: OV, adj: ADJ, person: rest });
    PFIX[k] = alt.person[k];
    draw(cur_seed);
  });
}
function openPick(b){
  const k = b.dataset.sel, list = options(b.dataset.pool);
  const now = LAST.person[k];
  const sel = document.createElement('select');
  sel.innerHTML = list.map(o => `<option${o===now?' selected':''}>${esc(o)}</option>`).join('');
  sel.style.cssText = 'position:fixed;z-index:99;font-size:12px;max-width:280px';
  const r = b.getBoundingClientRect();
  sel.style.left = Math.max(8, r.right - 260) + 'px'; sel.style.top = r.bottom + 'px';
  document.body.appendChild(sel); sel.focus();
  const done = () => { sel.remove(); };
  sel.onchange = () => { PFIX[k] = sel.value; done(); draw(cur_seed); };
  sel.onblur = done;
}
$('pfReset').onclick = () => { for(const k in PFIX) delete PFIX[k]; draw(cur_seed); };

function faceThumb(px = 128){
  // 顔まわりだけを切って小さくする。1024 のまま持つと容量が保たない
  const t = document.createElement('canvas'); t.width = t.height = px;
  const g = t.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, px, px);
  g.drawImage($('cv'), 190, 90, 644, 644, 0, 0, px, px);
  return t.toDataURL('image/webp', 0.72);
}
$('pfSave').onclick = () => {
  if(!LAST) return;
  try{
    const rec = Store.save({
      title: $('pfTitle').value || LAST.person.name || '無題',
      seed: cur_seed, ov: OV, adj: ADJ, person: Object.assign({}, PFIX),
      snapshot: LAST.person,          // 人物像229キーの写し。一覧で中身を見るため
      thumb: faceThumb(),             // 顔のサムネイル
    });
    $('pfState').textContent = `「${rec.title}」を保存した`;
  }catch(e){ $('pfState').textContent = e.message; }
};
$('pfDb').onclick = () => window.open('db.html', 'ikemen_db');
// 保存した人物を読み込む。db.html から呼ばれる
function applyRecord(rec){
  if(!rec) return;
  OV = Object.assign({}, rec.ov || {});
  ADJ = Object.assign({}, A.ADJ0, rec.adj || {});
  for(const k in PFIX) delete PFIX[k];
  Object.assign(PFIX, rec.person || {});
  syncAdjUI();
  draw(rec.seed >>> 0);          // draw の中で buildEditor(s) が走り、構成も戻る
}
addEventListener('message', e => {
  if(e.data && e.data.type === 'ikemen-load') applyRecord(e.data.rec);
});
// 別のタブから開かれた直後の受け渡し
try{
  const q = new URLSearchParams(location.search).get('load');
  if(q){ const r = Store.get(q); if(r) setTimeout(()=>applyRecord(r), 0); }
}catch(e){}
$('copyCard').onclick = async () => {
  await navigator.clipboard.writeText($('cardPrompt').value);
  $('copyCard').textContent = '写した'; setTimeout(()=>$('copyCard').textContent='基準カードを写す',1400);
};
$('copyDerived').onclick = async () => {
  if(!LAST) return;
  await navigator.clipboard.writeText(LAST.derived($('derivedType').value));
  $('copyDerived').textContent = '写した'; setTimeout(()=>$('copyDerived').textContent='派生を写す',1400);
};
$('share').onclick=async()=>{""",
             'index.html プロンプトを作る')

    # 版を上げる。**app.js の VERSION も忘れない。**
    # 画面下の性能表示と、共有URLの版タグはこちらを読んでいる。
    # タイトルだけ上げても「まだ古いものが動いている」ように見える
    # 版の表示は3か所ある。**タイトルタグ・ページ見出し・タイトルバー。**
    # どれか1つ残ると「まだ古いものが動いている」ように見える
    h = h.replace('即席イケメンメーカー v0.9157', '即席偶然イケメンメーカー v0.9300')
    h = sub1(h, '即席イケメンメーカー　v0.9157', '即席偶然イケメンメーカー　v0.9300', 'タイトルバーの版')
    h = sub1(h, "const V='0.913';", "const V='0.9300';", 'index.html の V')
    idx.write_text(h, encoding='utf-8')

    t = js.read_text(encoding='utf-8')
    t = sub1(t, "export const VERSION = '0.9157';", "export const VERSION = '0.9300';",
             'app.js の VERSION')
    js.write_text(t, encoding='utf-8')

    # 版が3か所とも上がったか数える
    left = []
    if '0.9157' in idx.read_text(encoding='utf-8').replace('?v=09157', ''):
        left.append('index.html')
    if "VERSION = '0.9157'" in js.read_text(encoding='utf-8'): left.append('app.js')
    if left:
        raise SystemExit('!! 古い版が残っている: ' + ', '.join(left))
    print('  ok 版が3か所とも 0.9300 になった')
    (app / 'version.txt').write_text(
        '即席偶然イケメンメーカー v0.9300  build 2026-08-20\n', encoding='utf-8')
    print('  ok 版を 0.9300 にした')


if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) != 2:
        print(__doc__); sys.exit(2)
    main(*a)
