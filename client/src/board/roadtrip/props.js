// ============================================================
//  วัตถุบนแผนที่โหมด Road Trip (ปั๊ม/โมเต็ล/ถนน/บนรถตู้) — ต้นแบบ .claude/plans/road-trip-station-2d.html
//  สไตล์กระดานเดิม: กล้องเอียง (boardGeo.P หมุนตามกระดานได้) · หน้าสว่าง/ข้างเข้ม · พาสเทล · กลางคืนย้อมน้ำเงิน + ไฟเรือง
//  boardDraw เรียก 4 จุด (ทำงานเฉพาะ area 70–75):
//   rtGround(g, info, units, now, lowQ)          ใต้ไฮไลต์: เส้นถนนเลื่อน (บนรถตู้) · พื้นในรถ · รอยเท้าเดิน
//   rtItems(items, g, info, units, now, lowQ)   เรียงความลึกกับตัวละคร: วัตถุทุกชิ้น + รถตู้จอด/ผนังรถตู้
//   rtAir(g, info, units, now, lowQ)            ทับตัวละคร: หลังคาปั๊ม · สายโคม · อนุภาค · แสงไฟกลางคืน
//   drawRtObstacle(g, t, ctx, now) / rtSkipTerrain(kind)  สิ่งกีดขวางข้างทาง rt_rock/rt_tree/... · ช่องของวัตถุ (rt_<kind>) ข้าม
//  ของนิ่งชิ้นใหญ่ (ตึก/อู่/โมเต็ล/รถบรรทุก …) อบเป็นภาพตอนกล้องนิ่ง 2 เฟรมติด (SPRITE) แล้ววางทีเดียว · ส่วนที่ขยับวาดสดทับ
//
//  เหตุการณ์จาก server (state.roadtrip.fx — setRoadtripState ใน ./theme.js) ที่ไฟล์นี้อ่าน:
//   { k: "act",  key, id, obj, kind }  ผู้เล่น id เล่นวัตถุ obj (kind = ชนิดวัตถุ) → วัตถุเล่นท่าตอบสนอง (ไม่มี obj = id คือวัตถุ · by = ผู้เล่น)
//   { k: "walk", key, id, path }       ผู้เล่น id เดินตาม path [{x, y}…] หรือ [[x, y]…] → รอยเท้าจางบนพื้น
//   key = ไม่ซ้ำต่อเหตุการณ์ (กันเล่นซ้ำ) · ไม่มี key ใช้ seq/at แทน · เหตุการณ์ที่มีอยู่ตอนเปิดหน้า = ไม่เล่น (ยกเว้น at ไม่เกิน 2.5 วิ)
// ============================================================
import { F_TH, P, depthOf, faceVisible, gEllipse, glow, onScreen, pitchOf, rng, viewCenter, viewTurn } from "../boardGeo";
import { cactusShape, deadTreeShape, drawPalm, drawTree, pineShape, SNOW_PINE } from "../boardProps";
import { vanSprite } from "./vanSprite";
import { drawBossAir, drawBossGround } from "./bossFx";
import { dashRow, isRtArea, nightColor, rtDefOf, rtPal, rtRegionOf, rtState } from "./theme";

const TAU = Math.PI * 2;
let G = null, NIGHT = false, NOW = 0, REGION = "plains", LOWQ = false;

// ---------------------------------------------------------------- สี
const CC = new Map();
function col(hex, f = 1, lit = false) {
  const night = NIGHT && !lit, id = `${hex}|${f}|${night}`;
  let c = CC.get(id);
  if (!c) {
    const n = parseInt(hex.slice(1), 16);
    const h = "#" + [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, "0")).join("");
    c = night ? nightColor(h, true, 0.45) : h;
    CC.set(id, c);
    if (CC.size > 4000) CC.clear();
  }
  return c;
}
const PRIZE = ["#ff6fa8", "#ffd23f", "#5aa0e0", "#3fae7a", "#a26bff"];

// ---------------------------------------------------------------- รูปทรงพื้นฐาน (พิกัดกระดาน x, y, สูง z)
function poly(pts, fill, stroke) {
  const g = G;
  g.beginPath();
  for (let i = 0; i < pts.length; i++) { const p = P(pts[i][0], pts[i][1], pts[i][2] || 0); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); }
}
// กล่อง: หน้าใต้ (+y) = สีหลัก · ตะวันออก/ตะวันตก/เหนือ เข้มลง · บนสว่าง — วาดเฉพาะด้านที่หันกล้อง (หมุนกระดานได้)
const LINE = "rgba(30,30,40,.22)";
function box(x0, y0, x1, y1, z0, z1, hex, o = {}) {
  const lit = !!o.lit, ln = o.line === false ? null : LINE;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  if (faceVisible(0, -1, cx, y0)) poly([[x1, y0, z0], [x0, y0, z0], [x0, y0, z1], [x1, y0, z1]], o.back || col(hex, 0.7, lit), ln);
  if (faceVisible(-1, 0, x0, cy)) poly([[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], o.side || col(hex, 0.78, lit), ln);
  if (faceVisible(1, 0, x1, cy)) poly([[x1, y1, z0], [x1, y0, z0], [x1, y0, z1], [x1, y1, z1]], o.side2 || col(hex, 0.86, lit), ln);
  if (faceVisible(0, 1, cx, y1)) poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], o.front || col(hex, 1, lit), ln);
  if (!o.noTop) poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], o.top || col(hex, 1.1, lit), ln);
}
// สี่เหลี่ยมบนหน้าข้าง: face "s" = ระนาบ y = at (a0..a1 ตามแกน x) · "e" = ระนาบ x = at (a0..a1 ตามแกน y) · "w"/"n" กลับทิศ
const FN = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] };
function faceOk(face, a0, a1, at) { const [nx, ny] = FN[face], m = (a0 + a1) / 2; return face === "s" || face === "n" ? faceVisible(nx, ny, m, at) : faceVisible(nx, ny, at, m); }
function fpts(face, a0, a1, at, z0, z1) {
  const e = face === "s" || face === "e" ? 0.004 : -0.004;
  return face === "s" || face === "n"
    ? [[a0, at + e, z0], [a1, at + e, z0], [a1, at + e, z1], [a0, at + e, z1]]
    : [[at + e, a0, z0], [at + e, a1, z0], [at + e, a1, z1], [at + e, a0, z1]];
}
function faceRect(face, a0, a1, at, z0, z1, fill) { if (faceOk(face, a0, a1, at)) poly(fpts(face, a0, a1, at, z0, z1), fill); }
function faceText(face, txt, a0, a1, at, z0, z1, bg, fg = "#fff") {
  if (!faceOk(face, a0, a1, at)) return;
  if (bg) poly(fpts(face, a0, a1, at, z0, z1), bg);
  const m = (a0 + a1) / 2, e = face === "s" || face === "e" ? 0.006 : -0.006;
  const [ax, ay, s] = face === "s" || face === "n" ? P(m, at + e, (z0 + z1) / 2) : P(at + e, m, (z0 + z1) / 2);
  const w0 = face === "s" || face === "n" ? Math.abs(P(a1, at, z0)[0] - P(a0, at, z0)[0]) : Math.abs(P(at, a1, z0)[0] - P(at, a0, z0)[0]);
  if (w0 < 8) return;
  const g = G, fs = Math.max(6, Math.min((z1 - z0) * s * 0.66, w0 * 1.6 / Math.max(2, txt.length)));
  g.fillStyle = fg; g.font = `700 ${fs}px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(txt, ax, ay + 1); g.textBaseline = "alphabetic";
}
function ell(x, y, z, rx, ry, fill) { gEllipse(G, x, y, rx, z, 24, ry); G.fillStyle = fill; G.fill(); }
function shadowAt(x, y, rx, ry = rx) { ell(x, y, 0.005, rx, ry, NIGHT ? "rgba(0,6,24,.34)" : "rgba(40,50,40,.2)"); }
function post(x, y, h, w, hex, z0 = 0, lit = false) {
  const g = G, [ax, ay, s] = P(x, y, z0), [, by] = P(x, y, z0 + h);
  g.fillStyle = col(hex, 1, lit); g.fillRect(ax - w * s / 2, by, w * s, ay - by);
  g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(ax, by, w * s / 2, ay - by);
}
function ball(x, y, z, r, hex, lit = false) {
  const g = G, [sx, sy, s] = P(x, y, z), R0 = r * s;
  g.fillStyle = col(hex, 0.82, lit); g.beginPath(); g.arc(sx, sy, R0, 0, TAU); g.fill();
  g.fillStyle = col(hex, 1.05, lit); g.beginPath(); g.arc(sx - R0 * 0.15, sy - R0 * 0.15, R0 * 0.78, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.arc(sx - R0 * 0.38, sy - R0 * 0.38, R0 * 0.24, 0, TAU); g.fill();
}
function line3(a, b, hex, w, lit = false) {
  const g = G, p = P(a[0], a[1], a[2] || 0), q = P(b[0], b[1], b[2] || 0);
  g.strokeStyle = hex[0] === "#" ? col(hex, 1, lit) : hex; g.lineWidth = Math.max(1, w * p[2]); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
}
// แสงเรือง (ภาพแคชต่อสี) — ใช้ตอนกลางคืน
const GLOW = new Map();
function glowImg(rgb) {
  let c = GLOW.get(rgb);
  if (!c && typeof document !== "undefined") {
    c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.4, `rgba(${rgb},.4)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); GLOW.set(rgb, c);
  }
  return c;
}
function glowAt(x, y, z, r, rgb, a) {
  if (!(a > 0)) return;
  const img = glowImg(rgb); if (!img) return;
  const [sx, sy, s] = P(x, y, z), R0 = r * s, a0 = G.globalAlpha;
  G.globalAlpha = a0 * Math.min(1, a); G.drawImage(img, sx - R0, sy - R0, R0 * 2, R0 * 2); G.globalAlpha = a0;
}
const flicker = (seed) => (Math.sin(NOW / 43 + seed * 7) > 0.93 || Math.sin(NOW / 141 + seed) > 0.985 ? 0.25 : 1);

// ---------------------------------------------------------------- เหตุการณ์ (act / walk)
const ACT = new Map();   // id วัตถุ → { t0, by }
const WALKS = [];        // { t0, path }
const SEEN = new Set();
let firstSync = true, fxRef = null;
function syncFx() {
  const list = rtState().fx;
  if (list === fxRef) return;
  fxRef = list;
  for (const e of list || []) {
    if (!e || !e.k) continue;
    const id = e.key != null ? `k${e.key}` : e.seq != null ? `s${e.seq}` : `${e.k}|${e.id}|${e.at || ""}|${e.by || ""}|${(e.path || []).length}`;
    if (SEEN.has(id)) continue;
    SEEN.add(id);
    const fresh = !firstSync || (e.at && Date.now() - e.at < 2500);
    if (!fresh) continue;
    // act: obj = id วัตถุ (server/roadtrip/stop.js) · id = ผู้เล่น — ไม่มี obj = id คือวัตถุ
    const oid = e.obj != null ? e.obj : e.id;
    if (e.k === "act" && oid != null) { ACT.set(String(oid), { t0: NOW, by: e.obj != null ? e.id : e.by || null }); onAct(String(oid), e.kind); }
    else if (e.k === "walk" && Array.isArray(e.path) && e.path.length) WALKS.push({ t0: NOW, path: e.path.map((q) => (Array.isArray(q) ? q : [q.x, q.y])) });
  }
  if (SEEN.size > 400) { const keep = [...SEEN].slice(-200); SEEN.clear(); keep.forEach((k) => SEEN.add(k)); }
  if (WALKS.length > 12) WALKS.splice(0, WALKS.length - 12);
  firstSync = false;
}
// ความคืบหน้าท่าตอบสนอง 0..1 (null = ไม่ได้เล่น)
function actK(id, ms) {
  const a = ACT.get(id);
  if (!a) return null;
  const k = (NOW - a.t0) / ms;
  return k >= 0 && k <= 1 ? k : null;
}
// เล่นท่าตอบสนองทันที (พรีวิว/ทดสอบ — server ใช้ fx)
export function rtPoke(id) { ACT.set(String(id), { t0: performance.now(), by: null }); PEND.push(String(id)); }
const PEND = [];

// ---------------------------------------------------------------- อนุภาค (พิกัดกระดาน)
const PARTS = [];
function emit(o) { if (!LOWQ && PARTS.length < 220) PARTS.push({ vx: 0, vy: 0, vz: 0.8, dur: 1, t0: NOW, ...o }); }
function drawParts() {
  const g = G;
  for (let i = PARTS.length - 1; i >= 0; i--) {
    const p = PARTS[i], t = (NOW - p.t0) / 1000;
    if (t < 0) continue;
    if (t > p.dur) { PARTS.splice(i, 1); continue; }
    const z = Math.max(0.03, p.z + p.vz * t - (p.grav ? 3 * t * t : 0)), x = p.x + p.vx * t, y = p.y + p.vy * t, k = t / p.dur;
    const [sx, sy, s] = P(x, y, z);
    g.globalAlpha = 1 - k * k;
    if (p.text) { g.font = `800 ${Math.max(10, 0.42 * s)}px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 3; g.strokeStyle = "rgba(0,0,0,.35)"; g.strokeText(p.text, sx, sy); g.fillStyle = p.col || "#fff"; g.fillText(p.text, sx, sy); g.textBaseline = "alphabetic"; }
    else if (p.bubble) { g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 1.4; g.beginPath(); g.arc(sx, sy, 0.1 * s, 0, TAU); g.stroke(); }
    else if (p.fire) { g.fillStyle = `rgba(255,${(200 - k * 160) | 0},40,${0.9 - k * 0.6})`; g.beginPath(); g.arc(sx, sy, 0.12 * s * (1 + k), 0, TAU); g.fill(); }
    else if (p.smoke) { g.fillStyle = `rgba(${NIGHT ? "150,155,170" : "235,235,235"},${0.5 * (1 - k)})`; g.beginPath(); g.arc(sx, sy, 0.16 * s * (1 + k * 1.6), 0, TAU); g.fill(); }
    else if (p.star) { g.fillStyle = p.col || "#efe0ff"; g.beginPath(); g.arc(sx, sy, 0.06 * s, 0, TAU); g.fill(); }
    else if (p.drop) { g.fillStyle = "rgba(170,220,255,.9)"; g.beginPath(); g.arc(sx, sy, 0.04 * s, 0, TAU); g.fill(); }
    else if (p.ball) { g.globalAlpha = 1; ball(x, y, z, 0.12, p.ball); }
    else if (p.fish) { g.fillStyle = "#ff8a3d"; g.beginPath(); g.ellipse(sx, sy, 0.22 * s, 0.1 * s, -p.vz * 0.3 + t * 3, 0, TAU); g.fill(); }
    else if (p.can) { g.fillStyle = p.can; g.fillRect(sx - 0.06 * s, sy - 0.11 * s, 0.12 * s, 0.22 * s); }
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- ท่าตอบสนองครั้งแรก (อนุภาค)
const PROPS_BY_ID = new Map();
function onAct(id, kind) {
  const p = PROPS_BY_ID.get(id);
  if (!p) return;
  const cx = (p.x0 + p.x1 + 1) / 2, cy = (p.y0 + p.y1 + 1) / 2, k = kind || p.kind;
  switch (k) {
    case "pump": emit({ x: cx, y: cy + 0.4, z: 1.8, text: "⛽", vz: 0.7, dur: 1.4, t0: NOW + 2200 }); break;
    case "wash": for (let i = 0; i < 26; i++) emit({ x: p.x0 + 0.8 + Math.random() * (p.x1 - p.x0), y: p.y0 + 0.6 + Math.random() * (p.y1 - p.y0), z: 0.3 + Math.random(), vz: 0.6 + Math.random(), bubble: true, dur: 2 + Math.random() }); break;
    case "wc": for (let i = 0; i < 16; i++) emit({ x: cx, y: p.y1 + 1, z: 0.6, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: Math.random() * 2, star: true, dur: 0.9, t0: NOW + 700 }); break;
    case "claw": if (Math.random() < 0.6) emit({ x: cx, y: cy + 0.5, z: 0.8, vy: 1.1, vz: 2.2, grav: true, ball: PRIZE[(Math.random() * 5) | 0], dur: 1.3, t0: NOW + 1400 }); break;
    case "gacha": emit({ x: cx, y: cy + 0.45, z: 0.35, vy: 1.5, vz: 1.0, grav: true, ball: PRIZE[(Math.random() * 5) | 0], dur: 1.5 }); break;
    case "karaoke": for (let i = 0; i < 10; i++) emit({ x: cx + (Math.random() - 0.5), y: cy + 0.2, z: 1.2, vz: 0.9, vx: (Math.random() - 0.5) * 0.4, text: i % 2 ? "♪" : "♫", col: PRIZE[i % 5], dur: 1.6, t0: NOW + i * 260 }); break;
    case "dog": emit({ x: cx + 0.2, y: cy, z: 1.0, text: "♥", col: "#ff6fa8", vz: 0.8, dur: 1.2 }); break;
    case "fortune": for (let i = 0; i < 12; i++) emit({ x: cx, y: p.y1 + 0.95, z: 0.6, vx: Math.cos(i) * 0.8, vy: Math.sin(i) * 0.4, vz: 0.6 + Math.random(), star: true, col: "#d9c2ff", dur: 1.4 }); break;
    case "spicy": for (let i = 0; i < 20; i++) emit({ x: cx + (Math.random() - 0.5) * 1.2, y: p.y1 + 0.9, z: 1.0, vz: 1.2 + Math.random(), fire: true, dur: 0.9 + Math.random() * 0.4 }); break;
    case "pond": case "pool": for (let i = 0; i < 14; i++) emit({ x: cx + (Math.random() - 0.5), y: cy + (Math.random() - 0.5) * 0.6, z: 0.1, vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 0.8, vz: 1.5 + Math.random(), grav: true, drop: true, dur: 0.9, t0: NOW + (k === "pond" ? 1000 : 0) });
      if (k === "pond") emit({ x: cx + 0.4, y: cy - 0.2, z: 0.1, vx: 0.8, vz: 2.6, grav: true, fish: true, dur: 1.1, t0: NOW + 1000 }); break;
    case "bbq": case "stall": for (let i = 0; i < (k === "bbq" ? 14 : 8); i++) emit({ x: cx + (Math.random() - 0.5) * 0.6, y: cy, z: 1.0, vz: 0.5 + Math.random() * 0.4, vx: 0.15, smoke: true, dur: 1.6 + Math.random(), t0: NOW + i * 90 }); break;
    case "vending": emit({ x: cx, y: p.y1 + 0.95, z: 0.5, vy: 0.6, vz: 0.6, grav: true, can: PRIZE[(Math.random() * 5) | 0], dur: 0.9, t0: NOW + 500 }); break;
    case "arcade": for (let i = 0; i < 6; i++) emit({ x: cx + (Math.random() - 0.5) * 0.5, y: p.y1 + 1, z: 1.5, vz: 0.8, text: "★", col: PRIZE[i % 5], dur: 1.1, t0: NOW + i * 180 }); break;
    case "ferris": for (let i = 0; i < 8; i++) emit({ x: cx + (Math.random() - 0.5) * 3, y: cy, z: 2 + Math.random() * 2, vz: 0.4, star: true, col: "#ffe9a8", dur: 1.5 }); break;
    default: break;
  }
}

// ---------------------------------------------------------------- ภาพของนิ่งแคช (SPRITE)
//  กุญแจ = ทรานส์ฟอร์มจอ + มุมกล้อง + กลางวัน/คืน + ภูมิภาค · กล้องนิ่ง 2 เฟรมติด → อบ · ขยับ = วาดสด
const SPRITE = new Map();
function spriteDraw(p, drawFn, hTop) {
  const g = G;
  if (typeof document === "undefined" || LOWQ === "nocache") { drawFn(); return; }
  const m = g.getTransform();
  const vc = viewCenter();
  const key = `${m.a.toFixed(4)}|${m.e.toFixed(2)}|${m.f.toFixed(2)}|${viewTurn()}|${pitchOf()}|${vc ? vc.x + "," + vc.y : ""}|${NIGHT}|${REGION}|${p.style || ""}|${p._vanKey || ""}`;
  let e = SPRITE.get(p.id);
  if (!e) { e = { key: null, prev: null, cv: null, x: 0, y: 0 }; SPRITE.set(p.id, e); }
  if (e.key !== key && e.prev === key) {
    // กรอบบนจอ (พิกัดตรรกะ → พิกเซลจริง)
    let lx0 = 1e9, ly0 = 1e9, lx1 = -1e9, ly1 = -1e9;
    for (const x of [p.x0 - 0.7, p.x1 + 1.7]) for (const y of [p.y0 - 0.7, p.y1 + 1.7]) for (const z of [0, hTop + 0.8]) {
      const q = P(x, y, z); if (!(q[2] > 0)) continue;
      lx0 = Math.min(lx0, q[0]); lx1 = Math.max(lx1, q[0]); ly0 = Math.min(ly0, q[1]); ly1 = Math.max(ly1, q[1]);
    }
    const dx0 = Math.floor(lx0 * m.a + m.e), dy0 = Math.floor(ly0 * m.d + m.f), dw = Math.ceil((lx1 - lx0) * m.a) + 2, dh = Math.ceil((ly1 - ly0) * m.d) + 2;
    if (dw > 0 && dh > 0 && dw < 4096 && dh < 4096) {
      if (!e.cv) e.cv = document.createElement("canvas");
      e.cv.width = dw; e.cv.height = dh;
      const cg = e.cv.getContext("2d");
      cg.setTransform(m.a, 0, 0, m.d, m.e - dx0, m.f - dy0);
      const prevG = G; G = cg;
      try { drawFn(); } finally { G = prevG; }
      e.x = dx0; e.y = dy0; e.key = key;
    }
  }
  e.prev = key;
  if (e.key === key && e.cv) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(e.cv, e.x, e.y); g.restore(); }
  else drawFn();
}

// ---------------------------------------------------------------- วัตถุแต่ละชนิด (ยกเครื่อง 2026-11-14 — ผู้ใช้: "คุณภาพฉากต่ำมาก มองทะลุได้ ดูเละ ออกแบบใหม่")
//  p = { id, kind, x0, y0, x1, y1, h, style } (ช่องนับรวมขอบ) → X0..X1 / Y0..Y1 = ขอบจริง
//  หลัก: อาคารทึบทุกชิ้น (ไม่มีส่วนโปร่งยกเว้นกระจกที่ตั้งใจ) · หลังคามีความหนา + ชายคา + ขอบกันตก · ฐานผนังสีเข้ม (plinth) ·
//   เงาตกทอดไปหลังซ้าย (แดดหน้าขวา — หน้าสว่าง/ข้างเข้มแบบกระดานเดิม) + เงาฟุ้งรอบฐาน (AO) · เส้นขอบเดียวกับกล่องเดิม
const B = (p) => ({ X0: p.x0, Y0: p.y0, X1: p.x1 + 1, Y1: p.y1 + 1, cx: (p.x0 + p.x1 + 1) / 2, cy: (p.y0 + p.y1 + 1) / 2 });

// ---------- ชุดเครื่องมือฉาก
// เงาฟุ้งรอบฐาน: 3 ชั้นซ้อน (กลางเข้ม ขอบจาง)
function ao(x0, y0, x1, y1, spread = 0.35, a = 0.24) {
  const rgb = NIGHT ? "0,6,24" : "28,32,38";
  for (let i = 3; i >= 1; i--) { const e = spread * i / 3; poly([[x0 - e, y0 - e, 0.003], [x1 + e, y0 - e, 0.003], [x1 + e, y1 + e, 0.003], [x0 - e, y1 + e, 0.003]], `rgba(${rgb},${a / 3})`); }
}
// เงาตกของกล่องสูง h ทอดไปหลังซ้าย (convex hull ของฐาน + ฐานเลื่อน)
function castShadow(x0, y0, x1, y1, h, a = 0.16) {
  const dx = -0.32 * h, dy = -0.2 * h;
  const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0 + dx, y0 + dy], [x1 + dx, y0 + dy], [x1 + dx, y1 + dy], [x0 + dx, y1 + dy]].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cr = (o, a2, b) => (a2[0] - o[0]) * (b[1] - o[1]) - (a2[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  const hull = lo.slice(0, -1).concat(up.slice(0, -1));
  poly(hull.map(([x, y]) => [x, y, 0.002]), NIGHT ? `rgba(0,6,24,${a * 1.4})` : `rgba(40,44,60,${a})`);
}
// รูปหลายเหลี่ยมบนหน้าข้าง (pts = [[a, z]…] · a = ตามแกนของหน้า)
function facePoly(face, at, pts, fill) {
  const e = face === "s" || face === "e" ? 0.005 : -0.005;
  poly(pts.map(([a, z]) => (face === "s" || face === "n" ? [a, at + e, z] : [at + e, a, z])), fill);
}
// หน้าต่าง: กรอบ · กระจก (กลางวันสะท้อนฟ้า + แสงเฉียง · กลางคืนไฟเหลืองนวล) · เสาแบ่งบาน · ขอบล่าง
function win(face, a0, a1, at, z0, z1, o = {}) {
  if (!faceOk(face, a0, a1, at)) return;
  faceRect(face, a0, a1, at, z0, z1, col(o.frame || "#f7f5f0", 0.97));
  const g0 = a0 + 0.05, g1 = a1 - 0.05, h0 = z0 + 0.05, h1 = z1 - 0.05;
  const lit = NIGHT && !o.dark;
  faceRect(face, g0, g1, at, h0, h1, lit ? (o.litCol || "#ffe2a0") : NIGHT ? "#253049" : col(o.glass || "#8ccbe9", 1));
  if (!NIGHT) { const w = g1 - g0, hh = h1 - h0; facePoly(face, at, [[g0 + w * 0.12, h1], [g0 + w * 0.32, h1], [g0 + w * 0.1, h0], [g0, h0], [g0, h0 + hh * 0.35]], "rgba(255,255,255,.35)"); }
  if (o.inside) o.inside(g0, g1, h0, h1);
  const n = o.panes || Math.max(1, Math.round((a1 - a0) / 0.9));
  for (let k = 1; k < n; k++) { const a = a0 + (a1 - a0) * k / n; faceRect(face, a - 0.025, a + 0.025, at, z0, z1, col(o.frame || "#f7f5f0", 0.9)); }
  if (o.sill !== false) faceRect(face, a0 - 0.05, a1 + 0.05, at, z0 - 0.06, z0, col("#d6d0c2"));
}
// ประตู: วงกบ + บาน + มือจับ (glass = ประตูกระจก)
function door(face, a0, a1, at, z1, o = {}) {
  if (!faceOk(face, a0, a1, at)) return;
  faceRect(face, a0 - 0.05, a1 + 0.05, at, 0, z1 + 0.06, col(o.frame || "#e9e5dc"));
  faceRect(face, a0, a1, at, 0, z1, o.glass ? (NIGHT ? "#ffe2a0" : col("#a9d8ee")) : col(o.col || "#8a5a3c"));
  if (!o.glass) { faceRect(face, a0 + 0.07, a1 - 0.07, at, z1 * 0.55, z1 - 0.08, col(o.col || "#8a5a3c", 1.12)); faceRect(face, a0 + 0.07, a1 - 0.07, at, 0.1, z1 * 0.5, col(o.col || "#8a5a3c", 0.92)); }
  const hx = o.hingeLeft ? a1 - 0.1 : a0 + 0.1;
  faceRect(face, hx - 0.025, hx + 0.025, at, z1 * 0.45, z1 * 0.52, col("#e0c068"));
}
// ป้ายกล่องยื่นจากผนัง (หนา d) + ตัวหนังสือ
function signBox(face, txt, a0, a1, at, z0, z1, bg, fg = "#ffffff", d = 0.07) {
  if (!faceOk(face, a0, a1, at)) return;
  if (face === "s") box(a0, at, a1, at + d, z0, z1, bg, { line: false });
  else if (face === "n") box(a0, at - d, a1, at, z0, z1, bg, { line: false });
  else if (face === "e") box(at, a0, at + d, a1, z0, z1, bg, { line: false });
  else box(at - d, a0, at, a1, z0, z1, bg, { line: false });
  const at2 = face === "s" || face === "e" ? at + d : at - d;
  faceRect(face, a0 + 0.04, a1 - 0.04, at2, z0 + 0.04, z0 + 0.07, "rgba(255,255,255,.35)");
  faceText(face, txt, a0 + 0.06, a1 - 0.06, at2, z0 + 0.03, z1 - 0.03, null, fg);
}
// กันสาดผ้าลายทาง (หน้า s เท่านั้น — หน้าอื่นข้าม) · ชายผ้าหยักห้อย
function awning(a0, a1, at, z, depth, drop, c1, c2 = "#ffffff") {
  if (!faceVisible(0, 1, (a0 + a1) / 2, at)) return;
  const n = Math.max(2, Math.round((a1 - a0) / 0.42)), w = (a1 - a0) / n;
  for (let k = 0; k < n; k++) {
    const x0 = a0 + k * w, x1 = x0 + w, c = k % 2 ? c2 : c1;
    poly([[x0, at, z], [x1, at, z], [x1, at + depth, z - drop], [x0, at + depth, z - drop]], col(c, 1.04), LINE);
    poly([[x0, at + depth, z - drop], [x1, at + depth, z - drop], [x1, at + depth, z - drop - 0.12], [(x0 + x1) / 2, at + depth, z - drop - 0.2], [x0, at + depth, z - drop - 0.12]], col(c, 0.9));
  }
}
// แผ่นหลังคา: หนา th · ยื่นชายคา over · ขอบกันตก (parapet) + พื้นหลังคาเข้มกว่า
function roofSlab(x0, y0, x1, y1, z, th, hex, over = 0.1, top = "#b9bec4") {
  box(x0 - over, y0 - over, x1 + over, y1 + over, z, z + th, hex);
  const i = 0.14;
  poly([[x0 - over + i, y0 - over + i, z + th + 0.001], [x1 + over - i, y0 - over + i, z + th + 0.001], [x1 + over - i, y1 + over - i, z + th + 0.001], [x0 - over + i, y1 + over - i, z + th + 0.001]], col(top), LINE);
}
// ของบนหลังคา (แอร์ · ท่อระบาย) — ให้หลังคาไม่โล่ง
function roofKit(x0, y0, x1, y1, z, seed) {
  const R = rng(seed);
  for (let k = 0; k < 2; k++) {
    const x = x0 + 0.5 + R() * (x1 - x0 - 1.4), y = y0 + 0.4 + R() * (y1 - y0 - 1.0);
    box(x, y, x + 0.55, y + 0.4, z, z + 0.32, "#d4d8dc");
    const [sx, sy, s] = P(x + 0.27, y + 0.2, z + 0.33); G.fillStyle = col("#7c848c"); G.beginPath(); G.ellipse(sx, sy, s * 0.13, s * 0.07, 0, 0, TAU); G.fill();
  }
  post(x1 - 0.5, y0 + 0.5, 0.45, 0.07, "#9aa1a8", z);
}
// อาคารมาตรฐาน: ฐาน (plinth) · ผนัง · แถบคาดใต้หลังคา · หลังคาหนา + ของบนหลังคา · เงา
function building(x0, y0, x1, y1, H, o) {
  castShadow(x0, y0, x1, y1, H + 0.3);
  ao(x0, y0, x1, y1, 0.35, 0.26);
  box(x0, y0, x1, y1, 0, 0.16, o.base || "#a9a397");
  box(x0 + 0.01, y0 + 0.01, x1 - 0.01, y1 - 0.01, 0.16, H, o.wall);
  box(x0 - 0.01, y0 - 0.01, x1 + 0.01, y1 + 0.01, H - 0.16, H, o.trim);
  roofSlab(x0, y0, x1, y1, H, o.roofTh || 0.2, o.roof || "#e6e3dc", o.over == null ? 0.1 : o.over, o.roofTop || "#b9bec4");
  if (o.kit !== false) roofKit(x0, y0, x1, y1, H + (o.roofTh || 0.2), (x0 * 31 + y0 * 7) | 0);
}
// ไม้กระถาง/พุ่มเล็ก (ตามภูมิภาค) วางมุมอาคาร
function shrub(x, y, s0 = 1) {
  const g = G;
  box(x - 0.18 * s0, y - 0.18 * s0, x + 0.18 * s0, y + 0.18 * s0, 0, 0.3 * s0, REGION === "snow" ? "#9aa8bc" : "#b9764f");
  const [sx, sy, s] = P(x, y, 0.3 * s0);
  if (REGION === "desert") { cactusShape(g, sx, sy, s * 0.5 * s0, NIGHT); return; }
  if (REGION === "ghost") { deadTreeShape(g, sx, sy, s * 0.4 * s0, Math.round(x * 7 + y), NIGHT, 0, null); return; }
  if (REGION === "snow") { pineShape(g, sx, sy, s * 0.45 * s0, SNOW_PINE[NIGHT ? "night" : "day"]); return; }
  ball(x, y, 0.5 * s0, 0.24 * s0, REGION === "forest" ? "#5f9a4a" : "#6fa84f"); ball(x - 0.08, y + 0.04, 0.62 * s0, 0.13 * s0, "#8cc265");
}
// ไฟผนัง (ไฟกลางคืน)
function wallLamp(x, y, z) { post(x, y, 0.08, 0.12, "#2d333b", z); if (NIGHT) glowAt(x, y + 0.15, z - 0.1, 0.9, "255,225,160", 0.5); }

// ---------- มินิมาร์ท / ไดเนอร์ (= ร้านค้า)
function martStatic(p) {
  const { X0, Y0, X1, Y1 } = B(p), diner = p.style === "diner";
  const a0 = X0 + 0.25, a1 = X1 - 0.25, b0 = Y0 + 0.2, b1 = Y1 - 0.45, H = diner ? 2.1 : 2.35, W = a1 - a0;
  const wall = diner ? "#f6ead2" : "#f4f1ea", trim = diner ? "#c9433c" : "#2f9e6e";
  building(a0, b0, a1, b1, H, { wall, trim, base: diner ? "#c9433c" : "#8f9a94", roof: "#ecebe6", roofTh: 0.24 });
  // ป้ายหน้าร้านยาวตลอด (กล่องยื่น)
  signBox("s", diner ? "ร้านอาหาร · กาแฟ" : "มินิมาร์ท 24 ชม.", a0 + 0.15, a1 - 0.15, b1, H - 0.62, H - 0.1, trim, "#ffffff", 0.1);
  // กระจกหน้าร้าน (เห็นชั้นสินค้าข้างใน / บูธนั่งของไดเนอร์)
  const w1 = a0 + W * 0.62;
  win("s", a0 + 0.2, w1, b1, 0.35, H - 0.75, { panes: Math.round((w1 - a0) / 0.8), sill: false, inside: (g0, g1, h0, h1) => {
    if (diner) { for (let x = g0 + 0.1; x < g1 - 0.4; x += 0.9) { faceRect("s", x, x + 0.5, b1, h0, h0 + 0.35, col("#c9433c")); faceRect("s", x + 0.05, x + 0.45, b1, h0 + 0.35, h0 + 0.42, col("#e7dfcf")); } }
    else for (let r = 0; r < 3; r++) { const z = h0 + 0.12 + r * (h1 - h0 - 0.2) / 3; faceRect("s", g0 + 0.05, g1 - 0.05, b1, z - 0.03, z, col("#d8d4cc")); for (let x = g0 + 0.1; x < g1 - 0.15; x += 0.16) faceRect("s", x, x + 0.11, b1, z, z + 0.16 + ((x * 13) % 3) * 0.03, col(PRIZE[Math.floor(x * 7 + r) % 5], 0.95)); }
  } });
  faceRect("s", a0 + 0.15, w1 + 0.05, b1, 0.16, 0.35, col(diner ? "#c9433c" : "#8f9a94", 1.1));
  // กันสาดเหนือกระจก
  awning(a0 + 0.1, w1 + 0.1, b1 + 0.1, H - 0.66, 0.5, 0.32, diner ? "#d9534f" : "#3fae7a");
  // ประตูกระจกบานเลื่อน (บานขยับวาดสด) — วงกบ + กันสาดเล็ก
  const d0 = a1 - W * 0.3, d1 = a1 - W * 0.07;
  faceRect("s", d0 - 0.06, d1 + 0.06, b1, 0, 1.95, col("#3a4048"));
  faceRect("s", d0, d1, b1, 0, 1.88, NIGHT ? "#ffe2a0" : col("#5f7f94"));
  // ข้างร้าน: หน้าต่างด้านข้าง + ป้ายเล็ก
  win("e", b0 + 0.5, b1 - 0.5, a1, 0.7, 1.6, { panes: 2 });
  win("w", b0 + 0.5, b1 - 0.5, a0, 0.7, 1.6, { panes: 2 });
  wallLamp(d0 - 0.25, b1 + 0.02, 1.95); wallLamp(d1 + 0.25, b1 + 0.02, 1.95);
  if (diner) {
    // ป้ายวงกลมบนหลังคา (เสา + ขอบโครเมียม)
    const mx = a0 + W * 0.3, my = (b0 + b1) / 2;
    post(mx, my, 1.0, 0.1, "#c9d0d6", H + 0.24);
    box(mx - 1.0, my - 0.07, mx + 1.0, my + 0.07, H + 1.1, H + 1.75, "#d9534f");
    faceText("s", "ร้านอาหาร", mx - 0.92, mx + 0.92, my + 0.07, H + 1.16, H + 1.7, null, "#fff4d0");
    faceRect("s", a0, a1, b1 + 0.005, H - 0.75, H - 0.68, col("#d7dde3")); // แถบโครเมียม
  } else {
    // ตู้แช่น้ำแข็ง + ม้านั่งหน้าร้าน
    box(a1 - 0.05 - 0.55, b1 + 0.02, a1 - 0.05, b1 + 0.38, 0, 0.85, "#e8eef3");
    faceText("s", "น้ำแข็ง", a1 - 0.58, a1 - 0.08, b1 + 0.38, 0.45, 0.75, col("#3d9fd9"));
  }
  shrub(a0 + 0.05, b1 + 0.18, 0.9);
}
function martLive(p) {
  const { X0, X1, Y1 } = B(p), diner = p.style === "diner", a0 = X0 + 0.25, a1 = X1 - 0.25, b1 = Y1 - 0.45, W = a1 - a0, H = diner ? 2.1 : 2.35;
  const k = actK(p.id, 2400), open = k == null ? 0 : Math.sin(Math.min(1, k * 1.3) * Math.PI);
  const d0 = a1 - W * 0.3, d1 = a1 - W * 0.07, dw = (d1 - d0) / 2;
  const leaf = (x0, x1) => { faceRect("s", x0, x1, b1 + 0.006, 0, 1.88, NIGHT ? "rgba(255,240,200,.55)" : "rgba(190,226,244,.85)"); faceRect("s", x0, x0 + 0.04, b1 + 0.007, 0, 1.88, col("#9aa1a8")); faceRect("s", x1 - 0.04, x1, b1 + 0.007, 0, 1.88, col("#9aa1a8")); };
  leaf(d0 - open * dw * 0.9, d0 + dw - open * dw * 0.9);
  leaf(d0 + dw + open * dw * 0.9, d1 + open * dw * 0.9);
  if (NIGHT) {
    glowAt(a0 + W * 0.35, b1 + 0.4, 0.9, 2.4, "255,220,140", 0.32);
    glowAt((a0 + a1) / 2, b1 + 0.2, H - 0.35, 2.2, diner ? "255,120,110" : "120,255,190", 0.22 * flicker(5));
    // พนักงานผี (กลางคืน) — ลอยหลังกระจก
    if (faceVisible(0, 1, a0 + W * 0.3, b1)) {
      const g = G, [sx, sy, s] = P(a0 + W * 0.4, b1 - 0.02, 0.95 + Math.sin(NOW / 650) * 0.08);
      g.globalAlpha = 0.45 + Math.sin(NOW / 330) * 0.2; g.fillStyle = "#f0f6ff";
      g.beginPath(); g.arc(sx, sy, 0.26 * s, Math.PI, 0); g.lineTo(sx + 0.26 * s, sy + 0.4 * s);
      for (let i = 0; i < 4; i++) g.lineTo(sx + (0.19 - i * 0.13) * s, sy + (i % 2 ? 0.4 : 0.3) * s);
      g.lineTo(sx - 0.26 * s, sy + 0.4 * s); g.fill();
      g.fillStyle = "#1f2a33"; g.beginPath(); g.arc(sx - 0.09 * s, sy, 0.04 * s, 0, TAU); g.arc(sx + 0.09 * s, sy, 0.04 * s, 0, TAU); g.fill();
      g.globalAlpha = 1;
    }
  }
}

// ---------- อู่ซ่อมรถ
function garageStatic(p) {
  const { X0, Y0, X1, Y1 } = B(p), a0 = X0 + 0.25, a1 = X1 - 0.25, b0 = Y0 + 0.2, b1 = Y1 - 0.45, W = a1 - a0, H = 2.55;
  building(a0, b0, a1, b1, H, { wall: "#a9b1ba", trim: "#3b434c", base: "#6b737b", roof: "#d2d6da", roofTh: 0.22 });
  // ผนังเมทัลชีทลอน (เส้นตั้ง)
  for (let x = a0 + 0.12; x < a1; x += 0.2) { faceRect("s", x, x + 0.03, b1, 0.16, H - 0.16, "rgba(40,48,58,.14)"); }
  for (let y = b0 + 0.12; y < b1; y += 0.2) { faceRect("e", y, y + 0.03, a1, 0.16, H - 0.16, "rgba(40,48,58,.14)"); faceRect("w", y, y + 0.03, a0, 0.16, H - 0.16, "rgba(40,48,58,.14)"); }
  // ช่องประตูม้วน (ด้านในมืด + ลิฟต์ยกรถเหลือง + ไฟเพดาน)
  const r0 = a0 + 0.25, r1 = a0 + W * 0.66;
  faceRect("s", r0 - 0.08, r1 + 0.08, b1, 0, 2.05, col("#ffd23f"));
  for (let x = r0 - 0.08; x < r1 + 0.08; x += 0.3) faceRect("s", x, Math.min(r1 + 0.08, x + 0.15), b1 + 0.001, 0, 0.12, col("#1f2328"));
  faceRect("s", r0, r1, b1, 0, 1.97, col("#1b1f24", 1, true));
  faceRect("s", r0 + 0.3, r1 - 0.3, b1 + 0.001, 0.45, 0.58, col("#e0b020"));
  for (const x of [r0 + 0.35, r1 - 0.35]) faceRect("s", x - 0.05, x + 0.05, b1 + 0.001, 0, 0.58, col("#e0b020", 0.85));
  // ป้าย + ไอคอนประแจ
  signBox("s", "🔧 อู่ซ่อมรถ", a0 + 0.3, a0 + W * 0.66, b1, 2.12, 2.48, "#2a2f36", "#ffd23f", 0.08);
  // ประตูเล็ก + หน้าต่างออฟฟิศ
  door("s", a1 - W * 0.24, a1 - W * 0.1, b1, 1.55, { col: "#4a90c8" });
  win("s", a1 - W * 0.24, a1 - W * 0.1, b1, 1.7, 2.2, { panes: 1, sill: false });
  // กองยาง + ถังน้ำมัน + ตู้เครื่องมือ (ในขอบเขต)
  for (let k = 0; k < 3; k++) { ell(a1 - 0.28, b1 + 0.24, 0.12 + k * 0.17, 0.24, 0.22, col("#25272b")); ell(a1 - 0.28, b1 + 0.24, 0.2 + k * 0.17, 0.11, 0.1, col("#4a4d52")); }
  box(a0 + W * 0.68, b1 + 0.03, a0 + W * 0.68 + 0.42, b1 + 0.33, 0, 0.62, "#d8453b");
  faceRect("s", a0 + W * 0.68 + 0.04, a0 + W * 0.68 + 0.38, b1 + 0.33, 0.35, 0.4, col("#9aa1a8"));
  wallLamp((r0 + r1) / 2, b1 + 0.02, 2.05);
}
function garageLive(p) {
  const { X0, X1, Y1 } = B(p), a0 = X0 + 0.25, a1 = X1 - 0.25, b1 = Y1 - 0.45, W = a1 - a0;
  const k = actK(p.id, 6000);
  const shut = k == null ? 0.58 : k < 0.15 ? 0.58 - k / 0.15 * 0.52 : k > 0.85 ? 0.06 + (k - 0.85) / 0.15 * 0.52 : 0.06;
  const r0 = a0 + 0.25, r1 = a0 + W * 0.66, h = 1.97 * shut;
  if (NIGHT || k != null) glowAt((r0 + r1) / 2, b1 - 0.2, 0.9, 1.4, "255,226,160", NIGHT ? 0.4 : 0.22);
  for (let i = 0; i * 0.14 < h; i++) { const z1 = 1.97 - i * 0.14, z0 = Math.max(1.97 - h, z1 - 0.14); faceRect("s", r0, r1, b1 + 0.004, z0, z1, col(i % 2 ? "#b4bcc4" : "#cfd5db")); faceRect("s", r0, r1, b1 + 0.005, z0, z0 + 0.02, "rgba(40,48,58,.25)"); }
  faceRect("s", r0, r1, b1 + 0.006, 1.97 - h - 0.06, 1.97 - h, col("#7c848c"));
  if (k != null && Math.random() < 0.3) emit({ x: r0 + 0.5 + Math.random() * (r1 - r0 - 1), y: b1 + 0.1, z: 0.6, vz: 1, vx: (Math.random() - 0.5), star: true, col: "#ffd27a", dur: 0.5 });
}

// ---------- ล้างรถ: อุโมงค์ทึบ ปากเปิดหันกล้อง
function washDraw(p) {
  const { X0, Y0, X1, Y1 } = B(p), b0 = Y0 + 0.25, b1 = Y1 - 0.3, w0 = X0 + 0.3, w1 = X1 - 0.3, H = 2.05;
  const k = actK(p.id, 3400), spd = k != null ? 14 : 0.6;
  // พื้นรางล้าง + รางน้ำ
  poly([[w0, b0, 0.004], [w1, b0, 0.004], [w1, b1, 0.004], [w0, b1, 0.004]], col("#c4ccd4"));
  for (const x of [w0 + 0.9, w1 - 0.9]) poly([[x - 0.12, b0, 0.006], [x + 0.12, b0, 0.006], [x + 0.12, b1, 0.006], [x - 0.12, b1, 0.006]], col("#8c969f"));
  castShadow(w0, b0, w1, b1, H + 0.3);
  const parts = [
    { d: depthOf(w0 + 0.2, (b0 + b1) / 2), f: () => { box(w0, b0, w0 + 0.32, b1, 0, H, "#3d8fd6"); faceRect("e", b0, b1, w0 + 0.32, 0.9, 1.1, col("#ffffff")); faceRect("w", b0, b1, w0, 0.9, 1.1, col("#ffffff")); } },
    { d: depthOf(w1 - 0.2, (b0 + b1) / 2), f: () => { box(w1 - 0.32, b0, w1, b1, 0, H, "#3d8fd6"); faceRect("w", b0, b1, w1 - 0.32, 0.9, 1.1, col("#ffffff")); faceRect("e", b0, b1, w1, 0.9, 1.1, col("#ffffff")); } },
    { d: depthOf((w0 + w1) / 2, b0), f: () => { box(w0 + 0.32, b0, w1 - 0.32, b0 + 0.14, 0, H, "#2f78bd"); if (NIGHT) glowAt((w0 + w1) / 2, b0 + 0.4, 1.2, 1.8, "120,220,255", 0.3); } },
  ];
  const bx = [w0 + 1.05, w1 - 1.05], by = [b0 + 0.9, b1 - 0.9];
  for (const x of bx) for (const y of by) parts.push({ d: depthOf(x, y), f: () => {
    const g = G, [sx, sy, s] = P(x, y, 0.05), [, ty] = P(x, y, 1.75);
    for (let i = 0; i < 9; i++) { const ph = NOW / 1000 * spd + i * 0.8 + x; g.fillStyle = col(Math.sin(ph) > 0 ? "#3fc1c9" : "#ff6fa8"); const w = 0.56 * s * (0.4 + 0.6 * Math.abs(Math.cos(ph))); g.fillRect(sx - w / 2, ty + i * (sy - ty) / 9, w, (sy - ty) / 9 - 1); }
    line3([x, y, 1.75], [x, y, H], "#c9d0d6", 0.05);
  } });
  parts.sort((a, b) => a.d - b.d).forEach((q) => q.f());
  // หลังคาทึบหนาคลุมครึ่งหลัง (ครึ่งหน้าเปิดให้เห็นแปรง) + คานโค้งหน้าอุโมงค์มีป้าย + ไฟแถบ
  const bm = b0 + (b1 - b0) * 0.5;
  roofSlab(w0, b0, w1, bm, H, 0.22, "#eef2f5", 0.1, "#c3cbd2");
  box(w0, b1 - 0.22, w1, b1, H - 0.4, H + 0.02, "#2f78bd");
  for (let x = w0 + 0.4; x < w1 - 0.3; x += 0.35) faceRect("s", x, x + 0.18, b1, H - 0.36, H - 0.3, (k != null || NIGHT) ? `hsl(${(x * 60 + NOW * 0.15) % 360},85%,70%)` : col("#9fd3f0"));
  signBox("s", "🫧 ล้างรถ", w0 + 0.7, w1 - 0.7, b1, H - 0.05, H + 0.4, "#ffffff", "#2f78bd", 0.06);
  for (const [i, c] of [[0, "#3fd27a"], [1, "#ff5a5a"]]) { const x = w1 - 0.5 - i * 0.22; ball(x, b1 + 0.08, H - 0.55, 0.06, (k != null) === (i === 0) ? c : "#4a4d52", true); }
  if (k != null && Math.random() < 0.4) emit({ x: w0 + 0.6 + Math.random() * (w1 - w0 - 1.2), y: b0 + 0.4 + Math.random() * (b1 - b0 - 0.8), z: 0.2 + Math.random(), vz: 0.7, bubble: true, dur: 1.5 });
}

// ---------- ห้องน้ำปริศนา
function wcStatic(p) {
  const { X0, Y0, X1, Y1 } = B(p), a0 = X0 + 0.25, a1 = X1 - 0.25, b0 = Y0 + 0.25, b1 = Y1 - 0.3, H = 2.0;
  building(a0, b0, a1, b1, H, { wall: "#efe7f7", trim: "#8a55e0", base: "#6e4fa8", roof: "#e9e4f2", roofTh: 0.2, kit: false });
  // กระเบื้องผนังล่าง
  faceRect("s", a0, a1, b1, 0.16, 0.8, col("#dccdf2"));
  for (let x = a0 + 0.2; x < a1; x += 0.2) faceRect("s", x, x + 0.015, b1, 0.16, 0.8, "rgba(110,80,170,.18)");
  signBox("s", "ห้องน้ำ", a0 + 0.2, a1 - 0.2, b1, H - 0.48, H - 0.1, "#8a55e0", "#ffffff", 0.07);
  faceText("e", "🚻", b0 + 0.3, b1 - 0.3, a1, 0.9, 1.5, null, "#5a3a9a");
  win("e", b0 + 0.3, b1 - 0.3, a1, 1.55, 1.75, { panes: 2, sill: false, glass: "#c7b6ea" });
  // ท่อระบายอากาศบนหลังคา
  post(a1 - 0.4, b0 + 0.4, 0.5, 0.12, "#b8b2c4", H + 0.2);
  shrub(a1 + 0.05, b1 + 0.12, 0.8);
  wallLamp(a0 + 0.4, b1 + 0.02, 1.7);
}
function wcLive(p) {
  const { X0, Y1 } = B(p), a0 = X0 + 0.25, b1 = Y1 - 0.3;
  const k = actK(p.id, 1600), open = k != null && k < 0.75;
  const d0 = a0 + 0.35, d1 = d0 + 0.8;
  faceRect("s", d0 - 0.05, d1 + 0.05, b1 + 0.003, 0, 1.55, col("#5a3a9a"));
  faceRect("s", d0, d1, b1 + 0.004, 0, 1.5, open ? "#1b1426" : col("#a26bff"));
  if (!open) { faceRect("s", d0 + 0.08, d1 - 0.08, b1 + 0.005, 0.85, 1.4, col("#b98aff")); faceRect("s", d1 - 0.16, d1 - 0.1, b1 + 0.005, 0.7, 0.78, col("#ffd27a")); }
  else { faceRect("s", d1, d1 + 0.24, b1 + 0.006, 0, 1.5, col("#8a55e0")); glowAt((d0 + d1) / 2, b1 + 0.1, 0.7, 1.0, "190,140,255", 0.6); }
}

// ---------- ตู้คีบตุ๊กตา
function clawDraw(p) {
  const { cx, cy } = B(p), x0 = cx - 0.36, x1 = cx + 0.36, y0 = cy - 0.34, y1 = cy + 0.3;
  ao(x0, y0, x1, y1, 0.15, 0.25);
  box(x0, y0, x1, y1, 0, 0.6, "#ff6fa8");
  faceRect("s", x0 + 0.08, x1 - 0.08, y1, 0.12, 0.3, col("#2d333b")); // ช่องรับรางวัล
  faceRect("s", x0 + 0.05, x1 - 0.05, y1, 0.42, 0.56, col("#ffd23f"));
  // ตู้กระจก: กรอบเสา 4 ต้น + กระจกฟ้าอ่อนทึบบางส่วน (เห็นตุ๊กตาข้างใน)
  poly([[x0, y0, 0.6], [x1, y0, 0.6], [x1, y1, 0.6], [x0, y1, 0.6]], col("#f0b8d3"));
  for (let i = 0; i < 6; i++) ball(x0 + 0.15 + (i % 3) * 0.21, y0 + 0.2 + Math.floor(i / 3) * 0.24, 0.7, 0.09, PRIZE[i % 5]);
  const k = actK(p.id, 1400), cz = 1.36 - Math.sin((k || 0) * Math.PI) * 0.6, sway = k == null ? Math.sin(NOW / 900) * 0.12 : 0;
  line3([cx + sway, cy, 1.45], [cx + sway, cy, cz], "#c9d0d6", 0.025);
  const [bx, by, s] = P(cx + sway, cy, cz), g = G; g.strokeStyle = col("#c9d0d6"); g.lineWidth = Math.max(1, 0.03 * s); g.beginPath(); g.moveTo(bx - 0.1 * s, by + 0.1 * s); g.lineTo(bx, by); g.lineTo(bx + 0.1 * s, by + 0.1 * s); g.stroke();
  g.globalAlpha = 0.22; box(x0 + 0.01, y0 + 0.01, x1 - 0.01, y1 - 0.01, 0.6, 1.45, "#d8f0ff", { line: false, lit: true, noTop: true }); g.globalAlpha = 1;
  for (const [x, y] of [[x0, y1], [x1, y1], [x0, y0], [x1, y0]]) line3([x, y, 0.6], [x, y, 1.45], "#ff6fa8", 0.04);
  box(x0 - 0.03, y0 - 0.03, x1 + 0.03, y1 + 0.03, 1.45, 1.7, "#ff6fa8");
  faceText("s", "★", x0, x1, y1 + 0.03, 1.47, 1.68, null, "#ffffff");
  if (NIGHT) glowAt(cx, cy, 1.0, 0.8, "255,140,200", 0.35 * flicker(3));
}
// ---------- ตู้กาชา
function gachaDraw(p) {
  const { cx, cy } = B(p);
  ao(cx - 0.34, cy - 0.32, cx + 0.34, cy + 0.32, 0.14, 0.25);
  box(cx - 0.34, cy - 0.32, cx + 0.34, cy + 0.32, 0, 0.72, "#d9534f");
  faceRect("s", cx - 0.2, cx + 0.2, cy + 0.32, 0.12, 0.34, col("#2d333b"));
  const k = actK(p.id, 900), [sx, sy, s] = P(cx, cy + 0.33, 0.52);
  G.fillStyle = col("#ffd23f"); G.beginPath(); G.arc(sx, sy, 0.1 * s, 0, TAU); G.fill();
  G.strokeStyle = col("#a8732a"); G.lineWidth = Math.max(1, s * 0.03); G.beginPath(); const an = (k || 0) * 6; G.moveTo(sx - Math.cos(an) * 0.08 * s, sy - Math.sin(an) * 0.08 * s); G.lineTo(sx + Math.cos(an) * 0.08 * s, sy + Math.sin(an) * 0.08 * s); G.stroke();
  box(cx - 0.3, cy - 0.28, cx + 0.3, cy + 0.28, 0.72, 0.8, "#b8403b");
  for (let i = 0; i < 9; i++) ball(cx - 0.15 + (i % 3) * 0.15, cy - 0.05 + ((i * 7) % 3) * 0.06, 0.9 + Math.floor(i / 3) * 0.11, 0.075, PRIZE[i % 5]);
  const [dx, dy, ds] = P(cx, cy, 1.05);
  G.fillStyle = "rgba(220,240,255,.28)"; G.beginPath(); G.arc(dx, dy, 0.33 * ds, 0, TAU); G.fill();
  G.strokeStyle = "rgba(255,255,255,.75)"; G.lineWidth = Math.max(1, ds * 0.02); G.beginPath(); G.arc(dx, dy, 0.33 * ds, 0, TAU); G.stroke();
  G.fillStyle = "rgba(255,255,255,.7)"; G.beginPath(); G.ellipse(dx - 0.13 * ds, dy - 0.14 * ds, 0.07 * ds, 0.04 * ds, -0.6, 0, TAU); G.fill();
  ball(cx, cy, 1.4, 0.07, "#d9534f");
}
// ---------- ตู้เกม
function arcadeDraw(p) {
  const { cx, cy } = B(p), x0 = cx - 0.34, x1 = cx + 0.34, y0 = cy - 0.3, y1 = cy + 0.24;
  ao(x0, y0, x1, y1 + 0.15, 0.14, 0.25);
  box(x0, y0, x1, y1, 0, 1.7, "#3a2f5a");
  // แผงปุ่มเอียง
  poly([[x0, y1, 0.85], [x1, y1, 0.85], [x1, y1 + 0.2, 0.78], [x0, y1 + 0.2, 0.78]], col("#a26bff", 1.1), LINE);
  box(x0, y1, x1, y1 + 0.2, 0, 0.78, "#3a2f5a");
  const [jx, jy, js] = P(cx - 0.14, y1 + 0.1, 0.86); G.fillStyle = col("#1f1a2e"); G.fillRect(jx - js * 0.012, jy - js * 0.12, js * 0.024, js * 0.12); G.fillStyle = col("#ff4a5a"); G.beginPath(); G.arc(jx, jy - js * 0.12, js * 0.04, 0, TAU); G.fill();
  for (let i = 0; i < 3; i++) ball(cx + 0.02 + i * 0.09, y1 + 0.1, 0.84, 0.025, PRIZE[i]);
  const k = actK(p.id, 2000);
  faceRect("s", x0 + 0.05, x1 - 0.05, y1, 0.92, 1.42, col("#14121c", 1, true));
  faceRect("s", x0 + 0.09, x1 - 0.09, y1, 0.96, 1.38, k != null ? `hsl(${(NOW * 0.6) % 360},90%,60%)` : NIGHT ? "#4f63ff" : "#3344ff");
  if (k == null && faceVisible(0, 1, cx, y1)) { const ph = (NOW / 1800) % 1, ix = x0 + 0.14 + ph * (x1 - x0 - 0.28); faceRect("s", ix - 0.035, ix + 0.035, y1 + 0.002, 1.05, 1.13, "#ffd23f"); faceRect("s", x0 + 0.12, x1 - 0.12, y1 + 0.002, 1.0, 1.02, "rgba(255,255,255,.4)"); }
  // ป้ายไฟหัวตู้
  box(x0 - 0.02, y0 - 0.02, x1 + 0.02, y1 + 0.04, 1.7, 1.95, "#a26bff", NIGHT ? { front: "#e2c8ff", lit: true } : {});
  faceText("s", "เกม", x0, x1, y1 + 0.04, 1.72, 1.93, null, NIGHT ? "#7a3fd0" : "#ffffff");
  if (NIGHT) glowAt(cx, y1 + 0.15, 1.2, 0.9, "130,150,255", 0.45);
}
// ---------- คาราโอเกะ: ตู้ทึบสามด้าน หน้าเปิด · เวที (stage) = แท่นใหญ่ + ม่าน + โครงไฟ
function karaokeDraw(p) {
  const { X0, Y0, X1, Y1, cx } = B(p), stage = p.style === "stage";
  const a0 = X0 + 0.2, a1 = X1 - 0.2, b0 = Y0 + 0.2, b1 = Y1 - 0.25, H = stage ? 2.25 : 2.05, fl = stage ? 0.32 : 0.14;
  const k = actK(p.id, 3200);
  castShadow(a0, b0, a1, b1, H + 0.2); ao(a0, b0, a1, b1, 0.25, 0.26);
  box(a0, b0, a1, b1, 0, fl, stage ? "#4a2c6e" : "#6b3a99");
  for (let x = a0 + 0.3; x < a1 - 0.1; x += 0.45) faceRect("s", x, x + 0.2, b1, 0.03, fl - 0.04, col("#ffd23f", 0.9)); // ไฟขอบเวที
  // ผนังหลัง + ผนังข้าง (ทึบ)
  box(a0, b0, a1, b0 + 0.14, fl, H, stage ? "#b0324a" : "#7a3fa8");
  if (stage) { for (let x = a0 + 0.1; x < a1; x += 0.22) faceRect("s", x, x + 0.08, b0 + 0.14, fl, H - 0.1, col("#8a2238")); }
  else { faceRect("s", a0 + 0.15, a1 - 0.15, b0 + 0.14, fl + 0.5, H - 0.25, col("#2a1840", 1, true)); for (let i = 0; i < 7; i++) faceRect("s", a0 + 0.25 + i * (a1 - a0 - 0.5) / 7, a0 + 0.3 + i * (a1 - a0 - 0.5) / 7, b0 + 0.14, fl + 0.6, fl + 0.6 + 0.2 + ((i * 5) % 4) * 0.12 * (k != null ? 1 + Math.sin(NOW / 90 + i) : 1), k != null ? `hsl(${(i * 50 + NOW * 0.2) % 360},85%,65%)` : col(PRIZE[i % 5])); }
  box(a0, b0, a0 + 0.14, b1, fl, H, stage ? "#4a2c6e" : "#6b3a99");
  box(a1 - 0.14, b0, a1, b1, fl, H, stage ? "#4a2c6e" : "#6b3a99");
  // ลำโพง 2 ข้าง
  for (const x of [a0 + 0.38, a1 - 0.38]) { box(x - 0.18, b1 - 0.42, x + 0.18, b1 - 0.1, fl, fl + 0.75, "#25222b"); const [sx, sy, s] = P(x, b1 - 0.1, fl + 0.38); G.fillStyle = col("#5a5466"); G.beginPath(); G.arc(sx, sy, s * 0.12 * (k != null ? 1 + Math.abs(Math.sin(NOW / 70)) * 0.12 : 1), 0, TAU); G.fill(); G.fillStyle = col("#15131a"); G.beginPath(); G.arc(sx, sy, s * 0.05, 0, TAU); G.fill(); }
  // ไมค์บนขาตั้ง
  line3([cx + 0.1, (b0 + b1) / 2 + 0.2, fl], [cx + 0.1, (b0 + b1) / 2 + 0.2, fl + 1.0], "#c9d0d6", 0.03); ball(cx + 0.1, (b0 + b1) / 2 + 0.2, fl + 1.05, 0.06, "#2d333b");
  // หลังคาทึบหนา + ป้าย
  roofSlab(a0, b0, a1, b1, H, 0.2, stage ? "#3a2258" : "#5a2f88", 0.1, stage ? "#2c1a44" : "#47246c");
  signBox("s", stage ? "🎤 เวทีร้องเพลง" : "🎤 คาราโอเกะ", a0 + 0.25, a1 - 0.25, b1 + 0.1, H - 0.05, H + 0.32, stage ? "#ff4fa0" : "#ff6fd0", "#ffffff", 0.06);
  // ลูกบอลดิสโก้ใต้หลังคา
  const bz = H - 0.35;
  line3([cx, (b0 + b1) / 2, H], [cx, (b0 + b1) / 2, bz + 0.12], "#c9d0d6", 0.015);
  ball(cx, (b0 + b1) / 2, bz, 0.14, k != null ? "#ffffff" : "#d8d8e0", k != null);
  for (let i = 0; i < 5; i++) { const an = NOW / 700 + i * 1.3, [sx, sy, s] = P(cx + Math.cos(an) * 0.1, (b0 + b1) / 2 + Math.sin(an) * 0.05, bz); G.fillStyle = k != null ? `hsl(${(i * 70 + NOW * 0.3) % 360},90%,70%)` : "rgba(255,255,255,.9)"; G.fillRect(sx - 0.02 * s, sy - 0.02 * s, 0.04 * s, 0.04 * s); }
  if (stage) for (const x of [a0 + 0.3, cx, a1 - 0.3]) { box(x - 0.08, b1 - 0.05, x + 0.08, b1 + 0.08, H - 0.2, H - 0.05, "#25222b"); if (NIGHT || k != null) glowAt(x, b1 + 0.3, fl + 0.2, 1.0, ["255,110,200", "120,200,255", "255,230,120"][Math.round(x) % 3], 0.35); }
  if (NIGHT || k != null) for (let i = 0; i < 3; i++) glowAt(cx + (i - 1) * 0.55, (b0 + b1) / 2, fl + 0.4, 0.9, ["255,110,200", "120,200,255", "255,230,120"][i], (k != null ? 0.5 : 0.25) * (0.6 + 0.4 * Math.sin(NOW / 200 + i * 2)));
}
// ---------- หมาประจำปั๊ม (บ้านหมาหลังคาจั่ว + ชามข้าว)
function dogDraw(p) {
  const { cx, cy } = B(p), k = actK(p.id, 2000);
  const j = k != null ? Math.abs(Math.sin(NOW / 80)) * 0.3 : 0, br = Math.sin(NOW / 500) * 0.015;
  const kx0 = cx - 0.44, kx1 = cx + 0.02, ky0 = cy - 0.46, ky1 = cy - 0.06;
  ao(kx0, ky0, kx1, ky1, 0.1, 0.25);
  box(kx0, ky0, kx1, ky1, 0, 0.42, "#c4604a");
  // หลังคาจั่วสองผืน
  poly([[kx0 - 0.04, ky0 - 0.04, 0.42], [kx1 + 0.04, ky0 - 0.04, 0.42], [kx1 + 0.04, (ky0 + ky1) / 2, 0.68], [kx0 - 0.04, (ky0 + ky1) / 2, 0.68]], col("#8a3f30", 0.85), LINE);
  poly([[kx0 - 0.04, (ky0 + ky1) / 2, 0.68], [kx1 + 0.04, (ky0 + ky1) / 2, 0.68], [kx1 + 0.04, ky1 + 0.04, 0.42], [kx0 - 0.04, ky1 + 0.04, 0.42]], col("#a24c3a"), LINE);
  faceRect("s", cx - 0.3, cx - 0.1, ky1, 0, 0.3, col("#2d1a14", 1, true));
  faceText("s", "🦴", kx0, kx1, ky1 + 0.04, 0.34, 0.42, null, "#ffffff");
  ao(cx - 0.12, cy + 0.02, cx + 0.5, cy + 0.28, 0.08, 0.22);
  box(cx - 0.12, cy + 0.02, cx + 0.32, cy + 0.26, 0.18 + j, 0.42 + j + br, "#d9a066", { line: false });
  for (const x of [-0.07, 0.25]) post(cx + x, cy + 0.24, 0.2 + j, 0.07, "#c48d55");
  ball(cx + 0.38, cy + 0.14, 0.55 + j + br, 0.15, "#d9a066"); ball(cx + 0.52, cy + 0.18, 0.5 + j, 0.05, "#2d333b");
  ball(cx + 0.32, cy + 0.08, 0.7 + j + (Math.sin(NOW / 1700) > 0.95 ? 0.04 : 0), 0.05, "#b5753f");
  ball(cx + 0.33, cy + 0.2, 0.43 + j, 0.035, "#d94a4a"); // ปลอกคอ
  const [tx, ty, s] = P(cx - 0.13, cy + 0.14, 0.38 + j), g = G;
  g.strokeStyle = col("#c48d55"); g.lineWidth = Math.max(1, 0.06 * s); g.lineCap = "round";
  g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx - 0.13 * s + Math.sin(NOW / (k != null ? 35 : 160)) * 0.11 * s, ty - 0.2 * s); g.stroke(); g.lineCap = "butt";
  ell(cx - 0.3, cy + 0.32, 0.03, 0.12, 0.08, col("#3d7fc0")); ell(cx - 0.3, cy + 0.32, 0.05, 0.08, 0.05, col("#c48d55"));
}
// ---------- เต็นท์หมอดู (ฐานไม้ + ม่านเปิด + ตะเกียง)
function fortuneDraw(p) {
  const { cx, cy, Y1 } = B(p), k = actK(p.id, 2500);
  castShadow(cx - 0.9, cy - 0.8, cx + 0.9, cy + 0.8, 2.2, 0.12); ao(cx - 0.95, cy - 0.85, cx + 0.95, cy + 0.85, 0.2, 0.22);
  ell(cx, cy, 0.01, 1.0, 0.9, col("#8a6a4a"));
  ell(cx, cy, 0.05, 0.94, 0.84, col("#a07c56"));
  const g = G, [ax, ay] = P(cx, cy, 2.45), N = 12;
  for (let i = 0; i < N; i++) {
    const a0 = i / N * TAU, a1 = (i + 1) / N * TAU, m = (a0 + a1) / 2;
    if (!faceVisible(Math.cos(m), Math.sin(m), cx + Math.cos(m) * 0.9, cy + Math.sin(m) * 0.8)) continue;
    const p0 = P(cx + Math.cos(a0) * 0.92, cy + Math.sin(a0) * 0.82, 0.06), p1 = P(cx + Math.cos(a1) * 0.92, cy + Math.sin(a1) * 0.82, 0.06);
    const lightK = 0.78 + 0.32 * Math.max(0, Math.sin(m) * 0.8 + Math.cos(m) * 0.3);
    g.fillStyle = col(i % 2 ? "#5b3a9a" : "#7350b8", lightK);
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.closePath(); g.fill();
    g.strokeStyle = LINE; g.lineWidth = 1; g.stroke();
  }
  // ระบายทองรอบชายเต็นท์ + ดาว
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; if (Math.sin(a) < -0.2) continue; const [sx, sy, s] = P(cx + Math.cos(a) * 0.9, cy + Math.sin(a) * 0.8, 0.5); G.fillStyle = col("#e0b84a", 1, NIGHT); G.beginPath(); G.arc(sx, sy, s * 0.035, 0, TAU); G.fill(); }
  for (let i = 0; i < 5; i++) { const [sx, sy, s] = P(cx + Math.cos(i * 1.7) * 0.42, cy + 0.5, 0.8 + (i % 3) * 0.42); g.fillStyle = col("#ffd23f", 1, true); g.font = `700 ${Math.max(6, s * 0.16)}px ${F_TH}`; g.textAlign = "center"; g.fillText("✦", sx, sy); }
  ball(cx, cy, 2.48, 0.08, "#ffd23f", true);
  // ม่านเปิดหน้าเต็นท์ (ทางเข้ามืด)
  const fy = Math.min(Y1 - 0.15, cy + 0.82);
  poly([[cx - 0.3, fy, 0.06], [cx + 0.3, fy, 0.06], [cx + 0.12, fy, 1.1], [cx - 0.12, fy, 1.1]], col("#24123c", 1, true));
  const pulse = k != null ? 0.75 + Math.sin(NOW / 80) * 0.25 : 0.35 + Math.sin(NOW / 700) * 0.1;
  glowAt(cx, fy, 0.5, 0.8, "170,110,255", pulse);
  box(cx - 0.16, fy - 0.12, cx + 0.16, fy + 0.08, 0.06, 0.42, "#3a2560");
  ball(cx, fy - 0.02, 0.56, 0.13, "#c9a6ff", true);
  line3([cx + 0.5, fy - 0.1, 0.06], [cx + 0.5, fy - 0.1, 1.2], "#5a3a22", 0.03); ball(cx + 0.5, fy - 0.05, 1.12, 0.07, "#ffb23f", NIGHT);
  if (NIGHT) glowAt(cx + 0.5, fy - 0.05, 1.12, 0.6, "255,190,100", 0.5 * flicker(9));
}
// ---------- แผงแข่งกินเผ็ด (เคาน์เตอร์ไม้ + ร่มลายทาง + หม้อเดือด)
function spicyDraw(p) {
  const { X0, X1, Y0, Y1, cx } = B(p), k = actK(p.id, 2200);
  const a0 = X0 + 0.18, a1 = X1 - 0.18, b0 = Y0 + 0.2, b1 = Y1 - 0.22, my = (b0 + b1) / 2;
  castShadow(a0, b0, a1, b1, 1.1, 0.12); ao(a0, b0, a1, b1, 0.18, 0.24);
  box(a0, b0, a1, b1, 0, 0.92, "#a8693e");
  for (let x = a0 + 0.1; x < a1; x += 0.22) faceRect("s", x, x + 0.02, b1, 0.05, 0.88, "rgba(60,30,10,.18)");
  box(a0 - 0.05, b0 - 0.05, a1 + 0.05, b1 + 0.05, 0.92, 1.0, "#7a4a2a");
  signBox("s", "🌶 แข่งกินเผ็ด", a0 + 0.2, a1 - 0.2, b1, 0.38, 0.78, "#d9342c", "#fff4d0", 0.05);
  for (let i = 0; i < 3; i++) { const x = a0 + 0.42 + i * (a1 - a0 - 0.84) / 2; box(x - 0.15, my - 0.12, x + 0.15, my + 0.12, 1.0, 1.16, "#4a4d52"); ell(x, my, 1.165, 0.13, 0.1, col(k != null ? "#ff4a2a" : "#c9342a", 1, k != null)); }
  // ร่มใหญ่ (8 กลีบสลับสี) บนเสา
  post(cx, my, 1.05, 0.05, "#c9d0d6", 1.0);
  const top = 2.25, R0 = (a1 - a0) / 2 + 0.35, [tx, ty] = P(cx, my, top);
  for (let i = 0; i < 10; i++) {
    const t0 = i / 10 * TAU, t1 = (i + 1) / 10 * TAU, m = (t0 + t1) / 2;
    const q0 = P(cx + Math.cos(t0) * R0, my + Math.sin(t0) * R0 * 0.75, 1.82), q1 = P(cx + Math.cos(t1) * R0, my + Math.sin(t1) * R0 * 0.75, 1.82);
    G.fillStyle = col(i % 2 ? "#ffffff" : "#ff5a36", 0.86 + 0.18 * Math.max(0, Math.sin(m)));
    G.beginPath(); G.moveTo(tx, ty); G.lineTo(q0[0], q0[1]); G.lineTo(q1[0], q1[1]); G.closePath(); G.fill(); G.strokeStyle = LINE; G.lineWidth = 1; G.stroke();
  }
  // พวงพริกแห้ง
  for (let i = 0; i < 5; i++) { const [px, py, ps] = P(a0 + 0.2 + i * 0.3, b1 + 0.02, 0.88 + Math.sin(NOW / 600 + i) * 0.015); G.fillStyle = col("#d9342c"); G.beginPath(); G.ellipse(px, py, 0.035 * ps, 0.09 * ps, 0.2, 0, TAU); G.fill(); }
  if (!LOWQ && Math.random() < (k != null ? 0.6 : 0.05)) emit({ x: a0 + 0.4 + Math.random() * (a1 - a0 - 0.8), y: my, z: 1.2, vz: 0.6, smoke: k == null, fire: k != null, dur: 1 });
}
// ---------- บ่อตกปลา / โอเอซิส (ขอบหิน + ไม้น้ำ + ระลอก)
function pondDraw(p) {
  const { X0, X1, Y0, Y1, cx, cy } = B(p), oasis = p.style === "oasis", k = actK(p.id, 2400);
  const rx = (X1 - X0) / 2 - 0.12, ry = (Y1 - Y0) / 2 - 0.1;
  ell(cx, cy, 0.006, rx + 0.12, ry + 0.12, NIGHT ? "rgba(0,6,24,.3)" : "rgba(40,50,40,.18)");
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; ell(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 0.04, 0.16, 0.12, col(oasis ? "#d9bf8a" : i % 2 ? "#a49a88" : "#8f8676")); }
  ell(cx, cy, 0.03, rx - 0.04, ry - 0.05, col(oasis ? "#3f9fbf" : "#2f7fb4"));
  ell(cx, cy - 0.05, 0.032, rx - 0.22, ry - 0.2, col(oasis ? "#58bcd6" : "#4a9ccc"));
  ell(cx - rx * 0.25, cy - ry * 0.3, 0.034, rx * 0.4, ry * 0.22, NIGHT ? "rgba(140,180,255,.18)" : "rgba(255,255,255,.22)");
  for (let i = 0; i < 3; i++) { const ph = ((NOW / 2400) + i / 3) % 1; G.strokeStyle = `rgba(255,255,255,${0.5 * (1 - ph)})`; G.lineWidth = 1; gEllipse(G, cx + Math.cos(i * 2.1) * rx * 0.35, cy + Math.sin(i * 2.1) * ry * 0.3, 0.1 + ph * 0.4, 0.036, 20, (0.1 + ph * 0.4) * 0.6); G.stroke(); }
  for (let i = 0; i < 4; i++) { const x = cx + Math.cos(i * 1.6 + 0.4) * rx * 0.6, y = cy + Math.sin(i * 1.6 + 0.4) * ry * 0.5; ell(x, y, 0.036, 0.14, 0.11, col("#4f8f3c")); if (i % 2 === 0) ball(x + 0.04, y, 0.06, 0.04, "#ff9ac8"); }
  // ต้นกก/หญ้าขอบบ่อ
  for (let i = 0; i < 6; i++) { const a = i * 1.1 + 0.3, x = cx + Math.cos(a) * (rx + 0.05), y = cy + Math.sin(a) * (ry + 0.05); if (Math.sin(a) < -0.3) continue; line3([x, y, 0.04], [x + 0.03, y, 0.45], "#5f8a3a", 0.02); ball(x + 0.03, y, 0.48, 0.03, "#7a5634"); }
  if (oasis) { const [sx, sy, s] = P(X0 + 0.2, Y0 + 0.25, 0); drawPalm(G, sx, sy, s * 1.1, 0.3, NIGHT); return; }
  const bz = 0.06 + Math.sin(NOW / (k != null ? 50 : 500)) * (k != null ? 0.06 : 0.02);
  ball(cx + 0.4, cy - 0.2, bz, 0.06, "#d9534f");
  post(X1 - 0.15, Y1 - 0.15, 1.2, 0.035, "#5a3a22");
  line3([X1 - 0.15, Y1 - 0.15, 1.2], [cx + 0.4, cy - 0.2, bz], "rgba(60,40,30,.7)", 0.012);
  box(X1 - 0.45, Y1 - 0.3, X1 - 0.2, Y1 - 0.1, 0, 0.2, "#3d7fc0"); // กล่องเหยื่อ
}
// ---------- ชิงช้าสวรรค์ (ฐานคอนกรีต + บูธขายตั๋ว + หลอดไฟรอบวง)
function ferrisDraw(p) {
  const { cx, cy, X0, X1, Y0, Y1 } = B(p), cz = 2.6, R = 2.0, k = actK(p.id, 3000), g = G;
  const spd = k != null ? 1.4 : 0.22, rot = NOW / 1000 * spd + (k != null ? k * 2 : 0);
  ao(X0 + 0.2, Y0 + 0.2, X1 - 0.2, Y1 - 0.2, 0.2, 0.22);
  box(X0 + 0.2, Y0 + 0.25, X1 - 0.2, Y1 - 0.2, 0, 0.14, "#cfcac0");
  for (const sx of [-1, 1]) { line3([cx + sx * 0.95, cy - 0.32, 0.14], [cx, cy, cz], "#e9e6de", 0.1); line3([cx + sx * 0.95, cy + 0.32, 0.14], [cx, cy, cz], "#f7f5f0", 0.1); line3([cx + sx * 0.7, cy + 0.25, 0.9], [cx + sx * 0.7, cy - 0.25, 0.9], "#d6d2c8", 0.05); }
  const [hx, hy, s] = P(cx, cy, cz);
  for (const [rr, w, c] of [[R, 0.08, "#ff6fa8"], [R * 0.62, 0.04, "#ffd23f"]]) { g.strokeStyle = col(c, 1, NIGHT); g.lineWidth = Math.max(1.2, w * s); g.beginPath(); for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU, q = P(cx + Math.cos(a) * rr, cy, cz + Math.sin(a) * rr); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); } g.stroke(); }
  if (NIGHT) for (let i = 0; i < 16; i++) { const a = rot * 0.5 + i / 16 * TAU, q = P(cx + Math.cos(a) * R, cy, cz + Math.sin(a) * R); g.fillStyle = (i + Math.floor(NOW / 300)) % 3 ? "#fff1b0" : "#ff9ad5"; g.beginPath(); g.arc(q[0], q[1], Math.max(1.2, s * 0.03), 0, TAU); g.fill(); }
  for (let i = 0; i < 8; i++) {
    const a = rot + i / 8 * TAU, gx = cx + Math.cos(a) * R, gz = cz + Math.sin(a) * R, q = P(gx, cy, gz);
    g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = Math.max(1, 0.03 * s); g.beginPath(); g.moveTo(hx, hy); g.lineTo(q[0], q[1]); g.stroke();
    // กระเช้า: หลังคาโค้ง + ตัวกระเช้า + หน้าต่าง
    g.fillStyle = col(PRIZE[i % 5], 0.85); g.beginPath(); g.ellipse(q[0], q[1] + 0.02 * s, 0.22 * s, 0.07 * s, 0, Math.PI, TAU); g.fill();
    g.fillStyle = col(PRIZE[i % 5]); g.fillRect(q[0] - 0.2 * s, q[1] + 0.02 * s, 0.4 * s, 0.3 * s);
    g.fillStyle = NIGHT ? "rgba(255,230,160,.95)" : "rgba(255,255,255,.65)"; g.fillRect(q[0] - 0.14 * s, q[1] + 0.07 * s, 0.28 * s, 0.1 * s);
    g.strokeStyle = LINE; g.lineWidth = 1; g.strokeRect(q[0] - 0.2 * s, q[1] + 0.02 * s, 0.4 * s, 0.3 * s);
  }
  ball(cx, cy, cz, 0.14, "#f7f5f0");
  // บูธขายตั๋วเล็กข้างฐาน
  const tx = X1 - 0.55, ty = Y1 - 0.45;
  box(tx - 0.25, ty - 0.2, tx + 0.25, ty + 0.2, 0.14, 0.95, "#ff6fa8"); box(tx - 0.3, ty - 0.25, tx + 0.3, ty + 0.25, 0.95, 1.05, "#ffffff");
  faceRect("s", tx - 0.17, tx + 0.17, ty + 0.2, 0.5, 0.8, NIGHT ? "#ffe2a0" : col("#9fd3f0"));
}
// ---------- ตู้น้ำมัน: เกาะคอนกรีตมีขอบ + เสากันชนเหลืองดำ + ตู้จ่าย + สาย/หัวจ่ายสองข้าง
function pumpDraw(p) {
  const { X0, X1, cy } = B(p), x = (X0 + X1) / 2, y = cy;
  const i0 = X0 + 0.12, i1 = X1 - 0.12;
  ao(i0, y - 0.32, i1, y + 0.36, 0.12, 0.25);
  box(i0, y - 0.32, i1, y + 0.36, 0, 0.13, "#d4cfc4", { top: col("#e3dfd6") });
  faceRect("s", i0, i1, y + 0.36, 0.02, 0.11, col("#ffd23f")); for (let a = i0; a < i1; a += 0.24) faceRect("s", a, Math.min(i1, a + 0.12), y + 0.36, 0.02, 0.11, col("#2d333b"));
  for (const bx of [i0 + 0.12, i1 - 0.12]) { post(bx, y + 0.22, 0.7, 0.09, "#ffd23f", 0.13); post(bx, y + 0.22, 0.12, 0.095, "#2d333b", 0.45); }
  // ตู้จ่าย
  box(x - 0.3, y - 0.2, x + 0.3, y + 0.2, 0.13, 0.32, "#3a4048");
  box(x - 0.27, y - 0.18, x + 0.27, y + 0.18, 0.32, 1.28, "#f7f5f0");
  faceRect("s", x - 0.27, x + 0.27, y + 0.18, 0.32, 0.5, col("#e0dcd2"));
  box(x - 0.31, y - 0.22, x + 0.31, y + 0.22, 1.28, 1.48, "#ff8a3d", NIGHT ? { front: "#ffb070", lit: true } : {});
  faceText("s", "⛽", x - 0.25, x + 0.25, y + 0.22, 1.3, 1.46, null, "#ffffff");
  const k = actK(p.id, 2600), v = k == null ? 0 : Math.min(1, k / 0.85) * (40 + (p.x0 * 7 % 25));
  if (faceVisible(0, 1, x, y + 0.18)) {
    faceRect("s", x - 0.22, x + 0.22, y + 0.18, 0.86, 1.14, col("#2d333b"));
    const [sx, sy, s] = P(x, y + 0.185, 1.0), g = G;
    g.fillStyle = "#0b1410"; g.fillRect(sx - 0.18 * s, sy - 0.1 * s, 0.36 * s, 0.17 * s);
    g.fillStyle = "#7dffcf"; g.font = `800 ${Math.max(6, 0.12 * s)}px monospace`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(v.toFixed(1), sx, sy - 0.01 * s); g.textBaseline = "alphabetic";
    for (let i = 0; i < 3; i++) faceRect("s", x - 0.2 + i * 0.15, x - 0.1 + i * 0.15, y + 0.18, 0.6, 0.72, col(["#3fae7a", "#ffd23f", "#d9534f"][i]));
  }
  // สายจ่าย 2 ข้าง (โค้ง) + หัวจ่ายแขวน — ข้างขวาดึงออกตอนเติม
  const hang = k != null && k < 0.95;
  for (const sd of [-1, 1]) {
    const sx0 = x + sd * 0.27, out = sd > 0 && hang;
    const nx = out ? x + 0.45 : sx0 + sd * 0.04, nz = out ? 0.75 : 0.95;
    const a = P(sx0, y + 0.05, 1.15), b = P(nx, y + 0.12, nz), c = P(sx0 + sd * 0.16, y + 0.1, 0.35);
    G.strokeStyle = col("#25272b"); G.lineWidth = Math.max(1.5, a[2] * 0.04); G.beginPath(); G.moveTo(a[0], a[1]); G.quadraticCurveTo(c[0], c[1], b[0], b[1]); G.stroke();
    box(nx - 0.05, y + 0.08, nx + 0.05, y + 0.2, nz - 0.08, nz + 0.08, "#2d333b");
  }
  if (NIGHT) glowAt(x, y + 0.3, 1.0, 0.5, "125,255,207", 0.25);
}
// เสาหลังคาปั๊ม: เสาเหลี่ยม + หุ้มฐานสีส้ม + ไฟ
function pillarDraw(p) {
  const { cx, cy } = B(p);
  ao(cx - 0.2, cy - 0.2, cx + 0.2, cy + 0.2, 0.12, 0.26);
  box(cx - 0.24, cy - 0.24, cx + 0.24, cy + 0.24, 0, 0.18, "#d4cfc4");
  box(cx - 0.16, cy - 0.16, cx + 0.16, cy + 0.16, 0.18, 0.9, "#ff8a3d");
  faceRect("s", cx - 0.16, cx + 0.16, cy + 0.16, 0.5, 0.6, col("#ffffff"));
  box(cx - 0.13, cy - 0.13, cx + 0.13, cy + 0.13, 0.9, 2.62, "#f2f0ea");
}
// ป้ายราคาน้ำมัน (ไพลอนสูง)
function priceStatic(p) {
  const { cx, cy } = B(p), x0 = cx - 0.42, x1 = cx + 0.42, y0 = cy - 0.14, y1 = cy + 0.14;
  castShadow(x0, y0, x1, y1, 4.3, 0.12); ao(x0, y0, x1, y1, 0.15, 0.25);
  box(x0 - 0.1, y0 - 0.1, x1 + 0.1, y1 + 0.1, 0, 0.3, "#c9c4b8");
  box(x0, y0, x1, y1, 0.3, 4.2, "#f2f0ea");
  box(x0 - 0.04, y0 - 0.04, x1 + 0.04, y1 + 0.04, 4.2, 4.35, "#ff8a3d");
  faceRect("s", x0 + 0.04, x1 - 0.04, y1, 3.35, 4.1, col("#ff8a3d"));
  faceText("s", "⛽", x0 + 0.1, x1 - 0.1, y1, 3.62, 4.08, null, "#ffffff");
  faceText("s", "ECHO", x0 + 0.06, x1 - 0.06, y1, 3.38, 3.62, null, "#ffffff");
  const rows = [["91", "38.45", "#3fae7a"], ["95", "39.85", "#e0b020"], ["D", "32.94", "#3d7fc0"]];
  rows.forEach(([n, v, c], i) => {
    const z1 = 3.22 - i * 0.62, z0 = z1 - 0.52;
    faceRect("s", x0 + 0.05, x0 + 0.28, y1, z0, z1, col(c));
    faceText("s", n, x0 + 0.05, x0 + 0.28, y1, z0 + 0.06, z1 - 0.06, null, "#ffffff");
    faceRect("s", x0 + 0.3, x1 - 0.05, y1, z0, z1, "#0b1410");
    faceText("s", v, x0 + 0.32, x1 - 0.07, y1, z0 + 0.06, z1 - 0.06, null, NIGHT ? "#a9ffe0" : "#7dffcf");
  });
  faceRect("e", y0, y1, x1, 0.3, 4.2, col("#ff8a3d", 0.85));
}
function benchDraw(p) {
  const { X0, X1, cy } = B(p), x0 = X0 + 0.1, x1 = X1 - 0.1, y = cy;
  ao(x0, y - 0.2, x1, y + 0.2, 0.1, 0.2);
  for (const x of [x0 + 0.08, x1 - 0.08]) { box(x - 0.04, y - 0.18, x + 0.04, y + 0.18, 0, 0.3, "#3a4048"); box(x - 0.04, y - 0.2, x + 0.04, y - 0.14, 0.3, 0.72, "#3a4048"); }
  for (let i = 0; i < 3; i++) box(x0, y - 0.16 + i * 0.11, x1, y - 0.07 + i * 0.11, 0.3, 0.36, "#c08a55");
  for (let i = 0; i < 2; i++) box(x0, y - 0.2, x1, y - 0.15, 0.45 + i * 0.15, 0.55 + i * 0.15, "#b07a47");
}
function plantDraw(p) { const { cx, cy } = B(p); ao(cx - 0.25, cy - 0.25, cx + 0.25, cy + 0.25, 0.1, 0.2); shrub(cx, cy, 1.25); }
function truckStatic(p) {
  const { X0, X1, Y0, Y1 } = B(p), a0 = X0 + 0.2, a1 = X1 - 0.2, b0 = Y0 + 0.25, b1 = Y1 - 0.25;
  const trailer = REGION === "desert" ? "#ece6d8" : "#e3e9ee";
  castShadow(a0, b0, a1, b1, 2.4); ao(a0, b0, a1, b1, 0.2, 0.25);
  for (const x of [a0 + 0.55, a0 + 1.25, a1 - 2.7, a1 - 0.55]) for (const y of [b0, b1]) { ell(x, y, 0.3, 0.3, 0.3, col("#1e1f22")); }
  box(a0, b0, a1 - 2.0, b1, 0.38, 2.25, trailer);
  for (let x = a0 + 0.4; x < a1 - 2.1; x += 0.5) faceRect("s", x, x + 0.03, b1, 0.42, 2.2, "rgba(40,50,60,.1)");
  faceRect("s", a0 + 0.2, a1 - 2.2, b1, 0.95, 1.4, col("#d9534f"));
  faceText("s", "ECHO LOGISTICS", a0 + 0.4, a1 - 2.4, b1, 1.5, 2.05, null, col("#3d7fc0"));
  box(a0, b0 + 0.1, a1 - 2.0, b1 - 0.1, 0.25, 0.38, "#4a4d52");
  // หัวรถ: กระโปรงยาว + ห้องโดยสาร + กระจก + ปล่องไอเสีย
  box(a1 - 1.95, b0 + 0.05, a1 - 0.9, b1 - 0.05, 0.38, 2.0, "#d9534f");
  box(a1 - 0.9, b0 + 0.12, a1, b1 - 0.12, 0.38, 1.25, "#c9433c");
  faceRect("e", b0 + 0.2, b1 - 0.2, a1, 0.55, 0.95, col("#c9d0d6"));
  box(a1 - 1.4, b0 + 0.1, a1 - 0.9, b1 - 0.1, 1.25, 1.9, "#9fd3f0", NIGHT ? { front: "#3a4a6a" } : {});
  win("s", a1 - 1.85, a1 - 1.25, b1 - 0.05, 1.2, 1.8, { panes: 1, sill: false });
  post(a1 - 1.98, b0 + 0.15, 1.1, 0.07, "#c9d0d6", 1.6);
  for (const x of [a1 - 1.6, a1 - 0.4]) for (const y of [b1]) { const [sx, sy, s] = P(x, y + 0.01, 0.3); G.fillStyle = col("#1e1f22"); G.beginPath(); G.arc(sx, sy, 0.3 * s, 0, TAU); G.fill(); G.fillStyle = col("#c9d0d6"); G.beginPath(); G.arc(sx, sy, 0.14 * s, 0, TAU); G.fill(); }
  if (NIGHT) glowAt(a1 + 0.1, (b0 + b1) / 2, 0.6, 1.4, "255,240,190", 0.5);
}
function towerStatic(p) {
  const { cx, cy } = B(p), g = G;
  castShadow(cx - 0.7, cy - 0.7, cx + 0.7, cy + 0.7, 4.5, 0.1); ao(cx - 0.8, cy - 0.8, cx + 0.8, cy + 0.8, 0.15, 0.2);
  for (const [dx, dy] of [[-0.62, -0.62], [0.62, -0.62], [-0.62, 0.62], [0.62, 0.62]]) { box(cx + dx - 0.1, cy + dy - 0.1, cx + dx + 0.1, cy + dy + 0.1, 0, 0.2, "#c9c4b8"); line3([cx + dx, cy + dy, 0.2], [cx + dx * 0.6, cy + dy * 0.6, 3.2], "#8a7258", 0.07); }
  for (const z of [1.2, 2.3]) { const k = 1 - z / 3.2 * 0.4; line3([cx - 0.62 * k, cy + 0.62 * k, z], [cx + 0.62 * k, cy + 0.62 * k, z], "#8a7258", 0.04); line3([cx + 0.62 * k, cy - 0.62 * k, z], [cx + 0.62 * k, cy + 0.62 * k, z], "#7a6248", 0.04); }
  const r = 0.78, z0 = 3.2, z1 = 4.6, [a, ya, s] = P(cx, cy, z0), [, b] = P(cx, cy, z1), w = r * s;
  const tank = REGION === "desert" ? "#c9a274" : "#9fb4c4";
  const gr = g.createLinearGradient(a - w, 0, a + w, 0); gr.addColorStop(0, col(tank, 0.8)); gr.addColorStop(0.45, col(tank, 1.12)); gr.addColorStop(1, col(tank, 0.72));
  g.fillStyle = gr; g.fillRect(a - w, b, w * 2, ya - b);
  for (let i = 1; i < 4; i++) { g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(a - w, b + (ya - b) * i / 4, w * 2, 1.2); }
  ell(cx, cy, z0, r, r * 0.9, col(tank, 0.75));
  const [tx, ty] = P(cx, cy, z1 + 0.7); g.fillStyle = col("#7a6050"); g.beginPath(); g.moveTo(a - w * 1.08, b); g.lineTo(tx, ty); g.lineTo(a + w * 1.08, b); g.closePath(); g.fill();
  g.fillStyle = col("#8a7060"); g.beginPath(); g.moveTo(a, b); g.lineTo(tx, ty); g.lineTo(a + w * 1.08, b); g.closePath(); g.fill();
  faceText("s", "ECHO", cx - 0.6, cx + 0.6, cy + 0.7, z0 + 0.4, z0 + 1.0, null, col("#3d7fc0"));
}
function lanternsAir(p) {
  const { X0, X1, Y0, Y1 } = B(p), g = G, rows = [Y0 + 0.5, Y0 + 1.5, Y1 - 0.5].filter((v, i, a) => a.indexOf(v) === i);
  for (const x of [X0 + 0.1, X1 - 0.1]) for (const y of [Y0 + 0.2, Y1 - 0.2]) post(x, y, 2.7, 0.07, "#5a3a22");
  rows.forEach((y, ri) => {
    const pts = [];
    for (let i = 0; i <= 20; i++) { const u = i / 20, x = X0 + 0.1 + u * (X1 - X0 - 0.2), z = 2.6 - Math.sin(u * Math.PI) * 0.35 + Math.sin(NOW / 900 + ri) * 0.02; pts.push(P(x, y, z)); }
    g.strokeStyle = col("#3a2a20"); g.lineWidth = 1.2; g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke();
    for (let i = 1; i < 20; i += 2) {
      const u = i / 20, x = X0 + 0.1 + u * (X1 - X0 - 0.2), z = 2.6 - Math.sin(u * Math.PI) * 0.35 - 0.15 + Math.sin(NOW / 700 + i + ri) * 0.03;
      const c = ["#ff5a5a", "#ffb23f", "#ff6fa8", "#ffd23f"][(i + ri) % 4], [sx, sy, s] = P(x, y, z);
      if (NIGHT) glowAt(x, y, z, 0.55, "255,170,90", 0.45 * flicker(i + ri * 3));
      g.fillStyle = col(c, 1, NIGHT); g.beginPath(); g.ellipse(sx, sy, 0.12 * s, 0.15 * s, 0, 0, TAU); g.fill();
      g.strokeStyle = "rgba(90,30,20,.35)"; g.lineWidth = 1; g.beginPath(); g.ellipse(sx, sy, 0.05 * s, 0.15 * s, 0, 0, TAU); g.stroke();
      g.fillStyle = "#3a2a20"; g.fillRect(sx - 0.06 * s, sy - 0.17 * s, 0.12 * s, 0.04 * s); g.fillRect(sx - 0.06 * s, sy + 0.13 * s, 0.12 * s, 0.04 * s);
    }
  });
}
// ---------- แผงอาหาร (ตลาดนัด): เคาน์เตอร์ + หลังคาผ้า + ป้าย + ของบนเคาน์เตอร์
const STALL = { noodle: ["#d9342c", "ก๋วยเตี๋ยว", "#f6efe0"], grill: ["#e8762b", "ปิ้งย่าง", "#7a4a2a"], sweets: ["#ff6fa8", "ขนม", "#ffd23f"], drinks: ["#3d9fd9", "น้ำ", "#9fe0ff"] };
function stallDraw(p) {
  const { X0, X1, Y0, Y1, cx } = B(p), [c, name, food] = STALL[p.style] || STALL.noodle;
  const a0 = X0 + 0.12, a1 = X1 - 0.12, b0 = Y0 + 0.2, b1 = Y1 - 0.18;
  castShadow(a0, b0, a1, b1, 2.0, 0.1); ao(a0, b0, a1, b1, 0.15, 0.24);
  box(a0, b0 + 0.25, a1, b1, 0, 0.9, "#a87545");
  for (let x = a0 + 0.1; x < a1; x += 0.2) faceRect("s", x, x + 0.02, b1, 0.05, 0.86, "rgba(60,30,10,.16)");
  box(a0 - 0.04, b0 + 0.21, a1 + 0.04, b1 + 0.04, 0.9, 0.98, "#7a4a2a");
  faceRect("s", a0 + 0.08, a1 - 0.08, b1, 0.5, 0.82, col(c));
  for (let i = 0; i < 4; i++) {
    const x = a0 + 0.28 + i * (a1 - a0 - 0.56) / 3, y = b0 + 0.6;
    if (p.style === "drinks") { box(x - 0.07, y - 0.07, x + 0.07, y + 0.07, 0.98, 1.25, food, { lit: NIGHT }); box(x - 0.08, y - 0.08, x + 0.08, y + 0.08, 1.25, 1.28, "#ffffff"); }
    else if (p.style === "grill") { line3([x - 0.12, y, 1.02], [x + 0.12, y, 1.02], "#7a4a2a", 0.05); ball(x - 0.05, y, 1.04, 0.035, "#c4604a"); ball(x + 0.04, y, 1.04, 0.035, "#e8b04a"); }
    else { ell(x, y, 0.99, 0.13, 0.1, col("#f7f5f0")); ell(x, y, 1.0, 0.09, 0.07, col(food)); }
  }
  for (const x of [a0 + 0.04, a1 - 0.04]) for (const y of [b0 + 0.25, b1 - 0.04]) post(x, y, 2.0, 0.05, "#5a3a22", 0.9);
  // หลังคาผ้าลายทาง มีความหนา + ชายหยัก
  const n = 6, w = (a1 - a0 + 0.24) / n;
  for (let i = 0; i < n; i++) { const x0 = a0 - 0.12 + i * w, x1 = x0 + w; poly([[x0, b0, 2.15], [x1, b0, 2.15], [x1, b1 + 0.28, 1.82], [x0, b1 + 0.28, 1.82]], col(i % 2 ? c : "#ffffff"), LINE); poly([[x0, b1 + 0.28, 1.82], [x1, b1 + 0.28, 1.82], [x1, b1 + 0.28, 1.7], [(x0 + x1) / 2, b1 + 0.28, 1.62], [x0, b1 + 0.28, 1.7]], col(i % 2 ? c : "#ffffff", 0.88)); }
  signBox("s", name, a0 + 0.12, a1 - 0.12, b1 + 0.02, 1.32, 1.6, c, "#ffffff", 0.05);
  const k = actK(p.id, 1800);
  if (!LOWQ && Math.random() < (k != null ? 0.5 : 0.06)) emit({ x: a0 + 0.3 + Math.random() * (a1 - a0 - 0.6), y: b0 + 0.6, z: 1.1, vz: 0.5, vx: 0.1, smoke: true, dur: 1.4 });
  if (NIGHT) { post(cx, b1 + 0.1, 0.12, 0.06, "#2d333b", 1.62); glowAt(cx, b1 + 0.2, 1.5, 1.3, "255,210,140", 0.4); }
}
// ---------- โมเต็ล: ห้องเรียงแถว (ประตูเลข · หน้าต่างม่าน · แอร์) + ชายคาทางเดินมีเสา · สำนักงาน = ล็อบบี้กระจก
function motelStatic(p) {
  const { X0, X1, Y0, Y1 } = B(p), office = p.style === "office";
  const a0 = X0 + 0.15, a1 = X1 - 0.15, b0 = Y0 + 0.15, b1 = Y1 - 0.75, H = office ? 2.45 : 2.25;
  const wall = office ? "#f3e2c4" : "#f2d9b8", trim = "#2f7f8a";
  building(a0, b0, a1, b1, H, { wall, trim, base: "#b98a5a", roof: "#e9e4da", roofTh: 0.22 });
  // ชายคายื่นคลุมทางเดินหน้าห้อง + เสา
  box(a0 - 0.05, b1, a1 + 0.05, b1 + 0.6, H - 0.12, H + 0.02, trim);
  for (let x = a0 + 0.15; x <= a1 - 0.1; x += office ? (a1 - a0 - 0.3) : 1.6) post(x, b1 + 0.52, H - 0.12, 0.08, "#f7f5f0");
  poly([[a0, b1, 0.004], [a1, b1, 0.004], [a1, b1 + 0.6, 0.004], [a0, b1 + 0.6, 0.004]], col("#d8cdb8"));
  if (office) {
    win("s", a0 + 0.3, a1 - 1.2, b1, 0.3, 1.9, { panes: 3, litCol: "#ffe0a0" });
    door("s", a1 - 1.05, a1 - 0.45, b1, 1.9, { glass: true });
    signBox("s", "สำนักงาน", a0 + 0.3, a1 - 0.3, b1 + 0.6, H - 0.1, H + 0.32, "#2f7f8a", "#ffe9a8", 0.06);
    win("e", b0 + 0.35, b1 - 0.35, a1, 0.8, 1.7, { panes: 2 });
    return;
  }
  const n = Math.floor((a1 - a0) / 1.6);
  for (let i = 0; i < n; i++) {
    const x = a0 + 0.3 + i * 1.6;
    door("s", x, x + 0.5, b1, 1.6, { col: i % 2 ? "#c0504d" : "#d26a4a" });
    faceText("s", String(i + 1), x + 0.12, x + 0.38, b1, 1.3, 1.5, null, "#fff4d0");
    const lit = NIGHT && rng(i * 31 + 7)() < 0.55;
    win("s", x + 0.7, x + 1.35, b1, 0.8, 1.55, { panes: 2, dark: !lit, inside: (g0, g1, h0, h1) => { faceRect("s", g0, g0 + (g1 - g0) * 0.28, b1, h0, h1, col("#e8b4b4")); faceRect("s", g1 - (g1 - g0) * 0.28, g1, b1, h0, h1, col("#e8b4b4")); } });
    box(x + 0.78, b1, x + 1.05, b1 + 0.2, 0.42, 0.68, "#d4d8dc"); // แอร์
  }
  win("w", b0 + 0.35, b1 - 0.35, a0, 0.8, 1.6, { panes: 2 });
  win("e", b0 + 0.35, b1 - 0.35, a1, 0.8, 1.6, { panes: 2 });
}
// ---------- สระว่ายน้ำ (พื้นกระเบื้อง + ขอบ + น้ำไล่สี + ลายแสง + บันได + ห่วงยาง)
function poolDraw(p) {
  const { X0, X1, Y0, Y1, cx, cy } = B(p), g = G, k = actK(p.id, 1500);
  const rect = (x0, y0, x1, y1, z, f, s) => poly([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], f, s);
  rect(X0, Y0, X1, Y1, 0.02, col("#ece6d8"), LINE);
  for (let x = X0 + 0.5; x < X1; x += 0.5) line3([x, Y0, 0.021], [x, Y1, 0.021], "rgba(150,140,120,.25)", 0.01);
  for (let y = Y0 + 0.5; y < Y1; y += 0.5) line3([X0, y, 0.021], [X1, y, 0.021], "rgba(150,140,120,.25)", 0.01);
  rect(X0 + 0.25, Y0 + 0.25, X1 - 0.25, Y1 - 0.25, 0.03, col("#ffffff"), LINE);
  rect(X0 + 0.35, Y0 + 0.35, X1 - 0.35, Y1 - 0.35, 0.032, col("#2a95cc", 1, false));
  rect(X0 + 0.35, Y0 + 0.35, X1 - 0.35, Y0 + 0.55, 0.033, col("#1e7fb4", 1, false));
  rect(X0 + 0.5, Y0 + 0.65, X1 - 0.5, Y1 - 0.45, 0.034, col("#45b8e6", 1, false));
  for (let i = 0; i < 8; i++) { const ph = NOW / 1600 + i * 0.9, x = X0 + 0.6 + ((i * 0.83 + Math.sin(ph) * 0.2) % (X1 - X0 - 1.3)), y = Y0 + 0.7 + ((i * 0.57) % (Y1 - Y0 - 1.3)); g.strokeStyle = NIGHT ? "rgba(150,220,255,.45)" : "rgba(255,255,255,.6)"; g.lineWidth = 1.2; const a = P(x, y, 0.04), b = P(x + 0.4, y + Math.sin(ph) * 0.1, 0.04); g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2, a[1] - 3, b[0], b[1]); g.stroke(); }
  if (NIGHT) glowAt(cx, cy, 0.1, 2.2, "80,200,255", 0.4);
  const [rx, ry, s] = P(cx + 0.7 + Math.sin(NOW / 1400) * 0.15, cy, 0.05 + (k != null ? Math.abs(Math.sin(k * 12)) * 0.1 : 0));
  g.strokeStyle = col("#ff6fa8"); g.lineWidth = Math.max(2, 0.1 * s); g.beginPath(); g.ellipse(rx, ry, 0.25 * s, 0.15 * s, 0, 0, TAU); g.stroke();
  g.strokeStyle = col("#ffffff"); g.lineWidth = Math.max(1, 0.1 * s); g.setLineDash([0.12 * s, 0.25 * s]); g.beginPath(); g.ellipse(rx, ry, 0.25 * s, 0.15 * s, 0, 0, TAU); g.stroke(); g.setLineDash([]);
  for (const dx of [-0.15, 0.15]) { line3([X0 + 1.2 + dx, Y0 + 0.3, 0.03], [X0 + 1.2 + dx, Y0 + 0.3, 0.6], "#c9d0d6", 0.03); line3([X0 + 1.2 + dx, Y0 + 0.3, 0.6], [X0 + 1.2 + dx, Y0 + 0.15, 0.6], "#c9d0d6", 0.03); }
}
function loungerDraw(p) {
  const { cx, cy } = B(p);
  ao(cx - 0.38, cy - 0.22, cx + 0.42, cy + 0.22, 0.08, 0.2);
  box(cx - 0.35, cy - 0.2, cx + 0.2, cy + 0.2, 0.15, 0.24, "#f7f5f0");
  for (const x of [cx - 0.3, cx + 0.15]) post(x, cy + 0.18, 0.15, 0.04, "#c9d0d6");
  poly([[cx + 0.2, cy - 0.2, 0.24], [cx + 0.2, cy + 0.2, 0.24], [cx + 0.42, cy + 0.2, 0.58], [cx + 0.42, cy - 0.2, 0.58]], col("#5aa0e0"), LINE);
  poly([[cx - 0.33, cy - 0.17, 0.245], [cx + 0.18, cy - 0.17, 0.245], [cx + 0.18, cy + 0.17, 0.245], [cx - 0.33, cy + 0.17, 0.245]], col("#7ab8ec"));
  post(cx - 0.3, cy - 0.25, 1.5, 0.04, "#c9d0d6");
  const [ux, uy, s] = P(cx - 0.3, cy - 0.25, 1.55);
  for (let i = 0; i < 6; i++) { G.fillStyle = col(i % 2 ? "#ffffff" : "#ffd23f"); G.beginPath(); G.moveTo(ux, uy - 0.05 * s); G.ellipse(ux, uy + 0.1 * s, 0.6 * s, 0.25 * s, 0, Math.PI + i * Math.PI / 6, Math.PI + (i + 1) * Math.PI / 6); G.closePath(); G.fill(); }
}
function bbqDraw(p) {
  const { cx, cy } = B(p), k = actK(p.id, 2500);
  ao(cx - 0.3, cy - 0.3, cx + 0.3, cy + 0.3, 0.12, 0.22);
  for (const [dx, dy] of [[-0.2, -0.12], [0.2, -0.12], [0, 0.22]]) line3([cx + dx, cy + dy, 0], [cx, cy, 0.6], "#2d333b", 0.04);
  ell(cx, cy, 0.55, 0.34, 0.31, col("#1e1f22")); ell(cx, cy, 0.62, 0.3, 0.27, col("#2d333b"));
  ell(cx, cy, 0.68, 0.27, 0.24, col(k != null ? "#ff7a30" : "#7a3a20", 1, k != null));
  for (let i = -2; i <= 2; i++) line3([cx + i * 0.09, cy - 0.22, 0.7], [cx + i * 0.09, cy + 0.22, 0.7], "#9aa1a8", 0.012);
  ball(cx - 0.08, cy, 0.73, 0.05, "#c4604a"); ball(cx + 0.09, cy + 0.05, 0.73, 0.045, "#e8b04a");
  box(cx + 0.3, cy - 0.15, cx + 0.62, cy + 0.15, 0, 0.55, "#8a6a4a"); // โต๊ะข้าง
  if (k != null) glowAt(cx, cy, 0.7, 0.8, "255,140,40", 0.6);
  if (!LOWQ && Math.random() < (k != null ? 0.5 : 0.08)) emit({ x: cx, y: cy, z: 0.8, vz: 0.5, vx: 0.12, smoke: true, dur: 1.6 });
}
function vendingDraw(p) {
  const { cx, cy } = B(p), x0 = cx - 0.36, x1 = cx + 0.36, y0 = cy - 0.3, y1 = cy + 0.28;
  ao(x0, y0, x1, y1, 0.12, 0.25);
  box(x0, y0, x1, y1, 0, 1.75, "#d9342c");
  box(x0 - 0.02, y0 - 0.02, x1 + 0.02, y1 + 0.02, 1.75, 1.82, "#b02a24");
  faceRect("s", x0 + 0.06, x0 + 0.52, y1, 0.55, 1.6, NIGHT ? "#fff6d8" : col("#e8f6ff"));
  for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) faceRect("s", x0 + 0.1 + i * 0.14, x0 + 0.19 + i * 0.14, y1 + 0.002, 0.62 + r * 0.24, 0.8 + r * 0.24, col(PRIZE[(r * 3 + i) % 5], 1, NIGHT));
  faceRect("s", x0 + 0.56, x1 - 0.06, y1, 1.1, 1.5, col("#2d333b")); faceRect("s", x0 + 0.58, x1 - 0.08, y1 + 0.002, 1.35, 1.45, "#7dffcf");
  for (let i = 0; i < 3; i++) faceRect("s", x0 + 0.59 + i * 0.04, x0 + 0.61 + i * 0.04, y1 + 0.002, 1.15, 1.3, col("#c9d0d6"));
  faceRect("s", x0 + 0.1, x0 + 0.5, y1, 0.15, 0.36, col("#1e1f22"));
  faceText("s", "น้ำเย็น", x0 + 0.06, x1 - 0.06, y1, 1.6, 1.74, null, "#ffffff");
  if (NIGHT) glowAt(cx, y1 + 0.15, 1.0, 1.1, "255,240,210", 0.5);
}
function signStatic(p) {
  const { cx, cy } = B(p);
  castShadow(cx - 0.2, cy - 0.2, cx + 0.2, cy + 0.2, 4.4, 0.1); ao(cx - 0.25, cy - 0.25, cx + 0.25, cy + 0.25, 0.12, 0.25);
  box(cx - 0.25, cy - 0.25, cx + 0.25, cy + 0.25, 0, 0.3, "#c9c4b8");
  post(cx, cy, 3.0, 0.16, "#5c636b", 0.3);
  box(cx - 0.85, cy - 0.12, cx + 0.85, cy + 0.12, 3.2, 4.45, "#2f7f8a");
  faceRect("s", cx - 0.78, cx + 0.78, cy + 0.12, 3.27, 4.38, col("#1f5f68"));
  faceText("s", "โรงแรม", cx - 0.72, cx + 0.72, cy + 0.12, 3.8, 4.32, null, NIGHT ? "#ff9ad5" : "#ffe9a8");
  faceText("s", "★ ★ ★", cx - 0.6, cx + 0.6, cy + 0.12, 3.32, 3.7, null, "#ffd23f");
  // ลูกศรไฟ (ตกแต่ง)
  for (let i = 0; i < 6; i++) ball(cx - 0.75 + i * 0.3, cy + 0.14, 4.5, 0.05, i % 2 ? "#ffd23f" : "#ff9ad5", NIGHT);
}
function signLive(p) { if (NIGHT) { const { cx, cy } = B(p); glowAt(cx, cy + 0.15, 3.9, 1.6, "255,110,190", 0.45 * flicker(11)); } }

// ภายในรถตู้บนถนน (RT_ONVAN): เบาะ ตู้เย็น เสื่อ — เตี้ย ไม่บังตัวละคร
function seatDraw(p) {
  const { cx, cy } = B(p), drv = p.style === "driver";
  box(cx - 0.3, cy - 0.3, cx + 0.15, cy + 0.3, 0.05, 0.3, drv ? "#3a3f48" : "#c4604a");
  box(cx + 0.15, cy - 0.3, cx + 0.32, cy + 0.3, 0.05, 0.75, drv ? "#2d333b" : "#a84f3c");
  if (drv) { const [sx, sy, s] = P(cx + 0.45, cy, 0.85); G.strokeStyle = col("#1e1f22"); G.lineWidth = Math.max(2, 0.06 * s); G.beginPath(); G.ellipse(sx, sy, 0.18 * s, 0.22 * s, 0, 0, TAU); G.stroke(); }
}
function fridgeDraw(p) { const { cx, cy } = B(p); box(cx - 0.32, cy - 0.35, cx + 0.32, cy - 0.05, 0.05, 0.85, "#e8eef3"); faceRect("s", cx - 0.25, cx + 0.25, cy - 0.05, 0.6, 0.64, col("#9aa8bc")); }
// ช่องซันรูฟ (hatchTile — ขึ้นหลังคา/ป้อมปืน): ฝาเหล็กเหลี่ยม ขอบเหลืองดำ หมุดมุม มือจับ + ลูกศรขึ้นจางๆ
function matDraw(p) {
  const { cx, cy } = B(p), z = 0.33, r = 0.36;
  poly([[cx - r, cy - r, z], [cx + r, cy - r, z], [cx + r, cy + r, z], [cx - r, cy + r, z]], col("#2d333b"), LINE);
  for (let i = 0; i < 8; i++) { const t0 = i / 8, t1 = (i + 0.5) / 8; poly([[cx - r + 2 * r * t0, cy + r, z + 0.001], [cx - r + 2 * r * t1, cy + r, z + 0.001], [cx - r + 2 * r * t1, cy + r - 0.07, z + 0.001], [cx - r + 2 * r * t0, cy + r - 0.07, z + 0.001]], col("#ffd23f")); }
  const q = 0.27; poly([[cx - q, cy - q, z + 0.002], [cx + q, cy - q, z + 0.002], [cx + q, cy + q - 0.07, z + 0.002], [cx - q, cy + q - 0.07, z + 0.002]], col("#8c949c"));
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ball(cx + dx * 0.22, cy + dy * 0.18, z + 0.01, 0.025, "#c9d0d6");
  line3([cx - 0.1, cy, z + 0.02], [cx + 0.1, cy, z + 0.02], "#2d333b", 0.04);
  const bob = Math.sin(NOW / 400) * 0.04, [sx, sy, s] = P(cx, cy, z + 0.25 + bob);
  G.fillStyle = "rgba(255,210,63,.55)"; G.beginPath(); G.moveTo(sx, sy - s * 0.12); G.lineTo(sx + s * 0.09, sy); G.lineTo(sx - s * 0.09, sy); G.fill();
}
// ช่องหน้าต่าง (windowTiles — ตีออกนอกรถได้ไกล): กรอบหน้าต่างบนพื้นชิดผนัง + ลูกศรชี้ออก
function windowDecals(def) {
  const v = vanBounds(def), z = 0.315;
  for (const [x, y] of def.windowTiles || []) {
    const side = y <= v.y0 ? -1 : y >= v.y1 - 1 ? 1 : 0; if (!side) continue;
    const ey = side < 0 ? y + 0.08 : y + 0.92, iy = side < 0 ? y + 0.34 : y + 0.66;
    poly([[x + 0.18, ey, z], [x + 0.82, ey, z], [x + 0.82, iy, z], [x + 0.18, iy, z]], NIGHT ? "rgba(140,190,255,.35)" : "rgba(120,190,240,.38)", "rgba(255,255,255,.55)");
    line3([x + 0.5, ey, z], [x + 0.5, iy, z], "rgba(255,255,255,.55)", 0.012);
    const ay = side < 0 ? y + 0.5 : y + 0.5, ty = ay + side * 0.16, [ax, aY] = P(x + 0.5, ay, z), [bx, bY] = P(x + 0.5, ty, z), [lx, lY] = P(x + 0.38, ay + side * 0.04, z), [rx, rY] = P(x + 0.62, ay + side * 0.04, z);
    G.strokeStyle = "rgba(255,255,255,.6)"; G.lineWidth = 1.6; G.beginPath(); G.moveTo(lx, lY); G.lineTo(bx, bY); G.lineTo(rx, rY); G.stroke(); void ax; void aY;
  }
}

// ---------------------------------------------------------------- รถตู้ (จอด / บนถนน)
function vanLook() {
  const v = rtState().van || {};
  return { paint: typeof v.paint === "string" && /^#[0-9a-f]{6}$/i.test(v.paint) ? v.paint : "#7fb8d8", plate: String(v.plate || "ECHO").slice(0, 9), style: v.style || "normal", rearOpen: !!v.rearOpen };
}
function parkedVan(vb) {
  const L = vanLook(), x0 = vb.x0 + 0.15, x1 = vb.x1 + 0.85, y0 = vb.y0 + 0.25, y1 = vb.y1 + 0.75, my = (y0 + y1) / 2;
  shadowAt((x0 + x1) / 2, my, (x1 - x0) / 2 + 0.1, (y1 - y0) / 2 + 0.05);
  for (const x of [x0 + 0.7, x1 - 0.7]) for (const y of [y0, y1]) ell(x, y, 0.28, 0.3, 0.3, col("#1e1f22"));
  box(x0, y0, x1, y1, 0.25, 0.95, L.paint);
  box(x0 + 0.05, y0, x1 - 0.55, y1, 0.95, 1.75, "#f6efe0", { top: col("#fbf6ea") });
  poly([[x1 - 0.55, y0, 0.95], [x1, y0, 0.95], [x1, y1, 0.95], [x1 - 0.55, y1, 0.95]], col(L.paint, 1.08)); // ฝากระโปรง
  if (faceVisible(1, 0, x1 - 0.55, my)) poly([[x1 - 0.55, y1, 0.95], [x1 - 0.55, y0, 0.95], [x1 - 0.55, y0, 1.7], [x1 - 0.55, y1, 1.7]], NIGHT ? "#3a4a6a" : "#2f4a5e"); // กระจกหน้า
  faceRect("s", x0 + 0.05, x1 - 0.55, y1, 0.93, 0.99, col("#d9dde2"));
  for (let i = 0; i < 3; i++) { const a = x0 + 0.3 + i * (x1 - x0 - 1.0) / 3; faceRect("s", a, a + (x1 - x0 - 1.0) / 3 - 0.15, y1, 1.08, 1.6, NIGHT ? "#ffe0a0" : "#2f4a5e"); }
  faceText("s", L.plate, x0 + 0.1, x0 + 1.3, y1, 0.35, 0.6, "#f7f5f0", "#1f2a33");
  if (faceVisible(-1, 0, x0, my)) faceText("w", L.plate, y0 + 0.4, y1 - 0.4, x0, 0.4, 0.62, null, "#1f2a33");
  for (const x of [x0 + 0.7, x1 - 0.7]) { const [sx, sy, s] = P(x, y1 + 0.01, 0.3); G.fillStyle = col("#1e1f22"); G.beginPath(); G.arc(sx, sy, 0.3 * s, 0, TAU); G.fill(); G.fillStyle = col("#f4f1ea"); G.beginPath(); G.arc(sx, sy, 0.16 * s, 0, TAU); G.fill(); }
  if (NIGHT) { glowAt(x1 + 0.2, y0 + 0.4, 0.6, 1.1, "255,246,200", 0.6); glowAt(x1 + 0.2, y1 - 0.4, 0.6, 1.1, "255,246,200", 0.6); }
  ball(x1 + 0.02, y1 - 0.35, 0.7, 0.08, NIGHT ? "#fff6c8" : "#fff2d0", NIGHT);
  if (L.style === "goofy") ball((x0 + x1) / 2 - 0.3, my, 1.95, 0.25, "#ffd23f");
  if (L.style === "cool") box(x0 + 0.1, y0 + 0.2, x0 + 0.5, y1 - 0.2, 1.75, 1.95, "#2d333b");
}
// ห้องในรถตู้ (RT_ONVAN): ส่วนไกล (พื้น/ผนังไกล/ห้องคนขับ) วาดก่อนตัวละคร · ผนังใกล้วาดหลัง (กระจกโปร่ง)
function vanBounds(def) {
  const t = def.vanTiles; let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
  for (const [x, y] of t) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}
function vanFloor(def) {
  const v = vanBounds(def), L = vanLook(), bob = Math.sin(NOW / 160) * 0.012;
  shadowAt((v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2 + 0.1, (v.x1 - v.x0) / 2 + 0.5, (v.y1 - v.y0) / 2 + 0.3);
  for (const x of [v.x0 + 1, v.x1 - 1.2]) for (const y of [v.y0 - 0.05, v.y1 + 0.05]) { const sp = (NOW / 60) % TAU, [sx, sy, s] = P(x, y, 0.3); G.fillStyle = col("#1e1f22"); G.beginPath(); G.arc(sx, sy, 0.3 * s, 0, TAU); G.fill(); G.strokeStyle = col("#9aa0a8"); G.lineWidth = 1.5; G.beginPath(); G.moveTo(sx + Math.cos(sp) * 0.2 * s, sy + Math.sin(sp) * 0.2 * s); G.lineTo(sx - Math.cos(sp) * 0.2 * s, sy - Math.sin(sp) * 0.2 * s); G.stroke(); }
  box(v.x0 - 0.15, v.y0 - 0.15, v.x1 + 0.15, v.y1 + 0.15, 0.2, 0.3 + bob, L.paint);
  poly([[v.x0, v.y0, 0.31 + bob], [v.x1, v.y0, 0.31 + bob], [v.x1, v.y1, 0.31 + bob], [v.x0, v.y1, 0.31 + bob]], col("#c9b48e"));
  G.strokeStyle = "rgba(90,60,30,.25)"; G.lineWidth = 1;
  for (let x = v.x0; x <= v.x1; x += 0.5) { const a = P(x, v.y0, 0.31), b = P(x, v.y1, 0.31); G.beginPath(); G.moveTo(a[0], a[1]); G.lineTo(b[0], b[1]); G.stroke(); }
  windowDecals(def);
  // ฝากระโปรงหน้า + ไฟหน้า
  box(v.x1 + 0.15, v.y0 + 0.1, v.x1 + 0.95, v.y1 - 0.1, 0.25, 0.85 + bob, L.paint);
  if (NIGHT) glowAt(v.x1 + 1.6, (v.y0 + v.y1) / 2, 0.4, 2.4, "255,246,200", 0.5);
}
function vanWall(def, near) {
  const v = vanBounds(def), L = vanLook(), y = near ? v.y1 : v.y0, t = near ? 0.12 : -0.12, bob = Math.sin(NOW / 160) * 0.012;
  const ya = Math.min(y, y + t), yb = Math.max(y, y + t);
  box(v.x0 - 0.15, ya, v.x1 + 0.15, yb, 0.3, 0.85 + bob, L.paint);
  G.globalAlpha = near ? 0.28 : 0.5;
  box(v.x0 - 0.1, ya, v.x1 - 0.6, yb, 0.85, 1.5, NIGHT ? "#5a6a90" : "#bfe6ff", { line: false, lit: true });
  G.globalAlpha = 1;
  for (const x of [v.x0 - 0.1, v.x1 - 0.6, (v.x0 + v.x1) / 2]) post(x, (ya + yb) / 2, 0.65, 0.07, "#f6efe0", 0.85);
  if (near) faceText("s", L.plate, v.x0 - 0.1, v.x0 + 1.5, yb, 0.4, 0.7, "#f7f5f0", "#1f2a33");
}
function vanEnds(def) {
  const v = vanBounds(def), L = vanLook(), bob = Math.sin(NOW / 160) * 0.012;
  // กระจกหน้า (ขวา) + แผงหน้าปัด
  box(v.x1, v.y0 - 0.1, v.x1 + 0.15, v.y1 + 0.1, 0.3, 0.95 + bob, "#2d333b");
  G.globalAlpha = 0.35; box(v.x1 + 0.02, v.y0 - 0.05, v.x1 + 0.12, v.y1 + 0.05, 0.95, 1.6, "#bfe6ff", { line: false, lit: true }); G.globalAlpha = 1;
  // ประตูท้าย (ซ้าย): ปิด = ผนังเตี้ย · เปิด = บานพับกางออกสองข้าง
  if (L.rearOpen) for (const [y, d] of [[v.y0, -1], [v.y1, 1]]) box(v.x0 - 0.75, y + d * 0.05, v.x0 - 0.1, y + d * 0.15, 0.3, 1.3, L.paint);
  else box(v.x0 - 0.15, v.y0 - 0.1, v.x0, v.y1 + 0.1, 0.3, 0.75 + bob, L.paint);
}

// ---------------------------------------------------------------- ตาราง draw ตามชนิด
//  s = ส่วนนิ่ง (อบเป็นภาพ) · l = ส่วนขยับ (วาดสดทับ) · a = วาดทับตัวละคร (หลังคา/สายโคม)
const KIND = {
  mart: { s: martStatic, l: martLive }, garage: { s: garageStatic, l: garageLive }, wash: { l: washDraw }, wc: { s: wcStatic, l: wcLive },
  claw: { l: clawDraw }, gacha: { l: gachaDraw }, arcade: { l: arcadeDraw }, karaoke: { l: karaokeDraw }, dog: { l: dogDraw },
  fortune: { l: fortuneDraw }, spicy: { l: spicyDraw }, pond: { l: pondDraw }, ferris: { l: ferrisDraw }, pump: { l: pumpDraw },
  pillar: { s: pillarDraw }, price: { s: priceStatic, l: (p) => { if (NIGHT) { const { cx, cy } = B(p); glowAt(cx, cy + 0.2, 3.6, 1.5, "125,255,207", 0.35); } } },
  bench: { s: benchDraw }, plant: { l: plantDraw }, truck: { s: truckStatic }, tower: { s: towerStatic }, stall: { l: stallDraw },
  motel: { s: motelStatic, l: (p) => { if (NIGHT) { const { X0, X1, Y1 } = B(p); for (let x = X0 + 0.6; x < X1 - 0.4; x += 1.6) glowAt(x, Y1 - 0.2, 2.0, 0.8, "255,220,150", 0.35); } } },
  pool: { l: poolDraw }, lounger: { l: loungerDraw }, bbq: { l: bbqDraw }, vending: { l: vendingDraw }, neon: { s: signStatic, l: signLive },
  seat: { l: seatDraw }, fridge: { l: fridgeDraw }, mat: { l: matDraw },
  canopy: { a: canopyAir }, lanterns: { a: lanternsAir },
};
// ชนิดเตี้ยที่วาดบนพื้น (ก่อนตัวละครทุกตัว)
const FLAT = new Set(["pond", "pool", "mat"]);

// หลังคาปั๊ม: กรอบหลังคาทึบหนา (ป้ายส้มรอบ) + แผ่นกลางโปร่งแสงพอเห็นตู้น้ำมัน/รถตู้ข้างใต้ (ผู้ใช้สั่งให้เห็นพื้นที่ชัด) + เสาหน้า + ไฟดาวน์ไลต์
function canopyAir(p, units) {
  const { X0, X1, Y0, Y1 } = B(p), x0 = X0 + 0.15, x1 = X1 - 0.15, y0 = Y0 + 0.15, y1 = Y1 - 0.15, z0 = 2.55, z1 = 2.9, e = 0.38;
  const under = units.some((u) => u.rx + 0.5 > X0 && u.rx + 0.5 < X1 && u.ry + 0.5 > Y0 && u.ry + 0.5 < Y1);
  // เสาหน้า 2 ต้น (เสาหลังเป็นวัตถุ pillar บนกระดาน)
  for (const x of [X0 + 0.5, X1 - 0.5]) { box(x - 0.16, Y1 - 0.66, x + 0.16, Y1 - 0.34, 0.18, 0.9, "#ff8a3d"); box(x - 0.13, Y1 - 0.63, x + 0.13, Y1 - 0.37, 0.9, z0, "#f2f0ea"); }
  const fasc = (a0, b0, a1, b1) => {
    box(a0, b0, a1, b1, z0, z1, "#f7f5f0", { top: col("#e2e0da") });
    faceRect("s", a0, a1, b1, z0 + 0.1, z0 + 0.22, col("#ff8a3d", 1, NIGHT)); faceRect("e", b0, b1, a1, z0 + 0.1, z0 + 0.22, col("#ff8a3d", 1, NIGHT)); faceRect("w", b0, b1, a0, z0 + 0.1, z0 + 0.22, col("#ff8a3d", 1, NIGHT));
  };
  const parts = [
    { d: depthOf((x0 + x1) / 2, y0), f: () => fasc(x0, y0, x1, y0 + e) },
    { d: depthOf(x0, (y0 + y1) / 2), f: () => fasc(x0, y0 + e, x0 + e, y1 - e) },
    { d: depthOf(x1, (y0 + y1) / 2), f: () => fasc(x1 - e, y0 + e, x1, y1 - e) },
    { d: depthOf((x0 + x1) / 2, (y0 + y1) / 2), f: () => {
      G.globalAlpha = under ? 0.3 : 0.5;
      poly([[x0 + e, y0 + e, z1 - 0.06], [x1 - e, y0 + e, z1 - 0.06], [x1 - e, y1 - e, z1 - 0.06], [x0 + e, y1 - e, z1 - 0.06]], col("#eef2f4"));
      G.globalAlpha = 1;
      for (let x = x0 + e + 1.2; x < x1 - e; x += 1.2) line3([x, y0 + e, z1 - 0.06], [x, y1 - e, z1 - 0.06], "rgba(160,170,180,.5)", 0.02);
    } },
    { d: depthOf((x0 + x1) / 2, y1) + 0.01, f: () => { fasc(x0, y1 - e, x1, y1); signBox("s", "⛽ ECHO", (X0 + X1) / 2 - 1.3, (X0 + X1) / 2 + 1.3, y1, z0 - 0.02, z1 + 0.04, "#ff8a3d", "#ffffff", 0.05); } },
  ];
  parts.sort((a, b) => a.d - b.d).forEach((q) => q.f());
  if (NIGHT) for (let x = x0 + 1.2; x < x1 - 0.8; x += 2.2) for (let y = y0 + 0.9; y < y1 - 0.5; y += 1.8) { glowAt(x, y, 0.05, 1.3, "255,244,210", 0.22 * flicker(x * 3 + y)); glowAt(x, y, z0 - 0.02, 0.35, "255,250,230", 0.7); }
}

// ---------------------------------------------------------------- สิ่งกีดขวางข้างทาง (ไม่ใช่วัตถุ)
const STANDALONE = new Set(["rt_rock", "rt_tree", "rt_sign", "rt_cone", "rt_wreck", "rt_barrier"]);
export const rtSkipTerrain = (kind) => typeof kind === "string" && kind.startsWith("rt_") && !STANDALONE.has(kind);
export const isRtObstacle = (kind) => STANDALONE.has(kind);
export function drawRtObstacle(g, t, ctx, now) {
  const prev = G; G = g; NOW = now; NIGHT = !!ctx.night; REGION = rtRegionOf(ctx.info || { area: ctx.area });
  try {
    const cx = t.x + 0.5, cy = t.y + 0.5, R = rng(t.x * 31 + t.y * 17 + 3);
    switch (t.kind) {
      case "rt_rock": {
        const [sx, sy, s] = P(cx, cy + 0.05);
        if (REGION === "desert" && R() < 0.6) { shadowAt(cx, cy, 0.35, 0.18); cactusShape(g, sx, sy, s * 0.95, NIGHT); break; }
        if (REGION === "ghost" && R() < 0.5) { shadowAt(cx, cy, 0.3, 0.15); g.fillStyle = col("#8a857a"); g.beginPath(); g.moveTo(sx - s * 0.2, sy); g.lineTo(sx - s * 0.2, sy - s * 0.45); g.arc(sx, sy - s * 0.45, s * 0.2, Math.PI, TAU); g.lineTo(sx + s * 0.2, sy); g.fill(); g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(sx - s * 0.02, sy - s * 0.55, s * 0.04, s * 0.22); g.fillRect(sx - s * 0.09, sy - s * 0.47, s * 0.18, s * 0.04); break; }
        if (REGION === "forest" && R() < 0.5) { shadowAt(cx, cy, 0.35, 0.18); box(cx - 0.25, cy - 0.22, cx + 0.25, cy + 0.22, 0, 0.35, "#7a5634"); ell(cx, cy, 0.351, 0.24, 0.2, col("#c9a274")); break; }
        shadowAt(cx, cy, 0.42, 0.22);
        const base = REGION === "snow" ? "#9aa8bc" : REGION === "desert" ? "#c98d5c" : REGION === "ghost" ? "#7d7868" : "#a9a69c";
        ball(cx + 0.12, cy + 0.05, 0.2, 0.24, base); ball(cx - 0.08, cy - 0.05, 0.3, 0.32, base);
        if (REGION === "snow") { const [qx, qy, qs] = P(cx - 0.08, cy - 0.05, 0.55); g.fillStyle = col("#ffffff", 1, false); g.beginPath(); g.ellipse(qx, qy, qs * 0.26, qs * 0.1, 0, Math.PI, TAU); g.fill(); }
        else if (REGION === "plains" || REGION === "forest") { ell(cx - 0.12, cy - 0.12, 0.58, 0.12, 0.06, col("#7aa75c")); }
        break;
      }
      case "rt_tree": {
        const [sx, sy, s] = P(cx, cy + 0.05);
        if (REGION === "desert") { drawPalm(g, sx, sy, s * 1.1, R() - 0.5, NIGHT); break; }
        if (REGION === "snow") { shadowAt(cx, cy, 0.4, 0.18); pineShape(g, sx, sy, s * 1.25, SNOW_PINE[NIGHT ? "night" : "day"]); break; }
        if (REGION === "forest") { shadowAt(cx, cy, 0.4, 0.18); pineShape(g, sx, sy, s * 1.5, { green: col("#3a6b40"), dark: col("#2c5532"), snow: null, trunk: col("#5a3e2a") }); break; }
        if (REGION === "ghost") { shadowAt(cx, cy, 0.35, 0.15); deadTreeShape(g, sx, sy, s * 1.1, t.x * 13 + t.y, NIGHT, now, null); break; }
        const C = rtPal(REGION, NIGHT);
        drawTree(g, sx, sy, s * 1.25, { c1: NIGHT ? "#2c5a50" : "#8fb878", c2: NIGHT ? "#244b45" : "#7aa765", c3: NIGHT ? "#3d7066" : "#b4d69b", trunk: NIGHT ? "#4a3d33" : "#8b7355", shadow: C.shadow });
        break;
      }
      case "rt_sign": {
        shadowAt(cx, cy, 0.25, 0.12);
        post(cx, cy, 1.7, 0.06, "#9aa0a8");
        const [sx, sy, s] = P(cx, cy, 1.55), r = 0.3 * s;
        g.fillStyle = col("#f2c84b"); g.beginPath(); g.moveTo(sx, sy - r); g.lineTo(sx + r, sy); g.lineTo(sx, sy + r); g.lineTo(sx - r, sy); g.closePath(); g.fill();
        g.strokeStyle = col("#1f2a33"); g.lineWidth = Math.max(1, s * 0.03); g.stroke();
        g.fillStyle = col("#1f2a33"); g.font = `800 ${r * 0.9}px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(REGION === "ghost" ? "☠" : REGION === "snow" ? "❄" : REGION === "desert" ? "🐫" : REGION === "forest" ? "🦌" : "!", sx, sy + 1); g.textBaseline = "alphabetic";
        break;
      }
      case "rt_cone": {
        shadowAt(cx, cy, 0.22, 0.12);
        box(cx - 0.2, cy - 0.2, cx + 0.2, cy + 0.2, 0, 0.06, "#ff7a2b");
        const [bx, by, s] = P(cx, cy, 0.06), [tx, ty] = P(cx, cy, 0.6);
        g.fillStyle = col("#ff7a2b"); g.beginPath(); g.moveTo(bx - 0.15 * s, by); g.lineTo(tx, ty); g.lineTo(bx + 0.15 * s, by); g.closePath(); g.fill();
        g.fillStyle = col("#ffffff"); const m = P(cx, cy, 0.3); g.fillRect(m[0] - 0.08 * s, m[1] - 0.04 * s, 0.16 * s, 0.07 * s);
        if (NIGHT) glowAt(cx, cy, 0.55, 0.4, "255,140,60", 0.4 * flicker(t.x));
        break;
      }
      case "rt_barrier": {
        shadowAt(cx, cy, 0.48, 0.18);
        for (const dx of [-0.38, 0.38]) post(cx + dx, cy, 0.55, 0.06, "#ffffff");
        box(cx - 0.45, cy - 0.06, cx + 0.45, cy + 0.06, 0.35, 0.6, "#ffffff");
        for (let i = 0; i < 4; i++) faceRect("s", cx - 0.42 + i * 0.22, cx - 0.32 + i * 0.22, cy + 0.06, 0.37, 0.58, col("#e0453b"));
        break;
      }
      case "rt_wreck": {
        // รถพัง (คู่ช่องตามแนว x หรือ y — ช่องแรกวาดทั้งคัน · ช่องที่สองข้าม) — ทรงรถเก๋งมน: ตัวถังล่าง ฝากระโปรง/ท้ายลาด ห้องโดยสารกระจกแตก ล้อแบน สนิม ควัน
        const tm = ctx.terrainKind || {};
        if (tm[`${t.x - 1},${t.y}`] === "rt_wreck" || tm[`${t.x},${t.y - 1}`] === "rt_wreck") break;
        const twoX = tm[`${t.x + 1},${t.y}`] === "rt_wreck", twoY = !twoX && tm[`${t.x},${t.y + 1}`] === "rt_wreck";
        const x0 = t.x + 0.08, x1 = t.x + (twoX ? 1.92 : 0.92), y0 = t.y + (twoY ? 0.08 : 0.2), y1 = t.y + (twoY ? 1.92 : 0.8);
        const along = !twoY, L0 = along ? x0 : y0, L1 = along ? x1 : y1, W0 = along ? y0 : x0, W1 = along ? y1 : x1, len = L1 - L0;
        const at = (l, w) => (along ? [l, w] : [w, l]);
        const C0 = ["#8a9eb0", "#b06a5a", "#9aa86a", "#6a7a9a", "#c9b07a"][(t.x * 3 + t.y) % 5];
        const rust = "#7a4a2a", dark = "#1e1f22", glassC = NIGHT ? "#1d2638" : "#2e3c4c";
        const bx = (l0, l1, w0, w1, z0, z1, hex, o) => { const [ax, ay] = at(l0, w0), [bx2, by2] = at(l1, w1); box(Math.min(ax, bx2), Math.min(ay, by2), Math.max(ax, bx2), Math.max(ay, by2), z0, z1, hex, o); };
        const [mcx, mcy] = at((L0 + L1) / 2, (W0 + W1) / 2);
        shadowAt(mcx, mcy, (along ? len : W1 - W0) / 2 + 0.12, (along ? W1 - W0 : len) / 2 + 0.1);
        // ล้อ (ข้างหน้าแบน)
        for (const [l, w, flat] of [[L0 + len * 0.2, W0 + 0.02, false], [L1 - len * 0.2, W0 + 0.02, true], [L0 + len * 0.2, W1 - 0.02, false], [L1 - len * 0.2, W1 - 0.02, true]]) {
          const [wx, wy] = at(l, w);
          ell(wx, wy, 0.15, 0.16, flat ? 0.1 : 0.16, col(dark)); ell(wx, wy, 0.151, 0.08, flat ? 0.05 : 0.08, col("#8a8f96"));
        }
        // ตัวถังล่าง + กันชน
        bx(L0 + 0.04, L1 - 0.04, W0, W1, 0.12, 0.42, C0);
        bx(L0, L0 + 0.06, W0 + 0.05, W1 - 0.05, 0.14, 0.3, "#b8bec6");
        bx(L1 - 0.06, L1, W0 + 0.05, W1 - 0.05, 0.14, 0.3, "#b8bec6");
        // ห้องโดยสาร (ยุบหลังคา เอียงนิด)
        const c0 = L0 + len * 0.3, c1 = L1 - len * 0.26;
        bx(c0, c1, W0 + 0.06, W1 - 0.06, 0.42, 0.72, C0, { front: col(glassC), side: col(glassC, 0.9), side2: col(glassC, 1.1), back: col(glassC, 0.8), top: col(C0, 1.05) });
        // กระจกแตก (เส้นร้าว) + สนิม + ไฟหน้าพัง
        const [g1x, g1y, gs] = P(...at((c0 + c1) / 2, W1 - 0.06), 0.58);
        G.strokeStyle = "rgba(220,235,255,.55)"; G.lineWidth = Math.max(1, gs * 0.012);
        G.beginPath(); for (let k = 0; k < 5; k++) { const an = k * 1.3 + 0.4; G.moveTo(g1x, g1y); G.lineTo(g1x + Math.cos(an) * gs * 0.14, g1y + Math.sin(an) * gs * 0.09); } G.stroke();
        for (const [l, w, r] of [[L0 + len * 0.15, W1, 0.08], [L1 - len * 0.35, W1, 0.06], [L0 + len * 0.6, W0 + (W1 - W0) / 2, 0.1]]) { const [rx, ry] = at(l, w); ell(rx, ry, w === W1 ? 0.3 : 0.425, r, r * 0.7, `rgba(122,74,42,${NIGHT ? 0.35 : 0.5})`); }
        const [hx, hy] = at(L1 - 0.02, W0 + 0.12); ell(hx, hy, 0.32, 0.05, 0.04, col("#fff3c0", 1, true));
        // ควันจากฝากระโปรง
        if (!LOWQ) for (let k = 0; k < 4; k++) {
          const ph = ((NOW / 1600) + k / 4) % 1, [sx2, sy2, ss] = P(...at(L1 - len * 0.15, (W0 + W1) / 2), 0.45 + ph * 1.1);
          G.fillStyle = `rgba(${NIGHT ? "120,125,140" : "90,90,95"},${0.32 * (1 - ph)})`;
          G.beginPath(); G.arc(sx2 + Math.sin(ph * 6 + k) * ss * 0.06, sy2, ss * (0.08 + ph * 0.14), 0, TAU); G.fill();
        }
        if (REGION === "snow") poly([[...at(c0, W0 + 0.06), 0.725], [...at(c1, W0 + 0.06), 0.725], [...at(c1, W1 - 0.06), 0.725], [...at(c0, W1 - 0.06), 0.725]], "#ffffff");
        void rust;
        break;
      }
      default: break;
    }
  } finally { G = prev; }
}

// ---------------------------------------------------------------- ตัวกลางที่ boardDraw เรียก
function begin(g, info, now, lowQ) {
  G = g; NOW = now; LOWQ = !!lowQ; REGION = rtRegionOf(info);
  NIGHT = !!(info.__night);
}
export function rtPropsOf(info) {
  if (info.rtProps && info.rtProps.length) return info.rtProps;
  const d = rtDefOf(info.area);
  return (d && d.props) || [];
}
// ใต้ไฮไลต์: เส้นถนนเลื่อน (บนรถตู้) · รอยเท้า · พื้นรถตู้
export function rtGround(g, info, units, now, lowQ, night) {
  if (!isRtArea(info.area)) return;
  info.__night = !!night;
  begin(g, info, now, lowQ);
  syncFx();
  const def = rtDefOf(info.area);
  if (def && def.rt && def.rt.kind === "onvan") {
    const [r0, r1] = def.rt.road, C = rtPal(REGION, NIGHT), lw = (r1 - r0 + 1) / (def.rt.lanes || 3), off = -(now / 1000) * 7;
    for (let k = 1; k < (def.rt.lanes || 3); k++) dashRow(g, -40, info.cols + 40, r0 + k * lw, C.paint, 0.09, 1.1, 0.9, off);
    // เส้นความเร็วบนถนน + เสาข้างทางวิ่งผ่าน
    if (!lowQ) for (let i = 0; i < 10; i++) {
      const ph = ((now / 700) + i * 0.37) % 1, y = r0 + 0.3 + ((i * 2.71) % (r1 - r0 + 0.4)), x = info.cols + 2 - ph * (info.cols + 6);
      const a = P(x, y, 0.05), b = P(x + 1.6, y, 0.05);
      g.strokeStyle = `rgba(255,255,255,${0.35 * Math.sin(ph * Math.PI)})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    for (const yy of [-0.6, info.rows + 0.4]) for (let i = 0; i < 6; i++) {
      const x = info.cols + 4 - (((now / 1000) * 7 + i * 6) % 36);
      const [bx, by, s] = P(x, yy), [, ty] = P(x, yy, 1.5);
      g.fillStyle = col("#f7f5f0"); g.fillRect(bx - 0.05 * s, ty, 0.1 * s, by - ty);
      g.fillStyle = col("#e0453b"); g.fillRect(bx - 0.05 * s, ty, 0.1 * s, (by - ty) * 0.15);
    }
  }
  drawBossGround(g, now, NIGHT); // ช่องเตือนท่าบอส + รอยแตก/คลื่น/รอยยาง (bossFx.js)
  // รอยเท้าตามทางที่เดิน (จางใน 2.5 วิ)
  for (let i = WALKS.length - 1; i >= 0; i--) {
    const w = WALKS[i], k = (now - w.t0) / 2500;
    if (k > 1) { WALKS.splice(i, 1); continue; }
    w.path.forEach(([x, y], j) => { const a = (1 - k) * Math.min(1, (now - w.t0) / 120 / (j + 1)); if (a <= 0) return; ell(x + 0.5, y + 0.5, 0.01, 0.08, 0.08, `rgba(255,138,61,${0.8 * a})`); });
  }
}
// เรียงความลึกกับตัวละคร
export function rtItems(items, g, info, units, now, lowQ, night) {
  if (!isRtArea(info.area)) return;
  info.__night = !!night;
  begin(g, info, now, lowQ);
  const def = rtDefOf(info.area), props = rtPropsOf(info);
  const uv = units.filter((u) => !u.corpse).map((u) => ({ x: u.rx + 0.5, y: u.ry + 0.5, d: depthOf(u.rx + 0.5, u.ry + 0.5) }));
  const run = (fn) => () => { const pg = G; G = g; NOW = now; try { fn(); } finally { G = pg; } };
  for (const p of props) {
    PROPS_BY_ID.set(String(p.id), p);
    const k = KIND[p.kind];
    if (!k || (!k.s && !k.l)) continue;
    const X0 = p.x0, X1 = p.x1 + 1, Y0 = p.y0, Y1 = p.y1 + 1, cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2;
    if (!onScreen(cx, cy, (p.h || 1) + 1, Math.max(X1 - X0, Y1 - Y0))) continue;
    // ความลึก = ขอบด้านใกล้กล้อง (ตัวที่ยืนหน้าวัตถุวาดทีหลัง · ยืนข้างหลัง/ข้างๆ วาดก่อน)
    const d = FLAT.has(p.kind) ? -1e6 + depthOf(cx, cy) : Math.max(depthOf(X0, Y0), depthOf(X1, Y0), depthOf(X1, Y1), depthOf(X0, Y1)) - 0.02;
    // วัตถุสูงบังตัวที่ยืนข้างหลัง = จาง
    let fade = false;
    if ((p.h || 0) >= 1.4 && !FLAT.has(p.kind)) {
      const [ax] = P(X0, Y1), [bx] = P(X1, Y1), [cx0] = P(X0, Y0), [dx0] = P(X1, Y0), lo = Math.min(ax, bx, cx0, dx0), hi = Math.max(ax, bx, cx0, dx0);
      for (const u of uv) { if (u.d >= d || u.d < d - (Y1 - Y0) - p.h * 0.9) continue; const sx = P(u.x, u.y)[0]; if (sx > lo && sx < hi) { fade = true; break; } }
    }
    const pp = p;
    items.push({ d, f: run(() => {
      if (fade) G.globalAlpha = 0.42;
      if (k.s) spriteDraw(pp, () => k.s(pp), (pp.h || 1) + 1.2);
      if (k.l) k.l(pp);
      G.globalAlpha = 1;
    }) });
  }
  if (def && def.vanBlock) {
    const vb = def.vanBlock, L = vanLook(), pv = { id: `van@${info.area}`, x0: vb.x0, y0: vb.y0, x1: vb.x1, y1: vb.y1, _vanKey: `${L.paint}|${L.plate}|${L.style}` };
    const d = Math.max(depthOf(vb.x0, vb.y0), depthOf(vb.x1 + 1, vb.y0), depthOf(vb.x1 + 1, vb.y1 + 1), depthOf(vb.x0, vb.y1 + 1)) - 0.02;
    // รถ 3D จริง (vanSprite.js — ภาพจาก van3d เรนเดอร์ครั้งเดียวต่อกุญแจ) · ยังไม่พร้อม/หมุนมุมมอง/ไม่มี WebGL = รถ 2D เดิม
    items.push({ d, f: run(() => {
      const cx = (vb.x0 + vb.x1 + 1) / 2, cy = (vb.y0 + vb.y1 + 1) / 2, [sx, sy, s] = P(cx, cy, 0);
      const sp = s > 0 ? vanSprite(rtState().van, NIGHT, s, Math.abs(G.getTransform().a)) : null;
      if (!sp) { spriteDraw(pv, () => parkedVan(vb), 2.2); return; }
      shadowAt(cx, cy, 2.1, 1.0);
      G.drawImage(sp.cv, sx - sp.R * s, sy - sp.R * s, 2 * sp.R * s, 2 * sp.R * s);
      if (NIGHT) { glowAt(vb.x1 + 1.2, cy - 0.4, 0.5, 1.0, "255,246,200", 0.35); glowAt(vb.x1 + 1.2, cy + 0.4, 0.5, 1.0, "255,246,200", 0.35); }
    }) });
  }
  if (def && def.vanTiles) {
    const v = vanBounds(def);
    items.push({ d: -1e6 + 1, f: run(() => vanFloor(def)) });
    items.push({ d: depthOf((v.x0 + v.x1) / 2, v.y0) - 0.01, f: run(() => vanWall(def, false)) });
    items.push({ d: depthOf((v.x0 + v.x1) / 2, v.y1) + 0.6, f: run(() => { vanWall(def, true); vanEnds(def); }) });
  }
}
// ทับตัวละคร: หลังคาปั๊ม · สายโคม · อนุภาค
export function rtAir(g, info, units, now, lowQ, night) {
  if (!isRtArea(info.area)) return;
  info.__night = !!night;
  begin(g, info, now, lowQ);
  const props = rtPropsOf(info);
  for (const p of props) { const k = KIND[p.kind]; if (k && k.a) k.a(p, units); }
  // ท่าที่สั่งจากพรีวิว (rtPoke) — อนุภาคเริ่มตอนนี้
  while (PEND.length) { const id = PEND.shift(), p = PROPS_BY_ID.get(id); if (p) { ACT.get(id).t0 = now; onAct(id, p.kind); } }
  drawParts();
  // ท่าบอส/มุกแม็กซ์ทับตัวละคร (bossFx.js) — กรอบจอในพิกัดตรรกะจากทรานส์ฟอร์มปัจจุบัน
  const m = g.getTransform(), view = { x0: -m.e / m.a, y0: -m.f / m.d, x1: (g.canvas.width - m.e) / m.a, y1: (g.canvas.height - m.f) / m.d };
  drawBossAir(g, now, NIGHT, units, view);
}
// วัตถุที่กินช่อง (x, y) ของแผนที่ area (ไม่นับของที่เดินทับได้) — BoardStage ใช้ตอนคลิกในจุดพัก (rt:act)
export function rtPropAt(area, x, y) {
  const d = rtDefOf(area);
  return ((d && d.props) || []).find((p) => !p.walk && x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1) || null;
}
