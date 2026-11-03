// ============================================================
//  เอฟเฟกต์บนกระดานของนกหวีดอัญเชิญมนต์อสูรเทพ (server/whistle.js — ช่องพิเศษที่ 6 ของกระเป๋า)
//  socket "divineFx" { seq, spell, by, at, size } = มนต์ลงสนาม (หลังคลิปเต็มจอ / การ์ดแจ้งเตือน) · server พัก INTRO_SECONDS แล้วลงผลจริง (iceFx)
//   + Judgment Bolt ส่งซ้ำ { land: true, tiles, hits } ตอนผลลง = สายฟ้าฟาดลงช่องไฟ/ตัวศัตรูทีละลูก
//  โทนตามคลิปของผู้ใช้ (แนวมนต์อสูร FFXV):
//   dvWinds  Cross Winds   ฟ้าพายุเทาหมุน · ทอร์นาโดยักษ์ที่ผู้เป่า → ลมระเบิด: วงกระแทก + ใบมีดลมจันทร์เสี้ยว + ขนนกม่วงทอง
//   dvWave   Tsunami       ฟ้าพายุ + ฝน · เสาน้ำรอบขอบ · กำแพงคลื่นสูงสันม้วนซัดจาก 4 ขอบเข้ากลาง → เสาน้ำยักษ์ + มงกุฎน้ำกลางสนาม
//   dvDust   Diamond Dust  แฟลชขาว · ตราเกล็ดหิมะ · คลื่นน้ำแข็งแผ่ · เสาผลึกพุ่งทั่วกระดานแล้วแตก · พายุหิมะ
//   dvBolt   Judgment Bolt ฟ้ามืดม่วง + เมฆพายุ · สายฟ้าโปรย · สายฟ้ายักษ์ฟาดกลาง (แฟลช/คลื่นกระแทก/รอยแตก/ไฟฟ้าวิ่ง)
//   dvStrike สายฟ้าลูกเดียวฟาดช่อง (x, y) — big = ฟาดตัวศัตรู (หนา + วงกระแทก)
//  lowQ = ตัดอนุภาคครึ่งหนึ่ง
// ============================================================
import { P, gEllipse, gPoly, glow } from "./boardGeo";

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeIn = (k) => k * k;
// เข้า a ช่วงแรก · ออก b ช่วงท้าย (สัดส่วนของ u)
const env = (u, a, b) => Math.min(clamp01(u / a), clamp01((1 - u) / b));
function rnd(seed) { let s = (Math.abs(Math.floor(seed)) % 2147483646) || 1; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }

export const DIVINE_FX_DUR = { dvWinds: 3200, dvWave: 3600, dvDust: 3600, dvBolt: 3000, dvStrike: 900 };
export const isDivineFx = (kind) => typeof kind === "string" && kind in DIVINE_FX_DUR;
// ช่วงก่อนผลลง (ms) — ตรงกับ server/whistle.js INTRO_SECONDS
export const DIVINE_LAND_MS = { crossWinds: 1100, tsunami: 1400, diamondDust: 1200, judgmentBolt: 1300 };
const KIND_OF = { crossWinds: "dvWinds", tsunami: "dvWave", diamondDust: "dvDust", judgmentBolt: "dvBolt" };

// socket "divineFx" → { fx, shake: [ms…], look }
export function divineEventFx(ev, ctx = {}) {
  const out = { fx: [], shake: [], look: null };
  if (!ev || !KIND_OF[ev.spell]) return out;
  const cols = ctx.cols || 14, rows = ctx.rows || 14;
  if (ev.land) {
    // Judgment Bolt ผลลง: ฟาดช่องไฟทีละลูก (สุ่มลำดับ · ไม่เกิน 36 ลูก) + ฟาดตัวศัตรู
    const r = rnd((ev.seq || 1) * 977);
    const tiles = [...(ev.tiles || [])].sort(() => r() - 0.5).slice(0, ctx.lowQ ? 18 : 36);
    tiles.forEach((t, i) => {
      const delay = Math.round(i * (900 / Math.max(1, tiles.length)) + r() * 60);
      out.fx.push({ kind: "dvStrike", x: t.x, y: t.y, delay, dur: DIVINE_FX_DUR.dvStrike + delay, seed: i * 31 + t.x * 7 + t.y });
    });
    (ev.hits || []).forEach((id, i) => {
      const p = ctx.posOf ? ctx.posOf(id) : null;
      if (!p) return;
      const delay = 120 + i * 140;
      out.fx.push({ kind: "dvStrike", x: p.x, y: p.y, size: p.size || 1, big: true, delay, dur: DIVINE_FX_DUR.dvStrike + delay, seed: i * 53 + 11, hitIds: [id], hitDelay: delay + 90 });
      out.shake.push(delay + 90);
    });
    return out;
  }
  const at = ev.at || { x: cols / 2, y: rows / 2 };
  out.fx.push({ kind: KIND_OF[ev.spell], at: { x: at.x, y: at.y }, size: ev.size || 1, cols, rows, seed: ev.seq || 1 });
  if (ev.spell === "crossWinds") out.shake.push(650, DIVINE_LAND_MS.crossWinds);
  if (ev.spell === "tsunami") out.shake.push(DIVINE_LAND_MS.tsunami - 150, DIVINE_LAND_MS.tsunami + 200);
  if (ev.spell === "diamondDust") out.shake.push(80, 700);
  if (ev.spell === "judgmentBolt") out.shake.push(400, 1050, 1250);
  out.look = ev.spell === "tsunami" ? { x: Math.floor(cols / 2), y: Math.floor(rows / 2) } : { x: at.x, y: at.y };
  return out;
}

export function divineFx(g, e, now, lowQ) {
  const T = DIVINE_FX_DUR[e.kind] || 1000;
  const ms = now - e.t0 - (e.delay || 0);
  if (ms < 0) return;
  const u = ms / T;
  if (u >= 1) return;
  g.save();
  if (e.kind === "dvWinds") windsFx(g, e, u, ms, lowQ);
  else if (e.kind === "dvWave") waveFx(g, e, u, ms, lowQ);
  else if (e.kind === "dvDust") dustFx(g, e, u, ms, lowQ);
  else if (e.kind === "dvBolt") boltSkyFx(g, e, u, ms, lowQ);
  else if (e.kind === "dvStrike") strikeFx(g, e, u, ms, lowQ);
  g.restore();
}

// ---------- ร่วม ----------
function boardPoly(e, inset = 0, z = 0) {
  const c = e.cols, r = e.rows;
  return [[inset, inset, z], [c - inset, inset, z], [c - inset, r - inset, z], [inset, r - inset, z]];
}
// pad = ลามออกนอกกระดาน (ช่อง) — ฟ้ามืดคลุมทั้งฉาก
function tint(g, e, rgb, a, pad = 0) {
  if (a <= 0.005) return;
  gPoly(g, boardPoly(e, -pad)); g.fillStyle = `rgba(${rgb},${a})`; g.fill();
}
// จุดบนวงกลมโลก (cx, cy) รัศมี r มุม an ความสูง z
const ring = (cx, cy, r, an, z = 0) => P(cx + Math.cos(an) * r, cy + Math.sin(an) * r, z);

// ก้อนเมฆลอยเหนือฉาก (สี rgb · หมุนรอบ (cx, cy) ด้วยความเร็ว spin rad/วิ — 0 = ลอยนิ่ง)
function skyClouds(g, e, ms, a, rgb, n, seed, spin = 0, cx = 0, cy = 0) {
  const r = rnd(seed);
  for (let i = 0; i < n; i++) {
    let x = r() * (e.cols + 6) - 3, y = r() * (e.rows + 6) - 3;
    const z = 6 + r() * 3, sz = 1.6 + r() * 1.6;
    if (spin) { const an = Math.atan2(y - cy, x - cx) + (ms / 1000) * spin, d = Math.hypot(x - cx, y - cy); x = cx + Math.cos(an) * d; y = cy + Math.sin(an) * d; }
    const p = P(x, y, z), rad = p[2] * sz;
    const gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], rad);
    gr.addColorStop(0, `rgba(${rgb},${0.6 * a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(p[0] - rad, p[1] - rad, rad * 2, rad * 2);
  }
}

// ---------- Cross Winds ----------
//  ฟ้าพายุเทาหมุน → ทอร์นาโดยักษ์ก่อตัวที่ผู้เป่า (วงลมซ้อนขึ้นฟ้า + ริ้วหมุน + เศษหินปลิววน)
//  → ระเบิดลม: วงกระแทก 3 ระลอก + ใบมีดลมรูปจันทร์เสี้ยวพุ่งออกรอบทิศ + ขนนกม่วงทองปลิว · ริ้วลมพาดทั่วฉาก
const WIND_N = 40;
const BURST_AT = 650; // ลมระเบิดออก (ms)
function windsFx(g, e, u, ms, lowQ) {
  const cx = e.at.x + (e.size || 1) / 2, cy = e.at.y + (e.size || 1) / 2;
  const R = Math.hypot(e.cols, e.rows);
  const a = env(u, 0.1, 0.28);
  tint(g, e, "52,58,72", 0.45 * a, 40);
  skyClouds(g, e, ms, a, "120,128,140", lowQ ? 8 : 16, e.seed * 41 + 3, 0.9, cx, cy);
  tint(g, e, "235,240,250", 0.6 * clamp01(1 - Math.abs(ms - BURST_AT) / 160), 40); // แฟลชตอนระเบิดลม
  // ทอร์นาโด: วงลมซ้อนขึ้นฟ้า (กว้างขึ้นตามความสูง) — ก่อตัวก่อนระเบิด แล้วคลายตัว
  const tw = ms < BURST_AT ? easeOut(ms / BURST_AT) : clamp01(1 - (ms - BURST_AT) / 1600);
  if (tw > 0.01) {
    const H = 7 * tw, rings = lowQ ? 9 : 16;
    for (let i = 0; i < rings; i++) {
      const f = i / (rings - 1), z = f * H, rad = 0.35 + f * f * 2.6 + Math.sin(ms / 140 + i) * 0.08;
      const ox = Math.sin(ms / 400 + f * 3) * f * 0.5, oy = Math.cos(ms / 470 + f * 2) * f * 0.3;
      gEllipse(g, cx + ox, cy + oy, rad, z, 40, rad * 0.9);
      g.strokeStyle = `rgba(${215 + f * 40},${220 + f * 35},${228 + f * 27},${(0.25 + 0.45 * (1 - f)) * tw * a})`;
      g.lineWidth = 3 + 5 * (1 - f); g.stroke();
    }
    // ริ้วลมหมุนพันตัวทอร์นาโด
    const sn = lowQ ? 10 : 22;
    g.lineCap = "round";
    for (let i = 0; i < sn; i++) {
      const f0 = (i / sn + ms / 1800) % 1, ph = i * 2.4 + ms / 110;
      g.beginPath();
      for (let s = 0; s <= 8; s++) {
        const f = clamp01(f0 + s * 0.025), rad = 0.4 + f * f * 2.6, an = ph - s * 0.35, p = ring(cx, cy, rad, an, f * H);
        if (s) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
      }
      g.strokeStyle = `rgba(250,252,255,${0.8 * tw * a})`; g.lineWidth = 1.5 + (i % 3); g.stroke();
    }
    // เศษหิน/ใบไม้ปลิววนขึ้น
    const rd = rnd(e.seed * 7 + 1);
    for (let i = 0; i < (lowQ ? 14 : 30); i++) {
      const f = (rd() + ms / 1500) % 1, an = rd() * TAU + ms / (180 + rd() * 100), rad = 0.5 + f * f * 2.8, p = ring(cx, cy, rad, an, f * H);
      g.fillStyle = i % 3 ? `rgba(110,100,85,${0.9 * tw * a})` : `rgba(120,160,90,${0.9 * tw * a})`;
      g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.05, p[2] * 0.025, an * 3, 0, TAU); g.fill();
    }
    const pg = P(cx, cy, 0.3);
    glow(g, pg[0], pg[1], pg[2] * 2.6, "225,232,245", 0.45 * tw * a);
  }
  // ฝุ่นวงบนพื้นรอบฐาน
  gEllipse(g, cx, cy, 1.2 + 0.4 * Math.sin(ms / 200), 0.02, 48); g.fillStyle = `rgba(150,140,120,${0.25 * a})`; g.fill();
  const bt = ms - BURST_AT;
  if (bt >= 0) {
    // วงกระแทก 3 ระลอก
    for (let i = 0; i < 3; i++) {
      const k = clamp01((bt - i * 220) / 1100);
      if (k <= 0 || k >= 1) continue;
      gEllipse(g, cx, cy, 0.5 + easeOut(k) * R * 0.8, 0.12, 80);
      g.strokeStyle = `rgba(200,210,225,${0.5 * (1 - k)})`; g.lineWidth = 18 * (1 - k) + 2; g.stroke();
      g.strokeStyle = `rgba(255,255,255,${0.95 * (1 - k)})`; g.lineWidth = 4 * (1 - k) + 1; g.stroke();
    }
    // ใบมีดลมรูปจันทร์เสี้ยวพุ่งออก
    const bn = lowQ ? 8 : 16;
    for (let i = 0; i < bn; i++) {
      const an = (i / bn) * TAU + (i % 2) * 0.2, t = (bt - (i % 4) * 70) / 1000;
      if (t < 0) continue;
      const rad = 0.8 + t * 9, fade = clamp01(1 - rad / R);
      if (fade <= 0) continue;
      const z = 0.4 + (i % 3) * 0.25, half = 0.32;
      g.beginPath();
      for (let s = 0; s <= 10; s++) { const f = s / 10, p = ring(cx, cy, rad + Math.sin(f * Math.PI) * 0.35, an - half + f * 2 * half, z); if (s) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
      for (let s = 10; s >= 0; s--) { const f = s / 10, p = ring(cx, cy, rad, an - half + f * 2 * half, z); g.lineTo(p[0], p[1]); }
      g.closePath();
      g.fillStyle = `rgba(245,250,255,${0.85 * fade * a})`; g.fill();
      g.strokeStyle = `rgba(170,190,215,${0.6 * fade * a})`; g.lineWidth = 1.2; g.stroke();
    }
    // ขนนกม่วง/ทองปลิว
    const rf = rnd(e.seed * 113 + 5);
    for (let i = 0; i < (lowQ ? 10 : 24); i++) {
      const an = rf() * TAU, sp = 3 + rf() * 5, t = (bt - rf() * 400) / 1000;
      if (t < 0) continue;
      const rad = 0.6 + t * sp, fade = clamp01(1 - rad / R);
      if (fade <= 0) continue;
      const p = ring(cx, cy, rad, an + t * 0.8, 0.3 + rf() * 1.5 + Math.sin(t * 6 + i) * 0.2), rot = an + t * 7 + i;
      g.save(); g.translate(p[0], p[1]); g.rotate(rot);
      const L = p[2] * 0.12;
      g.fillStyle = i % 3 ? `rgba(150,90,200,${0.9 * fade * a})` : `rgba(230,190,90,${0.9 * fade * a})`;
      g.beginPath(); g.moveTo(-L, 0); g.quadraticCurveTo(0, -L * 0.35, L, 0); g.quadraticCurveTo(0, L * 0.35, -L, 0); g.fill();
      g.strokeStyle = `rgba(255,255,255,${0.6 * fade * a})`; g.lineWidth = 1; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L, 0); g.stroke();
      g.restore();
    }
  }
  // ริ้วลมหมุนพุ่งออก (ทั้งฉาก)
  const r = rnd(e.seed * 131 + 7), n = lowQ ? WIND_N >> 1 : WIND_N;
  g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const an0 = r() * TAU, sp = 4 + r() * 6, z = 0.15 + r() * 1.4, len = 0.4 + r() * 0.5, t0 = BURST_AT - 200 + r() * 1200;
    const t = (ms - t0) / 1000;
    if (t < 0) continue;
    const rad = 0.6 + t * sp, an = an0 + t * 0.9;
    if (rad > R) continue;
    const fade = clamp01(1 - rad / R) * a;
    g.beginPath();
    for (let s = 0; s <= 6; s++) {
      const aa = an - (s / 6) * len, rr = rad - (s / 6) * 0.6, p = ring(cx, cy, rr, aa, z + Math.sin(aa * 3) * 0.08);
      if (s) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
    }
    g.strokeStyle = `rgba(245,250,255,${0.9 * fade})`; g.lineWidth = 1.5 + (i % 3) * 1.2; g.stroke();
  }
}

// ---------- Tsunami ----------
//  ฟ้าพายุเขียวน้ำทะเล + ฝนเฉียง → น้ำพุ่งเป็นเสารอบขอบกระดาน → กำแพงคลื่นสูงม้วนสันฟองซัดจาก 4 ขอบเข้ากลาง
//  → น้ำปะทะกลางสนาม: เสาน้ำยักษ์ + มงกุฎน้ำกระจาย + วงกระเพื่อม + ละอองตกกลับ
function waveFx(g, e, u, ms, lowQ) {
  const land = DIVINE_LAND_MS.tsunami;
  const half = Math.min(e.cols, e.rows) / 2;
  const a = env(u, 0.08, 0.22);
  tint(g, e, "8,40,56", 0.45 * a, 40);
  skyClouds(g, e, ms, a, "40,80,95", lowQ ? 8 : 16, e.seed * 29 + 9);
  // ฝนเฉียง
  const rr = rnd(e.seed * 5 + 1);
  g.lineCap = "round";
  for (let i = 0; i < (lowQ ? 40 : 110); i++) {
    const x0 = rr() * (e.cols + 8) - 5, y0 = rr() * (e.rows + 8) - 5, ph = rr(), t = ((ms / 600) + ph) % 1;
    const p = P(x0 + t * 1.2, y0 + t * 0.4, 6 * (1 - t)), q = P(x0 + t * 1.2 - 0.12, y0 + t * 0.4 - 0.04, 6 * (1 - t) + 0.6);
    g.strokeStyle = `rgba(200,235,245,${0.45 * a})`; g.lineWidth = 1; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(p[0], p[1]); g.stroke();
  }
  const k = clamp01(ms / land);
  // เสาน้ำพุ่งรอบขอบ (ก่อนคลื่นซัด)
  const rg = rnd(e.seed * 61 + 4);
  for (let i = 0; i < (lowQ ? 8 : 16); i++) {
    const side = i % 4, f = rg(), t0 = rg() * 500, t = (ms - t0) / 700;
    if (t < 0 || t > 1) continue;
    const x = side === 0 ? f * e.cols : side === 1 ? e.cols : side === 2 ? f * e.cols : 0;
    const y = side === 0 ? 0 : side === 1 ? f * e.rows : side === 2 ? e.rows : f * e.rows;
    const h = Math.sin(t * Math.PI) * (2.5 + rg() * 1.5), b = P(x, y, 0), top = P(x, y, h), w = b[2] * 0.22;
    const gr = g.createLinearGradient(0, top[1], 0, b[1]);
    gr.addColorStop(0, `rgba(240,252,255,${0.9 * a})`); gr.addColorStop(1, `rgba(30,140,160,${0.8 * a})`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(b[0] - w, b[1]); g.quadraticCurveTo(b[0] - w * 0.3, (top[1] + b[1]) / 2, top[0], top[1]); g.quadraticCurveTo(b[0] + w * 0.3, (top[1] + b[1]) / 2, b[0] + w, b[1]); g.closePath(); g.fill();
  }
  if (k < 1) {
    const inset = easeIn(k) * (half - 0.6), band = 1.4 + 1.0 * (1 - k);
    // น้ำที่ซัดผ่านแล้ว (ขอบนอก) = ผิวน้ำปั่นป่วน
    g.beginPath();
    for (const rg2 of [boardPoly(e, 0), boardPoly(e, inset)]) {
      rg2.forEach(([x, y], i) => { const p = P(x, y, 0); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
      g.closePath();
    }
    g.fillStyle = `rgba(30,120,145,${0.45 * a})`; g.fill("evenodd");
    // ตัวคลื่น (แถบ)
    const outer = boardPoly(e, inset), inner = boardPoly(e, Math.min(half - 0.2, inset + band));
    g.beginPath();
    for (const rg2 of [outer, inner]) {
      rg2.forEach(([x, y], i) => { const p = P(x, y, 0.05); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
      g.closePath();
    }
    g.fillStyle = `rgba(14,96,120,${0.7 * a})`; g.fill("evenodd");
    // ผนังน้ำสูง: หน้าคลื่นตั้งจากพื้นถึงสัน แล้วสันม้วนยื่นเข้าข้างใน
    const H = 2.2 * (0.6 + 0.4 * Math.sin(Math.min(1, k * 1.5) * Math.PI / 2 + 0.6));
    const line = boardPoly(e, inset + band * 0.75), lip = boardPoly(e, inset + band * 0.75 + 0.55);
    const zAt = (f, side) => H + 0.25 * Math.sin(f * 12 + ms / 120 + side);
    for (let side = 0; side < 4; side++) {
      const [x0, y0] = line[side], [x1, y1] = line[(side + 1) % 4], [lx0, ly0] = lip[side], [lx1, ly1] = lip[(side + 1) % 4];
      const top = [], bot = [], curl = [];
      for (let s = 0; s <= 16; s++) {
        const f = s / 16, x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f, z = zAt(f, side);
        top.push(P(x, y, z)); bot.push(P(x, y, 0));
        curl.push(P(lx0 + (lx1 - lx0) * f, ly0 + (ly1 - ly0) * f, z - 0.45));
      }
      g.beginPath();
      top.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      for (let i = bot.length - 1; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]);
      g.closePath();
      const ys = top.concat(bot).map((p) => p[1]), gr = g.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
      gr.addColorStop(0, `rgba(190,245,250,${0.7 * a})`); gr.addColorStop(0.3, `rgba(30,150,170,${0.75 * a})`); gr.addColorStop(1, `rgba(4,50,70,${0.85 * a})`);
      g.fillStyle = gr; g.fill();
      // แถบสะท้อนแสงบนหน้าคลื่น
      g.beginPath(); top.forEach((p, i) => { const q = [p[0], p[1] + (bot[i][1] - p[1]) * 0.35]; if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
      g.strokeStyle = `rgba(200,250,255,${0.35 * a})`; g.lineWidth = 2; g.stroke();
      // สันม้วน (ฟองขาวยื่นเข้าข้างใน)
      g.beginPath();
      top.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      for (let i = curl.length - 1; i >= 0; i--) g.lineTo(curl[i][0], curl[i][1]);
      g.closePath(); g.fillStyle = `rgba(235,252,255,${0.85 * a})`; g.fill();
    }
    // ละอองเหนือสันคลื่น
    const r = rnd(e.seed * 71 + Math.floor(ms / 60));
    for (let i = 0; i < (lowQ ? 30 : 80); i++) {
      const side = (r() * 4) | 0, f = r(), [x0, y0] = line[side], [x1, y1] = line[(side + 1) % 4];
      const p = P(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, H + 0.2 + r() * 1.2);
      g.fillStyle = `rgba(230,250,255,${(0.4 + r() * 0.5) * a})`;
      g.beginPath(); g.arc(p[0], p[1], Math.max(1, p[2] * (0.014 + r() * 0.022)), 0, TAU); g.fill();
    }
  } else {
    // น้ำปะทะกลางสนาม: เสาน้ำยักษ์ + มงกุฎน้ำ + วงกระเพื่อม
    const kk = clamp01((ms - land) / (DIVINE_FX_DUR.dvWave - land));
    const cx = e.cols / 2, cy = e.rows / 2, c0 = P(cx, cy, 0);
    tint(g, e, "230,250,255", 0.55 * clamp01(1 - (ms - land) / 200), 40);
    gPoly(g, boardPoly(e)); g.fillStyle = `rgba(30,120,145,${0.35 * (1 - kk) * a})`; g.fill();
    for (let i = 0; i < 4; i++) {
      const q = clamp01(kk * 1.4 - i * 0.15);
      if (q <= 0 || q >= 1) continue;
      gEllipse(g, cx, cy, 0.5 + easeOut(q) * half * 1.5, 0.03, 72);
      g.strokeStyle = `rgba(220,248,255,${0.85 * (1 - q)})`; g.lineWidth = 6 * (1 - q) + 1; g.stroke();
    }
    const col = clamp01(1 - kk * 1.5);
    if (col > 0) {
      const top = P(cx, cy, 7 * easeOut(Math.min(1, kk * 4))), w = c0[2] * 1.8;
      const gr = g.createLinearGradient(0, top[1], 0, c0[1]);
      gr.addColorStop(0, `rgba(245,255,255,${0.95 * col})`); gr.addColorStop(1, `rgba(20,130,155,${0.8 * col})`);
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(c0[0] - w, c0[1]); g.quadraticCurveTo(c0[0] - w * 0.15, (top[1] + c0[1]) / 2, top[0], top[1]); g.quadraticCurveTo(c0[0] + w * 0.15, (top[1] + c0[1]) / 2, c0[0] + w, c0[1]); g.closePath(); g.fill();
      // มงกุฎน้ำรอบฐาน
      for (let i = 0; i < 14; i++) {
        const an = (i / 14) * TAU, rad = 0.8 + kk * 2.2, h = (0.8 + (i % 3) * 0.4) * col;
        const b = ring(cx, cy, rad, an, 0), t2 = ring(cx, cy, rad + 0.35, an, h), ww = b[2] * 0.08;
        g.fillStyle = `rgba(225,250,255,${0.85 * col})`;
        g.beginPath(); g.moveTo(b[0] - ww, b[1]); g.lineTo(t2[0], t2[1]); g.lineTo(b[0] + ww, b[1]); g.closePath(); g.fill();
      }
    }
    // ละอองตกกลับ
    const r = rnd(e.seed * 17);
    for (let i = 0; i < (lowQ ? 30 : 80); i++) {
      const an = r() * TAU, d = 0.5 + r() * half * 1.1 * kk, z = Math.max(0, 4 * Math.sin(Math.min(1, kk * 1.3) * Math.PI) * r());
      const p = P(cx + Math.cos(an) * d, cy + Math.sin(an) * d, z);
      g.fillStyle = `rgba(225,250,255,${0.85 * (1 - kk)})`; g.beginPath(); g.arc(p[0], p[1], Math.max(1, p[2] * 0.028), 0, TAU); g.fill();
    }
  }
}

// ---------- Diamond Dust ----------
//  แฟลชขาวเต็มกระดาน → ตราเกล็ดหิมะยักษ์หมุนใต้ผู้เป่า → คลื่นน้ำแข็งแผ่ (พื้นกลายเป็นขาวตามที่คลื่นผ่าน)
//  → เสาน้ำแข็งแหลมพุ่งขึ้นทั่วกระดานตามจังหวะคลื่น แล้วแตกเป็นประกาย → พายุหิมะเฉียงตลอดฉาก
const SPIRE_N = 46;
// เสาผลึก 3 หน้า (สว่าง/กลาง/เงา) ปลายแหลม
function prismSpire(g, x, y, h, w, alpha) {
  const b0 = P(x - w, y, 0), b1 = P(x + w * 0.6, y - w * 0.6, 0), b2 = P(x + w * 0.6, y + w * 0.6, 0), tip = P(x, y, h);
  const face = (p, q, col) => { g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.lineTo(tip[0], tip[1]); g.closePath(); g.fillStyle = col; g.fill(); };
  face(b0, b1, `rgba(170,215,250,${0.85 * alpha})`);
  face(b1, b2, `rgba(110,170,230,${0.9 * alpha})`);
  face(b2, b0, `rgba(235,250,255,${0.95 * alpha})`);
  g.beginPath(); g.moveTo(b0[0], b0[1]); g.lineTo(tip[0], tip[1]); g.lineTo(b2[0], b2[1]);
  g.strokeStyle = `rgba(255,255,255,${0.9 * alpha})`; g.lineWidth = 1.2; g.stroke();
}
// ตราเกล็ดหิมะบนพื้น (รัศมี r ช่อง · หมุน rot)
function snowflake(g, cx, cy, r, rot, alpha) {
  g.strokeStyle = `rgba(225,245,255,${alpha})`; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const an = rot + (i / 6) * TAU;
    const tip = ring(cx, cy, r, an, 0.02), c0 = P(cx, cy, 0.02);
    g.lineWidth = 3; g.beginPath(); g.moveTo(c0[0], c0[1]); g.lineTo(tip[0], tip[1]); g.stroke();
    for (const f of [0.45, 0.72]) {
      const mx = cx + Math.cos(an) * r * f, my = cy + Math.sin(an) * r * f, m = P(mx, my, 0.02);
      for (const d of [-0.5, 0.5]) {
        const q = ring(mx, my, r * 0.22, an + d * 1.6, 0.02);
        g.lineWidth = 2; g.beginPath(); g.moveTo(m[0], m[1]); g.lineTo(q[0], q[1]); g.stroke();
      }
    }
  }
  gEllipse(g, cx, cy, r * 1.08, 0.02, 64); g.lineWidth = 2; g.stroke();
  gEllipse(g, cx, cy, r * 0.25, 0.02, 32); g.lineWidth = 2; g.stroke();
}
function dustFx(g, e, u, ms, lowQ) {
  const land = DIVINE_LAND_MS.diamondDust;
  const cx = e.at.x + (e.size || 1) / 2, cy = e.at.y + (e.size || 1) / 2;
  const R = Math.hypot(e.cols, e.rows);
  const a = env(u, 0.05, 0.25);
  // ฟ้ามืดหนาว + แฟลชขาวตอนเริ่ม
  tint(g, e, "18,40,70", 0.32 * a, 40);
  tint(g, e, "245,252,255", 0.9 * clamp01(1 - ms / 450), 40);
  // คลื่นน้ำแข็ง: พื้นในรัศมีกลายเป็นน้ำแข็งขาวฟ้า
  const wave = 0.5 + easeOut(clamp01(ms / (land + 200))) * R;
  for (let y = 0; y < e.rows; y++) for (let x = 0; x < e.cols; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d > wave) continue;
    const edge = clamp01((wave - d) / 1.2);
    gPoly(g, [[x, y, 0.01], [x + 1, y, 0.01], [x + 1, y + 1, 0.01], [x, y + 1, 0.01]]);
    g.fillStyle = `rgba(215,238,255,${(0.22 + 0.35 * (1 - edge)) * a})`; g.fill();
  }
  // ขอบคลื่น: วงหมอกขาว
  if (wave < R) {
    gEllipse(g, cx, cy, wave, 0.05, 96);
    g.strokeStyle = `rgba(150,210,255,${0.6 * a})`; g.lineWidth = 14; g.stroke();
    g.strokeStyle = `rgba(255,255,255,${0.95 * a})`; g.lineWidth = 5; g.stroke();
  }
  // ตราเกล็ดหิมะยักษ์ใต้ผู้เป่า
  const sk = easeOut(clamp01(ms / 600));
  snowflake(g, cx, cy, 0.6 + sk * 2.4, ms / 1400, 0.85 * a * sk);
  const pc = P(cx, cy, 0.6);
  glow(g, pc[0], pc[1], pc[2] * 4, "200,235,255", 0.6 * a);
  // เสาน้ำแข็งพุ่งขึ้นเมื่อคลื่นผ่าน แล้วแตกเป็นเศษผลึก
  const r = rnd(e.seed * 97 + 13), n = lowQ ? SPIRE_N >> 1 : SPIRE_N;
  const spires = [];
  for (let i = 0; i < n; i++) {
    const x = r() * e.cols, y = r() * e.rows, h = 1.2 + r() * 2.2, w = 0.16 + r() * 0.14;
    const t = ms - (Math.hypot(x - cx, y - cy) / R) * (land + 200) * 0.75;
    if (t >= 0) spires.push({ x, y, h, w, t, i });
  }
  spires.sort((p, q) => p.x + p.y - (q.x + q.y));
  for (const sp of spires) {
    const grow = easeOut(clamp01(sp.t / 220)), br = clamp01((sp.t - 1300) / 350);
    if (br >= 1) continue;
    gEllipse(g, sp.x, sp.y, sp.w * 2.2, 0.01, 16); g.fillStyle = `rgba(230,246,255,${0.5 * a})`; g.fill();
    if (br <= 0) { prismSpire(g, sp.x, sp.y, sp.h * grow, sp.w, a); continue; }
    for (let j = 0; j < 7; j++) {
      const an = j * 0.9 + sp.i, dd = br * (0.4 + (j % 3) * 0.25), zz = sp.h * (0.2 + (j % 4) * 0.2) * (1 - br) + br * 0.1;
      const p = P(sp.x + Math.cos(an) * dd, sp.y + Math.sin(an) * dd, zz);
      g.fillStyle = `rgba(235,250,255,${(1 - br) * a})`;
      g.beginPath(); g.moveTo(p[0], p[1] - p[2] * 0.07); g.lineTo(p[0] + p[2] * 0.04, p[1]); g.lineTo(p[0], p[1] + p[2] * 0.07); g.lineTo(p[0] - p[2] * 0.04, p[1]); g.closePath(); g.fill();
    }
    const pm = P(sp.x, sp.y, sp.h * 0.5);
    glow(g, pm[0], pm[1], pm[2] * 0.8, "230,248,255", 0.7 * (1 - br) * a);
  }
  // พายุหิมะเฉียง (ริ้วลม + เกล็ด + ประกายรูปดาว)
  const r2 = rnd(e.seed * 53 + 3), m = lowQ ? 70 : 170;
  g.lineCap = "round";
  for (let i = 0; i < m; i++) {
    const x0 = r2() * (e.cols + 6) - 4, y0 = r2() * (e.rows + 6) - 4, spd = 1.1 + r2() * 1.2, ph = r2();
    const t = ((ms / 1000) * spd + ph) % 1;
    const p = P(x0 + t * 3, y0 + t * 1.2, 4 * (1 - t));
    const tw = 0.5 + 0.5 * Math.sin(ms / 90 + i);
    if (i % 3 === 0) {
      const q = P(x0 + t * 3 - 0.35, y0 + t * 1.2 - 0.14, 4 * (1 - t) + 0.12);
      g.strokeStyle = `rgba(255,255,255,${0.55 * a})`; g.lineWidth = Math.max(1, p[2] * 0.012); g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(p[0], p[1]); g.stroke();
    }
    const sz = Math.max(1.2, p[2] * (0.016 + (i % 3) * 0.008));
    g.fillStyle = `rgba(255,255,255,${(0.6 + 0.4 * tw) * a})`; g.beginPath(); g.arc(p[0], p[1], sz, 0, TAU); g.fill();
    if (i % 7 === 0) {
      g.strokeStyle = `rgba(220,245,255,${0.9 * tw * a})`; g.lineWidth = 1;
      g.beginPath(); g.moveTo(p[0] - sz * 4, p[1]); g.lineTo(p[0] + sz * 4, p[1]); g.moveTo(p[0], p[1] - sz * 4); g.lineTo(p[0], p[1] + sz * 4); g.stroke();
    }
  }
}

// ---------- Judgment Bolt ----------
//  ฟ้ามืดม่วง + เมฆพายุ → สายฟ้าโปรยทั่วกระดาน → สายฟ้ายักษ์ฟาดกลางกระดาน (แฟลชขาว + คลื่นกระแทก + รอยแตกเรือง + ไฟฟ้าวิ่งบนพื้น)
//  ผลลง (dvStrike): ฟาดช่องไฟทีละลูก — วงกระแทก + ไฟลุกพรึ่บ + สะเก็ดไฟ
// สายฟ้า (จุดจอ) จาก a ไป b — หยักสุ่มเปลี่ยนทุก ~55 ms (กะพริบ) · w = ความหนาแกน
function bolt(g, a, b, w, seed, ms, alpha) {
  const r = rnd(seed * 7919 + Math.floor(ms / 55));
  const n = 9, pts = [a];
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  for (let i = 1; i < n; i++) { const f = i / n, off = (r() - 0.5) * len * 0.12 * (1 - f * 0.5); pts.push([a[0] + dx * f + nx * off, a[1] + dy * f + ny * off]); }
  pts.push(b);
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
  g.lineCap = "round"; g.lineJoin = "round";
  path(); g.strokeStyle = `rgba(150,90,255,${0.35 * alpha})`; g.lineWidth = w * 5; g.stroke();
  path(); g.strokeStyle = `rgba(200,160,255,${0.7 * alpha})`; g.lineWidth = w * 2.2; g.stroke();
  path(); g.strokeStyle = `rgba(255,255,255,${alpha})`; g.lineWidth = w; g.stroke();
  // แขนงข้าง
  for (let k = 0; k < 2; k++) {
    if (r() > 0.75) continue;
    const i = 2 + ((r() * (n - 4)) | 0), [sx, sy] = pts[i];
    const ex = sx + (r() - 0.5) * len * 0.4, ey = sy + len * (0.1 + r() * 0.15);
    g.beginPath(); g.moveTo(sx, sy); g.lineTo((sx + ex) / 2 + (r() - 0.5) * 14, (sy + ey) / 2); g.lineTo(ex, ey);
    g.strokeStyle = `rgba(225,200,255,${0.75 * alpha})`; g.lineWidth = Math.max(1, w * 0.5); g.stroke();
  }
}
// เมฆพายุลอยเหนือกระดาน (ก้อนมืด · ฟ้าแลบ = ขอบม่วงสว่าง)
function stormClouds(g, e, ms, a, fl, lowQ) {
  const r = rnd(e.seed * 37 + 1), n = lowQ ? 9 : 18;
  for (let i = 0; i < n; i++) {
    const x = r() * (e.cols + 4) - 2 + Math.sin(ms / 2200 + i) * 0.6, y = r() * (e.rows + 4) - 2, p = P(x, y, 7 + r() * 2), rad = p[2] * (1.6 + r() * 1.4);
    const gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], rad);
    gr.addColorStop(0, `rgba(${Math.round(30 + 120 * fl)},${Math.round(16 + 80 * fl)},${Math.round(56 + 150 * fl)},${0.55 * a})`);
    gr.addColorStop(1, "rgba(20,10,40,0)");
    g.fillStyle = gr; g.fillRect(p[0] - rad, p[1] - rad, rad * 2, rad * 2);
  }
}
// ไฟฟ้าวิ่งบนพื้น (พิกัดกระดาน)
function groundArc(g, x0, y0, x1, y1, seed, ms, alpha) {
  const r = rnd(seed * 131 + Math.floor(ms / 45));
  g.beginPath();
  for (let i = 0; i <= 8; i++) {
    const f = i / 8, j = i % 8 ? 1 : 0;
    const p = P(x0 + (x1 - x0) * f + j * (r() - 0.5) * 0.35, y0 + (y1 - y0) * f + j * (r() - 0.5) * 0.35, 0.04);
    if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
  }
  g.strokeStyle = `rgba(170,120,255,${0.5 * alpha})`; g.lineWidth = 5; g.stroke();
  g.strokeStyle = `rgba(250,240,255,${alpha})`; g.lineWidth = 1.6; g.stroke();
}
const BIG_AT = 1050; // สายฟ้ายักษ์ฟาดกลางกระดาน (ms หลังเริ่มฉาก)
function boltSkyFx(g, e, u, ms, lowQ) {
  const a = env(u, 0.08, 0.25);
  tint(g, e, "16,6,34", 0.5 * a, 40);
  tint(g, e, "16,6,34", 0.3 * a);
  const fl = Math.max(0, Math.sin(ms / 60) * Math.sin(ms / 210)) * (ms < BIG_AT ? 1 : 0.4);
  stormClouds(g, e, ms, a, fl, lowQ);
  tint(g, e, "200,170,255", 0.18 * fl, 40);
  const cx = e.cols / 2, cy = e.rows / 2;
  // สายฟ้าโปรยทั่วกระดาน
  const r = rnd(e.seed * 211 + 5), n = lowQ ? 14 : 30;
  for (let i = 0; i < n; i++) {
    const x = r() * e.cols, y = r() * e.rows, t0 = r() * 2200, dx = (r() - 0.5) * 2, life = 240;
    const t = ms - t0;
    if (t < 0 || t > life) continue;
    const fade = 1 - t / life, b = P(x, y, 0), top = P(x + dx, y - 1.5, 11);
    bolt(g, top, b, Math.max(1.6, b[2] * 0.05), i + e.seed, ms, fade);
    glow(g, b[0], b[1], b[2] * 1.2, "190,140,255", 0.7 * fade);
    gEllipse(g, x, y, 0.2 + (1 - fade) * 0.8, 0.02, 24); g.strokeStyle = `rgba(230,210,255,${fade})`; g.lineWidth = 2; g.stroke();
  }
  // สายฟ้ายักษ์
  const bt = ms - BIG_AT, c0 = P(cx, cy, 0);
  if (bt > -260 && bt < 520) {
    const grow = clamp01((bt + 260) / 260), fade = bt < 0 ? 1 : 1 - bt / 520;
    bolt(g, P(cx, cy, 16), P(cx, cy, 16 * (1 - grow)), Math.max(6, c0[2] * 0.22) * Math.max(0.3, fade), 77, ms, fade);
  }
  if (bt < 0) return;
  const k = clamp01(bt / 1100);
  tint(g, e, "250,245,255", 0.9 * clamp01(1 - bt / 220), 40);
  for (let i = 0; i < 2; i++) {
    const q = clamp01(k * 1.3 - i * 0.2);
    if (q <= 0 || q >= 1) continue;
    gEllipse(g, cx, cy, 0.4 + easeOut(q) * Math.max(e.cols, e.rows) * 0.8, 0.03, 80);
    g.strokeStyle = `rgba(225,200,255,${0.9 * (1 - q)})`; g.lineWidth = 10 * (1 - q) + 2; g.stroke();
  }
  glow(g, c0[0], c0[1], c0[2] * 5, "210,170,255", 0.9 * (1 - k));
  // รอยแตกเรืองแผ่จากจุดฟาด
  const rc = rnd(e.seed * 19 + 2), cracks = lowQ ? 7 : 12, al = clamp01(1 - (bt - 600) / 900) * a;
  for (let i = 0; i < cracks; i++) {
    let an = (i / cracks) * TAU + rc() * 0.4, x = cx, y = cy;
    const len = (2 + rc() * 4) * easeOut(clamp01(bt / 350));
    g.beginPath(); let p = P(x, y, 0.02); g.moveTo(p[0], p[1]);
    for (let st = 0; st < 6; st++) { an += (rc() - 0.5) * 0.7; x += Math.cos(an) * len / 6; y += Math.sin(an) * len / 6; p = P(x, y, 0.02); g.lineTo(p[0], p[1]); }
    g.strokeStyle = `rgba(180,110,255,${0.6 * al})`; g.lineWidth = 6; g.stroke();
    g.strokeStyle = `rgba(255,220,180,${al})`; g.lineWidth = 2; g.stroke();
  }
  // ไฟฟ้าวิ่งบนพื้น
  const ra = rnd(e.seed * 23 + 9);
  for (let i = 0; i < (lowQ ? 5 : 10); i++) {
    const x0 = ra() * e.cols, y0 = ra() * e.rows, an = ra() * TAU, L = 1 + ra() * 2, t0 = ra() * 900, life = 260;
    const t = bt - t0;
    if (t < 0 || t > life) continue;
    groundArc(g, x0, y0, x0 + Math.cos(an) * L, y0 + Math.sin(an) * L, i + e.seed, ms, (1 - t / life) * a);
  }
}
function strikeFx(g, e, u, ms) {
  const n = e.size || 1, x = e.x + n / 2, y = e.y + n / 2;
  const b = P(x, y, 0), top = P(x + (((e.seed || 1) % 5) - 2) * 0.2, y - 1, 40);
  const hit = 0.16;
  if (u < 0.45) {
    const alpha = u < hit ? 1 : 1 - (u - hit) / (0.45 - hit);
    bolt(g, top, b, Math.max(e.big ? 4 : 2.2, b[2] * (e.big ? 0.1 : 0.055)), e.seed || 1, ms, alpha);
  }
  if (u < hit) return;
  const k = (u - hit) / (1 - hit);
  gEllipse(g, x, y, (e.big ? 0.5 : 0.25) + easeOut(k) * (e.big ? 1.8 : 0.9), 0.02, 32);
  g.strokeStyle = `rgba(230,210,255,${0.95 * (1 - k)})`; g.lineWidth = (e.big ? 5 : 3) * (1 - k) + 1; g.stroke();
  glow(g, b[0], b[1], b[2] * (e.big ? 2.6 : 1.4), "200,150,255", 0.9 * (1 - k));
  // ไฟลุกพรึ่บจากจุดฟาด
  const fh = Math.sin(Math.min(1, k * 1.6) * Math.PI) * (e.big ? 1.4 : 0.9);
  if (fh > 0.02) {
    const pt = P(x, y, fh), w = b[2] * (e.big ? 0.28 : 0.18);
    const gr = g.createLinearGradient(0, pt[1], 0, b[1]);
    gr.addColorStop(0, "rgba(255,240,180,0)"); gr.addColorStop(0.35, `rgba(255,170,60,${0.9 * (1 - k)})`); gr.addColorStop(1, `rgba(230,70,20,${0.95 * (1 - k)})`);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(b[0] - w, b[1]); g.quadraticCurveTo(b[0] - w * 0.6, (b[1] + pt[1]) / 2, pt[0], pt[1]); g.quadraticCurveTo(b[0] + w * 0.6, (b[1] + pt[1]) / 2, b[0] + w, b[1]); g.closePath(); g.fill();
  }
  // สะเก็ดไฟ/ประกายไฟฟ้า
  const r = rnd((e.seed || 1) * 61);
  for (let j = 0; j < (e.big ? 14 : 8); j++) {
    const an = r() * TAU, d = easeOut(k) * (0.4 + r() * 0.9), zz = Math.max(0, (0.3 + r() * 1.2) * Math.sin(Math.min(1, k * 1.2) * Math.PI));
    const p = P(x + Math.cos(an) * d, y + Math.sin(an) * d, zz);
    g.fillStyle = j % 3 ? `rgba(255,190,90,${1 - k})` : `rgba(235,215,255,${1 - k})`;
    g.beginPath(); g.arc(p[0], p[1], Math.max(1.2, p[2] * 0.03), 0, TAU); g.fill();
  }
}
