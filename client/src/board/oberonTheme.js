// ============================================================
//  สนาม "สนธยายามค่ำคืน" ของโอเบรอน (วอร์ติเกิร์น) — area 90 · 10×10 (server/board.js OBERON_AREA · GRID_PLAN §7.46)
//   ผู้ใช้สั่ง (2026-11-27): ฉากหลังต้องเหมือนภาพอ้างอิงเป๊ะ + วีดีโอแรงบันดาลใจ (อุโมงค์พุ่งเข้าหาหลุมพร้อมหมุน)
//    ภาพ abyss_bg.webp สร้างด้วย .claude/plans/oberon-abyss-bg.py: อุโมงค์หินแดงชมพูซ้อนเป็นชั้น "คล้ายตัวเอง"
//    (ซูม 1/q รอบหลุมแล้วหมุน ROT_STEP = ชั้นถัดไปซ้อนพอดี) → animBack วาด 2 ชั้นไขว้กันวนซูมเข้าหลุมไม่มีรอยต่อ
//    แสงส้มพาดแนวนอนของภาพอ้างอิง — ผู้ใช้สั่งเอาออก · กระดูก/ซากรอบกระดาน — เอาออก (ไม่มีในภาพอ้างอิง)
//   ธีม (regionThemes.js themeOf):
//    back      พื้นแดงดำสำรอง (ก่อนภาพโหลด) (อบ) · animBack  ภาพอุโมงค์ซูม+หมุน + หลุมเต้นเรือง (ทุกเฟรม)
//    base      ไม่มี — กระดานโปร่ง (ผู้ใช้สั่ง) เห็นหลุมทะลุช่อง
//    ambient   ฝุ่นหมุนเป็นเกลียวดูดเข้าหลุม (lowQ ข้าม)
// ============================================================
import { glow } from "./boardGeo";

const TAU = Math.PI * 2;
export const OBERON_AREA = 90;
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// ภาพอุโมงค์ (ค่าตรงกับ .claude/plans/oberon-abyss-bg.py)
const BG = { url: "/characters/oberon_vortigern/abyss_bg.webp", w: 2560, h: 1280, hx: 728, hy: 768, q: 0.78, rot: 0.21 };
const RING_MS = 5200;   // เวลาต่อการพุ่งผ่าน 1 ชั้น
const OVERSCAN = 1.02;  // ชั้น A (ซูม ≥ 1) คลุมจอเสมอ · ชั้น B (ซูม q→1) แค่ไขว้ทับ ขาดขอบได้ (มี A อยู่ใต้)
let bgImg = null;
function bgImage() {
  if (!bgImg && typeof Image === "function") { bgImg = new Image(); bgImg.decoding = "async"; bgImg.src = BG.url; }
  return bgImg && bgImg.complete && bgImg.naturalWidth > 0 ? bgImg : null;
}
export const preloadOberonBg = () => { bgImage(); };

const PAL = {
  ground1: "#2a070b", ground2: "#070103", tile: "rgba(255,90,80,.04)", tile2: "rgba(20,0,4,.14)",
  grid: "rgba(255,150,140,.32)", border: "rgba(255,110,90,.55)", spawn: "rgba(255,120,100,.0)",
  light: ["rgba(255,80,60,.0)", "rgba(0,0,0,.12)"], nightTint: null, shadow: "rgba(0,0,0,.55)",
  line: "rgba(255,120,100,.8)", gold: "#ff6a4a", accent: "#ff3a3a",
  flesh: "#4a141a", flesh2: "#2a0a0e", vein: "rgba(150,20,30,.55)", bone: "#a8987a", bone2: "#6d6250",
  pus: "rgba(160,150,60,.55)", rot: "rgba(70,90,30,.5)", blood: "#7a0612",
  leaf: "rgba(60,0,10,.85)", foreAcc: "rgba(120,20,20,.6)",
};

const THEME = {
  back(c) {
    const { g, VX0, VY0, VX1, VY1, VW } = c;
    bgImage();
    const gr = g.createRadialGradient((VX0 + VX1) * 0.42, (VY0 + VY1) * 0.55, 0, (VX0 + VX1) * 0.42, (VY0 + VY1) * 0.55, VW * 0.7);
    gr.addColorStop(0, "#8a1418"); gr.addColorStop(0.25, "#4a1216"); gr.addColorStop(1, "#1a0608");
    g.fillStyle = gr; g.fillRect(VX0, VY0, VW, VY1 - VY0);
  },
  ground() {},
  // กระดานโปร่ง (ผู้ใช้สั่ง 2026-11-27): ไม่มีแท่นใต้กระดาน — เห็นอุโมงค์หลุมทะลุช่อง
  base() {},
  side() {},
  fore(f, c) {
    const { VX0, VY0, VX1, VY1 } = c;
    for (const [cx, cy, r] of [[VX0, VY0, 300], [VX1, VY0, 280], [VX0, VY1, 320], [VX1, VY1, 300]]) {
      const gr = f.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, "rgba(10,0,2,.85)"); gr.addColorStop(1, "rgba(10,0,2,0)");
      f.fillStyle = gr; f.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  },
  // อุโมงค์พุ่งเข้าหลุมพร้อมหมุน (แบบวีดีโอ): 2 ชั้นของภาพเดียวกัน ห่างกัน 1 ชั้นหิน ไขว้ความทึบ
  animBack(g, f, t) {
    const im = bgImage();
    const v = f.view, VW = v.x1 - v.x0, VH = v.y1 - v.y0;
    // หลุมอยู่ที่ 32% กว้าง · 55% สูงของจอ (องค์ประกอบแบบภาพอ้างอิง) · สเกลเล็กสุดที่ภาพยังคลุมจอทุกด้านรอบหลุม
    const ax = v.x0 + VW * 0.32, ay = v.y0 + VH * 0.55;
    const k = Math.max((ax - v.x0) / BG.hx, (v.x1 - ax) / (BG.w - BG.hx), (ay - v.y0) / BG.hy, (v.y1 - ay) / (BG.h - BG.hy)) * OVERSCAN;
    const ox = ax - BG.hx * k, oy = ay - BG.hy * k;
    const hx = ax, hy = ay;
    f.marks.obvHole = { x: hx, y: hy, k };
    if (!im) return;
    const p = REDUCED || f.lowQ ? 0 : (t / RING_MS) % 1;
    const layer = (z, rot, a) => {
      if (a <= 0.002) return;
      g.save(); g.globalAlpha = a;
      g.translate(hx, hy); g.rotate(rot); g.scale(z, z); g.translate(-hx, -hy);
      g.drawImage(im, ox, oy, BG.w * k, BG.h * k);
      g.restore();
    };
    // A: ซูมจาก 1 → 1/q (ชั้นในขยายออกมาแทนชั้นนอก) · B: ช้ากว่า 1 ชั้น (q → 1) จางเข้าแทน A ตอนท้ายรอบ
    layer(Math.pow(BG.q, -p), -BG.rot * p, 1);
    layer(Math.pow(BG.q, 1 - p), BG.rot * (1 - p), p);
    // หลุมเต้นเรืองแดง (หายใจ)
    const beat = 0.5 + 0.5 * Math.sin(t / 650);
    glow(g, hx, hy, 260 * k * (0.9 + 0.2 * beat), "255,30,20", 0.22 + 0.18 * beat);
    glow(g, hx, hy, 60 * k, "0,0,0", 0.7);
  },
  ambient(g, f, t) {
    const o = f.marks.obvHole;
    if (!o || f.lowQ) return;
    const v = f.view, R = Math.hypot(v.x1 - v.x0, v.y1 - v.y0) * 0.7;
    for (let i = 0; i < 70; i++) {
      const ph = (t / (5000 + (i % 7) * 600) + hash(i, 21)) % 1, rr = R * (1 - ph);
      const a = hash(i, 22) * TAU + ph * 7;
      const x = o.x + Math.cos(a) * rr, y = o.y + Math.sin(a) * rr * 0.6;
      g.globalAlpha = Math.sin(ph * Math.PI) * 0.75;
      g.fillStyle = i % 6 === 0 ? "#e0b8a0" : i % 3 ? "#5a1a18" : "#2a0a0a";
      const s = 1.2 + hash(i, 23) * 2.4;
      g.fillRect(x - s / 2, y - s / 2, s, s);
    }
    g.globalAlpha = 1;
  },
};
THEME.pal = { day: PAL, night: PAL };

export const OBERON_THEMES = { [OBERON_AREA]: THEME };
