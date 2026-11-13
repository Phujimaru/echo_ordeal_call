// ============================================================
//  สนาม Eos — ความยาก "Lament" (สูงกว่ายาก · ผู้ใช้สั่ง 2026-11-11 "เอาหมดเลย" — ตัวเลขทั้งหมด Claude ตั้ง · GRID_PLAN §8.6 "Lament")
//   ค่าพื้นฐานอยู่ที่ eosEvents.DIFF.lament · ไฟล์นี้ = กติกาเฉพาะ Lament + บอสท้ายเกม "ผู้คร่ำครวญ"
//   1 คืนไม่สิ้นสุด (ฟ้าสางปีศาจสลายครึ่งเดียว) · 2 ไฟเมืองไม่ฟื้นตอนเช้า · 3 ชีวิตทีมจำกัด (หมด = ล้มแล้วไม่ฟื้นเอง) · 4 เสาเปราะ (ตีทีเดียวหลุด)
//   5 เสาหลุด = แต้มรวม −3 · 6 มอนดุขึ้นทุก 10 เทิร์น · 7 การ์ดทีมคู่คำสาป · 8 ราชาปีศาจมาเร็ว (แต้ม 25) คืนสุดท้ายมา 2 ตัว
//   9 ร้านแพง ×1.5 · เหรียญจากมอน −1
//   ผู้คร่ำครวญ: แต้มรวมถึง 90 → เตือน 1 เทิร์น → ลงกลางแผนที่ · ชนะ = แต้มครบเป้า และ ล้มผู้คร่ำครวญได้
//  สถานะ = s.lam · H = helper จาก stage6 (กัน require วน)
// ============================================================
// rageAtk 0 (ผู้ใช้ 2026-11-14 — ความแฟร์: มอนตีได้ไม่เกิน 4 ความดุเหลือแค่เดินไกลขึ้น)
const LAMENT = { dawnKeep: 0.5, lives: 3, rageEvery: 10, rageAtk: 0, rageMov: 2, pillarLoss: 3, shop: 1.5, goldCut: 1, reviveAdd: 1, cap: { base: 16, perHero: 5, max: 36 }, bossAt: 25 };
const LORD = { at: 90, hp: 90, hpPer: 0.25, armor: 5, atk: 5, gold: 20, score: 10, reach: 2, summon: 2, dim: 2, lineDmg: 4, lineHalf: 4, lines: 3, p2: 0.66, p3: 0.33 };
const CURSES = {
  jam: { icon: "⚙️", name: "ป้อมขัดข้อง", desc: "ป้อมปืนยิงอัตโนมัติเฉพาะเทิร์นคู่" },
  slow: { icon: "⌛", name: "ฟื้นช้า", desc: "ล้มแล้วฟื้นช้าลง 1 เทิร์น" },
  plate: { icon: "🪨", name: "มอนเกราะหนา", desc: "มอนที่เกิดใหม่เกราะ +1" },
  frail: { icon: "💔", name: "เลือดจาง", desc: "เลือดสูงสุด −1 ทุกคน" },
  dim: { icon: "🕯️", name: "ไฟริบหรี่", desc: "ไฟเมืองทนน้อยลง 2" },
  drain: { icon: "🫗", name: "ใจแตกสลาย", desc: "มาตรวัดทีมเติมครึ่งเดียว" },
};

const on = (ctx) => !!(ctx && ctx.match && ctx.match.eosDiff === "lament");
function L(s) { return s.lam || (s.lam = { downs: 0, curses: [], lord: null, warn: null, dead: false, lines: null, phase: 0, seq: 0 }); }
const curse = (s, id) => !!(s && s.lam && s.lam.curses.includes(id));
const heads = (ctx) => Object.values(ctx.match.players).filter((p) => !p.summon && !p.duoOf).length || 1;
const livesOf = (ctx) => LAMENT.lives + heads(ctx);
function rage(ctx) {
  if (!on(ctx)) return { atk: 0, mov: 0 };
  const n = Math.floor((ctx.match.roundNumber + 1) / LAMENT.rageEvery);
  return { atk: Math.min(LAMENT.rageAtk, n), mov: Math.min(LAMENT.rageMov, n) };
}

// ---------- ชีวิตทีม ----------
//  ผู้ใช้สั่ง 2026-11-14: ชีวิตหมดแล้วเล่นต่อ — แค่คนที่ล้มหลังจากนั้นฟื้นเองไม่ได้ (gone) · ล้ม = นับทันที (stage6.onKill)
//   ล้มแล้วทิ้งหมากศพ (stage6.keepsCorpse) · ฟื้นด้วยไอเทม "ขนนกคืนชีพ" = ไม่นับการล้มครั้งนั้น (คืนชีวิตทีม)
//   paid[pid] = การล้มครั้งนี้หักชีวิตทีมไปแล้ว · gone[pid] = ไม่มีชีวิตให้หัก → ไม่ฟื้นตามเวลา
// คืน true = ฟื้นตามเวลาได้
function onDown(ctx, s, p) {
  if (!on(ctx)) return true;
  const l = L(s), max = livesOf(ctx);
  l.paid ||= {}; l.gone ||= {};
  if (l.downs >= max) {
    if (p) l.gone[p.id] = true;
    ctx.fx("lament_life", { left: 0, max, gone: p ? p.id : null });
    ctx.log(`🕯️ ชีวิตทีมหมด — ${p ? p.name : "ผู้เล่น"} ฟื้นเองไม่ได้`);
    return false;
  }
  l.downs += 1;
  if (p) l.paid[p.id] = true;
  const left = max - l.downs;
  ctx.fx("lament_life", { left, max });
  ctx.log(left > 0 ? `🕯️ ชีวิตทีมเหลือ ${left}` : "🕯️ ชีวิตทีมหมด — ใครล้มต่อจากนี้ฟื้นเองไม่ได้");
  return true;
}
const gone = (s, pid) => !!(s && s.lam && s.lam.gone && s.lam.gone[pid]);
// ฟื้นตามเวลา: ชีวิตที่หักไปถูกใช้แล้ว
function onRespawn(s, pid) { if (s && s.lam) { if (s.lam.paid) delete s.lam.paid[pid]; if (s.lam.gone) delete s.lam.gone[pid]; } }
// ฟื้นด้วยไอเทม: ไม่นับการล้มครั้งนั้น → คืน true ถ้าคืนชีวิตทีม
function onSaved(ctx, s, p) {
  if (!s || !s.lam) return false;
  const l = s.lam, refund = !!(l.paid && l.paid[p.id]);
  if (refund) l.downs = Math.max(0, l.downs - 1);
  onRespawn(s, p.id);
  if (refund && on(ctx)) ctx.fx("lament_life", { left: livesOf(ctx) - l.downs, max: livesOf(ctx), saved: p.id });
  return refund;
}

// ---------- คำสาปคู่การ์ดทีม ----------
function onPerk(ctx, s) {
  if (!on(ctx)) return null;
  const l = L(s), pool = Object.keys(CURSES).filter((id) => !l.curses.includes(id));
  if (!pool.length) return null;
  const id = ctx.pick(pool, 1)[0];
  l.curses.push(id);
  ctx.fx("lament_curse", { curse: id });
  ctx.log(`🩸 คำสาป ${CURSES[id].icon} ${CURSES[id].name} — ${CURSES[id].desc}`);
  return id;
}

// ---------- ผู้คร่ำครวญ ----------
function lordUnit(ctx, H, s) { const l = L(s); return l.lord ? H.mobsOf(ctx).find((m) => m.id === l.lord && m.alive) || null : null; }
function warnLord(ctx, s, H) {
  const l = L(s);
  if (!on(ctx) || l.lord || l.warn || l.dead) return false;
  const map = ctx.map(), cx = Math.floor(map.cols / 2), cy = Math.floor(map.rows / 2);
  let at = null;
  for (let r = 0; r < 8 && !at; r++) {
    const c = H.freeNear(ctx, s, cx, cy, r + 2);
    if (c && !H.heroes(ctx).some((p) => H.manhattan(p.pos, c) < 3)) at = c;
  }
  at = at || H.freeNear(ctx, s, cx, cy, 10);
  if (!at) return false;
  l.warn = { x: at.x, y: at.y, at: ctx.match.roundNumber + 2 };
  ctx.bump();
  ctx.fx("lament_warn", { x: at.x, y: at.y });
  ctx.log("💀 เสียงคร่ำครวญดังก้องทั่ว Eos — ผู้คร่ำครวญกำลังมา");
  return true;
}
function onScore(ctx, s, H) {
  if (on(ctx) && (s.score || 0) >= LORD.at) warnLord(ctx, s, H);
}
function landLord(ctx, s, H, turn) {
  const l = L(s), w = l.warn;
  if (!w || turn < w.at) return 0;
  l.warn = null;
  const at = H.tileFree(ctx, s, w.x, w.y) ? w : H.freeNear(ctx, s, w.x, w.y, 4);
  if (!at) return 0;
  const hp = Math.round(LORD.hp * (1 + LORD.hpPer * (heads(ctx) - 1)));
  const m = H.spawnMob(ctx, s, "lament", at, { hp, armor: LORD.armor, atk: LORD.atk, mov: 0, gold: LORD.gold }, { trait: "lament", tier: 1 });
  m.name = "ผู้คร่ำครวญ";
  l.lord = m.id; l.phase = 1;
  ctx.bump();
  ctx.fx("lament_land", { id: m.id, x: at.x, y: at.y });
  ctx.log("💀 ผู้คร่ำครวญปรากฏ! ล้มมันให้ได้ — ไม่งั้นไม่มีวันชนะ");
  return 2.6;
}
const phaseOf = (m) => { const k = m.hp / Math.max(1, m.summon.maxHp || m.hp); return k > LORD.p2 ? 1 : k > LORD.p3 ? 2 : 3; };
function act(ctx, s, H, m, all, round, out) {
  const l = L(s), sm = m.summon, rg = rage(ctx);
  // น้ำตาสวรรค์ที่เตือนไว้ (แนว 9 ช่อง) ตกลงมา
  if (l.lines && round >= l.lines.at) {
    const hits = [];
    for (const u of H.unitsOn(ctx, l.lines.tiles)) { if (H.isMob(u)) continue; const dealt = ctx.combat.withEffectSource(m, () => ctx.damage(u, LORD.lineDmg)); hits.push({ id: u.id, dmg: dealt }); }
    ctx.fx("lament_tears", { id: m.id, tiles: l.lines.tiles, hits });
    ctx.log(`💧 น้ำตาสวรรค์ตกลงมา${hits.length ? ` โดน ${hits.length} คน` : ""}`);
    l.lines = null; out.big = true;
  }
  const ph = phaseOf(m);
  if (ph !== l.phase) {
    l.phase = ph;
    ctx.fx("lament_phase", { id: m.id, x: m.pos.x, y: m.pos.y, phase: ph });
    ctx.log(ph === 2 ? "💀 ผู้คร่ำครวญร้องเพลงไว้อาลัย — แสงไฟทั่ว Eos ริบหรี่" : "💀 ผู้คร่ำครวญหลั่งน้ำตาสวรรค์ — ระวังแนวแสงบนพื้น");
  }
  const targets = all.filter((p) => p.alive && p.pos);
  // เคลื่อนวูบไปข้างคนที่อ่อนแอที่สุด (ไม่เดิน — ลอยข้ามทุกสิ่ง)
  const prey = targets.slice().sort((a, b) => ((a.hp || 0) + (a.armor || 0)) - ((b.hp || 0) + (b.armor || 0)))[0];
  if (prey && H.manhattan(prey.pos, m.pos) > 1) {
    let to = null;
    for (const [dx, dy] of ctx.Board.DIRS) { const x = prey.pos.x + dx, y = prey.pos.y + dy; if (ctx.Board.inBounds(ctx.map(), x, y) && H.tileFree(ctx, s, x, y, m.id)) { to = { x, y }; break; } }
    to = to || H.freeNear(ctx, s, prey.pos.x, prey.pos.y, 3, m.id);
    if (to) {
      out.moves.push({ id: m.id, type: "lament", from: { ...m.pos }, to: { ...to }, path: [{ ...m.pos }, { ...to }], blink: true });
      ctx.fx("lament_blink", { id: m.id, from: { ...m.pos }, to: { ...to } });
      m.pos = { ...to }; ctx.bump();
    }
  }
  // เคียวโศก: ทุกคนในระยะ 2
  const near = targets.filter((p) => H.footOf(ctx, p).some((t) => H.manhattan(t, m.pos) <= LORD.reach));
  for (const v of near) {
    if (!v.alive) continue;
    const dealt = ctx.combat.withEffectSource(m, () => ctx.damage(v, Math.max(1, (sm.atk | 0) + rg.atk)));
    out.attacks.push({ id: m.id, type: "lament", x: m.pos.x, y: m.pos.y, target: v.id, dmg: dealt });
  }
  if (near.length) ctx.log(`💀 ผู้คร่ำครวญกวาดเคียว ${near.map((v) => v.name).join(", ")}`);
  // เฟส 2+: เรียกปีศาจ · ไฟเมืองทุกเมืองหรี่ลง
  if (ph >= 2) {
    const st = require("./eosEvents").scaleStats(ctx, H.daemonStats(Math.max(1, s.nightNo || 1))), spawned = [];
    for (let i = 0; i < LORD.summon && H.mobRoom(ctx) > 0; i++) { const at = H.freeNear(ctx, s, m.pos.x, m.pos.y, 3); if (at) { const d = H.spawnMob(ctx, s, "daemon", at, st, { look: 1 + (++l.seq % 8), tier: s.nightNo || 1 }); spawned.push({ id: d.id, x: at.x, y: at.y }); } }
    if (spawned.length) ctx.fx("boss_roar", { id: m.id, x: m.pos.x, y: m.pos.y, spawned });
    H.dimLights(ctx, s, LORD.dim);
  }
  // เตือนน้ำตาสวรรค์: เฟส 2 ทุก 2 เทิร์น · เฟส 3 ทุกเทิร์น — แนว 9 ช่องผ่านตัวผู้เล่น (สุ่มแนวตั้ง/นอน)
  if (!l.lines && ph >= 2 && (ph === 3 || round % 2 === 0) && targets.length) {
    const tiles = [], seen = new Set(), map = ctx.map();
    for (const p of ctx.pick(targets, Math.min(LORD.lines, targets.length))) {
      const hz = ctx.rng() < 0.5;
      for (let k = -LORD.lineHalf; k <= LORD.lineHalf; k++) {
        const x = p.pos.x + (hz ? k : 0), y = p.pos.y + (hz ? 0 : k), key = `${x},${y}`;
        if (!ctx.Board.inBounds(map, x, y) || seen.has(key)) continue;
        seen.add(key); tiles.push({ x, y });
      }
    }
    l.lines = { at: round + 1, tiles };
    ctx.fx("lament_lines", { id: m.id, tiles });
    ctx.log("⚠️ แนวแสงน้ำตาบนพื้น — ออกจากแนวก่อนเทิร์นหน้า!");
  }
}
function onDeath(ctx, s, H, m, by) {
  const l = L(s);
  l.dead = true; l.lord = null; l.lines = null;
  H.addScore(ctx, s, LORD.score, "lament");
  const got = [];
  for (const p of Object.values(ctx.match.players)) {
    if (p.summon || p.duoOf) continue;
    const it = H.loot(ctx, s, p, { pct: 100, items: ["lifeCrystal", "armorCrystal"] });
    if (it.length) got.push({ id: p.id, name: it[0].name });
  }
  if (by) require("../shop").addGold(by, LORD.gold);
  ctx.fx("lament_die", { id: m.id, x: m.pos ? m.pos.x : 0, y: m.pos ? m.pos.y : 0, by: by ? by.id : null, loot: got });
  ctx.log(`💀 ผู้คร่ำครวญสลายไป — แต้มรวม +${LORD.score}`);
}
// Lament: ชนะได้ก็ต่อเมื่อล้มผู้คร่ำครวญแล้ว (แต้มครบแต่ยังไม่มา = เรียกมาเลย)
function blocksWin(ctx, s, H) {
  if (!on(ctx)) return false;
  const l = L(s);
  if (l.dead) return false;
  warnLord(ctx, s, H);
  return true;
}
function preRound(ctx, s, H, turn) {
  // dev: ECHO_DEV_EOS_LAMENT=1 → ความยาก Lament + ผู้คร่ำครวญลงข้างผู้เล่นคนแรก (ตรวจภาพในเบราว์เซอร์)
  if (process.env.ECHO_DEV_EOS_LAMENT && !L(s).devDone) {
    const p = H.heroes(ctx)[0];
    if (p) { L(s).devDone = true; ctx.match.eosDiff = "lament"; s.lamentOn = true; s.score = Math.max(s.score || 0, LORD.at); L(s).warn = { ...(H.freeNear(ctx, s, p.pos.x + 2, p.pos.y + 1, 4) || p.pos), at: turn }; }
  }
  return on(ctx) ? landLord(ctx, s, H, turn) : 0;
}
function publicOf(ctx, s) {
  if (!on(ctx)) return { lament: null };
  const l = L(s);
  return {
    lament: {
      lives: livesOf(ctx), downs: l.downs, gone: Object.keys(l.gone || {}), curses: l.curses.map((id) => ({ id, ...CURSES[id] })), rage: rage(ctx),
      lord: l.lord, phase: l.phase, dead: l.dead, at: LORD.at,
      warn: l.warn ? { x: l.warn.x, y: l.warn.y } : null, lines: l.lines ? l.lines.tiles.map((t) => ({ ...t })) : null,
    },
  };
}

module.exports = {
  LAMENT, LORD, CURSES, on, L, curse, livesOf, rage, onDown, gone, onRespawn, onSaved, onPerk,
  warnLord, onScore, landLord, act, onDeath, blocksWin, preRound, publicOf, lordUnit, phaseOf,
};
