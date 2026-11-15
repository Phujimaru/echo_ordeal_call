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
export const smashDur = (form) => (form === "million" ? MIDORIYA_T.million + 2600 : MIDORIYA_T.smash + (form === "detroit" ? 2100 : 1900));

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
//  ปะทะ = ประกายขาวแตกเป็นหนามรอบหมัด → มวลลมก้อนใหญ่ลอยกลางอากาศซัดไปตามทิศ (รูปทรงกรวย/แนวตามท่า) แล้วสลาย
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
function billow(g, x, y, r, a, tint = null) {
  if (a <= 0 || r <= 0) return;
  puff(g, x + r * 0.12, y + r * 0.22, r * 1.02, a * 0.55, tint || FOG_D);
  puff(g, x, y, r, a * 0.95, tint ? tint : FOG);
  puff(g, x - r * 0.22, y - r * 0.28, r * 0.62, a * 0.9, "255,255,255");
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
// 1,000,000%: ต้นท่าอลังการแต่อยู่รอบตัวบนกระดาน (ผู้ใช้สั่ง 2026-11-15 — ไม่ทับจอ)
//  ชาร์จ = เส้นโฟกัสสีสลับ (ฟ้า/เขียว/ชมพู/เหลือง ตามต้นคลิป) วิ่งเข้าหาหมัด · ประกายกากบาทโตขึ้น · ออร่าเขียว + สายฟ้าพันตัว · เศษหินลอยจากพื้น
//  ปะทะ = แฟลชขาว + วงคลื่นกระแทกรอบตัว
const FOCUS = ["90,200,255", "80,255,140", "255,70,220", "255,235,90"];
function millionCharge(g, A, fist, t, beat, seed, lowQ) {
  const R = A.s * 3.4;
  g.save();
  if (t < beat) {
    const q = clamp01(t / beat), col = FOCUS[Math.floor(t / 170) % FOCUS.length];
    g.globalCompositeOperation = "lighter";
    // ออร่าเขียวใหญ่รอบตัว
    glow(g, A.bx, A.hy, A.s * (0.9 + 0.9 * q), GREEN, 0.25 + 0.35 * q, BOLT);
    // เส้นโฟกัสวิ่งเข้าหาหมัด (ในวงรอบตัว)
    g.lineCap = "round";
    const n = lowQ ? 18 : 56;
    for (let i = 0; i < n; i++) {
      const ang = hash(seed + i * 1.9) * TAU, k = (hash(seed + i * 3.3) + t / 300) % 1;
      const r0 = R * (0.18 + 0.82 * (1 - k)), len = R * (0.12 + 0.22 * hash(seed + i));
      const a = (0.25 + 0.65 * q) * Math.sin(k * Math.PI);
      g.strokeStyle = rgba(i % 4 ? col : WHITE, a);
      g.lineWidth = Math.max(1, A.s * (0.012 + 0.03 * hash(seed + i * 2.2)));
      g.beginPath();
      g.moveTo(fist.x + Math.cos(ang) * r0, fist.y + Math.sin(ang) * r0 * 0.75);
      g.lineTo(fist.x + Math.cos(ang) * (r0 + len), fist.y + Math.sin(ang) * (r0 + len) * 0.75);
      g.stroke();
    }
    // ประกายกากบาทที่หมัด
    for (const rot of [0.62, -0.62]) {
      g.save(); g.translate(fist.x, fist.y); g.rotate(rot);
      const L = A.s * (0.5 + 2.2 * q), w = A.s * (0.03 + 0.05 * q);
      const gr = g.createLinearGradient(-L, 0, L, 0);
      gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.5, rgba(WHITE, 0.95 * q)); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr; g.fillRect(-L, -w, L * 2, w * 2);
      g.restore();
    }
    glow(g, fist.x, fist.y, A.s * (0.3 + 0.7 * q), col, 0.6 * q);
    // สายฟ้าเขียวพันตัว
    if (!lowQ) crackle(g, A, t, 16, 0.6 + 0.4 * q, 1.4, seed + 21);
    g.globalCompositeOperation = "source-over";
    // เศษหินลอยขึ้นจากพื้นรอบตัว
    if (!lowQ) for (let i = 0; i < 14; i++) {
      const h1 = hash(seed + i * 6.1), h2 = hash(seed + i * 2.7);
      const ang = h1 * TAU, d = A.s * (0.5 + 1.1 * h2);
      const rise = A.s * (0.1 + 0.9 * h1) * easeOut(clamp01(q * 1.3 - h2 * 0.3));
      const x = A.bx + Math.cos(ang) * d, y = A.by + Math.sin(ang) * d * 0.5 - rise;
      const r = A.s * (0.03 + 0.04 * h1);
      g.fillStyle = rgba("85,78,70", 0.9 * q);
      g.save(); g.translate(x, y); g.rotate(t / 400 + i); g.fillRect(-r, -r * 0.7, r * 2, r * 1.4); g.restore();
    }
  } else {
    const k = (t - beat) / 520;
    if (k < 1) {
      g.globalCompositeOperation = "lighter";
      glow(g, fist.x, fist.y, A.s * (1.2 + 2.6 * easeOut(k)), WHITE, (1 - k) * 0.95, WHITE);
      g.globalCompositeOperation = "source-over";
      ring(g, A.bx, A.by, A.s * (0.5 + 3.2 * easeOut(k)), A.s * 0.08 * (1 - k), (1 - k) * 0.9, "245,245,250");
      ring(g, A.bx, A.by, A.s * (0.3 + 2.2 * easeOut(k)), A.s * 0.05 * (1 - k), (1 - k) * 0.8, GREEN);
    }
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
  if (big) millionCharge(g, A, fist, t, beat, seed, lowQ);
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
  // 3) มวลลมก้อนใหญ่ซัดออกไปตามทิศ (ผู้ใช้สั่ง 2026-11-15: ลมขนาดใหญ่ ซัดไปตามทิศ รูปทรงกรวย · ไม่ทับจอ · ไม่ใช่ของนิ่งบนพื้น)
  //  ลอยกลางอากาศ (ยกจากพื้น) · หน้าคลื่น = สันลมขาวม้วนหนา วิ่งจากหมัดถึงปลายระยะแล้วพุ่งเลยออกไปสลาย
  //  ตัวลมด้านหลังหน้าคลื่น = กรวยบานออก (กรวย) / แถบกว้างคงที่ (แนว) + เส้นลมหมุนวนพุ่งตาม
  const len = Math.max(1, Number(e.len) || (e.tiles && e.tiles.length ? Math.max(...e.tiles.map((c) => (c.x - e.x) * v[0] + (c.y - e.y) * v[1])) : 5));
  const cone = e.cone !== undefined ? !!e.cone : e.form !== "throw" && e.form !== "delaware";
  const halfLine = Math.max(0.5, (Number(e.width) || (e.form === "delaware" ? 3 : 1)) / 2);
  const hwAt = (a) => (cone ? Math.max(0.35, a - 0.15) : halfLine) * (big ? 1.08 : 1);
  const side = [-v[1], v[0]];
  const lift = big ? 0.55 : 0.42; // ยกจากพื้น (เท่าของขนาดช่อง)
  // (ระยะตามแนว a, ระยะขวาง l) → จุดบนจอ ลอยกลางอากาศ
  const pt = (a, l, up = 0) => {
    const [x, y, s] = P(e.x + 0.5 + v[0] * a + side[0] * l, e.y + 0.5 + v[1] * a + side[1] * l);
    return [x, y - s * (lift + up), s];
  };
  const travel = big ? 620 : 460; // ms ที่หน้าคลื่นวิ่งถึงปลายระยะ
  const reach = len + 0.5;
  const front = (reach + (big ? 2 : 1.4)) * easeOut(clamp01(wt / (travel * 1.35)));
  const tail = Math.max(0.3, front - (big ? 6 : 4.2) * clamp01(wt / (travel * 1.6))); // ท้ายลมตามหน้าคลื่นไป
  const fade = 1 - clamp01((q - 0.45) / 0.55);
  const over = clamp01((front - reach) / 1.6); // พุ่งเลยปลายระยะ = จางลง
  const alpha = fade * (1 - over * 0.85);
  if (alpha > 0) {
    // ตัวลม: กรวย/แถบโปร่งแสง ไล่จากท้าย (จาง) → หน้าคลื่น (ทึบ)
    const N = 14, L = [], R = [];
    for (let i = 0; i <= N; i++) {
      const a = tail + (front - tail) * (i / N), hw = hwAt(Math.min(a, reach + 1));
      L.push(pt(a, -hw)); R.push(pt(a, hw));
    }
    const [tx, ty] = pt(tail, 0), [fx2, fy2] = pt(front, 0);
    const gr = g.createLinearGradient(tx, ty, fx2, fy2);
    gr.addColorStop(0, rgba(FOG, 0)); gr.addColorStop(0.55, rgba(FOG, alpha * 0.22)); gr.addColorStop(1, rgba("248,248,252", alpha * 0.4));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(L[0][0], L[0][1]);
    for (const p2 of L) g.lineTo(p2[0], p2[1]);
    for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
    g.closePath(); g.fill();
    // ขอบลมสีเทาเข้มสองข้าง (ให้เห็นรูปทรงกรวย)
    g.lineCap = "round"; g.lineJoin = "round";
    for (const edge of [L, R]) {
      g.strokeStyle = rgba(FOG_D, alpha * 0.6); g.lineWidth = Math.max(1, edge[N][2] * 0.05);
      g.beginPath(); g.moveTo(edge[0][0], edge[0][1]); for (const p2 of edge) g.lineTo(p2[0], p2[1]); g.stroke();
    }
    // ตัวลมฟู: ก้อนเมฆลมนูนหลายชั้น สูงต่ำต่างกัน พองตัว + ม้วนไปข้างหน้า (วาดไกล → ใกล้)
    const body = [];
    const nB = lowQ ? 14 : big ? 70 : 46;
    for (let i = 0; i < nB; i++) {
      const h1 = hash(seed + i * 1.37), h2 = hash(seed + i * 4.91), h3 = hash(seed + i * 7.33);
      const a = tail + (front - tail) * Math.pow(h1, 0.7);
      if (a < 0.4) continue;
      const hw = hwAt(Math.min(a, reach + 1));
      const l = (h2 - 0.5) * 2 * hw * 0.95;
      const roll = Math.sin(wt / (180 + 120 * h3) + i) * 0.12;
      const up = 0.05 + 0.75 * h3 + roll;
      const age = clamp01((front - a) / 2.2);
      const [px, py, sc] = pt(a, l, up);
      const r = sc * (0.28 + 0.3 * h3) * (0.75 + 0.6 * age) * (big ? 1.25 : 1) * (cone ? 0.7 + 0.3 * Math.min(1, a / reach) * 1.4 : 1);
      body.push({ px, py, r, d: a, k: (1 - 0.55 * age) * (0.7 + 0.3 * h2), tint: big && i % 4 === 1 ? BROWN : null });
    }
    body.sort((u, w) => w.d - u.d);
    for (const b of body) billow(g, b.px, b.py, b.r, alpha * b.k, b.tint);
    // เส้นลมหมุนวน (โค้ง) พุ่งไปข้างหน้าในตัวลม
    const nS = lowQ ? 8 : big ? 34 : 22;
    for (let i = 0; i < nS; i++) {
      const h1 = hash(seed + i * 2.3), h2 = hash(seed + i * 5.9), h3 = hash(seed + i * 8.1);
      const a = tail + (front - tail) * ((h1 + wt / (300 + 300 * h3)) % 1);
      const hw = hwAt(Math.min(a, reach + 1)), l = (h2 - 0.5) * 2 * hw * 0.9;
      const segLen = 0.6 + 1.2 * h3, curl = (h2 - 0.5) * 0.8;
      const p0 = pt(a - segLen, l - curl, 0.15 * h1), p1 = pt(a - segLen * 0.5, l + curl * 0.5, 0.3 * h1), p2 = pt(a, l, 0.1 * h3);
      g.strokeStyle = rgba(i % 3 === 0 ? "70,72,84" : big && i % 5 === 1 ? VEIN : "255,255,255", alpha * (0.45 + 0.45 * h3));
      g.lineWidth = Math.max(1, p2[2] * (0.02 + 0.035 * h1));
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); g.stroke();
    }
    // หน้าคลื่น: สันลมขาวม้วนหนาตลอดความกว้าง
    const hwF = hwAt(Math.min(front, reach + 1)), nC = Math.max(4, Math.ceil(hwF * 2 / 0.32));
    for (let i = 0; i <= nC; i++) {
      const l = -hwF + (2 * hwF) * (i / nC), h1 = hash(seed + i * 4.7 + Math.floor(wt / 120));
      const [px, py, s] = pt(front - 0.15 * h1, l, 0.2 * Math.sin(i * 1.7 + wt / 90));
      billow(g, px, py, s * (0.4 + 0.24 * h1) * (big ? 1.3 : 1), alpha, big && i % 3 === 1 ? BROWN : null);
      if (!lowQ && i % 2 === 0) { const [qx, qy, qs] = pt(front - 0.35, l, 0.55 + 0.3 * h1); billow(g, qx, qy, qs * (0.3 + 0.2 * h1) * (big ? 1.3 : 1), alpha * 0.9); }
    }
    // เศษหินปลิวไปกับลม
    if (!lowQ) for (let i = 0; i < (big ? 18 : 10); i++) {
      const h1 = hash(seed + i * 4.4), h2 = hash(seed + i * 9.2);
      const a = front - 0.2 - 1.4 * h1, hw = hwAt(Math.max(0.5, Math.min(a, reach + 1)));
      if (a < tail) continue;
      const [px, py, s] = pt(a, (h2 - 0.5) * 2 * hw, 0.3 * Math.sin(h1 * 9 + wt / 150));
      const r = s * (0.025 + 0.03 * h2);
      g.fillStyle = rgba("85,78,70", alpha * 0.9);
      g.save(); g.translate(px, py); g.rotate(wt / 80 + i); g.fillRect(-r, -r * 0.6, r * 2, r * 1.2); g.restore();
    }
    // 1,000,000%: สายฟ้าเขียว/แดงฟาดในตัวลม
    if (big && !lowQ) {
      const step = Math.floor(wt / 85);
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) {
        const a = tail + (front - tail) * hash(seed + i * 3 + step), hw = hwAt(Math.min(a, reach + 1));
        const l = (hash(seed + i * 7 + step) - 0.5) * 2 * hw;
        const [x0, y0, s] = pt(a - 0.7, l), [x1, y1] = pt(a + 0.3, l + (hash(seed + i + step) - 0.5));
        bolt(g, x0, y0, x1, y1, seed + i + step, s * 0.12, s * 0.016, alpha, i % 2 ? BOLT : VEIN);
      }
      g.restore();
    }
  }
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
