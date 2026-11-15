// ============================================================
//  โซระ โอโตสุมิ — ระดับง่าย · id "sora_otosumi" · กติกาที่ผู้ใช้ตัดสินดู GRID_PLAN §7.7
//
//  ค่าพื้นฐาน: เลือด/เกราะมาตรฐาน · ระยะเดิน 4 · ตีประชิด [1, 1]
//  สกิลพื้นฐาน แปลงร่าง (0 แต้ม): สลับร่างโซระ ⇄ Kamen Rider My-Th · เทิร์นละ 1 ครั้ง · ไม่นับเป็นการใช้สกิล (ล็อกการเดินตามกฎ)
//    เข้าร่าง My-Th ครั้งแรกต่อเกม = คลิปแปลงร่าง · รูปบนปุ่ม = ร่างที่จะเปลี่ยนไป (skillPub)
//    ร่างที่ไม่ใช่มนุษย์ (My-Th และทุก Frame) = พลังโจมตีพื้นฐาน +1 (โหมด PVE +2) — ผู้ใช้สั่ง 2026-11-15
//  สกิลรอง My-Th Edge (0 แต้ม · ร่าง My-Th เท่านั้น): สลับมีด ⇄ ปืน · เทิร์นละ 1 ครั้ง · ไม่นับเป็นการใช้สกิล · อาวุธค้างตามที่เลือกไว้ (ไม่รีเซ็ตตอนคืนร่าง)
//    มีด (เริ่มต้น): ตีปกติ +1 · ฉากตีเป็นรอยฟันสีฟ้า
//    ปืน: ระยะตี [1, 3] · ลำแสงสีฟ้า · ตีโดนและเป้ารอด = ดึงเป้าเข้าประชิด (ช่องติดตัวที่ใกล้เป้าสุดซึ่งว่าง · ไม่ว่าง = ไม่ดึง · ดึง Echo ไม่ได้)
//  ท่าไม้ตาย Mouse Separade (6 แต้ม · ร่าง My-Th เท่านั้น · คูลดาวน์ 2 เทิร์น — ผู้ใช้สั่ง 2026-10-13): เลือกทิศ แนว 4×1
//    กดเทิร์น N → ข้ามเทิร์น N+1, N+2 → กดได้อีกเทิร์น N+3 · คูลดาวน์ใช้ร่วมกันทุก Frame
//    คลิปครั้งแรกต่อเกม → วงล้อหนูหมุน → พุ่งตรงไปสุดแนว (พังสิ่งกีดขวางที่ผ่าน · สิ่งกีดขวางที่พังไม่ได้ = หยุดหน้าช่องนั้น)
//    ศัตรูคนแรกในแนวที่หลบไม่พ้น (หลบหลีก/พุ่มดอกไม้สูง/ป่าทึบ · แม่นยำเจาะ) = ชน → คลิปชน (ทุกครั้ง) → ระเบิดสีฟ้า
//      ความเสียหาย 4 (บัฟ +1 ผู้ใช้สั่ง 2026-11-15 · เกราะรับก่อน · ฆ่าได้) แล้วสลับที่: เราไปยืนช่องของเป้า · เป้าถูกโยนไปช่องที่เราออกตัว
//      ชนตัวใหญ่ (2×2 ขึ้นไป — Echo / กิงกะ) = ดาเมจ 5 แล้วหยุดหน้าตัว ไม่สลับที่
//        ระเบิดจบ = ผลักเป้าถอยตามทิศพุ่ง 2 ช่อง (ทั้งตัว) · ติดสิ่งกีดขวาง/ขอบกระดาน/คน/ร้านค้า = หยุด + ชน -1 (เกราะก่อน · ฆ่าได้)
//    หลบพ้น = ทะลุผ่านไปชนคนถัดไปได้ · เพื่อนร่วมทีม = ทะลุผ่าน · ไม่ชนใคร = หยุดสุดแนว (ช่องไม่ว่าง = ถอยมาช่องว่างก่อนหน้า)
//    คริติคอลของร่าง My-Th ไม่ติดท่านี้ (ใช้กับตีปกติเท่านั้น)
//    ผลของสกิลโจมตีพื้นที่ (คนล่องหนปรากฏ · หนามน้ำแข็ง) เฉพาะช่องที่พุ่งผ่านจริงจนถึงจุดชน (ผู้ใช้ตัดสิน)
//  ติดตัว เพื่อคุณหนู: ร่างโซระต่อเนื่องครบ 2 เทิร์น = ฟื้นพลังชีวิต 2 (แปลงร่างแล้วนับใหม่ · เทิร์นที่เพิ่งคืนร่างไม่นับ)
//    · ร่าง My-Th อัตราคริติคอล 20% (ตีปกติ — รวมกับคริของสนามแล้วทอยครั้งเดียว)
//  โหมด PVE (สนาม Eos + Road Trip — server/pveMode.isPveCoop · ผู้ใช้สั่ง 2026-11-15): ท่าไม้ตายทุกท่า ดาเมจ +6 · พลังโจมตีจากร่าง +2
//
//  Frame (ร่างย่อยของ My-Th — มีด/ปืน/คริ/คูลดาวน์ท่าไม้ตายใช้ร่วมกัน · แปลงร่างเทิร์นละ 1 ครั้ง · เข้าครั้งแรกต่อเกม = คลิปแปลงร่างของ Frame)
//    ร่าง My-Th หรือ Frame ใดๆ กดแปลงร่าง = ตัวเลือก: Frame อื่นๆ / My-Th / คืนร่าง (skillPub choices)
//  Fire Frame (ผู้ใช้สั่ง 2026-10-25):
//    ภาพบนกระดาน = myth_fire.jpg · ตีปกติ: เสียงตีเดิมจบแล้วตามด้วยเสียงไฟลุก (attackTailSound) · ท่าไม้ตายชน = เสียงไฟลุกตอนระเบิด
//    ตีปกติ + Mouse Separade ที่โดนศัตรู = ลุกไหม้ 1 (engine.applyBurn — ต้านได้)
//    จบเทิร์นในร่างนี้ = เสียแต้มสกิล 1 · แต้มไม่พอ = กลับร่าง My-Th ปกติ (Claude ตัดสิน)
//    Mouse Separade: คลิปเปิด myth_fire_skill3_intro (ครั้งแรกต่อเกม · แทนคลิปปกติ) · คลิปชน myth_fire_skill3_hit (ทุกครั้ง)
//  Eagle / Tutle / Orca Frame (ผู้ใช้สั่ง 2026-11-15 — GRID_PLAN §7.7) · ไม่เสียแต้มตอนจบเทิร์น · คลิปเปิดท่าไม้ตายครั้งแรกต่อเกม · คลิปชน/Orca Echo ทุกครั้ง
//    Eagle: ระยะเดิน +2 · Eagle Separade แนว 6×1 พุ่งชนคนแรก → รวบศัตรูในระยะ 2 รอบเป้า (12 ช่อง) เข้ามาติดเป้า → พายุขนนกแดง
//      เป้ากลาง 6 · คนอื่น 5 (เกราะก่อน · ฆ่าได้) · คนที่ถูกรวบทอยหลบแยก (หลบพ้น = ไม่ถูกรวบ ไม่โดน) · ตัวใหญ่ไม่ถูกดึงแต่โดนดาเมจ · หยุดหน้าเป้า
//    Tutle: ระยะเดิน -1 · เกราะสูงสุด +3 (ไม่เติมตอนเข้าร่าง · ออกจากร่าง = ตัดเกราะส่วนเกิน)
//      Tutle Separade: เลือกช่องในระยะ 6 — ช่องแนวตรง = กระดองไถลไปตามแนว ชนศัตรูคนแรก (หลบได้) ครอบแล้วดันไปพร้อมกระดองจนถึงช่องที่เลือก
//        (ติดสิ่งกีดขวาง/คน = หยุดก่อน) · ช่องไม่ตรงแนว = โยนโค้งไปลงช่องนั้น (มีศัตรูยืน = ครอบ)
//      กระดองอยู่ 2 เทิร์น · ครอบ = ถูกตรึง 2 เทิร์น + ไม่ได้รับความเสียหายจากการโจมตีของคนอื่น (ฮุค broadcast shieldsFrom)
//      ปุ่ม HUD "วาร์ป" (ตาของตัวเอง · ไม่ใช้แต้ม): วาร์ปไปที่กระดอง (มีคนในกระดอง = ช่องว่างติดกระดอง) → ท่าจบ กระดองหาย ปล่อยคนในกระดอง · เดินต่อไม่ได้
//      ตีปกติใส่คนในกระดองของเรา (ฮุค interceptStrike · หลบได้) = คลิปชนทุกครั้ง → ความเสียหาย 6 + ผุพัง 2 เทิร์น · กระดองแตก
//    Orca: ระยะเดิน +1 · เริ่มตาเดินบนพื้นเปียก = +3 แทน · เดินทิ้งพื้นเปียก 3 เทิร์น (ย้อนการเดินได้) · ว่ายบนพื้นเปียก ไม่ไถล (ฮุค swims)
//      Orca Echo (ปุ่มพิเศษบน HUD ไม่ใช่สกิลรอง — My-Th Edge ใช้ได้ตามเดิม · 0 แต้ม · ไม่นับเป็นการใช้สกิล · คูลดาวน์ 2 เทิร์น): 2 เทิร์น โซระเห็นทุกคนที่ซ่อนอยู่ (ล่องหน/พุ่ม/ม่าน — ฮุค trueSight)
//      Orca Separade: เลือกทิศ — ช่องแรกเปียก = ไถลตามพื้นเปียกที่ต่อกันจนสุด · ไม่เปียก = พุ่ง 6×1 ทิ้งพื้นเปียก
//        ชนศัตรูคนแรก (หลบได้) → หยุดหน้าเป้า → พายุน้ำ: ศัตรูทุกคนในแนวจากเป้าถึงสุดแนว (หลบแยก) ความเสียหาย 5 + แต้มสกิล -2 (ไม่พอ = ส่วนที่ขาดเป็นความเสียหาย)
//  ธาตุ (ผู้ใช้สั่ง): Fire 🔥 · Eagle 🌪️ ลม · Orca 💧 น้ำ · Tutle ไม่มี
// ============================================================

const Board = require("../server/board");
const PassiveSeal = require("../server/passiveSeal");

const ID = "sora_otosumi";
const DIR = "/characters/sora_otosumi";
const IMG = {
  base: `${DIR}/sora.jpg`,
  myth: `${DIR}/myth.jpg`,
  toMyth: `${DIR}/sora_skill1.jpg`,
  toSora: `${DIR}/sora_skill1_normal.jpg`,
  skill2: `${DIR}/sora_skill2.jpg`,
  skill3: `${DIR}/sora_skill3.jpg`,
  fire: `${DIR}/myth_fire_type1.jpg`, // ตัวเลือก Fire Frame บนปุ่มแปลงร่าง
  mythFire: `${DIR}/myth_fire.jpg`,    // ภาพร่าง Fire Frame บนกระดาน
  eagle: `${DIR}/myth_eagle.jpg`,
  eagleUlt: `${DIR}/myth_eagle_skill3.jpg`,
  tutle: `${DIR}/myth_tutle.jpg`,
  tutleUlt: `${DIR}/myth_tutle_skill3.jpg`,
  orca: `${DIR}/myth_orca.jpg`,
  orcaUlt: `${DIR}/myth_orca_skill3.jpg`,
  orcaEcho: `${DIR}/myth_orca_echo.jpg`,
};
const VIDEO = {
  transform: `${DIR}/sora_skill1.mp4`,
  ult: `${DIR}/sora_skill3_normal.mp4`,
  hit: `${DIR}/sora_skill3_hit.mp4`,
  fire: `${DIR}/myth_fire.mp4`,
  fireUlt: `${DIR}/myth_fire_skill3_intro.mp4`,
  fireHit: `${DIR}/myth_fire_skill3_hit.mp4`,
  eagle: `${DIR}/myth_eagle.mp4`,
  eagleUlt: `${DIR}/myth_eagle_skill3_intro.mp4`,
  eagleHit: `${DIR}/myth_eagle_skill3_hit.mp4`,
  tutle: `${DIR}/myth_tutle.mp4`,
  tutleUlt: `${DIR}/myth_tutle_skill3_intro.mp4`,
  tutleHit: `${DIR}/myth_tutle_skill3_hit.mp4`,
  orca: `${DIR}/myth_orca.mp4`,
  orcaUlt: `${DIR}/myth_orca_skill3_intro.mp4`,
  orcaHit: `${DIR}/myth_orca_skill3_hit.mp4`,
  orcaEcho: `${DIR}/myth_orca_echo.mp4`,
};
const CUT = {
  transform: "soraTransform", ult: "soraUlt", hit: "soraHit", fire: "soraFire", fireUlt: "soraFireUlt", fireHit: "soraFireHit",
  eagle: "soraEagle", eagleUlt: "soraEagleUlt", eagleHit: "soraEagleHit",
  tutle: "soraTutle", tutleUlt: "soraTutleUlt", tutleHit: "soraTutleHit",
  orca: "soraOrca", orcaUlt: "soraOrcaUlt", orcaHit: "soraOrcaHit", orcaEcho: "soraOrcaEcho",
};
// เสียง (client/src/audio.js) — ตีปกติมีดฟัน 2 ครั้ง (ฉากตีเล่นรอยฟัน 2 จังหวะตามเสียง) · สลับอาวุธ = เสียงของอาวุธใหม่
const SFX = { gun: "sora_hit_gun", knife: "sora_hit_knife", toGun: "sora_skill2_gun", toKnife: "sora_skill2_knife", fire: "sora_fire" };
// Fire Frame: เสียงไฟลุกต่อท้ายเสียงตี — ms หลังจังหวะปะทะ ≈ ตอนเสียงตีจบ (มีด 2.2 วิ เริ่มก่อนปะทะ 0.25 วิ · ปืน 1.3 วิ เริ่มตอนปะทะ)
const FIRE_TAIL_MS = { knife: 1850, gun: 1200 };

const KNIFE_BONUS = 1;
const GUN_RANGE = [1, 3]; // ผู้ใช้สั่งเพิ่มจาก 2 (2026-10-12)
const GUN_BEAM = GUN_RANGE[1]; // ลำแสงยาวเท่าระยะตีไกลสุด
const CRIT_PCT = 20;
const REGEN_TURNS = 2; // ผู้ใช้สั่ง 2026-10-12 (เดิม 3)
const REGEN_HP = 2;
const ULT_LEN = 4;
const ULT_DMG = 4;   // ผู้ใช้สั่ง +1 (2026-11-15 — เดิม 3)
const ULT_CD = 2;
const BIG_BONUS = 1; // ชนตัวใหญ่ = ดาเมจ +1 (ผู้ใช้สั่ง 2026-10-19)
const BIG_PUSH = 2;  // แล้วผลักถอย 2 ช่อง
const CRASH_DMG = 1; // ถูกผลักไปติดของ = -1
const FIRE_BURN = 1;  // Fire Frame: การโจมตีที่โดนศัตรู = ลุกไหม้ 1
const FIRE_UPKEEP = 1; // Fire Frame: จบเทิร์น = แต้มสกิล -1
const FORM_ATK = 1;     // ร่างที่ไม่ใช่มนุษย์: พลังโจมตีพื้นฐาน +1
const PVE_FORM_ATK = 2; // โหมด PVE: +2
const PVE_ULT = 6;      // โหมด PVE: ดาเมจท่าไม้ตายทุกท่า +6
const BASE_MOV = 4;
const EAGLE = { len: 6, mov: 2, center: 6, other: 5, radius: 2 };
const TUTLE = { range: 6, mov: -1, armor: 3, turns: 2, dmg: 6, decay: 2 };
const ORCA = { len: 6, mov: 1, wetMov: 3, wetTurns: 3, dmg: 5, drain: 2, echoCd: 2, echoTurns: 2 };
const FRAMES = ["fire", "eagle", "tutle", "orca"];
const FRAME_NAME = { fire: "Fire Frame", eagle: "Eagle Frame", tutle: "Tutle Frame", orca: "Orca Frame" };
const ULT_NAME = { myth: "Mouse Separade", fire: "Mouse Separade", eagle: "Eagle Separade", tutle: "Tutle Separade", orca: "Orca Separade" };
// จังหวะบนกระดาน (ต้องตรงกับ client/src/board — SORA_T ใน boardFxSora.js)
const WHEEL_MS = 1400;
const DASH_STEP_MS = 90;
const BOOM_SECONDS = 1.4;
const DASH_PAD_SECONDS = 0.3; // เผื่อท้ายจังหวะพุ่งให้ภาพถึงช่องสุดท้ายก่อนผลลง
const SHELL_LEAD_MS = 450;    // Tutle: ง้างโยนกระดอง (SORA_T.shellLead)
const SHELL_STEP_MS = 80;     // Tutle: กระดองบินต่อช่อง (SORA_T.shellStep)
const STORM_SECONDS = 1.6;    // Eagle/Orca: พายุ → ดาเมจลงช่วงกลางพายุ
const STORM_HIT_SECONDS = 0.7;
const PULL_SECONDS = 0.6;     // Eagle: รวบคนเข้าหาเป้า

// ทิศที่เลือก → เวกเตอร์ { x, y } (ส่งให้ client หันวงล้อ/ตัวละคร — เป้ายืนติดตัว = เส้นทางพุ่งยาว 0 ช่อง เดาทิศจากเส้นทางไม่ได้)
function dirVec(dir) {
  const v = Board.LINE_DIRS[dir];
  return v ? { x: v[0], y: v[1] } : null;
}
// Mouse Separade กำลังลงหนาม (id ของโซระ) — ฐานพลังโจมตี = ดาเมจท่า และไม่มีโบนัสมีด (ท่อ computeAttackBase ของ ice)
let striking = null;

const isSora = (p) => !!p && p.characterId === ID;
const pveOn = () => require("../server/pveMode").isPveCoop();
const ultBonus = () => (pveOn() ? PVE_ULT : 0);
function fresh() {
  return {
    myth: false,
    gun: false,
    formRound: 0,   // เทิร์นที่กดแปลงร่างล่าสุด (เทิร์นละ 1 ครั้ง)
    weaponRound: 0, // เทิร์นที่สลับอาวุธล่าสุด (เทิร์นละ 1 ครั้ง)
    calm: 0,        // เทิร์นที่อยู่ร่างโซระต่อเนื่อง (ครบ REGEN_TURNS = ฟื้น)
    ultReady: 0,    // ท่าไม้ตาย: กดได้อีกเมื่อ roundNumber >= ค่านี้ (ใช้ร่วมทุก Frame)
    mythAt: 0,      // ลำดับตอนเข้าร่าง My-Th ล่าสุด (engine.severStamp — ตัดผลสกิล server/sever.js)
    frame: null,    // Frame ที่ใส่อยู่ (อยู่ใน My-Th เสมอ): "fire" | "eagle" | "tutle" | "orca" | null
    fire: false,    // = frame === "fire" (ไฟล์อื่นอ่าน — server/fodlan/stage4.js)
    frameAt: 0,     // ลำดับตอนเข้า Frame ล่าสุด (severStamp)
    echoReady: 0,   // Orca Echo: กดได้อีกเมื่อ roundNumber >= ค่านี้
    sightUntil: 0,  // Orca Echo: เห็นทุกคนที่ซ่อนอยู่ถึงก่อนเทิร์นนี้
    wetStart: false, // Orca: ต้นตาเดินยืนบนพื้นเปียก (ระยะเดิน +3)
    shell: null,    // Tutle Separade: { x, y, until, on, at }
  };
}
function st(p) { return p.sora || (p.sora = fresh()); }
const mythOn = (p) => isSora(p) && !!st(p).myth;
// Fire Frame ใช้ธง fire เป็นตัวจริง (ไฟล์อื่น/เทสต์ตั้งตรงๆ ได้) · Frame อื่นอ่าน frame
function frameOf(p) {
  if (!mythOn(p)) return null;
  const s = st(p);
  return s.frame && s.frame !== "fire" ? s.frame : s.fire ? "fire" : null;
}
const fireOn = (p) => frameOf(p) === "fire";
function setFrame(s, f) { s.frame = f || null; s.fire = s.frame === "fire"; }
// ลุกไหม้จาก Fire Frame → ป้ายสำหรับฉากตี/ล็อก
function burn(engine, t) {
  if (!t || !t.alive) return null;
  return engine.applyBurn(t, FIRE_BURN) > 0 ? `ลุกไหม้ ${FIRE_BURN}` : "ลุกไหม้ — ต้านได้";
}
const gunOn = (p) => mythOn(p) && !!st(p).gun;
const knifeOn = (p) => mythOn(p) && !st(p).gun;
// แปลงร่าง / สลับอาวุธ = ไม่กินโควตาสกิลของเทิร์น และกดได้แม้ใช้โควตาไปแล้ว
const freeTier = (p, tier) => isSora(p) && (tier === "basic" || tier === "secondary");
const formAtk = (p) => (mythOn(p) ? (pveOn() ? PVE_FORM_ATK : FORM_ATK) : 0);
const fxOut = (engine, kind, data) => engine.boardFx("soraFx", { kind, ...data });
const tile = (t) => ({ x: t.x, y: t.y });
// ดาเมจที่ลงจริง: เลือด + เกราะ + โล่ + เลือดชั่วคราว (แบบเดียวกับ sliver_bullet)
function pool(t) {
  return (t.hp || 0) + (t.armor || 0) + (t.shield || 0) + (t.tempHp || 0);
}
// ความเสียหายของท่า (เกราะก่อน · ฆ่าได้) → ดาเมจที่ลงจริง
function hurt(engine, t, n) {
  const before = pool(t);
  t.wasAttacked = true;
  engine.dealMixed(t, n);
  engine.resolveDamageAftermath(t);
  if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
  return Math.max(0, before - pool(t));
}
const foeOf = (engine, p, o) => !!o && o.alive && !!o.pos && o.id !== p.id && !engine.sameTeam(p, o);

// ---------- ปืน: ดึงเป้าเข้าประชิด ----------
//  ช่องติดตัวเราที่ใกล้เป้าสุด (เป้าห่างแนวตรง 2 = ช่องกลาง · เฉียง = ช่องติดกันทั้งสองช่อง เลือกช่องว่างช่องแรก)
function pull(engine, p, t) {
  if (!p.alive || !p.pos || !t.alive || !t.pos || engine.sizeOf(t) > 1) return;
  const dist = Math.abs(t.pos.x - p.pos.x) + Math.abs(t.pos.y - p.pos.y);
  if (dist <= 1) return;
  const spots = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([dx, dy]) => ({ x: p.pos.x + dx, y: p.pos.y + dy }))
    .filter((c) => Math.abs(t.pos.x - c.x) + Math.abs(t.pos.y - c.y) === dist - 1);
  const to = spots.find((c) => engine.tileFree(c.x, c.y, t.id));
  if (!to) { engine.log(`🔫 ${p.name} ดึง ${t.name} ไม่ได้ — ช่องข้างหน้าไม่ว่าง`); return; }
  const from = { ...t.pos };
  engine.ice.revealPushed(t); // ถูกดึง = เผยตัว (ผู้ใช้ตัดสิน 2026-10-14)
  t.pos = { x: to.x, y: to.y };
  engine.log(`🔫 ${p.name} ดึง ${t.name} เข้าประชิด`);
  // ดึงลงน้ำแข็ง = ไถลต่อตามทิศที่ถูกดึง + ชนตามกติกาไถล (ดึงแนวตรง = ไถลชนโซระเอง) — iceFx เลื่อนจากช่องเดิมก่อนแล้วไถล
  engine.ice.forcedSlides([{ id: t.id, from, to: { ...t.pos }, dir: { x: to.x - from.x, y: to.y - from.y } }], p);
}

// ---------- ท่าพุ่ง (Mouse / Eagle / Orca Separade) ----------
//  ไล่ช่องตามแนว: สิ่งกีดขวางที่พังไม่ได้ = หยุด · ศัตรูที่หลบไม่พ้น = ชน · หลบพ้น/เพื่อน/ร้านค้า = ทะลุ
//  stop = ช่องที่ชน (สิ่งกีดขวางที่พังไม่ได้/เป้า) · ไม่มี = null · rest = ช่องหลังจุดชนจนสุดแนว (Orca: พายุน้ำ)
function planCharge(engine, p, tiles, name) {
  const passed = [];
  const dodged = new Set();
  let hit = null, stop = null, i = 0;
  for (; i < tiles.length; i++) {
    const t = tiles[i];
    if (t.wall) { stop = t; break; }
    const o = t.unitId ? engine.players[t.unitId] : null;
    if (o && o.alive && !engine.sameTeam(p, o) && !dodged.has(o.id)) {
      o.wasAttacked = true;
      if (!engine.skillDodge(p, o, name)) { hit = o; stop = t; break; }
      dodged.add(o.id);
    }
    passed.push(t);
  }
  const rest = hit ? tiles.slice(i + 1) : [];
  return { passed, hit, stop, dodged, rest };
}
// ผลของสกิลโจมตีพื้นที่บนช่องที่พุ่งผ่าน + ช่องที่ชน (server/skills.js hitArea — ฮุค ownsAreaHit)
//  require ตอนเรียก: skills.js require โมดูลตัวละครตอนโหลด
function hitCrossed(p, crossed) {
  const ids = [...new Set(crossed.map((t) => t.unitId).filter(Boolean))];
  striking = p.id;
  try { require("../server/skills").hitArea(p, crossed, ids); } finally { striking = null; }
}
// ช่องที่หยุดได้: ไล่ถอยจากปลายทางมาหาช่องว่าง (ช่องที่มีสิ่งกีดขวางนับว่าว่าง — พังตอนพุ่งผ่าน) · ไม่มีเลย = ที่เดิม
function landIndex(passed) {
  for (let i = passed.length - 1; i >= 0; i--) {
    const t = passed[i];
    if (!t.unitId && !t.shop) return i;
  }
  return -1;
}
function smashPassed(engine, p, passed) {
  const keys = passed.filter((t) => t.obstacle && !t.wall).map((t) => `${t.x},${t.y}`);
  const broke = engine.breakObstacles(keys);
  if (broke.length) engine.log(`💥 ${p.name} พุ่งพังสิ่งกีดขวาง ${broke.length} ช่อง`);
  return broke;
}
// ช่องตามแนวของแต่ละท่า · Orca: ช่องแรกเปียก = ไถลตามพื้นเปียกที่ต่อกันจนสุด (ไม่จำกัดความยาว)
function chargePlan(engine, p, dir, frame) {
  if (frame === "eagle") return { tiles: engine.chargeTiles(p, dir, EAGLE.len), water: false };
  if (frame === "orca") {
    const all = engine.chargeTiles(p, dir, 64);
    if (all.length && engine.ice.wetAt(all[0].x, all[0].y)) {
      const run = [];
      for (const t of all) { if (!engine.ice.wetAt(t.x, t.y) || t.obstacle) break; run.push(t); }
      return { tiles: run, water: true };
    }
    return { tiles: all.slice(0, ORCA.len), water: false };
  }
  return { tiles: engine.chargeTiles(p, dir, ULT_LEN), water: false };
}
function charge(engine, p, dir, frame) {
  if (!p.alive || !p.pos) return;
  const start = { ...p.pos };
  const { tiles, water } = chargePlan(engine, p, dir, frame);
  const { passed, hit, stop: blocked, rest } = planCharge(engine, p, tiles, ULT_NAME[frame || "myth"]);
  const mouse = frame !== "eagle" && frame !== "orca";
  const big = hit && engine.sizeOf(hit) > 1;
  // Mouse ชนคน: ยืนช่องก่อนถึงเป้าระหว่างคลิปชน (ตำแหน่งจริงยังไม่ขยับ — client ค้างภาพไว้) แล้วสลับที่
  //  ไม่ชน / ชนตัวใหญ่ / Eagle / Orca: หยุดช่องว่างสุดท้ายในแนวที่ผ่านมา
  const land = landIndex(passed);
  const runTo = hit && !big && mouse ? passed.length - 1 : land;
  const path = [start, ...passed.slice(0, runTo + 1).map(tile)];
  const fire = frame === "fire"; // ร่างตอนกด — ผลไฟ/คลิปไฟตามร่างนี้ทั้งท่า
  engine.setDash({ id: p.id, path, wheel: true, dir: dirVec(dir), fire, frame: frame || null, water });
  const seconds = (WHEEL_MS + Math.max(0, path.length - 1) * DASH_STEP_MS) / 1000 + DASH_PAD_SECONDS;
  engine.skillBeat(seconds, () => {
    hitCrossed(p, blocked ? [...passed, blocked] : passed); // ก่อนพัง — หนามที่พุ่งผ่านโดนดาเมจก่อนแตก
    const broke = smashPassed(engine, p, passed.slice(0, runTo + 1));
    if (broke.length) engine.boardFx("smashFx", { id: p.id, tiles: broke.map((b) => ({ ...b, step: 0 })) });
    // Orca บนพื้นแห้ง: ทิ้งพื้นเปียกตามทางที่พุ่งผ่าน (รวมช่องออกตัว)
    if (frame === "orca" && !water) engine.ice.layWet([start, ...passed.slice(0, Math.max(0, land) + 1)].map(tile), ORCA.wetTurns);
    if (!hit) {
      if (land >= 0) p.pos = tile(passed[land]);
      engine.log(`🐭 ${p.name} พุ่งไปสุดทาง — ไม่ชนใคร`);
      return;
    }
    const cut = { fire: CUT.fireHit, eagle: CUT.eagleHit, orca: CUT.orcaHit }[frame] || CUT.hit;
    if (!mouse) {
      if (land >= 0) p.pos = tile(passed[land]);
      engine.queueCutscene(p, cut);
      engine.deferAfterCutscene(() => (frame === "eagle" ? eagleImpact(engine, p, hit, dir) : orcaImpact(engine, p, hit, rest, dir, water)));
      return;
    }
    if (big && land >= 0) p.pos = tile(passed[land]);
    engine.queueCutscene(p, cut);
    const stop = path[path.length - 1]; // ช่องที่ภาพค้างไว้ระหว่างคลิปชน (client ต่อแอนิเมชันจากตรงนี้)
    engine.deferAfterCutscene(() => impact(engine, p, hit, start, stop, big, dir, fire));
  });
}
// คลิปชนจบ: ระเบิดสีฟ้า + ดาเมจ 4 + สลับที่ · ตัวใหญ่ = ดาเมจ 5 แล้วผลักถอยหลังระเบิด (shove)
//  Fire Frame (fire = ร่างตอนกด): ระเบิดสีไฟ + เป้ารอด = ลุกไหม้ 1
function impact(engine, p, t, start, stop, big, dir, fire) {
  if (!p.alive) return;
  if (!t.alive || !t.pos) { settleAtStop(engine, p, stop, big); return; }
  const at = { ...t.pos };
  const dealt = hurt(engine, t, ULT_DMG + (big ? BIG_BONUS : 0) + ultBonus());
  const burnt = fire ? burn(engine, t) : null;
  engine.log(`💥 Mouse Separade → ${t.name} -${dealt} (ลดเกราะก่อน)${burnt ? ` · ${burnt}` : ""}`);
  let swap = null;
  if (!big) {
    if (t.alive) {
      t.pos = { ...start };
      swap = { id: t.id, from: at, to: { ...start } };
      engine.log(`🔄 ${p.name} สลับที่กับ ${t.name}`);
    }
    p.pos = { ...at };
  }
  engine.setDash({ id: p.id, path: big ? [{ ...p.pos }] : [{ ...stop }, at], swap, boom: at, boomSize: (t.alive && engine.sizeOf(t)) || 1, fire });
  engine.skillBeat(BOOM_SECONDS, () => { if (big) shove(engine, p, t, dir); });
}
// ผลักตัวใหญ่ถอยตามทิศพุ่งทีละช่อง (ทั้งตัวต้องลงช่องว่าง — engine.tileFree) ไม่เกิน BIG_PUSH · ติด = ชน -1
//  ภาพ = เหตุการณ์ iceFx (knock ถอย → knock collide + crash เลขดาเมจ) · ตัวใหญ่ไม่ไถลน้ำแข็ง (กฎเดิม)
function shove(engine, p, t, dir) {
  const v = Board.LINE_DIRS[dir];
  if (!v || !t.alive || !t.pos) return;
  const n = engine.sizeOf(t);
  const from = { ...t.pos };
  let crash = false;
  for (let i = 0; i < BIG_PUSH; i++) {
    const x = t.pos.x + v[0], y = t.pos.y + v[1];
    if (!Board.footprint(x, y, n).every((c) => engine.tileFree(c.x, c.y, t.id))) { crash = true; break; }
    t.pos = { x, y };
  }
  const ctx = engine.ice.begin();
  if (t.pos.x !== from.x || t.pos.y !== from.y) {
    ctx.events.push({ kind: "knock", id: t.id, from, to: { ...t.pos } });
    engine.log(`🐭 ${t.name} ถูก Mouse Separade ผลักถอย ${Math.abs(t.pos.x - from.x) + Math.abs(t.pos.y - from.y)} ช่อง`);
  }
  if (crash) {
    const at = { ...t.pos };
    ctx.events.push({ kind: "knock", id: t.id, from: at, to: { x: at.x + v[0], y: at.y + v[1] }, collide: true });
    const before = pool(t);
    t.wasAttacked = true;
    engine.dealMixed(t, CRASH_DMG);
    engine.resolveDamageAftermath(t);
    const dealt = Math.max(0, before - pool(t));
    ctx.events.push({ kind: "crash", id: t.id, x: at.x, y: at.y, dmg: dealt, kill: !t.alive });
    engine.log(`💢 ${t.name} ถูกผลักกระแทก -${dealt} (ลดเกราะก่อน)`);
    if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
  }
  if (!ctx.events.length) return;
  engine.ice.flush(ctx);
  engine.skillBeat(engine.ice.fxSeconds(ctx), () => {});
}
// เป้าตกรอบ/หายไประหว่างคลิปชน (ผู้ใช้ตัดสิน): หยุดที่ปลายทางพุ่ง (ช่องที่ภาพค้างไว้) · ช่องนั้นไม่ว่าง = อยู่ที่เดิม
//  ชนตัวใหญ่ = ตำแหน่งตั้งไว้แล้วตอนจบจังหวะพุ่ง
function settleAtStop(engine, p, stop, big) {
  if (!big && stop && engine.tileFree(stop.x, stop.y, p.id)) p.pos = { x: stop.x, y: stop.y };
  engine.setDash({ id: p.id, path: [{ ...p.pos }], quiet: true });
}

// ---------- Eagle Separade: รวบศัตรูรอบเป้า → พายุขนนกแดง ----------
// ช่องว่างที่ใกล้เป้าสุด (ไม่ไกลกว่าที่ยืนเดิม) สำหรับคนที่ถูกรวบ — วงติดตัวเป้าก่อน แล้ววงถัดไป
function gatherSpot(engine, t, u, taken) {
  const box = Board.boxOf(t), here = Board.dist(box, Board.boxOf(u));
  let best = null;
  for (let dy = -EAGLE.radius - 1; dy <= EAGLE.radius + box.size; dy++) {
    for (let dx = -EAGLE.radius - 1; dx <= EAGLE.radius + box.size; dx++) {
      const x = box.x + dx, y = box.y + dy, k = `${x},${y}`;
      if (taken.has(k) || !engine.tileFree(x, y, u.id)) continue;
      const d = Board.dist(box, { x, y, size: 1 });
      if (d < 1 || d > here) continue;
      const step = Math.abs(x - u.pos.x) + Math.abs(y - u.pos.y);
      if (!best || d < best.d || (d === best.d && step < best.step)) best = { x, y, d, step };
    }
  }
  return best;
}
function eagleImpact(engine, p, t, dir) {
  if (!p.alive) return;
  engine.setDash({ id: p.id, path: [{ ...p.pos }], quiet: true });
  if (!t.alive || !t.pos) return;
  const center = { ...t.pos }, size = engine.sizeOf(t);
  const box = Board.boxOf(t);
  // ศัตรูในระยะ 2 รอบเป้า (ทอยหลบแยกคน — หลบพ้น = ไม่ถูกรวบ ไม่โดน)
  const near = Object.values(engine.players)
    .filter((o) => foeOf(engine, p, o) && o.id !== t.id && Board.dist(box, Board.boxOf(o)) <= EAGLE.radius)
    .sort((a, b) => Board.dist(box, Board.boxOf(a)) - Board.dist(box, Board.boxOf(b)));
  const caught = [];
  for (const o of near) {
    o.wasAttacked = true;
    if (engine.skillDodge(p, o, "Eagle Separade")) continue;
    caught.push(o);
  }
  // รวบ: คนตัวเล็กถูกดึงเข้าช่องว่างที่ใกล้เป้าสุด · ตัวใหญ่อยู่ที่เดิม
  const taken = new Set();
  const ctx = engine.ice.begin();
  const slides = [];
  for (const o of caught) {
    if (engine.sizeOf(o) > 1 || Board.dist(box, Board.boxOf(o)) <= 1) continue;
    const to = gatherSpot(engine, t, o, taken);
    if (!to) continue;
    taken.add(`${to.x},${to.y}`);
    const from = { ...o.pos };
    engine.ice.revealPushed(o);
    o.pos = { x: to.x, y: to.y };
    ctx.events.push({ kind: "knock", id: o.id, from, to: { x: to.x, y: to.y } });
    slides.push({ id: o.id, to: { x: to.x, y: to.y }, dir: { x: Math.sign(to.x - from.x), y: Math.sign(to.y - from.y) } });
  }
  fxOut(engine, "eagleStorm", { at: center, size, r: EAGLE.radius, pulled: ctx.events.map((e) => ({ id: e.id, from: e.from, to: e.to })) });
  if (ctx.events.length) { engine.ice.flush(ctx); engine.log(`🦅 ${p.name} รวบศัตรู ${ctx.events.length} คนเข้าหา ${t.name}`); }
  engine.skillBeat(PULL_SECONDS + STORM_HIT_SECONDS, () => {
    engine.ice.forcedSlides(slides, p); // ถูกรวบลงน้ำแข็ง = ไถลต่อ (ไม่มีช่องเดิม = ไม่เล่นภาพลากซ้ำ)
    const bonus = ultBonus(), out = [];
    if (t.alive) out.push(`${t.name} -${hurt(engine, t, EAGLE.center + bonus)}`);
    for (const o of caught) if (o.alive) out.push(`${o.name} -${hurt(engine, o, EAGLE.other + bonus)}`);
    engine.log(`🌪️ Eagle Separade — พายุขนนก ${out.join(" · ")} (ลดเกราะก่อน)`);
    engine.skillBeat(STORM_SECONDS - STORM_HIT_SECONDS, () => {});
  });
}

// ---------- Orca Separade: พายุน้ำตลอดแนว ----------
function drain(engine, t, n) {
  const sp = Math.max(0, t.skillPoints || 0), take = Math.min(sp, n);
  if (take > 0) t.skillPoints = sp - take;
  return { take, short: n - take };
}
function orcaImpact(engine, p, t, rest, dir, water) {
  if (!p.alive) return;
  engine.setDash({ id: p.id, path: [{ ...p.pos }], quiet: true });
  if (!t.alive || !t.pos) return;
  // เป้าแรก + ศัตรูทุกคนในแนวหลังเป้าจนสุดแนว (ทอยหลบแยก)
  const hitIds = new Set([t.id]);
  const victims = [t];
  for (const c of rest) {
    if (c.wall) break;
    const o = c.unitId ? engine.players[c.unitId] : null;
    if (!foeOf(engine, p, o) || hitIds.has(o.id)) continue;
    hitIds.add(o.id);
    o.wasAttacked = true;
    if (!engine.skillDodge(p, o, "Orca Separade")) victims.push(o);
  }
  const line = [tile(t.pos), ...rest.filter((c) => !c.wall).map(tile)];
  fxOut(engine, "orcaStorm", { at: tile(p.pos), tiles: line, dir: dirVec(dir), water: !!water });
  engine.skillBeat(STORM_HIT_SECONDS, () => {
    const out = [];
    for (const o of victims) {
      if (!o.alive) continue;
      const { take, short } = drain(engine, o, ORCA.drain);
      const dealt = hurt(engine, o, ORCA.dmg + ultBonus() + short);
      out.push(`${o.name} -${dealt}${take ? ` · แต้มสกิล -${take}` : ""}`);
    }
    engine.log(`🌊 Orca Separade — พายุน้ำ ${out.join(" · ")} (ลดเกราะก่อน)`);
    engine.skillBeat(STORM_SECONDS - STORM_HIT_SECONDS, () => {});
  });
}

// ---------- Tutle Separade: กระดองเต่า ----------
// โยนไปช่อง to: แนวตรง = ไถลไปตามแนว ชนศัตรูคนแรก (หลบได้) แล้วดันไปพร้อมกระดองจนถึงปลาย · ไม่ตรงแนว = โยนโค้งลงช่องนั้น
function throwShell(engine, p, to) {
  if (!p.alive || !p.pos || !to) return;
  const s = st(p);
  dropShell(engine, p, false); // กระดองเดิมหาย (กดใหม่ได้หลังคูลดาวน์เท่านั้นอยู่แล้ว)
  const from = { ...p.pos };
  const dx = Math.sign(to.x - from.x), dy = Math.sign(to.y - from.y);
  const straight = (to.x === from.x) !== (to.y === from.y);
  const steps = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
  let land = { x: to.x, y: to.y }, caught = null, hitAt = null, push = null;
  if (straight) {
    // ไถลตามแนว: สิ่งกีดขวาง = หยุดก่อน · ศัตรูคนแรกที่หลบไม่พ้น = ครอบ แล้วดันต่อจนสุด (ติดของ/คน = หยุด)
    let i = 1;
    for (; i <= steps; i++) {
      const x = from.x + dx * i, y = from.y + dy * i;
      const o = Object.values(engine.players).find((u) => u.alive && u.pos && u.id !== p.id && Board.covers(Board.boxOf(u), x, y));
      if (!o && !engine.tileFree(x, y, null)) { land = { x: x - dx, y: y - dy }; break; }
      if (o && foeOf(engine, p, o) && engine.sizeOf(o) <= 1) {
        o.wasAttacked = true;
        if (!engine.skillDodge(p, o, "Tutle Separade")) { caught = o; hitAt = { x, y }; break; }
      } else if (o && engine.sizeOf(o) > 1) { land = { x: x - dx, y: y - dy }; break; }
    }
    if (caught) {
      let cx = hitAt.x, cy = hitAt.y;
      for (let j = i + 1; j <= steps; j++) {
        const x = from.x + dx * j, y = from.y + dy * j;
        if (!engine.tileFree(x, y, caught.id)) break;
        cx = x; cy = y;
      }
      land = { x: cx, y: cy };
      if (cx !== hitAt.x || cy !== hitAt.y) push = { id: caught.id, from: hitAt, to: { x: cx, y: cy } };
    }
  } else {
    const o = Object.values(engine.players).find((u) => u.alive && u.pos && u.id !== p.id && Board.covers(Board.boxOf(u), to.x, to.y));
    if (o && foeOf(engine, p, o) && engine.sizeOf(o) <= 1) {
      o.wasAttacked = true;
      if (!engine.skillDodge(p, o, "Tutle Separade")) { caught = o; hitAt = { ...to }; }
    }
  }
  const flight = straight ? Math.abs((hitAt || land).x - from.x) + Math.abs((hitAt || land).y - from.y) : steps;
  fxOut(engine, "shellThrow", { from, to: land, hit: hitAt, arc: !straight, id: p.id });
  const seconds = (SHELL_LEAD_MS + Math.max(1, flight) * SHELL_STEP_MS) / 1000 + 0.15;
  engine.skillBeat(seconds, () => {
    s.shell = { x: land.x, y: land.y, until: engine.roundNumber + TUTLE.turns, on: null, at: engine.severStamp() };
    if (!caught || !caught.alive || !caught.pos) { engine.log(`🐢 ${p.name} โยนกระดองเต่าไปลงพื้น`); return; }
    s.shell.on = caught.id;
    engine.ice.revealPushed(caught);
    // ถูกตรึง 2 เทิร์นเต็ม (เป้าที่เดินไปแล้ว/กำลังเดิน +1 — แบบตรึงของเกรย์)
    engine.applyDebuff(caught, "rooted", 1, TUTLE.turns + (engine.hasActed(caught.id) || engine.actorId === caught.id ? 1 : 0));
    fxOut(engine, "encase", { at: { ...hitAt }, id: caught.id });
    if (push) {
      caught.pos = { ...push.to };
      const ctx = engine.ice.begin();
      ctx.events.push({ kind: "knock", id: caught.id, from: push.from, to: push.to });
      engine.ice.flush(ctx);
      engine.log(`🐢 ${p.name} ครอบ ${caught.name} ด้วยกระดองเต่า แล้วดันไป ${Math.abs(push.to.x - push.from.x) + Math.abs(push.to.y - push.from.y)} ช่อง`);
      engine.skillBeat(engine.ice.fxSeconds(ctx), () => {});
    } else engine.log(`🐢 ${p.name} ครอบ ${caught.name} ด้วยกระดองเต่า`);
  });
}
// กระดองหาย (หมดเวลา / วาร์ป / แตก / ตัดผล) — ปล่อยคนในกระดอง (ตรึงจบด้วย)
function dropShell(engine, p, log = true) {
  const s = st(p), sh = s.shell;
  if (!sh) return;
  s.shell = null;
  const u = sh.on && engine.players[sh.on];
  if (u && u.statuses && u.statuses.rooted) { delete u.statuses.rooted; if (u.statusAmt) delete u.statusAmt.rooted; }
  if (log) engine.log(`🐢 กระดองเต่าของ ${p.name} หายไป`);
}
const shellTile = (engine, p) => {
  const sh = st(p).shell;
  if (!sh) return null;
  const u = sh.on && engine.players[sh.on];
  return u && u.alive && u.pos ? { ...u.pos } : { x: sh.x, y: sh.y };
};
// วาร์ป: ช่องกระดอง (ว่าง) หรือช่องว่างติดกระดองที่ใกล้เราสุด
function warpSpot(engine, p) {
  const at = shellTile(engine, p);
  if (!at) return null;
  if (engine.tileFree(at.x, at.y, p.id)) return at;
  const around = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: at.x + dx, y: at.y + dy }))
    .filter((c) => engine.tileFree(c.x, c.y, p.id))
    .sort((a, b) => (Math.abs(a.x - p.pos.x) + Math.abs(a.y - p.pos.y)) - (Math.abs(b.x - p.pos.x) + Math.abs(b.y - p.pos.y)));
  return around[0] || null;
}
function warp(engine, p) {
  const to = warpSpot(engine, p);
  if (!to || !p.pos) return false;
  const from = { ...p.pos };
  if (engine.action.moved) engine.rebaseMove(p);
  p.pos = { ...to };
  Object.assign(engine.action, { from: { ...p.pos }, path: null, trail: null, iceUndo: null, smashed: null, locked: true });
  dropShell(engine, p, false);
  engine.setDash({ id: p.id, path: [{ ...to }], quiet: true, style: "soraWarp", from });
  fxOut(engine, "warp", { from, to });
  engine.log(`🐢 ${p.name} วาร์ปไปที่กระดองเต่า — Tutle Separade จบ`);
  return true;
}
const encasedBy = (engine, u) => Object.values(engine.players).find((q) => isSora(q) && q.alive && q.sora && q.sora.shell && q.sora.shell.on === u.id) || null;

// Orca Echo (ปุ่มพิเศษ ร่าง Orca · 0 แต้ม · ไม่ใช้โควตาสกิล · ไม่ล็อกการเดิน · คูลดาวน์ 2): โซระเห็นทุกคนที่ซ่อน 2 เทิร์น
//  คลิปทุกครั้ง (ผู้ใช้สั่ง) แล้วคลื่นโซนาร์เห็นเฉพาะโซระ
function orcaEcho(engine, p) {
  const s = st(p), r = engine.roundNumber;
  if (frameOf(p) !== "orca" || r < (s.echoReady || 0)) return false;
  s.echoReady = r + 1 + ORCA.echoCd;
  s.sightUntil = r + ORCA.echoTurns;
  engine.queueCutscene(p, CUT.orcaEcho);
  engine.deferAfterCutscene(() => { if (p.alive && p.pos) engine.boardFxTo([p.id], "soraFx", { kind: "sonar", at: tile(p.pos) }); });
  engine.log(`🐋 ${p.name} ใช้ Orca Echo — มองเห็นทุกคนที่ซ่อนอยู่ ${ORCA.echoTurns} เทิร์น`);
  return true;
}

// ร่าง My-Th / Frame: ปุ่มแปลงร่างเป็นตัวเลือก (desc = คำอธิบายตอนชี้ค้าง — กฎผู้ใช้ 2026-10-19)
const CHOICE = {
  fire: { key: "fire", name: "Fire Frame", img: IMG.fire, desc: `Fire Frame: ตีปกติและ Mouse Separade ติดลุกไหม้ ${FIRE_BURN} · จบเทิร์นเสียแต้มสกิล ${FIRE_UPKEEP} (แต้มไม่พอ = กลับร่าง My-Th)` },
  eagle: { key: "eagle", name: "Eagle Frame", img: IMG.eagle, desc: `Eagle Frame: ระยะเดิน +${EAGLE.mov} · ท่าไม้ตาย Eagle Separade` },
  tutle: { key: "tutle", name: "Tutle Frame", img: IMG.tutle, desc: `Tutle Frame: ระยะเดิน ${TUTLE.mov} · เกราะสูงสุด +${TUTLE.armor} · ท่าไม้ตาย Tutle Separade` },
  orca: { key: "orca", name: "Orca Frame", img: IMG.orca, desc: `Orca Frame: ระยะเดิน +${ORCA.mov} (เริ่มบนพื้นเปียก +${ORCA.wetMov}) · เดินทิ้งพื้นเปียก ไม่ลื่น · ปุ่มพิเศษ Orca Echo · ท่าไม้ตาย Orca Separade` },
  myth: { key: "myth", name: "Kamen Rider My-Th", img: IMG.myth, desc: "กลับเป็นร่าง Kamen Rider My-Th" },
  sora: { key: "sora", name: "คืนร่าง", img: IMG.toSora, desc: "กลับเป็นร่างโซระ" },
};
function formChoices(frame) {
  const keys = [...FRAMES.filter((f) => f !== frame), ...(frame ? ["myth"] : []), "sora"];
  return keys.map((k) => CHOICE[k]);
}
// เกราะเกินความจุหลังออกจาก Tutle Frame = ตัดทิ้ง
function clampArmor(engine, p) {
  const max = engine.maxArmorOf(p);
  if (Number.isFinite(max) && p.armor > max) p.armor = max;
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, KNIFE_BONUS, GUN_RANGE, CRIT_PCT, REGEN_TURNS, ULT_LEN, ULT_DMG, ULT_CD, BIG_BONUS, BIG_PUSH, CRASH_DMG, FIRE_BURN, FIRE_UPKEEP,
  FORM_ATK, PVE_FORM_ATK, PVE_ULT, EAGLE, TUTLE, ORCA, FRAME_NAME,

  resetCombat(p) { p.sora = isSora(p) ? fresh() : null; },
  displayImg(p) {
    const f = frameOf(p);
    if (f === "fire") return IMG.mythFire;
    if (f) return IMG[f];
    return mythOn(p) ? IMG.myth : null;
  },

  // ธาตุ (server/element.js · GRID_PLAN §8.7.1): Fire 🔥 · Eagle ลม · Orca น้ำ — ทุกการกระทำในร่างนั้น
  //  ผู้ใช้สั่ง 2026-11-15: Eagle = ลม · Orca = น้ำ · Tutle ไม่มีธาตุ (ทุกการกระทำในร่างนั้น)
  defaultElement(engine, p) {
    const f = frameOf(p);
    return f === "fire" ? "fire" : f === "eagle" ? "wind" : f === "orca" ? "water" : null;
  },

  // ---------- ค่าสถานะตามร่าง ----------
  mov(p) {
    const f = frameOf(p);
    if (f === "eagle") return BASE_MOV + EAGLE.mov;
    if (f === "tutle") return BASE_MOV + TUTLE.mov;
    if (f === "orca") return BASE_MOV + (st(p).wetStart ? ORCA.wetMov : ORCA.mov);
    return null;
  },
  maxArmor(p, base) { return frameOf(p) === "tutle" ? base + TUTLE.armor : base; },
  // Orca: ว่ายบนพื้นเปียก ไม่ไถล (server/phases/action.js swims · Board opts.swim)
  swims(p) { return frameOf(p) === "orca"; },
  onActorStart(engine, p) {
    if (!isSora(p)) return;
    st(p).wetStart = !!(p.pos && engine.ice.wetAt(p.pos.x, p.pos.y));
  },
  // Orca: เดินทิ้งพื้นเปียก (ช่องที่เปียกใหม่ — ย้อนการเดิน = แห้งคืน)
  afterWalk(engine, p, tiles) {
    if (frameOf(p) !== "orca" || !p.alive || !Array.isArray(tiles)) return [];
    const laid = engine.ice.layWet(tiles.map(tile), ORCA.wetTurns);
    return laid.length ? [{ undo: () => engine.ice.dryWet(laid) }] : [];
  },
  // Orca Echo: เห็นทุกคนที่ซ่อนอยู่ (server/visibility.js — ฮุคของผู้มอง)
  trueSight(engine, viewer) { return isSora(viewer) && engine.roundNumber < (st(viewer).sightUntil || 0); },

  // ---------- ตีปกติ ----------
  range(p) { return gunOn(p) ? GUN_RANGE : null; },
  // ท่าพุ่งลงหนาม (hitCrossed): ฐาน = ดาเมจท่า · ร่างที่ไม่ใช่มนุษย์ = พลังโจมตีพื้นฐาน +1 (PVE +2)
  attackBaseOverride(engine, attacker, target, ctx) {
    if (striking === attacker.id) return ULT_DMG + ultBonus();
    const f = formAtk(attacker);
    if (f && ctx) ctx.soraForm = f;
    return 1 + f;
  },
  damageBonus(engine, attacker, target, ctx) {
    if (striking === attacker.id || !knifeOn(attacker)) return 0;
    ctx.soraKnife = KNIFE_BONUS;
    return KNIFE_BONUS;
  },
  attackFxNames(attacker, atkCtx) {
    const out = [];
    if (atkCtx && atkCtx.soraForm) out.push(`${FRAME_NAME[frameOf(attacker)] || "Kamen Rider My-Th"} +${atkCtx.soraForm}`);
    if (atkCtx && atkCtx.soraKnife) out.push(`My-Th Edge มีด +${atkCtx.soraKnife}`);
    return out;
  },
  critPct(p) { return mythOn(p) && PassiveSeal.on(p) ? CRIT_PCT : 0; }, // คริ 20% = สกิลติดตัว เพื่อคุณหนู (ลบสกิลติดตัว = ไม่มี)
  attackBeam(p) { return gunOn(p) ? GUN_BEAM : 0; },
  attackBeamTone(p) { return gunOn(p) ? "blue" : null; },
  attackHitFx(p) { return knifeOn(p) ? "mythSlash" : null; },
  // Fire Frame: เสียงไฟลุกต่อท้ายเสียงตี (client เล่นหลังจังหวะปะทะ after ms · หลบพ้น = ไม่เล่น)
  attackTailSound(p) {
    if (!fireOn(p)) return null;
    return { key: SFX.fire, after: st(p).gun ? FIRE_TAIL_MS.gun : FIRE_TAIL_MS.knife };
  },
  attackSound(p) {
    if (gunOn(p)) return SFX.gun;
    if (knifeOn(p)) return SFX.knife;
    return undefined;
  },
  // Fire Frame: ตีปกติลง = ลุกไหม้ 1 (ป้ายใต้ฉากตี)
  onStrikeLanded(engine, attacker, target) {
    if (!fireOn(attacker)) return [];
    const b = burn(engine, target);
    return b ? [b] : [];
  },
  afterBoardAttack(engine, attacker, target, res) {
    if (!gunOn(attacker) || !res || res.dodge || !target.alive) return null;
    return () => pull(engine, attacker, target);
  },
  // Tutle Separade: ตีปกติใส่คนในกระดองของเรา = คลิปชน → ความเสียหาย 6 + ผุพัง 2 เทิร์น · กระดองแตก (หลบได้)
  interceptStrike(engine, p, target) {
    if (!isSora(p) || !target) return null;
    const sh = st(p).shell;
    if (!sh || sh.on !== target.id || !target.alive) return null;
    target.wasAttacked = true;
    if (engine.skillDodge(p, target, "Tutle Separade")) {
      engine.log(`🐢 ${target.name} หลบการโจมตีของ ${p.name} ได้`);
      return { after: () => 1 };
    }
    engine.queueCutscene(p, CUT.tutleHit);
    return {
      after: () => {
        if (!target.alive || !target.pos) { dropShell(engine, p, false); return 0.6; }
        const at = { ...target.pos };
        dropShell(engine, p, false);
        const dealt = hurt(engine, target, TUTLE.dmg + ultBonus());
        const rot = target.alive && engine.applyDebuff(target, "decay", null, TUTLE.decay);
        engine.log(`🐢 Tutle Separade → ${target.name} -${dealt} (ลดเกราะก่อน)${rot ? ` · ผุพัง ${TUTLE.decay} เทิร์น` : ""} · กระดองแตก`);
        fxOut(engine, "shellBreak", { at, id: target.id });
        return BOOM_SECONDS;
      },
    };
  },
  // กระดองเต่า: คนในกระดองไม่ได้รับความเสียหายจากการโจมตีของคนอื่น (ฮุค broadcast — combat.attackBlocked)
  shieldsFrom(engine, u, attacker) {
    const q = encasedBy(engine, u);
    if (!q || !attacker || attacker.id === q.id) return null;
    return { name: "กระดองเต่า", img: IMG.tutleUlt };
  },
  boardPublic(engine) {
    const shells = [];
    for (const q of Object.values(engine.players)) {
      if (!isSora(q) || !q.sora || !q.sora.shell) continue;
      const sh = q.sora.shell, u = sh.on && engine.players[sh.on];
      shells.push({ x: sh.x, y: sh.y, on: u && u.alive && u.pos ? u.id : null, by: q.id, left: Math.max(1, sh.until - engine.roundNumber) });
    }
    return shells.length ? { soraShells: shells } : {};
  },
  // ปุ่มพิเศษบน HUD (ไม่ใช่ช่องสกิล — ผู้ใช้สั่ง 2026-11-15): วาร์ปไปกระดอง (มีกระดองอยู่) · Orca Echo (ร่าง Orca)
  hudActions(engine, p) {
    if (!isSora(p) || !p.alive) return undefined;
    const s = st(p), r = engine.roundNumber, out = [];
    if (frameOf(p) === "orca") {
      const cd = Math.max(0, (s.echoReady || 0) - r);
      out.push({ key: "orcaEcho", icon: "🐋", name: "Orca Echo", img: IMG.orcaEcho, cd: Math.min(ORCA.echoCd, cd), on: r < (s.sightUntil || 0), disabled: cd > 0 || !engine.canAct(p) });
    }
    if (s.shell) out.push({ key: "soraWarp", icon: "🐢", name: "วาร์ป", img: IMG.tutleUlt, disabled: !(engine.canAct(p) && warpSpot(engine, p)) });
    return out.length ? out : undefined;
  },
  charAction(engine, p, key) {
    if (!isSora(p) || !engine.canAct(p)) return;
    if (key === "soraWarp" && st(p).shell) { if (warp(engine, p)) engine.broadcastState(); return; }
    if (key === "orcaEcho" && orcaEcho(engine, p)) engine.pausePlayingForCutscene();
  },

  // ---------- สกิล ----------
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isSora(p)) return true;
    const s = st(p);
    if (tier === "basic") {
      if (s.formRound === engine.roundNumber) return false;
      return !opts.form || !s.myth || !!CHOICE[opts.form];
    }
    if (tier === "secondary") {
      if (!s.myth) return false;
      return s.weaponRound !== engine.roundNumber;
    }
    if (tier === "ultimate") {
      if (!s.myth || engine.roundNumber < s.ultReady) return false;
      if (frameOf(p) === "tutle") {
        const t = opts.tile;
        if (!t || !p.pos || (t.x === p.pos.x && t.y === p.pos.y)) return false;
        return !engine.boardMap().terrain[`${t.x},${t.y}`];
      }
      return true;
    }
    return false;
  },
  // แปลงร่าง / สลับอาวุธ ไม่นับเป็นการใช้สกิล (ผู้ใช้ตัดสิน) — กดแล้วยังใช้ท่าไม้ตายได้ในเทิร์นเดียวกัน
  skipsTurnQuota: freeTier,
  ignoresTurnQuota: freeTier,
  // ท่าพุ่ง: ผลของสกิลโจมตีพื้นที่ลงเองเฉพาะช่องที่พุ่งผ่านจริง (hitCrossed)
  ownsAreaHit(p, tier) { return isSora(p) && tier === "ultimate"; },
  skillArea(p, tier, area) {
    if (!isSora(p) || tier !== "ultimate") return area;
    const f = frameOf(p);
    if (f === "eagle") return { ...area, len: EAGLE.len };
    if (f === "orca") return { ...area, len: ORCA.len };
    if (f === "tutle") return { kind: "tile", range: TUTLE.range, place: "any", hostile: true };
    return area;
  },
  skillSound(p, tier) {
    if (!isSora(p) || tier !== "secondary") return null;
    return st(p).gun ? SFX.toGun : SFX.toKnife; // เรียกหลังสลับแล้ว = เสียงของอาวุธที่ถืออยู่ตอนนี้
  },
  skillPub(p, tier) {
    if (!isSora(p)) return null;
    const f = frameOf(p);
    if (tier === "basic") {
      if (!mythOn(p)) return { img: IMG.toMyth };
      // require ตอนเรียก: engine require โมดูลตัวละครตอนโหลด
      const locked = st(p).formRound === require("../server/engine").engine.roundNumber;
      return { img: f ? IMG.toSora : IMG.fire, choices: formChoices(f).map((c) => ({ ...c, area: { kind: "self" }, cost: 0, free: true, locked })) };
    }
    if (tier === "secondary") {
      return { name: `My-Th Edge (${st(p).gun ? "มีด" : "ปืน"})` };
    }
    if (tier === "ultimate") {
      const b = ultBonus();
      if (f === "eagle") return { name: "Eagle Separade", img: IMG.eagleUlt, desc: `เลือกทิศ: พุ่งสุดแนว ${EAGLE.len}×1 · ชนศัตรูคนแรก: รวบศัตรูในระยะ ${EAGLE.radius} รอบเป้าเข้ามาติดเป้า แล้วพายุขนนก — เป้า ${EAGLE.center + b} · คนอื่น ${EAGLE.other + b} (คูลดาวน์ ${ULT_CD} เทิร์น)` };
      if (f === "tutle") return { name: "Tutle Separade", img: IMG.tutleUlt, desc: `เลือกช่องในระยะ ${TUTLE.range}: โยนกระดองเต่า (แนวตรง = ไถลชนคนแรกแล้วดันไปถึงช่องนั้น) · อยู่ ${TUTLE.turns} เทิร์น · ครอบศัตรู = เดินไม่ได้ ${TUTLE.turns} เทิร์น และไม่ได้รับความเสียหายจากคนอื่น · ตีปกติใส่คนในกระดอง = ${TUTLE.dmg + b} + ผุพัง ${TUTLE.decay} เทิร์น · ปุ่มวาร์ป: ไปที่กระดอง (ท่าจบ) (คูลดาวน์ ${ULT_CD} เทิร์น)` };
      if (f === "orca") return { name: "Orca Separade", img: IMG.orcaUlt, desc: `เลือกทิศ: ช่องแรกเปียก = ไถลตามพื้นเปียกจนสุด · ไม่เปียก = พุ่ง ${ORCA.len}×1 ทิ้งพื้นเปียก · ชนศัตรูคนแรก: พายุน้ำ ศัตรูทุกคนในแนวจากเป้า ${ORCA.dmg + b} + แต้มสกิล -${ORCA.drain} (ไม่พอ = ส่วนที่ขาดเป็นความเสียหาย) (คูลดาวน์ ${ULT_CD} เทิร์น)` };
      if (b) return { desc: `ร่าง My-Th · เลือกทิศ: พุ่งสุดแนว ${ULT_LEN}×1 พังสิ่งกีดขวางที่ผ่าน · ชนศัตรูคนแรกที่หลบไม่พ้น: ความเสียหาย ${ULT_DMG + b} แล้วสลับที่ · ตัวใหญ่: ความเสียหาย ${ULT_DMG + BIG_BONUS + b} แล้วผลักถอย ${BIG_PUSH} ช่อง (คูลดาวน์ ${ULT_CD} เทิร์น)` };
    }
    return null;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isSora(p)) return "";
    const s = st(p);
    p.cutsceneShown ||= {};
    const clipOnce = (key) => { if (!p.cutsceneShown[key]) { p.cutsceneShown[key] = true; engine.queueCutscene(p, key); } };
    if (tier === "basic") {
      s.formRound = engine.roundNumber;
      // ร่าง Frame + เลือก My-Th = ถอด Frame เหลือ My-Th
      const cur = frameOf(p);
      if (s.myth && cur && opts.form === "myth") {
        setFrame(s, null);
        clampArmor(engine, p);
        engine.log(`🐭 ${p.name} กลับเป็นร่าง Kamen Rider My-Th`);
        return " — Kamen Rider My-Th";
      }
      // ร่าง My-Th / Frame + เลือก Frame = เปลี่ยน Frame · อย่างอื่น (คืนร่าง / ไม่ส่งตัวเลือก) = สลับร่างตามเดิม
      if (s.myth && FRAMES.includes(opts.form) && opts.form !== cur) {
        setFrame(s, opts.form);
        s.frameAt = engine.severStamp();
        clampArmor(engine, p);
        clipOnce(CUT[opts.form]);
        engine.log(`${{ fire: "🔥", eagle: "🦅", tutle: "🐢", orca: "🐋" }[opts.form]} ${p.name} เปลี่ยนเป็น Kamen Rider My-Th ${FRAME_NAME[opts.form]}`);
        return ` — ${FRAME_NAME[opts.form]}`;
      }
      s.myth = !s.myth;
      setFrame(s, null);
      clampArmor(engine, p);
      s.calm = 0;
      if (s.myth) s.mythAt = engine.severStamp();
      if (s.myth) clipOnce(CUT.transform);
      engine.log(s.myth ? `🐭 ${p.name} แปลงร่างเป็น Kamen Rider My-Th` : `🐭 ${p.name} กลับเป็นร่างโซระ`);
      return s.myth ? " — Kamen Rider My-Th" : " — โซระ";
    }
    if (tier === "secondary") {
      s.weaponRound = engine.roundNumber;
      s.gun = !s.gun;
      engine.log(`🗡️ ${p.name} เปลี่ยน My-Th Edge เป็น${s.gun ? "ปืน" : "มีด"}`);
      return "";
    }
    if (tier === "ultimate") {
      s.ultReady = engine.roundNumber + 1 + ULT_CD;
      const f = frameOf(p);
      // คลิปเปิดแยกตามร่าง (ครั้งแรกต่อเกมของแต่ละร่าง)
      clipOnce({ fire: CUT.fireUlt, eagle: CUT.eagleUlt, tutle: CUT.tutleUlt, orca: CUT.orcaUlt }[f] || CUT.ult);
      engine.log(`🐭 ${p.name} ใช้ ${ULT_NAME[f || "myth"]}`);
      if (f === "tutle") {
        const to = opts.tile ? { x: opts.tile.x, y: opts.tile.y } : null;
        engine.deferAfterCutscene(() => throwShell(engine, p, to));
      } else engine.deferAfterCutscene(() => charge(engine, p, opts.dir, f));
      return "";
    }
    return "";
  },

  // ---------- ตัดผลสกิล (server/sever.js — รากฐานจิตของเรียวกิ) ----------
  //  ร่าง My-Th → กลับร่างโซระทันที แบบเดียวกับกดแปลงร่างคืน: แปลงร่างเทิร์นละ 1 ครั้ง (เทิร์นนี้แปลงกลับไม่ได้) · เพื่อคุณหนูนับใหม่
  //  อาวุธ My-Th Edge ค้างตามเดิม (คืนร่างไม่รีเซ็ต) · Frame (เข้าทีหลัง My-Th เสมอ) → ตัดแล้วเหลือร่าง My-Th ปกติ
  //  กระดองเต่า → หาย (ปล่อยคนในกระดอง) · Orca Echo → หยุดมองทะลุ
  severables(engine, p) {
    if (!isSora(p)) return [];
    const s = st(p);
    const out = [];
    if (s.shell) out.push({ key: "soraShell", label: "Tutle Separade", at: s.shell.at || 0, cancel() { dropShell(engine, p, false); } });
    if (!s.myth) return out;
    out.push({
      key: "soraMyth", label: "Kamen Rider My-Th", at: s.mythAt || 0,
      cancel() { s.myth = false; setFrame(s, null); clampArmor(engine, p); s.calm = 0; s.formRound = engine.roundNumber; },
    });
    const fr = frameOf(p);
    if (fr) out.push({
      key: fr === "fire" ? "soraFire" : `sora_${fr}`, label: FRAME_NAME[fr], at: s.frameAt || 0,
      cancel() { setFrame(s, null); clampArmor(engine, p); s.formRound = engine.roundNumber; },
    });
    return out;
  },

  // ---------- จบเทิร์น ----------
  //  เพื่อคุณหนู: ร่างโซระครบ 2 เทิร์น ฟื้น 2 · Fire Frame: แต้มสกิล -1 (ไม่พอ = กลับร่าง My-Th) · กระดองเต่าหมดเวลา
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isSora(p)) continue;
      const s = st(p);
      if (s.shell && (!p.alive || engine.roundNumber + 1 >= s.shell.until)) dropShell(engine, p);
      if (!p.alive) continue;
      if (fireOn(p)) {
        if ((p.skillPoints || 0) >= FIRE_UPKEEP) {
          p.skillPoints -= FIRE_UPKEEP;
          engine.log(`🔥 ${p.name} Fire Frame — แต้มสกิล -${FIRE_UPKEEP}`);
        } else {
          setFrame(s, null);
          engine.log(`🔥 ${p.name} แต้มสกิลไม่พอ — Fire Frame ดับ กลับร่าง My-Th`);
        }
        continue;
      }
      if (s.myth || s.formRound === engine.roundNumber) continue;
      if (!PassiveSeal.on(p)) continue; // ลบสกิลติดตัว (server/passiveSeal.js): ไม่นับเพิ่ม ไม่ฟื้น · ค่าที่นับไว้คงเดิม
      s.calm++;
      if (s.calm < REGEN_TURNS) continue;
      s.calm = 0;
      const healed = engine.healHp(p, REGEN_HP);
      if (healed > 0) engine.log(`🐭 ${p.name} เพื่อคุณหนู — ฟื้นพลังชีวิต +${healed}`);
    }
  },
  onDeath(engine, p) {
    if (isSora(p) && p.sora && p.sora.shell) dropShell(engine, p, false);
  },

  // ---------- ข้อมูลให้ client ----------
  soraState(engine, p) {
    if (!isSora(p)) return undefined;
    const s = st(p);
    const f = frameOf(p);
    return { myth: !!s.myth, fire: f === "fire", frame: f, gun: !!s.gun, calm: s.calm, calmMax: REGEN_TURNS, sight: engine.roundNumber < (s.sightUntil || 0) };
  },
  skillLocks(engine, p) {
    if (!isSora(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      basic: { locked: s.formRound === r, free: true }, // free = ไม่กินโควตาสกิลของเทิร์น (ปุ่มยังกดได้หลังใช้สกิลอื่น)
      secondary: { locked: !s.myth || s.weaponRound === r, free: true },
      // เทิร์นที่กดเอง = โควตาสกิลล็อกอยู่แล้ว → โชว์ไม่เกิน ULT_CD
      ultimate: { locked: !s.myth, cd: Math.min(ULT_CD, Math.max(0, s.ultReady - r)) },
    };
  },
};
