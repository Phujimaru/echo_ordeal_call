// เอฟเฟกต์บนกระดานของนารุโฮโดะ ริวอิจิ (characters/naruhodo_ryuichi.js · GRID_PLAN §7.38 · สัญญา .claude/plans/naruhodo-contract.md)
//  แนวภาพ: Ace Attorney — นิ้วชี้ยักษ์ เส้นความเร็วแบบมังงะ ป้ายตะโกน (court/shout_*.webp) ค้อนผู้พิพากษา (court/gavel_*.webp)
//  เหตุการณ์จาก server (engine.boardFx → socket ชื่อเดียวกัน → useCharSocketFx → fx ด้านล่าง):
//   naruPoint   เอานี่ไปดู!     ป้าย Take that! เหนือหัว · นิ้วชี้พุ่งตามแนว 3 ช่อง + เส้นความเร็ว · ไอคอนหลักฐานบินโค้งเข้าเป้า (ใช้หลักฐาน) · ระเบิดดาวที่เป้า
//   naruScout   สืบสวน          เส้นประทองเชื่อมตัว → เป้า · แว่นขยายกวาดวนรอบเป้าแล้วจับ · หลักฐานที่ได้ลอยจากเป้ากลับมาเข้าแฟ้ม
//   naruTrial   เริ่มการไต่สวน   ลำแสงศาลส่องเป้า + ขอบจอมืด · ค้อน (มือ+ค้อน) ฟาดแท่น → ภาพตัดค้อนกระแทก (gavel_4) + คลื่นกระแทก
//   naruHoldIt  รอเดี๋ยว!!!     ป้าย 待った! เด้งเหนือนารุโฮโดะ · ผู้กระทำถูกหยุดเวลา (ฟ้าเทา + หน้าปัดนาฬิกา)
//  ค้างบนตัว (boardUnits — u.naru): scout = แว่นขยายเล็กมุมซ้ายบนของหมาก (เห็นเฉพาะคนที่สืบสวน) · objected = ป้ายมือชี้แดง (ห้ามสกิล/ตี)
//  ภาพ: ไม่มีข้อความอธิบาย — ป้ายตะโกน/ไอคอนเท่านั้น
import { P } from "./boardGeo";
import { EVIDENCE_ATLAS } from "../court/evidenceData";

const TAU = Math.PI * 2;
const REDUCED = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeIn = (t) => Math.pow(clamp01(t), 3);
const seg = (p, a, b) => clamp01((p - a) / (b - a));
// เด้งแบบยางยืด (ป้ายตะโกน)
const elastic = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1);
const hash = (a) => { const v = Math.sin(a * 127.1) * 43758.5453; return v - Math.floor(v); };
// สี: น้ำเงินสูท · ฟ้าเส้นความเร็ว · ทองแว่นขยาย/ศาล · แดงคัดค้าน
const BLUE = "48,92,190", SKY = "150,205,255", WHITE = "255,255,255", GOLD = "255,206,90", RED = "226,30,40", FROST = "160,190,225";

const DIR = "/characters/naruhodo_ryuichi";
const SRC = {
  takethat: `${DIR}/court/shout_takethat.webp`, holdit: `${DIR}/court/shout_holdit_jp.webp`, objection: `${DIR}/court/shout_objection.webp`,
  block: `${DIR}/court/gavel_1.webp`, gavel: `${DIR}/court/gavel_3.webp`, slam: `${DIR}/court/gavel_4.webp`, evidence: EVIDENCE_ATLAS.src,
};
const IMG = {};
function img(k) {
  if (typeof Image === "undefined") return null;
  let i = IMG[k];
  if (!i) { i = new Image(); i.decoding = "async"; i.src = SRC[k]; IMG[k] = i; }
  return i.complete && i.naturalWidth ? i : null;
}
export function preloadNaruhodoArt() { for (const k of Object.keys(SRC)) img(k); }

// จังหวะ (ms) — ตัวรับ socket ใช้ตั้งเสียง/จอสั่นให้ตรงภาพ
export const NARU_T = { point: 1500, pointHit: 560, scout: 1700, scoutGot: 1150, trial: 2500, trialSlam: 1050, holdIt: 2100 };
export const NARU_FX_DUR = { naruPoint: NARU_T.point, naruScout: NARU_T.scout, naruTrial: NARU_T.trial, naruHoldIt: NARU_T.holdIt };
export const isNaruFx = (kind) => typeof kind === "string" && kind in NARU_FX_DUR;

function bodyAt(x, y, n = 1) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6, cx = x + n / 2, cy = y + n / 2;
  const [bx, by, s] = P(cx, cy);
  return { bx, by, s, hy: by - s * 0.86 * K, K };
}
function glow(g, x, y, r, rgb, a, core = WHITE) {
  if (a <= 0 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(core, a));
  gr.addColorStop(0.4, rgba(rgb, a * 0.7));
  gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
function ring(g, x, y, r, w, a, rgb) {
  if (a <= 0 || r <= 0) return;
  g.strokeStyle = rgba(rgb, a); g.lineWidth = Math.max(1, w);
  g.beginPath(); g.ellipse(x, y, r, r * 0.5, 0, 0, TAU); g.stroke();
}
// ภาพจากไฟล์ วาดกึ่งกลางที่ (x, y) กว้าง w (สัดส่วนตามรูป)
function sprite(g, k, x, y, w, a, rot = 0) {
  const im = img(k);
  if (!im || a <= 0 || w <= 0) return;
  const h = w * (im.naturalHeight / im.naturalWidth);
  g.save(); g.globalAlpha *= clamp01(a); g.translate(x, y); if (rot) g.rotate(rot);
  g.drawImage(im, -w / 2, -h / 2, w, h);
  g.restore();
}

// ---------- ไอคอนหลักฐาน: กรอบขาวขอบทอง (แบบกล่องยื่นหลักฐาน) + ไอคอนจาก atlas ----------
function evidenceCard(g, idx, x, y, w, a, rot = 0) {
  if (a <= 0 || w <= 0) return;
  g.save(); g.globalAlpha *= clamp01(a); g.translate(x, y); if (rot) g.rotate(rot);
  const r = w * 0.12, h = w;
  g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = w * 0.18; g.shadowOffsetY = w * 0.06;
  g.fillStyle = "#fbf6e8"; roundRect(g, -w / 2, -h / 2, w, h, r); g.fill();
  g.shadowColor = "transparent";
  g.lineWidth = Math.max(1.5, w * 0.06); g.strokeStyle = "#c08a22"; roundRect(g, -w / 2, -h / 2, w, h, r); g.stroke();
  g.lineWidth = Math.max(1, w * 0.02); g.strokeStyle = "#fff3c4"; roundRect(g, -w / 2 + w * 0.07, -h / 2 + w * 0.07, w * 0.86, h * 0.86, r * 0.6); g.stroke();
  const im = img("evidence");
  if (im && Number.isFinite(idx)) {
    const { cols, cell } = EVIDENCE_ATLAS, i = Math.max(0, idx | 0), iw = w * 0.78;
    const smooth = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
    g.drawImage(im, (i % cols) * cell, Math.floor(i / cols) * cell, cell, cell, -iw / 2, -iw / 2, iw, iw);
    g.imageSmoothingEnabled = smooth;
  }
  g.restore();
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}

// ---------- นิ้วชี้ (ชี้ไปทาง +x · หน่วย sc ≈ ความยาวทั้งมือ) — แขนเสื้อสูทน้ำเงิน · ปลอกแขนขาว · หมัด + นิ้วชี้ ----------
function hand(g, x, y, ang, sc, a, lit = 0) {
  if (a <= 0 || sc <= 0) return;
  g.save(); g.globalAlpha *= clamp01(a); g.translate(x, y); g.rotate(ang); g.scale(sc, sc);
  g.lineJoin = "round"; g.lineCap = "round"; g.lineWidth = 0.045; g.strokeStyle = "#1d1209";
  // แขนเสื้อ
  g.fillStyle = "#2c56b0";
  g.beginPath(); g.moveTo(-1.35, -0.28); g.lineTo(-0.66, -0.25); g.lineTo(-0.66, 0.27); g.lineTo(-1.35, 0.31); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(-1.3, -0.24, 0.6, 0.09);
  // ปลอกแขนเสื้อเชิ้ต
  g.fillStyle = "#f4f4f4";
  g.beginPath(); g.moveTo(-0.7, -0.24); g.lineTo(-0.55, -0.22); g.lineTo(-0.55, 0.24); g.lineTo(-0.7, 0.26); g.closePath(); g.fill(); g.stroke();
  // หมัด
  const skin = "#f7cfa4";
  g.fillStyle = skin;
  roundRect(g, -0.57, -0.24, 0.55, 0.5, 0.12); g.fill(); g.stroke();
  // นิ้วงอ 3 นิ้ว (ด้านล่าง)
  g.lineWidth = 0.03;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-0.5 + i * 0.15, 0.08); g.quadraticCurveTo(-0.44 + i * 0.15, 0.2, -0.37 + i * 0.15, 0.08); g.stroke(); }
  // นิ้วโป้ง
  g.lineWidth = 0.04; g.fillStyle = skin;
  g.beginPath(); g.ellipse(-0.24, -0.2, 0.2, 0.085, -0.18, 0, TAU); g.fill(); g.stroke();
  // นิ้วชี้
  g.beginPath(); g.moveTo(-0.08, -0.15); g.lineTo(0.62, -0.13); g.quadraticCurveTo(0.74, -0.07, 0.62, 0.0); g.lineTo(-0.08, 0.02); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "rgba(255,240,220,.9)"; g.fillRect(0.0, -0.12, 0.5, 0.035); // ไฮไลต์
  g.strokeStyle = "rgba(120,70,40,.7)"; g.lineWidth = 0.02; g.beginPath(); g.moveTo(0.28, -0.13); g.lineTo(0.3, 0.0); g.stroke(); // ข้อนิ้ว
  if (lit > 0) { g.globalCompositeOperation = "lighter"; glow(g, 0.66, -0.065, 0.3, SKY, lit * 0.9); }
  g.restore();
}
// เส้นความเร็วแบบมังงะตามแนว (จาก a ไป b) — วาดขนานแนว กระจายด้านข้าง
function speedLines(g, ax, ay, bx, by, s, a, seed, k) {
  if (a <= 0) return;
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  for (let i = 0; i < k; i++) {
    const h1 = hash(seed + i * 1.37), h2 = hash(seed + i * 4.1), h3 = hash(seed + i * 9.3);
    const off = (h1 - 0.5) * s * 0.9, t0 = h2 * 0.6, len = 0.25 + h3 * 0.55;
    const sx = ax + dx * t0 + nx * off, sy = ay + dy * t0 + ny * off * 0.6;
    g.strokeStyle = rgba(i % 3 ? WHITE : SKY, a * (0.35 + 0.5 * h3));
    g.lineWidth = Math.max(1, s * (0.012 + 0.02 * h1));
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + ux * L * len, sy + uy * L * len); g.stroke();
  }
  g.restore();
}
// ระเบิดดาวแบบมังงะ (หนามขาวขอบน้ำเงิน + วงกระแทก + เศษ)
function starBurst(g, x, y, s, q, seed, lowQ, rgb = SKY) {
  if (q < 0 || q > 1) return;
  const e = easeOut(q), fade = 1 - q;
  g.save();
  const n = 12, R = s * (0.35 + 0.65 * e), r0 = R * 0.45;
  g.beginPath();
  for (let i = 0; i <= n * 2; i++) {
    const ang = (i / (n * 2)) * TAU + seed, rr = i % 2 ? r0 : R * (0.75 + 0.35 * hash(seed + i));
    const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr * 0.8;
    if (i) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.closePath();
  g.fillStyle = rgba(WHITE, fade * 0.95); g.fill();
  g.lineWidth = Math.max(1.5, s * 0.03); g.strokeStyle = rgba(BLUE, fade); g.stroke();
  g.globalCompositeOperation = "lighter";
  glow(g, x, y, s * (0.3 + 0.6 * e), rgb, fade * 0.8);
  ring(g, x, y + s * 0.55, s * (0.2 + 0.9 * e), s * 0.05, fade * 0.9, rgb);
  if (!lowQ) {
    for (let i = 0; i < 10; i++) {
      const ang = hash(seed + i * 2.3) * TAU, d = s * (0.3 + 0.9 * e * (0.6 + 0.4 * hash(seed + i)));
      g.fillStyle = rgba(i % 2 ? WHITE : rgb, fade);
      g.beginPath(); g.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.7, Math.max(1, s * 0.025), 0, TAU); g.fill();
    }
  }
  g.restore();
}

// ---------- เอานี่ไปดู! ----------
//  e: x,y = ตัวนารุโฮโดะ (มุมบนซ้าย) · size · to = เป้า/ปลายแนว · toSize · tiles = แนว 3 ช่อง · ev = { icon } | null · hit (false = หลบ/ไม่มีเป้า)
function pointFx(g, e, now, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size), hasT = !!e.to;
  const end = hasT ? bodyAt(e.to.x, e.to.y, e.toSize) : null;
  // แนว: ช่องที่โดนเรืองฟ้า
  if (Array.isArray(e.tiles)) {
    const la = seg(p, 0.05, 0.25) * (1 - seg(p, 0.75, 1));
    g.save(); g.globalCompositeOperation = "lighter";
    e.tiles.forEach((t, i) => {
      const k = clamp01(la * 1.4 - i * 0.12);
      const [cx, cy, s] = P(t.x + 0.5, t.y + 0.5);
      g.fillStyle = rgba(SKY, k * 0.28);
      g.beginPath(); g.ellipse(cx, cy, s * 0.48, s * 0.24, 0, 0, TAU); g.fill();
    });
    g.restore();
  }
  const B = end || A;
  const ang = Math.atan2(B.hy - A.hy, B.bx - A.bx);
  // ป้าย Take that! เหนือหัว (เด้ง → สั่น → จาง)
  const sa = seg(p, 0, 0.12), sOut = 1 - seg(p, 0.55, 0.75);
  if (sOut > 0) {
    const jit = REDUCED || lowQ ? 0 : (1 - seg(p, 0.12, 0.3)) * A.s * 0.03;
    sprite(g, "takethat", A.bx + (Math.random() - 0.5) * jit, A.hy - A.s * (0.95 + 0.1 * A.K), A.s * (e.ev ? 1.7 : 1.35) * elastic(sa), sOut);
  }
  // นิ้วชี้พุ่ง: ออกจากตัว → ไปถึงเป้า (0.12–0.36) · ค้าง · ดึงกลับ
  const reach = easeOut(seg(p, 0.12, 0.36)) * (1 - easeIn(seg(p, 0.7, 0.95)));
  const hx = A.bx + (B.bx - A.bx) * reach * 0.82, hy = A.hy + (B.hy - A.hy) * reach * 0.82;
  const ha = seg(p, 0.1, 0.16) * (1 - seg(p, 0.85, 1));
  if (ha > 0) {
    speedLines(g, A.bx, A.hy, hx, hy, A.s, ha * (1 - seg(p, 0.45, 0.7)), seed, lowQ ? 8 : 22);
    g.save(); g.globalCompositeOperation = "lighter";
    g.strokeStyle = rgba(SKY, ha * 0.35); g.lineCap = "round"; g.lineWidth = A.s * 0.16;
    g.beginPath(); g.moveTo(A.bx, A.hy); g.lineTo(hx, hy); g.stroke();
    g.restore();
    const flip = Math.cos(ang) < 0;
    g.save();
    if (flip) { g.translate(hx, hy); g.scale(1, -1); g.translate(-hx, -hy); }
    hand(g, hx, hy, flip ? -ang : ang, A.s * 0.95, ha, seg(p, 0.3, 0.38) * (1 - seg(p, 0.5, 0.7)));
    g.restore();
  }
  // หลักฐานบินโค้งเข้าเป้า (มีหลักฐาน)
  if (e.ev && hasT) {
    const fq = seg(p, 0.14, 0.37), fa = seg(p, 0.12, 0.16) * (1 - seg(p, 0.37, 0.42));
    if (fa > 0) {
      const ex = A.bx + (B.bx - A.bx) * easeOut(fq), ey = A.hy + (B.hy - A.hy) * fq - Math.sin(fq * Math.PI) * A.s * 0.9;
      if (!lowQ) for (let i = 1; i <= 4; i++) {
        const q2 = Math.max(0, fq - i * 0.035);
        const tx = A.bx + (B.bx - A.bx) * easeOut(q2), ty = A.hy + (B.hy - A.hy) * q2 - Math.sin(q2 * Math.PI) * A.s * 0.9;
        g.save(); g.globalCompositeOperation = "lighter"; glow(g, tx, ty, A.s * 0.2, GOLD, fa * (0.5 - i * 0.1)); g.restore();
      }
      evidenceCard(g, e.ev.icon, ex, ey, A.s * (0.42 + 0.12 * Math.sin(fq * Math.PI)), fa, (1 - fq) * 2.4 + Math.sin(now / 90) * 0.06);
    }
    // ปะทะ: การ์ดค้างหน้าป้าย แล้วแตกเป็นประกาย
    const ia = seg(p, 0.37, 0.42) * (1 - seg(p, 0.62, 0.72));
    if (ia > 0) evidenceCard(g, e.ev.icon, B.bx, B.hy - B.s * 0.15, B.s * 0.55 * (1 + 0.15 * (1 - seg(p, 0.37, 0.45))), ia);
  }
  // ปะทะที่เป้า
  if (hasT) {
    const q = seg(p, 0.36, 0.86);
    if (e.hit === false) {
      // หลบ: ฝุ่นเล็ก + วงจาง
      if (q > 0 && q < 1) { g.save(); g.globalCompositeOperation = "lighter"; ring(g, B.bx, B.by, B.s * (0.2 + 0.4 * easeOut(q)), B.s * 0.03, (1 - q) * 0.6, WHITE); g.restore(); }
    } else if (q > 0 && q < 1) starBurst(g, B.bx, B.hy, B.s * (e.ev ? 1.15 : 0.8), q, seed, lowQ, e.ev ? GOLD : SKY);
  }
}

// ---------- สืบสวน ----------
//  e: x,y = นารุโฮโดะ · to = เป้า · ev = { icon } | null (หลักฐานที่ได้ — ส่งเฉพาะเจ้าของ)
function magnifier(g, x, y, r, a, ang = -0.75, now = 0) {
  if (a <= 0) return;
  g.save(); g.globalAlpha *= clamp01(a);
  // ด้าม
  const hx = x + Math.cos(ang + Math.PI) * r * 1.0, hy = y - Math.sin(ang + Math.PI) * r * 1.0;
  const tx = x + Math.cos(ang + Math.PI) * r * 2.1, ty = y - Math.sin(ang + Math.PI) * r * 2.1;
  g.lineCap = "round";
  g.strokeStyle = "#3a2410"; g.lineWidth = r * 0.42; g.beginPath(); g.moveTo(hx, hy); g.lineTo(tx, ty); g.stroke();
  g.strokeStyle = "#7a4a1e"; g.lineWidth = r * 0.3; g.beginPath(); g.moveTo(hx, hy); g.lineTo(tx, ty); g.stroke();
  // เลนส์
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r);
  gr.addColorStop(0, "rgba(255,255,255,.75)"); gr.addColorStop(0.5, "rgba(210,236,255,.28)"); gr.addColorStop(1, "rgba(150,200,255,.12)");
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  // ขอบทองเหลือง
  g.strokeStyle = "#5a3b0c"; g.lineWidth = r * 0.26; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  g.strokeStyle = "#e3b54a"; g.lineWidth = r * 0.16; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  g.strokeStyle = "rgba(255,248,210,.9)"; g.lineWidth = r * 0.05; g.beginPath(); g.arc(x, y, r, -2.4, -1.2); g.stroke();
  // ประกายเลนส์
  const tw = REDUCED ? 0.6 : 0.5 + 0.5 * Math.sin(now / 160);
  g.fillStyle = `rgba(255,255,255,${0.55 + 0.35 * tw})`;
  g.beginPath(); g.ellipse(x - r * 0.38, y - r * 0.4, r * 0.2, r * 0.09, -0.7, 0, TAU); g.fill();
  g.restore();
}
function scoutFx(g, e, now, p, seed, lowQ) {
  if (!e.to) return;
  const A = bodyAt(e.x, e.y, e.size), B = bodyAt(e.to.x, e.to.y, e.toSize);
  const la = seg(p, 0, 0.15) * (1 - seg(p, 0.8, 1));
  // เส้นประทองเชื่อม (ไหลจากนารุโฮโดะไปเป้า)
  if (la > 0) {
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    const grow = easeOut(seg(p, 0, 0.25));
    const ex = A.bx + (B.bx - A.bx) * grow, ey = A.hy + (B.hy - A.hy) * grow;
    g.strokeStyle = rgba(GOLD, la * 0.25); g.lineWidth = A.s * 0.1;
    g.beginPath(); g.moveTo(A.bx, A.hy); g.lineTo(ex, ey); g.stroke();
    g.setLineDash([A.s * 0.09, A.s * 0.07]); g.lineDashOffset = REDUCED ? 0 : -now / 18;
    g.strokeStyle = rgba(GOLD, la * 0.95); g.lineWidth = Math.max(1.5, A.s * 0.03);
    g.beginPath(); g.moveTo(A.bx, A.hy); g.lineTo(ex, ey); g.stroke();
    g.setLineDash([]);
    g.restore();
  }
  // วงสแกนบนพื้นใต้เป้า
  const sa = seg(p, 0.15, 0.3) * (1 - seg(p, 0.85, 1));
  if (sa > 0) {
    g.save(); g.globalCompositeOperation = "lighter";
    ring(g, B.bx, B.by, B.s * 0.5 * B.K, B.s * 0.03, sa * 0.8, GOLD);
    const sw = REDUCED ? 0 : (now / 600) % TAU;
    g.strokeStyle = rgba(GOLD, sa * 0.6); g.lineWidth = Math.max(1, B.s * 0.02);
    g.beginPath(); g.moveTo(B.bx, B.by); g.lineTo(B.bx + Math.cos(sw) * B.s * 0.5 * B.K, B.by + Math.sin(sw) * B.s * 0.25 * B.K); g.stroke();
    for (let i = 0; i < 3; i++) { const q = ((p * 2.2 + i / 3) % 1); ring(g, B.bx, B.by, B.s * (0.15 + 0.5 * q) * B.K, B.s * 0.02, sa * (1 - q) * 0.7, WHITE); }
    g.restore();
  }
  // แว่นขยาย: บินจากตัว → วนรอบเป้า 1 รอบครึ่ง → จับที่หน้าเป้า (ซูมเข้า)
  const ma = seg(p, 0.08, 0.16) * (1 - seg(p, 0.86, 1));
  if (ma > 0) {
    const fly = easeOut(seg(p, 0.08, 0.28)), orbit = seg(p, 0.28, 0.66), lock = easeOut(seg(p, 0.66, 0.76));
    const th = orbit * TAU * 1.5 - Math.PI / 2;
    const rx = B.s * 0.55 * B.K * (1 - lock), ry = B.s * 0.32 * B.K * (1 - lock);
    const ox = B.bx + Math.cos(th) * rx, oy = B.hy + Math.sin(th) * ry;
    const mx = A.bx + (ox - A.bx) * fly, my = A.hy - A.s * 0.3 + (oy - A.hy + A.s * 0.3) * fly;
    const r = B.s * (0.24 + 0.1 * lock);
    magnifier(g, mx, my, r, ma, -0.75 + Math.sin(th) * 0.15, now);
    if (lock > 0.9 && p < 0.86) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, mx, my, r * 1.6, GOLD, (1 - seg(p, 0.76, 0.86)) * 0.7); g.restore(); }
  }
  // หลักฐานที่ได้: เด้งออกจากเป้า → บินกลับเข้าตัวนารุโฮโดะ
  if (e.ev) {
    const pop = seg(p, 0.66, 0.74), back = easeIn(seg(p, 0.74, 0.95)), ea = pop * (1 - seg(p, 0.93, 0.98));
    if (ea > 0) {
      const sx = B.bx, sy = B.hy - B.s * 0.6 * easeOut(pop);
      const x = sx + (A.bx - sx) * back, y = sy + (A.hy - A.s * 0.2 - sy) * back - Math.sin(back * Math.PI) * A.s * 0.6;
      evidenceCard(g, e.ev.icon, x, y, B.s * (0.48 - 0.18 * back) * elastic(pop), ea);
    }
    const ga = seg(p, 0.93, 0.97) * (1 - seg(p, 0.97, 1));
    if (ga > 0) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, A.bx, A.hy, A.s * 0.7, GOLD, ga); g.restore(); }
  }
}

// ---------- เริ่มการไต่สวน ----------
//  e: x,y = นารุโฮโดะ · to = เป้า · hit (false = หลบพ้น)
function vignette(g, cx, cy, a) {
  if (a <= 0) return;
  const m = g.getTransform(), W = g.canvas.width, H = g.canvas.height;
  const dx = m.a * cx + m.c * cy + m.e, dy = m.b * cx + m.d * cy + m.f;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const R = Math.hypot(W, H) * 0.6;
  const gr = g.createRadialGradient(dx, dy, R * 0.12, dx, dy, R);
  gr.addColorStop(0, "rgba(10,6,0,0)"); gr.addColorStop(0.45, `rgba(14,8,2,${0.35 * a})`); gr.addColorStop(1, `rgba(6,3,0,${0.72 * a})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.restore();
}
function lightRays(g, B, a, now, lowQ) {
  if (a <= 0) return;
  g.save(); g.globalCompositeOperation = "lighter";
  const top = B.hy - B.s * 4.2, n = lowQ ? 4 : 7, sway = REDUCED ? 0 : now / 1400;
  for (let i = 0; i < n; i++) {
    const k = (i / (n - 1) - 0.5), w = B.s * (0.18 + 0.12 * hash(i + 3)), wob = Math.sin(sway + i * 1.7) * B.s * 0.08;
    const x0 = B.bx + k * B.s * 1.8 + wob, x1 = B.bx + k * B.s * 0.7;
    const gr = g.createLinearGradient(0, top, 0, B.by);
    gr.addColorStop(0, rgba(GOLD, 0)); gr.addColorStop(0.55, rgba(GOLD, a * 0.22)); gr.addColorStop(1, rgba("255,244,210", a * 0.4));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x0 - w * 0.4, top); g.lineTo(x0 + w * 0.4, top); g.lineTo(x1 + w, B.by); g.lineTo(x1 - w, B.by); g.closePath(); g.fill();
  }
  // วงสปอตไลต์บนพื้น
  const gr = g.createRadialGradient(B.bx, B.by, 0, B.bx, B.by, B.s * 0.9 * B.K);
  gr.addColorStop(0, rgba("255,240,200", a * 0.55)); gr.addColorStop(1, rgba(GOLD, 0));
  g.fillStyle = gr; g.beginPath(); g.ellipse(B.bx, B.by, B.s * 0.9 * B.K, B.s * 0.45 * B.K, 0, 0, TAU); g.fill();
  g.restore();
}
function trialFx(g, e, now, p, seed, lowQ) {
  if (!e.to) return;
  const B = bodyAt(e.to.x, e.to.y, e.toSize);
  const slam = NARU_T.trialSlam / NARU_T.trial;
  const dim = seg(p, 0, 0.18) * (1 - seg(p, 0.82, 1));
  if (!lowQ) vignette(g, B.bx, B.hy, dim);
  lightRays(g, B, dim * (e.hit === false ? 0.6 : 1) * (1 + 0.6 * (seg(p, slam, slam + 0.04) * (1 - seg(p, slam + 0.04, slam + 0.25)))), now, lowQ);
  // แท่นค้อน + มือฟาดค้อน (ภาพจากฉากศาล — วางเหนือหัวเป้า)
  const W = B.s * 2.2, cy = B.hy - B.s * 1.1;
  const ga = seg(p, 0.12, 0.2) * (1 - seg(p, slam + 0.1, slam + 0.18));
  if (ga > 0) {
    sprite(g, "block", B.bx, cy, W, ga);
    const down = easeIn(seg(p, 0.22, slam));
    const lift = Math.sin(seg(p, 0.12, 0.22) * Math.PI) * 0.15;
    const off = (-0.9 + down * 0.78 - lift) * W * 0.75;
    sprite(g, "gavel", B.bx + W * 0.02, cy + off, W, ga, (1 - down) * -0.35);
  }
  // ภาพตัดค้อนกระแทก (กรอบขาวเด้ง · สั่น)
  const ca = seg(p, slam, slam + 0.03) * (1 - seg(p, 0.74, 0.86));
  if (ca > 0) {
    const im = img("slam"), pw = B.s * 2.6 * (0.85 + 0.15 * elastic(seg(p, slam, slam + 0.14)));
    if (im) {
      const ph = pw * (im.naturalHeight / im.naturalWidth);
      const jit = REDUCED || lowQ ? 0 : (1 - seg(p, slam, slam + 0.12)) * B.s * 0.06;
      const px = B.bx + (Math.random() - 0.5) * jit, py = cy + (Math.random() - 0.5) * jit;
      g.save(); g.globalAlpha *= ca; g.translate(px, py); g.rotate(-0.04);
      g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = B.s * 0.2;
      g.fillStyle = "#ffffff"; g.fillRect(-pw / 2 - B.s * 0.06, -ph / 2 - B.s * 0.06, pw + B.s * 0.12, ph + B.s * 0.12);
      g.shadowColor = "transparent";
      g.drawImage(im, -pw / 2, -ph / 2, pw, ph);
      g.strokeStyle = "#1a1a1a"; g.lineWidth = Math.max(1, B.s * 0.02); g.strokeRect(-pw / 2, -ph / 2, pw, ph);
      g.restore();
    }
  }
  // คลื่นกระแทกบนพื้น + ประกายทอง
  const q = seg(p, slam, slam + 0.35);
  if (q > 0 && q < 1) {
    g.save(); g.globalCompositeOperation = "lighter";
    if (q < 0.2) glow(g, B.bx, cy, B.s * (0.6 + 2 * q), GOLD, (1 - q / 0.2) * 0.9);
    ring(g, B.bx, B.by, B.s * (0.3 + 2.2 * easeOut(q)) * B.K, B.s * 0.08, (1 - q) * 0.9, GOLD);
    ring(g, B.bx, B.by, B.s * (0.2 + 1.4 * easeOut(q)) * B.K, B.s * 0.04, (1 - q) * 0.8, WHITE);
    if (!lowQ) for (let i = 0; i < 16; i++) {
      const ang = hash(seed + i) * TAU, d = B.s * (0.4 + 1.6 * easeOut(q) * (0.5 + hash(seed + i * 3)));
      g.fillStyle = rgba(i % 2 ? GOLD : WHITE, 1 - q);
      g.beginPath(); g.arc(B.bx + Math.cos(ang) * d, B.by + Math.sin(ang) * d * 0.5 - B.s * 0.6 * q * hash(i), Math.max(1, B.s * 0.03), 0, TAU); g.fill();
    }
    g.restore();
  }
}

// ---------- รอเดี๋ยว!!! ----------
//  e: x,y = นารุโฮโดะ · to = ผู้กระทำที่ถูกแทรก · toSize
function freezeTint(g, B, a, now, lowQ) {
  if (a <= 0) return;
  g.save();
  // ม่านฟ้าเทาครอบตัว
  const gr = g.createRadialGradient(B.bx, B.hy, B.s * 0.1, B.bx, B.hy + B.s * 0.3, B.s * 1.1 * B.K);
  gr.addColorStop(0, rgba(FROST, a * 0.55)); gr.addColorStop(0.7, rgba("90,110,150", a * 0.4)); gr.addColorStop(1, rgba("90,110,150", 0));
  g.fillStyle = gr; g.beginPath(); g.ellipse(B.bx, B.hy + B.s * 0.35, B.s * 0.95 * B.K, B.s * 1.25 * B.K, 0, 0, TAU); g.fill();
  // หน้าปัดนาฬิกาใต้เท้า (ขีด 12 ช่อง + เข็มหยุดนิ่ง)
  const R = B.s * 0.55 * B.K;
  g.strokeStyle = rgba(WHITE, a * 0.85); g.lineWidth = Math.max(1, B.s * 0.025);
  g.beginPath(); g.ellipse(B.bx, B.by, R, R * 0.5, 0, 0, TAU); g.stroke();
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * TAU, r1 = i % 3 ? 0.86 : 0.76;
    g.beginPath(); g.moveTo(B.bx + Math.cos(t) * R * r1, B.by + Math.sin(t) * R * 0.5 * r1); g.lineTo(B.bx + Math.cos(t) * R, B.by + Math.sin(t) * R * 0.5); g.stroke();
  }
  const jit = REDUCED || lowQ ? 0 : Math.sin(now / 45) * 0.04; // เข็มสั่นค้าง
  g.lineWidth = Math.max(1.5, B.s * 0.04);
  for (const [t, L] of [[-1.1 + jit, 0.55], [0.5 - jit, 0.8]]) { g.beginPath(); g.moveTo(B.bx, B.by); g.lineTo(B.bx + Math.cos(t) * R * L, B.by + Math.sin(t) * R * 0.5 * L); g.stroke(); }
  // เกล็ดเส้นนิ่ง (แนวตั้ง) รอบตัว
  if (!lowQ) {
    g.strokeStyle = rgba(WHITE, a * 0.5); g.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const x = B.bx + (hash(i * 3.3) - 0.5) * B.s * 1.3 * B.K, y = B.hy + (hash(i * 7.1) - 0.5) * B.s * 1.3;
      g.beginPath(); g.moveTo(x, y - B.s * 0.12); g.lineTo(x, y + B.s * 0.12); g.stroke();
    }
  }
  g.restore();
}
function holdItFx(g, e, now, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size);
  // ผู้ถูกแทรก: หยุดเวลา
  if (e.to) {
    const B = bodyAt(e.to.x, e.to.y, e.toSize);
    freezeTint(g, B, seg(p, 0.05, 0.18) * (1 - seg(p, 0.85, 1)), now, lowQ);
    // คลื่นจากนารุโฮโดะพุ่งไปหยุดผู้กระทำ
    const q = seg(p, 0.08, 0.32);
    if (q > 0 && q < 1) {
      g.save(); g.globalCompositeOperation = "lighter";
      const x = A.bx + (B.bx - A.bx) * easeOut(q), y = A.hy + (B.hy - A.hy) * easeOut(q);
      glow(g, x, y, A.s * 0.35, RED, (1 - q) * 0.9);
      g.restore();
    }
  }
  // วงแดงกระแทกใต้ตัว + ป้าย 待った! เด้งเหนือหัว (สั่นช่วงแรก)
  const q = seg(p, 0, 0.3);
  if (q > 0 && q < 1) { g.save(); g.globalCompositeOperation = "lighter"; ring(g, A.bx, A.by, A.s * (0.3 + 1.4 * easeOut(q)) * A.K, A.s * 0.07, (1 - q) * 0.9, RED); glow(g, A.bx, A.hy, A.s * (0.5 + q), RED, (1 - q) * 0.6, "255,220,200"); g.restore(); }
  const ba = seg(p, 0, 0.04) * (1 - seg(p, 0.82, 0.96));
  if (ba > 0) {
    const jit = REDUCED || lowQ ? 0 : (1 - seg(p, 0.08, 0.35)) * A.s * 0.06;
    const w = A.s * 2.3 * elastic(seg(p, 0, 0.16));
    sprite(g, "holdit", A.bx + (Math.random() - 0.5) * jit, A.hy - A.s * (1.15 + 0.1 * A.K) + (Math.random() - 0.5) * jit, w, ba, -0.05);
  }
}

export function naruhodoFx(g, e, now, lowQ) {
  const dur = e.dur || NARU_FX_DUR[e.kind];
  const p = (now - e.t0) / dur;
  if (p < 0 || p > 1) return;
  const seed = ((e.t0 | 0) % 977) / 97;
  g.save();
  if (e.kind === "naruPoint") pointFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "naruScout") scoutFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "naruTrial") trialFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "naruHoldIt") holdItFx(g, e, now, p, seed, lowQ);
  g.restore();
}

// ---------- socket → fx (BoardStage useCharSocketFx / หน้าทดสอบ NaruhodoFxDev) ----------
//  payload จาก server (characters/naruhodo_ryuichi.js · server/court.js):
//   naruhodoPoint  { kind: "point", id, targetId, from, to, dir, icon|null }         (ส่งก่อนทอยหลบ — ผลดาเมจมากับ state)
//   naruhodoScout  { kind: "scout"|"gather", id, targetId, from, to, icon|null }     (gather = ตาแทรก เก็บหลักฐาน)
//   naruhodoTrial  { kind: "cast"|"dodge"|"open", id, targetId, from?, to }           (open = คดีเริ่มทันที — ฉากศาลทับกระดาน)
//   naruhodoHoldIt { kind: "shout"|"object"|"alibi", id, targetId, from?, to?, icon? }
//  ตำแหน่งที่ไม่ส่งมา = ดูจาก id ผ่าน ctx.posOf · คืน { fx, look, sfx: [[ชื่อ, ms]], shake: [ms] } | null
//  เสียงตอนกดสกิล (naru_point / naru_scout / naru_trial_open) server เล่นเอง (skillSound) — ที่นี่เล่นแค่จังหวะปะทะ/เสียงที่ไม่ได้มาจากสกิล
//  ระหว่างคดี (NARU_STATE.court) ไม่เล่นเสียงจากกระดาน (ฉากศาล/วีดีโอปิดคดีเล่นอยู่)
export const NARU_EVENTS = ["naruhodoPoint", "naruhodoScout", "naruhodoTrial", "naruhodoHoldIt"];
export const NARU_STATE = { court: false };
const okT = (t) => !!t && Number.isFinite(t.x) && Number.isFinite(t.y);
const DIR_V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export function naruEventFx(name, ev, ctx = {}) {
  if (!ev || typeof ev !== "object") return null;
  const posOf = ctx.posOf || (() => null), sizeOf = ctx.sizeOf || (() => 1);
  const tid = ev.targetId || ev.actorId || null;
  const from = okT(ev.from) ? { x: ev.from.x, y: ev.from.y } : okT(ev.at) ? { x: ev.at.x, y: ev.at.y } : posOf(ev.id);
  let to = okT(ev.to) ? { x: ev.to.x, y: ev.to.y } : tid ? posOf(tid) : null;
  const icon = ev.ev && Number.isFinite(ev.ev.icon) ? ev.ev.icon : Number.isFinite(ev.icon) ? ev.icon : null;
  const size = Math.max(1, (ev.size | 0) || sizeOf(ev.id)), toSize = Math.max(1, (ev.toSize | 0) || sizeOf(tid));
  const sfx = [], shake = [];
  const out = (fx, look) => ({ fx, look, sfx: NARU_STATE.court ? [] : sfx, shake: NARU_STATE.court ? [] : shake });
  const k = ev.kind;
  if (name === "naruhodoPoint") {
    if (!from) return null;
    let tiles = Array.isArray(ev.tiles) ? ev.tiles.filter(okT).map((t) => ({ x: t.x, y: t.y })) : null;
    const v = DIR_V[ev.dir];
    if (!tiles && v && size <= 1) tiles = [1, 2, 3].map((i) => ({ x: from.x + v[0] * i, y: from.y + v[1] * i }));
    if (!to && tiles && tiles.length) to = tiles[tiles.length - 1];
    const hit = ev.hit !== false && !!tid, T = NARU_T.pointHit;
    if (icon != null) sfx.push(["naru_whoosh", 160]);
    if (hit) { sfx.push([icon != null ? "naru_damage" : "naru_stamp", T]); shake.push(T); if (icon != null) shake.push(T + 130); }
    return out([{ kind: "naruPoint", x: from.x, y: from.y, size, to, toSize, tiles, hit, ev: icon != null ? { icon } : null }], to || from);
  }
  if (name === "naruhodoScout") {
    if (!from || !to) return null;
    if (k === "gather") sfx.push(["naru_scout", 0]); // ตาแทรก: ไม่ใช่สกิล — server ไม่ได้เล่นเสียง
    // เสียงได้หลักฐาน = ป้ายหลักฐานใหม่ใน HUD (NaruhodoHud EvidenceToasts) — ไม่เล่นซ้ำที่นี่
    return out([{ kind: "naruScout", x: from.x, y: from.y, size, to, toSize, ev: icon != null ? { icon } : null }], to);
  }
  if (name === "naruhodoTrial") {
    if (k === "open" || !to) return null; // คดีเริ่ม — ฉากศาลเล่นค้อนเอง
    const at = from || to;
    if (k === "dodge") return out([{ kind: "naruPoint", x: at.x, y: at.y, size, to, toSize, tiles: null, hit: false, ev: null, dur: 900 }], to);
    sfx.push(["naru_gavel", NARU_T.trialSlam]);
    shake.push(NARU_T.trialSlam, NARU_T.trialSlam + 120, NARU_T.trialSlam + 300);
    return out([{ kind: "naruTrial", x: at.x, y: at.y, size, to, toSize, hit: true }], to);
  }
  if (name === "naruhodoHoldIt") {
    if (k === "alibi") return null; // 📍 สวนกลับ — HUD (ShoutFlash) เล่นเสียง/ป้าย
    if (k === "object") {
      // คัดค้าน!: หลักฐานพุ่งจากนารุโฮโดะเข้าผู้กระทำ (เสียง OBJECTION! มาจาก HUD ตาม holdIt.result)
      if (!from || !to) return null;
      shake.push(NARU_T.pointHit);
      return out([{ kind: "naruPoint", x: from.x, y: from.y, size, to, toSize, tiles: null, hit: true, ev: icon != null ? { icon } : null }], to);
    }
    if (!from) return null;
    sfx.push(["naru_holdit", 0]);
    shake.push(0, 110);
    return out([{ kind: "naruHoldIt", x: from.x, y: from.y, size, to, toSize }], from);
  }
  return null;
}

// ---------- ป้ายค้างบนหมาก (boardUnits — u.naru = { scout, objected }) ----------
//  scout = แว่นขยายเล็กมุมซ้ายบน (ลอยขึ้นลงเบาๆ) · objected = วงแดงมือชี้ มุมซ้ายล่าง (เต้นเป็นจังหวะ)
// ป้ายแฟ้มหลักฐานบนศัตรู (เห็นเฉพาะนารุโฮโดะ): แฟ้มสีน้ำตาลทอง + จำนวนหลักฐานที่ยังไม่ใช้ของคนนั้น — ขอบขวากลางของหมาก (ไม่ทับป้ายธาตุมุมขวาบน/แถบเลือดใต้หมาก)
function evidenceBadge(g, x, y, R, n) {
  const w = Math.max(24, R * 0.66), h = w * 0.74, r = h * 0.18;
  g.save();
  g.translate(x - w / 2, y - h / 2);
  g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 4; g.shadowOffsetY = 1;
  // แถบหูแฟ้ม
  g.fillStyle = "#6b3f12"; roundRect(g, w * 0.08, -h * 0.16, w * 0.42, h * 0.3, r * 0.6); g.fill();
  g.fillStyle = "#9a6420"; roundRect(g, 0, 0, w, h, r); g.fill();
  g.shadowColor = "transparent";
  g.lineWidth = Math.max(1.2, w * 0.06); g.strokeStyle = "#f2cf72"; roundRect(g, 0, 0, w, h, r); g.stroke();
  g.fillStyle = "#fff4d0"; g.font = `900 ${Math.round(h * 0.78)}px Kanit, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = Math.max(2, h * 0.16); g.strokeStyle = "#3a1e06"; g.strokeText(String(n), w / 2, h * 0.55); g.fillText(String(n), w / 2, h * 0.55);
  g.restore();
}

// วงระยะเห็นเหตุการณ์ของนารุโฮโดะ (เฉพาะเจ้าตัว · ช่วงตาเดิน): ขอบขั้นบันไดของช่องที่ห่างแมนฮัตตัน ≤ r — เส้นประจางบนพื้น
//  s = { x, y, r } · ทางเดินเส้นคำนวณใหม่เฉพาะตอนตำแหน่งเปลี่ยน (แคชบนอ็อบเจกต์ s) · ต่อเฟรมแค่ฉายจุด ~40 จุด
export function drawNaruSight(g, s, now, lowQ) {
  if (!s || !Number.isFinite(s.x) || !Number.isFinite(s.y)) return;
  const R = s.r || 4;
  if (!s.edges) {
    const inR = (dx, dy) => Math.abs(dx) + Math.abs(dy) <= R;
    const e = [];
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      if (!inR(dx, dy)) continue;
      const x = s.x + dx, y = s.y + dy;
      if (!inR(dx, dy - 1)) e.push([x, y, x + 1, y]);
      if (!inR(dx, dy + 1)) e.push([x, y + 1, x + 1, y + 1]);
      if (!inR(dx - 1, dy)) e.push([x, y, x, y + 1]);
      if (!inR(dx + 1, dy)) e.push([x + 1, y, x + 1, y + 1]);
    }
    s.edges = e;
  }
  g.save();
  g.beginPath();
  for (const [x0, y0, x1, y1] of s.edges) { const a = P(x0, y0, 0.02), b = P(x1, y1, 0.02); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
  const [, , ts] = P(s.x + 0.5, s.y + 0.5);
  // ทับขอบช่องเดินได้บ่อย (ระยะเดิน 4 เท่ากัน) → เส้นทองอำพันมีขอบเข้ม แยกจากไฮไลต์ฟ้า/แดงได้ แต่ยังจาง
  if (!lowQ) { g.strokeStyle = "rgba(255,190,70,.18)"; g.lineWidth = Math.max(4, ts * 0.12); g.stroke(); }
  g.strokeStyle = "rgba(40,24,6,.42)"; g.lineWidth = Math.max(3, ts * 0.06); g.stroke();
  g.setLineDash([Math.max(5, ts * 0.16), Math.max(4, ts * 0.11)]);
  g.lineDashOffset = REDUCED || lowQ ? 0 : -(now / 60) % 1000;
  g.strokeStyle = "rgba(255,214,110,.9)"; g.lineWidth = Math.max(1.8, ts * 0.036); g.stroke();
  g.restore();
}

export function naruUnitFront(g, u, now, bx, hy, hexR) {
  const N = u.naru;
  if (!N) return;
  if (N.ev > 0) evidenceBadge(g, bx + hexR * 1.02, hy + hexR * 0.12, hexR, N.ev);
  const bob = REDUCED ? 0 : Math.sin(now / 420 + (u.rx || 0)) * hexR * 0.06;
  if (N.scout) {
    const x = bx - hexR * 0.82, y = hy - hexR * 0.72 + bob, r = hexR * 0.26;
    g.save();
    g.fillStyle = "rgba(20,14,4,.55)"; g.beginPath(); g.arc(x, y, r * 1.55, 0, TAU); g.fill();
    g.globalCompositeOperation = "lighter"; glow(g, x, y, r * 2, GOLD, 0.35); g.globalCompositeOperation = "source-over";
    magnifier(g, x + r * 0.15, y - r * 0.12, r * 0.85, 1, -0.75, now);
    g.restore();
  }
  if (N.objected) {
    const pulse = REDUCED ? 1 : 0.85 + 0.15 * Math.sin(now / 200);
    const x = bx - hexR * 0.82, y = hy + hexR * 0.62, r = hexR * 0.3 * pulse;
    g.save();
    g.fillStyle = "#d81c28"; g.strokeStyle = "#ffffff"; g.lineWidth = Math.max(1.5, hexR * 0.07);
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
    hand(g, x - r * 0.08, y + r * 0.08, 0, r * 1.25, 1);
    g.restore();
  }
}
