// ============================================================
//  Nautilus ชั้น 3 — ภาพ + ฉาก + เสียงของลูกเล่นโต้ตอบ (server/fodlan/ntVents.js · fd.vents)
//   ของบนกระดาน: ปล่องแรงดัน (เนินกรวยมีปากเรือง พ่นไอเป็นพักๆ · พัก = มืด) · หินลาวา (ก้อนเปลือกดำ รอยร้าวเรือง ไอร้อน)
//   ฉาก: nt_jet (น้ำเดือดพุ่งตามแนว) · nt_plug (ฝาหินกระแทกปิดปาก) · nt_vent_blast (ระเบิด 3×3) · nt_roll (หินกลิ้ง/จมลาวา)
//        nt_launch (เสาแรงดันดีด → โค้ง → กระแทกตก) · nt_erupt (ปล่องพ่นตามจังหวะ) · nt_hotrock (ฝนหินร้อน) · nt_quake (หินหล่น พื้นแตก)
//        nt_wx_eruption / nt_wx_quake (เริ่มสภาพอากาศ) · nt_singe (ไหม้บนรอยแยก) · nt_rock_back (หินลาวาผุดกลับ) · nt_lava_dunk · nt_scald
//        ของกลาง ntKit: nt_dodge · nt_fall (ร่วงลงหลุมยุบ) · nt_surface (โผล่ที่จุดเกิด)
//   เสียง: /nautilus/sfx/l9_*.mp3 (ไอน้ำ ลาวาฉ่า ลาวาเดือด แผ่นดินไหว หินถล่ม หินกลิ้ง ระเบิด) + เสียงกลางของโหมด
// ============================================================
import { P, depthOf, glow } from "../boardGeo";
import { fxT, fxOnce } from "./index";
import { hash } from "./reef";
import { playSfx, registerSounds } from "../../audio";

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
export const VENTS_FX = {
  nt_jet: 1500, nt_plug: 900, nt_vent_blast: 1700, nt_roll: 1800, nt_launch: 1600, nt_erupt: 1500, nt_hotrock: 1800, nt_quake: 2000,
  nt_wx_eruption: 2200, nt_wx_quake: 2200, nt_singe: 900, nt_rock_back: 1000, nt_lava_dunk: 1100, nt_scald: 900,
  nt_dodge: 700, nt_fall: 1300, nt_surface: 1100, nt_shove: 500,
};
// ความสูงปล่องควันดำ (ใช้ร่วม: ตัวปล่อง/ควัน/ฉากพ่น)
export const ventH = (x, y) => 2.2 + hash(x * 3, y * 5) * 1.1;

let SND = false;
const KEYS = ["l9_steam", "l9_sizzle", "l9_lava", "l9_quake", "l9_debris", "l9_roll", "l9_blast", "boom", "impact", "deepimpact", "bubbles", "whoosh", "splash", "rumble", "swirl"];
function snd(k, gain = 1, delay = 0) {
  if (!SND) { SND = true; registerSounds(Object.fromEntries(KEYS.map((n) => [`ntv_${n}`, `/nautilus/sfx/${n}.mp3`]))); }
  const go = () => playSfx(`ntv_${k}`, { gain }); if (delay > 0) setTimeout(go, delay); else go();
}

// ---------- ของบนกระดาน (เรียงความลึก) ----------
export function ventsItems(list, g, fd, info, now, Z) {
  const v = fd && fd.vents, t = now / 1000;
  const pv = (v && v.pvents) || (Z ? Z.pvent.map((p) => ({ x: p.x, y: p.y, rest: 0 })) : []);
  for (const p of pv) list.push({ d: depthOf(p.x + 0.5, p.y + 0.5) - 0.05, f: () => pressureVent(g, p, t) });
  for (const r of (v && v.rocks) || []) list.push({ d: depthOf(r.x + 0.5, r.y + 0.5), f: () => lavaRock(g, r.x + 0.5, r.y + 0.5, 0, t + r.id, 1) });
}
function pressureVent(g, p, t) {
  const [cx, cy, s] = P(p.x + 0.5, p.y + 0.5, 0), ready = !(p.rest > 0);
  g.fillStyle = "rgba(0,0,0,.45)"; g.beginPath(); g.ellipse(cx, cy, s * 0.45, s * 0.17, 0, 0, TAU); g.fill();
  // เนินกรวยเตี้ย
  g.fillStyle = "#2d2421"; g.beginPath(); g.moveTo(cx - s * 0.42, cy); g.quadraticCurveTo(cx - s * 0.2, cy - s * 0.26, cx - s * 0.12, cy - s * 0.24); g.lineTo(cx + s * 0.12, cy - s * 0.24); g.quadraticCurveTo(cx + s * 0.2, cy - s * 0.26, cx + s * 0.42, cy); g.closePath(); g.fill();
  g.fillStyle = "#3d322d"; g.beginPath(); g.ellipse(cx - s * 0.1, cy - s * 0.12, s * 0.16, s * 0.07, -0.2, 0, TAU); g.fill();
  // ปาก: พร้อม = เรืองส้มหายใจ + ไอพ่นเป็นพักๆ · พัก = ดำมีควันจาง
  g.fillStyle = "#0a0505"; g.beginPath(); g.ellipse(cx, cy - s * 0.24, s * 0.13, s * 0.05, 0, 0, TAU); g.fill();
  if (ready) {
    const br = 0.5 + 0.5 * Math.sin(t * 2.4 + p.x);
    g.save(); g.globalCompositeOperation = "lighter"; glow(g, cx, cy - s * 0.24, s * 0.3, "255,150,60", 0.35 + 0.35 * br); g.restore();
    const ph = (t * 0.6 + hash(p.x, p.y)) % 1;
    if (ph < 0.35) { const k = ph / 0.35; for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(230,220,210,${0.35 * (1 - k)})`; g.beginPath(); g.ellipse(cx + Math.sin(i * 2 + t) * s * 0.05, cy - s * (0.3 + k * 0.9 + i * 0.1), s * (0.05 + k * 0.12), s * (0.04 + k * 0.08), 0, 0, TAU); g.fill(); } }
  } else { g.fillStyle = "rgba(60,55,50,.3)"; g.beginPath(); g.ellipse(cx, cy - s * 0.4, s * 0.08, s * 0.1, 0, 0, TAU); g.fill(); }
}
// หินลาวา: ก้อนกลมใหญ่ เปลือกดำแตกลาย รอยร้าวเรืองเต้นตามจังหวะ (z = ลอยตอนกลิ้ง/ผุด · spin = หมุน)
function lavaRock(g, x, y, z, t, a = 1, spin = 0) {
  const [gx, gy, gs] = P(x, y, 0), [sx, sy, s] = P(x, y, z + 0.38), r = s * 0.4;
  g.globalAlpha = a;
  g.fillStyle = "rgba(0,0,0,.5)"; g.beginPath(); g.ellipse(gx, gy, gs * 0.46, gs * 0.17, 0, 0, TAU); g.fill();
  g.save(); g.globalCompositeOperation = "lighter"; glow(g, gx, gy, gs * 0.55, "255,90,30", 0.2 * a); g.restore();
  g.fillStyle = "#1e1210"; g.beginPath(); g.ellipse(sx, sy, r * 1.08, r, 0, 0, TAU); g.fill();
  const pulse = 0.55 + 0.45 * Math.sin(t * 2.2);
  g.strokeStyle = `rgba(255,${110 + 80 * pulse | 0},40,${0.7 + 0.3 * pulse})`; g.lineWidth = Math.max(1.2, s * 0.02);
  for (let i = 0; i < 5; i++) {
    const a0 = i * 1.26 + spin, a1 = a0 + 0.7;
    g.beginPath(); g.moveTo(sx + Math.cos(a0) * r * 0.2, sy + Math.sin(a0) * r * 0.2); g.lineTo(sx + Math.cos(a0 + 0.3) * r * 0.65, sy + Math.sin(a0 + 0.3) * r * 0.6); g.lineTo(sx + Math.cos(a1) * r * 0.95, sy + Math.sin(a1) * r * 0.9); g.stroke();
  }
  g.fillStyle = "rgba(255,255,255,.07)"; g.beginPath(); g.ellipse(sx - r * 0.35, sy - r * 0.45, r * 0.35, r * 0.15, -0.4, 0, TAU); g.fill();
  g.save(); g.globalCompositeOperation = "lighter"; glow(g, sx, sy, r * 1.5, "255,100,30", 0.18 * pulse * a); g.restore();
  g.globalAlpha = 1;
}

// ---------- ฉาก (ทับตัวละคร) ----------
export function ventsFx(g, fd, info, now) {
  for (const e of (fd && fd.fx) || []) {
    const dur = VENTS_FX[e.kind]; if (!dur) continue;
    if (fxOnce(e)) sounds(e);
    const k = fxT(e, now, dur); if (k >= 1) continue;
    switch (e.kind) {
      case "nt_jet": drawJet(g, e, k, now); break;
      case "nt_plug": drawPlug(g, e, k); break;
      case "nt_vent_blast": drawBlast(g, e.x, e.y, k, 1.2); break;
      case "nt_roll": drawRoll(g, e, k, now); break;
      case "nt_launch": drawLaunch(g, e, k); break;
      case "nt_erupt": for (const v of e.vents || []) drawErupt(g, v, k, now); break;
      case "nt_hotrock": for (const [i, t] of (e.tiles || []).entries()) drawRockFall(g, t, k, i, true); break;
      case "nt_quake": drawQuake(g, e, k); break;
      case "nt_wx_eruption": case "nt_wx_quake": drawWxStart(g, e, k, info); break;
      case "nt_singe": drawSinge(g, e, k, now); break;
      case "nt_rock_back": drawRockBack(g, e, k, now); break;
      case "nt_lava_dunk": drawSplash(g, e, k, "255,120,40", true); break;
      case "nt_scald": drawSteam(g, e.x, e.y, k, 1); break;
      case "nt_fall": drawFall(g, e, k, now); break;
      case "nt_surface": drawSurface(g, e, k); break;
      case "nt_dodge": drawDodge(g, e, k); break;
      default: break;
    }
  }
}
// ห้ามมีเสียงซ้อนวีดีโอ: ชั้นนี้ไม่มีคลิป — เสียงลูกเล่นเล่นตรงจังหวะฉาก
function sounds(e) {
  switch (e.kind) {
    case "nt_jet": snd("l9_steam", 1); snd("l9_sizzle", 0.6, 250); break;
    case "nt_plug": snd("impact", 0.7); snd("l9_debris", 0.35, 60); break;
    case "nt_vent_blast": snd("l9_blast", 1); snd("boom", 0.6, 80); snd("l9_debris", 0.5, 400); break;
    case "nt_roll": snd("l9_roll", 1); if (e.sink) snd("l9_sizzle", 0.9, 1100); else snd("impact", 0.6, 1100); break;
    case "nt_launch": snd("l9_steam", 0.9); snd("whoosh", 0.6, 150); snd("deepimpact", 0.8, 800); break;
    case "nt_erupt": snd("l9_steam", 0.8); snd("l9_lava", 0.7, 100); break;
    case "nt_hotrock": snd("l9_debris", 0.8); snd("l9_sizzle", 0.6, 700); break;
    case "nt_quake": snd("l9_quake", 1); snd("l9_debris", 0.7, 500); break;
    case "nt_wx_eruption": snd("l9_blast", 0.7); snd("l9_quake", 0.6, 200); break;
    case "nt_wx_quake": snd("l9_quake", 1); break;
    case "nt_singe": snd("l9_sizzle", 0.4); break;
    case "nt_rock_back": snd("l9_lava", 0.5); break;
    case "nt_lava_dunk": snd("l9_sizzle", 1); snd("splash", 0.4, 60); break;
    case "nt_scald": snd("l9_steam", 0.7); break;
    case "nt_fall": snd("l9_debris", 0.6); snd("rumble", 0.6, 200); break;
    case "nt_surface": snd("bubbles", 0.6); break;
    default: break;
  }
}
// น้ำเดือดพุ่งจากปากปล่องลงตามแนว: ลำไอน้ำขาวแกนส้ม ขยายตามระยะ + หยดเดือด + ไอฟุ้งที่ช่องปลาย
function drawJet(g, e, k, now) {
  const tiles = e.tiles || []; if (!tiles.length) return;
  const H = 2.2 + hash(e.x * 3, e.y * 5) * 1.1, reach = Math.min(1, k / 0.35) * tiles.length, fade = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
  const head = P(e.x + 0.5, e.y + 0.5, H * 0.7);
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i <= 24; i++) {
    const u = (i / 24) * reach; if (u <= 0) continue;
    const x = e.x + 0.5 + e.dir.x * u, y = e.y + 0.5 + e.dir.y * u, z = H * 0.7 * Math.max(0, 1 - u / 1.2) + 0.35;
    const [sx, sy, s] = P(x, y, z), r = s * (0.12 + u * 0.06) * (1 + 0.15 * Math.sin(now / 40 + i));
    glow(g, sx, sy, r * 2.2, "255,140,60", 0.18 * fade);
    g.fillStyle = `rgba(240,240,235,${0.5 * fade})`; g.beginPath(); g.ellipse(sx, sy, r, r * 0.7, 0, 0, TAU); g.fill();
  }
  g.restore();
  glow(g, head[0], head[1], head[2] * 0.5, "255,170,90", 0.6 * fade);
  for (let i = 0; i < 14; i++) { // หยดเดือด
    const u = ((now / 600 + i / 14) % 1) * reach, x = e.x + 0.5 + e.dir.x * u + (hash(i, 1) - 0.5) * 0.4, y = e.y + 0.5 + e.dir.y * u + (hash(i, 2) - 0.5) * 0.4;
    const [sx, sy, s] = P(x, y, 0.3 + Math.sin(u * 2) * 0.5); g.fillStyle = `rgba(255,${200 + hash(i, 3) * 55 | 0},150,${0.8 * fade})`; g.fillRect(sx, sy, Math.max(1.5, s * 0.025), Math.max(1.5, s * 0.025));
  }
  const end = tiles[tiles.length - 1]; if (k > 0.3) drawSteam(g, end.x, end.y, (k - 0.3) / 0.7, 0.9);
}
function drawSteam(g, x, y, k, a) {
  for (let i = 0; i < 9; i++) {
    const [sx, sy, s] = P(x + 0.5 + Math.cos(i * 0.7) * 0.25 * k, y + 0.5 + Math.sin(i * 0.7) * 0.2 * k, 0.3 + k * (0.8 + hash(i, 4) * 0.8));
    g.fillStyle = `rgba(235,235,230,${0.45 * a * (1 - k)})`; g.beginPath(); g.ellipse(sx, sy, s * (0.1 + k * 0.25), s * (0.08 + k * 0.18), 0, 0, TAU); g.fill();
  }
}
// ฝาหินหล่นกระแทกปิดปากปล่อง + ฝุ่นกระจาย
function drawPlug(g, e, k) {
  const H = 2.2 + hash(e.x * 3, e.y * 5) * 1.1, u = Math.min(1, k / 0.35), z = H + (1 - easeOut(u)) * 2.2;
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, z);
  g.fillStyle = "#3a3330"; g.beginPath(); g.ellipse(sx, sy, s * 0.26, s * 0.13, 0, 0, TAU); g.fill();
  g.fillStyle = "#4a423e"; g.beginPath(); g.ellipse(sx, sy - s * 0.04, s * 0.22, s * 0.09, 0, 0, TAU); g.fill();
  if (k > 0.35) { const q = (k - 0.35) / 0.65; for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, [dx, dy, ds] = P(e.x + 0.5 + Math.cos(a) * q * 0.7, e.y + 0.5 + Math.sin(a) * q * 0.5, H - q * 0.8); g.fillStyle = `rgba(120,110,100,${0.5 * (1 - q)})`; g.beginPath(); g.ellipse(dx, dy, ds * 0.08, ds * 0.05, 0, 0, TAU); g.fill(); } }
}
// ระเบิดใต้น้ำ: แสงวาบ → ลูกไฟ/ไอน้ำ → คลื่นกระแทก 3×3 → เศษหินพุ่ง
function drawBlast(g, x, y, k, scale = 1) {
  const [sx, sy, s] = P(x + 0.5, y + 0.5, 0.6);
  g.save(); g.globalCompositeOperation = "lighter";
  if (k < 0.2) glow(g, sx, sy, s * 3 * scale, "255,220,160", 1 - k / 0.2);
  glow(g, sx, sy, s * (0.6 + k * 1.6) * scale, "255,110,30", 0.8 * (1 - k));
  g.restore();
  g.strokeStyle = `rgba(255,200,150,${0.7 * (1 - k)})`; g.lineWidth = 3;
  const R = (0.3 + easeOut(k) * 1.4) * scale;
  g.beginPath(); for (let i = 0; i <= 24; i++) { const a = (i / 24) * TAU, p = P(x + 0.5 + Math.cos(a) * R, y + 0.5 + Math.sin(a) * R, 0.05); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke();
  for (let i = 0; i < 14; i++) { const a = hash(i, 31) * TAU, d = easeOut(k) * (0.6 + hash(i, 32) * 1.2) * scale, up = Math.sin(Math.min(1, k * 1.3) * Math.PI) * (1 + hash(i, 33) * 1.5); const [px, py, ps] = P(x + 0.5 + Math.cos(a) * d, y + 0.5 + Math.sin(a) * d, up); g.fillStyle = i % 3 ? "#2a2220" : `rgba(255,120,40,${1 - k})`; g.beginPath(); g.ellipse(px, py, ps * 0.06, ps * 0.045, a, 0, TAU); g.fill(); }
  for (let i = 0; i < 8; i++) { const [px, py, ps] = P(x + 0.5 + (hash(i, 41) - 0.5) * k, y + 0.5 + (hash(i, 42) - 0.5) * k, 0.5 + k * (1.5 + hash(i, 43) * 1.5)); g.fillStyle = `rgba(30,24,22,${0.5 * (1 - k)})`; g.beginPath(); g.ellipse(px, py, ps * (0.15 + k * 0.4), ps * (0.12 + k * 0.3), 0, 0, TAU); g.fill(); }
}
// หินลาวากลิ้ง: หมุนตามทาง ทิ้งรอยไฟ · โดนคน = ประกาย · ปลายทางลาวา = จม + ฉ่า
function drawRoll(g, e, k, now) {
  const a = e.from, b = e.to; if (!a || !b) return;
  const n = (e.tiles || []).length || 1, go = Math.min(1, k / 0.65), u = go * (n + (e.sink ? 1 : 0)), dx = e.dir ? e.dir.x : Math.sign(b.x - a.x), dy = e.dir ? e.dir.y : Math.sign(b.y - a.y);
  const x = a.x + 0.5 + dx * u, y = a.y + 0.5 + dy * u;
  for (let i = 1; i <= 10; i++) { const q = Math.max(0, u - i * 0.18); const [tx, ty, ts] = P(a.x + 0.5 + dx * q, a.y + 0.5 + dy * q, 0.05); g.fillStyle = `rgba(255,${90 + i * 8},30,${0.4 * (1 - i / 10) * (1 - k * 0.5)})`; g.beginPath(); g.ellipse(tx, ty, ts * 0.18, ts * 0.07, 0, 0, TAU); g.fill(); }
  const sinking = e.sink && u > n;
  if (k < 0.65 || !e.sink) lavaRock(g, x, y, sinking ? -(u - n) * 0.6 : Math.abs(Math.sin(u * Math.PI)) * 0.12, now / 1000, k < 0.85 ? 1 : 1 - (k - 0.85) / 0.15, u * 4);
  for (const t of e.tiles || []) {
    const d = Math.abs(t.x - a.x) + Math.abs(t.y - a.y), hitK = go * (n + 1) - d; if (hitK < 0 || hitK > 0.6) continue;
    const [px, py, ps] = P(t.x + 0.5, t.y + 0.5, 0.4); g.save(); g.globalCompositeOperation = "lighter"; glow(g, px, py, ps * 0.6, "255,160,60", 0.7 * (1 - hitK / 0.6)); g.restore();
  }
  if (e.sink && k > 0.6) drawSplash(g, e.sink, (k - 0.6) / 0.4, "255,120,40", true);
}
// ปล่องแรงดัน: เสาไอพุ่ง → เส้นโค้งลอยตัว → วงกระแทกที่จุดตก
function drawLaunch(g, e, k) {
  const a = e.from, b = e.to; if (!a || !b) return;
  if (k < 0.4) { const q = k / 0.4; for (let i = 0; i < 10; i++) { const [sx, sy, s] = P(a.x + 0.5 + Math.sin(i) * 0.05, a.y + 0.5, q * 3 * (i / 10)); g.fillStyle = `rgba(240,235,225,${0.45 * (1 - q * 0.5)})`; g.beginPath(); g.ellipse(sx, sy, s * (0.12 + i * 0.02), s * 0.1, 0, 0, TAU); g.fill(); } }
  const u = Math.min(1, k / 0.55);
  g.strokeStyle = `rgba(255,220,180,${0.6 * (1 - Math.max(0, k - 0.55) / 0.45)})`; g.lineWidth = 2; g.setLineDash([6, 5]);
  g.beginPath(); for (let i = 0; i <= 20; i++) { const q = (i / 20) * u, x = lerp(a.x, b.x, q) + 0.5, y = lerp(a.y, b.y, q) + 0.5, z = Math.sin(q * Math.PI) * 2.6, p = P(x, y, z); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke(); g.setLineDash([]);
  if (k > 0.5) {
    const q = (k - 0.5) / 0.5, R = 0.3 + easeOut(q) * 1.3;
    g.strokeStyle = `rgba(255,190,120,${0.8 * (1 - q)})`; g.lineWidth = 3;
    g.beginPath(); for (let i = 0; i <= 24; i++) { const an = (i / 24) * TAU, p = P(b.x + 0.5 + Math.cos(an) * R, b.y + 0.5 + Math.sin(an) * R, 0.05); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke();
    for (let i = 0; i < 10; i++) { const an = (i / 10) * TAU, [px, py, ps] = P(b.x + 0.5 + Math.cos(an) * R * 0.8, b.y + 0.5 + Math.sin(an) * R * 0.8, 0.1 + Math.sin(q * Math.PI) * 0.4); g.fillStyle = `rgba(90,80,75,${0.6 * (1 - q)})`; g.beginPath(); g.ellipse(px, py, ps * 0.07, ps * 0.05, 0, 0, TAU); g.fill(); }
  }
}
// ปล่องพ่นตามจังหวะ: ลำน้ำเดือดพุ่งขึ้นสูงจากปาก + วงไอร้อนแผ่รอบปล่อง
function drawErupt(g, v, k, now) {
  const H = 2.2 + hash(v.x * 3, v.y * 5) * 1.1, up = Math.min(1, k / 0.3), fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 16; i++) { const q = (i / 16) * up, [sx, sy, s] = P(v.x + 0.5 + Math.sin(now / 90 + i) * 0.04, v.y + 0.5, H + q * 3.5); glow(g, sx, sy, s * (0.2 + q * 0.3), i < 5 ? "255,150,60" : "240,230,220", 0.35 * fade); }
  g.restore();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, R = 0.4 + easeOut(k) * 1.1, [px, py, ps] = P(v.x + 0.5 + Math.cos(a) * R, v.y + 0.5 + Math.sin(a) * R, 0.2 + k * 0.6); g.fillStyle = `rgba(230,225,215,${0.35 * fade})`; g.beginPath(); g.ellipse(px, py, ps * (0.12 + k * 0.15), ps * (0.08 + k * 0.1), 0, 0, TAU); g.fill(); }
}
// หินตก (ร้อน = ไฟลุกท้าย · แผ่นดินไหว = หินเทา)
function drawRockFall(g, t, k, i, hot) {
  const st = (hash(i, t.x + t.y) * 0.35), q = (k - st) / 0.45; if (q < 0) return;
  if (q < 1) {
    const z = (1 - q) * 6, [sx, sy, s] = P(t.x + 0.5 + (1 - q) * 0.8, t.y + 0.5, z);
    if (hot) { g.save(); g.globalCompositeOperation = "lighter"; for (let j = 1; j <= 6; j++) { const [tx, ty, ts] = P(t.x + 0.5 + (1 - q) * 0.8 + j * 0.12, t.y + 0.5, z + j * 0.35); glow(g, tx, ty, ts * 0.18, "255,120,40", 0.4 * (1 - j / 6)); } g.restore(); }
    g.fillStyle = hot ? "#2a140e" : "#4a4440"; g.beginPath(); g.ellipse(sx, sy, s * 0.12, s * 0.1, q * 6, 0, TAU); g.fill();
    if (hot) { g.strokeStyle = "rgba(255,150,60,.9)"; g.lineWidth = 1; g.stroke(); }
    return;
  }
  const r = Math.min(1, (q - 1) / 0.8);
  if (hot) drawBlast(g, t.x, t.y, r, 0.45);
  else { const [sx, sy, s] = P(t.x + 0.5, t.y + 0.5, 0); for (let j = 0; j < 8; j++) { const a = (j / 8) * TAU; g.fillStyle = `rgba(110,100,95,${0.6 * (1 - r)})`; g.beginPath(); g.ellipse(sx + Math.cos(a) * s * r * 0.5, sy + Math.sin(a) * s * r * 0.2 - Math.sin(r * Math.PI) * s * 0.2, s * 0.05, s * 0.035, 0, 0, TAU); g.fill(); } }
}
function drawQuake(g, e, k) {
  for (const [i, t] of (e.rocks || []).entries()) drawRockFall(g, t, k, i, false);
  for (const t of e.cracks || []) { // พื้นแตกออก: เส้นร้าวลามออกจากกลาง + แสงแดงลึก
    const q = Math.min(1, k / 0.5);
    g.strokeStyle = `rgba(255,80,30,${0.8 * (1 - Math.max(0, k - 0.6) / 0.4)})`; g.lineWidth = 2;
    for (let j = 0; j < 6; j++) { const a = (j / 6) * TAU + hash(t.x, j); const a0 = P(t.x + 0.5, t.y + 0.5, 0.02), a1 = P(t.x + 0.5 + Math.cos(a) * 0.6 * q, t.y + 0.5 + Math.sin(a) * 0.6 * q, 0.02); g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(a1[0], a1[1]); g.stroke(); }
  }
}
// เริ่มสภาพอากาศ: แสงแดงวาบทั้งกระดาน (ปะทุ) / ฝุ่นทั้งกระดาน (แผ่นดินไหว)
function drawWxStart(g, e, k, info) {
  const c = P(info.cols / 2, info.rows / 2, 0), s = c[2] * Math.max(info.cols, info.rows);
  const a = Math.sin(Math.min(1, k) * Math.PI);
  g.save(); g.globalCompositeOperation = e.kind === "nt_wx_eruption" ? "lighter" : "source-over";
  glow(g, c[0], c[1], s * 0.6, e.kind === "nt_wx_eruption" ? "255,70,20" : "90,80,70", 0.35 * a);
  g.restore();
}
function drawSinge(g, e, k, now) {
  g.save(); g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 8; i++) { const q = (k + i / 8) % 1, [sx, sy, s] = P(e.x + 0.5 + Math.sin(i * 2.4 + now / 200) * 0.2, e.y + 0.5, 0.1 + q * 1.2); glow(g, sx, sy, s * 0.08, "255,140,50", 0.8 * (1 - q) * (1 - k)); }
  g.restore();
}
function drawRockBack(g, e, k, now) {
  const z = -0.4 * (1 - easeOut(k));
  lavaRock(g, e.x + 0.5, e.y + 0.5, z, now / 1000, Math.min(1, k * 2));
  if (k < 0.5) drawSplash(g, e, k / 0.5, "255,120,40", true);
}
function drawSplash(g, t, k, rgb, hot) {
  const [sx, sy, s] = P(t.x + 0.5, t.y + 0.5, 0.05);
  if (hot) { g.save(); g.globalCompositeOperation = "lighter"; glow(g, sx, sy, s * (0.4 + k), rgb, 0.7 * (1 - k)); g.restore(); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, d = easeOut(k) * s * 0.5, up = Math.sin(k * Math.PI) * s * (0.3 + hash(i, 3) * 0.5); g.fillStyle = `rgba(${rgb},${1 - k})`; g.beginPath(); g.arc(sx + Math.cos(a) * d, sy + Math.sin(a) * d * 0.4 - up, s * 0.03, 0, TAU); g.fill(); }
  drawSteam(g, t.x, t.y, k, 0.7);
}
// ร่วงลงหลุมยุบ/รอยแยก: เศษหินร่วงตาม + แสงแดงวาบจากก้นหลุม
function drawFall(g, e, k, now) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, -0.3);
  g.save(); g.globalCompositeOperation = "lighter"; glow(g, sx, sy, s * 0.7, "255,60,20", 0.6 * Math.sin(k * Math.PI)); g.restore();
  for (let i = 0; i < 10; i++) { const q = (k * 1.3 + i / 10) % 1, [px, py, ps] = P(e.x + 0.5 + (hash(i, 7) - 0.5) * 0.7, e.y + 0.5 + (hash(i, 8) - 0.5) * 0.5, 0.6 - q * 2); g.fillStyle = `rgba(80,70,65,${0.8 * (1 - k)})`; g.beginPath(); g.ellipse(px, py, ps * 0.05, ps * 0.035, now / 200 + i, 0, TAU); g.fill(); }
}
function drawSurface(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0);
  for (let i = 0; i < 10; i++) { const t = (k + i / 10) % 1; g.strokeStyle = `rgba(210,235,255,${0.7 * (1 - k)})`; g.lineWidth = 1; g.beginPath(); g.arc(sx + Math.sin(i * 2.1) * s * 0.25, sy - t * s * 1.2, s * (0.03 + (i % 3) * 0.015), 0, TAU); g.stroke(); }
}
function drawDodge(g, e, k) {
  const [sx, sy, s] = P(e.x + 0.5, e.y + 0.5, 0.6);
  g.strokeStyle = `rgba(255,220,190,${0.8 * (1 - k)})`; g.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { const x = sx - s * 0.3 - k * s * 0.4 - i * s * 0.12; g.beginPath(); g.moveTo(x, sy - s * 0.2 + i * s * 0.15); g.lineTo(x + s * 0.25, sy - s * 0.2 + i * s * 0.15); g.stroke(); }
}
