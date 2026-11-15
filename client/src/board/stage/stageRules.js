// ============================================================
//  stageRules — ตัวช่วยล้วน (ไม่มี state) ของ BoardStage: ช่อง/กล่องตัว · ชั้นมิติ · ระยะเดิน/ตีแบบ ghost
//  ทิศจากช่อง/ปุ่มบนจอ · หนามน้ำแข็ง · ค่าคงที่ที่ใช้วาด (ย้ายมาจาก BoardStage.jsx — โค้ดเดิม)
// ============================================================
import * as Rules from "../boardRules";
import { customProjection } from "../boardGeo";
import { iceSpikeLv } from "../iceFx";

export const key = (x, y) => `${x},${y}`;
export const samePos = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
// ตัวใหญ่ (Echo ขยายร่าง): ผู้เล่น → กล่อง { x, y, size } · ช่องนี้อยู่ในตัวของ p ไหม
export const sizeOfP = (p) => Math.max(1, (p && p.size) | 0);
export const boxOfP = (p) => (p && p.pos ? { x: p.pos.x, y: p.pos.y, size: sizeOfP(p) } : null);
export const onBody = (p, t) => !!p && !!p.pos && !!t && Rules.covers(boxOfP(p), t.x, t.y);
// ชั้นมิติ / ยูนิตที่ถูกเรียก (วาเลนไทน์ · GRID_PLAN §7.13): dim null = กระดานหลัก · "veil:" = หลบสายตา · "par:" = กระดานคู่ขนาน
export const dimOf = (p) => (p && p.dim) || null;
export const isDoubleP = (p) => !!(p && p.summon && p.summon.kind === "double");
export const veiledP = (p) => !!(p && p.valentine && p.valentine.veil);
// บินได้ (โล่บินได้ของบานาจ — server action.flies): เดินทะลุแบบ ghost · ไม่ขวางทางใคร
export const fliesP = (p) => !!(p && p.flies);
// สายจูง { x, y, r } (server action.leashOf): ช่องที่หยุดได้ต้องห่างจุดนั้นไม่เกิน r — ตัดระยะเดินที่เกิน (เก็บช่องเริ่มไว้เสมอ)
export function leashReach(reach, leash, start) {
  if (!reach || !leash) return reach;
  const out = new Map();
  for (const [k, n] of reach) if ((start && n.x === start.x && n.y === start.y) || Math.abs(n.x - leash.x) + Math.abs(n.y - leash.y) <= leash.r) out.set(k, n);
  return out;
}
export const teamOfP = (p) => (isDoubleP(p) ? null : (p && p.teamId) || null); // ตัวเหมือน = ไม่มีทีม (เดินผ่านไม่ได้ · ตีได้ทุกคน)
export const GHOST_ALPHA = 0.38; // คนคนละชั้นมิติ
// เดินทะลุ (หลบสายตา): boardRules รองรับ opts.ghost แล้วหรือยัง (ทดลองเดินทะลุหินบนกระดาน 3×1)
//  ยังไม่รองรับ = ใช้แผนที่โล่ง (ไม่มีสิ่งกีดขวาง/ช่องพิเศษ/ร้าน/ร่าง) แทน — เหลือแค่ขอบกระดานเหมือนกัน
export const GHOST_RULES = (() => {
  try {
    const m = Rules.normalizeMap({ cols: 3, rows: 1, terrain: { "1,0": "rock" } });
    return Rules.reachable(m, { id: "t", x: 0, y: 0, alive: true }, 2, [], { ghost: true }).has("2,0");
  } catch { return false; }
})();
export const clearMap = (m) => (m ? { ...m, terrain: {}, special: {}, flow: {} } : m);
// ระยะเดิน/ก้าวทีละช่อง ที่เข้าใจ ghost (ตัวเลือก optsOf)
export const reachOf = (m, u, mov, units, o) => (o && o.ghost && !GHOST_RULES
  ? Rules.reachable(clearMap(m), u, mov, units, { ...o, blocked: null, hop: null })
  : Rules.reachable(m, u, mov, units, o));
export const stepOf = (m, u, mov, units, trail, to, o) => (o && o.ghost && !GHOST_RULES
  ? Rules.stepPath(clearMap(m), u, mov, units, trail, to, { ...o, blocked: null, hop: null })
  : Rules.stepPath(m, u, mov, units, trail, to, o));
export const EOS_MOB_RANGE = { archer: [1, 4], sniper: [1, 3], weaver: [1, 3], hooker: [2, 4] }; // ระยะตีของมอน Eos ตามนิสัย (server/fodlan/eosMobs.js MB)
export const threatOf = (m, u, mov, range, units, o) => zoneThreat(o && o.ghost && !GHOST_RULES
  ? Rules.threatZone(clearMap(m), u, mov, range, units, { ...o, blocked: null, hop: null })
  : Rules.threatZone(m, u, mov, range, units, o), o && o.zone);
// ตีได้เฉพาะในกรอบ (players[].strikeZone — ลอว์: ระยะตี = ทั้ง Room) → ช่องที่ตีถึงตัดเหลือในกรอบ
export function zoneThreat(z, zone) {
  if (!zone || !z || !z.threat) return z;
  const threat = new Set();
  for (const k of z.threat) { const [x, y] = k.split(",").map(Number); if (x >= zone.x0 && x <= zone.x1 && y >= zone.y0 && y <= zone.y1) threat.add(k); }
  return { ...z, threat };
}
// รูป 4 ทิศของตัวใหญ่บนกระดาน (หน้า/ข้าง/หลัง · มุมบน) — ตัวละครที่ไม่มีในนี้ใช้หมากหกเหลี่ยมเสมอ
export const BIG_ART = {}; // ภาพตัวใหญ่หลายมุม (เดิม Echo ขยายร่าง — รื้อแล้ว 2026-11-10 · ตัวใหญ่ที่เหลือใช้ภาพหมากปกติ)
// ทิศจากช่องเราไปช่องที่ชี้ (แกนที่ห่างกว่า) — ใช้กับสกิลแนว · size = ตัวใหญ่ (นับจากกลางตัว)
export function dirToward(from, to, size = 1) {
  if (!from || !to) return null;
  const c = (Math.max(1, size | 0) - 1) / 2;
  const dx = to.x - (from.x + c), dy = to.y - (from.y + c);
  if (!dx && !dy) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}
// ทิศบนจอ → ทิศบนกระดาน ตามมุมที่หมุน (rotation = จำนวน 90° ตามเข็ม · เหมือน boardGeo.toView)
//  ขวาบนจอ = (cos, −sin) · ลงล่างจอ (เข้าหากล้อง) = (sin, cos)
//  สนาม Colony (มีตัวฉายภาพทรงกระบอก): เลือกก้าว 1 ใน 4 ทิศของกระดานที่ไปทางเดียวกับปุ่มบนจอมากที่สุด ณ ตำแหน่งตัวละคร (at)
export const SCREEN_KEY = { KeyD: [1, 0], KeyA: [-1, 0], KeyS: [0, 1], KeyW: [0, -1] };
export function screenDir(rotation, code, at) {
  const cp = customProjection();
  if (cp && at && SCREEN_KEY[code]) {
    const [kx, ky] = SCREEN_KEY[code], cx = at.x + 0.5, cy = at.y + 0.5, p0 = cp.project(cx, cy, 0);
    if (!Number.isFinite(p0[0])) return null;
    let best = null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = cp.project(cx + dx * 0.5, cy + dy * 0.5, 0);
      if (!Number.isFinite(q[0])) continue;
      const vx = q[0] - p0[0], vy = q[1] - p0[1], l = Math.hypot(vx, vy) || 1, dot = (vx * kx + vy * ky) / l;
      if (!best || dot > best.dot) best = { x: dx, y: dy, dot };
    }
    return best ? { x: best.x, y: best.y } : null;
  }
  const a = (rotation % 4) * Math.PI / 2, c = Math.round(Math.cos(a)), sn = Math.round(Math.sin(a));
  if (code === "KeyD") return { x: c, y: -sn };
  if (code === "KeyA") return { x: -c, y: sn };
  if (code === "KeyS") return { x: sn, y: c };
  if (code === "KeyW") return { x: -sn, y: -c };
  return null;
}
export const HEX_PTS = "50,0 100,28.5 100,85.5 50,114 0,85.5 0,28.5";
// หนามน้ำแข็ง (Ice Spike): เป้า "spike:x,y" → { x, y } (อื่น = null) · Lv ของช่องจาก terrain ของกระดาน
export const spikeOfId = (id) => {
  const m = typeof id === "string" ? /^spike:(-?\d+),(-?\d+)$/.exec(id) : null;
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
};
export const boardSpikeLv = (b, k) => iceSpikeLv(b && b.terrain ? b.terrain[k] : null);
export const ICE_DIRS = [["up", 0, -1], ["down", 0, 1], ["left", -1, 0], ["right", 1, 0]];
// กรอบสี่เหลี่ยม n×n รอบช่องกลาง (x, y) — ตัดขอบกระดาน
export function squareKeys(map, x, y, n) {
  const out = [], h = Math.floor(n / 2);
  for (let dy = -h; dy < n - h; dy++) for (let dx = -h; dx < n - h; dx++) {
    const tx = x + dx, ty = y + dy;
    if (tx >= 0 && ty >= 0 && tx < map.cols && ty < map.rows) out.push(key(tx, ty));
  }
  return out;
}
export const ENERGY_C = "#7fd3ff"; // เลขแต้มสกิล (พลังงาน)
