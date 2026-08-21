/* store.js — 作った人物を手元に貯める。ブラウザの localStorage を使う。
 *
 *   { id, savedAt, title, memo, seed, ov, adj, person, snapshot, thumb }
 *     ov        構成で固定した軸
 *     adj       微調整
 *     person    人物像で選び直した項目だけ
 *     snapshot  人物像229キーの写し(一覧の表示用・作り直しには使わない)
 *     thumb     顔のサムネイル(128px の WebP を dataURL で)
 *
 * **戻すのに要るのは前半の4つだけ。** `buildBaseCard({ seed, ov, adj, person })` で
 * 顔も人物像も同じものに戻る。snapshot と thumb は見て選ぶためのもの。
 *
 * localStorage は5MB前後で止まる。1人あたり snapshot 約7KB + thumb 約4KB。
 * 400人ほどで一杯になる計算なので、`usage()` で残りを見せ、
 * 入らなくなったら **保存を失敗させて知らせる**(黙って消さない)。
 */
const KEY = 'ikemen.people.v1';

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
};
const write = list => localStorage.setItem(KEY, JSON.stringify(list));

export const all = () => read().sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
export const get = id => read().find(r => r.id === id) || null;

export class Full extends Error {}

export function save(rec) {
  const list = read();
  const id = rec.id || 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  const row = Object.assign({ memo: '' }, rec, { id, savedAt: Date.now() });
  const i = list.findIndex(r => r.id === id);
  if (i >= 0) list[i] = row; else list.push(row);
  try { write(list); }
  catch (e) {
    // 容量が尽きた。**古いものを黙って捨てない。** 何をすればいいかを言う
    throw new Full('保存できない。ブラウザの保存領域が一杯（' +
      (usage().bytes / 1048576).toFixed(1) + 'MB / ' + usage().count + '件）。' +
      '「書き出す」で控えてから、いらないものを削除する。');
  }
  return row;
}

export function remove(id) { write(read().filter(r => r.id !== id)); }

/** 書き出し。バックアップと、別の端末へ移すため */
export const exportAll = () => JSON.stringify({ kind: 'ikemen.people', v: 1, list: read() }, null, 1);

/** 取り込み。同じ id は上書きせず、別のものとして足す */
export function importAll(json, { replace = false } = {}) {
  const data = JSON.parse(json);
  const incoming = Array.isArray(data) ? data : (data.list || []);
  if (!Array.isArray(incoming)) throw new Error('形が違う');
  if (replace) { write(incoming); return incoming.length; }
  const list = read();
  const have = new Set(list.map(r => r.id));
  let n = 0;
  for (const r of incoming) {
    if (!r || r.seed == null) continue;
    const row = Object.assign({}, r);
    if (have.has(row.id)) row.id = row.id + '_' + Math.floor(Math.random() * 1296).toString(36);
    list.push(row); n++;
  }
  write(list);
  return n;
}

/** 使っている容量。localStorage は5MB前後で止まる */
export function usage() {
  const s = localStorage.getItem(KEY) || '';
  return { bytes: s.length * 2, count: read().length };
}
