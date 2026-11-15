// เอฟเฟกต์บนกระดานของมิโดริยะ อิซึคุ (characters/midoriya_izuku.js · GRID_PLAN §7.33)
//  อ้างอิงต้นฉบับ (My Hero Academia): One for All = สายฟ้าสีเขียวแลบตามตัว · Smash = แรงลมกระแทกพุ่งไปข้างหน้า
//  ท่าตีปกติ (ฮุค attackStyle):
//   midoriyaPunch       ต่อย: แสงเขียวที่หมัด → เส้นหมัดพุ่ง → วงลมแตกที่เป้า
//   midoriyaPunchCowl   ระหว่าง Full Cowl: + สายฟ้าเขียวพาดจากตัวถึงเป้า
//  เหตุการณ์จาก server (socket "midoriyaFx" → BoardStage):
//   midoriyaSmash    Smash ทุกแบบ: ชาร์จ (สายฟ้าเขียวรอบแขน) → ตรงจังหวะ MIDORIYA_T คลื่นลมกวาดทุกช่องของพื้นที่จากใกล้ไปไกล
//                     form "throw" = ของบินตามแนวนำหน้าคลื่น · "million" = ใหญ่สุด + เส้นเลือดแดงตอนชาร์จ
//   midoriyaRecoil   ดาเมจเข้าตัวเอง: รอยร้าวแดงบนตัว + เศษแสงแดง
//   midoriyaCowl     Full Cowl: สายฟ้าเขียวระเบิดรอบตัว + วงแสงบนพื้น
//  ออร่าค้าง (drawUnit — units[].aura "midoriyaCowl"): สายฟ้าเขียวแลบรอบตัวเป็นระยะ
import { P } from "./boardGeo";

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
// สี: สายฟ้า One for All (เขียวสด แกนขาวเหลือง) · ลม (ขาวฟ้า) · ร่างกายรับแรง (แดง)
const WHITE = "255,255,240", BOLT = "170,255,120", GREEN = "60,235,120", DEEP = "18,150,80", WIND = "225,245,255", SKY = "150,215,255", RED = "235,40,40";

// จังหวะ (ms) — server characters/midoriya_izuku.js T ต้องตรงกัน (วินาที)
export const MIDORIYA_T = { smash: 550, million: 1600 };
export const MIDORIYA_MS = { midoriyaPunch: 800, midoriyaPunchCowl: 900 };
export const MIDORIYA_HIT_P = { midoriyaPunch: 0.32, midoriyaPunchCowl: 0.3 };
export const MIDORIYA_FX_DUR = { ...MIDORIYA_MS, midoriyaSmash: 3200, midoriyaRecoil: 1000, midoriyaCowl: 1500 };
export const isMidoriyaFx = (kind) => typeof kind === "string" && kind in MIDORIYA_FX_DUR;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const smashDur = (form) => (form === "million" ? MIDORIYA_T.million + 4200 : MIDORIYA_T.smash + (form === "detroit" ? 3200 : 2600));

function bodyAt(x, y, n = 1) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6, cx = x + n / 2, cy = y + n / 2;
  const [bx, by, s] = P(cx, cy);
  return { bx, by, s, hy: by - s * 0.55 * K, K };
}
function glow(g, x, y, r, rgb, a, core = WHITE) {
  if (a <= 0 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(core, a));
  gr.addColorStop(0.3, rgba(rgb, a * 0.8));
  gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
// สุ่มแบบกำหนดได้ (สายฟ้าไม่สั่นมั่วทุกเฟรม — เปลี่ยนรูปตาม step)
const hash = (a) => { const v = Math.sin(a * 127.1) * 43758.5453; return v - Math.floor(v); };
// สายฟ้าซิกแซก x0,y0 → x1,y1 (แกนขาว + ขอบสี)
function bolt(g, x0, y0, x1, y1, seed, jit, w, a, rgb = BOLT) {
  if (a <= 0) return;
  const n = 7, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const pts = [[x0, y0]];
  for (let i = 1; i < n; i++) {
    const u = i / n, off = (hash(seed + i * 3.7) - 0.5) * 2 * jit * Math.sin(u * Math.PI);
    pts.push([x0 + dx * u + nx * off, y0 + dy * u + ny * off]);
  }
  pts.push([x1, y1]);
  g.save(); g.globalCompositeOperation = "lighter"; g.lineJoin = "round"; g.lineCap = "round";
  for (const [col, ww, aa] of [[GREEN, w * 3, 0.35], [rgb, w * 1.6, 0.8], [WHITE, w * 0.6, 1]]) {
    g.strokeStyle = rgba(col, a * aa); g.lineWidth = Math.max(1, ww);
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.stroke();
  }
  g.restore();
}
// สายฟ้าแลบรอบตัว (k เส้น) — ใช้ทั้งชาร์จ/ออร่า
function crackle(g, A, t, k, a, spread = 0.55, seed = 0) {
  const step = Math.floor(t / 70);
  for (let i = 0; i < k; i++) {
    const h = hash(seed + i * 9.1 + step * 1.3);
    if (h < 0.35) continue;
    const ang = hash(seed + i * 2.3 + step) * TAU, r0 = A.s * 0.12, r1 = A.s * spread * (0.6 + 0.4 * h);
    const cy = A.by - A.s * 0.42 * A.K;
    bolt(g, A.bx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0 * 0.9, A.bx + Math.cos(ang + 0.6) * r1, cy + Math.sin(ang + 0.6) * r1 * 0.9, seed + i + step, A.s * 0.05, A.s * 0.012, a);
  }
}
// เส้นลม (streak) ยาวตามทิศ
function streak(g, x, y, ux, uy, len, w, a, rgb = WIND) {
  if (a <= 0) return;
  const gr = g.createLinearGradient(x - ux * len, y - uy * len, x, y);
  gr.addColorStop(0, rgba(rgb, 0)); gr.addColorStop(1, rgba(rgb, a));
  g.strokeStyle = gr; g.lineWidth = Math.max(1, w); g.lineCap = "round";
  g.beginPath(); g.moveTo(x - ux * len, y - uy * len); g.lineTo(x, y); g.stroke();
}
// วงลมบนพื้น (วงรีตามมุมกล้อง)
function ring(g, x, y, r, w, a, rgb = WIND) {
  if (a <= 0 || r <= 0) return;
  g.strokeStyle = rgba(rgb, a); g.lineWidth = Math.max(1, w);
  g.beginPath(); g.ellipse(x, y, r, r * 0.5, 0, 0, TAU); g.stroke();
}

// ---------- ตีปกติ ----------
function punchFx(g, e, p, seed, lowQ, cowl) {
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const H = cowl ? MIDORIYA_HIT_P.midoriyaPunchCowl : MIDORIYA_HIT_P.midoriyaPunch;
  const dx = B.bx - A.bx, dy = B.hy - A.hy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  g.save(); g.globalCompositeOperation = "lighter";
  // ชาร์จที่หมัด
  if (p < H + 0.05) glow(g, A.bx + ux * A.s * 0.25, A.hy + uy * A.s * 0.25, A.s * (0.18 + 0.15 * (p / H)), cowl ? GREEN : SKY, 0.7);
  if (cowl && !lowQ && p < H + 0.15) crackle(g, A, p * 900, 4, 0.9, 0.5, seed);
  // เส้นหมัด
  const sw = clamp01((p - H * 0.5) / (H * 0.5));
  if (sw > 0 && p < H + 0.2) {
    const hx = A.bx + dx * sw, hyy = A.hy + dy * sw, fade = 1 - clamp01((p - H) / 0.2);
    streak(g, hx, hyy, ux, uy, A.s * 0.6, A.s * 0.09, fade * 0.9, cowl ? BOLT : WIND);
    if (cowl) bolt(g, A.bx, A.hy, hx, hyy, seed + Math.floor(p * 20), A.s * 0.08, A.s * 0.015, fade);
  }
  g.restore();
  // ปะทะ: วงลม + เส้นลมกระจาย
  const hq = (p - H) / (1 - H);
  if (hq >= 0 && hq <= 1) {
    g.save(); g.globalCompositeOperation = "lighter";
    if (hq < 0.15) glow(g, B.bx, B.hy, B.s * 0.6, cowl ? GREEN : SKY, (1 - hq / 0.15) * 0.8);
    ring(g, B.bx, B.by - B.s * 0.05, B.s * (0.2 + 0.6 * easeOut(hq)), B.s * 0.05, (1 - hq) * 0.8);
    for (let i = 0; i < (lowQ ? 4 : 8); i++) {
      const ang = Math.atan2(uy, ux) + (hash(seed + i) - 0.5) * 1.6, d = B.s * (0.2 + 0.7 * easeOut(hq));
      streak(g, B.bx + Math.cos(ang) * d, B.hy + Math.sin(ang) * d, Math.cos(ang), Math.sin(ang), B.s * 0.3, B.s * 0.03, (1 - hq) * 0.8);
    }
    if (cowl && !lowQ && hq < 0.5) crackle(g, B, hq * 600, 3, 1 - hq * 2, 0.5, seed + 5);
    g.restore();
  }
}

// ---------- Smash ----------
//  อ้างอิงคลิปของผู้ใช้: ชาร์จ = แขนเรืองแดงส้ม เส้นเลือดชมพูแดงแตก (1,000,000% + สายฟ้าเขียว) →
//  ปะทะ = ประกายขาวแตกเป็นหนามรอบหมัด → กำแพงลมขาวเทาพัดข้ามทั้งจอ เส้นความเร็วเทาเข้ม → ฝุ่นควันค้างคลุมทั้งฉากแล้วค่อยจาง
const VEIN = "255,70,120", HOT = "255,150,60", FOG = "214,214,222", FOG_D = "120,122,134", BROWN = "150,60,50";
// ประกายขาวแตกเป็นหนาม (starburst) — r = รัศมี, n = จำนวนหนาม
function starburst(g, x, y, r, n, seed, a, rot = 0) {
  if (a <= 0 || r <= 0) return;
  g.save(); g.translate(x, y); g.rotate(rot);
  const shape = (k) => {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const ang = (i / (n * 2)) * TAU, out = i % 2 === 0;
      const rr = (out ? r * (0.7 + 0.45 * hash(seed + i)) : r * (0.28 + 0.12 * hash(seed + i * 1.7))) * k;
      const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
  };
  g.fillStyle = rgba(FOG_D, a * 0.55); shape(1.08); g.fill();
  g.fillStyle = rgba("245,245,250", a); shape(1); g.fill();
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.6);
  gr.addColorStop(0, rgba(WHITE, a)); gr.addColorStop(1, rgba("235,235,242", 0));
  g.fillStyle = gr; shape(0.6); g.fill();
  g.restore();
}
function puff(g, x, y, r, a, rgb = FOG) {
  if (a <= 0 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, r * 0.15, x, y, r);
  gr.addColorStop(0, rgba(rgb, a)); gr.addColorStop(0.65, rgba(rgb, a * 0.7)); gr.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
// แขนชาร์จ: แสงแดงส้ม + เส้นเลือดชมพูแดงแตกรอบหมัด (+ สายฟ้าเขียว)
function chargeArm(g, A, fist, t, q, big, cowl, seed, lowQ) {
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, fist.x, fist.y, A.s * (0.3 + 0.5 * q) * (big ? 1.8 : 1), HOT, 0.45 + 0.45 * q, "255,235,200");
  glow(g, A.bx, A.hy, A.s * 0.7 * (big ? 1.5 : 1), VEIN, 0.2 + 0.25 * q, VEIN);
  const step = Math.floor(t / 60);
  const veins = lowQ ? 3 : big ? 9 : 5;
  for (let i = 0; i < veins; i++) {
    const ang = hash(seed + i * 5 + step) * TAU, r = A.s * (0.35 + 0.35 * hash(seed + i)) * (big ? 1.6 : 1);
    bolt(g, fist.x, fist.y, fist.x + Math.cos(ang) * r, fist.y + Math.sin(ang) * r * 0.75, seed + i + step, A.s * 0.06, A.s * 0.012, q, VEIN);
  }
  if ((big || cowl) && !lowQ) crackle(g, A, t, big ? 12 : 6, 0.7 + 0.3 * q, big ? 1.1 : 0.7, seed + 9);
  g.restore();
}
// 1,000,000%: ทั้งจอ — ชาร์จ = จอมืดลง + เส้นโฟกัสสีสลับ (ฟ้า/เขียว/ชมพู/เหลือง ตามต้นคลิป) วิ่งเข้าหาหมัด · ปะทะ = แฟลชขาวเต็มจอ
const FOCUS = ["90,200,255", "80,255,140", "255,70,220", "255,235,90"];
function millionScreen(g, fist, t, beat, seed, lowQ) {
  const m = g.getTransform(), cv = g.canvas, W = cv.width, H = cv.height, U = Math.min(W, H) / 800;
  const sx = m.a * fist.x + m.c * fist.y + m.e, sy = m.b * fist.x + m.d * fist.y + m.f;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  if (t < beat) {
    const q = clamp01(t / beat);
    g.fillStyle = `rgba(6,8,14,${0.55 * easeOut(q)})`; g.fillRect(0, 0, W, H);
    const col = FOCUS[Math.floor(t / 180) % FOCUS.length], R = Math.hypot(W, H);
    g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    const n = lowQ ? 30 : 90;
    for (let i = 0; i < n; i++) {
      const ang = hash(seed + i * 1.9) * TAU, k = ((hash(seed + i * 3.3) + t / 260) % 1);
      const r0 = R * (0.12 + 0.8 * (1 - k)), len = R * (0.1 + 0.25 * hash(seed + i));
      g.strokeStyle = rgba(i % 5 ? col : WHITE, (0.25 + 0.6 * q) * (0.4 + 0.6 * hash(seed + i * 7)));
      g.lineWidth = Math.max(1, U * (1.5 + 5 * hash(seed + i * 2.2)));
      g.beginPath(); g.moveTo(sx + Math.cos(ang) * r0, sy + Math.sin(ang) * r0);
      g.lineTo(sx + Math.cos(ang) * (r0 + len), sy + Math.sin(ang) * (r0 + len)); g.stroke();
    }
    glow(g, sx, sy, U * (80 + 260 * q), GREEN, 0.4 + 0.4 * q);
    // ประกายรูปกากบาทที่หมัด (แบบต้นคลิป)
    for (const a of [0.6, -0.6]) {
      g.save(); g.translate(sx, sy); g.rotate(a);
      const L = U * (200 + 500 * q);
      const gr = g.createLinearGradient(-L, 0, L, 0);
      gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.5, rgba(WHITE, 0.9 * q)); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr; g.fillRect(-L, -U * 6 * (1 + q), L * 2, U * 12 * (1 + q));
      g.restore();
    }
  } else {
    const k = (t - beat) / 450;
    if (k < 1) { g.fillStyle = `rgba(255,255,250,${0.95 * (1 - k)})`; g.fillRect(0, 0, W, H); }
  }
  g.restore();
}
function smashFx(g, e, now, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1);
  const v = DIRS[e.dir] || [1, 0];
  const big = e.form === "million", wide = e.form === "detroit" || big;
  const dur = e.dur || smashDur(e.form);
  const beat = big ? MIDORIYA_T.million : MIDORIYA_T.smash;
  const t = p * dur;
  const [fx0, fy0] = P(e.x + 0.5 + v[0] * 0.45, e.y + 0.5 + v[1] * 0.45);
  const fist = { x: fx0, y: fy0 - A.s * 0.42 };
  // ทิศบนจอ
  const [dx1, dy1] = P(e.x + 0.5 + v[0] * 4, e.y + 0.5 + v[1] * 4);
  const ang = Math.atan2(dy1 - fy0, dx1 - fx0);
  // 1) ชาร์จ
  if (big) millionScreen(g, fist, t, beat, seed, lowQ);
  if (t < beat + 60) chargeArm(g, A, fist, t, clamp01(t / beat), big, e.cowl, seed, lowQ);
  const wt = t - beat;
  if (wt < 0) return;
  const after = dur - beat;
  const q = clamp01(wt / after);
  // 2) ประกายหนามที่หมัด
  if (wt < 520) {
    const k = wt / 520;
    starburst(g, fist.x, fist.y, A.s * (0.6 + (big ? 3.2 : wide ? 2.4 : 1.8) * easeOut(k)), lowQ ? 14 : 26, seed + Math.floor(wt / 90), 1 - k * k, ang);
  }
  // 3) ทั้งจอ: กำแพงลม → ฝุ่นควันค้าง (พิกัดจอ)
  const cv = g.canvas, W = cv.width, H = cv.height, U = Math.min(W, H) / 800;
  const m = g.getTransform();
  const sx = m.a * fist.x + m.c * fist.y + m.e, sy = m.b * fist.x + m.d * fist.y + m.f;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  const span = Math.hypot(W, H) * 1.25;
  const frontT = big ? 520 : 380;
  const front = span * easeOut(clamp01(wt / frontT));
  const hold = big ? 0.55 : 0.42;
  const fade = q < hold ? 1 : 1 - clamp01((q - hold) / (1 - hold));
  const peak = (big ? 0.97 : wide ? 0.93 : 0.88) * fade;
  // ม่านลมตามแนวพัด (หน้าคลื่นคมแล้วค่อยกลืนทั้งจอ)
  g.save(); g.translate(sx, sy); g.rotate(ang);
  const gr = g.createLinearGradient(-span * 0.15, 0, front, 0);
  gr.addColorStop(0, rgba(FOG, peak * 0.85)); gr.addColorStop(0.8, rgba(FOG, peak)); gr.addColorStop(1, rgba("250,250,255", 0));
  g.fillStyle = gr; g.fillRect(-span * 0.15, -span, front + span * 0.15, span * 2);
  g.restore();
  // ฝุ่นท่วมทั้งจอ (ด้านหลังหมัดด้วย)
  const cover = clamp01((wt - frontT * 0.6) / 300) * peak * (big ? 0.92 : 0.8);
  if (cover > 0) { g.fillStyle = rgba(FOG, cover); g.fillRect(0, 0, W, H); }
  if (big && cover > 0) { g.fillStyle = rgba(BROWN, cover * 0.28); g.fillRect(0, 0, W, H); }
  // ก้อนฝุ่นควันม้วน (ทั้งจอ ลอยไปตามทิศ)
  const ux = Math.cos(ang), uy = Math.sin(ang);
  const nP = lowQ ? 10 : big ? 42 : 28;
  for (let i = 0; i < nP; i++) {
    const h1 = hash(seed + i * 3.1), h2 = hash(seed + i * 7.7), h3 = hash(seed + i * 1.3);
    const along = (h1 - 0.15) * span, side = (h2 - 0.5) * span * 1.1;
    if (along > front) continue;
    const drift = wt * (0.35 + h3 * 0.5) * U;
    const x = sx + ux * (along + drift) - uy * side, y = sy + uy * (along + drift) + ux * side;
    const r = U * (110 + 190 * h3) * (big ? 1.4 : 1) * (0.7 + 0.5 * clamp01(wt / 900));
    puff(g, x, y, r, fade * (0.35 + 0.35 * h2), i % 3 ? FOG : FOG_D);
  }
  // เส้นความเร็ว (เทาเข้ม + ขาว) พุ่งข้ามจอ
  const nS = lowQ ? 24 : big ? 120 : 80;
  g.lineCap = "round";
  for (let i = 0; i < nS; i++) {
    const h1 = hash(seed + i * 2.3), h2 = hash(seed + i * 5.9), h3 = hash(seed + i * 8.1);
    const speed = (2.2 + 2.5 * h3) * U * (big ? 1.3 : 1);
    const along = ((h1 * span + wt * speed) % (span * 1.2)) - span * 0.1;
    if (along > front + 80 * U) continue;
    const side = (h2 - 0.5) * span * 1.1;
    const x = sx + ux * along - uy * side, y = sy + uy * along + ux * side;
    const len = U * (120 + 380 * h3);
    g.strokeStyle = rgba(i % 4 === 0 ? "250,250,255" : i % 7 === 0 && big ? VEIN : "70,72,84", fade * (0.35 + 0.45 * h2));
    g.lineWidth = Math.max(1, U * (2 + 7 * h1));
    g.beginPath(); g.moveTo(x - ux * len, y - uy * len); g.lineTo(x, y); g.stroke();
  }
  // เศษหินปลิว
  if (!lowQ) {
    for (let i = 0; i < (big ? 40 : 22); i++) {
      const h1 = hash(seed + i * 4.4), h2 = hash(seed + i * 9.2);
      const along = wt * (1.4 + 1.8 * h1) * U, side = (h2 - 0.5) * U * 500 * (1 + wt / 1200);
      if (along > front) continue;
      const x = sx + ux * along - uy * side, y = sy + uy * along + ux * side;
      const r = U * (4 + 9 * h2);
      g.fillStyle = rgba("85,78,70", fade * 0.9);
      g.save(); g.translate(x, y); g.rotate(wt / 90 + i);
      g.fillRect(-r, -r * 0.6, r * 2, r * 1.2); g.restore();
    }
  }
  // 1,000,000%: สายฟ้าเขียว + แดงฟาดในพายุ
  if (big && !lowQ && fade > 0.2) {
    const step = Math.floor(wt / 80);
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 6; i++) {
      const a0 = hash(seed + i + step * 3) * span * 0.8, s0 = (hash(seed + i * 2 + step) - 0.5) * span * 0.8;
      const x0 = sx + ux * a0 - uy * s0, y0 = sy + uy * a0 + ux * s0;
      bolt(g, x0, y0, x0 + ux * 260 * U + uy * 60 * U, y0 + uy * 260 * U - ux * 60 * U, seed + i + step, 30 * U, 4 * U, fade, i % 2 ? BOLT : VEIN);
    }
  }
  g.restore();
}

// ---------- ร่างกายรับแรง ----------
function recoilFx(g, e, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1);
  const k = Math.min(1.6, 0.6 + (e.n || 1) / 10);
  const a = p < 0.12 ? p / 0.12 : 1 - clamp01((p - 0.5) / 0.5);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, A.bx, A.hy, A.s * 0.55 * k, RED, a * 0.5, "255,200,190");
  for (let i = 0; i < (lowQ ? 3 : 6); i++) {
    const ang = hash(seed + i * 4.1) * TAU, r = A.s * 0.38 * k;
    bolt(g, A.bx, A.hy, A.bx + Math.cos(ang) * r, A.hy + Math.sin(ang) * r * 0.9, seed + i, A.s * 0.05, A.s * 0.012, a, RED);
  }
  g.restore();
}

// ---------- Full Cowl ----------
function cowlFx(g, e, now, p, seed, lowQ) {
  const A = bodyAt(e.x, e.y, e.size || 1);
  const a = 1 - clamp01((p - 0.6) / 0.4);
  g.save(); g.globalCompositeOperation = "lighter";
  if (p < 0.2) glow(g, A.bx, A.hy, A.s * (0.4 + 1.2 * (p / 0.2)), GREEN, 1 - p / 0.2);
  ring(g, A.bx, A.by, A.s * (0.3 + 0.9 * easeOut(clamp01(p * 1.5))), A.s * 0.05, a * 0.8, GREEN);
  crackle(g, A, now, lowQ ? 5 : 12, a, 0.95, seed);
  for (let i = 0; i < (lowQ ? 4 : 10); i++) {
    const q = clamp01(p * 1.3 - hash(seed + i) * 0.3);
    const x = A.bx + (hash(seed + i * 3) - 0.5) * A.s * 0.8, y = A.by - A.s * 1.2 * easeOut(q);
    glow(g, x, y, A.s * 0.05, BOLT, (1 - q) * 0.9);
  }
  g.restore();
}

export function midoriyaFx(g, e, now, lowQ) {
  const dur = e.dur || MIDORIYA_FX_DUR[e.kind];
  const p = (now - e.t0) / dur;
  if (p < 0 || p > 1) return;
  const seed = ((e.t0 | 0) % 977) / 97;
  g.save();
  if (e.kind === "midoriyaPunch" || e.kind === "midoriyaPunchCowl") { if (e.to) punchFx(g, e, p, seed, lowQ, e.kind === "midoriyaPunchCowl"); }
  else if (e.kind === "midoriyaSmash") smashFx(g, e, now, p, seed, lowQ);
  else if (e.kind === "midoriyaRecoil") recoilFx(g, e, p, seed, lowQ);
  else if (e.kind === "midoriyaCowl") cowlFx(g, e, now, p, seed, lowQ);
  g.restore();
}

// ---------- ออร่าค้าง: Full Cowl ----------
export function midoriyaAuraBack(g, x, y, now, lowQ, alpha = 1) {
  const [bx, by, s] = P(x, y);
  g.save(); g.globalAlpha *= alpha; g.globalCompositeOperation = "lighter";
  glow(g, bx, by - s * 0.4, s * 0.55, DEEP, 0.35 + 0.12 * Math.sin(now / 130), GREEN);
  g.restore();
}
export function midoriyaAuraFront(g, x, y, now, lowQ, alpha = 1) {
  if (lowQ) return;
  const [bx, by, s] = P(x, y);
  g.save(); g.globalAlpha *= alpha;
  crackle(g, { bx, by, s, K: 1 }, now, 4, 0.85, 0.5, 3.3);
  g.restore();
}
