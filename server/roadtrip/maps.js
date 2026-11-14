// ============================================================
//  แผนที่โหมด Road Trip (GRID_PLAN §8.8 · .claude/plans/roadtrip-contract.md §6) — ข้อมูลล้วน ไม่ require โมดูลอื่น
//  ต้นแบบที่ผู้ใช้เห็นแล้ว: .claude/plans/road-trip-station-2d.html (ปั๊ม 24×16 แบบกระดานเอียง)
//
//  defs[area] = อาร์กิวเมนต์ของ board.js buildMap() { cols, rows, terrain, special, heal, spawns, shopSpots }
//   + ข้อมูลเฉพาะโหมดนี้ (buildMap ไม่อ่าน — server helper / client ใช้เอง):
//   props    [{ id, kind, x0, y0, x1, y1, spot, h, walk?, style?, face? }] วัตถุบนแผนที่
//            x0..x1 / y0..y1 = ช่องที่วัตถุกิน (นับรวมขอบทั้งสองข้าง — จำนวนเต็ม) · walk = เดินทับได้ (หลังคา โคมไฟ เสื่อ)
//            ช่องของวัตถุที่ไม่ walk = สิ่งกีดขวาง terrain "rt_<kind>" (client ข้าม — วัตถุวาดทั้งชิ้นใน board/roadtrip/props.js)
//            spot = ช่องพื้นที่ต้องยืนตอนเล่นกิจกรรม (rt:act) — ติดวัตถุ (แมนฮัตตัน 1) เดินถึงได้จากจุดเกิดทุกจุด · null = ของประดับ
//            h = ความสูง (ช่อง) ใช้วาด/จางตัวที่ยืนข้างหลัง · style = แบบย่อย (เช่น mart "diner") · face = ทิศหน้าวัตถุ ("s" ไม่ใส่)
//   rt       { kind: "road"|"onvan"|"gas"|"motel", road: [y0, y1] แถวถนน, lanes, shoulder: [yบน, yล่าง], lot: [x0, y0, x1, y1] ลานคอนกรีต, bays: [[x0, y0, x1, y1]] ช่องจอดทาสี }
//   vanBlock { x0, y0, x1, y1 }  รถตู้จอด (สิ่งกีดขวาง "rt_van") · vanTiles/driverTile/rearTiles = รถตู้ที่ยืนได้ (RT_ONVAN)
//   pumpSpots [[x, y]]           ช่องเติมน้ำมัน (ยืนติดตู้น้ำมัน) · mobEntries [[x, y]] ช่องที่มอนโผล่ (ขอบกระดาน)
//   ร้านค้า = ตัวอาคาร (ผู้ใช้สั่ง 2026-11-14): มินิมาร์ท (prop "mart") / สำนักงานโมเต็ล (prop "motel" style "office") — ไม่มีแผงร้านแยก (shopSpots ว่าง)
//  สิ่งกีดขวางข้างทางที่ไม่ใช่วัตถุ: rt_rock (หิน/กระบองเพชร/ตอไม้/กองหิมะ/หลุมศพ ตามภูมิภาค) · rt_tree · rt_sign · rt_cone · rt_wreck (รถพัง) · rt_barrier
//  รันไฟล์นี้ตรงๆ (node server/roadtrip/maps.js) = ตรวจผัง + เขียน client/src/board/roadtrip/maps.gen.js (ESM ให้ client วาด/พรีวิว)
// ============================================================

const RT_ROAD = 70, RT_ONVAN = 71, RT_GAS = [72, 73, 74], RT_MOTEL = 75;

const K = (x, y) => `${x},${y}`;
const tilesOf = (r) => { const out = []; for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) out.push([x, y]); return out; };

// ประกอบ def จาก props + สิ่งกีดขวางข้างทาง — ช่องของวัตถุที่ไม่ walk กลายเป็น terrain rt_<kind>
function build(o) {
  const terrain = {};
  const add = (kind, list) => { (terrain[kind] = terrain[kind] || []).push(...list); };
  const props = (o.props || []).map((p, i) => ({ id: p.id || `${p.kind}${i}`, h: 1, spot: null, ...p }));
  for (const p of props) if (!p.walk) add(`rt_${p.kind}`, tilesOf(p));
  if (o.vanBlock) add("rt_van", tilesOf(o.vanBlock));
  for (const [kind, list] of Object.entries(o.deco || {})) add(kind, list);
  const { deco, ...rest } = o;
  return { heal: [], shopSpots: [], special: {}, ...rest, terrain, props };
}
const P = (kind, x0, y0, x1, y1, spot, h, extra) => ({ kind, x0, y0, x1, y1, spot: spot || null, h, ...(extra || {}) });

// ---------------------------------------------------------------- RT_ROAD 20×11 — ถนน 3 เลนพาดตามแกน x
//  y0 ข้างทางไกล · y1 ไหล่ทาง · y2–7 ถนน 3 เลน (เลนละ 2 แถว) · y8 ไหล่ทาง · y9–10 ข้างทางใกล้
//  รถตู้จอดเลนกลาง (x 8–11 · y 4–5) · ผู้เล่นเกิดรอบรถ · มอนโผล่ขอบซ้าย/ขวา (หน้า/หลังรถ)
const road = build({
  name: "ถนน",
  cols: 20, rows: 11,
  rt: { kind: "road", road: [2, 7], lanes: 3, shoulder: [1, 8] },
  vanBlock: { x0: 8, y0: 4, x1: 11, y1: 5 },
  rearTiles: [[7, 4], [7, 5]], // ช่องหลังประตูท้ายรถที่จอดอยู่ (หน้ารถ = +x) — ประตูเปิด = ยืนตรงนี้ตี/สกิลไกล +1 (ผู้ใช้สั่ง 2026-11-14)
  deco: {
    rt_rock: [[1, 0], [6, 0], [13, 0], [18, 0], [3, 9], [15, 10], [10, 10]],
    rt_tree: [[3, 0], [16, 0], [0, 10], [7, 10], [19, 9]],
    rt_sign: [[9, 0], [12, 9]],
    rt_wreck: [[3, 3], [4, 3], [15, 6], [16, 6]],
    rt_cone: [[6, 6], [14, 3]],
    rt_barrier: [[19, 8]],
  },
  spawns: [[7, 4], [7, 5], [12, 4], [12, 5], [9, 3], [10, 6], [10, 3], [9, 6]],
  mobEntries: [[0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [19, 2], [19, 3], [19, 4], [19, 5], [19, 6], [19, 7], [5, 1], [14, 8]],
});

// ---------------------------------------------------------------- RT_ONVAN 20×11 — สู้บนรถตู้ที่กำลังวิ่ง (หน้ารถ = ขวา +x)
//  ห้องในรถ 7 ยาว × 3 กว้าง (x 7–13 · y 4–6) = ช่องพิเศษ "van" ยืนได้ · คนขับ = หน้าขวา (13, 6) · ท้ายรถ = คอลัมน์ x 7
//  นอกรถเป็นถนนทั้งหมด (ไม่มีสิ่งกีดขวาง — ถนนเลื่อน) · มอนโผล่ข้างทาง/ท้าย
const vanTiles = tilesOf({ x0: 7, y0: 4, x1: 13, y1: 6 });
const onvan = build({
  name: "บนรถตู้",
  cols: 20, rows: 11,
  rt: { kind: "onvan", road: [1, 9], lanes: 3, shoulder: [0, 10] },
  special: { van: vanTiles },
  vanTiles,
  driverTile: [13, 6],
  rearTiles: [[7, 4], [7, 5], [7, 6]],
  // ของในรถ (เดินทับได้ทุกชิ้น — v1): เบาะ ตู้เย็น โต๊ะแผนที่ — วาดใน props.js
  props: [
    P("seat", 13, 6, 13, 6, null, 0.6, { walk: true, style: "driver" }),
    P("seat", 13, 4, 13, 4, null, 0.6, { walk: true }),
    P("seat", 11, 4, 11, 4, null, 0.6, { walk: true }), P("seat", 11, 6, 11, 6, null, 0.6, { walk: true }),
    P("seat", 9, 4, 9, 4, null, 0.6, { walk: true }), P("seat", 9, 6, 9, 6, null, 0.6, { walk: true }),
    P("fridge", 8, 4, 8, 4, null, 0.9, { walk: true }),
    P("mat", 10, 5, 10, 5, null, 0.05, { walk: true }),
  ],
  spawns: [[12, 5], [10, 5], [8, 5], [12, 4], [10, 6], [8, 6], [9, 5]],
  mobEntries: [[2, 2], [2, 3], [2, 5], [2, 7], [2, 8], [3, 1], [3, 9], [17, 1], [17, 9], [19, 2], [19, 8]], // ห่างขอบหลัง ≥ 2 (ถนนเลื่อน 1 ช่อง/เทิร์น — QA 2026-11-14)
});

// ---------------------------------------------------------------- RT_GAS 24×16 ×3
// กติกาผัง (ผู้ใช้ 2026-11-14 "อย่าเอาของมาขวางทางเดิน"): ทางเดินหลักกว้าง 2 ช่อง · ของทุกชิ้นเว้นรอบตัว 1 ช่อง (ยกเว้น group เดียวกัน)
//  · ไม่มีช่องตาย · ไม่มีซอกแคบ 1 ช่องระหว่างของกับขอบแผนที่ — validate() ตรวจทั้งหมด
// A ปั๊มทางหลวง: ถนนล่าง (y 14–15) · แถวอาคารบน (มินิมาร์ท / ชิงช้าสวรรค์ / หมอดู / อู่) · ทางเดินหน้าอาคาร y 4
//  · แถวกิจกรรม y 5–6 · ทางเดินหลัก y 7–8 · หลังคาปั๊ม + รถตู้ y 9–12 (ห้องน้ำซ้าย ล้างรถขวา) · จุดเกิด y 13
const gasA = build({
  name: "ปั๊มทางหลวง",
  cols: 24, rows: 16,
  rt: { kind: "gas", road: [14, 15], lanes: 1, shoulder: [13, 13], lot: [0, 0, 23, 13], bays: [[16, 13, 21, 13]] },
  props: [
    P("mart", 0, 0, 6, 3, [5, 4], 2.75),
    P("ferris", 9, 0, 11, 1, [10, 2], 4.7),
    P("fortune", 14, 0, 15, 1, [14, 2], 2.5),
    P("garage", 18, 0, 23, 3, [19, 4], 2.6),
    P("claw", 2, 6, 2, 6, [2, 7], 1.65, { group: "arcade" }), P("gacha", 3, 6, 3, 6, [3, 7], 1.45, { group: "arcade" }), P("arcade", 4, 6, 4, 6, [4, 7], 1.85, { group: "arcade" }),
    P("karaoke", 7, 5, 8, 6, [8, 7], 2.0),
    P("pond", 11, 5, 13, 6, [12, 7], 0.3),
    P("spicy", 16, 5, 18, 5, [17, 6], 2.1),
    P("dog", 21, 6, 21, 6, [21, 7], 0.9),
    P("wc", 0, 10, 2, 12, [3, 11], 2.2),
    P("canopy", 6, 9, 15, 12, null, 2.85, { walk: true }),
    P("pillar", 6, 9, 6, 9, null, 2.6), P("pillar", 15, 9, 15, 9, null, 2.6),
    P("pump", 8, 9, 9, 9, [8, 10], 1.45, { group: "pumpL" }),
    P("pump", 12, 9, 13, 9, [13, 10], 1.45, { group: "pumpR" }),
    P("wash", 19, 9, 23, 12, [18, 10], 2.25),
    P("price", 16, 13, 16, 13, null, 4.3),
    P("bench", 5, 13, 5, 13, null, 0.4),
  ],
  vanBlock: { x0: 9, y0: 11, x1: 12, y1: 12 },
  pumpSpots: [[8, 10], [9, 10], [12, 10], [13, 10]],
  spawns: [[8, 13], [9, 13], [10, 13], [11, 13], [12, 13], [13, 13], [14, 12]],
});

// B จุดพักรถบรรทุกกลางทะเลทราย: ถนนบน (y 0–1) · จุดเกิด y 2 · หลังคาปั๊ม y 3–6 + รถตู้ y 7–8 · ไดเนอร์ซ้าย อู่ขวา
//  · ทางเดินหลัก y 9–10 · แถวกิจกรรม y 11–12 · ทางเดินล่าง y 13 · รถบรรทุก/หอน้ำ ชิดขอบล่าง y 14–15
const gasB = build({
  name: "จุดพักรถบรรทุก",
  cols: 24, rows: 16,
  rt: { kind: "gas", road: [0, 1], lanes: 1, shoulder: [2, 2], lot: [0, 2, 23, 15], bays: [[11, 14, 18, 15]] },
  props: [
    P("mart", 0, 4, 5, 8, [4, 9], 2.6, { style: "diner" }),
    P("canopy", 8, 3, 15, 6, null, 2.85, { walk: true }),
    P("pillar", 8, 3, 8, 3, null, 2.6), P("pillar", 15, 3, 15, 3, null, 2.6),
    P("pump", 10, 4, 10, 4, [10, 5], 1.45), P("pump", 13, 4, 13, 4, [13, 5], 1.45),
    P("garage", 18, 4, 23, 8, [19, 9], 2.7),
    P("wc", 0, 11, 1, 12, [2, 11], 2.1),
    P("dog", 4, 12, 4, 12, [4, 11], 0.9),
    P("pond", 7, 11, 8, 12, [7, 10], 0.3, { style: "oasis" }),
    P("arcade", 11, 12, 11, 12, [11, 11], 1.85, { group: "arcade" }), P("claw", 12, 12, 12, 12, [12, 11], 1.65, { group: "arcade" }),
    P("spicy", 15, 12, 17, 12, [16, 11], 2.1),
    P("fortune", 20, 11, 21, 12, [20, 10], 2.5),
    P("truck", 0, 14, 8, 15, null, 2.3),
    P("tower", 22, 14, 23, 15, null, 5.2),
    P("price", 0, 2, 0, 2, null, 4.3),
    P("bench", 13, 15, 13, 15, null, 0.4), P("plant", 19, 15, 19, 15, null, 1.2),
  ],
  vanBlock: { x0: 10, y0: 7, x1: 13, y1: 8 },
  pumpSpots: [[10, 5], [13, 5]],
  spawns: [[9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [16, 2]],
});

// C ปั๊มตลาดนัดกลางคืน: ถนนล่าง (y 14–15) · แถวอาคารบน y 0–3 · ทางเดินหน้าอาคาร y 4–5
//  · แผงอาหารใต้สายโคม y 6 (เว้นช่องระหว่างแผง) · ทางเดินหลัก y 7–8 · หลังคาปั๊ม y 10–13 + รถตู้ y 12–13
const gasC = build({
  name: "ตลาดนัดปั๊ม",
  cols: 24, rows: 16,
  rt: { kind: "gas", road: [14, 15], lanes: 1, shoulder: [13, 13], lot: [0, 0, 23, 13], bays: [[17, 12, 21, 13]] },
  props: [
    P("mart", 0, 0, 4, 3, [3, 4], 2.5),
    P("fortune", 6, 0, 7, 1, [7, 2], 2.5),
    P("ferris", 9, 0, 11, 1, [10, 2], 4.7),
    P("karaoke", 14, 0, 16, 1, [15, 2], 2.0, { style: "stage" }),
    P("garage", 19, 0, 23, 3, [20, 4], 2.6),
    P("lanterns", 1, 6, 15, 8, null, 2.6, { walk: true }),
    P("stall", 0, 6, 1, 6, [0, 7], 2.0, { style: "noodle" }),
    P("stall", 3, 6, 4, 6, [3, 7], 2.0, { style: "grill" }),
    P("stall", 6, 6, 7, 6, [6, 7], 2.0, { style: "sweets" }),
    P("spicy", 9, 6, 11, 6, [10, 7], 2.1),
    P("stall", 13, 6, 14, 6, [13, 7], 2.0, { style: "drinks" }),
    P("gacha", 18, 6, 18, 6, [18, 7], 1.45, { group: "arcade" }), P("claw", 19, 6, 19, 6, [19, 7], 1.65, { group: "arcade" }), P("arcade", 20, 6, 20, 6, [20, 7], 1.85, { group: "arcade" }),
    P("dog", 17, 10, 17, 10, [17, 9], 0.9),
    P("pond", 21, 10, 23, 11, [20, 11], 0.3),
    P("wc", 0, 10, 1, 12, [2, 11], 2.2),
    P("canopy", 4, 10, 13, 13, null, 2.85, { walk: true }),
    P("pillar", 4, 10, 4, 10, null, 2.6), P("pillar", 13, 10, 13, 10, null, 2.6),
    P("pump", 6, 10, 6, 10, [6, 11], 1.45), P("pump", 11, 10, 11, 10, [11, 11], 1.45),
    P("price", 23, 13, 23, 13, null, 4.3),
    P("bench", 15, 12, 16, 12, null, 0.4, { group: "seat" }),
  ],
  vanBlock: { x0: 7, y0: 12, x1: 10, y1: 13 },
  pumpSpots: [[6, 11], [11, 11]],
  spawns: [[3, 13], [4, 13], [5, 13], [12, 13], [13, 13], [14, 13], [15, 13]],
});

// ---------------------------------------------------------------- RT_MOTEL 16×12
//  ห้องพักแถวบน (x 0–9) · ช่องทางเดิน x 10–11 · สำนักงานขวาบน (x 12–15) · ทางเดินหน้าห้อง y 3–4
//  · สระว่ายน้ำกลาง + บาร์บีคิวซ้าย + รถตู้ขวา y 5–7 · ทางเดินล่าง y 8–9 · ถนนล่าง (y 10–11)
const motel = build({
  name: "โรงแรม",
  cols: 16, rows: 12,
  rt: { kind: "motel", road: [10, 11], lanes: 1, shoulder: [9, 9], lot: [0, 0, 15, 9], bays: [[11, 5, 15, 8]] },
  props: [
    P("motel", 0, 0, 9, 2, [5, 3], 2.6),
    P("motel", 12, 0, 15, 2, [13, 3], 2.9, { style: "office" }),
    P("vending", 0, 4, 0, 4, [1, 4], 1.7),
    P("bbq", 2, 6, 2, 6, [2, 7], 1.1),
    P("pool", 5, 5, 8, 7, [6, 8], 0.2),
    P("lounger", 4, 6, 4, 6, null, 0.5, { walk: true }), P("lounger", 9, 6, 9, 6, null, 0.5, { walk: true }),
    P("neon", 15, 9, 15, 9, null, 4.6),
    P("bench", 0, 9, 0, 9, null, 0.4),
  ],
  vanBlock: { x0: 12, y0: 6, x1: 15, y1: 7 },
  spawns: [[3, 9], [5, 9], [7, 9], [9, 9], [11, 9], [13, 9], [7, 4]],
});

const defs = { [RT_ROAD]: road, [RT_ONVAN]: onvan, [RT_GAS[0]]: gasA, [RT_GAS[1]]: gasB, [RT_GAS[2]]: gasC, [RT_MOTEL]: motel };

// ชนิดช่องพิเศษ/สิ่งกีดขวางใหม่ (รวมเข้า board.js TERRAIN_INFO แบบ Fodlan — ไม่มี desc: กฎห้ามข้อความอธิบายใน UI)
const TERRAIN = {
  van: { name: "รถตู้", icon: "🚐" },
};

// ---------------------------------------------------------------- ตรวจผัง (รันตรง) — ทุก spot/จุดเกิด/จุดร้าน/ช่องเติมน้ำมัน เดินถึงกันได้
function validate() {
  const errs = [];
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [area, d] of Object.entries(defs)) {
    const block = new Set();
    for (const list of Object.values(d.terrain)) for (const [x, y] of list) block.add(K(x, y));
    const shops = new Set((d.shopSpots || []).map(([x, y]) => K(x, y)));
    const inb = (x, y) => x >= 0 && y >= 0 && x < d.cols && y < d.rows;
    const free = (x, y) => inb(x, y) && !block.has(K(x, y));
    const [sx, sy] = d.spawns[0];
    const seen = new Set([K(sx, sy)]), q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of N4) {
        const nx = x + dx, ny = y + dy;
        if (!free(nx, ny) || shops.has(K(nx, ny)) || seen.has(K(nx, ny))) continue;
        seen.add(K(nx, ny)); q.push([nx, ny]);
      }
    }
    const must = (what, x, y) => { if (!free(x, y)) errs.push(`${area} ${what} (${x},${y}) ไม่ใช่พื้น`); else if (!seen.has(K(x, y))) errs.push(`${area} ${what} (${x},${y}) เดินไม่ถึง`); };
    // 1) ไม่มีช่องตาย: พื้นทุกช่อง (ยกเว้นจุดร้าน) เดินถึงจากจุดเกิด
    for (let y = 0; y < d.rows; y++) for (let x = 0; x < d.cols; x++) if (free(x, y) && !shops.has(K(x, y)) && !seen.has(K(x, y))) errs.push(`${area} ช่อง (${x},${y}) เดินไม่ถึง`);
    for (const [x, y] of d.spawns) must("จุดเกิด", x, y);
    for (const [x, y] of d.pumpSpots || []) must("ช่องเติมน้ำมัน", x, y);
    for (const [x, y] of d.shopSpots || []) {
      if (!free(x, y)) errs.push(`${area} จุดร้าน (${x},${y}) ไม่ใช่พื้น`);
      else if (!N4.some(([dx, dy]) => seen.has(K(x + dx, y + dy)))) errs.push(`${area} จุดร้าน (${x},${y}) ไม่มีช่องยืนซื้อ`);
    }
    for (const p of d.props) {
      if (p.x0 < 0 || p.y0 < 0 || p.x1 >= d.cols || p.y1 >= d.rows) errs.push(`${area} ${p.id} เลยขอบ`);
      if (!p.spot) continue;
      must(`spot ${p.id}`, p.spot[0], p.spot[1]);
      const [x, y] = p.spot, ddx = Math.max(p.x0 - x, 0, x - p.x1), ddy = Math.max(p.y0 - y, 0, y - p.y1);
      if (ddx + ddy !== 1) errs.push(`${area} spot ${p.id} ไม่ติดวัตถุ`);
    }
    // 2) ของทุกชิ้นเว้นรอบตัว 1 ช่อง (รวมรถตู้จอด) — ยกเว้นวัตถุเดินทับได้ และ group เดียวกัน
    if (d.rt && (d.rt.kind === "gas" || d.rt.kind === "motel")) {
      const solid = d.props.filter((p) => !p.walk).map((p) => ({ id: p.id, g: p.group, x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1 }));
      if (d.vanBlock) solid.push({ id: "van", ...d.vanBlock });
      for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
        const a = solid[i], b = solid[j];
        if (a.g && a.g === b.g) continue;
        const gx = Math.max(a.x0 - b.x1, b.x0 - a.x1) - 1, gy = Math.max(a.y0 - b.y1, b.y0 - a.y1) - 1;
        if (Math.max(gx, gy) < 1) errs.push(`${area} ${a.id} ชิด ${b.id} (ต้องเว้น 1 ช่อง)`);
      }
      // 3) ไม่มีซอกแคบ 1 ช่องระหว่างของกับขอบแผนที่ (ขอบที่เป็นถนนไม่นับ)
      const rd = d.rt.road || [-1, -1];
      for (const o of solid) {
        if (o.x0 === 1 || o.x1 === d.cols - 2) errs.push(`${area} ${o.id} เหลือซอก 1 ช่องกับขอบซ้าย/ขวา`);
        for (const [edge, row] of [[o.y0 === 1, 0], [o.y1 === d.rows - 2, d.rows - 1]]) if (edge && !(row >= rd[0] && row <= rd[1])) errs.push(`${area} ${o.id} เหลือซอก 1 ช่องกับขอบบน/ล่าง`);
      }
    }
    if (d.vanTiles) for (const [x, y] of d.vanTiles) must("ช่องในรถ", x, y);
  }
  return errs;
}

module.exports = { RT_ROAD, RT_ONVAN, RT_GAS, RT_MOTEL, defs, TERRAIN, validate };

if (require.main === module) {
  const errs = validate();
  if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
  const fs = require("fs"), path = require("path");
  const out = path.join(__dirname, "..", "..", "client", "src", "board", "roadtrip", "maps.gen.js");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, [
    "// ⚠️ สร้างอัตโนมัติจาก server/roadtrip/maps.js — ห้ามแก้ตรงนี้ (แก้ที่ server แล้วรัน node server/roadtrip/maps.js)",
    `export const RT_ROAD = ${RT_ROAD}, RT_ONVAN = ${RT_ONVAN}, RT_GAS = ${JSON.stringify(RT_GAS)}, RT_MOTEL = ${RT_MOTEL};`,
    `export const RT_DEFS = ${JSON.stringify(defs)};`,
    "",
  ].join("\n"));
  console.log("ผังผ่าน · เขียน " + path.relative(process.cwd(), out));
}
