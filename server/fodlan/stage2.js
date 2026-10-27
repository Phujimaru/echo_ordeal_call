// ============================================================
//  ด่าน II เรเมียร์ (ป่าหมอก) — โหมด Fodlan · GRID_PLAN §8.5 · ฮุคทั้งหมดดู server/fodlan/README.md
//
//  หมอก (ผู้ใช้สั่ง — ตลอดการมาเยือน): แต่ละฝ่ายมองเห็นแค่ "ระยะการเดินของตัวเอง" (ช่องที่เดินไปถึงได้เทิร์นนี้ด้วย mov ปัจจุบัน
//   จากช่องที่ยืน + ช่องที่ยืน) · เพื่อนร่วมทีม/ตัวในฝ่ายเดียวกันมองร่วมกัน (Claude ตั้งเอง) · ที่เหลือเป็นหมอก
//   - ยังเดินต่อได้ = มองจากช่องเริ่มตา (กติกาเดียวกับ visibility.eyeOf — กันเดินวนหาคน)
//   - Claude ตั้งเอง: เห็นช่องติดตัว 4 ทิศเสมอ (ถูกตรึง/ป่าทึบรอบตัวก็ยังเห็นคนที่ประชิด) · ตี/ยิง/ใช้ของใส่คนอื่น = โผล่จากหมอกจนจบเทิร์น (exposedRound แบบพุ่มหญ้า)
//   - ศัตรูในหมอก = มองไม่เห็น (ระบบกลาง server/visibility.js → hides) · สกิลพื้นที่ยังโดนเหมือนพุ่มหญ้า · client วาดหมอกนอก vision
//  คบเพลิง (ผู้ใช้สั่ง): ไอเทมร้านค้า 2 เหรียญ (ขายเฉพาะตอนอยู่ด่านนี้ — Claude) · ใช้จากกระเป๋า = ปักบนช่องที่ยืน
//   → ทุกคนมองทะลุหมอกรอบคบเพลิง TORCH_RADIUS ช่องนับแบบการเดิน (ค่าเดินของช่อง · สิ่งกีดขวางบัง · ไม่สนคน)
//   อยู่จนเปลี่ยนด่าน · ศัตรูตีดับได้ 1 ครั้ง (Claude)
//  กล่องเสบียง (ผู้ใช้สั่ง): 3 กล่องตามป่า · ยืนติดกด "เปิดกล่อง" (ใช้การตีของตา) → สุ่ม คบเพลิง / เหรียญ +2 / เกราะ +1 (Claude)
//   แล้วกล่องไปโผล่ช่องพื้นว่างอื่นแบบสุ่ม (ไม่ตัดทางเดินของแผนที่)
//  เสาเวทมืด (ข้อเสนอที่ผู้ใช้รับ): 3 ต้น ตี 2 ครั้งพัง → ผู้ตี +2 เหรียญ + หมอกรอบเสาระยะ CLEAR_RADIUS หายถาวร (ทุกคนเห็น)
//  สภาพอากาศไอพิษ (3 เทิร์นจากเข้าด่าน): ต้นเทิร์นทุกคนติดดีบัฟ Universal สุ่ม 1 อย่าง มีผลเทิร์นเดียว (ไม่มีหลับใหล/สตั้น — ผู้ใช้สั่ง)
//
//  สถานะของการมาเยือน = st.fd2 (สร้างใน enter) — ไม่มี = ฮุคไม่ทำอะไร (placeOnBoard เรียก layer ก่อน enter ด้วยสถานะของด่านเก่า)
// ============================================================
const MAP = require("./map2");

const TORCH_RADIUS = 4;   // คบเพลิง: มองทะลุหมอก (นับแบบการเดิน)
const TORCH_PRICE = require("../constants").SHOP_TORCH_PRICE; // ราคาในร้าน (คบเพลิงจากกล่องเสบียงมีราคาเท่ากัน)
const PILLAR_HP = 2;      // เสาเวทมืด: ตี 2 ครั้งพัง
const PILLAR_GOLD = 2;    // ผู้ตีพังได้เหรียญ
const CLEAR_RADIUS = 2;   // หมอกรอบเสาที่พังหายถาวร (ระยะแมนฮัตตัน)
const CRATE_GOLD = 2;
const CRATE_ARMOR = 1;
// ไอพิษ: ดีบัฟ Universal ที่สุ่มได้ (ตัดหลับใหล/สตั้นและของที่แรงเท่ากัน — ห้ามจั่ว/ห้ามสกิล/ถูกตรึง)
const MIASMA = [
  { key: "weak", name: "อ่อนแอ", icon: "🥀", amt: 1 },
  { key: "fragile", name: "เปราะบาง", icon: "💔", amt: 1 },
  { key: "poison", name: "พิษร้าย", icon: "🧪" },
  { key: "nohealing", name: "ไร้ทางเยียวยา", icon: "☠️" },
  { key: "numb", name: "เหน็บชา", icon: "🫨" },
  { key: "spellburden", name: "ภาระเวท", icon: "⛓️" },
  { key: "manaSeal", name: "ผนึกพลังงาน", icon: "⛔" },
  { key: "blind", name: "ตาบอด", icon: "🕶️" },
  { key: "slow", name: "เชื่องช้า", icon: "❄️", amt: 1 },
  { key: "decay", name: "ผุพัง", icon: "🥀" },
];
// ติดตอนต้นเทิร์น → ลูปลดเทิร์นของ endTurn ลดเหลือ 0 ตอนจบเทิร์นเดียวกัน = มีผลเทิร์นนี้เทิร์นเดียว
const MIASMA_TURNS = 1;

let VISIT = 0; // เลขการมาเยือน (layerVer ต้องต่างจากการมาเยือนก่อน — แผนที่ที่แคชไว้ตอน placeOnBoard)
const K = (x, y) => `${x},${y}`;
const lazyShop = () => require("../shop");
const lazyFodlan = () => require("../fodlan");

// ---------- เข้าด่าน ----------
function enter(ctx, st) {
  const s = st.fd2 = { visit: ++VISIT, pillars: [], crates: [], torches: [], cleared: [], seq: 0, pub: 0 };
  // เสาเวทมืด + กล่องเสบียงจุดแรก (ผังจาก map2.js) — มีคนยืน/ตัวใหญ่ทับ = ช่องว่างใกล้สุด
  for (const [x, y] of MAP.PILLARS) {
    const at = spotNear(ctx, s, x, y);
    if (at) s.pillars.push({ id: `fd:pillar${++s.seq}`, x: at.x, y: at.y, hp: PILLAR_HP });
  }
  for (const [x, y] of MAP.CRATES) {
    const at = spotNear(ctx, s, x, y);
    if (at) s.crates.push({ id: `fd:crate${++s.seq}`, x: at.x, y: at.y });
  }
  ctx.bump();
  try { lazyShop().refreshShopForJourney(); } catch { /* ร้านยังไม่พร้อม (เทสต์) */ }
}

// ---------- ชั้นแผนที่: เสา/กล่อง = สิ่งกีดขวาง ----------
function layer(ctx, st, map) {
  const s = st && st.fd2;
  if (!s) return map;
  const terrain = { ...map.terrain };
  for (const p of s.pillars) terrain[K(p.x, p.y)] = "fd_pillar";
  for (const c of s.crates) terrain[K(c.x, c.y)] = "fd_crate";
  return { ...map, terrain };
}
function layerVer(ctx, st) {
  const s = st && st.fd2;
  return s ? `m${s.visit}` : "x";
}

// ช่องพื้นธรรมดาที่ว่าง (ไม่มีสิ่งกีดขวาง/ช่องพิเศษ/คน/ร้าน/ของของด่าน)
function plainFree(ctx, s, x, y, map = ctx.map()) {
  const Board = ctx.Board;
  if (!Board.inBounds(map, x, y) || Board.isObstacle(map, x, y)) return false;
  if (Board.specialAt(map, x, y) || Board.isHeal(map, x, y)) return false;
  const k = K(x, y);
  if (s.pillars.some((p) => K(p.x, p.y) === k) || s.crates.some((c) => K(c.x, c.y) === k) || s.torches.some((t) => K(t.x, t.y) === k)) return false;
  const shop = ctx.match.shopPos;
  if (shop && shop.x === x && shop.y === y) return false;
  if ((map.shopSpots || []).some((p) => p.x === x && p.y === y)) return false;
  return !ctx.unitAt(x, y);
}
// วางสิ่งกีดขวางที่ (x, y) แล้วช่องว่างที่เหลือยังต่อถึงกันหมดไหม (ไม่ตัดทางเดินของแผนที่)
function keepsPaths(ctx, s, x, y) {
  const Board = ctx.Board, map = ctx.map();
  const block = new Set([K(x, y)]);
  for (const p of s.pillars) block.add(K(p.x, p.y));
  for (const c of s.crates) block.add(K(c.x, c.y));
  const open = (cx, cy) => Board.inBounds(map, cx, cy) && !Board.isObstacle(map, cx, cy) && !block.has(K(cx, cy));
  let total = 0, start = null;
  for (let yy = 0; yy < map.rows; yy++) for (let xx = 0; xx < map.cols; xx++) if (open(xx, yy)) { total++; if (!start) start = { x: xx, y: yy }; }
  if (!start) return false;
  const seen = new Set([K(start.x, start.y)]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i];
    for (const [dx, dy] of Board.DIRS) {
      const nx = c.x + dx, ny = c.y + dy, k = K(nx, ny);
      if (seen.has(k) || !open(nx, ny)) continue;
      seen.add(k);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen.size === total;
}
function spotNear(ctx, s, x, y) {
  const map = ctx.map(), cand = [];
  for (let yy = 0; yy < map.rows; yy++) for (let xx = 0; xx < map.cols; xx++) cand.push({ x: xx, y: yy, d: Math.abs(xx - x) + Math.abs(yy - y) });
  cand.sort((a, b) => a.d - b.d);
  return cand.find((c) => c.d <= 3 && plainFree(ctx, s, c.x, c.y, map) && keepsPaths(ctx, s, c.x, c.y)) || null;
}

// ---------- การมองเห็น (หมอก) ----------
//  แคช: ระยะมองของแต่ละตัว (ต่อแผนที่) · ช่องสว่างของคบเพลิง/เสาที่พัง (ต่อ s.pub) · ผลรวมของฝ่าย (ต่อชุดคีย์)
const UNIT_CACHE = new WeakMap(); // map → Map(key → Set)
const PUB_CACHE = new WeakMap();  // s → { key, set, torches }
const SIDE_CACHE = new WeakMap(); // map → Map(key → Set)

// ช่องเริ่มตา (ยังเดินต่อได้) — ตรงกับ visibility.walkAnchor
function anchorOf(ctx, u) {
  const m = ctx.match;
  if (!u || m.gameState !== "ACTION") return u.pos;
  const a = m.actorId === u.id ? m.action : m.duo && m.duo.acts ? m.duo.acts[u.id] : null;
  return a && !a.locked ? a.eye || a.from || u.pos : u.pos;
}
function unitVision(ctx, map, u) {
  const Board = ctx.Board, action = ctx.action;
  const at = anchorOf(ctx, u);
  if (!at) return null;
  const size = action.sizeOf(u);
  const mov = Math.max(0, action.movOf(u) | 0);
  const ghost = !!action.walksThrough(u);
  const key = `${at.x},${at.y},${size},${mov},${ghost ? 1 : 0}`;
  let per = UNIT_CACHE.get(map);
  if (!per) { per = new Map(); UNIT_CACHE.set(map, per); }
  if (per.has(key)) return { key, set: per.get(key) };
  const set = new Set();
  const reach = Board.reachable(map, { id: "_fd2eye", x: at.x, y: at.y, size, alive: true }, mov, [], { ghost });
  for (const n of reach.values()) for (const t of Board.footprint(n.x, n.y, size)) set.add(K(t.x, t.y));
  // ตัวเอง + ช่องติดตัว 4 ทิศเสมอ (Claude ตั้งเอง)
  for (const t of Board.footprint(at.x, at.y, size)) {
    set.add(K(t.x, t.y));
    for (const [dx, dy] of Board.DIRS) if (Board.inBounds(map, t.x + dx, t.y + dy)) set.add(K(t.x + dx, t.y + dy));
  }
  addObstacleEdge(ctx, map, set);
  if (per.size > 256) per.clear();
  per.set(key, set);
  return { key, set };
}
// สิ่งกีดขวางที่ติดกับช่องที่มองเห็น = เห็นด้วย (ต้นไม้/หินข้างทางไม่จมหมอก — ไม่มีใครยืนบนนั้นได้ จึงไม่เปิดเผยใคร)
function addObstacleEdge(ctx, map, set) {
  const Board = ctx.Board, add = [];
  for (const k of set) {
    const [x, y] = k.split(",").map(Number);
    for (const [dx, dy] of Board.DIRS) {
      const nx = x + dx, ny = y + dy;
      if (Board.inBounds(map, nx, ny) && Board.isObstacle(map, nx, ny)) add.push(K(nx, ny));
    }
  }
  for (const k of add) set.add(k);
}
// ช่องที่แสงคบเพลิงถึง: นับแบบการเดิน (ค่าเดินของช่อง) · สิ่งกีดขวางบัง · ไม่สนคน
function torchTiles(ctx, map, x, y) {
  const Board = ctx.Board;
  const best = new Map([[K(x, y), 0]]);
  const buckets = [[{ x, y }]];
  for (let d = 0; d < buckets.length; d++) {
    for (const c of buckets[d] || []) {
      if (best.get(K(c.x, c.y)) !== d) continue;
      for (const [dx, dy] of Board.DIRS) {
        const nx = c.x + dx, ny = c.y + dy;
        if (!Board.inBounds(map, nx, ny) || Board.isObstacle(map, nx, ny)) continue;
        const nd = d + Board.moveCost(map, nx, ny);
        if (nd > TORCH_RADIUS) continue;
        const k = K(nx, ny);
        if (best.has(k) && best.get(k) <= nd) continue;
        best.set(k, nd);
        (buckets[nd] ||= []).push({ x: nx, y: ny });
      }
    }
  }
  return [...best.keys()];
}
// ช่องที่ทุกคนเห็น (คบเพลิง + รอบเสาที่พัง)
function publicVision(ctx, s, map = ctx.map()) {
  const key = `${s.pub}|${layerVer(ctx, { fd2: s })}`;
  const old = PUB_CACHE.get(s);
  if (old && old.key === key && old.map === map) return old;
  const set = new Set(), torches = {};
  for (const t of s.torches) {
    const tiles = torchTiles(ctx, map, t.x, t.y);
    torches[t.id] = tiles;
    for (const k of tiles) set.add(k);
  }
  for (const c of s.cleared) {
    for (let dy = -CLEAR_RADIUS; dy <= CLEAR_RADIUS; dy++) for (let dx = -CLEAR_RADIUS; dx <= CLEAR_RADIUS; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > CLEAR_RADIUS || !ctx.Board.inBounds(map, c.x + dx, c.y + dy)) continue;
      set.add(K(c.x + dx, c.y + dy));
    }
  }
  addObstacleEdge(ctx, map, set);
  const out = { key, map, set, torches };
  PUB_CACHE.set(s, out);
  return out;
}
// ตัวที่เป็นสายตาของฝ่าย viewer (ตัวเอง + เพื่อนร่วมทีม/ตัวในฝ่ายคู่/ร่างแยกที่คุมได้) ที่ยังอยู่บนกระดาน
function eyesOf(ctx, viewer) {
  const me = ctx.match.players[viewer.id] || viewer;
  return ctx.combat.alivePlayers().filter((u) => u.pos && (u.id === me.id || ctx.combat.sameTeam(me, u)));
}
// ช่องที่ฝ่ายของ viewer มองเห็น (Set) — null = ไม่มีหมอก (ไม่มีสายตาบนกระดาน / จบเกม)
function sideVision(ctx, st, viewer) {
  const s = st && st.fd2;
  if (!s || !viewer || ctx.match.gameState === "GAMEOVER") return null;
  const map = ctx.map();
  const eyes = eyesOf(ctx, viewer);
  if (!eyes.length) return null;
  const parts = eyes.map((u) => unitVision(ctx, map, u)).filter(Boolean);
  if (!parts.length) return null;
  const pub = publicVision(ctx, s, map);
  const key = `${parts.map((p) => p.key).sort().join("|")}#${pub.key}`;
  let per = SIDE_CACHE.get(map);
  if (!per) { per = new Map(); SIDE_CACHE.set(map, per); }
  const hit = per.get(key);
  if (hit) return hit;
  const set = new Set(pub.set);
  for (const p of parts) for (const k of p.set) set.add(k);
  if (per.size > 128) per.clear();
  per.set(key, set);
  return set;
}
function vision(ctx, st, viewer) {
  const set = sideVision(ctx, st, viewer);
  return set ? [...set] : null;
}
function hides(ctx, st, viewer, target) {
  if (!target || !target.pos || !viewer) return false;
  if (target.exposedRound === ctx.match.roundNumber) return false; // ตี/ยิง/ใช้ของใส่คนอื่น = โผล่จากหมอกจนจบเทิร์น
  const set = sideVision(ctx, st, viewer);
  if (!set) return false;
  const size = ctx.action.sizeOf(target);
  return !ctx.Board.footprint(target.pos.x, target.pos.y, size).some((t) => set.has(K(t.x, t.y)));
}

// ---------- คบเพลิง (ไอเทม — server/shop.js) ----------
// ร้านขายคบเพลิงตอนนี้ไหม (อยู่ด่าน II)
function torchOnSale() {
  const F = lazyFodlan();
  const st = F.stageState();
  return !!(F.active() && F.stageNow() === 2 && st && st.fd2);
}
// ใช้คบเพลิงจากกระเป๋า: ปักบนช่องที่ยืน — คืน false = ใช้ไม่ได้ (ไม่เสียของ)
function useTorch(p) {
  if (!p || !p.alive || !p.pos || !torchOnSale()) return false;
  const F = lazyFodlan();
  const st = F.stageState(), s = st.fd2, ctx = F.makeCtx();
  if (s.torches.some((t) => t.x === p.pos.x && t.y === p.pos.y)) return false; // ช่องนี้มีคบเพลิงแล้ว
  const t = { id: `fd:torch${++s.seq}`, x: p.pos.x, y: p.pos.y, owner: p.id };
  s.torches.push(t);
  s.pub++;
  ctx.fx("torch_place", { x: t.x, y: t.y, r: TORCH_RADIUS });
  ctx.log(`🔥 ${p.name} ปักคบเพลิง — ทุกคนมองทะลุหมอกรอบคบเพลิง ${TORCH_RADIUS} ช่อง`);
  return true;
}

// ---------- ของที่ตีได้ ----------
function objects(ctx, st) {
  const s = st && st.fd2;
  if (!s) return [];
  return [
    ...s.pillars.map((p) => ({ id: p.id, x: p.x, y: p.y, kind: "pillar", name: "เสาเวทมืด", hp: p.hp, maxHp: PILLAR_HP, strike: true })),
    ...s.torches.map((t) => ({ id: t.id, x: t.x, y: t.y, kind: "torch", name: "คบเพลิง", hp: 1, maxHp: 1, owner: t.owner, strike: true })),
  ];
}
function strikeObject(ctx, st, p, objId) {
  const s = st && st.fd2;
  if (!s) return false;
  const pillar = s.pillars.find((o) => o.id === objId);
  if (pillar) {
    pillar.hp -= 1;
    if (pillar.hp > 0) {
      ctx.fx("pillar_hit", { x: pillar.x, y: pillar.y, hp: pillar.hp });
      ctx.log(`🔮 ${p.name} ตีเสาเวทมืด — ร้าวแล้ว (เหลือ ${pillar.hp}/${PILLAR_HP})`);
      return 1;
    }
    s.pillars = s.pillars.filter((o) => o !== pillar);
    s.cleared.push({ x: pillar.x, y: pillar.y });
    s.pub++;
    ctx.bump(); // ช่องเสากลับเป็นพื้น
    const got = lazyShop().addGold(p, PILLAR_GOLD);
    ctx.fx("pillar_break", { x: pillar.x, y: pillar.y });
    ctx.fx("fog_clear", { x: pillar.x, y: pillar.y, r: CLEAR_RADIUS });
    ctx.log(`💥 ${p.name} ทำลายเสาเวทมืด! ได้ ${got} เหรียญ — หมอกรอบเสาสลายไปถาวร`);
    return 1.6;
  }
  const torch = s.torches.find((o) => o.id === objId);
  if (torch) {
    const owner = ctx.match.players[torch.owner];
    if (owner && (owner.id === p.id || ctx.combat.sameTeam(owner, p))) return false; // ดับได้เฉพาะศัตรู
    s.torches = s.torches.filter((o) => o !== torch);
    s.pub++;
    ctx.fx("torch_out", { x: torch.x, y: torch.y });
    ctx.log(`💨 ${p.name} ดับคบเพลิง${owner ? `ของ ${owner.name}` : ""}`);
    return 1;
  }
  return false;
}

// ---------- กล่องเสบียง ----------
function cratesNear(ctx, s, p) {
  return s.crates.filter((c) => ctx.adjacent(p, c.x, c.y));
}
function canOpen(ctx, p) {
  const a = ctx.match.action;
  return ctx.action.canAct(p) && !!a && !a.noStrike && !p.didAttackRound;
}
function hudActions(ctx, st, p) {
  const s = st && st.fd2;
  if (!s) return [];
  const near = cratesNear(ctx, s, p);
  if (!near.length) return [];
  const act = { key: "fd:crate", icon: "📦", name: "เปิดกล่อง", disabled: !canOpen(ctx, p) };
  if (near.length > 1) act.tiles = near.map((c) => ({ x: c.x, y: c.y }));
  return [act];
}
// สุ่มของในกล่อง: คบเพลิง (กระเป๋าไม่เต็ม) / เหรียญ +2 / เกราะ +1 (เกราะไม่เต็ม) — ไม่มีอะไรให้ได้ = เหรียญ
function rollCrate(ctx, p) {
  const Shop = lazyShop();
  const pool = [];
  if (!Shop.bagFull(p)) pool.push("torch");
  pool.push("gold");
  if ((p.armor || 0) < ctx.combat.maxArmorOf(p)) pool.push("armor");
  return pool[Math.floor(ctx.rng() * pool.length)] || "gold";
}
function openCrate(ctx, s, p, crate) {
  const Shop = lazyShop();
  const kind = rollCrate(ctx, p);
  let text;
  if (kind === "torch" && Shop.grantInventoryItem(p, { type: "torch", price: TORCH_PRICE })) text = "ได้คบเพลิง 🔥";
  else if (kind === "armor") text = `ฟื้นเกราะ +${ctx.combat.healArmor(p, CRATE_ARMOR)}`;
  else text = `ได้ ${Shop.addGold(p, CRATE_GOLD)} เหรียญ`;
  const from = { x: crate.x, y: crate.y };
  // กล่องไปโผล่ช่องพื้นว่างอื่น (สุ่ม · ไม่ตัดทาง)
  s.crates = s.crates.filter((c) => c !== crate);
  const map = ctx.map();
  const cand = [];
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) if ((x !== from.x || y !== from.y) && plainFree(ctx, s, x, y, map)) cand.push({ x, y });
  const spot = ctx.pick(cand, cand.length).find((c) => keepsPaths(ctx, s, c.x, c.y));
  if (spot) s.crates.push({ id: `fd:crate${++s.seq}`, x: spot.x, y: spot.y });
  ctx.bump();
  ctx.fx("crate_open", { x: from.x, y: from.y, to: spot || null, got: kind });
  ctx.log(`📦 ${p.name} เปิดกล่องเสบียง — ${text}`);
  return kind;
}
function charAction(ctx, st, p, key, tile) {
  const s = st && st.fd2;
  if (!s || key !== "fd:crate" || !canOpen(ctx, p)) return false;
  const near = cratesNear(ctx, s, p);
  const crate = tile ? near.find((c) => c.x === tile.x && c.y === tile.y) : near[0];
  if (!crate) return false;
  ctx.match.action.locked = true;
  openCrate(ctx, s, p, crate);
  ctx.useStrike(p, 1.2);
  return true;
}

// ---------- ไอพิษ (ต้นเทิร์น) ----------
function preRound(ctx, st) {
  const s = st && st.fd2;
  if (!s || !ctx.weather || ctx.weather.kind !== "miasma") return 0;
  const hit = [];
  for (const p of ctx.alive()) {
    if (p.summon) continue;
    const d = MIASMA[Math.floor(ctx.rng() * MIASMA.length) % MIASMA.length];
    const ok = d.key === "spellburden" ? ctx.combat.applySpellburden(p, MIASMA_TURNS) : ctx.combat.applyDebuff(p, d.key, d.amt == null ? null : d.amt, MIASMA_TURNS);
    if (ok) {
      hit.push({ id: p.id, key: d.key });
      ctx.log(`☣️ ไอพิษ — ${p.name} ติด${d.name} ${d.icon} 1 เทิร์น`);
    } else {
      ctx.log(`☣️ ไอพิษ — ${p.name} ต้านไว้ได้`);
    }
  }
  ctx.fx("miasma", { ids: hit.map((h) => h.id) });
  return 0;
}

// ---------- ข้อมูลให้ client ----------
function publicInfo(ctx, st) {
  const s = st && st.fd2;
  if (!s) return {};
  const pub = publicVision(ctx, s);
  return {
    crates: s.crates.map((c) => ({ id: c.id, x: c.x, y: c.y })),
    pillars: s.pillars.map((p) => ({ id: p.id, x: p.x, y: p.y, hp: p.hp, maxHp: PILLAR_HP })),
    torches: s.torches.map((t) => ({ id: t.id, x: t.x, y: t.y, owner: t.owner, tiles: pub.torches[t.id] || [] })),
    cleared: s.cleared.map((c) => ({ x: c.x, y: c.y })),
    clearRadius: CLEAR_RADIUS,
    torchRadius: TORCH_RADIUS,
  };
}

module.exports = {
  enter, layer, layerVer, vision, hides, objects, strikeObject, hudActions, charAction, preRound, publicInfo,
  // ใช้จาก server/shop.js (ไอเทมคบเพลิง) + เทสต์
  torchOnSale, useTorch, sideVision, torchTiles,
  TORCH_RADIUS, TORCH_PRICE, PILLAR_HP, PILLAR_GOLD, CLEAR_RADIUS, CRATE_GOLD, CRATE_ARMOR, MIASMA, MIASMA_TURNS,
};
