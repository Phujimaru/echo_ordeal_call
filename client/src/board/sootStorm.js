// ============================================================
//  ม่านแดง — ท่าไม้ตายเคท "ระบำเขม่า" บนกระดาน (state.board.storms [{ x0, y0, x1, y1, owner, left }] · x1/y1 รวมช่องปลาย)
//  วาดค้างทุกเฟรม (ถูกๆ): พื้นมืดในกรอบ + เกลียวเขม่าบนพื้น · ม่านกำมะหยี่แดงสูงรอบขอบ (เรียงความลึกกับตัวละคร — ผนังหน้าบังตัวในม่าน)
//   · เขม่าหมุนวนในอากาศ + ประกายไฟลอยจากยอดม่าน · ผู้ชมอยู่นอกม่าน = หมอกหนา (มองไม่เห็นข้างใน) · อยู่ข้างใน = จางพอเห็นกันเอง
//  ฉากร่าย (socket "shadowFx" kind "storm") — castStorm(payload) ประกาศให้ทั้ง KateStorm.jsx (ฉากเต็มจอ) และกระดานรู้พร้อมกัน
//   กระดานซ่อนม่านใหม่ไว้จนม่านในฉากเปิด (STORM_T.reveal) แล้วค่อยกลืนพื้นที่ออกจากช่องกลาง + ม่านพุ่งขึ้น + จอสั่น
//   ม่านที่ไม่มีฉากร่าย (เข้าห้องกลางเกม) = ค่อยๆ ปรากฏ · ม่านหาย = ม่านยุบลง + จาง (FADE_OUT)
//  lowQ = ไม่มีอนุภาค/ลายพับม่าน · ลดการเคลื่อนไหว = ทุกอย่างนิ่ง ไม่สั่น
//  ใช้: BoardCanvas (syncStorms + stormShakeOffset) → drawFrame (drawStormGround → stormWallItems → drawStormAir)
// ============================================================
import { P, depthOf, gEllipse } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const span = (t, a, b) => clamp01((t - a) / (b - a));
const eOut = (t) => 1 - Math.pow(1 - t, 3);
const eBack = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
function rngOf(seed) { let s = Math.abs(seed | 0) % 2147483646 || 1; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }

// จังหวะฉากร่าย (ms นับจากได้ shadowFx storm) — KateStorm.jsx ใช้ชุดเดียวกัน · server พักตาเดิน ~4 วิ
export const STORM_T = {
  veil: [0, 350], valance: [80, 560], close: [150, 1050], spot: 1050, rise: [1050, 1650],
  dancers: [1250, 2550], band: [1700, 2450], title: [1850, 2400],
  reveal: 2450, open: [2450, 3000], engulf: 1150, end: 4000,
};
const FADE_OUT = 900;   // ม่านหาย: ยุบ + จาง
const WALL_H = 1.15;    // ความสูงม่าน (หน่วยช่อง)
const SHAKE_MS = 820;

// ---------- ประกาศการร่าย (KateStorm + BoardCanvas ฟังร่วมกัน) ----------
const casts = [];
const listeners = new Set();
export function castStorm(payload) {
  if (!payload) return null;
  const n = (v) => Number(v);
  const c = { t0: nowMs(), by: payload.by ?? null, x0: n(payload.x0), y0: n(payload.y0), x1: n(payload.x1), y1: n(payload.y1) };
  if (![c.x0, c.y0, c.x1, c.y1].every(Number.isFinite)) return null;
  const ce = payload.center;
  c.center = ce && Number.isFinite(ce.x) && Number.isFinite(ce.y) ? { x: ce.x, y: ce.y } : { x: Math.floor((c.x0 + c.x1) / 2), y: Math.floor((c.y0 + c.y1) / 2) };
  casts.push(c);
  while (casts.length > 6) casts.shift();
  listeners.forEach((fn) => fn(c));
  return c;
}
export function onStormCast(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; }

// จอสั่นตอนม่านกลืนพื้นที่ (BoardCanvas เลื่อนภาพทั้งเฟรม · หน่วย = px ตรรกะ) — null = ไม่สั่น
export function stormShakeOffset(now, lowQ) {
  if (lowQ || REDUCED || !casts.length) return null;
  const c = casts[casts.length - 1], t = now - (c.t0 + STORM_T.reveal);
  if (t < 0 || t >= SHAKE_MS) return null;
  const k = 7 * Math.pow(1 - t / SHAKE_MS, 2), w = now / 15;
  return [Math.sin(w * 1.7) * k, Math.cos(w * 2.3) * k * 0.6];
}

// ---------- state → รายการที่วาด (จำม่านที่หายไปไว้เล่นตอนจาง) ----------
//  mem = Map ของ BoardCanvas (หนึ่งอันต่อกระดาน) · units = ตัวพร้อมวาด (rx, ry, isMe) — ใช้ดูว่าผู้ชมอยู่ในม่านไหม
export function syncStorms(mem, list, units, now) {
  const seen = new Set();
  for (const s of Array.isArray(list) ? list : []) {
    if (!s || ![s.x0, s.y0, s.x1, s.y1].every(Number.isFinite)) continue;
    const k = `${s.x0},${s.y0},${s.x1},${s.y1},${s.owner ?? ""}`;
    seen.add(k);
    let e = mem.get(k);
    if (!e) { e = { k, s, seen: now, gone: 0, cast: null }; mem.set(k, e); }
    if (e.gone) { e.gone = 0; e.seen = now - 2000; }
    e.s = s;
    // ฉากร่ายมาก่อนหรือหลัง state ก็ได้ — จับคู่ด้วยกรอบเดียวกันในช่วง 8 วิ
    if (e.cast == null && now - e.seen < 8000) {
      for (let i = casts.length - 1; i >= 0; i--) {
        const c = casts[i];
        if (c.x0 === s.x0 && c.y0 === s.y0 && c.x1 === s.x1 && c.y1 === s.y1 && Math.abs(c.t0 - e.seen) < 8000) { e.cast = c.t0; break; }
      }
    }
  }
  if (!mem.size) return null;
  const out = [];
  for (const [k, e] of mem) {
    if (!seen.has(k) && !e.gone) e.gone = now;
    if (e.gone && now - e.gone > FADE_OUT) { mem.delete(k); continue; }
    const s = e.s;
    // ผู้ชมอยู่ในม่าน / เป็นผู้ร่าย = เห็นข้างใน (open) · คนนอก = โดมเขม่าปิดทึบ (dome)
    let inside = false, caster = false;
    if (Array.isArray(units)) for (const u of units) {
      if (!u || !u.isMe) continue;
      if (s.owner != null && u.id === s.owner) caster = true;
      const ux = Math.round(u.rx), uy = Math.round(u.ry);
      if (ux >= s.x0 && ux <= s.x1 && uy >= s.y0 && uy <= s.y1) inside = true;
    }
    const open = inside || caster;
    // t = เวลานับจากเริ่มกลืนพื้นที่ (ม่านที่ไม่มีฉากร่าย = 0.3 วิหลังเห็นครั้งแรก)
    const t = e.cast != null ? now - (e.cast + STORM_T.reveal) : now - (e.seen + 300);
    const engulf = e.cast != null ? (REDUCED ? 400 : STORM_T.engulf) : 700;
    const fade = e.gone ? 1 - clamp01((now - e.gone) / FADE_OUT) : 1;
    // โดม: เขม่าพุ่งขึ้นจากม่านแล้วปิดยอด หลังม่านขึ้นได้ครึ่งทาง
    const domeK = open ? 0 : eOut(span(t, engulf * 0.35, engulf * 1.25));
    out.push({ s, inside: open, open, dome: !open, domeK, t, fade, grow: eOut(clamp01(t / engulf)), wall: clamp01(t / engulf) <= 0.4 ? 0 : eBack(span(t, engulf * 0.4, engulf)), cast: e.cast != null, seed: (s.x0 * 31 + s.y0 * 17 + s.x1 * 7 + s.y1) | 0 });
  }
  return out.length ? out : null;
}

// กรอบที่วาด (ตัดขอบกระดาน) — มุมช่อง x0..x1+1
function boxOf(s, info) {
  const X0 = Math.max(0, s.x0), Y0 = Math.max(0, s.y0), X1 = Math.min(info.cols, s.x1 + 1), Y1 = Math.min(info.rows, s.y1 + 1);
  if (X1 <= X0 || Y1 <= Y0) return null;
  return { X0, Y0, X1, Y1, cx: (X0 + X1) / 2, cy: (Y0 + Y1) / 2, hw: (X1 - X0) / 2, hh: (Y1 - Y0) / 2 };
}
function rectPath(g, b, z = 0) {
  const a = P(b.X0, b.Y0, z), c = P(b.X1, b.Y0, z), d = P(b.X1, b.Y1, z), e = P(b.X0, b.Y1, z);
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.lineTo(e[0], e[1]); g.closePath();
}

// ---------- ชั้นพื้น (ใต้ไฮไลต์/ตัวละคร) ----------
export function drawStormGround(g, storms, info, now, lowQ) {
  const still = lowQ || REDUCED, tA = still ? 0 : now;
  for (const st of storms) {
    const b = boxOf(st.s, info);
    if (!b || st.grow <= 0 || st.fade <= 0) continue;
    const a = st.fade, maxR = Math.hypot(b.hw, b.hh) + 0.3, R = maxR * st.grow;
    g.save();
    rectPath(g, b); g.clip();
    if (st.grow < 1) { gEllipse(g, b.cx, b.cy, R, 0, 48); g.clip(); }
    // ข้างในมืด (คนนอกม่าน = มืดกว่า)
    rectPath(g, b);
    g.fillStyle = `rgba(16,3,9,${(st.dome ? 0.55 + 0.45 * st.domeK : st.inside ? 0.42 : 0.74) * a})`; g.fill();
    // แสงแดงซึมจากขอบม่านเข้ามา (ตัดด้วยกรอบ — เห็นแค่ครึ่งใน)
    rectPath(g, b); g.lineJoin = "round";
    g.strokeStyle = `rgba(150,12,32,${0.32 * a})`; g.lineWidth = 34; g.stroke();
    g.strokeStyle = `rgba(210,30,48,${0.38 * a})`; g.lineWidth = 12; g.stroke();
    // เกลียวเขม่าบนพื้น 3 แขน หมุนช้าๆ (คนนอก: โดมปิดทับอยู่แล้ว)
    if (!lowQ && !(st.dome && st.domeK >= 1)) {
      const rMax = Math.min(b.hw, b.hh) * 1.15, rot = -tA / 2600;
      g.lineCap = "round";
      for (let arm = 0; arm < 3; arm++) {
        g.beginPath();
        for (let i = 0; i <= 22; i++) {
          const u = i / 22, r = 0.25 + u * rMax, an = rot + arm * TAU / 3 + u * 2.7;
          const p = P(b.cx + Math.cos(an) * r, b.cy + Math.sin(an) * r, 0.01);
          if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
        }
        g.strokeStyle = `rgba(0,0,0,${0.34 * a})`; g.lineWidth = 16; g.stroke();
        g.strokeStyle = `rgba(120,10,24,${0.22 * a})`; g.lineWidth = 3; g.stroke();
      }
    }
    // คลื่นกลืนพื้นที่ (ขอบวงที่กำลังขยาย)
    if (st.grow < 1 && !still) {
      gEllipse(g, b.cx, b.cy, R, 0.02, 48);
      g.strokeStyle = `rgba(255,70,80,${0.85 * (1 - st.grow) * a})`; g.lineWidth = 9; g.stroke();
      g.strokeStyle = `rgba(20,0,6,${0.7 * (1 - st.grow) * a})`; g.lineWidth = 22; g.globalCompositeOperation = "multiply"; g.stroke();
      g.globalCompositeOperation = "source-over";
    }
    g.restore();
    // ขอบทอง/แดงบนพื้น (ราวเวที)
    if (st.wall > 0) {
      g.save(); g.lineJoin = "round";
      rectPath(g, b, 0.01);
      g.strokeStyle = `rgba(90,0,14,${0.9 * a})`; g.lineWidth = 5; g.stroke();
      g.strokeStyle = `rgba(230,180,90,${0.75 * a * Math.min(1, st.wall)})`; g.lineWidth = 1.6; g.stroke();
      g.restore();
    }
  }
}

// ---------- ม่านรอบขอบ (เรียงความลึกร่วมกับตัวละคร/สิ่งกีดขวาง) ----------
//  items = รายการ { d, f } ของ drawFrame — ม่านแต่ละช่วง (1 ช่อง) เป็นรายการแยก ความลึก = กลางช่วงนั้น
export function stormWallItems(items, g, storms, info, now, lowQ) {
  const still = lowQ || REDUCED, tA = still ? 0 : now;
  const folds = lowQ ? 1 : 3;
  for (const st of storms) {
    const b = boxOf(st.s, info);
    if (!b || st.wall <= 0 || st.fade <= 0) continue;
    const a = Math.min(1, st.fade * 1.2);
    const H = WALL_H * st.wall * (0.35 + 0.65 * st.fade) * (st.dome ? 1 - 0.3 * st.domeK : 1);
    const dC = depthOf(b.cx, b.cy);
    // คนนอก: โดมทึบหนึ่งชิ้น ความลึก = ขอบใกล้สุดของกรอบ (วาดทับทุกอย่างข้างใน · ของนอกกรอบที่อยู่หน้ากว่ายังทับโดม)
    //  ม่านด้านข้าง/หน้าเป็นฐานโดม → วาดหลังโดม · ม่านด้านหลังถูกโดมบังอยู่แล้ว (ข้าม)
    let dDome = -Infinity;
    if (st.dome && st.domeK > 0) {
      dDome = Math.max(depthOf(b.X0, b.Y0), depthOf(b.X1, b.Y0), depthOf(b.X1, b.Y1), depthOf(b.X0, b.Y1)) + 0.0005;
      items.push({ d: dDome, f: () => drawDome(g, b, st, now, lowQ) });
      st.domeDepth = dDome; // ป้ายที่วาดทีหลัง (ร้านค้า) เช็คว่าอยู่หลังโดมไหม — behindDome
    }
    // ขอบ 4 ด้าน: จุดเริ่ม → ทิศเดิน · ความยาว (ช่อง)
    const edges = [
      [b.X0, b.Y0, 1, 0, b.X1 - b.X0], [b.X1, b.Y0, 0, 1, b.Y1 - b.Y0],
      [b.X1, b.Y1, -1, 0, b.X1 - b.X0], [b.X0, b.Y1, 0, -1, b.Y1 - b.Y0],
    ];
    let k = 0;
    for (const [sx, sy, dx, dy, len] of edges) {
      for (let i = 0; i < len; i++, k++) {
        const mx = sx + dx * (i + 0.5), my = sy + dy * (i + 0.5), d = depthOf(mx, my);
        const near = d > dC + 0.01, back = d < dC - 0.01;
        if (dDome > -Infinity && back && st.domeK >= 1) continue;
        // ผนังหน้า (ใกล้กล้อง) โปร่งกว่า — คนในม่าน/ผู้ร่ายยังเห็นข้างใน · คนนอกม่าน = ทึบ
        const op = (st.dome ? 1 : near ? (st.inside ? 0.38 : 0.82) : 0.92) * a;
        const kk = k, x0 = sx + dx * i, y0 = sy + dy * i;
        items.push({ d: dDome > -Infinity && !back ? Math.max(d, dDome + 0.001) : d, f: () => drawWallSeg(g, x0, y0, dx, dy, H, op, folds, kk, tA, st.seed) });
      }
    }
  }
}
// ---------- โดมเขม่า (มุมมองคนนอก) ----------
//  ทรงโดมกึ่งเหลี่ยม (superellipse p = 3) คลุมเต็มกรอบ · ขอบเงา = convex hull ของจุดบนผิวที่ฉายลงจอ (โดม + ฐานเป็นรูปนูน)
//  ผิว: ไล่สีมืด + ก้อนเขม่าหมุนวนช้าๆ + เส้นเลือดแดงเรือง + หายใจ (ยุบ/พองเบาๆ) · lowQ = สีล้วน + ขอบแดง
const DOME_P = 2.4;
function hull(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  lo.pop(); up.pop();
  return lo.concat(up);
}
const domeZ = (u, v, Hd) => { const n = Math.pow(Math.pow(Math.abs(u), DOME_P) + Math.pow(Math.abs(v), DOME_P), 1 / DOME_P); return n >= 1 ? 0 : Hd * Math.sqrt(1 - n * n); };
function domeHeight(b, st, tA) { return Math.min(b.hw, b.hh) * 0.95 * st.domeK * (0.35 + 0.65 * st.fade) * (1 + 0.025 * Math.sin(tA / 900)); }
function drawDome(g, b, st, now, lowQ) {
  const still = lowQ || REDUCED, tA = still ? 0 : now, a = st.fade;
  const Hd = domeHeight(b, st, tA);
  if (Hd <= 0.01) return;
  const N = lowQ ? 8 : 12, pts = [];
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const u = -1 + 2 * i / N, v = -1 + 2 * j / N, z = domeZ(u, v, Hd);
    if (z <= 0 && i > 0 && i < N && j > 0 && j < N) continue;
    const p = P(b.cx + u * b.hw, b.cy + v * b.hh, z); pts.push([p[0], p[1]]);
  }
  const hp = hull(pts);
  if (hp.length < 3) return;
  st.hull = hp; // clipOutDomes ใช้ตัดอนุภาคฉากที่วาดทีหลัง
  const path = () => { g.beginPath(); g.moveTo(hp[0][0], hp[0][1]); for (let i = 1; i < hp.length; i++) g.lineTo(hp[i][0], hp[i][1]); g.closePath(); };
  const T = P(b.cx, b.cy, Hd), B = P(b.cx, b.cy, 0), R = Math.max(30, Math.hypot(T[0] - B[0], T[1] - B[1]) * 1.9 + T[2] * Math.max(b.hw, b.hh));
  g.save();
  g.globalAlpha = a;
  path();
  const gr = g.createRadialGradient(T[0] - R * 0.12, T[1] + R * 0.12, R * 0.05, T[0], T[1] + R * 0.3, R);
  gr.addColorStop(0, "#22070c"); gr.addColorStop(0.4, "#0e0305"); gr.addColorStop(0.8, "#060102"); gr.addColorStop(1, "#020001");
  g.fillStyle = gr; g.fill();
  if (!lowQ) {
    g.clip();
    const spr = smokeSprite();
    // ก้อนเขม่าวนบนผิว (ควันเทาอมแดงจางๆ ให้เห็นผิวปั่นป่วน)
    if (spr) for (let i = 0; i < DOME_SOOT.length; i++) {
      const q = DOME_SOOT[i], th = q.a + (tA / 1000) * q.sp, r = q.r;
      const u = Math.cos(th) * r, v = Math.sin(th) * r, z = domeZ(u, v, Hd);
      const p = P(b.cx + u * b.hw, b.cy + v * b.hh, z), s = p[2] * q.sz * Math.max(b.hw, b.hh) * 0.32;
      g.globalAlpha = a * (0.22 + 0.14 * Math.sin(tA / 700 + q.ph));
      g.drawImage(spr, p[0] - s, p[1] - s, s * 2, s * 2);
    }
    // เส้นเลือดแดงเรือง: เส้นแวงคดไปมาจากฐานถึงใกล้ยอด หมุนช้าๆ
    g.globalCompositeOperation = "lighter"; g.lineCap = "round"; g.lineJoin = "round";
    for (let k = 0; k < 6; k++) {
      const base = k * TAU / 6 + tA / 5200 + st.seed, pul = 0.5 + 0.5 * Math.sin(tA / 650 + k * 1.7);
      g.beginPath();
      for (let i = 0; i <= 10; i++) {
        const r = 1 - i / 10 * 0.92, th = base + 0.35 * Math.sin(i * 0.9 + k + tA / 1500);
        const u = Math.cos(th) * r * 0.98, v = Math.sin(th) * r * 0.98, z = domeZ(u, v, Hd) + 0.02;
        const p = P(b.cx + u * b.hw, b.cy + v * b.hh, z);
        if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
      }
      g.globalAlpha = a * (0.05 + 0.08 * pul); g.strokeStyle = "#ff1e3c"; g.lineWidth = 7; g.stroke();
      g.globalAlpha = a * (0.16 + 0.3 * pul); g.strokeStyle = "#d0142e"; g.lineWidth = 1.4; g.stroke();
    }
    g.globalCompositeOperation = "source-over";
  }
  g.restore();
  // ขอบโดมแดงเรือง
  g.save(); g.globalAlpha = a; path(); g.lineJoin = "round";
  g.strokeStyle = "rgba(150,14,34,0.55)"; g.lineWidth = 3; g.stroke();
  g.restore();
}
// ช่อง (x, y) อยู่หลังโดมของคนนอกไหม (ลึกกว่าขอบใกล้สุดของโดม) — ป้ายเหนือช่องนั้นต้องถูกโดมบัง
export function behindDome(storms, x, y) {
  const d = depthOf(x + 0.5, y + 0.5);
  return !!storms && storms.some((st) => st.dome && st.domeK > 0 && st.fade > 0 && Number.isFinite(st.domeDepth) && d < st.domeDepth);
}
// ตัดพื้นที่โดมออกจาก clip (g.save() แล้ว — ผู้เรียก restore เองเมื่อได้ true) · ใช้กับอนุภาคฉากที่วาดหลังตัวละคร
export function clipOutDomes(g, storms) {
  const hs = storms.filter((st) => st.dome && st.hull && st.hull.length > 2 && st.fade > 0);
  if (!hs.length) return false;
  g.save();
  g.beginPath(); g.rect(-1e5, -1e5, 2e5, 2e5);
  for (const st of hs) { const h = st.hull; g.moveTo(h[0][0], h[0][1]); for (let i = 1; i < h.length; i++) g.lineTo(h[i][0], h[i][1]); g.closePath(); }
  g.clip("evenodd");
  return true;
}
const DOME_SOOT = Array.from({ length: 16 }, (_, i) => { const R = rngOf(i * 733 + 5); return { a: R() * TAU, r: 0.15 + 0.75 * R(), sp: (R() < 0.5 ? -1 : 1) * (0.08 + 0.12 * R()), sz: 0.6 + 0.7 * R(), ph: R() * TAU }; });

function drawWallSeg(g, x0, y0, dx, dy, H, op, folds, k, tA, seed) {
  // ไล่สีตามความสูง (กลางช่วง): กำมะหยี่แดงที่ชาย → มืดลง → เขม่าดำจางหายที่ยอด
  const M0 = P(x0 + dx * 0.5, y0 + dy * 0.5, 0), M1 = P(x0 + dx * 0.5, y0 + dy * 0.5, H * 1.08);
  const gr = g.createLinearGradient(M0[0], M0[1], M1[0], M1[1]);
  gr.addColorStop(0, `rgba(176,20,38,${op})`); gr.addColorStop(0.42, `rgba(128,10,26,${op})`);
  gr.addColorStop(0.72, `rgba(34,3,9,${op * 0.92})`); gr.addColorStop(1, `rgba(10,1,4,0)`);
  const top = (i) => H * (1 + 0.08 * Math.sin(tA / 480 + i * 1.3 + seed) + 0.05 * Math.sin(tA / 260 + i * 2.7));
  const n = folds * 2;
  g.beginPath();
  const S = P(x0, y0, 0); g.moveTo(S[0], S[1]);
  const E = P(x0 + dx, y0 + dy, 0); g.lineTo(E[0], E[1]);
  for (let j = n; j >= 0; j--) { const u = j / n, q = P(x0 + dx * u, y0 + dy * u, top(k * n + j)); g.lineTo(q[0], q[1]); }
  g.closePath(); g.fillStyle = gr; g.fill();
  // ลายพับผ้า: เงาแนวตั้งบางๆ (ไม่ทาสีทับทั้งแถบ)
  if (folds > 1) {
    g.lineWidth = 2.2; g.strokeStyle = `rgba(20,0,6,${op * 0.35})`;
    g.beginPath();
    for (let j = 1; j < n; j += 2) {
      const u = j / n, b0 = P(x0 + dx * u, y0 + dy * u, 0.04), b1 = P(x0 + dx * u, y0 + dy * u, top(k * n + j) * 0.7);
      g.moveTo(b0[0], b0[1]); g.lineTo(b1[0], b1[1]);
    }
    g.stroke();
  }
  // ระบายทองที่ชายม่าน
  const A0 = P(x0, y0, 0.06), B0 = P(x0 + dx, y0 + dy, 0.06);
  g.beginPath(); g.moveTo(A0[0], A0[1]); g.lineTo(B0[0], B0[1]);
  g.strokeStyle = `rgba(232,182,92,${op * 0.9})`; g.lineWidth = 2.2; g.stroke();
}

// ---------- อากาศ (ทับทุกอย่าง): เขม่าหมุนวน · ประกายไฟ · ระเบิดเขม่าตอนกลืนพื้นที่ ----------
let puff = null, smoke = null;
function smokeSprite() {
  if (smoke || typeof document === "undefined") return smoke;
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(96,72,78,0.9)"); gr.addColorStop(0.5, "rgba(70,40,48,0.45)"); gr.addColorStop(1, "rgba(60,30,36,0)");
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  smoke = c;
  return smoke;
}
function puffSprite() {
  if (puff || typeof document === "undefined") return puff;
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(10,2,6,0.95)"); gr.addColorStop(0.45, "rgba(18,3,8,0.6)"); gr.addColorStop(0.75, "rgba(40,4,12,0.22)"); gr.addColorStop(1, "rgba(40,4,12,0)");
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  puff = c;
  return puff;
}
const SWIRL = Array.from({ length: 48 }, (_, i) => { const R = rngOf(i * 977 + 13); return { r: Math.sqrt(R()), a: R() * TAU, z: R(), sp: 0.6 + R() * 0.9, sz: 0.45 + R() * 0.75, ph: R() * TAU }; });
const EMBER = Array.from({ length: 22 }, (_, i) => { const R = rngOf(i * 613 + 7); return { p: R(), sp: 1300 + R() * 1400, ph: R(), dx: R() - 0.5 }; });
const WISP = Array.from({ length: 14 }, (_, i) => { const R = rngOf(i * 457 + 3); return { a: R() * TAU, out: 0.4 + 0.6 * R(), sp: 2200 + R() * 1800, ph: R() }; });
const PLUME = Array.from({ length: 20 }, (_, i) => { const R = rngOf(i * 227 + 41); return { p: R(), sp: 1800 + R() * 1600, ph: R() }; });
const BURST = Array.from({ length: 56 }, (_, i) => { const R = rngOf(i * 389 + 29); return { a: R() * TAU, v: 0.55 + R() * 0.7, sz: 0.5 + R() * 0.9, z: R(), d: R() * 0.25 }; });

export function drawStormAir(g, storms, info, now, lowQ) {
  if (lowQ) return;
  const spr = puffSprite();
  if (!spr) return;
  const tA = REDUCED ? 0 : now;
  g.save();
  for (const st of storms) {
    const b = boxOf(st.s, info);
    if (!b || st.grow <= 0 || st.fade <= 0) continue;
    const a = st.fade * st.grow, rIn = Math.min(b.hw, b.hh), H = WALL_H * st.wall;
    // คนนอก: ควันเขม่าม้วนออกจากยอดโดม (แทนเขม่าข้างใน — ข้างในมองไม่เห็น)
    if (st.dome && st.domeK > 0) {
      const Hd = domeHeight(b, st, tA);
      for (let i = 0; i < WISP.length; i++) {
        const q = WISP[i], u = REDUCED ? q.ph : ((tA / q.sp) + q.ph) % 1, rr = (0.15 + 0.9 * u) * q.out * Math.min(b.hw, b.hh) * 0.6;
        const p = P(b.cx + Math.cos(q.a) * rr, b.cy + Math.sin(q.a) * rr, Hd * (0.92 - 0.25 * u * u) + u * 0.9), s = p[2] * (0.45 + 0.8 * u);
        g.globalAlpha = Math.sin(u * Math.PI) * 0.6 * st.fade * st.domeK;
        g.drawImage(spr, p[0] - s, p[1] - s, s * 2, s * 2);
      }
    }
    // เขม่าหมุนวนข้างใน (คนในม่าน = จาง · คนนอก = เฉพาะช่วงก่อนโดมปิด)
    const n = st.dome ? Math.round(SWIRL.length * (1 - st.domeK)) : st.inside ? 22 : SWIRL.length, base = st.inside ? 0.32 : 0.6;
    for (let i = 0; i < n; i++) {
      const q = SWIRL[i], rr = (0.12 + 0.86 * q.r) * rIn * (0.6 + 0.4 * st.grow);
      const an = q.a + (tA / 1000) * q.sp * (i % 2 ? 0.55 : 0.8) * (1.2 - q.r * 0.5);
      const z = 0.2 + q.z * 1.25 + 0.15 * Math.sin(tA / 700 + q.ph);
      const p = P(b.cx + Math.cos(an) * rr, b.cy + Math.sin(an) * rr, z), s = p[2] * q.sz * 1.15;
      g.globalAlpha = base * a * (0.55 + 0.45 * Math.sin(tA / 900 + q.ph * 3) ** 2);
      g.drawImage(spr, p[0] - s, p[1] - s, s * 2, s * 2);
    }
    // ประกายไฟลอยจากยอดม่าน
    if (H > 0.05) {
      g.globalCompositeOperation = "lighter";
      const per = 2 * (b.hw + b.hh) * 2;
      for (const e of EMBER) {
        const u = REDUCED ? e.ph : ((tA / e.sp) + e.ph) % 1;
        let pos = e.p * per, ex, ey;
        const W = b.hw * 2, Hh = b.hh * 2;
        if (pos < W) { ex = b.X0 + pos; ey = b.Y0; } else if ((pos -= W) < Hh) { ex = b.X1; ey = b.Y0 + pos; }
        else if ((pos -= Hh) < W) { ex = b.X1 - pos; ey = b.Y1; } else { pos -= W; ex = b.X0; ey = b.Y1 - Math.min(Hh, pos); }
        const p = P(ex + e.dx * 0.4 * u, ey, H + u * 1.3);
        g.globalAlpha = Math.sin(u * Math.PI) * 0.9 * st.fade;
        g.fillStyle = u < 0.5 ? "#ff6a4a" : "#ff2d3c";
        g.beginPath(); g.arc(p[0], p[1], Math.max(0.8, p[2] * 0.045), 0, TAU); g.fill();
      }
      g.globalCompositeOperation = "source-over";
      // ควันเขม่าลอยขึ้นจากยอดม่าน
      for (let i = 0; i < PLUME.length; i++) {
        const q = PLUME[i], u = REDUCED ? q.ph : ((tA / q.sp) + q.ph) % 1;
        let pos = q.p * per, ex, ey;
        const W = b.hw * 2, Hh = b.hh * 2;
        if (pos < W) { ex = b.X0 + pos; ey = b.Y0; } else if ((pos -= W) < Hh) { ex = b.X1; ey = b.Y0 + pos; }
        else if ((pos -= Hh) < W) { ex = b.X1 - pos; ey = b.Y1; } else { pos -= W; ex = b.X0; ey = b.Y1 - Math.min(Hh, pos); }
        const p = P(ex, ey, H * 0.85 + u * 1.1), s = p[2] * (0.35 + 0.55 * u);
        g.globalAlpha = Math.sin(u * Math.PI) * 0.5 * st.fade;
        g.drawImage(spr, p[0] - s, p[1] - s, s * 2, s * 2);
      }
    }
    // ระเบิดเขม่าตอนกลืนพื้นที่ (เฉพาะม่านที่มีฉากร่าย)
    if (st.cast && !REDUCED && st.t > 0 && st.t < STORM_T.engulf * 1.6) {
      const maxR = Math.hypot(b.hw, b.hh) + 0.6;
      for (const q of BURST) {
        const u = clamp01((st.t / (STORM_T.engulf * 1.5) - q.d) / (1 - q.d));
        if (u <= 0 || u >= 1) continue;
        const rr = maxR * q.v * eOut(u), an = q.a + u * 2.2;
        const p = P(b.cx + Math.cos(an) * rr, b.cy + Math.sin(an) * rr, 0.3 + q.z * 1.6 * u), s = p[2] * q.sz * (0.7 + 1.2 * u);
        g.globalAlpha = Math.pow(1 - u, 1.4) * 0.85 * st.fade;
        g.drawImage(spr, p[0] - s, p[1] - s, s * 2, s * 2);
      }
    }
  }
  g.restore();
}
