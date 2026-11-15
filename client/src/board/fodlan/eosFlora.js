// ============================================================
//  ภาพของสนาม Eos — ต้นไม้/ปาล์ม/สน/กระบองเพชร/หิน · รายการของตั้งตรง (uprightList) · เส้นตาราง
//  แยกออกจาก ./stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · stage6.js ยังส่งออกชื่อเดิมครบ
//  ⚠️ ห้ามเรียกของจาก ./index ตอนโหลดไฟล์ (index import stage6 — วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { P, depthOf, rng } from "../boardGeo";
import { TAU, hash, K, glowAt, TILES, STATIC_TR, WATER_SET, ROAD_SET, FAST, setFor, shadeCol } from "./eosBase";

// =================================================================== รูปทรง (พิกัดจอ)
export function treeShape(g, x, y, s, C, r = 0.5) {
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y, s * 0.36, s * 0.11, 0, 0, TAU); g.fill();
  g.fillStyle = C.trunk; g.fillRect(x - s * 0.04, y - s * 0.42, s * 0.08, s * 0.42);
  const blob = (dx, dy, rr, col) => { g.fillStyle = col; g.beginPath(); g.arc(x + dx * s, y + dy * s, rr * s, 0, TAU); g.fill(); };
  blob(0, -0.62, 0.3, C.leaf2); blob(-0.14, -0.55, 0.2, C.leaf); blob(0.13, -0.7, 0.2, C.leaf); blob(0.02, -0.82, 0.16 + r * 0.05, C.leaf);
  blob(-0.08, -0.8, 0.09, C.leafHi);
}
export function palmShape(g, x, y, s, C, r = 0.5) {
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y, s * 0.3, s * 0.09, 0, 0, TAU); g.fill();
  const lean = (r - 0.5) * 0.3, top = [x + lean * s, y - s * 0.95];
  g.strokeStyle = C.trunk; g.lineWidth = Math.max(2, s * 0.06); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * s * 0.4, y - s * 0.5, top[0], top[1]); g.stroke();
  g.strokeStyle = C.palm; g.lineWidth = Math.max(2, s * 0.05); g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU + r;
    g.beginPath(); g.moveTo(top[0], top[1]); g.quadraticCurveTo(top[0] + Math.cos(a) * s * 0.25, top[1] - s * 0.1, top[0] + Math.cos(a) * s * 0.38, top[1] + Math.abs(Math.sin(a)) * s * 0.18); g.stroke();
  }
  g.lineCap = "butt";
}
export function pineTree(g, x, y, s, C) {
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y, s * 0.3, s * 0.09, 0, 0, TAU); g.fill();
  g.fillStyle = C.trunk; g.fillRect(x - s * 0.03, y - s * 0.25, s * 0.06, s * 0.25);
  for (let i = 0; i < 3; i++) {
    const w = s * (0.32 - i * 0.08), yy = y - s * (0.2 + i * 0.28);
    g.fillStyle = i % 2 ? C.leaf : C.leaf2; g.beginPath(); g.moveTo(x - w, yy); g.lineTo(x, yy - s * 0.42); g.lineTo(x + w, yy); g.closePath(); g.fill();
  }
}
// ของตั้งขึ้นสำหรับวาดสด (ชุดเดียวกับที่ deco สุ่ม — rng เมล็ดเดียวกัน) · สร้างครั้งเดียว เรียงไกล→ใกล้ตามมุมกล้องปัจจุบัน
let UPRIGHT = null, UPRIGHT_SORT = "";
export function uprightList() {
  if (!UPRIGHT) {
    const T = TILES, out = [];
    for (const t of T.sand) {
      const R = rng(t.x * 61 + t.y * 43);
      if (R() < 0.55) { R(); R(); R(); }
      if (R() < 0.11 && !STATIC_TR[K(t.x, t.y)] && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ROAD_SET.has(K(t.x + dx, t.y + dy)))) {
        const x = t.x + 0.3 + R() * 0.4, y = t.y + 0.35 + R() * 0.4, sc = 0.75 + R() * 0.4;
        out.push({ k: "cactus", x, y, sc, v: R() });
      }
    }
    for (const t of T.grass) {
      const R = rng(t.x * 17 + t.y * 71);
      for (let i = 0; i < 3; i++) {
        const x = t.x + R(), y = t.y + R();
        if (R() < 0.5) out.push({ k: "tuft", x, y });
        else if (R() < 0.3) out.push({ k: "gflower", x, y, v: R() });
      }
    }
    for (const t of T.forest) {
      const R = rng(t.x * 29 + t.y * 37), solid = !!STATIC_TR[K(t.x, t.y)];
      if (R() < 0.7) out.push({ k: "fern", x: t.x + 0.15 + R() * 0.7, y: t.y + 0.15 + R() * 0.7, r: 0.09 + R() * 0.07, v: R() });
      if (R() < 0.45) out.push({ k: "bush", x: t.x + 0.15 + R() * 0.7, y: t.y + 0.15 + R() * 0.7, r: 0.12 + R() * 0.08, v: R() });
      if (R() < 0.12) out.push({ k: "shroom", x: t.x + 0.2 + R() * 0.6, y: t.y + 0.2 + R() * 0.6, r: 0.06, v: R() });
      if (!solid && R() < 0.09) out.push({ k: "log", x: t.x + 0.5, y: t.y + 0.5, r: 0.36, v: R() });
      if (R() < 0.35) out.push({ k: "flower", x: t.x + R(), y: t.y + R(), r: 0.03, v: R() });
    }
    UPRIGHT = out;
  }
  const a = P(0, 0), b = P(1, 0), sk = `${Math.round(a[0] - b[0])},${Math.round(a[1] - b[1])}`; // เรียงใหม่เมื่อทิศกล้องเปลี่ยน
  if (sk !== UPRIGHT_SORT) { UPRIGHT_SORT = sk; UPRIGHT.sort((p, q) => depthOf(p.x, p.y) - depthOf(q.x, q.y)); }
  return UPRIGHT;
}
// ไม้พื้นล่างในป่า (theme.deco — อบ)
export function underItem(g, u, C, night) {
  const [px, py, s] = P(u.x, u.y);
  if (u.k === "fern") { // เฟิร์น: ใบเรียวแผ่เป็นพัด 7 ใบ สองโทน
    const n = 7, len = s * u.r * 1.5;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.12 + 0.76 * i / (n - 1)) + (u.v - 0.5) * 0.3, l = len * (0.75 + 0.25 * Math.sin(i * 1.7 + u.v * 5));
      g.save(); g.translate(px, py); g.rotate(-a);
      g.fillStyle = i % 2 ? C.fern : C.fern2; g.beginPath(); g.ellipse(l * 0.5, 0, l * 0.5, Math.max(1.2, s * 0.022), 0, 0, TAU); g.fill();
      g.restore();
    }
    return;
  }
  if (u.k === "bush") { // พุ่มสองชั้น มีเงา + ไฮไลต์
    const r = s * u.r, pal = C.canopy[Math.floor(u.v * C.canopy.length) % C.canopy.length];
    g.fillStyle = C.shadow; g.beginPath(); g.ellipse(px, py + s * 0.02, r * 1.2, r * 0.42, 0, 0, TAU); g.fill();
    for (const [dx, dy, k] of [[-0.55, -0.45, 0.75], [0.55, -0.4, 0.7], [0, -0.75, 0.9]]) {
      g.fillStyle = pal[1]; g.beginPath(); g.arc(px + dx * r, py + dy * r + r * 0.1, r * k, 0, TAU); g.fill();
      g.fillStyle = pal[0]; g.beginPath(); g.arc(px + dx * r - r * 0.06, py + dy * r, r * k * 0.86, 0, TAU); g.fill();
    }
    g.fillStyle = pal[2]; g.globalAlpha = 0.75; g.beginPath(); g.arc(px - r * 0.25, py - r * 1.05, r * 0.32, 0, TAU); g.fill(); g.globalAlpha = 1;
    return;
  }
  if (u.k === "shroom") { // เห็ดกลุ่มเล็ก (กลางคืนเรืองแสงฟ้าเขียว)
    for (let i = 0; i < 3; i++) {
      const x = px + (i - 1) * s * 0.05, y = py + (i % 2) * s * 0.02, h = s * (0.05 + (i === 1 ? 0.03 : 0));
      g.fillStyle = night ? "#6a7676" : "#d9cfb8"; g.fillRect(x - 0.75, y - h, 1.5, h);
      g.fillStyle = C.shroom; g.beginPath(); g.ellipse(x, y - h, s * 0.04, s * 0.026, 0, Math.PI, 0); g.fill();
      if (C.shroomGlow) glowAt(g, x, y - h, s * 0.12, C.shroomGlow, 0.55);
      else { g.fillStyle = "#fff"; g.fillRect(x - 1, y - h - s * 0.01, 1.5, 1.5); }
    }
    return;
  }
  if (u.k === "log") { // ขอนไม้ล้มมีมอส
    const a = u.v * Math.PI, dx = Math.cos(a) * u.r, dy = Math.sin(a) * u.r;
    const p0 = P(u.x - dx, u.y - dy, 0.08), p1 = P(u.x + dx, u.y + dy, 0.08), w = s * 0.13;
    g.fillStyle = C.shadow; g.beginPath(); g.ellipse(px, py + s * 0.03, s * u.r * 1.05, s * 0.1, 0, 0, TAU); g.fill();
    g.lineCap = "round"; g.strokeStyle = C.bark; g.lineWidth = w; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    g.strokeStyle = C.moss; g.lineWidth = w * 0.35; g.beginPath(); g.moveTo(p0[0], p0[1] - w * 0.3); g.lineTo((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - w * 0.3); g.stroke(); g.lineCap = "butt";
    g.fillStyle = shadeCol(C.bark, 0.35); g.beginPath(); g.ellipse(p1[0], p1[1], w * 0.42, w * 0.5, 0, 0, TAU); g.fill();
    g.strokeStyle = C.bark; g.lineWidth = 1; g.beginPath(); g.ellipse(p1[0], p1[1], w * 0.22, w * 0.27, 0, 0, TAU); g.stroke();
    return;
  }
  if (u.k === "flower") { g.fillStyle = C.flowers[Math.floor(u.v * C.flowers.length) % C.flowers.length]; g.beginPath(); g.arc(px, py - 1, Math.max(1.2, s * 0.025), 0, TAU); g.fill(); }
}
// ต้นไม้ในป่า Duscae (แทน treeShape เดิมที่เป็นวงกลม 5 วง): 3 พันธุ์ตาม hash
//  โอ๊กใหญ่ = พุ่มกว้างหลายก้อน รากแผ่ · ต้นสูงชั้นๆ = พุ่ม 3 ชั้นซ้อน · เบิร์ช = ลำต้นขาวลายดำ ใบเขียวอ่อน
//  พุ่มแต่ละก้อน: เงาด้านล่าง → เนื้อ → ไฮไลต์บนซ้าย + จุดใบไม้ · สีพุ่มสุ่มจาก 4 โทนต่อต้น
export function forestTree(g, x, y, s, C, r, now, lowQ) {
  const kind = r < 0.42 ? "oak" : r < 0.78 ? "tall" : "birch";
  const pal = C.canopy[Math.floor(hash(r * 97, 3) * C.canopy.length) % C.canopy.length];
  const sway = lowQ ? 0 : Math.sin(now / 1400 + r * 20) * s * 0.012;
  const k = kind === "oak" ? 1.25 : kind === "tall" ? 1.1 : 0.95;
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y, s * 0.42 * k, s * 0.13 * k, 0, 0, TAU); g.fill();
  // ลำต้น (เรียว + รากแผ่)
  const th = s * (kind === "tall" ? 0.62 : 0.5) * k, tw = s * (kind === "oak" ? 0.1 : 0.07);
  const bark = kind === "birch" ? C.birch : C.bark;
  g.fillStyle = bark; g.beginPath();
  g.moveTo(x - tw * 1.6, y); g.quadraticCurveTo(x - tw * 0.6, y - th * 0.15, x - tw * 0.5, y - th);
  g.lineTo(x + tw * 0.5, y - th); g.quadraticCurveTo(x + tw * 0.6, y - th * 0.15, x + tw * 1.6, y); g.closePath(); g.fill();
  g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(x + tw * 0.05, y - th, tw * 0.45, th * 0.95);
  if (kind === "birch") { g.fillStyle = "#2a2622"; for (let i = 0; i < 4; i++) g.fillRect(x - tw * 0.4, y - th * (0.2 + i * 0.2), tw * (0.4 + hash(i, r * 9) * 0.5), Math.max(1, s * 0.012)); }
  // พุ่ม
  const blobs = [];
  if (kind === "oak") {
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + r * 4; blobs.push([Math.cos(a) * 0.3, -0.95 + Math.sin(a) * 0.16, 0.26 + hash(i, r * 7) * 0.08]); }
    blobs.push([0, -1.12, 0.3]);
  } else if (kind === "tall") {
    for (const [h, w] of [[-0.78, 0.34], [-1.08, 0.27], [-1.36, 0.19]]) for (const d of [-1, 0, 1]) blobs.push([d * w * 0.6, h + Math.abs(d) * 0.05, w * (d ? 0.62 : 0.78)]);
  } else {
    for (let i = 0; i < 5; i++) blobs.push([(hash(i, r * 5) - 0.5) * 0.36, -0.82 - hash(i + 3, r * 5) * 0.42, 0.15 + hash(i + 7, r) * 0.06]);
  }
  blobs.sort((a, b) => a[1] - b[1]);
  const L = kind === "birch" ? [shadeCol(pal[0], 0.15), pal[0], shadeCol(pal[2], 0.15)] : pal;
  for (const [bx, by, br] of blobs) { // ชั้นเงา
    g.fillStyle = L[1]; g.beginPath(); g.arc(x + bx * s * k + sway, y + by * s * k + br * s * k * 0.12, br * s * k, 0, TAU); g.fill();
  }
  for (const [bx, by, br] of blobs) { // ชั้นเนื้อ
    g.fillStyle = L[0]; g.beginPath(); g.arc(x + bx * s * k - br * s * k * 0.08 + sway, y + by * s * k - br * s * k * 0.06, br * s * k * 0.84, 0, TAU); g.fill();
  }
  g.fillStyle = L[2];
  for (const [bx, by, br] of blobs) { // ไฮไลต์บนซ้าย
    g.globalAlpha = 0.7; g.beginPath(); g.arc(x + bx * s * k - br * s * k * 0.32 + sway, y + by * s * k - br * s * k * 0.34, br * s * k * 0.38, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  if (!FAST && !lowQ) { // จุดใบไม้ (เนื้อสัมผัส)
    g.fillStyle = L[1];
    for (let i = 0; i < 10; i++) { const b = blobs[i % blobs.length], a = hash(i, r * 31) * TAU, d = hash(i + 5, r * 31) * b[2] * 0.7; g.fillRect(x + (b[0] + Math.cos(a) * d) * s * k + sway, y + (b[1] + Math.sin(a) * d) * s * k, 2, 2); }
  }
}
// กระบองเพชรต้นเล็ก (ลำต้น + แขน 1–2 ข้าง · ด้านเงาเข้ม)
export function cactusShape(g, x, y, s, C, r = 0.5) {
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x + s * 0.05, y, s * 0.14, s * 0.045, 0, 0, TAU); g.fill();
  g.lineCap = "round";
  const stem = (x0, y0, x1, y1, w) => {
    g.strokeStyle = C.cactus2; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = C.cactus; g.lineWidth = w * 0.55; g.beginPath(); g.moveTo(x0 - w * 0.15, y0); g.lineTo(x1 - w * 0.15, y1); g.stroke();
  };
  const w = Math.max(2, s * 0.085), top = y - s * 0.42;
  stem(x, y, x, top, w);
  const arm = (dir, h0, h1) => { const ay = y - s * h0, ex = x + dir * s * 0.12; stem(x, ay, ex, ay, w * 0.75); stem(ex, ay, ex, y - s * h1, w * 0.75); };
  arm(r < 0.5 ? -1 : 1, 0.2, 0.33);
  if (r > 0.3) arm(r < 0.5 ? 1 : -1, 0.14, 0.24);
  g.lineCap = "butt";
}
// ส่วนเส้นตาราง (สร้างครั้งเดียว): norm = รอยต่อพื้นทั่วไป · soft = ติดทราย · ไม่มีเส้นถ้าช่องใดช่องหนึ่งเป็นน้ำ/คลอง/ตึก/กำแพง/อู่/ป้อม
let GRID_SEGS = null;
export function gridSegs(cols, rows) {
  if (GRID_SEGS) return GRID_SEGS;
  const BLOCK = new Set(["fd_eos_bldg", "fd_eos_wall", "fd_eos_garage", "fd_eos_turret"]);
  const open = (x, y) => x >= 0 && y >= 0 && x < cols && y < rows && !WATER_SET.has(K(x, y)) && !BLOCK.has(STATIC_TR[K(x, y)]);
  const sand = setFor("sand", TILES.sand), out = { norm: [], soft: [] };
  const push = (a, b, seg) => ((sand.has(a) || sand.has(b)) ? out.soft : out.norm).push(seg);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (!open(x, y)) continue;
    if (open(x + 1, y)) push(K(x, y), K(x + 1, y), [x + 1, y, x + 1, y + 1]);
    if (open(x, y + 1)) push(K(x, y), K(x, y + 1), [x, y + 1, x + 1, y + 1]);
  }
  GRID_SEGS = out;
  return out;
}
export function rockShape(g, x, y, s, C, r = 0.5) {
  const k = 0.7 + r * 0.6;
  g.fillStyle = C.shadow; g.beginPath(); g.ellipse(x, y, s * 0.4 * k, s * 0.12 * k, 0, 0, TAU); g.fill();
  g.fillStyle = C.rock2; g.beginPath(); g.moveTo(x - s * 0.36 * k, y); g.lineTo(x - s * 0.28 * k, y - s * 0.46 * k); g.lineTo(x + s * 0.06 * k, y - s * 0.58 * k); g.lineTo(x + s * 0.32 * k, y - s * 0.34 * k); g.lineTo(x + s * 0.36 * k, y); g.closePath(); g.fill();
  g.fillStyle = C.rock; g.beginPath(); g.moveTo(x - s * 0.28 * k, y - s * 0.46 * k); g.lineTo(x + s * 0.06 * k, y - s * 0.58 * k); g.lineTo(x + s * 0.1 * k, y - s * 0.2 * k); g.lineTo(x - s * 0.3 * k, y - s * 0.12 * k); g.closePath(); g.fill();
  // ก้อนเล็กข้างๆ (ของชิ้นเล็กรอบของใหญ่)
  g.fillStyle = C.rock2; g.beginPath(); g.ellipse(x + s * 0.34 * k, y - s * 0.04, s * 0.09, s * 0.06, 0, 0, TAU); g.fill();
}
