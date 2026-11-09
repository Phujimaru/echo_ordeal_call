// ============================================================
//  เอฟเฟกต์บนกระดานของกิลกาเมช (Fake) (characters/gilgamesh_fake.js · GRID_PLAN §7.30)
//
//  เหตุการณ์ (socket "gilFx" → GIL_EVENT_FX → ฟังก์ชันในไฟล์นี้):
//   gate      ประตูบาบิโลนบานเต็มฟ้าตามจำนวนนัด (ระลอกทองเรียงเป็นพัดหลังกิล) + กรอบยิง N×N เส้นทอง
//   shot      อาวุธ 1 ชิ้นพุ่งจากประตูเข้าเป้า (ดาบ/หอก/ขวาน/ดาบโค้ง/ง้าว/กริช สุ่มรูป) · โดน = ประกาย · หลบ = ปักข้างๆ · นัดสุดท้ายใหญ่สุด
//   volleyEnd ตัวเลข ×N สีทอง + ประกายเหรียญลอยขึ้น · คนที่คุกเข่า = วงแรงกดทองบนหัว
//   bolts     สายฟ้าแดงผ่าช่องที่เล็ง (จบเทิร์นระหว่างพายุ) · storm / calm = ฟ้าแลบแดงตอนพายุเริ่ม / ฟ้าเปิด
//   block     สมบัติโผล่จากประตูหน้ากิลกันการโจมตีแล้วแตก · chain = โซ่เอนคิดูพุ่งจากประตูพันผู้โจมตี
//   equip / unequip  ดาบ EA โผล่จาก/จมกลับเข้าประตู · charge = EA หมุนชาร์จ (กด Enuma Elish)
//   enuma     Enuma Elish: 0–3.25 วิ (เสียงพูด + เว้นจังหวะ) EA หมุนเร็ว ลมแดงดำวนเข้า จอมืด → 3.25 วิ ลำแสงแดงดำบิดเกลียวกว้าง 5 ถึงขอบกระดาน → จาง 9.3 วิ
//   dissolve  อาวุธที่ปักค้างสลายเป็นละอองทอง (ต้นเทิร์น)
//  ท่าตีปกติ (attackStyle): gilEa = วงลมแดงดำหมุนรอบตัว 8 ช่อง + รอยฟันทุกทิศ
//  ของค้าง (players[].gil → prop gils ของ BoardCanvas):
//   drawGilGround (ก่อนตัวละคร) = พายุ (ฟ้ามืดแดง) · ช่องที่สายฟ้าเล็ง · แนว Enuma Elish ที่รอยิง · อาวุธที่ปักค้าง · วิมานะใต้หมาก
//   drawGilAir (หลังตัวละคร) = ระลอกทองเล็กๆ หลังกิล (มือเปล่า) / ดาบ EA หมุนข้างตัว + ออร่าเกราะทอง (ถือ EA) · ฝนทั้งจอ
//  lowQ = ตัดอนุภาค/ชั้นเรือง · ลดการเคลื่อนไหว = ของที่วนตลอดหยุดนิ่ง (เอฟเฟกต์ครั้งเดียวยังเล่น)
// ============================================================
import { P, gEllipse, glow, quad } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ---------- จังหวะ (ms) — ต้องตรงกับ characters/gilgamesh_fake.js ----------
export const GIL_T = { gate: 1100, travel: 230, travelBig: 420, enumaHit: 3250, enumaEnd: 9300, eaHit: 0.42 };
export const GIL_MS = { gilEa: 1150 };
export const GIL_HIT_P = { gilEa: GIL_T.eaHit };
export const GIL_FX_DUR = {
  ...GIL_MS,
  gilGate: 2600, gilShot: GIL_T.travelBig + 700, gilVolleyEnd: 2000, gilBolts: 1500, gilStorm: 1300, gilCalm: 1100,
  gilBlock: 900, gilChain: 1100, gilEquip: 1300, gilUnequip: 800, gilCharge: 1800, gilEnuma: GIL_T.enumaEnd, gilDissolve: 1500,
};
export const isGilFx = (kind) => typeof kind === "string" && (kind in GIL_FX_DUR);
export const GIL_EVENT_FX = {
  gate: "gilGate", shot: "gilShot", volleyEnd: "gilVolleyEnd", bolts: "gilBolts", storm: "gilStorm", calm: "gilCalm",
  block: "gilBlock", chain: "gilChain", equip: "gilEquip", unequip: "gilUnequip", charge: "gilCharge", enuma: "gilEnuma", dissolve: "gilDissolve",
};

// ---------- สี (r,g,b) ----------
const GOLD = "255,206,92", GOLD_HI = "255,244,196", GOLD_D = "196,140,40", AMBER = "255,170,60";
const RED = "232,32,44", CRIM = "150,8,24", INK = "18,4,8", WHITE = "255,255,255";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const ctr = (x, y, n = 1) => [x + n / 2, y + n / 2];

// ---------- ประตูบาบิโลน (ระลอกทองในอากาศ · พิกัดจอ) ----------
function portal(g, x, y, r, a, now, seed, lowQ) {
  if (a <= 0.01 || r <= 0.5) return;
  const rot = REDUCED ? 0 : now / 900 + seed * 6;
  g.save();
  g.globalCompositeOperation = "lighter";
  if (!lowQ) glow(g, x, y, r * 2.1, GOLD, 0.32 * a);
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${GOLD_HI},${0.95 * a})`); gr.addColorStop(0.35, `rgba(${GOLD},${0.7 * a})`);
  gr.addColorStop(0.75, `rgba(${GOLD_D},${0.35 * a})`); gr.addColorStop(1, `rgba(${GOLD_D},0)`);
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(x, y, r, r * 0.92, 0, 0, TAU); g.fill();
  // ระลอกซ้อน (เบี้ยวเล็กน้อยเหมือนผิวน้ำ)
  g.lineWidth = Math.max(0.8, r * 0.07);
  for (let k = 0; k < (lowQ ? 2 : 4); k++) {
    const rr = r * (0.38 + k * 0.2), wob = REDUCED ? 0 : Math.sin(now / 160 + k * 1.7 + seed * 9) * r * 0.03;
    g.strokeStyle = `rgba(${GOLD_HI},${(0.75 - k * 0.15) * a})`;
    g.beginPath(); g.ellipse(x, y, rr + wob, (rr + wob) * 0.9, rot * (k % 2 ? -1 : 1), 0, TAU); g.stroke();
  }
  // อักขระวงนอก
  if (!lowQ) {
    g.strokeStyle = `rgba(${GOLD},${0.6 * a})`; g.lineWidth = Math.max(0.6, r * 0.04);
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const th = rot * 1.6 + (i / 10) * TAU;
      g.moveTo(x + Math.cos(th) * r * 1.05, y + Math.sin(th) * r * 0.97);
      g.lineTo(x + Math.cos(th + 0.22) * r * 1.18, y + Math.sin(th + 0.22) * r * 1.08);
    }
    g.stroke();
  }
  g.restore();
}
// ตำแหน่งประตูที่ i (พิกัดจอ) — พัดหลายชั้นเหนือ/หลังกิล · m = จำนวนประตูทั้งหมด
function portalSpot(gx, gy, sc, i, m) {
  const rows = m <= 8 ? 1 : m <= 20 ? 2 : 3;
  const per = Math.ceil(m / rows), row = Math.floor(i / per), col = i % per, inRow = Math.min(per, m - row * per);
  const spread = Math.min(Math.PI * 0.95, 0.35 + inRow * 0.16);
  const th = -Math.PI / 2 + (inRow <= 1 ? 0 : (col / (inRow - 1) - 0.5) * spread);
  const rad = sc * (2.1 + row * 1.05) * (1 + 0.05 * hash01(i * 3.1));
  return [gx + Math.cos(th) * rad * 1.35 + (hash01(i * 7.7) - 0.5) * sc * 0.25, gy - sc * 1.1 + Math.sin(th) * rad * 0.8 + (hash01(i * 5.3) - 0.5) * sc * 0.2, sc * (0.36 + 0.06 * hash01(i * 2.3)) * (1 - row * 0.12)];
}

// ---------- อาวุธ (พิกัดท้องถิ่น: ปลายชี้ +x · ยาว L) ----------
const W_NAMES = ["sword", "spear", "axe", "scimitar", "halberd", "dagger"];
function weaponPath(g, w, L) {
  const kind = W_NAMES[((w | 0) % 6 + 6) % 6];
  const h = L * 0.07;
  g.beginPath();
  if (kind === "sword" || kind === "dagger") {
    const bl = kind === "dagger" ? 0.5 : 0.7;
    g.moveTo(L * 0.5, 0); g.lineTo(L * (0.5 - bl * 0.12), -h); g.lineTo(-L * (bl - 0.5) * 0.3 - L * 0.05, -h); g.lineTo(-L * 0.08, -h * 2.6); g.lineTo(-L * 0.12, -h * 2.6);
    g.lineTo(-L * 0.12, -h * 0.6); g.lineTo(-L * 0.45, -h * 0.6); g.lineTo(-L * 0.5, 0); g.lineTo(-L * 0.45, h * 0.6); g.lineTo(-L * 0.12, h * 0.6);
    g.lineTo(-L * 0.12, h * 2.6); g.lineTo(-L * 0.08, h * 2.6); g.lineTo(-L * (bl - 0.5) * 0.3 - L * 0.05, h); g.lineTo(L * (0.5 - bl * 0.12), h);
  } else if (kind === "spear") {
    g.moveTo(L * 0.5, 0); g.lineTo(L * 0.3, -h * 1.8); g.lineTo(L * 0.22, -h * 0.5); g.lineTo(-L * 0.5, -h * 0.4); g.lineTo(-L * 0.5, h * 0.4); g.lineTo(L * 0.22, h * 0.5); g.lineTo(L * 0.3, h * 1.8);
  } else if (kind === "axe") {
    g.moveTo(L * 0.5, -h * 0.4); g.lineTo(L * 0.42, -h * 4.2); g.quadraticCurveTo(L * 0.25, -h * 2.2, L * 0.22, -h * 0.4); g.lineTo(-L * 0.5, -h * 0.4);
    g.lineTo(-L * 0.5, h * 0.4); g.lineTo(L * 0.22, h * 0.4); g.quadraticCurveTo(L * 0.25, h * 2.2, L * 0.42, h * 4.2); g.lineTo(L * 0.5, h * 0.4);
  } else if (kind === "scimitar") {
    g.moveTo(L * 0.5, -h * 2.4); g.quadraticCurveTo(L * 0.1, h * 2.2, -L * 0.15, h * 0.9); g.lineTo(-L * 0.15, h * 2.4); g.lineTo(-L * 0.2, h * 2.4); g.lineTo(-L * 0.2, h * 0.5);
    g.lineTo(-L * 0.5, h * 0.4); g.lineTo(-L * 0.5, -h * 0.4); g.lineTo(-L * 0.2, -h * 0.5); g.lineTo(-L * 0.2, -h * 2.4); g.lineTo(-L * 0.15, -h * 2.4); g.lineTo(-L * 0.15, -h * 0.6);
    g.quadraticCurveTo(L * 0.15, -h * 0.5, L * 0.5, -h * 2.4);
  } else {
    g.moveTo(L * 0.5, 0); g.lineTo(L * 0.36, -h * 1.2); g.lineTo(L * 0.3, -h * 3.6); g.quadraticCurveTo(L * 0.18, -h * 2.4, L * 0.16, -h * 0.5); g.lineTo(-L * 0.5, -h * 0.4);
    g.lineTo(-L * 0.5, h * 0.4); g.lineTo(L * 0.16, h * 0.5); g.lineTo(L * 0.26, h * 1.6); g.lineTo(L * 0.36, h * 1.2);
  }
  g.closePath();
}
function drawWeapon(g, x, y, ang, L, w, a, lowQ, hot = 0) {
  g.save();
  g.translate(x, y); g.rotate(ang);
  weaponPath(g, w, L);
  const gr = g.createLinearGradient(-L * 0.5, -L * 0.1, L * 0.5, L * 0.1);
  gr.addColorStop(0, `rgba(${GOLD_D},${a})`); gr.addColorStop(0.5, `rgba(${GOLD_HI},${a})`); gr.addColorStop(1, `rgba(${GOLD},${a})`);
  g.fillStyle = gr; g.fill();
  g.strokeStyle = `rgba(90,52,8,${0.75 * a})`; g.lineWidth = Math.max(0.6, L * 0.02); g.stroke();
  if (hot > 0 && !lowQ) {
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = `rgba(${GOLD_HI},${0.7 * hot * a})`; g.lineWidth = Math.max(1, L * 0.05); g.stroke();
  }
  g.restore();
}

// ---------- ช่องที่สายฟ้าเล็ง / สายฟ้า ----------
function boltPath(g, x0, y0, x1, y1, seed, jag) {
  const n = 9;
  g.beginPath(); g.moveTo(x0, y0);
  for (let i = 1; i < n; i++) {
    const k = i / n;
    g.lineTo(lerp(x0, x1, k) + (hash01(seed + i * 13.7) - 0.5) * jag, lerp(y0, y1, k) + (hash01(seed + i * 3.1) - 0.5) * jag * 0.3);
  }
  g.lineTo(x1, y1);
}
function redBolt(g, x, y, sc, a, seed, lowQ) {
  const top = [x + (hash01(seed) - 0.5) * sc * 2, y - sc * 9];
  g.save(); g.globalCompositeOperation = "lighter"; g.lineJoin = "round"; g.lineCap = "round";
  if (!lowQ) { boltPath(g, top[0], top[1], x, y, seed, sc * 1.1); g.strokeStyle = `rgba(${RED},${0.45 * a})`; g.lineWidth = sc * 0.38; g.stroke(); }
  boltPath(g, top[0], top[1], x, y, seed, sc * 1.1); g.strokeStyle = `rgba(255,90,90,${0.9 * a})`; g.lineWidth = sc * 0.12; g.stroke();
  boltPath(g, top[0], top[1], x, y, seed, sc * 1.1); g.strokeStyle = `rgba(${WHITE},${a})`; g.lineWidth = sc * 0.045; g.stroke();
  glow(g, x, y, sc * 1.4, RED, 0.6 * a);
  g.restore();
}

// ---------- ของค้างบนพื้น ----------
const seenW = new Map(); // k ของอาวุธที่ปัก → เวลาที่เห็นครั้งแรก (โผล่หลังอาวุธพุ่งถึง)
function stuckWeapon(g, wpn, now, lowQ) {
  const first = seenW.get(wpn.k) || (seenW.set(wpn.k, now), now);
  const age = now - first - (wpn.big ? GIL_T.travelBig : GIL_T.travel);
  if (age < 0) return;
  const pop = clamp01(age / 120);
  const ox = (hash01(wpn.k * 1.3) - 0.5) * 0.55, oy = (hash01(wpn.k * 2.9) - 0.5) * 0.55;
  const [bx, by, sc] = P(wpn.x + 0.5 + ox, wpn.y + 0.5 + oy, 0);
  const L = sc * (wpn.big ? 1.6 : 0.95) * (0.9 + 0.2 * hash01(wpn.k * 4.1));
  const tilt = (hash01(wpn.k * 6.7) - 0.5) * 0.7;
  // ปักลงพื้น: ด้ามชี้ขึ้น · ปลายจมดิน (วาดครึ่งบน)
  g.save();
  g.beginPath(); g.ellipse(bx, by, L * 0.16, L * 0.06, 0, 0, TAU); g.fillStyle = "rgba(0,0,0,0.35)"; g.fill();
  g.beginPath(); g.rect(bx - L, by - L * 2, L * 2, L * 2); g.clip();
  drawWeapon(g, bx + Math.sin(tilt) * L * 0.15, by - L * 0.15 * pop + L * 0.2, -Math.PI / 2 + tilt + Math.PI, L, wpn.w, 0.95, lowQ, REDUCED ? 0.3 : 0.25 + 0.2 * Math.sin(now / 500 + wpn.k));
  g.restore();
  if (!lowQ) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, bx, by - L * 0.3, L * 0.5, GOLD, 0.12); g.restore(); }
}
export function drawGilGround(g, gils, units, fx, now, lowQ, view) {
  const list = Array.isArray(gils) ? gils : [];
  const storming = list.some((c) => c.storm) || fx.some((e) => e.kind === "gilStorm");
  const enumaFx = fx.find((e) => e.kind === "gilEnuma");
  let dark = storming ? 0.3 : 0;
  if (list.some((c) => c.charge)) dark = Math.max(dark, 0.32);
  if (enumaFx) {
    const t = now - enumaFx.t0;
    dark = Math.max(dark, t < GIL_T.enumaHit ? 0.3 + 0.45 * (t / GIL_T.enumaHit) : 0.75 * (1 - clamp01((t - GIL_T.enumaHit - 4000) / 2000)));
  }
  if (dark > 0) {
    const x0 = (view && Number.isFinite(view.x0) ? view.x0 : 0) - 60, y0 = (view && Number.isFinite(view.y0) ? view.y0 : 0) - 60;
    const x1 = (view && Number.isFinite(view.x1) ? view.x1 : 1280) + 60, y1 = (view && Number.isFinite(view.y1) ? view.y1 : 720) + 60;
    g.save(); g.fillStyle = `rgba(28,2,10,${dark})`; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.restore();
  }
  for (const c of list) {
    // วิมานะ: เรือทองใต้หมากของกิล
    const u = units.find((it) => it.id === c.id && !it.corpse);
    if (u) vimana(g, u.rx + (u.ox || 0), u.ry + (u.oy || 0), Math.max(1, u.size | 0), now, lowQ);
    // แนว Enuma Elish ที่รอยิง
    if (c.charge && Array.isArray(c.charge.tiles)) enumaTelegraph(g, c, now, lowQ);
    // ช่องที่สายฟ้าแดงเล็ง
    if (c.storm && Array.isArray(c.warns)) {
      const pulse = REDUCED ? 0.6 : 0.5 + 0.5 * Math.sin(now / 210);
      for (const w of c.warns) {
        quad(g, w.x, w.y, 0.04, 0.01);
        g.fillStyle = `rgba(${RED},${0.18 + 0.22 * pulse})`; g.fill();
        g.strokeStyle = `rgba(255,120,120,${0.55 + 0.4 * pulse})`; g.lineWidth = 2; g.stroke();
        const [cx, cy, sc] = P(w.x + 0.5, w.y + 0.5, 0.02);
        g.save(); g.globalCompositeOperation = "lighter";
        g.strokeStyle = `rgba(255,170,170,${0.6 + 0.4 * pulse})`; g.lineWidth = Math.max(1.2, sc * 0.05); g.lineJoin = "round";
        g.beginPath(); g.moveTo(cx + sc * 0.06, cy - sc * 0.26); g.lineTo(cx - sc * 0.1, cy + sc * 0.02); g.lineTo(cx + sc * 0.06, cy + sc * 0.02); g.lineTo(cx - sc * 0.08, cy + sc * 0.28); g.stroke();
        g.restore();
      }
    }
    // อาวุธที่ปักค้าง
    if (Array.isArray(c.weapons)) for (const w of c.weapons) stuckWeapon(g, w, now, lowQ);
  }
}
function vimana(g, x, y, n, now, lowQ) {
  const [cx, cy] = ctr(x, y, n);
  const bob = REDUCED ? 0 : Math.sin(now / 700) * 0.03;
  g.save();
  gEllipse(g, cx, cy, 0.62 * n, 0.04 + bob, 36, 0.44 * n);
  const [sx, sy, sc] = P(cx, cy, 0.04);
  const gr = g.createRadialGradient(sx, sy - sc * 0.1, 0, sx, sy, sc * 0.7 * n);
  gr.addColorStop(0, "rgba(255,236,170,0.75)"); gr.addColorStop(0.6, "rgba(214,160,52,0.6)"); gr.addColorStop(1, "rgba(120,80,20,0.55)");
  g.fillStyle = gr; g.fill();
  g.strokeStyle = "rgba(255,240,190,0.85)"; g.lineWidth = 1.4; g.stroke();
  // ปีกมรกต 2 ข้าง
  for (const s of [-1, 1]) {
    const a = P(cx + s * 0.5 * n, cy - 0.05, 0.08 + bob), b = P(cx + s * 0.95 * n, cy - 0.25, 0.22 + bob), c2 = P(cx + s * 0.85 * n, cy + 0.2, 0.1 + bob);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c2[0], c2[1]); g.closePath();
    g.fillStyle = "rgba(60,190,150,0.55)"; g.fill(); g.strokeStyle = "rgba(255,230,160,0.8)"; g.lineWidth = 1; g.stroke();
  }
  if (!lowQ) { g.globalCompositeOperation = "lighter"; glow(g, sx, sy, sc * 0.9 * n, GOLD, 0.18); }
  g.restore();
}
function enumaTelegraph(g, c, now, lowQ) {
  const v = DIRS[c.charge.dir] || [0, -1];
  const pulse = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / 300);
  const u0 = c.x + 0.5, w0 = c.y + 0.5;
  for (const t of c.charge.tiles) {
    const d = (t.x + 0.5 - u0) * v[0] + (t.y + 0.5 - w0) * v[1];
    const wave = REDUCED || lowQ ? 0 : Math.pow(Math.max(0, Math.sin(d * 0.9 - now / 160)), 5);
    quad(g, t.x, t.y, 0.02, 0.01);
    g.fillStyle = `rgba(${CRIM},${0.28 + 0.12 * pulse + 0.3 * wave})`; g.fill();
    if (!lowQ && hash01(t.x * 31 + t.y * 7) < 0.35) {
      const [sx, sy, sc] = P(t.x + 0.5, t.y + 0.5, 0.02);
      g.strokeStyle = `rgba(${INK},0.55)`; g.lineWidth = sc * 0.05;
      g.beginPath(); g.moveTo(sx - sc * 0.3, sy); g.lineTo(sx + sc * 0.3, sy + sc * 0.08); g.stroke();
    }
  }
}

// ---------- ในอากาศ (หลังตัวละคร) ----------
export function drawGilAir(g, gils, units, fx, now, lowQ, view) {
  const list = Array.isArray(gils) ? gils : [];
  for (const c of list) {
    const u = units.find((it) => it.id === c.id && !it.corpse);
    if (!u) continue;
    const n = Math.max(1, u.size | 0);
    const [cx, cy] = ctr(u.rx + (u.ox || 0), u.ry + (u.oy || 0), n);
    const [sx, sy, sc] = P(cx, cy, 1.2);
    const enuma = fx.find((e) => e.kind === "gilEnuma" && e.id === c.id);
    if (c.ea || enuma || c.charge) {
      // เกราะทองคำ: ออร่าทองรอบตัว + วงทองที่พื้น
      g.save(); g.globalCompositeOperation = "lighter";
      const breathe = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(now / 520);
      if (!lowQ) glow(g, sx, sy, sc * 1.3 * n, GOLD, 0.16 + 0.08 * breathe);
      gEllipse(g, cx, cy, 0.7 * n, 0.02, 40); g.strokeStyle = `rgba(${GOLD},${0.45 + 0.25 * breathe})`; g.lineWidth = 1.6; g.stroke();
      g.restore();
      const spin = c.charge ? 3.2 : enuma ? 6 : 1;
      eaSword(g, cx + 0.62 * n, cy - 0.15, 1.15, now, spin, lowQ, 1);
    } else {
      // มือเปล่า: ระลอกทองเล็กๆ 3 วงหลังตัว (ลายเซ็นของคลัง)
      for (let i = 0; i < 3; i++) {
        const [px, py, ps] = portalSpot(sx, sy, sc, i, 3);
        const k = REDUCED ? 0.6 : 0.55 + 0.25 * Math.sin(now / 900 + i * 2.1);
        portal(g, px, py + sc * 0.6, ps * 0.6, k * 0.7, now, i + 0.3, true);
      }
    }
  }
  // ฝน (พายุของ EA) — ทั้งจอ
  if (list.some((c) => c.storm)) rain(g, now, lowQ, view);
}
// ดาบ EA: กระบอก 3 ปล้องหมุนสวนกัน ลายอักขระแดง (พิกัดกระดาน x, y · ความสูง z)
function eaSword(g, x, y, z, now, spin, lowQ, a) {
  const [bx, by, sc] = P(x, y, z);
  const L = sc * 1.25, R = sc * 0.13;
  const ang = -1.2;
  g.save();
  g.translate(bx, by); g.rotate(ang);
  // ด้ามทอง
  g.fillStyle = `rgba(${GOLD},${a})`;
  g.fillRect(-L * 0.62, -R * 0.45, L * 0.2, R * 0.9);
  g.beginPath(); g.ellipse(-L * 0.42, 0, R * 0.35, R * 1.4, 0, 0, TAU); g.fill();
  // 3 ปล้อง
  const rot = REDUCED ? 0 : now / 1000 * spin;
  for (let k = 0; k < 3; k++) {
    const x0 = -L * 0.38 + k * L * 0.29, w = L * 0.28, r = R * (1 - k * 0.12);
    const gr = g.createLinearGradient(0, -r, 0, r);
    gr.addColorStop(0, `rgba(40,10,14,${a})`); gr.addColorStop(0.5, `rgba(90,20,26,${a})`); gr.addColorStop(1, `rgba(20,4,8,${a})`);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x0, -r); g.lineTo(x0 + w, -r * 0.92); g.lineTo(x0 + w, r * 0.92); g.lineTo(x0, r); g.closePath(); g.fill();
    // ลายแดง (เลื่อนตามการหมุน)
    g.save(); g.clip();
    g.strokeStyle = `rgba(255,40,50,${0.95 * a})`; g.lineWidth = Math.max(1, r * 0.22);
    const ph = (rot * (k % 2 ? -1 : 1) + k) % 1;
    for (let i = -1; i < 3; i++) {
      const yy = ((i + ph) / 2) * 2 * r - r;
      g.beginPath(); g.moveTo(x0 + w * 0.1, yy); g.lineTo(x0 + w * 0.45, yy); g.lineTo(x0 + w * 0.55, yy + r * 0.45); g.lineTo(x0 + w * 0.9, yy + r * 0.45); g.stroke();
    }
    g.restore();
  }
  // ปลาย
  g.fillStyle = `rgba(30,6,10,${a})`;
  g.beginPath(); g.moveTo(L * 0.49, -R * 0.62); g.lineTo(L * 0.62, 0); g.lineTo(L * 0.49, R * 0.62); g.closePath(); g.fill();
  if (!lowQ) { g.globalCompositeOperation = "lighter"; glow(g, 0, 0, L * 0.7, RED, 0.16 + 0.12 * Math.min(1, spin / 4)); }
  g.restore();
}
function rain(g, now, lowQ, view) {
  const x0 = view && Number.isFinite(view.x0) ? view.x0 : 0, y0 = view && Number.isFinite(view.y0) ? view.y0 : 0;
  const x1 = view && Number.isFinite(view.x1) ? view.x1 : 1280, y1 = view && Number.isFinite(view.y1) ? view.y1 : 720;
  const W = x1 - x0, H = y1 - y0, n = lowQ ? 70 : 170, t = REDUCED ? 0 : now;
  g.save();
  g.strokeStyle = "rgba(210,190,200,0.32)"; g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const sp = 0.9 + hash01(i * 3.3) * 0.6;
    const px = x0 + ((hash01(i * 1.7) * W + t * 0.12 * sp) % W);
    const py = y0 + ((hash01(i * 9.1) * H + t * 0.95 * sp) % H);
    g.moveTo(px, py); g.lineTo(px - 5 * sp, py + 18 * sp);
  }
  g.stroke();
  // ฟ้าแลบแดงจางๆ เป็นระยะ
  if (!lowQ && !REDUCED) {
    const cyc = (now % 5200) / 5200, f = cyc > 0.92 ? Math.sin((cyc - 0.92) / 0.08 * Math.PI) : 0;
    if (f > 0) { g.fillStyle = `rgba(160,20,40,${0.12 * f})`; g.fillRect(x0, y0, W, H); }
  }
  g.restore();
}

// ---------- เหตุการณ์ครั้งเดียว ----------
const cOf = (e) => { const n = Math.max(1, e.size | 0); return ctr(e.x, e.y, n); };
function gateFx(g, e, t, now, lowQ) {
  const [cx, cy] = cOf(e), [sx, sy, sc] = P(cx, cy, 1.2);
  const m = Math.min(e.n || 1, 42);
  const fade = 1 - clamp01((t - 2000) / 600);
  for (let i = 0; i < m; i++) {
    const at = (i / Math.max(1, m)) * 700;
    const k = easeOut3(clamp01((t - at) / 260));
    const [px, py, ps] = portalSpot(sx, sy, sc, i, m);
    portal(g, px, py, ps * k, k * fade, now, i, lowQ);
  }
  // กรอบยิง N×N เส้นทอง
  if (e.zone) {
    const z = e.zone, k = clamp01(t / 300) * fade;
    const a = P(z.x0, z.y0, 0.02), b = P(z.x0 + z.side, z.y0, 0.02), c = P(z.x0 + z.side, z.y0 + z.side, 0.02), d = P(z.x0, z.y0 + z.side, 0.02);
    g.save(); g.globalCompositeOperation = "lighter";
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
    g.fillStyle = `rgba(${GOLD},${0.08 * k})`; g.fill();
    if (!lowQ) { g.strokeStyle = `rgba(${AMBER},${0.35 * k})`; g.lineWidth = 7; g.stroke(); }
    g.strokeStyle = `rgba(${GOLD_HI},${0.9 * k})`; g.lineWidth = 2; g.stroke();
    g.restore();
  }
  // แสงวาบตอนประตูบานเต็ม
  if (!lowQ && t > 600 && t < 1200) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, sx, sy - sc * 2, sc * 6, GOLD, 0.25 * Math.sin((t - 600) / 600 * Math.PI)); g.restore(); }
}
function shotFx(g, e, t, now, lowQ) {
  const [cx, cy] = cOf(e), [sx, sy, sc] = P(cx, cy, 1.2);
  const m = Math.min(e.n || 1, 42), i = (e.i | 0) % Math.max(1, m);
  const [px, py, ps] = portalSpot(sx, sy, sc, i, m);
  const to = e.land || e.to || { x: e.x, y: e.y };
  const hitTo = e.to || to;
  const [tx, ty, tsc] = P(hitTo.x + 0.5, hitTo.y + 0.5, 0.45);
  const [lx, ly] = P(to.x + 0.5, to.y + 0.5, 0.1);
  const travel = e.big ? GIL_T.travelBig : GIL_T.travel;
  const ex = e.hit ? tx : lx, ey = e.hit ? ty : ly;
  // ประตูต้นทางสว่างวาบ
  const flare = 1 - clamp01(t / 380);
  portal(g, px, py, ps * (1 + 0.5 * flare) * (e.big ? 1.6 : 1), 0.4 + 0.6 * flare, now, i, lowQ);
  if (t < travel) {
    const k = easeIn2(t / travel);
    const x = lerp(px, ex, k), y = lerp(py, ey, k), ang = Math.atan2(ey - py, ex - px);
    const L = sc * (e.big ? 1.9 : 0.85);
    // หางแสง
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    const tk = Math.max(0, k - 0.35);
    const tx0 = lerp(px, ex, tk), ty0 = lerp(py, ey, tk);
    const gr = g.createLinearGradient(tx0, ty0, x, y);
    gr.addColorStop(0, `rgba(${GOLD},0)`); gr.addColorStop(1, `rgba(${GOLD_HI},0.85)`);
    g.strokeStyle = gr; g.lineWidth = L * (e.big ? 0.22 : 0.16);
    g.beginPath(); g.moveTo(tx0, ty0); g.lineTo(x, y); g.stroke();
    g.restore();
    drawWeapon(g, x, y, ang, L, e.w, 1, lowQ, 1);
  } else {
    const it = t - travel, k = 1 - clamp01(it / (e.big ? 700 : 380));
    if (k <= 0) return;
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, ex, ey, tsc * (e.big ? 2.6 : 0.9) * (1 + (1 - k)), e.hit ? GOLD_HI : GOLD, 0.8 * k);
    if (!lowQ) {
      const nsp = e.big ? 18 : 7;
      g.strokeStyle = `rgba(${GOLD_HI},${k})`; g.lineWidth = e.big ? 2.2 : 1.4; g.lineCap = "round";
      g.beginPath();
      for (let s = 0; s < nsp; s++) {
        const th = hash01(e.k * 17 + s) * TAU, r0 = tsc * 0.15, r1 = tsc * (0.4 + (1 - k) * (e.big ? 1.6 : 0.8)) * (0.6 + hash01(s * 3 + e.k) * 0.8);
        g.moveTo(ex + Math.cos(th) * r0, ey + Math.sin(th) * r0 * 0.7); g.lineTo(ex + Math.cos(th) * r1, ey + Math.sin(th) * r1 * 0.7);
      }
      g.stroke();
    }
    if (e.big) {
      g.strokeStyle = `rgba(${GOLD},${0.8 * k})`; g.lineWidth = 3;
      gEllipse(g, hitTo.x + 0.5, hitTo.y + 0.5, 0.4 + (1 - k) * 1.8, 0.02); g.stroke();
    }
    g.restore();
  }
}
function volleyEndFx(g, e, t, now, lowQ) {
  const [cx, cy] = cOf(e), [sx, sy, sc] = P(cx, cy, 2.6);
  const k = clamp01(t / 160), fade = 1 - clamp01((t - 1400) / 600);
  const pop = 1 + 0.35 * Math.max(0, 1 - t / 260);
  const txt = `×${e.fired || 0}`;
  g.save();
  g.translate(sx, sy - sc * 0.4 * easeOut3(clamp01(t / 900)));
  g.scale(pop, pop);
  g.font = `900 ${Math.round(sc * 0.95)}px "Chakra Petch","Kanit",sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = Math.max(3, sc * 0.09); g.strokeStyle = `rgba(70,36,4,${0.9 * k * fade})`; g.strokeText(txt, 0, 0);
  const gr = g.createLinearGradient(0, -sc * 0.5, 0, sc * 0.5);
  gr.addColorStop(0, `rgba(${GOLD_HI},${k * fade})`); gr.addColorStop(0.55, `rgba(${GOLD},${k * fade})`); gr.addColorStop(1, `rgba(${GOLD_D},${k * fade})`);
  g.fillStyle = gr; g.fillText(txt, 0, 0);
  g.restore();
  // ประกายเหรียญลอยขึ้นจากตัวกิล
  if (!lowQ) {
    const [bx, by, bs] = P(cx, cy, 0.8);
    g.save(); g.globalCompositeOperation = "lighter";
    const nc = Math.min(30, 6 + (e.fired || 0));
    for (let i = 0; i < nc; i++) {
      const st = (i / nc) * 700, q = clamp01((t - st) / 1100);
      if (q <= 0 || q >= 1) continue;
      const th = hash01(i * 5.1) * TAU, r = bs * (0.3 + q * 1.4);
      const x = bx + Math.cos(th + q * 3) * r, y = by - q * bs * 2.6 + Math.sin(th + q * 3) * r * 0.3;
      g.fillStyle = `rgba(${GOLD_HI},${(1 - q) * 0.95})`;
      g.beginPath(); g.ellipse(x, y, bs * 0.06, bs * 0.035, th, 0, TAU); g.fill();
    }
    g.restore();
  }
  // คุกเข่า: วงแรงกดทองบนหัวคนที่สตั้น
  for (const at of e.kneelAt || []) {
    const q = clamp01(t / 700);
    const [kx, ky, ks] = P(at.x + 0.5, at.y + 0.5, 1.6 - q * 1.3);
    g.save(); g.globalCompositeOperation = "lighter";
    g.strokeStyle = `rgba(${GOLD},${(1 - q) * 0.9})`; g.lineWidth = 3;
    g.beginPath(); g.ellipse(kx, ky, ks * (0.3 + q * 0.6), ks * (0.12 + q * 0.25), 0, 0, TAU); g.stroke();
    glow(g, kx, ky, ks * 0.8, GOLD, 0.4 * (1 - q));
    g.restore();
  }
}
function boltsFx(g, e, t, now, lowQ) {
  const bolts = Array.isArray(e.bolts) ? e.bolts : [];
  bolts.forEach((b, i) => {
    const bt = t - i * 90;
    if (bt < 0) return;
    const a = bt < 120 ? 1 : 1 - clamp01((bt - 120) / 500);
    const [x, y, sc] = P(b.x + 0.5, b.y + 0.5, 0.05);
    if (a > 0) redBolt(g, x, y, sc, a, (e.t0 % 997) + i * 41.3 + Math.floor(bt / 60), lowQ);
    const sk = 1 - clamp01(bt / 1300);
    if (sk > 0) { quad(g, b.x, b.y, 0.08, 0.01); g.fillStyle = `rgba(40,0,6,${0.45 * sk})`; g.fill(); }
  });
  if (t < 220 && !lowQ) { g.save(); g.fillStyle = `rgba(255,60,60,${0.18 * (1 - t / 220)})`; g.fillRect(-2000, -2000, 6000, 6000); g.restore(); }
}
function stormFx(g, e, t, now, lowQ, calm) {
  const [cx, cy] = cOf(e), [x, y, sc] = P(cx, cy, 0.05);
  if (calm) {
    const k = 1 - clamp01(t / 1100);
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, x, y - sc * 3, sc * 7, GOLD_HI, 0.25 * k); g.restore();
    return;
  }
  const a = t < 160 ? 1 : 1 - clamp01((t - 160) / 900);
  for (let i = 0; i < 3; i++) redBolt(g, x + (i - 1) * sc * 2.2, y + (i % 2) * sc * 0.4, sc * 1.4, a * (i === 1 ? 1 : 0.7), e.t0 % 991 + i * 17, lowQ);
  if (!lowQ) { g.save(); g.fillStyle = `rgba(255,40,60,${0.22 * a})`; g.fillRect(-2000, -2000, 6000, 6000); g.restore(); }
}
function blockFx(g, e, t, now, lowQ) {
  const [cx, cy] = cOf(e);
  let fx = 0, fy = 1;
  if (e.from) { const dx = e.from.x - e.x, dy = e.from.y - e.y, l = Math.hypot(dx, dy) || 1; fx = dx / l; fy = dy / l; }
  const [px, py, ps] = P(cx + fx * 0.65, cy + fy * 0.65, 0.9);
  const k = easeOut3(clamp01(t / 160)), br = clamp01((t - 300) / 450);
  portal(g, px, py, ps * 0.55 * k * (1 - br * 0.6), (1 - br), now, 3.3, lowQ);
  // ไอเทม (โล่ทรงกลมทอง) แล้วแตกเป็นเศษ
  g.save();
  if (br <= 0) {
    g.globalCompositeOperation = "lighter";
    g.fillStyle = `rgba(${GOLD_HI},${0.85 * k})`;
    g.beginPath(); g.ellipse(px, py, ps * 0.32 * k, ps * 0.36 * k, 0, 0, TAU); g.fill();
    g.strokeStyle = `rgba(${GOLD},${k})`; g.lineWidth = 2; g.stroke();
  } else {
    for (let i = 0; i < (lowQ ? 6 : 14); i++) {
      const th = hash01(i * 3.7 + e.t0 % 13) * TAU, r = ps * (0.1 + br * 1.1);
      const x = px + Math.cos(th) * r, y = py + Math.sin(th) * r * 0.8 + br * br * ps * 0.6;
      g.fillStyle = `rgba(${GOLD},${1 - br})`;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + ps * 0.07, y + ps * 0.03); g.lineTo(x + ps * 0.02, y + ps * 0.09); g.closePath(); g.fill();
    }
  }
  g.restore();
}
function chainFx(g, e, t, now, lowQ) {
  if (!e.to) return;
  const [cx, cy] = cOf(e), [ax, ay, sc] = P(cx, cy, 1.8);
  const [bx, by] = P(e.to.x + 0.5, e.to.y + 0.5, 0.6);
  const reach = easeOut3(clamp01(t / 380)), fade = 1 - clamp01((t - 800) / 300);
  portal(g, ax, ay, sc * 0.4, fade, now, 8.1, lowQ);
  const mx = (ax + bx) / 2, my = Math.min(ay, by) - sc * 1.2;
  const links = 16;
  g.save(); g.lineWidth = Math.max(1.2, sc * 0.04);
  for (let i = 0; i < links; i++) {
    const q = (i / links) * reach;
    const x = (1 - q) * (1 - q) * ax + 2 * (1 - q) * q * mx + q * q * bx;
    const y = (1 - q) * (1 - q) * ay + 2 * (1 - q) * q * my + q * q * by;
    g.strokeStyle = `rgba(${GOLD},${0.95 * fade})`;
    g.beginPath(); g.ellipse(x, y, sc * 0.075, sc * 0.045, i % 2 ? 0.9 : -0.6, 0, TAU); g.stroke();
  }
  // พันรอบเป้า
  if (t > 380) {
    const k = clamp01((t - 380) / 300) * fade;
    for (let r = 0; r < 3; r++) {
      g.strokeStyle = `rgba(${GOLD_HI},${0.85 * k})`;
      g.beginPath(); g.ellipse(bx, by + sc * (0.1 - r * 0.22), sc * 0.42, sc * 0.14, 0, 0, TAU); g.stroke();
    }
    if (!lowQ) { g.globalCompositeOperation = "lighter"; glow(g, bx, by, sc * 0.9, GOLD, 0.35 * k); }
  }
  g.restore();
}
function equipFx(g, e, t, now, lowQ, out) {
  const [cx, cy] = cOf(e);
  const [px, py, ps] = P(cx + 0.62, cy - 0.15, 1.15);
  const open = out ? 1 - clamp01((t - 500) / 300) : 1 - clamp01((t - 1000) / 300);
  portal(g, px, py, ps * 0.55 * easeOut3(clamp01(t / 220)), open, now, 4.4, lowQ);
  const rise = out ? 1 - easeIn2(clamp01(t / 520)) : easeOut3(clamp01((t - 150) / 650));
  if (rise > 0.02) eaSword(g, cx + 0.62, cy - 0.15, 1.15 - (1 - rise) * 0.6, now, 2, lowQ, rise);
  if (!out && !lowQ && t > 650 && t < 1100) {
    const [sx, sy, sc] = P(cx, cy, 1);
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, sx, sy, sc * 2.4, RED, 0.3 * Math.sin((t - 650) / 450 * Math.PI)); g.restore();
  }
}
function chargeFx(g, e, t, now, lowQ) {
  const [cx, cy] = cOf(e), [x, y, sc] = P(cx, cy, 0.9);
  const k = Math.sin(clamp01(t / 1800) * Math.PI);
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < (lowQ ? 3 : 7); i++) {
    const r = sc * (2.6 - ((t / 600 + i / 7) % 1) * 2.2);
    g.strokeStyle = `rgba(${RED},${0.5 * k})`; g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, y, r, r * 0.42, 0, i, i + 4.2); g.stroke();
  }
  glow(g, x, y, sc * 1.6, RED, 0.35 * k);
  g.restore();
}
// Enuma Elish: เกลียวลม + ลำแสงแดงดำ
function enumaFx(g, e, t, now, lowQ) {
  const n = Math.max(1, e.size | 0), [cx, cy] = cOf(e);
  const v = DIRS[e.dir] || [0, -1];
  const [sx, sy, sc] = P(cx, cy, 1);
  const H = GIL_T.enumaHit;
  // ลมแดงดำวนเข้าหาตัว (ก่อนยิง)
  if (t < H + 400) {
    const k = clamp01(t / H);
    g.save(); g.globalCompositeOperation = "lighter";
    const nr = lowQ ? 8 : 22;
    for (let i = 0; i < nr; i++) {
      const ph = ((t / 700) * (1 + k * 2) + i / nr) % 1;
      const r = sc * (4.5 - ph * 4.2);
      const a0 = i * 2.4 + t / 260;
      g.strokeStyle = i % 3 ? `rgba(${RED},${0.55 * (1 - ph) * (0.4 + k)})` : `rgba(${WHITE},${0.3 * (1 - ph) * k})`;
      g.lineWidth = 1.5 + k * 2;
      g.beginPath(); g.ellipse(sx, sy, r, r * 0.45, 0, a0, a0 + 1.4); g.stroke();
    }
    glow(g, sx, sy, sc * (1.2 + k * 2.2), RED, 0.25 + 0.4 * k);
    g.restore();
    eaSword(g, cx + 0.62, cy - 0.15, 1.15, now, 2 + k * 18, lowQ, 1);
  }
  if (t < H) return;
  const bt = t - H, ext = easeOut3(clamp01(bt / 260)), fade = 1 - clamp01((bt - 4300) / 1700);
  if (fade <= 0) return;
  // แกนลำแสง (พิกัดกระดาน): จากหน้าตัวกิลถึงขอบ (len ช่อง) · กว้าง width ช่อง
  const len = (e.len || 14) * ext, wid = (e.width || 5) / 2;
  const sx0 = cx + v[0] * (n / 2), sy0 = cy + v[1] * (n / 2);
  const ex = sx0 + v[0] * len, ey = sy0 + v[1] * len;
  const px = -v[1], py = v[0];
  const z = 0.9;
  const corner = (along, side, zz) => P(lerp(sx0, ex, along) + px * side, lerp(sy0, ey, along) + py * side, zz);
  const band = (w, zz, fill) => {
    const segs = 18;
    g.beginPath();
    for (let i = 0; i <= segs; i++) { const q = i / segs, wob = REDUCED ? 0 : Math.sin(q * 14 - now / 70) * 0.12 * w; const p = corner(q, w + wob, zz); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
    for (let i = segs; i >= 0; i--) { const q = i / segs, wob = REDUCED ? 0 : Math.sin(q * 14 - now / 70 + 2) * 0.12 * w; const p = corner(q, -w - wob, zz); g.lineTo(p[0], p[1]); }
    g.closePath(); g.fillStyle = fill; g.fill();
  };
  g.save();
  g.globalCompositeOperation = "source-over";
  band(wid * 1.08, 0.02, `rgba(${INK},${0.6 * fade})`); // เงาดำบนพื้น
  g.globalCompositeOperation = "lighter";
  band(wid, z, `rgba(${CRIM},${0.75 * fade})`);
  band(wid * 0.62, z, `rgba(${RED},${0.75 * fade})`);
  band(wid * 0.28, z, `rgba(255,170,160,${0.8 * fade})`);
  band(wid * 0.1, z, `rgba(${WHITE},${0.95 * fade})`);
  // เกลียวดำแดงบิดตามลำ
  if (!lowQ) {
    g.globalCompositeOperation = "source-over";
    for (let s = 0; s < 4; s++) {
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const q = i / 40, th = q * 18 + s * (TAU / 4) - now / 90;
        const p = corner(q, Math.cos(th) * wid * 0.85, z + Math.sin(th) * wid * 0.35);
        if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
      }
      g.strokeStyle = s % 2 ? `rgba(${INK},${0.75 * fade})` : `rgba(255,60,60,${0.7 * fade})`;
      g.lineWidth = sc * 0.12; g.stroke();
    }
  }
  // แฟลชทั้งจอตอนยิง
  if (bt < 380) { g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(255,220,220,${0.55 * (1 - bt / 380)})`; g.fillRect(-2000, -2000, 6000, 6000); }
  g.restore();
}
function dissolveFx(g, e, t, now, lowQ) {
  const list = Array.isArray(e.weapons) ? e.weapons : [];
  g.save(); g.globalCompositeOperation = "lighter";
  for (const w of list) {
    const [bx, by, sc] = P(w.x + 0.5, w.y + 0.5, 0.3);
    const q = clamp01(t / 1400);
    glow(g, bx, by - q * sc, sc * 0.6, GOLD, 0.5 * (1 - q));
    const nm = lowQ ? 4 : 10;
    for (let i = 0; i < nm; i++) {
      const ph = clamp01(q * 1.2 - hash01(i + w.k) * 0.2);
      const x = bx + (hash01(i * 7 + w.k) - 0.5) * sc * 0.6 + Math.sin(ph * 6 + i) * sc * 0.1;
      const y = by - ph * sc * 2.2 - hash01(i * 3 + w.k) * sc * 0.4;
      g.fillStyle = `rgba(${GOLD_HI},${(1 - ph) * 0.9})`;
      g.beginPath(); g.arc(x, y, Math.max(1, sc * 0.035), 0, TAU); g.fill();
    }
  }
  g.restore();
}
// ท่าตีปกติด้วย EA: วงลมแดงดำรอบตัว + รอยฟันทุกทิศ
function eaStrikeFx(g, e, t, now, lowQ) {
  const dur = GIL_MS.gilEa, hit = dur * GIL_T.eaHit;
  const [cx, cy] = cOf(e), n = Math.max(1, e.size | 0);
  const [sx, sy, sc] = P(cx, cy, 0.6);
  const wind = clamp01(t / hit), after = clamp01((t - hit) / (dur - hit));
  g.save(); g.globalCompositeOperation = "lighter";
  // ลมหมุนก่อนปะทะ
  for (let i = 0; i < (lowQ ? 4 : 9); i++) {
    const r = sc * (0.6 + i * 0.12) * n * (1 + after * 1.6);
    const a0 = t / 90 + i * 0.7;
    g.strokeStyle = i % 2 ? `rgba(${RED},${0.75 * (1 - after)})` : `rgba(${INK},${0.6 * (1 - after)})`;
    g.lineWidth = 2 + wind * 3;
    g.beginPath(); g.ellipse(sx, sy, r, r * 0.45, 0, a0, a0 + 2.2 * wind + 0.3); g.stroke();
  }
  // รอยฟัน 8 ทิศตอนปะทะ
  if (t >= hit) {
    const k = 1 - after;
    for (let d = 0; d < 8; d++) {
      const th = (d / 8) * TAU;
      const [ax, ay] = P(cx + Math.cos(th) * 0.4 * n, cy + Math.sin(th) * 0.4 * n, 0.5);
      const [bx, by] = P(cx + Math.cos(th) * (0.9 + after * 0.8) * n, cy + Math.sin(th) * (0.9 + after * 0.8) * n, 0.5);
      g.strokeStyle = `rgba(255,90,90,${k})`; g.lineWidth = sc * 0.08 * k + 1;
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    }
    glow(g, sx, sy, sc * 2 * n, RED, 0.5 * k);
  }
  g.restore();
  eaSword(g, cx + 0.62, cy - 0.15, 1.15, now, 12 * (1 - after) + 1, lowQ, 1);
}
export function gilFx(g, e, now, lowQ) {
  const t = now - e.t0;
  const dur = GIL_FX_DUR[e.kind] || 1000;
  if (t < 0 || t > dur) return;
  switch (e.kind) {
    case "gilEa": eaStrikeFx(g, e, t, now, lowQ); break;
    case "gilGate": gateFx(g, e, t, now, lowQ); break;
    case "gilShot": shotFx(g, e, t, now, lowQ); break;
    case "gilVolleyEnd": volleyEndFx(g, e, t, now, lowQ); break;
    case "gilBolts": boltsFx(g, e, t, now, lowQ); break;
    case "gilStorm": stormFx(g, e, t, now, lowQ, false); break;
    case "gilCalm": stormFx(g, e, t, now, lowQ, true); break;
    case "gilBlock": blockFx(g, e, t, now, lowQ); break;
    case "gilChain": chainFx(g, e, t, now, lowQ); break;
    case "gilEquip": equipFx(g, e, t, now, lowQ, false); break;
    case "gilUnequip": equipFx(g, e, t, now, lowQ, true); break;
    case "gilCharge": chargeFx(g, e, t, now, lowQ); break;
    case "gilEnuma": enumaFx(g, e, t, now, lowQ); break;
    case "gilDissolve": dissolveFx(g, e, t, now, lowQ); break;
    default: break;
  }
}
// ทุกแบบมีตัววาดใน switch ด้านบน (tests ตรวจ)
export const GIL_KINDS = Object.keys(GIL_FX_DUR);
