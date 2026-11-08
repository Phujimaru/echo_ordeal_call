// ============================================================
//  Roland (Black Silence) — ยาก · unique · id "roland"
//  สเปกผู้ใช้ C:\Users\LOQ\Downloads\Roland.txt · กติกาที่ตัดสินแล้ว GRID_PLAN §7.25 · ระบบกลาง GAME_SYSTEM §43
//
//  พลังชีวิต 6 / เกราะ 4 · แต้มสกิล 0/5 · เดิน 4 · พลังโจมตี 0 · ตีปกติประชิด
//  Black Silence (ติดตัว): ไอเทมเติมแต้มสกิลไม่ได้ · เริ่มเกมได้การ์ดอาวุธ 3 ใบ · ต้นเทิร์นจั่ว 1 ใบ · การ์ดในมือไม่หมดอายุ (ผู้ใช้ปรับ 2026-11-05)
//    จั่วเลือกแบบที่ยังไม่ได้ใช้ในรอบ Furioso นี้ก่อน · สร้างความเสียหายครบ 4 ครั้ง = Emotion +1 + แต้มสกิล +1 + พลังชีวิต +1 (นับทีละฮิต · ตีสวน/ตีปกติด้วย)
//    ใช้การ์ดแบบที่ยังไม่เคยใช้ = Furioso charge +1 (ครบ 9 แบบ = ท่าไม้ตายพร้อม · ใช้แล้วนับใหม่)
//  BS Page (พื้นฐาน): เลือกการ์ดในมือ (เก็บได้มากสุด 6 ใบ · จั่วเกินไม่ได้) · 2 ครั้งต่อเทิร์น · ไม่กินโควตา · ใช้ได้แม้ติดห้ามสกิล (ฮุค ignoresNoSkill)
//    ดาเมจการ์ด = ค่าบนการ์ด + พลังโจมตี/เสริมพลัง (attack.skillStrike opts.bonus) · ไม่จบตา · เดินต่อไม่ได้
//  Emotion skill (รอง): คูลดาวน์รวม 5 เทิร์น + คูลดาวน์ของแต่ละแบบ · ใช้แล้วหัก Emotion · บัฟ 3 เทิร์น
//  Furioso (ท่าไม้ตาย · คูลดาวน์ 4 เทิร์น): แนว 4×1 พุ่งชนศัตรูคนแรก · คลิปลงเมื่อไม่หลบ (เสียงคลิกงดตามกฎห้ามเสียงซ้อนวีดีโอ)
//
//  ผู้ใช้ตัดสิน 2026-11-08: การ์ดรอบตัว = ประชิด 4 ทิศ · Logic แนว 3×1 โดนศัตรูคนแรก · Crystal สวนกลับกรอบ 3×3 จนจบเทิร์น · มือเกิน 6 ใบ = ใบที่เกินไม่ได้
//  Claude ตัดสินเอง (GRID_PLAN §7.25): ดาเมจลงเกราะนับว่าสร้างความเสียหาย · Crystal ไม่มีเป้า = พุ่งสุดแนว (ตีปกติเท่านั้นที่โดนสวน) ·
//    Fervent Beats เลือดเหลือ 1 แทนการตาย · ถูกตัดบัฟ = ตายเหมือนหมดเวลา · เศษน้ำแข็งค้างบนเป้าหลังบัฟหมด
// ============================================================

const ID = "roland";
const DIR = "/characters/roland";
const IMG = {
  base: `${DIR}/roland.webp`, page: `${DIR}/bs_page.webp`, ego: `${DIR}/ego_page.webp`, furioso: `${DIR}/furioso.webp`,
  card: (k) => `${DIR}/cards/${k}.webp`,
  buff: (k) => `${DIR}/ego_${k}.webp`,
};
const VIDEO = { furioso: `${DIR}/furioso.mp4` };
const CUT = { furioso: "rolandFurioso" };
const FX = "rolandFx"; // socket event (client/src/board/rolandFx.js)
const SFX = {
  click: "roland_click", emotion: "roland_emotion", ready: "roland_ready", shard: "roland_shard", shatter: "roland_shatter",
  heart: "roland_heart", death: "roland_death", atk: (k) => `roland_atk_${k}`,
};
const HP = 6, ARMOR = 4, MAX_SKILL = 5, MOV = 4;
const START_CARDS = 3, HAND_MAX = 6, PAGES_PER_TURN = 2, EMOTION_MAX = 5, HITS_PER_EMOTION = 4, CARD_KINDS = 9;
const EGO_SHARED_CD = 5, EGO_TURNS = 3, FERVENT_ATK = 3, SCARS_REDUCE = 1, SCARS_PCT = 20, SHARD_MAX = 5, SHARD_DMG = 1;
const LIES_MAX = 4, OLD_BOYS_SP = 2, MOOK_SP = 3, COUNTER_RING = 1, COUNTER_DMG = 1; // สวนกลับ: กรอบ 3×3 รอบตัว (ห่างไม่เกิน 1 ทั้งแกน x และ y)
const FURIOSO = { cost: 3, cd: 4, len: 4, dmg: 4, bleed: 2, fragile: 1, fragileTurns: 2 };
const SHARD = "rolandIce";      // สแตกบนเป้า (ไม่ลดเทิร์น — NO_TICK_STATUS)
const CRYSTAL = "rolandCrystal"; // ป้ายหลบ + สวนกลับ (ลดเองตอนจบเทิร์น)
// server พัก (skillBeat) ให้ภาพง้าง + เสียงคลิกจบหัวก่อนผลลง · ตรงกับ ROLAND_FX ใน rolandFx.js
const BEAT = { swing: 0.45, dashStep: 0.09, after: 0.4 };

const near = { kind: "target", range: 1, hostile: true };
const line2 = { kind: "line", len: 2, width: 1, hostile: true };
const CARDS = {
  allas: { name: "Allas Workshop", cost: 2, area: near, desc: "1 คนรอบตัว · ดาเมจ 1 · อ่อนแอ 1 ในเทิร์นถัดไป" },
  zelkova: { name: "Zelkova Workshop", cost: 0, area: near, desc: "1 คนรอบตัว · ดาเมจ 1 · ต้นเทิร์นถัดไปจั่วเพิ่ม 1 ใบ" },
  oldboys: { name: "Old Boys Workshop", cost: 1, area: line2, desc: "เลือกทิศ แนว 2×1 ทุกคน · ดาเมจ 1 · เกราะ +1 · ต้นเทิร์นถัดไปจั่วเพิ่ม 1 ใบ · สร้างความเสียหายได้ในเทิร์นถัดไป แต้มสกิล +2 (ครั้งเดียว)" },
  mook: { name: "Mook Workshop", cost: 2, area: line2, desc: "เลือกทิศ แนว 2×1 ทุกคน · ดาเมจ 1 + ทะลุเกราะ 1 · ต้นเทิร์นถัดไปจั่วเพิ่ม 1 ใบ · สร้างความเสียหายได้ แต้มสกิล +3" },
  ranga: { name: "Ranga Workshop", cost: 0, area: near, desc: "1 คนรอบตัว · ดาเมจ 1 · เลือดไหล 1" },
  wheels: { name: "Wheels Industry", cost: 4, area: line2, desc: "เลือกทิศ แนว 2×1 ทุกคน · ดาเมจ 1 · คนใกล้สุดสตั้น 1 เทิร์น · เกราะ +1" },
  crystal: { name: "Crystal Atelier", cost: 3, area: { kind: "line", len: 3, width: 1, hostile: true }, desc: "เลือกทิศ แนว 3×1 พุ่งหาคนแรก · ดาเมจ 1 สองครั้ง · ไม่มีเป้าก็ใช้ได้ · หลบหลีก 1 ครั้ง · ถูกตีปกติสวนกลับรอบตัว 3×3 ดาเมจ 1 (จนจบเทิร์น)" },
  logic: { name: "Atelier Logic", cost: 2, area: { kind: "line", len: 3, width: 1, hostile: true }, desc: "เลือกทิศ แนว 3×1 ศัตรูคนแรก · ดาเมจ 2 · เป้าประชิดถูกผลัก 1 ช่อง" },
  durandal: { name: "Durandal", cost: 2, area: near, desc: "1 คนรอบตัว · ดาเมจ 1 สองครั้ง" },
};
const CARD_KEYS = Object.keys(CARDS);
const EGO = {
  fervent: { name: "Fervent Beats", cost: 3, emotion: 5, cd: 999, status: "rolandFervent", desc: "3 เทิร์น: พลังโจมตีพื้นฐาน +3 · อมตะ · บัฟหมดลงตายทันที" },
  urging: { name: "Urging", cost: 3, emotion: 1, cd: 9, status: "rolandUrging", desc: "3 เทิร์น: พลังชีวิตสูงสุด +1 · ระยะเดิน +1 · ฟื้นพลังชีวิต 1" },
  scars: { name: "Scars", cost: 2, emotion: 3, cd: 9, status: "rolandScars", desc: "3 เทิร์น: ความเสียหายที่ได้รับ −1 · ถูกโจมตี 20% ไม่เสียหาย" },
  kiss: { name: "A Kiss", cost: 2, emotion: 3, cd: 9, status: "rolandKiss", desc: "3 เทิร์น: สร้างความเสียหาย = เศษน้ำแข็ง 1 ชิ้น · ครบ 5 ชิ้น สตั้นเทิร์นถัดไป + ดาเมจ 1" },
  lies: { name: "Lies", cost: 2, emotion: 2, cd: 9, status: "rolandLies", desc: "3 เทิร์น: ราคาการ์ดอาวุธสุ่มใหม่ 0–4 ทุกเทิร์น" },
};
const EGO_KEYS = Object.keys(EGO);

const isRoland = (p) => !!p && p.characterId === ID && !p.summon;
function eng() { return require("../server/engine").engine; }
const Board = () => require("../server/board");
const LINE = () => Board().LINE_DIRS;
function fresh() {
  return {
    started: false, seq: 0, hand: [], used: [], bonusDraw: 0, pageRound: 0, pages: 0,
    hits: 0, emotion: 0, ultReady: 0, egoReady: 0, own: {}, ego: null, egoAt: 0, lies: null,
    oldBoysRound: 0, crystalAt: 0, crystalDodge: 0, countering: false,
  };
}
function st(p) { return p.roland || (p.roland = fresh()); }
const egoOn = (p, k) => isRoland(p) && st(p).ego === k && ((p.statuses[EGO[k].status] || 0) > 0);
const crystalOn = (p) => isRoland(p) && ((p.statuses[CRYSTAL] || 0) > 0);
const chargeOf = (s) => s.used.length;
const cdLeft = (ready, r) => Math.max(0, (ready || 0) - r);
const vit = (t) => (t.hp || 0) + (t.armor || 0) + (t.shield || 0) + (t.tempHp || 0);
const nextTurnSpan = (engine, t, n = 1) => n + (engine.hasActed(t.id) ? 1 : 0);
const pagesUsed = (s, r) => (s.pageRound === r ? s.pages : 0);
const cardOf = (s, form) => s.hand.find((c) => c.uid === form) || null;
const costOf = (s, k) => (s.lies ? s.lies[k] : CARDS[k].cost);
// ช่องของ b อยู่ในกรอบรอบตัว a ระยะ n (นับแนวทแยง — กรอบ 3×3 เมื่อ n = 1) · รองรับตัวใหญ่ + กระดานวงรอบ
function inRing(a, b, n) {
  const B = Board(), ba = B.boxOf(a), bb = B.boxOf(b), fa = B.footprint(ba.x, ba.y, ba.size), fb = B.footprint(bb.x, bb.y, bb.size);
  return fa.some((c) => fb.some((d) => Math.abs(B.wdx(c.x, d.x)) <= n && Math.abs(d.y - c.y) <= n));
}
const secretFx = (engine, p, kind) => engine.boardFxTo([p.id], FX, { kind });

function fx(engine, p, kind, extra) {
  engine.boardFx(FX, { kind, id: p.id, color: engine.colorOf(p), ...(p.pos ? { at: { ...p.pos } } : {}), size: engine.sizeOf(p), ...extra });
}

// ---------- มือการ์ด ----------
function drawOne(s) {
  if (s.hand.length >= HAND_MAX) return false;
  const inHand = new Set(s.hand.map((c) => c.k));
  const unused = CARD_KEYS.filter((k) => !s.used.includes(k) && !inHand.has(k));
  const pool = unused.length ? unused : CARD_KEYS;
  s.seq += 1;
  s.hand.push({ uid: `c${s.seq}`, k: pool[Math.floor(Math.random() * pool.length)] });
  return true;
}
function rollLies(s) {
  s.lies = Object.fromEntries(CARD_KEYS.map((k) => [k, Math.floor(Math.random() * (LIES_MAX + 1))]));
}

// ---------- นับการโจมตี / Emotion / Furioso ----------
function gainSp(engine, p, n, why) {
  const before = p.skillPoints || 0;
  engine.addSkill(p, n, "roland");
  if ((p.skillPoints || 0) > before) engine.log(`🎲 ${p.name} ${why} — แต้มสกิล +${(p.skillPoints || 0) - before}`);
}
// สร้างความเสียหายครบ 4 ครั้ง: Emotion +1 · แต้มสกิล +1 · พลังชีวิต +1
function countDamage(engine, p) {
  const s = st(p);
  s.hits += 1;
  if (s.hits < HITS_PER_EMOTION) return;
  s.hits = 0;
  if (s.emotion < EMOTION_MAX) {
    s.emotion += 1;
    fx(engine, p, "emotion", { emotion: s.emotion });
    engine.sfx(SFX.emotion);
    engine.log(`💠 ${p.name} Emotion ${s.emotion}/${EMOTION_MAX}`);
  }
  gainSp(engine, p, 1, "Black Silence");
  engine.healHp(p, 1);
}
function markUsed(engine, p, k) {
  const s = st(p);
  if (s.used.includes(k)) return;
  s.used.push(k);
  if (chargeOf(s) < CARD_KINDS) return;
  fx(engine, p, "ready", {});
  engine.sfx(SFX.ready);
  engine.log(`⚫ ${p.name} Furioso พร้อมใช้`);
}

// ---------- ดาเมจการ์ด ----------
function addShard(engine, p, t) {
  if (!t.alive || !t.statuses) return;
  const n = (t.statuses[SHARD] || 0) + 1;
  if (n < SHARD_MAX) {
    t.statuses[SHARD] = n;
    if (t.pos) fx(engine, p, "shard", { to: { ...t.pos }, n });
    engine.sfx(SFX.shard);
    return;
  }
  delete t.statuses[SHARD];
  const at = t.pos ? { ...t.pos } : null;
  engine.applyDebuff(t, "stun", null, nextTurnSpan(engine, t));
  t.wasAttacked = true;
  engine.withEffectSource(p, () => { engine.dealMixed(t, SHARD_DMG); engine.resolveDamageAftermath(t); });
  if (at) fx(engine, p, "shatter", { to: at });
  engine.sfx(SFX.shatter);
  engine.log(`❄️ ${t.name} เศษน้ำแข็งครบ ${SHARD_MAX} ชิ้น — สตั้น + ดาเมจ ${SHARD_DMG}`);
  if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
}
// สร้างความเสียหายได้ (ไม่นับ 0): Old Boys ที่รอจากเทิร์นก่อน · เศษน้ำแข็ง
function onDealt(engine, p, t) {
  const s = st(p);
  countDamage(engine, p);
  if (s.oldBoysRound && s.oldBoysRound === engine.roundNumber) {
    s.oldBoysRound = 0;
    gainSp(engine, p, OLD_BOYS_SP, CARDS.oldboys.name);
  }
  if (s.ego === "kiss" && egoOn(p, "kiss")) addShard(engine, p, t);
}
// 1 ฮิต → { dealt, dodge } · ex.sure = ด่านหลบผ่านมาแล้ว (Furioso ทอยก่อนคลิป)
function hit(engine, p, t, n, name, ex = {}) {
  if (!p.alive || !t.alive) return { dealt: 0, dodge: false };
  const before = vit(t);
  const r = engine.skillStrike(p, t, name, { bonus: n, sure: !!ex.sure });
  const dealt = Math.max(0, before - vit(t));
  if (dealt > 0) onDealt(engine, p, t);
  return { dealt, dodge: !!r.dodge };
}
function impact(engine, p, k, t, at, res) {
  fx(engine, p, "impact", { weapon: k, targetId: t.id, to: at, dmg: res.dealt, dodge: res.dodge });
}
// ผลัก 1 ช่องทิศ dir → วินาทีของฉากผลัก
function push(engine, p, t, dir) {
  if (!t.alive || !t.pos) return 0;
  const ctx = engine.ice.begin();
  engine.withEffectSource(p, () => engine.ice.pushUnit(t, dir, ctx, 1));
  engine.ice.flush(ctx);
  return engine.ice.fxSeconds(ctx);
}
// พุ่งตามแนว: หยุดหน้าศัตรูคนแรก · ชนสิ่งกีดขวาง/ร้าน/พวกเดียวกัน = ไม่มีเป้า
function planDash(engine, p, dir, len) {
  const passed = [];
  for (const t of engine.chargeTiles(p, dir, len)) {
    if (t.obstacle || t.shop) break;
    const o = t.unitId ? engine.players[t.unitId] : null;
    if (o) return o.alive && !engine.sameTeam(p, o) ? { passed, hit: o, stopAt: t } : { passed, hit: null, stopAt: null };
    passed.push(t);
  }
  return { passed, hit: null, stopAt: null };
}
function dashTo(engine, p, dir, passed) {
  const path = [{ ...p.pos }, ...passed.map((t) => ({ x: t.x, y: t.y }))];
  const land = path[path.length - 1];
  p.pos = { x: land.x, y: land.y };
  if (path.length > 1) engine.setDash({ id: p.id, path, dir: { x: LINE()[dir][0], y: LINE()[dir][1] }, style: "roland" });
  return (path.length - 1) * BEAT.dashStep;
}

// ---------- การ์ดแต่ละใบ ----------
const foes = (engine, p, targets) => (targets || []).map((id) => engine.players[id]).filter((t) => t && t.alive && !engine.sameTeam(p, t));
const single = (engine, p, targets) => foes(engine, p, targets)[0] || null;
// Atelier Logic: ศัตรูคนแรกในแนว (ใกล้ตัวสุด)
const firstFoe = (engine, p, targets) => foes(engine, p, targets).sort((a, b) => Board().dist(Board().boxOf(p), Board().boxOf(a)) - Board().dist(Board().boxOf(p), Board().boxOf(b)))[0] || null;
const sweeps = (k) => k === "wheels" || k === "oldboys" || k === "mook"; // แนว 2×1 โดนทุกคนในแนว
// Mook: ทะลุเกราะ 1 → ดาเมจที่ลงจริง
function pierceHit(engine, t) {
  const before = vit(t);
  engine.dealDirect(t, 1);
  engine.resolveDamageAftermath(t);
  const dealt = Math.max(0, before - vit(t));
  if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
  return dealt;
}
function playCard(engine, p, card, targets, opts) {
  const s = st(p), k = card.k, c = CARDS[k], r = engine.roundNumber;
  s.hand = s.hand.filter((x) => x.uid !== card.uid);
  if (s.pageRound !== r) { s.pageRound = r; s.pages = 0; }
  s.pages += 1;
  markUsed(engine, p, k);
  const swing = (extra) => fx(engine, p, "swing", { weapon: k, ...extra });
  const beat = (sec, fn) => engine.skillBeat(sec, () => engine.withEffectSource(p, () => {
    if (!p.alive) return;
    engine.sfx(SFX.atk(k));
    fn();
  }));
  if (sweeps(k)) {
    const hitList = foes(engine, p, targets);
    const dist = (t) => Board().dist(Board().boxOf(p), Board().boxOf(t));
    const closest = [...hitList].sort((a, b) => dist(a) - dist(b))[0];
    swing({ dir: opts.dir, to: closest && closest.pos ? { ...closest.pos } : null });
    beat(BEAT.swing, () => {
      let dealt = 0;
      for (const t of hitList) {
        if (!t.alive) continue;
        const at = t.pos ? { ...t.pos } : null;
        const res = hit(engine, p, t, 1, c.name);
        if (k === "mook" && !res.dodge && t.alive) res.dealt += pierceHit(engine, t);
        dealt += res.dealt;
        if (at) impact(engine, p, k, t, at, res);
        if (k === "wheels" && t === closest && !res.dodge && t.alive) engine.applyDebuff(t, "stun", null, nextTurnSpan(engine, t));
      }
      if (k !== "wheels") s.bonusDraw += 1;
      if (k === "mook" && dealt > 0) gainSp(engine, p, MOOK_SP, c.name);
      if (k === "oldboys") s.oldBoysRound = r + 1;
      if (k !== "mook") engine.healArmor(p, 1);
      engine.skillBeat(BEAT.after, () => {});
    });
    return;
  }
  if (k === "crystal") {
    const plan = planDash(engine, p, opts.dir, c.area.len);
    p.statuses[CRYSTAL] = 1;
    s.crystalDodge = 1;
    s.crystalAt = engine.severStamp();
    const from = { ...p.pos };
    const dash = dashTo(engine, p, opts.dir, plan.passed);
    const t = plan.hit;
    const [ddx, ddy] = LINE()[opts.dir];
    const end = plan.stopAt || plan.passed[plan.passed.length - 1] || from;
    swing({ dir: opts.dir, to: t ? { x: end.x, y: end.y } : { x: Board().wx(end.x + ddx), y: end.y + ddy } }); // ไม่มีเป้า = ฟันไปข้างหน้า
    if (!t) { // ไม่มีเป้า: พุ่งสุดแนว (ชนสิ่งกีดขวาง/พวกเดียวกันหยุด) · ได้หลบ + สวนกลับ
      require("../server/skills").hitArea(p, plan.passed, []);
      engine.skillBeat(BEAT.swing + dash + BEAT.after, () => {});
      return;
    }
    beat(BEAT.swing + dash, () => {
      require("../server/skills").hitArea(p, [...plan.passed, plan.stopAt], [t.id]);
      const at = t.pos ? { ...t.pos } : null;
      const a = hit(engine, p, t, 1, c.name);
      const b = hit(engine, p, t, 1, c.name);
      if (at) impact(engine, p, k, t, at, { dealt: a.dealt + b.dealt, dodge: a.dodge && b.dodge });
      engine.skillBeat(BEAT.after, () => {});
    });
    return;
  }
  const t = k === "logic" ? firstFoe(engine, p, targets) : single(engine, p, targets);
  const to = t && t.pos ? { ...t.pos } : null;
  swing({ targetId: t.id, to });
  beat(BEAT.swing, () => {
    if (!t.alive) return;
    const at = t.pos ? { ...t.pos } : to;
    const hits = k === "durandal" ? 2 : 1;
    const dmg = k === "logic" ? 2 : 1;
    let total = 0, dodged = true;
    for (let i = 0; i < hits; i++) {
      const res = hit(engine, p, t, dmg, c.name);
      total += res.dealt;
      if (!res.dodge) dodged = false;
    }
    impact(engine, p, k, t, at, { dealt: total, dodge: dodged });
    let hold = BEAT.after;
    if (!dodged && t.alive) {
      if (k === "allas") engine.applyDebuff(t, "weak", 1, 1 + (engine.hasActed(t.id) ? 1 : 0));
      if (k === "ranga") engine.applyBleed(t, 1);
    }
    if (k === "zelkova") s.bonusDraw += 1;
    if (k === "logic" && !dodged && t.alive && t.pos && Board().dist(Board().boxOf(p), Board().boxOf(t)) === 1) {
      hold += push(engine, p, t, { x: LINE()[opts.dir][0], y: LINE()[opts.dir][1] });
    }
    engine.skillBeat(hold, () => {});
  });
}

// ---------- Furioso ----------
function furioso(engine, p, opts) {
  const s = st(p);
  const plan = planDash(engine, p, opts.dir, FURIOSO.len);
  const t = plan.hit;
  s.used = [];
  s.ultReady = engine.roundNumber + FURIOSO.cd;
  t.wasAttacked = true;
  const dodged = engine.skillDodge(p, t, ULT_NAME);
  const land = () => {
    const dash = dashTo(engine, p, opts.dir, plan.passed);
    require("../server/skills").hitArea(p, [...plan.passed, plan.stopAt], [t.id]);
    return dash;
  };
  if (dodged) {
    const dash = land();
    engine.skillBeat(dash + BEAT.after, () => fx(engine, p, "impact", { weapon: "furioso", targetId: t.id, to: t.pos ? { ...t.pos } : null, dmg: 0, dodge: true }));
    return;
  }
  engine.queueCutscene(p, CUT.furioso);
  engine.deferAfterCutscene(() => {
    if (!p.alive || !t.alive) return;
    const dash = land();
    engine.skillBeat(dash + 0.1, () => engine.withEffectSource(p, () => {
      if (!t.alive) return;
      const at = t.pos ? { ...t.pos } : null;
      const res = hit(engine, p, t, FURIOSO.dmg, ULT_NAME, { sure: true });
      if (at) impact(engine, p, "furioso", t, at, res);
      if (!t.alive) return;
      if (engine.applyBleed(t, FURIOSO.bleed) > 0) engine.log(`🩸 ${t.name} เลือดไหล ${FURIOSO.bleed}`);
      engine.applyDebuff(t, "fragile", FURIOSO.fragile, FURIOSO.fragileTurns);
    }));
  });
}
const ULT_NAME = "Furioso";

// ---------- Emotion skill ----------
function egoBlock(p, k, r) {
  const s = st(p), e = EGO[k];
  if (!e) return "none";
  if (s.emotion < e.emotion) return "emotion";
  if (cdLeft(s.egoReady, r) > 0 || cdLeft(s.own[k], r) > 0) return "cd";
  return null;
}
function useEgo(engine, p, k) {
  const s = st(p), e = EGO[k], r = engine.roundNumber;
  s.emotion -= e.emotion;
  s.egoReady = r + EGO_SHARED_CD;
  s.own[k] = r + e.cd;
  s.ego = k;
  s.egoAt = engine.severStamp();
  p.statuses[e.status] = EGO_TURNS;
  fx(engine, p, "ego", { ego: k });
  if (k === "fervent") engine.sfx(SFX.heart);
  if (k === "urging") engine.healHp(p, 1);
  if (k === "lies") rollLies(s);
  engine.log(`💠 ${p.name} ${e.name}`);
}
function endEgo(engine, p) {
  const s = st(p), k = s.ego;
  if (!k) return;
  s.ego = null;
  delete p.statuses[EGO[k].status];
  if (k === "lies") s.lies = null;
  if (k === "urging") p.hp = Math.min(p.hp, engine.maxHpOf(p));
  if (k !== "fervent") return;
  fx(engine, p, "fervent", {});
  engine.sfx(SFX.death);
  engine.log(`🖤 ${p.name} Fervent Beats หมดลง`);
  engine.instantDeath(p, "absolute");
  if (!p.alive) p.pos = null;
}

function cardChoices(p, r) {
  const s = st(p), full = pagesUsed(s, r) >= PAGES_PER_TURN;
  return s.hand.map((c) => {
    const d = CARDS[c.k], cost = require("../server/skills").skillCostOf(p, "basic", 0, { form: c.uid });
    return {
      key: c.uid, name: d.name, img: IMG.card(c.k), cost, area: d.area, free: true, locked: full,
      fresh: !s.used.includes(c.k), desc: `${d.name} (${cost} แต้ม): ${d.desc}`,
    };
  });
}
function egoChoices(p, r) {
  const s = st(p);
  return EGO_KEYS.map((k) => {
    const e = EGO[k], cd = Math.max(cdLeft(s.egoReady, r), cdLeft(s.own[k], r));
    return {
      key: k, name: e.name, img: IMG.buff(k), cost: require("../server/skills").skillCostOf(p, "secondary", 0, { form: k }), area: { kind: "self" }, cd, locked: !!egoBlock(p, k, r),
      desc: `${e.name} (Emotion ${e.emotion}): ${e.desc}`,
    };
  });
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, FX, SFX, CARDS, CARD_KEYS, EGO, EGO_KEYS, HP, ARMOR, MAX_SKILL, MOV, START_CARDS, HAND_MAX, PAGES_PER_TURN, EMOTION_MAX,
  HITS_PER_EMOTION, CARD_KINDS, EGO_SHARED_CD, EGO_TURNS, FERVENT_ATK, SHARD, SHARD_MAX, CRYSTAL, COUNTER_RING, FURIOSO,
  isRoland,

  resetCombat(p) { p.roland = isRoland(p) ? fresh() : null; },
  maxHp(p) { return HP + (egoOn(p, "urging") ? 1 : 0); },
  maxArmor() { return ARMOR; },
  maxSkill() { return MAX_SKILL; },
  mov(p) { return isRoland(p) ? MOV + (egoOn(p, "urging") ? 1 : 0) : null; },
  blocksSkillGain(p, src) { return isRoland(p) && src === "item"; },
  attackBaseOverride(engine, attacker) { return egoOn(attacker, "fervent") ? FERVENT_ATK : 0; },

  // ---------- จังหวะเทิร์น ----------
  onRoundStartTick(engine, p) {
    if (!isRoland(p)) return;
    const s = st(p);
    const n = s.started ? 1 + s.bonusDraw : START_CARDS;
    s.started = true;
    s.bonusDraw = 0;
    for (let i = 0; i < n; i++) drawOne(s);
    secretFx(engine, p, "draw");
    if (s.ego === "lies" && egoOn(p, "lies")) rollLies(s);
  },
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isRoland(p)) continue;
      const s = st(p);
      if (!crystalOn(p)) s.crystalDodge = 0;
      if (p.alive && s.ego && !egoOn(p, s.ego)) endEgo(engine, p);
    }
  },
  onDeath(engine, p) {
    if (!isRoland(p)) return;
    const s = st(p);
    s.hand = [];
    s.crystalDodge = 0;
  },
  deathless(engine, p) {
    if (!egoOn(p, "fervent")) return false;
    p.hp = Math.max(1, p.hp);
    return true;
  },

  // ---------- Scars / Crystal Atelier ----------
  adjustIncomingDamage(engine, p, n, isNormalAttack) {
    if (!egoOn(p, "scars") || !(n > 0)) return n;
    if (isNormalAttack && Math.random() * 100 < SCARS_PCT) {
      engine.log(`🩹 ${p.name} Scars — ไม่ได้รับความเสียหาย`);
      return 0;
    }
    return Math.max(0, n - SCARS_REDUCE);
  },
  grantedDodge(engine, p) {
    if (!crystalOn(p) || !(st(p).crystalDodge > 0)) return null;
    st(p).crystalDodge -= 1;
    return { name: CARDS.crystal.name, img: IMG.card("crystal") };
  },
  dodgeSure(engine, p) { return crystalOn(p) && st(p).crystalDodge > 0; },
  counters(p, card) { return crystalOn(p) && !(card && card.gun); },
  counterAnyRange(engine, p, attacker) {
    if (!crystalOn(p) || !p.pos || !attacker.pos) return false;
    if (!inRing(p, attacker, COUNTER_RING)) return false;
    st(p).countering = true;
    return true;
  },
  counterPush() { return { push: false }; },
  fixedStrikeDamage(engine, attacker, target, ctx = {}) {
    if (!isRoland(attacker) || ctx.estimate || !ctx.counter || !st(attacker).countering) return null;
    return COUNTER_DMG + (egoOn(attacker, "fervent") ? FERVENT_ATK : 0);
  },
  attackSound(p) { return isRoland(p) && st(p).countering ? SFX.atk("crystal") : undefined; },
  onStrikeResolved(engine, attacker, target, res, { counter } = {}) {
    if (!isRoland(attacker)) return;
    if (counter) st(attacker).countering = false;
    if (!res || !(res.dmg > 0)) return;
    onDealt(engine, attacker, target);
  },

  // ---------- สกิล ----------
  ignoresNoSkill(p, tier) { return isRoland(p) && tier === "basic"; },
  skipsTurnQuota(p, tier) { return isRoland(p) && tier === "basic"; },
  ignoresTurnQuota(p, tier) { return isRoland(p) && tier === "basic"; },
  skillCost(p, tier, base, opts = {}) {
    if (!isRoland(p)) return base;
    const s = st(p);
    if (tier === "basic") { const c = cardOf(s, opts.form); return c ? costOf(s, c.k) : base; }
    if (tier === "secondary") { const e = EGO[opts.form]; return e ? e.cost : base; }
    return base;
  },
  skillArea(p, tier, area, opts = {}) {
    if (!isRoland(p) || tier !== "basic") return area;
    const c = cardOf(st(p), opts.form);
    return c ? CARDS[c.k].area : area;
  },
  skillPub(p, tier) {
    if (!isRoland(p)) return null;
    const r = eng().roundNumber;
    if (tier === "basic") return { choices: cardChoices(p, r), browse: true }; // เปิดดูมือได้ทุกเมื่อในตาเดิน แม้ไม่มีเป้าในระยะ
    if (tier === "secondary") return { choices: egoChoices(p, r) };
    return null;
  },
  skillSound(p, tier) { return isRoland(p) && tier !== "ultimate" ? SFX.click : null; },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isRoland(p)) return true;
    const s = st(p), r = engine.roundNumber;
    if (!p.pos) return false;
    if (tier === "basic") {
      const c = cardOf(s, opts.form);
      if (!c || pagesUsed(s, r) >= PAGES_PER_TURN) return false;
      if (c.k === "crystal") return !!LINE()[opts.dir];
      if (c.k === "logic") return !!LINE()[opts.dir] && !!firstFoe(engine, p, targets);
      if (sweeps(c.k)) return foes(engine, p, targets).length > 0;
      return !!single(engine, p, targets);
    }
    if (tier === "secondary") return !egoBlock(p, opts.form, r);
    if (tier === "ultimate") return chargeOf(s) >= CARD_KINDS && cdLeft(s.ultReady, r) === 0 && !!LINE()[opts.dir] && !!planDash(engine, p, opts.dir, FURIOSO.len).hit;
    return false;
  },
  // พุ่งแล้วชนคนแรก: โดนจริงแค่ช่องที่พุ่งผ่าน — ลงผลพื้นที่เองตอนถึง (hitArea)
  ownsAreaHit(p, tier, opts = {}) {
    if (!isRoland(p)) return false;
    if (tier === "ultimate") return true;
    const c = tier === "basic" ? cardOf(st(p), opts.form) : null;
    return !!c && c.k === "crystal";
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isRoland(p)) return "";
    const s = st(p);
    if (tier === "basic") {
      const c = cardOf(s, opts.form);
      playCard(engine, p, c, [...(targets || [])], opts);
      return ` — ${CARDS[c.k].name}`;
    }
    if (tier === "secondary") {
      useEgo(engine, p, opts.form);
      return ` — ${EGO[opts.form].name}`;
    }
    furioso(engine, p, opts);
    return "";
  },

  // ---------- ผลสกิลที่ตัดได้ (server/sever.js) ----------
  severables(engine, p) {
    if (!isRoland(p) || !p.alive) return [];
    const s = st(p), out = [];
    if (s.ego && egoOn(p, s.ego)) out.push({ key: "ego", label: EGO[s.ego].name, at: s.egoAt, cancel: () => endEgo(engine, p) });
    if (crystalOn(p)) out.push({ key: "crystal", label: CARDS.crystal.name, at: s.crystalAt, cancel: () => { s.crystalDodge = 0; delete p.statuses[CRYSTAL]; } });
    return out;
  },

  // ---------- ข้อมูลให้ client ----------
  rolandState(engine, p) {
    if (!isRoland(p)) return undefined;
    const s = st(p);
    return {
      emotion: s.emotion, emotionMax: EMOTION_MAX, ultCd: cdLeft(s.ultReady, engine.roundNumber), hits: s.hits, hitsMax: HITS_PER_EMOTION, charge: chargeOf(s), chargeMax: CARD_KINDS,
      pagesLeft: Math.max(0, PAGES_PER_TURN - pagesUsed(s, engine.roundNumber)), pagesMax: PAGES_PER_TURN, crystalDodge: crystalOn(p) ? s.crystalDodge : 0,
    };
  },
  skillLocks(engine, p) {
    if (!isRoland(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      basic: { locked: pagesUsed(s, r) >= PAGES_PER_TURN || !s.hand.length, free: true, ignoresNoSkill: true },
      secondary: { locked: !EGO_KEYS.some((k) => !egoBlock(p, k, r)) },
      ultimate: { cd: cdLeft(s.ultReady, r), locked: chargeOf(s) < CARD_KINDS },
    };
  },
};
