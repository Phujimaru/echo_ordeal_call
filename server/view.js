// สร้างสถานะที่ส่งให้ผู้เล่นแต่ละคน + broadcast
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  displayImg, buildStateFor, broadcastState, broadcastPositions, takenUniqueChars, emitBoardFx, emitVisible,
});

const { CHAR_BY_ID } = require("../characters");
const CHAR_HOOKS = require("../characters/index");
const { blindActive } = require("../characters/_universal_status");
const Mark42 = require("../characters/_mark42");
const Journey = require("../characters/_journey");
const { io } = require("./app");
const { BAG_SLOTS, GUTS_RANGE, MAX_PLAYERS, TRANSFORMS } = require("./constants");
const match = require("./match");
const { engine } = require("./engine");
const combat = require("./combat");
const dayNight = require("./dayNight");
const cardDeck = require("./deck");
const action = require("./phases/action");
const attackPhase = require("./phases/attack");
const lobby = require("./lobby");
const shop = require("./shop");
const Visibility = require("./visibility");
const Zero = require("./zeroTime");
const Ice = require("./ice");
const Duo = require("./duo");
const Soot = require("./soot");
const skills = require("./skills");
const Ride = require("./ride");
const TimeStop = require("./timeStop");
const Colony = require("./colony");
const Moon = require("./moonCell");
const Fodlan = require("./fodlan");
const Dim = require("./dimension");

// รูปที่แสดงบนสนาม: เกราะ Mark 42 > ร่างของตัวละคร (hook displayImg) > ภาพประจำตัว
function displayImg(p) {
  if (Mark42.suited(p)) return Mark42.IMG.suit; // เกราะ Mark 42: ภาพประจำตัวเป็นชุดเกราะระหว่างใส่
  const hook = CHAR_HOOKS[p.characterId];
  const img = hook && hook.displayImg ? hook.displayImg(p) : null; // มุยมิ: ระหว่าง “ดาบสะบั้น” ใช้ภาพท่าไม้ตาย
  return img || p.img;
}
// เพลงสกิล: คนที่เปิดร่างล่าสุด — คืน { music, at } (at = ลำดับการเปิดร่าง ให้ client รู้ว่าเป็น "การเปิดครั้งใหม่"
//  -> เพลงต้องเริ่มใหม่จากต้น)
function activeSkillMusic() {
  // มุยมิ: เพลงประจำท่าไม้ตายเล่นค้างตลอดช่วง “ดาบสะบั้น”
  let best = null;
  for (const p of combat.alivePlayers()) {
    if (CHAR_HOOKS.muimi.towerActive(p)) {
      if (!best || (p.transformAt || 0) > best.at) best = { music: "muimi", at: p.transformAt || 0 };
    }
    // กิระ: เพลงอัฐิราชาเล่นค้างตลอด 3 เทิร์นของท่าไม้ตาย
    const kira = match.gameState !== "GAMEOVER" ? CHAR_HOOKS.kira.ultMusic(engine, p) : null; // กิระ: เพลงระหว่างอัฐิราชา · จบเกมแล้วกลับเพลงปกติ
    if (kira && (!best || kira.at > best.at)) best = kira;
  }
  // ฮุค skillMusic(engine, p) → { music, at } ของทุกโมดูล ถามกับทุกคนที่ยังอยู่ (ยูนะ: เพลงที่เปิด / ไอดอล / Longing ของคนที่ได้คำอวยพร)
  if (match.gameState !== "GAMEOVER") {
    for (const p of combat.alivePlayers()) {
      for (const mod of CHAR_HOOKS.MODULES) {
        if (typeof mod.skillMusic !== "function") continue;
        const r = combat.runHook(mod, "skillMusic", engine, p);
        if (r && r.music && (!best || (r.at || 0) > best.at)) best = { music: r.music, at: r.at || 0 };
      }
    }
  }
  // ระบำเขม่า (เคท): เพลง intro → loop ตลอดที่ม่านแดงยังอยู่ (client เล่น intro ครั้งเดียวต่อ seq แล้ววน loop)
  for (const s of Soot.storms()) {
    if (!best || (s.seq || 0) > best.at) best = { music: "kate_storm", at: s.seq || 0 };
  }
  return best;
}

// แผนที่ที่ client วาด (ค่าคงที่ต่อภูมิภาค — ส่งไปทั้งก้อนเพราะไม่ใหญ่: สิ่งกีดขวาง ~20 ช่อง + ช่องพิเศษ)
//  special = { "x,y": ชนิด } · flow = { "x,y": ทิศกระแสน้ำวน } · healKind = ชื่อจุดฟื้นฟูใน Board.TERRAIN_INFO
function boardPublic() {
  if (!match.board) return null;
  const m = action.boardMap();
  return {
    area: match.board.area, cols: m.cols, rows: m.rows, terrain: m.terrain, heal: [...m.heal],
    special: m.special || {}, flow: m.flow || {}, healKind: m.healKind || "heal",
    ...Ice.publicInfo(), // ธารน้ำแข็ง / หนามน้ำแข็ง / คุกน้ำแข็งที่รอช่วงที่ 2 (Ice Spike) / พื้นเปียก (เอมิลิโกะ)
    storms: Soot.publicInfo(), // ม่านแดง (ระบำเขม่า — เคท)
    spawns: m.spawns, shopSpots: m.shopSpots,
    // Colony (GRID_PLAN §8.3): กระดานต่อวงรอบ · กำแพงกั้นปล้อง + ประตู · แถวแรกที่ยังไม่ปิดผนึก · แถบกระจก
    ...(m.wrap ? { wrap: true, walls: m.walls, doors: m.doors, minRow: m.minRow | 0, glass: m.glass, section: m.section } : {}),
    ...boardExtras(), // ชั้นบนพื้นของตัวละคร (ฮุค boardPublic — ดิเอโก้: น้ำมัน/กองไฟ/ขี้เถ้า → diego)
  };
}
// ฮุค broadcast boardPublic(engine) → { คีย์: ข้อมูล } ที่ทุกคนเห็นบนกระดาน (ของในพื้นที่ที่ไม่ใช่ของผู้เล่นคนใดคนหนึ่ง)
function boardExtras() {
  const out = {};
  for (const mod of CHAR_HOOKS.MODULES) {
    if (typeof mod.boardPublic !== "function") continue;
    Object.assign(out, combat.runHook(mod, "boardPublic", engine) || {});
  }
  return out;
}

// คาดการณ์ผลการตีปกติของคนที่กำลังเดิน (หน้าต่างคาดการณ์แบบ Fire Emblem — GRID_PLAN §6)
//  { [targetId]: { dmg: เราตีเขา, back: เขาสวนเรา, hit, crit, backHit, backCrit } } — พลังโจมตีก่อนหักเกราะ/หลบ
//  + โอกาสโดน/คริติคอล (%) ทั้งสองฝั่ง (ไม่สุ่ม ไม่แตะสถานะ — attackPhase.estimateHitOn/estimateCritOf)
function forecastFor(viewer) {
  if (!viewer || !viewer.alive || match.gameState !== "ACTION" || match.actorId !== viewer.id) return null;
  const out = {};
  for (const t of combat.alivePlayers()) {
    if (t.id === viewer.id || !t.pos || combat.sameTeam(viewer, t) || !Dim.same(viewer, t) || Visibility.hiddenFromUnit(viewer, t)) continue; // คนละชั้นมิติ = ไม่มีคาดการณ์
    out[t.id] = {
      dmg: attackPhase.estimateAttackOn(viewer, t), back: attackPhase.estimateAttackOn(t, viewer),
      // โอกาสโดน/คริติคอล (% จำนวนเต็ม 0–100) — back* = ฝั่งเป้าตีสวนกลับ (มีผลเฉพาะเป้าที่ตีสวนได้)
      hit: attackPhase.estimateHitOn(viewer, t), crit: attackPhase.estimateCritOf(viewer, t),
      backHit: attackPhase.estimateHitOn(t, viewer), backCrit: attackPhase.estimateCritOf(t, viewer),
    };
  }
  return out;
}

// ============================================================
//  ส่งสถานะ
// ============================================================
// สถานะที่ผู้เล่นคนอื่นเห็นได้ระหว่างช่วงจั่วการ์ด (patch 1.7.1): โชว์ให้ดูของกันและกันได้
//  ยกเว้นท่าไม้ตายหลังเปิดไพ่ที่เพิ่งกดรอไว้ในเทิร์นนี้ — เปิดเผยเมื่อทำงานแล้วเท่านั้น (กันสปอยล์)
function publicStatuses(p) {
  const out = {};
  for (const [k, v] of Object.entries(p.statuses || {})) {
    if (TRANSFORMS[k] && TRANSFORMS[k].afterReveal && !(p.seen && p.seen[k])) continue;
    out[k] = v;
  }
  return out;
}
function buildStateFor(viewerId) {
  // คัตซีนที่แทรกกลางช่วงจั่ว (ยังมีคนไม่กด "พอ") ยังห้ามเปิดแต้ม — คัตซีนหลังเปิดไพ่ทุกคนล็อกแล้ว
  const drawingCutscene = match.gameState === "CUTSCENE" && Duo.cardHolders().some((p) => !p.locked);
  const revealAll = !drawingCutscene && match.gameState !== "PLAYING" && match.gameState !== "LOBBY" && match.gameState !== "TEAM_MODE" && match.gameState !== "TEAM_SETUP";
  const nightNow = dayNight.isNightRound(Zero.worldRound()); // เวลาโลก (ห่วงเวลาซีโร่หยุดไว้)
  const sm = activeSkillMusic();
  const viewer = match.players[viewerId];
  // ระบบคู่ (server/duo.js): ตัวที่ผู้เล่นคนนี้คุมอยู่ — แผงตัวเรา/ปุ่มสกิล/คาดการณ์ผลใช้ตัวนี้
  const controlId = viewer ? Duo.controlledId(viewerId) : null;
  const unit = (controlId && match.players[controlId]) || viewer;
  // สมุดการ์ดกองกลาง: การ์ดทั้ง 43 ใบตามลำดับคงที่ + ใบไหนถูกจั่วไปแล้วในรอบนี้ (centralDeck สับใหม่ทุกรอบ — สมุดนี้จึงนับเฉพาะรอบปัจจุบัน)
  const remainingCardKeys = new Set(match.centralDeck.map(cardDeck.cardKey));
  const deckLedger = cardDeck.canonicalDeckCards().map((c) => ({ ...c, drawn: !remainingCardKeys.has(cardDeck.cardKey(c)) }));
  // คนที่กำลังเดินซึ่งผู้ชมคนนี้มองไม่เห็น (ล่องหน/พุ่มหญ้า) — ไม่ส่งเส้นทาง/ช่องเริ่มตา (server/visibility.js)
  const actorUnseen = Visibility.hiddenFrom(viewer, match.players[match.actorId]);
  // "มืดบอด" (ติดตัวเคทในระบำเขม่า): ผู้ชมที่ติด (ตัวไหนของฝ่ายก็ได้) เห็นหมากคนอื่นเป็นสีขาว ไม่มีชื่อ/ภาพ/ลำดับเดิน
  const masked = !!viewer && match.gameState !== "GAMEOVER" && Duo.unitsOf(viewer).some((u) => u.alive && (u.statuses.shadowMask || 0) > 0);
  return {
    gameState: match.gameState,
    gameMode: match.gameMode,
    world: match.world, // earth | fodlan (GRID_PLAN §8.5) | colony (§8.3) | moon (§8.4)
    fodlan: Fodlan.publicInfo(), // Fodlan: ด่าน/สภาพอากาศ/เทิร์นที่เหลือ/ฉากเข้า-เปลี่ยนแผนที่ — null = ไม่ได้อยู่ใน Fodlan
    colony: Colony.publicInfo(), // Colony: ปล้อง/ประตู/เป้าอันตราย/รอยรั่ว/แคปซูล/ฉากต้นเทิร์น — null = ไม่ได้อยู่ใน Colony
    moon: Moon.publicInfo(), // Moon Cell (GRID_PLAN §8.4): ฮาคุโนะ/ฟื้นคืนชีพ/คำสาปที่เตือนไว้/ผลแพ้ชนะ/ฉากต้นเทิร์น — null = ไม่ได้อยู่
    teamSize: match.teamSize,
    teamCount: match.teamCount,
    teamOptions: lobby.currentTeamOptions(),
    modeOptions: lobby.modeOptionsFor(),
    modeVotes: lobby.modeVoteSummary(),
    winningTeamId: match.winningTeamId,
    timeLeft: match.timeLeft,
    roundNumber: match.roundNumber,
    deckEmpty: match.centralDeck.length === 0,
    cycle: nightNow ? "night" : "day", // กลางวัน/กลางคืน
    // การเดินทาง (ffa/duo/trio): ภูมิภาค + กลางวัน/กลางคืน + คำอธิบายผลสนาม + ฉากแผนที่ที่กำลังพักเกมรอ
    journey: Journey.publicInfo(engine, match.journeyScene),
    // ห่วงเวลาซีโร่ (GRID_PLAN §8.2): ระดับ · ผนึก 4 มุม · ของฟื้นพลังชีวิต · ฉากที่กำลังพักเกมรอ — null = ไม่ได้อยู่
    zero: Zero.publicInfo(),
    // หยุดเวลา (server/timeStop.js): ใครหยุดอยู่ — กระดานโทนซีเปีย · เลือด/สถานะของคนอื่นค้างค่าตอนเริ่มหยุด
    timeFreeze: TimeStop.frozen() ? { by: TimeStop.frozen().by } : null,
    maxPlayers: MAX_PLAYERS,
    youId: viewerId,
    fodlanVision: require("./fodlan").vision(viewer) || undefined, // Fodlan หมอก: ช่องที่ฉันมองเห็น ("x,y") — client วาดหมอกนอกช่องเหล่านี้
    controlId, // ระบบคู่: ตัวที่คุมอยู่ (ตัวละครทั่วไป = youId)
    // ระบบคู่: ตาของฝ่ายคู่ที่กำลังเล่น — ตัวที่จบแล้ว (สลับกลับไม่ได้) · ตัวที่ยังไม่ได้เดิน
    duo: match.duo ? { ownerId: match.duo.ownerId, done: Object.keys(match.duo.done) } : null,
    // กระดาน (GRID_PLAN.md): แผนที่ของภูมิภาคปัจจุบัน + ลำดับเดิน + ตาเดินที่กำลังเล่น
    board: boardPublic(),
    turnOrder: masked ? [] : match.turnOrder,
    actorIndex: masked ? -1 : match.actorIndex, // ตำแหน่งในลำดับของฝ่ายที่เดินล่าสุด (ตาพิเศษหยุดเวลา = ยังไม่เลื่อน) — คิว 2 คนถัดไปด้านขวา
    masked,
    forecast: forecastFor(unit), // คาดการณ์ผลตีปกติ (เฉพาะคนที่กำลังเดิน เห็นของตัวเอง)
    actorId: (match.gameState === "ACTION" || match.gameState === "ATTACKING") ? match.actorId : null,
    action: match.gameState === "ACTION" && match.action && !actorUnseen ? {
      from: match.action.from, moved: match.action.moved, locked: match.action.locked, path: match.action.path || null,
      canto: !!match.action.canto, // เดินต่อหลังจบตา (เอมิลิโกะ): ได้แค่เดิน/ย้อน/รอ
      noStrike: !!match.action.noStrike, // ตีปกติไม่ได้ในตานี้ (กินขนมปัง — action.lockStrike)
      // เดินต่อ/เดินใหม่จากจุดเริ่มตา: เส้นทางที่เดินมา (ลูกศรคีย์บอร์ด) + แผนที่ตอนเริ่มตา (ถอดน้ำแข็ง/ของพังจากการเดินตานี้)
      trail: match.action.trail || null, walkUndo: action.walkUndoPatch(),
    } : null,
    rideAsk: Ride.publicAsk(viewerId), // คำขอขี่ที่รอตอบ (คนขอ / เจ้าของตัวที่ถูกขอเห็น — server/ride.js)
    skillMusic: sm ? sm.music : null,
    skillMusicSeq: sm ? sm.at : 0, // เปลี่ยน = การเปิดร่างครั้งใหม่ -> client เริ่มเพลงใหม่
    // onlyFor: คลิปที่เล่นให้เฉพาะบางคนดู — คนนอกลิสต์ได้ null (หน้าจอไม่เล่นวีดีโอ แต่ยังรอครบเวลาเท่ากัน)
    cutscene: (match.gameState === "CUTSCENE" && match.cutsceneInfo && (!match.cutsceneInfo.onlyFor || match.cutsceneInfo.onlyFor.includes(viewerId)))
      ? match.cutsceneInfo : null,
    // ฉากตีที่ผู้ชมมองไม่เห็นทั้งคนตีและเป้า (สู้กันในม่านแดง / พุ่มหญ้า) = ไม่ส่ง
    attack: match.gameState === "ATTACKING" && !attackUnseen(viewer, match.lastAttack) ? match.lastAttack : null,
    dash: match.dash, // การพุ่งล่าสุดบนกระดาน (โซระ: Mouse Separade) — client เล่นตาม seq ใหม่
    log: masked ? [] : ((match.gameState === "ORDER" || match.gameState === "TRANSITION" || match.gameState === "GAMEOVER") ? Visibility.filterLog(match.lastLog, viewer) : []),
    shop: match.shopItems, // ร้านค้ามายา (patch 2.3): สินค้าส่วนกลางร้านเดียว เห็นเหมือนกันทุกคน
    shopPos: match.shopPos, // ช่องที่ร้านตั้งอยู่ (ซื้อได้เมื่อยืนติด — ระยะ 1)
    shopTurnsLeft: shop.shopTurnsLeft(), // อีกกี่เทิร์นร้านย้าย (รวมเทิร์นนี้)
    bagSlots: BAG_SLOTS,
    gutsRange: GUTS_RANGE,
    deckLedger, // สมุดการ์ด 43 ใบ + สถานะจั่วแล้ว/ยัง (ของรอบปัจจุบัน) — กดที่กองการ์ดกลางเพื่อดู
    // ยูนิตที่ถูกเรียก (server/summon.js) ที่ตาย/หมดเวลาแล้ว = ไม่ส่ง (ระเบียนรอลบตอนจบเทิร์น)
    players: Object.values(match.players).filter((p) => !(p.summon && !p.alive)).map((p) => {
      const mine = p.id === viewerId || Duo.sideKey(p) === viewerId; // ระบบคู่: ตัวที่สองก็เป็น "ของเรา"
      const show = mine || revealAll;
      // โหมดทีม (duo/trio): เพื่อนร่วมทีมเห็นแต้มการ์ดกันตลอดเวลา — ศัตรูยังถูกซ่อนตามปกติ
      const teamReveal = !!viewer && lobby.isAlly(viewer, p);
      // "ตาบอด" (สถานะ Universal patch 3.4): ผู้ที่ติดสถานะมองไม่เห็นอะไรเลย (บังเฉพาะผู้ชมคนที่ตาบอด)
      const blackout = !!viewer && blindActive(viewer);
      // "เปิดแต้ม" (promo, สถานะ Universal): แต้มการ์ดของคนติดสถานะถูกเปิดเผยให้ทุกคนเห็น
      const promoShow = (p.statuses.promo || 0) > 0;
      const ch = CHAR_BY_ID[p.characterId] || {};
      const hook = CHAR_HOOKS[p.characterId];
      // การมองเห็น: ผู้ชมคนนี้มองไม่เห็น p (ล่องหน/พุ่มหญ้า/ม่านแดง) = ไม่ส่งตำแหน่ง + ซ่อนข้อมูลอื่น (unseenPub)
      const unseen = Visibility.hiddenFrom(viewer, p);
      const secret = unseen && !mine;
      const charOver = !secret && hook && hook.characterPub ? hook.characterPub(engine, p) : null; // ชื่อ/ปกตัวละครที่เปลี่ยนตามร่าง
      const pub = (s) => (s ? { name: s.name, desc: s.desc, cost: s.cost, img: s.img, ammo: s.ammo, area: s.area || { kind: "self" } } : null);
      const basicPub = pub(ch.basic);
      const secondaryPub = pub(ch.secondary);
      const ultimatePub = pub(ch.ultimate);
      // ราคาบนปุ่ม = ราคาที่ useSkill() หักจริง (สูตรเดียวกัน — skills.skillCostOf: ฮุค skillCost · กลางคืน · การเดินทาง · กระแสเวท/ภาระเวท)
      //  คนที่มองไม่เห็น = ปุ่มตั้งต้นใน characters.js (ราคา/หน้าตาที่เปลี่ยนตามสถานะบอกใบ้ได้ — นักบิน: 3 แต้ม = มีแขน)
      const showCost = (pub, tierName) => (secret ? pub.cost : skills.skillCostOf(p, tierName, pub.cost));
      // พื้นที่ที่เปลี่ยนตามสถานะ (skillArea) — ต้องตรงกับ useSkill()
      if (!secret && hook && hook.skillArea) {
        for (const [s, tierName] of [[basicPub, "basic"], [secondaryPub, "secondary"], [ultimatePub, "ultimate"]]) {
          if (s) s.area = hook.skillArea(p, tierName, s.area) || s.area;
        }
      }
      // หน้าตาปุ่มที่เปลี่ยนตามสถานะ (ฮุค skillPub → ฟิลด์ที่ทับ — โซระ: รูปปุ่มแปลงร่าง / ชื่ออาวุธ)
      if (!secret && hook && hook.skillPub) {
        for (const [s, tierName] of [[basicPub, "basic"], [secondaryPub, "secondary"], [ultimatePub, "ultimate"]]) {
          if (s) Object.assign(s, hook.skillPub(p, tierName) || {});
        }
      }
      // ระยะสกิลที่ client วาด: range "mov" แปลงเป็นตัวเลขของผู้เล่นคนนี้
      //  รวมพื้นที่ของตัวเลือกในปุ่มหลายตัวเลือก (choices — เซลิน: คฑาแห่งการเยียวยา/กีดกัน ระยะเดิน)
      const movArea = (a) => (a && a.range === "mov" ? { ...a, range: action.areaRange(p, a) } : a);
      for (const s of [basicPub, secondaryPub, ultimatePub]) {
        if (!s) continue;
        s.area = movArea(s.area);
        if (Array.isArray(s.choices)) s.choices = s.choices.map((c) => (c && c.area && c.area.range === "mov" ? { ...c, area: movArea(c.area) } : c));
      }
      if (basicPub) basicPub.cost = showCost(basicPub, "basic");
      if (secondaryPub) secondaryPub.cost = showCost(secondaryPub, "secondary");
      if (ultimatePub) ultimatePub.cost = showCost(ultimatePub, "ultimate");
      const out = {
        id: p.id,
        name: p.name,
        // ระบบคู่: duoOf = ตัวที่สองของผู้เล่นคนนี้ (ไม่ใช่ผู้เล่นแยก — client ไม่นับในรายชื่อผู้เล่น) · duoWith = id ตัวที่สอง
        //  corpse = ช่องร่างของตัวที่ล้มขณะอีกตัวยังอยู่ (ขวางช่อง เดินข้ามได้)
        //  ร่างแยก (ยูนิตที่ถูกเรียกแบบคุมได้ — server/summon.js) ได้ duoOf = เจ้าของ ให้ client ใช้กลไกระบบคู่ (ไม่นับในรายชื่อ · ตัวที่คุม)
        duoOf: p.duoOf || (p.summon && p.summon.controlled ? p.summon.ownerId : null),
        // ชั้นมิติ (server/dimension.js): null = กระดานหลัก · คนคนละชั้นกับตัวที่คุม client วาดโปร่ง กดไม่ได้
        dim: p.dim || null,
        // ยูนิตที่ถูกเรียก: { kind: "clone" | "double", ownerId, look?, targetId?, until? }
        summon: p.summon ? { kind: p.summon.kind, ownerId: p.summon.ownerId, look: p.summon.look || null, targetId: p.summon.targetId || null, until: p.summon.until == null ? null : p.summon.until } : null,
        duoWith: p.duoWith || null,
        corpse: Duo.corpseKept(p) ? Duo.corpseOf(p) : null, // + ศพค้าง (ยูนะ — ฮุค keepsCorpses)
        ride: p.alive && p.mountId && match.players[p.mountId] ? p.mountId : null, // ขี่ผู้เล่นอื่น (server/ride.js): id ตัวที่ถูกขี่ — วาดบนหลัง
        avatar: p.avatar,
        img: displayImg(p),
        position: p.position,
        color: lobby.colorOf(p),
        teamId: p.teamId || null,
        teamConfirmed: !!p.teamConfirmed,
        // คูลดาวน์/ล็อกรายช่องของตัวละคร (โอเบรอน) — client ใช้ทำปุ่มเทา + ตัวเลขคูลดาวน์
        skillLocks: zeroLocks(p, CHAR_HOOKS[p.characterId] && CHAR_HOOKS[p.characterId].skillLocks
          ? CHAR_HOOKS[p.characterId].skillLocks(engine, p, viewer) : undefined), // viewer = ผู้ชม (ดิเอโก้: ซ่อนคูลดาวน์เดอะเวิลด์จากศัตรู)
        modeVote: p.modeVote || null,
        modeWorld: p.modeVote ? p.modeWorld || "earth" : null,
        colony: Colony.playerInfo(p), // Colony: { jumpCd }
        fodlan: Fodlan.playerInfo(p), // Fodlan: ความอบอุ่น · ศิลาตรา · ชีพจรเทพ … (server/fodlan/stageN.js playerInfo)
        iceHurt: CHAR_HOOKS.ice_spike && CHAR_HOOKS.ice_spike.isIceSpike(p) ? (p.iceHurt || 0) : undefined, // Ice Spike: ดาเมจสะสม (ครบ 3 = ระเบิด)
        locked: p.locked,
        busted: (show || promoShow || teamReveal) ? cardDeck.bustedOf(p) : false,
        result: p.result,
        cardCount: p.cards.length,
        cards: blackout ? null : (mine ? p.cards : null),
        score: blackout ? null : ((show || promoShow || teamReveal) ? cardDeck.scoreOf(p) : null),
        // ตาบอด: null = ซ่อนทั้งแถบ · เกราะ Mark 42: แสดงพลังชีวิต 0/0 + เกราะชุด x/7 (ค่าจริงซ่อนอยู่ข้างใต้ คืนตอนถอด)
        //  (LifeBar วาดหัวใจตามจำนวน maxHp — 0 = ไม่มีหัวใจสักดวง แต่ยังไม่ใช่ null จึงไม่ขึ้น "???")
        hp: blackout ? null : (Mark42.suited(p) ? 0 : p.hp),
        maxHp: blackout ? null : (Mark42.suited(p) ? 0 : combat.maxHpOf(p)),
        armor: blackout ? null : (Mark42.suited(p) ? p.mark42.armor : p.armor),
        maxArmor: blackout ? null : (Mark42.suited(p) ? Mark42.SUIT_ARMOR : combat.maxArmorOf(p)),
        mark42: Mark42.publicState(engine, p), // ใส่ชุดอยู่ไหม / ของใคร (เห็นทุกคน)
        ...(mine ? Mark42.privateState(engine, p) : {}), // ชุดของเราที่ส่งออกไป / คูลดาวน์ซื้อ (เห็นเจ้าตัว)
        shield: blackout ? null : p.shield,
        tempHp: p.tempHp || 0, // เลือดชั่วคราว (healOverflow)
        skillPoints: blackout ? -1 : p.skillPoints, // ตาบอด: ซ่อนแต้มสกิลของทุกคน (-1 = ซ่อน)
        // QTE ที่กำลังเล่นอยู่ — ส่งให้ "เจ้าของคนเดียว" และส่งเฉพาะปุ่มตัวถัดไป
        //  (ส่งลำดับทั้งชุดไปให้ = เห็นล่วงหน้าทั้งเพลง หมดความหมายของ QTE)
        qte: mine && p.qte ? {
          key: p.qte.keys[p.qte.idx], idx: p.qte.idx, total: p.qte.keys.length,
          deadline: p.qte.deadline, perNoteMs: p.qte.perNoteMs,
        } : undefined,
        maxSkill: combat.maxSkillOf(p),
        gold: p.gold || 0, // ร้านค้ามายา (patch 2.2 full): เหรียญสะสม — ทุกคนเห็นของกันและกันได้
        goldMax: shop.goldCapOf(p), // เพดานเหรียญรายบุคคล
        inventory: mine || teamReveal ? (p.inventory || []) : null, // ของในคลัง — เห็นของตัวเอง + เพื่อนร่วมทีม (ให้/แลกของ)
        gutsShotTurn: mine ? (p.gutsShotTurn || 0) : undefined, // ปืน GUTS Select: ยิงไปแล้วเทิร์นไหน (เทียบกับ roundNumber = ยิงครบโควตาแล้ว)
        muimiEmergencyUses: p.characterId === "muimi" ? (p.muimiEmergencyUses != null ? p.muimiEmergencyUses : CHAR_HOOKS.muimi.EMERGENCY_USES) : undefined,
        muimiEmergencyMax: p.characterId === "muimi" ? CHAR_HOOKS.muimi.EMERGENCY_USES : undefined,
        muimiEmergencyUsed: p.characterId === "muimi" ? p.muimiEmergencyUsedRound === match.roundNumber : undefined,
        muimiUltCd: mine && p.characterId === "muimi" ? CHAR_HOOKS.muimi.ultCooldownLeft(engine, p) : undefined,
        atCap: cardDeck.scoreOf(p) >= cardDeck.scoreCap(p), // แต้มเต็มเพดาน (21) -> ปิดปุ่มจั่ว รอเปิดไพ่เอง
        skillUsed: !!p.skillUsedRound,    // ใช้สกิลไปแล้วในเทิร์นนี้ (1 อันต่อเทิร์น)
        ready: !!p.ready,                 // ห้องรอ: กดพร้อมแล้วหรือยัง
        connected: p.connected !== false,
        alive: p.alive,
        statuses: show ? { ...p.statuses } : publicStatuses(p),
        statusAmt: p.statusAmt || {}, // จำนวน (amount) ของบัฟ/ดีบัฟพื้นฐาน (patch 2.0.8)
        character: {
          id: ch.id,
          // ภาพประจำตัวละคร (ไม่ผูกกับร่าง/แฝดที่กำลังคุมอยู่) — ฉากเปิดตัวตอนแมตช์เริ่มใช้ภาพนี้
          img: (charOver && charOver.img) || ch.cover || ch.img, // ภาพปก (เคท & เอมิลิโกะ) — หน้าสรุป/ฉากเปิดแมตช์
          cover: (charOver && charOver.img) || ch.cover || null, // ภาพปก (ถ้ามี) — หน้าสรุปแต้มใช้แทนรูปบนกระดาน
          name: (charOver && charOver.name) || ch.name, // ฮุค characterPub (ยูนะ: ร้อนแรงดังไฟ = "ยูนะ" + ปกไอดอล)
          // characterPub คืน passive/passive2 ได้ (บานาจ ลิงซ์: ชุดสกิลติดตัวของร่าง)
          passive: charOver && charOver.passive !== undefined ? charOver.passive : ch.passive ? { name: ch.passive.name, desc: ch.passive.desc } : null,
          passive2: charOver && charOver.passive2 !== undefined ? charOver.passive2 : ch.passive2 ? { name: ch.passive2.name, desc: ch.passive2.desc } : null, // สกิลติดตัว 2 (มุยมิ) — ตัวอื่นเป็น null
          passive3: ch.passive3 ? { name: ch.passive3.name, desc: ch.passive3.desc } : null, // สกิลติดตัว 3 (Ice Spike)
          basic: basicPub,
          secondary: secondaryPub,
          ultimate: ultimatePub,
        },
        dmgHp: p.dmgHp, dmgArmor: p.dmgArmor, gainedSkill: p.gainedSkill,
        wasAttacked: p.wasAttacked,
        // กระดาน: ตำแหน่ง + ระยะเดิน (เทิร์นนี้ / ปกติสูงสุด) + ระยะตี — ทุกคนเห็น (ใช้วาดระยะอันตราย)
        pos: unseen ? null : (p.pos || null),
        size: action.sizeOf(p), // ตัวใหญ่ (Echo ขยายร่าง): กิน size×size ช่อง · pos = ช่องมุมบนซ้าย
        smash: action.smashes(p), // ตัวใหญ่ที่เดินพังสิ่งกีดขวางได้ (client คิดระยะเดินให้ตรง server)
        // หมากโปร่งแสง: ศัตรูบางคนมองไม่เห็นคนนี้อยู่ (ส่งเฉพาะผู้ชมที่ยังเห็น — ตัวเอง/เพื่อนร่วมทีม/คนในพุ่มเดียวกัน)
        veiled: !unseen && Visibility.concealed(p),
        sliver: hook && hook.publicState ? hook.publicState(engine, p, viewer) : undefined, // นักบินปริศนา: แขน / ล่องหน
        echo: hook && hook.echoState ? hook.echoState(engine, p) : undefined, // Echo: ขยายร่าง / ราชินี / คูลดาวน์มหึมา
        sora: hook && hook.soraState ? hook.soraState(engine, p) : undefined, // โซระ: ร่าง / อาวุธ / นับเทิร์นฟื้นฟู
        hikaru: hook && hook.hikaruState ? hook.hikaruState(engine, p) : undefined, // ไรโด ฮิคารุ: ร่าง / ปุ่มเลือกร่าง / Brace / คูลดาวน์
        shadow: hook && hook.shadowState ? hook.shadowState(engine, p) : undefined, // เคท & เอมิลิโกะ: อาวุธ / ดาบเขม่า / อยู่ในม่านแดง
        kira: hook && hook.kiraState ? hook.kiraState(engine, p) : undefined, // กิระ: ร่าง / นับเทิร์นร่างกิระ / อัฐิราชา
        yuna: hook && hook.yunaState ? hook.yunaState(engine, p) : undefined, // ยูนะ: เพลง / วง / ไอดอล / เงาของเสียง / ขี่
        gray: hook && hook.grayState ? hook.grayState(engine, p) : undefined, // เกรย์: ศพที่เก็บ / จงบ้าคลั่ง / ชาร์จรองโกมิเนียต (แนวลำแสง)
        gyro: hook && hook.gyroState ? hook.gyroState(engine, p) : undefined, // ไจโร: ลูกเหล็ก (บนพื้น/ในมือ) / สัดส่วนทองคำ / ม้า / เสริมท่าไม้ตาย (GRID_PLAN §7.11 สัญญาข้อมูล)
        diego: hook && hook.diegoState ? hook.diegoState(engine, p, viewer) : undefined, // ดิเอโก้: เล่ห์เหลี่ยม / กระสุน / เดอะเวิลด์ / ม้า / ตาข่าย (เจ้าของเห็น) — GRID_PLAN §7.12
        valentine: hook && hook.valentineState ? hook.valentineState(engine, p) : undefined, // วาเลนไทน์: กระสุน / หลบสายตา / คูลดาวน์ท่าไม้ตาย / กระดานคู่ขนาน (ทุกคนเห็น — GRID_PLAN §7.13)
        fern: hook && hook.fernState ? hook.fernState(engine, p, viewer) : undefined, // เฟิร์น: ซ่อนเร้นมานา / นับ Zoltraak สู่ครั้งเสริมพลัง / เพิ่มระยะ / คูลดาวน์ทุกช่อง — GRID_PLAN §7.14
        celine: hook && hook.celineState ? hook.celineState(engine, p) : undefined, // เซลิน: อาวุธ / ความอ่อนโยนที่เหลือ / คูลดาวน์คฑา / ราชาดอกไม้ — GRID_PLAN §7.15
        ryougi: hook && hook.ryougiState ? hook.ryougiState(engine, p) : undefined, // เรียวกิ: คูลดาวน์หยินหยาง/ท่าไม้ตาย · เนตรมณะ/รากฐานจิต/ซากุระ (เทิร์นที่เหลือ) — GRID_PLAN §7.17
        emiya: hook && hook.emiyaState ? hook.emiyaState(engine, p) : undefined, // ชิโร่: อาวุธ / เทิร์น+ครั้งที่เหลือ / คูลดาวน์ / UBW / ความจุที่เพิ่ม — GRID_PLAN §7.18
        kazuma: hook && hook.kazumaState ? hook.kazumaState(engine, p) : undefined, // คาซุมะ: ร่าง / กองการ์ด / ท่าที่เซ็ต / เลือกได้อีก / ผล Rouze ที่รอตี / METAL — GRID_PLAN §7.19
        law: hook && hook.lawState ? hook.lawState(engine, p) : undefined, // ลอว์: Room / ตีได้อีก / สกิลรองที่เหลือ / คูลดาวน์ / ท่าไม้ตายที่รอตี / Counter Shock — GRID_PLAN §7.20
        strikeZone: hook && hook.strikeZone ? hook.strikeZone(p) || undefined : undefined, // กรอบที่ตีปกติได้ { x0, y0, x1, y1 } (ลอว์: ตัวเองและเป้าต้องอยู่ใน Room)
        ryougiSlain: p.ryougiSlain || undefined, // ถูกเรียวกิสังหารทันที — ศพที่ค้างวาดเป็นกองเลือด (ryougiFx.js)
        takuto: hook && hook.takutoState ? hook.takutoState(engine, p) : undefined, // ทาคุโตะ: ร่าง / ดาบ 2 เล่ม / ดาบแห่งการพิพากษา / พุ่ง / คูลดาวน์ — GRID_PLAN §7.16
        flowerWalk: action.flowerWalk(p) || undefined, // เดินตามช่องดอกไม้ไม่เสียก้าว (ราชาดอกไม้ — Rules.reachable opts.flowerWalk)
        flies: action.flies(p) || undefined, // บินได้ (โล่บินได้ของบานาจ): เดินทะลุแบบ ghost + ไม่ขวางทางใคร
        leash: mine ? action.leashOf(p) || undefined : undefined, // สายจูง { x, y, r }: ช่องที่หยุดได้ต้องห่างจุดนี้ไม่เกิน r
        taunt: (() => { const t = action.tauntOf(p); return t ? [...t] : undefined; })(), // ถูกล่อเป้า: id ตัวล่อที่ต้องเล็ง
        // ปุ่มพิเศษบน HUD (ไม่ใช่ช่องสกิล — ฮุค hudActions) เห็นเจ้าตัว · กด = socket charAction { key } · มี tiles = เลือกช่องก่อน → { key, tile }
        actions: mine ? (() => { // + ปุ่มกระโดดของสนาม Colony (ทุกตัวละคร)
          const own = hook && hook.hudActions ? hook.hudActions(engine, p) || [] : [];
          const cj = Colony.hudAction(p);
          const fd = Fodlan.hudActions(p); // Fodlan: ปุ่มกิมมิกของด่าน (ตกปลา · ขับเรือ · เครื่องยิงหิน · วางคบเพลิง … — key "fd:…")
          const all = [...own, ...(cj ? [cj] : []), ...fd];
          return all.length ? all : undefined;
        })() : undefined,
        //  ระยะเดินเทิร์นนี้หักไพ่แตก −1 → ส่งค่าจริงเฉพาะคนที่เห็นแต้มอยู่แล้ว ไม่งั้นค่า mov บอกใบ้ว่าไพ่แตกตั้งแต่ช่วงจั่ว
        mov: (show || promoShow || teamReveal) ? action.movOf(p) : action.baseMovOf(p),
        baseMov: action.baseMovOf(p), range: action.rangeOf(p),
        strikeRect: action.strikeRect(p) || undefined, // ตีปกติเป็นกรอบ [ลึก, กว้าง] ทางทิศของเป้า (ชิโร่ Nine Lives Blade Works [2, 3])
        laneLen: action.laneLen(p) || undefined, // ความยาวแนวที่ฟันจริง (เรียวกิ 2 — เล็งประชิด โดนคนด้านหลังเป้าด้วย)
        lane: action.lanes(p), // ตีปกติแบบแนวตรง (ไรโด ฮิคารุ): true = แนวยาวตามระยะ (แบล็คคิง) · "face" = ทั้งด้านของตัว (กิงกะ)
        counter: action.counters(p), // ตีสวนได้ไหม (ตอนนี้ไม่มีใคร — เผื่อตัวละครสะท้อน)
      };
      // หยุดเวลา: คนอื่นแสดงเลือด/เกราะ/สถานะเท่าตอนเริ่มหยุด (ดาเมจลงจริงแล้ว — โชว์ตอนเวลาเดินต่อ)
      // ตัวที่เหมือนกัน (วาเลนไทน์): หน้าตา = เป้า (look)
      const look = p.summon && p.summon.look ? match.players[p.summon.look] : null;
      if (look) Object.assign(out, { name: look.name, img: displayImg(look), color: lobby.colorOf(look), character: { ...out.character, name: look.name, img: displayImg(look), cover: null } });
      const held = TimeStop.frozenView(p);
      if (held && !blackout) Object.assign(out, { hp: held.hp, armor: held.armor, shield: held.shield, tempHp: held.tempHp, statuses: show ? { ...held.statuses } : publicStatuses({ ...p, statuses: held.statuses }), statusAmt: held.statusAmt });
      return secret ? unseenPub(out, p) : out;
    }).map((o) => (masked && Duo.sideKey(match.players[o.id]) !== viewerId ? maskPub(o) : o)),
  };
}
// "มืดบอด": หมากของคนอื่นเหลือแค่ตำแหน่ง — สีขาว ไม่มีชื่อ/ภาพ/ตัวเลข
function maskPub(o) {
  return {
    ...o, masked: true, name: "", img: null, color: "#ffffff", teamId: null, position: null,
    hp: null, maxHp: null, armor: null, maxArmor: null, shield: null, skillPoints: -1, score: null, statuses: {}, statusAmt: {},
    character: { ...o.character, name: "", img: null }, duoOf: null, duoWith: null, sora: undefined, hikaru: undefined, echo: undefined, sliver: undefined, shadow: undefined, yuna: undefined, gray: undefined, gyro: undefined, diego: undefined, fern: undefined, valentine: undefined, celine: undefined, emiya: undefined, kazuma: undefined, law: undefined,
  };
}

// ผู้ชมมองไม่เห็นคนนี้ (ล่องหน/พุ่มหญ้า/ม่านแดง — ผู้ใช้ตัดสิน "ข้อมูลอื่นซ่อน"): ค่าที่เปลี่ยนได้ลับๆ ไม่ส่ง
//  (นักบินเปลี่ยนชิ้นส่วนระหว่างล่องหน = เลือด/แต้ม/แขนเปลี่ยน) · ค่าซ่อนเดียวกับ "ตาบอด"/"มืดบอด" ที่ client รับอยู่แล้ว
//  (null = แถบ "???" · skillPoints -1 · ข้อมูลเฉพาะตัวละคร undefined) · ภาพประจำตัวตั้งต้น (ไม่บอกร่าง/ชุด Mark 42)
function unseenPub(o, p) {
  return {
    ...o, img: p.img, hp: null, maxHp: null, armor: null, maxArmor: null, shield: null, tempHp: 0, skillPoints: -1,
    mark42: null, statuses: {}, statusAmt: {}, skillLocks: undefined, iceHurt: undefined,
    muimiEmergencyUses: undefined, muimiEmergencyUsed: undefined,
    sliver: undefined, echo: undefined, sora: undefined, hikaru: undefined, shadow: undefined, yuna: undefined, gray: undefined,
    // ไจโร: ลูกเหล็กบนพื้นยังเห็น (ไม่บอกตำแหน่งเจ้าของ) · ค่าอื่นซ่อน
    gyro: o.gyro ? { balls: o.gyro.balls, hand: null, golden: null, mounted: null, horseHp: null, horseCd: null, empowered: false, ultCd: null } : undefined,
    diego: undefined, celine: undefined, emiya: undefined, kazuma: undefined, law: undefined,
    // เฟิร์น: คนที่มองไม่เห็นไม่รู้อะไรเลย (ไม่บอกว่าซ่อนเร้นอยู่ · ตัวนับ/คูลดาวน์ว่าง)
    fern: o.fern ? { conceal: false, count: null, need: null, empowered: false, boost: false, shieldCd: null, basicCd: null, boostCd: null, concealCd: null } : undefined,
    actions: undefined,
  };
}
// ห่วงเวลาซีโร่: ท่าไม้ตายทุกตัวล็อก (ยกเว้นฮุค zeroImmune · ช่วงมิติพังทลาย) — ต่อท้ายล็อกของตัวละคร (ปุ่มเทา)
function zeroLocks(p, locks) {
  if (!Zero.ultLocked(p)) return locks;
  return { ...(locks || {}), ultimate: { ...((locks && locks.ultimate) || {}), locked: true } };
}
function broadcastState() {
  Colony.normalize(); // Colony: พิกัด x ทุกคนกลับเข้าช่วง 0..15 (กระดานต่อวงรอบ)
  for (const p of Object.values(match.players)) if (!p.duoOf && !p.summon) io.to(p.id).emit("state", buildStateFor(p.id)); // ตัวที่สองของระบบคู่ / ยูนิตที่ถูกเรียก ไม่มี socket
}
function broadcastPositions() {
  const taken = takenUniqueChars();
  for (const [sid, sock] of io.sockets.sockets) {
    sock.emit("positions", lobby.positionsFor(sid));
    sock.emit("takenChars", taken);
  }
}
// ตัวละคร unique ที่มีคนเลือกไปแล้วในแมตช์นี้ (หน้าเลือกตัวละครใช้ปิดการ์ดไม่ให้เลือกซ้ำ)
function takenUniqueChars() {
  return [...new Set(
    Object.values(match.players)
      .filter((p) => (CHAR_BY_ID[p.characterId] || {}).unique)
      .map((p) => p.characterId)
  )];
}
// ผู้ชมมองไม่เห็นทั้งคนตีและเป้าของฉากตีนี้ (ม่านแดงของเคท — สู้กันข้างในคนนอกไม่เห็น)
function attackUnseen(viewer, card) {
  if (!viewer || !card || !card.byId || !card.targetId) return false;
  const by = match.players[card.byId], t = match.players[card.targetId];
  if (!by || !t) return false;
  return Visibility.hiddenFrom(viewer, by) && Visibility.hiddenFrom(viewer, t);
}

// ---------- เอฟเฟกต์บนกระดานที่ผู้ชมบางคนมองไม่เห็น (ม่านแดงของเคท — สู้กันข้างในคนนอกไม่เห็น) ----------
//  ไม่มีม่าน = ส่งทุกคนเหมือนเดิม · มีม่าน = ส่งรายผู้เล่น ตัดเหตุการณ์ที่มีคน/ช่องที่ผู้ชมคนนั้นมองไม่เห็น
const FX_POS_KEYS = ["at", "from", "to", "hitAt", "center"];
const FX_LIST_KEYS = ["path", "tiles"];
const FX_ID_KEYS = ["id", "by", "target"];
function fxHidden(viewer, ev) {
  if (!ev || typeof ev !== "object") return false;
  if (ev.kind === "storm") return false; // ร่ายม่าน — ทุกคนเห็นม่านปิดลง
  for (const k of FX_ID_KEYS) {
    const u = typeof ev[k] === "string" ? match.players[ev[k]] : null;
    if (u && Visibility.hiddenFrom(viewer, u)) return true;
  }
  if (Number.isFinite(ev.x) && Number.isFinite(ev.y) && Soot.tileHiddenFrom(viewer, ev)) return true;
  for (const k of FX_POS_KEYS) if (ev[k] && Soot.tileHiddenFrom(viewer, ev[k])) return true;
  for (const k of FX_LIST_KEYS) if (Array.isArray(ev[k]) && ev[k].some((t) => Soot.tileHiddenFrom(viewer, t))) return true;
  if (ev.carry && fxHidden(viewer, ev.carry)) return true;
  return false;
}
function fxFor(viewer, event, payload) {
  if (event === "iceFx") {
    const events = (payload.events || []).filter((e) => !fxHidden(viewer, e));
    return events.length ? { ...payload, events } : null;
  }
  if (event === "shadowFx" && payload && payload.kind === "stormTick") {
    const hits = (payload.hits || []).filter((h) => !fxHidden(viewer, h));
    return hits.length ? { ...payload, hits } : null;
  }
  return fxHidden(viewer, payload) ? null : payload;
}
function emitBoardFx(event, payload) {
  if (!(Soot.active() || Dim.active()) || (event !== "iceFx" && event !== "shadowFx")) { io.emit(event, payload); return; } // ม่านแดง / ชั้นมิติ = ตัดเหตุการณ์ที่ผู้ชมมองไม่เห็น
  for (const p of Object.values(match.players)) {
    if (p.duoOf || p.summon) continue;
    const out = fxFor(p, event, payload);
    if (out) io.to(p.id).emit(event, out);
  }
}
// ส่งเหตุการณ์ที่มีผู้กระทำ (ป้ายสกิล) — ผู้ชมที่มองไม่เห็นผู้กระทำ (อยู่ในม่านแดงคนละฝั่ง) ไม่ได้รับ
function emitVisible(event, payload, actor) {
  if (!(Soot.active() || Dim.active()) || !actor) { io.emit(event, payload); return; }
  for (const p of Object.values(match.players)) {
    if (p.duoOf || p.summon) continue;
    if (Visibility.hiddenFrom(p, actor)) continue;
    io.to(p.id).emit(event, payload);
  }
}

