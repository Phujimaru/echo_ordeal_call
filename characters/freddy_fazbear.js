// ============================================================
//  เฟรดดี้ ฟาซแบร์ (Five Nights at Freddy's) — หมวดเอาฮา · id "freddy_fazbear"
//
//  ไม่มีสกิลเลย (basic/secondary/ultimate = null) · ค่าพื้นฐาน HP 7 / เกราะ 3 (สเปกไม่ระบุ) · ตีประชิด [1, 1]
//  สกิลติดตัว ปี 1987:
//    กลางวัน: ล่องหนตลอด (ไม่หลุดเมื่อตี) · ระยะเดิน 4 · พลังโจมตี 4 · ไม่มีอะไรแตะได้ (untouchable — ผู้ใช้สั่ง 2026-11-11
//      "ตอนเช้าจะทำอะไรมันไม่ได้เลย นอกจากสู้มินิเกมให้ชนะ") · เข้าใกล้ = เพลงดังให้ทุกคนที่อยู่ใกล้ได้ยิน (ระยะ NEAR · per-viewer ใน view.js)
//      ตีปกติ (ประชิด) → ทอยหลบก่อน (engine.skillDodge) — หลบพ้น = ไม่ขึ้นฉากประตู วาปออกเลย
//      ไม่พ้น → มินิเกมประตู 10 วิ (ฮุค interceptStrike): เป้าเลือกประตูที่จะปิด · ประตูที่เฟรดดี้เข้า = สุ่ม (เฟรดดี้รอดูผล)
//        ปิดผิด = จอดำ → คลิปจัมป์สแกร์ → ตีลง (ผ่านด่านหลบมาแล้ว — match.strikeSure) → วาปออก ~5 ช่อง
//        ปิดถูก = เฟรดดี้เสียหาย 3 (เกราะรับก่อน) + วาปไปที่ใหม่ ~5 ช่อง
//    ปุ่ม HUD: ขู่ 1 / ขู่ 2 (เสียงขู่ — กดได้ตลอด) · กล่องดนตรี (เฉพาะกลางคืน) — แค่เสียง ปุ่มละครั้งต่อเทิร์น
//    กลางคืน: ตีปกติทุกครั้งมีคลิปจัมป์สแกร์กลางคืนก่อนฉากตี · เดินมีเสียงฝีเท้า
//    กลางคืน: เผยตัว · ระยะเดิน 9 · พลังโจมตี 3 · ตีปกติแล้วเดินต่อได้อีก 3 ช่อง (cantoMov)
//    สังหารผู้เล่น: ฟื้นพลังชีวิต 2
//    โหมด PVE (สนาม Eos / Moon Cell — ผู้ใช้สั่ง 2026-11-11): ร่างกลางคืนตลอด · พลังโจมตี 6 · คริ 50%
//
//  การตัดสินของ Claude (ผู้ใช้ไม่ได้ระบุ):
//    ไม่เลือกประตูภายในเวลา: เป้า = ไม่ได้ปิด (โดนตี) · เฟรดดี้ = สุ่มประตู · ยูนิตที่ถูกเรียก/หลุดเน็ต = สุ่มให้ทันที
//    ระยะได้ยินเพลง NEAR = 3 ช่อง · วาปไปช่องว่างระยะ 3–5 จากที่เดิม (ไม่มี = ช่องว่างใกล้สุดในระยะ 5)
//  สื่อ: ผู้ใช้ส่งมา (Downloads/freddy — 2026-11-11) · ตัวบนกระดาน = ภาพตัดพื้นหลัง (แบบรถของออพติมัส — freddyFx.js)
// ============================================================

const Board = require("../server/board");

const ID = "freddy_fazbear";
const DIR = "/characters/freddy_fazbear";
const IMG = { card: `${DIR}/freddy.webp`, token: `${DIR}/freddy_token.webp`, room: `${DIR}/room.webp` };
const VIDEO = { scare: `${DIR}/jumpscare.mp4`, night: `${DIR}/jumpscare_night.mp4` };
// จัมป์สแกร์ก่อนฉากตี — ไม่มีชื่อ/การ์ดเปิด (ผู้ใช้สั่ง) · scare = ชนะมินิเกมประตู (กลางวัน) · night = ตีปกติกลางคืนทุกครั้ง
const CUT = { scare: "freddyScare", night: "freddyScareNight" };
// คีย์ใน client/src/audio.js (ไฟล์ client/public/characters/freddy_fazbear/sfx/ — ไฟล์จากผู้ใช้)
const SFX = { growl1: "freddy_growl_1", growl2: "freddy_growl_2", box: "freddy_box", steps: "freddy_steps" };
const MOV = { day: 4, night: 9 };
const ATK = { day: 4, night: 3, pve: 6 };
const PVE_CRIT = 50;
const CANTO = 3;
const KILL_HEAL = 2;
// reveal = พักโชว์ผล: ปิดทัน 2.6 วิ · ปิดผิด 0.5 วิ (จอดำแล้วตัดเข้าคลิปจัมป์สแกร์ทันที — ผู้ใช้สั่ง)
const DOOR = { seconds: 10, reveal: 2.6, revealEnter: 0.5, penalty: 3, warpMin: 3, warpMax: 5 };
const NEAR = 3;
const DOORS = ["left", "right"];

function eng() { return require("../server/engine").engine; }
const isFreddy = (p) => !!p && p.characterId === ID && !p.summon;
const st = (p) => p.freddy || (p.freddy = fresh());
const fresh = () => ({ cantoRound: -1, penalty: false, door: null, scare: false, stepRound: -1, used: {} });
const pveMode = (engine) => engine.world === "eos" || engine.world === "moon" || engine.gameMode === "moon";
const nightNow = (engine) => pveMode(engine) || !!engine.isNightRound(engine.roundNumber);
const botSide = (u) => !u || !!u.summon || u.connected === false;
const randDoor = () => DOORS[Math.floor(Math.random() * DOORS.length)];

// ช่องว่างระยะ warpMin–warpMax จากที่เดิม (สุ่ม) · ไม่มี = ช่องว่างใกล้สุดในระยะ warpMax
function warpSpot(engine, p) {
  const map = engine.boardMap();
  if (!map || !p.pos) return null;
  const far = [], near = [];
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      const d = Board.dist(p.pos, { x, y });
      if (d < 1 || d > DOOR.warpMax || !engine.tileFree(x, y, p.id)) continue;
      (d >= DOOR.warpMin ? far : near).push({ x, y, d });
    }
  }
  if (far.length) return far[Math.floor(Math.random() * far.length)];
  near.sort((a, b) => b.d - a.d);
  return near[0] || null;
}
function warp(engine, p) {
  const to = warpSpot(engine, p);
  if (!to) return false;
  const from = { ...p.pos };
  p.pos = { x: to.x, y: to.y };
  engine.boardFx("freddyFx", { kind: "warp", id: p.id, from, at: { ...p.pos } });
  return true;
}

// ---------- มินิเกมประตู ----------
function doorOf(engine) {
  const p = Object.values(engine.players).find((o) => isFreddy(o) && o.freddy && o.freddy.door);
  return p ? { p, d: p.freddy.door } : null;
}
function resolveDoor(engine, p) {
  const d = st(p).door;
  if (!d || d.result) return;
  const foe = engine.players[d.foeId];
  if (!d.enter) d.enter = randDoor();
  d.result = d.close === d.enter ? "blocked" : "enter";
  engine.log(d.result === "blocked"
    ? `🚪 ${(foe && foe.name) || ""} ปิดประตูทัน — ${p.name} เข้าไม่ได้`
    : `🐻 ${p.name} เข้าทางประตู${d.enter === "left" ? "ซ้าย" : "ขวา"} — ${(foe && foe.name) || ""} ปิดไม่ทัน`);
  engine.skillBeat(d.result === "enter" ? DOOR.revealEnter : DOOR.reveal, () => {});
}
// ปิดประตูทัน: เฟรดดี้เสียหาย 3 (เกราะรับก่อน · ต้นตอ = เป้า) แล้ววาปออก → วินาทีพักฉาก
function blocked(engine, p, foe) {
  const s = st(p);
  s.penalty = true;
  try {
    const hit = () => engine.dealMixed(p, DOOR.penalty, false);
    if (foe) engine.withEffectSource(foe, hit); else hit();
  } finally { s.penalty = false; }
  if (p.alive && p.hp <= 0) {
    if (foe) engine.withEffectSource(foe, () => engine.instantDeath(p)); else engine.instantDeath(p);
  }
  if (!p.alive) { p.pos = null; engine.log(`💀 ${p.name} ตกรอบ!`); return 1.2; }
  warp(engine, p);
  return 1.4;
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, SFX, MOV, ATK, DOOR, NEAR, CANTO, KILL_HEAL, PVE_CRIT,
  isFreddy, nightNow, warpSpot,

  resetCombat(p) { p.freddy = isFreddy(p) ? fresh() : null; },

  mov(p) { return isFreddy(p) ? (nightNow(eng()) ? MOV.night : MOV.day) : null; },
  attackBaseOverride(engine, attacker) {
    if (!isFreddy(attacker)) return 1;
    return pveMode(engine) ? ATK.pve : nightNow(engine) ? ATK.night : ATK.day;
  },
  critPct(p) { return isFreddy(p) && pveMode(eng()) ? PVE_CRIT : 0; },

  // กลางวัน: ล่องหนตลอด · ไม่มีอะไรแตะได้ (ยกเว้นโทษปิดประตูทันของตัวเอง)
  stealthed(p) { return isFreddy(p) && p.alive && !nightNow(eng()); },
  untouchable(engine, p) { return isFreddy(p) && !nightNow(engine) && !st(p).penalty; },

  // ตีปกติกลางวัน: ทอยหลบ → มินิเกมประตู (action.strikeTarget เรียก — คืน { after } = รับช่วงการตีนี้ไปทั้งก้อน)
  //  after() คืน "strike" = ตีลงต่อ (ข้ามด่านหลบ) · ตัวเลข = วินาทีพักฉากก่อนจบตา
  interceptStrike(engine, p, target) {
    if (!isFreddy(p) || nightNow(engine)) return null;
    if (engine.skillDodge(p, target, "การโจมตี")) {
      target.wasAttacked = true;
      warp(engine, p);
      return { after: () => 1.2 };
    }
    const s = st(p);
    const d = { freddyId: p.id, foeId: target.id, close: null, enter: null, picked: { freddy: false, foe: false }, result: null };
    d.enter = randDoor(); d.picked.freddy = true; // เฟรดดี้ไม่ต้องเลือก — สุ่มประตูให้ (ผู้ใช้สั่ง 2026-11-11) · จอเฟรดดี้แค่รอดูผล
    if (botSide(target)) { d.close = randDoor(); d.picked.foe = true; }
    s.door = d;
    engine.log(`🚪 ${p.name} มาถึงหน้าห้องของ ${target.name}`);
    const both = d.picked.freddy && d.picked.foe;
    engine.skillBeat(both ? 1.5 : DOOR.seconds, () => resolveDoor(engine, p), { open: true });
    return {
      after: () => {
        const res = d.result;
        s.door = null;
        target.wasAttacked = true;
        if (res === "enter" && p.alive && target.alive && target.pos) { s.scare = true; return "strike"; }
        if (res === "blocked") return blocked(engine, p, target);
        return 0.6;
      },
    };
  },
  doorAction(engine, id, door) {
    const cur = doorOf(engine);
    if (!cur || !DOORS.includes(door)) return false;
    const { d } = cur;
    if (d.result) return false;
    const side = id === d.freddyId ? "freddy" : id === d.foeId ? "foe" : null;
    if (!side || d.picked[side]) return false;
    d.picked[side] = true;
    if (side === "freddy") d.enter = door; else d.close = door;
    if (d.picked.freddy && d.picked.foe) engine.releaseBeat();
    else engine.broadcastState();
    return true;
  },
  // ต่อผู้ชม: เห็นประตูที่ตัวเองเลือก · ของอีกฝ่ายเปิดตอนผลออก
  doorView(engine, ids) {
    const cur = doorOf(engine);
    if (!cur) return null;
    const { d } = cur;
    const side = ids.includes(d.freddyId) ? "freddy" : ids.includes(d.foeId) ? "foe" : null;
    const open = !!d.result;
    return {
      freddyId: d.freddyId, foeId: d.foeId, side, picked: d.picked, result: d.result,
      close: open || side === "foe" ? d.close : null,
      enter: open || side === "freddy" ? d.enter : null,
      room: IMG.room, token: IMG.token,
    };
  },

  // คลิปจัมป์สแกร์ก่อนฉากตี: ชนะมินิเกมประตู (กลางวัน) / ตีปกติกลางคืนทุกครั้ง · เสียงตีลงหลังคลิปจบ (ไม่ซ้อน)
  //  ไม่เล่นบนจอของเฟรดดี้เอง (ผู้ใช้สั่ง 2026-11-11 "คนไปหลอกจะ jump scare ตัวเองทำไม") — onlyFor = ทุกคนยกเว้นเฟรดดี้
  preAttackClip(engine, p) {
    if (!isFreddy(p)) return null;
    let key = null;
    if (st(p).scare) { st(p).scare = false; key = CUT.scare; } else if (nightNow(engine)) key = CUT.night;
    if (!key) return null;
    const onlyFor = Object.values(engine.players).filter((o) => !o.summon && o.id !== p.id).map((o) => o.id);
    return onlyFor.length ? { key, onlyFor } : null;
  },
  // กลางคืน: เดินแล้วมีเสียงฝีเท้า (ทุกคนได้ยิน · ครั้งเดียวต่อตาเดิน) — afterWalk ถูกเรียกใหม่ทุกก้าว
  afterWalk(engine, p) {
    if (!isFreddy(p) || !nightNow(engine)) return undefined;
    const s = st(p), key = `${engine.roundNumber}`;
    if (s.stepRound === key) return undefined;
    s.stepRound = key;
    engine.sfx(SFX.steps);
    return undefined;
  },
  // ปุ่มพิเศษบน HUD (ผู้ใช้สั่ง 2026-11-11): ขู่ 1 / ขู่ 2 = เลือกเสียงขู่เอง · กล่องดนตรี (เฉพาะกลางคืน) = เพลง music_box — แค่เสียง ทุกคนได้ยิน
  //  ตาเดินของตัวเอง · ปุ่มละ 1 ครั้งต่อเทิร์น · ไม่ใช้แต้ม ไม่ล็อกการเดิน ไม่นับเป็นการกระทำ
  hudActions(engine, p) {
    if (!isFreddy(p) || !p.alive) return undefined;
    const s = st(p), r = engine.roundNumber, off = !engine.canAct(p);
    const btn = (key, icon, name, row) => ({ key, icon, name, row, on: false, cd: 0, disabled: off || s.used[key] === r });
    const list = [btn("growl1", "🐻", "ขู่ 1", "growl"), btn("growl2", "🐻", "ขู่ 2", "growl")]; // แบ่งครึ่งแถวเดียว (ผู้ใช้สั่ง)
    if (nightNow(engine)) list.push(btn("box", "🎵", "กล่องดนตรี"));
    return list;
  },
  charAction(engine, p, key) {
    if (!isFreddy(p) || !SFX[key] || key === "steps" || !engine.canAct(p)) return false;
    if (key === "box" && !nightNow(engine)) return false;
    const s = st(p);
    if (s.used[key] === engine.roundNumber) return false;
    s.used[key] = engine.roundNumber;
    engine.sfx(SFX[key]);
    engine.broadcastState();
    return true;
  },
  // ตีจบ: กลางคืน = เดินต่อ 3 ช่อง · กลางวัน (ชนะมินิเกมประตู) = วาปออกไปที่ใหม่ ~5 ช่อง (ผู้ใช้สั่ง 2026-11-11)
  afterStrike(engine, p) {
    if (!isFreddy(p) || !p.alive || !p.pos) return;
    if (nightNow(engine)) st(p).cantoRound = engine.roundNumber;
    else warp(engine, p);
  },
  cantoMov(engine, p) {
    return isFreddy(p) && nightNow(engine) && st(p).cantoRound === engine.roundNumber ? CANTO : 0;
  },
  onKill(engine, killer, victim) {
    if (!isFreddy(killer) || !killer.alive || !victim || victim.summon) return;
    const n = engine.healHp(killer, KILL_HEAL);
    if (n > 0) engine.log(`🐻 ${killer.name} สังหาร ${victim.name} — ฟื้นพลังชีวิต +${n}`);
  },
  onDeath(engine, p) { if (isFreddy(p) && p.freddy) p.freddy.door = null; },
  severables() { return []; },

  // เพลงตอนเข้าใกล้ (กลางวัน): ผู้ชมคนนี้ (ตัวที่คุม) อยู่ห่างเฟรดดี้ไม่เกิน NEAR · เฟรดดี้เองได้ยินเมื่อมีศัตรูอยู่ใกล้
  nearView(engine, ids) {
    if (nightNow(engine)) return false;
    const fs = Object.values(engine.players).filter((o) => isFreddy(o) && o.alive && o.pos);
    if (!fs.length) return false;
    const me = ids.map((id) => engine.players[id]).filter((u) => u && u.alive && u.pos);
    for (const f of fs) {
      for (const u of me) {
        if (u.id === f.id) {
          const foe = Object.values(engine.players).some((o) => o.alive && o.pos && o.id !== f.id && !engine.sameTeam(f, o) && Board.dist(f.pos, o.pos) <= NEAR);
          if (foe) return true;
        } else if (!engine.sameTeam(f, u) && Board.dist(f.pos, u.pos) <= NEAR) return true;
      }
    }
    return false;
  },
  freddyState(engine, p) {
    if (!isFreddy(p)) return undefined;
    return { night: nightNow(engine), standee: IMG.token };
  },
};
