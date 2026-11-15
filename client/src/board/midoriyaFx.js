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
const VEIN = "255,70,120", HOT = "255,150,60", FOG = "214,214,222", FOG_D = "120,122,134";
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
  const big = e.form === "million";
  const dur = e.dur || smashDur(e.form);
  const beat = big ? MIDORIYA_T.million : MIDORIYA_T.smash;
  const t = p * dur;
  const [fx0, fy0] = P(e.x + 0.5 + v[0] * 0.45, e.y + 0.5 + v[1] * 0.45);
  const fist = { x: fx0, y: fy0 - A.s * 0.42 };
  // 1) ชาร์จ
  if (big) millionCharge(g, A, fist, t, beat, seed, lowQ);
  if (t < beat + 60) chargeArm(g, A, fist, t, clamp01(t / beat), big, e.cowl, seed, lowQ);
  const wt = t - beat;
  if (wt < 0) return;
  const after = dur - beat;
  const q = clamp01(wt / after);
  // 3) แรงลมแบบในเรื่อง (ศึกษาเฟรมคลิปของผู้ใช้ 2026-11-15):
  //  a) ก้อนอากาศกลมขาวขนาดใหญ่ ขอบหยัก ลายหนามเทา พุ่งจากหมัดไปตามทิศ ขยายตามรูปทรงท่า
  //  b) เส้นความเร็วดำ (+ แดง) แผ่ออกจากหมัด
  //  c) สายลมโปร่งแสงขาวลากยาวพุ่งไปตามทิศ (เบลอแบบเคลื่อนไหว) + เศษอากาศแหลมปลิวไปข้างหน้า — ในพื้นที่ท่าเท่านั้น
  const len = Math.max(1, Number(e.len) || (e.tiles && e.tiles.length ? Math.max(...e.tiles.map((c) => (c.x - e.x) * v[0] + (c.y - e.y) * v[1])) : 5));
  const cone = e.cone !== undefined ? !!e.cone : e.form !== "throw" && e.form !== "delaware";
  const halfLine = Math.max(0.5, (Number(e.width) || (e.form === "delaware" ? 3 : 1)) / 2);
  const hwAt = (a) => (cone ? Math.max(0.35, a - 0.15) : halfLine);
  const side = [-v[1], v[0]];
  const lift = 0.45;
  const pt = (a, l, up = 0) => {
    const [x, y, s] = P(e.x + 0.5 + v[0] * a + side[0] * l, e.y + 0.5 + v[1] * a + side[1] * l);
    return [x, y - s * (lift + up), s];
  };
  const reach = len + 0.5;
  const fade = 1 - clamp01((q - 0.5) / 0.5);
  // ทิศบนจอ + มุมกว้างของกรวยบนจอ
  const [ax, ay] = pt(0.4, 0), [bx2, by2] = pt(reach, 0), [cx2, cy2] = pt(reach, hwAt(reach));
  const dirA = Math.atan2(by2 - ay, bx2 - ax);
  const spread = Math.max(0.12, Math.abs(Math.atan2(cy2 - ay, cx2 - ax) - dirA));
  const reachPx = Math.hypot(bx2 - ax, by2 - ay);
  // b) เส้นความเร็วดำ/แดงแผ่ออกจากหมัด
  const lineA = fade * clamp01(1 - (wt - 500) / 900);
  if (lineA > 0) {
    g.lineCap = "round";
    const nL = lowQ ? 14 : big ? 46 : 32;
    for (let i = 0; i < nL; i++) {
      const h1 = hash(seed + i * 3.9), h2 = hash(seed + i * 6.2), h3 = hash(seed + i * 8.8);
      const wide = i % 5 === 0; // บางเส้นแผ่ทุกทิศ
      const ang = dirA + (h1 - 0.5) * 2 * (wide ? Math.PI * 0.85 : spread * 1.35 + 0.15);
      const r0 = reachPx * (0.15 + 0.5 * h2) * (0.5 + 0.5 * easeOut(clamp01(wt / 300)));
      const L = reachPx * (0.25 + 0.6 * h3) * easeOut(clamp01(wt / 250));
      g.strokeStyle = rgba(big && i % 4 === 1 ? VEIN : i % 7 === 3 ? "200,40,60" : "28,28,36", lineA * (0.5 + 0.4 * h3));
      g.lineWidth = Math.max(1, A.s * (0.008 + 0.022 * h1));
      g.beginPath();
      g.moveTo(fist.x + Math.cos(ang) * r0, fist.y + Math.sin(ang) * r0 * 0.82);
      g.lineTo(fist.x + Math.cos(ang) * (r0 + L), fist.y + Math.sin(ang) * (r0 + L) * 0.82);
      g.stroke();
    }
  }
  // a) ก้อนอากาศกลมขนาดใหญ่ (ผู้ใช้: "เป็นก้อนกลมขนาดใหญ่") ขอบหยัก ลายหนามเทาข้างใน แกนขาวสว่าง
  //  ระเบิดออกที่หมัด → พุ่งไปตามทิศถึงปลายระยะ ขยายตามรูปทรงท่า (กรวยบานออก / แนวคงที่) → พองแตกแล้วจาง
  const travel = big ? 700 : 520;
  const tk = clamp01(wt / travel);
  const ac = 0.5 + (reach - 0.3) * easeOut(tk);
  const ballA = fade * (tk < 1 ? 1 : 1 - clamp01((wt - travel) / (big ? 900 : 650)));
  if (ballA > 0) {
    const [bx0, by0, bs] = pt(ac, 0, 0.15);
    const pop = tk < 1 ? 0 : clamp01((wt - travel) / 600);
    const rT = (cone ? Math.max(0.9, hwAt(ac) * 1.05 + 0.5) : halfLine + 0.6) * (big ? 1.35 : 1) * (0.55 + 0.45 * easeOut(clamp01(wt / 160))) * (1 + 0.35 * pop);
    const R = bs * rT * 0.85;
    const n = lowQ ? 26 : 60;
    const spin = wt / 900;
    const blob = (sc, ox, oy, jitSeed) => {
      g.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const ang = (i / (n * 2)) * TAU + spin;
        const jag = hash(jitSeed + i * 1.7 + Math.floor(wt / 90) * 0.37);
        const lump = 0.5 * Math.sin(ang * 3 + jitSeed) + 0.3 * Math.sin(ang * 5 - jitSeed * 2 + wt / 300) + 0.2 * Math.sin(ang * 9 + jitSeed * 3);
        const r = R * sc * (0.9 + 0.1 * lump + (i % 2 === 0 ? 0.04 + 0.12 * jag : -0.02 * jag));
        const x = bx0 + ox + Math.cos(ang) * r, y = by0 + oy + Math.sin(ang) * r * 0.86;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath();
    };
    // เงาเทาด้านล่าง → ตัวก้อนขาว → แกนสว่าง
    blob(1.04, R * 0.08, R * 0.14, seed + 3); g.fillStyle = rgba(FOG_D, ballA * 0.7); g.fill();
    blob(1, 0, 0, seed + 7); g.fillStyle = rgba("238,238,244", ballA * 0.96); g.fill();
    // ลายหนามสีเทาแผ่จากกลางก้อน (แบบในคลิป)
    const nP = lowQ ? 8 : 22;
    for (let i = 0; i < nP; i++) {
      const h1 = hash(seed + i * 2.9), h2 = hash(seed + i * 5.1);
      const ang = h1 * TAU + spin * 1.5, r0 = R * (0.25 + 0.2 * h2), r1 = R * (0.7 + 0.25 * h2), w = R * (0.05 + 0.06 * h1);
      const ca = Math.cos(ang), sa = Math.sin(ang) * 0.86;
      g.fillStyle = rgba(i % 3 ? "168,170,182" : "140,142,156", ballA * 0.55);
      g.beginPath();
      g.moveTo(bx0 + ca * r0 - sa * w, by0 + sa * r0 + ca * w);
      g.lineTo(bx0 + ca * r1, by0 + sa * r1);
      g.lineTo(bx0 + ca * r0 + sa * w, by0 + sa * r0 - ca * w);
      g.closePath(); g.fill();
    }
    blob(0.45, -R * 0.06, -R * 0.08, seed + 11); g.fillStyle = rgba("255,255,255", ballA * 0.95); g.fill();
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, bx0, by0, R * 0.55, "255,255,255", ballA * 0.6, WHITE);
    if (big) glow(g, bx0, by0, R * 1.1, GREEN, ballA * 0.25, BOLT);
    g.restore();
  }
  // ระเบิดที่หมัดตอนปะทะ (วงขาวขอบหยักสั้นๆ)
  if (wt < 260) {
    const k = wt / 260, Rb = A.s * (0.5 + 1.2 * k) * (big ? 1.4 : 1);
    g.beginPath();
    for (let i = 0; i < 36; i++) {
      const ang = (i / 36) * TAU, r = Rb * (i % 2 ? 0.55 : 1) * (0.85 + 0.3 * hash(seed + i));
      const x = fist.x + Math.cos(ang) * r, y = fist.y + Math.sin(ang) * r * 0.86;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath(); g.fillStyle = rgba("255,255,255", (1 - k) * fade); g.fill();
  }
  // c) สายลมโปร่งแสงลากยาว + เศษอากาศแหลมปลิวไปข้างหน้า (ในพื้นที่ท่า)
  const streamA = fade * clamp01((wt - 120) / 250);
  if (streamA > 0) {
    const nS = lowQ ? 12 : big ? 46 : 30;
    g.lineCap = "round";
    for (let i = 0; i < nS; i++) {
      const h1 = hash(seed + i * 2.3), h2 = hash(seed + i * 5.9), h3 = hash(seed + i * 8.1);
      const run = (h1 + wt / (380 + 260 * h3)) % 1;
      const a = 0.4 + run * Math.max(0.6, ac - 0.2);
      const hw = hwAt(Math.min(a, reach));
      const l = (h2 - 0.5) * 2 * hw * 0.95;
      const segLen = (1.2 + 2.2 * h3) * (big ? 1.25 : 1);
      const p0 = pt(Math.max(0.3, a - segLen), l * Math.max(0.3, (a - segLen) / Math.max(0.5, a)) * (cone ? 1 : 0) + (cone ? 0 : l), 0.35 * h1);
      const p1 = pt(a, l, 0.35 * h1 + 0.08 * Math.sin(wt / 120 + i));
      const edge = Math.sin(run * Math.PI);
      const gr = g.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
      gr.addColorStop(0, rgba("255,255,255", 0)); gr.addColorStop(0.7, rgba(i % 4 === 0 ? FOG : "250,250,255", streamA * edge * 0.75)); gr.addColorStop(1, rgba("255,255,255", streamA * edge * 0.9));
      g.strokeStyle = gr;
      g.lineWidth = Math.max(1.5, p1[2] * (0.05 + 0.12 * h2) * (big ? 1.3 : 1));
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    }
    // เศษอากาศแหลม (สามเหลี่ยมยาว ขาว ขอบล่างเทา) ปลิวไปตามทิศ
    const nF = lowQ ? 8 : big ? 34 : 22;
    for (let i = 0; i < nF; i++) {
      const h1 = hash(seed + i * 4.4), h2 = hash(seed + i * 9.2), h3 = hash(seed + i * 1.9);
      const run = (h1 + wt / (300 + 200 * h3)) % 1;
      const a = 0.5 + run * Math.max(0.6, ac), hw = hwAt(Math.min(a, reach));
      const [px, py, s] = pt(a, (h2 - 0.5) * 2 * hw, 0.5 * h3);
      const Ls = s * (0.35 + 0.45 * h3) * (big ? 1.3 : 1), Ws = Ls * 0.16;
      const al = streamA * Math.sin(run * Math.PI);
      g.save(); g.translate(px, py); g.rotate(dirA + (h2 - 0.5) * 0.3);
      g.fillStyle = rgba(FOG_D, al * 0.6);
      g.beginPath(); g.moveTo(Ls * 0.5, Ws * 0.35); g.lineTo(-Ls * 0.5, -Ws * 0.2); g.lineTo(-Ls * 0.4, Ws * 1.25); g.closePath(); g.fill();
      g.fillStyle = rgba("250,250,255", al * 0.95);
      g.beginPath(); g.moveTo(Ls * 0.5, 0); g.lineTo(-Ls * 0.5, -Ws); g.lineTo(-Ls * 0.35, Ws); g.closePath(); g.fill();
      g.restore();
    }
    // 1,000,000%: สายฟ้าเขียว/แดงฟาดในสายลม
    if (big && !lowQ) {
      const step = Math.floor(wt / 85);
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) {
        const a = 0.6 + reach * hash(seed + i * 3 + step), hw = hwAt(Math.min(a, reach));
        const l = (hash(seed + i * 7 + step) - 0.5) * 2 * hw;
        const [x0, y0, s] = pt(a - 0.7, l), [x1, y1] = pt(a + 0.4, l + (hash(seed + i + step) - 0.5));
        bolt(g, x0, y0, x1, y1, seed + i + step, s * 0.12, s * 0.016, streamA, i % 2 ? BOLT : VEIN);
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
