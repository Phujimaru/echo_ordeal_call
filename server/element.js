// ============================================================
//  ระบบธาตุ + ปฏิกิริยาธาตุ — ระบบกลาง (GRID_PLAN §8.7 · ผู้ใช้ตัดสิน 2026-11-14)
//
//  ธาตุ: fire 🔥 · ice ❄️ · bolt ⚡ · water 💧 · wind 🌪️ (ไม่มีธาตุ = ปกติ)
//  ธาตุผูกกับ "การกระทำ" ไม่ใช่ตัวละคร — ตัวเดียวมีได้หลายธาตุตามสกิล/ร่าง/อาวุธ
//
//  คราบธาตุ (aura) = สถานะ elFire / elIce / elBolt / elWater (ทีละ 1 ธาตุ · 2 = ค้างถึงจบเทิร์นถัดไป — ลูป endTurn ลดเอง)
//   ลมไม่ติดคราบ · ธาตุเดิมซ้ำ = ต่อเวลา · ธาตุต่าง = ปฏิกิริยา (คราบหาย · ผลลงพร้อมการตีครั้งนั้น)
//
//  การกระทำที่มีธาตุ:
//   - ท่อดาเมจ (combat.dealMixed / dealDirect / dealArmorOnly) เรียก afterHit(p) หลังดาเมจลง (> 0 หลังฮุคเป้า) —
//     ธาตุ = current(): withElement(el, fn) ที่ครอบอยู่ → ไม่มี = ฮุค defaultElement(engine, ต้นตอ) (Ice Spike: ทุกการกระทำ ❄️)
//   - ตีปกติ/ตีสวน: attack.strikeBody ครอบด้วยฮุค attackElement(engine, ผู้ตี, { counter, target })
//   - สกิล: skills.useSkill ครอบ applyInstantSkill + ผลหลังคลิปด้วยฮุค skillElement(engine, p, tier, opts)
//     (engine.deferAfterCutscene / skillBeat จดธาตุตอนคิวแล้วคืนตอนรัน)
//   - ของที่ไม่มีดาเมจ (ระเบิดธาตุ · พื้นธาตุ) เรียก apply(t, el, source) ตรง
//  ไม่ติดคราบ: ตัวเอง/เพื่อนร่วมทีมของต้นตอ · ยูนิต noStatus · ตาย/ไม่มีช่อง
//
//  ปฏิกิริยา (ดาเมจของปฏิกิริยาไม่มีธาตุ — ไม่ต่อลูกโซ่ · ต้นตอเดิม = ไม่โดนเพื่อน):
//   ปะทุ 🔥❄️ +3 + ศัตรูรอบตัว 8 ช่องโดน 1 · ระเบิด 🔥⚡ เป้า +2 + รอบตัว 2 + ผลักออก 1
//   ระเหย 🔥💧 +3 · กัดเซาะ ❄️⚡ +1 + เกราะแตกหมด · เยือกแข็ง ❄️💧 น้ำแข็งกัด 2 + เดินไม่ได้ 1
//   นำไฟฟ้า ⚡💧 +2 ทะลุเกราะ · พัดพา 🌪️+คราบ = คราบบนเป้าไปติดศัตรูรอบตัว 8 ช่อง (ติดอย่างเดียว · ต่อปฏิกิริยาได้ 1 ทอด)
//  หลายธาตุมาถึงคนเดียวพร้อมกัน (ลม): ลงทีละอันตามลำดับ 🔥 → ❄️ → ⚡ → 💧 (แบบ ก — ผู้ใช้ตอบ)
// ============================================================
// export ฟังก์ชันก่อน require (hoist) · ค่าคงที่ export ท้ายไฟล์
Object.assign(module.exports, {
  current, withElement, capture, auraOf, terrainAura, terrainAt, clearAura, afterHit, apply, react, windBurst, tickFrost, pub,
  attackElementOf, skillElementOf, lastReaction, takeReaction,
});

const CHAR_HOOKS = require("../characters/index");
const match = require("./match");
const Board = require("./board");

const ELEMENTS = {
  fire: { icon: "🔥", name: "ไฟ" },
  ice: { icon: "❄️", name: "น้ำแข็ง" },
  bolt: { icon: "⚡", name: "สายฟ้า" },
  water: { icon: "💧", name: "น้ำ" },
  wind: { icon: "🌪️", name: "ลม" },
};
const AURA_KEYS = { fire: "elFire", ice: "elIce", bolt: "elBolt", water: "elWater" };
const ORDER = ["fire", "ice", "bolt", "water"];
const AURA_TURNS = 2; // ลูป endTurn ลดทุกจบเทิร์น = ค้างเทิร์นนี้ + เทิร์นถัดไป
const FROST_TURNS = 2; // เยือกแข็ง: น้ำแข็งกัด 2 เทิร์น
const ROOT_TURNS = 1; // เยือกแข็ง: เดินไม่ได้ 1 เทิร์น

const pairKey = (a, b) => [a, b].sort().join("+");
const REACTIONS = {
  [pairKey("fire", "ice")]: { key: "burst", name: "ปะทุ", bonus: 3, ring: 1 },
  [pairKey("fire", "bolt")]: { key: "blast", name: "ระเบิด", bonus: 2, ring: 2, push: 1 },
  [pairKey("fire", "water")]: { key: "vapor", name: "ระเหย", bonus: 3 },
  [pairKey("ice", "bolt")]: { key: "erode", name: "กัดเซาะ", bonus: 1, shatter: true },
  [pairKey("ice", "water")]: { key: "freeze", name: "เยือกแข็ง", frost: true },
  [pairKey("bolt", "water")]: { key: "conduct", name: "นำไฟฟ้า", bonus: 2, pierce: true },
  wind: { key: "swirl", name: "พัดพา" },
};

const combat = () => require("./combat");
const action = () => require("./phases/action");
const engine = () => require("./engine").engine;

// ---------- ธาตุของการกระทำที่กำลังลงผล ----------
//  match.elemCtx: undefined = ไม่มีใครตั้ง (ใช้ defaultElement ของต้นตอ) · null = ตั้งว่าไม่มีธาตุ (ดาเมจของปฏิกิริยา)
function current() {
  if (match.elemCtx !== undefined) return match.elemCtx;
  const src = match.effectSourceId && match.players[match.effectSourceId];
  return src ? hookEl(src, "defaultElement") : null;
}
function withElement(el, fn) {
  const prev = match.elemCtx;
  match.elemCtx = ELEMENTS[el] ? el : null;
  try { return fn(); }
  finally { match.elemCtx = prev; }
}
// จดธาตุตอนคิวผล (หลังคลิป / จังหวะพัก) แล้วคืนตอนรัน — ไม่ได้ตั้งไว้ = fn เดิม
function capture(fn) {
  if (match.elemCtx === undefined || typeof fn !== "function") return fn;
  const el = match.elemCtx;
  return (...args) => withElement(el, () => fn(...args));
}
function hookEl(p, name, ...args) {
  const hook = p && CHAR_HOOKS[p.characterId];
  if (!hook || typeof hook[name] !== "function") return null;
  let el = null;
  try { el = hook[name](engine(), p, ...args); } catch (err) { console.error(`[hook] ${hook.id}.${name} โยน error:`, err); }
  return ELEMENTS[el] ? el : null;
}
function attackElementOf(p, opts = {}) { return hookEl(p, "attackElement", opts) || hookEl(p, "defaultElement"); }
function skillElementOf(p, tier, opts = {}) { return hookEl(p, "skillElement", tier, opts) || hookEl(p, "defaultElement"); }

// ---------- คราบ ----------
function auraOf(p) {
  const st = p && p.statuses;
  if (!st) return null;
  for (const el of ORDER) if ((st[AURA_KEYS[el]] || 0) > 0) return el;
  return null;
}
function clearAura(p) {
  if (!p || !p.statuses) return;
  for (const k of Object.values(AURA_KEYS)) { delete p.statuses[k]; if (p.statusAmt) delete p.statusAmt[k]; }
}
function setAura(p, el) {
  clearAura(p);
  p.statuses[AURA_KEYS[el]] = AURA_TURNS;
}
function canTake(t, source) {
  if (!t || !t.alive || !t.pos || !t.statuses) return false;
  if (t.summon && t.summon.noStatus) return false;
  if (source && (source.id === t.id || combat().sameTeam(source, t))) return false;
  return true;
}

// ---------- ป้ายปฏิกิริยาล่าสุดของการตี (ฉากตีปกติอ่านไปทำป้าย) ----------
function lastReaction() { return match.elemLast || null; }
function takeReaction() { const r = match.elemLast || null; match.elemLast = null; return r; }

// ท่อดาเมจเรียกหลังดาเมจลง
function afterHit(p) {
  const el = current();
  if (!el) return null;
  const source = match.effectSourceId && match.players[match.effectSourceId];
  return apply(p, el, source || null);
}

// ธาตุ el ลงที่ t (ต้นตอ source) → ปฏิกิริยาที่เกิด | null
//  opts.noSwirl = คราบที่มาจากการพัด (ไม่พัดต่อ)
function apply(t, el, source, opts = {}) {
  if (!ELEMENTS[el] || !canTake(t, source)) return null;
  if (el === "wind") {
    const have = auraOf(t);
    if (!have || opts.noSwirl) return null;
    return windBurst([t], source);
  }
  const have = auraOf(t);
  if (!have || have === el) {
    setAura(t, el);
    fx("elemAura", { id: t.id, el });
    return null;
  }
  clearAura(t);
  return react(t, have, el, source);
}

// ---------- ปฏิกิริยา ----------
function react(t, a, b, source) {
  const r = REACTIONS[pairKey(a, b)];
  if (!r) return null;
  const C = combat();
  const at = t.pos ? { ...t.pos } : null;
  const ring = r.ring || r.push ? ringOf(t, source) : [];
  const lines = [];
  withElement(null, () => {
    if (r.bonus) {
      const before = hpArm(t);
      if (r.pierce) C.dealDirect(t, r.bonus);
      else C.dealMixed(t, r.bonus);
      lines.push(`${t.name} -${Math.max(0, before - hpArm(t))}${r.pierce ? " (ทะลุเกราะ)" : ""}`);
    }
    if (r.shatter && t.alive && t.armor > 0) {
      const n = t.armor;
      while (t.armor > 0) C.loseArmor(t);
      lines.push(`เกราะ ${t.name} แตก -${n}`);
    }
    if (r.frost && t.alive) {
      const e = engine();
      if (C.applyDebuff(t, "frostbite", 1, FROST_TURNS)) lines.push(`${t.name} น้ำแข็งกัด ${FROST_TURNS} เทิร์น`);
      if (C.applyDebuff(t, "rooted", 1, ROOT_TURNS + (e.hasActed(t.id) || e.actorId === t.id ? 1 : 0))) lines.push(`เดินไม่ได้ ${ROOT_TURNS} เทิร์น`);
    }
    for (const u of ring) {
      if (!u.alive) continue;
      const before = hpArm(u);
      C.dealMixed(u, r.ring);
      lines.push(`${u.name} -${Math.max(0, before - hpArm(u))}`);
    }
    if (r.push && at) pushRing(at, t, ring, r.push);
    for (const u of [t, ...ring]) killCheck(u, t);
  });
  match.lastLog.push(`${ELEMENTS[a].icon}${ELEMENTS[b].icon} ${r.name}! ${lines.join(" · ")}`.trim());
  const out = { key: r.key, name: r.name, a, b, id: t.id };
  match.elemLast = out;
  fx("elemReact", { key: r.key, name: r.name, a, b, id: t.id, at, ring: ring.map((u) => u.id), size: action().sizeOf(t) });
  sfx(r.key);
  return out;
}
const hpArm = (u) => (u.hp || 0) + (u.armor || 0) + (u.shield || 0);
function killCheck(u, main) {
  if (!u || !u.alive || u.hp > 0) return;
  combat().instantDeath(u);
  if (!u.alive) {
    match.lastLog.push(`💀 ${u.name} เลือดจริงหมด ตกรอบ!`);
    if (u !== main) u.pos = null; // เป้าหลัก: ผู้เรียก (strike/skillStrike) เก็บช่องเอง
  }
}

// ศัตรูของต้นตอที่ยืนรอบตัว t (8 ทิศรอบกล่องของ t · ตัวใหญ่นับทั้งกล่อง) — ไม่มีต้นตอ = ทุกคนยกเว้น t
function ringOf(t, source) {
  if (!t || !t.pos) return [];
  const tb = { x: t.pos.x, y: t.pos.y, size: action().sizeOf(t) };
  return Object.values(match.players).filter((u) => u !== t && u.alive && u.pos && canTake(u, source) &&
    cheb(tb, { x: u.pos.x, y: u.pos.y, size: action().sizeOf(u) }) <= 1);
}
// ช่องว่างระหว่างสองกล่องแบบเชบีเชฟ (0 = ทับ/ติดกัน)
function cheb(a, b) {
  const W = Board.wrapCols ? Board.wrapCols() : 0;
  let dx;
  if (W) {
    const f = ((b.x - a.x) % W + W) % W, r = ((a.x - b.x) % W + W) % W;
    dx = Math.min(Math.max(0, f - (a.size - 1)), Math.max(0, r - (b.size - 1)));
  } else dx = Math.max(0, a.x - (b.x + b.size - 1), b.x - (a.x + a.size - 1));
  const dy = Math.max(0, a.y - (b.y + b.size - 1), b.y - (a.y + a.size - 1));
  return Math.max(dx, dy);
}
// ผลักคนรอบวงออกจากจุดระเบิด n ช่อง (ทิศออกจากกลางตัวเป้า)
function pushRing(at, t, ring, n) {
  const Ice = require("./ice");
  const ctx = Ice.begin();
  const s = action().sizeOf(t);
  const cx = at.x + (s - 1) / 2, cy = at.y + (s - 1) / 2;
  for (const u of ring) {
    if (!u.alive || !u.pos) continue;
    const us = action().sizeOf(u);
    const W = Board.wrapCols ? Board.wrapCols() : 0;
    let dx = u.pos.x + (us - 1) / 2 - cx;
    if (W) { dx = ((dx % W) + W) % W; if (dx > W / 2) dx -= W; }
    const dy = u.pos.y + (us - 1) / 2 - cy;
    const dir = { x: Math.sign(Math.round(dx * 2)), y: Math.sign(Math.round(dy * 2)) };
    if (!dir.x && !dir.y) continue;
    Ice.pushUnit(u, dir, ctx, n);
  }
  Ice.flush(ctx);
}

// ---------- พัดพา ----------
//  sources = คนที่โดนลมพร้อมกัน (ลมตีคนเดียว = [t] · ระเบิดลม = ศัตรูในวง)
//  ถ่ายภาพคราบก่อน → ศัตรูรอบตัวแต่ละคนได้ธาตุที่มาถึงทีละอันตามลำดับ ORDER (คราบใหม่ไม่ถูกพัดต่อ)
//   ผู้รับที่เป็นต้นลมด้วย: คราบเดิมยังอยู่ให้ธาตุที่มาถึงทำปฏิกิริยา (ตัวอย่างที่ผู้ใช้เลือก: ข 💧 โดน 🔥 = ระเหย แล้ว ❄️ ติดคราบ)
//   ต้นลมที่ไม่มีอะไรมาถึง = คราบหาย (ถูกพัดออกไปแล้ว)
function windBurst(sources, source) {
  const snap = [];
  for (const s of sources) {
    const el = auraOf(s);
    if (!el || !canTake(s, source)) continue;
    snap.push({ from: s, el });
  }
  if (!snap.length) return null;
  const incoming = new Map(); // ผู้รับ → Set ธาตุ
  for (const { from, el } of snap) {
    for (const u of ringOf(from, source)) {
      if (!incoming.has(u)) incoming.set(u, new Set());
      incoming.get(u).add(el);
    }
  }
  const got = [];
  for (const [u, els] of incoming) {
    for (const el of ORDER) {
      if (!els.has(el) || !u.alive) continue;
      apply(u, el, source, { noSwirl: true });
      got.push(u);
    }
  }
  for (const { from } of snap) if (!incoming.has(from)) clearAura(from);
  const main = sources[0];
  match.lastLog.push(`🌪️ พัดพา! ${snap.map((s) => `${ELEMENTS[s.el].icon} ${s.from.name}`).join(" · ")}${got.length ? ` → ${[...new Set(got)].map((u) => u.name).join(", ")}` : ""}`);
  const out = { key: "swirl", name: REACTIONS.wind.name, a: "wind", b: snap[0].el, id: main.id };
  match.elemLast = out;
  fx("elemReact", { key: "swirl", name: out.name, a: "wind", b: snap[0].el, id: main.id, at: main.pos ? { ...main.pos } : null,
    from: snap.map((s) => ({ id: s.from.id, el: s.el })), ring: [...incoming.keys()].map((u) => u.id), size: action().sizeOf(main) });
  sfx("swirl");
  return out;
}

// ---------- พื้นธาตุ: จบตาบนช่องธาตุ = ติดคราบ (ผู้ใช้ตอบ "ใช่" 2026-11-14) ----------
//  🔥 ลาวา · พื้นไฟ (นกหวีด/Eos) · กองไฟดิเอโก้ ❄️ น้ำแข็งลื่น · ธารน้ำแข็ง 💧 น้ำตื้น · น้ำวน · พื้นเปียก
//  พื้นที่มีเจ้าของ: เจ้าของ/ทีมเดียวกันไม่ติด · ต้นตอ = เจ้าของ (ปฏิกิริยาไม่โดนทีมเจ้าของ) · ตัวใหญ่ = ช่องแรกที่เจอตามลำดับ ไฟ → น้ำแข็ง → น้ำ
function terrainAt(x, y) {
  const Ice = require("./ice");
  const map = action().boardMap();
  const sp = Board.specialAt(map, x, y);
  const k = Board.key(x, y);
  const owned = (o) => (o && typeof o === "object" ? o.owner : typeof o === "string" ? o : null) || null;
  const out = [];
  const flame = Ice.flameAt(x, y);
  const pyre = match.board && match.board.diego && match.board.diego.fire && match.board.diego.fire[k];
  if (sp === "lava" || sp === "flame" || flame || pyre) out.push({ el: "fire", owner: owned(pyre) || owned(flame) });
  const ice = Ice.iceAt(x, y);
  if (sp === "ice" || ice) out.push({ el: "ice", owner: owned(ice) });
  if (sp === "shallow" || sp === "whirl" || sp === "wet" || Ice.wetAt(x, y)) out.push({ el: "water", owner: null });
  return out;
}
function terrainAura(p) {
  if (!p || !p.alive || !p.pos) return null;
  const tiles = Board.footprint(p.pos.x, p.pos.y, action().sizeOf(p));
  const found = tiles.flatMap((t) => terrainAt(t.x, t.y));
  for (const el of ["fire", "ice", "water"]) {
    const hit = found.filter((f) => f.el === el);
    if (!hit.length) continue;
    const foe = hit.find((f) => !f.owner) || hit.find((f) => { const o = match.players[f.owner]; return !o || (o.id !== p.id && !combat().sameTeam(o, p)); });
    if (!foe) continue;
    const src = foe.owner && match.players[foe.owner];
    const run = () => apply(p, el, src || null);
    return src ? combat().withEffectSource(src, run) : run();
  }
  return null;
}

// ---------- น้ำแข็งกัด (สถานะ frostbite): ต้นเทิร์นเสีย 1 (เกราะก่อน) แล้วลดทีละ 1 — เรียกคู่กับ tickBurn ใน dealRound ----------
function tickFrost(e, p) {
  if (!p || !p.alive || !(((p.statuses && p.statuses.frostbite) || 0) > 0)) return;
  p._statusDamage = true;
  e.dealMixed(p, 1);
  p._statusDamage = false;
  e.log(`🥶 ${p.name} น้ำแข็งกัด — เสียหาย -1 (ลดเกราะก่อน) (เหลืออีก ${p.statuses.frostbite - 1} เทิร์น)`);
  if (p.alive && p.hp <= 0) {
    e.instantDeath(p);
    if (!p.alive) e.log(`💀 ${p.name} เลือดจริงหมด ตกรอบ!`);
  }
  p.statuses.frostbite = Math.max(0, p.statuses.frostbite - 1);
  if (p.statuses.frostbite <= 0) { delete p.statuses.frostbite; if (p.statusAmt) delete p.statusAmt.frostbite; }
}

// ---------- ส่งให้ client ----------
function pub(p) { return auraOf(p); }
function fx(event, payload) {
  try { engine().boardFx(event, payload); } catch (_) { /* เทสต์ไม่มีห้อง */ }
}
function sfx(key) {
  try { engine().sfx(`elem_${key}`); } catch (_) { /* เทสต์ */ }
}

Object.assign(module.exports, { ELEMENTS, AURA_KEYS, REACTIONS, ORDER, AURA_TURNS, FROST_TURNS, ROOT_TURNS });
