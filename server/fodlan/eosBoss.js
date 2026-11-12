// ============================================================
//  สนาม Eos — ท่าใหญ่ของราชาปีศาจ (ผู้ใช้สั่ง 2026-11-12 "ทำบอสมีท่าใหญ่เตือนล่วงหน้าต่อ" · ตัวเลขทั้งหมด Claude ตั้ง)
//   ทุก BIG.cd เทิร์น บอสแต่ละตัวเตือนท่าใหญ่ 1 ท่า (ช่องม่วงกะพริบ) → ต้นเฟสมอนรอบหน้าลงจริง · บอสตายก่อน = วงหาย
//   beam   ลำแสงทมิฬ    แนวตรงกว้าง 3 ยาว 8 ไปทางที่มีผู้เล่นมากสุด         ดาเมจ 4
//   ring   วงแหวนมรณะ   วงแหวนระยะ 3–5 รอบตัวบอส (ชิดบอส/ถอยไกล = รอด)      ดาเมจ 3
//   meteor ฝนอุกกาบาต   3×3 ใต้ผู้เล่นไม่เกิน 3 คนในระยะ 9                   ดาเมจ 3
//   เฟส (ผู้ใช้สั่ง 2026-11-12 "ทำทั้งหมด"): คลั่ง (เลือด ≤ ครึ่ง) = ท่าใหญ่ทุก BIG.cdRage เทิร์น · หลังเรียกองครักษ์ (≤ 30%) สลับใช้ เขตทมิฬ:
//   dark   เขตทมิฬ      วงรัศมี 2 รอบตัวบอส ดาเมจ 2 แล้วพื้นมืดค้าง BIG.darkTurns เทิร์น ยืนในนั้นต้นเฟสมอนเสีย 1
//   องครักษ์: เลือดเหลือ ≤ 30% ครั้งแรก = เรียกปีศาจโล่ · พลธนู · หมอ ข้างตัว
//  สถานะ = m.summon.big { kind, at, tiles } · m.summon.guards
// ============================================================
const BIG = {
  cd: 3, first: 2, beamLen: 8, beamDmg: 4, ringIn: 3, ringOut: 5, ringDmg: 3, meteorR: 9, meteorMax: 3, meteorDmg: 3,
  cdRage: 2, darkR: 2, darkDmg: 2, darkTick: 1, darkTurns: 2,
  guardAt: 0.3, guards: ["shield", "archer", "healer"],
};
const NAMES = { beam: "ลำแสงทมิฬ", ring: "วงแหวนมรณะ", meteor: "ฝนอุกกาบาต", dark: "เขตทมิฬ" };
const diamond = (m, r) => { const out = []; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) <= r) out.push({ x: m.pos.x + dx, y: m.pos.y + dy }); return out; };
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
  let pick = opts[0];
  if (m.summon.guards && m.summon.lastBig !== "dark") { const tiles = diamond(m, BIG.darkR); const n = inside(tiles); if (n > 0) pick = { kind: "dark", tiles, n }; } // เฟสสุดท้าย: สลับเขตทมิฬ
  if (process.env.ECHO_DEV_EOS_BOSS_MOVE) { const dv = process.env.ECHO_DEV_EOS_BOSS_MOVE, f = dv === "dark" ? { kind: "dark", tiles: diamond(m, BIG.darkR) } : opts.find((o) => o.kind === dv); if (f) pick = { ...f, n: Math.max(1, f.n || 0) }; } // dev: บังคับท่า
  if (!(pick.n > 0)) return null;
  pick.tiles = pick.tiles.filter((t) => ctx.Board.inBounds(ctx.map(), t.x, t.y));
  return pick;
}
// เตือน (ปลายเทิร์นบอส) · คืน true = เตือนแล้ว
function warn(ctx, s, H, m, all, round, busy) {
  const sm = m.summon;
  const ready = sm.bigAt != null ? sm.bigAt + (sm.enraged ? BIG.cdRage : BIG.cd) : (sm.born ?? round) + BIG.first; // ลงสนามแล้ว BIG.first เทิร์นถึงใช้ท่าแรก
  if (busy || sm.big || round < ready) return false;
  const p = plan(ctx, s, H, m, all);
  if (!p) return false;
  sm.big = { kind: p.kind, at: round + 1, tiles: p.tiles, dir: p.dir || null, centers: p.centers || null };
  sm.bigAt = round; sm.lastBig = p.kind;
  ctx.fx("boss_big_warn", { id: m.id, move: p.kind, x: m.pos.x, y: m.pos.y, tiles: p.tiles, dir: p.dir || null, centers: p.centers || null });
  ctx.log(`⚠️ ราชาปีศาจเตรียม${NAMES[p.kind]} — ออกจากช่องม่วง!`);
  return true;
}
// ลง (ต้นเทิร์นบอส) · คืน true = ลงแล้ว
function land(ctx, s, H, m, round) {
  const sm = m.summon, b = sm.big;
  if (!b || round < b.at) return false;
  sm.big = null;
  const dmg = b.kind === "beam" ? BIG.beamDmg : b.kind === "ring" ? BIG.ringDmg : b.kind === "dark" ? BIG.darkDmg : BIG.meteorDmg, hits = [];
  if (b.kind === "dark") sm.dark = { tiles: b.tiles, until: round + BIG.darkTurns };
  for (const u of H.unitsOn(ctx, b.tiles)) { if (H.isMob(u) || !u.alive) continue; hits.push({ id: u.id, dmg: ctx.combat.withEffectSource(m, () => ctx.damage(u, dmg)) }); }
  ctx.fx("boss_big", { id: m.id, move: b.kind, x: m.pos.x, y: m.pos.y, tiles: b.tiles, dir: b.dir, centers: b.centers, hits });
  ctx.log(`👑 ${NAMES[b.kind]}!${hits.length ? ` โดน ${hits.length} คน` : " ไม่โดนใคร"}`);
  return true;
}
// เขตทมิฬค้าง: ต้นเทิร์นบอส ผู้เล่นที่ยืนในเขตเสีย BIG.darkTick (บอสตาย = เขตหาย)
function darkTick(ctx, s, H, m, round) {
  const sm = m.summon, z = sm.dark;
  if (!z) return false;
  if (round > z.until) { sm.dark = null; return false; }
  const hits = [];
  for (const u of H.unitsOn(ctx, z.tiles)) { if (H.isMob(u) || !u.alive) continue; hits.push({ id: u.id, dmg: ctx.combat.withEffectSource(m, () => ctx.damage(u, BIG.darkTick)) }); }
  if (hits.length) { ctx.fx("boss_dark", { id: m.id, tiles: z.tiles, hits }); ctx.log(`🌑 เขตทมิฬกัดกิน ${hits.length} คน`); }
  return hits.length > 0;
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
  const r = ctx.match.roundNumber + 1;
  return [
    ...list.filter((m) => m.summon.dark && m.summon.dark.until >= r).map((m) => ({ id: m.id, kind: "dark_zone", tiles: m.summon.dark.tiles, left: m.summon.dark.until - r + 1 })),
    ...list.filter((m) => m.summon.big).map((m) => ({ id: m.id, kind: m.summon.big.kind, tiles: m.summon.big.tiles, dir: m.summon.big.dir, centers: m.summon.big.centers })),
  ];
}

module.exports = { BIG, NAMES, plan, warn, land, guards, darkTick, publicOf, beamTiles, ringTiles };
