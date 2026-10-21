// ============================================================
//  พุ่มดอกไม้ของเซลิน — ชั้นบนแผนที่ที่สร้างระหว่างเกม (GRID_PLAN §7.15 · ผู้ใช้ตัดสิน 2026-10-21)
//   match.board.flora = { "x,y": { owner, left, made } }  → special "bloom" (Board.TERRAIN_INFO: หลบหลีก +20% · ซ่อนตัว · ดอกไม้)
//   left = เทิร์นที่เหลือ (ลดตอนจบเทิร์น — Ice.onEndTurn เรียก tick · 0 = หาย) · made = เกิดจากคฑาแห่งการรังสรรค์ (5) · ไม่ใช่ = รอยเท้า (3)
//  วางทับ: ของที่วางทีหลังแทนของเดิม — พุ่มลบธารน้ำแข็ง/พื้นเปียกที่ช่องนั้น · น้ำแข็ง/พื้นเปียก/หนาม/กำแพงที่วางทีหลังลบพุ่ม (server/ice.js)
//   ช่องพิเศษของแผนที่ (ลาวา/หนามพิษ ฯลฯ) ถูกพุ่มบังไว้จนพุ่มหาย (Ice.overlayOf — พุ่มทับเป็นชั้นสุดท้ายของ special)
//  เปลี่ยนภูมิภาค = หายหมด (placeOnBoard ตั้ง match.board ใหม่) · เลขรุ่นแผนที่ใช้ match.board.iceVer ร่วมกับชั้นน้ำแข็ง
// ============================================================
Object.assign(module.exports, { at, has, canBloom, lay, undo, clear, tick, overlay, publicInfo });

const Board = require("./board");
const match = require("./match");

const K = Board.key;
const parseKey = (k) => { const [x, y] = k.split(",").map(Number); return { x, y }; };
const bumpVer = () => { match.board.iceVer = (match.board.iceVer || 0) + 1; };

function at(x, y) { return (match.board && match.board.flora && match.board.flora[K(x, y)]) || null; }
function has(b) { return !!(b && b.flora && Object.keys(b.flora).length); }
// ปลูกพุ่มที่ช่องนี้ได้ไหม: ในกระดาน · ไม่ใช่สิ่งกีดขวาง (รวมหนาม/กำแพง) · ไม่ใช่ร้านค้า (มีคนยืนได้)
function canBloom(map, x, y) {
  if (!match.board || !Board.inBounds(map, x, y) || map.terrain[K(x, y)]) return false;
  return !(match.shopPos && match.shopPos.x === x && match.shopPos.y === y);
}
// ปลูกพุ่ม → บันทึกที่ปลูกจริง [{ k, x, y, prev: { flora, ice, wet } }] (ไว้ย้อน)
//  keep = ช่องที่มีพุ่มอยู่แล้วไม่แตะ (รอยเท้า: เหยียบพุ่มเดิมไม่รีเซ็ตเวลา) · ไม่ keep = ปลูกทับนับเวลาใหม่ (คฑาแห่งการรังสรรค์)
function lay(map, tiles, owner, turns, { made = false, keep = false } = {}) {
  const b = match.board;
  if (!b || !Array.isArray(tiles)) return [];
  const out = [];
  const seen = new Set();
  for (const t of tiles) {
    if (!t) continue;
    const k = K(t.x, t.y);
    if (seen.has(k) || !canBloom(map, t.x, t.y)) continue;
    seen.add(k);
    b.flora ||= {};
    if (keep && b.flora[k]) continue;
    const prev = {
      flora: b.flora[k] ? { ...b.flora[k] } : null,
      ice: b.ice && b.ice[k] ? { ...b.ice[k] } : null,
      wet: !!(b.wet && b.wet[k]),
    };
    if (b.ice) delete b.ice[k];
    if (b.wet) delete b.wet[k];
    b.flora[k] = { owner: owner || null, left: turns, made: !!made };
    out.push({ k, x: t.x, y: t.y, prev });
  }
  if (out.length) bumpVer();
  return out;
}
// ย้อนการปลูก (กดย้อนการเดิน) — ลำดับย้อนหลัง
function undo(recs) {
  const b = match.board;
  if (!b || !Array.isArray(recs) || !recs.length) return;
  for (const r of [...recs].reverse()) {
    if (!r || !r.k) continue;
    if (r.prev && r.prev.flora) (b.flora ||= {})[r.k] = r.prev.flora;
    else if (b.flora) delete b.flora[r.k];
    if (r.prev && r.prev.ice) (b.ice ||= {})[r.k] = r.prev.ice;
    if (r.prev && r.prev.wet) (b.wet ||= {})[r.k] = true;
  }
  bumpVer();
}
// ถอนพุ่มช่องนี้ (ของอื่นวางทับ) → true = มีพุ่มหายไป
function clear(k) {
  const b = match.board;
  if (!b || !b.flora || !b.flora[k]) return false;
  delete b.flora[k];
  bumpVer();
  return true;
}
// จบเทิร์น: นับเวลาลง → ช่องที่หาย [{ x, y }]
function tick() {
  const b = match.board;
  if (!b || !b.flora) return [];
  const gone = [];
  for (const [k, f] of Object.entries(b.flora)) {
    f.left -= 1;
    if (f.left <= 0) { delete b.flora[k]; gone.push(parseKey(k)); }
  }
  if (gone.length) bumpVer();
  return gone;
}
// รวมเข้าแผนที่ (Ice.overlayOf เรียกเป็นชั้นสุดท้าย) — ช่องที่เป็นสิ่งกีดขวางอยู่ไม่ทับ
function overlay(b, terrain, special) {
  for (const k of Object.keys(b.flora || {})) if (!terrain[k]) special[k] = "bloom";
}
function publicInfo() {
  const b = match.board || {};
  return Object.entries(b.flora || {}).map(([k, f]) => ({ ...parseKey(k), left: f.left, made: !!f.made, owner: f.owner }));
}
