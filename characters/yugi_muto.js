// ============================================================
//  ยูกิ มุโต้ — เอาฮา · id "yugi_muto" · สเปกผู้ใช้ 2026-11-23 (GRID_PLAN §7.42)
//
//  ค่าพื้นฐาน: สเปกไม่ระบุ = พลังชีวิต 10 / เกราะ 5 / พลังโจมตี 1 · เดิน 4 · ตีประชิด (ตีปกติได้ตามปกติ)
//  ติดตัว เครื่องรางพันปี: เด็ค 40 ใบ = ชิ้นส่วนเอ็กโซเดีย 5 ใบ (หัว/แขนขวา/แขนซ้าย/ขาขวา/ขาซ้าย) + ไหจอมละโมบ 35 ใบ
//    เริ่มเกมสุ่มขึ้นมือ 5 ใบ · บนมือได้สูงสุด 7 ใบ · ครบ 5 ชิ้นบนมือ = ชนะเกมทันที (แบบยูกิ มาโคโตะ — engine.declareWinner)
//  สกิลพื้นฐาน ดรอว์ / ทิ้งการ์ดบนมือ (1 แต้ม · ปุ่มหลายตัวเลือก): ดรอว์ 1 ใบ หรือทิ้ง 1 ใบที่เลือก (กลับเข้าเด็ค)
//    มือเต็ม 7 = ดรอว์ไม่ได้ ต้องเลือกทิ้งก่อน (ผู้ใช้สั่ง — เลือกเอง ไม่ทิ้งสุ่ม)
//  สกิลรอง ขอเปิดใช้งาน (2 แต้ม · ปุ่มหลายตัวเลือก): เลือกการ์ดบนมือ 1 ใบ
//    ไหจอมละโมบ = ดรอว์ 2 ใบ · ชิ้นส่วนเอ็กโซเดีย = ป้องกันตัว หลบการโจมตีแน่นอน 1 ครั้ง (ภายใน 1 เทิร์น — ฮุค grantedDodge)
//    การ์ดที่ใช้แล้ววนกลับเข้าเด็ค (ผู้ใช้สั่ง)
//  ไม่มีท่าไม้ตาย
//
//  Claude ตัดสินเอง (บอกผู้ใช้แล้ว):
//   · การ์ดที่กลับเข้าเด็คสุ่มตำแหน่งแทรก (สับรวม) · มือเริ่มต้นไม่มีทางได้ครบ 5 ชิ้น (สุ่มใหม่ — ชนะก่อนเริ่มเล่นไม่ได้)
//   · ไหจอมละโมบเปิดใช้ได้เมื่อมือ ≤ 6 (เปิดแล้วเหลือ ≤ 5 + 2 ใบ ไม่เกิน 7)
//   · ป้องกันจากเอ็กโซเดีย: อยู่จนถึงต้นตาเดินถัดไปของยูกิ (กันศัตรูทุกคนได้ครบ 1 รอบ) หรือหลบครบ 1 ครั้ง · ซ้อนไม่ได้
//   · มือ/การ์ดให้เจ้าตัวเห็นเท่านั้น (คนอื่นเห็นแค่จำนวนใบบนมือ)
//   · โหมดทีม: ชนะทั้งทีม (gameOver — forcedWinnerId + winningTeamId)
// ============================================================
const PassiveSeal = require("../server/passiveSeal");

const ID = "yugi_muto";
const DIR = "/characters/yugi_muto";
const HAND_MAX = 7;
const HAND_START = 5;
const GREED_COUNT = 35;
const GREED_DRAW = 2;

const PIECES = ["exodia_head", "exodia_arm_r", "exodia_arm_l", "exodia_leg_r", "exodia_leg_l"];
const CARDS = {
  exodia_head: { name: "เอ็กโซเดีย", img: `${DIR}/exodia_head.webp` },
  exodia_arm_r: { name: "แขนขวาเอ็กโซเดีย", img: `${DIR}/exodia_arm_r.webp` },
  exodia_arm_l: { name: "แขนซ้ายเอ็กโซเดีย", img: `${DIR}/exodia_arm_l.webp` },
  exodia_leg_r: { name: "ขาขวาเอ็กโซเดีย", img: `${DIR}/exodia_leg_r.webp` },
  exodia_leg_l: { name: "ขาซ้ายเอ็กโซเดีย", img: `${DIR}/exodia_leg_l.webp` },
  greed: { name: "ไหจอมละโมบ", img: `${DIR}/greed.webp` },
};
const IMG = {
  base: `${DIR}/yugi.webp`,
  back: `${DIR}/card_back.webp`,
  skill1: `${DIR}/skill1.webp`,
  skill2: `${DIR}/skill2.webp`,
  win: `${DIR}/exodia_win.webp`,
};
const VIDEO = { win: `${DIR}/exodia_boost.mp4` }; // คลิปเอ็กโซเดียตอนครบ 5 ชิ้น (ไฟล์ผู้ใช้ 17.6 วิ · บีบเหลือ ~2 Mbps)
const CUT = { win: "yugiExodia" };                 // characters/_transforms.js
const MUSIC = "yugi_destiny";                      // เพลง destiny (ไฟล์ผู้ใช้) — ชิ้นส่วนเอ็กโซเดียบนมือ 4 ชิ้นขึ้นไป (ผู้ใช้ 2026-11-24)
const MUSIC_AT = 4;
// เสียงการ์ด (สังเคราะห์ — client/src/audio.js) · ดรอว์ที่ทำให้ครบ 5 ชิ้น = เงียบ (คลิปเอ็กโซเดียเล่นแทน — ห้ามเสียงตัดหน้า/ซ้อนวีดีโอ)
const SFX = { draw: "yugi_draw", drop: "yugi_drop", greed: "yugi_greed", guard: "yugi_guard" };

const isYugi = (p) => !!p && p.characterId === ID && !p.summon;
const isPiece = (c) => PIECES.includes(c);

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function newDeck() {
  return shuffle([...PIECES, ...Array.from({ length: GREED_COUNT }, () => "greed")]);
}
const hasExodia = (hand) => PIECES.every((c) => hand.includes(c));
function fresh() {
  const deck = newDeck();
  let hand = deck.splice(0, HAND_START);
  // มือเริ่มต้นครบ 5 ชิ้น (โอกาส 1 ใน ~650,000) = สับใหม่ — ชนะก่อนได้เล่นไม่ได้
  while (hasExodia(hand)) { deck.push(...hand); shuffle(deck); hand = deck.splice(0, HAND_START); }
  return { deck, hand, guard: null, fx: null, fxSeq: 0, won: false, sound: null, destinyAt: 0 };
}
function st(p) { return p.yugi || (p.yugi = fresh()); }

// การ์ดกลับเข้าเด็ค: แทรกตำแหน่งสุ่ม
function toDeck(s, card) {
  s.deck.splice(Math.floor(Math.random() * (s.deck.length + 1)), 0, card);
}
function drawCards(engine, p, n) {
  const s = st(p);
  const got = [];
  for (let i = 0; i < n && s.deck.length && s.hand.length < HAND_MAX; i++) {
    const c = s.deck.shift();
    s.hand.push(c);
    got.push(c);
  }
  return got;
}
// ครบ 5 ชิ้นบนมือ = คลิปเอ็กโซเดีย (exodia_boost) → คลิปจบ: ชนะเกมทันที (ผู้ใช้ 2026-11-24)
//  useSkill เห็นคลิปในคิว → พักตาเดินเล่นคลิป → ผลหลังคลิป (declareWinner) → gameOver ตัดจบ
//  ติด "ลบสกิลติดตัว" (noPassive) = ยังไม่ชนะ — ครบอยู่แล้วชนะตอนดรอว์ครั้งถัดไปหลังหมดผล
function checkWin(engine, p) {
  if (sealed(p) || !hasExodia(st(p).hand)) return false;
  const s = st(p);
  s.won = true;
  s.sound = null;
  engine.log(`🏆 ${p.name} รวมชิ้นส่วนเอ็กโซเดียครบ 5 ชิ้น — เอ็กโซเดีย!`);
  engine.queueCutscene(p, CUT.win);
  engine.deferAfterCutscene(() => engine.declareWinner(p));
  return true;
}
const piecesHeld = (s) => PIECES.filter((c) => s.hand.includes(c)).length;

// ตัวเลือก: "draw" · "drop:<i>" · "play:<i>" (i = ตำแหน่งบนมือ)
function parseForm(form) {
  if (form === "draw") return { kind: "draw" };
  const m = /^(drop|play):(\d+)$/.exec(String(form || ""));
  return m ? { kind: m[1], i: Number(m[2]) } : null;
}
const guardOn = (p) => isYugi(p) && p.alive && !!st(p).guard;
const sealed = (p) => PassiveSeal.sealed(p);

// เหตุการณ์ของมือให้ client เล่นอนิเมชัน (YugiHand): kind draw/drop/play · i = ตำแหน่งที่หยิบออก · drew = จำนวนใบที่ได้
function markFx(p, fx) {
  const s = st(p);
  s.fx = { seq: ++s.fxSeq, ...fx };
}

function canPlay(p, card) {
  const s = st(p);
  if (card === "greed") return s.hand.length <= HAND_MAX - (GREED_DRAW - 1) && s.deck.length > 0;
  return isPiece(card) && !s.guard;
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, MUSIC, MUSIC_AT, CARDS, PIECES, HAND_MAX, HAND_START, GREED_COUNT, GREED_DRAW,
  isYugi, hasExodia,

  resetCombat(p) { if (isYugi(p)) p.yugi = fresh(); },

  // ---------- ปุ่มหลายตัวเลือก ----------
  skillPub(p, tier) {
    if (!isYugi(p)) return null;
    const s = st(p);
    if (tier === "basic") {
      const full = s.hand.length >= HAND_MAX;
      return {
        choices: [
          { key: "draw", name: "ดรอว์", img: IMG.skill1, desc: `ดรอว์การ์ด 1 ใบจากเด็ค (เด็คเหลือ ${s.deck.length} ใบ · บนมือได้สูงสุด ${HAND_MAX} ใบ)`, area: { kind: "self" }, cost: 1, locked: full || !s.deck.length },
          ...s.hand.map((c, i) => ({
            key: `drop:${i}`, name: CARDS[c].name, img: CARDS[c].img, desc: `ทิ้ง ${CARDS[c].name} กลับเข้าเด็ค`, area: { kind: "self" }, cost: 1, locked: false,
          })),
        ],
      };
    }
    if (tier === "secondary") {
      return {
        choices: s.hand.map((c, i) => ({
          key: `play:${i}`, name: CARDS[c].name, img: CARDS[c].img, area: { kind: "self" }, cost: 2,
          desc: c === "greed"
            ? `ไหจอมละโมบ: ดรอว์ ${GREED_DRAW} ใบ (ใช้ได้เมื่อบนมือไม่เกิน ${HAND_MAX - 1} ใบ) · การ์ดกลับเข้าเด็ค`
            : `${CARDS[c].name}: ป้องกันตัว หลบการโจมตีแน่นอน 1 ครั้ง ภายใน 1 เทิร์น · การ์ดกลับเข้าเด็ค`,
          locked: !canPlay(p, c),
        })),
      };
    }
    return null;
  },
  // มือเป็นความลับ — คนอื่นไม่เห็นตัวเลือก (server/view.js)
  privateChoices(p) { return isYugi(p); },

  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isYugi(p)) return true;
    const s = st(p);
    const f = parseForm(opts.form);
    if (!f) return false;
    if (tier === "basic") {
      if (f.kind === "draw") return s.hand.length < HAND_MAX && s.deck.length > 0;
      return f.kind === "drop" && f.i < s.hand.length;
    }
    if (tier === "secondary") return f.kind === "play" && f.i < s.hand.length && canPlay(p, s.hand[f.i]);
    return false;
  },

  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isYugi(p)) return "";
    const s = st(p);
    const f = parseForm(opts.form);
    if (!f) return "";
    if (tier === "basic" && f.kind === "draw") {
      const got = drawCards(engine, p, 1);
      s.sound = SFX.draw;
      markFx(p, { kind: "draw", drew: got.length });
      engine.log(`🃏 ${p.name} ดรอว์การ์ด (บนมือ ${s.hand.length} ใบ)`);
      checkWin(engine, p);
      return "";
    }
    if (tier === "basic" && f.kind === "drop") {
      const [c] = s.hand.splice(f.i, 1);
      toDeck(s, c);
      s.sound = SFX.drop;
      markFx(p, { kind: "drop", i: f.i, card: c });
      engine.log(`🃏 ${p.name} ทิ้งการ์ด 1 ใบกลับเข้าเด็ค (บนมือ ${s.hand.length} ใบ)`);
      return "";
    }
    if (tier === "secondary" && f.kind === "play") {
      const [c] = s.hand.splice(f.i, 1);
      toDeck(s, c);
      if (c === "greed") {
        const got = drawCards(engine, p, GREED_DRAW);
        s.sound = SFX.greed;
        markFx(p, { kind: "play", i: f.i, card: c, drew: got.length });
        engine.log(`🏺 ${p.name} เปิดใช้ไหจอมละโมบ — ดรอว์ ${GREED_DRAW} ใบ (บนมือ ${s.hand.length} ใบ)`);
        checkWin(engine, p);
        return ` — ${CARDS.greed.name}`;
      }
      s.guard = { round: engine.roundNumber, at: engine.severStamp() };
      s.sound = SFX.guard;
      markFx(p, { kind: "play", i: f.i, card: c, drew: 0 });
      engine.log(`🛡️ ${p.name} เปิดใช้${CARDS[c].name} — ป้องกันตัว หลบการโจมตีแน่นอน 1 ครั้ง`);
      return ` — ${CARDS[c].name}`;
    }
    return "";
  },

  // เสียงของการกระทำนั้น (useSkill อ่านหลังลงผล) · ชนะ = ป้ายเอ็กโซเดียของ checkWin แทนป้ายสกิล
  skillSound(p) {
    if (!isYugi(p) || !p.yugi) return null;
    const k = p.yugi.sound;
    p.yugi.sound = null;
    return k;
  },
  silentFlash(p) { return isYugi(p) && !!p.yugi && p.yugi.won; },

  // เพลง destiny: ชิ้นส่วนเอ็กโซเดียบนมือ 4 ชิ้นขึ้นไป (at = ตอนที่ถึง 4 — ใหม่กว่าชนะเพลงอื่น · view.activeSkillMusic)
  skillMusic(engine, p) {
    if (!isYugi(p) || !p.alive || !p.yugi) return null;
    const s = p.yugi;
    if (piecesHeld(s) < MUSIC_AT) { s.destinyAt = 0; return null; }
    if (!s.destinyAt) s.destinyAt = engine.severStamp();
    return { music: MUSIC, at: s.destinyAt };
  },

  // ---------- ป้องกันจากชิ้นส่วนเอ็กโซเดีย (attack.strike / skillDodge) ----------
  grantedDodge(engine, p) {
    if (!guardOn(p)) return null;
    st(p).guard = null;
    engine.log(`🛡️ ${p.name} ป้องกันด้วยชิ้นส่วนเอ็กโซเดีย — หลบได้`);
    return { name: "เอ็กโซเดีย", img: CARDS.exodia_head.img };
  },
  dodgeSure(engine, p) { return guardOn(p); },
  // อยู่ได้ 1 เทิร์น: หมดตอนต้นตาเดินถัดไปของยูกิ (กันศัตรูได้ครบ 1 รอบ)
  onActorStart(engine, p) {
    if (!isYugi(p)) return;
    const s = st(p);
    if (s.guard && s.guard.round < engine.roundNumber) s.guard = null;
  },
  // กันค้าง (ยูกิถูกข้ามตาเดิน/สตั้น): เกิน 1 เทิร์นเต็มแล้วหมด
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isYugi(p) || !p.yugi || !p.yugi.guard) continue;
      if (p.yugi.guard.round < engine.roundNumber) p.yugi.guard = null;
    }
  },
  severables(engine, p) {
    if (!guardOn(p)) return [];
    return [{ key: "yugiGuard", label: "ป้องกันด้วยเอ็กโซเดีย", at: st(p).guard.at || 0, cancel() { st(p).guard = null; } }];
  },

  // ---------- ข้อมูลให้ client (players[].yugi) — มือเห็นเฉพาะเจ้าตัว ----------
  yugiState(engine, p, mine) {
    if (!isYugi(p) || !p.yugi) return null;
    const s = p.yugi;
    if (!mine) return { count: s.hand.length };
    return {
      count: s.hand.length,
      deck: s.deck.length,
      max: HAND_MAX,
      hand: s.hand.map((c) => ({ key: c, name: CARDS[c].name, img: CARDS[c].img })),
      fx: s.fx,
    };
  },
};
