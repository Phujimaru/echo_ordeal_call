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

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

export const EL_RGB = { fire: "255,122,61", ice: "143,216,255", bolt: "255,216,74", water: "74,163,255", wind: "127,224,181" };
const EL_ICON = { fire: "🔥", ice: "❄️", bolt: "⚡", water: "💧", wind: "🌪️" };
const WHITE = "255,255,255", STEAM = "235,240,245";

export const ELEM_FX_DUR = { elReact: 1500, elName: 1600, elBomb: 1300, elAura: 800 };
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
function bolt(g, x0, y0, x1, y1, rgb, a, w, seed, seg = 7) {
  g.strokeStyle = rgba(rgb, a); g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0);
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  for (let i = 1; i < seg; i++) { const q = i / seg, j = (hash01(seed + i) - 0.5) * len * 0.22; g.lineTo(x0 + dx * q + nx * j, y0 + dy * q + ny * j); }
  g.lineTo(x1, y1); g.stroke();
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
    elBomb(g, e, p, lowQ);
  } else if (e.kind === "elReact" && okT(e.at)) {
    elReact(g, e, p, lowQ);
  }
  g.restore();
}

function elBomb(g, e, p, lowQ) {
  const rgb = EL_RGB[e.el] || WHITE, fly = 0.42;
  const [fx, fy] = mid(e.from), [tx, ty] = mid(e.to);
  if (p < fly) { // ลูกระเบิดโค้ง
    const q = p / fly, wx = fx + (tx - fx) * q, wy = fy + (ty - fy) * q, z = 0.5 + Math.sin(q * Math.PI) * 1.8;
    const [x, y, s] = P(wx, wy, z);
    additive(g, () => glow(g, x, y, s * 0.35, rgb, 0.9));
    g.fillStyle = "rgba(30,34,44,1)"; g.beginPath(); g.arc(x, y, Math.max(3, s * 0.1), 0, TAU); g.fill();
    g.strokeStyle = rgba(rgb, 1); g.lineWidth = 2; g.stroke();
    return;
  }
  const q = (p - fly) / (1 - fly), k = env(q, 0, 0.08, 0.55, 1);
  for (const t of e.tiles || []) { // พื้นวง 3×3 เรืองสีธาตุ
    const c = [P(t.x, t.y, 0.01), P(t.x + 1, t.y, 0.01), P(t.x + 1, t.y + 1, 0.01), P(t.x, t.y + 1, 0.01)];
    g.fillStyle = rgba(rgb, 0.32 * k); g.beginPath(); g.moveTo(c[0][0], c[0][1]); for (const v of c.slice(1)) g.lineTo(v[0], v[1]); g.closePath(); g.fill();
  }
  ring(g, tx, ty, 0.3 + easeOut3(q) * 1.4, 0.03, rgb, 0.9 * (1 - q), 4);
  const [x, y, s] = P(tx, ty, 0.4);
  additive(g, () => glow(g, x, y, s * (0.6 + q * 1.2), rgb, 0.55 * (1 - q)));
  if (!lowQ) for (let i = 0; i < 16; i++) {
    const h = hash01((e.t0 | 0) + i), an = h * TAU, rr = easeOut3(q) * (0.6 + h * 0.9);
    const [px, py, ps] = P(tx + Math.cos(an) * rr, ty + Math.sin(an) * rr, 0.2 + Math.sin(q * Math.PI) * 0.8 * h);
    g.fillStyle = rgba(rgb, 0.9 * (1 - q)); g.beginPath(); g.arc(px, py, Math.max(1, ps * 0.04), 0, TAU); g.fill();
  }
}

function elReact(g, e, p, lowQ) {
  const n = Math.max(1, e.size | 0), [wx, wy] = mid(e.at, n), K = (1 + (n - 1) * 0.6) * 1.45; // ×1.45 = ใหญ่ขึ้น (ผู้ใช้: ดูไม่ออกว่ามีเอฟเฟกต์)
  const A = EL_RGB[e.a] || WHITE, B = EL_RGB[e.b] || A, seed = (e.t0 | 0) % 997;
  const [x, y, s] = P(wx, wy, 0.5);
  const others = (e.ringAt || []).filter(okT).map((t) => mid(t, t.size || 1));
  switch (e.rx) { // ชนิดปฏิกิริยา (ห้ามใช้ key — pushFx เขียนทับเป็นเลขลำดับ)
    case "burst": { // ปะทุ: วาบขาวที่เป้า → วงกระแทกครึ่งร้อนครึ่งเย็น
      const k = env(p, 0, 0.06, 0.3, 0.6);
      additive(g, () => glow(g, x, y, s * 1.3 * K, WHITE, 0.85 * k));
      const q = easeOut3(clamp01(p / 0.75));
      gEllipse(g, wx, wy, (0.4 + q * 1.3) * K, 0.03, 48); g.lineWidth = 6 * (1 - q) + 1;
      const gr = g.createLinearGradient(x - s * 2, y, x + s * 2, y); gr.addColorStop(0, rgba(A, 0.95 * (1 - q))); gr.addColorStop(1, rgba(B, 0.95 * (1 - q)));
      g.strokeStyle = gr; g.stroke();
      if (!lowQ) for (let i = 0; i < 18; i++) { // เศษน้ำแข็ง + ประกายไฟ
        const h = hash01(seed + i), an = h * TAU, rr = q * (0.6 + h) * K;
        const [px, py, ps] = P(wx + Math.cos(an) * rr, wy + Math.sin(an) * rr, 0.3 + Math.sin(q * Math.PI) * h);
        if (i % 2) flake(g, px, py, ps * 0.06, B, 0.9 * (1 - q), an); else { g.fillStyle = rgba(A, 0.9 * (1 - q)); g.beginPath(); g.arc(px, py, Math.max(1, ps * 0.04), 0, TAU); g.fill(); }
      }
      for (const [ox, oy] of others) { const [qx, qy, qs] = P(ox, oy, 0.5); additive(g, () => glow(g, qx, qy, qs * 0.6, B, 0.5 * env(p, 0.15, 0.25, 0.45, 0.8))); }
      break;
    }
    case "blast": { // ระเบิด: ลูกไฟเต็มวง 3×3 + สายฟ้าแตกออก
      const k = env(p, 0, 0.05, 0.35, 0.85), q = easeOut3(clamp01(p / 0.6));
      additive(g, () => { glow(g, x, y, s * (0.8 + q * 1.8) * K, A, 0.75 * k); glow(g, x, y, s * 0.7 * K, "255,240,200", 0.8 * env(p, 0, 0.04, 0.15, 0.35)); });
      ring(g, wx, wy, (0.5 + q * 1.6) * K, 0.02, A, 0.8 * (1 - q), 5);
      const arms = lowQ ? 4 : 8;
      for (let i = 0; i < arms; i++) {
        if (p > 0.55) break;
        const an = (i / arms) * TAU + hash01(seed + i) * 0.4, rr = 1.6 * K;
        const [ex, ey] = P(wx + Math.cos(an) * rr, wy + Math.sin(an) * rr, 0.2);
        additive(g, () => bolt(g, x, y, ex, ey, B, 0.9 * (1 - p / 0.55), 2.5, seed + i * 11 + ((p * 20) | 0)));
      }
      for (const [ox, oy] of others) { const [qx, qy, qs] = P(ox, oy, 0.5); additive(g, () => glow(g, qx, qy, qs * 0.7, A, 0.6 * env(p, 0.08, 0.18, 0.4, 0.7))); }
      break;
    }
    case "vapor": { // ระเหย: ไอน้ำร้อนพวยพุ่งเป็นกลุ่มควัน
      const cnt = lowQ ? 6 : 14;
      for (let i = 0; i < cnt; i++) {
        const h = hash01(seed + i), q = clamp01(p * 1.3 - h * 0.3), an = h * TAU, rr = 0.15 + q * 0.5;
        const [px, py, ps] = P(wx + Math.cos(an) * rr * K, wy + Math.sin(an) * rr * K, 0.2 + q * 1.8);
        g.fillStyle = rgba(STEAM, 0.45 * (1 - q) * env(p, 0, 0.1, 0.7, 1)); g.beginPath(); g.arc(px, py, ps * (0.12 + q * 0.22), 0, TAU); g.fill();
      }
      additive(g, () => glow(g, x, y, s * 0.9 * K, A, 0.4 * env(p, 0, 0.08, 0.3, 0.7)));
      break;
    }
    case "erode": { // กัดเซาะ: รอยร้าวน้ำแข็งวิ่งทั่วตัว → สายฟ้าผ่ากลาง → เศษเกราะแตก
      const crack = clamp01(p / 0.45), [cx, cy, cs] = P(wx, wy, 0.6);
      g.strokeStyle = rgba(A, 0.95 * env(p, 0, 0.05, 0.6, 0.9)); g.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const an = (i / 6) * TAU + hash01(seed + i), len = cs * 0.55 * crack * K;
        g.beginPath(); g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(an) * len * 0.5 + (hash01(seed + i * 2) - 0.5) * cs * 0.1, cy + Math.sin(an) * len * 0.5);
        g.lineTo(cx + Math.cos(an) * len, cy + Math.sin(an) * len); g.stroke();
      }
      if (p > 0.4 && p < 0.7) { const [tx, ty] = P(wx, wy, 3.5); additive(g, () => bolt(g, tx, ty, cx, cy, B, 1, 4, seed + ((p * 30) | 0), 9)); }
      if (p > 0.45 && !lowQ) for (let i = 0; i < 12; i++) {
        const h = hash01(seed + 40 + i), q = (p - 0.45) / 0.55, an = h * TAU;
        const [px, py, ps] = P(wx + Math.cos(an) * q * (0.5 + h) * K, wy + Math.sin(an) * q * (0.5 + h) * K, 0.6 + Math.sin(q * Math.PI) * 0.6 - q * 0.6);
        g.fillStyle = rgba("200,220,240", 0.9 * (1 - q)); g.fillRect(px - ps * 0.04, py - ps * 0.03, ps * 0.08, ps * 0.06);
      }
      break;
    }
    case "freeze": { // เยือกแข็ง: น้ำก่อตัวเป็นก้อนน้ำแข็งหุ้มหมาก
      const q = easeOut3(clamp01(p / 0.5)), k = env(p, 0, 0.05, 0.75, 1);
      const [bx, by, bs] = P(wx, wy, 0.55), w = bs * 0.55 * K * q, h = bs * 0.75 * K * q;
      g.fillStyle = rgba(A, 0.35 * k); g.strokeStyle = rgba(WHITE, 0.85 * k); g.lineWidth = 2;
      g.beginPath(); g.moveTo(bx, by - h); g.lineTo(bx + w, by - h * 0.35); g.lineTo(bx + w * 0.8, by + h * 0.6); g.lineTo(bx - w * 0.8, by + h * 0.6); g.lineTo(bx - w, by - h * 0.35); g.closePath(); g.fill(); g.stroke();
      if (!lowQ) for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU, [px, py, ps] = P(wx + Math.cos(an) * 0.5 * K, wy + Math.sin(an) * 0.5 * K, 0.1); flake(g, px, py, ps * 0.08 * q, A, 0.9 * k, an); }
      break;
    }
    case "conduct": { // นำไฟฟ้า: สายฟ้าวิ่งตามหยดน้ำเข้าในตัว → หมากสว่างวาบจากข้างใน
      const cnt = lowQ ? 3 : 6;
      for (let i = 0; i < cnt; i++) {
        const an = (i / cnt) * TAU + hash01(seed + i), q = clamp01(p / 0.5);
        const [sx, sy] = P(wx + Math.cos(an) * 0.9 * K, wy + Math.sin(an) * 0.9 * K, 0.05);
        const [ex, ey] = P(wx + Math.cos(an) * 0.9 * K * (1 - q), wy + Math.sin(an) * 0.9 * K * (1 - q), 0.05 + q * 0.5);
        drop(g, ex, ey, s * 0.05, B, 0.8 * (1 - p));
        if (p < 0.6) additive(g, () => bolt(g, sx, sy, ex, ey, A, 0.9, 2, seed + i * 7 + ((p * 25) | 0), 5));
      }
      additive(g, () => glow(g, x, y, s * 1.1 * K, A, 0.9 * env(p, 0.4, 0.5, 0.6, 0.9)));
      break;
    }
    case "swirl": { // พัดพา: ลมหมุนวนที่เป้า แล้วกวาดอนุภาคธาตุไปลงหมากรอบข้าง
      const W = EL_RGB.wind, spin = p * TAU * 2.2;
      for (let j = 0; j < 3; j++) {
        g.strokeStyle = rgba(W, 0.75 * (1 - p)); g.lineWidth = 2.5; g.beginPath();
        for (let i = 0; i <= 26; i++) {
          const q = i / 26, an = spin + j * (TAU / 3) + q * 4.2, rr = (0.15 + q * 0.7) * K;
          const [px, py] = P(wx + Math.cos(an) * rr, wy + Math.sin(an) * rr, 0.15 + q * 0.9);
          if (i) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.stroke();
      }
      const travel = clamp01((p - 0.25) / 0.6);
      for (const [ox, oy] of others) {
        if (travel <= 0) break;
        for (let i = 0; i < (lowQ ? 2 : 5); i++) {
          const h = hash01(seed + i + ox * 3 + oy), q = clamp01(travel - h * 0.2);
          const [px, py, ps] = P(wx + (ox - wx) * q, wy + (oy - wy) * q, 0.4 + Math.sin(q * Math.PI) * 0.7);
          g.fillStyle = rgba(B, 0.95 * (1 - q * 0.5)); g.beginPath(); g.arc(px, py, Math.max(1.5, ps * 0.05), 0, TAU); g.fill();
        }
      }
      break;
    }
    default: break;
  }
}
