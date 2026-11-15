// ============================================================
//  ภาพของสนาม Eos — รถ · มอน (เดินนุ่ม/หันหน้า/สัตว์ยักษ์) · หีบสมบัติ · กำแพงร้าว/ซาก · ยานลงจอด · เส้นร่วมแรง
//  แยกออกจาก ./stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · stage6.js ยังส่งออกชื่อเดิมครบ
//  ⚠️ ห้ามเรียกของจาก ./index ตอนโหลดไฟล์ (index import stage6 — วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { P, depthOf } from "../boardGeo";
import { fxT, fxStart, fxSubT } from "./index";
import { drawVitalBar } from "../boardDraw";
import { TAU, hash, ease, fx, DAEMON_MS, img, glowAt, poly, box, LAST_FD } from "./eosBase";
import { lastFx } from "./eosTownArt";

// =================================================================== ตำแหน่งนุ่ม (รถ/ปีศาจเลื่อนไปที่ใหม่)
export const MOVES = new Map(); // id → { fx, fy, tx, ty, t0, ms, path }
//  start = เวลาเริ่มเดิน (ตามอนทีละตัว — ยังไม่ถึงคิว = ยืนที่เดิม) · ไม่ส่ง = เริ่มเดี๋ยวนี้
export function smooth(id, x, y, now, ms, path = null, start = null) {
  let m = MOVES.get(id);
  if (!m) { m = { fx: x, fy: y, tx: x, ty: y, t0: -1e9, ms, path: null }; MOVES.set(id, m); }
  if (m.tx !== x || m.ty !== y) {
    const cur = posOf(m, now);
    Object.assign(m, { fx: cur.x, fy: cur.y, tx: x, ty: y, t0: start != null ? Math.max(now - 50, start) : now, ms, path: path && path.length > 1 ? path : null });
  }
  return posOf(m, now);
}
// ปีศาจ (fd.daemons): ทางเดินจาก mob_move (ตามคิว) หรือ daemon_move เดิม → [ms, path, start]
export function daemonWalk(fd, id, now) {
  const w = mobWalk(fd, id, now, DAEMON_MS);
  return w.path ? [w.ms, w.path, w.start] : [DAEMON_MS, pathOf(fd, "daemon_move", id), null];
}
// ทางเดินของมอนตัวนี้ในเหตุการณ์ mob_move ล่าสุด + เวลาเริ่ม/ความยาว (ตามอนทีละตัว · server mobTimeline)
export function mobWalk(fd, id, now, fallbackMs) {
  const e = (fd.fx || []).slice().reverse().find((ev) => ev.kind === "mob_move" && ev.moves && ev.moves.some((mm) => mm.id === id));
  if (!e) return { path: null, ms: fallbackMs, start: null };
  const mv = e.moves.find((mm) => mm.id === id);
  if (!e.seqd) return { path: mv.path, ms: fallbackMs, start: null };
  const t0 = fxStart(e, now);
  return { path: mv.path, ms: Math.max(60, mv.ms || fallbackMs), start: t0 == null ? null : t0 + (mv.at || 0) };
}
export function posOf(m, now) {
  if (now < m.t0) { const a = m.path ? m.path[0] : { x: m.fx, y: m.fy }; return { x: a.x, y: a.y, moving: false }; } // ยังไม่ถึงคิว
  const k = Math.max(0, Math.min(1, (now - m.t0) / m.ms));
  if (m.path) {
    const n = m.path.length - 1, f = ease(k) * n, i = Math.min(n - 1, Math.floor(f)), r = f - i;
    const a = m.path[i], b = m.path[i + 1];
    return { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r, moving: k < 1 };
  }
  const e = ease(k);
  return { x: m.fx + (m.tx - m.fx) * e, y: m.fy + (m.ty - m.fy) * e, moving: k < 1 };
}
export const pathOf = (fd, kind, id) => {
  const e = (fd.fx || []).slice().reverse().find((ev) => ev.kind === kind && (ev.car === id || (ev.moves && ev.moves.some((m) => m.id === id))));
  if (!e) return null;
  if (e.path) return e.path;
  const m = e.moves && e.moves.find((mm) => mm.id === id);
  return m ? m.path : null;
};

// =================================================================== รถ (2×2 · หันตามทิศที่วิ่งล่าสุด)
export function drawCar(g, cx, cy, dir, col, night, now, moving) {
  // ตัวรถในกรอบ 2×2: ยาว 1.7 กว้าง 0.95 (หันตาม dir: "h" แนวนอน / "v" แนวตั้ง)
  const L = 0.85, W = 0.47, h = 0.32;
  const hz = dir === "h";
  const ax = hz ? L : W, ay = hz ? W : L;
  const sh = P(cx, cy);
  g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(sh[0], sh[1] + 2, sh[2] * (hz ? 1.0 : 0.6), sh[2] * 0.3, 0, 0, TAU); g.fill();
  box(g, cx - ax, cy - ay, cx + ax, cy + ay, h, col.body, col.dark, col.body);
  // ห้องโดยสาร (ต่ำ ลู่)
  const ca = hz ? 0.42 : W * 0.8, cb = hz ? W * 0.8 : 0.42;
  box(g, cx - ca, cy - cb, cx + ca, cy + cb, h + 0.2, "rgba(30,40,55,.92)", "rgba(20,26,36,.95)", "rgba(40,52,70,.92)");
  // ไฟหน้า/ไฟท้าย
  const front = hz ? [[cx + ax, cy - ay * 0.6], [cx + ax, cy + ay * 0.6]] : [[cx - ax * 0.6, cy + ay], [cx + ax * 0.6, cy + ay]];
  const back = hz ? [[cx - ax, cy - ay * 0.6], [cx - ax, cy + ay * 0.6]] : [[cx - ax * 0.6, cy - ay], [cx + ax * 0.6, cy - ay]];
  for (const [fx2, fy2] of front) {
    const p = P(fx2, fy2, h * 0.6);
    g.fillStyle = "#fff6d8"; g.beginPath(); g.arc(p[0], p[1], Math.max(1.4, p[2] * 0.04), 0, TAU); g.fill();
    if (night || moving) glowAt(g, p[0], p[1], p[2] * (night ? 0.7 : 0.35), "255,240,200", night ? 0.7 : 0.4);
  }
  for (const [bx, by] of back) {
    const p = P(bx, by, h * 0.6);
    g.fillStyle = "#ff3a2a"; g.beginPath(); g.arc(p[0], p[1], Math.max(1.2, p[2] * 0.035), 0, TAU); g.fill();
    if (night) glowAt(g, p[0], p[1], p[2] * 0.35, "255,60,40", 0.5);
  }
  // เงาสะท้อนบนฝากระโปรง
  const hl = P(cx + (hz ? ax * 0.55 : 0), cy + (hz ? 0 : ay * 0.55), h + 0.01);
  g.fillStyle = col.hi; g.globalAlpha = 0.5; g.beginPath(); g.ellipse(hl[0], hl[1], hl[2] * 0.14, hl[2] * 0.04, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
  if (moving && !night) void now;
}

// =================================================================== โชโกโบะ / ปีศาจ (ภาพ)
export function sprite(g, src, x, y, z, hTiles, flip = false, alpha = 1) {
  const im = img(src);
  const [sx, sy, s] = P(x, y, z);
  if (!im) { g.fillStyle = "#f2c94c"; g.beginPath(); g.arc(sx, sy - s * 0.3, s * 0.2, 0, TAU); g.fill(); return [sx, sy, s]; }
  const h = s * hTiles, w = h * (im.naturalWidth / im.naturalHeight);
  g.save(); g.globalAlpha *= alpha; g.translate(sx, sy); if (flip) g.scale(-1, 1);
  g.drawImage(im, -w / 2, -h, w, h); g.restore();
  return [sx, sy, s];
}
// มอนเตอร์เป็นยูนิตจริง (server/summon.js): เดินเองต้นเทิร์น = เลื่อนตามเส้นทาง (smooth) · ถูกผลัก/ไถล/ดึง = ตามตำแหน่งวาดของหมาก (ระบบเดิมเล่นฉากให้)
export function mobPos(units, id, sm) {
  if (sm.moving) return sm;
  const u = (units || []).find((it) => it.id === id && !it.corpse);
  if (!u) return sm;
  return { x: (u.rx != null ? u.rx : u.x) + (u.ox || 0), y: (u.ry != null ? u.ry : u.y) + (u.oy || 0), moving: false };
}
// ร่วมแรง (server stage6 ALLY — ผู้ใช้ 2026-11-14 "ทำทุกข้อ"): ผู้เล่นสองคนห่างกันไม่เกิน 2 ช่อง = เส้นประเขียวบนพื้นระหว่างกัน + วงจางใต้เท้า
const ALLY_R = 2;
export function allyLinks(g, units, now, lowQ) {
  const hs = (units || []).filter((u) => !u.summon && !u.corpse && !u.masked && Number.isFinite(u.x));
  if (hs.length < 2) return;
  const pos = (u) => ({ x: (u.rx != null ? u.rx : u.x) + (u.ox || 0) + 0.5, y: (u.ry != null ? u.ry : u.y) + (u.oy || 0) + 0.5 });
  const linked = new Set(), k = lowQ ? 0.8 : 0.65 + 0.2 * Math.sin(now / 420);
  g.save(); g.lineCap = "round";
  for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) {
    const a = hs[i], b = hs[j];
    if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > ALLY_R) continue;
    linked.add(a.id); linked.add(b.id);
    const pa = pos(a), pb = pos(b), A = P(pa.x, pa.y, 0.04), B = P(pb.x, pb.y, 0.04);
    g.strokeStyle = `rgba(110,240,160,${0.55 * k})`; g.lineWidth = Math.max(1.5, A[2] * 0.05); g.setLineDash([A[2] * 0.12, A[2] * 0.1]); g.lineDashOffset = lowQ ? 0 : -now / 60;
    g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
  }
  g.setLineDash([]);
  for (const u of hs) {
    if (!linked.has(u.id)) continue;
    const p = pos(u), [x, y, s] = P(p.x, p.y, 0.03);
    g.save(); g.translate(x, y); g.scale(1, 0.42); g.strokeStyle = `rgba(110,240,160,${0.6 * k})`; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, s * 0.48, 0, TAU); g.stroke(); g.restore();
  }
  g.restore();
}
export const threatOf = (units, id) => !!(units || []).find((it) => it.id === id && it.threat);
export function unitAt(units, id) {
  const u = (units || []).find((it) => it.id === id && !it.corpse);
  if (!u) return null;
  return { x: (u.rx != null ? u.rx : u.x) + (u.ox || 0) + 0.5, y: (u.ry != null ? u.ry : u.y) + (u.oy || 0) + 0.5 };
}

// =================================================================== ขั้น 3: มอนสเตอร์ (magitek = ภาพ /eos/img/magitek.webp · beast = วาดด้วยโค้ด) + ยานลำเลียง
export const MOB_MS = 1000;
export const MOB_HEAD = new Map(), MOB_LAST = new Map(); // id → ทิศที่หัน (พิกัดกระดาน) · ตำแหน่งเฟรมก่อน
export function mobFacing(id, pos) {
  const l = MOB_LAST.get(id);
  if (l && Math.abs(pos.x - l.x) + Math.abs(pos.y - l.y) > 0.002) MOB_HEAD.set(id, { dx: pos.x - l.x, dy: pos.y - l.y });
  MOB_LAST.set(id, { x: pos.x, y: pos.y });
  return MOB_HEAD.get(id) || { dx: 1, dy: 0 };
}
// ทิศบนกระดาน → หันซ้าย/ขวาบนจอ (ตามมุมกล้องที่หมุนได้)
export const screenFace = (x, y, h) => (P(x + h.dx, y + h.dy)[0] - P(x, y)[0] >= 0 ? 1 : -1);
export function mobAttackOf(id, now) {
  const e = lastFx("mob_attack");
  if (!e || !Array.isArray(e.attacks)) return null;
  const a = e.attacks.find((it) => it.id === id);
  if (!a) return null;
  const p = e.seqd ? fxSubT(e, a, now, fx.mob_attack) : fxT(e, now, fx.mob_attack); // ตามอนทีละตัว: พุ่งตามคิวของตัวเอง
  return p >= 0 && p < 1 ? { a, p } : null;
}
// หลอดเลือด/เกราะของปีศาจ/ศัตรู AI — แบบเดียวกับหมากผู้เล่น (boardDraw drawVitalBar) ขนาดตามช่อง (ผู้ใช้แจ้ง 2026-11-09: จุดแดงลอยอ่านไม่ออก)
export function hpPips(g, x, y, z, hp, maxHp, armor, maxArmor = armor, hpTone = null) {
  const top = P(x, y, z), s = top[2], UK = Math.max(0.35, s * 0.0085);
  drawVitalBar(g, top[0], top[1], s * 0.62, { hp, maxHp: Math.max(1, maxHp || 5), armor, maxArmor: Math.max(armor || 0, maxArmor || 0), hpTone }, UK);
  return top;
}
// สัตว์ยักษ์มีเขา (สูง ≈ 1.8 ช่อง) · พิกัดจอที่เท้า · face = 1 หันขวา / -1 หันซ้าย
export function drawBeast(g, sx, sy, s, face, now, moving, lowQ, alpha = 1, sink = 0) {
  const u = s, wk = moving && !lowQ ? now / 120 : 0, br = lowQ ? 0 : Math.sin(now / 650) * 0.02;
  g.save(); g.globalAlpha *= alpha; g.translate(sx, sy + sink * u); g.scale(face, 1);
  const L = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a * u, b * u) : g.moveTo(a * u, b * u))); g.closePath(); g.fill(); };
  const leg = (lx, ph, col) => {
    const sw = moving ? Math.sin(wk + ph) * 0.1 : 0, lift = moving ? Math.max(0, Math.sin(wk + ph + 1.6)) * 0.05 : 0;
    L([[lx - 0.15, -0.95], [lx + 0.15, -0.95], [lx + 0.1 + sw, -0.05 - lift], [lx - 0.12 + sw, -0.05 - lift]], col);
    g.fillStyle = "#120a0e"; g.beginPath(); g.ellipse((lx - 0.01 + sw) * u, (-0.05 - lift) * u, 0.15 * u, 0.055 * u, 0, 0, TAU); g.fill();
    g.fillStyle = "#d8cbb8";
    for (const c of [-0.07, 0.02, 0.1]) L([[lx + c + sw, -0.08 - lift], [lx + c + sw + 0.08, -0.03 - lift], [lx + c + sw + 0.01, -0.02 - lift]], "#d8cbb8");
  };
  // ขาฝั่งไกล + หาง
  leg(-0.4, 0, "#1c1118"); leg(0.36, Math.PI, "#1c1118");
  g.strokeStyle = "#2a1822"; g.lineWidth = 0.09 * u; g.lineCap = "round";
  g.beginPath(); g.moveTo(-0.5 * u, -1.08 * u); g.quadraticCurveTo(-0.95 * u, (-1.12 + br * 3) * u, -0.9 * u, -0.62 * u); g.stroke(); g.lineCap = "butt";
  g.fillStyle = "#3a2030"; g.beginPath(); g.ellipse(-0.9 * u, -0.58 * u, 0.07 * u, 0.1 * u, 0, 0, TAU); g.fill();
  // ลำตัว (ขนม่วงอมน้ำตาล ไล่เงา บนสว่าง → ล่างเข้ม) + หนอกไหล่
  const gr = g.createLinearGradient(0, -1.6 * u, 0, -0.62 * u);
  gr.addColorStop(0, "#7a5470"); gr.addColorStop(0.45, "#4a2c44"); gr.addColorStop(1, "#22131d");
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(-0.05 * u, (-1.0 - br) * u, 0.6 * u, (0.4 + br) * u, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(0.26 * u, (-1.22 - br) * u, 0.38 * u, 0.36 * u, -0.3, 0, TAU); g.fill();
  g.fillStyle = "rgba(130,90,60,.3)"; g.beginPath(); g.ellipse(0, -0.76 * u, 0.42 * u, 0.1 * u, 0, 0, TAU); g.fill();
  // แผงขนแข็งตามสันหลัง
  for (let i = 0; i < 7; i++) {
    const t = i / 6, bx = -0.5 + t * 0.92, by = -1.32 - Math.sin(t * Math.PI) * 0.28 - br;
    L([[bx - 0.07, by + 0.07], [bx + 0.02, by - 0.18 - (i % 2) * 0.07], [bx + 0.08, by + 0.08]], "#2a1626");
  }
  if (!lowQ) { // ลายขน
    g.strokeStyle = "rgba(18,6,14,.45)"; g.lineWidth = Math.max(1, u * 0.015);
    for (let i = 0; i < 10; i++) {
      const fx0 = -0.5 + hash(i, 3) * 0.9, fy0 = -1.25 + hash(i, 4) * 0.4;
      g.beginPath(); g.moveTo(fx0 * u, fy0 * u); g.quadraticCurveTo((fx0 - 0.04) * u, (fy0 + 0.06) * u, (fx0 - 0.02) * u, (fy0 + 0.12) * u); g.stroke();
    }
  }
  // ขาฝั่งใกล้
  leg(-0.26, Math.PI, "#3a2434"); leg(0.5, 0, "#3a2434");
  // หัว (ก้มต่ำหน้าไหล่) + เขา
  const hx = 0.72, hy = -1.02 - br;
  const horn = (ox, col) => {
    g.fillStyle = col; g.beginPath();
    g.moveTo((hx - 0.12 + ox) * u, (hy - 0.12) * u);
    g.bezierCurveTo((hx - 0.58 + ox) * u, (hy - 0.45) * u, (hx - 0.38 + ox) * u, (hy - 0.88) * u, (hx + 0.12 + ox) * u, (hy - 0.78) * u);
    g.bezierCurveTo((hx - 0.22 + ox) * u, (hy - 0.7) * u, (hx - 0.36 + ox) * u, (hy - 0.4) * u, (hx + 0.06 + ox) * u, (hy - 0.16) * u);
    g.closePath(); g.fill();
  };
  horn(-0.12, "#7a6a54");
  L([[hx - 0.2, hy - 0.2], [hx + 0.12, hy - 0.22], [hx + 0.3, hy - 0.05], [hx + 0.28, hy + 0.12], [hx + 0.05, hy + 0.18], [hx - 0.2, hy + 0.12]], "#3e2638");
  L([[hx - 0.05, hy + 0.1], [hx + 0.26, hy + 0.12], [hx + 0.2, hy + 0.25], [hx - 0.02, hy + 0.22]], "#24141f");
  g.strokeStyle = "#e8dcc4"; g.lineWidth = 0.035 * u; g.lineCap = "round";
  g.beginPath(); g.moveTo((hx + 0.2) * u, (hy + 0.16) * u); g.quadraticCurveTo((hx + 0.34) * u, (hy + 0.12) * u, (hx + 0.32) * u, (hy - 0.02) * u); g.stroke();
  g.lineCap = "butt";
  horn(0.04, "#d9cbaa");
  g.strokeStyle = "rgba(90,70,50,.6)"; g.lineWidth = Math.max(1, u * 0.012);
  const bz = (t, a, b, c, d) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
  for (let i = 1; i < 6; i++) { // วงเขา (ตามแนวกลางเขา)
    const k = i / 6.5, px = bz(k, hx - 0.05, hx - 0.36, hx - 0.33, hx + 0.16), py = bz(k, hy - 0.14, hy - 0.42, hy - 0.79, hy - 0.78), w = 0.06 * (1 - k * 0.7);
    g.beginPath(); g.moveTo((px - w) * u, (py - w * 0.3) * u); g.lineTo((px + w) * u, (py + w * 0.3) * u); g.stroke();
  }
  // ตาเรือง
  const ex = (hx + 0.17) * u, ey = (hy - 0.05) * u;
  glowAt(g, ex, ey, 0.24 * u, "255,180,50", 0.9);
  g.fillStyle = "#ffe27a"; g.beginPath(); g.ellipse(ex, ey, 0.045 * u, 0.025 * u, -0.2, 0, TAU); g.fill();
  g.restore();
}

export const shipsOf = (fd) => (Array.isArray(fd.ships) ? fd.ships : fd.dropship ? [fd.dropship] : []);
// หีบสมบัติ: กล่องไม้ขอบทอง แสงทองระยิบ (เด้งเบาๆ ให้เห็นจากไกล)
export function drawChest(g, cx, cy, now, night, lowQ) {
  const z = lowQ ? 0 : Math.abs(Math.sin(now / 520 + cx)) * 0.05;
  const [sx, sy, s] = P(cx, cy);
  g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(sx, sy, s * 0.32, s * 0.12, 0, 0, TAU); g.fill();
  box(g, cx - 0.26, cy - 0.18, cx + 0.26, cy + 0.18, 0.3 + z, "#8a5326", "#4a2a10", "#6e3f1a", z);
  box(g, cx - 0.27, cy - 0.19, cx + 0.27, cy + 0.19, 0.42 + z, "#a8652e", "#5a3313", "#7d4820", 0.3 + z);
  for (const k of [-0.15, 0.15]) box(g, cx + k - 0.03, cy - 0.2, cx + k + 0.03, cy + 0.2, 0.43 + z, "#f2c94c", "#9a7417", "#c99a22", 0.02 + z);
  const lock = P(cx, cy + 0.2, 0.3 + z);
  g.fillStyle = "#ffe27a"; g.fillRect(lock[0] - 2.5, lock[1] - 3, 5, 6);
  const top = P(cx, cy, 0.6 + z);
  glowAt(g, top[0], top[1], s * 0.55, "255,215,90", (night ? 0.55 : 0.32) + 0.15 * Math.sin(now / 300));
  if (!lowQ) for (let i = 0; i < 3; i++) {
    const k = ((now / 900) + i / 3) % 1, ang = i * 2.1 + now / 1400;
    g.fillStyle = "rgba(255,240,170," + (1 - k) + ")";
    g.fillRect(top[0] + Math.cos(ang) * s * 0.25, top[1] - k * s * 0.5, 2, 2);
  }
}
// ---------- กำแพงเมือง Insomnia ที่โดนทุบ (ผู้ใช้สั่ง 2026-11-10 "กำแพงต้องพังได้") ----------
function wallInfo(x, y) {
  const cw = LAST_FD && LAST_FD.cityWalls;
  if (!cw) return null;
  const h = (cw.hurt || []).find((o) => o.x === x && o.y === y);
  return h ? { hp: h.hp, max: cw.max || 4 } : null;
}
// รอยร้าวตามความเสียหาย + หลอดเลือดกำแพง
export function wallCracks(g, x, y) {
  const w = wallInfo(x, y);
  if (!w) return;
  const dmg = 1 - w.hp / w.max, n = Math.ceil(dmg * 4);
  g.strokeStyle = "rgba(30,24,20,.85)"; g.lineWidth = 1.6; g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const ax = x + 0.2 + hash(x * 7 + i, y) * 0.6, z0 = 0.15 + hash(x, y * 3 + i) * 0.5;
    let p0 = P(ax, y + 0.85, z0); g.beginPath(); g.moveTo(p0[0], p0[1]);
    for (let j = 1; j <= 3; j++) { const q = P(ax + (hash(i, j + x) - 0.5) * 0.25, y + 0.85, z0 + j * 0.12); g.lineTo(q[0], q[1]); p0 = q; }
    g.stroke();
  }
  g.lineCap = "butt";
  hpPips(g, x + 0.5, y + 0.5, 1.15, w.hp, w.max, 0, 0, "ally");
}
// ซากกำแพงที่พัง (ช่องเดินผ่านได้): กองหิน + ฝุ่น
export function drawRubble(g, x, y, C) {
  const [sx, sy, s] = P(x + 0.5, y + 0.6);
  g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(sx, sy, s * 0.45, s * 0.16, 0, 0, TAU); g.fill();
  for (let i = 0; i < 7; i++) {
    const bx = x + 0.2 + hash(x + i, y * 5) * 0.6, by = y + 0.25 + hash(x * 3, y + i) * 0.55, sz = 0.08 + hash(i, x + y) * 0.1;
    box(g, bx - sz, by - sz, bx + sz, by + sz, sz * 1.2, C.wall, C.wall2, C.wall);
  }
}
// ---------- ยานลำเลียง (2×2 · ลอย z ≈ 1.2) ----------
export const DROP_Z = 1.2, HOVER_Z = 3.6;
export function dropZ(ds, now) {
  const e = LAST_FD && Array.isArray(LAST_FD.fx) ? LAST_FD.fx.slice().reverse().find((ev) => ev.kind === "dropship_land" && ev.x === ds.x && ev.y === ds.y) : null;
  // ลงต่ำปล่อยหุ่น → ลอยขึ้นค้างสูง ไม่บังหน้าตามอน (ผู้ใช้ 2026-11-10 "โดนยานบังหน้าตา ปล่อยหุ่นแล้วให้ยานลอยขึ้น")
  if (!e) return HOVER_Z;
  const k = fxT(e, now, fx.dropship_land);
  if (k >= 1) return HOVER_Z;
  if (k < 0.55) return DROP_Z + (1 - ease(k / 0.55)) * 7;
  if (k < 0.72) return DROP_Z;
  return DROP_Z + ease((k - 0.72) / 0.28) * (HOVER_Z - DROP_Z);
}
export function drawDropship(g, x, y, z, now, lowQ, alpha = 1) {
  const b = z + (lowQ ? 0 : Math.sin(now / 700) * 0.05), cx = x + 1, cy = y + 1;
  g.save(); g.globalAlpha *= alpha;
  // ไอพ่นใต้เครื่องยนต์
  for (const ex of [-0.83, 0.83]) {
    const top = P(cx + ex, cy - 0.03, b), bot = P(cx + ex, cy - 0.03, Math.max(0, b - 0.9));
    const gr = g.createLinearGradient(top[0], top[1], bot[0], bot[1]);
    gr.addColorStop(0, "rgba(255,170,90,.55)"); gr.addColorStop(1, "rgba(255,120,60,0)");
    g.fillStyle = gr; g.beginPath(); g.moveTo(top[0] - top[2] * 0.12, top[1]); g.lineTo(top[0] + top[2] * 0.12, top[1]); g.lineTo(bot[0] + bot[2] * 0.2, bot[1]); g.lineTo(bot[0] - bot[2] * 0.2, bot[1]); g.closePath(); g.fill();
    glowAt(g, top[0], top[1], top[2] * 0.55, "255,150,80", 0.8);
  }
  // [x0, y0, x1, y1, z0, z1, top, side1, side2]
  const sub = [
    [cx - 1.0, cy - 0.38, cx - 0.66, cy + 0.32, b + 0.04, b + 0.3, "#3a3f46", "#1a1d21", "#2a2e34"], // เครื่องยนต์ซ้าย
    [cx + 0.66, cy - 0.38, cx + 1.0, cy + 0.32, b + 0.04, b + 0.3, "#3a3f46", "#1a1d21", "#2a2e34"], // เครื่องยนต์ขวา
    [cx - 0.36, cy + 0.72, cx + 0.36, cy + 0.98, b + 0.06, b + 0.32, "#1b222b", "#0e1216", "#161b21"], // หัว (ห้องนักบิน)
    [cx - 0.95, cy - 1.0, cx + 0.95, cy - 0.84, b + 0.3, b + 0.38, "#4a5058", "#22262b", "#33383e"], // ปีกท้าย
  ];
  const part = (q) => box(g, q[0], q[1], q[2], q[3], q[5], q[6], q[7], q[8], q[4]);
  const hd = depthOf(cx, cy - 0.06), dOf = (q) => depthOf((q[0] + q[2]) / 2, (q[1] + q[3]) / 2);
  sub.filter((q) => dOf(q) < hd).forEach(part);
  part([cx - 0.66, cy - 0.84, cx + 0.66, cy + 0.72, b, b + 0.42, "#5c626a", "#2a2e34", "#40454c"]); // ลำตัว
  part([cx - 0.2, cy - 0.7, cx + 0.2, cy + 0.42, b + 0.42, b + 0.6, "#4a5058", "#24282e", "#34393f"]); // สันหลัง
  sub.filter((q) => dOf(q) >= hd).forEach(part);
  // แนวแผ่นเกราะ + กระจกห้องนักบินเรืองแดง
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 1;
  for (const yy of [-0.35, 0.25]) { const a = P(cx - 0.66, cy + yy, b + 0.42), c = P(cx - 0.2, cy + yy, b + 0.42), d = P(cx + 0.2, cy + yy, b + 0.42), e = P(cx + 0.66, cy + yy, b + 0.42); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.moveTo(d[0], d[1]); g.lineTo(e[0], e[1]); g.stroke(); }
  poly(g, [[cx - 0.3, cy + 0.76, b + 0.33], [cx + 0.3, cy + 0.76, b + 0.33], [cx + 0.24, cy + 0.95, b + 0.33], [cx - 0.24, cy + 0.95, b + 0.33]]);
  g.fillStyle = "rgba(255,60,40,.4)"; g.fill();
  // ไฟแดงกะพริบตามมุม
  const on = Math.sin(now / 260) > 0;
  for (const [lx, ly, lz] of [[cx - 1.0, cy, b + 0.3], [cx + 1.0, cy, b + 0.3], [cx - 0.95, cy - 0.92, b + 0.38], [cx + 0.95, cy - 0.92, b + 0.38], [cx, cy + 0.98, b + 0.3]]) {
    const q = P(lx, ly, lz);
    g.fillStyle = on ? "#ff3a28" : "#5a1410"; g.beginPath(); g.arc(q[0], q[1], Math.max(1.2, q[2] * 0.03), 0, TAU); g.fill();
    if (on) glowAt(g, q[0], q[1], q[2] * 0.3, "255,50,30", 0.75);
  }
  g.restore();
}
