// ============================================================
//  เอฟเฟกต์บนกระดานของทราฟาก้า ลอว์ (characters/trafalgar_law.js · GRID_PLAN §7.20 · สัญญาข้อมูล .claude/plans/law-contract.md)
//  ธีม One Piece (ผลโอเปะโอเปะ): Room = เยื่อโดมฟ้าใสกางจากฝ่ามือ · ดาบ Kikoku (โนดาจิ) · รอยตัดเส้นบางฟ้าเรือง ·
//  Gamma Knife = ใบมีดพลังงานเขียว · Mess = หัวใจในลูกบาศก์ใส · Counter Shock = สายฟ้าเหลืองขาวแบบเครื่องกระตุกหัวใจ
//
//  ชั้นค้าง (วาดทุกเฟรมจาก state.board.law → BoardStage prop law { rooms, objects, marks, hearts, armed, rocks })
//   drawLawGround  พื้น Room (ฟิล์มฟ้าจางบนช่องสี่เหลี่ยม + เส้นตาราง + ขอบเรือง) + ด้านหลังโดม — ใต้ไฮไลต์
//   lawSliced      มาร์ก = ร่างถูกตัดเป็นชิ้นลอยแยก (Amputate) ค้างตลอดที่อยู่ใน marks → unmark = ต่อกลับ (boardDraw วาดหมากตัวนั้นแบบ lawCut)
//   lawItems       วัตถุลอย (ก้อนพื้นที่ถูกตัด — ลูกบาศก์หินขอบฟ้า ลอยขึ้นลง) + ชิ้นส่วนร่างที่ถูกตัด เรียงความลึกกับตัวละคร
//   drawLawAir     ผิวโดมด้านหน้า (ฟิล์ม + ขอบเรือง + ประกายวิ่ง) · หัวใจ (เหนือหัวเหยื่อ / ลอยข้างลอว์) ·
//                  ท่าไม้ตายที่รอตี (ใบมีดเขียว / มือในลูกบาศก์) — ทับตัวละคร
//   drawLawRock    หนามหิน Takt (terrain "icewall" ที่ spikes[].look === "lawRock") แทนกำแพงน้ำแข็ง · lawRockRise = พุ่งขึ้นตามฉาก Takt
//   Room ใหม่ (seq ใหม่ / เหตุการณ์ roomOpen) = ฉากกาง: ภาพอบของโดมขยายออกจากฝ่ามือ (ROOM_GROW) แล้วนิ่ง
//  ความลื่น (วัดด้วย Playwright + การ์ดจอจริง): ของค้างทุกชิ้นวาดจากภาพอบ (drawImage) — ห้าม clip / เติม path ใหญ่ / เส้นเล็กหลายสิบเส้นทุกเฟรม
//   (ฝั่งการ์ดจอกินเวลาจนตกเฟรมที่ DPR 2) · ภาพอบสร้างใหม่เมื่อมุมกล้อง/ขนาดกระดาน/ความละเอียดเปลี่ยน · ระหว่างหมุนกระดาน = วาดสด
//
//  ตีปกติ (attackStyle — STYLE_MS / STYLE_HIT_P ใน boardDraw) · fx { x, y (มุมบนซ้ายลอว์), size, to, toSize, by, dodge? }
//   lawSlash  ฟัน Kikoku จากที่ยืน (ไม่พุ่ง · ห่างแค่ไหนก็ได้ใน Room) → รอยตัดเส้นบางวาบผ่านเป้า → ร่างเป้าแยกชิ้น (มาร์ก — ไม่มีเลือด)
//   lawGamma  พลังงานเขียวรวมที่มือเป็นใบมีด → แทงทะลุเป้า → แสงข้างในแบบเอกซเรย์
//   lawMess   มือใสดันเข้าอก → คลื่นหกเหลี่ยม + ลูกบาศก์ใสที่อก (หัวใจหลุดออกมาในเหตุการณ์ mess)
//  เหตุการณ์ (socket "lawFx" → lawEventFx → { fx, look, shake, busy, later }) — ดูตาราง EVENT_FX · จังหวะ LAW_FX = BEAT ของ server
//  lowQ = ตัดอนุภาค/ประกายวิ่ง/ลายหิน · ลดการเคลื่อนไหว = ไม่ลอยขึ้นลง ไม่หมุน ไม่มีประกายวิ่ง (รูปเดิมทั้งฉาก)
// ============================================================
import { P, customProjection, depthOf, gEllipse, hexPath, normColor, pitchOf, rgbOf, viewAxes, viewTurn } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ---------- จังหวะ ----------
export const LAW_MS = { lawSlash: 900, lawGamma: 1100, lawMess: 1200 };
export const LAW_HIT_P = { lawSlash: 0.4, lawGamma: 0.5, lawMess: 0.5 };
//  server พัก (BEAT ใน characters/trafalgar_law.js · วินาที × 1000) — ภาพต้องไม่สั้นกว่านี้
export const LAW_FX = {
  roomOpen: 1000, roomClose: 600, cut: 700, shuffle: 550, takt: 450, taktPush: 500, throw: 800, throwHit: 400,
  shamble: 1100, shambleDone: 400, ultArm: 600, squeeze: 600, shock: 600, revived: 500,
};
const ROOM_GROW = 900; // เยื่อ Room พองจากฝ่ามือจนเต็ม (อยู่ในช่วงพัก roomOpen 1.0 วิ)
export const LAW_FX_DUR = {
  ...LAW_MS,
  lawRoomOpen: 1300, lawRoomClose: 950, lawCut: 1000, lawShuffle: 1150, lawTakt: 1150, lawRockDown: 800, lawRockBreak: 800,
  lawThrow: 1000, lawThrowHit: 900, lawShamble: 1250, lawShambleDone: 700, lawUltArm: 900, lawGammaHex: 1300, lawHeartOut: 1100,
  lawSqueeze: 800, lawSqueezeHit: 800, lawHeartGone: 900, lawShock: 1000, lawRevived: 900, lawMark: 650, lawUnmark: 900,
};
export const isLawFx = (kind) => typeof kind === "string" && (kind in LAW_FX_DUR);
const EVENT_FX = {
  roomOpen: "lawRoomOpen", roomClose: "lawRoomClose", cut: "lawCut", shuffle: "lawShuffle", takt: "lawTakt", rockDown: "lawRockDown",
  throw: "lawThrow", throwHit: "lawThrowHit", shamble: "lawShamble", shambleDone: "lawShambleDone", ultArm: "lawUltArm",
  gamma: "lawGammaHex", mess: "lawHeartOut", squeeze: "lawSqueeze", squeezeHit: "lawSqueezeHit", heartGone: "lawHeartGone",
  shock: "lawShock", revived: "lawRevived", mark: "lawMark", unmark: "lawUnmark",
};
// เหตุการณ์ที่มากับการตีปกติ (server ส่งตอนเริ่มฉากตี) — BoardStage รอถึงจังหวะปะทะของฉากตีลอว์ก่อนเล่น
export const LAW_ON_HIT = { gamma: 1, mess: 1, mark: 1 };

// ---------- สี (r,g,b) ----------
const WHITE = "255,255,255", CYAN = "130,236,255", CYAN_D = "40,150,230", CUT = "214,252,255", ROOM_L = "205,238,255";
const GREEN = "80,255,140", GREEN_D = "20,160,80", GREEN_L = "200,255,210", YEL = "255,236,110", YEL_W = "255,252,214", AMBER = "255,190,60";
const RED = "235,36,60", RED_L = "255,120,135", RED_D = "120,10,30", BURN = "255,140,40", BLEED = "215,24,48", POISON = "176,86,236";
const DUST = "196,182,160", DUST_D = "130,116,98";
const FILM = [150, 205, 255], FILM_L = [215, 240, 255], RIM = [110, 195, 255], RIM_L = [200, 245, 255];
const STONE = [150, 144, 132], STONE_L = [190, 184, 170], ROCK = [150, 128, 104], ROCK_L = [196, 174, 146];
const STATUS_RGB = { burn: BURN, bleed: BLEED, poison: POISON };

// ---------- คณิต ----------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const env = (t, a, b, c, d) => (t <= a || t >= d ? 0 : t < b ? (t - a) / (b - a) : t <= c ? 1 : (d - t) / (d - c));
const okT = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const strHash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) % 100000; };
function rngOf(seed) { let s = Math.abs(seed | 0) % 2147483646 || 1; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }
const mixRgb = (a, b, t) => `${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))}`;
const shade = (c, k) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
// พื้นที่มีเครื่องหมายของรูปบนจอ (y ลง) — > 0 = ด้านที่หันเข้ากล้อง (มุมฐานเรียงมุมเพิ่มขึ้นในพิกัดกระดาน)
const sarea3 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

// จุดบนจอของหมาก (ตรงกับ boardDraw drawUnit) · bx, by = พื้นกลางตัวบนจอ · hy = กลางหกเหลี่ยม · r = รัศมีหกเหลี่ยม
function bodyAt(x, y, n = 1, hz = 0) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6, cx = x + n / 2, cy = y + n / 2;
  const [bx, by, s] = P(cx, cy);
  return { cx, cy, bx, by, s, n, K, r: s * 0.4 * K, hy: by - s * 0.86 * K - hz * s * 0.85 };
}
const unitBody = (u) => bodyAt(u.rx + (u.ox || 0), u.ry + (u.oy || 0), u.size, u.hz || 0);
const findUnit = (units, id) => { if (!Array.isArray(units) || id == null) return null; for (const u of units) if (u && u.id === id && !u.corpse) return u; return null; };

// ---------- สไปรต์แสง (อบครั้งเดียวต่อสี — ไม่สร้าง gradient ทุกเฟรม) ----------
const SPR = new Map();
function sprite(rgb) {
  let c = SPR.get(rgb);
  if (!c) {
    c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.35, `rgba(${rgb},0.42)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    SPR.set(rgb, c);
  }
  return c;
}
function sglow(g, x, y, r, rgb, a) {
  if (a <= 0.01 || !(r > 0.5)) return;
  const ga = g.globalAlpha;
  g.globalAlpha = ga * Math.min(1, a);
  g.drawImage(sprite(rgb), x - r, y - r, r * 2, r * 2);
  g.globalAlpha = ga;
}
const lit = (g) => { g.globalCompositeOperation = "lighter"; };
// วงรีนุ่ม (เงา/แสงบนพื้น) จากสไปรต์ — ไม่ต้องเติม path
function sglowE(g, x, y, rx, ry, rgb, a) {
  if (a <= 0.01 || !(rx > 0.5) || !(ry > 0.3)) return;
  const ga = g.globalAlpha;
  g.globalAlpha = ga * Math.min(1, a);
  g.drawImage(sprite(rgb), x - rx, y - ry, rx * 2, ry * 2);
  g.globalAlpha = ga;
}
// ภาพอบของชิ้นที่ค้างบนกระดาน (ลูกบาศก์ · หนามหิน · ไอคอนหัวใจ · รอยตัด) — วาดเวกเตอร์ครั้งเดียวแล้ว drawImage ทุกเฟรม
//  (เส้น/เติมเล็กๆ หลายสิบครั้งต่อเฟรมกินเวลาฝั่งการ์ดจอ — วัดแล้วกระตุกที่ DPR 2) · ระหว่างหมุนกระดาน/สนาม Colony = วาดสด (คีย์เปลี่ยนทุกเฟรม)
const BAKE = new Map();
const canBake = () => !customProjection() && Number.isInteger(viewTurn());
function bakeRes(g) {
  let k = 1;
  try { const m = g.getTransform(); k = Math.hypot(m.a, m.b); } catch { k = 1; }
  return Math.max(1, Math.min(2.5, Math.ceil(k * 2) / 2));
}
function baked(key, x0, y0, w, h, res, draw) {
  let e = BAKE.get(key);
  if (e) return e;
  const cv = document.createElement("canvas"), W = Math.max(2, Math.ceil(w * res)), H = Math.max(2, Math.ceil(h * res));
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  c.setTransform(res, 0, 0, res, -x0 * res, -y0 * res);
  draw(c);
  e = { cv, x0, y0, w, h };
  BAKE.set(key, e);
  if (BAKE.size > 160) BAKE.delete(BAKE.keys().next().value);
  return e;
}
const blitB = (g, e, dx = 0, dy = 0, k = 1, sc = 1) => {
  const ga = g.globalAlpha;
  g.globalAlpha = ga * k;
  if (sc === 1) g.drawImage(e.cv, e.x0 + dx, e.y0 + dy, e.w, e.h);
  else g.drawImage(e.cv, dx + e.x0 * sc, dy + e.y0 * sc, e.w * sc, e.h * sc);
  g.globalAlpha = ga;
};

// ---------- ชิ้นส่วนภาพ ----------
// เส้นหยัก (สายฟ้า) a → b · seed คงที่ต่อเฟรมกระพริบ
function zap(g, x1, y1, x2, y2, seed, a, w, { jitter = 0.28, core = WHITE, mid = YEL, outer = AMBER, lowQ = false } = {}) {
  if (a <= 0.01) return;
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return;
  const rnd = rngOf(seed), nx = -(y2 - y1) / len, ny = (x2 - x1) / len, steps = Math.max(3, Math.round(len / 11));
  g.beginPath(); g.moveTo(x1, y1);
  for (let i = 1; i < steps; i++) { const t = i / steps, off = (rnd() - 0.5) * len * jitter * Math.sin(t * Math.PI); g.lineTo(lerp(x1, x2, t) + nx * off, lerp(y1, y2, t) + ny * off); }
  g.lineTo(x2, y2);
  g.save(); lit(g); g.lineCap = "round"; g.lineJoin = "round";
  if (!lowQ) { g.strokeStyle = rgba(outer, 0.3 * a); g.lineWidth = w * 3.2; g.stroke(); }
  g.strokeStyle = rgba(mid, 0.85 * a); g.lineWidth = w * 1.5; g.stroke();
  g.strokeStyle = rgba(core, a); g.lineWidth = w * 0.6; g.stroke();
  g.restore();
}
// แถบโค้ง (รอยดาบ) รอบ (cx, cy) รัศมี R จากมุม a0 → a1 · หนาสุด w ที่หัว (a1) เรียวไปหาง
function arcBand(g, cx, cy, R, a0, a1, w, k, outer, mid, core = WHITE) {
  if (k <= 0.01 || Math.abs(a1 - a0) < 0.02) return;
  const N = 20;
  const band = (wk, rgb, al) => {
    g.beginPath();
    for (let i = 0; i <= N; i++) { const u = i / N, an = lerp(a0, a1, u), rr = R + w * wk * u * 0.3; const x = cx + Math.cos(an) * rr, y = cy + Math.sin(an) * rr; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    for (let i = N; i >= 0; i--) { const u = i / N, an = lerp(a0, a1, u), rr = R - w * wk * Math.pow(u, 0.8); g.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); }
    g.closePath(); g.fillStyle = rgba(rgb, al * k); g.fill();
  };
  g.save(); lit(g);
  band(1.7, outer, 0.3); band(1, mid, 0.6); band(0.38, core, 0.95);
  g.restore();
}
// รอยตัดเส้นบาง (Amputate): เส้นตรงยาว len มุม ang ผ่าน (x, y) · grow = ยืดจากกลาง 0..1 · split = แยกเป็นสองเส้นขนาน (px)
function incision(g, x, y, ang, len, k, grow = 1, split = 0) {
  if (k <= 0.01 || grow <= 0.01) return;
  const c = Math.cos(ang) * len * 0.5 * grow, s = Math.sin(ang) * len * 0.5 * grow, nx = -Math.sin(ang), ny = Math.cos(ang);
  g.save(); lit(g); g.lineCap = "round";
  const line = (o, rgb, lw, al) => { g.strokeStyle = rgba(rgb, al * k); g.lineWidth = lw; g.beginPath(); g.moveTo(x - c + nx * o, y - s + ny * o); g.lineTo(x + c + nx * o, y + s + ny * o); g.stroke(); };
  line(0, CYAN_D, 7, 0.28); line(0, CYAN, 2.6, 0.75);
  if (split > 0.3) { line(-split, CUT, 1.1, 0.8); line(split, CUT, 1.1, 0.8); } else line(0, WHITE, 1.1, 1);
  sglow(g, x - c, y - s, 7, CUT, 0.7 * k); sglow(g, x + c, y + s, 7, CUT, 0.7 * k);
  g.restore();
}
// ประกายสี่แฉก
function twinkle(g, x, y, r, a, rgb = WHITE) {
  if (a <= 0.01 || r <= 0.5) return;
  g.fillStyle = rgba(rgb, a);
  g.beginPath();
  g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r * 0.18, y); g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r * 0.18, y); g.quadraticCurveTo(x, y, x, y - r);
  g.moveTo(x - r * 0.7, y); g.quadraticCurveTo(x, y, x, y + r * 0.14); g.quadraticCurveTo(x, y, x + r * 0.7, y);
  g.quadraticCurveTo(x, y, x, y - r * 0.14); g.quadraticCurveTo(x, y, x - r * 0.7, y);
  g.fill();
}
// หัวใจ (จอ) กลาง (x, y) ขนาด r
function heartPath(g, x, y, r) {
  g.beginPath();
  g.moveTo(x, y + r * 0.95);
  g.bezierCurveTo(x - r * 1.45, y - r * 0.05, x - r * 0.75, y - r * 1.1, x, y - r * 0.38);
  g.bezierCurveTo(x + r * 0.75, y - r * 1.1, x + r * 1.45, y - r * 0.05, x, y + r * 0.95);
  g.closePath();
}
// ลูกบาศก์ใส (ไอโซเมตริกบนจอ) กลาง (x, y) รัศมี r · หัวใจเต้นข้างใน (beat 0..1) · crack = รอยร้าว
function heartCube(g, x, y, r, k, { beat = 0, heart = true, crack = 0, squeeze = 1, rgb = ROOM_L } = {}) {
  if (k <= 0.01 || r < 1) return;
  const pt = (i, rr = r) => { const an = -Math.PI / 2 + (i * Math.PI) / 3; return [x + Math.cos(an) * rr, y + Math.sin(an) * rr]; };
  g.save();
  g.beginPath(); for (let i = 0; i < 6; i++) { const [px, py] = pt(i); if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath();
  g.fillStyle = rgba(rgb, 0.22 * k); g.fill();
  if (heart) {
    const hr = r * 0.5 * squeeze * (1 + 0.12 * beat);
    heartPath(g, x, y + r * 0.04, hr);
    g.fillStyle = rgba(RED, 0.95 * k); g.fill();
    g.strokeStyle = rgba(RED_D, 0.8 * k); g.lineWidth = Math.max(1, r * 0.05); g.stroke();
    g.fillStyle = rgba(RED_L, 0.7 * k); g.beginPath(); g.arc(x - hr * 0.42, y - hr * 0.2, hr * 0.2, 0, TAU); g.fill();
  }
  // ขอบลูกบาศก์ (6 ขอบนอก + Y ด้านใน)
  g.beginPath(); for (let i = 0; i < 6; i++) { const [px, py] = pt(i); if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath();
  g.moveTo(x, y); g.lineTo(...pt(1)); g.moveTo(x, y); g.lineTo(...pt(3)); g.moveTo(x, y); g.lineTo(...pt(5));
  g.strokeStyle = rgba(CYAN, 0.85 * k); g.lineWidth = Math.max(1, r * 0.07); g.lineJoin = "round"; g.stroke();
  if (crack > 0.01) {
    g.strokeStyle = rgba(WHITE, 0.9 * k * crack); g.lineWidth = 1;
    g.beginPath(); g.moveTo(x - r * 0.6, y - r * 0.2); g.lineTo(x - r * 0.1, y + r * 0.05); g.lineTo(x + r * 0.15, y - r * 0.35); g.lineTo(x + r * 0.55, y + r * 0.25); g.stroke();
  }
  g.restore();
}
// มือใส (Mess / Room) ชี้ทาง ang · (x, y) = กลางฝ่ามือ · sz = ขนาดมือ (px)
function ghostHand(g, x, y, ang, sz, k, grip = 0) {
  if (k <= 0.01 || sz < 2) return;
  g.save(); g.translate(x, y); g.rotate(ang);
  g.globalAlpha *= 0.5 * k;
  g.fillStyle = "rgb(200,238,255)"; g.strokeStyle = "rgb(200,238,255)"; g.lineCap = "round";
  g.beginPath(); g.ellipse(0, 0, sz * 0.42, sz * 0.36, 0, 0, TAU); g.fill();
  g.lineWidth = sz * 0.15;
  for (let i = 0; i < 4; i++) {
    const fy = -sz * 0.26 + i * sz * 0.175, fl = sz * (0.86 - Math.abs(i - 1.4) * 0.12) * (1 - grip * 0.5);
    g.beginPath(); g.moveTo(sz * 0.2, fy); g.lineTo(fl, fy + grip * sz * 0.12); g.stroke();
  }
  g.lineWidth = sz * 0.16;
  g.beginPath(); g.moveTo(0, sz * 0.26); g.lineTo(sz * 0.44, sz * (0.48 - grip * 0.2)); g.stroke();
  g.restore();
  g.save(); lit(g); sglow(g, x, y, sz * 1.2, CYAN, 0.35 * k); g.restore();
}
// ใบมีดพลังงาน (Gamma Knife) โคน (x0, y0) → ปลาย (x1, y1) · w = กว้างที่โคน
function energyBlade(g, x0, y0, x1, y1, w, k, flick = 0) {
  if (k <= 0.01) return;
  const vx = x1 - x0, vy = y1 - y0, L = Math.hypot(vx, vy);
  if (L < 2) return;
  const nx = -vy / L, ny = vx / L;
  const shape = (wk) => {
    g.beginPath();
    g.moveTo(x0 + nx * w * wk, y0 + ny * w * wk);
    g.quadraticCurveTo(x0 + vx * 0.6 + nx * w * wk * 0.8, y0 + vy * 0.6 + ny * w * wk * 0.8, x1, y1);
    g.quadraticCurveTo(x0 + vx * 0.6 - nx * w * wk * 0.8, y0 + vy * 0.6 - ny * w * wk * 0.8, x0 - nx * w * wk, y0 - ny * w * wk);
    g.closePath();
  };
  g.save(); lit(g);
  const f = 1 + (flick % 3) * 0.06;
  shape(2.1 * f); g.fillStyle = rgba(GREEN_D, 0.35 * k); g.fill();
  shape(1.15); g.fillStyle = rgba(GREEN, 0.75 * k); g.fill();
  shape(0.42); g.fillStyle = rgba(GREEN_L, 0.95 * k); g.fill();
  sglow(g, x0, y0, w * 4, GREEN, 0.5 * k);
  g.restore();
}
// ดาบ Kikoku (โนดาจิยาว) · (x, y) = มือ · ang = ทิศปลายดาบ · L = ยาวใบ (px)
function kikoku(g, x, y, ang, L, k, glint = -1) {
  if (k <= 0.01 || L < 4) return;
  const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c, W = Math.max(1.6, L * 0.035);
  const pt = (u, v) => [x + c * L * u + nx * W * v, y + s * L * u + ny * W * v];
  g.save(); g.globalAlpha *= k; g.lineCap = "round";
  // ด้าม (ผ้าพันขาวลายข้าวหลามตัดดำ) + ปลายด้าม
  g.strokeStyle = "rgb(30,28,34)"; g.lineWidth = W * 1.5;
  g.beginPath(); g.moveTo(...pt(-0.28, 0)); g.lineTo(...pt(-0.01, 0)); g.stroke();
  g.fillStyle = "rgb(238,236,228)";
  for (let i = 0; i < 4; i++) { const [px, py] = pt(-0.24 + i * 0.06, 0); g.beginPath(); g.arc(px, py, W * 0.5, 0, TAU); g.fill(); }
  // กระบังรูปกากบาท
  g.strokeStyle = "rgb(214,186,96)"; g.lineWidth = W * 0.9;
  g.beginPath(); g.moveTo(...pt(0, -2.6)); g.lineTo(...pt(0, 2.6)); g.moveTo(...pt(-0.035, 0)); g.lineTo(...pt(0.035, 0)); g.stroke();
  // ใบ (โค้งเล็กน้อย) — สันเทา คมขาว
  g.beginPath(); g.moveTo(...pt(0.02, -0.8));
  g.quadraticCurveTo(...pt(0.55, -1.25), ...pt(1, 0.35));
  g.quadraticCurveTo(...pt(0.55, 0.55), ...pt(0.02, 0.8));
  g.closePath();
  g.fillStyle = "rgb(206,214,226)"; g.fill();
  g.strokeStyle = "rgba(60,70,90,.7)"; g.lineWidth = 1; g.stroke();
  g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = Math.max(1, W * 0.35);
  g.beginPath(); g.moveTo(...pt(0.05, -0.62)); g.quadraticCurveTo(...pt(0.55, -1.05), ...pt(0.98, 0.25)); g.stroke();
  g.restore();
  if (glint >= 0 && glint <= 1) { const [gx, gy] = pt(lerp(0.1, 0.95, glint), -0.5); g.save(); lit(g); sglow(g, gx, gy, W * 6, WHITE, 0.8 * k); twinkle(g, gx, gy, W * 4.5, 0.9 * k); g.restore(); }
}

// ---------- Room: โดมเยื่อบาง (superellipse n = 4 บนสี่เหลี่ยมของ Room) ----------
const SE_N = 56;
const SE = (() => { const out = []; for (let i = 0; i <= SE_N; i++) { const t = (i / SE_N) * TAU, c = Math.cos(t), s = Math.sin(t); out.push([Math.sign(c) * Math.sqrt(Math.abs(c)), Math.sign(s) * Math.sqrt(Math.abs(s))]); } return out; })();
const RINGS = [0.32, 0.6, 0.84];
const HULL_R = [0, 0.3, 0.55, 0.75, 0.88, 0.96, 1];
const okRoom = (r) => !!r && [r.x0, r.y0, r.x1, r.y1].every(Number.isFinite) && r.x1 >= r.x0 && r.y1 >= r.y0;
const roomId = (r) => `${r.owner}|${r.seq}|${r.x0},${r.y0},${r.x1},${r.y1}`;
function roomGeo(r) {
  const X0 = r.x0, Y0 = r.y0, X1 = r.x1 + 1, Y1 = r.y1 + 1, hx = (X1 - X0) / 2, hy = (Y1 - Y0) / 2, mn = Math.min(hx, hy), mx = Math.max(hx, hy);
  const cx = Number.isFinite(r.cx) ? r.cx + 0.5 : (X0 + X1) / 2, cy = Number.isFinite(r.cy) ? r.cy + 0.5 : (Y0 + Y1) / 2;
  return { X0, Y0, X1, Y1, mx: (X0 + X1) / 2, my: (Y0 + Y1) / 2, hx, hy, H: 0.62 * mn + 0.12 * mx, big: mx > 3.4, px: cx, py: cy };
}
const zAt = (G, r) => G.H * Math.sqrt(Math.max(0, 1 - r * r));
// ทิศเข้าหากล้อง (พิกัดกระดาน + สูง) · Colony = ไม่แยกหน้า/หลัง
function camDir() {
  if (customProjection()) return null;
  const a = viewAxes(), p = (pitchOf() * Math.PI) / 180;
  return [a.fx * Math.cos(p), a.fy * Math.cos(p), Math.sin(p)];
}
// จุดบนผิวโดม (a, b = พิกัด superellipse ที่รัศมี r) หันเข้ากล้องไหม
function facing(G, D, a, b, r) {
  if (!D) return true;
  if (r < 0.02) return D[2] > 0;
  const rr = Math.min(r, 0.985), dzdr = (-G.H * rr) / Math.sqrt(1 - rr * rr), r3 = r * r * r;
  const gx = (dzdr * ((a * a * a) / r3)) / G.hx, gy = (dzdr * ((b * b * b) / r3)) / G.hy;
  return -gx * D[0] - gy * D[1] + D[2] > 0;
}
// ตัวฉายภาพที่ย่อรอบจุดหมุน (ฉากกาง/หุบ) · o = { s, px, py, pz } | null
function mkProj(o) {
  if (!o || o.s >= 0.9999) return P;
  const { s, px, py, pz } = o;
  return (x, y, z = 0) => P(px + (x - px) * s, py + (y - py) * s, pz + (z - pz) * s);
}
// เส้นโค้งโดม (วงละติจูด + เส้นเมริเดียน) เฉพาะด้านหน้า/หลัง ลง path (Path2D)
function domeLines(path, G, proj, D, front) {
  for (const r of RINGS) {
    let pen = false;
    const z = zAt(G, r);
    for (let i = 0; i <= SE_N; i++) {
      const a = SE[i][0] * r, b = SE[i][1] * r;
      if (facing(G, D, a, b, r) !== front) { pen = false; continue; }
      const p = proj(G.mx + a * G.hx, G.my + b * G.hy, z);
      if (pen) path.lineTo(p[0], p[1]); else { path.moveTo(p[0], p[1]); pen = true; }
    }
  }
  const M = G.big ? 16 : 12;
  for (let m = 0; m < M; m++) {
    const i = Math.round((m * SE_N) / M) % SE_N;
    let pen = false;
    for (let k = 0; k <= 12; k++) {
      const r = 1 - k / 12, a = SE[i][0] * r, b = SE[i][1] * r;
      if (facing(G, D, a, b, r) !== front) { pen = false; continue; }
      const p = proj(G.mx + a * G.hx, G.my + b * G.hy, zAt(G, r));
      if (pen) path.lineTo(p[0], p[1]); else { path.moveTo(p[0], p[1]); pen = true; }
    }
  }
}
function hullOf(pts) {
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop();
  return lo.concat(up);
}
// เงาโดมบนจอ (เปลือกนูน) + กรอบ
function domeHull(G, proj) {
  const pts = [];
  for (const r of HULL_R) {
    const z = zAt(G, r);
    if (r === 0) { pts.push(proj(G.mx, G.my, z)); continue; }
    for (let i = 0; i < SE_N; i += 2) pts.push(proj(G.mx + SE[i][0] * r * G.hx, G.my + SE[i][1] * r * G.hy, z));
  }
  const hull = hullOf(pts);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of hull) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  return { hull, box: { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 } };
}
const pathPts = (ctx, pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
const polyTo = (path, pts) => { pts.forEach((p, i) => (i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1]))); path.closePath(); };
// เส้นทางทั้งหมดของ Room ในพิกัดตรรกะ (Path2D — Room นิ่งแล้วเก็บไว้ วาดซ้ำทุกเฟรมโดยไม่คำนวณใหม่)
//  o = { dome, floor } พารามิเตอร์ mkProj ของฉากกาง/หุบ (null = เต็ม)
//  ฟิล์มโดมลงสีเฉพาะแถบขอบ (band = เปลือกนอกลบเปลือกใน evenodd) — กลางโดมโปร่งอยู่แล้ว ไม่ต้องลงสีทั้งก้อน (ประหยัด fill-rate ของการ์ดจอ)
function roomPaths(G, o) {
  const proj = mkProj(o && o.dome), fp = mkProj(o && o.floor), D = camDir();
  const floor = new Path2D(), grid = new Path2D(), corners = new Path2D(), base = new Path2D(), back = new Path2D(), front = new Path2D(), hull = new Path2D(), band = new Path2D();
  polyTo(floor, [fp(G.X0, G.Y0, 0.012), fp(G.X1, G.Y0, 0.012), fp(G.X1, G.Y1, 0.012), fp(G.X0, G.Y1, 0.012)]);
  for (let x = G.X0 + 1; x < G.X1; x++) { const a = fp(x, G.Y0, 0.012), b = fp(x, G.Y1, 0.012); grid.moveTo(a[0], a[1]); grid.lineTo(b[0], b[1]); }
  for (let y = G.Y0 + 1; y < G.Y1; y++) { const a = fp(G.X0, y, 0.012), b = fp(G.X1, y, 0.012); grid.moveTo(a[0], a[1]); grid.lineTo(b[0], b[1]); }
  const L = Math.min(0.9, (G.X1 - G.X0) * 0.16);
  for (const [cx0, cy0, sx, sy] of [[G.X0, G.Y0, 1, 1], [G.X1, G.Y0, -1, 1], [G.X1, G.Y1, -1, -1], [G.X0, G.Y1, 1, -1]]) {
    const a = fp(cx0 + sx * L, cy0, 0.014), m = fp(cx0, cy0, 0.014), b = fp(cx0, cy0 + sy * L, 0.014);
    corners.moveTo(a[0], a[1]); corners.lineTo(m[0], m[1]); corners.lineTo(b[0], b[1]);
  }
  for (let i = 0; i <= SE_N; i++) { const p = proj(G.mx + SE[i][0] * G.hx, G.my + SE[i][1] * G.hy, 0.016); if (i) base.lineTo(p[0], p[1]); else base.moveTo(p[0], p[1]); }
  domeLines(back, G, proj, D, false);
  domeLines(front, G, proj, D, true);
  const H0 = domeHull(G, proj), B = H0.box, bx = (B.x0 + B.x1) / 2, by = (B.y0 + B.y1) / 2;
  polyTo(hull, H0.hull);
  polyTo(band, H0.hull);
  polyTo(band, H0.hull.map((p) => [bx + (p[0] - bx) * 0.8, by + (p[1] - by) * 0.84]).reverse());
  // วงละติจูดกลางด้านหน้า (ทางวิ่งของแสงกวาด)
  const ring = [], rr = 0.6, rz = zAt(G, rr);
  for (let i = 0; i <= SE_N; i++) { const a = SE[i][0] * rr, b = SE[i][1] * rr; if (facing(G, D, a, b, rr)) ring.push(proj(G.mx + a * G.hx, G.my + b * G.hy, rz)); }
  return { floor, grid, corners, base, back, front, hull, band, box: B, hullPts: H0.hull, ring };
}
function frontGrad(g, R, pal, flare = 0) {
  const B = R.box, cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2, R0 = Math.max(4, Math.max(B.w, B.h) * 0.56);
  const gr = g.createRadialGradient(cx, cy - B.h * 0.08, R0 * 0.5, cx, cy, R0);
  gr.addColorStop(0, rgba(pal.film, 0.03)); gr.addColorStop(0.45, rgba(pal.film, 0.06));
  gr.addColorStop(0.78, rgba(pal.film, 0.12 + 0.1 * flare)); gr.addColorStop(1, rgba(pal.rimL, 0.24 + 0.2 * flare));
  return gr;
}
// ชั้นหลัง (ใต้ไฮไลต์/ตัวละคร): ฟิล์มบนพื้นสี่เหลี่ยม + ตาราง + ขอบเรือง + มุม + วงฐานโดม + เส้นโดมด้านหลัง · k = ความทึบ · flare = สว่างขึ้น (ฉากกาง)
function paintBack(g, R, pal, k, flare, lowQ) {
  g.save(); g.lineJoin = "round"; g.lineCap = "round";
  g.fillStyle = rgba(pal.film, (0.1 + 0.08 * flare) * k); g.fill(R.floor);
  g.strokeStyle = rgba(pal.rim, (0.16 + 0.2 * flare) * k); g.lineWidth = 7; g.stroke(R.floor);
  g.strokeStyle = rgba(pal.rim, (0.42 + 0.3 * flare) * k); g.lineWidth = 2.4; g.stroke(R.floor);
  g.strokeStyle = rgba(WHITE, (0.45 + 0.4 * flare) * k); g.lineWidth = 1; g.stroke(R.floor);
  if (!lowQ) { g.strokeStyle = rgba(pal.rim, 0.1 * k); g.stroke(R.grid); }
  g.strokeStyle = rgba(pal.rimL, (0.75 + 0.25 * flare) * k); g.lineWidth = 2.6; g.stroke(R.corners);
  g.strokeStyle = rgba(pal.rim, (0.5 + 0.3 * flare) * k); g.lineWidth = 2; g.stroke(R.base);
  g.strokeStyle = rgba(pal.film, (0.2 + 0.2 * flare) * k); g.lineWidth = 1; g.stroke(R.back);
  g.restore();
}
// ชั้นหน้า (ทับตัวละคร): แถบฟิล์มขอบโดม + เส้นโดมด้านหน้า + ขอบเรือง + แสงสะท้อน
function paintFront(g, R, pal, k, flare, grad) {
  const B = R.box;
  if (!(B.w > 2)) return;
  g.save(); g.lineJoin = "round"; g.lineCap = "round";
  g.globalAlpha *= k;
  g.fillStyle = grad; g.fill(R.band, "evenodd");
  g.strokeStyle = rgba(pal.filmL, 0.24 + 0.25 * flare); g.lineWidth = 1; g.stroke(R.front);
  g.strokeStyle = rgba(pal.rim, 0.2 + 0.35 * flare); g.lineWidth = 6 + 6 * flare; g.stroke(R.hull);
  g.strokeStyle = rgba(WHITE, 0.55 + 0.4 * flare); g.lineWidth = 1.4 + flare; g.stroke(R.hull);
  lit(g);
  sglow(g, B.x0 + B.w * 0.3, B.y0 + B.h * 0.22, B.w * 0.11, WHITE, 0.14);
  sglow(g, B.x0 + B.w * 0.25, B.y0 + B.h * 0.3, B.w * 0.04, WHITE, 0.35);
  g.restore();
}
// สีของ Room: ฟ้าใสของลอว์ผสมสีประจำตัวเล็กน้อย
const PAL = new Map();
function palOf(color) {
  const c = normColor(color || "#5aa8ff");
  let p = PAL.get(c);
  if (!p) { const rgb = rgbOf(c); p = { id: c, film: mixRgb(FILM, rgb, 0.12), filmL: mixRgb(FILM_L, rgb, 0.08), rim: mixRgb(RIM, rgb, 0.28), rimL: mixRgb(RIM_L, rgb, 0.15) }; PAL.set(c, p); }
  return p;
}
// ฉากกาง: seq ใหม่ที่ไม่เคยเห็น = เริ่มกางตอนเห็นครั้งแรก (หรือเวลาเหตุการณ์ roomOpen ถ้ามาก่อน) · เฟรมแรกของโมดูล = Room ที่มีอยู่แล้วไม่กางซ้ำ
const SEEN = new Map();
const LAST_ROOM = new Map(); // owner → Room ล่าสุด (ฉากหุบที่ payload ไม่มี room — sever)
let synced = false;
function openOf(r, fx, now) {
  const id = roomId(r);
  let t0 = SEEN.get(id);
  if (t0 === undefined) { t0 = synced ? now : -1e9; SEEN.set(id, t0); if (SEEN.size > 60) SEEN.delete(SEEN.keys().next().value); }
  for (const e of fx) if (e.kind === "lawRoomOpen" && e.room && e.room.seq === r.seq && (e.id == null || e.id === r.owner) && e.t0 < t0) { t0 = e.t0; SEEN.set(id, t0); }
  return clamp01((now - t0) / ROOM_GROW);
}
// Room นิ่งแล้ว: อบเป็นภาพ 2 ชั้น (หลัง/หน้า) ต่อ Room — อบใหม่เมื่อมุมกล้อง/ขนาดกระดาน/ความละเอียด/สีเปลี่ยน (คีย์ = จุดฉายของมุม Room)
//  วาดทุกเฟรม = drawImage 2 ครั้ง (ถูกสุดบนการ์ดจอ) · ห้าม clip/เติม path ใหญ่ทุกเฟรม — วัดแล้วกระตุกที่ DPR 2
const ROOM_C = new Map();
const q4 = (p) => `${Math.round(p[0] * 4)},${Math.round(p[1] * 4)}`;
function resOf(g) {
  let k = 1;
  try { const m = g.getTransform(); k = Math.hypot(m.a, m.b); } catch { k = 1; }
  return Math.max(1, Math.min(2, Math.ceil(k * 2) / 2));
}
function roomCache(r, G, pal, g, now) {
  const id = roomId(r);
  let e = ROOM_C.get(id);
  if (!e) {
    e = { key: "", R: null, back: null, front: null, bx: 0, by: 0, bw: 1, bh: 1, used: now, phase: (strHash(id) % 100) / 100 };
    ROOM_C.set(id, e);
    if (ROOM_C.size > 4) for (const [k2, v] of ROOM_C) if (k2 !== id && now - v.used > 4000) ROOM_C.delete(k2);
  }
  e.used = now;
  const res = resOf(g), key = `${q4(P(G.X0, G.Y0, 0))}|${q4(P(G.X1, G.Y1, 0))}|${q4(P(G.mx, G.my, G.H))}|${pal.id}|${res}`;
  if (e.key === key) return e;
  e.key = key;
  const R = (e.R = roomPaths(G, null));
  let x0 = R.box.x0, y0 = R.box.y0, x1 = R.box.x1, y1 = R.box.y1;
  for (const [x, y] of [[G.X0, G.Y0], [G.X1, G.Y0], [G.X1, G.Y1], [G.X0, G.Y1]]) { const p = P(x, y, 0); x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const pad = 12;
  e.bx = x0 - pad; e.by = y0 - pad; e.bw = x1 - x0 + pad * 2; e.bh = y1 - y0 + pad * 2;
  const rs = Math.min(res, Math.sqrt(3.2e6 / Math.max(1, e.bw * e.bh)));
  const W = Math.max(2, Math.ceil(e.bw * rs)), H = Math.max(2, Math.ceil(e.bh * rs));
  if (!e.back) { e.back = document.createElement("canvas"); e.front = document.createElement("canvas"); }
  for (const [cv, paint] of [[e.back, (c) => paintBack(c, R, pal, 1, 0, false)], [e.front, (c) => paintFront(c, R, pal, 1, 0, frontGrad(c, R, pal, 0))]]) {
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const c = cv.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    c.setTransform(rs, 0, 0, rs, -e.bx * rs, -e.by * rs);
    paint(c);
  }
  return e;
}
const blit = (g, cv, e, k) => { const ga = g.globalAlpha; g.globalAlpha = ga * k; g.drawImage(cv, e.bx, e.by, e.bw, e.bh); g.globalAlpha = ga; };
// ฉากกาง/หุบ: ย่อขยายภาพอบรอบจุด (px, py) บนจอ (ฉากกาง = ฝ่ามือลอว์ · ฉากหุบ = กลางโดม) · flare = ซ้อนแบบบวกแสง (ขอบสว่างขึ้น)
//  ไม่วาดเวกเตอร์ระหว่างฉาก (ถูกกว่า + ไม่กระตุกตอนเริ่ม)
function blitRoom(g, cv, e, px, py, s, k, flare = 0) {
  if (s <= 0.01 || k <= 0.01) return;
  const ga = g.globalAlpha, x = px + (e.bx - px) * s, y = py + (e.by - py) * s, w = e.bw * s, h = e.bh * s;
  g.globalAlpha = ga * Math.min(1, k); g.drawImage(cv, x, y, w, h);
  if (flare > 0.02) { const op = g.globalCompositeOperation; g.globalCompositeOperation = "lighter"; g.globalAlpha = ga * Math.min(1, flare * 0.8); g.drawImage(cv, x, y, w, h); g.globalCompositeOperation = op; }
  g.globalAlpha = ga;
}
const palmOf = (G) => P(G.px, G.py, 1.35);
const roomsOf = (law) => (law && Array.isArray(law.rooms) ? law.rooms : null);
function syncRooms(law) {
  const rooms = roomsOf(law);
  if (rooms) for (const r of rooms) if (okRoom(r)) { LAST_ROOM.set(r.owner, r); if (!synced && !SEEN.has(roomId(r))) SEEN.set(roomId(r), -1e9); }
  synced = true;
}
const roomAlpha = (now, lowQ) => (lowQ || REDUCED ? 1 : 0.9 + 0.1 * Math.sin(now / 1300));

// อุ่นเครื่องครั้งเดียวเมื่อมีลอว์ในเกม (law.present): วาดทุกชิ้นลงแคนวาสเล็กแล้ววาดลงจอแบบมองไม่เห็น
//  — การ์ดจอคอมไพล์ shader ของ gradient/เส้น/บวกแสงตอนกระดานโหลด ไม่ใช่กลางฉากกาง Room ครั้งแรก (วัดแล้วกระตุก ~200 ms)
let warmed = false;
function prewarm(g) {
  warmed = true;
  try {
    // ขนาดจริง (path ใหญ่/เล็กใช้ตัววาดคนละแบบในการ์ดจอ) — Room 9×9 กลางกระดานลงแคนวาส 1024×640 ตามพิกัดตรรกะ
    const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 640;
    const c = cv.getContext("2d");
    c.setTransform(0.8, 0, 0, 0.8, 0, 0);
    const G = roomGeo({ x0: 2, y0: 2, x1: 10, y1: 10, cx: 6, cy: 6, size: 9 }), R = roomPaths(G, null), pal = palOf("#3a7bd5");
    paintBack(c, R, pal, 1, 0, false); paintFront(c, R, pal, 1, 0, frontGrad(c, R, pal, 0));
    stoneCube(c, 4.5, 4.5, OBJ_FLOAT, OBJ_E, OBJ_E, 0.3, 1, objGeo("warm"));
    drawLawRock(c, 7, 7, { live: true });
    c.setTransform(1, 0, 0, 1, 0, 0);
    heartCube(c, 40, 40, 14, 1); incision(c, 120, 120, -0.6, 60, 1, 1, 1.5); energyBlade(c, 20, 200, 120, 140, 6, 1); zap(c, 10, 10, 200, 60, 7, 1, 1.4);
    kikoku(c, 60, 300, -0.5, 120, 1, 0.5); arcBand(c, 200, 200, 80, -1, 1, 20, 1, CYAN_D, CYAN); ghostHand(c, 300, 300, 0, 50, 1); twinkle(c, 400, 60, 20, 1);
    // ท่อชิ้นส่วนมาร์ก: clip + วาดภาพ + เส้นแบบ source-atop
    c.save(); pathPts(c, [[500, 100], [700, 120], [650, 300]]); c.clip(); c.drawImage(cv, 0, 0, 200, 120, 500, 100, 200, 200); c.restore();
    c.globalCompositeOperation = "source-atop"; c.strokeStyle = rgba(CYAN, 0.75); c.lineWidth = 6; c.beginPath(); c.moveTo(500, 100); c.lineTo(650, 300); c.stroke(); c.globalCompositeOperation = "source-over";
    g.save(); g.globalAlpha = 0.003; g.drawImage(cv, 0, 0, 1, 1); g.restore();
  } catch { /* ไม่สำคัญ */ }
}
// พื้น Room + ด้านหลังโดม (ใต้ไฮไลต์) — เรียกทุกเฟรมได้ (ไม่มี Room = จบทันที)
export function drawLawGround(g, law, fx, now, lowQ) {
  if (!warmed && law && law.present) prewarm(g);
  syncRooms(law);
  const rooms = roomsOf(law);
  if (!rooms || !rooms.length) return;
  for (const r of rooms) {
    if (!okRoom(r)) continue;
    const G = roomGeo(r), pal = palOf(r.color), u = openOf(r, fx || [], now), e = roomCache(r, G, pal, g, now);
    if (u < 1) { const pv = palmOf(G); blitRoom(g, e.back, e, pv[0], pv[1], Math.max(0.02, easeOut3(u)), 0.6 + 0.4 * u, 1 - u); continue; }
    blit(g, e.back, e, roomAlpha(now, lowQ));
  }
}
function drawRoomFront(g, rooms, fx, now, lowQ) {
  for (const r of rooms) {
    if (!okRoom(r)) continue;
    const G = roomGeo(r), pal = palOf(r.color), u = openOf(r, fx, now), e = roomCache(r, G, pal, g, now);
    if (u < 1) { const pv = palmOf(G); blitRoom(g, e.front, e, pv[0], pv[1], Math.max(0.02, easeOut3(u)), 0.6 + 0.4 * u, 1 - u); continue; }
    const k = roomAlpha(now, lowQ);
    blit(g, e.front, e, k);
    if (lowQ || REDUCED) continue;
    // ประกายวิ่ง: จุดแสง 2 จุดวิ่งตามขอบโดม + แสงกวาดตามวงละติจูดด้านหน้า (สไปรต์เล็ก — ไม่ clip)
    g.save(); lit(g);
    const hp = e.R.hullPts, n = hp.length;
    if (n > 2) for (let j = 0; j < 2; j++) {
      const f = ((now / 5200 + e.phase + j * 0.5) % 1) * n, i = Math.floor(f) % n, q = f - Math.floor(f), A = hp[i], C = hp[(i + 1) % n];
      sglow(g, lerp(A[0], C[0], q), lerp(A[1], C[1], q), 22, pal.rimL, 0.55 * k);
    }
    const rg = e.R.ring, m = rg.length;
    if (m > 3) {
      const head = ((now / 3600 + e.phase) % 1.6) * m;
      for (let j = 0; j < 5; j++) {
        const f = head - j * m * 0.035, i = Math.floor(f);
        if (i < 0 || i >= m - 1) continue;
        const q = f - i;
        sglow(g, lerp(rg[i][0], rg[i + 1][0], q), lerp(rg[i][1], rg[i + 1][1], q), 16 - j * 2, pal.filmL, (0.4 - j * 0.07) * k);
      }
    }
    g.restore();
  }
}

// ---------- วัตถุลอย (ลูกบาศก์หินที่ตัดจากพื้น) ----------
const CUBE_C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const OBJ_E = 0.27;              // ครึ่งความกว้างลูกบาศก์ (ช่อง)
const OBJ_FLOAT = 0.86, OBJ_HIGH = 1.95; // ความสูงลอย (ช่องว่าง / มีคนยืนช่องเดียวกัน — ลอยเหนือหัว)
const OBJ_GEO = new Map();
function objGeo(id) {
  let o = OBJ_GEO.get(id);
  if (!o) {
    const rnd = rngOf(strHash(`obj|${id}`) + 7);
    o = { yaw: rnd() * TAU, ph: rnd() * TAU, strata: [0.3 + rnd() * 0.12, 0.62 + rnd() * 0.14], jag: [rnd() - 0.5, rnd() - 0.5], specks: [[rnd(), rnd()], [rnd(), rnd()], [rnd(), rnd()], [rnd(), rnd()]] };
    OBJ_GEO.set(id, o);
    if (OBJ_GEO.size > 80) OBJ_GEO.delete(OBJ_GEO.keys().next().value);
  }
  return o;
}
const bil = (P00, P10, P01, P11, u, v) => [lerp(lerp(P00[0], P10[0], u), lerp(P01[0], P11[0], u), v), lerp(lerp(P00[1], P10[1], u), lerp(P01[1], P11[1], u), v)];
// ลูกบาศก์หิน กลาง (cx, cy) สูงกลาง cz · e = ครึ่งกว้าง · ez = ครึ่งสูง · yaw = หมุนรอบแกนตั้ง
function stoneCube(g, cx, cy, cz, e, ez, yaw, k, geo, { lowQ = false, edge = 0.6, under = 0.25, shadow = true } = {}) {
  if (k <= 0.01 || e <= 0.01) return;
  const c = Math.cos(yaw), s = Math.sin(yaw), B = [], T = [];
  for (let i = 0; i < 4; i++) {
    const dx = CUBE_C[i][0] * e, dy = CUBE_C[i][1] * e, X = cx + dx * c - dy * s, Y = cy + dx * s + dy * c;
    B.push(P(X, Y, cz - ez)); T.push(P(X, Y, cz + ez));
  }
  g.save(); g.globalAlpha *= k; g.lineJoin = "round";
  // เงาบนพื้น + แสงฟ้าใต้ก้อน
  if (shadow) cubeShadow(g, cx, cy, Math.max(0, cz - ez), e, under);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    if (sarea3(B[i], B[j], T[j]) <= 0) continue;
    const nx0 = (CUBE_C[i][0] + CUBE_C[j][0]) / 2, ny0 = (CUBE_C[i][1] + CUBE_C[j][1]) / 2, nx = nx0 * c - ny0 * s, ny = nx0 * s + ny0 * c;
    const L = 0.8 + 0.22 * (-0.6 * nx - 0.8 * ny);
    g.beginPath(); g.moveTo(B[i][0], B[i][1]); g.lineTo(B[j][0], B[j][1]); g.lineTo(T[j][0], T[j][1]); g.lineTo(T[i][0], T[i][1]); g.closePath();
    g.fillStyle = shade(STONE, L); g.fill();
    if (!lowQ && geo) {
      // ชั้นหิน 2 เส้น (เกาะหน้าลูกบาศก์ — ไม่ลอยตามจอ)
      g.strokeStyle = `rgba(60,52,44,${0.45})`; g.lineWidth = 1;
      g.beginPath();
      for (let si = 0; si < 2; si++) {
        const v = geo.strata[si], a = bil(B[i], B[j], T[i], T[j], 0, v), m = bil(B[i], B[j], T[i], T[j], 0.5, v + geo.jag[si] * 0.12), b = bil(B[i], B[j], T[i], T[j], 1, v);
        g.moveTo(a[0], a[1]); g.lineTo(m[0], m[1]); g.lineTo(b[0], b[1]);
      }
      g.stroke();
      g.beginPath(); g.moveTo(B[i][0], B[i][1]); g.lineTo(B[j][0], B[j][1]); g.lineTo(T[j][0], T[j][1]); g.lineTo(T[i][0], T[i][1]); g.closePath();
    }
    g.strokeStyle = rgba(CYAN, edge); g.lineWidth = 1.1; g.stroke();
  }
  // หน้าบน = ผิวพื้นเดิม (สว่าง + กรอบช่องจาง + จุดหิน)
  g.beginPath(); g.moveTo(T[0][0], T[0][1]); for (let i = 1; i < 4; i++) g.lineTo(T[i][0], T[i][1]); g.closePath();
  g.fillStyle = shade(STONE_L, 1); g.fill();
  g.strokeStyle = rgba(CYAN, edge); g.lineWidth = 1.2; g.stroke();
  if (!lowQ && geo) {
    const a = bil(T[0], T[1], T[3], T[2], 0.18, 0.18), b = bil(T[0], T[1], T[3], T[2], 0.82, 0.18), cc = bil(T[0], T[1], T[3], T[2], 0.82, 0.82), d = bil(T[0], T[1], T[3], T[2], 0.18, 0.82);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(cc[0], cc[1]); g.lineTo(d[0], d[1]); g.closePath();
    g.strokeStyle = "rgba(255,255,255,.28)"; g.lineWidth = 1; g.stroke();
    g.fillStyle = "rgba(80,72,62,.5)";
    for (const [u, v] of geo.specks) { const p = bil(T[0], T[1], T[3], T[2], 0.1 + u * 0.8, 0.1 + v * 0.8); g.fillRect(p[0] - 1, p[1] - 0.6, 2, 1.2); }
  }
  g.restore();
}
// เงาบนพื้น + แสงฟ้าใต้ก้อน (สไปรต์ — ไม่ขยับตามการลอยขึ้นลง)
function cubeShadow(g, cx, cy, lift, e, under) {
  const f = P(cx, cy, 0.01), sq = Math.abs(P(cx, cy + 0.5, 0.01)[1] - f[1]) / (f[2] * 0.5 || 1);
  const rx = f[2] * e * 1.5 * (1 - Math.min(0.45, lift * 0.18));
  sglowE(g, f[0], f[1], rx, rx * Math.max(0.3, sq), "0,0,0", 0.42 * (1 - Math.min(0.6, lift * 0.25)));
  if (under > 0.01 && lift > 0.05) { g.save(); lit(g); sglowE(g, f[0], f[1], f[2] * 0.42, f[2] * 0.42 * Math.max(0.3, sq), CYAN, under); g.restore(); }
}
// ลูกบาศก์ลอยที่ค้าง (ไม่มีฉาก): ภาพอบที่ความสูงลอยปกติ · ลอยขึ้นลง = เลื่อนภาพตามแนวตั้งของจอ
function cubeBaked(g, o, geo, zf, lowQ) {
  const cx = o.x + 0.5, cy = o.y + 0.5, c0 = P(cx, cy, OBJ_FLOAT), res = bakeRes(g);
  const key = `cube|${o.id}|${q4(c0)}|${q4(P(cx + OBJ_E, cy, OBJ_FLOAT))}|${res}|${lowQ ? 1 : 0}`;
  const r = c0[2] * OBJ_E * 2.4;
  const e = baked(key, c0[0] - r, c0[1] - r * 1.15, r * 2, r * 2.3, res, (c) => stoneCube(c, cx, cy, OBJ_FLOAT, OBJ_E, OBJ_E, geo.yaw, 1, geo, { lowQ, shadow: false }));
  cubeShadow(g, cx, cy, zf - OBJ_E, OBJ_E, 0.25);
  blitB(g, e, 0, P(cx, cy, zf)[1] - c0[1]);
}
// ความสูงลอยแบบนุ่ม (มีคนเดินเข้าช่อง = ลอยขึ้นเหนือหัว)
const OBJ_Z = new Map();
function objZ(id, want, now) {
  let z = OBJ_Z.get(id);
  if (!z) { z = { z: want, t: now }; OBJ_Z.set(id, z); if (OBJ_Z.size > 80) OBJ_Z.delete(OBJ_Z.keys().next().value); }
  const dt = Math.max(0, Math.min(200, now - z.t));
  z.z += (want - z.z) * (1 - Math.exp(-dt / 160)); z.t = now;
  return z.z;
}
// ฉากตัดพื้น: ก้อนโผล่จากพื้นแล้วลอยขึ้น — ms ตั้งแต่เริ่มฉากของก้อน id (null = ไม่มีฉาก)
function cutAge(fx, id, now) {
  if (!Array.isArray(fx)) return null;
  for (const e of fx) if (e.kind === "lawCut" && e.obj && e.obj.id === id) return now - e.t0;
  return null;
}
const thrown = (fx, id) => { if (!Array.isArray(fx)) return false; for (const e of fx) if (e.kind === "lawThrow" && Array.isArray(e.objects) && e.objects.some((o) => o && o.id === id)) return true; return false; };
const CUT_UP = 300, CUT_SHOW = 450, CUT_END = 720;
function drawObject(g, o, units, fx, now, lowQ) {
  const geo = objGeo(o.id), still = lowQ || REDUCED;
  let occ = false;
  if (Array.isArray(units)) for (const u of units) { if (!u || u.corpse) continue; const n = Math.max(1, u.size | 0); if (o.x >= u.rx - 0.5 && o.x < u.rx + n - 0.5 && o.y >= u.ry - 0.5 && o.y < u.ry + n - 0.5) { occ = true; break; } }
  const zf = objZ(o.id, occ ? OBJ_HIGH : OBJ_FLOAT, now) + (still ? 0 : 0.06 * Math.sin(now / 820 + geo.ph));
  const yaw = geo.yaw;
  const age = cutAge(fx, o.id, now), cx = o.x + 0.5, cy = o.y + 0.5;
  if (age != null && age < CUT_END) {
    if (age < CUT_UP) return;
    if (age < CUT_SHOW) { const h = OBJ_E * easeOut3((age - CUT_UP) / (CUT_SHOW - CUT_UP)); stoneCube(g, cx, cy, h, OBJ_E, Math.max(0.01, h), 0, 1, geo, { lowQ, under: 0 }); return; }
    const u = easeOutBack(clamp01((age - CUT_SHOW) / (CUT_END - CUT_SHOW)));
    stoneCube(g, cx, cy, lerp(OBJ_E, zf, u), OBJ_E, OBJ_E, lerp(0, yaw, clamp01(u)), 1, geo, { lowQ, edge: 0.6 + 0.4 * (1 - clamp01(u)) });
    return;
  }
  if (canBake()) cubeBaked(g, o, geo, zf, lowQ);
  else stoneCube(g, cx, cy, zf, OBJ_E, OBJ_E, yaw, 1, geo, { lowQ });
}
// ---------- มาร์ก = ร่างถูกตัดเป็นชิ้นลอยแยก (Amputate) ----------
//  ตีปกติของลอว์โดน (lawSlash ปะทะ · lawGamma/lawMess จบท่า) → ร่างเป้าแยกเป็น 3–4 ชิ้นลอยห่างกัน (ขอบรอยตัดเรืองฟ้า) ค้างตลอดที่อยู่ใน board.law.marks
//  → เหตุการณ์ unmark (จบตาเดินของลอว์) = ชิ้นลอยกลับมาต่อกัน + รอยต่อวาบ · มาร์กหายจาก state เฉยๆ (ซิงก์ใหม่/ตาย) = ต่อกลับเงียบๆ
//  ชิ้นส่วน = ภาพอบครั้งเดียวต่อการตัด (วาดหมากลงแคนวาส → ตัดตามเส้นลงแคนวาสต่อชิ้น) · ทุกเฟรม = drawImage ชิ้นละครั้ง ตามตำแหน่งตัวปัจจุบัน
//  ตัวที่ถูกตัด: boardDraw วาดหมากแบบ lawCut (ซ่อนตัวหมาก แต่แถบเลือด/ชื่อ/เป้าเล็ง/กล่องคลิกยังอยู่)
const SLASH_HIT = Math.round(LAW_MS.lawSlash * LAW_HIT_P.lawSlash);
const SL_OUT = 170, SL_JOIN = 380, SL_FLASH = 300, SL_GRACE = 1300;
const SLICES = new Map();    // id → { t0, tj (เริ่มต่อกลับ · 0 = ยังแยก), flash, S (ภาพอบ) }
const MARK_SEEN = new Map(); // id → เวลาที่เห็นในมาร์กครั้งแรก (รอฉากตีมาก่อนค่อยตัดเอง)
// เป้าของฉากตีลอว์ (fx.tid จาก BoardStage · ไม่มี = หาจากช่อง)
function styleTarget(e, units) {
  if (e._tid !== undefined) return e._tid;
  let id = null;
  if (e.tid != null) id = e.tid;
  else if (okT(e.to) && Array.isArray(units)) for (const u of units) if (u && !u.corpse && u.id !== e.by && Math.round(u.rx) === e.to.x && Math.round(u.ry) === e.to.y) { id = u.id; break; }
  e._tid = id;
  return id;
}
// เวลาที่ฉากตีลอว์ตัดเป้า id (null = ไม่มีฉาก) + ทิศ
function claimOf(fx, id, units) {
  for (const e of fx) {
    if (!(e.kind in LAW_MS) || e.dodge || styleTarget(e, units) !== id) continue;
    return { at: e.t0 + (e.kind === "lawSlash" ? SLASH_HIT : LAW_MS[e.kind]), side: okT(e.to) && e.to.x < e.x ? -1 : 1 };
  }
  return null;
}
function unmarkAt(fx, id) {
  for (const e of fx) if (e.kind === "lawUnmark" && Array.isArray(e.ids) && e.ids.includes(id)) return e.t0;
  return null;
}
// ตัดรูปหลายเหลี่ยมนูนด้วยเส้น (จุด p ทิศ d) → [ซ้าย, ขวา]
function splitPoly(poly, p, d) {
  const L = [], R = [], sd = (q) => d[0] * (q[1] - p[1]) - d[1] * (q[0] - p[0]);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], sa = sd(a), sb = sd(b);
    if (sa >= 0) L.push(a); if (sa <= 0) R.push(a);
    if ((sa > 0 && sb < 0) || (sa < 0 && sb > 0)) { const t = sa / (sa - sb), q = [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; L.push(q); R.push(q); }
  }
  return [L, R];
}
const polyArea = (P0) => { let s = 0; for (let i = 0; i < P0.length; i++) { const a = P0[i], b = P0[(i + 1) % P0.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
// อบชิ้นส่วนจากหมากที่ตำแหน่งปัจจุบัน (ไม่ลอย ไม่มีแถบ) · side = ทิศฟัน (เส้นเฉียงตามทิศ)
function sliceBake(g, u, side, redraw) {
  const n = Math.max(1, u.size | 0), B = bodyAt(u.rx + (u.ox || 0), u.ry + (u.oy || 0), n, 0), s = B.s, big = Math.max(B.K, n * 0.85);
  const hw = s * Math.max(0.72 * B.K, 0.65 * n), x0 = B.bx - hw, y0 = B.by - s * 1.42 * big, w = hw * 2, h = B.by + s * 0.38 * Math.max(1, n * 0.6) - y0;
  const res = bakeRes(g), W = Math.max(2, Math.ceil(w * res)), H = Math.max(2, Math.ceil(h * res));
  const cap = document.createElement("canvas"); cap.width = W; cap.height = H;
  const cc = cap.getContext("2d");
  cc.setTransform(res, 0, 0, res, -x0 * res, -y0 * res);
  try { redraw(cc, { ...u, lawCut: false, noBar: true, isActor: false, isMe: false, reticle: null, hovered: false, hitT: 0, alpha: 1, ox: 0, oy: 0, hz: 0, sq: 0, cloak: false }); } catch { /* วาดไม่ได้ = ชิ้นว่าง */ }
  const a1 = -0.55 * side, a2 = 0.22 * side;
  const lines = [{ p: [B.bx, B.hy], d: [Math.cos(a1), Math.sin(a1)] }, { p: [B.bx, B.hy + B.r * 0.42], d: [Math.cos(a2), Math.sin(a2)] }];
  let polys = [[[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]]];
  for (const ln of lines) polys = polys.flatMap((pl) => splitPoly(pl, ln.p, ln.d)).filter((pl) => pl.length >= 3 && polyArea(pl) > 20);
  const ctr = [B.bx, B.hy + B.r * 0.15], onLine = (q) => lines.some((ln) => Math.abs(ln.d[0] * (q[1] - ln.p[1]) - ln.d[1] * (q[0] - ln.p[0])) < 0.6);
  const pieces = polys.map((pl, i) => {
    let cx = 0, cy = 0; for (const q of pl) { cx += q[0]; cy += q[1]; } cx /= pl.length; cy /= pl.length;
    const dx = cx - ctr[0], dy = cy - ctr[1], L = Math.hypot(dx, dy) || 1, off = s * 0.15 * (n > 1 ? 1.3 : 1);
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const c = cv.getContext("2d");
    c.setTransform(res, 0, 0, res, -x0 * res, -y0 * res);
    c.save(); pathPts(c, pl); c.clip(); c.drawImage(cap, x0, y0, w, h); c.restore();
    // ขอบรอยตัดเรืองฟ้า (อบติดชิ้น)
    c.beginPath();
    for (let k = 0; k < pl.length; k++) { const a = pl[k], b = pl[(k + 1) % pl.length]; if (onLine(a) && onLine(b)) { c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } }
    // source-atop = เรืองเฉพาะบนเนื้อชิ้น (ไม่ลากเส้นในที่ว่างรอบหมาก)
    c.lineCap = "round"; c.globalCompositeOperation = "source-atop";
    c.strokeStyle = rgba(CYAN, 0.75); c.lineWidth = 6; c.stroke();
    c.strokeStyle = rgba(CUT, 1); c.lineWidth = 2; c.stroke();
    return { cv, cx, cy, ox: (dx / L) * off, oy: (dy / L) * off * 0.85, rot: (i % 2 ? 1 : -1) * (0.05 + 0.02 * i), ph: i * 1.9 };
  });
  return { x0, y0, w, h, bx: B.bx, by: B.by, s, pieces, lines };
}
const EMPTY_LIST = [];
// อัปเดตสถานะชิ้นส่วนทุกเฟรม (ก่อนวาดตัวละคร) · คืน Map ของตัวที่วาดเป็นชิ้น (boardDraw ซ่อนตัวหมากของ id เหล่านี้) หรือ null
export function lawSliced(law, units, fx, now, g, redraw) {
  const marks = law && Array.isArray(law.marks) ? law.marks : EMPTY_LIST, list = fx || EMPTY_LIST;
  for (const m of marks) if (m && !MARK_SEEN.has(m.id)) MARK_SEEN.set(m.id, now);
  for (const id of MARK_SEEN.keys()) if (!marks.some((m) => m && m.id === id)) MARK_SEEN.delete(id);
  // เริ่มตัด: ฉากตีถึงจังหวะ / มาร์กที่ไม่มีฉากตี (ซิงก์ใหม่) รอ SL_GRACE ก่อน
  for (const m of marks) {
    const id = m && m.id;
    if (id == null || SLICES.has(id) || unmarkAt(list, id) != null) continue;
    const u = findUnit(units, id);
    if (!u) continue;
    const cl = claimOf(list, id, units);
    if (cl ? now < cl.at : now - MARK_SEEN.get(id) < SL_GRACE) continue;
    SLICES.set(id, { t0: cl ? cl.at : now, tj: 0, flash: false, S: sliceBake(g, u, cl ? cl.side : 1, redraw) });
  }
  for (const [id, sl] of SLICES) {
    if (!findUnit(units, id)) { SLICES.delete(id); continue; }
    const un = unmarkAt(list, id);
    if (un != null && !sl.flash) { sl.flash = true; sl.tj = sl.tj ? Math.min(sl.tj, un) : un; }
    if (!sl.tj && !marks.some((m) => m && m.id === id)) sl.tj = now;
    if (sl.tj && now - sl.tj > SL_JOIN + SL_FLASH) SLICES.delete(id);
  }
  return SLICES.size ? SLICES : null;
}
function drawSlice(g, sl, u, now, lowQ) {
  const S = sl.S, n = Math.max(1, u.size | 0), B = bodyAt(u.rx + (u.ox || 0), u.ry + (u.oy || 0), n, 0), k = B.s / S.s, still = lowQ || REDUCED;
  let a = easeOut3(clamp01((now - sl.t0) / SL_OUT));
  if (sl.tj) a *= 1 - easeInOut(clamp01((now - sl.tj) / SL_JOIN));
  g.save();
  if (u.alpha != null) g.globalAlpha *= u.alpha;
  g.translate(B.bx, B.by - (u.hz || 0) * B.s * 0.85); g.scale(k, k); g.translate(-S.bx, -S.by);
  if (!lowQ && a > 0.05) { g.save(); lit(g); sglow(g, S.bx, S.by - S.s * 0.86, S.s * 0.5, CYAN, 0.28 * a); g.restore(); }
  for (const pc of S.pieces) {
    const bob = still ? 0 : Math.sin(now / 650 + pc.ph) * S.s * 0.025 * a, rot = still ? pc.rot * a * 0.5 : pc.rot * a + Math.sin(now / 900 + pc.ph) * 0.025 * a;
    g.save();
    g.translate(pc.cx + pc.ox * a, pc.cy + pc.oy * a + bob);
    if (rot) g.rotate(rot);
    g.translate(-pc.cx, -pc.cy);
    g.drawImage(pc.cv, S.x0, S.y0, S.w, S.h);
    g.restore();
  }
  // ต่อกลับ: รอยต่อวาบตามเส้นตัด
  if (sl.tj && sl.flash) {
    const kf = env(now - sl.tj, SL_JOIN * 0.7, SL_JOIN, SL_JOIN + 60, SL_JOIN + SL_FLASH);
    if (kf > 0) for (const ln of S.lines) incision(g, ln.p[0], ln.p[1], Math.atan2(ln.d[1], ln.d[0]), S.s * 0.75 * Math.max(1, n * 0.7), kf, 1, 0);
    if (kf > 0) { g.save(); lit(g); sglow(g, S.bx, S.by - S.s * 0.86, S.s * 0.8, CUT, 0.55 * kf); g.restore(); }
  }
  g.restore();
}
// วัตถุลอย + ร่างที่ถูกตัด (มาร์ก) เรียงความลึกกับตัวละคร
export function lawItems(items, g, law, units, fx, now, lowQ) {
  if (SLICES.size) for (const [id, sl] of SLICES) {
    const u = findUnit(units, id);
    if (!u) continue;
    const n = Math.max(1, u.size | 0);
    items.push({ d: depthOf(u.rx + n / 2 + (u.ox || 0), u.ry + n / 2 + (u.oy || 0)) - 0.0004, f: () => drawSlice(g, sl, u, now, lowQ) });
  }
  const objs = law && Array.isArray(law.objects) ? law.objects : null;
  if (!objs || !objs.length) return;
  for (const o of objs) {
    if (!okT(o) || thrown(fx, o.id)) continue;
    items.push({ d: depthOf(o.x + 0.5, o.y + 0.5) + 0.03, f: () => drawObject(g, o, units, fx, now, lowQ) });
  }
}

// ---------- หนามหิน Takt ----------
const ROCK_GEO = new Map();
function rockGeo(x, y) {
  const k = `${x},${y}`;
  let o = ROCK_GEO.get(k);
  if (!o) {
    const rnd = rngOf(x * 7919 + y * 104729 + 13);
    const ring = (n, R) => { const out = []; for (let i = 0; i < n; i++) { const an = ((i + rnd() * 0.5) / n) * TAU - Math.PI; out.push([Math.cos(an) * R * (0.72 + rnd() * 0.38), Math.sin(an) * R * (0.72 + rnd() * 0.38)]); } return out; };
    const sh = [];
    for (let i = 0; i < 2; i++) { const an = rnd() * TAU, d = 0.22 + rnd() * 0.06; sh.push({ ox: Math.cos(an) * d, oy: Math.sin(an) * d, pts: ring(5, 0.14 + rnd() * 0.05), ax: (rnd() - 0.5) * 0.1, ay: (rnd() - 0.5) * 0.1, h: 0.45 + rnd() * 0.25 }); }
    o = { main: { ox: 0, oy: 0, pts: ring(7, 0.36), ax: (rnd() - 0.5) * 0.12, ay: (rnd() - 0.5) * 0.12, h: 1.25 + rnd() * 0.2 }, shards: sh, cracks: Array.from({ length: 5 }, () => [rnd() * TAU, 0.3 + rnd() * 0.25]) };
    ROCK_GEO.set(k, o);
    if (ROCK_GEO.size > 120) ROCK_GEO.delete(ROCK_GEO.keys().next().value);
  }
  return o;
}
const ROCK_LT = [-0.5, 0.4, 0.77]; // แสงจากซ้ายหน้า-บน (ด้านที่กล้องเห็นสว่าง)
// หินแหลม 1 ยอด (พีระมิดหลายเหลี่ยม) ฐานกลาง (cx, cy) · h = สูงยอด · bs = ขนาดฐาน · tilt = เอียงยอด (ช่อง)
function spire(g, cx, cy, sp, h, bs, tilt = 0) {
  const n = sp.pts.length, ax = cx + sp.ax + tilt, ay = cy + sp.ay, A = P(ax, ay, h), base = [];
  for (let i = 0; i < n; i++) base.push(P(cx + sp.pts[i][0] * bs, cy + sp.pts[i][1] * bs, 0.01));
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (sarea3(base[i], base[j], A) <= 0) continue;
    // แสงตามแนวฉากของหน้า (พิกัดกระดาน)
    const ux = sp.pts[j][0] * bs - sp.pts[i][0] * bs, uy = sp.pts[j][1] * bs - sp.pts[i][1] * bs, vx = ax - (cx + sp.pts[i][0] * bs), vy = ay - (cy + sp.pts[i][1] * bs), vz = h;
    let nx = uy * vz, ny = -ux * vz, nz = ux * vy - uy * vx;
    const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
    const k = 0.62 + 0.45 * Math.max(0, nx * ROCK_LT[0] + ny * ROCK_LT[1] + nz * ROCK_LT[2]);
    g.beginPath(); g.moveTo(base[i][0], base[i][1]); g.lineTo(base[j][0], base[j][1]); g.lineTo(A[0], A[1]); g.closePath();
    g.fillStyle = shade(k > 0.85 ? ROCK_L : ROCK, k > 0.85 ? k * 0.95 : k); g.fill();
    g.strokeStyle = "rgba(46,36,28,.55)"; g.lineWidth = 1; g.stroke();
  }
}
// o = { rise 0..1 (พุ่งขึ้น), sink 0..1 (พัง/จมลง), alpha, now, lowQ, tilt }
export function drawLawRock(g, x, y, o = {}) {
  const rise = o.rise == null ? 1 : o.rise, sink = o.sink || 0;
  const hk = Math.max(0, rise) * (1 - sink);
  if (hk <= 0.01) return;
  // หนามนิ่ง = ภาพอบ (วาดเวกเตอร์เฉพาะตอนพุ่ง/พัง)
  if (rise === 1 && !sink && !o.tilt && !o.live && canBake()) {
    const c0 = P(x + 0.5, y + 0.5, 0), res = bakeRes(g), lowQ = !!o.lowQ, r = c0[2] * 0.75, top = P(x + 0.5, y + 0.5, 1.6)[1];
    const e = baked(`rock|${x},${y}|${q4(c0)}|${q4(P(x + 1, y + 0.5, 0))}|${res}|${lowQ ? 1 : 0}`, c0[0] - r, top - 6, r * 2, c0[1] + r * 0.6 - top + 6, res, (c) => drawLawRock(c, x, y, { lowQ, live: true }));
    blitB(g, e, 0, 0, o.alpha == null ? 1 : o.alpha);
    return;
  }
  const geo = rockGeo(x, y), cx = x + 0.5, cy = y + 0.5, lowQ = !!o.lowQ;
  g.save(); g.globalAlpha *= o.alpha == null ? 1 : o.alpha; g.lineJoin = "round";
  // ดินแตกรอบฐาน
  gEllipse(g, cx, cy, 0.44 * Math.min(1, rise * 1.3), 0.005, 22); g.fillStyle = "rgba(70,56,42,.38)"; g.fill();
  if (!lowQ) {
    g.strokeStyle = "rgba(48,36,26,.6)"; g.lineWidth = 1.2; g.beginPath();
    for (const [an, len] of geo.cracks) { const a = P(cx + Math.cos(an) * 0.2, cy + Math.sin(an) * 0.2, 0.006), b = P(cx + Math.cos(an) * len * Math.min(1, rise), cy + Math.sin(an) * len * Math.min(1, rise), 0.006); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
    g.stroke();
  }
  // เรียงหน้า/หลังของยอดหลัก + เศษหินข้าง
  const parts = [{ sp: geo.main, d: depthOf(cx, cy), main: true }, ...geo.shards.map((s) => ({ sp: s, d: depthOf(cx + s.ox, cy + s.oy), main: false }))];
  parts.sort((a, b) => a.d - b.d);
  const bs = 0.55 + 0.45 * Math.min(1, rise);
  for (const pt of parts) spire(g, cx + pt.sp.ox, cy + pt.sp.oy, pt.sp, pt.sp.h * hk, bs * (pt.main ? 1 : Math.min(1, hk * 1.4)), pt.main ? o.tilt || 0 : 0);
  g.restore();
}
// หนามหินพุ่งขึ้นตามฉาก Takt (หนามลง state ที่ ~LAW_FX.takt) · ไม่มีฉาก = 1
export function lawRockRise(fx, x, y, now) {
  if (!Array.isArray(fx)) return 1;
  for (const e of fx) {
    if (e.kind !== "lawTakt" || !okT(e.tile) || e.tile.x !== x || e.tile.y !== y) continue;
    const dt = now - e.t0 - LAW_FX.takt;
    return dt <= 0 ? 0 : dt >= 180 ? 1 : Math.max(0, easeOutBack(dt / 180));
  }
  return 1;
}
// ชุดช่องหนามหิน (law.rocks = ["x,y"] — BoardStage อ่านจาก board.spikes[].look) · จำต่ออาร์เรย์
const ROCK_SET = new WeakMap();
export function isLawRock(law, x, y) {
  const list = law && Array.isArray(law.rocks) ? law.rocks : null;
  if (!list || !list.length) return false;
  let s = ROCK_SET.get(list);
  if (!s) { s = new Set(list.map((k) => (typeof k === "string" ? k : okT(k) ? `${k.x},${k.y}` : ""))); ROCK_SET.set(list, s); }
  return s.has(`${x},${y}`);
}

// ---------- ชั้นทับตัวละคร: ผิวโดมหน้า · มาร์ก · หัวใจ · ท่าไม้ตายที่รอตี ----------
function heartHidden(fx, owner, victim) {
  for (const e of fx) if ((e.kind === "lawHeartOut" || e.kind === "lawSqueeze") && e.targetId === victim && (e.id == null || e.id === owner)) return true;
  return false;
}
export function drawLawAir(g, law, units, fx, now, lowQ) {
  if (!law) return;
  const list = fx || [];
  const rooms = roomsOf(law);
  if (rooms && rooms.length) drawRoomFront(g, rooms, list, now, lowQ);
  const still = lowQ || REDUCED;
  // มาร์ก = ร่างถูกตัดเป็นชิ้นลอยแยก (lawSliced / drawSlice — เรียงความลึกใน lawItems)
  // หัวใจ: เหยื่อ = หัวใจกลวงเหนือหัว + จุดครั้งที่เหลือ · ลอว์ = ลูกบาศก์หัวใจลอยข้างตัว (เต้นตลอด)
  if (Array.isArray(law.hearts) && law.hearts.length) {
    const beatOf = (ph) => (still ? 0 : Math.pow(Math.max(0, Math.sin(now / 260 + ph)), 6));
    const perOwner = new Map();
    for (const h of law.hearts) {
      if (!h) continue;
      const v = findUnit(units, h.victim);
      if (v) {
        const B = unitBody(v), y = B.hy - B.r * 1.75 + (still ? 0 : Math.sin(now / 700) * 2), r = Math.max(6, Math.round(B.r * 0.34 * 2) / 2), n = Math.max(0, Math.min(5, h.left | 0)), res = bakeRes(g);
        // หัวใจกลว (เส้นประ) + จุดครั้งที่บีบได้อีก — อบต่อขนาด/จำนวนจุด
        const hv = baked(`hv|${r}|${n}|${res}`, -r * 1.8, -r * 1.4, r * 3.6, r * 3.2, res, (c) => {
          heartPath(c, 0, 0, r);
          c.fillStyle = "rgba(20,8,14,.55)"; c.fill();
          c.setLineDash([3, 2]); c.strokeStyle = rgba(RED_L, 0.9); c.lineWidth = 1.4; c.stroke(); c.setLineDash([]);
          c.fillStyle = rgba(RED_L, 0.95);
          for (let i = 0; i < n; i++) { c.beginPath(); c.arc((i - (n - 1) / 2) * r * 0.62, r * 1.35, Math.max(1.6, r * 0.16), 0, TAU); c.fill(); }
        });
        blitB(g, hv, B.bx, y);
      }
      if (heartHidden(list, h.owner, h.victim)) continue;
      const arr = perOwner.get(h.owner) || [];
      arr.push(h); perOwner.set(h.owner, arr);
    }
    for (const [owner, arr] of perOwner) {
      const L = findUnit(units, owner);
      if (!L) continue;
      const A = unitBody(L);
      arr.forEach((h, i) => {
        const an = (still ? 0 : now / 2400) + (i / arr.length) * TAU, x = A.bx + Math.cos(an) * A.r * 1.35, y = A.hy - A.r * 0.55 + Math.sin(an) * A.r * 0.38;
        const r = Math.max(6, Math.round(A.r * 0.3 * 2) / 2), res = bakeRes(g);
        const hc = baked(`hc|${r}|${res}`, -r * 1.2, -r * 1.2, r * 2.4, r * 2.4, res, (c) => heartCube(c, 0, 0, r, 1));
        blitB(g, hc, x, y, 0.95, 1 + 0.08 * beatOf(i * 1.7));
      });
    }
  }
  // ท่าไม้ตายที่รอตี: Gamma = ใบมีดเขียวสั้นที่มือ · Mess = มือใสในลูกบาศก์
  if (Array.isArray(law.armed)) for (const a of law.armed) {
    const u = findUnit(units, a && a.id);
    if (!u) continue;
    const A = unitBody(u), hx = A.bx + A.r * 0.75, hy = A.hy + A.r * 0.15, fl = still ? 0 : Math.floor(now / 70);
    if (a.kind === "gamma") energyBlade(g, hx, hy, hx + A.r * 0.75, hy - A.r * 1.05, A.r * 0.12, still ? 0.85 : 0.75 + 0.2 * Math.sin(now / 130), fl);
    else if (a.kind === "mess") { g.save(); lit(g); sglow(g, hx, hy, A.r * 0.9, CYAN, 0.45); g.restore(); heartCube(g, hx, hy - A.r * 0.1, A.r * 0.32, 0.9, { heart: false }); }
  }
}

// ---------- ตีปกติ ----------
function slashStyle(g, e, now, lowQ) {
  const T = LAW_MS.lawSlash, t = now - e.t0, p = t / T, HIT = LAW_HIT_P.lawSlash;
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const side = B.bx >= A.bx ? 1 : -1, base = side > 0 ? 0 : Math.PI;
  const hx = A.bx + side * A.r * 0.5, hy = A.hy + A.r * 0.3, L = A.r * 2.7;
  const SW0 = 0.17, SW1 = HIT - 0.03;
  const UP = -2.25, END = 1.15, REST = 2.4;
  // มุมดาบ (เทียบทิศหันหน้า): ถือต่ำไปหลัง → ง้างเหนือหัว (ผ่านด้านหลัง) → ฟันโค้งผ่านด้านหน้าลงต่ำ
  const sw = clamp01((p - SW0) / (SW1 - SW0));
  const rel = p < SW0 ? lerp(REST, UP + TAU, easeOut3(p / SW0)) : p < SW1 ? lerp(UP, END, easeIn2(sw) * 0.5 + sw * 0.5) : END;
  const ang = base + rel * side;
  const kS = env(p, 0, 0.06, 0.72, 0.95);
  // รอยโค้งตามปลายดาบตอนฟัน (หัวหนา = ปลายดาบ)
  if (p >= SW0) {
    const head = Math.min(rel, END), tail = Math.max(UP, head - (p < SW1 ? 2.6 : 2.6 * (1 - clamp01((p - SW1) / 0.3))));
    const k = p < SW1 + 0.05 ? 1 : 1 - clamp01((p - SW1 - 0.05) / 0.3);
    arcBand(g, hx, hy, L * 0.92, base + tail * side, base + head * side, A.r * 0.55, k, CYAN_D, CYAN);
  }
  kikoku(g, hx, hy, ang, L, kS, p > 0.05 && p < 0.2 ? (p - 0.05) / 0.15 : -1);
  // คลื่นตัดวิ่งผ่าน Room ไปหาเป้า (เส้นบางจาง)
  const far = Math.hypot(B.bx - A.bx, B.hy - A.hy) > A.r * 3;
  const kz = env(p, SW1 - 0.06, SW1 - 0.02, HIT, HIT + 0.08);
  if (far && kz > 0) {
    const u = easeIn2(clamp01((p - SW1 + 0.06) / 0.09));
    g.save(); lit(g); g.lineCap = "round";
    g.strokeStyle = rgba(CYAN, 0.35 * kz); g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(hx, hy); g.lineTo(lerp(hx, B.bx, u), lerp(hy, B.hy, u)); g.stroke();
    sglow(g, lerp(hx, B.bx, u), lerp(hy, B.hy, u), A.r * 0.6, CUT, 0.6 * kz);
    g.restore();
  }
  // ปะทะ: รอยตัดเส้นบางวาบผ่านเป้า → แยกสองเส้นจาง (ตัดขาดแบบไม่มีเลือด) · หลบ = รอยตัดเฉียดข้างตัว
  if (p >= HIT) {
    const q = (p - HIT) / (1 - HIT), grow = easeOut3(clamp01(q / 0.1)), k = 1 - clamp01((q - 0.45) / 0.55);
    const cut = -0.55 * side, x = e.dodge ? B.bx + side * B.r * 1.25 : B.bx, y = e.dodge ? B.hy - B.r * 0.2 : B.hy;
    incision(g, x, y, cut, B.r * (e.dodge ? 2.4 : 3.6), k * (e.dodge ? 0.6 : 1), grow, e.dodge ? 0 : 1.5 * easeOut3(clamp01((q - 0.15) / 0.5)));
    if (!e.dodge) {
      const fl = env(q, 0, 0.02, 0.08, 0.3);
      g.save(); lit(g); sglow(g, B.bx, B.hy, B.r * 1.6, CUT, 0.55 * fl); sglow(g, B.bx, B.hy, B.r * 0.7, WHITE, 0.8 * fl); g.restore();
      if (!lowQ) {
        const rnd = rngOf(strHash(`${e.by}|${e.t0 | 0}`));
        g.save(); lit(g);
        for (let i = 0; i < 6; i++) { const u2 = rnd() * 2 - 1, d = q * B.r * (0.6 + rnd()); const c = Math.cos(cut), s = Math.sin(cut); sglow(g, B.bx + c * u2 * B.r * 1.6 - s * d * (i % 2 ? 1 : -1), B.hy + s * u2 * B.r * 1.6 + c * d * (i % 2 ? 1 : -1), 3.5, CUT, 0.8 * (1 - q)); }
        g.restore();
      }
    }
  }
}
function gammaStyle(g, e, now, lowQ) {
  const T = LAW_MS.lawGamma, t = now - e.t0, p = t / T, HIT = LAW_HIT_P.lawGamma;
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const ang = Math.atan2(B.hy - A.hy, B.bx - A.bx), c = Math.cos(ang), s = Math.sin(ang);
  const hx = A.bx + c * A.r * 0.7, hy = A.hy + s * A.r * 0.5 + A.r * 0.15, fl = REDUCED ? 0 : Math.floor(now / 50);
  const seed = strHash(`${e.by}|${e.t0 | 0}`), FORM = 0.3;
  // พลังงานรวมเข้ามือ
  if (p < FORM + 0.05) {
    const k = env(p, 0, 0.06, FORM, FORM + 0.05), rnd = rngOf(seed);
    g.save(); lit(g);
    sglow(g, hx, hy, A.r * (0.5 + 0.7 * clamp01(p / FORM)), GREEN, 0.6 * k);
    if (!lowQ) for (let i = 0; i < 10; i++) { const an = rnd() * TAU, d0 = A.r * (1.4 + rnd()), u = clamp01(p / FORM - rnd() * 0.3); sglow(g, hx + Math.cos(an) * d0 * (1 - easeIn2(u)), hy + Math.sin(an) * d0 * (1 - easeIn2(u)) * 0.8, 3.5, i % 3 ? GREEN : GREEN_L, 0.9 * k * (1 - u * 0.4)); }
    g.restore();
  }
  // ใบมีด: ก่อตัว → แทงทะลุ → ค้าง → หด
  const Lb = A.r * 1.3, reach = Math.hypot(B.bx - hx, B.hy - hy) + B.r * 1.1;
  let len = 0;
  if (p < FORM) len = Lb * easeOut3(clamp01((p - 0.08) / (FORM - 0.08)));
  else if (p < HIT) len = lerp(Lb, reach, easeIn2((p - FORM) / (HIT - FORM)));
  else if (p < 0.74) len = reach;
  else len = reach * (1 - easeIn2(clamp01((p - 0.74) / 0.2)));
  const kb = env(p, 0.06, 0.12, 0.8, 0.95);
  if (len > 2) energyBlade(g, hx, hy, hx + c * len, hy + s * len, A.r * 0.16, kb, fl);
  // ปะทะ: แสงข้างตัวเป้าแบบเอกซเรย์ + วงเขียวแผ่
  if (p >= HIT && !e.dodge) {
    const q = (p - HIT) / (1 - HIT), k = 1 - clamp01((q - 0.4) / 0.6);
    g.save(); hexPath(g, B.bx, B.hy, B.r);
    g.fillStyle = rgba("4,34,16", 0.55 * k); g.fill();
    lit(g);
    sglow(g, B.bx, B.hy, B.r * 0.95, GREEN, 0.6 * k);
    g.strokeStyle = rgba(GREEN_L, 0.85 * k); g.lineWidth = Math.max(1, B.r * 0.07); g.lineCap = "round";
    g.beginPath(); g.moveTo(B.bx, B.hy - B.r * 0.45); g.lineTo(B.bx, B.hy + B.r * 0.75);
    for (let i = 0; i < 4; i++) { const y = B.hy - B.r * 0.3 + i * B.r * 0.22, w = B.r * (0.55 - i * 0.05); for (const sd of [-1, 1]) { g.moveTo(B.bx, y); g.quadraticCurveTo(B.bx + sd * w, y - B.r * 0.1, B.bx + sd * w * 1.1, y + B.r * 0.16); } }
    g.stroke();
    g.beginPath(); g.arc(B.bx, B.hy - B.r * 0.64, B.r * 0.2, 0, TAU); g.stroke();
    // เส้นสแกนวิ่งลง (กว้างตามหกเหลี่ยมที่ระดับนั้น)
    const dy = -B.r * 0.84 + B.r * 1.68 * ((q * 2.2) % 1), hw = B.r - (Math.abs(dy) / (B.r * 0.866)) * B.r * 0.5;
    g.fillStyle = rgba(GREEN_L, 0.3 * k); g.fillRect(B.bx - hw, B.hy + dy - 2, hw * 2, 4);
    g.restore();
    g.save(); lit(g);
    hexPath(g, B.bx, B.hy, B.r * (1 + 0.8 * easeOut3(clamp01(q / 0.5)))); g.strokeStyle = rgba(GREEN, 0.7 * (1 - clamp01(q / 0.5))); g.lineWidth = 2.5; g.stroke();
    sglow(g, B.bx, B.hy, B.r * 1.8, GREEN_L, 0.6 * env(q, 0, 0.02, 0.06, 0.25));
    g.restore();
  }
  if (p >= HIT && e.dodge) { const q = (p - HIT) / (1 - HIT); g.save(); lit(g); sglow(g, B.bx + B.r, B.hy, B.r, GREEN, 0.4 * (1 - q)); g.restore(); }
}
function messStyle(g, e, now, lowQ) {
  const T = LAW_MS.lawMess, t = now - e.t0, p = t / T, HIT = LAW_HIT_P.lawMess;
  const A = bodyAt(e.x, e.y, e.size || 1), B = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  const ang = Math.atan2(B.hy - A.hy, B.bx - A.bx), c = Math.cos(ang), s = Math.sin(ang);
  const hx = A.bx + c * A.r * 0.6, hy = A.hy + s * A.r * 0.4 + A.r * 0.1;
  // มือเรืองฟ้า (เยื่อ Room รอบมือ)
  const kg = env(p, 0, 0.08, 0.5, 0.75);
  g.save(); lit(g); sglow(g, hx, hy, A.r * 0.9, CYAN, 0.5 * kg); g.restore();
  // มือใสยื่นเข้าอก → ดัน (ย่อ) → ถอน
  const tx = e.dodge ? B.bx - c * B.r * 0.9 + s * B.r * 0.6 : B.bx - c * B.r * 0.15, ty = e.dodge ? B.hy - s * B.r * 0.9 - c * B.r * 0.6 : B.hy + B.r * 0.1;
  let u;
  if (p < 0.15) u = 0;
  else if (p < HIT) u = easeInOut((p - 0.15) / (HIT - 0.15));
  else if (p < 0.68) u = 1;
  else u = 1 - easeIn2(clamp01((p - 0.68) / 0.22));
  const kh = env(p, 0.12, 0.2, 0.82, 0.92), push = env(p, HIT - 0.06, HIT, HIT + 0.04, 0.68);
  ghostHand(g, lerp(hx, tx, u), lerp(hy, ty, u), ang, A.r * (0.75 + 0.15 * u) * (1 - 0.18 * push), kh, push * 0.6);
  if (p >= HIT && !e.dodge) {
    const q = (p - HIT) / (1 - HIT);
    // คลื่นหกเหลี่ยม + แสงแดงที่อก + ลูกบาศก์ใสก่อตัว
    g.save(); lit(g);
    for (let i = 0; i < (lowQ ? 2 : 3); i++) { const qq = clamp01(q * 1.6 - i * 0.18); if (qq <= 0 || qq >= 1) continue; hexPath(g, B.bx, B.hy, B.r * (0.5 + 1.1 * easeOut3(qq))); g.strokeStyle = rgba(CYAN, 0.75 * (1 - qq)); g.lineWidth = 2; g.stroke(); }
    sglow(g, B.bx, B.hy + B.r * 0.1, B.r * 0.9, RED, 0.6 * env(q, 0, 0.05, 0.3, 0.7));
    g.restore();
    heartCube(g, B.bx, B.hy + B.r * 0.05, B.r * 0.42 * easeOutBack(clamp01(q / 0.18)), env(q, 0, 0.05, 0.25, 0.45), { heart: false });
  }
}
function styleFx(g, e, now, lowQ) {
  const T = LAW_MS[e.kind] || 900, p = (now - e.t0) / T;
  if (p < 0 || p > 1 || !okT(e) || !okT(e.to)) return;
  if (e.kind === "lawSlash") slashStyle(g, e, now, lowQ);
  else if (e.kind === "lawGamma") gammaStyle(g, e, now, lowQ);
  else if (e.kind === "lawMess") messStyle(g, e, now, lowQ);
}

// ---------- เศษหิน / ฝุ่น ----------
// เศษกระเด็นจาก (cx, cy) บนกระดาน · t = วินาทีตั้งแต่ระเบิด · ขึ้นสูง up · ไกล far (ช่อง)
function debris(g, cx, cy, t, seed, n, { up = 2.2, far = 0.9, size = 0.07, k = 1, rgb = ROCK } = {}) {
  if (k <= 0.01 || t <= 0) return;
  const rnd = rngOf(seed);
  for (let i = 0; i < n; i++) {
    const an = rnd() * TAU, sp = far * (0.4 + rnd() * 0.8), vz = up * (0.6 + rnd() * 0.6), life = 0.55 + rnd() * 0.35, sz = size * (0.6 + rnd() * 0.8), spin = (rnd() - 0.5) * 14;
    if (t > life) continue;
    const z = Math.max(0, vz * t - 4.6 * t * t), d = sp * (t / life);
    const pp = P(cx + Math.cos(an) * d, cy + Math.sin(an) * d, z), r = pp[2] * sz, a = k * (1 - Math.pow(t / life, 3));
    g.save(); g.translate(pp[0], pp[1]); g.rotate(spin * t + an);
    g.fillStyle = shade(rgb, 0.75 + (i % 3) * 0.15); g.globalAlpha *= a;
    g.beginPath(); g.moveTo(-r, -r * 0.6); g.lineTo(r * 0.9, -r * 0.4); g.lineTo(r * 0.5, r * 0.7); g.lineTo(-r * 0.7, r * 0.5); g.closePath(); g.fill();
    g.restore();
  }
}
// ฝุ่นฟุ้ง (ก้อนฝุ่นนุ่มขยาย) + วงฝุ่นบนพื้น
function dust(g, cx, cy, q, k, R = 0.7, lowQ = false, seed = 1) {
  if (k <= 0.01 || q <= 0 || q >= 1) return;
  const rnd = rngOf(seed), a = k * (1 - q);
  gEllipse(g, cx, cy, R * (0.3 + 0.9 * easeOut3(q)), 0.01, 26); g.strokeStyle = rgba(DUST, 0.55 * a); g.lineWidth = 2.5; g.stroke();
  for (let i = 0; i < (lowQ ? 3 : 7); i++) {
    const an = rnd() * TAU, d = R * (0.2 + 0.8 * easeOut3(q)) * (0.5 + rnd() * 0.5), pp = P(cx + Math.cos(an) * d, cy + Math.sin(an) * d, 0.1 + q * 0.4 * rnd());
    sglow(g, pp[0], pp[1], pp[2] * (0.22 + 0.25 * q) * (0.7 + rnd() * 0.6), i % 2 ? DUST : DUST_D, 0.5 * a);
  }
}
// โครงลูกบาศก์ฟ้า (Shambles) รอบช่อง (x, y) ขนาด n · grow 0..1 · สูง hgt
function wireBox(g, x, y, n, grow, k, hgt = 1.4) {
  if (k <= 0.01 || grow <= 0.01) return;
  const cx = x + n / 2, cy = y + n / 2, e = (n / 2) * 0.98 * grow, h = hgt * n * grow;
  const B = CUBE_C.map(([dx, dy]) => P(cx + dx * e, cy + dy * e, 0.02)), T = CUBE_C.map(([dx, dy]) => P(cx + dx * e, cy + dy * e, h));
  g.save(); lit(g); g.lineJoin = "round";
  g.beginPath();
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; g.moveTo(B[i][0], B[i][1]); g.lineTo(B[j][0], B[j][1]); g.moveTo(T[i][0], T[i][1]); g.lineTo(T[j][0], T[j][1]); g.moveTo(B[i][0], B[i][1]); g.lineTo(T[i][0], T[i][1]); }
  g.strokeStyle = rgba(CYAN_D, 0.4 * k); g.lineWidth = 5; g.stroke();
  g.strokeStyle = rgba(CYAN, 0.75 * k); g.lineWidth = 1.6; g.stroke();
  g.beginPath(); g.moveTo(T[0][0], T[0][1]); for (let i = 1; i < 4; i++) g.lineTo(T[i][0], T[i][1]); g.closePath();
  g.fillStyle = rgba(ROOM_L, 0.06 * k); g.fill();
  for (const p of T) sglow(g, p[0], p[1], 6, WHITE, 0.5 * k);
  g.restore();
}

// ---------- เหตุการณ์ ----------
function eventFx(g, e, now, lowQ, law) {
  const T = e.dur || LAW_FX_DUR[e.kind] || 1000, t = now - e.t0, p = t / T;
  if (p < 0 || p > 1) return;
  const at = okT(e.at) ? e.at : null, n = Math.max(1, e.size | 0);
  const A = at ? bodyAt(at.x, at.y, n) : null;
  const seed = strHash(`${e.id}|${e.kind}|${e.t0 | 0}`), flick = REDUCED ? 0 : Math.floor(now / 55);
  switch (e.kind) {
    case "lawRoomOpen": {
      const r = e.room && okRoom(e.room) ? e.room : null;
      if (!A) return;
      // ฝ่ามือยกขึ้น: จุดแสงฟ้าขาว + รัศมีเส้นบาง → คลื่นพื้นแผ่ไปจนสุดขอบ Room
      const px = A.bx + A.r * 0.25, py = A.hy - A.r * 1.35;
      const kp = env(p, 0, 0.06, 0.5, 0.85);
      g.save(); lit(g);
      sglow(g, px, py, A.r * (1 + 1.2 * easeOut3(clamp01(p / 0.3))), ROOM_L, 0.7 * kp);
      sglow(g, px, py, A.r * 0.45, WHITE, 0.95 * kp);
      if (!lowQ) {
        g.strokeStyle = rgba(CUT, 0.6 * kp); g.lineWidth = 1.2; g.beginPath();
        for (let i = 0; i < 10; i++) { const an = (i / 10) * TAU + (REDUCED ? 0 : p * 1.4), r0 = A.r * 0.5, r1 = A.r * (1.1 + 0.9 * easeOut3(clamp01(p / 0.4))); g.moveTo(px + Math.cos(an) * r0, py + Math.sin(an) * r0); g.lineTo(px + Math.cos(an) * r1, py + Math.sin(an) * r1); }
        g.stroke();
      }
      twinkle(g, px, py, A.r * 0.9, env(p, 0.02, 0.08, 0.14, 0.32));
      g.restore();
      if (r) {
        const G = roomGeo(r);
        for (let j = 0; j < 2; j++) {
          const u = clamp01((t - j * 140) / ROOM_GROW);
          if (u <= 0 || u >= 1) continue;
          const s = easeOut3(u), a = (1 - u) * (j ? 0.5 : 0.9);
          g.save(); lit(g); g.beginPath();
          for (let i = 0; i <= SE_N; i++) { const pp = P(G.px + (G.mx + SE[i][0] * G.hx * 1.04 - G.px) * s, G.py + (G.my + SE[i][1] * G.hy * 1.04 - G.py) * s, 0.03); if (i) g.lineTo(pp[0], pp[1]); else g.moveTo(pp[0], pp[1]); }
          g.strokeStyle = rgba(ROOM_L, a); g.lineWidth = 3 + 4 * (1 - u); g.stroke();
          g.strokeStyle = rgba(WHITE, a); g.lineWidth = 1.2; g.stroke();
          g.restore();
        }
      }
      return;
    }
    case "lawRoomClose": {
      const r = e.room && okRoom(e.room) ? e.room : LAST_ROOM.get(e.id) || null;
      if (e.why !== "region" && r && okRoom(r)) {
        const G = roomGeo(r), pal = palOf(r.color || e.color), COL = 0.55;
        if (p < COL) {
          const u = easeIn2(p / COL), sc = Math.max(0.02, 1 - u), pv = P(G.mx, G.my, G.H * 0.45), ce = roomCache(r, G, pal, g, now);
          blitRoom(g, ce.back, ce, pv[0], pv[1], sc, 1 - 0.3 * u, u);
          blitRoom(g, ce.front, ce, pv[0], pv[1], sc, 1 - 0.3 * u, u);
        }
        // แตก: แฟลช + วง + เศษเยื่อกระเด็น
        const q = clamp01((p - COL + 0.04) / (1 - COL)), kq = env(p, COL - 0.04, COL, COL + 0.08, 1);
        if (kq > 0) {
          const c = P(G.mx, G.my, G.H * 0.45);
          g.save(); lit(g);
          sglow(g, c[0], c[1], c[2] * (0.6 + 2 * easeOut3(q)), ROOM_L, 0.8 * kq);
          sglow(g, c[0], c[1], c[2] * 0.5, WHITE, 0.9 * env(q, 0, 0.03, 0.08, 0.3));
          g.restore();
          if (!lowQ) {
            const rnd = rngOf(seed);
            g.save(); lit(g); g.lineCap = "round";
            for (let i = 0; i < 14; i++) {
              const an = rnd() * TAU, d = c[2] * (0.4 + rnd() * 1.6) * easeOut3(q), x = c[0] + Math.cos(an) * d, y = c[1] + Math.sin(an) * d * 0.7 + c[2] * 0.6 * q * q, w = c[2] * 0.12;
              g.strokeStyle = rgba(CUT, 0.9 * (1 - q)); g.lineWidth = 1.4;
              g.beginPath(); g.moveTo(x - Math.cos(an + 1.2) * w, y - Math.sin(an + 1.2) * w); g.lineTo(x + Math.cos(an + 1.2) * w, y + Math.sin(an + 1.2) * w); g.stroke();
            }
            g.restore();
          }
          gEllipse(g, G.mx, G.my, Math.max(G.hx, G.hy) * (0.2 + 0.8 * easeOut3(q)), 0.03, 40);
          g.save(); lit(g); g.strokeStyle = rgba(ROOM_L, 0.7 * (1 - q)); g.lineWidth = 2.5; g.stroke(); g.restore();
        }
      }
      // วัตถุลอยร่วงลงพื้นแล้วสลายเป็นฝุ่น
      const objs = Array.isArray(e.objects) ? e.objects.filter(okT) : [];
      for (const o of objs) {
        const geo = objGeo(o.id), cx = o.x + 0.5, cy = o.y + 0.5, FALL = 0.32;
        if (p < FALL) { const u = easeIn2(p / FALL); stoneCube(g, cx, cy, lerp(OBJ_FLOAT, OBJ_E, u), OBJ_E, OBJ_E, geo.yaw, 1, geo, { lowQ, edge: 0.6 * (1 - u) }); }
        else {
          const q = (p - FALL) / (1 - FALL);
          stoneCube(g, cx, cy, OBJ_E * (1 - easeIn2(clamp01(q / 0.55))), OBJ_E * (1 + 0.15 * q), Math.max(0.01, OBJ_E * (1 - easeIn2(clamp01(q / 0.55)))), geo.yaw, 1 - clamp01(q / 0.6), geo, { lowQ, edge: 0, under: 0 });
          dust(g, cx, cy, q, 1, 0.55, lowQ, seed + o.id);
          debris(g, cx, cy, q * 0.6, seed + 3 + o.id, lowQ ? 3 : 6, { up: 1.2, far: 0.5, rgb: STONE });
        }
      }
      return;
    }
    case "lawCut": {
      const tile = okT(e.tile) ? e.tile : null;
      if (!tile) return;
      const cx = tile.x + 0.5, cy = tile.y + 0.5;
      // ลอว์สะบัด Kikoku สั้นๆ
      if (A && p < 0.3) {
        const side = P(cx, cy)[0] >= A.bx ? 1 : -1, base = side > 0 ? 0 : Math.PI, u = clamp01(p / 0.22), rel = lerp(-1.9, 0.9, easeIn2(u));
        kikoku(g, A.bx + side * A.r * 0.5, A.hy + A.r * 0.3, base + rel * side, A.r * 2.4, env(p, 0, 0.04, 0.2, 0.3));
        if (u > 0.2) arcBand(g, A.bx + side * A.r * 0.5, A.hy + A.r * 0.3, A.r * 2.2, base - 1.9 * side, base + rel * side, A.r * 0.45, env(p, 0.04, 0.1, 0.2, 0.3), CYAN_D, CYAN);
      }
      // รอยตัดเฉียงบนพื้น → กรอบช่องตัดรอบ → ฝุ่น + เงาหลุม
      const ks = env(p, 0.1, 0.16, 0.3, 0.48);
      if (ks > 0) {
        const grow = easeOut3(clamp01((p - 0.1) / 0.08)), a = P(cx - 0.62 * grow, cy + 0.42 * grow, 0.03), b = P(cx + 0.62 * grow, cy - 0.42 * grow, 0.03);
        g.save(); lit(g); g.lineCap = "round";
        g.strokeStyle = rgba(CYAN_D, 0.35 * ks); g.lineWidth = 7; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        g.strokeStyle = rgba(WHITE, ks); g.lineWidth = 1.6; g.stroke();
        g.restore();
      }
      const kq = env(p, 0.18, 0.24, 0.48, 0.72);
      if (kq > 0) {
        const c4 = [[0.04, 0.04], [0.96, 0.04], [0.96, 0.96], [0.04, 0.96]].map(([u, v]) => P(tile.x + u, tile.y + v, 0.02));
        g.save(); lit(g); g.lineJoin = "round";
        pathPts(g, c4); g.fillStyle = rgba(CYAN, 0.12 * kq); g.fill();
        g.strokeStyle = rgba(CYAN, 0.8 * kq); g.lineWidth = 2.2; g.stroke();
        g.strokeStyle = rgba(WHITE, kq); g.lineWidth = 1; g.stroke();
        g.restore();
      }
      const kh = env(p, CUT_UP / T, CUT_SHOW / T, 0.7, 1);
      if (kh > 0) { const c4 = [[0.06, 0.06], [0.94, 0.06], [0.94, 0.94], [0.06, 0.94]].map(([u, v]) => P(tile.x + u, tile.y + v, 0.01)); pathPts(g, c4); g.fillStyle = `rgba(20,16,12,${0.3 * kh})`; g.fill(); }
      if (p > CUT_UP / T) dust(g, cx, cy, clamp01((t - CUT_UP) / 600), 0.9, 0.6, lowQ, seed);
      return;
    }
    case "lawShuffle": {
      const SW = LAW_FX.shuffle, ends = [e.a, e.b].filter((s) => s && okT(s.from) && okT(s.to));
      for (const s of ends) {
        const sz = Math.max(1, s.size | 0), isObj = typeof s.id === "string" && s.id.startsWith("obj:");
        // ก่อนสลับ: กรอบลูกบาศก์ฟ้าครอบ (กระพริบเบาๆ)
        if (t < SW + 60) wireBox(g, s.from.x, s.from.y, sz, easeOutBack(clamp01(t / 130)), (t < SW ? 0.85 + (REDUCED ? 0 : 0.15 * Math.sin(t / 30)) : 1 - (t - SW) / 60), isObj ? 1.1 : 1.45);
        if (t >= SW) {
          const q = clamp01((t - SW) / (T - SW));
          // ปลายทาง: แฟลช + กรอบหดเข้า
          const B = bodyAt(s.to.x, s.to.y, sz);
          g.save(); lit(g); sglow(g, B.bx, isObj ? P(s.to.x + 0.5, s.to.y + 0.5, OBJ_FLOAT)[1] : B.hy, B.r * 2.2, ROOM_L, 0.85 * env(q, 0, 0.02, 0.08, 0.35)); g.restore();
          wireBox(g, s.to.x, s.to.y, sz, 1.25 - 0.25 * easeOut3(clamp01(q / 0.3)), 1 - clamp01(q / 0.5), isObj ? 1.1 : 1.45);
          // เงาติดตาที่จุดเดิม
          const kg = 1 - clamp01(q / 0.75);
          if (kg > 0) {
            if (isObj) { const geo = objGeo(String(s.id).slice(4)); stoneCube(g, s.from.x + 0.5, s.from.y + 0.5, OBJ_FLOAT + q * 0.3, OBJ_E, OBJ_E, geo.yaw, 0.35 * kg, null, { lowQ: true, edge: 0.9, under: 0 }); }
            else {
              const F = bodyAt(s.from.x, s.from.y, sz);
              g.save(); lit(g);
              for (let i = 0; i < (REDUCED ? 1 : 3); i++) { hexPath(g, F.bx, F.hy - F.r * q * 0.6 * (i + 1), F.r * (1 + i * 0.12)); g.strokeStyle = rgba(CYAN, 0.7 * kg * (1 - i * 0.28)); g.lineWidth = 1.8; g.stroke(); }
              hexPath(g, F.bx, F.hy, F.r); g.fillStyle = rgba(ROOM_L, 0.18 * kg); g.fill();
              g.restore();
            }
            // เส้นวาร์ปบางเชื่อมจุดเดิม-ปลายทาง
            const F = bodyAt(s.from.x, s.from.y, sz), kl = env(q, 0, 0.02, 0.12, 0.4);
            if (kl > 0) { g.save(); lit(g); g.strokeStyle = rgba(CUT, 0.6 * kl); g.lineWidth = 1.2; g.beginPath(); g.moveTo(F.bx, F.hy); g.lineTo(B.bx, B.hy); g.stroke(); g.restore(); }
          }
        }
      }
      return;
    }
    case "lawTakt": {
      const tile = okT(e.tile) ? e.tile : null;
      if (!tile) return;
      const cx = tile.x + 0.5, cy = tile.y + 0.5, ER = LAW_FX.takt;
      // ลอว์ดีดนิ้วขึ้น
      if (A && t < 320) {
        const k = env(t, 0, 40, 160, 320), hx = A.bx + A.r * 0.7, hy = A.hy - A.r * 0.1, len = A.r * 1.3 * easeOut3(clamp01(t / 120));
        g.save(); lit(g); g.lineCap = "round";
        g.strokeStyle = rgba(CYAN, 0.8 * k); g.lineWidth = 2; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + len * 0.2, hy - len); g.stroke();
        sglow(g, hx + len * 0.2, hy - len, A.r * 0.5, CUT, 0.8 * k);
        g.restore();
        twinkle(g, hx + len * 0.2, hy - len, A.r * 0.45, k);
      }
      // พื้นเรือง + รอยร้าวแผ่ (ก่อนพุ่ง)
      const kc = env(t, 30, 120, ER, ER + 220);
      if (kc > 0) {
        const geo = rockGeo(tile.x, tile.y), grow = clamp01((t - 30) / (ER - 30));
        const c4 = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => P(tile.x + u, tile.y + v, 0.015));
        g.save(); lit(g); pathPts(g, c4); g.fillStyle = rgba(CYAN, (0.1 + 0.12 * (REDUCED ? 0 : Math.sin(t / 40) * 0.5 + 0.5)) * kc); g.fill(); g.restore();
        g.save(); g.lineCap = "round";
        g.beginPath();
        for (const [an, len] of geo.cracks) { const a = P(cx, cy, 0.01), b = P(cx + Math.cos(an) * len * 1.3 * grow, cy + Math.sin(an) * len * 1.3 * grow, 0.01); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); }
        g.strokeStyle = `rgba(40,30,22,${0.75 * kc})`; g.lineWidth = 2; g.stroke();
        lit(g); g.strokeStyle = rgba(CYAN, 0.7 * kc); g.lineWidth = 1; g.stroke();
        g.restore();
      }
      // พุ่ง: หนาม (ถ้า state ไม่มีหนามช่องนี้ = หนามชั่วคราวขึ้นแล้วจม) · เศษหิน · ฝุ่น · แฟลช
      if (t >= ER) {
        const dt = t - ER, sec = dt / 1000;
        if (!isLawRock(law, tile.x, tile.y)) {
          const rise = dt < 170 ? easeOutBack(dt / 170) : 1, sink = dt < 380 ? 0 : easeIn2(clamp01((dt - 380) / 280));
          drawLawRock(g, tile.x, tile.y, { rise, sink, lowQ });
        }
        g.save(); lit(g); const c = P(cx, cy, 0.5); sglow(g, c[0], c[1], c[2] * 1.2, YEL_W, 0.6 * env(dt, 0, 20, 60, 220)); g.restore();
        debris(g, cx, cy, sec, seed, lowQ ? 6 : 14, { up: 3.2, far: 1.1 });
        dust(g, cx, cy, clamp01(dt / 650), 1, 0.85, lowQ, seed + 1);
      }
      return;
    }
    case "lawRockDown":
    case "lawRockBreak": {
      const tiles = Array.isArray(e.tiles) ? e.tiles.filter(okT) : [];
      const hold = e.kind === "lawRockBreak" ? Math.max(0, e.hold | 0) : 0;
      for (const tl of tiles) {
        if (t < hold) { drawLawRock(g, tl.x, tl.y, { lowQ }); continue; }
        const dt = t - hold, q = clamp01(dt / 650), brk = e.kind === "lawRockBreak" || e.why === "hit";
        drawLawRock(g, tl.x, tl.y, { sink: easeIn2(clamp01(q / (brk ? 0.35 : 0.7))), tilt: brk ? 0 : 0.12 * q, lowQ, alpha: 1 - clamp01((q - 0.5) / 0.5) });
        debris(g, tl.x + 0.5, tl.y + 0.5, dt / 1000, seed + tl.x * 31 + tl.y, lowQ ? 4 : brk ? 12 : 7, { up: brk ? 2.4 : 1.1, far: brk ? 1 : 0.5 });
        dust(g, tl.x + 0.5, tl.y + 0.5, q, 0.9, 0.6, lowQ, seed + tl.y);
      }
      return;
    }
    case "lawThrow": {
      const to = okT(e.to) ? e.to : null, objs = Array.isArray(e.objects) ? e.objects.filter(okT) : [];
      if (!to) return;
      const FLY = LAW_FX.throw, tx = to.x + 0.5, ty = to.y + 0.5;
      objs.forEach((o, i) => {
        const geo = objGeo(o.id), d0 = i * 55, tt = t - d0, cx = o.x + 0.5, cy = o.y + 0.5, LIFT = 280;
        if (tt < 0) { stoneCube(g, cx, cy, OBJ_FLOAT, OBJ_E, OBJ_E, geo.yaw, 1, geo, { lowQ }); return; }
        const end = FLY - (objs.length - 1 - i) * 18; // ก้อนสุดท้ายถึงตรงจังหวะดาเมจ
        if (tt < LIFT) { const u = easeOut3(tt / LIFT); stoneCube(g, cx, cy, lerp(OBJ_FLOAT, 2.3, u), OBJ_E, OBJ_E, geo.yaw + u * 2, 1, geo, { lowQ, edge: 0.6 + 0.4 * u }); return; }
        if (t > end + 20) return;
        const u = clamp01((tt - LIFT) / Math.max(60, end - d0 - LIFT)), w = easeIn2(u);
        const x = lerp(cx, tx, w), y = lerp(cy, ty, w), z = lerp(2.3, OBJ_E, w) + Math.sin(Math.PI * u) * 1.2;
        // หางพุ่ง
        if (!lowQ) {
          g.save(); lit(g);
          for (let j = 1; j <= 4; j++) { const w2 = easeIn2(Math.max(0, u - j * 0.06)), pp = P(lerp(cx, tx, w2), lerp(cy, ty, w2), lerp(2.3, OBJ_E, w2) + Math.sin(Math.PI * Math.max(0, u - j * 0.06)) * 1.2); sglow(g, pp[0], pp[1], pp[2] * 0.28 * (1 - j * 0.18), CYAN, 0.45 * (1 - j * 0.2)); }
          g.restore();
        }
        stoneCube(g, x, y, z, OBJ_E, OBJ_E, geo.yaw + 2 + u * 9, 1, geo, { lowQ, edge: 1, under: 0 });
      });
      // เป้า: วงเตือนบนพื้น
      const kw = env(t, 200, 320, FLY - 40, FLY + 40);
      if (kw > 0) {
        gEllipse(g, tx, ty, 0.42 + 0.06 * Math.sin(t / 50), 0.02, 28);
        g.save(); lit(g); g.strokeStyle = rgba(CYAN, 0.75 * kw); g.lineWidth = 2; g.stroke(); g.restore();
      }
      return;
    }
    case "lawThrowHit": {
      const to = okT(e.to) ? e.to : null;
      if (!to) return;
      const cx = to.x + 0.5, cy = to.y + 0.5, m = Math.max(1, Math.min(4, e.n | 0 || 1)), q = clamp01(t / 750), c = P(cx, cy, 0.3);
      g.save(); lit(g);
      sglow(g, c[0], c[1], c[2] * (0.8 + 0.25 * m), YEL_W, 0.75 * env(t, 0, 15, 50, 220));
      g.restore();
      gEllipse(g, cx, cy, (0.35 + 0.2 * m) * (0.4 + 0.6 * easeOut3(clamp01(q / 0.5))), 0.01, 30);
      g.fillStyle = `rgba(40,30,20,${0.35 * (1 - q)})`; g.fill();
      g.save(); lit(g); gEllipse(g, cx, cy, (0.4 + 0.35 * m) * easeOut3(clamp01(q / 0.6)), 0.03, 36); g.strokeStyle = rgba(CYAN, 0.7 * (1 - q)); g.lineWidth = 3; g.stroke(); g.restore();
      debris(g, cx, cy, t / 1000, seed, (lowQ ? 6 : 10) + m * (lowQ ? 1 : 3), { up: 2.6, far: 0.8 + 0.2 * m, rgb: STONE, size: 0.09 });
      dust(g, cx, cy, q, 1, 0.7 + 0.15 * m, lowQ, seed + 2);
      return;
    }
    case "lawShamble": {
      const a = e.a && okT(e.a.at) ? e.a : null, b = e.b && okT(e.b.at) ? e.b : null;
      if (!a || !b) return;
      const Ba = bodyAt(a.at.x, a.at.y, a.size || 1), Bb = bodyAt(b.at.x, b.at.y, b.size || 1);
      const ca = e.ca || RED_L, cb = e.cb || CYAN;
      const OUT = 0.22, IN = 0.86;
      // กรอบลูกบาศก์รอบทั้งสอง (ผ่าตัด)
      const kb = env(p, 0, 0.08, 0.86, 1);
      wireBox(g, a.at.x, a.at.y, a.size || 1, easeOutBack(clamp01(p / 0.12)), kb * 0.6, 1.4);
      wireBox(g, b.at.x, b.at.y, b.size || 1, easeOutBack(clamp01(p / 0.12)), kb * 0.6, 1.4);
      const dx = Bb.bx - Ba.bx, dy = Bb.hy - Ba.hy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, bow = Math.min(L * 0.35, Ba.r * 4);
      const curve = (S, E, sd, u) => { const mx = (S[0] + E[0]) / 2 + nx * bow * sd, my = (S[1] + E[1]) / 2 + ny * bow * sd - bow * 0.3, v = 1 - u; return [v * v * S[0] + 2 * v * u * mx + u * u * E[0], v * v * S[1] + 2 * v * u * my + u * u * E[1]]; };
      for (const [S, E, rgb, sd] of [[[Ba.bx, Ba.hy], [Bb.bx, Bb.hy], ca, 1], [[Bb.bx, Bb.hy], [Ba.bx, Ba.hy], cb, -1]]) {
        g.save(); lit(g);
        if (p < OUT) { const u = easeOut3(p / OUT); sglow(g, S[0], S[1] - Ba.r * 0.6 * u, Ba.r * (0.5 + 0.5 * u), rgb, 0.85 * u); sglow(g, S[0], S[1], Ba.r * 1.2, rgb, 0.35 * u); }
        else if (p < IN) {
          const u = easeInOut((p - OUT) / (IN - OUT));
          for (let j = lowQ ? 4 : 10; j >= 0; j--) { const uu = Math.max(0, u - j * 0.035); const [x, y] = curve([S[0], S[1] - Ba.r * 0.6], E, sd, uu); sglow(g, x, y, Ba.r * (0.55 - j * 0.035), j ? rgb : WHITE, (j ? 0.55 : 0.9) * (1 - j * 0.07)); }
        } else { const u = (p - IN) / (1 - IN); sglow(g, E[0], E[1], Ba.r * (1.3 + 0.8 * u), rgb, 0.8 * (1 - u)); sglow(g, E[0], E[1], Ba.r * 0.5, WHITE, 0.9 * (1 - u)); }
        g.restore();
      }
      return;
    }
    case "lawShambleDone": {
      for (const [s, rgb] of [[e.a, e.cb || CYAN], [e.b, e.ca || RED_L]]) {
        if (!s || !okT(s.at)) continue;
        const B = bodyAt(s.at.x, s.at.y, s.size || 1), q = clamp01(p);
        g.save(); lit(g);
        hexPath(g, B.bx, B.hy, B.r * (1 + 0.7 * easeOut3(q))); g.strokeStyle = rgba(rgb, 0.85 * (1 - q)); g.lineWidth = 2.5; g.stroke();
        sglow(g, B.bx, B.hy, B.r * 1.4, rgb, 0.5 * (1 - q));
        g.restore();
        twinkle(g, B.bx + B.r * 0.7, B.hy - B.r * 0.8, B.r * 0.4, env(q, 0.05, 0.15, 0.25, 0.5));
      }
      return;
    }
    case "lawUltArm": {
      if (!A) return;
      const hx = A.bx + A.r * 0.75, hy = A.hy + A.r * 0.15, k = env(p, 0, 0.1, 0.7, 1), rnd = rngOf(seed);
      if (e.ult === "gamma") {
        g.save(); lit(g);
        sglow(g, hx, hy, A.r * (0.6 + 0.9 * easeOut3(clamp01(p / 0.5))), GREEN, 0.65 * k);
        if (!lowQ) for (let i = 0; i < 12; i++) { const an = rnd() * TAU, d0 = A.r * (1.6 + rnd() * 1.2), u = clamp01(p / 0.55 - rnd() * 0.35); sglow(g, hx + Math.cos(an) * d0 * (1 - easeIn2(u)), hy + Math.sin(an) * d0 * (1 - easeIn2(u)) * 0.8, 4, i % 3 ? GREEN : GREEN_L, 0.9 * k * (u < 1 ? 1 : 0)); }
        g.restore();
        energyBlade(g, hx, hy, hx + A.r * 0.75 * easeOut3(clamp01((p - 0.2) / 0.35)), hy - A.r * 1.05 * easeOut3(clamp01((p - 0.2) / 0.35)), A.r * 0.14, k, flick);
      } else {
        g.save(); lit(g); sglow(g, hx, hy, A.r * (0.8 + 0.6 * easeOut3(clamp01(p / 0.4))), CYAN, 0.6 * k); g.restore();
        heartCube(g, hx, hy - A.r * 0.1, A.r * 0.5 * easeOutBack(clamp01(p / 0.3)), k, { heart: false });
        ghostHand(g, hx, hy + A.r * 0.15, -Math.PI / 2 + 0.3, A.r * 0.6, k * 0.8, 0.2);
      }
      return;
    }
    case "lawGammaHex": {
      const to = okT(e.to) ? e.to : null;
      if (!to) return;
      const B = bodyAt(to.x, to.y, e.tsize || 1), applied = Array.isArray(e.applied) ? e.applied : ["burn", "bleed", "poison"], rnd = rngOf(seed);
      g.save(); lit(g); sglow(g, B.bx, B.hy, B.r * 1.5, GREEN, 0.5 * env(p, 0, 0.03, 0.08, 0.25)); g.restore();
      applied.forEach((kind, i) => {
        const d0 = 0.06 + i * 0.16, q = clamp01((p - d0) / 0.5), k = env(p, d0, d0 + 0.04, d0 + 0.32, d0 + 0.5), rgb = STATUS_RGB[kind] || WHITE;
        if (k <= 0) return;
        g.save(); lit(g);
        sglow(g, B.bx, B.hy, B.r * 1.3, rgb, 0.45 * k);
        if (kind === "burn") {
          for (let j = 0; j < (lowQ ? 3 : 6); j++) {
            const x = B.bx + (j / 5 - 0.5) * B.r * 1.4, h = B.r * (0.5 + 0.5 * rnd()) * (0.7 + 0.3 * Math.sin(now / 60 + j)), y = B.hy + B.r * 0.6 - q * B.r * 0.4;
            g.fillStyle = rgba(j % 2 ? BURN : YEL, 0.85 * k);
            g.beginPath(); g.moveTo(x - B.r * 0.14, y); g.quadraticCurveTo(x - B.r * 0.1, y - h * 0.6, x, y - h); g.quadraticCurveTo(x + B.r * 0.1, y - h * 0.6, x + B.r * 0.14, y); g.closePath(); g.fill();
          }
        } else if (kind === "bleed") {
          g.strokeStyle = rgba(BLEED, 0.95 * k); g.lineWidth = 2; g.lineCap = "round";
          g.beginPath(); for (let j = 0; j < 3; j++) { const ox = (j - 1) * B.r * 0.35; g.moveTo(B.bx + ox - B.r * 0.2, B.hy - B.r * 0.3); g.lineTo(B.bx + ox + B.r * 0.2, B.hy + B.r * 0.15); } g.stroke();
          g.globalCompositeOperation = "source-over";
          for (let j = 0; j < (lowQ ? 3 : 6); j++) { const x = B.bx + (rnd() - 0.5) * B.r * 1.2, y = B.hy + B.r * 0.3 + q * B.r * (1 + rnd()); g.fillStyle = rgba(BLEED, 0.9 * k); g.beginPath(); g.ellipse(x, y, B.r * 0.06, B.r * 0.1, 0, 0, TAU); g.fill(); }
        } else if (kind === "poison") {
          for (let j = 0; j < (lowQ ? 4 : 8); j++) {
            const ph = (q * 1.4 + rnd()) % 1, x = B.bx + (rnd() - 0.5) * B.r * 1.4, y = B.hy + B.r * 0.5 - ph * B.r * 1.6, rr = B.r * (0.06 + 0.08 * rnd());
            g.strokeStyle = rgba(POISON, 0.95 * k * (1 - ph)); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.stroke();
          }
        }
        g.restore();
      });
      // สถานะที่ได้ 3 เทิร์น = วงกระพริบสีนั้นสองจังหวะ
      const xr = STATUS_RGB[e.extra];
      if (xr) {
        const kx = env(p, 0.6, 0.66, 0.9, 1), pul = 0.5 + 0.5 * Math.sin(p * 40);
        g.save(); lit(g); hexPath(g, B.bx, B.hy, B.r * (1.15 + 0.12 * pul)); g.strokeStyle = rgba(xr, 0.9 * kx); g.lineWidth = 3; g.stroke(); sglow(g, B.bx, B.hy, B.r * 1.6, xr, 0.4 * kx); g.restore();
      }
      return;
    }
    case "lawHeartOut": {
      const to = okT(e.to) ? e.to : null;
      if (!to || !A) return;
      const B = bodyAt(to.x, to.y, e.tsize || 1), side = B.bx >= A.bx ? -1 : 1;
      const S = [B.bx, B.hy], U = [B.bx, B.hy - B.r * 1.4], E = [A.bx + side * A.r * 1.35, A.hy - A.r * 0.55], r = Math.max(7, B.r * 0.45);
      const beat = REDUCED ? 0 : Math.pow(Math.max(0, Math.sin(now / 200)), 6);
      if (p < 0.24) { const u = easeOutBack(clamp01(p / 0.24)); heartCube(g, lerp(S[0], U[0], clamp01(u)), lerp(S[1], U[1], clamp01(u)), r * (0.5 + 0.5 * u), 1, { beat }); g.save(); lit(g); sglow(g, S[0], S[1], B.r, RED, 0.5 * (1 - p / 0.24)); g.restore(); return; }
      const u = easeInOut(clamp01((p - 0.24) / 0.62)), mx = (U[0] + E[0]) / 2, my = Math.min(U[1], E[1]) - Math.max(A.r, Math.abs(E[0] - U[0]) * 0.3), v = 1 - u;
      const x = v * v * U[0] + 2 * v * u * mx + u * u * E[0], y = v * v * U[1] + 2 * v * u * my + u * u * E[1];
      if (!lowQ) { g.save(); lit(g); for (let j = 1; j <= 5; j++) { const uu = Math.max(0, u - j * 0.04), vv = 1 - uu; sglow(g, vv * vv * U[0] + 2 * vv * uu * mx + uu * uu * E[0], vv * vv * U[1] + 2 * vv * uu * my + uu * uu * E[1], r * (0.7 - j * 0.08), j % 2 ? RED_L : CYAN, 0.5 * (1 - j * 0.15)); } g.restore(); }
      const fin = clamp01((p - 0.86) / 0.14);
      heartCube(g, x, y, r * (1 - 0.35 * fin), 1, { beat });
      return;
    }
    case "lawSqueeze": {
      if (!A) return;
      const to = okT(e.to) ? e.to : null, hx = A.bx + A.r * 1.05, hy = A.hy - A.r * 0.1, r = Math.max(8, A.r * 0.55);
      const SQ = LAW_FX.squeeze / T, u = clamp01(p / SQ), sq = p < SQ ? 1 - 0.45 * easeIn2(u) : 0.55 + 0.45 * easeOutBack(clamp01((p - SQ) / (1 - SQ)));
      const tremble = REDUCED ? 0 : (p < SQ ? u : 0) * Math.sin(now / 18) * 1.5;
      g.save(); lit(g); sglow(g, hx, hy, r * (1.6 + u), RED, 0.6 * env(p, 0, 0.1, SQ, 1)); g.restore();
      heartCube(g, hx + tremble, hy, r, env(p, 0, 0.06, 0.88, 1), { squeeze: sq, crack: u * 0.8 });
      ghostHand(g, hx - r * 0.2, hy + r * 0.25, -Math.PI / 2 - 0.4, r * 1.4, env(p, 0, 0.08, SQ, SQ + 0.15) * 0.8, 0.3 + 0.6 * u);
      // สายชีพจรแดงวิ่งไปหาเหยื่อ (ไกลแค่ไหนก็ได้)
      if (to) {
        const V = bodyAt(to.x, to.y, e.tsize || 1), kl = env(p, SQ - 0.25, SQ - 0.15, SQ, SQ + 0.12);
        if (kl > 0) {
          const w = clamp01((p - SQ + 0.25) / 0.25);
          g.save(); lit(g); g.lineCap = "round";
          g.strokeStyle = rgba(RED_L, 0.45 * kl); g.lineWidth = 1.4; g.beginPath(); g.moveTo(hx, hy); g.lineTo(V.bx, V.hy); g.stroke();
          sglow(g, lerp(hx, V.bx, w), lerp(hy, V.hy, w), r * 0.8, RED_L, 0.9 * kl);
          g.restore();
        }
      }
      return;
    }
    case "lawSqueezeHit": {
      const to = okT(e.to) ? e.to : null;
      if (!to) return;
      const B = bodyAt(to.x, to.y, e.tsize || 1), q = clamp01(p);
      hexPath(g, B.bx, B.hy, B.r); g.fillStyle = rgba(RED, 0.55 * env(q, 0, 0.02, 0.1, 0.45)); g.fill();
      g.save(); lit(g);
      for (let i = 0; i < (lowQ ? 1 : 2); i++) { const qq = clamp01(q * 1.5 - i * 0.2); if (qq <= 0 || qq >= 1) continue; heartPath(g, B.bx, B.hy, B.r * (0.5 + 1.5 * easeOut3(qq))); g.strokeStyle = rgba(RED_L, 0.85 * (1 - qq)); g.lineWidth = 3 - i; g.stroke(); }
      sglow(g, B.bx, B.hy, B.r * 2, RED, 0.6 * env(q, 0, 0.02, 0.08, 0.4));
      g.restore();
      gEllipse(g, to.x + (e.tsize || 1) / 2, to.y + (e.tsize || 1) / 2, 0.3 + 0.6 * easeOut3(q), 0.02, 30);
      g.save(); lit(g); g.strokeStyle = rgba(RED_L, 0.6 * (1 - q)); g.lineWidth = 2; g.stroke(); g.restore();
      return;
    }
    case "lawHeartGone": {
      if (!A) return;
      const S = [A.bx + A.r * 1.35, A.hy - A.r * 0.55], r = Math.max(6, A.r * 0.32);
      if (e.why === "dead") {
        const q = clamp01(p / 0.8), rnd = rngOf(seed);
        heartCube(g, S[0], S[1], r, 1 - clamp01((q - 0.3) / 0.3), { crack: clamp01(q / 0.3) });
        if (q > 0.3) { g.save(); lit(g); for (let i = 0; i < (lowQ ? 5 : 10); i++) { const an = rnd() * TAU, d = r * 2.4 * easeOut3((q - 0.3) / 0.7); sglow(g, S[0] + Math.cos(an) * d, S[1] + Math.sin(an) * d + d * 0.3, 3, i % 2 ? RED_L : RED, 0.9 * (1 - q)); } g.restore(); }
        return;
      }
      const to = okT(e.to) ? e.to : null;
      if (!to) { heartCube(g, S[0], S[1] - p * r * 2, r, 1 - p); return; }
      const V = bodyAt(to.x, to.y, e.tsize || 1), u = easeInOut(clamp01(p / 0.75)), mx = (S[0] + V.bx) / 2, my = Math.min(S[1], V.hy) - A.r * 1.4, v = 1 - u;
      const x = v * v * S[0] + 2 * v * u * mx + u * u * V.bx, y = v * v * S[1] + 2 * v * u * my + u * u * V.hy;
      heartCube(g, x, y, r * (1 - 0.4 * clamp01((p - 0.6) / 0.15)), 1 - clamp01((p - 0.72) / 0.08));
      const kg = env(p, 0.7, 0.76, 0.85, 1);
      if (kg > 0) { g.save(); lit(g); sglow(g, V.bx, V.hy, V.r * 1.4, RED_L, 0.6 * kg); g.restore(); }
      return;
    }
    case "lawShock": {
      const to = okT(e.to) ? e.to : null;
      if (!to) return;
      const B = bodyAt(to.x, to.y, e.tsize || 1), JOLT = LAW_FX.shock - 40;
      const L = [B.bx - B.r * 0.6, B.hy + B.r * 0.15], R = [B.bx + B.r * 0.6, B.hy + B.r * 0.15];
      // แผ่นกระตุก 2 ข้าง + สายฟ้าแตกระหว่างกัน (ถี่ขึ้นจนกระตุก)
      const kc = env(t, 0, 80, JOLT, JOLT + 120), ramp = clamp01(t / JOLT);
      if (kc > 0) {
        g.save(); lit(g); sglow(g, L[0], L[1], B.r * 0.55, YEL, 0.8 * kc); sglow(g, R[0], R[1], B.r * 0.55, YEL, 0.8 * kc); g.restore();
        const nArc = lowQ ? 1 : 1 + Math.round(ramp * 2);
        for (let i = 0; i < nArc; i++) zap(g, L[0], L[1] - i * B.r * 0.12, R[0], R[1] + i * B.r * 0.1, seed + i * 11 + flick, kc * (0.6 + 0.4 * ramp), 1.4 + ramp, { jitter: 0.35, lowQ });
        if (!lowQ && ramp > 0.4) zap(g, B.bx, B.hy - B.r * 0.9, L[0], L[1], seed + 77 + flick, kc * ramp * 0.7, 1.1, { lowQ });
      }
      // กระตุกใหญ่: แฟลช + สายฟ้าแผ่รอบ + วงบนพื้น
      if (t >= JOLT) {
        const dt = t - JOLT, q = clamp01(dt / (T - JOLT)), kb = env(dt, 0, 15, 90, 260);
        g.save(); lit(g); sglow(g, B.bx, B.hy, B.r * 3, YEL_W, 0.85 * kb); sglow(g, B.bx, B.hy, B.r * 1.1, WHITE, kb); g.restore();
        for (let i = 0; i < (lowQ ? 4 : 8); i++) { const an = (i / 8) * TAU + 0.3, l = B.r * (1.6 + 0.6 * ((i * 7) % 3) / 2); zap(g, B.bx, B.hy, B.bx + Math.cos(an) * l, B.hy + Math.sin(an) * l * 0.8, seed + 40 + i + flick, env(dt, 0, 10, 120, 300), 1.6, { lowQ }); }
        gEllipse(g, to.x + (e.tsize || 1) / 2, to.y + (e.tsize || 1) / 2, 0.3 + 1.1 * easeOut3(q), 0.03, 32);
        g.save(); lit(g); g.strokeStyle = rgba(YEL, 0.8 * (1 - q)); g.lineWidth = 3; g.stroke(); g.restore();
      }
      return;
    }
    case "lawRevived": {
      const to = okT(e.to) ? e.to : null;
      if (!to) return;
      const B = bodyAt(to.x, to.y, e.tsize || 1), q = clamp01(p), k = env(q, 0, 0.08, 0.6, 1), rnd = rngOf(seed);
      g.save(); lit(g);
      sglow(g, B.bx, B.hy, B.r * 1.8, GREEN_L, 0.55 * k);
      gEllipse(g, to.x + (e.tsize || 1) / 2, to.y + (e.tsize || 1) / 2, 0.35 + 0.5 * easeOut3(q), 0.03, 30); g.strokeStyle = rgba(GREEN_L, 0.8 * (1 - q)); g.lineWidth = 2.5; g.stroke();
      if (!lowQ) for (let i = 0; i < 10; i++) { const ph = clamp01(q * 1.3 - rnd() * 0.3), x = B.bx + (rnd() - 0.5) * B.r * 2, y = B.by - ph * B.s * 1.5; sglow(g, x, y, 5, i % 3 ? GREEN_L : WHITE, 0.9 * (1 - ph) * clamp01(ph * 6)); }
      // เส้นชีพจรพาดตัว (วาดไล่จากซ้ายไปขวา)
      const w = clamp01(q / 0.45), W = B.r * 2.4, x0 = B.bx - W / 2, yb = B.hy + B.r * 0.1;
      const ecg = [[0, 0], [0.32, 0], [0.4, -0.12], [0.46, 0.08], [0.52, -0.62], [0.58, 0.42], [0.64, 0], [1, 0]];
      g.beginPath();
      let done = false;
      for (let i = 0; i < ecg.length && !done; i++) {
        let [u, v] = ecg[i];
        if (u > w) { const [u0, v0] = ecg[i - 1], f = (w - u0) / (u - u0 || 1); u = w; v = lerp(v0, v, f); done = true; }
        const x = x0 + u * W, y = yb + v * B.r;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.strokeStyle = rgba(GREEN_L, 0.95 * k); g.lineWidth = 2.2; g.lineJoin = "round"; g.stroke();
      g.restore();
      return;
    }
    case "lawUnmark": return; // ชิ้นส่วนลอยกลับมาต่อกัน (drawSlice)
    case "lawMark": {
      const to = okT(e.to) ? e.to : null;
      if (!to) return;
      const B = bodyAt(to.x, to.y, e.tsize || 1), grow = easeOut3(clamp01(p / 0.25)), k = 1 - clamp01((p - 0.5) / 0.5) * 0.3;
      incision(g, B.bx, B.hy, -0.62, B.r * 2.3, k, grow, 0);
      const c = Math.cos(-0.62), s = Math.sin(-0.62), hx = B.bx + c * B.r * 1.15 * (grow * 2 - 1), hy = B.hy + s * B.r * 1.15 * (grow * 2 - 1);
      g.save(); lit(g); sglow(g, hx, hy, B.r * 0.5, WHITE, (1 - clamp01(p / 0.4)) * 0.9); g.restore();
      twinkle(g, hx, hy, B.r * 0.35, env(p, 0.1, 0.2, 0.25, 0.45));
      return;
    }
    default:
  }
}

// ---------- จุดเข้า ----------
export function lawFx(g, e, now, lowQ, law) {
  if (e.kind in LAW_MS) { styleFx(g, e, now, lowQ); return; }
  eventFx(g, e, now, lowQ, law || null);
}

// socket "lawFx" { kind, id, color, at, size, ... } → { fx, look: [[pos, ms]], shake: [ms], busy: [{ id, ms }], later: [[ms, fx[]]] } (BoardStage)
//  ctx = { posOf(id), sizeOf(id), colorOf?(id) } · เลขดาเมจของสกิล (โยนสิ่งของ / บีบหัวใจ) มากับเหตุการณ์ที่ server ลงผล
export function lawEventFx(ev, ctx = {}) {
  const out = { fx: [], look: [], shake: [], busy: [], later: [] };
  if (!ev || typeof ev.kind !== "string") return out;
  const kind = EVENT_FX[ev.kind];
  if (!kind) return out;
  const sizeOf = ctx.sizeOf || (() => 1), posOf = ctx.posOf || (() => null), colorOf = ctx.colorOf || (() => null);
  const f = { kind, id: ev.id, at: ev.at, size: ev.size || 1, color: ev.color };
  for (const k of ["room", "objects", "why", "tile", "obj", "a", "b", "to", "hits", "n", "ult", "targetId", "applied", "extra", "left", "dmg", "kill", "tiles", "hitId", "dodge", "ids"]) if (ev[k] !== undefined) f[k] = ev[k];
  if (ev.targetId != null) f.tsize = sizeOf(ev.targetId) || 1;
  const fl = (pos, text, ids, size = 30) => ({ kind: "float", x: pos.x, y: pos.y, text, size, hitIds: ids });
  const soulRgb = (id, def) => { const c = colorOf(id); return c ? mixRgb(rgbOf(normColor(c)), [255, 255, 255], 0.35) : def; };
  switch (ev.kind) {
    case "roomOpen": if (okT(ev.at)) out.look.push([ev.at, 0]); out.shake.push(120); break;
    case "roomClose": if (ev.why === "skill") out.shake.push(560); break;
    case "cut": if (okT(ev.tile)) out.look.push([ev.tile, 0]); break;
    case "shuffle":
      for (const s of [ev.a, ev.b]) if (s && typeof s.id === "string" && !s.id.startsWith("obj:")) out.busy.push({ id: s.id, ms: LAW_FX.shuffle + 1500 });
      if (ev.a && okT(ev.a.to)) out.look.push([ev.a.to, 0]);
      break;
    case "takt":
      if (okT(ev.tile)) out.look.push([ev.tile, 0]);
      out.shake.push(LAW_FX.takt);
      // คนบนช่องสั่นตอนหนามพุ่ง (BoardCanvas: hitIds + hitDelay) · ตัวเลขดาเมจ = ถ้า server ส่ง dmg มา
      if (ev.hitId != null) { f.hitIds = [ev.hitId]; f.hitDelay = LAW_FX.takt; }
      if (okT(ev.tile) && (ev.dmg != null || ev.dodge)) out.later.push([LAW_FX.takt, [fl(ev.tile, ev.dodge ? "หลบ" : `-${ev.dmg | 0}`, undefined, 30)]]);
      break;
    case "throw": if (okT(ev.to)) out.look.push([ev.to, 280]); break;
    case "throwHit": {
      const to = okT(ev.to) ? ev.to : null;
      if (to) out.look.push([to, 0]);
      out.shake.push(0);
      for (const h of Array.isArray(ev.hits) ? ev.hits : []) { const pos = posOf(h.id) || to; if (pos) out.fx.push(fl(pos, h.dodge ? "หลบ" : `-${h.dmg | 0}`, h.dodge ? undefined : [h.id], 32)); }
      break;
    }
    case "shamble": f.ca = soulRgb(ev.a && ev.a.id, RED_L); f.cb = soulRgb(ev.b && ev.b.id, CYAN); if (ev.a && okT(ev.a.at)) out.look.push([ev.a.at, 0]); break;
    case "shambleDone": f.ca = soulRgb(ev.a && ev.a.id, RED_L); f.cb = soulRgb(ev.b && ev.b.id, CYAN); break;
    case "squeeze": if (okT(ev.at)) out.look.push([ev.at, 0]); break;
    case "squeezeHit": if (okT(ev.to)) { out.look.push([ev.to, 0]); out.fx.push(fl(ev.to, `-${ev.dmg | 0}`, [ev.targetId], 32)); } out.shake.push(0); break;
    case "shock": if (okT(ev.to)) out.look.push([ev.to, 0]); out.shake.push(LAW_FX.shock - 40); break;
    default:
  }
  out.fx.unshift(f);
  return out;
}
