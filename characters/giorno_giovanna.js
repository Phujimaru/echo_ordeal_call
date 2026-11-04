// ============================================================
//  โจรุโน่ โจวาน่า (JoJo ภาค 5 — Gold Experience) — ระดับปานกลาง · id "giorno_giovanna"
//
//  ค่าพื้นฐาน (สเปกไม่ระบุ → ค่าเริ่มต้น): พลังชีวิต 7 / เกราะ 3 / พลังโจมตี 1 · ระยะเดิน 4 · ตีประชิด [1, 1]
//  สกิลพื้นฐาน ชีวิตทดแทน (1): เลือกไอเทมในกระเป๋า 1 ชิ้นทิ้ง (ทุกชิ้นยกเว้นช่องที่ 6 = นกหวีด ซึ่งไม่อยู่ใน p.inventory)
//    → ฟื้นพลังชีวิต 1 · 2 ครั้งต่อเทิร์น · ไม่นับโควตาสกิล · เลือดเต็ม/กระเป๋าว่าง = กดไม่ได้
//  สกิลรอง จงกำเนิดชีวิตใหม่ (ปุ่ม 2 ตัวเลือก · คูลดาวน์แยกกัน — ผู้ใช้สั่ง):
//    ต้นตอแห่งชีวิต (3 · คูลดาวน์ 2): จนถึงก่อนตาเดินถัดไปของตัวเอง การโจมตีของศัตรู 1 ครั้งที่โดนตัว = ไม่ได้รับความเสียหาย
//      ความเสียหายทั้งหมดสะท้อนกลับใส่ผู้โจมตีแบบเดียวกับที่ได้รับ (เกราะก่อน/ทะลุเกราะ) + ดีบัฟที่การโจมตีนั้นติดให้ไปติดผู้โจมตีแทน
//      "1 ครั้ง" = คำสั่งเดียวของผู้โจมตี (engine.cmdSeq — ตีหลายฮิต/ท่าพื้นที่ทั้งท่านับเป็นครั้งเดียว)
//      สังหารทันทีสะท้อนไม่ได้ (ผู้ใช้สั่ง) · ดาเมจที่ไม่มีคนทำ (ลุกไหม้/เลือดไหล/พื้น) = กันไว้เฉยๆ ไม่เสียผลสะท้อน (ผู้ใช้: "เอาแบบนาย")
//      กลไกกลาง: ฮุค reflectsDamage → combat.adjustIncomingDamage / applyDebuff / engine.applyBleed ฯลฯ
//    จงกำเนิดใหม่ (2 · คูลดาวน์ 2): 1 คนในระยะเดิน (รวมตัวเอง)
//      ตัวเอง/เพื่อน = ต้นไม้ยกตัวลอยขึ้น หลบการโจมตีได้แน่นอน 1 ครั้ง (แม่นยำเจาะได้) · ลอยอยู่ = เดินไม่ได้ จนถึงก่อนตาเดินถัดไปของคนนั้น
//      ศัตรู = ถูกตรึง 1 เทิร์น คลุมตาเดินถัดไปของเป้า (เดินไปแล้วในเทิร์นนี้ = ต่อถึงเทิร์นหน้า · ต้านได้)
//      ฮุคกลาง grantedDodge (broadcast) → attack.strike / skillDodge · คลิป giorno_skill2_2 ครั้งแรกต่อเกม
//  ท่าไม้ตาย Muda!!!!!!! (4): ตีปกติครั้งถัดไป (ค้างจนได้ตี · ตีพลาดก็หมด) —
//    ศัตรู: ฮีล 3 → ล้างดีบัฟล่าสุด 1 → เปราะบาง +1 2 เทิร์น + สตั้น 1 เทิร์น (คลุมตาเดินถัดไป) → แล้วจึงเกิดความเสียหาย (ผู้ใช้สั่งลำดับ)
//    เพื่อน: ฮีล 3 + ล้างดีบัฟ 1 (ไม่มีดาเมจ/เปราะบาง/สตั้น) · คลิป giorno_skill3_hit ทุกครั้งที่ต่อยโดน
//  สกิลติดตัว Gold Experience: ตีปกติที่ไม่มีผลสกิล (ไม่ได้เสริม Muda) คริติคอล 50% (×2 — ผู้ใช้แก้จาก 30% 2026-11-04) — คลิป giorno_crit ทุกครั้งที่ติด
//    ตีปกติใส่เพื่อนร่วมทีมได้ = ฟื้นพลังชีวิต 1 แทนความเสียหาย (จบตา · ไม่ตีสวน · ไม่ถอย) — action.strikeTarget ฮุค allyStrike
//  สกิลติดตัว เศษเดนมนุษย์อย่างแกน่ะ…: พลังชีวิต ≤ 3 + ตีปกติที่ไม่ได้เสริม Muda → โอกาส 50% (ผู้ใช้แก้จาก 30% → 100% → 50% 2026-11-04) ความเสียหายตายตัว 5 (เกราะก่อน · ไม่คริ)
//    1 ครั้งต่อเกม · คลิป giorno_passive2 เต็ม (32 วิ) ครั้งเดียว
//  ธนู Requiem (ไอเทมประจำตัว กินช่องกระเป๋า · ทิ้ง/สละ/ส่งต่อไม่ได้ · ใช้ซ้ำได้ — ผู้ใช้สั่ง 2026-11-04): ใช้ = คลิป + จบตาทันที → ต้นตาเดินถัดไปของตัวเอง 50% แปลงร่าง / 50% ตายทันที
//    ร่าง Gold Experience Requiem 3 เทิร์น (นับเทิร์นที่แปลง) · คืนร่างแล้วคูลดาวน์ 5 เทิร์น · ปก/สกิล/เสียงพากย์เปลี่ยน · เพลงตลอดร่าง · ต้านสถานะตลอดร่าง · สกิลติดตัว 2 ไม่ทำงาน
//    ชีวิตทดแทน 0 แต้ม + กระสุนแห่งชีวิต (สละไอเทม แนว 7×1 โดนศัตรูทุกคนในแนว ความเสียหาย 1 + พิษร้าย 1 เทิร์น · โควตาร่วม 2 ครั้งต่อเทิร์น)
//    จงกำเนิดชีวิตใหม่ 0 แต้ม ไม่มีคลิป · ท่าไม้ตาย ขอให้ไปสู่ภพภูมิที่ดี แทน Muda (0 แต้ม · คูลดาวน์ 3): พุ่ง 4 ช่อง ชนศัตรูคนแรก → คลิป → ความเสียหาย 5
//    ตายด้วยท่านี้ = วนตาย: ต้นเทิร์นฟื้นเลือด 1 เกราะ 0 · ถึงตาตัวเองตายทันที · ทุกครั้งที่ตายซ้ำ โจรุโน่ได้แต้ม 1 เหรียญ 1 · จบเมื่อโจรุโน่ตาย/จบเกม (คนที่ฟื้นอยู่ตายตาม)
//    สกิลติดตัว 3 นี่แหละ คือ Requiem: พลังโจมตี +1 · คริ +20% จากสกิลติดตัว 1 (70%) · ระยะเดิน 6
//      ศัตรูโจมตีทุกรูปแบบ 50% (ใช้ท่าไม้ตายในตานั้น = 100%) = Return to Zero: ย้อนกลับต้นตาเดินของผู้โจมตี (server/timeStop.js rewindTurn) แต้ม/ไอเทมที่ใช้ไม่คืน
//  เสียง: วีดีโอขึ้น = ไม่มีเสียงเอฟเฟกต์/พากย์ก่อนหรือซ้อน (กฎผู้ใช้ 2026-11-03) · คลิปท่าไม้ตาย/คริเล่นซ้ำได้ อื่นๆ ครั้งเดียว
//  ไฟล์จากผู้ใช้ (Downloads/giono + Gold Experience SFX + เสียงพากย์ ASBR) — ตัดเสียงด้วย ffmpeg (.claude/plans/giorno-media.md)
// ============================================================

const ID = "giorno_giovanna";
const DIR = "/characters/giorno_giovanna";
const IMG = {
  base: `${DIR}/giorno.webp`,
  skill1: `${DIR}/skill1.webp`,
  reflect: `${DIR}/skill2.webp`,
  tree: `${DIR}/tree.webp`,
  skill3: `${DIR}/skill3.webp`,
  re: { cover: `${DIR}/req_cover.webp`, arrow: `${DIR}/req_arrow.webp`, skill1: `${DIR}/req_skill1.webp`, skill2: `${DIR}/req_skill2.webp`, skill3: `${DIR}/req_skill3.webp` },
};
const VIDEO = {
  crit: `${DIR}/giorno_crit.mp4`,
  passive2: `${DIR}/giorno_passive2.mp4`,
  tree: `${DIR}/giorno_skill2_2.mp4`,
  muda: `${DIR}/giorno_skill3_hit.mp4`,
  arrow: `${DIR}/req_arrow.mp4`,
  success: `${DIR}/req_success.mp4`,
  fail: `${DIR}/req_fail.mp4`,
  rewind: `${DIR}/req_passive.mp4`,
  shot: `${DIR}/req_skill1.mp4`,
  reUlt: `${DIR}/req_ult.mp4`,
  reCrit: `${DIR}/req_crit.mp4`,
};
const CUT = {
  crit: "gioCrit", passive2: "gioPassive2", tree: "gioTree", muda: "gioMuda",
  arrow: "gioArrow", success: "gioSuccess", fail: "gioFail", rewind: "gioRewind", shot: "gioShot", reUlt: "gioReUlt", reCrit: "gioReCrit",
};
// คีย์ใน client/src/audio.js (ไฟล์ client/public/characters/giorno_giovanna/sfx/ · voice/)
const SFX = {
  life: "gio_life",           // ชีวิตทดแทน: ไอเทมกลายเป็นชีวิต
  reflect: "gio_reflect",     // ต้นตอแห่งชีวิต: ตั้งท่า
  reflectHit: "gio_reflect_hit", // สะท้อนความเสียหายกลับ
  tree: "gio_tree",           // จงกำเนิดใหม่ (หลังคลิปครั้งแรก)
  burst: "gio_burst",         // Muda เสริมหมัด
  punch: "gio_punch",         // ตีปกติ
  heal: "gio_punch2",         // ตีเพื่อน = ฟื้นพลังชีวิต
  shot: "gio_req_shot",       // กระสุนแห่งชีวิต
  dash: "gio_req_dash",       // ขอให้ไปสู่ภพภูมิที่ดี: พุ่ง
  awake: "gio_req_awake",     // ไฟทองลุกตอนแปลงร่าง
  rewind: "gio_req_rewind",   // Return to Zero บนกระดาน
  loop: "gio_req_loop",       // คนวนตายฟื้น/ตาย
};
const MUSIC = "gio_requiem"; // เพลงตลอดร่าง (client/src/audio.js)
// เสียงพากย์ (ตัดจากไฟล์ ASBR ของผู้ใช้ — client/public/characters/giorno_giovanna/voice/) · สุ่ม 1 ต่อเหตุการณ์ · มีคลิป = เงียบ
const VOICE = {
  turn: ["gio_v_turn1", "gio_v_turn2", "gio_v_turn3"],           // ゴールド・エクスペリエンス! · やるしかない · 行きますよ
  strike: ["gio_v_hit1", "gio_v_hit2", "gio_v_hit3", "gio_v_hit4", "gio_v_hit5"], // どうだ、くらえ! · そりゃ · そこだ!貰った! · 無駄だ! ×2
  struck: ["gio_v_struck1", "gio_v_struck2", "gio_v_struck3", "gio_v_struck4", "gio_v_struck5"], // なにぃ?! · しまった · こいつ! · うわっ! · やめろ!
  basic: ["gio_v_life1", "gio_v_life2", "gio_v_life3"],           // 生まれろ、生命よ ×2 · 生まれろ、新しい命よ
  reflect: ["gio_v_reflect1", "gio_v_reflect2", "gio_v_reflect3"], // 鋭い痛みをゆっくり味わえ · 味わいな! · ゴールド・エクスペリエンスの能力
  tree: ["gio_v_tree1", "gio_v_tree2", "gio_v_tree3"],            // 生まれ変わらせた! ×2 · 命を生み出す
  ultimate: ["gio_v_ult1", "gio_v_ult2", "gio_v_ult3"],           // 無駄無駄無駄…! ×3
  heal: ["gio_v_heal1", "gio_v_heal2", "gio_v_heal3"],            // 援護します! · 傷を見せてください · 大丈夫ですか
};
// เสียงพากย์ร่าง Requiem (ตัดจากไฟล์ Jump Force ของผู้ใช้ — .claude/plans/giorno-media.md)
const voiceSet = (name, n = 3) => Array.from({ length: n }, (_, i) => `gio_rv_${name}${i + 1}`);
const VOICE_RE = {
  turn: voiceSet("turn"), strike: voiceSet("hit", 5), struck: voiceSet("struck", 6), basic: voiceSet("life"), shot: voiceSet("shot"),
  reflect: voiceSet("reflect"), tree: voiceSet("tree"), ultimate: voiceSet("ult"), heal: voiceSet("heal"),
};

const LIFE_COST_ITEMS = 1;
const LIFE_HEAL = 1;
const LIFE_PER_TURN = 2;
const REFLECT_COST = 3;
const TREE_COST = 2;
const REFLECT_CD = 2;
const TREE_CD = 2;
const ROOT_TURNS = 1;
const MUDA_HEAL = 3;
const MUDA_FRAGILE = 1;
const MUDA_FRAGILE_TURNS = 2;
const MUDA_STUN_TURNS = 1;
const CRIT_PCT = 50;
const ALLY_HEAL = 1;
const RAGE_HP = 3;
const RAGE_PCT = 50;
const RAGE_DMG = 5;
const ALLY_STRIKE_SECONDS = 1.4;
const REQ_PCT = 50;       // ธนู: โอกาสแปลงร่าง
const REQ_TURNS = 3;      // ร่างอยู่ได้กี่เทิร์น (นับเทิร์นที่แปลง)
const REQ_CD = 5;         // คูลดาวน์ธนูหลังคืนร่าง
const REQ_MOV = 6;
const REQ_ATK = 1;
const REQ_CRIT = 20;      // บวกจาก CRIT_PCT
const REWIND_PCT = 50;
const REWIND_SECONDS = 2.6; // ฉากย้อนบนกระดานหลังคลิป
const SHOT_LEN = 7;
const SHOT_DMG = 1;
const SHOT_POISON = 1;
const RE_ULT_LEN = 4;
const RE_ULT_DMG = 5;
const RE_ULT_CD = 3;
const LOOP_HP = 1;
const DASH_STEP_SECONDS = 0.1;

// skillPub ไม่ได้รับ engine — require ตอนเรียก (กัน require วน)
const engineNow = () => require("../server/engine").engine;
const isGio = (p) => !!p && p.characterId === ID && !p.summon;
function fresh() {
  return {
    lifeRound: 0, lifeUses: 0,  // ชีวิตทดแทน: กดไปกี่ครั้งในเทิร์น lifeRound
    reflect: null,              // { round, acted, seq, at } — ต้นตอแห่งชีวิต
    reflectReady: 0, treeReady: 0, // ใช้ได้อีกตั้งแต่เทิร์นนี้ (0 = ได้)
    muda: false, mudaAt: 0,     // Muda!!!!!!! เสริมตีปกติครั้งถัดไป
    mudaHit: false,             // ตีครั้งนี้ลง Muda (ป้าย/คลิป)
    rageUsed: false, rageNow: false, // เศษเดนมนุษย์: ใช้ไปแล้ว / ติดในการตีครั้งนี้
    clipNext: null,             // คลิปก่อนฉากตีปกติ (preAttackClip)
    clipNow: false,             // ปุ่มที่เพิ่งกดเล่นคลิป (skillSound/เสียงพากย์เงียบ)
    arrowWait: 0, arrowReady: 0, // ธนู: stamp ตอนใช้ (0 = ไม่รอผล) / ใช้ได้อีกตั้งแต่เทิร์นนี้
    requiem: null,              // { until, at } ร่าง Requiem อยู่ถึงจบเทิร์น until
    ultReady: 0,                // ขอให้ไปสู่ภพภูมิที่ดี
    rollSeq: null, rollHit: false, // ผลทอย Return to Zero ของคำสั่ง rollSeq
    loop: {},                   // { [id]: ช่องล่าสุด } คนวนตาย
    loopAt: 0,
  };
}
function st(p) { return p.giorno || (p.giorno = fresh()); }
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const pick = (list) => (list && list.length ? list[Math.floor(Math.random() * list.length)] : null);

// ---------- ช่วงเวลา "ถึงก่อนตาเดินถัดไปของ t" ----------
//  w = { round, acted } (acted = t เดินไปแล้ว/กำลังเดินตอนได้รับ → ตาถัดไปอยู่เทิร์นหน้า)
function windowOpen(engine, t, w) {
  if (!w || !t || !t.alive) return false;
  const r = engine.roundNumber;
  const waiting = engine.actorId !== t.id && !engine.hasActed(t.id);
  if (w.acted) return r === w.round || (r === w.round + 1 && waiting);
  return r === w.round && waiting;
}
// ผลแบบ "1 ครั้ง": ใช้ไปในคำสั่งอื่นแล้ว = หมด (คำสั่งเดียวกันยังใช้ต่อได้ — ตีหลายฮิต/ท่าพื้นที่)
const spent = (engine, w) => w.seq != null && w.seq !== engine.cmdSeq;
const live = (engine, t, w) => windowOpen(engine, t, w) && !spent(engine, w);
function windowFor(engine, t) {
  return { round: engine.roundNumber, acted: engine.actorId === t.id || engine.hasActed(t.id), seq: null, at: engine.severStamp() };
}

function clipOnce(engine, p, key) {
  p.cutsceneShown ||= {};
  if (p.cutsceneShown[key]) return false;
  p.cutsceneShown[key] = true;
  engine.queueCutscene(p, key);
  return true;
}
function fx(engine, p, kind, extra = {}) {
  if (!p || !p.pos) return;
  engine.boardFxAtHit("giornoFx", { kind, id: p.id, at: { ...p.pos }, size: engine.sizeOf(p), color: engine.colorOf(p), ...extra });
}
function voice(engine, p, event) {
  const key = pick(lines(p)[event]);
  if (key) engine.sfx(key, null, { voice: p.id });
}

const friendOf = (engine, p, t) => !!t && (t.id === p.id || engine.sameTeam(p, t));
const reflectOn = (engine, p) => isGio(p) && !!st(p).reflect && live(engine, p, st(p).reflect);
const treeOn = (engine, t) => !!t && !!t.giornoTree && live(engine, t, t.giornoTree);
const reqOn = (p) => isGio(p) && !!st(p).requiem;
const lines = (p) => (reqOn(p) ? VOICE_RE : VOICE);

// ---------- Gold Experience Requiem ----------
// ปุ่มใช้ในกระเป๋า (BagScreen อ่าน item.ready)
function syncArrow(engine, p) {
  const s = st(p);
  const item = (p.inventory || []).find((it) => it.type === "giornoArrow");
  if (item) item.ready = !s.arrowWait && !s.requiem && cdLeft(s.arrowReady, engine.roundNumber) === 0;
}
function beginRequiem(engine, p) {
  const s = st(p);
  if (!p.alive) return;
  s.requiem = { until: engine.roundNumber + REQ_TURNS - 1, at: engine.severStamp() };
  s.muda = false; // ท่าไม้ตายถูกแทน
  engine.applyBuff(p, "resist", null, REQ_TURNS);
  fx(engine, p, "awake");
  engine.sfx(SFX.awake);
  syncArrow(engine, p);
  engine.log(`🏹 ${p.name} ธนู Requiem — Gold Experience Requiem ${REQ_TURNS} เทิร์น`);
}
function endRequiem(engine, p) {
  const s = st(p);
  if (!s.requiem) return;
  s.requiem = null;
  s.arrowReady = engine.roundNumber + REQ_CD + 1;
  if (p.statuses) delete p.statuses.resist;
  syncArrow(engine, p);
  engine.log(`🏹 ${p.name} คืนร่าง — ธนู Requiem คูลดาวน์ ${REQ_CD} เทิร์น`);
}
// ทุกโจรุโน่ที่ยึด id ไว้ในวนตาย
const loopOwners = (engine, id) => Object.values(engine.players).filter((g) => isGio(g) && g.alive && st(g).loop && st(g).loop[id]);
const inLoop = (engine, p) => !!p && loopOwners(engine, p.id).length > 0;
function loopRevive(engine, t, at) {
  const to = at && engine.tileFree(at.x, at.y, t.id) ? at : engine.nearFreeTile(at || { x: 0, y: 0 }, t.id);
  if (!to) return false;
  t.alive = true;
  t.result = null;
  t.corpse = null;
  t.hp = LOOP_HP;
  t.armor = 0; t.shield = 0; t.tempHp = 0; t.tempHpTurns = 0;
  t.statuses = {}; t.statusAmt = {};
  t.mountId = null;
  t.wasAttacked = false;
  t.pos = { x: to.x, y: to.y };
  const side = require("../server/duo").sideKey(t) || t.id;
  if (!engine.turnOrder.includes(side)) engine.turnOrder.push(side); // เทิร์นนี้ได้ถึงตาเพื่อตายอีกครั้ง
  fx(engine, t, "loopRevive");
  engine.log(`🌀 ${t.name} ฟื้นคืนชีพ — ความตายยังไม่สิ้นสุด`);
  return true;
}
// ไล่ช่องตามแนว: ชนศัตรูคนแรก (หลบพ้น = ผ่าน) · สิ่งกีดขวาง/ช่องที่ยืนไม่ได้ = หยุด
function planDash(engine, p, dir) {
  const path = [{ ...p.pos }];
  let hit = null;
  for (const t of engine.chargeTiles(p, dir, RE_ULT_LEN)) {
    if (t.wall || t.obstacle || t.shop) break;
    const o = t.unitId ? engine.players[t.unitId] : null;
    if (o && o.alive && !engine.sameTeam(p, o)) {
      o.wasAttacked = true;
      if (!engine.skillDodge(p, o, "ขอให้ไปสู่ภพภูมิที่ดี")) { hit = o; break; }
    }
    if (o) continue; // ผ่านตัวคนได้ แต่หยุดซ้อนไม่ได้
    path.push({ x: t.x, y: t.y });
  }
  return { path, hit };
}
function reUltImpact(engine, p, t) {
  if (!p.alive || !t.alive || !t.pos) return;
  const at = { ...t.pos };
  t.wasAttacked = true;
  engine.dealMixed(t, RE_ULT_DMG);
  engine.resolveDamageAftermath(t);
  fx(engine, p, "slam", { to: at });
  if (!t.alive) {
    if (!t.summon) { st(p).loop[t.id] = at; st(p).loopAt = engine.severStamp(); }
    t.pos = null;
    engine.log(`💀 ${t.name} ขอให้ไปสู่ภพภูมิที่ดี — ตายไม่มีวันสิ้นสุด`);
  }
}
function shoot(engine, p, targets, dir) {
  const tiles = engine.chargeTiles(p, dir, SHOT_LEN).map((t) => ({ x: t.x, y: t.y }));
  fx(engine, p, "bullet", { tiles, dir });
  for (const id of targets || []) {
    const t = engine.players[id];
    if (!t || !t.alive || t.id === p.id || engine.sameTeam(p, t)) continue;
    if (engine.skillDodge(p, t, "กระสุนแห่งชีวิต")) continue;
    t.wasAttacked = true;
    engine.dealMixed(t, SHOT_DMG);
    engine.resolveDamageAftermath(t);
    if (t.alive) engine.applyPoison(t, SHOT_POISON + 1); // ติกต้นเทิร์น — +1 ให้ได้ออกฤทธิ์ 1 ครั้ง (แบบพื้นพิษ action.tileEndEffect)
    else t.pos = null;
  }
}
const isShot = (form) => typeof form === "string" && form.startsWith("shot:");
const itemOfForm = (form) => (isShot(form) ? form.slice(5) : form);

// ---------- ชีวิตทดแทน ----------
function lifeUses(engine, p) { const s = st(p); return s.lifeRound === engine.roundNumber ? s.lifeUses : 0; }
const bagItems = (p) => (p.inventory || []).filter((it) => it && it.uid && it.type !== "giornoArrow");

// ---------- Muda!!!!!!! ----------
// ลงผลก่อนความเสียหาย (ศัตรู) / แทนความเสียหาย (เพื่อน) → ป้ายฉากตี
function mudaLand(engine, p, t, foe) {
  const out = [];
  const healed = engine.healHp(t, MUDA_HEAL);
  out.push(`Muda!!!!!!! — ฟื้นพลังชีวิต +${healed}`);
  const cleared = engine.cleanseLatestDebuff(t);
  if (cleared) out.push("ล้างดีบัฟ 1");
  if (foe) {
    const acted = engine.actorId === t.id || engine.hasActed(t.id);
    if (engine.applyDebuff(t, "fragile", MUDA_FRAGILE, MUDA_FRAGILE_TURNS)) out.push(`เปราะบาง +${MUDA_FRAGILE}`);
    if (engine.applyDebuff(t, "stun", 1, MUDA_STUN_TURNS + (acted ? 1 : 0))) out.push("สตั้น");
  }
  engine.log(`👊 ${p.name} Muda!!!!!!! → ${t.name} ฟื้นพลังชีวิต +${healed}${cleared ? " · ล้างดีบัฟ 1" : ""}${foe ? " · เปราะบาง + สตั้น" : ""}`);
  fx(engine, t, "muda", { from: p.id });
  return out;
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, SFX, CRIT_PCT, RAGE_DMG, RAGE_PCT, RAGE_HP, MUDA_HEAL, ALLY_HEAL, LIFE_PER_TURN,
  REFLECT_COST, TREE_COST, REFLECT_CD, TREE_CD,
  REQ_PCT, REQ_TURNS, REQ_CD, REQ_MOV, REQ_CRIT, REWIND_PCT, RE_ULT_DMG, RE_ULT_CD, RE_ULT_LEN, SHOT_LEN,
  isGio, treeOn, reflectOn, reqOn, inLoop,

  resetCombat(p) {
    p.giorno = isGio(p) ? fresh() : null;
    p.giornoTree = null;
    if (isGio(p)) p.inventory.push({ uid: `gioarrow_${p.id}`, type: "giornoArrow", price: 0 }); // กินช่องกระเป๋า (ผู้ใช้สั่ง)
  },

  // ---------- ธนู Requiem (shop.useInventoryItem) ----------
  canUseCharItem(engine, p, item) {
    if (!isGio(p) || item.type !== "giornoArrow") return false;
    const s = st(p);
    return !s.arrowWait && !s.requiem && cdLeft(s.arrowReady, engine.roundNumber) === 0;
  },
  useCharItem(engine, p) {
    st(p).arrowWait = engine.severStamp();
    syncArrow(engine, p);
    engine.log(`🏹 ${p.name} แทงตัวเองด้วยธนู Requiem`);
    if (!clipOnce(engine, p, CUT.arrow)) engine.sfx(SFX.awake);
    engine.pausePlayingForCutscene(null, { endTurn: true });
    return true;
  },
  // ต้นตาเดินถัดไป: รู้ผล 50/50
  onActorReady(engine, p) {
    if (!isGio(p) || !st(p).arrowWait) return;
    const s = st(p);
    s.arrowWait = 0;
    if (Math.random() * 100 < REQ_PCT) {
      clipOnce(engine, p, CUT.success);
      engine.deferAfterCutscene(() => beginRequiem(engine, p));
    } else {
      clipOnce(engine, p, CUT.fail);
      engine.deferAfterCutscene(() => {
        engine.log(`💀 ${p.name} ธนู Requiem ไม่ยอมรับ — ตายทันที`);
        engine.instantDeath(p, true);
        if (!p.alive) p.pos = null;
      });
    }
    engine.pausePlayingForCutscene();
  },
  skillMusic(engine, p) { return reqOn(p) ? { music: MUSIC, at: st(p).requiem.at } : null; },
  characterPub(engine, p) {
    if (!reqOn(p)) return null;
    return {
      name: "Gold Experience Requiem", img: IMG.re.cover,
      passive2: { name: "นี่แหละ คือ Requiem", desc: `พลังโจมตี +${REQ_ATK} · ตีปกติคริติคอล ${CRIT_PCT + REQ_CRIT}% · ระยะเดิน ${REQ_MOV} · ต้านสถานะ · ศัตรูโจมตีทุกรูปแบบ ${REWIND_PCT}% (ใช้ท่าไม้ตายในตานั้น 100%) = ย้อนกลับไปเริ่มตาเดินของตัวเองใหม่ แต้มสกิลและไอเทมที่ใช้ไปไม่คืน` },
    };
  },
  displayImg(p) { return reqOn(p) ? IMG.re.cover : null; },
  mov(p) { return reqOn(p) ? REQ_MOV : null; },
  damageBonus(engine, attacker) { return reqOn(attacker) ? REQ_ATK : 0; },

  // ---------- นี่แหละ คือ Requiem: Return to Zero (server/timeStop.js) ----------
  counterArmed(engine, p) { return reqOn(p); },
  rewindsTurn: true,
  // ทอยครั้งเดียวต่อคำสั่ง (ตีหลายฮิต/ท่าพื้นที่) · AI (Moon Cell) ไม่ย้อน
  counterFires(engine, p, src) {
    if (!reqOn(p) || src.summon) return false;
    const s = st(p);
    if (s.rollSeq !== engine.cmdSeq) {
      s.rollSeq = engine.cmdSeq;
      s.rollHit = src.ultRound === engine.roundNumber || Math.random() * 100 < REWIND_PCT;
    }
    return s.rollHit;
  },
  onCounterStop(engine, p, attacker, { from, back } = {}) {
    if (!isGio(p) || !attacker) return;
    engine.log(`⏪ ${p.name} Requiem — ${attacker.name} กลับสู่จุดเริ่มต้นของตา`);
    engine.queueCutscene(p, CUT.rewind);
    engine.deferAfterCutscene(() => {
      fx(engine, p, "rewind", { attacker: attacker.id, from, back, gioAt: p.pos ? { ...p.pos } : null, seconds: REWIND_SECONDS });
      engine.sfx(SFX.rewind);
      engine.skillBeat(REWIND_SECONDS, () => {});
    });
  },

  // ---------- ตีปกติ ----------
  critPct(p) { return isGio(p) && !st(p).muda ? CRIT_PCT + (reqOn(p) ? REQ_CRIT : 0) : 0; },
  attackStyle(p) { return isGio(p) ? "gioPunch" : null; }, // หมัดหนัก 1 หมัด · ติดคริ = client เปลี่ยนเป็นหมัดรัว gioRush (client/src/board/giornoFx.js)
  attackSound(p) { return isGio(p) ? SFX.punch : undefined; },
  // เศษเดนมนุษย์อย่างแกน่ะ…: ทอยเฉพาะตอนเข้าเงื่อนไข (ไม่แตะ Math.random ของคนอื่น)
  fixedStrikeDamage(engine, attacker, target, ctx = {}) {
    if (!isGio(attacker) || ctx.estimate || ctx.counter) return null;
    const s = st(attacker);
    if (s.requiem || s.muda || s.rageUsed || attacker.hp > RAGE_HP) return null; // ร่าง Requiem: สกิลติดตัว 2 ไม่ทำงาน
    if (Math.random() * 100 >= RAGE_PCT) return null;
    s.rageUsed = true;
    s.rageNow = true;
    s.clipNext = CUT.passive2;
    engine.log(`💢 ${attacker.name} เศษเดนมนุษย์อย่างแกน่ะ… — ความเสียหาย ${RAGE_DMG}`);
    return RAGE_DMG;
  },
  attackFxNames(attacker) {
    if (!isGio(attacker)) return [];
    const s = st(attacker);
    if (!s.rageNow) return [];
    s.rageNow = false;
    return [`เศษเดนมนุษย์อย่างแกน่ะ… ${RAGE_DMG}`];
  },
  beforeStrikeHit(engine, attacker, target, { counter } = {}) {
    if (!isGio(attacker) || counter || !st(attacker).muda) return [];
    st(attacker).mudaHit = true;
    return mudaLand(engine, attacker, target, true);
  },
  // ตีจบ 1 ครั้ง (โดน/พลาด) → Muda หมด
  onStrikeResolved(engine, attacker, target, res, { counter } = {}) {
    if (!isGio(attacker) || counter) return;
    const s = st(attacker);
    if (s.muda) { s.muda = false; if (!s.mudaHit) engine.log(`👊 ${attacker.name} Muda!!!!!!! พลาด — หมดลง`); }
    if (s.mudaHit) { s.mudaHit = false; s.clipNext = CUT.muda; }
  },
  // คลิปก่อนฉากตี: Muda (ทุกครั้ง) > เศษเดนมนุษย์ (ครั้งเดียว) > คริ (ทุกครั้ง) · ไม่มีคลิป = เสียงพากย์ตอนตี
  preAttackClip(engine, attacker, card) {
    if (!isGio(attacker)) return null;
    const s = st(attacker);
    const clip = s.clipNext || (card && card.crit ? (s.requiem ? CUT.reCrit : CUT.crit) : null);
    s.clipNext = null;
    if (!clip) voice(engine, attacker, "strike");
    return clip;
  },
  // ต้นตาเดิน / โดนตีปกติ (ระบบกลาง server/voice.js — โดนตีดังตอนฉากตีเริ่ม หลังคลิปของผู้ตี) · ที่เหลือเล่นเองตามว่ามีคลิปไหม
  //  ต้นตาที่รอผลธนู = คลิป ไม่มีเสียงพากย์ตัดหน้า
  voiceLines(p) { return isGio(p) ? { turn: st(p).arrowWait ? [] : lines(p).turn, struck: lines(p).struck } : null; },

  // ---------- ตีปกติใส่เพื่อนร่วมทีม (action.strikeTarget) → วินาทีของฉาก ----------
  strikesAllies(p) { return isGio(p); },
  allyHealOn(engine, p) { return isGio(p) ? (st(p).muda ? MUDA_HEAL : ALLY_HEAL) : null; }, // หน้าคาดการณ์
  allyStrike(engine, p, t) {
    if (!isGio(p) || !t || !t.alive || !engine.sameTeam(p, t)) return 0;
    const s = st(p);
    if (s.muda) {
      s.muda = false;
      mudaLand(engine, p, t, false);
      engine.queueCutscene(p, CUT.muda);
      return ALLY_STRIKE_SECONDS;
    }
    const healed = engine.healHp(t, ALLY_HEAL);
    engine.log(`✨ ${p.name} Gold Experience → ${t.name} ฟื้นพลังชีวิต +${healed}`);
    fx(engine, t, "heal", { from: p.id, n: healed });
    engine.sfx(SFX.heal);
    voice(engine, p, "heal");
    return ALLY_STRIKE_SECONDS;
  },

  // ---------- จงกำเนิดใหม่: หลบได้แน่นอน 1 ครั้ง (ใครก็ได้ที่มีต้นไม้ — broadcast) ----------
  grantedDodge(engine, target) {
    if (!treeOn(engine, target)) return null;
    target.giornoTree.seq = engine.cmdSeq;
    fx(engine, target, "dodge");
    return { name: "จงกำเนิดใหม่ — หลบหลีก", img: IMG.tree };
  },
  dodgeSure(engine, target) { return treeOn(engine, target); }, // หน้าคาดการณ์ (ไม่ใช้ผล)
  // ลอยบนต้นไม้ = เดินไม่ได้ (broadcast movBlocked)
  movBlocked(engine, p) { return treeOn(engine, p); },

  // ---------- ต้นตอแห่งชีวิต (combat — ฮุคของเป้า) ----------
  reflectsDamage(engine, p, src) {
    if (!reflectOn(engine, p) || !src || src.id === p.id) return null;
    st(p).reflect.seq = engine.cmdSeq;
    return { name: "ต้นตอแห่งชีวิต", img: IMG.reflect };
  },
  // ความเสียหายที่ไม่มีต้นตอ (ลุกไหม้/เลือดไหล/พื้น/ชน) ระหว่างต้นตอแห่งชีวิต = กันไว้เฉยๆ ไม่เสียผลสะท้อน
  adjustIncomingDamage(engine, p, n) {
    if (!isGio(p) || !(n > 0) || !reflectOn(engine, p)) return n;
    return engine.effectSourceId ? n : 0;
  },
  // หลังสะท้อน (combat.reflectBack) · inStrike = ในฉากตีปกติ (ไม่มีเสียง — คลิปก่อนฉากตีของผู้ตีอาจตามมา · ป้ายฉากตีบอกแทน)
  onReflected(engine, p, src, n, { inStrike } = {}) {
    if (!isGio(p)) return;
    fx(engine, p, "reflectHit", { to: src.id, toAt: src.pos ? { ...src.pos } : null, n });
    if (!inStrike) engine.sfx(SFX.reflectHit);
  },

  // ---------- สกิล ----------
  skillPub(p, tier) {
    if (!isGio(p)) return null;
    const s = st(p);
    const eng = engineNow();
    const round = eng.roundNumber;
    const re = !!s.requiem;
    if (tier === "basic") {
      const uses = lifeUses(eng, p);
      const full = p.hp >= eng.maxHpOf(p);
      const heal = bagItems(p).map((it) => ({
        key: it.uid, item: { ...it }, img: re ? IMG.re.skill1 : IMG.skill1, cost: re ? 0 : LIFE_COST_ITEMS, area: { kind: "self" },
        desc: `ฟื้นพลังชีวิต ${LIFE_HEAL}`, locked: uses >= LIFE_PER_TURN || full, left: LIFE_PER_TURN - uses, free: true,
      }));
      if (!re) return { choices: heal };
      const itemName = require("../server/shop").shopItemName;
      const shots = bagItems(p).map((it) => ({
        key: `shot:${it.uid}`, name: `กระสุน · ${itemName(it)}`, img: IMG.re.skill1, cost: 0, area: { kind: "line", len: SHOT_LEN, width: 1, hostile: true },
        desc: `สละไอเทมนี้ ยิงแนว ${SHOT_LEN}×1: ศัตรูทุกคนในแนว ความเสียหาย ${SHOT_DMG} และติดพิษร้าย ${SHOT_POISON} เทิร์น`, locked: uses >= LIFE_PER_TURN, left: LIFE_PER_TURN - uses, free: true,
      }));
      return { img: IMG.re.skill1, choices: [...heal, ...shots] };
    }
    if (tier === "secondary") {
      const rcd = cdLeft(s.reflectReady, round), tcd = cdLeft(s.treeReady, round);
      return {
        ...(re ? { img: IMG.re.skill2 } : {}),
        choices: [
          { key: "reflect", name: "ต้นตอแห่งชีวิต", img: re ? IMG.re.skill2 : IMG.reflect, cost: re ? 0 : REFLECT_COST, area: { kind: "self" }, cd: rcd, locked: rcd > 0 || reflectOn(eng, p),
            desc: `ถึงตาเดินถัดไป: ศัตรูโจมตีโดน 1 ครั้ง = ไม่เสียหาย สะท้อนความเสียหายและดีบัฟกลับ (คูลดาวน์ ${REFLECT_CD} เทิร์น)` },
          { key: "tree", name: "จงกำเนิดใหม่", img: re ? IMG.re.skill2 : IMG.tree, cost: re ? 0 : TREE_COST, area: { kind: "target", range: "mov", self: true }, cd: tcd, locked: tcd > 0,
            desc: `1 คนในระยะเดิน: ตัวเอง/เพื่อน ลอยบนต้นไม้ หลบได้แน่นอน 1 ครั้ง เดินไม่ได้ ถึงตาเดินถัดไป · ศัตรู ถูกตรึง ${ROOT_TURNS} เทิร์น (คูลดาวน์ ${TREE_CD} เทิร์น)` },
        ],
      };
    }
    if (tier === "ultimate" && re) {
      return { name: "ขอให้ไปสู่ภพภูมิที่ดี", img: IMG.re.skill3, area: { kind: "line", len: RE_ULT_LEN, width: 1, hostile: true }, flash: true,
        desc: `พุ่ง ${RE_ULT_LEN} ช่อง ชนศัตรูคนแรก ความเสียหาย ${RE_ULT_DMG} · ตายจากท่านี้ = ฟื้นทุกเทิร์นแล้วตายอีกเมื่อถึงตาตัวเอง ทุกครั้งที่ตาย ได้แต้มสกิล 1 เหรียญ 1 (คูลดาวน์ ${RE_ULT_CD} เทิร์น)` };
    }
    if (tier === "ultimate") return s.muda ? { active: true } : null;
    return null;
  },
  skillCost(p, tier, base, opts = {}) {
    if (reqOn(p)) return 0;
    if (!isGio(p) || tier !== "secondary") return base;
    return opts.form === "tree" ? TREE_COST : opts.form === "reflect" ? REFLECT_COST : base;
  },
  skillArea(p, tier, area, opts = {}) {
    if (reqOn(p) && tier === "ultimate") return { kind: "line", len: RE_ULT_LEN, width: 1, hostile: true };
    if (reqOn(p) && tier === "basic" && isShot(opts.form)) return { kind: "line", len: SHOT_LEN, width: 1, hostile: true };
    if (!isGio(p) || tier !== "secondary") return area;
    return opts.form === "tree" ? { kind: "target", range: "mov", self: true } : { kind: "self" };
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isGio(p)) return true;
    const s = st(p);
    if (tier === "basic") {
      if (lifeUses(engine, p) >= LIFE_PER_TURN) return false;
      if (isShot(opts.form) ? !s.requiem : p.hp >= engine.maxHpOf(p)) return false;
      return bagItems(p).some((it) => it.uid === itemOfForm(opts.form));
    }
    if (tier === "secondary") {
      if (opts.form === "reflect") return cdLeft(s.reflectReady, engine.roundNumber) === 0 && !reflectOn(engine, p);
      if (opts.form === "tree") {
        const t = engine.players[(targets || [])[0]];
        return cdLeft(s.treeReady, engine.roundNumber) === 0 && !!t && t.alive;
      }
      return false;
    }
    if (tier === "ultimate") return s.requiem ? cdLeft(s.ultReady, engine.roundNumber) === 0 : !s.muda;
    return true;
  },
  ownsAreaHit(p, tier) { return reqOn(p) && tier === "ultimate"; },
  skipsTurnQuota(p, tier) { return isGio(p) && tier === "basic"; },
  ignoresTurnQuota(p, tier) { return isGio(p) && tier === "basic"; },
  skillSound(p, tier, opts = {}) {
    if (!isGio(p)) return null;
    const s = st(p);
    if (s.clipNow) { s.clipNow = false; return null; }
    if (tier === "basic") return isShot(opts.form) ? SFX.shot : SFX.life;
    if (tier === "secondary") return opts.form === "tree" ? SFX.tree : SFX.reflect;
    return s.requiem ? SFX.dash : SFX.burst;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isGio(p)) return "";
    const s = st(p);
    s.clipNow = false;
    if (tier === "basic") {
      const idx = (p.inventory || []).findIndex((it) => it.uid === itemOfForm(opts.form));
      if (idx < 0) return "";
      const [item] = p.inventory.splice(idx, 1);
      if (s.lifeRound !== engine.roundNumber) { s.lifeRound = engine.roundNumber; s.lifeUses = 0; }
      s.lifeUses++;
      if (isShot(opts.form)) {
        s.clipNow = true; // คลิปทุกครั้ง (ผู้ใช้สั่ง 2026-11-04)
        engine.queueCutscene(p, CUT.shot);
        engine.deferAfterCutscene(() => shoot(engine, p, targets, opts.dir));
        engine.log(`🔫 ${p.name} กระสุนแห่งชีวิต — สละไอเทม 1 ชิ้น`);
        return "";
      }
      const healed = engine.healHp(p, LIFE_HEAL);
      engine.log(`🌱 ${p.name} ชีวิตทดแทน — สละ${item.type ? "ไอเทม" : ""} 1 ชิ้น ฟื้นพลังชีวิต +${healed}`);
      fx(engine, p, "life", { n: healed });
      voice(engine, p, "basic");
      return ` +${healed}`;
    }
    if (tier === "secondary" && opts.form === "reflect") {
      s.reflect = windowFor(engine, p);
      s.reflectReady = engine.roundNumber + REFLECT_CD + 1;
      fx(engine, p, "reflect");
      voice(engine, p, "reflect");
      engine.log(`🐍 ${p.name} ต้นตอแห่งชีวิต — การโจมตีครั้งถัดไปของศัตรูจะสะท้อนกลับ`);
      return "";
    }
    if (tier === "secondary" && opts.form === "tree") {
      const t = engine.players[(targets || [])[0]];
      s.treeReady = engine.roundNumber + TREE_CD + 1;
      s.clipNow = s.requiem ? false : clipOnce(engine, p, CUT.tree); // ร่าง Requiem ไม่เล่นคลิป (ผู้ใช้สั่ง)
      if (!s.clipNow) voice(engine, p, "tree");
      if (!t) return "";
      if (friendOf(engine, p, t)) {
        t.giornoTree = { ...windowFor(engine, t), by: p.id };
        engine.deferAfterCutscene(() => fx(engine, t, "tree")); // คลิปครั้งแรกเต็มจอ = ต้นไม้งอกหลังคลิป
        engine.log(`🌳 ${p.name} จงกำเนิดใหม่ → ${t.name} ลอยขึ้นบนต้นไม้ (หลบได้ 1 ครั้ง)`);
        return t.id === p.id ? "" : ` → ${t.name}`;
      }
      const acted = engine.actorId === t.id || engine.hasActed(t.id);
      const ok = engine.applyDebuff(t, "rooted", 1, ROOT_TURNS + (acted ? 1 : 0));
      engine.deferAfterCutscene(() => fx(engine, t, "root"));
      engine.log(ok ? `🌳 ${p.name} จงกำเนิดใหม่ → ${t.name} ถูกตรึง ${ROOT_TURNS} เทิร์น` : `🌳 ${t.name} ต้านการตรึงได้`);
      return ` → ${t.name}`;
    }
    if (tier === "ultimate" && s.requiem) {
      s.ultReady = engine.roundNumber + RE_ULT_CD + 1;
      const { path, hit } = planDash(engine, p, opts.dir);
      s.clipNow = !!hit; // ชน = คลิป ไม่มีเสียงตัดหน้า
      if (!hit) voice(engine, p, "ultimate");
      engine.setDash({ id: p.id, path });
      engine.skillBeat(Math.max(0, path.length - 1) * DASH_STEP_SECONDS + 0.15, () => {
        const end = path[path.length - 1];
        p.pos = { x: end.x, y: end.y };
        require("../server/skills").hitArea(p, path.slice(1), hit ? [hit.id] : []);
        if (!hit) return;
        engine.queueCutscene(p, CUT.reUlt);
        engine.deferAfterCutscene(() => reUltImpact(engine, p, hit));
      });
      return "";
    }
    if (tier === "ultimate") {
      s.muda = true;
      s.mudaAt = engine.severStamp();
      fx(engine, p, "burst");
      voice(engine, p, "ultimate");
      engine.log(`👊 ${p.name} Muda!!!!!!! — ตีปกติครั้งถัดไปเสริมพลังชีวิต`);
      return "";
    }
    return "";
  },

  // ---------- ต้นตาเดินของตัวเอง: ต้นตอแห่งชีวิต/ต้นไม้ที่ไม่ได้ใช้หมดลง (ล้างค้าง — ช่วงเวลาคิดจาก windowOpen อยู่แล้ว) ----------
  onActorStart(engine, p) {
    if (!isGio(p)) return;
    const s = st(p);
    if (s.reflect && !windowOpen(engine, p, s.reflect)) s.reflect = null;
    syncArrow(engine, p);
  },
  // ถึงตาคนวนตาย = ตายอีกครั้งก่อนทำอะไรได้ (broadcast — คนละตัวละคร)
  onUnitActorStart(engine, u) {
    if (!u.alive || !u.pos || !inLoop(engine, u)) return;
    engine.log(`💀 ${u.name} ตายอีกครั้ง`);
    engine.instantDeath(u, "absolute");
    if (!u.alive) u.pos = null;
  },
  // ต้นเทิร์น (ลำดับเดินเรียงแล้ว): คนวนตายฟื้น
  onOrderBegin(engine) {
    for (const g of Object.values(engine.players)) {
      if (!isGio(g) || !g.alive) continue;
      for (const [id, at] of Object.entries(st(g).loop)) {
        const t = engine.players[id];
        if (t && !t.alive) loopRevive(engine, t, at);
      }
    }
  },
  onDeath(engine, dead) {
    if (isGio(dead)) {
      const s = st(dead);
      s.requiem = null;
      const ids = Object.keys(s.loop);
      s.loop = {}; // จบวนตาย: คนที่ฟื้นอยู่ตายตาม
      for (const id of ids) {
        const t = engine.players[id];
        if (t && t.alive && !inLoop(engine, t)) { engine.instantDeath(t, "absolute"); if (!t.alive) t.pos = null; }
      }
      return;
    }
    for (const g of loopOwners(engine, dead.id)) {
      if (dead.pos) st(g).loop[dead.id] = { ...dead.pos };
      engine.addSkill(g, 1);
      engine.addGold(g, 1);
      engine.log(`🌀 ${dead.name} ตายอีกครั้ง — ${g.name} แต้มสกิล +1 เหรียญ +1`);
      fx(engine, dead, "loopDie");
      engine.sfx(SFX.loop);
    }
  },
  onEndTurn(engine) {
    for (const u of Object.values(engine.players)) {
      if (u.giornoTree && !windowOpen(engine, u, u.giornoTree) && engine.roundNumber > u.giornoTree.round + 1) u.giornoTree = null;
      if (reqOn(u) && engine.roundNumber >= st(u).requiem.until) endRequiem(engine, u);
    }
  },

  // ---------- ตัดผลสกิล (server/sever.js) ----------
  severables(engine, p) {
    if (!isGio(p)) return [];
    const s = st(p);
    const out = [];
    if (reflectOn(engine, p)) out.push({ key: "gioReflect", label: "ต้นตอแห่งชีวิต", at: s.reflect.at || 0, cancel() { s.reflect = null; } });
    if (s.muda) out.push({ key: "gioMuda", label: "Muda!!!!!!!", at: s.mudaAt || 0, cancel() { s.muda = false; } });
    if (s.arrowWait) out.push({ key: "gioArrow", label: "ธนู Requiem", at: s.arrowWait, cancel() { s.arrowWait = 0; } });
    if (s.requiem) out.push({ key: "gioRequiem", label: "Gold Experience Requiem", at: s.requiem.at, cancel() { endRequiem(engine, p); } });
    if (Object.keys(s.loop).length) out.push({ key: "gioLoop", label: "ขอให้ไปสู่ภพภูมิที่ดี", at: s.loopAt || 0, cancel() { s.loop = {}; } });
    for (const u of Object.values(engine.players)) {
      if (treeOn(engine, u) && u.giornoTree.by === p.id) out.push({ key: `gioTree:${u.id}`, label: "จงกำเนิดใหม่", at: u.giornoTree.at || 0, cancel() { u.giornoTree = null; } });
    }
    return out;
  },

  // ---------- ข้อมูลให้ client ----------
  //  ทุกคน (ต้นไม้อยู่บนใครก็ได้) — view.buildStateFor players[].giorno
  unitMark(engine, p) {
    const tree = treeOn(engine, p);
    const mine = isGio(p);
    const reflect = mine && reflectOn(engine, p);
    const muda = mine && st(p).muda;
    const loop = inLoop(engine, p);
    if (!tree && !reflect && !muda && !mine && !loop) return undefined;
    return {
      tree, reflect, muda, loop,
      ...(mine ? { requiem: reqOn(p), reqLeft: reqOn(p) ? st(p).requiem.until - engine.roundNumber + 1 : 0, arrowCd: cdLeft(st(p).arrowReady, engine.roundNumber), arrowWait: !!st(p).arrowWait } : {}),
      ...(mine ? { lifeLeft: LIFE_PER_TURN - lifeUses(engine, p), reflectCd: cdLeft(st(p).reflectReady, engine.roundNumber), treeCd: cdLeft(st(p).treeReady, engine.roundNumber), rage: !st(p).rageUsed } : {}),
    };
  },
  skillLocks(engine, p) {
    if (!isGio(p)) return undefined;
    const s = st(p);
    return {
      basic: { locked: lifeUses(engine, p) >= LIFE_PER_TURN, free: true },
      ultimate: s.requiem ? { locked: cdLeft(s.ultReady, engine.roundNumber) > 0, cd: cdLeft(s.ultReady, engine.roundNumber) } : { locked: s.muda },
    };
  },
};
