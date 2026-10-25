// ============================================================
//  โหมด Colony (GRID_PLAN §8.3) — กติกาฝั่ง server ทั้งหมดของสนามโคโลนี
//  สนาม = ผิวด้านในของกระบอก (server/board.js MAPS[COLONY_AREA] · ต่อวงรอบ 16 คอลัมน์ × 40 แถว · ปล้องละ 10 แถว)
//
//  วงจร (match.colony):
//   ต้นเทิร์น (preRound — ก่อนแจกไพ่): ลงผลอีเวนต์ที่เตือนไว้ (ลำแสง → อุกกาบาต → แคปซูลลง) → รูรั่วเก่าดูดซ้ำ →
//     โคโลนีหมุน (ทุก 3 เทิร์น) → ตั้งเป้าของเทิร์นหน้า → มีอีเวนต์ = พักเกม CUTSCENE ให้ client เล่นฉาก (scene) แล้วค่อยแจกไพ่
//   จบเทิร์น (onEndTurn): รูรั่วอายุครบปิด · คูลดาวน์กระโดด · ประตูปิดผนึก (จบเทิร์น 5 / 9 / 13) · ครบ 23 = Colony ระเบิด (ทุกคนตาย = เสมอ)
//  ตายจากผลของ Colony (ปิดผนึก · ถูกดูดเข้ารู · ระเบิด) = ตายจริง ฟื้นไม่ได้ (combat.instantDeath force — ผู้ใช้สั่ง)
//  ร้านค้า = แคปซูลเสบียง (ใช้ระบบร้านเดิม match.shopPos/shopItems — shop.maybeMoveShop ข้ามเมื่ออยู่ใน Colony)
//  กระโดด (ปุ่มพิเศษ ทุกคน): ไปฝั่งตรงข้าม (x + 8) สูงขึ้น 2 แถว · จบการเดิน (ยังตี/ใช้สกิลได้) · คูลดาวน์ 2 เทิร์น · ลงข้างศัตรู = กระทืบ 1
//  ลิฟต์แกนกลาง: จบตาบนช่อง = ดีดขึ้น 4 แถว (phases/action.js tileEndEffect)
//  พิกัด x ของทุกคนถูกจัดเข้าช่วง 0..15 ทุกครั้งก่อนบรอดแคสต์ (normalize) — ตัวละครที่เขียนตำแหน่งนอกช่วงเองจะถูกจัดให้
// ============================================================
Object.assign(module.exports, {
  inWorld, active, reset, start, preRound, onEndTurn, mapLayer, layerVer, normalize,
  jump, canJump, liftUnit, publicInfo, playerInfo, jumpLanding,
});

const Board = require("./board");
const match = require("./match");
const { engine } = require("./engine");
const combat = require("./combat");
const action = require("./phases/action");
const shop = require("./shop");
const view = require("./view");

const SEALS = [5, 9, 13];   // ปล้องล่างสุดปิดผนึกตอนจบเทิร์นเหล่านี้ (แบบ B)
const BOOM = 23;            // จบเทิร์นนี้ Colony ระเบิดตัวเอง (นับถอยหลัง 10 เทิร์นหลังปล้องสุดท้ายปิด)
const CD_JUMP = 2;          // กระโดดแล้วต้องรอ 2 เทิร์น
const PULL = 2;             // รูรั่วดูด 2 ช่องต่อเทิร์น
const CAPSULE_TURNS = 6;    // แคปซูลเสบียงอยู่ 6 เทิร์น (= SHOP_INTERVAL_TURNS)
const METEOR_RADIUS = 4, GLASS_RADIUS = 5;
const BEAM_DMG = 3, CRUSH_DMG = 2, STOMP_DMG = 1;
const LIFT_ROWS = 4;
const SCENE_SECONDS = { meteor: 2.6, beam: 3, capsule: 2.4, pull: 1.4, drift: 1.6 };

Object.assign(module.exports, { SEALS, BOOM, CD_JUMP });

const C = Board.COLONY;
const mod = (x, n) => ((x % n) + n) % n;
const k = (x, y) => Board.key(mod(x, C.cols), y);

function inWorld() { return match.world === "colony"; }
function active() { return inWorld() && !!match.board && Board.isColonyArea(match.board.area); }
function reset() {
  match.colony = { sealed: 0, holes: [], tele: [], patched: [], jumpCd: {}, final: false, capsuleFinal: false, eventsRound: 0, scene: null, sceneSeq: 0, ver: 0 };
}
// เริ่มแมตช์ในสนาม Colony (lobby.startMatch)
function start() {
  reset();
  Board.setWrap(C.cols);
  action.placeOnBoard(Board.COLONY_AREA);
}
const st = () => match.colony || (reset(), match.colony);
const minRow = () => st().sealed * C.section;
const bump = () => { st().ver++; };

// ---------- ชั้นแผนที่ (phases/action.js boardMap) ----------
//  รอยรั่วที่ยังเปิด = สิ่งกีดขวางพังไม่ได้ ("breach") · ปล้องที่ปิดแล้ว = นอกกระดาน (minRow)
function layerVer() { return active() ? `c${st().ver}` : ""; }
function mapLayer(map) {
  if (!active()) return map;
  const s = st();
  const terrain = { ...map.terrain };
  for (const h of s.holes) for (const [x, y] of h.cells) terrain[k(x, y)] = "breach";
  return { ...map, terrain, minRow: minRow() };
}
const boardMap = () => action.boardMap();
const units = () => action.boardUnits();
const alive = () => combat.alivePlayers().filter((p) => p.pos);
function free(x, y, selfId = null) {
  const map = boardMap();
  return !Board.isObstacle(map, x, y, action.boardBlocked(selfId)) && !Board.unitAt(units().filter((u) => u.id !== selfId), mod(x, C.cols), y);
}
// ช่องว่างที่ใกล้ (tx, ty) ที่สุด (ระยะวงรอบ · เท่ากันเลือกแถวสูงกว่า) · ไม่มี = null
function nearestFree(tx, ty, selfId = null) {
  const map = boardMap();
  let best = null, bd = Infinity;
  for (let y = map.minRow | 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      if (!free(x, y, selfId)) continue;
      const d = Math.abs(Board.wdx(tx, x)) + Math.abs(y - ty);
      const score = d * 10 - (y >= ty ? 1 : 0);
      if (score < bd) { bd = score; best = { x, y }; }
    }
  }
  return best;
}

// ---------- ต้นเทิร์น ----------
//  คืน true = พักเกมไว้เล่นฉากอีเวนต์แล้ว (ผู้เรียกต้องหยุด แล้วจะถูกเรียก dealRound อีกครั้งเมื่อครบเวลา)
function preRound(resume) {
  if (!active()) return false;
  const s = st();
  const turn = match.roundNumber + 1;
  if (s.eventsRound === turn) return false;
  s.eventsRound = turn;
  const events = [];
  // แคปซูลอายุครบ = จากไป
  if (match.shopPos && turn - match.shopOpenedRound >= CAPSULE_TURNS) { match.shopPos = null; events.push({ type: "capsuleGone" }); }
  const due = s.tele.filter((t) => t.at === turn);
  s.tele = s.tele.filter((t) => t.at !== turn);
  const older = s.holes.slice();
  for (const t of due.filter((t) => t.type === "beam")) events.push(impactBeam(t, turn));
  for (const t of due.filter((t) => t.type === "meteor")) events.push(impactMeteor(t, turn));
  for (const t of due.filter((t) => t.type === "capsule")) events.push(landCapsule(t, turn));
  for (const h of older) if (s.holes.includes(h)) { const pull = pullHole(h); if (pull.moves.length || pull.sucked.length) events.push({ type: "pull", hole: h.cells, ...pull }); }
  if (turn > 1 && (turn - 1) % 3 === 0) events.push(drift());
  scheduleNext(turn);
  bump();
  const shown = events.filter(Boolean);
  if (!shown.length) return false;
  const seconds = Math.min(12, shown.reduce((a, e) => a + (SCENE_SECONDS[e.type] || 0), 0));
  if (seconds <= 0) return false;
  s.scene = { seq: ++s.sceneSeq, active: true, turn, events: shown };
  engine.boardFx("colonyScene", s.scene);
  match.cutsceneInfo = null;
  match.gameState = "CUTSCENE";
  engine.startPhaseTimer(seconds, () => { if (s.scene) s.scene.active = false; resume(); });
  view.broadcastState();
  return true;
}

// ลำแสงเจาะทะลุ: ทั้งแถว (วงแหวนรอบกระบอก) เสียหาย 3 (ลดเกราะก่อน) + รอยรั่ว 1 จุดบนแถว
function impactBeam(t, turn) {
  if (t.y < minRow()) return null;
  const hit = [];
  for (const p of alive()) {
    if (!Board.footprint(p.pos.x, p.pos.y, Board.sizeOf({ size: p.boardSize })).some((c) => c.y === t.y)) continue;
    combat.dealMixed(p, BEAM_DMG);
    hit.push(p.id);
    if (p.alive && p.hp <= 0) combat.instantDeath(p);
  }
  match.lastLog.push(`🔆 ลำแสงเจาะทะลุแถว ${t.y + 1}`);
  const map = boardMap();
  const xs = [];
  for (let x = 0; x < C.cols; x++) if (!map.terrain[k(x, t.y)] && free(x, t.y) && !shopAt(x, t.y)) xs.push(x);
  const hole = xs.length ? makeHole([[xs[Math.floor(Math.random() * xs.length)], t.y]], METEOR_RADIUS, turn) : null;
  const pull = hole ? pullHole(hole) : null;
  return { type: "beam", y: t.y, hit, hole: hole ? hole.cells : null, ...(pull || {}) };
}
// อุกกาบาต: ตกที่ช่องเป้า → รู (แถบกระจก = รูยาว 3 ช่องตามแถบ ดูดไกลกว่า) · คนบนช่องรู = ถูกดูดออกไปทันที
function impactMeteor(t, turn) {
  if (t.y < minRow()) return null;
  const map = boardMap();
  const glass = C.glass.includes(t.x);
  const cells = (glass ? [[t.x, t.y - 1], [t.x, t.y], [t.x, t.y + 1]] : [[t.x, t.y]])
    .filter(([x, y]) => y >= minRow() && y < C.rows && !(map.terrain[k(x, y)] && map.terrain[k(x, y)] !== "breach"));
  if (!cells.length) return { type: "meteor", at: { x: t.x, y: t.y }, cells: [], sucked: [] };
  const sucked = [];
  for (const p of alive()) {
    if (!Board.footprint(p.pos.x, p.pos.y, Board.sizeOf({ size: p.boardSize })).some((c) => cells.some(([x, y]) => x === c.x && y === c.y))) continue;
    killColony(p, "ถูกดูดออกนอกโคโลนี");
    sucked.push(p.id);
  }
  if (match.shopPos && cells.some(([x, y]) => x === match.shopPos.x && y === match.shopPos.y)) { match.shopPos = null; match.lastLog.push("💥 อุกกาบาตชนแคปซูลเสบียง"); }
  const hole = makeHole(cells, glass ? GLASS_RADIUS : METEOR_RADIUS, turn);
  match.lastLog.push(`☄️ อุกกาบาตชนแถว ${t.y + 1} — รอยรั่ว`);
  const pull = pullHole(hole);
  return { type: "meteor", at: { x: t.x, y: t.y }, cells, glass, sucked: [...sucked, ...pull.sucked], moves: pull.moves };
}
function makeHole(cells, radius, turn) {
  const s = st();
  const h = { cells: cells.map(([x, y]) => [mod(x, C.cols), y]), radius, born: turn };
  s.holes.push(h);
  s.patched = s.patched.filter((key) => !h.cells.some(([x, y]) => k(x, y) === key));
  bump();
  return h;
}
const holeDist = (h, x, y) => Math.min(...h.cells.map(([a, b]) => Math.abs(Board.wdx(a, x)) + Math.abs(b - y)));
// รอยรั่วดูดคนในรัศมีเข้าหารู 2 ช่อง (ก้าวที่ใกล้รูขึ้นทีละช่อง · ชนสิ่งกีดขวาง/คน/กำแพง = หยุด · ถึงรู = ตาย) · ตัวใหญ่ไม่ถูกดูด
function pullHole(h) {
  const map = boardMap();
  const moves = [], sucked = [];
  const victims = alive().filter((p) => Board.sizeOf({ size: p.boardSize }) <= 1 && holeDist(h, p.pos.x, p.pos.y) <= h.radius)
    .sort((a, b) => holeDist(h, a.pos.x, a.pos.y) - holeDist(h, b.pos.x, b.pos.y));
  for (const p of victims) {
    const from = { ...p.pos };
    const path = [];
    for (let step = 0; step < PULL && p.alive; step++) {
      let best = null, bd = holeDist(h, p.pos.x, p.pos.y);
      for (const [dx, dy] of Board.DIRS) {
        const nx = mod(p.pos.x + dx, C.cols), ny = p.pos.y + dy;
        if (ny < minRow() || ny >= C.rows || Board.wallBlocks(map, p.pos.x, p.pos.y, ny)) continue;
        const d = holeDist(h, nx, ny);
        if (d < bd) { bd = d; best = { x: nx, y: ny }; }
      }
      if (!best) break;
      if (h.cells.some(([x, y]) => x === best.x && y === best.y)) {
        path.push(best);
        killColony(p, "ถูกดูดเข้ารอยรั่ว");
        sucked.push(p.id);
        break;
      }
      if (!free(best.x, best.y, p.id)) break;
      p.pos = { x: best.x, y: best.y };
      path.push(best);
    }
    if (path.length) moves.push({ id: p.id, from, path });
  }
  return { moves, sucked };
}
// แคปซูลเสบียงลงจอด: ช่องลงมีคน = เสีย 2 + ถูกดันไปช่องข้าง · ร้านเปิด (ของใหม่) อยู่ 6 เทิร์น
function landCapsule(t, turn) {
  if (t.y < minRow()) return null;
  let crushed = null;
  const o = alive().find((p) => Board.footprint(p.pos.x, p.pos.y, Board.sizeOf({ size: p.boardSize })).some((c) => c.x === t.x && c.y === t.y));
  if (o) {
    combat.dealMixed(o, CRUSH_DMG);
    if (o.alive && o.hp <= 0) combat.instantDeath(o);
    let to = null;
    if (o.alive && Board.sizeOf({ size: o.boardSize }) <= 1) {
      const n = Board.DIRS.map(([dx, dy]) => ({ x: mod(t.x + dx, C.cols), y: t.y + dy })).find((c) => c.y >= minRow() && c.y < C.rows && free(c.x, c.y, o.id) && !(c.x === t.x && c.y === t.y));
      to = n || nearestFree(t.x, t.y, o.id);
      if (to) o.pos = { x: to.x, y: to.y };
    }
    crushed = { id: o.id, to };
  }
  if (!free(t.x, t.y)) return { type: "capsule", at: { x: t.x, y: t.y }, crushed, landed: false }; // ตัวใหญ่ทับอยู่ = ลงไม่ได้
  match.shopPos = { x: t.x, y: t.y };
  match.shopRazed = false;
  match.shopOpenedRound = turn;
  st().capsuleFinal = !!t.final;
  shop.openShop();
  if (t.final) for (const it of match.shopItems) it.price = Math.ceil(it.price * 1.5); // แคปซูลสุดท้าย: ของแพงกว่า (สุ่มเฉพาะของราคา 5 ขึ้นไป — shop.openShop)
  match.lastLog.push(t.final ? "📦 แคปซูลสุดท้าย · ปรากฏ" : "📦 แคปซูลเสบียง · ปรากฏ");
  return { type: "capsule", at: { x: t.x, y: t.y }, crushed, landed: true, final: !!t.final };
}
// โคโลนีหมุน: ทุกคนเลื่อนข้าง 1 ช่อง (ช่องไม่ว่าง = ไม่ขยับ · ตัวใหญ่ไม่เลื่อน)
function drift() {
  const moves = [];
  for (const p of alive().sort((a, b) => b.pos.x - a.pos.x)) {
    if (Board.sizeOf({ size: p.boardSize }) > 1) continue;
    const nx = mod(p.pos.x + 1, C.cols);
    if (!free(nx, p.pos.y, p.id)) continue;
    moves.push({ id: p.id, from: { ...p.pos }, to: { x: nx, y: p.pos.y } });
    p.pos = { x: nx, y: p.pos.y };
  }
  return { type: "drift", moves };
}
const shopAt = (x, y) => match.shopPos && match.shopPos.x === mod(x, C.cols) && match.shopPos.y === y;

// ตั้งเป้าของเทิร์นถัดไป (เตือนล่วงหน้า 1 เทิร์น — ผู้เล่นเห็นเป้าแดงบนพื้น)
//  อุกกาบาต 1 ลูก/เทิร์นตั้งแต่เทิร์น 2 (ช่วงนับถอยหลัง 2 ลูก) ใกล้ผู้เล่นสุ่ม · ลำแสงทุก 3 เทิร์นเริ่มเทิร์น 4 · แคปซูลในปล้องถัดขึ้นไป
function scheduleNext(turn) {
  const s = st();
  const nt = turn + 1;
  const sealing = SEALS.includes(turn);
  const lo = (s.sealed + (sealing ? 1 : 0)) * C.section;
  const pool = alive();
  const pick = () => pool[Math.floor(Math.random() * pool.length)];
  const map = boardMap();
  if (nt >= 2 && nt <= BOOM && pool.length) {
    const n = nt > SEALS[2] ? 2 : 1;
    for (let i = 0; i < n; i++) {
      for (let g = 0; g < 40; g++) {
        const a = pick();
        const x = mod(a.pos.x + Math.floor(Math.random() * 7) - 3, C.cols);
        const y = Math.max(lo, Math.min(C.rows - 1, a.pos.y + Math.floor(Math.random() * 6) - 1));
        if (map.terrain[k(x, y)] || s.tele.some((t) => t.x === x && t.y === y)) continue;
        s.tele.push({ type: "meteor", x, y, at: nt, radius: C.glass.includes(x) ? GLASS_RADIUS : METEOR_RADIUS });
        break;
      }
    }
  }
  if (nt >= 4 && (nt - 4) % 3 === 0 && nt <= BOOM && pool.length) {
    const a = pick();
    s.tele.push({ type: "beam", y: Math.max(lo, Math.min(C.rows - 1, a.pos.y + Math.floor(Math.random() * 4))), at: nt });
  }
  const pending = s.tele.some((t) => t.type === "capsule");
  if (turn === SEALS[2] && !s.capsuleFinal) {
    s.tele = s.tele.filter((t) => t.type !== "capsule");
    const sp = freeSpot(30, 38); if (sp) s.tele.push({ type: "capsule", ...sp, at: nt, final: true });
  } else if (!match.shopPos && !pending && nt <= SEALS[2]) {
    const sec = Math.min(s.sealed + (sealing ? 1 : 0) + 1, 3);
    const sp = freeSpot(sec * C.section + 1, sec * C.section + 8); if (sp) s.tele.push({ type: "capsule", ...sp, at: nt, final: false });
  }
}
function freeSpot(y0, y1) {
  const map = boardMap();
  for (let g = 0; g < 80; g++) {
    const x = Math.floor(Math.random() * C.cols), y = y0 + Math.floor(Math.random() * (y1 - y0 + 1));
    if (free(x, y) && !Board.specialAt(map, x, y)) return { x, y };
  }
  return null;
}

// ---------- จบเทิร์น ----------
function onEndTurn() {
  if (!active()) return;
  const s = st();
  const turn = match.roundNumber;
  // รอยรั่วที่ดูดครบ 2 เทิร์นแล้วปิด (ปะแผ่นเหล็ก — เดินผ่านได้)
  s.holes = s.holes.filter((h) => {
    if (h.born > turn - 1) return true;
    for (const [x, y] of h.cells) s.patched.push(k(x, y));
    return false;
  });
  for (const id of Object.keys(s.jumpCd)) { s.jumpCd[id]--; if (s.jumpCd[id] <= 0) delete s.jumpCd[id]; }
  const si = SEALS.indexOf(turn);
  if (si >= 0) seal(si);
  if (turn >= BOOM) explode();
  bump();
}
// ปิดผนึกปล้อง: ทุกคนที่ยังอยู่ในปล้อง (ช่องไหนของตัวก็ได้) ตายจริง · เป้า/รู/แคปซูลในปล้องนั้นหาย
function seal(si) {
  const s = st();
  s.sealed = si + 1;
  const lo = minRow();
  const dead = [];
  for (const p of alive()) {
    if (p.pos.y >= lo) continue;
    killColony(p, `ติดอยู่ในปล้อง ${si + 1} ตอนปิดผนึก`);
    dead.push(p.id);
  }
  s.tele = s.tele.filter((t) => t.y >= lo);
  s.holes = s.holes.filter((h) => h.cells.some(([, y]) => y >= lo));
  if (match.shopPos && match.shopPos.y < lo) match.shopPos = null;
  match.lastLog.push(`🚪 ปล้อง ${si + 1} ปิดผนึก`);
  engine.boardFx("colonySeal", { section: si + 1, dead });
}
function explode() {
  const dead = [];
  for (const p of alive()) { killColony(p, "Colony ระเบิด"); dead.push(p.id); }
  match.lastLog.push("💥 Colony ระเบิดตัวเอง");
  engine.boardFx("colonyBoom", { dead });
}
// ตายจริงจากผลของ Colony — ข้ามระบบกันตาย/ฟื้น (force) · หายจากกระดานทันที
function killColony(p, why) {
  if (!p.alive) return;
  combat.instantDeath(p, true);
  if (!p.alive) { p.pos = null; match.lastLog.push(`💀 ${p.name} ${why}`); }
}

// ---------- กระโดด ----------
function jumpLanding(p) {
  const tx = mod(p.pos.x + C.cols / 2, C.cols), ty = Math.min(C.rows - 1, p.pos.y + 2);
  if (Board.sizeOf({ size: p.boardSize }) > 1) {
    const spot = Board.placeBig(boardMap(), Board.sizeOf({ size: p.boardSize }), { x: tx, y: ty }, units().filter((u) => u.id !== p.id), { selfId: p.id, blocked: action.boardBlocked(p.id) });
    return spot && !spot.rubble.length ? { x: spot.x, y: spot.y } : null;
  }
  return nearestFree(tx, ty, p.id);
}
function canJump(p) {
  return active() && action.canAct(p) && !match.action.jumped && !(st().jumpCd[p.id] > 0) && !!p.pos;
}
function jump(id) {
  const p = match.players[id];
  if (!p || !canJump(p)) return false;
  const to = jumpLanding(p);
  if (!to) return false;
  const from = { ...p.pos };
  p.pos = { x: to.x, y: to.y };
  const a = match.action;
  a.from = { ...p.pos }; a.moved = false; a.path = null; a.trail = null; a.locked = true; a.jumped = true;
  st().jumpCd[p.id] = CD_JUMP;
  // ลงข้างศัตรู = กระทืบ (ศัตรูทุกตัวที่ติดตัว เสีย 1 ลดเกราะก่อน)
  const me = { x: p.pos.x, y: p.pos.y, size: Board.sizeOf({ size: p.boardSize }) };
  const stomped = [];
  combat.withEffectSource(p, () => {
    for (const o of alive()) {
      if (o.id === p.id || engine.isAlly(p, o) || Board.dist(me, Board.boxOf(o)) !== 1) continue;
      combat.dealMixed(o, STOMP_DMG);
      stomped.push(o.id);
      if (o.alive && o.hp <= 0) combat.instantDeath(o);
      if (!o.alive) o.pos = null;
    }
  });
  match.lastLog.push(`🌀 ${p.name} กระโดดข้ามแกนกลาง${stomped.length ? " — กระทืบ" : ""}`);
  engine.boardFx("colonyJump", { id: p.id, from, to: { ...p.pos }, stomped });
  bump();
  view.broadcastState();
  return true;
}
// ลิฟต์แกนกลาง: ดีดขึ้น 4 แถว (ช่องไม่ว่าง = ช่องว่างใกล้สุด) — ตัวใหญ่ไม่ใช้ลิฟต์
function liftUnit(p) {
  if (!active() || !p.pos || Board.sizeOf({ size: p.boardSize }) > 1) return;
  const to = nearestFree(p.pos.x, Math.min(C.rows - 1, p.pos.y + LIFT_ROWS), p.id);
  if (!to || to.y <= p.pos.y) return;
  const from = { ...p.pos };
  p.pos = { x: to.x, y: to.y };
  match.lastLog.push(`⏫ ${p.name} ขึ้นลิฟต์แกนกลาง`);
  engine.boardFx("colonyLift", { id: p.id, from, to: { ...p.pos } });
}

// ---------- พิกัด / ข้อมูลที่ client เห็น ----------
function normalize() {
  if (!active()) return;
  for (const p of Object.values(match.players)) if (p.pos && (p.pos.x < 0 || p.pos.x >= C.cols)) p.pos = { x: mod(p.pos.x, C.cols), y: p.pos.y };
}
function publicInfo() {
  if (!inWorld() || !match.colony) return null;
  const s = st();
  const turn = match.roundNumber;
  const nextSeal = SEALS[s.sealed];
  return {
    sealed: s.sealed, seals: SEALS, boom: BOOM,
    sealIn: nextSeal !== undefined ? nextSeal - turn + 1 : null, // เหลือกี่เทิร์น (นับเทิร์นนี้) ก่อนประตูปิด
    countdown: turn > SEALS[2] ? BOOM - turn + 1 : null,
    holes: s.holes.map((h) => ({ cells: h.cells, radius: h.radius, born: h.born })),
    patched: s.patched,
    tele: s.tele.map((t) => ({ ...t })),
    capsule: match.shopPos ? { ...match.shopPos, final: !!s.capsuleFinal } : null,
    scene: s.scene ? { seq: s.scene.seq, active: !!s.scene.active, turn: s.scene.turn, events: s.scene.events } : null,
    walls: C.walls, doors: C.doors, glass: C.glass, section: C.section,
  };
}
// ข้อมูลรายคน (view.js ต่อท้ายผู้เล่น): คูลดาวน์กระโดด
function playerInfo(p) {
  if (!inWorld() || !match.colony) return undefined;
  return { jumpCd: st().jumpCd[p.id] || 0 };
}
