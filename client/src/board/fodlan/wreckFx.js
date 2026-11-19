// ============================================================
//  Nautilus ชั้น 2 — ภาพ + ฉาก + เสียงของลูกเล่นโต้ตอบ (server/fodlan/ntWreck.js · fd.wreck)
//   ของบนกระดาน: ถังดินปืน (ไส้ชนวนคุแดง) · ปั้นจั่นแขวนลัง (เงาลังบนพื้น 2×2) / กองลังแตก · ประตูกั้นน้ำ (เปิดพิงผนัง / ปิดสนิทมีพวงมาลัย)
//               ผนังถล่ม · เนินตะกอน · น้ำท่วมห้องที่ปิด · ฝูงฉลามวน · กำแพงตะกอนรอที่ขอบ · ควันปืนใหญ่ที่กำลังบรรจุ · ปลาไหลโผล่จากรู
//   ฉาก: nt8_cannon (ไฟปากกระบอก ลูกปืนลากฟอง) · nt8_keg (ระเบิดไล่ทีละถัง) · nt8_chain (โซ่ตึงฟาดทั้งแถว) · nt8_crate (ลังหล่น)
//        nt8_door / nt8_door_break · nt8_flood · nt8_eel (เหยื่อ → ปลาไหลพุ่งงับ) · nt8_creak / nt8_collapse · nt8_sharks / nt8_shark_bite
//        nt8_silt_warn / nt8_silt (กำแพงตะกอนกวาด) · nt8_chest (เหรียญ/หีบกัด) · nt_dodge · nt_shove
// ============================================================
import { P, depthOf, glow, gEllipse, rng } from "../boardGeo";
import { fxT, fxOnce } from "./index";
import { playSfx, registerSounds } from "../../audio";

const TAU = Math.PI * 2;
const K = (x, y) => `${x},${y}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeIn = (k) => k * k;
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
export const WRECK_FX = {
  nt8_cannon: 1700, nt8_keg: 2200, nt8_chain: 1500, nt8_crate: 1500, nt8_door: 1100, nt8_door_break: 1100, nt8_flood: 1400, nt8_eel: 1300,
  nt8_creak: 1600, nt8_collapse: 1800, nt8_sharks: 1600, nt8_shark_bite: 1400, nt8_silt_warn: 1600, nt8_silt: 2200, nt8_chest: 1300, nt_dodge: 700, nt_shove: 500,
};

// ---------- เสียง ----------
const SFX = ["boom", "impact", "deepimpact", "rumble", "whip", "slap", "squish", "splash", "bubbles", "swirl", "gulp", "whoosh", "tailslap", "spit",
  "l8_cannon", "l8_creak", "l8_crash", "l8_door", "l8_hiss", "l8_clang", "l8_debris", "l8_quake", "l8_coins", "l8_lock"];
let SND = false;
function snd(k, gain = 1, delay = 0) {
  if (!SND) { SND = true; registerSounds(Object.fromEntries(SFX.map((n) => [`ntw_${n}`, `/nautilus/sfx/${n}.mp3`]))); }
  const go = () => playSfx(`ntw_${k}`, { gain }); if (delay > 0) setTimeout(go, delay); else go();
}
function sounds(e) {
  switch (e.kind) {
    case "nt8_cannon": snd("l8_cannon", 1); snd("whoosh", 0.5, 120); if ((e.hits || []).length) snd("impact", 0.7, 380); break;
    case "nt8_keg": (e.chain || []).slice(0, 4).forEach((c, i) => snd(i ? "boom" : "l8_cannon", i ? 0.7 : 0.9, i * 180)); snd("l8_debris", 0.6, 250); break;
    case "nt8_chain": snd("l8_clang", 0.8); snd("whip", 1, 120); if ((e.hits || []).length) snd("slap", 0.7, 300); break;
    case "nt8_crate": snd("l8_creak", 0.6); snd("l8_crash", 1, 330); break;
    case "nt8_door": snd("l8_door", 1); snd("l8_hiss", 0.6, 250); break;
    case "nt8_door_break": snd("l8_clang", 1); snd("bubbles", 0.8, 100); break;
    case "nt8_flood": snd("bubbles", 0.6); snd("gulp", 0.4, 300); break;
    case "nt8_eel": snd("spit", 0.4); snd("whip", 0.8, 260); snd("squish", 0.9, 420); break;
    case "nt8_creak": snd("l8_creak", 0.9); break;
    case "nt8_collapse": snd("l8_crash", 1); snd("l8_debris", 0.8, 200); break;
    case "nt8_sharks": snd("tailslap", 0.6); snd("whoosh", 0.5, 300); break;
    case "nt8_shark_bite": snd("whoosh", 0.7); snd("squish", 1, 380); snd("slap", 0.6, 420); break;
    case "nt8_silt_warn": snd("l8_quake", 0.7); break;
    case "nt8_silt": snd("l8_quake", 1); snd("rumble", 0.7, 200); break;
    case "nt8_chest": if (e.mimic) { snd("l8_lock", 0.6); snd("squish", 1, 250); } else { snd("l8_lock", 0.7); snd("l8_coins", 0.9, 350); } break;
    default: break;
  }
}

// ---------- รูปทรง ----------
const poly = (g, pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
// กล่อง 3 มิติ (ด้านไกลก่อน · ฝาบนท้ายสุด) · col = [ข้างสว่าง, ข้างมืด, ฝา]
function box3(g, x0, y0, x1, y1, z0, z1, col, line = "rgba(10,6,4,.6)") {
  const faces = [[[x0, y0], [x1, y0], 0], [[x1, y0], [x1, y1], 1], [[x1, y1], [x0, y1], 0], [[x0, y1], [x0, y0], 1]]
    .map(([a, b, s]) => ({ a, b, s, d: depthOf((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) })).sort((p, q) => p.d - q.d);
  for (const f of faces) { poly(g, [P(f.a[0], f.a[1], z0), P(f.b[0], f.b[1], z0), P(f.b[0], f.b[1], z1), P(f.a[0], f.a[1], z1)]); g.fillStyle = col[f.s]; g.fill(); g.strokeStyle = line; g.lineWidth = 1; g.stroke(); }
  poly(g, [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)]); g.fillStyle = col[2]; g.fill(); g.strokeStyle = line; g.stroke();
}
// ถังไม้ทรงกระบอก (ตั้ง) ที่ (x,y) รัศมี r ช่อง สูง h
function cask(g, x, y, r, h, body, hoop, t, lit) {
  const b = P(x, y, 0), top = P(x, y, h), s = b[2], rx = s * r, ry = s * r * 0.42;
  g.fillStyle = "rgba(0,6,10,.5)"; g.beginPath(); g.ellipse(b[0], b[1], rx * 1.25, ry * 1.2, 0, 0, TAU); g.fill();
  const gr = g.createLinearGradient(b[0] - rx, 0, b[0] + rx, 0); gr.addColorStop(0, "#2a1c12"); gr.addColorStop(0.45, body); gr.addColorStop(1, "#1d140c");
  g.fillStyle = gr; g.beginPath(); g.moveTo(b[0] - rx, b[1]); g.bezierCurveTo(b[0] - rx * 1.12, (b[1] + top[1]) / 2, b[0] - rx * 1.12, (b[1] + top[1]) / 2, top[0] - rx, top[1]);
  g.lineTo(top[0] + rx, top[1]); g.bezierCurveTo(b[0] + rx * 1.12, (b[1] + top[1]) / 2, b[0] + rx * 1.12, (b[1] + top[1]) / 2, b[0] + rx, b[1]);
  g.ellipse(b[0], b[1], rx, ry, 0, 0, Math.PI); g.closePath(); g.fill();
  g.strokeStyle = hoop; g.lineWidth = Math.max(1.2, s * 0.025);
  for (const k of [0.18, 0.82]) { const p = P(x, y, h * k); g.beginPath(); g.ellipse(p[0], p[1], rx * 1.06, ry, 0, 0, Math.PI); g.stroke(); }
  g.fillStyle = "#3a2a1c"; g.beginPath(); g.ellipse(top[0], top[1], rx, ry, 0, 0, TAU); g.fill(); g.strokeStyle = hoop; g.stroke();
  // ตราไขว้สีซีด (ดินปืน)
  const m = P(x, y, h * 0.5); g.strokeStyle = "rgba(220,210,180,.55)"; g.lineWidth = Math.max(1, s * 0.02);
  g.beginPath(); g.moveTo(m[0] - rx * 0.35, m[1] - s * 0.08); g.lineTo(m[0] + rx * 0.35, m[1] + s * 0.06); g.moveTo(m[0] + rx * 0.35, m[1] - s * 0.08); g.lineTo(m[0] - rx * 0.35, m[1] + s * 0.06); g.stroke();
  if (lit) { // ไส้ชนวนโผล่จากฝา ปลายคุแดงเต้นช้าๆ
    const f0 = P(x + r * 0.3, y, h), f1 = P(x + r * 0.55, y - r * 0.2, h + 0.18 + Math.sin(t * 1.3 + x) * 0.02);
    g.strokeStyle = "#1a1410"; g.lineWidth = Math.max(1, s * 0.015); g.beginPath(); g.moveTo(f0[0], f0[1]); g.quadraticCurveTo(f1[0] - s * 0.05, f0[1] - s * 0.1, f1[0], f1[1]); g.stroke();
    const pulse = 0.45 + 0.35 * Math.sin(t * 2.4 + y);
    glow(g, f1[0], f1[1], s * 0.16, "255,120,60", pulse * 0.7); g.fillStyle = `rgba(255,170,90,${pulse})`; g.beginPath(); g.arc(f1[0], f1[1], s * 0.018, 0, TAU); g.fill();
  }
}

// ---------- ของบนกระดาน (เรียงความลึก) ----------
export function wreckItems(list, g, fd, info, now) {
  const w = fd && fd.wreck; if (!w) return;
  const t = now / 1000;
  // ถังดินปืน: ถังใหญ่ตั้ง + ถังเล็ก/ลูกปืนกองข้าง (ต่างกันตามช่อง)
  for (const k of w.kegs || []) {
    const R = rng(k.x * 71 + k.y * 13);
    list.push({ d: depthOf(k.x + 0.5, k.y + 0.5), f: () => {
      cask(g, k.x + 0.45, k.y + 0.55, 0.26, 0.62, "#6a4a2c", "#2b2d30", t, true);
      if (R() < 0.6) cask(g, k.x + 0.78, k.y + 0.3, 0.14, 0.34, "#5a3e26", "#2b2d30", t, false);
      for (let i = 0; i < 3; i++) { const p = P(k.x + 0.2 + i * 0.09, k.y + 0.85, 0.05), s = p[2]; g.fillStyle = "#1b1d20"; g.beginPath(); g.arc(p[0], p[1], s * 0.05, 0, TAU); g.fill(); g.fillStyle = "rgba(160,170,180,.3)"; g.beginPath(); g.arc(p[0] - s * 0.015, p[1] - s * 0.015, s * 0.015, 0, TAU); g.fill(); }
    } });
  }
  // ปั้นจั่น: แขนเอียงจากยอดเสาไปเหนือลัง · ลังแขวนแกว่ง · เงาลังบนพื้น 2×2 (ที่ที่จะหล่น) · หล่นแล้ว = กองลังแตก + เชือกขาดห้อย
  for (const c of w.cranes || []) {
    const ax = c.area[0].x + 1, ay = c.area[0].y + 1, px = c.post.x + 0.5, py = c.post.y + 0.5;
    const tip = [ax + (px - ax) * 0.12, ay + (py - ay) * 0.12];
    const k = fxProg(fd, "nt8_crate", (e) => e.post && e.post.x === c.post.x && e.post.y === c.post.y, now);
    list.push({ d: depthOf(ax, ay) + 0.02, f: () => {
      // แขนปั้นจั่น (ไม้ผุ + เหล็กรัด) จากยอดเสา
      const a = P(px, py, 2.75), b = P(tip[0], tip[1], 2.95), s = a[2];
      g.lineCap = "round"; g.strokeStyle = "#1e150e"; g.lineWidth = Math.max(3, s * 0.11); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      g.strokeStyle = "#7a5c3c"; g.lineWidth = Math.max(1.5, s * 0.06); g.stroke();
      g.strokeStyle = "rgba(20,14,10,.7)"; g.lineWidth = Math.max(1, s * 0.02); const st0 = P(px, py, 1.9); g.beginPath(); g.moveTo(st0[0], st0[1]); g.lineTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); g.stroke(); // ค้ำยัน
      g.fillStyle = "#24262a"; g.beginPath(); g.arc(b[0], b[1], s * 0.07, 0, TAU); g.fill(); g.lineCap = "butt"; // รอก
      if (c.dropped && !(k >= 0 && k < 1)) { cargoPile(g, c.area, t); ropeEnd(g, b, s, t, 0.6); return; }
      const sway = Math.sin(t * 0.9 + c.id) * 0.06;
      let z = 1.25, shake = 0;
      if (k >= 0 && k < 1) { if (k < 0.22) shake = Math.sin(k * 120) * 0.04; else z = Math.max(0, 1.25 - easeIn((k - 0.22) / 0.2) * 1.25); }
      // เงาลังบนพื้น (ชัดขึ้นเมื่อลังต่ำลง) — บอกตำแหน่งที่จะหล่น
      g.fillStyle = `rgba(0,4,8,${0.38 + (1.25 - z) * 0.3})`; poly(g, [P(ax - 0.95, ay - 0.95, 0.01), P(ax + 0.95, ay - 0.95, 0.01), P(ax + 0.95, ay + 0.95, 0.01), P(ax - 0.95, ay + 0.95, 0.01)]); g.fill();
      g.strokeStyle = "rgba(220,70,50,.3)"; g.lineWidth = 1.4; g.setLineDash([4, 5]); g.stroke(); g.setLineDash([]);
      if (z > 0.02 || k < 0) {
        const cx = ax + sway + shake, cy = ay;
        const top = P(cx, cy, z + 0.75);
        if (!(k >= 0.22)) { g.strokeStyle = "#c2aa78"; g.lineWidth = Math.max(1.6, s * 0.04); g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(top[0], top[1]); g.stroke(); }
        else ropeEnd(g, b, s, t, 0.5);
        box3(g, cx - 0.42, cy - 0.42, cx + 0.42, cy + 0.42, z, z + 0.72, ["#6b5236", "#4a3824", "#7a6040"]);
        const f = P(cx, cy + 0.42, z + 0.36); g.strokeStyle = "rgba(30,20,12,.8)"; g.lineWidth = Math.max(1, s * 0.03); g.beginPath(); g.moveTo(f[0] - s * 0.3, f[1] - s * 0.1); g.lineTo(f[0] + s * 0.3, f[1] + s * 0.1); g.stroke();
        g.fillStyle = "rgba(90,130,90,.6)"; const tp = P(cx + 0.2, cy - 0.1, z + 0.73); g.beginPath(); g.ellipse(tp[0], tp[1], s * 0.12, s * 0.04, 0, 0, TAU); g.fill(); // สาหร่ายเกาะฝาลัง
      }
    } });
  }
  // ประตูกั้นน้ำ: กรอบเหล็ก + บานประตูกลมมุมมน (เปิด = พิงข้างกรอบ · ปิด = อยู่ในกรอบ มีพวงมาลัยล็อก)
  const zk = info && info.terrainKind ? info.terrainKind : {};
  const hullish = (x, y) => { const v = zk[K(x, y)]; return v === "fd_nt_hull" || v === "fd_nt_eelhole"; };
  for (const r of w.rooms || []) for (const d of r.doors || []) {
    const vert = hullish(d.x, d.y - 1) || hullish(d.x, d.y + 1);
    const swing = doorSwing(fd, r, now);
    list.push({ d: depthOf(d.x + 0.5, d.y + 0.5) + 0.03, f: () => door(g, d.x, d.y, vert, r.shut, swing, t) });
  }
  // ผนังถล่ม: แผ่นเหล็กบิดเบี้ยวกองสูง
  for (const k of w.collapsed || []) { const [x, y] = k.split(",").map(Number); list.push({ d: depthOf(x + 0.5, y + 0.5), f: () => collapsedPile(g, x, y) }); }
}
// ความคืบหน้าของฉากล่าสุดที่ตรงเงื่อนไข (-1 = ไม่มี)
function fxProg(fd, kind, ok, now) {
  let k = -1;
  for (const e of fd.fx || []) if (e.kind === kind && ok(e)) { const v = fxT(e, now, WRECK_FX[kind]); if (v < 1) k = v; }
  return k;
}
function doorSwing(fd, r, now) {
  let v = r.shut ? 1 : 0;
  for (const e of fd.fx || []) {
    if (e.room !== r.id) continue;
    if (e.kind === "nt8_door") { const k = fxT(e, now, WRECK_FX.nt8_door); if (k < 1) v = easeOut(Math.min(1, k / 0.45)); }
    if (e.kind === "nt8_door_break") { const k = fxT(e, now, WRECK_FX.nt8_door_break); if (k < 1) v = 1 - easeOut(Math.min(1, k / 0.3)); }
  }
  return v;
}
function ropeEnd(g, b, s, t, len) { g.strokeStyle = "#c2aa78"; g.lineWidth = Math.max(1.6, s * 0.04); g.beginPath(); g.moveTo(b[0], b[1]); g.quadraticCurveTo(b[0] + Math.sin(t * 1.4) * s * 0.1, b[1] + s * len * 0.6, b[0] + Math.sin(t * 1.1) * s * 0.15, b[1] + s * len); g.stroke(); }
function cargoPile(g, area, t) {
  const R = rng(area[0].x * 17 + area[0].y * 5);
  for (let i = 0; i < 9; i++) { // ไม้ลังแตกกระจาย
    const x = area[0].x + 0.2 + R() * 1.6, y = area[0].y + 0.2 + R() * 1.6, a = R() * Math.PI, l = 0.3 + R() * 0.35;
    poly(g, [P(x - Math.cos(a) * l / 2, y - Math.sin(a) * l / 2, 0.02), P(x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2, 0.02), P(x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2, 0.08), P(x - Math.cos(a) * l / 2, y - Math.sin(a) * l / 2, 0.08)]);
    g.fillStyle = R() < 0.5 ? "#6b5236" : "#4a3824"; g.fill();
  }
  // ลังที่ยังพอเป็นรูป (เอียง) + กระสอบ + ลูกปืนกลิ้ง
  box3(g, area[0].x + 0.55, area[0].y + 0.6, area[0].x + 1.25, area[0].y + 1.3, 0, 0.42, ["#6b5236", "#4a3824", "#5d462c"]);
  for (let i = 0; i < 3; i++) { const p = P(area[0].x + 1.4 + R() * 0.4, area[0].y + 0.3 + R() * 1.3, 0.1), s = p[2]; g.fillStyle = "#8b7d5c"; g.beginPath(); g.ellipse(p[0], p[1], s * 0.16, s * 0.1, R(), 0, TAU); g.fill(); }
  for (let i = 0; i < 5; i++) { const p = P(area[0].x + 0.3 + R() * 1.4, area[0].y + 1.5 + R() * 0.4, 0.05), s = p[2]; g.fillStyle = "#1b1d20"; g.beginPath(); g.arc(p[0], p[1], s * 0.045, 0, TAU); g.fill(); }
  void t;
}
function door(g, x, y, vert, shut, swing, t) {
  // กรอบ: เสาเหล็ก 2 ข้าง + คานบน
  const H = 1.25, side = vert ? [[x + 0.5, y], [x + 0.5, y + 1]] : [[x, y + 0.5], [x + 1, y + 0.5]];
  const c0 = side[0], c1 = side[1];
  g.strokeStyle = "#3a2a22"; g.lineCap = "round";
  for (const c of side) { const a = P(c[0], c[1], 0), b = P(c[0], c[1], H), s = a[2]; g.lineWidth = Math.max(2, s * 0.09); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  { const a = P(c0[0], c0[1], H), b = P(c1[0], c1[1], H), s = a[2]; g.lineWidth = Math.max(2, s * 0.08); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  g.lineCap = "butt";
  // บานประตู: หมุนรอบบานพับ (c0) จากพิงผนัง (swing 0) ถึงปิดสนิท (swing 1)
  const ang = (1 - swing) * Math.PI * 0.5, w = 0.92;
  const dx = vert ? 0 : 1, dy = vert ? 1 : 0, nx = vert ? 1 : 0, ny = vert ? 0 : 1;
  const ex = c0[0] + (dx * Math.cos(ang) + nx * Math.sin(ang)) * w, ey = c0[1] + (dy * Math.cos(ang) + ny * Math.sin(ang)) * w;
  const sx = c0[0] + (dx * 0.04), sy = c0[1] + (dy * 0.04);
  const pts = [P(sx, sy, 0.05), P(ex, ey, 0.05), P(ex, ey, H * 0.92), P(sx, sy, H * 0.92)];
  const gr = g.createLinearGradient(pts[0][0], pts[3][1], pts[1][0], pts[0][1]); gr.addColorStop(0, shut ? "#6a4636" : "#4e3a30"); gr.addColorStop(1, shut ? "#3c2820" : "#2c201a");
  poly(g, pts); g.fillStyle = gr; g.fill(); g.strokeStyle = "rgba(15,8,6,.8)"; g.lineWidth = 1.2; g.stroke();
  // หมุดย้ำรอบบาน + พวงมาลัยล็อกกลางบาน
  const m = P((sx + ex) / 2, (sy + ey) / 2, H * 0.5), s = m[2];
  g.fillStyle = "rgba(25,15,10,.9)"; for (let i = 0; i < 6; i++) { const u = (i + 0.5) / 6, p = P(sx + (ex - sx) * u, sy + (ey - sy) * u, H * 0.85); g.beginPath(); g.arc(p[0], p[1], Math.max(0.8, s * 0.015), 0, TAU); g.fill(); }
  g.strokeStyle = shut ? "#b08a50" : "#6e5a3a"; g.lineWidth = Math.max(1.2, s * 0.03); g.beginPath(); g.ellipse(m[0], m[1], s * 0.13 * Math.max(0.25, Math.abs(Math.cos(ang)) * 0.9 + 0.1), s * 0.13, 0, 0, TAU); g.stroke();
  const rot = shut ? t * 0 : 0; for (let i = 0; i < 3; i++) { const a = rot + i * Math.PI / 3; g.beginPath(); g.moveTo(m[0] - Math.cos(a) * s * 0.12, m[1] - Math.sin(a) * s * 0.12); g.lineTo(m[0] + Math.cos(a) * s * 0.12, m[1] + Math.sin(a) * s * 0.12); g.stroke(); }
  if (shut) { // น้ำซึมรอบขอบเป็นสายฟองเล็กๆ
    for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1, p = P(sx + (ex - sx) * (0.2 + i * 0.3), sy + (ey - sy) * (0.2 + i * 0.3), H * (0.9 + k * 0.8)); g.strokeStyle = `rgba(200,240,250,${0.6 * (1 - k)})`; g.lineWidth = 1; g.beginPath(); g.arc(p[0], p[1], p[2] * 0.02, 0, TAU); g.stroke(); }
  }
}
function collapsedPile(g, x, y) {
  const R = rng(x * 37 + y * 101);
  g.fillStyle = "rgba(0,6,10,.5)"; gEllipse(g, x + 0.5, y + 0.5, 0.55, 0, 24, 0.5); g.fill();
  for (let i = 0; i < 5; i++) { // แผ่นเหล็กสนิมบิดพิงกัน
    const cx = x + 0.2 + R() * 0.6, cy = y + 0.2 + R() * 0.6, a = R() * Math.PI, l = 0.35 + R() * 0.3, h = 0.35 + R() * 0.75, lean = (R() - 0.5) * 0.5;
    const p0 = [cx - Math.cos(a) * l, cy - Math.sin(a) * l], p1 = [cx + Math.cos(a) * l, cy + Math.sin(a) * l];
    const pts = [P(p0[0], p0[1], 0), P(p1[0], p1[1], 0), P(p1[0] + lean, p1[1], h * 0.8), P(cx + lean, cy, h), P(p0[0] + lean, p0[1], h * 0.7)];
    poly(g, pts); const k = 0.6 + R() * 0.5; g.fillStyle = `rgb(${Math.round(110 * k)},${Math.round(64 * k)},${Math.round(44 * k)})`; g.fill();
    g.strokeStyle = "rgba(20,10,6,.7)"; g.lineWidth = 1; g.stroke();
    const m = P(cx + lean * 0.5, cy, h * 0.5); g.fillStyle = "rgba(20,12,8,.8)"; g.beginPath(); g.arc(m[0], m[1], Math.max(0.8, m[2] * 0.015), 0, TAU); g.fill();
  }
  // ตะกอนฟุ้งค้างที่ฐาน
  const b = P(x + 0.5, y + 0.5, 0.05); g.fillStyle = "rgba(110,120,120,.3)"; g.beginPath(); g.ellipse(b[0], b[1], b[2] * 0.5, b[2] * 0.15, 0, 0, TAU); g.fill();
}

// ---------- พื้น (ใต้ตัวละคร) ----------
export function wreckGround(g, fd, info, now) {
  const w = fd && fd.wreck; if (!w) return;
  // เนินตะกอน: ก้อนนูนนุ่ม สีอ่อนกว่าพื้น มีเงาด้านล่าง
  for (const k of w.mounds || []) {
    const [x, y] = k.split(",").map(Number), R = rng(x * 11 + y * 7);
    for (let i = 0; i < 3; i++) {
      const cx = x + 0.25 + R() * 0.5, cy = y + 0.25 + R() * 0.5, r = 0.28 + R() * 0.18;
      g.fillStyle = "rgba(10,16,20,.35)"; gEllipse(g, cx + 0.05, cy + 0.06, r, 0, 18); g.fill();
      g.fillStyle = "#6d8080"; gEllipse(g, cx, cy, r, 0.06, 18); g.fill();
      g.fillStyle = "rgba(170,190,185,.35)"; gEllipse(g, cx - r * 0.25, cy - r * 0.25, r * 0.5, 0.1, 14); g.fill();
    }
  }
  void now;
}

// ---------- ทับตัวละคร ----------
export function wreckAir(g, fd, info, now, lowQ, view) {
  const w = fd && fd.wreck; if (!w) return;
  const t = now / 1000, round = info.round || 0;
  // น้ำท่วมห้องที่ปิด: ผิวน้ำระดับเอว ระลอก + ฟอง
  for (const r of w.rooms || []) if (r.shut) flood(g, r.box, t, lowQ);
  // ควันจากปากกระบอกปืนใหญ่ที่กำลังบรรจุ
  if (!lowQ) for (const c of w.cannons || []) if (c.cd > round) for (let i = 0; i < 4; i++) {
    const k = (t * 0.25 + i / 4) % 1, p = P(c.x + 0.5 + Math.sin(t + i) * 0.1, c.y + 0.5, 0.6 + k * 1.6), s = p[2];
    g.fillStyle = `rgba(120,130,130,${0.22 * (1 - k)})`; g.beginPath(); g.arc(p[0], p[1], s * (0.08 + k * 0.18), 0, TAU); g.fill();
  }
  // ฝูงฉลามวนรอบเป้า (ครีบโผล่ เงาตัวใต้)
  if (w.sharks) sharks(g, w.sharks, t, 0);
  // กำแพงตะกอนรอที่ขอบ (ฝุ่นฟุ้งสีน้ำตาลหนา)
  if (w.silt && !lowQ) siltHaze(g, info, w.silt, t);
  // ฉากมืดลง (ก่อนทาลัสซาโผล่ครั้งแรก)
  if (w.dark > 0) {
    const X0 = view ? view.x0 : 0, W = view ? view.x1 - view.x0 : 1280, Y0 = view ? view.y0 : 0, H = view ? view.y1 - view.y0 : 720;
    g.fillStyle = `rgba(0,3,10,${0.34 * w.dark})`; g.fillRect(X0, Y0, W, H);
  }
  drawFx(g, fd, info, now);
}
function flood(g, box, t, lowQ) {
  const [x0, y0, x1, y1] = box, z = 0.75 + Math.sin(t * 0.8) * 0.03;
  // ผนังน้ำด้านข้าง (มวลน้ำในห้อง) แล้วผิวน้ำ
  for (const [a0, b0] of [[[x0, y1 + 1], [x1 + 1, y1 + 1]], [[x1 + 1, y0], [x1 + 1, y1 + 1]], [[x0, y0], [x0, y1 + 1]], [[x0, y0], [x1 + 1, y0]]]) {
    poly(g, [P(a0[0], a0[1], 0), P(b0[0], b0[1], 0), P(b0[0], b0[1], z), P(a0[0], a0[1], z)]); g.fillStyle = "rgba(30,90,120,.14)"; g.fill();
  }
  poly(g, [P(x0, y0, z), P(x1 + 1, y0, z), P(x1 + 1, y1 + 1, z), P(x0, y1 + 1, z)]);
  g.fillStyle = "rgba(40,110,140,.3)"; g.fill(); g.strokeStyle = "rgba(170,230,250,.35)"; g.lineWidth = 1.2; g.stroke();
  // ระลอกผิวน้ำ
  g.strokeStyle = "rgba(190,240,255,.14)"; g.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const u = ((t * 0.12 + i / 6) % 1), yy = y0 + u * (y1 + 1 - y0);
    g.beginPath(); for (let j = 0; j <= 10; j++) { const xx = x0 + (x1 + 1 - x0) * j / 10, p = P(xx, yy + Math.sin(t * 2 + j + i) * 0.05, z); if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); } g.stroke();
  }
  if (!lowQ) for (let i = 0; i < 10; i++) { const k = (t * 0.5 + hash(i, 3)) % 1, p = P(x0 + 0.3 + hash(i, 1) * (x1 - x0 + 0.4), y0 + 0.3 + hash(i, 2) * (y1 - y0 + 0.4), k * z), s = p[2]; g.strokeStyle = `rgba(210,250,255,${0.6 * (1 - k)})`; g.beginPath(); g.arc(p[0], p[1], s * 0.025, 0, TAU); g.stroke(); }
}
// ang = มุมการว่ายบนจอจริง (atan2 ของตำแหน่งจอสองจุด — ผู้ใช้: ห้ามว่ายถอยหลัง) · หันซ้าย = พลิกแนวตั้งให้ท้องอยู่ล่าง
function shark(g, x, y, z, ang, s0, a = 1) {
  const [sx, sy, s] = P(x, y, z), L = s * 0.62 * s0, Hh = s * 0.14 * s0;
  g.save(); g.translate(sx, sy); g.rotate(ang); if (Math.cos(ang) < 0) g.scale(1, -1); g.globalAlpha = a;
  const gr = g.createLinearGradient(0, -Hh, 0, Hh); gr.addColorStop(0, "#3d4c56"); gr.addColorStop(0.6, "#56656e"); gr.addColorStop(1, "#b9c4c4");
  g.fillStyle = gr; g.beginPath(); g.moveTo(L * 0.55, 0); g.quadraticCurveTo(L * 0.3, -Hh, -L * 0.25, -Hh * 0.75); g.lineTo(-L * 0.45, -Hh * 0.2);
  g.lineTo(-L * 0.62, -Hh * 1.1); g.lineTo(-L * 0.55, 0); g.lineTo(-L * 0.62, Hh * 0.9); g.lineTo(-L * 0.45, Hh * 0.2); g.quadraticCurveTo(L * 0.2, Hh * 1.05, L * 0.55, 0); g.fill();
  g.fillStyle = "#33414a"; g.beginPath(); g.moveTo(L * 0.05, -Hh * 0.85); g.lineTo(-L * 0.08, -Hh * 2); g.lineTo(-L * 0.2, -Hh * 0.8); g.fill(); // ครีบหลัง
  g.beginPath(); g.moveTo(L * 0.15, Hh * 0.5); g.lineTo(-L * 0.05, Hh * 1.35); g.lineTo(-L * 0.08, Hh * 0.5); g.fill(); // ครีบอก
  g.fillStyle = "#0b0d0e"; g.beginPath(); g.arc(L * 0.4, -Hh * 0.25, Math.max(1, Hh * 0.12), 0, TAU); g.fill();
  g.strokeStyle = "rgba(20,26,30,.6)"; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(L * (0.22 - i * 0.05), -Hh * 0.3); g.lineTo(L * (0.24 - i * 0.05), Hh * 0.2); g.stroke(); }
  g.restore();
}
// วงฉลาม: 5 ตัววนรอบ (x,y) รัศมีหดลงเมื่อ tight → 1
function sharks(g, sh, t, tight) {
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = t * 0.9 + (i / n) * TAU, r = (1.6 - tight * 1.35) + Math.sin(t * 1.3 + i) * 0.12;
    const x = sh.x + 0.5 + Math.cos(a) * r, y = sh.y + 0.5 + Math.sin(a) * r * 0.85, z = 0.9 + Math.sin(t * 2 + i) * 0.12;
    const b = P(x, y, 0); g.fillStyle = "rgba(0,6,10,.25)"; g.beginPath(); g.ellipse(b[0], b[1], b[2] * 0.3, b[2] * 0.08, 0, 0, TAU); g.fill();
    const p0 = P(x, y, z), p1 = P(sh.x + 0.5 + Math.cos(a + 0.05) * r, sh.y + 0.5 + Math.sin(a + 0.05) * r * 0.85, z);
    shark(g, x, y, z, Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), 1 + hash(i, 4) * 0.25);
  }
}
const EDGE_DIR = { w: [1, 0], e: [-1, 0], s: [0, -1] };
function bandRect(info, edge, step, depth = 3) {
  const d0 = step * depth, d1 = d0 + depth;
  if (edge === "w") return [d0, 0, d1, info.rows];
  if (edge === "e") return [info.cols - d1, 0, info.cols - d0, info.rows];
  return [0, info.rows - d1, info.cols, info.rows - d0];
}
function siltHaze(g, info, sl, t) {
  const [x0, y0, x1, y1] = bandRect(info, sl.edge, sl.step), [dx, dy] = EDGE_DIR[sl.edge];
  // ฝุ่นทรายหนาเป็นก้อนคลื่นที่ขอบแถบด้านนอก (ยังไม่กวาด) — ลอยต่ำ
  const R = rng(17);
  for (let i = 0; i < 26; i++) {
    const u = R(), along = dx ? y0 + u * (y1 - y0) : x0 + u * (x1 - x0), out = (dx > 0 ? x0 : dx < 0 ? x1 : y1) - (dx || dy) * (0.2 + R() * 0.6);
    const x = dx ? out : along, y = dx ? along : out, z = 0.2 + R() * 0.9 + Math.sin(t * 1.5 + i) * 0.08, [sx, sy, s] = P(x, y, z);
    g.fillStyle = `rgba(120,110,90,${0.12 + 0.06 * Math.sin(t * 2 + i)})`; g.beginPath(); g.arc(sx, sy, s * (0.35 + R() * 0.3), 0, TAU); g.fill();
  }
}

// ---------- ฉาก ----------
function drawFx(g, fd, info, now) {
  for (const e of fd.fx || []) {
    const dur = WRECK_FX[e.kind]; if (!dur) continue;
    if (fxOnce(e)) sounds(e);
    const k = fxT(e, now, dur); if (k >= 1) continue;
    switch (e.kind) {
      case "nt8_cannon": fxCannon(g, e, k, now); break;
      case "nt8_keg": fxKeg(g, e, k, now); break;
      case "nt8_chain": fxChain(g, e, k, now); break;
      case "nt8_crate": fxCrate(g, e, k); break;
      case "nt8_door_break": fxDoorBreak(g, e, k); break;
      case "nt8_door": fxDoor(g, e, k); break;
      case "nt8_flood": fxBubbleBox(g, e.box, k); break;
      case "nt8_eel": fxEel(g, e, k, now); break;
      case "nt8_creak": fxCreak(g, e, k, now); break;
      case "nt8_collapse": fxCollapse(g, e, k); break;
      case "nt8_sharks": if (Number.isFinite(e.x)) sharks(g, e, now / 1000, 0); break;
      case "nt8_shark_bite": fxSharkBite(g, e, k, now); break;
      case "nt8_silt_warn": fxSiltWarn(g, info, e, k); break;
      case "nt8_silt": fxSilt(g, info, e, k, now); break;
      case "nt8_chest": fxChest(g, e, k); break;
      case "nt_dodge": fxDodge(g, e, k); break;
      default: break;
    }
  }
}
function burst(g, x, y, z, k, r, rgb = "255,170,80") {
  const [sx, sy, s] = P(x, y, z);
  glow(g, sx, sy, s * r * (0.5 + k * 1.5), rgb, 0.9 * (1 - k));
  g.strokeStyle = `rgba(230,245,255,${0.7 * (1 - k)})`; g.lineWidth = 2; g.beginPath(); g.ellipse(sx, sy, s * r * (0.3 + k * 1.6), s * r * (0.12 + k * 0.6), 0, 0, TAU); g.stroke();
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + hash(i, x) * 0.4, d = s * r * easeOut(k) * (0.5 + hash(i, y)), up = Math.sin(k * Math.PI) * s * 0.4; g.strokeStyle = `rgba(220,245,255,${0.7 * (1 - k)})`; g.lineWidth = 1; g.beginPath(); g.arc(sx + Math.cos(a) * d, sy + Math.sin(a) * d * 0.45 - up - k * s * 0.6, s * 0.03 * (1 + hash(i, 2)), 0, TAU); g.stroke(); }
}
function fxCannon(g, e, k, now) {
  const a = e.from, b = e.to; if (!a || !b) return;
  const d = e.dir || { x: 1, y: 0 }, mx = a.x + 0.5 + d.x * 0.6, my = a.y + 0.5 + d.y * 0.6;
  // ไฟปากกระบอก + วงควันแรงดัน
  if (k < 0.35) { const q = k / 0.35, [sx, sy, s] = P(mx, my, 0.55); glow(g, sx, sy, s * (0.6 + q), "255,200,120", 1 - q); g.fillStyle = `rgba(150,160,160,${0.5 * (1 - q)})`; g.beginPath(); g.arc(sx, sy, s * (0.2 + q * 0.6), 0, TAU); g.fill(); }
  // ลูกปืนลากฟอง
  const fly = clamp((k - 0.05) / 0.35, 0, 1);
  if (fly > 0 && fly < 1) {
    const x = lerp(mx, b.x + 0.5, fly), y = lerp(my, b.y + 0.5, fly), [sx, sy, s] = P(x, y, 0.55);
    for (let i = 1; i < 10; i++) { const u = Math.max(0, fly - i * 0.025), p = P(lerp(mx, b.x + 0.5, u), lerp(my, b.y + 0.5, u), 0.55 + i * 0.02); g.strokeStyle = `rgba(210,245,255,${0.5 * (1 - i / 10)})`; g.lineWidth = 1; g.beginPath(); g.arc(p[0], p[1], p[2] * 0.03, 0, TAU); g.stroke(); }
    g.fillStyle = "#121416"; g.beginPath(); g.arc(sx, sy, s * 0.09, 0, TAU); g.fill(); glow(g, sx, sy, s * 0.25, "255,160,90", 0.4);
  }
  if (k > 0.4) burst(g, b.x + 0.5, b.y + 0.5, 0.5, (k - 0.4) / 0.6, 0.6, "200,220,230");
  void now;
}
function fxKeg(g, e, k, now) {
  const ms = WRECK_FX.nt8_keg;
  for (const c of e.chain || []) {
    const q = (k * ms - (c.i || 0) * 180) / (ms - 4 * 180); if (q < 0 || q > 1) continue;
    const [sx, sy, s] = P(c.x + 0.5, c.y + 0.5, 0.4);
    // ลูกไฟใต้น้ำ (วาบเหลือง → ฟองแก๊สก้อนใหญ่) + วงช็อกเวฟ 3×3 + เศษไม้ปลิว
    glow(g, sx, sy, s * (0.8 + q * 1.8), "255,190,90", 1 - q);
    if (q < 0.25) { g.fillStyle = `rgba(255,240,200,${1 - q * 4})`; g.beginPath(); g.arc(sx, sy, s * (0.2 + q * 1.2), 0, TAU); g.fill(); }
    g.fillStyle = `rgba(200,230,240,${0.35 * (1 - q)})`; g.beginPath(); g.arc(sx, sy - s * q * 0.9, s * (0.3 + q * 0.7), 0, TAU); g.fill();
    g.strokeStyle = `rgba(255,220,170,${0.8 * (1 - q)})`; g.lineWidth = 2; gEllipse(g, c.x + 0.5, c.y + 0.5, 0.3 + easeOut(q) * 1.3, 0.03, 36); g.stroke(); // ช็อกเวฟถึงวง 3×3
    const R = rng(c.x * 9 + c.y);
    for (let i = 0; i < 10; i++) { const a = R() * TAU, d = easeOut(q) * (0.6 + R() * 1.1), up = Math.sin(Math.min(1, q * 1.3) * Math.PI) * (0.6 + R()), p = P(c.x + 0.5 + Math.cos(a) * d, c.y + 0.5 + Math.sin(a) * d, 0.3 + up), ps = p[2]; g.fillStyle = R() < 0.5 ? "#5a4028" : "#2a2420"; g.save(); g.translate(p[0], p[1]); g.rotate(now / 120 + i); g.fillRect(-ps * 0.06, -ps * 0.015, ps * 0.12, ps * 0.03); g.restore(); }
  }
}
function fxChain(g, e, k, now) {
  const y = e.row + 0.5, x0 = e.x0 + 0.1, x1 = e.x1 + 0.9, ax = (e.anchor ? e.anchor.x : 16) + 0.5;
  const snap = Math.min(1, k / 0.25), settle = k < 0.25 ? 1 : Math.max(0, 1 - (k - 0.25) / 0.6);
  const n = 40;
  // โซ่: ลากจากเสาสมอออกไปสองฝั่ง ฟาดเป็นคลื่นแล้วตึง
  for (const side of [-1, 1]) {
    const end = side < 0 ? x0 : x1; if ((side < 0 && end >= ax) || (side > 0 && end <= ax)) continue;
    const reach = lerp(ax, end, easeOut(snap));
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = lerp(ax, reach, u), wave = Math.sin(u * 12 - now / 60) * 0.35 * settle * Math.sin(u * Math.PI), p = P(x, y + wave * 0.3, 0.35 + Math.abs(wave) * 0.6), s = p[2];
      g.strokeStyle = i % 2 ? "#3a3d40" : "#55595d"; g.lineWidth = Math.max(1.5, s * 0.035);
      g.beginPath(); g.ellipse(p[0], p[1], s * 0.05, s * 0.03, i % 2 ? 0 : Math.PI / 2, 0, TAU); g.stroke();
      if (prev && i % 6 === 0 && k < 0.5) { g.fillStyle = `rgba(255,220,150,${0.8 * (1 - k * 2)})`; g.beginPath(); g.arc(p[0], p[1] - s * 0.05, s * 0.025, 0, TAU); g.fill(); }
      prev = p;
    }
  }
  // ทรายฟุ้งตามแนวที่โซ่ฟาด
  if (k > 0.15) for (let i = 0; i < 12; i++) { const u = hash(i, e.row), x = lerp(x0, x1, u), q = (k - 0.15) / 0.85, [sx, sy, s] = P(x, y + (hash(i, 2) - 0.5) * 0.6, 0.1 + q * 0.4); g.fillStyle = `rgba(130,140,135,${0.3 * (1 - q)})`; g.beginPath(); g.arc(sx, sy, s * (0.15 + q * 0.3), 0, TAU); g.fill(); }
  for (const m of e.moves || []) if (m.from && m.to) { const [sx, sy, s] = P(m.from.x + 0.5, m.from.y + 0.5, 0.4), b = P(m.to.x + 0.5, m.to.y + 0.5, 0.4); g.strokeStyle = `rgba(220,240,250,${0.6 * (1 - k)})`; g.lineWidth = 1.5; for (let j = -1; j <= 1; j++) { g.beginPath(); g.moveTo(sx, sy + j * s * 0.1); g.lineTo(b[0], b[1] + j * s * 0.1); g.stroke(); } }
}
function fxCrate(g, e, k) {
  if (k < 0.42 || !e.area || !e.area.length) return;
  const q = (k - 0.42) / 0.58, cx = e.area[0].x + 1, cy = e.area[0].y + 1, [sx, sy, s] = P(cx, cy, 0.2);
  glow(g, sx, sy, s * (1 + q), "200,210,200", 0.35 * (1 - q));
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, d = s * easeOut(q) * (0.8 + hash(i, 1) * 0.8); g.fillStyle = `rgba(140,150,140,${0.4 * (1 - q)})`; g.beginPath(); g.arc(sx + Math.cos(a) * d, sy + Math.sin(a) * d * 0.4 - q * s * 0.3, s * (0.12 + q * 0.2), 0, TAU); g.fill(); }
  for (let i = 0; i < 8; i++) { const a = hash(i, 7) * TAU, d = easeOut(q) * (0.6 + hash(i, 3)), up = Math.sin(q * Math.PI) * (0.4 + hash(i, 5) * 0.6), p = P(cx + Math.cos(a) * d, cy + Math.sin(a) * d, up), ps = p[2]; g.fillStyle = "#6b5236"; g.save(); g.translate(p[0], p[1]); g.rotate(q * 8 + i); g.fillRect(-ps * 0.1, -ps * 0.02, ps * 0.2, ps * 0.04); g.restore(); }
}
function fxDoor(g, e, k) {
  if (k < 0.4) return;
  for (const d of e.doors || []) burst(g, d.x + 0.5, d.y + 0.5, 0.6, (k - 0.4) / 0.6, 0.35, "160,220,255");
  fxBubbleBox(g, e.box, k);
}
function fxDoorBreak(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.6);
  glow(g, sx, sy, s * (0.6 + k), "255,220,160", 0.6 * (1 - k));
  burst(g, e.x + 0.5, e.y + 0.5, 0.6, k, 0.6, "170,230,255");
  // แผ่นประตูปลิว
  const p = P(e.x + 0.5 + easeOut(k) * 0.8, e.y + 0.5 + easeOut(k) * 0.4, 0.6 + Math.sin(k * Math.PI) * 0.8), ps = p[2];
  g.save(); g.translate(p[0], p[1]); g.rotate(k * 6); g.fillStyle = `rgba(90,60,46,${1 - k})`; g.fillRect(-ps * 0.25, -ps * 0.35, ps * 0.5, ps * 0.7); g.restore();
}
function fxBubbleBox(g, box, k) {
  if (!box) return;
  const [x0, y0, x1, y1] = box;
  for (let i = 0; i < 24; i++) { const q = (k + hash(i, 9) * 0.5) % 1, p = P(x0 + hash(i, 1) * (x1 - x0 + 1), y0 + hash(i, 2) * (y1 - y0 + 1), q * 1.6), s = p[2]; g.strokeStyle = `rgba(210,250,255,${0.7 * (1 - k)})`; g.lineWidth = 1; g.beginPath(); g.arc(p[0], p[1], s * (0.02 + hash(i, 3) * 0.03), 0, TAU); g.stroke(); }
}
function fxEel(g, e, k, now) {
  const a = e.from, l = e.lair, b = e.to; if (!l || !b) return;
  // เหยื่อ (ชิ้นปลา) ลอยโค้งจากผู้ปาไปที่เป้า
  if (a && k < 0.3) { const u = easeOut(k / 0.3), p = P(lerp(a.x, b.x, u) + 0.5, lerp(a.y, b.y, u) + 0.5, 0.6 + Math.sin(u * Math.PI) * 0.9), s = p[2]; g.fillStyle = "#c06a5a"; g.beginPath(); g.ellipse(p[0], p[1], s * 0.07, s * 0.04, now / 100, 0, TAU); g.fill(); }
  if (k < 0.2) return;
  // ปลาไหลพุ่งออกจากรู ตัวยาวตามเส้นทาง แล้วหดกลับ
  const q = (k - 0.2) / 0.8, out = q < 0.35 ? easeOut(q / 0.35) : q < 0.6 ? 1 : 1 - easeIn((q - 0.6) / 0.4);
  const hx = lerp(l.x + 0.5, b.x + 0.5, out), hy = lerp(l.y + 0.5, b.y + 0.5, out);
  const seg = 18, pts = [];
  for (let i = 0; i <= seg; i++) { const u = i / seg, x = lerp(l.x + 0.5, hx, u), y = lerp(l.y + 0.5, hy, u), wv = Math.sin(u * 9 - now / 70) * 0.12 * (1 - u * 0.5); pts.push(P(x - (hy - (l.y + 0.5)) * wv * 0.3, y + (hx - (l.x + 0.5)) * wv * 0.3, 0.45 + Math.sin(u * Math.PI) * 0.15)); }
  const s = pts[seg][2];
  g.lineCap = "round"; g.strokeStyle = "#2f3b22"; g.lineWidth = s * 0.2; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  g.strokeStyle = "#5c6e3a"; g.lineWidth = s * 0.12; g.stroke();
  g.strokeStyle = "rgba(200,190,90,.35)"; g.lineWidth = s * 0.03; g.stroke(); g.lineCap = "butt";
  const h = pts[seg], open = q > 0.25 && q < 0.5 ? Math.sin(((q - 0.25) / 0.25) * Math.PI) : 0.15;
  g.fillStyle = "#4a5a2e"; g.beginPath(); g.ellipse(h[0], h[1], s * 0.14, s * 0.1, 0, 0, TAU); g.fill();
  g.fillStyle = "#200a08"; g.beginPath(); g.ellipse(h[0] + s * 0.06, h[1] + s * 0.02, s * 0.08, s * 0.08 * open + 1, 0, 0, TAU); g.fill();
  g.fillStyle = "#e8e2b0"; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(h[0] + s * (0.0 + i * 0.035), h[1] - s * 0.05 * open); g.lineTo(h[0] + s * (0.015 + i * 0.035), h[1] - s * 0.01 * open + s * 0.02); g.lineTo(h[0] + s * (0.03 + i * 0.035), h[1] - s * 0.05 * open); g.fill(); }
  g.fillStyle = "#f2e890"; g.beginPath(); g.arc(h[0] - s * 0.03, h[1] - s * 0.05, s * 0.022, 0, TAU); g.fill();
  if (e.hit && q > 0.3 && q < 0.75) { const r = (q - 0.3) / 0.45; g.fillStyle = `rgba(170,20,30,${0.6 * (1 - r)})`; for (let i = 0; i < 9; i++) { const an = (i / 9) * TAU; const p = P(b.x + 0.5 + Math.cos(an) * r * 0.4, b.y + 0.5 + Math.sin(an) * r * 0.3, 0.6 + r * 0.3); g.beginPath(); g.arc(p[0], p[1], p[2] * (0.04 + r * 0.05), 0, TAU); g.fill(); } }
}
function fxCreak(g, e, k, now) {
  for (const t of e.tiles || []) for (let i = 0; i < 5; i++) { const q = (k * 1.6 + hash(i, t.x + t.y)) % 1, p = P(t.x + 0.2 + hash(i, t.x) * 0.6, t.y + 0.2 + hash(i, t.y) * 0.6, 1.8 - q * 1.8), s = p[2]; g.fillStyle = `rgba(150,110,80,${0.7 * (1 - k)})`; g.fillRect(p[0], p[1], Math.max(1.5, s * 0.03), Math.max(1.5, s * 0.03)); }
  void now;
}
function fxCollapse(g, e, k) {
  for (const t of e.tiles || []) {
    const q = clamp(k / 0.35, 0, 1), z = (1 - easeIn(q)) * 2.4, [sx, sy, s] = P(t.x + 0.5, t.y + 0.5, z);
    if (q < 1) { g.fillStyle = "#6e4030"; g.save(); g.translate(sx, sy); g.rotate(q * 1.2 + t.x); g.fillRect(-s * 0.4, -s * 0.12, s * 0.8, s * 0.24); g.restore(); }
    else { const r = (k - 0.35) / 0.65, [bx, by, bs] = P(t.x + 0.5, t.y + 0.5, 0.2); g.fillStyle = `rgba(130,130,120,${0.5 * (1 - r)})`; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.beginPath(); g.arc(bx + Math.cos(a) * bs * r * 0.9, by + Math.sin(a) * bs * r * 0.35 - r * bs * 0.4, bs * (0.15 + r * 0.25), 0, TAU); g.fill(); } }
  }
}
function fxSharkBite(g, e, k, now) {
  const tight = k < 0.4 ? easeIn(k / 0.4) : 1;
  if (k < 0.6) sharks(g, e, now / 1000 * (1 + tight * 3), tight);
  if (k > 0.3) for (const h of e.hits || []) {
    const q = (k - 0.3) / 0.7;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + hash(i, 1), p = P(h.x + 0.5 + Math.cos(a) * q * 0.6, h.y + 0.5 + Math.sin(a) * q * 0.4, 0.6 + q * 0.4), s = p[2]; g.fillStyle = `rgba(150,15,25,${0.5 * (1 - q)})`; g.beginPath(); g.arc(p[0], p[1], s * (0.06 + q * 0.12), 0, TAU); g.fill(); }
  }
}
function fxSiltWarn(g, info, e, k) {
  void info; void e; void k;
}
function fxSilt(g, info, e, k, now) {
  const [x0, y0, x1, y1] = bandRect(info, e.edge, e.step || 0), d = e.dir || { x: 1, y: 0 };
  // กำแพงตะกอนกลิ้งจากขอบด้านนอกเข้าไปจนพ้นแถบ
  const span = d.x ? x1 - x0 : y1 - y0, pos = easeOut(Math.min(1, k / 0.75)) * (span + 1);
  const front = d.x > 0 ? x0 + pos : d.x < 0 ? x1 - pos : y1 - pos, fade = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
  const R = rng(5);
  for (let i = 0; i < 70; i++) {
    const u = R(), along = d.x ? y0 + u * (y1 - y0) : x0 + u * (x1 - x0), back = R() * 1.6, f = front - (d.x || d.y) * back;
    const x = d.x ? f : along, y = d.x ? along : f, z = R() * (1.8 - back * 0.6) + Math.sin(now / 300 + i) * 0.1, [sx, sy, s] = P(x, y, Math.max(0, z));
    g.fillStyle = `rgba(${110 + R() * 30 | 0},${100 + R() * 25 | 0},${80 + R() * 20 | 0},${(0.3 + R() * 0.25) * fade})`; g.beginPath(); g.arc(sx, sy, s * (0.25 + R() * 0.35), 0, TAU); g.fill();
  }
}
function fxChest(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.5);
  if (e.mimic) {
    const open = Math.sin(Math.min(1, k / 0.5) * Math.PI);
    g.fillStyle = "#2a0606"; g.beginPath(); g.ellipse(sx, sy, s * 0.3, s * 0.2 * open + 1, 0, 0, TAU); g.fill();
    g.fillStyle = "#e8e2c0"; for (let i = 0; i < 6; i++) { const x = sx - s * 0.25 + i * s * 0.1; g.beginPath(); g.moveTo(x, sy - s * 0.18 * open); g.lineTo(x + s * 0.05, sy); g.lineTo(x + s * 0.1, sy - s * 0.18 * open); g.fill(); g.beginPath(); g.moveTo(x, sy + s * 0.18 * open); g.lineTo(x + s * 0.05, sy); g.lineTo(x + s * 0.1, sy + s * 0.18 * open); g.fill(); }
    g.fillStyle = `rgba(255,40,40,${open})`; g.beginPath(); g.arc(sx - s * 0.1, sy - s * 0.3, s * 0.03, 0, TAU); g.arc(sx + s * 0.1, sy - s * 0.3, s * 0.03, 0, TAU); g.fill();
    return;
  }
  glow(g, sx, sy - s * 0.2, s * (0.4 + k * 0.6), "255,220,120", 0.8 * (1 - k));
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.3, d = easeOut(k) * s * 0.9, p = [sx + Math.cos(a) * d, sy - s * 0.2 + Math.sin(a) * d + easeIn(k) * s * 0.6]; g.fillStyle = `rgba(255,215,90,${1 - k})`; g.beginPath(); g.ellipse(p[0], p[1], s * 0.05, s * 0.03, i, 0, TAU); g.fill(); }
}
function fxDodge(g, e, k) {
  if (!Number.isFinite(e.x)) return;
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.6);
  g.strokeStyle = `rgba(220,250,255,${0.8 * (1 - k)})`; g.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { const x = sx - s * 0.3 - k * s * 0.4 - i * s * 0.12; g.beginPath(); g.moveTo(x, sy - s * 0.2 + i * s * 0.15); g.lineTo(x + s * 0.25, sy - s * 0.2 + i * s * 0.15); g.stroke(); }
}
