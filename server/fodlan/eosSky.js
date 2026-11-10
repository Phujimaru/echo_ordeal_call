// ============================================================
//  สนาม Eos — ระบบ PVE รอบหก (ผู้ใช้สั่ง 2026-11-10 "เอาทุกข้อเลย" — ผลและตัวเลขเป็นข้อเสนอของ Claude · GRID_PLAN §8.6 "PVE รอบหก")
//   คราสกลางวัน (กลางวันมืด 2 เทิร์น ปีศาจโผล่) · คืนจันทร์เต็มดวง (สัตว์ยักษ์ดุ ของดีขึ้น) · ฝนดาวตก (เตือนก่อน 1 เทิร์น
//   ตกแล้วดาเมจ + ทิ้งหินพลังเวท) · รถไฟขนเสบียง (จอดชานชาลา 2 เทิร์น ทีมช่วยกันขนของ) · พายุแม่เหล็ก (สภาพอากาศ: มอนเห็นแค่ 4 ช่อง ·
//   มินิแมพรวน — ผลต่อมอนอยู่ stage6.prey) · ป้อมปืนบนกำแพงพัง/ซ่อมได้ (อยู่ในระบบกำแพงเมืองของ stage6)
//  สถานะ = s.sky (สร้างใน init) · H = helper จาก stage6
// ============================================================
const lazyShop = () => require("../shop");

const ECLIPSE = { fromDay: 2, pct: 10, turns: 2 };                 // ต่อเทิร์นกลางวัน (วันละครั้ง)
const MOON = { fromNight: 2, pct: 30, atk: 1, mov: 1, reach: 1, goldMul: 2 };
const METEOR = { from: 6, pct: 14, count: 4, dmg: 3, splash: 1, gap: 3 };
const SUPPLY = { from: 8, pct: 35, every: 8, stay: 2, max: 6, gold: 2, score: 1 };
const MAGNET = { sight: 4 };

function init(s) {
  s.sky = { eclipse: null, eclipseDay: 0, moon: false, meteor: null, meteorNext: METEOR.from, supply: null, supplyNext: SUPPLY.from, seq: 0 };
}
const sky = (s) => { if (!s.sky) init(s); return s.sky; };

// ---------- คราสกลางวัน ----------
function eclipseAt(s, turn) { const e = sky(s).eclipse; return !!(e && turn >= e.from && turn <= e.until); }
// เรียกก่อนคำนวณกลางวัน/กลางคืนของเทิร์น (stage6.preRound) — คืน true = เริ่มคราสเทิร์นนี้
function maybeEclipse(ctx, s, turn, nightNatural) {
  const k = sky(s);
  if (nightNatural || k.eclipse && turn <= k.eclipse.until) return false;
  if ((s.dayNo || 1) < ECLIPSE.fromDay || k.eclipseDay === (s.dayNo || 1)) return false;
  const H = require("./stage6").H();
  if (!H.bigFree(ctx, s, turn) || ctx.rng() * 100 >= ECLIPSE.pct) return false;
  H.bigStart(s, turn);
  k.eclipse = { from: turn, until: turn + ECLIPSE.turns - 1 };
  k.eclipseDay = s.dayNo || 1;
  ctx.fx("eclipse_start", { turns: ECLIPSE.turns });
  ctx.log(`🌑 สุริยคราส! ฟ้ามืดกลางวัน ${ECLIPSE.turns} เทิร์น — ปีศาจโผล่`);
  return true;
}

// ---------- คืนจันทร์เต็มดวง (คืนที่ไม่ใช่พระจันทร์สีเลือด) ----------
function onNight(ctx, s, freshNight, blood) {
  const k = sky(s);
  if (!freshNight) return 0;
  k.moon = !blood && (s.nightNo || 0) >= MOON.fromNight && ctx.rng() * 100 < MOON.pct;
  if (!k.moon) return 0;
  ctx.fx("full_moon", {});
  ctx.log("🌕 คืนจันทร์เต็มดวง — สัตว์ยักษ์ดุร้ายขึ้น ล้มได้ของรางวัลสองเท่า");
  return 1.4;
}
function onDay(s) { sky(s).moon = false; }
const moonOn = (s) => !!sky(s).moon;
const beastMod = (s) => (moonOn(s) ? { atk: MOON.atk, mov: MOON.mov, reach: MOON.reach, goldMul: MOON.goldMul } : { atk: 0, mov: 0, reach: 0, goldMul: 1 });

// ---------- ฝนดาวตก ----------
function meteorTurn(ctx, s, H, turn) {
  const k = sky(s);
  if (k.meteor && turn >= k.meteor.at) {
    const hits = [], crystals = [];
    for (const t of k.meteor.tiles) {
      for (const u of H.bodies(ctx)) {
        if (!u.alive || !u.pos) continue;
        const d = H.manhattan(u.pos, t);
        if (d > 1) continue;
        const dealt = H.hurt(ctx, u, d === 0 ? METEOR.dmg : METEOR.splash);
        if (dealt) hits.push({ id: u.id, dmg: dealt });
      }
      if (H.tileFree(ctx, s, t.x, t.y)) { // หินพลังเวทจากอุกกาบาต (ตีแล้วได้ขวดเวท — ระบบหินเดิม)
        const el = ["fire", "ice", "thunder"][Math.floor(ctx.rng() * 3) % 3];
        s.crystals.push({ id: `fd:crystal${++s.seq}`, x: t.x, y: t.y, home: null, element: el, meteor: true });
        crystals.push({ x: t.x, y: t.y, element: el });
      }
    }
    k.meteor = null;
    k.meteorNext = turn + METEOR.gap;
    ctx.bump();
    ctx.fx("meteor_impact", { tiles: crystals.length ? crystals : [], hits });
    ctx.log(`☄️ อุกกาบาตตกลงมา!${hits.length ? ` โดน ${hits.length} ตัว` : ""}${crystals.length ? ` · หินพลังเวท ${crystals.length} ก้อน` : ""}`);
    return 1.8;
  }
  if (k.meteor || turn < k.meteorNext || !H.bigFree(ctx, s, turn) || ctx.rng() * 100 >= METEOR.pct) return 0;
  const map = ctx.map(), cand = [];
  for (let y = 1; y < map.rows - 1; y++) for (let x = 1; x < map.cols - 1; x++) {
    if (H.townOf(x, y) || !H.tileFree(ctx, s, x, y) || H.onRail(x, y)) continue;
    cand.push({ x, y });
  }
  const tiles = [];
  for (const t of ctx.pick(cand, cand.length)) { if (tiles.every((o) => H.manhattan(o, t) >= 5)) tiles.push(t); if (tiles.length >= METEOR.count) break; }
  if (!tiles.length) return 0;
  k.meteor = { at: turn + 1, tiles };
  H.bigStart(s, turn);
  ctx.bump();
  ctx.fx("meteor_warn", { tiles });
  ctx.log(`☄️ ฝนดาวตก! อุกกาบาตจะตก ${tiles.length} จุดต้นเทิร์นหน้า — ออกจากวงแดง`);
  return 1.0;
}

// ---------- รถไฟขนเสบียง ----------
function supplyTurn(ctx, s, H, turn) {
  const k = sky(s);
  if (k.supply && turn > k.supply.until) return leaveSupply(ctx, s, H, turn);
  if (k.supply || turn < k.supplyNext || !H.bigFree(ctx, s, turn) || ctx.rng() * 100 >= SUPPLY.pct) return 0;
  // รถไฟปกติจะผ่านภายในช่วงจอด (หรือกำลังเตือน) = ไม่มาจอด (ผู้ใช้แจ้ง "รถไฟจอดรอกับรถไฟที่สร้างความเสียหายมาพร้อมกัน")
  const q0 = H.p4State(s);
  if (q0.trainWarn || q0.trainNext <= turn + SUPPLY.stay + 1) return 0;
  const st = H.MAP.STATIONS[Math.floor(ctx.rng() * H.MAP.STATIONS.length) % H.MAP.STATIONS.length];
  H.bigStart(s, turn);
  k.supply = { x: st[0], y: st[1], until: turn + SUPPLY.stay - 1, loads: 0, by: {} };
  const q = H.p4State(s);
  q.trainNext = Math.max(q.trainNext, turn + SUPPLY.stay + 2); // รถไฟปกติรอจนขบวนเสบียงออก
  ctx.bump();
  ctx.fx("supply_arrive", { x: st[0], y: st[1], turns: SUPPLY.stay });
  ctx.log(`🚂 รถไฟขนเสบียงจอดชานชาลา ${SUPPLY.stay} เทิร์น — ยืนที่ชานชาลาแล้วกด "ขนของ"`);
  return 1.6;
}
function leaveSupply(ctx, s, H, turn) {
  const k = sky(s), sp = k.supply;
  k.supply = null;
  k.supplyNext = turn + SUPPLY.every;
  ctx.bump();
  ctx.fx("supply_leave", { x: sp.x, y: sp.y, loads: sp.loads });
  ctx.log(`🚂 รถไฟขนเสบียงออกเดินทาง — ขนได้ ${sp.loads}/${SUPPLY.max}`);
  return 1.2;
}
function nearSupply(s, p) {
  const sp = sky(s).supply;
  return !!(sp && p && p.pos && Math.abs(p.pos.x - sp.x) + Math.abs(p.pos.y - sp.y) <= 1);
}
function loadSupply(ctx, s, H, p) {
  const sp = sky(s).supply;
  if (!sp || !nearSupply(s, p) || !H.canStrike(ctx, p) || sp.loads >= SUPPLY.max) return false;
  sp.loads += 1;
  sp.by[p.id] = (sp.by[p.id] || 0) + 1;
  lazyShop().addGold(p, SUPPLY.gold);
  H.addScore(ctx, s, SUPPLY.score, "supply");
  ctx.fx("supply_load", { id: p.id, x: sp.x, y: sp.y, loads: sp.loads, max: SUPPLY.max });
  ctx.log(`📦 ${p.name} ขนเสบียงขึ้นรถไฟ (${sp.loads}/${SUPPLY.max}) แต้มรวม +${SUPPLY.score}`);
  ctx.useStrike(p, 1.0);
  if (sp.loads >= SUPPLY.max) leaveSupply(ctx, s, H, ctx.match.roundNumber + 1);
  ctx.bump();
  return true;
}

// ---------- ต้นเทิร์น ----------
function preRound(ctx, s, H, turn) {
  let secs = 0;
  secs = Math.max(secs, meteorTurn(ctx, s, H, turn));
  secs = Math.max(secs, supplyTurn(ctx, s, H, turn));
  const e = sky(s).eclipse;
  if (e && turn > e.until) { sky(s).eclipse = null; ctx.fx("eclipse_end", {}); ctx.log("☀️ คราสผ่านไป ฟ้าสว่างอีกครั้ง"); }
  return secs;
}
function hud(ctx, s, H, p, out) {
  const sp = sky(s).supply;
  if (sp && nearSupply(s, p)) out.push({ key: "fd:supply", icon: "📦", name: "ขนของ", count: SUPPLY.max - sp.loads, disabled: !H.canStrike(ctx, p) || sp.loads >= SUPPLY.max, desc: `ขนเสบียงขึ้นรถไฟ (ใช้การโจมตี) — แต้มรวม +${SUPPLY.score} · ได้เหรียญ ${SUPPLY.gold} · ขนได้อีก ${SUPPLY.max - sp.loads}` });
}
function action(ctx, s, H, p, key) {
  if (key === "fd:supply") return loadSupply(ctx, s, H, p);
  return null;
}
function publicOf(ctx, s) {
  const k = sky(s), turn = ctx.match.roundNumber + 1;
  return {
    eclipse: k.eclipse ? { left: Math.max(0, k.eclipse.until - turn + 1) } : null,
    fullMoon: !!k.moon,
    meteor: k.meteor ? { tiles: k.meteor.tiles.map((t) => ({ ...t })) } : null,
    supply: k.supply ? { x: k.supply.x, y: k.supply.y, loads: k.supply.loads, max: SUPPLY.max, left: Math.max(0, k.supply.until - ctx.match.roundNumber) } : null,
  };
}

module.exports = { init, eclipseAt, maybeEclipse, onNight, onDay, moonOn, beastMod, preRound, hud, action, publicOf, ECLIPSE, MOON, METEOR, SUPPLY, MAGNET, sky };
