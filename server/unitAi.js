// ============================================================
//  ยูนิตที่ AI คุม — ระบบกลาง (ต้นแบบ: ตัวอัญเชิญของ Master · GRID_PLAN §7.34)
//
//  ยูนิตที่ถูกเรียก (server/summon.js) ที่มี summon.ai = true:
//   · ลำดับเดิน: ต่อท้ายผู้เล่นทุกคน (phases/action.js beginOrder → order()) ตามลำดับที่เกิด
//   · ตาเดิน: เล็งศัตรูที่ใกล้ที่สุดเสมอ (ระยะจากตัว · เท่ากัน = เลือดน้อย) → เดินไปช่องที่ตีถึงแล้วตี · ตีไม่ถึง = เดินเข้าหา
//   · ระยะตีจาก action.rangeOf + ฮุค strikeAllows ของ characterId ยูนิต (กรอบ 5×5 ของ Raider / Holy Crusader)
//   · ผู้เล่นคุมไม่ได้ · ตาละ Summon.CONTROL_SECONDS (AI ทำเสร็จก่อนเสมอ)
//  แบบเดียวกับฮาคุโนะ (server/moonCell.js planTurn/startAi) แต่ไม่มีสายจูง
// ============================================================
Object.assign(module.exports, { isAi, order, planTurn, start, setAiDelay });

const Board = require("./board");
const match = require("./match");

let aiDelayMs = 650; // จังหวะคิดของ AI (เทสต์ตั้ง 0 = ทำทันที)
function setAiDelay(ms) { aiDelayMs = Math.max(0, ms | 0); }

const action = () => require("./phases/action");
const combat = () => require("./combat");
const Visibility = () => require("./visibility");
const Dim = () => require("./dimension");

function isAi(u) { return !!(u && u.summon && u.summon.ai && u.alive); }
// ยูนิต AI ที่ยังอยู่บนกระดาน ตามลำดับที่เกิด (เลขต่อท้าย id)
function order() {
  const seq = (u) => Number(String(u.id).split("~s")[1]) || 0;
  return Object.values(match.players).filter((u) => isAi(u) && u.pos).sort((a, b) => seq(a) - seq(b)).map((u) => u.id);
}

const tileBox = (t, size = 1) => ({ x: t.x, y: t.y, size });
// ตีถึงไหมจากกล่อง from → ระยะของยูนิต + ฮุค strikeAllows (เช็คที่ช่องสมมติ)
function reaches(u, from, e) {
  const A = action();
  if (!Board.inRange(A.rangeOf(u), Board.dist(from, Board.boxOf(e)))) return false;
  const CHAR_HOOKS = require("../characters/index");
  const h = CHAR_HOOKS[u.characterId];
  if (h && typeof h.strikeAllows === "function") {
    const save = u.pos;
    u.pos = { x: from.x, y: from.y };
    try { return h.strikeAllows(u, e) !== false; } finally { u.pos = save; }
  }
  return true;
}

function planTurn(u) {
  const A = action(), C = combat();
  const P = match.players;
  const map = A.startMap();
  const seen = A.walkUnits(u.id).filter((o) => !Visibility().hiddenFrom(u, P[o.id]));
  const size = A.sizeOf(u); // ตัวใหญ่ (ไคจูของไอเซ็น 3×3) — ช่อง = มุมซ้ายบนของตัว
  const reach = Board.reachable(map, { id: u.id, x: u.pos.x, y: u.pos.y, size }, A.movOf(u), seen, {
    isAlly: (a, b) => C.sameTeam(P[a.id], P[b.id]), blocked: A.boardBlocked(u.id), hop: A.hopTiles(), smash: A.smashes(u),
  });
  const occupied = (t) => Board.footprint(t.x, t.y, size).some((c) => seen.some((o) => o.id !== u.id && Board.covers(o, c.x, c.y)));
  const tiles = [...reach.values()].filter((t) => !occupied(t));
  if (!tiles.some((t) => t.x === u.pos.x && t.y === u.pos.y)) tiles.push({ x: u.pos.x, y: u.pos.y, d: 0 });
  const me = Board.boxOf(u);
  const enemies = C.alivePlayers().filter((o) => o.pos && o.id !== u.id && !C.sameTeam(u, o) && Dim().same(u, o)
    && !Visibility().hiddenFromUnit(u, o) && A.tauntAllows(u, o));
  if (!enemies.length) return { to: null, targetId: null };
  const near = (e) => Board.dist(me, Board.boxOf(e));
  // เป้า = ตัวที่ใกล้ที่สุดเสมอ (สเปก: "เล็งตัวที่ใกล้สุดเสมอและเดินเข้าไปหาเอง")
  const goal = [...enemies].sort((a, b) => near(a) - near(b) || a.hp - b.hp || a.armor - b.armor)[0];
  const hits = tiles.filter((t) => reaches(u, tileBox(t, size), goal));
  if (hits.length) {
    hits.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x); // ตีได้จากช่องที่เดินน้อยสุด
    const t = hits[0];
    return { to: { x: t.x, y: t.y }, targetId: goal.id };
  }
  const gap = (t) => Board.dist(tileBox(t, size), Board.boxOf(goal));
  tiles.sort((a, b) => gap(a) - gap(b) || a.d - b.d || a.y - b.y || a.x - b.x);
  const best = tiles[0];
  const stay = best.x === u.pos.x && best.y === u.pos.y;
  return { to: stay ? null : { x: best.x, y: best.y }, targetId: null };
}

function start(u) {
  if (!isAi(u) || !u.pos) return;
  const A = action();
  const token = match.unitAiSeq = (match.unitAiSeq || 0) + 1;
  const live = () => match.unitAiSeq === token && match.actorId === u.id && match.gameState === "ACTION" && u.alive && !!u.pos;
  const later = (ms, fn) => {
    if (!aiDelayMs) { fn(); return; }
    setTimeout(() => { if (live()) fn(); }, ms);
  };
  const strike = () => {
    if (!live()) return;
    const plan = planTurn(u);
    const here = plan.to == null || (plan.to.x === u.pos.x && plan.to.y === u.pos.y);
    if (plan.targetId && here && A.attackTarget(u.id, plan.targetId)) return;
    A.waitAction(u.id);
  };
  later(aiDelayMs, () => {
    const plan = planTurn(u);
    if (plan.to && A.moveTo(u.id, plan.to.x, plan.to.y)) {
      const steps = (match.action && match.action.path ? match.action.path.length : 2) - 1;
      later(aiDelayMs + steps * 220, strike);
      return;
    }
    strike();
  });
}
