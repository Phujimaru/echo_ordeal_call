// ============================================================
//  เอฟเฟกต์ระบบธาตุบนกระดาน (server/element.js · GRID_PLAN §8.7 — ผู้ใช้อนุมัติแนวเอฟเฟกต์ 2026-11-14)
//
//  ผลค้างบนตัว (u.elem จาก BoardStage = คราบธาตุ fire/ice/bolt/water):
//   back  = วงแสงสีธาตุใต้ฐาน เต้นช้าๆ + อนุภาค (สะเก็ดไฟลอยขึ้น / เกล็ดน้ำแข็ง+ไอเย็น / ประกายไฟฟ้า / หยดน้ำไหล)
//   front = ป้ายไอคอนธาตุมุมขวาบนของหมาก
//  เหตุการณ์ (socket):
//   elemReact { key, name, a, b, id, at, ring, size } → elReact (ชนิดเก็บใน rx) (ฉากปฏิกิริยา ~1 วิ ตามชนิด) + elName (ป้ายชื่อเด้ง)
//   elemBomb  { from, to, el, tiles, hits }           → elBomb (ลูกระเบิดโค้ง → วงธาตุ 3×3)
//   elemAura  { id, el }                               → elAura (ติดคราบ: วงสีวาบที่ฐาน)
//  lowQ = ตัดอนุภาค · ลดการเคลื่อนไหว = นิ่ง
// ============================================================
import { P, gEllipse, glow } from "./boardGeo";
import { elReact } from "./elementReactFx";
import { elBombFx } from "./elementBombFx"; // ระเบิดธาตุ รอบ 2 // ฉากปฏิกิริยา (รอบ 2 — อิงขนาดช่องจริง)

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

export const EL_RGB = { fire: "255,122,61", ice: "143,216,255", bolt: "255,216,74", water: "74,163,255", wind: "127,224,181" };
const EL_ICON = { fire: "🔥", ice: "❄️", bolt: "⚡", water: "💧", wind: "🌪️" };
const WHITE = "255,255,255", STEAM = "235,240,245";

export const ELEM_FX_DUR = { elReact: 1800, elName: 1800, elBomb: 2000, elAura: 800 };
export const isElemFx = (kind) => typeof kind === "string" && (kind in ELEM_FX_DUR);

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const env = (p, a, b, c, d) => (p < a || p > d ? 0 : p < b ? (p - a) / (b - a || 1) : p <= c ? 1 : 1 - (p - c) / (d - c || 1));
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rgba = (c, a) => `rgba(${c},${a})`;
const okT = (t) => !!t && Number.isFinite(t.x) && Number.isFinite(t.y);
const mid = (t, n = 1) => [t.x + Math.max(1, n | 0) / 2, t.y + Math.max(1, n | 0) / 2];
const additive = (g, fn) => { g.globalCompositeOperation = "lighter"; fn(); g.globalCompositeOperation = "source-over"; };

// ---------- ผลค้างบนตัว ----------
export function elemUnitBack(g, u, now, wx, wy) {
  const el = u.elem, rgb = EL_RGB[el];
  if (!rgb) return;
  const K = u.k || 1, t = REDUCED ? 0 : now;
  const pulse = REDUCED ? 0.8 : 0.62 + 0.38 * Math.sin(t / 420);
  g.save();
  gEllipse(g, wx, wy, 0.5 * K, 0.012, 36); g.fillStyle = rgba(rgb, 0.16 * pulse); g.fill();
  gEllipse(g, wx, wy, 0.5 * K, 0.012, 36); g.strokeStyle = rgba(rgb, 0.85 * pulse); g.lineWidth = 2; g.stroke();
  const [x, y, s] = P(wx, wy, 0.3);
  additive(g, () => glow(g, x, y, s * 0.75 * K, rgb, 0.22 * pulse));
  if (!u.lowQ && !REDUCED) {
    const seed = ((u.id && String(u.id).length) || 1) * 13;
    const n = 7;
    for (let i = 0; i < n; i++) {
      const h = hash01(seed + i), an = h * TAU + t / 1600;
      if (el === "fire") { // สะเก็ดไฟลอยขึ้น
        const q = ((t / 1300 + h) % 1), rr = 0.22 + h * 0.2;
        const [px, py, ps] = P(wx + Math.cos(an) * rr * K, wy + Math.sin(an) * rr * K, 0.15 + q * 1.1);
        g.fillStyle = rgba(i % 2 ? "255,200,90" : rgb, 0.85 * (1 - q)); g.beginPath(); g.arc(px, py, Math.max(1, ps * 0.035), 0, TAU); g.fill();
      } else if (el === "ice") { // เกล็ดน้ำแข็งเกาะขอบ + ไอเย็นลอยต่ำ
        const [px, py, ps] = P(wx + Math.cos(an) * 0.42 * K, wy + Math.sin(an) * 0.42 * K, 0.1 + 0.25 * hash01(seed + i * 3));
        flake(g, px, py, ps * 0.07, rgb, 0.8 * pulse, an);
        const q = ((t / 2400 + h) % 1), [mx, my, ms] = P(wx + Math.cos(an) * (0.3 + q * 0.3) * K, wy + Math.sin(an) * (0.3 + q * 0.3) * K, 0.05);
        additive(g, () => glow(g, mx, my, ms * 0.18, STEAM, 0.12 * (1 - q)));
      } else if (el === "bolt") { // ประกายไฟฟ้าแลบเป็นช่วงๆ
        if (((t / 140 + i * 3) | 0) % 5 !== 0) continue;
        const [ax, ay, as] = P(wx + Math.cos(an) * 0.4 * K, wy + Math.sin(an) * 0.4 * K, 0.2 + h * 0.6);
        zap(g, ax, ay, as * 0.22, rgb, 0.95, seed + i + ((t / 140) | 0));
      } else if (el === "water") { // หยดน้ำไหลลง
        const q = ((t / 1500 + h) % 1), rr = 0.3 + h * 0.15;
        const [px, py, ps] = P(wx + Math.cos(an) * rr * K, wy + Math.sin(an) * rr * K, 1.0 - q * 0.9);
        drop(g, px, py, ps * 0.05, rgb, 0.8 * (1 - q * 0.6));
      }
    }
  }
  g.restore();
}
export function elemUnitFront(g, u, bx, hy, hexR) {
  const el = u.elem;
  if (!EL_RGB[el]) return;
  const r = Math.max(8, hexR * 0.32), x = bx + hexR * 0.78, y = hy - hexR * 0.78;
  g.save();
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = "rgba(5,12,24,.86)"; g.fill();
  g.lineWidth = Math.max(1.5, r * 0.16); g.strokeStyle = rgba(EL_RGB[el], 0.95); g.stroke();
  g.font = `${Math.round(r * 1.15)}px system-ui, "Segoe UI Emoji", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(EL_ICON[el], x, y + r * 0.06);
  g.restore();
}

// ---------- รูปทรง (พิกัดจอ) ----------
function flake(g, x, y, s, rgb, a, an) {
  g.save(); g.translate(x, y); g.rotate(an); g.strokeStyle = rgba(rgb, a); g.lineWidth = Math.max(1, s * 0.25);
  for (let i = 0; i < 3; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke(); }
  g.restore();
}
function zap(g, x, y, s, rgb, a, seed) {
  g.save(); g.strokeStyle = rgba(rgb, a); g.lineWidth = Math.max(1, s * 0.12); g.beginPath(); g.moveTo(x, y - s);
  for (let i = 1; i <= 4; i++) g.lineTo(x + (hash01(seed * 7 + i) - 0.5) * s * 0.9, y - s + (i / 4) * s * 2);
  g.stroke(); g.restore();
}
function drop(g, x, y, s, rgb, a) {
  g.fillStyle = rgba(rgb, a); g.beginPath(); g.moveTo(x, y - s * 1.8);
  g.quadraticCurveTo(x + s, y, x, y + s); g.quadraticCurveTo(x - s, y, x, y - s * 1.8); g.fill();
}
function ring(g, wx, wy, r, z, rgb, a, w) { gEllipse(g, wx, wy, r, z, 44); g.strokeStyle = rgba(rgb, a); g.lineWidth = w; g.stroke(); }

// ---------- เหตุการณ์ ----------
//  e: { kind, t0, at, size, rx?, a?, b?, el?, ringAt?: [{x,y,size}], from?, to?, tiles?, name? }
export function elemFx(g, e, now, lowQ) {
  const T = ELEM_FX_DUR[e.kind] || 1000, p = (now - e.t0) / T;
  if (p < 0 || p > 1) return;
  g.save();
  if (e.kind === "elAura" && okT(e.at)) {
    const n = Math.max(1, e.size | 0), [wx, wy] = mid(e.at, n), rgb = EL_RGB[e.el] || WHITE, q = easeOut3(p);
    ring(g, wx, wy, (0.25 + q * 0.4) * (1 + (n - 1) * 0.6), 0.02, rgb, 0.9 * (1 - p), 3);
  } else if (e.kind === "elName" && okT(e.at)) {
    const n = Math.max(1, e.size | 0), [wx, wy] = mid(e.at, n), [x, y, s] = P(wx, wy, 1.35 + p * 0.25);
    const k = env(p, 0, 0.1, 0.72, 1), sc = 0.7 + 0.3 * easeOut3(clamp01(p / 0.15));
    const a = EL_RGB[e.a] || WHITE, b = EL_RGB[e.b] || a;
    const fs = Math.max(16, s * 0.42) * sc;
    g.globalAlpha = k; g.font = `700 ${fs}px "Chakra Petch", "Kanit", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    const gr = g.createLinearGradient(x - fs * 1.6, y, x + fs * 1.6, y); gr.addColorStop(0, rgba(a, 1)); gr.addColorStop(1, rgba(b, 1));
    g.lineWidth = Math.max(3, fs * 0.16); g.strokeStyle = "rgba(10,14,28,.92)"; g.strokeText(e.name || "", x, y);
    g.shadowColor = rgba(a, 0.9); g.shadowBlur = fs * 0.5; g.fillStyle = gr; g.fillText(e.name || "", x, y);
  } else if (e.kind === "elBomb" && okT(e.from) && okT(e.to)) {
    elBombFx(g, e, p, lowQ);
  } else if (e.kind === "elReact" && okT(e.at)) {
    elReact(g, e, p, lowQ);
  }
  g.restore();
}

