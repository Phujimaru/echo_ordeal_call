// ============================================================
//  ภาพของสนาม Eos — ไฟเมือง/เสาไฟ · คันโยก · สะพานยก · โดมกำแพงเวท · สวิตช์ · ซากรถ
//  แยกออกจาก ./stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · stage6.js ยังส่งออกชื่อเดิมครบ
//  ⚠️ ห้ามเรียกของจาก ./index ตอนโหลดไฟล์ (index import stage6 — วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { P, gEllipse, quad, rng } from "../boardGeo";
import { fxT } from "./index";
import { TAU, hash, K, ease, fx, glowAt, poly, hull, box, LAST_FD, shadeCol, CANAL_SET } from "./eosBase";
import { frustum } from "./eosPillars";
import { smooth } from "./eosUnits";

// =================================================================== ขั้น 2: ลูกเล่นปั่นป่วน (server/fodlan/stage6.js "ขั้น 2")
//  drawObstacle ได้แค่ t/x/y → อ่านสถานะจาก LAST_FD (ground() เก็บไว้ทุกเฟรม)
export const TOWN_RECTS = { insomnia: [8, 0, 23, 8], hammerhead: [24, 24, 31, 31], altissia: [0, 24, 12, 31] }; // = server map6 ZONES (town)
const inRect = (r, x, y) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
function townAt(x, y) { for (const [id, r] of Object.entries(TOWN_RECTS)) if (inRect(r, x, y)) return id; return null; }
// ไฟเมืองดับ (แผงไฟ — fd.lightsOff[zone])
export function darkAt(x, y) { const z = townAt(x, y); return !!(z && LAST_FD && LAST_FD.lightsOff && LAST_FD.lightsOff[z]); }
export const lastFx = (kind) => (LAST_FD && Array.isArray(LAST_FD.fx) ? LAST_FD.fx.slice().reverse().find((e) => e.kind === kind) : null);
// เสาไฟ: ดับ/ติด + กะพริบช่วงสับสวิตช์
export function lampOn(x, y, now) {
  const z = townAt(x, y), e = lastFx("lights");
  if (z && e && e.zone === z) {
    const p = fxT(e, now, fx.lights);
    if (p < 1) return Math.sin(now / 35 + x * 3) > (e.off ? p * 2 - 1 : 1 - p * 2);
  }
  return !darkAt(x, y);
}

// ---------- คันโยกสะพาน (เอียงตาม fd.bridgeUp · โยกตอนเหตุการณ์ "bridge") ----------
const LEVER_TILT = 0.65;
function leverAngle(now) {
  const to = LAST_FD && LAST_FD.bridgeUp ? LEVER_TILT : -LEVER_TILT, e = lastFx("bridge");
  if (!e) return to;
  const k = ease(Math.min(1, fxT(e, now, fx.bridge) / 0.3));
  return -to + to * 2 * k;
}
export function drawLever(g, x, y, C, now) {
  const [bx, by, s] = P(x + 0.5, y + 0.55);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx, by, s * 0.34, s * 0.12, 0, 0, TAU); g.fill();
  box(g, x + 0.24, y + 0.3, x + 0.76, y + 0.78, 0.26, C.stone, C.stone2, C.stone);
  const piv = P(x + 0.5, y + 0.54, 0.27);
  g.fillStyle = "#1c1f24"; g.fillRect(piv[0] - s * 0.05, piv[1] - s * 0.03, s * 0.1, s * 0.06);
  const a = leverAngle(now), L = 0.55;
  const end = P(x + 0.5, y + 0.54 + Math.sin(a) * L, 0.27 + Math.cos(a) * L);
  g.strokeStyle = "#3a3f47"; g.lineWidth = Math.max(2.5, s * 0.07); g.lineCap = "round";
  g.beginPath(); g.moveTo(piv[0], piv[1]); g.lineTo(end[0], end[1]); g.stroke();
  g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = Math.max(1, s * 0.02);
  g.beginPath(); g.moveTo(piv[0] - 1, piv[1]); g.lineTo(end[0] - 1, end[1]); g.stroke();
  g.lineCap = "butt";
  g.fillStyle = "#b8321f"; g.beginPath(); g.arc(end[0], end[1], Math.max(2, s * 0.06), 0, TAU); g.fill();
  g.fillStyle = "rgba(255,190,170,.6)"; g.beginPath(); g.arc(end[0] - s * 0.02, end[1] - s * 0.02, Math.max(1, s * 0.02), 0, TAU); g.fill();
}

// ---------- สะพานยก (fd_eos_bridgeup แทนสะพานที่อบไว้ · ลดลง = เห็นสะพานที่อบ) ----------
export const BRIDGE_UP = 1.15; // มุมยก (rad) → ปลายสะพานสูง ≈ 0.9
export function bridgeLeaf(g, x, y, C, ang) {
  // น้ำในคลองใต้สะพาน (ปิดสะพานที่อบไว้)
  quad(g, x - 0.02, y - 0.02); g.fillStyle = C.bank; g.fill();
  quad(g, x + 0.04, y + 0.12); g.fillStyle = C.canal; g.fill();
  // คลองไหลซ้าย-ขวา = ข้ามแนวตั้ง (บานพับขอบบน) · คลองไหลบน-ล่าง = บานพับขอบซ้าย
  const vert = !(CANAL_SET.has(K(x, y - 1)) || CANAL_SET.has(K(x, y + 1))) || CANAL_SET.has(K(x - 1, y)) || CANAL_SET.has(K(x + 1, y));
  const L = 0.96, z0 = 0.06, run = Math.cos(ang) * L, top = z0 + Math.sin(ang) * L;
  const pt = (u, w) => (vert ? [x + 0.08 + u * 0.84, y + 0.02 + w * run, z0 + w * (top - z0)] : [x + 0.02 + w * run, y + 0.08 + u * 0.84, z0 + w * (top - z0)]);
  // เสาบานพับ
  for (const u of [0, 1]) {
    const [hx, hy] = pt(u, 0);
    box(g, hx - 0.05, hy - 0.05, hx + 0.05, hy + 0.05, 0.34, "#4a3a2a", "#2e241a", "#3c2f22");
  }
  // ขอบหนา → หน้าไม้ + แนวไม้กระดาน
  const face = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];
  poly(g, face.map(([a, b, z]) => [a, b, z - 0.05])); g.fillStyle = "#2e2318"; g.fill();
  poly(g, face); g.fillStyle = C.bridge; g.fill();
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1;
  for (let i = 1; i < 6; i++) { const a = P(...pt(0, i / 6)), b = P(...pt(1, i / 6)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  g.strokeStyle = "rgba(255,230,190,.18)"; poly(g, face); g.stroke();
  // โซ่ยก (ยอดเสา → ปลายสะพาน)
  if (ang > 0.1) {
    g.strokeStyle = "rgba(30,30,34,.75)"; g.lineWidth = 1; g.setLineDash([2, 2]);
    for (const u of [0, 1]) {
      const [hx, hy] = pt(u, 0), a = P(hx, hy, 0.34), b = P(...pt(u, 1));
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    g.setLineDash([]);
  }
}

// ---------- แท่นโดม (คริสตัลเรือง) ----------
export function drawDomeCore(g, x, y, C, night, now) {
  const on = !!(LAST_FD && LAST_FD.dome);
  const [bx, by, s] = P(x + 0.5, y + 0.55);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx, by, s * 0.4, s * 0.14, 0, 0, TAU); g.fill();
  box(g, x + 0.18, y + 0.18, x + 0.82, y + 0.82, 0.16, C.stone2, C.stone2, C.stone);
  box(g, x + 0.3, y + 0.3, x + 0.7, y + 0.7, 0.42, C.stone, C.stone2, C.stone);
  const pulse = 0.5 + 0.5 * Math.sin(now / (on ? 260 : 700));
  g.strokeStyle = `rgba(140,220,255,${on ? 0.9 : 0.45 + 0.2 * pulse})`; g.lineWidth = 1.5;
  gEllipse(g, x + 0.5, y + 0.5, 0.17, 0.43, 18); g.stroke();
  // คริสตัลลอย
  const bob = Math.sin(now / 600) * 0.04, top = P(x + 0.5, y + 0.5, 1.05 + bob), mid = P(x + 0.5, y + 0.5, 0.8 + bob), bot = P(x + 0.5, y + 0.5, 0.52 + bob), w = s * 0.13;
  glowAt(g, mid[0], mid[1], s * (on ? 1.5 : night ? 1 : 0.7), "120,200,255", on ? 0.55 + 0.25 * pulse : night ? 0.45 : 0.3);
  g.fillStyle = on ? "#bfeaff" : "#7fc6ee"; g.globalAlpha = 0.92;
  g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(mid[0] + w, mid[1]); g.lineTo(bot[0], bot[1]); g.lineTo(mid[0] - w, mid[1]); g.closePath(); g.fill();
  g.globalAlpha = 1;
  g.fillStyle = "rgba(255,255,255,.65)"; g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(mid[0] - w * 0.2, mid[1]); g.lineTo(mid[0] - w, mid[1]); g.closePath(); g.fill();
}

// ---------- โดมกำแพงเวท (ทับกรอบ Insomnia ใน air · จาง ไม่บังของ) ----------
export function domeGrow(now) {
  const e = lastFx("dome_on");
  return e ? ease(fxT(e, now, fx.dome_on)) : 1;
}
const HEX = Array.from({ length: 6 }, (_, i) => [Math.cos(i / 6 * TAU + Math.PI / 6), Math.sin(i / 6 * TAU + Math.PI / 6)]);
export function hexPath(g, cx, cy, r, sq = 1) {
  HEX.forEach(([a, b], i) => (i ? g.lineTo(cx + a * r, cy + b * r * sq) : g.moveTo(cx + a * r, cy + b * r * sq)));
  g.closePath();
}
export function drawDome(g, rect, k, alpha, now, lowQ) {
  if (!(k > 0.01 && alpha > 0.01)) return;
  const [x0, y0, x1, y1] = rect, cx = (x0 + x1 + 1) / 2, cy = (y0 + y1 + 1) / 2, rx = (x1 - x0 + 1) / 2 + 0.15, ry = (y1 - y0 + 1) / 2 + 0.15, H = 3.4 * k;
  const S = (u, v) => P(cx + rx * Math.cos(v) * Math.cos(u), cy + ry * Math.cos(v) * Math.sin(u), H * Math.sin(v));
  g.save();
  // เงาโดม (ผิวจาง ไล่บนสว่าง)
  const pts = [];
  for (let i = 0; i < 28; i++) for (let j = 0; j <= 6; j++) { const q = S(i / 28 * TAU, j / 6 * Math.PI / 2); pts.push([q[0], q[1]]); }
  const hl = hull(pts), apex = S(0, Math.PI / 2), foot = S(Math.PI / 2, 0);
  const gr = g.createLinearGradient(apex[0], apex[1], foot[0], foot[1]);
  gr.addColorStop(0, `rgba(190,235,255,${0.12 * alpha})`); gr.addColorStop(1, `rgba(90,170,255,${0.05 * alpha})`);
  g.beginPath(); hl.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath();
  g.fillStyle = gr; g.fill();
  g.strokeStyle = `rgba(170,225,255,${0.35 * alpha})`; g.lineWidth = 1.5; g.stroke();
  // วงฐาน
  g.beginPath();
  for (let i = 0; i <= 48; i++) { const q = S(i / 48 * TAU, 0); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }
  g.strokeStyle = `rgba(140,215,255,${0.5 * alpha})`; g.lineWidth = 2; g.stroke();
  // ลายหกเหลี่ยม (ผิวหน้าเข้มกว่าผิวหลัง) + ประกายวิ่ง
  if (!lowQ) {
    const rows = 6, glint = [];
    g.lineWidth = 1;
    for (const side of [-1, 1]) {
      g.beginPath();
      for (let j = 0; j < rows; j++) {
        const v = (j + 0.5) / rows * Math.PI / 2, n = Math.max(6, Math.round(30 * Math.cos(v)));
        for (let i = 0; i < n; i++) {
          const u = (i + (j % 2) * 0.5) / n * TAU;
          if (Math.sign(Math.sin(u)) !== side) continue;
          const [px, py, s] = S(u, v), r = s * 0.42 * (0.55 + 0.45 * Math.cos(v));
          hexPath(g, px, py, r, 0.55 + 0.45 * Math.sin(v));
          if (Math.sin(now / 700 + i * 1.7 + j * 2.3) > 0.9) glint.push([px, py, r, 0.55 + 0.45 * Math.sin(v)]);
        }
      }
      g.strokeStyle = `rgba(190,235,255,${(side > 0 ? 0.24 : 0.1) * alpha})`; g.stroke();
    }
    g.beginPath(); for (const [px, py, r, sq] of glint) hexPath(g, px, py, r, sq);
    g.fillStyle = `rgba(200,240,255,${0.14 * alpha})`; g.fill();
  }
  g.restore();
}
export function drawBarrier(g, x, y, now) {
  const h = 1.15 * domeGrow(now);
  if (h < 0.02) return;
  const sh = 0.5 + 0.5 * Math.sin(now / 320 + x * 0.9 + y * 0.7);
  box(g, x + 0.04, y + 0.04, x + 0.96, y + 0.96, h, `rgba(170,225,255,${0.22 + 0.1 * sh})`, `rgba(90,170,255,${0.28 + 0.1 * sh})`, `rgba(120,195,255,${0.24 + 0.1 * sh})`);
  // ลายหกเหลี่ยมบนหน้ากำแพง (ขอบที่หันหากล้อง y+1)
  const [, , s] = P(x + 0.5, y + 1);
  g.beginPath();
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    const zc = (row + 0.5) / 3 * h, xc = x + 0.18 + (col + (row % 2) * 0.5) * 0.3;
    if (xc > x + 0.9) continue;
    const c = P(xc, y + 0.96, zc);
    hexPath(g, c[0], c[1], s * 0.1, 0.9);
  }
  g.strokeStyle = `rgba(200,240,255,${0.35 + 0.25 * sh})`; g.lineWidth = 1; g.stroke();
  const m = P(x + 0.5, y + 0.5, h * 0.5);
  glowAt(g, m[0], m[1], s * 0.9, "120,200,255", 0.35 + 0.2 * sh);
}

// ---------- แผงไฟเมือง (กล่องเหล็กบนเสา · ไฟเขียว = เปิด / แดง = ดับ) ----------
export function drawSwitch(g, x, y, C, now) {
  const [bx, by, s] = P(x + 0.5, y + 0.55);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx, by, s * 0.2, s * 0.07, 0, 0, TAU); g.fill();
  const base = P(x + 0.5, y + 0.5), top = P(x + 0.5, y + 0.5, 0.62);
  g.strokeStyle = "#3a3d42"; g.lineWidth = Math.max(2, s * 0.05); g.beginPath(); g.moveTo(base[0], base[1]); g.lineTo(top[0], top[1]); g.stroke();
  box(g, x + 0.32, y + 0.4, x + 0.68, y + 0.62, 0.92, "#8a9098", "#5a6068", "#70767e", 0.56);
  const off = darkAt(x, y), e = lastFx("lights");
  const blink = !!e && e.x === x && e.y === y && fxT(e, now, fx.lights) < 1 && Math.sin(now / 45) > 0;
  const d = P(x + 0.42, y + 0.63, 0.66);
  g.fillStyle = "rgba(20,22,26,.6)"; g.fillRect(d[0] - s * 0.02, d[1] - s * 0.02, s * 0.18, s * 0.035);
  const lp = P(x + 0.5, y + 0.63, 0.8);
  g.fillStyle = blink ? "#ffffff" : off ? "#ff4a32" : "#50ff78"; g.beginPath(); g.arc(lp[0], lp[1], Math.max(1.5, s * 0.035), 0, TAU); g.fill();
  glowAt(g, lp[0], lp[1], s * 0.35, off ? "255,70,50" : "80,255,120", 0.55 + 0.25 * Math.sin(now / 400));
}

// ---------- ซากรถ (ผลักได้ · เลื่อนนุ่มตอนถูกผลัก) ----------
const WRECK_MS = 600;
export function drawWreck(g, x, y, now) {
  const w = LAST_FD && Array.isArray(LAST_FD.wrecks) ? LAST_FD.wrecks.find((o) => o.x === x && o.y === y) : null;
  const pos = w ? smooth(`wreck:${w.id}`, x, y, now, WRECK_MS) : { x, y };
  const seed = w ? String(w.id).split("").reduce((a, ch) => a + ch.charCodeAt(0), 0) : x * 7 + y;
  const hz = hash(seed, 5) < 0.6, mx = pos.x + 0.5, my = pos.y + 0.5;
  const [cx, cy, s] = P(mx, my + 0.05);
  g.fillStyle = "rgba(0,0,0,.4)"; g.beginPath(); g.ellipse(cx, cy, s * 0.48, s * 0.17, 0, 0, TAU); g.fill();
  // ซากรถเก๋งทิ้งร้าง (ออกแบบใหม่ 2026-11-10 — ผู้ใช้ถามว่า "อันนี้คืออะไร" = เดิมดูเป็นกล่อง): สีซีด 4 แบบ · ห้องโดยสารลาดมีกระจกร้าว
  //  ยางแบน 1 ล้อ · สนิมเป็นดวง · ไฟหน้าแตก · หญ้าขึ้นรอบล้อ
  const PAINT = [["#7fa8a2", "#557a75"], ["#b5503f", "#7c3226"], ["#d6c8a0", "#9c8f6a"], ["#6478a0", "#43547a"]][Math.floor(hash(seed, 9) * 4) % 4];
  const L = hz ? 0.44 : 0.25, Wd = hz ? 0.25 : 0.44; // ครึ่งความยาวตามแกน x / y
  const along = (u, v, z) => (hz ? P(mx + u, my + v, z) : P(mx + v, my + u, z)); // u = แนวยาวรถ · v = แนวขวาง
  // ล้อ (หลังตัวถัง — โผล่ใต้ขอบ)
  for (const [u, v] of [[-0.27, -1], [0.27, -1], [-0.27, 1], [0.27, 1]]) {
    const flat = u > 0 && v > 0 && hash(seed, 3) < 0.6;
    const p = along(u, v * (hz ? Wd : L) * 0.98, 0.07);
    g.fillStyle = "#16130f"; g.beginPath(); g.ellipse(p[0], p[1] + (flat ? s * 0.02 : 0), s * 0.09, s * (flat ? 0.04 : 0.06), 0, 0, TAU); g.fill();
    g.fillStyle = "#5a5650"; g.beginPath(); g.ellipse(p[0], p[1], s * 0.035, s * 0.025, 0, 0, TAU); g.fill();
  }
  // ตัวถังล่าง
  box(g, mx - (hz ? L : Wd), my - (hz ? Wd : L), mx + (hz ? L : Wd), my + (hz ? Wd : L), 0.3, PAINT[0], PAINT[1], shadeCol(PAINT[1], -0.1), 0.08);
  // ห้องโดยสารลาด: ฐานกว้าง → หลังคาแคบ · ด้านข้าง = กระจกดำอมฟ้า
  const cab = (u0, u1, v) => (hz // มุมเรียงแบบ box(): (x0,y0) (x1,y0) (x1,y1) (x0,y1)
    ? [[mx + u0, my - v], [mx + u1, my - v], [mx + u1, my + v], [mx + u0, my + v]]
    : [[mx - v, my + u0], [mx + v, my + u0], [mx + v, my + u1], [mx - v, my + u1]]);
  const base = cab(-0.2, 0.16, 0.22), top = cab(-0.12, 0.06, 0.17);
  const faces = frustum(g, base, 0.3, top, 0.52, "#2f3d48", PAINT[0], "rgba(0,0,0,.35)");
  // กระจกร้าว (เส้นขาวบางบนด้านที่หันกล้อง)
  g.strokeStyle = "rgba(220,235,245,.55)"; g.lineWidth = 1;
  for (const f of faces.slice(0, 2)) {
    const a = P((f.a[0] + f.b[0]) / 2, (f.a[1] + f.b[1]) / 2, 0.41);
    g.beginPath(); for (let k = 0; k < 4; k++) { const ang = hash(k, seed) * TAU; g.moveTo(a[0], a[1]); g.lineTo(a[0] + Math.cos(ang) * s * 0.06, a[1] + Math.sin(ang) * s * 0.04); } g.stroke();
  }
  // สนิม + ไฟหน้าแตก
  const R = rng(seed * 13 + 3);
  for (let i = 0; i < 5; i++) {
    const p = along((R() - 0.5) * L * 1.7, (R() - 0.5) * (hz ? Wd : L) * 1.6, 0.31);
    g.fillStyle = i % 2 ? "rgba(140,62,24,.75)" : "rgba(95,45,20,.6)";
    g.beginPath(); g.ellipse(p[0], p[1], s * (0.03 + R() * 0.05), s * (0.015 + R() * 0.02), R() * 3, 0, TAU); g.fill();
  }
  for (const v of [-0.6, 0.6]) { const h = along(L * 0.99, v * (hz ? Wd : L), 0.21); g.fillStyle = v < 0 ? "#e8e2c8" : "#2a2622"; g.beginPath(); g.arc(h[0], h[1], Math.max(1.5, s * 0.025), 0, TAU); g.fill(); }
  // หญ้าขึ้นรอบล้อ
  g.strokeStyle = "#5f7a34"; g.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    const p = along((R() - 0.5) * L * 2.1, (R() < 0.5 ? -1 : 1) * (hz ? Wd : L) * (1 + R() * 0.15), 0);
    g.beginPath(); g.moveTo(p[0] - 2, p[1]); g.lineTo(p[0], p[1] - s * 0.08); g.moveTo(p[0] + 2, p[1]); g.lineTo(p[0] + 1, p[1] - s * 0.06); g.stroke();
  }
}

// =================================================================== ขั้น 3: ลูกเล่นโจมตี (server/fodlan/stage6.js "ขั้น 3")
const ELEM = {
  fire: { rgb: "255,140,40", body: "#ff7a1c", hi: "#ffd27a", dark: "#a8360c" },
  ice: { rgb: "120,225,255", body: "#7fdcff", hi: "#eafcff", dark: "#2a7fb0" },
  thunder: { rgb: "185,130,255", body: "#b48cff", hi: "#fff6a0", dark: "#5a2fb0" },
};
export const elemOf = (k) => ELEM[k] || ELEM.fire;
export const objAt = (key, x, y) => (LAST_FD && Array.isArray(LAST_FD[key]) ? LAST_FD[key].find((o) => o.x === x && o.y === y) : null);
export const seedOf = (id) => String(id).split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
