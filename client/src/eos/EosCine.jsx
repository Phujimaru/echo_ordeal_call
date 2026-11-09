// ============================================================
//  ฉากเข้าสนาม Eos (GRID_PLAN §8.6) — ครึ่งหลังของฉากเดียวต่อเนื่องใน MatchIntro โหมด eos (App.startPendingJourney)
//   ก่อนหน้า: ลูกโลกร่วมหมุนหาหมุด Eos → หมุดเรือง → ดิ่งชนผิวโลก (eosFlight.js) → mount ฉากนี้ตอนชน (EOS_T.crash)
//  <EosCine D={ms} lowQ />  — canvas 2D (u = เวลา / D ของช่วงนี้) + ชื่อสนามเป็น DOM
//   0.00      แฟลชฟ้าคริสตัล (ชนผิวโลก) · 0.00–0.15 ทะลุชั้นเมฆ
//   0.04–0.62 บินเลียบขอบฟ้ายามค่ำ: เนินหินไลด์ → แหวนหินดัสเค → โดมอัลทิสเซีย → นครหลวงอินซอมเนีย (กำแพงเวท + ปราสาทเรืองแสง)
//   0.46–0.84 อาวุธราชวงศ์ (ดาบภูตสีฟ้า) ล้อมวงคริสตัล · ชื่อ "EOS" ขึ้น
//   0.84–1.00 อาวุธแตกกระจาย + แฟลช → จางเผยกระดาน
//  ข้อความมีแค่ชื่อสนาม (กฎ UI) · เสียง: /eos/sfx/royal_arms.mp3 ตอนอาวุธปรากฏ (ไม่ใช่วีดีโอ — ไม่ขัดกฎเสียงซ้อนวีดีโอ)
// ============================================================
import { useEffect, useRef } from "react";
import { eosAudio } from "./eosAudio";
import { EOS_INTRO_MS, EOS_T } from "./eosMeta";
import "./eosCine.css";


const T = { clouds: 0.15, panA: 0.04, panB: 0.62, arms: 0.46, crystal: 0.5, title: 0.56, shatter: 0.84, flash: 0.86, out: 0.9 };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const span = (u, a, b) => clamp01((u - a) / (b - a));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const TAU = Math.PI * 2;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// สันเขา: ผลรวมคลื่นไซน์ (ไม่สุ่มต่อเฟรม — สร้างครั้งเดียวลง canvas นอกจอ)
function ridgeY(x, base, amp, seed) {
  return base
    - amp * (0.55 * Math.sin(x * 0.0042 + seed) + 0.3 * Math.sin(x * 0.011 + seed * 2.1) + 0.15 * Math.sin(x * 0.031 + seed * 3.7));
}
function offscreen(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/** ชั้นภาพนิ่งทั้งหมด (สร้างครั้งเดียวต่อขนาดจอ) · P = ระยะแพนของชั้นกลาง (px) */
function buildLayers(w, h, lowQ) {
  const r = rng(45);
  const citadelU = 0.8;
  const LW = Math.ceil(w * 2.1);
  const P = citadelU * LW - w / 2;
  const L = { LW, P, citadelX: citadelU * LW, citadelTop: 0, horizon: h * 0.7 };

  // --- ภูเขาไกล (เลื่อน 0.4×) ---
  const farW = w + P * 0.4 + 40;
  const far = offscreen(farW, h);
  {
    const g = far.getContext("2d");
    const grd = g.createLinearGradient(0, h * 0.45, 0, h);
    grd.addColorStop(0, "#14244a");
    grd.addColorStop(1, "#070d1f");
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= farW; x += 6) g.lineTo(x, ridgeY(x, h * 0.6, h * 0.09, 1.3));
    g.lineTo(farW, h);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(150,190,255,0.22)";
    g.lineWidth = 1.4;
    g.beginPath();
    for (let x = 0; x <= farW; x += 6) g[x ? "lineTo" : "moveTo"](x, ridgeY(x, h * 0.6, h * 0.09, 1.3));
    g.stroke();
  }

  // --- ชั้นกลาง (เลื่อน 1×): ไลด์ · แหวนหิน · อัลทิสเซีย · อินซอมเนีย ---
  const midW = w + P + 40;
  const mid = offscreen(midW, h);
  {
    const g = mid.getContext("2d");
    const base = (x) => ridgeY(x, h * 0.71, h * 0.025, 4.2);
    const fillCol = "#060c1c";
    // พื้น
    g.fillStyle = fillCol;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= midW; x += 8) g.lineTo(x, base(x));
    g.lineTo(midW, h);
    g.closePath();
    g.fill();
    // ไลด์: เนินยอดตัด (เมซา) โทนอุ่น
    [[0.04, 0.08, 0.13], [0.11, 0.06, 0.09], [0.17, 0.05, 0.16]].forEach(([u, ww, hh]) => {
      const x0 = u * LW, x1 = x0 + ww * LW, top = h * 0.71 - hh * h;
      g.fillStyle = "#140e14";
      g.beginPath();
      g.moveTo(x0 - ww * LW * 0.25, base(x0) + 4);
      g.lineTo(x0, top);
      g.lineTo(x1, top + 3);
      g.lineTo(x1 + ww * LW * 0.3, base(x1) + 4);
      g.closePath();
      g.fill();
      g.strokeStyle = "rgba(255,170,110,0.16)";
      g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x0, top); g.lineTo(x1, top + 3); g.stroke();
    });
    // ดัสเค: แหวนหินยักษ์ (ครึ่งจมดิน เอียง)
    {
      const cx = 0.3 * LW, cy = h * 0.69, R = h * 0.2;
      g.save();
      g.translate(cx, cy);
      g.rotate(-0.22);
      g.lineCap = "round";
      g.strokeStyle = "#0a1226";
      g.lineWidth = h * 0.035;
      g.beginPath(); g.ellipse(0, 0, R, R * 0.92, 0, Math.PI * 1.04, Math.PI * 1.98); g.stroke();
      g.strokeStyle = "rgba(160,200,255,0.2)";
      g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(0, -h * 0.016, R, R * 0.92, 0, Math.PI * 1.08, Math.PI * 1.9); g.stroke();
      g.restore();
    }
    // อัลทิสเซีย: โดมกับยอดแหลม ไฟสีเขียวน้ำทะเล
    for (let i = 0; i < 7; i++) {
      const x = (0.44 + i * 0.022) * LW, rr = h * (0.022 + r() * 0.03);
      const y = base(x) - h * (0.015 + r() * 0.03);
      g.fillStyle = fillCol;
      g.fillRect(x - rr, y, rr * 2, base(x) - y + 2);
      g.beginPath(); g.arc(x, y, rr, Math.PI, 0); g.fill();
      g.fillRect(x - 1.5, y - rr - h * 0.03, 3, h * 0.03);
      for (let k = 0; k < 4; k++) {
        g.fillStyle = `rgba(110,240,220,${0.35 + r() * 0.5})`;
        g.fillRect(x - rr * 0.7 + r() * rr * 1.4, y + r() * (base(x) - y), 1.6, 1.6);
      }
    }
    // อินซอมเนีย: ตึกระฟ้า + ปราสาท (Citadel) กลาง
    const cX = L.citadelX;
    const towers = [];
    for (let x = cX - LW * 0.16; x < cX + LW * 0.16; x += 6 + r() * 14) {
      const d = Math.abs(x - cX) / (LW * 0.16);
      const tw = 8 + r() * 22;
      const th = h * (0.04 + (1 - d) * 0.16 * (0.4 + r() * 0.6));
      towers.push([x, tw, th]);
    }
    towers.forEach(([x, tw, th]) => {
      const y = base(x) - th;
      g.fillStyle = fillCol;
      g.fillRect(x, y, tw, th + 6);
      const n = Math.floor((tw * th) / 90);
      for (let k = 0; k < n; k++) {
        const warm = r() < 0.55;
        g.fillStyle = warm ? `rgba(255,205,130,${0.25 + r() * 0.55})` : `rgba(140,210,255,${0.25 + r() * 0.5})`;
        g.fillRect(x + 1 + Math.floor(r() * (tw - 3)), y + 2 + Math.floor(r() * (th - 4)), 1.6, 1.6);
      }
    });
    // ปราสาท: ทรงขั้นบันไดยอดแหลม
    const ch = h * 0.33, cb = base(cX);
    const top = cb - ch;
    L.citadelTop = top;
    g.fillStyle = "#050a18";
    g.beginPath();
    g.moveTo(cX - h * 0.07, cb + 4);
    g.lineTo(cX - h * 0.06, cb - ch * 0.35);
    g.lineTo(cX - h * 0.035, cb - ch * 0.42);
    g.lineTo(cX - h * 0.03, cb - ch * 0.7);
    g.lineTo(cX - h * 0.012, cb - ch * 0.78);
    g.lineTo(cX, top);
    g.lineTo(cX + h * 0.012, cb - ch * 0.78);
    g.lineTo(cX + h * 0.03, cb - ch * 0.7);
    g.lineTo(cX + h * 0.035, cb - ch * 0.42);
    g.lineTo(cX + h * 0.06, cb - ch * 0.35);
    g.lineTo(cX + h * 0.07, cb + 4);
    g.closePath();
    g.fill();
    g.strokeStyle = "rgba(170,220,255,0.35)";
    g.lineWidth = 1.2;
    g.stroke();
    for (let k = 0; k < 40; k++) {
      g.fillStyle = `rgba(150,220,255,${0.3 + r() * 0.6})`;
      const yy = cb - r() * ch * 0.75;
      const half = yy > cb - ch * 0.35 ? h * 0.055 : yy > cb - ch * 0.7 ? h * 0.03 : h * 0.01;
      g.fillRect(cX - half + r() * half * 2, yy, 1.6, 1.6);
    }
  }

  // --- แถวต้นไม้ใกล้ (เลื่อน 1.6×) ---
  const nearW = w + P * 1.6 + 40;
  const near = offscreen(nearW, h);
  {
    const g = near.getContext("2d");
    const base = (x) => ridgeY(x, h * 0.88, h * 0.04, 7.7);
    g.fillStyle = "#02050c";
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= nearW; x += 8) g.lineTo(x, base(x));
    g.lineTo(nearW, h);
    g.closePath();
    g.fill();
    for (let x = 0; x < nearW; x += 7 + r() * 16) {
      const th = h * (0.04 + r() * 0.09), tw = th * (0.28 + r() * 0.12), y = base(x) + 3;
      g.beginPath();
      g.moveTo(x - tw, y);
      g.lineTo(x, y - th);
      g.lineTo(x + tw, y);
      g.closePath();
      g.fill();
    }
  }

  // --- ลายรังผึ้งของกำแพงเวท ---
  const hexS = Math.max(10, h * 0.022);
  const hex = offscreen(hexS * 3, hexS * Math.sqrt(3) * 2);
  {
    const g = hex.getContext("2d");
    g.strokeStyle = "rgba(160,220,255,0.9)";
    g.lineWidth = 1;
    const hx = (cx, cy) => {
      g.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * TAU;
        g[i ? "lineTo" : "moveTo"](cx + hexS * Math.cos(a), cy + hexS * Math.sin(a));
      }
      g.stroke();
    };
    const hh = hexS * Math.sqrt(3);
    hx(0, 0); hx(0, hh); hx(0, hh * 2); hx(hexS * 1.5, hh / 2); hx(hexS * 1.5, hh * 1.5); hx(hexS * 3, 0); hx(hexS * 3, hh); hx(hexS * 3, hh * 2);
  }

  // ดาว · ละอองแสงลอยขึ้น · ดาบภูต
  const stars = Array.from({ length: lowQ ? 120 : 260 }, () => ({ x: r(), y: Math.pow(r(), 1.6) * 0.62, s: 0.6 + r() * 1.4, ph: r() * TAU, sp: 0.6 + r() * 2 }));
  const motes = Array.from({ length: lowQ ? 24 : 60 }, () => ({ x: r(), y: r(), s: 1 + r() * 2.2, sp: 0.04 + r() * 0.09, ph: r() * TAU }));
  // ชั้นเมฆที่กล้องพุ่งทะลุลงมาหลังชนผิวโลก (มุม · ระยะจากกลางจอ · ขนาด)
  const clouds = Array.from({ length: lowQ ? 18 : 34 }, () => ({ a: r() * TAU, d: 0.05 + r() * 0.5, s: 0.25 + r() * 0.35, z: r(), tone: r() }));
  const blades = Array.from({ length: 13 }, (_, i) => ({
    i, len: 0.85 + r() * 0.3, wide: r() < 0.3 ? 1.7 : r() < 0.5 ? 0.7 : 1, from: r() * TAU, kind: i % 5 === 2 ? "spear" : "sword",
  }));
  return { ...L, far, mid, near, hex, stars, motes, clouds, blades };
}

function drawBlade(g, L, wd, kind, glow) {
  const half = L / 2;
  const hilt = L * (kind === "spear" ? 0.32 : 0.2);
  const gx = -half + hilt;
  const tipLen = kind === "spear" ? wd * 3 : wd * 1.6;
  const grad = g.createLinearGradient(-half, 0, half, 0);
  grad.addColorStop(0, "rgba(90,170,255,0.25)");
  grad.addColorStop(0.35, "rgba(140,210,255,0.55)");
  grad.addColorStop(1, "rgba(235,250,255,0.95)");
  g.fillStyle = grad;
  g.strokeStyle = "rgba(180,230,255,0.9)";
  g.lineWidth = 1.1;
  if (glow) { g.shadowColor = "#56b4ff"; g.shadowBlur = 14; }
  // ด้าม + โกร่ง
  g.fillRect(-half, -wd * 0.22, hilt, wd * 0.44);
  if (kind !== "spear") g.fillRect(gx - wd * 0.25, -wd * 1.45, wd * 0.5, wd * 2.9);
  // ใบ
  g.beginPath();
  g.moveTo(gx, -wd / 2);
  g.lineTo(half - tipLen, -wd / 2);
  g.lineTo(half, 0);
  g.lineTo(half - tipLen, wd / 2);
  g.lineTo(gx, wd / 2);
  g.closePath();
  g.fill();
  g.stroke();
  g.shadowBlur = 0;
}

function drawCrystal(g, H, t, a) {
  if (a <= 0) return;
  g.save();
  g.globalAlpha = a;
  // แสงรอบ
  const halo = g.createRadialGradient(0, 0, 0, 0, 0, H * 2.4);
  halo.addColorStop(0, "rgba(120,200,255,0.45)");
  halo.addColorStop(0.4, "rgba(60,130,255,0.14)");
  halo.addColorStop(1, "rgba(30,60,160,0)");
  g.fillStyle = halo;
  g.beginPath(); g.arc(0, 0, H * 2.4, 0, TAU); g.fill();
  const top = [0, -H], rt = [H * 0.46, -H * 0.12], bot = [0, H], lf = [-H * 0.46, -H * 0.12];
  const mx = Math.sin(t * 0.9) * H * 0.22; // สันกลางเลื่อน = หมุนช้าๆ
  const grd = g.createLinearGradient(0, -H, 0, H);
  grd.addColorStop(0, "#e9fbff");
  grd.addColorStop(0.45, "#6cc6ff");
  grd.addColorStop(1, "#1b3f9e");
  g.fillStyle = grd;
  g.beginPath(); g.moveTo(...top); g.lineTo(...rt); g.lineTo(...bot); g.lineTo(...lf); g.closePath(); g.fill();
  g.strokeStyle = "rgba(230,250,255,0.85)";
  g.lineWidth = 1.2;
  g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.5)";
  g.beginPath();
  g.moveTo(...top); g.lineTo(mx, -H * 0.12); g.lineTo(...bot);
  g.moveTo(...lf); g.lineTo(mx, -H * 0.12); g.lineTo(...rt);
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.beginPath(); g.moveTo(...top); g.lineTo(mx, -H * 0.12); g.lineTo(...lf); g.closePath(); g.fill();
  g.restore();
}

export default function EosCine({ D = Math.round((1 - EOS_T.crash) * EOS_INTRO_MS), lowQ = false }) {
  const cvRef = useRef(null);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return undefined;
    const g = cv.getContext("2d");
    const dpr = Math.min(lowQ ? 1 : 1.5, window.devicePixelRatio || 1);
    let w = 0, h = 0, Lr = null;
    const resize = () => {
      w = window.innerWidth || 1600;
      h = window.innerHeight || 900;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      Lr = buildLayers(w, h, lowQ);
    };
    resize();
    window.addEventListener("resize", resize);

    const t0 = performance.now();
    let raf = 0;
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const ms = now - t0;
      // dev: window.__eosU = 0..1 หยุดฉากไว้ที่จุดนั้น
      const u = import.meta.env.DEV && window.__eosU != null ? window.__eosU : clamp01(ms / D);
      const t = ms / 1000;
      const L = Lr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;

      // ---------- ท้องฟ้า ----------
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#01030a");
      sky.addColorStop(0.45, "#071029");
      sky.addColorStop(0.72, "#13254d");
      sky.addColorStop(1, "#050a18");
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);

      const pan = easeInOut(span(u, T.panA, T.panB));
      const P = L.P * pan;
      const zoom = 1 + 0.12 * easeInOut(span(u, T.panA, T.shatter));
      // ดาว (ไม่ซูม — อยู่ไกลสุด)
      for (const s of L.stars) {
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
        g.fillStyle = `rgba(210,230,255,${(a * 0.85).toFixed(3)})`;
        const x = ((s.x * w * 1.3 - P * 0.06) % (w * 1.3) + w * 1.3) % (w * 1.3) - w * 0.15;
        g.fillRect(x, s.y * h, s.s, s.s);
      }
      // ดาวตก
      const sh = span(u, 0.16, 0.24);
      if (sh > 0 && sh < 1) {
        const x = w * (0.82 - sh * 0.45), y = h * (0.08 + sh * 0.18);
        const tail = g.createLinearGradient(x, y, x + w * 0.09, y - h * 0.04);
        tail.addColorStop(0, `rgba(220,240,255,${(1 - sh).toFixed(3)})`);
        tail.addColorStop(1, "rgba(220,240,255,0)");
        g.strokeStyle = tail;
        g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * 0.09, y - h * 0.04); g.stroke();
      }

      g.save();
      g.translate(w / 2, h * 0.7);
      g.scale(zoom, zoom);
      g.translate(-w / 2, -h * 0.7);

      // แสงเมืองหลวงสะท้อนฟ้า
      const cxs = L.citadelX - P;
      const glow = g.createRadialGradient(cxs, h * 0.66, 0, cxs, h * 0.66, h * 0.7);
      glow.addColorStop(0, "rgba(80,150,255,0.32)");
      glow.addColorStop(0.5, "rgba(40,80,190,0.1)");
      glow.addColorStop(1, "rgba(20,40,120,0)");
      g.fillStyle = glow;
      g.fillRect(0, 0, w, h);

      g.drawImage(L.far, -P * 0.4, 0);
      // หมอกไกล
      const fogY = h * 0.66;
      const fog = g.createLinearGradient(0, fogY - h * 0.06, 0, fogY + h * 0.08);
      fog.addColorStop(0, "rgba(90,130,210,0)");
      fog.addColorStop(0.5, "rgba(90,130,210,0.16)");
      fog.addColorStop(1, "rgba(90,130,210,0)");
      g.fillStyle = fog;
      g.fillRect(0, fogY - h * 0.06, w, h * 0.14);

      g.drawImage(L.mid, -P, 0);

      // กำแพงเวท (โดม) ครอบนครหลวง — กระพริบเบาๆ
      {
        const rx = L.LW * 0.17, ry = h * 0.42, cy = h * 0.71;
        const pulse = 0.55 + 0.45 * Math.sin(t * 1.7);
        g.save();
        g.beginPath();
        g.ellipse(cxs, cy, rx, ry, 0, Math.PI, TAU);
        g.closePath();
        g.clip();
        const dg = g.createRadialGradient(cxs, cy, ry * 0.2, cxs, cy, rx);
        dg.addColorStop(0, "rgba(90,170,255,0.02)");
        dg.addColorStop(1, `rgba(120,200,255,${(0.12 + 0.06 * pulse).toFixed(3)})`);
        g.fillStyle = dg;
        g.fillRect(cxs - rx, cy - ry, rx * 2, ry);
        g.globalAlpha = 0.07 + 0.06 * pulse;
        g.fillStyle = g.createPattern(L.hex, "repeat");
        g.fillRect(cxs - rx, cy - ry, rx * 2, ry);
        g.restore();
        g.strokeStyle = `rgba(160,220,255,${(0.35 + 0.25 * pulse).toFixed(3)})`;
        g.lineWidth = 1.6;
        g.beginPath(); g.ellipse(cxs, cy, rx, ry, 0, Math.PI, TAU); g.stroke();
        // แสงยอดปราสาท (คริสตัล)
        const tg = g.createRadialGradient(cxs, L.citadelTop, 0, cxs, L.citadelTop, h * 0.06);
        tg.addColorStop(0, `rgba(220,245,255,${(0.6 + 0.3 * pulse).toFixed(3)})`);
        tg.addColorStop(1, "rgba(120,200,255,0)");
        g.fillStyle = tg;
        g.beginPath(); g.arc(cxs, L.citadelTop, h * 0.06, 0, TAU); g.fill();
      }

      // หมอกพื้น
      const fog2 = g.createLinearGradient(0, h * 0.72, 0, h * 0.9);
      fog2.addColorStop(0, "rgba(70,110,190,0.14)");
      fog2.addColorStop(1, "rgba(70,110,190,0)");
      g.fillStyle = fog2;
      g.fillRect(0, h * 0.72, w, h * 0.2);
      g.drawImage(L.near, -P * 1.6, 0);
      g.restore();

      // ละอองแสงลอยขึ้น
      g.globalCompositeOperation = "lighter";
      for (const m of L.motes) {
        const y = (((m.y - t * m.sp) % 1) + 1) % 1;
        const x = m.x * w + Math.sin(t * 0.8 + m.ph) * 12;
        g.fillStyle = `rgba(110,190,255,${(0.25 + 0.35 * Math.sin(t * 2 + m.ph) ** 2).toFixed(3)})`;
        g.beginPath(); g.arc(x, y * h, m.s, 0, TAU); g.fill();
      }
      g.globalCompositeOperation = "source-over";

      // ---------- ทะลุเมฆ (ต่อจากดิ่งลงหมุดบนลูกโลก) ----------
      const ck = span(u, 0, T.clouds);
      if (ck < 1) {
        const cover = 1 - ck;
        g.fillStyle = `rgba(16,28,56,${(Math.pow(cover, 1.6) * 0.95).toFixed(3)})`;
        g.fillRect(0, 0, w, h);
        const M = Math.max(w, h);
        for (const c of L.clouds) {
          // เมฆแต่ละก้อนพุ่งออกจากกลางจอ (กล้องวิ่งเข้าหา) แล้วจางหาย
          const zz = (c.z + ck * 1.4) % 1.4;
          const grow = 0.3 + zz * 2.2;
          const x = w / 2 + Math.cos(c.a) * c.d * M * grow;
          const y = h * 0.48 + Math.sin(c.a) * c.d * M * grow * 0.7;
          const rr = c.s * M * grow * 0.5;
          const a = Math.min(1, zz * 3) * (1 - Math.min(1, zz / 1.4)) * cover * 0.85;
          if (a <= 0.01) continue;
          const cg = g.createRadialGradient(x, y, 0, x, y, rr);
          const col = c.tone < 0.5 ? "150,175,215" : "105,130,180";
          cg.addColorStop(0, `rgba(${col},${a.toFixed(3)})`);
          cg.addColorStop(1, `rgba(${col},0)`);
          g.fillStyle = cg;
          g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
        }
      }

      // ---------- อาวุธราชวงศ์ ----------
      const dim = span(u, T.arms - 0.04, T.arms + 0.08);
      if (dim > 0) {
        g.fillStyle = `rgba(1,3,10,${(0.55 * dim).toFixed(3)})`;
        g.fillRect(0, 0, w, h);
      }
      const C = [w / 2, h * 0.43];
      const R = Math.min(w, h) * 0.2;
      const spin = t * 0.35;
      const sh2 = span(u, T.shatter, T.shatter + 0.08);
      if (u >= T.arms) {
        g.globalCompositeOperation = "lighter";
        for (const b of L.blades) {
          const s0 = T.arms + b.i * 0.011;
          const k = easeOut(span(u, s0, s0 + 0.075));
          if (k <= 0) continue;
          const a = (b.i / 13) * TAU + spin - Math.PI / 2;
          const rr = R * (1 + 1.8 * (1 - k) * (1 - k)) + R * 2.6 * sh2 * sh2;
          const rot = a + (1 - k) * Math.PI * 1.2 * (b.i % 2 ? 1 : -1) + sh2 * (b.i % 2 ? 2 : -2);
          g.save();
          g.globalAlpha = k * (1 - sh2);
          g.translate(C[0] + Math.cos(a) * rr, C[1] + Math.sin(a) * rr);
          g.rotate(rot);
          drawBlade(g, R * 0.58 * b.len, R * 0.05 * b.wide, b.kind, !lowQ);
          g.restore();
        }
        g.globalCompositeOperation = "source-over";
      }
      // คริสตัลกลางวง
      const ca = easeOut(span(u, T.crystal, T.crystal + 0.08)) * (1 - span(u, T.shatter + 0.02, T.out));
      if (ca > 0) {
        g.save();
        g.translate(C[0], C[1] + Math.sin(t * 1.4) * 4);
        const sc = 0.7 + 0.3 * ca + 0.25 * sh2;
        g.scale(sc, sc);
        drawCrystal(g, R * 0.36, t, ca);
        g.restore();
      }
      // แฟลชตอนแตก
      const fl = span(u, T.shatter, T.flash) * (1 - span(u, T.flash, T.out + 0.02));
      if (fl > 0) {
        const fg = g.createRadialGradient(C[0], C[1], 0, C[0], C[1], Math.max(w, h) * 0.75);
        fg.addColorStop(0, `rgba(240,250,255,${fl.toFixed(3)})`);
        fg.addColorStop(0.35, `rgba(140,205,255,${(fl * 0.75).toFixed(3)})`);
        fg.addColorStop(1, `rgba(20,50,140,${(fl * 0.4).toFixed(3)})`);
        g.fillStyle = fg;
        g.fillRect(0, 0, w, h);
      }
    };
    raf = requestAnimationFrame(frame);

    const sfx = setTimeout(() => { try { eosAudio().sfx("royal_arms", { gain: 0.9 }); } catch { /* ไม่มีเสียง */ } }, Math.round(T.arms * D));
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(sfx);
      window.removeEventListener("resize", resize);
    };
  }, [D, lowQ]);

  const ms = (k) => `${Math.round(k * D)}ms`;
  const style = {
    "--D": `${D}ms`,
    "--title-at": ms(T.title), "--title-dur": ms(T.out - T.title),
    "--out-at": ms(T.out), "--out-dur": ms(1 - T.out),
  };
  return (
    <div className="eoc" style={style} aria-hidden="true">
      <canvas ref={cvRef} className="eoc-cv" />
      <i className="eoc-flash" />
      <i className="eoc-bar top" />
      <i className="eoc-bar bot" />
      <div className="eoc-title">
        <span className="eoc-star">✦</span>
        <span className="eoc-line"><i /><b>EOS</b><i /></span>
      </div>
    </div>
  );
}
