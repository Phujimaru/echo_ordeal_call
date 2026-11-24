// ============================================================
//  ไอเซ็น มาโคโตะ — ระดับง่าย (สเปกผู้ใช้ 2026-11-24 · GRID_PLAN §7.44)
//
//  ค่าพลัง: พลังชีวิต 7 · เกราะ 3 · เดิน 4 · ตี 1 ประชิด (ค่าตั้งต้นทั้งหมด)
//  พื้นฐาน "จงมาออกมา!!!!!!!!!" (0): เลือกไคจู 1 ใน 3 → เกิดแบบสุ่มบนแผนที่ (คลิปครั้งแรกของแมตช์ต่อตัว) · บนสนามได้ 2 ตัว · ตัวเดิมซ้ำไม่ได้
//    กดตัวที่อยู่บนสนาม = เรียกกลับ (ไม่ใช้โควตาสกิล) → ตัวนั้นคูลดาวน์ 10 เทิร์นทันที · ตาย = คูลดาวน์ 10 เทิร์น (แยกกันต่อตัว)
//    ไคจู: ตัว 3×3 · เดิน 4 · พลังชีวิต 5 เกราะ 5 · AI เข้าตีศัตรูที่ใกล้สุด (ไม่ตีเจ้าของ/ทีม) · เดินหลังผู้เล่นทุกคน (server/unitAi.js)
//    ภาพจริงตัดพื้นหลังเป็นหมาก (standee) · เปลี่ยนแผนที่ = ตามไปเกิดสุ่มบนแผนที่ใหม่ (keepOnMap)
//     เร็ดคิง   หิน 🪨 · ตี 2 · กรอบ 3×3 ทางทิศเป้า
//     กริจิโอ โบน ไฟ 🔥 · ตี 1 · กรวย 4 · โดน = ลุกไหม้ 2
//     เกลบาสซ่า ลม 🌪️ · ตี 2 · กรอบลึก 4 กว้าง 3 · ผลักเป้าถอยจนสุดกรอบ · ชนสิ่งกีดขวาง/ขอบ/คน = เสียหายเพิ่ม 1
//  รอง "เริ่มบทเรียน" (2): เข้าสิงไคจู 1 ตัวบนสนาม (ไม่จำกัดระยะ) → ไอเซ็นกลายเป็นไคจูตัวนั้น (ตำแหน่ง/ขนาด/พลังชีวิต/เกราะ/สถานะ/ท่าตี)
//    ระหว่างสิง ร่างไอเซ็นฟื้นพลังชีวิต 1 ต่อเทิร์น · กดอีกครั้ง (0 · ไม่ใช้โควตา) = ลงจากร่าง (ไคจูกลับเป็น AI ที่เดิม · ไอเซ็นลงช่องว่างข้างๆ)
//    ร่างไคจูเลือดหมด = ไคจูตาย (คูลดาวน์) · ไอเซ็นหลุดออกมากลางตัวด้วยพลังชีวิต/เกราะเดิม
//  ท่าไม้ตาย "ฉันนี่แหละ คืออุลตร้าแมน" (4): เก็บไคจูทั้งหมด (+ คูลดาวน์) → ร่างอุลตร้าแมนออร์บ ดาร์ก 5 เทิร์น (สเปกร่าง ผู้ใช้ 2026-11-24)
//    พลังชีวิตสูงสุด +3 เกราะ +2 (ฟื้นเต็มตอนแปลง · คืนร่างตัดส่วนเกิน) · พลังโจมตี +1 · ตัว 3×3 · เดิน 5 · ตีปกติกวาด 3 ช่องหน้าตัว (ทุกคนในแถว) · แต้มสกิล +1 ต่อเทิร์น
//    ธาตุของร่าง (Orb Calibur) มืด/ไฟ/หิน: ตีปกติ + Dark Slash/Inferno/Rock Calibur + ติดตัวอุลตร้าแมนที่แท้จริง เปลี่ยนตาม
//    พื้นฐาน (2 · คูลดาวน์ 2): คลื่น 6×3 ดาเมจ 2 ผลักถอยสุดระยะ ชน +1 · รอง Orb Calibur (0 · ไม่ใช้โควตา): เปลี่ยนธาตุ
//    ท่าไม้ตาย Dark Origium Ray (4 · คูลดาวน์ 3): ลำแสง 7×3 ดาเมจ 4 ทุกคนในแนว · ธาตุ มืด → แสง → ไฟ ตามลำดับ
//    ติดตัว อุลตร้าแมนที่แท้จริง (แทนติดตัวเดิมระหว่างร่าง): มืด = เกราะเสียแล้วฟื้นพลังชีวิตเท่ากัน · ไฟ = เหรียญ +1/เทิร์น · หิน = เกราะ +1/เทิร์น
//  วีดีโอ (ผู้ใช้ 2026-11-24): ทุกคลิปเล่นครั้งแรกของแมตช์ ยกเว้น Dark Slash กับ Dark Origium Ray เล่นทุกครั้ง
//  ติดตัว "แบบนี้ไม่เท่ ไม่คูล": ตีปกติที่โดน −1 · ศัตรูทำให้เสียหายด้วยสกิล = แต้มสกิล +1 (ครั้งละ 1 ต่อการกด) — ไม่ทำงานระหว่างสิงไคจู
//  Claude ตัดสิน (ผู้ใช้ยังไม่ได้ระบุ): ดูหัวข้อ GRID_PLAN §7.44
// ============================================================
const Board = require("../server/board");
// require ตอนเรียก — server/constants สร้างตารางคัตซีนจาก characters/_transforms.js ที่ require ไฟล์นี้ (กัน require วน)
const MAX_HP_OF = () => require("../server/constants").MAX_HP;

const ID = "aizen_makoto";
const KAIJU_ID = "aizen_kaiju"; // ฮุครายตัวของไคจู (characters/_aizen_kaiju.js) — ไม่อยู่ใน MODULES
const DIR = "/characters/aizen_makoto";
const IMG = {
  portrait: `${DIR}/aizen.webp`, skill1: `${DIR}/skill1.webp`, skill2: `${DIR}/skill2.webp`, skill3: `${DIR}/skill3.webp`,
  orb: `${DIR}/orb_dark.webp`, orbCover: `${DIR}/orb_dark_cover.webp`,
  orbSkill1: `${DIR}/orb_skill1.webp`, orbSkill2: `${DIR}/orb_skill2.webp`, orbSkill3: `${DIR}/orb_skill3.webp`,
};
const VIDEO = {
  orb: `${DIR}/orb_dark_transform.mp4`, slash: `${DIR}/orb_slash.mp4`, inferno: `${DIR}/orb_inferno.mp4`,
  rock: `${DIR}/orb_rock_caliber.mp4`, ray: `${DIR}/orb_ray.mp4`,
};
const CUT = {
  orb: "aizen_orb_dark", redking: "aizen_redking", grigio: "aizen_grigio", guebasser: "aizen_guebasser",
  slash: "aizen_orb_slash", inferno: "aizen_orb_inferno", rock: "aizen_orb_rock", ray: "aizen_orb_ray",
};
// 29.57 · 12.03 · 18.33 · 13.80 · 2.33 · 7.87 · 12.13 · 18.93 วิ
const CLIP_SEC = { orb: 30, redking: 12, grigio: 18, guebasser: 14, slash: 2.5, inferno: 8, rock: 12.3, ray: 19 };
const EVERY_CLIP = new Set(["slash", "ray"]); // เล่นทุกครั้ง · ที่เหลือครั้งแรกของแมตช์ (ผู้ใช้ 2026-11-24)

const KAIJU_HP = 5, KAIJU_ARMOR = 5, KAIJU_MOV = 4, SIZE = 3;
const KAIJU = {
  redking: {
    name: "เร็ดคิง", img: `${DIR}/redking.webp`, video: `${DIR}/redking.mp4`, sound: "az_hit_rock", style: "aizenRedkingStrike", atk: 2, el: "rock", rect: [3, 1], range: [1, 3],
    desc: "หิน · พลังชีวิต 5 เกราะ 5 · ตี 2 กรอบ 3×3 ทางทิศเป้า",
  },
  grigio: {
    name: "กริจิโอ โบน", img: `${DIR}/grigio_bone.webp`, video: `${DIR}/grigio_bone.mp4`, sound: "az_hit_fire", style: "aizenGrigioStrike", atk: 1, el: "fire", cone: 4, range: [1, 4], burn: 2,
    desc: "ไฟ · พลังชีวิต 5 เกราะ 5 · ตี 1 กรวย 4 · ลุกไหม้ 2",
  },
  guebasser: {
    name: "เกลบาสซ่า", img: `${DIR}/guebasser.webp`, video: `${DIR}/guebasser.mp4`, sound: "az_hit_wind", style: "aizenGuebasserStrike", atk: 2, el: "wind", rect: [4, 1], range: [1, 4], knock: true, bump: 1,
    desc: "ลม · พลังชีวิต 5 เกราะ 5 · ตี 2 กรอบ 4×3 · ผลักถอยสุดกรอบ · ชน +1",
  },
};
const KINDS = Object.keys(KAIJU);
const MAX_OUT = 2, CD = 10;
const COST = { secondary: 2, ultimate: 4 };
const ORB_TURNS = 5;
const BODY_REGEN = 1;
// ---- ร่างอุลตร้าแมนออร์บ ดาร์ก ----
const ORB = { hp: 3, armor: 2, atk: 1, mov: 5, size: 3, regen: 1 };
const ORB_ELS = {
  dark: { name: "มืด", icon: "🌑", basic: "Dark Slash", clip: "slash", passive: "เกราะเสียหาย = ฟื้นพลังชีวิตเท่ากัน", desc: "พื้นฐาน Dark Slash · ตีปกติธาตุมืด · เกราะเสียหาย = ฟื้นพลังชีวิตเท่ากัน",
    effect: `ผลักถอยสุดระยะ · ชน +${1}` },
  fire: { name: "ไฟ", icon: "🔥", basic: "Inferno", clip: "inferno", passive: "เหรียญ +1 ต่อเทิร์น", desc: "พื้นฐาน Inferno · ตีปกติธาตุไฟ · เหรียญ +1 ต่อเทิร์น",
    effect: "ลุกไหม้ 2 · พื้นไฟ 2 เทิร์น" },
  rock: { name: "หิน", icon: "🪨", basic: "Rock Calibur", clip: "rock", passive: "เกราะ +1 ต่อเทิร์น", desc: "พื้นฐาน Rock Calibur · ตีปกติธาตุหิน · เกราะ +1 ต่อเทิร์น",
    effect: "ถูกตรึง 1 เทิร์น" },
};
const ORB_EL_KEYS = Object.keys(ORB_ELS);
const ORB_BASIC = { cost: 2, cd: 2, len: 6, width: 3, dmg: 2, bump: 1, burn: 2, flame: 2, root: 1 };
const ORB_CALIBUR_CD = 1; // Orb Calibur: เปลี่ยนแล้วรอ 1 เทิร์นเต็ม (แบบ Ophy SORT_CD — ผู้ใช้ 2026-11-24)
const ORB_RECALL_CD = 5; // ไคจูที่ถูกเก็บด้วยท่าไม้ตาย: คูลดาวน์ 5 (เรียกกลับเอง/ตาย ยัง 10 — ผู้ใช้ 2026-11-24)
const ORB_STATUS = "aizenOrb"; // ป้ายสถานะนับเทิร์นที่เหลือของร่าง (ลดในลูป endTurn เอง)
const ORB_RAY = { name: "Dark Origium Ray", cost: 4, cd: 3, len: 7, width: 3, dmg: 4, els: ["dark", "light", "fire"] }; // มืด → แสง → ไฟ ตามลำดับ (ผู้ใช้ 2026-11-24): ไม่มีคราบ = มืด+แสงเกิดหลุมดำ แล้วไฟติดเป็นคราบปิดท้าย · มีคราบอยู่แล้ว = ทำปฏิกิริยาไปตามลำดับ

const isMe = (p) => !!(p && p.characterId === ID && !p.summon);
const DIRV = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const st = (p) => p.aizen || (p.aizen = fresh());
function fresh() {
  return {
    ready: { redking: 0, grigio: 0, guebasser: 0 }, // เลขเทิร์นที่เรียกได้อีก
    ride: null, // { kind, bodyHp, bodyArmor, bodyStatuses, bodyAmt, at }
    orb: null, // { left, at, el } — ร่างอุลตร้าแมนออร์บ ดาร์ก
    orbReady: { basic: 0, ultimate: 0, calibur: 0 }, // คูลดาวน์ของปุ่มในร่างออร์บ (เลขเทิร์นที่กดได้อีก)
    hitSeq: -1, // การกดสกิลล่าสุดของศัตรูที่ให้แต้มแล้ว (engine.cmdSeq)
  };
}
const round = (engine) => engine.roundNumber || 0;
const cdLeft = (ready, r) => Math.max(0, (ready || 0) - r);
const riding = (p) => isMe(p) && !!st(p).ride;
const orbOn = (p) => isMe(p) && !!st(p).orb;
const passiveOn = (p) => require("../server/passiveSeal").on(p);
// ชนิดไคจูของยูนิต: ไคจูที่ถูกเรียก หรือไอเซ็นที่สิงอยู่
function kindOf(u) {
  if (!u) return null;
  if (u.summon) return u.summon.aizenKaiju || null;
  return riding(u) ? st(u).ride.kind : null;
}
const specOf = (u) => { const k = kindOf(u); return k ? KAIJU[k] : null; };
// ไคจูบนสนามของ p (ไม่รวมตัวที่สิงอยู่)
function unitsOf(engine, p) {
  return engine.summon.ofOwner(p.id).filter((u) => u.summon && u.summon.aizenKaiju && u.alive);
}
function unitOf(engine, p, kind) { return unitsOf(engine, p).find((u) => u.summon.aizenKaiju === kind) || null; }
// ชนิดที่อยู่นอกตัว (บนสนาม + ที่สิงอยู่)
function outKinds(engine, p) {
  const ks = unitsOf(engine, p).map((u) => u.summon.aizenKaiju);
  if (riding(p)) ks.push(st(p).ride.kind);
  return ks;
}

// ---------- ตำแหน่งเกิดแบบสุ่ม (กรอบ 3×3 ว่างทั้งกรอบ · ไม่พังสิ่งกีดขวาง) ----------
function randomSpot(engine, selfId = null) {
  const map = engine.boardMap();
  if (!map) return null;
  const units = engine.boardUnits().filter((u) => u.id !== selfId);
  const cand = [];
  for (let y = map.minRow | 0; y + SIZE <= map.rows; y++) {
    for (let x = 0; x + (map.wrap ? 1 : SIZE) <= map.cols; x++) {
      const fit = Board.bigFits(map, { id: selfId, x: 0, y: 0, size: SIZE }, x, y, units, { blocked: engine.boardBlocked(selfId) });
      if (fit && !fit.ally && !engine.shopAt(x, y) && Board.footprint(x, y, SIZE).every((c) => !engine.shopAt(c.x, c.y))) cand.push({ x, y });
    }
  }
  return cand.length ? cand[Math.floor(Math.random() * cand.length)] : null;
}

function spawnKaiju(engine, p, kind, pos, hp = KAIJU_HP, armor = KAIJU_ARMOR, statuses = null, amt = null) {
  const d = KAIJU[kind];
  const u = engine.summon.spawn(p, {
    kind: `aizen_${kind}`, characterId: KAIJU_ID, name: d.name, img: d.img, hp: KAIJU_HP, armor: KAIJU_ARMOR,
    mov: KAIJU_MOV, range: d.range, pos, data: { ai: true, aizenKaiju: kind, keepOnMap: true },
  });
  u.hp = hp; u.armor = armor;
  if (statuses) u.statuses = statuses;
  if (amt) u.statusAmt = amt;
  u.boardSize = SIZE;
  u.summon.side = p.duoOf || p.id;
  u.teamId = p.teamId || null;
  u.summon.sever = engine.severStamp();
  return u;
}

// คลิป: EVERY_CLIP เล่นทุกครั้ง · ที่เหลือครั้งแรกของแมตช์ → true = คิวคลิปแล้ว
function clip(engine, p, key) {
  p.cutsceneShown = p.cutsceneShown || {};
  if (!EVERY_CLIP.has(key) && p.cutsceneShown[CUT[key]]) return false;
  p.cutsceneShown[CUT[key]] = true;
  engine.queueCutscene(p, CUT[key]);
  return true;
}
// ผลหลังคลิป (ไม่มีคลิป = ลงทันที) — กฎผู้ใช้: ห้ามเสียงเอฟเฟกต์ตัดหน้า/ซ้อนวีดีโอ
function afterClip(engine, played, fn) {
  if (played) engine.deferAfterCutscene(fn); else fn();
}

// ---------- พื้นฐาน: เรียก / เรียกกลับ ----------
function summon(engine, p, kind) {
  const pos = randomSpot(engine);
  if (!pos) return "";
  const u = spawnKaiju(engine, p, kind, pos);
  engine.log(`🦖 ${p.name} จงมาออกมา!!!!!!!!! — ${u.name} ปรากฏ`);
  const played = clip(engine, p, kind); // ครั้งแรกของแมตช์ต่อตัว
  afterClip(engine, played, () => { if (u.alive && u.pos) fx(engine, u, "arrive", { kaiju: kind, sound: !played }); });
  return "";
}
function recall(engine, p, kind, cd = CD) {
  const s = st(p);
  if (s.ride && s.ride.kind === kind) dismount(engine, p, "recall");
  else {
    const u = unitOf(engine, p, kind);
    if (!u) return "";
    engine.summon.remove(u);
  }
  s.ready[kind] = round(engine) + cd;
  engine.log(`↩️ ${p.name} เรียก ${KAIJU[kind].name} กลับ (คูลดาวน์ ${cd} เทิร์น)`);
  return "";
}

// ---------- รอง: เข้าสิง / ลงจากร่าง ----------
function possess(engine, p, u) {
  const s = st(p);
  const kind = u.summon.aizenKaiju;
  s.ride = {
    kind, bodyHp: p.hp, bodyArmor: p.armor, bodyStatuses: p.statuses || {}, bodyAmt: p.statusAmt || { cardAtkBonus: 0 },
    at: engine.severStamp(),
  };
  const from = p.pos ? { ...p.pos } : null;
  p.hp = u.hp; p.armor = u.armor;
  p.statuses = u.statuses || {}; p.statusAmt = u.statusAmt || { cardAtkBonus: 0 };
  const pos = { ...u.pos };
  engine.summon.remove(u);
  p.pos = pos;
  p.boardSize = SIZE;
  if (engine.action && engine.actorId === p.id) engine.rebaseMove(p);
  engine.boardFx("aizenFx", { kind: "possess", id: p.id, from, at: pos, size: SIZE, kaiju: kind });
  engine.log(`👁️ ${p.name} เริ่มบทเรียน — เข้าสิง ${KAIJU[kind].name}`);
  return "";
}
// how: "exit" (ลงเอง — ไคจูกลับเป็น AI) · "recall" (เรียกกลับ/ท่าไม้ตาย — ไคจูหาย) · "dead" (ร่างไคจูเลือดหมด) · "sever" (ถูกตัดผล/คืนร่าง)
function dismount(engine, p, how) {
  const s = st(p);
  const r = s.ride;
  if (!r) return;
  const at = p.pos ? { ...p.pos } : null;
  const kHp = p.hp, kArmor = p.armor, kSt = p.statuses, kAmt = p.statusAmt;
  s.ride = null;
  p.hp = Math.max(1, r.bodyHp); p.armor = r.bodyArmor;
  p.statuses = r.bodyStatuses || {}; p.statusAmt = r.bodyAmt || { cardAtkBonus: 0 };
  p.boardSize = 1;
  if (!at) { if (how === "dead") s.ready[r.kind] = round(engine) + CD; return; }
  const keep = how === "exit" || how === "sever";
  const centre = { x: Board.wx ? Board.wx(at.x + 1) : at.x + 1, y: at.y + 1 };
  if (keep) {
    p.pos = null;
    spawnKaiju(engine, p, r.kind, at, Math.max(1, kHp), kArmor, kSt, kAmt);
    p.pos = engine.nearFreeTile(at, p.id) || engine.nearFreeTile(centre, p.id) || centre;
  } else {
    if (how === "dead") s.ready[r.kind] = round(engine) + CD;
    p.pos = engine.tileFree(centre.x, centre.y, p.id) ? centre : engine.nearFreeTile(centre, p.id) || centre;
  }
  if (engine.action && engine.actorId === p.id) engine.rebaseMove(p);
  engine.boardFx("aizenFx", { kind: "dismount", id: p.id, at: { ...p.pos }, size: 1, from: at, kaiju: r.kind, how });
  if (how === "dead") engine.log(`💥 ${KAIJU[r.kind].name} ล้ม — ${p.name} หลุดออกมา (คูลดาวน์ ${CD} เทิร์น)`);
  else if (how === "exit") engine.log(`🚶 ${p.name} ลงจากร่าง ${KAIJU[r.kind].name}`);
}

// ---------- ท่าไม้ตาย: อุลตร้าแมนออร์บ ดาร์ก ----------
function orbDark(engine, p) {
  const s = st(p);
  for (const k of outKinds(engine, p)) recall(engine, p, k, ORB_RECALL_CD);
  s.orb = { at: engine.severStamp(), el: "dark" };
  s.orbReady = { basic: 0, ultimate: 0, calibur: 0 };
  p.statuses[ORB_STATUS] = ORB_TURNS; // ป้ายสถานะ + ตัวนับเทิร์น (ลูป endTurn ลดเอง → onEndTurn คืนร่างเมื่อหมด)
  // พลังชีวิต/เกราะสูงสุดเพิ่ม (ฮุค maxHp/maxArmor) → ฟื้นเต็ม
  p.hp = engine.maxHpOf(p);
  p.armor = engine.maxArmorOf(p);
  growOrb(engine, p);
  engine.log(`🌑 ${p.name} ฉันนี่แหละ คืออุลตร้าแมน — อุลตร้าแมนออร์บ ดาร์ก ${ORB_TURNS} เทิร์น (พลังชีวิต ${p.hp} · เกราะ ${p.armor})`);
  const played = clip(engine, p, "orb");
  afterClip(engine, played, () => fx(engine, p, "orbArrive", { sound: !played }));
  return "";
}
function endOrb(engine, p, why) {
  const s = st(p);
  if (!s.orb) return;
  s.orb = null;
  if (p.statuses) delete p.statuses[ORB_STATUS];
  if (p.pos) engine.resizeUnit(p, 1); else p.boardSize = 1;
  // ตัดส่วนเกินของพลังชีวิต/เกราะ
  p.hp = Math.min(p.hp, engine.maxHpOf(p));
  p.armor = Math.min(p.armor, engine.maxArmorOf(p));
  fx(engine, p, "orbLeave");
  engine.log(`🌑 ${p.name} คืนร่างจากอุลตร้าแมนออร์บ ดาร์ก${why === "sever" ? " (ถูกตัด)" : ""}`);
}
// ขยายเป็น 3×3 (ไม่มีที่ = ค้างขนาดเดิมไว้ · ลองใหม่ต้นตาเดิน/ต้นเทิร์น)
function growOrb(engine, p) {
  if (!orbOn(p) || engine.sizeOf(p) >= ORB.size) return;
  if (!p.pos) { p.boardSize = ORB.size; return; }
  if (engine.resizeUnit(p, ORB.size) >= ORB.size && engine.action && engine.actorId === p.id) engine.rebaseMove(p);
}
const orbEl = (p) => (orbOn(p) && ORB_ELS[st(p).orb.el] ? st(p).orb.el : "dark");

// ---------- ร่างออร์บ ดาร์ก: สกิล ----------
// ฟันคลื่นใส่ศัตรูในพื้นที่ (ทอยหลบรายตัว · ลดเกราะก่อน) → คนที่โดน
function waveHit(engine, p, ids, name, dmg, el) {
  const landed = [];
  for (const id of ids) {
    const t = engine.players[id];
    if (!t || !t.alive || !t.pos || t.id === p.id || engine.sameTeam(p, t)) continue;
    if (engine.skillDodge(p, t, name)) continue;
    const block = engine.attackBlocked(t, p);
    if (block) { engine.log(`🛡️ ${t.name} ${block.name} — กัน${name}ของ ${p.name}`); continue; }
    engine.withElement(el, () => engine.dealMixed(t, dmg, false));
    engine.log(`${p.name} ${name} → ${t.name} -${dmg} (ลดเกราะก่อน)`);
    if (t.alive && t.hp <= 0) engine.instantDeath(t);
    if (!t.alive) { t.pos = null; continue; }
    landed.push(t);
  }
  return landed;
}
// ผลักศัตรูถอยไปทาง dir จนถึงแถวสุดท้ายของพื้นที่ (ลึก len จากขอบตัว a) · ชนสิ่งกีดขวาง/ขอบ/คน = +bump
function pushToEnd(engine, a, foes, dir, len, bump) {
  const v = DIRV[dir];
  if (!v || !a.pos || !foes.length) return [];
  const n = engine.sizeOf(a);
  const depthOf = (u) => {
    const us = engine.sizeOf(u);
    if (v.x > 0) return u.pos.x - (a.pos.x + n - 1);
    if (v.x < 0) return a.pos.x - (u.pos.x + us - 1);
    if (v.y > 0) return u.pos.y - (a.pos.y + n - 1);
    return a.pos.y - (u.pos.y + us - 1);
  };
  const list = foes.filter((u) => u && u.alive && u.pos).sort((x, y) => depthOf(y) - depthOf(x)); // ไกลก่อน (คนหน้าไม่ชนคนหลัง)
  const ctx = engine.ice.begin();
  const bumped = [];
  for (const u of list) {
    const steps = Math.max(0, len - depthOf(u));
    if (!steps) continue;
    const from = { ...u.pos };
    engine.ice.pushUnit(u, v, ctx, steps);
    const moved = u.pos ? Math.abs(u.pos.x - from.x) + Math.abs(u.pos.y - from.y) : steps;
    if (u.alive && moved < steps) bumped.push(u);
  }
  engine.ice.flush(ctx);
  for (const u of bumped) {
    if (!u.alive) continue;
    if (u.pos) fx(engine, a, "bump", { at: { ...u.pos }, size: engine.sizeOf(u) });
    engine.withElement(null, () => engine.dealMixed(u, bump, false));
    engine.log(`💥 ${u.name} ถูกผลักชน -${bump}`);
    if (u.alive && u.hp <= 0) engine.instantDeath(u);
    if (!u.alive) u.pos = null;
  }
  return list;
}
function orbBasic(engine, p, ids, dir) {
  const el = orbEl(p);
  const d = ORB_ELS[el];
  st(p).orbReady.basic = round(engine) + ORB_BASIC.cd;
  const played = clip(engine, p, d.clip);
  const land = () => {
    if (!p.alive || !p.pos) return;
    fx(engine, p, "wave", { el, dir, len: ORB_BASIC.len, width: ORB_BASIC.width, sound: !played });
    const hit = waveHit(engine, p, ids, d.basic, ORB_BASIC.dmg, el);
    if (el === "dark") { pushToEnd(engine, p, hit, dir, ORB_BASIC.len, ORB_BASIC.bump); return; }
    if (el === "fire") {
      // Inferno: ลุกไหม้ 2 ทุกคนที่โดน · พื้นในพื้นที่กลายเป็นพื้นไฟ 2 เทิร์น (จบตาบนพื้นไฟ = ลุกไหม้ · ทีมไอเซ็นไม่โดน)
      for (const t of hit) if (t.alive) engine.applyBurn(t, ORB_BASIC.burn);
      const tiles = engine.areaTiles ? engine.areaTiles(p, { kind: "line", len: ORB_BASIC.len, width: ORB_BASIC.width }, dir) : [];
      if (tiles && tiles.length) engine.ice.layFlame(tiles, p.id, ORB_BASIC.flame);
      return;
    }
    // Rock Calibur: ถูกตรึง 1 เทิร์น (เป้าเดินไปแล้ว = ถึงจบเทิร์นหน้า)
    for (const t of hit) {
      if (!t.alive) continue;
      const extra = engine.hasActed(t.id) || engine.actorId === t.id ? 1 : 0;
      engine.applyDebuff(t, "rooted", 1, ORB_BASIC.root + extra);
    }
  };
  afterClip(engine, played, land);
  return "";
}
function orbCalibur(engine, p, el) {
  if (!ORB_ELS[el]) return "";
  st(p).orb.el = el;
  st(p).orbReady.calibur = round(engine) + 1 + ORB_CALIBUR_CD;
  fx(engine, p, "calibur", { el });
  engine.log(`${ORB_ELS[el].icon} ${p.name} Orb Calibur — ธาตุ${ORB_ELS[el].name}`);
  return "";
}
// ลำแสง: ทุกคนในแนวโดน 4 (ธาตุมืด — ปฏิกิริยากับคราบเดิมได้) → แปะแสง → ปิดท้ายไฟ (ใส่ทีละธาตุ · คราบที่เหลือทำปฏิกิริยากับธาตุถัดไป)
function orbRay(engine, p, ids, dir) {
  st(p).orbReady.ultimate = round(engine) + ORB_RAY.cd;
  const played = clip(engine, p, "ray");
  const land = () => {
    if (!p.alive || !p.pos) return;
    fx(engine, p, "ray", { dir, len: ORB_RAY.len, width: ORB_RAY.width, sound: !played });
    const hit = waveHit(engine, p, ids, ORB_RAY.name, ORB_RAY.dmg, ORB_RAY.els[0]);
    for (const t of hit) for (const el of ORB_RAY.els.slice(1)) if (t.alive && t.pos) engine.elementApply(t, el, p);
  };
  afterClip(engine, played, land);
  return "";
}
function orbSkillPub(engine, p, tier) {
  const el = orbEl(p);
  if (tier === "basic") {
    const d = ORB_ELS[el];
    return { name: d.basic, img: IMG.orbSkill1, cost: ORB_BASIC.cost, flash: true, desc: `${d.icon} คลื่น ${ORB_BASIC.len}×${ORB_BASIC.width} ดาเมจ ${ORB_BASIC.dmg} · ${d.effect} (คูลดาวน์ ${ORB_BASIC.cd} เทิร์น)` };
  }
  if (tier === "secondary") {
    const cd = cdLeft(st(p).orbReady.calibur, round(engine));
    return {
      name: "Orb Calibur", img: IMG.orbSkill2, cost: 0, flash: true,
      // ปุ่มเลือกธาตุ: ชื่อธาตุ + ไอคอนธาตุ ไม่มีรูป (ผู้ใช้ 2026-11-24)
      choices: ORB_EL_KEYS.map((k) => ({ key: k, name: ORB_ELS[k].name, icon: ORB_ELS[k].icon, cost: 0, free: true, area: { kind: "self" }, desc: ORB_ELS[k].desc, active: k === el, locked: cd > 0 && k !== el, cd: k !== el ? cd : 0 })),
    };
  }
  if (tier === "ultimate") {
    return { name: ORB_RAY.name, img: IMG.orbSkill3, cost: ORB_RAY.cost, flash: true, desc: `ลำแสง ${ORB_RAY.len}×${ORB_RAY.width} ดาเมจ ${ORB_RAY.dmg} ทุกคนในแนว · 🌑 → ✨ → 🔥 (คูลดาวน์ ${ORB_RAY.cd} เทิร์น)` };
  }
  return null;
}
// เอฟเฟกต์บนกระดาน (client/src/board/aizenFx.js)
function fx(engine, p, kind, extra = {}) {
  engine.boardFx("aizenFx", { kind, id: p.id, at: p.pos ? { ...p.pos } : null, size: engine.sizeOf(p), ...extra });
}

// ---------- ท่าตีของไคจู (ใช้ร่วมกับ characters/_aizen_kaiju.js) ----------
//  เกลบาสซ่า: จดคนที่โดนตีในการตีครั้งนี้ → afterBoardAttack ผลักถอยจนสุดกรอบ
function strikeLanded(engine, a, t) {
  const d = specOf(a);
  if (!d || !t || !t.alive || engine.sameTeam(a, t)) return null;
  if (d.burn) engine.withEffectSource(a, () => engine.applyBurn(t, d.burn));
  if (d.knock) (a.aizenKnock || (a.aizenKnock = [])).push(t.id);
  return null;
}
function afterAttack(engine, a, target) {
  const d = specOf(a);
  const ids = a.aizenKnock || [];
  a.aizenKnock = null;
  if (!d || !d.knock || !ids.length || !a.pos || !target) return null;
  const map = engine.boardMap();
  const box = { x: target.pos ? target.pos.x : 0, y: target.pos ? target.pos.y : 0, size: engine.sizeOf(target) };
  const rect = target.pos ? Board.rectToward(map, a.pos.x, a.pos.y, engine.sizeOf(a), box, d.rect[0], d.rect[1]) : null;
  if (!rect) return null;
  const v = DIRV[rect.dir];
  const n = engine.sizeOf(a);
  // ระยะจากขอบตัวไคจูถึงแถวที่เป้ายืน (1 = ติดตัว) → ผลักจนอยู่แถวสุดท้ายของกรอบ (ลึก d.rect[0])
  const depthOf = (u) => {
    const us = engine.sizeOf(u);
    if (v.x > 0) return u.pos.x - (a.pos.x + n - 1);
    if (v.x < 0) return a.pos.x - (u.pos.x + us - 1);
    if (v.y > 0) return u.pos.y - (a.pos.y + n - 1);
    return a.pos.y - (u.pos.y + us - 1);
  };
  return () => {
    const foes = ids.map((id) => engine.players[id]).filter((u) => u && u.alive && u.pos);
    foes.sort((x, y) => depthOf(y) - depthOf(x)); // ไกลก่อน (คนหน้าไม่ชนคนหลัง)
    const ctx = engine.ice.begin();
    const bumped = [];
    for (const u of foes) {
      const steps = Math.max(0, d.rect[0] - depthOf(u));
      if (!steps) continue;
      const from = { ...u.pos };
      engine.ice.pushUnit(u, v, ctx, steps);
      const moved = u.pos ? Math.abs(u.pos.x - from.x) + Math.abs(u.pos.y - from.y) : steps;
      if (u.alive && moved < steps) bumped.push(u);
    }
    engine.ice.flush(ctx);
    for (const u of bumped) {
      if (!u.alive) continue;
      if (u.pos) fx(engine, a, "bump", { at: { ...u.pos }, size: engine.sizeOf(u) });
      engine.withElement(null, () => engine.dealMixed(u, d.bump, false));
      engine.log(`💥 ${u.name} ถูกผลักชน -${d.bump}`);
      if (u.alive && u.hp <= 0) engine.instantDeath(u);
      if (!u.alive) u.pos = null;
    }
    return foes.length ? 0.5 : 0;
  };
}
// เป้าอยู่ในรูปท่าตี (กรอบ/กรวย) — ใช้ตอน AI วางแผนจากช่องสมมติ
function shapeAllows(engine, u, t) {
  const d = specOf(u);
  if (!d || !u.pos || !t || !t.pos) return true;
  const map = engine.boardMap();
  const box = { x: t.pos.x, y: t.pos.y, size: engine.sizeOf(t) };
  if (d.cone) return !!Board.coneToward(map, u.pos.x, u.pos.y, engine.sizeOf(u), box, d.cone);
  if (d.rect) return !!Board.rectToward(map, u.pos.x, u.pos.y, engine.sizeOf(u), box, d.rect[0], d.rect[1]);
  return true;
}

// ---------- ปุ่ม ----------
const eng = () => require("../server/engine").engine; // require ตอนเรียก — ฮุคที่ไม่ได้ engine (skillPub/strikeAllows/skipsTurnQuota)
function basicChoices(engine, p) {
  const r = round(engine);
  const s = st(p);
  const out = outKinds(engine, p);
  return KINDS.map((k) => {
    const d = KAIJU[k];
    const here = out.includes(k);
    const left = cdLeft(s.ready[k], r);
    if (here) return { key: k, name: d.name, img: d.img, cost: 0, desc: d.desc, area: { kind: "self" }, worn: true, free: true };
    return { key: k, name: d.name, img: d.img, cost: 0, desc: d.desc, area: { kind: "self" }, free: false, locked: left > 0 || out.length >= MAX_OUT, left, cd: left };
  });
}
function rideChoices(engine, p) {
  return unitsOf(engine, p).map((u) => {
    const k = u.summon.aizenKaiju;
    return { key: k, name: KAIJU[k].name, img: KAIJU[k].img, cost: COST.secondary, desc: KAIJU[k].desc, area: { kind: "self" } };
  });
}
const isRecall = (engine, p, opts) => !!(opts && KAIJU[opts.form] && outKinds(engine, p).includes(opts.form));

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, CLIP_SEC, KAIJU, KINDS, CD, MAX_OUT, ORB_TURNS, SIZE, ORB, ORB_ELS, ORB_BASIC, ORB_RAY, EVERY_CLIP, ORB_RECALL_CD, ORB_STATUS,
  isMe, st, kindOf, specOf, unitsOf, outKinds, strikeLanded, afterAttack, shapeAllows, dismount,

  resetCombat(p) {
    p.aizen = isMe(p) ? fresh() : null;
    if (isMe(p)) p.boardSize = 1;
  },

  // ---------- ค่าพลังตามร่าง ----------
  maxHp(p) { return riding(p) ? KAIJU_HP : MAX_HP_OF() + (orbOn(p) ? ORB.hp : 0); },
  maxArmor(p, base) { return riding(p) ? KAIJU_ARMOR : base + (orbOn(p) ? ORB.armor : 0); },
  mov(p) { return orbOn(p) ? ORB.mov : null; },
  range(p) { const d = specOf(p); return d ? d.range : null; },
  // ออร์บ ดาร์ก: ตีกวาด 3 ช่องหน้าตัว (ลึก 1 · กว้างเท่าตัว 3×3) — ทุกศัตรูในแถว
  strikeRect(p) { if (orbOn(p)) return [1, 1]; const d = specOf(p); return d && d.rect ? d.rect : null; },
  strikeCone(p) { const d = specOf(p); return d && d.cone ? d.cone : 0; },
  strikeAllows(p, t) { return shapeAllows(eng(), p, t); },
  smashes(p) { return riding(p) || orbOn(p); }, // ตัว 3×3 เดิน/ขยายตัวพังสิ่งกีดขวางได้ (กติกาตัวใหญ่)
  // ร่างออร์บ ดาร์ก: พลังโจมตี +1 (ผู้ใช้ 2026-11-24) — ตีปกติ 2
  attackBaseOverride(engine, a) { const d = specOf(a); if (d) return d.atk; return orbOn(a) ? 1 + ORB.atk : 1; },
  attackStyle(p) { const k = kindOf(p); if (k) return KAIJU[k].style; return orbOn(p) ? "aizenOrbStrike" : null; }, // ท่าตีบนกระดาน (client aizenFx.js strikeFx)
  attackSound(p) { const d = specOf(p); if (d) return d.sound; return orbOn(p) ? "az_orb_strike" : null; },
  attackElement(engine, p) {
    const d = specOf(p);
    if (d) return d.el;
    return orbOn(p) ? orbEl(p) : null;
  },
  onStrikeLanded(engine, a, t, { counter } = {}) { if (!counter && isMe(a)) strikeLanded(engine, a, t); return null; },
  afterBoardAttack(engine, a, target) { return isMe(a) ? afterAttack(engine, a, target) : null; },

  // ---------- สกิล ----------
  skillPub(p, tier) {
    if (!isMe(p)) return null;
    if (orbOn(p)) return orbSkillPub(eng(), p, tier);
    if (tier === "basic") return { choices: basicChoices(eng(), p) };
    if (tier === "secondary") {
      if (riding(p)) return { cost: 0, active: true, img: KAIJU[st(p).ride.kind].img };
      return { choices: rideChoices(eng(), p) };
    }
    return null;
  },
  skillLocks(engine, p) {
    if (!orbOn(p)) return undefined;
    const r = round(engine), s = st(p);
    const b = cdLeft(s.orbReady.basic, r), u = cdLeft(s.orbReady.ultimate, r);
    const c = cdLeft(s.orbReady.calibur, r);
    return { basic: { cd: b, locked: b > 0 }, secondary: { cd: c, locked: c > 0, free: true }, ultimate: { cd: u, locked: u > 0 } };
  },
  skillArea(p, tier, area) {
    if (!orbOn(p)) return area;
    if (tier === "basic") return { kind: "line", len: ORB_BASIC.len, width: ORB_BASIC.width, hostile: true };
    if (tier === "ultimate") return { kind: "line", len: ORB_RAY.len, width: ORB_RAY.width, hostile: true };
    return { kind: "self" };
  },
  skillCost(p, tier, base) {
    if (orbOn(p)) return tier === "basic" ? ORB_BASIC.cost : tier === "ultimate" ? ORB_RAY.cost : 0;
    if (tier === "secondary" && riding(p)) return 0;
    return base;
  },
  skillFree(p, tier) { return tier === "secondary" && (riding(p) || orbOn(p)); },
  skipsTurnQuota(p, tier, opts) {
    if (!isMe(p)) return false;
    if (tier === "secondary") return riding(p) || orbOn(p); // ลงร่าง · Orb Calibur (เปลี่ยนแล้วใช้สกิลได้อีก 1 ครั้ง)
    if (orbOn(p)) return false;
    if (tier === "basic") return isRecall(eng(), p, opts);
    return false;
  },
  ignoresTurnQuota(p, tier, opts) { return module.exports.skipsTurnQuota(p, tier, opts); },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return true;
    const s = st(p);
    if (!p.pos) return false;
    if (s.orb) {
      const r = round(engine);
      if (tier === "basic") return cdLeft(s.orbReady.basic, r) === 0;
      if (tier === "secondary") return !!ORB_ELS[opts.form] && opts.form !== s.orb.el && cdLeft(s.orbReady.calibur, r) === 0;
      if (tier === "ultimate") return cdLeft(s.orbReady.ultimate, r) === 0;
      return false;
    }
    if (tier === "basic") {
      const k = opts.form;
      if (!KAIJU[k]) return false;
      const out = outKinds(engine, p);
      if (out.includes(k)) return true; // เรียกกลับ
      return cdLeft(s.ready[k], round(engine)) === 0 && out.length < MAX_OUT && !!randomSpot(engine);
    }
    if (tier === "secondary") {
      if (s.ride) return true; // ลงจากร่าง
      return !!unitOf(engine, p, opts.form);
    }
    if (tier === "ultimate") return true;
    return true;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return undefined;
    if (orbOn(p)) {
      if (tier === "basic") return orbBasic(engine, p, targets || [], opts.dir);
      if (tier === "secondary") return orbCalibur(engine, p, opts.form);
      if (tier === "ultimate") return orbRay(engine, p, targets || [], opts.dir);
      return undefined;
    }
    if (tier === "basic") return isRecall(engine, p, opts) ? recall(engine, p, opts.form) : summon(engine, p, opts.form);
    if (tier === "secondary") {
      if (st(p).ride) { dismount(engine, p, "exit"); return ""; }
      const u = unitOf(engine, p, opts.form);
      return u ? possess(engine, p, u) : "";
    }
    if (tier === "ultimate") return orbDark(engine, p);
    return undefined;
  },
  silentFlash(p, tier) { return tier === "secondary" && riding(p); },
  // ธาตุของสกิล: ร่างออร์บ — พื้นฐานตามธาตุร่าง · ลำแสงเริ่มที่มืด (waveHit ตั้งธาตุเองอยู่แล้ว)
  skillElement(engine, p, tier) {
    if (!orbOn(p)) return null;
    if (tier === "basic") return orbEl(p);
    if (tier === "ultimate") return ORB_RAY.els[0];
    return null;
  },

  // ---------- ไคจู ----------
  // เสียงเท้าไคจู (บอท/ร่างที่สิง/ออร์บ ดาร์ก — ตัว 3×3 เดิน)
  onUnitWalked(engine, u) {
    if (!u || !u.alive || !u.pos) return;
    if ((u.summon && u.summon.aizenKaiju) || riding(u) || orbOn(u)) engine.sfx("az_step");
  },
  // ---------- ไคจู ----------
  onSummonDeath(engine, owner, u) {
    if (!isMe(owner) || !u.summon || !u.summon.aizenKaiju) return;
    const k = u.summon.aizenKaiju;
    st(owner).ready[k] = round(engine) + CD;
    engine.log(`💀 ${u.name} ล้ม (คูลดาวน์ ${CD} เทิร์น)`);
  },
  preventDeath(engine, p) {
    if (!riding(p) || p.hp > 0) return false;
    dismount(engine, p, "dead");
    return true;
  },
  onDeath(engine, p) {
    if (!isMe(p)) return;
    for (const u of unitsOf(engine, p)) engine.summon.remove(u);
  },
  onBoardPlaced(engine) {
    for (const u of Object.values(engine.players)) {
      if (!u.summon || !u.summon.aizenKaiju || !u.alive || u.pos) continue;
      const spot = randomSpot(engine, u.id);
      if (spot) u.pos = spot; else engine.summon.remove(u);
    }
  },
  onActorStart(engine, p) { if (orbOn(p) && p.alive) growOrb(engine, p); },
  onRoundStartTick(engine, p) {
    if (orbOn(p) && p.alive) {
      growOrb(engine, p);
      engine.addSkill(p, ORB.regen); // ร่างออร์บ: แต้มสกิล +1 ต่อเทิร์น
      if (passiveOn(p)) {
        const el = orbEl(p);
        if (el === "fire") { engine.addGold(p, 1); engine.log(`🔥 ${p.name} อุลตร้าแมนที่แท้จริง — เหรียญ +1`); }
        if (el === "rock") { const got = engine.healArmor(p, 1); if (got > 0) engine.log(`🪨 ${p.name} อุลตร้าแมนที่แท้จริง — เกราะ +${got}`); }
      }
      return;
    }
    if (!riding(p) || !p.alive) return;
    const r = st(p).ride;
    const before = r.bodyHp;
    r.bodyHp = Math.min(MAX_HP_OF(), r.bodyHp + BODY_REGEN);
    if (r.bodyHp > before) engine.log(`💗 ร่างของ ${p.name} ฟื้นพลังชีวิต +${r.bodyHp - before}`);
  },
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!orbOn(p)) continue;
      if (!((p.statuses && p.statuses[ORB_STATUS]) > 0)) endOrb(engine, p, "time"); // ลูป endTurn ลดป้ายสถานะแล้ว
    }
  },

  // ---------- ติดตัว: แบบนี้ไม่เท่ ไม่คูล ----------
  adjustIncomingDamage(engine, p, n) {
    if (!isMe(p) || riding(p) || orbOn(p) || !(n > 0) || !passiveOn(p) || !engine.inStrike()) return n;
    return Math.max(0, n - 1);
  },
  onDamageTaken(engine, p) {
    if (!isMe(p) || riding(p) || orbOn(p) || !p.alive || !passiveOn(p) || engine.inStrike() || engine.gameState !== "ACTION") return;
    const src = engine.effectSourceId && engine.players[engine.effectSourceId];
    if (!src || src.id === p.id || engine.sameTeam(src, p)) return;
    const s = st(p);
    if (s.hitSeq === engine.cmdSeq) return;
    s.hitSeq = engine.cmdSeq;
    engine.addSkill(p, 1);
    engine.log(`😤 ${p.name} แบบนี้ไม่เท่ ไม่คูล — แต้มสกิล +1`);
  },

  // ---------- ติดตัวร่างออร์บ: อุลตร้าแมนที่แท้จริง (มืด) — เกราะเสีย 1 = ฟื้นพลังชีวิต 1 ----------
  onArmorLost(engine, p) {
    if (!orbOn(p) || !p.alive || orbEl(p) !== "dark" || !passiveOn(p)) return;
    engine.healHp(p, 1);
  },

  // ---------- หน้าตา ----------
  characterPub(engine, p) {
    if (!orbOn(p)) return null;
    const d = ORB_ELS[orbEl(p)];
    return { name: "อุลตร้าแมนออร์บ ดาร์ก", img: IMG.orbCover, passive: { name: "อุลตร้าแมนที่แท้จริง", desc: `${d.icon} ${d.passive}` } };
  },
  // รูปประจำตัว (HUD/ป้ายตาเดิน/กระดาน): ออร์บ ดาร์ก = ภาพที่ผู้ใช้ส่ง (Ultraman_Orb_Dark.webp) · สิงไคจู = ภาพไคจู
  displayImg(p) {
    if (orbOn(p)) return IMG.orbCover;
    if (riding(p)) return KAIJU[st(p).ride.kind].img;
    return null;
  },
  aizenState(engine, p) {
    if (p && p.summon && p.summon.aizenKaiju) return { kaiju: p.summon.aizenKaiju, standee: KAIJU[p.summon.aizenKaiju].img };
    if (!isMe(p)) return undefined;
    const s = st(p);
    if (s.ride) return { kaiju: s.ride.kind, standee: KAIJU[s.ride.kind].img, body: s.ride.bodyHp, bodyArmor: s.ride.bodyArmor };
    if (s.orb) return { orb: (p.statuses && p.statuses[ORB_STATUS]) || 0, el: orbEl(p), standee: IMG.orb };
    return { };
  },

  // ---------- ตัดผลสกิล (รากฐานจิตของเรียวกิ · Echo คืนร่าง) ----------
  severables(engine, p) {
    if (!isMe(p)) return [];
    const s = st(p);
    const out = [];
    if (s.ride) out.push({ key: "aizenRide", label: "เริ่มบทเรียน", at: s.ride.at, cancel: () => dismount(engine, p, "sever") });
    if (s.orb) out.push({ key: "aizenOrb", label: "ฉันนี่แหละ คืออุลตร้าแมน", at: s.orb.at, cancel: () => endOrb(engine, p, "sever") });
    for (const u of unitsOf(engine, p)) {
      const k = u.summon.aizenKaiju;
      out.push({ key: `aizenKaiju_${k}`, label: "จงมาออกมา!!!!!!!!!", at: u.summon.sever || 0, cancel: () => { engine.summon.remove(u); st(p).ready[k] = round(engine) + CD; } });
    }
    return out;
  },
};
