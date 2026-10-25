// ============================================================
//  เคนซากิ คาซุมะ (Kamen Rider Blade) — ยาก · id "kensaki_kazuma"
//  กติกาที่ผู้ใช้ตัดสิน GRID_PLAN §7.19 (2026-10-25 — "ใช้ค่าที่แนะนำทุกข้อ") · เอฟเฟกต์ client/src/board/kazumaFx.js
//
//  ค่าพื้นฐาน 7/3/1 · เดิน 4 · ตีประชิด [1, 1]
//  ช่างหัวมันสิ (ติดตัว · ผู้ใช้เพิ่ม 2026-10-25): ร่าง Blade ตีปกติ 1 ครั้ง แต้มสกิล +1 (afterStrike) ·
//    ตีปกติที่ไม่มีผลการ์ดค้าง (ไม่ได้ Rouze — กองการ์ด/ท่าที่ผสมไว้แต่ยังไม่กดไม่นับ) คริ 50% (critPct) · ติดคริ = คลิป "มือเปล่าติดคริ" ก่อนฉากตีทุกครั้ง
//  แปลงร่าง/คืนร่าง (พื้นฐาน · 0 แต้ม · 1 ครั้งต่อเทิร์น · ไม่กินโควตา · กดแล้วยังเดินได้):
//    ร่าง Blade — จบเทิร์นแต้มสกิล +2 (ปกติ +1 · ฮุค skillRegen)
//    ร่างมนุษย์ (ค่าเริ่มต้น) — อยู่ร่างมนุษย์ครบ 3 เทิร์นติดกัน ฟื้นพลังชีวิต 2 (นับจบเทิร์น · แปลงร่าง = นับใหม่)
//  Blay Rouzer (รอง · ปุ่ม 9 การ์ด · ใบละ 2 แต้ม · เฉพาะร่าง Blade · ไม่กินโควตา · กดแล้วยังเดินได้):
//    กองมีได้รวมไม่เกิน 3 ใบ (ผู้ใช้แก้ 2026-10-25 — เดิม 3 ใบต่อเทิร์นแล้วสะสมเกินได้) · ไม่เกิน 3 ชนิด · ใบซ้ำซ้อนผลเป็นเท่า · กองค้างข้ามเทิร์นจนกด Rouze · ยกเลิกการ์ดไม่ได้
//    TACKLE กับ MAGNET อยู่กองเดียวกันไม่ได้ (ผลักออกแล้วดึงกลับหักล้างกัน)
//    ครบสูตรใหม่ = ทับท่าที่เซ็ตไว้ (ครบหลายสูตรพร้อมกัน = สูตรที่ใช้การ์ดมากกว่า) · เสียง: การ์ด → ชื่อท่าที่ผสมได้ (client เล่นต่อคิว)
//  Rouze (ท่าไม้ตาย · 0 แต้ม · กินโควตา · กดแล้วยังเดินได้ · ใช้การ์ดทั้งกอง):
//    ไม่ครบสูตร → การ์ดเสริมตีปกติครั้งถัดไปในตาเดินนี้ (SLASH พลังโจมตี +1 · BEAT ตีกว้าง +2 (1 ใบ = 3) · TACKLE ผลัก 1 ชนเสีย 1 ·
//      KICK ระยะตี +1 · THUNDER ช็อต 1 · MAGNET ดึงเข้าประชิด · TIME ตาเดินถัดไปของเป้า −10 วิ (เหลือไม่ต่ำกว่า 15) ·
//      MACH ระยะเดิน +1 ตาเดินนี้ · METAL กันการโจมตีทั้งก้อน 1 ครั้งจนจบเทิร์น) — ตีแล้วหรือจบตา = หาย
//    Lightning Blast (KICK + THUNDER) → ตีปกติครั้งถัดไปในตาเดินนี้: ระยะ 1–3 · 1 คน · ดาเมจ 2 ตายตัว + ช็อต 2
//    Lightning Slash (SLASH + THUNDER) → ตีปกติครั้งถัดไปในตาเดินนี้: แนว 3×1 โดนทุกคน · ดาเมจ 2 ตายตัว + ช็อต 1
//    Lightning Sonic (KICK + THUNDER + MACH) → ทันที: เลือกทิศ พุ่งไกลสุด 4 ช่อง หยุดหน้าศัตรูคนแรก · ดาเมจ 4 + ช็อต 1 ·
//      ศัตรูกระเด็น 2 ช่อง ชนเสียเพิ่ม 1 · การ์ดที่เกินสูตรไม่เสริมท่า Lightning
//    คลิปท่า Lightning เล่นตอนท่านั้นโดน (Blast/Slash = ก่อนฉากตีปกติที่ไม่หลบ · Sonic = ชนแล้วไม่หลบ → คลิปแล้วผลลง)
//
//  Claude ตัดสินเอง (GRID_PLAN §7.19): คืนร่างมนุษย์ = ผลการ์ดที่ Rouze ค้างไว้หาย (METAL ยังอยู่) · กองการ์ดไม่หายตอนคืนร่าง ·
//    Sonic หลบได้ (ทอยหลบแบบสกิล) · ดาเมจสกิลบวกเปราะบาง/คุ้มครองลดได้ · คริ 50% ใช้ได้ทั้งสองร่าง ·
//    รูปปุ่มท่าไม้ตาย = เฟรมจากคลิปของผู้ใช้
// ============================================================
const Board = require("../server/board");

const ID = "kensaki_kazuma";
const DIR = "/characters/kensaki_kazuma";
const IMG = {
  base: `${DIR}/kazuma.webp`,
  blade: `${DIR}/kazuma_blade.webp`,
  beltOff: `${DIR}/kazuma_belt_off.webp`,
  beltOn: `${DIR}/kazuma_belt_on.webp`,
  card: (k) => `${DIR}/cards/kazuma_card_${k}.webp`,
  ult: (k) => `${DIR}/kazuma_ult_${k}.webp`,
};
const VIDEO = {
  crit: `${DIR}/kazuma_crit.mp4`,
  combo: (k) => `${DIR}/kazuma_lightning_${k}.mp4`,
};
const CUT = { crit: "kazumaCrit", blast: "kazumaBlast", slash: "kazumaSlash", sonic: "kazumaSonic" };
const PASSIVE = "ช่างหัวมันสิ";
const CRIT_PCT = 50;
const FX = "kazumaFx"; // socket event (client/src/board/kazumaFx.js)
const SFX = {
  card: (k) => `kazuma_card_${k}`, // รูดการ์ด → ชื่อการ์ด → รูดการ์ดผ่าน (ไฟล์เดียว · client เล่นต่อคิว)
  open: "kazuma_open",             // เปิดแผงการ์ด (client เล่นเองตอนกดปุ่มสกิลรอง)
  pass: "kazuma_pass",
  combo: (k) => `kazuma_lightning_${k}`,
};

const HP = 7;
const ARMOR = 3;
const MOV = 4;
const CARD_COST = 2;
const MAX_CARDS = 3;      // การ์ดในกองรวมทุกใบ (เต็มแล้วต้อง Rouze ก่อนจึงใส่ใหม่ได้)
const MAX_TYPES = 3;
const BLADE_REGEN = 2;       // จบเทิร์น (ปกติ 1)
const STRIKE_SP = 1;
const HUMAN_TURNS = 3;
const HUMAN_HEAL = 2;
const TIME_CUT = 10;
const TIME_MIN = 15;
const BLAST = { range: [1, 3], dmg: 2, shock: 2 };
const SLASH = { range: [1, 3], dmg: 2, shock: 1 };
const SONIC = { len: 4, dmg: 4, shock: 1, push: 2, crash: 1 };
const METAL_STATUS = "kazumaMetal"; // ป้ายสถานะ (เทิร์นที่เหลือ — ลดเองตอนจบเทิร์น) · ครั้งที่เหลือ = s.metal
// จังหวะพักให้กระดานเล่นเอฟเฟกต์ (ต้องไม่สั้นกว่า KAZUMA_FX ใน client/src/board/kazumaFx.js)
const DASH_STEP = 0.09;
const BEAT = { dashPad: 0.35, sonicHit: 0.7 };

const CARDS = {
  slash: { name: "SLASH", desc: "ตีปกติ พลังโจมตี +1" },
  beat: { name: "BEAT", desc: "ตีปกติกว้างขึ้นข้างละ 1 ช่อง" },
  tackle: { name: "TACKLE", desc: "ตีโดน ผลักเป้า 1 ช่อง · ชนเสียหายเพิ่ม 1" },
  kick: { name: "KICK", desc: "ระยะตี +1" },
  thunder: { name: "THUNDER", desc: "ตีโดน ติดช็อต 1 เทิร์น" },
  metal: { name: "METAL", desc: "กันการโจมตีของศัตรูทั้งก้อน 1 ครั้ง (จนจบเทิร์น)" },
  magnet: { name: "MAGNET", desc: "ตีโดน ดึงเป้าเข้าประชิด" },
  mach: { name: "MACH", desc: "ระยะเดิน +1 ตาเดินนี้" },
  time: { name: "TIME", desc: `ตีโดน ตาเดินถัดไปของเป้าเหลือเวลาน้อยลง ${TIME_CUT} วินาที` },
};
const CARD_KEYS = Object.keys(CARDS);
const EXCLUSIVE = { tackle: "magnet", magnet: "tackle" };
const COMBOS = {
  sonic: { name: "Lightning Sonic", cards: ["kick", "thunder", "mach"], img: IMG.ult("sonic"),
    desc: `เลือกทิศ: พุ่งไกลสุด ${SONIC.len} ช่อง หยุดหน้าศัตรูคนแรก · ความเสียหาย ${SONIC.dmg} (ลดเกราะก่อน · หลบได้) + ช็อต ${SONIC.shock} เทิร์น · ศัตรูกระเด็น ${SONIC.push} ช่อง ชนเสียหายเพิ่ม ${SONIC.crash}` },
  blast: { name: "Lightning Blast", cards: ["kick", "thunder"], img: IMG.ult("blast"),
    desc: `ตีปกติครั้งถัดไปในตาเดินนี้: ระยะ ${BLAST.range[0]}–${BLAST.range[1]} · ความเสียหาย ${BLAST.dmg} ตายตัว + ช็อต ${BLAST.shock} เทิร์น` },
  slash: { name: "Lightning Slash", cards: ["slash", "thunder"], img: IMG.ult("slash"),
    desc: `ตีปกติครั้งถัดไปในตาเดินนี้: แนว ${SLASH.range[1]}×1 โดนทุกคนในแนว · ความเสียหาย ${SLASH.dmg} ตายตัว + ช็อต ${SLASH.shock} เทิร์น` },
};
const COMBO_KEYS = Object.keys(COMBOS);
const LINE = Board.LINE_DIRS;

const isKazuma = (p) => !!p && p.characterId === ID && !p.summon;
// ฮุคที่ไม่ได้รับ engine อ่านเลขเทิร์นจาก engine กลาง (require ตอนเรียก — กันวน)
function eng() { return require("../server/engine").engine; }
function fresh() {
  return {
    blade: false, formAt: 0, formRound: 0, // ร่าง Blade · ลำดับตอนแปลง (severables) · เทิร์นที่กดแปลง/คืนร่างล่าสุด
    humanTurns: 0,                         // จบเทิร์นในร่างมนุษย์ติดกันกี่เทิร์น
    hand: [],                              // กองการ์ด [{ k, n }] ตามลำดับชนิดที่ได้มา
    order: [],                             // การ์ดรายใบตามลำดับที่ใส่ (client วางใบซ้ำเรียงข้างกัน ไม่ซ้อน — ผู้ใช้สั่ง 2026-10-25)
    handAt: 0,
    combo: null, comboAt: 0,               // ท่าที่เซ็ตไว้ (ครบสูตรล่าสุด)
    armed: null,                           // ผลที่ Rouze แล้วรอตีปกติ { kind: "cards"|"blast"|"slash", cards, round, at }
    metal: 0, metalAt: 0, blockKey: null,  // METAL: กันได้อีกกี่ครั้ง · คีย์การโจมตีที่กำลังกัน
  };
}
function st(p) { return p.kazuma || (p.kazuma = fresh()); }
const bladeOn = (p) => isKazuma(p) && !!st(p).blade;
const countOf = (s, k) => { const h = s.hand.find((c) => c.k === k); return h ? h.n : 0; };
const handSize = (s) => s.hand.reduce((a, c) => a + c.n, 0);
const slotsLeft = (s) => Math.max(0, MAX_CARDS - handSize(s));
// ผลที่ Rouze ค้างไว้ของตาเดินนี้ (เทิร์นเดียวกัน · ร่าง Blade)
function armedOf(p) {
  if (!bladeOn(p)) return null;
  const a = st(p).armed;
  return a && a.round === eng().roundNumber ? a : null;
}
const armedCards = (p) => { const a = armedOf(p); return a && a.kind === "cards" ? a.cards : null; };
const cardN = (p, k) => { const c = armedCards(p); return (c && c[k]) || 0; };
const comboArmed = (p) => { const a = armedOf(p); return a && a.kind !== "cards" ? a.kind : null; };

function fx(engine, p, kind, extra) {
  engine.boardFx(FX, { kind, id: p.id, color: engine.colorOf(p), ...(p.pos ? { at: { ...p.pos } } : {}), size: engine.sizeOf(p), ...extra });
}
function attackKey(engine, src) {
  return `${src.id}|${engine.roundNumber}|${engine.actorId || ""}|${engine.commandSeq}`;
}
const vit = (t) => (t.hp || 0) + (t.armor || 0) + (t.shield || 0) + (t.tempHp || 0);
const guardOf = (engine, t) => ((t.statuses && t.statuses.guard) || 0) > 0 ? (engine.statusAmtOf(t, "guard") || 1) : 0;
// ดาเมจจากสกิล: คุ้มครองลด · เปราะบางเพิ่ม · เกราะก่อน · ตายได้ → ที่ลงจริง
function hurt(engine, p, t, n, reason) {
  t.wasAttacked = true;
  const dmg = Math.max(0, n - guardOf(engine, t)) + engine.statusAmtOf(t, "fragile");
  const before = vit(t);
  engine.dealMixed(t, dmg);
  engine.resolveDamageAftermath(t);
  const dealt = Math.max(0, before - vit(t));
  engine.log(`⚡ ${p.name} ${reason} → ${t.name} -${dealt} (ลดเกราะก่อน)`);
  if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
  return dealt;
}
function shock(engine, t, turns) {
  if (!t || !t.alive) return null;
  return engine.applyShock(t, turns) ? `ช็อต ${turns}` : "ช็อต — ต้านได้";
}

// ---------- ร่าง ----------
function setForm(engine, p, blade, why) {
  const s = st(p);
  if (s.blade === blade) return;
  s.blade = blade;
  s.humanTurns = 0;
  if (blade) s.formAt = engine.severStamp();
  else if (s.armed) { s.armed = null; engine.log(`🃏 ผลการ์ดที่ Rouze ไว้ของ ${p.name} หายไป`); }
  if (p.alive && p.pos) fx(engine, p, blade ? "henshin" : "unhenshin", { why });
  engine.log(blade ? `🪲 ${p.name} Turn Up — แปลงร่างเป็น Kamen Rider Blade` : `🔙 ${p.name} ${why === "sever" ? "ถูกตัดร่าง — " : ""}คืนร่างมนุษย์`);
}

// ---------- Blay Rouzer ----------
// สูตรที่ครบด้วยกองนี้
const satisfied = (s) => COMBO_KEYS.filter((k) => COMBOS[k].cards.every((c) => countOf(s, c) > 0));
// การ์ดใบนี้เลือกได้ไหม (ไม่สนแต้ม/ตาเดิน) → null = ได้ · สตริง = เหตุผล (log/ทดสอบ)
function cardBlock(p, k, round) {
  const s = st(p);
  if (!CARDS[k]) return "card";
  if (!s.blade) return "human";
  if (slotsLeft(s) <= 0) return "full";
  if (!countOf(s, k) && s.hand.length >= MAX_TYPES) return "types";
  if (EXCLUSIVE[k] && countOf(s, EXCLUSIVE[k]) > 0) return "exclusive";
  return null;
}
function pickCard(engine, p, k) {
  const s = st(p);
  const had = new Set(satisfied(s));
  const cur = s.hand.find((c) => c.k === k);
  if (cur) cur.n += 1; else s.hand.push({ k, n: 1 });
  s.order.push(k);
  if (handSize(s) === 1) s.handAt = engine.severStamp();
  // ครบสูตรใหม่ = ทับท่าที่เซ็ตไว้ · ครบหลายสูตรพร้อมกัน = สูตรที่ใช้การ์ดมากกว่า
  const fresh = satisfied(s).filter((c) => !had.has(c)).sort((a, b) => COMBOS[b].cards.length - COMBOS[a].cards.length);
  if (fresh.length) {
    s.combo = fresh[0];
    s.comboAt = engine.severStamp();
    engine.log(`⚡ ${p.name} ผสมการ์ดได้ ${COMBOS[s.combo].name}`);
  }
  fx(engine, p, "card", { card: k, combo: fresh.length ? s.combo : null });
  // เสียง: รูดการ์ด → ชื่อการ์ด → รูดผ่าน แล้วชื่อท่าที่ผสมได้ (client เล่นต่อคิว — audio.js SFX_QUEUED)
  engine.sfx(SFX.card(k));
  if (fresh.length) engine.sfx(SFX.combo(s.combo));
  engine.log(`🃏 ${p.name} Blay Rouzer — ${CARDS[k].name} (${countOf(s, k)} ใบ)`);
}
function clearHand(s) {
  s.hand = [];
  s.order = [];
  s.combo = null;
  s.handAt = 0;
  s.comboAt = 0;
}

// ---------- Rouze ----------
function rouze(engine, p, targets, opts) {
  const s = st(p), r = engine.roundNumber;
  const combo = s.combo;
  const cards = Object.fromEntries(s.hand.map((c) => [c.k, c.n]));
  clearHand(s);
  if (combo === "sonic") {
    s.armed = null;
    sonic(engine, p, opts.dir, targets);
    return ` — ${COMBOS.sonic.name}`;
  }
  if (combo) {
    s.armed = { kind: combo, round: r, at: engine.severStamp() };
    fx(engine, p, "rouze", { combo });
    engine.log(`⚡ ${p.name} ${COMBOS[combo].name} — ตีปกติครั้งถัดไปเป็นท่านี้`);
    return ` — ${COMBOS[combo].name}`;
  }
  // METAL ลงทันที (อยู่จนจบเทิร์น) · ที่เหลือรอตีปกติ
  if (cards.metal) {
    s.metal = cards.metal;
    s.metalAt = engine.severStamp();
    p.statuses[METAL_STATUS] = 1;
    engine.log(`🛡️ ${p.name} METAL — กันการโจมตีได้ ${cards.metal} ครั้งจนจบเทิร์น`);
  }
  const rest = { ...cards };
  delete rest.metal;
  s.armed = Object.keys(rest).length ? { kind: "cards", cards: rest, round: r, at: engine.severStamp() } : null;
  fx(engine, p, "rouze", { cards });
  const names = Object.entries(cards).map(([k, n]) => `${CARDS[k].name}${n > 1 ? ` ×${n}` : ""}`).join(" · ");
  engine.log(`🃏 ${p.name} Rouze — ${names}`);
  return "";
}

// ---------- Lightning Sonic ----------
//  ไล่ช่องตามแนว: สิ่งกีดขวาง/ร้านค้า/เพื่อน = หยุดก่อนถึง · ศัตรู = ชน (หลบพ้น = หยุดหน้าเป้า ไม่โดน)
function planSonic(engine, p, dir) {
  const tiles = engine.chargeTiles(p, dir, SONIC.len);
  const passed = [];
  let hit = null, stopAt = null;
  for (const t of tiles) {
    if (t.obstacle || t.shop) break;
    const o = t.unitId ? engine.players[t.unitId] : null;
    if (o) {
      if (o.alive && !engine.sameTeam(p, o)) { hit = o; stopAt = t; }
      break;
    }
    passed.push(t);
  }
  return { passed, hit, stopAt };
}
function sonic(engine, p, dir, targets) {
  if (!p.alive || !p.pos || !LINE[dir]) return;
  const start = { ...p.pos };
  const { passed, hit, stopAt } = planSonic(engine, p, dir);
  const path = [start, ...passed.map((t) => ({ x: t.x, y: t.y }))];
  const land = path[path.length - 1];
  p.pos = { x: land.x, y: land.y };
  engine.setDash({ id: p.id, path, dir: { x: LINE[dir][0], y: LINE[dir][1] } });
  fx(engine, p, "sonicDash", { from: start, path, dir });
  engine.skillBeat(Math.max(0, path.length - 1) * DASH_STEP + BEAT.dashPad, () => {
    if (!p.alive) return;
    const crossed = stopAt ? [...passed, stopAt] : passed;
    require("../server/skills").hitArea(p, crossed, hit ? [hit.id] : []);
    if (!hit || !hit.alive || !hit.pos) { engine.log(`⚡ ${p.name} Lightning Sonic — ไม่โดนใคร`); return; }
    hit.wasAttacked = true;
    if (engine.skillDodge(p, hit, COMBOS.sonic.name)) {
      fx(engine, p, "sonicHit", { targetId: hit.id, to: { ...hit.pos }, dodge: true });
      return;
    }
    // โดน = คลิป Lightning Sonic แล้วผลลง
    engine.queueCutscene(p, CUT.sonic);
    engine.deferAfterCutscene(() => {
      if (!p.alive || !hit.alive || !hit.pos) return;
      const dealt = hurt(engine, p, hit, SONIC.dmg, COMBOS.sonic.name);
      const sh = hit.alive ? shock(engine, hit, SONIC.shock) : null;
      if (sh) engine.log(`⚡ ${hit.name} ${sh}`);
      fx(engine, p, "sonicHit", { targetId: hit.id, to: hit.pos ? { ...hit.pos } : { x: stopAt.x, y: stopAt.y }, dmg: dealt });
      engine.skillBeat(BEAT.sonicHit, () => {
        if (!hit.alive || !hit.pos) return;
        const hold = pushTarget(engine, p, hit, { x: LINE[dir][0], y: LINE[dir][1] }, SONIC.push, SONIC.crash, COMBOS.sonic.name);
        if (hold > 0) engine.skillBeat(hold, () => {});
      });
    });
  });
}

// ---------- ผลัก / ดึง ----------
function awayDir(engine, from, t) {
  const n = engine.sizeOf(t);
  const cx = t.pos.x + (n - 1) / 2 - from.x, cy = t.pos.y + (n - 1) / 2 - from.y;
  if (Math.abs(cy) >= Math.abs(cx) && cy !== 0) return { x: 0, y: Math.sign(cy) };
  if (cx !== 0) return { x: Math.sign(cx), y: 0 };
  return { x: 0, y: 1 };
}
// ผลัก n ช่อง (engine.ice.pushUnit) · ชนสิ่งกีดขวาง/ขอบ/คน = เสียเพิ่ม crash (ลดเกราะก่อน) → วินาทีที่ต้องพักให้ภาพจบ
function pushTarget(engine, p, t, dir, n, crash, reason) {
  if (!t || !t.alive || !t.pos) return 0;
  const ctx = engine.ice.begin();
  engine.withEffectSource(p, () => engine.ice.pushUnit(t, dir, ctx, n));
  const hit = ctx.events.some((e) => e.kind === "knock" && e.id === t.id && e.collide);
  if (hit && crash > 0 && t.alive) {
    const at = t.pos ? { ...t.pos } : null;
    const before = vit(t);
    t.wasAttacked = true;
    engine.withEffectSource(p, () => { engine.dealMixed(t, crash); engine.resolveDamageAftermath(t); });
    const dealt = Math.max(0, before - vit(t));
    if (at) ctx.events.push({ kind: "crash", id: t.id, x: at.x, y: at.y, dmg: dealt, kill: !t.alive });
    engine.log(`💢 ${t.name} ถูก ${reason} กระแทกชน -${dealt} (ลดเกราะก่อน)`);
    if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
  }
  engine.ice.flush(ctx);
  return engine.ice.fxSeconds(ctx);
}
// MAGNET: ดึงเป้าเข้าช่องติดตัวที่ใกล้เป้าสุดซึ่งว่าง (แบบปืนของโซระ) · ตัวใหญ่ดึงไม่ได้
function pullTarget(engine, p, t) {
  if (!p.alive || !p.pos || !t.alive || !t.pos || engine.sizeOf(t) > 1) return 0;
  const dist = Math.abs(t.pos.x - p.pos.x) + Math.abs(t.pos.y - p.pos.y);
  if (dist <= 1) return 0;
  const spots = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([dx, dy]) => ({ x: p.pos.x + dx, y: p.pos.y + dy }))
    .filter((c) => Math.abs(t.pos.x - c.x) + Math.abs(t.pos.y - c.y) < dist)
    .sort((a, b) => (Math.abs(t.pos.x - a.x) + Math.abs(t.pos.y - a.y)) - (Math.abs(t.pos.x - b.x) + Math.abs(t.pos.y - b.y)));
  const to = spots.find((c) => engine.tileFree(c.x, c.y, t.id));
  if (!to) { engine.log(`🧲 ${p.name} ดึง ${t.name} ไม่ได้ — ช่องข้างตัวไม่ว่าง`); return 0; }
  const from = { ...t.pos };
  engine.ice.revealPushed(t);
  t.pos = { x: to.x, y: to.y };
  engine.log(`🧲 ${p.name} MAGNET — ดึง ${t.name} เข้าประชิด`);
  // ดึงลงน้ำแข็ง = ไถลต่อตามทิศที่ถูกดึง (แบบปืนดึงของโซระ)
  engine.ice.forcedSlides([{ id: t.id, from, to: { ...t.pos }, dir: { x: Math.sign(to.x - from.x), y: Math.sign(to.y - from.y) } }], p);
  return 0.5;
}

// ---------- ป้าย/ข้อมูลปุ่ม ----------
function cardChoices(p, round) {
  const s = st(p);
  return CARD_KEYS.map((k) => {
    const c = CARDS[k];
    return {
      key: k, name: c.name, img: IMG.card(k), cost: CARD_COST, area: { kind: "self" }, free: true,
      count: countOf(s, k), locked: !!cardBlock(p, k, round),
      desc: `${c.name} (${CARD_COST} แต้ม): ${c.desc}`,
    };
  });
}
function rouzeDesc(s) {
  if (s.combo) return `${COMBOS[s.combo].name}: ${COMBOS[s.combo].desc}`;
  if (!s.hand.length) return "ใช้การ์ดทั้งกองใน Blay Rouzer";
  return s.hand.map((c) => `${CARDS[c.k].name}${c.n > 1 ? ` ×${c.n}` : ""}`).join(" · ");
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, PASSIVE, CRIT_PCT, FX, SFX, CARDS, CARD_KEYS, COMBOS, COMBO_KEYS, HP, ARMOR, MOV, CARD_COST, MAX_CARDS, MAX_TYPES, BLADE_REGEN, STRIKE_SP,
  HUMAN_TURNS, HUMAN_HEAL, TIME_CUT, TIME_MIN, BLAST, SLASH, SONIC, METAL_STATUS,
  isKazuma, bladeOn, planSonic,

  resetCombat(p) {
    p.kazumaTimeCut = 0; // TIME: วินาทีที่ตาเดินถัดไปของคนนี้ถูกหัก (ใครก็ติดได้)
    p.kazuma = isKazuma(p) ? fresh() : null;
  },
  maxHp() { return HP; },
  maxArmor() { return ARMOR; },
  displayImg(p) { return bladeOn(p) ? IMG.blade : null; },
  characterPub(engine, p) { return bladeOn(p) ? { name: "Kamen Rider Blade", img: IMG.blade } : null; },
  skillRegen(p) { return bladeOn(p) ? BLADE_REGEN : 1; },

  // ---------- เดิน / ตีปกติ (ผลจาก Rouze) ----------
  mov(p) { return isKazuma(p) ? MOV + cardN(p, "mach") : null; },
  range(p) {
    const c = comboArmed(p);
    if (c === "blast") return BLAST.range;
    if (c === "slash") return SLASH.range;
    const k = cardN(p, "kick");
    return k ? [1, 1 + k] : null;
  },
  attackLane(p) { return comboArmed(p) === "slash"; },
  strikeRect(p) {
    const b = cardN(p, "beat");
    return b ? [1 + cardN(p, "kick"), 1 + 2 * b] : null;
  },
  damageBonus(engine, attacker) { return cardN(attacker, "slash"); },
  fixedStrikeDamage(engine, attacker) {
    const c = comboArmed(attacker);
    return c === "blast" ? BLAST.dmg : c === "slash" ? SLASH.dmg : null;
  },
  attackFxNames(attacker) {
    const c = comboArmed(attacker);
    if (c) return [COMBOS[c].name];
    const n = cardN(attacker, "slash");
    return n ? [`SLASH +${n}`] : [];
  },
  attackStyle(p) {
    const c = comboArmed(p);
    return c === "blast" ? "kazumaBlast" : c === "slash" ? "kazumaSlash" : null;
  },
  // ช่างหัวมันสิ: ตีปกติที่ไม่มีผลการ์ดค้าง คริ 50% (ทั้งสองร่าง)
  critPct(p) { return isKazuma(p) && !armedOf(p) ? CRIT_PCT : 0; },
  // คลิปก่อนฉากตี: ท่า Lightning ที่โดน (ไม่หลบ — Slash: คนไหนในแนวโดนก็นับ) · ไม่มีผลการ์ด + ติดคริ = "มือเปล่าติดคริ"
  preAttackClip(engine, attacker, card) {
    if (!isKazuma(attacker) || !card) return null;
    const c = comboArmed(attacker);
    if (c) return !card.dodge || (card.extra || []).some((e) => !e.dodge) ? CUT[c] : null;
    if (armedOf(attacker)) return null;
    return card.crit || (card.extra || []).some((e) => e.crit) ? CUT.crit : null;
  },
  onStrikeLanded(engine, attacker, target) {
    if (!armedOf(attacker) || !target || !target.alive || engine.sameTeam(attacker, target)) return [];
    const out = [];
    const c = comboArmed(attacker);
    const th = c === "blast" ? BLAST.shock : c === "slash" ? SLASH.shock : cardN(attacker, "thunder");
    if (th > 0) { const sh = shock(engine, target, th); if (sh) out.push(sh); }
    const tm = cardN(attacker, "time");
    if (tm > 0) {
      target.kazumaTimeCut = (target.kazumaTimeCut || 0) + TIME_CUT * tm;
      out.push(`TIME −${TIME_CUT * tm} วิ`);
    }
    return out;
  },
  // ตีจบ (เป้าหลักยังรอด · ไม่หลบ): TACKLE ผลัก / MAGNET ดึง — ก่อนจบตา
  afterBoardAttack(engine, attacker, target, res) {
    if (!armedCards(attacker) || !res || res.dodge || !target || !target.alive) return null;
    const tk = cardN(attacker, "tackle"), mg = cardN(attacker, "magnet");
    if (!tk && !mg) return null;
    return () => {
      if (!attacker.alive || !target.alive || !target.pos || !attacker.pos) return 0;
      if (tk) return pushTarget(engine, attacker, target, awayDir(engine, attacker.pos, target), tk, 1, "TACKLE");
      return pullTarget(engine, attacker, target);
    };
  },
  // ตีจบทุกแบบ: ผลการ์ดใช้แล้ว · ร่าง Blade แต้มสกิล +1
  afterStrike(engine, p) {
    if (!isKazuma(p)) return;
    const s = st(p);
    if (s.armed) s.armed = null;
    if (!s.blade) return;
    const before = p.skillPoints || 0;
    engine.addSkill(p, STRIKE_SP, "kazuma");
    if ((p.skillPoints || 0) > before) engine.log(`🪲 ${p.name} Blade — ตีปกติ แต้มสกิล +${STRIKE_SP}`);
  },
  // จบตาเดินโดยไม่ได้ตี = ผลการ์ดที่ Rouze ไว้หาย
  onActorEnd(engine, p) {
    if (!isKazuma(p)) return;
    const s = st(p);
    if (s.armed) { s.armed = null; engine.log(`🃏 ผลการ์ดที่ Rouze ไว้ของ ${p.name} หายไป`); }
  },

  // ---------- METAL ----------
  onAttacked(engine, p, attacker) {
    if (!isKazuma(p) || !p.alive) return;
    const s = st(p), key = attackKey(engine, attacker);
    if (s.blockKey === key || !(s.metal > 0) || !((p.statuses[METAL_STATUS] || 0) > 0)) return;
    s.blockKey = key;
    s.metal -= 1;
    if (s.metal <= 0) delete p.statuses[METAL_STATUS];
    fx(engine, p, "metal", {});
    engine.log(`🛡️ ${p.name} METAL — กันการโจมตีของ ${attacker.name}`);
  },
  blocksAttack(engine, p, attacker) {
    if (!isKazuma(p) || st(p).blockKey !== attackKey(engine, attacker)) return null;
    return { name: "METAL", img: IMG.card("metal") };
  },

  // ---------- TIME: หักเวลาตาเดินถัดไปของใครก็ได้ (server/phases/action.js nextActor — ฮุค broadcast turnSeconds) ----------
  turnSeconds(engine, u, secs) {
    const cut = u && u.kazumaTimeCut;
    if (!(cut > 0)) return secs;
    u.kazumaTimeCut = 0;
    const left = Math.max(TIME_MIN, secs - cut);
    if (left < secs) engine.log(`⏱️ ${u.name} TIME — เวลาตาเดินเหลือ ${left} วินาที`);
    return Math.min(secs, left);
  },

  // ---------- สกิล ----------
  skillCost(p, tier, base) {
    if (!isKazuma(p)) return base;
    return tier === "secondary" ? CARD_COST : tier === "ultimate" ? 0 : base;
  },
  skillArea(p, tier, area) {
    if (!isKazuma(p) || tier !== "ultimate") return area;
    return st(p).combo === "sonic" ? { kind: "line", len: SONIC.len, width: 1, hostile: true } : { kind: "self" };
  },
  skillPub(p, tier) {
    if (!isKazuma(p)) return null;
    const engine = eng(), s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      return s.blade
        ? { name: "คืนร่าง", img: IMG.beltOn, desc: "กลับเป็นร่างมนุษย์", flash: true }
        : { name: "แปลงร่าง", img: IMG.beltOff, desc: "เปลี่ยนร่างเป็น Kamen Rider Blade", flash: true };
    }
    if (tier === "secondary") return { choices: cardChoices(p, r) };
    if (tier === "ultimate") {
      const c = s.combo ? COMBOS[s.combo] : null;
      return { name: c ? c.name : "Rouze", img: c ? c.img : IMG.beltOn, desc: rouzeDesc(s), flash: true };
    }
    return null;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isKazuma(p)) return true;
    const s = st(p), r = engine.roundNumber;
    if (!p.pos) return false;
    if (tier === "basic") return s.formRound !== r;
    if (tier === "secondary") return !cardBlock(p, opts.form, r);
    if (tier === "ultimate") {
      if (!s.blade || !s.hand.length) return false;
      if (s.combo === "sonic") return !!LINE[opts.dir];
      return true;
    }
    return false;
  },
  // แปลงร่าง + เลือกการ์ด: ไม่กินโควตา · Rouze: กินโควตา · ทุกปุ่มกดแล้วยังเดินได้ (MACH ใช้ระยะเดินที่เพิ่มได้)
  skipsTurnQuota(p, tier) { return isKazuma(p) && (tier === "basic" || tier === "secondary"); },
  ignoresTurnQuota(p, tier) { return isKazuma(p) && (tier === "basic" || tier === "secondary"); },
  keepsMove(engine, p) { return isKazuma(p); },
  // Lightning Sonic: แนว 4×1 โดนจริงแค่ช่องที่พุ่งผ่าน + คนแรก — ลงผลพื้นที่เองตอนชน (hitArea)
  ownsAreaHit(p, tier) { return isKazuma(p) && tier === "ultimate" && st(p).combo === "sonic"; },
  skillSound(p, tier, opts = {}) {
    if (!isKazuma(p)) return null;
    // การ์ด: เสียงส่งเองใน pickCard (ต่อด้วยชื่อท่าที่ผสมได้) · Rouze: รูดผ่าน
    if (tier === "ultimate") return SFX.pass;
    return null;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isKazuma(p)) return "";
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      s.formRound = r;
      setForm(engine, p, !s.blade, "skill");
      return "";
    }
    if (tier === "secondary") {
      pickCard(engine, p, opts.form);
      return ` — ${CARDS[opts.form].name}`;
    }
    if (tier === "ultimate") return rouze(engine, p, [...(targets || [])], opts);
    return "";
  },

  // ---------- จังหวะเทิร์น ----------
  // ร่างมนุษย์: จบเทิร์นครบ 3 เทิร์นติดกัน = ฟื้นพลังชีวิต 2 · METAL ที่ไม่ได้ใช้หมดพร้อมป้าย (ลูปลดเทิร์นกลาง)
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isKazuma(p)) continue;
      const s = st(p);
      if (!((p.statuses[METAL_STATUS] || 0) > 0)) s.metal = 0;
      if (!p.alive || s.blade) continue;
      s.humanTurns += 1;
      if (s.humanTurns < HUMAN_TURNS) continue;
      s.humanTurns = 0;
      const got = engine.healHp(p, HUMAN_HEAL);
      if (p.pos) fx(engine, p, "heal", { amount: got });
      engine.log(`💚 ${p.name} ร่างมนุษย์ครบ ${HUMAN_TURNS} เทิร์น — ฟื้นพลังชีวิต ${got}`);
    }
  },
  onDeath(engine, p) {
    if (!isKazuma(p)) return;
    const s = st(p);
    s.armed = null;
    s.metal = 0;
  },

  // ---------- ผลสกิลที่ตัดได้ (server/sever.js — รากฐานจิตของเรียวกิ) ----------
  //  ร่าง Blade → คืนร่างมนุษย์ · กองการ์ด → ทิ้งทั้งกอง (ไม่คืนแต้ม) · ผล Rouze ที่รอตี → หาย · METAL → หาย
  severables(engine, p) {
    if (!isKazuma(p) || !p.alive) return [];
    const s = st(p), out = [];
    if (s.blade) out.push({ key: "blade", label: "Kamen Rider Blade", at: s.formAt, cancel: () => setForm(engine, p, false, "sever") });
    if (s.hand.length) {
      out.push({ key: "hand", label: s.combo ? COMBOS[s.combo].name : "Blay Rouzer", at: Math.max(s.handAt, s.comboAt),
        cancel: () => { clearHand(s); engine.log(`🃏 การ์ดใน Blay Rouzer ของ ${p.name} ถูกตัดทิ้ง`); } });
    }
    if (armedOf(p)) {
      const a = st(p).armed;
      out.push({ key: "armed", label: a.kind === "cards" ? "Rouze" : COMBOS[a.kind].name, at: a.at, cancel: () => { s.armed = null; } });
    }
    if (s.metal > 0 && (p.statuses[METAL_STATUS] || 0) > 0) {
      out.push({ key: "metal", label: "METAL", at: s.metalAt, cancel: () => { s.metal = 0; delete p.statuses[METAL_STATUS]; } });
    }
    return out;
  },

  // ---------- ข้อมูลให้ client ----------
  kazumaState(engine, p) {
    if (!isKazuma(p)) return undefined;
    const s = st(p), r = engine.roundNumber, a = armedOf(p);
    return {
      blade: s.blade, formUsed: s.formRound === r, humanTurns: s.humanTurns, humanNeed: HUMAN_TURNS,
      hand: s.hand.map((c) => ({ k: c.k, n: c.n })), cards: s.order.slice(), maxCards: MAX_CARDS,
      combo: s.combo, picksLeft: slotsLeft(s), maxTypes: MAX_TYPES,
      armed: a ? { kind: a.kind, cards: a.cards || null } : null, metal: (p.statuses[METAL_STATUS] || 0) > 0 ? s.metal : 0,
    };
  },
  skillLocks(engine, p) {
    if (!isKazuma(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      basic: { locked: s.formRound === r, free: true },
      secondary: { locked: !s.blade || slotsLeft(s) <= 0, free: true },
      ultimate: { locked: !s.blade || !s.hand.length },
    };
  },
};
