// ============================================================
//  ฉากปฏิกิริยาธาตุ (elementFx.js เรียก · GRID_PLAN §8.7) — รอบ 2 (ผู้ใช้ 2026-11-14: "รุนแรงกว่านี้ อลังการกว่านี้ · อ้างอิงขนาดช่องจริง")
//  อิงขนาดช่องจริง: 1 หน่วยโลก = 1 ช่อง · ปฏิกิริยาที่โดนรอบตัว (ปะทุ/ระเบิด/พัดพา) = พื้น + กรอบ 3×3 รอบตัวเป้าพอดี (ตัว n×n = (n+2)×(n+2))
//   ปฏิกิริยาเป้าเดียว (ระเหย/กัดเซาะ/เยือกแข็ง/นำไฟฟ้า) = พื้น + กรอบเฉพาะช่องของเป้า · คลื่นกระแทกวิ่งถึงขอบกล่องพอดี
//  e: { rx, a, b, at, size, t0, ringAt: [{ x, y, size }] } · p = 0..1 ของ ELEM_FX_DUR.elReact
// ============================================================
import { P, gEllipse, glow } from "./boardGeo";

const TAU = Math.PI * 2;
const RGB = { fire: "255,122,61", ice: "143,216,255", bolt: "255,216,74", water: "74,163,255", wind: "127,224,181" };
const WHITE = "255,255,255", STEAM = "235,240,245", SMOKE = "70,55,50", HOT = "255,220,120";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const env = (p, a, b, c, d) => (p < a || p > d ? 0 : p < b ? (p - a) / (b - a || 1) : p <= c ? 1 : 1 - (p - c) / (d - c || 1));
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rgba = (c, a) => `rgba(${c},${Math.max(0, a)})`;
const okT = (t) => !!t && Number.isFinite(t.x) && Number.isFinite(t.y);
const mid = (t, n = 1) => [t.x + Math.max(1, n | 0) / 2, t.y + Math.max(1, n | 0) / 2];
const additive = (g, fn) => { g.globalCompositeOperation = "lighter"; fn(); g.globalCompositeOperation = "source-over"; };

// ---------- รูปทรง ----------
function quad(g, x, y, w, h, z, fill) {
  const c = [P(x, y, z), P(x + w, y, z), P(x + w, y + h, z), P(x, y + h, z)];
  g.fillStyle = fill; g.beginPath(); g.moveTo(c[0][0], c[0][1]); for (let i = 1; i < 4; i++) g.lineTo(c[i][0], c[i][1]); g.closePath(); g.fill();
}
function quadStroke(g, x, y, w, h, z, stroke, lw) {
  const c = [P(x, y, z), P(x + w, y, z), P(x + w, y + h, z), P(x, y + h, z)];
  g.strokeStyle = stroke; g.lineWidth = lw; g.beginPath(); g.moveTo(c[0][0], c[0][1]); for (let i = 1; i < 4; i++) g.lineTo(c[i][0], c[i][1]); g.closePath(); g.stroke();
}
// ช่องของกล่องรอบตัวเป้า: own = ช่องของเป้า · ring = 8 ทิศรอบ (ตัวใหญ่ = รอบทั้งกล่อง)
function areaTiles(at, n) {
  const own = [], ring = [];
  for (let y = at.y - 1; y < at.y + n + 1; y++) for (let x = at.x - 1; x < at.x + n + 1; x++) {
    (x >= at.x && x < at.x + n && y >= at.y && y < at.y + n ? own : ring).push({ x, y });
  }
  return { own, ring };
}
function flake(g, x, y, s, rgb, a, an) {
  g.save(); g.translate(x, y); g.rotate(an); g.strokeStyle = rgba(rgb, a); g.lineWidth = Math.max(1, s * 0.25);
  for (let i = 0; i < 3; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke(); }
  g.restore();
}
function drop(g, x, y, s, rgb, a) {
  g.fillStyle = rgba(rgb, a); g.beginPath(); g.moveTo(x, y - s * 1.8);
  g.quadraticCurveTo(x + s, y, x, y + s); g.quadraticCurveTo(x - s, y, x, y - s * 1.8); g.fill();
}
function bolt(g, x0, y0, x1, y1, rgb, a, w, seed, seg = 7) {
  g.strokeStyle = rgba(rgb, a); g.lineWidth = w; g.lineJoin = "round"; g.beginPath(); g.moveTo(x0, y0);
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  for (let i = 1; i < seg; i++) { const q = i / seg, j = (hash01(seed + i) - 0.5) * len * 0.22; g.lineTo(x0 + dx * q + nx * j, y0 + dy * q + ny * j); }
  g.lineTo(x1, y1); g.stroke();
}
function dot(g, x, y, r, rgb, a) { g.fillStyle = rgba(rgb, a); g.beginPath(); g.arc(x, y, Math.max(1.5, r), 0, TAU); g.fill(); }
// แท่งผลึกน้ำแข็งตั้งจากพื้น (สองหน้า มืด/สว่าง + ขอบขาว)
function crystal(g, wx, wy, r, h, rgb, a, tilt = 0) {
  if (h <= 0.01) return;
  const [bx, by] = P(wx, wy, 0), [tx, ty] = P(wx + tilt, wy, h), [lx, ly] = P(wx - r, wy, 0), [rx, ry] = P(wx + r, wy, 0);
  g.fillStyle = rgba(rgb, a * 0.6); g.beginPath(); g.moveTo(lx, ly); g.lineTo(tx, ty); g.lineTo(bx, by); g.closePath(); g.fill();
  g.fillStyle = rgba("232,250,255", a * 0.9); g.beginPath(); g.moveTo(rx, ry); g.lineTo(tx, ty); g.lineTo(bx, by); g.closePath(); g.fill();
  g.strokeStyle = rgba(WHITE, a); g.lineWidth = 1.3; g.beginPath(); g.moveTo(lx, ly); g.lineTo(tx, ty); g.lineTo(rx, ry); g.stroke();
}
function flame(g, x, y, w, h, rgb, a) {
  g.fillStyle = rgba(rgb, a); g.beginPath(); g.moveTo(x, y - h);
  g.bezierCurveTo(x + w, y - h * 0.45, x + w * 0.8, y, x, y);
  g.bezierCurveTo(x - w * 0.8, y, x - w, y - h * 0.45, x, y - h); g.fill();
}
// คลื่นกระแทกบนพื้นถึงรัศมี R (ช่อง) · w = 0..1
function shock(g, wx, wy, R, w, rgb, a, thick) {
  if (w <= 0 || w >= 1) return;
  gEllipse(g, wx, wy, 0.25 + w * (R - 0.25), 0.04, 60); g.strokeStyle = rgba(rgb, a * (1 - w)); g.lineWidth = thick * (1 - w) + 2; g.stroke();
  gEllipse(g, wx, wy, 0.25 + w * (R - 0.25), 0.04, 60); g.strokeStyle = rgba(WHITE, 0.7 * a * (1 - w)); g.lineWidth = 1.5; g.stroke();
}
// เศษกระเด็นออกจากกลางเป็นวิถีโค้ง · spread = ไกลสุด (ช่อง)
function shards(g, wx, wy, q, cnt, spread, seed, draw) {
  for (let i = 0; i < cnt; i++) {
    const h = hash01(seed + i), an = h * TAU + i, rr = easeOut3(q) * spread * (0.4 + hash01(seed + i * 3) * 0.6);
    const z = Math.max(0.02, 0.3 + Math.sin(Math.min(1, q * 1.15) * Math.PI) * (0.8 + h * 1.8) - q * 0.4);
    const [px, py, ps] = P(wx + Math.cos(an) * rr, wy + Math.sin(an) * rr, z);
    draw(px, py, ps, an, h);
  }
}
// สายฟ้าจากฟ้าลงพื้น: ลำหลักหนา + แกนขาว + กิ่ง
function skyBolt(g, wx, wy, top, rgb, a, w, seed) {
  const [x0, y0] = P(wx, wy, top), [x1, y1] = P(wx, wy, 0.1);
  additive(g, () => {
    bolt(g, x0, y0, x1, y1, rgb, a, w * 3, seed, 12); bolt(g, x0, y0, x1, y1, WHITE, a, w, seed, 12);
    for (let i = 0; i < 4; i++) {
      const q = 0.25 + hash01(seed + i) * 0.5, mx = x0 + (x1 - x0) * q, my = y0 + (y1 - y0) * q;
      bolt(g, mx, my, mx + (hash01(seed + 9 + i) - 0.5) * w * 50, my + w * 22, rgb, a * 0.75, w * 0.9, seed + 20 + i, 5);
    }
  });
}
// ไฮไลต์ศัตรูที่โดนผลวง (ring) — วงแสงที่ฐาน
function ringHits(g, others, rgb, k) {
  for (const [ox, oy] of others) {
    gEllipse(g, ox, oy, 0.46, 0.03, 32); g.strokeStyle = rgba(rgb, 0.95 * k); g.lineWidth = 4; g.stroke();
    const [qx, qy, qs] = P(ox, oy, 0.5); additive(g, () => glow(g, qx, qy, qs * 1.1, rgb, 0.75 * k));
  }
}

export function elReact(g, e, p, lowQ) {
  if (!okT(e.at)) return;
  const n = Math.max(1, e.size | 0), [wx, wy] = mid(e.at, n);
  const A = RGB[e.a] || WHITE, B = RGB[e.b] || A, seed = (e.t0 | 0) % 997;
  const { own, ring } = areaTiles(e.at, n);
  const R3 = (n / 2 + 1) * 1.414; // รัศมีถึงมุมกล่อง 3×3
  const others = (e.ringAt || []).filter(okT).map((t) => mid(t, t.size || 1));
  const many = lowQ ? 0.5 : 1;
  const [x, y, s] = P(wx, wy, 0.5);
  g.save();
  switch (e.rx) {
    // 🔥❄️ ปะทุ: ร้อนสุดชนเย็นสุด — ดูดเข้า (แกนขาวโต) → ระเบิดสองขั้วเต็ม 3×3 (ฝั่งไฟ/ฝั่งน้ำแข็ง) · ผลึกน้ำแข็งพุ่งขึ้นจาก 8 ช่องรอบตัว · ไอน้ำพวยพุ่ง · เศษกระจาย
    case "burst": {
      const IN = 0.16;
      if (p < IN) {
        const k = p / IN;
        for (let i = 0; i < 30 * many; i++) {
          const h = hash01(seed + i), an = h * TAU + k * 2, rr = (1 - k) * R3 * (0.6 + h * 0.5);
          const [px, py, ps] = P(wx + Math.cos(an) * rr, wy + Math.sin(an) * rr, 0.3 + h * 1.2);
          if (i % 2) flake(g, px, py, ps * 0.1, B, 0.95, an); else dot(g, px, py, ps * 0.06, A, 0.95);
        }
        additive(g, () => { glow(g, x, y, s * (0.4 + k * 0.9), WHITE, 0.6 + k * 0.4); glow(g, x, y, s * 1.4 * k, k > 0.5 ? A : B, 0.5); });
        break;
      }
      const q = (p - IN) / (1 - IN), k = env(q, 0, 0.03, 0.55, 1);
      for (const t of [...own, ...ring]) quad(g, t.x, t.y, 1, 1, 0.01, rgba((t.x - e.at.x) + (t.y - e.at.y) < n ? A : B, 0.5 * k));
      quadStroke(g, e.at.x - 1, e.at.y - 1, n + 2, n + 2, 0.02, rgba(WHITE, 0.9 * k), 4);
      additive(g, () => {
        glow(g, x, y, s * R3 * 2.8, WHITE, 0.95 * env(q, 0, 0.02, 0.08, 0.3));
        const [fx1, fy1, fs1] = P(wx - 0.6, wy - 0.6, 0.8), [fx2, fy2, fs2] = P(wx + 0.6, wy + 0.6, 0.8);
        glow(g, fx1, fy1, fs1 * (1 + q * 1.6), A, 0.85 * k); glow(g, fx2, fy2, fs2 * (1 + q * 1.6), B, 0.85 * k);
      });
      shock(g, wx, wy, R3, easeOut3(clamp01(q / 0.45)), A, 1, 14);
      shock(g, wx, wy, R3, easeOut3(clamp01((q - 0.1) / 0.45)), B, 1, 10);
      ring.forEach((t, i) => {
        const up = easeOut3(clamp01((q - 0.04 - i * 0.012) / 0.2)), fade = 1 - clamp01((q - 0.7) / 0.3);
        for (let j = 0; j < 2; j++) crystal(g, t.x + 0.3 + j * 0.4, t.y + 0.5 + (j ? 0.15 : -0.1), 0.13, 1.1 * up * (0.6 + hash01(seed + i * 3 + j) * 0.8), B, 0.95 * fade, (hash01(seed + i * 5 + j) - 0.5) * 0.4);
      });
      for (let i = 0; i < 18 * many; i++) {
        const h = hash01(seed + 50 + i), c = clamp01(q * 1.3 - h * 0.25);
        const [px, py, ps] = P(wx + (h - 0.5) * 0.9 * n, wy + (hash01(seed + 70 + i) - 0.5) * 0.9 * n, 0.4 + c * 3.2);
        dot(g, px, py, ps * (0.18 + c * 0.4), STEAM, 0.5 * (1 - c));
      }
      shards(g, wx, wy, q, 46 * many, R3 * 1.1, seed, (px, py, ps, an, h) => {
        if (h > 0.5) flake(g, px, py, ps * 0.12, B, 0.95 * (1 - q), an); else dot(g, px, py, ps * 0.06, h > 0.25 ? A : HOT, 0.95 * (1 - q));
      });
      ringHits(g, others, B, env(q, 0.05, 0.15, 0.45, 0.8));
      break;
    }
    // 🔥⚡ ระเบิด: แฟลช → ลูกไฟยักษ์คลุม 3×3 ลอยขึ้นเป็นเห็ด · สายฟ้าแตกไปทุกช่องรอบตัว · คลื่นกระแทก · พื้นไหม้ดำ · เปลวกระเด็น
    case "blast": {
      const q = p, k = env(q, 0, 0.03, 0.5, 1), ball = easeOut3(clamp01(q / 0.25)), rise = clamp01((q - 0.15) / 0.85);
      for (const t of [...own, ...ring]) {
        quad(g, t.x, t.y, 1, 1, 0.01, rgba(A, 0.55 * env(q, 0, 0.03, 0.25, 0.45)));
        quad(g, t.x, t.y, 1, 1, 0.012, rgba("35,25,20", 0.5 * clamp01((q - 0.2) / 0.2) * k));
      }
      quadStroke(g, e.at.x - 1, e.at.y - 1, n + 2, n + 2, 0.02, rgba(A, 0.95 * k), 4);
      additive(g, () => {
        glow(g, x, y, s * R3 * 3.2, "255,245,215", 0.95 * env(q, 0, 0.015, 0.07, 0.22));
        const [bx, by, bs] = P(wx, wy, 0.6 + rise * 2.2);
        glow(g, bx, by, bs * (n / 2 + 1) * (0.9 + ball * 1.3), A, 0.95 * k);
        glow(g, bx, by, bs * (n / 2 + 1) * 0.8 * ball, HOT, 0.9 * k);
      });
      for (let i = 0; i < 22 * many; i++) { // เห็ดควัน
        const h = hash01(seed + i), c = clamp01(q * 1.35 - 0.12 - h * 0.2), an = h * TAU;
        const [px, py, ps] = P(wx + Math.cos(an) * (0.3 + c * 1.1), wy + Math.sin(an) * (0.3 + c * 1.1), 0.5 + c * 2.8);
        dot(g, px, py, ps * (0.2 + c * 0.35), SMOKE, 0.5 * (1 - c) * k);
      }
      shock(g, wx, wy, R3, easeOut3(clamp01(q / 0.35)), WHITE, 1, 16);
      if (q < 0.6 && ((q * 40) | 0) % 3 !== 2) for (const [i, t] of ring.entries()) {
        const [sx, sy] = P(wx, wy, 1.0), [ex, ey] = P(t.x + 0.5, t.y + 0.5, 0.05), sd = seed + i * 13 + ((q * 30) | 0);
        additive(g, () => { bolt(g, sx, sy, ex, ey, B, 0.95, 5, sd, 7); bolt(g, sx, sy, ex, ey, WHITE, 0.95, 1.8, sd, 7); });
      }
      shards(g, wx, wy, q, 36 * many, R3 * 1.2, seed + 3, (px, py, ps, an, h) => flame(g, px, py, ps * 0.06, ps * 0.17, h > 0.5 ? A : HOT, 0.95 * (1 - q)));
      ringHits(g, others, A, env(q, 0.04, 0.1, 0.35, 0.7));
      break;
    }
    // 🔥💧 ระเหย: น้ำบนช่องเดือดพล่าน (ฟองแตก) → เสาไอน้ำร้อนพุ่งสูงจากช่อง ร้อนแดงที่โคน · ไอแผ่ทั่วช่อง
    case "vapor": {
      const q = p, k = env(q, 0, 0.04, 0.7, 1);
      for (const t of own) { quad(g, t.x, t.y, 1, 1, 0.01, rgba(B, 0.5 * k)); quad(g, t.x, t.y, 1, 1, 0.012, rgba(A, 0.35 * clamp01(q / 0.3) * k)); quadStroke(g, t.x, t.y, 1, 1, 0.02, rgba(A, 0.95 * k), 4); }
      for (let i = 0; i < 26 * many; i++) {
        const h = hash01(seed + i), c = (q * 3.5 + h) % 1;
        const [px, py, ps] = P(e.at.x + 0.08 + hash01(seed + i * 3) * (n - 0.16), e.at.y + 0.08 + hash01(seed + i * 7) * (n - 0.16), 0.02 + c * 0.2);
        g.strokeStyle = rgba(WHITE, 0.9 * (1 - c) * k); g.lineWidth = 2; g.beginPath(); g.arc(px, py, ps * (0.03 + c * 0.06), 0, TAU); g.stroke();
      }
      additive(g, () => { const [cx, cy, cs] = P(wx, wy, 0.3); glow(g, cx, cy, cs * 1.8 * n, A, 0.85 * k); });
      for (let i = 0; i < 48 * many; i++) {
        const h = hash01(seed + 100 + i), c = clamp01(q * 1.2 - h * 0.25), sway = Math.sin(c * 5 + h * 9) * 0.2;
        const [px, py, ps] = P(wx + (h - 0.5) * 0.8 * n + sway, wy + (hash01(seed + 200 + i) - 0.5) * 0.8 * n, 0.2 + c * 4.2);
        dot(g, px, py, ps * (0.14 + c * 0.45), c < 0.18 ? "255,190,160" : STEAM, 0.6 * (1 - c) * k);
      }
      break;
    }
    // ❄️⚡ กัดเซาะ: ผลึกน้ำแข็งหุ้มตัวเป้า + รอยร้าว → สายฟ้าฟาดจากฟ้าลงกลางช่อง → ผลึกแตก + แผ่นเกราะกระจาย
    case "erode": {
      const STRIKE = 0.36, k = env(p, 0, 0.04, 0.82, 1);
      for (const t of own) { quad(g, t.x, t.y, 1, 1, 0.01, rgba(A, 0.45 * k)); quadStroke(g, t.x, t.y, 1, 1, 0.02, rgba(B, 0.95 * k), 4); }
      if (p < STRIKE + 0.03) {
        const g1 = easeOut3(clamp01(p / 0.24));
        for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU; crystal(g, wx + Math.cos(an) * 0.34 * n, wy + Math.sin(an) * 0.34 * n, 0.15, (1.2 + hash01(seed + i) * 0.5) * g1, A, 0.92, -Math.cos(an) * 0.2); }
        const [cx, cy, cs] = P(wx, wy, 0.7), cr = clamp01((p - 0.18) / 0.15);
        g.strokeStyle = rgba(WHITE, 0.95 * cr); g.lineWidth = 2;
        for (let i = 0; i < 9; i++) { const an = (i / 9) * TAU + hash01(seed + i); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(an) * cs * 0.3, cy + Math.sin(an) * cs * 0.35); g.lineTo(cx + Math.cos(an + 0.2) * cs * 0.6 * cr, cy + Math.sin(an + 0.2) * cs * 0.7 * cr); g.stroke(); }
        if (p > STRIKE - 0.1) { const [tx, ty] = P(wx, wy, 7); additive(g, () => glow(g, tx, ty, s * 1.2, B, 0.8 * clamp01((p - STRIKE + 0.1) / 0.1))); }
      }
      if (p >= STRIKE - 0.02 && p < STRIKE + 0.22) skyBolt(g, wx, wy, 7, B, 1, 3.5, seed + ((p * 25) | 0));
      if (p >= STRIKE) {
        const q = (p - STRIKE) / (1 - STRIKE);
        additive(g, () => { glow(g, x, y, s * 3 * n, WHITE, 0.95 * env(q, 0, 0.02, 0.08, 0.3)); glow(g, x, y, s * 1.8 * n, B, 0.8 * (1 - q)); });
        shock(g, wx, wy, 0.75 * n, easeOut3(clamp01(q / 0.4)), B, 1, 10);
        shards(g, wx, wy, q, 38 * many, 1.8 * n, seed + 7, (px, py, ps, an, h) => {
          if (h > 0.45) flake(g, px, py, ps * 0.13, A, 0.95 * (1 - q), an);
          else { g.save(); g.translate(px, py); g.rotate(an + q * 9); g.fillStyle = rgba("175,190,210", 0.95 * (1 - q)); g.fillRect(-ps * 0.08, -ps * 0.05, ps * 0.16, ps * 0.1); g.strokeStyle = rgba(WHITE, 0.7 * (1 - q)); g.lineWidth = 1; g.strokeRect(-ps * 0.08, -ps * 0.05, ps * 0.16, ps * 0.1); g.restore(); }
        });
      }
      break;
    }
    // ❄️💧 เยือกแข็ง: คลื่นน้ำซัดม้วนขึ้นรอบตัว → แข็งตัวกลางอากาศเป็นหนามน้ำแข็งรอบขอบช่อง · ก้อนน้ำแข็งหุ้มตัว · ลายน้ำแข็งเกาะพื้น · เกล็ดหิมะวน
    case "freeze": {
      const k = env(p, 0, 0.04, 0.82, 1), wave = clamp01(p / 0.32), fz = easeOut3(clamp01((p - 0.22) / 0.28));
      for (const t of own) { quad(g, t.x, t.y, 1, 1, 0.01, rgba(B, 0.4 * (1 - fz) * k)); quad(g, t.x, t.y, 1, 1, 0.012, rgba(A, 0.6 * fz * k)); quadStroke(g, t.x, t.y, 1, 1, 0.02, rgba(WHITE, 0.95 * k), 4); }
      g.strokeStyle = rgba(WHITE, 0.85 * fz * k); g.lineWidth = 1.6;
      for (let i = 0; i < 12; i++) {
        const an = (i / 12) * TAU, L = 0.5 * n * fz, [ax, ay] = P(wx, wy, 0.02), [bx, by] = P(wx + Math.cos(an) * L, wy + Math.sin(an) * L, 0.02), [cx, cy] = P(wx + Math.cos(an + 0.25) * L * 0.6, wy + Math.sin(an + 0.25) * L * 0.6, 0.02);
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.moveTo((ax + bx) / 2, (ay + by) / 2); g.lineTo(cx, cy); g.stroke();
      }
      if (p < 0.45) for (let i = 0; i < 26 * many; i++) {
        const an = (i / 26) * TAU, up = Math.sin(wave * Math.PI) * 1.8 * (0.6 + hash01(seed + i) * 0.6);
        const [px, py, ps] = P(wx + Math.cos(an) * 0.5 * n, wy + Math.sin(an) * 0.5 * n, up);
        drop(g, px, py, ps * 0.08, B, 0.95 * (1 - fz));
      }
      for (let i = 0; i < 12; i++) {
        const an = (i / 12) * TAU + 0.3, up = easeOut3(clamp01((p - 0.24 - i * 0.01) / 0.18));
        crystal(g, wx + Math.cos(an) * 0.5 * n, wy + Math.sin(an) * 0.5 * n, 0.12, (0.9 + hash01(seed + i) * 0.9) * up, A, 0.95 * k, Math.cos(an) * 0.3);
      }
      if (fz > 0) {
        const [bx, by, bs] = P(wx, wy, 0.6), w = bs * 0.55 * n * fz, h = bs * 0.9 * n * fz;
        g.fillStyle = rgba(A, 0.42 * k); g.strokeStyle = rgba(WHITE, 0.95 * k); g.lineWidth = 3;
        g.beginPath(); g.moveTo(bx, by - h); g.lineTo(bx + w, by - h * 0.35); g.lineTo(bx + w * 0.85, by + h * 0.6); g.lineTo(bx - w * 0.85, by + h * 0.6); g.lineTo(bx - w, by - h * 0.35); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = rgba(WHITE, 0.65 * k); g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx - w * 0.55, by - h * 0.6); g.lineTo(bx - w * 0.2, by + h * 0.4); g.moveTo(bx + w * 0.3, by - h * 0.5); g.lineTo(bx + w * 0.5, by); g.stroke();
        additive(g, () => glow(g, bx, by, bs * 1.2 * n, A, 0.5 * env(p, 0.22, 0.3, 0.5, 0.9)));
      }
      for (let i = 0; i < 24 * many; i++) {
        const h = hash01(seed + 300 + i), an = h * TAU + p * 7, rr = 0.55 + h * 0.6;
        const [px, py, ps] = P(wx + Math.cos(an) * rr * n, wy + Math.sin(an) * rr * n, 0.3 + h * 1.8 - p * 0.6);
        flake(g, px, py, ps * 0.08, A, 0.95 * k, an);
      }
      break;
    }
    // ⚡💧 นำไฟฟ้า: แอ่งน้ำแผ่ทั้งช่อง → ไฟฟ้าวิ่งบนผิวน้ำ → สายฟ้าหลายเส้นแทงทะลุตัวขึ้นฟ้า · หมากสว่างวาบจากข้างใน · ประกายกระเด็น
    case "conduct": {
      const k = env(p, 0, 0.04, 0.82, 1), pool = easeOut3(clamp01(p / 0.2));
      for (const t of own) { quad(g, t.x, t.y, 1, 1, 0.01, rgba(B, 0.55 * pool * k)); quadStroke(g, t.x, t.y, 1, 1, 0.02, rgba(A, 0.95 * k), 4); }
      if (((p * 50) | 0) % 2 === 0) for (let i = 0; i < 12 * many; i++) {
        const a0 = hash01(seed + i + ((p * 12) | 0)) * TAU, a1 = a0 + 1 + hash01(seed + i * 3) * 2;
        const [sx, sy] = P(wx + Math.cos(a0) * 0.48 * n, wy + Math.sin(a0) * 0.48 * n, 0.03), [ex, ey] = P(wx + Math.cos(a1) * 0.2 * n, wy + Math.sin(a1) * 0.2 * n, 0.03);
        additive(g, () => bolt(g, sx, sy, ex, ey, A, 0.95, 3, seed + i * 5 + ((p * 40) | 0), 5));
      }
      if (p > 0.3 && p < 0.72) for (let i = 0; i < 4; i++) {
        const [bx, by] = P(wx + (hash01(seed + i) - 0.5) * 0.6 * n, wy + (hash01(seed + i * 2) - 0.5) * 0.6 * n, 0.05), [tx, ty] = P(wx + (hash01(seed + i * 4) - 0.5) * 0.6, wy, 5);
        const sd = seed + i * 17 + ((p * 30) | 0);
        additive(g, () => { bolt(g, bx, by, tx, ty, A, 0.95, 7, sd, 10); bolt(g, bx, by, tx, ty, WHITE, 0.95, 2.4, sd, 10); });
      }
      additive(g, () => { glow(g, x, y, s * 2.4 * n, A, 0.95 * env(p, 0.28, 0.36, 0.55, 0.85)); glow(g, x, y, s * 1.2 * n, WHITE, 0.95 * env(p, 0.3, 0.36, 0.45, 0.62)); });
      shock(g, wx, wy, 0.75 * n, easeOut3(clamp01((p - 0.32) / 0.35)), A, 1, 10);
      shards(g, wx, wy, clamp01((p - 0.33) / 0.67), 30 * many, 1.6 * n, seed + 11, (px, py, ps, an, h) => dot(g, px, py, ps * 0.05, h > 0.5 ? A : WHITE, 0.95 * (1 - p)));
      break;
    }
    // 🌪️ พัดพา: ทอร์นาโดสูงหมุนที่เป้า ดูดอนุภาคธาตุขึ้นไป แล้วเหวี่ยงไปลงตัว/ช่องรอบข้าง · พื้น 3×3 เป็นลม
    case "swirl": {
      const W = RGB.wind, k = env(p, 0, 0.05, 0.78, 1), grow = easeOut3(clamp01(p / 0.28)), spin = p * TAU * 3.2;
      for (const t of [...own, ...ring]) quad(g, t.x, t.y, 1, 1, 0.01, rgba(W, 0.25 * k));
      quadStroke(g, e.at.x - 1, e.at.y - 1, n + 2, n + 2, 0.02, rgba(W, 0.9 * k), 4);
      for (let i = 0; i < 3; i++) { // เส้นลมกวาดบนพื้น 3×3
        g.strokeStyle = rgba(WHITE, 0.6 * k); g.lineWidth = 2; g.beginPath();
        for (let j = 0; j <= 24; j++) {
          const q = j / 24, an = spin + i * (TAU / 3) + q * 3.5, r = (0.3 + q * (n / 2 + 0.9));
          const [px, py] = P(wx + Math.cos(an) * r, wy + Math.sin(an) * r, 0.03);
          if (j) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.stroke();
      }
      for (let j = 0; j < 11; j++) {
        const z = (j / 10) * 3.8 * grow, r = (0.16 + (j / 10) * 1.0) * n, off = Math.sin(spin + j * 0.7) * 0.15;
        gEllipse(g, wx + off, wy, r, z, 40); g.strokeStyle = rgba(j % 2 ? W : WHITE, (0.85 - j * 0.04) * k); g.lineWidth = 3.5; g.stroke();
      }
      for (let i = 0; i < 34 * many; i++) {
        const h = hash01(seed + i), z = ((p * 1.6 + h) % 1) * 3.6 * grow, an = spin * 1.5 + h * TAU, r = (0.16 + z / 3.8) * n;
        const [px, py, ps] = P(wx + Math.cos(an) * r, wy + Math.sin(an) * r, z);
        dot(g, px, py, ps * 0.06, i % 3 ? B : W, 0.95 * k);
      }
      const travel = clamp01((p - 0.35) / 0.48);
      const dests = others.length ? others : ring.filter((_, i) => i % 2 === 1).map((t) => [t.x + 0.5, t.y + 0.5]);
      for (const [ox, oy] of dests) {
        if (travel <= 0) break;
        for (let i = 0; i < 8 * many; i++) {
          const h = hash01(seed + i + ox * 3 + oy), c = clamp01(travel - h * 0.2);
          const [px, py, ps] = P(wx + (ox - wx) * c, wy + (oy - wy) * c, 2.6 * (1 - c) + Math.sin(c * Math.PI) * 0.9);
          dot(g, px, py, ps * 0.08, B, 0.95);
        }
        if (travel > 0.85) { const [qx, qy, qs] = P(ox, oy, 0.4); additive(g, () => glow(g, qx, qy, qs * 1.2, B, 0.9 * (1 - p))); gEllipse(g, ox, oy, 0.46, 0.03, 32); g.strokeStyle = rgba(B, 0.9 * (1 - p)); g.lineWidth = 4; g.stroke(); }
      }
      break;
    }
    default: break;
  }
  g.restore();
}
