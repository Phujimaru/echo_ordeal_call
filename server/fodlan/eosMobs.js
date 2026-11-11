// ============================================================
//  สนาม Eos — มอนรูปแบบใหม่ 8 แบบ (ผู้ใช้สั่ง 2026-11-12 "ทำทั้ง 8 แบบ" — มอนเดิมมีแต่เดินมาตีประชิด · เพื่อนขอมอนโหดและฉลาดขึ้น เล่นยาก 4 คน)
//   นิสัย (summon.trait) ติดกับปีศาจกลางคืน / ทหารเหล็กกลางวัน · ตัวเลขทั้งหมด Claude ตั้ง
//   archer  พลธนู      — ยิงไกล 4 · มีคนเข้าใกล้ ≤ 2 = ถอยออกไปก่อนแล้วยิง
//   shield  ทหารโล่    — ถึก · ตีจากด้านหน้า (ทิศที่หัน) โดนครั้งละไม่เกิน 1 → ต้องอ้อมไปตีข้าง/หลัง
//   weaver  ตัวพ่นใย   — ยิงใยระยะ 3: ตรึง 1 เทิร์น + 1 (คูลดาวน์ 2) · ระหว่างรอ = รักษาระยะ
//   blinker ตัววาร์ป   — ทุก 2 เทิร์น วาร์ปไปติดผู้เล่นที่เลือด+เกราะน้อยสุดในระยะ 8 แล้วตีทันที
//   hooker  ตัวโซ่ลาก  — แนวตรงระยะ 2–4: ลากเป้ามาติดตัว + 1 (คูลดาวน์ 2) · ลากออกจากเมือง/กลุ่มได้
//   rune    นักเวท     — วางวงเวท 3×3 ใต้ผู้เล่นในระยะ 5 (เตือน 1 เทิร์น) → ต้นเทิร์นหน้าระเบิด 3 · นักเวทตายก่อน = วงหาย
//   swarm   ฝูงจิ๋ว     — เลือด 1 เดินไว มาเป็นฝูง 5 ตัว (นับเพดานมอน)
//   splitter ตัวแยกร่าง — ล้มแล้วแตกเป็นร่างเล็ก 2 ตัว (ร่างเล็กไม่แตกซ้ำ)
//  สถานะ = s.mb (runes) · ฮุคจาก stage6: pick / stats / act / beforeAct / incoming / onDeath / afterSpawn / publicOf
// ============================================================
const lazySummon = () => require("../summon");

const MB = {
  archer: { range: 4, scare: 2 },
  shield: { front: 1 },
  weaver: { range: 3, root: 1, dmg: 1, cd: 2 },
  blinker: { reach: 8, cd: 2 },
  hooker: { min: 2, max: 4, dmg: 1, cd: 2 },
  rune: { range: 5, dmg: 3, keep: 4 },
  swarm: { size: 5 },
  splitter: { parts: 2 },
};
// โอกาสเป็นมอนพิเศษตามความยาก (ปีศาจ) · ระดับยาก/Lament เริ่มตั้งแต่คืนแรก (เดิมคืนที่ 2)
const SPECIAL_PCT = { easy: 0.3, normal: 0.45, hard: 0.6, lament: 0.7 };
const MAGITEK_PCT = { easy: 0.2, normal: 0.3, hard: 0.45, lament: 0.55 };
// น้ำหนักสุ่ม · cap = จำนวนสูงสุดบนแผนที่พร้อมกัน
const DAEMON_POOL = [
  ["bomber", 3], ["healer", 2, 2], ["archer", 3], ["shield", 3], ["weaver", 2, 3], ["blinker", 2, 3], ["hooker", 2, 3], ["rune", 2, 3], ["swarm", 2, 2], ["splitter", 2],
];
const MAGITEK_POOL = [["shield", 3], ["hooker", 2, 3], ["rune", 2, 3], ["archer", 3]];
const NAMES = {
  daemon: { archer: "ปีศาจพลธนู", shield: "ปีศาจถือโล่", weaver: "ปีศาจพ่นใย", blinker: "ปีศาจวาร์ป", hooker: "ปีศาจโซ่ลาก", rune: "ปีศาจวงเวท", swarm: "ปีศาจจิ๋ว", splitter: "ปีศาจแยกร่าง", splitling: "ร่างแยก" },
  magitek: { archer: "ทหารเหล็กหน้าไม้", shield: "ทหารเหล็กถือโล่", hooker: "ทหารเหล็กโซ่ลาก", rune: "ทหารเหล็กวงเวท" },
};
const NEW_TRAITS = new Set(["archer", "shield", "weaver", "blinker", "hooker", "rune", "swarm", "splitter", "splitling"]);
const isNew = (t) => NEW_TRAITS.has(t);
const nameOf = (type, trait) => (NAMES[type] && NAMES[type][trait]) || null;

const MS = (s) => (s.mb ||= { runes: [], seq: 0 });
const diffOf = (ctx) => (ctx.match && ctx.match.eosDiff) || "normal";
const traitOf = (m) => (m && m.summon ? m.summon.trait : null);

// ---------- สุ่มนิสัย ----------
function pickFrom(ctx, H, type, pool) {
  const have = {};
  for (const o of H.mobsOf(ctx)) { const t = traitOf(o); if (t) have[t] = (have[t] || 0) + 1; }
  const ok = pool.filter(([t, , cap]) => !(cap && (have[t] || 0) >= cap));
  const sum = ok.reduce((n, [, w]) => n + w, 0);
  let r = ctx.rng() * sum;
  for (const [t, w] of ok) { r -= w; if (r < 0) return t; }
  return ok.length ? ok[ok.length - 1][0] : null;
}
// ปีศาจ: คืนที่ 2 ขึ้นไป (ยาก/Lament ตั้งแต่คืนแรก)
function pickDaemon(ctx, s, H) {
  const d = diffOf(ctx), early = d === "hard" || d === "lament";
  if ((s.nightNo || 0) < (early ? 1 : 2)) return null;
  if (ctx.rng() >= (SPECIAL_PCT[d] ?? SPECIAL_PCT.normal)) return null;
  return pickFrom(ctx, H, "daemon", DAEMON_POOL);
}
function pickMagitek(ctx, s, H) {
  if (ctx.rng() >= (MAGITEK_PCT[diffOf(ctx)] ?? MAGITEK_PCT.normal)) return null;
  return pickFrom(ctx, H, "magitek", MAGITEK_POOL);
}
function stats(st, trait) {
  if (trait === "archer") return { ...st, hp: Math.max(1, st.hp - 2), armor: Math.max(0, st.armor - 1) };
  if (trait === "shield") return { ...st, hp: st.hp + 2, armor: st.armor + 1, mov: Math.max(2, st.mov - 1) };
  if (trait === "weaver") return { ...st, hp: Math.max(1, st.hp - 1), atk: Math.max(1, st.atk - 1) };
  if (trait === "blinker") return { ...st, hp: Math.max(1, st.hp - 1), armor: 0 };
  if (trait === "hooker") return { ...st, hp: st.hp + 1 };
  if (trait === "rune") return { ...st, hp: Math.max(1, st.hp - 2), armor: 0, atk: Math.max(1, st.atk - 1) };
  if (trait === "swarm") return { ...st, hp: 1, armor: 0, atk: Math.max(1, Math.ceil(st.atk / 2)), mov: st.mov + 1, gold: Math.max(1, Math.floor(st.gold / 2)) };
  if (trait === "splitter") return { ...st, hp: Math.round(st.hp * 1.3) + 1 };
  return null;
}
// ฝูงจิ๋ว: ตัวแรกเกิดแล้วเรียกพวกมาอีก size−1 ตัวรอบๆ (ไม่เกินเพดาน)
function afterSpawn(ctx, s, H, m, st, extra) {
  if (traitOf(m) !== "swarm" || extra.swarmKid) return 0;
  let room = Math.max(0, H.mobRoom(ctx)), n = 0;
  for (let i = 1; i < MB.swarm.size && room > 0; i++) {
    const at = H.freeNear(ctx, s, m.pos.x, m.pos.y, 2);
    if (!at) break;
    H.spawnMob(ctx, s, H.mobType(m), at, st, { ...extra, swarmKid: true });
    room--; n++;
  }
  return n;
}

// ---------- ระหว่างเทิร์นมอน ----------
const near = (H, a, b) => H.manhattan(a, b);
const nearestD = (H, list, t) => (list.length ? Math.min(...list.map((p) => near(H, p.pos, t))) : 99);
const weakest = (list) => list.slice().sort((a, b) => ((a.hp || 0) + (a.armor || 0)) - ((b.hp || 0) + (b.armor || 0)))[0] || null;
const ready = (ctx, sm) => !(sm.cdUntil > ctx.match.roundNumber);
const cool = (ctx, sm, n) => { sm.cdUntil = ctx.match.roundNumber + n; };
// รักษาระยะ: ไปช่องที่ห่างผู้เล่นใกล้สุด lo..hi (มีคนอยู่ใกล้กว่า lo = ถอย · ไกลกว่า hi = เข้าหา)
function kite(ctx, s, H, m, all, mov, lo, hi, acc) {
  if (!all.length || mov <= 0) return false;
  const d0 = nearestD(H, all, m.pos);
  if (d0 >= lo && d0 <= hi) return false;
  const g = H.stepToward(ctx, s, m, mov, (x, y) => { const d = nearestD(H, all, { x, y }); return d >= lo && d <= hi; });
  if (!g || !g.to) return false;
  acc.moves.push({ id: m.id, type: H.mobType(m), from: { ...m.pos }, to: { ...g.to }, path: g.path });
  const pv = Array.isArray(g.path) && g.path.length > 1 ? g.path[g.path.length - 2] : m.pos;
  H.faceTo(m.summon, g.to.x - pv.x, g.to.y - pv.y);
  m.pos = { x: g.to.x, y: g.to.y };
  ctx.bump();
  return true;
}
const movOf = (ctx, m, extra = 0) => Math.max(1, (ctx.action.movOf(m) | 0) + extra);
function shoot(ctx, m, t, dmg, kind, acc, H) {
  if (t.pos) H.faceTo(m.summon, t.pos.x - m.pos.x, t.pos.y - m.pos.y);
  const dealt = ctx.combat.withEffectSource(m, () => ctx.damage(t, Math.max(1, dmg)));
  acc.shots.push({ id: m.id, kind, from: { ...m.pos }, to: { ...t.pos }, target: t.id, dmg: dealt });
  return dealt;
}
// แนวตรงจาก m ถึง t (แกนเดียว) ช่องระหว่างทางว่าง → ช่องติดตัว m ฝั่ง t
function hookLine(ctx, s, H, m, t) {
  const dx = t.pos.x - m.pos.x, dy = t.pos.y - m.pos.y;
  if ((dx && dy) || (!dx && !dy)) return null;
  const sx = Math.sign(dx), sy = Math.sign(dy), d = Math.abs(dx + dy);
  if (d < MB.hooker.min || d > MB.hooker.max) return null;
  for (let i = 1; i < d; i++) if (!H.tileFree(ctx, s, m.pos.x + sx * i, m.pos.y + sy * i, t.id)) return null;
  return { x: m.pos.x + sx, y: m.pos.y + sy };
}
const pullable = (ctx, p) => p && p.alive && p.pos && !p.summon && !p.mountId && !(ctx.action.sizeOf && ctx.action.sizeOf(p) > 1);

// คืน true = จัดการตาของมอนตัวนี้แล้ว (ข้ามการเดิน/ตีปกติ) · false = เดินตีตามปกติ (โล่/ฝูงจิ๋ว/แยกร่าง และตอนสกิลยังไม่พร้อม)
function act(ctx, s, H, m, all, acc) {
  const tr = traitOf(m), sm = m.summon, atk = Math.max(1, sm.atk | 0);
  if (tr === "archer") {
    kite(ctx, s, H, m, all, movOf(ctx, m), MB.archer.scare + 1, MB.archer.range, acc);
    const t = weakest(all.filter((p) => near(H, p.pos, m.pos) <= MB.archer.range));
    if (t) { const n = shoot(ctx, m, t, atk, "arrow", acc, H); ctx.log(`🏹 ${m.name}ยิง ${t.name} -${n}`); }
    return true;
  }
  if (tr === "weaver") {
    const inR = (p) => near(H, p.pos, m.pos) <= MB.weaver.range;
    if (ready(ctx, sm) && !all.some(inR)) kite(ctx, s, H, m, all, movOf(ctx, m), 2, MB.weaver.range, acc);
    const t = ready(ctx, sm) ? weakest(all.filter(inR).filter((p) => !(p.statuses && p.statuses.rooted > 0))) || weakest(all.filter(inR)) : null;
    if (t) {
      const n = shoot(ctx, m, t, MB.weaver.dmg, "web", acc, H);
      if (t.alive) { t.statuses.rooted = Math.max(t.statuses.rooted || 0, MB.weaver.root); }
      cool(ctx, sm, MB.weaver.cd);
      ctx.log(`🕸️ ${m.name}พ่นใยใส่ ${t.name} -${n} · ติดใยเดินไม่ได้ 1 เทิร์น`);
      return true;
    }
    if (!ready(ctx, sm)) kite(ctx, s, H, m, all, movOf(ctx, m), 2, MB.weaver.range + 1, acc);
    return true;
  }
  if (tr === "blinker" && ready(ctx, sm)) {
    const pick = all.filter((p) => near(H, p.pos, m.pos) <= MB.blinker.reach).sort((a, b) => ((a.hp || 0) + (a.armor || 0)) - ((b.hp || 0) + (b.armor || 0)));
    for (const t of pick) {
      const others = all.filter((p) => p !== t);
      const spots = ctx.Board.DIRS.map(([dx, dy]) => ({ x: t.pos.x + dx, y: t.pos.y + dy }))
        .filter((c) => ctx.Board.inBounds(ctx.map(), c.x, c.y) && H.tileFree(ctx, s, c.x, c.y, m.id) && !H.blockedTown(s, c.x, c.y) && !H.lightSafe(c.x, c.y))
        .sort((a, b) => nearestD(H, others, b) - nearestD(H, others, a)); // ฝั่งที่ห่างเพื่อนของเป้า
      if (!spots.length) continue;
      const from = { ...m.pos }, to = spots[0];
      m.pos = { ...to };
      H.faceTo(sm, t.pos.x - to.x, t.pos.y - to.y);
      const dealt = ctx.combat.withEffectSource(m, () => ctx.damage(t, atk));
      acc.blinks.push({ id: m.id, from, to: { ...to }, target: t.id, dmg: dealt });
      acc.attacks.push({ id: m.id, type: H.mobType(m), x: to.x, y: to.y, target: t.id, dmg: dealt });
      cool(ctx, sm, MB.blinker.cd);
      ctx.bump();
      ctx.log(`👻 ${m.name}วาร์ปไปหลัง ${t.name} -${dealt}`);
      return true;
    }
    return false;
  }
  if (tr === "hooker" && ready(ctx, sm)) {
    if (all.some((p) => H.footOf(ctx, p).some((tt) => near(H, tt, m.pos) === 1))) return false; // มีคนติดตัวแล้ว = ตีปกติ
    const cand = all.filter((p) => pullable(ctx, p)).map((p) => ({ p, at: hookLine(ctx, s, H, m, p) })).filter((o) => o.at);
    const c = cand.sort((a, b) => ((a.p.hp || 0) + (a.p.armor || 0)) - ((b.p.hp || 0) + (b.p.armor || 0)))[0];
    if (c) {
      const t = c.p, from = { ...t.pos };
      t.pos = { ...c.at };
      H.faceTo(sm, t.pos.x - m.pos.x, t.pos.y - m.pos.y);
      const dealt = ctx.combat.withEffectSource(m, () => ctx.damage(t, MB.hooker.dmg));
      acc.pulls.push({ id: m.id, x: m.pos.x, y: m.pos.y, target: t.id, from, to: { ...c.at }, dmg: dealt });
      cool(ctx, sm, MB.hooker.cd);
      ctx.bump();
      ctx.log(`⛓️ ${m.name}ลาก ${t.name} เข้ามาติดตัว -${dealt}`);
      return true;
    }
    return false;
  }
  if (tr === "rune") {
    const M = MS(s);
    const mine = M.runes.find((r) => r.by === m.id);
    if (!mine) {
      const t = weakest(all.filter((p) => near(H, p.pos, m.pos) <= MB.rune.range));
      if (t) {
        const at = { ...t.pos };
        M.runes.push({ id: ++M.seq, by: m.id, x: at.x, y: at.y, dmg: MB.rune.dmg + (sm.tier >= 3 ? 1 : 0), at: ctx.match.roundNumber });
        acc.runes.push({ id: m.id, x: at.x, y: at.y });
        ctx.bump();
        ctx.log(`🔮 ${m.name}วางวงเวทใต้ ${t.name} — ออกจากวงก่อนเทิร์นหน้า!`);
      }
    }
    kite(ctx, s, H, m, all, movOf(ctx, m), 3, MB.rune.keep, acc);
    return true;
  }
  return false;
}
// ต้นช่วงมอน: วงเวทที่วางไว้ตาก่อนระเบิด (นักเวทตายไปแล้ว = วงหาย)
function beforeAct(ctx, s, H) {
  const M = MS(s);
  if (!M.runes.length) return [];
  const out = [];
  for (const r of M.runes.slice()) {
    if (r.at >= ctx.match.roundNumber) continue; // เพิ่งวางในช่วงมอนนี้
    M.runes = M.runes.filter((o) => o !== r);
    const by = ctx.match.players[r.by];
    if (!by || !by.alive) { out.push({ ...r, fizzle: true }); continue; }
    const tiles = H.area3(r.x, r.y).filter((t) => ctx.Board.inBounds(ctx.map(), t.x, t.y));
    const hits = [];
    for (const u of H.unitsOn(ctx, tiles)) {
      if (H.isMob(u)) continue;
      const dealt = ctx.combat.withEffectSource(by, () => ctx.damage(u, r.dmg));
      hits.push({ id: u.id, dmg: dealt });
    }
    out.push({ ...r, tiles, hits });
    if (hits.length) ctx.log(`🔮 วงเวทระเบิด! โดน ${hits.length} ตัว`);
  }
  if (out.length) { ctx.bump(); ctx.fx("mob_rune", { list: out }); }
  return out;
}
// ทหารโล่: ดาเมจจากด้านหน้า (ผู้ลงมืออยู่ฝั่งที่หัน) เหลือครั้งละ MB.shield.front
function incoming(ctx, s, m, n, src) {
  if (traitOf(m) !== "shield" || !(n > MB.shield.front) || !src || !src.pos || !m.pos) return n;
  const f = m.summon.face;
  if (!f) return n;
  const front = (src.pos.x - m.pos.x) * f.dx + (src.pos.y - m.pos.y) * f.dy > 0;
  if (!front) return n;
  ctx.fx("mob_block", { id: m.id, x: m.pos.x, y: m.pos.y, cut: n - MB.shield.front });
  return MB.shield.front;
}
// ตัวแยกร่าง: ล้มแล้วแตก 2 ร่างเล็ก (เลือด ⅓ · ตีลด 1 · ไม่มีเกราะ)
function onDeath(ctx, s, H, m) {
  if (traitOf(m) !== "splitter" || !m.pos) return [];
  const sm = m.summon, base = { hp: Math.max(1, Math.ceil((sm.maxHp || 3) / 3)), armor: 0, atk: Math.max(1, (sm.atk | 0) - 1), mov: Math.max(3, (m.mov | 0) || 4), gold: 1 };
  const kids = [];
  for (let i = 0; i < MB.splitter.parts; i++) {
    const at = H.freeNear(ctx, s, m.pos.x, m.pos.y, 2);
    if (!at) break;
    const k = H.spawnMob(ctx, s, H.mobType(m), at, base, { look: sm.look, tier: sm.tier, trait: "splitling" });
    if (k) { k.summon.born = 0; kids.push({ id: k.id, x: at.x, y: at.y }); }
  }
  if (kids.length) { ctx.fx("mob_split", { id: m.id, x: m.pos.x, y: m.pos.y, kids }); ctx.log(`🪨 ${m.name}แตกออกเป็น ${kids.length} ร่าง!`); }
  return kids;
}
function publicOf(ctx, s) {
  const M = MS(s);
  return { mobRunes: M.runes.map((r) => ({ id: r.id, by: r.by, x: r.x, y: r.y })) };
}

module.exports = { MB, SPECIAL_PCT, MAGITEK_PCT, DAEMON_POOL, MAGITEK_POOL, NEW_TRAITS, isNew, nameOf, pickDaemon, pickMagitek, stats, afterSpawn, act, beforeAct, incoming, onDeath, publicOf, MS };
