// ============================================================
//  เกราะ Mark 42 — ไอเทมร้านค้ามายา (25 เหรียญ) ที่ใครก็ใส่ได้
//  ไฟล์นี้ไม่ใช่ตัวละคร (ไม่อยู่ใน CHAR_HOOKS) — โมดูลใน server/ require ตรงเหมือน _universal_status
//
//  ใช้ได้ 3 แบบ (ตาเดินของตัวเอง): ใส่ให้ตัวเอง · ใส่ให้ผู้เล่นอื่น · ใส่ให้ผู้เล่นอื่นแล้วระเบิดทันที (ความเสียหาย 2)
//  ระยะบนกระดาน (GRID_PLAN §8.1): ใส่ให้ / ใส่แล้วระเบิด / เรียกคืน ต้องยืนติดกัน (ระยะ 1) · ถอด / สั่งระเบิด สั่งจากไกลได้ (รีโมต)
//  วีดีโอ: ใส่เอง / ใส่ให้ / เรียกคืน เล่นเต็มครั้งแรกครั้งเดียว (ต่อผู้เล่น — triggerCutscene) · ระเบิดเล่นทุกครั้ง
//  ใส่แล้วอยู่ถาวรจนกว่าเจ้าของจะถอด/เรียกคืน/ระเบิด หรือชุดพังจากการต่อสู้ — คนใส่ถอดเองไม่ได้
//  เจ้าของ (คนซื้อ) คุมชุดได้ตลอด: เรียกคืนมาใส่เอง · ถอดออก (ชุดกลับเข้ากระเป๋า) · สั่งระเบิดชุดที่อยู่บนตัวคนอื่น
//    ระบบคู่ (server/duo.js): ชุดเป็นของทั้งฝ่าย — ตัวไหนของฝ่ายก็คุมได้ (ระยะ/ตาเดินนับจากตัวที่สั่ง · ผู้ใช้ตัดสิน 2026-10-14)
//
//  ใส่อยู่ = เกราะชุด 3 หน่วย (เนิฟจาก 7 — ผู้ใช้สั่ง 2026-10-27) เป็น "ชั้นแยก" (p.mark42.armor) รับความเสียหายทุกชนิดแทนตัวจริง
//    เลือดและเกราะจริงไม่ถูกแตะเลยระหว่างใส่ -> ชุดพัง/ถอด = กลับร่างเดิมพร้อมค่าเดิมครบโดยธรรมชาติ
//    ดาเมจที่เกินเกราะชุดที่เหลือหายไปพร้อมชุด ("ตาย = แค่กลับร่างเดิม") · สังหารทันทีก็แค่ทำให้ชุดพัง
//    พลังโจมตี +1 · หน้าจอแสดงพลังชีวิต 0/0 + เกราะชุด x/3 · ภาพประจำตัวเป็น mark42.webp · สกิลตัวละครใช้ได้ตามปกติ
//  ชุดพังจากการต่อสู้ = เจ้าของซื้อชุดใหม่ไม่ได้ 10 เทิร์น (ถอด/เรียกคืน/ระเบิดเองไม่ติดคูลดาวน์)
// ============================================================

const DIR = "/characters/Mark42";
const SUIT_ARMOR = 3;
const SUIT_ATK = 1;
const BOMB_DMG = 2;
const BREAK_BUY_LOCK = 10;
const PRICE = 20; // ลดจาก 25 (ผู้ใช้สั่ง 2026-10-27)
const IMG = { item: `${DIR}/mark42_item.jpg`, suit: `${DIR}/mark42.webp` };
const VIDEO = {
  suitup: `${DIR}/mark42_suitup.mp4`,
  recall: `${DIR}/mark42_recall.mp4`,
  suitSome: `${DIR}/mark42_suit_some.mp4`,
  bomb: `${DIR}/mark42_bomb.mp4`,
};

const Board = require("../server/board");
const Duo = require("../server/duo");

const suited = (p) => !!p && !!p.mark42 && p.alive !== false;
// ยืนติดกัน (ระยะแมนฮัตตัน 1 · ตัวใหญ่นับจากขอบตัว) — ใส่ให้ / ระเบิดใส่ / เรียกคืน
const adjacent = (a, b) => !!a && !!b && !!a.pos && !!b.pos && Board.dist(Board.boxOf(a), Board.boxOf(b)) === 1;
// ตัวของฝ่าย p ที่ถือสิทธิ์ชุดที่ออกไปอยู่ (mark42Owned) — ตัวละครทั่วไป = p เอง · ไม่มีชุดออกไป = null
const holderOf = (p) => Duo.unitsOf(p).find((u) => !!u.mark42Owned) || null;

module.exports = {
  SUIT_ARMOR, SUIT_ATK, BOMB_DMG, BREAK_BUY_LOCK, PRICE, IMG, VIDEO,
  suited,

  resetCombat(p) {
    p.mark42 = null;        // ชุดที่ใส่อยู่: { ownerId, armor }
    p.mark42Owned = null;   // ชุดของเราที่ออกไปอยู่บนตัวใครสักคน (รวมตัวเอง): { wearerId }
    p.mark42BuyLock = 0;    // ชุดพังจากการต่อสู้: ซื้อใหม่ไม่ได้จนจบเทิร์นเลขนี้
  },

  // ---------- ซื้อ ----------
  //  นับทั้งฝ่าย (ระบบคู่ — server/duo.js: กระเป๋าใช้ร่วมกันแต่ชุดที่ออกไป/คูลดาวน์อยู่ที่ตัวที่ซื้อ) = ฝ่ายหนึ่งมีชุดได้ชุดเดียว (GRID_PLAN §7.10)
  buyLockLeft(engine, p) {
    const lock = Math.max(0, ...Duo.unitsOf(p).map((u) => u.mark42BuyLock || 0));
    return Math.max(0, lock - engine.roundNumber + 1);
  },
  ownsSuit(p) { return Duo.unitsOf(p).some((u) => !!u.mark42Owned) || (p.inventory || []).some((it) => it.type === "mark42"); },
  canBuy(engine, p) { return !this.ownsSuit(p) && this.buyLockLeft(engine, p) <= 0; },

  // ---------- ท่อดาเมจ ----------
  // ชุดรับความเสียหาย n หน่วยแทนตัวจริง — คืน true = รับไว้แล้ว (ผู้เรียกต้องไม่ลงดาเมจต่อ)
  absorb(engine, p, n) {
    if (!suited(p) || !(n > 0)) return false;
    p.mark42.armor -= n;
    if (p.mark42.armor <= 0) this.breakSuit(engine, p, "combat");
    else engine.log(`🦾 ${p.name} เกราะ Mark 42 รับความเสียหาย -${n} (เหลือ ${p.mark42.armor}/${SUIT_ARMOR})`);
    return true;
  },
  // reason: "combat" = พังจากการต่อสู้ (เจ้าของติดคูลดาวน์ซื้อ 10 เทิร์น) · อื่นๆ = ถูกระเบิด/ถอดโดยเจ้าของ
  breakSuit(engine, p, reason) {
    const s = p && p.mark42;
    if (!s) return;
    p.mark42 = null;
    const owner = engine.players[s.ownerId];
    if (owner && owner.mark42Owned && owner.mark42Owned.wearerId === p.id) owner.mark42Owned = null;
    if (reason === "combat") {
      if (owner) owner.mark42BuyLock = engine.roundNumber + BREAK_BUY_LOCK;
      engine.log(`💥 เกราะ Mark 42 ของ ${p.name} พัง — กลับร่างเดิม${owner ? ` (${owner.name} ซื้อชุดใหม่ไม่ได้ ${BREAK_BUY_LOCK} เทิร์น)` : ""}`);
    }
  },
  attackBonus(p) { return suited(p) ? SUIT_ATK : 0; },

  // ---------- ใช้ไอเทม ----------
  validWearer(engine, t) { return !!t && t.alive && !t.mark42; },
  // คืน { video, after, flash } หรือ null = ใช้ไม่ได้ (ไม่หักไอเทม)
  planUse(engine, p, item, mode, targetId) {
    const armor = item.armor > 0 ? item.armor : SUIT_ARMOR;
    if (mode === "self") {
      if (p.mark42) return null;
      return {
        video: "mark42Suitup", flash: "ใส่เกราะ Mark 42",
        after: () => this.equip(engine, p, p, armor),
      };
    }
    const t = engine.players[targetId];
    if (!t || t.id === p.id || !this.validWearer(engine, t) || !adjacent(p, t)) return null;
    if (mode === "give") {
      return {
        video: "mark42SuitSome", flash: `ใส่เกราะ Mark 42 ให้ ${t.name}`,
        after: () => { if (this.validWearer(engine, t)) this.equip(engine, p, t, armor); },
      };
    }
    if (mode === "bomb") {
      return {
        video: "mark42Bomb", flash: `Mark 42 — ระเบิดใส่ ${t.name}`,
        after: () => this.blast(engine, p, t, true),
      };
    }
    return null;
  },
  equip(engine, owner, wearer, armor) {
    wearer.mark42 = { ownerId: owner.id, armor: Math.min(SUIT_ARMOR, armor || SUIT_ARMOR) };
    owner.mark42Owned = { wearerId: wearer.id };
    engine.log(owner.id === wearer.id
      ? `🦾 ${owner.name} สวมเกราะ Mark 42 — เกราะชุด ${wearer.mark42.armor}/${SUIT_ARMOR} · พลังโจมตี +${SUIT_ATK}`
      : `🦾 ${owner.name} ส่งเกราะ Mark 42 ไปสวมให้ ${wearer.name} — เกราะชุด ${wearer.mark42.armor}/${SUIT_ARMOR} · พลังโจมตี +${SUIT_ATK}`);
  },
  // ระเบิด: ชุด (ถ้ามี) พังก่อน แล้วความเสียหาย BOMB_DMG ลงตัวจริงของคนใส่ (ลดเกราะก่อน)
  blast(engine, owner, t, fresh) {
    if (!t || !t.alive) return;
    if (t.mark42) this.breakSuit(engine, t, "blast");
    engine.withEffectSource(owner, () => {
      engine.dealMixed(t, BOMB_DMG);
      t.wasAttacked = true;
      engine.resolveDamageAftermath(t);
    });
    engine.log(`💥 ${owner.name} ${fresh ? "ส่งเกราะ Mark 42 ไประเบิดใส่" : "สั่งระเบิดเกราะ Mark 42 บนตัว"} ${t.name} -${BOMB_DMG}${t.alive ? "" : " ตกรอบ!"}`);
  },

  // ---------- เจ้าของคุมชุดที่ออกไปแล้ว ----------
  //  action: "recall" (เรียกคืนมาใส่เอง) · "remove" (ถอดออก กลับเข้ากระเป๋า) · "detonate" (ระเบิดชุดบนตัวคนอื่น)
  //  p = ตัวที่สั่ง (ระบบคู่: ตัวไหนของฝ่ายก็ได้ — holderOf) · คืน plan + wearerId (ชุดอยู่บนตัวใคร — characterRules ใช้ตัดสินการปรากฏตัว)
  planControl(engine, p, action) {
    const holder = holderOf(p);
    const own = holder && holder.mark42Owned;
    const w = own && engine.players[own.wearerId];
    if (!own) return null;
    if (!w || !w.alive || !w.mark42 || w.mark42.ownerId !== holder.id) { holder.mark42Owned = null; return null; } // ชุดหายไปแล้ว (คนใส่ตาย ฯลฯ)
    const plan = this.controlPlan(engine, p, holder, w, action);
    return plan && { ...plan, wearerId: w.id };
  },
  controlPlan(engine, p, holder, w, action) {
    if (action === "remove") {
      if (engine.bagFull(p)) return null; // ชุดกลับเข้ากระเป๋า — กระเป๋าเต็ม = ถอดไม่ได้
      return {
        video: null, flash: "ถอดเกราะ Mark 42",
        after: () => {
          const armor = w.mark42 ? w.mark42.armor : SUIT_ARMOR;
          w.mark42 = null;
          holder.mark42Owned = null;
          engine.grantInventoryItem(p, { type: "mark42", price: PRICE });
          const it = p.inventory[p.inventory.length - 1];
          if (it) it.armor = armor; // ชุดที่เสียหายแล้วกลับมาพร้อมเกราะที่เหลือ
          engine.log(`🦾 ${p.name} ถอดเกราะ Mark 42 ${w.id === p.id ? "ออกจากตัวเอง" : `ออกจาก ${w.name}`} (เกราะชุดเหลือ ${armor}/${SUIT_ARMOR})`);
        },
      };
    }
    if (w.id === p.id) return null; // เรียกคืน/ระเบิด ใช้กับชุดที่อยู่บนตัวคนอื่นเท่านั้น
    if (action === "recall") {
      if (p.mark42 || !adjacent(p, w)) return null;
      return {
        video: "mark42Recall", flash: `เรียกเกราะ Mark 42 กลับจาก ${w.name}`,
        after: () => {
          if (!w.mark42 || p.mark42 || !p.alive) return;
          const armor = w.mark42.armor;
          w.mark42 = null;
          holder.mark42Owned = null; // ระบบคู่: อีกตัวเรียกคืน = ตัวที่เรียกถือสิทธิ์แทน (equip)
          this.equip(engine, p, p, armor);
          engine.log(`🦾 ${p.name} เรียกเกราะ Mark 42 กลับจาก ${w.name} มาสวมเอง`);
        },
      };
    }
    if (action === "detonate") {
      return {
        video: "mark42Bomb", flash: `Mark 42 — สั่งระเบิดบนตัว ${w.name}`,
        after: () => this.blast(engine, p, w, false),
      };
    }
    return null;
  },

  // ---------- ข้อมูลให้ client ----------
  publicState(engine, p) {
    if (!suited(p)) return null;
    const owner = engine.players[p.mark42.ownerId];
    return { armor: p.mark42.armor, max: SUIT_ARMOR, ownerId: p.mark42.ownerId, ownerName: owner ? owner.name : "" };
  },
  privateState(engine, p) {
    const holder = holderOf(p);
    const own = holder && holder.mark42Owned;
    const w = own && engine.players[own.wearerId];
    return {
      mark42Owned: w && w.mark42 ? { wearerId: w.id, wearerName: w.name, armor: w.mark42.armor, self: w.id === p.id } : null,
      mark42BuyLock: this.buyLockLeft(engine, p),
    };
  },
};
