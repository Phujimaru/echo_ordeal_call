// ============================================================
//  สนาม Moon Cell (Raid Boss · GRID_PLAN §8.4) — ลานโรงเรียนบนดวงจันทร์ (area 30 · 20×20)
//   ผู้ใช้สั่ง: มีโรงเรียน + ต้นซากุระ กลีบโปรยตลอด (ภาพอ้างอิง: ลานหน้าอาคารเรียนอิฐแบบ Fate/EXTRA CCC)
//   ธีม (regionThemes.js themeOf):
//    back     ฟ้า + ตึกวิทยาเขตไกล + แนวซากุระหลังกระดาน · กลางคืน = ดาว + ดวงจันทร์ใหญ่เรืองฟ้า (อบ)
//    ground   ลานดินชมพูอ่อน + กลีบซากุระร่วงทั่วพื้น (อบ) · side ต้นซากุระสองข้าง (อบ) · fore ช่อดอกเบลอหน้ากล้อง
//    ambient  กลีบซากุระโปรยตลอด ทั้งกลางวัน/กลางคืน (lowQ ข้าม)
//   สิ่งกีดขวาง (boardProps.drawObstacle): school = อาคารเรียนอิฐแถวบนสุด ทีละช่อง ต่อกันด้วย conn.l/r
//    (2 ช่องกลาง = ทางเข้าหน้าจั่ว + นาฬิกา) · sakura = ต้นซากุระ · bench = ม้านั่งไม้
// ============================================================
import { LW, OX, P, PA, PS, faceVisible, gPoly, glow, rng, sceneSize, viewAxes } from "./boardGeo";

const TAU = Math.PI * 2;
export const MOON_AREA = 30;
const SCHOOL_H = 2.2;   // ความสูงอาคารเรียน (หน่วยช่อง)
const GABLE_H = 0.75;   // หน้าจั่วเหนือหลังคา (ทางเข้ากลาง)
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

// =================================================================== palettes
const PAL = {
  day: {
    ground1: "#efdcd6", ground2: "#d8b8b3", tile: "rgba(120,60,70,.05)", tile2: "rgba(120,60,70,.12)",
    grid: "rgba(120,60,70,.14)", border: "rgba(255,255,255,.8)", spawn: "rgba(150,70,90,.3)",
    light: ["rgba(255,245,235,.22)", "rgba(60,20,40,.12)"], nightTint: null, shadow: "rgba(70,40,50,.24)",
    sky: ["#a7cbef", "#dfe9f6", "#f6e4ec"], hill: ["#c9d3e4", "#b9c4d8"], horizon: "#e3c9cc",
    c1: "#f8bfd6", c2: "#ec9bbd", c3: "#ffe3ee", trunk: "#5e4038", leaf: "#e9a3c1", foreAcc: "#ffd6e6",
    dots: ["#f7b7cf", "#ffffff", "#f39ac0"], petal: ["#f9b6cf", "#ffe1ec", "#f08fb6"], dirt: "rgba(170,120,110,.07)",
    brick: "#a5534a", brick2: "#7e3a35", stone: "#f1eadf", stone2: "#d6cbbb", roof: "#4c5162", roof2: "#373b49",
    frame: "#3d3a3c", pane: "#9fb6cc", pane2: "#c9dcec", door: "#3b2f2c", accent: "#ff7fae",
  },
  night: {
    ground1: "#3c3550", ground2: "#1b1730", tile: "rgba(220,200,255,.05)", tile2: "rgba(220,200,255,.12)",
    grid: "rgba(200,225,255,.13)", border: "rgba(200,225,255,.4)", spawn: "rgba(200,225,255,.35)",
    light: ["rgba(120,170,255,.08)", "rgba(0,8,24,.3)"], nightTint: "rgba(8,18,40,.2)", shadow: "rgba(0,0,0,.4)",
    sky: ["#050b22", "#14214d", "#2b3570"], hill: ["#1d2547", "#171d3a"], horizon: "#2b2a4a",
    c1: "#c48ab2", c2: "#a56c99", c3: "#e2b3d1", trunk: "#2c2026", leaf: "#3b2648", foreAcc: "#7a4a7a",
    dots: ["#d48fb6", "#e6e0ff", "#b97aa6"], petal: ["#f2b6d3", "#ffe6f2", "#d98ab6"], dirt: "rgba(10,8,30,.12)",
    brick: "#5f3843", brick2: "#472a35", stone: "#a9b1cf", stone2: "#848cab", roof: "#20243a", roof2: "#171a2b",
    frame: "#1d1b26", pane: "#ffd27a", pane2: "#fff0c0", door: "#1a1418", accent: "#ff9ad5",
  },
};

// =================================================================== helpers (อบ)
function skyFill(c, stops) {
  const { g, VX0, VY0, VW, bY } = c, gr = g.createLinearGradient(0, VY0, 0, bY);
  stops.forEach((col, i) => gr.addColorStop(i / (stops.length - 1), col));
  g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY - 18 - VY0);
}
// ช่อดอกซากุระ (ก้อนกลมซ้อน) — x, y = โคนต้น · s = ขนาด
function blossomTree(g, x, y, s, C, seed = 1) {
  const R = rng(seed * 97 + 13);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y, s * 0.5, s * 0.15, 0, 0, TAU); g.fill();
  // ลำต้นโค้ง + กิ่ง
  g.strokeStyle = C.trunk; g.lineCap = "round";
  g.lineWidth = Math.max(2, s * 0.13); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - s * 0.08, y - s * 0.4, x + s * 0.04, y - s * 0.78); g.stroke();
  g.lineWidth = Math.max(1.2, s * 0.06);
  g.beginPath(); g.moveTo(x, y - s * 0.5); g.lineTo(x - s * 0.32, y - s * 0.85); g.moveTo(x + s * 0.02, y - s * 0.6); g.lineTo(x + s * 0.34, y - s * 0.9); g.stroke();
  const blob = (dx, dy, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, TAU); g.fill(); };
  blob(-0.36, -0.88, 0.3, C.c2); blob(0.36, -0.9, 0.3, C.c2); blob(0, -1.12, 0.38, C.c1);
  blob(-0.22, -1.02, 0.26, C.c1); blob(0.24, -1.06, 0.26, C.c1); blob(-0.1, -1.26, 0.18, C.c3); blob(0.18, -1.2, 0.12, C.c3);
  // จุดดอกประปราย
  for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? C.c3 : "#ffffff"; g.globalAlpha = 0.7; g.beginPath(); g.arc(x + (R() - 0.5) * s * 0.9, y - s * (0.8 + R() * 0.5), Math.max(0.8, s * 0.03), 0, TAU); g.fill(); }
  g.globalAlpha = 1;
}
function petalShape(g, x, y, r, rot, col) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = col; g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(r * 0.9, -r * 0.2, 0, r); g.quadraticCurveTo(-r * 0.9, -r * 0.2, 0, -r); g.fill();
  g.restore();
}
// ฉากสองข้างกระดาน (เรียงไกล→ใกล้) — แบบเดียวกับ regionThemes sideRow
function sideRow(c, seed, density, draw) {
  const { VX0, VX1, VW } = c, { cols: COLS, rows: ROWS } = sceneSize();
  const rs = rng(seed), band = 2.2 + Math.max(0, (VW - LW) / 60), nSide = Math.round(16 * density * band / 2.2);
  const list = [];
  for (let i = 0; i < nSide; i++) {
    list.push([-1.6 - rs() * band, rs() * (ROWS + 0.5), rs()]);
    list.push([COLS + 0.6 + rs() * band, rs() * (ROWS + 0.5), rs()]);
  }
  list.sort((a, b) => a[1] - b[1]).forEach(([x, y, r]) => {
    const [sx, sy, s] = PS(x, y);
    if (sx < VX0 - 80 || sx > VX1 + 80) return;
    draw(sx, sy, s, r);
  });
}
// ตึกวิทยาเขตไกล (สี่เหลี่ยมแบนมีหน้าต่างแถว) — x = กลาง · base = ฐาน
function farBlock(g, x, base, w, h, C, night) {
  g.fillStyle = night ? "#2a2d4e" : "#c7b2b0"; g.fillRect(x - w / 2, base - h, w, h);
  g.fillStyle = night ? "#22253f" : "#b39c9b"; g.fillRect(x + w * 0.2, base - h, w * 0.3, h);
  g.fillStyle = night ? "#1b1e33" : "#8d93a4"; g.fillRect(x - w / 2 - 3, base - h - 4, w + 6, 4);
  for (let r = 0; r < Math.floor(h / 13); r++) for (let k = 0; k < Math.floor(w / 12); k++) {
    const lit = night && hash(r * 31 + k, x) > 0.55;
    g.fillStyle = lit ? "rgba(255,210,122,.9)" : night ? "rgba(120,140,190,.35)" : "rgba(80,90,110,.45)";
    g.fillRect(x - w / 2 + 4 + k * 12, base - h + 6 + r * 13, 6, 6);
  }
}

// =================================================================== ธีม
const THEME = {
  back(c) {
    const { g, C, night, bY, VX0, VX1, VW, VY0 } = c;
    skyFill(c, C.sky);
    if (night) {
      const R = rng(77);
      for (let i = 0, n = Math.round(90 * VW / LW); i < n; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.6})`; g.fillRect(VX0 + R() * VW, VY0 + R() * (bY - 60 - VY0), 1.4, 1.4); }
      // ดวงจันทร์ใหญ่เรืองฟ้า (SE.RA.PH)
      const mx = OX + 360, my = Math.max(VY0 + 70, bY - 230);
      glow(g, mx, my, 220, "120,180,255", 0.35);
      g.fillStyle = "#e9f2ff"; g.beginPath(); g.arc(mx, my, 54, 0, TAU); g.fill();
      g.fillStyle = "rgba(140,170,215,.35)";
      for (const [dx, dy, r] of [[-16, -10, 11], [14, 8, 8], [6, -22, 6], [-6, 20, 7]]) { g.beginPath(); g.arc(mx + dx, my + dy, r, 0, TAU); g.fill(); }
      g.strokeStyle = "rgba(61,139,217,.45)"; g.lineWidth = 1;
      for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(mx, my, 54, Math.abs(k) * 12 + 4, 0, 0, TAU); g.stroke(); }
    } else {
      glow(g, OX - 420, bY - 210, 160, "255,245,220", 0.5);
      g.fillStyle = "rgba(255,255,255,.85)";
      const R = rng(301);
      for (let i = 0; i < 6; i++) {
        const x = VX0 + (i + 0.5) / 6 * VW + (R() - 0.5) * 80, y = Math.max(VY0 + 20, bY - 220) + R() * 50, w = 40 + R() * 50;
        for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + (k - 1.5) * w * 0.32, y - (k % 2) * 6, w * 0.32, 9 + (k % 2) * 4, 0, 0, TAU); g.fill(); }
      }
    }
    // เนินไกล + ตึกวิทยาเขต
    g.fillStyle = C.hill[0]; g.beginPath(); g.moveTo(VX0, bY + 2);
    for (let x = VX0; x <= VX1 + 6; x += 6) g.lineTo(x, bY - 70 - Math.abs(Math.sin(x * 0.004)) * 26 - Math.sin(x * 0.011) * 8);
    g.lineTo(VX1, bY + 2); g.closePath(); g.fill();
    for (const [dx, w, h] of [[-470, 110, 64], [-330, 150, 84], [330, 150, 84], [470, 110, 58], [-610, 90, 46], [610, 90, 50]]) farBlock(g, OX + dx, bY - 26, w, h, C, night);
    // หอนาฬิกาไกลกลางวิทยาเขต
    g.fillStyle = night ? "#2a2d4e" : "#c7b2b0"; g.fillRect(OX - 18, bY - 150, 36, 124);
    g.fillStyle = night ? "#1b1e33" : "#8d93a4"; g.beginPath(); g.moveTo(OX - 24, bY - 150); g.lineTo(OX, bY - 178); g.lineTo(OX + 24, bY - 150); g.closePath(); g.fill();
    g.fillStyle = night ? "#ffe9b0" : "#f6f1e6"; g.beginPath(); g.arc(OX, bY - 128, 10, 0, TAU); g.fill();
    g.strokeStyle = "#3d3a3c"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(OX, bY - 128); g.lineTo(OX, bY - 135); g.moveTo(OX, bY - 128); g.lineTo(OX + 5, bY - 126); g.stroke();
    // ขอบฟ้า
    const gr = g.createLinearGradient(0, bY - 30, 0, bY + 10);
    gr.addColorStop(0, C.horizon); gr.addColorStop(1, C.ground1);
    g.fillStyle = gr; g.fillRect(VX0, bY - 30, VW, 40);
    // แนวซากุระหลังกระดาน
    const rt = rng(5), cnt = Math.round(30 * VW / LW);
    for (let i = 0; i < cnt; i++) {
      const x = VX0 + (i / Math.max(1, cnt - 1)) * VW + (rt() - 0.5) * 30, sz = 26 + rt() * 16;
      blossomTree(g, x, bY - 8 + rt() * 8, sz, C, i);
    }
  },
  ground(c) {
    const { g, C, night, R, VX0, VX1, bY, wx0, wx1, wy1 } = c;
    // รอยดิน/หญ้าแห้งเป็นหย่อม
    g.fillStyle = C.dirt;
    for (let i = 0; i < 140; i++) {
      const x = wx0 + R() * (wx1 - wx0), y = -1 + R() * (wy1 + 1), [sx, sy, s] = PS(x, y);
      if (sy < bY) continue;
      g.beginPath(); g.ellipse(sx, sy, s * (0.3 + R() * 0.5), s * (0.08 + R() * 0.12), 0, 0, TAU); g.fill();
    }
    // กลีบซากุระร่วงทั่วลาน
    const area = (wx1 - wx0) * (wy1 + 1), n = Math.min(3600, Math.round(area * 2.4));
    g.globalAlpha = night ? 0.7 : 0.9;
    for (let i = 0; i < n; i++) {
      const x = wx0 + R() * (wx1 - wx0), y = -0.5 + R() * (wy1 + 0.5), [sx, sy, s] = PS(x, y), rr = R();
      if (sy < bY || sx < VX0 - 4 || sx > VX1 + 4) continue;
      petalShape(g, sx, sy, Math.max(1, s * (0.03 + rr * 0.03)), R() * TAU, C.petal[i % C.petal.length]);
    }
    g.globalAlpha = 1;
  },
  side(c) { sideRow(c, 9, 1, (sx, sy, s, r) => blossomTree(c.g, sx, sy, s * (1.2 + r * 0.6), c.C, Math.round(r * 1000))); },
  fore(f, c) {
    const { VX0, VY0, VX1 } = c, C = c.C;
    for (const [cx, cy] of [[VX1 - 30, VY0 + 40], [VX1 - 100, VY0 - 10], [VX0 - 20, 300], [VX0 + 60, VY0 - 20]]) {
      f.fillStyle = C.c2; f.globalAlpha = 0.85;
      f.beginPath(); f.ellipse(cx, cy, 120, 80, 0.3, 0, TAU); f.fill();
      f.fillStyle = C.c1; f.beginPath(); f.ellipse(cx - 60, cy + 40, 90, 60, -0.2, 0, TAU); f.fill();
      f.fillStyle = C.c3; f.globalAlpha = 0.6; f.beginPath(); f.ellipse(cx - 30, cy - 20, 50, 26, 0.3, 0, TAU); f.fill();
    }
    f.globalAlpha = 1;
  },
  // กลีบซากุระโปรยตลอด (ทั้งกลางวัน/กลางคืน)
  ambient(g, f, t) {
    const { view, night, C } = f, W = view.x1 - view.x0, H = view.y1 - view.y0;
    for (let i = 0; i < 46; i++) {
      const ph = (t / (9000 + (i % 7) * 900) + hash(i, 1)) % 1;
      const x = view.x0 + ((hash(i, 2) + ph * 0.45 + Math.sin(t / 1300 + i) * 0.02) % 1) * W;
      const y = view.y0 - 20 + ph * (H + 40) + Math.sin(t / 800 + i * 1.7) * 12;
      const r = 3 + hash(i, 3) * 3.5, flip = Math.abs(Math.sin(t / (500 + i * 13) + i));
      g.globalAlpha = (night ? 0.75 : 0.95) * Math.min(1, Math.sin(ph * Math.PI) * 3);
      g.save(); g.translate(x, y); g.rotate(t / (700 + i * 21) + i); g.scale(1, 0.35 + flip * 0.65);
      petalShape(g, 0, 0, r, 0, C.petal[i % C.petal.length]);
      g.restore();
    }
    g.globalAlpha = 1;
  },
};
THEME.pal = PAL;
export const MOON_THEMES = { [MOON_AREA]: THEME };

// =================================================================== สิ่งกีดขวาง
// กล่องตั้งบนพื้น (หน่วยช่อง) — ด้านข้างที่หันเข้ากล้อง แล้วค่อยฝา · skip = ด้านที่ไม่ต้องวาด (ชิดกล่องข้างๆ)
function box(g, x0, y0, x1, y1, z0, z1, col, skip = {}) {
  const fd = viewAxes();
  const sides = [
    ["l", -1, 0, x0, (y0 + y1) / 2, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]]],
    ["r", 1, 0, x1, (y0 + y1) / 2, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]],
    ["u", 0, -1, (x0 + x1) / 2, y0, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]],
    ["d", 0, 1, (x0 + x1) / 2, y1, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]],
  ].filter(([k, nx, ny, px, py]) => !skip[k] && faceVisible(nx, ny, px, py));
  for (const [, nx, ny, , , pts] of sides) {
    gPoly(g, pts); g.fillStyle = Math.abs(nx * fd.fx + ny * fd.fy) > 0.7 ? col.front : col.side; g.fill();
    if (col.edge) { g.strokeStyle = col.edge; g.lineWidth = 1; g.stroke(); }
  }
  gPoly(g, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]); g.fillStyle = col.top; g.fill();
  if (col.edge) { g.strokeStyle = col.edge; g.lineWidth = 1; g.stroke(); }
  return sides;
}

// อาคารเรียน (1 ช่อง ต่อกันทั้งแถว) — ด้านยาวหน้า/หลังมีหน้าต่าง 2 ชั้น · เสาขาวที่ขอบช่อง · ฝาเป็นหลังคา
//  ทางเข้ากลาง (2 ช่องกลางแถว): ประตู + บันได + หน้าจั่วนาฬิกาเหนือหลังคา (ฝั่งหันเข้าลาน)
export function drawSchool(g, t, ctx, now) {
  const { x, y } = t, conn = t.conn || {}, { C, night, cols } = ctx;
  const H = SCHOOL_H, v0 = y + 0.08, v1 = y + 0.92;
  const mid = Math.floor((cols || 20) / 2), entry = x === mid - 1 || x === mid;
  const [bx, by, s] = PA(x, y, 0.1);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx, by + s * 0.1, s * 0.6, s * 0.18, 0, 0, TAU); g.fill();
  const sides = box(g, x, v0, x + 1, v1, 0, H, { front: C.brick, side: C.brick2, top: C.roof, edge: "rgba(0,0,0,.18)" }, { l: conn.l, r: conn.r });
  // หลังคายื่น + สันหลังคา
  gPoly(g, [[x - (conn.l ? 0 : 0.04), v0 - 0.06, H], [x + 1 + (conn.r ? 0 : 0.04), v0 - 0.06, H], [x + 1 + (conn.r ? 0 : 0.04), v1 + 0.06, H], [x - (conn.l ? 0 : 0.04), v1 + 0.06, H]]);
  g.fillStyle = C.roof; g.fill();
  gPoly(g, [[x, (v0 + v1) / 2 - 0.05, H + 0.08], [x + 1, (v0 + v1) / 2 - 0.05, H + 0.08], [x + 1, (v0 + v1) / 2 + 0.05, H + 0.08], [x, (v0 + v1) / 2 + 0.05, H + 0.08]]);
  g.fillStyle = C.roof2; g.fill();
  // ลายบนด้านยาว (หน้า = ฝั่งลาน y+1 · หลัง)
  for (const [, nx, ny] of sides) {
    if (nx) continue;
    const v = ny > 0 ? v1 + 0.004 : v0 - 0.004;
    const quadAt = (u0, u1, z0, z1, col) => { gPoly(g, [[x + u0, v, z0], [x + u1, v, z0], [x + u1, v, z1], [x + u0, v, z1]]); g.fillStyle = col; g.fill(); };
    quadAt(0, 1, 0, 0.16, C.stone2);             // ฐานหิน
    quadAt(0, 1, 1.08, 1.14, C.stone);           // คิ้วระหว่างชั้น
    quadAt(0, 1, H - 0.12, H, C.stone);          // บัวใต้หลังคา
    if (!conn.l || x % 2 === 0) quadAt(0, 0.07, 0, H, C.stone);  // เสาขาว
    if (!conn.r) quadAt(0.93, 1, 0, H, C.stone);
    const door = entry && ny > 0;
    for (const [z0, z1] of [[0.32, 0.92], [1.3, 1.9]]) {
      for (const [u0, u1] of [[0.17, 0.45], [0.55, 0.83]]) {
        if (door && z0 < 1) continue;
        quadAt(u0 - 0.025, u1 + 0.025, z0 - 0.03, z1 + 0.03, C.frame);
        quadAt(u0, u1, z0, z1, C.pane);
        quadAt(u0, u1, z0 + (z1 - z0) * 0.55, z1, C.pane2);
        quadAt((u0 + u1) / 2 - 0.012, (u0 + u1) / 2 + 0.012, z0, z1, C.frame);
        if (night && hash(x * 7 + z0 * 3, u0 * 11) > 0.45) { const p = P(x + (u0 + u1) / 2, v, (z0 + z1) / 2); glow(g, p[0], p[1], s * 0.35, "255,210,122", 0.28); }
      }
    }
    if (door) {
      // ประตูไม้คู่ + ซุ้ม · บันไดหน้าทางเข้า
      const left = x === mid - 1;
      const [du0, du1] = left ? [0.35, 1] : [0, 0.65];
      quadAt(du0 - 0.04, du1 + 0.04, 0, 0.98, C.stone);
      quadAt(du0, du1, 0.12, 0.92, C.door);
      quadAt(left ? 0.97 : 0, left ? 1 : 0.03, 0.12, 0.92, C.frame);
      gPoly(g, [[x + du0, v1, 0.06], [x + du1, v1, 0.06], [x + du1, v1 + 0.16, 0.06], [x + du0, v1 + 0.16, 0.06]]); g.fillStyle = C.stone2; g.fill();
    }
  }
  // หน้าจั่วนาฬิกา (ฝั่งลาน) — ครึ่งซ้ายวาดที่ช่อง mid−1 ครึ่งขวาที่ช่อง mid
  if (entry && faceVisible(0, 1, x + 0.5, v1)) {
    const v = v1 + 0.01, left = x === mid - 1;
    const tri = left ? [[x, v, H], [x + 1, v, H + GABLE_H], [x + 1, v, H]] : [[x, v, H], [x, v, H + GABLE_H], [x + 1, v, H]];
    gPoly(g, tri); g.fillStyle = C.brick; g.fill(); g.strokeStyle = C.stone; g.lineWidth = Math.max(1.5, s * 0.05); g.stroke();
    if (!left) {
      const c = P(x, v, H + GABLE_H * 0.42), r = s * 0.17;
      g.fillStyle = C.stone; g.beginPath(); g.arc(c[0], c[1], r * 1.18, 0, TAU); g.fill();
      g.fillStyle = night ? "#fff4cf" : "#fbf8f0"; g.beginPath(); g.arc(c[0], c[1], r, 0, TAU); g.fill();
      if (night) glow(g, c[0], c[1], r * 3, "255,230,160", 0.35);
      const hr = (now / 60000) % 1, mn = (now / 5000) % 1;
      g.strokeStyle = "#3d3a3c"; g.lineCap = "round";
      g.lineWidth = Math.max(1.2, r * 0.14); g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[0] + Math.sin(hr * TAU) * r * 0.5, c[1] - Math.cos(hr * TAU) * r * 0.5); g.stroke();
      g.lineWidth = Math.max(1, r * 0.09); g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[0] + Math.sin(mn * TAU) * r * 0.78, c[1] - Math.cos(mn * TAU) * r * 0.78); g.stroke();
    }
  }
}

// ต้นซากุระ (สิ่งกีดขวาง) — ใหญ่กว่าต้นไม้ปกติ + กลีบร่วงรอบโคน
export function drawSakura(g, t, ctx, now) {
  const { x, y } = t, { C } = ctx;
  const [sx, sy, s] = PA(x, y, 0.1);
  for (let i = 0; i < 6; i++) {
    const a = hash(x * 13 + y, i) * TAU, d = 0.15 + hash(y * 7 + x, i) * 0.35;
    const p = P(x + 0.5 + Math.cos(a) * d, y + 0.5 + Math.sin(a) * d);
    petalShape(g, p[0], p[1], Math.max(1.2, s * 0.04), a, C.petal[i % C.petal.length]);
  }
  const sway = Math.sin(now / 1700 + x * 1.3 + y) * s * 0.015;
  blossomTree(g, sx + sway, sy, s * 1.55, C, x * 31 + y);
}

// ม้านั่งไม้ (ตามแนวแกน x ของกระดาน) — ที่นั่ง + พนักพิง + ขาเหล็ก
export function drawBench(g, t, ctx) {
  const { x, y } = t, { C, night } = ctx;
  const [bx, by, s] = PA(x, y, 0);
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(bx, by, s * 0.45, s * 0.12, 0, 0, TAU); g.fill();
  const iron = { front: night ? "#2a2c36" : "#4a4d58", side: night ? "#202229" : "#3a3d47", top: night ? "#34363f" : "#5a5d68" };
  const wood = { front: night ? "#6b4c3a" : "#b07a50", side: night ? "#553c2e" : "#8d5f3e", top: night ? "#7c5945" : "#c58d5e", edge: "rgba(0,0,0,.2)" };
  for (const lx of [0.14, 0.8]) box(g, x + lx, y + 0.36, x + lx + 0.06, y + 0.66, 0, 0.3, iron);
  box(g, x + 0.08, y + 0.34, x + 0.92, y + 0.68, 0.3, 0.36, wood);
  for (const lx of [0.14, 0.8]) box(g, x + lx, y + 0.32, x + lx + 0.05, y + 0.36, 0.36, 0.62, iron);
  box(g, x + 0.08, y + 0.3, x + 0.92, y + 0.35, 0.46, 0.64, wood);
}
