// ============================================================
//  Ophy นักเล่นแร่แปรธาตุ — ยาก · id "ophy" · สเปกเพื่อนผู้ใช้ 2026-11-23 + คำตอบ 2026-11-24 (GRID_PLAN §7.43 · GAME_SYSTEM §67)
//
//  ค่าพื้นฐาน: พลังชีวิต 13 · เกราะ 2 · พลังงาน (แต้มสกิล) 0/8 · เดิน 4 · ตีปกติปกติไม่มี (ใช้ปืนยิงยาแทน)
//
//  ติดตัว 1 อัจฉริยะแห่งการเล่นแร่แปรธาตุ
//   · ผลจากปฏิกิริยาที่ได้รับ −1 (ดาเมจ −1 · สถานะ −1 เทิร์น — ฮุค reactionShift → server/element.js)
//   · ลุกไหม้/พิษร้าย/น้ำแข็งกัด/ช็อต ทำงานต้นเทิร์น = 40% ไม่ได้รับผล (ฮุค dotShrug → server/phases/draw.js)
//   · Ophy ทำให้เกิดปฏิกิริยา = วัตถุดิบตก 2–4 ชิ้นในพื้นที่ปฏิกิริยา (อยู่ 3 เทิร์น) + ได้เดินพิเศษ 3 ช่อง (ไม่ซ้อน — รีเซ็ตเป็น 3)
//   · ดื่มยาธาตุตอนมีคราบอยู่แล้ว = ปฏิกิริยาที่ตัวเองขยาย 3×3 → 5×5 (ตัวเองโดนด้วย)
//   · เดินเก็บวัตถุดิบที่ตก = ชิ้นละพลังงาน +2
//  ติดตัว 2 ปืนยิงยา: ปุ่ม "ยิงยา" ระยะ 3 วง 3×3 (ยิงลงช่องว่างได้) · ใช้ยาในแถวเรียกใช้ตามลำดับแล้ววน · ไม่มีเลย = น้ำยาตั้งต้น
//   · ไม่มีดาเมจ (ผลของยาเท่านั้น) · โดนตัวเองถ้าอยู่ในวง · ไม่จบตา แต่เดินต่อไม่ได้ · ตาละ 1 ครั้ง (ยกเว้น calculated)
//   · ยา 4 ขวดถัดไปลอยบนหัว (ทุกคนเห็น)
//  ติดตัว 3 กระเป๋าวิเศษ 6×3: เรียกใช้ (ลำดับ 1–6) / กักตุน / วัตถุดิบ · ยาจุรวม 50 ขวด ช่องละ 5 · วัตถุดิบช่องละ 15
//   · เรียงลำดับ = ลากสลับแล้วยืนยัน (คูลดาวน์ 1 เทิร์น) · ยาที่ปรุงได้เข้ากักตุน เต็มแล้วล้นไปเรียกใช้
//  สกิลพื้นฐาน ปรุงยา (0): ของ 3 อย่างในหม้อ (สลับตำแหน่งได้) · ถูกสูตร = ได้ยา (35% ไม่เสียของ · สำเร็จติดกันทุก 3 ขวด = ฟื้นพลัง 2 ขั้น)
//   · ผิดสูตร = เสียของ 2 ใน 3 (สุ่ม) + ระเบิด 3×3 เสียหาย 1 (รวมตัวเอง) ผลัก 2 ช่อง + จบตาทันที · รีเซ็ตโบนัส
//  สกิลรอง Lock in (2 · คูลดาวน์ 2): 1 เทิร์น — ถูกเล็ง/โจมตี = โยนยาสวนกลับตามลำดับ (ไม่จำกัดครั้ง · ยาหมด = ไม่โยน)
//   · ผ่านไปครบโดยไม่เสียหาย = ยาสุ่ม 1 ขวด + วัตถุดิบสุ่ม 3–4 ชิ้น
//  ท่าไม้ตาย calculated (0 · คูลดาวน์ 1 · ยิงยา/ใช้สกิลรองไปแล้วใช้ไม่ได้): ตานี้ยิงยาต่อเนื่องได้ — ครั้งแรกฟรี ครั้งต่อไป 2 พลังงาน (ตายตัว)
//
//  คำตอบเพื่อนผู้ใช้ (2026-11-24): ยิงยาไม่มีดาเมจ · โดนตัวเองถ้าอยู่ในวง · โจมตีปกติตาละครั้ง (นอกท่าไม้ตาย) ·
//   ช่องเรียกใช้ 1–6 · ยาเข้ากักตุน เต็มล้นไปเรียกใช้ · ไพ่สีนับเฉพาะเทิร์นนั้น · เดินพิเศษ 3 = แทนระยะเดิมเสมอ ·
//   ดื่มผ่านกระเป๋าตัวเอง · ให้ยาเพื่อน = ไอเทมทั่วไปในกระเป๋าเพื่อน (ให้ได้แบบ duo/trio/PVE) · ปรุงพลาดเสียของแบบสุ่ม ·
//   ช่องพลังงานธาตุคนอื่นเห็นแต่เก็บไม่ได้ · หนังสือ/ปากกา/กระดาษในหน้ากระเป๋า = ทางลัดหน้าสูตร / จดสูตร / ใส่ของตามสูตรที่จด
//  Claude ตัดสินเอง (บอกผู้ใช้แล้ว):
//   · ปรุงยา/เรียงยา/ดื่มยา ไม่กินโควตาสกิล ไม่ล็อกการเดิน · ปรุงยาไม่ขึ้นป้ายสกิล (เสียงแทน)
//   · ยาที่เป็นโทษไม่ติดเพื่อนร่วมทีม (กันยิงพวกเดียวกันแบบทุกตัว) · ศัตรูทอยหลบรายตัว · ตัวเอง/เพื่อนโดนแน่นอน
//   · "1 เทิร์น" ของสถานะ = นับแบบเดียวกับเกม (เป้าเดินไปแล้ว/กำลังเดิน = อยู่ถึงจบเทิร์นหน้า)
//   · Lock in อยู่จนต้นตาเดินถัดไปของ Ophy · สวนกลับลงผลทันทีหลังการกระทำนั้น (ไม่ทอยหลบซ้ำให้ Ophy)
//   · สมุนไพรนับจากก้าวที่เดินจริงตอนจบตา (ย้อนเดิน = ไม่นับ) · ช่องพลังงาน 2 จุดเปลี่ยนทุกต้นเทิร์น · เดินผ่าน = เก็บ
//   · ไพ่ 2 ใบ = 1 ครั้ง (4 ใบ = 2 ครั้ง) · แก่นชีพจรทอยครั้งต่อเป้าต่อการกระทำ เพดาน 3 ชิ้นต่อเทิร์น
//   · ไก่/นก ใครก็ติดได้ (server/morph.js) · ไก่ยังใช้ไอเทมได้
// ============================================================
const PassiveSeal = require("../server/passiveSeal");
const Status = require("./_universal_status");

const ID = "ophy";
const DIR = "/characters/ophy";

const HP = 13, ARMOR = 2;
const CAP = 50;            // ยาจุรวมในกระเป๋า (ไม่นับวัตถุดิบ)
const POT_STACK = 5;       // ยาชื่อเดียวกันซ้อนได้ต่อช่อง
const MAT_STACK = 15;      // วัตถุดิบชื่อเดียวกันซ้อนได้ต่อช่อง
const ROW = 6;
const START_BASE = 5;      // เริ่มเกมพร้อมน้ำยาตั้งต้น 5 ขวด
const THROW_RANGE = 3;     // ระยะยิงยา (แมนฮัตตันจากขอบตัว)
const THROW_SIZE = 3;      // วง 3×3
const DROP_TURNS = 3;      // วัตถุดิบที่ตกอยู่ 3 เทิร์น
const DROP_ENERGY = 2;     // เก็บวัตถุดิบที่ตก = พลังงาน +2/ชิ้น
const NODE_COUNT = 2, NODE_RANGE = 4; // ช่องพลังงานธาตุ: ต้นเทิร์นสุ่ม 2 จุดในระยะ 4
const REACT_MOVE = 3;      // เดินพิเศษหลังทำปฏิกิริยา
const FREE_BREW = 35;      // % ปรุงสำเร็จไม่เสียของ
const STREAK = 3, STREAK_REGEN = 2;
const SORT_CD = 1, LOCK_CD = 2, ULT_CD = 1;
const CALC_COST = 2;       // calculated: ยิงครั้งที่ 2 ขึ้นไป (ตายตัว)
const DOT_SHRUG = 40;      // % ไม่ได้รับผลสถานะต่อเทิร์น
const PULSE_CAP = 3;       // แก่นชีพจรสูงสุดต่อเทิร์น
const THROW_BEAT = 0.85;   // วิ: ขวดลอยถึงเป้า (ophyFx.js OPHY_T.land)

const MATS = {
  herb: { name: "สมุนไพร", icon: "🌿" },
  orb: { name: "ลูกแก้วธาตุ", icon: "🔮" },
  crystal: { name: "ผลึกเวท", icon: "💎" },
  pulse: { name: "แก่นชีพจร", icon: "🧬" },
  water: { name: "น้ำบริสุทธิ์", icon: "💧" },
  spirit: { name: "สสารวิญญาณ", icon: "👻" },
};
const MAT_KEYS = Object.keys(MATS);
// สีของน้ำยา (RGB) ตามภาพขวดของเพื่อนผู้ใช้ PT_01–PT_11
const POTIONS = {
  base: { n: 1, name: "น้ำยาตั้งต้น", icon: "⚗️", el: "water", rgb: "58,120,230" },
  frost: { n: 2, name: "น้ำยาเย็นยะเยือก", icon: "❄️", el: "ice", rgb: "60,205,225" },
  bolt: { n: 3, name: "น้ำยาอัสนี", icon: "⚡", el: "bolt", rgb: "235,210,60" },
  venom: { n: 4, name: "น้ำยาพิษร้าย", icon: "☠️", el: "poison", rgb: "200,40,200" },
  flame: { n: 5, name: "น้ำยาเพลิง", icon: "🔥", el: "fire", rgb: "245,135,30" },
  heal: { n: 6, name: "น้ำยาเยียวยา", icon: "❤️", rgb: "40,215,90" },
  noheal: { n: 7, name: "น้ำยาไร้ทางเยียวยา", icon: "🚫", rgb: "30,30,40" },
  ward: { n: 8, name: "น้ำยาภูมิต้านทาน", icon: "🛡️", rgb: "110,150,100" },
  invis: { n: 9, name: "น้ำยาล่องหน", icon: "👻", rgb: "200,205,215" },
  warp: { n: 10, name: "น้ำยาวาร์ป", icon: "🌀", rgb: "120,95,210" },
  morph: { n: 11, name: "น้ำยาแปลงร่าง", icon: "🐦", rgb: "200,30,30" },
};
const POT_KEYS = Object.keys(POTIONS);
const potImg = (k) => `${DIR}/potions/p${POTIONS[k].n}.webp`;
// สูตร (สลับตำแหน่งได้) — วัตถุดิบ = คีย์ · น้ำยา = "p:<คีย์>"
const RECIPES = [
  ["base", ["herb", "herb", "water"]],
  ["frost", ["orb", "orb", "water"]],
  ["bolt", ["orb", "pulse", "water"]],
  ["venom", ["herb", "pulse", "water"]],
  ["flame", ["orb", "crystal", "water"]],
  ["heal", ["herb", "herb", "pulse"]],
  ["noheal", ["crystal", "crystal", "pulse"]],
  ["ward", ["herb", "crystal", "water"]],
  ["invis", ["spirit", "spirit", "water"]],
  ["warp", ["p:invis", "crystal", "orb"]],
  ["morph", ["p:invis", "p:heal", "pulse"]],
];
const sig = (list) => [...list].sort().join("+");
const RECIPE_BY_SIG = Object.fromEntries(RECIPES.map(([k, ing]) => [sig(ing), k]));

const IMG = {
  base: `${DIR}/ophy.webp`, standee: `${DIR}/standee.webp`,
  skill1: `${DIR}/skill1.webp`, skill2: `${DIR}/skill2.webp`, skill3: `${DIR}/skill3.webp`,
  pocket: `${DIR}/pocket.webp`, chicken: `${DIR}/chicken.webp`, bird: `${DIR}/bird.webp`,
};
const SFX = {
  brew: "ophy_brew", fail: "elem_blast", lock: "ophy_nuh", calc: "ophy_calc",
  voiceBrew: ["ophy_haha1", "ophy_haha2"],
};

const isOphy = (p) => !!p && p.characterId === ID && !p.summon;
const passiveOn = (p) => isOphy(p) && PassiveSeal.on(p);
const Element = () => require("../server/element");
const Board = () => require("../server/board");

// ---------- สถานะ ----------
function fresh() {
  const call = Array(ROW).fill(null), store = Array(ROW).fill(null), mats = Array(ROW).fill(null);
  store[0] = { k: "base", n: START_BASE };
  // เครื่องมือ dev: ECHO_DEV_OPHY=1 = เริ่มแมตช์พร้อมวัตถุดิบทุกชนิด + ยาครบทุกขวด (ทดสอบกระเป๋า/เอฟเฟกต์) · ไม่ตั้ง = ปกติ
  if (process.env.ECHO_DEV_OPHY === "1") {
    MAT_KEYS.forEach((k, i) => { mats[i] = { k, n: 9 }; });
    ["frost", "bolt", "venom", "flame", "heal", "morph"].forEach((k, i) => { call[i] = { k, n: 2 }; });
    ["noheal", "ward", "invis", "warp"].forEach((k, i) => { store[i + 1] = { k, n: 2 }; });
  }
  return {
    call, store, mats, cursor: 0, sortReady: 0, streak: 0, throwRound: -1,
    lockIn: null, lockReady: 0, lockRound: -1, calc: null, ultReady: 0,
    drops: [], nodes: [], dropSeq: 0, walkCarry: 0, walkNow: 0, pulse: { round: -1, n: 0 },
    reacted: false, wide: false, note: null, sound: null, fx: null, fxSeq: 0, counterQ: [],
  };
}
function st(p) { return p.ophy || (p.ophy = fresh()); }

// ---------- กระเป๋า ----------
const rowOf = (s, r) => (r === "c" ? s.call : r === "s" ? s.store : r === "m" ? s.mats : null);
function parseRef(ref) {
  const m = /^([csm])([0-5])$/.exec(String(ref || ""));
  return m ? { r: m[1], i: Number(m[2]) } : null;
}
function slotAt(s, ref) {
  const f = parseRef(ref);
  if (!f) return null;
  return rowOf(s, f.r)[f.i];
}
function potionTotal(s) {
  return [...s.call, ...s.store].reduce((n, x) => n + (x ? x.n : 0), 0);
}
function potionCount(s, k) {
  return [...s.call, ...s.store].reduce((n, x) => n + (x && x.k === k ? x.n : 0), 0);
}
// ใส่ยา 1 ขวด: กักตุน (ซ้อนกองเดิม → ช่องว่าง) แล้วล้นไปเรียกใช้ · เต็ม 50 / ไม่มีช่อง = ไม่ได้
function addPotion(s, k) {
  if (!POTIONS[k] || potionTotal(s) >= CAP) return false;
  for (const row of [s.store, s.call]) {
    const same = row.find((x) => x && x.k === k && x.n < POT_STACK);
    if (same) { same.n++; return true; }
    const i = row.findIndex((x) => !x);
    if (i >= 0) { row[i] = { k, n: 1 }; return true; }
  }
  return false;
}
// ใส่วัตถุดิบ n ชิ้น → จำนวนที่ใส่ได้จริง (ช่องเต็มทั้งแถว = ส่วนที่เหลือหาย)
function addMat(s, k, n = 1) {
  if (!MATS[k]) return 0;
  let left = n;
  for (const x of s.mats) if (left > 0 && x && x.k === k && x.n < MAT_STACK) { const d = Math.min(left, MAT_STACK - x.n); x.n += d; left -= d; }
  for (let i = 0; i < ROW && left > 0; i++) if (!s.mats[i]) { const d = Math.min(left, MAT_STACK); s.mats[i] = { k, n: d }; left -= d; }
  return n - left;
}
function takeAt(s, ref, n = 1) {
  const f = parseRef(ref);
  const row = f && rowOf(s, f.r);
  const x = row && row[f.i];
  if (!x || x.n < n) return false;
  x.n -= n;
  if (x.n <= 0) row[f.i] = null;
  return true;
}
// เอายา k ออก 1 ขวด (เรียกใช้ก่อน แล้วกักตุน) — ใช้ตอนยิงน้ำยาตั้งต้นสำรอง
function takePotion(s, k) {
  for (const r of ["c", "s"]) {
    const row = rowOf(s, r);
    for (let i = 0; i < ROW; i++) if (row[i] && row[i].k === k) { takeAt(s, `${r}${i}`); return true; }
  }
  return false;
}

// ---------- ลำดับยิง ----------
//  ช่องเรียกใช้ตามลำดับ 1–6 เริ่มที่ cursor (ข้ามช่องว่าง) แล้ววน · แถวเรียกใช้ว่างทั้งแถว = น้ำยาตั้งต้นจากที่ไหนก็ได้
function nextShot(s) {
  for (let j = 0; j < ROW; j++) {
    const i = (s.cursor + j) % ROW;
    if (s.call[i] && s.call[i].n > 0) return { k: s.call[i].k, ref: `c${i}`, i };
  }
  if (potionCount(s, "base") > 0) return { k: "base", ref: null, i: null };
  return null;
}
function consumeShot(s, shot) {
  if (shot.ref) { takeAt(s, shot.ref); s.cursor = (shot.i + 1) % ROW; } else takePotion(s, "base");
}
// ยา 4 ขวดถัดไป (จำลองการยิงต่อเนื่อง) — ลอยบนหัว ทุกคนเห็น
function queueOf(s) {
  const sim = { call: s.call.map((x) => (x ? { ...x } : null)), store: s.store.map((x) => (x ? { ...x } : null)), mats: [], cursor: s.cursor };
  const out = [];
  for (let n = 0; n < 4; n++) {
    const shot = nextShot(sim);
    if (!shot) break;
    out.push(shot.k);
    consumeShot(sim, shot);
  }
  return out;
}

// ---------- ช่วยทั่วไป ----------
const roundOf = (engine) => engine.roundNumber || 0;
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const roll = (pct) => Math.random() * 100 < pct;
// เทิร์นของสถานะที่ใส่ให้ u: เดินไปแล้ว/กำลังเดิน = +1 (อยู่ถึงจบเทิร์นหน้า — แบบปฏิกิริยาเยือกแข็ง)
const turnsFor = (engine, u, n) => n + (engine.hasActed(u.id) || engine.actorId === u.id ? 1 : 0);
function sound(p, key) { st(p).sound = key; }
function markFx(p, fx) { const s = st(p); s.fx = { seq: ++s.fxSeq, ...fx }; }
function boardFx(engine, payload) { try { engine.boardFx("ophyFx", payload); } catch (_) { /* เทสต์ */ } }
function sfx(engine, key, opts) { try { engine.sfx(key, null, opts); } catch (_) { /* เทสต์ */ } }
function voice(p, event) { try { require("../server/voice").play(p, event); } catch (_) { /* เทสต์ */ } }
function cheb(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
function boxTiles(engine, cx, cy, size) {
  const B = Board(), map = engine.boardMap(), h = Math.floor(size / 2), out = [];
  for (let dy = -h; dy < size - h; dy++) for (let dx = -h; dx < size - h; dx++) {
    const x = B.wx ? B.wx(cx + dx) : cx + dx, y = cy + dy;
    if (B.inBounds(map, x, y)) out.push({ x, y });
  }
  return out;
}
function unitsOn(engine, tiles) {
  const B = Board(), set = new Set(tiles.map((t) => `${t.x},${t.y}`));
  return Object.values(engine.players).filter((u) => u.alive && u.pos &&
    B.footprint(u.pos.x, u.pos.y, engine.sizeOf(u)).some((c) => set.has(`${c.x},${c.y}`)));
}
const foe = (engine, p, u) => u.id !== p.id && !engine.sameTeam(p, u);

// ---------- ผลของน้ำยาที่ตัว u (ผู้ใช้ p) ----------
//  how = "throw" (ยิง/สวน) · "drink" (ดื่มเอง — u === p)
function potionOn(engine, p, u, k, how) {
  const P = POTIONS[k];
  if (!P || !u || !u.alive) return;
  const self = u.id === p.id;
  const harm = self || !engine.sameTeam(p, u); // ยาที่เป็นโทษ: ตัวเอง/ศัตรู
  const E = Element();
  if (P.el) {
    if (harm) {
      const go = () => E.apply(u, P.el, p, { force: self });
      // ดื่มเองตอนมีคราบอยู่แล้ว (ติดตัว 1): ปฏิกิริยาขยาย 3×3 → 5×5 (ตัวเองโดนด้วย)
      const wide = how === "drink" && self && passiveOn(p) && !!E.auraOf(p);
      if (wide) {
        st(p).wide = true;
        const out = E.withRing(2, go);
        if (out) spreadWide(engine, p, out);
        st(p).wide = false;
      } else go();
    }
    if (!u.alive) return;
  }
  const T = (n) => turnsFor(engine, u, n);
  switch (k) {
    case "base": if (harm) engine.applyDebuff(u, "immLow", null, T(2)); break;
    case "frost": if (harm) engine.ice.applySlow(u, 1); break;
    case "bolt": if (harm && (self || !engine.friendlyEffectBlocked(u))) engine.applyShock(u, T(1)); break;
    case "venom": if (harm && (self || !engine.friendlyEffectBlocked(u))) engine.applyPoison(u, T(1)); break;
    case "flame": if (harm && (self || !engine.friendlyEffectBlocked(u))) engine.applyBurn(u, 1); break;
    case "heal": engine.healHp(u, 1); Status.applyMend(u, 1, 1); break;
    case "noheal": if (harm) engine.applyDebuff(u, "nohealing", null, T(1)); break;
    case "ward": Status.cleanseOneStep(u); engine.applyBuff(u, "immHigh", null, T(2)); break;
    case "invis": engine.applyBuff(u, "invis", null, T(2)); break;
    case "warp": if (how === "throw") warpRandom(engine, p, u); break; // ดื่ม = เลือกช่องเอง (drinkSelf)
    case "morph":
      if (how === "drink") { engine.applyBuff(u, "bird", null, T(1)); engine.applyBuff(u, "evade", 100, 1); } else if (harm) engine.applyDebuff(u, "chicken", null, T(1));
      break;
    default: break;
  }
}
// ปฏิกิริยาที่ตัวเองแบบ 5×5: ปฏิกิริยาเป้าเดียว (ไม่มีวงรอบตัว) → ศัตรูในกรอบ 5×5 โดนปฏิกิริยาเดียวกันด้วย
function spreadWide(engine, p, out) {
  const E = Element();
  const r = E.REACTIONS[[out.a, out.b].sort().join("+")];
  if (!r || r.ring || r.push || r.special || !p.pos) return;
  const near = Object.values(engine.players).filter((u) => u.alive && u.pos && u.id !== p.id && foe(engine, p, u) && cheb(u.pos, p.pos) <= 2);
  E.withChainBlock(near.map((u) => u.id), () => {
    for (const u of near) if (u.alive) E.react(u, out.a, out.b, p, { from: p.id, step: 1 });
  });
  for (const u of near) if (!u.alive) u.pos = null;
}
// วาร์ปแบบสุ่ม: ช่องว่างในระยะ 1–6 จากตัวเป้า (ตัวใหญ่ไม่วาร์ป)
function warpRandom(engine, p, u) {
  if (!u.pos || engine.sizeOf(u) > 1) return;
  const B = Board(), map = engine.boardMap(), spots = [];
  for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
    const d = Math.abs(dx) + Math.abs(dy);
    if (d < 1 || d > 6) continue;
    const x = B.wx ? B.wx(u.pos.x + dx) : u.pos.x + dx, y = u.pos.y + dy;
    if (B.inBounds(map, x, y) && engine.tileFree(x, y, u.id)) spots.push({ x, y, d });
  }
  if (!spots.length) return;
  const far = spots.filter((t) => t.d === 6);
  const pick = (far.length ? far : spots)[Math.floor(Math.random() * (far.length ? far.length : spots.length))];
  teleport(engine, u, pick);
}
function teleport(engine, u, to) {
  const from = { ...u.pos };
  u.pos = { x: to.x, y: to.y };
  boardFx(engine, { kind: "warp", id: u.id, from, to: { x: to.x, y: to.y } });
  engine.log(`🌀 ${u.name} ถูกวาร์ป`);
}

// ---------- ยิงยา (ปืนยิงยา) ----------
function throwTiles(engine, p) {
  if (!p.pos) return [];
  const B = Board(), map = engine.boardMap(), box = { x: p.pos.x, y: p.pos.y, size: engine.sizeOf(p) }, out = [];
  const R = THROW_RANGE + engine.sizeOf(p);
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = B.wx ? B.wx(p.pos.x + dx) : p.pos.x + dx, y = p.pos.y + dy;
    if (!B.inBounds(map, x, y)) continue;
    if (B.dist(box, { x, y, size: 1 }) <= THROW_RANGE) out.push({ x, y });
  }
  return out;
}
const calcOn = (engine, p) => { const c = st(p).calc; return !!c && c.round === roundOf(engine); };
// ยิงได้ไหมตอนนี้ → { ok, cost }
function throwState(engine, p) {
  const s = st(p);
  if (!isOphy(p) || !p.alive || require("../server/morph").of(p)) return { ok: false, cost: 0 };
  if (!nextShot(s)) return { ok: false, cost: 0 };
  if (calcOn(engine, p)) {
    const cost = s.calc.n > 0 ? CALC_COST : 0;
    return { ok: (p.skillPoints || 0) >= cost, cost };
  }
  return { ok: s.throwRound !== roundOf(engine), cost: 0 };
}
// โยนขวด k ลงวง 3×3 ที่ช่อง tile (ผู้ใช้ p) → ลงผลทันที (คืนรายชื่อที่โดน)
function landPotion(engine, p, k, tile, { counter = false } = {}) {
  const tiles = boxTiles(engine, tile.x, tile.y, THROW_SIZE);
  const hits = [], dodged = [];
  const s = st(p);
  s.reacted = false;
  engine.withEffectSource(p, () => {
    for (const u of unitsOn(engine, tiles)) {
      if (!u.alive) continue;
      if (foe(engine, p, u) && engine.dim && engine.dim.same && !engine.dim.same(p, u)) continue;
      if (foe(engine, p, u) && engine.skillDodge(p, u, ` ${POTIONS[k].name}`)) { dodged.push(u.id); continue; }
      hits.push(u.id);
      potionOn(engine, p, u, k, "throw");
    }
  });
  for (const u of Object.values(engine.players)) if (!u.alive && u.pos && u.hp <= 0) u.pos = null;
  engine.log(`🧪 ${p.name}${counter ? " สวนกลับด้วย" : " ยิง"}${POTIONS[k].name}${hits.length ? ` — โดน ${hits.map((id) => engine.players[id].name).join(", ")}` : ""}`);
  return { tiles, hits, dodged };
}
function doThrow(engine, p, tile) {
  if (!engine.canAct(p) || !tile) return false;
  const s = st(p);
  const ts = throwState(engine, p);
  if (!ts.ok) return false;
  if (!throwTiles(engine, p).some((t) => t.x === tile.x && t.y === tile.y)) return false;
  const shot = nextShot(s);
  if (!shot) return false;
  consumeShot(s, shot);
  if (calcOn(engine, p)) {
    if (ts.cost > 0) p.skillPoints = Math.max(0, (p.skillPoints || 0) - ts.cost); // calculated: 2 ตายตัว (ไม่ผ่านตัวปรับราคา)
    s.calc.n++;
  }
  s.throwRound = roundOf(engine);
  p.didAttackRound = true;
  require("../server/visibility").onHostileAct(p, "strike");
  engine.action && (engine.action.locked = true); // ยิงแล้วเดินต่อไม่ได้ (ไม่จบตา)
  crystalRoll(engine, p);
  const tiles = boxTiles(engine, tile.x, tile.y, THROW_SIZE);
  boardFx(engine, { kind: "throw", id: p.id, from: { ...p.pos }, to: { x: tile.x, y: tile.y }, size: engine.sizeOf(p), potion: shot.k, rgb: POTIONS[shot.k].rgb, tiles });
  const land = () => {
    const out = landPotion(engine, p, shot.k, tile);
    boardFx(engine, { kind: "splash", id: p.id, at: { x: tile.x, y: tile.y }, potion: shot.k, rgb: POTIONS[shot.k].rgb, tiles: out.tiles, hits: out.hits, dodged: out.dodged });
    afterOwnAction(engine, p);
  };
  if (typeof engine.skillBeat === "function" && engine.gameState === "ACTION") {
    engine.skillBeat(THROW_BEAT, land);
    engine.pausePlayingForCutscene();
  } else land();
  engine.broadcastState();
  return true;
}
// หลังการกระทำของ Ophy ในตาตัวเอง: ทำปฏิกิริยาไป = เดินพิเศษ 3 ช่องจากช่องที่ยืน (ไม่ซ้อน)
function afterOwnAction(engine, p) {
  const s = st(p);
  if (!s.reacted || !p.alive) { s.reacted = false; return; }
  s.reacted = false;
  if (!passiveOn(p) || engine.actorId !== p.id || !engine.action) return;
  engine.freshMove(p);
  engine.action.movLeft = REACT_MOVE;
  engine.log(`👣 ${p.name} เดินพิเศษได้ ${REACT_MOVE} ช่อง`);
}

// ---------- สวนกลับ (Lock in) ----------
const lockOn = (p) => isOphy(p) && p.alive && !!st(p).lockIn;
function queueCounter(engine, p, attacker) {
  const s = st(p);
  const key = `${attacker.id}:${engine.commandSeq || 0}:${engine.cmdSeq || 0}`;
  if (s.lockIn.seen === key) return;
  s.lockIn.seen = key;
  s.counterQ.push(attacker.id);
  if (!s.counterTimer) s.counterTimer = setImmediate(() => { s.counterTimer = null; flushCounters(engine, p); });
}
function flushCounters(engine, p) {
  const s = st(p);
  if (s.counterTimer) { clearImmediate(s.counterTimer); s.counterTimer = null; }
  const list = s.counterQ.splice(0);
  let any = false;
  for (const id of list) {
    const a = engine.players[id];
    if (!p.alive || !s.lockIn || !a || !a.alive || !a.pos) continue;
    const shot = nextShot(s);
    if (!shot) break;
    consumeShot(s, shot);
    any = true;
    sfx(engine, SFX.lock, { voice: p.id });
    const to = { x: a.pos.x, y: a.pos.y };
    boardFx(engine, { kind: "throw", id: p.id, from: p.pos ? { ...p.pos } : to, to, size: engine.sizeOf(p), potion: shot.k, rgb: POTIONS[shot.k].rgb, counter: true, tiles: boxTiles(engine, to.x, to.y, THROW_SIZE) });
    const out = landPotion(engine, p, shot.k, to, { counter: true });
    boardFx(engine, { kind: "splash", id: p.id, at: to, potion: shot.k, rgb: POTIONS[shot.k].rgb, tiles: out.tiles, hits: out.hits, dodged: out.dodged, late: true });
    s.reacted = false;
  }
  if (any) try { engine.broadcastState(); } catch (_) { /* เทสต์ */ }
}
function endLockIn(engine, p) {
  const s = st(p);
  const L = s.lockIn;
  if (!L) return;
  s.lockIn = null;
  if (L.hit || !p.alive) return;
  const k2 = POT_KEYS[Math.floor(Math.random() * POT_KEYS.length)];
  const gotPot = addPotion(s, k2);
  const n = rand(3, 4);
  const got = {};
  for (let i = 0; i < n; i++) { const m = MAT_KEYS[Math.floor(Math.random() * MAT_KEYS.length)]; if (addMat(s, m, 1)) got[m] = (got[m] || 0) + 1; }
  markFx(p, { kind: "gain", potions: gotPot ? [k2] : [], mats: got });
  engine.log(`🔒 ${p.name} Lock in ครบโดยไม่เสียหาย — ได้${gotPot ? ` ${POTIONS[k2].name}` : ""} + วัตถุดิบ ${Object.entries(got).map(([m, c]) => `${MATS[m].icon}×${c}`).join(" ")}`);
}

// ---------- วัตถุดิบ ----------
function gainMat(engine, p, m, n, why) {
  const got = addMat(st(p), m, n);
  if (got > 0) markFx(p, { kind: "gain", mats: { [m]: got }, why });
  return got;
}
function crystalRoll(engine, p) {
  if (isOphy(p) && roll(35)) gainMat(engine, p, "crystal", rand(1, 2), "crystal");
}
function pulseRoll(engine, p) {
  if (!isOphy(p) || !p.alive) return;
  const s = st(p), r = roundOf(engine);
  if (s.pulse.round !== r) s.pulse = { round: r, n: 0 };
  if (s.pulse.n >= PULSE_CAP || !roll(85)) return;
  const n = Math.min(rand(1, 2), PULSE_CAP - s.pulse.n);
  s.pulse.n += gainMat(engine, p, "pulse", n, "pulse");
}
// วัตถุดิบตกจากปฏิกิริยา (2–4 ชิ้น ในวงปฏิกิริยา 3×3 / 5×5)
function dropAround(engine, p, at, r) {
  const s = st(p);
  const B = Board(), map = engine.boardMap(), spots = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = B.wx ? B.wx(at.x + dx) : at.x + dx, y = at.y + dy;
    if (!B.inBounds(map, x, y)) continue;
    if (B.isObstacle(map, x, y)) continue;
    spots.push({ x, y });
  }
  if (!spots.length) return;
  const n = rand(2, 4), made = [];
  for (let i = 0; i < n; i++) {
    const t = spots[Math.floor(Math.random() * spots.length)];
    const d = { id: ++s.dropSeq, x: t.x, y: t.y, k: MAT_KEYS[Math.floor(Math.random() * MAT_KEYS.length)], until: roundOf(engine) + DROP_TURNS - 1 };
    s.drops.push(d);
    made.push(d);
  }
  boardFx(engine, { kind: "drop", id: p.id, from: { x: at.x, y: at.y }, drops: made.map((d) => ({ id: d.id, x: d.x, y: d.y, k: d.k })) });
}
// ช่องพลังงานธาตุ: ต้นเทิร์นสุ่ม 2 จุดในระยะ 4 รอบตัว (ไม่ใช่ช่องที่ยืน · ไม่ใช่สิ่งกีดขวาง)
function rollNodes(engine, p) {
  const s = st(p);
  s.nodes = [];
  if (!p.pos || !passiveOn(p)) return;
  const B = Board(), map = engine.boardMap(), box = { x: p.pos.x, y: p.pos.y, size: engine.sizeOf(p) }, spots = [];
  for (let dy = -NODE_RANGE - 2; dy <= NODE_RANGE + 2; dy++) for (let dx = -NODE_RANGE - 2; dx <= NODE_RANGE + 2; dx++) {
    const x = B.wx ? B.wx(p.pos.x + dx) : p.pos.x + dx, y = p.pos.y + dy;
    if (!B.inBounds(map, x, y)) continue;
    const d = B.dist(box, { x, y, size: 1 });
    if (d < 1 || d > NODE_RANGE) continue;
    if (!engine.tileFree(x, y, p.id)) continue;
    spots.push({ x, y });
  }
  for (let i = 0; i < NODE_COUNT && spots.length; i++) s.nodes.push(spots.splice(Math.floor(Math.random() * spots.length), 1)[0]);
}

// ---------- ปรุงยา ----------
//  form = "brew:<ref>,<ref>,<ref>" (ref = c0–c5 / s0–s5 / m0–m5 · ช่องเดียวกันซ้ำได้ถ้ามีพอ)
function parseBrew(s, form) {
  const m = /^brew:([csm][0-5]),([csm][0-5]),([csm][0-5])$/.exec(String(form || ""));
  if (!m) return null;
  const refs = [m[1], m[2], m[3]];
  const need = {};
  for (const r of refs) need[r] = (need[r] || 0) + 1;
  for (const [r, n] of Object.entries(need)) { const x = slotAt(s, r); if (!x || x.n < n) return null; }
  const tokens = refs.map((r) => (r[0] === "m" ? slotAt(s, r).k : `p:${slotAt(s, r).k}`));
  return { refs, tokens, out: RECIPE_BY_SIG[sig(tokens)] || null };
}
function brew(engine, p, b) {
  const s = st(p);
  if (b.out) {
    const free = roll(FREE_BREW);
    if (!free) for (const r of b.refs) takeAt(s, r);
    const ok = addPotion(s, b.out);
    s.streak++;
    const regen = s.streak % STREAK === 0;
    if (regen) Status.applySpRegen(p, STREAK_REGEN);
    sound(p, SFX.brew);
    voice(p, "brew");
    markFx(p, { kind: "brew", potion: b.out, free, lost: !ok, regen });
    engine.log(`⚗️ ${p.name} ปรุง${POTIONS[b.out].name}สำเร็จ${free ? " (ไม่เสียวัตถุดิบ)" : ""}${ok ? "" : " — กระเป๋าเต็ม ยาหาย"}${regen ? ` · ฟื้นพลัง ${STREAK_REGEN} ขั้น` : ""}`);
    return;
  }
  // ผิดสูตร: เสีย 2 ใน 3 (สุ่ม) + ระเบิด 3×3 + จบตา (endsTurn)
  const lose = [...b.refs].sort(() => Math.random() - 0.5).slice(0, 2);
  for (const r of lose) takeAt(s, r);
  s.streak = 0;
  sound(p, SFX.fail);
  markFx(p, { kind: "fail" });
  explode(engine, p);
}
function explode(engine, p) {
  if (!p.pos) return;
  const tiles = boxTiles(engine, p.pos.x, p.pos.y, 3);
  const hit = unitsOn(engine, tiles).filter((u) => u.id !== p.id && foe(engine, p, u));
  const lines = [];
  boardFx(engine, { kind: "boom", id: p.id, at: { ...p.pos }, tiles });
  const Ice = engine.ice;
  const ctx = Ice.begin();
  engine.withEffectSource(p, () => {
    for (const u of hit) {
      if (!u.alive || engine.skillDodge(p, u, " ระเบิดหม้อยา")) continue;
      engine.dealMixed(u, 1);
      lines.push(u.name);
      if (u.alive && u.hp <= 0) engine.instantDeath(u);
      if (!u.alive) { u.pos = null; continue; }
      const dir = { x: Math.sign(u.pos.x - p.pos.x), y: Math.sign(u.pos.y - p.pos.y) };
      if (dir.x || dir.y) Ice.pushUnit(u, dir, ctx, 2);
    }
  });
  Ice.flush(ctx);
  engine.withEffectSource(null, () => engine.dealMixed(p, 1)); // ตัวเองโดนด้วย
  if (p.alive && p.hp <= 0) engine.instantDeath(p);
  engine.log(`💥 ${p.name} ปรุงยาผิดสูตร — หม้อระเบิด!${lines.length ? ` โดน ${lines.join(", ")}` : ""}`);
}

// ---------- เรียงกระเป๋า ----------
//  arrangement = "c:k.n|…(6)/s:…/m:…" → ต้องเป็นของชุดเดิม (จำนวนรวมต่อชนิดเท่าเดิม · ยาอยู่แถว c/s · วัตถุดิบอยู่แถว m · ไม่เกินช่องละ 5/15)
function parseArrange(str) {
  const m = /^c:([^/]*)\/s:([^/]*)\/m:([^/]*)$/.exec(String(str || ""));
  if (!m) return null;
  const row = (t) => {
    const cells = t.split("|");
    if (cells.length !== ROW) return null;
    return cells.map((c) => {
      if (!c) return null;
      const mm = /^([a-z]+)\.(\d{1,2})$/.exec(c);
      return mm ? { k: mm[1], n: Number(mm[2]) } : undefined;
    });
  };
  const c = row(m[1]), s = row(m[2]), mt = row(m[3]);
  if (!c || !s || !mt || [...c, ...s, ...mt].some((x) => x === undefined)) return null;
  return { call: c, store: s, mats: mt };
}
function tally(list) { const t = {}; for (const x of list) if (x) t[x.k] = (t[x.k] || 0) + x.n; return t; }
const sameTally = (a, b) => { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every((k2) => a[k2] === b[k2]); };
function sortBag(engine, p, str) {
  const s = st(p);
  if (roundOf(engine) < s.sortReady) return false;
  const a = parseArrange(str);
  if (!a) return false;
  const pots = [...a.call, ...a.store], mats = a.mats;
  if (pots.some((x) => x && (!POTIONS[x.k] || x.n < 1 || x.n > POT_STACK))) return false;
  if (mats.some((x) => x && (!MATS[x.k] || x.n < 1 || x.n > MAT_STACK))) return false;
  if (!sameTally(tally(pots), tally([...s.call, ...s.store])) || !sameTally(tally(mats), tally(s.mats))) return false;
  const changed = JSON.stringify([s.call, s.store, s.mats]) !== JSON.stringify([a.call, a.store, a.mats]);
  s.call = a.call; s.store = a.store; s.mats = a.mats;
  if (changed) {
    s.cursor = 0;
    s.sortReady = roundOf(engine) + 1 + SORT_CD;
  }
  return true;
}

// ---------- ดื่ม / มอบให้ ----------
function drinkSelf(engine, p, k2, tile) {
  if (k2 === "warp") {
    if (!tile || !p.pos || engine.sizeOf(p) > 1) return false;
    const d = Math.abs(tile.x - p.pos.x) + Math.abs(tile.y - p.pos.y);
    if (d < 1 || d > 4 || !engine.tileFree(tile.x, tile.y, p.id)) return false;
    if (engine.action && engine.actorId === p.id) engine.rebaseMove(p);
    teleport(engine, p, tile);
    if (engine.action && engine.actorId === p.id && engine.action.moved === false) engine.action.from = { ...p.pos };
    return true;
  }
  st(p).reacted = false;
  engine.withEffectSource(p, () => potionOn(engine, p, p, k2, "drink"));
  return true;
}
function doDrink(engine, p, ref, tile) {
  if (!engine.canAct(p)) return false;
  const s = st(p);
  const x = slotAt(s, ref);
  if (!x || ref[0] === "m") return false;
  const k2 = x.k;
  if (!drinkSelf(engine, p, k2, tile)) return false;
  takeAt(s, ref);
  boardFx(engine, { kind: "drink", id: p.id, at: p.pos ? { ...p.pos } : null, potion: k2, rgb: POTIONS[k2].rgb });
  engine.log(`🍶 ${p.name} ดื่ม${POTIONS[k2].name}`);
  afterOwnAction(engine, p);
  if (!p.alive) p.pos = null;
  engine.broadcastState();
  return true;
}
function doGive(engine, p, ref, mateId) {
  if (!engine.canAct(p)) return false;
  const shop = require("../server/shop");
  const m = shop.tradeMate(p, mateId);
  const s = st(p);
  const x = slotAt(s, ref);
  if (!m || !x || ref[0] === "m" || engine.bagFull(m)) return false;
  m.inventory = m.inventory || [];
  m.inventory.push({ uid: `ophy_${p.id}_${++s.fxSeq}_${Date.now()}`, type: "ophyPotion", potion: x.k, price: 0 });
  takeAt(s, ref);
  engine.log(`🎁 ${p.name} ให้ ${POTIONS[x.k].name} กับ ${m.name}`);
  engine.broadcastState();
  return true;
}
// ไอเทม "ophyPotion" ในกระเป๋าทั่วไป (ใครก็ได้ดื่ม — server/shop.js useInventoryItem) → true = ดื่มแล้ว
function drinkItem(engine, p, item, opts = {}) {
  if (!item || !POTIONS[item.potion]) return false;
  return engine.withEffectSource(p, () => drinkSelf(engine, p, item.potion, opts.tile || null)) !== false;
}

// ---------- จดสูตร (ปากกา/กระดาษในหน้ากระเป๋า) ----------
function setNote(p, str) {
  const s = st(p);
  if (!str) { s.note = null; return true; }
  const tokens = String(str).split(",");
  if (tokens.length !== 3 || tokens.some((t) => !(MATS[t] || (/^p:[a-z]+$/.test(t) && POTIONS[t.slice(2)])))) return false;
  s.note = tokens;
  return true;
}

module.exports = {
  id: ID,
  IMG, MATS, POTIONS, RECIPES, CAP, POT_STACK, MAT_STACK, START_BASE, THROW_RANGE, REACT_MOVE, DROP_ENERGY,
  isOphy, potImg, nextShot, queueOf, addPotion, addMat, potionTotal, potionCount, parseBrew, throwTiles, throwState, flushCounters,
  potionName: (k2) => (POTIONS[k2] ? POTIONS[k2].name : "น้ำยา"),
  drinkItem,
  // โซ่ Soul Chain (server/soulChain.js ACTIONS): ดื่มน้ำยาวาร์ป = สกิลเคลื่อนที่
  drinkMoves(p, key) {
    const m = /^ophy:drink:([cs][0-5])$/.exec(String(key || ""));
    const x = m && isOphy(p) ? slotAt(st(p), m[1]) : null;
    return !!x && x.k === "warp";
  },

  resetCombat(p) { if (isOphy(p)) p.ophy = fresh(); },
  maxHp(p) { return isOphy(p) ? HP : undefined; },
  maxArmor(p, base) { return isOphy(p) ? ARMOR : base; },

  voiceLines(p) {
    if (!isOphy(p)) return null;
    return { turn: ["ophy_hey", "ophy_hoho"], brew: SFX.voiceBrew, kill: ["ophy_bye"], throw: ["ophy_atk1", "ophy_atk2"] };
  },
  onKill(engine, killer) { if (isOphy(killer)) voice(killer, "kill"); },

  // ---------- สกิล ----------
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isOphy(p)) return true;
    const s = st(p), r = roundOf(engine);
    if (tier === "basic") return !!parseBrew(s, opts.form);
    if (tier === "secondary") return r >= s.lockReady && !s.lockIn;
    if (tier === "ultimate") return r >= s.ultReady && s.throwRound !== r && s.lockRound !== r && !calcOn(engine, p);
    return false;
  },
  // ปรุงยา: ไม่กินโควตา · ไม่ล็อกการเดิน · ผิดสูตร = จบตา
  skipsTurnQuota(p, tier) { return isOphy(p) && tier === "basic"; },
  ignoresTurnQuota(p, tier) { return isOphy(p) && tier === "basic"; },
  keepsMove(engine, p, tier) { return isOphy(p) && tier === "basic"; },
  endsTurn(engine, p, tier, opts = {}) {
    if (!isOphy(p) || tier !== "basic") return false;
    const b = parseBrew(st(p), opts.form);
    return !!b && !b.out;
  },
  silentFlash(p, tier) { return isOphy(p) && tier === "basic"; },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isOphy(p)) return "";
    const s = st(p), r = roundOf(engine);
    crystalRoll(engine, p);
    if (tier === "basic") {
      const b = parseBrew(s, opts.form);
      if (b) brew(engine, p, b);
      return "";
    }
    if (tier === "secondary") {
      s.lockIn = { round: r, at: engine.severStamp(), hit: false, seen: null };
      s.lockReady = r + 1 + LOCK_CD;
      s.lockRound = r;
      sound(p, SFX.lock);
      engine.log(`🔒 ${p.name} Lock in — ใครเล็งมา โดนขวดยาสวนกลับ!`);
      return "";
    }
    if (tier === "ultimate") {
      s.calc = { round: r, at: engine.severStamp(), n: 0 };
      s.ultReady = r + 1 + ULT_CD;
      sound(p, SFX.calc);
      engine.log(`🧮 ${p.name} calculated — ยิงยาต่อเนื่องได้ตลอดตานี้`);
      return "";
    }
    return "";
  },
  skillSound(p) {
    if (!isOphy(p) || !p.ophy) return null;
    const k2 = p.ophy.sound;
    p.ophy.sound = null;
    return k2;
  },
  skillLocks(engine, p) {
    if (!isOphy(p)) return null;
    const s = st(p), r = roundOf(engine);
    return {
      secondary: { cd: Math.max(0, s.lockReady - r), locked: !!s.lockIn || r < s.lockReady },
      ultimate: { cd: Math.max(0, s.ultReady - r), locked: r < s.ultReady || s.throwRound === r || s.lockRound === r || calcOn(engine, p) },
    };
  },

  // ---------- ปุ่มยิงยา + คำสั่งจากกระเป๋า ----------
  hudActions(engine, p) {
    if (!isOphy(p) || !p.alive) return [];
    const s = st(p);
    const shot = nextShot(s);
    const ts = throwState(engine, p);
    const out = [{
      key: "ophy:throw", icon: "🧪", name: "ยิงยา", img: shot ? potImg(shot.k) : potImg("base"), square: THROW_SIZE,
      tiles: ts.ok && engine.canAct(p) ? throwTiles(engine, p) : [], disabled: !ts.ok, cost: ts.cost || undefined,
    }];
    return out;
  },
  charAction(engine, p, key, { tile } = {}) {
    if (!isOphy(p)) return false;
    const parts = String(key).split(":");
    if (parts[0] !== "ophy") return false;
    const cmd = parts[1];
    if (cmd === "throw") return doThrow(engine, p, tile);
    if (cmd === "drink") return doDrink(engine, p, parts[2], tile);
    if (cmd === "give") return doGive(engine, p, parts[2], parts[3]);
    if (!engine.canAct(p)) return false;
    let ok = false;
    if (cmd === "sort") ok = sortBag(engine, p, parts.slice(2).join(":"));
    else if (cmd === "note") ok = setNote(p, parts.slice(2).join(":"));
    if (ok) engine.broadcastState();
    return ok;
  },

  // ---------- ติดตัว 1 ----------
  reactionShift(p) { return passiveOn(p) ? -1 : 0; },
  dotShrug(engine, p, kind) {
    if (!passiveOn(p) || !roll(DOT_SHRUG)) return false;
    const label = { burn: "ลุกไหม้", frost: "น้ำแข็งกัด", poison: "พิษร้าย", shock: "ช็อต" }[kind] || kind;
    engine.log(`🧪 ${p.name} ไม่ได้รับผลจาก${label}`);
    return true;
  },
  afterReaction(engine, t, info) {
    const src = info && info.source;
    if (!passiveOn(src) || !t) return;
    const s = st(src);
    s.reacted = true;
    const at = t.pos || (info && info.at) || src.pos;
    if (at) dropAround(engine, src, at, s.wide ? 2 : 1);
  },

  // ---------- เดิน: เก็บของ / นับก้าว (ย้อนได้) ----------
  afterWalk(engine, p, tiles) {
    if (!isOphy(p) || !Array.isArray(tiles) || !tiles.length) return [];
    const s = st(p);
    const snap = { mats: JSON.stringify(s.mats), drops: s.drops.slice(), nodes: s.nodes.slice(), sp: p.skillPoints, walk: s.walkNow };
    s.walkNow = Math.max(0, tiles.length - 1);
    if (passiveOn(p)) {
      const B = Board();
      const keys = new Set(tiles.flatMap((t) => B.footprint(t.x, t.y, engine.sizeOf(p)).map((c) => `${c.x},${c.y}`)));
      const got = {}, gotDrops = [];
      s.drops = s.drops.filter((d) => {
        if (!keys.has(`${d.x},${d.y}`)) return true;
        if (addMat(s, d.k, 1)) { got[d.k] = (got[d.k] || 0) + 1; gotDrops.push(d.id); engine.addSkill(p, DROP_ENERGY, "passive"); }
        return false;
      });
      s.nodes = s.nodes.filter((n) => {
        if (!keys.has(`${n.x},${n.y}`)) return true;
        if (addMat(s, "orb", 1)) got.orb = (got.orb || 0) + 1;
        return false;
      });
      if (Object.keys(got).length) { markFx(p, { kind: "gain", mats: got, drops: gotDrops }); boardFx(engine, { kind: "pick", id: p.id, drops: gotDrops }); }
    }
    return [{ undo() { s.mats = JSON.parse(snap.mats); s.drops = snap.drops; s.nodes = snap.nodes; p.skillPoints = snap.sp; s.walkNow = snap.walk; } }];
  },
  // จบตา: ก้าวที่เดินจริง → สมุนไพร (ทุก 3 ก้าว 85% ได้ 1–2) · ท่าไม้ตายหมด
  onActorEnd(engine, p) {
    if (!isOphy(p)) return;
    const s = st(p);
    if (s.calc && s.calc.round === roundOf(engine)) s.calc = null;
    const total = s.walkCarry + s.walkNow;
    s.walkNow = 0;
    if (!passiveOn(p)) { s.walkCarry = total; return; }
    let gotHerb = 0;
    for (let i = 0; i < Math.floor(total / 3); i++) if (roll(85)) gotHerb += addMat(s, "herb", rand(1, 2));
    s.walkCarry = total % 3;
    if (gotHerb) { markFx(p, { kind: "gain", mats: { herb: gotHerb } }); engine.log(`🌿 ${p.name} เก็บสมุนไพรระหว่างทาง ×${gotHerb}`); }
  },
  onActorStart(engine, p) {
    if (!isOphy(p)) return;
    const s = st(p);
    if (s.lockIn && s.lockIn.round < roundOf(engine)) endLockIn(engine, p);
  },
  // ต้นเทิร์น: ช่องพลังงานธาตุใหม่ 2 จุด
  onRoundStartTick(engine, p) { if (isOphy(p)) rollNodes(engine, p); },
  // เปิดไพ่แล้ว (ต้นลำดับเดิน): ไพ่สีของเทิร์นนี้ → วัตถุดิบ
  onOrderBegin(engine) {
    for (const p of Object.values(engine.players)) {
      if (!passiveOn(p) || !p.alive) continue;
      const cards = Array.isArray(p.cards) ? p.cards : [];
      if (!cards.length) continue;
      const count = (c) => cards.filter((x) => x && x.color === c).length;
      const got = {};
      const add = (m, n) => { const g = addMat(st(p), m, n); if (g) got[m] = (got[m] || 0) + g; };
      for (let i = 0; i < Math.floor(count("green") / 2); i++) add("herb", 1);
      for (let i = 0; i < Math.floor(count("blue") / 2); i++) add("orb", rand(1, 2));
      for (let i = 0; i < Math.floor(count("yellow") / 2); i++) add("crystal", rand(1, 2));
      if (roll(85)) add(engine.bustedOf(p) ? "spirit" : "water", rand(1, 2));
      if (Object.keys(got).length) {
        markFx(p, { kind: "gain", mats: got });
        engine.log(`🎴 ${p.name} ได้วัตถุดิบจากไพ่ ${Object.entries(got).map(([m, c]) => `${MATS[m].icon}×${c}`).join(" ")}`);
      }
    }
  },
  onEndTurn(engine) {
    const r = roundOf(engine);
    for (const p of Object.values(engine.players)) {
      if (!isOphy(p) || !p.ophy) continue;
      const s = p.ophy;
      s.drops = s.drops.filter((d) => d.until > r);
      if (s.lockIn && s.lockIn.round < r - 1) endLockIn(engine, p); // กันค้าง (ถูกข้ามตาเดิน)
      if (s.calc && s.calc.round < r) s.calc = null;
    }
  },
  onDeath(engine, p) { if (isOphy(p) && p.ophy) { p.ophy.lockIn = null; p.ophy.calc = null; p.ophy.nodes = []; p.ophy.counterQ = []; } },

  // ---------- ความเสียหาย: Lock in / แก่นชีพจร ----------
  onAttacked(engine, p, attacker) {
    if (!lockOn(p) || !attacker || !attacker.alive) return;
    queueCounter(engine, p, attacker);
  },
  onDamageTaken(engine, p) {
    if (!isOphy(p)) return;
    if (p.ophy && p.ophy.lockIn) p.ophy.lockIn.hit = true;
    if (passiveOn(p)) pulseRoll(engine, p);
  },
  onDamageDealt(engine, src, victim) {
    if (!passiveOn(src) || !victim || victim.id === src.id) return;
    const s = st(src);
    const key = `${victim.id}:${engine.cmdSeq || 0}:${engine.commandSeq || 0}`;
    s.pulseSeen = s.pulseSeen || [];
    if (s.pulseSeen.includes(key)) return;
    s.pulseSeen.push(key);
    if (s.pulseSeen.length > 24) s.pulseSeen.shift();
    pulseRoll(engine, src);
  },

  severables(engine, p) {
    if (!isOphy(p) || !p.ophy) return [];
    const s = p.ophy, out = [];
    if (s.lockIn) out.push({ key: "ophyLockIn", label: "Lock in", at: s.lockIn.at || 0, cancel() { s.lockIn = null; } });
    if (s.calc && s.calc.round === roundOf(engine)) out.push({ key: "ophyCalc", label: "calculated", at: s.calc.at || 0, cancel() { s.calc = null; } });
    return out;
  },

  // ---------- ข้อมูลให้ client (players[].ophy) ----------
  //  ทุกคนเห็น: ยา 4 ขวดถัดไป · วัตถุดิบที่ตก · ช่องพลังงาน · Lock in/calculated · เจ้าตัวเห็นกระเป๋าทั้งใบ
  ophyState(engine, p, mine) {
    if (!isOphy(p) || !p.ophy) return undefined;
    const s = p.ophy, r = roundOf(engine);
    const pub = {
      queue: queueOf(s),
      drops: s.drops.map((d) => ({ id: d.id, x: d.x, y: d.y, k: d.k, left: Math.max(1, d.until - r + 1) })),
      nodes: s.nodes.map((n) => ({ x: n.x, y: n.y })),
      lockIn: !!s.lockIn || undefined,
      calc: calcOn(engine, p) || undefined,
    };
    if (!mine) return pub;
    const ts = throwState(engine, p);
    return {
      ...pub,
      call: s.call, store: s.store, mats: s.mats, cursor: s.cursor,
      total: potionTotal(s), cap: CAP,
      sortCd: Math.max(0, s.sortReady - r), streak: s.streak % STREAK,
      note: s.note, fx: s.fx,
      canThrow: ts.ok, throwCost: ts.cost || 0,
    };
  },
};
