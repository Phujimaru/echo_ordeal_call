// ============================================================
//  สนาม Eos — ระบบ PVE รอบสอง (GRID_PLAN §8.6 "PVE รอบสอง" · ผู้ใช้สั่ง 2026-11-10 "ทำทุกอัน วางแผนให้ดี")
//   ความยาก (โหวต + จำนวนผู้เล่น) · บอสประจำเสา · มอนพิเศษ (ระเบิด/หมอ/ยิงไกล — พฤติกรรมอยู่ใน stage6 actMonsters)
//   คืนพระจันทร์สีเลือด · ภารกิจโซน · เกราะเสา · ช่วยเพื่อนฟื้นเร็ว · ขบวนเสบียง
//  stage6.js ส่ง helper H ให้ทุกฟังก์ชัน (กัน require วน): { spawnMob, mobsOf, heroes, isMob, tileFree, freeNear, hurt, loot, flasksOf,
//   blockedTown, townOf, inRect, manhattan, area3, addScore, sideColor, ZONE_NAMES, MAP, ROAD, canStrike, canMove, daemonStats, footOf }
//  สถานะ = s.ev (สร้างใน init)
// ============================================================
const K = (x, y) => `${x},${y}`;
const lazyShop = () => require("../shop");
const lazySummon = () => require("../summon");

// ---------- ความยาก ----------
const DIFF = {
  // cap = ตัวคูณเพดานมอนพร้อมกัน (ผู้ใช้สั่ง 2026-11-11 — เดิมเพดานเท่ากันทุกระดับ คืนหลังๆ ยากกับปกติจำนวนเท่ากัน · Lament ใช้เพดานของตัวเอง eosLament.LAMENT.cap)
  easy: { hp: 0.75, cnt: 0.75, atk: -1, drop: 10, bossArmor: 0, goal: 50, cap: 0.8 },
  normal: { hp: 1, cnt: 1, atk: 0, drop: 0, bossArmor: 0, goal: 50, cap: 1 },
  hard: { hp: 1.3, cnt: 1.3, atk: 1, drop: 0, bossArmor: 2, goal: 100, cap: 1.25 }, // ยาก = เป้า 100 (ผู้ใช้สั่ง 2026-11-10)
  lament: { hp: 1.6, cnt: 1.5, atk: 1, drop: 0, bossArmor: 4, goal: 100 }, // Lament (ผู้ใช้สั่ง 2026-11-11 — สูงกว่ายาก · ตี +2 → +1 ผู้ใช้ 2026-11-14 "โดนรุม 2 ตัวตายในเทิร์นเดียว ไม่แฟร์" · กติกาเฉพาะ server/fodlan/eosLament.js)
};
const diffOf = (ctx) => DIFF[ctx.match.eosDiff] || DIFF.normal;
// เป้าแต้มรวมตามความยาก · จุดเหตุการณ์ที่ผูกกับแต้ม (ราชาปีศาจ/การ์ดทีม/คืนสุดท้าย) ขยายตามสัดส่วนเป้า (ตั้งไว้ที่เป้า 50 — Claude ตัดสิน)
const goalOf = (ctx) => diffOf(ctx).goal || 50;
const markAt = (ctx, n) => Math.round(n * goalOf(ctx) / 50);
const heads = (ctx) => Object.values(ctx.match.players).filter((p) => !p.summon && !p.duoOf).length || 1;
const crowd = (ctx) => Math.max(0.8, Math.min(1.8, 0.6 + 0.2 * heads(ctx)));
function scaleStats(ctx, st) {
  const d = diffOf(ctx);
  return { ...st, hp: Math.max(1, Math.round(st.hp * d.hp)), atk: st.atk > 0 ? Math.max(1, st.atk + d.atk) : 0 };
}
const scaleCount = (ctx, n, extra = 1) => Math.max(1, Math.round(n * diffOf(ctx).cnt * crowd(ctx) * extra));
const dropBonus = (ctx) => diffOf(ctx).drop;

// ---------- สถานะ ----------
const BOSS = { hp: 30, armor: 4, atk: 4, mov: 4, gold: 8, score: 5, at: 25, roarEvery: 2, pillarHits: 2 };
const QUEST = { from: 3, max: 2, turns: 4, hunt: 3, score: 3, gold: 3, gap: 2, guard: 3, guardTurns: 6, guardPct: 0.5, guardMobs: 2 };
// ภารกิจเฝ้าเมือง (ผู้ใช้สั่ง 2026-11-12 — ให้ผู้เล่นกระจายไปหลายเมือง · ตัวเลข Claude ตั้ง): เมืองขอคนเฝ้า · จบเทิร์นมีคนอยู่ในเมือง = นับ 1 · ครบ 3 ภายใน 6 เทิร์น = สำเร็จ · เริ่มแล้วมีมอนบุกเมืองนั้น 2 ตัว
const CONVOY = { from: 4, every: 6, hp: 12, armor: 2, step: 4, score: 6, gold: 4 };
const BLOOD = { from: 2, pct: 35, count: 1.5 };
const WARD_MAX = 2;
function init(s) {
  s.ev = { boss: null, bossWarn: null, bossFirst: false, blood: false, quests: [], questNext: QUEST.from, convoy: null, convoyNext: CONVOY.from, deathAt: {}, helped: {}, helpBy: {}, seq: 0 };
  return s.ev;
}
const ev = (s) => s.ev || init(s);

// ---------- บอสประจำเสา "ราชาปีศาจ" ----------
//  ครั้งแรก: แต้มรวมถึง BOSS.at (ผู้ใช้เลือก) · หลังจากนั้นทุกต้นคืน (ถ้าไม่มีบอสอยู่) · เตือน 1 เทิร์นก่อนลง
function bossAlive(ctx, H) { return H.mobsOf(ctx).find((m) => m.summon.trait === "boss") || null; }
function bossSpot(ctx, s, H) {
  const owned = s.pillars.filter((pl) => pl.owner);
  const aim = (owned.length ? ctx.pick(owned, 1)[0] : ctx.pick(s.pillars, 1)[0]);
  const map = ctx.map(), cand = [];
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    const d = H.manhattan({ x, y }, aim);
    if (d < 5 || d > 8 || H.townOf(x, y) || !H.tileFree(ctx, s, x, y)) continue;
    const near = Math.min(99, ...H.heroes(ctx).map((p) => H.manhattan(p.pos, { x, y })));
    if (near < 3) continue;
    cand.push({ x, y, near });
  }
  cand.sort((a, b) => b.near - a.near);
  return cand.length ? ctx.pick(cand.slice(0, 8), 1)[0] : H.freeNear(ctx, s, aim.x + 6, aim.y, 6);
}
function warnBoss(ctx, s, H, turn) {
  const e = ev(s);
  if (e.bossWarn || bossAlive(ctx, H)) return false;
  const at = bossSpot(ctx, s, H);
  if (!at) return false;
  e.bossWarn = { x: at.x, y: at.y, at: turn + 1 };
  ctx.bump();
  ctx.fx("boss_warn", { x: at.x, y: at.y });
  ctx.log("⚠️ ราชาปีศาจกำลังจะมาเยือน!");
  return true;
}
// แต้มรวมถึงครึ่ง → เตือนบอสครั้งแรก (เรียกจาก scoreRound)
function onScore(ctx, s, H) {
  const e = ev(s);
  if (!e.bossFirst && s.score >= (ctx.match.eosDiff === "lament" ? BOSS.at : markAt(ctx, BOSS.at))) { e.bossFirst = true; warnBoss(ctx, s, H, ctx.match.roundNumber + 1); }
}
// จำนวนราชาปีศาจต่อครั้ง (ผู้ใช้แจ้ง 2026-11-12 "ยาก 4 คน บอสออกมาแค่ตัวเดียวที่เลือดเยอะ") — ตัวเลข Claude ตั้ง
//  ง่าย 1 · ปกติ 1 (4 คนขึ้นไป 2) · ยาก 1 (3 คนขึ้นไป 2) · คืนสุดท้ายของยาก +1 · Lament 2 (คืนสุดท้าย 3)
//  หลายตัว = เลือดรวมไม่บานตามจำนวนคน: เลือดต่อตัว = เลือดตัวเดียว ÷ จำนวน × 1.25
function bossCount(ctx, s) {
  const d = ctx.match.eosDiff || "normal", n = heads(ctx), fin = !!(s.x && s.x.final);
  if (d === "lament") return fin ? 3 : 2;
  if (d === "hard") return (n >= 3 ? 2 : 1) + (fin ? 1 : 0);
  if (d === "normal") return n >= 4 ? 2 : 1;
  return 1;
}
function landBoss(ctx, s, H, turn) {
  const e = ev(s), w = e.bossWarn;
  if (!w || turn < w.at) return 0;
  e.bossWarn = null;
  const at = H.tileFree(ctx, s, w.x, w.y) ? w : H.freeNear(ctx, s, w.x, w.y, 4);
  if (!at) return 0;
  const d = diffOf(ctx);
  const count = bossCount(ctx, s);
  const hp = Math.round(BOSS.hp * d.hp * (1 + 0.2 * (heads(ctx) - 1)) * (count > 1 ? 1.25 / count : 1));
  const st = { hp, armor: BOSS.armor + d.bossArmor, atk: Math.max(1, BOSS.atk + d.atk), mov: BOSS.mov, gold: BOSS.gold };
  const m = H.spawnMob(ctx, s, "daemon", at, st, { look: 4, tier: Math.max(1, s.nightNo || 1), trait: "boss" });
  m.name = "ราชาปีศาจ";
  e.boss = m.id;
  ctx.bump();
  ctx.fx("boss_land", { id: m.id, x: at.x, y: at.y });
  ctx.log("👑 ราชาปีศาจปรากฏ! มันมุ่งไปทำลายเสา");
  // ตัวที่ 2+ (bossCount) โผล่ห่างตัวแรก
  for (let i = 1; i < count; i++) {
    const at2 = bossSpot(ctx, s, H), ok = at2 && H.tileFree(ctx, s, at2.x, at2.y) ? at2 : H.freeNear(ctx, s, at.x + 4 * i, at.y, 6);
    if (!ok) break;
    const m2 = H.spawnMob(ctx, s, "daemon", ok, st, { look: 4, tier: Math.max(1, s.nightNo || 1), trait: "boss" });
    m2.name = "ราชาปีศาจ";
    ctx.fx("boss_land", { id: m2.id, x: ok.x, y: ok.y });
    ctx.log(`👑 ราชาปีศาจตัวที่ ${i + 1} ปรากฏ!`);
  }
  return 2.2;
}
function onBossDeath(ctx, s, H, m, by) {
  const e = ev(s);
  if (e.boss === m.id) { const o = bossAlive(ctx, H); e.boss = o && o.id !== m.id ? o.id : null; }
  H.addScore(ctx, s, BOSS.score, "boss");
  const got = [];
  for (const p of Object.values(ctx.match.players)) {
    if (p.summon || p.duoOf) continue;
    const it = H.loot(ctx, s, p, { pct: 100, items: ["lifeCrystal", "armorCrystal", "armor", "windBoots"] });
    if (it.length) got.push({ id: p.id, name: it[0].name });
  }
  ctx.fx("boss_die", { id: m.id, x: m.pos ? m.pos.x : 0, y: m.pos ? m.pos.y : 0, by: by ? by.id : null, loot: got });
  ctx.log(`👑 ราชาปีศาจถูกโค่น! แต้มรวม +${BOSS.score} · ทุกคนได้ของรางวัล`);
}

// ---------- คืนพระจันทร์สีเลือด ----------
function onNight(ctx, s, H, freshNight) {
  const e = ev(s);
  if (!freshNight) return 0;
  e.blood = (s.nightNo || 0) >= BLOOD.from && ctx.rng() * 100 < BLOOD.pct;
  let secs = 0;
  if (e.blood) { ctx.fx("blood_moon", {}); ctx.log("🩸 คืนพระจันทร์สีเลือด — ปีศาจมากขึ้น ของรางวัลเพิ่มสองเท่า"); secs = 1.6; }
  if (e.bossFirst && !bossAlive(ctx, H) && !e.bossWarn) warnBoss(ctx, s, H, ctx.match.roundNumber + 1);
  return secs;
}
function onDay(s) { ev(s).blood = false; }
const bloodMul = (s) => (ev(s).blood ? 2 : 1);

// ---------- ภารกิจโซน ----------
const QUEST_ZONES = ["insomnia", "lake", "duscae", "forest", "desert", "hammerhead", "altissia"];
function zoneRect(H, id) { const z = H.MAP.ZONES.find((o) => o.id === id); return z ? z.rect : null; }
function spawnQuest(ctx, s, H, turn) {
  const e = ev(s);
  if (turn < e.questNext || e.quests.length >= QUEST.max) return 0;
  const busy = new Set(e.quests.map((q) => q.zone));
  const zones = ctx.pick(QUEST_ZONES.filter((z) => !busy.has(z)), 7);
  for (const zone of zones) {
    const rect = zoneRect(H, zone);
    if (!rect) continue;
    const isTown = !!H.MAP.ZONES.find((o) => o.id === zone && o.town);
    const type = isTown ? (ctx.rng() < QUEST.guardPct ? "guard" : "scout") : ctx.rng() < 0.45 ? "scout" : "hunt";
    let at = null;
    if (type === "scout") {
      const cand = [];
      for (let y = rect[1]; y <= rect[3]; y++) for (let x = rect[0]; x <= rect[2]; x++) if (H.tileFree(ctx, s, x, y) && !H.heroes(ctx).some((p) => H.manhattan(p.pos, { x, y }) < 4)) cand.push({ x, y });
      at = ctx.pick(cand, 1)[0];
      if (!at) continue;
    } else at = { x: Math.round((rect[0] + rect[2]) / 2), y: Math.round((rect[1] + rect[3]) / 2) };
    const q = { id: `q${++e.seq}`, type, zone, rect: [...rect], x: at.x, y: at.y, need: type === "hunt" ? QUEST.hunt : type === "guard" ? QUEST.guard : 1, have: 0, until: turn + (type === "guard" ? QUEST.guardTurns : QUEST.turns) - 1, by: [] };
    if (type === "guard") guardRaid(ctx, s, H, q);
    e.quests.push(q);
    e.questNext = turn + QUEST.gap;
    ctx.bump();
    ctx.fx("quest_new", { quest: q.id, qtype: type, zone, x: at.x, y: at.y });
    ctx.log(`📯 ภารกิจใหม่ที่ ${H.ZONE_NAMES[zone] || zone}: ${type === "hunt" ? `กวาดล้างมอน ${q.need} ตัว` : type === "guard" ? `เฝ้าเมือง ${q.need} เทิร์น` : "สำรวจจุดสัญญาณ"}`);
    return 1;
  }
  return 0;
}
function questDone(ctx, s, H, q) {
  const e = ev(s);
  e.quests = e.quests.filter((o) => o !== q);
  H.addScore(ctx, s, QUEST.score, "quest");
  for (const id of q.by) {
    const p = ctx.match.players[id];
    if (!p || !p.alive) continue;
    lazyShop().addGold(p, QUEST.gold * bloodMul(s));
    H.loot(ctx, s, p, { pct: 50 + dropBonus(ctx), items: ["armor", "cleanse", "resist", "fortune"] });
  }
  ctx.bump();
  ctx.fx("quest_done", { quest: q.id, qtype: q.type, zone: q.zone, x: q.x, y: q.y, by: q.by });
  ctx.log(`📯 ภารกิจ ${H.ZONE_NAMES[q.zone] || q.zone} สำเร็จ! แต้มรวม +${QUEST.score}`);
}
// ภารกิจเฝ้าเมือง: มอนบุกจากขอบเมือง (ทหารเหล็ก — เข้าเมืองที่ไฟเปิดได้)
function guardRaid(ctx, s, H, q) {
  const [x0, y0, x1, y1] = q.rect, edge = [];
  for (let y = y0 - 2; y <= y1 + 2; y++) for (let x = x0 - 2; x <= x1 + 2; x++) { const out = x < x0 || x > x1 || y < y0 || y > y1; if (out && H.tileFree(ctx, s, x, y) && !H.heroes(ctx).some((p) => H.manhattan(p.pos, { x, y }) < 3)) edge.push({ x, y }); }
  const tier = Math.max(1, s.dayNo || s.nightNo || 1), st = scaleStats(ctx, { hp: 5 + tier, armor: 1 + Math.floor(tier / 2), atk: 2 + Math.floor(tier / 2), mov: 4, gold: 3 });
  for (const at of ctx.pick(edge, Math.min(edge.length, QUEST.guardMobs))) { const m = H.spawnMob(ctx, s, "magitek", at, st, { tier }); if (m) m.summon.born = 0; }
}
// จบเทิร์น (ต้นเทิร์นถัดไป): มีคนอยู่ในเมือง = นับ
function tickGuard(ctx, s, H) {
  for (const q of ev(s).quests.slice()) {
    if (q.type !== "guard") continue;
    const here = H.heroes(ctx).filter((p) => p.alive && p.pos && H.inRect(q.rect, p.pos.x, p.pos.y));
    if (!here.length) continue;
    q.have += 1;
    for (const p of here) if (!q.by.includes(p.id)) q.by.push(p.id);
    ctx.bump();
    if (q.have >= q.need) questDone(ctx, s, H, q);
    else ctx.fx("quest_step", { quest: q.id, have: q.have, need: q.need, x: q.x, y: q.y });
  }
}
function tickQuests(ctx, s, H, turn) {
  const e = ev(s);
  tickGuard(ctx, s, H);
  for (const q of e.quests.slice()) if (turn > q.until) {
    e.quests = e.quests.filter((o) => o !== q);
    ctx.fx("quest_fail", { quest: q.id, zone: q.zone, x: q.x, y: q.y });
    ctx.log(`📯 ภารกิจ ${H.ZONE_NAMES[q.zone] || q.zone} หมดเวลา`);
    ctx.bump();
  }
  return spawnQuest(ctx, s, H, turn);
}
function questKill(ctx, s, H, at, by) {
  if (!at) return;
  for (const q of ev(s).quests.slice()) {
    if (q.type !== "hunt" || !H.inRect(q.rect, at.x, at.y)) continue;
    q.have += 1;
    if (by && !q.by.includes(by.id)) q.by.push(by.id);
    ctx.bump();
    if (q.have >= q.need) questDone(ctx, s, H, q);
    else ctx.fx("quest_step", { quest: q.id, have: q.have, need: q.need, x: at.x, y: at.y });
  }
}
function scoutQuest(ctx, s, H, p) {
  const q = ev(s).quests.find((o) => o.type === "scout" && p.pos && o.x === p.pos.x && o.y === p.pos.y);
  if (!q || !ctx.action.canAct(p)) return false;
  q.by = [p.id];
  q.have = 1;
  questDone(ctx, s, H, q);
  return true;
}

// ---------- เกราะเสา (ไอเทมร้าน Eos) ----------
function wardTarget(ctx, s, p) { return s.pillars.find((pl) => pl.owner && (pl.ward || 0) < WARD_MAX && ctx.adjacent(p, pl.x, pl.y)) || null; }
function useWard(ctx, s, p) {
  const pl = wardTarget(ctx, s, p);
  if (!pl) return false;
  pl.ward = (pl.ward || 0) + 1;
  ctx.bump();
  ctx.fx("pillar_ward", { id: pl.id, x: pl.x, y: pl.y, ward: pl.ward, by: p.id });
  ctx.log(`🛡️ ${p.name} เสริมเกราะเสา (${pl.ward}/${WARD_MAX})`);
  return true;
}

// ---------- ช่วยเพื่อนฟื้นเร็ว ----------
function noteDeathAt(s, p) { if (p && p.pos && !p.summon) ev(s).deathAt[p.id] = { x: p.pos.x, y: p.pos.y }; }
function spiritsNear(ctx, s, p) {
  const e = ev(s), out = [];
  for (const [pid, at] of Object.entries(e.deathAt)) {
    const u = ctx.match.players[pid];
    if (!u || u.alive || s.dead[pid] == null || pid === p.id || (s.lam && s.lam.gone && s.lam.gone[pid])) continue; // Lament: ไม่ฟื้นเองแล้ว = ช่วยเร่งไม่ได้ (ใช้ขนนกคืนชีพ)
    if (Math.abs(at.x - p.pos.x) + Math.abs(at.y - p.pos.y) > 1) continue;
    out.push({ id: pid, x: at.x, y: at.y });
  }
  return out;
}
function help(ctx, s, H, p, tile) {
  const e = ev(s);
  if (!H.canStrike(ctx, p)) return false;
  const sp = spiritsNear(ctx, s, p).find((o) => !tile || (o.x === tile.x && o.y === tile.y));
  if (!sp) return false;
  const key = `${p.id}|${ctx.match.roundNumber}`;
  if (e.helpBy[key]) return false;
  e.helpBy[key] = true;
  s.dead[sp.id] -= 1; // ฟื้นเร็วขึ้น 1 เทิร์น
  e.helped[sp.id] = true;
  const u = ctx.match.players[sp.id];
  ctx.bump();
  ctx.fx("revive_help", { id: sp.id, by: p.id, x: sp.x, y: sp.y });
  ctx.log(`🤝 ${p.name} ช่วยให้ ${u ? u.name : "เพื่อน"} ฟื้นเร็วขึ้น`);
  ctx.useStrike(p, 1.2);
  return true;
}
// จุดฟื้น: ถูกช่วย = ข้างดวงวิญญาณ · ไม่ = null (ใช้จุดเกิดไกลมอนตามเดิม)
function helpedSpot(ctx, s, H, p) {
  const e = ev(s), at = e.deathAt[p.id];
  if (!e.helped[p.id] || !at) return null;
  return H.tileFree(ctx, s, at.x, at.y, p.id) ? { ...at } : H.freeNear(ctx, s, at.x, at.y, 3, p.id);
}
function onRevived(s, pid) { const e = ev(s); delete e.helped[pid]; delete e.deathAt[pid]; }

// ---------- ขบวนเสบียง ----------
const TOWNS3 = ["insomnia", "hammerhead", "altissia"];
function roadIn(H, id) {
  const r = zoneRect(H, id);
  if (!r) return [];
  const out = [];
  for (const k of H.ROAD) { const [x, y] = k.split(",").map(Number); if (H.inRect([r[0] - 1, r[1] - 1, r[2] + 1, r[3] + 1], x, y)) out.push({ x, y }); }
  return out;
}
function roadPath(ctx, H, from, to) {
  const ok = (x, y) => H.ROAD.has(K(x, y));
  const prev = new Map([[K(from.x, from.y), null]]), q = [from];
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    if (c.x === to.x && c.y === to.y) break;
    for (const [dx, dy] of ctx.Board.DIRS) {
      const x = c.x + dx, y = c.y + dy, k = K(x, y);
      if (prev.has(k) || !ok(x, y)) continue;
      prev.set(k, c); q.push({ x, y });
    }
  }
  if (!prev.has(K(to.x, to.y))) return null;
  const path = [];
  for (let c = to; c; c = prev.get(K(c.x, c.y))) path.unshift({ x: c.x, y: c.y });
  return path;
}
function convoyRoute(ctx, s, H, c, goal) {
  const start = { x: c.pos.x, y: c.pos.y };
  const ok = (x, y) => (x === goal.x && y === goal.y) || (H.tileFree(ctx, s, x, y, c.id) && H.carGround(ctx, s, x, y));
  const dist = new Map([[K(start.x, start.y), 0]]), prev = new Map(), buckets = [[start]];
  for (let d = 0; d < buckets.length; d++) {
    for (const cur of buckets[d] || []) {
      if ((dist.get(K(cur.x, cur.y)) ?? 1e9) < d) continue;
      if (cur.x === goal.x && cur.y === goal.y) {
        const path = [];
        for (let k = K(goal.x, goal.y), p = goal; p; k = p && K(p.x, p.y)) { path.unshift({ x: p.x, y: p.y }); p = prev.get(k); }
        return path;
      }
      for (const [dx, dy] of ctx.Board.DIRS) {
        const x = cur.x + dx, y = cur.y + dy;
        if (!ctx.Board.inBounds(ctx.map(), x, y) || !ok(x, y)) continue;
        const nd = d + (H.ROAD.has(K(x, y)) ? 1 : 3), k = K(x, y);
        if (nd >= (dist.get(k) ?? 1e9) || nd > 400) continue;
        dist.set(k, nd); prev.set(k, cur);
        (buckets[nd] ||= []).push({ x, y });
      }
    }
  }
  return null;
}
function spawnConvoy(ctx, s, H, turn) {
  const e = ev(s);
  if (e.convoy || turn < e.convoyNext) return 0;
  if (H.bigFree && !H.bigFree(ctx, s, turn)) { e.convoyNext = turn + 1; return 0; } // เหตุการณ์ใหญ่อื่นอยู่ = รอ
  if (H.bigStart) H.bigStart(s, turn);
  e.convoyNext = turn + CONVOY.every;
  const [a, b] = ctx.pick(TOWNS3, 2);
  const ra = roadIn(H, a), rb = roadIn(H, b);
  if (!ra.length || !rb.length) return 0;
  const ca = zoneRect(H, a), cb = zoneRect(H, b);
  const mid = (r) => ({ x: (r[0] + r[2]) / 2, y: (r[1] + r[3]) / 2 });
  const start = ra.sort((p, q) => H.manhattan(p, mid(ca)) - H.manhattan(q, mid(ca)))[0];
  const goal = rb.sort((p, q) => H.manhattan(p, mid(cb)) - H.manhattan(q, mid(cb)))[0];
  const path = roadPath(ctx, H, start, goal);
  if (!path || path.length < 6) return 0;
  const at = H.tileFree(ctx, s, start.x, start.y) ? start : H.freeNear(ctx, s, start.x, start.y, 3, null, (x, y) => H.ROAD.has(K(x, y)));
  if (!at) return 0;
  const owner = { id: "eosconvoy", name: "Eos", position: 0, customColor: null, teamId: "A" };
  const rec = lazySummon().spawn(owner, {
    kind: "eosConvoy", pos: at, hp: CONVOY.hp, armor: CONVOY.armor, mov: 0, range: [0, 0], name: "รถเสบียง", img: "/eos/img/car2.webp", color: "#e0a63a",
    data: { convoy: true, from: a, to: b, path, step: 0 },
  });
  rec.teamId = "A"; // ฝ่ายผู้เล่น (โหมด eos = ทีม A) — มอนเล็ง ผู้เล่นตีไม่ได้
  e.convoy = { id: rec.id, from: a, to: b, goal: { ...goal } };
  ctx.bump();
  ctx.fx("convoy_start", { id: rec.id, from: a, to: b, x: at.x, y: at.y, goal });
  ctx.log(`🚚 ขบวนเสบียงออกจาก ${H.ZONE_NAMES[a]} ไป ${H.ZONE_NAMES[b]} — คุ้มกันให้ถึง!`);
  return 1.4;
}
function moveConvoy(ctx, s, H) {
  const e = ev(s), c = e.convoy && ctx.match.players[e.convoy.id];
  if (!c || !c.alive || !c.pos) return 0;
  if (((c.statuses.stun || 0) > 0) || ((c.statuses.rooted || 0) > 0)) return 0;
  // หาทางใหม่ทุกเทิร์นจากที่ยืนถึงปลายทาง: ถนนก่อน (ราคา 1) พื้นเรียบอื่นที่รถไปได้ (ราคา 3) · ช่องมีของขวาง (รถจอด ตัวละคร) อ้อม
  const goal = e.convoy.goal;
  const path = convoyRoute(ctx, s, H, c, goal) || [];
  c.summon.path = path.length ? path : c.summon.path;
  const from = { ...c.pos }, steps = [];
  for (let n = 1; n <= CONVOY.step && n < path.length; n++) {
    if (!H.tileFree(ctx, s, path[n].x, path[n].y, c.id)) break;
    steps.push({ ...path[n] });
  }
  if (steps.length) { c.pos = { ...steps[steps.length - 1] }; ctx.bump(); ctx.fx("convoy_move", { id: c.id, from, path: [from, ...steps] }); }
  const i = c.pos.x === goal.x && c.pos.y === goal.y ? 1 : 0;
  if (i || H.manhattan(c.pos, goal) <= 1) {
    const endAt = { ...c.pos };
    lazySummon().remove(c);
    e.convoy = null;
    H.addScore(ctx, s, CONVOY.score, "convoy");
    for (const p of Object.values(ctx.match.players)) {
      if (p.summon || p.duoOf) continue;
      lazyShop().addGold(p, CONVOY.gold * bloodMul(s));
      H.loot(ctx, s, p, { pct: 100, items: ["armor", "cleanse", "resist", "fortune", "battery"] });
    }
    ctx.fx("convoy_done", { x: endAt.x, y: endAt.y });
    ctx.log(`🚚 ขบวนเสบียงถึงปลายทาง! แต้มรวม +${CONVOY.score} · ทุกคนได้เหรียญและของ`);
    return 1.6;
  }
  return steps.length ? 1.1 : 0;
}
function onConvoyDeath(ctx, s, c) {
  const e = ev(s);
  e.convoy = null;
  ctx.bump();
  ctx.fx("convoy_fail", { x: c.pos ? c.pos.x : 0, y: c.pos ? c.pos.y : 0 });
  ctx.log("🚚 ขบวนเสบียงถูกทำลาย");
}
function convoyUnit(ctx, s) { const e = ev(s); return e.convoy ? ctx.match.players[e.convoy.id] || null : null; }

// ---------- ต้นเทิร์น ----------
function preRound(ctx, s, H, turn, freshNight, freshDay) {
  let secs = 0;
  if (freshDay) onDay(s);
  secs = Math.max(secs, onNight(ctx, s, H, freshNight));
  secs = Math.max(secs, landBoss(ctx, s, H, turn));
  if (tickQuests(ctx, s, H, turn)) secs = Math.max(secs, 1.0);
  secs = Math.max(secs, moveConvoy(ctx, s, H));
  secs = Math.max(secs, spawnConvoy(ctx, s, H, turn));
  for (const k of Object.keys(ev(s).helpBy)) if (Number(k.split("|")[1]) < turn - 1) delete ev(s).helpBy[k];
  return secs;
}

// ---------- ปุ่ม HUD ----------
function hud(ctx, s, H, p, out) {
  const e = ev(s);
  const sp = spiritsNear(ctx, s, p);
  if (sp.length) {
    const used = !!e.helpBy[`${p.id}|${ctx.match.roundNumber}`];
    out.push({ key: "fd:help", icon: "🤝", name: "ช่วย", disabled: used || !H.canStrike(ctx, p), tiles: sp.length > 1 ? sp.map((o) => ({ x: o.x, y: o.y })) : undefined,
      desc: "เพื่อนฟื้นเร็วขึ้น 1 เทิร์น ที่นี่" });
  }
  const q = e.quests.find((o) => o.type === "scout" && p.pos && o.x === p.pos.x && o.y === p.pos.y);
  if (q) out.push({ key: "fd:scout", icon: "📡", name: "สำรวจ", disabled: !ctx.action.canAct(p), desc: `แต้มรวม +${QUEST.score}` });
}
function action(ctx, s, H, p, key, tile) {
  if (key === "fd:help") return help(ctx, s, H, p, tile);
  if (key === "fd:scout") return scoutQuest(ctx, s, H, p);
  return null;
}

// ---------- ข้อมูลให้ client ----------
function publicOf(ctx, s, H) {
  const e = ev(s);
  const conv = convoyUnit(ctx, s);
  return {
    diff: ctx.match.eosDiff || "normal",
    blood: !!e.blood,
    boss: e.boss || null,
    bossWarn: e.bossWarn ? { x: e.bossWarn.x, y: e.bossWarn.y, at: e.bossWarn.at } : null,
    bossQuake: e.quake ? { x: e.quake.x, y: e.quake.y, tiles: e.quake.tiles.map((t) => ({ ...t })) } : null, // แผ่นดินแยกที่เตือนไว้ (stage6 bossAct)
    bossAt: markAt(ctx, BOSS.at), bossFirst: !!e.bossFirst,
    quests: e.quests.map((q) => ({ id: q.id, type: q.type, zone: q.zone, rect: q.rect, x: q.x, y: q.y, need: q.need, have: q.have, left: Math.max(0, q.until - ctx.match.roundNumber + 1), by: q.by })),
    convoy: conv && conv.alive && conv.pos ? { id: conv.id, x: conv.pos.x, y: conv.pos.y, hp: conv.hp, maxHp: CONVOY.hp, armor: conv.armor, maxArmor: CONVOY.armor, from: e.convoy.from, to: e.convoy.to, goal: e.convoy.goal, path: conv.summon.path } : null,
    spirits: Object.entries(e.deathAt).filter(([pid]) => s.dead[pid] != null && !(ctx.match.players[pid] && ctx.match.players[pid].corpse)).map(([id, at]) => ({ id, x: at.x, y: at.y, helped: !!e.helped[id] })),
  };
}

module.exports = {
  init, ev, DIFF, diffOf, goalOf, markAt, crowd, scaleStats, scaleCount, dropBonus, bloodMul, BLOOD, BOSS, QUEST, CONVOY, WARD_MAX,
  onScore, warnBoss, landBoss, bossCount, bossAlive, onBossDeath, onNight, onDay, spawnQuest, tickQuests, questKill, questDone, scoutQuest,
  wardTarget, useWard, noteDeathAt, spiritsNear, help, helpedSpot, onRevived, spawnConvoy, moveConvoy, onConvoyDeath, convoyUnit, roadPath, roadIn,
  preRound, hud, action, publicOf,
};
