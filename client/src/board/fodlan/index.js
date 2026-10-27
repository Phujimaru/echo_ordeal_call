// ============================================================
//  ภาพบนกระดานของโหมด Fodlan (GRID_PLAN §8.5) — ตัวกลางที่ boardDraw / boardProps / regionThemes เรียก
//  แต่ละด่านอยู่ที่ ./stageN.js (export เฉพาะที่ใช้ — ไม่มี = ใช้ของเดิม/ไม่วาด):
//   theme                         ธีมกระดาน (รูปแบบเดียวกับ regionThemes.js — ต้องมี pal.day/night, back, ground, side)
//   tall: ["fd_…"]                สิ่งกีดขวางสูง (บังตัวละครที่ยืนข้างหลัง → จางลง)
//   drawObstacle(g, t, ctx, now)  สิ่งกีดขวางชนิด fd_… (t = { x, y, kind, conn } · ctx = { area, C, night, cols })
//   bakeSpecial(g, sp, ctx)       ช่องพิเศษ fd_… อบลงพื้นครั้งเดียว · animSpecial(g, sp, ctx, t) วาดทับทุกเฟรม
//   ground(g, fd, info, now, lowQ)          ใต้ไฮไลต์ (ไฟลุก แอ่งน้ำแข็งเรือง วงความอบอุ่น …)
//   items(items, g, fd, info, units, now, lowQ)  ของที่เรียงความลึกกับตัวละคร → items.push({ d: depthOf(cx, cy), f: () => … })
//   air(g, fd, info, units, now, lowQ, view)    ทับตัวละคร (ฝน หิมะ ฟ้าแลบ ไฟมังกร ซึนามิ …)
//   fx: { kind: ms }              ความยาวฉากของเหตุการณ์ (fd.fx — server ctx.fx) · ใช้ fxT(e, now, ms) หาความคืบหน้า 0..1
//  fd = state.fodlan.board + { stage, weather, vision } (BoardStage ส่งมา) · ช่องเตือน fd.warn = [{ x, y, kind? }] กะพริบแดงให้ทุกด่าน (ผู้ใช้สั่ง)
//  หมอก (fd.vision = ["x,y"] ช่องที่เรามองเห็น) วาดให้ทุกด่านที่ server ส่งมา
//  ห้าม import regionThemes / boardDraw จากไฟล์ด่าน (วนกัน) — ใช้ ../boardGeo, ../boardProps ได้
// ============================================================
import { P, PA, quad, key } from "../boardGeo";
import * as S1 from "./stage1";
import * as S2 from "./stage2";
import * as S3 from "./stage3";
import * as S4 from "./stage4";
import * as S5 from "./stage5";

export const FODLAN_AREA = 40;
const MODS = { 1: S1, 2: S2, 3: S3, 4: S4, 5: S5 };
export const stageOfArea = (area) => (Number(area) >= FODLAN_AREA && Number(area) < FODLAN_AREA + 5 ? Number(area) - FODLAN_AREA + 1 : 0);
const modOfArea = (area) => MODS[stageOfArea(area)] || null;
const modOfKind = (kind) => {
  if (typeof kind !== "string" || !kind.startsWith("fd_")) return null;
  for (const m of Object.values(MODS)) if (m.kinds && m.kinds.includes(kind)) return m;
  return null;
};

// ธีมของด่านที่ทำแล้ว (ยังไม่มี = regionThemes ยืมธีมภูมิภาคเดิม)
export function fodlanThemes() {
  const out = {};
  for (const [s, m] of Object.entries(MODS)) if (m.theme) out[FODLAN_AREA + Number(s) - 1] = m.theme;
  return out;
}
export function isFodlanTall(kind) {
  const m = modOfKind(kind) || null;
  return !!(m && Array.isArray(m.tall) && m.tall.includes(kind));
}
// คืน true = วาดแล้ว (boardProps ข้ามของเดิม)
export function drawFodlanObstacle(g, t, ctx, now) {
  const m = modOfKind(t.kind);
  if (!m || !m.drawObstacle) return false;
  m.drawObstacle(g, t, ctx, now);
  return true;
}
export function bakeFodlanSpecial(g, sp, ctx) {
  const m = modOfKind(sp.kind);
  if (!m || !m.bakeSpecial) return false;
  m.bakeSpecial(g, sp, ctx);
  return true;
}
export function animFodlanSpecial(g, sp, ctx, t) {
  const m = modOfKind(sp.kind);
  if (!m || !m.animSpecial) return false;
  m.animSpecial(g, sp, ctx, t);
  return true;
}

// ---------- เหตุการณ์ (fd.fx — seq เพิ่มเรื่อยๆ จาก server) ----------
//  เวลาเริ่มของแต่ละ seq = ตอนที่ client เห็นครั้งแรก (เหตุการณ์ที่เก่ากว่าตอนเปิดหน้า = เล่นจบแล้ว)
const FX_SEEN = new Map();
let FX_BASE = null;
export function fxT(e, now, ms) {
  if (!e) return 1;
  if (FX_BASE === null) FX_BASE = e.seq; // เปิดหน้าใหม่: ของเก่าไม่เล่นซ้ำ
  if (e.seq < FX_BASE) return 1;
  let t0 = FX_SEEN.get(e.seq);
  if (t0 == null) { t0 = now; FX_SEEN.set(e.seq, t0); if (FX_SEEN.size > 64) FX_SEEN.delete(FX_SEEN.keys().next().value); }
  return Math.max(0, Math.min(1, (now - t0) / Math.max(1, ms)));
}
export function fxActive(fd, now) {
  const list = fd && Array.isArray(fd.fx) ? fd.fx : [];
  const m = modOfArea(FODLAN_AREA + (fd ? fd.stage : 1) - 1);
  const durs = (m && m.fx) || {};
  return list.filter((e) => fxT(e, now, durs[e.kind] || 1500) < 1);
}

// ---------- ช่องเตือน (กะพริบแดง — ผู้ใช้สั่ง) ----------
function drawWarn(g, list, now) {
  if (!list || !list.length) return;
  const p = 0.5 + 0.5 * Math.sin(now / 140);
  g.save();
  for (const w of list) {
    if (!w || !Number.isFinite(w.x) || !Number.isFinite(w.y)) continue;
    quad(g, w.x, w.y, 0.04);
    g.fillStyle = `rgba(225,40,40,${0.18 + 0.32 * p})`; g.fill();
    g.setLineDash([5, 4]); g.lineDashOffset = -now / 50;
    g.strokeStyle = `rgba(255,${120 + 80 * p | 0},120,${0.6 + 0.4 * p})`; g.lineWidth = 1.6; g.stroke();
    g.setLineDash([]);
  }
  g.restore();
}

// ---------- หมอก (fd.vision) ----------
function drawFog(g, info, vision, now, lowQ) {
  if (!Array.isArray(vision)) return;
  const seen = new Set(vision);
  g.save();
  for (let y = 0; y < info.rows; y++) for (let x = 0; x < info.cols; x++) {
    if (seen.has(key(x, y))) continue;
    // ขอบหมอกบางลงข้างช่องที่มองเห็น
    const edge = seen.has(key(x + 1, y)) || seen.has(key(x - 1, y)) || seen.has(key(x, y + 1)) || seen.has(key(x, y - 1));
    const drift = lowQ ? 0 : 0.05 * Math.sin(now / 1400 + x * 0.9 + y * 0.6);
    quad(g, x, y, -0.02);
    g.fillStyle = `rgba(150,160,170,${(edge ? 0.62 : 0.86) + drift})`;
    g.fill();
  }
  g.restore();
}

// ---------- เรียกจาก boardDraw.drawFrame ----------
export function drawFodlanGround(g, fd, info, now, lowQ) {
  if (!fd) return;
  const m = modOfArea(info.area);
  if (m && m.ground) m.ground(g, fd, info, now, lowQ);
  drawWarn(g, fd.warn, now);
}
export function fodlanItems(items, g, fd, info, units, now, lowQ) {
  if (!fd) return;
  const m = modOfArea(info.area);
  if (m && m.items) m.items(items, g, fd, info, units, now, lowQ);
}
export function drawFodlanAir(g, fd, info, units, now, lowQ, view) {
  if (!fd) return;
  const m = modOfArea(info.area);
  if (m && m.air) m.air(g, fd, info, units, now, lowQ, view);
  drawFog(g, info, fd.vision, now, lowQ);
}
// ใช้ในไฟล์ด่าน (ไม่ต้อง import boardGeo ซ้ำ)
export { P, PA };
