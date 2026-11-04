// ============================================================
//  เอฟเฟกต์บนกระดานของมหาเทพอรชุน (characters/arjuna.js) — โทนเดียวกับฉาก Mahapralaya: ดาบปีกทอง · ใบดาบแดง/เหลือง/ชมพู/ฟ้า · ดาวเคราะห์สีพาสเทล
//
//  ตีปกติ (fx.kind = attackStyle) — fx { x, y (ช่องผู้ตี), size, to: { x, y } } · วาดตามคลิปต้นฉบับ · เสียงเริ่มพร้อมท่า (ARJ_SFX_LEAD)
//    arjunaBomb   ระเบิดลง: ดวงพลังจากมือพุ่งขึ้นฟ้า → ลำแสงสาดลงจากฟ้า → ก้อนพลังตกหนักเร่งแรง → กระแทกพื้น ลำแสงพุ่งขึ้น หินกระเด็น
//    arjunaArrow  ธนูยิง (ห่าง 2 ช่อง): คันธนูเล็กโผล่หันหาเป้า → ง้างชาร์จ สั่นแรง สายฟ้าฟาด → ปล่อย: คันดีดถอย ลำแสงหนาทะลุเป้า → ระเบิด
//  เหตุการณ์จาก server (socket "arjunaFx" { kind, id, at, size, color } → ARJ_EVENT_FX)
//    lamp / purge  ตะเกียงวิญญาณ + ขจัดสิ่งแปลกปลอม (ท่าเดียวกัน — ผู้ใช้สั่ง): ดาวเคราะห์ 5 ดวงกางออกรอบตัว · วงเดือนทองหมุน · คลื่นพลังผลักเศษมืดกระเจิง
//    jutti   จุติทำงาน: เสาแสงทอง + กลีบบัวบาน + ตะเกียงแตกเป็นดวงไฟ · ใครติดจุติก็เล่น
//    cut     Mahapralaya กลับมาที่กระดาน: ใบดาบหวดลงตามแนวแถบ → เว้นจังหวะ → ลำแสงฟุ้งสีๆ พุ่งจากพื้นทีละชุด → ชุดสุดท้าย พื้นถล่ม (ryougiFx crumble)
//  ตัวหมาก (u.arjuna = { jutti, purge }): จุติ = ตะเกียงลอยข้างหมาก · ขจัด = ดาวเคราะห์โคจร + วงฟ้า
//  lowQ = ตัดอนุภาคครึ่งหนึ่ง · ลดการเคลื่อนไหว = ไม่หมุน ไม่เต้น
// ============================================================
import { P, gEllipse, glow } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

export const ARJ_MS = { arjunaBomb: 2700, arjunaArrow: 3400 };
export const ARJ_SFX_LEAD = { arjunaBomb: 1600, arjunaArrow: 2200 }; // ms จากต้นเสียงถึงจังหวะปะทะ
// สับแผนที่ (ms ตามเสียง arj_slash): ฟาด · แดง · เหลือง · ชมพู · ฟ้า · ระเบิดสุดท้าย (= server CUT_SECONDS)
export const ARJ_CUT_BEATS = [450, 1650, 1950, 2200, 2450, 2800];
export const ARJ_HIT_P = { arjunaBomb: 1600 / 2700, arjunaArrow: 2200 / 3400 };
export const ARJ_FX_DUR = { ...ARJ_MS, arjunaPurge: 1600, arjunaJutti: 2100, arjunaCut: 4400 };
export const ARJ_EVENT_FX = { lamp: "arjunaPurge", purge: "arjunaPurge", jutti: "arjunaJutti", cut: "arjunaCut" };
export const isArjFx = (kind) => typeof kind === "string" && (kind in ARJ_FX_DUR);

const GOLD = "255,205,90", GOLD_HI = "255,245,200", LAMP = "255,170,70", WHITE = "255,255,255", CYAN = "60,240,255";
const BLADES = [ // สีใบดาบตามฉาก (สับแผนที่) · มุมที่พุ่งเข้าหาเป้า (เรเดียนบนจอ) · เริ่มช้าไปเล่มละนิด
  { rgb: "255,60,70", a: -0.35, d: 0 },
  { rgb: "255,205,40", a: 1.2, d: 0.07 },
  { rgb: "255,60,230", a: 0.5, d: 0.14 },
  { rgb: "70,235,255", a: 2.5, d: 0.21 },
];
const PLANETS = [["255,190,130", 0.3], ["70,240,240", 0.22], ["120,150,255", 0.26], ["250,235,170", 0.17], ["255,140,200", 0.2]];
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeIn2 = (t) => clamp01(t) * clamp01(t);
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const center = (e) => [e.x + (e.size || 1) / 2, e.y + (e.size || 1) / 2];
const prog = (e, now) => (now - e.t0) / (e.dur || ARJ_FX_DUR[e.kind] || 1000); // e.dur = หน้าทดสอบเล่นช้า

// ---------- ชิ้นส่วน ----------
// ตะเกียง: โครงเหล็ก + หูหิ้ว + แก้วเรืองแสง
function lantern(g, x, y, s, alpha, flame) {
  g.save(); g.translate(x, y); g.globalAlpha *= alpha;
  g.save(); g.globalCompositeOperation = "lighter"; glow(g, 0, 0, s * 2.2, LAMP, 0.55 * flame); glow(g, 0, 0, s * 0.9, GOLD_HI, 0.7 * flame); g.restore();
  g.strokeStyle = "#2a1a10"; g.lineWidth = Math.max(1, s * 0.09);
  g.beginPath(); g.arc(0, -s * 0.75, s * 0.28, Math.PI, 0); g.stroke();
  g.fillStyle = "#3a2616";
  g.beginPath(); g.moveTo(-s * 0.32, -s * 0.46); g.lineTo(-s * 0.14, -s * 0.72); g.lineTo(s * 0.14, -s * 0.72); g.lineTo(s * 0.32, -s * 0.46); g.closePath(); g.fill();
  g.fillRect(-s * 0.42, s * 0.46, s * 0.84, s * 0.14);
  const b = g.createRadialGradient(0, s * 0.08, 0, 0, s * 0.08, s * 0.5);
  b.addColorStop(0, "#fffbe0"); b.addColorStop(0.5, `rgba(255,210,120,${0.6 + 0.4 * flame})`); b.addColorStop(1, "rgba(200,110,30,.75)");
  g.fillStyle = b; g.beginPath(); g.ellipse(0, 0, s * 0.36, s * 0.47, 0, 0, TAU); g.fill();
  g.strokeStyle = "#2a1a10"; g.lineWidth = Math.max(0.8, s * 0.06);
  g.beginPath(); g.moveTo(-s * 0.4, -s * 0.46); g.lineTo(-s * 0.4, s * 0.46); g.moveTo(s * 0.4, -s * 0.46); g.lineTo(s * 0.4, s * 0.46); g.stroke();
  g.restore();
}
// ดาวเคราะห์ลูกกลมมีแสงขอบ
function planet(g, x, y, r, rgb, alpha) {
  g.save(); g.globalAlpha *= alpha;
  g.save(); g.globalCompositeOperation = "lighter"; glow(g, x, y, r * 2, rgb, 0.4); g.restore();
  const b = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  b.addColorStop(0, "#fffef0"); b.addColorStop(0.45, `rgb(${rgb})`); b.addColorStop(1, `rgba(${rgb},.85)`);
  g.fillStyle = b; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.restore();
}
// ลำแสงฟุ้ง 1 ลำ: ฐานร้อนบนพื้น · ลำแสงบานออกด้านบนแล้วจาง · แกนขาว · ควันแสงข้างลำ
function lightPillar(g, x, y, s, h, w, rgb, a, seed, now) {
  if (a <= 0.01 || h <= 1) return;
  const flick = REDUCED ? 1 : 0.9 + 0.1 * Math.sin(now / 37 + seed * 9);
  const body = (ww, top, rgbC, al) => {
    const gr = g.createLinearGradient(0, y, 0, y - h);
    gr.addColorStop(0, `rgba(${rgbC},${al})`); gr.addColorStop(0.45, `rgba(${rgbC},${al * 0.6})`); gr.addColorStop(1, `rgba(${rgbC},0)`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - ww, y); g.quadraticCurveTo(x - ww * 0.75, y - h * 0.5, x - ww * top, y - h); g.lineTo(x + ww * top, y - h); g.quadraticCurveTo(x + ww * 0.75, y - h * 0.5, x + ww, y); g.closePath(); g.fill();
  };
  body(w * flick, 1.1, rgb, 0.6 * a); // ทาสีทึบก่อน บนพื้นสว่างจะได้ยังเห็นสี
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, x, y, s * 1.6, rgb, 0.5 * a);
  body(w * 1.8 * flick, 1.5, rgb, 0.22 * a);
  body(w * 0.26, 0.7, WHITE, 0.75 * a);
  // ควันแสงลอยข้างลำ
  for (let i = 0; i < 5; i++) {
    const p = (now / 700 + hash01(seed * 3 + i)) % 1, side = i % 2 ? 1 : -1;
    glow(g, x + side * w * (0.7 + p * 1.4), y - h * p * 0.8, s * (0.4 + p * 0.5), rgb, 0.4 * a * (1 - p));
  }
  g.restore();
}
// ---------- ตีปกติ ----------
// ปะทะร่วม: แสงขาว + โดมฟ้า + วงคลื่น + รัศมีแสง + เศษประกาย · q = 0..1 หลังปะทะ
function impact(g, tx, ty, q, big, lowQ, dodge) {
  const [hx, hy, hs] = P(tx, ty, 0.3), k = easeOut3(q), fade = 1 - q;
  g.save(); g.globalCompositeOperation = "lighter";
  // ฉากตีซูมกล้องเข้า (hs ใหญ่ขึ้นมาก): แสงต้องสั้นและจางเร็ว ไม่งั้นขาวทั้งจอ
  glow(g, hx, hy, hs * big * (0.9 + k * 1.1), WHITE, (dodge ? 0.4 : 0.9) * fade * fade * fade * fade);
  glow(g, hx, hy, hs * big * (1.2 + k * 1.3), CYAN, 0.4 * fade * fade);
  for (let i = 0; i < 3; i++) {
    gEllipse(g, tx, ty, 0.4 + k * big * (2 + i * 0.9), 0.03, 48);
    g.strokeStyle = `rgba(${i === 1 ? "130,120,255" : CYAN},${0.9 * fade})`; g.lineWidth = Math.max(1, hs * 0.09 * fade); g.stroke();
  }
  g.translate(hx, hy);
  for (let i = 0; i < 12; i++) {
    const a = hash01(i + 40) * TAU, L = hs * big * (1.6 + hash01(i * 3) * 2.6) * k;
    g.save(); g.rotate(a); g.fillStyle = `rgba(${i % 3 ? "150,235,255" : WHITE},${fade})`;
    g.beginPath(); g.moveTo(0, -hs * 0.09); g.lineTo(L, 0); g.lineTo(0, hs * 0.09); g.closePath(); g.fill(); g.restore();
  }
  g.restore();
  for (let i = 0; i < (lowQ ? 10 : 22); i++) {
    const a = hash01(i * 3 + 1) * TAU, d = hs * big * (0.8 + hash01(i * 5) * 2.8) * k, r = hs * (0.03 + hash01(i * 7) * 0.05);
    g.fillStyle = `rgba(190,245,255,${fade})`;
    g.beginPath(); g.arc(hx + Math.cos(a) * d, hy + Math.sin(a) * d - hs * 0.5 * q * q, r, 0, TAU); g.fill();
  }
}
// ระเบิดลง: ms ตามคลิป — ดวงพลังบนมือ 0–450 · พุ่งขึ้นฟ้า 450–800 · ลำแสงสาดลง 750–1350 · ก้อนพลังตกหนัก 1000–1600 · กระแทกพื้น
function arjunaBomb(g, e, now, lowQ) {
  const T = clamp01(prog(e, now)) * ARJ_MS.arjunaBomb, [ax, ay] = center(e), tx = e.to.x + 0.5, ty = e.to.y + 0.5, HIT = ARJ_SFX_LEAD.arjunaBomb;
  // ดวงพลังบนมือ + ประกายลอยขึ้น
  const [hx, hy, hs] = P(ax, ay, 1.1 + smooth(450, 800, T) * 9);
  if (T < 820) {
    const a = smooth(0, 180, T) * (1 - smooth(720, 820, T));
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, hx, hy, hs * 1.3, "60,110,255", 0.8 * a); glow(g, hx, hy, hs * 0.5, WHITE, a); g.restore();
    for (let i = 0; i < (lowQ ? 6 : 14); i++) {
      const q = ((T / 500) + hash01(i)) % 1, [x, y, s] = P(ax + (hash01(i * 3) - 0.5) * 1.2, ay + (hash01(i * 5) - 0.5) * 1.2, 0.2 + q * 2);
      g.fillStyle = `rgba(110,170,255,${a * (1 - q)})`; g.beginPath(); g.arc(x, y, s * 0.03, 0, TAU); g.fill();
    }
  }
  // ลำแสงสาดลงจากจุดเหนือเป้า
  const [sx, sy, ss] = P(tx, ty, 11);
  const ray = smooth(750, 950, T) * (1 - smooth(1450, HIT + 100, T));
  if (ray > 0) {
    g.save(); g.globalCompositeOperation = "lighter"; g.translate(sx, sy);
    glow(g, 0, 0, ss * 1.4, CYAN, 0.6 * ray);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.12 + 0.76 * hash01(i + 9)) + (REDUCED ? 0 : Math.sin(T / 300 + i) * 0.05), L = ss * (9 + hash01(i * 2) * 7), w = ss * (0.1 + hash01(i * 4) * 0.2);
      g.save(); g.rotate(a);
      const gr = g.createLinearGradient(0, 0, L, 0), c = ["120,220,255", "120,100,255", "230,250,255"][i % 3];
      gr.addColorStop(0, `rgba(${c},${0.85 * ray})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, -w * 0.25); g.lineTo(L, -w); g.lineTo(L, w); g.lineTo(0, w * 0.25); g.closePath(); g.fill(); g.restore();
    }
    g.restore();
  }
  // เงาบนพื้นเข้มขึ้นเรื่อยๆ ก่อนกระแทก · หลังกระแทก = รอยไหม้
  if (T >= 1000) {
    const q = clamp01((T - 1000) / (HIT - 1000)), a = T < HIT ? q : 1 - smooth(HIT + 500, ARJ_MS.arjunaBomb, T);
    gEllipse(g, tx, ty, 0.5 + q * 1.3, 0.02, 40); g.fillStyle = `rgba(4,8,40,${0.7 * a})`; g.fill();
  }
  // ก้อนพลังตกหนัก: เร่งแรงช่วงท้าย · แกนขาวทึบ · เปลวลากยาวขึ้นฟ้า
  if (T >= 1000 && T < HIT) {
    const q = Math.pow((T - 1000) / (HIT - 1000), 3), z = 14 * (1 - q) + 0.4, [bx, by, bs] = P(tx, ty, z), [ux, uy] = P(tx, ty, z + 9), R = bs * 1.5;
    const tail = (w, c0) => {
      const gr = g.createLinearGradient(bx, by, ux, uy);
      gr.addColorStop(0, `rgba(${c0},1)`); gr.addColorStop(1, `rgba(${c0},0)`);
      g.fillStyle = gr; g.beginPath(); g.moveTo(bx - R * w, by); g.lineTo(ux, uy); g.lineTo(bx + R * w, by); g.closePath(); g.fill();
    };
    g.save(); g.globalCompositeOperation = "lighter"; tail(1.15, "50,190,255"); tail(0.6, WHITE); glow(g, bx, by, R * 2.2, CYAN, 0.6); g.restore();
    // เปลวพลังรอบก้อน
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + T / 90, L = R * (1.25 + hash01(i + Math.floor(T / 40)) * 0.55);
      g.fillStyle = i % 2 ? "#7fe8ff" : "#ffffff"; g.beginPath(); g.moveTo(bx + Math.cos(a - 0.3) * R * 0.9, by + Math.sin(a - 0.3) * R * 0.9); g.lineTo(bx + Math.cos(a) * L, by + Math.sin(a) * L); g.lineTo(bx + Math.cos(a + 0.3) * R * 0.9, by + Math.sin(a + 0.3) * R * 0.9); g.closePath(); g.fill();
    }
    const b = g.createRadialGradient(bx, by, R * 0.2, bx, by, R);
    b.addColorStop(0, "#ffffff"); b.addColorStop(0.65, "#f2fdff"); b.addColorStop(0.88, "#8cecff"); b.addColorStop(1, "#28b4f0");
    g.fillStyle = b; g.beginPath(); g.arc(bx, by, R, 0, TAU); g.fill();
  }
  // กระแทก: ลำแสงพุ่งจากจุดตก · คลื่นพื้น · หินกระเด็น
  if (T >= HIT) {
    const q = (T - HIT) / (ARJ_MS.arjunaBomb - HIT), [x, y, s] = P(tx, ty), rise = easeOut3(q / 0.2), fade = 1 - smooth(0.4, 1, q);
    lightPillar(g, x, y, s, s * 9 * rise, s * (1 + q), "90,215,255", fade, 7, now);
    for (const [ox, oy, h] of [[-0.9, 0.2, 5], [0.9, 0.1, 6], [0.1, -0.8, 4.5], [-0.3, 0.9, 4]]) { const [px, py, ps] = P(tx + ox * rise, ty + oy * rise); lightPillar(g, px, py, ps, ps * h * rise, ps * 0.5, "130,160,255", fade, ox * 9, now); }
    impact(g, tx, ty, q, 1.1, lowQ, e.dodge);
    for (let i = 0; i < (lowQ ? 7 : 14); i++) {
      const a = hash01(i + 70) * TAU, d = (0.7 + hash01(i * 3) * 2.2) * easeOut3(q / 0.7), z = (2.4 + hash01(i * 5) * 2.6) * Math.sin(Math.min(1, q * 1.7) * Math.PI), [rx, ry, rs] = P(tx + Math.cos(a) * d, ty + Math.sin(a) * d, z);
      g.save(); g.translate(rx, ry); g.rotate(a + q * 9); g.globalAlpha *= fade; g.fillStyle = i % 3 ? "#26305e" : "#44558f";
      const r = rs * (0.1 + hash01(i * 7) * 0.13); g.beginPath(); g.moveTo(-r, -r * 0.5); g.lineTo(r * 0.7, -r); g.lineTo(r, r * 0.6); g.lineTo(-r * 0.5, r); g.closePath(); g.fill(); g.restore();
    }
  }
}
// คันธนูตามคลิป: ใบมีดเงินเจียระไนสองกิ่งโค้งปลายแหลม · แถบครามด้านใน · ร่องวงแหวนเงินกลางคัน · ลูกปัดฟ้า + ลูกแก้วน้ำเงิน · สายแสงฟ้า
//  (x, y) = กลางคัน · dir = มุมที่เล็ง · s = ครึ่งความสูงคร่าวๆ · pull 0..1 = ง้างสาย (มีลูกศรแสงพาดสาย)
function moonBow(g, x, y, s, dir, alpha, pull) {
  g.save(); g.translate(x, y); g.rotate(dir); g.globalAlpha *= alpha;
  const tipX = -s * 0.42, tipY = s * 1.5;
  // สายแสง + ลูกศร
  const nx = lerp(tipX, -s * 1.15, pull);
  g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = "rgba(150,240,255,.95)"; g.lineWidth = Math.max(1, s * 0.022);
  g.beginPath(); g.moveTo(tipX, -tipY); g.lineTo(nx, 0); g.lineTo(tipX, tipY); g.stroke();
  if (pull > 0) {
    g.strokeStyle = `rgba(255,255,255,${pull})`; g.lineWidth = Math.max(1, s * 0.05);
    g.beginPath(); g.moveTo(nx, 0); g.lineTo(s * 1.1, 0); g.stroke();
    g.fillStyle = `rgba(180,245,255,${pull})`; g.beginPath(); g.moveTo(s * 1.35, 0); g.lineTo(s * 1.02, -s * 0.09); g.lineTo(s * 1.02, s * 0.09); g.closePath(); g.fill();
  }
  g.restore();
  for (const side of [-1, 1]) {
    g.save(); g.scale(1, side);
    const oc = [s * 0.92, s * 0.85], rc = [s * 0.66, s * 0.82], ic = [s * 0.42, s * 0.78], root = [s * 0.2, s * 0.12];
    const shape = (cA, cB) => { g.beginPath(); g.moveTo(root[0], root[1] - s * 0.05); g.quadraticCurveTo(cA[0], cA[1], tipX, tipY); g.quadraticCurveTo(cB[0], cB[1], root[0] - s * 0.1, root[1] + s * 0.05); g.closePath(); };
    // แถบครามด้านใน
    g.fillStyle = "#1c22b8"; shape(ic, [s * 0.16, s * 0.7]); g.fill();
    // หน้าเงินนอก (สว่าง) · หน้าใน (เงาฟ้าเหล็ก)
    const lit = g.createLinearGradient(0, 0, 0, tipY);
    lit.addColorStop(0, "#ffffff"); lit.addColorStop(0.45, "#dfe6ff"); lit.addColorStop(0.75, "#ffffff"); lit.addColorStop(1, "#b9c6ff");
    g.fillStyle = lit; shape(oc, rc); g.fill();
    const dim = g.createLinearGradient(0, 0, 0, tipY);
    dim.addColorStop(0, "#8d9ae8"); dim.addColorStop(0.5, "#5560c8"); dim.addColorStop(1, "#a9b8ff");
    g.fillStyle = dim; shape(rc, ic); g.fill();
    // รอยเจียระไนตัดขวาง + เส้นคมนอก
    g.strokeStyle = "rgba(40,50,150,.65)"; g.lineWidth = Math.max(0.6, s * 0.012);
    for (const [px, py, qx, qy] of [[0.62, 0.42, 0.46, 0.52], [0.5, 0.82, 0.34, 0.88], [0.26, 1.14, 0.14, 1.16]]) { g.beginPath(); g.moveTo(px * s, py * s); g.lineTo(qx * s, qy * s); g.stroke(); }
    g.strokeStyle = "#2a2f9a"; g.lineWidth = Math.max(0.7, s * 0.016); shape(oc, ic); g.stroke();
    g.restore();
  }
  // ร่องวงแหวนเงินกลางคัน
  for (let i = 0; i < 3; i++) {
    g.strokeStyle = i % 2 ? "#3a44b8" : "#eef2ff"; g.lineWidth = Math.max(0.8, s * 0.03);
    g.beginPath(); g.arc(-s * 0.06, 0, s * (0.26 + i * 0.075), -1.25, 1.25); g.stroke();
  }
  // ลูกปัดตามร่อง
  for (let i = 0; i < 5; i++) {
    const a = -1 + i * 0.5, r = s * 0.5;
    const bx = -s * 0.06 + Math.cos(a) * r, by = Math.sin(a) * r;
    g.fillStyle = "#3f6dff"; g.beginPath(); g.arc(bx, by, s * 0.042, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,.8)"; g.beginPath(); g.arc(bx - s * 0.012, by - s * 0.012, s * 0.014, 0, TAU); g.fill();
  }
  // ลูกแก้วน้ำเงิน
  const orb = g.createRadialGradient(-s * 0.1, -s * 0.07, s * 0.01, -s * 0.04, 0, s * 0.2);
  orb.addColorStop(0, "#d6e6ff"); orb.addColorStop(0.35, "#4a78ff"); orb.addColorStop(1, "#1426c8");
  g.fillStyle = orb; g.beginPath(); g.arc(-s * 0.04, 0, s * 0.19, 0, TAU); g.fill();
  g.restore();
}
// ธนูยิง: คันธนูโผล่ 300–700 · ง้างชาร์จ สั่นแรงขึ้นเรื่อยๆ 700–2140 · ปล่อย: คันธนูดีดถอย ลำแสงพลังหนาทะลุเป้าไปไกล 2150–2750 · ระเบิดที่เป้า
function arjunaArrow(g, e, now, lowQ) {
  const T = clamp01(prog(e, now)) * ARJ_MS.arjunaArrow, [ax, ay] = center(e), tx = e.to.x + 0.5, ty = e.to.y + 0.5, HIT = ARJ_SFX_LEAD.arjunaArrow, FIRE = 2150;
  const [ox, oy, os] = P(ax, ay, 0.9), [hx, hy] = P(tx, ty, 0.5), dir = Math.atan2(hy - oy, hx - ox), cd = Math.cos(dir), sd = Math.sin(dir);
  const c = smooth(700, FIRE - 40, T), fired = T >= FIRE, frame = Math.floor(T / 30);
  // ถอยจากแรงดีดตอนปล่อย · สั่นแรงขึ้นระหว่างชาร์จ
  const recoil = fired ? os * 1.1 * Math.exp(-(T - FIRE) / 170) : 0;
  const jit = REDUCED || fired ? 0 : os * 0.09 * c * c;
  const bx = ox + cd * os * 0.55 - cd * recoil + (hash01(frame) - 0.5) * jit * 2, by = oy + sd * os * 0.55 - sd * recoil + (hash01(frame + 7) - 0.5) * jit * 2;
  const show = smooth(300, 700, T) * (1 - smooth(2700, 3100, T)), R = os * 0.8;
  // พลังดูดเข้าหัวลูกศร
  const pc = c * (fired ? 0 : 1);
  if (pc > 0) {
    const nx = bx + cd * R * 1.2, ny = by + sd * R * 1.2;
    g.save(); g.globalCompositeOperation = "lighter"; g.translate(nx, ny);
    glow(g, 0, 0, os * (0.8 + pc * 1.8), "40,120,255", 0.9 * pc);
    glow(g, 0, 0, os * (0.3 + pc * 0.7), WHITE, pc);
    for (let i = 0; i < (lowQ ? 9 : 20); i++) {
      const a = hash01(i * 3) * TAU, q = (T / 300 + hash01(i * 7)) % 1, r0 = os * (0.5 + hash01(i * 5) * 3) * (1 - q), L = os * 0.9;
      g.strokeStyle = `rgba(${i % 3 ? "130,230,255" : "150,120,255"},${pc * q})`; g.lineWidth = os * 0.045;
      g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * (r0 + L), Math.sin(a) * (r0 + L)); g.stroke();
    }
    g.restore();
  }
  // สายฟ้าฟาดรอบคันระหว่างชาร์จ
  if (pc > 0.35 && !lowQ) {
    g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = `rgba(190,245,255,${pc})`; g.lineWidth = Math.max(1, os * 0.03);
    for (let i = 0; i < 3; i++) {
      let a = hash01(frame * 3 + i) * TAU, x = bx, y = by;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 5; s++) { a += (hash01(frame + i * 9 + s) - 0.5) * 1.8; x += Math.cos(a) * os * 0.4; y += Math.sin(a) * os * 0.3; g.lineTo(x, y); }
      g.stroke();
    }
    g.restore();
  }
  if (show > 0) moonBow(g, bx, by, R, dir, show, fired ? 0 : smooth(700, FIRE - 80, T));
  // ลำแสง: พุ่งถึงเป้าใน 50 ms ทะลุไปไกล ขอบหยักสั่น · หนาแล้วบีบหาย
  if (fired && T < 2800) {
    const q = (T - FIRE) / 650, reach = easeOut3((T - FIRE) / 50), far = Math.hypot(hx - bx, hy - by) + os * 7, Wd = os * 0.8 * (q < 0.55 ? 1 : 1 - smooth(0.55, 1, q));
    g.save(); g.translate(bx, by); g.rotate(dir);
    const Lb = far * reach, ribbon = (w, seed, fill, comp) => {
      g.globalCompositeOperation = comp; g.fillStyle = fill; g.beginPath(); g.moveTo(0, -w * 0.3);
      const n = lowQ ? 8 : 16;
      for (let i = 1; i <= n; i++) g.lineTo((i / n) * Lb, -w * (0.3 + 0.7 * Math.min(1, i / 4)) * (0.82 + hash01(i + seed + frame * 3) * 0.36));
      for (let i = n; i >= 1; i--) g.lineTo((i / n) * Lb, w * (0.3 + 0.7 * Math.min(1, i / 4)) * (0.82 + hash01(i * 2 + seed + frame * 5) * 0.36));
      g.lineTo(0, w * 0.3); g.closePath(); g.fill();
    };
    ribbon(Wd * 1.9, 3, "rgba(70,70,255,.4)", "lighter");
    ribbon(Wd * 1.1, 11, "rgb(40,200,255)", "source-over");
    ribbon(Wd * 0.55, 17, "#ffffff", "source-over");
    // วงแรงดันวิ่งตามลำแสง
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const p = ((T - FIRE) / 260 + i / 4) % 1;
      g.strokeStyle = `rgba(190,245,255,${0.9 * (1 - p) * (1 - q)})`; g.lineWidth = os * 0.07;
      g.beginPath(); g.ellipse(Lb * p, 0, os * 0.22, Wd * 1.6 * (0.6 + p * 0.8), 0, 0, TAU); g.stroke();
    }
    // แรงระเบิดปากคันธนู
    const m = 1 - smooth(0, 240, T - FIRE);
    glow(g, 0, 0, os * 2.2, WHITE, m);
    for (let i = 0; i < 9; i++) {
      const a = -0.9 + i * 0.225, L = os * (2 + hash01(i + 3) * 2.2) * (1.2 - m);
      g.save(); g.rotate(a + Math.PI); g.fillStyle = `rgba(150,235,255,${m})`; g.beginPath(); g.moveTo(0, -os * 0.08); g.lineTo(L, 0); g.lineTo(0, os * 0.08); g.closePath(); g.fill(); g.restore();
    }
    g.restore();
    // ร่องไหม้ตามทางลำแสงบนพื้น
    const [gx0, gy0] = P(ax, ay), [gx1, gy1] = P(tx, ty);
    g.save(); g.strokeStyle = `rgba(6,10,50,${0.5 * (1 - q)})`; g.lineCap = "round"; g.lineWidth = os * 0.4; g.beginPath(); g.moveTo(gx0, gy0); g.lineTo(gx1, gy1); g.stroke(); g.restore();
  }
  if (T >= HIT) {
    const q = (T - HIT) / (ARJ_MS.arjunaArrow - HIT), [x, y, s] = P(tx, ty);
    lightPillar(g, x, y, s, s * 7 * easeOut3(q / 0.2), s * (0.9 + q), "90,190,255", 1 - smooth(0.4, 1, q), 5, now);
    impact(g, tx, ty, q, 1.25, lowQ, e.dodge);
  }
}

function arjunaCut(g, e, now, lowQ) {
  const DUR = ARJ_FX_DUR.arjunaCut, T = clamp01(prog(e, now)) * DUR, B = e.band, N = (B.v ? e.rows : e.cols) || 14;
  const a0 = B.a0, a1 = B.a1 + 1, mid = (a0 + a1) / 2, cu = N / 2, [HIT, , , , , LAST] = ARJ_CUT_BEATS;
  const pt = (u, a, z = 0) => (B.v ? P(a, u, z) : P(u, a, z));
  const poly = (p, f) => { g.fillStyle = f; g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); g.fill(); };
  const quad = (u0, u1, c0, c1, f) => poly([pt(u0, c0), pt(u1, c0), pt(u1, c1), pt(u0, c1)], f);
  // รอยผ่าเรืองแสง + ขอบรอยแยก
  if (T >= HIT) {
    const run = easeOut3((T - HIT) / 240) * cu, off = 1 - smooth(DUR - 900, DUR, T), hot = 1 - smooth(HIT, HIT + 500, T), charge = smooth(HIT + 500, 1650, T);
    g.save(); g.globalCompositeOperation = "lighter";
    quad(cu - run, cu + run, a0, a1, `rgba(50,170,255,${(0.2 + 0.35 * hot + 0.15 * charge) * off})`);
    quad(cu - run, cu + run, mid - 0.14 - hot * 0.6, mid + 0.14 + hot * 0.6, `rgba(255,255,255,${0.95 * off})`);
    for (const edge of [a0, a1]) {
      g.strokeStyle = `rgba(120,235,255,${0.9 * off})`; g.lineWidth = 2.2; g.beginPath();
      const steps = Math.floor(run * 4);
      for (let i = -steps; i <= steps; i++) {
        const p = pt(cu + i / 4, edge + (hash01(i + 40 + edge * 7) - 0.5) * 0.24);
        if (i === -steps) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]);
      }
      g.stroke();
    }
    g.restore();
  }
  // ใบดาบเล่มเดียวฟาดลง: โคนอยู่นอกปลายแถบ ปลายเงื้อขึ้นฟ้าแล้วหวดลงนอนตามแนวแถบตอนปะทะ · เงาจางไล่หลัง
  if (T < HIT + 260) {
    const L = N + 3, u0 = -1.5, swing = (th, al) => {
      const c = Math.cos(th), sn = Math.sin(th), edge = (k, side) => {
        const r = k * L, w = 0.62 * Math.sin(Math.min(1, k * 1.25 + 0.1) * Math.PI * 0.5) * (1 - k * k * k);
        return pt(u0 + r * c, mid + side * w, r * sn + side * 0 + 0.25);
      };
      const shape = (sideA, sideB, fill) => {
        g.fillStyle = fill; g.beginPath();
        for (let i = 0; i <= 18; i++) { const p = edge(i / 18, sideA); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
        for (let i = 18; i >= 0; i--) { const p = edge(i / 18, sideB); g.lineTo(p[0], p[1]); }
        g.closePath(); g.fill();
      };
      g.save(); g.globalAlpha *= al;
      g.save(); g.globalCompositeOperation = "lighter"; shape(-1.5, 1.5, "rgba(70,220,255,.4)"); g.restore();
      shape(-1, 0, "#f4f8ff"); shape(0, 1, "#8f9fe8"); shape(-0.12, 0.12, "#ffffff");
      g.restore();
    };
    const th = T < HIT ? (1 - easeIn2(T / HIT)) * 1.35 : 0, al = T < HIT ? smooth(0, 90, T) : 1 - (T - HIT) / 260;
    if (T < HIT) for (let i = 3; i >= 1; i--) swing(th + i * 0.09 * (T / HIT), 0.16 * (4 - i) * al);
    swing(th, al);
    if (T >= HIT) { const [cx, cy, cs] = pt(cu, mid); g.save(); g.globalCompositeOperation = "lighter"; glow(g, cx, cy, cs * 5, WHITE, 0.8 * (1 - (T - HIT) / 260)); g.restore(); }
  }
  // ลำแสงฟุ้งพุ่งจากพื้นทีละชุด เว้นจังหวะ
  const list = [];
  BLADES.forEach((b, i) => {
    const t0 = ARJ_CUT_BEATS[i + 1], n = lowQ ? 3 : 5;
    for (let j = 0; j < n; j++) list.push({ t0: t0 + j * 45, life: 900, rgb: b.rgb, u: ((j + 0.5 + (hash01(i * 11 + j) - 0.5) * 0.8) / n) * N, a: a0 + 0.5 + hash01(i * 5 + j * 3) * (a1 - a0 - 1), h: 7 + hash01(j * 7 + i) * 3, w: 0.55, seed: i * 10 + j });
  });
  const nl = lowQ ? 6 : 10;
  for (let j = 0; j < nl; j++) list.push({ t0: LAST + hash01(j * 3) * 120, life: DUR - LAST - 120, rgb: j % 3 ? "90,220,255" : "210,240,255", u: ((j + 0.5) / nl) * N, a: a0 + 0.4 + hash01(j * 9) * (a1 - a0 - 0.8), h: 9 + hash01(j) * 3, w: 0.6, seed: 90 + j });
  list.sort((p, q) => p.a - q.a);
  for (const b of list) {
    const q = (T - b.t0) / b.life;
    if (q <= 0 || q >= 1) continue;
    const [x, y, s] = pt(b.u, b.a), rise = easeOut3(q / 0.22);
    lightPillar(g, x, y, s, s * b.h * rise * (1 + q * 0.25), s * b.w * (1 + q * 0.5), b.rgb, (1 - smooth(0.45, 1, q)), b.seed, now);
  }
  // ชุดสุดท้าย: แถบทั้งแถบสว่าง · ประกายลอยขึ้น
  if (T >= LAST) {
    const q = (T - LAST) / (DUR - LAST), fade = 1 - q;
    g.save(); g.globalCompositeOperation = "lighter"; quad(0, N, a0, a1, `rgba(150,225,255,${0.5 * fade * fade})`); g.restore();
    for (let i = 0; i < (lowQ ? 16 : 40); i++) {
      const p = clamp01(q * 1.3 - hash01(i) * 0.3);
      if (p <= 0 || p >= 1) continue;
      const [x, y, s] = pt(hash01(i * 3) * N, a0 + hash01(i * 5) * (a1 - a0), 0.2 + p * (3 + hash01(i * 7) * 7));
      g.fillStyle = `rgba(${BLADES[i % 4].rgb},${1 - p})`; g.beginPath(); g.arc(x, y, s * 0.06, 0, TAU); g.fill();
    }
  }
}

// ---------- ขจัดสิ่งแปลกปลอม ----------
function arjunaPurge(g, e, now, lowQ) {
  const t = clamp01(prog(e, now)), [cx, cy] = center(e), k = easeOut3(t / 0.3), out = 1 - smooth(0.72, 1, t);
  const [mx, my, s] = P(cx, cy, 1);
  // คลื่นผลัก + เศษมืดกระเจิง
  const w = clamp01((t - 0.12) / 0.55);
  g.save(); g.globalCompositeOperation = "lighter";
  gEllipse(g, cx, cy, 0.5 + easeOut3(w) * 3.4, 0.03, 48); g.strokeStyle = `rgba(${CYAN},${0.8 * (1 - w)})`; g.lineWidth = Math.max(1, s * 0.1 * (1 - w)); g.stroke();
  glow(g, mx, my, s * (1.2 + k * 1.2), CYAN, 0.55 * out);
  g.restore();
  for (let i = 0; i < (lowQ ? 7 : 14); i++) {
    const a = hash01(i + 2) * TAU, d = easeOut3(w) * (1.1 + hash01(i * 4) * 2.6), [x, y, sc] = P(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.2 + hash01(i * 9) * 1.2);
    g.save(); g.translate(x, y); g.rotate(a + t * 8); g.fillStyle = `rgba(30,10,70,${(1 - w) * 0.9})`; g.strokeStyle = `rgba(${CYAN},${1 - w})`; g.lineWidth = 0.8;
    const r = sc * (0.1 + hash01(i * 6) * 0.1);
    g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.8, r * 0.7); g.lineTo(-r * 0.7, r * 0.6); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  // วงเดือนทอง + หนามแก้ว หมุนรอบตัว
  const rot = REDUCED ? 0 : t * 3.4;
  g.save(); g.translate(mx, my); g.scale(1, 0.62); g.rotate(rot); g.globalAlpha = k * out;
  const gold = g.createLinearGradient(-s, 0, s, 0);
  gold.addColorStop(0, "#fff0a8"); gold.addColorStop(0.5, "#d0902a"); gold.addColorStop(1, "#ffdf7a");
  g.strokeStyle = gold; g.lineWidth = s * 0.13; g.lineCap = "round";
  g.beginPath(); g.arc(0, 0, s * 1.3, 0.2, TAU - 0.9); g.stroke();
  for (let i = 0; i < 4; i++) {
    g.save(); g.rotate((i / 4) * TAU + 0.5); g.translate(s * 1.3, 0);
    g.fillStyle = "#c8fbff"; g.beginPath(); g.moveTo(s * 0.42, 0); g.lineTo(0, -s * 0.11); g.lineTo(-s * 0.2, 0); g.lineTo(0, s * 0.11); g.closePath(); g.fill(); g.restore();
  }
  g.restore();
  // ดาวเคราะห์กางออก
  PLANETS.forEach(([rgb, r], i) => {
    const a = (i / PLANETS.length) * TAU + rot * 0.7, R = k * 1.65;
    const [x, y, sc] = P(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 1 + Math.sin(a * 2) * 0.4);
    planet(g, x, y, sc * r * 1.1 * k, rgb, out);
  });
}

// ---------- จุติ ----------
function arjunaJutti(g, e, now, lowQ) {
  const t = clamp01(prog(e, now)), [cx, cy] = center(e), k = easeOut3(t / 0.3), out = 1 - smooth(0.7, 1, t);
  const [bx, by, s] = P(cx, cy, 0);
  // เสาแสงทอง
  const H = s * 6 * k, W = s * (0.8 + 0.25 * Math.sin(t * 9) * (REDUCED ? 0 : 1)) * (1 - t * 0.5);
  g.save(); g.globalCompositeOperation = "lighter";
  const pl = g.createLinearGradient(0, by, 0, by - H);
  pl.addColorStop(0, `rgba(${GOLD_HI},${0.9 * out})`); pl.addColorStop(0.5, `rgba(${GOLD},${0.5 * out})`); pl.addColorStop(1, `rgba(${LAMP},0)`);
  g.fillStyle = pl; g.beginPath(); g.moveTo(bx - W, by); g.lineTo(bx - W * 0.4, by - H); g.lineTo(bx + W * 0.4, by - H); g.lineTo(bx + W, by); g.closePath(); g.fill();
  glow(g, bx, by - s * 0.8, s * 2.8 * k, WHITE, 0.9 * (1 - smooth(0.05, 0.4, t)));
  g.restore();
  // กลีบบัวบานบนพื้น 2 ชั้น
  for (let j = 0; j < 2; j++) {
    const n = 8, q = easeOut3((t - j * 0.08) / 0.45), R = (j ? 1.05 : 1.6) * q;
    for (let i = 0; i < n; i++) {
      const a = ((i + j * 0.5) / n) * TAU, [x0, y0] = P(cx + Math.cos(a) * R * 0.25, cy + Math.sin(a) * R * 0.25, 0.04), [x1, y1] = P(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0.04 + 0.25 * q);
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, nx = -(y1 - y0) * 0.32, ny = (x1 - x0) * 0.32;
      g.fillStyle = j ? `rgba(255,240,190,${0.95 * out})` : `rgba(255,170,120,${0.9 * out})`;
      g.strokeStyle = `rgba(255,120,80,${0.7 * out})`; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx + nx, my + ny, x1, y1); g.quadraticCurveTo(mx - nx, my - ny, x0, y0); g.fill(); g.stroke();
    }
  }
  // ตะเกียงแตกเป็นดวงไฟลอยขึ้น
  const [lx, ly, ls] = P(cx, cy, 2.1);
  if (t < 0.42) lantern(g, lx, ly, ls * 0.62, 1 - smooth(0.3, 0.42, t), 1);
  for (let i = 0; i < (lowQ ? 10 : 22); i++) {
    const q = clamp01((t - 0.32 - hash01(i) * 0.2) / 0.5);
    if (q <= 0 || q >= 1) continue;
    const a = hash01(i * 3) * TAU, [x, y, sc] = P(cx + Math.cos(a) * q * 2.2, cy + Math.sin(a) * q * 2.2, 2.1 + q * (1.2 + hash01(i * 5)));
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, x, y, sc * 0.2, GOLD_HI, 1 - q); g.restore();
  }
}

const DRAW = { arjunaBomb, arjunaArrow, arjunaPurge, arjunaJutti, arjunaCut };
export function arjunaBoardFx(g, e, now, lowQ) {
  const fn = DRAW[e.kind];
  if (fn) fn(g, e, now, lowQ);
}

// ---------- ตัวหมาก ----------
export function arjUnitBack(g, u, now, wx, wy) {
  const A = u.arjuna;
  if (!A) return;
  const spin = REDUCED ? 0 : now / 1500, pulse = REDUCED ? 0.85 : 0.75 + 0.25 * Math.sin(now / 260);
  g.save();
  if (A.purge) {
    gEllipse(g, wx, wy, 0.56, 0.02, 36); g.strokeStyle = `rgba(${CYAN},${0.7 * pulse})`; g.lineWidth = 1.5; g.stroke();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + spin, [x, y, s] = P(wx + Math.cos(a) * 0.56, wy + Math.sin(a) * 0.56, 0.32 + Math.sin(a) * 0.08);
      planet(g, x, y, s * 0.09, PLANETS[i][0], 0.95);
    }
  }
  if (A.jutti) {
    gEllipse(g, wx, wy, 0.46, 0.02, 32); g.fillStyle = `rgba(${LAMP},${0.2 * pulse})`; g.fill();
    const [x, y, s] = P(wx - 0.48, wy - 0.12, 0.72 + (REDUCED ? 0 : Math.sin(now / 420) * 0.05));
    lantern(g, x, y, s * 0.22, 1, pulse);
  }
  g.restore();
}
