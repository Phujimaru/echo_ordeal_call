// ============================================================
//  เอฟเฟกต์บนกระดานของผู้นำแห่งตระกูลเรียวกิ (characters/ryougi.js · GRID_PLAN §7.17 · สัญญา .claude/plans/ryougi-contract.md)
//  ธีม Mirai Fukuin: กิโมโนชมพู · ซากุระ · ใบมีดขาวเงิน · ตาเนตรมรณะฟ้าวงชมพู · เส้นแห่งความตายแดงเรือง (แกนร้อนชมพูขาว)
//
//  ตีปกติ (attackStyle — STYLE_MS / STYLE_HIT_P ใน boardDraw) · fx { x, y (มุมบนซ้ายผู้ตี), size, to, toSize, lane?, by }
//   ryougiSlash  ย่อตัวพุ่งเข้าหา (ชายกิโมโนชมพูลากเป็นริบบิ้น + เงาติดตา) → ฟันเฉียงเส้นขาวคมทะลุแนว 2 ช่อง → รอยร้าวแดงแวบที่จุดโดน → ถอยกลับ
//   ryougiLeap   (ระหว่างดับสิ้นซะ) กระโดดโค้งข้ามหัว → ฟันแนวตั้งกลางอากาศ (ปะทะ) → ลงหลังเป้า ฟันแนวนอนซ้ำ → พุ่งกลับ ทิ้งเงา/กลีบซากุระ
//  เหตุการณ์ (socket "ryougiFx" → ryougiEventFx → { fx, look, shake, busy, later, slain, gates }):
//   yinyang (ไท่จี๋ลายพู่กันหมุนใต้เท้า → แตกเป็นแสงเขียวอ่อน + กลีบลอยขึ้น)
//   eyes (ฉากใหญ่: จอมืด → ตาวาบฟ้าวงชมพู + เส้นแสงพาดจอ → รอยร้าวแดงแตกกิ่งจากเท้าไล่ทั่วทุกช่อง → จุดตายเต้นบนศัตรู)
//   mind (ใบมีดเรืองขาวในมือ + เส้นขาววนรอบตัว) · sever (เส้นขาวผ่ากลางร่างเป้า → ชิ้นแสงแตก — รอจังหวะปะทะของฉากตี)
//   dash (ชาร์จ → พุ่งตามแนว เงาติดตาหลายชั้น + เส้นตัดขาวบนพื้น) · steal (ลูกแสงฟ้าชมพูจากเป้าเข้าตัว)
//   crumble (ทุกช่องในแนว: เส้นตัดวาบ → พื้นแตกเป็นก้อนร่วงลงหลุม ฝุ่นฟุ้ง · ของที่พังแยกชิ้น · คนในแนวถูกเหวี่ยงออกข้าง)
//   bloom (กลีบซากุระระเบิดออกจากตัวแล้วโปรยทั่วแผนที่)
//   kill (เป้าหยุดนิ่ง → เส้นแห่งความตายขึ้นทั่วตัว → เส้นตัดขาว → ร่างแยกสองซีกเลื่อนออก → ยุบเป็นกองเลือด) — ตีปกติ = รอจังหวะปะทะ (gate)
//  ชั้นค้าง (prop ryougi ของ BoardCanvas = { units: [{ id, eyes, mind, bloom }], blood: [{ x, y, size, id }] } + terrain "chasm"):
//   drawRyougiGround = ช่องพัง (หลุมดำขอบหยัก ก้นเรืองแดง ต่อขอบกับช่องข้างๆ) · กองเลือด · เนตรมณะ (มืดจาง + รอยร้าวแดงหายใจช้าๆ) · ส่วนบนพื้นของฉาก
//   ryougiItems = ใบมีดเรืองที่มือ (รากฐานจิต) · กลีบวนรอบตัว (ดับสิ้นซะ) · ตาเรือง (เนตรมณะ) · เงาติดตาตอนพุ่ง/ตี
//   drawRyougiAir = กลีบซากุระปลิวทั่วกระดาน (ดับสิ้นซะ) · drawBloodCorpse = ศพที่ถูกเรียวกิสังหาร = กองเลือด
//  lowQ = ตัดชั้นเรือง/อนุภาคครึ่งหนึ่ง · ลดการเคลื่อนไหว = ของที่วนตลอดหยุดนิ่ง (เอฟเฟกต์ครั้งเดียวยังเล่น)
// ============================================================
import { P, depthOf, glow, normColor, viewAxes } from "./boardGeo";
import { drawObstacle } from "./boardProps";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ---------- จังหวะ ----------
export const RYOUGI_MS = { ryougiSlash: 760, ryougiLeap: 1250 };
export const RYOUGI_HIT_P = { ryougiSlash: 0.42, ryougiLeap: 0.38 };
const LEAP_HIT2 = 0.6; // ฟันแนวนอนซ้ำหลังเป้า (สัดส่วนของ ryougiLeap)
//  ms นับจากเริ่มเหตุการณ์ — server พัก (skillBeat) dash 1.2 วิ · crumble 1.1 วิ: จังหวะในภาพต้องไม่ช้ากว่านั้น
export const RYOUGI_FX = {
  eyesDark: 220, eyesGlint: 380, eyesCrack: 620, eyesSpread: 1150, eyesPoints: 1450, eyesFade: 2000,
  dashGo: 250, dashArrive: 520,
  crumbleCut: 60, crumbleStep: 35, crumbleFall: 560, crumblePushFrom: 160, crumblePushTo: 560, crumbleSettle: 1000,
  killLines: 300, killCut: 380, killSplit: 1000, killPool: 1450,
  severCut: 160,
  yinyangBurst: 900,
};
const KILL_MS = 1500, SEVER_MS = 950;
const DASH_DRAW = 1300; // ภาพของฉากพุ่ง (หลังจากนี้ fx ยังอยู่เพื่อค้างตัวไว้ปลายทางจน state มาถึง)
export const RYOUGI_FX_DUR = {
  ...RYOUGI_MS,
  ryougiYinyang: 1800, ryougiEyes: 2600, ryougiMind: 1400, ryougiSever: 3000, ryougiDash: 2600,
  ryougiSteal: 1400, ryougiCrumble: 1500, ryougiBloom: 2400, ryougiKill: 3600,
};
export const isRyougiFx = (kind) => typeof kind === "string" && (kind in RYOUGI_FX_DUR);
export const RYOUGI_EVENT_FX = {
  yinyang: "ryougiYinyang", eyes: "ryougiEyes", mind: "ryougiMind", sever: "ryougiSever", dash: "ryougiDash",
  steal: "ryougiSteal", crumble: "ryougiCrumble", bloom: "ryougiBloom", kill: "ryougiKill",
};

// ---------- สี (r,g,b) ----------
const WHITE = "255,255,255", RED = "255,31,61", HOT = "255,194,204";
const PINK = "242,182,204", PINK_D = "217,119,158", SAK = "255,211,226", SAK2 = "247,168,196";
const BLUE = "110,200,255", RINGP = "255,95,168", INDIGO = "26,26,140", BLADE = "217,222,229";
const GREEN = "176,240,186", GREEN_L = "226,255,230";

// ---------- คณิต ----------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const env = (t, a, b, c, d) => (t <= a || t >= d ? 0 : t < b ? (t - a) / (b - a) : t <= c ? 1 : (d - t) / (d - c));
const okT = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const ptOf = (p) => ({ x: p.x, y: p.y });
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const strHash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % 100000; };
function rngOf(seed) { let s = Math.abs(seed | 0) % 2147483646 || 1; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }
function viewRect(view) {
  const x0 = (view && Number.isFinite(view.x0) ? view.x0 : 0) - 60, y0 = (view && Number.isFinite(view.y0) ? view.y0 : 0) - 60;
  const x1 = (view && Number.isFinite(view.x1) ? view.x1 : 1280) + 60, y1 = (view && Number.isFinite(view.y1) ? view.y1 : 720) + 60;
  return [x0, y0, x1 - x0, y1 - y0];
}

// จุดบนจอของหมาก (ตรงกับ boardDraw drawUnit) · cx, cy = กลางตัว (ช่อง) · bx, by = พื้นกลางตัวบนจอ · hy = กลางหกเหลี่ยม · r = รัศมีหกเหลี่ยม
function bodyAt(x, y, n = 1, hz = 0) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6, cx = x + n / 2, cy = y + n / 2;
  const [bx, by, s] = P(cx, cy);
  return { cx, cy, bx, by, s, n, K, r: s * 0.4 * K, hy: by - s * 0.86 * K - hz * s * 0.85 };
}
const unitBody = (u) => bodyAt(u.rx + (u.ox || 0), u.ry + (u.oy || 0), u.size, u.hz || 0);
function groundRing(g, cx, cy, r, rgb, a, lw, z = 0.03) {
  if (a <= 0.01 || r <= 0.01) return;
  g.beginPath();
  for (let i = 0; i <= 44; i++) { const an = (i / 44) * TAU, p = P(cx + Math.cos(an) * r, cy + Math.sin(an) * r, z); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
  g.strokeStyle = rgba(rgb, a); g.lineWidth = lw; g.stroke();
}
// ประกายสี่แฉก (จอ)
function twinkle(g, x, y, r, a, rgb = WHITE) {
  if (a <= 0.01 || r <= 0.5) return;
  g.fillStyle = rgba(rgb, a);
  g.beginPath();
  g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r * 0.2, y); g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r * 0.2, y); g.quadraticCurveTo(x, y, x, y - r);
  g.moveTo(x - r * 0.7, y); g.quadraticCurveTo(x, y, x, y + r * 0.15); g.quadraticCurveTo(x, y, x + r * 0.7, y);
  g.quadraticCurveTo(x, y, x, y - r * 0.15); g.quadraticCurveTo(x, y, x - r * 0.7, y);
  g.fill();
}
// เส้นคมเรียวสองปลาย (จอ) a → b · w = ความหนากลางเส้น · u = ส่วนที่วาดแล้ว (หัวไปทาง b)
function bladeLine(g, a, b, w, k, u = 1, glowRgb = PINK) {
  if (k <= 0.01 || u <= 0.01) return;
  const ex = lerp(a[0], b[0], u), ey = lerp(a[1], b[1], u);
  const vx = ex - a[0], vy = ey - a[1], L = Math.hypot(vx, vy) || 1, nx = -vy / L, ny = vx / L;
  const mx = (a[0] + ex) / 2, my = (a[1] + ey) / 2;
  g.save(); g.globalCompositeOperation = "lighter";
  for (const [m, rgb, al] of [[3.2, glowRgb, 0.28], [1.6, glowRgb, 0.45], [1, WHITE, 1]]) {
    g.fillStyle = rgba(rgb, al * k);
    g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(mx + nx * w * m, my + ny * w * m, ex, ey); g.quadraticCurveTo(mx - nx * w * m * 0.4, my - ny * w * m * 0.4, a[0], a[1]); g.fill();
  }
  g.restore();
}
// เส้นร้าวแดงแวบรอบจุด (จอ) — เส้นหยักแตกออก · k = ความสว่าง
function crackBurst(g, x, y, R, k, seed, n = 6, lowQ = false) {
  if (k <= 0.01) return;
  const N = lowQ ? Math.ceil(n / 2) : n;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round"; g.lineJoin = "round";
  for (let pass = 0; pass < (lowQ ? 1 : 2); pass++) {
    g.beginPath();
    for (let i = 0; i < N; i++) {
      const R0 = rngOf(seed * 31 + i * 7 + 3);
      let a = (i / N) * TAU + R0() * 0.8, px = x, py = y;
      g.moveTo(px, py);
      const len = R * (0.55 + R0() * 0.6);
      for (let j = 1; j <= 4; j++) {
        a += (R0() - 0.5) * 0.9;
        px += Math.cos(a) * len / 4; py += Math.sin(a) * len / 4 * 0.8;
        g.lineTo(px, py);
      }
    }
    if (pass === 0 && !lowQ) { g.strokeStyle = rgba(RED, 0.4 * k); g.lineWidth = 5; }
    else { g.strokeStyle = rgba(pass ? HOT : RED, k); g.lineWidth = 1.6; }
    g.stroke();
  }
  glow(g, x, y, R * 0.45, RED, 0.5 * k);
  g.restore();
}
// กลีบซากุระ (จอ) · sz = ครึ่งความยาว px · flip = มุมพลิก (−1..1 — ด้านกว้าง) · หน้าสะท้อนแสงตอนหันเต็ม
function petal(g, x, y, sz, rot, flip, rgb, a) {
  if (a <= 0.01 || sz < 0.6) return;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(Math.max(0.18, Math.abs(flip)), 1);
  g.beginPath();
  g.moveTo(0, sz);
  g.bezierCurveTo(sz * 0.95, sz * 0.35, sz * 0.75, -sz * 0.75, sz * 0.2, -sz);
  g.lineTo(0, -sz * 0.7); g.lineTo(-sz * 0.2, -sz);
  g.bezierCurveTo(-sz * 0.75, -sz * 0.75, -sz * 0.95, sz * 0.35, 0, sz);
  g.fillStyle = rgba(rgb, a); g.fill();
  if (flip > 0.72) { g.fillStyle = rgba(WHITE, (flip - 0.72) * 2.2 * a); g.fill(); }
  g.restore();
}
// ใบมีด (มีดสั้นของชิกิ) · x, y = โคนใบ (จอ) · ang = ทิศโคน → ปลาย · L = ความยาวใบ px
function drawKnife(g, x, y, ang, L, a, gl) {
  if (a <= 0.01 || L < 3) return;
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const pt = (u, v) => [x + dx * u * L + nx * v * L, y + dy * u * L + ny * v * L];
  g.save(); g.globalAlpha *= clamp01(a); g.lineJoin = "round"; g.lineCap = "round";
  if (gl > 0) {
    g.globalCompositeOperation = "lighter";
    const c = pt(0.5, 0); glow(g, c[0], c[1], L * 0.85, WHITE, 0.3 * gl); glow(g, c[0], c[1], L * 0.45, BLUE, 0.18 * gl);
    g.globalCompositeOperation = "source-over";
  }
  // ด้ามดำพันด้าย
  const h0 = pt(-0.06, 0), h1 = pt(-0.42, 0);
  g.strokeStyle = "rgb(22,20,28)"; g.lineWidth = Math.max(2, L * 0.13); g.beginPath(); g.moveTo(...h0); g.lineTo(...h1); g.stroke();
  g.strokeStyle = rgba(PINK_D, 0.9); g.lineWidth = Math.max(1, L * 0.03);
  for (const u of [-0.14, -0.24, -0.34]) { g.beginPath(); g.moveTo(...pt(u, -0.05)); g.lineTo(...pt(u + 0.06, 0.05)); g.stroke(); }
  // กระบังเล็ก
  g.strokeStyle = "rgb(60,56,66)"; g.lineWidth = Math.max(1.5, L * 0.06); g.beginPath(); g.moveTo(...pt(-0.04, -0.1)); g.lineTo(...pt(-0.04, 0.1)); g.stroke();
  // ใบ: สันตรง คมโค้งเข้าหาปลาย
  g.beginPath(); g.moveTo(...pt(0, -0.055)); g.lineTo(...pt(0.86, -0.04)); g.lineTo(...pt(1, 0.02)); g.quadraticCurveTo(...pt(0.6, 0.11), ...pt(0, 0.06)); g.closePath();
  const gr = g.createLinearGradient(...pt(0, -0.06), ...pt(0, 0.08));
  gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.45, `rgb(${BLADE})`); gr.addColorStop(1, "#8d96a6");
  g.fillStyle = gr; g.fill(); g.strokeStyle = "rgba(40,44,56,.85)"; g.lineWidth = 1; g.stroke();
  if (gl > 0) { g.globalCompositeOperation = "lighter"; g.strokeStyle = rgba(WHITE, 0.8 * gl); g.lineWidth = 1.2; g.beginPath(); g.moveTo(...pt(0.05, 0.05)); g.quadraticCurveTo(...pt(0.6, 0.1), ...pt(0.98, 0.02)); g.stroke(); }
  g.restore();
}
// มือขวาของหมาก (จอ) — ที่ถือมีด
const handOf = (A) => ({ x: A.bx + A.r * 1.02, y: A.hy + A.r * 0.5, ang: 1.05, L: A.r * 0.95 });

// =================================================================== กองเลือด / ช่องพัง
// กองเลือดบนพื้น (โลก) · k = ขนาด 0..1 · seed = id
function drawPool(g, x, y, n, seed, k, a = 1) {
  if (k <= 0.01 || a <= 0.01) return;
  n = Math.max(1, n | 0);
  const cx = x + n / 2, cy = y + n / 2, R0 = rngOf(strHash(seed) * 13 + x * 977 + y * 131 + 7);
  const R = 0.36 * n * (0.35 + 0.65 * k), M = 16, rr = [];
  for (let i = 0; i < M; i++) rr.push(0.72 + R0() * 0.42);
  const blob = (scale, ox, oy, z) => {
    const pts = rr.map((v, i) => { const an = (i / M) * TAU; return P(cx + ox + Math.cos(an) * R * v * scale, cy + oy + Math.sin(an) * R * v * scale, z); });
    g.beginPath();
    for (let i = 0; i < M; i++) {
      const p = pts[i], q = pts[(i + 1) % M], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      if (i === 0) g.moveTo(mx, my); else g.quadraticCurveTo(p[0], p[1], mx, my);
    }
    const p0 = pts[0], q0 = pts[1]; g.quadraticCurveTo(p0[0], p0[1], (p0[0] + q0[0]) / 2, (p0[1] + q0[1]) / 2);
    g.closePath();
  };
  g.save(); g.globalAlpha *= clamp01(a);
  blob(1.08, 0.03, 0.04, 0); g.fillStyle = "rgba(20,0,4,.35)"; g.fill();
  blob(1, 0, 0, 0.01); g.fillStyle = "rgba(78,3,12,.94)"; g.fill();
  blob(0.7, -0.03, -0.02, 0.012); g.fillStyle = "rgba(128,10,26,.75)"; g.fill();
  blob(0.36, -0.08, -0.07, 0.014); g.fillStyle = "rgba(255,170,184,.13)"; g.fill();
  // หยดรอบกอง
  for (let i = 0; i < 6; i++) {
    const an = R0() * TAU, d = R * (1.15 + R0() * 0.5), p = P(cx + Math.cos(an) * d, cy + Math.sin(an) * d, 0.01);
    g.fillStyle = "rgba(90,4,14,.9)"; g.beginPath(); g.ellipse(p[0], p[1], p[2] * 0.025 * k + 0.6, p[2] * 0.016 * k + 0.4, 0, 0, TAU); g.fill();
  }
  g.restore();
}
// ศพของคนที่ถูกเรียวกิสังหาร (corpse + ryougiSlain) = กองเลือดแทนร่าง · กล่องคลิกเท่าศพปกติ
export function drawBloodCorpse(g, u, now, boxes) {
  const x = u.rx + (u.ox || 0), y = u.ry + (u.oy || 0);
  drawPool(g, x, y, 1, u.id, 1, u.alpha == null ? 1 : u.alpha);
  if (boxes) {
    const [bx, by, s] = P(x + 0.5, y + 0.5);
    boxes.push({ id: u.id, x: u.rx, y: u.ry, d: depthOf(x + 0.5, y + 0.5), x0: bx - s * 0.4, y0: by - s * 0.3, x1: bx + s * 0.4, y1: by + s * 0.2 });
  }
}

// ขอบหลุมของช่องพัง (โลก): ด้านที่ติดช่องพังอีกช่อง = ตรงตามขอบช่อง (ต่อกันเนียน) · ด้านอื่นหยักเข้าด้านใน
const INS = 0.06;
function rimOf(t) {
  if (t._rim) return t._rim;
  const { x, y } = t, c = t.conn || {};
  const L = !c.l, Rr = !c.r, U = !c.u, Dd = !c.d;
  const TL = [x + (L ? INS : 0), y + (U ? INS : 0)], TR = [x + 1 - (Rr ? INS : 0), y + (U ? INS : 0)];
  const BR = [x + 1 - (Rr ? INS : 0), y + 1 - (Dd ? INS : 0)], BL = [x + (L ? INS : 0), y + 1 - (Dd ? INS : 0)];
  const sides = [[TL, TR, U, [0, 1]], [TR, BR, Rr, [-1, 0]], [BR, BL, Dd, [0, -1]], [BL, TL, L, [1, 0]]];
  const pts = [], walls = [];
  sides.forEach(([a, b, jag, nrm], si) => {
    const seg = [a];
    if (jag) {
      const R0 = rngOf(x * 7919 + y * 337 + si * 53 + 11);
      for (let j = 1; j <= 5; j++) {
        const u = (j + (R0() - 0.5) * 0.6) / 6, off = INS * (0.2 + R0() * 1.6);
        seg.push([lerp(a[0], b[0], u) + nrm[0] * off, lerp(a[1], b[1], u) + nrm[1] * off]);
      }
    }
    seg.push(b);
    for (let i = 0; i < seg.length - 1; i++) pts.push(seg[i]);
    if (jag) walls.push(seg);
  });
  t._rim = { pts, walls };
  return t._rim;
}
function pathW(g, pts, z) {
  g.beginPath();
  pts.forEach((p, i) => { const q = P(p[0], p[1], z); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
  g.closePath();
}
function drawChasm(g, t, now, lowQ) {
  const rim = rimOf(t), cx = t.x + 0.5, cy = t.y + 0.5;
  g.save();
  pathW(g, rim.pts, 0);
  g.fillStyle = "#050207"; g.fill();
  g.clip();
  // ผนังด้านใน (ด้านไกลกล้องเห็น — ด้านใกล้ตกนอกขอบถูกตัดทิ้งเอง)
  for (const seg of rim.walls) {
    const top = seg.map((p) => P(p[0], p[1], 0)), bot = seg.map((p) => P(p[0], p[1], -0.5));
    g.beginPath(); top.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    for (let i = bot.length - 1; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]);
    g.closePath();
    const my0 = top.reduce((s, p) => s + p[1], 0) / top.length, my1 = bot.reduce((s, p) => s + p[1], 0) / bot.length;
    const gr = g.createLinearGradient(0, my0, 0, my1);
    gr.addColorStop(0, "rgba(64,42,48,1)"); gr.addColorStop(0.55, "rgba(26,14,20,1)"); gr.addColorStop(1, "rgba(8,3,8,1)");
    g.fillStyle = gr; g.fill();
  }
  // ก้นหลุมเรืองแดงจาง (หายใจช้าๆ)
  const br = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / 1500 + cx * 0.7 + cy * 0.4);
  const b = P(cx, cy, -0.6);
  g.globalCompositeOperation = "lighter";
  glow(g, b[0], b[1], b[2] * 0.8, RED, 0.16 + 0.07 * br);
  if (!lowQ) glow(g, b[0], b[1], b[2] * 0.35, HOT, 0.06 + 0.04 * br);
  g.restore();
  // ขอบหยัก: เงาเข้ม + ขอบสว่างบาง + รอยร้าวเล็กแตกออกไปบนพื้น
  g.save(); g.lineJoin = "round"; g.lineCap = "round";
  for (const seg of rim.walls) {
    g.beginPath(); seg.forEach((p, i) => { const q = P(p[0], p[1], 0.004); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); });
    g.strokeStyle = "rgba(24,14,18,.85)"; g.lineWidth = 2.6; g.stroke();
    g.strokeStyle = "rgba(255,236,228,.16)"; g.lineWidth = 1; g.stroke();
  }
  if (!lowQ) {
    g.strokeStyle = "rgba(30,16,22,.55)"; g.lineWidth = 1;
    rim.walls.forEach((seg, si) => {
      const R0 = rngOf(t.x * 131 + t.y * 71 + si * 17 + 5);
      for (let k = 0; k < 2; k++) {
        const p = seg[1 + Math.floor(R0() * (seg.length - 2))], m = seg[0], n2 = seg[seg.length - 1];
        const ox = -(n2[1] - m[1]), oy = n2[0] - m[0], L = Math.hypot(ox, oy) || 1, len = 0.1 + R0() * 0.14;
        const a = P(p[0], p[1], 0.004), q = P(p[0] - (ox / L) * len + (R0() - 0.5) * 0.08, p[1] - (oy / L) * len + (R0() - 0.5) * 0.08, 0.004);
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(q[0], q[1]); g.stroke();
      }
    });
  }
  g.restore();
}
const chasmOf = (info) => (info ? (info._ryChasm || (info._ryChasm = (info.terrain || []).filter((t) => t.kind === "chasm"))) : []);

// =================================================================== รอยร้าวเนตรมณะ (เครือข่ายเส้นทั่วกระดาน)
//  จุดสุ่มทุกช่อง (บางช่อง 2 จุด + จุดที่ขอบกระดาน) เชื่อมเพื่อนบ้านใกล้สุด 3 จุด → เส้นหยัก หนา/กลาง/บาง · จุดต่อที่เส้นมาชนกันเยอะ = จุดร้อน
const NETS = new Map();
const NET_W = [2.8, 1.7, 0.95];
function jagPts(R0, ax, ay, bx, by, amp) {
  const len = Math.hypot(bx - ax, by - ay), m = Math.max(2, Math.round(len / 0.2)), nx = -(by - ay) / (len || 1), ny = (bx - ax) / (len || 1);
  const pts = [[ax, ay]];
  for (let j = 1; j < m; j++) { const u = j / m, o = (R0() - 0.5) * amp * Math.sin(Math.PI * u) * 2; pts.push([lerp(ax, bx, u) + nx * o, lerp(ay, by, u) + ny * o]); }
  pts.push([bx, by]);
  return { pts, len };
}
function crackNet(cols, rows) {
  const k = `${cols}x${rows}`;
  if (NETS.has(k)) return NETS.get(k);
  const R0 = rngOf(cols * 7919 + rows * 104729 + 17);
  const nodes = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    nodes.push({ x: x + 0.12 + R0() * 0.76, y: y + 0.12 + R0() * 0.76 });
    if (R0() < 0.45) nodes.push({ x: x + 0.12 + R0() * 0.76, y: y + 0.12 + R0() * 0.76 });
  }
  for (let x = 0; x < cols; x++) { if (R0() < 0.55) nodes.push({ x: x + R0(), y: 0 }); if (R0() < 0.55) nodes.push({ x: x + R0(), y: rows }); }
  for (let y = 0; y < rows; y++) { if (R0() < 0.55) nodes.push({ x: 0, y: y + R0() }); if (R0() < 0.55) nodes.push({ x: cols, y: y + R0() }); }
  const bucket = new Map(), bk = (x, y) => `${Math.floor(x)},${Math.floor(y)}`;
  nodes.forEach((n, i) => { const b = bk(n.x, n.y); if (!bucket.has(b)) bucket.set(b, []); bucket.get(b).push(i); });
  const seen = new Set(), edges = [], deg = new Array(nodes.length).fill(0), adj = nodes.map(() => []);
  nodes.forEach((n, i) => {
    const cand = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      for (const j of bucket.get(bk(n.x + dx, n.y + dy)) || []) {
        if (j === i) continue;
        const d = Math.hypot(nodes[j].x - n.x, nodes[j].y - n.y);
        if (d < 1.7) cand.push([d, j]);
      }
    }
    cand.sort((a, b) => a[0] - b[0]);
    const take = 3 + (R0() < 0.25 ? 1 : 0);
    for (const [, j] of cand.slice(0, take)) {
      const id = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const r = R0(), c = r < 0.14 ? 0 : r < 0.45 ? 1 : 2;
      const { pts, len } = jagPts(R0, n.x, n.y, nodes[j].x, nodes[j].y, 0.08);
      const ei = edges.length;
      edges.push({ a: i, b: j, pts, len, c });
      deg[i]++; deg[j]++;
      adj[i].push([j, len, ei]); adj[j].push([i, len, ei]);
    }
  });
  nodes.forEach((n, i) => { n.hot = deg[i] >= 5 || R0() < 0.09; n.hs = 0.6 + R0() * 0.8; n.ph = R0() * TAU; });
  const net = { nodes, edges, adj };
  NETS.set(k, net);
  return net;
}
// ระยะ (ตามเส้น) จากจุดเริ่ม (เท้าเรียวกิ) ไปทุกจุด + เส้นลำต้นหนาจากเท้า 7 เส้น — คำนวณครั้งเดียวต่อเหตุการณ์
function revealOf(e, net, ox, oy) {
  if (e._rev) return e._rev;
  const N = net.nodes.length, dist = new Float64Array(N + 1).fill(Infinity);
  dist[N] = 0;
  const near = net.nodes.map((n, i) => [Math.hypot(n.x - ox, n.y - oy), i]).sort((a, b) => a[0] - b[0]).slice(0, 7);
  const R0 = rngOf(Math.round(ox * 97 + oy * 389) + 3);
  const trunks = near.map(([d, i]) => { const n = net.nodes[i], { pts, len } = jagPts(R0, ox, oy, n.x, n.y, 0.1); return { a: N, b: i, pts, len: Math.max(len, d), c: 0 }; });
  for (const [d, i] of near) dist[i] = Math.min(dist[i], d);
  const done = new Uint8Array(N);
  for (;;) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < N; i++) if (!done[i] && dist[i] < bd) { bd = dist[i]; best = i; }
    if (best < 0) break;
    done[best] = 1;
    for (const [j, len] of net.adj[best]) if (dist[best] + len < dist[j]) dist[j] = dist[best] + len;
  }
  let max = 0;
  for (let i = 0; i < N; i++) if (Number.isFinite(dist[i]) && dist[i] > max) max = dist[i];
  e._rev = { dist, edges: [...trunks, ...net.edges], max: Math.max(1, max) };
  return e._rev;
}
// วาดเครือข่าย · o = { rev?, front (ระยะที่ไล่ถึง · ไม่ใส่ = ทั้งหมด), alpha, lowQ, glowK, now, pulse? }
function strokeNet(g, net, o) {
  const { rev, alpha, lowQ, now } = o, front = o.front == null ? Infinity : o.front;
  if (alpha <= 0.01) return;
  const edges = rev ? rev.edges : net.edges, dist = rev ? rev.dist : null, z = 0.012;
  const tips = [];
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round"; g.lineJoin = "round";
  for (let c = 0; c < 3; c++) {
    g.beginPath();
    let any = false;
    for (const e of edges) {
      if (e.c !== c) continue;
      let u = 1, fwd = true;
      if (dist) {
        const da = dist[e.a], db = dist[e.b], near = Math.min(da, db);
        if (!(front > near)) continue;
        u = clamp01((front - near) / (e.len || 1));
        fwd = da <= db;
      }
      const pts = e.pts, m = pts.length - 1, L = u * m, full = Math.floor(L);
      const at = (i) => pts[fwd ? i : m - i];
      let p = at(0), q = P(p[0], p[1], z);
      g.moveTo(q[0], q[1]);
      for (let i = 1; i <= full; i++) { p = at(i); q = P(p[0], p[1], z); g.lineTo(q[0], q[1]); }
      if (full < m) {
        const a = at(full), b = at(full + 1), f = L - full, r = P(lerp(a[0], b[0], f), lerp(a[1], b[1], f), z);
        g.lineTo(r[0], r[1]);
        if (tips.length < 80) tips.push(r);
      }
      any = true;
    }
    if (!any) continue;
    const w = NET_W[c];
    if (!lowQ) { g.strokeStyle = rgba(RED, 0.2 * alpha * (o.glowK ?? 1)); g.lineWidth = w * 4.6; g.stroke(); }
    g.strokeStyle = rgba(RED, 0.5 * alpha); g.lineWidth = w * 1.9; g.stroke();
    g.strokeStyle = rgba("255,60,84", 0.95 * alpha); g.lineWidth = w; g.stroke();
    if (c === 0) { g.strokeStyle = rgba(HOT, 0.85 * alpha); g.lineWidth = w * 0.38; g.stroke(); }
  }
  // หัวเส้นที่กำลังวิ่ง (ร้อนจัด)
  for (const r of tips) { glow(g, r[0], r[1], r[2] * 0.12, HOT, 0.75 * alpha); }
  // จุดร้อนตรงรอยต่อ
  const N = net.nodes.length;
  for (let i = 0; i < N; i++) {
    const n = net.nodes[i];
    if (!n.hot) continue;
    let k = 1;
    if (dist) { const d = dist[i]; if (!(front >= d)) continue; k = 1 + 1.6 * Math.exp(-(front - d) / 0.7); }
    if (lowQ && i % 2) continue;
    const pul = o.pulse && !REDUCED ? 0.6 + 0.4 * Math.sin(now / 700 + n.ph) : 1;
    const p = P(n.x, n.y, z), R = p[2] * 0.11 * n.hs;
    glow(g, p[0], p[1], R * 2.2, RED, 0.45 * alpha * pul * Math.min(1.6, k));
    glow(g, p[0], p[1], R * 0.9, HOT, 0.7 * alpha * pul * Math.min(1.6, k));
    twinkle(g, p[0], p[1], R * (0.9 + 0.5 * (k - 1)), 0.75 * alpha * pul, i % 3 ? HOT : WHITE);
  }
  g.restore();
}

// =================================================================== ตาเนตรมรณะ / จุดตาย
function drawEye(g, x, y, r, k) {
  if (k <= 0.01) return;
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, x, y, r * 4.2, BLUE, 0.45 * k);
  glow(g, x, y, r * 2, RINGP, 0.35 * k);
  g.globalCompositeOperation = "source-over";
  g.beginPath(); g.ellipse(x, y, r * 1.35, r * 0.82, 0, 0, TAU); g.fillStyle = rgba(BLUE, 0.95 * k); g.fill();
  g.beginPath(); g.arc(x, y, r * 0.62, 0, TAU); g.strokeStyle = rgba(RINGP, k); g.lineWidth = Math.max(1, r * 0.22); g.stroke();
  g.beginPath(); g.arc(x, y, r * 0.3, 0, TAU); g.fillStyle = rgba(INDIGO, k); g.fill();
  g.beginPath(); g.arc(x - r * 0.35, y - r * 0.25, r * 0.16, 0, TAU); g.fillStyle = rgba(WHITE, k); g.fill();
  g.restore();
}
// เส้นแสงพาดจอผ่านตา (anamorphic)
function streak(g, x, y, W, k, rect) {
  if (k <= 0.01) return;
  g.save(); g.globalCompositeOperation = "lighter";
  const x0 = Math.max(rect[0], x - W), x1 = Math.min(rect[0] + rect[2], x + W);
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, rgba(RINGP, 0)); gr.addColorStop(0.35, rgba(RINGP, 0.35 * k)); gr.addColorStop(0.5, rgba(WHITE, 0.95 * k));
  gr.addColorStop(0.65, rgba(BLUE, 0.35 * k)); gr.addColorStop(1, rgba(BLUE, 0));
  g.fillStyle = gr; g.fillRect(x0, y - 1.6, x1 - x0, 3.2);
  g.globalAlpha = 0.35; g.fillRect(x0, y - 5, x1 - x0, 10); g.globalAlpha = 1;
  const vg = g.createLinearGradient(0, y - W * 0.18, 0, y + W * 0.18);
  vg.addColorStop(0, rgba(BLUE, 0)); vg.addColorStop(0.5, rgba(WHITE, 0.7 * k)); vg.addColorStop(1, rgba(BLUE, 0));
  g.fillStyle = vg; g.fillRect(x - 1, y - W * 0.18, 2, W * 0.36);
  g.restore();
}
// จุดตายบนตัวศัตรู (เต้นเป็นจังหวะหัวใจ)
function deathPoints(g, u, id, k, now, lowQ) {
  if (k <= 0.01) return;
  const A = unitBody(u), h = strHash(id), n = 2 + (h % 2);
  const beat = (tm) => { const ph = (tm % 760) / 760; return Math.exp(-ph * 9) + 0.6 * Math.exp(-Math.max(0, ph - 0.22) * 11) * (ph > 0.22 ? 1 : 0); };
  const b = REDUCED ? 0.6 : beat(now + h);
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const an = hash01(h + i * 3.1) * TAU, d = A.r * (0.15 + 0.5 * hash01(h + i * 7.7));
    const x = A.bx + Math.cos(an) * d, y = A.hy + Math.sin(an) * d * 0.9 + (i === 2 ? A.r * 0.9 : 0);
    const R = A.r * (0.13 + 0.05 * i);
    if (!lowQ) crackBurst(g, x, y, A.r * 0.75, 0.55 * k * (0.6 + 0.4 * b), h + i, 5, lowQ);
    glow(g, x, y, R * (3 + 2.5 * b), RED, 0.6 * k);
    g.beginPath(); g.arc(x, y, R * 0.55, 0, TAU); g.fillStyle = rgba(RED, k); g.fill();
    g.beginPath(); g.arc(x, y, R * 0.25, 0, TAU); g.fillStyle = rgba(WHITE, k); g.fill();
    if (!REDUCED) { const ph = ((now + h) % 760) / 760; g.beginPath(); g.arc(x, y, R * (0.8 + 3 * ph), 0, TAU); g.strokeStyle = rgba(RED, 0.8 * (1 - ph) * k); g.lineWidth = 1.6; g.stroke(); }
  }
  g.restore();
}

// =================================================================== ตีปกติ
function strikeGeo(e) {
  const n = Math.max(1, e.size | 0), to = okT(e.to) ? e.to : { x: e.x, y: e.y - 1 }, tn = Math.max(1, e.toSize | 0);
  const ax = e.x + n / 2, ay = e.y + n / 2, bx = to.x + tn / 2, by = to.y + tn / 2;
  let dx = bx - ax, dy = by - ay; const dist = Math.hypot(dx, dy) || 1; dx /= dist; dy /= dist;
  return { n, tn, to, ax, ay, bx, by, dx, dy, dist };
}
// ตำแหน่งตัวผู้ตี (มุมบนซ้าย) ที่เวลา t (0..1) ของฉาก
function slashPos(e, t) {
  const G = strikeGeo(e), reach = Math.max(0.35, G.dist - G.tn * 0.5 - 0.15);
  const W = 0.15, GO = 0.36, HOLD = 0.62, BACK = 0.92;
  let d = 0, hz = 0;
  if (t < W) d = -0.12 * easeOut3(t / W);
  else if (t < GO) { const u = (t - W) / (GO - W); d = lerp(-0.12, reach, easeInOut(u)); hz = 0.1 * Math.sin(Math.PI * u); }
  else if (t < HOLD) d = reach;
  else if (t < BACK) d = lerp(reach, 0, easeInOut((t - HOLD) / (BACK - HOLD)));
  return { x: e.x + G.dx * d, y: e.y + G.dy * d, hz };
}
const L_UP = 0.1, L_TOP = 0.34, L_HANG = 0.44, L_LAND = 0.54, L_STAY = 0.7, L_BACK = 0.86;
function leapPos(e, t) {
  const G = strikeGeo(e), h = G.n / 2;
  const back = G.tn / 2 + 0.55, hx = G.bx + G.dx * back, hy = G.by + G.dy * back, PEAK = 1.5 + 0.3 * (G.tn - 1);
  let cx = G.ax, cy = G.ay, hz = 0;
  if (t < L_UP) hz = 0;
  else if (t < L_TOP) { const u = (t - L_UP) / (L_TOP - L_UP), k = easeInOut(u); cx = lerp(G.ax, G.bx, k); cy = lerp(G.ay, G.by, k); hz = PEAK * Math.sin((Math.PI / 2) * u); }
  else if (t < L_HANG) { cx = G.bx; cy = G.by; hz = PEAK; }
  else if (t < L_LAND) { const u = (t - L_HANG) / (L_LAND - L_HANG); cx = lerp(G.bx, hx, u); cy = lerp(G.by, hy, u); hz = PEAK * (1 - easeIn2(u)); }
  else if (t < L_STAY) { cx = hx; cy = hy; }
  else if (t < L_BACK) { const k = easeInOut((t - L_STAY) / (L_BACK - L_STAY)); cx = lerp(hx, G.ax, k); cy = lerp(hy, G.ay, k); hz = 0.12 * Math.sin(Math.PI * k); }
  return { x: cx - h, y: cy - h, hz };
}
// จุดที่โดน (ช่องในแนว — ไม่มี = ช่องเป้า)
function laneHits(e, G) {
  const lane = Array.isArray(e.lane) ? e.lane.filter(okT).map(ptOf) : [];
  return lane.length ? lane.map((t) => ({ x: t.x, y: t.y, n: 1 })) : [{ x: G.to.x, y: G.to.y, n: G.tn }];
}
function slashFx(g, e, now, lowQ) {
  const D = RYOUGI_MS.ryougiSlash, HIT = RYOUGI_HIT_P.ryougiSlash, t = (now - e.t0) / D;
  if (t <= 0 || t >= 1) return;
  const G = strikeGeo(e), hits = laneHits(e, G);
  g.save(); g.lineCap = "round";
  // ชายกิโมโนชมพูลากตามตอนพุ่ง (ริบบิ้นเรียวจากตำแหน่งก่อนหน้าถึงตัว)
  if (t > 0.15 && t < 0.5) {
    const a = slashPos(e, t), b = slashPos(e, Math.max(0, t - 0.13)), k = env(t, 0.15, 0.22, 0.38, 0.5);
    const pa = P(a.x + G.n / 2, a.y + G.n / 2, 0.35), pb = P(b.x + G.n / 2, b.y + G.n / 2, 0.3);
    if (Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) > 3) {
      const vx = pa[0] - pb[0], vy = pa[1] - pb[1], L = Math.hypot(vx, vy), nx = -vy / L, ny = vx / L, w = pa[2] * 0.2;
      for (const [m, rgb, al] of [[1.4, PINK_D, 0.35], [1, PINK, 0.6], [0.4, SAK, 0.7]]) {
        g.fillStyle = rgba(rgb, al * k);
        g.beginPath(); g.moveTo(pb[0], pb[1]); g.quadraticCurveTo((pa[0] + pb[0]) / 2 + nx * w * m, (pa[1] + pb[1]) / 2 + ny * w * m, pa[0] + nx * w * m * 0.6, pa[1] + ny * w * m * 0.6);
        g.lineTo(pa[0] - nx * w * m * 0.6, pa[1] - ny * w * m * 0.6); g.closePath(); g.fill();
      }
    }
  }
  // เส้นฟันเฉียงทะลุแนว
  if (t >= HIT - 0.06 && t < 0.78) {
    const u = clamp01((t - (HIT - 0.06)) / 0.07), k = t < HIT + 0.12 ? 1 : 1 - (t - HIT - 0.12) / (0.78 - HIT - 0.12);
    const pts = hits.map((h) => { const B = bodyAt(h.x, h.y, h.n); return [B.bx, B.hy + B.r * 0.2, B.r]; });
    const first = pts[0], last = pts[pts.length - 1], r = Math.max(...pts.map((p) => p[2]));
    const mx = (first[0] + last[0]) / 2, my = (first[1] + last[1]) / 2;
    const span = Math.hypot(last[0] - first[0], last[1] - first[1]) + r * 3.2, ang = Math.atan2(last[1] - first[1], last[0] - first[0]) - 0.62;
    const cs = Math.cos(ang), sn = Math.sin(ang);
    const a = [mx - cs * span / 2, my - sn * span / 2 - r * 0.4], b = [mx + cs * span / 2, my + sn * span / 2 + r * 0.4];
    bladeLine(g, a, b, r * 0.12, k, u);
  }
  // รอยร้าวแดงแวบที่จุดโดน
  if (t >= HIT) {
    const q = (t - HIT) / 0.3;
    if (q < 1) hits.forEach((h, i) => { const B = bodyAt(h.x, h.y, h.n); crackBurst(g, B.bx, B.hy + B.r * 0.2, B.r * 1.1, 1 - q, 41 + i * 9, 7, lowQ); });
  }
  g.restore();
}
function leapFx(g, e, now, lowQ) {
  const D = RYOUGI_MS.ryougiLeap, HIT = RYOUGI_HIT_P.ryougiLeap, t = (now - e.t0) / D;
  if (t <= 0 || t >= 1) return;
  const G = strikeGeo(e), B = bodyAt(G.to.x, G.to.y, G.tn), hits = laneHits(e, G);
  g.save(); g.lineCap = "round";
  // ฝุ่นตอนกระโดด
  if (t > L_UP - 0.02 && t < L_UP + 0.2) groundRing(g, G.ax, G.ay, 0.3 + 0.6 * easeOut3((t - L_UP) / 0.2), PINK, 0.6 * (1 - (t - L_UP) / 0.2), 2);
  // ฟันแนวตั้งกลางอากาศ
  if (t >= HIT - 0.04 && t < 0.62) {
    const u = clamp01((t - (HIT - 0.04)) / 0.05), k = t < HIT + 0.08 ? 1 : 1 - (t - HIT - 0.08) / (0.62 - HIT - 0.08);
    bladeLine(g, [B.bx + B.r * 0.15, B.hy - B.r * 2.6], [B.bx - B.r * 0.15, B.by + B.s * 0.2], B.r * 0.13, k, u);
  }
  // ฟันแนวนอนซ้ำ (หลังเป้า)
  if (t >= LEAP_HIT2 - 0.04 && t < 0.86) {
    const u = clamp01((t - (LEAP_HIT2 - 0.04)) / 0.05), k = t < LEAP_HIT2 + 0.08 ? 1 : 1 - (t - LEAP_HIT2 - 0.08) / (0.86 - LEAP_HIT2 - 0.08);
    const side = G.dx >= 0 ? 1 : -1;
    bladeLine(g, [B.bx + side * B.r * 2.2, B.hy + B.r * 0.1], [B.bx - side * B.r * 2.2, B.hy + B.r * 0.35], B.r * 0.13, k, u);
  }
  for (const [h0, sd] of [[HIT, 7], [LEAP_HIT2, 23]]) {
    if (t < h0) continue;
    const q = (t - h0) / 0.24;
    if (q < 1) hits.forEach((h, i) => { const H = bodyAt(h.x, h.y, h.n); crackBurst(g, H.bx, H.hy + H.r * 0.2, H.r * 1.1, 1 - q, sd + i * 5, 7, lowQ); });
  }
  // กลีบซากุระตามทางพุ่งกลับ
  if (t > L_STAY) {
    const N = lowQ ? 6 : 14;
    for (let i = 0; i < N; i++) {
      const born = L_STAY + (i / N) * (L_BACK - L_STAY);
      if (t < born) continue;
      const q = (t - born) / 0.3;
      if (q >= 1) continue;
      const p = leapPos(e, born), w = P(p.x + G.n / 2 + (hash01(i) - 0.5) * 0.5, p.y + G.n / 2 + (hash01(i + 5) - 0.5) * 0.5, 0.4 + hash01(i + 9) * 0.6 - q * 0.3);
      petal(g, w[0], w[1], w[2] * 0.07, i + q * 4, Math.cos(i * 1.7 + q * 6), i % 2 ? SAK : SAK2, 0.9 * (1 - q));
    }
  }
  g.restore();
}

// =================================================================== เหตุการณ์
// ไท่จี๋ลายพู่กัน (พื้น) — วาดในวงกลมหน่วย แล้วแปลงลงพื้นตามมุมกล้อง
function groundFrame(cx, cy, R) {
  const ax = viewAxes(), c = P(cx, cy, 0.02), far = P(cx - ax.fx * R, cy - ax.fy * R, 0.02), near = P(cx + ax.fx * R, cy + ax.fy * R, 0.02), rt = P(cx + ax.rx * R, cy + ax.ry * R, 0.02);
  return { x: c[0], y: (far[1] + near[1]) / 2, rx: Math.hypot(rt[0] - c[0], rt[1] - c[1]), ry: Math.abs(near[1] - far[1]) / 2 };
}
function taiji(g, cx, cy, R, rot, a) {
  if (a <= 0.01) return;
  const F = groundFrame(cx, cy, R);
  g.save(); g.translate(F.x, F.y); g.scale(F.rx, F.ry); g.rotate(rot); g.globalAlpha *= clamp01(a);
  g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fillStyle = "rgba(250,247,240,.92)"; g.fill();
  g.beginPath(); g.arc(0, 0, 1, -Math.PI / 2, Math.PI / 2); g.arc(0, 0.5, 0.5, Math.PI / 2, Math.PI * 1.5); g.arc(0, -0.5, 0.5, Math.PI / 2, -Math.PI / 2, true); g.closePath();
  g.fillStyle = "rgba(16,14,20,.94)"; g.fill();
  g.beginPath(); g.arc(0, 0.5, 0.14, 0, TAU); g.fillStyle = "rgba(250,247,240,.95)"; g.fill();
  g.beginPath(); g.arc(0, -0.5, 0.14, 0, TAU); g.fillStyle = "rgba(16,14,20,.95)"; g.fill();
  // ขอบลายพู่กัน: เส้นหมึกขาดๆ ซ้อนหลายชั้น
  g.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const a0 = hash01(i * 3.3) * TAU, span = 1.4 + hash01(i * 5.1) * 2.4, rr = 1.02 + i * 0.035;
    g.beginPath(); g.arc(0, 0, rr, a0, a0 + span); g.strokeStyle = `rgba(16,14,20,${0.75 - i * 0.15})`; g.lineWidth = (0.09 - i * 0.017); g.stroke();
  }
  g.restore();
}
function yinyangGround(g, e, t) {
  const n = Math.max(1, e.size | 0), cx = e.x + n / 2, cy = e.y + n / 2, BU = RYOUGI_FX.yinyangBurst;
  if (t > BU + 260) return;
  const s = t < 200 ? easeOut3(t / 200) : t < BU ? 1 : 1 + 0.5 * easeOut3((t - BU) / 260);
  const a = t < BU ? 1 : 1 - (t - BU) / 260;
  taiji(g, cx, cy, 0.62 * n * s, -(REDUCED ? 0 : t / 260), a);
}
function yinyangFx(g, e, t, now, lowQ) {
  const n = Math.max(1, e.size | 0), cx = e.x + n / 2, cy = e.y + n / 2, BU = RYOUGI_FX.yinyangBurst, A = bodyAt(e.x, e.y, n);
  g.save(); g.globalCompositeOperation = "lighter";
  if (t >= BU) {
    const q = (t - BU) / (RYOUGI_FX_DUR.ryougiYinyang - BU);
    if (q < 0.4) glow(g, A.bx, A.by, A.r * 3.2, GREEN, 0.6 * (1 - q / 0.4));
    groundRing(g, cx, cy, 0.5 * n + 1.1 * n * easeOut3(q), GREEN, 0.8 * (1 - q), 2.5 * (1 - q) + 1);
    // แสงเขียวอ่อน + กลีบลอยขึ้น
    const N = lowQ ? 8 : 18;
    for (let i = 0; i < N; i++) {
      const u = clamp01(q * 1.25 - hash01(i + 3) * 0.25);
      if (u <= 0 || u >= 1) continue;
      const an = hash01(i) * TAU, rr = 0.25 * n + 0.35 * n * u, p = P(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr, 0.1 + u * 1.6 * n);
      if (i % 3 === 0) petal(g, p[0], p[1], p[2] * 0.06, an + u * 5, Math.cos(i + u * 7), SAK, 0.85 * Math.sin(Math.PI * u));
      else { glow(g, p[0], p[1], p[2] * 0.08, GREEN, 0.8 * Math.sin(Math.PI * u)); twinkle(g, p[0], p[1], p[2] * 0.05, 0.8 * Math.sin(Math.PI * u), GREEN_L); }
    }
  } else if (t > 150) {
    // เส้นพลังวนก่อนแตก
    glow(g, A.bx, A.by - A.s * 0.05, A.r * 1.6, WHITE, 0.15 * (t / BU));
  }
  g.restore();
}
// ---------- เนตรมณะ (ฉากใหญ่) ----------
function eyesFx(g, e, t, now, lowQ, ctx) {
  const F = RYOUGI_FX, D = RYOUGI_FX_DUR.ryougiEyes, n = Math.max(1, e.size | 0);
  const rect = viewRect(ctx.view);
  const me = (ctx.units || []).find((u) => u.id === e.id && !u.corpse);
  const A = me ? unitBody(me) : bodyAt(e.x, e.y, n), ox = me ? me.rx + (me.ox || 0) + n / 2 : e.x + n / 2, oy = me ? me.ry + (me.oy || 0) + n / 2 : e.y + n / 2;
  // จอมืดลงเร็ว → ค้าง → จางลงเหลือชั้นค้าง (drawRyougiGround)
  const dk = t < F.eyesDark ? easeOut3(t / F.eyesDark) : t < F.eyesFade ? 1 : 1 - easeInOut(clamp01((t - F.eyesFade) / (D - F.eyesFade)));
  g.save();
  g.fillStyle = rgba("6,2,10", 0.76 * dk); g.fillRect(...rect);
  if (!lowQ) {
    const cx = rect[0] + rect[2] / 2, cy = rect[1] + rect[3] / 2, R = Math.hypot(rect[2], rect[3]) / 2;
    const vg = g.createRadialGradient(cx, cy, R * 0.35, cx, cy, R);
    vg.addColorStop(0, "rgba(40,0,8,0)"); vg.addColorStop(1, rgba("40,0,8", 0.55 * dk));
    g.fillStyle = vg; g.fillRect(...rect);
  }
  g.restore();
  // รอยร้าวแดงแตกกิ่งจากเท้าไล่ทั่วทุกช่อง
  const info = ctx.info;
  if (info && t >= F.eyesCrack) {
    const net = crackNet(info.cols, info.rows), rev = revealOf(e, net, ox, oy);
    const front = ((t - F.eyesCrack) / F.eyesSpread) * rev.max;
    const al = t < F.eyesFade ? 1 : 1 - 0.8 * easeInOut(clamp01((t - F.eyesFade) / (D - F.eyesFade)));
    strokeNet(g, net, { rev, front, alpha: al, lowQ, now, glowK: 1.3 });
    // วาบที่เท้าตอนรอยร้าวเริ่ม
    const q = (t - F.eyesCrack) / 600;
    if (q < 1) {
      g.save(); g.globalCompositeOperation = "lighter";
      groundRing(g, ox, oy, 0.4 * n + 2.4 * easeOut3(q), RED, 0.9 * (1 - q), 3 * (1 - q) + 1);
      glow(g, A.bx, A.by, A.r * (2 + 3 * q), RED, 0.5 * (1 - q));
      g.restore();
    }
  }
  // เรียวกิเด่นกลางความมืด
  if (me && ctx.redraw && dk > 0.05) ctx.redraw({ ...me, alpha: Math.min(1, dk) * (me.alpha == null ? 1 : me.alpha) });
  // จุดตายบนศัตรูทุกคน
  if (t >= F.eyesPoints && Array.isArray(e.foes)) {
    const k = env(t, F.eyesPoints, F.eyesPoints + 200, D - 380, D);
    for (const id of e.foes) { const u = (ctx.units || []).find((it) => it.id === id && !it.corpse); if (u) deathPoints(g, u, id, k, now, lowQ); }
  }
  // ตาวาบฟ้าวงชมพู 2 จุด + เส้นแสง
  const gk = env(t, F.eyesGlint - 160, F.eyesGlint, F.eyesGlint + 260, F.eyesGlint + 900);
  if (gk > 0) {
    const ex = A.r * 0.2, ey = A.hy - A.r * 0.12, er = A.r * 0.085 * (1 + 0.3 * gk);
    drawEye(g, A.bx - ex, ey, er, gk); drawEye(g, A.bx + ex, ey, er, gk);
    streak(g, A.bx, ey, rect[2] * (0.25 + 0.4 * gk), gk, rect);
    if (!lowQ) { g.save(); g.globalCompositeOperation = "lighter"; twinkle(g, A.bx - ex, ey, A.r * 0.6 * gk, gk, WHITE); twinkle(g, A.bx + ex, ey, A.r * 0.6 * gk, gk, BLUE); g.restore(); }
  }
}
// ---------- รากฐานจิต ----------
function mindFx(g, e, t, now, lowQ, ctx) {
  const n = Math.max(1, e.size | 0), me = (ctx.units || []).find((u) => u.id === e.id && !u.corpse);
  const A = me ? unitBody(me) : bodyAt(e.x, e.y, n), H = handOf(A), D = RYOUGI_FX_DUR.ryougiMind, q = t / D;
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  // วาบที่มือ (ใบมีดปรากฏ)
  const fk = env(t, 0, 90, 220, 520);
  if (fk > 0) { glow(g, H.x, H.y, A.r * 1.6, WHITE, 0.7 * fk); twinkle(g, H.x + Math.cos(H.ang) * H.L * 0.5, H.y + Math.sin(H.ang) * H.L * 0.5, A.r * 0.9 * fk, fk); }
  // เส้นขาวบางวนรอบตัว
  for (let i = 0; i < 3; i++) {
    const u = clamp01((q - i * 0.08) / 0.75);
    if (u <= 0 || u >= 1) continue;
    const cy = A.hy + A.r * (0.9 - i * 0.75), rx = A.r * (1.35 + 0.15 * i), ry = A.r * 0.32, rot = (REDUCED ? 0 : now / 300) + i * 2.1;
    const span = TAU * 0.85 * easeOut3(u), k = Math.sin(Math.PI * u);
    g.beginPath(); g.ellipse(A.bx, cy, rx, ry, 0, rot, rot + span); g.strokeStyle = rgba(WHITE, 0.85 * k); g.lineWidth = 1.3; g.stroke();
    if (!lowQ) { g.strokeStyle = rgba(BLUE, 0.25 * k); g.lineWidth = 4; g.stroke(); }
  }
  g.restore();
}
// ---------- ตัดผลสกิล (รอจังหวะปะทะ) ----------
function severFx(g, e, now, lowQ) {
  const gate = e.gate && Number.isFinite(e.gate.at) ? e.gate.at : null;
  if (gate == null || now < gate || !okT(e.to)) return;
  const t = now - gate, q = t / SEVER_MS;
  if (q >= 1) return;
  const B = bodyAt(e.to.x, e.to.y, e.tsize), cut = RYOUGI_FX.severCut;
  g.save(); g.lineCap = "round";
  const ang = -0.75, cs = Math.cos(ang), sn = Math.sin(ang), L = B.r * 2.6, cx = B.bx, cy = B.hy + B.r * 0.2;
  // ออร่าแตกเป็นสองซีก (ครึ่งวงลอยห่างออกตามแนวตั้งฉากกับรอยตัด)
  const ak = t < cut ? t / cut : 1 - clamp01((t - cut) / (SEVER_MS * 0.7));
  if (ak > 0) {
    const sp = t < cut ? 0 : easeOut3(clamp01((t - cut) / 400)) * B.r * 0.7;
    g.save(); g.globalCompositeOperation = "lighter";
    for (const s of [1, -1]) {
      const ox = -sn * sp * s, oy = cs * sp * s;
      g.beginPath(); g.ellipse(cx + ox, cy + oy, B.r * 1.45, B.r * 1.25, 0, ang + (s > 0 ? 0 : Math.PI), ang + (s > 0 ? Math.PI : TAU));
      g.strokeStyle = rgba(BLUE, 0.75 * ak); g.lineWidth = 2.4; g.stroke();
      if (!lowQ) { g.strokeStyle = rgba(WHITE, 0.25 * ak); g.lineWidth = 7; g.stroke(); }
    }
    g.restore();
  }
  // เส้นขาวผ่ากลาง
  const u = clamp01(t / cut), k = t < cut + 120 ? 1 : 1 - clamp01((t - cut - 120) / 300);
  bladeLine(g, [cx - cs * L, cy - sn * L], [cx + cs * L, cy + sn * L], B.r * 0.12, k, u, BLUE);
  // ชิ้นแสงแตกกระจาย
  if (t >= cut) {
    const s = (t - cut) / (SEVER_MS - cut), N = lowQ ? 8 : 18;
    g.save(); g.globalCompositeOperation = "lighter";
    if (s < 0.3) glow(g, cx, cy, B.r * 2.2, WHITE, 0.7 * (1 - s / 0.3));
    for (let i = 0; i < N; i++) {
      const an = hash01(i * 2.3 + 1) * TAU, d = B.r * (0.5 + 2 * easeOut3(s) * (0.5 + hash01(i))), sz = B.r * (0.08 + 0.06 * hash01(i + 4)) * (1 - s * 0.5);
      const px = cx + Math.cos(an) * d, py = cy + Math.sin(an) * d * 0.8 + s * s * B.r * 0.8, rot = an + s * 6;
      g.fillStyle = rgba(i % 3 ? WHITE : BLUE, 1 - s);
      g.beginPath(); g.moveTo(px + Math.cos(rot) * sz * 1.5, py + Math.sin(rot) * sz * 1.5); g.lineTo(px - Math.sin(rot) * sz * 0.5, py + Math.cos(rot) * sz * 0.5);
      g.lineTo(px - Math.cos(rot) * sz, py - Math.sin(rot) * sz); g.lineTo(px + Math.sin(rot) * sz * 0.5, py - Math.cos(rot) * sz * 0.5); g.closePath(); g.fill();
    }
    g.restore();
  }
  g.restore();
}
// ---------- ดับสิ้นซะ: พุ่ง ----------
function dashGeo(e) {
  const n = Math.max(1, e.size | 0), from = okT(e.from) ? e.from : { x: e.x, y: e.y }, to = okT(e.to) ? e.to : from;
  const v = DIRV[e.dir] || [Math.sign(to.x - from.x), Math.sign(to.y - from.y)];
  const tiles = Array.isArray(e.tiles) ? e.tiles.filter(okT) : [];
  const last = tiles.length ? tiles[tiles.length - 1] : to;
  const sx = from.x + n / 2, sy = from.y + n / 2, ex = last.x + 0.5 + v[0] * 0.5, ey = last.y + 0.5 + v[1] * 0.5;
  return { n, from, to, v, sx, sy, ex, ey };
}
function dashK(t) { const F = RYOUGI_FX; return t < F.dashGo ? 0 : t < F.dashArrive ? easeInOut((t - F.dashGo) / (F.dashArrive - F.dashGo)) : 1; }
function dashGround(g, e, t, now) {
  if (t > DASH_DRAW) return;
  const G = dashGeo(e), F = RYOUGI_FX, k = dashK(t);
  // เส้นตัดขาวบนพื้น (ยาวตามตัว → เต็มแนวตอนถึง)
  const reachEnd = t >= F.dashArrive ? 1 : k;
  const ex = lerp(G.sx, G.ex, reachEnd), ey = lerp(G.sy, G.ey, reachEnd);
  if (reachEnd > 0.01) {
    const a = P(G.sx, G.sy, 0.015), b = P(ex, ey, 0.015), fl = REDUCED ? 1 : 0.85 + 0.15 * Math.sin(now / 40);
    const hot = t < F.dashArrive ? 1 : 0.7 + 0.3 * clamp01((t - F.dashArrive) / (DASH_DRAW - F.dashArrive - 100));
    const fade = t < DASH_DRAW - 120 ? 1 : (DASH_DRAW - t) / 120;
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    g.strokeStyle = rgba(PINK, 0.35 * fade * hot); g.lineWidth = a[2] * 0.09; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.strokeStyle = rgba(WHITE, 0.95 * fade * fl); g.lineWidth = Math.max(1.4, a[2] * 0.025); g.stroke();
    // รอยร้าวแดงขนเส้น (ก่อนพัง)
    if (t > F.dashArrive) {
      const q = clamp01((t - F.dashArrive) / 500), R0 = rngOf(Math.round(G.sx * 31 + G.sy * 17) + 9), len = Math.hypot(G.ex - G.sx, G.ey - G.sy);
      g.beginPath();
      for (let i = 0; i < Math.round(len * 2.2); i++) {
        const u = R0(), px = lerp(G.sx, G.ex, u), py = lerp(G.sy, G.ey, u), side = R0() < 0.5 ? -1 : 1, l = (0.12 + R0() * 0.3) * q;
        const p0 = P(px, py, 0.015), p1 = P(px - G.v[1] * side * l + (R0() - 0.5) * 0.1, py + G.v[0] * side * l + (R0() - 0.5) * 0.1, 0.015);
        g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
      }
      g.strokeStyle = rgba(RED, 0.8 * q * fade); g.lineWidth = 1.2; g.stroke();
    }
    g.restore();
  }
}
function dashFx(g, e, t, now, lowQ) {
  if (t > DASH_DRAW) return;
  const G = dashGeo(e), F = RYOUGI_FX, A0 = bodyAt(G.from.x, G.from.y, G.n);
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  // ชาร์จ: แสงชมพูรวมเข้าตัว
  if (t < F.dashGo + 60) {
    const q = clamp01(t / F.dashGo);
    glow(g, A0.bx, A0.hy, A0.r * (2.6 - 1.2 * q), PINK, 0.5 * q);
    for (let i = 0; i < (lowQ ? 4 : 9); i++) {
      const an = hash01(i + 1) * TAU, d = A0.r * 2.4 * (1 - q);
      twinkle(g, A0.bx + Math.cos(an) * d, A0.hy + Math.sin(an) * d * 0.7, A0.r * 0.18, q, i % 2 ? SAK : WHITE);
    }
  }
  // เส้นความเร็วรอบตัวขณะพุ่ง
  if (t > F.dashGo && t < F.dashArrive + 200 && !lowQ) {
    const k = dashK(t), hx = lerp(G.from.x, G.to.x, k) + G.n / 2, hy = lerp(G.from.y, G.to.y, k) + G.n / 2, al = env(t, F.dashGo, F.dashGo + 60, F.dashArrive, F.dashArrive + 200);
    for (let i = 0; i < 14; i++) {
      const off = (hash01(i + 1) - 0.5) * G.n * 1.3, z = 0.15 + hash01(i + 5) * 1.1, len = 0.8 + hash01(i + 9) * 1.8, back = 0.3 + hash01(i + 13) * 1.2;
      const x0 = hx - G.v[0] * back - G.v[1] * off, y0 = hy - G.v[1] * back + G.v[0] * off;
      const p0 = P(x0, y0, z), p1 = P(x0 - G.v[0] * len, y0 - G.v[1] * len, z);
      g.strokeStyle = rgba(i % 3 ? WHITE : SAK, 0.8 * al); g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    }
  }
  // ถึงปลายทาง: คลื่นลม + วาบ
  const wq = (t - F.dashArrive) / 380;
  if (wq > 0 && wq < 1) {
    const B = bodyAt(G.to.x, G.to.y, G.n);
    groundRing(g, G.to.x + G.n / 2, G.to.y + G.n / 2, 0.4 * G.n + 0.9 * easeOut3(wq), WHITE, 0.8 * (1 - wq), 2.5);
    if (wq < 0.4) glow(g, B.bx, B.hy, B.r * 2.4, PINK, 0.5 * (1 - wq / 0.4));
  }
  g.restore();
}
// ---------- ขโมยแต้มสกิล ----------
function bez(p0, pc, p1, u) { const v = 1 - u; return [v * v * p0[0] + 2 * v * u * pc[0] + u * u * p1[0], v * v * p0[1] + 2 * v * u * pc[1] + u * u * p1[1]]; }
function stealFx(g, e, t, now, lowQ, ctx) {
  if (!okT(e.from)) return;
  const n = Math.max(1, e.size | 0), me = (ctx.units || []).find((u) => u.id === e.id && !u.corpse);
  const A = me ? unitBody(me) : bodyAt(e.x, e.y, n), S = bodyAt(e.from.x, e.from.y, e.fromSize || 1);
  const N = Math.max(1, Math.min(4, e.amt | 0 || 1)), FLY = 700;
  g.save(); g.globalCompositeOperation = "lighter";
  let absorb = 0;
  for (let i = 0; i < N; i++) {
    const st = 60 + i * 120, u = clamp01((t - st) / FLY);
    if (u <= 0) continue;
    if (u >= 1) { absorb = Math.max(absorb, 1 - clamp01((t - st - FLY) / 360)); continue; }
    const side = i % 2 ? 1 : -1, x0 = S.bx + side * S.r * 0.3, y0 = S.hy;
    const ctrl = [(x0 + A.bx) / 2 + side * A.r * 0.8, Math.min(y0, A.hy) - A.r * (1.3 + 0.3 * i)];
    const p = bez([x0, y0], ctrl, [A.bx, A.hy], easeInOut(u)), rs = A.s * 0.13;
    if (!lowQ) for (let j = 1; j <= 4; j++) { const pj = bez([x0, y0], ctrl, [A.bx, A.hy], easeInOut(Math.max(0, u - j * 0.04))); g.fillStyle = rgba(j % 2 ? RINGP : BLUE, 0.45 * (1 - j / 5)); g.beginPath(); g.arc(pj[0], pj[1], rs * (1 - j / 6) * 0.6, 0, TAU); g.fill(); }
    glow(g, p[0], p[1], rs * 2.8, i % 2 ? RINGP : BLUE, 0.65);
    g.fillStyle = rgba(WHITE, 1); g.beginPath(); g.arc(p[0], p[1], rs * 0.55, 0, TAU); g.fill();
  }
  if (absorb > 0) glow(g, A.bx, A.hy, A.r * 1.8, BLUE, 0.55 * absorb);
  g.restore();
}
// ---------- ดับสิ้นซะ: พื้นพังทลาย ----------
const tileT = (e, i) => RYOUGI_FX.crumbleCut + i * RYOUGI_FX.crumbleStep;
// ก้อนพื้น 5 ก้อนต่อช่อง (สุ่มคงที่ตามช่อง)
function chunksOf(x, y) {
  const R0 = rngOf(x * 613 + y * 1291 + 29), c = [x + 0.35 + R0() * 0.3, y + 0.35 + R0() * 0.3];
  const ring = [[x, y], [x + 0.3 + R0() * 0.4, y], [x + 1, y], [x + 1, y + 0.3 + R0() * 0.4], [x + 1, y + 1], [x + 0.3 + R0() * 0.4, y + 1], [x, y + 1], [x, y + 0.3 + R0() * 0.4]];
  const out = [];
  for (let i = 0; i < 8; i += 2) out.push([c, ring[i], ring[i + 1], ring[(i + 2) % 8]]);
  out.splice(1, 1, [c, ring[2], ring[3]], [c, ring[3], ring[4]]);
  return out.map((poly) => ({ poly, mx: poly.reduce((s, p) => s + p[0], 0) / poly.length, my: poly.reduce((s, p) => s + p[1], 0) / poly.length, d: R0() * 120, sp: R0() }));
}
function crumbleGround(g, e, t, now, lowQ, C) {
  const tiles = Array.isArray(e.tiles) ? e.tiles : [], v = DIRV[e.dir] || [1, 0];
  const fill = (C && (C.ground1 || C.path)) || "#8c8a7c";
  tiles.forEach((tl, i) => {
    const tt = t - tileT(e, i);
    if (tt < 0 || tt > RYOUGI_FX.crumbleFall + 140) return;
    // ก้อนพื้นร่วงลงหลุม
    for (const ch of chunksOf(tl.x, tl.y)) {
      const q = clamp01((tt - ch.d * 0.6) / (RYOUGI_FX.crumbleFall - 60));
      const z = -1.2 * easeIn2(q) - 0.02, dx = (ch.mx - tl.x - 0.5) * 0.25 * q, dy = (ch.my - tl.y - 0.5) * 0.25 * q, a = 1 - q * q;
      if (a <= 0.02) continue;
      g.beginPath();
      ch.poly.forEach((p, j) => { const sh = 0.86 + 0.14 * (1 - q); const w = P(ch.mx + (p[0] - ch.mx) * sh + dx, ch.my + (p[1] - ch.my) * sh + dy, z); if (j) g.lineTo(w[0], w[1]); else g.moveTo(w[0], w[1]); });
      g.closePath();
      g.fillStyle = fill; g.globalAlpha = a; g.fill();
      g.fillStyle = rgba("10,4,8", 0.25 + 0.55 * q); g.fill();
      g.strokeStyle = "rgba(20,10,14,.8)"; g.lineWidth = 1; g.stroke();
      g.globalAlpha = 1;
    }
    // เส้นตัดขาววาบผ่านช่อง
    if (tt < 200) {
      const k = 1 - tt / 200, a = P(tl.x + 0.5 - v[0] * 0.6, tl.y + 0.5 - v[1] * 0.6, 0.02), b = P(tl.x + 0.5 + v[0] * 0.6, tl.y + 0.5 + v[1] * 0.6, 0.02);
      g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
      g.strokeStyle = rgba(PINK, 0.5 * k); g.lineWidth = a[2] * 0.08; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      g.strokeStyle = rgba(WHITE, k); g.lineWidth = 2; g.stroke();
      g.restore();
    }
  });
}
// ช่องที่ยังไม่ถึงจังหวะพังของฉาก (วาดเป็นพื้นปกติไปก่อน)
function pendingChasm(fx, now) {
  let set = null;
  for (const e of fx) {
    if (!e || e.kind !== "ryougiCrumble" || !Array.isArray(e.tiles)) continue;
    const t = now - e.t0;
    e.tiles.forEach((tl, i) => { if (t < tileT(e, i)) (set || (set = new Set())).add(`${tl.x},${tl.y}`); });
  }
  return set;
}
function crumbleFx(g, e, t, now, lowQ, ctx) {
  const tiles = Array.isArray(e.tiles) ? e.tiles : [];
  const idx = (x, y) => { const i = tiles.findIndex((tl) => tl.x === x && tl.y === y); return i < 0 ? tiles.length : i; };
  // ของที่พัง (สิ่งกีดขวาง / ร้านค้า): แยกเป็นสองซีกร่วงแล้วหาย
  const broken = [...(Array.isArray(e.razed) ? e.razed.filter(okT).map((r) => ({ ...r, shop: false })) : []), ...(okT(e.shop) ? [{ x: e.shop.x, y: e.shop.y, shop: true }] : [])];
  for (const r of broken) {
    const tt = t - tileT(e, idx(r.x, r.y)), q = clamp01(tt / 620);
    if (q >= 1) continue;
    const [bx, by] = P(r.x + 0.5, r.y + 0.5);
    const draw = () => (r.shop ? ctx.drawShop && ctx.drawShop(r.x, r.y) : drawObstacle(g, { x: r.x, y: r.y, kind: r.kind || "rock", conn: {} }, ctx.octx || {}, now));
    if (tt < 0) { g.save(); draw(); g.restore(); continue; }
    for (const s of [-1, 1]) {
      g.save();
      g.beginPath(); g.rect(s < 0 ? bx - 400 : bx, by - 600, 400, 800); g.clip();
      g.globalAlpha = 1 - easeIn2(q);
      g.translate(s * 14 * easeOut3(q), 26 * easeIn2(q)); g.translate(bx, by); g.rotate(s * 0.25 * q); g.translate(-bx, -by);
      draw();
      g.restore();
    }
    if (q < 0.25) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, bx, by - 20, 40, WHITE, 0.6 * (1 - q / 0.25)); g.restore(); }
  }
  // ฝุ่นฟุ้งตามแนว
  g.save();
  tiles.forEach((tl, i) => {
    const tt = t - tileT(e, i);
    if (tt < 0) return;
    for (let j = 0; j < (lowQ ? 2 : 4); j++) {
      const u = clamp01((tt - j * 60) / 900);
      if (u <= 0 || u >= 1) continue;
      const an = hash01(i * 7 + j) * TAU, p = P(tl.x + 0.5 + Math.cos(an) * 0.4 * (0.5 + u), tl.y + 0.5 + Math.sin(an) * 0.4 * (0.5 + u), 0.1 + u * 0.6);
      glow(g, p[0], p[1], p[2] * (0.16 + 0.22 * u), j % 2 ? "196,170,176" : "160,140,150", 0.32 * (1 - u));
    }
  });
  g.restore();
  // ปลายแนว: วาบชมพูตอนเรียวกิตั้งหลัก
  if (okT(e.land) && t < 500) {
    const B = bodyAt(e.land.x, e.land.y, e.size);
    g.save(); g.globalCompositeOperation = "lighter"; groundRing(g, B.cx, B.cy, 0.4 + 0.8 * easeOut3(t / 500), PINK, 0.7 * (1 - t / 500), 2); g.restore();
  }
}
// ---------- หลังดับสิ้นซะ: ซากุระระเบิดออก ----------
function bloomFx(g, e, t, now, lowQ, ctx) {
  const n = Math.max(1, e.size | 0), me = (ctx.units || []).find((u) => u.id === e.id && !u.corpse);
  const A = me ? unitBody(me) : bodyAt(e.x, e.y, n), cx = me ? me.rx + n / 2 : e.x + n / 2, cy = me ? me.ry + n / 2 : e.y + n / 2;
  const D = RYOUGI_FX_DUR.ryougiBloom, q = t / D;
  g.save(); g.globalCompositeOperation = "lighter";
  if (t < 380) { glow(g, A.bx, A.hy, A.r * (1.5 + 3 * t / 380), SAK2, 0.6 * (1 - t / 380)); groundRing(g, cx, cy, 0.4 * n + 2.5 * easeOut3(t / 380), SAK, 0.8 * (1 - t / 380), 3); }
  g.restore();
  const N = lowQ ? 22 : 60;
  for (let i = 0; i < N; i++) {
    const an = hash01(i * 1.7) * TAU, sp = 0.5 + hash01(i * 3.1) * 1.0, u = easeOut3(clamp01(q * 1.8)), drift = clamp01((q - 0.4) / 0.6);
    const d = (0.3 + 3.2 * sp) * u + drift * 1.5 * sp;
    const z = 0.6 * n + 1.2 * Math.sin(Math.PI * Math.min(1, q * 2.2)) * hash01(i + 2) - drift * 0.5;
    const p = P(cx + Math.cos(an) * d + drift * 0.8, cy + Math.sin(an) * d, Math.max(0.05, z));
    const a = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3;
    petal(g, p[0], p[1], p[2] * (0.05 + 0.03 * hash01(i + 7)), an + t / 300 * (hash01(i) - 0.5) * 3, Math.cos(i + t / 180), i % 2 ? SAK : SAK2, 0.95 * a);
  }
}
// ---------- สังหารทันที: ร่างแยกสองซีก → กองเลือด ----------
//  ชิ้นร่างวาดด้วยภาพหมากเดิม (ctx.redraw) ตัดครึ่งตามรอยตัด · ก่อนถึงจังหวะ (gate) = ร่างหยุดนิ่ง
function killUnit(e, alpha) {
  const L = e.look || {};
  return {
    id: `ryougiKill:${e.targetId}`, rx: e.to.x, ry: e.to.y, ox: 0, oy: 0, hz: 0, sq: 0, color: normColor(L.color || "#7f8aa6"), img: L.img || null, name: "",
    hp: 0, maxHp: 0, armor: 0, maxArmor: 0, isMe: false, isActor: false, tag: null, reticle: null, hovered: false, hitT: 0, noBar: true, alpha,
    size: Math.max(1, e.tsize | 0), art: null, face: null, masked: false, corpse: false, lowQ: false,
  };
}
const KILL_ANG = -0.55;
function killLines(e) {
  if (e._lines) return e._lines;
  const R0 = rngOf(strHash(e.targetId) + 77), out = [];
  for (let i = 0; i < 9; i++) {
    let x = (R0() - 0.5) * 1.6, y = (R0() - 0.5) * 2.2 + 0.5, a = R0() * TAU;
    const pts = [[x, y]];
    for (let j = 0; j < 5; j++) { a += (R0() - 0.5) * 1.1; x += Math.cos(a) * 0.22; y += Math.sin(a) * 0.22; pts.push([x, y]); }
    out.push({ pts, w: R0() < 0.3 ? 2.2 : 1.2, at: R0() * 0.5 });
  }
  e._lines = out;
  return out;
}
function killFx(g, e, now, lowQ, ctx) {
  if (!okT(e.to)) return;
  const gate = e.gate && Number.isFinite(e.gate.at) ? e.gate.at : null;
  const B = bodyAt(e.to.x, e.to.y, e.tsize), redraw = ctx.redraw;
  const cx = B.bx, cy = (B.hy + B.by) / 2, cs = Math.cos(KILL_ANG), sn = Math.sin(KILL_ANG), nx = -sn, ny = cs;
  if (gate == null || now < gate) { if (redraw) redraw(killUnit(e, 1)); return; } // หยุดนิ่งรอจังหวะปะทะ
  const t = now - gate, F = RYOUGI_FX;
  if (t >= KILL_MS) return;
  // ชิ้นร่าง: ก่อนตัด = ทั้งตัว · หลังตัด = สองซีกเลื่อนออกตามรอยตัด แล้วยุบ/จางลงพื้น
  const sp = t < F.killCut ? 0 : easeOut3(clamp01((t - F.killCut) / (F.killSplit - F.killCut)));
  const sink = clamp01((t - 900) / (F.killPool - 900)), alpha = 1 - easeIn2(sink);
  if (redraw && alpha > 0.02) {
    if (sp <= 0) redraw(killUnit(e, 1));
    else for (const s of [1, -1]) {
      g.save();
      const big = B.r * 8;
      g.beginPath();
      g.moveTo(cx - cs * big, cy - sn * big); g.lineTo(cx + cs * big, cy + sn * big);
      g.lineTo(cx + cs * big + nx * big * s, cy + sn * big + ny * big * s); g.lineTo(cx - cs * big + nx * big * s, cy - sn * big + ny * big * s); g.closePath();
      g.clip();
      // ซีกบน (s = −1 ฝั่งหัว) ไถลลงตามรอยตัด · ซีกล่างเอนออกนิด
      const slide = s < 0 ? B.r * 0.55 * sp : -B.r * 0.12 * sp, push = B.r * 0.18 * sp * s;
      g.translate(cs * slide + nx * push, sn * slide + ny * push + B.r * 0.9 * easeIn2(sink));
      g.translate(cx, cy); g.rotate(s * 0.12 * sp); g.scale(1, 1 - 0.5 * sink); g.translate(-cx, -cy);
      redraw(killUnit(e, alpha));
      // หน้าตัดเรืองแดง
      g.globalCompositeOperation = "lighter";
      g.strokeStyle = rgba(RED, 0.8 * alpha * (1 - sp * 0.4)); g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(cx - cs * B.r * 1.6, cy - sn * B.r * 1.6); g.lineTo(cx + cs * B.r * 1.6, cy + sn * B.r * 1.6); g.stroke();
      g.restore();
    }
  }
  // เส้นแห่งความตายสีแดงขึ้นทั่วตัว
  const lk = t < F.killCut ? clamp01(t / F.killLines) : 1 - clamp01((t - F.killCut) / 350);
  if (lk > 0) {
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round"; g.lineJoin = "round";
    for (const ln of killLines(e)) {
      const u = clamp01(lk * 1.6 - ln.at);
      if (u <= 0) continue;
      const m = Math.max(1, Math.round(u * (ln.pts.length - 1)));
      g.beginPath();
      for (let j = 0; j <= m; j++) { const p = ln.pts[j], X = B.bx + p[0] * B.r, Y = B.hy + p[1] * B.r; if (j) g.lineTo(X, Y); else g.moveTo(X, Y); }
      if (!lowQ) { g.strokeStyle = rgba(RED, 0.35 * lk); g.lineWidth = ln.w * 3.5; g.stroke(); }
      g.strokeStyle = rgba(RED, lk); g.lineWidth = ln.w; g.stroke();
    }
    glow(g, B.bx, B.hy, B.r * 1.4, RED, 0.3 * lk);
    g.restore();
  }
  // เส้นตัดขาววาบ
  if (t >= F.killCut - 60 && t < F.killCut + 360) {
    const u = clamp01((t - (F.killCut - 60)) / 70), k = t < F.killCut + 80 ? 1 : 1 - (t - F.killCut - 80) / 280, L = B.r * 2.8;
    bladeLine(g, [cx - cs * L, cy - sn * L], [cx + cs * L, cy + sn * L], B.r * 0.1, k, u);
    if (t < F.killCut + 160) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, cx, cy, B.r * 2, WHITE, 0.5 * (1 - (t - F.killCut + 60) / 220)); g.restore(); }
  }
}
// กองเลือดของฉากสังหาร (พื้น) — โตขึ้นตอนร่างยุบ
function killGround(g, e, now) {
  const gate = e.gate && Number.isFinite(e.gate.at) ? e.gate.at : null;
  if (gate == null || !okT(e.to)) return;
  const t = now - gate;
  if (t < 820 || t >= KILL_MS) return;
  drawPool(g, e.to.x, e.to.y, e.tsize, e.targetId, easeOut3(clamp01((t - 820) / (RYOUGI_FX.killPool - 820))));
}
const killBusy = (e, now) => {
  const gate = e.gate && Number.isFinite(e.gate.at) ? e.gate.at : null;
  return gate == null || now < gate + KILL_MS;
};

// ---------- ทางเข้าเดียว (เอฟเฟกต์ครั้งเดียว — วาดทับทุกอย่าง) ----------
//  ctx = { view, info, units, redraw(u), octx (สำหรับ drawObstacle), drawShop(x, y) }
export function ryougiFx(g, e, now, lowQ, ctx = {}) {
  if (e.kind === "ryougiSlash") { slashFx(g, e, now, lowQ); return; }
  if (e.kind === "ryougiLeap") { leapFx(g, e, now, lowQ); return; }
  if (e.kind === "ryougiSever") { severFx(g, e, now, lowQ); return; }
  if (e.kind === "ryougiKill") { killFx(g, e, now, lowQ, ctx); return; }
  const t = now - e.t0, dur = e.dur || RYOUGI_FX_DUR[e.kind] || 0;
  if (t < 0 || t > dur) return;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  if (e.kind === "ryougiYinyang") yinyangFx(g, e, t, now, lowQ);
  else if (e.kind === "ryougiEyes") eyesFx(g, e, t, now, lowQ, ctx);
  else if (e.kind === "ryougiMind") mindFx(g, e, t, now, lowQ, ctx);
  else if (e.kind === "ryougiDash") dashFx(g, e, t, now, lowQ);
  else if (e.kind === "ryougiSteal") stealFx(g, e, t, now, lowQ, ctx);
  else if (e.kind === "ryougiCrumble") crumbleFx(g, e, t, now, lowQ, ctx);
  else if (e.kind === "ryougiBloom") bloomFx(g, e, t, now, lowQ, ctx);
  g.restore();
}

// =================================================================== ชั้นบนพื้น (ใต้ไฮไลต์และตัวละคร)
//  rs = prop ryougi ({ units, blood } | null) · o = { view, C (สีธีม) }
export function drawRyougiGround(g, rs, info, fx, now, lowQ, o = {}) {
  const list = Array.isArray(fx) ? fx : [];
  const chasm = chasmOf(info);
  const mine = list.filter((e) => e && isRyougiFx(e.kind));
  if (!chasm.length && !rs && !mine.length) return;
  // ช่องพัง (ช่องที่ฉากพังยังไม่ถึง = พื้นปกติไปก่อน)
  if (chasm.length) {
    const wait = mine.length ? pendingChasm(mine, now) : null;
    for (const t of chasm) if (!(wait && wait.has(`${t.x},${t.y}`))) drawChasm(g, t, now, lowQ);
  }
  for (const e of mine) {
    const t = now - e.t0;
    if (e.kind === "ryougiCrumble") crumbleGround(g, e, t, now, lowQ, o.C);
    else if (e.kind === "ryougiDash") dashGround(g, e, t, now);
    else if (e.kind === "ryougiYinyang" && t >= 0) yinyangGround(g, e, t);
  }
  // กองเลือด (ฉากสังหารที่ยังเล่นอยู่ = ยังไม่วาดกองค้าง — ฉากวาดเองตอนร่างยุบ)
  const blood = rs && Array.isArray(rs.blood) ? rs.blood : [];
  if (blood.length) {
    const busy = new Set(mine.filter((e) => e.kind === "ryougiKill" && killBusy(e, now)).map((e) => String(e.targetId)));
    for (const b of blood) if (okT(b) && !busy.has(String(b.id))) drawPool(g, b.x, b.y, b.size, b.id, 1);
  }
  for (const e of mine) if (e.kind === "ryougiKill") killGround(g, e, now);
  // เนตรมณะ (ชั้นค้าง): มืดจาง + รอยร้าวแดงหายใจช้าๆ — ระหว่างฉากเปิดตายังเล่นอยู่ค่อยๆ ขึ้นมาแทน
  const eyesOn = rs && Array.isArray(rs.units) && rs.units.some((u) => u.eyes);
  if (eyesOn && info) {
    const ev = mine.find((e) => e.kind === "ryougiEyes" && now - e.t0 < RYOUGI_FX_DUR.ryougiEyes);
    const k = ev ? clamp01((now - ev.t0 - (RYOUGI_FX_DUR.ryougiEyes - 700)) / 700) : 1;
    if (k > 0) {
      g.save(); g.fillStyle = rgba("8,3,12", 0.24 * k); g.fillRect(...viewRect(o.view)); g.restore();
      const br = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / 1300);
      strokeNet(g, crackNet(info.cols, info.rows), { alpha: (0.2 + 0.12 * br) * k, lowQ, now, glowK: 0.8, pulse: true });
    }
  }
}

// =================================================================== ค้างบนตัว (เรียงความลึกกับตัวละคร)
// เงาติดตา: ตำแหน่งย้อนหลังของฉากที่ย้ายตัวเรียวกิ
function lagPose(e, u, tm) {
  if (e.kind === "ryougiSlash") return slashPos(e, clamp01((tm - e.t0) / RYOUGI_MS.ryougiSlash));
  if (e.kind === "ryougiLeap") return leapPos(e, clamp01((tm - e.t0) / RYOUGI_MS.ryougiLeap));
  if (e.kind === "ryougiDash") { const G = dashGeo(e), k = dashK(tm - e.t0); return { x: lerp(G.from.x, G.to.x, k), y: lerp(G.from.y, G.to.y, k), hz: 0 }; }
  return null;
}
export function ryougiItems(items, g, rs, units, fx, now, lowQ, redraw) {
  const list = Array.isArray(fx) ? fx : [];
  // เงาติดตาสีชมพู (ฉากตี / พุ่ง)
  if (typeof redraw === "function") {
    for (const e of list) {
      if (!e || !(e.kind === "ryougiSlash" || e.kind === "ryougiLeap" || e.kind === "ryougiDash")) continue;
      const id = e.kind === "ryougiDash" ? e.id : e.by, t = now - e.t0;
      if (t < 0 || t > (e.kind === "ryougiDash" ? DASH_DRAW : RYOUGI_MS[e.kind])) continue;
      const u = units.find((it) => it.id === id && !it.corpse);
      if (!u) continue;
      const cur = lagPose(e, u, now);
      if (!cur) continue;
      const lags = e.kind === "ryougiDash" ? [45, 90, 135, 180] : [50, 100, 150];
      lags.forEach((lag, j) => {
        if (lowQ && j % 2) return;
        const p = lagPose(e, u, now - lag);
        if (!p || Math.hypot(p.x - cur.x, p.y - cur.y) + Math.abs((p.hz || 0) - (cur.hz || 0)) < 0.12) return;
        const a = (0.5 - j * 0.1) * (u.alpha == null ? 1 : u.alpha), n = Math.max(1, u.size | 0);
        const gh = { ...u, rx: p.x, ry: p.y, ox: 0, oy: 0, hz: p.hz || 0, sq: 0, alpha: a, noBar: true, isMe: false, isActor: false, tag: null, reticle: null, hovered: false, hitT: 0, ghostOf: u.id };
        const A = bodyAt(p.x, p.y, n, p.hz || 0);
        items.push({ d: depthOf(p.x + n / 2, p.y + n / 2) - 0.0008 - j * 0.0001, f: () => {
          g.save(); g.globalCompositeOperation = "lighter"; glow(g, A.bx, A.hy, A.r * 1.5, PINK, 0.35 * a); g.restore();
          redraw(gh);
        } });
      });
    }
  }
  const rl = rs && Array.isArray(rs.units) ? rs.units : [];
  for (const c of rl) {
    const u = units.find((it) => it.id === c.id && !it.corpse);
    if (!u) continue;
    const al = u.alpha == null ? 1 : u.alpha;
    if (al < 0.05) continue;
    const n = Math.max(1, u.size | 0), A = unitBody(u), rx = u.rx + (u.ox || 0), ry = u.ry + (u.oy || 0), d = depthOf(rx + n / 2, ry + n / 2);
    const pulse = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / 480);
    // ซากุระวนรอบตัว (ครึ่งหลังวาดก่อนหมาก · ครึ่งหน้าวาดทับ)
    if (c.bloom) {
      const N = lowQ ? 4 : 7, base = REDUCED ? 0 : now / 900;
      const orbit = (front) => () => {
        g.save(); g.globalAlpha *= al;
        for (let i = 0; i < N; i++) {
          const an = base + (i / N) * TAU, s = Math.sin(an);
          if ((s > 0) !== front) continue;
          const p = P(rx + n / 2 + Math.cos(an) * 0.62 * n, ry + n / 2 + s * 0.62 * n, 0.35 + 0.5 * n * (0.5 + 0.5 * Math.sin(an * 2 + i)));
          petal(g, p[0], p[1], p[2] * 0.055, an * 2 + i, Math.cos(an * 3 + i), i % 2 ? SAK : SAK2, 0.9);
        }
        g.restore();
      };
      items.push({ d: d - 0.0015, f: orbit(false) }, { d: d + 0.0015, f: orbit(true) });
    }
    // ใบมีดเรืองขาวที่มือ (รากฐานจิต) · ตาเรืองฟ้า (เนตรมณะ)
    if (c.mind || c.eyes) {
      items.push({ d: d + 0.0012, f: () => {
        g.save(); g.globalAlpha *= al;
        if (c.mind) { const H = handOf(A); drawKnife(g, H.x, H.y, H.ang, H.L, 1, 0.55 + 0.45 * pulse); }
        if (c.eyes) {
          g.globalCompositeOperation = "lighter";
          const ex = A.r * 0.2, ey = A.hy - A.r * 0.12;
          for (const s of [-1, 1]) { glow(g, A.bx + s * ex, ey, A.r * 0.3, BLUE, 0.4 + 0.25 * pulse); glow(g, A.bx + s * ex, ey, A.r * 0.12, RINGP, 0.5 + 0.3 * pulse); }
        }
        g.restore();
      } });
    }
  }
}

// =================================================================== ในอากาศ: ซากุระปลิวทั่วกระดาน (หลังดับสิ้นซะ)
export function drawRyougiAir(g, rs, info, fx, now, lowQ) {
  const on = rs && Array.isArray(rs.units) && rs.units.some((u) => u.bloom);
  if (!on || !info) return;
  const list = Array.isArray(fx) ? fx : [];
  const ev = list.find((e) => e && e.kind === "ryougiBloom" && now - e.t0 < RYOUGI_FX_DUR.ryougiBloom);
  const k = ev ? clamp01((now - ev.t0 - 1200) / 900) : 1;
  if (k <= 0) return;
  const W = info.cols + 4, H = info.rows + 4, N = lowQ ? 18 : 56, tm = REDUCED ? 0 : now / 1000;
  g.save();
  for (let i = 0; i < N; i++) {
    const h1 = hash01(i * 1.31 + 0.7), h2 = hash01(i * 2.17 + 1.9), h3 = hash01(i * 3.71 + 4.1);
    const vx = 0.35 + 0.35 * h3, vy = 0.12 + 0.18 * h1;
    const x = ((h1 * W + tm * vx + Math.sin(tm * 0.8 + i) * 0.4) % W + W) % W - 2;
    const y = ((h2 * H + tm * vy + Math.cos(tm * 0.6 + i * 1.3) * 0.3) % H + H) % H - 2;
    const z = 0.4 + 2.2 * h3 + 0.25 * Math.sin(tm * 1.3 + i);
    const p = P(x, y, z);
    const edge = Math.min(1, (x + 2) / 1.5, (info.cols + 2 - x) / 1.5, (y + 2) / 1.5, (info.rows + 2 - y) / 1.5);
    if (edge <= 0) continue;
    petal(g, p[0], p[1], p[2] * (0.045 + 0.03 * h2), tm * (1 + h1) + i, Math.cos(tm * (2 + h2 * 2) + i), i % 3 ? SAK : SAK2, 0.75 * k * edge);
  }
  g.restore();
}

// =================================================================== ย้ายหมากตามฉาก (BoardCanvas)
//  ตีปกติ = เรียวกิพุ่งเข้า/กระโดดข้ามหัวแล้วกลับ · dash = พุ่งตามแนว (ค้างที่ปลายทางจน state มาถึง)
//  crumble = คนในแนวถูกเหวี่ยงออกข้าง from → to (ศพ id "corpse:<id>" ด้วย)
export function ryougiPose(list, u, now) {
  if (!u || u.id == null || !Array.isArray(list)) return null;
  for (const e of list) {
    if (!e) continue;
    const t = now - e.t0;
    if (t < 0) continue;
    if (!u.corpse && (e.kind === "ryougiSlash" || e.kind === "ryougiLeap") && e.by === u.id) {
      const D = RYOUGI_MS[e.kind];
      if (t >= D) continue;
      return e.kind === "ryougiSlash" ? slashPos(e, t / D) : leapPos(e, t / D);
    }
    if (!u.corpse && e.kind === "ryougiDash" && e.id === u.id && okT(e.from) && okT(e.to)) {
      const atFrom = u.x === e.from.x && u.y === e.from.y;
      if (t > DASH_DRAW && !atFrom) continue;
      const k = dashK(t);
      return { x: lerp(e.from.x, e.to.x, k), y: lerp(e.from.y, e.to.y, k), hz: 0.06 * Math.sin(Math.PI * k) };
    }
    if (e.kind === "ryougiCrumble" && Array.isArray(e.pushes)) {
      const m = e.pushes.find((p) => p && (p.corpse ? u.corpse && u.id === `corpse:${p.id}` : !u.corpse && u.id === p.id) && okT(p.from) && okT(p.to));
      if (!m) continue;
      const F = RYOUGI_FX, k = easeOut3(clamp01((t - F.crumblePushFrom) / (F.crumblePushTo - F.crumblePushFrom)));
      return { x: lerp(m.from.x, m.to.x, k), y: lerp(m.from.y, m.to.y, k), hz: 0.45 * Math.sin(Math.PI * k) };
    }
  }
  return null;
}

// =================================================================== socket "ryougiFx" → ของที่ BoardStage เล่น
//  ctx = { posOf(id), sizeOf(id), lookOf(id) → { img, color, name }, foesOf(ownerId) → [id] }
//  คืน { fx, look: [[pos, ms]], shake: [ms], busy: [{ id, ms }], later: [[ms, fx[]]], slain: [id], gates: [{ gate, mode: "hit" | "now" }] }
//   gate = { at } ใช้ร่วมกับ fx (อ้างอิงเดียวกัน) — BoardStage ใส่เวลาเริ่มจริง: "hit" = จังหวะปะทะของฉากตีปกติที่กำลังเล่น · "now" = ทันที
export function ryougiEventFx(ev, ctx = {}) {
  const out = { fx: [], look: [], shake: [], busy: [], later: [], slain: [], gates: [] };
  if (!ev || typeof ev !== "object") return out;
  const kind = RYOUGI_EVENT_FX[ev.kind];
  if (!kind) return out;
  const posOf = (id) => { const p = id != null && typeof ctx.posOf === "function" ? ctx.posOf(id) : null; return okT(p) ? ptOf(p) : null; };
  const sizeOf = (id) => (id != null && typeof ctx.sizeOf === "function" ? Math.max(1, ctx.sizeOf(id) | 0) : 1);
  const tilesOf = (l) => (Array.isArray(l) ? l.filter(okT).map(ptOf) : []);
  const at = okT(ev.at) ? ptOf(ev.at) : posOf(ev.id);
  const size = Number(ev.size) > 0 ? ev.size | 0 : sizeOf(ev.id);
  const base = { id: ev.id, color: ev.color || null, size };
  const mid = (p, n) => ({ x: p.x + Math.floor((n - 1) / 2), y: p.y + Math.floor((n - 1) / 2) });
  switch (ev.kind) {
    case "yinyang":
    case "mind":
    case "bloom": {
      if (!at) break;
      out.fx.push({ ...base, kind, x: at.x, y: at.y, form: ev.form || null });
      out.look.push([mid(at, size), 0]);
      break;
    }
    case "eyes": {
      if (!at) break;
      const foes = typeof ctx.foesOf === "function" ? ctx.foesOf(ev.id) || [] : [];
      out.fx.push({ ...base, kind, x: at.x, y: at.y, foes });
      out.look.push([mid(at, size), 0]);
      out.shake.push(RYOUGI_FX.eyesCrack);
      break;
    }
    case "sever": {
      const to = okT(ev.to) ? ptOf(ev.to) : posOf(ev.targetId);
      if (!to) break;
      const gate = { at: null };
      out.fx.push({ ...base, kind, x: to.x, y: to.y, to, tsize: Number(ev.tsize) > 0 ? ev.tsize | 0 : sizeOf(ev.targetId), targetId: ev.targetId ?? null, gate });
      out.gates.push({ gate, mode: "hit" });
      break;
    }
    case "dash": {
      const from = okT(ev.from) ? ptOf(ev.from) : at, to = okT(ev.to) ? ptOf(ev.to) : from;
      if (!from) break;
      const tiles = tilesOf(ev.tiles);
      out.fx.push({ ...base, kind, x: from.x, y: from.y, from, to, dir: ev.dir || null, tiles });
      out.busy.push({ id: ev.id, ms: RYOUGI_FX_DUR.ryougiDash + 150 });
      const end = tiles.length ? tiles[Math.floor(tiles.length / 2)] : to;
      out.look.push([mid(from, size), 0], [end, RYOUGI_FX.dashGo]);
      out.shake.push(RYOUGI_FX.dashArrive);
      break;
    }
    case "steal": {
      if (!at) break;
      const from = okT(ev.to) ? ptOf(ev.to) : posOf(ev.targetId);
      if (!from) break;
      out.fx.push({ ...base, kind, x: at.x, y: at.y, from, fromSize: sizeOf(ev.targetId), amt: ev.amt | 0 });
      break;
    }
    case "crumble": {
      const land = okT(ev.land) ? ptOf(ev.land) : at;
      const tiles = tilesOf(ev.tiles);
      const pushes = (Array.isArray(ev.pushes) ? ev.pushes : []).filter((p) => p && p.id != null && okT(p.from) && okT(p.to))
        .map((p) => ({ id: p.id, from: ptOf(p.from), to: ptOf(p.to), corpse: !!p.corpse }));
      const razed = (Array.isArray(ev.razed) ? ev.razed : []).filter(okT).map((r) => ({ x: r.x, y: r.y, kind: r.kind || "rock" }));
      out.fx.push({ ...base, kind, x: land ? land.x : 0, y: land ? land.y : 0, land, dir: ev.dir || null, tiles, pushes, razed, shop: okT(ev.shop) ? ptOf(ev.shop) : null });
      for (const p of pushes) if (!p.corpse) out.busy.push({ id: p.id, ms: RYOUGI_FX_DUR.ryougiCrumble + 150 });
      out.busy.push({ id: ev.id, ms: RYOUGI_FX_DUR.ryougiCrumble + 150 });
      if (land) out.look.push([mid(land, size), 0]);
      out.shake.push(RYOUGI_FX.crumbleCut + 60, RYOUGI_FX.crumbleCut + RYOUGI_FX.crumbleStep * Math.max(0, tiles.length - 1) + 120);
      break;
    }
    case "kill": {
      const to = okT(ev.to) ? ptOf(ev.to) : posOf(ev.targetId);
      if (!to || ev.targetId == null) break;
      const look = typeof ctx.lookOf === "function" ? ctx.lookOf(ev.targetId) : null;
      const gate = { at: null };
      out.fx.push({ ...base, kind, x: to.x, y: to.y, to, tsize: Number(ev.tsize) > 0 ? ev.tsize | 0 : sizeOf(ev.targetId), targetId: ev.targetId, how: ev.how || "skill", look, gate });
      out.gates.push({ gate, mode: ev.how === "strike" ? "hit" : "now" });
      out.slain.push(ev.targetId);
      out.look.push([mid(to, Number(ev.tsize) > 0 ? ev.tsize | 0 : 1), 0]);
      break;
    }
    default: break;
  }
  return out;
}
