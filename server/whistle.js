// ============================================================
//  นกหวีดอัญเชิญมนต์อสูรเทพ — ช่องพิเศษที่ 6 ของกระเป๋า (ผู้ใช้ส่งสเปก 2026-11-03)
//  ทุกคนมี (ไม่กินช่องกระเป๋า · ทิ้ง/ให้/แลกไม่ได้) · เป่าได้เฉพาะตาเดินของตัวเอง = แบบไอเทม (เดินต่อไม่ได้ · ยังตี/ใช้สกิลได้)
//  โอกาสติด: ปกติ 20% · พลังชีวิตต่ำกว่าครึ่งของเลือดสูงสุด (maxHpOf — ตัวที่เลือดไม่เท่าคนอื่นคิดตามสัดส่วน) 70% · เหลือ 1 = 100%
//  ไม่ติด = เสียพลังชีวิต 1 ไม่สนเกราะ (loseHp) + คูลดาวน์ 1 เทิร์น · ติด = สุ่มมนต์ 1 ใน 4 (ผู้ใช้เลือก) + คูลดาวน์ 10 เทิร์น
//  คูลดาวน์ N = เป่าเทิร์น R → เป่าได้อีกเทิร์น R + N + 1 (p.whistleReady · ระบบคู่ใช้ร่วม — server/duo.js SHARED)
//  ผลทุกมนต์ไม่โดนตัวเอง/เพื่อนร่วมทีม (combat.sameTeam) · คนละชั้นมิติไม่โดน (Dim.same)
//   crossWinds   ผลักศัตรูออกห่างผู้เป่าจนสุดแนว (Ice.pushUnit) → ชนแล้วหยุด = ถูกตรึง 1 เทิร์น
//   tsunami      รวบศัตรูเข้าใกล้กลางแผนที่ที่สุด + พื้นเปียกกระจายทั่วแผนที่
//   diamondDust  ศัตรูติดเชื่องช้า 3 เทิร์น (ผู้ใช้: "แช่แข็ง" = เชื่องช้า) + ธารน้ำแข็งกระจายทั่วแผนที่ (ไม่ละลาย — perm)
//   judgmentBolt ศัตรูติดสตั้น 1 เทิร์น + พื้นไฟกระจายทั่วแผนที่ (จบตาบนช่อง = ลุกไหม้ 2 · ทีมผู้เป่าไม่โดน — ผู้ใช้เลือก)
//  พื้นทั้งหมดอยู่ในชั้นของ match.board → หายเมื่อเปลี่ยนแผนที่ (placeOnBoard ตั้ง match.board ใหม่)
//  ลำดับ: คลิปเต็มจอ (ทุกครั้งที่ติด — ผู้ใช้สั่ง) → ฉากมนต์ลงกระดาน (socket "divineFx" · จังหวะพัก) → ผลจริง (iceFx) → กลับตาเดิน
// ============================================================
Object.assign(module.exports, { chanceOf, cooldownLeft, canBlow, blow, cast, publicOf, flameEnd });

const Board = require("./board");
const match = require("./match");
const { engine } = require("./engine");
const combat = require("./combat");
const action = require("./phases/action");
const cutscene = require("./cutscene");
const view = require("./view");
const Visibility = require("./visibility");
const Ice = require("./ice");
const Dim = require("./dimension");
const { applyBurn } = require("../characters/_universal_status");

const WHISTLE = {
  chance: 20, lowChance: 70, lastChance: 100, // %
  failCd: 1, successCd: 10, failDmg: 1,
  rootTurns: 1, slowTurns: 3, stunTurns: 1, burnTurns: 2,
  groundTurns: 5, // พื้นน้ำแข็ง/ไฟ/เปียกของมนต์อยู่ 5 จบเทิร์นแล้วหาย (ผู้ใช้สั่ง 2026-11-10 — เดิมถาวรจนเปลี่ยนแผนที่)
  wetShare: 0.4, iceShare: 0.5, flameShare: 0.4, // สัดส่วนช่องโล่งของแผนที่ที่กลายเป็นพื้นของมนต์
};
// key = คีย์คลิปใน TRANSFORMS (characters/_transforms.js)
const SPELLS = {
  crossWinds:   { name: "Cross Winds",   cut: "divineCrossWinds" },
  tsunami:      { name: "Tsunami",       cut: "divineTsunami" },
  diamondDust:  { name: "Diamond Dust",  cut: "divineDiamondDust" },
  judgmentBolt: { name: "Judgment Bolt", cut: "divineJudgmentBolt" },
};
const SPELL_KEYS = Object.keys(SPELLS);
Object.assign(module.exports, { SPELLS, WHISTLE });
// ฉากมนต์บนกระดานก่อนผลลง (วินาที — ตรงกับ client/src/board/divineFx.js DIVINE_FX_DUR ช่วงก่อน "land")
const INTRO_SECONDS = { crossWinds: 1.1, tsunami: 1.4, diamondDust: 1.2, judgmentBolt: 1.3 };

// โอกาสติด (%)
function chanceOf(p) {
  if (!p) return 0;
  const hp = p.hp | 0;
  if (hp <= 1) return WHISTLE.lastChance;
  if (hp < combat.maxHpOf(p) / 2) return WHISTLE.lowChance;
  return WHISTLE.chance;
}
function cooldownLeft(p) { return Math.max(0, ((p && p.whistleReady) || 0) - match.roundNumber); }
// state ส่วนตัว (view.js) → client BagScreen ช่องที่ 6
function publicOf(p) { return { cd: cooldownLeft(p), chance: chanceOf(p) }; }

function canBlow(p) {
  if (!p || !p.alive || p.summon || !action.canAct(p)) return false;
  if (((p.statuses && p.statuses.sleep) || 0) > 0) return false;
  return cooldownLeft(p) === 0;
}

// dev: ECHO_DEV_WHISTLE=<มนต์> = ติดทุกครั้งเป็นมนต์นั้น · "any" = ติดทุกครั้ง สุ่มมนต์ · "cycle" = ติดทุกครั้ง ไล่มนต์ตามลำดับ ไม่มีคูลดาวน์
let devCycle = 0;
function devForce() {
  const v = process.env.ECHO_DEV_WHISTLE;
  if (!v) return null;
  if (v === "cycle") return SPELL_KEYS[devCycle++ % SPELL_KEYS.length];
  return SPELLS[v] ? v : "any";
}
function blow(id) {
  const p = match.players[id];
  if (!canBlow(p)) return false;
  action.lockMove(p);
  const forced = devForce();
  const hit = forced || Math.random() * 100 < chanceOf(p);
  if (!hit) {
    engine.sfx("divine_whistle"); // เสียงนกหวีดเฉพาะตอนเป่าไม่ติด (ติด = คลิปเล่นทันที ไม่ต้องมีเสียงนำ — ผู้ใช้สั่ง)
    p.whistleReady = match.roundNumber + WHISTLE.failCd + 1;
    combat.loseHp(p); // ไม่สนเกราะ
    match.lastLog.push(`📯 ${p.name} เป่านกหวีดอัญเชิญมนต์อสูรเทพ — ไม่มีสิ่งใดตอบรับ (พลังชีวิต -${WHISTLE.failDmg})`);
    if (p.alive && p.hp <= 0) {
      combat.instantDeath(p);
      if (!p.alive) match.lastLog.push(`💀 ${p.name} เลือดจริงหมด ตกรอบ!`);
    }
    if (!p.alive) { action.finishActor(); return true; }
    view.broadcastState();
    return true;
  }
  p.whistleReady = process.env.ECHO_DEV_WHISTLE === "cycle" ? 0 : match.roundNumber + WHISTLE.successCd + 1;
  const spell = forced && forced !== "any" ? forced : SPELL_KEYS[Math.floor(Math.random() * SPELL_KEYS.length)];
  const S = SPELLS[spell];
  Visibility.onHostileAct(p, "item");
  match.lastLog.push(`📯 ${p.name} เป่านกหวีดอัญเชิญมนต์อสูรเทพ — ${S.name}!`);
  // คลิปเต็มจอทุกครั้งที่เป่าติด (ผู้ใช้สั่ง 2026-11-03)
  engine.queueCutscene(p, S.cut);
  // หลังคลิป: ฉากมนต์บนกระดาน (พัก) → ผลจริง + เหตุการณ์ขยับตัว (พักตามเวลาแอนิเมชัน) → กลับตาเดินเวลาที่เหลือ
  match.afterCutscene.push(() => {
    const seq = (match.divineSeq = (match.divineSeq || 0) + 1);
    engine.boardFx("divineFx", { seq, spell, by: p.id, at: p.pos ? { ...p.pos } : null, size: action.sizeOf(p) });
    engine.sfx(`divine_${spell}`);
    engine.skillBeat(INTRO_SECONDS[spell], () => {
      const ctx = combat.withEffectSource(p, () => cast(p, spell, seq));
      view.broadcastState();
      engine.skillBeat(Math.max(1.2, Ice.fxSeconds(ctx)), () => {});
    });
  });
  cutscene.pausePlayingForCutscene(null);
  return true;
}

// ---------- ผลของมนต์ ----------
function enemiesOf(p) {
  return Object.values(match.players).filter((u) => u && u.alive && u.pos && u.id !== p.id
    && !combat.sameTeam(p, u) && Dim.same(p, u));
}
// สถานะ N เทิร์นแบบ "เต็ม": เป้าที่เดินไปแล้ว/กำลังเดินในเทิร์นนี้ +1 (แบบตรึงของเกรย์)
function debuffFor(t, key, turns) {
  const acted = action.hasActed(t.id) || match.actorId === t.id;
  return combat.applyDebuff(t, key, 1, turns + (acted ? 1 : 0));
}
const centerOf = (u) => { const n = action.sizeOf(u); return { x: u.pos.x + (n - 1) / 2, y: u.pos.y + (n - 1) / 2 }; };
// ช่องโล่ง (ไม่ใช่สิ่งกีดขวาง/ร้านค้า/ช่องพิเศษ/จุดฟื้นฟู) สุ่มตามสัดส่วน
function plainTiles(share) {
  const map = action.boardMap();
  const out = [];
  for (let y = map.minRow | 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    const k = Board.key(x, y);
    if (map.terrain[k] || (map.special && map.special[k]) || (map.heal && map.heal.has && map.heal.has(k))) continue;
    if (require("./shop").shopAt(x, y)) continue;
    out.push({ x, y });
  }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out.slice(0, Math.round(out.length * share));
}

function cast(p, spell, seq) {
  const ctx = Ice.begin();
  const foes = enemiesOf(p);
  for (const u of foes) require("./timeStop").checkSure(u); // Return to Zero (โจรุโน่ Requiem): นกหวีดโดนย้อน 100%
  if (spell === "crossWinds") castWinds(p, foes, ctx);
  else if (spell === "tsunami") castTsunami(p, foes, ctx);
  else if (spell === "diamondDust") castDust(p, foes, ctx);
  else if (spell === "judgmentBolt") castBolt(p, foes, ctx, seq);
  Ice.flush(ctx);
  return ctx;
}

// Cross Winds: ไกลสุดก่อน (คนใกล้ไม่ขวางทางคนไกล) · ทิศ = ห่างจากกลางตัวผู้เป่า (ทแยงได้) · ซ้อนกันพอดี = ผลักลง
function castWinds(p, foes, ctx) {
  const c = centerOf(p);
  const dist = (u) => { const o = centerOf(u); return Math.max(Math.abs(o.x - c.x), Math.abs(o.y - c.y)); };
  const names = [];
  for (const u of [...foes].sort((a, b) => dist(b) - dist(a))) {
    if (!u.alive || !u.pos) continue;
    const o = centerOf(u);
    let dir = { x: Math.sign(o.x - c.x), y: Math.sign(o.y - c.y) };
    if (!dir.x && !dir.y) dir = { x: 0, y: 1 };
    Ice.pushUnit(u, dir, ctx, 64); // ผลักจนชนสิ่งกีดขวาง/ขอบ/คน (ลงน้ำแข็ง = ไถลต่อจนชน)
    if (u.alive && debuffFor(u, "rooted", WHISTLE.rootTurns)) names.push(u.name);
  }
  match.lastLog.push(`🌪️ Cross Winds — ลมกรรโชกพัดศัตรูออกไปจนสุดทาง${names.length ? ` · ถูกตรึง ${WHISTLE.rootTurns} เทิร์น: ${names.join(", ")}` : ""}`);
}

// Tsunami: ศัตรูที่ใกล้กลางแผนที่ก่อนได้ช่องใกล้กลางก่อน · ตัวใหญ่ไม่ถูกรวบ · แล้วพื้นเปียกทั่วแผนที่
function castTsunami(p, foes, ctx) {
  const map = action.boardMap();
  const mid = { x: (map.cols - 1) / 2, y: ((map.minRow | 0) + map.rows - 1) / 2 };
  const d2 = (t) => (t.x - mid.x) ** 2 + (t.y - mid.y) ** 2;
  const free = [];
  for (let y = map.minRow | 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) free.push({ x, y });
  free.sort((a, b) => d2(a) - d2(b));
  const movers = foes.filter((u) => action.sizeOf(u) === 1).sort((a, b) => d2(a.pos) - d2(b.pos));
  const moved = [];
  for (const u of movers) {
    const here = d2(u.pos);
    const to = free.find((t) => d2(t) < here && action.tileFree(t.x, t.y, u.id));
    if (!to) continue;
    Ice.revealPushed(u);
    const from = { ...u.pos };
    u.pos = { x: to.x, y: to.y };
    ctx.events.push({ kind: "knock", id: u.id, from, to: { ...to }, wave: true });
    moved.push(u.name);
  }
  const wet = Ice.layWet(plainTiles(WHISTLE.wetShare), WHISTLE.groundTurns);
  if (wet.length) ctx.events.push({ kind: "wet", tiles: wet, by: p.id });
  match.lastLog.push(`🌊 Tsunami — คลื่นยักษ์ซัด${moved.length ? `รวบ ${moved.join(", ")} เข้ากลางสนาม` : "ทั่วสนาม"} · พื้นเปียก ${wet.length} ช่อง`);
}

// Diamond Dust: เชื่องช้า 3 เทิร์น + ธารน้ำแข็ง 5 เทิร์น
function castDust(p, foes, ctx) {
  const names = [];
  for (const u of foes) if (Ice.applySlow(u, WHISTLE.slowTurns)) { names.push(u.name); ctx.events.push({ kind: "slow", id: u.id }); }
  const laid = [];
  for (const t of plainTiles(WHISTLE.iceShare)) if (Ice.layIce(t.x, t.y, p.id, { turns: WHISTLE.groundTurns })) laid.push(t);
  if (laid.length) ctx.events.push({ kind: "lay", tiles: laid, by: p.id, divine: true });
  match.lastLog.push(`❄️ Diamond Dust — พายุน้ำแข็งปกคลุมสนาม ${laid.length} ช่อง${names.length ? ` · เชื่องช้า ${WHISTLE.slowTurns} เทิร์น: ${names.join(", ")}` : ""}`);
}

// Judgment Bolt: สตั้น 1 เทิร์น + พื้นไฟ (จบตา = ลุกไหม้ — phases/action.js tileEndEffect)
function castBolt(p, foes, ctx, seq) {
  const names = [];
  for (const u of foes) if (debuffFor(u, "stun", WHISTLE.stunTurns)) names.push(u.name);
  const fire = Ice.layFlame(plainTiles(WHISTLE.flameShare), p.id, WHISTLE.groundTurns);
  engine.boardFx("divineFx", { seq, spell: "judgmentBolt", land: true, by: p.id, hits: foes.map((u) => u.id), tiles: fire });
  match.lastLog.push(`⚡ Judgment Bolt — สายฟ้าพิพากษาฟาดทั่วสนาม · พื้นไฟ ${fire.length} ช่อง${names.length ? ` · สตั้น ${WHISTLE.stunTurns} เทิร์น: ${names.join(", ")}` : ""}`);
}

// พื้นไฟ: ลงผลตอนจบตา (phases/action.js tileEndEffect) — ทีมผู้เป่าไม่โดน
//  fx.x/y = ช่องไฟที่ทับ (ตัวใหญ่ = ช่องไหนก็ได้ในตัว) · คืน null = ทีมเจ้าของ (ไม่มีผล)
function flameEnd(p, fx) {
  const k = Board.key(fx && Number.isFinite(fx.x) ? fx.x : p.pos.x, fx && Number.isFinite(fx.y) ? fx.y : p.pos.y);
  const owner = match.board && match.board.flame && match.board.flame[k];
  const src = owner && match.players[owner];
  if (owner && (owner === p.id || (src && combat.sameTeam(src, p)))) return null;
  return src && src.alive ? combat.withEffectSource(src, () => applyBurn(p, WHISTLE.burnTurns)) : applyBurn(p, WHISTLE.burnTurns);
}
