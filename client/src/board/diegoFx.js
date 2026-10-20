// ============================================================
//  เอฟเฟกต์บนกระดานของดิเอโก้ แบรนโด (โลกคู่ขนาน · diego_alt · GRID_PLAN §7.12) — เดอะเวิลด์ · คลังเครื่องมือ · ซิลเวอร์ บูลเล็ต
//
//  เหตุการณ์ (socket "diegoFx" → diegoEventFx · จังหวะตาม DIEGO_FX ซึ่ง server รอผ่าน engine.skillBeat):
//   throw     diegoThrow    แกลลอนแดงหมุนโค้ง (หยดน้ำมันตามหลัง) / ไม้ขีดติดไฟหมุน (สะเก็ดไฟ) / ม้วนลวดหนาม (เจ้าของเท่านั้น)
//   oil       diegoOil      สาดเป็นมงกุฎน้ำมันอำพัน + แอ่งแผ่ออกจากช่องกลาง (แอ่งค้างวาดจาก state — drawDiegoGround)
//   explode   diegoExplode  แสงวาบ → ลูกไฟทุกช่อง (ทยอยจากกลาง) → คลื่นกระแทก + เศษไฟ → ควันดำลอย · ไฟติดช่อง (ค่อยๆ ลุก)
//   ignite    diegoIgnite   เปลวไฟพันตัวคนจากเท้าขึ้นหัว · ash diegoAsh กองไฟมอด → ควันเทา · burn diegoBurn กองไฟเผาคนที่ยืนอยู่
//   net       diegoNet      ลวดหนามแผ่จากกลางออกไปขอบ 3×3 (เจ้าของเท่านั้น) · netTrap diegoNetTrap ตาข่ายโผล่ทั้งผืน → หดรัด → ดึงเข้ากลาง
//   knife     diegoKnife    มีดหมุนตีลังกา + ประกาย → ปะทะ = สะเก็ดเหล็ก · shot diegoShot แสงปากกระบอก + เส้นกระสุน + ควัน
//   reload    diegoReload   ลูกโม่ 6 รังหมุนเหนือหัว กระสุนทองเข้าทีละนัด · firstAid diegoAid กากบาทเขียวเรือง + ผ้าพันแผลเกลียวขึ้น
//   world     diegoWorld    ออร่าทอง + เสาแสง + หัวใจลอย + หน้าปัดนาฬิกาใต้เท้า (ไม่วาดตัวสแตนด์ — ผู้ใช้สั่ง 2026-10-20)
//   timeStop  diegoStop     หัวใจเต้น 2 จังหวะ → แสงทองวาบ → วงขยายทั่วกระดาน (ช่องที่วงผ่านสีกลับด้าน) → ซีเปียทั้งกระดาน
//                           ยกเว้นดิเอโก้ (+ม้า) · นาฬิกาหยุดเดินพร้อมเสียงติ๊ก · counter = จอกลับสีวาบ + วงนาฬิการัดผู้โจมตี
//   timeResume diegoResume  เข็มนาฬิกาเดินอีกครั้ง → วงหดกลับเข้าดิเอโก้ (สีกลับคืน) → แสงวาบ → ของที่ค้างกลางอากาศพุ่งเข้าเป้าพร้อมกัน
//   plot      diegoPlot     เป็นไปดั่งกลอุบาย: ม้ายกขา → ควบพุ่งตามแนว (ฝุ่น + เส้นความเร็ว + เงาม้าทอง) → ชน = แรงกระแทก
//                           + เลือดสาดตามทิศ เป้ากระเด็น 2 ช่อง (ตัวที่ฉากย้าย — diegoPose)
//   horse     diegoHorse    ขึ้น/ลง/ม้าตาย (แบบวาลคิรีของไจโร) · cunning diegoCunning ประกายเล่ห์เหลี่ยม
//  frozen: true (เกิดระหว่างหยุดเวลา) = ของที่พุ่งไป "ค้างกลางอากาศ" หน้าเป้า (มีดหมุนช้ามีประกาย · กระสุนค้างหน้าลำกล้อง + ควันนิ่ง ·
//   ไม้ขีดค้างพร้อมเปลวนิ่ง · ระเบิด/ติดไฟรอจนไม้ขีดถึง) จนดิเอโก้คนนั้นได้ timeResume — แล้วทุกชิ้นพุ่งเข้าเป้าพร้อมกันที่ TR.hit
//  ภาพค้างจาก state (BoardStage → BoardCanvas → boardDraw):
//   board.diego { oil, fire, ash } + nets ของเรา = drawDiegoGround (แอ่งน้ำมันเงาวาวฟิล์มรุ้ง · พื้นไหม้เรือง · ขี้เถ้า · ลวดหนามบางๆ)
//    + diegoFireItems (เปลวไฟเรียงความลึกกับตัวละคร) · units[].diego = { mounted, horseHp } ม้า sliver_bullet.png ใต้หมาก
//    · units[].dstat = { soaked, netted } หยดน้ำมันไหลจากตัว / ลวดรัดตัว · timeFreeze = diegoTimeLayer (ซีเปีย + นาฬิกาเดินติ๊ก)
//  ระหว่างหยุดเวลา ไฟ/ฟิล์มน้ำมัน/ลวดหยุดขยับ (diegoAmbientNow) · ไม่เล่นเสียง (server เล่นเอง)
//  lowQ = ตัดอนุภาค/ชั้นเรือง/ตัวเลขโรมัน · ลดการเคลื่อนไหว = ของที่วนตลอด (เปลว/ฟิล์ม/ประกาย) หยุดนิ่ง เอฟเฟกต์ครั้งเดียวยังเล่น
// ============================================================
import { P, depthOf, gEllipse, glow, normColor, quad, rgbOf, viewAxes } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ---------- จังหวะ (ms) — สัญญากับ server (GRID_PLAN §7.12) ----------
export const DIEGO_FX = {
  throw: 650, oil: 450, explode: 900, ignite: 450, netTrap: 700, knife: 450, shot: 380, firstAid: 600,
  world: 1300, timeStop: 2200, timeResume: 1500, plot: 600, plotStep: 90,
};
export const diegoPlotMs = (n) => DIEGO_FX.plot + DIEGO_FX.plotStep * Math.max(0, Number(n) || 0);
const HOLD = 2400;          // หมากที่ฉากย้าย ค้างที่ปลายทางจน state มาถึง
const FROZEN_MAX = 300000;  // ของที่ค้างกลางอากาศรอเวลาเดินต่อได้นานสุด
const TT = { release: 90, land: 560, hang: 430 };       // ขว้าง: ปล่อยมือ · ตกถึงช่อง · จุดค้าง (หยุดเวลา — ไม้ขีด)
const TK = { release: 70, hit: 300 };                   // มีด: ปล่อย · ถึงเป้า
const TSH = { hit: 110 };                               // ปืน: กระสุนถึงเป้า
export const TS = { beat: 300, ring0: 420, ring1: 1350, tick: 1760 }; // หยุดเวลา: หัวใจเต้น · วงเริ่ม · วงพ้นกระดาน · เข็มหยุด
export const TR = { ring0: 80, ring1: 640, launch: 650, hit: 830 };  // เวลาเดินต่อ: วงเริ่มหด · หดถึงตัว · ของพุ่ง · ปะทะ
export const DIEGO_RESUME_HIT = TR.hit;
const PL = { wind: 260, knock: 230 };                   // กลอุบาย: ม้ายกขา · เป้ากระเด็น
const NETTRAP = { show: 200, pull: 520 };               // ตาข่ายดัก: โผล่ · ดึงถึงกลาง
const NET_MS = 650, ASH_MS = 1100, BURN_MS = 650, RELOAD_MS = 760, CUNNING_MS = 800, HORSE_MS = 900, PING_MS = 120, SPREAD_MS = 300;
export const DIEGO_FX_DUR = {
  diegoThrow: DIEGO_FX.throw + 40, diegoOil: DIEGO_FX.oil + 250, diegoExplode: DIEGO_FX.explode + 300, diegoIgnite: DIEGO_FX.ignite + 150,
  diegoAsh: ASH_MS, diegoBurn: BURN_MS, diegoNet: NET_MS, diegoNetTrap: DIEGO_FX.netTrap + HOLD, diegoKnife: DIEGO_FX.knife + 200,
  diegoShot: DIEGO_FX.shot + 500, diegoReload: RELOAD_MS, diegoAid: DIEGO_FX.firstAid, diegoWorld: DIEGO_FX.world,
  diegoStop: DIEGO_FX.timeStop, diegoResume: DIEGO_FX.timeResume, diegoPlot: diegoPlotMs(8) + HOLD, diegoHorse: HORSE_MS,
  diegoCunning: CUNNING_MS, diegoPing: PING_MS,
};
export const isDiegoFx = (kind) => typeof kind === "string" && (kind in DIEGO_FX_DUR);
export const DIEGO_RIDE_Z = 0.62; // ขี่ม้า: หมากนั่งบนหลังม้า (หน่วยช่อง — BoardCanvas บวกเข้า hz)

// ---------- สี (r,g,b) ----------
const GOLD = "255,206,64", GOLD_HI = "255,242,180", AMBER = "214,140,28", FIRE = "255,128,30", FIRE_HI = "255,224,120";
const STEEL = "214,222,232", BLOOD = "176,14,22", DUST = "196,172,132", SMOKE = "70,64,60";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut2 = (t) => 1 - (1 - t) * (1 - t);
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const okT = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const ptOf = (p) => ({ x: p.x, y: p.y });
const samePt = (a, b) => okT(a) && okT(b) && a.x === b.x && a.y === b.y;
const cen = (p, n = 1) => [p.x + n / 2, p.y + n / 2];
const rgbStr = (c) => rgbOf(normColor(c || "#e0b040")).join(",");
const tilesOf = (list) => (Array.isArray(list) ? list.filter(okT).map(ptOf) : []);
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function dirVec(d) {
  if (typeof d === "string") return DIRV[d] || null;
  if (d && Number.isFinite(d.x) && Number.isFinite(d.y) && (d.x || d.y)) { const l = Math.hypot(d.x, d.y); return [d.x / l, d.y / l]; }
  return null;
}
function viewRect(view) {
  const x0 = (view && Number.isFinite(view.x0) ? view.x0 : 0) - 60, y0 = (view && Number.isFinite(view.y0) ? view.y0 : 0) - 60;
  const x1 = (view && Number.isFinite(view.x1) ? view.x1 : 1280) + 60, y1 = (view && Number.isFinite(view.y1) ? view.y1 : 720) + 60;
  return [x0, y0, x1 - x0, y1 - y0];
}
function flashView(g, view, rgb, a, op = "lighter") {
  if (a <= 0.01) return;
  const r = viewRect(view);
  g.save(); g.globalCompositeOperation = op; g.fillStyle = `rgba(${rgb},${a})`; g.fillRect(r[0], r[1], r[2], r[3]); g.restore();
}
// คลื่นวงบนพื้น (หน่วยช่อง)
function groundRing(g, cx, cy, r, a, rgb, w = 2, z = 0.012) {
  if (a <= 0.01 || r <= 0) return;
  gEllipse(g, cx, cy, r, z, 44);
  g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = w; g.stroke();
}
// ฝุ่นพื้น (กลุ่มควัน) — rgb ไม่ใส่ = ฝุ่นน้ำตาลอ่อน
function dustPuff(g, cx, cy, q, n, spread, a, seed, rgb = DUST, rise = 0.35) {
  if (q <= 0 || q >= 1) return;
  for (let i = 0; i < n; i++) {
    const th = (i / n) * TAU + hash01(seed + i) * 0.5, d = spread * (0.3 + 0.7 * easeOut2(q)) * (0.6 + 0.6 * hash01(seed + i + 7));
    const [px, py, ps] = P(cx + Math.cos(th) * d, cy + Math.sin(th) * d, 0.06 + q * rise * (0.4 + hash01(seed + i + 3)));
    const rr = ps * (0.07 + 0.13 * q);
    const gr = g.createRadialGradient(px, py, 0, px, py, rr);
    gr.addColorStop(0, `rgba(${rgb},${0.55 * a * (1 - q)})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(px - rr, py - rr, rr * 2, rr * 2);
  }
}
// ประกายสี่แฉก (จุดจอ)
function sparkle(g, x, y, r, a, rgb = "255,255,255", rot = 0) {
  if (a <= 0.01 || r <= 0.3) return;
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = `rgba(${rgb},${a})`;
  g.beginPath();
  g.moveTo(0, -r); g.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0); g.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
  g.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0); g.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r);
  g.fill();
  g.restore();
}
function heartPath(g, x, y, h) {
  g.moveTo(x, y + h * 0.42);
  g.bezierCurveTo(x - h * 0.95, y - h * 0.2, x - h * 0.42, y - h * 0.98, x, y - h * 0.42);
  g.bezierCurveTo(x + h * 0.42, y - h * 0.98, x + h * 0.95, y - h * 0.2, x, y + h * 0.42);
}

// ---------- เวลาเดินต่อ / ของที่ค้างกลางอากาศ ----------
//  STOPS / RESUMES: ดิเอโก้ id → เวลา (performance.now — นาฬิกาเดียวกับ now ของ requestAnimationFrame) ที่ได้เหตุการณ์
const STOPS = new Map(), RESUMES = new Map();
const lastOf = (m, id) => { const l = m.get(id); return l && l.length ? l[l.length - 1] : -Infinity; };
const note = (m, id, t) => { const l = m.get(id) || []; l.push(t); if (l.length > 8) l.shift(); m.set(id, l); };
// เวลาที่ของชิ้นนี้ (เกิดระหว่างหยุดเวลาที่ evT) เริ่มพุ่งต่อ — null = ยังค้าง
function launchOf(e) {
  const l = RESUMES.get(e.id);
  if (!l) return null;
  for (const t of l) if (t > (e.evT || 0)) return t + TR.launch;
  return null;
}
// เวลาในฉากของของที่อาจค้าง: hangT = จุดค้าง · hitT = จุดถึงเป้า → พุ่งจาก hangT ถึง hitT ใน (TR.hit − TR.launch) ms หลังปล่อย
function frz(e, t, now, hangT, hitT) {
  if (!e.frozen) return { t, hang: false, wait: false };
  const L = launchOf(e);
  if (L == null || now < L) return { t: Math.min(t, hangT), hang: t >= hangT, wait: true };
  const dt = now - L, fly = TR.hit - TR.launch;
  if (dt < fly) return { t: hangT + (hitT - hangT) * (dt / fly), hang: false, wait: false };
  return { t: hitT + (dt - fly), hang: false, wait: false };
}
// ภาพค้างตามเวลา: ระหว่างหยุดเวลา ไฟ/ฟิล์มน้ำมัน/ลวด หยุดขยับ (ใช้เวลาตอนเริ่มหยุดแทน now)
const FREEZE = { by: null, t0: 0 };
function freezeLive(freeze, now) {
  const by = freeze && freeze.by != null ? freeze.by : null;
  if (by == null) {
    // state เลิกหยุดเวลาแต่ไม่ได้รับ timeResume (หลุด/เข้าใหม่) = ปล่อยของที่ค้างกลางอากาศทันที
    if (FREEZE.by != null && lastOf(RESUMES, FREEZE.by) < Math.max(FREEZE.t0, lastOf(STOPS, FREEZE.by))) note(RESUMES, FREEZE.by, now - TR.launch);
    FREEZE.by = null;
    return null;
  }
  if (FREEZE.by !== by) { FREEZE.by = by; FREEZE.t0 = now; }
  // state ยังค้าง timeFreeze แต่ได้ timeResume ของคนนี้แล้ว = ถือว่าเวลาเดินต่อ (กัน state มาช้า)
  const stop = Math.max(FREEZE.t0, lastOf(STOPS, by));
  if (lastOf(RESUMES, by) > stop) return null;
  return by;
}
export function diegoAmbientNow(freeze, now) {
  return freezeLive(freeze, now) != null ? Math.min(now, Math.max(FREEZE.t0, lastOf(STOPS, FREEZE.by) + TS.ring1)) : now;
}

// ---------- รูปม้า ----------
const HORSE_URL = "/characters/diego_alt/sliver_bullet.png";
let horseImg = null;
function horse() {
  if (!horseImg && typeof Image === "function") { const img = new Image(); img.decoding = "async"; img.src = HORSE_URL; horseImg = img; }
  return horseImg && horseImg.complete && horseImg.naturalWidth > 0 ? horseImg : null;
}
export const preloadDiegoArt = () => { horse(); };
const HORSE_H = 1.62; // ความสูงรูปม้า (หน่วยช่อง)

// ---------- ของชิ้นเล็ก (จุดจอ) ----------
// มีด: ใบเงิน + การ์ดดำ + ด้ามน้ำตาล · L = ความยาวทั้งเล่ม (px) · ang = มุมปลายใบบนจอ
function drawKnife(g, x, y, L, ang, a = 1, glint = 0) {
  if (a <= 0.01) return;
  g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha *= a;
  const bl = L * 0.6, w = L * 0.09;
  const gr = g.createLinearGradient(0, -w, 0, w);
  gr.addColorStop(0, "#fbfdff"); gr.addColorStop(0.45, "#c4ccd6"); gr.addColorStop(1, "#6d7681");
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(bl, 0); g.quadraticCurveTo(bl * 0.55, -w * 1.1, 0, -w); g.lineTo(0, w * 0.8); g.quadraticCurveTo(bl * 0.6, w * 0.6, bl, 0); g.closePath(); g.fill();
  g.strokeStyle = "rgba(40,46,56,.8)"; g.lineWidth = Math.max(0.6, L * 0.02); g.stroke();
  g.fillStyle = "#2a2a30"; g.fillRect(-L * 0.035, -w * 1.7, L * 0.07, w * 3.4);
  g.fillStyle = "#6b3f1e"; g.beginPath(); g.ellipse(-L * 0.2, 0, L * 0.17, w * 0.95, 0, 0, TAU); g.fill();
  g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(-L * 0.33, -w * 0.5, L * 0.24, w * 0.3);
  if (glint > 0.01) {
    g.globalCompositeOperation = "lighter";
    sparkle(g, bl * 0.55, -w * 0.4, L * 0.32 * glint, glint, "255,255,255", 0.3);
  }
  g.restore();
}
// แกลลอนน้ำมันแดง: s = ด้าน (px)
function drawCan(g, x, y, s, ang, a = 1) {
  if (a <= 0.01) return;
  g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha *= a;
  const w = s * 0.78, h = s, r = s * 0.12;
  g.fillStyle = "#b8231c";
  g.beginPath(); g.moveTo(-w / 2 + r, -h / 2); g.lineTo(w / 2 - r, -h / 2); g.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  g.lineTo(w / 2, h / 2 - r); g.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); g.lineTo(-w / 2 + r, h / 2); g.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  g.lineTo(-w / 2, -h / 2 + r); g.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); g.closePath(); g.fill();
  g.strokeStyle = "#5c0d09"; g.lineWidth = Math.max(0.8, s * 0.06); g.stroke();
  // ลายกากบาทนูน + มือจับ 3 ช่อง + ฝาปากกา
  g.strokeStyle = "rgba(255,130,110,.55)"; g.lineWidth = Math.max(0.6, s * 0.05);
  g.beginPath(); g.moveTo(-w * 0.3, -h * 0.05); g.lineTo(w * 0.3, h * 0.38); g.moveTo(w * 0.3, -h * 0.05); g.lineTo(-w * 0.3, h * 0.38); g.stroke();
  g.fillStyle = "#5c0d09"; for (let i = 0; i < 3; i++) g.fillRect(-w * 0.36 + i * w * 0.26, -h * 0.42, w * 0.16, h * 0.14);
  g.fillStyle = "#e0b040"; g.fillRect(w * 0.18, -h * 0.66, w * 0.2, h * 0.18);
  g.fillStyle = "rgba(255,255,255,.4)"; g.fillRect(-w * 0.42, -h * 0.25, w * 0.08, h * 0.6);
  g.restore();
}
// ลิ้นไฟ (จุดจอ) — x,y = ฐาน · h = สูง (px) · w = ครึ่งกว้างฐาน (ไม่ใส่ = ตามความสูง) · sway = เอนตามลม
//  ฐานป่องโค้งมน ปลายเรียวโค้งแบบตัว S · ความทึบไล่จางไปหาปลาย (ไม่เป็นกรวยแข็ง) · ชั้นนอกแดงส้ม → กลางเหลือง → แกนขาวนวล
function flameTongue(g, x, y, h, w, sway, a, hot = 0) {
  if (a <= 0.01 || h <= 0.5) return;
  w = w || h * 0.36;
  const tipX = x + sway * h * 0.5, tipY = y - h, midX = x + sway * h * 0.14;
  const shape = (k) => {
    g.beginPath();
    g.moveTo(x - w * k, y);
    g.bezierCurveTo(x - w * 1.3 * k, y - h * 0.32, midX - w * 0.6 * k, y - h * 0.68, tipX, tipY);
    g.bezierCurveTo(midX + w * 0.3 * k, y - h * 0.6, x + w * 1.3 * k, y - h * 0.28, x + w * k, y);
    g.quadraticCurveTo(x, y + w * 0.6 * k, x - w * k, y);
    g.closePath();
  };
  const grad = (stops) => { const gr = g.createLinearGradient(x, y + w * 0.4, tipX, tipY); for (const [p, c] of stops) gr.addColorStop(p, c); return gr; };
  g.fillStyle = grad([[0, `rgba(226,58,14,${0.7 * a})`], [0.45, `rgba(240,82,18,${0.42 * a})`], [1, "rgba(200,40,10,0)"]]);
  shape(1); g.fill();
  g.save(); g.globalCompositeOperation = "lighter";
  g.fillStyle = grad([[0, `rgba(255,186,56,${(0.7 + 0.25 * hot) * a})`], [0.55, `rgba(255,132,36,${0.28 * a})`], [1, "rgba(255,132,36,0)"]]);
  shape(0.64); g.fill();
  g.fillStyle = grad([[0, `rgba(255,250,214,${0.8 * a})`], [0.4, `rgba(255,228,140,${0.22 * a})`], [1, "rgba(255,228,140,0)"]]);
  shape(0.3); g.fill();
  g.restore();
}
// ไม้ขีดติดไฟ (จุดจอ) · L = ยาว (px) · still = เปลวนิ่ง (ค้างในเวลาหยุด)
function drawMatch(g, x, y, L, ang, now, a = 1, still = false) {
  if (a <= 0.01) return;
  g.save(); g.globalAlpha *= a;
  const hx = x + Math.cos(ang) * L * 0.5, hy = y + Math.sin(ang) * L * 0.5, tx = x - Math.cos(ang) * L * 0.5, ty = y - Math.sin(ang) * L * 0.5;
  g.strokeStyle = "#e7c896"; g.lineWidth = Math.max(1.2, L * 0.11); g.lineCap = "round";
  g.beginPath(); g.moveTo(tx, ty); g.lineTo(hx, hy); g.stroke();
  g.fillStyle = "#7a1a10"; g.beginPath(); g.arc(hx, hy, Math.max(1.2, L * 0.1), 0, TAU); g.fill();
  const fl = still || REDUCED ? 0 : Math.sin(now / 45) * 0.15 + Math.sin(now / 23) * 0.08;
  g.save(); g.globalCompositeOperation = "lighter"; glow(g, hx, hy, L * 0.9, FIRE, 0.55); g.restore();
  flameTongue(g, hx, hy + L * 0.08, L * (0.55 + fl * 0.4), L * 0.17, fl, 1, 0.6);
  g.restore();
}
// กระสุน (จุดจอ) — หัวทองเหลืองเล็ก
function drawBullet(g, x, y, s, ang) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = "#e8b04a"; g.beginPath(); g.ellipse(0, 0, s, s * 0.45, 0, 0, TAU); g.fill();
  g.fillStyle = "#fff4c8"; g.beginPath(); g.ellipse(s * 0.25, -s * 0.12, s * 0.35, s * 0.12, 0, 0, TAU); g.fill();
  g.restore();
}

// ---------- หน้าปัดนาฬิกาบนพื้น (ลาย THE WORLD) ----------
//  R = รัศมี (ช่อง) · hands = { h, m, s } มุม (เรเดียน ตามเข็มจาก 12 นาฬิกา — 12 ชี้ไปทางไกลกล้อง)
const ROMAN = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
function clockFace(g, cx, cy, R, hands, a, lowQ, z = 0.02) {
  if (a <= 0.01 || R <= 0.05) return;
  const ax = viewAxes(), at = (ang, r, zz = z) => P(cx + (-ax.fx * Math.cos(ang) + ax.rx * Math.sin(ang)) * r, cy + (-ax.fy * Math.cos(ang) + ax.ry * Math.sin(ang)) * r, zz);
  g.save(); g.lineCap = "round";
  // เงาทองเข้ม (เห็นบนพื้นสว่าง) → วงเรือง
  for (const [rr, w] of [[R, 2.6], [R * 0.9, 1.2]]) {
    gEllipse(g, cx, cy, rr, z, 64);
    g.strokeStyle = `rgba(150,96,10,${0.7 * a})`; g.lineWidth = w + 1.6; g.stroke();
    g.save(); g.globalCompositeOperation = "lighter";
    g.strokeStyle = `rgba(${GOLD_HI},${0.85 * a})`; g.lineWidth = w; g.stroke();
    g.restore();
  }
  // ขีดหลัก 60 ขีด (ทุก 5 = ยาว)
  g.save(); g.globalCompositeOperation = "lighter";
  g.beginPath();
  for (let i = 0; i < 60; i += lowQ ? 5 : 1) {
    const an = (i / 60) * TAU, r0 = i % 5 ? R * 0.86 : R * 0.78, p0 = at(an, r0), p1 = at(an, R * 0.9);
    g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
  }
  g.strokeStyle = `rgba(${GOLD_HI},${0.7 * a})`; g.lineWidth = 1.2; g.stroke();
  g.restore();
  // ตัวเลขโรมัน
  if (!lowQ) {
    g.textAlign = "center"; g.textBaseline = "middle";
    for (let i = 0; i < 12; i++) {
      const p = at((i / 12) * TAU, R * 0.66);
      g.font = `700 ${Math.max(7, p[2] * R * 0.14) | 0}px "Times New Roman",serif`;
      g.fillStyle = `rgba(120,74,6,${0.75 * a})`; g.fillText(ROMAN[i], p[0] + 0.8, p[1] + 0.8);
      g.fillStyle = `rgba(${GOLD_HI},${0.95 * a})`; g.fillText(ROMAN[i], p[0], p[1]);
    }
    g.textBaseline = "alphabetic";
  }
  // เข็ม
  const hand = (ang, len, w, rgb) => {
    const c0 = at(0, 0, z + 0.004), tip = at(ang, len, z + 0.004), tail = at(ang + Math.PI, len * 0.16, z + 0.004);
    g.beginPath(); g.moveTo(tail[0], tail[1]); g.lineTo(tip[0], tip[1]);
    g.strokeStyle = `rgba(110,66,4,${0.8 * a})`; g.lineWidth = w + 1.6; g.stroke();
    g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = w; g.stroke();
    return c0;
  };
  const c0 = hand(hands.h || 0, R * 0.42, 3.2, GOLD);
  hand(hands.m || 0, R * 0.62, 2.2, GOLD_HI);
  hand(hands.s || 0, R * 0.8, 1.1, "255,120,90");
  g.fillStyle = `rgba(${GOLD_HI},${a})`; g.beginPath(); g.arc(c0[0], c0[1], Math.max(1.5, c0[2] * 0.035), 0, TAU); g.fill();
  g.restore();
}

// ---------- ขว้าง (แกลลอน / ไม้ขีด / ตาข่าย) ----------
function throwGeo(e) {
  if (e._g) return e._g;
  const A0 = cen(e.from), B = cen(e.to);
  let ux = B[0] - A0[0], uy = B[1] - A0[1];
  const D = Math.hypot(ux, uy) || 1; ux /= D; uy /= D;
  e._g = { A: [A0[0] + ux * 0.25, A0[1] + uy * 0.25], B, D };
  return e._g;
}
function throwAt(G, t, item) {
  const zEnd = item === "oil" ? 0.18 : 0.08;
  if (t < TT.release) { const k = Math.sin((t / TT.release) * Math.PI) * 0.12; return [G.A[0], G.A[1], 1.0 + k]; }
  const u = clamp01((t - TT.release) / (TT.land - TT.release));
  return [lerp(G.A[0], G.B[0], u), lerp(G.A[1], G.B[1], u), lerp(1.0, zEnd, u) + Math.sin(Math.PI * u) * (0.45 + 0.1 * G.D)];
}
function throwFx(g, e, t0, now, lowQ) {
  if (!okT(e.from) || !okT(e.to)) return;
  const F = frz(e, t0, now, TT.hang, TT.land), t = F.t;
  if (t >= DIEGO_FX.throw) return;
  const G = throwGeo(e), item = e.item, spin = F.wait && F.hang ? (REDUCED ? 0 : now * 0.0006) : t * 0.022;
  // หาง: น้ำมันหยด / สะเก็ดไฟ / ประกายลวด
  if (t > TT.release && t < TT.land + 60 && !F.hang) {
    g.save(); g.globalCompositeOperation = item === "oil" ? "source-over" : "lighter";
    for (let k = 1; k <= (lowQ ? 4 : 9); k++) {
      const tt = t - k * 22;
      if (tt < TT.release) break;
      const [x, y, z] = throwAt(G, tt, item), drop = item === "oil" ? (k * 22) / 1000 : 0;
      const [px, py, ps] = P(x, y, Math.max(0.02, z - 2.4 * drop * drop * 9));
      const a = 1 - k / 10;
      if (item === "oil") { g.fillStyle = `rgba(90,52,10,${0.8 * a})`; g.beginPath(); g.ellipse(px, py, ps * 0.025, ps * 0.04, 0, 0, TAU); g.fill(); }
      else if (item === "match") { g.fillStyle = `rgba(${k % 2 ? FIRE_HI : FIRE},${0.8 * a})`; g.beginPath(); g.arc(px + (hash01(k + t) - 0.5) * 4, py, Math.max(1, ps * 0.022 * a), 0, TAU); g.fill(); }
      else sparkle(g, px, py, ps * 0.05 * a, 0.7 * a, STEEL, k);
    }
    g.restore();
  }
  // ลงพื้น: ฝุ่น/ประกาย
  const land = t - TT.land;
  if (land >= 0) {
    if (item === "match") {
      const [lx, ly, ls] = P(G.B[0], G.B[1], 0.1);
      g.save(); g.globalCompositeOperation = "lighter"; glow(g, lx, ly, ls * 0.6, FIRE, 0.7 * (1 - land / 90)); g.restore();
    } else dustPuff(g, G.B[0], G.B[1], land / 200, lowQ ? 3 : 6, 0.35, 0.7, 5, item === "oil" ? "120,80,30" : DUST);
  }
  // ตัวของ
  const [x, y, z] = throwAt(G, Math.min(t, TT.land), item), [sx, sy, ss] = P(x, y, z);
  const fade = land > 0 ? clamp01(1 - land / 90) : 1;
  if (land < 0 || item !== "match") { gEllipse(g, x, y, 0.12, 0, 16); g.fillStyle = `rgba(0,0,0,${0.18 * fade})`; g.fill(); }
  if (item === "oil") {
    // ตกถึงพื้น = แกลลอนคว่ำแล้วหายไปในแอ่ง (ฉากสาดคือ event oil)
    drawCan(g, sx, sy, ss * 0.38, land > 0 ? 1.4 : spin * 0.9, fade);
  } else if (item === "match") {
    if (land < 0) drawMatch(g, sx, sy, ss * 0.28, spin * 1.4, now, 1, F.hang);
    if (F.hang && !lowQ) { g.save(); g.globalCompositeOperation = "lighter"; sparkle(g, sx, sy - ss * 0.1, ss * 0.12, 0.55 + 0.25 * Math.sin(now / 160), GOLD_HI, 0.4); g.restore(); }
  } else {
    // ม้วนลวดหนาม
    g.save(); g.translate(sx, sy); g.rotate(spin); g.globalAlpha *= fade;
    g.strokeStyle = `rgba(${STEEL},0.95)`; g.lineWidth = Math.max(1, ss * 0.012);
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(0, 0, ss * 0.13, ss * (0.05 + i * 0.02), i * 0.8, 0, TAU); g.stroke(); }
    for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU; sparkle(g, Math.cos(an) * ss * 0.13, Math.sin(an) * ss * 0.09, ss * 0.025, 0.9, STEEL, an); }
    g.restore();
  }
}

// ---------- สาดน้ำมัน ----------
function oilFx(g, e, t, lowQ) {
  if (!okT(e.at) || t >= DIEGO_FX_DUR.diegoOil) return;
  const [cx, cy] = cen(e.at), q = t / DIEGO_FX.oil;
  // มงกุฎน้ำมัน: หยดอำพันเงาวาวพุ่งเป็นโค้งจากกลาง
  const N = lowQ ? 14 : 34;
  for (let i = 0; i < N; i++) {
    const th = hash01(i + 3) * TAU, sp = 0.6 + hash01(i + 9) * 1.4, tt = t / 1000, up = 1.2 + hash01(i + 5) * 1.6;
    const z = up * tt * 2.2 - 9 * tt * tt;
    if (z < -0.02 || tt > 0.55) continue;
    const r = sp * tt * 2.4, [px, py, ps] = P(cx + Math.cos(th) * r, cy + Math.sin(th) * r, Math.max(0.01, z)), rr = Math.max(1, ps * (0.03 + 0.02 * hash01(i)));
    g.fillStyle = "rgba(92,54,10,.92)"; g.beginPath(); g.ellipse(px, py, rr, rr * 1.25, 0, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,214,140,.75)"; g.beginPath(); g.arc(px - rr * 0.3, py - rr * 0.35, rr * 0.35, 0, TAU); g.fill();
  }
  // วงกระเพื่อม
  for (let k = 0; k < (lowQ ? 1 : 3); k++) {
    const qq = clamp01(q * 1.2 - k * 0.18);
    if (qq > 0 && qq < 1) groundRing(g, cx, cy, 0.3 + 1.3 * easeOut3(qq), 0.6 * (1 - qq), k === 1 ? "255,220,150" : AMBER, 2.2 * (1 - qq) + 0.6, 0.02);
  }
  // คนที่โดนสาด: ละอองน้ำมันกระเซ็นที่ตัว
  for (const s of e.soakedAt || []) {
    const [sx, sy, ss] = P(s.x + 0.5, s.y + 0.5, 0.75), aa = clamp01(1 - (t - 80) / 360);
    if (t < 80 || aa <= 0) continue;
    for (let i = 0; i < (lowQ ? 4 : 9); i++) {
      const an = hash01(i + s.x * 7 + s.y) * TAU, d = ss * (0.1 + 0.3 * easeOut2(1 - aa));
      g.fillStyle = `rgba(110,64,12,${0.9 * aa})`; g.beginPath(); g.arc(sx + Math.cos(an) * d, sy + Math.sin(an) * d * 0.8 + ss * 0.2 * (1 - aa), Math.max(1, ss * 0.025), 0, TAU); g.fill();
    }
  }
}

// ---------- ระเบิด ----------
function explodeFx(g, e, t0, now, lowQ, view) {
  if (!okT(e.at)) return;
  const F = frz(e, t0, now, 0, 0), t = F.t;
  if (F.wait || t < 0 || t >= DIEGO_FX_DUR.diegoExplode) return;
  const [cx, cy] = cen(e.at), tiles = e.tiles && e.tiles.length ? e.tiles : [e.at];
  const end = DIEGO_FX.explode;
  g.save();
  // แสงวาบทั้งจอ + แกนขาว
  if (t < 200) flashView(g, view, "255,190,110", 0.3 * (1 - t / 200));
  const [sx, sy, ss] = P(cx, cy, 0.5);
  g.save(); g.globalCompositeOperation = "lighter";
  if (t < 160) glow(g, sx, sy, ss * (0.8 + 2.4 * (t / 160)), "255,250,230", 0.95 * (1 - t / 160));
  g.restore();
  // คลื่นกระแทกบนพื้น
  for (let k = 0; k < (lowQ ? 1 : 2); k++) {
    const qq = clamp01(t / 520 - k * 0.15);
    if (qq > 0 && qq < 1) groundRing(g, cx, cy, 0.4 + 2.6 * easeOut3(qq), 0.85 * (1 - qq), k ? FIRE_HI : "255,255,240", 4 * (1 - qq) + 1, 0.03);
  }
  // ช่องลุกเป็นไฟ (แสงบนพื้น)
  for (const tl of tiles) {
    const d = Math.hypot(tl.x + 0.5 - cx, tl.y + 0.5 - cy), at = d * 70, k = t >= at ? Math.max(0, 1 - (t - at) / 600) : 0;
    if (k <= 0.01) continue;
    g.save(); g.globalCompositeOperation = "lighter"; quad(g, tl.x, tl.y, 0.02, 0.015); g.fillStyle = `rgba(255,150,40,${0.45 * k})`; g.fill(); g.restore();
  }
  // ลูกไฟ: ก้อนไฟย่อยหลายก้อนต่อช่อง (ขนาด/ความเร็วลอยต่างกัน · ทยอยจากกลาง) + ลูกไฟใหญ่กลางลอยสูง → มอดเป็นควันดำ
  const puffs = [];
  for (const tl of tiles) {
    const d = Math.hypot(tl.x + 0.5 - cx, tl.y + 0.5 - cy), seed = tl.x * 13 + tl.y * 7;
    for (let j = 0; j < (lowQ ? 1 : 3); j++) {
      puffs.push({ x: tl.x + 0.5 + (hash01(seed + j * 3) - 0.5) * 0.55, y: tl.y + 0.5 + (hash01(seed + j * 3 + 1) - 0.5) * 0.55, d0: d * 70 + j * 35,
        R: 0.22 + 0.2 * hash01(seed + j * 3 + 2), up: 0.5 + 0.7 * hash01(seed + j + 9), seed: seed + j * 17 });
    }
  }
  puffs.push({ x: cx, y: cy, d0: 0, R: 0.62, up: 1.5, seed: 3, big: true });
  puffs.sort((a, b) => depthOf(a.x, a.y) - depthOf(b.x, b.y));
  for (const pf of puffs) {
    const tt = t - pf.d0, life = end - pf.d0 - (pf.big ? 0 : 120), q = tt / life;
    if (tt < 0 || q >= 1) continue;
    const rise = 0.25 + pf.up * easeOut2(q), R = pf.R * (0.35 + 0.65 * easeOut3(Math.min(1, tt / 220))) * (1 + 0.25 * q);
    const [fx, fy, fs] = P(pf.x, pf.y, rise), rr = fs * R;
    // ควันดำ (ก้อนไฟมอด) ลอยเหนือ
    if (q > 0.3 && !lowQ) {
      const sq = (q - 0.3) / 0.7, [mx, my, ms] = P(pf.x + sq * 0.12, pf.y, rise + 0.3 + sq * 0.8), r2 = ms * R * (1 + 0.8 * sq);
      const gr = g.createRadialGradient(mx, my, 0, mx, my, r2);
      gr.addColorStop(0, `rgba(${SMOKE},${0.55 * Math.sin(Math.PI * sq)})`); gr.addColorStop(0.7, `rgba(${SMOKE},${0.3 * Math.sin(Math.PI * sq)})`); gr.addColorStop(1, `rgba(${SMOKE},0)`);
      g.fillStyle = gr; g.fillRect(mx - r2, my - r2, r2 * 2, r2 * 2);
    }
    const a = q < 0.45 ? 1 : 1 - (q - 0.45) / 0.55, heat = clamp01(1 - q * 1.6);
    // ขอบไฟแดงเข้ม (ทับปกติ — ให้ก้อนมีรูปทรง ไม่เบลอเป็นผืน) → ไส้เหลืองขาว (ร้อนตอนต้น)
    const fb = g.createRadialGradient(fx - rr * 0.2, fy - rr * 0.25, 0, fx, fy, rr);
    fb.addColorStop(0, `rgba(255,${200 + 50 * heat | 0},${90 + 120 * heat | 0},${a})`); fb.addColorStop(0.45, `rgba(255,${120 + 60 * heat | 0},30,${0.95 * a})`);
    fb.addColorStop(0.8, `rgba(196,44,12,${0.85 * a})`); fb.addColorStop(1, `rgba(110,20,8,${0.0})`);
    g.fillStyle = fb; g.beginPath();
    // ขอบเป็นคลื่น (ก้อนไฟไม่กลมเป๊ะ)
    for (let i = 0; i <= 14; i++) { const an = (i / 14) * TAU, k = 1 + 0.12 * Math.sin(an * 3 + pf.seed + q * 4); const px = fx + Math.cos(an) * rr * k, py = fy + Math.sin(an) * rr * k * 0.92; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
    g.closePath(); g.fill();
    if (!lowQ && pf.big) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, fx, fy, rr * 1.6, FIRE, 0.45 * a); g.restore(); }
  }
  // เศษไฟกระเด็น
  if (!lowQ) {
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 28; i++) {
      const th = hash01(i + 70) * TAU, sp = 0.8 + hash01(i + 80) * 2.2, tt = t / 1000, z = 0.4 + (1.5 + hash01(i + 90) * 2) * tt - 6 * tt * tt;
      if (z < 0 || tt > 0.8) continue;
      const [px, py, ps] = P(cx + Math.cos(th) * sp * tt * 2, cy + Math.sin(th) * sp * tt * 2, z), a = 1 - tt / 0.8;
      g.fillStyle = `rgba(${i % 3 ? FIRE_HI : "255,255,255"},${a})`; g.beginPath(); g.arc(px, py, Math.max(1, ps * 0.03), 0, TAU); g.fill();
    }
    g.restore();
  }
  // คนที่โดน: แสงไฟแตกที่ตัว
  for (const h of e.hitsAt || []) {
    const [hx, hy, hs] = P(h.x + 0.5, h.y + 0.5, 0.7), q = (t - 60) / 400;
    if (q < 0 || q > 1) continue;
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, hx, hy, hs * (0.4 + 0.6 * q), FIRE, 0.8 * (1 - q)); g.restore();
  }
  g.restore();
}

// ---------- ติดไฟที่ตัว / กองไฟเผา ----------
function flameWrap(g, cx, cy, t, dur, now, lowQ, seed, big = 1) {
  const q = t / dur;
  if (q < 0 || q >= 1) return;
  const a = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3, n = lowQ ? 4 : 8;
  const [bx, by, s] = P(cx, cy, 0);
  if (t < 120) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, bx, by - s * 0.8, s * 1.2 * big, FIRE, 0.8 * (1 - t / 120)); g.restore(); }
  for (let i = 0; i < n; i++) {
    const an = (i / n) * TAU + q * 3 + hash01(seed + i), r = 0.32 * (1 - q * 0.3);
    const [px, py, ps] = P(cx + Math.cos(an) * r, cy + Math.sin(an) * r * 0.8, 0.05 + easeOut2(q) * 0.6 * hash01(seed + i + 2));
    const h = ps * big * (0.6 + 0.7 * Math.sin(Math.PI * clamp01(q * 1.4 + hash01(seed + i + 5) * 0.2))), sway = REDUCED ? 0 : Math.sin(now / 70 + i) * 0.3;
    flameTongue(g, px, py, h, 0, sway, a, 0.4);
  }
  if (!lowQ) {
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 12; i++) {
      const ph = clamp01(q * 1.2 - hash01(seed + i + 9) * 0.3);
      if (ph <= 0 || ph >= 1) continue;
      const [px, py, ps] = P(cx + (hash01(seed + i) - 0.5) * 0.7, cy + (hash01(seed + i + 1) - 0.5) * 0.5, 0.3 + ph * 1.8);
      g.fillStyle = `rgba(${FIRE_HI},${(1 - ph) * a})`; g.beginPath(); g.arc(px, py, Math.max(1, ps * 0.02), 0, TAU); g.fill();
    }
    g.restore();
  }
}
function igniteFx(g, e, t0, now, lowQ) {
  if (!okT(e.at)) return;
  const F = frz(e, t0, now, 0, 0), t = F.t;
  if (F.wait || t < 0) return;
  const n = Math.max(1, e.size | 0), [cx, cy] = cen(e.at, n);
  flameWrap(g, cx, cy, t, DIEGO_FX_DUR.diegoIgnite, now, lowQ, 17 + e.at.x * 3 + e.at.y, n);
}
function burnFx(g, e, t, now, lowQ) {
  if (!okT(e.at)) return;
  const n = Math.max(1, e.size | 0), [cx, cy] = cen(e.at, n);
  flameWrap(g, cx, cy, t, BURN_MS, now, lowQ, 31 + e.at.x + e.at.y * 5, 1.25 * n);
}
// กองไฟมอด → ควันเทา (ขี้เถ้าค่อยๆ ขึ้นใน drawDiegoGround)
function ashFx(g, e, t, now, lowQ) {
  const q = t / ASH_MS;
  if (q >= 1) return;
  for (const tl of e.tiles || []) {
    const seed = tl.x * 11 + tl.y * 3, cx = tl.x + 0.5, cy = tl.y + 0.5;
    if (t < 420) {
      const k = 1 - t / 420, [bx, by, s] = P(cx, cy, 0);
      for (let i = 0; i < (lowQ ? 2 : 4); i++) {
        const ox = (hash01(seed + i) - 0.5) * s * 0.6, sway = REDUCED ? 0 : Math.sin(now / 80 + i) * 0.3;
        flameTongue(g, bx + ox, by + (hash01(seed + i + 2) - 0.5) * s * 0.2, s * 0.55 * k * (0.6 + 0.4 * hash01(seed + i + 4)), 0, sway, k);
      }
    }
    if (!lowQ) for (let j = 0; j < 3; j++) {
      const sq = clamp01((t - 150 - j * 90) / (ASH_MS - 150 - j * 90));
      if (sq <= 0 || sq >= 1) continue;
      const [mx, my, ms] = P(cx + (hash01(seed + j) - 0.5) * 0.3 + sq * 0.15, cy + (hash01(seed + j + 5) - 0.5) * 0.3, 0.2 + sq * 1.6);
      const rr = ms * (0.12 + 0.25 * sq), gr = g.createRadialGradient(mx, my, 0, mx, my, rr);
      gr.addColorStop(0, `rgba(150,146,140,${0.5 * Math.sin(Math.PI * sq)})`); gr.addColorStop(1, "rgba(150,146,140,0)");
      g.fillStyle = gr; g.fillRect(mx - rr, my - rr, rr * 2, rr * 2);
    }
  }
}

// ---------- ตาข่าย ----------
// เส้นลวดตาราง 3×3 รอบช่องกลาง (cx, cy = มุมบนซ้ายช่องกลาง) · shrink 0..1 = หดเข้าหากลาง · z = ความสูง · reveal 0..1 = แผ่จากกลาง
function netLines(cx, cy, shrink = 0, reveal = 1) {
  const mx = cx + 0.5, my = cy + 0.5, k = 1 - shrink, L = 1.5 * k * reveal, out = [];
  for (let i = 0; i < 4; i++) {
    const o = (-1.5 + i) * k * reveal;
    out.push([[mx + o, my - L], [mx + o, my + L]], [[mx - L, my + o], [mx + L, my + o]]);
  }
  return out;
}
function wireStroke(g, lines, z, a, w, now, lowQ, barbs = true, rgbGlow = null) {
  if (a <= 0.01) return;
  g.save(); g.lineCap = "round";
  g.beginPath();
  for (const [p0, p1] of lines) { const A = P(p0[0], p0[1], z), B = P(p1[0], p1[1], z); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); }
  g.strokeStyle = `rgba(30,34,40,${0.55 * a})`; g.lineWidth = w + 1.4; g.stroke();
  if (rgbGlow && !lowQ) { g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = `rgba(${rgbGlow},${0.35 * a})`; g.lineWidth = w + 4; g.stroke(); g.restore(); }
  g.strokeStyle = `rgba(${STEEL},${a})`; g.lineWidth = w; g.stroke();
  if (barbs && !lowQ) {
    g.beginPath();
    for (const [p0, p1] of lines) {
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), n = Math.floor(len / 0.3);
      for (let i = 1; i < n; i++) {
        const k = i / n, x = lerp(p0[0], p1[0], k), y = lerp(p0[1], p1[1], k), d = 0.05;
        const A = P(x - d, y - d, z + 0.03), B = P(x + d, y + d, z - 0.01), C = P(x + d, y - d, z + 0.03), D = P(x - d, y + d, z - 0.01);
        g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.moveTo(C[0], C[1]); g.lineTo(D[0], D[1]);
      }
    }
    g.strokeStyle = `rgba(${STEEL},${0.8 * a})`; g.lineWidth = Math.max(0.6, w * 0.7); g.stroke();
  }
  // ประกายวิ่งตามลวด
  if (!lowQ && !REDUCED) {
    g.globalCompositeOperation = "lighter";
    lines.forEach(([p0, p1], i) => {
      const ph = ((now / 2600) + hash01(i + 3)) % 1, x = lerp(p0[0], p1[0], ph), y = lerp(p0[1], p1[1], ph), [sx, sy, ss] = P(x, y, z);
      sparkle(g, sx, sy, ss * 0.06, a * Math.sin(Math.PI * ph), "255,255,255", 0.6);
    });
  }
  g.restore();
}
function netFx(g, e, t, now, lowQ) {
  if (!okT(e.at)) return;
  const q = clamp01(t / (NET_MS * 0.55)), a = t < NET_MS * 0.6 ? 1 : 1 - (t - NET_MS * 0.6) / (NET_MS * 0.4);
  wireStroke(g, netLines(e.at.x, e.at.y, 0, easeOut3(q)), 0.06, 0.95 * a, 1.4, now, lowQ, true, GOLD_HI);
  if (t < 200) { const [sx, sy, ss] = P(e.at.x + 0.5, e.at.y + 0.5, 0.1); g.save(); g.globalCompositeOperation = "lighter"; glow(g, sx, sy, ss * 0.8, STEEL, 0.6 * (1 - t / 200)); g.restore(); }
}
function netTrapPose(e, t) {
  if (!okT(e.from) || !okT(e.to)) return null;
  if (t < NETTRAP.show) return { ...e.from, hz: 0 };
  if (t < NETTRAP.pull) { const k = easeIn2((t - NETTRAP.show) / (NETTRAP.pull - NETTRAP.show)); return { x: lerp(e.from.x, e.to.x, k), y: lerp(e.from.y, e.to.y, k), hz: Math.sin(Math.PI * k) * 0.18 }; }
  return { ...e.to, hz: 0 };
}
function netTrapFx(g, e, t, now, lowQ) {
  if (!okT(e.to) || t >= DIEGO_FX.netTrap) return;
  const c = e.to, cx = c.x + 0.5, cy = c.y + 0.5;
  // โผล่: ลวดทั้งผืนแวบขึ้นจากพื้น → หดรัดเข้ากลาง → พันรอบตัว
  const show = clamp01(t / NETTRAP.show), shrink = t < NETTRAP.show ? 0 : easeIn2(clamp01((t - NETTRAP.show) / (NETTRAP.pull - NETTRAP.show))) * 0.85;
  const z = 0.04 + 0.45 * easeOut2(show) * (1 - shrink * 0.4), a = t < NETTRAP.pull ? 1 : 1 - (t - NETTRAP.pull) / (DIEGO_FX.netTrap - NETTRAP.pull);
  if (t < 140) { g.save(); g.globalCompositeOperation = "lighter"; for (const tl of e.tiles || []) { quad(g, tl.x, tl.y, 0.04, 0.02); g.fillStyle = `rgba(${STEEL},${0.35 * (1 - t / 140)})`; g.fill(); } g.restore(); }
  wireStroke(g, netLines(c.x, c.y, shrink, 1), z, a, 1.6 + shrink * 1.2, now, lowQ, true, GOLD_HI);
  // ลวดแนวตั้งจากพื้นขึ้นไปหาผืน (ตอนยกขึ้น)
  if (show < 1 || shrink < 0.5) {
    g.save(); g.strokeStyle = `rgba(${STEEL},${0.5 * a})`; g.lineWidth = 1;
    g.beginPath();
    for (const [dx, dy] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) {
      const k = 1 - shrink, A = P(cx + dx, cy + dy, 0), B = P(cx + dx * k, cy + dy * k, z);
      g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]);
    }
    g.stroke(); g.restore();
  }
  // รัดตัว: วงลวดหลายชั้นพันรอบหมาก + สะเก็ด "ดีด"
  const wr = t - NETTRAP.pull + 80;
  if (wr > 0) {
    const k = clamp01(wr / 160), aa = a;
    for (let j = 0; j < 3; j++) {
      const [ex, ey, es] = P(cx, cy, 0.3 + j * 0.35), r = es * (0.62 - 0.22 * k);
      g.strokeStyle = `rgba(${STEEL},${0.95 * aa})`; g.lineWidth = Math.max(1, es * 0.018);
      g.beginPath(); g.ellipse(ex, ey, r, r * 0.32, (j - 1) * 0.25, 0, TAU); g.stroke();
    }
    if (wr < 220) {
      const [ex, ey, es] = P(cx, cy, 0.7);
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < (lowQ ? 6 : 12); i++) {
        const an = hash01(i + 40) * TAU, d0 = es * 0.2, d1 = es * (0.4 + 0.5 * easeOut2(wr / 220));
        g.strokeStyle = `rgba(255,255,255,${1 - wr / 220})`; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(ex + Math.cos(an) * d0, ey + Math.sin(an) * d0); g.lineTo(ex + Math.cos(an) * d1, ey + Math.sin(an) * d1); g.stroke();
      }
      g.restore();
    }
  }
}

// ---------- มีด ----------
function lineGeo(e, z0, z1) {
  if (e._g) return e._g;
  const v = dirVec(e.dir) || (okT(e.from) && okT(e.to) ? dirVec({ x: e.to.x - e.from.x, y: e.to.y - e.from.y }) : null) || [0, -1];
  const A0 = cen(e.from), hitN = Math.max(1, e.hitSize | 0);
  const B = e.hitAt ? cen(e.hitAt, hitN) : okT(e.to) ? cen(e.to) : [A0[0] + v[0] * 4, A0[1] + v[1] * 4];
  const A = [A0[0] + v[0] * 0.38, A0[1] + v[1] * 0.38];
  // จุดค้าง (หยุดเวลา): ห่างหน้าเป้า ~0.7 ช่อง
  const D = Math.max(0.3, Math.hypot(B[0] - A[0], B[1] - A[1])), hangD = Math.max(0.25, D - 0.7 - (hitN - 1) * 0.5);
  e._g = { v, A, B, D, hangK: clamp01(hangD / D), z0, z1, hit: !!e.hitAt };
  return e._g;
}
const lineAt = (G, k) => [lerp(G.A[0], G.B[0], k), lerp(G.A[1], G.B[1], k), lerp(G.z0, G.z1, k)];
function metalSpark(g, x, y, s, age, dur, lowQ, seed, blood) {
  if (age < 0 || age > dur) return;
  const q = age / dur, a = 1 - q;
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, x, y, s * (0.25 + 0.5 * q), "255,250,235", 0.8 * a);
  const n = lowQ ? 6 : 12;
  for (let i = 0; i < n; i++) {
    const th = hash01(seed + i) * TAU, r0 = s * 0.08, r1 = s * (0.2 + 0.45 * easeOut3(q)) * (0.6 + 0.7 * hash01(seed + i + 9));
    g.strokeStyle = `rgba(${i % 3 ? "255,255,255" : GOLD_HI},${a})`; g.lineWidth = Math.max(1, s * 0.02 * a + 0.4);
    g.beginPath(); g.moveTo(x + Math.cos(th) * r0, y + Math.sin(th) * r0); g.lineTo(x + Math.cos(th) * r1, y + Math.sin(th) * r1); g.stroke();
  }
  g.restore();
  if (blood && !lowQ) {
    for (let i = 0; i < 7; i++) {
      const th = hash01(seed + i + 30) * TAU, d = s * 0.4 * easeOut2(q) * (0.5 + hash01(seed + i + 31)), dy = s * 0.3 * q * q;
      g.fillStyle = `rgba(${BLOOD},${0.9 * a})`; g.beginPath(); g.arc(x + Math.cos(th) * d, y + Math.sin(th) * d * 0.7 + dy, Math.max(1, s * 0.025), 0, TAU); g.fill();
    }
  }
}
function knifeFx(g, e, t0, now, lowQ) {
  if (!okT(e.from)) return;
  const G = lineGeo(e, 0.95, 0.7);
  const hangT = TK.release + (TK.hit - TK.release) * G.hangK, F = frz(e, t0, now, hangT, TK.hit), t = F.t;
  if (t >= DIEGO_FX_DUR.diegoKnife) return;
  const S0 = P(...lineAt(G, 0)), S1 = P(...lineAt(G, 1)), travel = Math.atan2(S1[1] - S0[1], S1[0] - S0[0]);
  const k = t < TK.release ? 0 : clamp01((t - TK.release) / (TK.hit - TK.release));
  if (t < TK.hit) {
    const [x, y, z] = lineAt(G, k), [sx, sy, ss] = P(x, y, z);
    // หางลม (ระหว่างพุ่ง)
    if (!F.hang && t > TK.release && !lowQ) {
      const [tx, ty] = P(...lineAt(G, Math.max(0, k - 0.22)));
      const gr = g.createLinearGradient(tx, ty, sx, sy); gr.addColorStop(0, "rgba(220,230,245,0)"); gr.addColorStop(1, "rgba(235,242,255,.65)");
      g.strokeStyle = gr; g.lineWidth = Math.max(1, ss * 0.05); g.lineCap = "round"; g.beginPath(); g.moveTo(tx, ty); g.lineTo(sx, sy); g.stroke();
    }
    const spin = F.hang ? travel + (REDUCED ? 0.4 : now * 0.0012) : travel + (t - TK.release) * 0.05;
    const glint = F.hang ? 0.5 + 0.5 * Math.max(0, Math.sin(now / 240)) : 0.35 + 0.65 * Math.max(0, Math.sin(t / 25));
    if (F.hang) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, sx, sy, ss * 0.35, "235,242,255", 0.35); g.restore(); }
    drawKnife(g, sx, sy, ss * 0.66, spin, 1, glint);
    return;
  }
  // ถึงปลาย: โดน = สะเก็ดเหล็ก · พลาด = ปักพื้นที่ช่องปลาย
  const age = t - TK.hit;
  if (G.hit) {
    const [hx, hy, hs] = P(G.B[0], G.B[1], 0.7);
    metalSpark(g, hx, hy, hs, age, 260, lowQ, 51 + (e.hitAt.x | 0) * 3, true);
    if (age < 120) drawKnife(g, hx - Math.cos(travel) * hs * 0.1, hy - Math.sin(travel) * hs * 0.1, hs * 0.66, travel, 1 - age / 120, 0);
  } else {
    const [hx, hy, hs] = P(G.B[0], G.B[1], 0.12), a = clamp01(1 - (age - 60) / 90);
    drawKnife(g, hx, hy - hs * 0.18, hs * 0.66, -Math.PI / 2 + 0.35, a, 0);
    dustPuff(g, G.B[0], G.B[1], age / 160, lowQ ? 2 : 4, 0.25, 0.6, 9);
  }
}

// ---------- ปืนลูกโม่ ----------
function shotFx(g, e, t0, now, lowQ) {
  if (!okT(e.from)) return;
  const G = lineGeo(e, 0.95, 0.72);
  const hangK = Math.min(G.hangK, 0.7 / G.D), hangT = TSH.hit * hangK;
  const F = frz(e, t0, now, hangT, TSH.hit), t = F.t, tr = t0; // แสงปากกระบอก/ควัน ตามเวลาจริง (ควันนิ่งระหว่างหยุดเวลา)
  if (t >= DIEGO_FX_DUR.diegoShot) return;
  const M = P(...lineAt(G, 0)), travel = Math.atan2(P(...lineAt(G, 1))[1] - M[1], P(...lineAt(G, 1))[0] - M[0]);
  // ควันปากกระบอก (นิ่งระหว่างค้าง)
  const sm = F.wait ? Math.min(tr, 160) : tr;
  if (sm < 700) {
    const q = sm / 700;
    for (let i = 0; i < (lowQ ? 2 : 4); i++) {
      const [mx, my, ms] = P(G.A[0] + G.v[0] * (0.1 + q * 0.3) + (hash01(i + 3) - 0.5) * 0.2, G.A[1] + G.v[1] * (0.1 + q * 0.3) + (hash01(i + 5) - 0.5) * 0.2, 0.95 + q * 0.5 + i * 0.05);
      const rr = ms * (0.08 + 0.16 * q), gr = g.createRadialGradient(mx, my, 0, mx, my, rr);
      gr.addColorStop(0, `rgba(210,206,200,${0.5 * (1 - q)})`); gr.addColorStop(1, "rgba(210,206,200,0)");
      g.fillStyle = gr; g.fillRect(mx - rr, my - rr, rr * 2, rr * 2);
    }
  }
  // แสงปากกระบอก (ดาวหกแฉก)
  const fl = F.wait ? Math.min(tr, 40) : tr;
  if (fl < 90) {
    const a = 1 - fl / 90, r = M[2] * 0.42;
    g.save(); g.globalCompositeOperation = "lighter"; g.translate(M[0], M[1]); g.rotate(travel);
    glow(g, 0, 0, r * 1.3, FIRE_HI, 0.9 * a);
    g.fillStyle = `rgba(255,236,170,${a})`;
    g.beginPath();
    for (let i = 0; i < 12; i++) { const an = (i / 12) * TAU, rr = i % 2 ? r * 0.22 : i === 0 ? r * 1.4 : r * 0.7; g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr * 0.6); }
    g.closePath(); g.fill();
    g.restore();
  }
  // เส้นกระสุน + หัวกระสุน
  const k = clamp01(t / TSH.hit);
  if (t < TSH.hit + 120) {
    const [bx, by, bs] = P(...lineAt(G, k)), [tx, ty] = P(...lineAt(G, F.hang ? Math.max(0, k - 0.06) : Math.max(0, k - 0.5)));
    const a = t < TSH.hit ? 1 : 1 - (t - TSH.hit) / 120;
    g.save(); g.lineCap = "round"; g.globalCompositeOperation = "lighter";
    const gr = g.createLinearGradient(tx, ty, bx, by); gr.addColorStop(0, "rgba(255,220,140,0)"); gr.addColorStop(1, `rgba(255,246,210,${0.95 * a})`);
    g.strokeStyle = gr; g.lineWidth = Math.max(1.2, bs * 0.03); g.beginPath(); g.moveTo(tx, ty); g.lineTo(bx, by); g.stroke();
    g.restore();
    if (t < TSH.hit) {
      drawBullet(g, bx, by, Math.max(2, bs * 0.05), travel);
      if (F.hang) { g.save(); g.globalCompositeOperation = "lighter"; sparkle(g, bx, by, bs * 0.1, 0.6 + 0.3 * Math.sin(now / 200), GOLD_HI, 0.3); g.restore(); }
    }
  }
  // ปะทะ
  if (t >= TSH.hit) {
    const age = t - TSH.hit;
    if (G.hit) { const [hx, hy, hs] = P(G.B[0], G.B[1], 0.72); metalSpark(g, hx, hy, hs, age, 240, lowQ, 77 + (e.hitAt.x | 0), true); }
    else dustPuff(g, G.B[0], G.B[1], age / 260, lowQ ? 2 : 5, 0.3, 0.8, 21);
  }
}

// ---------- รีโหลด / ปฐมพยาบาล / เล่ห์เหลี่ยม ----------
function reloadFx(g, e, t, now, lowQ) {
  if (!okT(e.at) || t >= RELOAD_MS) return;
  const [cx, cy] = cen(e.at), [sx, sy, ss] = P(cx, cy, 2.05), R = ss * 0.24, q = t / RELOAD_MS;
  const a = t < 120 ? t / 120 : t > RELOAD_MS - 180 ? (RELOAD_MS - t) / 180 : 1;
  const step = Math.min(6, Math.floor(t / 85)), rot = (Math.min(t, 6 * 85) / 85) * (TAU / 6) + (t > 520 ? (t - 520) * 0.02 : 0);
  g.save(); g.globalAlpha *= a;
  // ลูกโม่
  const gr = g.createRadialGradient(sx - R * 0.3, sy - R * 0.3, R * 0.1, sx, sy, R);
  gr.addColorStop(0, "#d8dde4"); gr.addColorStop(1, "#4d555f");
  g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, R, 0, TAU); g.fill();
  g.strokeStyle = "#20252b"; g.lineWidth = 1.4; g.stroke();
  for (let i = 0; i < 6; i++) {
    const an = rot + (i / 6) * TAU, hx = sx + Math.cos(an) * R * 0.58, hy = sy + Math.sin(an) * R * 0.58, full = i < step;
    g.fillStyle = full ? "#e8b04a" : "#14171b"; g.beginPath(); g.arc(hx, hy, R * 0.22, 0, TAU); g.fill();
    if (full) { g.fillStyle = "#fff0c0"; g.beginPath(); g.arc(hx - R * 0.06, hy - R * 0.06, R * 0.07, 0, TAU); g.fill(); }
  }
  g.fillStyle = "#20252b"; g.beginPath(); g.arc(sx, sy, R * 0.12, 0, TAU); g.fill();
  // กระสุนบินเข้ารัง
  if (step < 6) {
    const lt = (t % 85) / 85, an = rot + (step / 6) * TAU, hx = sx + Math.cos(an) * R * 0.58, hy = sy + Math.sin(an) * R * 0.58;
    drawBullet(g, lerp(sx + R * 1.6, hx, easeIn2(lt)), lerp(sy - R * 1.2, hy, easeIn2(lt)), R * 0.2, an);
  }
  g.restore();
  // ปิดลูกโม่: แสงวาบ + วง
  if (t > 520) {
    const k = (t - 520) / (RELOAD_MS - 520);
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, sx, sy, R * (1.2 + 1.5 * k), GOLD, 0.7 * (1 - k));
    g.strokeStyle = `rgba(${GOLD_HI},${0.9 * (1 - k)})`; g.lineWidth = 2; g.beginPath(); g.arc(sx, sy, R * (1.1 + 1.2 * easeOut3(k)), 0, TAU); g.stroke();
    if (!lowQ) sparkle(g, sx + R * 0.7, sy - R * 0.7, R * 0.6 * (1 - k), 1 - k, "255,255,255", q);
    g.restore();
  }
}
function aidFx(g, e, t, now, lowQ) {
  if (!okT(e.at) || t >= DIEGO_FX.firstAid) return;
  const [cx, cy] = cen(e.at), q = t / DIEGO_FX.firstAid, a = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3;
  const [sx, sy, ss] = P(cx, cy, 1.0 + q * 0.6);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, sx, sy, ss * (0.5 + 0.4 * q), "120,255,160", 0.6 * a);
  // กากบาท
  const w = ss * 0.08, L = ss * 0.24 * (0.6 + 0.4 * easeOut3(Math.min(1, q * 3)));
  g.fillStyle = `rgba(200,255,215,${0.95 * a})`;
  g.fillRect(sx - w, sy - L, w * 2, L * 2); g.fillRect(sx - L, sy - w, L * 2, w * 2);
  g.restore();
  // ผ้าพันแผลเกลียวขึ้น
  const n = lowQ ? 14 : 30, pts = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n, an = k * TAU * 2 + q * 6, hh = k * 1.6 * easeOut2(Math.min(1, q * 1.6));
    pts.push(P(cx + Math.cos(an) * 0.42, cy + Math.sin(an) * 0.42 * 0.8, 0.1 + hh));
  }
  g.save(); g.lineCap = "round"; g.globalAlpha *= a;
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.strokeStyle = "rgba(240,236,224,.85)"; g.lineWidth = Math.max(1.5, ss * 0.03); g.stroke();
  g.restore();
  if (!lowQ) {
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 10; i++) {
      const ph = clamp01(q * 1.3 - hash01(i + 4) * 0.3);
      if (ph <= 0 || ph >= 1) continue;
      const [px, py, ps] = P(cx + (hash01(i) - 0.5) * 0.9, cy + (hash01(i + 1) - 0.5) * 0.6, 0.3 + ph * 1.8);
      sparkle(g, px, py, ps * 0.06, Math.sin(Math.PI * ph), "190,255,210", i);
    }
    g.restore();
  }
}
function cunningFx(g, e, t, now, lowQ) {
  if (!okT(e.at) || t >= CUNNING_MS) return;
  const [cx, cy] = cen(e.at), q = t / CUNNING_MS, n = Math.min(lowQ ? 5 : 12, 4 + 2 * Math.max(1, e.gain | 0));
  const [sx, sy, ss] = P(cx, cy, 1.85 + q * 0.4);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, sx, sy, ss * 0.35, "200,150,255", 0.45 * (1 - q));
  // เพชรทองหมุนเหนือหัว
  const r = ss * 0.12 * (0.7 + 0.3 * easeOut3(Math.min(1, q * 3))), a = 1 - q;
  g.strokeStyle = `rgba(${GOLD_HI},${a})`; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(sx, sy - r * 1.3); g.lineTo(sx + r, sy); g.lineTo(sx, sy + r * 1.3); g.lineTo(sx - r, sy); g.closePath(); g.stroke();
  for (let i = 0; i < n; i++) {
    const an = hash01(i + 20) * TAU + q * 2, d = ss * (0.12 + 0.35 * easeOut2(q)) * (0.6 + 0.5 * hash01(i + 21));
    sparkle(g, sx + Math.cos(an) * d, sy + Math.sin(an) * d * 0.7, ss * 0.045 * (1 - q), a, i % 2 ? GOLD_HI : "220,190,255", an);
  }
  g.restore();
}

// ---------- เดอะเวิลด์ (กด) ----------
function worldFx(g, e, t, now, lowQ, view) {
  if (!okT(e.at) || t >= DIEGO_FX.world) return;
  const n = Math.max(1, e.size | 0), [cx, cy] = cen(e.at, n), q = t / DIEGO_FX.world;
  const k = clamp01(t / 320), a = t < 950 ? 1 : 1 - (t - 950) / (DIEGO_FX.world - 950);
  // หน้าปัดนาฬิกาใต้เท้า (เข็มหมุนเร็ว → ช้า)
  const sp = REDUCED ? 0 : (1 - easeOut2(q)) * 0.02 * t;
  clockFace(g, cx, cy, 1.05 * n * (0.6 + 0.4 * easeOut3(k)), { h: sp * 0.08, m: sp, s: sp * 4 }, 0.85 * a, lowQ);
  // เสาแสงทอง
  if (!lowQ) {
    const b = P(cx, cy, 0), top = P(cx, cy, 3.2), wb = b[2] * 0.42 * n, wt = top[2] * 0.1;
    const gr = g.createLinearGradient(b[0], b[1], top[0], top[1]);
    gr.addColorStop(0, `rgba(${GOLD},${0.35 * a * k})`); gr.addColorStop(1, `rgba(${GOLD},0)`);
    g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = gr;
    g.beginPath(); g.moveTo(b[0] - wb, b[1]); g.lineTo(top[0] - wt, top[1]); g.lineTo(top[0] + wt, top[1]); g.lineTo(b[0] + wb, b[1]); g.closePath(); g.fill();
    g.restore();
  }
  const [bx, by, s] = P(cx, cy, 0.95);
  // ออร่าทองรอบตัว (เปลวทองเต้นขึ้นจากพื้น) + ละอองทองลอยขึ้น
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, bx, by, s * (0.8 + 0.5 * k) * n, GOLD, 0.45 * a * k);
  if (!lowQ) for (let i = 0; i < 18; i++) {
    const ph = REDUCED ? hash01(i) : ((t / (650 + hash01(i + 3) * 450)) + hash01(i)) % 1, an = hash01(i + 7) * TAU, r = (0.25 + 0.3 * hash01(i + 9)) * n;
    const [px, py, ps] = P(cx + Math.cos(an) * r, cy + Math.sin(an) * r * 0.8, 0.1 + ph * 2.2);
    sparkle(g, px, py, ps * 0.05, Math.sin(Math.PI * ph) * a * k, GOLD_HI, an);
  }
  g.restore();
  // หัวใจเต้นลอยขึ้น
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < (lowQ ? 2 : 5); i++) {
    const ph = clamp01((t - 150 - i * 140) / 700);
    if (ph <= 0 || ph >= 1) continue;
    const hx = bx + (hash01(i + 7) - 0.5) * s * 1.1, hy = by - s * (0.3 + ph * 1.4), h = s * 0.1 * (0.6 + 0.6 * ph);
    g.beginPath(); heartPath(g, hx, hy, h); g.fillStyle = `rgba(255,120,140,${0.75 * Math.sin(Math.PI * ph) * a})`; g.fill();
  }
  // จังหวะเดอะเวิลด์: แสงวาบทอง + วงกระแทกบนพื้น
  if (t > 420 && t < 640) glow(g, bx, by, s * (0.6 + 1.6 * (t - 420) / 220) * n, GOLD_HI, 0.75 * Math.sin(Math.PI * (t - 420) / 220));
  g.restore();
  if (t > 420 && t < 560) flashView(g, view, GOLD_HI, 0.18 * (1 - (t - 420) / 140));
}

// ---------- หยุดเวลา / เวลาเดินต่อ (ส่วนที่ทับบนซีเปีย — diegoTimeLayer วาดวง/ซีเปีย/สีกลับด้านเอง) ----------
function stopFx(g, e, t, now, lowQ, view) {
  if (!okT(e.at) || t >= DIEGO_FX.timeStop) return;
  const n = Math.max(1, e.size | 0), [cx, cy] = cen(e.at, n), [bx, by, s] = P(cx, cy, 0.95);
  // หัวใจเต้น 2 จังหวะ (ตึก-ตัก) ที่อก
  for (const bt of [40, 200]) {
    const q = (t - bt) / 260;
    if (q < 0 || q > 1) continue;
    g.save(); g.globalCompositeOperation = "lighter";
    g.beginPath(); heartPath(g, bx, by - s * 0.05, s * (0.18 + 0.7 * easeOut3(q))); g.strokeStyle = `rgba(255,110,130,${0.85 * (1 - q)})`; g.lineWidth = 3 * (1 - q) + 1; g.stroke();
    glow(g, bx, by, s * 0.5, "255,90,110", 0.5 * (1 - q));
    g.restore();
  }
  // หน้าปัดนาฬิกา: เข็มหมุนเร็ว → ช้าลง → หยุดที่ TS.tick (กระตุกครั้งเดียว)
  const appear = clamp01((t - 150) / 300), fade = t < TS.tick + 200 ? 1 : clamp01(1 - (t - TS.tick - 200) / (DIEGO_FX.timeStop - TS.tick - 200));
  const spin = REDUCED ? 0 : Math.max(0, 1 - t / TS.tick);
  const base = (Math.min(t, TS.tick) / 1000) * 9 * (0.5 + 0.5 * spin), jerk = t >= TS.tick && t < TS.tick + 120 ? Math.sin(((t - TS.tick) / 120) * Math.PI) * 0.12 : 0;
  const R = (1.1 + 0.25 * easeOut3(appear)) * n;
  clockFace(g, cx, cy, R, { h: base * 0.08 + 0.6, m: base + 2.1, s: base * 3 + jerk + (t >= TS.tick ? TAU / 60 : 0) }, (0.4 + 0.5 * appear) * lerp(0.6, 1, fade) * (t > TS.tick + 200 ? fade * 0.55 + 0.45 : 1), lowQ);
  // เข็มหยุด: วงทองกระตุก + ประกาย
  if (t >= TS.tick && t < TS.tick + 360) {
    const q = (t - TS.tick) / 360;
    groundRing(g, cx, cy, R * (1 + 0.25 * easeOut3(q)), 0.9 * (1 - q), GOLD_HI, 2.5 * (1 - q) + 0.5, 0.03);
  }
  // จุดวงเริ่ม: แสงวาบทอง + (counter) จอกลับสีวาบ
  if (t >= TS.ring0 && t < TS.ring0 + 260) {
    const q = (t - TS.ring0) / 260;
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, bx, by, s * (0.6 + 2 * q), GOLD, 0.9 * (1 - q)); g.restore();
    if (e.mode === "counter" && t < TS.ring0 + 140) flashView(g, view, "255,255,255", 0.95 * (1 - (t - TS.ring0) / 140), "difference");
  }
  // counter: วงนาฬิการัดผู้โจมตี + เส้นแตกร้าว (การโจมตีถูกยกเลิก)
  if (e.mode === "counter" && okT(e.attackerAt)) {
    const an = Math.max(1, e.attackerSize | 0), [ax0, ay0] = cen(e.attackerAt, an), q = clamp01((t - TS.ring0) / 500);
    if (q > 0) {
      const a = t < 1600 ? 1 : clamp01(1 - (t - 1600) / 500);
      clockFace(g, ax0, ay0, (1.3 - 0.55 * easeOut3(q)) * an, { h: 0.6, m: 2.1, s: 0 }, 0.75 * a, lowQ, 0.6);
      const [px, py, ps] = P(ax0, ay0, 0.9);
      g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = `rgba(${GOLD_HI},${0.85 * a * q})`; g.lineWidth = 1.4;
      g.beginPath();
      for (let i = 0; i < 7; i++) {
        let x = px, y = py, th = hash01(i + 60) * TAU;
        g.moveTo(x, y);
        for (let j = 0; j < 3; j++) { th += (hash01(i * 3 + j) - 0.5) * 1.2; x += Math.cos(th) * ps * 0.18 * easeOut3(q); y += Math.sin(th) * ps * 0.18 * easeOut3(q); g.lineTo(x, y); }
      }
      g.stroke(); g.restore();
    }
  }
  // ละอองทองค้างกลางอากาศหลังวงผ่าน (โลกหยุดนิ่ง)
  if (!lowQ && t > TS.ring0) {
    const a = clamp01((t - TS.ring0) / 600) * fade;
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 26; i++) {
      const d = 0.8 + hash01(i + 1) * 5, an = hash01(i + 2) * TAU;
      const [px, py, ps] = P(cx + Math.cos(an) * d, cy + Math.sin(an) * d, 0.3 + hash01(i + 3) * 1.8);
      sparkle(g, px, py, ps * 0.035, a * (0.4 + 0.4 * hash01(i + 4)), GOLD_HI, an);
    }
    g.restore();
  }
}
function resumeFx(g, e, t, now, lowQ, view) {
  if (!okT(e.at) || t >= DIEGO_FX.timeResume) return;
  const n = Math.max(1, e.size | 0), [cx, cy] = cen(e.at, n), [bx, by, s] = P(cx, cy, 0.95);
  // เข็มเริ่มเดิน (ติ๊กแรก → หมุนเร็วขึ้น) แล้วหน้าปัดจางหาย
  const a = t < TR.launch ? 0.85 : clamp01(1 - (t - TR.launch) / 500) * 0.85;
  const go = REDUCED ? 0 : Math.max(0, t - TR.ring0), sp = (go / 1000) * (go / 1000) * 14;
  const tick = t < TR.ring0 + 100 ? Math.sin(clamp01(t / (TR.ring0 + 100)) * Math.PI) * 0.12 : 0;
  clockFace(g, cx, cy, 1.35 * n, { h: 0.6 + sp * 0.08, m: 2.1 + sp, s: TAU / 60 + tick + sp * 4 }, a, lowQ);
  // ของเริ่มพุ่ง: แสงวาบทองที่ดิเอโก้ + คลื่น + แฟลชทั้งจอ
  const L = t - TR.launch;
  if (L >= 0 && L < 380) {
    const q = L / 380;
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, bx, by, s * (0.5 + 2.6 * easeOut3(q)), GOLD, 0.9 * (1 - q));
    if (L < 90) glow(g, bx, by, s * 0.9, "255,255,255", 0.9 * (1 - L / 90));
    g.restore();
    for (let k = 0; k < (lowQ ? 1 : 2); k++) { const qq = clamp01(q * 1.2 - k * 0.2); if (qq > 0 && qq < 1) groundRing(g, cx, cy, (0.5 + 3 * easeOut3(qq)) * n, 0.85 * (1 - qq), k ? GOLD : GOLD_HI, 3 * (1 - qq) + 1, 0.03); }
    if (L < 160) flashView(g, view, GOLD_HI, 0.22 * (1 - L / 160));
  }
  // ปะทะพร้อมกัน: แสงแตกที่ทุกเป้า (เลขดาเมจขึ้นจาก state ตามจังหวะเดียวกัน — BoardStage)
  for (const h of e.hitsAt || []) {
    const age = t - TR.hit - (h.i | 0) * 50;
    if (age < 0 || age > 420) continue;
    const hn = Math.max(1, h.size | 0), [hx, hy, hs] = P(h.x + hn / 2, h.y + hn / 2, 0.75), q = age / 420;
    g.save(); g.globalCompositeOperation = "lighter";
    glow(g, hx, hy, hs * (0.4 + 0.9 * q) * hn, h.kill ? "255,90,80" : GOLD, 0.85 * (1 - q));
    g.restore();
    groundRing(g, h.x + hn / 2, h.y + hn / 2, (0.3 + 0.9 * easeOut3(q)) * hn, 0.8 * (1 - q), h.kill ? "255,140,120" : GOLD_HI, 2.4 * (1 - q) + 0.5, 0.03);
  }
}

// ---------- เป็นไปดั่งกลอุบาย (ซิลเวอร์ บูลเล็ตควบพุ่ง) ----------
function plotGeo(e) {
  if (e._g) return e._g;
  const pts = okT(e.from) ? [ptOf(e.from)] : [];
  for (const p of tilesOf(e.path)) if (!pts.length || !samePt(pts[pts.length - 1], p)) pts.push(p);
  if (!pts.length) pts.push({ x: 0, y: 0 });
  const steps = pts.length - 1, dash = DIEGO_FX.plotStep * steps, H = PL.wind + dash, len = diegoPlotMs(steps);
  const v = dirVec(e.dir) || (steps ? dirVec({ x: pts[steps].x - pts[0].x, y: pts[steps].y - pts[0].y }) : null) || [0, -1];
  const push = e.push && okT(e.push.from) && okT(e.push.to) ? { from: ptOf(e.push.from), to: ptOf(e.push.to) } : null;
  e._g = { pts, steps, dash, H, len, v, push, hit: e.hitId != null };
  return e._g;
}
// ตำแหน่งดิเอโก้ (ทศนิยม) ที่เวลา t — เร่งเข้าหาเป้า (ชนตอนเร็วสุด)
function plotF(G, t) { return G.steps ? Math.pow(clamp01((t - PL.wind) / Math.max(1, G.dash)), 1.45) * G.steps : 0; }
function plotPos(G, f) {
  const i = Math.min(G.steps, Math.floor(f)), k = f - i, A = G.pts[i], B = G.pts[Math.min(G.steps, i + 1)];
  return { x: lerp(A.x, B.x, k), y: lerp(A.y, B.y, k) };
}
function plotFx(g, e, t, now, lowQ, view) {
  const G = plotGeo(e), END = G.len;
  if (t >= END) return;
  const v = G.v, side = [-v[1], v[0]], start = G.pts[0], [sx0, sy0] = cen(start);
  g.save(); g.lineCap = "round";
  // ม้ายกขา: ฝุ่นระเบิด + พื้นร้าว + แสงทอง
  if (t < PL.wind + 200) {
    const q = t / (PL.wind + 200);
    dustPuff(g, sx0, sy0, q, lowQ ? 6 : 14, 0.9, 1, 3);
    groundRing(g, sx0, sy0, 0.3 + 0.9 * easeOut3(q), 0.75 * (1 - q), GOLD_HI, 2.5 * (1 - q) + 0.5);
    const [bx, by, s] = P(sx0, sy0, 0.9);
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, bx, by, s * (0.6 + 0.8 * q), GOLD, 0.55 * (1 - q)); g.restore();
    // เส้นลมดูดเข้าหาตัว (ตั้งท่า)
    if (!lowQ && t < PL.wind) {
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 14; i++) {
        const an = hash01(i + 5) * TAU, d0 = 1.6 - 1.2 * (t / PL.wind), z = 0.2 + hash01(i + 6) * 1.2;
        const A = P(sx0 + Math.cos(an) * d0, sy0 + Math.sin(an) * d0, z), B = P(sx0 + Math.cos(an) * (d0 + 0.5), sy0 + Math.sin(an) * (d0 + 0.5), z);
        g.strokeStyle = `rgba(${GOLD_HI},${0.6 * (t / PL.wind)})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
      }
      g.restore();
    }
  }
  // ควบ: เส้นทาง (ลมทอง) · เงาม้าทองตามหลัง · ฝุ่นกีบ · เส้นความเร็ว
  const f = plotF(G, Math.min(t, G.H)), pos = plotPos(G, f), [px, py] = [pos.x + 0.5, pos.y + 0.5];
  if (t > PL.wind && G.steps) {
    const trailA = t < G.H ? 1 : clamp01(1 - (t - G.H) / 360);
    // รอยลากบนพื้น
    const p0 = P(sx0, sy0, 0.02), p1 = P(px, py, 0.02);
    g.save();
    g.strokeStyle = `rgba(110,80,40,${0.35 * trailA})`; g.lineWidth = p1[2] * 0.5; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = `rgba(${GOLD},${0.3 * trailA})`; g.lineWidth = p1[2] * 0.22; g.stroke();
    g.strokeStyle = `rgba(${GOLD_HI},${0.7 * trailA})`; g.lineWidth = 1.6; g.stroke();
    g.restore();
    // เงาม้าทอง (ภาพติดตา)
    const img = horse();
    if (img && !lowQ) {
      for (let k = 1; k <= 4; k++) {
        const tt = Math.min(t, G.H) - k * 45;
        if (tt < PL.wind) break;
        const pp = plotPos(G, plotF(G, tt)), [hx, hy, hs] = P(pp.x + 0.5, pp.y + 0.5, 0), Hh = hs * HORSE_H, W = (Hh * img.naturalWidth) / img.naturalHeight;
        const fx = P(pp.x + 0.5 + v[0], pp.y + 0.5 + v[1])[0] > hx ? -1 : 1;
        g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.28 * (1 - k / 5) * trailA;
        g.translate(hx, hy + hs * 0.2); g.scale(fx, 1); g.drawImage(img, -W * 0.5, -Hh, W, Hh);
        g.restore();
      }
    }
    // ฝุ่นกีบ (ทุก 60 ms ของทาง)
    for (let tt = PL.wind; tt < Math.min(t, G.H); tt += lowQ ? 120 : 60) {
      const age = t - tt;
      if (age > 600) continue;
      const pp = plotPos(G, plotF(G, tt));
      dustPuff(g, pp.x + 0.5 - v[0] * 0.3, pp.y + 0.5 - v[1] * 0.3, age / 600, lowQ ? 2 : 4, 0.45, 0.9, 7 + tt);
    }
    // เส้นความเร็ว
    if (t < G.H + 120 && !lowQ) {
      const a = t < G.H ? 1 : 1 - (t - G.H) / 120;
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 12; i++) {
        const o = (hash01(i + 3) - 0.5) * 1.6, z = 0.15 + hash01(i + 4) * 1.5, back = 0.4 + ((now / 90 + hash01(i)) % 1) * 1.2, ln = 0.7 + hash01(i + 9) * 1.1;
        const A = P(px + side[0] * o - v[0] * back, py + side[1] * o - v[1] * back, z), B = P(px + side[0] * o - v[0] * (back + ln), py + side[1] * o - v[1] * (back + ln), z);
        g.strokeStyle = `rgba(${i % 3 ? "255,255,255" : GOLD_HI},${0.55 * a})`; g.lineWidth = Math.max(1, A[2] * 0.015);
        g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
      }
      g.restore();
    }
  }
  // ชน: แสงวาบ + ดาวกระแทก + คลื่น + เลือดสาดตามทิศ + เศษ
  const age = t - G.H;
  if (G.hit && age >= 0) {
    const tgt = G.push ? G.push.from : G.pts[G.steps], [tx, ty] = [tgt.x + 0.5, tgt.y + 0.5], [hx, hy, hs] = P(tx, ty, 0.75);
    const pv = G.push ? dirVec({ x: G.push.to.x - G.push.from.x, y: G.push.to.y - G.push.from.y }) || v : v;
    if (age < 160) flashView(g, view, "255,250,230", 0.26 * (1 - age / 160));
    const q = clamp01(age / 420);
    if (q < 1) {
      g.save(); g.globalCompositeOperation = "lighter";
      glow(g, hx, hy, hs * (0.5 + 1.5 * easeOut3(q)), GOLD, 0.8 * (1 - q));
      if (age < 90) glow(g, hx, hy, hs * 0.9, "255,255,255", 0.9 * (1 - age / 90));
      // ดาวกระแทกแบบการ์ตูน
      const nR = 14, R0 = hs * (0.35 + 1.4 * easeOut3(Math.min(1, q * 1.8))), R1 = R0 * 0.45;
      g.fillStyle = `rgba(255,248,214,${0.85 * (1 - q)})`;
      g.beginPath();
      for (let i = 0; i < nR * 2; i++) { const an = (i / (nR * 2)) * TAU + 0.2, rr = i % 2 ? R1 : R0 * (0.75 + 0.5 * hash01(i)); g.lineTo(hx + Math.cos(an) * rr, hy + Math.sin(an) * rr * 0.7); }
      g.closePath(); g.fill();
      g.restore();
      for (let k = 0; k < (lowQ ? 1 : 3); k++) { const qq = clamp01(q * 1.25 - k * 0.15); if (qq > 0 && qq < 1) groundRing(g, tx, ty, 0.3 + 2.6 * easeOut3(qq), 0.9 * (1 - qq), k === 1 ? GOLD : "255,255,240", 4 * (1 - qq) + 1, 0.03); }
    }
    // เลือดสาด: หยดแดงเข้มพุ่งโค้งตามทิศกระเด็น + รอยบนพื้น
    const N = lowQ ? 14 : 36;
    for (let i = 0; i < N; i++) {
      const spread = (hash01(i + 100) - 0.5) * 1.1, sp = 1.6 + hash01(i + 101) * 2.6, tt = age / 1000, up = 1 + hash01(i + 102) * 1.8;
      const dx = pv[0] + side[0] * spread, dy = pv[1] + side[1] * spread, z = 0.75 + up * tt - 6 * tt * tt;
      const gx = tx + dx * sp * tt * 0.9, gy = ty + dy * sp * tt * 0.9;
      if (tt <= 0) continue;
      if (z > 0.02 && tt < 0.6) {
        const [bx, by, bs] = P(gx, gy, z), rr = Math.max(1.4, bs * (0.03 + 0.03 * hash01(i)));
        const [px0, py0] = P(gx - dx * 0.12, gy - dy * 0.12, z + 0.05), ang = Math.atan2(by - py0, bx - px0);
        g.fillStyle = `rgba(${BLOOD},.95)`; g.beginPath(); g.ellipse(bx, by, rr * 1.8, rr, ang, 0, TAU); g.fill();
        g.fillStyle = "rgba(255,120,120,.5)"; g.beginPath(); g.arc(bx - rr * 0.3, by - rr * 0.3, rr * 0.35, 0, TAU); g.fill();
      } else if (!lowQ) {
        // ตกถึงพื้น = รอยเลือด (จาง)
        const land = Math.max(0, (up + Math.sqrt(up * up + 4 * 6 * 0.75)) / 12), lx = tx + dx * sp * land * 0.9, ly = ty + dy * sp * land * 0.9;
        const fa = clamp01(1 - (age - land * 1000) / 900) * 0.75;
        if (fa <= 0.01) continue;
        gEllipse(g, lx, ly, 0.035 + 0.04 * hash01(i + 7), 0.012, 10); g.fillStyle = `rgba(120,8,12,${fa})`; g.fill();
      }
    }
    // เศษดิน/เศษหญ้า
    if (!lowQ && age < 600) {
      for (let i = 0; i < 12; i++) {
        const th = hash01(i + 200) * TAU, sp = 0.8 + hash01(i + 201) * 1.6, tt = age / 1000, z = 0.3 + 2 * tt - 7 * tt * tt;
        if (z < 0) continue;
        const [bx, by, bs] = P(tx + Math.cos(th) * sp * tt * 1.6, ty + Math.sin(th) * sp * tt * 1.6, z);
        g.fillStyle = "rgba(120,96,60,.9)"; g.fillRect(bx - bs * 0.02, by - bs * 0.02, bs * 0.04, bs * 0.04);
      }
    }
  }
  // ไม่ชนใคร: ฝุ่นเบรกที่ปลายแนว
  if (!G.hit && age >= 0 && G.steps) {
    const end = G.pts[G.steps];
    dustPuff(g, end.x + 0.5 + v[0] * 0.3, end.y + 0.5 + v[1] * 0.3, age / 500, lowQ ? 4 : 9, 0.7, 1, 41);
  }
  g.restore();
}

// ---------- ม้า (เหตุการณ์ขึ้น/ลง/ตาย) ----------
function horseFx(g, e, t, lowQ) {
  if (!okT(e.at) || t >= HORSE_MS) return;
  const [cx, cy] = cen(e.at), q = t / HORSE_MS;
  if (e.mode === "mount") {
    dustPuff(g, cx, cy, q * 1.3, lowQ ? 5 : 10, 0.6, 1, 3);
    groundRing(g, cx, cy, 0.3 + 0.8 * easeOut3(q), 0.8 * (1 - q), GOLD, 2);
    return;
  }
  if (e.mode === "dismount") { dustPuff(g, cx, cy, q * 1.2, lowQ ? 4 : 8, 0.55, 0.9, 7); return; }
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < (lowQ ? 10 : 30); i++) {
    const age = clamp01(q * 1.3 - hash01(i + 4) * 0.3);
    if (age <= 0 || age >= 1) continue;
    const [px, py, ps] = P(cx + (hash01(i + 1) - 0.5) * 1.1, cy + (hash01(i + 2) - 0.5) * 0.5, 0.2 + hash01(i + 3) * 0.8 + age * 1.4);
    g.fillStyle = `rgba(${i % 3 ? "255,236,214" : GOLD_HI},${Math.sin(Math.PI * age) * 0.9})`; g.beginPath(); g.arc(px, py, Math.max(1, ps * 0.03), 0, TAU); g.fill();
  }
  g.restore();
}

// ---------- ทางเข้า: วาดเอฟเฟกต์ครั้งเดียว (boardDraw — หลังตัวละคร/ชั้นหยุดเวลา) ----------
export function diegoFx(g, e, now, lowQ, view) {
  const t = now - e.t0;
  if (t < 0) return;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  switch (e.kind) {
    case "diegoThrow": throwFx(g, e, t, now, lowQ); break;
    case "diegoOil": oilFx(g, e, t, lowQ); break;
    case "diegoExplode": explodeFx(g, e, t, now, lowQ, view); break;
    case "diegoIgnite": igniteFx(g, e, t, now, lowQ); break;
    case "diegoAsh": ashFx(g, e, t, now, lowQ); break;
    case "diegoBurn": burnFx(g, e, t, now, lowQ); break;
    case "diegoNet": netFx(g, e, t, now, lowQ); break;
    case "diegoNetTrap": netTrapFx(g, e, t, now, lowQ); break;
    case "diegoKnife": knifeFx(g, e, t, now, lowQ); break;
    case "diegoShot": shotFx(g, e, t, now, lowQ); break;
    case "diegoReload": reloadFx(g, e, t, now, lowQ); break;
    case "diegoAid": aidFx(g, e, t, now, lowQ); break;
    case "diegoCunning": cunningFx(g, e, t, now, lowQ); break;
    case "diegoWorld": worldFx(g, e, t, now, lowQ, view); break;
    case "diegoStop": stopFx(g, e, t, now, lowQ, view); break;
    case "diegoResume": resumeFx(g, e, t, now, lowQ, view); break;
    case "diegoPlot": plotFx(g, e, t, now, lowQ, view); break;
    case "diegoHorse": horseFx(g, e, t, lowQ); break;
    default:
  }
  g.restore();
}

// ---------- หมากที่ฉากย้ายเอง (BoardCanvas) ----------
//  u = หมากจาก state ({ id, x, y }) · คืน { x, y, hz, sq, charge } | null — charge = ดิเอโก้กำลังควบ (วาดม้าแม้ไม่ได้ขี่)
//  ฉากจบแล้วแต่ state ยังไม่ย้าย = ค้างที่ปลายทางจนหมดเวลา HOLD
export function diegoPose(list, u, now) {
  if (!u || u.id == null || !Array.isArray(list)) return null;
  const id = u.id, atFrom = (from) => samePt(u, from);
  for (const e of list) {
    if (!e || (e.kind !== "diegoNetTrap" && e.kind !== "diegoPlot")) continue;
    const t = now - e.t0;
    if (t < 0 || t >= (e.dur || 0)) continue;
    if (e.kind === "diegoNetTrap") {
      if (e.targetId !== id || !okT(e.from) || !okT(e.to)) continue;
      if (t < DIEGO_FX.netTrap) { const p = netTrapPose(e, t); return { x: p.x, y: p.y, hz: p.hz, sq: 0 }; }
      if (atFrom(e.from) && !samePt(e.from, e.to)) return { x: e.to.x, y: e.to.y, hz: 0, sq: 0 };
      continue;
    }
    const G = plotGeo(e);
    if (e.id === id) {
      if (t < PL.wind) return { x: G.pts[0].x, y: G.pts[0].y, hz: REDUCED ? 0 : Math.sin(Math.PI * (t / PL.wind)) * 0.22, sq: -0.06 * Math.sin(Math.PI * (t / PL.wind)), charge: true };
      if (t < G.len) { const p = plotPos(G, plotF(G, Math.min(t, G.H))); return { x: p.x, y: p.y, hz: t < G.H && !REDUCED ? Math.abs(Math.sin(t / 45)) * 0.06 : 0, sq: 0, charge: true }; }
      const end = G.pts[G.steps];
      if (atFrom(G.pts[0]) && G.steps) return { x: end.x, y: end.y, hz: 0, sq: 0 };
      continue;
    }
    if (e.hitId === id && G.push) {
      const k0 = G.H - 30;
      if (t < k0) return { x: G.push.from.x, y: G.push.from.y, hz: 0, sq: 0 };
      if (t < k0 + PL.knock) {
        const k = easeOut2((t - k0) / PL.knock);
        return { x: lerp(G.push.from.x, G.push.to.x, k), y: lerp(G.push.from.y, G.push.to.y, k), hz: Math.sin(Math.PI * k) * 0.5, sq: Math.sin(Math.PI * k) * 0.12 };
      }
      if (atFrom(G.push.from) && !samePt(G.push.from, G.push.to)) return { x: G.push.to.x, y: G.push.to.y, hz: 0, sq: 0 };
    }
  }
  return null;
}

// ---------- ชั้นพื้น: แอ่งน้ำมัน · กองไฟ (พื้นไหม้ + แสง) · ขี้เถ้า · ตาข่ายของเรา ----------
//  ground = { oil: [{x,y}], fire: [{x,y,left}], ash: [{x,y}], nets: [{x,y,color}] } (state — BoardStage) · fx = เอฟเฟกต์ที่กำลังเล่น
//  ระหว่างฉากที่ยังไม่ถึงจังหวะ: แอ่งยังไม่แผ่ (diegoOil) · ช่องที่จะระเบิดยังเป็นน้ำมัน/ไฟยังไม่ติด (diegoExplode รวมแบบค้างรอเวลาเดินต่อ)
//  · ขี้เถ้าค่อยๆ ขึ้น (diegoAsh) · ตาข่ายที่เพิ่งวางรอฉากแผ่เสร็จ (diegoNet)
const K = (x, y) => x + "," + y;
function groundState(ground, fx, now) {
  const oil = new Map(), fire = new Map(), ash = new Map(), nets = new Map();
  for (const p of ground && Array.isArray(ground.oil) ? ground.oil : []) if (okT(p)) oil.set(K(p.x, p.y), { x: p.x, y: p.y, k: 1 });
  for (const p of ground && Array.isArray(ground.fire) ? ground.fire : []) if (okT(p)) fire.set(K(p.x, p.y), { x: p.x, y: p.y, k: 1, left: p.left });
  for (const p of ground && Array.isArray(ground.ash) ? ground.ash : []) if (okT(p)) ash.set(K(p.x, p.y), { x: p.x, y: p.y, k: 1 });
  for (const p of ground && Array.isArray(ground.nets) ? ground.nets : []) if (okT(p)) nets.set(K(p.x, p.y), { x: p.x, y: p.y, color: p.color, k: 1 });
  for (const e of fx) {
    const t = now - e.t0;
    if (t < 0) continue;
    if (e.kind === "diegoThrow" && e.item === "oil" && okT(e.to) && t < DIEGO_FX.throw + 200) {
      for (const [k, o] of oil) if (Math.abs(o.x - e.to.x) <= 1 && Math.abs(o.y - e.to.y) <= 1 && t < DIEGO_FX.throw) oil.delete(k);
    } else if (e.kind === "diegoOil" && okT(e.at) && t < SPREAD_MS + 400) {
      for (const tl of e.tiles || []) {
        const d = Math.hypot(tl.x - e.at.x, tl.y - e.at.y), k = clamp01((t - 40 - d * 90) / SPREAD_MS);
        const cur = oil.get(K(tl.x, tl.y));
        if (cur) cur.k = Math.min(cur.k, easeOut3(k));
        else if (k > 0 && k < 1 && !fire.has(K(tl.x, tl.y))) oil.set(K(tl.x, tl.y), { x: tl.x, y: tl.y, k: easeOut3(k) });
      }
    } else if (e.kind === "diegoExplode" && okT(e.at)) {
      const F = frz(e, t, now, 0, 0);
      if (!F.wait && F.t > DIEGO_FX.explode) continue;
      for (const tl of e.tiles || []) {
        const key = K(tl.x, tl.y), d = Math.hypot(tl.x - e.at.x, tl.y - e.at.y);
        if (F.wait) { fire.delete(key); if (!oil.has(key)) oil.set(key, { x: tl.x, y: tl.y, k: 1 }); continue; }
        const k = clamp01((F.t - 120 - d * 70) / 380), f = fire.get(key);
        if (f) f.k = Math.min(f.k, k);
        if (k < 0.35 && !oil.has(key) && F.t < 200) oil.set(key, { x: tl.x, y: tl.y, k: 1 - k / 0.35 });
      }
    } else if (e.kind === "diegoAsh" && t < ASH_MS) {
      for (const tl of e.tiles || []) { const a = ash.get(K(tl.x, tl.y)); if (a) a.k = Math.min(a.k, clamp01((t - 250) / 600)); }
    } else if (e.kind === "diegoNet" && okT(e.at) && t < NET_MS) {
      const n = nets.get(K(e.at.x, e.at.y));
      if (n) n.k = clamp01((t - NET_MS * 0.55) / (NET_MS * 0.45));
    } else if (e.kind === "diegoNetTrap" && okT(e.to) && t < DIEGO_FX.netTrap + 600) {
      nets.delete(K(e.to.x, e.to.y));
    }
  }
  return { oil: [...oil.values()].filter((o) => o.k > 0.01), fire: [...fire.values()].filter((f) => f.k > 0.01), ash: [...ash.values()].filter((a) => a.k > 0.01), nets: [...nets.values()].filter((n) => n.k > 0.01) };
}
// ขอบแอ่งเป็นคลื่น (หน่วยช่อง) · กองติดกันรวมเป็นผืนเดียว (รัศมีเกินครึ่งช่อง · เติมรูปเดียวกัน)
function blob(g, o, r0, z, amb) {
  const cx = o.x + 0.5, cy = o.y + 0.5, s1 = hash01(o.x * 7 + o.y * 13) * TAU, s2 = hash01(o.x * 3 + o.y * 5 + 1) * TAU, n = 22;
  const wob = REDUCED ? 0 : Math.sin(amb / 900 + s1) * 0.015;
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * TAU, r = (r0 + 0.07 * Math.sin(3 * th + s1) + 0.05 * Math.sin(5 * th + s2) + wob) * o.k;
    const p = P(cx + Math.cos(th) * r, cy + Math.sin(th) * r, z);
    if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
  }
  g.closePath();
}
export function drawDiegoGround(g, ground, fx, now, lowQ, amb = now) {
  const S = groundState(ground, fx, now);
  if (!S.oil.length && !S.fire.length && !S.ash.length && !S.nets.length) return;
  const a = REDUCED ? 0 : amb;
  g.save(); g.lineJoin = "round";
  // ขี้เถ้า: รอยไหม้ดำ + จุดเทา
  if (S.ash.length) {
    g.beginPath(); for (const o of S.ash) blob(g, o, 0.5, 0.008, a);
    g.fillStyle = "rgba(40,36,34,.55)"; g.fill();
    for (const o of S.ash) {
      g.globalAlpha = o.k;
      for (let i = 0; i < (lowQ ? 4 : 9); i++) { const [px, py, ps] = P(o.x + 0.2 + hash01(o.x * 5 + i) * 0.6, o.y + 0.2 + hash01(o.y * 7 + i + 3) * 0.6, 0.01); g.fillStyle = i % 2 ? "rgba(170,166,160,.7)" : "rgba(90,86,82,.8)"; g.fillRect(px - ps * 0.02, py - ps * 0.012, ps * 0.04, ps * 0.024); }
      g.globalAlpha = 1;
    }
  }
  // แอ่งน้ำมัน: ฐานเข้ม → แกนอำพัน → ฟิล์มรุ้ง → เงาสะท้อน
  if (S.oil.length) {
    g.beginPath(); for (const o of S.oil) blob(g, o, 0.6, 0.01, a);
    g.fillStyle = "rgba(46,26,6,.84)"; g.fill();
    g.strokeStyle = "rgba(16,8,2,.55)"; g.lineWidth = 1.2; g.stroke();
    g.beginPath(); for (const o of S.oil) blob(g, o, 0.4, 0.011, a);
    g.fillStyle = "rgba(118,70,12,.38)"; g.fill();
    g.save();
    g.beginPath(); for (const o of S.oil) blob(g, o, 0.6, 0.01, a);
    g.clip();
    if (!lowQ) {
      g.globalCompositeOperation = "lighter";
      // ฟิล์มรุ้ง: ริ้วโค้งสั้นๆ หลายสี วางกระจายไม่ซ้ำตำแหน่ง ค่อยๆ ไหลวน
      for (const o of S.oil) {
        const sd = o.x * 17 + o.y * 3;
        for (let j = 0; j < 3; j++) {
          const ph = a / (3200 + 900 * j) + hash01(sd + j) * TAU, ox = (hash01(sd + j + 5) - 0.5) * 0.5, oy = (hash01(sd + j + 7) - 0.5) * 0.5;
          const rr = 0.2 + 0.25 * hash01(sd + j + 9), a0 = ph, span = 1.1 + 1.2 * hash01(sd + j + 11), hue = (hash01(sd + j + 13) * 360 + a / 40) % 360;
          g.beginPath();
          for (let k = 0; k <= 12; k++) { const an = a0 + (span * k) / 12, p = P(o.x + 0.5 + ox + Math.cos(an) * rr, o.y + 0.5 + oy + Math.sin(an) * rr * 0.75, 0.012); if (k) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }
          g.strokeStyle = `hsla(${hue | 0},85%,60%,${0.13 * o.k})`; g.lineWidth = 3; g.stroke();
          g.strokeStyle = `hsla(${(hue + 60) % 360 | 0},85%,66%,${0.09 * o.k})`; g.lineWidth = 1.4; g.stroke();
        }
      }
    }
    g.globalCompositeOperation = "lighter";
    // แสงอำพันลึกในแอ่ง (เงาวาวแบบของเหลวข้น)
    for (const o of S.oil) { const [gx, gy, gs] = P(o.x + 0.5, o.y + 0.5, 0.012); glow(g, gx, gy, gs * 0.42, "170,100,20", 0.22 * o.k); }
    for (const o of S.oil) {
      const sd = o.x * 7 + o.y * 11, [hx, hy, hs] = P(o.x + 0.25 + 0.4 * hash01(sd), o.y + 0.25 + 0.4 * hash01(sd + 1), 0.012), sh = REDUCED ? 0.5 : 0.5 + 0.5 * Math.sin(a / 700 + o.x * 2 + o.y);
      g.fillStyle = `rgba(255,236,190,${(0.32 + 0.2 * sh) * o.k})`; g.beginPath(); g.ellipse(hx, hy, hs * 0.16, hs * 0.035, -0.35, 0, TAU); g.fill();
      g.fillStyle = `rgba(255,255,255,${0.4 * o.k})`; g.beginPath(); g.ellipse(hx + hs * 0.05, hy - hs * 0.005, hs * 0.05, hs * 0.012, -0.35, 0, TAU); g.fill();
    }
    g.restore();
  }
  // กองไฟ: พื้นไหม้ + แสงส้มบนพื้น (เปลวอยู่ใน diegoFireItems)
  for (const o of S.fire) {
    g.save(); g.globalAlpha = o.k;
    g.beginPath(); blob(g, { ...o, k: 1 }, 0.52, 0.009, a); g.fillStyle = "rgba(34,16,8,.6)"; g.fill();
    const [cx, cy, cs] = P(o.x + 0.5, o.y + 0.5, 0.02), fl = REDUCED ? 1 : 0.85 + 0.15 * Math.sin(a / 60 + o.x * 3 + o.y * 5);
    g.globalCompositeOperation = "lighter"; glow(g, cx, cy, cs * 0.75, FIRE, 0.42 * fl);
    g.restore();
  }
  // ตาข่ายของเรา (ล่องหน — เห็นเฉพาะคนวาง): ลวดหนามบางๆ วาว
  for (const o of S.nets) wireStroke(g, netLines(o.x, o.y), 0.05, 0.55 * o.k, 1, a, lowQ, true, o.color ? rgbStr(o.color) : null);
  g.restore();
}
// เปลวไฟของกองไฟ — เรียงความลึกกับตัวละคร (คนยืนหน้าไฟบังไฟ)
export function diegoFireItems(items, g, ground, fx, now, lowQ, amb = now) {
  const S = groundState(ground, fx, now);
  for (const o of S.fire) items.push({ d: depthOf(o.x + 0.5, o.y + 0.5) - 0.02, f: () => fireTile(g, o, amb, lowQ) });
}
function fireTile(g, o, now, lowQ) {
  const seed = o.x * 31 + o.y * 17, n = lowQ ? 3 : 6, big = (o.left === 1 ? 0.65 : 1) * o.k;
  if (big <= 0.02) return;
  for (let i = 0; i < n; i++) {
    const fx0 = o.x + 0.2 + hash01(seed + i) * 0.6, fy0 = o.y + 0.2 + hash01(seed + i + 9) * 0.6, [bx, by, s] = P(fx0, fy0, 0);
    const ph = REDUCED ? 0.5 : ((now / (380 + hash01(seed + i + 3) * 260)) + hash01(seed + i + 5)) % 1;
    const h = s * big * (0.45 + 0.4 * hash01(seed + i + 7)) * (0.75 + 0.35 * Math.sin(Math.PI * ph));
    const sway = REDUCED ? 0 : Math.sin(now / 130 + i * 1.9 + seed) * 0.35;
    flameTongue(g, bx, by, h, 0, sway, 0.85, 0.3);
  }
  if (!lowQ && !REDUCED) {
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const ph = ((now / (900 + hash01(seed + i) * 600)) + hash01(seed + i + 2)) % 1;
      const [px, py, ps] = P(o.x + 0.3 + hash01(seed + i + 4) * 0.4 + Math.sin(ph * 6 + i) * 0.05, o.y + 0.3 + hash01(seed + i + 6) * 0.4, 0.3 + ph * 1.3 * big);
      g.fillStyle = `rgba(${FIRE_HI},${(1 - ph) * 0.9})`; g.beginPath(); g.arc(px, py, Math.max(0.8, ps * 0.018), 0, TAU); g.fill();
    }
    g.restore();
  }
}

// ---------- ชั้นหยุดเวลา (boardDraw — หลังตัวละคร ก่อนเอฟเฟกต์ครั้งเดียว) ----------
//  o = { info, view, units, fx, freeze: state.timeFreeze, now, lowQ, redraw(u) } — ซีเปียทั้งกระดาน/ในวง · แถบสีกลับด้านที่ขอบวง ·
//  วาดดิเอโก้ (+ม้า) ซ้ำทับให้สีปกติ · ระหว่างหยุด = หน้าปัดนาฬิกาจางๆ ใต้ดิเอโก้ เข็มวินาทีเดินติ๊กทุก 1 วิ
const BAND = 1.8;
function timePhase(fx, freeze, now, info, units) {
  let e = null;
  for (const f of fx) {
    if (f.kind !== "diegoStop" && f.kind !== "diegoResume") continue;
    const t = now - f.t0, dur = f.kind === "diegoStop" ? DIEGO_FX.timeStop : TR.ring1 + 60;
    if (t >= 0 && t < dur && (!e || f.t0 > e.t0)) e = f;
  }
  const byState = freezeLive(freeze, now);
  if (!e && byState == null) return null;
  const by = e ? e.id : byState, u = units.find((q) => q.id === by);
  const at = e && okT(e.at) ? e.at : u ? { x: u.rx, y: u.ry } : null;
  if (!at) return null;
  const n = Math.max(1, (e && e.size) || (u && u.size) || 1), [cx, cy] = cen(at, n);
  const maxR = Math.hypot(Math.max(cx, info.cols - cx), Math.max(cy, info.rows - cy)) + BAND + 0.5;
  if (!e) return { by, cx, cy, n, full: true, disc: 0, band: null, clock: 1 };
  const t = now - e.t0;
  if (e.kind === "diegoStop") {
    if (t < TS.ring0) return { by, cx, cy, n, full: false, disc: 0, band: null, clock: 0 };
    const q = clamp01((t - TS.ring0) / (TS.ring1 - TS.ring0)), front = 0.4 + (maxR + BAND) * easeOut2(q);
    if (q >= 1) return { by, cx, cy, n, full: true, disc: 0, band: null, clock: 0, ring: null };
    return { by, cx, cy, n, full: false, disc: Math.max(0, front - BAND), band: [Math.max(0, front - BAND), front], bandA: 0.92, clock: 0, ring: front };
  }
  if (t < TR.ring0) return { by, cx, cy, n, full: true, disc: 0, band: null, clock: 0 };
  const q = clamp01((t - TR.ring0) / (TR.ring1 - TR.ring0)), front = (maxR + BAND) * (1 - easeIn2(q));
  if (q >= 1) return null;
  return { by, cx, cy, n, full: false, disc: front, band: [front, front + BAND * (1 - q * 0.6)], bandA: 0.9 * (1 - q * 0.5), clock: 0, ring: front };
}
// เส้นรอบวงบนพื้นแบบโดม (ด้านไกลกล้องยกสูงขึ้น — คลุมหัวตัวละครที่ยืนในวง) · กันจุดหลุดนอกกระดานมากๆ
function domePath(g, cx, cy, r, info, h = 1.6) {
  const ax = viewAxes(), n = 72;
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * TAU, c = Math.cos(th), s = Math.sin(th);
    const x = Math.max(-3, Math.min(info.cols + 3, cx + c * r)), y = Math.max(-3, Math.min(info.rows + 3, cy + s * r));
    const near = c * ax.fx + s * ax.fy, z = h * clamp01(0.5 - 0.6 * near);
    const p = P(x, y, z);
    if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]);
  }
  g.closePath();
}
function sepia(g, rect, lowQ) {
  g.save();
  if (!lowQ) { g.globalCompositeOperation = "saturation"; g.globalAlpha = 0.92; g.fillStyle = "rgb(128,128,128)"; g.fillRect(...rect); }
  g.globalCompositeOperation = "color"; g.globalAlpha = lowQ ? 0.75 : 0.62; g.fillStyle = "rgb(168,124,62)"; g.fillRect(...rect);
  g.globalCompositeOperation = "multiply"; g.globalAlpha = 0.32; g.fillStyle = "rgb(255,222,160)"; g.fillRect(...rect);
  g.restore();
}
export function diegoTimeLayer(g, o) {
  const { info, view, units, fx, freeze, now, lowQ } = o;
  const ph = timePhase(fx, freeze, now, info, units);
  if (!ph) return;
  const rect = viewRect(view);
  g.save();
  // ซีเปีย (ทั้งกระดาน หรือเฉพาะในวง)
  const tinted = ph.full || ph.disc > 0.05;
  if (ph.full) {
    sepia(g, rect, lowQ);
    if (!lowQ) {
      const [cx, cy] = [rect[0] + rect[2] / 2, rect[1] + rect[3] / 2], R = Math.hypot(rect[2], rect[3]) / 2;
      const vg = g.createRadialGradient(cx, cy, R * 0.45, cx, cy, R);
      vg.addColorStop(0, "rgba(40,24,6,0)"); vg.addColorStop(1, "rgba(40,24,6,0.42)");
      g.fillStyle = vg; g.fillRect(...rect);
    }
  } else if (ph.disc > 0.05) {
    g.save(); g.beginPath(); domePath(g, ph.cx, ph.cy, ph.disc, info); g.clip(); sepia(g, rect, lowQ); g.restore();
  }
  // แถบสีกลับด้านตรงขอบวง
  if (ph.band && ph.band[1] > 0.05) {
    g.save(); g.beginPath();
    domePath(g, ph.cx, ph.cy, ph.band[1], info);
    if (ph.band[0] > 0.05) domePath(g, ph.cx, ph.cy, ph.band[0], info);
    g.clip("evenodd");
    g.globalCompositeOperation = "difference"; g.globalAlpha = ph.bandA; g.fillStyle = "#ffffff"; g.fillRect(...rect);
    g.restore();
  }
  // ดิเอโก้ (+ม้า) สีปกติ — วาดซ้ำทับ
  if (tinted && typeof o.redraw === "function") {
    for (const u of units) if (u.id === ph.by) o.redraw(u);
  }
  // ขอบวงทอง + ขีดหน้าปัดตามวง
  if (ph.ring != null && ph.ring > 0.1) {
    gEllipse(g, ph.cx, ph.cy, ph.ring, 0.03, 96);
    g.strokeStyle = "rgba(150,96,10,.6)"; g.lineWidth = 5; g.stroke();
    g.save(); g.globalCompositeOperation = "lighter";
    if (!lowQ) { g.strokeStyle = `rgba(${GOLD},0.45)`; g.lineWidth = 12; g.stroke(); }
    g.strokeStyle = `rgba(${GOLD_HI},0.95)`; g.lineWidth = 2.4; g.stroke();
    if (!lowQ) {
      const ax = viewAxes();
      g.beginPath();
      for (let i = 0; i < 60; i++) {
        const an = (i / 60) * TAU, ux = -ax.fx * Math.cos(an) + ax.rx * Math.sin(an), uy = -ax.fy * Math.cos(an) + ax.ry * Math.sin(an);
        const A = P(ph.cx + ux * ph.ring, ph.cy + uy * ph.ring, 0.03), B = P(ph.cx + ux * (ph.ring - (i % 5 ? 0.18 : 0.38)), ph.cy + uy * (ph.ring - (i % 5 ? 0.18 : 0.38)), 0.03);
        g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]);
      }
      g.strokeStyle = `rgba(${GOLD_HI},0.7)`; g.lineWidth = 1.4; g.stroke();
    }
    g.restore();
  }
  // ระหว่างหยุดเวลา: หน้าปัดจางใต้ดิเอโก้ เข็มวินาทีเดินติ๊ก (กระตุกทุก 1 วิ)
  if (ph.clock > 0) {
    const sec = Math.floor(now / 1000), frac = (now % 1000) / 1000, kick = frac < 0.12 ? Math.sin((frac / 0.12) * Math.PI) * 0.05 : 0;
    clockFace(g, ph.cx, ph.cy, 1.35 * ph.n, { h: 0.6, m: 2.1, s: ((sec % 60) / 60) * TAU + kick }, 0.5, lowQ);
    if (frac < 0.25 && !lowQ) groundRing(g, ph.cx, ph.cy, 1.35 * ph.n * (1 + frac * 0.4), 0.35 * (1 - frac / 0.25), GOLD_HI, 1.6, 0.03);
  }
  g.restore();
}

// ---------- ดิเอโก้ / คนติดสถานะบนกระดาน (boardDraw drawUnit) ----------
//  ติดตามต่อตัว: ทิศที่หัน (ตามทางเดินบนจอ) · กำลังควบ · ขึ้นม้า (ค่อยๆ ปรากฏ) · ม้าโดนตี (แวบ) · ฝุ่นกีบ
const track = new Map();
function trackOf(u, now, wx, wy) {
  let tr = track.get(u.id);
  const D = u.diego || {}, [sx] = P(wx, wy), ride = !!(D.mounted || D.charge);
  if (!tr) {
    if (track.size > 24) track.clear();
    tr = { wx, wy, sx, face: -1, moveT: -1e9, ride, mT0: 0, offT: -1e9, offDie: false, hp: D.horseHp, hitT: -1e9, dust: [], dustT: 0, frame: now };
    track.set(u.id, tr);
  }
  if (tr.frame !== now) {
    const moved = Math.hypot(wx - tr.wx, wy - tr.wy) > 0.002;
    if (moved) {
      tr.moveT = now;
      if (Math.abs(sx - tr.sx) > 0.3) tr.face = sx > tr.sx ? 1 : -1;
      if (ride && now - tr.dustT > (u.lowQ ? 110 : 55)) {
        tr.dustT = now;
        const vx = wx - tr.wx, vy = wy - tr.wy, l = Math.hypot(vx, vy) || 1;
        tr.dust.push({ x: wx - (vx / l) * 0.3 + (Math.random() - 0.5) * 0.25, y: wy - (vy / l) * 0.3 + (Math.random() - 0.5) * 0.25, t0: now, dx: -(vx / l) * 0.25, dy: -(vy / l) * 0.25 });
        if (tr.dust.length > 24) tr.dust.shift();
      }
    }
    if (ride !== tr.ride) {
      tr.ride = ride; tr.mT0 = ride ? now : 0;
      if (!ride) { tr.offT = now; tr.offDie = !(D.horseHp > 0); }
    }
    if (Number.isFinite(D.horseHp) && Number.isFinite(tr.hp) && D.horseHp < tr.hp) tr.hitT = now;
    tr.hp = D.horseHp;
    tr.wx = wx; tr.wy = wy; tr.sx = sx; tr.frame = now;
  }
  return tr;
}
// ก่อนฐานหมาก: ฝุ่นกีบ
export function diegoUnitBack(g, u, now, wx, wy) {
  if (!u.diego) return;
  const tr = trackOf(u, now, wx, wy);
  tr.dust = tr.dust.filter((d) => now - d.t0 < 620);
  for (const d of tr.dust) {
    const q = (now - d.t0) / 620, [px, py, ps] = P(d.x + d.dx * q, d.y + d.dy * q, 0.04 + q * 0.28), rr = ps * (0.06 + 0.12 * q);
    const gr = g.createRadialGradient(px, py, 0, px, py, rr);
    gr.addColorStop(0, `rgba(${DUST},${0.5 * (1 - q)})`); gr.addColorStop(1, `rgba(${DUST},0)`);
    g.fillStyle = gr; g.fillRect(px - rr, py - rr, rr * 2, rr * 2);
  }
}
const LEAVE_MS = 760;
// หลังเสาหมาก ก่อนหกเหลี่ยม: ซิลเวอร์ บูลเล็ต (หันตามทาง · ควบ = เด้ง/เอน · โดนตี = แวบ · เพิ่งขึ้น = ค่อยๆ ปรากฏ · ลง/ตาย = ถอยออก/สลาย)
export function diegoHorse(g, u, now, wx, wy, liftZ = 0) {
  const D = u.diego;
  if (!D) return;
  const img = horse(), tr = trackOf(u, now, wx, wy);
  if (!img) return;
  const [bx, by, s] = P(wx, wy, Math.max(0, liftZ)), H = s * HORSE_H * (D.charge ? 1.14 : 1), W = (H * img.naturalWidth) / img.naturalHeight, f = tr.face > 0 ? -1 : 1;
  if (!(D.mounted || D.charge)) {
    const t = now - tr.offT;
    if (!(t >= 0 && t < LEAVE_MS)) return;
    const q = t / LEAVE_MS;
    g.save();
    if (tr.offDie) {
      g.globalAlpha *= 1 - q; g.translate(bx, by + s * 0.2 - q * s * 0.35); g.scale(f, 1); g.rotate(-0.08 * q);
      g.drawImage(img, -W * 0.5, -H, W, H);
      if (q < 0.35) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.85 * (1 - q / 0.35); g.drawImage(img, -W * 0.5, -H, W, H); }
    } else {
      g.globalAlpha *= clamp01(1 - q * 1.1); g.translate(bx + f * s * 0.7 * easeOut2(q), by + s * 0.2); g.scale(f, 1);
      g.drawImage(img, -W * 0.5, -H, W, H);
    }
    g.restore();
    return;
  }
  const fade = tr.mT0 ? clamp01((now - tr.mT0) / 320) : 1, moving = now - tr.moveT < 140 || !!D.charge;
  const bob = REDUCED ? 0 : moving ? Math.abs(Math.sin(now / (D.charge ? 60 : 85))) * s * 0.055 : Math.sin(now / 760) * s * 0.008;
  g.save(); g.globalAlpha *= fade;
  if (liftZ <= 0.05) { gEllipse(g, wx + 0.03, wy + 0.06, 0.5, 0, 28, 0.28); g.fillStyle = "rgba(0,0,0,.24)"; g.fill(); }
  g.translate(bx, by + s * 0.2 - bob - (1 - fade) * s * 0.15); g.scale(f, 1);
  if (moving && !REDUCED) g.rotate(Math.sin(now / 85) * 0.035 + (D.charge ? -0.05 : 0));
  g.drawImage(img, -W * 0.5, -H, W, H);
  const hit = now - tr.hitT;
  if (hit >= 0 && hit < 260) { g.globalCompositeOperation = "lighter"; g.globalAlpha *= 0.85 * (1 - hit / 260); g.drawImage(img, -W * 0.5, -H, W, H); }
  g.restore();
}
// หลังหกเหลี่ยม: ชุ่มน้ำมัน = หยดอำพันไหลจากตัว + เงาวาว · ติดตาข่าย = ลวดหนามพันรอบเสา/หมาก
export function diegoUnitFront(g, u, now, wx, wy, bx, hy, hexR) {
  const st = u.dstat;
  if (!st) return;
  const [, by, s] = P(wx, wy), t = REDUCED ? 0 : now;
  if (st.soaked) {
    g.save();
    g.strokeStyle = "rgba(150,92,18,.75)"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(bx - hexR * 0.86, hy + hexR * 0.12); g.lineTo(bx - hexR * 0.5, hy + hexR * 0.87); g.lineTo(bx + hexR * 0.5, hy + hexR * 0.87); g.lineTo(bx + hexR * 0.86, hy + hexR * 0.12); g.stroke();
    for (let i = 0; i < 4; i++) {
      const ph = ((t / (900 + i * 170)) + hash01(i + 3)) % 1, x = bx + (hash01(i + 9) - 0.5) * hexR * 1.3, y0 = hy + hexR * 0.8, y = lerp(y0, by - s * 0.05, easeIn2(ph));
      const r = Math.max(1.2, s * 0.022) * (ph < 0.15 ? ph / 0.15 : 1);
      g.fillStyle = "rgba(96,56,10,.9)"; g.beginPath(); g.moveTo(x, y - r * 2.2); g.quadraticCurveTo(x + r, y - r * 0.2, x, y + r); g.quadraticCurveTo(x - r, y - r * 0.2, x, y - r * 2.2); g.fill();
      g.fillStyle = "rgba(255,226,160,.7)"; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, TAU); g.fill();
    }
    gEllipse(g, wx, wy, 0.3, 0.005, 20); g.fillStyle = "rgba(60,34,6,.35)"; g.fill();
    g.restore();
  }
  if (st.netted) {
    g.save(); g.lineCap = "round";
    const jit = REDUCED ? 0 : Math.sin(now / 50) * 0.6;
    for (let j = 0; j < 4; j++) {
      const y = lerp(by - s * 0.1, hy + hexR * 0.3, j / 3), r = hexR * (1.05 - j * 0.08);
      g.strokeStyle = "rgba(30,34,40,.6)"; g.lineWidth = 2.6;
      g.beginPath(); g.ellipse(bx + jit, y, r, r * 0.28, (j % 2 ? 0.18 : -0.18), 0, TAU); g.stroke();
      g.strokeStyle = `rgba(${STEEL},.95)`; g.lineWidth = 1.2; g.stroke();
      for (let k = 0; k < 6; k++) { const an = (k / 6) * TAU + j; sparkle(g, bx + jit + Math.cos(an) * r, y + Math.sin(an) * r * 0.28, Math.max(1.5, s * 0.025), 0.9, STEEL, an); }
    }
    g.restore();
  }
}

// ---------- socket "diegoFx" → fx (BoardStage / หน้าทดสอบ) ----------
//  ctx = { posOf(id) → {x,y}|null · sizeOf(id) → ช่อง · idAt({x,y}) → id|null }
//  คืน { fx, look: [[{x,y}, ms]], shake: [ms], busy: [{ id, ms }] (หมากที่ฉากย้ายเอง), later: [[ms, fx[]]],
//        defer: [{ id, ms }] (เลื่อนเลขดาเมจจาก state ไปขึ้นตอนปะทะ), ghosts: [{ id, ms }] (ตกรอบตอนเวลาเดินต่อ — วาดค้างจนปะทะ) }
//  ไม่มีเสียง — server เล่นเอง (engine.sfx / เสียงพากย์)
export function diegoEventFx(ev, ctx = {}) {
  const out = { fx: [], look: [], shake: [], busy: [], later: [], defer: [], ghosts: [] };
  if (!ev || typeof ev !== "object") return out;
  const posOf = (id) => (id != null && typeof ctx.posOf === "function" ? ctx.posOf(id) : null);
  const sizeOf = (id) => (id != null && typeof ctx.sizeOf === "function" ? Math.max(1, ctx.sizeOf(id) | 0) : 1);
  const ping = (id, ms, at) => { if (id != null) out.fx.push({ kind: "diegoPing", x: at ? at.x : 0, y: at ? at.y : 0, hitIds: [id], hitDelay: Math.max(0, Math.round(ms)), dur: Math.round(ms) + PING_MS }); };
  const quake = (ms, amp) => { out.shake.push(ms); out.later.push([ms, [{ kind: "iceShake", x: 0, y: 0, amp, dur: 420 }]]); };
  const evT = typeof performance !== "undefined" ? performance.now() : Date.now();
  const frozen = !!ev.frozen;
  const base = { id: ev.id, color: ev.color || null, evT, frozen };
  switch (ev.kind) {
    case "throw": {
      if (!okT(ev.from) || !okT(ev.to)) break;
      const item = ev.item === "match" || ev.item === "net" ? ev.item : "oil";
      // ค้างกลางอากาศได้เฉพาะไม้ขีด (แกลลอน/ตาข่ายลงพื้นทันทีตามกติกา — ของบนพื้นเกิดทันที)
      const fz = frozen && item === "match";
      out.fx.push({ ...base, frozen: fz, kind: "diegoThrow", item, from: ptOf(ev.from), to: ptOf(ev.to), dur: fz ? FROZEN_MAX : DIEGO_FX_DUR.diegoThrow });
      out.look.push([ptOf(ev.to), 0]);
      break;
    }
    case "oil": {
      if (!okT(ev.at)) break;
      const soakedAt = (Array.isArray(ev.soaked) ? ev.soaked : []).map(posOf).filter(okT).map(ptOf);
      out.fx.push({ ...base, kind: "diegoOil", at: ptOf(ev.at), tiles: tilesOf(ev.tiles), soakedAt, dur: DIEGO_FX_DUR.diegoOil });
      for (const id of Array.isArray(ev.soaked) ? ev.soaked : []) ping(id, 90, posOf(id));
      break;
    }
    case "explode": {
      if (!okT(ev.at)) break;
      const ids = Array.isArray(ev.hits) ? ev.hits : [];
      const hitsAt = ids.map((id) => { const p = posOf(id); return okT(p) ? { id, x: p.x, y: p.y } : null; }).filter(Boolean);
      out.fx.push({ ...base, kind: "diegoExplode", at: ptOf(ev.at), tiles: tilesOf(ev.tiles), hitsAt, dur: frozen ? FROZEN_MAX : DIEGO_FX_DUR.diegoExplode });
      out.look.push([ptOf(ev.at), 0]);
      if (!frozen) {
        quake(0, 9);
        for (const h of hitsAt) { ping(h.id, 60, h); out.defer.push({ id: h.id, ms: 80 }); }
      }
      break;
    }
    case "ignite": {
      const at = posOf(ev.targetId) || (okT(ev.at) ? ev.at : null);
      if (!okT(at)) break;
      out.fx.push({ ...base, kind: "diegoIgnite", targetId: ev.targetId, at: ptOf(at), size: sizeOf(ev.targetId), turns: ev.turns, dur: frozen ? FROZEN_MAX : DIEGO_FX_DUR.diegoIgnite });
      if (!frozen) { ping(ev.targetId, 40, at); out.defer.push({ id: ev.targetId, ms: 60 }); }
      break;
    }
    case "ash": {
      const tiles = tilesOf(ev.tiles);
      if (tiles.length) out.fx.push({ ...base, kind: "diegoAsh", tiles, dur: ASH_MS });
      break;
    }
    case "burn": {
      const at = okT(ev.at) ? ev.at : posOf(ev.targetId);
      if (!okT(at)) break;
      out.fx.push({ ...base, kind: "diegoBurn", targetId: ev.targetId, at: ptOf(at), size: sizeOf(ev.targetId), dur: BURN_MS });
      ping(ev.targetId, 60, at);
      out.defer.push({ id: ev.targetId, ms: 80 });
      break;
    }
    case "net": {
      if (!okT(ev.at)) break;
      out.fx.push({ ...base, kind: "diegoNet", at: ptOf(ev.at), tiles: tilesOf(ev.tiles), dur: NET_MS });
      break;
    }
    case "netTrap": {
      const to = okT(ev.to) ? ev.to : okT(ev.at) ? ev.at : null, from = okT(ev.from) ? ev.from : posOf(ev.targetId);
      if (!okT(to) || !okT(from)) break;
      out.fx.push({ ...base, kind: "diegoNetTrap", targetId: ev.targetId, from: ptOf(from), to: ptOf(to), tiles: tilesOf(ev.tiles), dur: DIEGO_FX_DUR.diegoNetTrap });
      if (ev.targetId != null) out.busy.push({ id: ev.targetId, ms: DIEGO_FX.netTrap + HOLD });
      ping(ev.targetId, NETTRAP.pull - 40, to);
      out.look.push([ptOf(to), 0]);
      out.shake.push(NETTRAP.pull - 40);
      break;
    }
    case "knife":
    case "shot": {
      if (!okT(ev.from)) break;
      const hitAt = ev.hitId != null ? posOf(ev.hitId) : null, kind = ev.kind === "knife" ? "diegoKnife" : "diegoShot";
      const e = { ...base, kind, from: ptOf(ev.from), dir: ev.dir, to: okT(ev.to) ? ptOf(ev.to) : null, hitId: ev.hitId != null ? ev.hitId : null,
        hitAt: okT(hitAt) ? ptOf(hitAt) : null, hitSize: sizeOf(ev.hitId), dur: frozen ? FROZEN_MAX : DIEGO_FX_DUR[kind] };
      out.fx.push(e);
      const hitMs = kind === "diegoKnife" ? TK.hit : TSH.hit;
      if (!frozen && e.hitAt) { ping(e.hitId, hitMs, e.hitAt); out.defer.push({ id: e.hitId, ms: hitMs + 20 }); }
      if (e.to || e.hitAt) out.look.push([e.hitAt || e.to, 0]);
      break;
    }
    case "reload": if (okT(ev.at)) out.fx.push({ ...base, kind: "diegoReload", at: ptOf(ev.at), dur: RELOAD_MS }); break;
    case "firstAid": if (okT(ev.at)) out.fx.push({ ...base, kind: "diegoAid", at: ptOf(ev.at), dur: DIEGO_FX.firstAid }); break;
    case "cunning": if (okT(ev.at)) out.fx.push({ ...base, kind: "diegoCunning", at: ptOf(ev.at), gain: Number(ev.gain) || 1, dur: CUNNING_MS }); break;
    case "world": {
      if (!okT(ev.at)) break;
      out.fx.push({ ...base, kind: "diegoWorld", at: ptOf(ev.at), size: sizeOf(ev.id), dur: DIEGO_FX.world });
      out.look.push([ptOf(ev.at), 0]);
      out.shake.push(430);
      break;
    }
    case "timeStop": {
      if (!okT(ev.at)) break;
      note(STOPS, ev.id, evT);
      const atk = ev.attackerId != null ? posOf(ev.attackerId) : null;
      out.fx.push({ ...base, kind: "diegoStop", at: ptOf(ev.at), size: sizeOf(ev.id), mode: ev.mode === "counter" ? "counter" : "normal",
        attackerId: ev.attackerId != null ? ev.attackerId : null, attackerAt: okT(atk) ? ptOf(atk) : null, attackerSize: sizeOf(ev.attackerId), dur: DIEGO_FX.timeStop });
      out.look.push([ptOf(ev.at), 0]);
      quake(TS.ring0, 7);
      if (okT(atk) && ev.mode === "counter") ping(ev.attackerId, TS.ring0, atk);
      break;
    }
    case "timeResume": {
      if (!okT(ev.at)) break;
      note(RESUMES, ev.id, evT);
      const hitsAt = (Array.isArray(ev.hits) ? ev.hits : []).filter((h) => h && h.id != null).map((h, i) => {
        const p = posOf(h.id);
        return okT(p) ? { id: h.id, x: p.x, y: p.y, size: sizeOf(h.id), dmg: Number(h.dmg) || 0, kill: !!h.kill, i } : null;
      }).filter(Boolean);
      out.fx.push({ ...base, kind: "diegoResume", at: ptOf(ev.at), size: sizeOf(ev.id), hitsAt, dur: DIEGO_FX.timeResume });
      out.look.push([ptOf(ev.at), 0]);
      if (hitsAt.length) {
        out.look.push([hitsAt[0], TR.launch]);
        quake(TR.hit, Math.min(14, 7 + hitsAt.length * 2));
      }
      for (const h of hitsAt) {
        const ms = TR.hit + h.i * 50;
        ping(h.id, ms, h);
        out.defer.push({ id: h.id, ms });
        if (h.kill) out.ghosts.push({ id: h.id, ms: ms + 60 });
      }
      break;
    }
    case "plot": {
      if (!okT(ev.from)) break;
      const e = { ...base, kind: "diegoPlot", from: ptOf(ev.from), dir: ev.dir, path: tilesOf(ev.path), hitId: ev.hitId != null ? ev.hitId : null, push: ev.push || null };
      const G = plotGeo(e);
      e.dur = G.len + HOLD;
      out.fx.push(e);
      if (ev.id != null) out.busy.push({ id: ev.id, ms: G.len + HOLD });
      if (e.hitId != null) { out.busy.push({ id: e.hitId, ms: G.len + HOLD }); ping(e.hitId, G.H, G.push ? G.push.from : G.pts[G.steps]); }
      out.look.push([e.from, 0]);
      if (G.steps) out.look.push([G.pts[G.steps], PL.wind + Math.round(G.dash * 0.5)]);
      out.shake.push(0);
      if (e.hitId != null) quake(G.H, 14);
      break;
    }
    case "horse": {
      if (!okT(ev.at)) break;
      const mode = ev.mode || ev.action;
      if (mode !== "mount" && mode !== "dismount" && mode !== "die") break;
      out.fx.push({ ...base, kind: "diegoHorse", at: ptOf(ev.at), mode, dur: HORSE_MS });
      break;
    }
    default:
  }
  return out;
}
