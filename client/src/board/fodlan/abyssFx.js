// ============================================================
//  Nautilus ชั้น 5 "ห้วงเหวไร้แสง" — ภาพ + ฉาก + เสียงของลูกเล่น/ความมืด (server/fodlan/ntAbyss.js · fd.abyss)
//   ของบนกระดาน: ไฟล่อปลาตกเบ็ด (ก้านโค้งจากร่อง + ลูกไฟ + หัวปลาซุ่มในร่อง) · ยานสำรวจตก (ไฟกะพริบ = พลุพร้อม)
//   พื้น: แสงแพลงก์ตอนเต้น (ดงที่ถูกทุบ = ดับ) · วงแสงไฟล่อ/พลุ/ไฟตัวเรือ · ออร่าคนตัวเรือง
//   ทับตัวละคร: หมอกหมึกมืด · พลุลอยค้าง · ความมืดบีบจากขอบ (หนวดดำคืบ)
//   ฉาก: nt_angler (ปลาตกเบ็ดยักษ์พุ่งงับ) · nt_angler_snap (โผล่งับจากร่อง) · nt_flare · nt_ink · nt_bridge · nt_glow · nt_brine
//        nt_dark_start · nt_dark_bite · nt_dark_lift · nt_fall (ดิ่งลงเหว) · nt_surface · nt_dodge
//  สัตว์ทุกตัวหันตามทิศที่เคลื่อนบนจอ (ผู้ใช้ทัก 2026-11-19: ปลาว่ายถอยหลัง) — มุมจาก P() สองจุด
// ============================================================
import { P, depthOf, glow } from "../boardGeo";
import { fxT, fxOnce } from "./index";
import { playSfx, registerSounds } from "../../audio";

const TAU = Math.PI * 2;
const K = (x, y) => `${x},${y}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeIn = (k) => k * k * k;
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
export const ABYSS_FX = { nt_bloom: 2400, nt_angler: 2000, nt_angler_snap: 1300, nt_flare: 1900, nt_ink: 1700, nt_bridge: 1900, nt_glow: 1000, nt_brine: 900, nt_dark_start: 2600, nt_dark_bite: 1600, nt_dark_lift: 2000, nt_fall: 1400, nt_surface: 1100, nt_dodge: 700, nt_shove: 500 };
// ค่าเริ่ม (หน้าทดลองกระดานที่ไม่มีข้อมูล server) — ตรงกับ ntAbyss.js LURES
const LURES0 = [{ id: 1, x: 1, y: 5, lair: { x: 1, y: 6 }, on: true }, { id: 2, x: 8, y: 9, lair: { x: 8, y: 8 }, on: true }, { id: 3, x: 17, y: 8, lair: { x: 17, y: 7 }, on: true }];

let SND = false;
const SFX = ["song", "song2", "blue", "whoosh", "whip", "boom", "impact", "splash", "bubbles", "swirl", "gulp", "slap", "squish", "rumble", "call", "deepimpact", "l11_flare", "l11_collapse", "l11_clicks", "l11_dark", "l11_glow"];
function snd(k, gain = 1, delay = 0) {
  if (!SND) { SND = true; registerSounds(Object.fromEntries(SFX.map((n) => [`nta_${n}`, `/nautilus/sfx/${n}.mp3`]))); }
  const go = () => playSfx(`nta_${k}`, { gain }); if (delay > 0) setTimeout(go, delay); else go();
}
const A = (fd) => (fd && fd.abyss) || null;
export function abyssAmbient(k) { snd(k, k === "l11_clicks" ? 0.35 : k === "boom" ? 0.8 : k === "rumble" || k === "l11_dark" ? 0.5 : 0.22); }
const angOf = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);

// ---------- ของบนกระดาน (เรียงความลึก) ----------
export function abyssItems(list, g, fd, info, now, Z) {
  const ab = A(fd), t = now / 1000;
  for (const l of (ab && ab.lures) || LURES0) list.push({ d: depthOf(l.x + 0.5, l.y + 0.5) + 0.05, f: () => lure(g, l, t) });
  const probes = (ab && ab.probes) || Z.probe.map((q) => ({ ...q, ready: true }));
  for (const q of probes) list.push({ d: depthOf(q.x + 0.5, q.y + 0.5), f: () => probe(g, q, t) });
}
// ไฟล่อ: ก้านโค้งงอกจากร่อง (หัวปลาซุ่มใต้ปากร่อง) แล้วห้อยลูกไฟเหนือช่องล่อ · ดับ = ก้านหดหาย เหลือแต่เงาฟัน
function lure(g, l, t) {
  const lx = l.lair.x + 0.5, ly = l.lair.y + 0.5, tx = l.x + 0.5, ty = l.y + 0.5;
  // หัวปลาในร่อง (มองเห็นรางๆ ในแสงล่อ) — หันหน้าไปทางช่องล่อ
  const head = P(lx, ly, -0.35), face = P(tx, ty, -0.35), ang = angOf(head, face), s = head[2];
  anglerHead(g, head[0], head[1], s * 0.55, ang, l.on ? 0.55 : 0.25, l.on ? 0.15 : 0, t);
  if (!l.on) return;
  const bob = Math.sin(t * 1.4 + l.id) * 0.08, sway = Math.sin(t * 0.9 + l.id * 2) * 0.06;
  const a = P(lx + (tx - lx) * 0.2, ly + (ty - ly) * 0.2, -0.05), c = P(lx + (tx - lx) * 0.55, ly + (ty - ly) * 0.55, 1.5), e = P(tx + sway, ty, 0.95 + bob);
  g.strokeStyle = "rgba(60,50,45,.9)"; g.lineWidth = Math.max(1.2, s * 0.025); g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(c[0], c[1], e[0], e[1]); g.stroke();
  const pulse = 0.75 + 0.25 * Math.sin(t * 3.1 + l.id);
  glow(g, e[0], e[1], e[2] * 0.8, "150,255,230", 0.35 * pulse);
  glow(g, e[0], e[1], e[2] * 0.22, "220,255,245", 0.9 * pulse);
  g.fillStyle = "#eafff8"; g.beginPath(); g.arc(e[0], e[1], e[2] * 0.045, 0, TAU); g.fill();
}
// หัวปลาตกเบ็ด (ในพื้นที่หมุนตามทิศ: ปากไปทาง +x) — open 0..1 อ้าปาก
function anglerHead(g, x, y, w, ang, alpha, open, t) {
  g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha *= alpha;
  const flip = Math.cos(ang) < 0 ? -1 : 1; g.scale(1, flip); // ท้องอยู่ล่างเสมอ
  g.fillStyle = "#14161b"; g.beginPath(); g.ellipse(-w * 0.2, 0, w, w * 0.62, 0, 0, TAU); g.fill();
  // ขากรรไกรล่างยื่น + ปากอ้า
  const m = w * (0.12 + open * 0.45);
  g.fillStyle = "#050507"; g.beginPath(); g.moveTo(w * 0.15, -w * 0.05); g.lineTo(w * 0.85, -m * 0.6); g.lineTo(w * 0.9, m); g.closePath(); g.fill();
  g.fillStyle = "rgba(235,235,220,.85)";
  for (let i = 0; i < 7; i++) {
    const u = 0.25 + i * 0.1;
    g.beginPath(); g.moveTo(w * u, -m * 0.6 * u); g.lineTo(w * (u + 0.03), -m * 0.6 * u + w * 0.14); g.lineTo(w * (u + 0.06), -m * 0.6 * u); g.fill();
    g.beginPath(); g.moveTo(w * u, m * u); g.lineTo(w * (u + 0.03), m * u - w * 0.16); g.lineTo(w * (u + 0.06), m * u); g.fill();
  }
  // ตาเล็กขุ่น
  g.fillStyle = `rgba(200,220,200,${0.6 + 0.2 * Math.sin(t * 2)})`; g.beginPath(); g.arc(w * 0.2, -w * 0.32, w * 0.06, 0, TAU); g.fill();
  g.restore();
}
// ยานสำรวจตก: โครงสามขาเหลืองซีด ตัวทรงกลม เอียงจมโคลน · ราวพลุ · ไฟกะพริบแดง (พร้อมยิง)
function probe(g, q, t) {
  const cx = q.x + 0.5, cy = q.y + 0.5, [bx, by, s] = P(cx, cy);
  g.fillStyle = "rgba(0,0,0,.55)"; g.beginPath(); g.ellipse(bx, by, s * 0.45, s * 0.17, 0, 0, TAU); g.fill();
  g.strokeStyle = "#8a7a3a"; g.lineWidth = Math.max(1.5, s * 0.03);
  const top = P(cx + 0.05, cy, 0.75);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.4, f = P(cx + Math.cos(a) * 0.38, cy + Math.sin(a) * 0.3, 0); g.beginPath(); g.moveTo(f[0], f[1]); g.lineTo(top[0], top[1] + s * 0.12); g.stroke(); }
  const body = P(cx + 0.05, cy, 0.62);
  g.fillStyle = "#b39a3e"; g.beginPath(); g.arc(body[0], body[1], s * 0.2, 0, TAU); g.fill();
  g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.arc(body[0] + s * 0.06, body[1] + s * 0.05, s * 0.16, 0, TAU); g.fill();
  g.fillStyle = "#2a3540"; g.beginPath(); g.arc(body[0] - s * 0.06, body[1] - s * 0.03, s * 0.07, 0, TAU); g.fill(); // ช่องกล้อง
  g.fillStyle = "rgba(160,220,255,.35)"; g.beginPath(); g.arc(body[0] - s * 0.08, body[1] - s * 0.05, s * 0.025, 0, TAU); g.fill();
  // ราวท่อพลุ
  for (let i = 0; i < 3; i++) { g.fillStyle = q.ready ? "#c23a2c" : "#4a2a28"; g.fillRect(body[0] + s * (0.12 + i * 0.05), body[1] - s * 0.3, s * 0.035, s * 0.18); }
  // สายเคเบิลขาดลากโคลน
  const c0 = P(cx + 0.1, cy, 0.5), c1 = P(cx + 0.45, cy + 0.35, 0); g.strokeStyle = "rgba(40,40,40,.8)"; g.lineWidth = 1; g.beginPath(); g.moveTo(c0[0], c0[1]); g.quadraticCurveTo(c1[0], c0[1], c1[0], c1[1]); g.stroke();
  const bl = P(cx + 0.05, cy, 0.92), on = q.ready && (t % 1.6) < 0.25;
  g.fillStyle = on ? "#ff4030" : "#3a1410"; g.beginPath(); g.arc(bl[0], bl[1], s * 0.03, 0, TAU); g.fill();
  if (on) glow(g, bl[0], bl[1], s * 0.4, "255,60,40", 0.5);
}

// ---------- พื้น (ใต้ตัวละคร): แสง ----------
export function abyssGround(g, fd, info, now, lowQ, Z) {
  const ab = A(fd), t = now / 1000;
  const darkTiles = new Set();
  for (const p of (ab && ab.patches) || []) if (!p.lit) for (const q of p.tiles) darkTiles.add(K(q.x, q.y));
  g.save(); g.globalCompositeOperation = "lighter";
  // แพลงก์ตอน: วงแสงฟ้าเขียวใต้ดง + จุดเรืองเต้น
  for (const p of Z.plankton) {
    if (darkTiles.has(K(p.x, p.y))) continue;
    const wave = 0.5 + 0.5 * Math.sin(t * 1.6 - (p.x + p.y) * 0.5), bloom = ab && ab.bloom ? 1.8 : 1; // คลื่นแสงไล่ข้ามดง · บาน = กว้าง/สว่างขึ้น
    const [sx, sy, s] = P(p.x + 0.5, p.y + 0.5, 0.02), k = (0.65 + 0.35 * wave) * (ab && ab.bloom ? 1.4 : 1);
    glow(g, sx, sy, s * 1.3 * bloom, "40,220,200", 0.16 * k);
    for (let i = 0; i < (lowQ ? 6 : 14); i++) {
      const px = p.x + hash(p.x * 9 + i, p.y), py = p.y + hash(p.x, p.y * 9 + i), tw = 0.5 + 0.5 * Math.sin(t * (1.5 + hash(i, p.x) * 2) + i);
      const [qx, qy, qs] = P(px, py, 0.03 + Math.sin(t + i) * 0.03);
      g.fillStyle = `rgba(${i % 3 ? "90,255,220" : "120,200,255"},${0.35 + 0.5 * tw})`; g.fillRect(qx - qs * 0.012, qy - qs * 0.012, qs * 0.025, qs * 0.025);
    }
  }
  // วงแสงไฟล่อ (ล่อให้เข้าใกล้)
  for (const l of (ab && ab.lures) || LURES0) if (l.on) { const [sx, sy, s] = P(l.x + 0.5, l.y + 0.5); glow(g, sx, sy, s * 1.2, "100,240,210", 0.13 + 0.04 * Math.sin(t * 3 + l.id)); }
  // ไฟตัวเรือ
  if (fd && fd.ship) { const sh = fd.ship, [sx, sy, s] = P(sh.x + sh.w / 2, sh.y + sh.h / 2 + 0.6); glow(g, sx, sy, s * 3.2, "150,190,255", 0.12); }
  // พลุค้าง: วงแสงขาวอมแดงกว้าง
  for (const f of (ab && ab.flares) || []) { const [sx, sy, s] = P(f.x + 0.5, f.y + 0.5), fl = 0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 7); glow(g, sx, sy, s * (f.r + 1), "225,240,255", 0.3 * fl); glow(g, sx, sy, s * 1.2, "150,200,255", 0.18 * fl); }
  // คนตัวเรือง
  for (const u of (ab && ab.glow) || []) { const [sx, sy, s] = P(u.x + 0.5, u.y + 0.5), k = 0.8 + 0.2 * Math.sin(t * 2.4 + u.x); glow(g, sx, sy, s * 1.4, "60,240,210", 0.2 * k); }
  g.restore();
}

// ---------- ทับตัวละคร: หมึกมืด · พลุลอย · ความมืดบีบ ----------
export function abyssAir(g, fd, info, units, now, lowQ, view, Z) {
  const ab = A(fd), t = now / 1000; if (!ab) return;
  // ประกายรอบคนตัวเรือง
  g.save(); g.globalCompositeOperation = "lighter";
  for (const u of ab.glow || []) for (let i = 0; i < 6; i++) {
    const a = t * 1.2 + i * 1.05, [sx, sy, s] = P(u.x + 0.5 + Math.cos(a) * 0.32, u.y + 0.5 + Math.sin(a) * 0.32, 0.4 + ((t * 0.4 + i / 6) % 1) * 1.2);
    glow(g, sx, sy, s * 0.06, "120,255,230", 0.8);
  }
  // พลุลอยค้างกลางน้ำ ร่วงช้า
  for (const f of ab.flares || []) {
    const [sx, sy, s] = P(f.x + 0.5, f.y + 0.5, 2.2 + Math.sin(t * 0.7) * 0.1), fl = 0.8 + 0.2 * Math.sin(t * 23);
    glow(g, sx, sy, s * 0.9, "220,235,255", 0.45 * fl); glow(g, sx, sy, s * 0.18, "255,255,250", 1);
    for (let i = 0; i < 5; i++) { const k = (t * 0.5 + i / 5) % 1; const [px, py, ps] = P(f.x + 0.5 + Math.sin(i * 2 + t) * 0.1, f.y + 0.5, 2.2 - k * 1.6); g.fillStyle = `rgba(255,170,150,${0.6 * (1 - k)})`; g.fillRect(px, py, ps * 0.02, ps * 0.02); }
  }
  g.restore();
  // หมอกหมึกมืด (ดงแพลงก์ตอนที่ถูกทุบ)
  for (const z of ab.ink || []) for (const k of z.tiles) {
    const [x, y] = k.split(",").map(Number);
    for (let i = 0; i < 2; i++) {
      const [sx, sy, s] = P(x + 0.5 + Math.sin(t * 0.5 + x + i) * 0.15, y + 0.5 + Math.cos(t * 0.4 + y + i) * 0.12, 0.4 + i * 0.5);
      const gr = g.createRadialGradient(sx, sy, 0, sx, sy, s * 0.75); gr.addColorStop(0, "rgba(2,3,6,.75)"); gr.addColorStop(1, "rgba(2,3,6,0)");
      g.fillStyle = gr; g.beginPath(); g.ellipse(sx, sy, s * 0.75, s * 0.5, 0, 0, TAU); g.fill();
    }
  }
  // ความมืดบีบ: ช่องที่ถูกกลืน = ดำหนา + หนวดดำคืบที่ขอบเขต + ตาแดงริบหรี่
  const zn = ab.zone;
  if (zn && zn.depth > 0) {
    const edge = (x, y) => Math.min(x, y, info.cols - 1 - x, info.rows - 1 - y);
    for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) {
      const e = edge(x, y); if (e >= zn.depth) continue;
      const a = 0.55 + 0.08 * Math.sin(t * 1.3 + x * 0.7 + y), q = [P(x, y, 0.05), P(x + 1, y, 0.05), P(x + 1, y + 1, 0.05), P(x, y + 1, 0.05)];
      g.fillStyle = `rgba(0,0,0,${a})`; g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
      if (e === zn.depth - 1 && !lowQ) { // หนวดดำคืบเข้าหาด้านใน
        const dx = x < zn.depth ? 1 : x > info.cols - 1 - zn.depth ? -1 : 0, dy = y < zn.depth ? 1 : y > info.rows - 1 - zn.depth ? -1 : 0;
        const r = 0.35 + 0.25 * Math.sin(t * 2 + x * 3 + y * 5);
        const b0 = P(x + 0.5, y + 0.5, 0.1), b1 = P(x + 0.5 + dx * r * 1.4, y + 0.5 + dy * r * 1.4, 0.15 + r * 0.3);
        g.strokeStyle = "rgba(0,0,0,.8)"; g.lineWidth = b0[2] * 0.12; g.lineCap = "round"; g.beginPath(); g.moveTo(b0[0], b0[1]); g.quadraticCurveTo(b0[0] + Math.sin(t * 3 + x) * b0[2] * 0.2, (b0[1] + b1[1]) / 2, b1[0], b1[1]); g.stroke(); g.lineCap = "butt";
      }
    }
    for (let i = 0; i < 6; i++) { // ตาซีดในความมืด (ไม่ใช้สีแดงในชั้นนี้ — ผู้ใช้ 2026-11-19)
      const slot = Math.floor(t / 2.5 + i * 0.37), d = (t / 2.5 + i * 0.37) % 1; if (d > 0.4) continue;
      const side = Math.floor(hash(slot, i) * 4), u = hash(i, slot), ex = side === 0 ? u * info.cols : side === 1 ? info.cols - 0.6 : side === 2 ? u * info.cols : 0.6, ey = side === 0 ? 0.6 : side === 1 ? u * info.rows : side === 2 ? info.rows - 0.6 : u * info.rows;
      const [sx, sy, s] = P(ex, ey, 0.6), a = Math.sin((d / 0.4) * Math.PI);
      for (const o of [-1, 1]) glow(g, sx + o * s * 0.12, sy, s * 0.1, "200,230,255", 0.6 * a);
    }
  }
}

// ---------- ฉาก (ทับตัวละคร) ----------
export function abyssFx(g, fd, info, now, Z) {
  for (const e of fd.fx || []) {
    const dur = ABYSS_FX[e.kind]; if (!dur) continue;
    if (fxOnce(e)) sounds(e);
    const k = fxT(e, now, dur); if (k >= 1) continue;
    if (e.kind === "nt_angler") drawAngler(g, e, k, now, false);
    else if (e.kind === "nt_angler_snap") drawAngler(g, e, k, now, true);
    else if (e.kind === "nt_flare") drawFlare(g, e, k);
    else if (e.kind === "nt_ink") drawInk(g, e, k);
    else if (e.kind === "nt_bridge") drawBridge(g, e, k);
    else if (e.kind === "nt_bloom") drawBloom(g, e, k, Z);
    else if (e.kind === "nt_glow") ring(g, e, k, "90,255,220", 1);
    else if (e.kind === "nt_brine") drawBrine(g, e, k);
    else if (e.kind === "nt_dark_start") drawDarkWave(g, info, k, false);
    else if (e.kind === "nt_dark_lift") drawDarkWave(g, info, k, true);
    else if (e.kind === "nt_dark_bite") for (const h of e.hits || []) drawClaw(g, h, k);
    else if (e.kind === "nt_fall") drawFall(g, e, k, now);
    else if (e.kind === "nt_surface") drawSurface(g, e, k);
    else if (e.kind === "nt_dodge") drawDodge(g, e, k);
  }
  void Z;
}
function sounds(e) {
  switch (e.kind) {
    case "nt_angler": snd("l11_clicks", 0.6); snd("call", 0.7, 350); snd("slap", 1, 820); snd("gulp", 0.8, 900); break;
    case "nt_angler_snap": snd("whip", 0.8); snd("gulp", 0.9, 300); break;
    case "nt_flare": snd("l11_flare", 1); break;
    case "nt_ink": snd("squish", 0.9); snd("bubbles", 0.6, 150); break;
    case "nt_bridge": snd("l11_collapse", 1); snd("rumble", 0.7, 200); break;
    case "nt_glow": snd("l11_glow", 0.45); break;
    case "nt_bloom": snd("l11_glow", 0.7); snd("song", 0.25, 400); break;
    case "nt_brine": snd("bubbles", 0.5); break;
    case "nt_dark_start": snd("l11_dark", 1); break;
    case "nt_dark_bite": if ((e.hits || []).length) { snd("whip", 0.7); snd("deepimpact", 0.6, 120); } break;
    case "nt_dark_lift": snd("l11_glow", 0.6); break;
    case "nt_fall": snd("whoosh", 0.8); snd("rumble", 0.6, 250); break;
    case "nt_surface": snd("splash", 0.6); break;
    default: break;
  }
}
// ปลาตกเบ็ดยักษ์: พุ่งจากร่อง → อ้าปากงับเป้า → ถอยกลับเข้าความมืด (หันหน้าตามทิศที่ว่ายบนจอ)
function drawAngler(g, e, k, now, snap) {
  const from = e.lair || e.lure, to = e.to; if (!from || !to) return;
  const t = now / 1000, go = snap ? 0.35 : 0.42, bite = snap ? 0.55 : 0.6;
  let u, z, open, alpha = 1;
  if (k < go) { u = easeOut(k / go); open = u; z = lerp(-1.2, 0.7, u); }
  else if (k < bite) { u = 1; open = 1 - (k - go) / (bite - go); z = 0.7; }
  else { u = 1 - easeIn((k - bite) / (1 - bite)); open = 0; z = lerp(-1.2, 0.7, u); alpha = 1 - (k - bite) / (1 - bite) * 0.6; }
  const scale = snap ? 0.8 : 1.15, x = lerp(from.x, to.x, u) + 0.5, y = lerp(from.y, to.y, u) + 0.5;
  const here = P(x, y, z), tgt = P(to.x + 0.5, to.y + 0.5, 0.7), back = P(from.x + 0.5, from.y + 0.5, z);
  const ang = k < bite ? angOf(back, tgt) : angOf(tgt, back); // ขากลับหันหัวลงร่อง (หันตามทิศที่ว่ายจริง)
  // ลำตัว (เงาใหญ่) + ไฟล่อบนหัว
  g.save(); g.globalAlpha = alpha;
  const w = here[2] * 0.55 * scale;
  anglerHead(g, here[0], here[1], w, ang, 1, open, t);
  const lx = here[0] + Math.cos(ang) * w * 0.9, ly = here[1] + Math.sin(ang) * w * 0.9 - w * 0.7;
  g.strokeStyle = "rgba(60,50,45,.9)"; g.lineWidth = Math.max(1, w * 0.04); g.beginPath(); g.moveTo(here[0] + Math.cos(ang) * w * 0.1, here[1] - w * 0.5); g.quadraticCurveTo(here[0] + Math.cos(ang) * w * 0.4, here[1] - w * 1.1, lx, ly); g.stroke();
  glow(g, lx, ly, w * 0.5, "150,255,230", 0.6); glow(g, lx, ly, w * 0.12, "230,255,250", 1);
  g.restore();
  // งับ: แฟลชฟัน + เลือด
  if (k >= go && k < bite + 0.15 && e.hit) {
    const q = clamp((k - go) / 0.25, 0, 1);
    g.strokeStyle = `rgba(255,255,255,${1 - q})`; g.lineWidth = 2; g.beginPath(); g.ellipse(tgt[0], tgt[1], tgt[2] * (0.3 + q * 0.4), tgt[2] * (0.15 + q * 0.2), 0, 0, TAU); g.stroke();
    g.fillStyle = `rgba(170,20,30,${0.7 * (1 - q)})`; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.beginPath(); g.arc(tgt[0] + Math.cos(a) * tgt[2] * q * 0.4, tgt[1] + Math.sin(a) * tgt[2] * q * 0.25, tgt[2] * 0.03, 0, TAU); g.fill(); }
  }
}
function drawFlare(g, e, k) {
  const a = e.from, b = e.to; if (!a || !b) return;
  if (k < 0.35) { // ลูกพลุพุ่งโค้งทิ้งฟองเป็นทาง
    const u = easeOut(k / 0.35);
    for (let i = 0; i < 6; i++) { const uu = Math.max(0, u - i * 0.04), [sx, sy, s] = P(lerp(a.x, b.x, uu) + 0.5, lerp(a.y, b.y, uu) + 0.5, 0.8 + Math.sin(uu * Math.PI) * 2.2); glow(g, sx, sy, s * (0.12 - i * 0.015), "255,190,160", 0.9 - i * 0.14); }
    return;
  }
  const q = (k - 0.35) / 0.65, [sx, sy, s] = P(b.x + 0.5, b.y + 0.5, 2.2);
  g.save(); g.globalCompositeOperation = "lighter";
  glow(g, sx, sy, s * (0.5 + q * 3), "255,240,235", 0.9 * (1 - q * 0.7));
  for (let i = 0; i < 16; i++) { const an = (i / 16) * TAU, r = s * (0.2 + easeOut(q) * 1.4); g.fillStyle = `rgba(255,${180 + (i % 3) * 25},150,${1 - q})`; g.fillRect(sx + Math.cos(an) * r, sy + Math.sin(an) * r * 0.7 + q * s * 0.4, s * 0.03, s * 0.03); }
  g.restore();
  // วงตาพร่า 3×3 บนพื้น
  const c = [P(b.x - 1, b.y - 1), P(b.x + 2, b.y - 1), P(b.x + 2, b.y + 2), P(b.x - 1, b.y + 2)];
  g.fillStyle = `rgba(255,240,230,${0.22 * (1 - q)})`; g.beginPath(); c.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
}
function drawInk(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.3);
  if (k < 0.4) { // แพลงก์ตอนแตกกระจายแล้วดับ
    const q = k / 0.4;
    g.save(); g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 24; i++) { const an = hash(i, 3) * TAU, r = s * easeOut(q) * (0.5 + hash(i, 4) * 1.2); g.fillStyle = `rgba(90,255,220,${1 - q})`; g.fillRect(sx + Math.cos(an) * r, sy + Math.sin(an) * r * 0.6 - q * s * 0.3, s * 0.025, s * 0.025); }
    g.restore();
  }
  const q = clamp((k - 0.2) / 0.8, 0, 1);
  for (const key of e.tiles || []) { // หมึกดำแผ่คลุม
    const [x, y] = key.split(",").map(Number), [tx, ty, ts] = P(x + 0.5, y + 0.5, 0.4), r = ts * 0.8 * easeOut(q);
    const gr = g.createRadialGradient(tx, ty, 0, tx, ty, Math.max(1, r)); gr.addColorStop(0, `rgba(0,0,0,${0.8 * Math.min(1, q * 2)})`); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.beginPath(); g.ellipse(tx, ty, Math.max(1, r), Math.max(1, r * 0.6), 0, 0, TAU); g.fill();
  }
}
function drawBridge(g, e, k) {
  for (const t of e.tiles || []) for (let i = 0; i < 7; i++) {
    const drop = easeIn(clamp(k * 1.2 - i * 0.04, 0, 1)) * 4, [sx, sy, s] = P(t.x + 0.2 + hash(t.x + i, t.y) * 0.6, t.y + 0.2 + hash(t.x, t.y + i) * 0.6, -drop);
    g.fillStyle = `rgba(${i % 2 ? "42,48,61" : "26,31,42"},${1 - k * 0.8})`; g.beginPath(); g.ellipse(sx, sy, s * (0.12 + hash(i, t.y) * 0.1), s * 0.08, k * 4 + i, 0, TAU); g.fill();
  }
  for (const t of e.tiles || []) { const [sx, sy, s] = P(t.x + 0.5, t.y + 0.5, 0.2); g.fillStyle = `rgba(120,130,150,${0.3 * (1 - k)})`; g.beginPath(); g.ellipse(sx, sy, s * (0.4 + k * 0.6), s * (0.2 + k * 0.3), 0, 0, TAU); g.fill(); }
}
function ring(g, e, k, rgb, z) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.05);
  g.strokeStyle = `rgba(${rgb},${1 - k})`; g.lineWidth = 2; g.beginPath(); g.ellipse(sx, sy, s * (0.2 + k * 0.6), s * (0.1 + k * 0.3), 0, 0, TAU); g.stroke();
  const [px, py, ps] = P(e.x + 0.5, e.y + 0.5, z * k); glow(g, px, py, ps * 0.4, rgb, 0.6 * (1 - k));
}
// ร่องหายใจ: วงแสงแผ่จากทุกดงแพลงก์ตอน
function drawBloom(g, e, k, Z) {
  g.save(); g.globalCompositeOperation = "lighter";
  for (const p of Z.plankton) {
    const [sx, sy, s] = P(p.x + 0.5, p.y + 0.5, 0.05), r = s * (0.3 + easeOut(k) * 2.4);
    g.strokeStyle = `rgba(90,255,220,${0.45 * (1 - k)})`; g.lineWidth = 2; g.beginPath(); g.ellipse(sx, sy, r, r * 0.45, 0, 0, TAU); g.stroke();
    glow(g, sx, sy, s * 1.6, "60,240,210", 0.25 * Math.sin(k * Math.PI));
  }
  g.restore(); void e;
}
function drawBrine(g, e, k) {
  for (let i = 0; i < 7; i++) { const u = (k + i / 7) % 1, [sx, sy, s] = P(e.x + 0.3 + hash(i, 1) * 0.4, e.y + 0.3 + hash(i, 2) * 0.4, u * 0.8); g.strokeStyle = `rgba(150,230,120,${0.7 * (1 - k)})`; g.lineWidth = 1; g.beginPath(); g.arc(sx, sy, s * 0.03, 0, TAU); g.stroke(); }
}
// ความมืดคลื่นเข้าจากขอบ (start) / ถอยออก (lift)
function drawDarkWave(g, info, k, lift) {
  const d = lift ? (1 - easeOut(k)) * 4 : easeOut(Math.min(1, k * 1.4)) * 4, fade = lift ? 1 - k : k < 0.7 ? 1 : (1 - k) / 0.3;
  for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) {
    const e = Math.min(x, y, info.cols - 1 - x, info.rows - 1 - y); if (e >= d) continue;
    const a = clamp(d - e, 0, 1) * 0.6 * fade, q = [P(x, y, 0.1), P(x + 1, y, 0.1), P(x + 1, y + 1, 0.1), P(x, y + 1, 0.1)];
    g.fillStyle = `rgba(0,0,0,${a})`; g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
  }
}
// มือดำจากความมืดคว้า
function drawClaw(g, h, k) {
  const [sx, sy, s] = P(h.x + 0.5, h.y + 0.5, 0.2), up = Math.sin(Math.min(1, k * 1.5) * Math.PI);
  g.strokeStyle = `rgba(0,0,0,${0.9 * (1 - k * 0.5)})`; g.lineCap = "round";
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.35; g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(sx + (i - 2) * s * 0.06, sy + s * 0.1); g.quadraticCurveTo(sx + Math.cos(a) * s * 0.4 * up, sy + Math.sin(a) * s * 0.5 * up, sx + Math.cos(a) * s * 0.25 * up, sy + Math.sin(a) * s * 0.75 * up); g.stroke(); }
  g.lineCap = "butt";
  glow(g, sx, sy, s * 0.5, "200,20,20", 0.35 * (1 - k));
}
function drawFall(g, e, k, now) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, -k * 2.5);
  g.strokeStyle = `rgba(110,140,220,${0.6 * (1 - k)})`; g.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(sx, sy, s * (0.5 - k * 0.4) * (1 - i * 0.2), s * (0.2 - k * 0.15) * (1 - i * 0.2), 0, now / 160 + i, now / 160 + i + 3.6); g.stroke(); }
  g.fillStyle = `rgba(0,0,0,${0.7 * (1 - k)})`; g.beginPath(); g.ellipse(sx, sy, s * 0.2 * (1 - k), s * 0.35 * (1 - k), 0, 0, TAU); g.fill();
}
function drawSurface(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0);
  for (let i = 0; i < 10; i++) { const u = (k + i / 10) % 1; g.strokeStyle = `rgba(170,210,255,${0.7 * (1 - k)})`; g.lineWidth = 1; g.beginPath(); g.arc(sx + Math.sin(i * 2.1) * s * 0.25, sy - u * s * 1.2, s * (0.03 + (i % 3) * 0.015), 0, TAU); g.stroke(); }
}
function drawDodge(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.6);
  g.strokeStyle = `rgba(190,220,255,${0.8 * (1 - k)})`; g.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { const x = sx - s * 0.3 - k * s * 0.4 - i * s * 0.12; g.beginPath(); g.moveTo(x, sy - s * 0.2 + i * s * 0.15); g.lineTo(x + s * 0.25, sy - s * 0.2 + i * s * 0.15); g.stroke(); }
}
