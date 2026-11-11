// ============================================================
//  ตัวบนกระดานของเฟรดดี้ ฟาซแบร์ (characters/freddy_fazbear.js)
//  ไม่ใช่หมากหกเหลี่ยม — ภาพตัวเต็มตัดพื้นหลังยืนบนช่อง (แบบร่างรถของออพติมัส · ผู้ใช้สั่ง 2026-11-11)
//  u.standee = url ภาพ · หันตามทางเดิน · เดิน = โยกเล็กน้อย · คืนกรอบบนจอให้ drawUnit วางหลอดพลัง/กล่องคลิก
// ============================================================
import { P, gEllipse } from "./boardGeo";

const REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const STANDEE_H = 1.55; // ความสูงภาพ (หน่วยช่อง)

const imgs = {};
function standeeImg(url) {
  if (!url) return null;
  if (!imgs[url] && typeof Image === "function") { const img = new Image(); img.decoding = "async"; img.src = url; imgs[url] = img; }
  const img = imgs[url];
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}
export const preloadStandee = (url) => { standeeImg(url); };

const track = new Map();
function faceOf(u, wx, wy, now) {
  let tr = track.get(u.id);
  const [sx] = P(wx, wy);
  if (!tr) { if (track.size > 24) track.clear(); tr = { sx, face: 1, moveT: -1e9, frame: now }; track.set(u.id, tr); }
  if (tr.frame !== now) {
    if (Math.abs(sx - tr.sx) > 0.3) { tr.face = sx > tr.sx ? 1 : -1; tr.moveT = now; }
    tr.sx = sx; tr.frame = now;
  }
  return tr;
}
export const hasStandee = (u) => !!(u && u.standee);
// วาดภาพแทนหมาก → { cx, top, bottom, left, right } (ยังโหลดไม่เสร็จ = undefined → drawUnit วาดหกเหลี่ยมแทนชั่วคราว)
export function drawStandee(g, u, now, wx, wy, liftZ = 0) {
  const img = standeeImg(u.standee);
  if (!img) return undefined;
  const tr = faceOf(u, wx, wy, now), moving = now - tr.moveT < 160;
  const [bx, by, s] = P(wx, wy, Math.max(0, liftZ));
  const H = s * STANDEE_H * (u.k || 1), W = (H * img.naturalWidth) / img.naturalHeight;
  const sway = REDUCED || !moving ? 0 : Math.sin(now / 90) * 0.05;
  g.save();
  if (liftZ <= 0.05) { gEllipse(g, wx + 0.03, wy + 0.05, 0.38, 0, 28, 0.32); g.fillStyle = "rgba(0,0,0,.32)"; g.fill(); }
  const foot = by + s * 0.12;
  g.translate(bx, foot); g.rotate(sway); g.scale(tr.face > 0 ? 1 : -1, 1);
  if (u.isActor) { g.shadowColor = "rgba(255,255,255,.55)"; g.shadowBlur = 14; }
  g.drawImage(img, -W * 0.5, -H, W, H);
  g.restore();
  return { cx: bx, top: foot - H, bottom: foot, left: bx - W * 0.5, right: bx + W * 0.5 };
}
