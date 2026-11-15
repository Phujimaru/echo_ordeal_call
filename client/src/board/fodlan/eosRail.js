// ============================================================
//  ภาพของสนาม Eos — ขั้น 4: ราง/สถานีรถไฟ · รถราง · อุโมงค์ · ท่า/เรือกอนโดลา
//  แยกออกจาก ./stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · stage6.js ยังส่งออกชื่อเดิมครบ
//  ⚠️ ห้ามเรียกของจาก ./index ตอนโหลดไฟล์ (index import stage6 — วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { P, faceVisible, gEllipse, rng } from "../boardGeo";
import { EOS_AREA, MAPS } from "../boardRules";
import { fxActive } from "./index";
import { TAU, K, glowAt, poly, hull, box, TILES, ROAD_SET, mix, FAST, hex6, shadeCol, CANAL_SET, MAP_W, MAP_H, TRAM_OFF } from "./eosBase";
import { hexA, hexRgb } from "./eosPillars";
import { rbox } from "./eosObstacles";
import { emoji } from "./eosCamp";

// =================================================================== ขั้น 4: เดินทาง + เก็บของ (server/fodlan/stage6.js "ขั้น 4" · ผัง map6 RAIL_Y / STATIONS / TUNNELS / DOCKS / CAMPS / FISH / TOMBS)
//  อบลงพื้น (theme.base → bakeP4): รางรถไฟ (หินโรยทาง หมอนไม้ รางเหล็ก · ทางข้ามถนน) · พื้นชานชาลา · สะพานท่าเรือ/ท่าตกปลา · ลานแคมป์ · ดินหน้าอุโมงค์
//  วาดทุกเฟรม (items — เรียงความลึกกับตัวละคร): หลังคาชานชาลา · เสาสัญญาณทางข้าม · เนินเขา+ซุ้มอุโมงค์ · กอนโดลาจอด · เต็นท์/กองไฟ/หินรูน · คันเบ็ด · ขบวนรถไฟ · กอนโดลาที่แล่น
//  สุสานราชวงศ์ = สิ่งกีดขวาง (drawObstacle → drawTomb) · ฉากเหตุการณ์ใน air (p4Fx)
export const RAIL_Y = 20;
const P4_AT = (() => {
  const m = MAPS[EOS_AREA], out = {};
  if (!m) return out;
  const add = (kind, k) => { const [x, y] = k.split(",").map(Number); (out[kind] ||= []).push({ x, y }); };
  for (const [k, kind] of Object.entries(m.special || {})) add(kind, k);
  for (const [k, kind] of Object.entries(m.terrain || {})) if (kind === "fd_eos_tomb") add(kind, k);
  return out;
})();
const p4List = (kind) => P4_AT[kind] || [];
const LAKE_SET = new Set(TILES.water.map((t) => K(t.x, t.y)));
const WET_SET = new Set([...TILES.water, ...TILES.shallow, ...TILES.canal].map((t) => K(t.x, t.y)));
const WAY_SET = new Set([...TILES.canal, ...TILES.bridge, ...TILES.water].map((t) => K(t.x, t.y))); // ทางน้ำของกอนโดลา
const unitVec = (dx, dy) => { const L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; };
function nearestIn(set, x, y, r) {
  let best = null;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (!(dx || dy) || !set.has(K(x + dx, y + dy))) continue;
    const d = Math.hypot(dx, dy) + (dx && dy ? 0.05 : 0);
    if (!best || d < best.d) best = { x: x + dx, y: y + dy, d };
  }
  return best;
}
export const STATIONS4 = p4List("fd_eos_station").map((t) => ({ ...t, rd: Math.sign(RAIL_Y - t.y) || 1 }));
// ปากอุโมงค์หันออกหาที่โล่ง (เนินเขาอยู่ด้านหลัง) — ขอบแผนที่ = เนินอยู่นอกกระดาน
const TUNNEL_FACE = { "6,4": [0, 1], "0,18": [1, 0], "14,12": [0, -1], "20,31": [0, -1] };
export const TUNNELS4 = p4List("fd_eos_tunnel").map((t) => ({
  ...t, f: TUNNEL_FACE[K(t.x, t.y)] || (t.x === 0 ? [1, 0] : t.x === MAP_W - 1 ? [-1, 0] : t.y === 0 ? [0, 1] : t.y === MAP_H - 1 ? [0, -1] : [0, 1]),
}));
// ท่ากอนโดลา: ช่องน้ำที่ใกล้ที่สุด = ที่จอดเรือ · ลำเรือตามแนวคลอง
export const DOCKS4 = p4List("fd_eos_dock").map((t) => {
  const w = nearestIn(WAY_SET, t.x, t.y, 2) || { x: t.x, y: t.y + 1 }, d = unitVec(w.x - t.x, w.y - t.y);
  const hz = CANAL_SET.has(K(w.x - 1, w.y)) || CANAL_SET.has(K(w.x + 1, w.y)), vt = CANAL_SET.has(K(w.x, w.y - 1)) || CANAL_SET.has(K(w.x, w.y + 1));
  const ang = hz && !vt ? 0 : vt && !hz ? Math.PI / 2 : Math.atan2(d[1], d[0]) + Math.PI / 2;
  return { ...t, moor: w, d, ang, bx: w.x + 0.5 - d[0] * 0.12, by: w.y + 0.5 - d[1] * 0.12 };
});
export const CAMPS4 = p4List("fd_eos_camp");
// จุดตกปลา: ทุ่นลอยในน้ำลึกที่ใกล้ที่สุด (ไม่มี = น้ำตื้น)
export const FISH4 = p4List("fd_eos_fish").map((t) => {
  const w = nearestIn(LAKE_SET, t.x, t.y, 2) || nearestIn(WET_SET, t.x, t.y, 3) || { x: t.x - 1, y: t.y }, d = unitVec(w.x - t.x, w.y - t.y);
  const dist = Math.min(1.7, Math.hypot(w.x - t.x, w.y - t.y) * 0.85);
  return { ...t, d, bob: { x: t.x + 0.5 + d[0] * dist, y: t.y + 0.5 + d[1] * dist } };
});
// สุสาน: ประตูหันเข้ากลางแผนที่
const TOMBS4 = p4List("fd_eos_tomb").map((t) => { const dx = 15.5 - t.x, dy = 15.5 - t.y; return { ...t, f: Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy) || 1] }; });
export const tombAt = (x, y) => TOMBS4.find((t) => t.x === x && t.y === y) || { x, y, f: [0, 1] };
const TRAM_ORDER = ["insomnia", "duscae", "hammerhead", "altissia", "lake"];
export const TRAM_STOPS = (() => {
  const at = p4List("fd_eos_tram"), want = { insomnia: [17, 4], duscae: [27, 15], hammerhead: [25, 27], altissia: [4, 24], lake: [12, 19] };
  return TRAM_ORDER.map((z) => { const [x, y] = want[z]; return at.find((t) => t.x === x && t.y === y) ? { zone: z, x, y } : null; }).filter(Boolean);
})();
function tramRoute(a, b) {
  const m = MAPS[EOS_AREA];
  if (!m) return [[a.x + 0.5, a.y + 0.5], [b.x + 0.5, b.y + 0.5]];
  const cost = (x, y) => {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return 0;
    const k = K(x, y), sp = m.special[k];
    if (m.terrain[k]) return 0;
    if (sp === "fd_eos_road" || sp === "fd_eos_plaza" || sp === "fd_eos_tram" || sp === "fd_eos_station") return 1;
    if (sp === "fd_eos_forest") return 4;
    if (sp === "fd_eos_shallow" || sp === "fd_eos_bridge") return 3;
    return 2;
  };
  const start = K(a.x, a.y), goal = K(b.x, b.y), dist = new Map([[start, 0]]), prev = new Map(), open = [[0, a.x, a.y]];
  while (open.length) {
    open.sort((p, q) => p[0] - q[0]);
    const [d, x, y] = open.shift(), k = K(x, y);
    if (k === goal) break;
    if (d > dist.get(k)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = cost(x + dx, y + dy);
      if (!c) continue;
      const nk = K(x + dx, y + dy), nd = d + c;
      if (dist.has(nk) && dist.get(nk) <= nd) continue;
      dist.set(nk, nd); prev.set(nk, k); open.push([nd, x + dx, y + dy]);
    }
  }
  const tiles = [];
  for (let k = goal; k; k = prev.get(k)) { tiles.push(k.split(",").map(Number)); if (k === start) break; }
  tiles.reverse();
  let pts = (tiles.length > 1 ? tiles : [[a.x, a.y], [b.x, b.y]]).map(([x, y]) => [x + 0.5, y + 0.5]);
  for (let it = 0; it < 3; it++) { // Chaikin
    const o = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) { const [p, q] = [pts[i], pts[i + 1]]; o.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]); }
    o.push(pts[pts.length - 1]); pts = o;
  }
  return pts;
}
const TRAM_SEGS = TRAM_STOPS.map((a, i) => tramRoute(a, TRAM_STOPS[(i + 1) % TRAM_STOPS.length]));
const TRAM_PATHS = new Map();
// เส้นทางรถรางจากป้าย A ไป B (ทางวงรอบที่สั้นกว่า)
export function tramPath(za, zb) {
  const key = `${za}>${zb}`;
  if (TRAM_PATHS.has(key)) return TRAM_PATHS.get(key);
  const n = TRAM_STOPS.length, ia = TRAM_STOPS.findIndex((t) => t.zone === za), ib = TRAM_STOPS.findIndex((t) => t.zone === zb);
  if (ia < 0 || ib < 0) return null;
  const fw = (ib - ia + n) % n, bw = (ia - ib + n) % n;
  let pts = [];
  if (fw <= bw) for (let i = 0; i < fw; i++) pts = pts.concat(TRAM_SEGS[(ia + i) % n].slice(i ? 1 : 0));
  else for (let i = 0; i < bw; i++) pts = pts.concat(TRAM_SEGS[(ia - 1 - i + n) % n].slice().reverse().slice(i ? 1 : 0));
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const out = { pts, len };
  TRAM_PATHS.set(key, out);
  return out;
}
// อบลงพื้น: หมอนไม้ + รางเหล็กคู่ตามเส้นทาง · ลานป้าย
function bakeTram(g, C, night) {
  if (TRAM_OFF) return;
  for (const pts of TRAM_SEGS) {
    const nrm = (i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / L, (b[0] - a[0]) / L]; };
    // หมอน
    g.beginPath();
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      acc += seg;
      if (acc < 0.3) continue;
      acc = 0;
      const [nx, ny] = nrm(i), [x, y] = pts[i], dx = -ny * 0.05, dy = nx * 0.05;
      const q = [[x + nx * 0.17 - dx, y + ny * 0.17 - dy], [x + nx * 0.17 + dx, y + ny * 0.17 + dy], [x - nx * 0.17 + dx, y - ny * 0.17 + dy], [x - nx * 0.17 - dx, y - ny * 0.17 - dy]].map(([u, v]) => P(u, v, 0.012));
      g.moveTo(q[0][0], q[0][1]); for (let j = 1; j < 4; j++) g.lineTo(q[j][0], q[j][1]); g.closePath();
    }
    g.fillStyle = hexA(C.sleeper, 0.85); g.fill();
    // ราง 2 เส้น
    for (const off of [-0.1, 0.1]) {
      g.beginPath();
      pts.forEach((p, i) => { const [nx, ny] = nrm(i), q = P(p[0] + nx * off, p[1] + ny * off, 0.02); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
      const w = P(pts[0][0], pts[0][1], 0)[2];
      g.strokeStyle = C.rail; g.lineWidth = Math.max(1.2, w * 0.035); g.stroke();
      g.strokeStyle = hexA(C.railHi, night ? 0.5 : 0.7); g.lineWidth = Math.max(0.6, w * 0.014); g.stroke();
    }
  }
  for (const t of TRAM_STOPS) {
    box(g, t.x + 0.06, t.y + 0.06, t.x + 0.94, t.y + 0.94, 0.07, C.platform, C.platform2, C.platform);
    poly(g, [[t.x + 0.1, t.y + 0.1, 0.072], [t.x + 0.9, t.y + 0.1, 0.072], [t.x + 0.9, t.y + 0.15, 0.072], [t.x + 0.1, t.y + 0.15, 0.072]]); g.fillStyle = night ? "#7d6a24" : "#e2c13a"; g.fill();
    poly(g, [[t.x + 0.1, t.y + 0.85, 0.072], [t.x + 0.9, t.y + 0.85, 0.072], [t.x + 0.9, t.y + 0.9, 0.072], [t.x + 0.1, t.y + 0.9, 0.072]]); g.fill();
  }
}
// ป้ายรถราง: เสา + แผ่นป้ายเขียว + ไอคอน (เรืองตอนกลางคืน)
export function drawTramStop(g, t, night, now) {
  const px = t.x + 0.78, py = t.y + 0.22, b = P(px, py, 0.07), top = P(px, py, 1.05);
  g.strokeStyle = night ? "#2b3036" : "#5d666f"; g.lineWidth = Math.max(2, b[2] * 0.045); g.lineCap = "round";
  g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(top[0], top[1]); g.stroke(); g.lineCap = "butt";
  const s = top[2], w = s * 0.34, h = s * 0.26;
  g.fillStyle = night ? "#1d6b52" : "#22a378"; g.beginPath(); g.roundRect(top[0] - w / 2, top[1] - h, w, h, h * 0.25); g.fill();
  g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = Math.max(1, s * 0.012); g.stroke();
  emoji(g, "🚋", top[0], top[1] - h / 2, h * 0.7);
  if (night) glowAt(g, top[0], top[1] - h / 2, s * 0.35, "120,255,200", 0.35 + 0.1 * Math.sin(now / 500 + t.x));
}
// ตัวรถราง (ยาว ~1.1 ช่อง) วิ่งตามเส้นทาง · หน้าต่างเป็นสีผู้โดยสาร
export function drawTram(g, x, y, ang, night, now, pass) {
  rbox(g, x, y, ang, 0.55, 0.2, 0.04, 0.5, night ? "#5c8a78" : "#8fd1b6", night ? "#2f4d42" : "#3f7d68", night ? "#24392f" : "#2f5e4e");
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (const u of [-0.32, -0.1, 0.12, 0.34]) {
    const w = P(x + ca * u, y + sa * u, 0.38);
    g.fillStyle = pass || (night ? "#ffe9a8" : "#d8f3ff"); g.beginPath(); g.arc(w[0], w[1], Math.max(1.5, w[2] * 0.045), 0, TAU); g.fill();
    if (night) glowAt(g, w[0], w[1], w[2] * 0.15, "255,230,160", 0.5);
  }
  const pole = P(x, y, 0.5), wire = P(x + ca * 0.2, y + sa * 0.2, 0.85);
  g.strokeStyle = "#2a2d31"; g.lineWidth = Math.max(1, pole[2] * 0.02); g.beginPath(); g.moveTo(pole[0], pole[1]); g.lineTo(wire[0], wire[1]); g.stroke();
  if (Math.sin(now / 90) > 0.6) glowAt(g, wire[0], wire[1], wire[2] * 0.12, "180,220,255", 0.9);
}
// ทางข้ามถนนบนราง (ถนนแนวเหนือ-ใต้ตัดราง) + เสาสัญญาณมุมทแยงของแต่ละทาง
const CROSSINGS = (() => {
  const out = [];
  let a = null;
  for (let x = 0; x <= MAP_W; x++) {
    const road = x < MAP_W && ROAD_SET.has(K(x, RAIL_Y));
    if (road && a === null) a = x;
    if (!road && a !== null) { out.push({ a, b: x }); a = null; }
  }
  return out;
})();
export const SIGNALS = CROSSINGS.flatMap((c) => [{ x: c.a - 0.14, y: RAIL_Y - 0.14 }, { x: c.b + 0.14, y: RAIL_Y + 1.14 }]);
export function unitOf(units, id) {
  const u = (units || []).find((it) => it.id === id && !it.corpse);
  if (!u) return null;
  return { x: (u.rx != null ? u.rx : u.x) + (u.ox || 0) + 0.5, y: (u.ry != null ? u.ry : u.y) + (u.oy || 0) + 0.5, color: hex6(u.color, "#d8dde6") };
}
export const occupied = (units) => { const s = new Set(); for (const u of units || []) if (!u.corpse) s.add(K(Math.round(u.rx != null ? u.rx : u.x), Math.round(u.ry != null ? u.ry : u.y))); return s; };
export const activeOf = (fd, now, kind) => fxActive(fd, now).map(p4Norm).filter((e) => e.kind === kind);
// server ctx.fx = { kind, ...data } → data.kind ทับชื่อเหตุการณ์ของ camp_meal ("atk"/"mend"/"mov") และ hunt_board/hunt_done ("daemon"/"beast"/"magitek"/"player")
//  แปลงกลับเป็นชื่อเหตุการณ์ (meal / bounty = ชนิดเดิม) · รูปแบบที่ถูก { kind: "camp_meal", meal } ก็ใช้ได้
const MEAL_KINDS = new Set(["atk", "mend", "mov", "grill", "feast"]), BOUNTY_KINDS = new Set(["daemon", "beast", "magitek", "player"]);
export function p4Norm(e) {
  if (!e) return e;
  if (MEAL_KINDS.has(e.kind)) return { ...e, kind: "camp_meal", meal: e.kind };
  if (BOUNTY_KINDS.has(e.kind)) return { ...e, kind: "gold" in e ? "hunt_done" : "hunt_board", bounty: e.kind };
  return e;
}

// ---------- อบลงพื้น ----------
function bakeRail(g, C) {
  const y = RAIL_Y, x0 = -1, x1 = MAP_W + 1, isX = (x) => CROSSINGS.some((c) => x >= c.a && x < c.b);
  const segs = [];
  for (let x = x0; x < x1; x++) if (!isX(x)) segs.push(x);
  const strip = (ya, yb, za, zb) => { g.beginPath(); for (const x of segs) { const a = P(x - 0.01, ya, za), b = P(x + 1.01, ya, za), c = P(x + 1.01, yb, zb), d = P(x - 0.01, yb, zb); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); } };
  // หินโรยทาง: เงาข้าง → ลาดเหนือ (รับแสง) → ลาดใต้ → หลังคันทาง
  strip(y + 0.0, y + 1.0, 0, 0); g.fillStyle = "rgba(0,0,0,.2)"; g.fill();
  strip(y + 0.04, y + 0.15, 0, 0.05); g.fillStyle = C.ballast; g.fill();
  strip(y + 0.85, y + 0.96, 0.05, 0); g.fillStyle = C.ballast2; g.fill();
  strip(y + 0.15, y + 0.85, 0.05, 0.05); g.fillStyle = mix(C.ballast, C.ballast2, 0.35); g.fill();
  if (!FAST) { // เม็ดหิน
    const R = rng(4411);
    for (const col of [C.ballast, C.ballast2, "#2e2b28"]) {
      g.fillStyle = col; g.beginPath();
      for (const x of segs) for (let i = 0; i < 12; i++) { const p = P(x + R(), y + 0.12 + R() * 0.76, 0.05); g.rect(p[0], p[1], Math.max(1, p[2] * 0.02), Math.max(1, p[2] * 0.014)); }
      g.fill();
    }
  }
  // ทางข้ามถนน: แผ่นยางระหว่างราง + เส้นหยุด
  for (const c of CROSSINGS) {
    poly(g, [[c.a, y + 0.22, 0.01], [c.b, y + 0.22, 0.01], [c.b, y + 0.78, 0.01], [c.a, y + 0.78, 0.01]]); g.fillStyle = "rgba(28,28,32,.55)"; g.fill();
    for (const yy of [y - 0.12, y + 1.08]) { poly(g, [[c.a + 0.08, yy, 0.005], [c.b - 0.08, yy, 0.005], [c.b - 0.08, yy + 0.04, 0.005], [c.a + 0.08, yy + 0.04, 0.005]]); g.fillStyle = C.roadLine; g.fill(); }
  }
  // หมอนรองราง
  g.beginPath();
  for (let sx = x0 + 0.17; sx < x1; sx += 0.34) {
    if (isX(Math.floor(sx))) continue;
    const a = P(sx - 0.055, y + 0.19, 0.06), b = P(sx + 0.055, y + 0.19, 0.06), c = P(sx + 0.055, y + 0.81, 0.06), d = P(sx - 0.055, y + 0.81, 0.06);
    g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
  }
  g.fillStyle = C.sleeper; g.fill();
  // รางเหล็ก 2 เส้น: ข้างรางที่หันกล้อง + หลังรางวาว (ทีละช่อง — กล้องใกล้ไม่ฉายเส้นยาวข้ามหลังกล้อง)
  for (const ry of [y + 0.36, y + 0.64]) {
    const n = faceVisible(0, 1, MAP_W / 2, ry + 0.02) ? 1 : -1;
    g.beginPath();
    for (let x = x0; x < x1; x++) { const a = P(x, ry + n * 0.022, 0.05), b = P(x + 1, ry + n * 0.022, 0.05), c = P(x + 1, ry + n * 0.022, 0.095), d = P(x, ry + n * 0.022, 0.095); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); }
    g.fillStyle = C.rail; g.fill();
    g.beginPath();
    for (let x = x0; x < x1; x++) { const a = P(x, ry - 0.022, 0.095), b = P(x + 1, ry - 0.022, 0.095), c = P(x + 1, ry + 0.022, 0.095), d = P(x, ry + 0.022, 0.095); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); }
    g.fillStyle = C.railHi; g.fill();
  }
}
// สะพานไม้ยื่นลงน้ำ (ท่ากอนโดลา / ท่าตกปลา) · d = ทิศไปหาน้ำ
function bakePier(g, cx, cy, d, len, w, C) {
  const n = [-d[1], d[0]], z = 0.055, s0 = -0.08, pt = (u, v, zz = z) => [cx + d[0] * u + n[0] * v, cy + d[1] * u + n[1] * v, zz];
  for (const sg of [-1, 1]) {
    const m = pt((s0 + len) / 2, sg * w);
    if (faceVisible(n[0] * sg, n[1] * sg, m[0], m[1])) { poly(g, [pt(s0, sg * w, -0.04), pt(len, sg * w, -0.04), pt(len, sg * w), pt(s0, sg * w)]); g.fillStyle = shadeCol(C.bridge, -0.4); g.fill(); }
  }
  const e = pt(len, 0);
  if (faceVisible(d[0], d[1], e[0], e[1])) { poly(g, [pt(len, -w, -0.04), pt(len, w, -0.04), pt(len, w), pt(len, -w)]); g.fillStyle = shadeCol(C.bridge, -0.45); g.fill(); }
  poly(g, [pt(s0, -w), pt(len, -w), pt(len, w), pt(s0, w)]); g.fillStyle = C.bridge; g.fill();
  g.strokeStyle = "rgba(0,0,0,.32)"; g.lineWidth = 1; g.beginPath();
  for (let u = s0 + 0.09; u < len; u += 0.09) { const a = P(...pt(u, -w)), b = P(...pt(u, w)); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
  g.stroke();
  for (const v of [-w, w]) { const [px, py] = pt(len - 0.03, v); box(g, px - 0.028, py - 0.028, px + 0.028, py + 0.028, 0.17, shadeCol(C.bridge, -0.2), shadeCol(C.bridge, -0.5), shadeCol(C.bridge, -0.35), -0.02); }
}
export function bakeP4(g, C, night) {
  bakeRail(g, C);
  bakeTram(g, C, night);
  // ชานชาลา: พื้นคอนกรีตยกต่ำ + เส้นเหลืองริมราง + แนวแผ่นปู
  for (const t of STATIONS4) {
    box(g, t.x - 0.08, t.y + 0.06, t.x + 1.08, t.y + 0.98, 0.09, C.platform, C.platform2, C.platform);
    const ey = t.rd > 0 ? t.y + 0.86 : t.y + 0.14;
    poly(g, [[t.x - 0.06, ey, 0.092], [t.x + 1.06, ey, 0.092], [t.x + 1.06, ey + 0.05 * t.rd, 0.092], [t.x - 0.06, ey + 0.05 * t.rd, 0.092]]); g.fillStyle = night ? "#7d6a24" : "#e2c13a"; g.fill();
    if (!FAST) { g.strokeStyle = "rgba(0,0,0,.14)"; g.lineWidth = 1; g.beginPath(); for (let u = 0.2; u < 1.1; u += 0.27) { const a = P(t.x - 0.08 + u, t.y + 0.07, 0.092), b = P(t.x - 0.08 + u, t.y + 0.97, 0.092); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke(); }
  }
  for (const t of DOCKS4) bakePier(g, t.x + 0.5, t.y + 0.5, t.d, Math.max(0.55, Math.hypot(t.moor.x - t.x, t.moor.y - t.y) - 0.15), 0.2, C);
  for (const t of FISH4) bakePier(g, t.x + 0.5, t.y + 0.5, t.d, 0.62, 0.13, C);
  // ลานแคมป์ (ดินอัด + วงรูนจาง — เรืองจริงวาดใน ground)
  for (const t of CAMPS4) {
    gEllipse(g, t.x + 0.5, t.y + 0.5, 0.48, 0, 30); g.fillStyle = hexA(C.dirt, 0.6); g.fill();
    gEllipse(g, t.x + 0.5, t.y + 0.5, 0.38, 0.004, 30); g.strokeStyle = night ? "rgba(110,170,255,.35)" : "rgba(90,140,200,.3)"; g.lineWidth = 1.5; g.stroke();
  }
  // หน้าอุโมงค์: ดินทางเดิน + เงามืดที่ปาก
  for (const t of TUNNELS4) {
    const cx = t.x + 0.5, cy = t.y + 0.5, [fx, fy] = t.f;
    gEllipse(g, cx + fx * 0.05, cy + fy * 0.05, 0.42, 0, 26, 0.42); g.fillStyle = hexA(C.dirt, 0.55); g.fill();
    gEllipse(g, cx - fx * 0.12, cy - fy * 0.12, 0.28, 0.002, 20); g.fillStyle = "rgba(0,0,0,.3)"; g.fill();
  }
}

// ---------- ชานชาลา (หลังคา เสา ไฟ ม้านั่ง ป้าย ไฟสัญญาณ) ----------
export function drawStation(g, t, night, now, warn) {
  const rd = t.rd, cx = t.x + 0.5, cy = t.y + 0.5, yb = cy - rd * 0.42, yf = cy + rd * 0.06, py = cy - rd * 0.3;
  const post = night ? "#22252b" : "#363b44", roof = night ? "#2b323b" : "#5c6874";
  box(g, t.x + 0.2, py - 0.03, t.x + 0.36, py + 0.03, 0.2, "#6b4a2c", "#3e2a18", "#55391f", 0.09); // ม้านั่ง
  box(g, t.x + 0.64, py - 0.03, t.x + 0.8, py + 0.03, 0.2, "#6b4a2c", "#3e2a18", "#55391f", 0.09);
  for (const px of [t.x + 0.1, t.x + 0.9]) box(g, px - 0.025, py - 0.025, px + 0.025, py + 0.025, 0.98, post, shadeCol(post, -0.3), post, 0.09);
  // ป้ายชื่อสถานี (แผ่นน้ำเงินแถบขาว — ไม่มีตัวอักษร)
  const sp = (u, z) => P(t.x + u, py + rd * 0.03, z), q = [sp(0.3, 0.86), sp(0.7, 0.86), sp(0.7, 0.76), sp(0.3, 0.76)];
  g.fillStyle = "#1c3d6e"; g.beginPath(); q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
  g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1; g.stroke();
  const m0 = sp(0.34, 0.81), m1 = sp(0.66, 0.81); g.beginPath(); g.moveTo(m0[0], m0[1]); g.lineTo(m1[0], m1[1]); g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = Math.max(1, m0[2] * 0.012); g.stroke();
  // หลังคาลาด
  const top = [[t.x - 0.04, yb, 1.03], [t.x + 1.04, yb, 1.03], [t.x + 1.04, yf, 0.93], [t.x - 0.04, yf, 0.93]];
  const fe = [[t.x - 0.04, yf, 0.93], [t.x + 1.04, yf, 0.93], [t.x + 1.04, yf, 0.88], [t.x - 0.04, yf, 0.88]];
  if (faceVisible(0, rd, cx, yf)) { poly(g, fe); g.fillStyle = shadeCol(roof, -0.35); g.fill(); }
  poly(g, top); g.fillStyle = roof; g.fill(); g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 1; g.stroke();
  g.strokeStyle = "rgba(0,0,0,.22)"; g.beginPath(); // ลอนหลังคาเหล็ก
  for (let u = 0.1; u < 1.05; u += 0.12) { const a = P(t.x - 0.04 + u, yb, 1.031), b = P(t.x - 0.04 + u, yf, 0.931); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
  g.stroke();
  // ไฟห้อยใต้หลังคา
  const lp = P(cx, yf - rd * 0.06, 0.84);
  g.fillStyle = night ? "#ffe6a8" : "#e6e0cc"; g.beginPath(); g.arc(lp[0], lp[1], Math.max(1.5, lp[2] * 0.03), 0, TAU); g.fill();
  if (night) { glowAt(g, lp[0], lp[1], lp[2] * 1.1, "255,215,140", 0.7); const fl = P(cx, cy, 0.09); glowAt(g, fl[0], fl[1], fl[2] * 0.9, "255,210,130", 0.35); }
  // ไฟสัญญาณปลายชานชาลา: เขียว / แดงกะพริบตอนรถไฟใกล้มา
  const sx = t.x + 1.0, sy = cy + rd * 0.32, b = P(sx, sy, 0.09), h = P(sx, sy, 0.62);
  g.strokeStyle = post; g.lineWidth = Math.max(1.5, b[2] * 0.025); g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(h[0], h[1]); g.stroke();
  g.fillStyle = "#121418"; g.beginPath(); g.arc(h[0], h[1], Math.max(2, h[2] * 0.045), 0, TAU); g.fill();
  const red = warn && Math.sin(now / 160) > 0, col = warn ? (red ? "255,50,40" : null) : "70,255,120";
  if (col) { g.fillStyle = `rgb(${col})`; g.beginPath(); g.arc(h[0], h[1], Math.max(1.2, h[2] * 0.028), 0, TAU); g.fill(); glowAt(g, h[0], h[1], h[2] * 0.4, col, night ? 0.9 : 0.55); }
}
// ---------- เสาสัญญาณทางข้าม (กากบาท + ไฟแดงสลับเมื่อรถไฟใกล้มา) ----------
export function drawSignal(g, sx, sy, night, now, warn) {
  const b = P(sx, sy), t = P(sx, sy, 0.95), s = b[2];
  g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(b[0], b[1], s * 0.08, s * 0.03, 0, 0, TAU); g.fill();
  g.strokeStyle = night ? "#3a3d42" : "#d8dade"; g.lineWidth = Math.max(1.5, s * 0.03); g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(t[0], t[1]); g.stroke();
  const X = (u0, z0, u1, z1) => { const a = P(sx + u0, sy, z0), c = P(sx + u1, sy, z1); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); };
  g.beginPath(); X(-0.14, 0.78, 0.14, 0.94); X(-0.14, 0.94, 0.14, 0.78);
  g.strokeStyle = "#b8231a"; g.lineWidth = Math.max(2.5, s * 0.05); g.stroke();
  g.strokeStyle = night ? "#9a9da2" : "#ffffff"; g.lineWidth = Math.max(1, s * 0.022); g.stroke();
  const ph = Math.sin(now / 260) > 0;
  for (const [k, u] of [[0, -0.075], [1, 0.075]]) {
    const p = P(sx + u, sy, 0.6), on = warn && (k ? ph : !ph);
    g.fillStyle = "#101114"; g.beginPath(); g.arc(p[0], p[1], Math.max(2, s * 0.045), 0, TAU); g.fill();
    g.fillStyle = on ? "#ff3a28" : "#4a1410"; g.beginPath(); g.arc(p[0], p[1], Math.max(1.3, s * 0.03), 0, TAU); g.fill();
    if (on) glowAt(g, p[0], p[1], s * 0.45, "255,50,40", 0.9);
  }
}
// ---------- อุโมงค์: เนินเขา + ซุ้มหินโค้ง (หันออกหาที่โล่ง) ----------
function tunnelHill(g, t, night) {
  const [fx, fy] = t.f, ux = -fy, uy = fx, hx = t.x + 0.5 - fx * 0.6, hy = t.y + 0.5 - fy * 0.6, ru = 1.0, rf = 0.68, H = 1.0;
  const pts = [];
  for (let i = 0; i < 24; i++) for (let j = 0; j <= 4; j++) {
    const u = i / 24 * TAU, v = j / 4 * Math.PI / 2, a = Math.cos(v) * Math.cos(u) * ru, b = Math.cos(v) * Math.sin(u) * rf;
    const q = P(hx + ux * a + fx * b, hy + uy * a + fy * b, H * Math.sin(v) * (1 + 0.08 * Math.sin(u * 3)));
    pts.push([q[0], q[1]]);
  }
  const h = hull(pts), top = P(hx, hy, H), foot = P(hx, hy, 0);
  const gr = g.createLinearGradient(top[0], top[1] - top[2] * 0.2, foot[0], foot[1] + foot[2] * 0.3);
  gr.addColorStop(0, night ? "#2b3a2c" : "#7d9455"); gr.addColorStop(0.45, night ? "#24301f" : "#5f7a3c"); gr.addColorStop(1, night ? "#2a241c" : "#6e5a3c");
  g.beginPath(); h.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = gr; g.fill();
  if (!FAST) { // หินโผล่ + พุ่มหญ้าบนเนิน
    const R = rng(t.x * 31 + t.y * 7);
    for (let i = 0; i < 9; i++) {
      const u = R() * TAU, v = 0.25 + R() * 1.0, a = Math.cos(v) * Math.cos(u) * ru * 0.92, b = Math.cos(v) * Math.sin(u) * rf * 0.92;
      const q = P(hx + ux * a + fx * b, hy + uy * a + fy * b, H * Math.sin(v)), s = q[2];
      if (i % 3 === 0) { g.fillStyle = night ? "#3c3d40" : "#8d8b84"; g.beginPath(); g.ellipse(q[0], q[1], s * 0.08, s * 0.045, R(), 0, TAU); g.fill(); }
      else { g.fillStyle = night ? "#1b2a1c" : "#4c6a2c"; g.beginPath(); g.arc(q[0], q[1] - s * 0.03, s * (0.05 + R() * 0.04), 0, TAU); g.fill(); }
    }
  }
}
function tunnelPortal(g, t, night) {
  const [fx, fy] = t.f, ux = -fy, uy = fx, ox = t.x + 0.5 - fx * 0.14, oy = t.y + 0.5 - fy * 0.14;
  const sp = (u, z, out = 0) => P(ox + ux * u + fx * out, oy + uy * u + fy * out, z);
  const stone = night ? "#55575c" : "#9a968c", dark = night ? "#3a3c40" : "#6e6a62";
  // ผนังหน้า (กำแพงกันดิน) + ขอบบน
  const wall = [sp(-0.46, 0), sp(0.46, 0), sp(0.46, 0.58), sp(0.3, 0.7), sp(-0.3, 0.7), sp(-0.46, 0.58)];
  g.fillStyle = stone; g.beginPath(); wall.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1; g.stroke();
  if (!FAST) { // แนวก้อนหิน
    g.strokeStyle = "rgba(0,0,0,.18)"; g.beginPath();
    for (let z = 0.14; z < 0.66; z += 0.14) { const a = sp(-0.45, z), b = sp(0.45, z); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
    g.stroke();
  }
  // ช่องโค้ง: มืดลึก
  const arch = [];
  arch.push(sp(-0.24, 0));
  for (let i = 0; i <= 14; i++) { const a = Math.PI - i / 14 * Math.PI; arch.push(sp(Math.cos(a) * 0.24, 0.3 + Math.sin(a) * 0.24)); }
  arch.push(sp(0.24, 0));
  const c = sp(0, 0.25), gr = g.createRadialGradient(c[0], c[1] + c[2] * 0.1, 0, c[0], c[1], c[2] * 0.4);
  gr.addColorStop(0, "#000000"); gr.addColorStop(1, night ? "#0a0b0e" : "#1d1b19");
  g.fillStyle = gr; g.beginPath(); arch.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
  // หินโค้งรอบช่อง (voussoir) + หินหลักบนสุด
  g.strokeStyle = dark; g.lineWidth = Math.max(2, c[2] * 0.05); g.beginPath();
  for (let i = 0; i <= 14; i++) { const a = Math.PI - i / 14 * Math.PI, q = sp(Math.cos(a) * 0.27, 0.3 + Math.sin(a) * 0.27, 0.005); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }
  g.stroke();
  const k0 = sp(-0.05, 0.5, 0.01), k1 = sp(0.05, 0.5, 0.01), k2 = sp(0.06, 0.62, 0.01), k3 = sp(-0.06, 0.62, 0.01);
  g.fillStyle = shadeCol(stone, 0.15); g.beginPath(); g.moveTo(k0[0], k0[1]); g.lineTo(k1[0], k1[1]); g.lineTo(k2[0], k2[1]); g.lineTo(k3[0], k3[1]); g.closePath(); g.fill();
  // ตะเกียงสองข้าง
  for (const u of [-0.36, 0.36]) {
    const p = sp(u, 0.42, 0.03), s = p[2];
    g.fillStyle = "#1a1714"; g.fillRect(p[0] - s * 0.025, p[1] - s * 0.04, s * 0.05, s * 0.07);
    g.fillStyle = night ? "#ffcf7a" : "#d9c79a"; g.fillRect(p[0] - s * 0.016, p[1] - s * 0.03, s * 0.032, s * 0.045);
    if (night) glowAt(g, p[0], p[1], s * 0.55, "255,190,110", 0.75);
  }
}
export function drawTunnel(g, t, night) {
  const [fx, fy] = t.f, front = faceVisible(fx, fy, t.x + 0.5 - fx * 0.14, t.y + 0.5 - fy * 0.14);
  if (front) { tunnelHill(g, t, night); tunnelPortal(g, t, night); } else tunnelHill(g, t, night);
}
// ---------- กอนโดลา (ลำดำขลับ ขอบทอง หัวเรือเหล็กหวี เบาะแดง) ----------
export function drawGondola(g, cx, cy, ang, night, now, pass = null, alpha = 1) {
  const ca = Math.cos(ang), sa = Math.sin(ang), bob = Math.sin(now / 700 + cx * 3) * 0.012;
  const at = (u, v, z) => P(cx + ca * u - sa * v, cy + sa * u + ca * v, z + bob);
  const half = 0.46, W = (u) => 0.12 * Math.sqrt(Math.max(0, 1 - (u / 0.48) ** 2)), Z = (u) => 0.1 + 0.2 * Math.max(0, (Math.abs(u) - 0.26) / 0.2) ** 2;
  const N = 12, us = Array.from({ length: N + 1 }, (_, i) => -half + (i / N) * half * 2);
  g.save(); g.globalAlpha *= alpha;
  const sh = at(0, 0, -0.01);
  g.fillStyle = "rgba(0,10,20,.35)"; g.beginPath(); g.ellipse(sh[0], sh[1], sh[2] * 0.42, sh[2] * 0.1, 0, 0, TAU); g.fill();
  const hullC = night ? "#07080a" : "#121418", trim = night ? "#8a6f2e" : "#d0a94a";
  // ดาดฟ้า (ด้านใน) แล้วข้างลำที่หันกล้อง
  g.fillStyle = night ? "#20160f" : "#3d2a1b"; g.beginPath();
  us.forEach((u, i) => { const p = at(u, -W(u), Z(u)); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
  us.slice().reverse().forEach((u) => { const p = at(u, W(u), Z(u)); g.lineTo(p[0], p[1]); });
  g.closePath(); g.fill();
  const side = faceVisible(-sa, ca, cx, cy) ? 1 : -1;
  g.fillStyle = hullC; g.beginPath();
  us.forEach((u, i) => { const p = at(u, side * W(u), Z(u)); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
  us.slice().reverse().forEach((u) => { const p = at(u * 0.92, side * W(u) * 0.8, 0.0); g.lineTo(p[0], p[1]); });
  g.closePath(); g.fill();
  g.strokeStyle = trim; g.lineWidth = Math.max(1, sh[2] * 0.012); g.beginPath();
  us.forEach((u, i) => { const p = at(u, side * W(u), Z(u)); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
  g.stroke();
  // เบาะ + หัวเรือ ferro + ไม้พาย
  const c0 = at(-0.08, -0.07, 0.11), c1 = at(0.08, 0.07, 0.11);
  g.fillStyle = "#9c1c22"; g.beginPath(); g.ellipse((c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2, sh[2] * 0.07, sh[2] * 0.03, 0, 0, TAU); g.fill();
  const bow = at(half, 0, Z(half)), bt = at(half + 0.03, 0, Z(half) + 0.1);
  g.strokeStyle = night ? "#8d939b" : "#e3e7ec"; g.lineWidth = Math.max(1, sh[2] * 0.014); g.beginPath(); g.moveTo(bow[0], bow[1]); g.lineTo(bt[0], bt[1]);
  for (let i = 0; i < 4; i++) { const p = at(half + 0.01, 0, Z(half) + 0.02 + i * 0.022), p2 = at(half + 0.06, 0, Z(half) + 0.02 + i * 0.022); g.moveTo(p[0], p[1]); g.lineTo(p2[0], p2[1]); }
  g.stroke();
  const o0 = at(-0.34, side * 0.1, 0.55), o1 = at(-0.42, side * 0.18, -0.02);
  g.strokeStyle = night ? "#3a2a1c" : "#6b4a2c"; g.lineWidth = Math.max(1, sh[2] * 0.015); g.beginPath(); g.moveTo(o0[0], o0[1]); g.lineTo(o1[0], o1[1]); g.stroke();
  if (pass) { // ผู้โดยสาร (สีของหมาก)
    const b = at(0, 0, 0.12), hd = at(0, 0, 0.3), s = b[2];
    g.fillStyle = shadeCol(pass, -0.25); g.beginPath(); g.ellipse(b[0], b[1] - s * 0.06, s * 0.05, s * 0.08, 0, 0, TAU); g.fill();
    g.fillStyle = pass; g.beginPath(); g.arc(hd[0], hd[1], Math.max(2, s * 0.045), 0, TAU); g.fill();
    glowAt(g, hd[0], hd[1], s * 0.25, hexRgb(pass), 0.4);
  }
  if (night) { const l = at(-half + 0.04, 0, 0.32); glowAt(g, l[0], l[1], l[2] * 0.4, "255,200,120", 0.7); g.fillStyle = "#ffd890"; g.beginPath(); g.arc(l[0], l[1], Math.max(1, l[2] * 0.015), 0, TAU); g.fill(); }
  g.restore();
}
// เส้นทางน้ำระหว่างท่า (BFS ตามคลอง/สะพาน/ทะเลสาบ · เกลารอยหยัก) — แคชตามคู่ท่า
const GPATH = new Map();
const dockNear = (p) => DOCKS4.reduce((best, d) => (!best || Math.hypot(d.x - p.x, d.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? d : best), null);
export function gondolaPath(from, to) {
  const A = dockNear(from), B = dockNear(to);
  if (!A || !B) return null;
  const key = `${A.x},${A.y}>${B.x},${B.y}`;
  if (GPATH.has(key)) return GPATH.get(key);
  const s = K(A.moor.x, A.moor.y), goal = K(B.moor.x, B.moor.y), prev = new Map([[s, null]]), q = [s];
  for (let i = 0; i < q.length && !prev.has(goal); i++) {
    const [x, y] = q[i].split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = K(x + dx, y + dy); if (WAY_SET.has(k) && !prev.has(k)) { prev.set(k, q[i]); q.push(k); } }
  }
  let tiles = [];
  if (prev.has(goal)) { for (let k = goal; k; k = prev.get(k)) tiles.push(k.split(",").map(Number)); tiles.reverse(); }
  else tiles = [[A.moor.x, A.moor.y], [B.moor.x, B.moor.y]];
  let pts = [[A.bx, A.by], ...tiles.map(([x, y]) => [x + 0.5, y + 0.5]), [B.bx, B.by]];
  for (let it = 0; it < 2; it++) { // Chaikin
    const o = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
    o.push(pts[pts.length - 1]); pts = o;
  }
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const out = { pts, len, A, B };
  GPATH.set(key, out);
  return out;
}
export function alongPath(pp, k) {
  const L = pp.len[pp.len.length - 1] * Math.max(0, Math.min(1, k));
  let i = 1;
  while (i < pp.len.length - 1 && pp.len[i] < L) i++;
  const a = pp.pts[i - 1], b = pp.pts[i], seg = pp.len[i] - pp.len[i - 1] || 1, r = (L - pp.len[i - 1]) / seg;
  return { x: a[0] + (b[0] - a[0]) * r, y: a[1] + (b[1] - a[1]) * r, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}
