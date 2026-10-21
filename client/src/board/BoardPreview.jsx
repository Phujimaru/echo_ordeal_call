// หน้าดูกระดานเดินได้ (เฉพาะ dev): ?board=1 — ดู main.jsx
//  ไว้ตรวจตัววาด BoardCanvas โดยไม่ต้องเปิดห้องจริง: แผนที่ภูมิภาค I–VII + ตัวละครจำลอง 6 ตัว
//  ?board=1&area=N เลือกภูมิภาค · ?rot=0..3 มุมมอง · ?night=1 · ?zoom=1 มุมใกล้ · ?sq=1 กระดานจัตุรัส 14 × 14
//  sq = ตัด/เติมแผนที่ปัจจุบันให้เป็น 14 × 14 (ตัดคอลัมน์ซ้ายขวา เติมแถวบนล่าง) — ไว้ตรวจกล้องก่อนแผนที่จริงเปลี่ยนขนาด
//  ภูมิภาคที่ server ยังไม่มีแผนที่ (MAPS ใน boardRules.js) → สร้าง "แผนที่สาธิต" จากผังด่าน I:
//   เปลี่ยนชนิดสิ่งกีดขวางเป็นของภูมิภาคนั้น + โรยช่องพิเศษ (ทิศน้ำวนวนครบ 4 ทิศ) ให้ตรวจภาพได้ครบทุกแบบ
//  คลิกตัวละคร = เลือกเป็นคนเดิน · คลิกช่องฟ้า = เดิน · คลิกศัตรูในช่องแดง = เดินเข้าไปตี (สวน/ถอย/ชน แบบง่าย)
//  ปุ่ม: ภูมิภาค I–VII · หมุน ⟲/⟳ · ซูม ＋/－ (ล้อเมาส์) · 14×14 · กลางคืน · ประหยัดสเปก (lowQ) · ระยะอันตราย ·
//   โหมด เดิน / สกิลระยะ 3 / ตีหมู่ 5 · แผงล่างซ้ายบอกช่องที่ชี้/คลิกล่าสุด (ตรวจการเลือกช่องตอนซูม/หมุน)
//  คอนโซล: window.__boardFocus(x, y) = ส่ง focus ให้ BoardCanvas (มุมใกล้เลื่อนตามถ้าช่องนั้นอยู่นอกจอ)
//   window.__boardFx([{ kind: "beam", x, y, dir: "up", len: 6, color: "#ff5fb4" }]) = เล่นเอฟเฟกต์ (เช่นลำแสง Beam Magnum)
//   window.__boardCloak(id, true) = วาดตัวละครนั้นแบบซ่อนตัว (เงาจาง)
//   ?storm=1 / ปุ่ม "ระบำเขม่า" = ฉากร่าย + ม่านแดง 8×8 (เคท) · window.__kateStorm(x, y) ร่ายรอบช่อง (x, y) · window.__kateStormClear() = ม่านหาย (จาง)
//   ปุ่ม "มองจากนอก" = ผู้ร่ายเป็นศัตรู (ตัวเรา "me" ยืนนอกม่าน → เห็นโดมเขม่าทึบ) · ปิด = เราเป็นผู้ร่าย (เห็นข้างใน) · ?stormout=1
//   window.__boardSongs([{ kind, x, y, r }]) = วงเพลงของยูนะ (delete / smile / idol)
//   ?gyro=1 = ไจโร เซปเปลี่ (ขี่ม้า) + ไจโรคนที่ 2 · ปุ่มเล่นเอฟเฟกต์ทุกเหตุการณ์ของ socket "gyroFx" (GyroFxDev.jsx)
//   ?diego=1 = ดิเอโก้ แบรนโด โลกคู่ขนาน (ขี่ซิลเวอร์ บูลเล็ต) · ปุ่มเล่นเอฟเฟกต์ทุกเหตุการณ์ของ socket "diegoFx" + หยุดเวลา (DiegoFxDev.jsx)
//   ?valentine=1 = ฟันนี่ วาเลนไทน์ (D4C) · ปุ่มเล่นเอฟเฟกต์ทุกเหตุการณ์ของ socket "valentineFx" + ธงปัก/มุมมองมิติ/คนละโลก/ตัวเหมือน (ValentineFxDev.jsx)
//   ?celine=1 = องค์หญิงดอกไม้ เซลิน · ปุ่มเล่นเอฟเฟกต์ตีปกติ 6 อาวุธ + ทุกเหตุการณ์ของ socket "celineFx" + พุ่มดอกไม้/กำแพง/ราชาดอกไม้ (CelineFxDev.jsx)
//   ?fern=1 = เฟิร์น · ปุ่มเล่นเอฟเฟกต์ทุกเหตุการณ์ของ socket "fernFx" + Zoltraak + ชั้นชาร์จ 0..3 (FernFxDev.jsx)
//   ?ice=1 = หนามน้ำแข็ง Lv1–3 + ธารน้ำแข็ง (Ice Spike) · window.__boardIce({ lv }) = prop ice ของ BoardCanvas
//  BFS ในไฟล์นี้เป็นของหน้าทดสอบเท่านั้น (ไม่คิดค่าเดินช่องพิเศษ) — เกมจริงคำนวณที่ server (server/board.js)
import { useEffect, useMemo, useRef, useState } from "react";
import BoardCanvas from "./BoardCanvas";
import KateStorm from "../oc/intro/KateStorm";
import { castStorm } from "./sootStorm";
import { MAPS } from "./boardRules";
import ShadowFxDev from "./ShadowFxDev"; // ?ke=1 = ปุ่มเล่นเอฟเฟกต์เคท & เอมิลิโกะ
import GyroFxDev from "./GyroFxDev"; // ?gyro=1 = ปุ่มเล่นเอฟเฟกต์ไจโร เซปเปลี่
import DiegoFxDev from "./DiegoFxDev"; // ?diego=1 = ปุ่มเล่นเอฟเฟกต์ดิเอโก้ แบรนโด
import ValentineFxDev from "./ValentineFxDev"; // ?valentine=1 = ปุ่มเล่นเอฟเฟกต์ฟันนี่ วาเลนไทน์
import FernFxDev from "./FernFxDev"; // ?fern=1 = ปุ่มเล่นเอฟเฟกต์เฟิร์น
import CelineFxDev from "./CelineFxDev"; // ?celine=1 = ปุ่มเล่นเอฟเฟกต์เซลิน

const AREA_NAMES = { 1: "อาณาจักรแห่งจุดเริ่มต้น", 2: "ทุ่งดอกไม้", 3: "ป่าไม้ต้องสาป", 4: "คลื่นวงวนน้ำ", 5: "ทะเลทราย", 6: "อาณาจักรน้ำแข็ง", 7: "จุดสิ้นสุดของโลก", 8: "ห่วงเวลาซีโร่ 1", 9: "ห่วงเวลาซีโร่ 2", 10: "ห่วงเวลาซีโร่ 3", 11: "ห่วงเวลาซีโร่ 4" };
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "Z1", "Z2", "Z3", "Z4"];
const SPECIAL_NAMES = {
  flowers: "พุ่มดอกไม้สูง", forest: "ป่าทึบ", thorns: "หนามพิษ", shallow: "น้ำตื้น", whirl: "น้ำวน", quicksand: "ทรายดูด",
  ice: "น้ำแข็งลื่น", lava: "ลาวา", power: "แท่นพลัง",
};
const FLOW_NAMES = { up: "↑", down: "↓", left: "←", right: "→" };
// ชนิดสิ่งกีดขวางของแผนที่สาธิต: ชนิดในด่าน I → รายชื่อชนิดของภูมิภาค (วนตามลำดับ)
const DEMO_KINDS = {
  2: { tree: ["rock", "fence"], pillar: ["windmill"], banner: ["windmill"], hedge: ["fence"] },
  3: { tree: ["deadtree", "rock"], pillar: ["deadtree"], banner: ["rock"], hedge: ["stump"] },
  4: { tree: ["rock", "reef"], pillar: ["wreck"], banner: ["reef"], hedge: ["rock"] },
  5: { tree: ["cactus", "dune"], pillar: ["ruin"], banner: ["cactus"], hedge: ["dune"] },
  6: { tree: ["pine", "rock"], pillar: ["iceblock"], banner: ["pine"], hedge: ["iceblock"] },
  7: { tree: ["crystal", "ruin"], pillar: ["obelisk"], banner: ["crystal"], hedge: ["ruin"] },
};
// รั้วต่อกันเพิ่ม (ด่าน II) — ให้เห็นรั้วแนวนอน/แนวตั้งที่เชื่อมกัน
const DEMO_EXTRA = { 2: { "2,6": "fence", "13,6": "fence", "5,10": "fence", "10,10": "fence" } };
const DEMO_SPECIALS = { 2: ["flowers"], 3: ["forest", "thorns"], 4: ["shallow", "whirl"], 5: ["quicksand"], 6: ["ice"], 7: ["lava", "power"] };
// กลุ่มช่องที่โรยช่องพิเศษ (ข้ามช่องที่เป็นสิ่งกีดขวาง/ฟื้นฟู/จุดเกิด/จุดร้าน)
const DEMO_PATCHES = [
  [[3, 2], [3, 3], [2, 3]], [[12, 2], [12, 3], [13, 3]], [[6, 5], [5, 5], [6, 6]], [[9, 6], [10, 5], [10, 6]],
  [[6, 9], [7, 9], [6, 10]], [[9, 10], [10, 11], [9, 9]], [[1, 6], [2, 7]], [[14, 6], [13, 7]], [[7, 3], [8, 3]], [[3, 8], [12, 8]],
];
const FLOWS = ["up", "right", "down", "left"];

// แผนที่ฝั่ง server → รูปแบบ state.board (heal เป็น array ของ "x,y")
function toPublic(m) {
  return {
    area: m.area, name: m.name, cols: m.cols, rows: m.rows, terrain: { ...m.terrain },
    heal: [...(m.heal || [])], spawns: m.spawns.map((p) => ({ ...p })), shopSpots: (m.shopSpots || []).map((p) => ({ ...p })),
    special: { ...(m.special || {}) }, flow: { ...(m.flow || {}) },
  };
}
function demoMap(area) {
  const base = toPublic(MAPS[1]);
  if (area === 1) return base;
  const cnt = {}, terrain = {};
  for (const [k, kind] of Object.entries(base.terrain)) {
    const list = DEMO_KINDS[area][kind] || ["rock"], i = cnt[kind] = (cnt[kind] || 0) + 1;
    terrain[k] = list[(i - 1) % list.length];
  }
  Object.assign(terrain, DEMO_EXTRA[area] || {});
  const inMap = (k) => { const [x, y] = k.split(",").map(Number); return x >= 0 && y >= 0 && x < base.cols && y < base.rows; };
  const used = new Set([...Object.keys(terrain), ...base.heal, ...base.spawns.map((p) => `${p.x},${p.y}`), ...base.shopSpots.map((p) => `${p.x},${p.y}`)]);
  const kinds = DEMO_SPECIALS[area], special = {}, flow = {};
  let nf = 0;
  DEMO_PATCHES.forEach((patch, pi) => {
    const kind = kinds[pi % kinds.length];
    for (const [x, y] of patch) {
      const k = `${x},${y}`;
      if (used.has(k) || !inMap(k)) continue;
      special[k] = kind;
      if (kind === "whirl") flow[k] = FLOWS[nf++ % 4];
    }
  });
  for (const k of Object.keys(terrain)) if (!inMap(k)) delete terrain[k];
  return { ...base, area, name: AREA_NAMES[area], terrain, special, flow, demo: true };
}
// ตัด/เติมแผนที่ให้เป็น n × n โดยคงกลางไว้ (16 × 12 → ตัดคอลัมน์ซ้ายขวาข้างละ 1 · เติมแถวบนล่างข้างละ 1)
function squareMap(m, n = 14) {
  const dx = Math.floor((n - m.cols) / 2), dy = Math.floor((n - m.rows) / 2);
  const mv = (k) => { const [x, y] = k.split(",").map(Number); const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < n && Y < n ? `${X},${Y}` : null; };
  const mvObj = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [mv(k), v]).filter(([k]) => k));
  const mvPt = (list) => (list || []).map((p) => ({ x: p.x + dx, y: p.y + dy })).filter((p) => p.x >= 0 && p.y >= 0 && p.x < n && p.y < n);
  return {
    ...m, cols: n, rows: n, terrain: mvObj(m.terrain), special: mvObj(m.special), flow: mvObj(m.flow),
    heal: (m.heal || []).map(mv).filter(Boolean), spawns: mvPt(m.spawns), shopSpots: mvPt(m.shopSpots), square: m.cols !== n || m.rows !== n,
  };
}
function mapFor(area, sq) {
  const m = MAPS[area] && MAPS[area].area === area ? toPublic(MAPS[area]) : demoMap(area);
  return sq ? squareMap(m) : m;
}
const MUIMI = "/characters/muimi/muimi.webp";
const OBERON = "/characters/oberon(summer)/oberon_summer.webp";
const MOV = 4;
const Q = new URLSearchParams(location.search);
const qInt = (name, lo, hi, def) => { const v = parseInt(Q.get(name), 10); return v >= lo && v <= hi ? v : def; };

const KE_DEV = Q.get("ke") === "1";
const GYRO_DEV = Q.get("gyro") === "1";
const DIEGO_DEV = Q.get("diego") === "1";
const VAL_DEV = Q.get("valentine") === "1";
const FERN_DEV = Q.get("fern") === "1";
const CELINE_DEV = Q.get("celine") === "1";
const initialUnits = () => (KE_DEV ? ShadowFxDev.units(baseUnits()) : GYRO_DEV ? GyroFxDev.units(baseUnits()) : DIEGO_DEV ? DiegoFxDev.units(baseUnits())
  : VAL_DEV ? ValentineFxDev.units(baseUnits()) : FERN_DEV ? FernFxDev.units(baseUnits()) : CELINE_DEV ? CelineFxDev.units(baseUnits()) : baseUnits());
const baseUnits = () => [
  { id: "me", name: "มุยมิ", img: MUIMI, color: "#3B82C4", x: 2, y: 9, hp: 5, maxHp: 7, armor: 2, maxArmor: 3, tag: "18" },
  { id: "p2", name: "โอเบรอน", img: OBERON, color: "#C0392B", x: 6, y: 8, hp: 6, maxHp: 7, armor: 1, maxArmor: 3, tag: "พอ" },
  { id: "p3", name: "มุยมิ (บอท)", img: MUIMI, color: "#9B4F96", x: 11, y: 5, hp: 7, maxHp: 7, armor: 3, maxArmor: 3, tag: "แตก" },
  { id: "p4", name: "โอเบรอน (บอท)", img: OBERON, color: "#2E9E4B", x: 9, y: 3, hp: 4, maxHp: 7, armor: 0, maxArmor: 3, tag: { backs: 2 } },
  { id: "p5", name: "ไม่มีรูป", img: "/characters/__missing__.webp", color: "#E5B33B", x: 12, y: 9, hp: 3, maxHp: 7, armor: 3, maxArmor: 3, tag: "20" },
  { id: "p6", name: "โอเบรอน 2", img: OBERON, color: "#E86A2B", x: 3, y: 3, hp: 7, maxHp: 7, armor: 2, maxArmor: 3, tag: "15" },
];
// ย้ายตัวละครที่ยืนทับสิ่งกีดขวาง/ร้านของแผนที่ใหม่ไปจุดเกิดที่ว่าง
function placeUnits(units, map, shop) {
  const bad = (x, y, taken) => x < 0 || y < 0 || x >= map.cols || y >= map.rows || !!map.terrain[`${x},${y}`] || (shop && shop.x === x && shop.y === y) || taken.has(`${x},${y}`);
  const taken = new Set(), out = [];
  for (const u of units) {
    let p = { x: u.x, y: u.y };
    if (bad(p.x, p.y, taken)) p = map.spawns.find((s) => !bad(s.x, s.y, taken)) || p;
    taken.add(`${p.x},${p.y}`); out.push({ ...u, ...p });
  }
  return out;
}
const shopOf = (map) => (map.shopSpots && map.shopSpots[0]) || null;

const key = (x, y) => `${x},${y}`;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// M = แผนที่ที่กำลังดู + shop (ช่องร้าน)
const inB = (M, x, y) => x >= 0 && y >= 0 && x < M.cols && y < M.rows;
const isBlocked = (M, x, y) => !inB(M, x, y) || !!M.terrain[key(x, y)] || (!!M.shop && x === M.shop.x && y === M.shop.y);
const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// BFS 4 ทิศ ไม่เกิน mov ก้าว — ตัวละครอื่นขวางทาง
function reach(M, units, u, mov) {
  const start = { x: u.x, y: u.y, d: 0, prev: null };
  const R = new Map([[key(u.x, u.y), start]]), q = [start];
  while (q.length) {
    const c = q.shift();
    if (c.d >= mov) continue;
    for (const [dx, dy] of DIRS) {
      const nx = c.x + dx, ny = c.y + dy, k = key(nx, ny);
      if (R.has(k) || isBlocked(M, nx, ny) || units.some((o) => o.id !== u.id && o.x === nx && o.y === ny)) continue;
      const n = { x: nx, y: ny, d: c.d + 1, prev: c };
      R.set(k, n); q.push(n);
    }
  }
  return R;
}
function pathOf(R, x, y) {
  let n = R.get(key(x, y));
  if (!n) return null;
  const out = [];
  while (n) { out.unshift({ x: n.x, y: n.y }); n = n.prev; }
  return out;
}
// ช่องแดง = ตีถึงหลังเดิน (ระยะ 1) ไม่รวมช่องที่เดินถึง
function threat(M, R) {
  const out = new Set();
  for (const n of R.values()) for (const [dx, dy] of DIRS) {
    const x = n.x + dx, y = n.y + dy, k = key(x, y);
    if (!R.has(k) && inB(M, x, y) && !M.terrain[k]) out.add(k);
  }
  return out;
}
function diamond(M, cx, cy, r) {
  const out = [];
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
    const d = Math.abs(dx) + Math.abs(dy);
    if (d >= 1 && d <= r && inB(M, cx + dx, cy + dy)) out.push(key(cx + dx, cy + dy));
  }
  return out;
}
// ถอย 1 ช่องออกจากผู้สวน · ไม่มีที่ถอย = ชน
function pushback(M, units, a, d) {
  const dx = a.x - d.x, dy = a.y - d.y;
  const dirs = Math.abs(dx) > Math.abs(dy) ? [[Math.sign(dx), 0]] : Math.abs(dy) > Math.abs(dx) ? [[0, Math.sign(dy)]] : [[0, Math.sign(dy)], [Math.sign(dx), 0]];
  for (const [ux, uy] of dirs) {
    const nx = a.x + ux, ny = a.y + uy;
    if (!isBlocked(M, nx, ny) && !units.some((o) => o.id !== a.id && o.x === nx && o.y === ny)) return { to: { x: nx, y: ny }, collide: false };
  }
  const [ux, uy] = dirs[0];
  return { to: { x: a.x + ux, y: a.y + uy }, collide: true };
}
const hurt = (u, n) => { let { armor, hp } = u; for (let i = 0; i < n; i++) { if (armor > 0) armor--; else hp--; } return { ...u, armor, hp: Math.max(0, hp) }; };

const btn = (on) => ({
  font: "500 14px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "6px 12px",
  border: "1px solid " + (on ? "#f0c868" : "rgba(127,184,230,.35)"), background: on ? "#3d5f8f" : "rgba(22,36,64,.94)",
});

export default function BoardPreview() {
  const [area, setAreaState] = useState(() => qInt("area", 1, 11, 1));
  const [rotation, setRotation] = useState(() => qInt("rot", 0, 3, 0));
  const [zoom, setZoom] = useState(() => qInt("zoom", 0, 2, 0)); // 2 = มองจากด้านบน (ส่งเป็น view="top")
  const [sq, setSq] = useState(() => Q.get("sq") === "1");
  const map = useMemo(() => mapFor(area, sq), [area, sq]);
  const M = useMemo(() => ({ ...map, shop: shopOf(map) }), [map]);
  const [units, setUnitsState] = useState(() => { const m = mapFor(qInt("area", 1, 11, 1), Q.get("sq") === "1"); return placeUnits(initialUnits(), m, shopOf(m)); });
  const unitsRef = useRef(units); // ค่าล่าสุดสำหรับ setTimeout/คอลแบ็กแอนิเมชัน
  const setUnits = (fn) => {
    const next = typeof fn === "function" ? fn(unitsRef.current) : fn;
    unitsRef.current = next;
    setUnitsState(next);
  };
  const [actorId, setActorId] = useState("me");
  const [mode, setMode] = useState("move"); // move | skill | aoe
  const [night, setNight] = useState(() => Q.get("night") === "1");
  const [lowQ, setLowQ] = useState(false);
  const [danger, setDanger] = useState(false);
  const [hover, setHover] = useState(null);
  const [anim, setAnim] = useState(null);
  const [fx, setFx] = useState([]);
  const [log, setLog] = useState("คลิกช่องฟ้าเพื่อเดิน · คลิกศัตรูในช่องแดงเพื่อตี");
  const [lastClick, setLastClick] = useState(null);
  const [focus, setFocus] = useState(null);
  // Ice Spike (?ice=1): หนาม/น้ำแข็ง/คุกจำลอง
  const iceOn = Q.get("ice") === "1";
  const [iceMock, setIceMock] = useState(() => (iceOn ? { lv: null } : null));
  useEffect(() => { window.__boardIce = (v) => setIceMock(v || null); return () => { delete window.__boardIce; }; }, []);
  // ยูนะ: window.__boardSongs([{ kind: "delete"|"smile"|"idol", x, y, r }]) = วงเพลงบนพื้น (prop songs)
  const [songsMock, setSongsMock] = useState(null);
  // ไจโร (?gyro=1): ลูกเหล็กบนพื้นจำลอง [{ owner, color, x, y, seq }] (prop gyroBalls)
  const [gyroBalls, setGyroBalls] = useState(null);
  // ดิเอโก้ (?diego=1): ชั้นพื้นจำลอง { oil, fire, ash, nets } (prop diego) · หยุดเวลา { by } (prop timeFreeze)
  const [diegoGround, setDiegoGround] = useState(null);
  const [timeFreeze, setTimeFreeze] = useState(null);
  // วาเลนไทน์ (?valentine=1): ธงปัก [{ x, y, ownerId }] (prop valentine) · มุมมองมิติ "par"/"veil" (prop dimView)
  const [valFlags, setValFlags] = useState([]);
  const [dimView, setDimView] = useState(null);
  // เฟิร์น (?fern=1): ชาร์จจำลอง { charge } | null → prop ferns (ตามช่องของ "me")
  const [fernCharge, setFernCharge] = useState(null);
  // เซลิน (?celine=1): พุ่มดอกไม้ [{ x, y, left, made }] → special "bloom" · กำแพง [{ x, y }] → terrain "icewall" · ราชาดอกไม้ (me)
  const [celDev, setCelDev] = useState({ flora: [], walls: [], king: false });
  useEffect(() => { window.__boardSongs = (v) => setSongsMock(v && v.length ? v : null); return () => { delete window.__boardSongs; }; }, []);
  const iceMap0 = useMemo(() => (!iceOn ? map : {
    ...map,
    terrain: { ...map.terrain, "3,4": "icespike1", "4,4": "icespike2", "5,4": "icespike3" },
    special: { ...map.special, "3,6": "ice", "4,6": "ice", "5,6": "ice", "6,6": "ice" },
  }), [map, iceOn]);
  const iceMap = useMemo(() => (!CELINE_DEV || (!celDev.flora.length && !celDev.walls.length) ? iceMap0 : {
    ...iceMap0,
    terrain: { ...iceMap0.terrain, ...Object.fromEntries(celDev.walls.map((w) => [`${w.x},${w.y}`, "icewall"])) },
    special: { ...iceMap0.special, ...Object.fromEntries(celDev.flora.map((f) => [`${f.x},${f.y}`, "bloom"])) },
  }), [iceMap0, celDev]);
  // ทดสอบกล้องตามตัวละครจากคอนโซล: window.__boardFocus(x, y)
  useEffect(() => { window.__boardFocus = (x, y) => setFocus({ x, y }); return () => { delete window.__boardFocus; }; }, []);
  const after = useRef(null);   // งานต่อหลังแอนิเมชันจบ
  const fxId = useRef(0);

  const actor = units.find((u) => u.id === actorId) || units[0];
  const R = useMemo(() => reach(M, units, actor, MOV), [M, units, actor]);
  const busy = !!anim;

  const pushFx = (list) => setFx((old) => [...old.slice(-30), ...list.map((f) => ({ ...f, key: ++fxId.current }))]);
  useEffect(() => {
    window.__boardFx = (list) => setFx((old) => [...old.slice(-30), ...list.map((f) => ({ ...f, key: ++fxId.current }))]);
    window.__boardCloak = (id, on = true) => setUnitsState((us) => us.map((u) => (u.id === id ? { ...u, cloak: !!on } : u)));
    return () => { delete window.__boardFx; delete window.__boardCloak; };
  }, []);

  // เป้าที่ชี้อยู่ (ศัตรูในช่องแดง/ติดตัว) → ช่องยืนตี + พรีวิวถอย
  const plan = useMemo(() => {
    if (mode !== "move" || !hover) return null;
    const foe = units.find((u) => u.x === hover.x && u.y === hover.y && u.id !== actor.id);
    if (!foe) return null;
    let best = null;
    for (const n of R.values()) {
      if (man(n, foe) !== 1) continue;
      if (!best || n.d < best.d) best = n;
    }
    if (!best) return null;
    const stand = { x: best.x, y: best.y };
    const moved = units.map((u) => (u.id === actor.id ? { ...u, ...stand } : u));
    return { foe, stand, path: pathOf(R, stand.x, stand.y), push: { from: stand, ...pushback(M, moved, { ...actor, ...stand }, foe) } };
  }, [M, mode, hover, units, actor, R]);

  const highlights = useMemo(() => {
    const h = {};
    if (danger) {
      const d = new Set();
      for (const u of units) {
        if (u.id === "me") continue;
        const r = reach(M, units, u, MOV);
        for (const k of r.keys()) d.add(k);
        for (const k of threat(M, r)) d.add(k);
      }
      h.danger = [...d];
    }
    if (busy) return h;
    if (mode === "move") {
      h.move = [...R.keys()];
      h.attack = [...threat(M, R)];
      if (plan) { h.path = plan.path; h.target = { x: plan.foe.x, y: plan.foe.y }; h.push = plan.push; }
      else if (hover && R.has(key(hover.x, hover.y))) h.path = pathOf(R, hover.x, hover.y);
    } else if (mode === "skill") {
      h.skill = diamond(M, actor.x, actor.y, 3);
    } else if (mode === "aoe") {
      h.aoe = diamond(M, actor.x, actor.y, 5);
    }
    return h;
  }, [M, danger, busy, mode, R, plan, hover, actor, units]);

  const fernMe = units.find((u) => u.id === "me");
  const celineMock = CELINE_DEV && fernMe && (celDev.flora.length || celDev.king)
    ? { flora: celDev.flora, kings: celDev.king ? [{ id: "me", x: fernMe.x, y: fernMe.y, size: 1 }] : [] } : null;
  const fernMock = fernCharge && fernMe ? [{ id: "me", x: fernMe.x, y: fernMe.y, size: 1, charge: fernCharge.charge }] : null;
  const viewUnits = units.map((u) => ({ ...u, isMe: u.id === "me", isActor: u.id === actor.id, teamId: null }));

  const walk = (path, then) => {
    if (!path || path.length < 2) { if (then) then(); return; }
    setFocus(path[path.length - 1]);
    after.current = () => {
      const end = path[path.length - 1];
      setUnits((us) => us.map((u) => (u.id === actor.id ? { ...u, x: end.x, y: end.y } : u)));
      if (then) then();
    };
    setAnim({ kind: "move", id: actor.id, path });
  };
  const strike = (foe, stand) => {
    // ตี → สวน (ระยะ 1 ทุกตัว) → ถอย/ชน
    pushFx([{ kind: "slash", x: foe.x, y: foe.y, color: actor.color }, { kind: "float", x: foe.x, y: foe.y, text: "-1" }]);
    setUnits((us) => us.map((u) => (u.id === foe.id ? hurt(u, 1) : u)));
    setTimeout(() => {
      pushFx([{ kind: "slash", x: stand.x, y: stand.y, color: foe.color }, { kind: "float", x: stand.x, y: stand.y, text: "สวน -1", color: "#ffb0a8", size: 22 }]);
      setUnits((us) => us.map((u) => (u.id === actor.id ? hurt(u, 1) : u)));
      setTimeout(() => {
        const us = unitsRef.current;
        const me = us.find((u) => u.id === actor.id);
        const pb = pushback(M, us, me, foe);
        after.current = () => {
          if (pb.collide) {
            setUnits((v) => v.map((u) => (u.id === actor.id ? hurt(u, 1) : u)));
            pushFx([{ kind: "float", x: me.x, y: me.y, text: "ชน -1", color: "#ffc56b", size: 22 }]);
            setLog("หลังพิงสิ่งกีดขวาง → ถอยไม่ได้ ชน −1");
          } else {
            setUnits((v) => v.map((u) => (u.id === actor.id ? { ...u, ...pb.to } : u)));
            pushFx([{ kind: "float", x: pb.to.x, y: pb.to.y, text: "ถอย", color: "#ffd27a", size: 20 }]);
            setLog("โดนสวน → ถอย 1 ช่อง");
          }
        };
        setAnim({ kind: "push", id: actor.id, from: { x: me.x, y: me.y }, to: pb.to, collide: pb.collide });
      }, 420);
    }, 520);
  };

  const onAnimDone = () => {
    const f = after.current;
    after.current = null;
    setAnim(null);
    if (f) f();
  };

  const onTileClick = (x, y) => {
    setLastClick(`(${x}, ${y})`);
    if (busy) return;
    const k = key(x, y);
    if (mode === "move" && R.has(k)) { walk(pathOf(R, x, y)); setLog(`เดินไป (${x}, ${y})`); return; }
    if (mode === "aoe" && highlights.aoe && highlights.aoe.includes(k)) {
      const hit = units.filter((u) => u.id !== actor.id && man(u, actor) <= 5);
      pushFx(hit.flatMap((u) => [{ kind: "slash", x: u.x, y: u.y, color: "#ffcf5a" }, { kind: "float", x: u.x, y: u.y, text: "-1" }]));
      setUnits((us) => us.map((u) => (hit.some((h) => h.id === u.id) ? hurt(u, 1) : u)));
      setLog(`ตีหมู่โดน ${hit.length} คน`); setMode("move");
    }
  };
  const onUnitClick = (id) => {
    if (busy) return;
    const u = units.find((v) => v.id === id);
    if (!u) return;
    setLastClick(`${u.name} (${u.x}, ${u.y})`);
    if (id === actor.id) return;
    if (mode === "skill" && man(u, actor) <= 3) {
      pushFx([{ kind: "slash", x: u.x, y: u.y, color: "#c9a2ff" }, { kind: "float", x: u.x, y: u.y, text: "ลุกไหม้ +2", color: "#ffb347", size: 20 }]);
      setLog(`ใช้สกิลใส่ ${u.name}`); setMode("move"); return;
    }
    if (mode === "aoe") { onTileClick(u.x, u.y); return; }
    if (mode === "move" && plan && plan.foe.id === id) {
      const stand = plan.stand;
      setLog(`ตี ${u.name}`);
      walk(plan.path, () => strike(u, stand));
      return;
    }
    setActorId(id); setMode("move"); setFocus({ x: u.x, y: u.y }); setLog(`เลือก ${u.name} เป็นคนเดิน`);
  };

  const reset = () => { setUnits(placeUnits(initialUnits(), M, M.shop)); setActorId("me"); setMode("move"); setAnim(null); after.current = null; setLog("รีเซ็ตแล้ว"); };
  // เปลี่ยนภูมิภาค/มุมมอง + จำลงใน URL (รีเฟรชแล้วยังอยู่ที่เดิม)
  const syncUrl = (a, r, n, extra = {}) => {
    const q = new URLSearchParams(location.search);
    q.set("area", a); if (r) q.set("rot", r); else q.delete("rot"); if (n) q.set("night", "1"); else q.delete("night");
    for (const [k, v] of Object.entries(extra)) { if (v) q.set(k, "1"); else q.delete(k); }
    history.replaceState(null, "", `${location.pathname}?${q.toString()}`);
  };
  const changeZoom = (z) => { const v = z > 0 ? 1 : 0; setZoom(v); syncUrl(area, rotation, night, { zoom: v }); };
  const toggleSq = () => {
    const v = !sq, m = mapFor(area, v);
    setSq(v); setAnim(null); after.current = null; setMode("move");
    setUnits(placeUnits(unitsRef.current, m, shopOf(m)));
    setLog(v ? `กระดาน ${m.cols} × ${m.rows}` : "แผนที่เดิม");
    syncUrl(area, rotation, night, { sq: v });
  };
  const setArea = (a) => {
    const m = mapFor(a, sq);
    setAreaState(a); setAnim(null); after.current = null; setMode("move");
    setUnits(placeUnits(unitsRef.current, m, shopOf(m)));
    setLog(`ภูมิภาค ${ROMAN[a]} · ${AREA_NAMES[a]}${MAPS[a] && MAPS[a].area === a ? "" : " (แผนที่สาธิต)"}`);
    syncUrl(a, rotation, night);
  };
  const turn = (d) => { const r = (rotation + d + 4) % 4; setRotation(r); syncUrl(area, r, night); };
  const hoverInfo = hover ? [
    map.terrain[key(hover.x, hover.y)] && `สิ่งกีดขวาง: ${map.terrain[key(hover.x, hover.y)]}`,
    map.special && map.special[key(hover.x, hover.y)] && `ช่องพิเศษ: ${SPECIAL_NAMES[map.special[key(hover.x, hover.y)]] || map.special[key(hover.x, hover.y)]}${map.flow && map.flow[key(hover.x, hover.y)] ? " " + FLOW_NAMES[map.flow[key(hover.x, hover.y)]] : ""}`,
    map.heal.includes(key(hover.x, hover.y)) && (area === 5 ? "โอเอซิส (ฟื้นฟู)" : "จุดฟื้นฟู"),
  ].filter(Boolean).join(" · ") : "";

  // ห่วงเวลาซีโร่ (area 8–11): ผนึก 4 มุม (ระดับ N = แตกไป N−1 อัน) + ของฟื้นพลังชีวิต 1 ชิ้น
  //  คอนโซล: window.__zeroScene("enter" | "break" | "release", ผนึก 0–3) · window.__zeroBolt() = ฟ้าผ่า 3 จุด
  const zeroStage = area >= 8 ? area - 7 : 0;
  const zeroMock = useMemo(() => (zeroStage ? {
    active: true, stage: zeroStage,
    seals: [[0, 0], [13, 0], [13, 13], [0, 13]].map(([x, y], i) => ({ i, x, y, hp: i === 3 ? 2 : 3, armor: i === 3 ? 0 : 2, maxHp: 3, maxArmor: 2, broken: i < zeroStage - 1 })),
    pickups: [{ x: 7, y: 11 }],
  } : null), [zeroStage]);
  const [zeroScene, setZeroScene] = useState(null);
  // ม่านแดง (เคท): ฉากร่าย + ม่านบนกระดาน · กล้องซูมตามฉาก (prop cinema)
  const [storms, setStorms] = useState(null);
  const [stormOut, setStormOut] = useState(() => Q.get("stormout") === "1");
  const toggleStormOut = () => { const v = !stormOut; setStormOut(v); setStorms((ss) => (ss ? ss.map((x) => ({ ...x, owner: v ? "foe" : "me" })) : ss)); };
  const [cinema, setCinema] = useState(null);
  const castDemo = (cx = Math.floor(map.cols / 2), cy = Math.floor(map.rows / 2)) => {
    const r = { x0: Math.max(0, cx - 4), y0: Math.max(0, cy - 4), x1: Math.min(map.cols - 1, cx + 3), y1: Math.min(map.rows - 1, cy + 3) };
    castStorm({ by: "me", ...r, center: { x: cx, y: cy } });
    setStorms([{ ...r, owner: stormOut ? "foe" : "me", left: 3 }]);
  };
  const castRef = useRef(castDemo);
  useEffect(() => { castRef.current = castDemo; });
  useEffect(() => {
    window.__kateStorm = (x, y) => castRef.current(x, y);
    window.__kateStormClear = () => setStorms(null);
    if (Q.get("storm") === "1") { const t = setTimeout(() => castRef.current(), 600); return () => { clearTimeout(t); delete window.__kateStorm; delete window.__kateStormClear; }; }
    return () => { delete window.__kateStorm; delete window.__kateStormClear; };
  }, []);
  useEffect(() => {
    window.__zeroScene = (mode = "enter", seal = 0) => setZeroScene((z) => ({ seq: (z ? z.seq : 0) + 1, mode, stage: zeroStage || 1, seal }));
    window.__zeroBolt = () => setFx((f) => [...f, { key: "bolt" + Date.now(), kind: "zeroBolt", tiles: [{ x: 3, y: 4 }, { x: 8, y: 9 }, { x: 11, y: 2 }] }]);
    return () => { delete window.__zeroScene; delete window.__zeroBolt; };
  }, [zeroStage]);

  return (
    <div style={{ position: "fixed", inset: 0, background: night ? "#0d1830" : "#dfeaf6", fontFamily: "Kanit, sans-serif" }}>
      <BoardCanvas
        map={iceMap}
        ice={iceMock}
        units={viewUnits}
        highlights={highlights}
        shopPos={M.shop}
        rotation={rotation}
        zoom={zoom === 1 ? 2 : 0} view={zoom === 2 ? "top" : "tilt"}
        onZoomChange={changeZoom}
        focus={focus}
        shopLabel={3}
        night={night}
        lowQ={lowQ}
        anim={anim}
        fx={fx}
        zero={zeroMock}
        zeroScene={zeroScene}
        storms={storms}
        songs={songsMock}
        gyroBalls={gyroBalls}
        diego={diegoGround}
        timeFreeze={timeFreeze}
        valentine={valFlags.length ? { flags: valFlags } : null}
        dimView={dimView}
        ferns={fernMock}
        celine={celineMock}
        cinema={cinema}
        onAnimDone={onAnimDone}
        onTileClick={onTileClick}
        onUnitClick={onUnitClick}
        onHoverTile={(x, y) => setHover(x == null ? null : { x, y })}
      />
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 760 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((a) => (
          <button key={a} style={btn(area === a)} title={AREA_NAMES[a]} onClick={() => setArea(a)}>{ROMAN[a]}</button>
        ))}
        <span style={{ width: 8 }} />
        <button style={btn(false)} title="หมุนทวนเข็ม" onClick={() => turn(-1)}>⟲</button>
        <button style={btn(false)} title="หมุนตามเข็ม" onClick={() => turn(1)}>⟳ {rotation * 90}°</button>
        <button style={btn(!!zoom)} title="ซูม (ล้อเมาส์)" onClick={() => changeZoom(zoom ? 0 : 1)}>{zoom ? "－" : "＋"}</button>
        <button style={btn(sq)} onClick={toggleSq}>14×14</button>
        <button style={btn(night)} onClick={() => { setNight(!night); syncUrl(area, rotation, !night); }}>กลางคืน</button>
        <button style={btn(lowQ)} onClick={() => setLowQ((v) => !v)}>ประหยัดสเปก</button>
        <button style={btn(danger)} onClick={() => setDanger((v) => !v)}>ระยะอันตราย</button>
        <span style={{ width: 8 }} />
        <button style={btn(mode === "move")} onClick={() => setMode("move")}>เดิน</button>
        <button style={btn(mode === "skill")} onClick={() => setMode("skill")}>สกิล ระยะ 3</button>
        <button style={btn(mode === "aoe")} onClick={() => setMode("aoe")}>ตีหมู่ รอบตัว 5</button>
        <button style={btn(false)} onClick={reset}>รีเซ็ต</button>
        <button style={btn(!!storms)} onClick={() => (storms ? setStorms(null) : castDemo())}>ระบำเขม่า</button>
        <button style={btn(stormOut)} onClick={toggleStormOut}>มองจากนอก</button>
      </div>
      <KateStorm lowQ={lowQ} onCinema={setCinema} />
      {KE_DEV && <ShadowFxDev units={units} setUnits={setUnits} pushFx={pushFx} setFocus={setFocus} map={map} />}
      {DIEGO_DEV && <DiegoFxDev units={units} setUnits={setUnits} pushFx={pushFx} setFocus={setFocus} map={map} ground={diegoGround} setGround={setDiegoGround} freeze={timeFreeze} setFreeze={setTimeFreeze} />}
      {VAL_DEV && <ValentineFxDev units={units} setUnits={setUnits} pushFx={pushFx} setFocus={setFocus} map={map} flags={valFlags} setFlags={setValFlags} dimView={dimView} setDimView={setDimView} />}
      {CELINE_DEV && <CelineFxDev units={units} setUnits={setUnits} pushFx={pushFx} setFocus={setFocus} map={iceMap} cel={celDev} setCel={setCelDev} />}
      {FERN_DEV && <FernFxDev units={units} pushFx={pushFx} setFocus={setFocus} map={map} ferns={fernCharge} setFerns={setFernCharge} />}
      {GYRO_DEV && <GyroFxDev units={units} setUnits={setUnits} pushFx={pushFx} setFocus={setFocus} map={map} balls={gyroBalls} setBalls={setGyroBalls} />}
      <div style={{ position: "absolute", left: 12, bottom: 12, padding: "8px 14px", color: "#fff", background: "rgba(22,36,64,.94)", font: "400 14px Kanit, sans-serif" }}>
        <div>ภูมิภาค {ROMAN[area]} · {AREA_NAMES[area]}{map.demo ? " (แผนที่สาธิต)" : ""} · {map.cols} × {map.rows}{zoom ? " · มุมใกล้" : ""}</div>
        <div>คนเดิน: <b>{actor.name}</b> (เดิน {MOV}) · โหมด: {mode === "move" ? "เดิน" : mode === "skill" ? "สกิลระยะ 3" : "ตีหมู่ 5"}</div>
        <div style={{ color: "#9db8da" }}>ชี้ช่อง: {hover ? `(${hover.x}, ${hover.y})` : "—"}{hoverInfo ? ` · ${hoverInfo}` : ""} · คลิก: <span data-testid="last-click">{lastClick || "—"}</span> · {log}</div>
      </div>
    </div>
  );
}
