// ============================================================
//  ภาพของสนาม Eos — ของประจำเมือง (ศาล/ร้านอาหาร/ฟาร์ม/ปั๊ม) · กำแพงไม้ · มอนพิเศษ (โชโกโบะทอง/รัง/ผู้คร่ำครวญ/ยักษ์หิน) · พลเรือน
//  แยกออกจาก ./stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · stage6.js ยังส่งออกชื่อเดิมครบ
//  ⚠️ ห้ามเรียกของจาก ./index ตอนโหลดไฟล์ (index import stage6 — วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { P } from "../boardGeo";
import { fxT } from "./index";
import { drawVitalBar } from "../boardDraw";
import { TAU, hash, ease, fx, img, CHOCO_IMG, GIANT_IMG, LAMENT_IMG, glowAt, box, LAST_FD, sqPts, regPoly } from "./eosBase";
import { frustum } from "./eosPillars";
import { lastFx } from "./eosTownArt";
import { sprite, hpPips } from "./eosUnits";
import { emoji } from "./eosCamp";

// =================================================================== PVE รอบสาม: ภาพของระบบใหม่ (server/fodlan/eosExtra.js)
// ปั๊มน้ำมัน Hammerhead (ปรับภาพ 2026-11-10 — ผู้ใช้: "ปั๊มยังโล่ง"): เกาะคอนกรีต · ตู้จ่ายแดงจอขาว · สายยาง · หลังคาปั๊มขาวขอบแดง บนเสา
//  กลางคืน = ไฟใต้หลังคาส่องลงพื้น + แถบนีออนส้มขอบหลังคา
// ---------- ของประจำเมือง (2026-11-12) ----------
// ศาลเทพธิดา Altissia: ฐานหินขาว 2 ชั้น + เสา 4 ต้น + หลังคาโดมฟ้า + แสงเรืองกลาง (ใช้ได้ = เรืองแรง)
export function drawShrine(g, x, y, night, now) {
  const ready = !LAST_FD || LAST_FD.shrineReady !== false, cx = x + 0.5, cy = y + 0.5, s = P(cx, cy)[2], k = 0.6 + 0.4 * Math.sin(now / 520 + x);
  const st = night ? "#a3acba" : "#f1f3f6", st2 = night ? "#7d8594" : "#d3d8df";
  frustum(g, sqPts(cx, cy, 0.48), 0, sqPts(cx, cy, 0.48), 0.07, st2, st2);
  frustum(g, sqPts(cx, cy, 0.42), 0.07, sqPts(cx, cy, 0.42), 0.14, st, st);
  frustum(g, sqPts(cx, cy, 0.36), 0.14, sqPts(cx, cy, 0.36), 0.2, st2, st);
  // รูปปั้นเทพธิดา: ชุดยาวทรงกรวย + ศีรษะ + แขนชูลูกแก้ว
  frustum(g, regPoly(cx, cy, 0.11, 8), 0.2, regPoly(cx, cy, 0.04, 8), 0.72, night ? "#c9ced8" : "#fbfbf8", null);
  const head = P(cx, cy, 0.8); g.fillStyle = night ? "#d3d8e0" : "#ffffff"; g.beginPath(); g.arc(head[0], head[1], s * 0.05, 0, TAU); g.fill();
  const orb = P(cx, cy, 0.98);
  glowAt(g, orb[0], orb[1], s * (ready ? 0.75 : 0.3), "140,205,255", (ready ? 0.8 : 0.25) * k);
  g.fillStyle = ready ? "#e6f7ff" : "#8f9dae"; g.beginPath(); g.arc(orb[0], orb[1], s * 0.055, 0, TAU); g.fill();
  // เสา 4 ต้น + หลังคาโดม
  for (const [dx, dy] of [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]]) frustum(g, regPoly(cx + dx, cy + dy, 0.045, 6), 0.2, regPoly(cx + dx, cy + dy, 0.04, 6), 1.12, night ? "#c4cad4" : "#f7f7f2", null);
  frustum(g, sqPts(cx, cy, 0.4), 1.12, sqPts(cx, cy, 0.4), 1.2, st2, st);
  for (let i = 0; i < 4; i++) { const r0 = 0.38 * Math.cos(i / 4 * Math.PI / 2), r1 = 0.38 * Math.cos((i + 1) / 4 * Math.PI / 2), z0 = 1.2 + 0.32 * Math.sin(i / 4 * Math.PI / 2), z1 = 1.2 + 0.32 * Math.sin((i + 1) / 4 * Math.PI / 2); frustum(g, regPoly(cx, cy, Math.max(0.02, r0), 12), z0, regPoly(cx, cy, Math.max(0.02, r1), 12), z1, night ? "#4b7db0" : "#6aa7de", i === 3 ? (night ? "#4b7db0" : "#6aa7de") : null); }
  const tip = P(cx, cy, 1.62); g.fillStyle = "#e8c25a"; g.beginPath(); g.arc(tip[0], tip[1], s * 0.045, 0, TAU); g.fill();
  if (ready) { // พร้อมใช้: ลำแสงฟ้าบางๆ พุ่งจากยอด
    const b0 = P(cx, cy, 1.62), b1 = P(cx, cy, 3.4), gr = g.createLinearGradient(b0[0], b0[1], b1[0], b1[1]);
    gr.addColorStop(0, `rgba(170,225,255,${0.45 * k})`); gr.addColorStop(1, "rgba(170,225,255,0)");
    g.fillStyle = gr; g.fillRect(b0[0] - s * 0.05, b1[1], s * 0.1, b0[1] - b1[1]);
  }
}
// ร้านอาหาร: ตึกชั้นเดียวผนังครีม หลังคาแดง กันสาดลายทาง ป้ายไฟ
export function drawDiner(g, x, y, night, now) {
  const s = P(x + 0.5, y + 0.5)[2];
  box(g, x + 0.08, y + 0.08, x + 0.92, y + 0.92, 0.72, night ? "#8a8070" : "#efe2c6", night ? "#5f574a" : "#c9b994", night ? "#6f665a" : "#dccba6");
  box(g, x + 0.02, y + 0.02, x + 0.98, y + 0.98, 0.86, night ? "#7a2a22" : "#c9473a", "#8f2a20", "#a5352a", 0.72);
  for (let i = 0; i < 4; i++) { const a = P(x + 0.12 + i * 0.2, y + 0.99, 0.62), b = P(x + 0.22 + i * 0.2, y + 0.99, 0.62); g.fillStyle = i % 2 ? "#f4efe6" : "#d24a3c"; g.fillRect(a[0], a[1], Math.max(2, b[0] - a[0]), s * 0.08); }
  const sign = P(x + 0.5, y + 0.5, 1.12), on = night || Math.sin(now / 700 + x) > -2;
  g.fillStyle = "#2a1a14"; g.fillRect(sign[0] - s * 0.2, sign[1] - s * 0.07, s * 0.4, s * 0.14);
  g.fillStyle = night ? "#ffd27a" : "#ffe9b0"; g.fillRect(sign[0] - s * 0.16, sign[1] - s * 0.035, s * 0.32, s * 0.07);
  if (night && on) glowAt(g, sign[0], sign[1], s * 0.8, "255,200,110", 0.5);
}
// บ้านฟาร์มโชโกโบะ Duscae: บ้านไม้ หลังคาเหลือง + รั้วไม้เตี้ย
export function drawRanch(g, x, y, night, now) {
  const s = P(x + 0.5, y + 0.5)[2];
  box(g, x + 0.12, y + 0.12, x + 0.88, y + 0.88, 0.7, night ? "#6a4f36" : "#a8764a", night ? "#4a3624" : "#7a5434", night ? "#58402c" : "#8f633e");
  box(g, x + 0.06, y + 0.06, x + 0.94, y + 0.94, 0.86, night ? "#8f7a2c" : "#f2c63a", "#b8922a", "#d0a630", 0.7);
  const ridge = P(x + 0.5, y + 0.5, 1.1), ridge0 = P(x + 0.06, y + 0.5, 0.86), ridge1 = P(x + 0.94, y + 0.5, 0.86);
  g.fillStyle = night ? "#a68e34" : "#ffd84a"; g.beginPath(); g.moveTo(ridge0[0], ridge0[1]); g.lineTo(ridge[0], ridge[1]); g.lineTo(ridge1[0], ridge1[1]); g.closePath(); g.fill();
  const w = P(x + 0.5, y + 0.95, 0.4); g.fillStyle = night ? "#ffcf7a" : "#3a2a1c"; g.fillRect(w[0] - s * 0.08, w[1] - s * 0.1, s * 0.16, s * 0.16);
  if (night) glowAt(g, w[0], w[1], s * 0.5, "255,200,120", 0.4 + 0.1 * Math.sin(now / 400));
}
export function drawPump(g, x, y, C, night, now, s) {
  box(g, x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0.08, night ? "#5a5a60" : "#c9c4b8", night ? "#3a3a40" : "#9a958a", night ? "#45454b" : "#aca79c");
  box(g, x + 0.32, y + 0.36, x + 0.68, y + 0.64, 0.66, "#c63b2b", "#8f2418", "#a52d1f", 0.08);
  const d = P(x + 0.5, y + 0.65, 0.48); g.fillStyle = night ? "#bfe4ff" : "#f4f0e6"; g.fillRect(d[0] - s * 0.07, d[1] - s * 0.05, s * 0.14, s * 0.08);
  if (night) glowAt(g, d[0], d[1], s * 0.2, "190,228,255", 0.5);
  const h0 = P(x + 0.66, y + 0.5, 0.45), h1 = P(x + 0.82, y + 0.62, 0.12), hc = P(x + 0.86, y + 0.48, 0.3);
  g.strokeStyle = "#1e1e22"; g.lineWidth = Math.max(1.5, s * 0.025); g.beginPath(); g.moveTo(h0[0], h0[1]); g.quadraticCurveTo(hc[0], hc[1], h1[0], h1[1]); g.stroke();
  // หลังคาปั๊ม: เสาที่มุม + แผ่นหลังคา (วาดท้ายสุด ทับตู้จ่าย)
  box(g, x + 0.08, y + 0.08, x + 0.18, y + 0.18, 1.32, "#e8e4da", "#b8b3a8", "#cfcabf", 0.08);
  const faces = box(g, x - 0.04, y - 0.04, x + 1.04, y + 1.04, 1.46, night ? "#d8d4ca" : "#f2efe8", "#c63b2b", "#a52d1f", 1.32);
  if (night) {
    const u = P(x + 0.5, y + 0.5, 1.3); glowAt(g, u[0], u[1] + s * 0.4, s * 0.9, "255,236,200", 0.5);
    const fl = 0.8 + 0.2 * Math.sin(now / 300 + x);
    for (const f of faces) { const a = P(f.a[0], f.a[1], 1.38), b = P(f.b[0], f.b[1], 1.38); g.strokeStyle = `rgba(255,150,60,${fl})`; g.lineWidth = Math.max(2, s * 0.03); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  }
  void C;
}
// กำแพงไม้ชั่วคราว (ไอเทมร้าน — PVE รอบสี่): แผงไม้ไขว้ปลายแหลม 3 แผ่น + กระสอบทรายที่ฐาน
export function drawBarricade(g, x, y, C, now) {
  const w = LAST_FD && Array.isArray(LAST_FD.walls) ? LAST_FD.walls.find((o) => o.x === x && o.y === y) : null;
  const e = lastFx("wall_up"), rise = e && e.x === x && e.y === y ? ease(Math.min(1, fxT(e, now, fx.wall_up))) : 1;
  const [cx, cy, s] = P(x + 0.5, y + 0.55);
  g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(cx, cy, s * 0.46, s * 0.15, 0, 0, TAU); g.fill();
  for (let i = 0; i < 4; i++) { const b = P(x + 0.2 + i * 0.2, y + 0.7, 0.05); g.fillStyle = i % 2 ? "#b49a6a" : "#c9b07c"; g.beginPath(); g.ellipse(b[0], b[1], s * 0.11, s * 0.06, 0, 0, TAU); g.fill(); }
  const h = 0.62 * rise;
  for (const [a, b] of [[0.12, 0.88], [0.18, 0.82]]) {
    const p0 = P(x + a, y + 0.5, 0.05), p1 = P(x + b, y + 0.5, h * 0.55);
    g.strokeStyle = "#5a3d22"; g.lineWidth = Math.max(3, s * 0.07); g.lineCap = "round"; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
  }
  for (let i = 0; i < 3; i++) { // แผ่นไม้ตั้งปลายแหลม
    const u = 0.22 + i * 0.28, b0 = P(x + u, y + 0.45, 0), t0 = P(x + u + (i - 1) * 0.04, y + 0.45, h);
    g.strokeStyle = i % 2 ? "#7a5530" : "#8a6238"; g.lineWidth = Math.max(4, s * 0.09); g.beginPath(); g.moveTo(b0[0], b0[1]); g.lineTo(t0[0], t0[1]); g.stroke();
    g.fillStyle = "#d9c4a0"; g.beginPath(); g.moveTo(t0[0] - s * 0.04, t0[1] + 2); g.lineTo(t0[0], t0[1] - s * 0.08); g.lineTo(t0[0] + s * 0.04, t0[1] + 2); g.fill();
  }
  g.lineCap = "butt";
  if (w && w.hp != null && w.hp < (w.max || 3)) hpPips(g, x + 0.5, y + 0.5, 0.95, w.hp, w.max || 3, 0, 0, "ally"); // ถาวร: หลอดเลือดเมื่อบุบ
  void C;
}
// โชโกโบะทอง: ภาพโชโกโบะ + ออร่าทอง + ประกายวิ่ง · ฝุ่นตอนวิ่ง
export function drawGoldChoco(g, m, cx, cy, now, lowQ, moving, flip) {
  const [sx, sy, s] = P(cx, cy);
  glowAt(g, sx, sy - s * 0.5, s * 1.2, "255,210,80", 0.55 + 0.2 * Math.sin(now / 200));
  const bob = moving && !lowQ ? Math.abs(Math.sin(now / 90)) * 0.06 : Math.abs(Math.sin(now / 400)) * 0.03;
  g.save(); g.filter = "sepia(1) saturate(3.2) hue-rotate(-12deg) brightness(1.15)"; sprite(g, CHOCO_IMG, cx, cy, bob, 1.05, flip); g.restore();
  if (!lowQ) for (let i = 0; i < 6; i++) { const a = now / 300 + i * 1.05, r = s * (0.35 + 0.1 * Math.sin(now / 250 + i)); const px = sx + Math.cos(a) * r, py = sy - s * 0.55 + Math.sin(a) * r * 0.5; g.fillStyle = `rgba(255,240,170,${0.6 + 0.4 * Math.sin(now / 120 + i)})`; g.fillRect(px - 1.5, py - 1.5, 3, 3); }
  hpPips(g, cx, cy, 1.25, m.hp, m.maxHp, m.armor, m.maxArmor);
}
// รังปีศาจ (ออกแบบใหม่ 2026-11-10 — ผู้ใช้: "รังดูแปลกๆ เป็นก้อนๆ"): หลุมดินแตกมีรอยร้าวเรืองชมพู · รากหนวดดำแผ่บนพื้น
//  ตัวรัง = รังไข่ทรงหยดน้ำคว่ำสูง ~1 ช่อง ผิวเป็นซี่โครงโค้ง ไล่สีดำม่วง → ม่วงแดง · รอยแยกกลางเรืองชมพูเต้นตามจังหวะหัวใจ
//  เขาโค้ง 3 อันบนยอด · สปอร์ลอยขึ้น · โดนตี = สั่น + วาบขาว
export function drawNest(g, m, cx, cy, now, lowQ, hit) {
  const [sx, sy, s] = P(cx, cy);
  const beat = Math.pow(0.5 + 0.5 * Math.sin(now / 380 + m.x), 3); // จังหวะหัวใจ (เต้นแรงแล้วนิ่ง)
  const shake = hit < 1 ? Math.sin(hit * 50) * s * 0.03 * (1 - hit) : 0;
  // หลุมดิน + รอยร้าวเรือง
  g.save(); g.translate(sx, sy); g.scale(1, 0.42);
  const cr = g.createRadialGradient(0, 0, s * 0.05, 0, 0, s * 0.72);
  cr.addColorStop(0, "rgba(20,4,18,.9)"); cr.addColorStop(0.65, "rgba(40,10,34,.55)"); cr.addColorStop(1, "rgba(40,10,34,0)");
  g.fillStyle = cr; g.beginPath(); g.arc(0, 0, s * 0.72, 0, TAU); g.fill();
  g.lineCap = "round";
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * TAU + hash(i, m.x * 3 + m.y) * 0.5, l = s * (0.42 + hash(i, 11) * 0.28);
    const mx = Math.cos(a + 0.25) * l * 0.55, my = Math.sin(a + 0.25) * l * 0.55;
    g.strokeStyle = `rgba(255,70,190,${0.35 + 0.45 * beat})`; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(Math.cos(a) * s * 0.2, Math.sin(a) * s * 0.2); g.lineTo(mx, my); g.lineTo(Math.cos(a) * l, Math.sin(a) * l); g.stroke();
  }
  g.restore();
  // รากหนวด (หลังรังก่อน หน้ารังทีหลัง)
  const roots = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.4 + hash(i, m.y) * 0.4; roots.push(a); }
  const root = (a) => {
    const r0 = 0.16, r1 = 0.5 + hash(a * 10, 2) * 0.12, bend = 0.35;
    const p0 = P(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, 0.05), pc = P(cx + Math.cos(a + bend) * (r1 * 0.6), cy + Math.sin(a + bend) * (r1 * 0.6), 0.1), p1 = P(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, 0);
    g.strokeStyle = "#1a0616"; g.lineWidth = Math.max(2, s * 0.05); g.lineCap = "round";
    g.beginPath(); g.moveTo(p0[0] + shake, p0[1]); g.quadraticCurveTo(pc[0], pc[1], p1[0], p1[1]); g.stroke();
    g.strokeStyle = "rgba(170,50,140,.55)"; g.lineWidth = Math.max(1, s * 0.015); g.stroke();
    g.fillStyle = `rgba(255,90,200,${0.5 + 0.4 * beat})`; g.beginPath(); g.arc(p1[0], p1[1], Math.max(1.5, s * 0.018), 0, TAU); g.fill();
  };
  for (const a of roots) if (Math.sin(a) < 0) root(a);
  // ตัวรัง: หยดน้ำคว่ำ (ฐานกว้าง ยอดแหลม)
  const H = s * 0.95, W = s * 0.34, bx = sx + shake, by = sy - s * 0.04;
  const body = () => {
    g.beginPath(); g.moveTo(bx - W, by);
    g.bezierCurveTo(bx - W * 1.25, by - H * 0.45, bx - W * 0.45, by - H * 0.8, bx, by - H);
    g.bezierCurveTo(bx + W * 0.45, by - H * 0.8, bx + W * 1.25, by - H * 0.45, bx + W, by);
    g.quadraticCurveTo(bx, by + s * 0.08, bx - W, by); g.closePath();
  };
  const bg = g.createLinearGradient(bx - W, by - H, bx + W, by);
  bg.addColorStop(0, "#4a1640"); bg.addColorStop(0.45, "#2a0b26"); bg.addColorStop(1, "#140510");
  body(); g.fillStyle = bg; g.fill();
  // ซี่โครงโค้งตามผิว + ขอบสว่าง
  g.save(); body(); g.clip();
  for (let i = -2; i <= 2; i++) {
    const ox = i * W * 0.42;
    g.strokeStyle = "rgba(10,2,8,.75)"; g.lineWidth = Math.max(2, s * 0.035);
    g.beginPath(); g.moveTo(bx + ox * 1.4, by + 2); g.quadraticCurveTo(bx + ox * 1.15, by - H * 0.55, bx + ox * 0.2, by - H * 0.98); g.stroke();
    g.strokeStyle = "rgba(200,90,180,.35)"; g.lineWidth = Math.max(1, s * 0.012);
    g.beginPath(); g.moveTo(bx + ox * 1.4 - 2, by); g.quadraticCurveTo(bx + ox * 1.15 - 2, by - H * 0.55, bx + ox * 0.2 - 1, by - H * 0.98); g.stroke();
  }
  // รอยแยกกลางเรือง (กว้างขึ้นตอนเต้น)
  const sw = W * (0.1 + 0.12 * beat);
  const sg = g.createLinearGradient(bx, by - H * 0.85, bx, by - H * 0.1);
  sg.addColorStop(0, "rgba(255,120,220,0)"); sg.addColorStop(0.5, `rgba(255,${150 + Math.floor(beat * 80)},235,.95)`); sg.addColorStop(1, "rgba(255,80,200,.2)");
  g.fillStyle = sg; g.beginPath(); g.moveTo(bx, by - H * 0.85); g.quadraticCurveTo(bx + sw, by - H * 0.45, bx, by - H * 0.12); g.quadraticCurveTo(bx - sw, by - H * 0.45, bx, by - H * 0.85); g.fill();
  // ไฮไลต์ผิวมันวาวด้านซ้ายบน
  g.fillStyle = "rgba(255,200,240,.12)"; g.beginPath(); g.ellipse(bx - W * 0.45, by - H * 0.55, W * 0.18, H * 0.25, -0.2, 0, TAU); g.fill();
  g.restore();
  glowAt(g, bx, by - H * 0.45, s * (0.4 + 0.25 * beat), "255,60,190", 0.35 + 0.35 * beat);
  // เขาโค้ง 3 อันบนยอด
  g.fillStyle = "#1a0616";
  for (const d of [-1, 0, 1]) {
    const tx = bx + d * W * 0.35, ty = by - H * (0.86 - Math.abs(d) * 0.1), tip = [tx + d * s * 0.16, ty - s * (0.22 - Math.abs(d) * 0.05)];
    g.beginPath(); g.moveTo(tx - s * 0.035, ty + 2); g.quadraticCurveTo(tx + d * s * 0.02, ty - s * 0.1, tip[0], tip[1]); g.quadraticCurveTo(tx + d * s * 0.06, ty - s * 0.04, tx + s * 0.035, ty + 2); g.closePath(); g.fill();
  }
  for (const a of roots) if (Math.sin(a) >= 0) root(a);
  g.lineCap = "butt";
  if (!lowQ) for (let i = 0; i < 6; i++) { // สปอร์ลอยขึ้น
    const ph = ((now / 2200) + i / 6) % 1, px = bx + Math.sin(i * 2.3 + now / 900) * s * 0.25, py = by - H * (0.5 + ph * 1.1);
    g.fillStyle = `rgba(255,120,220,${0.7 * (1 - ph)})`; g.beginPath(); g.arc(px, py, Math.max(1.2, s * 0.018), 0, TAU); g.fill();
  }
  if (hit < 1) glowAt(g, bx, by - H * 0.5, s * 0.8, "255,255,255", (1 - hit) * 0.75);
  hpPips(g, cx, cy, 1.25, m.hp, m.maxHp, m.armor, m.maxArmor);
}
// ยักษ์หิน: ร่างหินสูง 3 ช่อง ขาสองต้น ลำตัวหินเหลี่ยม ตะไคร่เขียว อักษรรูนฟ้าเรือง ตาเรือง · ก้าวเดินโยกตัว
// ผู้คร่ำครวญ: ภาพผู้ใช้ สูง ~3 ช่อง ลอยเหนือพื้น · ม่านควันม่วงใต้ตัว · หยดน้ำตาเรืองฟ้า · วูบมา = ค่อยๆ ปรากฏ · เฟส 3 ออร่าแดง
export function drawLament(g, m, cx, cy, now, lowQ, blink, hit, phase) {
  const [sx, sy, s] = P(cx, cy);
  const appear = blink < 1 ? Math.min(1, blink * 1.6) : 1, float = lowQ ? 0 : Math.sin(now / 700) * s * 0.06;
  const rgb = phase >= 3 ? "230,40,60" : phase === 2 ? "150,60,230" : "90,120,255";
  g.save(); g.translate(sx, sy); g.scale(1, 0.42);
  const gr = g.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 1.8);
  gr.addColorStop(0, `rgba(${rgb},.55)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s * 1.8, 0, TAU); g.fill();
  if (!lowQ) { g.rotate(-now / 1400); g.setLineDash([s * 0.3, s * 0.2]); g.strokeStyle = `rgba(${rgb},.6)`; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, s * 1.35, 0, TAU); g.stroke(); g.setLineDash([]); }
  g.restore();
  glowAt(g, sx, sy - s * 1.6, s * 2.4, rgb, (0.4 + 0.12 * Math.sin(now / 350)) * appear);
  const im = img(LAMENT_IMG);
  if (im) {
    const h = s * 3.1, w = h * (im.naturalWidth / im.naturalHeight), shake = hit < 1 ? Math.sin(hit * 50) * s * 0.05 * (1 - hit) : 0;
    g.save(); g.globalAlpha *= appear; g.translate(sx + shake, sy - s * 0.25 + float);
    if (blink < 1) g.filter = `blur(${(1 - appear) * 6}px) brightness(${1 + (1 - appear)})`;
    g.drawImage(im, -w * 0.58, -h, w, h); g.filter = "none"; g.restore();
  }
  if (!lowQ) for (let i = 0; i < 5; i++) { // น้ำตาเรืองแสงร่วงจากหน้า
    const t = ((now / 1100) + i / 5) % 1, tx = sx + (hash(i, 7) - 0.5) * s * 0.5, ty = sy - s * 2.7 + t * s * 2.4;
    g.fillStyle = `rgba(170,220,255,${0.55 * (1 - t)})`; g.beginPath(); g.ellipse(tx, ty, 1.2, 2.4, 0, 0, TAU); g.fill();
  }
  if (hit < 1) glowAt(g, sx, sy - s * 1.5, s * 1.6, "255,255,255", (1 - hit) * 0.6);
  const top = P(cx, cy, 3.5), UK = Math.max(0.55, s * 0.013);
  drawVitalBar(g, top[0], top[1], s * 1.6, { hp: m.hp, maxHp: Math.max(1, m.maxHp), armor: m.armor, maxArmor: Math.max(m.armor || 0, m.maxArmor || 0) }, UK);
  emoji(g, "💀", top[0], top[1] - 10 * UK, 13 * UK);
}
export function drawGiant(g, m, cx, cy, now, lowQ, moving, face, hit) {
  const [sx, sy, s] = P(cx, cy);
  const sway = moving && !lowQ ? Math.sin(now / 160) * s * 0.05 : 0, lift = moving && !lowQ ? Math.abs(Math.sin(now / 160)) * s * 0.06 : 0;
  const shake = hit < 1 ? Math.sin(hit * 50) * s * 0.04 * (1 - hit) : 0;
  // ภาพยักษ์ (demon9 — ผู้ใช้ส่งมา 2026-11-10 "ใช้ demon9 แทนตัวยักษ์หิน") · ตัวอยู่ ~62% ของภาพ ดาบยื่นซ้าย → หันขวา = กลับด้าน
  const gim = img(GIANT_IMG);
  if (gim) {
    g.fillStyle = "rgba(0,0,0,.42)"; g.beginPath(); g.ellipse(sx, sy, s * 1.1, s * 0.36, 0, 0, TAU); g.fill();
    const h = s * 2.5, w = h * (gim.naturalWidth / gim.naturalHeight), stomp = moving && !lowQ ? lift * 0.6 : 0;
    g.save(); g.translate(sx + shake, sy - stomp); if (face > 0) g.scale(-1, 1); g.rotate(moving && !lowQ ? Math.sin(now / 160) * 0.025 : 0);
    g.drawImage(gim, -w * 0.62, -h, w, h); g.restore();
    const ey = P(cx, cy, 2.25);
    glowAt(g, ey[0] + shake, ey[1] - stomp, s * 0.35, "255,90,40", 0.25 + 0.15 * Math.sin(now / 500));
    if (hit < 1) glowAt(g, sx, sy - s * 1.2, s * 1.4, "255,255,255", (1 - hit) * 0.6);
    void sway;
    const top = P(cx, cy, 2.9), UK = Math.max(0.5, s * 0.012);
    drawVitalBar(g, top[0], top[1], s * 1.3, { hp: m.hp, maxHp: Math.max(1, m.maxHp), armor: m.armor, maxArmor: Math.max(m.armor || 0, m.maxArmor || 0) }, UK);
    return;
  }
  const X0 = sx + shake;
  g.fillStyle = "rgba(0,0,0,.42)"; g.beginPath(); g.ellipse(sx, sy, s * 1.0, s * 0.34, 0, 0, TAU); g.fill();
  const stone = "#857c6d", dark = "#5a5348", hi = "#a69c8a", moss = "#5f7a3c", rune = "120,230,255";
  const rk = 0.6 + 0.4 * Math.sin(now / 500);
  // ขา
  const leg = (dx, up) => { g.fillStyle = dark; g.fillRect(X0 + dx - s * 0.17, sy - s * 1.05 - up, s * 0.34, s * 1.05 + up * 0.2); g.fillStyle = stone; g.fillRect(X0 + dx - s * 0.17, sy - s * 1.05 - up, s * 0.22, s * 1.0); g.fillStyle = hi; g.fillRect(X0 + dx - s * 0.22, sy - s * 0.12 - up * 0.2, s * 0.44, s * 0.12); };
  leg(-s * 0.3, moving ? lift : 0); leg(s * 0.3, moving ? s * 0.06 - lift : 0);
  // ลำตัว
  const bx = X0 + sway, by = sy - s * 1.0;
  g.fillStyle = dark; g.beginPath(); g.moveTo(bx - s * 0.62, by); g.lineTo(bx - s * 0.75, by - s * 1.25); g.lineTo(bx + s * 0.75, by - s * 1.3); g.lineTo(bx + s * 0.62, by); g.closePath(); g.fill();
  g.fillStyle = stone; g.beginPath(); g.moveTo(bx - s * 0.62, by); g.lineTo(bx - s * 0.75, by - s * 1.25); g.lineTo(bx + s * 0.2, by - s * 1.28); g.lineTo(bx + s * 0.12, by); g.closePath(); g.fill();
  // ไหล่ + แขน
  for (const d of [-1, 1]) {
    const ax = bx + d * s * 0.85, ay = by - s * 1.15;
    g.fillStyle = d * face > 0 ? stone : dark; g.beginPath(); g.ellipse(ax, ay, s * 0.26, s * 0.2, 0, 0, TAU); g.fill();
    g.fillStyle = dark; g.fillRect(ax - s * 0.14, ay, s * 0.28, s * 0.95 + (moving ? Math.sin(now / 160 + d) * s * 0.05 : 0));
    g.fillStyle = hi; g.beginPath(); g.ellipse(ax, ay + s * 1.0, s * 0.2, s * 0.16, 0, 0, TAU); g.fill();
  }
  // ตะไคร่
  g.fillStyle = moss; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(bx + (hash(i, 3) - 0.5) * s * 1.1, by - s * (0.1 + hash(i, 7) * 1.1), s * 0.12, s * 0.06, 0, 0, TAU); g.fill(); }
  // อักษรรูนบนอก
  g.strokeStyle = `rgba(${rune},${0.55 + 0.4 * rk})`; g.lineWidth = Math.max(1.5, s * 0.035);
  g.beginPath(); g.moveTo(bx - s * 0.25, by - s * 0.9); g.lineTo(bx, by - s * 0.55); g.lineTo(bx + s * 0.25, by - s * 0.9); g.moveTo(bx, by - s * 0.55); g.lineTo(bx, by - s * 0.25); g.stroke();
  glowAt(g, bx, by - s * 0.6, s * 0.5, rune, 0.3 * rk);
  // หัว
  const hx = bx + face * s * 0.08, hy = by - s * 1.45;
  g.fillStyle = dark; g.fillRect(hx - s * 0.3, hy - s * 0.42, s * 0.6, s * 0.46);
  g.fillStyle = stone; g.fillRect(hx - s * 0.3, hy - s * 0.42, s * 0.4, s * 0.42);
  for (const d of [-1, 1]) { const ex = hx + d * s * 0.12 + face * s * 0.05; glowAt(g, ex, hy - s * 0.22, s * 0.18, rune, 0.9); g.fillStyle = "#dffaff"; g.fillRect(ex - s * 0.05, hy - s * 0.24, s * 0.1, s * 0.04); }
  if (hit < 1) glowAt(g, bx, by - s * 0.8, s * 1.2, "255,255,255", (1 - hit) * 0.6);
  const top = P(cx, cy, 3.3), UK = Math.max(0.5, s * 0.012);
  drawVitalBar(g, top[0], top[1], s * 1.3, { hp: m.hp, maxHp: Math.max(1, m.maxHp), armor: m.armor, maxArmor: Math.max(m.armor || 0, m.maxArmor || 0) }, UK);
}
// พลเรือน: คนตัวเล็กคลุมผ้า · ยังไม่มีคนพา = โบกมือ + วงทองเต้น · มีคนพา = เส้นประไปหาคนพา
const CIV_CLOAK = ["#c96b4b", "#5b86b8", "#8a6bb0"];
export function drawCivilian(g, c, cx, cy, now, lowQ, lead) {
  const [sx, sy, s] = P(cx, cy);
  if (lead) {
    glowAt(g, sx, sy, s * 0.4, "255,220,140", 0.35); // มีคนพา = แสงทองนิ่งใต้เท้า
  } else {
    const k = (now / 1100) % 1;
    g.save(); g.translate(sx, sy); g.scale(1, 0.42); g.strokeStyle = `rgba(255,215,120,${0.9 * (1 - k)})`; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, s * (0.25 + k * 0.4), 0, TAU); g.stroke(); g.restore();
  }
  g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.ellipse(sx, sy, s * 0.2, s * 0.07, 0, 0, TAU); g.fill();
  const bob = lowQ ? 0 : Math.abs(Math.sin(now / (lead ? 150 : 600))) * s * 0.03;
  // ภาพคนจริง 6 แบบ (ผู้ใช้ส่งมา 2026-11-10 · ตัดพื้นหลังแล้ว): ภาพลอยบนกระดานแบบมอน (ไม่ใช่หมาก/การ์ด)
  //  รอคนช่วย = ลอยขึ้นลงช้าๆ + เอียงซ้ายขวา · มีคนพา = เด้งตามจังหวะเดิน · หันตามทิศคนพา
  const ph = img(`/eos/img/people${((c.look || 0) % 6) + 1}.webp`);
  if (ph) {
    const ar = ph.naturalWidth / ph.naturalHeight, h = Math.min(s * 1.35, (s * 1.05) / ar), w = h * ar;
    const hover = s * (0.08 + (lowQ ? 0 : lead ? Math.abs(Math.sin(now / 150)) * 0.06 : 0.03 + Math.sin(now / 700 + (c.look || 0)) * 0.03));
    const tilt = lead || lowQ ? 0 : Math.sin(now / 900 + (c.look || 0)) * 0.04;
    const flip = lead ? lead.x < cx : false;
    g.save(); g.translate(sx, sy - hover); g.rotate(tilt); if (flip) g.scale(-1, 1);
    g.drawImage(ph, -w / 2, -h, w, h);
    g.restore();
    const UK = Math.max(0.35, s * 0.0085);
    drawVitalBar(g, sx, sy - hover - h - s * 0.1, s * 0.5, { hp: c.hp, maxHp: Math.max(1, c.maxHp || 4), armor: 0, maxArmor: 0, hpTone: "civ" }, UK); // พลเรือน = หลอดฟ้า
    return;
  }
  const cloak = CIV_CLOAK[(c.look || 0) % CIV_CLOAK.length];
  g.fillStyle = cloak; g.beginPath(); g.moveTo(sx - s * 0.15, sy - bob); g.lineTo(sx - s * 0.1, sy - s * 0.48 - bob); g.lineTo(sx + s * 0.1, sy - s * 0.48 - bob); g.lineTo(sx + s * 0.15, sy - bob); g.closePath(); g.fill();
  g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(sx, sy - s * 0.48 - bob, s * 0.12, s * 0.48);
  g.fillStyle = "#f0c9a0"; g.beginPath(); g.arc(sx, sy - s * 0.58 - bob, s * 0.1, 0, TAU); g.fill();
  g.fillStyle = cloak; g.beginPath(); g.arc(sx, sy - s * 0.62 - bob, s * 0.11, Math.PI, 0); g.fill();
  if (!lead) { // โบกมือ
    const w = Math.sin(now / 160) * 0.5;
    g.strokeStyle = "#f0c9a0"; g.lineWidth = Math.max(2, s * 0.04); g.lineCap = "round";
    g.beginPath(); g.moveTo(sx + s * 0.1, sy - s * 0.42 - bob); g.lineTo(sx + s * (0.2 + w * 0.08), sy - s * 0.7 - bob); g.stroke(); g.lineCap = "butt";
  }
  hpPips(g, cx, cy, 0.95, c.hp, c.maxHp, 0, 0, "civ");
}
