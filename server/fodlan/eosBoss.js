// ============================================================
//  สนาม Eos — ท่าใหญ่ของราชาปีศาจ (ผู้ใช้สั่ง 2026-11-12 "ทำบอสมีท่าใหญ่เตือนล่วงหน้าต่อ" · ตัวเลขทั้งหมด Claude ตั้ง)
//   ทุก BIG.cd เทิร์น บอสแต่ละตัวเตือนท่าใหญ่ 1 ท่า (ช่องม่วงกะพริบ) → ต้นเฟสมอนรอบหน้าลงจริง · บอสตายก่อน = วงหาย
//   beam   ลำแสงทมิฬ    แนวตรงกว้าง 3 ยาว 8 ไปทางที่มีผู้เล่นมากสุด         ดาเมจ 4
//   ring   วงแหวนมรณะ   วงแหวนระยะ 3–5 รอบตัวบอส (ชิดบอส/ถอยไกล = รอด)      ดาเมจ 3
//   meteor ฝนอุกกาบาต   3×3 ใต้ผู้เล่นไม่เกิน 3 คนในระยะ 9                   ดาเมจ 3
//   องครักษ์: เลือดเหลือ ≤ 30% ครั้งแรก = เรียกปีศาจโล่ · พลธนู · หมอ ข้างตัว
//  สถานะ = m.summon.big { kind, at, tiles } · m.summon.guards
// ============================================================
const BIG = {
  cd: 3, first: 2, beamLen: 8, beamDmg: 4, ringIn: 3, ringOut: 5, ringDmg: 3, meteorR: 9, meteorMax: 3, meteorDmg: 3,
  guardAt: 0.3, guards: ["shield", "archer", "healer"],
};
const NAMES = { beam: "ลำแสงทมิฬ", ring: "วงแหวนมรณะ", meteor: "ฝนอุกกาบาต" };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const md = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const uniq = (list) => { const seen = new Set(); return list.filter((t) => { const k = `${t.x},${t.y}`; if (seen.has(k)) return false; seen.add(k); return true; }); };

function beamTiles(m, dx, dy) {
  const out = [];
  for (let i = 1; i <= BIG.beamLen; i++) for (let w = -1; w <= 1; w++) out.push({ x: m.pos.x + dx * i + dy * w, y: m.pos.y + dy * i + dx * w });
  return out;
}
function ringTiles(m) {
  const out = [];
  for (let dy = -BIG.ringOut; dy <= BIG.ringOut; dy++) for (let dx = -BIG.ringOut; dx <= BIG.ringOut; dx++) { const d = Math.abs(dx) + Math.abs(dy); if (d >= BIG.ringIn && d <= BIG.ringOut) out.push({ x: m.pos.x + dx, y: m.pos.y + dy }); }
  return out;
}
// เลือกท่า: แนวที่โดนได้ ≥ 2 คน → ลำแสง · มีคนอยู่ในวงแหวน ≥ 2 → วงแหวน · มีคนในระยะ 9 → อุกกาบาต · (โดนคนเดียวก็ยังใช้ท่าที่โดนเยอะสุด)
function plan(ctx, s, H, m, all) {
  const near = all.filter((p) => p.alive && p.pos && md(p.pos, m.pos) <= BIG.meteorR);
  if (!near.length) return null;
  const inside = (tiles) => { const keys = new Set(tiles.map((t) => `${t.x},${t.y}`)); return near.filter((p) => H.footOf(ctx, p).some((t) => keys.has(`${t.x},${t.y}`))).length; };
  const opts = [];
  for (const [dx, dy] of DIRS) { const tiles = beamTiles(m, dx, dy); opts.push({ kind: "beam", tiles, n: inside(tiles), dir: { dx, dy } }); }
  { const tiles = ringTiles(m); opts.push({ kind: "ring", tiles, n: inside(tiles) }); }
  { const tg = near.slice().sort((a, b) => md(a.pos, m.pos) - md(b.pos, m.pos)).slice(0, BIG.meteorMax); const tiles = uniq(tg.flatMap((p) => H.area3(p.pos.x, p.pos.y))); opts.push({ kind: "meteor", tiles, n: inside(tiles) - 0.5, centers: tg.map((p) => ({ x: p.pos.x, y: p.pos.y })) }); } // อุกกาบาตหนีง่ายสุด = ใช้เมื่อท่าอื่นไม่คุ้ม
  opts.sort((a, b) => b.n - a.n);
  const pick = opts[0];
  if (!(pick.n > 0)) return null;
  pick.tiles = pick.tiles.filter((t) => ctx.Board.inBounds(ctx.map(), t.x, t.y));
  return pick;
}
// เตือน (ปลายเทิร์นบอส) · คืน true = เตือนแล้ว
function warn(ctx, s, H, m, all, round, busy) {
  const sm = m.summon;
  const ready = sm.bigAt != null ? sm.bigAt + BIG.cd : (sm.born ?? round) + BIG.first; // ลงสนามแล้ว BIG.first เทิร์นถึงใช้ท่าแรก
  if (busy || sm.big || round < ready) return false;
  const p = plan(ctx, s, H, m, all);
  if (!p) return false;
  sm.big = { kind: p.kind, at: round + 1, tiles: p.tiles, dir: p.dir || null, centers: p.centers || null };
  sm.bigAt = round;
  ctx.fx("boss_big_warn", { id: m.id, move: p.kind, x: m.pos.x, y: m.pos.y, tiles: p.tiles, dir: p.dir || null, centers: p.centers || null });
  ctx.log(`⚠️ ราชาปีศาจเตรียม${NAMES[p.kind]} — ออกจากช่องม่วง!`);
  return true;
}
// ลง (ต้นเทิร์นบอส) · คืน true = ลงแล้ว
function land(ctx, s, H, m, round) {
  const sm = m.summon, b = sm.big;
  if (!b || round < b.at) return false;
  sm.big = null;
  const dmg = b.kind === "beam" ? BIG.beamDmg : b.kind === "ring" ? BIG.ringDmg : BIG.meteorDmg, hits = [];
  for (const u of H.unitsOn(ctx, b.tiles)) { if (H.isMob(u) || !u.alive) continue; hits.push({ id: u.id, dmg: ctx.combat.withEffectSource(m, () => ctx.damage(u, dmg)) }); }
  ctx.fx("boss_big", { id: m.id, move: b.kind, x: m.pos.x, y: m.pos.y, tiles: b.tiles, dir: b.dir, centers: b.centers, hits });
  ctx.log(`👑 ${NAMES[b.kind]}!${hits.length ? ` โดน ${hits.length} คน` : " ไม่โดนใคร"}`);
  return true;
}
// องครักษ์ (ครั้งเดียว)
function guards(ctx, s, H, m) {
  const sm = m.summon;
  if (sm.guards || !(sm.maxHp > 0) || m.hp > sm.maxHp * BIG.guardAt) return null;
  sm.guards = true;
  const st = H.daemonStats(Math.max(2, (s.nightNo || 1) + 1)), spawned = [];
  for (const tr of BIG.guards) {
    if (H.mobRoom(ctx) <= 0) break;
    const at = H.freeNear(ctx, s, m.pos.x, m.pos.y, 2);
    if (!at) break;
    const g = H.spawnMob(ctx, s, "daemon", at, H.traitStats(st, tr), { look: 1 + (++s.seq % 8), tier: s.nightNo || 1, trait: tr, noElite: true });
    if (g) { g.summon.born = 0; spawned.push({ id: g.id, x: at.x, y: at.y, trait: tr }); }
  }
  ctx.fx("boss_guards", { id: m.id, x: m.pos.x, y: m.pos.y, spawned });
  ctx.log("👑 ราชาปีศาจเรียกองครักษ์!");
  return spawned;
}
function publicOf(ctx, list) {
  return list.filter((m) => m.summon.big).map((m) => ({ id: m.id, kind: m.summon.big.kind, tiles: m.summon.big.tiles, dir: m.summon.big.dir, centers: m.summon.big.centers }));
}

module.exports = { BIG, NAMES, plan, warn, land, guards, publicOf, beamTiles, ringTiles };
