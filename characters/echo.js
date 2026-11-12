// ============================================================
//  เจ้าหญิง Echo (พิเศษ · เล่นได้คนเดียวต่อเกม) — id "echo" · รื้อใหม่ทั้งตัว (ผู้ใช้สั่ง 2026-11-10 · GRID_PLAN §7.6)
//
//  ค่าพื้นฐาน: สเปกไม่ระบุ = พลังชีวิต 7 / เกราะ 3 / พลังโจมตี 1 · เดิน 4 · ตีประชิด · ตัว 1×1 ตลอด (ไม่ขยายร่างแล้ว)
//  สกิลพื้นฐาน ไดอารี่ความทรงจำ (0 แต้ม): เปิดสมุด เลือกตัวละครในเกม → ได้สกิลพื้นฐาน/รอง/ท่าไม้ตาย + สกิลติดตัวของตัวนั้น
//    เลือกได้ทุกตัว ยกเว้นตัวที่ซ้ำไม่ได้ (unique) ที่อยู่ในเกมนี้แล้ว · ตัวปกติซ้ำได้
//    ตัวที่มีแต่สกิลติดตัว (ไม่มีช่องสกิล เช่นเฟรดดี้) ก็สวมได้ — ได้สกิลติดตัวครบ (ผู้ใช้ 2026-11-12)
//    คัดลอกทุกอย่างของตัวนั้น รวมค่าสถานะ (เลือด/เกราะ/แต้มสกิลสูงสุด · ระยะเดิน/ระยะตีพื้นฐาน — ผู้ใช้สั่ง 2026-11-12 แทนกติกาเดิม "ค่าสถานะของ Echo ตลอด")
//    ยกเว้นโปรไฟล์ (ชื่อ/ภาพปก/ภาพบนกระดาน = Echo เสมอ) และสกิลติดตัวของ Echo เอง (ราชินีผู้อ่อนโยน) ที่ยังติดอยู่
//    หลังเปลี่ยนแล้ว ไดอารี่กลายเป็นปุ่มพิเศษบน HUD (ไม่ใช่ช่องสกิล) กดคืนร่าง → คูลดาวน์ 3 เทิร์นก่อนเลือกใหม่ (ผู้ใช้เลือก)
//  สกิลติดตัว ราชินีผู้อ่อนโยน: ต้นเทิร์นสุ่ม 1 อย่าง — แต้มสกิล +1 / เหรียญ +1 / พลังชีวิต +1 (ทำงานทั้งตอนเป็นร่างตัวเองและตอนเปลี่ยนสกิล)
//
//  กลไก "เปลี่ยนสกิล": p.characterId = ตัวที่เลือก (ฮุค/ข้อมูลสกิลทั้งหมดของตัวนั้นทำงานตามปกติ) · p.echoQ.mimic = id นั้น
//   - ค่าสถานะ: combat.maxHpOf/maxArmorOf/maxSkillOf + action.baseMovOf/baseRangeOf ใช้ statId(p) = ตัวที่เลือก
//     เลือด/เกราะ/แต้มตอนสวมร่างคงค่าเดิมไว้ แค่ไม่เกินเพดานใหม่ (clampVitals) — สวมร่างไม่ใช่การฟื้น
//   - ตัวตนจริง (กันตัว unique ซ้ำ · สถิติจบเกม) ใช้ baseId(p) = "echo"
//   - หน้าตา: view.js ทับชื่อ/ภาพปก/ภาพบนกระดานด้วยของ Echo (lookOf) · สกิลติดตัวที่แสดง = ของ Echo + ของตัวที่เลือก
//   - คืนร่าง: ตัดผลค้างทุกอย่างของตัวนั้น (server/sever.js) · ตัวใหญ่กลับ 1×1 · characterId กลับ "echo"
//   - จบเกม/เริ่มเกมใหม่: combat.resetCombat เรียก restoreBase ก่อนทุกอย่าง (ไม่ค้างร่างข้ามแมตช์)
// ============================================================

const { CHAR_BY_ID, CHARACTERS } = require("../characters.js");

const ID = "echo";
const REVERT_CD = 3;
// คลิปสกิลที่เกิดจากร่างที่ Echo สวม: ชื่อบนคลิป = "Recollection Time" + โปรไฟล์ Echo มุมขวาล่าง (ผู้ใช้สั่ง 2026-11-10)
const RECALL_TITLE = "Recollection Time";              // คืนร่างแล้วรอกี่เทิร์นก่อนเลือกใหม่ (ผู้ใช้เลือก)
const KIND_SP = "sp", KIND_GOLD = "gold", KIND_HP = "hp";
const DIARY_IMG = "/characters/echo/echo_diary.webp";
// โคลนตอนสวมร่างเคท & เอมิลิโกะ: ภาพ Echo กลับด้าน โทนเงาม่วงเข้ม (ผู้ใช้เลือก 2026-11-12)
const CLONE_IMG = "/characters/echo/echo_cover_shadow.webp";
// ตัวที่เลือกไม่ได้ (Claude ตัดสิน): ระบบคู่ (ผู้เล่น 1 คนคุม 2 ตัว — ตัวที่สองเกิดตอนเริ่มแมตช์เท่านั้น)
const BLOCKED = new Set([]); // ว่าง — Echo ต้องสวมร่างได้ทุกตัว (กฎผู้ใช้ 2026-11-12) · ห้ามเพิ่มเองโดยไม่ถามผู้ใช้
// ฟิลด์ที่ฮุค resetCombat ของบางตัวเขียนทับตอนเริ่มเกม แต่ตอนสวมร่างกลางเกมต้องคงของเดิม (ไม่งั้นเป็นช่องโกง/ล้างดีบัฟฟรี)
//  ทรัพยากร: แต้ม (เฟิร์น = Energy เต็ม) · เหรียญ (กิลกาเมช = 100) · กระเป๋า (โจรุโน่ = ธนู) · เลือด/เกราะ/สถานะ
//  ผลจากคนอื่นที่ติดบนตัว: TIME ของคาซุมะ · ม่าน/นกจาบ/ความฝันของโอเบรอน · คำอวยพรของยูนะ · การขี่ · ต้นไม้ของโจรุโน่ · ถูกเรียวกิสังหาร
const KEEP_ON_MIMIC = [
  "skillPoints", "gold", "inventory", "hp", "armor", "shield", "tempHp", "tempHpTurns", "statuses", "statusAmt",
  "kazumaTimeCut", "obsVeilStack", "obsLarkStack", "obsDreamQueue", "obsDreamUseRound", "yunaBlessAt",
  "mountId", "lastRidePos", "giornoTree", "ryougiSlain",
];
// ของประจำตัวที่ resetCombat แจก — ได้ครั้งเดียวต่อเกม (ไม่ปั๊มด้วยการสวมร่างซ้ำ) และหายตอนคืนร่างถ้ายังไม่ใช้
const KIT_ITEMS = { giorno_giovanna: "giornoArrow", kate: "kebread" }; // เคท: ขนมปังของเอมิลิโกะ (ได้ตอนโคลนเกิด)

const isEchoId = (p) => !!p && p.characterId === ID;
const mimicking = (p) => !!(p && p.echoQ && p.echoQ.mimic);
// Echo ทั้งร่างตัวเองและตอนเปลี่ยนสกิล
const isEcho = (p) => isEchoId(p) || mimicking(p);
function fresh() { return { mimic: null, readyAt: 0, mimicAt: 0, lastGift: null, kits: [] }; }
function st(p) { return p.echoQ || (p.echoQ = fresh()); }
const lazyCombat = () => require("../server/combat");
const lazyHooks = () => require("./index");
// เป็นสมาชิกช่วง Clock Up อยู่ (server/clockUp.js) — คืนร่างกลางช่วงไม่ได้ (ระบบช่วงผูกกับร่างไรเดอร์)
const inClockUp = (p) => { try { return !!require("../server/clockUp").activeMember(p); } catch { return false; } };

// ตัวละครที่ใช้ค่าสถานะพื้นฐาน (เลือด/เกราะ/แต้มสกิล/ระยะเดิน/ระยะตี) — ตอนสวมร่าง = ของร่างนั้น (ผู้ใช้สั่ง 2026-11-12)
const statId = (p) => p && p.characterId;
// ตัวตนจริงของผู้เล่น (สวมร่างอยู่ = "echo") — กันเลือกตัว unique ซ้ำ · สถิติจบเกม
const baseId = (p) => (mimicking(p) ? ID : p && p.characterId);

// ---------- รายชื่อตัวละครในสมุด ----------
// มีอะไรให้สวม: สกิลอย่างน้อยหนึ่งช่อง หรือสกิลติดตัว (ตัวที่มีแต่สกิลติดตัวอย่างเฟรดดี้ก็สวมได้ — ผู้ใช้ 2026-11-12)
function hasKit(ch) {
  return !!(ch.basic || ch.secondary || ch.ultimate || ch.passive || ch.passive2);
}
function skillLine(ch) {
  const out = [];
  if (ch.basic) out.push(`พื้นฐาน: ${ch.basic.name}`);
  if (ch.secondary) out.push(`รอง: ${ch.secondary.name}`);
  if (ch.ultimate) out.push(`ท่าไม้ตาย: ${ch.ultimate.name}`);
  if (!out.length) for (const ps of [ch.passive, ch.passive2]) if (ps && ps.name) out.push(`ติดตัว: ${ps.name}`);
  return out.join(" · ");
}
// ตัวละครซ้ำไม่ได้ที่อยู่ในเกมนี้แล้ว (นับทั้งตัวที่เลือกมาจริงและร่างที่ Echo คนอื่นสวมอยู่ — Echo มีได้คนเดียว แต่กันไว้)
function takenUnique(engine, self) {
  const out = new Set();
  for (const q of Object.values(engine.players)) {
    if (!q || q.id === self.id || q.summon || !q.characterId) continue;
    const ch = CHAR_BY_ID[q.characterId];
    if (ch && ch.unique) out.add(q.characterId);
  }
  return out;
}
function pickable(engine, p, id) {
  const ch = CHAR_BY_ID[id];
  if (!ch || ch.hidden || id === ID || BLOCKED.has(id) || ch.duoOnly) return false;
  if (!hasKit(ch)) return false;
  if (ch.unique && takenUnique(engine, p).has(id)) return false;
  return true;
}
function bookChoices(engine, p) {
  const out = [];
  for (const ch of CHARACTERS) {
    if (!ch || ch.hidden || ch.id === ID || BLOCKED.has(ch.id) || ch.duoOnly) continue;
    if (!hasKit(ch)) continue;
    const ok = pickable(engine, p, ch.id);
    out.push({
      key: ch.id,
      name: ch.rosterName || ch.name,
      img: ch.cover || ch.img,
      difficulty: ch.difficulty || null,
      desc: skillLine(ch),
      locked: !ok,
      cost: 0,
    });
  }
  return out;
}

// ---------- เปลี่ยนสกิล / คืนร่าง ----------
function mimic(engine, p, id) {
  const ch = CHAR_BY_ID[id];
  const s = st(p);
  s.mimic = id;
  s.mimicAt = engine.severStamp();
  p.characterId = id;
  // สถานะเฉพาะตัวของตัวละครนั้น (ฮุค resetCombat ของตัวนั้นเท่านั้น — ไม่แตะโมดูลอื่น) · ของที่ต้องคงไว้คืนค่ากลับ
  const hook = lazyHooks()[id];
  if (hook && typeof hook.resetCombat === "function") {
    const keep = {};
    // สำเนาตื้น — ฮุคบางตัวแก้อาร์เรย์/อ็อบเจกต์เดิมตรงๆ (โจรุโน่ push ธนูเข้า p.inventory)
    for (const k of KEEP_ON_MIMIC) if (k in p) keep[k] = Array.isArray(p[k]) ? [...p[k]] : p[k] && typeof p[k] === "object" ? { ...p[k] } : p[k];
    const kitType = KIT_ITEMS[id];
    const invBefore = new Set((p.inventory || []).map((it) => it && it.uid));
    lazyCombat().runHook(hook, "resetCombat", p);
    const kit = kitType ? (p.inventory || []).find((it) => it && it.type === kitType && !invBefore.has(it.uid)) : null;
    for (const k of KEEP_ON_MIMIC) { if (k in keep) p[k] = keep[k]; else delete p[k]; }
    // ของประจำตัว: ได้ครั้งเดียวต่อเกม
    if (kit && !(s.kits || []).includes(kitType)) {
      p.inventory = [...(p.inventory || []), kit];
      s.kits = [...(s.kits || []), kitType];
    }
  }
  // แต้มสกิล/เลือด/เกราะไม่เกินเพดานของร่างใหม่ (ฮุคบางตัวเติมค่าเริ่มต้นเอง)
  clampVitals(engine, p);
  engine.log(`📖 ${p.name} เปิดไดอารี่ความทรงจำ — ได้สกิลของ ${ch ? ch.rosterName || ch.name : id}`);
  if (ch && ch.duo) spawnClone(engine, p); // ตัวละครคู่: Echo อีกคนเกิดข้างๆ
  return ch ? ch.rosterName || ch.name : id;
}
function clampVitals(engine, p) {
  const c = lazyCombat();
  p.hp = Math.min(p.hp, c.maxHpOf(p));
  p.armor = Math.min(p.armor || 0, c.maxArmorOf(p));
  p.skillPoints = Math.min(p.skillPoints || 0, c.maxSkillOf(p));
}
// ตัดผลค้างทุกอย่างของร่างที่สวมอยู่ (ฮุค severables ของตัวนั้น — ร่างแปลง/สถานะจากสกิล/ท่าที่รอ)
function severAll(engine, p) {
  const Sever = require("../server/sever");
  const cut = [];
  for (let i = 0; i < 40; i++) {
    const e = Sever.latest(engine, p);
    if (!e || e.key === "echoDiary") break; // เหลือแค่ตัวร่างเอง = ตัดครบแล้ว (คืนร่างทำต่อเอง)
    const r = Sever.cut(engine, p);
    if (!r) break;
    cut.push(r.label);
  }
  return cut;
}
// ---------- สวมร่างเคท & เอมิลิโกะ (ตัวละครคู่) = Echo อีกคนเกิดข้างๆ (ผู้ใช้ 2026-11-12) ----------
//  Echo = เคท (เจ้าของ) · โคลน = เอมิลิโกะ (ระเบียนคู่แบบ server/duo.js — id "<Echo>~duo" · ใช้แต้ม/เหรียญ/กระเป๋าร่วมกัน)
//  หน้าตาโคลน = Echo กลับด้าน โทนเงาม่วงเข้ม · ชื่อ Echo
//  โคลนตาย = หายไป (ไม่ทิ้งร่าง) · Echo เล่นต่อในร่างเคทคนเดียว (กระจกเงา/ตื่นขึ้นอีกครั้งใช้ไม่ได้ — ไม่มีคู่)
//  Echo ตาย = โคลนหายไปด้วย (ฝ่ายนี้ตกรอบ) · คืนร่าง = โคลนหาย
const isClone = (p) => !!(p && p.echoClone);
function cloneOf(p) {
  const id = p && p.duoWith;
  const u = id && require("../server/match").players[id];
  return u && u.echoClone ? u : null;
}
function spawnClone(engine, p) {
  const Duo = require("../server/duo");
  const match = require("../server/match");
  const partnerId = CHAR_BY_ID[p.characterId] && CHAR_BY_ID[p.characterId].duo;
  const ch = partnerId && CHAR_BY_ID[partnerId];
  if (!ch || cloneOf(p) || !p.pos) return null;
  const at = engine.nearFreeTile(p.pos);
  if (!at) return null;
  const id = p.id + Duo.SUFFIX;
  const me = CHAR_BY_ID[ID];
  const mate = {
    id, duoOf: p.id, echoClone: true, connected: true, ready: true, socketId: null, sessionToken: null,
    teamId: p.teamId || null, teamConfirmed: true, modeVote: null,
    name: me.name, customColor: p.customColor, position: p.position,
    characterId: ch.id, avatar: 0, img: CLONE_IMG,
    locked: true, busted: false, result: null,
    hp: 0, armor: 0, alive: true, shield: 0, statuses: {}, statusAmt: {},
    seen: {}, transformAt: 0, cutsceneShown: {}, skillUsedRound: false, ultRound: 0,
    tempHp: 0, tempHpTurns: 0, sleepFresh: false, pos: { ...at }, boardSize: 1,
    dmgHp: 0, dmgArmor: 0, gainedSkill: 0, wasAttacked: false, corpse: null,
  };
  for (const k of ["skillPoints", "gold", "inventory", "cards", "whistleReady"]) {
    Object.defineProperty(mate, k, {
      enumerable: true, configurable: true,
      get() { const own = match.players[mate.duoOf]; return own ? own[k] : undefined; },
      set(v) { const own = match.players[mate.duoOf]; if (own) own[k] = v; },
    });
  }
  match.players[id] = mate;
  p.duoWith = id;
  // สถานะเฉพาะตัวของคู่ (ฮุค resetCombat ของเคท & เอมิลิโกะ — ขนมปังได้ครั้งเดียวต่อเกม)
  const s = st(p);
  const invBefore = new Set((p.inventory || []).map((it) => it && it.uid));
  const hook = lazyHooks()[ch.id];
  if (hook && typeof hook.resetCombat === "function") lazyCombat().runHook(hook, "resetCombat", mate);
  const bread = (p.inventory || []).filter((it) => it && it.type === KIT_ITEMS.kate && !invBefore.has(it.uid));
  if (bread.length && (s.kits || []).includes(KIT_ITEMS.kate)) p.inventory = p.inventory.filter((it) => !bread.includes(it));
  else if (bread.length) s.kits = [...(s.kits || []), KIT_ITEMS.kate];
  const c = lazyCombat();
  mate.hp = c.maxHpOf(mate);
  mate.armor = c.maxArmorOf(mate);
  if (match.duo && match.duo.ownerId === p.id) match.duo.done[id] = true; // ตานี้โคลนยังไม่ได้เดิน — เริ่มเดินตาหน้า
  engine.log(`🪞 ${p.name} — Echo อีกคนปรากฏข้างกาย (${ch.name})`);
  if (engine.boardFx) engine.boardFx("shadowFx", { kind: "revive", by: p.id, id, at: { ...at } });
  return mate;
}
// โคลนหาย (คืนร่าง / Echo ตาย / โคลนตาย / จบชีวิตแบบเกิดใหม่) — ลบระเบียนออกจากแมตช์
function removeClone(p) {
  const match = require("../server/match");
  const m = cloneOf(p);
  if (p) delete p.duoWith;
  if (!m) return;
  if (match.duo && match.duo.ownerId === p.id) { delete match.duo.acts[m.id]; match.duo.done[m.id] = true; }
  delete match.players[m.id];
}

function revert(engine, p, { cooldown = true, silent = false } = {}) {
  const s = st(p);
  if (!s.mimic) return false;
  const was = CHAR_BY_ID[s.mimic];
  if (p.alive) severAll(engine, p);
  removeClone(p); // เคท & เอมิลิโกะ: Echo อีกคนหายไป
  if (p.alive && p.pos && engine.sizeOf(p) > 1) engine.resizeUnit(p, 1);
  // ของประจำตัวของร่างนั้นที่ยังไม่ใช้ = หาย (โจรุโน่: ธนู)
  const kitType = KIT_ITEMS[s.mimic];
  if (kitType && Array.isArray(p.inventory)) p.inventory = p.inventory.filter((it) => !it || it.type !== kitType);
  p.characterId = ID;
  p.img = CHAR_BY_ID[ID].img;
  s.mimic = null;
  if (cooldown) s.readyAt = engine.roundNumber + REVERT_CD;
  clampVitals(engine, p);
  if (!silent) engine.log(`📖 ${p.name} ปิดไดอารี่ความทรงจำ — คืนร่างจาก ${was ? was.rosterName || was.name : "?"}`);
  return true;
}

// ---------- ราชินีผู้อ่อนโยน ----------
function gentleQueen(engine, p) {
  const kinds = [KIND_SP, KIND_GOLD, KIND_HP];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  st(p).lastGift = kind;
  if (kind === KIND_SP) {
    const before = p.skillPoints;
    lazyCombat().addSkill(p, 1, "passive");
    engine.log(`👑 ${p.name} — ราชินีผู้อ่อนโยน: แต้มสกิล +${p.skillPoints - before}`);
  } else if (kind === KIND_GOLD) {
    const got = engine.addGold(p, 1);
    engine.log(`👑 ${p.name} — ราชินีผู้อ่อนโยน: เหรียญ +${got}`);
  } else {
    const got = engine.healHp(p, 1);
    engine.log(`👑 ${p.name} — ราชินีผู้อ่อนโยน: พลังชีวิต +${got}`);
  }
}

module.exports = {
  id: ID,
  REVERT_CD, DIARY_IMG, BLOCKED, RECALL_TITLE,
  isEcho, mimicking, statId, baseId, pickable, bookChoices, mimic, revert, isClone, cloneOf, CLONE_IMG,

  // ---------- จุดที่ engine เรียกตรง (ไม่ผ่านฮุคตาม characterId — ตอนเปลี่ยนสกิล characterId เป็นของตัวอื่น) ----------
  // combat.resetCombat: เริ่ม/จบแมตช์ = กลับร่างตัวเองก่อนทุกอย่าง
  restoreBase(p) {
    if (mimicking(p)) { removeClone(p); p.characterId = ID; p.echoQ.mimic = null; }
  },
  // view.js: หน้าตาตอนเปลี่ยนสกิล — ชื่อ/ภาพปก/ภาพบนกระดานของ Echo · สกิลติดตัว = Echo + ตัวที่เลือก
  lookOf(p) {
    if (isClone(p)) { // โคลน: Echo กลับด้าน โทนเงาม่วง · สกิลติดตัวของเอมิลิโกะ
      const me = CHAR_BY_ID[ID], other = CHAR_BY_ID[p.characterId] || {};
      const pas = (x) => (x ? { name: x.name, desc: x.desc } : null);
      return { name: me.name, img: CLONE_IMG, boardImg: CLONE_IMG, passive: pas(other.passive), passive2: pas(other.passive2), passive3: null };
    }
    if (!mimicking(p)) return null;
    const me = CHAR_BY_ID[ID], other = CHAR_BY_ID[p.echoQ.mimic] || {};
    const pas = (x) => (x ? { name: x.name, desc: x.desc } : null);
    return {
      name: me.name, img: me.cover || me.img, boardImg: me.img,
      passive: pas(me.passive),
      passive2: pas(other.passive),
      passive3: pas(other.passive2),
    };
  },
  // server/cutscene.js + engine.setArjunaUlt: คลิปของผู้เล่นคนนี้เกิดจากร่างที่สวมไหม → ป้ายโปรไฟล์ Echo (client RecallBadge)
  recallOf(p) {
    if (!mimicking(p)) return null;
    const me = CHAR_BY_ID[ID];
    return { img: me.cover || me.img, name: me.name, color: require("../server/lobby").colorOf(p) };
  },
  // view.js: ปุ่มพิเศษบน HUD ตอนเปลี่ยนสกิล = ไดอารี่ (คืนร่าง)
  queenActions(engine, p) {
    if (!mimicking(p) || !p.alive) return [];
    return [{ key: "echo:diary", icon: "📖", img: DIARY_IMG, name: CHAR_BY_ID[ID].basic.name, disabled: !engine.canAct(p) || inClockUp(p) }];
  },
  // server/sever.js: ร่างที่สวมจากไดอารี่ = ผลสกิลที่ถูกตัดได้ (รากฐานจิตของเรียวกิ) → คืนร่าง + คูลดาวน์ตามปกติ
  //  at = ตอนสวมร่าง (เก่ากว่าผลที่ร่างนั้นเปิดทีหลังเสมอ — ตัดผลของร่างนั้นก่อน)
  mimicSeverables(engine, p) {
    if (!mimicking(p)) return [];
    const ch = CHAR_BY_ID[p.echoQ.mimic];
    return [{ key: "echoDiary", label: `${CHAR_BY_ID[ID].basic.name} (${ch ? ch.rosterName || ch.name : ""})`, at: p.echoQ.mimicAt || 0, cancel() { revert(engine, p); } }];
  },
  // socket charAction "echo:…" (ส่งตรงมาที่โมดูลนี้ไม่ว่าจะสวมร่างใครอยู่)
  queenAction(engine, p, key) {
    if (key !== "echo:diary" || !mimicking(p) || !p.alive || !engine.canAct(p)) return false;
    if (inClockUp(p)) return false; // ช่วง Clock Up (ไรเดอร์ ZECT) — สมาชิกต้องจบช่วงก่อน
    revert(engine, p);
    return true;
  },

  // ---------- ฮุคตามปกติ (characterId === "echo") ----------
  resetCombat(p) {
    if (isEchoId(p)) p.echoQ = fresh();
    else if (!mimicking(p)) p.echoQ = null;
  },
  // ฮุค broadcast ตอนใครก็ตามตาย: โคลนตาย = หายไป (ไม่ทิ้งร่าง) · Echo ที่มีโคลนตาย = โคลนหายด้วย ฝ่ายนี้ตกรอบ
  onDeath(engine, dead) {
    if (isClone(dead)) {
      // ระเบียนยังอยู่ (ตาย ไม่มีร่าง = ไม่ขึ้นบนกระดาน) — ลบตอนคืนร่าง · ไม่ลบกลางตาเดิน (อาจเป็นตัวที่กำลังคุม)
      dead.corpse = null;
      engine.log(`🪞 Echo อีกคนเลือนหายไป`);
      return;
    }
    if (mimicking(dead) && cloneOf(dead)) {
      const m = cloneOf(dead);
      m.alive = false; m.hp = 0; m.corpse = null; m.result = "dead"; m.locked = true;
      dead.corpse = null; dead.result = "dead"; dead.locked = true;
    }
  },
  // ตีปกติร่างตัวเอง = คลื่นเสียง (ท่าเดิมของ Echo 1×1)
  attackStyle(p) { return isEchoId(p) ? "echo" : null; },

  // ต้นเทิร์น (ทุกโมดูล — เช็คเองว่าเป็น Echo ไหม เพราะตอนเปลี่ยนสกิล characterId เป็นของตัวอื่น)
  onRoundStartTick(engine, p) {
    if (!isEcho(p) || !p.alive) return;
    gentleQueen(engine, p);
  },

  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isEchoId(p)) return true;
    if (tier !== "basic") return false;
    if (engine.roundNumber < st(p).readyAt) return false;
    return !!opts.form && pickable(engine, p, opts.form);
  },
  // เปิดไดอารี่ไม่กินโควตาสกิลของเทิร์น และยังเดินต่อได้ (Claude ตัดสิน — ได้สกิลใหม่แล้วใช้ในตาเดียวกันได้)
  skipsTurnQuota(p, tier) { return isEchoId(p) && tier === "basic"; },
  keepsMove(engine, p, tier) { return isEchoId(p) && tier === "basic"; },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isEchoId(p) || tier !== "basic" || !opts.form) return "";
    const name = mimic(engine, p, opts.form);
    return ` — ${name}`;
  },
  // ปุ่มไดอารี่ = สมุดเลือกตัวละคร (client: DiaryBook) · ตัวเลือก = ตัวละครทุกตัว
  skillPub(p, tier) {
    if (!isEchoId(p) || tier !== "basic") return null;
    const engine = require("../server/engine").engine;
    return { book: true, choices: bookChoices(engine, p) };
  },
  skillLocks(engine, p) {
    if (!isEchoId(p)) return undefined;
    return { basic: { cd: Math.max(0, st(p).readyAt - engine.roundNumber) } };
  },
};
