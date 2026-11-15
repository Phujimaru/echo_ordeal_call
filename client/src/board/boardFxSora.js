// ============================================================
//  เอฟเฟกต์ของโซระ โอโตสุมิ + คลื่นความมืด (แยกจาก boardDraw.js) — ฟัน Myth · กรงจักรหนู · พุ่ง · ระเบิด · prepareDarkWave
// ============================================================
import { P, gEllipse, glow, hexPath, quad } from "./boardGeo";
import { REDUCED } from "./boardCamera";
import { easeOut3 } from "./boardFxBasic";
import { BEAM_DIRS, taper } from "./boardFxBeam";
import { easeOutBack } from "./boardUnits";
import { FRAME_PAL, frameDashExtra, frameWindup } from "./soraFrameFx";

// =================================================================== โซระ โอโตสุมิ (ธีมหนู Myth)
//  SORA_T.wheel / step ต้องตรงกับ characters/sora_otosumi.js (WHEEL_MS / DASH_STEP_MS) — server หยุดเกมรอตามค่านี้
//   lead = เล่นเสียงมีดก่อนจังหวะปะทะ (เสียงฟันแรกอยู่ที่ ~0.25 วิ) · slash2 = ฟันแรก → ฟันที่สอง · boom = ระยะระเบิดฟ้า
export const SORA_T = { wheel: 1400, step: 90, lead: 250, slash2: 750, boom: 1200 };
const SKY = "80,185,255", SKY_HI = "185,235,255", DEEP = "28,72,235", ICE = "225,246,255", STEEL = "196,212,232";
const SORA_PAL = { SKY, SKY_HI, DEEP, ICE };
// ร่าง Fire Frame (fx.fire): ส้มไฟ / เหลืองร้อน / แดงลึก / แกนขาวอมเหลือง — ใช้แทนสีฟ้าในวงล้อ เงาพุ่ง และระเบิด
const FIRE_PAL = { SKY: "255,120,40", SKY_HI: "255,214,110", DEEP: "220,30,20", ICE: "255,240,200" };
// Eagle / Tutle / Orca Frame (fx.frame): แดง / เขียว / น้ำเงินเข้ม — soraFrameFx.js
const soraPal = (e) => (e.fire ? FIRE_PAL : FRAME_PAL[e.frame] || SORA_PAL);
const h01 = (n) => { const s = Math.sin(n * 91.7 + 47.3) * 43758.5453; return s - Math.floor(s); };

//  fx { kind: "mythSlash", x, y (มุมบนซ้ายเป้า), size } — ฟันมีด 2 ครั้ง: ครั้งแรกที่ t0 (จังหวะปะทะ) · ครั้งที่สอง t0 + SORA_T.slash2 ไขว้กันเป็นรูป X
//   แต่ละครั้ง = เสี้ยวพระจันทร์ฟ้ากวาดเร็ว (แกนขาว + เรืองน้ำเงิน) + เส้นคม + แฟลช + ประกายแตก แล้วหางหดจางไป
//  lowQ = ไม่มีชั้นเรือง/ประกาย · ลดการเคลื่อนไหว = ขึ้นเต็มทันที ไม่มีประกายกระเด็น
export const SL_SWEEP = 110, SL_LIFE = 500;
// เสี้ยวโค้ง: วงกลมรัศมี R (ท้องโค้งผ่านจุด cx, cy) กาง span rad · วาดช่วง u0..u1 (0..1) · หนาสุด W กลางเสี้ยว
function crescent(g, cx, cy, R, rot, span, u0, u1, W, fill) {
  if (u1 - u0 < 0.01) return;
  const c = Math.cos(rot), s = Math.sin(rot), N = 22, out = [], inn = [];
  for (let i = 0; i <= N; i++) {
    const u = u0 + (u1 - u0) * i / N, a = -Math.PI / 2 - span / 2 + span * u, w = W * Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.7);
    for (const [arr, r] of [[out, R + w * 0.6], [inn, R - w * 0.4]]) {
      const lx = Math.cos(a) * r, ly = R + Math.sin(a) * r;
      arr.push([cx + lx * c - ly * s, cy + lx * s + ly * c]);
    }
  }
  g.beginPath(); out.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  for (let i = inn.length - 1; i >= 0; i--) g.lineTo(inn[i][0], inn[i][1]);
  g.closePath(); g.fillStyle = fill; g.fill();
}
// tone "red" = ดาบ BeamSaber ของบานาจ (แกนขาว + เรืองแดง)
const SABER = { SKY: "255,70,90", SKY_HI: "255,190,200", DEEP: "220,20,40", ICE: "255,228,232" };
export function mythSlashFx(g, e, now, lowQ) {
  const { SKY, SKY_HI, DEEP, ICE } = e.tone === "red" ? SABER : SORA_PAL;
  const t = now - e.t0, n = Math.max(1, e.size | 0), still = lowQ || REDUCED;
  const [cx, cy, s0] = P(e.x + n / 2, e.y + n / 2, 0.85 + (n - 1) * 0.4);
  const S = s0 * 1.2 * (1 + (n - 1) * 0.5), R = S * 0.62, span = 2.0;
  g.save(); g.lineCap = "round";
  // [มุมเอียง, กวาดกลับทาง?] — ฟันแรก "\" ซ้าย→ขวา · ฟันสอง "/" ขวา→ซ้าย (ไขว้เป็น X)
  [[0.62, false], [-0.7, true]].forEach(([rot, rev], k) => {
    const age = t - k * SORA_T.slash2;
    if (age < 0 || age > SL_LIFE) return;
    const sw = REDUCED ? 1 : easeOut3(Math.min(1, age / SL_SWEEP));
    const fade = age < SL_SWEEP ? 1 : Math.pow(1 - (age - SL_SWEEP) / (SL_LIFE - SL_SWEEP), 1.4);
    const tail = REDUCED ? 0 : 0.7 * (1 - fade);
    const [u0, u1] = rev ? [1 - sw, 1 - tail] : [tail, sw];
    const wK = 0.45 + 0.55 * fade;
    if (!lowQ) { g.globalCompositeOperation = "lighter"; crescent(g, cx, cy, R, rot, span, u0, u1, S * 0.38 * wK, `rgba(${DEEP},${0.5 * fade})`); }
    g.globalCompositeOperation = "source-over";
    crescent(g, cx, cy, R, rot, span, u0, u1, S * 0.2 * wK, `rgba(${SKY},${0.95 * fade})`);
    g.globalCompositeOperation = "lighter";
    crescent(g, cx, cy, R, rot, span, u0, u1, S * 0.085 * wK, `rgba(255,255,255,${fade})`);
    // เส้นคมยาวทะลุตามแนวฟัน
    const L = S * 0.95 * sw, ca = Math.cos(rot), sa = Math.sin(rot);
    g.strokeStyle = `rgba(${ICE},${0.85 * fade})`; g.lineWidth = Math.max(1.2, S * 0.025 * fade);
    g.beginPath(); g.moveTo(cx - ca * L, cy - sa * L - R * 0.05); g.lineTo(cx + ca * L, cy + sa * L - R * 0.05); g.stroke();
    if (age < 170) glow(g, cx, cy - R * 0.1, S * (0.5 + age / 170 * 0.5), ICE, 0.9 * (1 - age / 170));
    g.globalCompositeOperation = "source-over";
    if (still) return;
    // ประกายแตกออกตามแนวฟัน (ตกลงนิดๆ)
    const q = age / SL_LIFE;
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1, th = rot + (side < 0 ? Math.PI : 0) + (h01(i + k * 13) - 0.5) * 1.1;
      const d = S * (0.2 + (0.6 + h01(i * 3 + k) * 0.7) * easeOut3(q));
      const px = cx + Math.cos(th) * d, py = cy + Math.sin(th) * d + S * 0.5 * q * q;
      g.fillStyle = i % 3 ? `rgba(${SKY_HI},${1 - q})` : `rgba(255,255,255,${1 - q})`;
      g.beginPath(); g.arc(px, py, Math.max(0.8, (1.6 + h01(i + 7) * 2) * (1 - q)), 0, 7); g.fill();
    }
  });
  g.restore();
}

//  fx { kind: "soraWheel", x, y (ช่องโซระ), size, dir: { x, y } (ทิศพุ่ง), spin (ms หมุนอยู่กับที่), path, step, dur } — กรงจักรหนู: ล้อตั้งตรงครอบตัว ระนาบล้อตามทิศพุ่ง
//   หมุนอยู่กับที่ spin ms แล้วกลิ้งไปกับตัวตาม path (step ms ต่อช่อง — ตรงกับ anim move) · ไม่มีทางให้กลิ้ง (เป้าติดตัว) = ล้อพุ่งเข้าหาเป้าครึ่งช่องตอนท้าย
//   ขอบล้อ 2 วง (ฟ้า/เงิน) + ซี่ล้อ + ขั้นบันไดเชื่อมสองวง + เพลา + ขาตั้ง · หมุนเร็วขึ้นเรื่อยๆ (ใต้เท้าหมุนถอยหลัง = คนวิ่งไปข้างหน้า)
//   เส้นความเร็ว/ประกายพุ่งออกด้านหลัง · ช่วงท้ายแสงวาบ = พุ่งออก
//   วาด 2 รอบผ่านรายการเรียงความลึกของ drawFrame: ครึ่งหลัง (ก่อนตัวละคร) · ครึ่งหน้า (หลังตัวละคร) — เห็นตัวอยู่ในล้อจริง
//  lowQ = ไม่มีชั้นเรือง/เงาซี่/ประกาย/เส้นความเร็ว · ลดการเคลื่อนไหว = ล้อนิ่ง ไม่มีประกาย
const WH = { R: 0.8, W: 0.8, z: 0.84, rim: 36, rungs: 14, spokes: 6 };
// ตำแหน่งล้อ (มุมบนซ้าย) ที่เวลา t: ช่องเริ่มระหว่างหมุนอยู่กับที่ → กลิ้งไปกับตัวตามเส้นทาง · ไม่มีเส้นทาง = พุ่งเข้าหาเป้าครึ่งช่องช่วงท้าย
export function wheelAt(e, t, still) {
  const T = e.dur || SORA_T.wheel, W = Math.min(T, e.spin || T);
  const pts = Array.isArray(e.path) && e.path.length > 1 ? e.path : null;
  if (pts && t > W) {
    const f = Math.min(pts.length - 1, (t - W) / (e.step || SORA_T.step)), i = Math.min(pts.length - 2, Math.floor(f)), q = f - i;
    return [pts[i].x + (pts[i + 1].x - pts[i].x) * q, pts[i].y + (pts[i + 1].y - pts[i].y) * q];
  }
  const dl = Math.hypot(e.dir && e.dir.x, e.dir && e.dir.y) || 0;
  if (pts || !dl || still) return [e.x, e.y];
  const q = Math.max(0, (t - (W - 260)) / 260), lunge = 0.45 * Math.sin(Math.min(1, q) * Math.PI / 2);
  return [e.x + (e.dir.x / dl) * lunge, e.y + (e.dir.y / dl) * lunge];
}
export function wheelFx(g, e, now, lowQ, front) {
  const T = e.dur || SORA_T.wheel, W = Math.min(T, e.spin || T), t = now - e.t0;
  if (t < 0 || t > T) return;
  // Eagle / Orca: ชาร์จแบบพายุขนนก / น้ำวน แทนวงล้อหนู (ตำแหน่งตามตัวแบบเดียวกัน)
  if (e.frame === "eagle" || e.frame === "orca") { const [fx0, fy0] = wheelAt(e, t, lowQ || REDUCED); frameWindup(g, e, now, t, T, W, fx0, fy0, lowQ, front); return; }
  const { SKY, SKY_HI, DEEP, ICE } = soraPal(e);
  const n = Math.max(1, e.size | 0), still = lowQ || REDUCED, k = Math.min(1, t / W);
  const dl = Math.hypot(e.dir && e.dir.x, e.dir && e.dir.y) || 0;
  const dx = dl ? e.dir.x / dl : 1, dy = dl ? e.dir.y / dl : 0, ax = -dy, ay = dx;
  const out = Math.max(0, (t - (T - 160)) / 160); // ปลายทาง: ล้อขยาย + จาง
  const sc = (still ? 1 : easeOutBack(Math.min(1, t / 200))) * (1 + out * 0.3) * n, A = 1 - out;
  if (A <= 0 || sc <= 0) return;
  const [px, py] = wheelAt(e, t, still);
  const cx = px + n / 2, cy = py + n / 2, R = WH.R * sc, hw = (WH.W / 2) * sc, zc = WH.z * n;
  // หมุนเร่งขึ้นจนครบ W แล้วหมุนเต็มที่ต่อระหว่างกลิ้ง
  const tw = Math.min(t, W), spin = REDUCED ? 0 : 0.003 * tw + (0.05 - 0.003) * tw * tw * tw / (3 * W * W) + 0.05 * Math.max(0, t - W);
  const Q = (th, side) => P(cx + dx * Math.cos(th) * R + ax * side * hw, cy + dy * Math.cos(th) * R + ay * side * hw, zc + Math.sin(th) * R);
  const hub = (side, f = 1) => P(cx + ax * side * hw * f, cy + ay * side * hw * f, zc);
  const C0 = P(cx, cy, zc), ref = C0[2];
  const isF = (a, b) => (a[2] + b[2]) / 2 >= ref;
  // เส้นชุดเดียวกัน → path เดียว (เฉพาะช่วงที่อยู่ด้านเดียวกับ front)
  const stroke = (segs, w, color) => {
    g.beginPath();
    for (const [a, b] of segs) if (isF(a, b) === front) { g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
    g.strokeStyle = color; g.lineWidth = Math.max(1, ref * w); g.stroke();
  };
  const rim = [], rungs = [], ghosts = [], spokes = [], legs = [];
  for (const side of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= WH.rim; i++) pts.push(Q((i / WH.rim) * Math.PI * 2, side));
    for (let i = 0; i < WH.rim; i++) rim.push([pts[i], pts[i + 1]]);
    const h = hub(side);
    for (let i = 0; i < WH.spokes; i++) spokes.push([h, Q((i / WH.spokes) * Math.PI * 2 - spin, side)]);
    // ขาตั้ง: จากดุมล้อลงพื้นสองขา (ไม่หมุน)
    for (const f of [-1, 1]) legs.push([hub(side, 1.12), P(cx + dx * f * R * 0.62 + ax * side * hw * 1.2, cy + dy * f * R * 0.62 + ay * side * hw * 1.2, 0)]);
  }
  for (let i = 0; i < WH.rungs; i++) {
    const th = (i / WH.rungs) * Math.PI * 2 - spin;
    rungs.push([Q(th, -1), Q(th, 1)]);
    if (!still && k > 0.35) for (const lag of [0.07, 0.14]) ghosts.push([Q(th + lag * k * 2, -1), Q(th + lag * k * 2, 1)]);
  }
  g.save(); g.lineCap = "round";
  if (!front) {
    // พื้นเรืองใต้ล้อ + พลังงานในล้อ (หลังตัวละคร)
    gEllipse(g, cx, cy, R * 0.95, 0.01, 32); g.fillStyle = `rgba(${SKY},${(0.12 + 0.2 * k) * A})`; g.fill();
    if (!lowQ) { g.globalCompositeOperation = "lighter"; glow(g, C0[0], C0[1], Math.max(1, ref * R * 1.15), DEEP, (0.12 + 0.3 * k) * A); g.globalCompositeOperation = "source-over"; }
  }
  stroke(legs, 0.045, `rgba(110,128,160,${A})`);
  stroke([[hub(-1, 1.12), hub(1, 1.12)]], 0.04, `rgba(${STEEL},${A})`);
  stroke(spokes, 0.024, `rgba(${STEEL},${0.9 * A})`);
  if (ghosts.length) stroke(ghosts, 0.02, `rgba(${SKY},${0.28 * k * A})`);
  stroke(rungs, 0.022, `rgba(${k > 0.6 ? SKY_HI : STEEL},${0.9 * A})`);
  if (!lowQ) { g.globalCompositeOperation = "lighter"; stroke(rim, 0.13, `rgba(${DEEP},${(0.25 + 0.35 * k) * A})`); }
  g.globalCompositeOperation = "source-over";
  stroke(rim, 0.05, `rgba(${SKY},${0.95 * A})`);
  g.globalCompositeOperation = "lighter";
  stroke(rim, 0.018, `rgba(${ICE},${A})`);
  g.globalCompositeOperation = "source-over";
  if (front) {
    // ดุมล้อสองข้าง
    for (const side of [-1, 1]) { const h = hub(side); g.fillStyle = `rgba(${ICE},${A})`; g.beginPath(); g.arc(h[0], h[1], Math.max(1.5, ref * 0.05), 0, 7); g.fill(); }
    if (!still) {
      g.globalCompositeOperation = "lighter";
      // เส้นความเร็วพุ่งออกด้านหลังล้อ (ยาวขึ้นตามความเร็ว)
      g.strokeStyle = `rgba(${SKY_HI},${0.75 * k * A})`;
      for (let i = 0; i < 7; i++) {
        const ph = (now / 140 + i * 0.37) % 1, off = R * 0.9 + ph * 1.3 * n, len = (0.25 + 0.6 * k) * n, z = zc + (h01(i) - 0.5) * R * 1.4, sd = (h01(i + 5) - 0.5) * hw * 2.2;
        const a = P(cx - dx * off + ax * sd, cy - dy * off + ay * sd, z), b = P(cx - dx * (off + len) + ax * sd, cy - dy * (off + len) + ay * sd, z);
        g.lineWidth = Math.max(1, a[2] * 0.02 * (1 - ph)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
      // ประกายจากใต้ล้อกระเด็นไปด้านหลัง
      for (let j = 0; j < 10; j++) {
        const ph = (t / 240 + j / 10) % 1, d = R * 0.2 + ph * (0.4 + 0.9 * k) * n, sd = (h01(j + 21) - 0.5) * hw * 1.6;
        const p = P(cx - dx * d + ax * sd, cy - dy * d + ay * sd, 0.05 + 1.3 * ph * (1 - ph) * (0.4 + h01(j + 3)) * n);
        g.fillStyle = `rgba(${j % 3 ? SKY_HI : "255,255,255"},${(1 - ph) * k * A})`;
        g.beginPath(); g.arc(p[0], p[1], Math.max(0.8, p[2] * 0.03 * (1 - ph)), 0, 7); g.fill();
      }
    }
    if (e.fire) wheelFlames(g, cx, cy, R, hw, dx, dy, ax, ay, zc, n, now, k, A, still, lowQ);
    // แสงวาบตอนพุ่งออก
    const fl = Math.max(0, (t - (T - 260)) / 260);
    if (fl > 0) { g.globalCompositeOperation = "lighter"; glow(g, C0[0], C0[1], Math.max(1, ref * R * (0.8 + fl)), ICE, 0.75 * Math.sin(fl * Math.PI)); }
  }
  g.restore();
}

// Fire Frame: เปลวไฟเลียขึ้นรอบขอบล้อ (หนาขึ้นตามความเร็ว) + แสงแดงเรืองครอบ · ลดการเคลื่อนไหว = เปลวนิ่ง
function wheelFlames(g, cx, cy, R, hw, dx, dy, ax, ay, zc, n, now, k, A, still, lowQ) {
  const C = P(cx, cy, zc);
  g.globalCompositeOperation = "lighter";
  if (!lowQ) glow(g, C[0], C[1], Math.max(1, C[2] * R * 1.5), FIRE_PAL.DEEP, (0.25 + 0.35 * k) * A);
  const N = lowQ ? 8 : 16;
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2, side = (h01(i + 31) - 0.5) * 2 * hw;
    const ph = still ? 0.5 : (now / (260 + h01(i) * 180) + h01(i + 9)) % 1;
    const base = P(cx + dx * Math.cos(th) * R + ax * side, cy + dy * Math.cos(th) * R + ay * side, zc + Math.sin(th) * R);
    const h = (0.22 + 0.4 * k) * n * (0.6 + h01(i + 17) * 0.6) * Math.sin(ph * Math.PI);
    const tip = P(cx + dx * Math.cos(th) * R * 1.05 + ax * side - dx * h * 0.35, cy + dy * Math.cos(th) * R * 1.05 + ay * side - dy * h * 0.35, zc + Math.sin(th) * R + h);
    const w = Math.max(1.5, base[2] * (0.07 + 0.05 * k) * (1 - ph * 0.5)), fa = A * (1 - ph * 0.6);
    tongue(g, base, tip, w, `rgba(${FIRE_PAL.SKY},${0.75 * fa})`);
    tongue(g, base, tip, w * 0.45, `rgba(${FIRE_PAL.SKY_HI},${0.85 * fa})`);
  }
  g.globalCompositeOperation = "source-over";
}
// ลิ้นไฟ: โคนกว้าง w (px) โค้งเรียวไปปลายแหลม
function tongue(g, a, b, w, fill) {
  const vx = b[0] - a[0], vy = b[1] - a[1], L = Math.hypot(vx, vy);
  if (L < 0.5) return;
  const nx = -vy / L * w, ny = vx / L * w, mx = a[0] + vx * 0.4, my = a[1] + vy * 0.4;
  g.beginPath();
  g.moveTo(a[0] + nx, a[1] + ny);
  g.quadraticCurveTo(mx + nx * 1.1, my + ny * 1.1, b[0], b[1]);
  g.quadraticCurveTo(mx - nx * 1.1, my - ny * 1.1, a[0] - nx, a[1] - ny);
  g.closePath(); g.fillStyle = fill; g.fill();
}

//  fx { kind: "soraDash", path: [{x,y}…], step (ms ต่อช่อง), delay (ms ก่อนเริ่ม), size } — เงาตามตัวสีฟ้าตามเส้นทางพุ่ง
//   ตรงจังหวะ anim { kind: "move", stepMs } (หัว = ตำแหน่งตัว) · ริบบอนแสงหาง ~2.6 ช่อง + หกเหลี่ยมเงา 3 ชั้น + เส้นความเร็วบนพื้น
//   ถึงปลายทางแล้วหางหดเข้าหาตัว + จาง (DASH_FADE)
//  lowQ = ไม่มีชั้นเรือง/เส้นบนพื้น · ลดการเคลื่อนไหว = ไม่มีหกเหลี่ยมเงา
const DASH_TAIL = 2.6, DASH_FADE = 420;
export const dashDur = (path, step) => Math.max(1, (Array.isArray(path) ? path.length : 1) - 1) * (step || SORA_T.step) + DASH_FADE;
export function dashFx(g, e, now, lowQ) {
  const pts = e.path, step = e.step || SORA_T.step;
  const { SKY, SKY_HI, DEEP, ICE } = soraPal(e);
  if (!Array.isArray(pts) || pts.length < 2) return;
  const t = now - e.t0 - (e.delay || 0), n = pts.length - 1, run = n * step, sz = Math.max(1, e.size | 0);
  if (t < 0 || t > run + DASH_FADE) return;
  const head = Math.min(n, t / step), fade = t > run ? 1 - (t - run) / DASH_FADE : 1;
  const tail = Math.max(0, head - DASH_TAIL * (t > run ? fade : Math.min(1, t / (step * 2))));
  if (head - tail < 0.02) return;
  const at = (f) => { const i = Math.min(n - 1, Math.floor(f)), q = f - i, A = pts[i], B = pts[i + 1]; return [A.x + (B.x - A.x) * q + sz / 2, A.y + (B.y - A.y) * q + sz / 2]; };
  // จุดกลางหกเหลี่ยมหมาก (สูงเท่า drawUnit)
  const hp = (f) => { const [wx, wy] = at(f), [bx, by, s] = P(wx, wy); return [bx, by - s * 0.86 * sz, s]; };
  const M = 18, rib = [];
  for (let i = 0; i <= M; i++) rib.push(hp(tail + (head - tail) * i / M));
  g.save(); g.lineCap = "round";
  const layer = (wk, color, aK) => {
    for (let i = 1; i <= M; i++) {
      const u = i / M, a = rib[i - 1], b = rib[i];
      g.strokeStyle = `rgba(${color},${aK * fade * u})`; g.lineWidth = Math.max(1, b[2] * wk * u * sz);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
  };
  if (!lowQ) {
    // เส้นความเร็วบนพื้น 2 เส้นขนาบ
    const [hx, hy] = at(head), [tx, ty] = at(tail), L = Math.hypot(hx - tx, hy - ty) || 1, nx = -(hy - ty) / L, ny = (hx - tx) / L;
    g.strokeStyle = `rgba(${SKY_HI},${0.55 * fade})`;
    for (const f of [-0.28, 0.28]) {
      const a = P(tx + nx * f * sz, ty + ny * f * sz, 0.02), b = P(hx + nx * f * sz, hy + ny * f * sz, 0.02);
      g.lineWidth = Math.max(1, b[2] * 0.025); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    g.globalCompositeOperation = "lighter";
    layer(0.8, DEEP, 0.45);
  }
  g.globalCompositeOperation = "source-over";
  layer(0.42, SKY, 0.8);
  g.globalCompositeOperation = "lighter";
  layer(0.13, "255,255,255", 0.9);
  g.globalCompositeOperation = "source-over";
  if (!REDUCED) {
    [0.55, 1.1, 1.65].forEach((lag, i) => {
      const f = head - lag;
      if (f < tail) return;
      const [x, y, s] = hp(f), r = s * 0.4 * sz, a = (0.34 - i * 0.09) * fade;
      hexPath(g, x, y, r); g.fillStyle = `rgba(${SKY},${a * 0.6})`; g.fill();
      g.strokeStyle = `rgba(${SKY_HI},${a * 1.4})`; g.lineWidth = 1.5; g.stroke();
    });
  }
  if (t < run) { const [x, y, s] = hp(head); g.globalCompositeOperation = "lighter"; glow(g, x, y, Math.max(1, s * 0.6 * sz), ICE, 0.55); }
  g.globalCompositeOperation = "source-over";
  if (e.frame) frameDashExtra(g, e, now, lowQ, at, head, tail, fade, sz); // Eagle: ขนนกร่วงตามทาง · Orca: ละอองน้ำ
  g.restore();
}

//  fx { kind: "soraBoom", x, y (มุมบนซ้ายเป้า), size } — ระเบิดตูมสีฟ้า (ขยายตามขนาดเป้า)
//   แฟลชขาวฟ้า → ลูกพลาสมาฟ้าพองแล้วยุบ + เสาแสงพุ่ง → คลื่นกระแทก 3 วงบนพื้น + รอยไหม้ → ประกาย/เศษพื้นกระเด็น → ควันฟ้าลอยจาง
//  lowQ = คลื่นวงเดียว ไม่มีเสาแสง/เศษ/ควัน · ลดการเคลื่อนไหว = ไม่มีเศษกระเด็น
function plasma(g, x, y, r, a, fire) {
  if (r <= 0 || a <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(255,255,255,${a})`);
  gr.addColorStop(0.22, `rgba(${fire ? FIRE_PAL.ICE : ICE},${a})`);
  gr.addColorStop(0.5, fire ? `rgba(255,110,30,${0.85 * a})` : `rgba(70,165,255,${0.85 * a})`);
  gr.addColorStop(1, fire ? "rgba(170,20,10,0)" : "rgba(20,40,170,0)");
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
export function boomFx(g, e, now, lowQ) {
  const t = now - e.t0, D = SORA_T.boom;
  if (t < 0 || t > D) return;
  const { SKY, SKY_HI, ICE } = soraPal(e);
  const n = Math.max(1, e.size | 0), cx = e.x + n / 2, cy = e.y + n / 2, K = 0.8 + n * 0.45, still = lowQ || REDUCED;
  const q = t / D, k = 1 - q;
  g.save(); g.lineCap = "round";
  gEllipse(g, cx, cy, 0.5 * K, 0, 32); g.fillStyle = e.fire ? `rgba(60,12,4,${0.5 * k})` : `rgba(8,22,70,${0.5 * k})`; g.fill();
  const sc0 = P(cx, cy)[2];
  (lowQ ? [0] : [0, 90, 200]).forEach((d0, i) => {
    const r = (t - d0) / 560;
    if (r <= 0 || r >= 1) return;
    g.strokeStyle = `rgba(${i === 1 ? ICE : SKY},${0.95 * (1 - r)})`; g.lineWidth = Math.max(1.5, sc0 * 0.1 * K * (1 - r));
    gEllipse(g, cx, cy, 0.3 * K + easeOut3(r) * (1.4 * K + 0.4), 0.03, 44); g.stroke();
  });
  const B = P(cx, cy, 0.45 * K);
  if (!lowQ && t < 440) {
    const p = t / 440;
    g.globalCompositeOperation = "lighter";
    taper(g, P(cx, cy, 0), P(cx, cy, (1.2 + p * 2.6) * K), 0.6 * K * (1 - p), `rgba(${SKY},${0.75 * (1 - p)})`);
    taper(g, P(cx, cy, 0), P(cx, cy, (1 + p * 2.2) * K), 0.22 * K * (1 - p), `rgba(255,255,255,${0.9 * (1 - p)})`);
    g.globalCompositeOperation = "source-over";
  }
  if (t < 680) {
    const p = t / 680, puff = Math.sin(Math.min(1, p * 1.6) * Math.PI / 2);
    plasma(g, B[0], B[1], B[2] * K * (0.4 + 0.7 * puff) * (1 - 0.25 * p), 1 - p * p, e.fire);
  }
  if (t < 170) { g.globalCompositeOperation = "lighter"; glow(g, B[0], B[1], Math.max(1, B[2] * K * 1.4), ICE, 1 - t / 170); g.globalCompositeOperation = "source-over"; }
  if (!still) {
    const s = t / 1000;
    for (let d = 0; d < 14 + n * 4; d++) {
      const r1 = h01(d * 3 + 1), r2 = h01(d * 5 + 2), th = r1 * Math.PI * 2, sp = (1 + r2 * 1.6) * K, vz = (3 + r2 * 3.5) * K;
      const z = vz * s - 9 * s * s;
      if (z < -0.05) continue;
      const [px, py, ps] = P(cx + Math.cos(th) * sp * s, cy + Math.sin(th) * sp * s, z);
      const spark = d % 3 !== 0;
      g.fillStyle = spark ? `rgba(${d % 2 ? SKY_HI : "255,255,255"},${k})` : `rgba(40,52,78,${k})`;
      g.beginPath(); g.arc(px, py, Math.max(1.2, ps * (spark ? 0.03 : 0.055)), 0, 7); g.fill();
    }
  }
  if (!lowQ && t > 220) { const [sx, sy, ss] = P(cx, cy, (0.6 + q * 1.4) * K); glow(g, sx, sy, Math.max(1, ss * K * (0.4 + q * 0.6)), e.fire ? "120,70,50" : "90,130,190", 0.42 * k); }
  g.restore();
}

// =================================================================== คลื่นความมืด (กิระ)
//  fx { kind: "darkWave", x, y (ช่องกิระ), dir, len, width, dark: prepareDarkWave(...) }
//  คลื่นม่วงดำม้วนไปข้างหน้าทีละแถว (DARK_T.step) · ทุกช่อง: เงามืดซึมพื้น → ยอดคลื่นยกตัวแล้วซัดลง (แฟลชม่วง) → หมอกดำจาง
//  แถวข้าง (ช่อง 1 / 3) มีเส้นดูดเข้าหาแนวกลาง — การบีบตัวจริงตามมาเป็นเหตุการณ์ knock (iceFx) หลังคลื่นจบ
//  lowQ = ไม่มีหมอก/เส้นดูด · ลดการเคลื่อนไหว = ไม่มียอดคลื่น
export const DARK_T = { step: 110, rise: 260, after: 640 };
const DARK = "120,40,200", DARK_HI = "205,150,255", DARK_DEEP = "26,6,48";
export function prepareDarkWave(f, cols, rows) {
  const v = BEAM_DIRS[f && f.dir];
  if (!v || !Number.isFinite(f.x) || !Number.isFinite(f.y)) return null;
  const len = Math.max(1, Math.min(16, Math.floor(+f.len) || 4)), half = Math.floor((Math.floor(+f.width) || 3) / 2);
  const [fx, fy] = v, sx = -fy, sy = fx;
  const tiles = [];
  for (let i = 1; i <= len; i++) {
    for (let j = -half; j <= half; j++) {
      const x = f.x + fx * i + sx * j, y = f.y + fy * i + sy * j;
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      tiles.push({ x, y, j, sx, sy, seed: i * 5.7 + j * 2.3, at: (i - 1) * DARK_T.step + Math.abs(j) * 30 });
    }
  }
  if (!tiles.length) return null;
  const hits = tiles.map((t) => t.at + DARK_T.rise);
  return { tiles, hits, dur: Math.max(...hits) + DARK_T.after + 40 };
}
export function darkWaveFx(g, e, now, lowQ) {
  const W = e.dark;
  if (!W) return;
  const t = now - e.t0;
  if (t < 0 || t > W.dur) return;
  const A = DARK_T.after, R = DARK_T.rise;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  W.tiles.forEach((tl, i) => {
    const age = t - tl.at;
    if (age < 0 || age > R + A) return;
    const cx = tl.x + 0.5, cy = tl.y + 0.5;
    const hitAge = age - R, k = hitAge < 0 ? Math.min(1, age / R) : 1 - hitAge / A;
    // เงามืดซึมพื้น
    g.globalCompositeOperation = "source-over";
    quad(g, tl.x, tl.y, 0.04); g.fillStyle = `rgba(${DARK_DEEP},${0.6 * k})`; g.fill();
    quad(g, tl.x, tl.y, 0.18); g.fillStyle = `rgba(${DARK},${0.35 * k})`; g.fill();
    // ยอดคลื่นยกตัว (ก่อนปะทะ)
    if (hitAge < 0 && !REDUCED) {
      const f = age / R, z = 0.2 + 1.1 * Math.sin(f * Math.PI / 2);
      taper(g, P(cx, cy, 0), P(cx, cy, z), 0.7 * (0.5 + f * 0.5), `rgba(${DARK},${0.55 + 0.35 * f})`);
      taper(g, P(cx, cy, z * 0.6), P(cx, cy, z), 0.3, `rgba(${DARK_HI},${0.7 * f})`);
      return;
    }
    if (hitAge < 0) return;
    const q = hitAge / A;
    // แฟลชตอนซัดลง + วงคลื่นแผ่
    const [sx0, sy0, sc] = P(cx, cy, 0.3);
    if (hitAge < 160) { g.globalCompositeOperation = "lighter"; glow(g, sx0, sy0, sc * 0.7, DARK_HI, 0.9 * (1 - hitAge / 160)); }
    const ring = Math.min(1, hitAge / 360);
    if (ring < 1) {
      g.globalCompositeOperation = "source-over";
      g.strokeStyle = `rgba(${DARK_HI},${0.85 * (1 - ring)})`; g.lineWidth = Math.max(1.5, sc * 0.07 * (1 - ring));
      gEllipse(g, cx, cy, 0.18 + ring * 0.7, 0, 28); g.stroke();
    }
    // แถวข้าง: เส้นดูดเข้าหาแนวกลาง
    if (!lowQ && tl.j && q < 0.7) {
      // o = ทิศเข้าหาแนวกลาง · f = ทิศคลื่น (เส้นเรียงตามแนวคลื่น 3 เส้น)
      const a = 1 - q / 0.7, ox = -tl.sx * tl.j, oy = -tl.sy * tl.j, fx = tl.sy, fy = -tl.sx;
      for (let d = 0; d < 3; d++) {
        const off = (d - 1) * 0.22, bx = cx + fx * off - ox * 0.15, by = cy + fy * off - oy * 0.15, s = 0.15 + q * 0.55;
        taper(g, P(bx, by, 0.25), P(bx + ox * s, by + oy * s, 0.25), 0.06, `rgba(${DARK_HI},${0.6 * a})`);
      }
    }
    // หมอกดำลอยขึ้น
    if (!lowQ) {
      const [dx0, dy0, ds] = P(cx, cy, 0.4 + q * 1.1);
      g.globalCompositeOperation = "source-over";
      glow(g, dx0, dy0, ds * (0.3 + q * 0.5), "40,12,70", 0.5 * (1 - q));
    }
  });
  g.restore();
}
