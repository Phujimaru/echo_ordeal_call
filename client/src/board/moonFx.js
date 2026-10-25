// ============================================================
//  เอฟเฟกต์บนกระดานของโหมด Moon Cell — Raid Boss (server/moonCell.js · GRID_PLAN §8.4)
//  Moon Cell (ยูนิต summon.kind "moonCell" 2×2): โมเดลลูกบาศก์ลอย (ผู้ใช้สั่ง — ไม่ใช่หมากหกเหลี่ยม) ฟ้าโปร่งแสง แบ่งบล็อก 3×3 ขอบเรือง แกนขาวเต้น
//   ลอยเหนือกลางตัว ~1.25 ช่อง · ตั้งมุมเอียงแบบภาพแรงบันดาลใจ + หมุนรอบแกนตั้ง + ลอยขึ้นลง · พื้นใต้ตัว = เงา + วงข้อมูลหมุน + ลำแสงจาง
//   (หน้าตาเดียวกับ globe/moonModel.js createMoonCellCube ของหน้าโหวต/ฉากบิน)
//  บนพื้น (state.moon — drawMoonGround ใต้ไฮไลต์):
//   curse   = พื้นที่คำสาป 9×9 ที่จะลงต้นเทิร์นหน้า: พื้นแดงม่วงเต้น + ขอบเส้นประวิ่ง + ตราจันทร์เสี้ยวกลางพื้นที่
//   pillars = ช่องที่เสาข้อมูลจะพุ่งต้นเทิร์นหน้า: วงข้อมูลฟ้า + บิตข้อมูลลอยขึ้น
//  ฉากต้นเทิร์น (socket "moonScene" → moonEventFx → { fx, look, shake, later }):
//   moonPillar (เสาปริซึมฟ้าพุ่งจากพื้น + ประกาย · โดน = วงแตก) · moonCurse (ลำแสงจากฟ้าโปรย + ลำแสงใหญ่ถล่มกลางพื้นที่ → แฟลช/คลื่นกระแทก/เศษพื้น · เสียงมาจาก server)
//   moonWarn (พื้นที่คำสาปกางออกจากกลาง) · moonCancel (ขอบพื้นที่แตกกระจายจาง) · moonRevive (เสาแสงขาวฟ้า + วงบนพื้น)
//  lowQ = ตัดอนุภาค/ชั้นเรืองครึ่งหนึ่ง · ลดการเคลื่อนไหว = ลูกบาศก์ไม่หมุน/ไม่ลอย
// ============================================================
import { F_TH, P, depthOf, gEllipse, gPoly, glow } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (k) => 1 - Math.pow(1 - k, 3);

// ---------- จังหวะ ----------
//  ท่าตีปกติของฮาคุโนะ (state.attack.byStyle — characters/_hakuno.js attackStyle):
//   hakunoM ชาย = พุ่งเข้า (anim "lunge" ของ BoardStage — ชนที่ ~385 ms) หมัดโค้ดช็อก: เส้นวงจรส้มวนรอบหมัด → แตกเป็นเศษหกเหลี่ยมส้ม/ฟ้า
//   hakunoF หญิง = ยืนร่าย: วงโค้ดม่วงขาวกางใต้เป้า → หอกข้อมูล 3 เล่มแทงขึ้นจากวง → ประกายกลีบ
export const HAKUNO_MS = { hakunoM: 700, hakunoF: 1000 };
export const HAKUNO_HIT_P = { hakunoM: 0.55, hakunoF: 0.6 };
export const MOON_FX_DUR = {
  ...HAKUNO_MS, moonPillar: 1300, moonCurse: 2800, moonWarn: 900, moonCancel: 1000, moonRevive: 1700 };
export const isMoonFx = (kind) => typeof kind === "string" && (kind in MOON_FX_DUR);
const CURSE_HIT_MS = 820; // ลำแสงถึงพื้น (เป้าสั่น/ตัวเลข)

// =================================================================== Moon Cell (โมเดลลอย)
//  มุมลูกบาศก์ i = บิต x | y<<1 | z<<2 · หน้า = ลำดับทวนเข็มเมื่อมองจากด้านนอก (ใช้ทิศการวนบนจอแยกหน้า/หลัง)
const FACES = [[4, 5, 7, 6], [0, 2, 3, 1], [1, 3, 7, 5], [0, 4, 6, 2], [2, 6, 7, 3], [0, 1, 5, 4]];
const TILT_X = 0.62, TILT_Y = 0.6;
function cubeCorners(cx, cy, cz, h, rot) {
  const out = [];
  const cX = Math.cos(TILT_X), sX = Math.sin(TILT_X), cY = Math.cos(TILT_Y), sY = Math.sin(TILT_Y), cR = Math.cos(rot), sR = Math.sin(rot);
  for (let i = 0; i < 8; i++) {
    const a = (i & 1 ? 1 : -1) * h, b = (i & 2 ? 1 : -1) * h, c = (i & 4 ? 1 : -1) * h;
    // เอียงรอบแกน x → เอียงรอบแกน y → หมุนรอบแกนตั้ง
    const b1 = b * cX - c * sX, c1 = b * sX + c * cX;
    const a2 = a * cY + c1 * sY, c2 = -a * sY + c1 * cY;
    const x = a2 * cR - b1 * sR, y = a2 * sR + b1 * cR;
    out.push(P(cx + x, cy + y, cz + c2));
  }
  return out;
}
const area2 = (q) => { let s = 0; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; s += a[0] * b[1] - b[0] * a[1]; } return s; };
function polyPath(g, q) { g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// ลูกบาศก์ Moon Cell ที่ (cx, cy) สูงศูนย์กลาง cz · h = ครึ่งด้าน (หน่วยช่อง) · flash = แฟลชขาวตอนโดนตี (0..1) → ขอบบนจอ { x0, y0, x1, y1, mid }
export function drawMoonCube(g, cx, cy, cz, h, now, { flash = 0, alpha = 1, lowQ = false } = {}) {
  const t = REDUCED ? 0 : now;
  const v = cubeCorners(cx, cy, cz, h, t / 3800);
  // ทิศวนของหน้าบนเมื่อไม่หมุน = ทิศของหน้าที่หันเข้ากล้อง
  const ref = (() => { const r = []; for (const i of FACES[0]) { const a = i & 1 ? h : -h, b = i & 2 ? h : -h; r.push(P(cx + a, cy + b, cz + h)); } return Math.sign(area2(r)); })();
  const faces = FACES.map((f) => { const q = f.map((i) => v[i]); return { q, front: Math.sign(area2(q)) === ref }; });
  const mid = P(cx, cy, cz), S = mid[2];
  g.save(); g.globalAlpha *= alpha;
  if (!lowQ) glow(g, mid[0], mid[1], S * h * 4.2, "95,170,240", 0.42);
  // หน้าหลัง (จาง) → แกนกลาง → หน้าหน้า + ตาราง 3×3 + ขอบ
  for (const f of faces) if (!f.front) { polyPath(g, f.q); g.fillStyle = "rgba(40,110,200,.22)"; g.fill(); g.strokeStyle = "rgba(170,215,255,.35)"; g.lineWidth = 1; g.stroke(); }
  const pulse = 0.7 + 0.3 * Math.sin(t / 420);
  glow(g, mid[0], mid[1], S * h * 1.5, "255,255,255", 0.75 * pulse);
  const cs = cubeCorners(cx, cy, cz, h * 0.32, -t / 2600);
  for (const fi of FACES) { const q = fi.map((i) => cs[i]); polyPath(g, q); g.fillStyle = `rgba(255,255,255,${0.35 + 0.35 * pulse})`; g.fill(); }
  for (const f of faces) {
    if (!f.front) continue;
    const [a, b, c, d] = f.q;
    polyPath(g, f.q);
    const gr = g.createLinearGradient(a[0], a[1], c[0], c[1]);
    gr.addColorStop(0, "rgba(120,190,255,.42)"); gr.addColorStop(1, "rgba(45,120,215,.3)");
    g.fillStyle = gr; g.fill();
    g.strokeStyle = "rgba(190,228,255,.55)"; g.lineWidth = 1;
    for (const k of [1 / 3, 2 / 3]) {
      let p = lerp2(a, b, k), q = lerp2(d, c, k); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
      p = lerp2(a, d, k); q = lerp2(b, c, k); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
    }
    polyPath(g, f.q); g.strokeStyle = "rgba(235,248,255,.95)"; g.lineWidth = Math.max(1.4, S * 0.03); g.stroke();
    if (flash > 0) { polyPath(g, f.q); g.fillStyle = `rgba(255,255,255,${0.85 * flash})`; g.fill(); }
  }
  g.restore();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of v) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  return { x0, y0, x1, y1, mid };
}

// หมาก Moon Cell บนกระดาน (boardDraw drawAnyUnit) · ctx = { UK, vitalBar(g, cx, y, w, u, UK) → ขอบล่าง, vitalHeight(u, UK) }
export function drawMoonCell(g, u, now, boxes, ctx) {
  const n = Math.max(1, u.size | 0), cx = u.rx + n / 2 + (u.ox || 0), cy = u.ry + n / 2 + (u.oy || 0);
  const t = REDUCED ? 0 : now, a = u.alpha == null ? 1 : u.alpha, UK = ctx.UK || 1;
  const hitAge = u.hitT ? now - u.hitT : 1e9;
  const shake = hitAge >= 0 && hitAge < 300 ? (1 - hitAge / 300) * 0.08 : 0;
  const jx = shake ? (Math.random() - 0.5) * shake : 0, jy = shake ? (Math.random() - 0.5) * shake : 0;
  const cz = 1.25 * n / 2 + Math.sin(t / 900) * 0.07, h = 0.42 * n / 2;
  g.save(); g.globalAlpha = a;
  // พื้น: เงา · วงข้อมูลหมุน · ลำแสงจาง
  gEllipse(g, cx, cy, 0.62 * n / 2, 0, 40); g.fillStyle = "rgba(10,40,90,.28)"; g.fill();
  g.strokeStyle = "rgba(120,200,255,.75)"; g.lineWidth = 1.6; gEllipse(g, cx, cy, 0.92 * n / 2, 0.02, 64); g.stroke();
  g.strokeStyle = "rgba(120,200,255,.45)"; g.lineWidth = 1; gEllipse(g, cx, cy, 0.74 * n / 2, 0.02, 48); g.stroke();
  const rot = t / 5200;
  for (let i = 0; i < 12; i++) {
    const an = rot + i / 12 * TAU, r0 = 0.74 * n / 2, r1 = 0.92 * n / 2;
    const p0 = P(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0, 0.02), p1 = P(cx + Math.cos(an + 0.12) * r1, cy + Math.sin(an + 0.12) * r1, 0.02);
    g.strokeStyle = i % 3 ? "rgba(150,215,255,.5)" : "rgba(220,240,255,.85)"; g.lineWidth = i % 3 ? 1 : 2;
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
  }
  const hexR = 0.5 * n / 2;
  gPoly(g, Array.from({ length: 6 }, (_, i) => { const an = -rot * 1.6 + i / 6 * TAU; return [cx + Math.cos(an) * hexR, cy + Math.sin(an) * hexR, 0.02]; }));
  g.strokeStyle = "rgba(200,235,255,.6)"; g.lineWidth = 1.2; g.stroke();
  const g0 = P(cx, cy, 0), gTop = P(cx, cy, cz - h);
  const beam = g.createLinearGradient(0, gTop[1], 0, g0[1]);
  beam.addColorStop(0, "rgba(150,210,255,.35)"); beam.addColorStop(1, "rgba(150,210,255,0)");
  g.fillStyle = beam; g.fillRect(g0[0] - g0[2] * 0.14, gTop[1], g0[2] * 0.28, g0[1] - gTop[1]);
  g.restore();
  const box = drawMoonCube(g, cx + jx, cy + jy, cz, h, now, { flash: hitAge >= 0 && hitAge < 160 ? 1 - hitAge / 160 : 0, alpha: a, lowQ: u.lowQ });
  // หลอดพลังชีวิต/เกราะ + ชื่อตอนชี้
  const pw = 112 * UK, ph = ctx.vitalHeight(u, UK), py = box.y0 - ph - 10 * UK;
  g.save(); g.globalAlpha = a;
  if (!u.masked && !u.noBar) ctx.vitalBar(g, box.mid[0], py, pw, u, UK);
  if (u.hovered && u.name) {
    g.font = `600 ${13 * UK}px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
    const nw = g.measureText(u.name).width + 14 * UK;
    g.fillStyle = "rgba(13,28,54,.92)"; g.fillRect(box.mid[0] - nw / 2, py - 24 * UK, nw, 19 * UK);
    g.fillStyle = "#ffffff"; g.fillText(u.name, box.mid[0], py - 14 * UK); g.textBaseline = "alphabetic";
  }
  g.restore();
  if (boxes) boxes.push({ id: u.id, x: u.rx, y: u.ry, d: depthOf(cx, cy), x0: Math.min(box.x0, g0[0] - g0[2] * 0.5) - 4, y0: py - 4, x1: Math.max(box.x1, g0[0] + g0[2] * 0.5) + 4, y1: g0[1] + g0[2] * 0.3 });
}

// =================================================================== พื้น: คำสาปที่เตือนไว้ · เสาข้อมูลที่จะพุ่ง
function areaRect(at, size, info) {
  const hf = Math.floor((size || 9) / 2);
  const x0 = Math.max(0, at.x - hf), y0 = Math.max(0, at.y - hf);
  const x1 = Math.min(info.cols, at.x + hf + 1), y1 = Math.min(info.rows, at.y + hf + 1);
  return { x0, y0, x1, y1 };
}
function rectPath(g, r, inset = 0, z = 0) { gPoly(g, [[r.x0 + inset, r.y0 + inset, z], [r.x1 - inset, r.y0 + inset, z], [r.x1 - inset, r.y1 - inset, z], [r.x0 + inset, r.y1 - inset, z]]); }
// ตราจันทร์เสี้ยวบนพื้น (ในวงกลมรัศมี r ช่อง)
function crescent(g, cx, cy, r, z, fill, ring) {
  const circle = (x, y, rr) => { for (let i = 0; i <= 48; i++) { const an = i / 48 * TAU, p = P(x + Math.cos(an) * rr, y + Math.sin(an) * rr, z); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); } g.closePath(); };
  g.save();
  g.beginPath(); circle(cx, cy, r); g.strokeStyle = ring; g.lineWidth = 2; g.stroke(); g.clip();
  g.beginPath(); circle(cx, cy, r * 0.82); circle(cx + r * 0.36, cy - r * 0.22, r * 0.66); g.fillStyle = fill; g.fill("evenodd");
  g.restore();
}
function drawCurseArea(g, at, size, info, now, k = 1, lowQ = false) {
  const r = areaRect(at, size, info), t = REDUCED ? 0 : now;
  const pulse = 0.5 + 0.5 * Math.sin(t / 380);
  g.save(); g.globalAlpha *= k;
  rectPath(g, r, 0, 0.01); g.fillStyle = `rgba(130,20,80,${0.16 + 0.12 * pulse})`; g.fill();
  // ตารางจางในพื้นที่
  g.strokeStyle = "rgba(255,120,170,.16)"; g.lineWidth = 1;
  for (let x = r.x0 + 1; x < r.x1; x++) { const a = P(x, r.y0, 0.01), b = P(x, r.y1, 0.01); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  for (let y = r.y0 + 1; y < r.y1; y++) { const a = P(r.x0, y, 0.01), b = P(r.x1, y, 0.01); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  rectPath(g, r, 0, 0.02); g.setLineDash([10, 7]); g.lineDashOffset = -t / 40; g.strokeStyle = `rgba(255,70,120,${0.75 + 0.25 * pulse})`; g.lineWidth = 2.6; g.stroke();
  g.setLineDash([]); rectPath(g, r, 0.18, 0.02); g.strokeStyle = "rgba(190,120,255,.5)"; g.lineWidth = 1.2; g.stroke();
  const c = P(at.x + 0.5, at.y + 0.5, 0.02);
  if (!lowQ) glow(g, c[0], c[1], c[2] * 2.6, "200,40,110", 0.3 + 0.2 * pulse);
  crescent(g, at.x + 0.5, at.y + 0.5, 1.15, 0.03, `rgba(255,190,220,${0.55 + 0.3 * pulse})`, "rgba(255,90,140,.85)");
  g.restore();
}
function drawPillarMark(g, x, y, now, lowQ) {
  const t = REDUCED ? 0 : now, cx = x + 0.5, cy = y + 0.5;
  const pulse = 0.5 + 0.5 * Math.sin(t / 300 + x * 1.7 + y);
  gEllipse(g, cx, cy, 0.38, 0.02, 32); g.fillStyle = `rgba(60,170,255,${0.14 + 0.12 * pulse})`; g.fill();
  g.strokeStyle = `rgba(140,220,255,${0.6 + 0.35 * pulse})`; g.lineWidth = 1.8; g.stroke();
  gPoly(g, Array.from({ length: 6 }, (_, i) => { const an = t / 1400 + i / 6 * TAU; return [cx + Math.cos(an) * 0.24, cy + Math.sin(an) * 0.24, 0.02]; }));
  g.strokeStyle = "rgba(220,245,255,.8)"; g.lineWidth = 1.2; g.stroke();
  if (lowQ) return;
  // บิตข้อมูลลอยขึ้น
  for (let i = 0; i < 4; i++) {
    const ph = ((t / 1300) + i / 4 + (x * 0.13 + y * 0.29)) % 1;
    const p = P(cx + Math.cos(i * 2.1) * 0.2, cy + Math.sin(i * 2.1) * 0.2, ph * 0.9);
    g.fillStyle = `rgba(170,230,255,${(1 - ph) * 0.9})`; g.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3);
  }
}
export function drawMoonGround(g, moon, info, now, lowQ) {
  if (!moon || !info) return;
  if (moon.curse && moon.curse.at) drawCurseArea(g, moon.curse.at, moon.curse.size, info, now, 1, lowQ);
  for (const t of moon.pillars || []) drawPillarMark(g, t.x, t.y, now, lowQ);
}

// =================================================================== ฉากต้นเทิร์น
//  e.t0 = เวลาเริ่ม · fx ทุกชนิดมี { at | x, y }
export function moonFx(g, e, now, lowQ, ctx = {}) {
  const u = clamp01((now - e.t0) / (MOON_FX_DUR[e.kind] || 1000));
  if (u <= 0 || u >= 1) return;
  const info = ctx.info;
  g.save();
  if (e.kind === "hakunoM") hakunoPunchFx(g, e, u, now, lowQ);
  else if (e.kind === "hakunoF") hakunoCastFx(g, e, u, now, lowQ);
  else if (e.kind === "moonPillar") pillarFx(g, e, u, now, lowQ);
  else if (e.kind === "moonRevive") reviveFx(g, e, u, now, lowQ);
  else if (e.kind === "moonWarn" && info) drawCurseArea(g, e.at, e.size, info, now, u < 0.25 ? easeOut(u / 0.25) : 1 - (u - 0.25) / 0.75 * 0.4, lowQ), warnBloom(g, e, u, info);
  else if (e.kind === "moonCancel" && info) cancelFx(g, e, u, info, now);
  else if (e.kind === "moonCurse" && info) curseFx(g, e, u, now, lowQ, info);
  g.restore();
}
// ---------- ท่าตีของฮาคุโนะ ----------
const midOf = (x, y, n) => [x + (n || 1) / 2, y + (n || 1) / 2];
// เศษหกเหลี่ยมกระจายจากจุดปะทะ (k = 0..1 หลังชน) · cols = "r,g,b"
function hexShards(g, cx, cy, z, k, n, cols, lowQ) {
  for (let i = 0; i < (lowQ ? n >> 1 : n); i++) {
    const an = (i * 2.399) % TAU, d = (0.25 + ((i * 7) % 5) * 0.12) * easeOut(k) * 1.4, zz = z + (0.2 + (i % 3) * 0.25) * k - 0.6 * k * k;
    const p = P(cx + Math.cos(an) * d, cy + Math.sin(an) * d, Math.max(0, zz)), r = p[2] * (0.07 + (i % 3) * 0.02) * (1 - k * 0.6);
    g.beginPath();
    for (let j = 0; j < 6; j++) { const a2 = j / 6 * TAU + k * 3 + i; const qx = p[0] + Math.cos(a2) * r, qy = p[1] + Math.sin(a2) * r * 0.86; if (j) g.lineTo(qx, qy); else g.moveTo(qx, qy); }
    g.closePath();
    g.fillStyle = `rgba(${cols[i % cols.length]},${1 - k})`; g.fill();
  }
}
function hakunoPunchFx(g, e, u, now, lowQ) {
  const T = HAKUNO_MS.hakunoM, ms = u * T, hit = T * HAKUNO_HIT_P.hakunoM;
  const [ax, ay] = midOf(e.x, e.y, e.size), [bx, by] = midOf(e.to.x, e.to.y, e.toSize);
  if (ms < hit) {
    // หมัดวิ่งตามการพุ่ง: เส้นวงจรส้มวนรอบหมัด + ลายวงจรลากตามหลัง
    const k = ms / hit, m = 0.15 + 0.7 * k * k;
    const fx = ax + (bx - ax) * m, fy = ay + (by - ay) * m, p = P(fx, fy, 0.65), r = p[2] * 0.32;
    glow(g, p[0], p[1], r * 2.4, "255,140,40", 0.45 + 0.35 * k);
    g.lineWidth = 2; g.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const a0 = now / 90 + i * TAU / 3;
      g.strokeStyle = i === 1 ? "rgba(120,220,255,.9)" : "rgba(255,150,50,.95)";
      g.beginPath(); g.arc(p[0], p[1], r * (0.6 + 0.25 * i), a0, a0 + 2.2); g.stroke();
    }
    const back = P(ax + (bx - ax) * Math.max(0, m - 0.35), ay + (by - ay) * Math.max(0, m - 0.35), 0.65);
    g.strokeStyle = "rgba(255,160,70,.7)"; g.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
      g.beginPath(); g.moveTo(p[0], p[1] + i * r * 0.5); g.lineTo((p[0] + back[0]) / 2, p[1] + i * r * 0.5); g.lineTo(back[0], back[1] + i * r * 0.9); g.stroke();
    }
    g.lineCap = "butt";
    return;
  }
  // ปะทะ: แฟลชส้ม + วงช็อกฟ้า + เศษหกเหลี่ยม (หลบพ้น = เล็กลง ขาว)
  const k = clamp01((ms - hit) / (T - hit)), p = P(bx, by, 0.6), dodge = !!e.dodge;
  glow(g, p[0], p[1], p[2] * (dodge ? 0.9 : 1.6), dodge ? "255,255,255" : "255,170,60", 0.9 * (1 - k));
  g.strokeStyle = `rgba(120,220,255,${1 - k})`; g.lineWidth = 3 * (1 - k) + 1;
  g.beginPath(); g.ellipse(p[0], p[1], p[2] * (0.2 + k * 0.9), p[2] * (0.12 + k * 0.5), 0, 0, TAU); g.stroke();
  if (!dodge) hexShards(g, bx, by, 0.6, k, 14, ["255,150,50", "120,220,255", "255,230,190"], lowQ);
}
function hakunoCastFx(g, e, u, now, lowQ) {
  const T = HAKUNO_MS.hakunoF, ms = u * T, hit = T * HAKUNO_HIT_P.hakunoF;
  const [ax, ay] = midOf(e.x, e.y, e.size), [bx, by] = midOf(e.to.x, e.to.y, e.toSize);
  const R = 0.55 * (e.toSize || 1);
  // แสงที่มือผู้ร่าย
  if (ms < hit + 120) { const p = P(ax, ay, 0.9); glow(g, p[0], p[1], p[2] * 0.7, "200,150,255", 0.7 * Math.min(1, ms / 200)); }
  // วงโค้ดใต้เป้า: กางออก → ค้าง → จาง
  const open = easeOut(clamp01(ms / 380)), fade = ms > hit ? 1 - clamp01((ms - hit) / (T - hit)) : 1, rot = now / 900;
  g.globalAlpha = fade;
  gEllipse(g, bx, by, R * open, 0.02, 48); g.fillStyle = "rgba(140,80,220,.18)"; g.fill();
  g.strokeStyle = "rgba(225,200,255,.95)"; g.lineWidth = 2; g.stroke();
  gEllipse(g, bx, by, R * 0.72 * open, 0.02, 40); g.strokeStyle = "rgba(190,140,255,.75)"; g.lineWidth = 1.2; g.stroke();
  for (let i = 0; i < 16; i++) {
    const an = rot + i / 16 * TAU, r0 = R * 0.74 * open, r1 = R * (i % 4 ? 0.86 : 0.98) * open;
    const p0 = P(bx + Math.cos(an) * r0, by + Math.sin(an) * r0, 0.02), p1 = P(bx + Math.cos(an) * r1, by + Math.sin(an) * r1, 0.02);
    g.strokeStyle = "rgba(240,225,255,.8)"; g.lineWidth = i % 4 ? 1 : 2; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
  }
  // หอกข้อมูล 3 เล่มแทงขึ้นจากวง (เริ่ม 380 ms ถึงยอดตอนปะทะ)
  const rise = clamp01((ms - 380) / (hit - 380));
  if (rise > 0) {
    for (let i = 0; i < 3; i++) {
      const an = -rot * 0.7 + i / 3 * TAU, rr = R * 0.38, x = bx + Math.cos(an) * rr, y = by + Math.sin(an) * rr;
      const b0 = P(x, y, 0.02), tip = P(bx + Math.cos(an) * rr * 0.25, by + Math.sin(an) * rr * 0.25, 0.2 + 1.5 * easeOut(rise));
      const w = b0[2] * 0.07;
      g.beginPath(); g.moveTo(b0[0] - w, b0[1]); g.lineTo(tip[0], tip[1]); g.lineTo(b0[0] + w, b0[1]); g.closePath();
      g.fillStyle = "rgba(235,220,255,.95)"; g.fill(); g.strokeStyle = "rgba(160,110,240,.9)"; g.lineWidth = 1; g.stroke();
    }
  }
  g.globalAlpha = 1;
  if (ms >= hit) {
    const k = clamp01((ms - hit) / (T - hit)), p = P(bx, by, 0.9), dodge = !!e.dodge;
    glow(g, p[0], p[1], p[2] * (dodge ? 0.8 : 1.4), dodge ? "255,255,255" : "220,170,255", 0.85 * (1 - k));
    if (dodge) return;
    // ประกายกลีบลอยขึ้น
    for (let i = 0; i < (lowQ ? 6 : 12); i++) {
      const an = i * 2.1, d = 0.2 + easeOut(k) * (0.4 + (i % 3) * 0.15), q = P(bx + Math.cos(an) * d, by + Math.sin(an) * d, 0.7 + k * (0.6 + (i % 4) * 0.2));
      g.save(); g.translate(q[0], q[1]); g.rotate(an + k * 4);
      g.fillStyle = i % 2 ? `rgba(255,200,235,${1 - k})` : `rgba(230,215,255,${1 - k})`;
      g.beginPath(); g.ellipse(0, 0, q[2] * 0.07, q[2] * 0.035, 0, 0, TAU); g.fill(); g.restore();
    }
  }
}

// เสาปริซึมหกเหลี่ยมพุ่งจากพื้น → ค้าง → ยุบลง · ช่วงพุ่ง = ประกาย + วงแตกบนพื้น
function pillarFx(g, e, u, now, lowQ) {
  const cx = e.x + 0.5, cy = e.y + 0.5;
  const up = easeOut(clamp01(u / 0.14)), down = clamp01((u - 0.7) / 0.3), H = 2.4 * up * (1 - down * down);
  const r = 0.3, n = 6, rot = 0.4;
  const base = Array.from({ length: n }, (_, i) => { const an = rot + i / n * TAU; return [cx + Math.cos(an) * r, cy + Math.sin(an) * r]; });
  // วงกระแทกบนพื้น
  const ring = clamp01(u / 0.4);
  if (ring < 1) { gEllipse(g, cx, cy, 0.3 + ring * 0.9, 0.02, 40); g.strokeStyle = `rgba(150,225,255,${(1 - ring) * 0.9})`; g.lineWidth = 3 * (1 - ring) + 1; g.stroke(); }
  if (H > 0.02) {
    // ด้านข้าง (เรียงจากไกลไปใกล้ด้วยความลึก)
    const sides = base.map((p, i) => { const q = base[(i + 1) % n]; return { p, q, d: depthOf((p[0] + q[0]) / 2, (p[1] + q[1]) / 2) }; }).sort((a, b) => a.d - b.d);
    for (const s of sides) {
      gPoly(g, [[s.p[0], s.p[1], 0], [s.q[0], s.q[1], 0], [s.q[0], s.q[1], H], [s.p[0], s.p[1], H]]);
      const lit = 0.5 + 0.5 * Math.cos(Math.atan2(s.p[1] - cy, s.p[0] - cx) - 2.2);
      g.fillStyle = `rgba(${60 + 80 * lit | 0},${150 + 70 * lit | 0},255,.82)`; g.fill();
      g.strokeStyle = "rgba(220,245,255,.8)"; g.lineWidth = 1; g.stroke();
    }
    gPoly(g, base.map(([x, y]) => [x, y, H])); g.fillStyle = "rgba(225,245,255,.95)"; g.fill();
    // แถบข้อมูลวิ่งขึ้นตามเสา
    for (let k = 0; k < 4; k++) {
      const z = ((now / 400 + k / 4) % 1) * H, a = P(cx, cy, z);
      g.fillStyle = "rgba(255,255,255,.75)"; g.fillRect(a[0] - a[2] * 0.22, a[1] - 1, a[2] * 0.44, 2);
    }
    const top = P(cx, cy, H);
    if (!lowQ) glow(g, top[0], top[1], top[2] * 1.2, "150,220,255", 0.6 * (1 - down));
  }
  if (!lowQ && u < 0.45) {
    for (let i = 0; i < 10; i++) {
      const an = i / 10 * TAU + e.x, k = u / 0.45, p = P(cx + Math.cos(an) * k * 0.9, cy + Math.sin(an) * k * 0.9, k * 1.6 * (1 - k) + 0.1);
      g.fillStyle = `rgba(190,240,255,${1 - k})`; g.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3);
    }
  }
  if (e.hit && u < 0.3) { const p = P(cx, cy, 0.7); glow(g, p[0], p[1], p[2] * 1.4, "255,255,255", 0.8 * (1 - u / 0.3)); }
}
// เสาแสงขาวฟ้าลงจากฟ้า + วงบนพื้น
function reviveFx(g, e, u, now, lowQ) {
  const cx = e.x + 0.5, cy = e.y + 0.5;
  const k = u < 0.2 ? u / 0.2 : u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1;
  const g0 = P(cx, cy, 0), top = P(cx, cy, 6);
  const w = g0[2] * 0.6 * (0.6 + 0.4 * k);
  const gr = g.createLinearGradient(0, top[1], 0, g0[1]);
  gr.addColorStop(0, "rgba(200,235,255,0)"); gr.addColorStop(1, `rgba(220,240,255,${0.8 * k})`);
  g.fillStyle = gr; g.fillRect(g0[0] - w / 2, top[1], w, g0[1] - top[1]);
  for (let i = 0; i < 2; i++) {
    const rr = 0.4 + ((u * 1.6 + i * 0.5) % 1) * 0.9;
    gEllipse(g, cx, cy, rr, 0.02, 40); g.strokeStyle = `rgba(170,220,255,${k * (1 - (rr - 0.4) / 0.9)})`; g.lineWidth = 2; g.stroke();
  }
  if (!lowQ) glow(g, g0[0], g0[1] - g0[2] * 0.6, g0[2] * 1.6, "200,235,255", 0.5 * k);
}
// พื้นที่คำสาปกางออกจากกลาง (เส้นขอบวาบ)
function warnBloom(g, e, u, info) {
  if (u > 0.35) return;
  const k = u / 0.35, r = areaRect(e.at, e.size, info);
  const cx = e.at.x + 0.5, cy = e.at.y + 0.5;
  const s = { x0: cx + (r.x0 - cx) * easeOut(k), y0: cy + (r.y0 - cy) * easeOut(k), x1: cx + (r.x1 - cx) * easeOut(k), y1: cy + (r.y1 - cy) * easeOut(k) };
  rectPath(g, s, 0, 0.03); g.strokeStyle = `rgba(255,220,235,${1 - k})`; g.lineWidth = 4; g.stroke();
}
// ขอบพื้นที่แตกเป็นท่อนลอยออกแล้วจาง
function cancelFx(g, e, u, info, now) {
  const r = areaRect(e.at, e.size || 9, info), k = easeOut(u);
  const segs = [];
  for (let x = r.x0; x < r.x1; x++) segs.push([[x, r.y0], [x + 1, r.y0], 0, -1], [[x, r.y1], [x + 1, r.y1], 0, 1]);
  for (let y = r.y0; y < r.y1; y++) segs.push([[r.x0, y], [r.x0, y + 1], -1, 0], [[r.x1, y], [r.x1, y + 1], 1, 0]);
  g.strokeStyle = `rgba(255,90,140,${0.9 * (1 - u)})`; g.lineWidth = 2.4;
  segs.forEach(([a, b, nx, ny], i) => {
    const d = k * (0.6 + ((i * 37) % 10) / 10), z = k * (0.4 + ((i * 13) % 7) / 7);
    const p = P(a[0] + nx * d, a[1] + ny * d, z), q = P(b[0] + nx * d, b[1] + ny * d, z);
    g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
  });
  drawCurseArea(g, e.at, e.size || 9, info, now, (1 - u) * 0.5);
}
// ลำแสงฟ้าถล่มลงพื้นที่ (ผู้ใช้สั่ง: ลำแสงจากฟ้าตกลงพื้นที่ 9×9 — ต่อจากคลิปท่าไม้ตาย):
//  ลำแสงเล็กม่วงขาวโปรยทั่วพื้นที่ (0–760 ms) → ลำแสงใหญ่จากพ้นขอบจอดิ่งลงกลางพื้นที่ ชนที่ CURSE_HIT_MS →
//  แฟลชขาว + คลื่นกระแทก 3 วงทั่วพื้นที่ + เศษพื้นกระเด็น/ประกาย + พื้นมืดวาบ → ลำแสงค้างแล้วหดจาง
const RAIN = Array.from({ length: 10 }, (_, i) => ({ fx: ((i * 53) % 97) / 97, fy: ((i * 71) % 89) / 89, t: 60 + ((i * 37) % 11) / 11 * 640 }));
const RAIN_FALL = 220, RAIN_FADE = 420;
function skyBeam(g, x, y, k, w, rgb, core) {
  // ลำแสงตั้งจากฟ้า (z สูงพ้นจอ) ถึงพื้น · k = 0..1 ปลายลำแสงไล่ลงถึงพื้น · w = ความกว้างบนจอที่พื้น
  const top = P(x, y, 40), bot = P(x, y, 40 * (1 - k));
  const gr = g.createLinearGradient(0, top[1], 0, bot[1]);
  gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(0.55, `rgba(${rgb},.55)`); gr.addColorStop(1, `rgba(${rgb},.95)`);
  g.fillStyle = gr; g.fillRect(bot[0] - w / 2, top[1], w, bot[1] - top[1]);
  if (core > 0) { g.fillStyle = `rgba(255,255,255,${core})`; g.fillRect(bot[0] - w * 0.14, top[1], w * 0.28, bot[1] - top[1]); }
  return bot;
}
function curseFx(g, e, u, now, lowQ, info) {
  const T = MOON_FX_DUR.moonCurse, ms = u * T, hit = CURSE_HIT_MS;
  const r = areaRect(e.at, e.size, info), cx = e.at.x + 0.5, cy = e.at.y + 0.5;
  const W = r.x1 - r.x0, H = r.y1 - r.y0, g0 = P(cx, cy, 0);
  // พื้นมืดทั้งพื้นที่ (เข้มขึ้นจนชน แล้วจาง) + ขอบพื้นที่เดิม
  const dark = ms < hit ? ms / hit : Math.max(0, 1 - (ms - hit) / (T - hit));
  rectPath(g, r, 0, 0.01); g.fillStyle = `rgba(35,0,45,${0.5 * dark})`; g.fill();
  drawCurseArea(g, e.at, e.size, info, now, ms < hit ? 1 : Math.max(0, 1 - (ms - hit) / 500), lowQ);
  // ลำแสงเล็กโปรยทั่วพื้นที่
  for (const b of lowQ ? RAIN.slice(0, 5) : RAIN) {
    const dt = ms - b.t;
    if (dt < 0 || dt > RAIN_FALL + RAIN_FADE) continue;
    const x = r.x0 + 0.5 + b.fx * (W - 1), y = r.y0 + 0.5 + b.fy * (H - 1);
    const k = clamp01(dt / RAIN_FALL), fade = dt > RAIN_FALL ? 1 - (dt - RAIN_FALL) / RAIN_FADE : 1;
    const p = P(x, y, 0);
    g.globalAlpha = fade;
    skyBeam(g, x, y, easeOut(k), p[2] * 0.32, "190,110,255", 0.7);
    if (dt >= RAIN_FALL) {
      const kk = (dt - RAIN_FALL) / RAIN_FADE;
      gEllipse(g, x, y, 0.2 + kk * 0.8, 0.02, 28); g.strokeStyle = `rgba(255,220,255,${1 - kk})`; g.lineWidth = 2.5; g.stroke();
      glow(g, p[0], p[1], p[2] * 1.1, "230,170,255", 0.7 * (1 - kk));
    }
    g.globalAlpha = 1;
  }
  // ลำแสงใหญ่ดิ่งลงกลางพื้นที่
  const START = 380;
  if (ms >= START) {
    const k = clamp01((ms - START) / (hit - START));
    const hold = ms > hit ? clamp01((ms - hit) / (T - hit)) : 0;
    const w = g0[2] * (ms < hit ? 0.7 + 0.5 * k : 2.6 * (1 - hold * hold) + 0.2);
    g.globalAlpha = ms < hit ? 1 : 1 - hold;
    if (!lowQ) skyBeam(g, cx, cy, easeOut(k), w * 1.9, "120,40,170", 0);
    skyBeam(g, cx, cy, easeOut(k), w, "200,120,255", 0.95);
    g.globalAlpha = 1;
  }
  // ชน: แฟลช + คลื่นกระแทก + เศษพื้น
  if (ms >= hit) {
    const k = clamp01((ms - hit) / (T - hit)), maxR = Math.max(W, H) * 0.78;
    if (k < 0.18) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(255,240,255,${0.55 * (1 - k / 0.18)})`; g.fillRect(0, 0, g.canvas.width, g.canvas.height); g.restore(); }
    glow(g, g0[0], g0[1], g0[2] * 6, "255,215,255", 0.95 * Math.max(0, 1 - k / 0.4));
    for (let i = 0; i < 3; i++) {
      const kk = clamp01(k * 1.4 - i * 0.16);
      if (kk <= 0 || kk >= 1) continue;
      g.save(); rectPath(g, r, -0.3, 0.02); g.clip();
      gEllipse(g, cx, cy, 0.4 + easeOut(kk) * maxR, 0.03, 72);
      g.strokeStyle = i ? `rgba(200,110,255,${(1 - kk) * 0.8})` : `rgba(255,235,255,${1 - kk})`; g.lineWidth = (i ? 4 : 9) * (1 - kk) + 1; g.stroke();
      g.restore();
    }
    // รอยร้าวแสงบนพื้นจากกลาง
    if (k < 0.7) {
      g.strokeStyle = `rgba(255,190,240,${0.9 * (1 - k / 0.7)})`; g.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const an = i / 8 * TAU + 0.3, len = Math.min(maxR, 1 + easeOut(clamp01(k * 4)) * maxR * 0.9);
        g.beginPath(); let p = P(cx, cy, 0.02); g.moveTo(p[0], p[1]);
        for (let s2 = 1; s2 <= 4; s2++) { const d = len * s2 / 4, j = ((i * 7 + s2 * 3) % 5 - 2) * 0.12; p = P(cx + Math.cos(an + j) * d, cy + Math.sin(an + j) * d, 0.02); g.lineTo(p[0], p[1]); }
        g.stroke();
      }
    }
    // เศษพื้นกระเด็นขึ้นแล้วร่วง + ประกาย
    const nDeb = lowQ ? 14 : 36;
    for (let i = 0; i < nDeb; i++) {
      const an = (i * 2.399) % TAU, sp = 0.6 + ((i * 17) % 10) / 10 * 2.2, kk = clamp01(k * 1.6);
      const d = sp * easeOut(kk), z = Math.max(0, (1.8 + (i % 4) * 0.5) * kk - 3.2 * kk * kk);
      const p = P(cx + Math.cos(an) * d, cy + Math.sin(an) * d, z);
      g.fillStyle = i % 3 ? `rgba(70,30,90,${1 - kk})` : `rgba(255,210,250,${1 - kk})`;
      const sz = i % 3 ? 3.2 : 2.2; g.fillRect(p[0] - sz / 2, p[1] - sz / 2, sz, sz);
    }
  }
}

// =================================================================== socket "moonScene" → fx
//  ctx = { posOf(id) } · คืน { fx, look, shake, later: [[ms, fx[]]] } (แบบ kazumaEventFx)
export function moonEventFx(scene, ctx = {}) {
  const out = { fx: [], look: [], shake: [], later: [] };
  const evs = (scene && Array.isArray(scene.events)) ? scene.events : [];
  const posOf = ctx.posOf || (() => null);
  let t = 0;
  for (const ev of evs) {
    if (!ev) continue;
    if (ev.type === "pillars") {
      const list = (ev.erupt || []).map((p, i) => ({ ms: i * 90, f: { kind: "moonPillar", x: p.x, y: p.y, hit: !!p.hit, ...(p.hit ? { hitIds: [p.hit], hitDelay: 120 } : null) } }));
      for (const { ms, f } of list) out.later.push([t + ms, [f]]);
      for (const p of ev.erupt || []) if (p.hit) out.later.push([t + 160, [{ kind: "float", x: p.x, y: p.y, text: "-1", color: "#8fd8ff", size: 26 }]]);
      if ((ev.erupt || []).some((p) => p.hit)) out.shake.push(t + 120);
      if ((ev.erupt || []).length) t += 500;
    } else if (ev.type === "revive" && ev.at) {
      out.later.push([t, [{ kind: "moonRevive", x: ev.at.x, y: ev.at.y }]]);
      out.look.push([{ x: ev.at.x, y: ev.at.y }, t]);
      t += 600;
    } else if (ev.type === "curse" && ev.at) {
      out.look.push([{ x: ev.at.x, y: ev.at.y }, t]);
      const ids = (ev.hit || []).map((h) => h.id);
      out.later.push([t, [{ kind: "moonCurse", at: { ...ev.at }, size: ev.size || 9, hitIds: ids, hitDelay: CURSE_HIT_MS }]]);
      out.shake.push(t + CURSE_HIT_MS, t + CURSE_HIT_MS + 260);
      for (const id of ids) { const p = posOf(id); if (p) out.later.push([t + CURSE_HIT_MS + 60, [{ kind: "float", x: p.x, y: p.y, text: "-3", color: "#ff9ad0", size: 30 }]]); }
      t += 1500;
    } else if (ev.type === "warn" && ev.at) {
      out.look.push([{ x: ev.at.x, y: ev.at.y }, t]);
      out.later.push([t, [{ kind: "moonWarn", at: { ...ev.at }, size: ev.size || 9 }]]);
      t += 500;
    } else if (ev.type === "cancel" && ev.at) {
      out.later.push([t, [{ kind: "moonCancel", at: { ...ev.at }, size: ev.size || 9 }]]);
      t += 400;
    }
  }
  return out;
}
