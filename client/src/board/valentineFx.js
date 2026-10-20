// ============================================================
//  เอฟเฟกต์บนกระดานของฟันนี่ วาเลนไทน์ (funny_valentine · สแตนด์ D4C · GRID_PLAN §7.13)
//  ห้ามวาดตัวสแตนด์ D4C (ผู้ใช้สั่ง 2026-10-20) — เอฟเฟกต์เท่านั้น · ไม่มีตัวอักษร ドジャァァ～ン (กฎข้อความใน UI)
//  ต้นฉบับ: ข้ามมิติ = ถูกบีบระหว่างของสองอย่าง (ธงกับพื้น) ไม่มีแสง/ประตู · ธง Betsy Ross (ดาว 13 ดวงเรียงวง ปลายแฉกชี้ออก)
//   · ตัวเหมือนเจอกัน = ชิ้นเมนเจอร์สปันจ์สีเดียวกับตัว (ไม่มีแสง) · พาข้ามโลก (ASB) = ธงผืนใหญ่คลุม → กล้องกลับหัวแล้วตั้งตรง
//   · ร่างแยก = วาเลนไทน์อีกคนก้าวออกจากหลังธง · ปืนลูกโม่ Colt SAA ยุค 1890 · ตะเข็บ D4C ชมพูบานเย็น #F06AB8 / ฟ้า #A8F8FC
//
//  เหตุการณ์ (socket "valentineFx" → valentineEventFx · จังหวะตาม VAL_FX ซึ่ง server รอผ่าน engine.skillBeat):
//   veilIn     valVeilIn     ธงถูกโยนขึ้น → ตกคลุมตัว ตัวถูกกดแบนหายใต้ผ้า → ผ้าแผ่ราบบนช่อง → เสาธงตั้งขึ้น (= ธงปักจาก state)
//   veilOut    valVeilOut    ธงที่ปักพับลงพื้น → ผ้ายกขึ้น ตัวโผล่จากล่างขึ้นบน → ผ้าปลิวหมุนออก
//   shots      valShots      ปืนลูกโม่ยิงทีละนัด (แสงปากกระบอก + เส้นกระสุน + ควัน) · พลาด = กระสุนเฉียดผ่าน
//   reload     valReload     ลูกโม่ 6 รังเหนือหัว กระสุนทองเข้าทีละนัด → หมุนปิด
//   parallelIn valParallel   ธงผืนใหญ่ปลิวไปคลุมแนว 4×3 → พื้นที่พลิกกลับหัวแล้วตั้งตรง (valentineFlip) → คนใน ids วูบฟ้าย้ายโลก
//   doubleSpawn valDoubleSpawn ผ้าตั้งขึ้นจากพื้น → เลื่อนออกข้าง ตัวเหมือนก้าวออกมา → ผ้าตกหาย
//   doubleRun  valDoubleRun  ตัวเหมือนวิ่งตามทาง (valentinePose) · menger valMenger ลูกบาศก์เจาะรูลอกจากทั้งคู่พุ่งชนกัน → ตัวเหมือนพังเป็นก้อน
//   doubleBreak valDoubleBreak ตัวเหมือนแตกเป็นลูกบาศก์ · dimOut valDimOut ผ้าปัดผ่านตัว กลับโลกหลัก
//   clones     valClones     ธงหมุนรอบตัว → วาเลนไทน์อีก 3 คนก้าวออกจากหลังธงที่ช่องเกิด · cloneFade valCloneFade ผ้าตกคลุมแล้วหาย
//   justice    valJustice    ผ้าพันรอบตัวหมุน → แสงวาบ → ผ้าคลาย เผยวาเลนไทน์อีกคน (แถบเลือดขึ้นหลังผ้าคลาย)
//   gain       valGain       ประกายเล็กๆ + ตะเข็บรอบฐาน (แต้มสกิลจากติดตัว)
//  ตีปกติ (attackStyle): valKnife ระยะ 1 = ปลายมีดวาบ → ฟันโค้งขาวขอบชมพูบานเย็น → ตะเข็บประค้าง · valGun ระยะ 2 = ลูกโม่ยิง 1 นัด
//  ภาพค้างจาก state: board.valentine.flags = ธงปักโบกตลอด (valentineItems — เรียงความลึกกับตัวละคร)
//   · units[].ghostDim = คนละโลก: โปร่ง + ภาพซ้อนเหลื่อม + ขอบฟ้า/ชมพู · units[].summon.kind "double" = ตะเข็บกระพริบรอบหมาก + สีเหลื่อมนิด
//   · dimView "par" = โลกคู่ขนาน (ซีดนิด + ฟ้าจาง + ภาพซ้อนบาง) · "veil" = มองจากหลังผ้า (ซีด เย็น ลายแถบธงจางมาก) — valentineDimLayer
//  หมากในฉาก: valentineMod (ซ่อน/ตัดภาพ/บีบ/เจาะรู/แฟลช) · valentinePuppets = ภาพที่จับไว้ตอนเกิดเหตุการณ์ (ตัวที่หายจาก state แล้ว)
//  lowQ = ตัดอนุภาค/ภาพซ้อน/การพลิก · ลดการเคลื่อนไหว = ธงหยุดโบก ไม่พลิกพื้นที่ · ไม่เล่นเสียง (server เล่นเอง)
// ============================================================
import { P, depthOf, gEllipse, glow, hexPath, normColor, rgbOf, viewAxes } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

// ---------- จังหวะ (ms) — สัญญากับ server (GRID_PLAN §7.13) ----------
export const VAL_FX = {
  veilIn: 1100, veilOut: 1000, shot: 260, shotStep: 220, reload: 700, parallelIn: 1800, doubleSpawn: 700,
  doubleRun: 400, doubleRunStep: 200, menger: 1500, doubleBreak: 900, dimOut: 900, clones: 1400, cloneFade: 700, justice: 1600, gain: 600,
};
export const valShotsMs = (n) => VAL_FX.shot + VAL_FX.shotStep * Math.max(1, Number(n) || 1);
export const valRunMs = (steps) => VAL_FX.doubleRun + VAL_FX.doubleRunStep * Math.max(0, Number(steps) || 0);
// ตีปกติ (attackStyle) — boardDraw รวมเข้า STYLE_MS / STYLE_HIT_P
const KN_HIT = 250, GUN_FIRE = 140, GUN_FLY = 70;
export const VAL_MS = { valKnife: 560, valGun: 720 };
export const VAL_HIT_P = { valKnife: KN_HIT / VAL_MS.valKnife, valGun: (GUN_FIRE + GUN_FLY) / VAL_MS.valGun };
const SHOT_T0 = 120, SHOT_FLY = 70; // ปืนแห่งสันติภาพ: นัดแรก · กระสุนถึงเป้า
const HOLD = 2400;  // หมากที่ฉากย้าย ค้างที่ปลายทางจน state มาถึง
const TAIL = 320;   // หลบสายตา: ตัวจริงค่อยๆ ปรากฏหลังฉาก (คนที่ยังเห็นตัว เช่นเจ้าของ)
const PING_MS = 120;
const M = { peel: 16, peelGap: 34, peelFly: 270, crumble0: 640, crumble1: 1050, hit: 1000, life: 520 }; // เมนเจอร์
export const VAL_FX_DUR = {
  ...VAL_MS,
  valVeilIn: VAL_FX.veilIn + TAIL, valVeilOut: VAL_FX.veilOut, valShots: valShotsMs(3) + 400, valReload: VAL_FX.reload,
  valParallel: VAL_FX.parallelIn, valDoubleSpawn: VAL_FX.doubleSpawn, valDoubleRun: valRunMs(8) + HOLD, valMenger: VAL_FX.menger + HOLD,
  valDoubleBreak: VAL_FX.doubleBreak + HOLD, valDimOut: VAL_FX.dimOut, valClones: VAL_FX.clones, valCloneFade: VAL_FX.cloneFade + HOLD,
  valJustice: VAL_FX.justice, valGain: VAL_FX.gain, valPing: PING_MS,
};
export const isValentineFx = (kind) => typeof kind === "string" && (kind in VAL_FX_DUR);

// ---------- สี ----------
const RED = "#B22234", WHITE = "#FFFFFF", BLUE = "#3C3B6E", INK = "26,26,26";
const CYAN = "168,248,252", FUCH = "240,106,184", FLASH = "255,244,194", FLASH2 = "255,179,71";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const easeOut2 = (t) => 1 - (1 - t) * (1 - t);
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const okT = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const ptOf = (p) => ({ x: p.x, y: p.y });
const samePt = (a, b) => okT(a) && okT(b) && a.x === b.x && a.y === b.y;
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
function puff(g, x, y, r, a, rgb = "214,210,204") {
  if (a <= 0.01 || r <= 0.5) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---------- รูปตัวละคร (แคชของไฟล์นี้ — สีชิ้นลูกบาศก์มาจากรูปจริง) ----------
const IMGS = new Map();
function imgEntry(url) {
  if (!url || typeof Image !== "function") return null;
  let e = IMGS.get(url);
  if (!e) {
    const img = new Image(), entry = { img, ok: false, grid: null };
    img.decoding = "async";
    img.onload = () => { entry.ok = img.naturalWidth > 0; };
    img.src = url;
    IMGS.set(url, entry);
    e = entry;
  }
  return e;
}
// สีของรูปตามตำแหน่ง (u, v ใน 0..1 ของกรอบหกเหลี่ยม · ครอปแบบ cover เหมือน unitHex) — null = ยังโหลดไม่เสร็จ/อ่านไม่ได้
const GW = 12, GH = 10;
function portraitAt(url, u, v) {
  const e = imgEntry(url);
  if (!e || !e.ok) return null;
  if (!e.grid) {
    try {
      const c = document.createElement("canvas"); c.width = GW; c.height = GH;
      const x = c.getContext("2d"), iw = e.img.naturalWidth, ih = e.img.naturalHeight, ir = iw / ih, r = 2 / 1.74;
      let sw, sh, sx, sy;
      if (ir > r) { sh = ih; sw = sh * r; sx = (iw - sw) / 2; sy = 0; } else { sw = iw; sh = sw / r; sx = 0; sy = (ih - sh) * 0.08; }
      x.drawImage(e.img, sx, sy, sw, sh, 0, 0, GW, GH);
      e.grid = x.getImageData(0, 0, GW, GH).data;
    } catch { e.grid = "x"; }
  }
  if (e.grid === "x") return null;
  const i = Math.max(0, Math.min(GW - 1, Math.floor(u * GW))), j = Math.max(0, Math.min(GH - 1, Math.floor(v * GH))), k = (j * GW + i) * 4;
  if (e.grid[k + 3] < 90) return null;
  return [e.grid[k], e.grid[k + 1], e.grid[k + 2]];
}
export const preloadValentineArt = (urls = []) => { for (const u of urls) imgEntry(u); };

// ---------- กรอบหมากบนจอ (พิกัดตรรกะ — ตรงกับ drawUnit / drawBigUnit ใน boardDraw.js) ----------
//  rx, ry = มุมบนซ้าย (หน่วยช่อง ทศนิยมได้) · n = ขนาดตัว · hz = ลอย · k = ขยายหกเหลี่ยม
export function unitBox(rx, ry, n = 1, hz = 0, k = 1) {
  if (n > 1) {
    const [bx, by, s] = P(rx + n / 2, ry + n / 2), h = n * s * 1.32, w = h * 0.72, foot = by + s * n * 0.28 - hz * s * 0.85;
    return { bx, by: foot, s, hy: foot - h * 0.6, hexR: w * 0.45, top: foot - h, bottom: foot + s * 0.1, l: bx - w * 0.6, r: bx + w * 0.6 };
  }
  const [bx, by, s] = P(rx + 0.5, ry + 0.5), hexR = s * 0.4 * k, hy = by - s * 0.86 * k - hz * s * 0.85, half = Math.max(30, s * 0.58);
  return { bx, by, s, hy, hexR, top: hy - hexR * 0.87 - 3, bottom: by + s * 0.16, l: bx - half, r: bx + half };
}

// ============================================================ ธงชาติ Betsy Ross (ผ้า)
//  map(u, v) → [x, y] จุดบนจอ · u = ด้านเสา (0) → ปลายธง (1) · v = บน (0) → ล่าง (1)
//  แถบ 13 แถบ (แดงบนสุด/ล่างสุด) · มุมน้ำเงินกว้าง 0.4 สูง 7 แถบ · ดาว 13 ดวงเรียงวง ปลายแฉกชี้ออกจากวง
const STR = 13, CANT_V = 7, CANT_U = 0.4;
function uCols(u0, u1, n) {
  const us = [];
  for (let i = 0; i <= n; i++) us.push(u0 + ((u1 - u0) * i) / n);
  if (CANT_U > u0 + 1e-4 && CANT_U < u1 - 1e-4 && !us.some((u) => Math.abs(u - CANT_U) < 1e-4)) { us.push(CANT_U); us.sort((a, b) => a - b); }
  return us;
}
function region(g, pts, i0, i1, j0, j1) {
  g.beginPath();
  for (let i = i0; i <= i1; i++) { const p = pts[i][j0]; if (i === i0) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]); }
  for (let j = j0 + 1; j <= j1; j++) { const p = pts[i1][j]; g.lineTo(p[0], p[1]); }
  for (let i = i1 - 1; i >= i0; i--) { const p = pts[i][j1]; g.lineTo(p[0], p[1]); }
  for (let j = j1 - 1; j > j0; j--) { const p = pts[i0][j]; g.lineTo(p[0], p[1]); }
  g.closePath();
}
function sampleAt(pts, us, u, v) {
  let i = 0;
  while (i < us.length - 2 && us[i + 1] < u) i++;
  const a = clamp01((u - us[i]) / Math.max(1e-6, us[i + 1] - us[i])), fj = Math.max(0, Math.min(STR - 1e-6, v * STR)), j = fj | 0, b = fj - j;
  const p00 = pts[i][j], p10 = pts[i + 1][j], p01 = pts[i][j + 1], p11 = pts[i + 1][j + 1];
  return [lerp(lerp(p00[0], p10[0], a), lerp(p01[0], p11[0], a), b), lerp(lerp(p00[1], p10[1], a), lerp(p01[1], p11[1], a), b)];
}
// o = { u0, u1 (ส่วนของผืน), alpha, lowQ, shade(u) → −1..1 (รอยพับ), back (0..1 = เห็นด้านหลัง/อยู่ในเงา), white (0..1 = วาบขาว), edge }
function drawCloth(g, map, o = {}) {
  const u0 = o.u0 == null ? 0 : o.u0, u1 = o.u1 == null ? 1 : o.u1;
  if (u1 - u0 < 0.004 || (o.alpha != null && o.alpha <= 0.01)) return;
  const n = Math.max(2, Math.ceil((o.lowQ ? 6 : o.fine ? 18 : 12) * (u1 - u0)));
  const us = uCols(u0, u1, n), N = us.length - 1;
  const pts = us.map((u) => { const c = new Array(STR + 1); for (let j = 0; j <= STR; j++) c[j] = map(u, j / STR); return c; });
  let ic = us.findIndex((u) => u >= CANT_U - 1e-4);
  if (ic < 0) ic = N;
  g.save();
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  g.lineJoin = "round";
  region(g, pts, 0, N, 0, STR); g.fillStyle = WHITE; g.fill();
  g.fillStyle = RED;
  g.beginPath();
  for (let j = 0; j < STR; j += 2) {
    const i0 = j < CANT_V ? ic : 0;
    if (i0 >= N) continue;
    for (let i = i0; i <= N; i++) { const p = pts[i][j]; if (i === i0) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]); }
    for (let i = N; i >= i0; i--) { const p = pts[i][j + 1]; g.lineTo(p[0], p[1]); }
    g.closePath();
  }
  g.fill();
  if (ic > 0) {
    region(g, pts, 0, ic, 0, CANT_V); g.fillStyle = BLUE; g.fill();
    // ดาว 13 ดวงเรียงวง (ปลายแฉกชี้ออก)
    const cu = 0.2, cv = 3.5 / STR, c0 = sampleAt(pts, us, Math.max(u0, Math.min(u1, cu)), cv);
    const hpx = Math.hypot(pts[0][STR][0] - pts[0][0][0], pts[0][STR][1] - pts[0][0][1]), rr = Math.max(0.7, hpx * 0.034);
    g.fillStyle = WHITE;
    g.beginPath();
    for (let k = 0; k < 13; k++) {
      const th = -Math.PI / 2 + (k / 13) * TAU, su = cu + Math.cos(th) * 0.105, sv = cv + Math.sin(th) * 0.165;
      if (su < u0 || su > u1) continue;
      const [x, y] = sampleAt(pts, us, su, sv);
      if (o.lowQ || rr < 1.4) { g.moveTo(x + rr * 0.7, y); g.arc(x, y, rr * 0.7, 0, TAU); continue; }
      const rot = Math.atan2(y - c0[1], x - c0[0]);
      for (let q = 0; q < 10; q++) {
        const a = rot + (q * Math.PI) / 5, r = q % 2 ? rr * 0.42 : rr;
        if (q) g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.closePath();
    }
    g.fill();
  }
  // รอยพับ/แสงเงาตามคลื่นผ้า (ไล่สีตามแนวผืน)
  const mid = STR >> 1;
  if (o.shade && !o.lowQ) {
    const A = pts[0][mid], B = pts[N][mid];
    if (Math.hypot(B[0] - A[0], B[1] - A[1]) > 2) {
      const gr = g.createLinearGradient(A[0], A[1], B[0], B[1]);
      for (let i = 0; i <= N; i++) {
        const sv = Math.max(-1, Math.min(1, o.shade(us[i]))), at = i / N;
        gr.addColorStop(at, sv >= 0 ? `rgba(255,255,255,${0.2 * sv})` : `rgba(18,10,32,${-0.32 * sv})`);
      }
      region(g, pts, 0, N, 0, STR); g.fillStyle = gr; g.fill();
    }
  }
  if (o.back > 0.01) { region(g, pts, 0, N, 0, STR); g.fillStyle = `rgba(16,14,40,${0.45 * o.back})`; g.fill(); }
  if (o.white > 0.01) { region(g, pts, 0, N, 0, STR); g.fillStyle = `rgba(255,255,255,${0.85 * o.white})`; g.fill(); }
  if (o.edge !== false) {
    region(g, pts, 0, N, 0, STR);
    g.strokeStyle = "rgba(34,26,44,.45)"; g.lineWidth = 1; g.stroke();
  }
  g.restore();
}
const mixMap = (a, b, k) => (k <= 0 ? a : k >= 1 ? b : (u, v) => { const p = a(u, v), q = b(u, v); return [lerp(p[0], q[0], k), lerp(p[1], q[1], k)]; });
function rotMap(m, cx, cy, ang, sc = 1, dx = 0, dy = 0) {
  const c = Math.cos(ang) * sc, s = Math.sin(ang) * sc;
  return (u, v) => { const p = m(u, v), x = p[0] - cx, y = p[1] - cy; return [cx + dx + x * c - y * s, cy + dy + x * s + y * c]; };
}
const flutterT = (now) => (REDUCED ? 0 : now);

// ---------- รูปแบบผ้า ----------
// ผ้าแผ่ราบบนช่อง (กลางช่อง cx, cy · sc = ขนาด · rip = คลื่นเล็กๆ)
function groundMap(cx, cy, sc = 1, rip = 0, t = 0) {
  const ax = viewAxes();
  return (u, v) => {
    const a = (u - 0.5) * 0.98 * sc, b = (v - 0.5) * 0.66 * sc, z = 0.016 + (rip ? rip * 0.05 * (0.5 + 0.5 * Math.sin(u * 7 - t * 0.012 + v * 2)) : 0);
    return P(cx + ax.rx * a + ax.fx * b, cy + ax.ry * a + ax.fy * b, z);
  };
}
// ผ้าตั้งเป็นแผ่นหน้าตัว (จุดจอ): bx = กลาง · yb = ขอบล่าง · W, H = กว้าง/สูง (px) · round = โค้งคลุมหัว · amp = คลื่น
function sheetMap(bx, yb, W, H, t, round = 1, amp = 1, seed = 0) {
  const ph = (t * TAU) / 520 + seed;
  return (u, v) => [
    bx + (u - 0.5) * W * (1 - 0.16 * (1 - v) * round) + Math.sin(v * 3.6 + ph) * W * 0.035 * amp,
    yb - (1 - v) * H - Math.sin(u * Math.PI) * H * 0.16 * round + Math.sin(u * 6.5 - ph * 1.3) * H * 0.045 * amp,
  ];
}
// ธงปักบนเสา: เสาที่มุมหลังซ้ายของช่อง · คืน { foot, top, map, shade }
const POLE_H = 1.55;
function plantedGeo(x, y, now, rise = 1, seed = 0) {
  const ax = viewAxes(), cx = x + 0.5 - ax.fx * 0.3 - ax.rx * 0.27, cy = y + 0.5 - ax.fy * 0.3 - ax.ry * 0.27;
  const foot = P(cx, cy, 0), top = P(cx, cy, POLE_H * rise), s = foot[2];
  const W = s * 0.9, H = s * 0.56, ph = (flutterT(now) * TAU) / 1050 + seed, k = 5.4;
  const map = (u, v) => {
    const w = Math.sin(u * k - ph + v * 0.55);
    return [top[0] + 1.5 + u * W - H * 0.06 * u * (1 + Math.cos(u * k - ph)), top[1] + s * 0.03 + v * H * (1 - 0.05 * u) + H * 0.13 * u * w + H * 0.06 * u * u];
  };
  return { cx, cy, foot, top, s, map, shade: (u) => Math.cos(u * k - ph) * Math.min(1, u * 2.4) };
}
function drawPole(g, G, a = 1, rise = 1) {
  if (a <= 0.01 || rise <= 0.01) return;
  const { foot, top, s } = G, w = Math.max(1.6, s * 0.04);
  g.save(); g.globalAlpha *= a; g.lineCap = "round";
  g.strokeStyle = "#4a3a2c"; g.lineWidth = w + 1.2; g.beginPath(); g.moveTo(foot[0], foot[1]); g.lineTo(top[0], top[1]); g.stroke();
  g.strokeStyle = "#a88a62"; g.lineWidth = w * 0.45; g.beginPath(); g.moveTo(foot[0] - w * 0.18, foot[1]); g.lineTo(top[0] - w * 0.18, top[1]); g.stroke();
  // ยอดเสา (ลูกทอง)
  const r = Math.max(1.6, s * 0.045);
  const gr = g.createRadialGradient(top[0] - r * 0.3, top[1] - r * 1.3, 0, top[0], top[1] - r, r * 1.2);
  gr.addColorStop(0, "#fff3c0"); gr.addColorStop(1, "#b0842c");
  g.fillStyle = gr; g.beginPath(); g.arc(top[0], top[1] - r, r, 0, TAU); g.fill();
  g.restore();
}
function poleShadow(g, G, a = 1) {
  gEllipse(g, G.cx + 0.05, G.cy + 0.04, 0.12, 0, 16);
  g.fillStyle = `rgba(0,0,0,${0.22 * a})`; g.fill();
}
// ธงปักทั้งผืน (ภาพค้างจาก state + ฉากปัก/ถอน) — fold 0..1 = ผ้าลงไปแผ่บนพื้น · rise = ความสูงเสา
function drawPlanted(g, x, y, now, lowQ, o = {}) {
  const rise = o.rise == null ? 1 : o.rise, fold = o.fold || 0, a = o.a == null ? 1 : o.a;
  const G = plantedGeo(x, y, now, Math.max(0.02, rise), (x * 7 + y * 13) % 5);
  poleShadow(g, G, a);
  drawPole(g, G, a, rise);
  const flat = groundMap(x + 0.5, y + 0.5, 0.92, 1, now);
  drawCloth(g, mixMap(G.map, flat, easeInOut(fold)), { alpha: a, lowQ, shade: fold < 0.6 ? G.shade : null });
}

// ============================================================ ฉาก (เวลา → ค่าแบบไม่ขึ้นกับกล้อง)
//  ทุกฉากคืนค่าเป็นสัดส่วนของตัวหมาก (0 = หัว · 1 = เท้า) ให้ทั้งตัววาดผ้าและ valentineMod ใช้ร่วมกัน
// หลบสายตา (เข้า): ผ้าตกจากเหนือหัว → ขอบล่างผ้าลงถึงเท้า (ตัวถูกตัด/บีบ) → แผ่ราบ → เสาตั้ง
const VI = { toss: 230, fall: 580, flat: 760 };
function veilInS(t) {
  if (t < VI.toss) { const q = easeOut2(t / VI.toss); return { ph: "toss", yb: -0.45 - 0.4 * q, h: 0.55 + 0.2 * q, sc: 0.45 + 0.55 * q, clip: 0, sy: 1 }; }
  if (t < VI.fall) { const q = seg(t, VI.toss, VI.fall), e = easeIn2(q) * 0.55 + easeInOut(q) * 0.45; return { ph: "fall", yb: lerp(-0.85, 1.02, e), h: lerp(0.75, 0.32, q), sc: 1, clip: clamp01(lerp(-0.85, 1.02, e)), sy: 1 - 0.38 * seg(t, VI.toss + 160, VI.fall) }; }
  if (t < VI.flat) return { ph: "flat", k: easeOut2(seg(t, VI.fall, VI.flat)), clip: 1, sy: 0.6 };
  return { ph: "rise", k: easeInOut(seg(t, VI.flat, VAL_FX.veilIn)), clip: 1, sy: 0.6 };
}
// หลบสายตา (ออก): ธงที่ปัก (from) พับลงพื้น · ผ้าที่ช่องโผล่ (at) ยกขึ้น ตัวเผยจากล่างขึ้นบน → ผ้าปลิวหมุนออก
const VO = { fold: 340, lift0: 360, lift1: 760 };
function veilOutS(t) {
  if (t < VO.lift0) return { ph: "ground", clip: 1, sy: 0.75 };
  if (t < VO.lift1) { const q = easeInOut(seg(t, VO.lift0, VO.lift1)), yb = lerp(1.02, -0.12, q); return { ph: "lift", q, yb, h: lerp(0.3, 0.72, q), clip: clamp01(yb), sy: lerp(0.75, 1, easeOut2(seg(t, VO.lift0, VO.lift1 - 80))) }; }
  return { ph: "fly", q: seg(t, VO.lift1, VAL_FX.veilOut), clip: 0, sy: 1 };
}
// ผ้าตั้ง → เลื่อนเผยตัว → ตก (ตัวเหมือนโผล่ · ร่างแยกโผล่) — t นับจากผ้าเริ่มตั้ง · dir = ผ้าเลื่อนไปทาง (−1 ซ้าย / +1 ขวาบนจอ)
const RV = { up: 190, slide: 430, drop: 620 };
function revealS(t) {
  if (t < 0) return { ph: "none", hide: true };
  if (t < RV.up) return { ph: "up", k: easeOut3(t / RV.up), hide: true };
  if (t < RV.slide) return { ph: "slide", k: easeInOut(seg(t, RV.up, RV.slide)) };
  if (t < RV.drop) return { ph: "drop", k: easeIn2(seg(t, RV.slide, RV.drop)) };
  return { ph: "done" };
}
// ผ้าตกคลุมแล้วหาย (ร่างแยกหมดเวลา) — คล้ายหลบสายตาแต่เร็วกว่า
const CF = { fall: 300, flat: 430 };
function coverS(t) {
  if (t < CF.fall) { const q = easeIn2(t / CF.fall); return { ph: "fall", yb: lerp(-0.7, 1.02, q), h: lerp(0.72, 0.3, q), clip: clamp01(lerp(-0.7, 1.02, q)), sy: 1 - 0.35 * q }; }
  if (t < CF.flat) return { ph: "flat", k: easeOut2(seg(t, CF.fall, CF.flat)), clip: 1 };
  return { ph: "gone", k: seg(t, CF.flat, VAL_FX.cloneFade), clip: 1 };
}
// ร่างแยก: ช่องเกิดที่ i เริ่มเมื่อไร (ผ้าบินถึงช่อง)
const CL = { twirl: 640, first: 420, gap: 120, fly: 210 };
const cloneStart = (i) => CL.first + i * CL.gap;
// ความยุติธรรม: พันรอบตัว → วาบ → คลาย
const JU = { rise: 300, wrap: 960, flash: 1060, unwrap: 1400 };
// พาข้ามโลก
const PA = { fly: 420, settle: 640, lift0: 640, lift1: 900, flip0: 700, flip1: 1400, shim: 1250 };
// ออกจากโลกคู่ขนาน: ผ้าปัดผ่านตัว
const DO = { s0: 120, s1: 720 };

// ============================================================ หมากในฉาก (BoardCanvas / boardDraw)
//  mod = { hide, a (คูณความทึบ), clip (0..1 ตัดจากหัวลงมา), sy (บีบแนวตั้งรอบเท้า), side: { f, keep } (เผยแนวนอน),
//          holes: { n, order } (เจาะรูเมนเจอร์), white (0..1), tint: { rgb, a }, noBar, echo (ภาพซ้อน) }
//  ค่า mod ไม่ขึ้นกับกล้อง (สัดส่วนของตัวหมาก) — คิดได้ก่อน drawFrame ตั้งกล้อง
function sceneMod(e, id, t) {
  switch (e.kind) {
    case "valVeilIn": {
      if (e.id !== id) return null;
      if (t < VAL_FX.veilIn) return { hide: true };
      return { a: clamp01((t - VAL_FX.veilIn) / TAIL) };
    }
    case "valVeilOut": return e.id === id && t < VAL_FX.veilOut ? { hide: true } : null;
    case "valDoubleSpawn": return e.id === id ? revealMod(revealS(t), e.side) : null;
    case "valDoubleRun": return e.id === id && e.pup && t < runEnd(e) ? { hide: true } : null;
    case "valClones": {
      const i = (e.spawns || []).findIndex((s) => s.id === id);
      if (i < 0) return null;
      return revealMod(revealS(t - cloneStart(i) - CL.fly), (e.spawns[i].side) || 1);
    }
    case "valCloneFade": return (e.list || []).some((p) => p.id === id) ? { hide: true } : null;
    case "valMenger": {
      if (e.id === id) return { hide: true };
      if (e.targetId !== id) return null;
      const n = mengerTargetHoles(t);
      return n > 0 ? { holes: { n, order: cellOrder(e.seedT, e.biasT) } } : null;
    }
    case "valDoubleBreak": return e.id === id ? { hide: true } : null;
    case "valJustice": {
      if (e.id !== id) return null;
      // ผ้าพันมิด = ตัวหายไปหลังผ้า → วาบขาวตอนผ้าคลาย (อีกคนหนึ่ง) ค่อยๆ เป็นสีปกติ
      return { noBar: t < JU.unwrap - 20, a: t < JU.flash ? 1 - seg(t, JU.rise - 80, JU.rise + 60) : 1, white: t >= JU.flash && t < JU.unwrap + 120 ? 1 - seg(t, JU.flash, JU.unwrap + 120) : 0 };
    }
    case "valParallel": {
      if (!(e.ids || []).includes(id) || t < PA.flip0 - 200) return null;
      const k = Math.sin(Math.PI * seg(t, PA.shim - 150, VAL_FX.parallelIn));
      return k > 0.01 ? { tint: { rgb: CYAN, a: 0.32 * k }, echo: k } : null;
    }
    case "valDimOut": {
      const i = (e.ids || []).indexOf(id);
      if (i < 0) return null;
      const k = Math.sin(Math.PI * seg(t, DO.s0 + 120, DO.s1 + 80));
      return k > 0.01 ? { tint: { rgb: CYAN, a: 0.32 * k }, echo: k } : null;
    }
    default: return null;
  }
}
function revealMod(R, side) {
  if (R.hide) return { hide: true };
  if (R.ph === "slide") return { side: { f: R.k, keep: side } };
  return null;
}
function mergeMod(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.hide || b.hide) return { hide: true };
  return { ...a, ...b, a: (a.a == null ? 1 : a.a) * (b.a == null ? 1 : b.a) };
}
// หมากจริง (BoardCanvas ส่งต่อเป็น u.valMod)
export function valentineMod(list, u, now) {
  if (!u || u.id == null || !Array.isArray(list)) return null;
  let m = null;
  for (const e of list) {
    if (!e || typeof e.kind !== "string" || !e.kind.startsWith("val")) continue;
    const t = now - e.t0;
    if (t < 0 || t >= (e.dur || VAL_FX_DUR[e.kind] || 0)) continue;
    m = mergeMod(m, sceneMod(e, u.id, t));
  }
  return m;
}
// เดินตามทางแบบคน (ก้าวละ doubleRunStep · ไม่กระโดด) — ช่วงแรก WALK_LEAD ยืนหันหาเป้า · null = เดินจบแล้ว
const WALK_LEAD = 220;
const runEnd = (e) => valRunMs(Math.max(1, (e.path || []).length - 1)); // = เวลาที่ server รอ (เดิน + หยุดยืน) — ฉากชนต่อทันที
function walkAt(path, t) {
  const steps = path.length - 1, run = steps * VAL_FX.doubleRunStep;
  if (t < WALK_LEAD) return { x: path[0].x, y: path[0].y, hz: 0 };
  if (t >= WALK_LEAD + run) return null;
  const f = ((t - WALK_LEAD) / run) * steps, i = Math.min(steps - 1, Math.floor(f)), k = f - i, a = path[i], b = path[i + 1];
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), hz: REDUCED ? 0 : Math.abs(Math.sin(Math.PI * k)) * 0.035 };
}
// หมากที่ฉากย้ายเอง: ตัวเหมือนวิ่งเข้าหา (doubleRun) — คืน { x, y, hz } | null · จบแล้วค้างปลายทางจน state มาถึง
export function valentinePose(list, u, now) {
  if (!u || u.id == null || !Array.isArray(list)) return null;
  for (const e of list) {
    if (!e || e.kind !== "valDoubleRun" || e.id !== u.id) continue;
    const t = now - e.t0, path = e.path || [];
    if (t < 0 || t >= e.dur || path.length < 2) continue;
    const at = walkAt(path, t);
    if (at) return at;
    const end = path[path.length - 1];
    if (samePt(u, path[0]) || samePt(u, end)) return { x: end.x, y: end.y, hz: 0 };
  }
  return null;
}
// ภาพที่จับไว้ตอนเกิดเหตุการณ์ (ตัวที่ state เอาออก/ซ่อนแล้ว) — รูปแบบเดียวกับหมากของ BoardCanvas
function puppet(e, p, mod, extra = {}) {
  return {
    id: `~val:${e.t0}:${p.id}`, rx: p.x, ry: p.y, ox: 0, oy: 0, hz: 0, sq: 0, color: normColor(p.color), img: p.img, name: p.name,
    hp: p.hp, maxHp: p.maxHp, armor: p.armor, maxArmor: p.maxArmor, isMe: false, isActor: false, tag: null, reticle: null, alpha: 1,
    size: Math.max(1, p.size | 0), summon: p.summon || null, valMod: mod, puppet: true, hitT: 0, ...extra,
  };
}
export function valentinePuppets(list, now, lowQ) {
  const out = [];
  if (!Array.isArray(list)) return out;
  for (const e of list) {
    if (!e || typeof e.kind !== "string" || !e.kind.startsWith("val")) continue;
    const t = now - e.t0;
    if (t < 0) continue;
    if (e.kind === "valVeilIn" && e.pup && t < VAL_FX.veilIn) {
      const S = veilInS(t);
      if (S.clip < 1) out.push(puppet(e, e.pup, { clip: S.clip, sy: S.sy, noBar: S.ph !== "toss" }, { lowQ }));
    } else if (e.kind === "valVeilOut" && e.pup && t < VAL_FX.veilOut + 400) {
      const S = veilOutS(t);
      if (S.clip < 1) out.push(puppet(e, e.pup, { clip: S.clip, sy: S.sy, noBar: S.ph !== "fly" }, { lowQ }));
    } else if (e.kind === "valCloneFade" && t < VAL_FX.cloneFade) {
      const S = coverS(t);
      if (S.clip < 1) for (const p of e.list || []) out.push(puppet(e, p, { clip: S.clip, sy: S.sy || 1, noBar: true }, { lowQ }));
    } else if (e.kind === "valDoubleRun" && e.pup && t < runEnd(e)) {
      const p = walkAt(e.path, t) || e.path[e.path.length - 1];
      out.push(puppet(e, { ...e.pup, x: p.x, y: p.y }, null, { hz: p.hz || 0, lowQ }));
    } else if (e.kind === "valMenger" && e.pup && t < M.crumble1 + 80) {
      const n = mengerDoubleHoles(t), off = mengerSlide(t);
      out.push(puppet(e, e.pup, { holes: n > 0 ? { n, order: cellOrder(e.seedD, e.biasD) } : null }, { ox: off * e.slide[0], oy: off * e.slide[1], lowQ }));
    } else if (e.kind === "valDoubleBreak" && e.pup && t < BR.c1 + 60) {
      const n = breakHoles(t);
      out.push(puppet(e, e.pup, { holes: n > 0 ? { n, order: cellOrder(e.seed, 0) } : null, white: 1 - seg(t, 0, 160), noBar: t > 120 }, { lowQ }));
    }
  }
  return out;
}

// ============================================================ เมนเจอร์สปันจ์
//  ตัวหมากแบ่งเป็นตาราง GX × GY · ลำดับช่องที่หลุด (cellOrder) ใช้ร่วมกันระหว่างรูบนตัว (clip) กับลูกบาศก์ที่บิน
const GX = 6, GY = 8, NCELL = GX * GY;
const ORD = new Map();
// bias = ทิศบนจอที่ช่องหลุดก่อน [vx, vy] (หันเข้าหาอีกตัว) · 0 = สุ่มทั่วตัว
function cellOrder(seed, bias) {
  const bv = Array.isArray(bias) ? bias : null, k = `${seed}|${bv ? bv.map((v) => v.toFixed(2)).join(",") : 0}`;
  let o = ORD.get(k);
  if (o) return o;
  const arr = [];
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
    const side = bv ? ((i + 0.5) / GX - 0.5) * bv[0] + ((j + 0.5) / GY - 0.5) * bv[1] * 1.3 : 0, mid = bv ? 0 : Math.abs((j + 0.5) / GY - 0.42) * 0.6;
    arr.push({ i, j, w: hash01(seed * 3.1 + i * 7.3 + j * 13.1) * 0.9 - side * 1.9 + mid });
  }
  arr.sort((a, b) => a.w - b.w);
  o = arr.map(({ i, j }) => ({ i, j }));
  if (ORD.size > 60) ORD.clear();
  ORD.set(k, o);
  return o;
}
// ตารางคลุมเฉพาะความกว้างหกเหลี่ยม (แถบเลือดกว้างกว่านิดหน่อย — ส่วนเกินไม่เจาะ)
function cellRect(B, c) {
  const l = B.bx - B.hexR * 1.12, W = B.hexR * 2.24, w = W / GX, h = (B.bottom - B.top) / GY;
  return { x: l + c.i * w, y: B.top + c.j * h, w, h };
}
// ช่องนี้มีเนื้อหมากไหม (หกเหลี่ยม · เสา · แถบเลือด · ฐาน) — ช่องว่างไม่ปล่อยลูกบาศก์
function cellSolid(B, c) {
  const R = cellRect(B, c), x = R.x + R.w / 2, y = R.y + R.h / 2, dx = Math.abs(x - B.bx);
  const hy0 = B.hy - B.hexR * 0.87, hy1 = B.hy + B.hexR * 0.87;
  if (y >= hy0 && y <= hy1) return dx <= B.hexR * (1 - 0.5 * Math.abs(y - B.hy) / (B.hexR * 0.87)) + R.w * 0.3;
  if (y > hy1 && y <= hy1 + 14) return true; // แถบเลือด
  if (y > B.by - B.s * 0.2) return (dx / (B.s * 0.36)) ** 2 + ((y - B.by + B.s * 0.05) / (B.s * 0.2)) ** 2 <= 1.2; // ฐาน
  return dx <= R.w * 0.6; // เสา
}
const NP = (lowQ) => (lowQ ? M.peel / 2 : M.peel);
const peelT = (m) => 40 + m * M.peelGap;
function mengerDoubleHoles(t) {
  let n = 0;
  for (let m = 0; m < M.peel; m++) if (t >= peelT(m)) n++;
  if (t >= M.crumble0) n += Math.floor((NCELL - M.peel) * seg(t, M.crumble0, M.crumble1));
  return Math.min(NCELL, n);
}
function mengerTargetHoles(t) {
  let n = 0;
  for (let m = 0; m < M.peel; m++) if (t >= peelT(m)) n++;
  return Math.round(n * (1 - seg(t, M.hit + 40, M.hit + 360)));
}
const mengerSlide = (t) => 0.22 * easeIn2(seg(t, 420, M.crumble0)); // ตัวเหมือนไถลเข้าหาเป้า (หน่วยช่อง)
const BR = { c0: 70, c1: 560 }; // แตกสลาย: ช่องแรก/สุดท้ายหลุด
const breakHoles = (t) => Math.floor(NCELL * seg(t, BR.c0, BR.c1));
// สีของช่องจากรูปจริง (ในกรอบหกเหลี่ยม) ไม่งั้นสีประจำตัว
function cellColor(B, c, img, fb) {
  const R = cellRect(B, c), cx = R.x + R.w / 2, cy = R.y + R.h / 2;
  const u = (cx - (B.bx - B.hexR)) / (2 * B.hexR), v = (cy - (B.hy - B.hexR * 0.87)) / (1.74 * B.hexR);
  if (u >= 0 && u <= 1 && v >= 0 && v <= 1) { const p = portraitAt(img, u, v); if (p) return p; }
  if (cy > B.hy + B.hexR * 0.87 + 2 && cy < B.hy + B.hexR * 0.87 + 12) return [42, 52, 78]; // แถบเลือด
  return fb;
}
// ลูกบาศก์เมนเจอร์ (จุดจอ): สามหน้าเห็น · แต่ละหน้ามีรูสี่เหลี่ยมกลาง (1/3) + เส้นแบ่ง 3×3 จางๆ · ขอบหมึก
function mengerCube(g, x, y, sz, rot, rgb, a, lowQ) {
  if (a <= 0.01 || sz < 1) return;
  const h = sz * 0.5, c = 0.866 * h;
  const T = [[0, -h], [c, -h * 0.5], [0, 0], [-c, -h * 0.5]], L = [[-c, -h * 0.5], [0, 0], [0, h], [-c, h * 0.5]], R = [[0, 0], [c, -h * 0.5], [c, h * 0.5], [0, h]];
  const sh = (k) => `rgb(${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v * k)))).join(",")})`;
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha *= a;
  const face = (F, k) => {
    g.beginPath(); g.moveTo(F[0][0], F[0][1]); for (let i = 1; i < 4; i++) g.lineTo(F[i][0], F[i][1]); g.closePath();
    g.fillStyle = sh(k); g.fill();
    // รูกลางหน้า (1/3 ของด้าน)
    const o = F[0], e1 = [F[1][0] - o[0], F[1][1] - o[1]], e2 = [F[3][0] - o[0], F[3][1] - o[1]];
    const p = (a1, a2) => [o[0] + e1[0] * a1 + e2[0] * a2, o[1] + e1[1] * a1 + e2[1] * a2];
    const q = [p(1 / 3, 1 / 3), p(2 / 3, 1 / 3), p(2 / 3, 2 / 3), p(1 / 3, 2 / 3)];
    g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) g.lineTo(q[i][0], q[i][1]); g.closePath();
    g.fillStyle = `rgba(${INK},.78)`; g.fill();
    if (!lowQ && sz > 7) {
      g.beginPath();
      for (const s of [1 / 3, 2 / 3]) { let A = p(s, 0), B = p(s, 1); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); A = p(0, s); B = p(1, s); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); }
      g.strokeStyle = `rgba(${INK},.28)`; g.lineWidth = 0.6; g.stroke();
    }
  };
  face(T, 1.18); face(L, 0.9); face(R, 0.66);
  g.beginPath(); g.moveTo(0, -h); g.lineTo(c, -h * 0.5); g.lineTo(c, h * 0.5); g.lineTo(0, h); g.lineTo(-c, h * 0.5); g.lineTo(-c, -h * 0.5); g.closePath();
  g.moveTo(0, 0); g.lineTo(0, h); g.moveTo(0, 0); g.lineTo(-c, -h * 0.5); g.moveTo(0, 0); g.lineTo(c, -h * 0.5);
  g.strokeStyle = `rgba(${INK},.9)`; g.lineWidth = Math.max(0.7, sz * 0.07); g.stroke();
  g.restore();
}
// แสงวาบสี่เหลี่ยมเล็ก (ลูกบาศก์ชนกันแล้วหาย)
function squarePop(g, x, y, s, age) {
  if (age < 0 || age > 110) return;
  const q = age / 110, r = s * (0.35 + 0.9 * q);
  g.save(); g.translate(x, y); g.rotate(0.785);
  g.strokeStyle = `rgba(255,255,255,${0.95 * (1 - q)})`; g.lineWidth = 1.4; g.strokeRect(-r, -r, r * 2, r * 2);
  g.fillStyle = `rgba(255,255,255,${0.7 * (1 - q)})`; g.fillRect(-r * 0.45, -r * 0.45, r * 0.9, r * 0.9);
  g.restore();
}

// ============================================================ ชิ้นวาดหมากที่มี valMod / คนละโลก / ตัวเหมือน (boardDraw drawAnyUnit)
//  draw(u, withBoxes) = วาดหมากแบบปกติ · ตัวคนละโลก (ghostDim) ไม่ส่งกล่องคลิก (กดไม่ได้)
export function drawValUnit(g, u, now, draw) {
  const m = u.valMod || null;
  if (m && m.hide) return;
  const n = Math.max(1, u.size | 0), B = unitBox(u.rx + (u.ox || 0), u.ry + (u.oy || 0), n, u.hz || 0, u.k || 1);
  const base = u.alpha == null ? 1 : u.alpha, a = base * (m && m.a != null ? clamp01(m.a) : 1);
  if (a <= 0.01) return;
  const uu = { ...u, alpha: a, valMod: null, ghostDim: false, summon: null, noBar: !!(m && m.noBar) || u.noBar };
  g.save();
  if (m) {
    if (m.sy != null && m.sy !== 1) { g.translate(B.bx, B.by); g.scale(1 + (1 - m.sy) * 0.18, m.sy); g.translate(-B.bx, -B.by); }
    const clip = m.clip > 0, side = m.side && m.side.f < 1, holes = m.holes && m.holes.n > 0;
    if (clip || side || holes) {
      const L = B.l - 30, R = B.r + 30, T = B.top - 60, Bo = B.bottom + 24;
      let y0 = T, x0 = L, x1 = R;
      if (clip) y0 = B.top + (B.bottom - B.top) * m.clip;
      // ผ้าเลื่อนไปทาง keep (+1 ขวา / −1 ซ้าย) → เห็นเฉพาะส่วนที่ผ้าพ้นแล้ว (ตรงกับขอบผ้าใน revealItems)
      if (side) {
        const Ws = Math.max(B.s * 1.18, (B.r - B.l) * 0.95), sh = Ws * 1.02 * m.side.f;
        if (m.side.keep > 0) x1 = B.bx - Ws / 2 + sh; else x0 = B.bx + Ws / 2 - sh;
      }
      g.beginPath(); g.rect(x0, y0, Math.max(0, x1 - x0), Math.max(0, Bo - y0));
      if (holes) for (let q = 0; q < Math.min(NCELL, m.holes.n); q++) { const r = cellRect(B, m.holes.order[q]); g.rect(r.x - 0.3, r.y - 0.3, r.w + 0.6, r.h + 0.6); }
      g.clip("evenodd");
    }
  }
  const ghost = !!u.ghostDim, dbl = !!(u.summon && u.summon.kind === "double");
  const t = REDUCED ? 0 : now;
  // คนละโลก: ภาพซ้อนเหลื่อม (อีกโลกทับกัน)
  if ((ghost || (m && m.echo > 0.01)) && !u.lowQ) {
    const k = ghost ? 1 : m.echo, d = (2.5 + Math.sin(t / 640) * 1.2) * k;
    g.save(); g.translate(d, -d * 0.35); draw({ ...uu, alpha: a * (ghost ? 0.42 : 0.35 * k), hitT: 0, tag: null, isActor: false }, false); g.restore();
  }
  if (dbl && !u.lowQ && "filter" in g) {
    g.filter = `hue-rotate(${(Math.sin(t / 900) * 9).toFixed(1)}deg) saturate(1.06)`;
    draw(uu, !ghost);
    g.filter = "none";
  } else draw(uu, !ghost);
  // แฟลชขาว (สลับร่าง) / สีวูบ (ย้ายโลก)
  const flash = (alphaK, style) => {
    g.save(); hexPath(g, B.bx, B.hy, B.hexR - 1); g.fillStyle = style; g.globalAlpha = alphaK; g.fill();
    if (n === 1) { gEllipse(g, u.rx + (u.ox || 0) + 0.5, u.ry + (u.oy || 0) + 0.5, 0.32, 0.12, 24); g.fill(); }
    g.restore();
  };
  if (m && m.white > 0.01) flash(Math.min(1, m.white) * a, "#ffffff");
  if (m && m.tint && m.tint.a > 0.01) {
    g.save(); g.globalCompositeOperation = "lighter"; flash(m.tint.a * a, `rgb(${m.tint.rgb})`); g.restore();
  }
  // ขอบฟ้า/ชมพูบานเย็นเหลื่อมกัน (คนละโลก)
  if (ghost) {
    const d = 2 + Math.sin(t / 700) * 1.2, ga = (u.lowQ ? 0.4 : 0.32 + 0.12 * Math.sin(t / 380)) * Math.min(1, base / 0.38);
    g.lineWidth = 1.6;
    hexPath(g, B.bx + d, B.hy, B.hexR + 2); g.strokeStyle = `rgba(${CYAN},${ga})`; g.stroke();
    hexPath(g, B.bx - d, B.hy, B.hexR + 2); g.strokeStyle = `rgba(${FUCH},${ga * 0.85})`; g.stroke();
  }
  // ตัวเหมือน: ตะเข็บ D4C รอบหมาก กระพริบเบาๆ
  if (dbl) stitchHex(g, B.bx, B.hy, B.hexR + 4.5, a * (u.lowQ ? 0.6 : 0.5 + 0.22 * (0.5 + 0.5 * Math.sin(t / 430)) + (hash01(Math.floor(t / 95)) > 0.94 ? 0.28 : 0)), t, u.lowQ);
  g.restore();
}
// ตะเข็บแบบลูกเบสบอล (เส้นประ + บั้งเล็กๆ ตามแนว) รอบหกเหลี่ยม
function stitchHex(g, cx, cy, r, a, t, lowQ) {
  if (a <= 0.01) return;
  const ry = r * 0.866, V = [[cx - r, cy], [cx - r / 2, cy - ry], [cx + r / 2, cy - ry], [cx + r, cy], [cx + r / 2, cy + ry], [cx - r / 2, cy + ry]];
  g.save();
  g.strokeStyle = `rgba(${FUCH},${a})`; g.lineWidth = 1.6; g.setLineDash([4, 3]); g.lineDashOffset = -t / 90;
  hexPath(g, cx, cy, r); g.stroke();
  g.setLineDash([]);
  if (!lowQ) {
    g.beginPath();
    const step = 9, off = (t / 90) % step;
    for (let k = 0; k < 6; k++) {
      const A = V[k], Bv = V[(k + 1) % 6], L = Math.hypot(Bv[0] - A[0], Bv[1] - A[1]), tx = (Bv[0] - A[0]) / L, ty = (Bv[1] - A[1]) / L, nx = ty, ny = -tx;
      for (let d = off; d < L; d += step) {
        const x = A[0] + tx * d, y = A[1] + ty * d;
        g.moveTo(x - nx * 2.6 - tx * 1.6, y - ny * 2.6 - ty * 1.6); g.lineTo(x, y); g.lineTo(x + nx * 2.6 - tx * 1.6, y + ny * 2.6 - ty * 1.6);
      }
    }
    g.lineWidth = 1; g.strokeStyle = `rgba(${FUCH},${a * 0.8})`; g.stroke();
  }
  g.restore();
}

// ============================================================ ผ้าในฉาก + ธงปัก (เรียงความลึกกับตัวละคร — boardDraw)
//  flags = state.board.valentine.flags [{ x, y, ownerId }] · คืนผ่าน items.push({ d, f })
const K = (p) => `${p.x},${p.y}`;
export function valentineItems(items, g, flags, fx, now, lowQ) {
  const hideFlag = new Set();
  const vfx = Array.isArray(fx) ? fx.filter((e) => e && typeof e.kind === "string" && e.kind.startsWith("val")) : [];
  for (const e of vfx) {
    if (e.kind === "valVeilIn" && okT(e.flag) && now - e.t0 < VAL_FX.veilIn) hideFlag.add(K(e.flag));
    if (e.kind === "valVeilOut" && okT(e.from) && now - e.t0 < VAL_FX.veilOut) hideFlag.add(K(e.from)); // state อาจยังไม่เอาธงออก
  }
  for (const f of Array.isArray(flags) ? flags : []) {
    if (!okT(f) || hideFlag.has(K(f))) continue;
    const G = plantedGeo(f.x, f.y, now);
    items.push({ d: depthOf(G.cx, G.cy) - 0.02, f: () => drawPlanted(g, f.x, f.y, now, lowQ) });
  }
  for (const e of vfx) {
    const t = now - e.t0;
    if (t < 0) continue;
    switch (e.kind) {
      case "valVeilIn": veilInItems(items, g, e, t, now, lowQ); break;
      case "valVeilOut": veilOutItems(items, g, e, t, now, lowQ); break;
      case "valDoubleSpawn": if (okT(e.at)) revealItems(items, g, e.at, e.size || 1, t, e.side, now, lowQ); break;
      case "valClones": clonesItems(items, g, e, t, now, lowQ); break;
      case "valCloneFade": for (const p of e.list || []) coverItems(items, g, p, t, now, lowQ); break;
      case "valJustice": justiceItems(items, g, e, t, now, lowQ); break;
      case "valDimOut": dimOutItems(items, g, e, t, now, lowQ); break;
      default:
    }
  }
}
const dTile = (p, n = 1) => depthOf(p.x + n / 2, p.y + n / 2);
// แผ่นผ้าหน้าตัว (ค่าแบบสัดส่วน → px) · yb/h เป็นสัดส่วนของความสูงตัว
function sheetFor(B, yb, h, now, o = {}) {
  const H = B.bottom - B.top, W = Math.max(B.s * 1.18, (B.r - B.l) * 0.95) * (o.w || 1);
  return sheetMap(B.bx + (o.dx || 0), B.top + H * yb + (o.dy || 0), W, H * h, flutterT(now), o.round == null ? 1 : o.round, o.amp == null ? 1 : o.amp, o.seed || 0);
}
function veilInItems(items, g, e, t, now, lowQ) {
  if (!okT(e.at) || t >= VAL_FX.veilIn) return;
  const flag = okT(e.flag) ? e.flag : e.at, n = (e.pup && e.pup.size) || 1, S = veilInS(t);
  items.push({
    d: dTile(e.at, n) + 0.004,
    f: () => {
      const B = unitBox(e.at.x, e.at.y, n);
      if (S.ph === "toss" || S.ph === "fall") {
        let m = sheetFor(B, S.yb, S.h, now, { amp: S.ph === "toss" ? 1.6 : 1.2, round: S.ph === "fall" ? 1.2 : 0.6 });
        if (S.ph === "toss") m = rotMap(m, B.bx, B.top + (B.bottom - B.top) * (S.yb - S.h / 2), (1 - S.sc) * 1.2, S.sc);
        drawCloth(g, m, { lowQ, alpha: S.ph === "toss" ? clamp01(t / 90) : 1, shade: (u) => Math.sin(u * 6 - now / 90) * 0.6 });
        // เงาผ้าบนพื้นเข้มขึ้นตอนตกลง
        if (S.ph === "fall") { gEllipse(g, e.at.x + 0.5, e.at.y + 0.5, 0.42, 0, 24); g.fillStyle = `rgba(0,0,0,${0.18 * clamp01(S.yb)})`; g.fill(); }
        return;
      }
      const flat = groundMap(e.at.x + 0.5, e.at.y + 0.5, 0.92, 1, now);
      if (S.ph === "flat") {
        const sheet = sheetFor(B, 1.02, 0.3, now, { round: 1.2 });
        drawCloth(g, mixMap(sheet, flat, S.k), { lowQ, shade: (u) => Math.sin(u * 5 - now / 120) * 0.5 * (1 - S.k) });
        return;
      }
      // เสาตั้งขึ้น ผ้าขึ้นไปโบกบนเสา (ช่องที่ปัก)
      if (samePt(flag, e.at)) drawPlanted(g, flag.x, flag.y, now, lowQ, { rise: S.k, fold: 1 - S.k });
      else {
        drawCloth(g, flat, { lowQ, alpha: 1 - S.k });
        drawPlanted(g, flag.x, flag.y, now, lowQ, { rise: S.k, fold: 1 - S.k, a: S.k });
      }
    },
  });
}
function veilOutItems(items, g, e, t, now, lowQ) {
  if (!okT(e.at)) return;
  const same = samePt(e.from, e.at), n = (e.pup && e.pup.size) || 1;
  // ธงที่ปัก (from): พับลงพื้น · คนละช่อง = จางหาย
  if (okT(e.from) && t < (same ? VO.lift0 : VO.fold + 160)) {
    const k = easeInOut(seg(t, 0, VO.fold));
    items.push({ d: dTile(e.from) + 0.004, f: () => drawPlanted(g, e.from.x, e.from.y, now, lowQ, { rise: 1 - k, fold: k, a: same ? 1 : 1 - seg(t, VO.fold - 60, VO.fold + 160) }) });
  }
  if (t >= VAL_FX.veilOut) return;
  const S = veilOutS(t);
  items.push({
    d: dTile(e.at, n) + 0.004,
    f: () => {
      const B = unitBox(e.at.x, e.at.y, n), flat = groundMap(e.at.x + 0.5, e.at.y + 0.5, 0.92, 1, now);
      if (S.ph === "ground") {
        if (same && t < VO.fold) return;
        drawCloth(g, flat, { lowQ, alpha: same ? 1 : seg(t, 140, VO.lift0) });
        return;
      }
      if (S.ph === "lift") {
        const sheet = sheetFor(B, S.yb, S.h, now, { round: 1.1, amp: 1.2 });
        drawCloth(g, mixMap(flat, sheet, easeOut3(clamp01(S.q * 3))), { lowQ, shade: (u) => Math.sin(u * 6 - now / 90) * 0.6 });
        return;
      }
      // ปลิวออก: ลอยขึ้นขวา หมุน หด จาง
      const q = S.q, H = B.bottom - B.top, sheet = sheetFor(B, -0.12, 0.72, now, { round: 1.1, amp: 1.8 });
      const cx = B.bx, cy = B.top + H * (-0.12 - 0.36);
      drawCloth(g, rotMap(sheet, cx, cy, easeIn2(q) * 2.4, 1 - 0.45 * q, B.s * 1.1 * easeIn2(q), -B.s * 1.5 * easeOut2(q)), { lowQ, alpha: 1 - easeIn2(q), shade: (u) => Math.sin(u * 7 - now / 70) * 0.7 });
    },
  });
}
// ผ้าตั้งขึ้นจากพื้น → เลื่อนออกข้าง (เผยตัว) → ตกลงพื้นแล้วจาง · side = ผ้าเลื่อนไปทาง +1 ขวา / −1 ซ้ายบนจอ (ฝั่งตรงข้ามเผยก่อน)
function revealItems(items, g, at, n, t, side, now, lowQ, alpha = 1) {
  const R = revealS(t), dir = side === -1 ? -1 : 1;
  if (R.ph === "none" || R.ph === "done") return;
  items.push({
    d: dTile(at, n) + 0.004,
    f: () => {
      const B = unitBox(at.x, at.y, n), W = Math.max(B.s * 1.18, (B.r - B.l) * 0.95), flat = groundMap(at.x + 0.5, at.y + 0.5, 0.92, 1, now);
      if (R.ph === "up") { drawCloth(g, mixMap(flat, sheetFor(B, 1.02, 1.1, now, { round: 0.5 }), R.k), { lowQ, alpha: alpha * clamp01(t / 80), shade: (u) => Math.sin(u * 6 - now / 100) * 0.5 }); return; }
      if (R.ph === "slide") { drawCloth(g, sheetFor(B, 1.02, 1.1, now, { round: 0.5, dx: dir * W * 1.02 * R.k, amp: 1.3 }), { lowQ, alpha, shade: (u) => Math.sin(u * 7 - now / 80) * 0.6 }); return; }
      // ตก: ผ้ายุบลงพื้นข้างตัว แล้วจาง
      const off = { x: at.x + 0.5 + viewAxes().rx * dir * 0.95, y: at.y + 0.5 + viewAxes().ry * dir * 0.95 };
      drawCloth(g, mixMap(sheetFor(B, 1.02, 1.1, now, { round: 0.5, dx: dir * W * 1.02 }), groundMap(off.x, off.y, 0.9, 1, now), R.k), { lowQ, alpha: alpha * (1 - easeIn2(R.k)) });
    },
  });
}
function coverItems(items, g, p, t, now, lowQ) {
  if (!okT(p) || t >= VAL_FX.cloneFade) return;
  const n = p.size || 1, S = coverS(t);
  items.push({
    d: dTile(p, n) + 0.004,
    f: () => {
      const B = unitBox(p.x, p.y, n), flat = groundMap(p.x + 0.5, p.y + 0.5, 0.92, 1, now);
      if (S.ph === "fall") { drawCloth(g, sheetFor(B, S.yb, S.h, now, { round: 1.2, amp: 1.3 }), { lowQ, alpha: clamp01(t / 70), shade: (u) => Math.sin(u * 6 - now / 90) * 0.6 }); return; }
      if (S.ph === "flat") { drawCloth(g, mixMap(sheetFor(B, 1.02, 0.3, now, { round: 1.2 }), flat, S.k), { lowQ }); return; }
      // ผ้าจมหายลงพื้น
      drawCloth(g, groundMap(p.x + 0.5, p.y + 0.5, 0.92 * (1 - 0.6 * S.k), 1, now), { lowQ, alpha: 1 - S.k });
    },
  });
}
// ผ้าพันรอบตัวแบบทรงกระบอก — แบ่งช่วงที่หันหลัง (วาดก่อนตัว) / หันหน้า (วาดหลังตัว)
//  c = { cx, cy, r, th0, span (เรเดียน), z0, z1, a, white, wave }
function cylItems(items, g, d, c, now, lowQ) {
  if (c.a <= 0.01 || c.span <= 0.02) return;
  const ax = viewAxes();
  const th = (u) => c.th0 + u * c.span;
  const facing = (u) => Math.cos(th(u)) * ax.fx + Math.sin(th(u)) * ax.fy;
  const map = (u, v) => {
    const a = th(u), w = (c.wave || 0) * Math.sin(u * 9 - now / 70);
    const z = lerp(c.z1, c.z0, v) + w * 0.05, rr = c.r * (1 + w * 0.04);
    return P(c.cx + Math.cos(a) * rr, c.cy + Math.sin(a) * rr, z);
  };
  // ช่วงที่หันทางเดียวกัน
  const N = 32, cuts = [0];
  let prev = facing(0) >= 0;
  for (let i = 1; i <= N; i++) { const u = i / N, f = facing(u) >= 0; if (f !== prev) { cuts.push((i - 0.5) / N); prev = f; } }
  cuts.push(1);
  for (let k = 0; k < cuts.length - 1; k++) {
    const u0 = cuts[k], u1 = cuts[k + 1], front = facing((u0 + u1) / 2) >= 0;
    items.push({ d: d + (front ? 0.006 : -0.006), f: () => drawCloth(g, map, { u0, u1, lowQ, alpha: c.a, back: front ? 0 : 0.55, white: c.white || 0, shade: (u) => facing(u) * 0.5 }) });
  }
}
function clonesItems(items, g, e, t, now, lowQ) {
  if (!okT(e.at)) return;
  // ธงหมุนรอบตัว (หมุน 1.3 รอบ ยกตัวขึ้น แล้วคลายออก)
  if (t < CL.twirl + 120) {
    const q = seg(t, 0, CL.twirl), out = seg(t, CL.twirl - 200, CL.twirl + 120);
    cylItems(items, g, dTile(e.at), {
      cx: e.at.x + 0.5, cy: e.at.y + 0.5, r: 0.55 + 0.35 * out, th0: -1.2 + easeOut2(q) * TAU * 1.3, span: 2.5 * (1 - out * 0.5), z0: 0.05 + 0.5 * out, z1: lerp(0.5, 1.45, easeOut2(seg(t, 0, 260))) + 0.5 * out,
      a: clamp01(t / 90) * (1 - out), wave: 1,
    }, now, lowQ);
  }
  // ผ้าบินไปช่องเกิดแต่ละช่อง → ร่างแยกก้าวออกจากหลังผ้า
  (e.spawns || []).forEach((sp, i) => {
    if (!okT(sp.at)) return;
    const t0 = cloneStart(i), tl = t - t0;
    if (tl < 0) return;
    if (tl < CL.fly) {
      const q = easeInOut(tl / CL.fly);
      items.push({
        d: lerp(dTile(e.at), dTile(sp.at), q) + 0.004,
        f: () => {
          const A = unitBox(e.at.x, e.at.y), B = unitBox(sp.at.x, sp.at.y), H = B.bottom - B.top;
          const x = lerp(A.bx, B.bx, q), y = lerp(A.top, B.bottom, q) - Math.sin(Math.PI * q) * H * 0.55;
          const m = sheetMap(x, y, B.s * 1.1 * (0.5 + 0.5 * q), H * 1.1 * (0.4 + 0.6 * q), flutterT(now), 0.5, 2, i);
          drawCloth(g, rotMap(m, x, y - H * 0.5, (1 - q) * 1.4 * (i % 2 ? -1 : 1)), { lowQ, shade: (u) => Math.sin(u * 8 - now / 60) * 0.7 });
        },
      });
      return;
    }
    revealItems(items, g, sp.at, 1, tl - CL.fly, sp.side, now, lowQ);
  });
}
function justiceItems(items, g, e, t, now, lowQ) {
  if (!okT(e.at) || t >= JU.unwrap + 80) return;
  const rise = easeOut2(seg(t, 0, JU.rise)), un = easeIn2(seg(t, JU.flash, JU.unwrap)), spin = REDUCED ? 0 : t * 0.011 + easeIn2(seg(t, JU.rise, JU.flash)) * 7;
  const tight = easeInOut(seg(t, JU.rise, JU.wrap));
  const white = t > JU.wrap ? Math.sin(Math.PI * seg(t, JU.wrap, JU.flash + 60)) : 0;
  cylItems(items, g, dTile(e.at), {
    cx: e.at.x + 0.5, cy: e.at.y + 0.5, r: lerp(0.62, 0.44, tight) + un * 0.5, th0: spin, span: lerp(1.2, TAU * 1.02, easeOut2(seg(t, 0, JU.rise + 120))) * (1 - un * 0.55),
    z0: 0.02 + un * 1.1, z1: lerp(0.15, 1.5, rise) + un * 1.2, a: clamp01(t / 70) * (1 - un), white, wave: 0.8,
  }, now, lowQ);
}
function dimOutItems(items, g, e, t, now, lowQ) {
  if (t < DO.s0 || t > DO.s1 + 60) return;
  (e.at || []).forEach((p, i) => {
    if (!okT(p)) return;
    const q = easeInOut(seg(t, DO.s0 + i * 40, DO.s1 + i * 40));
    if (q <= 0 || q >= 1) return;
    items.push({
      d: dTile(p, p.size || 1) + 0.004,
      f: () => {
        const B = unitBox(p.x, p.y, p.size || 1), W = Math.max(B.s * 1.18, (B.r - B.l) * 0.95);
        drawCloth(g, sheetFor(B, 1.02, 1.08, now, { round: 0.5, dx: lerp(-W * 1.15, W * 1.15, q), amp: 1.5 }), { lowQ, alpha: Math.sin(Math.PI * q) * 1.3, shade: (u) => Math.sin(u * 7 - now / 70) * 0.6 });
      },
    });
  });
}

// ============================================================ ปืนลูกโม่ / มีด (จุดจอ)
// ปืนลูกโม่ Colt SAA: ลำกล้องยาว · ลูกโม่มีร่อง · ด้ามไม้โค้ง · L = ยาวทั้งกระบอก (px)
function drawRevolver(g, x, y, L, ang, a = 1) {
  if (a <= 0.01) return;
  g.save(); g.translate(x, y); g.rotate(ang);
  if (Math.cos(ang) < 0) g.scale(1, -1);
  g.globalAlpha *= a;
  g.lineJoin = "round";
  g.fillStyle = "#353a42"; g.fillRect(-L * 0.02, -L * 0.075, L * 0.66, L * 0.09);           // ลำกล้อง
  g.fillStyle = "#596170"; g.fillRect(L * 0.06, L * 0.018, L * 0.42, L * 0.035);            // ก้านกระทุ้ง
  g.fillStyle = "#353a42"; g.fillRect(L * 0.6, -L * 0.11, L * 0.03, L * 0.04);              // ศูนย์หน้า
  g.fillStyle = "#4b525d"; g.beginPath(); g.roundRect ? g.roundRect(-L * 0.17, -L * 0.1, L * 0.22, L * 0.17, L * 0.04) : g.rect(-L * 0.17, -L * 0.1, L * 0.22, L * 0.17); g.fill();
  g.strokeStyle = "rgba(20,22,26,.8)"; g.lineWidth = Math.max(0.6, L * 0.015);
  g.beginPath(); for (let i = 1; i < 3; i++) { const yy = -L * 0.1 + (L * 0.17 * i) / 3; g.moveTo(-L * 0.15, yy); g.lineTo(L * 0.03, yy); } g.stroke(); // ร่องลูกโม่
  g.fillStyle = "#2a2e34"; g.beginPath(); g.moveTo(-L * 0.17, -L * 0.08); g.lineTo(-L * 0.27, -L * 0.15); g.lineTo(-L * 0.24, -L * 0.05); g.closePath(); g.fill(); // นกสับ
  g.strokeStyle = "#2a2e34"; g.lineWidth = Math.max(0.8, L * 0.022); g.beginPath(); g.arc(-L * 0.06, L * 0.1, L * 0.065, 0.1, Math.PI * 0.95); g.stroke(); // โกร่งไก
  const gr = g.createLinearGradient(-L * 0.3, 0, -L * 0.12, L * 0.3); gr.addColorStop(0, "#9a6234"); gr.addColorStop(1, "#5a3418");
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(-L * 0.17, L * 0.06); g.quadraticCurveTo(-L * 0.2, L * 0.22, -L * 0.3, L * 0.36); g.lineTo(-L * 0.4, L * 0.32); g.quadraticCurveTo(-L * 0.33, L * 0.16, -L * 0.3, L * 0.02); g.closePath(); g.fill(); // ด้าม
  g.strokeStyle = "rgba(20,14,8,.7)"; g.lineWidth = 0.8; g.stroke();
  g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(0, -L * 0.07, L * 0.6, L * 0.018);
  g.restore();
}
// แสงปากกระบอก (ดาวหกแฉก ครีม → ส้ม)
function muzzleFlash(g, x, y, r, ang, a) {
  if (a <= 0.01) return;
  g.save(); g.globalCompositeOperation = "lighter"; g.translate(x, y); g.rotate(ang);
  glow(g, 0, 0, r * 1.1, FLASH2, 0.6 * a);
  g.fillStyle = `rgba(${FLASH},${a})`;
  g.beginPath();
  for (let i = 0; i < 12; i++) { const an = (i / 12) * TAU, rr = i % 2 ? r * 0.22 : i === 0 ? r * 1.5 : r * 0.62; g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr * 0.62); }
  g.closePath(); g.fill();
  g.restore();
}
function tracer(g, A, Bp, k, tail, a, w) {
  if (a <= 0.01) return;
  const bx = lerp(A[0], Bp[0], k), by = lerp(A[1], Bp[1], k), tk = Math.max(0, k - tail), tx = lerp(A[0], Bp[0], tk), ty = lerp(A[1], Bp[1], tk);
  g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
  const gr = g.createLinearGradient(tx, ty, bx, by); gr.addColorStop(0, "rgba(255,220,150,0)"); gr.addColorStop(1, `rgba(255,248,220,${a})`);
  g.strokeStyle = gr; g.lineWidth = w; g.beginPath(); g.moveTo(tx, ty); g.lineTo(bx, by); g.stroke();
  g.restore();
}
function impact(g, x, y, s, age, dur, lowQ, seed, blood = true) {
  if (age < 0 || age > dur) return;
  const q = age / dur, a = 1 - q;
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, x, y, s * (0.2 + 0.4 * q), "255,250,235", 0.75 * a);
  const n = lowQ ? 5 : 10;
  g.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const th = hash01(seed + i) * TAU, r0 = s * 0.06, r1 = s * (0.16 + 0.36 * easeOut3(q)) * (0.6 + 0.7 * hash01(seed + i + 9));
    g.strokeStyle = `rgba(255,${i % 3 ? 255 : 236},${i % 3 ? 255 : 190},${a})`; g.lineWidth = Math.max(1, 1.6 * a);
    g.beginPath(); g.moveTo(x + Math.cos(th) * r0, y + Math.sin(th) * r0); g.lineTo(x + Math.cos(th) * r1, y + Math.sin(th) * r1); g.stroke();
  }
  g.restore();
  if (blood && !lowQ) {
    for (let i = 0; i < 6; i++) {
      const th = hash01(seed + i + 30) * TAU, d = s * 0.32 * easeOut2(q) * (0.5 + hash01(seed + i + 31)), dy = s * 0.28 * q * q;
      g.fillStyle = `rgba(150,14,26,${0.9 * a})`; g.beginPath(); g.arc(x + Math.cos(th) * d, y + Math.sin(th) * d * 0.7 + dy, Math.max(1, s * 0.022), 0, TAU); g.fill();
    }
  }
}
function smoke(g, x, y, s, age, life, seed, lowQ) {
  if (age < 0 || age > life) return;
  const q = age / life;
  for (let i = 0; i < (lowQ ? 2 : 4); i++) {
    const dx = (hash01(seed + i) - 0.5) * s * 0.25 + Math.sin(q * 3 + i) * s * 0.05, dy = -s * (0.08 + 0.42 * easeOut2(q)) * (0.7 + 0.3 * hash01(seed + i + 4));
    puff(g, x + dx, y + dy, s * (0.06 + 0.14 * q) * (0.8 + 0.4 * hash01(seed + i + 2)), 0.42 * (1 - q));
  }
}
// มีด (ใบเงิน ด้ามดำ) — L = ยาว (px) · ang = ทิศปลายใบ
function drawKnife(g, x, y, L, ang, a = 1, glint = 0) {
  if (a <= 0.01) return;
  g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha *= a;
  const bl = L * 0.62, w = L * 0.085;
  const gr = g.createLinearGradient(0, -w, 0, w); gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.5, "#cdd3dc"); gr.addColorStop(1, "#7c8592");
  g.fillStyle = gr; g.beginPath(); g.moveTo(bl, 0); g.quadraticCurveTo(bl * 0.5, -w * 1.2, 0, -w); g.lineTo(0, w * 0.75); g.quadraticCurveTo(bl * 0.6, w * 0.55, bl, 0); g.closePath(); g.fill();
  g.strokeStyle = "rgba(40,46,56,.75)"; g.lineWidth = 0.8; g.stroke();
  g.fillStyle = "#c9a24a"; g.fillRect(-L * 0.03, -w * 1.6, L * 0.06, w * 3.2);
  g.fillStyle = "#24242a"; g.beginPath(); g.ellipse(-L * 0.19, 0, L * 0.16, w * 0.9, 0, 0, TAU); g.fill();
  if (glint > 0.01) { g.globalCompositeOperation = "lighter"; sparkle(g, bl * 0.5, -w * 0.4, L * 0.34 * glint, glint, "255,255,255", 0.3); }
  g.restore();
}
// เส้นตะเข็บ (โค้ง) — pts = จุดจอ · เส้นประ 4/3 + บั้งไขว้
function stitchPath(g, pts, a, w, lowQ, rgb = FUCH) {
  if (a <= 0.01 || pts.length < 2) return;
  g.save(); g.lineCap = "round";
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.setLineDash([4, 3]); g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = w; g.stroke(); g.setLineDash([]);
  if (!lowQ) {
    g.beginPath();
    for (let i = 1; i < pts.length - 1; i += 2) {
      const p = pts[i], q = pts[i + 1], L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, nx = -(q[1] - p[1]) / L, ny = (q[0] - p[0]) / L;
      g.moveTo(p[0] - nx * 3, p[1] - ny * 3); g.lineTo(p[0] + nx * 3, p[1] + ny * 3);
    }
    g.lineWidth = w * 0.8; g.strokeStyle = `rgba(${rgb},${a * 0.75})`; g.stroke();
  }
  g.restore();
}

// ---------- ตีปกติ: มีด (ระยะ 1) ----------
//  e = { x, y, size (ผู้ตี), to: { x, y }, toSize, color } · ปะทะที่ KN_HIT
function knifeFx(g, e, t, now, lowQ) {
  if (!e.to || t >= VAL_MS.valKnife) return;
  const A = unitBox(e.x, e.y, e.size || 1), T = unitBox(e.to.x, e.to.y, e.toSize || 1);
  const ang = Math.atan2(T.hy - A.hy, T.bx - A.bx), R = T.hexR * 1.55;
  // 1) ปลายมีดวาบข้างตัว (ง้าง)
  if (t < 200) {
    const q = seg(t, 0, 160), back = ang + Math.PI * 0.62 * (1 - easeIn2(seg(t, 110, 200)));
    const hx = A.bx + Math.cos(ang) * A.hexR * 0.8, hy = A.hy + A.hexR * 0.3;
    drawKnife(g, hx, hy, A.s * 0.42, back, clamp01(q * 2) * (1 - seg(t, 170, 200)), Math.max(0, Math.sin(Math.PI * seg(t, 30, 150))));
  }
  // 2) ฟันโค้ง: ขาว ขอบชมพูบานเย็น · กวาดผ่านเป้า
  const s0 = 150, s1 = KN_HIT + 20;
  // วงโค้งผ่านกลางหมากเป้า (ฟันเฉียงจากบนลงล่าง)
  const cx = T.bx - Math.cos(ang) * R * 0.9, cy = T.hy - Math.sin(ang) * R * 0.9 * 0.78 + T.hexR * 0.1;
  const fl = Math.cos(ang) >= 0 ? 1 : -1, a0 = ang - 0.95 * fl, a1 = ang + 0.8 * fl, arc = (k) => [cx + Math.cos(lerp(a0, a1, k)) * R, cy + Math.sin(lerp(a0, a1, k)) * R * 0.78];
  if (t >= s0) {
    const sweep = easeOut3(seg(t, s0, s1)), fade = 1 - seg(t, s1 + 40, s1 + 220);
    if (fade > 0.01 && sweep > 0.02) {
      const N = 22, head = sweep, tailK = Math.max(0, sweep - 0.75);
      const outer = [], inner = [];
      for (let i = 0; i <= N; i++) {
        const k = lerp(tailK, head, i / N), w = T.hexR * 0.26 * Math.sin(Math.PI * (i / N)) * (0.6 + 0.4 * fade);
        const [x, y] = arc(k), nx = Math.cos(lerp(a0, a1, k)), ny = Math.sin(lerp(a0, a1, k)) * 0.78;
        outer.push([x + nx * w * 0.5, y + ny * w * 0.5]); inner.push([x - nx * w * 0.5, y - ny * w * 0.5]);
      }
      g.save();
      g.beginPath(); outer.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); for (let i = inner.length - 1; i >= 0; i--) g.lineTo(inner[i][0], inner[i][1]); g.closePath();
      g.fillStyle = `rgba(255,255,255,${0.95 * fade})`; g.fill();
      g.beginPath(); outer.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.strokeStyle = `rgba(${FUCH},${0.95 * fade})`; g.lineWidth = 1.8; g.stroke();
      if (!lowQ) { g.globalCompositeOperation = "lighter"; g.strokeStyle = `rgba(${FUCH},${0.35 * fade})`; g.lineWidth = 5; g.stroke(); }
      g.restore();
    }
  }
  // 3) ปะทะ: ประกายขาว
  if (t >= KN_HIT) impact(g, T.bx, T.hy, T.s, t - KN_HIT, 260, lowQ, 31 + (e.to.x | 0), true);
  // 4) ตะเข็บประค้างตามรอยฟัน แล้วจาง
  if (t >= KN_HIT - 10) {
    const a = seg(t, KN_HIT - 10, KN_HIT + 50) * (1 - seg(t, VAL_MS.valKnife - 170, VAL_MS.valKnife));
    const pts = []; for (let i = 0; i <= 16; i++) pts.push(arc(0.08 + 0.84 * (i / 16)));
    stitchPath(g, pts, a * 0.95, 1.5, lowQ);
  }
}
// ---------- ตีปกติ: ปืน (ระยะ 2) ----------
function gunFx(g, e, t, now, lowQ) {
  if (!e.to || t >= VAL_MS.valGun) return;
  const A = unitBox(e.x, e.y, e.size || 1), T = unitBox(e.to.x, e.to.y, e.toSize || 1);
  const ang = Math.atan2(T.hy - A.hy, T.bx - A.bx), L = A.s * 0.5;
  const raise = easeOut3(seg(t, 0, 110)), kick = t >= GUN_FIRE ? Math.exp(-(t - GUN_FIRE) / 70) * Math.sin(Math.PI * seg(t, GUN_FIRE, GUN_FIRE + 160)) : 0;
  const gx = A.bx + Math.cos(ang) * A.hexR * 1.02, gy = A.hy + A.hexR * 0.42 + Math.sin(ang) * A.hexR * 0.3 + (1 - raise) * A.s * 0.12;
  const ga = ang - kick * 0.55 * (Math.cos(ang) < 0 ? -1 : 1);
  drawRevolver(g, gx, gy, L, ga, raise * (1 - seg(t, VAL_MS.valGun - 160, VAL_MS.valGun)));
  const mx = gx + Math.cos(ga) * L * 0.66, my = gy + Math.sin(ga) * L * 0.66;
  if (t >= GUN_FIRE) {
    const age = t - GUN_FIRE;
    smoke(g, mx, my, A.s, age, 560, 17, lowQ);
    muzzleFlash(g, mx, my, A.s * 0.34, ang, 1 - seg(age, 0, 70));
    const tgt = [T.bx, T.hy];
    if (age < GUN_FLY + 90) tracer(g, [mx, my], tgt, clamp01(age / GUN_FLY), 0.55, age < GUN_FLY ? 1 : 1 - (age - GUN_FLY) / 90, Math.max(1.3, A.s * 0.035));
    if (age >= GUN_FLY) impact(g, tgt[0], tgt[1], T.s, age - GUN_FLY, 260, lowQ, 61 + (e.to.y | 0), true);
  }
}

// ============================================================ เหตุการณ์ (เอฟเฟกต์ทับตัวละคร)
function shotsFx(g, e, t, now, lowQ) {
  if (!okT(e.from)) return;
  const v = dirVec(e.dir) || [1, 0], A = unitBox(e.from.x, e.from.y), n = (e.shots || []).length;
  const fx0 = e.from.x + 0.5, fy0 = e.from.y + 0.5, far = P(fx0 + v[0] * 3, fy0 + v[1] * 3, 0.9);
  const ang = Math.atan2(far[1] - A.hy, far[0] - A.bx), L = A.s * 0.5, end = SHOT_T0 + VAL_FX.shotStep * Math.max(0, n - 1);
  // ปืนในมือตลอดชุด (ยกขึ้น → ยิงทีละนัด สะบัดทุกนัด → ลดลง)
  let kick = 0;
  for (let i = 0; i < n; i++) { const a = t - (SHOT_T0 + i * VAL_FX.shotStep); if (a >= 0 && a < 200) kick = Math.max(kick, Math.exp(-a / 60) * Math.sin(Math.PI * clamp01(a / 160))); }
  const raise = easeOut3(seg(t, 0, 100)), lower = seg(t, end + 260, end + 480);
  const gx = A.bx + Math.cos(ang) * A.hexR * 1.02, gy = A.hy + A.hexR * 0.42 + Math.sin(ang) * A.hexR * 0.3 + (1 - raise + lower) * A.s * 0.1;
  const ga = ang - kick * 0.6 * (Math.cos(ang) < 0 ? -1 : 1);
  drawRevolver(g, gx, gy, L, ga, raise * (1 - lower));
  const mx = gx + Math.cos(ga) * L * 0.66, my = gy + Math.sin(ga) * L * 0.66;
  (e.shots || []).forEach((sh, i) => {
    const age = t - (SHOT_T0 + i * VAL_FX.shotStep);
    if (age < 0) return;
    const m0 = [gx + Math.cos(ang) * L * 0.66, gy + Math.sin(ang) * L * 0.66];
    smoke(g, m0[0], m0[1], A.s, age, 600, 40 + i * 7, lowQ);
    muzzleFlash(g, mx, my, A.s * 0.32, ang, 1 - seg(age, 0, 60));
    // ปลายทาง: โดน = กลางหมากเป้า · พลาด = เฉียดข้างเป้าเลยไป · ไม่มีใคร = ช่องปลาย
    let B, hitAt = null;
    if (okT(sh.hitAt)) {
      const T = unitBox(sh.hitAt.x, sh.hitAt.y, sh.hitSize || 1);
      if (!sh.miss) { B = [T.bx, T.hy]; hitAt = T; } else {
        const side = i % 2 ? 1 : -1, ax = viewAxes(), px = sh.hitAt.x + 0.5 + v[0] * 1.2 + (ax.rx * side * 0.32), py = sh.hitAt.y + 0.5 + v[1] * 1.2 + (ax.ry * side * 0.32);
        B = P(px, py, 0.95);
      }
    } else if (okT(sh.to)) B = P(sh.to.x + 0.5, sh.to.y + 0.5, 0.75);
    else B = P(fx0 + v[0] * 5, fy0 + v[1] * 5, 0.75);
    const fly = SHOT_FLY * (sh.miss ? 1.4 : 1);
    if (age < fly + 90) tracer(g, m0, B, clamp01(age / fly), 0.5, age < fly ? 1 : 1 - (age - fly) / 90, Math.max(1.3, A.s * 0.034));
    if (age >= fly) {
      if (hitAt) impact(g, B[0], B[1], hitAt.s, age - fly, 240, lowQ, 77 + i * 13, true);
      else { const q = (age - fly) / 320; if (q < 1) for (let k = 0; k < (lowQ ? 2 : 4); k++) puff(g, B[0] + (hash01(k + i) - 0.5) * A.s * 0.3, B[1] + A.s * 0.18 - q * A.s * 0.2, A.s * (0.06 + 0.12 * q), 0.5 * (1 - q), "200,182,150"); }
    }
  });
}
function reloadFx(g, e, t, now, lowQ) {
  if (!okT(e.at) || t >= VAL_FX.reload) return;
  const B = unitBox(e.at.x, e.at.y), sx = B.bx, sy = B.top - B.s * 0.42, R = B.s * 0.24;
  const a = t < 110 ? t / 110 : t > VAL_FX.reload - 160 ? (VAL_FX.reload - t) / 160 : 1;
  const loadT = [90, 220, 350], lt = 120, loaded = loadT.filter((x) => t >= x + lt).length;
  // รังที่ว่างหมุนมาอยู่บนสุด (ช่องบรรจุ) ทีละรัง → ปิดแล้วหมุนฟรี
  let cnt = 0;
  for (const t0 of loadT) cnt += easeInOut(seg(t, t0 + lt, t0 + lt + 90));
  const spinK = seg(t, 470, 640), rot = -(TAU / 6) * cnt - easeOut3(spinK) * TAU * 1.5;
  g.save(); g.globalAlpha *= a;
  const gr = g.createRadialGradient(sx - R * 0.3, sy - R * 0.35, R * 0.1, sx, sy, R);
  gr.addColorStop(0, "#e1e5ea"); gr.addColorStop(1, "#4a525c");
  g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, R, 0, TAU); g.fill();
  g.strokeStyle = "#1e2228"; g.lineWidth = 1.4; g.stroke();
  for (let i = 0; i < 6; i++) {
    const an = rot + (i / 6) * TAU - Math.PI / 2, hx = sx + Math.cos(an) * R * 0.58, hy = sy + Math.sin(an) * R * 0.58, full = i < loaded;
    g.fillStyle = full ? "#d9a441" : "#121418"; g.beginPath(); g.arc(hx, hy, R * 0.21, 0, TAU); g.fill();
    if (full) { g.fillStyle = "#fff0c0"; g.beginPath(); g.arc(hx - R * 0.06, hy - R * 0.06, R * 0.07, 0, TAU); g.fill(); }
    // ร่องระหว่างรัง
    const fa = an + TAU / 12;
    g.strokeStyle = "rgba(30,34,40,.55)"; g.lineWidth = 1; g.beginPath(); g.moveTo(sx + Math.cos(fa) * R * 0.8, sy + Math.sin(fa) * R * 0.8); g.lineTo(sx + Math.cos(fa) * R * 0.98, sy + Math.sin(fa) * R * 0.98); g.stroke();
  }
  g.fillStyle = "#1e2228"; g.beginPath(); g.arc(sx, sy, R * 0.12, 0, TAU); g.fill();
  // กระสุนบินเข้ารัง
  loadT.forEach((t0, k) => {
    const q = seg(t, t0, t0 + lt);
    if (q <= 0 || q >= 1) return;
    const hx = sx, hy = sy - R * 0.58;
    const x = lerp(sx + R * 1.8, hx, easeIn2(q)), y = lerp(sy - R * 1.4, hy, easeIn2(q));
    g.save(); g.translate(x, y); g.rotate(Math.atan2(hy - (sy - R * 1.4), hx - (sx + R * 1.8)));
    g.fillStyle = "#d9a441"; g.beginPath(); g.ellipse(0, 0, R * 0.26, R * 0.12, 0, 0, TAU); g.fill();
    g.fillStyle = "#b07a2a"; g.fillRect(-R * 0.26, -R * 0.12, R * 0.12, R * 0.24);
    g.restore();
  });
  g.restore();
  // หมุนปิด: วงแสงขาว + ประกาย
  if (spinK > 0 && spinK < 1 && !lowQ) {
    g.save(); g.globalCompositeOperation = "lighter";
    g.strokeStyle = `rgba(255,255,255,${0.7 * (1 - spinK)})`; g.lineWidth = 1.6; g.beginPath(); g.arc(sx, sy, R * (1.1 + 0.8 * easeOut3(spinK)), 0, TAU); g.stroke();
    sparkle(g, sx + R * 0.7, sy - R * 0.7, R * 0.6 * (1 - spinK), 1 - spinK);
    g.restore();
  }
}
function gainFx(g, e, t, now, lowQ) {
  if (!okT(e.at) || t >= VAL_FX.gain) return;
  const B = unitBox(e.at.x, e.at.y), q = t / VAL_FX.gain, a = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3;
  // ตะเข็บรอบฐานวาดตัวเองขึ้นมา
  const k = easeOut3(seg(t, 0, 340)), pts = [];
  for (let i = 0; i <= 28; i++) { const an = -Math.PI / 2 + (i / 28) * TAU * k, p = P(e.at.x + 0.5 + Math.cos(an) * 0.44, e.at.y + 0.5 + Math.sin(an) * 0.44, 0.02); pts.push(p); }
  if (k > 0.03) stitchPath(g, pts, 0.85 * a, 1.3, lowQ);
  // ประกายชมพู/ฟ้าลอยขึ้น
  const n = Math.max(1, Math.min(4, Number(e.n) || 1)) + (lowQ ? 0 : 1);
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < n; i++) {
    const tq = seg(t, i * 70, i * 70 + 420);
    if (tq <= 0 || tq >= 1) continue;
    const x = B.bx + (hash01(i * 3 + 1) - 0.5) * B.hexR * 2, y = B.hy + B.hexR * 0.4 - tq * B.s * 0.7;
    sparkle(g, x, y, B.s * 0.08 * Math.sin(Math.PI * tq), 0.95 * Math.sin(Math.PI * tq), i % 2 ? CYAN : FUCH, tq * 2);
  }
  g.restore();
}
// พาข้ามโลก: ธงผืนใหญ่บินไปคลุมแนว → ยกออก (การพลิกอยู่ที่ valentineFlip) → ระลอกฟ้าใต้คนที่ย้ายโลก
function areaRect(e) {
  if (e._r) return e._r;
  const ts = e.tiles && e.tiles.length ? e.tiles : okT(e.at) ? [e.at] : [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of ts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + 1); y1 = Math.max(y1, p.y + 1); }
  e._r = Number.isFinite(x0) ? { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 } : null;
  return e._r;
}
function parallelFx(g, e, t, now, lowQ) {
  const r = areaRect(e);
  if (!r || !okT(e.at)) return;
  // ผ้าผืนใหญ่: บิน (ขยายจากมือ) → ปูคลุมเป็นโดมเหนือหัวคนในแนว → ยกปลิวออก
  if (t < PA.lift1) {
    const fly = easeOut2(seg(t, 0, PA.fly)), lift = easeIn2(seg(t, PA.lift0, PA.lift1)), settle = seg(t, PA.fly, PA.settle);
    const sc = lerp(0.3, 1.08, fly), cx = lerp(e.at.x + 0.5, r.cx, fly), cy = lerp(e.at.y + 0.5, r.cy, fly);
    // แกนผืนตามมุมกล้อง: u = ซ้าย→ขวาบนจอ · v = ใกล้กล้อง→ไกล (มุมน้ำเงินอยู่มุมหน้าซ้าย เห็นชัดทุกมุมมอง)
    const ax = viewAxes(), w0 = r.x1 - r.x0, h0 = r.y1 - r.y0;
    const wR = (Math.abs(ax.rx) * w0 + Math.abs(ax.ry) * h0) / 2 * sc + 0.2, wF = (Math.abs(ax.fx) * w0 + Math.abs(ax.fy) * h0) / 2 * sc + 0.2, tw = flutterT(now);
    const map = (u, v) => {
      const dome = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
      const wave = Math.sin(u * 7 - tw / 70 + v * 2) * (0.22 * (1 - settle) + 0.06) + Math.sin(v * 5 - tw / 90) * 0.05;
      const z = lerp(2.1, 0.5 + 1.05 * dome, easeOut2(fly)) + wave + lift * 2.6;
      const a = (u - 0.5) * 2 * wR + lift * 1.6, b = (0.5 - v) * 2 * wF;
      return P(cx + ax.rx * a + ax.fx * b, cy + ax.ry * a + ax.fy * b, z);
    };
    drawCloth(g, map, { lowQ, fine: true, alpha: clamp01(t / 80) * (1 - lift), shade: (u) => Math.sin(u * 7 - tw / 70) * 0.8 });
  }
  // ระลอกฟ้าใต้คนที่ย้ายโลก
  if (t > PA.shim - 150) {
    const q = seg(t, PA.shim - 150, VAL_FX.parallelIn);
    for (const p of e.idsAt || []) {
      if (!okT(p)) continue;
      gEllipse(g, p.x + 0.5, p.y + 0.5, 0.25 + 0.4 * easeOut3(q), 0.02, 32);
      g.strokeStyle = `rgba(${CYAN},${0.75 * (1 - q)})`; g.lineWidth = 2; g.stroke();
      if (!lowQ) { gEllipse(g, p.x + 0.5, p.y + 0.5, 0.2 + 0.3 * easeOut3(q), 0.02, 32); g.strokeStyle = `rgba(${FUCH},${0.5 * (1 - q)})`; g.lineWidth = 1.2; g.stroke(); }
    }
  }
}
// ลูกบาศก์ที่ลอกออก (เมนเจอร์) — B = กรอบตัว · order = ลำดับช่อง · m = ลำดับที่ · พุ่งเข้าจุด X (จุดจอ)
function peelCubes(g, B, order, img, color, t, X, lowQ, seed) {
  const np = NP(lowQ), fb = rgbOf(normColor(color));
  for (let m = 0; m < np; m++) {
    const mm = lowQ ? m * 2 : m, t0 = peelT(mm), age = t - t0;
    if (age < 0) continue;
    const c = order[mm];
    if (!cellSolid(B, c)) continue;
    const R = cellRect(B, c), x0 = R.x + R.w / 2, y0 = R.y + R.h / 2, col = cellColor(B, c, img, fb);
    if (age < M.peelFly) {
      const q = easeIn2(age / M.peelFly), wob = Math.sin(age / 40 + mm) * R.w * 0.3 * (1 - q);
      const x = lerp(x0, X[0], q), y = lerp(y0, X[1], q) - Math.sin(Math.PI * q) * B.s * 0.18 + wob;
      mengerCube(g, x, y, Math.max(R.w, R.h) * (1 - 0.3 * q), (age / 90) * (mm % 2 ? 1 : -1) + seed, col, 1, lowQ);
    } else squarePop(g, X[0] + (hash01(mm + seed) - 0.5) * B.s * 0.12, X[1] + (hash01(mm + seed + 3) - 0.5) * B.s * 0.12, R.w * 0.6, age - M.peelFly);
  }
}
// ลูกบาศก์ที่ร่วงออกจากตัวที่พัง: ช่อง from..to ของลำดับ หลุดตามเวลา tOf(m) แล้วกระเด็นออก + ตก (gravity)
function crumbleCubes(g, B, order, img, color, t, m0, m1, tOf, lowQ, seed, life = M.life) {
  const fb = rgbOf(normColor(color)), step = lowQ ? 2 : 1;
  for (let m = m0; m < m1; m += step) {
    const age = t - tOf(m);
    if (age < 0 || age > life) continue;
    const c = order[m];
    if (!cellSolid(B, c)) continue;
    const R = cellRect(B, c), x0 = R.x + R.w / 2, y0 = R.y + R.h / 2, q = age / life;
    const dx = x0 - B.bx, dy = y0 - (B.top + B.bottom) / 2, l = Math.hypot(dx, dy) || 1;
    const sp = B.s * (0.6 + 0.8 * hash01(m * 3 + seed)), vx = (dx / l) * sp + (hash01(m + seed) - 0.5) * B.s * 0.4, vy = (dy / l) * sp * 0.4 - B.s * (0.5 + 0.6 * hash01(m * 7 + seed));
    const s = age / 1000, x = x0 + vx * s, y = y0 + vy * s + B.s * 4.2 * s * s;
    mengerCube(g, x, y, Math.max(R.w, R.h) * (1 - 0.45 * q), (hash01(m + 11) - 0.5) * 2 + s * 9 * (m % 2 ? 1 : -1), cellColor(B, c, img, fb), 1 - easeIn2(q), lowQ);
  }
}
function mengerFx(g, e, t, now, lowQ) {
  if (!okT(e.dAt) || !okT(e.tAt) || t >= VAL_FX.menger) return;
  const off = mengerSlide(t), D = unitBox(e.dAt.x + off * e.slide[0], e.dAt.y + off * e.slide[1], (e.pup && e.pup.size) || 1), T = unitBox(e.tAt.x, e.tAt.y, e.tSize || 1);
  const X = [(D.bx + T.bx) / 2, (D.hy + T.hy) / 2];
  const pd = e.pup || {}, oD = cellOrder(e.seedD, e.biasD), oT = cellOrder(e.seedT, e.biasT);
  peelCubes(g, D, oD, pd.img, pd.color, t, X, lowQ, 1);
  peelCubes(g, T, oT, e.tImg, e.tColor, t, X, lowQ, 2);
  // ตัวเหมือนพังเป็นก้อน
  const tOf = (m) => M.crumble0 + ((m - M.peel) / Math.max(1, NCELL - M.peel)) * (M.crumble1 - M.crumble0);
  crumbleCubes(g, D, oD, pd.img, pd.color, t, M.peel, NCELL, tOf, lowQ, 5);
  // ปะทะ (ดาเมจ): วาบขาวเล็กที่เป้า
  if (t >= M.hit && t < M.hit + 200) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, T.bx, T.hy, T.s * 0.6, "255,255,255", 0.6 * (1 - (t - M.hit) / 200)); g.restore(); }
}
function breakFx(g, e, t, now, lowQ) {
  if (!okT(e.at) || t >= VAL_FX.doubleBreak) return;
  const p = e.pup || {}, B = unitBox(e.at.x, e.at.y, p.size || 1), order = cellOrder(e.seed, 0);
  crumbleCubes(g, B, order, p.img, p.color, t, 0, NCELL, (m) => BR.c0 + (m / NCELL) * (BR.c1 - BR.c0), lowQ, 9, 460);
}
function runFx(g, e, t, now, lowQ) {
  const path = e.path || [];
  if (path.length < 2 || t > valRunMs(path.length - 1) + 200) return;
  // ฝุ่นตามก้าว + เส้นตะเข็บจางตามทางวิ่ง
  const steps = path.length - 1, w0 = WALK_LEAD;
  for (let i = 1; i <= steps; i++) {
    const age = t - (w0 + i * VAL_FX.doubleRunStep);
    if (age < 0 || age > 420) continue;
    const q = age / 420, a = path[i - 1], b = path[i], [x, y, s] = P(lerp(a.x, b.x, 0.5) + 0.5, lerp(a.y, b.y, 0.5) + 0.5, 0.05 + q * 0.2);
    puff(g, x, y, s * (0.08 + 0.12 * q), 0.4 * (1 - q), "200,190,170");
  }
  if (!lowQ) {
    const head = clamp01((t - w0) / (steps * VAL_FX.doubleRunStep)) * steps, a = 0.45 * (1 - seg(t, valRunMs(steps), valRunMs(steps) + 200));
    const pts = [];
    for (let k = 0; k <= Math.ceil(head * 4); k++) {
      const f = Math.min(head, k / 4), i = Math.min(steps - 1, Math.floor(f)), kk = f - i;
      pts.push(P(lerp(path[i].x, path[i + 1].x, kk) + 0.5, lerp(path[i].y, path[i + 1].y, kk) + 0.5, 0.02));
    }
    stitchPath(g, pts, a, 1.2, lowQ, CYAN);
  }
}
function justiceFx(g, e, t, now, lowQ) {
  if (!okT(e.at)) return;
  const B = unitBox(e.at.x, e.at.y);
  // วาบตอนสลับร่าง
  if (t > JU.wrap && t < JU.unwrap) {
    const k = Math.sin(Math.PI * seg(t, JU.wrap, JU.unwrap));
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, B.bx, (B.top + B.bottom) / 2, B.s * 1.1, "255,255,255", 0.45 * k); g.restore();
  }
  // แถบเลือดใหม่ขึ้น: ประกายวิ่งตามแถบ
  if (t > JU.unwrap - 40 && t < VAL_FX.justice && !lowQ) {
    const q = seg(t, JU.unwrap - 40, VAL_FX.justice), py = B.hy + B.hexR * 0.87 + 7, pw = Math.max(54, B.s);
    g.save(); g.globalCompositeOperation = "lighter";
    sparkle(g, B.bx - pw / 2 + pw * easeInOut(q), py, B.s * 0.12 * Math.sin(Math.PI * q), Math.sin(Math.PI * q), "255,255,255", q * 3);
    g.restore();
  }
}
export function valentineFx(g, e, now, lowQ) {
  const t = now - e.t0;
  if (t < 0) return;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  switch (e.kind) {
    case "valKnife": knifeFx(g, e, t, now, lowQ); break;
    case "valGun": gunFx(g, e, t, now, lowQ); break;
    case "valShots": shotsFx(g, e, t, now, lowQ); break;
    case "valReload": reloadFx(g, e, t, now, lowQ); break;
    case "valGain": gainFx(g, e, t, now, lowQ); break;
    case "valParallel": parallelFx(g, e, t, now, lowQ); break;
    case "valMenger": mengerFx(g, e, t, now, lowQ); break;
    case "valDoubleBreak": breakFx(g, e, t, now, lowQ); break;
    case "valDoubleRun": runFx(g, e, t, now, lowQ); break;
    case "valJustice": justiceFx(g, e, t, now, lowQ); break;
    default:
  }
  g.restore();
}

// ============================================================ พื้นที่พลิกกลับหัว (ASB: กล้องกลับหัวแล้วตั้งตรง) — ท้ายเฟรม ก่อนชั้นหน้า
//  ตัดภาพรอบแนว 4×3 (รวมความสูงตัวละคร) → วาดกลับหัวแบบการ์ดพลิกบนพื้นหลังที่มืดลง → ขอบวงรีนุ่ม (ไม่เป็นกรอบแข็ง)
//  lowQ/ลดการเคลื่อนไหว = วาบฟ้าแทน
let FLIP = null;
function flipCanvases(W, H) {
  if (!FLIP) FLIP = { snap: document.createElement("canvas"), comp: document.createElement("canvas") };
  for (const c of [FLIP.snap, FLIP.comp]) if (c.width < W || c.height < H) { c.width = Math.max(W, c.width); c.height = Math.max(H, c.height); }
  return FLIP;
}
export function valentineFlip(g, fx, now, lowQ, view, dpr) {
  for (const e of fx) {
    if (!e || e.kind !== "valParallel") continue;
    const t = now - e.t0;
    if (t < PA.flip0 || t > PA.flip1) continue;
    const r = areaRect(e);
    if (!r) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]]) for (const z of [0, 1.9]) { const p = P(x, y, z); x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    const padX = (x1 - x0) * 0.22, padY = (y1 - y0) * 0.22;
    x0 -= padX; x1 += padX; y0 -= padY; y1 += padY;
    const q = seg(t, PA.flip0, PA.flip1);
    // 0→0.42 พลิกลง (1 → −1) · ค้างกลับหัว · 0.62→1 พลิกกลับ
    const sc = q < 0.42 ? Math.cos(Math.PI * easeInOut(q / 0.42)) : q < 0.62 ? -1 : -Math.cos(Math.PI * easeInOut((q - 0.62) / 0.38));
    const env = Math.min(1, Math.sin(Math.PI * q) * 3); // เข้า/ออกนุ่มๆ
    if (lowQ || REDUCED) {
      g.save(); g.globalCompositeOperation = "lighter";
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, gr = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(x1 - x0, y1 - y0) / 2);
      gr.addColorStop(0, `rgba(${CYAN},${0.22 * Math.sin(Math.PI * q)})`); gr.addColorStop(1, `rgba(${CYAN},0)`);
      g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.restore();
      continue;
    }
    const cv = g.canvas, k = view.k * dpr;
    const X = Math.max(0, Math.floor(x0 * k + view.ox * dpr)), Y = Math.max(0, Math.floor(y0 * k + view.oy * dpr));
    const W = Math.min(cv.width - X, Math.ceil((x1 - x0) * k)), H = Math.min(cv.height - Y, Math.ceil((y1 - y0) * k));
    if (W < 8 || H < 8) continue;
    const F = flipCanvases(W, H), sn = F.snap.getContext("2d"), cp = F.comp.getContext("2d");
    sn.clearRect(0, 0, W, H); sn.drawImage(cv, X, Y, W, H, 0, 0, W, H);
    cp.save(); cp.setTransform(1, 0, 0, 1, 0, 0); cp.globalCompositeOperation = "source-over"; cp.globalAlpha = 1;
    cp.clearRect(0, 0, W, H);
    // พื้นหลังการ์ด = ภาพเดิมมืดลงอมฟ้า (ช่องว่างตอนการ์ดตั้งฉาก)
    cp.drawImage(F.snap, 0, 0, W, H, 0, 0, W, H);
    cp.fillStyle = "rgba(8,16,32,.72)"; cp.fillRect(0, 0, W, H);
    // การ์ดพลิก
    cp.save(); cp.translate(W / 2, H / 2); cp.scale(1 + 0.06 * Math.sin(Math.PI * q), sc);
    cp.drawImage(F.snap, 0, 0, W, H, -W / 2, -H / 2, W, H);
    if (sc < 0) { cp.globalCompositeOperation = "lighter"; cp.fillStyle = `rgba(${CYAN},${0.12 * -sc})`; cp.fillRect(-W / 2, -H / 2, W, H); }
    cp.restore();
    // ขอบการ์ด (เส้นฟ้า/ชมพูบานเย็น)
    const h = Math.abs(sc) * H;
    cp.lineWidth = 1.5 * dpr;
    cp.strokeStyle = `rgba(${CYAN},.75)`; cp.beginPath(); cp.moveTo(0, H / 2 - h / 2); cp.lineTo(W, H / 2 - h / 2); cp.stroke();
    cp.strokeStyle = `rgba(${FUCH},.65)`; cp.beginPath(); cp.moveTo(0, H / 2 + h / 2); cp.lineTo(W, H / 2 + h / 2); cp.stroke();
    // ขอบวงรีนุ่ม
    cp.globalCompositeOperation = "destination-in";
    cp.translate(W / 2, H / 2); cp.scale(W / 2, H / 2);
    const m = cp.createRadialGradient(0, 0, 0, 0, 0, 1);
    m.addColorStop(0, `rgba(0,0,0,${env})`); m.addColorStop(0.62, `rgba(0,0,0,${env})`); m.addColorStop(1, "rgba(0,0,0,0)");
    cp.fillStyle = m; cp.fillRect(-1, -1, 2, 2);
    cp.restore();
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(F.comp, 0, 0, W, H, X, Y, W, H); g.restore();
  }
}

// ============================================================ ชั้นมุมมองของมิติ (boardDraw — หลังตัวละคร ก่อนเอฟเฟกต์ครั้งเดียว)
//  layers = [{ kind: "par" | "veil", k: 0..1 }] (BoardCanvas ค่อยๆ เปลี่ยน) · redraw(u) = วาดหมากของเราซ้ำให้สีปกติ (มุมมองหลังผ้า)
export function valentineDimLayer(g, o) {
  const { view, layers, now, lowQ, units, redraw, dpr } = o;
  if (!Array.isArray(layers)) return;
  const rect = viewRect(view), t = REDUCED ? 0 : now;
  for (const L of layers) {
    const k = clamp01(L.k);
    if (k <= 0.01) continue;
    g.save();
    if (L.kind === "par") {
      // โลกคู่ขนาน: ซีดนิด + ฟ้าจาง + ขอบจอฟ้า/ชมพู + ภาพซ้อนบางๆ (สองโลกทับกัน)
      if (!lowQ) { g.globalCompositeOperation = "saturation"; g.globalAlpha = 0.1 * k; g.fillStyle = "rgb(128,128,128)"; g.fillRect(...rect); }
      g.globalCompositeOperation = "screen"; g.globalAlpha = 1; g.fillStyle = `rgba(${CYAN},${0.06 * k})`; g.fillRect(...rect);
      const cx = rect[0] + rect[2] / 2, cy = rect[1] + rect[3] / 2, R = Math.hypot(rect[2], rect[3]) / 2;
      const vg = g.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
      vg.addColorStop(0, `rgba(${CYAN},0)`); vg.addColorStop(0.75, `rgba(${CYAN},${0.08 * k})`); vg.addColorStop(1, `rgba(${FUCH},${0.1 * k})`);
      g.fillStyle = vg; g.fillRect(...rect);
      if (!lowQ && g.canvas && dpr) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = "screen"; g.globalAlpha = 0.07 * k;
        const d = (3 + Math.sin(t / 1300) * 1.2) * dpr;
        g.drawImage(g.canvas, d, -d * 0.4);
      }
    } else if (L.kind === "veil") {
      // มองจากหลังผ้า: ซีด เย็น ทึบลงนิด · ลายแถบธงจางมากโบกช้าๆ · ขอบจอน้ำเงินธง
      g.globalCompositeOperation = "saturation"; g.globalAlpha = (lowQ ? 0.3 : 0.38) * k; g.fillStyle = "rgb(128,128,128)"; g.fillRect(...rect);
      g.globalCompositeOperation = "multiply"; g.globalAlpha = 0.5 * k; g.fillStyle = "rgb(196,204,226)"; g.fillRect(...rect);
      g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
      if (!lowQ) {
        const sh = rect[3] / 13;
        g.fillStyle = `rgba(178,34,52,${0.035 * k})`;
        for (let j = 0; j < 13; j += 2) {
          g.beginPath();
          const y0 = rect[1] + j * sh;
          for (let i = 0; i <= 16; i++) { const x = rect[0] + (rect[2] * i) / 16, y = y0 + Math.sin(i * 0.8 - t / 900) * sh * 0.25; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
          for (let i = 16; i >= 0; i--) { const x = rect[0] + (rect[2] * i) / 16, y = y0 + sh + Math.sin(i * 0.8 - t / 900) * sh * 0.25; g.lineTo(x, y); }
          g.closePath(); g.fill();
        }
      }
      const cx = rect[0] + rect[2] / 2, cy = rect[1] + rect[3] / 2, R = Math.hypot(rect[2], rect[3]) / 2;
      const vg = g.createRadialGradient(cx, cy, R * 0.45, cx, cy, R);
      vg.addColorStop(0, "rgba(60,59,110,0)"); vg.addColorStop(1, `rgba(60,59,110,${0.42 * k})`);
      g.fillStyle = vg; g.fillRect(...rect);
    }
    g.restore();
    // มองจากหลังผ้า: ตัวเราสีปกติ (วาดซ้ำทับ)
    if (L.kind === "veil" && k > 0.5 && typeof redraw === "function") for (const u of units || []) if (u.isMe) redraw(u);
  }
}

// ============================================================ socket "valentineFx" → fx (BoardStage / หน้าทดสอบ)
//  ctx = { posOf(id) → {x,y}|null · sizeOf(id) · lookOf(id) → { img, color, name, hp, maxHp, armor, maxArmor, size, summon } | null }
//  คืน { fx, look: [[{x,y}, ms]], shake: [ms], busy: [{ id, ms }] (หมากที่ฉากย้ายเอง), later: [[ms, fx[]]],
//        defer: [{ id, ms }] (เลื่อนเลขดาเมจจาก state ไปขึ้นตอนปะทะ) }
//  ไม่มีเสียง — server เล่นเอง (engine.sfx คีย์ val_*)
let SEQ = 0;
export function valentineEventFx(ev, ctx = {}) {
  const out = { fx: [], look: [], shake: [], busy: [], later: [], defer: [] };
  if (!ev || typeof ev !== "object") return out;
  const posOf = (id) => { const p = id != null && typeof ctx.posOf === "function" ? ctx.posOf(id) : null; return okT(p) ? ptOf(p) : null; };
  const sizeOf = (id) => (id != null && typeof ctx.sizeOf === "function" ? Math.max(1, ctx.sizeOf(id) | 0) : 1);
  const lookOf = (id) => (id != null && typeof ctx.lookOf === "function" ? ctx.lookOf(id) : null);
  const snap = (id, at) => {
    const p = lookOf(id) || {};
    if (p.img) imgEntry(p.img); // สีชิ้นลูกบาศก์ (เมนเจอร์) อ่านจากรูป — โหลดไว้ก่อน
    return { id, x: at.x, y: at.y, img: p.img || null, color: p.color || "#E796BF", name: p.name || "", hp: p.hp, maxHp: p.maxHp, armor: p.armor, maxArmor: p.maxArmor, size: Math.max(1, (p.size | 0) || sizeOf(id)), summon: p.summon || null };
  };
  const ping = (id, ms) => { if (id != null) out.fx.push({ kind: "valPing", x: 0, y: 0, hitIds: [id], hitDelay: Math.max(0, Math.round(ms)), dur: Math.round(ms) + PING_MS }); };
  const at = okT(ev.at) ? ptOf(ev.at) : posOf(ev.id);
  const sideTo = (from, to) => { if (!okT(from) || !okT(to)) return 1; const a = P(from.x + 0.5, from.y + 0.5), b = P(to.x + 0.5, to.y + 0.5); return b[0] >= a[0] ? -1 : 1; };
  const seed = ++SEQ % 997;
  switch (ev.kind) {
    case "veilIn": {
      if (!at) break;
      out.fx.push({ kind: "valVeilIn", id: ev.id, at, flag: okT(ev.flag) ? ptOf(ev.flag) : at, pup: snap(ev.id, at) });
      out.look.push([at, 0]);
      break;
    }
    case "veilOut": {
      const to = okT(ev.at) ? ptOf(ev.at) : null;
      if (!to) break;
      out.fx.push({ kind: "valVeilOut", id: ev.id, from: okT(ev.from) ? ptOf(ev.from) : null, at: to, pup: snap(ev.id, to) });
      out.look.push([to, 0]);
      break;
    }
    case "shots": {
      const from = okT(ev.from) ? ptOf(ev.from) : posOf(ev.id);
      if (!from) break;
      const shots = (Array.isArray(ev.shots) ? ev.shots : []).map((s) => {
        const hitAt = s && s.hitId != null ? posOf(s.hitId) : null;
        return { to: s && okT(s.to) ? ptOf(s.to) : null, hitId: s && s.hitId != null ? s.hitId : null, miss: !!(s && s.miss), hitAt, hitSize: sizeOf(s && s.hitId) };
      });
      if (!shots.length) shots.push({ to: null, hitId: null, miss: false, hitAt: null });
      out.fx.push({ kind: "valShots", id: ev.id, from, dir: ev.dir, shots, dur: valShotsMs(shots.length) + 400 });
      const last = {};
      shots.forEach((s, i) => {
        if (s.hitId == null || !s.hitAt) return;
        const ms = SHOT_T0 + i * VAL_FX.shotStep + SHOT_FLY * (s.miss ? 1.4 : 1);
        if (s.miss) out.later.push([Math.round(ms), [{ kind: "float", x: s.hitAt.x, y: s.hitAt.y, text: "หลบ", size: 26 }]]);
        else { ping(s.hitId, ms); last[s.hitId] = Math.max(last[s.hitId] || 0, ms + 20); }
      });
      for (const [id, ms] of Object.entries(last)) out.defer.push({ id, ms });
      const first = shots.find((s) => s.hitAt);
      out.look.push([first ? first.hitAt : from, 0]);
      break;
    }
    case "reload": if (at) out.fx.push({ kind: "valReload", id: ev.id, at }); break;
    case "parallelIn": {
      if (!at) break;
      const ids = Array.isArray(ev.ids) ? ev.ids.filter((id) => id != null) : [];
      const e = { kind: "valParallel", id: ev.id, at, dir: ev.dir, tiles: tilesOf(ev.tiles), ids, idsAt: ids.map(posOf).filter(Boolean) };
      out.fx.push(e);
      const r = areaRect(e);
      out.look.push([at, 0]);
      if (r) out.look.push([{ x: Math.floor(r.cx), y: Math.floor(r.cy) }, 260]);
      out.shake.push(PA.flip0);
      break;
    }
    case "doubleSpawn": {
      const p = okT(ev.at) ? ptOf(ev.at) : posOf(ev.id);
      if (!p) break;
      out.fx.push({ kind: "valDoubleSpawn", id: ev.id, at: p, size: sizeOf(ev.look), side: sideTo(p, posOf(ev.targetId)) });
      break;
    }
    case "doubleRun": {
      let path = tilesOf(ev.path);
      const start = posOf(ev.id);
      if (start && (!path.length || !samePt(path[0], start))) path = [start, ...path];
      if (path.length < 2) break;
      const ms = valRunMs(path.length - 1);
      out.fx.push({ kind: "valDoubleRun", id: ev.id, path, targetId: ev.targetId, dur: ms + HOLD, pup: snap(ev.id, path[0]) });
      out.busy.push({ id: ev.id, ms: ms + HOLD });
      out.look.push([path[path.length - 1], Math.round(ms * 0.5)]);
      break;
    }
    case "menger": {
      const dAt = (okT(ev.at) ? ptOf(ev.at) : null) || posOf(ev.id), tAt = (okT(ev.targetAt) ? ptOf(ev.targetAt) : null) || posOf(ev.targetId);
      if (!dAt || !tAt) break;
      const tl = lookOf(ev.targetId) || {}, l = Math.hypot(tAt.x - dAt.x, tAt.y - dAt.y) || 1;
      if (tl.img) imgEntry(tl.img);
      const sd = P(dAt.x + 0.5, dAt.y + 0.5), st = P(tAt.x + 0.5, tAt.y + 0.5), bl = Math.hypot(st[0] - sd[0], st[1] - sd[1]) || 1;
      const bias = [(st[0] - sd[0]) / bl, (st[1] - sd[1]) / bl];
      out.fx.push({
        kind: "valMenger", id: ev.id, targetId: ev.targetId, dAt, tAt, tSize: sizeOf(ev.targetId), tImg: tl.img || null, tColor: tl.color || "#888888",
        pup: snap(ev.id, dAt), dmg: ev.dmg, pierce: !!ev.pierce, seedD: seed, seedT: seed + 500, biasD: bias, biasT: [-bias[0], -bias[1]], slide: [(tAt.x - dAt.x) / l, (tAt.y - dAt.y) / l],
      });
      out.busy.push({ id: ev.id, ms: VAL_FX.menger + HOLD });
      ping(ev.targetId, M.crumble0); ping(ev.targetId, M.hit);
      out.defer.push({ id: ev.targetId, ms: M.hit });
      out.look.push([tAt, 0]);
      out.shake.push(M.crumble0);
      break;
    }
    case "doubleBreak": {
      const p = posOf(ev.id) || (okT(ev.at) ? ptOf(ev.at) : null);
      if (!p) break;
      out.fx.push({ kind: "valDoubleBreak", id: ev.id, at: p, pup: snap(ev.id, p), seed });
      out.busy.push({ id: ev.id, ms: VAL_FX.doubleBreak + HOLD });
      out.shake.push(0);
      break;
    }
    case "dimOut": {
      const ids = Array.isArray(ev.ids) ? ev.ids.filter((id) => id != null) : [];
      const pts = ids.map((id) => { const p = posOf(id); return p ? { ...p, size: sizeOf(id) } : null; });
      if (!pts.some(Boolean)) break;
      out.fx.push({ kind: "valDimOut", ids, at: pts, dim: ev.dim || null });
      break;
    }
    case "clones": {
      if (!at) break;
      const spawns = (Array.isArray(ev.spawns) ? ev.spawns : []).filter((s) => s && okT(s.at)).map((s) => ({ id: s.id, at: ptOf(s.at), side: sideTo(s.at, at) }));
      out.fx.push({ kind: "valClones", id: ev.id, at, spawns });
      out.look.push([at, 0]);
      break;
    }
    case "cloneFade": {
      const ids = Array.isArray(ev.ids) ? ev.ids : [];
      const list = ids.map((id) => { const p = posOf(id); return p ? snap(id, p) : null; }).filter(Boolean);
      if (list.length) { out.fx.push({ kind: "valCloneFade", list }); for (const p of list) out.busy.push({ id: p.id, ms: VAL_FX.cloneFade + HOLD }); }
      break;
    }
    case "justice": {
      if (!at) break;
      out.fx.push({ kind: "valJustice", id: ev.id, at });
      out.defer.push({ id: ev.id, ms: JU.unwrap });
      out.look.push([at, 0]);
      break;
    }
    case "gain": if (at) out.fx.push({ kind: "valGain", id: ev.id, at, n: Number(ev.n) || 1 }); break;
    default:
  }
  return out;
}
