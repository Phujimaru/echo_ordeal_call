// state จำลองของระบบกระดาน (GRID_PLAN.md) สำหรับหน้า dev ?hud=1&game=1 — รูปเดียวกับ server/view.js buildStateFor
//  buildMockState(opts) = สร้าง state ตามฉาก · simulateEmit(state, ev, payload) = จำลองผลของ socket.emit บางตัว
//  ไฟล์นี้เป็นฟังก์ชันล้วน (ไม่แตะ React/socket) — แผนที่/ระยะ/ถอยใช้ boardRules.js ตัวเดียวกับ server
import * as Rules from "../../board/boardRules.js";

// ---------- ข้อมูลคงที่ (คัดจาก characters.js / characters/_journey.js / server/constants.js) ----------
const IMG = {
  muimi: "/characters/muimi/muimi.webp",
  oberon_summer: "/characters/oberon(summer)/oberon_summer.webp",
};
const SKILL_COST_MAX = 8;
const BASE_MOV = 4; // มุยมิ/โอเบรอน เดิน 4 (GRID_PLAN §5)

// รูปสาธารณะของตัวละคร (เหมือน pub() ใน view.js — range "mov" แปลงเป็นตัวเลขแล้ว)
const CHARS = {
  muimi: {
    id: "muimi", name: "มุยมิ", img: IMG.muimi,
    passive: { name: "ใจที่ไม่ยอมแพ้", desc: "ระหว่าง “ดาบสะบั้น” ตีปกติแต่ละครั้งยืดสถานะ +1 เทิร์น" },
    passive2: null,
    basic: {
      name: "เสบียงฉุกเฉิน", cost: 0, ammo: 2, img: "/characters/muimi/muimi_skill1.webp", area: { kind: "self" },
      desc: "ไม่นับเป็นการใช้สกิล · 1 ครั้ง/เทิร์น รวม 2 ครั้งต่อเกม: ฟื้นพลังชีวิต 2 และแต้มสกิล 2",
    },
    secondary: {
      name: "ดาบสนิม", cost: 4, img: "/characters/muimi/muimi_skill2.png", area: { kind: "self" },
      desc: "ได้ “ดาบเก่าๆ” 3 เทิร์น · ตีปกติฟื้นพลังชีวิต 1 และแต้มสกิล 1 · ใช้ไม่ได้ระหว่าง “ดาบสะบั้น”",
    },
    ultimate: {
      name: "ดาบสะบั้นหอคอยสวรรค์", cost: 8, img: "/characters/muimi/muimi_skill3.webp", area: { kind: "line", len: 4, width: 3 },
      desc: "เลือกทิศ: ได้ “ดาบสะบั้น” 2 เทิร์น (โจมตีพื้นฐาน +3 · ตีปกติฟื้นพลังชีวิต 2) แล้วปล่อยคลื่นดาบแนว 4×3 ใส่ศัตรูทุกคนในแนว เท่าพลังโจมตี (เกราะรับก่อน · หลบได้ · ไม่โดนเพื่อน) · ได้ต้านสถานะผิดปกติ 3 เทิร์น · ใช้ไม่ได้ระหว่าง “ดาบเก่าๆ” · หมดแล้วรอ 5 เทิร์นถึงใช้ซ้ำได้",
    },
  },
  oberon_summer: {
    id: "oberon_summer", name: "โอเบรอน (ฤดูร้อน)", img: IMG.oberon_summer,
    passive: { name: "หน้าไหว้หลังหลอก", desc: "จบเทิร์นที่ไม่ถูกโจมตีเลย (ถูกเลือกเป็นเป้าก็นับ แม้หลบได้) ได้แต้มสกิล +1 และเหรียญ +1" },
    passive2: null,
    basic: {
      name: "ม่านแห่งราตรี", cost: 2, img: "/characters/oberon/oberon_skill1.jpg", area: { kind: "aoe", range: BASE_MOV, self: true },
      desc: "ทุกคนในระยะรอบตัวเท่าระยะเดิน (รวมตัวเอง) โจมตี +1 นาน 3 เทิร์น และฟื้นพลังชีวิต 1 · โหมด duo/trio เฉพาะตัวเองและเพื่อนร่วมทีม · กดซ้ำไม่ได้ระหว่างผลยังอยู่",
    },
    secondary: {
      name: "นกจาบยามเช้า", cost: 4, img: "/characters/oberon/oberon_skill2.jpg", area: { kind: "target", range: BASE_MOV, self: true },
      desc: "ยังใช้สกิลอื่นได้อีก 1 ครั้ง: 1 คนในระยะเดิน (รวมตัวเอง) ฟื้นพลังชีวิต 5 ได้ต้านสถานะผิดปกติ 2 เทิร์น และล้างสถานะผิดปกติล่าสุด 1 อย่าง · ต้นเทิร์นหน้าเป้าเสียพลังชีวิต 2 ไม่สนเกราะ (ต้านไม่ได้)",
    },
    ultimate: {
      name: "จุดจบของความฝัน", cost: 4, img: "/characters/oberon/oberon_skill3_morning.webp", area: { kind: "target", range: BASE_MOV, self: true },
      desc: "คูลดาวน์ 5 เทิร์น: 1 คนในระยะเดิน (รวมตัวเอง) โจมตี +4 จนจบตาเดินถัดไปของเป้า · จากนั้นขึ้นเทิร์นใหม่เป้าสตั้น 3 เทิร์น (ต้านได้)",
    },
  },
};

// การเดินทาง 7 ภูมิภาค (characters/_journey.js AREAS)
const AREAS = [
  { name: "อาณาจักรแห่งจุดเริ่มต้น", passive: null, day: "จบเทิร์นเลขคู่ ได้แต้มสกิลเพิ่ม +1", night: "ทุกเทิร์นสุ่มสกิลพื้นฐานหรือสกิลรองของแต่ละคนให้ใช้แต้มเพิ่มขึ้น +1 (ไม่รวมท่าไม้ตาย)" },
  { name: "สวนดอกไม้ทุ่งหญ้าแสนอบอุ่น", passive: null, day: "จบเทิร์นมีโอกาส 30% ได้ไอเทมราคาไม่เกิน 5 เหรียญฟรี 1 ชิ้น", night: "ร้านค้ามายาซื้อได้ช่องละ 3 ชิ้น (ยกเว้นปืน / เกราะ Mark 42)" },
  { name: "ป่าไม้ต้องสาป", passive: "ทุกสกิลใช้แต้มเพิ่มขึ้น +1 (เพดาน 8 แต้มเหมือนเดิม)", day: "โจมตีปกติพลาด 40% แต่ถ้าโดนแรงขึ้น +1 · สกิลที่เลือกศัตรูเป็นเป้าหมายพลาด 25% (พลาดได้แต้มคืน) — \"แม่นยำ\" ไม่พลาด", night: "ลุกไหม้ / เลือดไหล / พิษร้าย มีโอกาส 50% แรงขึ้น +1 ทุกครั้งที่ออกฤทธิ์" },
  { name: "คลื่นวงวนน้ำ", passive: "จบเทิร์นได้เหรียญเพิ่ม +1", day: "ร้านค้ามายาสุ่มเฉพาะสินค้าราคา 5 เหรียญขึ้นไป", night: "จบเทิร์นมีโอกาส 25% เสีย 2 เหรียญ — มีไม่พอจะเสียเท่าที่มีและโดนความเสียหาย 1" },
  { name: "ทะเลทรายไม่อาจหวนคืน", passive: "เกราะฟื้น +1 ทุกเทิร์น", day: "จบเทิร์นโดนความเสียหาย 1 (ลดเกราะก่อน)", night: "ใช้สกิลได้แต้มคืน 2 (ไม่เกินแต้มที่จ่ายจริง)" },
  { name: "อาณาจักรน้ำแข็ง", passive: "เกราะฟื้น +1 ทุกเทิร์น", day: "โจมตีปกติมีโอกาส 20% คริติคอล ×2 (ตัวละครที่มีอัตราคริอยู่แล้ว ได้อัตราคริเพิ่ม +20% แทน — ยังคูณ ×2 เท่าเดิม)", night: "จบเทิร์นมีโอกาส 15% ติดสตั้น 1 เทิร์น (ไม่โดนซ้ำเทิร์นติดกัน · ต้านสถานะกันได้)" },
  { name: "จุดสิ้นสุดของโลก", passive: "เกราะฟื้น +1 ทุกเทิร์น · จบเทิร์นได้แต้มสกิลเพิ่ม +1", day: "จบเทิร์นโดนความเสียหาย 1 (ลดเกราะก่อน) และมีโอกาส 50% ติดผุพัง 1 เทิร์น", night: "พลังโจมตีของทุกคน +1" },
];

// สีประจำตำแหน่ง (characters.js POSITION_COLORS)
const POSITION_COLORS = { 1: "#9B4F96", 2: "#9B2D3A", 3: "#3B82C4", 4: "#E5B33B", 5: "#C0392B", 6: "#2E9E4B", 7: "#E86A2B" };

// ผู้เล่น 5 คน (p0 = เรา) — ตำแหน่งอยู่บนช่องพื้นของแผนที่ภูมิภาค I (ไม่ทับสิ่งกีดขวาง/จุดฟื้นฟู)
//  ทีม (โหมด duo): A = เรา + ต้นกล้า · B = ฟ้าใส + มิวมิว · C = บอส
const ROSTER = [
  { id: "p0", name: "เรา", char: "muimi", position: 1, pos: { x: 6, y: 7 }, hp: 5, armor: 2, sp: 5, gold: 9, team: "A",
    cards: [{ value: 7, color: "red" }, { value: 9, color: "blue" }], score: 16, statuses: { atkUp: 2 }, statusAmt: { atkUp: 1 } },
  { id: "p1", name: "ฟ้าใส", char: "oberon_summer", position: 2, pos: { x: 9, y: 7 }, hp: 6, armor: 1, sp: 3, gold: 6, team: "B",
    cards: [{ value: 10, color: "green" }, { value: 9, color: "yellow" }], score: 19, statuses: { burn: 1 }, statusAmt: {} },
  { id: "p2", name: "ต้นกล้า", char: "muimi", position: 3, pos: { x: 3, y: 4 }, hp: 7, armor: 3, sp: 2, gold: 4, team: "A",
    cards: [{ value: 6, color: "yellow" }, { value: 8, color: "red" }], score: 14, statuses: {}, statusAmt: {} },
  { id: "p3", name: "มิวมิว", char: "oberon_summer", position: 4, pos: { x: 12, y: 9 }, hp: 3, armor: 0, sp: 7, gold: 12, team: "B",
    cards: [{ value: 10, color: "blue" }, { value: 5, color: "green" }, { value: 8, color: "blue" }], score: 23, statuses: { poison: 2 }, statusAmt: {} },
  { id: "p4", name: "บอส", char: "muimi", position: 5, pos: { x: 10, y: 4 }, hp: 4, armor: 2, sp: 1, gold: 2, team: "C",
    cards: [{ value: 4, color: "red" }, { value: 8, color: "green" }], score: 12, statuses: {}, statusAmt: {} },
];
const ME = "p0";
// ช่วงจั่ว: ใครกด "พอ" แล้ว
const LOCKED_IN_PLAYING = new Set(["p1", "p3"]);

// ร้านค้ามายา 15 ช่อง (รูปเดียวกับ server/shop.js rollShopItem + id/sold/soldTo)
const SHOP_ROLL = [
  { type: "fortune", price: 5 },
  { type: "resist", price: 5 },
  { type: "skillPoint", size: "small", value: 1, price: 2 },
  { type: "skillPoint", size: "medium", value: 4, price: 6 },
  { type: "skillPoint", size: "large", value: 6, price: 10 },
  { type: "armor", value: 1, price: 3 },
  { type: "armor", value: 1, price: 3 },
  { type: "gutsGun", price: 15 },
  { type: "gutsAmmo", ammo: "shockwave", price: 5 },
  { type: "gutsAmmo", ammo: "gargorgon", price: 5 },
  { type: "gutsAmmo", ammo: "thunder", price: 5 },
  { type: "gutsAmmo", ammo: "nurse", price: 10 },
  { type: "mark42", price: 25 },
  { type: "resist", price: 5 },
  { type: "skillPoint", size: "small", value: 1, price: 2 },
];
const SOLD = new Set([1, 6]);

// กระเป๋าของเรา (5 ช่อง — รูปเดียวกับ p.inventory ใน server/shop.js)
const MY_BAG = [
  { uid: "inv_gun", type: "gutsGun", price: 15 },
  { uid: "inv_thunder", type: "gutsAmmo", ammo: "thunder", price: 5 },
  { uid: "inv_armor", type: "armor", value: 1, price: 3 },
];

// ---------- ฉาก ----------
// key ใน URL (?scn=) → คำอธิบายบนแถบ dev
export const SCENARIOS = [
  { id: "playing", label: "จั่วไพ่" },
  { id: "order", label: "ลำดับเดิน" },
  { id: "my", label: "ตาเรา (ยังไม่เดิน)" },
  { id: "moved", label: "ตาเรา (เดินแล้ว)" },
  { id: "other", label: "ตาคนอื่น" },
  { id: "attack", label: "ตี + สวน + ถอย" },
  { id: "collide", label: "ตี + สวน + ชน" },
  { id: "gun", label: "ยิงปืน GUTS" },
];

let attackSeq = 0;

const clone = (o) => (typeof structuredClone === "function" ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
const samePos = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
const teamMode = (s) => s.gameMode === "duo" || s.gameMode === "trio";
const isAlly = (s, a, b) => teamMode(s) && !!a.teamId && a.teamId === b.teamId;

// แผนที่แบบที่ boardPublic() ส่ง (heal เป็น array) — ภูมิภาคที่ยังไม่มีแผนที่ใช้ของภูมิภาค I ไปก่อน (mapOf)
function boardPublic(area) {
  const m = Rules.mapOf(area);
  return { area, cols: m.cols, rows: m.rows, terrain: m.terrain, heal: [...m.heal], spawns: m.spawns, shopSpots: m.shopSpots };
}

// เทิร์นที่ตรงกับภูมิภาค + กลางวัน/กลางคืน (ภูมิภาคละ 10 เทิร์น · สลับวัน/คืนทุก 5 เทิร์น)
function roundFor(area, night) {
  return (area - 1) * 10 + (night ? 7 : 3);
}

// พลังโจมตีปกติแบบคร่าวๆ (ฐาน 1 + โจมตีขึ้น) — ใช้แทน estimateAttackOn ของ server
function atkOf(p) {
  return 1 + ((p.statuses && p.statuses.atkUp > 0) ? (p.statusAmt.atkUp || 1) : 0);
}

// คาดการณ์ผลการตีปกติของคนที่กำลังเดิน (view.js forecastFor — เห็นเฉพาะเจ้าของตา)
function forecastFor(s, viewerId) {
  const viewer = s.players.find((p) => p.id === viewerId);
  if (!viewer || !viewer.alive || s.gameState !== "ACTION" || s.actorId !== viewer.id) return null;
  const out = {};
  for (const t of s.players) {
    if (t.id === viewer.id || !t.alive || !t.pos || isAlly(s, viewer, t)) continue;
    out[t.id] = { dmg: atkOf(viewer), back: atkOf(t) };
  }
  return out;
}

function units(s) {
  return s.players.filter((p) => p.alive && p.pos).map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, alive: true, teamId: p.teamId || null }));
}
function blockedOf(s) {
  return s.shopPos ? new Set([Rules.key(s.shopPos.x, s.shopPos.y)]) : null;
}

// ช่องว่างติดตัวเรา (ไว้วางร้าน "ติดเรา") — ลองล่าง/ซ้าย/ขวา/บน
function freeNeighbor(s, pos) {
  const map = Rules.mapOf(s.board.area);
  for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
    const x = pos.x + dx, y = pos.y + dy;
    if (Rules.isObstacle(map, x, y) || Rules.isHeal(map, x, y)) continue;
    if (s.players.some((p) => p.alive && samePos(p.pos, { x, y }))) continue;
    return { x, y };
  }
  return null;
}

// ผู้เล่น 1 คนในรูปของ view.js
function playerPublic(r, o) {
  const mine = r.id === ME;
  const revealAll = o.gameState !== "PLAYING";
  const teamReveal = o.team && r.team === "A"; // เพื่อนร่วมทีมเห็นแต้มกันตลอด
  const show = mine || revealAll || teamReveal;
  const ch = clone(CHARS[r.char]);
  // ภาษีราคาสกิล: ป่าไม้ต้องสาป +1 ทุกสกิล · ภูมิภาค I กลางคืนสุ่มสกิลพื้นฐาน/รอง +1 (ให้เราโดนสกิลรอง — ป้ายแดงบนปุ่ม)
  for (const tier of ["basic", "secondary", "ultimate"]) {
    let c = ch[tier].cost;
    if (o.area === 3) c += 1;
    if (o.area === 1 && o.night && tier === "secondary") c += 1;
    ch[tier].cost = Math.min(SKILL_COST_MAX, c);
  }
  const bust = r.score > 21;
  return {
    id: r.id, name: r.name, avatar: 0, img: IMG[r.char], position: r.position,
    color: POSITION_COLORS[r.position], teamId: o.team ? r.team : null, teamConfirmed: !!o.team,
    skillLocks: undefined, modeVote: null,
    locked: o.gameState === "PLAYING" ? (LOCKED_IN_PLAYING.has(r.id) || bust) : true,
    busted: show ? bust : false,
    result: null,
    cardCount: r.cards.length,
    cards: mine ? clone(r.cards) : null,
    score: show ? r.score : null,
    hp: r.hp, maxHp: 7, armor: r.armor, maxArmor: 3,
    mark42: null,
    ...(mine ? { mark42Owned: null, mark42BuyLock: 0 } : {}),
    shield: 0, tempHp: 0, skillPoints: r.sp, qte: undefined, maxSkill: 8,
    gold: r.gold, goldMax: 30,
    inventory: mine ? clone(MY_BAG) : null,
    gutsShotTurn: mine ? 0 : undefined,
    muimiEmergencyUses: r.char === "muimi" ? 2 : undefined,
    muimiEmergencyMax: r.char === "muimi" ? 2 : undefined,
    muimiEmergencyUsed: r.char === "muimi" ? false : undefined,
    muimiUltCd: mine ? 0 : undefined,
    atCap: r.score >= 21,
    skillUsed: false, ready: false, connected: true, alive: true,
    statuses: { ...r.statuses }, statusAmt: { ...r.statusAmt },
    character: ch,
    dmgHp: 0, dmgArmor: 0, gainedSkill: 0, wasAttacked: false,
    pos: { ...r.pos }, mov: BASE_MOV - (bust && o.gameState !== "PLAYING" ? 1 : 0), baseMov: BASE_MOV, range: [1, 1],
  };
}

// ลำดับเดิน: แต้มมากก่อน · ไพ่แตกไปท้ายแถว
function orderOf(players) {
  const ok = players.filter((p) => !p.busted && p.score <= 21).sort((a, b) => b.score - a.score);
  const bust = players.filter((p) => p.busted || p.score > 21);
  return [...ok, ...bust].map((p) => p.id);
}

// สมุดการ์ด 43 ใบ + ใบไหนถูกจั่วไปแล้ว (= การ์ดในมือทุกคน)
function ledger() {
  const drawn = new Set(ROSTER.flatMap((r) => r.cards.map((c) => `${c.value}-${c.color}`)));
  const out = [];
  for (let v = 1; v <= 10; v++) for (const color of ["red", "blue", "green", "yellow"]) out.push({ value: v, color, drawn: drawn.has(`${v}-${color}`) });
  out.push({ special: "king", drawn: false }, { special: "queen", drawn: false }, { special: "joker", drawn: false });
  return out;
}

// ตั้งตาเดินให้ actorId (ACTION ยังไม่เดิน)
function startTurn(s, actorId) {
  const a = s.players.find((p) => p.id === actorId);
  s.gameState = "ACTION";
  s.actorId = actorId;
  s.action = { from: { ...a.pos }, moved: false, locked: false, path: null };
  s.attack = null;
  s.log = [];
  s.timeLeft = 60;
  s.forecast = forecastFor(s, s.youId);
  return s;
}

// ลงความเสียหาย: เกราะรับก่อน แล้วค่อยพลังชีวิต (dealMixed)
function dealMixed(p, n) {
  const a = Math.min(p.armor, n);
  p.armor -= a;
  p.hp = Math.max(0, p.hp - (n - a));
  if (p.hp <= 0) { p.alive = false; p.pos = null; }
}
function strikeCard(by, target, dmg) {
  return {
    byId: by.id, targetId: target.id, byName: by.name, byImg: by.img, byColor: by.color,
    byAttackSound: by.character.id === "muimi" ? "muimi_normal_hit" : undefined,
    targetName: target.name, targetImg: target.img, targetColor: target.color,
    dmg, dodge: false, kill: !target.alive, skills: [],
  };
}

// ฉากตี (ATTACKING) แบบ server/phases/attack.js boardAttack / gunAttack: ตี → สวน (ถ้าตีถึง) → ผู้ตีถอย 1 ช่อง (ชน = เสียเพิ่ม 1)
//  gun = ชนิดกระสุน (ดาเมจจังหวะแรก 0 — ผลจริงตามชนิดกระสุน)
export function simulateAttack(prev, byId, targetId, gun = null) {
  const s = clone(prev);
  const by = s.players.find((p) => p.id === byId);
  const target = s.players.find((p) => p.id === targetId);
  if (!by || !target || !by.pos || !target.pos) return prev;
  const fc = forecastFor({ ...s, gameState: "ACTION", actorId: byId }, byId) || {};
  const est = fc[targetId] || { dmg: atkOf(by), back: atkOf(target) };
  const dmg = gun ? 0 : est.dmg;
  if (gun) {
    if (gun === "thunder") target.statuses.chaa = 2; // Thunder Bullet: สภาพชา 2 เทิร์น
    if (byId === s.youId) {
      const me = by;
      const i = me.inventory.findIndex((it) => it.type === "gutsAmmo" && it.ammo === gun);
      if (i >= 0) me.inventory.splice(i, 1);
      me.gutsShotTurn = s.roundNumber;
    }
  } else {
    dealMixed(target, dmg);
  }
  const card = { id: ++attackSeq, ...strikeCard(by, target, dmg), gun: gun || undefined, counter: null, push: null };
  const map = Rules.mapOf(s.board.area);
  if (by.alive && target.alive && Rules.canCounter(target.range, by.pos, target.pos)) {
    dealMixed(by, est.back);
    card.counter = strikeCard(target, by, est.back);
    if (by.alive) {
      const push = Rules.pushback(map, by.pos, target.pos, units(s), { selfId: by.id, blocked: blockedOf(s) });
      card.push = { from: { ...by.pos }, to: { x: push.x, y: push.y }, collide: push.collide };
      if (push.moved) by.pos = { x: push.x, y: push.y };
      else dealMixed(by, 1);
    }
  }
  card.fxMs = (3 + (card.counter ? 2 : 0)) * 1000;
  s.gameState = "ATTACKING";
  s.actorId = byId;
  s.action = null;
  s.forecast = null;
  s.attack = card;
  s.timeLeft = card.fxMs / 1000;
  return s;
}

// ตาถัดไปตามลำดับเดิน (ข้ามคนตกรอบ) — หมดแถว = กลับไปช่วงจั่วเทิร์นใหม่
export function nextTurn(prev) {
  const s = clone(prev);
  const order = s.turnOrder || [];
  let i = order.indexOf(s.actorId);
  for (let n = 0; n < order.length; n++) {
    i += 1;
    if (i >= order.length) break;
    const p = s.players.find((x) => x.id === order[i]);
    if (p && p.alive && p.pos) return startTurn(s, p.id);
  }
  s.gameState = "PLAYING";
  s.actorId = null;
  s.action = null;
  s.forecast = null;
  s.attack = null;
  s.turnOrder = null;
  s.timeLeft = 60;
  s.roundNumber += 1;
  // เทิร์นใหม่: ล้างมือ/พอ/แต้มของทุกคน
  for (const p of s.players) {
    p.locked = false;
    p.busted = false;
    p.cardCount = 0;
    p.score = p.id === s.youId ? 0 : null;
    p.mov = p.baseMov;
    if (p.cards) p.cards = [];
  }
  for (const c of s.deckLedger) c.drawn = false;
  return s;
}

// opts = { scn, area (1..7), night, team, shopNear }
export function buildMockState(opts) {
  const scn = SCENARIOS.some((x) => x.id === opts.scn) ? opts.scn : "playing";
  const area = Math.min(7, Math.max(1, Number(opts.area) || 1));
  const night = !!opts.night;
  const gameState = scn === "playing" ? "PLAYING" : scn === "order" ? "ORDER" : "ACTION";
  const o = { gameState, area, night, team: !!opts.team };
  const a = AREAS[area - 1];
  const players = ROSTER.map((r) => playerPublic(r, o));
  // ร้านตั้งครั้งแรกเทิร์น 1 ย้ายทุก 5 เทิร์น
  const round = roundFor(area, night);
  const s = {
    gameState,
    gameMode: o.team ? "duo" : "ffa",
    teamSize: o.team ? 2 : null,
    teamCount: o.team ? 3 : null,
    teamOptions: [], modeOptions: [], modeVotes: {},
    winningTeamId: null,
    timeLeft: gameState === "PLAYING" ? 42 : gameState === "ORDER" ? 2 : 48,
    roundNumber: round,
    deckEmpty: false,
    cycle: night ? "night" : "day",
    journey: {
      area, night, name: a.name, passive: a.passive, day: a.day, nightDesc: a.night,
      turnsLeft: area < 7 ? 10 - ((round - 1) % 10) : null,
      scene: null,
    },
    maxPlayers: 7,
    youId: ME,
    board: boardPublic(area),
    turnOrder: gameState === "PLAYING" ? null : orderOf(players),
    forecast: null,
    actorId: null,
    action: null,
    skillMusic: null, skillMusicSeq: 0,
    cutscene: null,
    attack: null,
    log: [],
    shop: SHOP_ROLL.map((it, i) => ({ id: `shop_${Math.ceil(round / 5)}_${i}`, ...it, sold: SOLD.has(i), soldTo: SOLD.has(i) ? "p3" : null })),
    shopPos: { x: 7, y: 2 },
    shopTurnsLeft: 5 - ((round - 1) % 5),
    bagSlots: 5,
    gutsRange: [1, 4],
    deckLedger: ledger(),
    players,
  };
  const byId = (id) => s.players.find((p) => p.id === id);
  if (gameState === "ORDER") {
    const names = s.turnOrder.map((id) => byId(id).name);
    s.log = [
      `🎴 เปิดแต้ม: ${s.players.map((p) => `${p.name} ${p.busted ? "แตก" : p.score}`).join(" · ")}`,
      `🟥 ${byId("p0").name} การ์ดแดง: โจมตี +1`,
      `🧭 ลำดับเดิน: ${names.join(" → ")}`,
      `🪙 ทุกคนได้เหรียญ +1 · ${names[0]} เดินลำดับแรก +2`,
      `⚠️ ${byId("p3").name} ไพ่แตก — เดินท้ายแถว และเดินได้ −1 เทิร์นนี้`,
    ];
  }
  // เรา = ลำดับ 2 (ฟ้าใส 19 แต้มเดินก่อน) · ตาคนอื่น = ตาของฟ้าใส
  if (scn === "my" || scn === "moved" || scn === "attack" || scn === "collide" || scn === "gun") startTurn(s, ME);
  if (scn === "other") startTurn(s, "p1");
  const me = byId(ME);
  if (scn === "moved" || scn === "attack") {
    // เดินจาก (6,7) ไป (8,7) — ติดฟ้าใสที่ (9,7)
    s.action.path = [{ x: 6, y: 7 }, { x: 7, y: 7 }, { x: 8, y: 7 }];
    s.action.moved = true;
    me.pos = { x: 8, y: 7 };
  }
  if (scn === "collide") {
    // ยืนใต้เสาคริสตัล (11,3) แล้วตีบอสที่อยู่ข้างล่าง → ถอยขึ้นไปชนเสา
    me.pos = { x: 11, y: 4 };
    byId("p4").pos = { x: 11, y: 5 };
    s.action.from = { ...me.pos };
  }
  if (opts.shopNear) s.shopPos = freeNeighbor(s, me.pos) || s.shopPos;
  if (s.gameState === "ACTION") s.forecast = forecastFor(s, s.youId);
  if (scn === "attack") return simulateAttack(s, ME, "p1");
  if (scn === "collide") return simulateAttack(s, ME, "p4");
  if (scn === "gun") return simulateAttack(s, ME, "p1", "thunder"); // ยิงจากระยะ 3 — ฟ้าใสตีถึงแค่ 1 จึงไม่สวน
  return s;
}

// จำลองผลของ socket.emit — คืน state ใหม่ ({ state, after }) หรือ null ถ้าไม่รู้จักเหตุการณ์นี้
//  after = "attack" เมื่อเกิดฉากตีจากการกด (หน้า preview ใช้นับเวลาแล้วไปตาถัดไป)
export function simulateEmit(prev, ev, payload = {}) {
  const myTurn = prev.gameState === "ACTION" && prev.actorId === prev.youId && !!prev.action;
  const s = clone(prev);
  const me = s.players.find((p) => p.id === s.youId);
  const map = Rules.mapOf(s.board.area);
  const lockMove = () => { if (s.action) s.action.locked = true; };
  switch (ev) {
    case "hit": { // จั่วการ์ด
      if (s.gameState !== "PLAYING" || me.locked) return { state: prev };
      const pool = s.deckLedger.filter((c) => !c.drawn && !c.special);
      const c = pool[Math.floor(Math.random() * pool.length)];
      if (!c) return { state: prev };
      c.drawn = true;
      me.cards.push({ value: c.value, color: c.color });
      me.cardCount = me.cards.length;
      me.score = me.cards.reduce((n, x) => n + (x.value || 0), 0);
      me.busted = me.score > 21;
      me.atCap = me.score >= 21;
      if (me.busted) me.locked = true;
      return { state: s };
    }
    case "lock": // พอ
      if (s.gameState !== "PLAYING") return { state: prev };
      me.locked = true;
      return { state: s };
    case "move": {
      if (!myTurn || prev.action.moved || prev.action.locked) return { state: prev };
      const reach = Rules.reachable(map, { id: me.id, ...me.pos }, me.mov, units(s), { isAlly: (a, b) => teamMode(s) && a.teamId && a.teamId === b.teamId, blocked: blockedOf(s) });
      const node = reach.get(Rules.key(payload.x, payload.y));
      if (!node || node.d === 0) return { state: prev };
      s.action.path = Rules.pathTo(reach, payload.x, payload.y);
      me.pos = { x: payload.x, y: payload.y };
      s.action.moved = true;
      return { state: s };
    }
    case "undoMove":
      if (!myTurn || !prev.action.moved || prev.action.locked) return { state: prev };
      me.pos = { ...s.action.from };
      s.action.moved = false;
      s.action.path = null;
      return { state: s };
    case "endAction":
      if (!myTurn) return { state: prev };
      return { state: nextTurn(s) };
    case "attack": {
      if (!myTurn) return { state: prev };
      const t = s.players.find((p) => p.id === payload.targetId);
      if (!t || !t.alive || !t.pos || isAlly(s, me, t) || !Rules.inRange(me.range, Rules.dist(me.pos, t.pos))) return { state: prev };
      return { state: simulateAttack(s, me.id, t.id), after: "attack" };
    }
    case "useSkill": {
      if (!myTurn) return { state: prev };
      const sk = me.character[payload.tier];
      if (!sk || me.skillPoints < sk.cost) return { state: prev };
      me.skillPoints -= sk.cost;
      if (payload.tier !== "basic") me.skillUsed = true;
      lockMove();
      return { state: s };
    }
    case "buyShopItem": {
      if (!myTurn) return { state: prev };
      const it = s.shop.find((x) => x.id === payload.itemId);
      if (!it || it.sold || me.gold < it.price || me.inventory.length >= s.bagSlots) return { state: prev };
      if (!s.shopPos || Rules.dist(me.pos, s.shopPos) !== 1) return { state: prev };
      it.sold = true;
      it.soldTo = me.id;
      me.gold -= it.price;
      me.inventory.push({ uid: `${it.id}_${me.inventory.length}`, type: it.type, value: it.value, size: it.size, ammo: it.ammo, price: it.price });
      lockMove();
      return { state: s };
    }
    case "dropItem":
      if (!myTurn) return { state: prev };
      me.inventory = me.inventory.filter((x) => x.uid !== payload.uid);
      return { state: s };
    case "useInventoryItem": {
      if (!myTurn) return { state: prev };
      const it = me.inventory.find((x) => x.uid === payload.uid);
      if (!it) return { state: prev };
      // ยิงปืน GUTS: กระสุน + เป้า → ฉากยิง (นับเป็นการโจมตีของตา)
      if ((it.type === "gutsAmmo" || it.type === "gutsGun") && payload.targetId) {
        const ammo = it.type === "gutsAmmo" ? it.ammo : (me.inventory.find((x) => x.type === "gutsAmmo") || {}).ammo;
        if (!ammo) return { state: prev };
        return { state: simulateAttack(s, me.id, payload.targetId, ammo), after: "attack" };
      }
      me.inventory = me.inventory.filter((x) => x.uid !== payload.uid);
      lockMove();
      return { state: s };
    }
    default:
      return null;
  }
}
