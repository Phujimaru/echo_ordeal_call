// ============================================================
//  นักบินปริศนา (Silver Bullet) — ระดับง่าย · unique · id "sliver_bullet" (สะกดตามโฟลเดอร์สื่อเดิม)
//  พอร์ตจากโปรเจกต์เก่า (ก่อนมีกระดาน) แล้วปรับให้เข้ากับตาเดิน — กติกาที่ผู้ใช้ตัดสินดู GRID_PLAN §7.5 / §7.5.1
//
//  สองโหมด (หน้าเลือกตัว → p.charMode): "sleeper" สายหลับ = เริ่มเป็นนักบิน · "savior" ผู้กอบกู้ = เริ่มเป็นบานาจ ลิงซ์
//  ร่าง (p.sliver.form): "pilot" / "banagher" — ชุดสกิลแยกขาดกันเหมือนคนละตัว (ผู้ใช้สั่ง) · ปุ่ม/ชื่อ/รูปของบานาจมาจาก
//   characters.js forms.banagher ผ่านฮุค skillPub / characterPub
//
//  ---------- นักบิน ----------
//  ค่าพื้นฐาน: พลังชีวิต 5 · เกราะ 2 (ผู้ใช้สั่ง) · แขน (p.sliver.arm) เริ่มเกมมีแขน
//  สกิลพื้นฐาน เปลี่ยนชิ้นส่วน (ไม่กินโควตาสกิล · ไม่ทำให้ปรากฏตัว)
//    ไม่มีแขน: 2 แต้ม → ได้แขน + ฟื้นพลังชีวิต 1 · มีแขน: 3 แต้ม → ฟื้นพลังชีวิต 2 (ราคาผ่าน skillCost — useSkill/view ใช้สูตรเดียวกัน)
//    คลิปครั้งแรกต่อเกม · ครั้งต่อไปการ์ดแจ้งเตือน + เสียง · ระหว่างล่องหน คลิป/การ์ด/เสียงเฉพาะตัวเอง + เพื่อนร่วมทีม
//  ตีปกติ: ระยะ [1, 4] (เท่าระยะเดิน) ยิงจากที่ยืน — ฉากตีวาดลำแสงยาว SHOT_LEN ช่องไปทางเป้า (attackBeam)
//  สกิลรอง Beam Magnum (4 แต้ม · ต้องมีแขน · เสียแขน · ปรากฏตัว) — แนว 8×1 ทะลุโดนศัตรูทุกคนในแนว
//    ดาเมจ 4 แบบไอเทม (เหมือนกระสุน Nursedessei: เกราะรับก่อน · หลบหลีก/ช่องหลบใช้ไม่ได้ · ไม่บวกเปราะบาง) · ไม่จบตา (ตีปกติต่อได้)
//    คลิปครั้งแรกต่อเกม · ลำแสงบนกระดาน (beamFx) + เสียงยิง + ดาเมจลง "หลังคลิปจบ" (มีคลิปก็จบด้วยเสียงยิง — ผู้ใช้สั่ง)
//  ท่าไม้ตาย ผมจำเป็นต้องไปต่อ (6 แต้ม · ปรากฏตัว 2 เทิร์น): กล่องของลาพลัส 2×2 ตกลงช่องไหนก็ได้ทั้งสนาม (area tile place "list" —
//    ช่องมุมบนซ้ายที่วางได้คิดใน skillArea) · กล่อง = ยูนิตที่ถูกเรียก (server/summon.js) ฝ่ายกลาง ตัวขนาด 2 · เลือด 2 เกราะ 1 ·
//    ขวางทางทุกคน ศัตรูตีพังได้ · ทับใคร = ผลักออก (Board.pushOutTile) + ศัตรูเสีย 2 เกราะก่อน (เพื่อนแค่ถูกผลัก — แบบขยายร่าง Echo)
//    · ยืนติดกล่อง → ปุ่ม HUD "สวม" = เป็นบานาจถาวร (เลือดสูงสุด +2 ฟื้น 2 · เกราะสูงสุด +1 ฟื้น 2) · กล่องพัง = เรียกใหม่ได้ · นักบินตาย = กล่องหาย
//  สกิลติดตัว ซุ่มโจมตี (ล่องหน — ระบบมองเห็นกลางอยู่ server/visibility.js)
//    เงื่อนไข: ffa = ผู้เล่นที่ยังรอด (รวมตัวเอง) ≥ 3 · โหมดทีม = เพื่อนร่วมทีมที่ยังรอด ≥ 2 (duo ไม่เข้าเงื่อนไข)
//    เริ่มเกม/ต้นเทิร์นที่ไม่ได้ปรากฏตัวอยู่ = ล่องหน · ศัตรูมองไม่เห็นเลย (พุ่มหญ้าผืนเดียวกันก็ไม่เห็น)
//    ปรากฏตัว: ตีปกติ / ยิงปืน / ไอเทมใส่คนอื่น / Beam Magnum ("act") · อยู่ในพื้นที่สกิลโจมตีของศัตรู ("hit") · ศัตรูเดินชน ("bump")
//      → ปรากฏ 2 เทิร์น (เทิร์นนี้ + เทิร์นหน้า) แล้วล่องหนอีกครั้งต้นเทิร์นถัดไป
//      "act" ระหว่างปรากฏอยู่ = นับ 2 เทิร์นใหม่ · "hit"/"bump" ระหว่างปรากฏอยู่ = ไม่นับเพิ่ม (ผู้ใช้ตัดสิน)
//    เงื่อนไขหมด (มีคนตาย) = ปรากฏตัวถาวร · ระหว่างล่องหน ศัตรูไม่เห็นเลือด/เกราะ/แต้ม/แขน (server/view.js unseenPub)
//
//  ---------- บานาจ ลิงซ์ ----------
//  พลังชีวิต 7 · เกราะ 3 · เดิน 4 · ตีปกติระยะ 1 (ฉากตีดาบ BeamSaber แดง — attackHitFx "saberRed") · ไม่มีซุ่มโจมตี
//  โล่ดูดซับ (พื้นฐาน 3 แต้ม): ความเสียหายทุกแบบเป็น 0 จนถึงต้นตาเดินถัดไปของตัวเอง (adjustIncomingDamage) + ฟื้นเลือดเท่าที่ดูดซับ
//    รวมไม่เกิน 3 ต่อการกด · การสังหารทันทีไม่ผ่านท่อดาเมจ = กันไม่ได้ · หมดผลแล้วคูลดาวน์ 3 เทิร์น
//  Beam Magnum (รอง 2 แต้ม · กระสุน 5 นัดต่อเกม): แนว 8×1 ความเสียหาย 3 ทุกศัตรูในแนว (เกราะก่อน · หลบไม่ได้) + พังสิ่งกีดขวางที่โดน
//    (engine.breakObstacles — ร้านค้าไม่ใช่สิ่งกีดขวางของแผนที่ จึงไม่โดน) · ยิงแล้วต้องกดรีโหลด (ปุ่ม HUD 0 แต้ม) ในเทิร์นถัดไปก่อนยิงอีก
//    · ระหว่างยูนิคอร์น: 4 แต้ม ไม่ใช้กระสุน ไม่ต้องรีโหลด · เสียงยิง Beam Magnum เดิม (ผู้ใช้สั่ง — สกิลนี้เท่านั้น)
//  ยูนิคอร์น!!!! (ท่าไม้ตาย 6 แต้ม · 5 เทิร์น · คูลดาวน์ 5 เทิร์นหลังหมดผล): New Type Paradise — ผลของ NT-D ฟรี + โล่บินได้ 3 อัน
//  NT-D ทำงาน (ติดตัว · ปุ่ม HUD เปิด/ปิดเทิร์นละครั้ง · หัก 1 แต้มตอนจบเทิร์น แต้มไม่พอ = ปิดเอง): พลังโจมตี +1 · เดิน +1 ·
//    พุ่งเลือกทิศ 2 ช่องเทิร์นละครั้ง (ปุ่ม HUD tiles) ก่อนหรือหลังเดิน · ชนสิ่งกีดขวาง/คน = หยุดก่อนถึง (ชนคนที่มองไม่เห็น = ปรากฏ)
//  โล่บินได้ (ยูนิตที่ถูกเรียกแบบคุมได้ kind "funnel" · characterId เดียวกัน — ฮุคต้องแยก isPilot / isFunnel):
//    พลังชีวิต 1 เกราะ 1 · บินได้ (ฮุค flies — เดินทะลุ ซ้อนช่อง ไม่ขวางใคร) · สายจูง = ระยะเดินของบานาจ (walkLeash) ·
//    ตีปกติไม่ได้ · จบตาเดินของบานาจ = โล่บินตามระยะที่บานาจขยับ แล้วคุมทีละอัน · ปุ่ม HUD โล่ผู้พิทักษ์ (2 แต้มของบานาจ · โล่ละครั้งต่อเทิร์น):
//    ศัตรูในระยะ 2 รอบโล่ถูกล่อเป้า (p.taunt — action.tauntOf) จนจบเทิร์นนี้ (เดินไปแล้ว = จนจบเทิร์นหน้า) · ท่าไม้ตายหมด/ถูกตัด = โล่หาย
// ============================================================

const { CHAR_BY_ID } = require("../characters.js"); // ข้อมูลไม่มี require ต่อ — ไม่วนกลับมาที่นี่
const Board = require("../server/board");

const ID = "sliver_bullet";
const DIR = "/characters/sliver_bullet";
const IMG = {
  cover: `${DIR}/sliver_bullet_banagher.png`,
  base: `${DIR}/sliver_bullet.png`,
  skill1: `${DIR}/sliver_bullet_skill1.png`,
  skill2: `${DIR}/sliver_bullet_skill2.webp`,
  laplace: `${DIR}/laplace_box.jpg`,
  unicorn: `${DIR}/banagher_unicorn.png`,
  ntd: `${DIR}/banagher_ntd.png`,
  awaken: `${DIR}/banagher_awaken.png`,
  shield: `${DIR}/banagher_skill1.jpg`,
  guard: `${DIR}/banagher_guard.jpg`,
  ult: `${DIR}/banagher_skill3.jpg`,
  beam: `${DIR}/banagher_skill2.jpg`,
  beamNtd: `${DIR}/banagher_skill2_ntd.jpg`,
  beamUlt: `${DIR}/banagher_skill2_ult.jpg`,
};
const VIDEO = {
  reload: `${DIR}/sliver_bullet_skill1.mp4`,
  beam: `${DIR}/sliver_bullet_skill2.mp4`,
  wear: `${DIR}/sliver_bullet_skill3.mp4`,
  ntd: `${DIR}/banagher_ntd.mp4`,
  ntdShot: `${DIR}/banagher_ntd_shot.mp4`,
  absorb: `${DIR}/banagher_skill1.mp4`,
  guard: `${DIR}/banagher_guard.mp4`,
  bReload: `${DIR}/banagher_reload.mp4`,
  bBeam: `${DIR}/banagher_beam.mp4`,
  bBeamNtd: `${DIR}/banagher_beam_ntd.mp4`,
  bBeamUlt: `${DIR}/banagher_beam_ult.mp4`,
  unicorn: `${DIR}/banagher_skill3.mp4`,
};
const SFX = {
  reload: "sliver_reload", shot: "sliver_shot",
  // บานาจ (client/src/audio.js — สังเคราะห์ด้วย ffmpeg)
  saber: "banagher_saber", dash: "banagher_dash", absorb: "banagher_absorb", absorbHit: "banagher_absorb_hit",
  guard: "banagher_guard", box: "banagher_box", funnel: "banagher_funnel", crack: "banagher_break",
};
// คีย์คัตซีน (characters/_transforms.js) — จังหวะคลิปของบานาจตามที่ผู้ใช้สั่ง 2026-10-24:
//  สวมกล่อง (ทุกครั้ง) · โล่ดูดซับถูกโจมตี (ครั้งแรกต่อเกม) · Beam ปกติ / NT-D (ครั้งแรกต่อเกม) · Beam ระหว่างยูนิคอร์น (ทุกครั้ง)
//  รีโหลด (ครั้งแรกต่อเกม แล้วเป็นเสียงรีโหลดของนักบิน) · เปิด NT-D ครั้งแรก = ntd · ครั้งต่อไป = ntdShot (ทุกครั้ง)
//  โล่ผู้พิทักษ์ล่อเป้าติด (ครั้งแรกต่อเกม) · ยูนิคอร์น!!!! (ครั้งแรกต่อเกม)
const CUT = {
  reload: "sliverReload", beam: "sliverBeam", wear: "banagherWear",
  ntd: "banagherNtd", ntdShot: "banagherNtdShot", absorb: "banagherAbsorb", guard: "banagherGuard", bReload: "banagherReload",
  bBeam: "banagherBeam", bBeamNtd: "banagherBeamNtd", bBeamUlt: "banagherBeamUlt", unicorn: "banagherUnicorn",
};
const MUSIC = "banagher_unicorn"; // เพลงระหว่างยูนิคอร์น!!!! (client/src/audio.js)
const BOX_MUSIC = "laplace_box";  // เพลงวนระหว่างกล่องของลาพลัสอยู่บนสนาม (ยังไม่ถูกสวม)

const HP = 5;
const ARMOR = 2;
const COST_NO_ARM = 2;
const COST_ARM = 3;
const HEAL_NO_ARM = 1;
const HEAL_ARM = 2;
const BEAM_DMG = 4;
const BEAM_LEN = CHAR_BY_ID[ID].secondary.area.len; // ลำแสงบนกระดาน = แนว Beam Magnum (8×1)
const SHOT_LEN = CHAR_BY_ID[ID].range[1]; // ลำแสงตีปกติ = ระยะตีไกลสุด [1, 4] (ผู้ใช้สั่ง 2026-10-09)
const REVEAL_TURNS = 2;
const FFA_MIN_ALIVE = 3;
const TEAM_MIN_MATES = 2;

// กล่องของลาพลัส
const BOX = { size: 2, hp: 2, armor: 1, dmg: 2 };
const BOX_AREA = CHAR_BY_ID[ID].ultimate.area; // { kind: "tile", range: 30, place: "list", foot: 2 } — tiles เติมตอนส่ง

// บานาจ ลิงซ์
const FORM = CHAR_BY_ID[ID].forms.banagher;
const B = {
  hp: 7, armor: 3, wearHp: 2, wearArmor: 2, range: [1, 1],
  absorbCost: FORM.basic.cost, absorbCap: 3, absorbCd: 3,
  beamCost: FORM.secondary.cost, beamUltCost: 4, beamDmg: 3, beamLen: FORM.secondary.area.len, ammo: 5,
  ultCost: FORM.ultimate.cost, ultTurns: 5, ultCd: 5,
  ntdUpkeep: 1, ntdAtk: 1, ntdMov: 1, dashLen: 2,
  funnels: 3, funnelHp: 1, funnelArmor: 1, guardCost: 2, guardRange: 2,
};
const LINE = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

const isPilot = (p) => !!p && p.characterId === ID && !p.summon;     // ตัวจริง (ทั้งสองร่าง)
const isFunnel = (p) => !!p && p.characterId === ID && !!p.summon && p.summon.kind === "funnel";
const isBox = (p) => !!p && !!p.summon && p.summon.kind === "laplace";
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const tile = (t) => ({ x: t.x, y: t.y });

function fresh(p) {
  return {
    arm: true,
    hidden: false,
    revealUntil: -1, // ปรากฏตัวถึงจบเทิร์นนี้ (เลขรอบ) — -1 = เริ่มเกมล่องหนทันที (startMatch ตั้งรอบ ≥ 0 · ECHO_DEV_START_ROUND − 1)
    hiddenAt: 0,     // ลำดับตอนเริ่มล่องหนรอบล่าสุด (engine.severStamp — ตัดผลสกิล server/sever.js)
    logCut: 0,      // index ใน lastLog ตอนปรากฏตัวรอบนี้ — บรรทัดก่อนหน้าที่มีชื่อเขาซ่อนจากศัตรู
    logRound: 0,
    form: p && p.charMode === "savior" ? "banagher" : "pilot",
    box: null,          // id กล่องของลาพลัสที่ยังอยู่บนกระดาน
    boxAt: 0,           // ลำดับตอนกล่องตก (เพลงกล่อง — skillMusic at)
    // บานาจ
    ammo: B.ammo,
    reloadNeed: false,  // ยิงแล้วยังไม่ได้รีโหลด
    shotRound: -1,      // เทิร์นที่ยิงล่าสุด (รีโหลดได้ตั้งแต่เทิร์นถัดไป)
    absorb: null,       // โล่ดูดซับที่ทำงานอยู่ { healed, sever }
    absorbReady: 0,     // กดโล่ดูดซับได้อีกเมื่อ roundNumber >= ค่านี้
    ntd: false,         // NT-D ทำงาน (ปุ่มที่จ่ายแต้ม)
    ntdSever: 0,
    ntdRound: -1,       // เทิร์นที่กดเปิด/ปิดล่าสุด (เทิร์นละครั้ง)
    dashRound: -1,      // เทิร์นที่พุ่งไปแล้ว
    unicorn: null,      // ยูนิคอร์น!!!! { until, sever, at }
    unicornReady: 0,
    turnFrom: null,     // ช่องตอนเริ่มตาเดิน (โล่บินได้ขยับตามระยะที่บานาจขยับ)
  };
}
function st(p) { return p.sliver || (p.sliver = fresh(p)); }
function pilots(engine) { return Object.values(engine.players).filter(isPilot); }
const isBanagher = (p) => isPilot(p) && st(p).form === "banagher";
const isPilotForm = (p) => isPilot(p) && st(p).form !== "banagher";
const unicornOn = (p) => isBanagher(p) && !!st(p).unicorn;
const ntdOn = (p) => isBanagher(p) && (st(p).ntd || !!st(p).unicorn); // ผลของ NT-D (ปุ่ม หรือ New Type Paradise)
const funnelsOf = (engine, p) => engine.summon.ofOwner(p.id, "funnel");
const boxOf = (engine, p) => { const id = st(p).box; const b = id && engine.players[id]; return b && b.alive && b.pos ? b : null; };

function conditionHolds(engine, p) {
  if (!p.alive) return false;
  const living = Object.values(engine.players).filter((o) => o.alive && !o.summon); // ยูนิตที่ถูกเรียกไม่นับเป็นผู้รอด
  if (engine.teamModeActive()) {
    if (!p.teamId) return false;
    return living.filter((o) => o.id !== p.id && o.teamId === p.teamId).length >= TEAM_MIN_MATES;
  }
  return living.length >= FFA_MIN_ALIVE;
}
// ตัวเอง + เพื่อนร่วมทีม (คนที่เห็นความลับระหว่างล่องหน)
function audience(engine, p) {
  const out = [p.id];
  if (engine.teamModeActive() && p.teamId) {
    for (const o of Object.values(engine.players)) if (o.id !== p.id && o.teamId === p.teamId && !o.summon) out.push(o.id);
  }
  return out;
}
function reveal(engine, p, turns) {
  const s = st(p);
  if (s.hidden) {
    s.hidden = false;
    s.logCut = engine.lastLogLength;
    s.logRound = engine.roundNumber;
    engine.log(`🛩️ ${p.name} ปรากฏตัวบนสนาม!`);
  }
  if (turns) s.revealUntil = Math.max(s.revealUntil, engine.roundNumber + turns - 1);
}

// ดาเมจที่ลงจริง: เลือด + เกราะ + โล่ + เลือดชั่วคราว + เกราะชุด Mark 42 (ชุดรับแทนตัวจริง)
function pool(t) {
  return (t.hp || 0) + (t.armor || 0) + (t.shield || 0) + (t.tempHp || 0) + (t.mark42 ? t.mark42.armor || 0 : 0);
}
// คลิปเต็มครั้งแรกต่อเกม · ครั้งต่อไปการ์ดแจ้งเตือน (+ เสียง) — onlyFor = เฉพาะบางคน (ระหว่างล่องหน)
function clipOnce(engine, p, key, onlyFor, sound) {
  p.cutsceneShown ||= {};
  if (!p.cutsceneShown[key]) {
    p.cutsceneShown[key] = true;
    engine.queueCutscene(p, key, onlyFor);
    return true;
  }
  engine.notifyTransform(p, key, onlyFor);
  if (sound) engine.sfx(sound, onlyFor);
  return false;
}
// คลิปเฉพาะครั้งแรกต่อเกม (ครั้งต่อไปไม่มีอะไร) → เล่นไหม
function clipFirst(engine, p, key) {
  p.cutsceneShown ||= {};
  if (p.cutsceneShown[key]) return false;
  p.cutsceneShown[key] = true;
  engine.queueCutscene(p, key);
  return true;
}
function fx(engine, p, kind, data) {
  engine.boardFx("sliverFx", { kind, id: p.id, color: engine.colorOf(p), ...data });
}

// ---------- กล่องของลาพลัส ----------
// มุมบนซ้ายที่วางกล่องได้: ทั้ง 2×2 อยู่ในกระดาน · ไม่ใช่สิ่งกีดขวาง/ร้าน · ไม่ทับตัวใหญ่ (2×2 ขึ้นไป) · ไม่ทับนักบินเอง
function boxAnchors(engine, p) {
  if (!p.pos) return [];
  const map = engine.boardMap(), blocked = engine.boardBlocked();
  const units = engine.boardUnits("*").filter((u) => u.id !== p.id);
  const me = Board.boxOf(p);
  const out = [];
  for (let y = 0; y + BOX.size <= map.rows; y++) {
    for (let x = 0; x + BOX.size <= map.cols; x++) {
      const body = Board.footprint(x, y, BOX.size);
      if (body.some((t) => Board.isObstacle(map, t.x, t.y, blocked) || Board.covers(me, t.x, t.y))) continue;
      if (body.some((t) => { const u = Board.unitAt(units, t.x, t.y); return u && (u.size || 1) > 1; })) continue;
      out.push({ x, y });
    }
  }
  return out;
}
// กล่องตก: คนที่ทับถูกผลักไปช่องว่างใกล้สุด · ศัตรูเสีย 2 (เกราะก่อน) · เพื่อนแค่ถูกผลัก
function dropBox(engine, p, at) {
  const b = engine.summon.spawn(p, {
    kind: "laplace", hp: BOX.hp, armor: BOX.armor, mov: 0, range: [1, 0], characterId: "laplace_box",
    name: "กล่องของลาพลัส", img: IMG.laplace, color: engine.colorOf(p),
  });
  b.boardSize = BOX.size;
  const box = { x: at.x, y: at.y, size: BOX.size };
  const hit = engine.boardUnits().filter((u) => u.id !== b.id && Board.footprint(at.x, at.y, BOX.size).some((t) => Board.covers(u, t.x, t.y)));
  const pushed = [];
  engine.withEffectSource(p, () => {
    for (const u of hit) {
      const o = engine.players[u.id];
      if (!o || !o.alive || !o.pos) continue;
      const before = { ...o.pos };
      const others = engine.boardUnits(o.id).filter((q) => q.id !== o.id && q.id !== b.id);
      const to = Board.pushOutTile(engine.boardMap(), before, box, others, { selfId: o.id, blocked: engine.boardBlocked(o.id) });
      if (to) o.pos = { x: to.x, y: to.y };
      const enemy = !engine.sameTeam(p, o);
      let dealt = 0;
      if (enemy) {
        const vit = pool(o);
        o.wasAttacked = true;
        engine.dealMixed(o, BOX.dmg, false);
        if (o.alive && o.hp <= 0) engine.instantDeath(o);
        dealt = Math.max(0, vit - pool(o));
      }
      engine.log(`📦 ${o.name} ถูกกล่องของลาพลัสทับ — ผลักออก${enemy ? ` -${dealt} (ลดเกราะก่อน)` : ""}`);
      if (!o.alive) { o.pos = null; if (!o.summon) engine.log(`💀 ${o.name} เลือดจริงหมด ตกรอบ!`); }
      pushed.push({ id: o.id, from: before, to: o.pos ? tile(o.pos) : null, dmg: dealt });
    }
  });
  b.pos = { x: at.x, y: at.y };
  st(p).box = b.id;
  st(p).boxAt = engine.nextTransformCounter();
  fx(engine, p, "boxDrop", { boxId: b.id, at: tile(at), size: BOX.size, pushed });
  engine.sfx(SFX.box);
  engine.log(`📦 ${p.name} ผมจำเป็นต้องไปต่อ — กล่องของลาพลัสตกลงมา`);
}
// ยืนติดกล่อง (ขอบตัวห่าง 1)
function nearBox(engine, p) {
  const b = boxOf(engine, p);
  return !!b && !!p.pos && Board.dist(Board.boxOf(p), Board.boxOf(b)) === 1;
}
// สวมกล่อง → บานาจถาวร
function wear(engine, p) {
  const s = st(p);
  const b = boxOf(engine, p);
  if (b) { fx(engine, p, "boxWear", { boxId: b.id, at: tile(b.pos) }); engine.summon.remove(b); }
  s.box = null;
  s.form = "banagher";
  s.hidden = false;
  s.revealUntil = Number.MAX_SAFE_INTEGER;
  const hp = engine.healHp(p, B.wearHp);
  const ar = engine.healArmor(p, B.wearArmor);
  engine.queueCutscene(p, CUT.wear);
  engine.log(`🦄 ${p.name} สวมกล่องของลาพลัส — กลายเป็นบานาจ ลิงซ์! (พลังชีวิต +${hp} · เกราะ +${ar})`);
}

// ---------- บานาจ: ยูนิคอร์น / NT-D / โล่บินได้ ----------
function ringTiles(c, r) {
  const out = [];
  for (let dy = -r; dy <= r; dy++) {
    const w = r - Math.abs(dy);
    for (const dx of w ? [-w, w] : [0]) out.push({ x: c.x + dx, y: c.y + dy });
  }
  return out;
}
function leashR(engine, owner) { return engine.baseMovOf(owner); }
// ช่องในสายจูงที่ใกล้ want ที่สุด (บินได้: ไม่สนสิ่งกีดขวาง/คน — แค่อยู่ในกระดาน)
function clampLeash(engine, owner, want) {
  const map = engine.boardMap(), r = leashR(engine, owner);
  const ok = (t) => Board.inBounds(map, t.x, t.y) && Math.abs(t.x - owner.pos.x) + Math.abs(t.y - owner.pos.y) <= r;
  if (ok(want)) return tile(want);
  for (let d = 1; d <= 30; d++) for (const t of ringTiles(want, d)) if (ok(t)) return t;
  return tile(owner.pos);
}
function spawnFunnels(engine, p) {
  const s = st(p);
  const spawns = [];
  const map = engine.boardMap();
  const taken = new Set();
  for (let i = 0; i < B.funnels; i++) {
    let at = null;
    for (let d = 1; d <= 3 && !at; d++) {
      for (const t of ringTiles(p.pos, d)) {
        const k = `${t.x},${t.y}`;
        if (!Board.inBounds(map, t.x, t.y) || taken.has(k)) continue;
        at = t; taken.add(k); break;
      }
    }
    if (!at) break;
    const f = engine.summon.spawn(p, {
      kind: "funnel", controlled: true, hp: B.funnelHp, armor: B.funnelArmor, mov: engine.baseMovOf(p), range: [1, 0],
      characterId: ID, name: p.name, img: IMG.shield, until: s.unicorn ? s.unicorn.until : null,
      data: { guardRound: -1 },
    });
    f.pos = { ...at };
    spawns.push({ id: f.id, at: tile(at) });
  }
  if (spawns.length) { fx(engine, p, "funnels", { at: tile(p.pos), spawns }); engine.sfx(SFX.funnel); }
}
function clearFunnels(engine, p) {
  const list = funnelsOf(engine, p);
  if (!list.length) return;
  fx(engine, p, "funnelFade", { ids: list.map((f) => f.id), at: list.filter((f) => f.pos).map((f) => tile(f.pos)) });
  engine.sfx(SFX.crack);
  for (const f of list) engine.summon.remove(f);
}
// ยูนิคอร์นจบ (ครบเวลา / ถูกตัด / เปลี่ยนแผนที่ไม่นับ) → โล่หาย · คูลดาวน์ 5 เทิร์นเต็มหลังหมดผล
function endUnicorn(engine, p, why) {
  const s = st(p);
  if (!s.unicorn) return;
  s.unicorn = null;
  s.unicornReady = engine.roundNumber + B.ultCd + 1;
  clearFunnels(engine, p);
  engine.log(why || `🦄 ${p.name} ยูนิคอร์น!!!! หมดเวลา`);
}
// ช่องปลายพุ่ง (มุมบนซ้าย) 4 ทิศ 1–2 ช่อง · ชน (ขอบ/สิ่งกีดขวาง/ร้าน/ร่าง/คนที่มองเห็น) = หยุดก่อนถึง
function dashTiles(engine, p, seenOnly = true) {
  if (!p.pos) return [];
  const map = engine.boardMap(), blocked = engine.boardBlocked(p.id);
  const units = engine.boardUnits().filter((u) => u.id !== p.id && !isFunnel(engine.players[u.id]) && (!seenOnly || !engine.hiddenFrom(p, engine.players[u.id])));
  const out = [];
  for (const [dir, [dx, dy]] of Object.entries(LINE)) {
    for (let i = 1; i <= B.dashLen; i++) {
      const x = p.pos.x + dx * i, y = p.pos.y + dy * i;
      if (!Board.inBounds(map, x, y) || Board.isObstacle(map, x, y, blocked) || Board.unitAt(units, x, y)) break;
      out.push({ x, y, dir, d: i });
    }
  }
  return out;
}
function dashReady(engine, p) {
  const s = st(p), a = engine.action;
  return ntdOn(p) && engine.canAct(p) && !!a && !a.locked && !a.canto && s.dashRound !== engine.roundNumber;
}
function dash(engine, p, want) {
  if (!dashReady(engine, p) || !want) return false;
  const pick = dashTiles(engine, p).find((t) => t.x === want.x && t.y === want.y);
  if (!pick) return false;
  // ชนคนที่มองไม่เห็นกลางทาง = หยุดช่องก่อนหน้า + เขาปรากฏตัว (แบบเดินชน)
  const real = dashTiles(engine, p, false).filter((t) => t.dir === pick.dir && t.d <= pick.d);
  const end = real[real.length - 1];
  const s = st(p);
  s.dashRound = engine.roundNumber;
  if (engine.action.moved) engine.rebaseMove(p); // เดินแล้ว = ตาเริ่มใหม่จากช่องที่ยืนด้วยระยะที่เหลือ
  if (real.length < pick.d) {
    const [dx, dy] = LINE[pick.dir];
    const at = { x: p.pos.x + dx * (real.length + 1), y: p.pos.y + dy * (real.length + 1) };
    const hidden = Object.values(engine.players).find((o) => o.alive && o.pos && o.id !== p.id && Board.covers(Board.boxOf(o), at.x, at.y));
    if (hidden && hidden.characterId === ID && hidden.sliver) reveal(engine, hidden, REVEAL_TURNS);
  }
  if (!end) { engine.broadcastState(); return true; } // ชนตั้งแต่ช่องแรก — เสียสิทธิ์พุ่ง ไม่ขยับ
  const from = tile(p.pos);
  const path = [from];
  for (let i = 1; i <= end.d; i++) path.push({ x: from.x + LINE[pick.dir][0] * i, y: from.y + LINE[pick.dir][1] * i });
  p.pos = { x: end.x, y: end.y };
  Object.assign(engine.action, { from: { ...p.pos }, path: null, trail: null, iceUndo: null, smashed: null });
  engine.setDash({ id: p.id, path });
  fx(engine, p, "dash", { from, to: tile(p.pos), dir: pick.dir });
  engine.sfx(SFX.dash);
  engine.log(`💨 ${p.name} พุ่ง ${end.d} ช่อง`);
  engine.broadcastState();
  return true;
}
// โล่ผู้พิทักษ์ (ปุ่มของโล่บินได้): ศัตรูในระยะ 2 รอบโล่เล็งได้เฉพาะโล่ 1 เทิร์น
function guardReady(engine, f) {
  const owner = engine.players[f.summon.ownerId];
  return !!owner && owner.alive && unicornOn(owner) && engine.canAct(f) && !!f.pos
    && f.summon.guardRound !== engine.roundNumber && (owner.skillPoints || 0) >= B.guardCost;
}
function guard(engine, f) {
  if (!guardReady(engine, f)) return false;
  const owner = engine.players[f.summon.ownerId];
  owner.skillPoints -= B.guardCost;
  f.summon.guardRound = engine.roundNumber;
  const r = engine.roundNumber;
  const ids = [];
  for (const e of Object.values(engine.players)) {
    if (!e.alive || !e.pos || e.summon || e.id === owner.id || engine.sameTeam(owner, e)) continue;
    if (Board.dist(Board.boxOf(f), Board.boxOf(e)) > B.guardRange) continue;
    const until = engine.hasActed(e.id) ? r + 1 : r; // เดินไปแล้วในเทิร์นนี้ = มีผลถึงจบเทิร์นหน้า
    const keep = e.taunt && e.taunt.until >= r ? (e.taunt.ids || []).filter((id) => id !== f.id && engine.players[id] && engine.players[id].alive) : [];
    e.taunt = { ids: [...keep, f.id], until: Math.max(until, e.taunt && e.taunt.until >= r ? e.taunt.until : until) };
    ids.push(e.id);
  }
  if (ids.length) clipFirst(engine, owner, CUT.guard); // ล่อเป้าติดอย่างน้อย 1 คน
  fx(engine, owner, "guard", { funnelId: f.id, at: tile(f.pos), r: B.guardRange, ids });
  engine.sfx(SFX.guard);
  engine.log(`🛡️ โล่ผู้พิทักษ์ของ ${owner.name}${ids.length ? ` — ล่อเป้า ${ids.map((id) => engine.players[id].name).join(", ")}` : " — ไม่มีศัตรูในระยะ"}`);
  engine.broadcastState();
  return true;
}
// Beam Magnum ของบานาจ: ศัตรูทุกคนในแนว 3 (เกราะก่อน · หลบไม่ได้) + พังสิ่งกีดขวางในแนว
function banagherBeam(engine, p, targets, dir) {
  const s = st(p);
  const ult = !!s.unicorn;
  if (!ult) { s.ammo = Math.max(0, s.ammo - 1); s.reloadNeed = true; s.shotRound = engine.roundNumber; }
  if (ult) engine.queueCutscene(p, CUT.bBeamUlt);
  else clipFirst(engine, p, s.ntd ? CUT.bBeamNtd : CUT.bBeam);
  const from = p.pos ? tile(p.pos) : null;
  const tiles = engine.areaTiles(p, FORM.secondary.area, dir);
  engine.log(`🔫 ${p.name} ยิง Beam Magnum${ult ? "" : ` (เหลือ ${s.ammo} นัด)`}`);
  engine.deferAfterCutscene(() => {
    if (from) engine.boardFx("beamFx", { from, dir, len: B.beamLen, color: engine.colorOf(p), tone: ult ? "green" : "red" });
    engine.sfx(SFX.shot);
    const smashed = engine.breakObstacles(tiles.map((t) => `${t.x},${t.y}`));
    if (smashed.length) engine.log(`💥 Beam Magnum พังสิ่งกีดขวาง ${smashed.length} ช่อง`);
    for (const id of targets || []) {
      const t = engine.players[id];
      if (!t || !t.alive || t.id === p.id || engine.sameTeam(p, t)) continue;
      t.wasAttacked = true;
      const before = pool(t);
      engine.dealMixed(t, B.beamDmg);
      if (t.alive && t.hp <= 0) engine.instantDeath(t);
      const dealt = Math.max(0, before - pool(t));
      engine.log(`💥 Beam Magnum → ${t.name} -${dealt} (ลดเกราะก่อน)`);
      if (!t.alive) { t.pos = null; if (!t.summon) engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
    }
  });
}

// ---------- ปุ่มของร่าง (skillPub) ----------
function formPub(p, tier) {
  const s = FORM[tier];
  if (!s) return null;
  const out = { name: s.name, desc: s.desc, img: s.img };
  if (tier === "secondary") {
    // จำนวนเต็ม (ที่เหลือ = state.players[].sliver.ammo) · ระหว่างยูนิคอร์นไม่ใช้กระสุน = ไม่มีแถบกระสุน (ปุ่มไม่เทาตอนกระสุนหมด)
    out.ammo = unicornOn(p) ? null : B.ammo;
    out.img = unicornOn(p) ? IMG.beamUlt : st(p).ntd ? IMG.beamNtd : IMG.beam; // ปกปุ่มตามร่าง
  }
  return out;
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, B, BOX, MUSIC, BOX_MUSIC, // คลิป (characters/_transforms.js)
  isPilot, isFunnel, isBox, isBanagher,

  maxHp(p) { return isPilot(p) ? (isBanagher(p) ? B.hp : HP) : null; },
  maxArmor(p, base) { return isPilot(p) ? (isBanagher(p) ? B.armor : ARMOR) : base; },
  resetCombat(p) { p.sliver = isPilot(p) ? fresh(p) : null; },
  displayImg(p) {
    if (isFunnel(p)) return IMG.shield;
    if (!isPilot(p)) return null;
    if (!isBanagher(p)) return IMG.base;
    return unicornOn(p) ? IMG.awaken : st(p).ntd ? IMG.ntd : IMG.unicorn;
  },
  // ชื่อ/ปก/สกิลติดตัวตามร่าง (server/view.js)
  characterPub(engine, p) {
    if (!isBanagher(p)) return null;
    return {
      name: FORM.name, img: unicornOn(p) ? IMG.awaken : st(p).ntd ? IMG.ntd : FORM.img,
      passive: { name: FORM.passive.name, desc: FORM.passive.desc },
      passive2: { name: FORM.passive2.name, desc: FORM.passive2.desc },
    };
  },
  attackSound(p) { return isPilotForm(p) ? SFX.shot : isBanagher(p) ? SFX.saber : undefined; },
  attackBeam(p) { return isPilotForm(p) ? SHOT_LEN : 0; },
  attackHitFx(p) { return isBanagher(p) ? "saberRed" : undefined; }, // ฉากตี: ดาบ BeamSaber แดง (boardDraw mythSlashFx tone red)
  range(p) { return isBanagher(p) ? B.range : null; },
  mov(p) { return isBanagher(p) ? (CHAR_BY_ID[ID].mov || 4) + (ntdOn(p) ? B.ntdMov : 0) : null; },
  damageBonus(engine, attacker) { return ntdOn(attacker) ? B.ntdAtk : 0; },
  attackFxNames(attacker) { return ntdOn(attacker) ? [unicornOn(attacker) ? "New Type Paradise" : "NT-D"] : []; },

  // ---------- ซุ่มโจมตี (นักบินเท่านั้น) ----------
  stealthed(p) { return isPilotForm(p) && st(p).hidden; },
  // เริ่มเกม / ต้นเทิร์น: หมดเวลาปรากฏตัวแล้ว + เงื่อนไขจริง = ล่องหน
  refresh(engine) {
    for (const p of pilots(engine)) {
      const s = st(p);
      if (!p.alive || s.form === "banagher") { s.hidden = false; continue; }
      if (!conditionHolds(engine, p)) { if (s.hidden) reveal(engine, p, 0); continue; }
      if (!s.hidden && engine.roundNumber > s.revealUntil) { s.hidden = true; s.hiddenAt = engine.severStamp(); }
    }
  },
  // มีคนตาย: เงื่อนไขหมด = ปรากฏตัว · นักบินตายเอง = เลิกล่องหนเงียบๆ (ไม่ขึ้น "ปรากฏตัวบนสนาม!") + กล่อง/โล่หาย
  onDeath(engine, x) {
    if (isPilot(x)) {
      const b = boxOf(engine, x);
      if (b) engine.summon.remove(b);
      clearFunnels(engine, x);
      st(x).box = null;
    }
    for (const p of pilots(engine)) {
      const s = st(p);
      if (!s.hidden) continue;
      if (!p.alive) s.hidden = false;
      else if (!conditionHolds(engine, p)) reveal(engine, p, 0);
    }
  },
  // kind: "act" = ตัวเองโจมตี (นับ 2 เทิร์นใหม่เสมอ) · "hit"/"bump" = ถูกพบ (นับเฉพาะตอนล่องหนอยู่)
  onReveal(engine, p, kind) {
    if (!isPilotForm(p) || !p.alive) return;
    const s = st(p);
    if (kind === "act" || s.hidden) reveal(engine, p, REVEAL_TURNS);
  },
  // ตัดผลสกิล (server/sever.js — รากฐานจิตของเรียวกิ)
  //  นักบิน: ล่องหนของซุ่มโจมตี = ถูกพบ → ปรากฏตัว 2 เทิร์น (แขนเป็นชิ้นส่วน · กล่องเป็นของบนกระดาน ไม่ใช่ผลสกิลค้าง)
  //  บานาจ: โล่ดูดซับ (หมดผล + คูลดาวน์) · NT-D ทำงาน (ปิด) · ยูนิคอร์น!!!! (หมดผล + โล่หาย + คูลดาวน์)
  severables(engine, p) {
    if (!isPilot(p) || !p.alive) return [];
    const s = st(p), out = [];
    if (s.form !== "banagher") {
      if (s.hidden) out.push({ key: "sliverStealth", label: "ซุ่มโจมตี", at: s.hiddenAt || 0, cancel() { reveal(engine, p, REVEAL_TURNS); } });
      return out;
    }
    if (s.absorb) out.push({ key: "absorb", label: FORM.basic.name, at: s.absorb.sever || 0, cancel() { s.absorb = null; s.absorbReady = engine.roundNumber + B.absorbCd; } });
    if (s.ntd) out.push({ key: "ntd", label: FORM.passive.name, at: s.ntdSever || 0, cancel() { s.ntd = false; } });
    if (s.unicorn) out.push({ key: "unicorn", label: FORM.ultimate.name, at: s.unicorn.sever || 0, cancel() { endUnicorn(engine, p, `🦄 ${FORM.ultimate.name}ของ ${p.name} ถูกตัด`); } });
    return out;
  },
  // บันทึก (lastLog) ล้างทุกต้นเทิร์น — จุดตัดใช้ได้เฉพาะเทิร์นที่ปรากฏตัว
  logCut(p, round) {
    const s = p.sliver;
    return s && s.logRound === round ? s.logCut : 0;
  },

  // ---------- โล่บินได้ ----------
  flies(p) { return isFunnel(p); },
  walkLeash(p) {
    if (!isFunnel(p)) return null;
    const { engine } = require("../server/engine"); // require ตอนเรียก — กัน require วน
    const owner = engine.players[p.summon.ownerId];
    return owner && owner.alive && owner.pos ? { x: owner.pos.x, y: owner.pos.y, r: leashR(engine, owner) } : null;
  },
  onSummonDeath(engine, owner, u) {
    if (!isPilot(owner)) return;
    if (isBox(u)) { engine.sfx(SFX.crack); engine.log(`📦 กล่องของลาพลัสของ ${owner.name} ถูกทำลาย`); if (st(owner).box === u.id) st(owner).box = null; return; }
    if (isFunnel(u)) { fx(engine, owner, "funnelBreak", { funnelId: u.id, at: u.pos ? tile(u.pos) : null }); engine.sfx(SFX.crack); engine.log(`🛡️ โล่บินได้ของ ${owner.name} ถูกทำลาย`); }
  },

  // ---------- สกิล ----------
  skillCost(p, tier, base) {
    if (!isPilot(p)) return base;
    if (isBanagher(p)) {
      if (tier === "basic") return B.absorbCost;
      if (tier === "secondary") return unicornOn(p) ? B.beamUltCost : B.beamCost;
      if (tier === "ultimate") return B.ultCost;
      return base;
    }
    if (tier !== "basic") return base;
    return st(p).arm ? COST_ARM : COST_NO_ARM;
  },
  // พื้นที่ตามร่าง (useSkill + ปุ่ม) — กล่องของลาพลัส: ช่องที่วางได้ทั้งสนาม
  skillArea(p, tier, area) {
    if (!isPilot(p)) return area;
    if (isBanagher(p)) return FORM[tier] ? FORM[tier].area : area;
    if (tier === "ultimate") {
      const { engine } = require("../server/engine"); // require ตอนเรียก — กัน require วน
      return { ...BOX_AREA, tiles: boxAnchors(engine, p) };
    }
    return area;
  },
  skillPub(p, tier) { return isBanagher(p) ? formPub(p, tier) : null; },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isPilot(p)) return true;
    const s = st(p), r = engine.roundNumber;
    if (isBanagher(p)) {
      if (tier === "basic") return !s.absorb && cdLeft(s.absorbReady, r) === 0;
      if (tier === "secondary") return !!s.unicorn || (s.ammo > 0 && !s.reloadNeed);
      if (tier === "ultimate") return !s.unicorn && cdLeft(s.unicornReady, r) === 0;
      return false;
    }
    if (tier === "secondary") return s.arm;
    if (tier === "ultimate") {
      if (boxOf(engine, p)) return false; // กล่องยังอยู่ = เรียกซ้ำไม่ได้
      const t = opts.tile;
      return !!t && boxAnchors(engine, p).some((a) => a.x === t.x && a.y === t.y);
    }
    return true;
  },
  // เปลี่ยนชิ้นส่วนไม่กินโควตาสกิล (ผู้ใช้ตัดสิน) — กดแล้วยังยิง Beam Magnum ได้ในเทิร์นเดียวกัน
  skipsTurnQuota(p, tier) { return isPilotForm(p) && tier === "basic"; },
  ignoresTurnQuota(p, tier) { return isPilotForm(p) && tier === "basic"; },
  // ไม่ขึ้นป้ายสกิลกลาง (skillFlash) / ไม่บันทึกใน roundSkills — เปลี่ยนชิ้นส่วนมีคลิป/การ์ดของตัวเอง (ระหว่างล่องหนต้องเงียบ)
  silentFlash(p, tier) { return isPilotForm(p) && tier === "basic"; },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isPilot(p)) return "";
    const s = st(p);
    p.cutsceneShown ||= {};
    if (isBanagher(p)) {
      if (tier === "basic") {
        s.absorb = { healed: 0, sever: engine.severStamp() };
        fx(engine, p, "absorb", { at: tile(p.pos) });
        engine.sfx(SFX.absorb);
        engine.log(`🛡️ ${p.name} โล่ดูดซับ — ดูดซับความเสียหายทุกแบบจนถึงตาเดินถัดไป`);
        return "";
      }
      if (tier === "secondary") { banagherBeam(engine, p, targets, opts.dir); return ""; }
      if (tier === "ultimate") {
        s.ntd = false; // New Type Paradise แทน NT-D ทำงาน
        s.unicorn = { until: engine.roundNumber + B.ultTurns - 1, sever: engine.severStamp(), at: engine.nextTransformCounter() };
        clipFirst(engine, p, CUT.unicorn);
        engine.log(`🦄 ${p.name} ยูนิคอร์น!!!! — New Type Paradise`);
        engine.deferAfterCutscene(() => { if (p.alive && p.pos && s.unicorn) spawnFunnels(engine, p); });
        return "";
      }
      return "";
    }
    if (tier === "basic") {
      const onlyFor = s.hidden ? audience(engine, p) : undefined;
      const hadArm = s.arm;
      s.arm = true;
      const healed = engine.healHp(p, hadArm ? HEAL_ARM : HEAL_NO_ARM);
      clipOnce(engine, p, CUT.reload, onlyFor, SFX.reload);
      engine.log(`🔧 ${p.name} เปลี่ยนชิ้นส่วน — ${hadArm ? "" : "ได้แขนใหม่ · "}ฟื้นพลังชีวิต +${healed}`);
      return "";
    }
    if (tier === "secondary") { // Beam Magnum
      s.arm = false;
      reveal(engine, p, REVEAL_TURNS);
      const video = !p.cutsceneShown[CUT.beam];
      if (video) { p.cutsceneShown[CUT.beam] = true; engine.queueCutscene(p, CUT.beam); }
      const from = p.pos ? { ...p.pos } : null;
      const dir = opts.dir;
      engine.log(`🔫 ${p.name} ยิง Beam Magnum (เสียแขน)`);
      // ลำแสง + ดาเมจลงหลังคลิปจบ (ไม่มีคลิป = ทันที)
      engine.deferAfterCutscene(() => {
        if (from) engine.boardFx("beamFx", { from, dir, len: BEAM_LEN, color: engine.colorOf(p) });
        engine.sfx(SFX.shot);
        for (const id of targets || []) {
          const t = engine.players[id];
          if (!t || !t.alive || t.id === p.id || engine.sameTeam(p, t) || id === s.box) continue; // กล่องของตัวเองไม่โดน
          t.wasAttacked = true;
          const before = pool(t);
          engine.dealMixed(t, BEAM_DMG);
          if (t.alive && t.hp <= 0) engine.instantDeath(t);
          const dealt = Math.max(0, before - pool(t));
          engine.log(`💥 Beam Magnum → ${t.name} -${dealt} (ลดเกราะก่อน)`);
          if (!t.alive) { t.pos = null; if (!t.summon) engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
        }
      });
      return "";
    }
    if (tier === "ultimate") { // ผมจำเป็นต้องไปต่อ
      reveal(engine, p, REVEAL_TURNS);
      dropBox(engine, p, { x: opts.tile.x, y: opts.tile.y });
      return "";
    }
    return "";
  },
  // กล่องลงผลพื้นที่เอง (ทับ/ผลักตอนตก) — ไม่ใช่พื้นที่โจมตีของสกิล
  ownsAreaHit(p, tier) { return isPilotForm(p) && tier === "ultimate"; },

  // ---------- โล่ดูดซับ ----------
  adjustIncomingDamage(engine, p, n) {
    if (!isBanagher(p) || !st(p).absorb || n <= 0) return n;
    const s = st(p);
    const take = Math.min(n, B.absorbCap - s.absorb.healed);
    if (take > 0) {
      const got = engine.healHp(p, take);
      s.absorb.healed += take;
      if (got > 0) engine.log(`🛡️ ${p.name} โล่ดูดซับ — ฟื้นพลังชีวิต +${got}`);
    }
    if (p.pos) fx(engine, p, "absorbHit", { at: tile(p.pos), n });
    engine.sfx(SFX.absorbHit);
    clipFirst(engine, p, CUT.absorb); // ถูกโจมตีระหว่างโล่ดูดซับ — ครั้งแรกต่อเกม
    return 0;
  },

  // ---------- จังหวะเทิร์น ----------
  // ต้นตาเดินของตัวเอง: โล่ดูดซับหมดผล (คูลดาวน์เริ่มนับ) · จดช่องเริ่มตา (โล่บินตาม)
  onActorStart(engine, p) {
    if (!isPilot(p)) return;
    const s = st(p);
    if (s.absorb) { s.absorb = null; s.absorbReady = engine.roundNumber + B.absorbCd; }
    s.turnFrom = p.pos ? tile(p.pos) : null;
  },
  // จบตาเดินของบานาจ: โล่บินได้ขยับตามระยะที่บานาจขยับ แล้วดึงกลับเข้าสายจูง
  onActorEnd(engine, p) {
    if (!isBanagher(p) || !p.pos) return;
    const s = st(p);
    const from = s.turnFrom || p.pos;
    const dx = p.pos.x - from.x, dy = p.pos.y - from.y;
    s.turnFrom = tile(p.pos);
    const moves = [];
    for (const f of funnelsOf(engine, p)) {
      if (!f.pos) continue;
      const to = clampLeash(engine, p, { x: f.pos.x + dx, y: f.pos.y + dy });
      if (to.x === f.pos.x && to.y === f.pos.y) continue;
      moves.push({ id: f.id, from: tile(f.pos), to });
      f.pos = { ...to };
    }
    if (moves.length) fx(engine, p, "follow", { moves });
  },
  // จบเทิร์น: NT-D หักแต้ม (ไม่พอ = ปิดเอง) · ยูนิคอร์นครบเวลา
  onEndTurn(engine) {
    for (const p of pilots(engine)) {
      if (!p.alive || !isBanagher(p)) continue;
      const s = st(p);
      if (s.ntd && !s.unicorn) {
        if ((p.skillPoints || 0) >= B.ntdUpkeep) p.skillPoints -= B.ntdUpkeep;
        else { s.ntd = false; engine.log(`🦄 ${p.name} แต้มสกิลไม่พอ — NT-D ปิด`); }
      }
      if (s.unicorn && engine.roundNumber >= s.unicorn.until) endUnicorn(engine, p);
    }
  },
  // เปลี่ยนแผนที่: ยูนิตที่ถูกเรียกหายหมด (ระบบกลาง) → กล่องหาย · โล่หาย (ยูนิคอร์นยังทำงานต่อจนครบเวลา)
  onBoardPlaced(engine) {
    for (const p of pilots(engine)) if (p.sliver) { p.sliver.box = null; p.sliver.turnFrom = p.pos ? tile(p.pos) : null; }
  },
  // เพลงระหว่างยูนิคอร์น!!!! · เพลงวนระหว่างกล่องของลาพลัสอยู่บนสนาม
  skillMusic(engine, p) {
    if (!isPilot(p) || !p.alive) return null;
    if (unicornOn(p)) return { music: MUSIC, at: st(p).unicorn.at || 0 };
    if (boxOf(engine, p)) return { music: BOX_MUSIC, at: st(p).boxAt || 0 };
    return null;
  },

  // ---------- ปุ่มพิเศษบน HUD ----------
  hudActions(engine, p) {
    if (isFunnel(p)) {
      const ok = guardReady(engine, p);
      return [{ key: "guard", icon: "🛡️", name: "โล่ผู้พิทักษ์", img: IMG.guard, cost: B.guardCost, disabled: !ok }];
    }
    if (!isPilot(p) || !p.alive) return undefined;
    const s = st(p), r = engine.roundNumber;
    if (!isBanagher(p)) {
      if (!boxOf(engine, p)) return undefined;
      return [{ key: "wear", icon: "📦", name: "สวม", img: IMG.laplace, disabled: !(engine.canAct(p) && nearBox(engine, p)) }];
    }
    const out = [];
    out.push({ key: "ntd", icon: "🦄", name: "NT-D", img: IMG.ntd, on: ntdOn(p), disabled: !!s.unicorn || s.ntdRound === r || !engine.canAct(p) });
    if (ntdOn(p)) {
      const ok = dashReady(engine, p);
      out.push({ key: "dash", icon: "💨", name: "พุ่ง", tiles: ok ? dashTiles(engine, p).map(tile) : [], disabled: !ok });
    }
    if (s.reloadNeed && !s.unicorn && s.ammo > 0) out.push({ key: "reload", icon: "🔄", name: "รีโหลด", cd: r > s.shotRound ? 0 : 1, disabled: !(engine.canAct(p) && r > s.shotRound) });
    return out;
  },
  charAction(engine, p, key, { tile: t } = {}) {
    if (isFunnel(p)) { if (key === "guard") guard(engine, p); return; }
    if (!isPilot(p) || !engine.canAct(p)) return;
    const s = st(p), r = engine.roundNumber;
    if (key === "wear") {
      if (isBanagher(p) || !nearBox(engine, p)) return;
      wear(engine, p);
      engine.pausePlayingForCutscene();
      return;
    }
    if (!isBanagher(p)) return;
    if (key === "ntd") {
      if (s.unicorn || s.ntdRound === r) return;
      s.ntdRound = r;
      s.ntd = !s.ntd;
      if (s.ntd) {
        s.ntdSever = engine.severStamp();
        if (!clipFirst(engine, p, CUT.ntd)) engine.queueCutscene(p, CUT.ntdShot); // เปิดครั้งแรก = ntd · ครั้งต่อไป = ntdShot ทุกครั้ง
        fx(engine, p, "ntd", { at: tile(p.pos) });
        engine.log(`🦄 ${p.name} NT-D ทำงาน`);
      } else engine.log(`🦄 ${p.name} ปิด NT-D`);
      engine.pausePlayingForCutscene();
      return;
    }
    if (key === "dash") { dash(engine, p, t); return; }
    if (key === "reload") {
      if (!s.reloadNeed || s.unicorn || r <= s.shotRound) return;
      s.reloadNeed = false;
      if (!clipFirst(engine, p, CUT.bReload)) engine.sfx(SFX.reload); // ครั้งแรกต่อเกม = คลิป · ต่อไป = เสียงรีโหลดของนักบิน
      engine.log(`🔄 ${p.name} รีโหลด Beam Magnum (เหลือ ${s.ammo} นัด)`);
      engine.pausePlayingForCutscene();
    }
  },

  // ---------- ข้อมูลให้ client ----------
  //  hidden ส่งจริงเฉพาะตัวเอง + เพื่อนร่วมทีม · ศัตรูที่มองไม่เห็นไม่ได้ก้อนนี้เลย (view.js unseenPub — pos/แขน/เลือดซ่อนหมด)
  publicState(engine, p, viewer) {
    if (isFunnel(p)) return { funnel: true, guardUsed: p.summon.guardRound === engine.roundNumber };
    if (!isPilot(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    const inside = !!viewer && audience(engine, p).includes(viewer.id);
    return {
      form: s.form,
      arm: !!s.arm,
      hidden: inside ? !!s.hidden : false,
      revealLeft: s.form !== "banagher" && !s.hidden && s.revealUntil >= r ? s.revealUntil - r + 1 : 0,
      box: s.box || null,
      ammo: s.ammo, ammoMax: B.ammo, reloadNeed: !!s.reloadNeed,
      absorb: !!s.absorb, absorbCd: s.absorb ? 0 : cdLeft(s.absorbReady, r),
      ntd: ntdOn(p), unicornLeft: s.unicorn ? Math.max(1, s.unicorn.until - r + 1) : 0,
      unicornCd: s.unicorn ? 0 : cdLeft(s.unicornReady, r),
    };
  },
  // free = เปลี่ยนชิ้นส่วนไม่กินโควตาสกิลของเทิร์น (ปุ่มยังกดได้หลังใช้สกิลอื่น — แบบโซระ/ไรโด)
  skillLocks(engine, p) {
    if (isFunnel(p)) return { basic: { cd: 0, locked: true }, secondary: { cd: 0, locked: true }, ultimate: { cd: 0, locked: true } };
    if (!isPilot(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    if (isBanagher(p)) {
      const absorbCd = s.absorb ? 0 : cdLeft(s.absorbReady, r);
      const ultCd = s.unicorn ? 0 : cdLeft(s.unicornReady, r);
      return {
        basic: { cd: absorbCd, locked: !!s.absorb || absorbCd > 0 },
        secondary: { cd: 0, locked: !s.unicorn && (s.ammo <= 0 || s.reloadNeed) },
        ultimate: { cd: ultCd, locked: !!s.unicorn || ultCd > 0 },
      };
    }
    return { basic: { locked: false, free: true }, secondary: { locked: !s.arm }, ultimate: { locked: !!boxOf(engine, p) } };
  },
};
