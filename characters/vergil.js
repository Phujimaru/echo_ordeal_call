// ============================================================
//  เวอจิล (Devil May Cry) — id "vergil" · สเปกผู้ใช้ 2026-11-21 (GRID_PLAN §7.40)
//
//  ค่าพื้นฐาน: HP 10 / เกราะ 5 / พลังโจมตี 1 (ค่าตั้งต้น) · เดิน 4 · ตีประชิด [1, 1]
//  สกิลพื้นฐาน ฟันโหมกระหน่ำ (1 แต้ม · ประชิด): ฟันรัว 3 ครั้ง ครั้งละ 1 (+3 HIT)
//  สกิลรอง ฟันขึ้น (1 แต้ม · ประชิด): ดาเมจ 1 (+2 HIT) · เป้าติดสถานะ "ลอย" 1 เทิร์น (เดินไม่ได้) · เวอจิลลอยตามขึ้นไปฟันต่อกลางอากาศ
//    กลางอากาศ (ผู้ใช้สั่ง 2026-11-21): ฟันโหมกระหน่ำ/ฟันขึ้นใส่เป้าลอย = เป้าลอยค้าง ฟันต่อได้ไม่หยุด · จบตาเดิน = ดิ่งตบเป้าลงพื้น
//  ท่าไม้ตาย Doppelganger (4 แต้ม · ใช้กับตัวเอง): 2 เทิร์น — ทุกครั้งที่ฟันโหมกระหน่ำ/ฟันขึ้นโดน เงาฟันตามอีก 1 ครั้ง (ดาเมจ 1 · +1 HIT)
//  สกิลติดตัว คอมโบ A+:
//    ฟันโหมกระหน่ำ/ฟันขึ้นไม่กินโควตาสกิลของเทิร์น (กดได้ไม่จำกัดในตาเดิน) · โดน = แต้มสกิลคืน 1 (ผู้ใช้เลือก 2026-11-21)
//    ตัวนับคอมโบค้างข้ามเทิร์น · หลังฟันแต่ละครั้งต้องกดท่าถัดไปให้ทัน (0–9 HIT 3 วิ · 10–19 2 วิ · 20+ 1.2 วิ) —
//      เวลานับเฉพาะตอนเกมอยู่ในตาเดิน (คลิป/ฉากไม่กิน) · หมดเวลา = คอมโบหลุด + จบตาเดิน
//    ศัตรูอ่านทางออก: ก่อนฟันทุกครั้งทอยหลบเพิ่ม 3% / 6% / 10% / 15% (1–9 / 10–19 / 20–25 / 26+ HIT) · แม่นยำเจาะได้
//    คอมโบหลุด (กลับเป็น 0 และจบตาเดิน): หมดเวลา · ถูกหลบ — โดนศัตรูทำให้เสียหาย = หลุด (ไม่ต้องจบตา) · ท่าเดิม 3 ครั้งติด = ไม่นับ HIT (ผ่อน 2026-11-21)
//    ปุ่ม HUD "เก็บดาบ" = จบตาเดินโดยคอมโบไม่หลุด
//    ทุกการฟันของ 2 ท่า (รวมเงา/ท่าคอมโบ) ความเสียหาย 1 เสมอ (ผู้ใช้สั่ง 2026-11-21 — เพดานต่อครั้ง 1 ผ่านฮุค damageCap)
//    ทุก 10 HIT ฟื้นพลังชีวิต 1 (ผู้ใช้สั่ง 2026-11-21) · ศัตรู 1 คนเสียจากเวอจิลได้ไม่เกิน 4 ต่อเทิร์น (ผู้ใช้สั่ง — เดิม 6 · ปรับ 2026-11-21)
//    ท่าคอมโบตามลำดับปุ่ม (ROUTES — ผู้ใช้ขอ "ท่าโจมตีเยอะๆ" + คู่มือ · ชื่อ/ผลเป็นการตัดสินของ Claude): กดครบลำดับ = ท่าออก แล้วนับลำดับใหม่
//    30 HIT: Judgment Cut End ทำงานเองทันที (ไม่เสียแต้ม) — ศัตรูทุกตัวที่มองเห็น ดาเมจ 6 (เกราะก่อน · หลบได้ · ไม่ติดเพดาน = รวมสูงสุด 4 + 6 = 10 ต่อคน)
//      คลิป: ท่อนพุ่ง (ฉากเขียวตัดเป็นพื้นใส ซ้อนกระดาน) → JCE เต็มจอ → ดาเมจลง → ครั้งแรกของแมตช์ต่อคลิป "I am the storm"
//      จบแล้วคอมโบเป็น 0 และจบตาเดิน
//  สกิลติดตัว 2 พายุไม่หยุด (ผู้ใช้เลือก 2026-11-21): เหลือผู้เล่นที่ยังอยู่แค่เวอจิลกับอีก 1 คน →
//    โดนศัตรูทำให้เสียหายแล้วคอมโบไม่หลุด · ต้นเทิร์นแต้มสกิล +2 และเกราะ +1 · ทำงานครั้งแรกของแมตช์ = คลิป passive2 (ไฟล์ผู้ใช้ · ไม่มีชื่อบนคลิป)
//
//  การตัดสินของ Claude (ผู้ใช้ไม่ได้ระบุ):
//    ทุกท่าธาตุปกติ · ฟันโหมกระหน่ำ 3 ครั้งทอยหลบครั้งเดียว (ครั้งแรก) — ถูกหลบ = ไม่โดนทั้งชุด · เงาถูกหลบไม่ทำให้คอมโบหลุด
//    ถึงเพดาน 4 แล้วยังฟันได้และยังนับ HIT/ได้แต้มคืน (ดาเมจ 0) · ตีปกติโดน +1 HIT (จบตาเดินตามปกติ · คอมโบไม่หลุด)
//    ใช้ท่าเดิมครั้งที่ 3 ติดกัน = ท่านั้นยังฟัน แต่ไม่นับ HIT / ไม่ได้แต้มคืน แล้วคอมโบหลุด
//    "ลอย" = สถานะ rooted ของกลาง 1 เทิร์น + ธง vergilAir ของเวอจิล · ลบสกิลติดตัว = ไม่นับคอมโบ/ไม่มีหน้าต่างเวลา/ไม่มี JCE (ฟันได้ตามโควตาปกติ)
//  สื่อ: ผู้ใช้ส่งมา (Downloads/vergil — vergil.jpg + Judgment Cut End.mp4 ตัด 3 ท่อน crf 23 / VP9 alpha) ·
//    ไอคอนสกิลตัดจากวีดีโอตัวอย่างของผู้ใช้ · เสียงฟันใช้ไฟล์ของเรียวกิ (ไม่ได้ดาวน์โหลดใหม่)
// ============================================================

const PassiveSeal = require("../server/passiveSeal");

const ID = "vergil";
const DIR = "/characters/vergil";
const IMG = { card: `${DIR}/vergil.webp`, basic: `${DIR}/skill1.webp`, secondary: `${DIR}/skill2.webp`, ult: `${DIR}/skill3.webp` };
const VIDEO = { dash: `${DIR}/jce_dash.webm`, jce: `${DIR}/jce.mp4`, storm: `${DIR}/storm.mp4`, duel: `${DIR}/storm_duel.mp4` };
const CUT = { dash: "vergilJceDash", jce: "vergilJce", storm: "vergilStorm", duel: "vergilDuel" };
const CLIP_SEC = { dash: 3.2, jce: 13.6, storm: 5.8, duel: 16.5 };
const FX = "vergilFx"; // socket event (client/src/board/vergilFx.js)
// วินาทีที่พักให้ฉากบนกระดานเล่น (ต้องไม่สั้นกว่า VG_T ใน vergilFx.js)
const FX_MS = { rapid: 0.62, upper: 0.55, whiff: 0.45, route: 0.75 };
const MUSIC = "vergil_theme"; // กล่องเพลง (ปุ่ม HUD เปิด/ปิด — client/src/audio.js)
const NAME = { basic: "ฟันโหมกระหน่ำ", secondary: "ฟันขึ้น", ult: "Doppelganger", shadow: "เงาฟัน", jce: "Judgment Cut End", sheathe: "เก็บดาบ", music: "กล่องเพลง" };

const RAPID = { hits: 3, dmg: 1 };
const UPPER = { dmg: 1, air: 1, hits: 2 }; // ฟันขึ้นโดน = +2 HIT (ผ่อน 2026-11-21)
const DOPPEL = { turns: 2, dmg: 1 };
const JCE = { at: 30, dmg: 6 };
const STORM = { sp: 2, armor: 1 }; // พายุไม่หยุด: ต้นเทิร์น
const CAP = 4; // ศัตรู 1 คนเสียจากเวอจิลได้ไม่เกิน 4 ต่อเทิร์น (ไม่นับ JCE ที่ระเบิดเพิ่มอีก 6 — ผู้ใช้สั่ง 2026-11-21)
const TICK_MS = 100;
const HEAL_EVERY = 10; // ทุก 10 HIT ฟื้นพลังชีวิต 1

// ---------- ท่าคอมโบตามลำดับปุ่ม (b = ฟันโหมกระหน่ำ · s = ฟันขึ้น) ----------
//  ไม่มีลำดับไหนเป็นต้นของอีกลำดับ (ท่าสั้นจะออกก่อนจนท่ายาวไม่มีวันถึง) · เช็คท่ายาวก่อนเสมอ
//  ชื่อ/ผลเป็นการตัดสินของ Claude (ผู้ใช้ขอ "เยอะมากๆ" + คู่มือ 2026-11-21) — desc ใช้ในคู่มือบนจอ
const ROUTES = [
  { key: "rising", seq: "bbs", name: "Rising Sun", desc: "เป้าลอย 2 เทิร์น · +2 HIT" },
  { key: "helm", seq: "ssb", name: "Helm Breaker", desc: "ฟันดิ่งเพิ่ม 1 ครั้ง · เป้าเปราะบาง 1 เทิร์น" },
  { key: "flow", seq: "bsb", name: "Yamato Flow", desc: "แต้มสกิล +1" },
  { key: "lunar", seq: "sbs", name: "Lunar Phase", desc: "ท่าถัดไปศัตรูอ่านทางออกไม่ได้ · เวลาต่อคอมโบ 3 วิ" },
  { key: "stinger", seq: "bssb", name: "Deep Stinger", desc: "ฟันเพิ่ม 2 ครั้ง" },
  { key: "swords", seq: "sbbs", name: "Summoned Swords", desc: "ดาบเทพ 3 เล่ม ครั้งละ 1" },
  { key: "jcut", seq: "bbbs", name: "Judgment Cut", desc: "ศัตรูทุกตัวในกรอบ 3×3 รอบเป้า โดน 1" },
  { key: "starfall", seq: "sssb", name: "Starfall", desc: "เป้าสตั้น 1 เทิร์น" },
];
const ROUTE_MAX = 4;

const isMe = (p) => !!p && p.characterId === ID && !p.summon;
const fresh = () => ({
  combo: 0, last: null, repeat: 0, target: null, left: 0, max: 0, // หน้าต่างเวลาต่อคอมโบ (ms ที่เหลือ · ms เต็ม)
  dealt: {}, dealtRound: -1, capNow: null,
  doppelUntil: 0, doppelAt: 0, endNow: false, clipNow: false, stormShown: false, music: false, musicAt: 0, duelShown: false, air: null, seq: "", sure: false, longWin: false, route: null, routeAt: 0,
});
const st = (p) => p.vergil || (p.vergil = fresh());
const passiveOn = (p) => PassiveSeal.on(p);
const foe = (engine, p, t) => !!t && t.alive && !!t.pos && t.id !== p.id && !engine.sameTeam(p, t);

// ---------- พายุไม่หยุด: เหลือผู้เล่น 2 คน (เวอจิล + อีก 1) — ไม่นับยูนิตที่ถูกเรียก/ตัวที่สองของระบบคู่ ----------
function duelOn(engine, p) {
  if (!passiveOn(p) || !p.alive) return false;
  const alive = Object.values(engine.players).filter((q) => q.alive && !q.summon && !q.duoOf);
  return alive.length === 2 && alive.some((q) => q.id === p.id);
}

// ---------- ตัวเลขตามคอมโบ ----------
function windowMs(combo) { return combo >= 20 ? 1200 : combo >= 10 ? 2000 : 3000; }
// ผ่อนแล้ว (ผู้ใช้เลือก 2026-11-21 — เดิม 5/15/30/45% ถึง 30 HIT ในตาเดียวได้แค่ราว 5%)
function readPct(combo) { return combo >= 26 ? 15 : combo >= 20 ? 10 : combo >= 10 ? 6 : combo >= 1 ? 3 : 0; }
const doppelOn = (engine, p) => st(p).doppelUntil >= engine.roundNumber;

// ---------- หน้าต่างเวลา (นับเฉพาะตอนอยู่ในตาเดินของตัวเอง) ----------
const ticking = new Map(); // playerId → interval
function stopWindow(p) {
  const h = ticking.get(p.id);
  if (h) { clearInterval(h); ticking.delete(p.id); }
  if (p.vergil) { p.vergil.left = 0; p.vergil.max = 0; }
}
function openWindow(engine, p) {
  const s = st(p);
  stopWindow(p);
  s.max = s.longWin ? 3000 : windowMs(s.combo);
  s.longWin = false;
  s.left = s.max;
  const h = setInterval(() => {
    if (!p.alive || engine.actorId !== p.id || !engine.players[p.id]) { stopWindow(p); return; }
    if (engine.gameState !== "ACTION") return; // คลิป/ฉาก = หยุดนับ
    s.left -= TICK_MS;
    if (s.left > 0) return;
    stopWindow(p);
    breakCombo(engine, p, "หมดเวลา");
    engine.finishActor();
  }, TICK_MS);
  if (h.unref) h.unref();
  ticking.set(p.id, h);
}

function breakCombo(engine, p, why) {
  const s = st(p);
  stopWindow(p);
  s.last = null; s.repeat = 0; s.seq = ""; s.sure = false;
  if (s.combo <= 0) return;
  engine.log(`💢 ${p.name} คอมโบหลุด (${why}) — ${s.combo} HIT`);
  if (p.pos) engine.boardFx(FX, { kind: "break", id: p.id, at: { ...p.pos } });
  s.combo = 0;
}

// ---------- เพดานดาเมจต่อเป้าต่อเทิร์น ----------
function dealtOn(engine, p, t) {
  const s = st(p);
  if (s.dealtRound !== engine.roundNumber) { s.dealt = {}; s.dealtRound = engine.roundNumber; }
  return s.dealt[t.id] || 0;
}
// ฟัน 1 ครั้งผ่านท่อ skillStrike (เกราะก่อน · ฆ่าได้) โดยเพดานเหลือตามที่เป้ารับไปแล้วเทิร์นนี้
function slash(engine, p, t, name, dmg, opts = {}) {
  const s = st(p);
  const used = dealtOn(engine, p, t);
  s.capNow = opts.noCap ? null : Math.min(opts.one ? 1 : Infinity, Math.max(0, CAP - used)); // one = ความเสียหาย 1 เสมอ
  let res;
  try {
    res = engine.withEffectSource(p, () => engine.skillStrike(p, t, name, { bonus: dmg - 1, sure: !!opts.sure }));
  } finally { s.capNow = null; }
  if (res && !res.dodge && !res.blocked && !opts.noCap) s.dealt[t.id] = used + (res.dmg || 0);
  return res || { dodge: true };
}

// ศัตรูอ่านทางออก — ทอยก่อนฟัน (แม่นยำเจาะได้) → true = หลบ
function readDodge(engine, p, t) {
  if (!passiveOn(p)) return false;
  if (st(p).sure) { st(p).sure = false; return false; } // Lunar Phase: ท่าถัดไปอ่านทางออกไม่ได้
  const pct = readPct(st(p).combo);
  if (pct <= 0 || engine.withEffectSource(p, () => engine.sourceAccurate())) return false;
  if (Math.random() * 100 >= pct) return false;
  engine.log(`💨 ${t.name} อ่านทางออก — หลบการฟันของ ${p.name} (${pct}%)`);
  return true;
}

function addHits(engine, p, n) {
  if (!passiveOn(p) || n <= 0) return;
  const s = st(p), before = s.combo;
  s.combo += n;
  // ทุก 10 HIT ฟื้นพลังชีวิต 1 (ข้ามหลายขั้นในครั้งเดียว = ฟื้นตามจำนวนขั้น)
  const steps = Math.floor(s.combo / HEAL_EVERY) - Math.floor(before / HEAL_EVERY);
  if (steps > 0 && p.alive) {
    const healed = engine.healHp(p, steps);
    if (healed > 0) engine.log(`💚 ${p.name} ${Math.floor(s.combo / HEAL_EVERY) * HEAL_EVERY} HIT — ฟื้นพลังชีวิต +${healed}`);
  }
}
function refund(engine, p) {
  engine.addSkill(p, 1, "vergil");
}

// ---------- ฟันโหมกระหน่ำ / ฟันขึ้น ----------
//  เอฟเฟกต์บนกระดาน (socket FX → client/src/board/vergilFx.js) + พักจังหวะให้ฉากเล่นจบ (skillBeat — ระหว่างพักหน้าต่างเวลาไม่นับ)
//  ครั้งที่เปิด Judgment Cut End: ไม่ส่งเอฟเฟกต์/เสียง (คลิปเล่นทันที — ห้ามเสียงตัดหน้า/ซ้อนวีดีโอ)
function comboSlash(engine, p, tier, t) {
  const s = st(p);
  s.endNow = false;
  s.clipNow = false;
  const passive = passiveOn(p);
  // ท่าเดิมครั้งที่ 3 ติดกันขึ้นไป = ฟันได้ (ได้แต้มคืน) แต่ไม่นับ HIT — คอมโบไม่หลุด (ผ่อน 2026-11-21)
  const repeat = s.last === tier ? s.repeat + 1 : 1;
  const stale = passive && repeat >= 3;
  if (!t || !foe(engine, p, t)) return;
  stopWindow(p);
  const from = { ...p.pos }, to = { ...t.pos };
  const vair = !!s.air; // เวอจิลลอยอยู่ก่อนท่านี้ (ต่อคอมโบกลางอากาศ)
  const fx = (ev) => engine.boardFx(FX, { id: p.id, targetId: t.id, from, to, vair, ...ev });
  const beat = (sec) => engine.skillBeat(sec, () => {});
  if (readDodge(engine, p, t)) {
    fx({ kind: "whiff" });
    beat(FX_MS.whiff);
    if (passive) { breakCombo(engine, p, "ถูกหลบ"); s.endNow = true; }
    return;
  }
  let hits = 0;
  const air = !!(t.vergilAir && t.vergilAir.by === p.id && (t.statuses.rooted || 0) > 0);
  if (tier === "basic") {
    const per = RAPID.dmg;
    for (let i = 0; i < RAPID.hits && t.alive; i++) {
      const res = slash(engine, p, t, NAME.basic, per, { sure: i > 0, one: true });
      if (res.dodge || res.blocked) break;
      hits++;
    }
    // ฟันกลางอากาศ (Aerial Rave): เป้ายังลอยค้าง — ลงพื้นตอนเวอจิลจบตา (landAir)
    if (air && hits > 0 && t.alive) s.air = t.id;
  } else {
    const res = slash(engine, p, t, NAME.secondary, UPPER.dmg, { one: true });
    if (!res.dodge && !res.blocked) {
      hits = 1;
      if (t.alive && (air || engine.applyDebuff(t, "rooted", null, UPPER.air))) {
        t.vergilAir = { by: p.id };
        s.air = t.id; // เวอจิลลอยตามขึ้นไปฟันต่อกลางอากาศ
        if (!air) engine.log(`⬆️ ${t.name} ลอยกลางอากาศ`);
      }
    }
  }
  // เงา Doppelganger ฟันตาม 1 ครั้ง (หลบได้ · หลบแล้วคอมโบไม่หลุด)
  let shadow = 0;
  if (hits && doppelOn(engine, p) && t.alive) {
    const res = slash(engine, p, t, NAME.shadow, DOPPEL.dmg, { one: true });
    if (!res.dodge && !res.blocked) shadow = 1;
  }
  const gain = stale || !hits ? 0 : (tier === "basic" ? hits : hits * UPPER.hits) + shadow; // HIT ที่ได้จากท่านี้
  // ครั้งนี้ทำให้ถึง JCE ไหม (รวม HIT จากท่าคอมโบ — ตัดสินก่อนส่งเอฟเฟกต์: ครั้งที่เปิดคลิปไม่มีเสียง/ฉาก)
  const nextSeq = passive && hits ? (s.seq + (tier === "basic" ? "b" : "s")).slice(-ROUTE_MAX) : "";
  const routeAhead = ROUTES.filter((r) => nextSeq.endsWith(r.seq)).sort((a, b) => b.seq.length - a.seq.length)[0];
  const routeGain = routeAhead ? ROUTE_GAIN[routeAhead.key] || 0 : 0;
  const jce = passive && gain > 0 && s.combo + gain + routeGain >= JCE.at;
  if (!jce) {
    if (!hits) fx({ kind: "whiff" });
    else fx({ kind: tier === "basic" ? "rapid" : "upper", hits, air });
    if (shadow) fx({ kind: "shadow", delay: tier === "basic" ? 260 : 120 });
    beat(!hits ? FX_MS.whiff : tier === "basic" ? FX_MS.rapid : FX_MS.upper);
  }
  if (!hits) {
    if (passive) { breakCombo(engine, p, "ถูกหลบ"); s.endNow = true; }
    return;
  }
  if (!passive) return;
  if (stale) engine.log(`💤 ${p.name} ท่าเดิมซ้ำ — ไม่นับ HIT`);
  s.last = tier; s.repeat = repeat;
  s.target = t.id;
  addHits(engine, p, gain);
  // ลำดับปุ่ม → ท่าคอมโบ (เช็คท่ายาวก่อน) · ออกแล้วนับลำดับใหม่
  s.seq = (s.seq + (tier === "basic" ? "b" : "s")).slice(-ROUTE_MAX);
  const route = ROUTES.filter((r) => s.seq.endsWith(r.seq)).sort((a, b) => b.seq.length - a.seq.length)[0];
  if (route && t.alive) {
    s.seq = "";
    s.route = route.key; s.routeAt = (s.routeAt || 0) + 1;
    engine.log(`🌀 ${p.name} ${route.name}`);
    // ฉากท่าคอมโบเล่นต่อจากฉากท่าหลัก (after ms) · ครั้งที่เปิด JCE = ไม่มีฉาก/เสียงตัดหน้าคลิป
    const after = Math.round(1000 * (tier === "basic" ? FX_MS.rapid : FX_MS.upper));
    const extra = runRoute(engine, p, t, route, jce ? null : (ev) => fx({ ...ev, after }));
    if (!jce) engine.skillBeat(FX_MS.route, () => {});
    if (extra > 0) addHits(engine, p, extra);
  }
  refund(engine, p);
  engine.log(`⚔️ ${p.name} ${s.combo} HIT`);
  if (s.combo >= JCE.at) { judgmentCutEnd(engine, p); return; }
  openWindow(engine, p);
}

// HIT สูงสุดที่ท่าคอมโบให้ได้ (ใช้ตัดสินล่วงหน้าว่าครั้งนี้จะถึง JCE ไหม — ถูกหลบ = ได้น้อยกว่า ไม่ถึงก็เปิดหน้าต่างตามปกติ)
const ROUTE_GAIN = { rising: 2, helm: 1, stinger: 2, swords: 3, jcut: 9 };

// ผลของท่าคอมโบ → HIT ที่ได้เพิ่ม · ความเสียหาย 1 ต่อครั้งเสมอ (หลบได้ทีละครั้ง · หลบแล้วคอมโบไม่หลุด)
function runRoute(engine, p, t, route, fx) {
  const s = st(p);
  const hitOnce = (u, name) => { const r = slash(engine, p, u, name, 1, { one: true }); return !r.dodge && !r.blocked ? 1 : 0; };
  let n = 0;
  switch (route.key) {
    case "rising": // เป้าลอย 2 เทิร์น · +2 HIT
      if (t.alive) {
        t.statuses.rooted = Math.max(t.statuses.rooted || 0, 2);
        t.vergilAir = { by: p.id };
        s.air = t.id;
      }
      n = 2;
      break;
    case "helm": // ฟันดิ่งเพิ่ม 1 · เปราะบาง 1 เทิร์น
      n = hitOnce(t, route.name);
      if (n && t.alive) engine.applyDebuff(t, "fragile", 1, 1);
      break;
    case "flow": // แต้มสกิล +1
      engine.addSkill(p, 1, "vergil");
      break;
    case "lunar": // ท่าถัดไปไม่โดนอ่านทางออก · หน้าต่างเวลา 3 วิ
      s.sure = true; s.longWin = true;
      break;
    case "stinger": // ฟันเพิ่ม 2 ครั้ง
      for (let i = 0; i < 2 && t.alive; i++) n += hitOnce(t, route.name);
      break;
    case "swords": // ดาบเทพ 3 เล่ม
      for (let i = 0; i < 3 && t.alive; i++) n += hitOnce(t, route.name);
      break;
    case "jcut": { // ศัตรูทุกตัวในกรอบ 3×3 รอบเป้า (รวมเป้า)
      const c = { ...t.pos };
      const foes = Object.values(engine.players).filter((u) => foe(engine, p, u) && Math.abs(u.pos.x - c.x) <= 1 && Math.abs(u.pos.y - c.y) <= 1);
      for (const u of foes) n += hitOnce(u, route.name);
      break;
    }
    case "starfall": // สตั้น 1 เทิร์น (ต้านได้)
      if (t.alive) engine.applyDebuff(t, "stun", null, 1 + (engine.hasActed(t.id) ? 1 : 0));
      break;
    default:
  }
  if (fx) fx({ kind: "route", route: route.key, name: route.name, hits: n });
  return n;
}

// ---------- ลงพื้นจากกลางอากาศ (จบตา / คอมโบหลุด) — เวอจิลดิ่งฟันตบเป้าลงพื้น (เป้ายังติดลอย = เดินไม่ได้ตามเทิร์นเดิม) ----------
function landAir(engine, p) {
  const s = st(p);
  if (!s.air) return;
  const t = engine.players[s.air];
  s.air = null;
  if (t && t.vergilAir && t.vergilAir.by === p.id) delete t.vergilAir;
  if (p.pos) engine.boardFx(FX, { kind: "land", id: p.id, targetId: t && t.alive && t.pos ? t.id : null, from: { ...p.pos }, to: t && t.pos ? { ...t.pos } : { ...p.pos } });
}

// ---------- Judgment Cut End (ทำงานเองที่ 30 HIT) ----------
function judgmentCutEnd(engine, p) {
  const s = st(p);
  stopWindow(p);
  s.combo = 0; s.last = null; s.repeat = 0;
  s.endNow = true;
  s.clipNow = true;
  engine.log(`🌀 ${p.name} ${NAME.jce}!`);
  engine.queueCutscene(p, CUT.dash);
  engine.queueCutscene(p, CUT.jce);
  engine.deferAfterCutscene(() => {
    const foes = Object.values(engine.players).filter((t) => foe(engine, p, t) && !engine.hiddenFromUnit(p, t));
    for (const t of foes) if (t.alive) slash(engine, p, t, NAME.jce, JCE.dmg, { noCap: true });
    if (!s.stormShown && p.alive) { s.stormShown = true; engine.queueCutscene(p, CUT.storm); }
  });
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, CLIP_SEC, FX, FX_MS, MUSIC, NAME, RAPID, UPPER, DOPPEL, JCE, CAP,
  isVergil: isMe, duelOn, STORM, ROUTES, windowMs, readPct,

  resetCombat(p) {
    if (p.vergil) stopWindow(p);
    p.vergil = isMe(p) ? fresh() : null;
  },

  // ---------- สกิล ----------
  canUseSkill(engine, p, tier, targets) {
    if (!isMe(p)) return true;
    if (tier === "ultimate") return !doppelOn(engine, p);
    const t = engine.players[(targets || [])[0]];
    return foe(engine, p, t);
  },
  // ฟันโหมกระหน่ำ/ฟันขึ้น: ไม่กินโควตา + กดได้แม้ใช้โควตาแล้ว (ลบสกิลติดตัว = โควตาปกติ)
  skipsTurnQuota(p, tier) { return isMe(p) && tier !== "ultimate" && passiveOn(p); },
  ignoresTurnQuota(p, tier) { return isMe(p) && tier !== "ultimate" && passiveOn(p); },
  silentFlash(p, tier) { return isMe(p) && tier !== "ultimate"; }, // ฟันรัว = ไม่ขึ้นป้ายกลางทุกครั้ง
  skillSound(p, tier) {
    if (!isMe(p)) return undefined;
    return tier === "ultimate" ? null : undefined;
  },
  applyInstantSkill(engine, p, tier, targets) {
    if (!isMe(p)) return undefined;
    const s = st(p);
    if (tier === "ultimate") {
      s.doppelUntil = engine.roundNumber + DOPPEL.turns - 1;
      s.doppelAt = engine.severStamp();
      engine.log(`👥 ${p.name} ${NAME.ult} (${DOPPEL.turns} เทิร์น)`);
      if (p.pos) engine.boardFx(FX, { kind: "doppel", id: p.id, at: { ...p.pos } });
      return "";
    }
    const t = engine.players[(targets || [])[0]];
    comboSlash(engine, p, tier, t); // เสียงฟันเล่นที่ client ตามจังหวะปะทะ (vergilFx.js VG_SFX)
    return "";
  },
  // ผลตัดสินระหว่างลงผล: คอมโบหลุด / JCE = จบตาเดิน (ฮุค endsTurnAfter — skills.js)
  endsTurnAfter(engine, p) {
    if (!isMe(p)) return false;
    const s = st(p);
    const end = s.endNow;
    s.endNow = false;
    return end;
  },
  // เพดาน 4 ต่อเป้าต่อเทิร์น (ตั้งเฉพาะระหว่างฟันของเวอจิล)
  damageCap(engine, p) {
    if (!isMe(p)) return null;
    const c = st(p).capNow;
    return c == null ? null : c;
  },
  skillLocks(engine, p) {
    if (!isMe(p)) return undefined;
    const on = doppelOn(engine, p);
    return { ultimate: { cd: 0, locked: on } };
  },

  // ---------- ตีปกติโดน = +1 HIT (คอมโบไม่หลุด) ----------
  onStrikeLanded(engine, attacker, target, { counter } = {}) {
    if (!isMe(attacker) || counter || !passiveOn(attacker)) return [];
    stopWindow(attacker);
    addHits(engine, attacker, 1);
    const s = st(attacker);
    s.last = null; s.repeat = 0;
    return [`${s.combo} HIT`];
  },

  // ---------- โดนศัตรูทำให้เสียหาย = คอมโบหลุด ----------
  onDamageTaken(engine, p) {
    if (!isMe(p) || !p.vergil || p.vergil.combo <= 0) return;
    if (duelOn(engine, p)) return; // พายุไม่หยุด: โดนตีแล้วคอมโบไม่หลุด
    const src = engine.effectSourceId ? engine.players[engine.effectSourceId] : null;
    if (!src || src.id === p.id || engine.sameTeam(src, p)) return;
    breakCombo(engine, p, "โดนโจมตี");
  },

  onActorEnd(engine, p) { if (isMe(p)) { stopWindow(p); landAir(engine, p); } },
  // พายุไม่หยุด: เริ่มทำงานครั้งแรกของแมตช์ = คลิปให้ทุกคนดู (ต้นเทิร์น — แบบคลิปเข้ากลางคืนของฟ็อกซี่)
  onRoundDealt(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isMe(p) || !p.vergil || p.vergil.duelShown || !duelOn(engine, p)) continue;
      p.vergil.duelShown = true;
      engine.queueCutscene(p, CUT.duel);
    }
  },
  // พายุไม่หยุด: ต้นเทิร์นแต้มสกิล +2 · เกราะ +1
  onRoundStartTick(engine, p) {
    if (!isMe(p) || !duelOn(engine, p)) return;
    engine.addSkill(p, STORM.sp, "passive");
    engine.healArmor(p, STORM.armor);
    engine.log(`🌩️ ${p.name} พายุไม่หยุด — แต้มสกิล +${STORM.sp} · เกราะ +${STORM.armor}`);
  },
  onDeath(engine, p) { if (isMe(p)) { stopWindow(p); st(p).combo = 0; } },
  onEndTurn(engine) {
    for (const t of Object.values(engine.players)) {
      if (t.vergilAir && !((t.statuses && t.statuses.rooted) > 0)) delete t.vergilAir;
    }
  },

  // ---------- ปุ่ม HUD: เก็บดาบ (จบตาเดิน คอมโบไม่หลุด) · ตัวนับ HIT อยู่ที่ client VergilCombo ----------
  hudActions(engine, p) {
    if (!isMe(p) || !p.alive) return undefined;
    const mine = engine.actorId === p.id && engine.gameState === "ACTION";
    return [
      { key: "sheathe", icon: "⚔️", name: NAME.sheathe, row: "vergil", on: false, cd: 0, disabled: !mine },
      { key: "music", icon: "🎵", name: NAME.music, row: "vergil", on: !!st(p).music, cd: 0, disabled: false },
    ];
  },
  charAction(engine, p, key) {
    if (!isMe(p) || !p.alive) return false;
    // กล่องเพลง: กดเปิด/ปิดได้ทุกช่วง (ไม่ต้องเป็นตาตัวเอง · ไม่ใช้แต้ม) — ยกเว้นระหว่างคลิป
    if (key === "music") {
      if (engine.gameState === "CUTSCENE") return false;
      const s = st(p);
      s.music = !s.music;
      s.musicAt = engine.nextTransformCounter();
      engine.broadcastState();
      return true;
    }
    if (key !== "sheathe") return false;
    if (engine.actorId !== p.id || engine.gameState !== "ACTION") return false;
    stopWindow(p);
    engine.log(`⚔️ ${p.name} เก็บดาบ — ${st(p).combo} HIT`);
    if (p.pos) engine.boardFx(FX, { kind: "sheathe", id: p.id, at: { ...p.pos } });
    engine.finishActor();
    return true;
  },

  // กล่องเพลง: ทุกคนได้ยินระหว่างเปิด (state.skillMusic — at มากสุดชนะ)
  skillMusic(engine, p) {
    if (!isMe(p) || !p.alive || !p.vergil || !p.vergil.music) return null;
    return { music: MUSIC, at: p.vergil.musicAt || 0 };
  },

  // ผลค้างที่ตัดได้ (รากฐานจิตของเรียวกิ / Echo คืนร่าง)
  severables(engine, p) {
    if (!isMe(p) || !doppelOn(engine, p)) return [];
    return [{
      key: "doppel", label: NAME.ult, at: st(p).doppelAt || 0,
      cancel() { st(p).doppelUntil = 0; },
    }];
  },

  vergilState(engine, p) {
    if (!isMe(p)) return undefined;
    const s = st(p);
    return { combo: s.combo, left: Math.max(0, s.left), max: s.max, doppel: doppelOn(engine, p), at: JCE.at, target: s.target, storm: duelOn(engine, p), air: !!s.air, seq: s.seq || "", route: s.route, routeAt: s.routeAt || 0, routes: ROUTES.map((r) => ({ key: r.key, seq: r.seq, name: r.name, desc: r.desc })) };
  },
};
