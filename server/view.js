// สร้างสถานะที่ส่งให้ผู้เล่นแต่ละคน + broadcast
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  displayImg, buildStateFor, broadcastState, broadcastPositions, takenUniqueChars,
});

const { CHAR_BY_ID } = require("../characters");
const CHAR_HOOKS = require("../characters/index");
const { SPELLBURDEN_MAX, statusAmtOf, blindActive } = require("../characters/_universal_status");
const Mark42 = require("../characters/_mark42");
const Journey = require("../characters/_journey");
const { io } = require("./app");
const { MAX_PLAYERS, SKILL_COST_MAX, TRANSFORMS } = require("./constants");
const match = require("./match");
const { engine } = require("./engine");
const combat = require("./combat");
const dayNight = require("./dayNight");
const cardDeck = require("./deck");
const action = require("./phases/action");
const lobby = require("./lobby");
const shop = require("./shop");

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
  }
  return best;
}

// แผนที่ที่ client วาด (ค่าคงที่ต่อภูมิภาค — ส่งไปทั้งก้อนเพราะไม่ใหญ่: สิ่งกีดขวาง ~20 ช่อง)
function boardPublic() {
  if (!match.board) return null;
  const m = action.boardMap();
  return { area: match.board.area, cols: m.cols, rows: m.rows, terrain: m.terrain, heal: [...m.heal], spawns: m.spawns, shopSpots: m.shopSpots };
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
  const revealAll = match.gameState !== "PLAYING" && match.gameState !== "LOBBY" && match.gameState !== "TEAM_MODE" && match.gameState !== "TEAM_SETUP";
  const nightNow = dayNight.isNightRound(match.roundNumber);
  const sm = (match.overloadForceActive && match.gameState !== "CUTSCENE")
    ? { music: "overload_force", at: match.overloadForceSeq }
    : activeSkillMusic();
  const viewer = match.players[viewerId];
  // สมุดการ์ดกองกลาง: การ์ดทั้ง 43 ใบตามลำดับคงที่ + ใบไหนถูกจั่วไปแล้วในรอบนี้ (centralDeck สับใหม่ทุกรอบ — สมุดนี้จึงนับเฉพาะรอบปัจจุบัน)
  const remainingCardKeys = new Set(match.centralDeck.map(cardDeck.cardKey));
  const deckLedger = cardDeck.canonicalDeckCards().map((c) => ({ ...c, drawn: !remainingCardKeys.has(cardDeck.cardKey(c)) }));
  return {
    gameState: match.gameState,
    gameMode: match.gameMode,
    teamSize: match.teamSize,
    teamCount: match.teamCount,
    teamOptions: lobby.currentTeamOptions(),
    modeOptions: lobby.modeOptionsFor(),
    modeVotes: lobby.modeVoteSummary(),
    winningTeamId: match.winningTeamId,
    timeLeft: match.timeLeft,
    roundNumber: match.roundNumber,
    overloadForce: match.overloadForceActive,
    deckEmpty: match.centralDeck.length === 0,
    cycle: nightNow ? "night" : "day", // กลางวัน/กลางคืน
    // การเดินทาง (ffa/duo/trio): ภูมิภาค + กลางวัน/กลางคืน + คำอธิบายผลสนาม + ฉากแผนที่ที่กำลังพักเกมรอ
    journey: Journey.publicInfo(engine, match.journeyScene),
    maxPlayers: MAX_PLAYERS,
    youId: viewerId,
    // กระดาน (GRID_PLAN.md): แผนที่ของภูมิภาคปัจจุบัน + ลำดับเดิน + ตาเดินที่กำลังเล่น
    board: boardPublic(),
    turnOrder: match.turnOrder,
    actorId: (match.gameState === "ACTION" || match.gameState === "ATTACKING") ? match.actorId : null,
    action: match.gameState === "ACTION" && match.action ? { from: match.action.from, moved: match.action.moved, locked: match.action.locked, path: match.action.path || null } : null,
    skillMusic: sm ? sm.music : null,
    skillMusicSeq: sm ? sm.at : 0, // เปลี่ยน = การเปิดร่างครั้งใหม่ -> client เริ่มเพลงใหม่
    // onlyFor: คลิปที่เล่นให้เฉพาะบางคนดู — คนนอกลิสต์ได้ null (หน้าจอไม่เล่นวีดีโอ แต่ยังรอครบเวลาเท่ากัน)
    cutscene: (match.gameState === "CUTSCENE" && match.cutsceneInfo && (!match.cutsceneInfo.onlyFor || match.cutsceneInfo.onlyFor.includes(viewerId)))
      ? match.cutsceneInfo : null,
    attack: match.gameState === "ATTACKING" ? match.lastAttack : null,
    log: (match.gameState === "ORDER" || match.gameState === "TRANSITION" || match.gameState === "GAMEOVER") ? match.lastLog : [],
    shop: match.shopItems, // ร้านค้ามายา (patch 2.3): สินค้าส่วนกลางร้านเดียว เห็นเหมือนกันทุกคน
    deckLedger, // สมุดการ์ด 43 ใบ + สถานะจั่วแล้ว/ยัง (ของรอบปัจจุบัน) — กดที่กองการ์ดกลางเพื่อดู
    players: Object.values(match.players).map((p) => {
      const mine = p.id === viewerId;
      const show = mine || revealAll;
      // โหมดทีม (duo/trio): เพื่อนร่วมทีมเห็นแต้มการ์ดกันตลอดเวลา — ศัตรูยังถูกซ่อนตามปกติ
      const teamReveal = !!viewer && lobby.isAlly(viewer, p);
      // "ตาบอด" (สถานะ Universal patch 3.4): ผู้ที่ติดสถานะมองไม่เห็นอะไรเลย (บังเฉพาะผู้ชมคนที่ตาบอด)
      const blackout = !!viewer && blindActive(viewer);
      // "เปิดแต้ม" (promo, สถานะ Universal): แต้มการ์ดของคนติดสถานะถูกเปิดเผยให้ทุกคนเห็น
      const promoShow = (p.statuses.promo || 0) > 0;
      const ch = CHAR_BY_ID[p.characterId] || {};
      const pub = (s) => (s ? { name: s.name, desc: s.desc, cost: s.cost, img: s.img, ammo: s.ammo, area: s.area || { kind: "self" } } : null);
      const basicPub = pub(ch.basic);
      const secondaryPub = pub(ch.secondary);
      const ultimatePub = pub(ch.ultimate);
      // กระแสเวท/ภาระเวท (สถานะ Universal): ราคาที่โชว์บนปุ่มสกิลต้องตรงกับที่ useSkill() คิดจริง — ไม่งั้นจะโชว์ราคาเก่าทับกับผลกลางคืนไม่ถูกต้อง
      const spellflowAmt = statusAmtOf(p, "spellflow");
      const spellburdenAmt = Math.min(SPELLBURDEN_MAX, statusAmtOf(p, "spellburden"));
      // กลางคืน (patch 2.1.7): สุ่มแล้วให้สกิลพื้นฐานหรือสกิลรอง (อย่างใดอย่างหนึ่ง) ใช้แต้มมากขึ้น +1 — ไม่มีผลกับท่าไม้ตาย
      //  ซ้อนกับกระแสเวท/ภาระเวทได้ แต่ตัวปรับขาขึ้นรวมกันแล้วต้องไม่ดันราคาเกิน SKILL_COST_MAX
      //  (สกิลที่ค่าใช้พลังงานถึงเพดานอยู่แล้วจะไม่แพงขึ้นไปอีก — ต้องตรงกับ useSkill() เป๊ะ)
      const showCost = (pub, tierName) => {
        const baseCost = pub.cost;
        return Math.min(
          SKILL_COST_MAX,
          Math.max(0, baseCost - spellflowAmt) + spellburdenAmt + (p.nightTaxTier === tierName ? 1 : 0)
            + Journey.skillTax(engine, baseCost), // การเดินทาง (ป่าไม้ต้องสาป) — ต้องตรงกับ useSkill()
        );
      };
      // ระยะสกิลที่ client วาด: range "mov" แปลงเป็นตัวเลขของผู้เล่นคนนี้
      for (const s of [basicPub, secondaryPub, ultimatePub]) {
        if (s && s.area && s.area.range === "mov") s.area = { ...s.area, range: action.areaRange(p, s.area) };
      }
      if (basicPub) basicPub.cost = showCost(basicPub, "basic");
      if (secondaryPub) secondaryPub.cost = showCost(secondaryPub, "secondary");
      if (ultimatePub) ultimatePub.cost = showCost(ultimatePub, "ultimate");
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        img: displayImg(p),
        position: p.position,
        color: lobby.colorOf(p),
        teamId: p.teamId || null,
        teamConfirmed: !!p.teamConfirmed,
        // คูลดาวน์/ล็อกรายช่องของตัวละคร (โอเบรอน) — client ใช้ทำปุ่มเทา + ตัวเลขคูลดาวน์
        skillLocks: CHAR_HOOKS[p.characterId] && CHAR_HOOKS[p.characterId].skillLocks
          ? CHAR_HOOKS[p.characterId].skillLocks(engine, p) : undefined,
        modeVote: p.modeVote || null,
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
        inventory: mine ? (p.inventory || []) : null, // ของในคลัง — เห็นแค่ของตัวเอง
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
          img: ch.img,
          name: ch.name,
          passive: ch.passive ? { name: ch.passive.name, desc: ch.passive.desc } : null,
          passive2: ch.passive2 ? { name: ch.passive2.name, desc: ch.passive2.desc } : null, // สกิลติดตัว 2 (มุยมิ) — ตัวอื่นเป็น null
          basic: basicPub,
          secondary: secondaryPub,
          ultimate: ultimatePub,
        },
        dmgHp: p.dmgHp, dmgArmor: p.dmgArmor, gainedSkill: p.gainedSkill,
        wasAttacked: p.wasAttacked,
        // กระดาน: ตำแหน่ง + ระยะเดิน (เทิร์นนี้ / ปกติสูงสุด) + ระยะตี — ทุกคนเห็น (ใช้วาดระยะอันตราย)
        pos: p.pos || null,
        mov: action.movOf(p), baseMov: action.baseMovOf(p), range: action.rangeOf(p),
      };
    }),
  };
}

function broadcastState() {
  for (const id of Object.keys(match.players)) io.to(id).emit("state", buildStateFor(id));
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
