// ============================================================
//  สนามกลืนกิน — สนธยายามค่ำคืนของโอเบรอน (วอร์ติเกิร์น) (GRID_PLAN §7.46 · ผู้ใช้สั่ง 2026-11-27)
//
//  enter(caster, until): ทุกยูนิตที่มีชีวิต (ผู้เล่น · ตัวอัญเชิญ · ไคจู · มอน PVE) ถูกกลืนเข้ากระดาน 10×10 (Board.OBERON_AREA)
//   · กระดานเดิมเก็บไว้ทั้งก้อน (match.board ทุกชั้น · ร้าน · พื้นที่ค้างของปฏิกิริยา) — ไม่ผ่าน placeOnBoard (ไม่ล้างอะไร)
//   · โอเบรอนยืนกลาง · ที่เหลือลงช่องขอบตามทิศที่เคยอยู่จากโอเบรอน (ไม่มีช่อง = ช่องว่างใกล้สุด)
//  exit(reason): สนามหมด (จบเทิร์นสุดท้าย) / โอเบรอนตาย → ทุกคนกลับช่องเดิมก่อนถูกกลืน (ไม่ว่าง = ช่องว่างใกล้สุด)
//  นาฬิกาโลกหยุดระหว่างสนาม: ภูมิภาค/ร้านค้าไม่เดิน (endTurn.maybeJourneyAdvance + shop.maybeMoveShop ข้าม)
//   ออกจากสนาม = เลื่อน legStart / cycleShift / รอบร้านเท่าจำนวนเทิร์นในสนาม (ตั้งจากค่าที่จดไว้ตรงๆ — ไม่บวกสะสม)
//  กลางคืน: dayNight.isNightRound = true ระหว่างสนาม (ตัวละครที่ผูกกับกลางคืนได้ผล) · ผลภูมิภาคทั้งหมดไม่เกิด (Journey.current = null)
// ============================================================
Object.assign(module.exports, { active, casterId, enter, exit, extend, untilRound, publicInfo, frozenWorld, blocksWorld, rotTier, rotBlocks });

const match = require("./match");
const Board = require("./board");

const action = () => require("./phases/action");
const combat = () => require("./combat");

function active() { return !!(match.oberonField && match.oberonField.on); }
function casterId() { return active() ? match.oberonField.by : null; }
function untilRound() { return active() ? match.oberonField.until : 0; }
// ฉากเปลี่ยนภูมิภาค/ร้านค้าย้าย/เวลาโลก — ระหว่างสนามไม่เดิน
function blocksWorld() { return active(); }
// เวลาโลกที่ "หยุด" — เทิร์นในสนามไม่นับ (ใช้กับ dayNight ตอนต้องการวงจรจริง)
function frozenWorld() { return active() ? match.oberonField.round0 : null; }

// ช่องขอบเรียงตามมุมรอบกลาง (ตามเข็มจากขวา)
function rimTiles(cols, rows) {
  const out = [];
  for (let x = 0; x < cols; x++) { out.push({ x, y: 0 }); out.push({ x, y: rows - 1 }); }
  for (let y = 1; y < rows - 1; y++) { out.push({ x: 0, y }); out.push({ x: cols - 1, y }); }
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
  for (const t of out) t.a = Math.atan2(t.y - cy, t.x - cx);
  return out;
}
const angDiff = (a, b) => { const d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };

function enter(caster, until) {
  if (!caster || !caster.pos || active()) return false;
  const A = action(), C = combat();
  const units = C.alivePlayers().filter((u) => u.pos);
  const saved = {};
  for (const u of Object.values(match.players)) if (u.pos) saved[u.id] = { ...u.pos };
  const center = { ...caster.pos };
  match.oberonField = {
    on: true, by: caster.id, until, round0: match.roundNumber,
    seq: ((match.oberonField && match.oberonField.seq) || 0) + 1,
    saved: {
      board: match.board, wrap: Board.wrapCols ? Board.wrapCols() : 0, pos: saved,
      shops: match.shops || [], elemFields: match.elemFields || [],
      legStart: match.legStart, cycleShift: match.cycleShift,
      shopCycleRound: match.shopCycleRound, merchantCycle: match.merchantCycle,
    },
  };
  require("./dimension").resetAll(); // ชั้นมิติ (วาเลนไทน์): ทุกคนกลับชั้นหลักก่อนถูกกลืน
  match.board = { area: Board.OBERON_AREA };
  Board.setWrap(0);
  match.shops = [];
  match.elemFields = [];
  const { cols, rows } = Board.OBERON_FIELD;
  for (const u of units) u.pos = null;
  const mid = { x: Math.floor(cols / 2) - (cols % 2 ? 0 : 1), y: Math.floor(rows / 2) };
  // โอเบรอนลงก่อน (ตัวใหญ่ = ลงด้วย placeBig)
  placeUnit(caster, mid);
  // ที่เหลือ: ขอบตามทิศเดิมจากโอเบรอน · ใกล้โอเบรอนกว่าลงก่อน (ได้ช่องตรงทิศ)
  const rim = rimTiles(cols, rows);
  const rest = units.filter((u) => u.id !== caster.id)
    .map((u) => ({ u, a: Math.atan2(saved[u.id].y - center.y, Board.wdx ? Board.wdx(center.x, saved[u.id].x) : saved[u.id].x - center.x), d: Math.abs(saved[u.id].x - center.x) + Math.abs(saved[u.id].y - center.y) }))
    .sort((a, b) => a.d - b.d);
  for (const { u, a } of rest) {
    rim.sort((p, q) => angDiff(p.a, a) - angDiff(q.a, a));
    const spot = rim.find((t) => A.tileFree(t.x, t.y, u.id)) || rim[0];
    placeUnit(u, spot);
  }
  // ตาเดินของคนที่กำลังเดิน: นับจากช่องใหม่
  if (match.action && match.actorId && match.players[match.actorId] && match.players[match.actorId].pos) {
    match.action.from = { ...match.players[match.actorId].pos };
    match.action.path = [];
  }
  return true;
}

// ลงช่อง (ไม่ว่าง = ช่องว่างใกล้สุด · ตัวใหญ่ = placeBig)
function placeUnit(u, spot) {
  const A = action();
  const size = A.sizeOf(u);
  if (size > 1) {
    const at = Board.placeBig(A.boardMap(), size, spot, A.boardUnits(), { selfId: u.id });
    if (at) { u.pos = { x: at.x, y: at.y }; return; }
  }
  if (A.tileFree(spot.x, spot.y, u.id)) { u.pos = { x: spot.x, y: spot.y }; return; }
  const near = A.nearFreeTile(spot, u.id);
  u.pos = near || null;
}

function extend(n) {
  if (!active()) return 0;
  match.oberonField.until += n;
  return match.oberonField.until;
}

// ออกจากสนาม → คืนกระดานเดิม · reason "end" (หมดเวลา) / "death" (โอเบรอนตาย)
function exit(reason = "end") {
  if (!active()) return false;
  const f = match.oberonField, s = f.saved;
  const elapsed = Math.max(0, match.roundNumber - f.round0 + (reason === "end" ? 1 : 0));
  const A = action(), C = combat();
  match.board = s.board;
  Board.setWrap(s.wrap || 0);
  match.shops = s.shops || [];
  match.elemFields = s.elemFields || [];
  // นาฬิกาโลก: เทิร์นที่อยู่ในสนามไม่นับ
  match.legStart = (s.legStart || 1) + elapsed;
  match.cycleShift = (s.cycleShift || 0) + elapsed;
  if (s.shopCycleRound != null) match.shopCycleRound = s.shopCycleRound + elapsed;
  if (s.merchantCycle != null) match.merchantCycle = s.merchantCycle + elapsed;
  // กลับช่องเดิม — คนที่ยืนช่องเดิมได้ลงก่อน · ยูนิตที่เกิดในสนาม = ข้างเจ้าของ
  const alive = C.alivePlayers().filter((u) => u.pos);
  for (const u of alive) u.pos = null;
  const back = alive.filter((u) => s.pos[u.id]);
  const born = alive.filter((u) => !s.pos[u.id]);
  for (const u of back) placeUnit(u, s.pos[u.id]);
  for (const u of born) {
    const owner = u.summon && match.players[u.summon.owner];
    const at = (owner && owner.pos) || (back[0] && back[0].pos) || { x: 0, y: 0 };
    placeUnit(u, at);
  }
  for (const p of Object.values(match.players)) if (p.statuses && p.statuses.twilight) { delete p.statuses.twilight; if (p.statusAmt) delete p.statusAmt.twilight; }
  match.oberonField = { on: false, seq: f.seq, by: f.by, endedAt: match.roundNumber, reason };
  if (match.action && match.actorId && match.players[match.actorId] && match.players[match.actorId].pos) {
    match.action.from = { ...match.players[match.actorId].pos };
    match.action.path = [];
  }
  return true;
}

// ข้อมูลให้ client: { on, by, until, left, seq } — ฉากหลุม/เพลง/แบนเนอร์
function publicInfo() {
  const f = match.oberonField;
  if (!f) return null;
  if (!f.on) return { on: false, seq: f.seq, by: f.by, reason: f.reason || null };
  return { on: true, seq: f.seq, by: f.by, until: f.until, left: Math.max(1, f.until - match.roundNumber + 1) };
}

// ---------- เน่าเปื่อย: ระหว่างสนาม ศัตรูของโอเบรอนถูกล็อกสกิล 1 ช่อง/เทิร์น (สุ่มใหม่ไม่ซ้ำช่องเดิม — characters/oberon_vortigern.js ตั้ง p.skillRot) ----------
function rotTier(p) {
  const r = p && p.skillRot;
  return r && active() && r.round === match.roundNumber ? r.tier : null;
}
function rotBlocks(p, tier) { return rotTier(p) === tier; }
