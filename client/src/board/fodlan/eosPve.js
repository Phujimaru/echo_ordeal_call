// ============================================================
//  ภาพของสนาม Eos — PVE: พื้น (pveGround/pve3Ground) · ป้ายมอน (นิสัย/หัวหน้า/ระดับ) · ราชาปีศาจ · ขบวนเสบียง · วิญญาณ · ภารกิจ · เกราะเสา
//  แยกออกจาก ./stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · stage6.js ยังส่งออกชื่อเดิมครบ
//  ⚠️ ห้ามเรียกของจาก ./index ตอนโหลดไฟล์ (index import stage6 — วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { P, gEllipse, quad } from "../boardGeo";
import { drawVitalBar } from "../boardDraw";
import { TAU, hash, img, daemonImg, glowAt, FAST } from "./eosBase";
import { sprite, screenFace, hpPips } from "./eosUnits";
import { emoji } from "./eosCamp";
import { puff } from "./eosFx";

// พื้น: วงไฟแคมป์ (กลางคืน — ปีศาจเข้าไม่ได้) · เส้นทางยักษ์หิน (เตือน = ทั้งเส้น · กำลังเดิน = แถบที่จะเหยียบเทิร์นหน้า)
export function pve3Ground(g, fd, now, lowQ) {
  if (fd.night && Array.isArray(fd.camps)) {
    const r = fd.lightR || 2;
    for (const c of fd.camps) {
      const [x, y, s] = P(c.x + 0.5, c.y + 0.5, 0.02);
      const fl = 0.85 + 0.15 * Math.sin(now / 170 + c.x) * Math.sin(now / 260 + c.y); // ไฟกะพริบ
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d > r) continue;
        quad(g, c.x + dx, c.y + dy, 0, 0.02); g.fillStyle = `rgba(255,170,80,${(0.2 - d * 0.055) * fl})`; g.fill();
      }
      glowAt(g, x, y, s * (r + 1.2), "255,180,100", 0.42 * fl);
    }
  }
  const gi = fd.giant;
  if (gi && Array.isArray(gi.path)) {
    const k = 0.5 + 0.5 * Math.sin(now / 200);
    if (gi.state === "warn") { // รอยเท้ายักษ์ทุก 2 ช่อง สลับซ้าย/ขวา
      gi.path.forEach((t, i) => {
        if (i % 2) return;
        const side = (i / 2) % 2 ? 0.28 : -0.28, ox = gi.axis === "x" ? 0 : side, oy = gi.axis === "x" ? side : 0;
        const [fx, fy, fs] = P(t.x + 0.5 + ox, t.y + 0.5 + oy, 0.02);
        g.save(); g.translate(fx, fy); g.scale(1, 0.45);
        g.fillStyle = `rgba(255,120,40,${0.22 + 0.18 * k})`; g.beginPath(); g.ellipse(0, 0, fs * 0.22, fs * 0.3, gi.axis === "x" ? Math.PI / 2 : 0, 0, TAU); g.fill();
        for (let j = -1; j <= 1; j++) { g.beginPath(); g.arc(j * fs * 0.1, -fs * 0.34, fs * 0.06, 0, TAU); g.fill(); }
        g.restore();
      });
    }
    for (const t of gi.next || []) { // พื้นที่จะโดนเหยียบ: สีส้มอุ่นกลางช่อง จางที่ขอบ + รอยร้าว
      const [qx, qy, qs] = P(t.x + 0.5, t.y + 0.5, 0.02);
      g.save(); g.translate(qx, qy); g.scale(1, 0.5);
      const gr = g.createRadialGradient(0, 0, qs * 0.05, 0, 0, qs * 0.62);
      gr.addColorStop(0, `rgba(255,110,40,${0.32 + 0.16 * k})`); gr.addColorStop(1, "rgba(255,110,40,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, qs * 0.62, 0, TAU); g.fill();
      g.strokeStyle = `rgba(255,170,90,${0.45 + 0.3 * k})`; g.lineWidth = 1.4;
      g.beginPath(); for (let j = 0; j < 3; j++) { const a = hash(t.x * 7 + j, t.y) * TAU; g.moveTo(0, 0); g.lineTo(Math.cos(a) * qs * 0.35, Math.sin(a) * qs * 0.35); } g.stroke();
      g.restore();
    }
  }
}
// ฉาก PVE รอบสาม (คืน true = วาดแล้ว)
export function pve3Fx(g, e, p, lowQ, units, out) {
  if (e.kind === "combo") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.9 + p * 0.6);
    for (let r = 0; r < 2; r++) { const k = Math.min(1, p * 1.6 - r * 0.25); if (k <= 0) continue; g.strokeStyle = `rgba(${r ? "255,210,90" : "120,220,255"},${1 - k})`; g.lineWidth = 4 * (1 - k) + 1; g.beginPath(); g.arc(x, y, s * (0.3 + k * 0.9), 0, TAU); g.stroke(); }
    emoji(g, "🤝", x, y - s * 0.2 - p * s * 0.4, Math.max(16, s * 0.45), 1 - p * p);
    return true;
  }
  if (e.kind === "power_turret") {
    for (const sh of e.shots || []) {
      const a = P(sh.from.x + 0.5, sh.from.y + 0.5, 1.1), b = P(sh.to.x + 0.5, sh.to.y + 0.5, 0.6), al = p < 0.35 ? 1 : Math.max(0, 1 - (p - 0.35) / 0.65);
      const k = Math.min(1, p / 0.25), hx = a[0] + (b[0] - a[0]) * k, hy = a[1] + (b[1] - a[1]) * k;
      g.strokeStyle = `rgba(120,220,255,${al})`; g.lineWidth = 3; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(hx, hy); g.stroke();
      glowAt(g, a[0], a[1], 22, "180,240,255", al * 0.8);
      if (k >= 1) glowAt(g, b[0], b[1], 34, "255,200,120", al * 0.9);
    }
    return true;
  }
  if (e.kind === "power_fountain") {
    for (const h of e.list || []) {
      const [x, y, s] = P(h.x + 0.5, h.y + 0.5, 0.3 + p * 1.2);
      if (!lowQ) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + p * 3; g.fillStyle = `rgba(140,215,255,${1 - p})`; g.beginPath(); g.ellipse(x + Math.cos(a) * s * 0.25, y + Math.sin(a) * s * 0.1 - i * 2, 2.5, 4, 0, 0, TAU); g.fill(); }
      glowAt(g, x, y, s * 0.5, "140,215,255", (1 - p) * 0.7);
    }
    return true;
  }
  if (e.kind === "nest_spawn" || e.kind === "final_wave" || e.kind === "nest_burst") {
    const rgb = e.kind === "final_wave" ? "255,40,70" : "200,50,170";
    for (const t of e.list || []) {
      const [x, y, s] = P(t.x + 0.5, t.y + 0.5), a = Math.sin(Math.min(1, p) * Math.PI);
      glowAt(g, x, y - s * 0.3, s * (0.6 + p), rgb, a * 0.8);
      if (e.kind === "nest_spawn") { g.fillStyle = `rgba(${rgb},${0.3 * a})`; g.fillRect(x - s * 0.2, y - s * 5, s * 0.4, s * 5); }
      else if (!lowQ) puff(g, t.x + 0.5, t.y + 0.5, 0.1, p, e.seq + t.x, 5, "70,10,60", 0.12);
    }
    return true;
  }
  if (e.kind === "giant_step" || e.kind === "giant_warn") {
    if (e.kind === "giant_step" && p < 0.25) out.flash = Math.max(out.flash || 0, 0.12 * (1 - p / 0.25));
    if (!lowQ) for (const t of (e.band || []).filter((_, i) => i % 2 === 0)) puff(g, t.x + 0.5, t.y + 0.5, 0.05, p, e.seq + t.x * 3 + t.y, 3, "150,130,100", 0.16);
    return true;
  }
  if (e.kind === "giant_die") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 1.2);
    glowAt(g, x, y, s * (1 + p * 3), "140,230,255", (1 - p) * 0.8);
    if (!lowQ) for (let i = 0; i < 22; i++) { const a = hash(i, e.seq) * TAU, d = s * p * (1 + hash(i, 2) * 2), fall = s * 2.2 * p * p; g.fillStyle = i % 3 ? "#857c6d" : "#5a5348"; g.fillRect(x + Math.cos(a) * d - 4, y + Math.sin(a) * d * 0.5 - s * 1.5 + fall, 8, 6); }
    if (p > 0.3) puff(g, e.x + 0.5, e.y + 0.5, 0.1, (p - 0.3) / 0.7, e.seq, lowQ ? 4 : 12, "160,145,120", 0.3);
    return true;
  }
  if (e.kind === "giant_leave") return true;
  if (e.kind === "perk_offer" || e.kind === "perk_pick") { if (e.kind === "perk_pick" && p < 0.3) out.flash = Math.max(out.flash || 0, 0.12 * (1 - p / 0.3)); return true; }
  if (e.kind === "wall_up" || e.kind === "wall_down") { if (!lowQ) puff(g, e.x + 0.5, e.y + 0.5, 0.05, p, e.seq, 6, "160,140,110", 0.14); return true; }
  if (e.kind === "gold_spawn" || e.kind === "gold_leave") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.6), a = Math.sin(Math.min(1, p) * Math.PI);
    glowAt(g, x, y, s * (0.6 + p * 1.2), "255,215,90", a * 0.9);
    if (e.kind === "gold_spawn") { g.fillStyle = `rgba(255,225,120,${0.35 * a})`; g.fillRect(x - s * 0.18, y - s * 5, s * 0.36, s * 5); }
    return true;
  }
  if (e.kind === "civ_spawn") {
    for (const t of e.list || []) { const [x, y, s] = P(t.x + 0.5, t.y + 0.5, 0.6); glowAt(g, x, y, s * (0.5 + p), "255,215,120", Math.sin(Math.min(1, p) * Math.PI) * 0.8); }
    return true;
  }
  if (e.kind === "civ_saved") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.6 + p * 2);
    glowAt(g, x, y, s * 0.8, "255,235,170", (1 - p) * 0.8);
    emoji(g, "🕊️", x, y, Math.max(18, s * 0.5), 1 - p * p);
    return true;
  }
  if (e.kind === "civ_lost") { const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.5); glowAt(g, x, y, s * 0.7, "180,180,190", (1 - p) * 0.6); return true; }
  if (e.kind === "civ_follow" || e.kind === "gauge_full") return true;
  if (e.kind === "barrage") {
    const tiles = e.tiles || [];
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i], d = hash(i, e.seq) * 0.35, k = (p - d) / 0.35;
      if (k < 0) continue;
      const [x, y, s] = P(t.x + 0.5, t.y + 0.5);
      if (k < 1) { const top = P(t.x + 0.5 - 1.2 * (1 - k), t.y + 0.5 - 0.6 * (1 - k), 9 * (1 - k)); g.strokeStyle = "rgba(255,210,120,.9)"; g.lineWidth = Math.max(2, s * 0.08); g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(top[0] + (x - top[0]) * 0.25, top[1] + (y - top[1]) * 0.25); g.stroke(); glowAt(g, top[0], top[1], s * 0.3, "255,230,160", 0.9); }
      else { const q = Math.min(1, k - 1); glowAt(g, x, y, s * (0.5 + q * 0.6), "255,150,60", (1 - q) * 0.85); }
    }
    if (p > 0.3 && p < 0.5) out.flash = Math.max(out.flash || 0, 0.18);
    return true;
  }
  if (e.kind === "final_start") {
    if (p < 0.4) out.flash = Math.max(out.flash || 0, 0.25 * (1 - p / 0.4));
    return true;
  }
  void units;
  return false;
}
// =================================================================== PVE รอบสอง: ภาพของระบบใหม่
export const TRAIT_LOOK = { bomber: { rgb: "255,110,30" }, healer: { rgb: "90,255,150" }, archer: { rgb: "255,210,90" }, shield: { rgb: "120,170,255" }, weaver: { rgb: "235,235,235" }, blinker: { rgb: "190,90,255" }, hooker: { rgb: "170,170,190" }, rune: { rgb: "255,70,200" }, swarm: { rgb: "255,90,90" }, splitter: { rgb: "200,150,90" }, splitling: { rgb: "200,150,90" } };
// มอนรูปแบบใหม่ (server/fodlan/eosMobs.js — 2026-11-12): ไอคอนลอยเหนือหัว + โล่ฝั่งที่หัน
const TRAIT_ICON = { archer: "🏹", shield: "🛡️", weaver: "🕸️", blinker: "👻", hooker: "⛓️", rune: "🔮", splitter: "🪨", splitling: "🪨", swarm: "🐝", bomber: "💣", healer: "💚", sniper: "🎯", mech: "🦾" };
export function drawTraitMark(g, m, cx, cy, h, now, lowQ) {
  const tr = m.trait;
  if (tr === "shield" && m.face) { // โล่ใหญ่ฝั่งที่หัน (ตีจากฝั่งนี้เหลือ 1)
    const a = P(cx + m.face.dx * 0.42 - m.face.dy * 0.3, cy + m.face.dy * 0.42 - m.face.dx * 0.3, 0.05), b = P(cx + m.face.dx * 0.42 + m.face.dy * 0.3, cy + m.face.dy * 0.42 + m.face.dx * 0.3, 0.05);
    const a2 = P(cx + m.face.dx * 0.42 - m.face.dy * 0.3, cy + m.face.dy * 0.42 - m.face.dx * 0.3, 0.95), b2 = P(cx + m.face.dx * 0.42 + m.face.dy * 0.3, cy + m.face.dy * 0.42 + m.face.dx * 0.3, 0.95);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(b2[0], b2[1]); g.lineTo(a2[0], a2[1]); g.closePath();
    g.fillStyle = "rgba(90,140,230,.35)"; g.fill(); g.strokeStyle = "rgba(170,210,255,.9)"; g.lineWidth = 2.5; g.stroke();
  }
  // ไอคอนความสามารถย้ายไปอยู่ในแถวป้ายเหนือหลอดเลือด (mobBadges — ผู้ใช้ 2026-11-14)
}
// ท่าใหญ่ราชาปีศาจ (server/fodlan/eosBoss.js — 2026-11-12): ช่องม่วงกะพริบ + ลวดลายตามท่า
export const BIG_RGB = { beam: "190,60,255", ring: "255,50,150", meteor: "255,110,40", dark: "110,40,200", dark_zone: "60,10,110" };
function bigQuad(g, t, z = 0.02) { const c = [P(t.x + 0.05, t.y + 0.05, z), P(t.x + 0.95, t.y + 0.05, z), P(t.x + 0.95, t.y + 0.95, z), P(t.x + 0.05, t.y + 0.95, z)]; g.beginPath(); c.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); }
function drawBigWarn(g, bb, now, lowQ) {
  if (bb.kind === "dark_zone") { // เขตทมิฬค้าง: พื้นมืดม่วง + หมอกวน (ไม่กะพริบ = ไม่ใช่คำเตือน)
    for (const t of bb.tiles || []) {
      bigQuad(g, t, 0.015); g.fillStyle = "rgba(40,0,85,.62)"; g.fill(); g.strokeStyle = `rgba(160,80,255,${0.45 + 0.15 * Math.sin(now / 400)})`; g.lineWidth = 1.5; g.stroke();
      if (!lowQ) { const [x, y, s] = P(t.x + 0.5, t.y + 0.5, 0.25 + 0.1 * Math.sin(now / 500 + t.x * 1.7 + t.y)); glowAt(g, x, y, s * 0.5, "120,40,220", 0.3); }
    }
    return;
  }
  const rgb = BIG_RGB[bb.kind] || BIG_RGB.beam, k = 0.5 + 0.5 * Math.sin(now / 110);
  for (const t of bb.tiles || []) {
    bigQuad(g, t);
    g.fillStyle = `rgba(${rgb},${0.18 + 0.16 * k})`; g.fill();
    g.strokeStyle = `rgba(${rgb},${0.55 + 0.4 * k})`; g.lineWidth = 2; g.stroke();
  }
  if (bb.kind === "beam" && bb.dir && bb.tiles && bb.tiles.length && !lowQ) { // ลูกศรไหลตามแนวลำแสง
    const mid = bb.tiles.filter((_, i) => i % 3 === 1);
    mid.forEach((t, i) => {
      const ph = ((now / 600 + i * 0.12) % 1), cx = t.x + 0.5 + bb.dir.dx * (ph - 0.5) * 0.6, cy = t.y + 0.5 + bb.dir.dy * (ph - 0.5) * 0.6;
      const a = P(cx - bb.dir.dx * 0.18 - bb.dir.dy * 0.18, cy - bb.dir.dy * 0.18 - bb.dir.dx * 0.18, 0.04), b = P(cx + bb.dir.dx * 0.18, cy + bb.dir.dy * 0.18, 0.04), c = P(cx - bb.dir.dx * 0.18 + bb.dir.dy * 0.18, cy - bb.dir.dy * 0.18 + bb.dir.dx * 0.18, 0.04);
      g.strokeStyle = `rgba(235,190,255,${0.8 * Math.sin(ph * Math.PI)})`; g.lineWidth = 3; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.stroke();
    });
  }
  for (const c of bb.centers || []) { // เป้าอุกกาบาต: วงซ้อนหมุน + เงาที่ใหญ่ขึ้น
    const [x, y, s] = P(c.x + 0.5, c.y + 0.5, 0.03);
    g.save(); g.translate(x, y); g.scale(1, 0.42); if (!lowQ) g.rotate(now / 500);
    g.strokeStyle = `rgba(255,160,60,${0.6 + 0.35 * k})`; g.lineWidth = 3; g.setLineDash([s * 0.2, s * 0.12]); g.beginPath(); g.arc(0, 0, s * 1.3, 0, TAU); g.stroke(); g.setLineDash([]);
    g.fillStyle = `rgba(40,10,0,${0.25 + 0.15 * k})`; g.beginPath(); g.arc(0, 0, s * (0.5 + 0.3 * k), 0, TAU); g.fill();
    g.restore();
  }
}
// มอนหัวหน้า (server/fodlan/eosElite.js — 2026-11-12): วงทองหมุนใต้เท้า + มงเล็ก + ไอคอนคุณสมบัติเหนือหลอดเลือด
const ELITE_ICON = { swift: "💨", armored: "🪨", vampiric: "🩸", volatile: "💥", commander: "🚩", regen: "✚", thorns: "🌵" };
export function eliteRing(g, cx, cy, now, lowQ) {
  const [sx, sy, s] = P(cx, cy - 0.05, 0.02);
  const k = 0.7 + 0.3 * Math.sin(now / 260);
  g.save(); g.translate(sx, sy); g.scale(1, 0.42);
  const gr = g.createRadialGradient(0, 0, s * 0.15, 0, 0, s * 0.75);
  gr.addColorStop(0, `rgba(255,215,90,${0.4 * k})`); gr.addColorStop(1, "rgba(255,170,40,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s * 0.75, 0, TAU); g.fill();
  g.strokeStyle = `rgba(255,220,110,${0.85 * k})`; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, s * 0.55, 0, TAU); g.stroke();
  if (!lowQ) { g.rotate(now / 700); g.setLineDash([s * 0.12, s * 0.1]); g.strokeStyle = `rgba(255,240,170,${0.7 * k})`; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, s * 0.66, 0, TAU); g.stroke(); g.setLineDash([]); }
  g.restore();
  glowAt(g, sx, sy - s * 0.7, s * 1.0, "255,200,70", 0.25 * k);
}
// แถวป้ายเหนือหลอดเลือดของมอน (ผู้ใช้สั่ง 2026-11-14 "ใช้ icon ลอยเหนือหัวมอน บอกว่าเป็นระดับอะไร มีความสามารถอะไร")
//  [ระดับ I/II/III… สีตามระดับ] [ไอคอนความสามารถ] [มง + ไอคอนหัวหน้า] เรียงกลาง ชิดเหนือหลอดเลือด · ขนาดตาม UK (ห้ามขั้นต่ำเป็นพิกเซล)
const TIER_COL = ["#c08a5a", "#c9d4e2", "#f0c868", "#ff6a5a"]; // I ทองแดง · II เงิน · III ทอง · IV+ แดง
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
export function mobBadges(g, m, top, now, lowQ, threat = false) {
  const UK = Math.max(0.35, (top[2] || 1) * 0.0085), fs = 17 * UK, y = top[1] - 13 * UK, gap = 3 * UK; // ใหญ่พอให้อ่านออกตอนซูมปกติ
  if (threat) { // ❗ ตีถึงตัวเราได้เทิร์นหน้า (BoardStage threatIds — ผู้ใช้ 2026-11-14) · ลอยเหนือแถวป้าย
    const k = lowQ ? 1 : 0.75 + 0.25 * Math.sin(now / 160), ty = y - fs * 1.35, r = fs * 0.62;
    g.save(); g.fillStyle = `rgba(225,40,40,${0.9 * k + 0.1})`; g.beginPath(); g.arc(top[0], ty, r, 0, TAU); g.fill();
    g.strokeStyle = "rgba(255,235,235,.95)"; g.lineWidth = Math.max(0.8, 1.6 * UK); g.stroke();
    g.fillStyle = "#fff"; g.font = `800 ${fs * 0.95}px "Chakra Petch", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", top[0], ty + fs * 0.04); g.restore();
  }
  const tier = Math.max(1, m.tier | 0), roman = ROMAN[Math.min(ROMAN.length, tier) - 1];
  g.save(); g.font = `700 ${fs * 0.78}px "Chakra Petch", sans-serif`;
  const items = !m.type || m.type === "daemon" || m.type === "magitek" ? [{ kind: "tier", w: Math.max(fs * 1.25, g.measureText(roman).width + fs * 0.55) }] : []; // สัตว์ยักษ์ไม่มีระดับ
  if (TRAIT_ICON[m.trait]) items.push({ kind: "trait", w: fs * 1.15 });
  if (m.elite && m.elite.length) { items.push({ kind: "crown", w: fs * 1.0 }); for (const a of m.elite) items.push({ kind: "elite", a, w: fs * 1.1 }); }
  let x = top[0] - (items.reduce((n, it) => n + it.w, 0) + gap * (items.length - 1)) / 2;
  for (const it of items) {
    const cx = x + it.w / 2;
    if (it.kind === "tier") {
      const col = TIER_COL[Math.min(TIER_COL.length, tier) - 1], h = fs * 1.0;
      g.fillStyle = "rgba(14,20,34,.85)"; g.strokeStyle = col; g.lineWidth = Math.max(0.6, 1.2 * UK);
      g.beginPath(); g.roundRect ? g.roundRect(x, y - h / 2, it.w, h, h * 0.3) : g.rect(x, y - h / 2, it.w, h); g.fill(); g.stroke();
      g.fillStyle = col; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(roman, cx, y + fs * 0.03);
    } else if (it.kind === "crown") drawCrown(g, cx, y + 3 * UK, 5 * UK, now, true);
    else {
      const ic = it.kind === "trait" ? TRAIT_ICON[m.trait] : ELITE_ICON[it.a] || "★";
      const rgb = it.kind === "trait" ? (TRAIT_LOOK[m.trait] || {}).rgb || "255,255,255" : "255,200,70";
      glowAt(g, cx, y, fs * 0.7, rgb, lowQ ? 0.3 : 0.35 + 0.1 * Math.sin(now / 300 + x));
      g.save(); g.globalAlpha = it.kind === "trait" && m.cd ? 0.45 : 1; g.font = fs + 'px "Segoe UI Emoji", sans-serif'; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(ic, cx, y); g.restore();
    }
    x += it.w + gap;
  }
  g.restore();
}
// ราชาปีศาจ: ร่างใหญ่ 2.6 ช่อง · ออร่าแดงม่วงหมุน · มงกุฎเรือง · หลอดเลือดใหญ่
export function drawBoss(g, d, cx, cy, sx, sy, s, now, lowQ, breathe) {
  g.save(); g.translate(sx, sy); g.scale(1, 0.4);
  const gr = g.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 1.4);
  gr.addColorStop(0, "rgba(255,40,80,.55)"); gr.addColorStop(1, "rgba(120,0,90,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s * 1.4, 0, TAU); g.fill();
  if (!lowQ) { g.rotate(now / 900); g.strokeStyle = "rgba(255,80,110,.5)"; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, s * 1.05, 0, TAU); g.stroke(); g.setLineDash([]); }
  g.restore();
  glowAt(g, sx, sy - s * 1.2, s * 1.8, "200,20,90", 0.45 + 0.1 * Math.sin(now / 300));
  sprite(g, daemonImg(4), cx, cy, breathe * 2, 2.6, false);
  const top = P(cx, cy, 2.95), UK = Math.max(0.5, s * 0.012);
  drawVitalBar(g, top[0], top[1], s * 1.4, { hp: d.hp, maxHp: Math.max(1, d.maxHp), armor: d.armor, maxArmor: Math.max(d.armor || 0, d.maxArmor || 0) }, UK);
  drawCrown(g, top[0], top[1] - 6 * UK + (lowQ ? 0 : Math.sin(now / 500) * 1.5 * UK), 15 * UK, now, lowQ); // มงลอยเหนือหลอด (ผู้ใช้ 2026-11-10 "มงไม่ค่อยสวย" — เดิมแบนทับหลังหลอด)
}
// มงกุฎราชาปีศาจ: ทองไล่เฉด + ขอบเข้ม + ฐานคาดแถบ + อัญมณีแดงกลาง + ปลายแหลมมีลูกแก้ว · w = ครึ่งความกว้าง
function drawCrown(g, x, y, w, now, lowQ) {
  const h = w * 1.05, base = w * 0.36;
  glowAt(g, x, y - h * 0.45, w * 2.2, "255,200,80", 0.35 + (lowQ ? 0 : 0.1 * Math.sin(now / 400)));
  g.save(); g.translate(x, y);
  const body = () => {
    g.beginPath();
    g.moveTo(-w, 0); g.lineTo(-w, -base);
    g.lineTo(-w * 1.05, -h * 0.95); g.lineTo(-w * 0.5, -h * 0.5); // แหลมซ้าย
    g.lineTo(0, -h * 1.2); // แหลมกลาง
    g.lineTo(w * 0.5, -h * 0.5); g.lineTo(w * 1.05, -h * 0.95); // แหลมขวา
    g.lineTo(w, -base); g.lineTo(w, 0); g.closePath();
  };
  const gr = g.createLinearGradient(0, -h * 1.2, 0, 0);
  gr.addColorStop(0, "#fff3b0"); gr.addColorStop(0.45, "#ffcc3a"); gr.addColorStop(1, "#b9780c");
  body(); g.fillStyle = gr; g.fill();
  g.lineJoin = "round"; g.lineWidth = Math.max(1.2, w * 0.12); g.strokeStyle = "#5a3606"; g.stroke();
  // ฐานคาดแถบ
  g.fillStyle = "#8f5a0a"; g.fillRect(-w, -base, w * 2, base * 0.42);
  g.fillStyle = "rgba(255,240,180,.55)"; g.fillRect(-w * 0.92, -base * 0.98, w * 1.84, base * 0.12);
  // ลูกแก้วปลายแหลม
  for (const [px, py, r] of [[-w * 1.05, -h * 0.95, w * 0.14], [0, -h * 1.2, w * 0.16], [w * 1.05, -h * 0.95, w * 0.14]]) {
    g.fillStyle = "#fff6cf"; g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill(); g.strokeStyle = "#5a3606"; g.lineWidth = Math.max(1, w * 0.08); g.stroke();
  }
  // อัญมณีแดงกลาง + เพชรข้าง
  const gem = (gx, gy, r, c1, c2) => { g.beginPath(); g.moveTo(gx, gy - r); g.lineTo(gx + r * 0.8, gy); g.lineTo(gx, gy + r); g.lineTo(gx - r * 0.8, gy); g.closePath(); const q = g.createLinearGradient(gx, gy - r, gx, gy + r); q.addColorStop(0, c1); q.addColorStop(1, c2); g.fillStyle = q; g.fill(); g.strokeStyle = "#3a1a04"; g.lineWidth = Math.max(0.8, w * 0.06); g.stroke(); };
  gem(0, -base * 1.55, w * 0.3, "#ff8a9a", "#a3001f");
  gem(-w * 0.6, -base * 1.25, w * 0.17, "#9fe8ff", "#1f6fa8");
  gem(w * 0.6, -base * 1.25, w * 0.17, "#9fe8ff", "#1f6fa8");
  if (!lowQ) { const k = (now / 1400) % 1; g.fillStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; g.beginPath(); g.arc(-w * 0.2 + k * w * 0.1, -base * 1.75, w * 0.07, 0, TAU); g.fill(); } // ประกายวิบ
  g.restore();
}
// รถเสบียง: รถบรรทุกภาพผู้ใช้ (car2) + ลังเสบียง + ธงคุ้มกัน · หลอดเลือดฟ้า
export function drawConvoy(g, cx, cy, head, c, now, night, lowQ) {
  const im = img("/eos/img/car2.webp");
  const [sx, sy, s] = P(cx, cy + 0.12);
  const flip = screenFace(cx, cy, head) > 0;
  glowAt(g, sx, sy - s * 0.3, s * 1.2, "255,200,90", 0.25 + 0.1 * Math.sin(now / 400));
  g.fillStyle = "rgba(0,0,0,.4)"; g.beginPath(); g.ellipse(sx, sy - s * 0.03, s * 0.7, s * 0.22, 0, 0, TAU); g.fill();
  const w = s * 1.6, h = im ? w * (im.naturalHeight / im.naturalWidth) : s * 0.8;
  g.save(); g.translate(sx, sy); if (flip) g.scale(-1, 1);
  if (im) g.drawImage(im, -w / 2, -h, w, h);
  // แร็คหลังคา + ลังสินค้ามัดสายรัด (วาดในพิกัดของภาพรถ — ติดไปกับรถ ไม่ลอย · ผู้ใช้ 2026-11-10 "กล่องลอยแปลกๆ ให้แปะไปกับรถ")
  const roofY = -h * 0.93, rx0 = -w * 0.12, rx1 = w * 0.3;
  g.fillStyle = "#26282c"; g.fillRect(rx0, roofY - 2, rx1 - rx0, 3);
  for (const fx of [rx0 + 4, rx1 - 6]) g.fillRect(fx, roofY - 2, 2.5, h * 0.05);
  const cw = (rx1 - rx0) / 2.6, ch = cw * 0.72;
  const crate = (x, y, ww, hh, tone) => {
    g.fillStyle = tone; g.fillRect(x, y - hh, ww, hh);
    g.fillStyle = "rgba(255,255,255,.14)"; g.fillRect(x, y - hh, ww, hh * 0.22);
    g.strokeStyle = "#5a3a12"; g.lineWidth = 1.2; g.strokeRect(x + 0.5, y - hh + 0.5, ww - 1, hh - 1);
    g.beginPath(); g.moveTo(x + 1, y - hh + 1); g.lineTo(x + ww - 1, y - 1); g.stroke();
  };
  crate(rx0 + cw * 0.15, roofY - 2, cw, ch, "#b47a34");
  crate(rx0 + cw * 1.2, roofY - 2, cw * 0.95, ch * 0.9, "#c98b3c");
  crate(rx0 + cw * 0.65, roofY - 2 - ch * 0.88, cw * 0.9, ch * 0.8, "#d69a48");
  g.strokeStyle = "rgba(40,30,20,.85)"; g.lineWidth = 2; // สายรัด
  g.beginPath(); g.moveTo(rx0 + cw * 0.55, roofY); g.lineTo(rx0 + cw * 1.1, roofY - ch * 1.7); g.lineTo(rx0 + cw * 1.65, roofY); g.stroke();
  // ธงเสบียงปักท้ายแร็ค
  const px = rx1 - 3, wave = lowQ ? 0 : Math.sin(now / 200) * 3;
  g.strokeStyle = "#ddd"; g.lineWidth = 2; g.beginPath(); g.moveTo(px, roofY); g.lineTo(px, roofY - h * 0.75); g.stroke();
  g.fillStyle = "#7fd4ff"; g.beginPath(); g.moveTo(px, roofY - h * 0.75); g.lineTo(px + w * 0.16, roofY - h * 0.68 + wave); g.lineTo(px, roofY - h * 0.58); g.closePath(); g.fill();
  g.restore();
  hpPips(g, cx, cy, 1.55, c.hp, c.maxHp, c.armor, c.maxArmor, "ally"); // รถเสบียง = ฝ่ายเรา หลอดเขียว
  void night;
}
// ดวงวิญญาณเพื่อนที่ล้ม: เปลวฟ้าลอย + วงรอบ (ถูกช่วยแล้ว = ทอง)
export function drawSpirit(g, sp, now, lowQ) {
  const cx = sp.x + 0.5, cy = sp.y + 0.5, f = lowQ ? 0 : Math.sin(now / 380 + sp.x) * 0.08;
  const [bx, by, s] = P(cx, cy, 0.02), rgb = sp.helped ? "255,215,110" : "140,210,255";
  g.save(); g.translate(bx, by); g.scale(1, 0.4); g.strokeStyle = `rgba(${rgb},.7)`; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, s * 0.42, 0, TAU); g.stroke(); g.restore();
  const t0 = P(cx, cy, 0.7 + f);
  glowAt(g, t0[0], t0[1], s * 0.6, rgb, 0.7);
  g.fillStyle = `rgba(${rgb},.95)`; g.beginPath(); g.moveTo(t0[0], t0[1] - s * 0.3); g.quadraticCurveTo(t0[0] + s * 0.16, t0[1], t0[0], t0[1] + s * 0.14); g.quadraticCurveTo(t0[0] - s * 0.16, t0[1], t0[0], t0[1] - s * 0.3); g.fill();
}
// จุดสัญญาณภารกิจสำรวจ: เสาวิทยุโครงเหล็กบนแท่นปูน + จานรับสัญญาณ + ไฟแดงกะพริบยอด + คลื่นวิทยุแผ่ออก + ลำแสงทองบอกตำแหน่งจากไกล
//  (ผู้ใช้ 2026-11-10 "มีแค่นี่หรอที่ส่งสัญญาณ" — เดิมมีแค่ลำแสง + วง + อีโมจิ)
export function drawBeacon(g, q, now, lowQ) {
  const cx = q.x + 0.5, cy = q.y + 0.5, [bx, by, s] = P(cx, cy, 0);
  // วงพื้นหมุน (ทอง) + ขีดมุม 4 ทิศ
  g.save(); g.translate(bx, by); g.scale(1, 0.42); if (!lowQ) g.rotate(now / 1600);
  g.strokeStyle = "rgba(255,220,120,.8)"; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, s * 0.46, 0, TAU); g.stroke();
  g.lineWidth = 4; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; g.beginPath(); g.arc(0, 0, s * 0.56, a - 0.18, a + 0.18); g.stroke(); }
  g.restore();
  // ลำแสงทองสูง (เห็นจากไกล — อ่อนลงให้ตัวเสาเด่น)
  const top = P(cx, cy, 6), a = 0.16 + 0.08 * Math.sin(now / 300);
  const gr = g.createLinearGradient(bx, by, top[0], top[1]);
  gr.addColorStop(0, `rgba(255,225,140,${a + 0.12})`); gr.addColorStop(1, "rgba(255,225,140,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(bx - s * 0.2, by); g.lineTo(top[0] - s * 0.05, top[1]); g.lineTo(top[0] + s * 0.05, top[1]); g.lineTo(bx + s * 0.2, by); g.closePath(); g.fill();
  // แท่นปูน (กล่องเตี้ย)
  const r = 0.2, hB = 0.16;
  const c0 = [[cx - r, cy - r], [cx + r, cy - r], [cx + r, cy + r], [cx - r, cy + r]];
  const lo = c0.map(([x, y]) => P(x, y, 0)), hi = c0.map(([x, y]) => P(x, y, hB));
  const side = (i, col) => { const j = (i + 1) % 4; g.fillStyle = col; g.beginPath(); g.moveTo(lo[i][0], lo[i][1]); g.lineTo(lo[j][0], lo[j][1]); g.lineTo(hi[j][0], hi[j][1]); g.lineTo(hi[i][0], hi[i][1]); g.closePath(); g.fill(); };
  for (let i = 0; i < 4; i++) side(i, i % 2 ? "#5d6670" : "#77818c");
  g.fillStyle = "#9aa5b1"; g.beginPath(); hi.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
  // เสาโครงเหล็ก: 4 ขาสอบขึ้นยอด + คานไขว้
  const H = 1.9, legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const at = (z) => { const w = 0.13 * (1 - z / H) + 0.025; return legs.map(([dx, dy]) => P(cx + dx * w, cy + dy * w, hB + z)); };
  g.strokeStyle = "#c7cdd4"; g.lineWidth = Math.max(1.2, s * 0.03); g.lineCap = "round";
  const bot = at(0), tp = at(H - hB);
  g.beginPath(); for (let i = 0; i < 4; i++) { g.moveTo(bot[i][0], bot[i][1]); g.lineTo(tp[i][0], tp[i][1]); } g.stroke(); // ขาเสา 4 ขา (ขีดครั้งเดียว)
  if (!FAST && !lowQ) { // คานไขว้ (ข้ามระหว่างกล้องขยับ / โหมดประหยัด)
    g.lineWidth = Math.max(0.8, s * 0.016); g.strokeStyle = "rgba(200,206,214,.75)"; g.beginPath();
    for (let k = 0; k < 4; k++) {
      const z0 = (H - hB) * k / 4, z1 = (H - hB) * (k + 1) / 4, A = at(z0), B = at(z1);
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; g.moveTo(A[i][0], A[i][1]); g.lineTo(B[j][0], B[j][1]); g.moveTo(A[j][0], A[j][1]); g.lineTo(B[i][0], B[i][1]); }
    }
    g.stroke();
  }
  // จานรับสัญญาณ (หันตามเวลาเล็กน้อย)
  const dz = hB + H * 0.62, dp = P(cx, cy, dz), ang = lowQ ? 0.4 : 0.4 + Math.sin(now / 1800) * 0.5;
  g.save(); g.translate(dp[0] + Math.cos(ang) * s * 0.12, dp[1]); g.rotate(-0.5 + ang * 0.3);
  g.fillStyle = "#e9edf2"; g.beginPath(); g.ellipse(0, 0, s * 0.15, s * 0.07, 0, 0, TAU); g.fill();
  g.fillStyle = "#b8c0c9"; g.beginPath(); g.ellipse(-s * 0.02, 0, s * 0.1, s * 0.045, 0, 0, TAU); g.fill();
  g.strokeStyle = "#8a939d"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(s * 0.12, -s * 0.03); g.stroke();
  g.restore();
  // ไฟยอดกะพริบ + คลื่นวิทยุ 3 วงแผ่ออก
  const tip = P(cx, cy, hB + H + 0.05), blink = lowQ ? 1 : (Math.sin(now / 260) > 0 ? 1 : 0.35);
  g.strokeStyle = "#c7cdd4"; g.lineWidth = Math.max(1, s * 0.022); g.beginPath(); g.moveTo(tp[0][0] * 0.5 + tp[2][0] * 0.5, tp[0][1] * 0.5 + tp[2][1] * 0.5); g.lineTo(tip[0], tip[1]); g.stroke();
  glowAt(g, tip[0], tip[1], s * 0.35, "255,70,70", 0.55 * blink);
  g.fillStyle = `rgba(255,${blink > 0.5 ? 90 : 40},${blink > 0.5 ? 90 : 40},1)`; g.beginPath(); g.arc(tip[0], tip[1], Math.max(2, s * 0.045), 0, TAU); g.fill();
  if (!lowQ) for (let i = 0; i < 3; i++) {
    const f = ((now / 1500) + i / 3) % 1, rr = s * (0.15 + f * 0.75);
    g.strokeStyle = `rgba(255,225,140,${(1 - f) * 0.75})`; g.lineWidth = 2;
    g.beginPath(); g.arc(tip[0], tip[1], rr, -Math.PI * 0.85, -Math.PI * 0.55); g.stroke();
    g.beginPath(); g.arc(tip[0], tip[1], rr, -Math.PI * 0.45, -Math.PI * 0.15); g.stroke();
  }
  // ป้ายนับเทิร์นที่เหลือ
  if (q.left != null) {
    const lp = P(cx, cy, hB + H + 0.55), w = Math.max(18, s * 0.42), h = Math.max(13, s * 0.26);
    g.fillStyle = "rgba(20,26,40,.88)"; g.beginPath(); g.roundRect(lp[0] - w / 2, lp[1] - h / 2, w, h, h / 2); g.fill();
    g.strokeStyle = "rgba(255,220,120,.9)"; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = "#ffe08a"; g.font = `700 ${Math.round(h * 0.72)}px "Chakra Petch", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(`📡${q.left}`, lp[0], lp[1] + 0.5);
  }
}
// โล่เสา: วงหกเหลี่ยมฟ้ารอบเสา (ชั้นละวง)
export function drawWard(g, pl, now) {
  const cx = pl.x + 0.5, cy = pl.y + 0.5;
  for (let i = 0; i < (pl.ward || 0); i++) {
    const z = 0.5 + i * 0.55, [x, y, s] = P(cx, cy, z), r = s * (0.62 + i * 0.06);
    g.strokeStyle = `rgba(140,220,255,${0.75 - i * 0.15})`; g.lineWidth = 2.5;
    g.beginPath();
    for (let k = 0; k <= 6; k++) { const a = k / 6 * TAU + now / 1500 * (i ? -1 : 1); const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.42; if (k) g.lineTo(px, py); else g.moveTo(px, py); }
    g.stroke();
  }
}
// พื้น: วงเวทเตือนบอส · กรอบโซนภารกิจกวาดล้าง · เส้นทางรถเสบียง
export function pveGround(g, fd, now, lowQ) {
  const sk = fd.sky || {};
  for (const t of (sk.meteor && sk.meteor.tiles) || []) { // จุดตกอุกกาบาต: วงส้มแดงซ้อน + กากบาท (ตกต้นเทิร์นหน้า ดาเมจ 3 · ข้างๆ 1)
    const k = 0.5 + 0.5 * Math.sin(now / 150), [x, y, s] = P(t.x + 0.5, t.y + 0.5, 0.02);
    g.save(); g.translate(x, y); g.scale(1, 0.42);
    g.fillStyle = `rgba(255,90,30,${0.12 + 0.1 * k})`; g.beginPath(); g.arc(0, 0, s * 1.5, 0, TAU); g.fill();
    g.strokeStyle = `rgba(255,120,40,${0.55 + 0.35 * k})`; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, s * 0.55, 0, TAU); g.stroke();
    g.strokeStyle = `rgba(255,170,80,${0.35 + 0.2 * k})`; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, s * 1.5, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.3, -s * 0.3); g.lineTo(s * 0.3, s * 0.3); g.moveTo(s * 0.3, -s * 0.3); g.lineTo(-s * 0.3, s * 0.3); g.stroke();
    g.restore();
  }
  if (sk.supply) { const [x, y, s] = P(sk.supply.x + 0.5, sk.supply.y + 0.5, 0.02), k = 0.5 + 0.5 * Math.sin(now / 300); gEllipse(g, sk.supply.x + 0.5, sk.supply.y + 0.5, 1.6, 0.02, 30); g.strokeStyle = `rgba(255,210,110,${0.5 + 0.4 * k})`; g.lineWidth = 2.5; g.stroke(); glowAt(g, x, y, s * 1.2, "255,210,110", 0.25 + 0.15 * k); }
  const lm = fd.lament; // Lament: วงเรียกผู้คร่ำครวญ · แนวน้ำตาสวรรค์ (ช่องฟ้าเรือง — ตกต้นเทิร์นหน้า ดาเมจ 4)
  if (lm && lm.warn) {
    const [x, y, s] = P(lm.warn.x + 0.5, lm.warn.y + 0.5, 0.02), k = 0.5 + 0.5 * Math.sin(now / 200);
    g.save(); g.translate(x, y); g.scale(1, 0.42); if (!lowQ) g.rotate(-now / 900);
    for (const [r, a] of [[2.2, 0.9], [1.5, 0.6], [0.8, 0.4]]) { g.strokeStyle = `rgba(140,80,255,${a * (0.6 + 0.4 * k)})`; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, s * r, 0, TAU); g.stroke(); }
    g.restore();
    glowAt(g, x, y, s * 2.4, "130,70,255", 0.35 + 0.25 * k);
  }
  if (lm && lm.lines) {
    const k = 0.5 + 0.5 * Math.sin(now / 140);
    for (const t of lm.lines) {
      const c = [P(t.x + 0.08, t.y + 0.08, 0.02), P(t.x + 0.92, t.y + 0.08, 0.02), P(t.x + 0.92, t.y + 0.92, 0.02), P(t.x + 0.08, t.y + 0.92, 0.02)];
      g.beginPath(); c.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath();
      g.fillStyle = `rgba(120,190,255,${0.16 + 0.14 * k})`; g.fill();
      g.strokeStyle = `rgba(170,220,255,${0.55 + 0.35 * k})`; g.lineWidth = 2; g.stroke();
    }
  }
  const mu = fd.muster; // ฝูงมอนรวมพลรอบจุดตั้งรับ: วงประแดงจาง (ระลอกบุก = วงเข้ม)
  if (mu) {
    const [x, y, s] = P(mu.x + 0.5, mu.y + 0.5, 0.02), k = 0.5 + 0.5 * Math.sin(now / 400), r = ((mu.ring && mu.ring[1]) || 7) - 0.5;
    g.save(); g.translate(x, y); g.scale(1, 0.42); if (!lowQ) g.rotate(now / 4000);
    g.setLineDash([s * 0.35, s * 0.25]); g.strokeStyle = mu.mode === "wave" ? `rgba(255,40,50,${0.6 + 0.3 * k})` : `rgba(255,80,80,${0.22 + 0.15 * k})`; g.lineWidth = mu.mode === "wave" ? 4 : 2.5;
    g.beginPath(); g.arc(0, 0, s * r, 0, TAU); g.stroke(); g.setLineDash([]); g.restore();
  }
  for (const rn of fd.mobRunes || []) { // วงเวทของมอน (eosMobs — ระเบิดต้นเทิร์นหน้า)
    const k = 0.5 + 0.5 * Math.sin(now / 150);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const tx = rn.x + dx, ty = rn.y + dy;
      const c = [P(tx + 0.06, ty + 0.06, 0.02), P(tx + 0.94, ty + 0.06, 0.02), P(tx + 0.94, ty + 0.94, 0.02), P(tx + 0.06, ty + 0.94, 0.02)];
      g.beginPath(); c.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath();
      g.fillStyle = `rgba(255,60,200,${0.12 + 0.12 * k})`; g.fill();
    }
    const [x, y, s] = P(rn.x + 0.5, rn.y + 0.5, 0.03);
    g.save(); g.translate(x, y); g.scale(1, 0.42); if (!lowQ) g.rotate(now / 900);
    g.strokeStyle = `rgba(255,110,220,${0.6 + 0.35 * k})`; g.lineWidth = 2.5;
    g.beginPath(); g.arc(0, 0, s * 1.45, 0, TAU); g.stroke();
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const px = Math.cos(a) * s * 1.3, py = Math.sin(a) * s * 1.3; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); g.stroke();
    g.restore();
  }
  for (const bb of fd.bossBig || []) drawBigWarn(g, bb, now, lowQ); // ท่าใหญ่ของราชาปีศาจที่เตือนไว้ (eosBoss)
  const qk = fd.bossQuake; // แผ่นดินแยกที่ราชาปีศาจเตือนไว้: ช่องแดงกะพริบ (ระเบิดต้นเทิร์นหน้า)
  if (qk) {
    const k = 0.5 + 0.5 * Math.sin(now / 130);
    for (const t of qk.tiles || []) {
      const c = [P(t.x + 0.06, t.y + 0.06, 0.02), P(t.x + 0.94, t.y + 0.06, 0.02), P(t.x + 0.94, t.y + 0.94, 0.02), P(t.x + 0.06, t.y + 0.94, 0.02)];
      g.beginPath(); c.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath();
      g.fillStyle = `rgba(255,40,30,${0.16 + 0.14 * k})`; g.fill();
      g.strokeStyle = `rgba(255,90,60,${0.55 + 0.35 * k})`; g.lineWidth = 2; g.stroke();
    }
  }
  const w = fd.bossWarn;
  if (w) {
    const [x, y, s] = P(w.x + 0.5, w.y + 0.5, 0.02), k = 0.5 + 0.5 * Math.sin(now / 160);
    g.save(); g.translate(x, y); g.scale(1, 0.42); if (!lowQ) g.rotate(now / 700);
    for (const [r, a] of [[1.5, 0.9], [1.1, 0.6]]) { g.strokeStyle = `rgba(255,40,70,${a * (0.6 + 0.4 * k)})`; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, s * r, 0, TAU); g.stroke(); }
    g.beginPath(); for (let i = 0; i < 5; i++) { const a = i * 4 * Math.PI / 5 - Math.PI / 2; const px = Math.cos(a) * s * 1.1, py = Math.sin(a) * s * 1.1; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); g.stroke();
    g.restore();
    glowAt(g, x, y, s * 1.8, "255,30,60", 0.35 + 0.25 * k);
  }
  for (const q of fd.quests || []) {
    if ((q.type !== "hunt" && q.type !== "guard") || !q.rect) continue;
    const guard = q.type === "guard"; // เฝ้าเมือง = กรอบฟ้า · กวาดล้าง = กรอบส้ม
    const [x0, y0, x1, y1] = q.rect;
    const c = [P(x0, y0, 0.02), P(x1 + 1, y0, 0.02), P(x1 + 1, y1 + 1, 0.02), P(x0, y1 + 1, 0.02)];
    const qa = 0.55 + 0.25 * Math.sin(now / 400);
    g.beginPath(); c.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = guard ? "rgba(120,190,255,.07)" : "rgba(255,190,80,.06)"; g.fill();
    g.strokeStyle = guard ? `rgba(140,200,255,${qa})` : `rgba(255,200,100,${qa})`; g.lineWidth = 3; g.lineCap = "round";
    for (let i = 0; i < 4; i++) { // มุมกรอบ (ขายาว 1 ช่อง)
      const a = c[i], b = c[(i + 1) % 4], d = c[(i + 3) % 4];
      const lb = Math.min(0.35, 1 / Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]) / a[2])), ld = Math.min(0.35, 1 / Math.max(1, Math.hypot(d[0] - a[0], d[1] - a[1]) / a[2]));
      g.beginPath(); g.moveTo(a[0] + (b[0] - a[0]) * lb, a[1] + (b[1] - a[1]) * lb); g.lineTo(a[0], a[1]); g.lineTo(a[0] + (d[0] - a[0]) * ld, a[1] + (d[1] - a[1]) * ld); g.stroke();
    }
    g.lineCap = "butt";
  }
  const cv = fd.convoy;
  if (cv && Array.isArray(cv.path) && cv.path.length > 1) {
    const pts = cv.path.map((t) => P(t.x + 0.5, t.y + 0.5, 0.03));
    g.lineJoin = "round"; g.lineCap = "round";
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.strokeStyle = "rgba(255,200,100,.16)"; g.lineWidth = Math.max(6, pts[0][2] * 0.32); g.stroke();
    g.strokeStyle = "rgba(255,225,150,.35)"; g.lineWidth = 2; g.stroke();
    if (!lowQ) for (let j = 0; j < 3; j++) { // ประกายวิ่งตามทาง
      const f = ((now / 2600) + j / 3) % 1, idx = f * (pts.length - 1), i0 = Math.floor(idx), q = idx - i0, a = pts[i0], b = pts[Math.min(pts.length - 1, i0 + 1)];
      glowAt(g, a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, a[2] * 0.4, "255,220,140", 0.8);
    }
    g.lineCap = "butt";
    const gp = P(cv.goal.x + 0.5, cv.goal.y + 0.5, 0.03);
    glowAt(g, gp[0], gp[1], 40, "255,210,110", 0.4 + 0.2 * Math.sin(now / 300));
  }
}
