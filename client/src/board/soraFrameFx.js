// ============================================================
//  เอฟเฟกต์ร่าง Eagle / Tutle / Orca ของโซระ โอโตสุมิ (ผู้ใช้สั่ง 2026-11-15 — GRID_PLAN §7.7)
//   สีของร่าง (FRAME_PAL — boardFxSora ใช้กับวงล้อ/เงาพุ่ง/ระเบิด) · ชาร์จก่อนพุ่ง (พายุขนนก / น้ำวน) · ของที่ตามทางพุ่ง
//   ครั้งเดียว: soraEagleStorm · soraOrcaStorm · soraShellThrow · soraEncase · soraShellBreak · soraWarp · soraSonar
//   ค้างบนกระดาน: drawSoraShell (กระดองเต่า — board.soraShells)
//  lowQ = จำนวนอนุภาคน้อย ไม่มีชั้นเรือง · ลดการเคลื่อนไหว (REDUCED) = ไม่มีอนุภาคกระเด็น
//  จังหวะต้องตรงกับ characters/sora_otosumi.js (SHELL_LEAD_MS / SHELL_STEP_MS / STORM_HIT_SECONDS)
// ============================================================
import { P, gEllipse, glow, hexPath } from "./boardGeo";
import { REDUCED } from "./boardCamera";
import { easeOut3 } from "./boardFxBasic";
import { taper } from "./boardFxBeam";

export const FRAME_PAL = {
  eagle: { SKY: "235,40,52", SKY_HI: "255,168,150", DEEP: "140,8,22", ICE: "255,226,212" },
  tutle: { SKY: "56,214,108", SKY_HI: "176,255,198", DEEP: "8,112,54", ICE: "226,255,234" },
  orca: { SKY: "30,122,232", SKY_HI: "128,222,255", DEEP: "8,26,96", ICE: "234,250,255" },
};
export const SORA_FRAME_T = { shellLead: 450, shellStep: 80, stormHit: 700, storm: 1900, encase: 650, shellBreak: 1400, warp: 800, sonar: 1800 };
const T = SORA_FRAME_T;
const h01 = (n) => { const s = Math.sin(n * 91.7 + 47.3) * 43758.5453; return s - Math.floor(s); };
const lerp = (a, b, q) => a + (b - a) * q;

// ---------- ขนนก ----------
//  ปลาย a → b บนจอ (ก้านขน) · กว้าง w px · ขนสองข้างโค้งเรียว + ก้านกลางสีอ่อน
function feather(g, a, b, w, fill, rib) {
  const vx = b[0] - a[0], vy = b[1] - a[1], L = Math.hypot(vx, vy);
  if (L < 0.8) return;
  const nx = -vy / L * w, ny = vx / L * w;
  g.beginPath();
  g.moveTo(a[0], a[1]);
  g.quadraticCurveTo(a[0] + vx * 0.35 + nx, a[1] + vy * 0.35 + ny, b[0], b[1]);
  g.quadraticCurveTo(a[0] + vx * 0.55 - nx * 0.8, a[1] + vy * 0.55 - ny * 0.8, a[0], a[1]);
  g.closePath(); g.fillStyle = fill; g.fill();
  if (rib) { g.strokeStyle = rib; g.lineWidth = Math.max(0.7, w * 0.18); g.beginPath(); g.moveTo(a[0] - vx * 0.12, a[1] - vy * 0.12); g.lineTo(b[0], b[1]); g.stroke(); }
}
// ขนนกในโลก: ตำแหน่ง (x, y, z) · ทิศ (dx, dy, dz) ยาว len ช่อง
function featherAt(g, x, y, z, dx, dy, dz, len, a, red) {
  const A = P(x, y, z), B = P(x + dx * len, y + dy * len, z + dz * len);
  const w = Math.max(1.2, A[2] * len * 0.22);
  feather(g, A, B, w, `rgba(${red ? "215,30,45" : "255,236,226"},${a})`, `rgba(255,${red ? "200,190" : "255,255"},${a * 0.9})`);
}

// =================================================================== ชาร์จก่อนพุ่ง (แทนวงล้อหนู)
//  Eagle: ขนนกแดงหมุนเป็นเกลียวรอบตัว เร็วขึ้นเรื่อยๆ + ลมแดงม้วนบนพื้น · Orca: น้ำวนรอบตัว + ครีบน้ำ + ฟองกระเซ็น
//  front = วาดรอบหน้าตัวละคร (จุดที่ใกล้กล้องกว่ากลางตัว) · ระหว่างพุ่งตามตัวไปแล้วจางลง
export function frameWindup(g, e, now, t, Tdur, W, px, py, lowQ, front) {
  const n = Math.max(1, e.size | 0), cx = px + n / 2, cy = py + n / 2, still = lowQ || REDUCED;
  const k = Math.min(1, t / W), out = t > W ? Math.min(1, (t - W) / Math.max(1, Tdur - W)) : 0, A = 1 - out * 0.85;
  const ref = P(cx, cy, 0.6)[2];
  const isF = (pt) => pt[2] >= ref;
  const pal = FRAME_PAL[e.frame] || FRAME_PAL.eagle;
  g.save(); g.lineCap = "round";
  if (!front) {
    gEllipse(g, cx, cy, 0.75 * n, 0.01, 36);
    g.fillStyle = `rgba(${pal.DEEP},${(0.18 + 0.25 * k) * A})`; g.fill();
    if (!lowQ) { g.globalCompositeOperation = "lighter"; const c = P(cx, cy, 0.5); glow(g, c[0], c[1], c[2] * 1.4 * n, pal.SKY, (0.12 + 0.28 * k) * A); g.globalCompositeOperation = "source-over"; }
  }
  const spin = (REDUCED ? 0 : 1) * (0.004 * t + 0.000004 * t * t);
  if (e.frame === "eagle") {
    // ลมแดงม้วนบนพื้น (ครึ่งวง 3 เส้น)
    if (!front) for (let r = 0; r < 3; r++) {
      const rad = (0.45 + r * 0.22) * n, a0 = spin * (1 + r * 0.3) + r * 2.1;
      g.beginPath();
      for (let i = 0; i <= 18; i++) { const th = a0 + i / 18 * Math.PI * 1.3, p = P(cx + Math.cos(th) * rad, cy + Math.sin(th) * rad, 0.04 + r * 0.05); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
      g.strokeStyle = `rgba(${r === 1 ? pal.SKY_HI : pal.SKY},${(0.35 + 0.4 * k) * A})`; g.lineWidth = Math.max(1, ref * 0.035); g.stroke();
    }
    const N = lowQ ? 14 : 34;
    for (let i = 0; i < N; i++) {
      const h = h01(i + 3), th = spin * (1.4 + h) + i * 2.399, rad = (0.55 + 0.35 * h01(i + 8)) * n * (1.1 - 0.25 * k);
      const z = (0.15 + 1.5 * ((h + spin * 0.08) % 1)) * n;
      const x = cx + Math.cos(th) * rad, y = cy + Math.sin(th) * rad, pt = P(x, y, z);
      if (isF(pt) !== front) continue;
      const dx = -Math.sin(th), dy = Math.cos(th);
      featherAt(g, x, y, z, dx, dy, 0.25, 0.46 * n, (0.7 + 0.3 * k) * A, i % 4 !== 0);
    }
  } else {
    // Orca: น้ำวน 3 ชั้น (เกลียวน้ำ) + ครีบน้ำ + ฟอง
    for (let r = 0; r < 3; r++) {
      const rad = (0.5 + r * 0.2) * n, a0 = -spin * (1.2 + r * 0.35) + r * 1.7, z0 = 0.05 + r * 0.22 * k;
      let prev = null;
      for (let i = 0; i <= 26; i++) {
        const th = a0 + i / 26 * Math.PI * 1.6, pt = P(cx + Math.cos(th) * rad, cy + Math.sin(th) * rad, z0 + Math.sin(i / 26 * Math.PI) * 0.25 * k * n);
        if (prev && isF(pt) === front) {
          const u = i / 26;
          g.strokeStyle = `rgba(${u > 0.6 ? pal.SKY_HI : pal.SKY},${(0.3 + 0.55 * k) * A * Math.sin(u * Math.PI)})`;
          g.lineWidth = Math.max(1, ref * (0.05 + 0.03 * r) * Math.sin(u * Math.PI));
          g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(pt[0], pt[1]); g.stroke();
        }
        prev = pt;
      }
    }
    // ครีบวาฬโผล่หมุนรอบตัว
    const fth = -spin * 1.1, fx = cx + Math.cos(fth) * 0.72 * n, fy = cy + Math.sin(fth) * 0.72 * n, fb = P(fx, fy, 0.05);
    if (isF(fb) === front && k > 0.2) {
      const tip = P(fx - Math.sin(fth) * 0.1, fy + Math.cos(fth) * 0.1, (0.35 + 0.35 * k) * n), back = P(fx + Math.sin(fth) * 0.22 * n, fy - Math.cos(fth) * 0.22 * n, 0.05);
      g.beginPath(); g.moveTo(fb[0], fb[1]); g.quadraticCurveTo(tip[0] - 2, tip[1] + 4, tip[0], tip[1]); g.lineTo(back[0], back[1]); g.closePath();
      g.fillStyle = `rgba(16,22,40,${0.9 * A})`; g.fill();
      g.strokeStyle = `rgba(${pal.SKY_HI},${0.7 * A})`; g.lineWidth = 1.2; g.stroke();
    }
    if (front && !still) {
      for (let j = 0; j < 14; j++) {
        const ph = (t / 420 + j / 14) % 1, th = j * 2.4 - spin, rad = (0.5 + ph * 0.6) * n;
        const p = P(cx + Math.cos(th) * rad, cy + Math.sin(th) * rad, 0.1 + 1.1 * ph * (1 - ph) * n);
        g.fillStyle = `rgba(${j % 3 ? pal.SKY_HI : "255,255,255"},${(1 - ph) * k * A})`;
        g.beginPath(); g.arc(p[0], p[1], Math.max(0.8, p[2] * 0.03 * (1 - ph * 0.5)), 0, 7); g.fill();
      }
    }
  }
  if (front) {
    const fl = Math.max(0, (t - (W - 260)) / 260);
    if (fl > 0 && fl < 1) { g.globalCompositeOperation = "lighter"; const c = P(cx, cy, 0.6 * n); glow(g, c[0], c[1], c[2] * (0.8 + fl) * n, pal.ICE, 0.7 * Math.sin(fl * Math.PI)); }
  }
  g.restore();
}

// =================================================================== ของที่ตามทางพุ่ง
//  at(f) = ตำแหน่งกลางตัวบนทาง (หน่วยช่อง) ที่ f ช่อง · head/tail = ช่วงหาง · fade 0..1
export function frameDashExtra(g, e, now, lowQ, at, head, tail, fade, sz) {
  if (REDUCED) return;
  const pal = FRAME_PAL[e.frame];
  if (!pal) return;
  const N = lowQ ? 6 : 16;
  g.save();
  for (let i = 0; i < N; i++) {
    const f = tail + (head - tail) * (i / N), [x, y] = at(Math.max(0, f)), age = (head - f) / Math.max(0.01, head - tail + 0.01);
    const jx = (h01(i + 11) - 0.5) * 0.7 * sz, jy = (h01(i + 17) - 0.5) * 0.7 * sz;
    if (e.frame === "eagle") {
      const z = (0.3 + 0.9 * h01(i + 4)) * sz * (1 - age * 0.6), th = now / 260 + i * 1.7;
      featherAt(g, x + jx, y + jy, z, Math.cos(th), Math.sin(th), -0.35, 0.26 * sz, 0.85 * fade * (1 - age * 0.7), i % 3 !== 0);
    } else {
      const z = 0.05 + 0.9 * age * (1 - age) * 2 * sz * h01(i + 2), p = P(x + jx, y + jy, z);
      g.fillStyle = `rgba(${i % 2 ? pal.SKY_HI : "255,255,255"},${0.85 * fade * (1 - age * 0.8)})`;
      g.beginPath(); g.arc(p[0], p[1], Math.max(1, p[2] * 0.035), 0, 7); g.fill();
      if (i % 4 === 0) { g.strokeStyle = `rgba(${pal.SKY_HI},${0.5 * fade * (1 - age)})`; g.lineWidth = 1.2; gEllipse(g, x, y, (0.2 + age * 0.45) * sz, 0.02, 20); g.stroke(); }
    }
  }
  g.restore();
}

// =================================================================== ครั้งเดียว
export const SORA_FRAME_FX_DUR = {
  soraEagleStorm: T.storm, soraOrcaStorm: T.storm, soraShellThrow: 2400, soraEncase: T.encase, soraShellBreak: T.shellBreak, soraWarp: T.warp, soraSonar: T.sonar,
};
export const isSoraFrameFx = (k) => k in SORA_FRAME_FX_DUR;
export const shellThrowDur = (e) => T.shellLead + Math.max(1, e.flight | 0) * T.shellStep + 420;
export function soraFrameFx(g, e, now, lowQ) {
  const t = now - e.t0;
  if (t < 0) return;
  if (e.kind === "soraEagleStorm") eagleStorm(g, e, t, now, lowQ);
  else if (e.kind === "soraOrcaStorm") orcaStorm(g, e, t, now, lowQ);
  else if (e.kind === "soraShellThrow") shellThrow(g, e, t, now, lowQ);
  else if (e.kind === "soraEncase") encase(g, e, t, lowQ);
  else if (e.kind === "soraShellBreak") shellBreak(g, e, t, lowQ);
  else if (e.kind === "soraWarp") warpFx(g, e, t, lowQ);
  else if (e.kind === "soraSonar") sonar(g, e, t, lowQ);
}

// ---------- Eagle Separade: รวบ → พายุขนนกแดง ----------
function eagleStorm(g, e, t, now, lowQ) {
  if (t > T.storm) return;
  const pal = FRAME_PAL.eagle, n = Math.max(1, e.size | 0), cx = e.x + n / 2, cy = e.y + n / 2, R = (e.r || 2) + n / 2;
  const A = t > T.storm - 400 ? (T.storm - t) / 400 : 1, still = lowQ || REDUCED;
  g.save(); g.lineCap = "round";
  // พื้น: วงลมแดงหมุน + เงาเข้ม
  gEllipse(g, cx, cy, R * (0.6 + 0.4 * Math.min(1, t / 400)), 0.01, 48); g.fillStyle = `rgba(60,4,10,${0.35 * A})`; g.fill();
  for (let r = 0; r < (lowQ ? 2 : 4); r++) {
    const rad = R * (0.35 + r * 0.2), a0 = t / (240 - r * 30) + r * 1.9;
    g.beginPath();
    for (let i = 0; i <= 22; i++) { const th = a0 + i / 22 * Math.PI * 1.25, p = P(cx + Math.cos(th) * rad, cy + Math.sin(th) * rad, 0.03); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
    g.strokeStyle = `rgba(${r % 2 ? pal.SKY_HI : pal.SKY},${0.6 * A})`; g.lineWidth = Math.max(1.2, P(cx, cy)[2] * 0.04); g.stroke();
  }
  // ช่วงรวบ: เส้นลมจากที่เดิมของคนที่ถูกรวบพุ่งเข้าหาเป้า
  if (t < 700 && Array.isArray(e.pulled)) for (const m of e.pulled) {
    if (!m || !m.from) continue;
    const k = Math.min(1, t / 600), fx = m.from.x + 0.5, fy = m.from.y + 0.5;
    for (let s = 0; s < 3; s++) {
      const o = (s - 1) * 0.18, a = P(lerp(fx, cx, k * 0.6) + o, lerp(fy, cy, k * 0.6) + o, 0.5), b = P(lerp(fx, cx, Math.min(1, k * 1.2)) + o, lerp(fy, cy, Math.min(1, k * 1.2)) + o, 0.5);
      g.strokeStyle = `rgba(${pal.SKY_HI},${0.75 * (1 - k * 0.6)})`; g.lineWidth = Math.max(1, a[2] * 0.04); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
  }
  // เสาพายุ: ขนนกหมุนเป็นเกลียวขึ้นฟ้า (ช่วงท้ายกระจายออก)
  const rise = Math.min(1, Math.max(0, (t - 150) / 500)), burst = Math.max(0, (t - 1300) / 600);
  if (!lowQ) { g.globalCompositeOperation = "lighter"; const c = P(cx, cy, 1.2); glow(g, c[0], c[1], c[2] * R * 0.9, pal.SKY, 0.35 * rise * A); g.globalCompositeOperation = "source-over"; }
  const N = lowQ ? 22 : 64;
  for (let i = 0; i < N; i++) {
    const h = h01(i + 1), lvl = (h + t / 1600) % 1, th = t / (150 + 120 * h01(i + 9)) + i * 2.399;
    const rad = (0.35 + lvl * 0.9) * R * (0.55 + 0.45 * rise) * (1 + burst * 1.4);
    const z = (0.1 + lvl * 3.2) * rise + burst * (1 - lvl) * 0.5;
    const x = cx + Math.cos(th) * rad, y = cy + Math.sin(th) * rad;
    featherAt(g, x, y, z, -Math.sin(th), Math.cos(th), 0.35, 0.34, A * (0.55 + 0.45 * h) * (1 - burst * 0.8), i % 5 !== 0);
  }
  // ระเบิดตอนดาเมจลง (stormHit)
  const hb = t - T.stormHit;
  if (hb > 0 && hb < 700) {
    const k = hb / 700;
    if (hb < 200) { g.globalCompositeOperation = "lighter"; const c = P(cx, cy, 0.8); glow(g, c[0], c[1], c[2] * R * 1.2, pal.ICE, 0.95 * (1 - hb / 200)); g.globalCompositeOperation = "source-over"; }
    g.strokeStyle = `rgba(${pal.SKY_HI},${0.9 * (1 - k)})`; g.lineWidth = Math.max(1.5, P(cx, cy)[2] * 0.09 * (1 - k));
    gEllipse(g, cx, cy, R * (0.4 + easeOut3(k) * 1.1), 0.05, 48); g.stroke();
    if (!still) for (let d = 0; d < 24; d++) {
      const th = h01(d + 40) * Math.PI * 2, sp = (1 + h01(d + 41) * 1.6) * R * easeOut3(k);
      featherAt(g, cx + Math.cos(th) * sp, cy + Math.sin(th) * sp, 0.3 + 1.6 * k * (1 - k) * 2, Math.cos(th + 1), Math.sin(th + 1), -0.2, 0.3, 0.9 * (1 - k), d % 3 !== 0);
    }
  }
  g.restore();
  void now;
}

// ---------- Orca Separade: คลื่นน้ำวิ่งตามแนว → เสาน้ำทุกช่อง ----------
function orcaStorm(g, e, t, now, lowQ) {
  if (t > T.storm || !Array.isArray(e.tiles) || !e.tiles.length) return;
  const pal = FRAME_PAL.orca, tiles = e.tiles, nT = tiles.length, still = lowQ || REDUCED;
  const A = t > T.storm - 400 ? (T.storm - t) / 400 : 1;
  const crest = Math.min(nT, (t / T.stormHit) * nT);
  g.save(); g.lineCap = "round";
  // พื้นน้ำตามแนว
  tiles.forEach((tl, i) => {
    const arrive = i / nT * T.stormHit, age = t - arrive;
    if (age < 0) return;
    const k = Math.min(1, age / 250);
    gEllipse(g, tl.x + 0.5, tl.y + 0.5, 0.55 * k, 0.01, 24); g.fillStyle = `rgba(${pal.DEEP},${0.45 * A})`; g.fill();
    g.strokeStyle = `rgba(${pal.SKY_HI},${0.5 * A * (1 - Math.min(1, age / 900))})`; g.lineWidth = 1.4;
    gEllipse(g, tl.x + 0.5, tl.y + 0.5, 0.3 + Math.min(1, age / 900) * 0.45, 0.02, 24); g.stroke();
  });
  // ยอดคลื่นวิ่งนำ
  if (t < T.stormHit + 100) {
    const f = Math.min(nT - 1, crest), i = Math.floor(f), qq = f - i, a = tiles[i], b = tiles[Math.min(nT - 1, i + 1)];
    const x = lerp(a.x, b.x, qq) + 0.5, y = lerp(a.y, b.y, qq) + 0.5;
    taper(g, P(x, y, 0), P(x, y, 1.1), 0.9, `rgba(${pal.SKY},${0.8 * A})`);
    taper(g, P(x, y, 0.5), P(x, y, 1.25), 0.35, `rgba(255,255,255,${0.85 * A})`);
  }
  // เสาน้ำ/พายุน้ำแต่ละช่องหลังยอดคลื่นผ่าน
  tiles.forEach((tl, i) => {
    const age = t - (i / nT * T.stormHit + 80);
    if (age < 0 || age > 1100) return;
    const k = age / 1100, up = Math.sin(Math.min(1, age / 350) * Math.PI / 2), cx = tl.x + 0.5, cy = tl.y + 0.5;
    const hgt = (1.4 + h01(i + 3) * 0.8) * up * (1 - k * 0.6);
    for (let s = 0; s < (lowQ ? 1 : 3); s++) {
      const th = now / 160 + s * 2.1 + i, ox = Math.cos(th) * 0.18, oy = Math.sin(th) * 0.18;
      taper(g, P(cx + ox, cy + oy, 0), P(cx - ox * 0.5, cy - oy * 0.5, hgt), 0.55 - s * 0.12, `rgba(${s === 2 ? "255,255,255" : s ? pal.SKY_HI : pal.SKY},${(0.75 - s * 0.15) * (1 - k) * A})`);
    }
    if (!still) for (let d = 0; d < 6; d++) {
      const th = h01(i * 7 + d) * Math.PI * 2, sp = k * (0.6 + h01(d + i) * 0.7), z = hgt * 0.8 + 2.2 * k - 4 * k * k;
      if (z < 0) continue;
      const p = P(cx + Math.cos(th) * sp, cy + Math.sin(th) * sp, z);
      g.fillStyle = `rgba(${d % 2 ? pal.SKY_HI : "255,255,255"},${(1 - k) * A})`; g.beginPath(); g.arc(p[0], p[1], Math.max(1, p[2] * 0.035), 0, 7); g.fill();
    }
  });
  // น้ำวนใหญ่ที่เป้าแรก
  const hb = t - T.stormHit, c = tiles[0];
  if (hb > -150) {
    const k = Math.max(0, Math.min(1, (hb + 150) / 1000));
    for (let r = 0; r < (lowQ ? 2 : 4); r++) {
      const rad = (0.3 + r * 0.25) * (0.6 + k), a0 = -now / (200 + r * 40) + r;
      g.beginPath();
      for (let i = 0; i <= 20; i++) { const th = a0 + i / 20 * Math.PI * 1.5, p = P(c.x + 0.5 + Math.cos(th) * rad, c.y + 0.5 + Math.sin(th) * rad, 0.04 + r * 0.04); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
      g.strokeStyle = `rgba(${r % 2 ? pal.SKY_HI : "255,255,255"},${0.75 * A * (1 - k * 0.5)})`; g.lineWidth = Math.max(1.2, P(c.x, c.y)[2] * 0.04); g.stroke();
    }
    if (hb > 0 && hb < 220 && !lowQ) { g.globalCompositeOperation = "lighter"; const s = P(c.x + 0.5, c.y + 0.5, 0.8); glow(g, s[0], s[1], s[2] * 1.8, pal.ICE, 0.9 * (1 - hb / 220)); }
  }
  g.restore();
}

// ---------- กระดองเต่า ----------
//  โดม: หกเหลี่ยมฐานกว้าง → หกเหลี่ยมยอดแคบ · กรอบเงิน + กระจกเขียว (แบบในคลิป) · open 0..1 = แผงปิดเข้าหาตัว
function dome(g, cx, cy, n, sc, alpha, lowQ, now) {
  const pal = FRAME_PAL.tutle, R0 = 0.56 * n * sc, R1 = 0.3 * n * sc, H = 1.3 * n * sc;
  const ref = P(cx, cy, H * 0.4)[2];
  const bot = [], top = [];
  for (let i = 0; i < 6; i++) {
    const th = i / 6 * Math.PI * 2 + Math.PI / 6;
    bot.push(P(cx + Math.cos(th) * R0, cy + Math.sin(th) * R0, 0.02));
    top.push(P(cx + Math.cos(th) * R1, cy + Math.sin(th) * R1, H));
  }
  const panels = [];
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6, quad4 = [bot[i], bot[j], top[j], top[i]];
    panels.push({ pts: quad4, d: (bot[i][2] + bot[j][2]) / 2 });
  }
  panels.sort((a, b) => a.d - b.d);
  g.save(); g.lineJoin = "round";
  for (const pn of panels) {
    const front = pn.d >= ref;
    g.beginPath(); pn.pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
    const gr = g.createLinearGradient(pn.pts[0][0], pn.pts[0][1], pn.pts[2][0], pn.pts[2][1]);
    gr.addColorStop(0, `rgba(${pal.SKY},${(front ? 0.34 : 0.2) * alpha})`); gr.addColorStop(1, `rgba(${pal.SKY_HI},${(front ? 0.48 : 0.26) * alpha})`);
    g.fillStyle = gr; g.fill();
    g.strokeStyle = `rgba(214,222,232,${(front ? 0.95 : 0.55) * alpha})`; g.lineWidth = Math.max(1.4, ref * 0.045); g.stroke();
    // ลายผลึกในแผง
    if (front && !lowQ) {
      const m = [(pn.pts[0][0] + pn.pts[2][0]) / 2, (pn.pts[0][1] + pn.pts[2][1]) / 2];
      g.strokeStyle = `rgba(${pal.ICE},${0.45 * alpha})`; g.lineWidth = 1;
      g.beginPath(); g.moveTo(pn.pts[0][0], pn.pts[0][1]); g.lineTo(m[0], m[1]); g.lineTo(pn.pts[2][0], pn.pts[2][1]); g.stroke();
    }
  }
  // ฝาบน
  g.beginPath(); top.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
  g.fillStyle = `rgba(190,200,214,${0.92 * alpha})`; g.fill(); g.strokeStyle = `rgba(240,246,255,${alpha})`; g.lineWidth = Math.max(1.2, ref * 0.03); g.stroke();
  const tc = P(cx, cy, H);
  g.globalCompositeOperation = "lighter";
  glow(g, tc[0], tc[1], Math.max(2, ref * 0.22 * n), pal.SKY_HI, (0.5 + 0.25 * Math.sin(now / 300)) * alpha);
  g.restore();
}
// กระดองบนพื้นเฉยๆ (ยังไม่ได้ครอบใคร): กระดองเต่าเตี้ย ลายหกเหลี่ยมกระจกเขียว ขอบเงิน
function shellToken(g, cx, cy, z, rot, sc, alpha, lowQ) {
  const pal = FRAME_PAL.tutle, c = P(cx, cy, z), r = c[2] * 0.36 * sc;
  if (r < 1) return;
  g.save();
  g.translate(c[0], c[1]); g.rotate(rot); g.scale(1, 0.62);
  g.beginPath(); g.ellipse(0, 0, r * 1.15, r, 0, 0, Math.PI * 2);
  g.fillStyle = `rgba(200,208,220,${alpha})`; g.fill();
  g.beginPath(); g.ellipse(0, -r * 0.1, r, r * 0.86, 0, 0, Math.PI * 2);
  const gr = g.createRadialGradient(-r * 0.2, -r * 0.4, 0, 0, 0, r);
  gr.addColorStop(0, `rgba(${pal.ICE},${alpha})`); gr.addColorStop(0.4, `rgba(${pal.SKY},${alpha})`); gr.addColorStop(1, `rgba(${pal.DEEP},${alpha})`);
  g.fillStyle = gr; g.fill();
  g.strokeStyle = `rgba(235,242,250,${0.9 * alpha})`; g.lineWidth = Math.max(1, r * 0.08);
  hexPath(g, 0, -r * 0.1, r * 0.34); g.stroke();
  if (!lowQ) for (let i = 0; i < 6; i++) { const th = i / 6 * Math.PI * 2; hexPath(g, Math.cos(th) * r * 0.62, -r * 0.1 + Math.sin(th) * r * 0.55, r * 0.22); g.stroke(); }
  g.restore();
}
// ค้างบนกระดาน: sh { x, y (ช่อง/มุมบนซ้ายของตัว), size, on } — on = ครอบคนอยู่ (วาดโดมรอบตัว) · ไม่มี = กระดองวางบนพื้น
export function drawSoraShell(g, sh, now, lowQ) {
  const n = Math.max(1, sh.size | 0), cx = sh.x + n / 2, cy = sh.y + n / 2;
  if (sh.on) {
    gEllipse(g, cx, cy, 0.6 * n, 0.01, 30); g.fillStyle = "rgba(10,40,22,0.35)"; g.fill();
    dome(g, cx, cy, n, 1, 1, lowQ, now);
    return;
  }
  gEllipse(g, cx, cy, 0.42, 0.01, 24); g.fillStyle = "rgba(0,0,0,0.3)"; g.fill();
  shellToken(g, cx, cy, 0.12 + 0.03 * Math.sin(now / 400), 0, 1, 1, lowQ);
  if (!lowQ) { g.save(); g.globalCompositeOperation = "lighter"; const c = P(cx, cy, 0.2); glow(g, c[0], c[1], c[2] * 0.6, FRAME_PAL.tutle.SKY, 0.25 + 0.12 * Math.sin(now / 350)); g.restore(); }
}

// โยนกระดอง: ง้างเหนือหัว (shellLead) → บินไปตามแนว (ต่ำ หมุน + ฝุ่น) หรือโยนโค้ง → ลงพื้น/ชนแล้วจาง
function shellThrow(g, e, t, now, lowQ) {
  const from = e.from, to = e.hit || e.to;
  if (!from || !to) return;
  const flight = Math.max(1, Math.abs(to.x - from.x) + Math.abs(to.y - from.y)), fT = flight * T.shellStep, end = T.shellLead + fT;
  if (t > end + 420) return;
  const pal = FRAME_PAL.tutle;
  g.save();
  if (t < T.shellLead) {
    const k = t / T.shellLead, c = P(from.x + 0.5, from.y + 0.5, 1.5);
    if (!lowQ) { g.globalCompositeOperation = "lighter"; glow(g, c[0], c[1], c[2] * 0.7 * k, pal.SKY, 0.6 * k); g.globalCompositeOperation = "source-over"; }
    shellToken(g, from.x + 0.5, from.y + 0.5, 1.5, REDUCED ? 0 : now / 60, 0.4 + 0.6 * easeOut3(k), 1, lowQ);
  } else if (t < end) {
    const q = (t - T.shellLead) / fT, x = lerp(from.x, to.x, q) + 0.5, y = lerp(from.y, to.y, q) + 0.5;
    const z = e.arc ? 1.5 * (1 - q) + 0.3 * q + flight * 0.35 * Math.sin(q * Math.PI) : 1.5 - 1.15 * Math.min(1, q * 3);
    // หางแสงเขียว
    for (let s = 1; s <= 5; s++) {
      const qq = Math.max(0, q - s * 0.05), xx = lerp(from.x, to.x, qq) + 0.5, yy = lerp(from.y, to.y, qq) + 0.5;
      const zz = e.arc ? 1.5 * (1 - qq) + 0.3 * qq + flight * 0.35 * Math.sin(qq * Math.PI) : 1.5 - 1.15 * Math.min(1, qq * 3);
      const p = P(xx, yy, zz);
      g.fillStyle = `rgba(${pal.SKY_HI},${0.35 * (1 - s / 6)})`; g.beginPath(); g.arc(p[0], p[1], Math.max(1, p[2] * 0.14 * (1 - s / 7)), 0, 7); g.fill();
    }
    if (!e.arc && !REDUCED && q > 0.3) for (let d = 0; d < 6; d++) {
      const p = P(x - (to.x - from.x) / flight * 0.3 * d + (h01(d) - 0.5) * 0.3, y - (to.y - from.y) / flight * 0.3 * d + (h01(d + 3) - 0.5) * 0.3, 0.05 + 0.1 * h01(d + 7));
      g.fillStyle = `rgba(190,180,160,${0.4 * (1 - d / 6)})`; g.beginPath(); g.arc(p[0], p[1], Math.max(1, p[2] * 0.05), 0, 7); g.fill();
    }
    shellToken(g, x, y, z, REDUCED ? 0 : now / 45, 1, 1, lowQ);
  } else {
    // ลงพื้น/ชน: วงฝุ่น + แฟลชเขียว
    const k = (t - end) / 420, x = to.x + 0.5, y = to.y + 0.5;
    g.strokeStyle = `rgba(${pal.SKY_HI},${0.85 * (1 - k)})`; g.lineWidth = Math.max(1.2, P(x, y)[2] * 0.06 * (1 - k));
    gEllipse(g, x, y, 0.3 + k * 0.9, 0.03, 28); g.stroke();
    if (!e.hit) shellToken(g, x, y, 0.12, 0, 1, 1 - k, lowQ);
    if (k < 0.4 && !lowQ) { g.globalCompositeOperation = "lighter"; const c = P(x, y, 0.4); glow(g, c[0], c[1], c[2] * 1.1, pal.ICE, 0.8 * (1 - k / 0.4)); }
  }
  g.restore();
}
// ครอบ: โดมใหญ่หุบลงมาครอบ + แฟลชเขียว + วงกระแทก
function encase(g, e, t, lowQ) {
  if (t > T.encase || !e.at) return;
  const pal = FRAME_PAL.tutle, k = t / T.encase, cx = e.at.x + 0.5, cy = e.at.y + 0.5;
  const sc = 1 + 0.7 * (1 - easeOut3(Math.min(1, k * 1.6)));
  g.save();
  dome(g, cx, cy, 1, sc, Math.min(1, k * 3) * (1 - Math.max(0, k - 0.7) / 0.3), lowQ, t);
  g.strokeStyle = `rgba(${pal.SKY_HI},${0.9 * (1 - k)})`; g.lineWidth = Math.max(1.5, P(cx, cy)[2] * 0.07 * (1 - k));
  gEllipse(g, cx, cy, 0.5 + easeOut3(k) * 1.1, 0.03, 32); g.stroke();
  if (k > 0.25 && k < 0.55 && !lowQ) { g.globalCompositeOperation = "lighter"; const c = P(cx, cy, 0.7); glow(g, c[0], c[1], c[2] * 1.6, pal.ICE, 0.9 * (1 - (k - 0.25) / 0.3)); }
  g.restore();
}
// กระดองแตก: แฟลช → เศษกระจกเขียวกระจาย + กรอบเงินหลุด + วงกระแทก + ประกาย
function shellBreak(g, e, t, lowQ) {
  if (t > T.shellBreak || !e.at) return;
  const pal = FRAME_PAL.tutle, k = t / T.shellBreak, cx = e.at.x + 0.5, cy = e.at.y + 0.5, s = t / 1000;
  g.save(); g.lineCap = "round";
  if (t < 220) { g.globalCompositeOperation = "lighter"; const c = P(cx, cy, 0.7); glow(g, c[0], c[1], c[2] * 2.2, pal.ICE, 1 - t / 220); g.globalCompositeOperation = "source-over"; }
  for (const d0 of lowQ ? [0] : [0, 120]) {
    const r = (t - d0) / 600;
    if (r <= 0 || r >= 1) continue;
    g.strokeStyle = `rgba(${pal.SKY_HI},${0.9 * (1 - r)})`; g.lineWidth = Math.max(1.5, P(cx, cy)[2] * 0.08 * (1 - r));
    gEllipse(g, cx, cy, 0.4 + easeOut3(r) * 1.8, 0.03, 40); g.stroke();
  }
  const N = lowQ ? 14 : 34;
  for (let d = 0; d < N; d++) {
    const th = h01(d + 60) * Math.PI * 2, sp = 1.2 + h01(d + 61) * 1.8, vz = 2.5 + h01(d + 62) * 3, z = 0.6 + vz * s - 7 * s * s;
    if (z < -0.05 && !REDUCED) continue;
    const x = cx + Math.cos(th) * sp * s * (REDUCED ? 0.4 : 1), y = cy + Math.sin(th) * sp * s * (REDUCED ? 0.4 : 1);
    const a = P(x, y, Math.max(0, z)), rot = th + s * (6 + d), sz = a[2] * (0.08 + 0.07 * h01(d + 63));
    g.save(); g.translate(a[0], a[1]); g.rotate(rot);
    g.beginPath(); g.moveTo(-sz, -sz * 0.4); g.lineTo(sz * 0.6, -sz * 0.7); g.lineTo(sz, sz * 0.5); g.lineTo(-sz * 0.3, sz * 0.6); g.closePath();
    g.fillStyle = d % 4 === 0 ? `rgba(206,214,226,${1 - k})` : `rgba(${d % 2 ? pal.SKY : pal.SKY_HI},${0.85 * (1 - k)})`; g.fill();
    g.restore();
  }
  g.restore();
}
// วาร์ป: วงหกเหลี่ยมเขียวหดที่จุดเดิม + ลำแสงขึ้น → วงขยายที่จุดใหม่
function warpFx(g, e, t, lowQ) {
  if (t > T.warp || !e.from || !e.to) return;
  const pal = FRAME_PAL.tutle, k = t / T.warp;
  g.save();
  for (const [pt, out] of [[e.from, false], [e.to, true]]) {
    const cx = pt.x + 0.5, cy = pt.y + 0.5, q = out ? Math.max(0, (k - 0.25) / 0.75) : Math.min(1, k / 0.6);
    if (q <= 0 || q >= 1) continue;
    const r = out ? 0.2 + easeOut3(q) * 0.9 : 0.9 * (1 - q) + 0.1;
    for (let i = 0; i < 2; i++) { g.strokeStyle = `rgba(${i ? pal.ICE : pal.SKY},${0.9 * (1 - q * 0.7)})`; g.lineWidth = Math.max(1.2, P(cx, cy)[2] * (i ? 0.02 : 0.05)); gEllipse(g, cx, cy, r * (1 - i * 0.15), 0.03, 6); g.stroke(); }
    taper(g, P(cx, cy, 0), P(cx, cy, 2.4 * (1 - q * 0.5)), 0.5 * (1 - q), `rgba(${pal.SKY_HI},${0.65 * (1 - q)})`);
    if (!lowQ) { g.globalCompositeOperation = "lighter"; const c = P(cx, cy, 0.6); glow(g, c[0], c[1], c[2] * 1.2, pal.ICE, 0.7 * Math.sin(q * Math.PI)); g.globalCompositeOperation = "source-over"; }
  }
  g.restore();
}
// Orca Echo: คลื่นโซนาร์วงซ้อนแผ่ออกจากตัว (เห็นเฉพาะโซระ)
function sonar(g, e, t, lowQ) {
  if (t > T.sonar || !e.at) return;
  const pal = FRAME_PAL.orca, cx = e.at.x + 0.5, cy = e.at.y + 0.5;
  g.save();
  for (const d0 of lowQ ? [0, 400] : [0, 300, 600, 900]) {
    const r = (t - d0) / 900;
    if (r <= 0 || r >= 1) continue;
    g.strokeStyle = `rgba(${pal.SKY_HI},${0.8 * (1 - r)})`; g.lineWidth = Math.max(1.2, P(cx, cy)[2] * 0.035 * (1 - r * 0.5));
    gEllipse(g, cx, cy, 0.4 + easeOut3(r) * 9, 0.04, 72); g.stroke();
  }
  if (t < 300 && !lowQ) { g.globalCompositeOperation = "lighter"; const c = P(cx, cy, 0.6); glow(g, c[0], c[1], c[2] * 1.4, pal.ICE, 0.8 * (1 - t / 300)); }
  g.restore();
}
