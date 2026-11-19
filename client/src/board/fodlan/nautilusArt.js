// ============================================================
//  Nautilus (GRID_PLAN §8.9) — ภาพบนกระดานของชั้นใต้ทะเล 5 ชั้น (ด่าน 7–11 · area 46–50) · ใช้จาก ./stage7.js … ./stage11.js
//  makeNautilusStage(cfg) → โมดูลด่านตามสัญญาของ ./index.js (theme · kinds · tall · drawObstacle · bakeSpecial · animSpecial · ground · air · fogRGB)
//  อารมณ์ (memory: ฉากใหม่ต้องมืด/ดราม่าแบบฉาก 3D): ยิ่งลึกยิ่งมืด — ชั้น 1 แสงแดดรำไรเป็นลำ · ชั้น 5 มืดสนิท เหลือแค่แสงเรืองของสิ่งมีชีวิต
//   back = มวลน้ำไล่สีจากผิวน้ำ (บน) ลงความมืด + ลำแสง + เงาไกล (กองปะการัง/ซากเรือ/ปล่อง/นคร/ผาร่องลึก)
//   ground/side = พื้นทะเลนอกกระดาน + ของข้างกระดานตามชั้น · deco = ลายพื้นบนกระดาน (ลอนทราย/รอยแตกเรือง/แผ่นหิน …)
//   animBack/ambient = แสงคลื่นระยิบ (ชั้นตื้น) · หิมะทะเลลอยลง · ฟองอากาศลอยขึ้นจากจุดฟื้นฟู · ประกายเรือง
//  ของที่ขยับได้ (เรือ ปลาวาฬ ลูกเล่นของชั้น) มาในขั้น 2–4 ผ่าน items/air ของแต่ละ stageN.js
//  แสงเรืองใช้สไปรต์แคช (ไม่สร้าง gradient ทุกเฟรม) · lowQ = ตัดอนุภาค
// ============================================================
import { P, PA, PS, faceVisible, gPoly, glow, quad, rng, sceneSize, viewAxes } from "../boardGeo";

const TAU = Math.PI * 2;
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

// ---------- สไปรต์แคช ----------
const SPRITES = new Map();
function sprite(k, w, h, paint) {
  if (typeof document === "undefined") return null;
  let c = SPRITES.get(k);
  if (!c) { c = document.createElement("canvas"); c.width = w; c.height = h; paint(c.getContext("2d"), w, h); SPRITES.set(k, c); }
  return c;
}
function softGlow(g, x, y, r, rgb, a) {
  if (!(a > 0.01) || !(r > 0.5)) return;
  const img = sprite(`ng${rgb}`, 64, 64, (c, w) => {
    const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.35, `rgba(${rgb},.45)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = gr; c.fillRect(0, 0, w, w);
  });
  if (!img) { glow(g, x, y, r, rgb, a); return; }
  const prev = g.globalAlpha;
  g.globalAlpha = prev * Math.min(1, a);
  g.drawImage(img, x - r, y - r, r * 2, r * 2);
  g.globalAlpha = prev;
}

// ---------- รูปทรง ----------
// กล่องตั้งบนพื้น (พิกัดกระดาน) — ด้านที่หันเข้ากล้อง แล้วฝา
function box(g, x0, y0, x1, y1, z0, z1, col) {
  const fd = viewAxes();
  const sides = [
    [-1, 0, x0, (y0 + y1) / 2, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]]],
    [1, 0, x1, (y0 + y1) / 2, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]],
    [0, -1, (x0 + x1) / 2, y0, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]],
    [0, 1, (x0 + x1) / 2, y1, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]],
  ];
  for (const [nx, ny, px, py, pts] of sides) {
    if (!faceVisible(nx, ny, px, py)) continue;
    gPoly(g, pts); g.fillStyle = Math.abs(nx * fd.fx + ny * fd.fy) > 0.7 ? col.front : col.side; g.fill();
    if (col.edge) { g.strokeStyle = col.edge; g.lineWidth = 1; g.stroke(); }
  }
  gPoly(g, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]); g.fillStyle = col.top; g.fill();
  if (col.edge) { g.strokeStyle = col.edge; g.lineWidth = 1; g.stroke(); }
}
// ก้อนหินมน (จุดบนจอ) — 3 ก้อนซ้อน · cols = [สว่าง, กลาง, มืด]
function blob(g, cx, cy, s, cols, R) {
  g.fillStyle = "rgba(0,0,0,.45)"; g.beginPath(); g.ellipse(cx, cy + s * 0.03, s * 0.46, s * 0.17, 0, 0, TAU); g.fill();
  g.fillStyle = cols[2]; g.beginPath(); g.ellipse(cx + s * 0.15, cy - s * 0.14, s * 0.27, s * 0.2, 0, 0, TAU); g.fill();
  g.fillStyle = cols[1]; g.beginPath(); g.ellipse(cx - s * 0.05, cy - s * (0.24 + R() * 0.06), s * 0.34, s * 0.3, 0, 0, TAU); g.fill();
  g.fillStyle = cols[0]; g.beginPath(); g.ellipse(cx - s * 0.14, cy - s * 0.36, s * 0.17, s * 0.11, -0.3, 0, TAU); g.fill();
}
// กิ่งปะการัง (จุดบนจอ) — กิ่งแตกแขนงขึ้นจากโคน
function coralBranch(g, x, y, h, col, R, sway = 0) {
  g.strokeStyle = col; g.lineCap = "round";
  const twig = (x0, y0, len, ang, w, d) => {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    if (d > 0) { twig(x1, y1, len * 0.7, ang - 0.45 - R() * 0.2 + sway, w * 0.7, d - 1); twig(x1, y1, len * 0.7, ang + 0.45 + R() * 0.2 + sway, w * 0.7, d - 1); }
  };
  twig(x, y, h * 0.45, -Math.PI / 2 + (R() - 0.5) * 0.4, Math.max(1.2, h * 0.09), 2);
  g.lineCap = "butt";
}

// ---------- ตัวสร้างโมดูลของชั้น ----------
//  cfg = { stage, depth, water: [บน, ล่าง], bed: [พื้นนอกกระดาน 2 สี], tile: [ช่อง 2 สี], grid, border, accent (จุดฟื้นฟู), glowRGB, shafts (0..1),
//          snowRGB, fogRGB, far: "mounds"|"wreck"|"chimneys"|"ruins"|"cliffs", deco: "sand"|"wreck"|"cracks"|"slabs"|"abyss", kinds, tall }
export function makeNautilusStage(cfg) {
  const C0 = {
    ground1: cfg.bed[0], ground2: cfg.bed[1], tile: cfg.tile[0], tile2: cfg.tile[1], grid: cfg.grid, border: cfg.border,
    spawn: cfg.spawn || "rgba(170,240,255,.4)", light: ["rgba(160,230,255,.04)", "rgba(0,4,10,.42)"], nightTint: null, shadow: "rgba(0,0,0,.5)",
    accent: cfg.accent, sky: cfg.water[0], dots: cfg.dots || ["#0b1a20"],
  };
  const PAL = { day: C0, night: { ...C0, nightTint: "rgba(0,4,14,.18)", light: ["rgba(140,210,255,.03)", "rgba(0,2,8,.5)"] } };
  const GLOW = cfg.glowRGB;

  // ---------------- ฉากหลัง (อบ) ----------------
  function farShapes(c) {
    const { g, bY, VX0, VX1, R } = c;
    const col = cfg.farCol;
    if (cfg.far === "mounds") {
      for (let x = VX0 - 80; x < VX1 + 80; x += 60 + R() * 70) {
        const h = 26 + R() * 50, w = 50 + R() * 70;
        g.fillStyle = col; g.beginPath(); g.ellipse(x, bY, w, h, 0, Math.PI, TAU); g.fill();
        // กิ่งปะการังบนกอง
        for (let k = 0; k < 3; k++) coralBranch(g, x - w * 0.5 + R() * w, bY - h * (0.4 + R() * 0.4), 20 + R() * 24, col, R);
      }
    } else if (cfg.far === "wreck") {
      // ซากเรือรบลำยักษ์จมเอียงกลางฉาก + เสากระโดงหัก
      g.fillStyle = col;
      g.beginPath(); g.moveTo(640 - 420, bY); g.lineTo(640 - 380, bY - 70); g.lineTo(640 + 260, bY - 110); g.lineTo(640 + 400, bY - 60); g.lineTo(640 + 430, bY); g.closePath(); g.fill();
      g.fillRect(640 - 120, bY - 170, 10, 80); g.fillRect(640 + 90, bY - 210, 12, 110);
      g.beginPath(); g.moveTo(640 + 96, bY - 210); g.lineTo(640 + 150, bY - 245); g.lineTo(640 + 154, bY - 238); g.lineTo(640 + 100, bY - 200); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,190,120,.18)";
      for (let i = 0; i < 6; i++) g.fillRect(640 - 300 + i * 90, bY - 70 - i * 6, 8, 6); // ช่องหน้าต่างเรือ (ไฟสะท้อนจาง)
      for (let x = VX0 - 60; x < VX1 + 60; x += 120 + R() * 120) { g.fillStyle = col; g.beginPath(); g.ellipse(x, bY, 60 + R() * 60, 14 + R() * 14, 0, Math.PI, TAU); g.fill(); }
    } else if (cfg.far === "chimneys") {
      for (let x = VX0 - 60; x < VX1 + 60; x += 80 + R() * 110) {
        const h = 50 + R() * 140, w = 14 + R() * 18;
        g.fillStyle = col; g.beginPath(); g.moveTo(x - w, bY); g.lineTo(x - w * 0.45, bY - h); g.lineTo(x + w * 0.45, bY - h); g.lineTo(x + w, bY); g.closePath(); g.fill();
        glow(g, x, bY - h, w * 2.4, GLOW, 0.35);
        g.fillStyle = "rgba(20,14,12,.55)"; g.beginPath(); g.ellipse(x, bY - h - 30, w * 1.4, 30, 0, 0, TAU); g.fill(); // ควันดำ
      }
      g.fillStyle = `rgba(${GLOW},.25)`; g.fillRect(VX0, bY - 3, VX1 - VX0, 2);
    } else if (cfg.far === "ruins") {
      // วิหารใหญ่กลาง + เสาเรียงสองข้าง · อักขระเรืองฟ้า
      g.fillStyle = col;
      g.beginPath(); g.moveTo(640 - 200, bY); g.lineTo(640 - 200, bY - 120); g.lineTo(640, bY - 190); g.lineTo(640 + 200, bY - 120); g.lineTo(640 + 200, bY); g.closePath(); g.fill();
      for (let i = -3; i <= 3; i++) { g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(640 + i * 52 - 9, bY - 115, 18, 115); }
      glow(g, 640, bY - 140, 70, GLOW, 0.35);
      for (let x = VX0 - 40; x < VX1 + 40; x += 70 + R() * 50) {
        if (Math.abs(x - 640) < 230) continue;
        const h = 60 + R() * 110, broken = R() < 0.5;
        g.fillStyle = col; g.fillRect(x - 10, bY - h, 20, h);
        if (broken) { g.beginPath(); g.moveTo(x - 10, bY - h); g.lineTo(x + 2, bY - h - 14); g.lineTo(x + 10, bY - h); g.closePath(); g.fill(); }
        else g.fillRect(x - 15, bY - h - 6, 30, 6);
        g.fillStyle = `rgba(${GLOW},.5)`; g.fillRect(x - 6, bY - h * 0.55, 12, 2);
      }
    } else if (cfg.far === "cliffs") {
      // ผาร่องลึกสองข้างบีบเข้า (มืดสนิท) — กลางเปิดลงความมืด
      for (const side of [-1, 1]) {
        g.fillStyle = col; g.beginPath();
        const x0 = side < 0 ? VX0 - 40 : VX1 + 40;
        g.moveTo(x0, c.VY0); g.lineTo(x0, bY + 2);
        for (let k = 0; k <= 8; k++) { const t = k / 8; g.lineTo(640 + side * (90 + t * 520) + (R() - 0.5) * 40, bY - (1 - t) * 30 - t * (bY - c.VY0)); }
        g.closePath(); g.fill();
      }
      for (let i = 0; i < 40; i++) { const x = VX0 + R() * (VX1 - VX0), y = c.VY0 + R() * (bY - c.VY0); if (Math.abs(x - 640) < 120) continue; softGlow(g, x, y, 3 + R() * 4, GLOW, 0.5 * R()); }
    }
  }
  const theme = {
    pal: PAL,
    back(c) {
      const { g, bY, VX0, VY0, VW } = c;
      const gr = g.createLinearGradient(0, VY0, 0, bY);
      gr.addColorStop(0, cfg.water[0]); gr.addColorStop(1, cfg.water[1]);
      g.fillStyle = gr; g.fillRect(VX0, VY0, VW, bY - VY0 + 2);
      // ลำแสงแดดจากผิวน้ำ (ชั้นตื้นเท่านั้น)
      if (cfg.shafts > 0) {
        for (let i = 0; i < 6; i++) {
          const x = VX0 + (i + 0.5) / 6 * VW + (hash(i, 3) - 0.5) * 80, w = 30 + hash(i, 4) * 60;
          const lg = g.createLinearGradient(0, VY0, 0, bY);
          lg.addColorStop(0, `rgba(190,240,255,${0.16 * cfg.shafts})`); lg.addColorStop(1, "rgba(190,240,255,0)");
          g.fillStyle = lg; g.beginPath(); g.moveTo(x - w * 0.3, VY0); g.lineTo(x + w * 0.3, VY0); g.lineTo(x + w * 1.6 + 60, bY); g.lineTo(x - w * 0.4 + 60, bY); g.closePath(); g.fill();
        }
      }
      farShapes(c);
      // หมอกน้ำทับขอบฟ้า
      const hz = g.createLinearGradient(0, bY - 60, 0, bY + 10);
      hz.addColorStop(0, "rgba(0,0,0,0)"); hz.addColorStop(1, cfg.water[1]);
      g.fillStyle = hz; g.fillRect(VX0, bY - 60, VW, 70);
      c.marks.horizon = bY;
    },
    ground(c) {
      const { g, R, VX0, VX1, bY, wx0, wx1, wy1 } = c;
      for (let i = 0; i < 260; i++) {
        const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -1 + R() * (wy1 + 1));
        if (sy < bY || sx < VX0 - 20 || sx > VX1 + 20) continue;
        g.fillStyle = C0.dots[i % C0.dots.length]; g.globalAlpha = 0.35 + R() * 0.35;
        g.beginPath(); g.ellipse(sx, sy, s * (0.08 + R() * 0.2), s * (0.03 + R() * 0.05), 0, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
    },
    side(c) {
      const { g, info, R, VX0, VX1 } = c;
      const { cols: COLS, rows: ROWS } = sceneSize(), bx0 = (COLS - info.cols) / 2, bx1 = bx0 + info.cols, by0 = (ROWS - info.rows) / 2;
      const list = [];
      for (let i = 0; i < 26; i++) {
        const left = i % 2 === 0;
        list.push([left ? bx0 - 0.8 - R() * 3.2 : bx1 + 0.8 + R() * 3.2, by0 - 1 + R() * (info.rows + 3), R()]);
      }
      list.sort((a, b) => a[1] - b[1]);
      for (const [x, y, r] of list) {
        const [sx, sy, s] = PS(x, y);
        if (sx < VX0 - 80 || sx > VX1 + 80) continue;
        sideProp(g, sx, sy, s, r, R);
      }
    },
    deco(c) {
      const { g, info } = c;
      const obs = info.terrainKind || {};
      const sp = new Set((info.special || []).map((s) => `${s.x},${s.y}`));
      for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) {
        const k = `${x},${y}`;
        if (obs[k] || sp.has(k)) continue;
        const R = rng((x * 31 + y * 17 + cfg.stage) * 7919 + 104729); R(); R(); // เมล็ดเล็ก = ค่าแรกของ rng ต่ำเสมอ → ทิ้ง 2 ค่าแรก
        floorTile(g, x, y, R);
      }
    },
    animBack(g, f, t) {
      const v = f.view, hz = f.marks && f.marks.horizon;
      if (!v || hz == null || !(t > 0)) return;
      // แสงคลื่นระยิบบนฉากหลัง (ชั้นตื้น)
      if (cfg.shafts > 0) {
        g.save(); g.globalCompositeOperation = "lighter";
        for (let i = 0; i < 5; i++) {
          const x = v.x0 + ((hash(i, 9) * (v.x1 - v.x0) + t * 0.01 * (i % 2 ? 1 : -1)) % (v.x1 - v.x0) + (v.x1 - v.x0)) % (v.x1 - v.x0);
          softGlow(g, x, v.y0 + 40 + hash(i, 8) * (hz - v.y0) * 0.4, 120, "170,235,255", cfg.shafts * (0.08 + 0.06 * Math.sin(t / 700 + i)));
        }
        g.restore();
      }
    },
    ambient(g, f, t) {
      const { info } = f;
      if (!(t > 0)) return;
      // หิมะทะเล: ตะกอนขาวลอยลงช้าๆ ทั่วกระดาน
      g.fillStyle = `rgba(${cfg.snowRGB},.55)`;
      for (let i = 0; i < 46; i++) {
        const ph = (t / (16000 + (i % 7) * 2300) + hash(i, 1)) % 1;
        const bx = hash(i, 2) * (info.cols + 4) - 2 + Math.sin(t / 2100 + i) * 0.3;
        const by = hash(i, 5) * (info.rows + 2) - 1;
        const [x, y] = P(bx, by, 3.2 - ph * 3.2);
        g.globalAlpha = Math.sin(ph * Math.PI) * 0.8;
        g.fillRect(x, y, 1.6, 1.6);
      }
      g.globalAlpha = 1;
      // ฟองอากาศลอยขึ้นจากจุดฟื้นฟู
      const heal = info.heal || [];
      g.strokeStyle = "rgba(210,250,255,.7)"; g.lineWidth = 1;
      for (let i = 0; i < heal.length * 4; i++) {
        const h = heal[i % heal.length], ph = (t / (2600 + (i % 5) * 400) + hash(i, 7)) % 1;
        const [x, y, s] = P(h.x + 0.3 + hash(i, 8) * 0.4 + Math.sin(t / 400 + i) * 0.05, h.y + 0.5, ph * 2.4);
        g.globalAlpha = 1 - ph;
        g.beginPath(); g.arc(x, y, Math.max(1, s * (0.03 + hash(i, 9) * 0.04)), 0, TAU); g.stroke();
      }
      g.globalAlpha = 1;
      // ประกายเรืองแสงลอย (ชั้นลึก)
      if (cfg.motes) {
        g.save(); g.globalCompositeOperation = "lighter";
        for (let i = 0; i < cfg.motes; i++) {
          const a = t / (5200 + i * 310) + i * 2.1;
          const [x, y, s] = P(hash(i, 11) * (info.cols + 2) - 1 + Math.cos(a) * 0.7, hash(i, 12) * info.rows + Math.sin(a * 0.8) * 0.6, 0.6 + Math.sin(a * 1.7) * 0.4);
          const k = 0.4 + 0.6 * Math.max(0, Math.sin(t / 900 + i * 1.7));
          softGlow(g, x, y, s * 0.22, GLOW, 0.5 * k);
        }
        g.restore();
      }
    },
  };

  // ---------------- ของข้างกระดาน (อบ) ----------------
  function sideProp(g, sx, sy, s, r, R) {
    const st = cfg.far;
    if (st === "mounds") {
      if (r < 0.5) { blob(g, sx, sy, s * (0.9 + r), cfg.rock, R); coralBranch(g, sx - s * 0.1, sy - s * 0.4, s * 0.7, cfg.coral[Math.floor(R() * cfg.coral.length)], R); }
      else { // สาหร่ายเคลป์สูง
        g.strokeStyle = "#173f34"; g.lineWidth = Math.max(1.5, s * 0.06);
        for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(sx + k * s * 0.1, sy); g.bezierCurveTo(sx + s * 0.3, sy - s, sx - s * 0.3, sy - s * 1.6, sx + k * s * 0.1, sy - s * (2 + r)); g.stroke(); }
      }
    } else if (st === "wreck") {
      if (r < 0.45) { // แผ่นเหล็กขึ้นสนิมปักพื้น
        g.fillStyle = "#3a2a22"; g.beginPath(); g.moveTo(sx - s * 0.5, sy); g.lineTo(sx - s * 0.35, sy - s * (0.8 + r)); g.lineTo(sx + s * 0.4, sy - s * (0.6 + r)); g.lineTo(sx + s * 0.5, sy); g.closePath(); g.fill();
        g.fillStyle = "rgba(160,70,30,.35)"; g.fillRect(sx - s * 0.2, sy - s * 0.6, s * 0.08, s * 0.5);
      } else blob(g, sx, sy, s * (0.7 + r * 0.5), cfg.rock, R);
    } else if (st === "chimneys") {
      const h = s * (1 + r * 1.6), w = s * 0.25;
      g.fillStyle = "#121012"; g.beginPath(); g.moveTo(sx - w, sy); g.lineTo(sx - w * 0.5, sy - h); g.lineTo(sx + w * 0.5, sy - h); g.lineTo(sx + w, sy); g.closePath(); g.fill();
      softGlow(g, sx, sy - h, s * 0.5, GLOW, 0.55);
      g.strokeStyle = `rgba(${GLOW},.6)`; g.lineWidth = 1; g.beginPath(); g.moveTo(sx - w * 0.6, sy - h * 0.2); g.lineTo(sx - w * 0.1, sy - h * 0.5); g.lineTo(sx - w * 0.4, sy - h * 0.8); g.stroke();
    } else if (st === "ruins") {
      const h = s * (0.6 + r * 1.8);
      g.fillStyle = "#1d2a33"; g.fillRect(sx - s * 0.18, sy - h, s * 0.36, h);
      g.fillStyle = "#26363f"; g.fillRect(sx - s * 0.18, sy - h, s * 0.12, h);
      g.fillStyle = `rgba(${GLOW},.6)`; g.fillRect(sx - s * 0.12, sy - h * 0.6, s * 0.24, Math.max(1, s * 0.03));
      if (r > 0.6) { g.fillStyle = "#1a252d"; g.fillRect(sx - s * 0.3, sy - s * 0.12, s * 0.6, s * 0.12); }
    } else {
      // ร่องลึก: แท่งหินแหลม + จุดเรืองแสงจาง
      const h = s * (0.8 + r * 2);
      g.fillStyle = "#06080e"; g.beginPath(); g.moveTo(sx - s * 0.3, sy); g.lineTo(sx - s * 0.05, sy - h); g.lineTo(sx + s * 0.3, sy); g.closePath(); g.fill();
      if (r > 0.5) softGlow(g, sx + s * 0.05, sy - h * 0.4, s * 0.15, GLOW, 0.6);
    }
  }

  // ---------------- พื้นบนกระดาน (อบ) ----------------
  function floorTile(g, x, y, R) {
    const st = cfg.deco;
    if (st === "sand") {
      g.strokeStyle = "rgba(200,240,230,.07)"; g.lineWidth = 1;
      for (let i = 0; i < 2; i++) { const yy = y + 0.25 + i * 0.4 + R() * 0.1; gPoly(g, [[x + 0.1, yy], [x + 0.5, yy - 0.06], [x + 0.9, yy]], false); g.stroke(); }
      if (R() < 0.18) { const p = P(x + 0.2 + R() * 0.6, y + 0.2 + R() * 0.6); g.fillStyle = "rgba(240,200,170,.25)"; g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.05, p[2] * 0.03, 0, 0, TAU); g.fill(); } // เปลือกหอย
    } else if (st === "wreck") {
      if (R() < 0.22) { const p = P(x + 0.2 + R() * 0.6, y + 0.3 + R() * 0.4); g.fillStyle = "rgba(90,50,30,.45)"; g.fillRect(p[0] - p[2] * 0.15, p[1] - p[2] * 0.02, p[2] * 0.3, p[2] * 0.04); }
      if (R() < 0.12) { const p = P(x + 0.5, y + 0.5); g.fillStyle = "rgba(150,70,30,.2)"; g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.3, p[2] * 0.12, 0, 0, TAU); g.fill(); } // คราบสนิม
    } else if (st === "cracks") {
      if (R() < 0.22) {
        g.lineCap = "round";
        const pts = [[x + R() * 0.3, y + R()], [x + 0.35 + R() * 0.3, y + R()], [x + 0.7 + R() * 0.3, y + R()]];
        gPoly(g, pts, false); g.strokeStyle = `rgba(${GLOW},.18)`; g.lineWidth = 4; g.stroke();
        g.strokeStyle = "rgba(255,170,90,.6)"; g.lineWidth = 1.1; g.stroke();
        g.lineCap = "butt";
      }
    } else if (st === "slabs") {
      quad(g, x, y, 0.05); g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1.2; g.stroke();
      if (R() < 0.15) { gPoly(g, [[x + 0.2, y + 0.3], [x + 0.45, y + 0.5], [x + 0.35, y + 0.8]], false); g.strokeStyle = "rgba(0,0,0,.4)"; g.lineWidth = 1; g.stroke(); }
    } else if (st === "abyss") {
      if (R() < 0.08) { const p = P(x + R(), y + R()); g.fillStyle = `rgba(${GLOW},.35)`; g.fillRect(p[0], p[1], 1.5, 1.5); }
    }
  }

  // ---------------- สิ่งกีดขวาง ----------------
  function drawObstacle(g, t, ctx, now) {
    const { x, y, kind } = t;
    const R = rng((x * 53 + y * 29 + cfg.stage * 7) * 7919 + 15485863); R(); R();
    const [cx, cy, s] = PA(x, y, 0.05);
    const pul = 0.5 + 0.5 * Math.sin(now / 800 + x * 1.3 + y);
    switch (kind) {
      case "fd_nt_reefrock": {
        blob(g, cx, cy, s * 1.05, cfg.rock, R);
        for (let k = 0; k < 3; k++) coralBranch(g, cx + (R() - 0.5) * s * 0.5, cy - s * (0.35 + R() * 0.15), s * (0.4 + R() * 0.2), cfg.coral[k % cfg.coral.length], R, Math.sin(now / 1300 + x) * 0.05);
        return;
      }
      case "fd_nt_hull": {
        const c = t.conn || {};
        const col = { front: "#3b2d27", side: "#2a201c", top: "#4a3a31", edge: "rgba(0,0,0,.35)" };
        box(g, x + (c.l ? 0 : 0.08), y + (c.u ? 0 : 0.08), x + 1 - (c.r ? 0 : 0.08), y + 1 - (c.d ? 0 : 0.08), 0, 0.9, col);
        // หมุดย้ำ + คราบสนิมไหล
        const p = P(x + 0.5, y + 1 - (c.d ? 0 : 0.08), 0.75);
        g.fillStyle = "rgba(20,12,8,.8)"; for (let k = -1; k <= 1; k++) { g.beginPath(); g.arc(p[0] + k * s * 0.22, p[1], Math.max(1, s * 0.025), 0, TAU); g.fill(); }
        g.fillStyle = "rgba(170,80,35,.4)"; g.fillRect(p[0] - s * 0.1, p[1], s * 0.05, s * 0.35);
        return;
      }
      case "fd_nt_timber": {
        g.fillStyle = "rgba(0,0,0,.45)"; g.beginPath(); g.ellipse(cx, cy, s * 0.45, s * 0.14, 0, 0, TAU); g.fill();
        const a = (R() - 0.5) * 0.8;
        g.save(); g.translate(cx, cy - s * 0.14); g.rotate(a);
        g.fillStyle = "#3d2c1e"; g.fillRect(-s * 0.45, -s * 0.1, s * 0.9, s * 0.2);
        g.fillStyle = "#2b1f15"; g.fillRect(-s * 0.45, s * 0.03, s * 0.9, s * 0.07);
        g.fillStyle = "#4e3a28"; g.beginPath(); g.moveTo(s * 0.45, -s * 0.1); g.lineTo(s * 0.55, -s * 0.02); g.lineTo(s * 0.45, s * 0.1); g.closePath(); g.fill(); // ปลายหักเป็นเสี้ยน
        g.restore();
        g.fillStyle = "rgba(60,110,80,.5)"; g.beginPath(); g.ellipse(cx - s * 0.1, cy - s * 0.24, s * 0.14, s * 0.04, a, 0, TAU); g.fill(); // ตะไคร่
        return;
      }
      case "fd_nt_cannon": {
        g.fillStyle = "rgba(0,0,0,.45)"; g.beginPath(); g.ellipse(cx, cy, s * 0.4, s * 0.14, 0, 0, TAU); g.fill();
        g.fillStyle = "#33261b"; g.fillRect(cx - s * 0.3, cy - s * 0.2, s * 0.6, s * 0.18);
        g.fillStyle = "#1d1e20"; g.save(); g.translate(cx, cy - s * 0.3); g.rotate(-0.25);
        g.fillRect(-s * 0.35, -s * 0.09, s * 0.7, s * 0.18); g.fillStyle = "#2c2e31"; g.fillRect(-s * 0.35, -s * 0.09, s * 0.7, s * 0.05);
        g.fillStyle = "#050506"; g.beginPath(); g.ellipse(s * 0.35, 0, s * 0.03, s * 0.08, 0, 0, TAU); g.fill();
        g.restore();
        return;
      }
      case "fd_nt_vent": {
        const h = s * (1.2 + R() * 0.4), w = s * 0.3;
        g.fillStyle = "rgba(0,0,0,.5)"; g.beginPath(); g.ellipse(cx, cy, s * 0.42, s * 0.15, 0, 0, TAU); g.fill();
        g.fillStyle = "#151214"; g.beginPath(); g.moveTo(cx - w, cy); g.lineTo(cx - w * 0.45, cy - h); g.lineTo(cx + w * 0.45, cy - h); g.lineTo(cx + w, cy); g.closePath(); g.fill();
        g.fillStyle = "#221c1d"; g.beginPath(); g.moveTo(cx - w, cy); g.lineTo(cx - w * 0.45, cy - h); g.lineTo(cx - w * 0.1, cy - h); g.lineTo(cx - w * 0.2, cy); g.closePath(); g.fill();
        g.strokeStyle = `rgba(255,150,60,${0.5 + 0.4 * pul})`; g.lineWidth = Math.max(1, s * 0.025);
        g.beginPath(); g.moveTo(cx + w * 0.3, cy - h * 0.15); g.lineTo(cx + w * 0.05, cy - h * 0.45); g.lineTo(cx + w * 0.25, cy - h * 0.75); g.stroke();
        g.save(); g.globalCompositeOperation = "lighter"; softGlow(g, cx, cy - h, s * (0.5 + 0.2 * pul), GLOW, 0.55 + 0.3 * pul); g.restore();
        // ควันดำพวยพุ่ง
        for (let k = 0; k < 5; k++) {
          const ph = (now / 2200 + k / 5 + hash(x, y)) % 1;
          g.fillStyle = `rgba(16,12,12,${0.45 * (1 - ph)})`;
          g.beginPath(); g.ellipse(cx + Math.sin(ph * 5 + k) * s * 0.12, cy - h - ph * s * 1.4, s * (0.12 + ph * 0.3), s * (0.1 + ph * 0.22), 0, 0, TAU); g.fill();
        }
        return;
      }
      case "fd_nt_basalt": {
        blob(g, cx, cy, s, cfg.rock, R);
        g.strokeStyle = `rgba(255,140,60,${0.35 + 0.35 * pul})`; g.lineWidth = Math.max(1, s * 0.02);
        g.beginPath(); g.moveTo(cx - s * 0.25, cy - s * 0.2); g.lineTo(cx - s * 0.05, cy - s * 0.35); g.lineTo(cx + s * 0.15, cy - s * 0.25); g.stroke();
        return;
      }
      case "fd_nt_citywall": {
        const c = t.conn || {};
        box(g, x + (c.l ? 0 : 0.06), y + (c.u ? 0 : 0.06), x + 1 - (c.r ? 0 : 0.06), y + 1 - (c.d ? 0 : 0.06), 0, 1.05, { front: "#26343d", side: "#1b262e", top: "#33444e", edge: "rgba(0,0,0,.35)" });
        const p = P(x + 0.5, y + 1 - (c.d ? 0 : 0.06), 0.6);
        g.fillStyle = `rgba(${GLOW},${0.35 + 0.35 * pul})`;
        for (let k = -1; k <= 1; k++) g.fillRect(p[0] + k * s * 0.22 - s * 0.05, p[1] - s * 0.05, s * 0.1, s * 0.1);
        return;
      }
      case "fd_nt_column": {
        g.fillStyle = "rgba(0,0,0,.45)"; g.beginPath(); g.ellipse(cx, cy, s * 0.36, s * 0.13, 0, 0, TAU); g.fill();
        box(g, x + 0.2, y + 0.2, x + 0.8, y + 0.8, 0, 0.15, { front: "#24323b", side: "#1a252c", top: "#2f3f49" });
        box(g, x + 0.3, y + 0.3, x + 0.7, y + 0.7, 0.15, 1.7, { front: "#2b3b45", side: "#1d2930", top: "#364853" });
        box(g, x + 0.22, y + 0.22, x + 0.78, y + 0.78, 1.7, 1.85, { front: "#24323b", side: "#1a252c", top: "#2f3f49" });
        const p = P(x + 0.5, y + 0.7, 1.1);
        g.fillStyle = `rgba(${GLOW},${0.3 + 0.4 * pul})`; g.fillRect(p[0] - s * 0.15, p[1] - 1, s * 0.3, 2);
        return;
      }
      case "fd_nt_statue": {
        g.fillStyle = "rgba(0,0,0,.45)"; g.beginPath(); g.ellipse(cx, cy, s * 0.4, s * 0.14, 0, 0, TAU); g.fill();
        box(g, x + 0.18, y + 0.18, x + 0.82, y + 0.82, 0, 0.35, { front: "#26343d", side: "#1b262e", top: "#33444e" });
        const [bx, by] = P(x + 0.5, y + 0.5, 0.35);
        g.fillStyle = "#2f414b"; g.beginPath(); g.moveTo(bx - s * 0.2, by); g.lineTo(bx - s * 0.16, by - s * 0.8); g.lineTo(bx + s * 0.16, by - s * 0.8); g.lineTo(bx + s * 0.2, by); g.closePath(); g.fill();
        g.beginPath(); g.arc(bx, by - s * 0.92, s * 0.14, 0, TAU); g.fill();
        // มงกุฎสามง่าม (เทพแห่งทะเล) + ตาเรือง
        g.fillRect(bx - s * 0.12, by - s * 1.16, s * 0.04, s * 0.12); g.fillRect(bx - s * 0.02, by - s * 1.2, s * 0.04, s * 0.16); g.fillRect(bx + s * 0.08, by - s * 1.16, s * 0.04, s * 0.12);
        g.save(); g.globalCompositeOperation = "lighter";
        softGlow(g, bx, by - s * 0.92, s * 0.4, GLOW, 0.35 + 0.35 * pul);
        g.fillStyle = `rgba(${GLOW},1)`; g.fillRect(bx - s * 0.07, by - s * 0.95, s * 0.04, s * 0.025); g.fillRect(bx + s * 0.03, by - s * 0.95, s * 0.04, s * 0.025);
        g.restore();
        return;
      }
      case "fd_nt_trenchrock": {
        g.fillStyle = "rgba(0,0,0,.6)"; g.beginPath(); g.ellipse(cx, cy, s * 0.46, s * 0.16, 0, 0, TAU); g.fill();
        g.fillStyle = "#0b0e16"; g.beginPath(); g.moveTo(cx - s * 0.42, cy); g.lineTo(cx - s * 0.2, cy - s * (0.7 + R() * 0.4)); g.lineTo(cx + s * 0.05, cy - s * 0.45); g.lineTo(cx + s * 0.18, cy - s * (0.9 + R() * 0.3)); g.lineTo(cx + s * 0.42, cy); g.closePath(); g.fill();
        g.fillStyle = "#121726"; g.beginPath(); g.moveTo(cx - s * 0.42, cy); g.lineTo(cx - s * 0.2, cy - s * 0.7); g.lineTo(cx - s * 0.1, cy); g.closePath(); g.fill();
        g.save(); g.globalCompositeOperation = "lighter";
        for (let k = 0; k < 3; k++) softGlow(g, cx + (hash(x + k, y) - 0.5) * s * 0.5, cy - s * (0.15 + hash(x, y + k) * 0.5), s * 0.06, GLOW, 0.5 + 0.4 * Math.sin(now / 600 + k * 2 + x));
        g.restore();
        return;
      }
      case "fd_nt_pit": {
        // หลุมดิ่ง: ช่องดำมืดลึก ขอบหินเรืองจาง
        quad(g, x, y, 0.04); g.fillStyle = "#000"; g.fill();
        quad(g, x, y, 0.04); g.strokeStyle = `rgba(${GLOW},${0.15 + 0.15 * pul})`; g.lineWidth = 1.5; g.stroke();
        quad(g, x, y, 0.16, -0.3); g.fillStyle = "rgba(10,14,30,.6)"; g.fill();
        return;
      }
      default:
    }
  }

  // ---------------- ช่องพิเศษ ----------------
  function bakeSpecial(g, sp) {
    const { x, y, kind } = sp, R = rng((x * 41 + y * 13 + cfg.stage) * 6151 + 999331); R(); R();
    if (kind === "fd_nt_coral") {
      quad(g, x, y, 0.04); g.fillStyle = "rgba(255,120,140,.06)"; g.fill();
      for (let k = 0; k < 4; k++) {
        const p = P(x + 0.18 + R() * 0.64, y + 0.2 + R() * 0.6);
        g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.12, p[2] * 0.05, 0, 0, TAU); g.fill();
        coralBranch(g, p[0], p[1], p[2] * (0.25 + R() * 0.2), cfg.coral[Math.floor(R() * cfg.coral.length)], R);
      }
    } else if (kind === "fd_nt_deck") {
      for (let k = 0; k < 4; k++) {
        gPoly(g, [[x + 0.03, y + k * 0.25 + 0.02], [x + 0.97, y + k * 0.25 + 0.02], [x + 0.97, y + k * 0.25 + 0.23], [x + 0.03, y + k * 0.25 + 0.23]]);
        g.fillStyle = k % 2 ? "#3b2c1f" : "#463525"; g.fill();
        g.strokeStyle = "rgba(0,0,0,.4)"; g.lineWidth = 1; g.stroke();
      }
      if (R() < 0.6) { quad(g, x, y, 0.3); g.fillStyle = "rgba(0,0,0,.5)"; g.fill(); } // รูผุ
    } else if (kind === "fd_nt_tubeworm") {
      quad(g, x, y, 0.06); g.fillStyle = "rgba(255,90,60,.05)"; g.fill();
      for (let k = 0; k < 9; k++) {
        const bx = x + 0.15 + R() * 0.7, by = y + 0.15 + R() * 0.7, hh = 0.25 + R() * 0.35;
        const a = P(bx, by), b = P(bx, by, hh);
        g.strokeStyle = "#d8d2c4"; g.lineWidth = Math.max(1.4, a[2] * 0.05); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        g.fillStyle = "#d0322a"; g.beginPath(); g.ellipse(b[0], b[1], a[2] * 0.045, a[2] * 0.03, 0, 0, TAU); g.fill();
      }
    } else if (kind === "fd_nt_rune") {
      const c = P(x + 0.5, y + 0.5);
      g.strokeStyle = `rgba(${GLOW},.45)`; g.lineWidth = Math.max(1, c[2] * 0.025);
      gPoly(g, Array.from({ length: 7 }, (_, i) => [x + 0.5 + Math.cos(i / 6 * TAU) * 0.36, y + 0.5 + Math.sin(i / 6 * TAU) * 0.36]), false); g.stroke();
      gPoly(g, [[x + 0.5, y + 0.22], [x + 0.5, y + 0.78]], false); g.stroke();
      gPoly(g, [[x + 0.3, y + 0.38], [x + 0.7, y + 0.62]], false); g.stroke();
    } else if (kind === "fd_nt_plankton") {
      for (let k = 0; k < 10; k++) { const p = P(x + R(), y + R()); g.fillStyle = `rgba(${GLOW},.35)`; g.fillRect(p[0], p[1], 1.6, 1.6); }
    }
  }
  function animSpecial(g, sp, ctx, t) {
    const { x, y, kind } = sp;
    if (kind !== "fd_nt_rune" && kind !== "fd_nt_plankton") return;
    const k = ctx && ctx.lowQ ? 0.5 : 0.5 + 0.5 * Math.sin(t / (kind === "fd_nt_rune" ? 900 : 500) + x * 1.7 + y);
    const [px, py, s] = P(x + 0.5, y + 0.5);
    g.save(); g.globalCompositeOperation = "lighter";
    softGlow(g, px, py, s * (kind === "fd_nt_rune" ? 0.5 : 0.35), GLOW, (kind === "fd_nt_rune" ? 0.25 : 0.35) * k + 0.05);
    g.restore();
  }

  // ---------------- ทุกเฟรม ----------------
  // ใต้ไฮไลต์: แสงเรืองรอบปล่อง/รูปปั้น (ไม่อบ — กะพริบ)
  function ground(g, fd, info, now, lowQ) {
    if (lowQ) return;
    if (!cfg.groundGlow) return;
    g.save(); g.globalCompositeOperation = "lighter";
    for (const t of info.terrain || []) {
      if (!cfg.groundGlow.includes(t.kind)) continue;
      const [px, py, s] = P(t.x + 0.5, t.y + 0.5);
      softGlow(g, px, py, s * 1.1, GLOW, 0.12 + 0.06 * Math.sin(now / 700 + t.x + t.y));
    }
    g.restore();
  }
  // ทับตัวละคร: ม่านความมืดขอบจอ (ชั้นลึก) — กระดานกลางยังอ่านได้
  function air(g, fd, info, units, now, lowQ, view) {
    if (!(cfg.vignette > 0) || !view) return;
    const w = view.x1 - view.x0, h = view.y1 - view.y0, cx = view.x0 + w / 2, cy = view.y0 + h / 2;
    const gr = g.createRadialGradient(cx, cy, Math.min(w, h) * 0.3, cx, cy, Math.max(w, h) * 0.75);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, `rgba(0,2,8,${cfg.vignette})`);
    g.fillStyle = gr; g.fillRect(view.x0, view.y0, w, h);
  }

  return { kinds: cfg.kinds, tall: cfg.tall || [], fx: {}, fogRGB: cfg.fogRGB, theme, drawObstacle, bakeSpecial, animSpecial, ground, air };
}
