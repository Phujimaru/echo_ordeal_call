// ============================================================
//  ทาลัสซา (Thalassa) — ปลาวาฬยักษ์ประจำโหมด Nautilus (GRID_PLAN §8.9) · ฝั่ง server
//  ไม่ใช่ด่าน: ตัวคุม server/fodlan.js เรียกจากทุกชั้น (7–11) ของโลก "nautilus" · สถานะอยู่ที่ match.fodlan.whale (ค้างข้ามชั้น)
//
//  กติกาที่ผู้ใช้ตัดสิน (2026-11-19):
//   - โผล่ครั้งแรกกลางคืนของชั้น 2 ≈ เทิร์น 10 · อยู่ 3 เทิร์น พัก 3 เทิร์น (วนตายตัว 10–12 · 16–18 · 22–24 · 28–30 …)
//   - โจมตีผู้เล่นทุกคนแบบสุ่ม หลายท่า เป็นท่าหมู่ · ชั้น 5 ดุที่สุด
//   - ตีได้ · ฆ่าได้แล้วไม่กลับมาอีก · คนตีครั้งสุดท้ายได้ "หัวใจของท้องทะเล" (พลังโจมตี +3 · 3 เทิร์น)
//   - แหวกว่ายทับกระดานตลอด (ลำตัว 5×2) · ข่มขวัญด้วยการว่ายผ่านจอก่อนโผล่ · เปิด/ปิดได้จากหน้าโหวต (match.nautilusWhale)
//  [Claude] จังหวะใน engine: ต้นเทิร์น (preRound) = ยิงท่าที่เตือนไว้เมื่อเทิร์นก่อน → ประกาศท่าใหม่ (ช่องเตือน) ให้ผู้เล่นหนีในเทิร์นนี้
//   เทิร์นโผล่ A: ข่มขวัญ + โผล่ + เตือนท่าแรก · A+1, A+2: ยิง + เตือน · A+3: ยิงท่าสุดท้ายแล้วจากไป → พัก A+3..A+5 → กลับมา A+6
//   ท่าทุกท่าหลบได้ (กฎผู้ใช้: สกิลหลบได้เสมอ) — ทอยหลบหลีก (สถานะ) + ช่องกำบัง · ช่องเตือนคือโอกาสหนี
//   ชั้น 2–4 = 1 ท่า/เทิร์น · ชั้น 5 = 2 ท่า + ดาเมจ +1 · เลือดต่ำกว่าครึ่งในชั้น 5 = 3 ท่า
//   เลือด 30 + 5 ต่อผู้เล่น ไม่มีเกราะ ค้างข้ามรอบโผล่ · ไม่ตีสวน ไม่ติดสถานะ
// ============================================================
Object.assign(module.exports, { erasedRow, bait, reset, enabled, preRound, publicInfo, layer, objects, strikeObject, footprint, posAt, bodyNow, enterLayer, damageWhale, stun, calm, syncPresent, moveCount });

const FIRST_TURN = 10;
const ON_TURNS = 3;
const OFF_TURNS = 3;
const HP_BASE = 30, HP_PER_PLAYER = 5;
const SWIM_PER_TURN = 4; // ช่องที่ว่ายต่อเทิร์น
// ชั้น 6 ทะเลข้อมูล (ด่าน 12 · ผู้ใช้ 2026-11-19 "ปลาวาฬจะเกิดถาวร · โหดสุดๆ"): อยู่ตลอดไม่ดำหนี · ตายแล้วกลับมาเป็นร่างข้อมูลเลือดเต็มหลัง 3 เทิร์น (ผู้ฆ่าได้หัวใจทุกครั้ง)
//  เข้าชั้น 6 = ฟื้นเลือดเต็มเสมอ (ตายไปแล้วก็กลับมา) · ท่า 4 (เลือดต่ำกว่าครึ่ง 5) · ดาเมจท่า +2 · ว่าย 6 ช่อง · งับ 2 คน · คุณสมบัติ ζ = +1 ท่า +1 ดาเมจ
const DATA_STAGE = 12, DATA_REVIVE = 3, DATA_SWIM = 6, DATA_BITE_N = 2;
const isData = (ctx) => ctx.stage === DATA_STAGE;
const zeta = (ctx) => isData(ctx) && !!(ctx.match.fodlan && ctx.match.fodlan.s && ctx.match.fodlan.s.nt12 && ctx.match.fodlan.s.nt12.attr === "zeta");
const BODY_LEN = 5, BODY_W = 2;
const BITE_REACH = 2, BITE_N = 1;
const HEART = { key: "might", amount: 3, turns: 3 };
const MOVES = ["tentacle", "charge", "whirl", "zap", "song", "swallow"];
// ชั้น 6 เพิ่ม 2 ท่า (ผู้ใช้ "เอาทั้งหมด" 2026-11-19): ลบข้อมูล = แถวของเป้ากลายเป็นช่องว่าง 1 เทิร์น คนในแถวตก 3 + ถูกดีดออก · คัดลอก = ร่างเงาของเป้าฟันเจ้าของ 3×3 รอบจุดที่เตือน (แรงเท่าตีปกติของเป้า อย่างน้อย 2)
const DATA_MOVES = ["erase", "copy"];
const MOVE_NAMES = { erase: "ลบข้อมูล", copy: "คัดลอก", tentacle: "หนวดกวาด", charge: "พุ่งทะลวง", whirl: "วังน้ำวน", zap: "ประจุเรืองแสง", song: "เพลงวาฬ", swallow: "กลืนลงท้อง", ram: "ว่ายชน", bite: "งับ" };
const DMG = { erase: 3, copy: 2, tentacle: 2, charge: 3, whirlCore: 2, whirlRing: 1, zap: 2, song: 1, swallow: 2, ram: 2, bite: 2 };
// ความดุ (ผู้ใช้ 2026-11-19 หลัง 6.4.0: "ปลาไม่ดุเลย แทบไม่โจมตีเราเลย"): ท่าที่เตือนต่อเทิร์น ชั้น II–IV 2 · ชั้น V 3 (เลือดต่ำกว่าครึ่ง 4)
//  + ว่ายชนคนที่ขวางทาง (ดาเมจ ram) + งับคนใกล้ลำตัวทุกเทิร์นที่อยู่ (BITE_REACH ช่อง · BITE_N คน) — หลบได้ทุกท่า
// เส้นทางว่าย (พิกัดช่อง สัดส่วนของกระดาน — วนรอบ/ตัดผ่าน ออกนอกขอบได้นิดหน่อย) · ปรับตามขนาดกระดานตอนใช้
const PATH = [[0.1, 0.24], [0.33, 0.2], [0.66, 0.22], [0.92, 0.34], [0.94, 0.66], [0.78, 0.88], [0.52, 0.8], [0.3, 0.58], [0.52, 0.42], [0.74, 0.56], [0.6, 0.9], [0.24, 0.88], [0.06, 0.6]]; // อยู่ในกระดานเกือบตลอด · ไม่ผ่านท่าจอดเรือ (แถวบน) — แก้คู่ client/server

Object.assign(module.exports, { DATA_MOVES, PATH, MOVES, MOVE_NAMES, FIRST_TURN, ON_TURNS, OFF_TURNS, HEART });

const W = (ctx) => ctx.match.fodlan && ctx.match.fodlan.whale;
function enabled(match) { return match.nautilusWhale !== false; }

function reset(match, playerCount) {
  const hpMax = HP_BASE + HP_PER_PLAYER * Math.max(1, playerCount | 0);
  match.fodlan.whale = { on: false, present: false, left: 0, nextAt: FIRST_TURN, hp: hpMax, hpMax, dead: false, s: 0, pending: [], killer: null, appearSeq: 0, calm: false };
}
// ธงเพลง (nautilusLayer.whalePresent → board.whale ของ client) = อยู่บนกระดานตอนนี้
function syncPresent(w) { if (w) w.present = !!(w.on && !w.dead); return w; }

// ---------- เส้นทาง ----------
let PATH_CACHE = null;
function pathPts(cols, rows) {
  if (PATH_CACHE && PATH_CACHE.cols === cols && PATH_CACHE.rows === rows) return PATH_CACHE;
  const wp = PATH.map(([u, v]) => [u * cols, v * rows]);
  const pts = [], n = wp.length;
  for (let i = 0; i < n; i++) {
    const p0 = wp[(i - 1 + n) % n], p1 = wp[i], p2 = wp[(i + 1) % n], p3 = wp[(i + 2) % n];
    for (let j = 0; j < 24; j++) {
      const t = j / 24, t2 = t * t, t3 = t2 * t;
      pts.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  const cum = [0];
  for (let i = 1; i <= pts.length; i++) { const a = pts[i - 1], b = pts[i % pts.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  PATH_CACHE = { cols, rows, pts, cum, len: cum[pts.length] };
  return PATH_CACHE;
}
// ตำแหน่ง + ทิศ ณ ระยะ s ตามเส้นทาง
function posAt(s, cols, rows) {
  const { pts, cum, len } = pathPts(cols, rows);
  const at = (q) => {
    q = ((q % len) + len) % len;
    let lo = 0, hi = pts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (cum[mid] <= q) lo = mid; else hi = mid - 1; }
    const a = pts[lo], b = pts[(lo + 1) % pts.length], f = (q - cum[lo]) / (cum[lo + 1] - cum[lo] || 1);
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };
  const [x, y] = at(s), [x1, y1] = at(s + 0.4), [x0, y0] = at(s - 0.4);
  return { x, y, hx: x1 - x0, hy: y1 - y0 };
}
// ช่องที่ลำตัวทับ (5×2 ตามทิศว่าย)
function footprint(pos, cols, rows) {
  const len = Math.hypot(pos.hx, pos.hy) || 1, hx = pos.hx / len, hy = pos.hy / len, out = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const dx = x + 0.5 - pos.x, dy = y + 0.5 - pos.y, al = dx * hx + dy * hy, ac = -dx * hy + dy * hx;
    if (Math.abs(al) <= BODY_LEN / 2 && Math.abs(ac) <= BODY_W / 2) out.push({ x, y });
  }
  return out;
}
// map = ขนาดกระดาน (ฮุค layer ส่ง map ที่กำลังสร้างมา — ห้ามเรียก ctx.map() ในนั้น: boardMap → layer วนไม่จบ)
function bodyNow(ctx, map = null) {
  const w = W(ctx);
  if (!w || !w.on || w.dead) return [];
  map = map || ctx.map();
  return footprint(posAt(w.s, map.cols, map.rows), map.cols, map.rows);
}

// ---------- ต้นเทิร์น ----------
//  คืนวินาทีที่พักเกมให้ client เล่นฉาก (fodlan.preRound รวมกับของชั้น · ≤ 10)
function preRound(ctx) {
  const w = W(ctx), match = ctx.match;
  if (!w || !enabled(match)) return 0;
  const turn = match.roundNumber + 1;
  if (w.erased && w.erased.until < turn) { w.erased = null; ctx.bump(); } // แถวที่ถูกลบกลับมา
  // ชั้น 6: ตายแล้วฟื้นเป็นร่างข้อมูล
  if (w.dead) {
    if (!isData(ctx) || !w.reviveAt || turn < w.reviveAt) return 0;
    revive(ctx, w, turn);
  }
  let secs = 0;
  if (w.on) {
    secs = Math.max(secs, resolvePending(ctx, w));
    if (!isData(ctx)) w.left -= 1; // ชั้น 6 อยู่ถาวร
    if (w.dead) return secs;
    if (w.left <= 0) {
      if (!w.dead) leave(ctx, w, turn);
      return secs;
    }
    // ออร์แกนของเรือ (server/fodlan/nautilusShip.js): สงบ 1 เทิร์น = ไม่ว่าย (ท่าที่เตือนไว้ถูกล้างไปแล้วตอนเล่น)
    if (w.calm) { w.calm = false; ctx.fx("whale_calm", posAt(w.s, ctx.map().cols, ctx.map().rows)); }
    else swim(ctx, w);
    plan(ctx, w);
    return Math.max(secs, 2);
  }
  if (turn >= w.nextAt) {
    appear(ctx, w, turn);
    plan(ctx, w);
    return 10; // ข่มขวัญ ~8 วิ + ลงกระดาน
  }
  return 0;
}
// [แก้ 2026-11-19] เดิม left = ON_TURNS + 1 → อยู่ 10–13 พัก 14–16 · ที่ถูก: โผล่ A ยิง A+1, A+2 · A+3 ยิงท่าสุดท้ายแล้วจากไป → left = ON_TURNS
function appear(ctx, w, turn) {
  w.on = true; w.present = true; w.left = ON_TURNS; w.calm = false; w.appearSeq = (w.appearSeq || 0) + 1;
  const map = ctx.map();
  w.s = Math.random() * pathPts(map.cols, map.rows).len;
  ctx.fx("whale_flyby", {});
  ctx.fx("whale_appear", { ...posAt(w.s, map.cols, map.rows), delay: 7800 });
  ctx.log("🐋 ทาลัสซาโผล่จากห้วงลึก!");
  shoveOffBody(ctx);
  void turn;
}
function leave(ctx, w, turn) {
  w.on = false; w.present = false; w.pending = []; w.calm = false;
  w.nextAt = turn + OFF_TURNS;
  const map = ctx.map();
  ctx.fx("whale_leave", posAt(w.s, map.cols, map.rows));
  ctx.log("🐋 ทาลัสซาดำลับไปในความมืด");
  ctx.bump(); // ลำตัวหายจากชั้นแผนที่ (เดิมไม่ bump = ช่องลำตัวค้างเป็นสิ่งกีดขวางในแผนที่ที่แคชไว้)
}
// ฟื้นเป็นร่างข้อมูล (ชั้น 6): เลือดเต็ม · โผล่เทิร์นนี้ (ฉากข่มขวัญตามปกติ)
function revive(ctx, w, turn) {
  w.dead = false; w.hp = w.hpMax; w.reviveAt = null; w.data = true; w.on = false; w.nextAt = turn;
  ctx.log("🔷 ทาลัสซาประกอบร่างขึ้นใหม่จากข้อมูล!");
}
// เปลี่ยนชั้นระหว่างที่โผล่ (ตามลงไปด้วย นับเทิร์นต่อ): ท่าที่เตือนไว้บนชั้นเดิมยกเลิก · เบียดคนที่เกิดใต้ลำตัวออก
//  ชั้น 6: ฟื้นเลือดเต็มเสมอ + ร่างข้อมูล · ยังไม่อยู่บนกระดาน = โผล่ต้นเทิร์นหน้า
function enterLayer(ctx) {
  const w = W(ctx);
  if (w && isData(ctx)) {
    const turn = ctx.match.roundNumber + 1;
    w.data = true; w.dead = false; w.hp = w.hpMax; w.reviveAt = null; w.left = Math.max(w.left || 0, 99);
    if (!w.on) { w.nextAt = turn; return; }
  }
  if (!w || !w.on || w.dead) return;
  w.pending = [];
  shoveOffBody(ctx);
}
// ไฟฉายของเรือส่องโดน = ชะงัก 1 ท่า (ท่าแรกที่เตือนไว้ถูกยกเลิก) · คืน true = มีท่าให้ยกเลิก
function stun(ctx) {
  const w = W(ctx);
  if (!w || !w.on || w.dead) return false;
  const m = (w.pending || []).shift();
  ctx.fx("whale_stun", { move: m ? m.kind : null, ...posAt(w.s, ctx.map().cols, ctx.map().rows) });
  if (m) ctx.log(`🔦 ทาลัสซาชะงัก — ${MOVE_NAMES[m.kind]}ถูกยกเลิก`);
  return !!m;
}
// ออร์แกนของกัปตัน: สงบ 1 เทิร์น = ท่าที่เตือนไว้ยกเลิกทั้งหมด + ต้นเทิร์นหน้าไม่ว่าย
function calm(ctx) {
  const w = W(ctx);
  if (!w || !w.on || w.dead) return false;
  w.pending = [];
  w.calm = true;
  ctx.log("🎹 ทาลัสซาสงบลงชั่วครู่");
  return true;
}
function swim(ctx, w) {
  const map = ctx.map();
  // ช่องที่ลำตัวกวาดผ่านระหว่างว่าย (ตำแหน่งเดิม → ใหม่ ทีละครึ่งช่อง) = ว่ายชน
  const swept = new Set();
  const sw = isData(ctx) ? DATA_SWIM : SWIM_PER_TURN;
  for (let d = 0; d <= sw; d += 0.5) for (const c of footprint(posAt(w.s + d, map.cols, map.rows), map.cols, map.rows)) swept.add(`${c.x},${c.y}`);
  w.s += sw;
  ctx.fx("whale_swim", posAt(w.s, map.cols, map.rows));
  const hits = [];
  for (const p of ctx.alive()) if (p.pos && swept.has(`${p.pos.x},${p.pos.y}`) && hit(ctx, p, DMG.ram, "ram")) hits.push(p.id);
  if (hits.length) ctx.fx("whale_ram", { hits, ...posAt(w.s, map.cols, map.rows) });
  shoveOffBody(ctx);
  bite(ctx, w);
}
// งับ: คนที่ใกล้ลำตัวที่สุด (ไม่เกิน BITE_REACH ช่อง) โดนงับทันที — ไม่เตือน แต่หลบได้
function bite(ctx, w) {
  const body = bodyNow(ctx);
  if (!body.length) return;
  const near = (p) => Math.min(...body.map((c) => Math.max(Math.abs(c.x - p.pos.x), Math.abs(c.y - p.pos.y))));
  const cands = ctx.alive().filter((p) => p.pos && near(p) <= BITE_REACH).sort((a, b) => near(a) - near(b)).slice(0, isData(ctx) ? DATA_BITE_N : BITE_N);
  for (const p of cands) {
    const ok = hit(ctx, p, DMG.bite, "bite");
    ctx.fx("whale_bite", { id: p.id, x: p.pos.x, y: p.pos.y, hit: ok });
  }
  void w;
}
// ใครยืนในช่องลำตัว = ถูกเบียดออกไปช่องว่างที่ใกล้สุด
function shoveOffBody(ctx) {
  const body = bodyNow(ctx);
  if (!body.length) return;
  const set = new Set(body.map((c) => c.x + "," + c.y));
  for (const p of ctx.alive()) {
    if (!p.pos || !set.has(p.pos.x + "," + p.pos.y)) continue;
    const spot = nearestFree(ctx, p, set);
    if (spot) { p.pos = { x: spot.x, y: spot.y }; ctx.fx("whale_shove", { id: p.id, x: spot.x, y: spot.y }); }
  }
  ctx.bump();
}
function nearestFree(ctx, p, avoid) {
  const map = ctx.map();
  for (let r = 1; r < Math.max(map.cols, map.rows); r++) {
    const ring = [];
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = p.pos.x + dx, y = p.pos.y + dy;
      if (avoid.has(x + "," + y) || !ctx.free(x, y, p.id)) continue;
      ring.push({ x, y });
    }
    if (ring.length) return ctx.pick(ring, 1)[0];
  }
  return null;
}

// ---------- วางแผนท่า (เตือนช่อง) ----------
function moveCount(ctx, w) {
  if (isData(ctx)) return (w.hp * 2 < w.hpMax ? 5 : 4) + (zeta(ctx) ? 1 : 0);
  if (ctx.stage < 11) return 2;
  return w.hp * 2 < w.hpMax ? 4 : 3;
}
function plan(ctx, w) {
  const map = ctx.map();
  const count = moveCount(ctx, w);
  const pool = (isData(ctx) ? [...MOVES, ...DATA_MOVES] : MOVES.slice()).filter((m) => m !== w.lastMove);
  const picks = ctx.pick(pool, count);
  w.pending = [];
  for (const kind of picks) {
    const m = buildMove(ctx, kind, map);
    if (m) w.pending.push(m);
  }
  w.lastMove = picks[picks.length - 1] || w.lastMove;
  if (w.bait) { const b = ctx.match.players[w.bait.id]; if (b && w.pending.length) ctx.fx("whale_bait_lock", { id: b.id }); w.bait = null; } // เหยื่อใช้ได้ครั้งเดียว
  if (w.pending.length) {
    ctx.fx("whale_warn", { moves: w.pending.map((m) => ({ kind: m.kind, dir: m.dir, tiles: m.tiles.length })) });
    ctx.log(`🐋 ทาลัสซาเตรียม${w.pending.map((m) => MOVE_NAMES[m.kind]).join(" + ")}`);
  }
}
// เหยื่อล่อทาลัสซา (GRID_PLAN §8.9 ลูกเล่นทุกชั้น): w.bait = { id, round } → แผนท่าถัดไปเล็งคนนั้นก่อน (แล้วหมดผล)
function targets(ctx, players, n) {
  const w = W(ctx), b = w && w.bait && players.find((p) => p.id === w.bait.id);
  if (!b) return ctx.pick(players, n);
  return [b, ...ctx.pick(players.filter((p) => p !== b), n - 1)];
}
function bait(ctx, p, target) {
  const w = W(ctx); if (!w || !target) return false;
  w.bait = { id: target.id, by: p.id, round: ctx.match.roundNumber };
  return true;
}
const inB = (map, x, y) => x >= 0 && y >= 0 && x < map.cols && y < map.rows;
function buildMove(ctx, kind, map) {
  const players = ctx.alive();
  if (!players.length) return null;
  const pos = posAt(W(ctx).s, map.cols, map.rows);
  const dir = pos.x < map.cols / 2 ? 1 : -1;
  const row = (y) => Array.from({ length: map.cols }, (_, x) => ({ x, y }));
  if (kind === "tentacle") {
    const rows = [...new Set(targets(ctx, players, 3).map((p) => p.pos.y))];
    return { kind, dir, rows, tiles: rows.flatMap(row) };
  }
  if (kind === "charge") {
    const t = targets(ctx, players, 1)[0], y0 = Math.max(0, Math.min(map.rows - 3, t.pos.y - 1));
    const band = [y0, y0 + 1, y0 + 2];
    return { kind, dir, band, tiles: band.flatMap(row) };
  }
  if (kind === "whirl") {
    const centers = targets(ctx, players, 2).map((p) => ({ x: p.pos.x, y: p.pos.y }));
    const tiles = [];
    for (const c of centers) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (inB(map, c.x + dx, c.y + dy)) tiles.push({ x: c.x + dx, y: c.y + dy });
    return { kind, centers, tiles };
  }
  if (kind === "zap") {
    const t = targets(ctx, players, 1)[0];
    return { kind, at: { x: t.pos.x, y: t.pos.y }, tiles: [{ x: t.pos.x, y: t.pos.y }] };
  }
  if (kind === "song") {
    const tiles = [];
    for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) tiles.push({ x, y });
    return { kind, tiles, soft: true };
  }
  if (kind === "swallow") {
    const t = targets(ctx, players, 1)[0];
    return { kind, at: { x: t.pos.x, y: t.pos.y }, tiles: [{ x: t.pos.x, y: t.pos.y }] };
  }
  if (kind === "erase") {
    const t = targets(ctx, players, 1)[0];
    return { kind, row: t.pos.y, tiles: row(t.pos.y) };
  }
  if (kind === "copy") {
    const t = targets(ctx, players, 1)[0], tiles = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (inB(map, t.pos.x + dx, t.pos.y + dy)) tiles.push({ x: t.pos.x + dx, y: t.pos.y + dy });
    return { kind, id: t.id, at: { x: t.pos.x, y: t.pos.y }, tiles };
  }
  return null;
}

// ---------- ยิงท่า ----------
// ทอยหลบ (กฎผู้ใช้: ทุกท่าหลบได้) — หลบหลีก (สถานะ) แล้วช่องกำบัง (พุ่ม/ปะการัง)
function dodges(ctx, p) {
  const evade = (p.statuses && p.statuses.evade) || 0;
  if (evade > 0) {
    const pct = ctx.Status.statusAmtOf ? ctx.Status.statusAmtOf(p, "evade") || 100 : 100;
    if (Math.random() * 100 < pct) return true;
  }
  const cover = ctx.Board.terrainEvade ? ctx.Board.terrainEvade(ctx.map(), p.pos.x, p.pos.y) : null; // { pct } ปะการัง/พุ่ม
  return !!(cover && cover.pct > 0 && Math.random() * 100 < cover.pct);
}
function hit(ctx, p, n, kind, extra = {}) {
  if (!p || !p.alive || !p.pos) return false;
  // ตัวเรือ Nautilus บังพุ่งทะลวง/เพลงวาฬ: ยืนติดเรือ = ไม่โดน (GRID_PLAN §8.9 — ทำแบบง่าย ไม่ดูฝั่ง)
  if ((kind === "charge" || kind === "song") && require("./nautilusShip").shelters(ctx, p)) { ctx.fx("whale_dodge", { id: p.id, move: kind, ship: true }); return false; }
  if (dodges(ctx, p)) { ctx.log(`💨 ${p.name} หลบ${MOVE_NAMES[kind]}ได้`); ctx.fx("whale_dodge", { id: p.id, move: kind }); return false; }
  const bonus = isData(ctx) ? 2 + (zeta(ctx) ? 1 : 0) : ctx.stage >= 11 ? 1 : 0;
  const dealt = ctx.damage(p, n + bonus, extra);
  ctx.log(`🐋 ${MOVE_NAMES[kind]} → ${p.name} -${dealt}`);
  return true;
}
function at(ctx, x, y) { return ctx.alive().find((p) => p.pos && p.pos.x === x && p.pos.y === y) || null; }
function push(ctx, p, dx, dy) {
  if (!p || !p.alive || !p.pos) return;
  const x = p.pos.x + dx, y = p.pos.y + dy;
  if (ctx.free(x, y, p.id)) p.pos = { x, y };
}
function element(ctx, p, el) {
  try { require("../element").apply(p, el, null); } catch (err) { void err; }
}
function resolvePending(ctx, w) {
  const moves = w.pending || [];
  w.pending = [];
  if (!moves.length) return 0;
  const map = ctx.map();
  for (const m of moves) {
    const out = { move: m.kind, dir: m.dir, hits: [] }; // [แก้ 2026-11-19] เดิม kind: m.kind → ทับ kind "whale_…" ของเหตุการณ์ (ctx.fx กระจาย data ทับ) = client ไม่เห็นท่า
    if (m.kind === "tentacle") {
      out.rows = m.rows;
      for (const y of m.rows) for (const p of ctx.alive().filter((q) => q.pos && q.pos.y === y)) if (hit(ctx, p, DMG.tentacle, m.kind)) { push(ctx, p, m.dir, 0); out.hits.push(p.id); }
    } else if (m.kind === "charge") {
      out.band = m.band;
      for (const p of ctx.alive().filter((q) => q.pos && m.band.includes(q.pos.y))) if (hit(ctx, p, DMG.charge, m.kind)) {
        if (!p.pos) { out.hits.push(p.id); continue; } // ตายจากท่านี้ (ตำแหน่งถูกล้าง)
        const up = p.pos.y - m.band[0] < 1.5;
        const ty = up ? m.band[0] - 1 : m.band[2] + 1;
        if (inB(map, p.pos.x, ty) && ctx.free(p.pos.x, ty, p.id)) p.pos = { x: p.pos.x, y: ty };
        out.hits.push(p.id);
      }
    } else if (m.kind === "whirl") {
      out.centers = m.centers;
      for (const c of m.centers) for (const p of ctx.alive().filter((q) => q.pos && Math.abs(q.pos.x - c.x) <= 1 && Math.abs(q.pos.y - c.y) <= 1)) {
        const core = p.pos.x === c.x && p.pos.y === c.y;
        if (hit(ctx, p, core ? DMG.whirlCore : DMG.whirlRing, m.kind)) { element(ctx, p, "water"); require("./nautilusO2").drain(ctx, p, 1, "whirl"); out.hits.push(p.id); }
      }
    } else if (m.kind === "zap") {
      const first = at(ctx, m.at.x, m.at.y);
      const chain = first ? [first] : [];
      while (chain.length && chain.length < 4) {
        const last = chain[chain.length - 1];
        const nx = ctx.alive().filter((q) => q.pos && !chain.includes(q) && Math.max(Math.abs(q.pos.x - last.pos.x), Math.abs(q.pos.y - last.pos.y)) <= 2)
          .sort((a, b) => Math.hypot(a.pos.x - last.pos.x, a.pos.y - last.pos.y) - Math.hypot(b.pos.x - last.pos.x, b.pos.y - last.pos.y))[0];
        if (!nx) break;
        chain.push(nx);
      }
      out.at = m.at; out.chain = chain.map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y }));
      for (const p of chain) if (hit(ctx, p, DMG.zap, m.kind)) { element(ctx, p, "bolt"); out.hits.push(p.id); }
    } else if (m.kind === "song") {
      for (const p of ctx.alive()) if (hit(ctx, p, DMG.song, m.kind)) {
        const d = ctx.pick([[1, 0], [-1, 0], [0, 1], [0, -1]], 1)[0];
        push(ctx, p, d[0], d[1]); out.hits.push(p.id);
      }
    } else if (m.kind === "swallow") {
      out.at = m.at;
      const p = at(ctx, m.at.x, m.at.y);
      if (p && hit(ctx, p, DMG.swallow, m.kind)) {
        // [Claude] "หายจากกระดาน 1 เทิร์น" → กลืนแล้วพ่นออกช่องว่างสุ่ม + สตั้น 1 เทิร์น (engine ไม่มีสถานะนอกกระดานที่ปลอดภัย)
        const spots = ctx.floorTiles({ includeUnits: false }).filter((c) => ctx.free(c.x, c.y, p.id));
        const spot = spots.length ? ctx.pick(spots, 1)[0] : null;
        if (p.alive && spot) { p.pos = { x: spot.x, y: spot.y }; out.spit = spot; }
        if (p.alive) ctx.Status.applyDebuff(p, "stun", null, 1);
        if (p.alive) require("./nautilusO2").drain(ctx, p, Math.ceil(require("./nautilusO2").O2_MAX / 2), "swallow"); // ออกซิเจนหายครึ่งถัง
        out.hits.push(p.id);
      }
    } else if (m.kind === "erase") {
      out.row = m.row;
      const turn = ctx.match.roundNumber + 1;
      w.erased = { row: m.row, until: turn };
      ctx.bump();
      const set = new Set(m.tiles.map((c) => `${c.x},${c.y}`));
      for (const p of ctx.alive().filter((q) => q.pos && q.pos.y === m.row)) {
        if (hit(ctx, p, DMG.erase, m.kind)) out.hits.push(p.id);
        if (p.alive && p.pos) { const spot = nearestFree(ctx, p, set); if (spot) { p.pos = { x: spot.x, y: spot.y }; (out.moved ||= []).push({ id: p.id, x: spot.x, y: spot.y }); } }
      }
    } else if (m.kind === "copy") {
      out.at = m.at; out.id = m.id;
      const p = ctx.alive().find((q) => q.id === m.id && q.pos && Math.abs(q.pos.x - m.at.x) <= 1 && Math.abs(q.pos.y - m.at.y) <= 1);
      if (p) { out.x = p.pos.x; out.y = p.pos.y; if (hit(ctx, p, Math.max(DMG.copy, strikePower(ctx, p)), m.kind)) out.hits.push(p.id); }
    }
    ctx.fx(`whale_${m.kind}`, out);
  }
  ctx.bump();
  return 6;
}

// ---------- ชั้นแผนที่: ลำตัวเป็นสิ่งกีดขวาง ----------
// ท่าลบข้อมูล: แถวที่ถูกลบเป็นช่องว่างจินตภาพถึงจบเทิร์นที่ยิง
function erasedRow(ctx) {
  const w = W(ctx);
  return w && w.erased && isData(ctx) && ctx.match.roundNumber <= w.erased.until ? w.erased.row : null;
}
function layer(ctx, map) {
  const body = bodyNow(ctx, map), er = erasedRow(ctx);
  if (!body.length && er == null) return map;
  const terrain = { ...(map.terrain || {}) };
  if (er != null) for (let x = 0; x < map.cols; x++) { const k = `${x},${er}`; if (!terrain[k]) terrain[k] = "fd_nt_void"; }
  for (const c of body) {
    const k = c.x + "," + c.y;
    if (!terrain[k]) terrain[k] = "fd_nt_whale";
  }
  return { ...map, terrain };
}

// ---------- ตีปลาวาฬ ----------
function objects(ctx) {
  const w = W(ctx);
  if (!w || !w.on || w.dead) return [];
  return bodyNow(ctx).map((c) => ({ id: `fd:whale:${c.x},${c.y}`, x: c.x, y: c.y, kind: "whale", strike: true, hp: w.hp, hpMax: w.hpMax }));
}
function strikePower(ctx, p) {
  try {
    const atk = require("../phases/attack");
    const pseudo = { id: "fd:whale", name: "ทาลัสซา", statuses: {}, statusAmt: {}, hp: W(ctx).hp, armor: 0, alive: true };
    const n = Number(atk.computeAttackBase(ctx.engine, p, pseudo));
    if (n > 0) return n;
  } catch (err) { void err; }
  return Math.max(1, Number(p.atk) || 1);
}
function strikeObject(ctx, p, id) {
  const w = W(ctx);
  if (!w || !w.on || w.dead || !String(id).startsWith("fd:whale:")) return false;
  const n = strikePower(ctx, p);
  const [x, y] = String(id).slice(9).split(",").map(Number);
  return damageWhale(ctx, p, n, { x, y, src: "strike" });
}
// ความเสียหายใส่ทาลัสซา (ตีปกติ · ตอร์ปิโดของเรือ) → วินาทีของฉาก · ตาย = ผู้ทำได้หัวใจของท้องทะเล
function damageWhale(ctx, p, n, { x, y, src = "strike" } = {}) {
  const w = W(ctx);
  if (!w || !w.on || w.dead || !(n > 0)) return false;
  w.hp = Math.max(0, w.hp - n);
  ctx.fx("whale_hit", { x, y, n, by: p.id, hp: w.hp, src });
  ctx.log(`${src === "torpedo" ? "🚀" : "⚔️"} ${p.name} ${src === "torpedo" ? "ยิงตอร์ปิโดใส่" : "ฟัน"}ทาลัสซา -${n} (เหลือ ${w.hp}/${w.hpMax})`);
  if (w.hp <= 0) {
    w.dead = true; w.on = false; w.present = false; w.pending = []; w.killer = p.id;
    if (isData(ctx)) w.reviveAt = ctx.match.roundNumber + 1 + DATA_REVIVE; // ชั้น 6: กลับมาเป็นร่างข้อมูล
    ctx.Status.applyBuff(p, HEART.key, HEART.amount, HEART.turns);
    const map = ctx.map();
    ctx.fx("whale_death", { ...posAt(w.s, map.cols, map.rows), by: p.id });
    ctx.log(`💙 ${p.name} ปราบทาลัสซา — ได้หัวใจของท้องทะเล (พลังโจมตี +${HEART.amount} · ${HEART.turns} เทิร์น)`);
    ctx.bump();
    return 4;
  }
  return 1.2;
}

// ---------- ข้อมูลให้ client ----------
function publicInfo(ctx) {
  const w = W(ctx), match = ctx.match;
  if (!w) return null;
  const map = ctx.map();
  const pos = w.on && !w.dead ? posAt(w.s, map.cols, map.rows) : null;
  const warn = [];
  for (const m of w.pending || []) if (!m.soft) for (const c of m.tiles) warn.push({ x: c.x, y: c.y, kind: `whale_${m.kind}` });
  return {
    enabled: enabled(match), on: !!pos, dead: !!w.dead, hp: w.hp, hpMax: w.hpMax, s: w.s, pos, bait: w.bait ? w.bait.id : null, appearSeq: w.appearSeq || 0,
    nextAt: w.on || w.dead ? null : w.nextAt,
    data: !!w.data || isData(ctx), reviveAt: w.dead && w.reviveAt ? w.reviveAt : null,
    pending: (w.pending || []).map((m) => ({ kind: m.kind, dir: m.dir, rows: m.rows, band: m.band, centers: m.centers, at: m.at, row: m.row, id: m.id, soft: !!m.soft })),
    erased: erasedRow(ctx),
    warn,
  };
}
