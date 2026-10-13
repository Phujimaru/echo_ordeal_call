// ============================================================
//  ระบำเขม่า — "ม่านแดง" (ท่าไม้ตายเคท · ผู้ใช้ตัดสิน 2026-10-13)
//   match.board.storms = [{ x0, y0, x1, y1, owner, side, left }] — พื้นที่ 8×8 · อยู่ 3 เทิร์น (ลดตอนจบเทิร์น)
//   - ร่ายแล้ว: ศัตรูของผู้ร่ายที่อยู่ข้างในเสียหาย 1 (เกราะรับก่อน · ฆ่าได้) ทันที และทุกต้นเทิร์นที่ม่านยังอยู่
//   - ขัง: ทุกคนที่อยู่ข้างใน (ยกเว้นฝ่ายผู้ร่าย) ออกไม่ได้ — เดิน/ไถล/ถูกผลัก ข้ามขอบออกไปไม่ได้ · คนนอกเดินเข้ามาได้ (แล้วติด)
//   - มองไม่เห็นข้ามม่าน: คนนอกไม่เห็นคนใน คนในไม่เห็นคนนอก (ฝ่ายผู้ร่ายเห็นทุกคน) · สกิลพื้นที่จากข้างนอกยังโดนคนใน
//   - การสู้กันข้างในไม่ทำให้ใครโผล่ให้คนนอกเห็น (ม่านบังเอง ไม่เกี่ยวกับพุ่มหญ้า)
//   เปลี่ยนภูมิภาค = ม่านหาย (match.board ใหม่)
// ============================================================
Object.assign(module.exports, {
  storms, inside, stormOf, ownStorm, trapOf, blockedFor, hiddenByStorm, cast, tickRound, onEndTurn, publicInfo, active,
});

const match = require("./match");
const combat = require("./combat");
const Duo = require("./duo");

const STORM_TURNS = 3;
const STORM_DMG = 1;
Object.assign(module.exports, { STORM_TURNS, STORM_DMG });

function storms() { return (match.board && match.board.storms) || []; }
function active() { return storms().length > 0; }
function inside(s, pos) { return !!pos && pos.x >= s.x0 && pos.x <= s.x1 && pos.y >= s.y0 && pos.y <= s.y1; }
// ม่านที่ p ยืนอยู่ข้างใน (ตัวแรกที่เจอ) · ไม่อยู่ = null
function stormOf(p) { return (p && p.pos && storms().find((s) => inside(s, p.pos))) || null; }
// p อยู่ในม่านของฝ่ายตัวเองไหม (ติดตัวเคท: เดิน 6/4 · ตีปกติทำให้มองไม่ออก)
function ownStorm(p) { return !!(p && p.pos && storms().some((s) => s.side === Duo.sideKey(p) && inside(s, p.pos))); }
// ม่านที่ขัง p อยู่ (ข้างในม่านของฝ่ายอื่น) · ไม่ถูกขัง = null
function trapOf(p) { return (p && p.pos && p.alive && storms().find((s) => s.side !== Duo.sideKey(p) && inside(s, p.pos))) || null; }
// ช่องที่ p เข้าไม่ได้เพราะถูกขัง (Set-like — Board ใช้แค่ .has) · ไม่ถูกขัง = null
function blockedFor(p) {
  const s = trapOf(p);
  if (!s) return null;
  return { has: (k) => { const [x, y] = k.split(",").map(Number); return !inside(s, { x, y }); } };
}
// viewer มองไม่เห็น target เพราะม่าน (อยู่คนละฝั่งของม่าน) — ฝ่ายผู้ร่ายเห็นทุกคน
function hiddenByStorm(viewer, target) {
  if (!viewer || !target || !viewer.pos || !target.pos) return false;
  for (const s of storms()) {
    if (s.side === Duo.sideKey(viewer)) continue;
    if (inside(s, viewer.pos) !== inside(s, target.pos)) return true;
  }
  return false;
}
// ร่ายม่าน: tiles = ช่องในพื้นที่ (action.tileArea — ตัดขอบกระดานแล้ว) → ม่านที่สร้าง
function cast(p, tiles) {
  if (!match.board || !tiles || !tiles.length) return null;
  const xs = tiles.map((t) => t.x), ys = tiles.map((t) => t.y);
  const s = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), owner: p.id, side: Duo.sideKey(p), left: STORM_TURNS, seq: ++match.transformCounter }; // seq = เพลงเริ่มใหม่ (view.activeSkillMusic)
  (match.board.storms ||= []).push(s);
  return s;
}
// ดาเมจพายุใส่ศัตรูของฝ่ายผู้ร่ายที่อยู่ข้างในม่าน s → [{ id, dmg, kill }]
function strikeInside(s) {
  const out = [];
  const caster = match.players[s.owner] || match.players[s.side];
  for (const t of Object.values(match.players)) {
    if (!t.alive || !t.pos || Duo.sideKey(t) === s.side || !inside(s, t.pos)) continue;
    if (caster && combat.sameTeam(caster, t)) continue;
    const vit = (t.hp || 0) + (t.armor || 0);
    const deal = () => combat.dealMixed(t, STORM_DMG, true);
    if (caster) combat.withEffectSource(caster, deal); else deal();
    t.wasAttacked = true;
    const dmg = Math.max(0, vit - ((t.hp || 0) + (t.armor || 0)));
    if (t.alive && t.hp <= 0) {
      if (caster) combat.withEffectSource(caster, () => combat.instantDeath(t)); else combat.instantDeath(t);
    }
    match.lastLog.push(`🌪️ ${t.name} ติดพายุเขม่า -${dmg} (ลดเกราะก่อน)`);
    if (!t.alive) { match.lastLog.push(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); t.pos = null; }
    out.push({ id: t.id, dmg, kill: !t.alive });
  }
  return out;
}
Object.assign(module.exports, { strikeInside });
// ต้นเทิร์น (phases/draw.js dealRound): ม่านที่ยังอยู่ลงดาเมจอีกครั้ง → [{ id, dmg, kill }]
function tickRound() {
  const out = [];
  for (const s of storms()) out.push(...strikeInside(s));
  return out;
}
// จบเทิร์น: นับเวลาม่าน หมดแล้วหาย
function onEndTurn() {
  const b = match.board;
  if (!b || !b.storms || !b.storms.length) return;
  for (const s of b.storms) s.left -= 1;
  b.storms = b.storms.filter((s) => s.left > 0);
}
function publicInfo() {
  return storms().map((s) => ({ x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1, owner: s.owner, left: s.left }));
}
