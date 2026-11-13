// ============================================================
//  ฉากระเบิดธาตุ (รอบ 2 — ผู้ใช้ 2026-11-14 "ทำให้อลังการกว่านี้") · elementFx.js เรียก
//  e: { el, from, to, tiles (วง 3×3 จริงจาก server) } · p = 0..1 ของ ELEM_FX_DUR.elBomb (2 วิ)
//  โยน (BOMB_FLY): ลูกระเบิดเรืองสีธาตุลอยโค้งสูง ทิ้งหาง + เงาบนพื้น + วง 3×3 เตือนกะพริบ
//  ตก: แฟลชขาว + คลื่นกระแทกถึงขอบ 3×3 + ฉากตามธาตุเต็มทุกช่อง (อิงขนาดช่องจริง: 1 หน่วย = 1 ช่อง)
//   🔥 โดมไฟ + เปลวลุกทุกช่อง + ถ่านพุ่ง · ❄️ ผลึกพุ่งขึ้นทุกช่อง + พายุหิมะ · ⚡ สายฟ้าฟาดทีละช่อง + ไฟฟ้าวิ่งเชื่อมช่อง
//   💧 เสาน้ำพุ่ง + คลื่นซัดแผ่ทั่ววง · 🌪️ ทอร์นาโดกลางวง + ลมเกลียวทั่ววง
// ============================================================
import { P, gEllipse, glow } from "./boardGeo";

const TAU = Math.PI * 2;
const RGB = { fire: "255,122,61", ice: "143,216,255", bolt: "255,216,74", water: "74,163,255", wind: "127,224,181" };
const WHITE = "255,255,255", HOT = "255,220,120";
export const BOMB_FLY = 0.3;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const env = (p, a, b, c, d) => (p < a || p > d ? 0 : p < b ? (p - a) / (b - a || 1) : p <= c ? 1 : 1 - (p - c) / (d - c || 1));
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rgba = (c, a) => `rgba(${c},${Math.max(0, a)})`;
const okT = (t) => !!t && Number.isFinite(t.x) && Number.isFinite(t.y);
const mid = (t) => [t.x + 0.5, t.y + 0.5];
const additive = (g, fn) => { g.globalCompositeOperation = "lighter"; fn(); g.globalCompositeOperation = "source-over"; };

function quad(g, x, y, w, h, z, fill) {
  const c = [P(x, y, z), P(x + w, y, z), P(x + w, y + h, z), P(x, y + h, z)];
  g.fillStyle = fill; g.beginPath(); g.moveTo(c[0][0], c[0][1]); for (let i = 1; i < 4; i++) g.lineTo(c[i][0], c[i][1]); g.closePath(); g.fill();
}
function quadStroke(g, x, y, w, h, z, stroke, lw) {
  const c = [P(x, y, z), P(x + w, y, z), P(x + w, y + h, z), P(x, y + h, z)];
  g.strokeStyle = stroke; g.lineWidth = lw; g.beginPath(); g.moveTo(c[0][0], c[0][1]); for (let i = 1; i < 4; i++) g.lineTo(c[i][0], c[i][1]); g.closePath(); g.stroke();
}
function dot(g, x, y, r, rgb, a) { g.fillStyle = rgba(rgb, a); g.beginPath(); g.arc(x, y, Math.max(1.5, r), 0, TAU); g.fill(); }
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
function skyBolt(g, wx, wy, top, rgb, a, w, seed) {
  const [x0, y0] = P(wx, wy, top), [x1, y1] = P(wx, wy, 0.1);
  additive(g, () => {
    bolt(g, x0, y0, x1, y1, rgb, a, w * 3, seed, 12); bolt(g, x0, y0, x1, y1, WHITE, a, w, seed, 12);
    for (let i = 0; i < 3; i++) {
      const q = 0.25 + hash01(seed + i) * 0.5, mx = x0 + (x1 - x0) * q, my = y0 + (y1 - y0) * q;
      bolt(g, mx, my, mx + (hash01(seed + 9 + i) - 0.5) * w * 50, my + w * 22, rgb, a * 0.75, w * 0.9, seed + 20 + i, 5);
    }
  });
}
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
function shock(g, wx, wy, R, w, rgb, a, thick) {
  if (w <= 0 || w >= 1) return;
  gEllipse(g, wx, wy, 0.25 + w * (R - 0.25), 0.04, 60); g.strokeStyle = rgba(rgb, a * (1 - w)); g.lineWidth = thick * (1 - w) + 2; g.stroke();
}
function shards(g, wx, wy, q, cnt, spread, seed, draw) {
  for (let i = 0; i < cnt; i++) {
    const h = hash01(seed + i), an = h * TAU + i, rr = easeOut3(q) * spread * (0.4 + hash01(seed + i * 3) * 0.6);
    const z = Math.max(0.02, 0.3 + Math.sin(Math.min(1, q * 1.15) * Math.PI) * (0.8 + h * 1.8) - q * 0.4);
    const [px, py, ps] = P(wx + Math.cos(an) * rr, wy + Math.sin(an) * rr, z);
    draw(px, py, ps, an, h);
  }
}

export function elBombFx(g, e, p, lowQ) {
  if (!okT(e.from) || !okT(e.to)) return;
  const el = e.el, C = RGB[el] || WHITE, seed = (e.t0 | 0) % 991, many = lowQ ? 0.5 : 1;
  const [fx, fy] = mid(e.from), [tx, ty] = mid(e.to);
  const tiles = (e.tiles || []).filter(okT);
  const box = tiles.length ? [Math.min(...tiles.map((t) => t.x)), Math.min(...tiles.map((t) => t.y)), Math.max(...tiles.map((t) => t.x)) + 1, Math.max(...tiles.map((t) => t.y)) + 1] : [tx - 1.5, ty - 1.5, tx + 1.5, ty + 1.5];
  const frame = (a, lw) => quadStroke(g, box[0], box[1], box[2] - box[0], box[3] - box[1], 0.02, a, lw);
  g.save();
  if (p < BOMB_FLY) {
    const q = p / BOMB_FLY, arc = (u) => 0.6 + Math.sin(u * Math.PI) * 3.2;
    const at = (u) => [fx + (tx - fx) * u, fy + (ty - fy) * u];
    const [sx, sy] = at(q);
    gEllipse(g, sx, sy, 0.22 + q * 0.2, 0.01, 24); g.fillStyle = rgba("0,0,0", 0.25 + q * 0.2); g.fill();
    for (const t of tiles) quad(g, t.x, t.y, 1, 1, 0.01, rgba(C, 0.1 + 0.22 * q));
    frame(rgba(C, 0.55 + 0.4 * Math.sin(q * 30)), 3);
    for (let i = 0; i < 14 * many; i++) {
      const u = q - i * 0.025;
      if (u < 0) break;
      const [wx, wy] = at(u), [px, py, ps] = P(wx, wy, arc(u));
      dot(g, px, py, ps * (0.12 - i * 0.007), i % 2 ? C : WHITE, 0.8 * (1 - i / 14));
    }
    const [x, y, s] = P(sx, sy, arc(q));
    additive(g, () => glow(g, x, y, s * 0.7, C, 0.95));
    g.fillStyle = "rgba(28,32,44,1)"; g.beginPath(); g.arc(x, y, Math.max(5, s * 0.16), 0, TAU); g.fill();
    g.strokeStyle = rgba(C, 1); g.lineWidth = 3; g.stroke();
    dot(g, x + s * 0.08, y - s * 0.17, s * 0.05, HOT, 0.95);
    g.restore();
    return;
  }
  const q = (p - BOMB_FLY) / (1 - BOMB_FLY), k = env(q, 0, 0.03, 0.6, 1);
  const [x, y, s] = P(tx, ty, 0.5);
  for (const t of tiles) quad(g, t.x, t.y, 1, 1, 0.01, rgba(C, 0.5 * k));
  frame(rgba(WHITE, 0.9 * k), 4);
  additive(g, () => { glow(g, x, y, s * 6, WHITE, 0.95 * env(q, 0, 0.02, 0.08, 0.28)); glow(g, x, y, s * 3, C, 0.8 * k); });
  shock(g, tx, ty, 2.1, easeOut3(clamp01(q / 0.4)), C, 1, 14);
  shock(g, tx, ty, 2.1, easeOut3(clamp01((q - 0.1) / 0.4)), WHITE, 0.8, 8);
  if (el === "fire") {
    const [dx, dy, ds] = P(tx, ty, 0.4 + q * 1.4);
    additive(g, () => { glow(g, dx, dy, ds * 2.4 * easeOut3(clamp01(q / 0.3)), C, 0.9 * k); glow(g, dx, dy, ds * 1.2, HOT, 0.85 * k); });
    tiles.forEach((t, i) => {
      const up = easeOut3(clamp01((q - 0.05 - (i % 3) * 0.03) / 0.25)) * k;
      for (let j = 0; j < 3; j++) {
        const [px, py, ps] = P(t.x + 0.25 + j * 0.25, t.y + 0.5 + Math.sin(i + j) * 0.2, 0.02);
        flame(g, px, py, ps * 0.13, ps * (0.5 + hash01(seed + i * 3 + j) * 0.5) * up * (1 + 0.15 * Math.sin(q * 40 + i)), j % 2 ? C : HOT, 0.9 * k);
      }
    });
    shards(g, tx, ty, q, 34 * many, 2.4, seed, (px, py, ps, an, h) => dot(g, px, py, ps * 0.06, h > 0.5 ? C : HOT, 0.95 * (1 - q)));
  } else if (el === "ice") {
    tiles.forEach((t, i) => {
      const up = easeOut3(clamp01((q - 0.03 - i * 0.015) / 0.2)), fade = 1 - clamp01((q - 0.75) / 0.25);
      for (let j = 0; j < 2; j++) crystal(g, t.x + 0.3 + j * 0.4, t.y + 0.4 + j * 0.2, 0.14, (0.9 + hash01(seed + i * 2 + j) * 0.9) * up, C, 0.95 * fade, (hash01(seed + i * 7 + j) - 0.5) * 0.4);
    });
    for (let i = 0; i < 40 * many; i++) {
      const h = hash01(seed + 100 + i), an = h * TAU + q * 5, rr = 0.3 + h * 1.6;
      const [px, py, ps] = P(tx + Math.cos(an) * rr, ty + Math.sin(an) * rr, Math.max(0.05, 0.2 + h * 2.2 - q));
      flake(g, px, py, ps * 0.09, C, 0.95 * k, an);
    }
  } else if (el === "bolt") {
    tiles.forEach((t, i) => {
      const at = 0.02 + ((i * 5) % 9) * 0.045;
      if (q >= at && q < at + 0.14) skyBolt(g, t.x + 0.5, t.y + 0.5, 6, C, 1, 2.6, seed + i * 31 + ((q * 30) | 0));
      if (q >= at) { const [bx, by, bs] = P(t.x + 0.5, t.y + 0.5, 0.1); additive(g, () => glow(g, bx, by, bs * 0.9, C, 0.8 * (1 - clamp01((q - at) / 0.4)))); }
    });
    if (tiles.length && ((q * 50) | 0) % 2 === 0) for (let i = 0; i < 10 * many; i++) {
      const a = tiles[(seed + i) % tiles.length], b = tiles[(seed + i * 4 + 3) % tiles.length];
      const [sx, sy] = P(a.x + 0.5, a.y + 0.5, 0.03), [ex, ey] = P(b.x + 0.5, b.y + 0.5, 0.03);
      additive(g, () => bolt(g, sx, sy, ex, ey, C, 0.9 * k, 2.5, seed + i * 7 + ((q * 30) | 0), 6));
    }
  } else if (el === "water") {
    const col = Math.sin(clamp01(q / 0.6) * Math.PI);
    for (let i = 0; i < 40 * many; i++) {
      const h = hash01(seed + i), c = clamp01(q * 1.3 - h * 0.3), an = h * TAU, rr = c * (0.3 + h * 1.4);
      const [px, py, ps] = P(tx + Math.cos(an) * rr, ty + Math.sin(an) * rr, Math.max(0.02, col * (1.5 + h * 2.5) * (1 - c * 0.7)));
      drop(g, px, py, ps * 0.09, h > 0.3 ? C : WHITE, 0.95 * (1 - c * 0.6));
    }
    const w = easeOut3(clamp01((q - 0.15) / 0.5));
    if (w > 0 && w < 1) {
      gEllipse(g, tx, ty, 0.4 + w * 1.7, 0.08 * (1 - w) + 0.02, 56); g.strokeStyle = rgba(C, 0.95 * (1 - w)); g.lineWidth = 16 * (1 - w) + 2; g.stroke();
      gEllipse(g, tx, ty, 0.4 + w * 1.7, 0.2 * (1 - w) + 0.02, 56); g.strokeStyle = rgba(WHITE, 0.8 * (1 - w)); g.lineWidth = 3; g.stroke();
    }
  } else if (el === "wind") {
    const grow = easeOut3(clamp01(q / 0.25)), spin = q * TAU * 4;
    for (let j = 0; j < 12; j++) {
      const z = (j / 11) * 4 * grow, r = 0.2 + (j / 11) * 1.3, off = Math.sin(spin + j * 0.6) * 0.18;
      gEllipse(g, tx + off, ty, r, z, 40); g.strokeStyle = rgba(j % 2 ? C : WHITE, (0.85 - j * 0.04) * k); g.lineWidth = 3.5; g.stroke();
    }
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = rgba(WHITE, 0.7 * k); g.lineWidth = 2.5; g.beginPath();
      for (let j = 0; j <= 28; j++) { const u = j / 28, an = spin + i * (TAU / 4) + u * 4, r = 0.3 + u * 1.9; const [px, py] = P(tx + Math.cos(an) * r, ty + Math.sin(an) * r, 0.04); if (j) g.lineTo(px, py); else g.moveTo(px, py); }
      g.stroke();
    }
    for (let i = 0; i < 36 * many; i++) {
      const h = hash01(seed + i), z = ((q * 1.8 + h) % 1) * 3.8 * grow, an = spin * 1.6 + h * TAU, r = 0.2 + z / 4 * 1.3;
      const [px, py, ps] = P(tx + Math.cos(an) * r, ty + Math.sin(an) * r, z);
      dot(g, px, py, ps * 0.05, i % 3 ? C : WHITE, 0.9 * k);
    }
  }
  g.restore();
}
