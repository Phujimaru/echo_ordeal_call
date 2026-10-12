// ============================================================
//  เอฟเฟกต์บนกระดานของ Ice Spike (characters/ice_spike.js · GRID_PLAN §7.9 · .claude/plans/ice-spike-contract.md)
//  ของที่อยู่บนกระดาน (วาดทุกเฟรมใน boardDraw.drawFrame)
//    drawIceSpike   หนามน้ำแข็ง Lv1–3 (terrain "icespike1|2|3") — มุมเอียง = รูปตั้ง spike{lv}_b · มุมบน = รูปราบ spike{lv}_t · ป้าย Lv
//    drawPrisons    คุกน้ำแข็งช่วงที่ 1 (state.board.prisons) — กรอบ 5×5 เรืองแสงเต้นช้าๆ
//    drawPickArrows ลูกศร 4 ทิศรอบคนที่ถูกวางหนามทับ (โหมดเลือกทิศผลัก)
//  เอฟเฟกต์ครั้งเดียว (fx.kind — BoardStage ส่งตามเหตุการณ์ socket "iceFx")
//    iceLay        น้ำแข็งเกิดบนช่อง (เกล็ดแผ่จากกลางช่อง)
//    iceTrail      ไถล: หางลม + เศษน้ำแข็งตามเส้นทาง { path, step }
//    iceHit        ไถลชนศัตรู: น้ำแข็งแตกกระจาย ขนาดตาม dmg (1–4) · max = แสงวาบใหญ่
//    iceBump       คนอื่นไถลชนคน (เบา)
//    iceSpikeUp    หนามโผล่/ขึ้น Lv: วงน้ำแข็งบนพื้น (ตัวหนามพุ่งขึ้นจากพื้นวาดใน drawIceSpike ด้วย iceSpikeRise)
//    iceSpikeBreak หนามแตก/หด: เศษหนามกระเด็น
//    iceSlow       ติดเชื่องช้า: เกล็ดน้ำแข็งเกาะรอบตัว
//    iceRegen      ฟื้นจากไถล: ประกายเขียว-ฟ้าลอยขึ้น
//    iceBurst      ติดตัว 3: วงคลื่นน้ำแข็งแผ่ 8 ช่องรอบตัว
//    icePrisonMark คุกช่วงที่ 1: เส้นกรอบ 5×5 วิ่งรอบ + แสงวาบ
//    icePrison     คุกช่วงที่ 2: คลื่นน้ำแข็งแผ่ 3×3
//    iceShake      ไม่วาด — จอสั่น (BoardCanvas เลื่อนกล้องตาม iceShakeOffset) { amp }
//  วาดด้วย canvas ล้วน · lowQ = ตัดอนุภาค/เรืองซ้อน · ลดการเคลื่อนไหว = ไม่สั่น/ไม่เต้น
// ============================================================
import { F_UI, P, gEllipse, glow, pitchOf, quad } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function rngOf(seed) { let s = Math.abs(seed | 0) % 2147483646 || 1; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }

// จังหวะ (ms) — BoardStage ใช้คิวแอนิเมชัน/รอเหตุการณ์ถัดไป
export const ICE_T = { slideStep: 62, hitStop: 190, layStep: 45, prisonIce: 260, prisonRing: 70, prisonTail: 360 };
export const ICE_FX_DUR = {
  iceLay: 560, iceTrail: 1200, iceHit: 760, iceBump: 440, iceSpikeUp: 620, iceSpikeBreak: 700,
  iceSlow: 950, iceRegen: 1000, iceBurst: 820, icePrisonMark: 1000, icePrison: 1500, iceShake: 420,
};
export const isIceFx = (kind) => typeof kind === "string" && (kind in ICE_FX_DUR);
// ระยะเล่นของหางไถล (ตามความยาวเส้นทาง)
export const iceTrailDur = (path, step) => Math.max(1, (Array.isArray(path) ? path.length : 1) - 1) * (step || ICE_T.slideStep) + 520;

// ---------- รูปหนาม (แคช · โหลดเสร็จแล้วเฟรมถัดไปก็วาดเอง — หนามวาดสดทุกเฟรมไม่ได้อยู่ในชั้นอบ) ----------
const imgs = new Map();
function img(url) {
  let e = imgs.get(url);
  if (!e) {
    const im = new Image();
    e = { img: im, ok: false };
    const entry = e;
    im.decoding = "async";
    im.onload = () => { entry.ok = im.naturalWidth > 0; };
    im.src = url;
    imgs.set(url, e);
  }
  return e;
}
const spikeUrl = (lv, top) => `/characters/ice_spike/spike${Math.max(1, Math.min(3, lv | 0))}_${top ? "t" : "b"}.webp`;
export const iceSpikeLv = (kind) => (typeof kind === "string" && /^icespike[1-3]$/.test(kind) ? Number(kind.slice(8)) : 0);
// โหลดรูปไว้ก่อน (ตอนมี Ice Spike ในเกม)
export function preloadIceArt() { for (let lv = 1; lv <= 3; lv++) { img(spikeUrl(lv, false)); img(spikeUrl(lv, true)); } }

const LV_RGB = ["150,215,255", "120,170,255", "95,120,240"];
// หนามพุ่งขึ้นจากพื้น: fx iceSpikeUp ที่ช่องนี้ → สเกล (null = ไม่มี)
export function iceSpikeRise(fx, x, y, now) {
  for (const e of fx) {
    if (e.kind !== "iceSpikeUp" || e.x !== x || e.y !== y) continue;
    const t = clamp01((now - e.t0) / 380);
    if (REDUCED) return 1;
    return e.from > 0 ? 0.82 + 0.18 * easeOutBack(t) : Math.max(0.02, easeOutBack(t));
  }
  return null;
}

// t = { x, y } · lv 1–3 · o = { rise (สเกลตอนพุ่งขึ้น), alpha, now }
export function drawIceSpike(g, x, y, lv, o = {}) {
  const top = pitchOf() >= 80, rise = o.rise == null ? 1 : o.rise, a = o.alpha == null ? 1 : o.alpha;
  const [sx, sy, s] = P(x + 0.5, y + 0.5);
  const k = 0.86 + 0.12 * (lv - 1), e = img(spikeUrl(lv, top));
  g.save(); g.globalAlpha = a;
  // เงา/แสงเย็นบนพื้น
  gEllipse(g, x + 0.5, y + 0.5, 0.42 * Math.min(1, rise)); g.fillStyle = top ? "rgba(140,200,255,.18)" : "rgba(30,60,110,.22)"; g.fill();
  let badgeX = sx + s * 0.3, badgeY = sy - s * 0.12;
  if (e.ok) {
    if (top) {
      const w = s * 0.94 * k * rise;
      g.translate(sx, sy); g.rotate((lv - 1) * 0.2);
      g.drawImage(e.img, -w / 2, -w / 2, w, w);
      badgeX = sx + w * 0.34; badgeY = sy - w * 0.34;
    } else {
      const w = s * 1.22 * k, h = w * rise, base = sy + s * 0.24; // สูงกว่าก้อนน้ำแข็ง/สิ่งกีดขวางข้างหน้าเล็กน้อย จะได้ไม่โดนบังมิด
      g.drawImage(e.img, sx - w / 2, base - h, w, h);
      badgeX = sx + w * 0.36; badgeY = base - h * 0.28;
    }
  } else {
    // รูปยังไม่โหลด: กรวยน้ำแข็งเรียบๆ
    const h = s * (0.6 + 0.15 * lv) * rise, base = top ? sy : sy + s * 0.2;
    g.fillStyle = `rgba(${LV_RGB[lv - 1]},.9)`; g.beginPath();
    if (top) { for (let i = 0; i < 8; i++) { const an = i / 8 * TAU, r = i % 2 ? s * 0.16 : s * 0.42 * rise; g.lineTo(sx + Math.cos(an) * r, sy + Math.sin(an) * r); } }
    else { g.moveTo(sx - s * 0.32, base); g.lineTo(sx, base - h); g.lineTo(sx + s * 0.32, base); }
    g.closePath(); g.fill(); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 1.5; g.stroke();
  }
  g.restore();
  if (rise >= 0.95 && o.badge !== false) {
    // ป้าย Lv (ตัวเลขล้วน)
    const r = Math.max(7, s * 0.13);
    g.save(); g.globalAlpha = a;
    g.fillStyle = "rgba(13,28,54,.9)"; g.beginPath(); g.arc(badgeX, badgeY, r, 0, TAU); g.fill();
    g.strokeStyle = `rgb(${LV_RGB[lv - 1]})`; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = "#e9f6ff"; g.font = `700 ${Math.round(r * 1.25)}px ${F_UI}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(String(lv), badgeX, badgeY + 0.5);
    g.restore();
  }
}

// ---------- คุกน้ำแข็งช่วงที่ 1 (ค้างจนช่วงที่ 2) ----------
function squarePath(g, x0, y0, n, z = 0) {
  const a = P(x0, y0, z), b = P(x0 + n, y0, z), c = P(x0 + n, y0 + n, z), d = P(x0, y0 + n, z);
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
}
export function drawPrisons(g, prisons, info, now, lowQ) {
  if (!Array.isArray(prisons) || !prisons.length) return;
  const still = lowQ || REDUCED;
  for (const pr of prisons) {
    if (!pr || !Number.isFinite(pr.x) || !Number.isFinite(pr.y)) continue;
    const n = Math.max(1, pr.size | 0 || 5), h = Math.floor(n / 2);
    const x0 = Math.max(0, pr.x - h), y0 = Math.max(0, pr.y - h);
    const x1 = Math.min(info.cols, pr.x - h + n), y1 = Math.min(info.rows, pr.y - h + n);
    const pulse = still ? 0.7 : 0.55 + 0.45 * Math.sin(now / 380);
    const corners = [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)];
    const path = () => { g.beginPath(); corners.forEach((c, i) => (i ? g.lineTo(c[0], c[1]) : g.moveTo(c[0], c[1]))); g.closePath(); };
    g.save();
    path(); g.fillStyle = `rgba(150,215,255,${0.06 + 0.06 * pulse})`; g.fill();
    if (!lowQ) { path(); g.strokeStyle = `rgba(120,200,255,${0.25 * pulse})`; g.lineWidth = 12; g.lineJoin = "round"; g.stroke(); }
    // ขอบน้ำเงินเข้มใต้เส้นขาว — เห็นชัดบนพื้นหิมะ/น้ำแข็ง (ภูมิภาค VI)
    path(); g.strokeStyle = `rgba(30,95,190,${0.55 + 0.3 * pulse})`; g.lineWidth = 5.5; g.lineJoin = "round"; g.stroke();
    path(); g.strokeStyle = `rgba(200,240,255,${0.6 + 0.4 * pulse})`; g.lineWidth = 3; g.lineJoin = "round"; g.stroke();
    if (!still) { path(); g.setLineDash([10, 12]); g.lineDashOffset = -now / 40; g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 1.4; g.stroke(); g.setLineDash([]); }
    // ผลึกเล็กที่มุม
    for (const c of corners) {
      const r = c[2] * 0.14;
      g.fillStyle = `rgba(230,248,255,${0.7 + 0.3 * pulse})`; g.beginPath();
      for (let i = 0; i < 8; i++) { const an = i / 8 * TAU, rr = i % 2 ? r * 0.35 : r; g.lineTo(c[0] + Math.cos(an) * rr, c[1] + Math.sin(an) * rr * 0.8); }
      g.closePath(); g.fill();
    }
    g.restore();
  }
}

// ---------- ลูกศรเลือกทิศผลัก ----------
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export function drawPickArrows(g, arrows, hover, now) {
  if (!Array.isArray(arrows)) return;
  for (const ar of arrows) {
    const v = DIRV[ar.dir];
    if (!v) continue;
    const hot = ar.ok && hover && hover.x === ar.x && hover.y === ar.y;
    const bob = ar.ok && !REDUCED ? 0.06 * Math.sin(now / 220) : 0;
    const c = P(ar.x + 0.5 + v[0] * bob, ar.y + 0.5 + v[1] * bob, 0.05);
    const tip = P(ar.x + 0.5 + v[0] * (0.3 + bob), ar.y + 0.5 + v[1] * (0.3 + bob), 0.05);
    const L = P(ar.x + 0.5 - v[0] * 0.18 + v[1] * 0.26, ar.y + 0.5 - v[1] * 0.18 + v[0] * 0.26, 0.05);
    const R = P(ar.x + 0.5 - v[0] * 0.18 - v[1] * 0.26, ar.y + 0.5 - v[1] * 0.18 - v[0] * 0.26, 0.05);
    const M = P(ar.x + 0.5 + v[0] * 0.02, ar.y + 0.5 + v[1] * 0.02, 0.05);
    g.save();
    if (ar.ok) { quad(g, ar.x, ar.y, 0.06); g.fillStyle = hot ? "rgba(150,220,255,.45)" : "rgba(120,200,255,.2)"; g.fill(); }
    g.beginPath(); g.moveTo(tip[0], tip[1]); g.lineTo(L[0], L[1]); g.lineTo(M[0], M[1]); g.lineTo(R[0], R[1]); g.closePath();
    g.fillStyle = ar.ok ? (hot ? "#ffffff" : "#bfe8ff") : "rgba(120,130,150,.45)"; g.fill();
    g.strokeStyle = ar.ok ? "rgba(20,70,140,.9)" : "rgba(40,40,50,.5)"; g.lineWidth = 2; g.stroke();
    if (!ar.ok) {
      // ไปไม่ได้: กากบาทเล็ก
      const s = c[2] * 0.12;
      g.strokeStyle = "rgba(255,120,110,.85)"; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(c[0] - s, c[1] - s); g.lineTo(c[0] + s, c[1] + s); g.moveTo(c[0] + s, c[1] - s); g.lineTo(c[0] - s, c[1] + s); g.stroke();
    }
    g.restore();
  }
}

// ---------- จอสั่น (เลื่อนกล้อง) — ผลรวมของ iceShake ที่กำลังเล่น → [dx, dy] พิกัดตรรกะ ----------
export function iceShakeOffset(fx, now, lowQ) {
  if (lowQ || REDUCED) return null;
  let dx = 0, dy = 0, any = false;
  for (const e of fx) {
    if (e.kind !== "iceShake") continue;
    const p = (now - e.t0) / (e.dur || ICE_FX_DUR.iceShake);
    if (p < 0 || p >= 1) continue;
    const k = (e.amp || 4) * Math.pow(1 - p, 2), w = now / 16;
    dx += Math.sin(w * 1.7 + e.t0) * k; dy += Math.cos(w * 2.3 + e.t0 * 0.7) * k * 0.6; any = true;
  }
  return any ? [dx, dy] : null;
}

// ---------- เศษน้ำแข็ง ----------
function shard(g, x, y, r, rot, rgb, a) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.globalAlpha = a;
  g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.45, r * 0.2); g.lineTo(0, r * 0.55); g.lineTo(-r * 0.4, 0); g.closePath();
  g.fillStyle = `rgb(${rgb})`; g.fill(); g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 1; g.stroke();
  g.restore();
}
// เศษกระจายจากจุด (ox, oy บนกระดาน) — n ชิ้น · พุ่งออกแล้วตกตามแรงโน้มถ่วง
function burstShards(g, ox, oy, z0, n, spread, t, T, seed, size, lowQ) {
  const R = rngOf(seed), cnt = lowQ ? Math.ceil(n / 2) : n, p = clamp01(t / T);
  for (let i = 0; i < cnt; i++) {
    const an = R() * TAU, sp = spread * (0.5 + R() * 0.7), up = 0.4 + R() * 0.9, rs = R();
    const d = sp * easeOut3(p), z = z0 + up * p - 1.6 * p * p;
    if (z < -0.05) continue;
    const [px, py, s] = P(ox + Math.cos(an) * d, oy + Math.sin(an) * d, Math.max(0, z));
    shard(g, px, py, s * size * (0.5 + rs * 0.6), an + p * (4 + rs * 6), rs > 0.5 ? "205,238,255" : "150,205,250", 1 - p * p);
  }
}

export function iceFx(g, e, now, lowQ) {
  // delay = เริ่มช้ากว่าเวลาที่เพิ่ม (dur ของ BoardCanvas ต้องรวม delay แล้ว) · len = ความยาวแอนิเมชัน (ไม่ใส่ = ICE_FX_DUR)
  const t = now - e.t0 - (e.delay | 0), T = e.len || ICE_FX_DUR[e.kind] || 800, p = clamp01(t / T);
  if (t < 0 || p >= 1) return;
  switch (e.kind) {
    case "iceLay": {
      // เกล็ดแผ่จากกลางช่อง → เต็มช่อง แล้วจางเป็นพื้นน้ำแข็ง (ชั้นอบ)
      const q = easeOut3(clamp01(t / 300));
      g.save();
      quad(g, e.x, e.y, 0.5 - 0.48 * q); g.fillStyle = `rgba(230,248,255,${0.75 * (1 - p)})`; g.fill();
      g.strokeStyle = `rgba(255,255,255,${0.9 * (1 - p)})`; g.lineWidth = 2; g.stroke();
      if (!lowQ) {
        const R = rngOf(e.x * 31 + e.y * 17 + 3);
        for (let i = 0; i < 6; i++) {
          const an = R() * TAU, d = 0.15 + 0.3 * q * R(), [px, py, s] = P(e.x + 0.5 + Math.cos(an) * d, e.y + 0.5 + Math.sin(an) * d, 0.1 + p * 0.5);
          g.globalAlpha = Math.sin(p * Math.PI); g.fillStyle = "#ffffff"; g.beginPath(); g.arc(px, py, Math.max(1, s * 0.03), 0, TAU); g.fill();
        }
      }
      g.restore();
      return;
    }
    case "iceTrail": {
      const pts = Array.isArray(e.path) ? e.path : [];
      if (pts.length < 2) return;
      const step = e.step || ICE_T.slideStep, run = (pts.length - 1) * step;
      const head = Math.min(pts.length - 1, t / step), fade = t > run ? clamp01((t - run) / 520) : 0;
      const posAt = (f) => { const i = Math.max(0, Math.min(pts.length - 2, Math.floor(f))), k = Math.max(0, Math.min(1, f - i)); return [pts[i].x + (pts[i + 1].x - pts[i].x) * k + 0.5, pts[i].y + (pts[i + 1].y - pts[i].y) * k + 0.5]; };
      g.save(); g.lineCap = "round";
      // ร่องน้ำแข็งบนพื้น (ทางที่ไถลผ่าน)
      const tail = Math.max(0, head - 2.2);
      const [hx, hy] = posAt(head), [tx, ty] = posAt(tail);
      const a0 = P(tx, ty, 0.02), a1 = P(hx, hy, 0.02);
      const gr = g.createLinearGradient(a0[0], a0[1], a1[0], a1[1]);
      gr.addColorStop(0, "rgba(200,240,255,0)"); gr.addColorStop(1, `rgba(235,250,255,${0.85 * (1 - fade)})`);
      g.strokeStyle = gr; g.lineWidth = a1[2] * 0.22; g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(a1[0], a1[1]); g.stroke();
      // หางลม (เส้นความเร็วลอยเหนือพื้น)
      if (!lowQ) {
        for (let i = -1; i <= 1; i++) {
          const dx = pts[pts.length - 1].x - pts[0].x, dy = pts[pts.length - 1].y - pts[0].y, L = Math.hypot(dx, dy) || 1, nx = -dy / L * 0.22 * i, ny = dx / L * 0.22 * i;
          const b0 = P(tx + nx, ty + ny, 0.45 + 0.15 * Math.abs(i)), b1 = P(hx + nx * 0.4, hy + ny * 0.4, 0.45 + 0.1 * Math.abs(i));
          g.strokeStyle = `rgba(255,255,255,${(i ? 0.35 : 0.6) * (1 - fade)})`; g.lineWidth = i ? 1.5 : 2.5;
          g.beginPath(); g.moveTo(b0[0], b0[1]); g.lineTo(b1[0], b1[1]); g.stroke();
        }
      }
      g.restore();
      // เศษน้ำแข็งกระเด็นจากทุกช่องที่ผ่าน
      for (let i = 1; i < pts.length; i++) {
        const at = i * step - step * 0.5, tt = t - at;
        if (tt < 0 || tt > 520) continue;
        burstShards(g, pts[i].x + 0.5, pts[i].y + 0.5, 0.05, 4, 0.45, tt, 520, i * 97 + pts[i].x * 13 + pts[i].y, 0.07, lowQ);
      }
      return;
    }
    case "iceHit": {
      const dmg = Math.max(1, Math.min(4, e.dmg | 0 || 1)), big = 0.75 + dmg * 0.18 + (e.max ? 0.25 : 0);
      const cx = e.x + 0.5, cy = e.y + 0.5, [sx, sy, s] = P(cx, cy, 0.6);
      g.save();
      if (!lowQ) glow(g, sx, sy, s * 1.3 * big, e.max ? "200,235,255" : "160,215,255", 0.75 * (1 - p));
      // วงแหวนกระแทก
      const q = easeOut3(p);
      g.strokeStyle = `rgba(255,255,255,${1 - p})`; g.lineWidth = 5 * (1 - p) + 1;
      gEllipse(g, cx, cy, 0.25 + q * 0.9 * big, 0.08); g.stroke();
      // ดาวผลึกกลาง
      if (p < 0.45) {
        const k = s * 0.5 * big * (1 - p / 0.45);
        g.fillStyle = "#ffffff"; g.beginPath();
        for (let i = 0; i < 12; i++) { const an = i / 12 * TAU, r = i % 2 ? k * 0.25 : k; g.lineTo(sx + Math.cos(an) * r, sy + Math.sin(an) * r * 0.85); }
        g.closePath(); g.fill();
      }
      g.restore();
      burstShards(g, cx, cy, 0.5, 8 + dmg * 4 + (e.max ? 8 : 0), 0.7 * big, t, T, e.x * 71 + e.y * 29 + dmg, 0.1 * big, lowQ);
      return;
    }
    case "iceBump": {
      const cx = e.x + 0.5, cy = e.y + 0.5;
      g.save(); g.strokeStyle = `rgba(220,245,255,${1 - p})`; g.lineWidth = 3 * (1 - p) + 1;
      gEllipse(g, cx, cy, 0.2 + easeOut3(p) * 0.45, 0.4); g.stroke(); g.restore();
      burstShards(g, cx, cy, 0.4, 5, 0.4, t, T, e.x * 13 + e.y * 7 + 1, 0.07, lowQ);
      return;
    }
    case "iceSpikeUp": {
      const cx = e.x + 0.5, cy = e.y + 0.5, q = easeOut3(p);
      g.save();
      g.strokeStyle = `rgba(210,240,255,${0.9 * (1 - p)})`; g.lineWidth = 3;
      gEllipse(g, cx, cy, 0.2 + q * 0.75, 0.02); g.stroke();
      quad(g, e.x, e.y, 0.04); g.fillStyle = `rgba(200,235,255,${0.35 * (1 - p)})`; g.fill();
      g.restore();
      if (e.from <= 0) burstShards(g, cx, cy, 0.05, 6, 0.55, t, T, e.x * 41 + e.y * 11 + 7, 0.08, lowQ);
      return;
    }
    case "iceSpikeBreak": {
      const cx = e.x + 0.5, cy = e.y + 0.5, gone = !(e.lv > 0);
      if (!lowQ) { const [sx, sy, s] = P(cx, cy, 0.5); glow(g, sx, sy, s * 0.9, "190,230,255", 0.6 * (1 - p)); }
      burstShards(g, cx, cy, 0.5, gone ? 14 : 7, gone ? 0.8 : 0.5, t, T, e.x * 53 + e.y * 19 + (e.lv | 0), 0.1, lowQ);
      return;
    }
    case "iceSlow": {
      const cx = e.x + 0.5, cy = e.y + 0.5, q = easeOut3(clamp01(t / 400));
      g.save();
      gEllipse(g, cx, cy, 0.42, 0.02); g.fillStyle = `rgba(160,215,255,${0.35 * Math.sin(p * Math.PI)})`; g.fill();
      const n = lowQ ? 4 : 8;
      for (let i = 0; i < n; i++) {
        const an = i / n * TAU + t / 900, d = 0.75 - 0.4 * q, [px, py, s] = P(cx + Math.cos(an) * d, cy + Math.sin(an) * d, 0.3 + 0.5 * (i % 3) / 2);
        const r = s * 0.07, a = Math.sin(p * Math.PI);
        g.strokeStyle = `rgba(235,250,255,${a})`; g.lineWidth = 1.4; g.beginPath();
        for (let k = 0; k < 3; k++) { const b = k / 3 * Math.PI; g.moveTo(px - Math.cos(b) * r, py - Math.sin(b) * r); g.lineTo(px + Math.cos(b) * r, py + Math.sin(b) * r); }
        g.stroke();
      }
      g.restore();
      return;
    }
    case "iceRegen": {
      const cx = e.x + 0.5, cy = e.y + 0.5, R = rngOf(e.x * 7 + e.y * 5 + 11), n = lowQ ? 5 : 12;
      g.save();
      for (let i = 0; i < n; i++) {
        const an = R() * TAU, d = 0.15 + R() * 0.3, ph = clamp01(p * 1.3 - R() * 0.3), [px, py, s] = P(cx + Math.cos(an) * d, cy + Math.sin(an) * d, 0.2 + ph * 1.4);
        g.globalAlpha = Math.sin(ph * Math.PI); g.fillStyle = i % 2 ? "#9ff5c0" : "#9fdcff";
        g.beginPath(); g.arc(px, py, Math.max(1.2, s * 0.035), 0, TAU); g.fill();
      }
      g.restore();
      return;
    }
    case "iceBurst": {
      const cx = e.x + 0.5, cy = e.y + 0.5, q = easeOut3(p), r = 0.3 + q * 1.35;
      g.save();
      // คลื่นสี่เหลี่ยมมนแผ่คลุม 8 ช่องรอบตัว
      const sq = (rr, z) => { const n = 28; g.beginPath(); for (let i = 0; i <= n; i++) { const an = i / n * TAU, c = Math.cos(an), s = Math.sin(an), m = Math.pow(Math.pow(Math.abs(c), 4) + Math.pow(Math.abs(s), 4), -0.25), pt = P(cx + c * rr * m, cy + s * rr * m, z); if (i) g.lineTo(pt[0], pt[1]); else g.moveTo(pt[0], pt[1]); } g.closePath(); };
      sq(r, 0.03); g.fillStyle = `rgba(190,232,255,${0.28 * (1 - p)})`; g.fill();
      g.strokeStyle = `rgba(255,255,255,${1 - p})`; g.lineWidth = 4 * (1 - p) + 1; g.stroke();
      if (!lowQ) { sq(r * 0.8, 0.03); g.strokeStyle = `rgba(140,205,255,${0.8 * (1 - p)})`; g.lineWidth = 2; g.stroke(); }
      g.restore();
      burstShards(g, cx, cy, 0.4, 14, 1.4, t, T, e.x * 19 + e.y * 23 + 5, 0.09, lowQ);
      return;
    }
    case "icePrisonMark": {
      const n = Math.max(1, e.size | 0 || 5), h = Math.floor(n / 2), x0 = e.x - h, y0 = e.y - h, q = easeOut3(clamp01(t / 520));
      g.save();
      // เส้นกรอบวิ่งรอบจากมุม (ยาวตาม q)
      const c = [[x0, y0], [x0 + n, y0], [x0 + n, y0 + n], [x0, y0 + n], [x0, y0]];
      g.strokeStyle = `rgba(235,250,255,${1 - clamp01((t - 600) / 400)})`; g.lineWidth = 4; g.lineCap = "round";
      g.beginPath();
      let left = q * 4;
      for (let i = 0; i < 4 && left > 0; i++) {
        const u = Math.min(1, left), a = P(c[i][0], c[i][1], 0.02), b = P(c[i][0] + (c[i + 1][0] - c[i][0]) * u, c[i][1] + (c[i + 1][1] - c[i][1]) * u, 0.02);
        if (i === 0) g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]); left -= 1;
      }
      g.stroke();
      if (t > 480) { squarePath(g, x0, y0, n, 0.02); g.fillStyle = `rgba(200,240,255,${0.3 * (1 - clamp01((t - 480) / 500))})`; g.fill(); }
      g.restore();
      return;
    }
    case "icePrison": {
      const cx = e.x + 0.5, cy = e.y + 0.5, q = easeOut3(clamp01(t / 500));
      g.save();
      squarePath(g, e.x - 1 + (1 - q) * 1.5, e.y - 1 + (1 - q) * 1.5, Math.max(0.01, 3 * q), 0.03);
      g.fillStyle = `rgba(225,248,255,${0.55 * (1 - p)})`; g.fill();
      g.strokeStyle = `rgba(255,255,255,${1 - p})`; g.lineWidth = 3; g.stroke();
      if (!lowQ) { const [sx, sy, s] = P(cx, cy, 0.8); glow(g, sx, sy, s * 2.4, "170,220,255", 0.55 * (1 - p)); }
      g.restore();
      return;
    }
    default:
  }
}
