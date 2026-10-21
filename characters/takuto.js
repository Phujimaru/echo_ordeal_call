// ============================================================
//  ซึนาชิ ทาคุโตะ (Star Driver) — ระดับพิเศษ · unique · id "takuto" · กติกาที่ผู้ใช้ตัดสิน GRID_PLAN §7.16 (2026-10-21)
//  สัญญาข้อมูล client: .claude/plans/takuto-contract.md · เอฟเฟกต์ client/src/board/takutoFx.js
//
//  ค่าพื้นฐาน 7/3/1 · ร่างคน: เดิน 5 · ใช้สกิลไม่ได้เลย (ท่าไม้ตายด้วย)
//  apprivoise (ติดตัว): ห่วงเวลาซีโร่เริ่ม (dealRound แรกในห่วงเวลา — onRoundStartTick) = คลิปแปลงร่าง → "ทาวเบิร์น" ตัว 3×3 (อยู่จนจบเกม · เดิน 5)
//    · เฟส 2 ครั้งแรก: คลิป passive · ต้นตาเดินพุ่งได้ 4 ทิศ 1–3 ช่อง (ชนแล้วหยุด · ไม่มีดาเมจ) แล้วเดินต่อปกติ — ทุกตาเดินจนจบเกม
//      (ปุ่ม HUD hudActions "dash" + tiles → socket charAction { key, tile })
//    · เฟส 4 ครั้งแรก: คลิป passive2 · ฟื้นพลังชีวิต 3 (ครั้งเดียว)
//    · ห่วงเวลาถูกทำลาย (ผนึกอันสุดท้ายแตก · ทาคุโตะยังอยู่ — zeroCollapseTurns 5): คลิป passive3 · มิติค่อยๆ พังทลาย 5 เทิร์น
//      — เพลง takuto_theme · เดิน 8 (เฉพาะช่วงนี้) · พลังโจมตี +1 ถาวร · ถือดาบครบ 2 เล่ม = ดาบแห่งการพิพากษา (คลิป duosword)
//        ตีปกติเป็นการปาเป้าเดียวระยะ 1–4 ความเสียหายตายตัว 4 (คลิป duosword_hit ก่อนฉากตีทุกครั้ง) แล้วดาบทั้งสองหาย · จบช่วงนี้ = แยกเป็น 2 เล่มเดิม
//  เมื่อสิ่งที่อยากทำ และควรจะทำเป็นเรื่องเดียวกัน (ติดตัว 2): โอกาสเกิดห่วงเวลาซีโร่ +45% (ยังมีชีวิต) · ไม่โดนผลเสียของห่วงเวลา
//    (กัดกินทุกเทิร์น · ฟ้าผ่า · ล็อกท่าไม้ตาย · แรงปลดผนึก) — ฮุค zeroChanceBonus / zeroImmune ใน server/zeroTime.js
//  ดาบอันเจิดจรัด (พื้นฐาน · ปุ่ม 2 ตัวเลือก · 2 แต้ม · ไม่กินโควตา · ใช้แล้วยังเดินได้ · เรียกซ้ำไม่ได้ถ้ายังอยู่) อยู่ 5 เทิร์น (statuses)
//    เอเมอรูด: ตีปกติฟื้นพลังชีวิตเท่าความเสียหายจริงที่ทำได้ (รวมเกราะ · รวมทุกคนในการตีครั้งเดียว) สูงสุด 2 · แซฟไฟร์: ตีปกติแบบกิงกะ (ทั้งด้าน 3 ช่อง)
//  ดาบประกายแสง (รอง · 4 · ต้องถือ 2 เล่ม · คูลดาวน์ 3): แนว 5×3 ศัตรูทุกคนเสียหาย 4 → สลับตำแหน่งกับศัตรูที่ไกลที่สุด (ทาคุโตะไปลงที่เป้า
//    เป้ามาลงจุดเดิมของทาคุโตะ · ลงไม่ได้ = ช่องว่างใกล้สุด · เป้าตาย = ทาคุโตะไปที่นั่นคนเดียว) · ดาบไม่หาย · เดินต่อไม่ได้
//  ทาวววว มิสไซล์ (ท่าไม้ตาย · 6 · คูลดาวน์ 2): ลำแสงแนว 8×1 จากที่ยืน ศัตรูทุกคนเสียหาย 2 + ขโมยแต้มสกิลคนละ 2 (ขาดเท่าไร = ดาเมจเพิ่มเท่านั้น)
//  ฉันยังมองเห็นอยู่ (แทนท่าไม้ตายช่วงมิติพังทลาย · 6 · คูลดาวน์ร่วม): ระเบิดรอบตัวรัศมีเท่าระยะเดิน (8) ศัตรูทุกคนเสียหาย 5 · ตัวเองเสียหาย 5 (เหลืออย่างน้อย 1)
//
//  Claude ตัดสินเอง (บอกผู้ใช้แล้ว): ตัวทาวเบิร์น 3×3 เดินพังสิ่งกีดขวางแบบกิงกะ · คลิปสกิล (skill2/skill3/skill3_extra) เล่นเต็มครั้งแรกต่อเกม
//    · แรงปลดผนึกลงตอนผนึกอันสุดท้ายแตก (ตอนกลับสนามเดิมไม่มี) · ช่วงพังทลายนับเทิร์นที่ผนึกแตกเป็นเทิร์นแรก
// ============================================================
const Board = require("../server/board");

const ID = "takuto";
const DIR = "/characters/takuto";
const IMG = {
  base: `${DIR}/takuto.webp`,
  tauburn: `${DIR}/tauburn.webp`,
  zero: `${DIR}/takuto_zero.webp`,
  emerald: `${DIR}/sword_emerald.webp`,
  sapphire: `${DIR}/sword_sapphire.webp`,
  skill2: `${DIR}/takuto_skill2.webp`,
  skill3: `${DIR}/takuto_skill3.webp`,
};
const VIDEO = {
  tauburn: `${DIR}/takuto_tauburn.mp4`,
  passive: `${DIR}/takuto_passive.mp4`,
  passive2: `${DIR}/takuto_passive2.mp4`,
  passive3: `${DIR}/takuto_passive3.mp4`,
  duo: `${DIR}/takuto_duosword.mp4`,
  duoHit: `${DIR}/takuto_duosword_hit.mp4`,
  skill2: `${DIR}/takuto_skill2.mp4`,
  skill3: `${DIR}/takuto_skill3.mp4`,
  skill3Extra: `${DIR}/takuto_skill3_extra.mp4`,
};
// คีย์คัตซีน (characters/_transforms.js)
const CUT = {
  tauburn: "takutoTauburn", passive: "takutoPassive", passive2: "takutoPassive2", passive3: "takutoPassive3",
  duo: "takutoDuo", duoHit: "takutoDuoHit", flash: "takutoFlash", missile: "takutoMissile", blast: "takutoBlast",
};
const FX = "takutoFx"; // socket event (client/src/board/takutoFx.js)
const MUSIC = "takuto_theme";

const HUMAN_MOV = 5;
const TAUBURN_MOV = 5;
const COLLAPSE_MOV = 8;
const SIZE = 3;
const SWORD_COST = 2;
const SWORD_TURNS = 5;
const EMERALD = "takutoEmerald";
const SAPPHIRE = "takutoSapphire";
const HEAL_CAP = 2;            // เอเมอรูด: ฟื้นต่อการตีปกติ 1 ครั้งไม่เกิน
const DASH_LEN = 3;            // พุ่งต้นตาเดิน
const PHASE4_HEAL = 3;
const COLLAPSE_TURNS = 5;
const COLLAPSE_ATK = 1;        // พลังโจมตี +1 ถาวร
const ZERO_BONUS = 45;         // โอกาสเกิดห่วงเวลาซีโร่ +45%
const JUDGMENT_RANGE = [1, 4];
const JUDGMENT_DMG = 4;
const FLASH_DMG = 4;
const FLASH_CD = 3;
const MISSILE_DMG = 2;
const MISSILE_STEAL = 2;
const BLAST_DMG = 5;
const ULT_CD = 2;
const FLASH_AREA = { kind: "line", len: 5, width: 3, hostile: true };
const MISSILE_AREA = { kind: "line", len: 8, width: 1, hostile: true };
const BLAST_AREA = { kind: "aoe", range: "mov", hostile: true };
// จังหวะพักให้กระดานเล่นเอฟเฟกต์ก่อนดาเมจลง (ต้องไม่สั้นกว่าจังหวะปะทะใน client/src/board/takutoFx.js)
const FLASH_SECONDS = 1.6;
const MISSILE_SECONDS = 1.8;
const BLAST_SECONDS = 2.0;
const HEAL_SECONDS = 0.8;
const SWORDS = {
  emerald: { status: EMERALD, name: "ดาบเอเมอรูด", img: IMG.emerald, sound: "takuto_sword_emerald",
    desc: `อยู่ ${SWORD_TURNS} เทิร์น · ตีปกติฟื้นพลังชีวิตเท่าความเสียหายที่ทำได้ (สูงสุด ${HEAL_CAP})` },
  sapphire: { status: SAPPHIRE, name: "ดาบแซฟไฟร์", img: IMG.sapphire, sound: "takuto_sword_sapphire",
    desc: `อยู่ ${SWORD_TURNS} เทิร์น · ตีปกติโดนศัตรูทุกคนที่ติดด้านนั้น 3 ช่อง` },
};
const SWORD_KEYS = Object.keys(SWORDS);
const ULT2 = {
  name: "ฉันยังมองเห็นอยู่", img: IMG.zero,
  desc: `ช่วงมิติพังทลาย · ระเบิดรอบตัวในระยะเดิน: ศัตรูทุกคนเสียหาย ${BLAST_DMG} (เกราะรับก่อน) · ตัวเองเสียหาย ${BLAST_DMG} (เหลือพลังชีวิตอย่างน้อย 1) (คูลดาวน์ ${ULT_CD} เทิร์น)`,
};
const LINE = Board.LINE_DIRS;

const isTakuto = (p) => !!p && p.characterId === ID && !p.summon;
// ฮุคที่ไม่ได้รับ engine (range/mov/attackLane …) อ่านสถานะเกมจาก engine กลาง (require ตอนเรียก — กันวน)
function eng() { return require("../server/engine").engine; }
function fresh() {
  return {
    form: "human",     // "human" | "tauburn"
    judgment: false,   // ดาบรวมร่างเป็นดาบแห่งการพิพากษา (ช่วงมิติพังทลาย)
    dash: false,       // ปลดล็อกพุ่งต้นตาเดิน (เฟส 2)
    dashRound: 0,      // เทิร์นที่พุ่งไปแล้ว (ตาเดินละครั้ง)
    seen2: false,      // คลิปเฟส 2 เล่นแล้ว
    seen4: false,      // คลิปเฟส 4 + ฟื้น 3 แล้ว
    awakened: false,   // ห่วงเวลาถูกทำลายแล้ว (พลังโจมตี +1 ถาวร)
    secReady: 0,
    ultReady: 0,
    tallySeq: -1, tally: 0, // ดาเมจจริงของการตีปกติครั้งนี้ (engine.cmdSeq) — ดาบเอเมอรูด
  };
}
function st(p) { return p.takuto || (p.takuto = fresh()); }
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const tauburn = (p) => isTakuto(p) && st(p).form === "tauburn";
const has = (p, sword) => ((p.statuses && p.statuses[SWORDS[sword].status]) || 0) > 0;
const bothSwords = (p) => has(p, "emerald") && has(p, "sapphire");
const collapsing = () => { const e = eng(); return !!(e.zeroCollapsing && e.zeroCollapsing()); };
const judgmentOn = (p) => tauburn(p) && st(p).judgment && bothSwords(p);
function fx(engine, p, kind, extra) {
  engine.boardFx(FX, { kind, id: p.id, color: engine.colorOf(p), ...(p.pos ? { at: { ...p.pos } } : {}), size: engine.sizeOf(p), ...extra });
}
const vit = (t) => (t.hp || 0) + (t.armor || 0);
// ดาเมจจากสกิล (เกราะรับก่อน · ตายได้) → ดาเมจที่เข้าจริง
function hurt(engine, t, n) {
  t.wasAttacked = true;
  const before = vit(t);
  engine.dealMixed(t, n);
  if (t.alive && t.hp <= 0) engine.instantDeath(t);
  if (!t.alive) t.pos = null;
  return Math.max(0, before - vit(t));
}
const enemiesOf = (engine, p, ids) => (ids || []).map((id) => engine.players[id])
  .filter((t) => t && t.alive && t.pos && t.id !== p.id && !engine.sameTeam(p, t));

// ---------- แปลงร่าง ----------
function becomeTauburn(engine, p) {
  const s = st(p);
  s.form = "tauburn";
  engine.log(`🤖 ${p.name} apprivoise — ทาวเบิร์น!`);
  const grow = () => {
    if (!p.alive || !p.pos) return;
    engine.resizeUnit(p, SIZE);
    fx(engine, p, "tauburn", {});
    engine.sfx("takuto_transform");
  };
  // ขยายตัวหลังคลิปแปลงร่าง (dealRound เล่นคิวคลิป → runSkillFlow เรียกผลหลังคลิป)
  engine.queueCutscene(p, CUT.tauburn);
  if (engine.hasQueuedCutscene()) engine.deferAfterCutscene(grow);
  else grow();
}
// เฟส 2 / 4 (ครั้งแรก) — คลิปเล่นต่อจากฉากผนึกแตก (zeroTime.afterScene)
function reachStage(engine, p, stage) {
  const s = st(p);
  if (stage >= 2 && !s.seen2) {
    s.seen2 = true;
    s.dash = true;
    engine.queueCutscene(p, CUT.passive);
    engine.log(`🤖 ${p.name} apprivoise — พุ่งออกตัวได้ทุกต้นตาเดิน`);
  }
  if (stage >= 4 && !s.seen4) {
    s.seen4 = true;
    engine.queueCutscene(p, CUT.passive2);
    const got = engine.healHp(p, PHASE4_HEAL) || 0;
    engine.log(`🤖 ${p.name} apprivoise — ฟื้นพลังชีวิต +${got}`);
    if (p.pos) fx(engine, p, "heal", { amt: got, big: true });
    engine.sfx("takuto_heal");
  }
}
// ดาบ 2 เล่ม → ดาบแห่งการพิพากษา (ช่วงมิติพังทลายเท่านั้น)
function tryMerge(engine, p) {
  const s = st(p);
  if (s.judgment || !tauburn(p) || !bothSwords(p) || !collapsing()) return false;
  s.judgment = true;
  const show = () => { if (p.alive && p.pos) { fx(engine, p, "merge", {}); engine.sfx("takuto_merge"); } };
  engine.queueCutscene(p, CUT.duo);
  if (engine.hasQueuedCutscene()) engine.deferAfterCutscene(show);
  else show();
  engine.log(`⚔️ ${p.name} — ดาบเอเมอรูด + ดาบแซฟไฟร์ = ดาบแห่งการพิพากษา`);
  return true;
}
function dropSwords(engine, p, which, why) {
  const s = st(p);
  const gone = [];
  for (const k of which) if (has(p, k)) { delete p.statuses[SWORDS[k].status]; gone.push(k); }
  const wasJudgment = s.judgment;
  if (!bothSwords(p)) s.judgment = false;
  if (!gone.length) return;
  if (p.pos) fx(engine, p, "vanish", { sword: wasJudgment && gone.length === 2 ? "judgment" : gone.join("+") });
  engine.sfx("takuto_vanish");
  if (why) engine.log(why);
}

// ---------- พุ่งต้นตาเดิน ----------
// ช่องปลายที่พุ่งไปได้ (มุมบนซ้ายของตัว) ทั้ง 4 ทิศ 1–3 ช่อง · ชน (ขอบ/สิ่งกีดขวาง/ร้าน/ร่าง/คนที่มองเห็น) = หยุดก่อนถึง
function dashTiles(engine, p, seenOnly = true) {
  if (!p.pos) return [];
  const map = engine.boardMap(), n = engine.sizeOf(p), blocked = engine.boardBlocked(p.id);
  const units = engine.boardUnits().filter((u) => u.id !== p.id && (!seenOnly || !engine.hiddenFrom(p, engine.players[u.id])));
  const out = [];
  for (const [dir, [dx, dy]] of Object.entries(LINE)) {
    for (let i = 1; i <= DASH_LEN; i++) {
      const x = p.pos.x + dx * i, y = p.pos.y + dy * i;
      const body = Board.footprint(x, y, n);
      if (body.some((t) => Board.isObstacle(map, t.x, t.y, blocked) || Board.unitAt(units, t.x, t.y))) break;
      out.push({ x, y, dir, d: i });
    }
  }
  return out;
}
function dashReady(engine, p) {
  const s = st(p), a = engine.action;
  return tauburn(p) && s.dash && engine.canAct(p) && !!a && !a.moved && !a.locked && !a.canto && s.dashRound !== engine.roundNumber;
}
function dash(engine, p, tile) {
  if (!dashReady(engine, p) || !tile) return false;
  const pick = dashTiles(engine, p).find((t) => t.x === tile.x && t.y === tile.y);
  if (!pick) return false;
  // ชนคนที่มองไม่เห็นกลางทาง = หยุดช่องก่อนหน้า (ซุ่มโจมตีแบบเดิน)
  const real = dashTiles(engine, p, false).filter((t) => t.dir === pick.dir && t.d <= pick.d);
  const end = real[real.length - 1];
  const s = st(p);
  s.dashRound = engine.roundNumber;
  if (!end) { engine.broadcastState(); return true; } // ชนตั้งแต่ช่องแรก — เสียสิทธิ์พุ่ง ไม่ขยับ
  const from = { ...p.pos };
  p.pos = { x: end.x, y: end.y };
  Object.assign(engine.action, { from: { ...p.pos }, path: null, trail: null, iceUndo: null, smashed: null });
  fx(engine, p, "dash", { from, to: { ...p.pos }, dir: pick.dir });
  engine.sfx("takuto_dash");
  engine.log(`💨 ${p.name} พุ่งออกตัว ${end.d} ช่อง`);
  engine.broadcastState();
  return true;
}

// ---------- ดาบประกายแสง ----------
//  ตำแหน่งหลังสลับ: ทาคุโตะ = ตัว 3×3 กลางตรงช่องของเป้า · เป้า = กลางตัวเดิมของทาคุโตะ · ลงไม่ได้ = มุมที่ใกล้ที่สุด (ไม่พังของ)
//  skip = id ที่ไม่นับเป็นสิ่งขวาง (คนที่กำลังสลับกัน)
function spotNear(engine, n, want, skip) {
  const map = engine.boardMap(), blocked = engine.boardBlocked(skip[0]);
  const others = engine.boardUnits().filter((u) => !skip.includes(u.id));
  let best = null;
  for (let y = 0; y + n <= map.rows; y++) {
    for (let x = 0; x + n <= map.cols; x++) {
      const d = Math.abs(x - want.x) + Math.abs(y - want.y);
      if (best && d >= best.d) continue;
      if (Board.footprint(x, y, n).some((t) => Board.isObstacle(map, t.x, t.y, blocked) || Board.unitAt(others, t.x, t.y))) continue;
      best = { x, y, d };
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}
const centerOf = (engine, u) => { const n = engine.sizeOf(u); return { x: u.pos.x + Math.floor(n / 2), y: u.pos.y + Math.floor(n / 2) }; };
const cornerAt = (c, n) => ({ x: c.x - Math.floor(n / 2), y: c.y - Math.floor(n / 2) });
function swapPlan(engine, p, t) {
  const to = spotNear(engine, engine.sizeOf(p), cornerAt(centerOf(engine, t), engine.sizeOf(p)), [p.id, t.id]);
  return to ? { to, center: centerOf(engine, p) } : null;
}
// ที่ลงของเป้า (ทาคุโตะยกออกจากกระดานแล้ว / ยังอยู่ = นับเป็นสิ่งขวาง)
function placeTarget(engine, t, center, skip) {
  return spotNear(engine, engine.sizeOf(t), cornerAt(center, engine.sizeOf(t)), [t.id, ...skip]);
}
function flash(engine, p, dir, ids) {
  if (!p.alive || !p.pos || !LINE[dir]) return;
  const [dx, dy] = LINE[dir];
  const foes = enemiesOf(engine, p, ids);
  if (!foes.length) return;
  const along = (t) => (t.pos.x - p.pos.x) * dx + (t.pos.y - p.pos.y) * dy;
  const far = foes.slice().sort((a, b) => along(b) - along(a))[0];
  const plan = swapPlan(engine, p, far);
  const tiles = engine.areaTiles(p, FLASH_AREA, dir);
  const targetTo = plan ? placeTarget(engine, far, plan.center, [p.id]) : null;
  fx(engine, p, "flash", {
    from: { ...p.pos }, to: plan ? plan.to : { ...p.pos }, dir, tiles,
    targetId: far.id, targetFrom: { ...far.pos }, targetTo: targetTo || { ...far.pos },
  });
  engine.sfx("takuto_flash");
  engine.skillBeat(FLASH_SECONDS, () => {
    for (const t of foes) {
      if (!t.alive) continue;
      const dealt = hurt(engine, t, FLASH_DMG);
      engine.log(`⚔️ ดาบประกายแสง → ${t.name} -${dealt} (ลดเกราะก่อน)`);
      if (!t.alive) engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`);
    }
    if (!plan || !p.alive) return;
    // สลับ: ยกทาคุโตะออกก่อน → วางเป้าที่จุดเดิม → ทาคุโตะลงที่เป้า (คิดใหม่ด้วยตำแหน่งจริงหลังดาเมจ)
    const back = { ...p.pos };
    p.pos = null;
    // ทาคุโตะลงก่อน (ช่องของเป้านับว่าว่าง) → เป้าลงจุดเดิมของทาคุโตะ (เลี่ยงตัวใหม่ของทาคุโตะ)
    const spot = spotNear(engine, engine.sizeOf(p), plan.to, [p.id, far.id]);
    p.pos = spot || back;
    if (far.alive && far.pos) {
      const to = placeTarget(engine, far, plan.center, []);
      if (to) { engine.ice.revealPushed(far); far.pos = to; }
    }
    engine.log(`⚔️ ${p.name} สลับตำแหน่งกับ ${far.name}`);
  });
}

// ---------- ท่าไม้ตาย ----------
function missile(engine, p, dir, ids) {
  if (!p.alive || !p.pos || !LINE[dir]) return;
  fx(engine, p, "missile", { dir, tiles: engine.areaTiles(p, MISSILE_AREA, dir) });
  engine.sfx("takuto_missile");
  engine.skillBeat(MISSILE_SECONDS, () => {
    for (const t of enemiesOf(engine, p, ids)) {
      const take = Math.min(MISSILE_STEAL, Math.max(0, t.skillPoints || 0));
      t.skillPoints = (t.skillPoints || 0) - take;
      const extra = MISSILE_STEAL - take;
      const from = { ...t.pos };
      const dealt = hurt(engine, t, MISSILE_DMG + extra);
      const before = p.skillPoints || 0;
      if (take) engine.addSkill(p, take, "passive");
      const got = (p.skillPoints || 0) - before;
      fx(engine, p, "steal", { targetId: t.id, from, amt: take, extra });
      engine.log(`🚀 ทาวววว มิสไซล์ → ${t.name} -${dealt} (ลดเกราะก่อน) · ขโมยแต้มสกิล ${take}${extra ? ` · ขาด ${extra} = ความเสียหายเพิ่ม` : ""}${got !== take ? ` (ได้จริง ${got})` : ""}`);
      if (!t.alive) engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`);
    }
    engine.sfx("takuto_steal");
  });
}
function blast(engine, p, ids) {
  if (!p.alive || !p.pos) return;
  const range = engine.baseMovOf(p);
  fx(engine, p, "blast", { range, tiles: engine.areaTiles(p, BLAST_AREA) });
  engine.sfx("takuto_blast");
  engine.skillBeat(BLAST_SECONDS, () => {
    for (const t of enemiesOf(engine, p, ids)) {
      const dealt = hurt(engine, t, BLAST_DMG);
      engine.log(`💥 ฉันยังมองเห็นอยู่ → ${t.name} -${dealt} (ลดเกราะก่อน)`);
      if (!t.alive) engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`);
    }
    if (!p.alive) return;
    // ตัวเอง: เกราะรับก่อน · เหลือพลังชีวิตอย่างน้อย 1
    const self = Math.min(BLAST_DMG, Math.max(0, vit(p) - 1));
    if (self > 0) engine.dealMixed(p, self);
    engine.log(`💥 ${p.name} โดนแรงระเบิดของตัวเอง -${self}`);
  });
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, FX, MUSIC, SWORDS, SWORD_KEYS, EMERALD, SAPPHIRE,
  HUMAN_MOV, TAUBURN_MOV, COLLAPSE_MOV, SIZE, SWORD_COST, SWORD_TURNS, HEAL_CAP, DASH_LEN, PHASE4_HEAL, COLLAPSE_TURNS, COLLAPSE_ATK,
  ZERO_BONUS, JUDGMENT_RANGE, JUDGMENT_DMG, FLASH_DMG, FLASH_CD, MISSILE_DMG, MISSILE_STEAL, BLAST_DMG, ULT_CD,
  FLASH_AREA, MISSILE_AREA, BLAST_AREA, ULT2,
  isTakuto, tauburn, judgmentOn, dashTiles,

  resetCombat(p) { p.takuto = isTakuto(p) ? fresh() : null; },
  displayImg(p) { return tauburn(p) ? IMG.tauburn : null; },
  characterPub(engine, p) {
    if (!tauburn(p)) return null;
    return { name: "ทาวเบิร์น", img: engine.zeroCollapsing() ? IMG.zero : IMG.tauburn };
  },

  // ---------- ห่วงเวลาซีโร่ (server/zeroTime.js) ----------
  zeroChanceBonus(engine) { return Object.values(engine.players).some((o) => isTakuto(o) && o.alive) ? ZERO_BONUS : 0; },
  zeroImmune(p) { return isTakuto(p); },
  zeroCollapseTurns(engine) { return Object.values(engine.players).some((o) => isTakuto(o) && o.alive) ? COLLAPSE_TURNS : 0; },
  onZeroStage(engine, stage) {
    for (const p of Object.values(engine.players)) if (isTakuto(p) && p.alive && tauburn(p)) engine.withEffectSource(p, () => reachStage(engine, p, stage));
  },
  onZeroCollapse(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isTakuto(p) || !p.alive) continue;
      engine.withEffectSource(p, () => {
        if (tauburn(p)) reachStage(engine, p, 4); // ผนึกแตกหลายอันพร้อมกัน = ได้ผลเฟสที่ข้ามไปด้วย
        const s = st(p);
        s.awakened = true;
        engine.queueCutscene(p, CUT.passive3);
        engine.log(`🌌 ${p.name} — มิติซีโร่พังทลาย · พลังโจมตี +${COLLAPSE_ATK} ถาวร · ระยะเดิน ${COLLAPSE_MOV}`);
        tryMerge(engine, p);
      });
    }
  },
  skillMusic(engine) { return engine.zeroCollapsing() ? { music: MUSIC, at: 1 } : null; },

  // ---------- ค่าบนกระดาน ----------
  mov(p) {
    if (!isTakuto(p)) return null;
    if (!tauburn(p)) return HUMAN_MOV;
    return collapsing() ? COLLAPSE_MOV : TAUBURN_MOV;
  },
  range(p) {
    if (!tauburn(p)) return null;
    return judgmentOn(p) ? JUDGMENT_RANGE : null;
  },
  attackLane(p) { return tauburn(p) && has(p, "sapphire") && !judgmentOn(p) ? "face" : false; },
  smashes(p) { return tauburn(p) && Math.max(1, p.boardSize | 0) >= SIZE; },

  // ---------- ตีปกติ ----------
  damageBonus(engine, attacker) { return tauburn(attacker) && st(attacker).awakened ? COLLAPSE_ATK : 0; },
  attackFxNames(attacker) {
    if (!tauburn(attacker)) return [];
    if (judgmentOn(attacker)) return ["ดาบแห่งการพิพากษา"];
    return st(attacker).awakened ? [`ทาวเบิร์น +${COLLAPSE_ATK}`] : [];
  },
  fixedStrikeDamage(engine, attacker) { return judgmentOn(attacker) ? JUDGMENT_DMG : null; },
  attackStyle(p) {
    if (!tauburn(p)) return null;
    if (judgmentOn(p)) return "takutoJudgment";
    if (has(p, "emerald") && has(p, "sapphire")) return "takutoDual";
    if (has(p, "sapphire")) return "takutoSapphire";
    if (has(p, "emerald")) return "takutoEmerald";
    return "takutoPunch";
  },
  attackSound(p) {
    if (!tauburn(p)) return undefined;
    if (judgmentOn(p)) return "takuto_atk_judgment";
    if (has(p, "emerald") && has(p, "sapphire")) return "takuto_atk_dual";
    if (has(p, "sapphire")) return "takuto_atk_sapphire";
    if (has(p, "emerald")) return "takuto_atk_emerald";
    return "takuto_atk_punch";
  },
  // ดาบแห่งการพิพากษา: คลิปปาดาบก่อนฉากตีทุกครั้ง
  preAttackClip(engine, attacker) { return judgmentOn(attacker) ? CUT.duoHit : null; },
  // ดาเมจจริงต่อการตีครั้งเดียว (ทุกคนในแนว) — ดาบเอเมอรูด
  onDamageDealt(engine, src, victim) {
    if (!tauburn(src) || !has(src, "emerald") || !victim || victim.id === src.id) return;
    const s = st(src);
    if (s.tallySeq !== engine.cmdSeq) { s.tallySeq = engine.cmdSeq; s.tally = 0; }
    s.tally += 1;
  },
  afterBoardAttack(engine, attacker, target) {
    if (!tauburn(attacker) || !has(attacker, "emerald")) return null;
    const s = st(attacker);
    const dealt = s.tallySeq === engine.cmdSeq ? s.tally : 0;
    s.tally = 0;
    if (!(dealt > 0)) return null;
    const src = target && target.pos ? { targetId: target.id, from: { ...target.pos } } : {}; // ละอองเขียวไหลจากเป้า
    return () => {
      if (!attacker.alive) return 0;
      const got = engine.healHp(attacker, Math.min(HEAL_CAP, dealt)) || 0;
      if (got <= 0) return 0;
      engine.log(`💚 ${attacker.name} ดาบเอเมอรูด — ฟื้นพลังชีวิต +${got}`);
      fx(engine, attacker, "heal", { amt: got, ...src });
      engine.sfx("takuto_heal");
      return HEAL_SECONDS;
    };
  },
  // ปาดาบแห่งการพิพากษาแล้ว = ดาบทั้งสองหาย (ตีคน/ผนึก/หนาม)
  afterStrike(engine, p) {
    if (!judgmentOn(p)) return;
    dropSwords(engine, p, SWORD_KEYS, `⚔️ ${p.name} — ดาบแห่งการพิพากษาสลายไป`);
  },

  // ---------- สกิล ----------
  skillCost(p, tier, base) { return isTakuto(p) && tier === "basic" ? SWORD_COST : base; },
  skillArea(p, tier, area) {
    if (!isTakuto(p) || tier !== "ultimate") return area;
    return collapsing() ? BLAST_AREA : MISSILE_AREA;
  },
  skillPub(p, tier) {
    if (!isTakuto(p)) return null;
    if (tier === "basic") {
      const big = tauburn(p);
      return {
        choices: SWORD_KEYS.map((k) => ({
          key: k, name: SWORDS[k].name, img: SWORDS[k].img, desc: `${SWORDS[k].name}: ${SWORDS[k].desc}`, area: { kind: "self" }, cost: SWORD_COST,
          cd: 0, on: has(p, k), locked: !big || has(p, k), free: true,
        })),
      };
    }
    if (tier === "ultimate" && collapsing()) return { ...ULT2, flash: true };
    return null;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isTakuto(p)) return true;
    if (!tauburn(p) || !p.pos) return false; // ร่างคนใช้สกิลไม่ได้เลย
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") return !!SWORDS[opts.form] && !has(p, opts.form);
    if (tier === "secondary") return bothSwords(p) && cdLeft(s.secReady, r) === 0 && enemiesOf(engine, p, targets).length > 0;
    if (tier === "ultimate") return cdLeft(s.ultReady, r) === 0;
    return false;
  },
  // ดาบอันเจิดจรัด: ไม่กินโควตา · กดได้หลายครั้ง · ใช้แล้วยังเดิน/พุ่งได้
  skipsTurnQuota(p, tier) { return isTakuto(p) && tier === "basic"; },
  ignoresTurnQuota(p, tier) { return isTakuto(p) && tier === "basic"; },
  keepsMove(engine, p, tier) { return isTakuto(p) && tier === "basic"; },
  silentFlash(p, tier) { return isTakuto(p) && tier === "basic"; },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isTakuto(p)) return "";
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      const w = SWORDS[opts.form];
      p.statuses[w.status] = SWORD_TURNS;
      fx(engine, p, "summon", { sword: opts.form });
      engine.sfx(w.sound);
      engine.log(`⚔️ ${p.name} ดาบอันเจิดจรัด — ${w.name} (${SWORD_TURNS} เทิร์น)`);
      tryMerge(engine, p);
      return ` — ${w.name}`;
    }
    const dir = opts.dir, ids = [...(targets || [])];
    if (tier === "secondary") {
      s.secReady = r + FLASH_CD;
      engine.triggerCutscene(p, CUT.flash);
      engine.log(`⚔️ ${p.name} ดาบประกายแสง`);
      engine.deferAfterCutscene(() => flash(engine, p, dir, ids));
      return "";
    }
    if (tier === "ultimate") {
      s.ultReady = r + ULT_CD;
      if (collapsing()) {
        engine.triggerCutscene(p, CUT.blast);
        engine.log(`💥 ${p.name} ฉันยังมองเห็นอยู่`);
        engine.deferAfterCutscene(() => blast(engine, p, ids));
      } else {
        engine.triggerCutscene(p, CUT.missile);
        engine.log(`🚀 ${p.name} ทาวววว มิสไซล์`);
        engine.deferAfterCutscene(() => missile(engine, p, dir, ids));
      }
      return "";
    }
    return "";
  },

  // ---------- ปุ่มพุ่งบน HUD (tiles = ช่องปลาย → socket charAction { key, tile }) ----------
  hudActions(engine, p) {
    if (!tauburn(p) || !st(p).dash || !p.alive) return undefined;
    const ok = dashReady(engine, p);
    return [{ key: "dash", icon: "💨", name: "พุ่ง", tiles: ok ? dashTiles(engine, p).map((t) => ({ x: t.x, y: t.y })) : [], disabled: !ok }];
  },
  charAction(engine, p, key, opts = {}) { return isTakuto(p) && key === "dash" && dash(engine, p, opts.tile); },

  // ---------- จังหวะเทิร์น ----------
  // ห่วงเวลาซีโร่เริ่ม (dealRound แรกในห่วงเวลา) = แปลงร่าง · ขยายตัวไม่สำเร็จ = ลองใหม่ทุกต้นเทิร์น · จบช่วงพังทลาย = ดาบแยกกลับ 2 เล่ม
  onRoundStartTick(engine, p) {
    if (!isTakuto(p) || !p.alive || !p.pos) return;
    const s = st(p);
    if (s.form === "human" && engine.zeroActive()) { becomeTauburn(engine, p); return; }
    if (s.form === "tauburn" && engine.sizeOf(p) !== SIZE) engine.resizeUnit(p, SIZE);
    if (s.judgment && !engine.zeroCollapsing()) { s.judgment = false; engine.log(`⚔️ ${p.name} — ดาบแห่งการพิพากษาแยกกลับเป็น 2 เล่ม`); }
  },
  // ดาบหมดเวลา (สถานะลดที่ endTurn แล้ว) → เอฟเฟกต์สลาย · ดาบแห่งการพิพากษาแยก
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isTakuto(p)) continue;
      const s = st(p);
      if (s.judgment && !bothSwords(p)) s.judgment = false;
    }
  },

  // ---------- ข้อมูลให้ client (สัญญา §2) ----------
  takutoState(engine, p) {
    if (!isTakuto(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      form: s.form, emerald: (p.statuses && p.statuses[EMERALD]) || 0, sapphire: (p.statuses && p.statuses[SAPPHIRE]) || 0,
      judgment: judgmentOn(p), dash: s.dash, secCd: cdLeft(s.secReady, r), ultCd: cdLeft(s.ultReady, r), collapse: engine.zeroCollapsing(),
    };
  },
  skillLocks(engine, p) {
    if (!isTakuto(p)) return undefined;
    const s = st(p), r = engine.roundNumber, big = tauburn(p);
    return {
      basic: { cd: 0, locked: !big || bothSwords(p), free: true },
      secondary: { cd: cdLeft(s.secReady, r), locked: !big || !bothSwords(p) },
      ultimate: { cd: cdLeft(s.ultReady, r), locked: !big },
    };
  },
};
