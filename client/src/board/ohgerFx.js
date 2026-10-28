// ============================================================
//  เอฟเฟกต์บนกระดานของขบวนการจอมราชันคิงโอเจอร์ (characters/_ohger.js · GRID_PLAN §7.22) — Ohger Finish + คลื่นดาบคุวากาตะ
//  socket "ohgerFx" { kind, id, color, from, tiles, dir, target? } → ohgerEventFx → { fx, look, shake }
//   ร่าง = ev.form (kuwagata | tonbo | kamakiri | papiyon | hachi) · ไม่มี form = เดาจากรูปพื้นที่ (formOf)
//   slash คุวากาตะ (4×4) → ohCleave: ตราราชันใต้ตัว + เขาคีมด้วง 2 เล่มชูขึ้น → ใบคีม 2 ใบตกจากฟ้าพร้อมหนีบเข้าแกนกลาง →
//          ปะทะที่ OHGER_FX.hit: รอยผ่าแกนกลาง + รอยร้าวแตกออกด้านข้าง + คลื่นกระแทก + ทุกช่องวาบ + ตรามงกุฎประทับ + ประกาย
//   slash คามาคิริ (4×5) → ohReap: ใบเคียวตั๊กแตน (โค้ง ปลายงอ) เกี่ยวกวาดด้านข้างเป็นพัด (ตัดตามกรอบ) → ปะทะ: รอยฟันขวางรัศมี + ตรา →
//          แถวกลางเรือง + ลูกศรบั้งในแถวข้างวิ่งเข้าหาแถวกลาง (server ดึงที่ hit + 0.5 วิ)
//   dash   ทอมโบ (ไปแล้วย้อนกลับ) / พาพิยอง (ทางเดียว แล้วฟันเป้า) → ohDash: แถบแสงความเร็วตามหัวที่พุ่ง
//          (OHGER_FX.dashStep ต่อช่อง = จังหวะ anim "move" ของ state.dash style "ohger") + เส้นความเร็วบนพื้น
//          ทอมโบ: ปีกแมลงปอ 4 แผ่นกระพือที่หัว · ทั้งแนววาบที่ pass1 / pass2
//          พาพิยอง: ปีกผีเสื้อกระพือค้างตามช่องที่ผ่าน · ที่เป้า (OHGER_FX.hit) ฟันไขว้ + ปีกผีเสื้อกาง + ประกายดาว
//          พาพิยอง server ส่ง from = ช่องปลายทาง (ย้ายตัวก่อนส่ง) → ohgerEventFx หาช่องเริ่มจากช่องแรกของแนวพุ่งแทน
//   needle ฮาจิ (แนว 5) → ohNeedle: ประกายที่ตัว → เข็มเหล็กในผึ้ง (หัวหนามมืดขอบเงิน) พุ่งตามแนว ·
//          ช่องที่เข็มผ่าน = ประกาย + หกเหลี่ยมรังผึ้ง (ช่องสุดท้ายที่ OHGER_FX.hit)
//   wave   (คุวากาตะ ติดตัว — แนว 4×1 ไปข้างหลัง) → ohWave: คลื่นจันทร์เสี้ยวสีร่างวิ่งตามแนว ช่องที่ผ่านวาบ
//  สี: color ของร่าง · สีหม่น (ฮาจิ ดำเงิน #c9ced8) = ขอบเงิน/ขาวบนแกนมืด · ทุกขอบมีเงาเข้มรองใต้ (เห็นชัดทั้งพื้นสว่าง/มืด)
//  lowQ = ไม่มีประกาย/ชั้นเรือง/ปีก · ลดการเคลื่อนไหว = ไม่มีประกาย/ปีก/ตราขยาย (ฉากหลักยังเล่น บอกพื้นที่โดน)
//  ไม่มีเสียงฝั่งนี้ (server ส่งเสียงเอง)
// ============================================================
import { P, gEllipse, glow, hexPath, normColor, quad, rgbOf } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ---------- จังหวะ (ms) — ตรงกับ BEAT ใน characters/_ohger.js (hit 0.35 · pass 0.45 × 2 · wave 0.6) ----------
export const OHGER_FX = { hit: 350, pass1: 450, pass2: 900, dashStep: 90, wind: 140, needleCharge: 110, wave: 600, waveReach: 380 };
// ตีปกติร่างสวมเกราะ (attackStyle "ohAtk1".."ohAtk5" — STYLE_MS / STYLE_HIT_P ใน boardDraw) · ปะทะที่ 385 ms = จังหวะชนของ anim "lunge"
//  (BoardStage พุ่งเข้าเมื่อห่าง ≤ 2 แบบดาบคาซุมะ · LUNGE_MS 620 × 0.62)
export const OHGER_MS = { ohAtk1: 850, ohAtk2: 850, ohAtk3: 850, ohAtk4: 850, ohAtk5: 850 };
export const OHGER_HIT_P = { ohAtk1: 0.453, ohAtk2: 0.453, ohAtk3: 0.453, ohAtk4: 0.453, ohAtk5: 0.453 };
export const OHGER_FX_DUR = { ohSlash: 1000, ohDash: 1200, ohNeedle: 850, ohWave: 650, ...OHGER_MS };
export const isOhgerFx = (kind) => typeof kind === "string" && (kind in OHGER_FX_DUR);

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ---------- คณิต ----------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const rgba = (rgb, a) => `rgba(${rgb},${clamp01(a)})`;
const okT = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const env = (t, a, b, c, d) => (t <= a || t >= d ? 0 : t < b ? (t - a) / (b - a) : t <= c ? 1 : (d - t) / (d - c));

// ---------- สี ----------
const PALS = new Map();
function palOf(hex) {
  const c = normColor(hex);
  if (PALS.has(c)) return PALS.get(c);
  const [r, g, b] = rgbOf(c);
  const silver = Math.max(r, g, b) - Math.min(r, g, b) < 32;
  const mix = (k) => [r, g, b].map((v) => Math.round(v + (255 - v) * k)).join(",");
  const pal = {
    main: `${r},${g},${b}`,
    hi: silver ? "240,244,252" : mix(0.5),
    core: silver ? "255,255,255" : mix(0.85),
    dark: silver ? "10,12,18" : [r, g, b].map((v) => Math.round(v * 0.2)).join(","),
    fill: silver ? "34,38,50" : `${r},${g},${b}`, // พื้นช่องที่โดน (ฮาจิ = เงามืด ขอบเงิน)
    silver,
  };
  PALS.set(c, pal);
  return pal;
}

// ---------- ชิ้นส่วนภาพ ----------
function pathS(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); }
// ขอบแสง 3 ชั้น: เงาเข้มรอง → สีร่าง → แกนขาว
function edge(g, pts, w, pal, a, lowQ) {
  if (a <= 0.01 || pts.length < 2) return;
  g.lineCap = "round"; g.lineJoin = "round"; g.globalCompositeOperation = "source-over";
  pathS(g, pts);
  g.strokeStyle = rgba(pal.dark, 0.65 * a); g.lineWidth = w * 2.3; g.stroke();
  g.strokeStyle = rgba(pal.main, a); g.lineWidth = w * 1.25; g.stroke();
  if (!lowQ || pal.silver) { g.strokeStyle = rgba(pal.core, a); g.lineWidth = Math.max(1, w * 0.45); g.stroke(); }
}
// เส้นบนกระดาน (x, y, z) → จุดบนจอ (สุ่มจุดกลางทาง — ผิวกระบอก Colony โค้งตาม)
function lineP(ax, ay, bx, by, z, n = 6) {
  const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, p = P(lerp(ax, bx, t), lerp(ay, by, t), z); out.push(p); }
  return out;
}
// กรอบสี่เหลี่ยม (หน่วยช่อง) บนพื้น
function rectPts(x0, y0, x1, y1, z) {
  return [...lineP(x0, y0, x1, y0, z, 4), ...lineP(x1, y0, x1, y1, z, 4).slice(1), ...lineP(x1, y1, x0, y1, z, 4).slice(1), ...lineP(x0, y1, x0, y0, z, 4).slice(1)];
}
// ตราราชัน: วงแหวน + มงกุฎ 3 ยอด (ยอดชี้ไปทิศ D) บนพื้น · u = ข้าง (S) · v = หน้า (D)
const CROWN = [[-0.78, -0.38], [-0.78, 0.12], [-0.98, 0.52], [-0.44, 0.22], [0, 0.66], [0.44, 0.22], [0.98, 0.52], [0.78, 0.12], [0.78, -0.38]];
function crest(g, cx, cy, D, S, sc, pal, a, lowQ, z = 0.03) {
  if (a <= 0.01) return;
  const at = (u, v) => P(cx + S[0] * u * sc + D[0] * v * sc, cy + S[1] * u * sc + D[1] * v * sc, z);
  const w = Math.max(1.2, P(cx, cy, z)[2] * 0.03);
  const ring = [];
  for (let i = 0; i <= 40; i++) { const t = (i / 40) * TAU; ring.push(at(Math.cos(t) * 1.25, Math.sin(t) * 1.25)); }
  const crown = CROWN.map(([u, v]) => at(u, v));
  crown.push(crown[0]);
  g.globalCompositeOperation = "source-over";
  pathS(g, crown); g.closePath(); g.fillStyle = rgba(pal.fill, 0.22 * a); g.fill();
  edge(g, ring, w * 0.8, pal, 0.75 * a, lowQ);
  edge(g, crown, w, pal, a, lowQ);
  const [jx, jy, js] = at(0, -0.08);
  g.fillStyle = rgba(pal.core, a); g.beginPath(); g.arc(jx, jy, Math.max(1.5, js * sc * 0.05), 0, TAU); g.fill();
}
// ประกายพุ่งขึ้นแล้วตก (ตามเวลา ไม่สุ่มต่อเฟรม) · origin = จุดบนกระดาน
function sparks(g, list, age, life, pal, seed) {
  if (age < 0 || age > life) return;
  const q = age / life;
  g.lineCap = "round"; g.globalCompositeOperation = "source-over";
  list.forEach(([x, y], i) => {
    const r1 = hash01(seed + i * 3.1), r2 = hash01(seed + i * 7.7), r3 = hash01(seed + i * 1.3);
    const th = r1 * TAU, sp = 0.35 + r2 * 0.6, up = 1.1 + r3 * 1.2;
    const f = q * (life / 1000);
    const px = x + Math.cos(th) * sp * f * 1.6, py = y + Math.sin(th) * sp * f * 1.6, pz = 0.25 + up * f - 3.2 * f * f;
    const ox = x + Math.cos(th) * sp * Math.max(0, f - 0.05) * 1.6, oy = y + Math.sin(th) * sp * Math.max(0, f - 0.05) * 1.6, oz = 0.25 + up * Math.max(0, f - 0.05) - 3.2 * Math.pow(Math.max(0, f - 0.05), 2);
    const a = P(px, py, Math.max(0.02, pz)), b = P(ox, oy, Math.max(0.02, oz));
    g.strokeStyle = rgba(pal.hi, 1 - q); g.lineWidth = Math.max(1, a[2] * 0.025);
    g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(a[0], a[1]); g.stroke();
  });
}

// ---------- รูปทรงของเหตุการณ์ (คำนวณครั้งเดียวต่อ fx) ----------
// ร่างของเหตุการณ์: server ส่ง form · ไม่มี = เดาจากรูปพื้นที่ (slash กว้าง 5 = คามาคิริ · dash ไปกลับ = ทอมโบ)
const FORMS = { kuwagata: 1, tonbo: 1, kamakiri: 1, papiyon: 1, hachi: 1 };
function formOf(e) {
  if (FORMS[e.form]) return e.form;
  if (e.kind === "ohDash") return e.back ? "tonbo" : "papiyon";
  if (e.kind === "ohNeedle") return "hachi";
  if (e.kind === "ohSlash") { const G = geoOf(e); return G.rect && Math.min(G.rect.x1 - G.rect.x0, G.rect.y1 - G.rect.y0) < 5 && Math.max(G.rect.x1 - G.rect.x0, G.rect.y1 - G.rect.y0) >= 5 ? "kamakiri" : "kuwagata"; }
  return "kuwagata";
}
// ปีกผีเสื้อคู่ (บน 2 กลีบ ล่าง 2 กลีบ) ที่จุดบนจอ · ang = ทิศลำตัวบนจอ · open 0..1 = กางปีก
function wingPair(g, cx, cy, sc, ang, open, pal, a, lw = 1) {
  if (a <= 0.01) return;
  for (const s of [-1, 1]) {
    for (const [len, wid, tilt] of [[0.85, 0.5, -0.55], [0.6, 0.38, 0.6]]) {
      const an = ang + s * (Math.PI / 2 + tilt * open);
      const L = sc * len * (0.4 + 0.6 * open), Wd = sc * wid * (0.4 + 0.6 * open);
      const ex = cx + Math.cos(an) * L, ey = cy + Math.sin(an) * L, nx = -Math.sin(an) * Wd, ny = Math.cos(an) * Wd;
      g.beginPath(); g.moveTo(cx, cy);
      g.bezierCurveTo(cx + nx * 0.4 + (ex - cx) * 0.3, cy + ny * 0.4 + (ey - cy) * 0.3, ex + nx, ey + ny, ex, ey);
      g.bezierCurveTo(ex - nx, ey - ny, cx - nx * 0.4 + (ex - cx) * 0.3, cy - ny * 0.4 + (ey - cy) * 0.3, cx, cy);
      g.fillStyle = rgba(pal.main, 0.3 * a); g.fill();
      g.strokeStyle = rgba(pal.core, 0.75 * a); g.lineWidth = Math.max(1, lw); g.stroke();
    }
  }
}
// ประกายดาว 4 แฉก
function star(g, x, y, r, pal, a) {
  if (a <= 0.01) return;
  g.beginPath();
  for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.22 : r; g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
  g.closePath(); g.fillStyle = rgba(pal.core, a); g.fill();
  g.strokeStyle = rgba(pal.main, 0.8 * a); g.lineWidth = 1; g.stroke();
}
function geoOf(e) {
  if (e._g) return e._g;
  const D = DIRS[e.dir] || [0, 1], S = [-D[1], D[0]];
  const st = okT(e.from) ? e.from : e.tiles[0];
  const px = st.x + 0.5, py = st.y + 0.5;
  const along = (t) => (t.x + 0.5 - px) * D[0] + (t.y + 0.5 - py) * D[1];
  const lat = (t) => (t.x + 0.5 - px) * S[0] + (t.y + 0.5 - py) * S[1];
  const tiles = e.tiles.slice().sort((a, b) => along(a) - along(b) || lat(a) - lat(b));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const t of tiles) { x0 = Math.min(x0, t.x); y0 = Math.min(y0, t.y); x1 = Math.max(x1, t.x + 1); y1 = Math.max(y1, t.y + 1); }
  e._g = { D, S, px, py, tiles, along, lat, rect: tiles.length ? { x0, y0, x1, y1 } : null };
  return e._g;
}

// ============================================================ slash คุวากาตะ — เขาด้วงคีมผ่าลงจากฟ้าทั้งกรอบ 4×4
//  ง้าง: เขาคีม 2 เล่มชูขึ้นเหนือตัว · ผ่า: ใบดาบยาวทั้งกรอบตกจากสูงลงพื้นตามแกนกลาง (ม่านแสงตามหลัง) · ปะทะ: พื้นแยกเป็นรอยร้าวจากแกนกลาง + คลื่นกระแทก
function ohCleave(g, e, now, lowQ) {
  const T = OHGER_FX_DUR.ohSlash, t = now - e.t0;
  if (t < 0 || t > T) return;
  const G = geoOf(e), pal = palOf(e.color);
  if (!G.rect) return;
  const { D, S, px, py, rect } = G, W = OHGER_FX.wind, HIT = OHGER_FX.hit;
  const cx = (rect.x0 + rect.x1) / 2, cy = (rect.y0 + rect.y1) / 2;
  const hA = Math.abs((rect.x1 - rect.x0) * D[0]) / 2 + Math.abs((rect.y1 - rect.y0) * D[1]) / 2; // ครึ่งความยาวตามทิศ
  const hL = Math.abs((rect.x1 - rect.x0) * S[0]) / 2 + Math.abs((rect.y1 - rect.y0) * S[1]) / 2; // ครึ่งความกว้าง
  const ax = cx - D[0] * hA, ay = cy - D[1] * hA, bx = cx + D[0] * hA, by = cy + D[1] * hA;
  const sc = P(cx, cy, 0.02)[2];
  g.save();
  crest(g, px, py, D, S, 0.42, pal, env(t, 0, 80, 300, 520), lowQ);
  // เขาคีม 2 เล่มชูเหนือตัว (โค้งเข้าหากันที่ปลาย) แล้วฟาดลงไปข้างหน้า
  if (t < HIT) {
    const up = t < W ? easeOut3(t / W) : 1 - Math.pow((t - W) / (HIT - W), 2), k = clamp01(t / 60);
    for (const s of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const u = i / 8, lat = s * (0.28 + 0.22 * Math.sin(Math.PI * u * 0.9) - 0.32 * u * u);
        const fw = (1 - up) * u * 1.6;
        pts.push(P(px + S[0] * lat + D[0] * fw, py + S[1] * lat + D[1] * fw, 0.5 + up * 1.7 * u + (1 - up) * 0.4 * u));
      }
      edge(g, pts, Math.max(2, pts[0][2] * 0.075), pal, k, lowQ);
    }
    if (!lowQ) { const [hx, hy, hs] = P(px, py, 0.5 + up * 1.5); g.globalCompositeOperation = "lighter"; glow(g, hx, hy, hs * 0.5, pal.hi, 0.5 * k * up); }
  }
  // ใบผ่าตกลงจากฟ้า (เร่งลง) + ม่านแสงตามหลัง + เงาบนพื้นเข้มขึ้น
  if (t >= W && t < HIT + 50) {
    const q = t < HIT ? Math.pow((t - W) / (HIT - W), 2) : 1, z = lerp(2.6, 0.05, q), k = t < HIT ? 1 : 1 - (t - HIT) / 50;
    g.globalCompositeOperation = "source-over";
    pathS(g, rectPts(rect.x0, rect.y0, rect.x1, rect.y1, 0.01)); g.closePath(); g.fillStyle = rgba(pal.dark, 0.28 * q * k); g.fill();
    // เขาคีม 2 ใบ: ตกลงพร้อมหนีบเข้าหาแกนกลาง (ถึงพื้นตรงแกนกลางตอนปะทะ)
    const zt = Math.min(2.8, z + 0.25 + 1.1 * (1 - q));
    for (const s of [-1, 1]) {
      const o = s * hL * 0.8 * (1 - q), oT = s * hL * 0.8 * Math.min(1, (1 - q) + 0.25);
      const lo = lineP(ax + S[0] * o, ay + S[1] * o, bx + S[0] * o, by + S[1] * o, z, 6);
      const hi = lineP(ax + S[0] * oT, ay + S[1] * oT, bx + S[0] * oT, by + S[1] * oT, zt, 6);
      pathS(g, [...lo, ...hi.slice().reverse()]); g.closePath(); g.fillStyle = rgba(pal.main, 0.22 * k); g.fill();
      edge(g, lo, Math.max(3, P(cx, cy, z)[2] * 0.1), pal, k, lowQ);
    }
    if (!lowQ) { const [mx, my, ms] = P(cx, cy, z); g.globalCompositeOperation = "lighter"; glow(g, mx, my, ms * 1.1, pal.hi, 0.4 * k); }
  }
  if (t >= HIT) {
    const aT = t - HIT, k = 1 - clamp01(aT / (T - HIT)), flash = 1 - clamp01(aT / 130), grow = easeOut3(clamp01(aT / 150));
    g.globalCompositeOperation = "source-over";
    G.tiles.forEach((tl) => {
      quad(g, tl.x, tl.y, 0.04, 0.01); g.fillStyle = rgba(pal.fill, 0.42 * k * k); g.fill();
      if (flash > 0) { quad(g, tl.x, tl.y, 0.04, 0.01); g.fillStyle = rgba(pal.core, 0.55 * flash); g.fill(); }
    });
    // รอยผ่าตามแกนกลาง + รอยร้าวแตกออกด้านข้าง
    edge(g, lineP(ax, ay, bx, by, 0.02, 8), Math.max(2.5, sc * 0.09), pal, k, lowQ);
    const NC = lowQ ? 6 : 10;
    for (let i = 0; i < NC; i++) {
      const s = i % 2 ? 1 : -1, f = (Math.floor(i / 2) + 0.5) / (NC / 2), r1 = hash01(i * 5.1 + 3), r2 = hash01(i * 2.3 + 9);
      let x = ax + (bx - ax) * f, y = ay + (by - ay) * f;
      const pts = [P(x, y, 0.02)], seg = 3, len = hL * (0.7 + 0.3 * r1) * grow;
      for (let j = 1; j <= seg; j++) {
        const jit = (hash01(i * 7 + j) - 0.5) * 0.5;
        x += S[0] * s * len / seg + D[0] * jit * (0.4 + r2 * 0.3); y += S[1] * s * len / seg + D[1] * jit * (0.4 + r2 * 0.3);
        pts.push(P(x, y, 0.02));
      }
      edge(g, pts, Math.max(1.2, sc * 0.03), pal, k, lowQ);
    }
    edge(g, rectPts(rect.x0, rect.y0, rect.x1, rect.y1, 0.02), Math.max(1.5, sc * 0.04), pal, k, lowQ);
    // คลื่นกระแทก
    const ring = clamp01(aT / 380);
    if (ring < 1) { g.strokeStyle = rgba(pal.hi, 0.85 * (1 - ring)); g.lineWidth = Math.max(1.5, sc * 0.06 * (1 - ring)); gEllipse(g, cx, cy, 0.3 + ring * Math.hypot(hA, hL), 0.03, 40); g.stroke(); }
    const pop = REDUCED ? 1 : 1 + 0.25 * (1 - easeOut3(clamp01(aT / 220)));
    crest(g, cx, cy, D, S, Math.min(1.25, Math.min(hA, hL) * 0.72) * pop, pal, k, lowQ);
    if (!lowQ) {
      const [gx, gy, gs] = P(cx, cy, 0.4);
      g.globalCompositeOperation = "lighter"; glow(g, gx, gy, gs * 2.4, pal.main, 0.55 * flash);
      if (!REDUCED) {
        const src = [];
        for (let i = 0; i < 20; i++) { const f = hash01(i * 3.7 + 2); src.push([lerp(ax, bx, f), lerp(ay, by, f)]); }
        sparks(g, src, aT, 560, pal, 23);
      }
    }
  }
  g.restore();
}

// ============================================================ slash คามาคิริ — เคียวตั๊กแตนเกี่ยวกวาดด้านข้างทั้งกรอบ 4×5 แล้วดึงเข้าแถวกลาง
function ohReap(g, e, now, lowQ) {
  const T = OHGER_FX_DUR.ohSlash, t = now - e.t0;
  if (t < 0 || t > T) return;
  const G = geoOf(e), pal = palOf(e.color);
  if (!G.rect) return;
  const { D, S, px, py, rect } = G, W = OHGER_FX.wind, HIT = OHGER_FX.hit;
  // มุมกวาด: มุมของมุมกรอบเทียบกับทิศ D (กรอบอยู่หน้าตัว — ไม่เกิน ±90°)
  if (!G.sweep) {
    const base = Math.atan2(D[1], D[0]);
    let lo = Infinity, hi = -Infinity, R = 0;
    for (const [cx, cy] of [[rect.x0, rect.y0], [rect.x1, rect.y0], [rect.x1, rect.y1], [rect.x0, rect.y1]]) {
      let a = Math.atan2(cy - py, cx - px) - base;
      while (a > Math.PI) a -= TAU;
      while (a < -Math.PI) a += TAU;
      lo = Math.min(lo, a); hi = Math.max(hi, a); R = Math.max(R, Math.hypot(cx - px, cy - py));
    }
    G.sweep = { a0: base + hi + 0.15, a1: base + lo - 0.15, R: R + 0.15 };
  }
  const { a0, a1, R } = G.sweep;
  const cx = (rect.x0 + rect.x1) / 2, cy = (rect.y0 + rect.y1) / 2;
  g.save();
  // ตราราชันใต้ตัว + ดาบยกขึ้น (ง้าง)
  crest(g, px, py, D, S, 0.42, pal, env(t, 0, 80, 300, 520), lowQ);
  if (t < HIT) {
    const k = clamp01(t / W);
    const tipX = px - D[0] * 0.35 + S[0] * 0.3, tipY = py - D[1] * 0.35 + S[1] * 0.3;
    const raise = t < W ? k : 1 - clamp01((t - W) / (HIT - W));
    if (raise > 0.02) {
      const pts = [P(px, py, 0.55), P(lerp(px, tipX, raise), lerp(py, tipY, raise), 0.55 + 1.15 * raise)];
      const [hx, hy, hs] = P(px, py, 0.55);
      edge(g, pts, Math.max(2, hs * 0.07), pal, raise, lowQ);
      if (!lowQ) { g.globalCompositeOperation = "lighter"; glow(g, pts[1][0], pts[1][1], hs * 0.35 * raise, pal.hi, 0.6 * raise); glow(g, hx, hy, hs * 0.5, pal.main, 0.35 * raise); }
    }
  }
  // พัดที่ดาบกวาด (ตัดตามกรอบ) — หนักขึ้นเรื่อยๆ (เร่งความเร็ว) · หลังปะทะจางเร็ว
  const sweepQ = t < W ? 0 : t < HIT ? Math.pow((t - W) / (HIT - W), 1.8) : 1;
  const cur = lerp(a0, a1, sweepQ);
  const smearK = t < HIT ? 1 : 1 - clamp01((t - HIT) / 260);
  if (t >= W && smearK > 0) {
    g.save();
    pathS(g, rectPts(rect.x0, rect.y0, rect.x1, rect.y1, 0.02)); g.closePath(); g.clip();
    g.globalCompositeOperation = "source-over";
    const N = lowQ ? 6 : 12;
    for (let i = 0; i < N; i++) {
      const s0 = lerp(a0, cur, i / N), s1 = lerp(a0, cur, (i + 1) / N), f = (i + 1) / N;
      const pts = [P(px, py, 0.02)];
      for (let j = 0; j <= 4; j++) { const a = lerp(s0, s1, j / 4); pts.push(P(px + Math.cos(a) * R, py + Math.sin(a) * R, 0.02)); }
      pathS(g, pts); g.closePath();
      g.fillStyle = rgba(pal.fill, (0.06 + 0.42 * f * f) * smearK); g.fill();
    }
    g.restore();
  }
  // ใบเคียวตั๊กแตน (โค้ง ปลายงอไปทางที่กวาด) ลอยเหนือพื้น ระหว่างกวาด
  if (t >= W && t < HIT + 60) {
    const k = t < HIT ? 1 : 1 - (t - HIT) / 60, ca = Math.cos(cur), sa = Math.sin(cur);
    const sw = Math.sign(a1 - a0) || 1, tx = -sa * sw, ty = ca * sw; // ทิศที่ใบเคียววิ่ง
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const s = i / 12, r = lerp(0.45, R, s), hook = 0.55 * Math.pow(s, 3) - 0.12 * Math.sin(Math.PI * s);
      pts.push(P(px + ca * r + tx * hook, py + sa * r + ty * hook, 0.35 + 0.15 * Math.sin(Math.PI * s)));
    }
    const sc = P(cx, cy, 0.35)[2];
    edge(g, pts, Math.max(2.5, sc * 0.085), pal, k, lowQ);
    if (!lowQ) { const tip = pts[pts.length - 1]; g.globalCompositeOperation = "lighter"; glow(g, tip[0], tip[1], sc * 0.6, pal.hi, 0.5 * k); }
  }
  // ปะทะ
  if (t >= HIT) {
    const aT = t - HIT, k = 1 - clamp01(aT / (T - HIT)), flash = 1 - clamp01(aT / 130);
    g.globalCompositeOperation = "source-over";
    G.tiles.forEach((tl) => {
      quad(g, tl.x, tl.y, 0.04, 0.01); g.fillStyle = rgba(pal.fill, 0.42 * k * k); g.fill();
      if (flash > 0) { quad(g, tl.x, tl.y, 0.04, 0.01); g.fillStyle = rgba(pal.core, 0.55 * flash); g.fill(); }
    });
    // รอยฟันขวางรัศมีในทุกช่อง
    G.tiles.forEach((tl, i) => {
      const tx = tl.x + 0.5, ty = tl.y + 0.5, ang = Math.atan2(ty - py, tx - px) + Math.PI / 2;
      const off = (hash01(i * 4.3) - 0.5) * 0.18, L = 0.38 * (0.6 + 0.4 * easeOut3(clamp01(aT / 120)));
      const ux = Math.cos(ang), uy = Math.sin(ang);
      const pts = lineP(tx - ux * L + off, ty - uy * L, tx + ux * L + off, ty + uy * L, 0.02, 2);
      edge(g, pts, Math.max(1.2, pts[0][2] * 0.035), pal, k, lowQ);
    });
    const sc = P(cx, cy, 0.02)[2];
    edge(g, rectPts(rect.x0, rect.y0, rect.x1, rect.y1, 0.02), Math.max(1.5, sc * 0.04), pal, k, lowQ);
    const pop = REDUCED ? 1 : 1 + 0.25 * (1 - easeOut3(clamp01(aT / 220)));
    crest(g, cx, cy, D, S, Math.min(1.25, Math.min(rect.x1 - rect.x0, rect.y1 - rect.y0) * 0.36) * pop, pal, k, lowQ);
    if (!lowQ) {
      const [gx, gy, gs] = P(cx, cy, 0.4);
      g.globalCompositeOperation = "lighter"; glow(g, gx, gy, gs * 2.2, pal.main, 0.5 * flash);
      if (!REDUCED) {
        const src = [];
        for (let i = 0; i < 18; i++) { const tl = G.tiles[Math.floor(hash01(i * 2.9 + 1) * G.tiles.length)]; src.push([tl.x + 0.5, tl.y + 0.5]); }
        sparks(g, src, aT, 520, pal, 17);
      }
    }
    // ดึงเข้าแถวกลาง (server ดึงที่ hit + 0.5 วิ): แถวกลางเรือง + ลูกศรบั้งในแถวข้างวิ่งเข้าหาแถวกลาง
    const pk = env(aT, 40, 140, 520, T - HIT);
    if (pk > 0) {
      const ends = G.tiles.filter((tl) => Math.round(G.lat(tl)) === 0);
      if (ends.length) {
        const a = ends[0], b = ends[ends.length - 1];
        const pts = lineP(a.x + 0.5 - D[0] * 0.5, a.y + 0.5 - D[1] * 0.5, b.x + 0.5 + D[0] * 0.5, b.y + 0.5 + D[1] * 0.5, 0.03, 8);
        edge(g, pts, Math.max(2, pts[0][2] * 0.07), pal, pk * (0.75 + 0.25 * Math.sin(aT / 40)), lowQ);
      }
      const mv = REDUCED ? 0.5 : (aT % 260) / 260;
      G.tiles.forEach((tl) => {
        const j = Math.round(G.lat(tl));
        if (!j) return;
        const ix = -Math.sign(j) * S[0], iy = -Math.sign(j) * S[1], tx = tl.x + 0.5, ty = tl.y + 0.5;
        for (const o of [-0.1]) {
          const c0 = o + mv * 0.3, bx = tx + ix * c0, by = ty + iy * c0, w = 0.26;
          const pts = [P(bx - ix * 0.14 - D[0] * w, by - iy * 0.14 - D[1] * w, 0.03), P(bx, by, 0.03), P(bx - ix * 0.14 + D[0] * w, by - iy * 0.14 + D[1] * w, 0.03)];
          edge(g, pts, Math.max(1.2, pts[1][2] * 0.03), pal, pk * (1 - Math.abs(mv - 0.5)), true);
        }
      });
    }
  }
  g.restore();
}

// ============================================================ dash — แถบแสงความเร็ว (ทอมโบ ไปกลับ · พาพิยอง ทางเดียว + ฟันเป้า)
function routeOf(e, G) {
  if (G.route) return G.route;
  const pts = [[G.px, G.py], ...G.tiles.map((t) => [t.x + 0.5, t.y + 0.5])];
  G.route = e.back ? [...pts, ...pts.slice(0, -1).reverse()] : pts;
  return G.route;
}
function routeAt(R, u) {
  const i = Math.max(0, Math.min(R.length - 1, Math.floor(u))), j = Math.min(R.length - 1, i + 1), f = clamp01(u - i);
  return [lerp(R[i][0], R[j][0], f), lerp(R[i][1], R[j][1], f)];
}
function ohDash(g, e, now, lowQ) {
  const t = now - e.t0, T = e.dur || OHGER_FX_DUR.ohDash;
  if (t < 0 || t > T) return;
  const G = geoOf(e), pal = palOf(e.color), R = routeOf(e, G), step = OHGER_FX.dashStep;
  const { D, S, px, py } = G, last = R.length - 1, Z = 0.45;
  g.save();
  crest(g, px, py, D, S, 0.42, pal, env(t, 0, 60, 220, 460), lowQ);
  // เส้นความเร็วบนพื้นในช่องที่หัวผ่าน (ทอมโบผ่าน 2 ครั้ง)
  const n = G.tiles.length;
  G.tiles.forEach((tl, i) => {
    const passes = e.back ? [(i + 1) * step, (2 * n - i - 1) * step] : [(i + 1) * step];
    for (const tp of passes) {
      const age = t - tp;
      if (age < 0 || age > 450) continue;
      const k = 1 - age / 450, tx = tl.x + 0.5, ty = tl.y + 0.5;
      for (const o of [-0.22, 0.22]) {
        const ax = tx + S[0] * o - D[0] * 0.42, ay = ty + S[1] * o - D[1] * 0.42;
        const pts = lineP(ax, ay, ax + D[0] * 0.84, ay + D[1] * 0.84, 0.02, 2);
        edge(g, pts, Math.max(1, pts[0][2] * 0.022), pal, 0.8 * k, true);
      }
    }
  });
  // ทอมโบ: ทั้งแนววาบตอนชน (ขาไป / ขากลับ)
  if (e.back && n) {
    const a = G.tiles[0], b = G.tiles[n - 1];
    for (const hit of [OHGER_FX.pass1, OHGER_FX.pass2]) {
      const age = t - hit;
      if (age < 0 || age > 300) continue;
      const k = 1 - age / 300;
      G.tiles.forEach((tl) => { quad(g, tl.x, tl.y, 0.05, 0.01); g.fillStyle = rgba(pal.fill, 0.4 * k); g.fill(); });
      const pts = lineP(a.x + 0.5 - D[0] * 0.5, a.y + 0.5 - D[1] * 0.5, b.x + 0.5 + D[0] * 0.5, b.y + 0.5 + D[1] * 0.5, 0.03, 8);
      edge(g, pts, Math.max(1.5, pts[0][2] * 0.05), pal, k, lowQ);
      if (!lowQ && !REDUCED) sparks(g, G.tiles.map((tl) => [tl.x + 0.5, tl.y + 0.5]), age, 300, pal, hit);
    }
  }
  // แถบแสงตามหัว (หาง ~2.2 ช่อง · หัวหยุด = หางวิ่งตามจนหาย)
  const raw = t / step, head = Math.min(raw, last), tail = Math.min(head, Math.max(0, raw - 2.2));
  if (last > 0 && head - tail > 0.02) {
    const N = Math.max(3, Math.ceil((head - tail) / 0.2)), pts = [];
    for (let i = 0; i <= N; i++) { const [x, y] = routeAt(R, lerp(tail, head, i / N)); pts.push(P(x, y, Z)); }
    const sc = pts[N][2];
    g.lineCap = "round"; g.globalCompositeOperation = "source-over";
    const layers = lowQ ? [[pal.main, 1.1, 0.85]] : [[pal.dark, 2.0, 0.5], [pal.main, 1.1, 0.85], [pal.core, 0.4, 1]];
    for (const [rgb, wk, ak] of layers) {
      for (let i = 1; i <= N; i++) {
        const f = i / N;
        g.strokeStyle = rgba(rgb, ak * f); g.lineWidth = Math.max(1, sc * 0.24 * wk * (0.25 + 0.75 * f));
        g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke();
      }
    }
    // ทอมโบ: ปีกแมลงปอ 4 แผ่นแวบที่หัวขณะพุ่ง
    if (formOf(e) === "tonbo" && !lowQ && !REDUCED && raw < last) {
      const hp = pts[N], prev = pts[Math.max(0, N - 1)], ang = Math.atan2(hp[1] - prev[1], hp[0] - prev[0]);
      const fl = 0.55 + 0.45 * Math.sin(t / 22);
      g.globalCompositeOperation = "source-over";
      for (const s of [-1, 1]) for (const k of [0.9, 1.25]) {
        g.beginPath(); g.ellipse(hp[0] - Math.cos(ang) * sc * 0.08, hp[1] - Math.sin(ang) * sc * 0.08, sc * 0.34 * (k === 0.9 ? 1 : 0.85), sc * 0.06, ang + s * k * 1.15, 0, TAU);
        g.fillStyle = rgba(pal.hi, 0.28 * fl); g.fill(); g.strokeStyle = rgba(pal.core, 0.55 * fl); g.lineWidth = 1; g.stroke();
      }
    }
    if (!lowQ) { g.globalCompositeOperation = "lighter"; glow(g, pts[N][0], pts[N][1], sc * 0.45, pal.hi, raw < last ? 0.45 : 0.45 * clamp01(1 - (raw - last) / 2.2)); }
  }
  // พาพิยอง: ปีกผีเสื้อกระพือค้างตามช่องที่ผ่าน (ร่องรอยการบิน)
  if (formOf(e) === "papiyon" && !lowQ && !REDUCED) {
    G.tiles.forEach((tl, i) => {
      const age = t - (i + 1) * step;
      if (age < 0 || age > 560) return;
      const [wx, wy, ws] = P(tl.x + 0.5, tl.y + 0.5, 0.6 + age / 1400), a = 1 - age / 560;
      const sp = P(tl.x + 0.5 + D[0], tl.y + 0.5 + D[1], 0.6), ang = Math.atan2(sp[1] - wy, sp[0] - wx);
      wingPair(g, wx, wy, ws * 0.42 * (0.8 + 0.3 * (age / 560)), ang, 0.5 + 0.5 * Math.sin(age / 30 + i), pal, 0.85 * a);
    });
  }
  // พาพิยอง: ฟันไขว้ + ปีกผีเสื้อที่เป้า
  if (!e.back && okT(e.target)) papiyonBurst(g, e, t - OHGER_FX.hit, pal, lowQ, R);
  g.restore();
}
function papiyonBurst(g, e, aT, pal, lowQ, R) {
  const LIFE = 620;
  if (aT < 0 || aT > LIFE) return;
  const tx = e.target.x + 0.5, ty = e.target.y + 0.5, k = 1 - aT / LIFE, flash = 1 - clamp01(aT / 120);
  const [cx, cy, sc] = P(tx, ty, 0.6);
  // ทิศพุ่งบนจอ (ช่องท้ายเส้นทาง → เป้า)
  const from = R[R.length - 1], f0 = P(from[0], from[1], 0.6);
  let dAng = Math.atan2(cy - f0[1], cx - f0[0]);
  if (!Number.isFinite(dAng) || (Math.abs(cy - f0[1]) < 0.5 && Math.abs(cx - f0[0]) < 0.5)) dAng = 0;
  g.globalCompositeOperation = "source-over";
  quad(g, e.target.x, e.target.y, 0.04, 0.01); g.fillStyle = rgba(pal.fill, 0.45 * k); g.fill();
  if (flash > 0) { quad(g, e.target.x, e.target.y, 0.04, 0.01); g.fillStyle = rgba(pal.core, 0.5 * flash); g.fill(); }
  // ปีกผีเสื้อ 4 กลีบกางออกแล้วจาง (หลังรอยฟัน)
  if (!lowQ && !REDUCED) wingPair(g, cx, cy, sc, dAng, easeOut3(clamp01(aT / 260)), pal, clamp01(1 - aT / 480), sc * 0.02);
  // ฟันไขว้ 2 รอย (รอยที่สองตามหลัง 70 ms)
  [0, 70].forEach((delay, i) => {
    const age = aT - delay;
    if (age < 0) return;
    const grow = easeOut3(clamp01(age / 90)), a = dAng + (i ? -1 : 1) * Math.PI / 4, L = sc * 0.62;
    const ux = Math.cos(a), uy = Math.sin(a), bend = sc * 0.12 * (i ? -1 : 1);
    const pts = [];
    for (let j = 0; j <= 10; j++) {
      const s = -1 + (j / 10) * 2 * grow, b = (1 - s * s) * bend;
      pts.push([cx + ux * L * s - uy * b, cy + uy * L * s + ux * b]);
    }
    edge(g, pts, Math.max(2, sc * 0.06), pal, clamp01(1 - (age - 120) / (LIFE - 200)), lowQ);
  });
  // ประกายดาวกระพริบรอบเป้า (ผงเกล็ดปีกผีเสื้อ)
  if (!REDUCED) for (let i = 0; i < (lowQ ? 3 : 7); i++) {
    const d0 = 60 + hash01(i * 3.3) * 220, age = aT - d0, life = 260;
    if (age < 0 || age > life) continue;
    const an = hash01(i * 8.1) * TAU, rr = sc * (0.35 + 0.45 * hash01(i * 1.7));
    star(g, cx + Math.cos(an) * rr, cy + Math.sin(an) * rr * 0.8 - sc * 0.2 * (age / life), sc * 0.12 * Math.sin(Math.PI * age / life), pal, Math.sin(Math.PI * age / life));
  }
  g.strokeStyle = rgba(pal.hi, 0.8 * k); g.lineWidth = Math.max(1.2, sc * 0.03);
  gEllipse(g, tx, ty, 0.2 + 0.6 * easeOut3(clamp01(aT / 400)), 0.02, 28); g.stroke();
  if (!lowQ) {
    g.globalCompositeOperation = "lighter"; glow(g, cx, cy, sc * 0.9, pal.main, 0.55 * flash);
    if (!REDUCED) { const src = []; for (let i = 0; i < 10; i++) src.push([tx, ty]); sparks(g, src, aT, 480, pal, 41); }
  }
}

// ============================================================ needle — เข็มพิษฮาจิ
function ohNeedle(g, e, now, lowQ) {
  const T = OHGER_FX_DUR.ohNeedle, t = now - e.t0;
  if (t < 0 || t > T) return;
  const G = geoOf(e), pal = palOf(e.color);
  if (!G.tiles.length) return;
  const { D, S, px, py } = G, CH = OHGER_FX.needleCharge, HIT = OHGER_FX.hit, Z = 0.5;
  const lastT = G.tiles[G.tiles.length - 1];
  const sx = px + D[0] * 0.35, sy = py + D[1] * 0.35, ex = lastT.x + 0.5 + D[0] * 0.3, ey = lastT.y + 0.5 + D[1] * 0.3;
  const total = Math.hypot(ex - sx, ey - sy) || 1;
  const EXP = 1.4, qOf = (tt) => Math.pow(clamp01((tt - CH) / (HIT - CH)), EXP);
  g.save();
  crest(g, px, py, D, S, 0.42, pal, env(t, 0, 60, 200, 420), lowQ);
  // ประกายที่ปลายเข็ม (ชาร์จ)
  if (t < CH + 80) {
    const k = env(t, 0, CH * 0.7, CH, CH + 80), [gx, gy, gs] = P(sx, sy, Z), r = gs * (0.12 + 0.16 * k);
    g.globalCompositeOperation = "source-over"; g.lineCap = "round";
    g.strokeStyle = rgba(pal.dark, 0.6 * k); g.lineWidth = 3;
    g.beginPath(); g.moveTo(gx - r, gy); g.lineTo(gx + r, gy); g.moveTo(gx, gy - r); g.lineTo(gx, gy + r); g.stroke();
    g.strokeStyle = rgba(pal.core, k); g.lineWidth = 1.4; g.stroke();
    if (!lowQ) { g.globalCompositeOperation = "lighter"; glow(g, gx, gy, gs * 0.3, pal.hi, 0.6 * k); }
  }
  // เส้นทางบนพื้น + ตัวเข็ม
  if (t >= CH) {
    const q = t < HIT ? qOf(t) : 1 + (t - HIT) / 400, d = Math.min(q, 1.08) * total;
    const hx = sx + D[0] * d, hy = sy + D[1] * d;
    const gk = t < HIT ? 0.4 : 0.4 * (1 - clamp01((t - HIT) / 450));
    if (gk > 0) {
      const pts = lineP(sx, sy, Math.min(1, q) * (ex - sx) + sx, Math.min(1, q) * (ey - sy) + sy, 0.02, 6);
      g.globalCompositeOperation = "source-over"; g.lineCap = "round";
      pathS(g, pts); g.strokeStyle = rgba(pal.main, gk); g.lineWidth = Math.max(1, pts[0][2] * 0.02); g.stroke();
    }
    const nk = t < HIT ? 1 : 1 - clamp01((t - HIT) / 120);
    if (nk > 0) {
      const tl = Math.min(d, 1.3), pts = lineP(hx - D[0] * tl, hy - D[1] * tl, hx, hy, Z, 4), sc = pts[4][2];
      g.lineCap = "round"; g.globalCompositeOperation = "source-over";
      for (const [rgb, w, a] of [[pal.dark, 0.05, 0.55], [pal.main, 0.028, 0.9], [pal.core, 0.012, 1]]) {
        if (lowQ && rgb === pal.dark) continue;
        for (let i = 1; i < pts.length; i++) {
          const f = i / (pts.length - 1);
          g.strokeStyle = rgba(rgb, a * f * nk); g.lineWidth = Math.max(1, sc * w * (0.4 + 0.6 * f));
          g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke();
        }
      }
      // หัวเหล็กในผึ้ง: หนามสามเหลี่ยมแกนมืดขอบเงิน
      const hp = pts[4], bp = P(hx - D[0] * 0.32, hy - D[1] * 0.32, Z);
      let ux = hp[0] - bp[0], uy = hp[1] - bp[1];
      const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
      const bw = Math.max(2, sc * 0.05);
      g.globalCompositeOperation = "source-over";
      g.beginPath(); g.moveTo(hp[0] + ux * 2, hp[1] + uy * 2); g.lineTo(bp[0] - uy * bw, bp[1] + ux * bw); g.lineTo(bp[0] + ux * bw * 0.6, bp[1] + uy * bw * 0.6); g.lineTo(bp[0] + uy * bw, bp[1] - ux * bw); g.closePath();
      g.fillStyle = rgba(pal.dark, 0.95 * nk); g.fill(); g.strokeStyle = rgba(pal.core, nk); g.lineWidth = 1.2; g.stroke();
      if (!lowQ) { g.globalCompositeOperation = "lighter"; glow(g, hp[0], hp[1], sc * 0.18, pal.hi, 0.8 * nk); }
    }
  }
  // ช่องที่เข็มผ่าน: ประกาย 6 ทาง + หกเหลี่ยมรังผึ้ง (ช่องสุดท้าย = จังหวะปะทะ)
  G.tiles.forEach((tl, i) => {
    const tx = tl.x + 0.5, ty = tl.y + 0.5, qi = clamp01(((tx - sx) * D[0] + (ty - sy) * D[1]) / total);
    const tp = i === G.tiles.length - 1 ? HIT : CH + (HIT - CH) * Math.pow(qi, 1 / EXP), age = t - tp;
    if (age < 0 || age > 420) return;
    const k = 1 - age / 420, [cx, cy, sc] = P(tx, ty, Z), grow = easeOut3(clamp01(age / 160));
    g.globalCompositeOperation = "source-over";
    quad(g, tl.x, tl.y, 0.08, 0.01); g.fillStyle = rgba(pal.fill, 0.35 * k); g.fill();
    hexPath(g, cx, cy, sc * (0.12 + 0.2 * grow), sc * (0.12 + 0.2 * grow) * 0.866);
    g.strokeStyle = rgba(pal.dark, 0.5 * k); g.lineWidth = 3; g.stroke();
    g.strokeStyle = rgba(pal.core, k); g.lineWidth = 1.3; g.stroke();
    if (!REDUCED) {
      g.lineCap = "round"; g.strokeStyle = rgba(pal.hi, k); g.lineWidth = Math.max(1, sc * 0.018);
      g.beginPath();
      for (let j = 0; j < (lowQ ? 3 : 6); j++) {
        const a = (j / (lowQ ? 3 : 6)) * TAU + i, r0 = sc * 0.1 * grow, r1 = sc * (0.18 + 0.22 * grow);
        g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      }
      g.stroke();
    }
    if (!lowQ && age < 120) { g.globalCompositeOperation = "lighter"; glow(g, cx, cy, sc * 0.4, pal.hi, 0.6 * (1 - age / 120)); }
  });
  g.restore();
}

// ============================================================ wave — คลื่นดาบคุวากาตะไปข้างหลัง
function ohWave(g, e, now, lowQ) {
  const T = OHGER_FX_DUR.ohWave, t = now - e.t0;
  if (t < 0 || t > T) return;
  const G = geoOf(e), pal = palOf(e.color);
  if (!G.tiles.length) return;
  const { D, S, px, py } = G, RE = OHGER_FX.waveReach, Z = 0.42;
  const lastT = G.tiles[G.tiles.length - 1], reach = Math.max(0.5, G.along(lastT));
  g.save();
  // ช่องที่คลื่นผ่าน: วาบ + รอยฟันขวางแนว
  G.tiles.forEach((tl) => {
    const tp = RE * Math.max(0, Math.min(1, (G.along(tl) - 0.4) / Math.max(0.01, reach - 0.4))), age = t - tp;
    if (age < 0 || age > 300) return;
    const k = 1 - age / 300, tx = tl.x + 0.5, ty = tl.y + 0.5;
    quad(g, tl.x, tl.y, 0.05, 0.01); g.globalCompositeOperation = "source-over"; g.fillStyle = rgba(pal.fill, 0.38 * k); g.fill();
    const pts = lineP(tx - S[0] * 0.4, ty - S[1] * 0.4, tx + S[0] * 0.4, ty + S[1] * 0.4, 0.02, 2);
    edge(g, pts, Math.max(1, pts[0][2] * 0.03), pal, k, lowQ);
  });
  // ตัวคลื่น: จันทร์เสี้ยวในระนาบจอ ตั้งฉากกับทิศวิ่งบนจอ
  const u = t < RE ? easeOut3(t / RE) : 1 + ((t - RE) / (T - RE)) * 0.35;
  const k = t < RE ? Math.min(1, t / 50) : 1 - clamp01((t - RE) / (T - RE));
  if (k > 0.01) {
    const d = 0.4 + (reach - 0.4) * u, cx = px + D[0] * d, cy = py + D[1] * d;
    const C = P(cx, cy, Z), A = P(cx + D[0], cy + D[1], Z), sc = C[2];
    let dx = A[0] - C[0], dy = A[1] - C[1];
    const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const nx = -dy, ny = dx, W = sc * 0.58, B = sc * 0.36;
    const outer = [], inner = [];
    for (let i = 0; i <= 18; i++) {
      const a = -1 + (i / 18) * 2, bulge = 1 - a * a;
      outer.push([C[0] + nx * a * W + dx * B * bulge, C[1] + ny * a * W + dy * B * bulge]);
      inner.push([C[0] + nx * a * W * 0.9 + dx * (B * 0.35 * bulge - sc * 0.03), C[1] + ny * a * W * 0.9 + dy * (B * 0.35 * bulge - sc * 0.03)]);
    }
    g.globalCompositeOperation = "source-over";
    pathS(g, [...outer, ...inner.slice().reverse()]); g.closePath();
    g.fillStyle = rgba(pal.fill, (pal.silver ? 0.85 : 0.5) * k); g.fill();
    edge(g, outer, Math.max(1.5, sc * 0.055), pal, k, lowQ);
    pathS(g, inner); g.strokeStyle = rgba(pal.hi, 0.5 * k); g.lineWidth = Math.max(1, sc * 0.02); g.stroke();
    if (!lowQ) { g.globalCompositeOperation = "lighter"; glow(g, C[0] + dx * B * 0.6, C[1] + dy * B * 0.6, sc * 0.5, pal.main, 0.35 * k); }
  }
  g.restore();
}

export function ohgerFx(g, e, now, lowQ) {
  if (e && ATK[e.kind]) { ohAttack(g, e, now, lowQ); return; }
  if (!e || !Array.isArray(e.tiles)) return;
  if (e.kind === "ohSlash") (formOf(e) === "kamakiri" ? ohReap : ohCleave)(g, e, now, lowQ);
  else if (e.kind === "ohDash") ohDash(g, e, now, lowQ);
  else if (e.kind === "ohNeedle") ohNeedle(g, e, now, lowQ);
  else if (e.kind === "ohWave") ohWave(g, e, now, lowQ);
}


// ============================================================ ตีปกติ (ohAtk1–5) — fx { x, y (มุมบนซ้ายผู้ตี), size, to, toSize, color, by, dodge }
//  ohAtk1 คุวากาตะ: เขาคีมด้วงคู่กางรอบเป้าแล้วหนีบปิดตอนปะทะ + มงกุฎเล็กวาบเหนือเป้า
//  ohAtk2 ทอมโบ: แทงพุ่งเป็นเส้นแสงเร็ว + ปีกแมลงปอเงาติดตาตามแนว → ประกายข้าวหลามตัด
//  ohAtk3 คามาคิริ: ฟันเคียวตะขอโค้งเดียวรอบเป้า (ปลายงอ) → รอยเคียวค้าง
//  ohAtk4 พาพิยอง: ปีกผีเสื้อกระพือรอบเป้า → ฟันไขว้บาง + ประกายดาวเล็ก
//  ohAtk5 ฮาจิ: เหล็กในแทงรัว 3 ครั้ง (ครั้งที่ 3 = ปะทะ) + หกเหลี่ยมรังผึ้งเล็ก
//  dodge = ท่าเลยเป้าไปด้านข้าง (จุดปะทะเลื่อนครึ่งช่อง) ไม่มีแสงวาบ/ประกาย — ป้าย "หลบ" + รอยฟันมาจาก BoardStage
//  ผู้ตีพุ่งเข้าด้วย anim "lunge" (ไม่ใช่ lowQ · ห่าง ≤ 2) — ส่วนที่อยู่ที่ตัวผู้ตี (ทอมโบ) ตามตำแหน่งที่พุ่ง
const ATK = { ohAtk1: 1, ohAtk2: 2, ohAtk3: 3, ohAtk4: 4, ohAtk5: 5 };
const ATK_COLOR = { 1: "#e23b3b", 2: "#3b78ff", 3: "#f2c21b", 4: "#a54ae8", 5: "#c9ced8" };
const LUNGE_MS = 620, LUNGE_HIT = 0.62; // = BoardCanvas animPose "lunge"
function bodyAt(x, y, n = 1) {
  n = Math.max(1, n | 0);
  const K = 1 + (n - 1) * 0.6, cx = x + n / 2, cy = y + n / 2, [bx, by, s] = P(cx, cy);
  return { cx, cy, bx, by, s, K, r: s * 0.4 * K, hy: by - s * 0.86 * K };
}
function lungeD(from, to, t) {
  const p = clamp01(t / LUNGE_MS), reach = Math.max(0, Math.hypot(to.x - from.x, to.y - from.y) - 0.55);
  if (p < 0.4) return -0.22 * Math.sin((p / 0.4) * Math.PI / 2);
  if (p < LUNGE_HIT) { const q = (p - 0.4) / (LUNGE_HIT - 0.4); return -0.22 + (reach + 0.22) * q * q; }
  return reach * Math.pow(1 - (p - LUNGE_HIT) / (1 - LUNGE_HIT), 3);
}
function crownGlyph(g, x, y, r, pal, a) {
  if (a <= 0.01) return;
  const pts = [[-1, 0.5], [-1, -0.2], [-0.5, 0.15], [0, -0.75], [0.5, 0.15], [1, -0.2], [1, 0.5]].map(([u, v]) => [x + u * r, y + v * r]);
  pathS(g, pts); g.closePath();
  g.fillStyle = rgba(pal.main, 0.85 * a); g.fill();
  g.lineJoin = "round"; g.strokeStyle = rgba(pal.dark, 0.7 * a); g.lineWidth = 2.5; g.stroke();
  g.strokeStyle = rgba(pal.core, a); g.lineWidth = 1; g.stroke();
}
function ohAttack(g, e, now, lowQ) {
  const id = ATK[e.kind], MS = OHGER_MS[e.kind], t = now - e.t0;
  if (t < 0 || t > MS || !okT(e.to)) return;
  const pal = palOf(e.color || ATK_COLOR[id]), HIT = MS * OHGER_HIT_P[e.kind], fx2 = REDUCED || lowQ;
  const n = e.size || 1, from = { x: e.x, y: e.y };
  const lunges = !lowQ && Math.abs(e.to.x - e.x) + Math.abs(e.to.y - e.y) <= 2;
  const T = bodyAt(e.to.x, e.to.y, e.toSize || 1);
  let A = bodyAt(e.x, e.y, n);
  if (lunges) {
    const L = Math.hypot(e.to.x - from.x, e.to.y - from.y) || 1, d = lungeD(from, e.to, t);
    A = bodyAt(e.x + ((e.to.x - e.x) / L) * d, e.y + ((e.to.y - e.y) / L) * d, n);
  }
  // ทิศบนจอ ผู้ตี → เป้า (จากตำแหน่งยืน ไม่ใช่ตำแหน่งที่พุ่ง — ทิศไม่แกว่ง) · (nx, ny) = ตั้งฉาก
  const A0 = bodyAt(e.x, e.y, n);
  let ux = T.bx - A0.bx, uy = T.hy - A0.hy;
  const ul = Math.hypot(ux, uy);
  if (!(ul >= 1)) { ux = 1; uy = 0; } else { ux /= ul; uy /= ul; }
  const nx = -uy, ny = ux, R = T.r * 1.25, sc = T.s;
  const miss = !!e.dodge, mo = miss ? T.s * 0.5 : 0;
  const cx = T.bx + nx * mo, cy = T.hy + ny * mo; // จุดปะทะ (หลบ = เลื่อนไปข้าง)
  const aT = t - HIT, flash = !miss && aT >= 0 ? 1 - clamp01(aT / 130) : 0;
  const out = aT < 0 ? 1 : 1 - clamp01(aT / (MS - HIT));
  g.save(); g.lineCap = "round"; g.lineJoin = "round"; g.globalCompositeOperation = "source-over";
  if (id === 1) {
    // เขาคีม: ปรากฏ → กางกว้าง → หนีบปิดตอนปะทะ (เร่ง) → ค้างปิดแล้วจาง
    const app = clamp01((t - 80) / 120), shut = aT < 0 ? Math.pow(clamp01((t - 200) / (HIT - 200)), 2.2) : 1;
    const a = app * out;
    for (const s of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const u = i / 10, open = lerp(1, 0.08, shut);
        const along = lerp(-1.0, 0.35, u), side = s * (0.42 + (open * 0.45) * Math.sin(Math.PI * u * 0.85)) * (1 - u * 0.55 * shut);
        pts.push([cx + ux * along * R + nx * side * R, cy + uy * along * R + ny * side * R]);
      }
      edge(g, pts, Math.max(2.5, sc * 0.075), pal, a, lowQ);
      // ฟันเลื่อยด้านในของเขา
      if (!lowQ) for (const i of [4, 6]) {
        const p0 = pts[i], k = -s;
        edge(g, [p0, [p0[0] + nx * k * sc * 0.09, p0[1] + ny * k * sc * 0.09]], Math.max(1.2, sc * 0.03), pal, a, true);
      }
    }
    if (aT >= 0 && !miss) {
      const k = 1 - clamp01(aT / 260);
      g.strokeStyle = rgba(pal.core, k); g.lineWidth = Math.max(1.5, sc * 0.03);
      g.beginPath();
      for (let j = 0; j < 4; j++) {
        const an = j * Math.PI / 2 + Math.PI / 4, r0 = sc * 0.08, r1 = sc * (0.2 + 0.25 * easeOut3(clamp01(aT / 160)));
        g.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); g.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1);
      }
      g.stroke();
      const pop = fx2 ? 1 : 0.7 + 0.3 * easeOut3(clamp01(aT / 160));
      crownGlyph(g, T.bx, T.hy - T.r * 1.5 - (fx2 ? 0 : sc * 0.15 * clamp01(aT / 400)), sc * 0.13 * pop, pal, env(aT, 0, 60, 260, 460));
    }
  } else if (id === 2) {
    // ทอมโบ: เส้นแทงจากหน้าตัวผู้ตีถึงจุดปะทะ (หัวพุ่งเร็ว) + ปีกเงาติดตา 3 คู่ตามแนว
    const s0x = A.bx + ux * A.r * 0.6, s0y = A.hy + uy * A.r * 0.6;
    const ex = cx + ux * (miss ? sc * 0.6 : 0), ey = cy + uy * (miss ? sc * 0.6 : 0);
    const go = clamp01((t - 160) / (HIT - 160)), hp = Math.pow(go, 0.6);
    const hx = lerp(s0x, ex, hp), hy2 = lerp(s0y, ey, hp), tl = aT < 0 ? 0.55 : 0.55 + 0.45 * clamp01(aT / 200);
    const a = t < 160 ? 0 : out;
    if (a > 0) {
      const tx0 = lerp(s0x, hx, tl), ty0 = lerp(s0y, hy2, tl);
      edge(g, [[tx0, ty0], [hx, hy2]], Math.max(2, sc * 0.05), pal, a, lowQ);
      // หัวหอกเพชร
      const w = sc * 0.07, L = sc * 0.22;
      g.beginPath(); g.moveTo(hx + ux * L * 0.5, hy2 + uy * L * 0.5); g.lineTo(hx + nx * w, hy2 + ny * w); g.lineTo(hx - ux * L * 0.5, hy2 - uy * L * 0.5); g.lineTo(hx - nx * w, hy2 - ny * w); g.closePath();
      g.fillStyle = rgba(pal.core, a); g.fill(); g.strokeStyle = rgba(pal.main, a); g.lineWidth = 1.2; g.stroke();
      if (!fx2) {
        const ang = Math.atan2(uy, ux);
        for (let j = 1; j <= 3; j++) {
          const f = clamp01(hp - j * 0.22);
          if (f <= 0) continue;
          const wx = lerp(s0x, ex, f), wy = lerp(s0y, ey, f), wa = a * (0.55 - j * 0.12);
          for (const sd of [-1, 1]) for (const kk of [0.8, 1.2]) {
            g.beginPath(); g.ellipse(wx, wy, sc * 0.26, sc * 0.045, ang + sd * kk * 1.1, 0, TAU);
            g.fillStyle = rgba(pal.hi, 0.35 * wa); g.fill(); g.strokeStyle = rgba(pal.core, 0.6 * wa); g.lineWidth = 1; g.stroke();
          }
        }
      }
    }
    if (aT >= 0 && !miss) {
      const k = 1 - clamp01(aT / 300), r = sc * (0.15 + 0.35 * easeOut3(clamp01(aT / 220)));
      g.beginPath(); g.moveTo(cx + ux * r, cy + uy * r); g.lineTo(cx + nx * r * 0.45, cy + ny * r * 0.45); g.lineTo(cx - ux * r, cy - uy * r); g.lineTo(cx - nx * r * 0.45, cy - ny * r * 0.45); g.closePath();
      g.strokeStyle = rgba(pal.dark, 0.6 * k); g.lineWidth = 3.5; g.stroke(); g.strokeStyle = rgba(pal.core, k); g.lineWidth = 1.5; g.stroke();
    }
  } else if (id === 3) {
    // คามาคิริ: เคียวตะขอโค้งเดียว กวาดรอบเป้า ~200° แล้วงอปลายเข้าหาเป้า
    const base = Math.atan2(uy, ux), a0 = base - 2.0, span = 3.6;
    const sw = clamp01((t - 170) / (HIT - 170)), q = 1 - Math.pow(1 - sw, 2.5), a = t < 170 ? 0 : out;
    if (a > 0) {
      const head = a0 + span * q, tail = Math.max(a0, head - (aT < 0 ? 1.8 : 1.8 * (1 - clamp01(aT / 260)) + 0.001));
      const pts = [];
      for (let i = 0; i <= 16; i++) {
        const an = lerp(tail, head, i / 16), rr = R * (1.05 - 0.12 * Math.sin(Math.PI * i / 16));
        pts.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr * 0.78]);
      }
      const lh = pts[pts.length - 1], inA = head + Math.PI * 0.75;
      pts.push([lh[0] + Math.cos(inA) * sc * 0.2, lh[1] + Math.sin(inA) * sc * 0.2 * 0.78]);
      edge(g, pts, Math.max(2.5, sc * 0.07), pal, a, lowQ);
      if (!lowQ && aT < 0) { g.globalCompositeOperation = "lighter"; glow(g, lh[0], lh[1], sc * 0.3, pal.hi, 0.5 * a); g.globalCompositeOperation = "source-over"; }
    }
    if (aT >= 0 && !miss) {
      const k = 1 - clamp01(aT / (MS - HIT)), L = sc * 0.42, pts = [];
      for (let i = 0; i <= 8; i++) { const s = -1 + i / 4, b = (1 - s * s) * sc * 0.1; pts.push([cx + nx * L * s + ux * b, cy + ny * L * s + uy * b]); }
      edge(g, pts, Math.max(1.5, sc * 0.04), pal, k, lowQ);
    }
  } else if (id === 4) {
    // พาพิยอง: ปีกผีเสื้อกระพือรอบเป้า (ก่อนปะทะ) → ฟันไขว้บาง → ประกายดาว
    const wa = env(t, 100, 200, HIT, HIT + 200);
    if (wa > 0) wingPair(g, cx, cy, sc * 0.55, Math.atan2(uy, ux) + Math.PI / 2, fx2 ? 0.8 : 0.5 + 0.5 * Math.sin(t / 28), pal, wa, 1);
    [0, 60].forEach((delay, i) => {
      const age = t - (HIT - 60 + delay);
      if (age < 0) return;
      const grow = easeOut3(clamp01(age / 70)), an = Math.atan2(uy, ux) + (i ? -1 : 1) * Math.PI / 4, L = sc * 0.45;
      const dx = Math.cos(an), dy = Math.sin(an);
      edge(g, [[cx - dx * L, cy - dy * L], [cx - dx * L + dx * 2 * L * grow, cy - dy * L + dy * 2 * L * grow]], Math.max(1.5, sc * 0.035), pal, clamp01(1 - (age - 120) / 300), lowQ);
    });
    if (aT >= 0 && !miss && !fx2) for (let i = 0; i < 5; i++) {
      const age = aT - i * 40, life = 240;
      if (age < 0 || age > life) continue;
      const an = hash01(i * 5.3 + 1) * TAU, rr = sc * (0.3 + 0.3 * hash01(i * 2.1));
      star(g, cx + Math.cos(an) * rr, cy + Math.sin(an) * rr - sc * 0.15 * (age / life), sc * 0.09 * Math.sin(Math.PI * age / life), pal, Math.sin(Math.PI * age / life));
    }
  } else {
    // ฮาจิ: เหล็กในแทงรัว 3 ครั้ง (ทุก 70 ms · ครั้งสุดท้าย = ปะทะ) เยื้องกันเล็กน้อย
    [-140, -70, 0].forEach((off, i) => {
      const age = t - (HIT + off - 60);
      if (age < 0 || age > 260) return;
      const reach = easeOut3(clamp01(age / 60)), back = clamp01((age - 60) / 140), k = 1 - back;
      const so = (i - 1) * sc * 0.12, px0 = cx - ux * sc * 0.7 + nx * so, py0 = cy - uy * sc * 0.7 + ny * so;
      const tipX = lerp(px0, cx + nx * so * 0.3, reach) - ux * sc * 0.25 * back, tipY = lerp(py0, cy + ny * so * 0.3, reach) - uy * sc * 0.25 * back;
      const bx2 = tipX - ux * sc * 0.3, by2 = tipY - uy * sc * 0.3, w = Math.max(2, sc * 0.045);
      g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(bx2 + nx * w, by2 + ny * w); g.lineTo(bx2 + ux * w * 0.6, by2 + uy * w * 0.6); g.lineTo(bx2 - nx * w, by2 - ny * w); g.closePath();
      g.fillStyle = rgba(pal.dark, 0.95 * k); g.fill(); g.strokeStyle = rgba(pal.core, k); g.lineWidth = 1.2; g.stroke();
      edge(g, [[bx2 - ux * sc * 0.18, by2 - uy * sc * 0.18], [bx2, by2]], Math.max(1, sc * 0.02), pal, 0.7 * k, true);
      if (!miss && age >= 60 && age < 200) {
        const q = (age - 60) / 140;
        hexPath(g, tipX, tipY, sc * (0.06 + 0.1 * q), sc * (0.06 + 0.1 * q) * 0.866);
        g.strokeStyle = rgba(pal.dark, 0.5 * (1 - q)); g.lineWidth = 3; g.stroke();
        g.strokeStyle = rgba(pal.core, 1 - q); g.lineWidth = 1.2; g.stroke();
      }
    });
  }
  if (flash > 0 && !lowQ) { const fk = id === 5 ? 0.45 : 1; g.globalCompositeOperation = "lighter"; glow(g, cx, cy, sc * 0.6, pal.main, 0.55 * flash * fk); glow(g, cx, cy, sc * 0.25, pal.hi, 0.7 * flash * fk); }
  if (!miss && aT >= 0 && !fx2 && id !== 4) { const src = []; for (let i = 0; i < 6; i++) src.push([T.cx, T.cy]); sparks(g, src, aT, 360, pal, id * 13); }
  g.restore();
}

// ============================================================ เหตุการณ์ → fx
//  ev = socket "ohgerFx" · ctx.idsOn(tiles, selfId) = id ของคนบนช่องเหล่านั้น (สั่นตอนปะทะ — hitIds/hitDelay ของ BoardCanvas)
//  คืน { fx, look (ช่องให้กล้องมอง | null), shake: [ms …] }
export function ohgerEventFx(ev, ctx = {}) {
  const out = { fx: [], look: null, shake: [] };
  if (!ev || typeof ev !== "object" || !DIRS[ev.dir]) return out;
  const D = DIRS[ev.dir];
  const tiles = (Array.isArray(ev.tiles) ? ev.tiles : []).filter(okT).map((t) => ({ x: t.x, y: t.y }));
  let from = okT(ev.from) ? { x: ev.from.x, y: ev.from.y } : null;
  // ผู้ใช้ยืนอยู่ในแนวแล้ว (พาพิยอง: server ย้ายตัวก่อนส่ง) → ช่องเริ่ม = ช่องหลังช่องแรกของแนว
  if (from && tiles.some((t) => t.x === from.x && t.y === from.y)) {
    const first = tiles.reduce((m, t) => (t.x * D[0] + t.y * D[1] < m.x * D[0] + m.y * D[1] ? t : m), tiles[0]);
    from = { x: first.x - D[0], y: first.y - D[1] };
  }
  if (!from) {
    if (!tiles.length) return out;
    const first = tiles.reduce((m, t) => (t.x * D[0] + t.y * D[1] < m.x * D[0] + m.y * D[1] ? t : m), tiles[0]);
    from = { x: first.x - D[0], y: first.y - D[1] };
  }
  const idsOn = typeof ctx.idsOn === "function" ? ctx.idsOn : () => [];
  const mid = tiles.length ? tiles.reduce((a, t) => ({ x: a.x + t.x / tiles.length, y: a.y + t.y / tiles.length }), { x: 0, y: 0 }) : from;
  const midT = { x: Math.round(mid.x), y: Math.round(mid.y) };
  const form = FORMS[ev.form] ? ev.form : null;
  const base = { id: ev.id, color: ev.color, dir: ev.dir, form, from, tiles, x: midT.x, y: midT.y };
  if (ev.kind === "slash") {
    if (!tiles.length) return out;
    out.fx.push({ ...base, kind: "ohSlash", hitIds: idsOn(tiles, ev.id), hitDelay: OHGER_FX.hit });
    out.look = midT;
    out.shake.push(OHGER_FX.hit);
  } else if (ev.kind === "dash") {
    const back = form ? form === "tonbo" : ev.target === undefined; // ทอมโบไม่ส่ง target · พาพิยองส่งเสมอ (null = ไม่มีเป้า)
    const target = okT(ev.target) ? { x: ev.target.x, y: ev.target.y } : null;
    const run = (back ? 2 * tiles.length : tiles.length) * OHGER_FX.dashStep;
    const dur = Math.max(run + 300, target ? OHGER_FX.hit + 640 : 0, back ? OHGER_FX.pass2 + 320 : 0);
    const hitIds = back ? idsOn(tiles, ev.id) : target ? idsOn([target], ev.id) : [];
    if (!back && !target && !tiles.length) return out;
    out.fx.push({ ...base, kind: "ohDash", back, target, dur, hitIds, hitDelay: back ? OHGER_FX.pass1 : OHGER_FX.hit });
    if (back) { out.look = midT; out.shake.push(OHGER_FX.pass1, OHGER_FX.pass2); }
    else { out.look = target || tiles[tiles.length - 1] || from; if (target) out.shake.push(OHGER_FX.hit); }
  } else if (ev.kind === "needle") {
    if (!tiles.length) return out;
    out.fx.push({ ...base, kind: "ohNeedle", hitIds: idsOn(tiles, ev.id), hitDelay: OHGER_FX.hit });
    out.look = midT;
  } else if (ev.kind === "wave") {
    if (!tiles.length) return out;
    out.fx.push({ ...base, kind: "ohWave", hitIds: idsOn(tiles, ev.id), hitDelay: Math.round(OHGER_FX.waveReach * 0.6) });
  }
  return out;
}
