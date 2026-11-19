// ============================================================
//  เรือดำน้ำ Nautilus จอดที่ท่า (GRID_PLAN §8.9 · ทุกชั้น 7–11) — ภาพ 3 มิติจากรูปทรงกลึง (หมุนกล้อง/มุมนกได้)
//  อิงภาพที่ผู้ใช้ส่ง (client/public/nautilus/nautilus_side.webp): ตัวเรือน้ำเงินเข้ม ขอบทอง หัวเจาะทองยาวที่หัวเรือ หอบังคับการ หน้าต่างกลม ใบพัดท้าย
//  fd.ship = { x, y, w, h } (server — ช่องเรือเป็นสิ่งกีดขวาง fd_nt_ship) · ใช้: shipItems(list, g, fd, info, now, lowQ) จาก items ของชั้น
//  ฉากคำสั่งเรือ (fd.fx): nt_refill · nt_torpedo · nt_ram · nt_light · nt_organ → shipFx(g, fd, info, now)
// ============================================================
import { P, depthOf, glow } from "../boardGeo";
import { fxT, fxOnce } from "./index";
import { playSfx, registerSounds } from "../../audio";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);

export const SHIP_FX = { nt_refill: 1600, nt_torpedo: 1800, nt_ram: 1500, nt_light: 2600, nt_organ: 3200 };
let SND = false;
// เอฟเฟคดังขึ้น (ผู้ใช้ 2026-11-19: "เร่งเพลง 1-4 เสียงเอฟเฟคด้วย") — เพดาน volume 1 อยู่ที่ audio.js
const NT_SFX_BOOST = 1.6;
function snd(k, gain = 1, delay = 0) {
  if (!SND) { SND = true; registerSounds(Object.fromEntries(["ping", "boom", "impact", "rush", "whoosh", "bubbles", "splash", "deepimpact"].map((n) => [`nts_${n}`, `/nautilus/sfx/${n}.mp3`]))); }
  const go = () => playSfx(`nts_${k}`, { gain: gain * NT_SFX_BOOST });
  if (delay > 0) setTimeout(go, delay); else go();
}

// รัศมีตัวเรือตามความยาว (u: 0 ท้าย → 1 หัว) — ท้ายเรียว หัวมน แล้วต่อหัวเจาะ
function hullR(u) {
  if (u < 0.08) return 0.18 + (u / 0.08) * 0.3;
  if (u > 0.86) return 0.48 * Math.sqrt(Math.max(0, 1 - (u - 0.86) / 0.14));
  return 0.48;
}
const COL = { hullTop: [28, 34, 58], hullBot: [26, 52, 98], gold: "#c9a24a", gold2: "#f0d68a", deck: "#1b2035", tower: "#202741" };
const shade = (c, k) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;

// ช่วงเวลาเด้งของเรือ (ลอยนิ่งในน้ำ) + ท่าพุ่ง (หัวเจาะ)
function shipPose(fd, now) {
  let dx = 0;
  for (const e of fd.fx || []) {
    if (e.kind !== "nt_ram") continue;
    const k = fxT(e, now, SHIP_FX.nt_ram);
    if (k < 1) dx = Math.sin(clamp(k / 0.5, 0, 1) * Math.PI) * (e.dist || 3) * (e.dir || 1) * (k < 0.5 ? 1 : 0.6);
  }
  return { bob: Math.sin(now / 1300) * 0.05, dx };
}

export function shipItems(list, g, fd, info, now, lowQ) {
  const s = fd && fd.ship;
  if (!s) return;
  const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
  // วาดเป็นชิ้นเดียว (ความลึกตรงกลางเรือ) — ตัวละครยืนข้างเรือยังเรียงถูกเกือบทุกมุม
  list.push({ d: depthOf(cx, cy), f: () => (shipImg() ? drawShipSprite(g, fd, s, now, lowQ) : drawShip(g, fd, s, now, lowQ)) });
}

// ---------- ภาพจริงของผู้ใช้ (ผู้ใช้ทัก 2026-11-19: โมเดลกลึง "ไม่ตรงปก") ----------
//  nautilus_side.webp 1200×325: หัวเจาะทางซ้าย · ตัวเรือ x 0.2–0.97 ของภาพ = ยาวท่าจอด · วางตามแนวท่าบนจอ (หมุนกล้องได้) + ย้อมสีใต้น้ำ
//  ของขยับซ้อน: ลอยขึ้นลง · หน้าต่างกะพริบ · ไฟหน้าเรือ · ฟองใบพัด · เงาบนพื้น
let IMG = null, TINT = null;
function shipImg() {
  if (TINT) return TINT;
  if (!IMG && typeof Image !== "undefined") { IMG = new Image(); IMG.onload = () => { const c = document.createElement("canvas"); c.width = IMG.width; c.height = IMG.height; const x = c.getContext("2d"); x.drawImage(IMG, 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = "rgba(10,60,80,.28)"; x.fillRect(0, 0, c.width, c.height); TINT = c; }; IMG.src = "/nautilus/nautilus_side.webp"; }
  return null;
}
const HULL0 = 0.2, HULL1 = 0.97; // ส่วนตัวเรือในภาพ (ไม่รวมหัวเจาะ)
const PORTS = [0.47, 0.52, 0.57, 0.62, 0.67, 0.72, 0.77, 0.82, 0.87]; // หน้าต่างกลางลำ (สัดส่วนความกว้างภาพ) แถว y 0.53
function drawShipSprite(g, fd, s, now, lowQ) {
  const img = TINT, { bob, dx } = shipPose(fd, now), cy = s.y + s.h / 2;
  const xw = s.x + 0.1 + dx, xe = s.x + s.w - 0.1 + dx, z = 0.3 + bob;
  const pw = P(xw, cy, z), pe = P(xe, cy, z), cs = (pw[2] + pe[2]) / 2;
  let vx = pw[0] - pe[0], vy = pw[1] - pe[1], L = Math.hypot(vx, vy);
  const minL = cs * (s.w - 0.2) * 0.55; if (L < minL) { const k = L > 0.01 ? minL / L : 0; vx = L > 0.01 ? vx * k : -minL; vy *= k; L = minL; }
  const W = L / (HULL1 - HULL0), H = W * img.height / img.width, flip = vx > 0; // ภาพหัวอยู่ซ้าย: ทิศตะวันตกบนจอไปทางขวา = กลับภาพ
  const ang = flip ? Math.atan2(vy, vx) : Math.atan2(vy, vx) - Math.PI;
  const ax = (pw[0] + pe[0]) / 2, ay = (pw[1] + pe[1]) / 2;
  // เงาบนพื้น
  const g0 = P((xw + xe) / 2, cy, 0);
  g.fillStyle = "rgba(0,10,16,.5)"; g.beginPath(); g.ellipse(g0[0], g0[1], L * 0.55, cs * 0.45, Math.atan2(vy, vx), 0, TAU); g.fill();
  g.save(); g.translate(ax, ay); g.rotate(ang); if (flip) g.scale(-1, 1);
  // จุดยึด: กลางตัวเรือ (สัดส่วน (HULL0+HULL1)/2) · ท้องเรือที่ y 0.93
  const ox = -W * (HULL0 + HULL1) / 2, oy = -H * 0.93;
  g.drawImage(img, ox, oy, W, H);
  // หน้าต่างกะพริบ (ไฟห้องในเรือ)
  for (const [i, u] of PORTS.entries()) {
    const fl = 0.6 + 0.4 * Math.sin(now / 280 + i * 1.9), px = ox + W * u, py = oy + H * 0.53;
    glow(g, px, py, H * 0.1, "255,214,140", 0.35 * fl);
  }
  // ไฟหน้าเรือ (โคมบนเสาหน้า)
  glow(g, ox + W * 0.49, oy + H * 0.29, H * 0.35, "255,245,210", 0.55 + 0.1 * Math.sin(now / 500));
  // ฟองจากใบพัดท้าย
  if (!lowQ) for (let i = 0; i < 10; i++) {
    const k = ((now / 1000) * 0.9 + i / 10) % 1, px = ox + W * (0.93 + k * 0.12), py = oy + H * (0.75 - k * 1.4);
    g.strokeStyle = `rgba(210,250,255,${0.65 * (1 - k)})`; g.lineWidth = 1; g.beginPath(); g.arc(px + Math.sin(i * 2 + now / 300) * H * 0.04, py, H * (0.025 + (i % 3) * 0.015), 0, TAU); g.stroke();
  }
  g.restore();
}

function drawShip(g, fd, s, now, lowQ) {
  const { bob, dx } = shipPose(fd, now);
  const len = s.w - 0.3, x0 = s.x + 0.15 + dx, cy = s.y + s.h / 2, zc = 0.62 + bob;
  const N = lowQ ? 14 : 22, M = 14;
  // เงาใต้เรือ + ทรายฟุ้ง
  const sh0 = P(x0 + len * 0.5, cy), sh1 = P(x0 + len, cy);
  g.fillStyle = "rgba(0,10,16,.5)"; g.beginPath(); g.ellipse(sh0[0], sh0[1], Math.abs(sh1[0] - sh0[0]) * 1.05 + sh0[2] * 0.3, sh0[2] * 0.5, 0, 0, TAU); g.fill();
  // ตัวเรือ: ผิวกลึง N×M แผ่น เรียงลึก (ด้านหลังก่อน)
  const ring = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, r = hullR(u), x = x0 + u * len, row = [];
    for (let j = 0; j <= M; j++) { const a = (j / M) * TAU; row.push({ y: cy + Math.cos(a) * r, z: zc + Math.sin(a) * r * 0.9, a }); }
    ring.push({ x, row });
  }
  const quads = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
    const a = ring[i].row[j], b = ring[i + 1].row[j], c = ring[i + 1].row[j + 1], d = ring[i].row[j + 1];
    const am = (a.a + d.a) / 2, up = Math.sin(am); // up > 0 = ด้านบน
    const mx = (ring[i].x + ring[i + 1].x) / 2, my = (a.y + c.y) / 2;
    quads.push({ dep: depthOf(mx, my) + up * 0.01, pts: [[ring[i].x, a.y, a.z], [ring[i + 1].x, b.y, b.z], [ring[i + 1].x, c.y, c.z], [ring[i].x, d.y, d.z]], up, side: Math.cos(am) });
  }
  quads.sort((p, q) => p.dep - q.dep);
  for (const q of quads) {
    const lit = 0.55 + 0.45 * clamp(q.up * 0.8 + 0.3 - q.side * 0.15, 0, 1);
    const base = q.up > -0.15 ? COL.hullTop : COL.hullBot;
    g.fillStyle = shade(base, lit + 0.25);
    g.beginPath(); q.pts.forEach(([x, y, z], k) => { const p = P(x, y, z); k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath(); g.fill();
  }
  // แถบทองแบ่งตัวเรือ (กลางลำ) + ขอบดาดฟ้า
  const line = (fn, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); for (let i = 0; i <= 30; i++) { const u = i / 30, p = fn(u); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke(); };
  const sc = P(x0 + len / 2, cy)[2];
  line((u) => P(x0 + u * len, cy + hullR(u) * 0.98, zc), COL.gold, Math.max(1.2, sc * 0.035));
  line((u) => P(x0 + u * len, cy - hullR(u) * 0.98, zc), COL.gold, Math.max(1.2, sc * 0.035));
  // ดาดฟ้าแบนด้านบน
  const dz = zc + 0.43;
  { const a = P(x0 + len * 0.12, cy - 0.16, dz), b = P(x0 + len * 0.84, cy - 0.16, dz), c = P(x0 + len * 0.84, cy + 0.16, dz), d = P(x0 + len * 0.12, cy + 0.16, dz);
    g.fillStyle = COL.deck; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill(); }
  // หน้าต่างกลมเรืองแสง 2 ข้างลำ
  for (let i = 0; i < 9; i++) for (const side of [-1, 1]) {
    const u = 0.18 + i * 0.075, p = P(x0 + u * len, cy + side * hullR(u) * 0.97, zc + 0.12);
    const flick = 0.75 + 0.25 * Math.sin(now / 300 + i * 1.7);
    glow(g, p[0], p[1], p[2] * 0.16, "255,214,130", 0.35 * flick);
    g.fillStyle = `rgba(255,224,150,${0.9 * flick})`; g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.035, p[2] * 0.03, 0, 0, TAU); g.fill();
  }
  // หอบังคับการ (กล่องมีมิติ) + ราวทอง + ไฟฉาย
  const tx = x0 + len * 0.55;
  box(g, tx - 0.55, cy - 0.2, tx + 0.55, cy + 0.2, dz, dz + 0.42, [32, 39, 66]);
  box(g, tx - 0.18, cy - 0.12, tx + 0.18, cy + 0.12, dz + 0.42, dz + 0.72, [36, 44, 74]);
  const ped = P(tx + 0.1, cy, dz + 0.72), pt = P(tx + 0.1, cy, dz + 1.05);
  g.strokeStyle = "#2a3150"; g.lineWidth = Math.max(1.5, sc * 0.04); g.beginPath(); g.moveTo(ped[0], ped[1]); g.lineTo(pt[0], pt[1]); g.stroke(); // กล้องเรือ
  line((u) => P(tx - 0.5 + u * 1.0, cy - 0.2, dz + 0.42 + 0.12), COL.gold2, 1);
  line((u) => P(tx - 0.5 + u * 1.0, cy + 0.2, dz + 0.42 + 0.12), COL.gold2, 1);
  const lamp = P(x0 + len * 0.78, cy, dz + 0.22);
  glow(g, lamp[0], lamp[1], lamp[2] * 0.5, "255,245,210", 0.55);
  // ป้ายอักษร N สีทองกลางลำ
  const np = P(x0 + len * 0.3, cy + hullR(0.3), zc + 0.18);
  g.fillStyle = COL.gold2; g.font = `700 ${Math.max(8, np[2] * 0.22) | 0}px serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("N", np[0], np[1]);
  // หัวเจาะทอง (กรวยยาวเลยหัวเรือ) + ฟันเลื่อยบนหัวเรือ
  const bx = x0 + len, tip = P(bx + 1.25, cy, zc - 0.05), r0 = P(bx - 0.05, cy - 0.2, zc), r1 = P(bx - 0.05, cy + 0.2, zc), r2 = P(bx - 0.05, cy, zc - 0.22);
  g.fillStyle = COL.gold; g.beginPath(); g.moveTo(r0[0], r0[1]); g.lineTo(tip[0], tip[1]); g.lineTo(r1[0], r1[1]); g.closePath(); g.fill();
  g.fillStyle = "#a07c30"; g.beginPath(); g.moveTo(r1[0], r1[1]); g.lineTo(tip[0], tip[1]); g.lineTo(r2[0], r2[1]); g.closePath(); g.fill();
  g.strokeStyle = COL.gold2; g.lineWidth = 1; g.beginPath(); g.moveTo(r0[0], r0[1]); g.lineTo(tip[0], tip[1]); g.stroke();
  // ใบพัดท้ายหมุน + ครีบหาง
  const pc = P(x0 - 0.12, cy, zc), spin = now / 90;
  g.fillStyle = COL.gold;
  for (let k = 0; k < 4; k++) {
    const a = spin + k * TAU / 4, q = P(x0 - 0.12, cy + Math.cos(a) * 0.32, zc + Math.sin(a) * 0.32);
    g.beginPath(); g.ellipse((pc[0] + q[0]) / 2, (pc[1] + q[1]) / 2, Math.max(2, Math.hypot(q[0] - pc[0], q[1] - pc[1]) / 2), pc[2] * 0.05, Math.atan2(q[1] - pc[1], q[0] - pc[0]), 0, TAU); g.fill();
  }
  const fin0 = P(x0 + 0.1, cy, zc + 0.15), fin1 = P(x0 - 0.15, cy, zc + 0.6), fin2 = P(x0 + 0.45, cy, zc + 0.2);
  g.fillStyle = "#1a2342"; g.beginPath(); g.moveTo(fin0[0], fin0[1]); g.lineTo(fin1[0], fin1[1]); g.lineTo(fin2[0], fin2[1]); g.closePath(); g.fill();
  // ฟองจากท้ายเรือ (ใบพัดปั่น)
  if (!lowQ) for (let i = 0; i < 8; i++) {
    const k = ((now / 1000) * 0.8 + i / 8) % 1, p = P(x0 - 0.3 - k * 0.6, cy + Math.sin(i * 2.1) * 0.15, zc + k * 1.6);
    g.strokeStyle = `rgba(210,250,255,${0.6 * (1 - k)})`; g.lineWidth = 1; g.beginPath(); g.arc(p[0], p[1], p[2] * (0.025 + (i % 3) * 0.012), 0, TAU); g.stroke();
  }
}
// กล่องมีมิติ (หน้าที่หันเข้ากล้องตาม depth) — col = [r,g,b]
function box(g, x0, y0, x1, y1, z0, z1, col) {
  const faces = [
    { pts: [[x0, y0], [x1, y0]], n: [0, -1] }, { pts: [[x1, y0], [x1, y1]], n: [1, 0] },
    { pts: [[x1, y1], [x0, y1]], n: [0, 1] }, { pts: [[x0, y1], [x0, y0]], n: [-1, 0] },
  ].map((f) => ({ ...f, dep: depthOf((f.pts[0][0] + f.pts[1][0]) / 2, (f.pts[0][1] + f.pts[1][1]) / 2) }));
  faces.sort((a, b) => a.dep - b.dep);
  for (const f of faces) {
    const [[ax, ay], [bx, by]] = f.pts, a = P(ax, ay, z0), b = P(bx, by, z0), c = P(bx, by, z1), d = P(ax, ay, z1);
    g.fillStyle = shade(col, f.n[1] > 0 || f.n[0] > 0 ? 1.2 : 0.85);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill();
  }
  const t = [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)];
  g.fillStyle = shade(col, 1.45); g.beginPath(); t.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
}

// ---------- ฉากคำสั่งเรือ (ทับตัวละคร) ----------
export function shipFx(g, fd, info, now) {
  const s = fd && fd.ship;
  if (!s) return;
  for (const e of fd.fx || []) {
    if (!SHIP_FX[e.kind]) continue;
    const k = fxT(e, now, SHIP_FX[e.kind]);
    if (fxOnce(e)) {
      if (e.kind === "nt_torpedo") { snd("whoosh", 0.8); snd("rush", 0.6, 150); snd("impact", 1, 900); }
      else if (e.kind === "nt_ram") { snd("rush", 1); snd("deepimpact", 1, 600); }
      else if (e.kind === "nt_light") snd("ping", 0.8);
      else if (e.kind === "nt_refill") { snd("bubbles", 1); }
      else if (e.kind === "nt_organ") snd("ping", 0.5);
    }
    if (k >= 1) continue;
    if (e.kind === "nt_torpedo") torpedo(g, e, k, now);
    else if (e.kind === "nt_light") searchlight(g, s, e, k);
    else if (e.kind === "nt_refill") refill(g, e, k, now);
    else if (e.kind === "nt_organ") organ(g, s, k, now);
  }
}
function torpedo(g, e, k, now) {
  const path = e.path || []; if (path.length < 2) return;
  const a = path[0], b = path[path.length - 1], u = easeOut(clamp(k / 0.5, 0, 1));
  const x = lerp(a.x + 0.5, b.x + 0.5, u), y = lerp(a.y + 0.5, b.y + 0.5, u);
  if (k < 0.5) {
    const p = P(x, y, 0.5), q = P(lerp(a.x + 0.5, b.x + 0.5, Math.max(0, u - 0.06)), lerp(a.y + 0.5, b.y + 0.5, Math.max(0, u - 0.06)), 0.5);
    g.strokeStyle = "#c9a24a"; g.lineWidth = p[2] * 0.12; g.lineCap = "round"; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(p[0], p[1]); g.stroke(); g.lineCap = "butt";
    for (let i = 1; i < 10; i++) { const t = Math.max(0, u - i * 0.03), r = P(lerp(a.x + 0.5, b.x + 0.5, t), lerp(a.y + 0.5, b.y + 0.5, t), 0.5 + i * 0.03); g.strokeStyle = `rgba(210,250,255,${0.6 - i * 0.05})`; g.lineWidth = 1; g.beginPath(); g.arc(r[0], r[1], r[2] * 0.03 * (1 + i * 0.2), 0, TAU); g.stroke(); }
  } else {
    const kk = (k - 0.5) / 0.5, p = P(b.x + 0.5, b.y + 0.5, 0.4);
    glow(g, p[0], p[1], p[2] * (0.6 + kk * 1.6), "255,220,150", 0.9 * (1 - kk));
    g.strokeStyle = `rgba(220,250,255,${1 - kk})`; g.lineWidth = 2; g.beginPath(); g.ellipse(p[0], p[1], p[2] * (0.3 + kk * 1.8), p[2] * (0.15 + kk * 0.8), 0, 0, TAU); g.stroke();
  }
  void now;
}
function searchlight(g, s, e, k) {
  const a = Math.min(1, k / 0.1, (1 - k) / 0.2), dir = e.dir || { x: 0, y: 1 }, ox = s.x + s.w * 0.75, oy = s.y + s.h / 2;
  const len = 9, wid = 0.35, nx = -dir.y, ny = dir.x;
  const o = P(ox, oy, 1.3), p1 = P(ox + dir.x * len + nx * len * wid, oy + dir.y * len + ny * len * wid, 0), p2 = P(ox + dir.x * len - nx * len * wid, oy + dir.y * len - ny * len * wid, 0);
  g.save(); g.globalCompositeOperation = "lighter";
  const gr = g.createLinearGradient(o[0], o[1], (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2);
  gr.addColorStop(0, `rgba(255,245,210,${0.55 * a})`); gr.addColorStop(1, "rgba(255,245,210,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(o[0], o[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.closePath(); g.fill();
  g.restore();
}
function refill(g, e, k, now) {
  const p = P((e.x ?? 0) + 0.5, (e.y ?? 0) + 0.5, 0.5);
  for (let i = 0; i < 10; i++) {
    const t = (k * 1.5 + i / 10) % 1, q = [p[0] + Math.sin(i * 2.3 + now / 200) * p[2] * 0.3, p[1] - t * p[2] * 1.4];
    g.strokeStyle = `rgba(180,250,255,${0.8 * (1 - t)})`; g.lineWidth = 1.3; g.beginPath(); g.arc(q[0], q[1], p[2] * (0.04 + (i % 3) * 0.02), 0, TAU); g.stroke();
  }
  glow(g, p[0], p[1], p[2] * 0.8, "120,230,255", 0.5 * (1 - k));
}
function organ(g, s, k, now) {
  const p = P(s.x + s.w * 0.5, s.y + s.h / 2, 1.6);
  for (let i = 0; i < 3; i++) {
    const kk = (k * 1.5 - i * 0.2); if (kk <= 0 || kk >= 1) continue;
    g.strokeStyle = `rgba(255,220,150,${0.5 * (1 - kk)})`; g.lineWidth = 2; g.beginPath(); g.ellipse(p[0], p[1], p[2] * (0.5 + kk * 5), p[2] * (0.25 + kk * 2.2), 0, 0, TAU); g.stroke();
  }
  // โน้ตเพลงลอย (สัญลักษณ์ ไม่ใช่ข้อความอธิบาย)
  g.fillStyle = `rgba(255,230,170,${1 - k})`; g.font = `${Math.round(p[2] * 0.4)}px serif`; g.textAlign = "center";
  for (let i = 0; i < 4; i++) g.fillText(i % 2 ? "♪" : "♫", p[0] + Math.sin(now / 400 + i * 1.6) * p[2] * (0.6 + i * 0.3), p[1] - k * p[2] * 2 - i * p[2] * 0.3);
}
