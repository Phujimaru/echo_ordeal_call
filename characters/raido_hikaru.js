// ============================================================
//  ไรโด ฮิคารุ — ระดับกลาง · id "raido_hikaru" · สเปกที่ผู้ใช้ตัดสิน: .claude/plans/raido-hikaru-handoff.md
//
//  ค่าพื้นฐาน: เลือด 7 / เกราะ 3 (ค่ามาตรฐาน) · เดิน 4 · ตีประชิด [1, 1]
//  สกิลพื้นฐาน UltraLive (0 แต้ม · ไม่นับเป็นการใช้สกิล): เลือก 1 ใน 6 ร่าง หรือ "คืนร่าง" · เทิร์นละ 1 ครั้ง · ใช้ไม่ได้ระหว่างร่างกิงกะ
//    ทุกร่างตัว 3×3 (เดิน 3 · เดินพังสิ่งกีดขวาง — แบบกิงกะ) · คืนร่าง = กลับ 1×1
//    ทุกร่าง: เกราะสูงสุด +2 · เข้าร่างฟื้นเกราะ 2 (ฟื้นได้อีกเมื่อผ่านไป 5 เทิร์น) · เกราะลดเท่าไร ฟื้นพลังชีวิตเท่านั้น
//    คืนร่าง = ตัดเกราะส่วนเกินเพดาน
//    แบล็คคิง: ตีปกติแนวตรง 1×3 โดนทุกศัตรูในแนว · ทันเดอร์ดารัมเบีย: ตีปกติติดช็อต 1 เทิร์น
//    มนุษย์ดาวเคมู: ตีปกติติดพิษร้าย 1 เทิร์น · ไม่ถูกโจมตี/ไม่เสียหาย 2 เทิร์นติด = เทิร์นถัดไปล่องหน 1 เทิร์น
//    คิงแพนด้อน: ระยะตี [1, 3] · ตีปกติติดลุกไหม้ 1 · ดอรากอรี่: ตีปกติติดเลือดไหล 1
//    Ultraman Tiga: พลังโจมตี +1 · แม่นยำ
//    ทุกร่างอยู่ 3 เทิร์นแล้วคืนร่างเอง · ร่างจบ (หมดเวลา / เปลี่ยนร่าง / คืนร่าง) = ร่างนั้นคูลดาวน์ 5 เทิร์น แยกรายร่าง (ผู้ใช้สั่ง 2026-10-14)
//  สกิลรอง Ultraman Ginga (4 แต้ม · ร่างปกติเท่านั้น): 5 เทิร์น · ตัว 3×3 (เดิน 3 · เดินพังสิ่งกีดขวาง)
//    ตีปกติ +1 ช่องติดตัวทั้งด้าน 1×3 (ศัตรูทุกคนที่ติดด้านนั้น) · หมดแล้วคูลดาวน์ 3 เทิร์น
//  ท่าไม้ตาย (ร่างกิงกะเท่านั้น · ลำแสงหลบไม่ได้): Ginga Cross Shoot (4 แต้ม) แนว 5×1 ดาเมจ 2 + ลุกไหม้ 2
//    กิงกะสโตเรี่ยม → Strium Ray (6 แต้ม) แนว 5×3 ดาเมจ 2 + ลุกไหม้ 3 + ผลักไปสุดปลายลำแสง
//  ติดตัว Strium Brace: สะสมครบ 5 (รวมทั้งเกม · ห่วงเวลาซีโร่ไม่นับ — ผู้ใช้สั่งลดจาก 10 เมื่อ 2026-10-13)
//    +1 ทุกครั้งที่จบเทิร์นในร่างกิงกะช่วงกลางวัน · +1 ทันทีตอนกดแปลงร่างกิงกะช่วงกลางวัน
//    = กลายเป็นกิงกะสโตเรี่ยมทันที และกดกิงกะครั้งต่อไปเป็นสโตเรี่ยมเสมอ · สโตเรี่ยม: ตีปกติ +1 อีก + ติดลุกไหม้ 1
//  คลิปทุกตัวเล่นครั้งเดียวต่อเกม (engine.triggerCutscene — ครั้งต่อไปเป็นการ์ดแจ้งเตือน)
//
//  Claude ตัดสินเอง (บอกผู้ใช้แล้ว): ช็อต/พิษร้ายจากตีปกติเก็บ 2 เทิร์นในโค้ด (จบเทิร์นนี้ลด 1 = มีผลเต็ม 1 เทิร์นถัดไป แบบหนามพิษ)
// ============================================================

const ID = "raido_hikaru";
const DIR = "/characters/raido_hikaru";
const IMG = {
  base: `${DIR}/hikaru.jpg`,
  skill1: `${DIR}/hikaru_skill1.webp`,
  skill2: `${DIR}/hikaru_skill2.webp`,
  skill2Strium: `${DIR}/hikaru_skill2_strium.webp`,
  skill3: `${DIR}/hikaru_skill3.jpg`,
  skill3Strium: `${DIR}/hikaru_skill3_strium.webp`,
  ginga: `${DIR}/ginga.jpg`,
  strium: `${DIR}/ginga_strium.jpg`,
};
const VIDEO = {
  ginga: `${DIR}/hikaru_skill2.mp4`,
  strium: `${DIR}/hikaru_strium.mp4`,
  cross: `${DIR}/hikaru_skill3.mp4`,
  ray: `${DIR}/hikaru_strium_ray.mp4`,
};
// ร่าง UltraLive (เรียงตามปุ่ม) — cut = คีย์คลิปใน characters/_transforms.js · style = ท่าตีปกติบนกระดาน (client/src/board/hikaruFx.js)
//  sfx = เสียงตีปกติ (คีย์ใน client/src/audio.js)
const FORMS = {
  blackking: { name: "แบล็คคิง", img: `${DIR}/form_blackking.jpg`, video: `${DIR}/form_blackking.mp4`, cut: "hkBlackKing", style: "hkBlack", sfx: "hk_black" },
  thunder: { name: "ทันเดอร์ดารัมเบีย", img: `${DIR}/form_thunderdarambia.webp`, video: `${DIR}/form_thunderdarambia.mp4`, cut: "hkThunder", style: "hkThunder", sfx: "hk_thunder" },
  kemur: { name: "มนุษย์ดาวเคมู", img: `${DIR}/form_kemurjin.webp`, video: `${DIR}/form_kemurjin.mp4`, cut: "hkKemur", style: "hkKemur", sfx: "hk_kemur" },
  pandon: { name: "คิงแพนด้อน", img: `${DIR}/form_kingpandon.webp`, video: `${DIR}/form_kingpandon.mp4`, cut: "hkPandon", style: "hkPandon", sfx: "hk_pandon" },
  doragory: { name: "ดอรากอรี่", img: `${DIR}/form_doragory.webp`, video: `${DIR}/form_doragory.mp4`, cut: "hkDoragory", style: "hkDoragory", sfx: "hk_doragory" },
  tiga: { name: "Ultraman Tiga", img: `${DIR}/form_tiga.jpg`, video: `${DIR}/form_tiga.mp4`, cut: "hkTiga", style: "hkTiga", sfx: "hk_tiga" },
};
const FORM_KEYS = Object.keys(FORMS);
const NORMAL = "normal"; // ปุ่ม "คืนร่าง"
const CUT = { ginga: "hkGinga", strium: "hkStrium", cross: "hkCross", ray: "hkStriumRay" };

const FORM_ARMOR = 2;      // เกราะสูงสุด +2 ระหว่างร่าง 1–6
const FORM_ARMOR_HEAL = 2; // เข้าร่างฟื้นเกราะ 2
const ARMOR_HEAL_CD = 5;   // ฟื้นเกราะตอนเข้าร่างได้อีกเมื่อผ่านไป 5 เทิร์น
const LANE_RANGE = [1, 3]; // แบล็คคิง: แนวตรงยาว 3 จากขอบตัว
const FACE_RANGE = [1, 1]; // กิงกะ: ช่องติดตัวทั้งด้าน (กว้างเท่าตัว 3 ช่อง — ผู้ใช้สั่ง 2026-10-12: ตีแค่ระยะตัว)
const PANDON_RANGE = [1, 3];
const FORM_TURNS = 3;      // ทุกร่างอยู่ 3 เทิร์น (สถานะ hikaruForm)
const FORM_CD = 5;         // ร่างจบแล้วร่างนั้นเรียกซ้ำได้อีกหลัง 5 เทิร์น (แยกรายร่าง)
const TIGA_ATK = 1;
const KEMUR_CALM = 2;      // เทิร์นติดที่ไม่โดนอะไรเลย → ล่องหน
const GINGA_TURNS = 5;
const GINGA_CD = 3;
const GINGA_SIZE = 3;      // ตัวใหญ่ทั้งร่าง UltraLive และกิงกะ (ผู้ใช้สั่ง 2026-10-12)
const GINGA_MOV = 3;       // เท่า Echo ตัว 3×3
const GINGA_ATK = 1;
const STRIUM_ATK = 1;      // บวกเพิ่มจากกิงกะ (รวม +2)
const BRACE_MAX = 5;
const BEAM_LEN = 5;
const BEAM_DMG = 2;
const CROSS_BURN = 2;
const RAY_BURN = 3;
const CROSS_COST = 4;
const RAY_COST = 6;
const CROSS_AREA = { kind: "line", len: BEAM_LEN, width: 1, hostile: true };
const RAY_AREA = { kind: "line", len: BEAM_LEN, width: 3, hostile: true };
// จังหวะบนกระดาน (ต้องตรงกับ client/src/board/hikaruFx.js — HK_BEAM_MS / HK_PUSH_MS)
const BEAM_SECONDS = 1.9;
const PUSH_SECONDS = 0.9;
const LINE_DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

const isHikaru = (p) => !!p && p.characterId === ID;
function fresh() {
  return {
    form: null,       // ร่าง UltraLive ปัจจุบัน (คีย์ใน FORMS) · null = ร่างปกติ
    formRound: 0,     // เทิร์นที่เปลี่ยน/คืนร่างล่าสุด (เทิร์นละ 1 ครั้ง)
    armorReady: 0,    // ฟื้นเกราะตอนเข้าร่างได้อีกเมื่อ roundNumber >= ค่านี้
    formReady: {},    // คีย์ร่าง → เรียกร่างนั้นได้อีกเมื่อ roundNumber >= ค่านี้
    accUntil: 0,      // แม่นยำที่มีอยู่ก่อนเข้า Tiga อยู่ถึงเทิร์นไหน (คืนให้ตอนออกจากร่าง)
    ginga: false,
    gingaReady: 0,
    strium: false,    // ปลดสโตเรี่ยมแล้ว (Strium Brace ครบ)
    brace: 0,
    kemurCalm: 0,     // เทิร์นติดที่ไม่โดนอะไรเลยในร่างเคมู
    kemurSnap: null,  // ค่าก่อนเข้าร่างเคมูในเทิร์นที่เข้า (ดาเมจก่อนเข้าร่างไม่นับ)
    hidden: false,    // ล่องหน (ร่างเคมู)
    logCut: 0,
    logRound: 0,
  };
}
function st(p) { return p.hikaru || (p.hikaru = fresh()); }
const formOf = (p) => (isHikaru(p) ? st(p).form : null);
const inForm = (p) => !!formOf(p);
const gingaOn = (p) => isHikaru(p) && !!st(p).ginga;
const striumOn = (p) => gingaOn(p) && !!st(p).strium;
const bigOn = (p) => inForm(p) || gingaOn(p); // ตัว 3×3
const boardSize = (p) => Math.max(1, (p && p.boardSize) | 0);
const left = (ready, round) => Math.max(0, (ready || 0) - round);

// ---------- แม่นยำของ Tiga ----------
//  เข้าร่าง: แม่นยำ = max(เดิม, 3) · ออกจากร่าง: คืนเท่าที่แม่นยำเดิมยังเหลือ (atEnd = ออกตอนจบเทิร์น หลังลูปลดเทิร์นสถานะ)
function giveTigaAccuracy(engine, p) {
  const s = st(p), cur = p.statuses.accurate || 0;
  s.accUntil = cur > 0 ? engine.roundNumber + cur - 1 : 0;
  p.statuses.accurate = Math.max(cur, FORM_TURNS);
}
function stripTigaAccuracy(engine, p, atEnd) {
  const s = st(p);
  const from = engine.roundNumber + (atEnd ? 1 : 0);
  const keep = s.accUntil >= from ? s.accUntil - from + 1 : 0;
  s.accUntil = 0;
  if ((p.statuses.accurate || 0) <= keep) return;
  if (keep > 0) p.statuses.accurate = keep;
  else delete p.statuses.accurate;
}
const formCd = (s, key, round) => left((s.formReady || {})[key], round);
// ออกจากร่าง UltraLive (หมดเวลา / เปลี่ยนร่าง / คืนร่าง) → ร่างนั้นคูลดาวน์ทันที เริ่มนับจากเทิร์นถัดไป · ไม่แตะ s.form
function leaveForm(engine, p, atEnd) {
  const s = st(p), key = s.form;
  if (!key) return;
  delete p.statuses.hikaruForm;
  if (key === "tiga") stripTigaAccuracy(engine, p, atEnd);
  if (key === "kemur") leaveKemur(engine, p);
  (s.formReady || (s.formReady = {}))[key] = engine.roundNumber + 1 + FORM_CD;
}
function leaveKemur(engine, p) {
  const s = st(p);
  if (s.hidden) reveal(engine, p);
  s.kemurCalm = 0;
  s.kemurSnap = null;
}
function reveal(engine, p) {
  const s = st(p);
  if (!s.hidden) return;
  s.hidden = false;
  s.logCut = engine.lastLogLength;
  s.logRound = engine.roundNumber;
  engine.log(`🌫️ ${p.name} ปรากฏตัวบนสนาม!`);
}
function capArmor(engine, p) {
  p.armor = Math.min(p.armor, engine.maxArmorOf(p));
}

// เปลี่ยนร่าง UltraLive (key ใน FORMS หรือ NORMAL = คืนร่าง)
function setForm(engine, p, key) {
  const s = st(p);
  leaveForm(engine, p, false);
  s.formRound = engine.roundNumber;
  if (key === NORMAL) {
    s.form = null;
    capArmor(engine, p);
    if (p.alive) engine.resizeUnit(p, 1);
    engine.log(`🔆 ${p.name} คืนร่าง`);
    return " — คืนร่าง";
  }
  const f = FORMS[key];
  s.form = key;
  p.statuses.hikaruForm = FORM_TURNS;
  if (key === "tiga") giveTigaAccuracy(engine, p);
  if (key === "kemur") {
    s.kemurCalm = 0;
    s.kemurSnap = { hp: p.dmgHp || 0, armor: p.dmgArmor || 0, attacked: !!p.wasAttacked };
  }
  let healed = 0;
  if (engine.roundNumber >= s.armorReady) {
    healed = engine.healArmor(p, FORM_ARMOR_HEAL);
    s.armorReady = engine.roundNumber + ARMOR_HEAL_CD;
  }
  engine.triggerCutscene(p, f.cut);
  // ร่าง UltraLive ตัว 3×3 (ผู้ใช้สั่ง) — ขยายหลังคลิป · เปลี่ยนร่างต่อร่าง = ขนาดเดิม · ขยายไม่ได้ = ลองใหม่ต้นเทิร์น
  if (boardSize(p) !== GINGA_SIZE) engine.deferAfterCutscene(() => { if (p.alive && bigOn(p)) engine.resizeUnit(p, GINGA_SIZE); });
  engine.log(`🔆 ${p.name} UltraLive — ${f.name}${healed ? ` · ฟื้นเกราะ +${healed}` : ""}`);
  return ` — ${f.name}`;
}

// ---------- Ultraman Ginga ----------
// Strium Brace +1 (กลางวัน · ห่วงเวลาซีโร่ไม่นับ) — ครบแล้วเป็นสโตเรี่ยม · คืน true ถ้าเพิ่งครบ
function braceTick(engine, p) {
  const s = st(p);
  if (s.strium || engine.zeroActive() || engine.isNightRound(engine.worldRound)) return false;
  s.brace = Math.min(BRACE_MAX, s.brace + 1);
  if (s.brace < BRACE_MAX) return false;
  s.strium = true;
  engine.log(`🌈 ${p.name} — Strium Brace ครบ ${BRACE_MAX}: กลายเป็นกิงกะสโตเรี่ยม!`);
  return true;
}

function startGinga(engine, p) {
  const s = st(p);
  braceTick(engine, p); // แปลงร่างกลางวัน = +1 ทันที (ครบพอดี = แปลงเป็นสโตเรี่ยมเลย)
  s.ginga = true;
  p.statuses.hikaruGinga = GINGA_TURNS;
  engine.triggerCutscene(p, s.strium ? CUT.strium : CUT.ginga);
  engine.log(`✨ ${p.name} แปลงร่างเป็น Ultraman Ginga${s.strium ? " Strium" : ""} ${GINGA_TURNS} เทิร์น`);
  // ขยายตัวหลังคลิป (ทับศัตรู = ผลักออก เสีย 1) · ขยายไม่ได้ = ลองใหม่ต้นเทิร์น (onRoundStartTick)
  engine.deferAfterCutscene(() => { if (p.alive && bigOn(p)) engine.resizeUnit(p, GINGA_SIZE); });
}
function endGinga(engine, p) {
  const s = st(p);
  s.ginga = false;
  delete p.statuses.hikaruGinga;
  s.gingaReady = engine.roundNumber + 1 + GINGA_CD;
  if (p.alive) engine.resizeUnit(p, 1);
  engine.log(`✨ ${p.name} — Ultraman Ginga หมดเวลา คืนร่างปกติ`);
}

// ---------- ท่าไม้ตาย: ลำแสง ----------
//  ช่องที่ผลักไปได้: เดินตามทิศลำแสงทีละช่องในคอลัมน์ของตัวเอง ไม่เกินปลายลำแสง (ช่องที่ 5) · ของ/คนขวาง = หยุดก่อนถึง
function pushAlong(engine, t, dir, beamSet) {
  const [fx, fy] = LINE_DIRS[dir];
  let cur = { ...t.pos };
  for (;;) {
    const next = { x: cur.x + fx, y: cur.y + fy };
    if (!beamSet.has(`${next.x},${next.y}`) || !engine.tileFree(next.x, next.y, t.id)) break;
    cur = next;
  }
  return cur;
}
function beamHit(engine, p, ray, dir, ids, tiles) {
  const burn = ray ? RAY_BURN : CROSS_BURN;
  const name = ray ? "Strium Ray" : "Ginga Cross Shoot";
  const hit = [];
  for (const id of ids) {
    const t = engine.players[id];
    if (!t || !t.alive || t.id === p.id || engine.sameTeam(p, t)) continue;
    t.wasAttacked = true;
    const before = (t.hp || 0) + (t.armor || 0);
    engine.dealMixed(t, BEAM_DMG);
    if (t.alive && t.hp <= 0) engine.instantDeath(t);
    const dealt = Math.max(0, before - ((t.hp || 0) + (t.armor || 0)));
    if (!t.alive) {
      t.pos = null;
      engine.log(`💥 ${name} → ${t.name} -${dealt} (ลดเกราะก่อน)`);
      engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`);
      continue;
    }
    const burned = engine.applyBurn(t, burn);
    engine.log(`💥 ${name} → ${t.name} -${dealt} (ลดเกราะก่อน)${burned ? ` · ลุกไหม้ +${burned}` : " · ต้านลุกไหม้ได้"}`);
    hit.push(t);
  }
  if (!ray || !LINE_DIRS[dir]) return;
  // ผลัก: ไล่จากคนที่อยู่ไกลสุดก่อน (คนหน้าไม่ขวางคนหลัง) · ตัวใหญ่ไม่โดนผลัก
  const [fx, fy] = LINE_DIRS[dir];
  const beamSet = new Set(tiles.map((c) => `${c.x},${c.y}`));
  const along = (t) => t.pos.x * fx + t.pos.y * fy;
  const moves = [];
  for (const t of hit.filter((o) => o.alive && o.pos && engine.sizeOf(o) <= 1).sort((a, b) => along(b) - along(a))) {
    const to = pushAlong(engine, t, dir, beamSet);
    if (to.x === t.pos.x && to.y === t.pos.y) continue;
    const dist = Math.abs(to.x - t.pos.x) + Math.abs(to.y - t.pos.y);
    moves.push({ id: t.id, from: { ...t.pos }, to });
    t.pos = to;
    engine.log(`🌈 ${t.name} ถูก Strium Ray ผลักไป ${dist} ช่อง`);
  }
  if (moves.length) {
    engine.boardFx("hikaruPush", { id: p.id, moves });
    engine.skillBeat(PUSH_SECONDS, () => {});
  }
}
function fireBeam(engine, p, ray, dir, targets) {
  if (!p.alive || !p.pos || !LINE_DIRS[dir]) return;
  const area = ray ? RAY_AREA : CROSS_AREA;
  const tiles = engine.areaTiles(p, area, dir);
  engine.boardFx("hikaruBeam", {
    id: p.id, kind: ray ? "ray" : "cross", from: { ...p.pos }, size: engine.sizeOf(p), dir,
    len: area.len, width: area.width, tiles,
  });
  const ids = [...targets];
  engine.skillBeat(BEAM_SECONDS, () => beamHit(engine, p, ray, dir, ids, tiles));
}

module.exports = {
  id: ID,
  IMG, VIDEO, FORMS, FORM_KEYS, NORMAL, CUT,
  FORM_ARMOR, FORM_ARMOR_HEAL, ARMOR_HEAL_CD, FORM_TURNS, FORM_CD, KEMUR_CALM,
  GINGA_TURNS, GINGA_CD, GINGA_SIZE, GINGA_MOV, BRACE_MAX, BEAM_LEN, BEAM_DMG, CROSS_BURN, RAY_BURN, CROSS_COST, RAY_COST,
  BEAM_SECONDS, PUSH_SECONDS,
  isHikaru, formOf, gingaOn, striumOn,

  resetCombat(p) { p.hikaru = isHikaru(p) ? fresh() : null; },
  displayImg(p) {
    if (!isHikaru(p)) return null;
    if (gingaOn(p)) return striumOn(p) ? IMG.strium : IMG.ginga;
    return inForm(p) ? FORMS[formOf(p)].img : null;
  },

  // ---------- ค่าบนกระดาน ----------
  maxArmor(p, base) { return inForm(p) ? base + FORM_ARMOR : base; },
  mov(p) { return bigOn(p) ? GINGA_MOV : null; },
  range(p) {
    if (gingaOn(p)) return FACE_RANGE;
    if (formOf(p) === "blackking") return LANE_RANGE;
    if (formOf(p) === "pandon") return PANDON_RANGE;
    return null;
  },
  attackLane(p) {
    if (gingaOn(p)) return "face";
    return formOf(p) === "blackking";
  },
  smashes(p) { return bigOn(p) && boardSize(p) >= GINGA_SIZE; },

  // เกราะลด 1 = ฟื้นพลังชีวิต 1 (ร่าง 1–6 · combat.loseArmor)
  onArmorLost(engine, p) {
    if (!inForm(p) || !p.alive) return;
    if (engine.healHp(p, 1) > 0) engine.log(`🔆 ${p.name} UltraLive — เกราะลด ฟื้นพลังชีวิต +1`);
  },

  // ---------- ตีปกติ ----------
  damageBonus(engine, attacker, target, ctx) {
    if (!isHikaru(attacker)) return 0;
    let n = 0;
    if (formOf(attacker) === "tiga") n += TIGA_ATK;
    if (gingaOn(attacker)) n += GINGA_ATK + (striumOn(attacker) ? STRIUM_ATK : 0);
    if (n) ctx.hikaruAtk = n;
    return n;
  },
  attackFxNames(attacker, atkCtx) {
    if (!atkCtx || !atkCtx.hikaruAtk) return [];
    if (gingaOn(attacker)) return [`${striumOn(attacker) ? "กิงกะสโตเรี่ยม" : "Ultraman Ginga"} +${atkCtx.hikaruAtk}`];
    return [`Ultraman Tiga +${atkCtx.hikaruAtk}`];
  },
  // ตีปกติลง (รวมทุกคนในแนว) → ติดสถานะตามร่าง · คืนชื่อป้ายในฉากตี
  onStrikeLanded(engine, attacker, target) {
    if (!isHikaru(attacker) || !target.alive) return [];
    const f = formOf(attacker);
    if (f === "thunder") return [engine.applyShock(target, 2) ? "ทันเดอร์ดารัมเบีย — ช็อต" : "ช็อต — ต้านได้"];
    if (f === "kemur") return [engine.applyPoison(target, 2) ? "มนุษย์ดาวเคมู — พิษร้าย" : "พิษร้าย — ต้านได้"];
    if (f === "pandon") return [engine.applyBurn(target, 1) ? "คิงแพนด้อน — ลุกไหม้ +1" : "ลุกไหม้ — ต้านได้"];
    if (f === "doragory") return [engine.applyBleed(target, 1) ? "ดอรากอรี่ — เลือดไหล +1" : "เลือดไหล — ต้านได้"];
    if (striumOn(attacker)) return [engine.applyBurn(target, 1) ? "กิงกะสโตเรี่ยม — ลุกไหม้ +1" : "ลุกไหม้ — ต้านได้"];
    return [];
  },
  // เสียงตีปกติตามร่าง · ร่างปกติ = เสียงกลาง
  attackSound(p) {
    if (!isHikaru(p)) return undefined;
    if (gingaOn(p)) return striumOn(p) ? "hk_strium" : "hk_ginga";
    return inForm(p) ? FORMS[formOf(p)].sfx : undefined;
  },
  // ท่าตีบนกระดาน (client/src/board/hikaruFx.js) · ร่างปกติ = พุ่งชนแบบเดิม
  attackStyle(p) {
    if (!isHikaru(p)) return null;
    if (gingaOn(p)) return striumOn(p) ? "hkStrium" : "hkGinga";
    return inForm(p) ? FORMS[formOf(p)].style : null;
  },

  // ---------- ล่องหน (ร่างมนุษย์ดาวเคมู) — ระบบกลาง server/visibility.js ----------
  stealthed(p) { return formOf(p) === "kemur" && !!st(p).hidden; },
  onReveal(engine, p) {
    if (!isHikaru(p) || !p.alive) return;
    reveal(engine, p);
  },
  logCut(p, round) {
    const s = p.hikaru;
    return s && s.logRound === round ? s.logCut : 0;
  },

  // ---------- สกิล ----------
  skillCost(p, tier, base) {
    if (!isHikaru(p) || tier !== "ultimate") return base;
    return striumOn(p) ? RAY_COST : CROSS_COST;
  },
  skillArea(p, tier, area) {
    if (!isHikaru(p) || tier !== "ultimate") return area;
    return striumOn(p) ? RAY_AREA : CROSS_AREA;
  },
  skillPub(p, tier) {
    if (!isHikaru(p)) return null;
    const s = st(p);
    if (tier === "secondary" && s.strium) return { name: "Ultraman Ginga Strium", img: IMG.skill2Strium };
    if (tier === "ultimate" && striumOn(p)) {
      return {
        name: "Strium Ray", img: IMG.skill3Strium,
        desc: `ร่างกิงกะสโตเรี่ยม · เลือกทิศ: ลำแสงแนว ${BEAM_LEN}×3 ใส่ศัตรูทุกคนในแนว ความเสียหาย ${BEAM_DMG} (เกราะรับก่อน · หลบไม่ได้) · ลุกไหม้ ${RAY_BURN} · ผลักไปสุดปลายลำแสง (ของ/คนขวาง = หยุดก่อนถึง · ตัวใหญ่ไม่ถูกผลัก)`,
      };
    }
    return null;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isHikaru(p)) return true;
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      if (s.ginga || s.formRound === r) return false;
      const key = opts.form;
      if (key === NORMAL) return !!s.form;
      if (!FORMS[key] || key === s.form) return false;
      return formCd(s, key, r) === 0;
    }
    if (tier === "secondary") return !s.form && !s.ginga && r >= s.gingaReady;
    if (tier === "ultimate") return s.ginga;
    return false;
  },
  // UltraLive ไม่นับเป็นการใช้สกิล — เปลี่ยนร่างแล้วยังใช้สกิลอื่นได้ในเทิร์นเดียวกัน
  skipsTurnQuota(p, tier) { return isHikaru(p) && tier === "basic"; },
  ignoresTurnQuota(p, tier) { return isHikaru(p) && tier === "basic"; },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isHikaru(p)) return "";
    const s = st(p);
    if (tier === "basic") return setForm(engine, p, opts.form);
    if (tier === "secondary") { startGinga(engine, p); return s.strium ? " Strium" : ""; }
    if (tier === "ultimate") {
      const ray = striumOn(p);
      const ids = (targets || []).filter((id) => {
        const t = engine.players[id];
        return t && t.alive && t.id !== p.id && !engine.sameTeam(p, t);
      });
      engine.triggerCutscene(p, ray ? CUT.ray : CUT.cross);
      engine.log(`🌟 ${p.name} ใช้ ${ray ? "Strium Ray" : "Ginga Cross Shoot"}`);
      const dir = opts.dir;
      engine.deferAfterCutscene(() => fireBeam(engine, p, ray, dir, ids));
      return "";
    }
    return "";
  },

  // ---------- ต้นเทิร์น (dealRound): กิงกะที่ขยายตัวไม่สำเร็จ ลองใหม่ ----------
  onRoundStartTick(engine, p) {
    if (!bigOn(p) || !p.alive || !p.pos) return;
    if (boardSize(p) !== GINGA_SIZE) engine.resizeUnit(p, GINGA_SIZE); // ร่าง UltraLive / กิงกะ ที่ขยายตัวไม่สำเร็จ
  },

  // ---------- จบเทิร์น (หลังลูปลดเทิร์นสถานะ): Brace → ร่าง UltraLive หมด → กิงกะหมด → เคมู ----------
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isHikaru(p) || !p.alive) continue;
      const s = st(p);
      // Strium Brace: จบเทิร์นในร่างกิงกะช่วงกลางวัน (ห่วงเวลาซีโร่ไม่นับ)
      if (s.ginga && braceTick(engine, p) && (p.statuses.hikaruGinga || 0) > 0) engine.triggerCutscene(p, CUT.strium);
      if (s.form && !((p.statuses.hikaruForm || 0) > 0)) {
        const name = FORMS[s.form].name;
        leaveForm(engine, p, true);
        s.form = null;
        capArmor(engine, p);
        engine.resizeUnit(p, 1);
        engine.log(`🔆 ${p.name} — ${name} หมดเวลา คืนร่างปกติ`);
      }
      if (s.ginga && !((p.statuses.hikaruGinga || 0) > 0)) endGinga(engine, p);
      if (s.form === "kemur") {
        if (s.hidden) { reveal(engine, p); s.kemurCalm = 0; s.kemurSnap = null; continue; }
        const snap = s.kemurSnap || { hp: 0, armor: 0, attacked: false };
        const hit = (p.dmgHp || 0) > snap.hp || (p.dmgArmor || 0) > snap.armor || (!!p.wasAttacked && !snap.attacked);
        s.kemurSnap = null;
        s.kemurCalm = hit ? 0 : s.kemurCalm + 1;
        if (s.kemurCalm >= KEMUR_CALM) {
          s.kemurCalm = 0;
          s.hidden = true;
          engine.log(`🌫️ ${p.name} มนุษย์ดาวเคมู — หายตัวไปในหมอก (เทิร์นหน้า)`);
        }
      }
    }
  },

  // ---------- ข้อมูลให้ client ----------
  hikaruState(engine, p) {
    if (!isHikaru(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    const changed = s.formRound === r || s.ginga;
    const forms = FORM_KEYS.map((key) => {
      const cd = formCd(s, key, r);
      return { key, name: FORMS[key].name, img: FORMS[key].img, cd, locked: changed || s.form === key || cd > 0 };
    });
    forms.push({ key: NORMAL, name: "คืนร่าง", img: IMG.base, cd: 0, locked: changed || !s.form });
    return {
      form: s.form, formName: s.form ? FORMS[s.form].name : null, formLeft: s.form ? p.statuses.hikaruForm || 0 : 0, forms,
      ginga: !!s.ginga, strium: !!s.strium, brace: s.brace, braceMax: BRACE_MAX,
      armorCd: left(s.armorReady, r), gingaCd: left(s.gingaReady, r),
      kemurCalm: s.form === "kemur" ? s.kemurCalm : 0, kemurMax: KEMUR_CALM,
    };
  },
  skillLocks(engine, p) {
    if (!isHikaru(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      basic: { locked: s.ginga || s.formRound === r, free: true },
      secondary: { cd: left(s.gingaReady, r), locked: !!s.form || s.ginga },
      ultimate: { locked: !s.ginga },
    };
  },
};
