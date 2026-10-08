// ============================================================
//  ของบนกระดานรายภูมิภาค (GRID_PLAN §3 / §3.1)
//   - สิ่งกีดขวาง (map.terrain) — วาดทุกเฟรม เรียงความลึกกับตัวละคร (drawObstacle)
//   - ช่องพิเศษที่ยืนได้ (map.special) — ฐานอบลงชั้นพื้น (bakeSpecial) + ขยับเบาๆ ทุกเฟรม (animSpecial)
//   - จุดฟื้นฟู (map.heal) — ด่าน I = วงเวท (boardDraw) · ด่าน V = โอเอซิส · ด่านอื่น = แท่นฟื้นฟูสีประจำด่าน
//  ทุกฟังก์ชันวาดในพิกัดตรรกะ · s = ขนาดช่องบนจอ ณ ตำแหน่งนั้น (จาก project)
// ============================================================
import { P, PA, faceVisible, gEllipse, gPoly, glow, hexA, quad, rng, viewAxes } from "./boardGeo";

const TAU = Math.PI * 2;

function shadow(g, x, y, rx, ry, C) {
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
}

// =================================================================== ภูมิภาค I (จากต้นแบบ)
export function drawTree(g, x, y, s, C) {
  shadow(g, x, y, s * 0.42, s * 0.14, C);
  g.fillStyle = C.trunk; g.fillRect(x - s * 0.06, y - s * 0.55, s * 0.12, s * 0.55);
  const blob = (dx, dy, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill(); };
  blob(-0.2, -0.75, 0.3, C.c2); blob(0.2, -0.72, 0.3, C.c2); blob(0, -0.98, 0.36, C.c1); blob(-0.08, -1.08, 0.16, C.c3);
}
function drawPillar(g, x, y, C, now) {
  const [bx, by, s] = PA(x, y, 0.05);
  const w = s * 0.36, h = s * 1.7;
  shadow(g, bx + s * 0.1, by, s * 0.4, s * 0.13, C);
  g.fillStyle = "#cfc8b4"; g.fillRect(bx - w * 0.75, by - s * 0.14, w * 1.5, s * 0.14);
  g.fillStyle = "#f6f4ee"; g.fillRect(bx - w / 2, by - h, w, h - s * 0.12);
  g.fillStyle = "#dcd6c6"; g.fillRect(bx, by - h, w / 2, h - s * 0.12);
  g.fillStyle = "#d9a93f"; g.fillRect(bx - w / 2, by - h * 0.62, w, s * 0.05);
  g.fillStyle = "#e8e2d2"; g.fillRect(bx - w * 0.7, by - h - s * 0.08, w * 1.4, s * 0.1);
  const cy = by - h - s * 0.32 + Math.sin(now / 700 + x) * s * 0.03;
  glow(g, bx, cy, s * 0.55, "160,215,255", C.crystal);
  g.fillStyle = "#bfe1fa"; g.beginPath(); g.moveTo(bx, cy - s * 0.2); g.lineTo(bx + s * 0.11, cy); g.lineTo(bx, cy + s * 0.2); g.lineTo(bx - s * 0.11, cy); g.closePath(); g.fill();
  g.fillStyle = "#7fb8e6"; g.beginPath(); g.moveTo(bx, cy - s * 0.2); g.lineTo(bx + s * 0.11, cy); g.lineTo(bx, cy + s * 0.2); g.closePath(); g.fill();
}
function drawBanner(g, x, y, color, C, now) {
  const [bx, by, s] = PA(x, y, 0);
  shadow(g, bx, by, s * 0.3, s * 0.1, C);
  g.strokeStyle = "#8a7a5a"; g.lineWidth = Math.max(2, s * 0.06); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by - s * 2.6); g.stroke();
  g.fillStyle = "#d9a93f"; g.beginPath(); g.arc(bx, by - s * 2.62, s * 0.07, 0, TAU); g.fill();
  const top = by - s * 2.45, w = s * 0.62, h = s * 1.5, sway = Math.sin(now / 900 + x) * s * 0.04;
  g.fillStyle = color; g.beginPath(); g.moveTo(bx - w / 2, top); g.lineTo(bx + w / 2, top);
  g.lineTo(bx + w / 2 + sway, top + h); g.lineTo(bx + sway, top + h - s * 0.22); g.lineTo(bx - w / 2 + sway, top + h); g.closePath(); g.fill();
  g.fillStyle = "#f0c868"; g.fillRect(bx - w / 2, top, w, s * 0.1);
  g.fillStyle = "#d9a93f"; const dy = top + h * 0.45;
  g.beginPath(); g.moveTo(bx + sway * 0.5, dy - s * 0.15); g.lineTo(bx + s * 0.1 + sway * 0.5, dy); g.lineTo(bx + sway * 0.5, dy + s * 0.15); g.lineTo(bx - s * 0.1 + sway * 0.5, dy); g.closePath(); g.fill();
}
function drawHedge(g, x, y, C) {
  const [bx, by, s] = PA(x, y, 0.05);
  shadow(g, bx, by, s * 0.5, s * 0.15, C);
  const blob = (dx, dy, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(bx + dx * s, by + dy * s, r * s, 0, TAU); g.fill(); };
  blob(-0.22, -0.2, 0.26, C.c2); blob(0.22, -0.2, 0.26, C.c2); blob(0, -0.32, 0.3, C.c1); blob(-0.06, -0.42, 0.13, C.c3);
  const R = rng(x * 31 + y * 7 + 1);
  for (let i = 0; i < 6; i++) { g.fillStyle = C.dots[i % 3]; g.beginPath(); g.arc(bx + (R() - 0.5) * s * 0.7, by - s * (0.15 + R() * 0.35), s * 0.035, 0, TAU); g.fill(); }
}

// =================================================================== ก้อนหิน (ทุกภูมิภาค · ชนิดที่ไม่รู้จักก็ใช้อันนี้)
//  สีตามภูมิภาค: hue/ความสว่าง + ของประดับบนหิน (มอส ดอกไม้ ฟองคลื่น หิมะ คริสตัล)
const ROCK = {
  1: { h: 210, sat: 8, l: 0, top: "moss" },
  2: { h: 200, sat: 6, l: 2, top: "flower" },
  3: { h: 265, sat: 10, l: -12, top: "rot" },
  4: { h: 205, sat: 14, l: -10, top: "foam" },
  5: { h: 32, sat: 38, l: 4, top: "none" },
  6: { h: 212, sat: 14, l: -2, top: "snow" },
  7: { h: 275, sat: 12, l: -24, top: "shard" },
};
function drawRock(g, x, y, area, night, now) {
  const v = ROCK[area] || ROCK[1];
  const [cx, cy, s] = PA(x, y, 0.05);
  if (v.top === "foam") {
    gEllipse(g, x + 0.5, y + 0.55, 0.47, 0, 28); g.fillStyle = night ? "rgba(120,190,230,.18)" : "rgba(255,255,255,.22)"; g.fill();
    g.strokeStyle = night ? "rgba(190,230,255,.55)" : "rgba(255,255,255,.85)"; g.lineWidth = 1.6;
    g.save(); g.setLineDash([5, 4]); g.lineDashOffset = -now / 140; g.stroke(); g.restore();
  }
  g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(cx, cy + s * 0.04, s * 0.48, s * 0.2, 0, 0, TAU); g.fill();
  const dl = (night ? -16 : 0) + v.l;
  const blob = (bx, by, rx, ry, l) => {
    const rg = g.createRadialGradient(bx - rx * 0.35, by - ry * 0.45, rx * 0.1, bx, by, rx * 1.1);
    rg.addColorStop(0, `hsl(${v.h},${v.sat}%,${l + 22 + dl}%)`); rg.addColorStop(0.6, `hsl(${v.h},${v.sat + 1}%,${l + dl}%)`); rg.addColorStop(1, `hsl(${v.h + 5},${v.sat + 4}%,${l - 14 + dl}%)`);
    g.fillStyle = rg; g.beginPath(); g.ellipse(bx, by, rx, ry, 0, 0, TAU); g.fill();
  };
  blob(cx + s * 0.14, cy - s * 0.16, s * 0.26, s * 0.22, 44);
  blob(cx - s * 0.08, cy - s * 0.26, s * 0.34, s * 0.32, 52);
  const tx = cx - s * 0.12, ty = cy - s * 0.5;
  if (v.top === "moss" || v.top === "flower") {
    g.fillStyle = night ? "rgba(60,100,70,.6)" : "rgba(90,140,70,.6)"; g.beginPath(); g.ellipse(cx - s * 0.14, cy - s * 0.48, s * 0.12, s * 0.04, -0.3, 0, TAU); g.fill();
    if (v.top === "flower") {
      [["#f27fae", -0.2, -0.5], ["#ffd84d", -0.08, -0.53], ["#ffffff", 0.2, -0.33]].forEach(([c, dx, dy]) => {
        g.fillStyle = night ? "#e8d8e8" : c; g.beginPath(); g.arc(cx + dx * s, cy + dy * s, s * 0.035, 0, TAU); g.fill();
      });
    }
  } else if (v.top === "rot") {
    g.fillStyle = night ? "rgba(120,200,120,.5)" : "rgba(110,140,70,.7)";
    g.beginPath(); g.ellipse(tx, ty + s * 0.02, s * 0.14, s * 0.045, -0.3, 0, TAU); g.fill();
    g.strokeStyle = g.fillStyle; g.lineWidth = Math.max(1, s * 0.02);
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(tx - s * 0.08 + i * s * 0.08, ty + s * 0.03); g.lineTo(tx - s * 0.09 + i * s * 0.08, ty + s * 0.16 + i * s * 0.03); g.stroke(); }
  } else if (v.top === "snow") {
    g.fillStyle = night ? "#c9d8ee" : "#ffffff";
    g.beginPath(); g.ellipse(cx - s * 0.08, cy - s * 0.48, s * 0.28, s * 0.12, 0, Math.PI, TAU); g.quadraticCurveTo(cx + s * 0.05, cy - s * 0.4, cx - s * 0.36, cy - s * 0.46); g.fill();
    g.beginPath(); g.ellipse(cx + s * 0.15, cy - s * 0.33, s * 0.18, s * 0.07, 0, Math.PI, TAU); g.fill();
  } else if (v.top === "shard") {
    g.fillStyle = "#b07bff"; g.beginPath(); g.moveTo(cx + s * 0.02, cy - s * 0.45); g.lineTo(cx + s * 0.09, cy - s * 0.78); g.lineTo(cx + s * 0.15, cy - s * 0.42); g.closePath(); g.fill();
    glow(g, cx + s * 0.09, cy - s * 0.58, s * 0.3, "190,130,255", night ? 0.45 : 0.25);
  }
}

// =================================================================== ภูมิภาค II ทุ่งดอกไม้
function drawWindmill(g, x, y, C, night, now) {
  const [bx, by, s] = PA(x, y, 0.1);
  shadow(g, bx + s * 0.08, by, s * 0.42, s * 0.14, C);
  const h = s * 1.2, wb = s * 0.5, wt = s * 0.3, top = by - h;
  g.fillStyle = night ? "#b5ae9f" : "#f3ead6";
  g.beginPath(); g.moveTo(bx - wb / 2, by); g.lineTo(bx - wt / 2, top); g.lineTo(bx + wt / 2, top); g.lineTo(bx + wb / 2, by); g.closePath(); g.fill();
  g.fillStyle = night ? "#918a7c" : "#dccfb2";
  g.beginPath(); g.moveTo(bx + s * 0.04, by); g.lineTo(bx + s * 0.03, top); g.lineTo(bx + wt / 2, top); g.lineTo(bx + wb / 2, by); g.closePath(); g.fill();
  g.fillStyle = "#7a5232"; g.beginPath(); g.moveTo(bx - s * 0.07, by); g.lineTo(bx - s * 0.07, by - s * 0.2); g.arc(bx, by - s * 0.2, s * 0.07, Math.PI, 0); g.lineTo(bx + s * 0.07, by); g.closePath(); g.fill();
  g.fillStyle = night ? "#ffcf6e" : "#7fb8e6"; g.fillRect(bx - s * 0.045, by - h * 0.6, s * 0.09, s * 0.11);
  if (night) glow(g, bx, by - h * 0.55, s * 0.4, "255,207,110", 0.3);
  // หลังคา
  g.fillStyle = "#b5523b"; g.beginPath(); g.moveTo(bx - wt / 2 - s * 0.06, top); g.lineTo(bx, top - s * 0.3); g.lineTo(bx + wt / 2 + s * 0.06, top); g.closePath(); g.fill();
  g.fillStyle = "#8f3d2c"; g.beginPath(); g.moveTo(bx, top - s * 0.3); g.lineTo(bx + wt / 2 + s * 0.06, top); g.lineTo(bx, top); g.closePath(); g.fill();
  // ใบพัด (หมุนช้าๆ)
  windmillSails(g, bx, top + s * 0.02, s * 0.72, now / 1500 + x, night, Math.max(1.2, s * 0.03));
}
// ใบพัดกังหัน 4 ใบ — ใช้ทั้งสิ่งกีดขวางและฉากหลังด่าน II
export function windmillSails(g, hx, hy, L, rot, night, lw) {
  const wood = night ? "#4a3a2c" : "#6b4630", sail = night ? "rgba(196,196,214,.88)" : "rgba(252,248,238,.95)";
  for (let k = 0; k < 4; k++) {
    const a = rot + k * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
    const p = (d, o) => [hx + ca * d * L + nx * o * L, hy + sa * d * L + ny * o * L];
    const q = [p(0.16, 0.02), p(1, 0.02), p(1, 0.24), p(0.2, 0.2)];
    g.fillStyle = sail; g.beginPath(); q.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); g.fill();
    g.strokeStyle = wood; g.lineWidth = lw * 0.6;
    for (const d of [0.4, 0.6, 0.8]) { const [ax, ay] = p(d, 0.02), [bx2, by2] = p(d, 0.23); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx2, by2); g.stroke(); }
    g.lineWidth = lw; g.beginPath(); g.moveTo(hx, hy); const [tx, ty] = p(1.02, 0); g.lineTo(tx, ty); g.stroke();
  }
  g.fillStyle = wood; g.beginPath(); g.arc(hx, hy, lw * 1.6, 0, TAU); g.fill();
}
// รั้วไม้ — ต่อกันตามช่องข้างเคียงที่เป็นรั้วเหมือนกัน (conn)
function drawFence(g, x, y, conn, C, night) {
  const wood = night ? "#6e5440" : "#b07a4f", dark = night ? "#4a3829" : "#7a5232";
  const horiz = conn.l || conn.r || !(conn.u || conn.d), vert = conn.u || conn.d;
  const [gx, gy, s] = PA(x, y, 0.05);
  shadow(g, gx, gy, s * 0.42, s * 0.1, C);
  const post = (px, py) => {
    const a = P(px, py, 0), b = P(px, py, 0.55);
    g.strokeStyle = dark; g.lineWidth = Math.max(2.5, a[2] * 0.09); g.lineCap = "round"; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.strokeStyle = wood; g.lineWidth = Math.max(1.5, a[2] * 0.06); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1] + 1); g.stroke();
    g.lineCap = "butt";
  };
  const rail = (ax, ay, bx2, by2) => {
    for (const z of [0.2, 0.42]) {
      const a = P(ax, ay, z), b = P(bx2, by2, z);
      g.strokeStyle = dark; g.lineWidth = Math.max(2.5, a[2] * 0.065); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      g.strokeStyle = wood; g.lineWidth = Math.max(1.2, a[2] * 0.035); g.beginPath(); g.moveTo(a[0], a[1] - 0.5); g.lineTo(b[0], b[1] - 0.5); g.stroke();
    }
  };
  if (vert) {
    rail(x + 0.5, conn.u ? y : y + 0.1, x + 0.5, conn.d ? y + 1 : y + 0.9);
    for (const v of [0.12, 0.5, 0.88]) post(x + 0.5, y + v);
  }
  if (horiz) {
    rail(conn.l ? x : x + 0.1, y + 0.5, conn.r ? x + 1 : x + 0.9, y + 0.5);
    for (const u of [0.12, 0.5, 0.88]) post(x + u, y + 0.5);
  }
}

// =================================================================== ภูมิภาค III ป่าไม้ต้องสาป
function drawDeadTree(g, x, y, C, night, now) {
  const [bx, by, s] = PA(x, y, 0.12);
  shadow(g, bx, by, s * 0.44, s * 0.14, C);
  deadTreeShape(g, bx, by, s, x * 53 + y * 17 + 3, night, now, x + y * 0.7);
}
// ต้นไม้ตายบิดเบี้ยว (พิกัดจอ) · eyeSeed = null → ไม่มีตาในโพรง (ใช้เป็นฉากรอบนอก)
export function deadTreeShape(g, bx, by, s, seed, night, now, eyeSeed) {
  const R = rng(seed);
  const bark = night ? "#2b2434" : "#4a3f50", hi = night ? "#3d344a" : "#66596c";
  const h = s * 1.1, lean = (R() - 0.5) * s * 0.22, tx = bx + lean, ty = by - h;
  // รากแผ่
  g.strokeStyle = bark; g.lineCap = "round";
  for (const d of [-1, 1]) { g.lineWidth = s * 0.07; g.beginPath(); g.moveTo(bx + d * s * 0.05, by - s * 0.12); g.quadraticCurveTo(bx + d * s * 0.18, by - s * 0.02, bx + d * s * 0.3, by + s * 0.02); g.stroke(); }
  g.fillStyle = bark; g.beginPath();
  g.moveTo(bx - s * 0.15, by); g.quadraticCurveTo(bx - s * 0.02, by - h * 0.5, tx - s * 0.06, ty);
  g.lineTo(tx + s * 0.05, ty); g.quadraticCurveTo(bx + s * 0.1, by - h * 0.5, bx + s * 0.16, by); g.closePath(); g.fill();
  g.strokeStyle = hi; g.lineWidth = Math.max(1, s * 0.025); g.beginPath(); g.moveTo(bx - s * 0.08, by - s * 0.05); g.quadraticCurveTo(bx - s * 0.02, by - h * 0.5, tx - s * 0.03, ty + s * 0.05); g.stroke();
  // กิ่งบิดเบี้ยว
  const branch = (x0, y0, ang, len, w, depth) => {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    const mx = (x0 + x1) / 2 + (R() - 0.5) * len * 0.5, my = (y0 + y1) / 2 + (R() - 0.5) * len * 0.4;
    g.strokeStyle = bark; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, x1, y1); g.stroke();
    if (depth > 0) {
      branch(x1, y1, ang - 0.45 - R() * 0.35, len * 0.66, w * 0.6, depth - 1);
      branch(x1, y1, ang + 0.4 + R() * 0.35, len * 0.6, w * 0.58, depth - 1);
    }
  };
  branch(tx, ty + s * 0.02, -Math.PI / 2 - 0.55, s * 0.4, s * 0.085, 2);
  branch(tx, ty + s * 0.02, -Math.PI / 2 + 0.6, s * 0.38, s * 0.08, 2);
  branch(bx + lean * 0.5, by - h * 0.55, -Math.PI / 2 - 1.15, s * 0.28, s * 0.06, 1);
  g.lineCap = "butt";
  if (eyeSeed == null) return;
  // โพรงไม้ + ตาเรืองแสง (กะพริบเป็นพักๆ)
  const ex = bx + lean * 0.45, ey = by - h * 0.5;
  g.fillStyle = night ? "#0c0910" : "#241c28"; g.beginPath(); g.ellipse(ex, ey, s * 0.07, s * 0.1, 0, 0, TAU); g.fill();
  const blink = ((now / 1000 + eyeSeed * 1.7) % 5) < 0.18;
  if (!blink) {
    const col = night ? "#c6ff6a" : "#ffb347";
    if (night) glow(g, ex, ey, s * 0.26, "190,255,110", 0.4);
    g.fillStyle = col;
    g.beginPath(); g.ellipse(ex - s * 0.03, ey - s * 0.02, s * 0.018, s * 0.012, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(ex + s * 0.03, ey - s * 0.02, s * 0.018, s * 0.012, 0, 0, TAU); g.fill();
  }
}
function mushroom(g, x, y, r, cap, night) {
  g.fillStyle = night ? "#cfc8d8" : "#efe6d6"; g.fillRect(x - r * 0.25, y - r * 1.1, r * 0.5, r * 1.1);
  if (night) glow(g, x, y - r * 1.1, r * 3, cap === "#5fe0d0" ? "95,224,208" : "200,140,255", 0.45);
  g.fillStyle = cap; g.beginPath(); g.ellipse(x, y - r * 1.1, r, r * 0.65, 0, Math.PI, TAU); g.fill();
  g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(x - r * 0.35, y - r * 1.35, r * 0.14, 0, TAU); g.fill();
}
function drawStump(g, x, y, C, night) {
  const [bx, by, s] = PA(x, y, 0.08);
  shadow(g, bx, by + s * 0.02, s * 0.44, s * 0.15, C);
  const r = s * 0.3, ry = r * 0.42, h = s * 0.34, bark = night ? "#3a2e2a" : "#5e463a", barkD = night ? "#2a201d" : "#47342b";
  // ราก
  g.fillStyle = barkD;
  for (const d of [-1, 1]) { g.beginPath(); g.moveTo(bx + d * r * 0.7, by - s * 0.12); g.lineTo(bx + d * r * 1.35, by + s * 0.03); g.lineTo(bx + d * r * 0.55, by + s * 0.02); g.closePath(); g.fill(); }
  g.fillStyle = bark; g.beginPath(); g.ellipse(bx, by, r, ry, 0, 0, Math.PI); g.lineTo(bx - r, by - h); g.lineTo(bx + r, by - h); g.closePath(); g.fill();
  g.fillRect(bx - r, by - h, r * 2, h);
  g.fillStyle = barkD; g.fillRect(bx + r * 0.3, by - h, r * 0.7, h); g.beginPath(); g.ellipse(bx, by, r, ry, 0, 0, Math.PI * 0.5); g.lineTo(bx + r * 0.3, by); g.fill();
  g.strokeStyle = barkD; g.lineWidth = 1;
  for (const u of [-0.6, -0.2, 0.15]) { g.beginPath(); g.moveTo(bx + u * r, by - h + 2); g.lineTo(bx + u * r, by + ry * 0.6); g.stroke(); }
  g.fillStyle = night ? "#8d7458" : "#c9a679"; g.beginPath(); g.ellipse(bx, by - h, r, ry, 0, 0, TAU); g.fill();
  g.strokeStyle = night ? "#6a563f" : "#a58556"; g.lineWidth = 1;
  for (const k of [0.75, 0.5, 0.25]) { g.beginPath(); g.ellipse(bx, by - h, r * k, ry * k, 0, 0, TAU); g.stroke(); }
  mushroom(g, bx - r * 0.95, by - s * 0.02, s * 0.07, "#b07ad8", night);
  mushroom(g, bx + r * 0.85, by + s * 0.01, s * 0.055, "#5fe0d0", night);
}

// =================================================================== ภูมิภาค IV คลื่นวงวนน้ำ
function waterRing(g, x, y, r, night, now) {
  gEllipse(g, x + 0.5, y + 0.55, r, 0, 28); g.fillStyle = night ? "rgba(90,170,210,.2)" : "rgba(170,235,245,.35)"; g.fill();
  g.strokeStyle = night ? "rgba(190,230,255,.5)" : "rgba(255,255,255,.85)"; g.lineWidth = 1.5;
  g.save(); g.setLineDash([6, 4]); g.lineDashOffset = -now / 160; g.stroke(); g.restore();
}
function drawReef(g, x, y, C, night, now) {
  waterRing(g, x, y, 0.46, night, now);
  const [bx, by, s] = PA(x, y, 0.1);
  const R = rng(x * 41 + y * 29 + 11);
  if (night) glow(g, bx, by - s * 0.35, s * 0.7, "255,120,190", 0.22);
  // ปะการังสมอง
  g.fillStyle = night ? "#a77a4a" : "#e9b26a"; g.beginPath(); g.ellipse(bx + s * 0.18, by - s * 0.02, s * 0.2, s * 0.17, 0, Math.PI, TAU); g.fill();
  g.strokeStyle = night ? "#80583a" : "#c98d45"; g.lineWidth = 1;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(bx + s * 0.18, by - s * 0.02, s * (0.06 + i * 0.045), Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  // ปะการังกิ่ง
  const cols = night ? ["#d0608a", "#d07a4a", "#9a6ad0"] : ["#ff6f96", "#ff9a5a", "#b47ae0"];
  const branchy = (ox, h, col, n) => {
    g.strokeStyle = col; g.fillStyle = col; g.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.42 + (R() - 0.5) * 0.2, L = h * (0.7 + R() * 0.3);
      const ex = bx + ox + Math.cos(a) * L * 0.55, ey = by - s * 0.04 + Math.sin(a) * L;
      g.lineWidth = Math.max(2, s * 0.06); g.beginPath(); g.moveTo(bx + ox, by - s * 0.04); g.quadraticCurveTo(bx + ox + Math.cos(a) * L * 0.1, ey + L * 0.4, ex, ey); g.stroke();
      g.beginPath(); g.arc(ex, ey, s * 0.045, 0, TAU); g.fill();
    }
    g.lineCap = "butt";
  };
  branchy(-s * 0.16, s * 0.62, cols[0], 4);
  branchy(s * 0.02, s * 0.42, cols[1], 3);
  branchy(-s * 0.32, s * 0.32, cols[2], 2);
}
function drawWreck(g, x, y, C, night, now) {
  waterRing(g, x, y, 0.5, night, now);
  const [bx, by, s] = PA(x, y, 0.1);
  const wood = night ? "#4e3a2c" : "#7a5232", dark = night ? "#33261d" : "#563922", light = night ? "#6b5242" : "#a0734a";
  // เสากระโดงหัก + ใบเรือขาด
  const mx = bx + s * 0.04, my = by - s * 0.2, tx = bx + s * 0.16, ty = by - s * 1.55;
  g.strokeStyle = dark; g.lineWidth = Math.max(2, s * 0.06); g.beginPath(); g.moveTo(mx, my); g.lineTo(tx, ty); g.stroke();
  g.lineWidth = Math.max(1.5, s * 0.04); g.beginPath(); g.moveTo(tx - s * 0.32, ty + s * 0.28); g.lineTo(tx + s * 0.3, ty + s * 0.2); g.stroke();
  const fl = Math.sin(now / 500 + x) * s * 0.03;
  g.fillStyle = night ? "rgba(190,186,170,.85)" : "rgba(240,232,210,.95)";
  g.beginPath(); g.moveTo(tx - s * 0.3, ty + s * 0.3); g.lineTo(tx + s * 0.28, ty + s * 0.22);
  g.lineTo(tx + s * 0.22 + fl, ty + s * 0.62); g.lineTo(tx + s * 0.08 + fl, ty + s * 0.5); g.lineTo(tx - s * 0.02 + fl, ty + s * 0.72); g.lineTo(tx - s * 0.14 + fl, ty + s * 0.56); g.lineTo(tx - s * 0.26 + fl, ty + s * 0.66); g.closePath(); g.fill();
  // ลำเรือเอียงจม
  g.fillStyle = wood; g.beginPath();
  g.moveTo(bx - s * 0.52, by - s * 0.4); g.quadraticCurveTo(bx - s * 0.32, by + s * 0.04, bx + s * 0.1, by + s * 0.02);
  g.lineTo(bx + s * 0.44, by - s * 0.06); g.lineTo(bx + s * 0.46, by - s * 0.34); g.quadraticCurveTo(bx, by - s * 0.22, bx - s * 0.52, by - s * 0.4); g.closePath(); g.fill();
  g.strokeStyle = light; g.lineWidth = 1.2;
  for (const k of [0.3, 0.55, 0.8]) { g.beginPath(); g.moveTo(bx - s * 0.5 + k * s * 0.2, by - s * 0.38 + k * s * 0.36); g.quadraticCurveTo(bx, by - s * 0.22 + k * s * 0.24, bx + s * 0.45, by - s * 0.32 + k * s * 0.26); g.stroke(); }
  g.fillStyle = dark; g.beginPath(); g.moveTo(bx - s * 0.12, by - s * 0.2); g.lineTo(bx + s * 0.02, by - s * 0.26); g.lineTo(bx + s * 0.1, by - s * 0.12); g.lineTo(bx + s * 0.04, by - s * 0.04); g.lineTo(bx - s * 0.08, by - s * 0.07); g.closePath(); g.fill();
  g.strokeStyle = dark; g.lineWidth = 2; g.beginPath(); g.moveTo(bx - s * 0.52, by - s * 0.4); g.quadraticCurveTo(bx, by - s * 0.22, bx + s * 0.46, by - s * 0.34); g.stroke();
  // ฟองคลื่นกระทบลำเรือ
  g.fillStyle = night ? "rgba(200,235,255,.6)" : "rgba(255,255,255,.9)";
  for (let i = 0; i < 6; i++) { const u = i / 5; g.beginPath(); g.arc(bx - s * 0.35 + u * s * 0.75, by - s * 0.02 + Math.sin(i * 2 + now / 400) * s * 0.012, s * 0.035, 0, TAU); g.fill(); }
}

// =================================================================== ภูมิภาค V ทะเลทราย
function drawCactus(g, x, y, C, night) {
  const [bx, by, s] = PA(x, y, 0.1);
  shadow(g, bx + s * 0.06, by, s * 0.34, s * 0.11, C);
  cactusShape(g, bx, by, s, night);
}
export function cactusShape(g, bx, by, s, night) {
  const col = night ? "#3e6b58" : "#5aa05a", dark = night ? "#2c4f42" : "#3e7e45", light = night ? "#5a8a72" : "#86c77a";
  const w = s * 0.24, h = s * 1.3;
  // แขน
  g.lineCap = "round"; g.lineJoin = "round";
  const arm = (d, hy, len, up) => {
    g.strokeStyle = col; g.lineWidth = w * 0.72; g.beginPath(); g.moveTo(bx, by - hy); g.lineTo(bx + d * len, by - hy); g.lineTo(bx + d * len, by - hy - up); g.stroke();
    g.strokeStyle = dark; g.lineWidth = w * 0.22; g.beginPath(); g.moveTo(bx + d * len + w * 0.12, by - hy + w * 0.1); g.lineTo(bx + d * len + w * 0.12, by - hy - up); g.stroke();
  };
  arm(-1, h * 0.42, s * 0.25, s * 0.36); arm(1, h * 0.6, s * 0.22, s * 0.28);
  // ลำต้น
  g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(bx, by - w * 0.3); g.lineTo(bx, by - h); g.stroke();
  g.strokeStyle = dark; g.lineWidth = w * 0.3; g.beginPath(); g.moveTo(bx + w * 0.3, by - w * 0.3); g.lineTo(bx + w * 0.3, by - h + w * 0.1); g.stroke();
  g.strokeStyle = light; g.lineWidth = Math.max(1, w * 0.12); g.beginPath(); g.moveTo(bx - w * 0.22, by - w * 0.4); g.lineTo(bx - w * 0.22, by - h + w * 0.2); g.stroke();
  g.lineCap = "butt"; g.lineJoin = "miter";
  // หนาม + ดอก
  g.fillStyle = night ? "#cfd8c8" : "#f6f0d0";
  for (let i = 0; i < 7; i++) { g.fillRect(bx - w * 0.5 - 1, by - h * (0.15 + i * 0.11), 2, 1); g.fillRect(bx + w * 0.5 - 1, by - h * (0.2 + i * 0.11), 2, 1); }
  g.fillStyle = night ? "#d88aa8" : "#ff6f9a"; g.beginPath(); g.arc(bx - w * 0.1, by - h - w * 0.45, s * 0.05, 0, TAU); g.fill();
  g.fillStyle = "#ffd84d"; g.beginPath(); g.arc(bx - w * 0.1, by - h - w * 0.45, s * 0.02, 0, TAU); g.fill();
}
function drawSandRuin(g, x, y, C, night) {
  const [bx, by, s] = PA(x, y, 0.08);
  shadow(g, bx + s * 0.08, by, s * 0.46, s * 0.14, C);
  const lit = night ? "#8f88a6" : "#e3c48a", mid = night ? "#76708f" : "#cfa96a", sh = night ? "#5d5876" : "#b08850";
  // ท่อนเสาที่ล้ม
  g.fillStyle = sh; g.fillRect(bx + s * 0.06, by - s * 0.2, s * 0.42, s * 0.2);
  g.fillStyle = mid; g.beginPath(); g.ellipse(bx + s * 0.48, by - s * 0.1, s * 0.06, s * 0.1, 0, 0, TAU); g.fill();
  // ฐาน
  g.fillStyle = mid; g.fillRect(bx - s * 0.32, by - s * 0.14, s * 0.5, s * 0.14);
  g.fillStyle = lit; g.fillRect(bx - s * 0.32, by - s * 0.16, s * 0.5, s * 0.04);
  // เสาหัก
  const w = s * 0.32, l = bx - s * 0.23, top = by - s * 1.05;
  g.fillStyle = lit; g.beginPath();
  g.moveTo(l, by - s * 0.14); g.lineTo(l, top + s * 0.1); g.lineTo(l + w * 0.25, top); g.lineTo(l + w * 0.45, top + s * 0.12); g.lineTo(l + w * 0.7, top - s * 0.06); g.lineTo(l + w, top + s * 0.2); g.lineTo(l + w, by - s * 0.14); g.closePath(); g.fill();
  g.fillStyle = sh; g.beginPath(); g.moveTo(l + w * 0.6, by - s * 0.14); g.lineTo(l + w * 0.6, top + s * 0.02); g.lineTo(l + w * 0.7, top - s * 0.06); g.lineTo(l + w, top + s * 0.2); g.lineTo(l + w, by - s * 0.14); g.closePath(); g.fill();
  g.strokeStyle = mid; g.lineWidth = 1;
  for (const u of [0.2, 0.4]) { g.beginPath(); g.moveTo(l + w * u, by - s * 0.16); g.lineTo(l + w * u, top + s * 0.14); g.stroke(); }
  g.strokeStyle = sh; for (const v of [0.45, 0.75]) { g.beginPath(); g.moveTo(l, by - s * v); g.lineTo(l + w, by - s * v); g.stroke(); }
}
function drawDune(g, x, y, C, night) {
  const [bx, by, s] = PA(x, y, 0.12);
  shadow(g, bx + s * 0.06, by + s * 0.02, s * 0.56, s * 0.14, C);
  const lit = night ? "#7c789c" : "#f2d49a", sh = night ? "#56527a" : "#d5ae6a";
  const L = bx - s * 0.58, Rx = bx + s * 0.58, peakX = bx - s * 0.06, peakY = by - s * 0.62;
  g.fillStyle = lit; g.beginPath(); g.moveTo(L, by); g.bezierCurveTo(bx - s * 0.36, by - s * 0.3, peakX - s * 0.14, peakY, peakX, peakY);
  g.bezierCurveTo(peakX + s * 0.2, peakY + s * 0.02, bx + s * 0.34, by - s * 0.28, Rx, by); g.quadraticCurveTo(bx, by + s * 0.12, L, by); g.fill();
  // ด้านเงา (สันทราย)
  g.fillStyle = sh; g.beginPath(); g.moveTo(peakX, peakY); g.bezierCurveTo(peakX + s * 0.2, peakY + s * 0.02, bx + s * 0.34, by - s * 0.28, Rx, by);
  g.quadraticCurveTo(bx + s * 0.25, by + s * 0.08, bx + s * 0.1, by + s * 0.06); g.quadraticCurveTo(bx + s * 0.02, by - s * 0.3, peakX, peakY); g.fill();
  g.strokeStyle = night ? "rgba(40,36,70,.35)" : "rgba(170,120,60,.35)"; g.lineWidth = 1;
  for (const k of [0.25, 0.45]) { g.beginPath(); g.moveTo(bx - s * 0.45, by - s * k * 0.5); g.quadraticCurveTo(bx - s * 0.25, by - s * (k * 0.5 + 0.12), bx - s * 0.08, by - s * k * 0.45); g.stroke(); }
}

// =================================================================== ภูมิภาค VI อาณาจักรน้ำแข็ง
function drawIceBlock(g, x, y, C, night) {
  const [bx, by, s] = PA(x, y, 0.05);
  shadow(g, bx, by + s * 0.12, s * 0.48, s * 0.16, C);
  const a = 0.13, b = 0.87, H = 0.82;
  const face = (pts, fill) => { gPoly(g, pts.map(([u, v, z]) => [x + u, y + v, z])); g.fillStyle = fill; g.fill(); g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 1.2; g.stroke(); };
  // ด้านข้างที่หันเข้ากล้อง (ตามมุมหมุนกระดาน) แล้วค่อยฝา
  const sideC = night ? "rgba(70,130,190,.82)" : "rgba(110,180,230,.85)", frontC = night ? "rgba(110,170,220,.85)" : "rgba(160,215,245,.88)";
  const sides = [
    [-1, 0, a, 0.5, [[a, a, 0], [a, b, 0], [a, b, H], [a, a, H]]], [1, 0, b, 0.5, [[b, a, 0], [b, b, 0], [b, b, H], [b, a, H]]],
    [0, -1, 0.5, a, [[a, a, 0], [b, a, 0], [b, a, H], [a, a, H]]], [0, 1, 0.5, b, [[a, b, 0], [b, b, 0], [b, b, H], [a, b, H]]],
  ].filter(([nx, ny, u, v]) => faceVisible(nx, ny, x + u, y + v));
  const fd = viewAxes();
  sides.forEach(([nx, ny, , , pts]) => face(pts, Math.abs(nx * fd.fx + ny * fd.fy) > 0.7 ? frontC : sideC));
  face([[a, a, H], [b, a, H], [b, b, H], [a, b, H]], night ? "rgba(190,225,250,.92)" : "rgba(230,248,255,.95)");
  // รอยร้าว + เงาสะท้อน
  // วาดลายบนด้านที่หันหน้าเข้ากล้องที่สุด (u = ระยะตามแนวขอบ)
  const fr = sides.reduce((m, f) => (Math.abs(f[0] * fd.fx + f[1] * fd.fy) > Math.abs(m[0] * fd.fx + m[1] * fd.fy) ? f : m), sides[0] || [0, 1]);
  const p = (u, vv, z) => { const [nx, ny] = fr; const off = 0.37; return nx ? P(x + 0.5 + nx * off, y + (nx > 0 ? u : 1 - u), z) : P(x + (ny > 0 ? u : 1 - u), y + 0.5 + ny * off, z); };
  g.strokeStyle = night ? "rgba(220,240,255,.7)" : "rgba(255,255,255,.95)"; g.lineWidth = Math.max(1.5, s * 0.03);
  let q = p(0.25, b, 0.7), r = p(0.42, b, 0.5); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(r[0], r[1]); g.stroke();
  q = p(0.3, b, 0.75); r = p(0.36, b, 0.66); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(r[0], r[1]); g.stroke();
  g.strokeStyle = "rgba(60,120,180,.45)"; g.lineWidth = 1;
  q = p(0.6, b, 0.15); r = p(0.7, b, 0.4); const t2 = p(0.64, b, 0.6); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(r[0], r[1]); g.lineTo(t2[0], t2[1]); g.stroke();
  if (night) { const c = p(0.5, 0.5, H * 0.6); glow(g, c[0], c[1], s * 0.6, "150,220,255", 0.25); }
}
export const SNOW_PINE = {
  day: { green: "#2f6b57", dark: "#24574a", snow: "#ffffff", trunk: "#6b4a33" },
  night: { green: "#1f4448", dark: "#173538", snow: "#cddcf0", trunk: "#3d2f28" },
};
function drawPine(g, x, y, C, night) {
  const [bx, by, s] = PA(x, y, 0.1);
  shadow(g, bx, by, s * 0.42, s * 0.14, C);
  pineShape(g, bx, by, s, SNOW_PINE[night ? "night" : "day"]);
}
// สน 3 ชั้น (พิกัดจอ) · pal.snow = null → ไม่มีหิมะ
export function pineShape(g, bx, by, s, pal) {
  const { green, dark, snow } = pal;
  g.fillStyle = pal.trunk; g.fillRect(bx - s * 0.05, by - s * 0.3, s * 0.1, s * 0.3);
  const tiers = [[0.25, 0.46, 0.62], [0.62, 0.36, 0.52], [0.98, 0.25, 0.48]];
  for (const [b0, hw, th] of tiers) {
    const yb = by - s * b0, yt = yb - s * th;
    g.fillStyle = green; g.beginPath(); g.moveTo(bx - s * hw, yb); g.lineTo(bx, yt); g.lineTo(bx + s * hw, yb); g.closePath(); g.fill();
    g.fillStyle = dark; g.beginPath(); g.moveTo(bx, yt); g.lineTo(bx + s * hw, yb); g.lineTo(bx + s * hw * 0.2, yb); g.closePath(); g.fill();
    if (!snow) continue;
    // หิมะบนกิ่ง
    g.fillStyle = snow; g.beginPath(); g.moveTo(bx, yt);
    const sx = s * hw * 0.55, sy = s * th * 0.5;
    g.lineTo(bx + sx, yt + sy); g.lineTo(bx + sx * 0.6, yt + sy * 0.86); g.lineTo(bx + sx * 0.3, yt + sy * 1.04); g.lineTo(bx, yt + sy * 0.84);
    g.lineTo(bx - sx * 0.35, yt + sy * 1.02); g.lineTo(bx - sx * 0.7, yt + sy * 0.84); g.lineTo(bx - sx, yt + sy); g.closePath(); g.fill();
  }
}

// =================================================================== ภูมิภาค VII จุดสิ้นสุดของโลก
export function prism(g, bx, by, dx, h, w, tilt, light, dark) {
  const dX = Math.sin(tilt), dY = -Math.cos(tilt), nX = Math.cos(tilt), nY = Math.sin(tilt);
  const B = [bx + dx, by];
  const L = [B[0] - nX * w / 2, B[1] - nY * w / 2], Rr = [B[0] + nX * w / 2, B[1] + nY * w / 2];
  const TL = [L[0] + dX * h, L[1] + dY * h], TR = [Rr[0] + dX * h, Rr[1] + dY * h], T = [B[0] + dX * (h + w * 0.9), B[1] + dY * (h + w * 0.9)], TM = [B[0] + dX * h, B[1] + dY * h];
  g.fillStyle = light; g.beginPath(); g.moveTo(L[0], L[1]); g.lineTo(TL[0], TL[1]); g.lineTo(T[0], T[1]); g.lineTo(TR[0], TR[1]); g.lineTo(Rr[0], Rr[1]); g.closePath(); g.fill();
  g.fillStyle = dark; g.beginPath(); g.moveTo(B[0], B[1]); g.lineTo(TM[0], TM[1]); g.lineTo(T[0], T[1]); g.lineTo(TR[0], TR[1]); g.lineTo(Rr[0], Rr[1]); g.closePath(); g.fill();
  g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1; g.beginPath(); g.moveTo(L[0] + nX * w * 0.18, L[1] + nY * w * 0.18); g.lineTo(TL[0] + nX * w * 0.18, TL[1] + nY * w * 0.18); g.stroke();
}
function drawCrystal(g, x, y, C, night, now) {
  const [bx, by, s] = PA(x, y, 0.1);
  shadow(g, bx, by, s * 0.42, s * 0.13, C);
  crystalShape(g, bx, by, s, night, now / 650 + x * 1.3 + y);
}
// กลุ่มคริสตัลเรืองแสง (พิกัดจอ) · phase = มุมของจังหวะเต้น
export function crystalShape(g, bx, by, s, night, phase) {
  const pulse = 0.5 + 0.5 * Math.sin(phase);
  glow(g, bx, by - s * 0.55, s * 0.95, "190,120,255", (night ? 0.32 : 0.2) + 0.14 * pulse);
  const L = night ? "#d9a8ff" : "#e6bcff", M = night ? "#9a5ce6" : "#a96df0", D = night ? "#5e2fa8" : "#6c3cc0";
  prism(g, bx, by, -s * 0.2, s * 0.62, s * 0.17, -0.38, M, D);
  prism(g, bx, by, s * 0.22, s * 0.72, s * 0.16, 0.32, M, D);
  prism(g, bx, by, 0, s * 1.2, s * 0.22, 0.02, L, M);
  prism(g, bx, by + s * 0.03, s * 0.08, s * 0.38, s * 0.12, 0.62, L, D);
}
function drawVoidRuin(g, x, y, C, night, now) {
  const [bx, by, s] = PA(x, y, 0.08);
  shadow(g, bx, by, s * 0.44, s * 0.14, C);
  const lit = night ? "#3a3248" : "#4a405a", sh = night ? "#272033" : "#332b40", rune = "190,120,255";
  g.fillStyle = sh; g.fillRect(bx - s * 0.34, by - s * 0.14, s * 0.62, s * 0.14);
  const w = s * 0.3, l = bx - s * 0.18, top = by - s * 0.82;
  g.fillStyle = lit; g.beginPath(); g.moveTo(l, by - s * 0.14); g.lineTo(l, top + s * 0.12); g.lineTo(l + w * 0.3, top); g.lineTo(l + w * 0.55, top + s * 0.1); g.lineTo(l + w, top - s * 0.04); g.lineTo(l + w, by - s * 0.14); g.closePath(); g.fill();
  g.fillStyle = sh; g.fillRect(l + w * 0.62, top + s * 0.06, w * 0.38, by - s * 0.14 - top - s * 0.06);
  // รอยร้าวเรืองแสง
  const pulse = 0.55 + 0.45 * Math.sin(now / 700 + x + y * 2);
  g.strokeStyle = `rgba(${rune},${0.5 + 0.4 * pulse})`; g.lineWidth = Math.max(1.2, s * 0.025);
  g.beginPath(); g.moveTo(l + w * 0.4, top + s * 0.15); g.lineTo(l + w * 0.3, top + s * 0.35); g.lineTo(l + w * 0.5, top + s * 0.5); g.lineTo(l + w * 0.35, by - s * 0.2); g.stroke();
  // เศษหินลอย
  for (let i = 0; i < 3; i++) {
    const fx = bx + (i - 1) * s * 0.22 + s * 0.05, fy = top - s * (0.22 + (i % 2) * 0.16) + Math.sin(now / 800 + i * 2.1 + x) * s * 0.05, r = s * (0.07 + (i % 2) * 0.03);
    glow(g, fx, fy + r * 1.2, r * 2.4, rune, 0.25 * pulse + 0.1);
    g.fillStyle = i % 2 ? sh : lit; g.beginPath(); g.moveTo(fx - r, fy); g.lineTo(fx - r * 0.3, fy - r * 0.8); g.lineTo(fx + r, fy - r * 0.3); g.lineTo(fx + r * 0.4, fy + r * 0.7); g.closePath(); g.fill();
  }
}
function drawObelisk(g, x, y, C, night, now) {
  const [bx, by, s] = PA(x, y, 0.1);
  shadow(g, bx + s * 0.06, by, s * 0.4, s * 0.13, C);
  const pulse = 0.5 + 0.5 * Math.sin(now / 520 + x * 0.7 + y);
  glow(g, bx, by - s * 0.1, s * 0.6, "120,240,255", 0.15 + 0.15 * pulse);
  const wb = s * 0.34, wt = s * 0.22, h = s * 1.85, top = by - s * 0.1 - h;
  // แท่นหิน
  g.fillStyle = night ? "#1c1824" : "#2b2535"; g.fillRect(bx - s * 0.3, by - s * 0.12, s * 0.6, s * 0.12);
  g.fillStyle = night ? "#2a2434" : "#3c3448"; g.beginPath(); g.moveTo(bx - wb / 2, by - s * 0.1); g.lineTo(bx - wt / 2, top); g.lineTo(bx + wt / 2, top); g.lineTo(bx + wb / 2, by - s * 0.1); g.closePath(); g.fill();
  g.fillStyle = night ? "#17131e" : "#221d2b"; g.beginPath(); g.moveTo(bx + s * 0.03, by - s * 0.1); g.lineTo(bx + s * 0.02, top); g.lineTo(bx + wt / 2, top); g.lineTo(bx + wb / 2, by - s * 0.1); g.closePath(); g.fill();
  // ยอดเรืองแสง
  g.fillStyle = `rgba(160,130,255,${0.75 + 0.25 * pulse})`; g.beginPath(); g.moveTo(bx - wt / 2, top); g.lineTo(bx, top - s * 0.24); g.lineTo(bx + wt / 2, top); g.closePath(); g.fill();
  glow(g, bx, top - s * 0.08, s * 0.4, "170,140,255", 0.35 + 0.25 * pulse);
  // อักษรรูนบนหน้าเสา
  g.strokeStyle = `rgba(120,240,255,${0.55 + 0.45 * pulse})`; g.lineWidth = Math.max(1.2, s * 0.025); g.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const ry = top + s * 0.3 + i * s * 0.36, rx = bx - s * 0.04, r = s * 0.055;
    g.beginPath();
    if (i % 2) { g.moveTo(rx - r, ry - r); g.lineTo(rx + r, ry + r); g.moveTo(rx + r, ry - r); g.lineTo(rx, ry); }
    else { g.moveTo(rx, ry - r); g.lineTo(rx, ry + r); g.moveTo(rx - r, ry); g.lineTo(rx + r * 0.6, ry - r * 0.6); }
    g.stroke();
  }
  g.lineCap = "butt";
}

// =================================================================== ตัวเลือกสิ่งกีดขวาง
// ชนิดที่สูง (บังตัวละครที่ยืนข้างหลัง → จางลง)
export const TALL_KINDS = new Set(["tree", "pillar", "banner", "bannerP", "bannerB", "windmill", "deadtree", "wreck", "cactus", "ruin", "pine", "crystal", "obelisk"]);

// t = { x, y, kind, conn } · ctx = { area, C, night, cols }
export function drawObstacle(g, t, ctx, now) {
  const { x, y, kind } = t, { area, C, night } = ctx;
  switch (kind) {
    case "tree": { const [sx, sy, s] = PA(x, y, 0.1); drawTree(g, sx, sy, s * 1.35, C); return; }
    case "pillar": drawPillar(g, x, y, C, now); return;
    case "hedge": drawHedge(g, x, y, C); return;
    case "banner": case "bannerP": case "bannerB": {
      const col = kind === "bannerP" ? "#9b4f96" : kind === "bannerB" ? "#3d8bd9" : x < ctx.cols / 2 ? "#9b4f96" : "#3d8bd9";
      drawBanner(g, x, y, col, C, now); return;
    }
    case "windmill": drawWindmill(g, x, y, C, night, now); return;
    case "fence": drawFence(g, x, y, t.conn || {}, C, night); return;
    case "deadtree": drawDeadTree(g, x, y, C, night, now); return;
    case "stump": drawStump(g, x, y, C, night); return;
    case "reef": drawReef(g, x, y, C, night, now); return;
    case "wreck": drawWreck(g, x, y, C, night, now); return;
    case "cactus": drawCactus(g, x, y, C, night); return;
    case "ruin": if (area === 7) drawVoidRuin(g, x, y, C, night, now); else drawSandRuin(g, x, y, C, night); return;
    case "dune": drawDune(g, x, y, C, night); return;
    case "iceblock": drawIceBlock(g, x, y, C, night); return;
    case "pine": drawPine(g, x, y, C, night); return;
    case "crystal": drawCrystal(g, x, y, C, night, now); return;
    case "obelisk": drawObelisk(g, x, y, C, night, now); return;
    default: drawRock(g, x, y, area, night, now);
  }
}

// =================================================================== ช่องพิเศษ (ยืนได้)
//  ฐานอบลงชั้นพื้นครั้งเดียว · animSpecial วาดทับทุกเฟรม (ก่อนไฮไลต์ — ไฮไลต์จึงอยู่บนสุดเสมอ)
const FLOW = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ก้านพืชขึ้นจากพื้น (ใช้กับพุ่มดอกไม้/ป่าทึบ) — เรียงไกล→ใกล้
function sprigs(g, x, y, n, seed, fn) {
  const R = rng(seed), pts = [];
  for (let i = 0; i < n; i++) pts.push([x + 0.1 + R() * 0.8, y + 0.1 + R() * 0.8, R(), R()]);
  pts.sort((a, b) => a[1] - b[1]);
  for (const p of pts) fn(...p);
}

export function bakeSpecial(g, sp, ctx) {
  const { x, y, kind } = sp, { night } = ctx;
  const [cx, cy, s] = PA(x, y, 0);
  switch (kind) {
    case "flowers": {
      quad(g, x, y, 0.03); g.fillStyle = night ? "#2b4d3d" : "#78ac5c"; g.fill();
      g.strokeStyle = night ? "rgba(255,220,240,.35)" : "rgba(255,255,255,.55)"; g.lineWidth = 1.4; g.stroke();
      const cols = night ? ["#e9b7d6", "#f3e7a8", "#ddd6f8", "#c9a8f0"] : ["#f2709f", "#ffd23f", "#ffffff", "#a879ec", "#ff9050"];
      sprigs(g, x, y, 30, x * 97 + y * 13 + 5, (px, py, a, b) => {
        const h = 0.2 + a * 0.24, p0 = P(px, py, 0), p1 = P(px, py, h);
        g.strokeStyle = night ? "#3f6b4a" : "#3f7d36"; g.lineWidth = Math.max(1, p0[2] * 0.028);
        g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
        g.fillStyle = night ? "#355e44" : "#5c9a46"; g.beginPath(); g.ellipse(p0[0] + p0[2] * 0.04, (p0[1] + p1[1]) / 2, p0[2] * 0.05, p0[2] * 0.022, -0.5, 0, TAU); g.fill();
        g.fillStyle = cols[(b * cols.length) | 0]; g.beginPath(); g.arc(p1[0], p1[1], p1[2] * 0.06, 0, TAU); g.fill();
        g.fillStyle = "rgba(255,240,150,.9)"; g.beginPath(); g.arc(p1[0], p1[1], p1[2] * 0.02, 0, TAU); g.fill();
      });
      return;
    }
    case "forest": {
      quad(g, x, y, 0.02); g.fillStyle = night ? "#142a22" : "#2f5a30"; g.fill();
      const cols = night ? ["#183428", "#1f4332", "#2a5640", "#356b4c"] : ["#2d5e2c", "#3a7535", "#4b8c40", "#5fa04c"];
      sprigs(g, x, y, 18, x * 71 + y * 19 + 9, (px, py, a, b) => {
        const p = P(px, py, 0.1 + a * 0.22), r = p[2] * (0.09 + b * 0.07);
        g.fillStyle = cols[((a + b) * 2) | 0]; g.beginPath(); g.arc(p[0], p[1], r, 0, TAU); g.fill();
        g.fillStyle = cols[3]; g.beginPath(); g.arc(p[0] - r * 0.3, p[1] - r * 0.35, r * 0.4, 0, TAU); g.fill();
      });
      // ใบเฟิร์น
      const R = rng(x * 7 + y * 131);
      g.strokeStyle = night ? "#2f6048" : "#6fb050"; g.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        const p0 = P(x + 0.15 + R() * 0.7, y + 0.3 + R() * 0.6, 0), a = -Math.PI / 2 + (R() - 0.5) * 1.6, L = p0[2] * 0.35;
        const ex = p0[0] + Math.cos(a) * L, ey = p0[1] + Math.sin(a) * L;
        g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(p0[0] + Math.cos(a) * L * 0.5 + 4, p0[1] + Math.sin(a) * L * 0.6, ex, ey); g.stroke();
        for (let k = 1; k < 5; k++) { const u = k / 5, lx = p0[0] + (ex - p0[0]) * u, ly = p0[1] + (ey - p0[1]) * u; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx - 4 * (1 - u), ly + 2); g.moveTo(lx, ly); g.lineTo(lx + 4 * (1 - u), ly + 1); g.stroke(); }
      }
      g.fillStyle = night ? "#e85a7a" : "#d8344f";
      for (let i = 0; i < 4; i++) { const p = P(x + 0.2 + R() * 0.6, y + 0.2 + R() * 0.6, 0.2); g.beginPath(); g.arc(p[0], p[1], p[2] * 0.028, 0, TAU); g.fill(); }
      quad(g, x, y, 0.03); g.strokeStyle = night ? "rgba(120,200,150,.35)" : "rgba(20,50,20,.45)"; g.lineWidth = 1.4; g.stroke();
      return;
    }
    case "thorns": {
      quad(g, x, y, 0.02); g.fillStyle = night ? "#1e1324" : "#3e2a45"; g.fill();
      gEllipse(g, x + 0.5, y + 0.5, 0.4, 0, 28); g.fillStyle = night ? "rgba(150,90,200,.22)" : "rgba(140,80,170,.3)"; g.fill();
      const R = rng(x * 37 + y * 61 + 2);
      for (let i = 0; i < 9; i++) {
        const a = P(x + 0.08 + R() * 0.84, y + 0.1 + R() * 0.8, 0.04), b = P(x + 0.08 + R() * 0.84, y + 0.1 + R() * 0.8, 0.12 + R() * 0.14);
        const mx = (a[0] + b[0]) / 2 + (R() - 0.5) * s * 0.4, my = (a[1] + b[1]) / 2 - s * 0.12;
        const col = i % 2 ? (night ? "#6a8a3a" : "#7a9a3c") : (night ? "#8b4fb0" : "#7d3f99");
        g.strokeStyle = col; g.lineWidth = Math.max(1.4, s * 0.032); g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(mx, my, b[0], b[1]); g.stroke();
        // หนาม
        g.fillStyle = col;
        for (let k = 1; k < 4; k++) {
          const u = k / 4, px = (1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * mx + u * u * b[0], py = (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * my + u * u * b[1], d = k % 2 ? 1 : -1;
          g.beginPath(); g.moveTo(px - 2, py); g.lineTo(px + d * 1.5, py - s * 0.07); g.lineTo(px + 2, py); g.closePath(); g.fill();
        }
      }
      g.fillStyle = night ? "rgba(190,255,110,.9)" : "rgba(170,230,60,.95)";
      for (let i = 0; i < 6; i++) { const p = P(x + 0.15 + R() * 0.7, y + 0.15 + R() * 0.7, 0.08); g.beginPath(); g.arc(p[0], p[1], Math.max(1.2, p[2] * 0.03), 0, TAU); g.fill(); }
      quad(g, x, y, 0.03); g.strokeStyle = night ? "rgba(200,140,255,.55)" : "rgba(160,90,200,.75)"; g.lineWidth = 1.5; g.stroke();
      return;
    }
    case "shallow": {
      quad(g, x, y, 0.02); g.fillStyle = night ? "rgba(52,128,165,.85)" : "rgba(104,205,224,.86)"; g.fill();
      g.strokeStyle = night ? "rgba(190,230,255,.6)" : "rgba(255,255,255,.85)"; g.lineWidth = 1.5; g.stroke();
      quad(g, x, y, 0.14); g.fillStyle = night ? "rgba(120,190,220,.18)" : "rgba(255,255,255,.18)"; g.fill();
      const R = rng(x * 23 + y * 47 + 7);
      g.fillStyle = night ? "rgba(170,200,210,.4)" : "rgba(240,225,180,.65)";
      for (let i = 0; i < 6; i++) { const p = P(x + 0.15 + R() * 0.7, y + 0.15 + R() * 0.7); g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.035, p[2] * 0.02, 0, 0, TAU); g.fill(); }
      return;
    }
    case "whirl": {
      quad(g, x, y, 0.02);
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, s * 0.6);
      gr.addColorStop(0, night ? "#041d36" : "#0b3f70"); gr.addColorStop(1, night ? "#145078" : "#2a8ac2");
      g.fillStyle = gr; g.fill();
      g.strokeStyle = night ? "rgba(190,230,255,.65)" : "rgba(255,255,255,.85)"; g.lineWidth = 1.6; g.stroke();
      return;
    }
    case "quicksand": {
      quad(g, x, y, 0.02);
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, s * 0.6);
      gr.addColorStop(0, night ? "#1e1a30" : "#8a5f2e"); gr.addColorStop(0.55, night ? "#3d3858" : "#b88a4e"); gr.addColorStop(1, night ? "#5a5576" : "#d4ad6c");
      g.fillStyle = gr; g.fill();
      g.strokeStyle = night ? "rgba(210,200,245,.55)" : "rgba(110,70,30,.6)"; g.lineWidth = 1.5; g.stroke();
      return;
    }
    case "ice": {
      quad(g, x, y, 0.02);
      const a = P(x, y), b = P(x + 1, y + 1), gr = g.createLinearGradient(a[0], a[1], b[0], b[1]);
      gr.addColorStop(0, night ? "#a8cdec" : "#f2fbff"); gr.addColorStop(0.5, night ? "#7fa9d4" : "#cdeefb"); gr.addColorStop(1, night ? "#6a93c4" : "#a9dcf3");
      g.fillStyle = gr; g.fill(); g.strokeStyle = night ? "rgba(220,240,255,.75)" : "rgba(255,255,255,.95)"; g.lineWidth = 1.6; g.stroke();
      // แถบเงามัน + รอยร้าว
      g.save(); quad(g, x, y, 0.02); g.clip();
      g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = Math.max(2, s * 0.06);
      let p0 = P(x + 0.1, y + 0.55), p1 = P(x + 0.55, y + 0.1); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
      g.lineWidth = Math.max(1, s * 0.025); p0 = P(x + 0.25, y + 0.62); p1 = P(x + 0.62, y + 0.25); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
      g.strokeStyle = night ? "rgba(40,80,140,.5)" : "rgba(90,150,200,.55)"; g.lineWidth = 1;
      gPoly(g, [[x + 0.6, y + 0.95], [x + 0.68, y + 0.72], [x + 0.85, y + 0.64], [x + 0.97, y + 0.68]], false); g.stroke();
      gPoly(g, [[x + 0.68, y + 0.72], [x + 0.62, y + 0.6]], false); g.stroke();
      g.restore();
      return;
    }
    case "lava": {
      quad(g, x, y, 0.01);
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, s * 0.62);
      gr.addColorStop(0, "#ffd24a"); gr.addColorStop(0.45, "#ff7a1a"); gr.addColorStop(1, "#c12a0c");
      g.fillStyle = gr; g.fill();
      // แผ่นเปลือกหินลอยบนลาวา
      const R = rng(x * 59 + y * 83 + 4);
      for (let i = 0; i < 5; i++) {
        const u = 0.12 + R() * 0.76, v = 0.12 + R() * 0.76, r = 0.08 + R() * 0.08, pts = [];
        for (let k = 0; k < 6; k++) { const an = k / 6 * TAU + R() * 0.5, rr = r * (0.7 + R() * 0.5); pts.push([x + u + Math.cos(an) * rr, y + v + Math.sin(an) * rr]); }
        gPoly(g, pts); g.fillStyle = night ? "#2a120c" : "#3d1a10"; g.fill(); g.strokeStyle = "rgba(255,150,60,.7)"; g.lineWidth = 1; g.stroke();
      }
      quad(g, x, y, 0.01); g.strokeStyle = "#ffb04a"; g.lineWidth = 1.6; g.stroke();
      return;
    }
    case "power": {
      quad(g, x, y, 0.03); g.fillStyle = night ? "#1c1730" : "#2c2642"; g.fill();
      g.strokeStyle = night ? "rgba(170,150,255,.7)" : "rgba(150,130,240,.8)"; g.lineWidth = 1.5; g.stroke();
      quad(g, x, y, 0.1); g.strokeStyle = "rgba(240,200,104,.45)"; g.lineWidth = 1; g.stroke();
      g.strokeStyle = "#f0c868"; g.lineWidth = 1.6; gEllipse(g, x + 0.5, y + 0.5, 0.33, 0, 36); g.stroke();
      g.strokeStyle = "#a68cff"; g.lineWidth = 1.2; gEllipse(g, x + 0.5, y + 0.5, 0.22, 0, 30); g.stroke();
      // รูนรอบวง
      g.strokeStyle = "#f0c868"; g.lineWidth = 1.4;
      for (let k = 0; k < 6; k++) {
        const an = k / 6 * TAU, a = P(x + 0.5 + Math.cos(an) * 0.22, y + 0.5 + Math.sin(an) * 0.22), b = P(x + 0.5 + Math.cos(an) * 0.33, y + 0.5 + Math.sin(an) * 0.33);
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
      // ดาบ/ลูกศรชี้ขึ้นตรงกลาง = พลังโจมตี
      g.fillStyle = "#ffe08a"; g.beginPath(); g.moveTo(cx, cy - s * 0.15); g.lineTo(cx + s * 0.07, cy); g.lineTo(cx + s * 0.025, cy); g.lineTo(cx + s * 0.025, cy + s * 0.09); g.lineTo(cx - s * 0.025, cy + s * 0.09); g.lineTo(cx - s * 0.025, cy); g.lineTo(cx - s * 0.07, cy); g.closePath(); g.fill();
      return;
    }
    default: {
      // ชนิดที่ไม่รู้จัก — กรอบประเพื่อให้รู้ว่าช่องนี้พิเศษ
      quad(g, x, y, 0.08); g.save(); g.setLineDash([4, 4]); g.strokeStyle = night ? "rgba(255,255,255,.5)" : "rgba(28,63,110,.5)"; g.lineWidth = 1.5; g.stroke(); g.restore();
    }
  }
}

// t = เวลา (หยุดนิ่งเมื่อ lowQ) · ctx = { night, lowQ }
export function animSpecial(g, sp, ctx, t) {
  const { x, y, kind } = sp, { night, lowQ } = ctx;
  const [cx, cy, s] = PA(x, y, 0);
  switch (kind) {
    case "thorns": {
      const p = 0.5 + 0.5 * Math.sin(t / 700 + x + y * 1.3);
      quad(g, x, y, 0.04); g.fillStyle = `rgba(170,90,220,${0.06 + 0.1 * p})`; g.fill();
      if (!lowQ) for (let i = 0; i < 2; i++) {
        const ph = (t / 1800 + i * 0.5 + x * 0.17) % 1, b = P(x + 0.3 + i * 0.4, y + 0.45 + i * 0.1, 0.1 + ph * 0.6);
        g.globalAlpha = Math.sin(ph * Math.PI) * 0.85; g.fillStyle = "#b9f56a"; g.beginPath(); g.arc(b[0], b[1], Math.max(1.5, b[2] * 0.04), 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      return;
    }
    case "shallow": {
      g.save(); quad(g, x, y, 0.03); g.clip();
      g.strokeStyle = night ? "rgba(200,235,255,.35)" : "rgba(255,255,255,.55)"; g.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) {
        const v = ((k / 3 + t / 5200 + x * 0.11) % 1) * 0.9 + 0.05;
        g.beginPath();
        for (let i = 0; i <= 8; i++) { const u = i / 8, p = P(x + u, y + v + Math.sin(u * 9 + t / 600 + k) * 0.025); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
        g.stroke();
      }
      g.restore();
      return;
    }
    case "whirl": {
      const rot = t / 520;
      g.lineCap = "round";
      for (let arm = 0; arm < 3; arm++) {
        g.beginPath();
        for (let i = 0; i <= 16; i++) {
          const r = 0.44 - i * 0.025, an = -rot + arm * TAU / 3 + i * 0.32, p = P(x + 0.5 + Math.cos(an) * r, y + 0.5 + Math.sin(an) * r);
          if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
        }
        g.strokeStyle = night ? "rgba(170,220,255,.55)" : "rgba(220,245,255,.7)"; g.lineWidth = Math.max(1.5, s * 0.035); g.stroke();
      }
      g.lineCap = "butt";
      // ลูกศรทิศกระแส (จบตาบนช่องนี้ = โดนดันไปตามลูกศร)
      const d = FLOW[sp.flow];
      if (d) {
        const [dx, dy] = d, nx = -dy, ny = dx, push = lowQ ? 0 : ((t / 900) % 1) * 0.06;
        const pt = (f, o) => [x + 0.5 + dx * (f + push) + nx * o, y + 0.5 + dy * (f + push) + ny * o];
        gPoly(g, [pt(-0.3, 0.06), pt(0.06, 0.06), pt(0.06, 0.17), pt(0.34, 0), pt(0.06, -0.17), pt(0.06, -0.06), pt(-0.3, -0.06)]);
        g.fillStyle = "#ffffff"; g.fill(); g.strokeStyle = night ? "#021428" : "#0b2f55"; g.lineWidth = 2; g.lineJoin = "round"; g.stroke(); g.lineJoin = "miter";
      }
      return;
    }
    case "quicksand": {
      g.save(); quad(g, x, y, 0.03); g.clip();
      for (let k = 0; k < 4; k++) {
        const ph = (k / 4 + t / 4200) % 1, r = 0.46 * (1 - ph);
        g.strokeStyle = night ? `rgba(20,16,40,${0.55 * ph})` : `rgba(90,55,20,${0.6 * ph})`; g.lineWidth = 1.5;
        gEllipse(g, x + 0.5, y + 0.5, r, 0, 28); g.stroke();
      }
      // จุดทรายไหลวน
      g.fillStyle = night ? "rgba(150,140,190,.7)" : "rgba(240,210,150,.85)";
      for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + t / 1500, r = 0.12 + (i % 3) * 0.1, p = P(x + 0.5 + Math.cos(an) * r, y + 0.5 + Math.sin(an) * r); g.beginPath(); g.arc(p[0], p[1], Math.max(1, p[2] * 0.025), 0, TAU); g.fill(); }
      g.restore();
      return;
    }
    case "ice": {
      if (lowQ) return;
      const ph = (t / 2600 + x * 0.13 + y * 0.07) % 1.8;
      if (ph > 1) return;
      g.save(); quad(g, x, y, 0.03); g.clip();
      const u = ph * 1.6 - 0.3, p0 = P(x + u - 0.3, y + 1), p1 = P(x + u + 0.3, y);
      g.strokeStyle = `rgba(255,255,255,${0.6 * Math.sin(ph * Math.PI)})`; g.lineWidth = s * 0.12; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
      g.restore();
      return;
    }
    case "lava": {
      const p = 0.5 + 0.5 * Math.sin(t / 480 + x * 1.7 + y);
      quad(g, x, y, 0.01); g.fillStyle = `rgba(255,200,80,${0.08 + 0.16 * p})`; g.fill();
      glow(g, cx, cy - s * 0.1, s * 0.75, "255,110,30", (night ? 0.22 : 0.12) + 0.1 * p);
      if (!lowQ) for (let i = 0; i < 2; i++) {
        const ph = (t / 1300 + i * 0.47 + x * 0.21 + y * 0.13) % 1, b = P(x + 0.28 + i * 0.42, y + 0.35 + i * 0.3);
        g.strokeStyle = `rgba(255,230,140,${1 - ph})`; g.lineWidth = 1.5; g.beginPath(); g.ellipse(b[0], b[1], b[2] * 0.08 * ph + 1, b[2] * 0.045 * ph + 0.5, 0, 0, TAU); g.stroke();
      }
      return;
    }
    case "power": {
      const p = 0.5 + 0.5 * Math.sin(t / 600 + x + y);
      glow(g, cx, cy, s * 0.5, "255,210,120", 0.12 + 0.18 * p);
      g.save(); g.setLineDash([4, 5]); g.lineDashOffset = -t / 70; g.strokeStyle = `rgba(200,170,255,${0.5 + 0.4 * p})`; g.lineWidth = 1.4; gEllipse(g, x + 0.5, y + 0.5, 0.42, 0, 40); g.stroke(); g.restore();
      if (!lowQ) for (let i = 0; i < 3; i++) {
        const ph = (t / 1600 + i / 3 + x * 0.1) % 1, an = i * 2.1 + x, b = P(x + 0.5 + Math.cos(an) * 0.25, y + 0.5 + Math.sin(an) * 0.25, ph * 0.9);
        g.globalAlpha = Math.sin(ph * Math.PI); g.fillStyle = "#ffe08a"; g.beginPath(); g.arc(b[0], b[1], 1.8, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      return;
    }
    default:
  }
}

// =================================================================== จุดฟื้นฟู (ด่านที่ไม่ใช่ I)
//  กลุ่มช่องติดกัน → ด่าน V วาดเป็นโอเอซิส (สระน้ำ + ต้นปาล์ม) · ด่านอื่น = แท่นฟื้นฟูสีประจำด่านรายช่อง
export function healClusters(heal) {
  const set = new Map(heal.map((p) => [p.x + "," + p.y, p])), seen = new Set(), out = [];
  for (const p of heal) {
    const k0 = p.x + "," + p.y;
    if (seen.has(k0)) continue;
    const list = [], q = [p]; seen.add(k0);
    while (q.length) {
      const c = q.pop(); list.push(c);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = (c.x + dx) + "," + (c.y + dy);
        if (set.has(k) && !seen.has(k)) { seen.add(k); q.push(set.get(k)); }
      }
    }
    const x0 = Math.min(...list.map((c) => c.x)), x1 = Math.max(...list.map((c) => c.x)) + 1;
    const y0 = Math.min(...list.map((c) => c.y)), y1 = Math.max(...list.map((c) => c.y)) + 1;
    out.push({ tiles: list, x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2 });
  }
  return out;
}
export function drawPalm(g, x, y, s, lean, night) {
  const trunk = night ? "#5a4a3c" : "#9a7146", ring = night ? "#3f342b" : "#7a5634";
  const leaf = night ? "#2f5a48" : "#4f9a45", leafD = night ? "#244637" : "#3a7a35";
  const tx = x + lean * s * 0.45, ty = y - s * 1.25;
  g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.ellipse(x + lean * s * 0.3, y, s * 0.4, s * 0.1, 0, 0, TAU); g.fill();
  g.strokeStyle = trunk; g.lineWidth = s * 0.1; g.lineCap = "round";
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * s * 0.05, y - s * 0.7, tx, ty); g.stroke();
  g.strokeStyle = ring; g.lineWidth = 1;
  for (let i = 1; i < 7; i++) { const u = i / 7, px = (1 - u) * (1 - u) * x + 2 * u * (1 - u) * (x + lean * s * 0.05) + u * u * tx, py = (1 - u) * (1 - u) * y + 2 * u * (1 - u) * (y - s * 0.7) + u * u * ty; g.beginPath(); g.moveTo(px - s * 0.05, py); g.lineTo(px + s * 0.05, py - 1); g.stroke(); }
  g.lineCap = "butt";
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.55 + (k > 3 ? 0.3 : k < 3 ? -0.3 : 0), L = s * (0.55 + (k % 2) * 0.12);
    const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.55 + L * 0.35;
    g.fillStyle = k % 2 ? leafD : leaf; g.beginPath(); g.moveTo(tx, ty);
    g.quadraticCurveTo(tx + Math.cos(a) * L * 0.5, ty + Math.sin(a) * L * 0.7 - s * 0.12, ex, ey);
    g.quadraticCurveTo(tx + Math.cos(a) * L * 0.45, ty + Math.sin(a) * L * 0.5 + s * 0.02, tx, ty + s * 0.03); g.fill();
  }
  g.fillStyle = night ? "#4a3a28" : "#7a5228"; for (const d of [-1, 1]) { g.beginPath(); g.arc(tx + d * s * 0.04, ty + s * 0.05, s * 0.04, 0, TAU); g.fill(); }
}
export function bakeHeal(g, info, ctx) {
  const { night, C, area } = ctx;
  if (area === 5) {
    for (const c of info.healClusters) {
      gEllipse(g, c.cx, c.cy, c.rx + 0.32, 0, 48, c.ry + 0.32); g.fillStyle = night ? "#3a5848" : "#93c06c"; g.fill();
      gEllipse(g, c.cx, c.cy, c.rx + 0.06, 0, 48, c.ry + 0.06); g.fillStyle = night ? "#77739a" : "#ecd39a"; g.fill();
      gEllipse(g, c.cx, c.cy, c.rx - 0.1, 0, 48, c.ry - 0.1);
      const [px, py, s] = P(c.cx, c.cy), gr = g.createRadialGradient(px, py, 0, px, py, s * Math.max(c.rx, c.ry));
      gr.addColorStop(0, night ? "#2e78a0" : "#62d6dc"); gr.addColorStop(1, night ? "#1a4e72" : "#2b9cbc");
      g.fillStyle = gr; g.fill();
      g.strokeStyle = night ? "rgba(200,235,255,.5)" : "rgba(255,255,255,.8)"; g.lineWidth = 1.5; g.stroke();
      // ใบบัว
      const R = rng(c.x0 * 13 + c.y0 * 7 + 3);
      for (let i = 0; i < 3; i++) {
        const an = R() * TAU, rr = 0.35 + R() * 0.3, p = P(c.cx + Math.cos(an) * c.rx * rr, c.cy + Math.sin(an) * c.ry * rr);
        g.fillStyle = night ? "#2f6a50" : "#5fae58"; g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.12, p[2] * 0.06, 0, 0.3, TAU - 0.3); g.lineTo(p[0], p[1]); g.fill();
        if (i === 0) { g.fillStyle = night ? "#e8c8e0" : "#ff9ec4"; g.beginPath(); g.arc(p[0] + p[2] * 0.02, p[1] - p[2] * 0.03, p[2] * 0.035, 0, TAU); g.fill(); }
      }
      // กกริมน้ำ
      g.strokeStyle = night ? "#3f6b4a" : "#5f9a3f"; g.lineWidth = 1.4;
      for (let i = 0; i < 14; i++) {
        const an = R() * TAU, p = P(c.cx + Math.cos(an) * (c.rx + 0.02), c.cy + Math.sin(an) * (c.ry + 0.02)), h = p[2] * (0.12 + R() * 0.12);
        g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + (R() - 0.5) * 4, p[1] - h); g.stroke();
      }
      // ต้นปาล์มสองต้นหลังสระ เอนออกด้านข้าง
      const ax = viewAxes(), er = Math.abs(ax.rx) * c.rx + Math.abs(ax.ry) * c.ry, ef = Math.abs(ax.fx) * c.rx + Math.abs(ax.fy) * c.ry;
      for (const d of [-1, 1]) {
        const p = P(c.cx + ax.rx * d * (er + 0.18) - ax.fx * (ef - 0.35), c.cy + ax.ry * d * (er + 0.18) - ax.fy * (ef - 0.35));
        drawPalm(g, p[0], p[1], p[2] * 1.05, d * 0.9, night);
      }
    }
    return;
  }
  const acc = C.accent || "#7fd88f";
  for (const { x, y } of info.heal) {
    quad(g, x, y, 0.07); g.fillStyle = hexA(acc, night ? 0.22 : 0.2); g.fill(); g.strokeStyle = hexA(acc, 0.85); g.lineWidth = 1.5; g.stroke();
    g.strokeStyle = hexA(acc, 0.9); g.lineWidth = 1.4; gEllipse(g, x + 0.5, y + 0.5, 0.3, 0, 30); g.stroke();
    // เครื่องหมายบวก (ฟื้นฟู)
    g.lineWidth = 2.4; g.lineCap = "round";
    let a = P(x + 0.5, y + 0.36), b = P(x + 0.5, y + 0.64); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    a = P(x + 0.36, y + 0.5); b = P(x + 0.64, y + 0.5); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.lineCap = "butt";
  }
}
export function animHeal(g, info, ctx, t) {
  const { night, C, area } = ctx;
  if (area === 5) {
    for (const c of info.healClusters) {
      g.save(); gEllipse(g, c.cx, c.cy, c.rx - 0.12, 0, 40, c.ry - 0.12); g.clip();
      g.strokeStyle = night ? "rgba(200,235,255,.3)" : "rgba(255,255,255,.55)"; g.lineWidth = 1.3;
      for (let k = 0; k < 3; k++) {
        const ph = (k / 3 + t / 3600) % 1;
        gEllipse(g, c.cx + 0.1 * Math.sin(k * 2), c.cy - 0.1 * Math.cos(k * 3), (c.rx - 0.1) * ph, 0, 32, (c.ry - 0.1) * ph);
        g.globalAlpha = 1 - ph; g.stroke();
      }
      g.globalAlpha = 1; g.restore();
    }
    return;
  }
  const acc = C.accent || "#7fd88f", p = 0.5 + 0.5 * Math.sin(t / 800);
  for (const { x, y } of info.heal) {
    gEllipse(g, x + 0.5, y + 0.5, 0.3 + 0.08 * p, 0, 30); g.fillStyle = hexA(acc, 0.08 + 0.12 * p); g.fill();
  }
}
