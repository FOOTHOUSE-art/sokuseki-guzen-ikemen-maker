/* sokuseki.js — 即席の抽選・イケメン度・レア判定への入口。
 *
 * **ブラウザと node で読む先が違う。ここだけが分かれ目。**
 *   ブラウザ … ../app.js（アプリ本体。engine.js を要る）
 *   node    … ./sokuseki.node.js（app.js からの生成物。合成には触らない）
 *
 * 呼ぶ側(base_card / rarity / 検査)は、どちらでも同じ名前で読める。
 * 写しを2つ持たないための1枚。引き継ぎ資料 §5-6。
 */
const inBrowser = typeof window !== 'undefined';
const m = await import(inBrowser ? '../app.js?v=09300' : './sokuseki.node.js');

export const roll = m.roll;
export const ikemenScore = m.ikemenScore;
export const rank = m.rank;
export const rarity = m.rarity;
export const normAdj = m.normAdj;
export const geometry = m.geometry;
export const ADJ0 = m.ADJ0;
/* M と MET は読み込みのあとで入るので、そのまま渡さない。
   必要なら getM() / getMET() で取る(いまは誰も使っていない)。 */
export const getM = () => m.M;
export const getMET = () => m.MET;
