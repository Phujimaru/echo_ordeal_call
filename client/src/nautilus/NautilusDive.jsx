// ============================================================
//  ฉากดำน้ำของโหมด Nautilus (GRID_PLAN §8.9 "ฉากเข้าด่าน" / "ฉากเปลี่ยนชั้น") — แทนฉากที่ยืมจาก Fodlan
//   mode "start"  : ผิวทะเล (แสงแดด คลื่น) → เรือ Nautilus ดำลง ฟองพรู → ตัวเลขความลึก 0 → −30 ม. → ไฟเรือติด → โซนาร์กวาดเผยกระดาน
//   mode "advance": ไซเรนดำน้ำ + ลมระบายถังถ่วง → เรือดิ่งผ่านมวลน้ำที่มืดลงเรื่อยๆ ตัวเรือลั่น · เงาสัตว์ทะเลผ่าน (ชั้น 2+ เงาทาลัสซา)
//                   → ตัวเลขความลึกหมุนถึงชั้นใหม่ + ชื่อชั้น → โซนาร์กวาดเผยกระดานใหม่
//  แคนวาสเต็มจอทับเกม · onDone เมื่อครบ durationMs · ภาพเรือ/ปลาวาฬ = ไฟล์ผู้ใช้ (/nautilus/*.webp) · เสียง /nautilus/sfx/cine_*.mp3 (nautilus-sfx-cine.sh)
//  ไม่มีข้อความอธิบาย — มีแค่ชื่อชั้นกับตัวเลขความลึก
// ============================================================
import { useEffect, useRef } from "react";
import { nautilusLayer } from "./nautilusMeta";
import { playSfx, registerSounds } from "../audio";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const span = (u, a, b) => clamp((u - a) / (b - a), 0, 1);
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

let SND = false;
function snd(k, gain = 1) {
  if (!SND) { SND = true; registerSounds(Object.fromEntries(["cine_klaxon", "cine_creak", "cine_hiss", "cine_riser", "cine_woosh", "cine_sonar", "cine_impact", "cine_engine", "bubbles", "splash", "waves", "moo", "blue"].map((n) => [`ntc_${n}`, `/nautilus/sfx/${n}.mp3`]))); }
  playSfx(`ntc_${k}`, { gain });
}
const IMGS = {};
function img(name) {
  if (!IMGS[name] && typeof Image !== "undefined") { const i = new Image(); i.src = `/nautilus/${name}.webp`; IMGS[name] = i; }
  return IMGS[name] && IMGS[name].complete && IMGS[name].naturalWidth ? IMGS[name] : null;
}
// สีมวลน้ำตามความลึก (ม.) — ผิวฟ้าใส → ร่องลึกดำสนิท
function waterCol(depth) {
  const stops = [[0, [40, 150, 175]], [30, [16, 92, 112]], [200, [8, 50, 70]], [1000, [10, 26, 38]], [3000, [5, 14, 28]], [10000, [1, 3, 8]]];
  const d = Math.abs(depth);
  for (let i = 1; i < stops.length; i++) if (d <= stops[i][0]) { const [d0, c0] = stops[i - 1], [d1, c1] = stops[i], k = (d - d0) / (d1 - d0); return c0.map((v, j) => Math.round(lerp(v, c1[j], k))); }
  return stops[stops.length - 1][1];
}
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export default function NautilusDive({ mode = "advance", from = 7, to = 8, durationMs = 9000, whale = true, lowQ = false, onDone }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return undefined;
    const g = cv.getContext("2d");
    const D = Math.max(3000, durationMs), t0 = performance.now();
    const fromD = mode === "start" ? 0 : nautilusLayer(from).depth, toL = nautilusLayer(to), toD = toL.depth;
    let raf = 0, done = false, tintCv = null;
    const cues = mode === "start"
      ? [[0, () => { snd("waves", 0.8); snd("cine_engine", 0.7); }], [0.12, () => { snd("cine_hiss", 0.9); snd("splash", 0.8); snd("bubbles", 1); }], [0.3, () => snd("cine_riser", 0.6)], [0.78, () => snd("cine_sonar", 1)]]
      : [[0, () => { snd("cine_klaxon", 1); snd("cine_engine", 0.7); }], [0.1, () => { snd("cine_hiss", 1); snd("bubbles", 0.9); }], [0.25, () => snd("cine_creak", 0.9)], [0.35, () => snd("cine_riser", 0.7)],
        ...(whale && toL.id >= 8 ? [[0.5, () => snd(Math.random() < 0.5 ? "moo" : "blue", 0.7)]] : []), [0.8, () => snd("cine_sonar", 1)]];
    const fired = new Set();
    const resize = () => { const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px"; };
    resize(); window.addEventListener("resize", resize);
    const finish = () => { if (done) return; done = true; cancelAnimationFrame(raf); onDone && onDone(); };
    const frame = (now) => {
      const u = clamp((now - t0) / D, 0, 1), W = cv.width, H = cv.height, t = (now - t0) / 1000, S = Math.min(W, H) / 720;
      cues.forEach(([at, fn], i) => { if (u >= at && !fired.has(i)) { fired.add(i); try { fn(); } catch { /* ไม่มีเสียง */ } } });
      // ความลึกตอนนี้ (กลางฉากหมุนเร็ว ท้ายฉากช้าลง)
      const dk = mode === "start" ? ease(span(u, 0.15, 0.85)) : ease(span(u, 0.12, 0.82));
      const depth = lerp(fromD, toD, dk);
      // มวลน้ำ: บนสว่างกว่าล่างเล็กน้อย
      const c = waterCol(depth), c2 = waterCol(depth - 80 - Math.abs(depth) * 0.3);
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, rgb(c)); gr.addColorStop(1, rgb(c2));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      // ผิวน้ำ (ฉากเข้า): เส้นคลื่นเลื่อนขึ้นพ้นจอเมื่อดำลง
      if (mode === "start") {
        const sy = H * (0.38 - span(u, 0.1, 0.4) * 0.9);
        if (sy > -H * 0.2) {
          g.fillStyle = "rgba(170,225,240,1)"; g.fillRect(0, 0, W, Math.max(0, sy));
          g.fillStyle = "rgba(230,250,255,.9)"; g.beginPath(); g.moveTo(0, sy);
          for (let x = 0; x <= W; x += 12 * S) g.lineTo(x, sy + Math.sin(x / (40 * S) + t * 2) * 6 * S + Math.sin(x / (17 * S) - t * 3) * 3 * S);
          g.lineTo(W, sy + 30 * S); g.lineTo(0, sy + 30 * S); g.closePath(); g.fill();
        }
      }
      // ลำแสงจากผิว (จางลงตามความลึก)
      const light = clamp(1 - Math.abs(depth) / 400, 0, 1);
      if (light > 0.02) {
        g.save(); g.globalCompositeOperation = "lighter";
        for (let i = 0; i < 7; i++) { const x = W * (0.08 + i * 0.14) + Math.sin(t * 0.3 + i) * W * 0.03, w = W * 0.04; const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, `rgba(190,245,250,${0.14 * light})`); lg.addColorStop(1, "rgba(190,245,250,0)"); g.fillStyle = lg; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w + W * 0.15, H); g.lineTo(x + W * 0.12, H); g.closePath(); g.fill(); }
        g.restore();
      }
      // ตะกอน/แพลงก์ตอนพุ่งขึ้น (ความรู้สึกดิ่ง) — เร็วสุดกลางฉาก
      const speed = Math.sin(dk * Math.PI) * 1.4 + 0.2;
      for (let i = 0; i < (lowQ ? 70 : 160); i++) {
        const x = hash(i, 1) * W, y = ((hash(i, 2) * H - t * H * 0.25 * speed * (0.5 + hash(i, 3))) % H + H) % H, len = 4 + speed * 16 * hash(i, 4);
        const glowP = Math.abs(depth) > 900 && hash(i, 5) > 0.85;
        g.strokeStyle = glowP ? `rgba(120,240,255,${0.7})` : `rgba(210,235,235,${0.25 + 0.2 * hash(i, 6)})`; g.lineWidth = (glowP ? 2 : 1.2) * S;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + len * S); g.stroke();
      }
      // เงาสัตว์ทะเลไกล: ฝูงปลา (ตื้น) · ทาลัสซาว่ายผ่านในความมืด (ชั้น 2 ขึ้นไป · เปิดในโหวต)
      if (Math.abs(depth) < 500) { g.fillStyle = rgb(waterCol(depth + 300), 0.55); for (let i = 0; i < 40; i++) { const x = ((hash(i, 7) * W * 1.4 + t * 60 * S) % (W * 1.4)) - W * 0.2, y = H * 0.25 + hash(i, 8) * H * 0.25 + Math.sin(t + i) * 8 * S; g.beginPath(); g.ellipse(x, y, 7 * S, 2.5 * S, 0, 0, TAU); g.fill(); } }
      const ws = img("whale_side");
      if (mode === "advance" && whale && toL.id >= 8 && ws) {
        const k = span(u, 0.38, 0.78);
        if (k > 0 && k < 1) { const w = W * 1.6, h = w * ws.height / ws.width, x = lerp(W * 1.2, -W * 1.4, k), y = H * 0.62; g.save(); g.globalAlpha = Math.sin(k * Math.PI) * 0.55; g.filter = "brightness(0) blur(6px)"; g.translate(x + w / 2, y); g.scale(-1, 1); g.drawImage(ws, -w / 2, -h / 2, w, h); g.restore(); } // ว่ายขวา → ซ้าย = กลับภาพให้หัว (ขวาของภาพ) หันซ้ายไปทางที่ว่าย (ผู้ใช้ทักว่ายถอยหลัง)
      }
      // เรือ Nautilus ดำลงเฉียง หัวเรือก้มลง โคมหน้าเรือส่องทาง
      const ship = img("nautilus_side");
      if (ship) {
        const bob = Math.sin(t * 1.4) * 6 * S, sw = W * 0.62, sh = sw * ship.height / ship.width;
        const sx = W * 0.5 + Math.sin(t * 0.4) * 10 * S, sy = H * (mode === "start" ? lerp(0.28, 0.5, span(u, 0.05, 0.4)) : 0.48) + bob;
        const tilt = mode === "start" ? lerp(0, -0.12, span(u, 0.08, 0.3)) * (1 - span(u, 0.7, 0.9)) : -0.1 * (1 - span(u, 0.72, 0.9));
        g.save(); g.translate(sx, sy); g.rotate(tilt); // หัวเรือ (ซ้ายของภาพ) ก้มลง (มุมลบ = ทวนเข็ม = ด้านซ้ายลดต่ำ)
        const lamp = clamp(mode === "start" ? span(u, 0.42, 0.5) : 1, 0, 1);
        if (lamp > 0) { // ลำแสงโคมหน้าเรือ
          const lx = -sw * 0.01, ly = -sh * 0.21;
          const lg = g.createLinearGradient(lx, ly, lx - sw * 0.9, ly + sh * 1.6); lg.addColorStop(0, `rgba(255,245,210,${0.45 * lamp})`); lg.addColorStop(1, "rgba(255,245,210,0)");
          g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = lg; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx - sw * 0.95, ly + sh * 0.6); g.lineTo(lx - sw * 0.6, ly + sh * 2.2); g.closePath(); g.fill(); g.restore();
        }
        // ย้อมสีตามความลึก (เรือมืดลงตามน้ำ) — ย้อมบนแคนวาสแยกเฉพาะเนื้อภาพเรือ แล้วค่อยวาง
        //  (เดิม source-atop บนจอหลักย้อมพื้นหลังทั้งสี่เหลี่ยมด้วย = เห็นกล่องเหลี่ยมรอบเรือ — ผู้ใช้ทัก 2026-11-19)
        if (!tintCv) tintCv = document.createElement("canvas");
        if (tintCv.width !== ship.naturalWidth) { tintCv.width = ship.naturalWidth; tintCv.height = ship.naturalHeight; }
        const tg = tintCv.getContext("2d");
        tg.globalCompositeOperation = "source-over"; tg.clearRect(0, 0, tintCv.width, tintCv.height); tg.drawImage(ship, 0, 0);
        tg.globalCompositeOperation = "source-atop"; tg.fillStyle = rgb(c2, clamp(Math.abs(depth) / 6000, 0.12, 0.55)); tg.fillRect(0, 0, tintCv.width, tintCv.height);
        g.drawImage(tintCv, -sw / 2, -sh / 2, sw, sh);
        // หน้าต่างเรืองแสง
        for (let i = 0; i < 9; i++) { const px = -sw / 2 + sw * (0.47 + i * 0.05), py = -sh / 2 + sh * 0.53, a = (0.5 + 0.5 * Math.sin(t * 3 + i)) * (mode === "start" ? lamp : 1); const rg = g.createRadialGradient(px, py, 0, px, py, sh * 0.12); rg.addColorStop(0, `rgba(255,214,140,${0.6 * a})`); rg.addColorStop(1, "rgba(255,214,140,0)"); g.fillStyle = rg; g.beginPath(); g.arc(px, py, sh * 0.12, 0, TAU); g.fill(); }
        // ฟองจากท้ายเรือ + ฟองระบายถังถ่วงตอนเริ่มดำ
        const vent = mode === "start" ? span(u, 0.1, 0.25) * (1 - span(u, 0.3, 0.45)) : span(u, 0.08, 0.15) * (1 - span(u, 0.25, 0.4));
        for (let i = 0; i < 30; i++) { const k = (t * 0.9 + i / 30) % 1, bx = sw * 0.45 + k * sw * 0.15 + Math.sin(i * 2.3 + t * 3) * 8 * S, by = sh * 0.2 - k * H * 0.5; g.strokeStyle = `rgba(220,250,255,${0.6 * (1 - k)})`; g.lineWidth = 1.2 * S; g.beginPath(); g.arc(bx, by, (2 + (i % 4)) * S, 0, TAU); g.stroke(); }
        if (vent > 0) for (let i = 0; i < 60; i++) { const k = (t * 1.6 + i / 60) % 1, bx = -sw * 0.3 + hash(i, 9) * sw * 0.6, by = -sh * 0.4 - k * H * 0.6; g.strokeStyle = `rgba(230,250,255,${0.7 * vent * (1 - k)})`; g.lineWidth = 1.2 * S; g.beginPath(); g.arc(bx, by, (2 + (i % 5)) * S, 0, TAU); g.stroke(); }
        g.restore();
      }
      // ขอบจอมืด (ลึก = หนาขึ้น)
      const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(0,0,0,${clamp(0.35 + Math.abs(depth) / 8000, 0.35, 0.85)})`); g.fillStyle = vg; g.fillRect(0, 0, W, H);
      // ตัวเลขความลึก (มุมขวาบน) + ชื่อชั้นตอนถึง
      g.save(); g.textAlign = "right"; g.textBaseline = "top"; g.fillStyle = "rgba(200,250,255,.92)"; g.shadowColor = "rgba(80,220,255,.8)"; g.shadowBlur = 16 * S;
      g.font = `700 ${Math.round(52 * S)}px "Chakra Petch","Kanit",sans-serif`; g.fillText(`${depth < -0.5 ? "−" : ""}${Math.round(Math.abs(depth)).toLocaleString("en-US")} ม.`, W - 40 * S, 36 * S);
      g.restore();
      const nk = span(u, 0.78, 0.86) * (1 - span(u, 0.96, 1));
      if (nk > 0) {
        g.save(); g.globalAlpha = nk; g.textAlign = "center"; g.fillStyle = "#e8fbff"; g.shadowColor = toL.glow || "#9ff"; g.shadowBlur = 24 * S;
        g.font = `700 ${Math.round(64 * S)}px "Kanit","Chakra Petch",sans-serif`; g.fillText(toL.name, W / 2, H * 0.78);
        g.font = `600 ${Math.round(20 * S)}px "Kanit","Chakra Petch",sans-serif`; g.fillStyle = "rgba(200,240,255,.8)"; g.fillText(`${toL.latin} · ลึก ${Math.abs(toL.depth).toLocaleString("en-US")} เมตร`, W / 2, H * 0.78 + 46 * S);
        g.restore();
      }
      // โซนาร์กวาด → จางเผยกระดาน
      const sk = span(u, 0.8, 1);
      if (sk > 0) {
        g.save(); g.globalCompositeOperation = "lighter";
        for (let i = 0; i < 3; i++) { const r = (sk * 1.4 - i * 0.18) * Math.hypot(W, H) * 0.6; if (r <= 0) continue; g.strokeStyle = `rgba(120,240,255,${0.5 * (1 - sk)})`; g.lineWidth = 3 * S; g.beginPath(); g.arc(W / 2, H / 2, r, 0, TAU); g.stroke(); }
        g.restore();
      }
      cv.style.opacity = String(1 - span(u, 0.9, 1));
      if (u >= 1) { finish(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { done = true; cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [mode, from, to, durationMs, whale, lowQ, onDone]);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none" }} />;
}
