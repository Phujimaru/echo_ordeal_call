// ============================================================
//  เอฟเฟกต์บนกระดานของยูนะ (characters/yuna.js) — ธีมคอนเสิร์ต: ดนตรี + ไฟสปอตไลต์ (ผู้ใช้สั่ง 2026-10-18 · รื้อใหม่ 2026-10-19)
//
//  วงเพลง (drawYunaZones · บนพื้น ใต้ไฮไลต์ · state.players[].yuna.aura { kind, x, y, r }) — ทุกวงเต้นตามจังหวะ BEAT_MS:
//   แสงเต็มพื้นในวง (ไล่สีจากตัวยูนะ) + คลื่นเสียงวงรีกระเพื่อมออกทุกจังหวะ + แท่งอีควอไลเซอร์เต้นรอบขอบวง + วงโน้ตหมุนรอบตัว
//   delete = แดงดำ: พื้นมืดลง แถบกลิตช์เลื่อน บล็อกพิกเซลกระพริบ ขอบเหลื่อมสีแดง/ฟ้า เศษพิกเซลลอย
//   smile  = ชมพูทอง: ลำแสงอุ่นหมุนบนพื้น หัวใจและประกายลอยขึ้น
//   idol   = เวทีคอนเสิร์ต: พื้นช่องกระพริบสีตามจังหวะ สปอตไลต์หลายสีส่ายจากฟ้า เลเซอร์กวาด กระดาษสีโปรย
//  ท่าตีปกติ (attackStyle — STYLE_MS ใน boardDraw):
//   yunaNote = ร้องใส่เป้า: คลื่นเสียงโค้งหนาเรืองแสงซ้อนกันพุ่งเข้าเป้า + โน้ตตาม → ปะทะเป็นแสงวาบ คลื่นกระแทกบนพื้น โน้ตแตกกระจาย
//   yunaIdol = ท่าไอดอล: ชาร์จ (เสาไฟสปอตไลต์ลงที่ยูนะ วงแสงหดเข้าตัว) → ปล่อยลำคลื่นเสียงสีรุ้งหนา + เลเซอร์จากเวทีบรรจบที่เป้า
//              → ระเบิดดาวขนาดใหญ่ วงกระแทก 3 ชั้น เสาแสงที่เป้า กระดาษสีกระจาย
//  เหตุการณ์ (socket "yunaFx" → YUNA_EVENT_FX): revive · vanish/appear · shadow · song · idolOn/idolEnd · tick · mount · fall
//  lowQ = ตัดอนุภาค/แท่ง/ลำแสงครึ่งหนึ่ง ไม่มีกลิตช์ · ลดการเคลื่อนไหว = วงนิ่ง (ไม่เต้น ไม่ส่าย) แต่เอฟเฟกต์ครั้งเดียวยังเล่น
// ============================================================
import { P, F_UI, gEllipse, glow, quad } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export const YUNA_MS = { yunaNote: 1000, yunaIdol: 1700 };
export const YUNA_HIT_P = { yunaNote: 0.5, yunaIdol: 0.55 };
export const YUNA_FX_DUR = {
  ...YUNA_MS,
  yunaRevive: 2200, yunaVanish: 1300, yunaAppear: 1100, yunaShadow: 900, yunaSong: 1400,
  yunaIdolOn: 2000, yunaIdolEnd: 1200, yunaTick: 1000, yunaMount: 750, yunaFall: 900,
};
export const isYunaFx = (kind) => typeof kind === "string" && (kind in YUNA_FX_DUR);
// เหตุการณ์จาก server (yunaFx.kind) → fx kind
export const YUNA_EVENT_FX = {
  revive: "yunaRevive", vanish: "yunaVanish", appear: "yunaAppear", shadowCast: "yunaShadow", song: "yunaSong",
  idol: "yunaIdolOn", idolEnd: "yunaIdolEnd", tick: "yunaTick", mount: "yunaMount", fall: "yunaFall",
};

const BEAT_MS = 469; // ≈128 BPM
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3);
const easeIn2 = (t) => t * t;
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const NOTES = ["♪", "♫", "♬", "♩"];
const hsl = (h, a, l = 62) => `hsla(${((h % 360) + 360) % 360},100%,${l}%,${a})`;
// สีประจำเพลง (r,g,b)
const TONE = {
  delete: { core: "255,40,70", glow: "200,10,40", alt: "60,220,255", hi: "255,190,200", dark: "20,0,8" },
  smile: { core: "255,150,205", glow: "255,205,130", alt: "255,212,90", hi: "255,250,252", dark: "120,40,80" },
  idol: { core: "255,90,200", glow: "150,90,255", alt: "80,230,255", hi: "255,255,255", dark: "30,8,50" },
};
const SPOT = ["255,70,170", "70,220,255", "255,220,80", "170,100,255", "120,255,170", "255,140,60"];

// ---------- ตัวช่วยวาด ----------
function noteGlyph(g, x, y, size, fill, i) {
  g.font = `800 ${Math.max(6, size) | 0}px ${F_UI}`;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = fill;
  g.fillText(NOTES[Math.abs(i) % NOTES.length], x, y);
}
function heart(g, x, y, r, fill) {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(x, y + r * 0.9);
  g.bezierCurveTo(x - r * 1.4, y - r * 0.2, x - r * 0.6, y - r * 1.3, x, y - r * 0.45);
  g.bezierCurveTo(x + r * 0.6, y - r * 1.3, x + r * 1.4, y - r * 0.2, x, y + r * 0.9);
  g.fill();
}
function star(g, x, y, r, fill, rot = 0, n = 5) {
  g.fillStyle = fill;
  g.beginPath();
  for (let j = 0; j < n * 2; j++) { const a = rot + j / (n * 2) * Math.PI * 2 - Math.PI / 2, rr = j % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}
// วงรีบนพื้นแบบเรืองแสง (เส้นหนาจาง + เส้นบางสว่าง)
function groundRing(g, x, y, r, rgb, a, w = 3) {
  if (r <= 0 || a <= 0) return;
  gEllipse(g, x, y, r, 0.02, 56);
  g.strokeStyle = `rgba(${rgb},${a * 0.35})`; g.lineWidth = w * 3.2; g.stroke();
  g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = w; g.stroke();
}
// เสาแสงจากฟ้าลงพื้น (กรวย) — ยอด (topX, topY, h) → ฐาน (x, y) บนกระดาน
function lightCone(g, topX, topY, x, y, rgb, a, wK = 0.9, h = 8) {
  g.save();
  const top = P(topX, topY, h), foot = P(x, y, 0), w = foot[2] * wK;
  const cone = () => { g.beginPath(); g.moveTo(top[0] - w * 0.08, top[1]); g.lineTo(top[0] + w * 0.08, top[1]); g.lineTo(foot[0] + w, foot[1]); g.lineTo(foot[0] - w, foot[1]); g.closePath(); };
  // ชั้นสี (ทับปกติ — เห็นสีบนพื้นสว่าง) แล้วชั้นแสง (บวกสี — สว่างบนพื้นมืด)
  const gc = g.createLinearGradient(top[0], top[1], foot[0], foot[1]);
  gc.addColorStop(0, `rgba(${rgb},0)`); gc.addColorStop(1, `rgba(${rgb},${a * 0.45})`);
  g.fillStyle = gc; cone(); g.fill();
  g.globalCompositeOperation = "lighter";
  const gr = g.createLinearGradient(top[0], top[1], foot[0], foot[1]);
  gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(0.45, `rgba(${rgb},${a * 0.35})`); gr.addColorStop(1, `rgba(${rgb},${a})`);
  g.fillStyle = gr; cone(); g.fill();
  // ขอบกรวยสว่าง
  g.strokeStyle = `rgba(255,255,255,${a * 0.5})`; g.lineWidth = 1.2; g.stroke();
  gEllipse(g, x, y, wK * 0.95, 0.01, 40);
  const fl = g.createRadialGradient(foot[0], foot[1], 0, foot[0], foot[1], foot[2] * wK * 1.15);
  fl.addColorStop(0, `rgba(${rgb},${Math.min(1, a * 1.1)})`); fl.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = fl; g.fill();
  g.restore();
}
// แสงเรือง (บวกสี) — ใช้เฉพาะจุดสว่าง · ส่วนที่ต้องเห็นสี (พื้น/แท่ง/คลื่น) วาดแบบทับปกติ เพราะพื้นลานสีขาวบวกแล้วกลายเป็นขาวหมด
function addGlow(g, x, y, r, rgb, a) {
  g.save(); g.globalCompositeOperation = "lighter"; glow(g, x, y, r, rgb, a); g.restore();
}
// คลื่นเสียงโค้ง (ระนาบจอ) ที่จุด (sx, sy) หันไปทาง (dx, dy) บนจอ
function soundArc(g, sx, sy, dx, dy, R, rgb, a, w) {
  const ang = Math.atan2(dy, dx);
  g.beginPath(); g.arc(sx, sy, R, ang - 0.85, ang + 0.85);
  g.strokeStyle = `rgba(${rgb},${a * 0.3})`; g.lineWidth = w * 3; g.stroke();
  g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = w; g.stroke();
  g.strokeStyle = `rgba(255,255,255,${a * 0.8})`; g.lineWidth = Math.max(1, w * 0.35); g.stroke();
}

// ---------- วงเพลง ----------
function zoneTiles(z, info) {
  const out = [];
  for (let dy = -z.r; dy <= z.r; dy++) {
    const w = z.r - Math.abs(dy);
    for (let dx = -w; dx <= w; dx++) {
      const x = z.x + dx, y = z.y + dy;
      if (info && (x < 0 || y < 0 || x >= info.cols || y >= info.rows)) continue;
      out.push({ x, y, d: Math.abs(dx) + Math.abs(dy) });
    }
  }
  return out;
}
function zoneEdges(tiles) {
  const set = new Set(tiles.map((t) => t.x + "," + t.y));
  const has = (x, y) => set.has(x + "," + y);
  const out = [];
  for (const t of tiles) {
    if (!has(t.x, t.y - 1)) out.push([t.x, t.y, t.x + 1, t.y]);
    if (!has(t.x + 1, t.y)) out.push([t.x + 1, t.y, t.x + 1, t.y + 1]);
    if (!has(t.x, t.y + 1)) out.push([t.x + 1, t.y + 1, t.x, t.y + 1]);
    if (!has(t.x - 1, t.y)) out.push([t.x, t.y + 1, t.x, t.y]);
  }
  return out;
}
function clipTiles(g, tiles, z0 = 0.01) {
  g.beginPath();
  for (const t of tiles) {
    const a = P(t.x, t.y, z0), b = P(t.x + 1, t.y, z0), c = P(t.x + 1, t.y + 1, z0), d = P(t.x, t.y + 1, z0);
    g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
  }
  g.clip();
}
function strokeEdges(g, edges, ox = 0, oy = 0) {
  g.beginPath();
  for (const [x0, y0, x1, y1] of edges) {
    const a = P(x0, y0, 0.02), b = P(x1, y1, 0.02);
    g.moveTo(a[0] + ox, a[1] + oy); g.lineTo(b[0] + ox, b[1] + oy);
  }
  g.stroke();
}
// ขอบวงแบบเส้นเรียบ (ข้าวหลามตัดผ่านกึ่งกลางขอบช่องนอกสุด — ดูสะอาดกว่าขอบขั้นบันได) → จุด 4 มุม
function diamondPts(z) {
  const c = { x: z.x + 0.5, y: z.y + 0.5 }, R = z.r + 0.5;
  return [[c.x, c.y - R], [c.x + R, c.y], [c.x, c.y + R], [c.x - R, c.y]];
}
function strokeDiamond(g, z, ox = 0, oy = 0) {
  const pts = diamondPts(z).map(([x, y]) => P(x, y, 0.02));
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p[0] + ox, p[1] + oy) : g.moveTo(p[0] + ox, p[1] + oy)));
  g.closePath(); g.stroke();
}
// จุดบนขอบข้าวหลามตัด เว้นระยะเท่ากัน → [{ x, y, tx, ty }] (tx, ty = ทิศตามขอบ)
function diamondSamples(z, per) {
  const pts = diamondPts(z), out = [];
  for (let s = 0; s < 4; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[(s + 1) % 4];
    for (let i = 0; i < per; i++) {
      const k = (i + 0.5) / per;
      out.push({ x: ax + (bx - ax) * k, y: ay + (by - ay) * k, tx: (bx - ax) / Math.hypot(bx - ax, by - ay), ty: (by - ay) / Math.hypot(bx - ax, by - ay) });
    }
  }
  return out;
}
// แท่งอีควอไลเซอร์ตั้งบนขอบวง — ความสูงเต้นตามจังหวะ
function eqBars(g, samples, T, kick, color, lowQ) {
  const step = lowQ ? 2 : 1, half = 0.13;
  for (let i = 0; i < samples.length; i += step) {
    const sp = samples[i];
    const ex0 = sp.x - sp.tx * half, ey0 = sp.y - sp.ty * half, ex1 = sp.x + sp.tx * half, ey1 = sp.y + sp.ty * half;
    const lv = 0.5 + 0.5 * Math.sin(T / 160 + i * 1.7) * Math.sin(T / 410 + i * 0.6);
    const h = 0.15 + lv * 0.95 + kick * 0.5;
    const a = P(ex0, ey0, 0), b = P(ex1, ey1, 0), c = P(ex1, ey1, h), d = P(ex0, ey0, h);
    const gr = g.createLinearGradient(0, (a[1] + b[1]) / 2, 0, (c[1] + d[1]) / 2);
    const rgb = color(i);
    gr.addColorStop(0, `rgba(${rgb},0.9)`); gr.addColorStop(0.6, `rgba(${rgb},0.55)`); gr.addColorStop(1, `rgba(${rgb},0.08)`);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill();
    // หมวกแท่ง: ขีดสีสว่างลอยเหนือแท่ง (แบบอีควอไลเซอร์)
    const e0 = P(ex0, ey0, h + 0.08), e1 = P(ex1, ey1, h + 0.08);
    g.strokeStyle = `rgba(${rgb},1)`; g.lineWidth = 3;
    g.beginPath(); g.moveTo(e0[0], e0[1]); g.lineTo(e1[0], e1[1]); g.stroke();
  }
}
// โน้ตโคจรรอบตัวยูนะ
function noteOrbit(g, z, T, colorAt, n) {
  for (let i = 0; i < n; i++) {
    const ang = T / 900 + i / n * Math.PI * 2;
    const bob = Math.sin(T / 300 + i * 2) * 0.12;
    const [sx, sy, sc] = P(z.x + 0.5 + Math.cos(ang) * 0.85, z.y + 0.5 + Math.sin(ang) * 0.85, 1.25 + bob);
    noteGlyph(g, sx, sy, sc * 0.36, colorAt(i), i);
  }
}

export function drawYunaZones(g, zones, info, now, lowQ) {
  if (!zones || !zones.length) return;
  const T = REDUCED ? 0 : now;
  const beat = REDUCED ? 0.5 : (T % BEAT_MS) / BEAT_MS, kick = REDUCED ? 0 : Math.exp(-beat * 5);
  const beatN = Math.floor(T / BEAT_MS);
  for (const z of zones) {
    if (!z || !Number.isFinite(z.x) || !Number.isFinite(z.y) || !(z.r >= 0)) continue;
    const tone = TONE[z.kind] || TONE.smile;
    const tiles = zoneTiles(z, info), edges = zoneEdges(tiles);
    const [cx, cy, sc] = P(z.x + 0.5, z.y + 0.5, 0);
    const Rpx = sc * (z.r + 0.7);
    g.save();
    // ---- พื้นในวง ----
    g.save();
    clipTiles(g, tiles);
    // delete / idol: พื้นมืดลงก่อน (สีและไฟเวทีเด่นขึ้นบนลานสีอ่อน)
    if (z.kind === "delete" || z.kind === "idol") { g.fillStyle = `rgba(${tone.dark},${z.kind === "idol" ? 0.5 : 0.42})`; g.fillRect(cx - Rpx * 1.6, cy - Rpx * 1.6, Rpx * 3.2, Rpx * 3.2); }
    const pool = g.createRadialGradient(cx, cy, 0, cx, cy, Rpx);
    const pa = 0.4 + kick * 0.2;
    pool.addColorStop(0, `rgba(${tone.core},${pa})`); pool.addColorStop(0.55, `rgba(${tone.glow},${pa * 0.45})`); pool.addColorStop(1, `rgba(${tone.glow},${pa * 0.18})`);
    g.fillStyle = pool; g.fillRect(cx - Rpx * 1.6, cy - Rpx * 1.6, Rpx * 3.2, Rpx * 3.2);
    // คลื่นเสียงกระเพื่อมออกจากตัวทุกจังหวะ (2 คลื่นซ้อน)
    for (let k = 0; k < 2; k++) {
      const p = ((T / BEAT_MS) + k * 0.5) % 1;
      groundRing(g, z.x + 0.5, z.y + 0.5, 0.4 + p * (z.r + 0.6), k ? tone.alt : tone.core, (1 - p) * 0.7, 3);
    }
    if (z.kind === "idol") {
      // พื้นเวที: ช่องสุ่มกระพริบสีตามจังหวะ
      for (const t of tiles) {
        const h = hash01(t.x * 17 + t.y * 31 + beatN * 7);
        if (h < 0.62) continue;
        quad(g, t.x, t.y, 0.06, 0.012);
        g.fillStyle = hsl(h * 720 + T / 10, 0.28 * (0.4 + kick));
        g.fill();
      }
      // ไฟเวทีส่องพื้น (วงแสงเคลื่อนที่)
      const n = lowQ ? 3 : 6;
      for (let i = 0; i < n; i++) {
        const ph = T / (1300 + i * 210) + i * 1.9;
        const [px, py, ps] = P(z.x + 0.5 + Math.cos(ph) * z.r * 0.62, z.y + 0.5 + Math.sin(ph * 1.27) * z.r * 0.62, 0);
        const fl = g.createRadialGradient(px, py, 0, px, py, ps * 1.25);
        fl.addColorStop(0, `rgba(${SPOT[i % SPOT.length]},0.75)`); fl.addColorStop(1, `rgba(${SPOT[i % SPOT.length]},0)`);
        g.fillStyle = fl; g.fillRect(px - ps * 1.4, py - ps * 1.4, ps * 2.8, ps * 2.8);
      }
    } else if (z.kind === "smile") {
      // ลำแสงอุ่นหมุนบนพื้น (รัศมีจากตัว)
      const rays = lowQ ? 6 : 10;
      for (let i = 0; i < rays; i++) {
        const a0 = T / 2600 + i / rays * Math.PI * 2;
        const p1 = P(z.x + 0.5 + Math.cos(a0 - 0.12) * (z.r + 1), z.y + 0.5 + Math.sin(a0 - 0.12) * (z.r + 1), 0);
        const p2 = P(z.x + 0.5 + Math.cos(a0 + 0.12) * (z.r + 1), z.y + 0.5 + Math.sin(a0 + 0.12) * (z.r + 1), 0);
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, Rpx);
        gr.addColorStop(0, `rgba(${tone.alt},0.4)`); gr.addColorStop(1, `rgba(${tone.alt},0)`);
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.closePath(); g.fill();
      }
    } else if (z.kind === "delete" && !lowQ) {
      // แถบกลิตช์เลื่อน + บล็อกพิกเซลกระพริบ
      for (let i = 0; i < 3; i++) {
        const yy = z.y - z.r + ((T / (700 + i * 260) + i * 0.33) % 1) * (z.r * 2 + 1);
        const a = P(z.x - z.r - 1, yy, 0.01), b = P(z.x + z.r + 2, yy, 0.01), c = P(z.x + z.r + 2, yy + 0.18, 0.01), d = P(z.x - z.r - 1, yy + 0.18, 0.01);
        g.fillStyle = `rgba(${i % 2 ? tone.alt : tone.core},0.35)`;
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill();
      }
      for (const t of tiles) {
        const h = hash01(t.x * 31 + t.y * 17 + Math.floor(T / 120));
        if (h < 0.84) continue;
        const ins = 0.08 + hash01(t.x + t.y * 7 + Math.floor(T / 120)) * 0.3;
        quad(g, t.x, t.y, ins, 0.015);
        g.fillStyle = h > 0.95 ? `rgba(${tone.alt},0.5)` : `rgba(${tone.core},0.55)`; g.fill();
      }
    }
    g.restore();
    // ---- ขอบวง ----
    g.lineJoin = "round"; g.lineCap = "round";
    // ช่องในวงจริง (ขั้นบันได) = เส้นบางจาง · ขอบหลัก = ข้าวหลามตัดเรียบเรืองแสง
    g.lineWidth = 1.2; g.strokeStyle = `rgba(${tone.core},0.35)`; strokeEdges(g, edges);
    if (z.kind === "delete") {
      const j = lowQ ? 0 : (hash01(Math.floor(T / 90)) - 0.5) * 5;
      g.lineWidth = 3; g.strokeStyle = `rgba(${tone.alt},0.75)`; strokeDiamond(g, z, -2 + j, 0);
      g.strokeStyle = `rgba(${tone.core},1)`; strokeDiamond(g, z, 2 - j, 0);
    } else {
      g.lineWidth = 9; g.strokeStyle = z.kind === "idol" ? hsl(T / 6, 0.35) : `rgba(${tone.core},0.3)`; strokeDiamond(g, z);
      g.lineWidth = 3; g.strokeStyle = z.kind === "idol" ? hsl(T / 6 + 40, 0.95, 66) : `rgba(${tone.alt},1)`; strokeDiamond(g, z);
    }
    // ---- แท่งอีควอไลเซอร์รอบขอบ ----
    if (!REDUCED) {
      const col = z.kind === "idol" ? (i) => SPOT[i % SPOT.length] : z.kind === "delete" ? (i) => (i % 5 === 0 ? tone.alt : tone.core) : (i) => (i % 3 ? tone.alt : "255,255,255");
      eqBars(g, diamondSamples(z, Math.max(4, z.r * 3)), T, kick, col, lowQ);
    }
    // ---- เหนือพื้น: สปอตไลต์/เลเซอร์/กระดาษสี (ไอดอล) · อนุภาคลอย ----
    if (z.kind === "idol") {
      const n = lowQ ? 2 : 5;
      for (let i = 0; i < n; i++) {
        const ph = T / (1500 + i * 230) + i * 1.7;
        const fx = z.x + 0.5 + Math.cos(ph) * z.r * 0.55, fy = z.y + 0.5 + Math.sin(ph * 1.3) * z.r * 0.55;
        lightCone(g, z.x + 0.5 + (i - (n - 1) / 2) * 1.6, z.y + 0.5 - 2.2, fx, fy, SPOT[i % SPOT.length], 0.26 + kick * 0.18, 0.7, 8);
      }
      if (!lowQ) {
        g.save(); g.globalCompositeOperation = "lighter";
        for (let i = 0; i < 4; i++) {
          const ox = z.x + 0.5 + (i < 2 ? -1 : 1) * (z.r + 1.5), oy = z.y + 0.5 - z.r - 1;
          const ang = Math.sin(T / (900 + i * 170) + i) * 0.9;
          const tx = z.x + 0.5 + Math.sin(ang) * z.r, ty = z.y + 0.5 + Math.cos(ang) * z.r * 0.8;
          const a = P(ox, oy, 4), b = P(tx, ty, 0);
          g.strokeStyle = `rgba(${SPOT[(i + 2) % SPOT.length]},0.25)`; g.lineWidth = 7;
          g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
          g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 1.6; g.stroke();
          addGlow(g, b[0], b[1], b[2] * 0.35, SPOT[(i + 2) % SPOT.length], 0.8);
        }
        g.restore();
        for (let i = 0; i < 26; i++) {
          const t = tiles[Math.floor(hash01(i * 7.3 + 1) * tiles.length)];
          if (!t) continue;
          const ph = ((T / 2600) + hash01(i)) % 1;
          const [sx, sy, s2] = P(t.x + hash01(i * 3), t.y + hash01(i * 5), 3.2 - ph * 3.1);
          g.save(); g.translate(sx, sy); g.rotate(T / 200 + i);
          g.fillStyle = hsl(i * 47, 0.95 * Math.min(1, (1 - ph) * 3));
          g.fillRect(-s2 * 0.05, -s2 * 0.022, s2 * 0.1, s2 * 0.044);
          g.restore();
        }
      }
    } else if (z.kind === "smile") {
      const n = lowQ ? 6 : 14;
      for (let i = 0; i < n; i++) {
        const t = tiles[Math.floor(hash01(i * 13.7 + z.x) * tiles.length)];
        if (!t) continue;
        const ph = ((T / 2400) + i / n) % 1;
        const [sx, sy, s2] = P(t.x + 0.5, t.y + 0.5, ph * 2.2);
        const a = Math.sin(ph * Math.PI);
        if (i % 3 === 2) star(g, sx, sy, s2 * 0.09, `rgba(${tone.alt},${a})`, T / 400 + i, 4);
        else heart(g, sx, sy, s2 * (0.12 + kick * 0.03), `rgba(${i % 2 ? tone.core : "255,90,150"},${a * 0.95})`);
      }
    } else if (z.kind === "delete" && !lowQ) {
      for (let i = 0; i < 16; i++) {
        const t = tiles[Math.floor(hash01(i * 9.1 + 3) * tiles.length)];
        if (!t) continue;
        const ph = ((T / 1900) + hash01(i * 2)) % 1;
        const [sx, sy, s2] = P(t.x + hash01(i), t.y + hash01(i * 4), ph * 2.4);
        const s = s2 * (0.05 + hash01(i * 6) * 0.06), a = Math.sin(ph * Math.PI);
        g.fillStyle = `rgba(${tone.alt},${a * 0.7})`; g.fillRect(sx - s / 2 - 2, sy - s / 2, s, s);
        g.fillStyle = `rgba(${tone.core},${a})`; g.fillRect(sx - s / 2 + 2, sy - s / 2, s, s);
      }
    }
    // ---- แสงที่ตัว + วงโน้ตรอบตัว ----
    addGlow(g, cx, cy - sc * 0.6, sc * (1.1 + kick * 0.35), tone.core, 0.3 + kick * 0.25);
    noteOrbit(g, z, T, z.kind === "idol" ? (i) => hsl(T / 5 + i * 72, 1, 70) : (i) => `rgba(${i % 2 ? tone.alt : tone.hi},0.95)`, lowQ ? 3 : 5);
    g.restore();
  }
}

// ---------- ตัวที่ขี่อยู่ (บนหลังตัวที่ถูกขี่ — boardDraw drawUnit เรียกหลังวาดหมาก) ----------
export function drawRider(g, rider, hx, hy, R, now, drawHex, alpha = 1) {
  const r = R * 0.62, bob = REDUCED ? 0 : Math.sin(now / 260) * R * 0.05;
  const cx = hx + R * 0.62, cy = hy - R * 0.92 + bob;
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(hx + R * 0.2, hy - R * 0.5); g.lineTo(cx, cy + r * 0.8); g.stroke();
  drawHex(g, rider, cx, cy, r, alpha);
  if (!REDUCED) noteGlyph(g, cx + r * 1.1, cy - r * 0.6 - ((now / 30) % 12), r * 0.7, "rgba(255,220,240,.75)", Math.floor(now / 800));
  g.restore();
}

// ---------- ปะทะ (ใช้ร่วมสองท่าตี) ----------
function endsOf(e) {
  const s = (e.size || 1) / 2, ts = (e.toSize || 1) / 2;
  return { ax: e.x + s, ay: e.y + s, bx: e.to.x + ts, by: e.to.y + ts };
}
function impact(g, bx, by, k, rgbA, rgbB, big, lowQ, now) {
  const [sx, sy, sc] = P(bx, by, 0.9);
  // แสงวาบสี (ทับปกติ — เห็นบนพื้นสว่าง)
  glow(g, sx, sy, sc * (0.7 + k * (big ? 1.8 : 1.0)), rgbA, (1 - k) * 0.65);
  addGlow(g, sx, sy, sc * (0.9 + k * (big ? 2.2 : 1.2)), "255,255,255", (1 - k) * (big ? 0.95 : 0.8));
  addGlow(g, sx, sy, sc * (1.2 + k * (big ? 2.8 : 1.6)), rgbA, (1 - k) * 0.7);
  const rings = big ? 3 : 2;
  for (let i = 0; i < rings; i++) {
    const kk = clamp01(k * 1.25 - i * 0.12);
    groundRing(g, bx, by, 0.3 + easeOut3(kk) * (big ? 2.4 + i * 0.6 : 1.4 + i * 0.4), i % 2 ? rgbB : rgbA, (1 - kk) * 0.95, big ? 5 - i : 3.5);
  }
  const spikes = lowQ ? 6 : big ? 16 : 10;
  for (let i = 0; i < spikes; i++) {
    const a = i / spikes * Math.PI * 2 + hash01(i) * 0.3;
    const d0 = sc * (0.15 + easeOut3(k) * (big ? 1.4 : 0.8)), d1 = d0 + sc * (big ? 0.6 : 0.35) * (1 - k);
    g.strokeStyle = i % 2 ? `rgba(${rgbA},${1 - k})` : `rgba(255,255,255,${1 - k})`; g.lineWidth = big ? 4 : 3;
    g.beginPath(); g.moveTo(sx + Math.cos(a) * d0, sy + Math.sin(a) * d0 * 0.75); g.lineTo(sx + Math.cos(a) * d1, sy + Math.sin(a) * d1 * 0.75); g.stroke();
  }
  const m = lowQ ? 5 : big ? 14 : 9;
  for (let i = 0; i < m; i++) {
    const a = i / m * Math.PI * 2 + 0.4, d = sc * (0.2 + easeOut3(k) * (big ? 1.7 : 1.0));
    const x = sx + Math.cos(a) * d, y = sy + Math.sin(a) * d * 0.7 + easeIn2(k) * sc * 0.4;
    if (big && i % 2) star(g, x, y, sc * 0.13 * (1 - k * 0.5), hsl(now / 4 + i * 30, 1 - k, 66), k * 3 + i);
    else noteGlyph(g, x, y, sc * (big ? 0.5 : 0.4) * (1 - k * 0.3), i % 2 ? `rgba(${rgbB},${1 - k})` : `rgba(255,255,255,${1 - k})`, i);
  }
}
// ---------- ท่าตีปกติ: คลื่นเสียง ----------
function noteShot(g, e, now, lowQ) {
  const t = (now - e.t0) / YUNA_MS.yunaNote;
  if (t <= 0 || t >= 1) return;
  const HIT = YUNA_HIT_P.yunaNote, { ax, ay, bx, by } = endsOf(e);
  const A = P(ax, ay, 0.9), B = P(bx, by, 0.9), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
  g.save(); g.lineCap = "round";
  if (t < HIT + 0.1) addGlow(g, A[0], A[1], A[2] * (0.7 + 0.3 * Math.sin(t * 30)), "255,150,210", 0.55 * (1 - clamp01((t - HIT) / 0.1)));
  const n = lowQ ? 2 : 4;
  for (let i = 0; i < n; i++) {
    const k = clamp01((t - i * 0.07) / HIT);
    if (k <= 0 || k >= 1) continue;
    soundArc(g, A[0] + dx * k, A[1] + dy * k, dx, dy, A[2] * (0.3 + k * 0.5), i % 2 ? "255,190,60" : "255,70,170", 0.95 * (1 - k * 0.3), Math.max(3, A[2] * 0.09));
  }
  for (let i = 0; i < (lowQ ? 2 : 4); i++) {
    const k = clamp01((t - 0.05 - i * 0.05) / HIT);
    if (k <= 0 || k >= 1) continue;
    const off = Math.sin(k * Math.PI * 2 + i * 1.6) * A[2] * 0.25;
    const x = A[0] + dx * k - dy / L * off, y = A[1] + dy * k + dx / L * off - Math.sin(k * Math.PI) * A[2] * 0.4;
    addGlow(g, x, y, A[2] * 0.3, "255,170,220", 0.6);
    noteGlyph(g, x, y, A[2] * 0.48, "rgba(255,255,255,1)", i);
  }
  if (t >= HIT) impact(g, bx, by, (t - HIT) / (1 - HIT), "255,110,190", "255,215,120", false, lowQ, now);
  g.restore();
}
// ---------- ท่าตีร่างไอดอล ----------
function idolShot(g, e, now, lowQ) {
  const t = (now - e.t0) / YUNA_MS.yunaIdol;
  if (t <= 0 || t >= 1) return;
  const HIT = YUNA_HIT_P.yunaIdol, CH = 0.3; // ชาร์จ 0–30% · ยิง 30–55% · ปะทะ 55%+
  const { ax, ay, bx, by } = endsOf(e);
  const A = P(ax, ay, 1.0), B = P(bx, by, 0.9), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L, hue = now / 3;
  g.save(); g.lineCap = "round";
  // หรี่ไฟทั้งเวที: มืดลงระหว่างชาร์จ → ค้างจนปะทะ → สว่างกลับ (สปอตไลต์/ลำแสงเด่นบนกระดานกลางวัน)
  const dim = t < CH ? easeOut3(t / CH) * 0.62 : t < HIT + 0.05 ? 0.62 : 0.62 * (1 - clamp01((t - HIT - 0.05) / 0.3));
  if (dim > 0) { g.fillStyle = `rgba(14,4,30,${dim})`; g.fillRect(-4000, -4000, 9000, 9000); }
  // ชาร์จ: เสาสปอตไลต์ลงที่ยูนะ + วงแสงหดเข้าตัว + โน้ตถูกดูดเข้า
  if (t < HIT + 0.08) {
    const c = clamp01(t / CH), fade = t < HIT ? 1 : 1 - (t - HIT) / 0.08;
    lightCone(g, ax, ay - 0.2, ax, ay, "255,255,255", 0.55 * c * fade, 0.55 + 0.25 * c, 9);
    lightCone(g, ax - 1.6, ay - 2.4, ax, ay, "255,80,200", 0.45 * c * fade, 0.5, 8);
    lightCone(g, ax + 1.6, ay - 2.4, ax, ay, "80,220,255", 0.45 * c * fade, 0.5, 8);
    for (let i = 0; i < 3; i++) groundRing(g, ax, ay, (1 - ((c + i / 3) % 1)) * 1.6 + 0.2, SPOT[i], c * fade * 0.9, 3.5);
    if (!lowQ) {
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + t * 6, d = (1 - c) * A[2] * 1.4 + A[2] * 0.2;
        noteGlyph(g, A[0] + Math.cos(a) * d, A[1] + Math.sin(a) * d * 0.7, A[2] * 0.36, hsl(hue + i * 45, c * fade, 70), i);
      }
    }
  }
  // ยิง: ลำคลื่นเสียงสีรุ้งหนา (แกนขาว) + วงคลื่นวิ่งตามลำ + เลเซอร์จากเวที
  if (t >= CH && t < HIT + 0.12) {
    const k = clamp01((t - CH) / (HIT - CH)), head = easeOut3(k), fade = t < HIT ? 1 : 1 - (t - HIT) / 0.12;
    const hx = A[0] + dx * head, hy = A[1] + dy * head, W = A[2] * 0.42;
    for (let layer = 0; layer < 3; layer++) {
      const gr = g.createLinearGradient(A[0], A[1], hx, hy);
      gr.addColorStop(0, hsl(hue, 0.15 * fade)); gr.addColorStop(0.5, hsl(hue + 120, 0.5 * fade)); gr.addColorStop(1, hsl(hue + 240, 0.9 * fade));
      g.strokeStyle = layer === 2 ? `rgba(255,255,255,${0.95 * fade})` : gr;
      g.lineWidth = W * (1 - layer * 0.32);
      g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(hx, hy); g.stroke();
    }
    const waves = lowQ ? 3 : 6;
    for (let i = 0; i < waves; i++) {
      const p = (((t * 9) + i / waves) % 1) * head;
      soundArc(g, A[0] + dx * p, A[1] + dy * p, dx, dy, W * (1.1 + p * 0.6), SPOT[i % SPOT.length], 0.9 * fade, Math.max(3, W * 0.18));
    }
    addGlow(g, hx, hy, W * 2.2, "255,255,255", 0.8 * fade);
    if (!lowQ) {
      for (let i = 0; i < 4; i++) {
        const o = P(bx + (i < 2 ? -3.5 : 3.5), by - 3 + (i % 2) * 1.5, 5);
        const tx = o[0] + (B[0] - o[0]) * head, ty = o[1] + (B[1] - o[1]) * head;
        g.strokeStyle = `rgba(${SPOT[(i + 1) % SPOT.length]},${0.35 * fade})`; g.lineWidth = 8;
        g.beginPath(); g.moveTo(o[0], o[1]); g.lineTo(tx, ty); g.stroke();
        g.strokeStyle = `rgba(255,255,255,${0.9 * fade})`; g.lineWidth = 2; g.stroke();
      }
    }
    for (let i = 0; i < (lowQ ? 4 : 10); i++) {
      const p = hash01(i * 3.1) * head, side = (i % 2 ? 1 : -1) * W * (0.6 + hash01(i) * 1.2) * k;
      noteGlyph(g, A[0] + dx * p + nx * side, A[1] + dy * p + ny * side, W * 0.85, hsl(hue + i * 36, fade, 70), i);
    }
  }
  // ปะทะ: เสาแสงที่เป้า + สปอตไลต์ 3 ดวงรวมที่เป้า + ระเบิดดาว + กระดาษสี
  if (t >= HIT) {
    const k = (t - HIT) / (1 - HIT);
    lightCone(g, bx, by - 0.2, bx, by, "255,255,255", 0.75 * (1 - k), 0.7 + k * 0.5, 9);
    for (let i = 0; i < 3; i++) lightCone(g, bx + (i - 1) * 2.4, by - 3, bx, by, SPOT[i * 2], 0.5 * (1 - k), 0.75, 8);
    impact(g, bx, by, k, "255,90,200", "80,220,255", true, lowQ, now);
    star(g, B[0], B[1], B[2] * (0.4 + easeOut3(k) * 0.9), `rgba(255,255,255,${(1 - k) * 0.9})`, k * 2, 5);
    if (!lowQ) {
      for (let i = 0; i < 30; i++) {
        const a = hash01(i * 1.7) * Math.PI * 2, v = 0.6 + hash01(i * 2.3) * 1.6;
        const x = B[0] + Math.cos(a) * v * B[2] * easeOut3(k), y = B[1] + Math.sin(a) * v * B[2] * 0.7 * easeOut3(k) + easeIn2(k) * B[2] * 0.9 - B[2] * 0.3;
        g.save(); g.translate(x, y); g.rotate(now / 120 + i);
        g.fillStyle = hsl(i * 41, 1 - k);
        g.fillRect(-B[2] * 0.05, -B[2] * 0.02, B[2] * 0.1, B[2] * 0.04);
        g.restore();
      }
    }
  }
  g.restore();
}

// ---------- เหตุการณ์ ----------
function revive(g, e, now, lowQ) {
  const t = (now - e.t0) / YUNA_FX_DUR.yunaRevive;
  if (t <= 0 || t >= 1 || !e.at) return;
  const x = e.at.x + 0.5, y = e.at.y + 0.5, fade = t < 0.75 ? 1 : (1 - t) / 0.25, open = easeOut3(clamp01(t * 2));
  g.save();
  lightCone(g, x, y - 0.1, x, y, "255,245,215", 0.85 * fade, 0.25 + 0.55 * open, 10);
  lightCone(g, x, y - 0.1, x, y, "255,255,255", 0.7 * fade, 0.12 + 0.2 * open, 10);
  for (let i = 0; i < 3; i++) groundRing(g, x, y, 0.3 + easeOut3(clamp01(t * 1.5 - i * 0.15)) * (1.2 + i * 0.5), i % 2 ? "255,200,120" : "255,240,200", 0.9 * fade * (1 - t), 4);
  const n = lowQ ? 8 : 18;
  for (let i = 0; i < n; i++) {
    const ph = clamp01(t * 1.4 - i / n * 0.45), ang = i * 2.1 + t * 6;
    const [sx, sy, sc] = P(x + Math.cos(ang) * 0.6, y + Math.sin(ang) * 0.6, ph * 3.6);
    const a = Math.sin(ph * Math.PI) * fade;
    if (i % 4 === 3) star(g, sx, sy, sc * 0.08, `rgba(255,236,170,${a})`, t * 8 + i, 4);
    else noteGlyph(g, sx, sy, sc * 0.4, `rgba(${i % 2 ? "255,236,190" : "255,255,255"},${a})`, i);
  }
  g.restore();
}
function vanish(g, e, now, lowQ, appear) {
  const t0 = (now - e.t0) / (appear ? YUNA_FX_DUR.yunaAppear : YUNA_FX_DUR.yunaVanish);
  if (t0 <= 0 || t0 >= 1 || !e.at) return;
  const t = appear ? 1 - t0 : t0; // ปรากฏ = เล่นย้อน (โน้ตรวมตัวเข้าหาตัว)
  const x = e.at.x + 0.5, y = e.at.y + 0.5;
  g.save();
  const [cx, cy, sc] = P(x, y, 0.9);
  addGlow(g, cx, cy, sc * (0.8 + t * 0.9), "40,10,70", 0.7 * (1 - t));
  groundRing(g, x, y, 0.25 + t * 1.6, "170,120,255", 0.85 * (1 - t), 3.5);
  const n = lowQ ? 8 : 18;
  for (let i = 0; i < n; i++) {
    const ang = i / n * Math.PI * 2 + i, d = easeOut3(t) * (0.6 + hash01(i) * 1.4);
    const [sx, sy, s2] = P(x + Math.cos(ang) * d, y + Math.sin(ang) * d, 0.8 + t * 1.6 + hash01(i * 3) * 0.8);
    noteGlyph(g, sx, sy, s2 * 0.36, `rgba(${i % 3 ? "200,170,255" : "255,255,255"},${1 - t})`, i);
  }
  if (appear && t0 > 0.7) addGlow(g, cx, cy, sc * 1.4, "255,255,255", (t0 - 0.7) * 2.6);
  g.restore();
}
function shadowCast(g, e, now) {
  const t = (now - e.t0) / YUNA_FX_DUR.yunaShadow;
  if (t <= 0 || t >= 1 || !e.at) return;
  g.save();
  const [cx, cy, sc] = P(e.at.x + 0.5, e.at.y + 0.5, 0.7);
  addGlow(g, cx, cy, sc * 1.1, "30,10,60", 0.7 * (1 - t));
  groundRing(g, e.at.x + 0.5, e.at.y + 0.5, 1.2 - t * 0.9, "140,90,230", 0.9 * (1 - t), 4);
  g.restore();
}
function songRing(g, e, now, lowQ, kind) {
  const t = (now - e.t0) / YUNA_FX_DUR[kind];
  if (t <= 0 || t >= 1 || !e.at) return;
  const x = e.at.x + 0.5, y = e.at.y + 0.5, R = (e.r || 4) + 0.5;
  const idol = kind === "yunaIdolOn" || kind === "yunaIdolEnd";
  const tone = idol ? TONE.idol : TONE[e.song] || null;
  g.save();
  if (idol) {
    const k = kind === "yunaIdolEnd" ? 1 - easeOut3(t) : easeOut3(t), hue = now / 3;
    for (let i = 0; i < 4; i++) {
      gEllipse(g, x, y, Math.max(0.1, R * k - i * 0.4), 0.03, 72);
      g.strokeStyle = hsl(hue + i * 90, (1 - t) * 0.95, 70); g.lineWidth = 6 - i; g.stroke();
    }
    if (kind === "yunaIdolOn") {
      const [cx, cy, sc] = P(x, y, 1);
      addGlow(g, cx, cy, sc * (1 + t * 4), "255,255,255", (1 - t) * 0.8);
      const n = lowQ ? 4 : 8;
      for (let i = 0; i < n; i++) {
        const ang = i / n * Math.PI * 2 + t * 3;
        lightCone(g, x, y - 2, x + Math.cos(ang) * R * k * 0.8, y + Math.sin(ang) * R * k * 0.8, SPOT[i % SPOT.length], 0.55 * (1 - t), 0.6, 9);
      }
    }
  } else if (!tone) {
    groundRing(g, x, y, 0.9 * (1 - t) + 0.2, "220,220,235", 0.8 * (1 - t), 3);
  } else {
    const k = kind === "yunaTick" ? 0.6 + 0.4 * t : easeOut3(t);
    for (let i = 0; i < 3; i++) groundRing(g, x, y, Math.max(0.1, R * k - i * 0.5), i % 2 ? tone.alt : tone.core, 0.95 * (1 - t), 5 - i);
    const [cx, cy, sc] = P(x, y, 1);
    addGlow(g, cx, cy, sc * (1 + t * 2), tone.core, (1 - t) * 0.7);
    if (e.song === "smile") {
      const n = lowQ ? 6 : 12;
      for (let i = 0; i < n; i++) {
        const ang = i / n * Math.PI * 2, [sx, sy, s2] = P(x + Math.cos(ang) * R * k, y + Math.sin(ang) * R * k, 0.4 + t * 1.2);
        heart(g, sx, sy, s2 * 0.13, `rgba(255,110,170,${1 - t})`);
      }
    } else if (!lowQ) {
      for (let i = 0; i < 14; i++) {
        const ang = hash01(i + Math.floor(now / 70)) * Math.PI * 2, d = R * k * hash01(i * 7);
        const [sx, sy, s2] = P(x + Math.cos(ang) * d, y + Math.sin(ang) * d, 0.05);
        g.fillStyle = `rgba(${i % 2 ? tone.alt : tone.core},${0.8 * (1 - t)})`;
        g.fillRect(sx - s2 * 0.25, sy - s2 * 0.05, s2 * 0.5 * hash01(i * 3), s2 * 0.1);
      }
    }
  }
  g.restore();
}
function mountFx(g, e, now) {
  const t = (now - e.t0) / YUNA_FX_DUR.yunaMount;
  if (t <= 0 || t >= 1 || !e.from || !e.to) return;
  g.save();
  for (let i = 0; i < 8; i++) {
    const k = clamp01(t * 1.4 - i * 0.05);
    if (k <= 0 || k >= 1) continue;
    const x = e.from.x + 0.5 + (e.to.x - e.from.x) * k, y = e.from.y + 0.5 + (e.to.y - e.from.y) * k;
    const [sx, sy, sc] = P(x, y, 0.8 + Math.sin(k * Math.PI) * 1.4);
    noteGlyph(g, sx, sy, sc * 0.32, `rgba(255,230,245,${(1 - t) * (1 - i / 9)})`, i);
  }
  const [cx, cy, sc] = P(e.to.x + 0.5, e.to.y + 0.5, 1.4);
  if (t > 0.5) addGlow(g, cx, cy, sc * 0.9, "255,200,230", (1 - t) * 0.9);
  groundRing(g, e.to.x + 0.5, e.to.y + 0.5, 0.3 + t * 0.8, "255,160,210", (1 - t) * 0.9, 3);
  g.restore();
}
function fallFx(g, e, now) {
  const t = (now - e.t0) / YUNA_FX_DUR.yunaFall;
  if (t <= 0 || t >= 1 || !e.to) return;
  const x = e.to.x + 0.5, y = e.to.y + 0.5;
  g.save();
  groundRing(g, x, y, 0.2 + easeOut3(t) * 0.9, "255,255,255", 0.9 * (1 - t), 3);
  for (let i = 0; i < 4; i++) {
    const ang = now / 160 + i / 4 * Math.PI * 2;
    const [sx, sy, sc] = P(x + Math.cos(ang) * 0.32, y + Math.sin(ang) * 0.32, 1.5);
    star(g, sx, sy, sc * 0.08, `rgba(255,230,120,${1 - t})`, now / 100, 5);
  }
  g.restore();
}

export function yunaFx(g, e, now, lowQ) {
  switch (e.kind) {
    case "yunaNote": noteShot(g, e, now, lowQ); break;
    case "yunaIdol": idolShot(g, e, now, lowQ); break;
    case "yunaRevive": revive(g, e, now, lowQ); break;
    case "yunaVanish": vanish(g, e, now, lowQ, false); break;
    case "yunaAppear": vanish(g, e, now, lowQ, true); break;
    case "yunaShadow": shadowCast(g, e, now); break;
    case "yunaSong": case "yunaIdolOn": case "yunaIdolEnd": case "yunaTick": songRing(g, e, now, lowQ, e.kind); break;
    case "yunaMount": mountFx(g, e, now); break;
    case "yunaFall": fallFx(g, e, now); break;
    default: break;
  }
}
