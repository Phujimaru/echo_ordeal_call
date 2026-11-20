// ============================================================
//  Nautilus ชั้น 1 — ภาพ + ฉาก + เสียงของลูกเล่นโต้ตอบ (server/fodlan/ntReef.js · fd.reef)
//   ปลาปักเป้าลอยบนทราย · หอยเม่นบนดงปะการัง (พร้อมปา) · วาล์วปะการัง (ลูกศรทิศกระแส) · กองหินที่สันพัง · หอยที่ถูกเก็บมุกแล้ว
//   ฉาก: nt_puffer (เตะโค้ง → พองระเบิดหนาม) · nt_urchin (ปาหมุน) · nt_valve (วนน้ำ) · nt_wall_break (หินถล่ม ฝุ่น)
//        nt_clam_bite · nt_current (เส้นน้ำพัด) · nt_fall (น้ำวนดูดลงหลุม) · nt_surface (ฟองโผล่) · nt_pearl (ประกาย) · nt_dodge
// ============================================================
import { P, depthOf, glow } from "../boardGeo";
import { fxT, fxOnce } from "./index";
import { playSfx, registerSounds } from "../../audio";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
export const REEF_FX = { nt_puffer: 1500, nt_urchin: 900, nt_valve: 1200, nt_wall_break: 1500, nt_clam_bite: 900, nt_current: 900, nt_fall: 1300, nt_surface: 1100, nt_pearl: 1200, nt_dodge: 700, nt_shove: 500 };

let SND = false;
// เอฟเฟคดังขึ้น (ผู้ใช้ 2026-11-19: "เร่งเพลง 1-4 เสียงเอฟเฟคด้วย") — เพดาน volume 1 อยู่ที่ audio.js
const NT_SFX_BOOST = 1.6;
function snd(k, gain = 1, delay = 0) {
  if (!SND) { SND = true; registerSounds(Object.fromEntries(["whoosh", "whip", "boom", "impact", "splash", "spit", "bubbles", "swirl", "gulp", "slap", "squish", "crackle", "rumble"].map((n) => [`ntr_${n}`, `/nautilus/sfx/${n}.mp3`]))); }
  const go = () => playSfx(`ntr_${k}`, { gain: gain * NT_SFX_BOOST }); if (delay > 0) setTimeout(go, delay); else go();
}

// ---------- ของบนกระดาน (เรียงความลึก) ----------
export function reefItems(list, g, fd, info, now) {
  const r = fd && fd.reef; if (!r) return;
  const t = now / 1000;
  for (const f of r.puffers || []) {
    const x = f.x + 0.5 + Math.sin(t * 0.7 + f.id) * 0.12, vx = Math.cos(t * 0.7 + f.id); // ลอยซ้าย-ขวา → หันหัวตามทิศที่ลอย (บนจอ)
    const a = P(x, f.y + 0.5), b = P(x + vx * 0.1, f.y + 0.5), face = b[0] >= a[0] ? 1 : -1;
    list.push({ d: depthOf(f.x + 0.5, f.y + 0.5), f: () => puffer(g, x, f.y + 0.5, 0.45 + Math.sin(t * 1.6 + f.id) * 0.06, 1, t + f.id, face) });
  }
  for (const v of r.valves || []) list.push({ d: depthOf(v.x + 0.5, v.y + 0.5), f: () => valve(g, v, r.valveDir, t) });
  for (const k of r.broken || []) { const [x, y] = k.split(",").map(Number); list.push({ d: depthOf(x + 0.5, y + 0.5), f: () => rubble(g, x, y) }); }
  // หอยเม่นพร้อมปาบนดงปะการังบางช่อง (ดงที่ยังไม่ถูกเก็บ)
  const round = info.round || 0;
  for (const s of info.special || []) {
    if (s.kind !== "fd_nt_coral" || (s.x * 7 + s.y * 3) % 4) continue;
    const cd = r.urchin && r.urchin[`${s.x},${s.y}`];
    if (cd && cd > round) continue;
    list.push({ d: depthOf(s.x + 0.5, s.y + 0.5) + 0.01, f: () => urchin(g, s.x + 0.3, s.y + 0.7, t) });
  }
}
function puffer(g, x, y, z, scale, t, face = 1) {
  const [sx0, sy, s] = P(x, y, z), r = s * 0.16 * scale, sx = 0;
  g.save(); g.translate(sx0, 0); g.scale(face, 1);
  g.fillStyle = "rgba(0,10,14,.35)"; { const b = P(x, y, 0); g.beginPath(); g.ellipse(b[0], b[1], r * 1.2, r * 0.4, 0, 0, TAU); g.fill(); }
  g.fillStyle = "#d9b45a"; g.beginPath(); g.ellipse(sx, sy, r * 1.25, r, 0, 0, TAU); g.fill();
  g.fillStyle = "#f2e2b0"; g.beginPath(); g.ellipse(sx, sy + r * 0.35, r * 0.9, r * 0.5, 0, 0, TAU); g.fill();
  g.fillStyle = "#6b5226"; for (let i = 0; i < 6; i++) { const a = i * 1.1; g.beginPath(); g.arc(sx + Math.cos(a) * r * 0.6, sy - r * 0.2 + Math.sin(a) * r * 0.35, r * 0.1, 0, TAU); g.fill(); }
  const tail = Math.sin(t * 9) * r * 0.25; g.fillStyle = "#c79a40"; g.beginPath(); g.moveTo(sx - r * 1.2, sy); g.lineTo(sx - r * 1.75, sy - r * 0.45 + tail); g.lineTo(sx - r * 1.75, sy + r * 0.45 + tail); g.fill();
  g.fillStyle = "#111"; g.beginPath(); g.arc(sx + r * 0.65, sy - r * 0.2, r * 0.13, 0, TAU); g.fill();
  g.restore();
}
function urchin(g, x, y, t) {
  const [sx, sy, s] = P(x, y, 0.08), r = s * 0.08;
  g.strokeStyle = "#3b1d4a"; g.lineWidth = 1.2;
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + Math.sin(t + i) * 0.05; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(a) * r * 2.2, sy + Math.sin(a) * r * 1.5 - r * 0.4); g.stroke(); }
  g.fillStyle = "#4a2660"; g.beginPath(); g.arc(sx, sy - r * 0.2, r, 0, TAU); g.fill();
}
function valve(g, v, dir, t) {
  const [sx, sy, s] = P(v.x + 0.5, v.y + 0.5, 0);
  g.fillStyle = "rgba(0,10,14,.4)"; g.beginPath(); g.ellipse(sx, sy, s * 0.35, s * 0.13, 0, 0, TAU); g.fill();
  // ปล่องปะการังทรงแจกัน + ล้อหมุน
  g.fillStyle = "#b05a6a"; g.beginPath(); g.moveTo(sx - s * 0.18, sy); g.quadraticCurveTo(sx - s * 0.28, sy - s * 0.3, sx - s * 0.12, sy - s * 0.45); g.lineTo(sx + s * 0.12, sy - s * 0.45); g.quadraticCurveTo(sx + s * 0.28, sy - s * 0.3, sx + s * 0.18, sy); g.closePath(); g.fill();
  const c = [sx, sy - s * 0.52]; g.strokeStyle = "#e0b060"; g.lineWidth = Math.max(1.5, s * 0.03); g.beginPath(); g.ellipse(c[0], c[1], s * 0.16, s * 0.07, 0, 0, TAU); g.stroke();
  const rot = t * dir * 1.5; for (let i = 0; i < 4; i++) { const a = rot + i * Math.PI / 2; g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[0] + Math.cos(a) * s * 0.16, c[1] + Math.sin(a) * s * 0.07); g.stroke(); }
  // ลูกศรทิศกระแส (สัญลักษณ์ ไม่ใช่ข้อความ)
  const a0 = P(v.x + 0.5 + dir * 0.55, v.y + 0.5, 0.05), a1 = P(v.x + 0.5 + dir * 0.95, v.y + 0.5, 0.05);
  g.strokeStyle = `rgba(200,250,250,${0.6 + 0.3 * Math.sin(t * 4)})`; g.lineWidth = 2; g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(a1[0], a1[1]); g.stroke();
  g.beginPath(); g.moveTo(a1[0], a1[1]); g.lineTo(a1[0] - dir * s * 0.12, a1[1] - s * 0.06); g.lineTo(a1[0] - dir * s * 0.12, a1[1] + s * 0.06); g.closePath(); g.fillStyle = g.strokeStyle; g.fill();
}
function rubble(g, x, y) {
  for (let i = 0; i < 6; i++) {
    const h = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
    const [sx, sy, s] = P(x + 0.2 + h(x + i, y) * 0.6, y + 0.2 + h(x, y + i) * 0.6, 0);
    g.fillStyle = i % 2 ? "#647a74" : "#4a5c58"; g.beginPath(); g.ellipse(sx, sy - s * 0.05, s * (0.08 + h(i, x) * 0.08), s * 0.06, h(i, y), 0, TAU); g.fill();
    if (i % 3 === 0) { g.fillStyle = "#e0687a"; g.beginPath(); g.arc(sx + s * 0.04, sy - s * 0.1, s * 0.03, 0, TAU); g.fill(); }
  }
}

// ---------- ฉาก (ทับตัวละคร) ----------
export function reefFx(g, fd, info, now) {
  for (const e of fd.fx || []) {
    const dur = REEF_FX[e.kind]; if (!dur) continue;
    if (fxOnce(e)) sounds(e);
    const k = fxT(e, now, dur); if (k >= 1) continue;
    if (e.kind === "nt_puffer") drawPuffer(g, e, k, now);
    else if (e.kind === "nt_urchin") drawUrchin(g, e, k, now);
    else if (e.kind === "nt_valve") drawValve(g, e, k);
    else if (e.kind === "nt_wall_break") drawWall(g, e, k);
    else if (e.kind === "nt_clam_bite") drawBite(g, e, k);
    else if (e.kind === "nt_current") for (const m of e.moves || []) streak(g, m, e.dir, k);
    else if (e.kind === "nt_fall") drawFall(g, e, k, now);
    else if (e.kind === "nt_surface") drawSurface(g, e, k);
    else if (e.kind === "nt_pearl") drawPearl(g, e, k);
    else if (e.kind === "nt_dodge") drawDodge(g, e, k);
  }
}
function sounds(e) {
  switch (e.kind) {
    case "nt_puffer": snd("whoosh", 0.7); snd("boom", 0.8, 650); snd("crackle", 0.5, 680); break;
    case "nt_urchin": snd("whip", 0.8); snd("squish", 0.8, 420); break;
    case "nt_valve": snd("swirl", 0.6); break;
    case "nt_wall_break": snd("impact", 1); snd("rumble", 0.7, 100); break;
    case "nt_clam_bite": snd("slap", 1); snd("gulp", 0.6, 120); break;
    case "nt_fall": snd("swirl", 0.8); snd("bubbles", 0.8, 300); break;
    case "nt_surface": snd("splash", 0.6); break;
    case "nt_pearl": snd("bubbles", 0.4); break;
    default: break;
  }
}
function drawPuffer(g, e, k, now) {
  const a = e.from, b = e.to; if (!a || !b) return;
  if (k < 0.42) { // ลอยโค้งไปตามแนว หมุนตัว
    const u = easeOut(k / 0.42), x = lerp(a.x, b.x, u) + 0.5, y = lerp(a.y, b.y, u) + 0.5, z = 0.45 + Math.sin(u * Math.PI) * 1.2;
    puffer(g, x, y, z, 1 + u * 0.4, now / 1000 * 3);
    return;
  }
  const kk = (k - 0.42) / 0.58, [sx, sy, s] = P(b.x + 0.5, b.y + 0.5, 0.45);
  if (kk < 0.25) { // พองตัวเป็นลูกหนาม
    const r = s * (0.2 + kk * 1.6);
    g.fillStyle = "#e3c06a"; g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.fill();
    g.strokeStyle = "#6b5226"; g.lineWidth = 1.5; for (let i = 0; i < 18; i++) { const an = (i / 18) * TAU; g.beginPath(); g.moveTo(sx + Math.cos(an) * r, sy + Math.sin(an) * r); g.lineTo(sx + Math.cos(an) * r * 1.35, sy + Math.sin(an) * r * 1.35); g.stroke(); }
    return;
  }
  const q = (kk - 0.25) / 0.75; // ระเบิด: หนามพุ่งออก 3×3 + วงพิษสีเขียว
  glow(g, sx, sy, s * (0.6 + q * 1.8), "190,255,140", 0.6 * (1 - q));
  g.strokeStyle = `rgba(240,220,150,${1 - q})`; g.lineWidth = 2;
  for (let i = 0; i < 24; i++) { const an = (i / 24) * TAU, r0 = s * (0.3 + q * 1.4), r1 = r0 + s * 0.25; g.beginPath(); g.moveTo(sx + Math.cos(an) * r0, sy + Math.sin(an) * r0 * 0.55); g.lineTo(sx + Math.cos(an) * r1, sy + Math.sin(an) * r1 * 0.55); g.stroke(); }
  g.fillStyle = `rgba(140,220,90,${0.25 * (1 - q)})`;
  const c = [P(b.x - 1, b.y - 1), P(b.x + 2, b.y - 1), P(b.x + 2, b.y + 2), P(b.x - 1, b.y + 2)];
  g.beginPath(); c.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
}
function drawUrchin(g, e, k, now) {
  const a = e.from, b = e.to; if (!a || !b) return;
  const u = easeOut(Math.min(1, k / 0.6)), x = lerp(a.x, b.x, u) + 0.5, y = lerp(a.y, b.y, u) + 0.5, z = 0.5 + Math.sin(u * Math.PI) * 1.4;
  if (k < 0.6) { const [sx, sy, s] = P(x, y, z), r = s * 0.08, rot = now / 80; g.strokeStyle = "#3b1d4a"; g.lineWidth = 1.2; for (let i = 0; i < 12; i++) { const an = rot + (i / 12) * TAU; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(an) * r * 2.3, sy + Math.sin(an) * r * 2.3); g.stroke(); } g.fillStyle = "#4a2660"; g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.fill(); }
  else if (e.hit) { const q = (k - 0.6) / 0.4, [sx, sy, s] = P(b.x + 0.5, b.y + 0.5, 0.6); g.fillStyle = `rgba(200,30,40,${0.7 * (1 - q)})`; for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU; g.beginPath(); g.arc(sx + Math.cos(an) * s * q * 0.5, sy + Math.sin(an) * s * q * 0.3, s * 0.03, 0, TAU); g.fill(); } }
}
function drawValve(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.5);
  g.strokeStyle = `rgba(200,250,255,${0.7 * (1 - k)})`; g.lineWidth = 2;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(sx, sy, s * (0.2 + k * 0.8 + i * 0.15), k * 6 * e.dir + i, k * 6 * e.dir + i + 2.5); g.stroke(); }
}
function drawWall(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0);
  glow(g, sx, sy - s * 0.4, s * (0.8 + k), "200,230,220", 0.4 * (1 - k));
  for (let i = 0; i < 10; i++) { const an = i * 0.63, d = easeOut(k) * s * (0.6 + (i % 3) * 0.25), up = Math.sin(Math.min(1, k * 1.6) * Math.PI) * s * 0.8; g.fillStyle = i % 2 ? "#7a8f88" : "#55665f"; g.beginPath(); g.ellipse(sx + Math.cos(an) * d, sy - up + Math.sin(an) * d * 0.4, s * 0.07, s * 0.05, an, 0, TAU); g.fill(); }
  for (const t of e.behind || []) { const [bx, by, bs] = P(t.x + 0.5, t.y + 0.5, 0); g.fillStyle = `rgba(150,170,160,${0.5 * (1 - k)})`; g.beginPath(); g.ellipse(bx, by, bs * (0.4 + k * 0.6), bs * (0.15 + k * 0.2), 0, 0, TAU); g.fill(); }
}
function drawBite(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.15), shut = k < 0.3 ? k / 0.3 : 1;
  g.fillStyle = "#8a9aa0"; g.beginPath(); g.ellipse(sx, sy - s * 0.3 * (1 - shut), s * 0.42, s * 0.14, 0, Math.PI, TAU); g.fill();
  if (k > 0.25) { g.strokeStyle = `rgba(255,255,255,${1 - k})`; g.lineWidth = 2; g.beginPath(); g.ellipse(sx, sy, s * (0.4 + k * 0.5), s * (0.15 + k * 0.2), 0, 0, TAU); g.stroke(); }
}
function streak(g, m, dir, k) {
  if (!m.from) return;
  const [sx, sy, s] = P(m.from.x + 0.5, m.from.y + 0.5, 0.3);
  g.strokeStyle = `rgba(210,250,250,${0.6 * (1 - k)})`; g.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { const yy = sy + (i - 1) * s * 0.12, x0 = sx - dir * s * 0.4 + dir * k * s * 0.8; g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + dir * s * 0.5, yy); g.stroke(); }
}
function drawFall(g, e, k, now) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0);
  g.strokeStyle = `rgba(150,220,255,${0.7 * (1 - k)})`; g.lineWidth = 2;
  for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(sx, sy, s * (0.6 - k * 0.5) * (1 - i * 0.18), s * (0.25 - k * 0.2) * (1 - i * 0.18), 0, now / 150 + i, now / 150 + i + 3.5); g.stroke(); }
}
function drawSurface(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0);
  for (let i = 0; i < 10; i++) { const t = (k + i / 10) % 1; g.strokeStyle = `rgba(210,250,255,${0.7 * (1 - k)})`; g.lineWidth = 1; g.beginPath(); g.arc(sx + Math.sin(i * 2.1) * s * 0.25, sy - t * s * 1.2, s * (0.03 + (i % 3) * 0.015), 0, TAU); g.stroke(); }
}
function drawPearl(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.3 + k * 1.2);
  glow(g, sx, sy, s * 0.5, "255,250,230", 0.9 * (1 - k));
  g.fillStyle = `rgba(255,252,240,${1 - k})`; g.beginPath(); g.arc(sx, sy, s * 0.07, 0, TAU); g.fill();
}
function drawDodge(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.6);
  g.strokeStyle = `rgba(220,250,255,${0.8 * (1 - k)})`; g.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { const x = sx - s * 0.3 - k * s * 0.4 - i * s * 0.12; g.beginPath(); g.moveTo(x, sy - s * 0.2 + i * s * 0.15); g.lineTo(x + s * 0.25, sy - s * 0.2 + i * s * 0.15); g.stroke(); }
  void clamp;
}

// ---------- พายุใต้ทะเล (fd.weather.kind nt_storm · fd.reef.stormDir = ทิศที่จะพัดตอนจบเทิร์น) ----------
//  ตะกอนพุ่งเป็นสายตามทิศ · ลูกศรใหญ่ไหลบนพื้นบอกทิศเทิร์นนี้ (สัญลักษณ์) · มืดลง · เสียงน้ำซัดเป็นระยะ
let STORM_SND = 0; // เวลาที่เล่นเสียงพายุครั้งถัดไป
export function reefStorm(g, fd, info, now, view) {
  const on = fd && fd.weather && fd.weather.kind === "nt_storm";
  for (const e of fd.fx || []) if ((e.kind === "nt_storm" || e.kind === "nt_storm_push") && fxOnce(e)) { snd("rush", 1); snd("swirl", 0.7, 200); }
  if (!on) return;
  const d = (fd.reef && fd.reef.stormDir) || { x: 1, y: 0 }, t = now / 1000;
  // เสียงพายุเป็นระยะ: ช่วงห่างสุ่ม 13–22 วิ สลับเสียง/ความดัง (เดิมทุก 6 วิตายตัว — ผู้ใช้: เสียงน้ำซ้ำบ่อยไป 2026-11-19)
  if (now > STORM_SND) { STORM_SND = now + 13000 + Math.random() * 9000; const r = Math.random(); if (r < 0.5) snd("rush", 0.35 + Math.random() * 0.2); else snd("swirl", 0.3 + Math.random() * 0.15); }
  const X0 = view ? view.x0 : 0, W = view ? view.x1 - view.x0 : 1280, Y0 = view ? view.y0 : 0, H = view ? view.y1 - view.y0 : 720;
  g.fillStyle = "rgba(20,40,40,.28)"; g.fillRect(X0, Y0, W, H);
  // ลูกศรไหลบนพื้นทั้งกระดาน
  g.save(); g.globalCompositeOperation = "lighter";
  for (let y = 1; y < info.rows; y += 3) for (let x = 1; x < info.cols; x += 3) {
    const u = ((t * 0.8 + (x + y) * 0.13) % 1), cx = x + 0.5 + d.x * (u - 0.5), cy = y + 0.5 + d.y * (u - 0.5);
    const a = P(cx - d.x * 0.35 - d.y * 0.25, cy - d.y * 0.35 + d.x * 0.25, 0.03), b = P(cx + d.x * 0.35, cy + d.y * 0.35, 0.03), c = P(cx - d.x * 0.35 + d.y * 0.25, cy - d.y * 0.35 - d.x * 0.25, 0.03);
    g.strokeStyle = `rgba(200,240,240,${0.35 * Math.sin(u * Math.PI)})`; g.lineWidth = 3; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.stroke();
  }
  g.restore();
  // ตะกอนพุ่งเป็นสายตามทิศ (บนจอ)
  const p0 = P(info.cols / 2, info.rows / 2), p1 = P(info.cols / 2 + d.x, info.rows / 2 + d.y), sx = p1[0] - p0[0], sy = p1[1] - p0[1], L = Math.hypot(sx, sy) || 1, ux = sx / L, uy = sy / L;
  g.strokeStyle = "rgba(190,200,180,.45)"; g.lineWidth = 1.4;
  for (let i = 0; i < 160; i++) {
    const k = (t * (0.6 + (i % 7) * 0.08) + i * 0.137) % 1, h1 = Math.sin(i * 12.9898) * 43758.5453, r = h1 - Math.floor(h1);
    const x = X0 + ((r * W + ux * k * W * 1.2) % W + W) % W, y = Y0 + ((((i * 0.6180339) % 1) * H + uy * k * H * 1.2) % H + H) % H;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - ux * 14, y - uy * 14); g.stroke();
  }
}
// เส้นพัดตอนจบเทิร์น
export function reefStormFx(g, fd, now) {
  for (const e of fd.fx || []) {
    if (e.kind !== "nt_storm_push") continue;
    const k = fxT(e, now, 1000); if (k >= 1) continue;
    for (const m of e.moves || []) streak(g, m, e.dir ? (e.dir.x || e.dir.y) : 1, k);
  }
}
