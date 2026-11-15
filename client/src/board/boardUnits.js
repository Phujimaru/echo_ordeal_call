// ============================================================
//  ตัววาดหมาก/ตัวละคร (แยกจาก boardDraw.js) — รูปตัวละคร (แคช) · หกเหลี่ยม · แถบเลือด/เกราะ · ป้าย · อีโมต
//  ตัวใหญ่ (ขยายร่าง) · ศพ · drawAnyUnit · เอฟเฟกต์ขยายร่าง · สถานะวาดหมากของเฟรม UNIT_FRAME (drawFrame ตั้ง)
// ============================================================
import { F_TH, F_UI, P, depthOf, gEllipse, hexA, hexPath, normColor, pitchOf, rgbOf, shadeHex, viewAxes } from "./boardGeo";
import { kiraAuraBack, kiraAuraFront } from "./kiraFx";
import { OT_RIDE_Z, otRides, otTruck, otUnitBack } from "./optimusFx";
import { drawStandee, hasStandee } from "./freddyFx";
import { dioUnitBack } from "./dioFx";
import { gioUnitBack, gioUnitFront } from "./giornoFx";
import { arjUnitBack } from "./arjunaBoardFx";
import { drawRider } from "./yunaFx";
import { GYRO_RIDE_Z, gyroHorse, gyroUnitBack, gyroUnitFront } from "./gyroFx";
import { DIEGO_RIDE_Z, diegoHorse, diegoUnitBack, diegoUnitFront } from "./diegoFx";
import { drawValUnit } from "./valentineFx";
import { drawBloodCorpse } from "./ryougiFx";
import { faizGhosts, faizTrailClear } from "./faizFx";
import { KIRI_GHOST } from "./kiriFx";
import { shinraAuraBack, shinraAuraFront } from "./shinraFx";
import { kazumaKingAuraBack, kazumaKingAuraFront } from "./kazumaFx";
import { otoUnitBack, otoUnitFront } from "./otoyaFx";
import { elemUnitBack, elemUnitFront } from "./elementFx";
import { drawMoonCell } from "./moonFx";
import { drawRtMob, isRtMob } from "./roadtrip/mobArt";
import { yukiAuraBack, yukiAuraFront, yukiNoteUnit } from "./yukiFx";
import { REDUCED } from "./boardCamera";

// ---------- รูปตัวละคร (แคชทั้งแอป) ----------
const imgCache = new Map();
function getImg(url) {
  if (!url) return null;
  let e = imgCache.get(url);
  if (!e) {
    const img = new Image();
    e = { img, ok: false, failed: false };
    const entry = e;
    img.decoding = "async";
    img.onload = () => { entry.ok = img.naturalWidth > 0; entry.failed = !entry.ok; };
    img.onerror = () => { entry.failed = true; };
    img.src = url;
    imgCache.set(url, e);
  }
  return e;
}
function cover(g, img, x, y, w, h, fy = 0.12) {
  const iw = img.naturalWidth, ih = img.naturalHeight, ir = iw / ih, r = w / h;
  let sw, sh, sx, sy;
  if (ir > r) { sh = ih; sw = sh * r; sx = (iw - sw) / 2; sy = 0; } else { sw = iw; sh = sw / r; sx = 0; sy = (ih - sh) * fy; }
  g.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}



// =================================================================== units
export function unitHex(g, u, cx, cy, r, alpha = 1) {
  const q = UNIT_FRAME.uiPiece ? Math.min(1, r / 26) : 1;
  g.save(); g.globalAlpha *= alpha;
  hexPath(g, cx, cy, r + 3 * q); g.fillStyle = "#0d1c36"; g.fill();
  hexPath(g, cx, cy, r + 1.5 * q); g.strokeStyle = u.color; g.lineWidth = 3 * q; g.stroke();
  g.save(); hexPath(g, cx, cy, r - 1 * q); g.clip();
  const e = u.masked ? null : getImg(u.img);
  if (u.masked) { g.fillStyle = "#ffffff"; g.fillRect(cx - r, cy - r, r * 2, r * 2); } // มืดบอด: ขาวล้วน
  else if (e && e.ok) cover(g, e.img, cx - r, cy - r * 0.87, r * 2, r * 1.74, 0.08);
  else {
    // รูปโหลดไม่ขึ้น/ยังโหลดอยู่ → แผ่นสีประจำที่นั่ง + ตัวอักษรแรกของชื่อ
    const gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1);
    gr.addColorStop(0, shadeHex(u.color, 0.35)); gr.addColorStop(1, shadeHex(u.color, -0.35));
    g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
    const ch = (u.name || "?").trim().charAt(0) || "?";
    g.font = `700 ${Math.max(10, r * 0.9) | 0}px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "rgba(255,255,255,.92)"; g.fillText(ch, cx, cy + r * 0.04); g.textBaseline = "alphabetic";
  }
  g.restore();
  g.restore();
}
function normTag(tag) {
  if (tag == null || tag === "") return null;
  if (typeof tag === "object") return tag.text == null && !tag.backs ? null : { text: tag.text == null ? "" : String(tag.text), bust: !!tag.bust, backs: tag.backs | 0 };
  const text = String(tag);
  return { text, bust: text === "แตก", backs: 0 };
}
// ป้ายเหนือหัว: แต้ม (ตัวเลขทอง) · "พอ" · "แตก" (ป้ายแดง) · หรือ { backs: N } = หลังไพ่ N ใบ
function drawTag(g, x, y, tag) {
  if (tag.backs) {
    const n = Math.min(6, tag.backs);
    for (let i = 0; i < n; i++) {
      const cx = x - (n - 1) * 7 + i * 14;
      g.fillStyle = "#12264a"; g.fillRect(cx - 7, y - 10, 13, 18); g.strokeStyle = "#7fb8e6"; g.lineWidth = 1; g.strokeRect(cx - 6.5, y - 9.5, 12, 17);
    }
    if (tag.text) {
      g.font = `600 13px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
      const tw = g.measureText(tag.text).width + 12; g.fillStyle = "#12264a"; g.fillRect(x - tw / 2, y - 31, tw, 18);
      g.fillStyle = "#fff"; g.fillText(tag.text, x, y - 22); g.textBaseline = "alphabetic";
    }
    return;
  }
  const isNum = /^[0-9+\-−]+$/.test(tag.text);
  g.font = isNum ? `700 16px ${F_UI}` : `600 13px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
  const tw = Math.max(34, g.measureText(tag.text).width + 16), th = 22;
  g.fillStyle = tag.bust ? "#c94a44" : "#12264a";
  g.beginPath(); g.moveTo(x - tw / 2, y - th / 2); g.lineTo(x + tw / 2, y - th / 2); g.lineTo(x + tw / 2, y + th / 2 - 6); g.lineTo(x + tw / 2 - 6, y + th / 2); g.lineTo(x - tw / 2, y + th / 2); g.closePath(); g.fill();
  g.strokeStyle = tag.bust ? "#ff9b94" : "#e6c46a"; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = tag.bust ? "#fff" : isNum ? "#f0d070" : "#dbe8f7"; g.fillText(tag.text, x, y + 1);
  g.textBaseline = "alphabetic";
}
// ally = ฝ่ายเดียวกัน (สนาม Eos: เพื่อน/พลเรือน/รถเสบียง) → วงเขียว · แดงเฉพาะศัตรู (ผู้ใช้ 2026-11-10 "สีแดงให้เป็นวงมอน")
function drawReticle(g, x, y, r, kind, now, ally = false, pad = 10) {
  const col = kind === "aoe" ? "#ffcf5a" : kind === "attack" ? (ally ? "#6fe39a" : "#ff8f84") : "#c9a2ff";
  const rot = now / 900, rr = r + pad + Math.sin(now / 220) * 2;
  g.strokeStyle = col; g.lineWidth = 2.5;
  for (let k = 0; k < 4; k++) { const a = rot + k * Math.PI / 2; g.beginPath(); g.arc(x, y, rr, a, a + 0.9); g.stroke(); }
}
// ตัวที่ซ่อนจากศัตรู (cloak — เราเห็นเพราะเป็นตัวเอง/เพื่อนร่วมทีม): แถบแสงพาดผ่านรูปหกเหลี่ยมช้าๆ
function cloakShimmer(g, cx, cy, r, now) {
  const ph = (now / 1600) % 1, x = cx - r * 1.8 + ph * r * 3.6, w = r * 0.7;
  g.save(); hexPath(g, cx, cy, r); g.clip();
  const gr = g.createLinearGradient(x - w, cy - r, x + w, cy + r);
  gr.addColorStop(0, "rgba(220,240,255,0)"); gr.addColorStop(0.5, "rgba(220,240,255,.55)"); gr.addColorStop(1, "rgba(220,240,255,0)");
  g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
  g.restore();
}
// u = { id, rx, ry, ox, oy, color, img, name, hp, maxHp, armor, maxArmor, isMe, isActor, tag, alpha, reticle, hitT, hovered, cloak }
// สนาม Colony: ขยายแถบเลือด/ป้าย (หมากถูกย่อตามระยะกล้อง + จอถูกย่อ → แถบบางจนอ่านไม่ออก) — ตั้งจาก onWall ของ drawFrame
// สถานะวาดหมากของเฟรม (drawFrame ตั้ง · ตัววาดหมากอ่าน) — รวมเป็นอ็อบเจกต์เพราะแยกไฟล์แล้ว (import แก้ค่า let ข้ามไฟล์ไม่ได้)
//  uiK = ตัวคูณแถบเลือด/ป้าย (Colony) · night = กลางคืนของเฟรมนี้ (มอน Road Trip — drawAnyUnit ไม่ได้รับ night)
//  uiPiece = สนาม Eos (กล้องใกล้): แถบเลือด/เกราะ/ป้ายวัดจากขนาดหมาก — เล็กกว่ารูปตัวละครเสมอ (ผู้ใช้สั่ง 2026-11-09) · ขอบหกเหลี่ยมบางตามขนาด
//  piece3d = Colony: หมาก = เหรียญหกเหลี่ยมหนา 3 มิติ (จุดยอดเป็นพิกัดกระดาน ฉายผ่านกล้อง 3D → ยึดพื้น ไม่หันตามกล้อง) + ป้ายรูปตั้งบนเสา (ผู้ใช้ขอดู 2026-11-09)
export const UNIT_FRAME = { uiK: 1, night: false, uiPiece: false, piece3d: false };
export const COLONY_FLOOR = new Set(["shallow", "lift", "belt", "rail", "warp", "watch"]);
const COIN_LIGHT = [-0.6, -0.8]; // ทิศแสง (พิกัดกระดาน) ให้ด้านข้างเหรียญสว่าง/มืดต่างกัน
function hexCoin(g, u, wx, wy, K, now) {
  const r = 0.36 * K, H = 0.13, n = 6, a0 = Math.PI / 6;
  const ring = (rr, z, dx = 0, dy = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + i * Math.PI * 2 / n; return P(wx + dx + Math.cos(a) * rr, wy + dy + Math.sin(a) * rr, z); });
  const poly = (pts) => { g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); };
  // เงา
  poly(ring(r * 1.08, 0, 0.06, 0.08)); g.fillStyle = "rgba(0,0,0,.26)"; g.fill();
  const B = ring(r, 0), T = ring(r, H);
  if (!B.concat(T).every((q) => Number.isFinite(q[0]))) return;
  // ด้านข้าง: เรียงไกล → ใกล้ · แรเงาตามทิศแสง
  const sides = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, am = a0 + (i + 0.5) * Math.PI * 2 / n, nx = Math.cos(am), ny = Math.sin(am);
    sides.push({ i, j, d: depthOf(wx + nx * r, wy + ny * r), lit: nx * COIN_LIGHT[0] + ny * COIN_LIGHT[1] });
  }
  sides.sort((p, q) => p.d - q.d);
  for (const f of sides) {
    poly([B[f.i], B[f.j], T[f.j], T[f.i]]);
    g.fillStyle = shadeHex(u.color, -0.42 + f.lit * 0.22); g.fill();
    g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 1; g.stroke();
  }
  // หน้าบน: สีที่นั่ง + ขอบขาว + ร่องหกเหลี่ยมด้านใน
  poly(T); g.fillStyle = u.color; g.fill();
  g.strokeStyle = "rgba(255,255,255,.92)"; g.lineWidth = 2; g.stroke();
  poly(ring(r * 0.66, H)); g.fillStyle = shadeHex(u.color, -0.18); g.fill();
  g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1; g.stroke();
  // ตัวเรา = ขอบทองรอบเหรียญ · เพื่อน = เขียว
  if (u.isMe || u.ally) { poly(ring(r * 1.16, 0.01)); g.strokeStyle = u.isMe ? "#f0c868" : ALLY; g.lineWidth = 2.5; g.stroke(); }
  if (u.isActor) {
    const p = (now / 1100) % 1;
    g.save(); g.globalAlpha *= 1 - p; poly(ring(r * (1.1 + p * 0.9), 0.02)); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke(); g.restore();
  }
}
// ---------- หลอดพลังชีวิต/เกราะบนหมาก (ผู้ใช้สั่งออกแบบใหม่ 2026-10-25 — ต้องอ่านง่ายทั้งค่าปกติ 7/3 และค่าเยอะแบบบอส 15/5 · 25/5) ----------
//  เกราะ = แคปซูลบางด้านบน · เลือด = แคปซูลหนาด้านล่าง · ยาวเท่ากัน (แต่ละหลอดเต็ม = เพดานของมันเอง)
//  ≤ VITAL_TICK_ALL หน่วย = ขีดแบ่งทุกหน่วย · มากกว่า = ขีดเข้มทุก 5 หน่วย + เหรียญตัวเลขเลือดที่หัวหลอด + หลอดยาวขึ้น
const VITAL_TICK_ALL = 10;
function pillPath(g, x, y, w, h) {
  const r = h / 2;
  g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2); g.lineTo(x + r, y + h); g.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5); g.closePath();
}
function vitalPill(g, x, y, w, h, val, max, top, bot, UK) {
  pillPath(g, x, y, w, h);
  g.fillStyle = "rgba(10,22,44,.9)"; g.fill();
  g.lineWidth = Math.min(h * 0.2, Math.max(1, UK)); g.strokeStyle = "rgba(255,255,255,.7)"; g.stroke();
  const ins = Math.min(h * 0.25, Math.max(1, 1.3 * UK)), ix = x + ins, iy = y + ins, iw = w - ins * 2, ih = h - ins * 2;
  g.save(); pillPath(g, ix, iy, iw, ih); g.clip();
  g.fillStyle = "rgba(255,255,255,.07)"; g.fillRect(ix, iy, iw, ih);
  const k = max > 0 ? Math.max(0, Math.min(1, val / max)) : 0;
  if (k > 0) { const gr = g.createLinearGradient(0, iy, 0, iy + ih); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(ix, iy, iw * k, ih); }
  if (max > 1) {
    const step = max <= VITAL_TICK_ALL ? 1 : 5, per = iw / max;
    g.fillStyle = step === 1 ? "rgba(10,22,44,.5)" : "rgba(10,22,44,.78)";
    for (let i = step; i < max; i += step) g.fillRect(ix + per * i - 0.6 * UK, iy, (step === 1 ? 1 : 1.8) * UK, ih);
  }
  g.fillStyle = "rgba(255,255,255,.24)"; g.fillRect(ix, iy, iw, ih * 0.4);
  g.restore();
}
const vitalMax = (u) => [Math.max(1, u.maxHp | 0 || 7), Math.max(0, u.maxArmor == null ? 3 : u.maxArmor | 0)];
// ค่าเยอะ (บอส/ตัวใหญ่) — ใช้ตัดสินความยาวหลอดก่อนวาด
export function vitalBig(u) { const [mh, ma] = vitalMax(u); return mh > VITAL_TICK_ALL || ma > VITAL_TICK_ALL; }
// ความสูงรวมของหลอด (ใช้วางป้ายเหนือ/ใต้หลอด)
export function vitalHeight(u, UK = 1) { const [, ma] = vitalMax(u); return (ma > 0 ? 6.5 * UK : 0) + 8 * UK; }
// วาดหลอดกลางที่ cx ขอบบนที่ y กว้าง w → คืนขอบล่าง
const HP_TONES = { foe: ["#ff9aa6", "#d93a50", "#ef5a6a", "#9e1f33"], ally: ["#a6f2c0", "#26a65a", "#4cc97a", "#1a7a40"], civ: ["#fff0a6", "#e0b020", "#f5cc3c", "#a87a10"] };
export function drawVitalBar(g, cx, y, w, u, UK = 1) {
  const [maxHp, maxAr] = vitalMax(u);
  const hp = Math.max(0, Math.min(maxHp, u.hp | 0)), ar = Math.max(0, Math.min(maxAr, u.armor | 0));
  const big = maxHp > VITAL_TICK_ALL || maxAr > VITAL_TICK_ALL;
  const br = big ? 8.5 * UK : 0; // รัศมีเหรียญตัวเลข
  const x = cx - w / 2 + br * 1.2, bw = w - br * 1.2;
  let yy = y;
  if (maxAr > 0) { vitalPill(g, x, yy, bw, 5 * UK, ar, maxAr, "#d8eeff", "#4f97e0", UK); yy += 6.5 * UK; }
  // สีหลอดเลือด (u.hpTone): ally = เขียว (ผู้เล่นทีมเดียวกันในสนาม Eos — ผู้ใช้สั่ง 2026-11-10) · civ = ฟ้า (พลเรือน) · ไม่ใส่ = แดงเดิม
  const tone = HP_TONES[u.hpTone] || HP_TONES.foe;
  vitalPill(g, x, yy, bw, 8 * UK, hp, maxHp, tone[0], tone[1], UK);
  const bottom = yy + 8 * UK;
  if (big) {
    const ex = cx - w / 2 + br, ey = (y + bottom) / 2;
    g.beginPath(); g.arc(ex, ey, br + 1.5 * UK, 0, Math.PI * 2); g.fillStyle = "#ffffff"; g.fill();
    g.beginPath(); g.arc(ex, ey, br, 0, Math.PI * 2);
    const gr = g.createLinearGradient(0, ey - br, 0, ey + br); gr.addColorStop(0, tone[2]); gr.addColorStop(1, tone[3]); g.fillStyle = gr; g.fill();
    g.font = `700 ${(hp >= 10 ? 9.5 : 11) * UK}px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#ffffff"; g.fillText(String(hp), ex, ey + 0.5 * UK); g.textBaseline = "alphabetic";
  }
  return bottom;
}
// เพื่อนร่วมทีม (โหมดร่วมมือ duo/trio/Moon Cell): วงเขียว + ป้าย "ทีม" ตำแหน่งเดียวกับป้าย "คุณ"
const ALLY = "#5fe0a4";
function allyBadge(g, mx, my, UK) {
  g.font = `600 ${11 * UK}px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
  const mw = g.measureText("ทีม").width + 10 * UK;
  g.fillStyle = ALLY; g.fillRect(mx - mw / 2, my - 8 * UK, mw, 16 * UK);
  g.fillStyle = "#08321f"; g.fillText("ทีม", mx, my + 0.5); g.textBaseline = "alphabetic";
}
// อีโมตระหว่างแมตช์: ป้ายมุมตัดสีขาวเหนือหัวหมาก (ขอบสีผู้เล่น) เด้งเข้า ลอยขึ้นช้าๆ แล้วจาง
export function emoteFx(g, e, p) {
  if (p < 0 || p > 1) return;
  const h = Math.max(1, e.size || 1) / 2;
  const [bx, by, s] = P(e.x + h, e.y + h);
  const K = Math.max(1, e.size || 1);
  const pop = p < 0.12 ? 0.6 + (p / 0.12) * 0.55 : p < 0.2 ? 1.15 - ((p - 0.12) / 0.08) * 0.15 : 1;
  const a = p > 0.8 ? 1 - (p - 0.8) / 0.2 : 1;
  const w = s * 0.62 * pop, cx = bx, cy = by - s * 1.55 * K - p * s * 0.25 - w * 0.5, c = Math.max(4, w * 0.16);
  g.save();
  g.globalAlpha = a;
  g.beginPath();
  g.moveTo(cx - w / 2 + c, cy - w / 2); g.lineTo(cx + w / 2, cy - w / 2); g.lineTo(cx + w / 2, cy + w / 2 - c);
  g.lineTo(cx + w / 2 - c, cy + w / 2); g.lineTo(cx + w * 0.1, cy + w / 2); g.lineTo(cx, cy + w / 2 + w * 0.16); g.lineTo(cx - w * 0.1, cy + w / 2);
  g.lineTo(cx - w / 2, cy + w / 2); g.lineTo(cx - w / 2, cy - w / 2 + c); g.closePath();
  g.fillStyle = "#ffffff"; g.fill();
  g.lineWidth = Math.max(2, w * 0.05); g.strokeStyle = e.color || "#3d8bd9"; g.stroke();
  g.font = `${Math.round(w * 0.62)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(e.emoji, cx, cy + w * 0.04);
  g.restore();
}
// หมุดทีม: ข้าวหลามตัดสีผู้ปัก + วงกระเพื่อม 3 ระลอกที่ช่อง
export function teamPingFx(g, e, p, now) {
  if (p < 0 || p > 1) return;
  const [bx, by, s] = P(e.x + 0.5, e.y + 0.5);
  const a = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
  g.save();
  for (let i = 0; i < 3; i++) {
    const q = ((p * 3 + i / 3) % 1);
    g.globalAlpha = a * (1 - q);
    g.beginPath(); g.ellipse(bx, by, s * (0.2 + q * 0.6), s * (0.2 + q * 0.6) * 0.5, 0, 0, Math.PI * 2);
    g.lineWidth = 3; g.strokeStyle = e.color; g.stroke();
  }
  g.globalAlpha = a;
  const bob = Math.sin(now / 160) * s * 0.04, d = s * 0.16, ty = by - s * 0.55 + bob;
  g.beginPath(); g.moveTo(bx, ty - d); g.lineTo(bx + d * 0.75, ty); g.lineTo(bx, ty + d); g.lineTo(bx - d * 0.75, ty); g.closePath();
  g.fillStyle = e.color; g.fill(); g.lineWidth = 2; g.strokeStyle = "#ffffff"; g.stroke();
  g.beginPath(); g.moveTo(bx, ty + d); g.lineTo(bx, by); g.lineWidth = 2; g.strokeStyle = e.color; g.stroke();
  g.restore();
}
// ผู้เล่นหลุด (ผู้ใช้สั่ง 2026-11-09): หกเหลี่ยมหมองลง + ป้ายกลมมุมขวาบน (ปลั๊กหลุด) เต้นช้าๆ
function drawOffline(g, bx, hy, hexR, now) {
  g.save();
  hexPath(g, bx, hy, hexR); g.fillStyle = "rgba(20, 28, 44, 0.42)"; g.fill();
  const r = Math.max(7, hexR * 0.36), cx = bx + hexR * 0.72, cy = hy - hexR * 0.62;
  const pulse = REDUCED ? 0 : (Math.sin(now / 420) + 1) / 2;
  g.beginPath(); g.arc(cx, cy, r * (1.25 + pulse * 0.25), 0, Math.PI * 2); g.fillStyle = `rgba(210, 69, 91, ${0.18 + pulse * 0.12})`; g.fill();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = "#1a2236"; g.fill();
  g.lineWidth = Math.max(1.5, r * 0.14); g.strokeStyle = "#d2455b"; g.stroke();
  // ปลั๊กสองข้างแยกจากกัน + ขีดทแยง
  const k = r / 10;
  g.strokeStyle = "#ffffff"; g.lineCap = "round"; g.lineWidth = Math.max(1.2, 1.6 * k);
  g.beginPath();
  g.moveTo(cx - 6 * k, cy + 1 * k); g.lineTo(cx - 2.5 * k, cy + 1 * k);
  g.moveTo(cx - 2.5 * k, cy - 2 * k); g.lineTo(cx - 2.5 * k, cy + 4 * k);
  g.moveTo(cx + 2.5 * k, cy - 4 * k); g.lineTo(cx + 2.5 * k, cy + 2 * k);
  g.moveTo(cx + 2.5 * k, cy - 1 * k); g.lineTo(cx + 6 * k, cy - 1 * k);
  g.stroke();
  g.strokeStyle = "#ff8a9c"; g.beginPath(); g.moveTo(cx - 6 * k, cy - 6 * k); g.lineTo(cx + 6 * k, cy + 6 * k); g.stroke();
  g.restore();
}
function drawUnit(g, u, now, boxes) {
  // ออร่าควันดำแดงของกิระ (kiraFx.js): พื้น + ควันด้านหลังก่อนตัว · ควันด้านหน้า + ประกายไฟหลังตัว (ท้ายฟังก์ชัน)
  const auraAt = u.aura === "kira" ? [u.rx + 0.5 + (u.ox || 0), u.ry + 0.5 + (u.oy || 0), u.alpha == null ? 1 : u.alpha] : null;
  if (auraAt) kiraAuraBack(g, auraAt[0], auraAt[1], now, u.lowQ, auraAt[2]);
  // คุซาคาเบะ ชินระ (shinraFx.js): ไอพ่นใต้เท้า (ฮีโร่) / เพลิงท่วมตัว (อุ่นเครื่องพอแล้ว)
  if (u.aura === "shinraHero" || u.aura === "shinraBlaze") shinraAuraBack(g, u.rx + 0.5 + (u.ox || 0), u.ry + 0.5 + (u.oy || 0), now, u.lowQ, u.alpha == null ? 1 : u.alpha, u.aura === "shinraBlaze");
  if (u.aura === "kazumaKing") kazumaKingAuraBack(g, u.rx + 0.5 + (u.ox || 0), u.ry + 0.5 + (u.oy || 0), now, u.lowQ, u.alpha == null ? 1 : u.alpha);
  // ยูกิ (yukiFx.js): นับถอยหลังเกิดใหม่เป็นประตู — แสงฟ้าบนพื้นก่อนตัว · อนุภาคไหลเข้าตัว + ตัวเลขหลังตัว
  if (u.yuki) yukiAuraBack(g, u.rx + 0.5 + (u.ox || 0), u.ry + 0.5 + (u.oy || 0), now, u.lowQ, u.yuki.left | 0, u.alpha == null ? 1 : u.alpha, u.k || 1);
  let jx = 0, jy = 0;
  const hitAge = u.hitT ? now - u.hitT : 1e9;
  if (hitAge >= 0 && hitAge < 300) { const k = 1 - hitAge / 300; jx = (Math.random() - 0.5) * 0.12 * k; jy = (Math.random() - 0.5) * 0.08 * k; }
  const wx = u.rx + 0.5 + (u.ox || 0) + jx, wy = u.ry + 0.5 + (u.oy || 0) + jy;
  const [bx, by, s] = P(wx, wy);
  const a = u.alpha == null ? 1 : u.alpha;
  // K = ขยายหมากหกเหลี่ยม (ตัวใหญ่ที่ไม่มีรูป 4 ทิศ — กิงกะของไรโด ฮิคารุ) · ตัวปกติ = 1
  const K = u.k || 1;
  // lawCut = ร่างถูกตัดเป็นชิ้นของลอว์ (lawFx.js drawSlice วาดชิ้นส่วนแทน) — ตัวหมากโปร่ง แต่แถบเลือด/ป้าย/เป้าเล็ง/กล่องคลิกยังวาด
  g.save(); g.globalAlpha = u.lawCut ? 0 : a;
  // ไจโร (gyroFx.js): ฝุ่นกีบ · เสริมพลัง = เกลียวทองคำใต้ตัว + เปลวออร่าครึ่งหลัง
  if (u.gyro) gyroUnitBack(g, u, now, wx, wy);
  // ดิเอโก้ (diegoFx.js): ฝุ่นกีบซิลเวอร์ บูลเล็ต
  if (u.diego) diegoUnitBack(g, u, now, wx, wy);
  // รถบรรทุกเก่า / ออพติมัส ไพร์ม (optimusFx.js): วงโล่ผู้พิทักษ์
  if (u.truck) otUnitBack(g, u, now, wx, wy);
  // โจรุโน่ (giornoFx.js): ต้นไม้ใต้หมาก (ลอย) · วงเต่าทอง (ต้นตอแห่งชีวิต) · ออร่าทอง (Muda) · วงวนตาย · แสงรอผลธนู · เปลวทอง Requiem — ต้นไม้/วนตาย ใครก็ติดได้
  if (u.giorno) gioUnitBack(g, u, now, wx, wy);
  if (u.elem) elemUnitBack(g, u, now, wx, wy); // คราบธาตุ (elementFx.js · GRID_PLAN §8.7): วงแสงใต้ฐาน + อนุภาคตามธาตุ
  if (u.otoya) otoUnitBack(g, u, now, wx, wy); // คุเรไน (otoyaFx.js): ออร่า Dark Kiva · ตรา Kiva (หลุมพราง) · โซ่แดง (Wake Up 2) · วงทอง (เป้าดนตรี)
  if (u.dio) dioUnitBack(g, u, now, wx, wy); // ดิโอ (dioFx.js): ออร่าทองตอนหยุดเวลา · ออร่าแดงตอน BloodStack 6 ขึ้นไป
  if (u.arjuna) arjUnitBack(g, u, now, wx, wy); // อรชุน (arjunaBoardFx.js): จุติ = ตะเกียงข้างหมาก · ขจัด = ดาวเคราะห์โคจร
  // อินุอิ Exceed Charge: วงแดง Photon Blood รอบฐาน · Start Up: ภาพค้างไล่ตามตอนเคลื่อนไหว
  if (u.aura === "faizExceed") {
    const p = (now / 700) % 1;
    g.strokeStyle = "#ff2433"; g.lineWidth = 3; g.globalAlpha = a * (1 - p); gEllipse(g, wx, wy, (0.42 + p * 0.3) * K, 0.04, 30); g.stroke(); g.globalAlpha = a;
  }
  if (u.faizTrail) {
    // ช่วง Clock Up (ไรเดอร์ ZECT): เงาค้างนานขึ้น · ห่างกันขึ้น (ภาพค้างน้อยลง = วาดเบาลง) · "alter" = Time Alter ของคริซุงุ: เงาสีส้ม
    const alter = u.faizTrail === "alter", clock = u.faizTrail === "clock" || alter;
    for (const t of faizGhosts(u.id, now, wx, wy, clock ? 1300 : undefined, clock ? 0.62 : undefined, clock ? 55 : undefined)) {
      const [gx, gy, gs] = P(t.x, t.y);
      g.globalAlpha = a * t.a;
      unitHex(g, u, gx, gy - gs * 0.86 * K, gs * 0.4 * K);
      if (alter) { hexPath(g, gx, gy - gs * 0.86 * K, gs * 0.4 * K + 3); g.fillStyle = `rgba(${KIRI_GHOST},0.62)`; g.fill(); }
    }
    g.globalAlpha = a;
  } else faizTrailClear(u.id);
  // ฐานแบบที่นั่ง (ทรงกระบอก) · Colony = เหรียญหกเหลี่ยม 3 มิติ (hexCoin)
  const P1 = P(wx, wy, UNIT_FRAME.piece3d ? 0.13 : 0.12);
  if (UNIT_FRAME.piece3d) hexCoin(g, u, wx, wy, K, now);
  else if (u.inCar) { /* สนาม Eos: นั่งในรถ — ไม่มีฐานบนพื้น (รถวาดแทน · board/fodlan/stage6.js) */ }
  else {
  gEllipse(g, wx + 0.05, wy + 0.07, 0.36 * K, 0, 28); g.fillStyle = "rgba(0,0,0,.22)"; g.fill();
  gEllipse(g, wx, wy, 0.32 * K, 0, 28); g.fillStyle = shadeHex(u.color, -0.25); g.fill();
  gEllipse(g, wx, wy, 0.32 * K, 0.12, 28); g.fillStyle = u.color; g.fill();
  g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 2; g.stroke();
  if (u.isMe) {
    // ตัวเรา: วงทองคู่รอบฐาน
    g.strokeStyle = "#f0c868"; g.lineWidth = 2.5; gEllipse(g, wx, wy, 0.43 * K, 0.02, 32); g.stroke();
    g.lineWidth = 1; gEllipse(g, wx, wy, 0.48 * K, 0.02, 32); g.stroke();
  } else if (u.ally) {
    // เพื่อนร่วมทีม (โหมดร่วมมือ): วงเขียวคู่รอบฐาน
    g.strokeStyle = ALLY; g.lineWidth = 2.5; gEllipse(g, wx, wy, 0.43 * K, 0.02, 32); g.stroke();
    g.lineWidth = 1; gEllipse(g, wx, wy, 0.48 * K, 0.02, 32); g.stroke();
  }
  if (u.isActor) {
    const p = (now / 1100) % 1;
    g.globalAlpha = a * (1 - p); gEllipse(g, wx, wy, (0.4 + p * 0.4) * K, 0.12, 28); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke(); g.globalAlpha = a;
  }
  }
  // ลำแสงจากฐานขึ้นรูป
  // hz = ลอยขึ้นระหว่างเดินกระโดด (หน่วยช่อง) · sq = ยุบ/ยืดตัว (Echo)
  const hexR = s * 0.4 * K;
  // สนาม Eos มองจากด้านบน: หกเหลี่ยมวางตรงกลางช่องของตัวเอง (ไม่ลอยขึ้นไปทับช่องข้างบน — ผู้ใช้แจ้ง 2026-11-09)
  // นั่งในรถ (สนาม Eos — ผู้ใช้สั่ง 2026-11-09 "ให้เป็น 1 เดียวกับรถ ไม่ต้องมีขาหมาก"): รูปอยู่ระดับห้องโดยสาร ไม่ลอย
  let hy = (UNIT_FRAME.uiPiece && pitchOf() >= 80 ? by : u.inCar ? by - s * 0.5 * K : by - s * 0.86 * K) + (u.isActor ? Math.sin(now / 280) * s * 0.04 : 0) - (u.hz || 0) * s * 0.85;
  // ร่างรถ (รถบรรทุกเก่า / รถบรรทุก): รถทั้งคัน ไม่มีคนขี่ — ไม่มีเสา/หกเหลี่ยม เหลือหลอดพลังเหนือรถ · กล่องคลิกเท่ารูปรถ
  //  เฟรดดี้ ฟาซแบร์ (freddyFx.js): ภาพตัวเต็มแทนหมาก — ไม่มีเสา/หกเหลี่ยม เหมือนร่างรถ
  const tb = otRides(u) ? otTruck(g, u, now, wx, wy, (u.hz || 0) - OT_RIDE_Z) : hasStandee(u) ? drawStandee(g, u, now, wx, wy, u.hz || 0) : null;
  if (tb) hy = tb.top - vitalHeight(u, UNIT_FRAME.uiK) - 4 * UNIT_FRAME.uiK - hexR * 0.87 - 4 * UNIT_FRAME.uiK;
  const bm = g.createLinearGradient(0, hy, 0, P1[1]);
  bm.addColorStop(0, hexA(u.color, 0.2)); bm.addColorStop(1, hexA(u.color, 0.9));
  if (UNIT_FRAME.piece3d && !u.fly && !tb) {
    // เสาโลหะทรงกลม (ด้านซ้ายสว่าง/ขวามืด) ตั้งจากกลางเหรียญถึงป้ายรูป
    const pw = Math.max(4, s * 0.05), sg = g.createLinearGradient(bx - pw / 2, 0, bx + pw / 2, 0);
    sg.addColorStop(0, "#f4f7fb"); sg.addColorStop(0.45, "#b9c3cf"); sg.addColorStop(1, "#5d6876");
    g.fillStyle = sg; g.fillRect(bx - pw / 2, hy, pw, P1[1] - hy);
    g.fillStyle = hexA(u.color, 0.55); g.fillRect(bx - pw / 2, hy, pw, (P1[1] - hy) * 0.35);
  } else if (!u.fly && !tb && !u.inCar) { g.fillStyle = bm; g.fillRect(bx - 2.5, hy, 5, P1[1] - hy); } // fly = บินอยู่ (ปีกเขม่า) — ไม่มีแท่งต่อลงพื้น
  if (u.isActor && !tb) {
    const gl = g.createRadialGradient(bx, hy, hexR * 0.6, bx, hy, hexR * 1.7);
    gl.addColorStop(0, "rgba(255,255,255,.35)"); gl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gl; g.fillRect(bx - hexR * 1.8, hy - hexR * 1.8, hexR * 3.6, hexR * 3.6);
  }
  // ไจโรขี่ม้า: ม้าวาลคิรีบังเสา หมากนั่งบนหลัง (hz รวม GYRO_RIDE_Z แล้ว) · เพิ่งลง/ม้าตาย = ม้าถอยออก/สลายใต้หมาก
  if (u.gyro) gyroHorse(g, u, now, wx, wy, (u.hz || 0) - (u.gyro.mounted ? GYRO_RIDE_Z : 0));
  // ดิเอโก้ขี่ซิลเวอร์ บูลเล็ต (หรือกำลังควบกลอุบาย — charge) · เพิ่งลง/ม้าตาย = ม้าถอยออก/สลาย
  if (u.diego) diegoHorse(g, u, now, wx, wy, (u.hz || 0) - (u.diego.mounted || u.diego.charge ? DIEGO_RIDE_Z : 0));
  if (tb) { /* ร่างรถ: วาดรถไปแล้วด้านบน — ไม่มีหกเหลี่ยม */ }
  else if (u.sq) { g.save(); g.translate(bx, hy + hexR); g.scale(1 + u.sq, 1 - u.sq); g.translate(-bx, -hy - hexR); unitHex(g, u, bx, hy, hexR); g.restore(); }
  else {
    // Colony: ป้ายรูปมีความหนา — แผ่นหลังสีเข้มเยื้องลงขวา
    if (UNIT_FRAME.piece3d) { const d = Math.max(2, hexR * 0.09); hexPath(g, bx + d * 0.6, hy + d, hexR + 3); g.fillStyle = shadeHex(u.color, -0.55); g.fill(); }
    unitHex(g, u, bx, hy, hexR);
  }
  if (u.isActor && !tb) { const q = UNIT_FRAME.uiPiece ? Math.min(1, hexR / 26) : 1; hexPath(g, bx, hy, hexR + 5 * q); g.strokeStyle = "#ffffff"; g.lineWidth = 2 * q; g.stroke(); }
  if (u.cloak && !REDUCED && !tb) cloakShimmer(g, bx, hy, hexR, now);
  // ขี่ผู้เล่นอื่น (ยูนะ): ตัวที่ขี่วาดเป็นหมากเล็กบนหลัง
  if (u.rider) drawRider(g, u.rider, bx, hy, hexR, now, unitHex, a);
  // ไจโรเสริมพลัง: เปลวออร่าครึ่งหน้า + อนุภาคทองวนแขน + ลูกทองในมือ
  if (u.gyro) gyroUnitFront(g, u, now, wx, wy, bx, hy, hexR);
  // ชุ่มน้ำมัน (หยดอำพันไหล) / ติดตาข่าย (ลวดรัดตัว) — ใครก็ติดได้
  if (u.dstat) diegoUnitFront(g, u, now, wx, wy, bx, hy, hexR);
  if (u.elem && !tb) elemUnitFront(g, u, bx, hy, hexR); // ป้ายไอคอนคราบธาตุมุมขวาบนของหมาก
  if (u.otoya) otoUnitFront(g, u, now, wx, wy); // ค้างคาวโคจร · ไวโอลินเหนือหัว · โน้ตวนรอบเป้า
  if (u.giorno) gioUnitFront(g, u, now, wx, wy); // เปลวทอง Requiem ครึ่งหน้า · ธนูปักตัว (รอผลธนู)
  if (u.offline && !tb) drawOffline(g, bx, hy, hexR, now);
  if (hitAge >= 0 && hitAge < 150 && !tb) { g.save(); hexPath(g, bx, hy, hexR); g.fillStyle = `rgba(255,255,255,${0.85 * (1 - hitAge / 150)})`; g.fill(); g.restore(); }
  if (u.yuki) yukiAuraFront(g, u, wx, wy, bx, by, hy, hexR, now, u.lowQ, UNIT_FRAME.uiK);
  g.globalAlpha = a;
  // แผ่นเลือด/เกราะขนาดเล็ก (มืดบอด = ไม่มี · noBar = ฉากของวาเลนไทน์ซ่อนแถบไว้ชั่วคราว)
  if (u.masked || u.noBar) {
    g.restore();
    if (boxes) boxes.push(unitBox(u, wx, wy, bx, by, s, hy, hexR, tb));
    return;
  }
  const UK = UNIT_FRAME.uiPiece ? hexR / 40 : UNIT_FRAME.uiK;
  const py = hy + hexR * 0.87 + 4 * UK;
  const pw = vitalBig(u) ? Math.max(hexR * 2.5, 70 * UK) : Math.max(hexR * 1.9, 48 * UK);
  const ph = drawVitalBar(g, bx, py, pw, u, UK) - py;
  // ชื่อ (ตอนชี้)
  if (u.hovered && u.name) {
    g.font = `600 ${13 * UK}px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
    const nw = g.measureText(u.name).width + 14 * UK;
    g.fillStyle = "rgba(13,28,54,.92)"; g.fillRect(bx - nw / 2, py + ph + 3 * UK, nw, 19 * UK);
    g.fillStyle = "#ffffff"; g.fillText(u.name, bx, py + ph + 13 * UK); g.textBaseline = "alphabetic";
  }
  // ป้าย "คุณ" มุมซ้ายบนของรูป
  if (u.isMe) {
    g.font = `600 ${11 * UK}px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
    const mw = g.measureText("คุณ").width + 10 * UK;
    const mx = tb ? bx - pw / 2 - mw / 2 - 4 * UK : UNIT_FRAME.uiPiece ? bx - hexR * 0.62 : bx - hexR - 4, my = tb ? py + ph / 2 : UNIT_FRAME.uiPiece ? hy - hexR * 0.72 : hy - hexR * 0.87 - 2; // Eos: ติดมุมหกเหลี่ยม (ไม่ลอย) // ร่างรถ: ข้างหลอดพลัง
    g.fillStyle = "#f0c868"; g.fillRect(mx - mw / 2, my - 8 * UK, mw, 16 * UK);
    g.fillStyle = "#3a2a08"; g.fillText("คุณ", mx, my + 0.5); g.textBaseline = "alphabetic";
  } else if (u.ally) allyBadge(g, tb ? bx - pw / 2 - 18 * UK : bx - hexR - 4, tb ? py + ph / 2 : hy - hexR * 0.87 - 2, UK);
  const tag = normTag(u.tag);
  if (tag) drawTag(g, tb ? bx + pw / 2 + 14 * UK : bx + hexR + (tag.backs ? 10 + Math.min(6, tag.backs) * 7 : 22) * (UNIT_FRAME.uiPiece ? UK : 1), tb ? py + ph / 2 : hy - hexR * 0.2, tag);
  if (u.isActor) {
    const ay = (tb ? py - 6 : hy - hexR - 14) + Math.sin(now / 200) * 3;
    g.fillStyle = "#fff"; g.beginPath(); g.moveTo(bx - 8, ay - 9); g.lineTo(bx + 8, ay - 9); g.lineTo(bx, ay); g.closePath(); g.fill();
  }
  if (u.reticle) { if (tb) drawReticle(g, tb.cx, (tb.top + tb.bottom) / 2, (tb.bottom - tb.top) * 0.5, u.reticle, now, u.hpTone === "ally"); else drawReticle(g, bx, hy, hexR, u.reticle, now, u.hpTone === "ally"); }
  g.restore();
  if (auraAt) kiraAuraFront(g, auraAt[0], auraAt[1], now, u.lowQ, auraAt[2]);
  if (u.aura === "shinraHero" || u.aura === "shinraBlaze") shinraAuraFront(g, u.rx + 0.5 + (u.ox || 0), u.ry + 0.5 + (u.oy || 0), now, u.lowQ, u.alpha == null ? 1 : u.alpha, u.aura === "shinraBlaze");
  if (u.aura === "kazumaKing") kazumaKingAuraFront(g, u.rx + 0.5 + (u.ox || 0), u.ry + 0.5 + (u.oy || 0), now, u.lowQ, u.alpha == null ? 1 : u.alpha);
  if (boxes) boxes.push(unitBox(u, wx, wy, bx, by, s, hy, hexR, tb));
}
// กล่องคลิก/ชี้ของหมาก · ร่างรถ = รูปรถทั้งคัน + หลอดพลังเหนือรถ
function unitBox(u, wx, wy, bx, by, s, hy, hexR, tb) {
  if (tb) return { id: u.id, x: u.rx, y: u.ry, d: depthOf(wx, wy), x0: tb.left, y0: hy, x1: tb.right, y1: Math.max(tb.bottom, by + s * 0.2) };
  return { id: u.id, x: u.rx, y: u.ry, d: depthOf(wx, wy), x0: bx - hexR - 4, y0: hy - hexR - 4, x1: bx + hexR + 4, y1: by + s * 0.2 };
}


// =================================================================== ตัวใหญ่ (Echo ขยายร่าง)
//  u.size = ด้านละกี่ช่อง (u.rx, u.ry = มุมบนซ้าย) · u.art = { front, side, back, top } · u.face = { x, y } ทิศที่หันหน้า (ไม่มี = หันเข้ากล้องตอนมุม 0)
//  มุมเอียง: เลือกรูปหน้า/ข้าง/หลังตามทิศที่หันเทียบกับกล้อง (ข้างซ้าย = กลับด้านรูปข้าง) · มุมบน: รูปมุมบนวางราบหมุนตามทิศที่หัน
//  u.grow = { t0, from, to } — กำลังเปลี่ยนขนาด: ขนาดบนจอค่อยๆ เด้งจากขนาดเดิมไปขนาดใหม่ (GROW_MS)
export const GROW_MS = 1100;
const BREAK_AT = 0.36; // 1 → ใหญ่: ช่วงแรกหกเหลี่ยมสั่น/ร้าว แล้วแตกออก รูปเต็มตัวเด้งออกมา
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const easeOutBack = (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
// ขนาดบนจอตอนนี้ (หน่วยช่อง) — ระหว่างขยาย/หด ค่อยๆ เปลี่ยน · 1 → ใหญ่ เริ่มจากตัวเล็ก (0.35) หลังกรอบแตก
export function bigDrawSize(u, now) {
  const gr = u.grow;
  if (!gr) return u.size;
  const t = clamp01((now - gr.t0) / GROW_MS);
  if (gr.from <= 1 && gr.to > 1) {
    if (t < BREAK_AT) return 0;
    const k = (t - BREAK_AT) / (1 - BREAK_AT);
    return 0.35 + (gr.to - 0.35) * easeOutBack(clamp01(k / 0.7));
  }
  if (gr.to <= 1) return gr.from + (0.35 - gr.from) * clamp01(t / 0.55);
  return gr.from + (gr.to - gr.from) * easeOutBack(clamp01(t / 0.6));
}
function bigImgOf(u) {
  const art = u.art || {};
  if (pitchOf() >= 80) return { url: art.top || art.front, top: true, flip: false };
  const f = u.face || { x: 0, y: 1 }, ax = viewAxes();
  const fd = f.x * ax.fx + f.y * ax.fy, rd = f.x * ax.rx + f.y * ax.ry;
  if (fd > 0.5) return { url: art.front, top: false, flip: false };
  if (fd < -0.5) return { url: art.back || art.front, top: false, flip: false };
  return { url: art.side || art.front, top: false, flip: rd < 0 };
}
function footQuad(g, x, y, s, inset) {
  const a = P(x + inset, y + inset), b = P(x + s - inset, y + inset), c = P(x + s - inset, y + s - inset), d = P(x + inset, y + s - inset);
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
}
function drawBigUnit(g, u, now, boxes) {
  let jx = 0, jy = 0;
  const hitAge = u.hitT ? now - u.hitT : 1e9;
  if (hitAge >= 0 && hitAge < 300) { const k = 1 - hitAge / 300; jx = (Math.random() - 0.5) * 0.16 * k; jy = (Math.random() - 0.5) * 0.1 * k; }
  const n = u.size, es = Math.max(0.35, bigDrawSize(u, now));
  const x0 = u.rx + (u.ox || 0) + jx, y0 = u.ry + (u.oy || 0) + jy;
  const cx = x0 + n / 2, cy = y0 + n / 2;
  const a = u.alpha == null ? 1 : u.alpha;
  g.save(); g.globalAlpha = u.lawCut ? 0 : a; // lawCut = ร่างถูกตัดของลอว์ (ดู drawUnit)
  // ฐาน: พื้นทั้งตัวเรืองสีประจำที่นั่ง
  const shrinkTo1 = u.grow && u.grow.to <= 1;
  if (!shrinkTo1) {
    footQuad(g, x0, y0, n, 0.06); g.fillStyle = hexA(u.color, 0.22); g.fill();
    g.strokeStyle = hexA(u.color, 0.95); g.lineWidth = 2.5; g.stroke();
    if (u.isMe) { footQuad(g, x0, y0, n, -0.04); g.strokeStyle = "#f0c868"; g.lineWidth = 2.5; g.stroke(); }
    else if (u.ally) { footQuad(g, x0, y0, n, -0.04); g.strokeStyle = ALLY; g.lineWidth = 2.5; g.stroke(); }
    if (u.isActor) {
      const p = (now / 1100) % 1;
      g.globalAlpha = a * (1 - p); footQuad(g, x0, y0, n, -0.06 - p * 0.35); g.strokeStyle = "#fff"; g.lineWidth = 2; g.stroke(); g.globalAlpha = a;
    }
  }
  const [bx, by, s] = P(cx, cy);
  const hz = u.hz || 0, sq = u.sq || 0;
  gEllipse(g, cx + 0.06, cy + 0.08, es * 0.42 * (1 - Math.min(0.4, hz * 0.6)), 0, 36); g.fillStyle = "rgba(0,0,0,.25)"; g.fill();
  const pick = bigImgOf(u), e = getImg(pick.url);
  let top, left, right;
  if (e && e.ok) {
    const iw = e.img.naturalWidth, ih = e.img.naturalHeight;
    if (pick.top) {
      // มุมบน: วางราบบนตัวทั้งก้อน หมุนให้เท้าชี้ไปทางที่หัน
      const f = u.face || { x: 0, y: 1 }, q = P(cx + f.x, cy + f.y);
      const ang = Math.atan2(q[1] - by, q[0] - bx) - Math.PI / 2;
      const k = (es * s * 1.12) / Math.max(iw, ih) * (1 + hz * 0.35), w = iw * k, h = ih * k;
      g.save(); g.translate(bx, by); g.rotate(ang); g.drawImage(e.img, -w / 2, -h / 2, w, h); g.restore();
      top = by - Math.max(w, h) / 2; left = bx - Math.max(w, h) / 2; right = bx + Math.max(w, h) / 2;
    } else {
      // มุมเอียง: รูปตั้ง เท้าอยู่ค่อนไปทางขอบหน้าของตัว
      const h = es * s * 1.32, w = h * iw / ih, foot = by + s * es * 0.28 + (u.isActor ? Math.sin(now / 280) * s * 0.03 : 0) - hz * s * 0.85;
      g.save(); g.translate(bx, foot);
      if (sq) g.scale(1 + sq, 1 - sq);
      if (pick.flip) g.scale(-1, 1);
      g.drawImage(e.img, -w / 2, -h, w, h);
      if (hitAge >= 0 && hitAge < 150) { g.globalCompositeOperation = "source-atop"; g.fillStyle = `rgba(255,255,255,${0.75 * (1 - hitAge / 150)})`; g.fillRect(-w / 2, -h, w, h); }
      g.restore();
      top = foot - h; left = bx - w / 2; right = bx + w / 2;
    }
  } else {
    // รูปยังไม่โหลด: หกเหลี่ยมขยายตามตัว
    const r = s * 0.4 * es;
    unitHex(g, u, bx, by - r, r);
    top = by - r * 2; left = bx - r; right = bx + r;
  }
  if (u.cloak && !REDUCED) { g.globalAlpha = a * 0.35; footQuad(g, x0, y0, n, 0.1); g.fillStyle = "rgba(220,240,255,.5)"; g.fill(); g.globalAlpha = a; }
  g.globalAlpha = a;
  // แถบเลือด (ตัวใหญ่มีเลือดมาก — แถบยาวตามตัว)
  const bu = { ...u, maxHp: u.maxHp || 10, maxArmor: u.maxArmor | 0 };
  const pw = Math.max(80, Math.min(220, es * s * 0.8)), ph = vitalHeight(bu), px = bx - pw / 2, py = top - ph - 8;
  drawVitalBar(g, bx, py, pw, bu);
  if (u.hovered && u.name) {
    g.font = `600 13px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
    const nw = g.measureText(u.name).width + 14;
    g.fillStyle = "rgba(13,28,54,.92)"; g.fillRect(bx - nw / 2, py - 24, nw, 19);
    g.fillStyle = "#ffffff"; g.fillText(u.name, bx, py - 14); g.textBaseline = "alphabetic";
  }
  if (u.isMe) {
    g.font = `600 11px ${F_TH}`; g.textAlign = "center"; g.textBaseline = "middle";
    const mw = g.measureText("คุณ").width + 10, mx = px - mw / 2 - 4, my = py + ph / 2;
    g.fillStyle = "#f0c868"; g.fillRect(mx - mw / 2, my - 8, mw, 16);
    g.fillStyle = "#3a2a08"; g.fillText("คุณ", mx, my + 0.5); g.textBaseline = "alphabetic";
  } else if (u.ally) allyBadge(g, px - 22, py + ph / 2, 1);
  if (u.isActor) {
    const ay = py - 10 + Math.sin(now / 200) * 3;
    g.fillStyle = "#fff"; g.beginPath(); g.moveTo(bx - 9, ay - 10); g.lineTo(bx + 9, ay - 10); g.lineTo(bx, ay); g.closePath(); g.fill();
  }
  if (u.reticle) drawReticle(g, bx, (top + by) / 2, Math.max(20, (by - top) * 0.45), u.reticle, now, u.hpTone === "ally");
  g.restore();
  if (boxes) boxes.push({ id: u.id, x: u.rx, y: u.ry, d: depthOf(cx, cy), x0: left - 4, y0: top - 4, x1: right + 4, y1: by + s * es * 0.35 });
}
// หมากตัวเดียว: ตัวใหญ่ที่มีรูป 4 ทิศ = drawBigUnit · ระหว่างขยาย/หดข้ามขนาด 1 เลือกตามจังหวะ
// ร่างของตัวที่ล้ม (ระบบคู่ — เคท & เอมิลิโกะ): เงาร่างนอนราบบนช่อง · ขวางช่องแต่เดินข้ามได้
//  ปื้นเขม่าบนพื้น → หกเหลี่ยมรูปตัวละครนอนเอียง (มืด/ขาวดำ) → ควันเขม่าลอยช้าๆ (ปิดเมื่อ reduced motion)
function drawCorpse(g, u, now, boxes) {
  const wx = u.rx + 0.5 + (u.ox || 0), wy = u.ry + 0.5 + (u.oy || 0);
  const [bx, by, s] = P(wx, wy);
  const a = u.alpha == null ? 1 : u.alpha;
  g.save(); g.globalAlpha = a;
  gEllipse(g, wx, wy, 0.44, 0, 28); g.fillStyle = "rgba(8,6,16,.5)"; g.fill();
  gEllipse(g, wx, wy, 0.3, 0, 24); g.fillStyle = "rgba(8,6,16,.4)"; g.fill();
  const r = s * 0.34, cy = by - s * 0.07;
  g.save(); g.translate(bx, cy); g.rotate(-0.32); g.scale(1, 0.46);
  hexPath(g, 0, 0, r + 3); g.fillStyle = "#07060d"; g.fill();
  hexPath(g, 0, 0, r + 1.5); g.strokeStyle = hexA(u.color || "#7f8aa6", 0.55); g.lineWidth = 2.5; g.stroke();
  g.save(); hexPath(g, 0, 0, r - 1); g.clip();
  const e = getImg(u.img);
  if (e && e.ok) {
    if ("filter" in g) g.filter = "grayscale(1) brightness(.4)";
    cover(g, e.img, -r, -r * 0.87, r * 2, r * 1.74, 0.08);
    if ("filter" in g) g.filter = "none";
  } else { g.fillStyle = "#1a1726"; g.fillRect(-r, -r, r * 2, r * 2); }
  g.fillStyle = "rgba(10,8,22,.45)"; g.fillRect(-r, -r, r * 2, r * 2);
  g.restore();
  g.restore();
  if (!REDUCED) {
    for (let i = 0; i < 3; i++) {
      const ph = (now / 2600 + i / 3 + (u.rx * 0.37 + u.ry * 0.21)) % 1;
      const px = bx + (i - 1) * s * 0.16 + Math.sin(ph * 6 + i) * s * 0.04, py = cy - ph * s * 0.5;
      g.globalAlpha = a * 0.5 * Math.sin(ph * Math.PI);
      g.fillStyle = "#14101f"; g.beginPath(); g.arc(px, py, s * (0.035 + ph * 0.05), 0, Math.PI * 2); g.fill();
    }
  }
  g.restore();
  if (boxes) boxes.push({ id: u.id, x: u.rx, y: u.ry, d: depthOf(wx, wy), x0: bx - r - 4, y0: cy - r * 0.6, x1: bx + r + 4, y1: by + s * 0.2 });
}
// ฟันนี่ วาเลนไทน์ (valentineFx.js): ฉากที่ตัด/บีบ/เจาะรู/พลิกหมาก (valMod) · คนละโลก (ghostDim — โปร่ง กดไม่ได้) · ตัวเหมือน (summon double — ตะเข็บ)
export function drawAnyUnit(g, u, now, boxes) {
  // ยูกิกำลังนับถอยหลัง: จดตำแหน่งบนจอของหมากทุกตัว (ฉากระเบิด YukiBoom.jsx ใช้)
  yukiNoteUnit(g, u);
  // Moon Cell (moonFx.js): โมเดลลูกบาศก์ลอย แทนหมาก
  if (u.summon && u.summon.kind === "moonCell" && !u.corpse) { drawMoonCell(g, u, now, boxes, { UK: UNIT_FRAME.uiK, vitalBar: drawVitalBar, vitalHeight }); return; }
  // มอนโหมด Road Trip (board/roadtrip/mobArt.js): ตัวมอนแทนหมาก · แถบเลือดแดง · เป้าเล็ง · กล่องคลิก
  if (isRtMob(u) && !u.corpse) {
    const m = drawRtMob(g, u, now, UNIT_FRAME.night), UK = UNIT_FRAME.uiK;
    if (!u.masked && !u.noBar) { const w = Math.max(m.half * 1.9, 46 * UK); drawVitalBar(g, m.cx, m.top - vitalHeight(u, UK) - 3 * UK, w, { ...u, hpTone: null }, UK); }
    if (u.reticle) drawReticle(g, m.cx, (m.top + m.bottom) / 2, Math.max(12, (m.bottom - m.top) * 0.42), u.reticle, now, false, 4);
    if (boxes) boxes.push({ id: u.id, x: u.rx, y: u.ry, d: m.d, x0: m.cx - m.half, y0: m.top - vitalHeight(u, UK) - 4, x1: m.cx + m.half, y1: m.bottom });
    return;
  }
  // มอนเตอร์ของสนาม Eos (ยูนิตที่ถูกเรียก — server/fodlan/stage6.js): ภาพตัว/หลอดเลือดวาดใน fodlan/stage6.js items · ที่นี่แค่กรอบคลิก + เป้าเล็ง
  if (u.summon && (u.summon.kind === "eosMob" || u.summon.kind === "eosConvoy" || u.summon.kind === "eosCivilian") && !u.corpse) { // รถเสบียง/พลเรือนวาดใน stage6 items เช่นกัน
    const cx = u.rx + 0.5, cy = u.ry + 0.55, [sx, sy, s] = P(cx, cy, 0);
    if (u.reticle) drawReticle(g, sx, sy - s * 0.5, Math.max(12, s * 0.34), u.reticle, now, u.summon.kind !== "eosMob", 4); // วงเล็กลง (ผู้ใช้ 2026-11-10 "วงใหญ่เกิน")
    if (boxes) boxes.push({ id: u.id, x: u.rx, y: u.ry, d: depthOf(cx, cy), x0: sx - s * 0.45, y0: sy - s * 1.45, x1: sx + s * 0.45, y1: sy + s * 0.12 });
    return;
  }
  if (u.valMod || u.ghostDim || (u.summon && u.summon.kind === "double")) { drawValUnit(g, u, now, (uu, withBox) => drawAnyUnitBase(g, uu, now, withBox ? boxes : null)); return; }
  drawAnyUnitBase(g, u, now, boxes);
}
function drawAnyUnitBase(g, u, now, boxes) {
  if (u.corpse) { if (u.ryougiSlain) drawBloodCorpse(g, u, now, boxes); else drawCorpse(g, u, now, boxes); return; } // ถูกเรียวกิสังหาร = กองเลือดแทนร่าง
  const gr = u.grow, t = gr ? clamp01((now - gr.t0) / GROW_MS) : 1;
  // ตัวใหญ่ที่ไม่มีรูป 4 ทิศ (กิงกะของไรโด ฮิคารุ): หมากหกเหลี่ยมขยายครอบทั้งตัว กลางตัว · ระหว่างขยาย/หด ค่อยๆ เปลี่ยนขนาด
  if (!u.art && (u.size > 1 || (gr && gr.from > 1 && t < 0.55))) {
    const n = u.size > 1 ? u.size : gr.from, es = gr ? Math.max(1, bigDrawSize(u, now)) : n;
    const c = u.size > 1 ? (u.size - 1) / 2 : 0; // หดแล้ว: server วางตัวเล็กไว้กลางตัวเดิมอยู่แล้ว
    drawUnit(g, { ...u, rx: u.rx + c, ry: u.ry + c, k: 1 + (es - 1) * 0.6 }, now, boxes);
    return;
  }
  if (u.size > 1 && u.art) {
    if (gr && gr.from <= 1 && t < BREAK_AT) {
      // ก่อนกรอบแตก: หกเหลี่ยมเดิมสั่นแรงขึ้นเรื่อยๆ กลางตัวใหม่
      const k = t / BREAK_AT, sh = 0.05 + k * 0.12, mid = (u.size - 1) / 2;
      drawUnit(g, { ...u, rx: u.rx + mid + (Math.random() - 0.5) * sh, ry: u.ry + mid + (Math.random() - 0.5) * sh }, now, boxes);
      return;
    }
    drawBigUnit(g, u, now, boxes);
    return;
  }
  if (u.art && gr && gr.from > 1 && gr.to <= 1 && t < 0.55) { drawBigUnit(g, { ...u, size: gr.from, rx: u.rx - Math.floor((gr.from - 1) / 2), ry: u.ry - Math.floor((gr.from - 1) / 2) }, now, boxes); return; }
  drawUnit(g, u, now, boxes);
}
// เอฟเฟกต์ขยายร่าง (ทุกคนเห็น) — e = { x, y (มุมบนซ้ายตัวใหม่), from, to, color }
//  1 → ใหญ่: แสงวาบ + เศษกรอบหกเหลี่ยมกระเด็นออก · ใหญ่ขึ้น: คลื่นกระแทกบนพื้นรอบตัว + ฝุ่น · หดตัว: ประกายไหลเข้าหาตัว
export function growFx(g, e, now) {
  const t = (now - e.t0) / GROW_MS;
  if (t <= 0 || t >= 1) return;
  const n = Math.max(1, e.to | 0), cx = e.x + n / 2, cy = e.y + n / 2;
  const rgb = rgbOf(normColor(e.color || "#9B4F96")).join(",");
  g.save();
  if (e.from <= 1 && e.to > 1) {
    const k = (t - BREAK_AT) / (1 - BREAK_AT);
    if (k > 0) {
      const [hx, hy, s] = P(cx, cy, 0.86);
      const fl = clamp01(1 - k / 0.35);
      if (fl > 0) { g.globalAlpha = fl; g.fillStyle = "#ffffff"; g.beginPath(); g.arc(hx, hy, s * (0.4 + k * 2.4), 0, 7); g.fill(); }
      for (let i = 0; i < 12; i++) {
        const ang = i / 12 * Math.PI * 2 + 0.3, d = s * (0.3 + k * 2.2), rot = k * (i % 2 ? 6 : -5);
        const sx = hx + Math.cos(ang) * d, sy = hy + Math.sin(ang) * d * 0.8 + k * k * s * 1.2;
        g.globalAlpha = clamp01(1 - k * 1.1);
        g.save(); g.translate(sx, sy); g.rotate(ang + rot);
        g.fillStyle = i % 3 ? "#0d1c36" : `rgb(${rgb})`; g.strokeStyle = `rgba(${rgb},1)`; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, -s * 0.16); g.lineTo(s * 0.12, s * 0.1); g.lineTo(-s * 0.1, s * 0.08); g.closePath(); g.fill(); g.stroke();
        g.restore();
      }
      for (let i = 0; i < 18; i++) {
        const ang = i * 2.39, d = s * (0.2 + k * (1.4 + (i % 4) * 0.4));
        g.globalAlpha = clamp01(1 - k) * 0.9; g.fillStyle = i % 2 ? "#ffffff" : `rgb(${rgb})`;
        g.beginPath(); g.arc(hx + Math.cos(ang) * d, hy + Math.sin(ang) * d * 0.7 - k * s * 0.6, 2.4, 0, 7); g.fill();
      }
    }
  } else if (e.to > e.from) {
    for (let r = 0; r < 2; r++) {
      const k = clamp01(t * 1.5 - r * 0.25);
      if (k <= 0 || k >= 1) continue;
      g.globalAlpha = (1 - k) * 0.9; g.strokeStyle = r ? "#ffffff" : `rgba(${rgb},1)`; g.lineWidth = 6 * (1 - k) + 1;
      footQuad(g, e.x, e.y, n, -k * 1.6); g.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const side = i % 4, f = ((i * 0.37) % 1);
      const px = side === 0 ? e.x + f * n : side === 1 ? e.x + n : side === 2 ? e.x + f * n : e.x;
      const py = side === 0 ? e.y : side === 1 ? e.y + f * n : side === 2 ? e.y + n : e.y + f * n;
      const k = clamp01(t * 1.3);
      const [dx, dy, s] = P(px, py, k * 0.5);
      g.globalAlpha = (1 - k) * 0.55; g.fillStyle = "rgba(200,190,180,1)";
      g.beginPath(); g.ellipse(dx, dy, s * (0.12 + k * 0.3), s * (0.08 + k * 0.18), 0, 0, 7); g.fill();
    }
  } else {
    const [hx, hy, s] = P(cx, cy, 0.6);
    for (let i = 0; i < 20; i++) {
      const ang = i * 2.39, d = s * (e.from * 0.8) * (1 - t);
      g.globalAlpha = Math.sin(t * Math.PI) * 0.9; g.fillStyle = i % 2 ? "#ffffff" : `rgb(${rgb})`;
      g.beginPath(); g.arc(hx + Math.cos(ang) * d, hy + Math.sin(ang) * d * 0.7, 2.6, 0, 7); g.fill();
    }
  }
  g.restore();
}
