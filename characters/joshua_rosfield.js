// ============================================================
//  โจชัว รอสฟิลด์ (Final Fantasy XVI · เทพไฟ — Dominant แห่งนกเพลิง) — Boss · id "joshua_rosfield" · GRID_PLAN §7.41 (2026-11-23)
//
//  ค่าพื้นฐาน (ผู้ใช้): พลังชีวิต 6 · เกราะ 2 (ไม่มีโบนัสกลาง — combat.STAT_BONUS_OF) · เดิน 4 · ตีปกติระยะ 1–3 เป้าเดียว · พลังโจมตี 1
//  ตีปกติ: ฟันดาบ ไม่มีธาตุ (ผู้ใช้ 2026-11-23) · ฉากตีฟันไขว้ทอง (attackHitFx "saberGold") · เสียงดาบ vergil_slash2 (Mixkit — สำเนาในเครื่อง)
//  สกิลพื้นฐาน เพื่อปกป้องทุกคน (2 แต้ม · คูลดาวน์ 1 เทิร์น = กดเทิร์น N → N+2): ธาตุไฟ · กรวย 4 ไปข้างหน้า (เลือกทิศ)
//    ศัตรูทุกคนในกรวย: ความเสียหาย 1 (ร่างนกเพลิง 2 · หลบได้ · ลดเกราะก่อน) + ลุกไหม้ 2
//  สกิลรอง พรของนกเพลิง (1–3 แต้ม · ร่างนกเพลิง 1–4 · คูลดาวน์ 1 เทิร์น): ตัวเองหรือ 1 คนในระยะ 3 ฟื้นพลังชีวิตเท่าแต้มที่ใช้
//  ท่าไม้ตาย สวมร่างนกเพลิง (4 แต้ม · ไม่กินโควตา = ใช้แล้วกดสกิลอื่นต่อได้อีก 1): 3 เทิร์น (สถานะ joshuaPhoenix 3 — ลดที่ endTurn)
//    · กด = คลิป joshua_skill3 ทุกครั้ง (ผู้ใช้ 2026-11-23 · บีบ crf 23) → คลิปจบ: ศัตรูทุกคนในระยะเดินรอบตัว (หลบได้) ลุกไหม้ 2 + คราบไฟ
//    · ระหว่างร่าง: หมากมีหางริบบิ้นขนนกเพลิงแบบในคลิป (aura joshuaPhoenix) + เสียงไฟลุกวนเป็นพื้นหลัง (joshua_fire_loop — Mixkit "Campfire crackles" #1330 · คลิปเล่น = พัก)
//    · การกระทำของโจชัวที่ทำให้เกิดปฏิกิริยา → ติดคราบไฟใส่ผู้โดนอีกครั้งทันที (ฮุค broadcast afterReaction — server/element.js)
//    · ศัตรูโจมตีใส่ (ตีปกติ/สกิล/ปืน — รวมหลบพ้น) → ผู้โจมตีติดลุกไหม้ 1 (ผู้ใช้ 2026-11-23 · 1 ครั้งต่อการโจมตี — คีย์แบบเฟิร์น)
//  สกิลติดตัว นกเพลิงอมตะ (ผู้ใช้ 2026-11-23): ตายโดยไม่มีคราบน้ำแข็ง/น้ำ = เกิดใหม่เป็นนกฟีนิกซ์ 1 ครั้งต่อเกม (ฮุค preventDeath)
//    · คลิป กำเนิดนกไฟ → พลังชีวิต 20 · เกราะ 0 (สูงสุด 0) · ล้างสถานะ/ผลเดิมทั้งหมด · ตัว 3×3 บิน (ข้ามสิ่งกีดขวาง · ซ้อนช่อง · ไม่โดนผลพื้น · ผลักไม่ได้ — ตัวใหญ่)
//    · เผาสนาม: พื้นไฟ 40% ของช่องโล่ง 5 เทิร์น (แบบนกหวีด Judgment Bolt) · เปลี่ยนแผนที่ = เผาใหม่ (onBoardPlaced) · ทีมตัวเองไม่โดน
//    · เดิน 5 · ตีปกติ กรวย 3 (ระยะ 1–3 · ฮุค strikeCone) ไฟ ความเสียหาย 2 (พลังโจมตี +1 · บัฟพลังโจมตีบวกได้ · ลดเกราะก่อน) + ลุกไหม้ 2
//    · ไม่ถือไพ่ (แต้มการ์ด 0 — noCards) · ใช้ไอเทมไม่ได้ (noItems) · ไม่มีท่าไม้ตาย
//    · พื้นฐาน เพลิงแห่งชีวิต (1–4 แต้ม · ไม่มีคูลดาวน์): ฟื้นตัวเองเท่าแต้ม · รอง เพลิงนรก (4 แต้ม · คูลดาวน์ 3): ทุกคนบนแผนที่ (รวมเพื่อน · ไม่รวมตัวเอง · หลบได้)
//      ไฟ 3 + ลุกไหม้ 3 + คราบไฟ · คลิป ฟีนิกสกิลเฉพาะตัว ทุกครั้ง · ร่างนี้ฮีลเพื่อนไม่ได้ (เพลิงแห่งชีวิตใช้กับตัวเองเท่านั้น)
//    · กันตาย 3 ครั้ง: ดาเมจถึงตาย = พลังชีวิต 1 + สตั้น ตายไม่ได้จนต้นเทิร์นถัดไป (แบบ Master) · ครบ 3 = ตายจริง
//    · เพลงนกไฟเป็นเพลงสนาม (skillMusic) · เสียงไฟลุก + ปีกกระพือวน (client)
//  สกิลติดตัว ลูกชายคนเล็ก รอสฟิลด์ (ตอนนี้อยู่ช่อง passive — นกเพลิงอมตะมาเมื่อไรย้ายไป passive2):
//    · ลุกไหม้บนตัวโจชัว = ฟื้นพลังชีวิต 1 แทนเสียหาย (ฮุค hburnHeals — _universal_status.tickBurn)
//    · ปฏิกิริยาที่มีไฟเกิดบนตัวโจชัว = ยังรับความเสียหาย แล้วฟื้นพลังชีวิต 2 (ฮุค broadcast onReactionHit — ก่อนตัดสินตาย)
//    · ตีปกติโดน = เป้าติดลุกไหม้ 1
//    ลบสกิลติดตัว (server/passiveSeal.js): ทั้ง 3 ข้อไม่ทำงาน · ผลของท่าไม้ตายยังอยู่
//  Claude ตัดสินเอง (บอกผู้ใช้แล้ว): พรของนกเพลิงเลือกศัตรูได้ด้วย (สเปกไม่จำกัด) · ท่าไม้ตายไม่มีคูลดาวน์ (ค้างอยู่ = กดซ้ำไม่ได้)
//   · ลุกไหม้สวนกลับไม่ติดเพื่อนร่วมทีม · ถูกเรียวกิตัด/ล้างบัฟ = ร่างนกเพลิงหมดทันที
// ============================================================
const PassiveSeal = require("../server/passiveSeal");
const Board = require("../server/board");

const ID = "joshua_rosfield";
const DIR = "/characters/joshua_rosfield";
const IMG = {
  base: `${DIR}/joshua.webp`,
  basic: `${DIR}/skill1.webp`,
  secondary: `${DIR}/skill2.webp`,
  ultimate: `${DIR}/skill3.webp`,
  phoenix: `${DIR}/phoenix.webp`,
};
const FX = "joshuaFx";
const VIDEO = { ultimate: `${DIR}/joshua_skill3.mp4`, rebirth: `${DIR}/joshua_rebirth.mp4`, hellsong: `${DIR}/joshua_hellsong.mp4` };
const CUT = { ultimate: "joshuaPhoenix", rebirth: "joshuaRebirth", hellsong: "joshuaHellSong" };
const CLIP_SEC = { ultimate: 15, rebirth: 7, hellsong: 18 }; // 14.93 · 6.97 · 17.93 วิ
const MUSIC = "joshua_phoenix_theme"; // เพลงนกไฟ (ไฟล์ผู้ใช้ · -11 LUFS)
const BIRD = { hp: 20, size: 3, mov: 5, guards: 3, atk: 1, coneLen: 3, burn: 2, songMax: 4, hell: { cost: 4, dmg: 3, burn: 3, cd: 3 }, flameShare: 0.4, flameTurns: 5 };
// เสียง (client/src/audio.js): ฟันดาบ = สำเนา vergil slash2 · เสียงไฟ = Mixkit (ผู้ใช้สั่งโหลด 2026-11-23)
const SFX = { slash: "joshua_slash", fire: "joshua_fire", heal: "joshua_heal", phoenix: "joshua_phoenix", loop: "joshua_fire_loop", singe: "joshua_singe" };
const HP = 6;
const ARMOR = 2;
const CONE = { kind: "line", cone: true, len: 4, width: 1, hostile: true };
const BASIC = { dmg: 1, phoenixDmg: 2, burn: 2, cd: 2 }; // cd = กดเทิร์น N → N+2
const HEAL = { range: 3, max: 3, phoenixMax: 4, cd: 2 };
const PHOENIX = { key: "joshuaPhoenix", turns: 3, retaliate: 1, burn: 2 };
const PASSIVE2 = { name: "ลูกชายคนเล็ก รอสฟิลด์", reactHeal: 2, strikeBurn: 1 };
const T = { cone: 0.55, ignite: 2.2 }; // cone = ไฟพุ่งถึงช่องแรก · ignite = ระเบิดเพลิง+จอมืดก่อนคลิปกำเนิดนกไฟ (วินาที) — client JOSHUA_T ต้องตรงกัน (ms)

const isMe = (p) => !!p && p.characterId === ID && !p.summon;
const matchOf = () => require("../server/match");
const round = () => matchOf().roundNumber || 0;
const cdLeft = (ready, r) => Math.max(0, (ready || 0) - r);
function fresh() { return { basicReady: 0, healReady: 0, phoenixSever: 0, hitKey: null, form: "human", guards: 0, down: null, hellReady: 0, birdAt: 0, hatch: false }; }
function st(p) { return p.joshua || (p.joshua = fresh()); }
const birdOn = (p) => isMe(p) && !!p.joshua && p.joshua.form === "bird";
const phoenixOn = (p) => isMe(p) && p.alive !== false && ((p.statuses && p.statuses[PHOENIX.key]) || 0) > 0;
const passiveOn = (p) => PassiveSeal.on(p);
const healMax = (p) => (phoenixOn(p) ? HEAL.phoenixMax : HEAL.max);
const coneDmg = (p) => (phoenixOn(p) ? BASIC.phoenixDmg : BASIC.dmg);
const healAmt = (form) => { const n = Number(form); return Number.isInteger(n) && n >= 1 ? n : 0; };
const isFire = (a, b) => a === "fire" || b === "fire";

// ---------- เอฟเฟกต์ ----------
function watchers(engine, p) {
  return Object.values(engine.players).filter((o) => !o.duoOf && !o.summon && (o.id === p.id || !engine.hiddenFrom(o, p))).map((o) => o.id);
}
function fx(engine, p, kind, extra = {}) {
  if (!p.pos) return;
  engine.boardFxTo(watchers(engine, p), FX, { kind, id: p.id, at: { ...p.pos }, size: engine.sizeOf(p), ...extra });
}

// ---------- สกิลพื้นฐาน: เพื่อปกป้องทุกคน ----------
function castCone(engine, p, targets, dir) {
  const v = Board.LINE_DIRS[dir];
  if (!v || !p.pos) return "";
  st(p).basicReady = engine.roundNumber + BASIC.cd;
  const tiles = Board.lineTiles(engine.boardMap(), p.pos.x, p.pos.y, dir, CONE.len, CONE.width, engine.sizeOf(p), 0, true);
  const foes = (targets || []).map((id) => engine.players[id]).filter((t) => t && t.alive && t.pos && t.id !== p.id && !engine.sameTeam(p, t));
  const dmg = coneDmg(p);
  engine.log(`🔥 ${p.name} เพื่อปกป้องทุกคน${phoenixOn(p) ? " (ร่างนกเพลิง)" : ""}`);
  engine.sfx(SFX.fire);
  fx(engine, p, "cone", { dir, tiles, phoenix: phoenixOn(p) });
  engine.skillBeat(T.cone, () => {
    if (!p.alive || !p.pos) return;
    engine.withEffectSource(p, () => {
      for (const t of foes) {
        if (!t.alive || !t.pos) continue;
        const res = engine.skillStrike(p, t, "เพื่อปกป้องทุกคน", { bonus: dmg - 1 });
        if (!res || res.dodge || res.blocked || !t.alive) continue;
        const n = engine.applyBurn(t, BASIC.burn);
        if (n > 0) engine.log(`🔥 ${t.name} ลุกไหม้ +${n}`);
      }
    });
  });
  return "";
}

// ---------- สกิลรอง: พรของนกเพลิง ----------
function castHeal(engine, p, targets, n) {
  st(p).healReady = engine.roundNumber + HEAL.cd;
  const t = engine.players[(targets || [])[0]] || p;
  if (!t.alive) return "";
  const got = engine.withEffectSource(p, () => engine.healHp(t, n));
  engine.log(`🪶 ${p.name} พรของนกเพลิง → ${t.name} ฟื้นพลังชีวิต +${got || 0}`);
  engine.sfx(SFX.heal);
  if (t.pos) fx(engine, t, "heal", { by: p.id, n });
  return ` · +${got || 0}`;
}

// ---------- ท่าไม้ตาย: สวมร่างนกเพลิง ----------
function castPhoenix(engine, p, targets) {
  p.statuses[PHOENIX.key] = PHOENIX.turns;
  st(p).phoenixSever = engine.severStamp();
  engine.log(`🐦‍🔥 ${p.name} สวมร่างนกเพลิง — ${PHOENIX.turns} เทิร์น`);
  const ids = (targets || []).filter((id) => id !== p.id);
  // คลิปทุกครั้ง → ผลบนกระดานหลังคลิปจบ (กฎผู้ใช้: ห้ามเสียงเอฟเฟกต์ตัดหน้า/ซ้อนวีดีโอ)
  p.cutsceneShown = p.cutsceneShown || {};
  p.cutsceneShown[CUT.ultimate] = true;
  engine.queueCutscene(p, CUT.ultimate);
  engine.deferAfterCutscene(() => landPhoenix(engine, p, ids));
  return "";
}
// คลิปจบ: ปีกเพลิงกาง + ศัตรูในระยะเดินรอบตัวลุกไหม้ 2 + คราบไฟ (หลบได้ทีละคน)
function landPhoenix(engine, p, ids) {
  if (!p.alive || !p.pos) return;
  engine.sfx(SFX.phoenix);
  fx(engine, p, "phoenix", { hit: ids });
  engine.withEffectSource(p, () => {
    for (const id of ids) {
      const t = engine.players[id];
      if (!t || !t.alive || !t.pos || engine.sameTeam(p, t)) continue;
      if (engine.skillDodge(p, t, "เปลวนกเพลิง")) continue;
      const n = engine.applyBurn(t, PHOENIX.burn);
      if (n > 0) engine.log(`🔥 ${t.name} ลุกไหม้ +${n}`);
      if (t.alive) engine.elementApply(t, "fire", p);
    }
  });
}
function endPhoenix(engine, p, why) {
  if (!p.statuses || !p.statuses[PHOENIX.key]) return;
  delete p.statuses[PHOENIX.key];
  engine.log(why === "sever" ? `🐦‍🔥 ร่างนกเพลิงของ ${p.name} ถูกตัด` : `🐦‍🔥 ร่างนกเพลิงของ ${p.name} หมดลง`);
}

// ---------- นกเพลิงอมตะ: เกิดใหม่เป็นนกฟีนิกซ์ ----------
// ช่องโล่งสุ่ม share ของแผนที่ (แบบนกหวีด — server/whistle.js plainTiles)
function plainTiles(engine, share) {
  const map = engine.boardMap();
  const out = [];
  for (let y = map.minRow | 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) {
    const k = Board.key(x, y);
    if (map.terrain[k] || (map.special && map.special[k]) || (map.heal && map.heal.has && map.heal.has(k))) continue;
    if (require("../server/shop").shopAt(x, y)) continue;
    out.push({ x, y });
  }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out.slice(0, Math.round(out.length * share));
}
function burnField(engine, p) {
  if (!p.alive || !p.pos) return [];
  const tiles = engine.ice.layFlame(plainTiles(engine, BIRD.flameShare), p.id, BIRD.flameTurns);
  if (tiles.length) {
    engine.log(`🔥 ${p.name} นกฟีนิกซ์เผาสนาม — พื้นไฟ ${tiles.length} ช่อง (${BIRD.flameTurns} เทิร์น)`);
    engine.boardFx("divineFx", { seq: Date.now(), spell: "judgmentBolt", land: true, by: p.id, hits: [], tiles });
  }
  return tiles;
}
// ตัว 3×3 บิน: กลางตัวใหม่ตรงช่องเดิม (ซ้อนคนอื่นได้) · ไม่ล้นขอบกระดาน
function growBird(engine, p) {
  if (!p.pos) { p.boardSize = BIRD.size; return; }
  const map = engine.boardMap();
  const n = BIRD.size, minY = map.minRow | 0;
  const x = Math.max(0, Math.min(map.cols - n, p.pos.x - 1)), y = Math.max(minY, Math.min(map.rows - n, p.pos.y - 1));
  const prev = { ...p.pos };
  p.pos = { x, y };
  p.boardSize = n;
  engine.boardFx("growFx", { id: p.id, from: 1, to: n, at: { ...p.pos }, prev, pushed: [], smashed: [] });
}
function rebirth(engine, p) {
  const s = st(p);
  s.form = "bird";
  s.guards = BIRD.guards;
  s.down = null;
  s.hellReady = 0;
  s.birdAt = engine.severStamp();
  s.phoenixSever = 0;
  // เกิดใหม่: ล้างสถานะ/ผลเดิมทั้งหมด
  p.statuses = {};
  p.statusAmt = {};
  p.shield = 0;
  p.armor = 0;
  p.hp = BIRD.hp;
  growBird(engine, p);
  engine.log(`🐦‍🔥 ${p.name} นกเพลิงอมตะ — เกิดใหม่เป็นนกฟีนิกซ์! (พลังชีวิต ${BIRD.hp})`);
  // ฉาก (ผู้ใช้ 2026-11-23): ระเบิดเพลิงรุนแรง + จอมืดลงบนกระดาน (ภาพอย่างเดียว — กฎผู้ใช้: ไม่มีเสียงตัดหน้าวีดีโอ)
  //  → คลิปกำเนิดนกไฟ → หลังคลิป: นกปรากฏ + เผาสนาม + เสียง · ค่าต่างๆ เปลี่ยนแล้วตั้งแต่ตอนนี้ (client ยังวาดหมากเดิมระหว่าง hatch)
  s.hatch = true;
  engine.skillBeat(0.05, () => { if (p.pos) fx(engine, p, "ignite", { secs: T.ignite }); });
  engine.skillBeat(T.ignite, () => {
    p.cutsceneShown = p.cutsceneShown || {};
    p.cutsceneShown[CUT.rebirth] = true;
    engine.queueCutscene(p, CUT.rebirth);
    engine.deferAfterCutscene(() => {
      s.hatch = false;
      if (!p.alive || !birdOn(p)) return;
      engine.sfx(SFX.phoenix);
      fx(engine, p, "birdRise");
      burnField(engine, p);
    });
  });
  if (engine.wantFlow) engine.wantFlow();
}
// เพลิงแห่งชีวิต: ฟื้นตัวเองเท่าแต้ม
function castSong(engine, p, n) {
  const got = engine.withEffectSource(p, () => engine.healHp(p, n));
  engine.log(`🔥 ${p.name} เพลิงแห่งชีวิต — ฟื้นพลังชีวิต +${got || 0}`);
  engine.sfx(SFX.heal);
  fx(engine, p, "heal", { n });
  return ` · +${got || 0}`;
}
// เพลิงนรก: คลิปทุกครั้ง → ทุกคนบนแผนที่ (ไม่รวมตัวเอง · รวมเพื่อน) ไฟ 3 + ลุกไหม้ 3 + คราบไฟ · หลบได้
function castHellSong(engine, p) {
  st(p).hellReady = engine.roundNumber + BIRD.hell.cd;
  engine.log(`🔥 ${p.name} เพลิงนรก — เปลวเพลิงกลืนทั้งแผนที่`);
  p.cutsceneShown = p.cutsceneShown || {};
  p.cutsceneShown[CUT.hellsong] = true;
  engine.queueCutscene(p, CUT.hellsong);
  engine.deferAfterCutscene(() => landHellSong(engine, p));
  return "";
}
function landHellSong(engine, p) {
  if (!p.alive) return;
  const victims = Object.values(engine.players).filter((t) => t.id !== p.id && t.alive && t.pos && !(t.summon && t.summon.noStatus));
  // เสียง: client เล่นตามจังหวะฉาก (ไฟพุ่งดิ่ง joshua_fire → ระเบิดเบสหนัก joshua_hell_boom ตอนชนกลางสนาม)
  // ฉากบนกระดาน (client joshuaHellsong): ทั้งกระดาน — ส่งขนาดกระดาน + ตำแหน่งคนที่โดน
  const map = engine.boardMap();
  fx(engine, p, "hellsong", { cols: map.cols, rows: map.rows, minRow: map.minRow | 0, hits: victims.map((t) => ({ id: t.id, x: t.pos.x, y: t.pos.y, size: engine.sizeOf(t) })) });
  for (const t of victims) {
    if (!t.alive || !t.pos) continue;
    if (engine.sameTeam(p, t)) {
      // เพื่อนร่วมทีมโดนด้วย (ข้อเสียของร่าง — ผู้ใช้สั่ง): ไม่ใส่ต้นตอ (ท่อดาเมจกันยิงพวกเดียวกัน) · ดาเมจตายตัว · หลบได้
      if (engine.skillDodge(p, t, "เพลิงนรก")) continue;
      engine.withEffectSource(null, () => {
        engine.withElement("fire", () => engine.dealMixed(t, BIRD.hell.dmg));
        if (t.alive) engine.applyBurn(t, BIRD.hell.burn);
      });
      engine.log(`🔥 ${t.name} โดนเพลิงนรก -${BIRD.hell.dmg} · ลุกไหม้ +${BIRD.hell.burn}`);
      if (t.alive && t.hp <= 0) { engine.instantDeath(t); if (!t.alive) engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
      if (!t.alive) t.pos = null;
      continue;
    }
    engine.withEffectSource(p, () => {
      // พลังโจมตีร่างนก = 1 + 1 (damageBonus) → bonus ให้รวมเป็น 3
      const res = engine.skillStrike(p, t, "เพลิงนรก", { bonus: BIRD.hell.dmg - 1 - BIRD.atk });
      if (!res || res.dodge || res.blocked || !t.alive) return;
      const n = engine.applyBurn(t, BIRD.hell.burn);
      if (n > 0) engine.log(`🔥 ${t.name} ลุกไหม้ +${n}`);
      if (t.alive && t.pos) engine.elementApply(t, "fire", p);
    });
  }
}
const songDesc = (n) => `ฟื้นพลังชีวิตตัวเอง ${n}`;
const hellDesc = () => `ทุกคนบนแผนที่ (รวมเพื่อนร่วมทีม) ไฟ ${BIRD.hell.dmg} + ลุกไหม้ ${BIRD.hell.burn} + คราบไฟ (หลบได้ · คูลดาวน์ ${BIRD.hell.cd} เทิร์น)`;

function healDesc(n) {
  return `ตัวเองหรือ 1 คนในระยะ ${HEAL.range} ฟื้นพลังชีวิต ${n} (คูลดาวน์ 1 เทิร์น)`;
}

module.exports = {
  id: ID,
  IMG, FX, SFX, VIDEO, CUT, CLIP_SEC, MUSIC, BIRD, HP, ARMOR, CONE, BASIC, HEAL, PHOENIX, PASSIVE2, T,
  isMe, phoenixOn, birdOn,

  maxHp(p) { return isMe(p) ? (birdOn(p) ? BIRD.hp : HP) : undefined; },
  maxArmor(p, base) { return isMe(p) ? (birdOn(p) ? 0 : ARMOR) : base; },

  // ---------- ร่างนกฟีนิกซ์ ----------
  mov(p) { return birdOn(p) ? BIRD.mov : null; },
  flies(p) { return birdOn(p); },
  groundImmune(p) { return birdOn(p); },
  noCards(p) { return birdOn(p); },
  noItems(p) { return birdOn(p); },
  strikeCone(p) { return birdOn(p) ? BIRD.coneLen : 0; },
  attackElement(engine, p) { return birdOn(p) ? "fire" : null; },
  damageBonus(engine, attacker) { return birdOn(attacker) ? BIRD.atk : 0; },
  skillHidden(p, tier) { return birdOn(p) && tier === "ultimate"; },
  skillMusic(engine, p) { return birdOn(p) && p.alive ? { music: MUSIC, at: st(p).birdAt || 0 } : null; },
  characterPub(engine, p) { return birdOn(p) ? { name: "นกฟีนิกซ์", img: IMG.phoenix } : null; },
  // นกเพลิงอมตะ: ตายครั้งแรก (ไม่มีคราบน้ำแข็ง/น้ำ) = เกิดใหม่ · ร่างนก: กันตาย 3 ครั้ง (พลังชีวิต 1 + สตั้น จนต้นเทิร์นถัดไป)
  preventDeath(engine, p) {
    if (!isMe(p)) return false;
    const s = st(p);
    if (birdOn(p)) {
      if (s.down != null) { p.hp = Math.max(1, p.hp); return true; }
      if (s.guards <= 0) return false;
      s.guards--;
      s.down = engine.roundNumber;
      p.hp = 1;
      engine.applyDebuff(p, "stun", 1, 1);
      engine.log(`🔥 ${p.name} นกเพลิงอมตะ — ร่วงลงในเปลวไฟ… (กันตายเหลือ ${s.guards})`);
      fx(engine, p, "birdDown");
      return true;
    }
    if (!passiveOn(p) || s.form !== "human") return false;
    const aura = require("../server/element").auraOf(p);
    if (aura === "ice" || aura === "water") {
      engine.log(`❄️ ${p.name} ติด${aura === "ice" ? "น้ำแข็ง" : "น้ำ"} — เปลวไฟแห่งนกเพลิงดับลง`);
      return false;
    }
    rebirth(engine, p);
    return true;
  },

  resetCombat(p) {
    p.joshua = isMe(p) ? fresh() : null;
    if (p.statuses && isMe(p)) delete p.statuses[PHOENIX.key];
  },

  // ---------- ตีปกติ: ฟันดาบ (ไม่มีธาตุ) ----------
  attackSound(p) { return isMe(p) ? (birdOn(p) ? SFX.fire : SFX.slash) : undefined; },
  attackHitFx(p) { return isMe(p) && !birdOn(p) ? "saberGold" : undefined; },
  attackStyle(p) { return birdOn(p) ? "joshuaBirdStrike" : null; }, // ร่างนก: กระพือปีกส่งคลื่นเพลิงกวาดกรวย (client joshuaFx)
  onStrikeLanded(engine, attacker, target) {
    if (!isMe(attacker) || !target || !target.alive) return [];
    if (!birdOn(attacker) && !passiveOn(attacker)) return [];
    const n = engine.applyBurn(target, birdOn(attacker) ? BIRD.burn : PASSIVE2.strikeBurn);
    return n > 0 ? [`ลุกไหม้ +${n}`] : [];
  },

  // ---------- สกิล ----------
  skillElement(engine, p, tier) {
    if (!isMe(p)) return null;
    if (birdOn(p)) return tier === "secondary" ? "fire" : null;
    return tier === "basic" ? "fire" : null;
  },
  skillArea(p, tier, area) {
    if (!birdOn(p)) return area;
    if (tier === "basic") return { kind: "self" };
    if (tier === "secondary") return { kind: "field", hostile: true };
    return area;
  },
  skillPub(p, tier) {
    if (birdOn(p)) {
      if (tier === "basic") {
        const choices = [];
        for (let n = 1; n <= BIRD.songMax; n++) choices.push({ key: String(n), name: `เพลิงแห่งชีวิต ${n}`, img: IMG.phoenix, cost: n, area: { kind: "self" }, cd: 0, locked: false, desc: songDesc(n) });
        return { name: "เพลิงแห่งชีวิต", img: IMG.phoenix, desc: "เลือก 1–4 แต้ม: ฟื้นพลังชีวิตตัวเองเท่าแต้มที่ใช้", choices };
      }
      if (tier === "secondary") return { name: "เพลิงนรก", img: IMG.phoenix, desc: hellDesc(), cost: BIRD.hell.cost };
      return null;
    }
    if (!isMe(p) || tier !== "secondary") return null;
    const r = round(), cd = cdLeft(st(p).healReady, r), max = healMax(p);
    const choices = [];
    for (let n = 1; n <= max; n++) {
      choices.push({ key: String(n), name: `พรของนกเพลิง ${n}`, img: IMG.secondary, cost: n, area: { kind: "target", range: HEAL.range, self: true }, cd, locked: cd > 0, desc: healDesc(n) });
    }
    return { choices };
  },
  skillCost(p, tier, base, opts = {}) {
    if (birdOn(p)) return tier === "basic" ? (healAmt(opts.form) || 1) : tier === "secondary" ? BIRD.hell.cost : base;
    if (!isMe(p) || tier !== "secondary") return base;
    return healAmt(opts.form) || base;
  },
  skipsTurnQuota(p, tier) { return isMe(p) && !birdOn(p) && tier === "ultimate"; },
  skillLocks(engine, p) {
    if (!isMe(p)) return undefined;
    const r = engine.roundNumber;
    if (birdOn(p)) { const h = cdLeft(st(p).hellReady, r); return { basic: { cd: 0, locked: false }, secondary: { cd: h, locked: h > 0 } }; }
    const b = cdLeft(st(p).basicReady, r), h = cdLeft(st(p).healReady, r);
    return { basic: { cd: b, locked: b > 0 }, secondary: { cd: h, locked: h > 0 }, ultimate: { cd: 0, locked: phoenixOn(p) } };
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return true;
    const r = engine.roundNumber;
    if (birdOn(p)) {
      if (tier === "basic") { const n = healAmt(opts.form); return n >= 1 && n <= BIRD.songMax; }
      if (tier === "secondary") return cdLeft(st(p).hellReady, r) === 0;
      return false;
    }
    if (tier === "basic") return !!p.pos && cdLeft(st(p).basicReady, r) === 0;
    if (tier === "secondary") {
      const n = healAmt(opts.form);
      return n >= 1 && n <= healMax(p) && cdLeft(st(p).healReady, r) === 0;
    }
    if (tier === "ultimate") return !phoenixOn(p);
    return false;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return "";
    if (birdOn(p)) {
      if (tier === "basic") return castSong(engine, p, healAmt(opts.form));
      if (tier === "secondary") return castHellSong(engine, p);
      return "";
    }
    if (tier === "basic") return castCone(engine, p, targets, opts.dir);
    if (tier === "secondary") return castHeal(engine, p, targets, healAmt(opts.form));
    if (tier === "ultimate") return castPhoenix(engine, p, targets);
    return "";
  },
  skillSound() { return null; }, // เสียงเล่นใน applyInstantSkill ตามจังหวะของแต่ละท่า

  // ---------- ร่างนกเพลิง: ถูกศัตรูโจมตี = ผู้โจมตีลุกไหม้ 1 (ครั้งเดียวต่อการโจมตี) ----------
  onAttacked(engine, p, attacker) {
    if (!phoenixOn(p) || !attacker || !attacker.alive || (attacker.summon && attacker.summon.noStatus)) return;
    if (engine.sameTeam(p, attacker)) return;
    const s = st(p), key = `${attacker.id}|${engine.roundNumber}|${engine.actorId || ""}|${engine.commandSeq}`;
    if (s.hitKey === key) return;
    s.hitKey = key;
    const n = engine.withEffectSource(p, () => engine.applyBurn(attacker, PHOENIX.retaliate));
    if (n > 0) {
      engine.log(`🐦‍🔥 ${attacker.name} โจมตีร่างนกเพลิง — ลุกไหม้ +${n}`);
      // ไฟ + เสียง (client เล่นเสียง joshua_singe พร้อมภาพ) ตรงจังหวะปะทะของการตี · นอกฉากตี = ทันที
      if (attacker.pos) engine.boardFxAtHit(FX, { kind: "singe", id: attacker.id, at: { ...attacker.pos }, size: engine.sizeOf(attacker), by: p.id });
    }
  },

  // ---------- ปฏิกิริยาธาตุ (server/element.js) ----------
  // ลูกชายคนเล็ก: ปฏิกิริยาที่มีไฟบนตัวโจชัว = ยังเสียหาย แล้วฟื้น 2 (ก่อนตัดสินตาย)
  onReactionHit(engine, t, info) {
    if (!isMe(t) || !t.alive || !passiveOn(t) || !info || !isFire(info.a, info.b)) return;
    const got = engine.withEffectSource(t, () => engine.healHp(t, PASSIVE2.reactHeal));
    if (got > 0) engine.log(`❤️‍🔥 ${t.name} ${PASSIVE2.name} — ไฟหล่อเลี้ยง ฟื้นพลังชีวิต +${got}`);
  },
  // ร่างนกเพลิง: การกระทำของโจชัวทำให้เกิดปฏิกิริยา → ติดคราบไฟต่อทันที
  afterReaction(engine, t, info) {
    const src = info && info.source;
    if (!phoenixOn(src) || !t || !t.alive || !t.pos) return;
    engine.elementApply(t, "fire", src);
  },

  // ลุกไหม้บนตัวโจชัว = ฟื้นแทนเสียหาย
  hburnHeals(p) { return isMe(p) && passiveOn(p); },

  // ---------- จังหวะเทิร์น ----------
  onRoundStartTick(engine, p) {
    if (!isMe(p) || !p.alive) return;
    if (birdOn(p) && st(p).down != null && engine.roundNumber > st(p).down) {
      st(p).down = null;
      engine.log(`🔥 ${p.name} นกฟีนิกซ์ลุกขึ้นจากเปลวไฟอีกครั้ง (พลังชีวิต ${p.hp})`);
      fx(engine, p, "heal", { n: 1 }); // ฟื้นจากกันตาย = เสาไฟคืนชีพเล็กๆ (ไม่ใช่ฉากปรากฏตัวเต็มจอ)
    }
    if (st(p).phoenixSever && !phoenixOn(p)) { st(p).phoenixSever = 0; engine.log(`🐦‍🔥 ร่างนกเพลิงของ ${p.name} หมดลง`); }
  },
  onDeath(engine, p) { if (isMe(p) && p.statuses) delete p.statuses[PHOENIX.key]; },
  // เปลี่ยนแผนที่ = เผาสนามใหม่ทุกครั้ง
  onBoardPlaced(engine) {
    for (const p of Object.values(engine.players)) if (birdOn(p) && p.alive && p.pos) burnField(engine, p);
  },

  // ---------- ผลสกิลที่ตัดได้ (server/sever.js) ----------
  severables(engine, p) {
    if (!phoenixOn(p)) return [];
    return [{ key: "joshuaPhoenix", label: "สวมร่างนกเพลิง", at: st(p).phoenixSever, cancel: () => { endPhoenix(engine, p, "sever"); st(p).phoenixSever = 0; } }];
  },

  // ---------- ข้อมูลให้ client (players[].joshua) ----------
  joshuaState(engine, p) {
    if (!isMe(p)) return undefined;
    const r = engine.roundNumber;
    const s = st(p);
    return {
      bird: birdOn(p) && !s.hatch, hatch: !!s.hatch, guards: birdOn(p) ? s.guards : 0, down: birdOn(p) && s.down != null,
      hellCd: birdOn(p) ? cdLeft(s.hellReady, r) : 0,
      phoenix: phoenixOn(p) ? p.statuses[PHOENIX.key] : 0,
      basicCd: cdLeft(st(p).basicReady, r),
      healCd: cdLeft(st(p).healReady, r),
    };
  },
};
