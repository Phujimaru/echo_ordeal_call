// ============================================================
//  ฉากระเบิด "เกิดใหม่เป็นประตู" ของยูกิ มาโคโตะ — โอเวอร์เลย์เต็มจอ 14 วิ (จอคอม/แท็บเล็ต)
//  เปิดเมื่อ state.yukiBoom = { seq, by, x, y, size } มี seq ใหม่ระหว่าง gameState "CUTSCENE" (server พัก 14.5 วิ แล้วเข้า GAMEOVER)
//   · เห็น seq ครั้งแรกตอน GAMEOVER (เข้าห้องใหม่/รีโหลด) = จดไว้เฉยๆ ไม่เล่นซ้ำ
//   · เล่นต่อจนครบ 14 วิ แม้ state เปลี่ยนเป็น GAMEOVER ระหว่างนั้น · ระหว่างเล่นพักเพลง/เสียงบรรยากาศทั้งหมด (suspendMusic) เหลือแค่ yuki_boom
//  จังหวะตรงไฟล์เสียง yuki_boom (riser → ระเบิดที่ 2.6 วิ → หางยาว fade 10–14 วิ):
//   0–2.6  จอมืดเกือบดำ · ออร่ายุบเป็นจุดแสงขาวที่ตัวยูกิ + ดาว 4 แฉกขาวบนวงแดง สั่นเบาๆ (ยุบตัวช่วงท้าย)
//   2.6    แฟลชขาว + จอสั่นแรง · ลูกไฟขาว-ส้ม-แดงขยายจนล้นจอ · คลื่นกระแทกหลายวง · เศษซาก/ประกายไฟ · ยูนิตเป็นเงาดำแล้วสลาย
//   7–10   ไฟเต็มจอกลายเป็นขาวโพลน · 10–14 ขาวค้างแล้วค่อยๆ จาง
//  ไม่มีข้อความใดๆ ในฉาก (CLAUDE.md) · แคนวาสเดียว · lowQ = อนุภาคน้อย ไม่สั่น ความละเอียด 1× · ลดการเคลื่อนไหว = ไม่สั่น แฟลชเบาลง
// ============================================================
import { useEffect, useRef, useState } from "react";
import { playSfx, sfxPlayId, stopSfx, suspendMusic } from "../audio";
import { yukiScreenUnits } from "./yukiFx";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const YUKI_BOOM_MS = 14000;
const T_BOOM = 2.6; // วินาทีที่ระเบิด (ตรงไฟล์เสียง)
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut3 = (t) => 1 - Math.pow(1 - clamp01(t), 3);
const easeIn2 = (t) => clamp01(t) * clamp01(t);
const rnd = (seed) => { let s = (Math.abs(Math.floor(seed)) % 2147483646) || 1; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; };

// ---------- เตรียมฉาก (ตำแหน่งจุดระเบิด · เงายูนิต · อนุภาค) ----------
function buildScene(boom, W, H, lowQ) {
  const list = yukiScreenUnits();
  const me = list.find((u) => u.id === boom.by);
  const mx = W * 0.08, my = H * 0.08;
  const cx = me && Number.isFinite(me.x) ? Math.max(mx, Math.min(W - mx, me.x)) : W / 2;
  const cy = me && Number.isFinite(me.y) ? Math.max(my, Math.min(H - my, me.y)) : H / 2;
  const R = rnd(boom.seq * 977 + 13);
  const far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
  const RING_V = far / 1.15; // คลื่นแรกถึงมุมจอไกลสุดใน ~1.15 วิ
  // เงายูนิต (ทุกตัวยกเว้นยูกิ): โดนคลื่นแรกเมื่อไหร่ = เงาดำ → สลายเป็นผง
  const units = list.filter((u) => u.id !== boom.by && Number.isFinite(u.x) && Number.isFinite(u.y)).map((u) => {
    const d = Math.hypot(u.x - cx, u.y - cy), ang = Math.atan2(u.y - cy, u.x - cx);
    const hit = T_BOOM + d / RING_V;
    const bits = Array.from({ length: lowQ ? 12 : 34 }, () => ({
      ox: (R() - 0.5) * u.r * 1.8, oy: (R() - 0.5) * u.r * 1.8 + R() * u.r * 0.6,
      a: ang + (R() - 0.5) * 1.1, v: 60 + R() * 260, s: 1.5 + R() * 3.5, d0: R() * 0.5,
    }));
    return { ...u, d, ang, hit, bits };
  });
  // ประกายไฟ (เส้น) + เศษซาก (ก้อนดำหมุน)
  const sparks = Array.from({ length: lowQ ? 90 : 300 }, () => ({
    a: R() * TAU, v: 500 + Math.pow(R(), 0.6) * 2200, d0: R() * 0.35, life: 1.2 + R() * 2.4, w: 1 + R() * 2.2, hot: R(),
  }));
  const debris = Array.from({ length: lowQ ? 16 : 54 }, () => ({
    a: R() * TAU, v: 300 + R() * 1300, d0: R() * 0.25, s: 4 + R() * 14, rot: R() * TAU, vr: (R() - 0.5) * 12, life: 2 + R() * 2.5, sides: 3 + Math.floor(R() * 3),
  }));
  // กลุ่มไฟปั่นป่วนในลูกไฟ
  const billows = Array.from({ length: lowQ ? 8 : 22 }, () => ({ a: R() * TAU, r: 0.15 + R() * 0.8, s: 0.18 + R() * 0.3, sp: 0.2 + R() * 0.6, ph: R() * TAU }));
  // ออร่าที่ยุบเข้าจุด (0–2.6 วิ)
  const motes = Array.from({ length: lowQ ? 40 : 120 }, () => ({ a: R() * TAU, r: 0.6 + R() * 0.9, d0: R(), sp: 0.7 + R() * 0.8, s: 1 + R() * 2 }));
  return { cx, cy, far, RING_V, units, sparks, debris, billows, motes, W, H };
}

// ---------- วาด ----------
function hexPath(g, x, y, r) {
  const ry = r * 0.866; g.beginPath();
  g.moveTo(x - r, y); g.lineTo(x - r / 2, y - ry); g.lineTo(x + r / 2, y - ry); g.lineTo(x + r, y); g.lineTo(x + r / 2, y + ry); g.lineTo(x - r / 2, y + ry); g.closePath();
}
function radial(g, x, y, r, stops) {
  const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
  for (const [o, c] of stops) gr.addColorStop(o, c);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, Math.max(1, r), 0, TAU); g.fill();
}
// ดาว 4 แฉก (ยาว L หนา w) หมุน rot
function star4(g, x, y, L, w, rot, fill) {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = fill;
  for (let q = 0; q < 4; q++) {
    g.rotate(Math.PI / 2);
    g.beginPath(); g.moveTo(0, -w); g.quadraticCurveTo(L * 0.25, -w * 0.25, L, 0); g.quadraticCurveTo(L * 0.25, w * 0.25, 0, w); g.closePath(); g.fill();
  }
  g.restore();
}
// ขอบลูกไฟแบบปั่นป่วน
const edgeNoise = (a, t) => Math.sin(a * 5 + t * 1.3) * 0.5 + Math.sin(a * 9 - t * 2.1) * 0.3 + Math.sin(a * 14 + t * 0.7 + 1.3) * 0.2;

//  พิกัดทั้งหมดเป็น CSS px · dpr = ความละเอียดของแคนวาสจริง
function drawScene(g, sc, t, lowQ, dpr) {
  const { cx, cy, W, H, far } = sc;
  const dim = Math.min(W, H);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  // ความสว่างทั้งฉากตอนท้าย (ขาวค้าง → จาง)
  const fadeOut = 1 - smooth(11.5, 14, t);
  if (fadeOut <= 0) return;
  g.globalAlpha = 1;
  // จอสั่น: เบาๆ ก่อนระเบิด · แรงตอนระเบิดแล้วซาลง
  let sx = 0, sy = 0;
  if (!lowQ && !REDUCED) {
    const pre = t < T_BOOM ? 1.2 + 3.2 * easeIn2(t / T_BOOM) : 0;
    const post = t >= T_BOOM ? 34 * Math.exp(-(t - T_BOOM) * 1.25) : 0;
    const amp = pre + post;
    sx = Math.sin(t * 91.7) * amp * 0.7 + Math.sin(t * 57.3) * amp * 0.3;
    sy = Math.cos(t * 83.1) * amp * 0.7 + Math.sin(t * 41.9) * amp * 0.3;
  }
  const X = cx + sx, Y = cy + sy;

  if (t < T_BOOM) {
    // ---------- 0–2.6: มืดเกือบดำ · ออร่ายุบเป็นจุดแสง · ดาว 4 แฉกบนวงแดง ----------
    const dark = 0.93 * smooth(0, 0.9, t);
    g.fillStyle = `rgba(0,0,4,${dark})`; g.fillRect(0, 0, W, H);
    const p = t / T_BOOM;
    // ออร่าฟ้า-ขาวไหลเข้าหาจุด (รัศมีหดลงเรื่อยๆ)
    const Rm = dim * 0.34 * (1 - 0.75 * p);
    g.globalCompositeOperation = "lighter";
    radial(g, X, Y, Rm * 1.15, [[0, `rgba(120,185,255,${0.32 * (1 - p * 0.5)})`], [1, "rgba(60,120,255,0)"]]);
    for (const m of sc.motes) {
      const age = (t * m.sp + m.d0) % 1, uu = easeIn2(age);
      const a = m.a + age * 2.4, r = Rm * m.r * (1 - uu);
      const x = X + Math.cos(a) * r, y = Y + Math.sin(a) * r * 0.82;
      const al = Math.sin(Math.PI * age) * (0.55 + 0.45 * p);
      g.fillStyle = `rgba(215,236,255,${al})`; g.beginPath(); g.arc(x, y, m.s * (1 - 0.5 * uu), 0, TAU); g.fill();
      if (!lowQ) {
        const ab = Math.max(0, age - 0.06), ub = easeIn2(ab), aa = m.a + ab * 2.4, rb = Rm * m.r * (1 - ub);
        g.strokeStyle = `rgba(150,200,255,${al * 0.6})`; g.lineWidth = m.s * 0.8;
        g.beginPath(); g.moveTo(X + Math.cos(aa) * rb, Y + Math.sin(aa) * rb * 0.82); g.lineTo(x, y); g.stroke();
      }
    }
    // วงแดงหลังดาว (โตขึ้นตั้งแต่ 0.9 วิ · ยุบตัวช่วง 2.35–2.6)
    const grow = smooth(0.9, 2.2, t), crush = smooth(2.35, T_BOOM, t);
    const ringR = dim * (0.02 + 0.075 * grow) * (1 - 0.85 * crush);
    g.globalCompositeOperation = "source-over";
    if (grow > 0) {
      radial(g, X, Y, ringR * 2.4, [[0, `rgba(255,40,30,${0.5 * grow})`], [0.45, `rgba(190,10,20,${0.35 * grow})`], [1, "rgba(120,0,10,0)"]]);
      g.beginPath(); g.arc(X, Y, ringR, 0, TAU);
      g.fillStyle = `rgba(200,14,24,${0.9 * grow})`; g.fill();
      g.lineWidth = Math.max(1.5, ringR * 0.08); g.strokeStyle = `rgba(255,110,90,${0.9 * grow})`; g.stroke();
    }
    // จุดแสงขาว + ดาว 4 แฉก (แฉกยาวขึ้นจนใกล้ระเบิด แล้วหดเหลือจุด)
    g.globalCompositeOperation = "lighter";
    const core = dim * (0.006 + 0.03 * smooth(0, 2.3, t)) * (1 - 0.6 * crush);
    radial(g, X, Y, core * 6, [[0, "rgba(255,255,255,0.95)"], [0.25, "rgba(220,238,255,0.5)"], [1, "rgba(120,180,255,0)"]]);
    const L = dim * (0.05 + 0.4 * easeIn2(smooth(0.3, 2.35, t))) * (1 - 0.92 * crush);
    const tw = REDUCED ? 0 : Math.sin(t * 37) * 0.04;
    star4(g, X, Y, L * (1 + tw), Math.max(2, core * 0.55), t * 0.12,"rgba(255,255,255,0.95)");
    star4(g, X, Y, L * 0.45, Math.max(1.5, core * 0.35), Math.PI / 4 + t * 0.12, "rgba(235,245,255,0.6)");
    radial(g, X, Y, core * 1.6, [[0, "rgba(255,255,255,1)"], [1, "rgba(255,255,255,0)"]]);
    g.globalCompositeOperation = "source-over";
    return;
  }

  // ---------- 2.6+: ระเบิด ----------
  const tb = t - T_BOOM;
  // ขาวค้างแล้ว: ไม่ต้องวาดไฟข้างใต้
  if (tb >= 7.4) { g.fillStyle = `rgba(255,255,255,${fadeOut})`; g.fillRect(0, 0, W, H); return; }
  // พื้นหลัง: ดำ → แสงไฟแดงส้มทั่วฟ้า
  g.fillStyle = "#050102"; g.fillRect(0, 0, W, H);
  const sky = smooth(0, 1.2, tb);
  radial(g, X, Y, far * 1.6, [[0, `rgba(255,170,90,${0.7 * sky})`], [0.5, `rgba(170,40,20,${0.55 * sky})`], [1, `rgba(40,6,4,${0.6 * sky})`]]);
  // ลูกไฟ
  const fbR = far * 1.25 * easeOut3(tb / 3.4) + dim * 0.03;
  const white = smooth(4.4, 7.4, tb); // ไฟเต็มจอกลายเป็นขาว (7–10 วิ ของฉาก)
  // ขอบปั่นป่วน
  const N = lowQ ? 40 : 96;
  g.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU, rr = fbR * (1 + 0.075 * edgeNoise(a, tb) * (1 - white));
    const x = X + Math.cos(a) * rr, y = Y + Math.sin(a) * rr;
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.closePath();
  {
    const gr = g.createRadialGradient(X, Y, 0, X, Y, Math.max(1, fbR));
    const mixW = (r, gg, b, w) => `rgb(${Math.round(r + (255 - r) * w)},${Math.round(gg + (255 - gg) * w)},${Math.round(b + (255 - b) * w)})`;
    gr.addColorStop(0, "#ffffff");
    gr.addColorStop(0.22, mixW(255, 248, 215, white));
    gr.addColorStop(0.45, mixW(255, 200, 90, white));
    gr.addColorStop(0.7, mixW(250, 110, 30, white));
    gr.addColorStop(0.9, mixW(200, 36, 18, white));
    gr.addColorStop(1, mixW(120, 14, 10, white));
    g.fillStyle = gr; g.fill();
  }
  // กลุ่มไฟปั่นป่วนในลูกไฟ
  if (white < 1) {
    g.globalCompositeOperation = "lighter";
    for (const b of sc.billows) {
      const a = b.a + tb * 0.15 * (b.sp - 0.4), r = fbR * Math.min(0.95, b.r + tb * 0.04 * b.sp);
      const x = X + Math.cos(a) * r, y = Y + Math.sin(a) * r, s = fbR * b.s * (0.9 + 0.2 * Math.sin(tb * 2 + b.ph));
      radial(g, x, y, s, [[0, `rgba(255,220,140,${0.28 * (1 - white)})`], [0.6, `rgba(255,120,40,${0.14 * (1 - white)})`], [1, "rgba(255,80,20,0)"]]);
    }
    g.globalCompositeOperation = "source-over";
  }
  // เงายูนิต: เงาดำตัดกับไฟ → สลายเป็นผงลอยออกจากจุดระเบิด
  for (const u of sc.units) {
    const since = t - u.hit;
    const dissolve = smooth(0.45, 1.6, since);
    if (dissolve < 1) {
      const push = 14 * easeOut3(clamp01(since / 1.5));
      const ux = u.x + Math.cos(u.ang) * push + sx * 0.5, uy = u.y + Math.sin(u.ang) * push + sy * 0.5;
      const a = 1 - dissolve;
      g.fillStyle = `rgba(0,0,0,${a})`;
      // แท่งต่อลงพื้น + ฐาน
      g.fillRect(ux - Math.max(1.5, u.r * 0.07), uy, Math.max(3, u.r * 0.14), Math.max(0, u.fy - uy));
      g.beginPath(); g.ellipse(u.fx + (ux - u.x), u.fy + (uy - u.y), u.r * 0.85, u.r * 0.3, 0, 0, TAU); g.fill();
      hexPath(g, ux, uy, u.r); g.fill();
      if (since > 0) { g.strokeStyle = `rgba(255,190,120,${0.55 * a * (1 - white)})`; g.lineWidth = 1.5; g.stroke(); }
    }
    if (since > 0.45) {
      const st = since - 0.45;
      for (const b of u.bits) {
        const tt = st - b.d0;
        if (tt <= 0 || tt > 2.4) continue;
        const k = 1 - tt / 2.4, d = b.v * tt * (1 - tt * 0.18);
        const x = u.x + b.ox + Math.cos(b.a) * d, y = u.y + b.oy + Math.sin(b.a) * d - 20 * tt;
        g.fillStyle = `rgba(${Math.round(30 * (1 - k))},${Math.round(8 * (1 - k))},0,${0.9 * k})`;
        g.fillRect(x - b.s / 2, y - b.s / 2, b.s * k + 0.5, b.s * k + 0.5);
      }
    }
  }
  // คลื่นกระแทกหลายวง (เร็วกว่าลูกไฟ) + วงแผ่ราบบนพื้น
  const rings = [[0, 1], [0.16, 0.8], [0.42, 0.65], [0.9, 0.5], [1.6, 0.4]];
  for (const [d0, pow] of rings) {
    const tt = tb - d0;
    if (tt <= 0) continue;
    const r = sc.RING_V * tt * (1.05 - 0.15 * d0), fade = (1 - clamp01(r / (far * 1.5))) * pow * (1 - white * 0.8);
    if (fade <= 0.01) continue;
    g.strokeStyle = `rgba(255,236,210,${0.32 * fade})`; g.lineWidth = Math.max(6, dim * 0.035 * fade);
    g.beginPath(); g.arc(X, Y, r, 0, TAU); g.stroke();
    g.strokeStyle = `rgba(255,255,255,${0.9 * fade})`; g.lineWidth = Math.max(1.5, dim * 0.005);
    g.beginPath(); g.arc(X, Y, r, 0, TAU); g.stroke();
  }
  {
    const tt = tb, r = sc.RING_V * 1.3 * tt, fade = (1 - clamp01(tt / 2.2)) * (1 - white);
    if (fade > 0.01) {
      g.save(); g.translate(X, Y); g.scale(1, 0.32);
      g.strokeStyle = `rgba(255,220,170,${0.7 * fade})`; g.lineWidth = Math.max(4, dim * 0.04 * fade);
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
      g.restore();
    }
  }
  // ประกายไฟ (เส้นพุ่งออก) + เศษซาก
  if (white < 1) {
    g.globalCompositeOperation = "lighter";
    for (const s of sc.sparks) {
      const tt = tb - s.d0;
      if (tt <= 0 || tt > s.life) continue;
      const k = 1 - tt / s.life, drag = 1 - Math.exp(-tt * 1.6);
      const d = (s.v / 1.6) * drag, v = s.v * Math.exp(-tt * 1.6);
      const x = X + Math.cos(s.a) * d, y = Y + Math.sin(s.a) * d + 60 * tt * tt;
      const len = Math.max(4, v * 0.035);
      const col = s.hot > 0.6 ? "255,250,230" : s.hot > 0.25 ? "255,190,90" : "255,110,40";
      g.strokeStyle = `rgba(${col},${0.95 * k * (1 - white)})`; g.lineWidth = s.w;
      g.beginPath(); g.moveTo(x - Math.cos(s.a) * len, y - Math.sin(s.a) * len); g.lineTo(x, y); g.stroke();
    }
    g.globalCompositeOperation = "source-over";
    for (const b of sc.debris) {
      const tt = tb - b.d0;
      if (tt <= 0 || tt > b.life) continue;
      const k = 1 - tt / b.life, d = (b.v / 1.2) * (1 - Math.exp(-tt * 1.2));
      const x = X + Math.cos(b.a) * d, y = Y + Math.sin(b.a) * d + 90 * tt * tt, rot = b.rot + b.vr * tt;
      g.save(); g.translate(x, y); g.rotate(rot);
      g.beginPath();
      for (let i = 0; i < b.sides; i++) { const a = (i / b.sides) * TAU, rr = b.s * (0.7 + 0.3 * Math.sin(i * 2.7 + b.rot)); if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath();
      g.fillStyle = `rgba(14,6,4,${0.95 * k * (1 - white)})`; g.fill();
      g.strokeStyle = `rgba(255,150,60,${0.7 * k * (1 - white)})`; g.lineWidth = 1.2; g.stroke();
      g.restore();
    }
  }
  // แฟลชขาวตอนระเบิด
  const flash = (REDUCED ? 0.6 : 1) * Math.exp(-tb * (REDUCED ? 2.2 : 3.2));
  // ขาวโพลน (7–10 วิ) → ขาวค้าง
  const wash = smooth(4.4, 7.4, tb);
  const wAll = Math.max(flash, wash);
  if (wAll > 0.003) { g.fillStyle = `rgba(255,255,255,${wAll})`; g.fillRect(0, 0, W, H); }
  // ทั้งฉากจางออกตอนท้าย
  if (fadeOut < 1) {
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = `rgba(0,0,0,${1 - fadeOut})`; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "source-over";
  }
}

// ---------- คอมโพเนนต์ ----------
//  boom = state.yukiBoom · phase = state.gameState · lowQ = โหมดประหยัด
export default function YukiBoom({ boom, phase, lowQ }) {
  const seq = boom && boom.seq != null ? boom.seq : null;
  // seq ที่เห็นแล้ว — ตอน mount ใน GAMEOVER (รีโหลด/เข้าห้องใหม่) นับว่าเห็นแล้ว ไม่เล่นซ้ำ
  const [seen, setSeen] = useState(() => (phase === "CUTSCENE" ? null : seq));
  const [run, setRun] = useState(null);
  if (seq != null && seq !== seen) {
    setSeen(seq);
    if (phase === "CUTSCENE") setRun({ seq, by: boom.by, x: boom.x, y: boom.y, size: boom.size || 1 });
  }
  const cvRef = useRef(null);
  const runSeq = run ? run.seq : null;
  useEffect(() => {
    if (!run) return undefined;
    const cv = cvRef.current;
    const release = suspendMusic(); // ห้ามเพลงสนาม/เพลงสกิล/เสียงบรรยากาศดังทับ
    const snd = playSfx("yuki_boom"), sndId = sfxPlayId(snd);
    const W = window.innerWidth, H = window.innerHeight;
    const dpr = lowQ ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
    let sc = null, raf = 0;
    if (cv) {
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = `${W}px`; cv.style.height = `${H}px`;
      sc = buildScene(run, W, H, lowQ);
    }
    const g = cv ? cv.getContext("2d") : null;
    const t0 = performance.now();
    const frame = () => {
      const t = (performance.now() - t0) / 1000;
      if (g && sc) drawScene(g, sc, t, lowQ, dpr);
      if (t * 1000 < YUKI_BOOM_MS) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const done = setTimeout(() => setRun(null), YUKI_BOOM_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
      stopSfx(snd, sndId);
      release();
    };
  }, [runSeq]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!run) return null;
  return (
    <div key={run.seq} aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 400, pointerEvents: "auto", cursor: "default" }}>
      <canvas ref={cvRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
