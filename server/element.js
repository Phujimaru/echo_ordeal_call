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
  current, withElement, withChainBlock, capture, auraOf, terrainAura, terrainAt, clearAura, afterHit, apply, react, windBurst, tickFrost, pub,
  attackElementOf, skillElementOf, lastReaction, takeReaction,
  tickFields, resetFields, fieldsPub, typeOf, typeBlocks, typeAdjust, withReaction,
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
  // ธาตุใหม่ของ Master (GRID_PLAN §7.34 · ผู้ใช้ 2026-11-15) — คู่กับธาตุเดิมที่ไม่ได้กำหนด = ไม่เกิดปฏิกิริยา (คราบใหม่แทนที่)
  poison: { icon: "☠️", name: "พิษ" },
  light: { icon: "✨", name: "แสง" },
  dark: { icon: "🌑", name: "มืด" },
};
const AURA_KEYS = { fire: "elFire", ice: "elIce", bolt: "elBolt", water: "elWater", poison: "elPoison", light: "elLight", dark: "elDark" };
const ORDER = ["fire", "ice", "bolt", "water", "poison", "light", "dark"];
const CLASSIC = new Set(["fire", "ice", "bolt", "water"]); // พัดพาเดิม (ลม) ใช้กับ 4 ธาตุนี้เท่านั้น
const REACT_LOCK = 5; // หลุมดำ / แสงจ้า: โดนแล้วโดนปฏิกิริยาเดิมไม่ได้อีก 5 เทิร์น
const FOG_TURNS = 3, HOLE_TURNS = 3, STIR_TURNS = 3, GLARE_TURNS = 3;
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
  // ---- Master (GRID_PLAN §7.34 · ชื่อผู้ใช้อนุมัติ) ----
  [pairKey("poison", "fire")]: { key: "fog", name: "หมอกพิษ", special: true },
  [pairKey("poison", "bolt")]: { key: "stir", name: "กระตุ้น", special: true },
  poisonWind: { key: "spread", name: "กระจายพิษ", special: true },
  [pairKey("light", "dark")]: { key: "hole", name: "หลุมดำ", special: true, lock: true },
  [pairKey("light", "light")]: { key: "glare", name: "แสงจ้า", special: true, lock: true },
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
    if (have === "poison") { clearAura(t); return react(t, "poison", "wind", source); } // กระจายพิษ
    if (!CLASSIC.has(have)) return null; // ลม + แสง/มืด = ไม่เกิดปฏิกิริยา
    return windBurst([t], source);
  }
  const have = auraOf(t);
  const r = have ? REACTIONS[pairKey(have, el)] : null;
  if (!have || !r || (have === el && el !== "light") || locked(t, r)) {
    setAura(t, el);
    fx("elemAura", { id: t.id, el });
    return null;
  }
  clearAura(t);
  return react(t, have, el, source);
}

// ---------- ปฏิกิริยา ----------
// คนที่โดนการกระทำเดียวกันอยู่แล้ว (พัดพา/ระเบิดธาตุหลายคน) — ลูกโซ่ไม่ลามเข้าไปซ้ำ (คนละครั้งต่อการกระทำ)
let chainBlock = new Set();
function withChainBlock(ids, fn) {
  const prev = chainBlock;
  chainBlock = new Set([...prev, ...ids]);
  try { return fn(); } finally { chainBlock = prev; }
}
//  chain = { from, step } = ปฏิกิริยาที่ลามมา (ลูกโซ่ — ผู้ใช้สั่ง 2026-11-14)
function react(t, a, b, source, chain = null) {
  const r = b === "wind" && a === "poison" ? REACTIONS.poisonWind : REACTIONS[pairKey(a, b)];
  if (!r) return null;
  if (r.special) return reactSpecial(t, a, b, r, source);
  const C = combat();
  const at = t.pos ? { ...t.pos } : null;
  const ring = r.ring || r.push ? ringOf(t, source) : [];
  const lines = [];
  withReaction(a, b, () => withElement(null, () => {
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
  }));
  match.lastLog.push(`${chain ? "⛓️ " : ""}${ELEMENTS[a].icon}${ELEMENTS[b].icon} ${r.name}${chain ? " (ลูกโซ่)" : "!"} ${lines.join(" · ")}`.trim());
  const out = { key: r.key, name: r.name, a, b, id: t.id };
  if (!chain) match.elemLast = out;
  fx("elemReact", { key: r.key, name: r.name, a, b, id: t.id, at, ring: ring.map((u) => u.id), size: action().sizeOf(t), ...(chain ? { chainFrom: chain.from, step: chain.step } : {}) });
  if (!chain) sfx(r.key);
  // ลูกโซ่ (ผู้ใช้สั่ง 2026-11-14): ปฏิกิริยาเป้าเดียว (ระเหย/กัดเซาะ/เยือกแข็ง/นำไฟฟ้า) ลามไปศัตรูที่ยืนติดกันซึ่งมีคราบธาตุเดียวกับคราบที่ถูกใช้ (a)
  //  ลามต่อเป็นทอดๆ จนไม่มีคนติดคราบยืนติด · คนละครั้งต่อการตี · ผลเท่าปฏิกิริยาเดิม (ไม่รวมดาเมจของการตี)
  if (!chain && !r.ring && !r.push) {
    const seen = new Set([t.id, ...chainBlock]), hit = [];
    let frontier = [t], step = 0;
    while (frontier.length) {
      step++;
      const next = [];
      for (const f of frontier) {
        for (const u of ringOf(f, source)) {
          if (seen.has(u.id) || auraOf(u) !== a) continue;
          seen.add(u.id);
          clearAura(u);
          react(u, a, b, source, { from: f.id, step });
          hit.push(u);
          next.push(u);
        }
      }
      frontier = next;
    }
    for (const u of hit) if (!u.alive) u.pos = null;
    if (hit.length) out.chain = hit.length;
  }
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
    if (!el || !CLASSIC.has(el) || !canTake(s, source)) continue;
    snap.push({ from: s, el });
  }
  if (!snap.length) return null;
  const incoming = new Map(); // ผู้รับ → Set ธาตุ
  for (const { from, el } of snap) {
    if (!CLASSIC.has(el)) continue;
    for (const u of ringOf(from, source)) {
      if (!incoming.has(u)) incoming.set(u, new Set());
      incoming.get(u).add(el);
    }
  }
  const got = [];
  withChainBlock([...incoming.keys(), ...snap.map((x) => x.from)].map((u) => u.id), () => {
    for (const [u, els] of incoming) {
      for (const el of ORDER) {
        if (!els.has(el) || !u.alive) continue;
        apply(u, el, source, { noSwirl: true });
        got.push(u);
      }
    }
  });
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

// ============================================================
//  ปฏิกิริยาของธาตุใหม่ (Master — GRID_PLAN §7.34 · ชื่อ/ตัวเลขผู้ใช้ 2026-11-15)
//   หมอกพิษ ☠️🔥 หมอก 3×3 ที่เป้า 3 เทิร์น — คนในหมอกตาบอด + เสีย 1 ทุกต้นเทิร์น
//   กระตุ้น ☠️⚡ 3 เทิร์น ดาเมจต่อเทิร์นทุกแบบ ×2 (สถานะ stirred)
//   กระจายพิษ ☠️🌪️ พิษร้ายของเป้า (เทิร์นเท่าเดิม) ไปติดศัตรูในกรอบ 5×5 รอบเป้า
//   หลุมดำ ✨🌑 ที่เป้า 3 เทิร์น — ทุกต้นเทิร์นดูดคนในกรอบ 5×5 เข้ากลาง 1 ช่อง (ถูกดูด −1 · คนกลาง −2) · ครบแล้วระเบิด 3 ใน 3×3
//   แสงจ้า ✨✨ ตาบอด + ลบสกิลติดตัว 3 เทิร์น
//   หลุมดำ/แสงจ้า: เป้าที่โดนแล้วโดนปฏิกิริยาเดิมไม่ได้อีก 5 เทิร์น (ผู้ใช้: กันเฉพาะปฏิกิริยาเดิม)
// ============================================================
const FOG_RADIUS = 1, HOLE_RADIUS = 2, SPREAD_RADIUS = 2, HOLE_BLAST = 3, HOLE_BLAST_RADIUS = 1;

function locked(t, r) {
  if (!r || !r.lock || !t || !t.reactLock) return false;
  const until = t.reactLock[r.key];
  return until != null && (match.roundNumber || 0) < until;
}
function lockFor(t, r) {
  if (!r.lock || !t) return;
  t.reactLock = t.reactLock || {};
  t.reactLock[r.key] = (match.roundNumber || 0) + REACT_LOCK + 1;
}
function withReaction(a, b, fn) {
  const prev = match.reactEls;
  match.reactEls = [a, b];
  try { return fn(); } finally { match.reactEls = prev; }
}
// ศัตรูของต้นตอในกรอบ (2r+1)×(2r+1) รอบกล่อง box (นับทั้งกล่อง · ตัวใหญ่ทับช่องไหนก็นับ)
function unitsAround(box, r, source, { withMain = null } = {}) {
  return Object.values(match.players).filter((u) => u.alive && u.pos && (u === withMain || canTake(u, source)) &&
    cheb(box, { x: u.pos.x, y: u.pos.y, size: action().sizeOf(u) }) <= r);
}
const boxOfUnit = (t) => ({ x: t.pos.x, y: t.pos.y, size: action().sizeOf(t) });
function blindTurns(u, n) {
  const C = combat();
  return C.applyDebuff(u, "blind", 1, n);
}

function reactSpecial(t, a, b, r, source) {
  const C = combat();
  const at = t.pos ? { ...t.pos } : null;
  const size = action().sizeOf(t);
  const lines = [];
  let ring = [];
  withReaction(a, b, () => withElement(null, () => {
    if (r.key === "fog" && at) {
      const f = addField("fog", t, source, FOG_TURNS, a, b);
      ring = unitsAround(f.box, FOG_RADIUS, source, { withMain: t });
      for (const u of ring) if (blindTurns(u, 1)) lines.push(`${u.name} ตาบอด`);
      lines.unshift(`หมอกพิษ 3×3 ${FOG_TURNS} เทิร์น`);
    } else if (r.key === "stir") {
      if (C.applyDebuff(t, "stirred", 1, STIR_TURNS)) lines.push(`${t.name} ดาเมจต่อเทิร์น ×2 ${STIR_TURNS} เทิร์น`);
    } else if (r.key === "spread" && at) {
      const turns = (t.statuses && t.statuses.poison) || 0;
      const Status = require("../characters/_universal_status");
      ring = unitsAround(boxOfUnit(t), SPREAD_RADIUS, source).filter((u) => u !== t);
      if (turns > 0) for (const u of ring) if (Status.applyPoison(u, turns)) lines.push(`${u.name} พิษร้าย ${turns} เทิร์น`);
    } else if (r.key === "hole" && at) {
      addField("hole", t, source, HOLE_TURNS, a, b);
      lines.push(`หลุมดำ ${HOLE_TURNS} เทิร์น`);
    } else if (r.key === "glare") {
      if (blindTurns(t, GLARE_TURNS)) lines.push(`${t.name} ตาบอด ${GLARE_TURNS} เทิร์น`);
      if (engine().applyPassiveSeal && engine().applyPassiveSeal(t, GLARE_TURNS) !== false) lines.push(`สกิลติดตัวใช้ไม่ได้ ${GLARE_TURNS} เทิร์น`);
    }
    lockFor(t, r);
  }));
  match.lastLog.push(`${ELEMENTS[a].icon}${ELEMENTS[b].icon} ${r.name}! ${lines.join(" · ")}`.trim());
  const out = { key: r.key, name: r.name, a, b, id: t.id };
  match.elemLast = out;
  fx("elemReact", { key: r.key, name: r.name, a, b, id: t.id, at, ring: ring.filter((u) => u !== t).map((u) => u.id), size });
  sfx(r.key);
  return out;
}

// ---------- พื้นที่ค้างของปฏิกิริยา (หมอกพิษ / หลุมดำ) — ลงผลต้นเทิร์น (phases/draw.js dealRound หลังลูปผู้เล่น) ----------
function addField(kind, t, source, turns, a, b) {
  match.elemFields = match.elemFields || [];
  const s = action().sizeOf(t);
  // กลางกรอบ = ช่องกลางตัวเป้า (ตัวใหญ่ = ช่องบนซ้ายของกลาง)
  const c = Math.floor((s - 1) / 2);
  const f = {
    id: `${kind}${match.elemFieldSeq = (match.elemFieldSeq || 0) + 1}`, kind,
    box: { x: t.pos.x + c, y: t.pos.y + c, size: 1 }, turns, srcId: source ? source.id : null, a, b,
  };
  match.elemFields.push(f);
  return f;
}
function resetFields() { match.elemFields = []; }
function fieldsPub() {
  return (match.elemFields || []).map((f) => ({ id: f.id, kind: f.kind, x: f.box.x, y: f.box.y, turns: f.turns,
    r: f.kind === "fog" ? FOG_RADIUS : HOLE_RADIUS }));
}
function tickFields() {
  const list = match.elemFields || [];
  if (!list.length) return;
  const keep = [];
  for (const f of list) {
    const src = (f.srcId && match.players[f.srcId]) || null;
    const run = () => withReaction(f.a, f.b, () => withElement(null, () => tickField(f, src)));
    if (src) combat().withEffectSource(src, run); else run();
    f.turns--;
    if (f.turns > 0) { keep.push(f); continue; }
    if (f.kind === "hole") {
      const boom = () => withReaction(f.a, f.b, () => withElement(null, () => holeBlast(f, src)));
      if (src) combat().withEffectSource(src, boom); else boom();
    }
    fx("elemField", { kind: f.kind, id: f.id, at: { x: f.box.x, y: f.box.y }, end: true });
  }
  match.elemFields = keep;
}
function tickField(f, src) {
  const C = combat();
  if (f.kind === "fog") {
    const hit = unitsAround(f.box, FOG_RADIUS, src);
    const lines = [];
    for (const u of hit) {
      const before = hpArm(u);
      C.dealMixed(u, 1);
      blindTurns(u, 1);
      lines.push(`${u.name} -${Math.max(0, before - hpArm(u))}`);
      killCheck(u, null);
    }
    if (hit.length) match.lastLog.push(`☠️ หมอกพิษ ${lines.join(" · ")}`);
    fx("elemField", { kind: "fog", id: f.id, at: { x: f.box.x, y: f.box.y }, ids: hit.map((u) => u.id) });
    return;
  }
  if (f.kind === "hole") {
    const Ice = require("./ice");
    const near = unitsAround(f.box, HOLE_RADIUS, src);
    const ctx = Ice.begin();
    const pulled = [];
    for (const u of near) {
      const ub = boxOfUnit(u);
      if (cheb(f.box, ub) === 0) continue; // ทับกลางอยู่แล้ว
      const us = ub.size, ucx = u.pos.x + (us - 1) / 2, ucy = u.pos.y + (us - 1) / 2;
      const dir = { x: Math.sign(f.box.x - ucx), y: Math.sign(f.box.y - ucy) };
      if (!dir.x && !dir.y) continue;
      Ice.pushUnit(u, dir, ctx, 1);
      pulled.push(u);
    }
    Ice.flush(ctx);
    const lines = [];
    for (const u of near) {
      if (!u.alive || !u.pos) continue;
      const centre = cheb(f.box, boxOfUnit(u)) === 0;
      const before = hpArm(u);
      C.dealMixed(u, centre ? 2 : 1);
      lines.push(`${u.name} -${Math.max(0, before - hpArm(u))}`);
      killCheck(u, null);
    }
    if (lines.length) match.lastLog.push(`🕳️ หลุมดำดูด ${lines.join(" · ")}`);
    fx("elemField", { kind: "hole", id: f.id, at: { x: f.box.x, y: f.box.y }, ids: near.map((u) => u.id), pulled: pulled.map((u) => u.id) });
  }
}
function holeBlast(f, src) {
  const C = combat();
  const hit = unitsAround(f.box, HOLE_BLAST_RADIUS, src);
  const lines = [];
  for (const u of hit) {
    const before = hpArm(u);
    C.dealMixed(u, HOLE_BLAST);
    lines.push(`${u.name} -${Math.max(0, before - hpArm(u))}`);
    killCheck(u, null);
  }
  match.lastLog.push(`💥 หลุมดำระเบิด${lines.length ? ` ${lines.join(" · ")}` : ""}`);
  fx("elemField", { kind: "holeBlast", id: f.id, at: { x: f.box.x, y: f.box.y }, ids: hit.map((u) => u.id) });
  sfx("hole_blast");
}

// ============================================================
//  ประเภทตัวละคร (Master + ตัวอัญเชิญ — GRID_PLAN §7.34 · ผู้ใช้: ใส่เฉพาะ Master + ตัวอัญเชิญ)
//   Zombie: พิษ (ธาตุ + ปฏิกิริยา) ×0.5 · ไม่ติดพิษร้าย · ไฟ (ธาตุ + ปฏิกิริยา) ×2 · ลุกไหม้ ×2
//   Holy: แสง ×0.5 · ไม่ติดอ่อนแอ/เชื่องช้า · มืด ×2.5
//   Metal: น้ำแข็ง/สายฟ้า (ธาตุ + ปฏิกิริยา) ×0.75 · ไฟ (ธาตุ + ปฏิกิริยา) ×1.5
//   ตัวคูณปัดขึ้น · ปฏิกิริยาที่มีทั้งธาตุแรงขึ้นและอ่อนลง = นับธาตุที่โดนก่อน (คราบเดิม) ก่อน (ผู้ใช้)
//   ฮุคตัวละคร unitType(p) → "zombie" | "holy" | "metal" · ยูนิตที่ถูกเรียก summon.utype
// ============================================================
const TYPE_RULES = {
  zombie: { poison: 0.5, fire: 2, burn: 2 },
  holy: { light: 0.5, dark: 2.5 },
  metal: { ice: 0.75, bolt: 0.75, fire: 1.5 },
};
const TYPE_IMMUNE = { zombie: ["poison"], holy: ["weak", "slow"] };
const TYPE_NAMES = { zombie: "Zombie", holy: "Holy", metal: "Metal" };
function typeOf(p) {
  if (!p) return null;
  if (p.summon && p.summon.utype) return p.summon.utype;
  const h = CHAR_HOOKS[p.characterId];
  if (!h || typeof h.unitType !== "function") return null;
  try { return h.unitType(p) || null; } catch (err) { console.error(`[hook] ${h.id}.unitType โยน error:`, err); return null; }
}
function typeBlocks(p, key) {
  const t = typeOf(p);
  return !!(t && TYPE_IMMUNE[t] && TYPE_IMMUNE[t].includes(key));
}
function typeAdjust(p, n) {
  if (!(n > 0) || !p) return n;
  let mult = 1;
  const t = typeOf(p), rule = t && TYPE_RULES[t];
  if (rule) {
    if (p._dotKind === "burn" && rule.burn) mult = rule.burn;
    else if (match.reactEls) {
      const [a, b] = match.reactEls;
      const k = rule[a] != null ? a : rule[b] != null ? b : null;
      if (k) mult = rule[k];
    } else if (!p._statusDamage) {
      const el = current();
      if (el && rule[el] != null) mult = rule[el];
    }
  }
  if (p._statusDamage && ((p.statuses && p.statuses.stirred) || 0) > 0) mult *= 2; // กระตุ้น: ดาเมจต่อเทิร์น ×2
  return mult === 1 ? n : Math.ceil(n * mult);
}

Object.assign(module.exports, {
  ELEMENTS, AURA_KEYS, REACTIONS, ORDER, AURA_TURNS, FROST_TURNS, ROOT_TURNS,
  REACT_LOCK, TYPE_RULES, TYPE_IMMUNE, TYPE_NAMES, CLASSIC,
});
