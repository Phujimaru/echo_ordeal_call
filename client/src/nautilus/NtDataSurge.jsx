// ============================================================
//  ฉากกลายร่างชั้น 5 → ชั้น 6 ทะเลข้อมูลจินตภาพ (ผู้ใช้ 2026-11-19: "จะมีอะไรบางพุ่งขึ้นมาเป็นออร่าจากร่องลึก แล้วกลืนกินทั้งสนาม เป็นข้อมูล")
//   0.00–0.18 ห้วงเหวมืด ร่องลึกผ่ากลางจอ · พื้นสั่น
//   0.18–0.40 รอยร่องเรืองฟ้า เส้นแสงพุ่งขึ้นทีละเส้น · กล้องสั่นแรงขึ้น
//   0.40–0.58 ออร่ามหึมาพุ่งขึ้นจากร่องเป็นเสาแสงฟ้าขาว
//   0.58–0.82 คลื่นออร่าแผ่ออกกลืนทั้งสนาม — ด้านหลังหน้าคลื่น ทุกอย่างแตกเป็นลูกบาศก์ข้อมูลลอยขึ้น เหลือตารางเรือง
//   0.82–1.00 ทะเลข้อมูลฟ้าสว่าง ตารางลู่ขอบฟ้า + ชื่อชั้น/ความลึก −∞ แล้วจาง
//  แคนวาสเต็มจอ (App.jsx เลือกแทน NautilusDive เมื่อ to = 12) · onDone เมื่อครบ durationMs · ไม่มีข้อความอธิบาย — ชื่อชั้นกับความลึกเท่านั้น
// ============================================================
import { useEffect, useRef } from "react";
import { nautilusLayer } from "./nautilusMeta";
import { playSfx, registerSounds } from "../audio";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const span = (u, a, b) => clamp((u - a) / (b - a), 0, 1);
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };

let SND = false;
function snd(k, gain = 1) {
  if (!SND) { SND = true; registerSounds(Object.fromEntries(["rumble", "cine_riser", "deepimpact", "zap", "cine_sonar", "whoosh", "cine_woosh", "boom"].map((n) => [`ntd_${n}`, `/nautilus/sfx/${n}.mp3`]))); }
  playSfx(`ntd_${k}`, { gain: gain * 1.6 });
}

export default function NtDataSurge({ to = 12, durationMs = 9000, lowQ = false, onDone }) {
  const ref = useRef(null);
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);
  useEffect(() => {
    const cv = ref.current; if (!cv) return undefined;
    const g = cv.getContext("2d");
    const D = Math.max(4000, durationMs), t0 = performance.now(), L = nautilusLayer(to);
    const cues = [[0, () => snd("rumble", 0.9)], [0.18, () => snd("cine_riser", 0.9)], [0.4, () => { snd("deepimpact", 1); snd("boom", 0.7); }], [0.45, () => snd("cine_woosh", 0.8)],
      [0.6, () => { snd("whoosh", 0.9); snd("zap", 0.6); }], [0.84, () => snd("cine_sonar", 0.9)]];
    const fired = new Set();
    let raf = 0, done = false;
    const resize = () => { const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px"; };
    resize(); window.addEventListener("resize", resize);
    const finish = () => { if (done) return; done = true; cancelAnimationFrame(raf); doneRef.current && doneRef.current(); };
    const N = lowQ ? 90 : 220; // ลูกบาศก์ข้อมูล
    const frame = (now) => {
      const u = clamp((now - t0) / D, 0, 1), W = cv.width, H = cv.height, t = (now - t0) / 1000, S = Math.min(W, H) / 720;
      for (const [i, [at, fn]] of cues.entries()) if (u >= at && !fired.has(i)) { fired.add(i); try { fn(); } catch { /* เสียงเล่นไม่ได้ไม่เป็นไร */ } }
      const cx = W / 2, ty = H * 0.62; // แนวร่องลึก
      const shake = (span(u, 0.1, 0.4) * 6 + span(u, 0.4, 0.45) * 14 * (1 - span(u, 0.45, 0.7))) * S;
      g.setTransform(1, 0, 0, 1, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      // --- พื้นหลังห้วงเหว (มืด) ---
      g.fillStyle = "#010309"; g.fillRect(-20, -20, W + 40, H + 40);
      const front = ease(span(u, 0.58, 0.82)); // รัศมีคลื่นออร่า 0..1 (ครอบทั้งจอ)
      const R = Math.hypot(W, H) * front;
      // ห้วงเหว: ขอบร่องสองฝั่ง + ผาไกล
      g.fillStyle = "#070b18";
      g.beginPath(); g.moveTo(0, ty - 30 * S); for (let i = 0; i <= 30; i++) g.lineTo((i / 30) * W, ty - 22 * S - hash(i, 1) * 26 * S); g.lineTo(W, 0); g.lineTo(0, 0); g.closePath(); g.fill();
      g.fillStyle = "#04060f";
      g.beginPath(); g.moveTo(0, ty + 26 * S); for (let i = 0; i <= 30; i++) g.lineTo((i / 30) * W, ty + 18 * S + hash(i, 2) * 30 * S); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
      // ร่องเรือง
      const glowK = span(u, 0.12, 0.42);
      if (glowK > 0) {
        g.save(); g.globalCompositeOperation = "lighter";
        const lg = g.createLinearGradient(0, ty - 30 * S, 0, ty + 30 * S); lg.addColorStop(0, "rgba(120,240,255,0)"); lg.addColorStop(0.5, `rgba(150,245,255,${0.9 * glowK})`); lg.addColorStop(1, "rgba(120,240,255,0)");
        g.fillStyle = lg; g.fillRect(0, ty - 30 * S, W, 60 * S);
        // เส้นแสงพุ่งขึ้นทีละเส้น
        for (let i = 0; i < 24; i++) {
          const st = 0.18 + hash(i, 4) * 0.22; if (u < st) continue;
          const k = (u - st) / 0.12, x = W * (0.05 + hash(i, 5) * 0.9), top = ty - Math.min(1, k) * H * (0.3 + hash(i, 6) * 0.6);
          const a = clamp(1.4 - k * 0.6, 0, 1) * (1 - front);
          g.strokeStyle = `rgba(200,255,255,${a})`; g.lineWidth = (1 + hash(i, 7) * 3) * S; g.beginPath(); g.moveTo(x, ty); g.lineTo(x, top); g.stroke();
        }
        g.restore();
      }
      // เสาออร่ามหึมา
      const pil = span(u, 0.4, 0.5);
      if (pil > 0) {
        g.save(); g.globalCompositeOperation = "lighter";
        const w = W * (0.08 + pil * 0.22 + front * 0.6), top = ty - H * 1.2 * ease(pil);
        const pg = g.createLinearGradient(cx - w, 0, cx + w, 0); pg.addColorStop(0, "rgba(120,240,255,0)"); pg.addColorStop(0.35, "rgba(150,245,255,.55)"); pg.addColorStop(0.5, "rgba(255,255,255,.95)"); pg.addColorStop(0.65, "rgba(150,245,255,.55)"); pg.addColorStop(1, "rgba(120,240,255,0)");
        g.fillStyle = pg; g.fillRect(cx - w, top, w * 2, ty - top + 40 * S);
        const rg = g.createRadialGradient(cx, ty, 0, cx, ty, W * 0.5); rg.addColorStop(0, `rgba(255,255,255,${0.8 * pil})`); rg.addColorStop(1, "rgba(120,240,255,0)");
        g.fillStyle = rg; g.fillRect(0, 0, W, H);
        // ประกายพุ่งขึ้นในเสา
        for (let i = 0; i < 80; i++) { const k = (t * (0.6 + hash(i, 8)) + hash(i, 9)) % 1, x = cx + (hash(i, 10) - 0.5) * w * 1.6, y = ty - k * H; g.fillStyle = `rgba(230,255,255,${0.7 * (1 - k)})`; g.fillRect(x, y, 3 * S, 8 * S); }
        g.restore();
      }
      // --- ทะเลข้อมูล (ภายในวงคลื่น) ---
      if (front > 0) {
        g.save(); g.beginPath(); g.arc(cx, ty, R, 0, TAU); g.clip();
        drawDataSea(g, W, H, t, S);
        g.restore();
        // หน้าคลื่น: วงแสง + ลูกบาศก์ข้อมูลแตกลอยขึ้น
        g.save(); g.globalCompositeOperation = "lighter";
        g.strokeStyle = `rgba(220,255,255,${0.9 * (1 - span(u, 0.8, 0.86))})`; g.lineWidth = 10 * S; g.beginPath(); g.arc(cx, ty, R, 0, TAU); g.stroke();
        g.strokeStyle = "rgba(120,240,255,.4)"; g.lineWidth = 30 * S; g.beginPath(); g.arc(cx, ty, Math.max(0, R - 20 * S), 0, TAU); g.stroke();
        for (let i = 0; i < N; i++) {
          const a = hash(i, 11) * TAU, birth = hash(i, 12) * 0.9, k = clamp((front - birth) / 0.25, 0, 1); if (k <= 0 || k >= 1) continue;
          const rr = Math.hypot(W, H) * birth, x = cx + Math.cos(a) * rr, y = ty + Math.sin(a) * rr * 0.6 - k * H * 0.35, s = (4 + hash(i, 13) * 12) * S;
          g.fillStyle = `rgba(${hash(i, 14) < 0.5 ? "150,245,255" : "230,255,255"},${0.9 * (1 - k)})`; g.fillRect(x - s / 2, y - s / 2, s, s);
          g.strokeStyle = `rgba(20,40,80,${0.6 * (1 - k)})`; g.lineWidth = 1; g.strokeRect(x - s / 2, y - s / 2, s, s);
        }
        g.restore();
      }
      // แฟลชตอนออร่าระเบิด
      const fl = span(u, 0.4, 0.43) * (1 - span(u, 0.43, 0.55));
      if (fl > 0) { g.fillStyle = `rgba(235,255,255,${fl * 0.85})`; g.fillRect(-20, -20, W + 40, H + 40); }
      g.setTransform(1, 0, 0, 1, 0, 0);
      // ชื่อชั้น + ความลึก −∞
      const nk = span(u, 0.84, 0.9) * (1 - span(u, 0.96, 1));
      if (nk > 0) {
        g.save(); g.textAlign = "center"; g.globalAlpha = nk;
        g.shadowColor = "rgba(0,60,90,.9)"; g.shadowBlur = 18 * S;
        g.font = `700 ${Math.round(44 * S)}px "Kanit","Chakra Petch",sans-serif`; g.fillStyle = "#f2feff"; g.fillText(L.name, W / 2, H * 0.78);
        g.font = `600 ${Math.round(20 * S)}px "Kanit","Chakra Petch",sans-serif`; g.fillStyle = "rgba(210,250,255,.9)"; g.fillText(`${L.latin} · ${L.depthText || "−∞"} ม.`, W / 2, H * 0.78 + 46 * S);
        g.restore();
      }
      // จางเข้าเกม
      const out = span(u, 0.94, 1);
      if (out > 0) { g.fillStyle = `rgba(4,40,60,${out})`; g.fillRect(0, 0, W, H); }
      if (u >= 1) { finish(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const guard = setTimeout(finish, D + 1500);
    return () => { cancelAnimationFrame(raf); clearTimeout(guard); window.removeEventListener("resize", resize); };
  }, [to, durationMs, lowQ]);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 9000, pointerEvents: "none" }} aria-hidden="true" />;
}

// ทะเลข้อมูลฟ้าสว่าง: ไล่สี · แสงขาวกลาง · ตารางลู่ไปขอบฟ้า · ริ้วแสงโค้ง
function drawDataSea(g, W, H, t, S) {
  const hy = H * 0.42;
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#0b5a78"); gr.addColorStop(0.4, "#22c4d6"); gr.addColorStop(0.7, "#0d8aa6"); gr.addColorStop(1, "#06395a");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = "lighter";
  const cg = g.createRadialGradient(W / 2, hy, 0, W / 2, hy, W * 0.5); cg.addColorStop(0, "rgba(255,255,255,.7)"); cg.addColorStop(0.25, "rgba(190,250,255,.25)"); cg.addColorStop(1, "rgba(120,240,255,0)");
  g.fillStyle = cg; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(210,255,255,.22)"; g.lineWidth = 1.2 * S;
  for (let i = -30; i <= 30; i++) { g.beginPath(); g.moveTo(W / 2 + i * 8 * S, hy); g.lineTo(W / 2 + i * W * 0.08, H); g.stroke(); }
  for (let j = 1; j < 18; j++) { const k = ((j + t * 0.8) % 18) / 18, y = hy + (H - hy) * Math.pow(k, 2.2); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let r = 0; r < 4; r++) {
    g.strokeStyle = `rgba(230,255,255,${0.12 + r * 0.03})`; g.lineWidth = (3 + r * 2) * S; g.beginPath();
    for (let i = 0; i <= 40; i++) { const u = i / 40, x = W * u, y = H * (0.15 + r * 0.1) + Math.sin(u * 5 + t * 0.8 + r * 2) * 50 * S; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  g.restore();
}
