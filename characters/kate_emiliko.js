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
//    ท่าไม้ตาย ร่าเริงสุดๆ (6): แนว 4×3 ตามอาวุธ
//  เคท: เดิน 4 (ในระบำเขม่า 6) · รอง = เลือกใช้ แส้เขม่า (2) / ดาบเขม่า (0 · ถือ/ให้/เรียกคืน) / ปีกเขม่า (4)
//    ท่าไม้ตาย ระบำเขม่า (6): พายุ 8×8 3 เทิร์น · ติดตัว: ในพายุเดิน 6 + ตีปกติทำให้เป้ามองไม่ออก 1 เทิร์น
// ============================================================

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
};
// เพลงท่าไม้ตายเคท (ระบำเขม่า): intro เล่นครั้งเดียว แล้ววน loop จนพายุหมด
const MUSIC = { intro: `${DIR}/kate_theme_intro.m4a`, loop: `${DIR}/kate_theme_loop.mp3` };

const MAX_HP = 3;
const MAX_ARMOR = 2;
const MAX_SKILL = 16;
const SKILL_REGEN = 2;
const REVIVE_COST = 6;
const REVIVE_RANGE = 4;
const REVIVE_HP = 3;
const CANTO_MOV = 2;
const STORM_MOV = { [KATE]: 6, [EMI]: 4 };

// อาวุธของเอมิลิโกะ (เรียงตามปุ่ม) — ดาบเขม่าเลือกได้เมื่อเคทส่งให้แล้วเท่านั้น
const WEAPONS = {
  mop: { name: "ไม้ถูพื้น", img: IMG.mop },
  vase: { name: "แจกันใส่น้ำ", img: IMG.vase },
  vacuum: { name: "เครื่องดูดฝุ่น", img: IMG.vacuum },
  sword: { name: "ดาบเขม่า", img: IMG.sword },
};
const WEAPON_KEYS = Object.keys(WEAPONS);
// ตัวเลือกของเขม่าควัน (เคท)
const SOOT = {
  whip: { name: "แส้เขม่า", img: IMG.whip, cost: 2, area: { kind: "target", range: 3 } },
  hold: { name: "ดาบเขม่า", img: IMG.sword, cost: 0, area: { kind: "self" } },
  give: { name: "ส่งดาบเขม่า", img: IMG.sword, cost: 0, area: { kind: "target", range: 4 } },
  recall: { name: "เรียกดาบคืน", img: IMG.sword, cost: 0, area: { kind: "self" } },
  wings: { name: "ปีกเขม่า", img: IMG.wings, cost: 4, area: { kind: "line", len: 4, width: 1 } },
};

// ฮุคที่ server เรียกโดยไม่ส่ง engine (mov / skillCost / skillPub) อ่านผ่านตัวนี้ (require ตอนเรียก — กัน require วน)
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
  };
}
function ownerOf(engine, p) { return p.duoOf ? engine.players[p.duoOf] || p : p; }
function mateOf(engine, p) {
  if (p.duoWith) return engine.players[p.duoWith] || null;
  if (p.duoOf) return engine.players[p.duoOf] || null;
  return null;
}
function st(engine, p) {
  const o = ownerOf(engine, p);
  return o.shadow || (o.shadow = fresh());
}
const weaponOf = (engine, p) => (isEmi(p) ? st(engine, p).weapon : null);

// ---------- พายุเขม่า (ระบำเขม่า) — ช่องอยู่ในพายุไหม (ระบบกลางอยู่ server/soot.js ภายหลัง) ----------
function inStorm(engine, p) {
  return !!(engine.soot && engine.soot.inStormOf && engine.soot.inStormOf(p));
}

// ---------- กระจกเงา / ตื่นขึ้นอีกครั้ง ----------
const reviveMode = (engine, p) => {
  const m = mateOf(engine, p);
  return !!m && !m.alive && !!m.corpse;
};
function reviveDist(p, m) {
  if (!p.pos || !m || !m.corpse) return Infinity;
  return Math.abs(p.pos.x - m.corpse.x) + Math.abs(p.pos.y - m.corpse.y);
}
function revive(engine, p, m) {
  const keys = new Set([`${m.corpse.x},${m.corpse.y}`]);
  // ร่างของตัวเองไม่นับว่าขวาง (ฟื้นลงช่องร่าง) — ช่องร่างไม่ว่างจริง = ช่องว่างใกล้สุด
  const free = (x, y) => engine.tileFree(x, y, null) || (keys.has(`${x},${y}`) && freeIgnoringCorpse(engine, x, y));
  const to = free(m.corpse.x, m.corpse.y) ? { ...m.corpse } : engine.nearFreeTile(m.corpse);
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
  },
  // ระยะเดิน: ในระบำเขม่า เคท 6 · เอมิลิโกะ 4
  mov(p) {
    if (!isPair(p)) return null;
    return inStorm(E(), p) ? STORM_MOV[p.characterId] : null;
  },
  // กระจกเงาสลับตัวได้ระหว่างเดินต่อของเอมิลิโกะ
  cantoSkill(p, tier) { return isPair(p) && tier === "basic"; },
  skipsTurnQuota(p, tier, opts) {
    if (!isPair(p)) return false;
    if (tier === "basic") return !reviveMode(E(), p);
    if (tier === "secondary") return isEmi(p) || (opts && ["hold", "give", "recall"].includes(opts.form));
    return false;
  },
  ignoresTurnQuota(p, tier, opts) { return shared.skipsTurnQuota(p, tier, opts); },
  keepsMove(engine, p, tier, opts) {
    if (!isPair(p)) return false;
    if (tier === "basic") return !reviveMode(engine, p);
    if (tier === "secondary") return isEmi(p) || (!!opts && ["hold", "give", "recall"].includes(opts.form));
    return false;
  },
  silentFlash(p, tier, opts) {
    if (!isPair(p)) return false;
    if (tier === "basic") return !reviveMode(E(), p);
    return tier === "secondary" && (isEmi(p) || (!!opts && ["hold", "give", "recall"].includes(opts.form)));
  },
};

// ---------- เคท ----------
const kate = {
  id: KATE,
  IMG, WEAPONS, SOOT, MAX_SKILL, SKILL_REGEN, REVIVE_COST, REVIVE_RANGE, REVIVE_HP, CANTO_MOV,
  isKate, isEmi, isPair, weaponOf, inStorm,
  ...shared,
  skillCost(p, tier, base, opts) {
    if (!isPair(p)) return base;
    if (tier === "basic") return reviveMode(E(), p) ? REVIVE_COST : 0;
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
      const m = mateOf(engine, p);
      if (!m) return false;
      if (reviveMode(engine, p)) return reviveDist(p, m) <= REVIVE_RANGE;
      return engine.duo.canSwitchTo(m);
    }
    if (tier === "secondary" && isEmi(p)) {
      const w = opts.form;
      if (!WEAPONS[w] || w === st(engine, p).weapon) return false;
      return w !== "sword" || st(engine, p).sword === "emi";
    }
    if (tier === "secondary" && isKate(p)) return sootAllowed(engine, p, opts.form, targets);
    return true;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isPair(p)) return "";
    if (tier === "basic") {
      const m = mateOf(engine, p);
      if (m && !m.alive) { revive(engine, p, m); return ""; }
      const from = { ...p.pos };
      engine.duo.switchTo(m);
      engine.boardFx("shadowFx", { kind: "mirror", from: p.id, to: m.id, at: from });
      engine.sfx("ke_mirror");
      return "";
    }
    if (tier === "secondary" && isEmi(p)) {
      const s = st(engine, p);
      if (opts.form !== "sword") s.lastWeapon = opts.form;
      s.weapon = opts.form;
      engine.log(`🧹 ${p.name} เปลี่ยนเป็น${WEAPONS[s.weapon].name}`);
      engine.boardFx("shadowFx", { kind: "weapon", id: p.id, weapon: s.weapon });
      engine.sfx(`ke_w_${s.weapon}`);
      return "";
    }
    if (tier === "secondary" && isKate(p)) return sootSkill(engine, p, opts.form, targets, opts);
    if (tier === "ultimate") return require("./kate_emiliko_combat").ultimate(engine, p, targets, opts, { st: st(engine, p) });
    return "";
  },
  // ปุ่มกระจกเงาเปลี่ยนเป็นตื่นขึ้นอีกครั้งเมื่ออีกตัวล้ม · ปุ่มรองแบบหลายตัวเลือก (choices)
  skillPub(p, tier) {
    if (!isPair(p)) return null;
    const engine = E();
    if (tier === "basic" && reviveMode(engine, p)) {
      return { name: "ตื่นขึ้นอีกครั้ง", img: IMG.revive, cost: REVIVE_COST, desc: `ฟื้นคืนชีพอีกตัวที่ร่าง พลังชีวิต ${REVIVE_HP} (ร่างต้องอยู่ในระยะ ${REVIVE_RANGE})` };
    }
    if (tier === "secondary") return { choices: choicesOf(engine, p) };
    return null;
  },
  // ปุ่มเทา: สลับไม่ได้ (อีกตัวจบแล้ว/สตั้น) · ร่างอยู่นอกระยะ
  skillLocks(engine, p) {
    if (!isPair(p)) return undefined;
    const m = mateOf(engine, p);
    let basic = false;
    if (!m) basic = true;
    else if (reviveMode(engine, p)) basic = reviveDist(p, m) > REVIVE_RANGE;
    else basic = !engine.duo.canSwitchTo(m);
    return basic ? { basic: { locked: true } } : undefined;
  },
  // เอมิลิโกะเดินต่อหลังตี/รอ
  cantoMov(engine, p) { return isEmi(p) && p.alive ? CANTO_MOV : 0; },
  // ข้อมูลให้ client (แผงตัวเรา / ปุ่มเลือก)
  shadowState(engine, p) {
    if (!isPair(p)) return undefined;
    const s = st(engine, p);
    return { weapon: s.weapon, sword: s.sword, inStorm: inStorm(engine, p) };
  },
};

// ---------- เขม่าควัน (เคท) ----------
function sootChoiceKeys(engine, p) {
  const s = st(engine, p);
  const keys = ["whip"];
  if (s.sword === null) keys.push("hold", "give");
  else if (s.sword === "kate") keys.push("give");
  else keys.push("recall");
  keys.push("wings");
  return keys;
}
function choicesOf(engine, p) {
  if (isEmi(p)) {
    const s = st(engine, p);
    return WEAPON_KEYS.filter((k) => k !== "sword" || s.sword === "emi")
      .map((k) => ({ key: k, name: WEAPONS[k].name, img: WEAPONS[k].img, cost: 0, area: { kind: "self" }, active: s.weapon === k }));
  }
  return sootChoiceKeys(engine, p).map((k) => ({ key: k, name: SOOT[k].name, img: SOOT[k].img, cost: SOOT[k].cost, area: SOOT[k].area }));
}
function sootAllowed(engine, p, form, targets) {
  if (!SOOT[form] || !sootChoiceKeys(engine, p).includes(form)) return false;
  const m = mateOf(engine, p);
  if (form === "give") return !!m && m.alive && targets[0] === m.id;
  if (form === "whip") return targets.length === 1 && targets[0] !== p.id;
  return true;
}
function sootSkill(engine, p, form, targets, opts) {
  const s = st(engine, p);
  const m = mateOf(engine, p);
  if (form === "hold") {
    s.sword = "kate";
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
    if (s.weapon === "sword") s.weapon = s.lastWeapon || "mop";
    engine.log(`🗡️ ${p.name} เรียกดาบเขม่าคืน`);
    engine.boardFx("shadowFx", { kind: "sword", id: p.id, holder: p.id, from: m ? m.id : null });
    engine.sfx("ke_sword");
    return "";
  }
  if (form === "whip") return require("./kate_emiliko_combat").whip(engine, p, engine.players[targets[0]], { st: st(engine, p), mate: m });
  if (form === "wings") return require("./kate_emiliko_combat").wings(engine, p, opts.dir, m);
  return "";
}

// ---------- เอมิลิโกะ ----------
const emiliko = { ...kate, id: EMI };

module.exports = { kate, emiliko, KATE, EMI, IMG, MUSIC, WEAPONS, SOOT };
// ฮุคส่วนการต่อสู้ (อาวุธ / แส้ / ปีก / ม่านแดง / ท่าไม้ตาย) — ต่อท้ายทั้งสองตัว (characters/kate_emiliko_combat.js)
const combat = require("./kate_emiliko_combat");
Object.assign(kate, combat.hooks({ isKate, isEmi, isPair, st, mateOf, WEAPONS, IMG, E }));
Object.assign(emiliko, combat.hooks({ isKate, isEmi, isPair, st, mateOf, WEAPONS, IMG, E }), { id: EMI });
