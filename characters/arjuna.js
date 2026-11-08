// ============================================================
//  มหาเทพอรชุน — ระดับพิเศษ · id "arjuna"
//
//  ค่าพื้นฐาน (สเปกไม่ระบุ → ค่าเริ่มต้น): พลังชีวิต 7 / เกราะ 3 / พลังโจมตี 1 · ระยะเดิน 4 · ตีปกติระยะ 1–2 โดน 1 คน (ผู้ใช้สั่ง)
//  สกิลพื้นฐาน ตะเกียงวิญญาณ (4 · คูลดาวน์ 3): เยียวยา 3 เทิร์น + จุติ 3 เทิร์น
//    จุติ = สถานะ Universal (characters/_universal_status.js · combat.instantDeath): ตายแล้วคืนชีพด้วยพลังชีวิต 1 ล้างดีบัฟทั้งหมด
//    บัฟยังอยู่ · ทำงาน 1 ครั้งแล้วหาย · ฟื้นได้แม้การตายแบบ absolute (ผู้ใช้สั่ง)
//  สกิลรอง ขจัดสิ่งแปลกปลอม (4 · คูลดาวน์ 5): 5 เทิร์น ตีปกติพลังโจมตี +1 · ตีปกติ + ท่าไม้ตาย โบนัส +ชนิดดีบัฟบนเป้า (ไม่นับสแต็ก)
//    สเปก "ต้องใช้คู่กับสกิลรองเพื่อให้แรงที่สุด" = โบนัสชนิดดีบัฟมีผลกับท่าไม้ตายด้วย (เปราะบางที่เพิ่งติดนับด้วย) · พลังโจมตี +1 เฉพาะตีปกติตามสเปก
//  ท่าไม้ตาย Mahapralaya (6 · คูลดาวน์ 5): แถบกว้าง 4 ยาวสุดแผนที่ เลือกแนวนอน/ตั้ง + ตำแหน่งได้ทั้งแมพ (ไม่ผูกกับที่ยืน)
//    ศัตรู + ตัวเองในแถบ: เปราะบาง +1 1 เทิร์น ตอนดาบผ่าโลก (9.53 วิ) → ความเสียหาย 3 ตอนโลกระเบิด (12.5 วิ · เกราะก่อน · หลบได้)
//    เพื่อนในแถบ: แค่ถูกผลัก · ฉากจบ → แถบกลายเป็นช่องพัง (engine.addChasm · แบ่งแผนที่ขาดได้ = ตั้งใจ) · ร้านในแถบหาย · ศพในแถบหาย
//    ผลักออกข้างที่ใกล้กว่า (เท่ากัน = สุ่ม · ตัวใหญ่ = ฝั่งที่พื้นที่เหลือเยอะ · ฝั่งเต็ม = อีกฝั่ง) · ฉาก client/src/board/ArjunaUlt.jsx (state.arjunaUlt)
//  สกิลติดตัว ความสมบูรณ์แบบ: ตีปกติไม่เกิน 4 · ท่าไม้ตายไม่เกิน 6 (ฮุค damageCap) · ตีปกติโดนศัตรูที่มีดีบัฟ = แต้มสกิล +1 · จุติฟื้นคืนชีพ = แต้มสกิล +4
//  ตีปกติสุ่มท่า: ห่าง 1 ช่อง = ระเบิดลงเสมอ · ห่าง 2 ช่อง = สุ่มระเบิดลง/ธนูยิง (ผู้ใช้สั่ง · ตามคลิปต้นฉบับ) — client/src/board/arjunaBoardFx.js
//  เสียงตี/สับแผนที่ ตัดจากคลิปที่ผู้ใช้ส่ง · เสียงพากย์ตัดจาก arjuna_voice.m4a ตามบทจริง (ถอดด้วย faster-whisper)
//  ท่าไม้ตายใช้เสียงในวีดีโอ — ระหว่างฉากไม่มีเสียงพากย์เลย แม้มีคนตาย/จุติในฉาก (กฎผู้ใช้ 2026-11-03)
// ============================================================
const { BASIC_DEBUFF_CLEAR, SOFT_DEBUFF_STEP } = require("./_universal_status");
const Board = require("../server/board");

const ID = "arjuna";
const DIR = "/characters/arjuna";
const IMG = { base: `${DIR}/arjuna.webp`, skill1: `${DIR}/skill1.webp`, skill2: `${DIR}/skill2.webp`, skill3: `${DIR}/skill3.webp` };
const JUTTI = "jutti", PURGE = "arjunaPurge";
const LAMP_CD = 3, LAMP_TURNS = 3, PURGE_CD = 5, PURGE_TURNS = 5, ULT_CD = 5;
const ULT_DMG = 3, ULT_BAND = 4, ULT_FRAGILE_TURNS = 1;
const STRIKE_CAP = 4, ULT_CAP = 6, JUTTI_SKILL = 4;
// จังหวะฉากวีดีโอ (วินาที — ต้องตรงกับ ARJUNA_T / ARJUNA_ULT_MS ใน client/src/board/arjunaFx.js)
const ULT_SPLIT = 9.53, ULT_BOOM = 12.5, ULT_END = 17.4;
const CUT_SECONDS = 2.8;      // กลับมาที่กระดาน: ดาบฟาดลง → ระเบิดสีเป็นจังหวะ → พื้นถล่มตอนระเบิดสุดท้าย (ARJ_CUT_BEATS · เสียง arj_slash)
const CRUMBLE_SECONDS = 1.6;  // พื้นถล่มใต้ลำแสงชุดสุดท้าย จนฉาก arjunaCut จาง (ryougiFx crumble)
const STYLE_EXTRA = { arjunaBomb: 1.6, arjunaArrow: 2.3 }; // ท่าตียาวกว่าฉากตีปกติ (วินาที)
const STYLE_SOUND = { arjunaBomb: "arj_bomb", arjunaArrow: "arj_arrow" };
const SKILL_SOUND = { basic: "arj_lamp", secondary: "arj_purge" };

// คีย์เสียงพากย์ (client/src/audio.js → client/public/characters/arjuna/voice/) · สุ่ม 1 ต่อเหตุการณ์
const V = (name, n) => Array.from({ length: n }, (_, i) => `arj_v_${name}${i + 1}`);
//  สุ่มแบบไม่ซ้ำจนครบชุด (server/voice.js)
const VOICE = {
  // 行くぞ · 善を守り、邪を断つ · 了解しました · 行きましょう · ならばこうしましょう · 終わりを始めよう · なるほど · 提案を · もう終わりだな · 終わりとなるだろう · 世界は周り
  turn: V("turn", 11),
  // 粛清 · 排除 · 狂い咲く · 崩壊せよ · 終わるがいい · 炎の海 · 雷の矢 · 星は縮小し · 悪は滅する · そしてエゴを · 不要なり · 粛清、排除
  strike: V("hit", 12),
  // ほう · くっ · ねっ · ここで私も… · それもまた · 宿命
  struck: V("struck", 6),
  // 人よ、生きるべし · 星の灯火は消え · 我は神の力を継ぎ、その役割を果たす · 星の灯火は消え、諸人は運命を裁かれる · 人よ
  basic: V("lamp", 5),
  // 悪は剣によって裁かれる · されど人の世に邪悪なる者、不要なり · 悪を裁かなければならない · 諸人は運命を裁かれる · 世界は周り、悪は滅する
  secondary: V("purge", 5),
  // 万物は流転し、死は生へと裏返る · 滅亡と創生はこれ表裏一体 · 死は生へと裏返る · 生きるべし
  jutti: V("jutti", 4),
  // ここで私も…終わりを迎えるのか · それもまた宿命 · 果てのない運命に · 終わりを迎えるのか
  death: V("death", 4),
  // 何を望むか · 何を望む? 虚無か、平穏か · 帰るべき場所に帰るがいい · 回り転ぶ · 虚無か、平穏か · 帰るがいい · 終わるがいい
  kill: V("kill", 7),
};
const say = (engine, p, event) => {
  if (st(p).ulting || engine.arjunaUltOn()) return; // ฉากวีดีโอกำลังเล่น
  engine.voice(p, event);
};

const key = (x, y) => `${x},${y}`;
const isArjuna = (p) => !!p && p.characterId === ID && !p.summon;
const st = (p) => p.arjuna || (p.arjuna = fresh());
function fresh() { return { lampReady: 0, purgeReady: 0, ultReady: 0, ulting: false, lampAt: 0, purgeAt: 0, style: "arjunaBomb" }; }
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const on = (p, k) => ((p.statuses && p.statuses[k]) || 0) > 0;
const DEBUFFS = [...BASIC_DEBUFF_CLEAR, ...SOFT_DEBUFF_STEP];
const debuffKinds = (t) => (t ? DEBUFFS.filter((k) => on(t, k)).length : 0);

function fx(engine, p, kind, extra = {}) {
  if (!p || !p.pos) return;
  engine.boardFx("arjunaFx", { kind, id: p.id, at: { ...p.pos }, size: engine.sizeOf(p), color: engine.colorOf(p), ...extra });
}

// ---------- ท่าไม้ตาย ----------
const coversZone = (x, y, n, zone) => Board.footprint(x, y, n).some((t) => zone.has(key(t.x, t.y)));
// ช่องลงจอใกล้สุดฝั่ง side ของแถบ (−1 บน/ซ้าย · +1 ขวา/ล่าง) → null = ฝั่งนั้นไม่มีที่
function landing(engine, o, side, band, taken) {
  const map = engine.boardMap(), n = engine.sizeOf(o), from = o.pos;
  const others = engine.boardUnits().filter((u) => u.id !== o.id);
  const blocked = engine.boardBlocked(o.id);
  let best = null;
  for (let y = 0; y + n <= map.rows; y++) for (let x = 0; x + n <= map.cols; x++) {
    const a = band.v ? x : y;
    if (side < 0 ? a + n - 1 >= band.a0 : a <= band.a1) continue;
    const d = Math.abs(x - from.x) + Math.abs(y - from.y);
    if (best && d >= best.d) continue;
    const cells = Board.footprint(x, y, n);
    if (cells.some((t) => Board.isObstacle(map, t.x, t.y, blocked) || Board.unitAt(others, t.x, t.y) || taken.has(key(t.x, t.y)))) continue;
    best = { x, y, d };
  }
  return best ? { x: best.x, y: best.y } : null;
}
// ฝั่งที่ควรผลักไป: ตัวเล็ก = ข้างที่ใกล้ขอบแถบกว่า (เท่ากัน = สุ่ม) · ตัวใหญ่ = ฝั่งที่พื้นที่เหลือเยอะกว่า
function pushSide(engine, o, band) {
  const map = engine.boardMap(), n = engine.sizeOf(o), span = band.v ? map.cols : map.rows;
  if (n > 1) {
    const before = band.a0, after = span - 1 - band.a1;
    if (before !== after) return before > after ? -1 : 1;
    return Math.random() < 0.5 ? -1 : 1;
  }
  const a = band.v ? o.pos.x : o.pos.y, toLow = a - band.a0 + 1, toHigh = band.a1 - a + 1;
  if (toLow !== toHigh) return toLow < toHigh ? -1 : 1;
  return Math.random() < 0.5 ? -1 : 1;
}
function pushAll(engine, p, band, zone) {
  const out = [], taken = new Set();
  const units = engine.boardUnits().filter((u) => coversZone(u.x, u.y, u.size || 1, zone));
  for (const u of units) {
    const o = engine.players[u.id];
    if (!o || !o.pos) continue;
    const side = pushSide(engine, o, band);
    const to = landing(engine, o, side, band, taken) || landing(engine, o, -side, band, taken);
    if (!to) continue;
    const from = { ...o.pos };
    engine.ice.revealPushed(o);
    o.pos = { x: to.x, y: to.y };
    for (const t of Board.footprint(to.x, to.y, engine.sizeOf(o))) taken.add(key(t.x, t.y));
    out.push({ id: o.id, from, to: { ...o.pos }, dir: { x: Math.sign(to.x - from.x), y: Math.sign(to.y - from.y) } });
    if (o.id === p.id) Object.assign(engine.action || {}, { from: { ...o.pos }, path: null, trail: null, iceUndo: null, smashed: null });
  }
  return out;
}
function ultimate(engine, p, ids, opts) {
  const tile = opts.tile, orient = opts.orient === "v" ? "v" : "h";
  const map = engine.boardMap();
  const tiles = Board.bandTiles(map, tile.x, tile.y, orient, ULT_BAND);
  const zone = new Set(tiles.map((t) => key(t.x, t.y)));
  const axis = tiles.map((t) => (orient === "v" ? t.x : t.y));
  const band = { v: orient === "v", a0: Math.min(...axis), a1: Math.max(...axis) };
  // เพื่อนร่วมทีมไม่โดน · ตัวเองโดน (ตัวเองลงท้ายสุด: ตายแล้วคนอื่นยังโดนครบ)
  const list = ids.map((id) => engine.players[id]).filter((t) => t && t.alive && !(t.id !== p.id && engine.sameTeam(p, t)));
  const hit = [...list.filter((t) => t.id !== p.id), ...list.filter((t) => t.id === p.id)];
  const hits = {};
  engine.setArjunaUlt({ by: p.id, targets: hit.map((t) => t.id), hits });
  // 9.53 วิ: ดาบผ่าโลก = ติดเปราะบาง
  engine.skillBeat(ULT_SPLIT, () => {
    for (const t of hit) if (t.alive) engine.applyDebuff(t, "fragile", 1, ULT_FRAGILE_TURNS);
    if (hit.length) engine.log(`🌍 Mahapralaya — ${hit.map((t) => t.name).join(", ")} ติดเปราะบาง`);
  });
  // 12.5 วิ: โลกระเบิด = ลงความเสียหาย
  engine.skillBeat(ULT_BOOM - ULT_SPLIT, () => {
    const s = st(p);
    s.ulting = true;
    for (const t of hit) {
      if (!t.alive) continue;
      const before = t.hp + t.armor;
      const res = engine.skillStrike(p, t, "Mahapralaya");
      hits[t.id] = res.dodge || res.blocked ? 0 : Math.max(0, before - (t.alive ? t.hp + t.armor : 0));
    }
    s.ulting = false;
    engine.setArjunaUlt({ by: p.id, targets: hit.map((t) => t.id), hits }, true);
  });
  // จบฉาก: แถบหายไปจากโลก · คนถูกผลัก · ร้าน/ศพในแถบหาย
  engine.skillBeat(ULT_END - ULT_BOOM, () => {
    engine.setArjunaUlt(null);
    const lo = band.a0 + ULT_BAND / 2, mid = band.v ? { x: Math.floor(lo), y: Math.floor(map.rows / 2) } : { x: Math.floor(map.cols / 2), y: Math.floor(lo) };
    engine.boardFx("arjunaFx", { kind: "cut", id: p.id, at: mid, size: 1, band: { v: band.v, a0: band.a0, a1: band.a1 }, cols: map.cols, rows: map.rows });
    engine.sfx("arj_slash");
  });
  engine.skillBeat(CUT_SECONDS, () => {
    const keys = tiles.map((t) => key(t.x, t.y)).filter((k) => !(map.terrain[k] && Board.UNBREAKABLE.has(map.terrain[k]) && map.terrain[k] !== "chasm"));
    const razed = engine.breakObstacles(keys);
    const hitShops = engine.razeShopsIn(zone);
    const shopHit = hitShops.length ? { x: hitShops[0].x, y: hitShops[0].y, size: hitShops[0].size || 1, kind: hitShops[0].kind } : null;
    if (shopHit) engine.log("🏪 ร้านค้าพังทลาย — หายไปจนถึงรอบปรากฏถัดไป");
    for (const o of Object.values(engine.players)) if (!o.alive && o.corpse && zone.has(key(o.corpse.x, o.corpse.y))) o.corpse = null;
    const fresh2 = engine.addChasm(keys);
    const pushes = pushAll(engine, p, band, zone);
    engine.boardFx("ryougiFx", {
      kind: "crumble", id: p.id, color: engine.colorOf(p), at: p.pos ? { ...p.pos } : tile, size: 1,
      dir: band.v ? "down" : "right", land: p.pos ? { ...p.pos } : tile,
      tiles: fresh2.map((k) => { const [x, y] = k.split(",").map(Number); return { x, y }; }),
      pushes, razed: razed.map((r) => ({ x: r.x, y: r.y, kind: r.kind })), shop: shopHit, step: 4,
    });
    engine.log(`🌍 Mahapralaya — พื้น ${fresh2.length} ช่องหายไปจากโลก${pushes.length ? ` · ผลัก ${pushes.length} คนออกข้าง` : ""}`);
    const moves = pushes.map((m) => ({ id: m.id, via: m.from, to: m.to, dir: m.dir }));
    if (moves.length) engine.ice.forcedSlides(moves, p);
    engine.skillBeat(CRUMBLE_SECONDS, () => {});
  });
}

module.exports = {
  id: ID,
  IMG, VOICE, JUTTI, PURGE, LAMP_CD, LAMP_TURNS, PURGE_CD, PURGE_TURNS, ULT_CD, ULT_DMG, ULT_BAND, STRIKE_CAP, ULT_CAP, ULT_SPLIT, ULT_BOOM, ULT_END, CRUMBLE_SECONDS,
  isArjuna, debuffKinds,

  resetCombat(p) { p.arjuna = isArjuna(p) ? fresh() : null; },

  // พื้นที่ท่าไม้ตาย: แถบตามแนวที่หมุนไว้ (socket orient)
  skillArea(p, tier, area, opts = {}) {
    if (!isArjuna(p) || tier !== "ultimate") return area;
    return { ...area, orient: opts.orient === "v" ? "v" : "h" };
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") return cdLeft(s.lampReady, r) === 0;
    if (tier === "secondary") return cdLeft(s.purgeReady, r) === 0;
    if (tier === "ultimate") return cdLeft(s.ultReady, r) === 0 && !!opts.tile;
    return true;
  },
  silentFlash(p, tier) { return tier === "ultimate"; }, // ฉากเต็มจอตามทันที
  voiceLines(p) { return isArjuna(p) ? VOICE : null; },
  skillSound(p, tier) { return isArjuna(p) ? SKILL_SOUND[tier] || null : null; },
  onJutti(engine, p) {
    if (!engine.arjunaUltOn()) engine.sfx("arj_lamp"); // ใครติดจุติก็มีเสียง · ระหว่างฉากวีดีโอเงียบ
    if (!isArjuna(p)) return;
    engine.addSkill(p, JUTTI_SKILL, "passive");
    say(engine, p, "jutti");
  },
  onDeath(engine, p) { if (isArjuna(p)) say(engine, p, "death"); },
  onKill(engine, killer) { if (isArjuna(killer)) say(engine, killer, "kill"); },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    const s = st(p);
    if (tier === "basic") {
      s.lampReady = engine.roundNumber + LAMP_CD + 1;
      engine.applyMend(p, 1, LAMP_TURNS);
      engine.applyBuff(p, JUTTI, null, LAMP_TURNS);
      s.lampAt = engine.severStamp();
      fx(engine, p, "lamp");
      engine.log(`🪔 ${p.name} ตะเกียงวิญญาณ — เยียวยา + จุติ ${LAMP_TURNS} เทิร์น`);
    } else if (tier === "secondary") {
      s.purgeReady = engine.roundNumber + PURGE_CD + 1;
      p.statuses[PURGE] = PURGE_TURNS;
      s.purgeAt = engine.severStamp();
      fx(engine, p, "purge");
      engine.log(`🔱 ${p.name} ขจัดสิ่งแปลกปลอม — ${PURGE_TURNS} เทิร์น`);
    } else if (tier === "ultimate") {
      s.ultReady = engine.roundNumber + ULT_CD + 1;
      ultimate(engine, p, targets || [], opts);
    }
    return null;
  },

  // ---------- ความเสียหาย ----------
  attackBaseOverride(engine, a) { return isArjuna(a) && st(a).ulting ? ULT_DMG : 1; },
  damageBonus(engine, a, t) {
    if (!isArjuna(a) || !on(a, PURGE)) return 0;
    return (st(a).ulting ? 0 : 1) + debuffKinds(t);
  },
  // เพดานตามชนิดการโจมตี — สิ่งอื่นที่ไม่ใช่ตีปกติ/ท่าไม้ตาย (ปืน ไอเทม) ไม่จำกัด
  damageCap(engine, p, kind) {
    if (!isArjuna(p)) return null;
    if (st(p).ulting) return ULT_CAP;
    return kind === "strike" || engine.inStrike() ? STRIKE_CAP : null;
  },
  onStrikeLanded(engine, attacker, target) {
    if (!isArjuna(attacker) || !target || engine.sameTeam(attacker, target) || !debuffKinds(target)) return [];
    engine.addSkill(attacker, 1, "passive");
    return ["ความสมบูรณ์แบบ"];
  },
  attackFxNames(attacker, ctx) {
    return isArjuna(attacker) && on(attacker, PURGE) ? ["ขจัดสิ่งแปลกปลอม"] : []; // ชื่อเท่านั้น (object = client พังจอขาว)
  },
  attackStyle(p, dist) {
    if (!isArjuna(p)) return null;
    const style = dist >= 2 && Math.random() < 0.5 ? "arjunaArrow" : "arjunaBomb";
    st(p).style = style;
    return style;
  },
  attackSound(p) { return isArjuna(p) ? STYLE_SOUND[st(p).style] : undefined; },
  attackFxExtra(p) { return isArjuna(p) ? STYLE_EXTRA[st(p).style] : 0; },

  severables(engine, p) {
    if (!isArjuna(p)) return [];
    const s = st(p), out = [];
    if (on(p, JUTTI)) out.push({ key: "arjunaJutti", label: "จุติ", at: s.lampAt || 0, cancel() { delete p.statuses[JUTTI]; } });
    if (on(p, PURGE)) out.push({ key: "arjunaPurge", label: "ขจัดสิ่งแปลกปลอม", at: s.purgeAt || 0, cancel() { delete p.statuses[PURGE]; } });
    return out;
  },
  skillLocks(engine, p) {
    if (!isArjuna(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return { basic: { cd: cdLeft(s.lampReady, r) }, secondary: { cd: cdLeft(s.purgeReady, r) }, ultimate: { cd: cdLeft(s.ultReady, r) } };
  },
};
