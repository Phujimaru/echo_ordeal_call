// ============================================================
//  ฉากร่ายท่าไม้ตายเคท "ระบำเขม่า" (ม่านแดง) — เต็มจอทับกระดาน ~4 วิ (server พักตาเดินให้ฉากเล่น)
//  <KateStorm lowQ socket? onCinema? />  · วางครั้งเดียวในหน้ากระดาน (BoardStage) — ฟัง socket "shadowFx" kind "storm"
//   socket   ไม่ส่ง = ไม่ฟัง socket (หน้าดูตัวอย่างเรียก castStorm() จาก board/sootStorm.js เอง)
//   onCinema setState ของกล้องฉากตี (BoardCanvas prop cinema) — ซูมเข้าพื้นที่ 8×8 ตอนม่านเปิด แล้วคืนกล้อง
//   warm     true = มีเคทในแมตช์ → โหลดเพลง kate_storm (intro + loop) รอไว้
//  ลำดับ (STORM_T ใน sootStorm.js): จอมืด → ม่านโรงละครแดงปิดจากสองข้าง (เขม่าหมุนวนเข้ากลาง) → ไฟสปอตไลต์ เงาเคทลอยขึ้น
//   → เคทแตกเป็นนักเต้นเขม่า (ริบบอนหมุนรอบ) + แถบภาพสกิลฟาดผ่านกลางจอ + ชื่อท่า → ม่านกระชากเปิด เขม่าระเบิดออก จอสั่น
//   → กระดาน: ม่านแดงกลืนพื้นที่ 8×8 จากช่องกลาง (sootStorm.js) · ภาพจางเผยกระดาน
//  เวลาในฉากคิดจากนาฬิกาอย่างเดียว (เข้ากลางฉาก = เล่นต่อจากจุดนั้น) · ทุกค่าที่ขยับตั้งจาก JS ทุกเฟรม (transform/opacity)
//  lowQ = อนุภาคน้อยลง ไม่สั่น ไม่ซูมกล้อง · ลดการเคลื่อนไหว = ไม่มีอนุภาค/สั่น ม่าน/ภาพค่อยๆ ปรากฏแทนการเลื่อน
// ============================================================
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { playSfx, prewarmMusic } from "../../audio";
import { castStorm, onStormCast, STORM_T } from "../../board/sootStorm";
import "./kateStorm.css";

const KATE_ART = "/characters/kate_emiliko/kate.webp";
const STORM_ART = "/characters/kate_emiliko/storm.avif";
const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const span = (t, a, b) => clamp01((t - a) / (b - a));
const eOut = (t) => 1 - Math.pow(1 - t, 3);
const eIn = (t) => t * t * t;
const eBack = (t) => { const c = 0.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function rng(seed) {
  let s = Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0; s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35) >>> 0; s = (s ^ (s >>> 16)) >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
// เขม่าไหลวนเข้ากลาง (ช่วงม่านปิด) · ระเบิดออก (ม่านเปิด) · นักเต้นเขม่า (ริบบอน)
const INFLOW = Array.from({ length: 130 }, (_, i) => { const R = rng(i + 11); return { a: R() * TAU, r: 0.55 + 0.6 * R(), d: R() * 1250, L: 850 + 750 * R(), s: 0.5 + R(), ember: R() < 0.16 }; });
const BURST = Array.from({ length: 210 }, (_, i) => { const R = rng(i + 401); return { a: R() * TAU, v: 0.25 + 0.85 * R(), L: 750 + 850 * R(), s: 0.5 + R(), ember: R() < 0.22, d: R() * 140, spin: (R() - 0.5) * 1.6 }; });
const DANCERS = Array.from({ length: 5 }, (_, m) => { const R = rng(m + 77); return { ph: m * TAU / 5 + R() * 0.4, w: 0.85 + 0.25 * R(), rad: 0.78 + 0.22 * R(), bob: 0.5 + R() * 0.6, dir: m % 2 ? -1 : 1 }; });

let puff = null;
function puffSprite() {
  if (puff) return puff;
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(8,1,4,0.95)"); gr.addColorStop(0.45, "rgba(16,2,6,0.62)"); gr.addColorStop(0.78, "rgba(60,4,14,0.2)"); gr.addColorStop(1, "rgba(60,4,14,0)");
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  puff = c;
  return puff;
}

// วาดเขม่าทั้งหมดของเฟรม t (CSS px · กลางจอ = เคท)
function drawSoot(g, W, H, t, lowQ) {
  const spr = puffSprite(), cx = W / 2, cy = H * 0.52, k = Math.min(W, H) / 900, diag = Math.hypot(W, H) / 2;
  const every = lowQ ? 3 : 1;
  // 1) เขม่าไหลวนเข้ากลาง
  const inEnv = 1 - span(t, STORM_T.reveal - 120, STORM_T.reveal + 40);
  if (inEnv > 0) {
    for (let i = 0; i < INFLOW.length; i += every) {
      const q = INFLOW[i], u = (t - q.d) / q.L;
      if (u <= 0 || u >= 1) continue;
      const r = q.r * diag * Math.pow(1 - u, 1.35) + 26 * k, an = q.a + 4.4 * Math.pow(u, 1.2);
      const x = cx + Math.cos(an) * r, y = cy + Math.sin(an) * r * 0.62, al = Math.sin(Math.PI * u) * inEnv;
      if (q.ember) {
        g.globalCompositeOperation = "lighter"; g.globalAlpha = al * 0.9; g.fillStyle = "#ff3b3b";
        g.beginPath(); g.arc(x, y, (1.6 + q.s * 1.6) * k, 0, TAU); g.fill(); g.globalCompositeOperation = "source-over";
      } else {
        const s = (22 + 34 * q.s) * k * (1.25 - 0.6 * u);
        g.globalAlpha = al * 0.8; g.drawImage(spr, x - s, y - s, s * 2, s * 2);
      }
    }
  }
  // 2) นักเต้นเขม่า — แตกออกจากตัวเคท หมุนวนรอบ แล้วถูกดูดกลับตอนม่านเปิด
  const [d0, d1] = STORM_T.dancers;
  const env = span(t, d0 + 400, d0 + 650) * (1 - span(t, d1 - 200, d1));
  if (env > 0) {
    const grow = eOut(span(t, d0 + 400, d0 + 800)), K = lowQ ? 12 : 24, R0 = Math.min(W * 0.36, H * 0.62) * grow;
    for (let m = 0; m < DANCERS.length; m += lowQ ? 2 : 1) {
      const dn = DANCERS[m], pts = [];
      for (let j = 0; j <= K; j++) {
        const tau = (t - j * 18) / 1000, th = dn.ph + tau * TAU * 0.9 * dn.w * dn.dir;
        const rad = R0 * dn.rad * (0.78 + 0.22 * Math.sin(th * 2.5 + m));
        pts.push([cx + Math.cos(th) * rad, cy + Math.sin(th) * rad * 0.42 - R0 * 0.16 * dn.bob * Math.sin(th * 1.5 + m)]);
      }
      g.lineCap = "round";
      for (let j = K; j >= 1; j--) {
        const f = 1 - j / K, w = (4 + 30 * Math.pow(f, 0.8)) * k;
        g.globalAlpha = env * (0.25 + 0.7 * f);
        g.strokeStyle = "#070105"; g.lineWidth = w;
        g.beginPath(); g.moveTo(pts[j][0], pts[j][1]); g.lineTo(pts[j - 1][0], pts[j - 1][1]); g.stroke();
        if (!lowQ && j % 2 === 0) { g.strokeStyle = "rgba(214,28,52,0.85)"; g.lineWidth = w * 0.18; g.stroke(); }
      }
      // หัว: ก้อนเขม่า + ตาแดงสองดวง
      const [hx, hy] = pts[0], hs = 30 * k;
      g.globalAlpha = env; g.drawImage(spr, hx - hs, hy - hs, hs * 2, hs * 2);
      g.globalCompositeOperation = "lighter"; g.fillStyle = "#ff4646";
      g.beginPath(); g.arc(hx - 5 * k, hy - 2 * k, 2.4 * k, 0, TAU); g.arc(hx + 5 * k, hy - 2 * k, 2.4 * k, 0, TAU); g.fill();
      g.globalCompositeOperation = "source-over";
    }
  }
  // 3) ม่านเปิด: คลื่นกระแทก + เขม่าระเบิดออกทั้งจอ
  const tb = t - STORM_T.reveal;
  if (tb > 0) {
    const u = span(tb, 0, 650);
    if (u < 1) {
      const r = diag * 1.1 * eOut(u);
      g.globalAlpha = 1 - u; g.lineWidth = 34 * k * (1 - u); g.strokeStyle = "#0a0105";
      g.beginPath(); g.ellipse(cx, cy, r, r * 0.6, 0, 0, TAU); g.stroke();
      g.lineWidth = 9 * k * (1 - u); g.strokeStyle = "#ff2a44";
      g.beginPath(); g.ellipse(cx, cy, r * 0.97, r * 0.58, 0, 0, TAU); g.stroke();
    }
    for (let i = 0; i < BURST.length; i += every) {
      const q = BURST[i], v = clamp01((tb - q.d) / q.L);
      if (v <= 0 || v >= 1) continue;
      const r = q.v * diag * 1.15 * eOut(v), an = q.a + q.spin * v;
      const x = cx + Math.cos(an) * r, y = cy + Math.sin(an) * r * 0.66, al = Math.pow(1 - v, 1.5);
      if (q.ember) {
        g.globalCompositeOperation = "lighter"; g.globalAlpha = al; g.fillStyle = v < 0.4 ? "#ff7a4a" : "#ff2d3c";
        g.beginPath(); g.arc(x, y, (1.8 + 2.4 * q.s) * k, 0, TAU); g.fill(); g.globalCompositeOperation = "source-over";
      } else {
        const s = (20 + 36 * q.s) * k * (0.7 + 1.6 * v);
        g.globalAlpha = al * 0.85; g.drawImage(spr, x - s, y - s, s * 2, s * 2);
      }
    }
  }
  g.globalAlpha = 1;
}

function StormScene({ cast, lowQ, onDone }) {
  const rootRef = useRef(null);
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const T = STORM_T, still = REDUCED;
    // เสียงร่ายอยู่ใต้เพลงม่านแดง (intro ต้องเด่น — ผู้ใช้สั่ง)
    if (performance.now() - cast.t0 < 600) playSfx("ke_storm", { gain: 0.5 });
    const root = rootRef.current;
    if (!root) return undefined;
    const q = (c) => root.querySelector(c);
    const R = {
      stage: q(".ks-stage"), veil: q(".ks-veil"), curL: q(".ks-l"), curR: q(".ks-r"), val: q(".ks-valance"), spot: q(".ks-spot"),
      kate: q(".ks-kate"), band: q(".ks-band"), art: q(".ks-band img"), title: q(".ks-title"), flash: q(".ks-flash"),
    };
    const cv = q(".ks-soot"), g = cv && !still ? cv.getContext("2d") : null;
    const set = (el, tf, op) => { if (!el) return; if (tf != null) el.style.transform = tf; if (op != null) el.style.opacity = String(op); };
    let raf = 0;
    const apply = (t) => {
      // จอมืด
      set(R.veil, null, 0.84 * eOut(span(t, ...T.veil)) * (1 - 0.58 * span(t, T.reveal, T.open[1])) * (1 - span(t, T.open[1], T.end - 100)));
      // ม่านสองข้าง: ปิด (เด้งเลยกลางนิดๆ + ผ้าพลิ้ว) → กระชากเปิด
      const pc = span(t, ...T.close), po = 1 - Math.pow(1 - span(t, ...T.open), 2);
      if (still) {
        const o = span(t, T.close[0], T.close[0] + 450) * (1 - span(t, T.open[0], T.open[0] + 500));
        set(R.curL, "translateX(0)", o); set(R.curR, "translateX(0)", o);
        set(R.val, "translateY(0)", o);
      } else {
        const xc = -101 * (1 - eBack(pc)) - 106 * po, sway = Math.sin(t / 170) * (1 - pc) * 4 + po * 7;
        set(R.curL, `translateX(${xc}%) skewX(${sway}deg)`, 1);
        set(R.curR, `translateX(${-xc}%) skewX(${-sway}deg)`, 1);
        set(R.val, `translateY(${-105 * (1 - eOut(span(t, ...T.valance))) - 110 * eIn(span(t, T.open[0] + 80, T.open[1] + 150))}%)`, 1);
      }
      // ไฟสปอตไลต์ (ติดกะพริบ) · เงาเคทลอยขึ้น → แตกเป็นเขม่า
      const spotOn = t < T.spot ? 0 : t < T.spot + 120 ? (Math.floor((t - T.spot) / 40) % 2 ? 0.35 : 1) : 1;
      set(R.spot, null, spotOn * (1 - span(t, T.band[1] - 150, T.reveal + 50)));
      const pr = eOut(span(t, ...T.rise)), pd = span(t, T.dancers[0] + 400, T.dancers[0] + 750);
      set(R.kate, still ? "translate(-50%, -50%)" : `translate(-50%, ${-50 + 34 * (1 - pr)}%) scale(${(0.9 + 0.1 * pr) * (1 + 0.18 * pd)})`, pr * (1 - pd));
      // แถบภาพสกิลฟาดผ่านกลางจอ + ชื่อท่า
      const bo = eOut(span(t, T.band[0], T.band[0] + 220)), bc = eIn(span(t, T.band[1] - 140, T.band[1]));
      const bk = still ? 1 : bo * (1 - bc), bop = still ? span(t, T.band[0], T.band[0] + 300) * (1 - span(t, T.band[1] - 200, T.band[1])) : bk > 0 ? 1 : 0;
      set(R.band, `translateY(-50%) rotate(-5deg) scaleY(${Math.max(0.001, bk)})`, bop);
      const pb = span(t, ...T.band);
      set(R.art, still ? "rotate(5deg) scale(1.2)" : `rotate(5deg) translateX(${-2 + 4 * pb}%) scale(${1.32 - 0.12 * pb})`, null);
      const pt = span(t, T.title[0], T.title[0] + 160), out = span(t, T.title[1] - 90, T.title[1]);
      set(R.title, still ? "translate(-50%, -50%) rotate(-5deg)" : `translate(-50%, -50%) rotate(-5deg) scale(${1.6 - 0.6 * eOut(pt) + 0.08 * out})`, pt * (1 - out));
      // แฟลช: ม่านกระแทกกัน · ม่านเปิด
      const fl = (t >= T.spot ? 0.18 * (1 - span(t, T.spot, T.spot + 220)) : 0) + (t >= T.reveal ? 0.55 * (1 - span(t, T.reveal, T.reveal + 320)) : 0);
      set(R.flash, null, still ? 0 : fl);
      // จอสั่น
      if (!still && !lowQ) {
        const a1 = t >= T.spot ? 9 * Math.pow(1 - span(t, T.spot, T.spot + 360), 2) : 0;
        const a2 = t >= T.reveal ? 15 * Math.pow(1 - span(t, T.reveal, T.reveal + 520), 2) : 0, a = a1 + a2;
        set(R.stage, a > 0.05 ? `translate(${Math.sin(t / 13) * a}px, ${Math.cos(t / 17) * a * 0.6}px)` : "none", null);
      }
      // เขม่า (แคนวาส)
      if (g) {
        const dpr = Math.min(lowQ ? 1 : 1.5, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
        const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
        if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, pw, ph);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawSoot(g, W, H, t, lowQ);
      }
    };
    const frame = () => {
      const t = performance.now() - cast.t0;
      if (t >= STORM_T.end) { doneRef.current(); return; }
      apply(t);
      raf = requestAnimationFrame(frame);
    };
    apply(Math.max(0, performance.now() - cast.t0));
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [cast]); // eslint-disable-line react-hooks/exhaustive-deps -- refs คงที่ · เล่นครั้งเดียวต่อการร่าย

  return (
    <div className="ks" ref={rootRef} data-lowq={lowQ ? "true" : "false"} aria-hidden="true">
      <div className="ks-veil" />
      <div className="ks-stage">
        <div className="ks-curtain ks-l" />
        <div className="ks-curtain ks-r" />
        <div className="ks-spot" />
        <img className="ks-kate" src={KATE_ART} alt="" draggable="false" />
        <div className="ks-band"><img src={STORM_ART} alt="" draggable="false" /></div>
        <canvas className="ks-soot" />
        <div className="ks-title">ระบำเขม่า</div>
        <div className="ks-valance" />
      </div>
      <div className="ks-flash" />
    </div>
  );
}

export default function KateStorm({ lowQ = false, socket = null, onCinema = null, warm = false }) {
  const [cast, setCast] = useState(null);
  // มีเคทในแมตช์ = โหลดเพลงม่านแดงรอไว้ (เริ่มดังทันทีตอนร่าย)
  useEffect(() => { if (warm) prewarmMusic("kate_storm"); }, [warm]);
  useEffect(() => onStormCast(setCast), []);
  useEffect(() => {
    if (!socket) return undefined;
    const on = (p) => { if (p && p.kind === "storm") castStorm(p); };
    socket.on("shadowFx", on);
    return () => socket.off("shadowFx", on);
  }, [socket]);
  // กล้องกระดาน: ซูมเข้าพื้นที่ตอนม่านเปิด → คืนกล้องหลังฉากจบ (ไม่ทับกล้องฉากตีที่ตั้งทีหลัง)
  useEffect(() => {
    if (!cast || typeof onCinema !== "function" || lowQ || REDUCED) return undefined;
    const mine = { a: { x: cast.x0, y: cast.y0 }, b: { x: cast.x1, y: cast.y1 }, z: 1.3 };
    const since = performance.now() - cast.t0;
    const release = () => onCinema((c) => (c === mine ? null : c));
    const t1 = setTimeout(() => onCinema(mine), Math.max(0, STORM_T.reveal - 150 - since));
    const t2 = setTimeout(release, Math.max(0, STORM_T.end + 300 - since));
    return () => { clearTimeout(t1); clearTimeout(t2); release(); };
  }, [cast, onCinema, lowQ]);
  if (!cast || typeof document === "undefined") return null;
  return createPortal(<StormScene key={cast.t0} cast={cast} lowQ={lowQ} onDone={() => setCast((c) => (c === cast ? null : c))} />, document.body);
}
