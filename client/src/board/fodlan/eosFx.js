// ============================================================
//  ภาพของสนาม Eos — ฉากเหตุการณ์ PVE (pveFx/pve2Fx) + ด่าน 2/3 (stage2Fx/stage3Fx)
//  แยกออกจาก ./stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · stage6.js ยังส่งออกชื่อเดิมครบ
//  ⚠️ ห้ามเรียกของจาก ./index ตอนโหลดไฟล์ (index import stage6 — วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { P, gEllipse, rng } from "../boardGeo";
import { fxSubT } from "./index";
import { TAU, hash, ease, fx, MAGITEK_IMG, glowAt, poly, FX_NOW } from "./eosBase";
import { TOWN_RECTS, hexPath, elemOf } from "./eosTownArt";
import { shard } from "./eosObstacles";
import { MOVES, posOf, sprite, unitAt, MOB_HEAD, screenFace, drawBeast, DROP_Z, drawDropship } from "./eosUnits";
import { unitOf } from "./eosRail";
import { emoji } from "./eosCamp";
import { bolt } from "./eosSfx";
import { BIG_RGB } from "./eosPve";

const subP = (e, item, p, ms) => (e.seqd ? fxSubT(e, item, FX_NOW, ms) : p);
const live = (q) => q >= 0 && q < 1;
// ฉาก PVE รอบสอง (คืน true = วาดแล้ว)
export function pve2Fx(g, e, p0, lowQ, units) {
  let p = p0;
  if (e.kind === "mob_heal") {
    for (const h of e.heals || []) {
      p = subP(e, h, p0, fx.mob_heal); if (!live(p)) continue;
      const [x, y, s] = P(h.x + 0.5, h.y + 0.5, 0.6 + p * 1.2);
      g.fillStyle = `rgba(110,255,160,${1 - p})`;
      g.fillRect(x - 2, y - 7, 4, 14); g.fillRect(x - 7, y - 2, 14, 4);
      glowAt(g, x, y, s * 0.5, "110,255,160", (1 - p) * 0.6);
    }
    return true;
  }
  if (e.kind === "mob_shot") {
    for (const sh of e.shots || []) {
      p = subP(e, sh, p0, fx.mob_shot); if (!live(p)) continue;
      const a = P(sh.from.x + 0.5, sh.from.y + 0.5, 1.1), b = P(sh.to.x + 0.5, sh.to.y + 0.5, 0.8), al = p < 0.3 ? 1 : Math.max(0, 1 - (p - 0.3) / 0.7);
      if (sh.kind === "arrow" || sh.kind === "web") { // ลูกธนู / ก้อนใย พุ่งเป็นวิถีโค้ง
        const q = Math.min(1, p / 0.45), hx = a[0] + (b[0] - a[0]) * q, hy = a[1] + (b[1] - a[1]) * q - Math.sin(q * Math.PI) * 26;
        if (q < 1) { glowAt(g, hx, hy, 14, sh.kind === "web" ? "240,240,240" : "255,210,90", 0.9); g.fillStyle = sh.kind === "web" ? "#f4f4f4" : "#ffd75a"; g.beginPath(); g.arc(hx, hy, sh.kind === "web" ? 5 : 3, 0, TAU); g.fill(); }
        else if (sh.kind === "web") { g.strokeStyle = `rgba(240,240,240,${al})`; g.lineWidth = 1.2; for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(b[0] + Math.cos(an) * 22, b[1] + Math.sin(an) * 12); g.stroke(); } for (const r of [8, 15, 22]) { g.beginPath(); g.ellipse(b[0], b[1], r, r * 0.55, 0, 0, TAU); g.stroke(); } }
        else glowAt(g, b[0], b[1], 22, "255,200,80", al * 0.8);
        continue;
      }
      g.strokeStyle = `rgba(255,60,50,${al})`; g.lineWidth = 3; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      g.strokeStyle = `rgba(255,230,220,${al})`; g.lineWidth = 1; g.stroke();
      glowAt(g, b[0], b[1], 30, "255,80,60", al * 0.8);
    }
    return true;
  }
  if (e.kind === "armiger") { // Armiger: อาวุธวิญญาณสีฟ้าหมุนรอบทุกคน
    for (const id of e.ids || []) { const u = unitOf(units, id); if (!u) continue; const [x, y, s] = P(u.x, u.y, 0.6); glowAt(g, x, y, s * (0.7 + p), "120,190,255", (1 - p) * 0.9);
      if (!lowQ) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + p * 6, q = P(u.x + Math.cos(a) * 0.55, u.y + Math.sin(a) * 0.55, 0.8 + Math.sin(a * 2) * 0.15); g.strokeStyle = `rgba(200,235,255,${1 - p})`; g.lineWidth = 2; g.beginPath(); g.moveTo(q[0], q[1] - q[2] * 0.2); g.lineTo(q[0], q[1] + q[2] * 0.2); g.stroke(); } }
    return true;
  }
  if (e.kind === "town_garage" || e.kind === "town_diner" || e.kind === "town_shrine" || e.kind === "town_ranch") {
    const rgb = e.kind === "town_garage" ? "255,190,90" : e.kind === "town_diner" ? "255,150,90" : e.kind === "town_shrine" ? "150,210,255" : "255,220,90";
    const pts = e.kind === "town_shrine" ? (e.ids || []).map((id) => unitOf(units, id)).filter(Boolean).map((u) => ({ x: u.x, y: u.y })) : [];
    const at = e.kind === "town_garage" ? { x: e.x + 0.5, y: e.y + 0.5 } : e.kind === "town_ranch" ? { x: e.to.x + 0.5, y: e.to.y + 0.5 } : { x: e.x + 0.5, y: e.y + 0.5 };
    for (const q of [at, ...pts]) { const [x, y, s] = P(q.x, q.y, 0.5); glowAt(g, x, y, s * (0.5 + p), rgb, (1 - p) * 0.85); }
    if (!lowQ && e.kind === "town_garage") for (let i = 0; i < 8; i++) { const a = hash(i, e.seq) * TAU, d = p * 0.6; const [x, y] = P(at.x + Math.cos(a) * d, at.y + Math.sin(a) * d, 0.3 + p * 0.5); g.fillStyle = `rgba(255,220,120,${1 - p})`; g.fillRect(x - 1.5, y - 1.5, 3, 3); }
    return true;
  }
  if (e.kind === "mob_blink") { // ควันม่วงจุดเดิม → จุดใหม่
    for (const b of e.list || []) {
      p = subP(e, b, p0, fx.mob_blink); if (!live(p)) continue;
      if (!lowQ) { puff(g, b.from.x + 0.5, b.from.y + 0.5, 0.5 + p, p, e.seq + 1, 8, "150,70,220", 0.35); puff(g, b.to.x + 0.5, b.to.y + 0.5, 0.5 + p, p, e.seq + 2, 8, "150,70,220", 0.35); }
      const [x, y, s] = P(b.to.x + 0.5, b.to.y + 0.5, 0.6); glowAt(g, x, y, s * (0.6 + p), "190,90,255", (1 - p) * 0.8);
    }
    return true;
  }
  if (e.kind === "mob_pull") { // โซ่จากมอนถึงเป้า (เป้าถูกลากตามโซ่)
    for (const c of e.list || []) {
      p = subP(e, c, p0, fx.mob_pull); if (!live(p)) continue;
      const a = P(c.x + 0.5, c.y + 0.5, 0.8), q = Math.min(1, p / 0.5), fx0 = c.from.x + (c.to.x - c.from.x) * q, fy0 = c.from.y + (c.to.y - c.from.y) * q, b = P(fx0 + 0.5, fy0 + 0.5, 0.8), al = p < 0.6 ? 1 : (1 - p) / 0.4;
      g.strokeStyle = `rgba(200,200,215,${al})`; g.lineWidth = 3; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.setLineDash([]);
      glowAt(g, b[0], b[1], 18, "220,220,240", al * 0.7);
    }
    return true;
  }
  if (e.kind === "mob_rune_set") { for (const r of e.list || []) { const [x, y, s] = P(r.x + 0.5, r.y + 0.5, 0.05); glowAt(g, x, y, s * (0.8 + p * 1.2), "255,80,210", (1 - p) * 0.8); } return true; }
  if (e.kind === "mob_rune") {
    for (const r of e.list || []) {
      const [x, y, s] = P(r.x + 0.5, r.y + 0.5, 0.3);
      if (r.fizzle) { glowAt(g, x, y, s * 0.8, "200,160,220", (1 - p) * 0.4); continue; }
      glowAt(g, x, y, s * (1 + p * 1.8), "255,70,210", (1 - p) * 0.95);
      if (!lowQ) puff(g, r.x + 0.5, r.y + 0.5, 0.4 + p, p, e.seq + r.x, 8, "200,60,180", 0.3);
    }
    return true;
  }
  if (e.kind === "mob_split") { const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.6); glowAt(g, x, y, s * (0.8 + p), "220,170,100", (1 - p) * 0.8); if (!lowQ) puff(g, e.x + 0.5, e.y + 0.5, 0.4 + p, p, e.seq, 10, "150,120,90", 0.3); return true; }
  if (e.kind === "mob_block") { const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.9); glowAt(g, x, y, s * 0.7, "140,190,255", (1 - p) * 0.9); return true; }
  if (e.kind === "elite_spawn" || e.kind === "elite_down") { // เสาแสงทอง (เกิด) / ระเบิดทอง (ล้ม)
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.05);
    const up = e.kind === "elite_spawn";
    glowAt(g, x, y - s * (up ? 0.9 : 0.5), s * (up ? 1.2 + p : 0.8 + p * 1.6), "255,205,80", (1 - p) * 0.9);
    if (up) { g.fillStyle = `rgba(255,230,140,${0.35 * (1 - p)})`; g.fillRect(x - s * 0.18, y - s * 3, s * 0.36, s * 3); }
    for (let r = 0; r < 2; r++) { const k = (p - r * 0.25) / 0.7; if (k <= 0 || k >= 1) continue; g.save(); g.translate(x, y); g.scale(1, 0.42); g.strokeStyle = `rgba(255,215,90,${0.9 * (1 - k)})`; g.lineWidth = 4 * (1 - k) + 1; g.beginPath(); g.arc(0, 0, s * (0.5 + k * 1.6), 0, TAU); g.stroke(); g.restore(); }
    if (!up && !lowQ) for (let i = 0; i < 14; i++) { const a = hash(i, e.seq) * TAU, d = s * p * (0.8 + hash(i, 7)); g.fillStyle = `rgba(255,${200 + Math.floor(hash(i, 2) * 50)},90,${1 - p})`; g.fillRect(x + Math.cos(a) * d, y - s * 0.6 + Math.sin(a) * d * 0.55 - s * p * 0.6, 3, 3); }
    return true;
  }
  if (e.kind === "elite_blast") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.5);
    glowAt(g, x, y, s * (1 + p * 2.2), "255,170,50", (1 - p) * 0.95);
    for (const t of e.tiles || []) { const [tx, ty, ts] = P(t.x + 0.5, t.y + 0.5, 0.03); glowAt(g, tx, ty, ts * 0.7, "255,120,40", (1 - p) * 0.5); }
    if (p > 0.2) puff(g, e.x + 0.5, e.y + 0.5, 0.4 + p, (p - 0.2) / 0.8, e.seq, lowQ ? 4 : 10, "70,55,45", 0.25);
    return true;
  }
  if (e.kind === "elite_drain" && e.from) { // ด้ายเลือดจากเป้ากลับเข้าตัว
    const a = P(e.from.x + 0.5, e.from.y + 0.5, 0.8), b = P(e.x + 0.5, e.y + 0.5, 0.9), q = Math.min(1, p / 0.7);
    const hx = a[0] + (b[0] - a[0]) * q, hy = a[1] + (b[1] - a[1]) * q;
    g.strokeStyle = `rgba(220,30,60,${0.8 * (1 - p)})`; g.lineWidth = 3; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(hx, hy); g.stroke();
    glowAt(g, hx, hy, 14, "255,40,70", 0.9 * (1 - p));
    return true;
  }
  if (e.kind === "elite_thorns") { const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.7); glowAt(g, x, y, s * (0.6 + p * 0.6), "140,230,90", (1 - p) * 0.85); return true; }
  if (e.kind === "elite_regen") { for (const r of e.list || []) { const [x, y, s] = P(r.x + 0.5, r.y + 0.5, 0.9 + p * 0.6); glowAt(g, x, y, s * 0.6, "120,255,150", (1 - p) * 0.8); } return true; }
  if (e.kind === "mob_boom") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.5);
    glowAt(g, x, y, s * (1 + p * 2), "255,130,40", (1 - p) * 0.95);
    if (!lowQ) for (let i = 0; i < 18; i++) { const a = hash(i, e.seq) * TAU, d = s * p * (1 + hash(i, 3) * 1.5); g.fillStyle = `rgba(255,${120 + Math.floor(hash(i, 5) * 120)},40,${1 - p})`; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.55 - s * p, 3, 0, TAU); g.fill(); }
    if (p > 0.2) puff(g, e.x + 0.5, e.y + 0.5, 0.4 + p, (p - 0.2) / 0.8, e.seq, lowQ ? 4 : 10, "60,50,50", 0.25);
    return true;
  }
  if (e.kind === "boss_big") { // ลงจริง: ช่องสว่างวาบ · ลำแสง = เสาแสงตามแนว · อุกกาบาต = ลูกไฟตกจากฟ้า · วงแหวน = คลื่นกระจาย
    const rgb = BIG_RGB[e.move] || BIG_RGB.beam;
    for (const t of e.tiles || []) { const [x, y, s] = P(t.x + 0.5, t.y + 0.5, 0.05); glowAt(g, x, y, s * (0.5 + p * 0.5), rgb, (1 - p) * 0.75); }
    if (e.move === "beam") for (const t of (e.tiles || []).filter((_, i) => i % 3 === 1)) { const a = P(t.x + 0.5, t.y + 0.5, 0), b = P(t.x + 0.5, t.y + 0.5, 2.2 * (1 - p)); g.strokeStyle = `rgba(240,200,255,${0.9 * (1 - p)})`; g.lineWidth = Math.max(2, a[2] * 0.35 * (1 - p)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    if (e.move === "meteor") for (const c of e.centers || []) { const q = Math.min(1, p / 0.35); const [x, y, s] = P(c.x + 0.5, c.y + 0.5, 6 * (1 - q)); glowAt(g, x, y, s * (q < 1 ? 0.5 : 0.8 + p), "255,140,40", q < 1 ? 0.95 : (1 - p) * 1.2); if (q >= 1 && !lowQ) puff(g, c.x + 0.5, c.y + 0.5, 0.4 + p, (p - 0.35) / 0.65, e.seq + c.x, 8, "70,50,40", 0.3); }
    if (e.move === "ring") { const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.05); g.save(); g.translate(x, y); g.scale(1, 0.42); g.strokeStyle = `rgba(${rgb},${0.9 * (1 - p)})`; g.lineWidth = 8 * (1 - p) + 2; g.beginPath(); g.arc(0, 0, s * (3 + p * 2.5), 0, TAU); g.stroke(); g.restore(); }
    return true;
  }
  if (e.kind === "boss_dark") { for (const t of e.tiles || []) { const [x, y, s] = P(t.x + 0.5, t.y + 0.5, 0.3 + p * 0.5); glowAt(g, x, y, s * 0.45, "140,50,240", (1 - p) * 0.6); } return true; }
  if (e.kind === "camp_rest") { for (const u of e.list || []) { const [x, y, s] = P(u.x + 0.5, u.y + 0.5, 0.9 + p * 0.7); glowAt(g, x, y, s * 0.5, "255,200,110", (1 - p) * 0.8); } return true; }
  if (e.kind === "boss_guards") { for (const u of e.spawned || []) { const [x, y, s] = P(u.x + 0.5, u.y + 0.5, 0.6); glowAt(g, x, y, s * (0.6 + p), "200,30,90", (1 - p) * 0.9); } return true; }
  if (e.kind === "boss_quake") { // แผ่นดินแยก: วงแดงแตกเป็นรอยร้าว + ฝุ่น
    for (const t of e.tiles || []) {
      const [x, y, s] = P(t.x + 0.5, t.y + 0.5, 0.03);
      glowAt(g, x, y, s * 0.9, "255,90,40", (1 - p) * 0.7);
      if (!lowQ && p < 0.8) puff(g, t.x + 0.5, t.y + 0.5, 0.3 + p * 0.6, p, e.seq + t.x * 7 + t.y, 3, "120,95,80", 0.3 * (1 - p));
    }
    const [cx, cy, s] = P(e.x + 0.5, e.y + 0.5, 0.05);
    for (let r = 0; r < 2; r++) { const k = (p - r * 0.2) / 0.7; if (k <= 0 || k >= 1) continue; g.save(); g.translate(cx, cy); g.scale(1, 0.42); g.strokeStyle = `rgba(255,120,60,${0.9 * (1 - k)})`; g.lineWidth = 6 * (1 - k) + 1; g.beginPath(); g.arc(0, 0, s * (0.8 + k * 2.6), 0, TAU); g.stroke(); g.restore(); }
    return true;
  }
  if (e.kind === "lament_blink" && e.from) { // วูบ: ควันม่วงจุดเดิม → จุดใหม่
    for (const [t, a] of [[e.from, 1 - p], [e.to, p]]) { if (!t) continue; const [x, y, s] = P(t.x + 0.5, t.y + 0.5, 1); glowAt(g, x, y, s * 1.4, "120,60,200", 0.7 * a); }
    return true;
  }
  if (e.kind === "lament_tears") { // น้ำตาสวรรค์: ลำแสงฟ้าตกลงทุกช่องในแนว
    for (const t of e.tiles || []) {
      const [x, y, s] = P(t.x + 0.5, t.y + 0.5, 0.02), top = P(t.x + 0.5, t.y + 0.5, 6);
      const k = Math.max(0, 1 - Math.abs(p - 0.3) * 2.2);
      if (k > 0) { g.strokeStyle = `rgba(160,210,255,${0.8 * k})`; g.lineWidth = Math.max(2, s * 0.18 * k); g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(x, y); g.stroke(); }
      glowAt(g, x, y, s * 0.8, "150,200,255", (1 - p) * 0.7);
    }
    return true;
  }
  if (e.kind === "lament_land" || e.kind === "lament_phase" || e.kind === "lament_die") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.05), die = e.kind === "lament_die";
    for (let r = 0; r < 4; r++) { const k = (p - r * 0.12) / 0.7; if (k <= 0 || k >= 1) continue; g.save(); g.translate(x, y); g.scale(1, 0.42); g.strokeStyle = die ? `rgba(200,230,255,${0.9 * (1 - k)})` : `rgba(150,70,240,${0.85 * (1 - k)})`; g.lineWidth = 6 * (1 - k) + 1; g.beginPath(); g.arc(0, 0, s * (0.8 + k * 6), 0, TAU); g.stroke(); g.restore(); }
    if (die) glowAt(g, x, y - s * 1.5, s * (2 + p * 4), "220,235,255", (1 - p) * 0.9);
    return true;
  }
  if (e.kind === "mob_wave") { // ระลอกบุก: วงแดงหดเข้าหาจุดตั้งรับ
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.05);
    for (let r = 0; r < 3; r++) { const k = (p - r * 0.15) / 0.7; if (k <= 0 || k >= 1) continue; g.save(); g.translate(x, y); g.scale(1, 0.42); g.strokeStyle = `rgba(255,40,60,${0.85 * (1 - k)})`; g.lineWidth = 5 * (1 - k) + 1; g.beginPath(); g.arc(0, 0, s * (7 - k * 5), 0, TAU); g.stroke(); g.restore(); }
    return true;
  }
  if (e.kind === "town_siege") { // ปีศาจทุบไฟเมือง: ประกายม่วงที่ตัวปีศาจ
    for (const h of e.list || []) { const [x, y, s] = P(h.x + 0.5, h.y + 0.5, 0.6); glowAt(g, x, y, s * (0.5 + p * 0.6), "190,80,255", (1 - p) * 0.8); }
    return true;
  }
  if (e.kind === "town_light") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.9);
    glowAt(g, x, y, s * (1 + p * 4), "255,230,150", (1 - p) * 0.9);
    return true;
  }
  if (e.kind === "boss_enrage") { // คลั่ง: ออร่าแดงพุ่ง
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.9);
    glowAt(g, x, y, s * (1.2 + p * 1.5), "255,30,40", (1 - p) * 0.85);
    if (!lowQ) for (let i = 0; i < 14; i++) { const a = hash(i, e.seq) * TAU, d = s * (0.3 + p * 1.2); g.fillStyle = `rgba(255,${60 + Math.floor(hash(i, 4) * 80)},50,${1 - p})`; g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5 - s * p * 1.4, 3, 6); }
    return true;
  }
  if (e.kind === "boss_land" || e.kind === "boss_roar") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.05);
    for (let r = 0; r < 3; r++) { const k = (p - r * 0.15) / 0.7; if (k <= 0 || k >= 1) continue; g.save(); g.translate(x, y); g.scale(1, 0.42); g.strokeStyle = `rgba(255,50,90,${0.8 * (1 - k)})`; g.lineWidth = 5 * (1 - k) + 1; g.beginPath(); g.arc(0, 0, s * (0.6 + k * 4), 0, TAU); g.stroke(); g.restore(); }
    if (e.kind === "boss_land" && p < 0.5) { const top = P(e.x + 0.5, e.y + 0.5, 12); g.strokeStyle = `rgba(255,60,100,${1 - p * 2})`; g.lineWidth = s * 0.5 * (1 - p * 2); g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(x, y); g.stroke(); }
    return true;
  }
  if (e.kind === "boss_die") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 1);
    glowAt(g, x, y, s * (1 + p * 3), "255,215,120", (1 - p) * 0.9);
    if (!lowQ) for (let i = 0; i < 26; i++) { const a = hash(i, e.seq) * TAU, d = s * p * (1.5 + hash(i, 2) * 2.5); g.fillStyle = `rgba(255,${200 + Math.floor(hash(i, 6) * 55)},120,${1 - p})`; g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 - s * 1.5 * p, 3, 3); }
    return true;
  }
  if (e.kind === "quest_done" || e.kind === "convoy_done") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 1 + p * 2.5);
    if (!lowQ) for (let i = 0; i < 20; i++) { const a = i / 20 * TAU, d = s * 0.9 * Math.min(1, p * 2); g.fillStyle = `hsla(${(i * 37 + e.seq * 11) % 360},90%,70%,${1 - p})`; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 + s * p * p, 3, 0, TAU); g.fill(); }
    glowAt(g, x, y, s * 0.8, "255,230,140", (1 - p) * 0.7);
    return true;
  }
  if (e.kind === "revive_help" || e.kind === "pillar_ward") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.6 + p);
    glowAt(g, x, y, s * (0.6 + p), e.kind === "pillar_ward" ? "140,220,255" : "255,215,110", (1 - p) * 0.9);
    return true;
  }
  if (e.kind === "pillar_ward_hit") { const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.9); g.strokeStyle = `rgba(140,220,255,${1 - p})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, s * (0.6 + p * 0.8), 0, TAU); g.stroke(); return true; }
  void units;
  return false;
}
// ฉาก PVE (คืน true = วาดแล้ว): มอนตีเสา (วงแตกแดง) · เสาหลุด (ผลึกกระจาย) · ซ่อม (วงฟ้าหด) · หีบโผล่ (ลำแสงทอง) · เปิดหีบ (ประกายทอง)
export function pveFx(g, e, p, lowQ) {
  if (e.kind === "pillar_hit" || e.kind === "pillar_lost" || e.kind === "pillar_repair") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.8);
    const rgb = e.kind === "pillar_repair" ? "140,230,255" : "255,70,60";
    const r = e.kind === "pillar_repair" ? s * (1.4 - p) : s * (0.4 + p * 1.2);
    g.strokeStyle = `rgba(${rgb},${1 - p})`; g.lineWidth = Math.max(2, s * 0.06 * (1 - p));
    g.beginPath(); g.ellipse(x, y + s * 0.5, r, r * 0.45, 0, 0, TAU); g.stroke();
    glowAt(g, x, y, s * 1.2, rgb, (1 - p) * (e.kind === "pillar_lost" ? 0.9 : 0.5));
    if (e.kind === "pillar_lost" && !lowQ) for (let i = 0; i < 14; i++) {
      const ang = hash(i, e.seq) * TAU, d = s * (0.3 + p * 1.6) * (0.6 + hash(i, 2) * 0.4);
      g.fillStyle = `rgba(180,230,255,${1 - p})`;
      g.beginPath(); g.moveTo(x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.6 - s * 0.5 * (1 - p));
      g.lineTo(x + Math.cos(ang + 0.2) * (d + s * 0.12), y + Math.sin(ang + 0.2) * (d + s * 0.12) * 0.6 - s * 0.5 * (1 - p));
      g.lineTo(x + Math.cos(ang - 0.15) * (d + s * 0.05), y + Math.sin(ang - 0.15) * (d + s * 0.05) * 0.6 - s * 0.5 * (1 - p)); g.closePath(); g.fill();
    }
    return true;
  }
  if (e.kind === "chest_spawn") {
    for (const c of e.list || []) {
      const [x, y, s] = P(c.x + 0.5, c.y + 0.5);
      const a = Math.sin(Math.min(1, p) * Math.PI);
      g.fillStyle = `rgba(255,220,120,${0.35 * a})`;
      g.fillRect(x - s * 0.18, y - s * 6, s * 0.36, s * 6);
      glowAt(g, x, y, s * 0.9, "255,215,90", a * 0.8);
    }
    return true;
  }
  if (e.kind === "chest_open") {
    const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.4);
    glowAt(g, x, y, s * (0.6 + p), "255,215,90", (1 - p) * 0.9);
    if (!lowQ) for (let i = 0; i < 16; i++) {
      const ang = hash(i, e.seq) * TAU, d = s * p * (0.8 + hash(i, 4)), up = s * (1.4 * p - 1.6 * p * p);
      g.fillStyle = `rgba(255,${200 + Math.floor(hash(i, 5) * 55)},90,${1 - p})`;
      g.beginPath(); g.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d * 0.5 - up, Math.max(1.5, s * 0.04), 0, TAU); g.fill();
    }
    return true;
  }
  return false;
}
// ฉากของลูกเล่นขั้น 2 (คืน true = วาดแล้ว)
export function puff(g, x, y, z, p, seed, n, rgb, size) {
  for (let i = 0; i < n; i++) {
    const ang = hash(i, seed) * TAU, r = (0.15 + 0.5 * p) * (0.6 + hash(i + 7, seed) * 0.6);
    const [px, py, s] = P(x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.8, z + p * 0.3);
    g.fillStyle = `rgba(${rgb},${0.45 * (1 - p)})`; g.beginPath(); g.arc(px, py, s * size * (0.6 + p), 0, TAU); g.fill();
  }
}
function leaf(g, x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = "#5fbf3a"; g.beginPath(); g.ellipse(0, 0, s * 0.09, s * 0.035, 0, 0, TAU); g.fill();
  g.fillStyle = "#8fe05a"; g.beginPath(); g.ellipse(s * 0.03, -s * 0.02, s * 0.06, s * 0.025, 0.6, 0, TAU); g.fill();
  g.restore();
}
function feathers(g, from, to, p, seed) {
  if (!from || !to) return;
  for (let i = 0; i < 8; i++) {
    const k = Math.min(1, p * 1.2 + hash(i, seed) * 0.2), x = from.x + (to.x - from.x) * k + 0.5, y = from.y + (to.y - from.y) * k + 0.5;
    const [px, py, s] = P(x + (hash(i + 2, seed) - 0.5) * 0.6, y + (hash(i + 4, seed) - 0.5) * 0.6, 0.1 + hash(i + 6, seed) * 0.5);
    g.fillStyle = `rgba(255,214,90,${0.8 * (1 - p)})`; g.beginPath(); g.ellipse(px, py, s * 0.05, s * 0.018, hash(i, 9) * 3 + p * 4, 0, TAU); g.fill();
  }
}
export function stage2Fx(g, e, p, now, lowQ) {
  if (e.kind === "bridge") {
    const [lx, ly, s] = P(e.x + 0.5, e.y + 0.5, 0.8);
    if (p < 0.35) glowAt(g, lx, ly, s * 0.6, "255,220,160", (1 - p / 0.35) * 0.6);
    if (!lowQ && p > 0.25) for (const t of e.tiles || []) puff(g, t.x + 0.5, t.y + 0.6, 0.05, (p - 0.25) / 0.75, e.seq + t.x, 6, "220,240,255", 0.07); // น้ำกระเซ็น
    return true;
  }
  if (e.kind === "dome_on") {
    const r = e.rect || TOWN_RECTS.insomnia, [cx, cy] = [(r[0] + r[2] + 1) / 2, (r[1] + r[3] + 1) / 2];
    const rad = 2 + p * 9, a = (1 - p) * 0.8;
    g.beginPath();
    for (let i = 0; i <= 40; i++) { const u = i / 40 * TAU, q = P(cx + Math.cos(u) * rad, cy + Math.sin(u) * rad * 0.6, 0.05); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }
    g.strokeStyle = `rgba(160,225,255,${a})`; g.lineWidth = 3; g.stroke();
    for (const t of e.gates || []) { const [gx, gy, s] = P(t.x + 0.5, t.y + 0.5, 0.5); glowAt(g, gx, gy, s * 1.1, "120,200,255", (1 - p) * 0.6); }
    return true;
  }
  if (e.kind === "dome_off") {
    if (lowQ) return true;
    const r = e.rect || TOWN_RECTS.insomnia;
    for (let i = 0; i < 26; i++) {
      const x = r[0] + hash(i, e.seq) * (r[2] - r[0] + 1), y = r[1] + hash(i + 3, e.seq) * (r[3] - r[1] + 1);
      const [px, py, s] = P(x, y, 0.5 + hash(i + 5, e.seq) * 2.6 - p * 1.2);
      g.fillStyle = `rgba(190,235,255,${0.7 * (1 - p)})`; g.beginPath(); hexPath(g, px, py, s * 0.12, 0.8); g.fill();
    }
    return true;
  }
  if (e.kind === "lights") {
    const [sx, sy, s] = P(e.x + 0.5, e.y + 0.6, 0.8);
    glowAt(g, sx, sy, s * (0.5 + p), e.off ? "255,90,60" : "120,255,150", (1 - p) * 0.7);
    if (!lowQ) for (let i = 0; i < 6; i++) { // ประกายไฟฟ้า
      const ang = hash(i, e.seq) * TAU, rr = s * 0.5 * p;
      g.fillStyle = `rgba(255,240,180,${1 - p})`; g.fillRect(sx + Math.cos(ang) * rr, sy + Math.sin(ang) * rr - s * 0.2 * p, 2, 2);
    }
    if (e.off && e.zone && TOWN_RECTS[e.zone]) { // เมืองมืดวูบ
      const r = TOWN_RECTS[e.zone];
      g.beginPath(); poly(g, [[r[0], r[1]], [r[2] + 1, r[1]], [r[2] + 1, r[3] + 1], [r[0], r[3] + 1]]);
      g.fillStyle = `rgba(0,4,16,${0.3 * Math.sin(p * Math.PI)})`; g.fill();
    }
    return true;
  }
  if (e.kind === "gysahl_lure" || e.kind === "gysahl_call") {
    const lure = e.kind === "gysahl_lure", from = lure ? e.from : e.to, at = lure ? e.at : e.to;
    if (!from || !at) return true;
    const tt = lure ? Math.min(1, p / 0.45) : 0;
    if (lure && tt < 1) { // ผักลอยโค้งไปหาเป้า + เศษใบไม้ตามทาง
      for (let i = 0; i < 4; i++) {
        const k = Math.max(0, tt - i * 0.06), x = from.x + 0.5 + (at.x - from.x) * k, y = from.y + 0.5 + (at.y - from.y) * k;
        const [px, py, s] = P(x, y, 0.6 + Math.sin(k * Math.PI) * 1.6);
        g.globalAlpha = i ? 0.35 / i : 1; leaf(g, px, py, s * (i ? 0.7 : 1.2), now / 60 + i); g.globalAlpha = 1;
      }
    } else { // ใบผักแตกกระจาย + ขนนกปลิวตามโชโกโบะที่วิ่ง
      const q = lure ? (p - 0.45) / 0.55 : p;
      const [ax, ay, s] = P(at.x + 0.5, at.y + 0.5, 0.4);
      for (let i = 0; i < 7; i++) { const ang = hash(i, e.seq) * TAU, r = s * 0.6 * q; leaf(g, ax + Math.cos(ang) * r, ay + Math.sin(ang) * r * 0.6 - s * 0.3 * q, s, ang + q * 5); }
      glowAt(g, ax, ay, s * 0.8, "150,240,110", (1 - q) * 0.5);
      if (lure) feathers(g, e.at, e.to, q, e.seq); else feathers(g, e.from, e.to, q, e.seq);
    }
    return true;
  }
  if (e.kind === "wreck_push") {
    if (!e.to) return true;
    puff(g, e.to.x + 0.5, e.to.y + 0.6, 0.05, p, e.seq, lowQ ? 4 : 9, "170,155,130", 0.1);
    if (e.from) puff(g, e.from.x + 0.5, e.from.y + 0.6, 0.05, p, e.seq + 1, lowQ ? 2 : 5, "150,140,120", 0.08);
    return true;
  }
  return false;
}
// ฉากของลูกเล่นขั้น 3 (คืน true = วาดแล้ว) · out.flash = แสงวาบทั้งจอ
export function flameTongue(g, x, y, h, w, a) {
  if (!(a > 0 && h > 0)) return;
  const gr = g.createLinearGradient(x, y, x, y - h);
  gr.addColorStop(0, `rgba(255,80,20,${a})`); gr.addColorStop(0.5, `rgba(255,170,40,${a * 0.9})`); gr.addColorStop(1, "rgba(255,240,170,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 0.9, y - h * 0.5, x, y - h); g.quadraticCurveTo(x + w * 0.9, y - h * 0.5, x + w, y); g.closePath(); g.fill();
}
function arcs(g, x, y, s, seed, a) { // ประกายไฟฟ้าเต้นบนผิวน้ำ (สุ่มใหม่ทุก 70ms)
  const R = rng(seed);
  g.lineJoin = "round";
  for (let k = 0; k < 2; k++) {
    const pts = [];
    let px = x + (R() - 0.5) * s * 0.8, py = y + (R() - 0.5) * s * 0.35;
    for (let i = 0; i < 6; i++) { pts.push([px, py]); px += (R() - 0.3) * s * 0.22; py += (R() - 0.5) * s * 0.14 - s * 0.02; }
    const path = () => { g.beginPath(); pts.forEach(([u, v], i) => (i ? g.lineTo(u, v) : g.moveTo(u, v))); };
    path(); g.strokeStyle = `rgba(120,200,255,${0.45 * a})`; g.lineWidth = Math.max(2, s * 0.06); g.stroke();
    path(); g.strokeStyle = `rgba(240,250,255,${a})`; g.lineWidth = Math.max(1, s * 0.02); g.stroke();
  }
  glowAt(g, x, y, s * 0.7, "140,210,255", a * 0.5);
}
function slashFx(g, x, y, s, beast, p) {
  const k = Math.min(1, p / 0.35), al = 1 - p;
  if (beast) { // กรงเล็บ 3 เส้น
    for (let i = -1; i <= 1; i++) {
      const ox = i * s * 0.14, x0 = x - s * 0.38 + ox, y0 = y - s * 0.42, x1 = x0 + s * 0.7 * k, y1 = y0 + s * 0.7 * k;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + s * 0.42 * k, y0 + s * 0.1 * k, x1, y1);
      g.strokeStyle = `rgba(255,60,70,${al})`; g.lineWidth = Math.max(2, s * 0.07); g.stroke();
      g.strokeStyle = `rgba(255,235,235,${al})`; g.lineWidth = Math.max(1, s * 0.02); g.stroke();
    }
    glowAt(g, x, y, s * 0.6, "255,70,60", al * 0.6);
  } else { // ดาบฟันเป็นเสี้ยววงเดือน
    const a0 = -2.5, a1 = a0 + 2.7 * k;
    g.beginPath(); g.arc(x, y, s * 0.45, a0, a1); g.strokeStyle = `rgba(170,220,255,${al})`; g.lineWidth = Math.max(3, s * 0.1); g.stroke();
    g.beginPath(); g.arc(x, y, s * 0.45, a0, a1); g.strokeStyle = `rgba(255,255,255,${al})`; g.lineWidth = Math.max(1, s * 0.03); g.stroke();
    glowAt(g, x, y, s * 0.55, "170,220,255", al * 0.5);
  }
}
export function stage3Fx(g, e, p, now, lowQ, units, out, Y0) {
  if (e.kind === "barrel_boom") {
    const cx = e.x + 0.5, cy = e.y + 0.5, [, , s] = P(cx, cy);
    if (p < 0.12) out.flash = Math.max(out.flash, 0.3 * (1 - p / 0.12));
    // คลื่นกระแทก
    const ring = ease(Math.min(1, p / 0.45));
    if (ring < 1) { gEllipse(g, cx, cy, 0.3 + ring * 1.7, 0.05, 36); g.strokeStyle = `rgba(255,225,180,${0.75 * (1 - ring)})`; g.lineWidth = Math.max(1.5, s * 0.09 * (1 - ring)); g.stroke(); }
    // เปลวไฟบนช่องรอบ 3×3
    if (p < 0.75) for (const t of e.tiles || []) {
      const q = p / 0.75;
      for (let i = 0; i < (lowQ ? 1 : 3); i++) {
        const b = P(t.x + 0.2 + hash(i, t.x * 7 + t.y + e.seq) * 0.6, t.y + 0.2 + hash(i + 4, t.x + t.y * 5 + e.seq) * 0.6);
        flameTongue(g, b[0], b[1], b[2] * (0.35 + 0.35 * hash(i, e.seq)) * Math.sin(Math.min(1, q * 2.2) * Math.PI * 0.5) * (1 - q * 0.6), b[2] * 0.1, (1 - q) * 0.9);
      }
    }
    // ควันดำลอยขึ้น
    if (p > 0.15) puff(g, cx, cy, 0.5 + p * 1.3, (p - 0.15) / 0.85, e.seq, lowQ ? 5 : 12, "36,32,30", 0.24);
    // ลูกไฟ
    const fb = Math.min(1, p / 0.22), fade = p < 0.3 ? 1 : Math.max(0, 1 - (p - 0.3) / 0.4), f = P(cx, cy, 0.35 + p * 0.9);
    glowAt(g, f[0], f[1], s * (0.6 + fb * 1.5), "255,140,30", 0.95 * fade);
    glowAt(g, f[0], f[1], s * (0.3 + fb * 0.8), "255,240,190", fade);
    // เศษเหล็ก + ประกายไฟ
    if (!lowQ) for (let i = 0; i < 12; i++) {
      const ang = hash(i, e.seq + 3) * TAU, d = Math.min(1, p * 1.6) * (0.6 + hash(i, e.seq) * 1.3), zz = Math.sin(Math.min(1, p * 1.6) * Math.PI) * (0.6 + hash(i, e.seq + 5) * 1.0);
      const q = P(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, Math.max(0, zz));
      g.fillStyle = i % 3 ? `rgba(60,30,20,${1 - p})` : `rgba(255,200,90,${1 - p})`; g.fillRect(q[0] - 2, q[1] - 2, i % 3 ? 4 : 2.5, i % 3 ? 3 : 2.5);
    }
    return true;
  }
  if (e.kind === "crystal_break") {
    const E = elemOf(e.element), cx = e.x + 0.5, cy = e.y + 0.55, c = P(cx, cy, 0.45), s = c[2];
    glowAt(g, c[0], c[1], s * (0.6 + p * 1.3), E.rgb, (1 - p) * 0.9);
    for (let i = 0; i < (lowQ ? 6 : 14); i++) {
      const ang = hash(i, e.seq) * TAU, d = p * (0.4 + hash(i + 1, e.seq) * 0.9), zz = 0.45 + Math.sin(p * Math.PI) * (0.3 + hash(i + 2, e.seq) * 0.6) - p * 0.35;
      const q = P(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d * 0.8, Math.max(0.02, zz));
      shard(g, q[0], q[1], q[2] * 0.16, q[2] * 0.045, ang + p * 8, E.body, E.hi, 1 - p);
    }
    // พลังเวทไหลเข้าหาคนเก็บ
    const u = unitAt(units, e.by);
    if (u && p > 0.2) for (let i = 0; i < 6; i++) {
      const k = Math.max(0, Math.min(1, (p - 0.2) / 0.6 - i * 0.05));
      if (k <= 0 || k >= 1) continue;
      const q = P(cx + (u.x - cx) * k, cy + (u.y - cy) * k, 0.5 + Math.sin(k * Math.PI) * 0.6 + (hash(i, e.seq) - 0.5) * 0.2);
      glowAt(g, q[0], q[1], q[2] * 0.22, E.rgb, 0.9 * (1 - k * 0.5));
    }
    return true;
  }
  if (e.kind === "flask") {
    const E = elemOf(e.element), from = e.from, to = e.to;
    if (!from || !to) return true;
    const T = 0.36;
    if (p < T) { // ขวดยาลอยโค้ง
      const k = p / T, dist = Math.hypot(to.x - from.x, to.y - from.y);
      const pt = (kk) => P(from.x + 0.5 + (to.x - from.x) * kk, from.y + 0.5 + (to.y - from.y) * kk, 0.8 + Math.sin(kk * Math.PI) * (1 + dist * 0.25) - kk * 0.75);
      if (!lowQ) for (let i = 1; i < 5; i++) { const kk = Math.max(0, k - i * 0.05), q = pt(kk); glowAt(g, q[0], q[1], q[2] * 0.15, E.rgb, 0.35 / i); }
      const [px, py, s] = pt(k);
      glowAt(g, px, py, s * 0.4, E.rgb, 0.6);
      g.save(); g.translate(px, py); g.rotate(k * 11);
      g.fillStyle = "rgba(220,235,240,.85)"; g.beginPath(); g.arc(0, 0, s * 0.09, 0, TAU); g.fill();
      g.fillStyle = E.body; g.beginPath(); g.arc(0, s * 0.02, s * 0.065, 0, TAU); g.fill();
      g.fillStyle = "rgba(220,235,240,.85)"; g.fillRect(-s * 0.03, -s * 0.15, s * 0.06, s * 0.08);
      g.fillStyle = "#6b4a2a"; g.fillRect(-s * 0.025, -s * 0.18, s * 0.05, s * 0.04);
      g.restore();
      return true;
    }
    const q = (p - T) / (1 - T), tiles = e.tiles && e.tiles.length ? e.tiles : [to];
    const c = P(to.x + 0.5, to.y + 0.5, 0.3);
    glowAt(g, c[0], c[1], c[2] * (0.6 + q * 1.4), E.rgb, (1 - q) * 0.85);
    if (!lowQ && q < 0.4) for (let i = 0; i < 8; i++) { // เศษแก้ว
      const ang = hash(i, e.seq) * TAU, r = c[2] * 0.7 * (q / 0.4);
      g.fillStyle = `rgba(230,245,255,${1 - q / 0.4})`; g.fillRect(c[0] + Math.cos(ang) * r, c[1] + Math.sin(ang) * r * 0.6 - c[2] * 0.2 * q, 2, 2);
    }
    tiles.forEach((t, ti) => {
      const b = P(t.x + 0.5, t.y + 0.55), s = b[2];
      if (e.element === "ice") { // หนามน้ำแข็งงอกจากพื้น
        const grow = ease(Math.min(1, q * 3)), a = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3;
        for (let i = 0; i < (lowQ ? 2 : 4); i++) {
          const ox = (hash(i, ti + e.seq) - 0.5) * s * 0.6, oy = (hash(i + 3, ti + e.seq) - 0.5) * s * 0.25;
          shard(g, b[0] + ox, b[1] + oy, s * (0.3 + 0.3 * hash(i + 5, ti)) * grow, s * 0.07, (hash(i + 7, ti) - 0.5) * 0.7, E.body, E.hi, a);
        }
        if (!lowQ) puff(g, t.x + 0.5, t.y + 0.55, 0.1, q, e.seq + ti, 4, "220,245,255", 0.12);
      } else if (e.element === "thunder") { // สายฟ้าฟาดลงทุกช่อง
        const a = q < 0.45 ? (Math.sin(now / 30 + ti) > -0.3 ? 1 : 0.35) : Math.max(0, 1 - (q - 0.45) / 0.4);
        if (a > 0) bolt(g, b[0] + (hash(ti, e.seq) - 0.5) * 50, Y0 - 10, b[0], b[1], e.seq * 13 + ti + Math.floor(now / 90), Math.max(1.4, s * 0.04), a);
        glowAt(g, b[0], b[1], s * 0.8, E.rgb, (1 - q) * 0.8);
        if (!lowQ && q < 0.6) for (let i = 0; i < 4; i++) { const ang = hash(i, ti + e.seq) * TAU, r = s * 0.5 * q; g.fillStyle = `rgba(255,246,160,${1 - q})`; g.fillRect(b[0] + Math.cos(ang) * r, b[1] + Math.sin(ang) * r * 0.5 - s * 0.3 * q, 2, 2); }
      } else { // ไฟลุก
        const a = q < 0.6 ? 1 : 1 - (q - 0.6) / 0.4;
        for (let i = 0; i < (lowQ ? 2 : 4); i++) {
          const ox = (hash(i, ti + e.seq) - 0.5) * s * 0.6, oy = (hash(i + 3, ti + e.seq) - 0.5) * s * 0.25;
          const h = s * (0.3 + 0.3 * hash(i + 5, ti)) * Math.min(1, q * 4) * (0.85 + 0.15 * Math.sin(now / 70 + i * 2 + ti));
          flameTongue(g, b[0] + ox, b[1] + oy, h, s * 0.1, a * 0.95);
        }
        glowAt(g, b[0], b[1] - s * 0.15, s * 0.7, E.rgb, a * 0.5);
      }
    });
    if (Array.isArray(e.shock) && q > 0.2) { // ไฟฟ้าแล่นบนผิวน้ำ
      const a = Math.min(1, (q - 0.2) / 0.1) * (1 - Math.max(0, (q - 0.75) / 0.25));
      e.shock.forEach((t, i) => { const b = P(t.x + 0.5, t.y + 0.5, 0.04); arcs(g, b[0], b[1], b[2], Math.floor(now / 70) * 31 + i * 7 + e.seq, a); });
    }
    return true;
  }
  if (e.kind === "turret_shot") {
    const from = e.from, tgt = unitAt(units, e.target) || (e.to ? { x: e.to.x + 0.5, y: e.to.y + 0.5 } : null);
    if (!from || !tgt) return true;
    const fx0 = from.x + 0.5, fy0 = from.y + 0.5, ang = Math.atan2(tgt.y - fy0, tgt.x - fx0);
    const m = P(fx0 + Math.cos(ang) * 0.72, fy0 + Math.sin(ang) * 0.72, 1.13), s = m[2];
    for (let i = 0; i < 3; i++) {
      const k = (p - i * 0.14) / 0.3;
      if (k < 0 || k > 1) continue;
      const jx = (hash(i, e.seq) - 0.5) * 0.25, jy = (hash(i + 2, e.seq) - 0.5) * 0.25, b = P(tgt.x + jx, tgt.y + jy, 0.55);
      const h = Math.min(1, k * 1.6), tl = Math.max(0, h - 0.4);
      const ax = m[0] + (b[0] - m[0]) * tl, ay = m[1] + (b[1] - m[1]) * tl, bx = m[0] + (b[0] - m[0]) * h, by = m[1] + (b[1] - m[1]) * h;
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by);
      g.strokeStyle = "rgba(255,190,90,.35)"; g.lineWidth = Math.max(3, s * 0.08); g.stroke();
      g.strokeStyle = "rgba(255,240,180,.95)"; g.lineWidth = Math.max(1.2, s * 0.025); g.stroke();
      if (k < 0.3) glowAt(g, m[0], m[1], s * 0.5, "255,210,120", 1 - k / 0.3);
      if (h >= 1) {
        glowAt(g, b[0], b[1], s * 0.45, "255,200,120", 1 - k);
        if (!lowQ) for (let j = 0; j < 5; j++) { const a2 = hash(j, e.seq + i) * TAU, r = s * 0.35 * (k - 0.6) / 0.4; g.fillStyle = `rgba(255,230,150,${1 - k})`; g.fillRect(b[0] + Math.cos(a2) * r, b[1] + Math.sin(a2) * r * 0.6, 2, 2); }
      }
    }
    return true;
  }
  if (e.kind === "city_flash") { // ไฟสาดเมือง: วงแสงขาวแผ่จากแผงไฟ + ประกายบนมอนที่ตาพร่า
    const c = P(e.x + 0.5, e.y + 0.5, 0.5), k = 1 - p;
    glowAt(g, c[0], c[1], c[2] * (1 + p * (e.r || 6) * 1.4), "255,250,220", 0.75 * k);
    gEllipse(g, e.x + 0.5, e.y + 0.5, 0.5 + p * (e.r || 6), 0.03, 48); g.strokeStyle = `rgba(255,245,200,${0.8 * k})`; g.lineWidth = 3; g.stroke();
    for (const h of e.hits || []) { const q = P(h.x + 0.5, h.y + 0.5, 1.2); emoji(g, "💫", q[0], q[1], q[2] * 0.35, k); }
    return true;
  }
  if (e.kind === "meteor_impact") {
    for (const t of e.tiles || []) {
      const fall = Math.min(1, p / 0.3), top = P(t.x + 0.5 - 3 * (1 - fall), t.y + 0.5, 12 * (1 - fall)), base = P(t.x + 0.5, t.y + 0.5, 0);
      if (p < 0.3) { g.strokeStyle = "rgba(255,200,120,.9)"; g.lineWidth = 4; g.beginPath(); g.moveTo(top[0], top[1]); g.lineTo(top[0] - 30, top[1] - 40); g.stroke(); glowAt(g, top[0], top[1], base[2] * 0.6, "255,160,60", 0.9); }
      else { const q = (p - 0.3) / 0.7; glowAt(g, base[0], base[1], base[2] * (0.6 + q * 1.4), "255,130,40", (1 - q) * 0.9); puff(g, t.x + 0.5, t.y + 0.5, 0.2, q, e.seq + t.x, lowQ ? 5 : 12, "120,100,90", 0.28); }
    }
    return true;
  }
  if (e.kind === "supply_load") { const c = P(e.x + 0.5, e.y + 0.5, 0.9 + p * 0.8); emoji(g, "📦", c[0], c[1], c[2] * 0.4, 1 - p); return true; }
  if (e.kind === "mob_attack") {
    const p0 = p;
    for (const h of e.pillars || []) if (h.wall && h.at && (p = subP(e, h, p0, fx.mob_attack)) > 0.25 && p < 1) { const q = (p - 0.25) / 0.75; puff(g, h.at.x + 0.5, h.at.y + 0.5, 0.3, q, e.seq + h.at.x, lowQ ? 4 : (h.broke ? 14 : 7), "150,140,125", h.broke ? 0.3 : 0.18); }
    for (const a of e.attacks || []) {
      p = subP(e, a, p0, fx.mob_attack); if (!live(p)) continue;
      const u = unitAt(units, a.target);
      if (!u) continue;
      const [x, y, s] = P(u.x, u.y, 0.6);
      if (p > 0.25) slashFx(g, x, y, s, a.type === "beast", (p - 0.25) / 0.75);
    }
    return true;
  }
  if (e.kind === "mob_hit") {
    if (lowQ) return true;
    const m = MOVES.get(`mob:${e.id}`), pos = m ? posOf(m, now) : { x: e.x, y: e.y }, c = P(pos.x + 0.5, pos.y + 0.55, 0.8);
    for (let i = 0; i < 8; i++) { const ang = hash(i, e.seq) * TAU, r = c[2] * 0.5 * p; g.fillStyle = `rgba(255,240,200,${1 - p})`; g.fillRect(c[0] + Math.cos(ang) * r, c[1] + Math.sin(ang) * r * 0.6, 2, 2); }
    return true;
  }
  if (e.kind === "mob_die") {
    const cx = e.x + 0.5, cy = e.y + 0.55, beast = e.type === "beast", [sx, sy, s] = P(cx, cy);
    const head = MOB_HEAD.get(e.id) || { dx: 1, dy: 0 }, face = screenFace(cx, cy, head);
    if (beast) { // ล้มลงจมเงาฝุ่นม่วง
      drawBeast(g, sx, sy, s, face, now, false, lowQ, Math.max(0, 1 - p * 1.3), p * 0.5);
      puff(g, cx, cy, 0.1, p, e.seq, lowQ ? 5 : 12, "70,40,70", 0.22);
      glowAt(g, sx, sy - s * 0.8, s * 1.6, "150,60,140", (1 - p) * 0.5);
    } else { // ระเบิดประกายไฟ + ควัน
      const al = Math.max(0, 1 - p * 2);
      if (al > 0) sprite(g, MAGITEK_IMG, cx, cy, -p * 0.3, 1.45, face > 0, al);
      const c = P(cx, cy, 0.7);
      glowAt(g, c[0], c[1], s * (0.5 + p * 1.2), "255,150,60", (1 - p) * 0.9);
      if (!lowQ) for (let i = 0; i < 14; i++) {
        const ang = hash(i, e.seq) * TAU, r = s * 1.1 * p;
        g.fillStyle = `rgba(255,${180 + Math.floor(hash(i, 3) * 70)},90,${1 - p})`; g.fillRect(c[0] + Math.cos(ang) * r, c[1] + Math.sin(ang) * r * 0.6 - s * 0.4 * p + s * 0.6 * p * p, 2.5, 2.5);
      }
      if (p > 0.15) puff(g, cx, cy, 0.6 + p, (p - 0.15) / 0.85, e.seq, lowQ ? 4 : 9, "50,50,56", 0.18);
    }
    return true;
  }
  if (e.kind === "beast_roar") {
    const m = MOVES.get(`mob:${e.id}`), pos = m ? posOf(m, now) : { x: e.x, y: e.y }, cx = pos.x + 0.5, cy = pos.y + 0.55;
    for (let i = 0; i < 3; i++) {
      const k = (p - i * 0.15) / 0.7;
      if (k <= 0 || k >= 1) continue;
      gEllipse(g, cx, cy, 0.5 + ease(k) * 3.2, 0.05, 44); g.strokeStyle = `rgba(255,200,170,${0.6 * (1 - k)})`; g.lineWidth = Math.max(1.5, 4 * (1 - k)); g.stroke();
    }
    const h = P(cx + 0.3, cy, 1.1), s = h[2];
    for (let i = 0; i < 2; i++) { // คลื่นเสียงจากปาก
      const k = (p * 2 - i * 0.4) % 1;
      if (k < 0) continue;
      g.beginPath(); g.ellipse(h[0], h[1], s * (0.2 + k * 0.9), s * (0.12 + k * 0.5), 0, 0, TAU); g.strokeStyle = `rgba(255,230,210,${0.5 * (1 - k) * (1 - p)})`; g.lineWidth = 2; g.stroke();
    }
    if (!lowQ) puff(g, cx, cy, 0.05, p, e.seq, 8, "160,140,120", 0.14);
    return true;
  }
  if (e.kind === "dropship_warn") {
    const c = P(e.x + 1, e.y + 1, 0.05);
    glowAt(g, c[0], c[1], c[2] * 1.4, "255,40,30", (1 - p) * 0.5);
    return true;
  }
  if (e.kind === "dropship_land") {
    if (p > 0.4) {
      const q = (p - 0.4) / 0.6;
      puff(g, e.x + 1, e.y + 1, 0.05, q, e.seq, lowQ ? 6 : 16, "190,175,150", 0.28);
      if (q < 0.6) { gEllipse(g, e.x + 1, e.y + 1, 0.8 + q * 2.4, 0.04, 40); g.strokeStyle = `rgba(230,220,200,${0.5 * (1 - q / 0.6)})`; g.lineWidth = 2; g.stroke(); }
    }
    for (const t of p > 0.6 ? e.spawned || [] : []) { // ทหารที่ลงจากยาน
      const c = P(t.x + 0.5, t.y + 0.5, 0.6);
      glowAt(g, c[0], c[1], c[2] * 0.7, "255,80,60", (1 - p) * 1.5);
    }
    return true;
  }
  if (e.kind === "dropship_leave") {
    const z = DROP_Z + ease(p) * 8, al = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.3);
    if (p < 0.5) puff(g, e.x + 1, e.y + 1, 0.05, p / 0.5, e.seq, lowQ ? 6 : 14, "190,175,150", 0.26);
    drawDropship(g, e.x, e.y, z, now, lowQ, al);
    return true;
  }
  return false;
}
