// ============================================================
//  มิโดริยะ อิซึคุ (My Hero Academia) — id "midoriya_izuku" · กติกาที่ผู้ใช้ตัดสิน GRID_PLAN §7.33 (2026-11-15)
//
//  ค่าพื้นฐาน: ไม่ระบุ → ค่าตั้งต้น (HP 7 / เกราะ 3 + โบนัสกลาง +3/+2 = 10/5) · ระยะเดิน 4 · ตีประชิด [1, 1]
//
//  สกิลพื้นฐาน Smash (ไม่ใช้แต้ม — ราคาคือดาเมจเข้าตัวเอง · ปุ่มเลือก 5 แบบ · คูลดาวน์แยกแบบละ 2 เทิร์น · ธาตุลมทุกแบบ):
//    smash    กรวย 5   · โดนคนแรก 5 (PVE 10)          · ตัวเอง 5
//    throw    แนว 7×1  · ทุกคนในแนว 3 (PVE 6)         · ตัวเอง 2 · สละไอเทม 1 ชิ้นที่เลือก (ไม่มีไอเทม = ปิดแค่แบบนี้)
//    detroit  กรวย 6   · ทุกคนในกรวย 5 (PVE 10)       · ตัวเอง 6
//    delaware แนว 7×3  · ทุกคนในแนว 3 (PVE 6)         · ตัวเอง 3
//    million  กรวย 7   · โดนคนแรก 10 (PVE 40)         · ตัวเอง 14
//   กรวย = area line cone (แถว i กว้าง 2i−1 จากช่องติดตัว — server/board.js lineTiles)
//   "คนแรก" = ศัตรูที่ใกล้สุดตามแนวที่ต่อย (เท่ากัน = ใกล้แนวกลาง) · ศัตรูอื่นในกรวยโดนดาเมจตายตัวครึ่งหนึ่ง ปัดลง (ไม่รับบัฟพลังโจมตี · หลบได้)
//   ศัตรูทุกคนที่โดน (ไม่หลบ) ถูกผลักตามทิศไปจนถึงปลายระยะของท่า · ชนกำแพง/ขอบ/ตัวอื่น = หยุด (ไม่เสียเพิ่ม)
//   ดาเมจเข้าตัวเอง: หลังผลลง · ลดเกราะก่อน · ไม่พอ = ตาย · โดนเสมอ (หลบไม่ได้ · ไม่มีศัตรูในพื้นที่ก็โดน)
//   เพื่อนร่วมทีมไม่โดน/ไม่ถูกผลัก
//  สกิลรอง Full Cowl (6 แต้ม · 5 เทิร์น · คูลดาวน์ 3 เทิร์นนับหลังหมดผล — Claude ตัดสิน):
//    ดาเมจเข้าตัวเองของ Smash −2 (PVE −3) · ล้างดีบัฟ 2 อันล่าสุด → ต้านสถานะ 3 เทิร์น · เยียวยา 5 ครั้ง (1 หน่วย ×2 ติดตัว = 2/เทิร์น)
//  ท่าไม้ตาย: ยังไม่มี (ultimate: null)
//  ติดตัว One for All:
//    เยียวยาบนตัวเองฟื้น ×2 (ฮุค mendMult — characters/_universal_status.tickMend)
//    ระหว่าง Full Cowl การโจมตีทุกแบบ (ตีปกติ + Smash) เป็นธาตุลม แล้วติดคราบไฟฟ้าตาม (ไม่มีดาเมจเอง แต่ทำปฏิกิริยาได้)
//    ลบสกิลติดตัว (server/passiveSeal.js): เยียวยาไม่คูณ · ไม่ติดไฟฟ้าตาม · ตีปกติไม่เป็นลม (ลมของ Smash เป็นของสกิล — ยังอยู่)
//  PVE = สนาม Eos + Road Trip + Moon Cell
// ============================================================
const PassiveSeal = require("../server/passiveSeal");
const Board = require("../server/board");

const ID = "midoriya_izuku";
const DIR = "/characters/midoriya_izuku";
const IMG = {
  base: `${DIR}/midoriya.webp`,
  smash: `${DIR}/skill1.webp`,
  cowl: `${DIR}/skill2.webp`,
};
const FX = "midoriyaFx";
// คลิป (ไฟล์จากผู้ใช้ 2026-11-15 · บีบ crf 23): ทุกแบบเล่นทุกครั้ง (1,000,000% เดิมครั้งแรก → ทุกครั้ง ผู้ใช้สั่ง 2026-11-16)
//  กฎผู้ใช้: action ที่ขึ้นวีดีโอ ห้ามมีเสียงเอฟเฟกต์ตัดหน้า/ซ้อน — ผลบนกระดานลงหลังคลิป
const VIDEO = { smash: `${DIR}/smash.mp4`, throw: `${DIR}/throw.mp4`, detroit: `${DIR}/detroit.mp4`, delaware: `${DIR}/delaware.mp4`, million: `${DIR}/million.mp4` };
const CUT = { smash: "midoriyaSmash", throw: "midoriyaThrow", detroit: "midoriyaDetroit", delaware: "midoriyaDelaware", million: "midoriyaMillion" };
const CLIP_SEC = { smash: 6.6, throw: 5.6, detroit: 7.3, delaware: 6.4, million: 24.3 };
// เสียง (client/src/audio.js): สังเคราะห์ .claude/plans/midoriya-sfx.py · million = ตัดจากคลิปของผู้ใช้ (ตอนนี้ไม่ได้ใช้บนกระดาน — คลิปเล่นทุกครั้ง · หน้าทดสอบยังใช้)
const SFX = { punch: "midoriya_punch", punchCowl: "midoriya_punch_cowl", cowl: "midoriya_cowl", recoil: "midoriya_recoil", million: "midoriya_million", storm: "midoriya_smash_storm", millionStorm: "midoriya_million_storm" };
const PASSIVE = "One for All";
const COWL_NAME = "Full Cowl";

const FORMS = {
  smash: { name: "Smash", dmg: 5, pve: 12, self: 5, pveSelf: 2, pveCd: 1, area: { kind: "line", cone: true, len: 5, width: 1, hostile: true } },
  throw: { name: "Smash (ปาของ)", dmg: 3, pve: 10, self: 2, item: true, area: { kind: "line", len: 7, width: 1, hostile: true } },
  detroit: { name: "Detroit Smash", dmg: 5, pve: 22, self: 6, pveBump: 6, pvePierce: true, area: { kind: "line", cone: true, len: 6, width: 1, hostile: true } },
  delaware: { name: "Delaware Smash", dmg: 3, pve: 10, self: 3, area: { kind: "line", len: 7, width: 3, hostile: true } },
  million: { name: "1,000,000% Delaware Detroit Smash", dmg: 10, pve: 60, self: 14, pvePierce: true, area: { kind: "line", cone: true, len: 7, width: 1, hostile: true } },
};
const ORDER = ["smash", "throw", "detroit", "delaware", "million"];
const SMASH_CD = 2;
const COWL = { pveDmg: 4, sp: 6, turns: 5, cd: 3, cut: 2, cutPve: 3, resist: 3, cleanse: 2, mend: 1 };
const MEND_MULT = 2;
// จังหวะฉาก (วินาที) — client MIDORIYA_T ต้องตรงกัน (ms)
const T = { smash: 0.55, million: 1.6 };
const BOUND = new Set(["kebread", "giornoArrow", "lawHeart"]); // ไอเทมประจำตัวละครอื่น — ปาไม่ได้

const isMe = (p) => !!p && p.characterId === ID && !p.summon;
const matchOf = () => require("../server/match");
const round = () => matchOf().roundNumber || 0;
const cdLeft = (ready, r) => Math.max(0, (ready || 0) - r);
function fresh() {
  return {
    ready: { smash: 0, throw: 0, detroit: 0, delaware: 0, million: 0 }, // Smash แต่ละแบบกดได้เมื่อ roundNumber >= ค่านี้
    cowlEnd: 0, cowlSever: 0, cowlReady: 0, // Full Cowl ทำงานเมื่อ roundNumber < cowlEnd · กดได้อีกเมื่อ >= cowlReady
  };
}
function st(p) { return p.midoriya || (p.midoriya = fresh()); }
const cowlOn = (p, r = round()) => isMe(p) && r < st(p).cowlEnd;
const pve = () => { const M = require("../server/pveMode"); return M.isPveCoop() || M.isMoon(); };
const passiveOn = (p) => PassiveSeal.on(p);
const dmgOf = (f) => (pve() ? f.pve : f.dmg);
const cutOf = (p) => (cowlOn(p) ? (pve() ? COWL.cutPve : COWL.cut) : 0);
// PVE (Eos/Moon — ผู้ใช้เลือก 2026-11-16): Smash = ท่าเก็บลูกกระจ๊อก (12 · ตัวเอง 2 · คูลดาวน์ 1) · Detroit = ท่าตีตัวใหญ่ (22 · ชน +6 · ทะลุเกราะ) · 1,000,000% 60 ทะลุเกราะ
const selfOf = (f) => (pve() && f.pveSelf != null ? f.pveSelf : f.self);
const cdOf = (f) => (pve() && f.pveCd ? f.pveCd : SMASH_CD);
const bumpOf = (f) => (pve() && f.pveBump) || 0;
const pierceOf = (f) => pve() && !!f.pvePierce;
// ดาเมจของท่า: PVE ระหว่าง Full Cowl +4 (ผู้ใช้เลือก 2026-11-16)
const powerOf = (p, f) => dmgOf(f) + (pve() && cowlOn(p) ? COWL.pveDmg : 0);
const recoilOf = (p, f) => Math.max(0, selfOf(f) - cutOf(p));
// form ของปุ่ม: "smash" / "throw:<uid>" / "detroit" / "delaware" / "million"
function parseForm(form) {
  const s = String(form || "");
  if (s.startsWith("throw:")) return { key: "throw", uid: s.slice(6) };
  return FORMS[s] && s !== "throw" ? { key: s, uid: null } : null;
}
const throwables = (p) => (p.inventory || []).filter((it) => it && !BOUND.has(it.type));
function itemName(it) {
  try { return require("../server/shop").shopItemName(it); } catch { return "ไอเทม"; }
}
function cowlCdLeft(p, r = round()) { return cowlOn(p, r) ? 0 : cdLeft(st(p).cowlReady, r); }

// ---------- เอฟเฟกต์ ----------
function watchers(engine, p) {
  return Object.values(engine.players).filter((o) => !o.duoOf && !o.summon && (o.id === p.id || !engine.hiddenFrom(o, p))).map((o) => o.id);
}
function fx(engine, p, kind, extra = {}) {
  if (!p.pos) return;
  engine.boardFxTo(watchers(engine, p), FX, { kind, id: p.id, at: { ...p.pos }, ...extra });
}

// ---------- ดาเมจ ----------
// ไฟฟ้าตามหลังลม (One for All ระหว่าง Full Cowl) — แปะคราบอย่างเดียว ทำปฏิกิริยาได้
function boltTag(engine, p, t) {
  if (!cowlOn(p) || !passiveOn(p) || !t || !t.alive || !t.pos) return null;
  return require("../server/element").apply(t, "bolt", p);
}
// ดาเมจเข้าตัวเอง: ลดเกราะก่อน · ไม่ผ่านด่านหลบ/ลดดาเมจ · ไม่พอ = ตาย
function selfHurt(engine, p, n) {
  if (!(n > 0) || !p.alive) return 0;
  let done = 0;
  engine.withEffectSource(null, () => {
    for (let i = 0; i < n && p.alive; i++) {
      if (p.armor > 0) engine.loseArmor(p); else engine.loseHp(p);
      done++;
    }
  });
  if (p.alive && p.hp <= 0) {
    engine.instantDeath(p);
    if (!p.alive) engine.log(`💀 ${p.name} ร่างกายรับแรงไม่ไหว ตกรอบ!`);
  }
  if (!p.alive) p.pos = null;
  return done;
}
// ผลักไปชน (Detroit · PVE): ดาเมจตายตัวเพิ่ม · ทะลุเกราะตามท่า · ไม่ทอยหลบซ้ำ (ต่อจากหมัดที่โดนแล้ว)
function bumpHit(engine, p, t, n, name, pierce) {
  if (!t.alive || !t.pos) return;
  if (pierce) engine.dealDirect(t, n, false); else engine.dealMixed(t, n, false);
  engine.log(`${p.name} ${name} → ${t.name} กระแทก -${n}`);
  if (t.alive && t.hp <= 0) {
    engine.instantDeath(t);
    if (!t.alive) engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`);
  }
  if (!t.alive) t.pos = null;
}
// ระยะตามแนวที่ต่อย (แถวที่เท่าไรนับจากขอบตัว) และระยะห่างจากแนวกลาง
function rowOf(engine, p, t, v) {
  const n = engine.sizeOf(p), c = Math.floor((n - 1) / 2);
  const cx = p.pos.x + c, cy = p.pos.y + c;
  const edge = v[0] + v[1] > 0 ? n - 1 - c : c;
  const dx = Board.wdx ? Board.wdx(cx, t.pos.x) : t.pos.x - cx, dy = t.pos.y - cy;
  return { along: dx * v[0] + dy * v[1] - edge, side: Math.abs(dx * -v[1] + dy * v[0]) };
}

// ---------- ลงผล Smash ----------
function castSmash(engine, p, key, item, targets, dir) {
  const f = FORMS[key];
  const v = Board.LINE_DIRS[dir];
  if (!f || !v || !p.pos) return "";
  const s = st(p), r = engine.roundNumber;
  s.ready[key] = r + cdOf(f);
  if (item) {
    const idx = (p.inventory || []).findIndex((it) => it.uid === item.uid);
    if (idx >= 0) p.inventory.splice(idx, 1);
  }
  const area = f.area;
  const tiles = Board.lineTiles(engine.boardMap(), p.pos.x, p.pos.y, dir, area.len, area.width, engine.sizeOf(p), 0, !!area.cone);
  const foes = (targets || []).map((id) => engine.players[id]).filter((t) => t && t.alive && t.pos && t.id !== p.id && !engine.sameTeam(p, t));
  // ทุกแบบโดนศัตรูทุกคนในพื้นที่ (ผู้ใช้ 2026-11-16) · ลงดาเมจใกล้ก่อน
  const ranked = foes.map((t) => ({ t, ...rowOf(engine, p, t, v) })).sort((a, b) => a.along - b.along || a.side - b.side || (a.t.id < b.t.id ? -1 : 1));
  const recoil = recoilOf(p, f);
  engine.log(`💥 ${p.name} ${f.name}${item ? ` — ปา${itemName(item)}` : ""}`);
  // คลิป → ผลบนกระดาน (เอฟเฟกต์ + จังหวะพัก + ดาเมจ) หลังคลิปจบ
  if (!p.cutsceneShown) p.cutsceneShown = {};
  const clip = true; // ทุกแบบเล่นคลิปทุกครั้ง (ผู้ใช้สั่ง 2026-11-16)
  const land = () => {
    // เสียงโจมตีบนกระดาน (หลังคลิปจบ — ไม่ซ้อนวีดีโอ · ผู้ใช้ขอ): 1,000,000% ไม่มีคลิป = เสียงไคลแมกซ์จากคลิป · ที่เหลือ = ลมระเบิดสังเคราะห์
    engine.sfx(key === "million" ? (clip ? SFX.millionStorm : SFX.million) : SFX.storm);
    landSmash(engine, p, key, f, item, ranked, foes, tiles, recoil, dir, v, area);
  };
  if (clip) {
    p.cutsceneShown[CUT[key]] = true;
    engine.queueCutscene(p, CUT[key]);
    engine.deferAfterCutscene(land);
  } else land();
  return item ? ` · ${itemName(item)}` : "";
}
function landSmash(engine, p, key, f, item, ranked, foes, tiles, recoil, dir, v, area) {
  if (!p.alive || !p.pos) return;
  fx(engine, p, "smash", { form: key, dir, tiles, item: item ? { type: item.type } : null, cowl: cowlOn(p) });
  const beat = key === "million" ? T.million : T.smash;
  engine.skillBeat(beat, () => {
    if (!p.alive || !p.pos) return;
    const landed = [];
    const hits = [];
    engine.withEffectSource(p, () => {
      ranked.forEach(({ t }) => {
        if (!t.alive || !t.pos) return;
        const res = engine.skillStrike(p, t, f.name, { bonus: powerOf(p, f) - 1, pierce: pierceOf(f) });
        if (res && !res.dodge && !res.blocked) {
          boltTag(engine, p, t);
          if (t.alive && t.pos) landed.push(t);
        }
        hits.push({ id: t.id, dmg: res ? res.dmg : 0, dodge: !!(res && res.dodge) });
      });
      // ผลักไปจนถึงปลายระยะของท่า — ไกลสุดก่อน (คนหน้าไม่ชนคนหลังที่กำลังจะถูกผลัก)
      const order = landed.map((t) => ({ t, along: rowOf(engine, p, t, v).along })).sort((a, b) => b.along - a.along);
      const ctx = engine.ice.begin();
      const bumped = [];
      for (const { t, along } of order) {
        const n = area.len - along;
        if (!(n > 0 && t.alive && t.pos)) continue;
        const mark = ctx.events.length;
        engine.ice.pushUnit(t, { x: v[0], y: v[1] }, ctx, n);
        // ชนกำแพง/ขอบแมพ/ตัวอื่น (หรือตัวใหญ่ผลักไม่ไป) ก่อนถึงปลายระยะ
        if (ctx.events.slice(mark).some((e) => e.kind === "knock" && e.id === t.id && e.collide)) bumped.push(t);
      }
      engine.ice.flush(ctx);
      const bump = bumpOf(f);
      if (bump > 0) for (const t of bumped) bumpHit(engine, p, t, bump, f.name, pierceOf(f));
    });
    require("../server/skills").hitArea(p, tiles, foes.map((t) => t.id));
    fx(engine, p, "smashHit", { form: key, dir, hits });
    const lost = selfHurt(engine, p, recoil);
    if (lost > 0 || recoil > 0) {
      fx(engine, p, "recoil", { form: key, n: lost, dead: !p.alive });
      if (lost > 0) engine.sfx(SFX.recoil); // หลังคลิปจบแล้วเสมอ (ไม่ซ้อนวีดีโอ)
      engine.log(`🩸 ${p.name} ร่างกายรับแรง ${f.name} — เสียหาย ${recoil}`);
    }
  });
}

function castCowl(engine, p) {
  const s = st(p), r = engine.roundNumber;
  const cleansed = [];
  for (let i = 0; i < COWL.cleanse; i++) {
    const k = engine.cleanseLatestDebuff(p);
    if (!k) break;
    cleansed.push(k);
  }
  engine.applyBuff(p, "resist", null, COWL.resist);
  engine.applyMend(p, COWL.mend, COWL.turns);
  s.cowlEnd = r + COWL.turns;
  s.cowlReady = s.cowlEnd + COWL.cd;
  s.cowlSever = engine.severStamp();
  fx(engine, p, "cowl");
  engine.log(`⚡ ${p.name} ${COWL_NAME} — ${COWL.turns} เทิร์น · ต้านสถานะ ${COWL.resist} เทิร์น${cleansed.length ? ` · ล้างดีบัฟ ${cleansed.length} อย่าง` : ""}`);
  return "";
}
function endCowl(engine, p, why) {
  const s = st(p), r = engine.roundNumber;
  if (!(r < s.cowlEnd)) return;
  s.cowlEnd = r;
  s.cowlReady = r + COWL.cd;
  engine.log(why === "sever" ? `⚡ ${COWL_NAME}ของ ${p.name} ถูกตัด` : `⚡ ${COWL_NAME}ของ ${p.name} หมดลง`);
}

function smashDesc(p, key, item) {
  const f = FORMS[key], dmg = powerOf(p, f), recoil = recoilOf(p, f);
  const a = f.area, shape = a.cone ? `กรวย ${a.len}` : `แนว ${a.len}×${a.width}`;
  const hit = `ศัตรูทุกคนเสียหาย ${dmg}${pierceOf(f) ? " ทะลุเกราะ" : ""}${bumpOf(f) ? ` · ชนเพิ่ม ${bumpOf(f)}` : ""}`;
  return `${item ? `ปา${itemName(item)} · ` : ""}ธาตุลม · ${shape} · ${hit} · ผลักไปสุดระยะ · ตัวเองเสียหาย ${recoil} (คูลดาวน์ ${cdOf(f)} เทิร์น)`;
}

module.exports = {
  id: ID,
  IMG, FX, SFX, VIDEO, CUT, CLIP_SEC, FORMS, ORDER, SMASH_CD, COWL, MEND_MULT, T, PASSIVE, COWL_NAME,
  isMe, cowlOn, parseForm, recoilOf, dmgOf, cdOf, bumpOf, powerOf, pierceOf,

  resetCombat(p) {
    p.midoriya = isMe(p) ? fresh() : null;
  },

  // ---------- ติดตัว ----------
  mendMult(p) { return isMe(p) && passiveOn(p) ? MEND_MULT : 1; },
  attackElement(engine, p) { return cowlOn(p) && passiveOn(p) ? "wind" : null; },
  skillElement(engine, p, tier) { return isMe(p) && tier === "basic" ? "wind" : null; },
  onStrikeLanded(engine, attacker, target) {
    if (!isMe(attacker) || !target || !target.alive || !cowlOn(attacker) || !passiveOn(attacker)) return [];
    boltTag(engine, attacker, target);
    return [];
  },
  attackSound(p) { return isMe(p) ? (cowlOn(p) ? SFX.punchCowl : SFX.punch) : undefined; },
  skillSound(p, tier) { return isMe(p) && tier === "secondary" ? SFX.cowl : null; }, // Smash: เสียงมากับคลิป (ห้ามเสียงเอฟเฟกต์ซ้อน)
  attackStyle(p) { return isMe(p) ? (cowlOn(p) ? "midoriyaPunchCowl" : "midoriyaPunch") : null; },

  // ---------- ปุ่มสกิล ----------
  skillPub(p, tier) {
    if (!isMe(p) || tier !== "basic") return null;
    const s = st(p), r = round();
    const choice = (key, extra = {}) => {
      const cd = cdLeft(s.ready[key], r);
      return { key, name: FORMS[key].name, img: IMG.smash, cost: 0, free: true, area: FORMS[key].area, cd, locked: cd > 0, desc: smashDesc(p, key), ...extra };
    };
    const items = throwables(p);
    const throwChoices = items.length
      ? items.map((it) => {
        const c = choice("throw");
        return { ...c, key: `throw:${it.uid}`, item: { ...it }, img: undefined, desc: smashDesc(p, "throw", it) };
      })
      : [{ ...choice("throw"), key: "throw:none", locked: true }];
    return {
      choices: [choice("smash"), ...throwChoices, choice("detroit"), choice("delaware"), choice("million")],
    };
  },
  skillFree(p, tier) { return isMe(p) && tier === "basic"; },
  skillArea(p, tier, area, opts = {}) {
    if (!isMe(p) || tier !== "basic") return area;
    const f = parseForm(opts.form);
    return f ? FORMS[f.key].area : area;
  },
  skillLocks(engine, p) {
    if (!isMe(p)) return undefined;
    const r = engine.roundNumber, cd = cowlCdLeft(p, r);
    return { secondary: { cd, locked: cd > 0 || cowlOn(p, r) } };
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return true;
    const r = engine.roundNumber;
    if (tier === "basic") {
      const f = parseForm(opts.form);
      if (!f || !p.pos) return false;
      if (cdLeft(st(p).ready[f.key], r) > 0) return false;
      if (f.key === "throw") return throwables(p).some((it) => it.uid === f.uid);
      return true;
    }
    if (tier === "secondary") return !cowlOn(p, r) && cowlCdLeft(p, r) === 0;
    return false;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return "";
    if (tier === "basic") {
      const f = parseForm(opts.form);
      if (!f) return "";
      const item = f.key === "throw" ? throwables(p).find((it) => it.uid === f.uid) : null;
      return castSmash(engine, p, f.key, item, targets, opts.dir);
    }
    if (tier === "secondary") return castCowl(engine, p);
    return "";
  },

  // ---------- จังหวะเทิร์น ----------
  onRoundStartTick(engine, p) {
    if (!isMe(p) || !p.alive) return;
    const s = st(p);
    if (s.cowlEnd && engine.roundNumber === s.cowlEnd) engine.log(`⚡ ${COWL_NAME}ของ ${p.name} หมดลง`);
  },
  onDeath(engine, p) {
    if (!isMe(p)) return;
    const s = st(p);
    if (s.cowlEnd > engine.roundNumber) { s.cowlEnd = engine.roundNumber; s.cowlReady = engine.roundNumber + COWL.cd; }
  },

  // ---------- ผลสกิลที่ตัดได้ (server/sever.js) ----------
  severables(engine, p) {
    if (!isMe(p) || !p.alive || !cowlOn(p)) return [];
    return [{ key: "cowl", label: COWL_NAME, at: st(p).cowlSever, cancel: () => endCowl(engine, p, "sever") }];
  },

  // ---------- ข้อมูลให้ client ----------
  midoriyaState(engine, p) {
    if (!isMe(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      cowl: cowlOn(p, r) ? s.cowlEnd - r : 0,
      cowlCd: cowlCdLeft(p, r),
      cd: Object.fromEntries(ORDER.map((k) => [k, cdLeft(s.ready[k], r)])),
    };
  },
};
