// ============================================================
//  สนาม "สนธยายามค่ำคืน" ของโอเบรอน (วอร์ติเกิร์น) — area 90 · 10×10 (server/board.js OBERON_AREA · GRID_PLAN §7.46)
//   ผู้ใช้สั่ง (2026-11-27): อุโมงค์หลุมหมุนวนสีแดงดำแบบภาพอ้างอิง · ฝุ่นคลุ้ง · เอฟเฟกต์รุนแรงสุด
//    ให้รู้สึกว่าอยู่ในตัวหลุมที่ถูกกลืนลงไปเรื่อยๆ · ความน่ากลัว + ความเน่าเปื่อยของซาก
//   ธีม (regionThemes.js themeOf):
//    back      ผนังอุโมงค์หินแดงดำเป็นชั้นๆ ลึกเข้าหาจุดหายไปเหนือกระดาน (อบ) → marks.obv = จุดหายไป
//    animBack  วงผนังหลุมไหลออกจากจุดหายไป (ร่วงลึกลงเรื่อยๆ) + หมุนช้า + เส้นแสงเลือด (ทุกเฟรม)
//    base      แท่นเนื้อเน่าใต้กระดาน ขอบย้อยเลือด/หนองลงความมืด (อบ)
//    ground    ซาก/กระดูก/แอ่งหนองรอบแท่น (อบ) · side ซี่โครงยักษ์+หัวกะโหลกสองข้าง (อบ)
//    ambient   ฝุ่นซากหมุนเป็นเกลียวดูดเข้าหลุม · แมลงวันวนซาก · ประกายเลือด · หยดหนอง (lowQ ข้าม)
// ============================================================
import { P, PS, gPoly, glow, viewAxes, depthOf } from "./boardGeo";

const TAU = Math.PI * 2;
export const OBERON_AREA = 90;
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const PAL = {
  ground1: "#2a070b", ground2: "#070103", tile: "rgba(120,24,30,.28)", tile2: "rgba(70,10,16,.42)",
  grid: "rgba(255,90,80,.2)", border: "rgba(255,110,90,.55)", spawn: "rgba(255,120,100,.0)",
  light: ["rgba(255,80,60,.06)", "rgba(0,0,0,.35)"], nightTint: "rgba(30,0,8,.18)", shadow: "rgba(0,0,0,.55)",
  line: "rgba(255,120,100,.8)", gold: "#ff6a4a", accent: "#ff3a3a",
  flesh: "#4a141a", flesh2: "#2a0a0e", vein: "rgba(150,20,30,.55)", bone: "#a8987a", bone2: "#6d6250",
  pus: "rgba(160,150,60,.55)", rot: "rgba(70,90,30,.5)", blood: "#7a0612",
  leaf: "rgba(60,0,10,.85)", foreAcc: "rgba(120,20,20,.6)",
};

// ---------- อบ ----------
function ribCage(g, x, y, s, flip, C) {
  g.save(); g.translate(x, y); g.scale(flip ? -1 : 1, 1);
  g.strokeStyle = C.bone2; g.lineCap = "round";
  g.lineWidth = Math.max(2, s * 0.08);
  g.beginPath(); g.moveTo(-s * 0.6, 0); g.quadraticCurveTo(0, -s * 0.25, s * 0.6, -s * 0.05); g.stroke(); // กระดูกสันหลัง
  for (let i = 0; i < 6; i++) {
    const bx = -s * 0.45 + i * s * 0.18, h = s * (0.9 - Math.abs(i - 2.5) * 0.12);
    g.strokeStyle = i % 2 ? C.bone : C.bone2; g.lineWidth = Math.max(1.5, s * 0.055);
    g.beginPath(); g.moveTo(bx, -s * 0.12); g.quadraticCurveTo(bx + s * 0.35, -h, bx + s * 0.12, -h * 1.25); g.stroke();
  }
  g.restore();
}
function skull(g, x, y, s, C) {
  g.fillStyle = C.bone; g.beginPath(); g.ellipse(x, y - s * 0.55, s * 0.42, s * 0.38, 0, 0, TAU); g.fill();
  g.fillRect(x - s * 0.22, y - s * 0.3, s * 0.44, s * 0.25);
  g.fillStyle = "#120306"; g.beginPath(); g.ellipse(x - s * 0.15, y - s * 0.52, s * 0.1, s * 0.12, 0, 0, TAU); g.ellipse(x + s * 0.15, y - s * 0.52, s * 0.1, s * 0.12, 0, 0, TAU); g.fill();
}
function puddle(g, x, y, s, col) {
  g.fillStyle = col; g.beginPath(); g.ellipse(x, y, s * 0.5, s * 0.16, 0, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,255,220,.12)"; g.beginPath(); g.ellipse(x - s * 0.12, y - s * 0.03, s * 0.12, s * 0.03, 0, 0, TAU); g.fill();
}
// ผนังหิน 1 วง (หยัก) ศูนย์กลาง (cx,cy) รัศมี r รี k
function rockRing(g, cx, cy, r, k, rot, seed, n = 28) {
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU + rot, j = 1 + (hash(i % n, seed) - 0.5) * 0.12;
    const x = cx + Math.cos(a) * r * j, y = cy + Math.sin(a) * r * k * j;
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.closePath();
}

const THEME = {
  back(c) {
    const { g, VX0, VY0, VX1, VY1, VW, bY } = c;
    const vx = (P(0, 0)[0] + P(c.info.cols, 0)[0]) / 2, vy = Math.max(VY0 + 60, bY - 150);
    const R = Math.hypot(Math.max(vx - VX0, VX1 - vx), Math.max(vy - VY0, VY1 - vy)) * 1.15;
    c.marks.obv = { vx, vy, R };
    // ปากหลุมไกลสุด (จุดหายไป): แสงแดงหม่น
    const gr = g.createRadialGradient(vx, vy, 0, vx, vy, R);
    gr.addColorStop(0, "#6a0c12"); gr.addColorStop(0.06, "#2a0408"); gr.addColorStop(0.35, "#0e0205"); gr.addColorStop(1, "#020002");
    g.fillStyle = gr; g.fillRect(VX0, VY0, VW, VY1 - VY0);
    glow(g, vx, vy, 90, "255,60,40", 0.55);
    // ผนังหินเป็นชั้น (ไกล→ใกล้)
    for (let i = 26; i >= 1; i--) {
      const f = i / 26, r = R * f * f;
      rockRing(g, vx, vy + f * f * 120, r, 0.6, i * 0.37, i);
      g.fillStyle = `rgba(${22 + Math.round(f * 34)},${4 + Math.round(f * 6)},${6 + Math.round(f * 4)},${0.4 + f * 0.25})`;
      g.fill();
      g.strokeStyle = `rgba(120,14,20,${0.2 + 0.3 * (1 - f)})`; g.lineWidth = 1 + f * 3; g.stroke();
    }
  },
  ground(c) {
    const { g, C, R, VX0, VX1 } = c, { cols, rows } = c.info;
    // ซากรอบแท่น: กระดูก/หนอง/เลือด กระจายเป็นวงรอบกระดาน
    for (let i = 0; i < 90; i++) {
      const a = R() * TAU, d = 1.2 + R() * 4.5;
      const x = cols / 2 + Math.cos(a) * (cols / 2 + d), y = rows / 2 + Math.sin(a) * (rows / 2 + d);
      const [sx, sy, s] = PS(x, y);
      if (sx < VX0 - 40 || sx > VX1 + 40) continue;
      const k = R();
      if (k < 0.3) puddle(g, sx, sy, s * (0.6 + R() * 0.8), R() < 0.5 ? C.pus : C.blood);
      else if (k < 0.55) { g.strokeStyle = C.bone2; g.lineWidth = Math.max(1, s * 0.05); g.beginPath(); g.moveTo(sx - s * 0.2, sy); g.lineTo(sx + s * 0.2, sy - s * 0.05); g.stroke(); }
      else if (k < 0.65) skull(g, sx, sy, s * 0.35, C);
      else { g.fillStyle = C.rot; g.beginPath(); g.ellipse(sx, sy, s * 0.35, s * 0.1, 0, 0, TAU); g.fill(); }
    }
  },
  base(c) {
    const { g, C, R, info } = c, COLS = info.cols, ROWS = info.rows, m = 0.35;
    const top = [[-m, -m], [COLS + m, -m], [COLS + m, ROWS + m], [-m, ROWS + m]];
    const ax = viewAxes();
    const segs = [];
    for (let i = 0; i < 4; i++) {
      const A = top[i], B = top[(i + 1) % 4], nx = B[1] - A[1], ny = -(B[0] - A[0]);
      if (nx * ax.fx + ny * ax.fy > 0.05) segs.push({ A, B, d: depthOf((A[0] + B[0]) / 2, (A[1] + B[1]) / 2) });
    }
    segs.sort((a, b) => a.d - b.d);
    for (const { A, B } of segs) {
      const p0 = P(A[0], A[1], 0), p1 = P(A[0], A[1], -3);
      const gr = g.createLinearGradient(0, p0[1], 0, p1[1]);
      gr.addColorStop(0, C.flesh); gr.addColorStop(0.5, C.flesh2); gr.addColorStop(1, "rgba(5,0,2,0)");
      gPoly(g, [[A[0], A[1], 0], [B[0], B[1], 0], [B[0], B[1], -3], [A[0], A[1], -3]]); g.fillStyle = gr; g.fill();
      // ย้อยเลือด/หนอง
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      for (let k = 0; k < L * 2.2; k++) {
        const t = R(), x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t, len = 0.3 + R() * 1.8;
        const q0 = P(x, y, 0), q1 = P(x, y, -len);
        g.strokeStyle = R() < 0.65 ? "rgba(120,6,18,.85)" : "rgba(150,140,50,.7)"; g.lineWidth = 1 + R() * 2.4; g.lineCap = "round";
        g.beginPath(); g.moveTo(q0[0], q0[1]); g.lineTo(q1[0], q1[1]); g.stroke();
        g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(q1[0], q1[1], g.lineWidth * 0.8, 0, TAU); g.fill();
      }
    }
    // ผิวแท่นเนื้อเน่า + เส้นเลือด
    gPoly(g, top.map(([x, y]) => [x, y, 0])); g.fillStyle = C.flesh; g.fill();
    g.strokeStyle = C.vein; g.lineWidth = 1.2;
    for (let i = 0; i < 30; i++) {
      let x = R() * COLS, y = R() * ROWS; g.beginPath(); let p = P(x, y); g.moveTo(p[0], p[1]);
      for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 0.8; y += (R() - 0.5) * 0.8; p = P(x, y); g.lineTo(p[0], p[1]); }
      g.stroke();
    }
    for (let i = 0; i < 40; i++) {
      const p = P(R() * COLS, R() * ROWS);
      g.fillStyle = i % 3 ? "rgba(0,0,0,.25)" : C.pus;
      g.beginPath(); g.ellipse(p[0], p[1], p[2] * (0.05 + R() * 0.14), p[2] * (0.02 + R() * 0.05), 0, 0, TAU); g.fill();
    }
  },
  side(c) {
    const { g, C, VX0, VX1 } = c, { cols, rows } = c.info;
    const list = [];
    for (let i = 0; i < 10; i++) {
      list.push([-1.5 - hash(i, 1) * 3, hash(i, 2) * rows, i]);
      list.push([cols + 1 + hash(i, 3) * 3, hash(i, 4) * rows, i + 20]);
    }
    list.sort((a, b) => a[1] - b[1]).forEach(([x, y, i]) => {
      const [sx, sy, s] = PS(x, y);
      if (sx < VX0 - 80 || sx > VX1 + 80) return;
      if (i % 3 === 0) skull(g, sx, sy, s * 0.55, C);
      else ribCage(g, sx, sy, s * (0.8 + hash(i, 5) * 0.7), x > cols / 2, C);
    });
  },
  fore(f, c) {
    const { VX0, VY0, VX1, VY1 } = c;
    for (const [cx, cy, r] of [[VX0 + 20, VY0 + 20, 260], [VX1 - 20, VY0 + 10, 240], [VX0 - 10, VY1 - 10, 280], [VX1 + 10, VY1, 260]]) {
      const gr = f.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, "rgba(10,0,2,.9)"); gr.addColorStop(0.6, "rgba(50,4,10,.5)"); gr.addColorStop(1, "rgba(50,4,10,0)");
      f.fillStyle = gr; f.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  },
  // วงผนังหลุมไหลออกจากจุดหายไป = ร่วงลึกลงเรื่อยๆ · หมุนช้า · เส้นแสงเลือดพุ่งผ่าน
  animBack(g, f, t) {
    const o = f.marks.obv;
    if (!o) return;
    const { vx, vy, R } = o, n = f.lowQ ? 7 : 14, speed = REDUCED ? 0 : t / 5200;
    for (let i = 0; i < n; i++) {
      const fr = ((i / n) + speed) % 1, e = fr * fr, r = R * e;
      if (r < 6) continue;
      rockRing(g, vx, vy + e * 120, r, 0.6, i * 1.3 + t / (9000 + i * 300), i + 40, 22);
      g.strokeStyle = `rgba(${120 + Math.round(90 * (1 - fr))},${10 + Math.round(24 * (1 - fr))},20,${0.12 + 0.38 * Math.sin(fr * Math.PI)})`;
      g.lineWidth = 1 + e * 9; g.stroke();
    }
    // เส้นแสงพุ่ง (ความเร็วการตก)
    if (!f.lowQ) {
      for (let i = 0; i < 26; i++) {
        const ph = (t / (1400 + (i % 5) * 220) + hash(i, 9)) % 1, a = hash(i, 8) * TAU + t / 12000;
        const r0 = R * ph * ph, r1 = R * Math.min(1, (ph + 0.08) * (ph + 0.08));
        g.strokeStyle = `rgba(255,${90 + (i % 3) * 30},70,${0.35 * Math.sin(ph * Math.PI)})`; g.lineWidth = 1 + ph * 2;
        g.beginPath(); g.moveTo(vx + Math.cos(a) * r0, vy + Math.sin(a) * r0 * 0.6); g.lineTo(vx + Math.cos(a) * r1, vy + Math.sin(a) * r1 * 0.6); g.stroke();
      }
    }
    // ปากหลุมเต้นเหมือนหายใจ
    glow(g, vx, vy, 70 + 25 * Math.sin(t / 700), "255,40,30", 0.35 + 0.15 * Math.sin(t / 700));
  },
  ambient(g, f, t) {
    const o = f.marks.obv, { info } = f;
    // ฝุ่นซากหมุนเกลียวดูดเข้าหลุม (พิกัดฉาก)
    if (o) {
      const n = f.lowQ ? 0 : 70;
      for (let i = 0; i < n; i++) {
        const ph = (t / (5000 + (i % 7) * 600) + hash(i, 21)) % 1, rr = o.R * 0.9 * (1 - ph);
        const a = hash(i, 22) * TAU + ph * 7;
        const x = o.vx + Math.cos(a) * rr, y = o.vy + Math.sin(a) * rr * 0.6;
        g.globalAlpha = Math.sin(ph * Math.PI) * 0.8;
        g.fillStyle = i % 6 === 0 ? "#d9ccb0" : i % 3 ? "#7a4a3a" : "#5a6a2a";
        const s = 1.2 + hash(i, 23) * 2.6;
        g.fillRect(x - s / 2, y - s / 2, s, s);
      }
    }
    // แมลงวันวนรอบซากที่ขอบกระดาน
    for (let i = 0; i < (f.lowQ ? 6 : 18); i++) {
      const cx = hash(i, 31) < 0.5 ? -1 - hash(i, 32) * 2 : info.cols + 1 + hash(i, 32) * 2, cy = hash(i, 33) * info.rows;
      const a = t / (180 + i * 7) + i;
      const [x, y] = P(cx + Math.cos(a) * 0.35, cy + Math.sin(a * 1.3) * 0.25, 0.6 + Math.sin(a * 0.7) * 0.25);
      g.globalAlpha = 0.85; g.fillStyle = "#0a0204"; g.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
    }
    // ประกายเลือดลอยขึ้นจากแท่น + หยดหนองร่วงจากขอบ
    for (let i = 0; i < (f.lowQ ? 8 : 24); i++) {
      const ph = (t / (2600 + (i % 6) * 300) + hash(i, 41)) % 1;
      const [x, y] = P(hash(i, 42) * info.cols, hash(i, 43) * info.rows, ph * 2.4);
      g.globalAlpha = Math.sin(ph * Math.PI) * 0.8; g.fillStyle = i % 4 ? "#ff3a2a" : "#ffb070";
      g.fillRect(x - 1, y - 1, 2, 2);
    }
    g.globalAlpha = 1;
  },
};
THEME.pal = { day: PAL, night: PAL };

export const OBERON_THEMES = { [OBERON_AREA]: THEME };
