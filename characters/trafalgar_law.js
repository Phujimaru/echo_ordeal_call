// ============================================================
//  ทราฟาก้า ลอว์ (One Piece — ผลโอเปะโอเปะ) — พิเศษ · unique · id "trafalgar_law"
//  กติกาที่ผู้ใช้ตัดสิน GRID_PLAN §7.20 (2026-10-26) · สัญญาข้อมูล .claude/plans/law-contract.md · เอฟเฟกต์ client/src/board/lawFx.js
//
//  ค่าพื้นฐาน 7/3 · พลังโจมตี 0 เสมอ · เดิน 4 · ภาพ/เสียงผู้ใช้ส่งทีหลัง
//  Room (พื้นฐาน · 0 แต้ม · 5×5 / 9×9 · ไม่กินโควตา · ไม่ล็อกการเดิน): กางรอบตัวแล้วอยู่กับที่ · กดอีกครั้ง = ปิด ·
//    คูลดาวน์นับหลังปิด (5×5 = 1 · 9×9 = 3) · เปลี่ยนภูมิภาค = ปิด ไม่มีคูลดาวน์
//  ศัลแพทย์แห่งความตาย (ติดตัว): ตีปกติได้เฉพาะใน Room ระยะทั้ง Room · 3 ครั้งต่อเทิร์น ตีแล้วไม่จบตา · ตีโดน = มาร์กจนจบตาเดิน ·
//    ตัดพื้น (ปุ่ม HUD · นับเป็นการตี) = วัตถุลอย สูงสุด 4 · ทิ้ง (ครึ่งขวาของปุ่มตัด · ฟรี ไม่นับการตี) = เลือกวัตถุลอยทิ้งทีละก้อน · ยืนใน Room ตอนจบเทิร์น แต้มสกิล +1 · ตายใน Room = ศพค้าง ·
//    Counter Shock (ปุ่ม HUD · 0 แต้ม · 3 ครั้งต่อเกม): ฟื้นศพที่ประชิด พลังชีวิต 1
//  ศัลแพทย์ (รอง · 4 ตัวเลือก · ต้องอยู่ใน Room · 2 ครั้งต่อเทิร์น นับแยก ไม่กินโควตา):
//    Shambles (2) สลับที่ 2 อย่าง (ตัวเอง/คนที่มาร์ก/วัตถุ) · Takt (1) หนามหิน ดาเมจ 1 + ผลัก · โยนสิ่งของ (2) วัตถุทั้งหมด ดาเมจ 1 ต่อก้อน
//    คูลดาวน์ 3 เทิร์นหลังโยน (ผู้ใช้สั่ง 2026-10-27) ·
//    Shamble (3) สลับพลังชีวิตและเกราะของ 2 คน (ตัวเอง/คนที่มาร์ก)
//  ท่าไม้ตาย (2 ตัวเลือก · 4 แต้ม · คูลดาวน์แยกอันละ 3 เทิร์น): ตีปกติครั้งถัดไปในตาเดินนี้ (ประชิด)
//    Gamma Knife = ลุกไหม้/เลือดไหล/พิษร้าย อย่างละ 2 สุ่ม 1 อย่างเป็น 3 · Mess = หัวใจเข้ากระเป๋า บีบได้ 3 ครั้ง ครั้งละ 2 (ไม่เสียแต้ม เสียการเดิน)
//
//  Claude ตัดสินเอง (GRID_PLAN §7.20 · ผู้ใช้เปลี่ยนได้): วัตถุลอยไม่ขวางทาง · ตีเป้าที่ทับขอบ Room ได้ · Takt/โยน หลบได้ ·
//    หนามหินอยู่ถึงต้นตาเดินถัดไปของลอว์ · Shamble ตัดส่วนเกินเพดาน · พิษร้ายตั้ง 3 (= ออกฤทธิ์ 2 ครั้ง) · หัวใจบีบได้ 1 ครั้งต่อเทิร์น ต่อดวง
// ============================================================
const Board = require("../server/board");

const ID = "trafalgar_law";
const DIR = "/characters/trafalgar_law";
const IMG = {
  base: `${DIR}/law.webp`,
  room: `${DIR}/law_room.webp`,
  roomClose: `${DIR}/law_room_close.webp`,
  surgeon: `${DIR}/law_surgeon.webp`, // ปุ่มศัลแพทย์ + ตัวเลือกทั้ง 4 (ภาพผู้ใช้ law_skill2)
  ult: `${DIR}/law_ult.webp`,         // ปุ่มท่าไม้ตาย + Gamma Knife (ภาพผู้ใช้ law_skill3)
  mess: `${DIR}/law_mess.webp`,       // เฟรมลูกบาศก์หัวใจจากคลิป Mess
  heart: `${DIR}/law_heart.webp`,
};
const FX = "lawFx"; // socket event (client/src/board/lawFx.js)
// เสียงจากผู้ใช้ (2026-10-26 — ไฟล์เดียวเปิด+ปิดต่อกัน ตัดแยกที่ 4.995 วิ · client/src/audio.js) · ท่าอื่นรอไฟล์
const SFX = {
  roomOpen: "law_room_open", roomClose: "law_room_close",
  // สังเคราะห์ (.claude/plans/law-sfx.py) — จุดปะทะอยู่ต้นไฟล์ (atk = 100 ms)
  atk: "law_atk", cut: "law_cut", shuffle: "law_shuffle", takt: "law_takt", throw: "law_throw", throwHit: "law_throw_hit",
  shamble: "law_shamble", squeeze: "law_squeeze", mark: "law_mark", rockDown: "law_rock_down",
};
// คลิปจากผู้ใช้ (2026-10-26 · เสียงอยู่ในคลิป): Room = ครั้งแรกต่อเกม แล้วเสียงเปิดตามหลังคลิป ·
//  Gamma Knife / Mess = ทุกครั้งที่ตีเสริมโดน (ก่อนฉากตี — preAttackClip) · Counter Shock = ทุกครั้ง แล้วค่อยฟื้น
const VIDEO = { room: `${DIR}/law_room.mp4`, gamma: `${DIR}/law_gamma.mp4`, mess: `${DIR}/law_mess.mp4`, shock: `${DIR}/law_shock.mp4` };
const CUT = { room: "lawRoom", gamma: "lawGamma", mess: "lawMess", shock: "lawShock" }; // characters/_transforms.js
// เสียงพากย์ (ผู้ใช้ส่ง 2026-10-26 — Law Sound Effects Pack OPPW4 ตัดเป็นประโยค · client/src/audio.js law_v_*)
//  ชื่อท่าดังตอนท่านั้นออกผล (ท่าที่มีคลิป = เสียงในคลิปแทน) · เริ่มตาเดิน / ตีปกติ / โดนตี สุ่มจากหลายไฟล์ (server/voice.js)
const VOICE = {
  room: "law_v_room", shambles: "law_v_shambles", takt: "law_v_takt",
  turn: ["law_v_turn1", "law_v_turn2", "law_v_turn3"],         // すぐに終わる · 俺に命令するな · 刻まれたいか
  strike: ["law_v_atk1", "law_v_atk2", "law_v_atk3", "law_v_atk4"], // ふんっ · ハンッ · 刻んでやる · 楽にしてやる
  struck: ["law_v_hit1", "law_v_hit2"],                       // ガッ · ガーッ
};
function say(engine, p, key) {
  const k = Array.isArray(key) ? key[Math.floor(Math.random() * key.length)] : key;
  if (k) engine.sfx(k, null, { voice: p.id });
}

const HP = 7;
const ARMOR = 3;
const ROOMS = { 5: { size: 5, cd: 1 }, 9: { size: 9, cd: 3 } };
const STRIKES = 3;        // ตีปกติ (รวมตัดพื้น) ต่อเทิร์นใน Room
const MAX_OBJECTS = 4;
const SEC_PER_TURN = 2;   // สกิลรองต่อเทิร์น (นับแยกจากโควตา)
const SHOCKS = 3;         // Counter Shock ต่อเกม
const ROOM_REGEN = 2;     // จบเทิร์นใน Room (ปกติ 1)
const FAR = 30;           // ระยะตี/ระยะเลือกช่องที่คลุมทั้งกระดาน (ขอบเขตจริง = Room)
const TAKT_DMG = 1;
const THROW_DMG = 1;
const SQUEEZE_DMG = 2;
const HEART_USES = 3;
const GAMMA = { burn: 2, bleed: 2, poison: 2 };
const ULT_CD = 3;
const THROW_CD = 3;       // โยนสิ่งของ: คูลดาวน์หลังโยน (ผู้ใช้สั่ง 2026-10-27)
const SEC = {
  shuffle: { name: "Shambles", cost: 2, img: IMG.surgeon, desc: "เลือก 2 อย่างจากตัวเอง คนที่มาร์กไว้ และวัตถุลอยใน Room แล้วสลับที่กัน (ตัวใหญ่ต้องอยู่ใน Room ทั้งตัว)" },
  takt: { name: "Takt", cost: 1, img: IMG.surgeon, desc: `เลือกช่องใน Room: หนามหินพุ่งขึ้น ศัตรูบนช่องเสียหาย ${TAKT_DMG} (เกราะรับก่อน) และถูกผลักออก 1 ช่อง · หนามขวางทาง 1 เทิร์น` },
  throw: { name: "โยนสิ่งของ", cost: 2, img: IMG.surgeon, desc: `เลือกช่องใน Room: วัตถุลอยทั้งหมดพุ่งลงช่องนั้น ความเสียหาย ${THROW_DMG} ต่อก้อน (เกราะรับก่อน) · คูลดาวน์ ${THROW_CD} เทิร์น` },
  shamble: { name: "Shamble", cost: 3, img: IMG.surgeon, desc: "เลือก 2 คนจากตัวเองและคนที่มาร์กไว้ใน Room แล้วสลับพลังชีวิตและเกราะปัจจุบันกัน" },
};
const SEC_KEYS = Object.keys(SEC);
const ULT = {
  gamma: { name: "Gamma Knife", cost: 4, img: IMG.ult, desc: `ตีปกติครั้งถัดไปในตาเดินนี้ (ประชิด): ลุกไหม้ เลือดไหล พิษร้าย อย่างละ ${GAMMA.burn} เทิร์น สุ่ม 1 อย่างเป็น ${GAMMA.burn + 1} เทิร์น (คูลดาวน์ ${ULT_CD} เทิร์น)` },
  mess: { name: "Mess", cost: 4, img: IMG.mess, desc: `ตีปกติครั้งถัดไปในตาเดินนี้ (ประชิด): ดึงหัวใจเป้าเข้ากระเป๋า · ใช้หัวใจ = ความเสียหาย ${SQUEEZE_DMG} ไม่ว่าอยู่ไกลแค่ไหน ${HEART_USES} ครั้ง (คูลดาวน์ ${ULT_CD} เทิร์น)` },
};
const ULT_KEYS = Object.keys(ULT);
// จังหวะพักให้กระดานเล่นเอฟเฟกต์ (ต้องไม่สั้นกว่า LAW_FX ใน client/src/board/lawFx.js)
const BEAT = {
  roomOpen: 1.0, roomClose: 0.6, cut: 0.7, shuffle: 0.55, taktRise: 0.45, taktPush: 0.5,
  throwFly: 0.8, throwHit: 0.4, shamble: 1.1, shambleDone: 0.4, ultArm: 0.6, ultHit: 1.0, squeeze: 0.6, shock: 0.6, revived: 0.5,
};

const isLaw = (p) => !!p && p.characterId === ID && !p.summon;
// ฮุคที่ไม่ได้รับ engine อ่านเลขเทิร์นจาก engine กลาง (require ตอนเรียก — กันวน)
function eng() { return require("../server/engine").engine; }
function fresh() {
  return {
    room: null, roomReady: 0, roomSeq: 0,        // { size, x0, y0, x1, y1, cx, cy, seq, at } · เทิร์นที่เปิดได้อีก
    objects: [], objSeq: 0, objAt: 0,            // วัตถุลอย [{ id, x, y, seq }]
    strikeRound: 0, strikes: 0,                  // ตีไปกี่ครั้งในเทิร์น strikeRound
    marks: [],                                   // id ที่ตีโดนในตาเดินนี้
    secRound: 0, secUsed: 0, throwReady: 0,     // throwReady = เทิร์นที่โยนสิ่งของได้อีก
    gammaReady: 0, messReady: 0, armed: null,    // ท่าไม้ตายที่รอตี { kind, round, at }
    shocks: SHOCKS,
    rocks: [],                                   // หนามหิน [{ k, round, at }]
  };
}
function st(p) { return p.law || (p.law = fresh()); }
const cdLeft = (ready, r) => Math.max(0, (ready || 0) - r);
const K = (x, y) => `${x},${y}`;
const vit = (t) => (t.hp || 0) + (t.armor || 0) + (t.shield || 0) + (t.tempHp || 0);
const guardOf = (engine, t) => ((t.statuses && t.statuses.guard) || 0) > 0 ? (engine.statusAmtOf(t, "guard") || 1) : 0;

// ---------- Room ----------
const inRect = (r, x, y) => !!r && x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
function footOf(engine, u) { return u && u.pos ? Board.footprint(u.pos.x, u.pos.y, engine.sizeOf(u)) : []; }
// ทั้งตัวอยู่ใน Room (whole) / บางช่อง
function unitIn(engine, room, u, whole) {
  const f = footOf(engine, u);
  if (!room || !f.length) return false;
  return whole ? f.every((t) => inRect(room, t.x, t.y)) : f.some((t) => inRect(room, t.x, t.y));
}
function lawIn(engine, p) { return isLaw(p) && p.alive && unitIn(engine, st(p).room, p, true); }
function roomTiles(room) {
  const out = [];
  if (!room) return out;
  for (let y = room.y0; y <= room.y1; y++) for (let x = room.x0; x <= room.x1; x++) out.push({ x, y });
  return out;
}
const roomPub = (r) => (r ? { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, size: r.size, cx: r.cx, cy: r.cy, seq: r.seq } : null);
function fx(engine, p, kind, extra) {
  engine.boardFx(FX, { kind, id: p.id, color: engine.colorOf(p), ...(p.pos ? { at: { ...p.pos } } : {}), size: engine.sizeOf(p), ...extra });
}
function openRoom(engine, p, size) {
  const s = st(p), map = engine.boardMap(), n = engine.sizeOf(p), half = (size - 1) / 2;
  const cx = p.pos.x + Math.floor((n - 1) / 2), cy = p.pos.y + Math.floor((n - 1) / 2);
  s.room = {
    size, cx, cy, seq: ++s.roomSeq, at: engine.severStamp(),
    x0: Math.max(0, cx - half), y0: Math.max(0, cy - half), x1: Math.min(map.cols - 1, cx + half), y1: Math.min(map.rows - 1, cy + half),
  };
  engine.log(`🔵 ${p.name} ROOM — กาง Room ${size}×${size}`);
  // ครั้งแรกต่อเกม = คลิป (เสียงอยู่ในคลิป) แล้วค่อยเล่นภาพกาง Room · ครั้งต่อไป = เสียงเปิด
  const room = roomPub(s.room);
  if (VIDEO.room && !(p.cutsceneShown && p.cutsceneShown[CUT.room])) {
    (p.cutsceneShown ||= {})[CUT.room] = true;
    engine.queueCutscene(p, CUT.room);
    engine.deferAfterCutscene(() => {
      fx(engine, p, "roomOpen", { room });
      engine.sfx(SFX.roomOpen); // ผู้ใช้สั่ง: เสียงเปิดตามหลังคลิป
      engine.skillBeat(BEAT.roomOpen, () => {});
    });
    return;
  }
  fx(engine, p, "roomOpen", { room });
  engine.sfx(SFX.roomOpen);
  say(engine, p, VOICE.room);
  engine.skillBeat(BEAT.roomOpen, () => {});
}
// ปิด Room: วัตถุลอยหายด้วย · cd = เข้าคูลดาวน์ (เปลี่ยนภูมิภาค = ไม่มี)
function closeRoom(engine, p, why, cd = true) {
  const s = st(p);
  if (!s.room) return;
  const room = s.room;
  const objects = s.objects.map((o) => ({ id: o.id, x: o.x, y: o.y }));
  s.room = null;
  s.objects = [];
  s.roomReady = cd ? engine.roundNumber + 1 + ROOMS[room.size].cd : 0;
  if (why !== "region") { fx(engine, p, "roomClose", { room: roomPub(room), objects, why }); engine.sfx(SFX.roomClose); }
  engine.log(`🔵 ${p.name} — Room ปิด${cd ? ` (เปิดได้อีกใน ${ROOMS[room.size].cd + 1} เทิร์น)` : ""}`);
}

// ---------- ตาเดินนี้ ----------
function strikesUsed(engine, p) { const s = st(p); return s.strikeRound === engine.roundNumber ? s.strikes : 0; }
function strikesLeft(engine, p) { return Math.max(0, STRIKES - strikesUsed(engine, p)); }
function useStrike(engine, p) {
  const s = st(p);
  if (s.strikeRound !== engine.roundNumber) { s.strikeRound = engine.roundNumber; s.strikes = 0; }
  s.strikes += 1;
}
function secUsed(engine, p) { const s = st(p); return s.secRound === engine.roundNumber ? s.secUsed : 0; }
function armedOf(engine, p) { const a = st(p).armed; return a && a.round === engine.roundNumber ? a : null; }
const marked = (p, id) => st(p).marks.includes(id);
function unitAtTile(engine, tile) {
  const u = Board.unitAt(engine.boardUnits(), tile.x, tile.y);
  return u ? engine.players[u.id] : null;
}
const objAt = (s, x, y) => s.objects.find((o) => o.x === x && o.y === y) || null;

// ---------- ดาเมจจากสกิล: คุ้มครองลด · เปราะบางเพิ่ม · เกราะก่อน · ตายได้ → ที่ลงจริง ----------
function hurt(engine, p, t, n, reason) {
  t.wasAttacked = true;
  const dmg = Math.max(0, n - guardOf(engine, t)) + engine.statusAmtOf(t, "fragile");
  const before = vit(t);
  engine.dealMixed(t, dmg);
  engine.resolveDamageAftermath(t);
  const dealt = Math.max(0, before - vit(t));
  engine.log(`🔪 ${p.name} ${reason} → ${t.name} -${dealt} (ลดเกราะก่อน)`);
  if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
  return dealt;
}
function awayDir(engine, from, t) {
  const n = engine.sizeOf(t);
  const cx = t.pos.x + (n - 1) / 2 - from.x, cy = t.pos.y + (n - 1) / 2 - from.y;
  if (Math.abs(cy) >= Math.abs(cx) && cy !== 0) return { x: 0, y: Math.sign(cy) };
  if (cx !== 0) return { x: Math.sign(cx), y: 0 };
  return { x: 0, y: 1 };
}

// ---------- ตัดพื้น (ปุ่ม HUD · นับเป็นการตี 1 ครั้ง) ----------
function cutTiles(engine, p) {
  const s = st(p);
  if (!lawIn(engine, p) || strikesLeft(engine, p) <= 0 || s.objects.length >= MAX_OBJECTS) return [];
  return roomTiles(s.room).filter((t) => engine.tileFree(t.x, t.y) && !objAt(s, t.x, t.y));
}
function cut(engine, p, tile) {
  if (!engine.canAct(p) || !tile || (engine.action && engine.action.noStrike)) return false;
  if (!cutTiles(engine, p).some((t) => t.x === tile.x && t.y === tile.y)) return false;
  const s = st(p);
  useStrike(engine, p);
  engine.action.locked = true;
  p.didAttackRound = true;
  const obj = { id: ++s.objSeq, x: tile.x, y: tile.y, seq: s.objSeq };
  s.objects.push(obj);
  if (s.objects.length === 1) s.objAt = engine.severStamp();
  fx(engine, p, "cut", { tile: { ...tile }, obj: { id: obj.id, x: obj.x, y: obj.y } });
  engine.sfx(SFX.cut);
  engine.log(`✂️ ${p.name} ตัดพื้น — วัตถุลอย ${s.objects.length}/${MAX_OBJECTS}`);
  engine.skillBeat(BEAT.cut, () => {});
  engine.pausePlayingForCutscene();
  return true;
}
// ทิ้งวัตถุลอยทีละก้อน (ปุ่ม HUD ครึ่งขวาของตัดพื้น): ฟรี · ไม่นับเป็นการตี · ไม่ล็อกการเดิน
function dropTiles(engine, p) {
  return isLaw(p) && p.alive ? st(p).objects.map((o) => ({ x: o.x, y: o.y })) : [];
}
function dropObject(engine, p, tile) {
  if (!engine.canAct(p) || !tile) return false;
  const s = st(p), o = objAt(s, tile.x, tile.y);
  if (!o) return false;
  s.objects = s.objects.filter((x) => x !== o);
  fx(engine, p, "roomClose", { room: null, objects: [{ id: o.id, x: o.x, y: o.y }], why: "drop" });
  engine.sfx(SFX.rockDown);
  engine.log(`🪨 ${p.name} ทิ้งวัตถุลอย — เหลือ ${s.objects.length}/${MAX_OBJECTS}`);
  engine.broadcastState();
  return true;
}

// ---------- Counter Shock (ปุ่ม HUD · 0 แต้ม · 3 ครั้งต่อเกม) ----------
function shockTargets(engine, p) {
  if (!isLaw(p) || !p.alive || !p.pos || st(p).shocks <= 0) return [];
  const box = { x: p.pos.x, y: p.pos.y, size: engine.sizeOf(p) };
  return Object.values(engine.players).filter((d) => !d.alive && !d.summon && d.corpse && engine.corpseKept(d)
    && Board.dist(box, { x: d.corpse.x, y: d.corpse.y, size: 1 }) === 1);
}
function revive(engine, p, d) {
  const spot = { ...d.corpse };
  d.corpse = null; // ไม่นับร่างตัวเองตอนหาที่
  const to = engine.tileFree(spot.x, spot.y, d.id) ? spot : engine.nearFreeTile(spot, d.id);
  if (!to) { d.corpse = spot; return false; }
  d.alive = true;
  d.result = null;
  d.hp = 1;
  d.armor = 0;
  d.shield = 0;
  d.tempHp = 0; d.tempHpTurns = 0;
  d.mountId = null;
  d.wasAttacked = false;
  d.corpseKeeper = null;
  d.statuses = {};
  d.statusAmt = {};
  d.pos = { x: to.x, y: to.y };
  engine.joinOrder(d.id); // ได้เดินเทิร์นนี้ (แบบคำอวยพรสุดท้ายของยูนะ)
  engine.log(`⚡ ${p.name} Counter Shock — ${d.name} ฟื้นคืนชีพ (พลังชีวิต 1)`);
  return true;
}
function counterShock(engine, p, tile) {
  if (!engine.canAct(p) || !tile) return false;
  const d = shockTargets(engine, p).find((c) => c.corpse.x === tile.x && c.corpse.y === tile.y);
  if (!d) return false;
  const s = st(p);
  s.shocks -= 1;
  engine.action.locked = true;
  engine.log(`⚡ ${p.name} Counter Shock → ศพของ ${d.name} (เหลือ ${s.shocks} ครั้ง)`);
  // คลิปทุกครั้ง (เสียงในคลิป) → ภาพช็อตบนกระดาน → ฟื้น
  engine.queueCutscene(p, CUT.shock);
  engine.deferAfterCutscene(() => {
    if (!d.corpse || d.alive) return;
    fx(engine, p, "shock", { targetId: d.id, to: { ...d.corpse } });
    engine.skillBeat(BEAT.shock, () => {
      if (!d.corpse || d.alive) return;
      if (revive(engine, p, d)) {
        fx(engine, p, "revived", { targetId: d.id, to: { ...d.pos } });
        engine.skillBeat(BEAT.revived, () => {});
      }
    });
  });
  engine.pausePlayingForCutscene();
  return true;
}

// ---------- สกิลรอง: ตัวที่เลือกได้ ----------
// Shambles: ตัวเอง / คนที่มาร์ก (ตัวใหญ่ = อยู่ใน Room ทั้งตัว) / วัตถุลอยที่ไม่มีใครยืนทับ · Shamble: ตัวเอง / คนที่มาร์ก (ไม่ใช่ยูนิตที่ถูกเรียก/คนใส่ Mark 42)
function unitPickable(engine, p, u, kind) {
  if (!u || !u.alive || !u.pos) return false;
  if (u.id !== p.id && !marked(p, u.id)) return false;
  if (kind === "shamble" && (u.summon || u.mark42)) return false;
  return unitIn(engine, st(p).room, u, true); // ตัวใหญ่ต้องอยู่ใน Room ทั้งตัว (ผู้ใช้ตัดสิน 2026-10-26)
}
function pickTiles(engine, p, kind) {
  const s = st(p), out = [];
  if (!lawIn(engine, p)) return out;
  for (const u of Object.values(engine.players)) {
    if (!unitPickable(engine, p, u, kind)) continue;
    for (const t of footOf(engine, u)) if (inRect(s.room, t.x, t.y)) out.push({ x: t.x, y: t.y });
  }
  if (kind === "shuffle") for (const o of s.objects) if (!unitAtTile(engine, o)) out.push({ x: o.x, y: o.y });
  return out;
}
// ช่องที่เลือก → { kind: "unit", u } | { kind: "obj", o } | null
function entityAt(engine, p, tile, kind) {
  if (!tile) return null;
  const u = unitAtTile(engine, tile);
  if (u) return unitPickable(engine, p, u, kind) ? { kind: "unit", u } : null;
  const o = kind === "shuffle" ? objAt(st(p), tile.x, tile.y) : null;
  return o ? { kind: "obj", o } : null;
}
function pairOf(engine, p, tiles, kind) {
  if (!Array.isArray(tiles) || tiles.length < 2) return null;
  const a = entityAt(engine, p, tiles[0], kind), b = entityAt(engine, p, tiles[1], kind);
  if (!a || !b) return null;
  const same = a.kind === b.kind && (a.kind === "unit" ? a.u.id === b.u.id : a.o.id === b.o.id);
  return same ? null : [a, b];
}
const centerOf = (engine, e) => {
  if (e.kind === "obj") return { x: e.o.x, y: e.o.y };
  const n = engine.sizeOf(e.u);
  return { x: e.u.pos.x + Math.floor((n - 1) / 2), y: e.u.pos.y + Math.floor((n - 1) / 2) };
};
// แผนสลับที่: แต่ละอย่างไปลงกลางตัวของอีกอย่าง · ตัวใหญ่ = ทั้งตัวต้องลงใน Room บนช่องว่าง · วัตถุกับวัตถุไม่ได้
function swapPlan(engine, p, a, b) {
  if (a.kind === "obj" && b.kind === "obj") return null;
  const room = st(p).room, map = engine.boardMap(), blocked = engine.boardBlocked();
  const skip = [a, b].filter((e) => e.kind === "unit").map((e) => e.u.id);
  const others = engine.boardUnits().filter((u) => !skip.includes(u.id));
  const ca = centerOf(engine, a), cb = centerOf(engine, b);
  const moves = [];
  for (const [e, c] of [[a, cb], [b, ca]]) {
    if (e.kind === "obj") {
      if (!inRect(room, c.x, c.y)) return null;
      moves.push({ e, to: { x: c.x, y: c.y }, size: 1 });
      continue;
    }
    const n = engine.sizeOf(e.u);
    const to = { x: c.x - Math.floor((n - 1) / 2), y: c.y - Math.floor((n - 1) / 2) };
    const foot = Board.footprint(to.x, to.y, n);
    if (foot.some((t) => !inRect(room, t.x, t.y) || !Board.inBounds(map, t.x, t.y) || Board.isObstacle(map, t.x, t.y, blocked) || Board.unitAt(others, t.x, t.y))) return null;
    moves.push({ e, to, size: n });
  }
  // สองตัวลงทับกันเอง (ตัวใหญ่สลับกับคนที่ยืนติดกัน) = ไม่ได้
  const units = moves.filter((m) => m.e.kind === "unit");
  if (units.length === 2) {
    const k = new Set(Board.footprint(units[0].to.x, units[0].to.y, units[0].size).map((t) => K(t.x, t.y)));
    if (Board.footprint(units[1].to.x, units[1].to.y, units[1].size).some((t) => k.has(K(t.x, t.y)))) return null;
  }
  return moves;
}
const entPub = (engine, e, to) => (e.kind === "unit"
  ? { id: e.u.id, from: { ...e.u.pos }, to: { ...to }, size: engine.sizeOf(e.u) }
  : { id: `obj:${e.o.id}`, from: { x: e.o.x, y: e.o.y }, to: { ...to }, size: 1 });
function shuffle(engine, p, a, b) {
  const plan = swapPlan(engine, p, a, b);
  if (!plan) return;
  fx(engine, p, "shuffle", { a: entPub(engine, a, plan[0].to), b: entPub(engine, b, plan[1].to) });
  say(engine, p, VOICE.shambles);
  engine.skillBeat(BEAT.shuffle, () => {
    const again = swapPlan(engine, p, a, b); // ระหว่างพักไม่มีใครขยับ — กันกรณีตาย/ถูกย้ายไปแล้ว
    if (!again) return;
    const warps = [];
    for (const m of again) {
      if (m.e.kind === "obj") { m.e.o.x = m.to.x; m.e.o.y = m.to.y; continue; }
      engine.ice.revealPushed(m.e.u);
      m.e.u.pos = { x: m.to.x, y: m.to.y };
      warps.push({ id: m.e.u.id, to: { ...m.e.u.pos }, warp: true });
    }
    if (warps.length) engine.ice.forcedSlides(warps, p); // ฮุค onForcedMove (วาร์ป — ไม่มีทางที่ผ่าน)
    const name = (e) => (e.kind === "unit" ? e.u.name : "วัตถุลอย");
    engine.sfx(SFX.shuffle);
    engine.log(`🔁 ${p.name} Shambles — สลับที่ ${name(a)} ⇄ ${name(b)}`);
  });
}

// Takt: ช่องใน Room ที่ไม่ใช่สิ่งกีดขวาง/ร้าน/ศพ/วัตถุ/ช่องของลอว์
function taktTiles(engine, p) {
  const s = st(p);
  if (!lawIn(engine, p)) return [];
  const map = engine.boardMap(), blocked = engine.boardBlocked();
  return roomTiles(s.room).filter((t) => !Board.isObstacle(map, t.x, t.y, blocked) && !objAt(s, t.x, t.y)
    && !footOf(engine, p).some((f) => f.x === t.x && f.y === t.y));
}
function takt(engine, p, tile) {
  const s = st(p);
  const u = unitAtTile(engine, tile);
  fx(engine, p, "takt", { tile: { ...tile }, hitId: u ? u.id : null });
  say(engine, p, VOICE.takt);
  engine.skillBeat(BEAT.taktRise, () => {
    engine.sfx(SFX.takt); // หินพุ่งตอนจบจังหวะยกนิ้ว
    let hold = 0;
    if (u && u.alive && u.pos) {
      const foe = u.id !== p.id && !engine.sameTeam(p, u);
      let dodge = false;
      if (foe) {
        u.wasAttacked = true;
        dodge = engine.skillDodge(p, u, "Takt");
        if (!dodge) hurt(engine, p, u, TAKT_DMG, "Takt");
      }
      if (!dodge && u.alive && u.pos && p.pos) {
        const ctx = engine.ice.begin();
        engine.withEffectSource(p, () => engine.ice.pushUnit(u, awayDir(engine, p.pos, u), ctx, 1));
        engine.ice.flush(ctx);
        hold = engine.ice.fxSeconds(ctx);
      }
    }
    // หนามขึ้นเมื่อช่องว่างแล้ว (ผลักไม่ออก/หลบ = ไม่มีหนาม)
    if (engine.tileFree(tile.x, tile.y) && engine.ice.placeWall(tile.x, tile.y, p.id, "lawRock")) {
      s.rocks.push({ k: K(tile.x, tile.y), round: engine.roundNumber, at: engine.severStamp() });
      engine.log(`🪨 ${p.name} Takt — หนามหินพุ่งขึ้น`);
    }
    engine.skillBeat(Math.max(BEAT.taktPush, hold), () => {});
  });
}
function dropRocks(engine, p, keep) {
  const s = st(p), gone = [];
  s.rocks = s.rocks.filter((r) => {
    if (keep && keep(r)) return true;
    if (engine.ice.removeWall(r.k)) { const [x, y] = r.k.split(",").map(Number); gone.push({ x, y }); }
    return false;
  });
  if (gone.length) { fx(engine, p, "rockDown", { tiles: gone, why: "time" }); engine.sfx(SFX.rockDown); }
}

// โยนสิ่งของ: วัตถุทั้งหมดพุ่งลงช่อง · ศัตรูบนช่องเสียหาย 1 ต่อก้อน (ทอยหลบครั้งเดียว)
function throwAll(engine, p, tile) {
  const s = st(p);
  const objects = s.objects.map((o) => ({ id: o.id, x: o.x, y: o.y }));
  s.objects = [];
  fx(engine, p, "throw", { to: { ...tile }, objects });
  engine.sfx(SFX.throw);
  say(engine, p, VOICE.strike);
  engine.skillBeat(BEAT.throwFly, () => {
    const hits = [];
    const u = unitAtTile(engine, tile);
    if (u && u.alive && u.id !== p.id && !engine.sameTeam(p, u)) {
      u.wasAttacked = true;
      const dodge = engine.skillDodge(p, u, SEC.throw.name);
      const dmg = dodge ? 0 : hurt(engine, p, u, THROW_DMG * objects.length, SEC.throw.name);
      hits.push({ id: u.id, dmg, dodge, kill: !u.alive });
    }
    engine.log(`🪨 ${p.name} โยนสิ่งของ ${objects.length} ก้อน`);
    fx(engine, p, "throwHit", { to: { ...tile }, hits, n: objects.length });
    engine.sfx(SFX.throwHit);
    engine.skillBeat(BEAT.throwHit, () => {});
  });
}

// Shamble: สลับพลังชีวิต/เกราะปัจจุบัน (ตัดส่วนเกินเพดานของผู้รับ)
const vitals = (engine, u) => ({ id: u.id, at: { ...u.pos }, size: engine.sizeOf(u), hp: u.hp, armor: u.armor });
function shamble(engine, p, a, b) {
  fx(engine, p, "shamble", { a: vitals(engine, a), b: vitals(engine, b) });
  engine.sfx(SFX.shamble);
  say(engine, p, VOICE.shambles);
  engine.skillBeat(BEAT.shamble, () => {
    if (!a.alive || !b.alive || !a.pos || !b.pos) return;
    const ha = a.hp, aa = a.armor, hb = b.hp, ab = b.armor;
    a.hp = Math.max(1, Math.min(engine.maxHpOf(a), hb));
    a.armor = Math.max(0, Math.min(engine.maxArmorOf(a), ab));
    b.hp = Math.max(1, Math.min(engine.maxHpOf(b), ha));
    b.armor = Math.max(0, Math.min(engine.maxArmorOf(b), aa));
    if (a.id !== p.id && !engine.sameTeam(p, a)) a.wasAttacked = true;
    if (b.id !== p.id && !engine.sameTeam(p, b)) b.wasAttacked = true;
    engine.log(`💠 ${p.name} Shamble — ${a.name} ${ha}/${aa} → ${a.hp}/${a.armor} · ${b.name} ${hb}/${ab} → ${b.hp}/${b.armor}`);
    fx(engine, p, "shambleDone", { a: vitals(engine, a), b: vitals(engine, b) });
    engine.skillBeat(BEAT.shambleDone, () => {});
  });
}

// ---------- หัวใจ (Mess) — ไอเทมในกระเป๋า ----------
const heartsOf = (p) => (p.inventory || []).filter((it) => it.type === "lawHeart");
function holdsHeart(engine, victimId) {
  return Object.values(engine.players).some((o) => isLaw(o) && heartsOf(o).some((h) => h.targetId === victimId));
}
function removeHeart(engine, p, item, why) {
  const i = (p.inventory || []).indexOf(item);
  if (i >= 0) p.inventory.splice(i, 1);
  const t = engine.players[item.targetId];
  fx(engine, p, "heartGone", { targetId: item.targetId, why, ...(t && t.pos ? { to: { ...t.pos } } : {}) });
}
function takeHeart(engine, p, t) {
  if (t.summon) return "Mess — ไม่มีหัวใจ";
  if (holdsHeart(engine, t.id)) return "Mess — หัวใจถูกดึงไปแล้ว";
  if (engine.bagFull(p)) return "Mess — กระเป๋าเต็ม";
  p.inventory = p.inventory || [];
  p.inventory.push({
    uid: `lawheart_${t.id}_${engine.roundNumber}_${Date.now()}`, type: "lawHeart", price: 0,
    targetId: t.id, targetName: t.name, uses: HEART_USES, squeezedRound: 0, ready: true, at: engine.severStamp(),
  });
  st(p).afterFx = { kind: "mess", targetId: t.id }; // ภาพหัวใจลอยหลังคลิป/ฉากตี (afterBoardAttack)
  engine.log(`🫀 ${p.name} Mess — ดึงหัวใจของ ${t.name} เข้ากระเป๋า`);
  return "Mess — ได้หัวใจ";
}

// ---------- Gamma Knife ----------
function gammaKnife(engine, p, t) {
  const extra = ["burn", "bleed", "poison"][Math.floor(Math.random() * 3)];
  const n = (k) => GAMMA[k] + (extra === k ? 1 : 0);
  const applied = [];
  if (engine.applyBurn(t, n("burn")) > 0) applied.push("burn");
  if (engine.applyBleed(t, n("bleed")) > 0) applied.push("bleed");
  // พิษร้ายเก็บเป็นเทิร์น (ลดตอนจบเทิร์นก่อนออกฤทธิ์ต้นเทิร์นถัดไป) — +1 ให้ออกฤทธิ์ครบตามจำนวน (แบบหนามพิษ GRID_PLAN §3.1)
  if (engine.applyPoison(t, n("poison") + 1)) applied.push("poison");
  st(p).afterFx = { kind: "gamma", targetId: t.id, applied, extra }; // ภาพสถานะหลังคลิป/ฉากตี (afterBoardAttack)
  engine.log(`🟢 ${p.name} Gamma Knife → ${t.name}${applied.length ? ` (${applied.join(" · ")})` : " — ต้านได้ทั้งหมด"}`);
  const label = { burn: "ลุกไหม้", bleed: "เลือดไหล", poison: "พิษร้าย" };
  return applied.length ? applied.map((k) => `${label[k]} ${n(k)}`) : ["Gamma Knife — ต้านได้"];
}

// ---------- ป้ายปุ่ม ----------
function roomChoices(engine, p) {
  const s = st(p), r = engine.roundNumber;
  return Object.values(ROOMS).map((o) => ({
    key: String(o.size), name: `Room ${o.size}×${o.size}`, img: IMG.room, cost: 0, area: { kind: "self" }, free: true,
    locked: cdLeft(s.roomReady, r) > 0 || !p.pos, cd: cdLeft(s.roomReady, r),
    desc: `Room ${o.size}×${o.size}: กางรอบตัว อยู่กับที่จนกว่าจะปิด (คูลดาวน์ ${o.cd} เทิร์นหลังปิด)`,
  }));
}
function secArea(engine, p, k) {
  if (k === "shuffle" || k === "shamble") return { kind: "tile", place: "list", range: FAR, tiles: pickTiles(engine, p, k), foot: 1, count: 2 };
  if (k === "takt") return { kind: "tile", place: "list", range: FAR, tiles: taktTiles(engine, p), foot: 1, hostile: true };
  if (k === "throw") return { kind: "tile", place: "list", range: FAR, tiles: lawIn(engine, p) ? roomTiles(st(p).room) : [], foot: 1, hostile: true };
  return { kind: "self" };
}
function secBlock(engine, p, k) {
  const s = st(p);
  if (!SEC[k]) return "form";
  if (!lawIn(engine, p)) return "room";
  if (secUsed(engine, p) >= SEC_PER_TURN) return "uses";
  if (k === "throw" && cdLeft(s.throwReady, engine.roundNumber) > 0) return "cd";
  if (k === "throw" && !s.objects.length) return "objects";
  if ((k === "shuffle" || k === "shamble") && pickTiles(engine, p, k).length < 2) return "pick";
  return null;
}
function ultBlock(engine, p, k) {
  const s = st(p), r = engine.roundNumber;
  if (!ULT[k]) return "form";
  if (!lawIn(engine, p)) return "room";
  if (armedOf(engine, p)) return "armed";
  if (strikesLeft(engine, p) <= 0) return "strikes";
  if (cdLeft(k === "gamma" ? s.gammaReady : s.messReady, r) > 0) return "cd";
  if (k === "mess" && engine.bagFull(p)) return "bag";
  return null;
}

module.exports = {
  id: ID,
  IMG, FX, SFX, VIDEO, CUT, HP, ARMOR, ROOMS, STRIKES, MAX_OBJECTS, SEC_PER_TURN, SHOCKS, ROOM_REGEN, TAKT_DMG, THROW_DMG, SQUEEZE_DMG, HEART_USES, GAMMA, ULT_CD, THROW_CD,
  SEC, SEC_KEYS, ULT, ULT_KEYS, BEAT,
  isLaw, lawIn, swapPlan, pickTiles, cutTiles, taktTiles, shockTargets, dropTiles,

  resetCombat(p) { p.law = isLaw(p) ? fresh() : null; },
  maxHp() { return HP; },
  maxArmor() { return ARMOR; },
  skillRegen(p) { return lawIn(eng(), p) ? ROOM_REGEN : 1; },

  // ---------- ตีปกติ: เฉพาะใน Room · ระยะทั้ง Room · ท่าไม้ตายที่รอตี = ประชิด ----------
  range(p) {
    if (!isLaw(p)) return null;
    const engine = eng();
    if (!lawIn(engine, p) || strikesLeft(engine, p) <= 0) return [1, 0];
    return armedOf(engine, p) ? [1, 1] : [1, FAR];
  },
  strikeAllows(p, target) {
    if (!isLaw(p)) return true;
    const engine = eng();
    return lawIn(engine, p) && strikesLeft(engine, p) > 0 && unitIn(engine, st(p).room, target, false);
  },
  strikeZone(p) {
    if (!isLaw(p)) return null;
    const engine = eng();
    if (!lawIn(engine, p) || strikesLeft(engine, p) <= 0) return null;
    const r = st(p).room;
    return { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 };
  },
  fixedStrikeDamage(engine, attacker) { return isLaw(attacker) ? 0 : null; }, // พลังโจมตี 0 เสมอ (ไม่รับบัฟ · ไม่คริ)
  attackStyle(p) {
    if (!isLaw(p)) return null;
    const a = armedOf(eng(), p);
    return a ? (a.kind === "gamma" ? "lawGamma" : "lawMess") : "lawSlash";
  },
  attackSound(p) { return isLaw(p) ? SFX.atk : undefined; }, // ฟัน Kikoku (จุดปะทะ 100 ms)
  // ตีเสริมท่าไม้ตายที่ไม่หลบ = คลิป Gamma Knife / Mess ก่อนฉากตี (ทุกครั้ง)
  preAttackClip(engine, attacker, card) {
    if (!isLaw(attacker) || !card || card.dodge) return null;
    const a = armedOf(engine, attacker);
    return a ? CUT[a.kind] : null;
  },
  // เสียงพากย์: เริ่มตาเดิน / ตีปกติ (ตีเสริมท่าไม้ตาย = เสียงในคลิปแทน) / โดนตี
  voiceLines(p) {
    if (!isLaw(p)) return null;
    return { turn: VOICE.turn, strike: armedOf(eng(), p) ? [] : VOICE.strike, struck: VOICE.struck };
  },
  attackFxNames(attacker) {
    const a = isLaw(attacker) ? armedOf(eng(), attacker) : null;
    return a ? [ULT[a.kind].name] : [];
  },
  // ตีโดน = มาร์ก · ท่าไม้ตายที่รอตีลงผล
  onStrikeLanded(engine, attacker, target) {
    if (!isLaw(attacker) || !target || !target.alive || engine.sameTeam(attacker, target)) return [];
    const s = st(attacker);
    if (!s.marks.includes(target.id)) s.marks.push(target.id);
    fx(engine, attacker, "mark", { targetId: target.id, to: target.pos ? { ...target.pos } : null });
    engine.sfx(SFX.mark);
    const a = armedOf(engine, attacker);
    if (!a) return [];
    if (a.kind === "gamma") return gammaKnife(engine, attacker, target);
    return [takeHeart(engine, attacker, target)];
  },
  // หลังฉากตี (คลิป Gamma Knife / Mess จบแล้ว): ภาพสถานะ / หัวใจลอยเข้าหาลอว์ แล้วพักให้ภาพจบ
  afterBoardAttack(engine, attacker) {
    if (!isLaw(attacker) || !st(attacker).afterFx) return null;
    return () => {
      const s = st(attacker), a = s.afterFx;
      s.afterFx = null;
      if (!a) return 0;
      const t = engine.players[a.targetId];
      fx(engine, attacker, a.kind, { ...a, to: t && t.pos ? { ...t.pos } : null });
      return BEAT.ultHit;
    };
  },
  // ตีจบทุกแบบ (หลบพ้นก็นับ): ใช้ครั้ง · ท่าไม้ตายที่รอตีหมด
  afterStrike(engine, p) {
    if (!isLaw(p)) return;
    useStrike(engine, p);
    st(p).armed = null;
  },
  extraStrike(engine, p) { return isLaw(p); }, // ตีแล้วไม่จบตา (จบด้วย "รอ" / หมดเวลา)
  onActorEnd(engine, p) {
    if (!isLaw(p)) return;
    const s = st(p);
    // มาร์กหาย = ร่างที่ถูกหั่นลอยแยกต่อกลับ (ผู้ใช้สั่ง 2026-10-26)
    const ids = s.marks.filter((id) => engine.players[id] && engine.players[id].alive);
    if (ids.length) fx(engine, p, "unmark", { ids });
    s.marks = [];
    s.armed = null;
  },
  // ต้นตาเดินของลอว์: หนามหินจากเทิร์นก่อนหาย · หัวใจบีบได้อีก
  onActorStart(engine, p) {
    if (!isLaw(p)) return;
    dropRocks(engine, p, (r) => r.round === engine.roundNumber);
  },
  onRoundStartTick(engine, p) {
    if (!isLaw(p)) return;
    for (const h of heartsOf(p)) h.ready = true;
  },
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) if (isLaw(p) && !p.alive && st(p).rocks.length) dropRocks(engine, p);
  },

  // ---------- ศพที่ตายใน Room (server/duo.js claimCorpse) ----------
  claimsCorpse(u, dead) {
    if (!isLaw(u) || !u.alive || !dead || !dead.pos) return false;
    const room = st(u).room;
    return !!room && inRect(room, dead.pos.x, dead.pos.y);
  },

  // ---------- ปุ่ม HUD: ตัดพื้น / Counter Shock ----------
  hudActions(engine, p) {
    if (!isLaw(p) || !p.alive) return undefined;
    const s = st(p), out = [];
    if (s.room) {
      const tiles = cutTiles(engine, p);
      out.push({ key: "cut", icon: "✂️", name: `ตัด ${s.objects.length}/${MAX_OBJECTS}`, tiles, disabled: !tiles.length, row: "cut" });
    }
    // ทิ้งวัตถุลอย: ครึ่งขวาของปุ่มตัด (row เดียวกัน) · วัตถุค้างนอก Room ได้ (ถูกตัดผลสกิล) จึงแสดงเมื่อมีวัตถุด้วย
    if (s.room || s.objects.length) {
      const drops = dropTiles(engine, p);
      out.push({ key: "drop", icon: "🪨", name: "ทิ้ง", tiles: drops, disabled: !drops.length, row: "cut" });
    }
    const corpses = shockTargets(engine, p);
    out.push({ key: "shock", icon: "⚡", name: `Counter Shock ×${s.shocks}`, tiles: corpses.map((d) => ({ x: d.corpse.x, y: d.corpse.y })), disabled: !corpses.length });
    return out;
  },
  charAction(engine, p, key, opts = {}) {
    if (!isLaw(p)) return false;
    if (key === "cut") return cut(engine, p, opts.tile);
    if (key === "shock") return counterShock(engine, p, opts.tile);
    if (key === "drop") return dropObject(engine, p, opts.tile);
    return false;
  },

  // ---------- หัวใจ: บีบ (shop.useInventoryItem) / ทิ้ง = คืนเจ้าของ ----------
  canUseCharItem(engine, p, item) {
    if (!isLaw(p) || item.type !== "lawHeart") return false;
    const t = engine.players[item.targetId];
    return !!t && t.alive && item.uses > 0 && item.squeezedRound !== engine.roundNumber;
  },
  useCharItem(engine, p, item) {
    const t = engine.players[item.targetId];
    item.squeezedRound = engine.roundNumber;
    item.ready = false;
    fx(engine, p, "squeeze", { targetId: t.id, to: t.pos ? { ...t.pos } : null, left: item.uses - 1 });
    engine.sfx(SFX.squeeze);
    engine.skillBeat(BEAT.squeeze, () => {
      if (!t.alive) return;
      t.wasAttacked = true;
      const at = t.pos ? { ...t.pos } : null;
      const dmg = hurt(engine, p, t, SQUEEZE_DMG, "บีบหัวใจ");
      item.uses -= 1;
      fx(engine, p, "squeezeHit", { targetId: t.id, to: at, dmg, kill: !t.alive });
      if (item.uses <= 0 && (p.inventory || []).includes(item)) {
        removeHeart(engine, p, item, "used");
        engine.log(`🫀 หัวใจของ ${t.name} กลับคืนเจ้าของ`);
      }
    });
    engine.pausePlayingForCutscene();
    return true;
  },
  onDropItem(engine, p, item) {
    if (!isLaw(p) || item.type !== "lawHeart") return;
    const t = engine.players[item.targetId];
    fx(engine, p, "heartGone", { targetId: item.targetId, why: "drop", ...(t && t.pos ? { to: { ...t.pos } } : {}) });
  },

  // ---------- สกิล ----------
  skillCost(p, tier, base, opts = {}) {
    if (!isLaw(p)) return base;
    if (tier === "basic") return 0;
    if (tier === "secondary") return SEC[opts.form] ? SEC[opts.form].cost : base;
    if (tier === "ultimate") return ULT[opts.form] ? ULT[opts.form].cost : base;
    return base;
  },
  skillArea(p, tier, area, opts = {}) {
    if (!isLaw(p) || tier !== "secondary") return area;
    return secArea(eng(), p, opts.form);
  },
  skillPub(p, tier) {
    if (!isLaw(p)) return null;
    const engine = eng(), s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      if (s.room) return { name: "ปิด Room", img: IMG.roomClose, desc: `ปิด Room · วัตถุลอยหายไป (คูลดาวน์ ${ROOMS[s.room.size].cd} เทิร์นหลังปิด)`, flash: true };
      return { choices: roomChoices(engine, p) };
    }
    if (tier === "secondary") {
      return {
        choices: SEC_KEYS.map((k) => ({
          key: k, name: SEC[k].name, img: SEC[k].img, cost: SEC[k].cost, area: secArea(engine, p, k), free: true,
          locked: !!secBlock(engine, p, k), ...(k === "throw" ? { cd: cdLeft(s.throwReady, r) } : {}), desc: `${SEC[k].name} (${SEC[k].cost} แต้ม): ${SEC[k].desc}`,
        })),
      };
    }
    if (tier === "ultimate") {
      return {
        choices: ULT_KEYS.map((k) => ({
          key: k, name: ULT[k].name, img: ULT[k].img, cost: ULT[k].cost, area: { kind: "self" },
          locked: !!ultBlock(engine, p, k), cd: cdLeft(k === "gamma" ? s.gammaReady : s.messReady, r),
          desc: `${ULT[k].name} (${ULT[k].cost} แต้ม): ${ULT[k].desc}`,
        })),
      };
    }
    return null;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isLaw(p)) return true;
    const s = st(p), r = engine.roundNumber;
    if (!p.pos) return false;
    if (tier === "basic") return !!s.room || (!!ROOMS[opts.form] && cdLeft(s.roomReady, r) <= 0);
    if (tier === "secondary") {
      const k = opts.form;
      if (secBlock(engine, p, k)) return false;
      if (k === "shuffle") { const pair = pairOf(engine, p, opts.tiles, k); return !!pair && !!swapPlan(engine, p, pair[0], pair[1]); }
      if (k === "shamble") return !!pairOf(engine, p, opts.tiles, k);
      if (k === "takt") return !!opts.tile && taktTiles(engine, p).some((t) => t.x === opts.tile.x && t.y === opts.tile.y);
      if (k === "throw") return !!opts.tile && inRect(s.room, opts.tile.x, opts.tile.y);
      return false;
    }
    if (tier === "ultimate") return !ultBlock(engine, p, opts.form);
    return false;
  },
  // Room / ศัลแพทย์: ไม่กินโควตา · Room กดแล้วยังเดินได้ · ท่าไม้ตาย: กินโควตา กดแล้วยังเดินเข้าประชิดได้
  skipsTurnQuota(p, tier) { return isLaw(p) && (tier === "basic" || tier === "secondary"); },
  ignoresTurnQuota(p, tier) { return isLaw(p) && (tier === "basic" || tier === "secondary"); },
  keepsMove(engine, p, tier) { return isLaw(p) && (tier === "basic" || tier === "ultimate"); },
  ownsAreaHit(p, tier) { return isLaw(p) && tier === "secondary"; }, // Takt / โยน = ช่องเดียว ลงผลเองตอนผลลง
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isLaw(p)) return "";
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      if (s.room) {
        closeRoom(engine, p, "skill");
        engine.skillBeat(BEAT.roomClose, () => {});
        return " — ปิด";
      }
      openRoom(engine, p, ROOMS[opts.form].size);
      return ` ${opts.form}×${opts.form}`;
    }
    if (tier === "secondary") {
      const k = opts.form;
      if (s.secRound !== r) { s.secRound = r; s.secUsed = 0; }
      s.secUsed += 1;
      if (k === "shuffle") { const [a, b] = pairOf(engine, p, opts.tiles, k); shuffle(engine, p, a, b); }
      else if (k === "shamble") { const [a, b] = pairOf(engine, p, opts.tiles, k); shamble(engine, p, a.u, b.u); }
      else if (k === "takt") takt(engine, p, { x: opts.tile.x, y: opts.tile.y });
      else if (k === "throw") { s.throwReady = r + 1 + THROW_CD; throwAll(engine, p, { x: opts.tile.x, y: opts.tile.y }); }
      return ` — ${SEC[k].name}`;
    }
    if (tier === "ultimate") {
      const k = opts.form;
      s.armed = { kind: k, round: r, at: engine.severStamp() };
      if (k === "gamma") s.gammaReady = r + 1 + ULT_CD;
      else s.messReady = r + 1 + ULT_CD;
      fx(engine, p, "ultArm", { ult: k });
      engine.log(`🔪 ${p.name} ${ULT[k].name} — ตีปกติครั้งถัดไปในตาเดินนี้ (ประชิด)`);
      engine.skillBeat(BEAT.ultArm, () => {});
      return ` — ${ULT[k].name}`;
    }
    return "";
  },

  // ---------- จังหวะเกม ----------
  // แผนที่ใหม่ (เปลี่ยนภูมิภาค): Room ปิดไม่มีคูลดาวน์ · วัตถุ/หนาม/มาร์กหาย (ชั้นหนามล้างพร้อมกระดาน)
  onBoardPlaced(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isLaw(p)) continue;
      const s = st(p);
      if (s.room) closeRoom(engine, p, "region", false);
      s.roomReady = 0;
      s.objects = [];
      s.rocks = [];
      s.marks = [];
    }
  },
  onDeath(engine, dead) {
    // เจ้าของหัวใจตาย = หัวใจสลาย
    for (const o of Object.values(engine.players)) {
      if (!isLaw(o)) continue;
      for (const h of heartsOf(o)) if (h.targetId === dead.id || o === dead) removeHeart(engine, o, h, "dead");
    }
    if (!isLaw(dead)) return;
    const s = st(dead);
    if (s.room) closeRoom(engine, dead, "death", false);
    s.armed = null;
    s.marks = [];
    dropRocks(engine, dead);
  },

  // ---------- ผลสกิลที่ตัดได้ (server/sever.js — รากฐานจิตของเรียวกิ) ----------
  severables(engine, p) {
    if (!isLaw(p) || !p.alive) return [];
    const s = st(p), out = [];
    if (s.room) out.push({ key: "room", label: "Room", at: s.room.at, cancel: () => closeRoom(engine, p, "sever") });
    else if (s.objects.length) {
      out.push({ key: "objects", label: "วัตถุลอย", at: s.objAt, cancel: () => {
        fx(engine, p, "roomClose", { room: null, objects: s.objects.map((o) => ({ id: o.id, x: o.x, y: o.y })), why: "sever" });
        s.objects = [];
      } });
    }
    const a = armedOf(engine, p);
    if (a) out.push({ key: "armed", label: ULT[a.kind].name, at: a.at, cancel: () => { s.armed = null; } });
    for (const h of heartsOf(p)) out.push({ key: `heart:${h.targetId}`, label: `หัวใจของ ${h.targetName}`, at: h.at || 0, cancel: () => removeHeart(engine, p, h, "sever") });
    if (s.rocks.length) out.push({ key: "rocks", label: "Takt", at: Math.max(...s.rocks.map((r) => r.at || 0)), cancel: () => dropRocks(engine, p) });
    return out;
  },

  // ---------- ข้อมูลให้ client ----------
  lawState(engine, p) {
    if (!isLaw(p)) return undefined;
    const s = st(p), r = engine.roundNumber, a = armedOf(engine, p);
    return {
      inRoom: lawIn(engine, p), strikes: strikesUsed(engine, p), strikesMax: STRIKES, secUsed: secUsed(engine, p), secMax: SEC_PER_TURN,
      roomCd: s.room ? 0 : cdLeft(s.roomReady, r), throwCd: cdLeft(s.throwReady, r), gammaCd: cdLeft(s.gammaReady, r), messCd: cdLeft(s.messReady, r),
      armed: a ? a.kind : null, shocks: s.shocks, room: s.room ? { size: s.room.size, x0: s.room.x0, y0: s.room.y0, x1: s.room.x1, y1: s.room.y1 } : null,
    };
  },
  boardPublic(engine) {
    const rooms = [], objects = [], marks = [], hearts = [];
    for (const p of Object.values(engine.players)) {
      if (!isLaw(p) || !p.law) continue;
      const s = p.law, color = engine.colorOf(p);
      if (s.room) rooms.push({ owner: p.id, color, ...roomPub(s.room) });
      for (const o of s.objects) objects.push({ owner: p.id, id: o.id, x: o.x, y: o.y, seq: o.seq });
      if (engine.actorId === p.id) for (const id of s.marks) marks.push({ owner: p.id, id });
      for (const h of heartsOf(p)) hearts.push({ owner: p.id, victim: h.targetId, left: h.uses });
    }
    if (!rooms.length && !objects.length && !marks.length && !hearts.length) return {};
    return { law: { rooms, objects, marks, hearts } };
  },
  skillLocks(engine, p) {
    if (!isLaw(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      basic: { locked: !s.room && (cdLeft(s.roomReady, r) > 0 || !p.pos), free: true },
      secondary: { locked: SEC_KEYS.every((k) => secBlock(engine, p, k)), free: true },
      ultimate: { locked: ULT_KEYS.every((k) => ultBlock(engine, p, k)) },
    };
  },
};
