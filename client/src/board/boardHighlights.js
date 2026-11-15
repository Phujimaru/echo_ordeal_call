// ============================================================
//  ไฮไลต์บนกระดาน (แยกจาก boardDraw.js) — ช่องเดิน/ตี/สกิล/พื้นที่/อันตราย · เส้นขอบกลุ่มช่อง · ลูกศร
// ============================================================
import { P, gEllipse, key, parseKey, quad } from "./boardGeo";
import { drawPickArrows } from "./iceFx";
import { normPt, ptList } from "./boardBake";
import { OV } from "./boardCamera";

// =================================================================== overlays
function tileFill(g, x, y, fill, stroke, inset = 0.06) {
  quad(g, x, y, inset); g.fillStyle = fill; g.fill();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); }
}
// เส้นขอบรอบนอกของกลุ่มช่อง (ใช้กับวงตีหมู่/ระยะอันตราย)
function outlineSet(g, set, color, width) {
  g.beginPath();
  for (const k of set) {
    const [x, y] = parseKey(k);
    const seg = (ax, ay, bx2, by2) => { const a = P(ax, ay), b = P(bx2, by2); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); };
    if (!set.has(key(x, y - 1))) seg(x, y, x + 1, y);
    if (!set.has(key(x, y + 1))) seg(x, y + 1, x + 1, y + 1);
    if (!set.has(key(x - 1, y))) seg(x, y, x, y + 1);
    if (!set.has(key(x + 1, y))) seg(x + 1, y, x + 1, y + 1);
  }
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = "round"; g.stroke(); g.lineCap = "butt";
}
function arrowGround(g, x0, y0, x1, y1, color) {
  const a = P(x0 + 0.5, y0 + 0.5), b = P(x1 + 0.5, y1 + 0.5);
  g.strokeStyle = color; g.lineWidth = 5; g.lineCap = "round"; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.lineCap = "butt";
  const an = Math.atan2(b[1] - a[1], b[0] - a[0]);
  g.fillStyle = color; g.beginPath(); g.moveTo(b[0] + Math.cos(an) * 7, b[1] + Math.sin(an) * 7);
  g.lineTo(b[0] + Math.cos(an + 2.5) * 15, b[1] + Math.sin(an + 2.5) * 15); g.lineTo(b[0] + Math.cos(an - 2.5) * 15, b[1] + Math.sin(an - 2.5) * 15); g.closePath(); g.fill();
}
const inB = (info, x, y) => x >= 0 && y >= 0 && x < info.cols && y < info.rows;

// highlights (prop) → ข้อมูลพร้อมวาด — เรียกเมื่อ prop เปลี่ยน
export function prepareHighlights(h) {
  const toSet = (list) => new Set((Array.isArray(list) ? list : list instanceof Set ? [...list] : []).map((v) => {
    const p = normPt(v); return p ? key(p.x, p.y) : null;
  }).filter(Boolean));
  h = h || {};
  return {
    move: toSet(h.move), attack: toSet(h.attack), skill: toSet(h.skill), aoe: toSet(h.aoe), danger: toSet(h.danger),
    path: ptList(h.path),
    target: h.target ? normPt(h.target) : null,
    targetSize: h.target ? Math.max(1, h.target.size | 0) : 1,
    ghost: toSet(h.ghost), // ตัวใหญ่: ตัวทั้งก้อนที่จะไปยืน (ชี้ช่องที่จะเดินไป)
    push: h.push && h.push.from && h.push.to ? { from: normPt(h.push.from), to: normPt(h.push.to), collide: !!h.push.collide } : null,
    // Ice Spike วางหนามทับคน: ลูกศร 4 ทิศ [{ x, y, dir, ok }]
    arrows: Array.isArray(h.arrows) ? h.arrows.filter((a) => a && Number.isFinite(a.x) && Number.isFinite(a.y)) : null,
  };
}
export function drawHighlights(g, info, hl, hover, now) {
  if (hl.danger.size) {
    for (const k of hl.danger) { const [x, y] = parseKey(k); if (inB(info, x, y)) tileFill(g, x, y, OV.danger[0], null, 0.02); }
    outlineSet(g, hl.danger, OV.danger[1], 2);
  }
  for (const k of hl.move) { const [x, y] = parseKey(k); if (inB(info, x, y)) tileFill(g, x, y, OV.move[0], OV.move[1]); }
  for (const k of hl.attack) { const [x, y] = parseKey(k); if (inB(info, x, y)) tileFill(g, x, y, OV.attack[0], OV.attack[1]); }
  for (const k of hl.skill) { const [x, y] = parseKey(k); if (inB(info, x, y)) tileFill(g, x, y, OV.skill[0], OV.skill[1]); }
  if (hl.aoe.size) {
    for (const k of hl.aoe) { const [x, y] = parseKey(k); if (inB(info, x, y)) tileFill(g, x, y, OV.aoe[0], null, 0.03); }
    g.save(); g.globalAlpha = 0.75 + 0.25 * Math.sin(now / 260); outlineSet(g, hl.aoe, OV.aoe[1], 3); g.restore();
  }
  if (hl.ghost.size) {
    for (const k of hl.ghost) { const [x, y] = parseKey(k); if (inB(info, x, y)) tileFill(g, x, y, "rgba(255,255,255,.16)", null, 0.03); }
    outlineSet(g, hl.ghost, "rgba(255,255,255,.95)", 2.5);
  }
  if (hl.target) {
    for (let dy = 0; dy < hl.targetSize; dy++) for (let dx = 0; dx < hl.targetSize; dx++) {
      const tx = hl.target.x + dx, ty = hl.target.y + dy;
      if (inB(info, tx, ty)) tileFill(g, tx, ty, "rgba(224,86,79,.55)", "#ffb0a8");
    }
  }
  if (hl.push) {
    const { from, to, collide } = hl.push;
    if (collide) {
      if (inB(info, to.x, to.y)) tileFill(g, to.x, to.y, "rgba(255,170,60,.35)", "rgba(255,200,120,.9)");
      const [cx, cy, s] = P(to.x + 0.5, to.y + 0.5, 0.3);
      g.strokeStyle = "#ffb347"; g.lineWidth = 4;
      g.beginPath(); g.moveTo(cx - s * 0.22, cy - s * 0.14); g.lineTo(cx + s * 0.22, cy + s * 0.14); g.moveTo(cx + s * 0.22, cy - s * 0.14); g.lineTo(cx - s * 0.22, cy + s * 0.14); g.stroke();
    } else {
      tileFill(g, to.x, to.y, "rgba(255,190,80,.32)", "rgba(255,210,130,.9)");
      arrowGround(g, from.x, from.y, to.x, to.y, "#ffb347");
    }
  }
  if (hl.path.length > 1) {
    g.save(); g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath();
    hl.path.forEach((p, i) => { const [sx, sy] = P(p.x + 0.5, p.y + 0.5); if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy); });
    g.stroke(); g.restore();
  }
  hl.path.forEach((p, i) => {
    const [sx, sy, s] = P(p.x + 0.5, p.y + 0.5);
    g.fillStyle = "#fff"; g.beginPath(); g.ellipse(sx, sy, s * 0.09, s * 0.055, 0, 0, 7); g.fill();
    if (i === hl.path.length - 1 && i > 0) { g.strokeStyle = "#fff"; g.lineWidth = 2; gEllipse(g, p.x + 0.5, p.y + 0.5, 0.3, 0, 24); g.stroke(); }
  });
  if (hover && inB(info, hover.x, hover.y)) {
    quad(g, hover.x, hover.y, 0.03); g.fillStyle = "rgba(255,255,255,.12)"; g.fill();
    g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 2; g.stroke();
  }
  if (hl.arrows) drawPickArrows(g, hl.arrows, hover, now);
}
