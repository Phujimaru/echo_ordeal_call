// ============================================================
//  เคท & เอมิลิโกะ — ส่วนการต่อสู้ (ต่อท้ายฮุคใน characters/kate_emiliko.js)
//   เอมิลิโกะ: ไม้ถูพื้น (ไถลบนพื้นเปียกชน 1 · ถูแห้ง) · แจกัน (ระยะ 3 · ตีผลัก 3 + พื้นเปียกตั้งแต่หน้าเอมิลิโกะถึงเป้า) · เครื่องดูดฝุ่น (ระยะ 3 · ดาเมจ = ระยะ สูงสุด 2 · ดูด)
//              ดาบเขม่า (+1) · ท่าไม้ตาย ร่าเริงสุดๆ (แนว 4×3 ตามอาวุธ)
//   เคท: ดาบเขม่า (+1) · แส้เขม่า · ปีกเขม่า · ท่าไม้ตาย ระบำเขม่า (server/soot.js) · ติดตัว: ในม่านตีแล้วเป้า "มืดบอด"
//  การขยับคน (ผลัก/ดูด/ไถล) ส่งเป็น iceFx (server/ice.js) — client เล่นตามลำดับ · ท่าใหญ่ส่ง shadowFx
//  Claude ตัดสินเอง (บอกผู้ใช้): ชนตอนถูกผลัก = เป้าเสีย 1 และคนที่ถูกชน (ถ้าเป็นศัตรู) เสีย 1 ด้วย · ตัวใหญ่ไม่ถูกผลัก/ดูด
//   ทางที่ถูกผลัก = ช่องออกตัวถึงช่องก่อนช่องที่หยุด · ไม้ถูพื้นท่าไม้ตาย: ผลักศัตรูทั้งแนวไปพ้นปลายแนว (ช่องที่ 5)
//   เครื่องดูดฝุ่นใช้ได้ 5 ครั้งต่อเกม (ผู้ใช้สั่ง 2026-10-14): ตีปกติ (ตีพลาด/ตีหนาม/ผนึกก็นับ) 1 · ท่าไม้ตาย 1 → หมด = กลับไปถือไม้ถูพื้น
//  ปรับสมดุล 2026-11-08 (ผู้ใช้สั่ง): ไม้ถูพื้นไถลชน 2 → 1 · แจกันระยะ 4 → 3 ชนตอนถูกผลักไม่เสีย (ตีปกติ) · ดูดฝุ่นเพดาน 3 → 2
//   ร่าเริงสุดๆ ดาเมจตายตัว (ไม่รับบัฟ · หลบได้ทุกแบบ): ไม้ถูพื้น 2 + ห้ามใช้สกิล 1 เทิร์น พื้นเปียกในแนวแห้ง · แจกัน 2 · ดูดฝุ่น 3 · ดาบ 4
//   ดาบเขม่า +1 ทั้งคู่ · เคทถือดาบตีปกติ = เป้ามืดบอด 1 เทิร์น · ในม่านตัวเอง = มืดบอดจนม่านหมด
//   แส้: ดึงเอมิลิโกะ = แต้มสกิล +1 · ศัตรู = พุ่งเข้าประชิด + ห้ามใช้สกิล 1 เทิร์น (ไม่มีดาเมจ · หลบได้)
// ============================================================

const Board = require("../server/board");
const Duo = require("../server/duo");

const MOP_DMG = 1;       // ไม้ถูพื้นไถลชน (ผู้ใช้สั่ง 2026-11-08: 2 → 1)
const VASE_PUSH = 3;
const VASE_RANGE = [1, 3]; // ผู้ใช้สั่ง 2026-11-08 (เดิม 4)
const COLLIDE_DMG = 1;
const VACUUM_RANGE = [1, 3];
const VACUUM_MAX = 2;   // ดาเมจเท่าระยะ สูงสุด 2 (ผู้ใช้สั่ง 2026-11-08: 3 → 2)
const SWORD_KATE = 1;
const SWORD_EMI = 1;    // ผู้ใช้สั่ง 2026-11-08 (เดิม 2)
const CHEER_LEN = 4;
// ร่าเริงสุดๆ — ดาเมจตายตัวตามอาวุธ (ผู้ใช้สั่ง 2026-11-08)
const CHEER_DMG = { mop: 2, vase: 2, vacuum: 3, sword: 4 };
const NOSKILL_KEY = "noskill";
const WHIP_SKILL = 1;   // แส้ดึงเอมิลิโกะ = แต้มสกิล +1
const WINGS_LEN = 4;
const MASK_KEY = "shadowMask";
const BREAD_HP = 2;
const BREAD_ARMOR = 1;
// เวลาฉาก (skillBeat — วินาทีก่อนผลลง/กลับมาคุมต่อ): ปีกเขม่าบิน · ม่านแดงปิดลง · ร่าเริงสุดๆ
const WINGS_BEAT = 1.8;
const STORM_BEAT = 4.2;
const CHEER_BEAT = 1.1;

const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const { dist } = Board; // ระยะแมนฮัตตัน (ช่องเดี่ยว)

// ---------- ตัวช่วย ----------
// ความเสียหายตายตัว (เกราะรับก่อน · ฆ่าได้) ในนามของ by → ดาเมจที่ลงจริง
function hurt(engine, by, t, n, label) {
  if (!t || !t.alive || n <= 0) return 0;
  const vit = (t.hp || 0) + (t.armor || 0);
  engine.withEffectSource(by, () => engine.dealMixed(t, n, true));
  t.wasAttacked = true;
  const dmg = Math.max(0, vit - ((t.hp || 0) + (t.armor || 0)));
  if (t.alive && t.hp <= 0) engine.withEffectSource(by, () => engine.instantDeath(t));
  engine.log(`${label} → ${t.name} -${dmg} (ลดเกราะก่อน)`);
  if (!t.alive) { engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); t.pos = null; }
  return dmg;
}
const enemyOf = (engine, a, b) => !!a && !!b && a.id !== b.id && !engine.sameTeam(a, b);
// ผลักเป้าไปตามทิศ dir ทีละช่อง steps ช่อง (ชน = หยุด + ดาเมจชน) · wet = ทางที่ผ่านเป็นพื้นเปียก
//  เข้าช่องที่ลื่นอยู่แล้ว (น้ำแข็ง/พื้นเปียกเดิม) = ไถลต่อตามกติกาน้ำแข็ง · คืน { moved, hit }
//  collide = ดาเมจตอนชน (0 = ไม่เสีย — แจกันตีปกติ)
function pushLine(engine, by, t, dir, steps, ctx, { wet = false, label = "ชน", collide = COLLIDE_DMG } = {}) {
  if (!t || !t.alive || !t.pos || steps <= 0) return { moved: 0, hit: null };
  if (engine.sizeOf(t) > 1) { ctx.events.push({ kind: "knock", id: t.id, from: { ...t.pos }, to: { ...t.pos }, collide: true }); return { moved: 0, hit: null }; }
  const trail = [];
  let moved = 0, hit = null, slick = false;
  for (let i = 0; i < steps; i++) {
    const from = { ...t.pos }, to = { x: from.x + dir.x, y: from.y + dir.y };
    if (!engine.tileFree(to.x, to.y, t.id)) {
      ctx.events.push({ kind: "knock", id: t.id, from, to, collide: true });
      hit = to;
      break;
    }
    slick = engine.isSlick(to.x, to.y);
    trail.push(from);
    t.pos = to;
    moved++;
    ctx.events.push({ kind: "knock", id: t.id, from, to: { ...to } });
    if (slick) break;
  }
  if (wet && trail.length) {
    const laid = engine.ice.layWet(trail);
    if (laid.length) ctx.events.push({ kind: "wet", tiles: laid });
  }
  if (hit && collide > 0) {
    const other = engine.boardUnits().find((u) => engine.players[u.id] && engine.players[u.id].pos && u.id !== t.id
      && hit.x >= u.x && hit.x < u.x + (u.size || 1) && hit.y >= u.y && hit.y < u.y + (u.size || 1));
    const dmg = hurt(engine, by, t, collide, `💥 ${t.name} ${label}`);
    ctx.events.push({ kind: "hit", id: t.id, by: by.id, x: t.pos ? t.pos.x : hit.x, y: t.pos ? t.pos.y : hit.y, dmg, kill: !t.alive });
    const o = other && engine.players[other.id];
    if (o && o.alive && enemyOf(engine, by, o)) {
      const d2 = hurt(engine, by, o, collide, `💥 ${o.name} ถูก ${t.name} ชน`);
      ctx.events.push({ kind: "hit", id: o.id, by: by.id, x: hit.x, y: hit.y, dmg: d2, kill: !o.alive });
    }
  }
  if (slick && t.alive && t.pos) engine.withEffectSource(by, () => engine.ice.resolveEntry(t, dir, ctx));
  return { moved, hit };
}
// ทิศออกจาก a ไปหา b (แกนที่ห่างกว่า · เท่ากัน = แกนตั้ง)
function awayDir(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.abs(dx) > Math.abs(dy)) return { x: Math.sign(dx), y: 0 };
  return { x: 0, y: Math.sign(dy) || 1 };
}
// ช่องว่างระหว่าง a กับ b ที่อยู่แนวเดียวกัน (ไม่รวมสองปลาย) · ไม่ตรงแนว = []
function lineBetween(engine, a, b) {
  if (a.x !== b.x && a.y !== b.y) return [];
  const dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y), out = [];
  for (let x = a.x + dx, y = a.y + dy; x !== b.x || y !== b.y; x += dx, y += dy) if (engine.tileFree(x, y)) out.push({ x, y });
  return out;
}
// ช่องติดตัว anchor ที่ว่างและใกล้ near ที่สุด (สำหรับดึง/ดูด/พุ่ง) · ไม่มี = null
function adjacentToward(engine, anchor, near, selfId) {
  const spots = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: anchor.x + dx, y: anchor.y + dy }))
    .filter((c) => engine.tileFree(c.x, c.y, selfId))
    .sort((a, b) => dist(a, near) - dist(b, near));
  return spots[0] || null;
}
// ใช้เครื่องดูดฝุ่น 1 ครั้ง · หมด = กลับไปถือไม้ถูพื้น (เลือกเครื่องดูดฝุ่นใหม่ไม่ได้ — canUseSkill)
function spendVacuum(engine, p, s) {
  s.vacuumLeft = Math.max(0, (s.vacuumLeft || 0) - 1);
  if (s.vacuumLeft > 0) { engine.log(`🔋 เครื่องดูดฝุ่นเหลือ ${s.vacuumLeft} ครั้ง`); return; }
  s.weapon = "mop";
  if (s.lastWeapon === "vacuum") s.lastWeapon = "mop";
  engine.log(`🪫 ${p.name} เครื่องดูดฝุ่นพลังงานหมด — กลับไปถือไม้ถูพื้น`);
  engine.boardFx("shadowFx", { kind: "weapon", id: p.id, weapon: "mop" });
  engine.sfx("ke_w_mop");
}
// สถานะ "1 เทิร์น" ที่ให้คนอื่น: เป้าเดินไปแล้ว (หรือกำลังเดิน) = อยู่ถึงเทิร์นหน้า (GRID_PLAN §7.4)
const oneTurn = (engine, t) => 1 + (engine.hasActed(t.id) || engine.actorId === t.id ? 1 : 0);
// ห้ามใช้สกิล 1 เทิร์น (ต้านสถานะได้) → ติดไหม
function silence(engine, by, t) {
  if (!t || !t.alive) return false;
  const ok = engine.withEffectSource(by, () => engine.applyDebuff(t, NOSKILL_KEY, 1, oneTurn(engine, t)));
  if (ok) engine.log(`🔇 ${t.name} ห้ามใช้สกิล 1 เทิร์น`);
  return !!ok;
}
// ย้ายคน from → to พร้อมเหตุการณ์ (ดูด/ดึง — ไม่ผ่านช่องกลาง)
function relocate(engine, u, to, ctx) {
  const from = { ...u.pos };
  u.pos = { ...to };
  ctx.events.push({ kind: "knock", id: u.id, from, to: { ...to } });
  engine.duo.moved(u);
}

// ฮุคตีปกติ/ติดตัวของทั้งสองตัว — st(p) = สถานะของคู่ (เก็บที่เคท) · weaponOf(p) = อาวุธที่เอมิลิโกะถือ (เคท = null)
function hooks({ isKate, isEmi, isPair, st, weaponOf }) {
  return {
    // ---------- ตีปกติ ----------
    range(p) {
      if (!isEmi(p)) return null;
      const w = weaponOf(p);
      return w === "vacuum" ? VACUUM_RANGE : w === "vase" ? VASE_RANGE : null;
    },
    damageBonus(engine, attacker) {
      if (!isPair(attacker)) return 0;
      const s = st(attacker);
      if (isKate(attacker)) return s.sword === "kate" ? SWORD_KATE : 0;
      return s.weapon === "sword" ? SWORD_EMI : 0;
    },
    attackFxNames(attacker) {
      if (!isPair(attacker)) return [];
      const s = st(attacker);
      if (isKate(attacker) && s.sword === "kate") return [`ดาบเขม่า +${SWORD_KATE}`];
      if (isEmi(attacker)) {
        if (s.weapon === "sword") return [`ดาบเขม่า +${SWORD_EMI}`];
        if (s.weapon === "vacuum") return ["เครื่องดูดฝุ่น"];
        if (s.weapon === "vase") return ["แจกันใส่น้ำ"];
      }
      return [];
    },
    // เครื่องดูดฝุ่น: ดาเมจ = ระยะห่าง สูงสุด 2 (ไม่รับบัฟ/คริติคอล)
    fixedStrikeDamage(engine, attacker, target) {
      if (!isEmi(attacker) || weaponOf(attacker) !== "vacuum" || !attacker.pos || !target.pos) return null;
      return Math.min(VACUUM_MAX, engine.boxDist ? engine.boxDist(attacker, target) : dist(attacker.pos, target.pos));
    },
    attackStyle(p) {
      if (isKate(p)) return "keKate";
      if (!isEmi(p)) return null;
      return { mop: "keMop", vase: "keVase", vacuum: "keVacuum", sword: "keSword" }[weaponOf(p)] || "keMop";
    },
    attackSound(p) {
      if (isKate(p)) return "ke_hit_kate";
      if (!isEmi(p)) return undefined;
      return `ke_hit_${weaponOf(p) || "mop"}`;
    },
    // เคทตีปกติ → เป้า "มืดบอด" (ต้านสถานะได้): ในม่านแดงของตัวเอง (ติดตัว) = จนม่านหมด · ถือดาบเขม่า = 1 เทิร์น
    onStrikeLanded(engine, attacker, target) {
      if (!isKate(attacker) || !target.alive) return [];
      const storm = engine.soot.ownStormOf(attacker);
      const turns = Math.max(storm ? storm.left : 0, st(attacker).sword === "kate" ? oneTurn(engine, target) : 0);
      if (turns <= 0) return [];
      if ((target.statuses[MASK_KEY] || 0) >= turns) return []; // ติดอยู่นานกว่าแล้ว
      if (!engine.applyDebuff(target, MASK_KEY, 1, turns)) return [];
      engine.log(`🌫️ ${target.name} มืดบอด — ใครเป็นใคร`);
      engine.boardFx("shadowFx", { kind: "masked", id: target.id });
      engine.sfx("ke_masked");
      return ["มืดบอด"];
    },
    // แจกัน: ผลักเป้า 3 ช่อง (ทางเป็นพื้นเปียก) · เครื่องดูดฝุ่น: ดูดเป้ามาติดตัว
    afterBoardAttack(engine, attacker, target, res) {
      if (!isEmi(attacker) || !res || res.dodge || !target.alive || !target.pos || !attacker.pos) return null;
      const w = weaponOf(attacker);
      if (w === "vase") {
        return () => {
          if (!target.alive || !target.pos) return;
          const ctx = engine.ice.begin();
          // น้ำสาดตามแนวตรงจากเอมิลิโกะถึงเป้า (ตีไกล) — ถือไม้ถูพื้นเดินเข้าทางเปียกแล้วไถลไปชนเป้าซ้ำได้
          const gap = lineBetween(engine, attacker.pos, target.pos);
          const wetGap = gap.length ? engine.ice.layWet(gap) : [];
          if (wetGap.length) ctx.events.push({ kind: "wet", tiles: wetGap });
          pushLine(engine, attacker, target, awayDir(attacker.pos, target.pos), VASE_PUSH, ctx, { wet: true, collide: 0 });
          engine.ice.flush(ctx);
          engine.sfx("ke_splash");
        };
      }
      if (w === "vacuum") {
        return () => {
          if (!target.alive || !target.pos || engine.sizeOf(target) > 1 || dist(attacker.pos, target.pos) <= 1) return;
          const to = adjacentToward(engine, attacker.pos, target.pos, target.id);
          if (!to) return;
          const ctx = engine.ice.begin();
          relocate(engine, target, to, ctx);
          engine.log(`🌀 ${attacker.name} ดูด ${target.name} เข้ามาติดตัว`);
          engine.ice.flush(ctx);
        };
      }
      return null;
    },
    // ตีปกติจบ (action.attackTarget — ตีคน/หนาม/ผนึก): เครื่องดูดฝุ่นหัก 1 ครั้ง
    afterStrike(engine, p) {
      if (isEmi(p) && weaponOf(p) === "vacuum") spendVacuum(engine, p, st(p));
    },
    // ---------- ไม้ถูพื้น: ไถลบนพื้นเปียก ----------
    slideStrikes(engine, p) { return isEmi(p) && weaponOf(p) === "mop"; },
    slideStrike(engine, p, t) {
      hurt(engine, p, t, MOP_DMG, `🧹 ${p.name} ไม้ถูพื้นไถลชน`);
      return { attack: false, knock: false, style: "mop" };
    },
    onSlide(engine, p, n, ctx) {
      if (!isEmi(p) || weaponOf(p) !== "mop") return;
      const ev = [...ctx.events].reverse().find((e) => e.kind === "slide" && e.id === p.id);
      if (!ev) return;
      const dried = engine.ice.dryWet(ev.path);
      if (dried.length) ctx.events.push({ kind: "dry", tiles: dried });
      engine.sfx("ke_slide");
    },
    // ขนมปัง (ของประจำตัวเอมิลิโกะ · shop.useInventoryItem): กินเอง หรือป้อนเคทที่ยืนติดกัน → ฟื้นพลังชีวิต 2 เกราะ 1 + ล้างดีบัฟ 1 ขั้น (ผู้ใช้สั่ง 2026-11-08)
    useBread(engine, p, item, opts = {}) {
      if (!isEmi(p) || !item || !(item.uses > 0)) return false;
      let t = p;
      if (opts.targetId && opts.targetId !== p.id) {
        const mate = Duo.partnerOf(p);
        if (!mate || opts.targetId !== mate.id || !mate.alive || !mate.pos || !p.pos || dist(p.pos, mate.pos) !== 1) return false;
        t = mate;
      }
      const hp = engine.healHp(t, BREAD_HP);
      const ar = engine.healArmor(t, BREAD_ARMOR);
      const cleansed = engine.cleanseOneStep(t);
      item.uses -= 1;
      engine.log(`🍞 ${p.name} ${t === p ? "กินขนมปัง" : `ป้อนขนมปังให้ ${t.name}`} — ฟื้นพลังชีวิต +${hp} เกราะ +${ar}${cleansed ? " · ล้างดีบัฟ 1 ขั้น" : ""} (เหลือ ${item.uses})`);
      engine.boardFx("shadowFx", { kind: "bread", by: p.id, id: t.id });
      engine.sfx("ke_revive");
      return true;
    },
    skillSound(p, tier, opts) {
      if (!isPair(p)) return null;
      if (tier === "basic") return "ke_revive";
      if (tier === "secondary") return opts && opts.form === "wings" ? "ke_wings" : opts && opts.form === "whip" ? "ke_whip" : null;
      if (tier === "ultimate") return isKate(p) ? null : "ke_cheer"; // เสียงระบำเขม่าเล่นในฉาก KateStorm (client) เองใต้เพลง
      return null;
    },
  };
}

// ---------- แส้เขม่า (เคท · ระยะ 3) ----------
//  เอมิลิโกะ = ดึงมาช่องติดตัวเคท + แต้มสกิล +1 · ศัตรู = เคทพุ่งไปช่องติดตัวเป้า แล้วห้ามใช้สกิล 1 เทิร์น (หลบได้ · ไม่มีดาเมจ)
//  เอมิลิโกะที่ถูกดึงยังคุมได้ตามปกติ (engine.duo.moved — เดินไปแล้ว = เดินต่อไม่ได้ · ตี/รอแล้ว = สลับไปไม่ได้อยู่แล้ว)
function whip(engine, p, t, { mate }) {
  if (!t || !t.pos || !p.pos) return "";
  const ctx = engine.ice.begin();
  if (mate && t.id === mate.id) {
    const to = adjacentToward(engine, p.pos, t.pos, t.id);
    if (!to) { engine.log(`🖤 ${p.name} ดึง ${t.name} ไม่ได้ — ไม่มีช่องว่าง`); return ""; }
    const from = { ...t.pos };
    relocate(engine, t, to, ctx);
    engine.boardFx("shadowFx", { kind: "whip", by: p.id, target: t.id, mode: "pull", from, to });
    const before = p.skillPoints;
    engine.addSkill(p, WHIP_SKILL);
    engine.log(`🖤 ${p.name} ใช้แส้เขม่าดึง ${t.name} มาข้างตัว — แต้มสกิล +${p.skillPoints - before}`);
    engine.ice.flush(ctx);
    return "";
  }
  const to = dist(p.pos, t.pos) <= 1 ? { ...p.pos } : adjacentToward(engine, t.pos, p.pos, p.id);
  if (!to) { engine.log(`🖤 ${p.name} พุ่งเข้าหา ${t.name} ไม่ได้ — ไม่มีช่องว่าง`); return ""; }
  const from = { ...p.pos };
  if (to.x !== from.x || to.y !== from.y) { p.pos = to; ctx.events.push({ kind: "slide", id: p.id, path: [from, to], n: 1 }); }
  const dodged = engine.skillDodge(p, t, "แส้เขม่า");
  t.wasAttacked = true;
  if (!dodged) silence(engine, p, t);
  engine.boardFx("shadowFx", { kind: "whip", by: p.id, target: t.id, mode: "dash", from, to, hitAt: { x: t.pos ? t.pos.x : to.x, y: t.pos ? t.pos.y : to.y }, dmg: 0, dodge: dodged });
  engine.ice.flush(ctx);
  return "";
}

// ---------- ปีกเขม่า (เคท · เลือกทิศ บิน 4) ----------
//  ข้ามทุกอย่าง · ช่องลงไม่ว่าง = บินต่อไปข้างหน้าจนเจอช่องว่าง (สุดกระดาน = ถอยกลับมาช่องว่างล่าสุด)
//  เอมิลิโกะติดตัว (4 ทิศ) = ยกไปด้วย ลงตำแหน่งเดิมเทียบกับเคท · ไม่ว่าง = ช่องว่างติด/ใกล้เคทที่สุด
function wings(engine, p, dirKey, mate) {
  const v = DIRS[dirKey];
  if (!v || !p.pos) return "";
  const map = engine.boardMap();
  const from = { ...p.pos };
  const carry = mate && mate.alive && mate.pos && dist(mate.pos, from) === 1 ? mate : null;
  const off = carry ? { x: carry.pos.x - from.x, y: carry.pos.y - from.y } : null;
  const inB = (x, y) => x >= 0 && y >= 0 && x < map.cols && y < map.rows;
  const free = (x, y) => engine.tileFree(x, y, p.id) || (carry && carry.pos.x === x && carry.pos.y === y && engine.tileFree(x, y, carry.id));
  let to = null;
  for (let i = WINGS_LEN; inB(from.x + v.x * i, from.y + v.y * i); i++) {
    if (free(from.x + v.x * i, from.y + v.y * i)) { to = { x: from.x + v.x * i, y: from.y + v.y * i }; break; }
  }
  for (let i = WINGS_LEN - 1; !to && i >= 1; i--) if (free(from.x + v.x * i, from.y + v.y * i)) to = { x: from.x + v.x * i, y: from.y + v.y * i };
  if (!to) { engine.log(`🪽 ${p.name} กางปีกเขม่าแต่ไม่มีที่ลง`); return ""; }
  // เอมิลิโกะลอยตามไปก่อน (ไม่นับว่ายืนขวางช่องลงของเคท)
  const carryFrom = carry ? { ...carry.pos } : null;
  if (carry) carry.pos = null;
  p.pos = to;
  let carryTo = null;
  if (carry) {
    const want = { x: to.x + off.x, y: to.y + off.y };
    carryTo = engine.tileFree(want.x, want.y, carry.id) ? want : (adjacentToward(engine, to, want, carry.id) || engine.nearFreeTile(to, carry.id) || carryFrom);
    carry.pos = carryTo;
    engine.duo.moved(carry);
  }
  engine.boardFx("shadowFx", { kind: "wings", id: p.id, from, to, dir: dirKey, carry: carry ? { id: carry.id, from: carryFrom, to: carryTo } : null });
  engine.log(`🪽 ${p.name} กางปีกเขม่าบินไป ${dist(from, to)} ช่อง${carry ? ` พา ${carry.name} ไปด้วย` : ""}`);
  engine.skillBeat(WINGS_BEAT, () => {}); // ให้ฉากบินเล่นจบก่อนกลับมาคุมต่อ
  return "";
}

// ---------- ท่าไม้ตาย (kate_emiliko.js applyInstantSkill เลือกตามตัว) ----------
// ระบำเขม่า (เคท): ม่านแดง 8×8 รอบช่องที่เลือก (ช่องกลางค่อนซ้ายบน) — ฉากใหญ่ ~4 วิ แล้วค่อยลงดาเมจ
function storm(engine, p, opts) {
  const area = { kind: "tile", square: 8 };
  const tiles = engine.tileArea(area, opts.tile);
  const s = engine.soot.cast(p, tiles);
  if (!s) return "";
  engine.boardFx("shadowFx", { kind: "storm", by: p.id, x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1, center: { ...opts.tile } });
  engine.log(`🌹 ${p.name} ระบำเขม่า — ม่านแดงปิดลง 3 เทิร์น`);
  engine.skillBeat(STORM_BEAT, () => {
    const hits = engine.soot.strikeInside(s);
    if (hits.length) engine.boardFx("shadowFx", { kind: "stormTick", hits });
  });
  return "";
}

// ร่าเริงสุดๆ (เอมิลิโกะ): แนว 4×3 ตามอาวุธ · s = สถานะของคู่ (st) · ดาเมจตายตัว CHEER_DMG (เกราะรับก่อน · หลบได้ทุกแบบ)
function cheer(engine, p, targets, opts, s) {
  const v = DIRS[opts.dir];
  if (!v || !p.pos) return "";
  const w = s.weapon;
  const tiles = engine.areaTiles(p, { kind: "line", len: CHEER_LEN, width: 3 }, opts.dir);
  const foes = (targets || []).map((id) => engine.players[id]).filter((t) => t && t.alive && t.pos && !engine.sameTeam(p, t));
  const along = (t) => (t.pos.x - p.pos.x) * v.x + (t.pos.y - p.pos.y) * v.y; // ระยะตามแนว (1..4)
  let dash = null;
  engine.boardFx("shadowFx", { kind: "cheer", id: p.id, weapon: w, dir: opts.dir, tiles, dash: null });
  engine.skillBeat(CHEER_BEAT, () => {
    const ctx = engine.ice.begin();
    const label = `✨ ${p.name} ร่าเริงสุดๆ`;
    const dmgOf = CHEER_DMG[w] || CHEER_DMG.mop;
    // ทอยหลบก่อน (ทุกสกิลหลบได้) · โดน = ดาเมจตายตัว → true = โดน
    const land = (t) => {
      t.wasAttacked = true;
      if (engine.skillDodge(p, t, "ร่าเริงสุดๆ")) return false;
      hurt(engine, p, t, dmgOf, label);
      return true;
    };
    if (w === "mop") {
      // ถูพื้นเปียกเดิมทั้งแนว 4×3 ก่อน (คนที่ถูกผลักไม่ไถลต่อ) → ผลักศัตรูทั้งแนวไปพ้นปลายแนว (ไกลสุดก่อน) · ดาเมจ 2 + ห้ามใช้สกิล 1 เทิร์น
      //  แล้วเอมิลิโกะพุ่งตาม (ไม่ต้องมีน้ำ)
      const dried = engine.ice.dryWet([{ ...p.pos }, ...tiles]);
      if (dried.length) ctx.events.push({ kind: "dry", tiles: dried });
      for (const t of foes.sort((a, b) => along(b) - along(a))) {
        if (!t.alive || !t.pos) continue;
        if (!land(t)) continue;
        if (t.alive) silence(engine, p, t);
        if (t.alive && t.pos) pushLine(engine, p, t, v, Math.max(0, CHEER_LEN + 1 - along(t)), ctx, { label: "กระแทกขณะถูกผลัก" });
      }
      const from = { ...p.pos };
      const path = [from];
      for (let i = 1; i <= CHEER_LEN; i++) {
        const nx = from.x + v.x * i, ny = from.y + v.y * i;
        if (!engine.tileFree(nx, ny, p.id)) break;
        path.push({ x: nx, y: ny });
      }
      if (path.length > 1) {
        p.pos = { ...path[path.length - 1] };
        ctx.events.unshift({ kind: "slide", id: p.id, path, n: path.length - 1 });
        dash = { from, to: { ...p.pos } };
      }
    } else if (w === "vase") {
      for (const t of foes.sort((a, b) => along(b) - along(a))) {
        if (!t.alive || !t.pos) continue;
        if (land(t) && t.alive && t.pos) pushLine(engine, p, t, v, VASE_PUSH, ctx, { wet: true, label: "กระแทกขณะถูกผลัก" });
      }
      // น้ำสาดทั่วแนว 4×3 → พื้นเปียกทั้งพื้นที่ (หลังผลัก — ไม่ทำให้คนที่ถูกผลักไถลเพิ่ม) · ไม่โดนใครก็เปียก
      const laid = engine.ice.layWet(tiles);
      if (laid.length) ctx.events.push({ kind: "wet", tiles: laid });
    } else if (w === "vacuum") {
      // ใกล้สุดก่อน: ดาเมจ 3 (หลบได้) แล้วดูดเข้ามาใกล้ที่สุดเท่าที่มีช่องว่าง
      for (const t of foes.sort((a, b) => dist(p.pos, a.pos) - dist(p.pos, b.pos))) {
        if (!t.alive || !t.pos) continue;
        if (!land(t)) continue;
        if (!t.alive || !t.pos || engine.sizeOf(t) > 1) continue;
        const back = { x: -v.x, y: -v.y };
        let steps = 0;
        while (dist(p.pos, t.pos) > 1 && steps < CHEER_LEN) {
          const nx = t.pos.x + back.x, ny = t.pos.y + back.y;
          if (!engine.tileFree(nx, ny, t.id)) break;
          const from = { ...t.pos };
          t.pos = { x: nx, y: ny };
          ctx.events.push({ kind: "knock", id: t.id, from, to: { ...t.pos } });
          steps++;
        }
      }
    } else {
      for (const t of foes) if (t.alive && t.pos) land(t);
    }
    engine.ice.flush(ctx);
    if (dash) engine.boardFx("shadowFx", { kind: "cheerDash", id: p.id, ...dash });
    if (w === "vacuum") spendVacuum(engine, p, s);
  });
  return "";
}

module.exports = { hooks, whip, wings, storm, cheer, CHEER_DMG, MOP_DMG, VACUUM_MAX, SWORD_EMI };
