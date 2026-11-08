// ============================================================
//  เอฟเฟกต์บนกระดานของคุเรไน โอโตยะ (characters/kurenai_otoya.js · GRID_PLAN §7.29)
//  ธีมจากคลิปผู้ใช้ + ต้นฉบับ Kamen Rider Kiva:
//   ร่างปกติ — นักไวโอลิน: กลีบกุหลาบ/หัวใจ (ปากหวาน) · ไวโอลินลอย + สายโน้ตดนตรีไหลไปหาเป้า (ดนตรีในหัวใจ)
//   Dark Kiva — ค้างคาว Kivat ตัวที่ 2 · ตรา Kiva สีเขียวมรกตบนพื้น (หลุมพราง — คลิป: วงตราเขียวตรึงศัตรู)
//     · Wake Up 1 = ฟ้ากลายเป็นสีเลือด + จันทร์แดงดวงใหญ่ (คลิป wakeup1_fill) · Wake Up 2 = โซ่ Catena ที่ขา (Hell's Gate) เรืองแดง
//
//  เหตุการณ์ (socket "otoyaFx" { kind, id, at, size, to?, targetId?, tsize?, n? } → OTOYA_EVENT_FX):
//   sweet · heart · heartEnd · trapSet · trap · seal · wake2 · henshin · revert · bloodMoon
//  ผลค้างบนตัว (u.otoya จาก BoardStage): kiva (ออร่าแดงดำ + ค้างคาวโคจร) · trap (ตราเขียวใต้เท้า) · wake2 (โซ่แดงที่ฐาน)
//   playing (ไวโอลินลอยเหนือหัว) · heart (เป้า: โน้ตวนรอบตัว)
//  ชั้นกระดาน: otoyaNight (ฟ้าแดง + จันทร์แดงมุมจอ ตลอดกลางคืนบังคับ) · otoyaLinks (สายโน้ตจากผู้สีถึงเป้า)
//  lowQ = ตัดอนุภาคครึ่งหนึ่ง · ลดการเคลื่อนไหว = นิ่ง
// ============================================================
import { P, gEllipse, glow } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

export const OTOYA_FX_DUR = {
  otoSweet: 1500, otoHeart: 1700, otoHeartEnd: 900, otoTrapSet: 1300, otoTrap: 1200, otoSeal: 1600,
  otoWake2: 1300, otoHenshin: 1900, otoRevert: 1100, otoBloodMoon: 2200,
};
export const OTOYA_EVENT_FX = {
  sweet: "otoSweet", heart: "otoHeart", heartEnd: "otoHeartEnd", trapSet: "otoTrapSet", trap: "otoTrap", seal: "otoSeal",
  wake2: "otoWake2", henshin: "otoHenshin", revert: "otoRevert", bloodMoon: "otoBloodMoon",
};
export const isOtoyaFx = (kind) => typeof kind === "string" && (kind in OTOYA_FX_DUR);

const ROSE = "232,58,96", PINK = "255,170,196", GOLD = "255,214,140", AMBER = "176,92,40", EMERALD = "40,235,150", JADE = "150,255,205";
const BLOOD = "200,10,36", CRIMSON = "255,60,70", NIGHT = "26,0,8", INK = "10,6,10";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const env = (p, a, b, c, d) => (p < a || p > d ? 0 : p < b ? (p - a) / (b - a || 1) : p <= c ? 1 : 1 - (p - c) / (d - c || 1));
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rgba = (c, a) => `rgba(${c},${a})`;
const okT = (t) => !!t && Number.isFinite(t.x) && Number.isFinite(t.y);
// กลางตัว (โลก) ของหมากที่มุม t ขนาด n
const mid = (t, n = 1) => [t.x + Math.max(1, n | 0) / 2, t.y + Math.max(1, n | 0) / 2];

// ---------- รูปทรง (พิกัดจอ) ----------
// ค้างคาว: ลำตัว + ปีกขอบหยัก 3 แฉก · flap 0..1 = กางปีก
function bat(g, x, y, s, flap, rgb, a) {
  const w = s * (0.65 + 0.35 * flap), h = s * 0.42;
  g.fillStyle = rgba(rgb, a);
  g.beginPath();
  g.moveTo(x, y - h * 0.35);
  for (const side of [1, -1]) {
    g.lineTo(x + side * w * 0.25, y - h * 0.6);
    g.quadraticCurveTo(x + side * w * 0.7, y - h * (0.9 + 0.4 * flap), x + side * w, y - h * 0.2);
    g.quadraticCurveTo(x + side * w * 0.82, y + h * 0.05, x + side * w * 0.68, y + h * 0.3);
    g.quadraticCurveTo(x + side * w * 0.55, y + h * 0.05, x + side * w * 0.42, y + h * 0.35);
    g.quadraticCurveTo(x + side * w * 0.3, y + h * 0.1, x + side * w * 0.12, y + h * 0.45);
    g.lineTo(x, y + h * 0.25);
    g.moveTo(x, y - h * 0.35);
  }
  g.fill();
  g.beginPath(); g.ellipse(x, y, s * 0.09, s * 0.16, 0, 0, TAU); g.fill(); // ลำตัว
}
// ตรา Kiva บนพื้น: วงคู่ + ค้างคาวกางปีกกลางวง + เขี้ยว 8 แฉกรอบนอก (วาดในระนาบพื้น)
function kivaCrest(g, wx, wy, r, z, rgb, a, spin) {
  g.save();
  g.lineWidth = 2.2;
  gEllipse(g, wx, wy, r, z, 44); g.strokeStyle = rgba(rgb, a); g.stroke();
  gEllipse(g, wx, wy, r * 0.78, z, 44); g.strokeStyle = rgba(rgb, a * 0.7); g.lineWidth = 1.3; g.stroke();
  gEllipse(g, wx, wy, r * 0.98, z, 44); g.fillStyle = rgba(rgb, a * 0.12); g.fill();
  for (let i = 0; i < 8; i++) { // เขี้ยวรอบวง
    const an = spin + (i / 8) * TAU;
    const p0 = P(wx + Math.cos(an - 0.12) * r, wy + Math.sin(an - 0.12) * r, z);
    const p1 = P(wx + Math.cos(an) * r * 1.22, wy + Math.sin(an) * r * 1.22, z);
    const p2 = P(wx + Math.cos(an + 0.12) * r, wy + Math.sin(an + 0.12) * r, z);
    g.fillStyle = rgba(rgb, a * 0.85); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.fill();
  }
  // ค้างคาวกลางตรา: วาดแบนลงพื้น (ย่อแกนตั้งตามมุมกล้อง)
  const [cx, cy, s] = P(wx, wy, z), [, ey] = P(wx, wy + r, z);
  const flat = clamp01(Math.abs(ey - cy) / Math.max(1, s * r));
  g.save(); g.translate(cx, cy); g.scale(1, Math.max(0.35, flat)); bat(g, 0, 0, s * r * 1.15, 1, rgb, a * 0.9); g.restore();
  g.restore();
}
// โน้ตดนตรี (เขบ็ต 1 ชั้น) ที่จอ x,y ขนาด s
function note(g, x, y, s, rgb, a, tilt = 0) {
  g.save(); g.translate(x, y); g.rotate(tilt);
  g.fillStyle = rgba(rgb, a); g.strokeStyle = rgba(rgb, a); g.lineWidth = Math.max(1, s * 0.12);
  g.beginPath(); g.ellipse(0, 0, s * 0.34, s * 0.24, -0.45, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(s * 0.3, -s * 0.05); g.lineTo(s * 0.3, -s * 1.05); g.quadraticCurveTo(s * 0.75, -s * 0.8, s * 0.62, -s * 0.38); g.stroke();
  g.restore();
}
// หัวใจเล็ก
function heart(g, x, y, s, rgb, a) {
  g.fillStyle = rgba(rgb, a);
  g.beginPath(); g.moveTo(x, y + s * 0.35);
  g.bezierCurveTo(x - s * 0.6, y - s * 0.1, x - s * 0.3, y - s * 0.55, x, y - s * 0.2);
  g.bezierCurveTo(x + s * 0.3, y - s * 0.55, x + s * 0.6, y - s * 0.1, x, y + s * 0.35); g.fill();
}
// กลีบกุหลาบ
function petal(g, x, y, s, an, rgb, a) {
  g.save(); g.translate(x, y); g.rotate(an);
  g.fillStyle = rgba(rgb, a); g.beginPath(); g.ellipse(0, 0, s * 0.32, s * 0.18, 0, 0, TAU); g.fill();
  g.restore();
}
// ไวโอลิน + คันชัก (โบกตามเวลา)
function violin(g, x, y, s, a, t) {
  g.save(); g.translate(x, y); g.rotate(-0.5);
  g.fillStyle = rgba(AMBER, a); g.strokeStyle = rgba("60,28,12", a); g.lineWidth = Math.max(1, s * 0.04);
  for (const [oy, rx, ry] of [[s * 0.2, s * 0.24, s * 0.2], [-s * 0.12, s * 0.19, s * 0.16]]) { g.beginPath(); g.ellipse(0, oy, rx, ry, 0, 0, TAU); g.fill(); g.stroke(); }
  g.fillStyle = rgba("40,20,10", a); g.fillRect(-s * 0.03, -s * 0.7, s * 0.06, s * 0.6); // คอ
  g.beginPath(); g.arc(0, -s * 0.74, s * 0.05, 0, TAU); g.fill();
  g.restore();
  const sw = REDUCED ? 0 : Math.sin(t / 260) * s * 0.22; // คันชัก
  g.strokeStyle = rgba(GOLD, a * 0.9); g.lineWidth = Math.max(1, s * 0.035);
  g.beginPath(); g.moveTo(x - s * 0.55 + sw, y - s * 0.1 - sw * 0.4); g.lineTo(x + s * 0.5 + sw, y + s * 0.18 - sw * 0.4); g.stroke();
}

// ---------- เหตุการณ์ ----------
export function otoyaFx(g, e, now, lowQ) {
  const T = OTOYA_FX_DUR[e.kind] || 1000, p = (now - e.t0) / T;
  if (p < 0 || p > 1 || !okT(e.at)) return;
  const n = Math.max(1, e.size | 0), [wx, wy] = mid(e.at, n), K = 1 + (n - 1) * 0.6;
  const seed = (e.t0 | 0) % 997;
  g.save();
  switch (e.kind) {
    case "otoSweet": { // กลีบกุหลาบ + หัวใจลอยขึ้น · แสงชมพู
      const k = env(p, 0, 0.12, 0.65, 1), [x, y, s] = P(wx, wy, 0.5);
      g.globalCompositeOperation = "lighter"; glow(g, x, y, s * 0.9 * K, ROSE, 0.45 * k); g.globalCompositeOperation = "source-over";
      const cnt = lowQ ? 7 : 14;
      for (let i = 0; i < cnt; i++) {
        const h = hash01(seed + i), an = h * TAU, rr = 0.25 + h * 0.3, q = clamp01(p * 1.2 - h * 0.2);
        const [px, py, ps] = P(wx + Math.cos(an) * rr, wy + Math.sin(an) * rr, 0.2 + q * 1.3);
        if (i % 3 === 0) heart(g, px, py, ps * 0.16, PINK, 0.9 * k * (1 - q * 0.6));
        else petal(g, px, py, ps * 0.2, an + q * 4, ROSE, 0.85 * k * (1 - q * 0.5));
      }
      break;
    }
    case "otoHeart": case "otoHeartEnd": { // เปิด: ไวโอลินวาบ + ระลอกเสียง · ปิด: โน้ตแตกกระจาย
      const end = e.kind === "otoHeartEnd", k = env(p, 0, 0.1, 0.6, 1), [x, y, s] = P(wx, wy, 1.25);
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i++) {
        const q = clamp01(p * 1.4 - i * 0.18);
        gEllipse(g, wx, wy, (0.3 + q * 1.4) * K, 0.02, 40); g.strokeStyle = rgba(end ? PINK : GOLD, 0.6 * (1 - q) * k); g.lineWidth = 2; g.stroke();
      }
      g.globalCompositeOperation = "source-over";
      if (!end) violin(g, x, y, s * 0.55, k, now);
      const cnt = lowQ ? 5 : 10;
      for (let i = 0; i < cnt; i++) {
        const h = hash01(seed + i * 7), an = h * TAU, d = (end ? 0.2 + p * 1.3 : 0.3) * (0.6 + h);
        const [nx, ny, ns] = P(wx + Math.cos(an) * d, wy + Math.sin(an) * d, 1 + p * (end ? 0.4 : 0.9) + h * 0.3);
        note(g, nx, ny, ns * 0.2, end ? PINK : GOLD, k * 0.9, Math.sin(now / 300 + i) * 0.3);
      }
      break;
    }
    case "otoTrapSet": { // ตรา Kiva เขียวขยายใต้เท้า แล้วจางเหลือเป็นผลค้าง
      const q = easeOut3(clamp01(p / 0.45)), k = env(p, 0, 0.08, 0.7, 1);
      g.globalCompositeOperation = "lighter";
      kivaCrest(g, wx, wy, (0.25 + q * 0.4) * K, 0.02, EMERALD, 0.9 * k, REDUCED ? 0 : p * 2);
      const [x, y, s] = P(wx, wy, 0.3); glow(g, x, y, s * K, EMERALD, 0.35 * k);
      break;
    }
    case "otoTrap": { // ตราเขียววาบใหญ่ + คลื่นตราพุ่งไปหาผู้โจมตี
      const k = env(p, 0, 0.06, 0.55, 1);
      g.globalCompositeOperation = "lighter";
      kivaCrest(g, wx, wy, (0.55 + p * 0.5) * K, 0.03, JADE, k, REDUCED ? 0 : p * 3);
      if (okT(e.to)) {
        const [tx, ty] = mid(e.to, e.tsize || 1), q = easeOut3(clamp01(p / 0.5));
        const mx = wx + (tx - wx) * q, my = wy + (ty - wy) * q;
        const [x, y, s] = P(mx, my, 0.5); glow(g, x, y, s * 0.6, EMERALD, 0.7 * k);
        bat(g, x, y, s * 0.5, 0.5 + 0.5 * Math.sin(p * 30), EMERALD, 0.85 * k);
      }
      break;
    }
    case "otoSeal": { // ตราเขียวตรึงเป้า: ตราตั้งตรงด้านหน้า + โซ่วนรอบตัว
      if (!okT(e.to)) break;
      const tn = Math.max(1, e.tsize | 0), [tx, ty] = mid(e.to, tn), k = env(p, 0, 0.1, 0.7, 1), q = easeOut3(clamp01(p / 0.35));
      g.globalCompositeOperation = "lighter";
      kivaCrest(g, tx, ty, (0.4 + q * 0.15) * (1 + (tn - 1) * 0.6), 0.02, EMERALD, 0.9 * k, REDUCED ? 0 : now / 900);
      for (let i = 0; i < 3; i++) { // วงโซ่
        gEllipse(g, tx, ty, 0.42 * (1 + (tn - 1) * 0.6), 0.25 + i * 0.35, 30); g.setLineDash([5, 4]); g.lineDashOffset = REDUCED ? 0 : -now / 40;
        g.strokeStyle = rgba(JADE, 0.75 * k); g.lineWidth = 2; g.stroke();
      }
      g.setLineDash([]);
      break;
    }
    case "otoWake2": { // Hell's Gate: โซ่ Catena ที่ขาเรืองแดงแล้วแตกออก
      const k = env(p, 0, 0.1, 0.6, 1), [x, y, s] = P(wx, wy, 0.35);
      g.globalCompositeOperation = "lighter"; glow(g, x, y, s * 1.1 * K, BLOOD, 0.7 * k);
      for (let i = 0; i < (lowQ ? 6 : 12); i++) {
        const an = (i / (lowQ ? 6 : 12)) * TAU + p * 2, d = (0.25 + easeOut3(p) * 0.9) * K;
        const [cx, cy, cs] = P(wx + Math.cos(an) * d, wy + Math.sin(an) * d, 0.3 + p * 0.5);
        g.strokeStyle = rgba(CRIMSON, k); g.lineWidth = Math.max(1.5, cs * 0.04);
        g.beginPath(); g.ellipse(cx, cy, cs * 0.06, cs * 0.035, an, 0, TAU); g.stroke();
      }
      break;
    }
    case "otoHenshin": case "otoRevert": { // ฝูงค้างคาวหมุนเข้าตัว (แปลงร่าง) / แตกฝูงออก (คืนร่าง)
      const out = e.kind === "otoRevert", k = env(p, 0, 0.08, 0.7, 1);
      const [x, y, s] = P(wx, wy, 0.7);
      g.globalCompositeOperation = "lighter"; glow(g, x, y, s * 1.3 * K, out ? INK : BLOOD, (out ? 0.25 : 0.55) * k); g.globalCompositeOperation = "source-over";
      const cnt = lowQ ? 8 : 16;
      for (let i = 0; i < cnt; i++) {
        const h = hash01(seed + i * 3), an = h * TAU + (REDUCED ? 0 : p * (out ? 2 : -5));
        const d = (out ? 0.3 + p * 2.2 : 2.2 - p * 1.9) * (0.6 + h * 0.6) * K;
        const [bx, by, bs] = P(wx + Math.cos(an) * d, wy + Math.sin(an) * d, 0.5 + h * 1.4 + (out ? p : 0));
        bat(g, bx, by, bs * 0.22, 0.5 + 0.5 * Math.sin(now / 60 + i), i % 4 ? INK : BLOOD, 0.95 * k);
      }
      break;
    }
    case "otoBloodMoon": { // ฟ้าแดงไล่ลงมา (ฉากเปิด — ชั้นค้างวาดโดย otoyaNight)
      const k = env(p, 0, 0.2, 0.6, 1), [x, y, s] = P(wx, wy, 1.6);
      g.globalCompositeOperation = "lighter"; glow(g, x, y, s * 3 * k + 1, BLOOD, 0.5 * k);
      break;
    }
    default:
  }
  g.restore();
}

export function otoyaEventFx(ev) {
  const kind = ev && OTOYA_EVENT_FX[ev.kind];
  if (!kind) return null;
  return { ...ev, kind, x: ev.at ? ev.at.x : 0, y: ev.at ? ev.at.y : 0, size: ev.size || 1, dur: OTOYA_FX_DUR[kind] };
}

// ---------- ผลค้างบนตัว ----------
export function otoUnitBack(g, u, now, wx, wy) {
  const O = u.otoya;
  if (!O) return;
  const pulse = REDUCED ? 0.8 : 0.65 + 0.35 * Math.sin(now / 320), K = u.k || 1;
  g.save();
  if (O.kiva) { // ออร่าแดงดำใต้ตัว
    gEllipse(g, wx, wy, 0.55 * K, 0.01, 36); g.fillStyle = rgba(BLOOD, 0.22 * pulse); g.fill();
    const [x, y, s] = P(wx, wy, 0.5); g.globalCompositeOperation = "lighter"; glow(g, x, y, s * 0.85 * K, BLOOD, 0.28 * pulse); g.globalCompositeOperation = "source-over";
  }
  if (O.trap) { g.globalCompositeOperation = "lighter"; kivaCrest(g, wx, wy, 0.46 * K, 0.015, EMERALD, 0.55 * pulse, REDUCED ? 0 : now / 2200); g.globalCompositeOperation = "source-over"; }
  if (O.wake2) {
    gEllipse(g, wx, wy, 0.36 * K, 0.02, 30); g.setLineDash([4, 3]); g.lineDashOffset = REDUCED ? 0 : now / 60;
    g.strokeStyle = rgba(CRIMSON, 0.9 * pulse); g.lineWidth = 2.4; g.stroke(); g.setLineDash([]);
  }
  if (O.heart) { // เป้า: แสงทองอุ่นที่ฐาน
    gEllipse(g, wx, wy, 0.48 * K, 0.012, 32); g.strokeStyle = rgba(GOLD, 0.55 * pulse); g.lineWidth = 1.6; g.stroke();
  }
  g.restore();
}
export function otoUnitFront(g, u, now, wx, wy) {
  const O = u.otoya;
  if (!O) return;
  const K = u.k || 1;
  g.save();
  if (O.kiva) { // ค้างคาวโคจรรอบตัว
    const cnt = u.lowQ ? 2 : 4;
    for (let i = 0; i < cnt; i++) {
      const an = (REDUCED ? 0 : now / 900) + (i / cnt) * TAU, [x, y, s] = P(wx + Math.cos(an) * 0.5 * K, wy + Math.sin(an) * 0.5 * K, 0.95 + 0.15 * Math.sin(now / 400 + i));
      if (Math.sin(an) < -0.2) continue; // ครึ่งหลังซ่อนหลังหมาก
      bat(g, x, y, s * 0.15, 0.5 + 0.5 * Math.sin(now / 70 + i), INK, 0.9);
    }
  }
  if (O.playing) { const [x, y, s] = P(wx, wy, 1.55 * K); violin(g, x, y, s * 0.36, 0.95, now); }
  if (O.heart) { // โน้ตวนรอบเป้า
    const cnt = u.lowQ ? 2 : 3;
    for (let i = 0; i < cnt; i++) {
      const an = (REDUCED ? 0 : now / 1100) + (i / cnt) * TAU, [x, y, s] = P(wx + Math.cos(an) * 0.42 * K, wy + Math.sin(an) * 0.42 * K, 1.05 + 0.1 * Math.sin(now / 350 + i * 2));
      note(g, x, y, s * 0.13, GOLD, 0.9, Math.sin(now / 400 + i) * 0.3);
    }
  }
  g.restore();
}

// ---------- ชั้นกระดาน ----------
// กลางคืนจันทร์แดง: ย้อมแดงทั้งจอ + จันทร์แดงมุมขวาบน (พิกัดแคนวาสจริง — เรียกหลังวาดพื้น ก่อนตัวละคร)
export function otoyaNight(g, now, lowQ) {
  const c = g.canvas, W = c.width, H = c.height;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = "rgba(120,0,18,0.2)"; g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, "rgba(60,0,10,0)"); vg.addColorStop(1, `rgba(${NIGHT},0.45)`);
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  const r = Math.min(W, H) * 0.07, mx = W * 0.86, my = H * 0.15;
  const beat = REDUCED || lowQ ? 1 : 0.92 + 0.08 * Math.sin(now / 900);
  g.globalCompositeOperation = "lighter"; glow(g, mx, my, r * 3.2 * beat, BLOOD, 0.45); g.globalCompositeOperation = "source-over";
  const mg = g.createRadialGradient(mx - r * 0.3, my - r * 0.3, r * 0.1, mx, my, r);
  mg.addColorStop(0, "rgba(255,120,110,1)"); mg.addColorStop(0.7, "rgba(200,20,30,1)"); mg.addColorStop(1, "rgba(120,0,14,1)");
  g.fillStyle = mg; g.beginPath(); g.arc(mx, my, r, 0, TAU); g.fill();
  g.fillStyle = "rgba(90,0,10,0.35)"; // หลุมบนดวงจันทร์
  for (const [dx, dy, rr] of [[-0.3, -0.1, 0.18], [0.25, 0.2, 0.13], [0.05, -0.38, 0.1], [0.35, -0.25, 0.08]]) { g.beginPath(); g.arc(mx + dx * r, my + dy * r, rr * r, 0, TAU); g.fill(); }
  g.restore();
}
// สายโน้ต: links = [{ from, to }] (id) · units = รายการหมากที่วาด (rx/ry/ox/oy/size)
export function otoyaLinks(g, links, units, now, lowQ) {
  if (!links || !links.length) return;
  const byId = {};
  for (const u of units) byId[u.id] = u;
  g.save();
  for (const l of links) {
    const a = byId[l.from], b = byId[l.to];
    if (!a || !b) continue;
    const ax = a.rx + (a.size || 1) / 2 + (a.ox || 0), ay = a.ry + (a.size || 1) / 2 + (a.oy || 0);
    const bx = b.rx + (b.size || 1) / 2 + (b.ox || 0), by = b.ry + (b.size || 1) / 2 + (b.oy || 0);
    const at = (t) => P(ax + (bx - ax) * t, ay + (by - ay) * t, 1.25 + Math.sin(t * Math.PI) * 0.8);
    // บรรทัดห้าเส้นจางๆ
    g.globalCompositeOperation = "lighter";
    for (let k = -2; k <= 2; k++) {
      g.beginPath();
      for (let i = 0; i <= 24; i++) { const [x, y] = at(i / 24); if (i) g.lineTo(x, y + k * 2.2); else g.moveTo(x, y + k * 2.2); }
      g.strokeStyle = rgba(GOLD, k === 0 ? 0.55 : 0.28); g.lineWidth = k === 0 ? 1.6 : 1; g.stroke();
    }
    g.globalCompositeOperation = "source-over";
    const cnt = lowQ ? 3 : 6;
    for (let i = 0; i < cnt; i++) {
      const t = REDUCED ? (i + 0.5) / cnt : ((now / 1800 + i / cnt) % 1);
      const [x, y, s] = at(t);
      const k = Math.sin(t * Math.PI);
      g.globalCompositeOperation = "lighter"; glow(g, x, y, s * 0.18, GOLD, 0.35 * k); g.globalCompositeOperation = "source-over";
      note(g, x, y + Math.sin(now / 200 + i) * 3, s * 0.24, i % 2 ? GOLD : PINK, 0.95 * k, Math.sin(now / 300 + i) * 0.35);
    }
  }
  g.restore();
}
