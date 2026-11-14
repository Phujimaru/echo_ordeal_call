// ============================================================
//  มอนโหมด Road Trip บนกระดาน (contract §8 · server/roadtrip/mobs.js · Summon side "rtmob")
//  10 แบบ: stray หมาจรจัด · crow อีกาเหล็ก · biker แก๊งมอเตอร์ไซค์ · trucker ซอมบี้รถบรรทุก · giant ยักษ์ขวางถนน
//          cactus กระบองเพชรเดินได้ · boar หมูป่า · yeti มนุษย์หิมะ · ghost ผีโบกรถ · saberclaw เสือเขี้ยวดาบ
//          บอส (หมุนตามหลัก 50 กม.): devilTruck แม็กซ์ เวอร์สแตปเพน (นักแข่ง — ผู้ใช้ตั้งชื่อ 2026-11-14) · darkKnight อัศวินเงามรณะ · jormungand จอร์มุนกันด์
//  ภาพผู้ใช้บางตัวเป็นรูปตัดคน/เงา (devilTruck = คนวิ่ง · ghost = เงาคนโบกรถ) → วาดเงาพื้นนุ่ม + เงาขอบเข้มให้อ่านออกบนกระดาน
//  สไตล์: น่ารักแต่ดุ ตัวอ้วนกลม ตาเรือง (กลางคืนเรืองชัด) · ขยับตัวเบาๆ · หันซ้าย/ขวาตามทิศ (u.face) · โดนตี = สั่น + วาบขาว (u.hitT)
//  มีไฟล์ภาพ /roadtrip/mobs/<ชนิด>.webp (ผู้ใช้ส่งมาภายหลัง) = ใช้ภาพนั้นเป็นตัวยืนแทน · ไม่มี = วาดเอง
//  ชนิดมอนอ่านจาก (ตามลำดับ): u.mobType · u.summon.mobType · u.summon.kind "rtmob:<ชนิด>" · u.img ".../roadtrip/mobs/<ชนิด>.webp" · ชื่อไทย
// ============================================================
import { P, depthOf } from "../boardGeo";
import { rtState } from "./theme";
import { bossF1For, rtRoleOf } from "./rtTimeline";

const TAU = Math.PI * 2;
export const RT_MOB_TYPES = ["stray", "crow", "biker", "trucker", "giant", "cactus", "boar", "yeti", "ghost", "saberclaw", "devilTruck", "darkKnight", "jormungand"];
export const RT_BOSS_TYPES = ["devilTruck", "darkKnight", "jormungand"];
const isBoss = (t) => RT_BOSS_TYPES.includes(t);
// ความสูงภาพบนกระดาน (หน่วยช่อง) — บอสใหญ่ · เสือ/ยักษ์ขนาดกลางค่อนใหญ่ · อื่นๆ ปกติ
const ART_H = { devilTruck: 1.9, darkKnight: 2.05, jormungand: 2.1, giant: 1.9, saberclaw: 1.15 };
const ART_MAX_W = (t) => (isBoss(t) ? 2.4 : 1.7); // ภาพกว้าง (เสือนอนยาว) ไม่ล้นช่องข้างเคียงเกินไป
// ทิศที่ภาพหันอยู่เดิม (1 = ขวา · -1 = ซ้าย) — ตัววาดเองหันขวาเสมอ
const ART_FACE = { saberclaw: -1, jormungand: -1 };
const NAME_TYPE = [["แม็กซ์", "devilTruck"], ["เสือ", "saberclaw"], ["อัศวิน", "darkKnight"], ["จอร์มุนกันด์", "jormungand"], ["หมา", "stray"], ["อีกา", "crow"], ["มอเตอร์ไซค์", "biker"], ["ซอมบี้", "trucker"], ["ยักษ์", "giant"], ["กระบองเพชร", "cactus"], ["หมูป่า", "boar"], ["มนุษย์หิมะ", "yeti"], ["ผี", "ghost"], ["ปีศาจ", "devilTruck"]];

export function isRtMob(u) {
  const s = u && u.summon;
  if (s && (s.rtWreck || s.side === "rtwreck")) return true; // ซากรถ F1 (บอสแม็กซ์โยน) — วาดในไฟล์นี้
  if (!s) return !!(u && u.mobType && RT_MOB_TYPES.includes(u.mobType));
  return s.side === "rtmob" || (typeof s.kind === "string" && /^rt[_:]?mob/i.test(s.kind)) || !!s.mobType;
}
export function rtMobTypeOf(u) {
  const s = (u && u.summon) || {};
  const cand = u.mobType || s.mobType || (s.data && s.data.mobType) || (typeof s.kind === "string" && s.kind.includes(":") ? s.kind.split(":")[1] : null);
  if (RT_MOB_TYPES.includes(cand)) return cand;
  const m = typeof u.img === "string" && u.img.match(/roadtrip\/mobs\/([A-Za-z]+)\./);
  if (m && RT_MOB_TYPES.includes(m[1])) return m[1];
  const n = String(u.name || "");
  for (const [k, t] of NAME_TYPE) if (n.includes(k)) return t;
  return "stray";
}

// ---------------------------------------------------------------- ภาพที่ผู้ใช้ส่งมา (ถ้ามี)
const IMG = new Map(); // ชนิด → { img, ok }
function artOf(type) {
  if (typeof Image === "undefined") return null;
  let e = IMG.get(type);
  if (!e) {
    e = { img: new Image(), ok: false };
    e.img.onload = () => { e.ok = true; };
    e.img.onerror = () => { e.ok = false; };
    e.img.src = `/roadtrip/mobs/${type}.webp`;
    IMG.set(type, e);
  }
  return e.ok ? e.img : null;
}

// ---------------------------------------------------------------- เครื่องมือวาด (พิกัดจอ หน่วย S = ขนาดช่องบนจอ)
let g = null, S = 1, NIGHT = false;
const E = (x, y, rx, ry, c, rot = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(x * S, y * S, Math.abs(rx * S), Math.abs(ry * S), rot, 0, TAU); g.fill(); };
const C0 = (x, y, r, c) => E(x, y, r, r, c);
function PL(pts, c, stroke) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * S, y * S) : g.moveTo(x * S, y * S))); g.closePath(); if (c) { g.fillStyle = c; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = Math.max(1, S * 0.025); g.stroke(); } }
function RR(x, y, w, h, r, c) { g.fillStyle = c; g.beginPath(); g.roundRect(x * S, y * S, w * S, h * S, r * S); g.fill(); }
function LN(x0, y0, x1, y1, w, c) { g.strokeStyle = c; g.lineWidth = Math.max(1, w * S); g.lineCap = "round"; g.beginPath(); g.moveTo(x0 * S, y0 * S); g.lineTo(x1 * S, y1 * S); g.stroke(); g.lineCap = "butt"; }
// ตาดุ (คิ้วเฉียง) — เรืองตอนกลางคืน
function eye(x, y, r, iris = "#e8343a", brow = true) {
  if (NIGHT) { g.save(); g.shadowColor = iris; g.shadowBlur = S * 0.25; }
  C0(x, y, r, "#ffffff"); C0(x + r * 0.15, y + r * 0.1, r * 0.55, iris); C0(x + r * 0.2, y + r * 0.1, r * 0.25, "#1a1014");
  if (NIGHT) g.restore();
  if (brow) LN(x - r * 1.1, y - r * 1.25, x + r * 1.0, y - r * 0.7, r * 0.45, "#1f1a1a");
}
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f)))); return `rgb(${c})`; };

// แต่ละชนิด: วาดหันขวา จุด (0, 0) = เท้ากลาง · y ลบ = ขึ้น · t = เวลา (ms) · คืนความสูงตัว (หน่วยช่อง) ให้วางแถบเลือด
const DRAW = {
  stray(t) {
    const run = Math.sin(t / 90);
    for (const [x, ph] of [[-0.22, 0], [-0.1, 1], [0.14, 1], [0.26, 0]]) LN(x, -0.22, x + Math.sin(t / 90 + ph * 3) * 0.04, 0, 0.07, "#7a5a3c");
    E(0.02, -0.3, 0.32, 0.17, "#a0784e");
    E(-0.02, -0.38, 0.2, 0.08, "#8a6640");                                           // หลังขนฟู
    for (let i = 0; i < 4; i++) PL([[-0.18 + i * 0.1, -0.44], [-0.13 + i * 0.1, -0.54], [-0.08 + i * 0.1, -0.44]], "#8a6640");
    LN(-0.3, -0.34, -0.46, -0.5 + run * 0.04, 0.06, "#8a6640");                       // หาง
    C0(0.33, -0.44, 0.17, "#a0784e"); E(0.47, -0.4, 0.1, 0.07, "#8a6640");            // หัว + จมูก
    C0(0.55, -0.42, 0.035, "#1a1014");
    PL([[0.24, -0.55], [0.28, -0.72], [0.36, -0.57]], "#7a5a3c"); PL([[0.36, -0.57], [0.44, -0.7], [0.44, -0.52]], "#7a5a3c");
    eye(0.38, -0.48, 0.045);
    PL([[0.43, -0.36], [0.47, -0.3], [0.5, -0.36]], "#ffffff");                       // เขี้ยว
    E(0.28, -0.3, 0.08, 0.04, "#d94a4a");                                             // ปลอกคอขาด
    return 0.75;
  },
  crow(t) {
    const fl = Math.sin(t / 70), z = -0.75 + Math.sin(t / 400) * 0.06;
    E(0, 0, 0.18, 0.06, "rgba(0,0,0,.18)");                                           // เงาบนพื้น (บิน)
    g.save(); g.translate(0, z * S);
    PL([[-0.05, -0.05], [-0.5, -0.2 - fl * 0.3], [-0.38, 0.0 - fl * 0.15], [-0.2, 0.05]], "#4a5160", "#2a2f38"); // ปีกหลัง
    E(0, 0, 0.24, 0.17, "#5d6676"); E(-0.02, 0.04, 0.17, 0.1, "#788396");
    for (let i = 0; i < 3; i++) LN(-0.12 + i * 0.08, -0.1, -0.1 + i * 0.08, 0.1, 0.012, "#9aa6b8");   // แผ่นเหล็ก/หมุด
    PL([[-0.22, 0.02], [-0.42, 0.1], [-0.4, -0.04]], "#4a5160");                      // หาง
    C0(0.22, -0.12, 0.13, "#5d6676");
    PL([[0.32, -0.15], [0.5, -0.1], [0.32, -0.06]], "#e0a43a");                        // จะงอยปาก
    eye(0.25, -0.15, 0.04, "#ffcf3a");
    PL([[0.05, -0.05], [-0.25, -0.45 + fl * 0.35], [-0.05, -0.3 + fl * 0.2], [0.15, -0.05]], "#6d7788", "#2a2f38"); // ปีกหน้า
    for (const x of [-0.05, 0.06]) LN(x, 0.15, x, 0.26, 0.025, "#e0a43a");
    g.restore();
    return 1.1;
  },
  biker(t) {
    const v = Math.sin(t / 60) * 0.01;
    for (const x of [-0.36, 0.38]) { C0(x, -0.17, 0.17, "#1e1f22"); C0(x, -0.17, 0.08, "#9aa0a8"); }
    PL([[-0.4, -0.3], [0.1, -0.36], [0.3, -0.44], [0.46, -0.3], [0.2, -0.24], [-0.3, -0.22]], "#c9302c");  // ตัวรถ
    LN(0.3, -0.42, 0.42, -0.6, 0.04, "#9aa0a8"); LN(0.38, -0.6, 0.5, -0.6, 0.04, "#2d333b");               // แฮนด์
    C0(0.47, -0.36, 0.05, NIGHT ? "#fff6c8" : "#ffe9a8");
    for (let i = 0; i < 3; i++) E(-0.5 - i * 0.12, -0.3 + Math.sin(t / 80 + i) * 0.02, 0.06 + i * 0.02, 0.05, `rgba(255,${140 - i * 40},40,${0.8 - i * 0.2})`); // ไฟท่อ
    g.save(); g.translate(0, v * S);
    PL([[-0.1, -0.35], [0.1, -0.35], [0.16, -0.72], [-0.06, -0.74]], "#2d2a2a");      // เสื้อหนัง
    for (let i = 0; i < 3; i++) C0(-0.02 + i * 0.05, -0.62, 0.012, "#d9d9d9");         // หมุด
    LN(0.1, -0.66, 0.36, -0.58, 0.07, "#2d2a2a");
    C0(0.06, -0.86, 0.15, "#1f2a33"); E(0.12, -0.84, 0.09, 0.05, "#e8343a");           // หมวกกันน็อก + กระจกแดง
    PL([[-0.06, -0.98], [-0.02, -1.08], [0.04, -0.99]], "#d9d9d9"); PL([[0.08, -0.99], [0.14, -1.08], [0.17, -0.97]], "#d9d9d9"); // หนาม
    g.restore();
    return 1.12;
  },
  trucker(t) {
    const sw = Math.sin(t / 420) * 0.04;
    for (const x of [-0.14, 0.12]) RR(x - 0.07, -0.36, 0.14, 0.36, 0.04, "#2f4a7a");
    RR(-0.25, -0.86, 0.5, 0.56, 0.12, "#3d5f99");                                      // เอี๊ยม
    RR(-0.2, -0.82, 0.4, 0.22, 0.05, "#c9a57a");                                       // เสื้อลายสก็อต
    LN(-0.24, -0.76, -0.32, -0.42 + sw, 0.1, "#7fae6a"); LN(0.24, -0.76, 0.5, -0.66 + sw, 0.1, "#7fae6a"); // แขนยื่น
    C0(0.52, -0.66 + sw, 0.06, "#7fae6a");
    C0(0.03, -1.05, 0.22, "#8cbf74");                                                   // หัวซอมบี้
    E(0.02, -1.2, 0.24, 0.08, "#d9534f"); E(0.2, -1.16, 0.14, 0.04, "#b03a36");         // หมวกแก๊ป
    eye(0.1, -1.06, 0.05, "#f2e14b", false); C0(-0.05, -1.04, 0.035, "#2a3a20");
    LN(-0.02, -0.94, 0.14, -0.92, 0.025, "#3a2a20");
    LN(0.12, -0.98, 0.16, -1.0, 0.012, "#3a2a20");                                     // แผลเย็บ
    return 1.38;
  },
  giant(t) {
    const br = Math.sin(t / 700) * 0.02;
    for (const x of [-0.2, 0.2]) RR(x - 0.13, -0.42, 0.26, 0.42, 0.08, "#6b5a8a");
    E(0, -0.9 - br, 0.5, 0.52, "#8a76b0");                                             // ลำตัวใหญ่
    E(0.04, -0.82 - br, 0.32, 0.32, "#a596c6");
    RR(-0.46, -0.62, 0.92, 0.12, 0.04, "#5a3a22");                                     // เข็มขัด
    RR(-0.06, -0.63, 0.14, 0.14, 0.02, "#e0b84a");
    LN(-0.45, -1.05, -0.62, -0.5, 0.17, "#8a76b0"); LN(0.45, -1.05, 0.62, -0.55, 0.17, "#8a76b0");
    RR(0.48, -0.75, 0.18, 0.75, 0.06, "#7a5634");                                      // กระบองป้ายถนน
    RR(0.42, -1.0, 0.3, 0.3, 0.05, "#f2c84b");
    C0(0.02, -1.48 - br, 0.24, "#8a76b0");
    eye(-0.06, -1.52 - br, 0.05); eye(0.12, -1.52 - br, 0.05);
    PL([[-0.08, -1.36 - br], [0.14, -1.36 - br], [0.1, -1.3 - br], [-0.04, -1.3 - br]], "#3a2040");
    PL([[-0.03, -1.36 - br], [0.0, -1.31 - br], [0.03, -1.36 - br]], "#ffffff");
    PL([[-0.12, -1.66], [-0.08, -1.82], [-0.02, -1.68]], "#e8e0d0"); PL([[0.08, -1.68], [0.14, -1.82], [0.18, -1.66]], "#e8e0d0"); // เขา
    return 1.95;
  },
  cactus(t) {
    const hop = Math.abs(Math.sin(t / 260)) * 0.06;
    g.save(); g.translate(0, -hop * S);
    for (const x of [-0.1, 0.1]) LN(x, -0.15, x + Math.sin(t / 260) * 0.05, 0.02, 0.06, "#3f7d36");
    RR(-0.2, -0.95, 0.4, 0.85, 0.2, "#5fa04c");
    for (let i = 0; i < 3; i++) LN(-0.1 + i * 0.1, -0.88, -0.1 + i * 0.1, -0.2, 0.015, "#4b8c40");
    RR(-0.42, -0.7, 0.24, 0.12, 0.06, "#5fa04c"); RR(-0.42, -0.9, 0.12, 0.3, 0.06, "#5fa04c");   // แขนซ้าย
    RR(0.18, -0.55, 0.22, 0.12, 0.06, "#5fa04c"); RR(0.3, -0.78, 0.12, 0.33, 0.06, "#5fa04c");   // แขนขวา
    for (let i = 0; i < 10; i++) { const a = i * 2.4, x = Math.cos(a) * 0.17, y = -0.5 + Math.sin(a * 1.3) * 0.36; LN(x, y, x * 1.35, y - 0.03, 0.012, "#f6efe0"); } // หนาม
    eye(-0.03, -0.72, 0.05); eye(0.11, -0.72, 0.05);
    PL([[-0.04, -0.56], [0.14, -0.56], [0.05, -0.5]], "#2a3a20");
    C0(0.0, -0.98, 0.07, "#ff6fa8"); C0(0.0, -0.98, 0.03, "#ffd23f");                   // ดอกบนหัว
    g.restore();
    return 1.1;
  },
  boar(t) {
    const run = Math.sin(t / 110);
    for (const [x, ph] of [[-0.24, 0], [-0.1, 1], [0.12, 1], [0.24, 0]]) LN(x, -0.2, x + Math.sin(t / 110 + ph * 3) * 0.04, 0, 0.08, "#4a3a2c");
    E(0, -0.34, 0.38, 0.22, "#6b5240");
    for (let i = 0; i < 6; i++) PL([[-0.3 + i * 0.1, -0.5], [-0.26 + i * 0.1, -0.64 - (i % 2) * 0.04], [-0.22 + i * 0.1, -0.5]], "#4a3a2c"); // ขนแผงคอ
    LN(-0.36, -0.36, -0.46, -0.3 + run * 0.03, 0.03, "#4a3a2c");
    E(0.38, -0.34, 0.2, 0.16, "#6b5240");
    E(0.55, -0.3, 0.07, 0.07, "#c48a7a"); C0(0.53, -0.31, 0.015, "#3a2020"); C0(0.58, -0.31, 0.015, "#3a2020");
    PL([[0.46, -0.24], [0.62, -0.38], [0.5, -0.22]], "#f6efe0");                     // งา
    PL([[0.3, -0.48], [0.34, -0.58], [0.4, -0.47]], "#4a3a2c");
    eye(0.44, -0.4, 0.04);
    return 0.82;
  },
  yeti(t) {
    const br = Math.sin(t / 600) * 0.02;
    for (const x of [-0.16, 0.16]) E(x, -0.12, 0.13, 0.13, "#e8eef6");
    E(0, -0.68 - br, 0.38, 0.5, "#f2f6fb");
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; E(Math.cos(a) * 0.33, -0.68 + Math.sin(a) * 0.45, 0.08, 0.08, "#ffffff"); } // ขนฟู
    E(-0.4, -0.66, 0.12, 0.3, "#e8eef6", 0.3); E(0.42, -0.62 + Math.sin(t / 300) * 0.03, 0.12, 0.3, "#e8eef6", -0.4);
    E(0.08, -1.0 - br, 0.2, 0.15, "#7fa7d6");                                           // หน้าฟ้า
    eye(0.02, -1.03 - br, 0.04, "#3a9ad9"); eye(0.15, -1.03 - br, 0.04, "#3a9ad9");
    PL([[0.0, -0.93 - br], [0.18, -0.93 - br], [0.09, -0.88 - br]], "#2a3a5a");
    PL([[0.03, -0.93 - br], [0.05, -0.89 - br], [0.07, -0.93 - br]], "#ffffff");
    if ((t / 900 | 0) % 3 === 0) for (let i = 0; i < 3; i++) C0(0.32 + i * 0.07, -0.95 - i * 0.04, 0.025, "rgba(220,240,255,.8)"); // ลมหายใจเย็น
    return 1.35;
  },
  ghost(t) {
    const fl = Math.sin(t / 500) * 0.06;
    g.globalAlpha *= 0.82;
    g.save(); g.translate(0, (-0.12 + fl) * S);
    if (NIGHT) { g.shadowColor = "rgba(190,170,255,.9)"; g.shadowBlur = S * 0.3; }
    g.fillStyle = "#eef0ff"; g.beginPath();
    g.arc(0, -0.75 * S, 0.27 * S, Math.PI, 0); g.lineTo(0.27 * S, -0.1 * S);
    for (let i = 0; i < 5; i++) g.lineTo((0.27 - (i + 0.5) * 0.108) * S, (-0.1 + (i % 2 ? 0 : 0.08) + Math.sin(t / 150 + i) * 0.02) * S);
    g.lineTo(-0.27 * S, -0.1 * S); g.closePath(); g.fill();
    g.shadowBlur = 0;
    E(0.0, -0.62, 0.18, 0.06, "#b8a6e0");                                               // ผ้าพันคอ
    LN(0.18, -0.55, 0.42, -0.72, 0.08, "#eef0ff");                                      // แขนโบกรถ
    E(0.44, -0.76, 0.06, 0.05, "#eef0ff"); LN(0.44, -0.79, 0.44, -0.9, 0.04, "#eef0ff"); // นิ้วโป้ง
    C0(-0.08, -0.8, 0.055, "#2a2040"); C0(0.1, -0.8, 0.055, "#2a2040");
    if (NIGHT) { C0(-0.08, -0.8, 0.02, "#c9b8ff"); C0(0.1, -0.8, 0.02, "#c9b8ff"); }
    E(0.01, -0.66, 0.05, 0.07, "#2a2040");
    E(0.0, -1.02, 0.28, 0.05, "#5a4a3a"); RR(-0.13, -1.14, 0.26, 0.12, 0.03, "#6a5a48");  // หมวก
    g.restore();
    return 1.25;
  },
  // เสือเขี้ยวดาบ (ไม่มีภาพ): หมาจรตัวโตขึ้น สีส้มลาย + เขี้ยวยาว
  saberclaw(t) {
    g.save(); g.scale(1.25, 1.25);
    if ("filter" in g) g.filter = "hue-rotate(-12deg) saturate(1.6) brightness(1.08)";
    DRAW.stray(t);
    g.filter = "none";
    for (const x of [-0.1, 0.05, 0.2]) LN(x, -0.42, x + 0.03, -0.24, 0.03, "#3a2410"); // ลายเสือ
    PL([[0.42, -0.37], [0.45, -0.18], [0.48, -0.37]], "#fffbe8"); PL([[0.48, -0.36], [0.51, -0.2], [0.53, -0.36]], "#fffbe8"); // เขี้ยวดาบ
    g.restore();
    return 0.95;
  },
  // อัศวินเงามรณะ (ไม่มีภาพ): ยักษ์โทนเหล็กดำ ตาแดง + ดาบใหญ่
  darkKnight(t) {
    g.save();
    if ("filter" in g) g.filter = "grayscale(1) brightness(.45) contrast(1.3)";
    const h = DRAW.giant(t);
    g.filter = "none";
    eye(-0.06, -1.52, 0.05, "#ff2a2a"); eye(0.12, -1.52, 0.05, "#ff2a2a");
    LN(0.6, -0.2, 0.95, -1.6, 0.09, "#c9ced6"); LN(0.52, -0.55, 0.78, -0.42, 0.06, "#6a5030"); // ดาบใหญ่
    g.restore();
    return h;
  },
  // จอร์มุนกันด์ (ไม่มีภาพ): งูทะเลขดเป็นคลื่น สีน้ำทะเลเย็น
  jormungand(t) {
    const segs = 9;
    for (let i = segs; i >= 0; i--) {
      const x = -0.75 + i * 0.13, y = -0.2 - Math.sin(t / 300 + i * 0.8) * 0.12 - i * 0.06;
      C0(x, y, 0.16 - i * 0.004, i % 2 ? "#2f6f7a" : "#3c8792");
      if (i % 2 === 0) PL([[x - 0.05, y - 0.13], [x, y - 0.26], [x + 0.05, y - 0.13]], "#9fe3ea"); // ครีบน้ำแข็ง
    }
    const hx = 0.55, hy = -0.95 - Math.sin(t / 300 + 8) * 0.1;
    E(hx, hy, 0.28, 0.19, "#3c8792"); E(hx + 0.22, hy + 0.06, 0.14, 0.08, "#2f6f7a");
    eye(hx + 0.06, hy - 0.06, 0.06, "#a8f4ff");
    PL([[hx + 0.28, hy + 0.1], [hx + 0.3, hy + 0.22], [hx + 0.33, hy + 0.1]], "#ffffff");
    PL([[hx - 0.12, hy - 0.15], [hx - 0.22, hy - 0.42], [hx - 0.02, hy - 0.18]], "#d8f6ff"); // เขา
    return 1.45;
  },
  devilTruck(t) {
    const rum = Math.sin(t / 50) * 0.008;
    g.save(); g.translate(0, rum * S);
    for (const x of [-0.55, -0.2, 0.42]) { C0(x, -0.17, 0.18, "#1e1f22"); C0(x, -0.17, 0.08, "#c9302c"); }
    RR(-0.78, -0.95, 0.9, 0.7, 0.05, "#3a1f24");                                        // ตู้ท้าย
    for (let i = 0; i < 3; i++) LN(-0.7 + i * 0.3, -0.9, -0.7 + i * 0.3, -0.32, 0.02, "#2a1418");
    PL([[0.12, -0.25], [0.12, -0.98], [0.42, -0.98], [0.62, -0.62], [0.66, -0.25]], "#b3262c");   // หัวรถ
    PL([[0.2, -0.92], [0.4, -0.92], [0.55, -0.66], [0.2, -0.66]], NIGHT ? "#ff5a36" : "#4a1a20"); // กระจก = ตาไฟ
    eye(0.36, -0.79, 0.07, "#ffcf3a");
    RR(0.56, -0.52, 0.12, 0.26, 0.02, "#2d333b");                                       // กระจังหน้า = ฟัน
    for (let i = 0; i < 4; i++) PL([[0.6, -0.5 + i * 0.06], [0.7, -0.47 + i * 0.06], [0.6, -0.44 + i * 0.06]], "#f6efe0");
    PL([[0.16, -0.98], [0.1, -1.24], [0.26, -1.0]], "#e8e0d0"); PL([[0.34, -0.98], [0.42, -1.24], [0.44, -0.96]], "#e8e0d0"); // เขา
    LN(0.02, -0.95, 0.02, -1.25, 0.06, "#5c636b");                                      // ท่อไอเสีย
    for (let i = 0; i < 4; i++) { const ph = ((t / 300) + i / 4) % 1; E(0.02 + ph * 0.1, -1.3 - ph * 0.4, 0.06 + ph * 0.1, 0.06 + ph * 0.1, `rgba(${ph < 0.4 ? "255,120,40" : "60,40,40"},${0.8 - ph * 0.7})`); }
    g.restore();
    return 1.4;
  },
};


// ---------------------------------------------------------------- รถ F1 ของแม็กซ์ เวอร์สแตปเพน (บอส devilTruck — ผู้ใช้สั่ง 2026-11-14)
//  ท่า (server fx { k: "bossMove", boss: "devilTruck", move, from, to, tiles }): swing ฟาด (หมุนเป็นโค้งรอบตัว) · ram ขี่พุ่งชน (ขี่รถ + ฝุ่น)
//   · throw โยน (ลอยโค้งพาราโบลา + หมุน → ฝุ่นตอนตก) · ซากรถ (ยูนิต summon.rtWreck) = รถคว่ำเอียง + ควัน
//  ภาพ /roadtrip/mobs/f1car.webp (640×180 ด้านข้าง หน้ารถขวา) โหลดครั้งเดียว (artOf แคช) · ไม่มีภาพ = วาดรถเอง
const F1_W = 1.7;                 // ความยาวรถบนกระดาน (ช่อง)
const F1_MS = { swing: 520, ram: 750, throw: 900, land: 450 };
const BOSS_FX = new Map();        // key fx → เวลาเริ่ม (ms ของ client) — เล่นครั้งเดียวต่อ key
const BOSS_FX_KEEP = 4000;
// วาดรถ F1 ที่จุดจอ (cx, cy) ยาว len px · rot = หมุน (เรเดียน) · flip = กลับซ้ายขวา
function drawF1(gg, cx, cy, len, rot = 0, flip = 1, alpha = 1) {
  const img = artOf("f1car");
  gg.save();
  gg.globalAlpha *= alpha;
  gg.translate(cx, cy); gg.rotate(rot); gg.scale(flip, 1);
  if (img) {
    const h = len * (img.naturalHeight / Math.max(1, img.naturalWidth));
    gg.drawImage(img, -len / 2, -h / 2, len, h);
  } else { // รถวาดเอง: ตัวถังแดง/น้ำเงิน ล้อดำ ปีกหน้า-หลัง
    const u = len;
    gg.fillStyle = "#1a2b6b"; gg.beginPath(); gg.roundRect(-u * 0.42, -u * 0.06, u * 0.86, u * 0.1, u * 0.04); gg.fill();
    gg.fillStyle = "#e11d2a"; gg.beginPath(); gg.moveTo(-u * 0.2, -u * 0.06); gg.lineTo(u * 0.48, -u * 0.02); gg.lineTo(u * 0.48, u * 0.03); gg.lineTo(-u * 0.2, u * 0.04); gg.fill();
    gg.fillStyle = "#f2c21b"; gg.fillRect(-u * 0.5, -u * 0.14, u * 0.08, u * 0.1); gg.fillRect(u * 0.42, u * 0.02, u * 0.1, u * 0.03);
    gg.fillStyle = "#111"; for (const x of [-0.32, 0.3]) { gg.beginPath(); gg.arc(x * u, u * 0.05, u * 0.075, 0, TAU); gg.fill(); }
  }
  gg.restore();
}
function dust(gg, x, y, s, k, night) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + k * 2, r = s * (0.15 + k * 0.6);
    gg.fillStyle = night ? `rgba(150,150,180,${0.35 * (1 - k)})` : `rgba(200,180,150,${0.45 * (1 - k)})`;
    gg.beginPath(); gg.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.4, s * 0.16 * (1 + k), s * 0.08 * (1 + k), 0, 0, TAU); gg.fill();
  }
}
// fx ของบอสตัวนี้ที่กำลังเล่น (อ่านจาก state.roadtrip.fx ผ่าน theme.rtState — ไม่ต้องต่อสายเพิ่ม)
function activeBossFx(u, now) {
  return bossF1For(u.id, now).filter((o) => o.age < (o.f.dur || F1_MS[o.f.move] || 600) + F1_MS.land);
}
// วาดท่ารถ F1 ของแม็กซ์ (เรียกจาก drawRtMob ก่อนตัวบอส) — พิกัดกระดานกลางช่อง
function drawBossF1(gg, u, now, night, wx, wy) {
  for (const { f, age } of activeBossFx(u, now)) {
    const dur = f.dur || F1_MS[f.move] || 600, k = Math.min(1, age / dur);
    const from = f.from ? { x: f.from.x + 0.5, y: f.from.y + 0.5 } : { x: wx, y: wy };
    const to = f.to ? { x: f.to.x + 0.5, y: f.to.y + 0.5 } : from;
    if (f.move === "swing") { // หมุนเป็นโค้ง 160° รอบตัวไปทางเป้า
      if (age > dur) continue;
      const base = Math.atan2(to.y - from.y, to.x - from.x), a = base - 1.4 + k * 2.8;
      const [cx, cy, s] = P(wx + Math.cos(a) * 0.8, wy + Math.sin(a) * 0.8, 0.6);
      drawF1(gg, cx, cy, s * F1_W, a + Math.PI / 2 * 0.2, 1, 1 - Math.max(0, k - 0.8) * 4);
    } else if (f.move === "ram") { // ขี่รถใต้ตัว + ฝุ่นตามหลัง
      if (age > dur + F1_MS.land) continue;
      const [cx, cy, s] = P(wx, wy, 0.15), [fx0] = P(from.x, from.y, 0), [tx0] = P(to.x, to.y, 0);
      const flip = tx0 < fx0 ? -1 : 1;
      if (age < dur) for (let i = 1; i <= 3; i++) dust(gg, cx - flip * s * 0.5 * i, cy + s * 0.1, s * 0.6, ((age / 120 + i * 0.3) % 1), night);
      drawF1(gg, cx, cy, s * F1_W, 0, flip, age < dur ? 1 : 1 - (age - dur) / F1_MS.land);
    } else if (f.move === "throw") { // ลอยโค้ง + หมุน → ตก = ฝุ่น
      if (age < dur) {
        const x = from.x + (to.x - from.x) * k, y = from.y + (to.y - from.y) * k, z = 0.6 + Math.sin(Math.PI * k) * 2.4;
        const [cx, cy, s] = P(x, y, z);
        const [sx, sy, ss] = P(x, y, 0);
        gg.fillStyle = "rgba(0,0,0,.18)"; gg.beginPath(); gg.ellipse(sx, sy, ss * 0.5, ss * 0.16, 0, 0, TAU); gg.fill(); // เงาตามพื้น
        drawF1(gg, cx, cy, s * F1_W, k * TAU * 1.5);
      } else {
        const [cx, cy, s] = P(to.x, to.y, 0);
        dust(gg, cx, cy, s * 1.4, (age - dur) / F1_MS.land, night);
      }
    }
  }
}
// ซากรถ F1 (ยูนิต summon.rtWreck): รถคว่ำเอียง + ควันบางๆ
function drawWreck(gg, u, now, night) {
  const wx = u.rx + 0.5 + (u.ox || 0), wy = u.ry + 0.5 + (u.oy || 0);
  const [bx, by, s] = P(wx, wy, 0);
  gg.save();
  gg.globalAlpha = u.alpha == null ? 1 : u.alpha;
  gg.fillStyle = night ? "rgba(0,6,24,.4)" : "rgba(30,20,20,.28)"; gg.beginPath(); gg.ellipse(bx, by, s * 0.7, s * 0.2, 0, 0, TAU); gg.fill();
  drawF1(gg, bx, by - s * 0.22, s * F1_W * 0.9, Math.PI + 0.25, 1);
  for (let i = 0; i < 3; i++) { const ph = ((now / 1400) + i / 3) % 1; gg.fillStyle = `rgba(70,70,75,${0.35 * (1 - ph)})`; gg.beginPath(); gg.arc(bx + s * (0.1 + i * 0.12), by - s * (0.4 + ph * 0.9), s * (0.08 + ph * 0.14), 0, TAU); gg.fill(); }
  gg.restore();
  return { cx: bx, top: by - s * 0.6, bottom: by + s * 0.15, half: s * 0.6, d: depthOf(wx, wy) };
}

// ---------------------------------------------------------------- ท่าวิ่งไล่รถ (สู้บนรถตู้ — ถนนเลื่อนตลอด)
//  BoardCanvas ตั้งทุกเฟรมจากฉาก 3D ใต้กระดาน (road3d runSpeed: หน่วย/วิ · 0 = รถจอด = ท่ายืนปกติ)
let RUN = 0;
// ความเร็วบนจอของมอนแต่ละตัว (ช่อง/วิ) — ใช้ตัดสินท่าเดิน (ไม่สร้างอ็อบเจกต์ใหม่ทุกเฟรม)
const LAST = new Map();
function moveSpeed(id, x, y, now) {
  let e = LAST.get(id);
  if (!e) { e = { x, y, t: now, v: 0 }; LAST.set(id, e); if (LAST.size > 80) LAST.delete(LAST.keys().next().value); return 0; }
  const dt = now - e.t;
  if (dt > 0) { const v = Math.hypot(x - e.x, y - e.y) / dt * 1000; e.v = dt > 400 ? 0 : e.v * 0.6 + v * 0.4; e.x = x; e.y = y; e.t = now; }
  return e.v;
}
export function setRtMobRun(v) { RUN = Number.isFinite(v) && v > 0 ? v : 0; }
const WHEELED = new Set(["biker", "trucker", "devilTruck"]), FLYING = new Set(["crow", "ghost"]);
// ฝุ่น/เส้นความเร็วหลังตัว (พิกัดท้องถิ่น: เท้า = (0,0) · หน้า = +x · หน่วย sc)
function runTrail(gg, type, sc, t, sp, night, seed) {
  const k = Math.min(1.6, sp / 24);
  if (!FLYING.has(type)) for (let i = 0; i < 4; i++) {
    const ph = ((t * (1.6 + k) + i / 4 + seed) % 1), x = -sc * (0.25 + ph * 0.75), y = -sc * (0.03 + ph * 0.12), r = sc * (0.06 + ph * 0.13);
    gg.fillStyle = night ? `rgba(150,150,185,${0.32 * (1 - ph) * k})` : `rgba(205,185,150,${0.42 * (1 - ph) * k})`;
    gg.beginPath(); gg.ellipse(x, y, r * 1.4, r, 0, 0, TAU); gg.fill();
  }
  gg.strokeStyle = night ? `rgba(200,210,255,${0.35 * k})` : `rgba(255,255,255,${0.55 * k})`; gg.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const ph = ((t * (2.2 + k) + i * 0.37 + seed) % 1), y = -sc * (0.25 + i * 0.22 + (FLYING.has(type) ? 0.3 : 0)), x0 = -sc * (0.35 + ph * 0.3), len = sc * (0.25 + 0.3 * (1 - ph)) * k;
    gg.lineWidth = Math.max(1, sc * 0.022); gg.globalAlpha *= 1 - ph * 0.6;
    gg.beginPath(); gg.moveTo(x0, y); gg.lineTo(x0 - len, y); gg.stroke(); gg.globalAlpha /= 1 - ph * 0.6;
  }
  gg.lineCap = "butt";
}

// ---------------------------------------------------------------- วาดมอน 1 ตัว (boardDraw.drawAnyUnit เรียก)
//  คืน { cx, top, bottom } (จอ) ให้ boardDraw วางแถบเลือด/เป้าเล็ง/กล่องคลิก
export function drawRtMob(gg, u, now, night) {
  if (u.summon && (u.summon.rtWreck || u.summon.side === "rtwreck")) return drawWreck(gg, u, now, night);
  const type = rtMobTypeOf(u), K = Math.max(1, u.size | 0);
  const hitAge = u.hitT ? now - u.hitT : 1e9;
  let jx = 0;
  if (hitAge >= 0 && hitAge < 300) jx = (Math.random() - 0.5) * 0.12 * (1 - hitAge / 300);
  const wx = u.rx + K / 2 + (u.ox || 0) + jx, wy = u.ry + K / 2 + (u.oy || 0);
  const [bx, by, s] = P(wx, wy, 0);
  const sc = s * K * (isBoss(type) ? 1.05 : type === "giant" ? 0.95 : 1);
  // หันซ้าย/ขวาตามทิศ (u.face = { x, y } บนกระดาน) ในมุมกล้องปัจจุบัน
  let dir = 1;
  if (u.face && (u.face.x || u.face.y)) { const q = P(wx + u.face.x, wy + u.face.y, 0); if (Math.abs(q[0] - bx) > 0.5) dir = q[0] < bx ? -1 : 1; }
  else dir = ((u.id ? String(u.id).length : 0) % 2) ? -1 : 1;
  const a = u.alpha == null ? 1 : u.alpha;
  if (type === "devilTruck") drawBossF1(gg, u, now, night, wx, wy); // ท่ารถ F1 (ฟาด/ขี่พุ่งชน/โยน)
  gg.save();
  gg.globalAlpha = a;
  // เงา + วงแดงใต้ตัว (บอกว่าเป็นศัตรู)
  // เงาพื้นนุ่ม (ไล่สีจากกลาง) — บอสเงาใหญ่กว่า
  const sw = sc * (isBoss(type) ? 0.62 : 0.42), sh = sc * (isBoss(type) ? 0.22 : 0.15);
  const grd = gg.createRadialGradient ? gg.createRadialGradient(bx, by, 0, bx, by, sw) : null;
  if (grd) { grd.addColorStop(0, night ? "rgba(0,6,24,.5)" : "rgba(30,20,20,.34)"); grd.addColorStop(1, "rgba(0,0,0,0)"); gg.fillStyle = grd; }
  else gg.fillStyle = night ? "rgba(0,6,24,.4)" : "rgba(30,20,20,.25)";
  gg.beginPath(); gg.ellipse(bx, by, sw, sh, 0, 0, TAU); gg.fill();
  gg.strokeStyle = isBoss(type) ? "rgba(255,80,60,.85)" : "rgba(235,70,80,.7)"; gg.lineWidth = Math.max(1.5, sc * (isBoss(type) ? 0.045 : 0.03));
  gg.beginPath(); gg.ellipse(bx, by, sc * 0.4, sc * 0.14, 0, 0, TAU); gg.stroke();
  const seed = (u.rx * 7 + u.ry * 3) % 1 + ((String(u.id || "").length * 0.37) % 1);
  const running = RUN > 0.5 && !(u.summon && u.summon.rtWreck);
  const bob = running || type === "crow" || type === "ghost" ? 0 : Math.sin(now / 320 + (u.rx * 7 + u.ry * 3)) * sc * 0.015;
  gg.translate(bx, by + bob);
  // วิ่งไล่รถ: จังหวะก้าวตามความเร็วถนน · กระโดดเป็นจังหวะ (ล้อ = สั่น) · โน้มตัวไปหน้า · ยืด/หด · ลอยซ้ายขวานิดๆ · ฝุ่น + เส้นความเร็วหลังตัว
  if (running) {
    const t = now / 1000, kk = Math.min(1.6, RUN / 24), ph = t * (2.4 + 1.6 * kk) * TAU + seed * TAU;
    gg.translate(Math.sin(t * 0.7 + seed * 9) * sc * 0.05, 0);
    gg.scale(dir, 1);
    runTrail(gg, type, sc, t, RUN, night, seed);
    if (WHEELED.has(type)) { gg.translate(0, Math.sin(ph * 3) * sc * 0.012); gg.rotate(0.05 * kk + Math.sin(ph) * 0.015); }
    else if (FLYING.has(type)) { gg.translate(0, -sc * (0.12 + 0.08 * Math.sin(ph))); gg.scale(1, 1 + 0.1 * Math.sin(ph * 1.5)); gg.rotate(0.14 * kk); }
    else {
      const hop = Math.abs(Math.sin(ph)), c = Math.cos(ph * 2);
      gg.translate(0, -hop * sc * 0.09);
      gg.rotate(0.12 * kk + Math.sin(ph) * 0.04);
      gg.scale(1 + 0.06 * c, 1 - 0.06 * c);
    }
  } else gg.scale(dir, 1);
  // เดินบนกระดาน (ตามลำดับฉากมอน — rtTimeline glide): ก้าวกระโดด + ยืด/หด · แม็กซ์ = วิ่งโยกเยกแบบการ์ตูน ขาเบลอ เหงื่อกระเด็น
  const mv = running ? 0 : moveSpeed(u.id, wx, wy, now);
  if (mv > 0.8) {
    const ph = now / (type === "devilTruck" ? 55 : 80), hop = Math.abs(Math.sin(ph)), c = Math.cos(ph * 2);
    if (type === "devilTruck") {
      gg.translate(0, -hop * sc * 0.14); gg.rotate(Math.sin(ph) * 0.16); gg.scale(1 + 0.12 * c, 1 - 0.12 * c);
      gg.fillStyle = "rgba(40,40,50,.35)"; for (let i = 0; i < 3; i++) { const lx = Math.sin(ph * 2 + i * 2.1) * sc * 0.18; gg.beginPath(); gg.ellipse(lx, -sc * 0.08, sc * 0.05, sc * 0.11, 0, 0, TAU); gg.fill(); } // ขาเบลอ
      for (let i = 0; i < 3; i++) { const q = ((now / 300) + i / 3) % 1; gg.fillStyle = `rgba(150,210,255,${1 - q})`; gg.beginPath(); gg.arc(-sc * (0.2 + q * 0.4), -sc * (1.5 - q * 0.3) - Math.sin(q * Math.PI) * sc * 0.25, sc * 0.035, 0, TAU); gg.fill(); }
    } else if (!FLYING.has(type)) { gg.translate(0, -hop * sc * 0.08); gg.scale(1 + 0.07 * c, 1 - 0.07 * c); gg.rotate(Math.sin(ph) * 0.05); }
  }
  if (hitAge >= 0 && hitAge < 160 && "filter" in gg) gg.filter = "brightness(2.6) saturate(.2)";
  let h = 1.2;
  const img = artOf(type);
  if (img) {
    const ar = img.naturalWidth / Math.max(1, img.naturalHeight);
    let H = sc * (ART_H[type] || 1.35), W = H * ar;
    if (W > sc * ART_MAX_W(type)) { W = sc * ART_MAX_W(type); H = W / ar; }
    if ((ART_FACE[type] || 1) < 0) gg.scale(-1, 1);
    // รูปตัด (คน/เงา) อ่านยากบนพื้นถนน → เงาขอบเข้มรอบตัว · กลางคืนเรืองจางๆ
    gg.shadowColor = night ? "rgba(170,150,255,.55)" : "rgba(10,8,12,.55)";
    gg.shadowBlur = Math.max(2, sc * 0.08);
    gg.drawImage(img, -W / 2, -H, W, H);
    gg.shadowBlur = 0;
    h = H / sc;
  } else {
    g = gg; S = sc; NIGHT = !!night;
    h = DRAW[type](now + (u.rx * 131 + u.ry * 71));
  }
  gg.restore();
  // ตัวป่วนรถ (summon.role / mobSpawn role = saboteur): ป้ายประแจเล็กเหนือหัว
  if ((u.summon && u.summon.role === "saboteur") || rtRoleOf(u.id) === "saboteur") {
    const tx = bx + sc * 0.32, ty = by - h * sc - sc * 0.05;
    gg.save(); gg.fillStyle = "rgba(20,22,30,.85)"; gg.beginPath(); gg.arc(tx, ty, Math.max(7, sc * 0.13), 0, TAU); gg.fill();
    gg.font = `${Math.max(9, sc * 0.16)}px sans-serif`; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("🔧", tx, ty + 1); gg.restore();
  }
  return { cx: bx, top: by - h * sc - sc * 0.05, bottom: by + sc * 0.15, half: sc * 0.45, d: depthOf(wx, wy) };
}
