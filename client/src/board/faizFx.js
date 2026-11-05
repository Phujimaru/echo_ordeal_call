// เอฟเฟกต์บนกระดานของอินุอิ ทาคุมิ (characters/inui_takumi.js · GRID_PLAN §7.27)
//  ภาพค้างตอนเร่งความเร็ว (Start Up): จดตำแหน่งย้อนหลังต่อหมาก แล้วให้ drawUnit วาดหมากซ้ำแบบจางตามไป

const LIFE = 420; // ms ที่ภาพค้างอยู่
const GAP = 34; // ms ระหว่างภาพ
const trails = new Map(); // id → [{ x, y, t }]

// คืนภาพค้างที่ต้องวาด (เก่าสุดก่อน) · a = ความทึบ
export function faizGhosts(id, now, x, y) {
  let list = trails.get(id);
  if (!list) { list = []; trails.set(id, list); }
  const head = list[list.length - 1];
  if (!head || (now - head.t >= GAP && (head.x !== x || head.y !== y))) list.push({ x, y, t: now });
  while (list.length && now - list[0].t > LIFE) list.shift();
  return list.slice(0, -1).map((p) => ({ x: p.x, y: p.y, a: 0.5 * (1 - (now - p.t) / LIFE) }));
}
export function faizTrailClear(id) { trails.delete(id); }
