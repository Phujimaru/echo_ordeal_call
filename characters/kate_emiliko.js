// ============================================================
//  เคท & เอมิลิโกะ (Shadows House) — ระดับยาก · id "kate" (ผู้เล่นเลือก) + "emiliko" (ตัวที่สอง — server/duo.js)
//  สเปกที่ผู้ใช้ตัดสิน 2026-10-13: memory kate-emiliko-spec · .claude/plans/kate-emiliko.md
//
//  ทั้งคู่: พลังชีวิต 3 เกราะ 2 · แต้มสกิลสูงสุด 16 ใช้ร่วมกัน ฟื้นเทิร์นละ 2 · ตีประชิด
//  พื้นฐาน กระจกเงา (0): สลับตัวที่คุม (ไม่จำกัด · ไม่กินโควตา · ไม่ล็อกการเดิน · กดได้ระหว่างเดินต่อของเอมิลิโกะ)
//    อีกตัวล้ม → ปุ่มเป็น ตื่นขึ้นอีกครั้ง (6): ร่างอยู่ในระยะ 4 → ฟื้นคืนชีพที่ร่าง พลังชีวิต 3 (เกราะ 0) · ไม่จำกัดครั้ง
//      ตัวที่ฟื้นยังขยับไม่ได้ในตานี้ (Claude ตัดสิน)
//  เอมิลิโกะ: เดิน 3 (ในระบำเขม่า 4) · รอง = เลือกอาวุธ (0 · ไม่กินโควตา · ไม่ล็อกการเดิน) — ไม้ถูพื้น (เริ่มต้น) / แจกัน / เครื่องดูดฝุ่น / ดาบเขม่า (ได้จากเคท)
//    ติดตัว กำลังใจเต็มเปี่ยม: ตี/รอแล้วเดินต่อได้ 2 (ฮุค cantoMov — phases/action.js)
//    แจกัน: ระยะตี 4 · น้ำสาดเปียกถึงเป้า · สลับอาวุธได้ระหว่างเดินต่อ → ถือไม้ถูพื้นไถลชนซ้ำ (ผู้ใช้สั่ง 2026-10-27)
//    ท่าไม้ตาย ร่าเริงสุดๆ (6): แนว 4×3 ตามอาวุธ
//  เคท: เดิน 4 (ในระบำเขม่า 6) · รอง = เลือกใช้ แส้เขม่า (2) / ดาบเขม่า (0 · ถือ/ให้/เรียกคืน) / ปีกเขม่า (4)
//    ท่าไม้ตาย ระบำเขม่า (6 · คูลดาวน์ 5 เทิร์น ผู้ใช้สั่ง 2026-10-27): พายุ 8×8 3 เทิร์น · ติดตัว: ในพายุเดิน 6 + ตีปกติทำให้เป้ามืดบอด 1 เทิร์น
// ============================================================

const Board = require("../server/board");
const Duo = require("../server/duo");
const KC = require("./kate_emiliko_combat"); // ส่วนการต่อสู้ (อาวุธ / แส้ / ปีก / ม่านแดง / ท่าไม้ตาย)

const KATE = "kate";
const EMI = "emiliko";
const DIR = "/characters/kate_emiliko";
const IMG = {
  kate: `${DIR}/kate.webp`,
  emiliko: `${DIR}/emiliko.webp`,
  mirror: `${DIR}/mirror.jpg`,
  revive: `${DIR}/revive.jpg`,
  soot: `${DIR}/whip.jpg`,
  whip: `${DIR}/whip.jpg`,
  sword: `${DIR}/sword.png`,
  wings: `${DIR}/wings.jpg`,
  storm: `${DIR}/storm.avif`,
  tools: `${DIR}/tools.jpg`,
  mop: `${DIR}/mop.jpg`,
  vase: `${DIR}/vase.jpg`,
  vacuum: `${DIR}/vacuum.jpg`,
  cheer: `${DIR}/cheer.jpg`,
  bread: `${DIR}/bread.jpg`,
  cover: `${DIR}/cover.jpg`,
};
// เพลงท่าไม้ตายเคท (ระบำเขม่า — intro → loop จนพายุหมด) อยู่ที่ client/src/audio.js (MUSIC_SEQUENCES.kate_storm)

const MAX_HP = 3;
const MAX_ARMOR = 2;
const MAX_SKILL = 16;
const SKILL_REGEN = 2;
const REVIVE_COST = 6;
const REVIVE_RANGE = 4;
const REVIVE_HP = 3;
const CANTO_MOV = 2;
const STORM_CD = 5; // ระบำเขม่า: คูลดาวน์หลังใช้ (ผู้ใช้สั่ง 2026-10-27)
const BREAD_USES = 3;
const VACUUM_USES = 5; // เครื่องดูดฝุ่น: ใช้ได้ 5 ครั้งต่อเกม (ตีปกติ 1 · ท่าไม้ตาย 1) หมดแล้วกลับไปถือไม้ถูพื้น เลือกใหม่ไม่ได้
const STORM_MOV = { [KATE]: 6, [EMI]: 4 };
// ตัวเลือกดาบเขม่าของเคท: 0 แต้ม · ไม่กินโควตา · ไม่ล็อกการเดิน · ไม่ขึ้นป้ายกลาง
const SWORD_FORMS = ["hold", "give", "recall"];
const isSwordForm = (opts) => !!opts && SWORD_FORMS.includes(opts.form);

// อาวุธของเอมิลิโกะ (เรียงตามปุ่ม) — ดาบเขม่าเลือกได้เมื่อเคทส่งให้แล้วเท่านั้น
// desc = คำอธิบายย่อตอนชี้เมาส์ที่ตัวเลือก (ผู้ใช้สั่ง 2026-10-14)
const WEAPONS = {
  mop: { name: "ไม้ถูพื้น", img: IMG.mop, desc: "เดินเข้าพื้นเปียก ไถลจนสุดแนว ชนศัตรูเสียหาย 2 · ทางที่ไถลผ่านแห้ง" },
  vase: { name: "แจกันใส่น้ำ", img: IMG.vase, desc: "ระยะตี 4 · ตีปกติผลักเป้า 3 ช่อง (ชนเสียหาย 1) · ทางน้ำถึงเป้าและทางที่ถูกผลักเป็นพื้นเปียก · ตีแล้วสลับเป็นไม้ถูพื้นได้" },
  vacuum: { name: "เครื่องดูดฝุ่น", img: IMG.vacuum, desc: "ระยะตี 3 · ความเสียหายเท่าระยะ (บัฟไม่ได้) · ดูดเป้ามาติดตัว · 5 ครั้งต่อเกม หมดแล้วกลับเป็นไม้ถูพื้น" },
  sword: { name: "ดาบเขม่า", img: IMG.sword, desc: "พลังโจมตี +2" },
};
const WEAPON_KEYS = Object.keys(WEAPONS);
// ตัวเลือกของเขม่าควัน (เคท)
const SOOT = {
  whip: { name: "แส้เขม่า", img: IMG.whip, cost: 2, area: { kind: "target", range: 3 }, desc: "ระยะ 3 · เอมิลิโกะ = ดึงมาติดตัว · ศัตรู = พุ่งเข้าประชิด ความเสียหาย 1" },
  hold: { name: "ดาบเขม่า", img: IMG.sword, cost: 0, area: { kind: "self" }, desc: "ถือดาบเอง พลังโจมตี +1" },
  give: { name: "ส่งดาบเขม่า", img: IMG.sword, cost: 0, area: { kind: "target", range: 4 }, desc: "ส่งดาบให้เอมิลิโกะในระยะ 4 · เอมิลิโกะเลือกใช้ได้ พลังโจมตี +2" },
  recall: { name: "เรียกดาบคืน", img: IMG.sword, cost: 0, area: { kind: "self" }, desc: "เอาดาบคืนจากเอมิลิโกะ พลังโจมตี +1" },
  wings: { name: "ปีกเขม่า", img: IMG.wings, cost: 4, area: { kind: "line", len: 4, width: 1 }, desc: "เลือกทิศ บิน 4 ช่องข้ามทุกอย่าง · พาเอมิลิโกะที่ติดตัวไปด้วย" },
};

// ฮุคที่ server เรียกโดยไม่ส่ง engine (mov) อ่านผ่านตัวนี้ (require ตอนเรียก — กัน require วน)
function E() { return require("../server/engine").engine; }

const isKate = (p) => !!p && p.characterId === KATE;
const isEmi = (p) => !!p && p.characterId === EMI;
const isPair = (p) => isKate(p) || isEmi(p);

// ---------- สถานะของคู่ (เก็บที่เคท = เจ้าของ) ----------
function fresh() {
  return {
    weapon: "mop",     // อาวุธที่เอมิลิโกะถืออยู่
    lastWeapon: "mop", // อาวุธก่อนถือดาบ (เรียกดาบคืน = กลับไปถืออันนี้)
    sword: null,       // ดาบเขม่าอยู่กับใคร: null (ยังไม่ชัก) | "kate" | "emi"
    vacuumLeft: VACUUM_USES, // เครื่องดูดฝุ่นเหลือกี่ครั้ง (ต่อเกม — รีเซ็ตแค่ตอนเริ่มแมตช์)
    swordAt: 0,        // ลำดับตอนเคทถือดาบเขม่า (engine.severStamp — ตัดผลสกิล server/sever.js)
    emiSwordAt: 0,     // ลำดับตอนเอมิลิโกะเลือกถือดาบเขม่า
    stormReady: 0,     // เทิร์นที่ใช้ระบำเขม่าได้อีก (คูลดาวน์)
  };
}
function st(p) {
  const o = Duo.ownerOf(p);
  return o.shadow || (o.shadow = fresh());
}
const weaponOf = (p) => (isEmi(p) ? st(p).weapon : null);

// ---------- ม่านแดง (ระบำเขม่า) — ยืนอยู่ในม่านของฝ่ายตัวเองไหม (server/soot.js — engine.soot.inStormOf = Soot.ownStorm) ----------
function inStorm(engine, p) {
  return !!engine.soot.inStormOf(p);
}
// ม่านแดงที่ตัวนี้ร่ายเองและยังอยู่ (เรียงตามลำดับที่ร่าย)
function ownStorms(engine, p) {
  return engine.soot.storms().filter((s) => s.owner === p.id);
}
// ม่านหายทันที — แบบเดียวกับหมดเวลา (Soot.onEndTurn กรองออกจาก match.board.storms)
function dropStorm(engine, storm) {
  const list = engine.soot.storms();
  const i = list.indexOf(storm);
  if (i >= 0) list.splice(i, 1);
}

// ระบำเขม่าเหลือคูลดาวน์กี่เทิร์น
const stormCd = (engine, p) => Math.max(0, (st(p).stormReady || 0) - engine.roundNumber);

// ---------- กระจกเงา / ตื่นขึ้นอีกครั้ง ----------
const reviveMode = (p) => {
  const m = Duo.partnerOf(p);
  return !!m && !m.alive && !!m.corpse;
};
const reviveDist = (p, m) => (p.pos && m && m.corpse ? Board.dist(p.pos, m.corpse) : Infinity);
function revive(engine, p, m) {
  // ร่างของตัวเองไม่นับว่าขวาง (ฟื้นลงช่องร่าง) — ช่องร่างไม่ว่างจริง = ช่องว่างใกล้สุด
  const to = freeIgnoringCorpse(engine, m.corpse.x, m.corpse.y) ? { ...m.corpse } : engine.nearFreeTile(m.corpse);
  if (!to) return false;
  m.corpse = null;
  m.alive = true;
  m.result = null;
  m.hp = Math.min(REVIVE_HP, engine.maxHpOf(m));
  m.armor = 0;
  m.shield = 0;
  m.statuses = {};
  m.statusAmt = {};
  m.tempHp = 0; m.tempHpTurns = 0;
  m.pos = to;
  m.wasAttacked = false;
  engine.duo.unitDone(m); // ฟื้นแล้วยังขยับไม่ได้ในตานี้
  engine.log(`🪞✨ ${p.name} ปลุก ${m.name} ให้ตื่นขึ้นอีกครั้ง — พลังชีวิต ${m.hp}`);
  engine.boardFx("shadowFx", { kind: "revive", by: p.id, id: m.id, at: { ...to } });
  return true;
}
// ช่องร่างว่างไหมถ้าไม่นับร่างตัวเอง (ไม่มีคนยืน · ไม่ใช่สิ่งกีดขวาง/ร้าน)
function freeIgnoringCorpse(engine, x, y) {
  const map = engine.boardMap();
  if (x < 0 || y < 0 || x >= map.cols || y >= map.rows || map.terrain[`${x},${y}`]) return false;
  if (engine.shopPos && engine.shopPos.x === x && engine.shopPos.y === y) return false;
  return !engine.boardUnits().some((u) => u.x === x && u.y === y);
}

// ---------- ฮุคร่วมของสองตัว ----------
const shared = {
  maxHp(p) { return isPair(p) ? MAX_HP : undefined; },
  maxArmor(p, base) { return isPair(p) ? MAX_ARMOR : base; },
  maxSkill(p) { return isPair(p) ? MAX_SKILL : undefined; },
  skillRegen(p) { return isPair(p) ? SKILL_REGEN : 1; },
  resetCombat(p) {
    if (!isPair(p)) return;
    p.shadow = isKate(p) ? fresh() : undefined;
    p.corpse = null;
    // ขนมปัง (ของประจำตัวเอมิลิโกะ · 3 ครั้ง · ไม่กินช่องกระเป๋า) — กระเป๋าใช้ร่วมกับเคท จึงใส่ตอนรีเซ็ตเอมิลิโกะ (หลังล้างกระเป๋าแล้ว)
    if (isEmi(p) && Array.isArray(p.inventory) && !p.inventory.some((it) => it.type === "kebread")) {
      p.inventory.push({ uid: `kebread_${p.id}`, type: "kebread", uses: BREAD_USES, price: 0 });
    }
  },
  // ระยะเดิน: ในระบำเขม่า เคท 6 · เอมิลิโกะ 4
  mov(p) {
    if (!isPair(p)) return null;
    return inStorm(E(), p) ? STORM_MOV[p.characterId] : null;
  },
  // กระจกเงาสลับตัวได้ระหว่างเดินต่อของเอมิลิโกะ · เอมิลิโกะสลับอาวุธได้ด้วย (ตีแจกันแล้วถือไม้ถูพื้นไถลชนต่อ)
  cantoSkill(p, tier) { return isPair(p) && (tier === "basic" || (tier === "secondary" && isEmi(p))); },
  // กระจกเงา (ไม่ใช่ตื่นขึ้นอีกครั้ง) · เลือกอาวุธ (เอมิลิโกะ) · ดาบเขม่า (เคท) = ไม่กินโควตา ไม่ล็อกการเดิน ไม่ขึ้นป้ายกลาง
  skipsTurnQuota(p, tier, opts) {
    if (!isPair(p)) return false;
    if (tier === "basic") return !reviveMode(p);
    return tier === "secondary" && (isEmi(p) || isSwordForm(opts));
  },
  ignoresTurnQuota(p, tier, opts) { return shared.skipsTurnQuota(p, tier, opts); },
  keepsMove(engine, p, tier, opts) { return shared.skipsTurnQuota(p, tier, opts); },
  silentFlash(p, tier, opts) { return shared.skipsTurnQuota(p, tier, opts); },
};

// ---------- เคท ----------
const kate = {
  id: KATE,
  IMG, WEAPONS, SOOT, BREAD_USES, VACUUM_USES, MAX_SKILL, SKILL_REGEN, REVIVE_COST, REVIVE_RANGE, REVIVE_HP, CANTO_MOV, STORM_CD,
  isKate, isEmi, isPair, weaponOf, inStorm,
  ...shared,
  skillCost(p, tier, base, opts) {
    if (!isPair(p)) return base;
    if (tier === "basic") return reviveMode(p) ? REVIVE_COST : 0;
    if (tier === "secondary" && isKate(p)) { const o = SOOT[opts && opts.form]; return o ? o.cost : base; }
    return base;
  },
  skillArea(p, tier, area, opts) {
    if (tier === "secondary" && isKate(p)) { const o = SOOT[opts && opts.form]; return o ? o.area : area; }
    return area;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isPair(p)) return true;
    if (tier === "basic") {
      const m = Duo.partnerOf(p);
      if (!m) return false;
      if (reviveMode(p)) return reviveDist(p, m) <= REVIVE_RANGE;
      return engine.duo.canSwitchTo(m);
    }
    if (tier === "secondary" && isEmi(p)) {
      const w = opts.form, s = st(p);
      if (!WEAPONS[w] || w === s.weapon) return false;
      if (w === "vacuum" && !(s.vacuumLeft > 0)) return false;
      return w !== "sword" || s.sword === "emi";
    }
    if (tier === "secondary" && isKate(p)) return sootAllowed(engine, p, opts.form, targets);
    if (tier === "ultimate" && isKate(p)) return stormCd(engine, p) <= 0;
    return true;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isPair(p)) return "";
    if (tier === "basic") {
      const m = Duo.partnerOf(p);
      if (m && !m.alive) { revive(engine, p, m); return ""; }
      const from = { ...p.pos };
      engine.duo.switchTo(m);
      engine.boardFx("shadowFx", { kind: "mirror", from: p.id, to: m.id, at: from });
      engine.sfx("ke_mirror");
      return "";
    }
    if (tier === "secondary" && isEmi(p)) {
      const s = st(p);
      if (opts.form !== "sword") s.lastWeapon = opts.form;
      else s.emiSwordAt = engine.severStamp();
      s.weapon = opts.form;
      engine.log(`🧹 ${p.name} เปลี่ยนเป็น${WEAPONS[s.weapon].name}`);
      engine.boardFx("shadowFx", { kind: "weapon", id: p.id, weapon: s.weapon });
      engine.sfx(`ke_w_${s.weapon}`);
      return "";
    }
    if (tier === "secondary" && isKate(p)) return sootSkill(engine, p, opts.form, targets, opts);
    // ท่าไม้ตาย: เคท ระบำเขม่า · เอมิลิโกะ ร่าเริงสุดๆ
    if (tier === "ultimate" && isKate(p)) {
      st(p).stormReady = engine.roundNumber + 1 + STORM_CD;
      const before = ownStorms(engine, p).length;
      const out = KC.storm(engine, p, opts);
      const mine = ownStorms(engine, p);
      if (mine.length > before) mine[mine.length - 1].severAt = engine.severStamp(); // ตัดผลสกิล (server/sever.js)
      return out;
    }
    if (tier === "ultimate") return KC.cheer(engine, p, targets, opts, st(p));
    return "";
  },
  // ตัดผลสกิล (server/sever.js — รากฐานจิตของเรียวกิ) — ถามทีละตัว (เคท / เอมิลิโกะ แยกกัน)
  //  เคท: ม่านแดงของระบำเขม่าที่ตัวเองร่าย (ม่านหายทันทีแบบหมดเวลา) · ดาบเขม่าที่ถืออยู่ (เก็บดาบ — ชัก/ส่งใหม่ได้ตามปกติ)
  //  เอมิลิโกะ: ดาบเขม่าที่ถืออยู่ (ดาบหาย กลับไปถืออาวุธก่อนหน้า) · เครื่องมือทำความสะอาดอื่นเป็นการเลือกอาวุธ ไม่ใช่ผลที่ทำงานค้าง
  severables(engine, p) {
    if (!isPair(p) || !p.alive) return [];
    const s = st(p);
    const out = [];
    if (isKate(p)) {
      for (const storm of ownStorms(engine, p)) {
        out.push({ key: `kateStorm${storm.seq || ""}`, label: "ระบำเขม่า", at: storm.severAt || 0, cancel() { dropStorm(engine, storm); } });
      }
      if (s.sword === "kate") {
        out.push({ key: "kateSword", label: "ดาบเขม่า", at: s.swordAt || 0, cancel() { s.sword = null; } });
      }
    }
    if (isEmi(p) && s.weapon === "sword") {
      out.push({
        key: "emiSword", label: "ดาบเขม่า", at: s.emiSwordAt || 0,
        cancel() { s.weapon = s.lastWeapon || "mop"; s.sword = null; },
      });
    }
    return out;
  },
  // ปุ่มกระจกเงาเปลี่ยนเป็นตื่นขึ้นอีกครั้งเมื่ออีกตัวล้ม · ปุ่มรองแบบหลายตัวเลือก (choices)
  skillPub(p, tier) {
    if (!isPair(p)) return null;
    if (tier === "basic" && reviveMode(p)) {
      return { name: "ตื่นขึ้นอีกครั้ง", img: IMG.revive, cost: REVIVE_COST, desc: `ฟื้นคืนชีพอีกตัวที่ร่าง พลังชีวิต ${REVIVE_HP} (ร่างต้องอยู่ในระยะ ${REVIVE_RANGE})` };
    }
    if (tier === "secondary") return { choices: choicesOf(p) };
    return null;
  },
  // ปุ่มเทา: สลับไม่ได้ (อีกตัวจบแล้ว/สตั้น) · ร่างอยู่นอกระยะ
  skillLocks(engine, p) {
    if (!isPair(p)) return undefined;
    const m = Duo.partnerOf(p);
    let basic = false;
    if (!m) basic = true;
    else if (reviveMode(p)) basic = reviveDist(p, m) > REVIVE_RANGE;
    else basic = !engine.duo.canSwitchTo(m);
    const cd = isKate(p) ? stormCd(engine, p) : 0;
    if (!basic && !cd) return undefined;
    return { ...(basic ? { basic: { locked: true } } : {}), ...(cd ? { ultimate: { locked: true, cd } } : {}) };
  },
  // เอมิลิโกะเดินต่อหลังตี/รอ
  cantoMov(engine, p) { return isEmi(p) && p.alive ? CANTO_MOV : 0; },
  // ข้อมูลให้ client (แผงตัวเรา / ปุ่มเลือก)
  shadowState(engine, p) {
    if (!isPair(p)) return undefined;
    const s = st(p);
    return { weapon: s.weapon, sword: s.sword, vacuumLeft: s.vacuumLeft, inStorm: inStorm(engine, p) };
  },
};

// ---------- เขม่าควัน (เคท) ----------
function sootChoiceKeys(p) {
  const s = st(p);
  const keys = ["whip"];
  if (s.sword === null) keys.push("hold", "give");
  else if (s.sword === "kate") keys.push("give");
  else keys.push("recall");
  keys.push("wings");
  return keys;
}
function choicesOf(p) {
  if (isEmi(p)) {
    const s = st(p);
    return WEAPON_KEYS.filter((k) => k !== "sword" || s.sword === "emi")
      .map((k) => ({
        key: k, name: WEAPONS[k].name, img: WEAPONS[k].img, desc: WEAPONS[k].desc, cost: 0, area: { kind: "self" }, active: s.weapon === k,
        ...(k === "vacuum" ? { left: s.vacuumLeft, locked: !(s.vacuumLeft > 0) } : {}),
      }));
  }
  return sootChoiceKeys(p).map((k) => ({ key: k, name: SOOT[k].name, img: SOOT[k].img, desc: SOOT[k].desc, cost: SOOT[k].cost, area: SOOT[k].area }));
}
function sootAllowed(engine, p, form, targets) {
  if (!SOOT[form] || !sootChoiceKeys(p).includes(form)) return false;
  const m = Duo.partnerOf(p);
  if (form === "give") return !!m && m.alive && targets[0] === m.id;
  if (form === "whip") {
    // แส้: เอมิลิโกะ (ดึงมา) หรือศัตรู (พุ่งเข้าใส่) เท่านั้น — เพื่อนร่วมทีม (โหมด duo/trio) เล็งไม่ได้
    const t = targets.length === 1 ? engine.players[targets[0]] : null;
    return !!t && t.id !== p.id && ((!!m && t.id === m.id) || !engine.sameTeam(p, t));
  }
  return true;
}
function sootSkill(engine, p, form, targets, opts) {
  const s = st(p);
  const m = Duo.partnerOf(p);
  if (form === "hold") {
    s.sword = "kate";
    s.swordAt = engine.severStamp();
    engine.log(`🗡️ ${p.name} ชักดาบเขม่า — พลังโจมตี +1`);
    engine.boardFx("shadowFx", { kind: "sword", id: p.id, holder: p.id });
    engine.sfx("ke_sword");
    return "";
  }
  if (form === "give") {
    s.sword = "emi";
    engine.log(`🗡️ ${p.name} ส่งดาบเขม่าให้ ${m.name}`);
    engine.boardFx("shadowFx", { kind: "sword", id: p.id, holder: m.id, from: p.id });
    engine.sfx("ke_sword");
    return "";
  }
  if (form === "recall") {
    s.sword = "kate";
    s.swordAt = engine.severStamp();
    if (s.weapon === "sword") s.weapon = s.lastWeapon || "mop";
    engine.log(`🗡️ ${p.name} เรียกดาบเขม่าคืน`);
    engine.boardFx("shadowFx", { kind: "sword", id: p.id, holder: p.id, from: m ? m.id : null });
    engine.sfx("ke_sword");
    return "";
  }
  if (form === "whip") return KC.whip(engine, p, engine.players[targets[0]], { st: s, mate: m });
  if (form === "wings") return KC.wings(engine, p, opts.dir, m);
  return "";
}

// ฮุคส่วนการต่อสู้ (ตีปกติตามอาวุธ / ไม้ถูพื้น / ขนมปัง / ติดตัวเคท) — ใช้ร่วมทั้งสองตัว (characters/kate_emiliko_combat.js)
Object.assign(kate, KC.hooks({ isKate, isEmi, isPair, st, weaponOf }));

// ---------- เอมิลิโกะ ----------
const emiliko = { ...kate, id: EMI };

module.exports = { kate, emiliko, KATE, EMI, WEAPONS, SOOT };
