// ============================================================
//  ขบวนการจอมราชันคิงโอเจอร์ — ระบบกลางของ 5 ตัวละครระดับง่าย (GRID_PLAN §7.22 · ผู้ใช้ส่งสเปก 2026-10-28)
//   gira_ohger (คุวากาตะ แดง · ปุ่ม 1) · yanma_ohger (ทอมโบ น้ำเงิน · 2) · himeno_ohger (คามาคิริ เหลือง · 3)
//   rita_ohger (พาพิยอง ม่วง · 4) · kaguragi_ohger (ฮาจิ ดำ · 5) — makeOhger(def) สร้างโมดูลของแต่ละตัว
//
//  ค่าพื้นฐาน: ไม่ระบุ → HP 7 / เกราะ 3 / โจมตี 1 · เดิน 4 · ตีประชิด [1, 1]
//  แกนดาบ (Ohger Calibur — HUD เฉพาะตัว client/src/screens/hud/OhgerSword.jsx · ปุ่มส่ง socket charAction "ohger:b1…b5 / trigger / revert"):
//   สวมเกราะราชัน (สกิลพื้นฐาน 0 แต้ม · ไม่กินโควตา): ขั้นแรกกดสีของตัวเอง (ระบบบังคับ — ปุ่มอื่นกดไม่ติด ไม่มีโทษ)
//    → ลูปตามเนื้อเรื่อง 2→3→4→5→1 (ไฟกระพริบบอกปุ่มถัดไป) · กดผิด = จบตาเดินทันที · ครบ = useSkill basic (ล็อกการเดินตามกฎพื้นฐาน)
//    · แปลงร่างได้ 1 ครั้งต่อเทิร์น · คลิปแปลงร่างสำเร็จเล่น 1 ครั้งต่อเกม (p.cutsceneShown)
//   คืนร่าง (ปุ่มแยก hudActions — ไม่ใช้แต้ม ไม่มีคูลดาวน์): กดได้ตั้งแต่เทิร์นถัดจากที่แปลงร่าง
//   Ohger Finish (สกิลรอง 4 แต้ม · ใช้ได้เฉพาะร่างสวมเกราะ): กดไก → ดึงสีของร่างตัวเอง 3 ครั้ง → ครั้งที่ 3 = stand by:
//    เดินไม่ได้ (ฮุค mov → 0) + client เข้าโหมดเลือกทิศทันที → useSkill secondary { dir } · ดึงผิดสี = เสีย 4 แต้มฟรี ไม่ออกท่า
//    · กดไกซ้ำ = ยกเลิก (ไม่เสียแต้ม · stand by แล้วยกเลิก = กลับมาเดินได้)
//  ท่าไม้ตาย: ยังไม่มี (รออัปเดต — characters.js ultimate: null)
//  จอมราชัน (ติดตัว): ร่างมนุษย์ฟื้นพลังชีวิต 2 ต่อเทิร์น (จบเทิร์น) · สวมเกราะพลังโจมตี +1 (เฉพาะตีปกติ — ผู้ใช้สั่ง) · ความสามารถเฉพาะร่าง (FORMS)
//
//  ดาเมจ Finish หลบได้ (ผู้ใช้สั่ง) · ตัดสินเอง (Claude — เปลี่ยนได้): ลดเกราะก่อน ฆ่าได้ + เปราะบางบวกเพิ่ม ·
//   สถานะที่ติดตอนตาเดินเรา: เป้าที่เดินไปแล้วในเทิร์นนี้ได้ +1 เทิร์น (แบบถูกตรึงของกิระ) · พิษร้าย +1 (ลดก่อนออกฤทธิ์ แบบ Gamma Knife) ·
//   คืนร่างไม่ล็อกการเดิน · ฮาจิถอยเมื่อถูกตีปกติ/ยิง/ถูกสกิลทำดาเมจ (1 ครั้งต่อการโจมตี) — ถอยหลังตาเดินของผู้โจมตีจบ
// ============================================================

const SEQ = [2, 3, 4, 5, 1];
const FINISH_PULLS = 3;
const HUMAN_REGEN = 2;
const ARMOR_ATK = 1;
const LINE_DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };
const GATHER_REACH = 3; // หาช่องว่างรอบช่องที่ดึงไปไม่เกินระยะนี้

// พื้นที่ Ohger Finish ต่อร่าง (characters.js ใช้ชุดเดียวกัน — ป้าย/โหมดเลือกทิศของ client)
const FINISH_AREA = {
  kuwagata: { kind: "line", len: 4, width: 4, hostile: true },
  tonbo: { kind: "line", len: 6, width: 1, hostile: true },
  kamakiri: { kind: "line", len: 4, width: 5, hostile: true },
  papiyon: { kind: "line", len: 5, width: 1, hostile: true }, // พุ่ง 4 + ช่องหน้าที่ฟัน
  hachi: { kind: "line", len: 5, width: 1, hostile: true },
};
const NUM = {
  kuwagata: { dmg: 4 },
  tonbo: { dmg: 2, len: 6, mid: 3 },
  kamakiri: { edge: 4, side: 3, center: 2, sidePoison: 1, centerPoison: 2 },
  papiyon: { dash: 4, dmg: 3, fragile: 1, fragileTurns: 2 },
  hachi: { dmg: 2, noheal: 1, poison: 1, back: 2 },
  kuwagataWave: { pct: 50, len: 4 },
  tonboTwice: { pct: 25 },
  kamakiriDrain: { cap: 3 },
  papiyonRoot: { pct: 20, turns: 1 },
  hachiFlee: { pct: 50, back: 2, mov: 2 },
};
// จังหวะบนกระดาน (วินาที — ต้องไม่สั้นกว่า OHGER_FX ใน client/src/board/ohgerFx.js)
const BEAT = { hit: 0.35, pass: 0.45, move: 0.5, wave: 0.6, flee: 0.5 };

// เสียง (client/src/audio.js — ไฟล์ client/public/characters/ohger/sfx/ ตัดจากไฟล์ผู้ใช้ด้วย .claude/plans/ohger-sfx.py)
//  ลูประหว่างรอ (ohger_tf_wait_N / ohger_charge_loop / ohger_standby_loop) client เล่นเองตาม players[].ohger.phase ของคนที่กำลังเดิน
const SFX = {
  call: (n) => `ohger_call_${n}`,           // กดสีตัวเอง (ขั้นแรก)
  press: (n) => `ohger_press_${n}`,         // กดปุ่มในลูป 2→3→4→5 (เสียงกดต่อเนื่องจากไฟล์ HQ — ปุ่มสุดท้ายเป็นเสียงแปลงร่าง/คลิป)
  complete: "ohger_complete",            // แปลงร่างสำเร็จ (หลังกดปุ่มสุดท้าย) → ต่อด้วย done — ครั้งที่ 2 ขึ้นไป (ผู้ใช้สั่ง · ต่อคิว SFX_QUEUED "ohger_tf")
  done: (n) => `ohger_tf_done_${n}`,        // "<ชื่อ>、王者!" — แปลงร่างครั้งที่ 2 ขึ้นไป (ครั้งแรกเป็นคลิป ไม่มีเสียงเอฟเฟกต์ซ้อน)
  trigger: "ohger_trigger",                // กดไก (Ohger charge)
  pull: (n, i) => `ohger_pull_${n}_${i}`,  // ดึงคันโยกครั้งที่ i (1–3)
  finish: "ohger_finish_call",             // ปล่อยท่า "Ohger Finish"
  atk: (n) => `ohger_atk_${n}`,            // เสียงท่าโจมตีตามสี (ต่อคิวหลัง finish — SFX_QUEUED)
};
const roll = (pct) => Math.random() * 100 < pct;
const fresh = () => ({
  armored: false, armRound: 0, armAt: 0, // ร่างสวมเกราะ · เทิร์นที่แปลง · ลำดับตัดผล (engine.severStamp)
  phase: null, idx: 0, pulls: 0, chargeAt: 0, // null | own→loop (แปลงร่าง) | charge | standby (Ohger Finish)
  finishRound: 0, ready: false, tfVideo: false, // เทิร์นที่ใช้/เสีย Finish ล่าสุด · ด่านภายในของ useSkill basic · แปลงร่างครั้งนี้เล่นคลิป
  twiceUsed: false, lastDir: null, preHp: {},  // ทอมโบตีซ้ำแล้วในตาเดินนี้ · ทิศตีปกติล่าสุด (คุวากาตะ) · เลือดเป้าก่อนตี (คามาคิริ)
  flee: null, fleeSeq: -1, movRound: 0,        // ฮาจิ: ถอยที่รอลง { fromX, fromY } · กันซ้ำต่อการโจมตี · เทิร์นที่เดิน +2
});

// ---------- ตัวช่วยกระดาน ----------
function unitsOn(engine, tiles) {
  const keys = new Set(tiles.map((t) => `${t.x},${t.y}`));
  return Object.values(engine.players).filter((u) => {
    if (!u.alive || !u.pos) return false;
    const n = engine.sizeOf(u) || 1;
    for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) if (keys.has(`${u.pos.x + dx},${u.pos.y + dy}`)) return true;
    return false;
  });
}
const unitAt = (engine, x, y) => unitsOn(engine, [{ x, y }])[0] || null;
const enemyOf = (engine, p, t) => !!t && t.alive && t.id !== p.id && !engine.sameTeam(p, t);
// ช่องว่างที่ใกล้ want ที่สุด (ระยะเท่ากัน = แนวกลางก่อน แล้วใกล้ตัวเดิม) — แบบบีบเข้ากลางของกิระ
function nearestFree(engine, t, want, side) {
  const cand = [];
  for (let d = 0; d <= GATHER_REACH; d++) {
    for (let dx = -d; dx <= d; dx++) {
      for (const dy of dx === d || dx === -d ? [d - Math.abs(dx)] : [d - Math.abs(dx), -(d - Math.abs(dx))]) {
        const x = want.x + dx, y = want.y + dy;
        if (!engine.tileFree(x, y, t.id)) continue;
        const lat = side ? Math.abs(dx * side.x + dy * side.y) : 0;
        cand.push({ x, y, d, lat, near: Math.abs(x - t.pos.x) + Math.abs(y - t.pos.y) });
      }
    }
    if (cand.length) break;
  }
  cand.sort((a, b) => a.d - b.d || a.lat - b.lat || a.near - b.near);
  return cand[0] || null;
}
// ย้ายเป้าไปช่อง to (เหตุการณ์ knock ให้ client เลื่อนตัว) — ลงน้ำแข็งแนวตรง = ไถลต่อ
function knock(engine, ctx, t, to) {
  const from = { ...t.pos };
  t.pos = { x: to.x, y: to.y };
  ctx.events.push({ kind: "knock", id: t.id, from, to: { x: to.x, y: to.y } });
  const dx = Math.sign(to.x - from.x), dy = Math.sign(to.y - from.y);
  if (!dx !== !dy) engine.ice.resolveEntry(t, { x: dx, y: dy }, ctx);
}
// ดาเมจตายตัวของ Ohger Finish: หลบได้ (ผู้ใช้สั่ง 2026-10-28 — หลบหลีก/หลบเฉพาะตัว · แม่นยำเจาะ) · ลดเกราะก่อน · ฆ่าได้ · เปราะบางบวกเพิ่ม
//  คืน "dodge" = หลบพ้น (ไม่ติดสถานะ/ไม่ถูกดึง) · true = โดนแล้วรอด · false = ตาย
function hit(engine, p, t, n, label) {
  t.wasAttacked = true;
  if (engine.skillDodge(p, t, label)) return "dodge";
  const amt = n + (engine.statusAmtOf(t, "fragile") || 0);
  const before = (t.hp || 0) + (t.armor || 0);
  engine.dealMixed(t, amt);
  if (t.alive && t.hp <= 0) engine.instantDeath(t);
  const dealt = Math.max(0, before - ((t.hp || 0) + (t.armor || 0)));
  engine.log(`👑 ${label} → ${t.name} -${dealt} (ลดเกราะก่อน)`);
  if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
  return t.alive;
}
// สถานะ N เทิร์นที่ติดตอนตาเดินเรา: เป้าที่เดินไปแล้วเทิร์นนี้ได้เพิ่ม 1 (endTurn ลดไปก่อนถึงตาเขา)
const turnsFor = (engine, t, n) => n + (engine.hasActed(t.id) || engine.actorId === t.id ? 1 : 0);
function debuff(engine, t, key, amt, turns, label) {
  if (engine.applyDebuff(t, key, amt, turnsFor(engine, t, turns))) { engine.log(`👑 ${t.name} ติด${label} ${turns} เทิร์น`); return true; }
  engine.log(`👑 ${t.name} ต้าน${label}ไว้ได้`);
  return false;
}
function poison(engine, t, turns) {
  if (engine.applyPoison(t, turns + 1)) { engine.log(`🧪 ${t.name} ติดพิษร้าย ${turns} เทิร์น`); return true; }
  engine.log(`🧪 ${t.name} ต้านพิษร้ายไว้ได้`);
  return false;
}

// ============================================================
//  โมดูลของแต่ละตัว
//   def = { id, form, btn, name, armorName, color, files: { face, armor, video }, videoSeconds }
// ============================================================
function makeOhger(def) {
  const ID = def.id;
  const DIR = `/characters/${ID}`;
  const IMG = { face: `${DIR}/${def.files.face}`, armor: `${DIR}/${def.files.armor}` };
  const VIDEO = { transform: `${DIR}/${def.files.video}` };
  const CUT = { transform: `${def.form}Transform` };
  const AREA = FINISH_AREA[def.form];
  const FORM = def.form;
  const OWN = def.btn;
  const COST = 4;

  const isMe = (p) => !!p && p.characterId === ID && !p.summon;
  const st = (p) => p.ohger || (p.ohger = fresh());
  const armored = (p) => isMe(p) && !!st(p).armored;
  const canTransform = (engine, p) => isMe(p) && !st(p).armored && st(p).armRound !== engine.roundNumber;
  const canRevert = (engine, p) => armored(p) && st(p).armRound < engine.roundNumber && !st(p).phase;
  function canFinish(engine, p) {
    if (!armored(p)) return false;
    const s = st(p);
    return !s.phase && s.finishRound !== engine.roundNumber && !p.skillUsedRound
      && (p.skillPoints || 0) >= COST && !(((p.statuses && p.statuses.noskill) || 0) > 0);
  }
  const reset = (s) => { s.phase = null; s.idx = 0; s.pulls = 0; };

  // ---------- Ohger Finish ----------
  function fx(engine, p, kind, tiles, extra) {
    engine.boardFx("ohgerFx", { kind, form: FORM, id: p.id, color: def.color, from: p.pos ? { ...p.pos } : null, tiles, ...extra });
  }
  const tilesOf = (engine, p, dir, area = AREA) => engine.areaTiles(p, area, dir);
  const targetsIn = (engine, p, ids) => (ids || []).map((id) => engine.players[id]).filter((t) => enemyOf(engine, p, t));

  // คุวากาตะ: ฟาด 4×4 ตามทิศ · 4 หน่วย
  function kuwagata(engine, p, ids, dir) {
    fx(engine, p, "slash", tilesOf(engine, p, dir), { dir });
    engine.skillBeat(BEAT.hit, () => engine.withEffectSource(p, () => {
      for (const t of targetsIn(engine, p, ids)) hit(engine, p, t, NUM.kuwagata.dmg, "คุวากาตะ โอเจอร์ ฟินิช");
    }));
  }
  // ทอมโบ: พุ่งแนว 6 แล้วย้อนกลับ · ขาไป 2 + ขากลับ 2 (ทุกคนในแนว) · คนที่รอดถูกรวมไว้กลางแนว
  function tonbo(engine, p, ids, dir) {
    const [fx0, fy0] = LINE_DIRS[dir];
    const start = { ...p.pos };
    const line = tilesOf(engine, p, dir);
    engine.setDash({ id: p.id, path: [start, ...line, ...line.slice(0, -1).reverse(), start], style: "ohger" });
    fx(engine, p, "dash", line, { dir });
    const struck = new Set(); // โดนอย่างน้อย 1 ขา (หลบพ้นทั้งสองขา = ไม่ถูกรวม)
    const pass = (label) => engine.withEffectSource(p, () => {
      for (const t of targetsIn(engine, p, ids)) if (t.alive && hit(engine, p, t, NUM.tonbo.dmg, label) === true) struck.add(t.id);
    });
    engine.skillBeat(BEAT.pass, () => {
      pass("ทอมโบ โอเจอร์ ฟินิช (ขาไป)");
      engine.skillBeat(BEAT.pass, () => {
        pass("ทอมโบ โอเจอร์ ฟินิช (ขากลับ)");
        const mid = { x: start.x + fx0 * NUM.tonbo.mid, y: start.y + fy0 * NUM.tonbo.mid };
        gather(engine, p, targetsIn(engine, p, ids).filter((t) => t.pos && struck.has(t.id)), mid, { x: -fy0, y: fx0 });
      });
    });
  }
  // รวมเป้าไว้ที่ช่อง mid (ช่องไม่ว่าง = ช่องว่างใกล้สุด) · ตัวใหญ่ไม่ถูกย้าย
  function gather(engine, p, list, mid, side) {
    const ctx = engine.ice.begin();
    list.sort((a, b) => (Math.abs(a.pos.x - mid.x) + Math.abs(a.pos.y - mid.y)) - (Math.abs(b.pos.x - mid.x) + Math.abs(b.pos.y - mid.y)));
    for (const t of list) {
      if (!t.alive || !t.pos || engine.sizeOf(t) > 1) continue;
      if (t.pos.x === mid.x && t.pos.y === mid.y) continue;
      const to = engine.tileFree(mid.x, mid.y, t.id) ? mid : nearestFree(engine, t, mid, side);
      if (!to || (to.x === t.pos.x && to.y === t.pos.y)) continue;
      knock(engine, ctx, t, to);
      engine.log(`👑 ${t.name} ถูกรวมไว้กลางแนว`);
    }
    engine.ice.flush(ctx);
    if (ctx.events.length) engine.skillBeat(engine.ice.fxSeconds(ctx), () => {});
  }
  // คามาคิริ: ฟาด 4×5 · สุดขอบ 4 / ไม่ถึงขอบ 3 + พิษร้าย 1 / กลาง 2 + พิษร้าย 2 · คนที่รอดถูกดึงเข้าแถวกลาง
  function kamakiri(engine, p, ids, dir) {
    const [fx0, fy0] = LINE_DIRS[dir];
    const side = { x: -fy0, y: fx0 };
    const origin = { ...p.pos };
    const lat = (t) => (t.pos.x - origin.x) * side.x + (t.pos.y - origin.y) * side.y;
    fx(engine, p, "slash", tilesOf(engine, p, dir), { dir });
    engine.skillBeat(BEAT.hit, () => {
      const pulled = [];
      engine.withEffectSource(p, () => {
        for (const t of targetsIn(engine, p, ids)) {
          const j = Math.abs(lat(t));
          const N = NUM.kamakiri;
          const dmg = j >= 2 ? N.edge : j === 1 ? N.side : N.center;
          if (hit(engine, p, t, dmg, "คามาคิริ โอเจอร์ ฟินิช") !== true) continue;
          if (j === 1) poison(engine, t, N.sidePoison);
          else if (j === 0) poison(engine, t, N.centerPoison);
          if (j > 0) pulled.push(t);
        }
      });
      if (!pulled.length) return;
      engine.skillBeat(BEAT.move, () => {
        const ctx = engine.ice.begin();
        for (const t of pulled) {
          if (!t.alive || !t.pos || engine.sizeOf(t) > 1) continue;
          const j = lat(t);
          const want = { x: t.pos.x - side.x * j, y: t.pos.y - side.y * j };
          const to = engine.tileFree(want.x, want.y, t.id) ? want : nearestFree(engine, t, want, side);
          if (!to || (to.x === t.pos.x && to.y === t.pos.y)) continue;
          knock(engine, ctx, t, to);
          engine.log(`👑 ${t.name} ถูกดึงเข้ากลาง`);
        }
        engine.ice.flush(ctx);
        if (ctx.events.length) engine.skillBeat(engine.ice.fxSeconds(ctx), () => {});
      });
    });
  }
  // พาพิยอง: พุ่งไปข้างหน้าสูงสุด 4 ช่อง (หยุดหน้าคน/สิ่งกีดขวาง) แล้วฟันศัตรูช่องหน้า · 3 หน่วย + เปราะบาง 2 เทิร์น
  function papiyon(engine, p, dir) {
    const [dx, dy] = LINE_DIRS[dir];
    const start = { ...p.pos };
    let at = start, target = null;
    for (let i = 1; i <= NUM.papiyon.dash + 1; i++) {
      const x = start.x + dx * i, y = start.y + dy * i;
      const u = unitAt(engine, x, y);
      if (u && u.id !== p.id) { if (enemyOf(engine, p, u)) target = u; break; }
      if (i > NUM.papiyon.dash || !engine.tileFree(x, y, p.id)) break;
      at = { x, y };
    }
    const path = [];
    for (let i = 0; i <= Math.abs(at.x - start.x) + Math.abs(at.y - start.y); i++) path.push({ x: start.x + dx * i, y: start.y + dy * i });
    if (path.length > 1) { p.pos = { ...at }; engine.setDash({ id: p.id, path, style: "ohger" }); }
    fx(engine, p, "dash", path.slice(1), { dir, target: target && target.pos ? { ...target.pos } : null });
    if (!target) { engine.log(`🦋 ${p.name} พุ่งไปแต่ไม่มีเป้าหมาย`); return 0; }
    engine.skillBeat(BEAT.hit, () => engine.withEffectSource(p, () => {
      if (target.alive && hit(engine, p, target, NUM.papiyon.dmg, "พาพิยอง โอเจอร์ ฟินิช") === true) debuff(engine, target, "fragile", NUM.papiyon.fragile, NUM.papiyon.fragileTurns, "เปราะบาง");
    }));
    return 1;
  }
  // ฮาจิ: เข็มพิษแนวตรง 5×1 · 2 หน่วย + ไร้ทางเยียวยา 1 + พิษร้าย 1 (ทุกคนในแนว) · แล้วถอยทิศตรงข้าม 2 ช่อง (ชนของ/คน/ขอบ = หยุด)
  function hachi(engine, p, ids, dir) {
    fx(engine, p, "needle", tilesOf(engine, p, dir), { dir });
    engine.skillBeat(BEAT.hit, () => {
      engine.withEffectSource(p, () => {
        for (const t of targetsIn(engine, p, ids)) {
          if (hit(engine, p, t, NUM.hachi.dmg, "ฮาจิ โอเจอร์ ฟินิช") !== true) continue;
          debuff(engine, t, "nohealing", 1, NUM.hachi.noheal, "ไร้ทางเยียวยา");
          poison(engine, t, NUM.hachi.poison);
        }
      });
      engine.skillBeat(BEAT.move, () => backstep(engine, p, OPPOSITE[dir], NUM.hachi.back, true));
    });
  }
  // ถอยไปทาง dir ไม่เกิน n ช่อง (ช่องไม่ว่าง = หยุด) · dash = แอนิเมชันพุ่ง (ตัวเอง) ไม่งั้น knock (ถูกดัน)
  function backstep(engine, p, dir, n, dash) {
    if (!p.alive || !p.pos || !LINE_DIRS[dir] || engine.sizeOf(p) > 1) return false;
    const [dx, dy] = LINE_DIRS[dir];
    const start = { ...p.pos };
    let at = start;
    for (let i = 1; i <= n; i++) {
      const x = start.x + dx * i, y = start.y + dy * i;
      if (!engine.tileFree(x, y, p.id)) break;
      at = { x, y };
    }
    if (at === start) return false;
    if (dash) {
      const path = [start];
      for (let i = 1; i <= Math.abs(at.x - start.x) + Math.abs(at.y - start.y); i++) path.push({ x: start.x + dx * i, y: start.y + dy * i });
      p.pos = { ...at };
      engine.setDash({ id: p.id, path, style: "ohger" });
      return true;
    }
    const ctx = engine.ice.begin();
    knock(engine, ctx, p, at);
    engine.ice.flush(ctx);
    return true;
  }
  function finish(engine, p, ids, dir) {
    if (!p.pos || !LINE_DIRS[dir]) return 0;
    // เสียงท่าโจมตี: ส่งหลังป้ายสกิล (เสียง finish_call) → client ต่อคิวเล่นตาม (SFX_QUEUED "ohger")
    engine.skillBeat(0.05, () => engine.sfx(SFX.atk(OWN)));
    if (FORM === "kuwagata") kuwagata(engine, p, ids, dir);
    else if (FORM === "tonbo") tonbo(engine, p, ids, dir);
    else if (FORM === "kamakiri") kamakiri(engine, p, ids, dir);
    else if (FORM === "papiyon") return papiyon(engine, p, dir);
    else if (FORM === "hachi") hachi(engine, p, ids, dir);
    return targetsIn(engine, p, ids).length;
  }

  // ---------- ปุ่มบนแกนดาบ ----------
  function transformFail(engine, p) {
    const s = st(p);
    reset(s);
    engine.log(`👑 ${p.name} กดแกนดาบผิดลำดับ — แปลงร่างไม่สำเร็จ จบตาเดิน`);
    engine.skillFlash({ name: "แปลงร่างไม่สำเร็จ", img: IMG.face, by: p.name, color: engine.colorOf(p) });
    engine.finishActor();
  }
  function pressSword(engine, p, btn) {
    const s = st(p);
    if (!s.armored) {
      if (!canTransform(engine, p)) return false;
      if (!s.phase) {
        if (btn !== OWN) return false; // ขั้นแรก: ระบบบังคับให้กดสีตัวเองถูกเสมอ
        s.phase = "loop"; s.idx = 0;
        engine.sfx(SFX.call(btn));
        return true;
      }
      if (s.phase !== "loop" || btn === "trigger") return false;
      if (btn !== SEQ[s.idx]) { transformFail(engine, p); return "done"; }
      s.idx++;
      if (s.idx < SEQ.length) engine.sfx(SFX.press(btn)); // ปุ่มสุดท้าย = เสียงแปลงร่าง/คลิป
      if (s.idx < SEQ.length) return true;
      reset(s);
      s.ready = true;
      engine.useSkill(p.id, "basic", []);
      s.ready = false;
      return "done"; // useSkill บรอดแคสต์เอง
    }
    if (!s.phase) {
      if (btn !== "trigger" || !canFinish(engine, p)) return false;
      s.phase = "charge"; s.pulls = 0; s.chargeAt = engine.severStamp();
      engine.sfx(SFX.trigger);
      return true;
    }
    if (btn === "trigger") { // ยกเลิก (ไม่เสียแต้ม · stand by แล้วยกเลิก = เดินต่อได้)
      engine.log(`👑 ${p.name} เก็บดาบ — ยกเลิก Ohger Finish`);
      reset(s);
      return true;
    }
    if (s.phase === "standby") return false;
    if (btn !== OWN) { // ดึงผิดสี = เสียแต้มฟรี
      p.skillPoints = Math.max(0, (p.skillPoints || 0) - COST);
      s.finishRound = engine.roundNumber;
      reset(s);
      engine.log(`👑 ${p.name} ดึงผิดสี — Ohger Finish ล้มเหลว เสียแต้ม ${COST}`);
      engine.skillFlash({ name: "Ohger Finish ล้มเหลว", img: IMG.armor, by: p.name, color: engine.colorOf(p) });
      return true;
    }
    s.pulls++;
    engine.sfx(SFX.pull(OWN, s.pulls));
    if (s.pulls >= FINISH_PULLS) { s.phase = "standby"; engine.log(`👑 ${p.name} Ohger Finish — stand by`); }
    return true;
  }

  return {
    id: ID,
    IMG, VIDEO, CUT, SFX, AREA, FORM, OWN, SEQ, NUM, FINISH_PULLS, HUMAN_REGEN, ARMOR_ATK, def,
    isMe, armored,

    resetCombat(p) { p.ohger = isMe(p) ? fresh() : (p.characterId === ID ? null : p.ohger); },
    displayImg(p) { return armored(p) ? IMG.armor : null; },
    characterPub(engine, p) { return armored(p) ? { name: def.armorName, img: IMG.armor } : null; },

    // ---------- แกนดาบ (socket charAction) ----------
    charAction(engine, p, key) {
      if (!isMe(p) || typeof key !== "string" || !key.startsWith("ohger:") || !engine.canAct(p)) return false;
      const k = key.slice(6), s = st(p);
      if (k === "revert") {
        if (!canRevert(engine, p)) return false;
        s.armored = false;
        reset(s);
        engine.log(`👑 ${p.name} คืนร่าง — ${def.name}`);
        engine.skillFlash({ name: "คืนร่าง", img: IMG.face, by: p.name, color: engine.colorOf(p) });
        engine.broadcastState();
        return true;
      }
      const btn = k === "trigger" ? "trigger" : /^b[1-5]$/.test(k) ? Number(k[1]) : null;
      if (btn == null) return false;
      const r = pressSword(engine, p, btn);
      if (r === true) engine.broadcastState();
      return !!r;
    },
    hudActions(engine, p) {
      if (!armored(p) || !p.alive) return undefined;
      return [{ key: "ohger:revert", icon: "👑", name: "คืนร่าง", disabled: !engine.canAct(p) || !canRevert(engine, p) }];
    },
    // stand by = เดินไม่ได้ · ฮาจิหนีแล้ว = เทิร์นถัดไปเดิน +2
    mov(p) {
      if (!isMe(p)) return null;
      const s = st(p);
      if (s.phase === "standby") return 0;
      if (FORM === "hachi" && s.movRound && s.movRound === (p._ohgerRound || 0)) return 4 + NUM.hachiFlee.mov;
      return null;
    },
    onActorStart(engine, p) { if (isMe(p)) { const s = st(p); s.twiceUsed = false; reset(s); } },
    onActorEnd(engine, p) { if (isMe(p)) reset(st(p)); },

    // ---------- สกิล ----------
    canUseSkill(engine, p, tier) {
      if (!isMe(p)) return true;
      const s = st(p);
      if (tier === "basic") return !!s.ready && canTransform(engine, p);
      if (tier === "secondary") return !!s.armored && s.phase === "standby";
      return false;
    },
    skipsTurnQuota(p, tier) { return isMe(p) && tier === "basic"; },
    ignoresTurnQuota(p, tier) { return isMe(p) && tier === "basic"; },
    skillSound(p, tier) {
      if (!isMe(p)) return null;
      if (tier === "basic") return st(p).tfVideo ? null : SFX.done(OWN);
      if (tier === "secondary") return SFX.finish;
      return null;
    },
    skillPub(p, tier) {
      if (!isMe(p)) return null;
      if (tier === "basic") return { img: IMG.armor };
      return null;
    },
    applyInstantSkill(engine, p, tier, targets, opts = {}) {
      if (!isMe(p)) return "";
      const s = st(p);
      if (tier === "basic") {
        s.armored = true;
        s.armRound = engine.roundNumber;
        s.armAt = engine.severStamp();
        reset(s);
        p.cutsceneShown ||= {};
        s.tfVideo = !p.cutsceneShown[CUT.transform];
        if (s.tfVideo) { // คลิปแปลงร่างสำเร็จ 1 ครั้งต่อเกม (ผู้ใช้สั่ง) · ครั้งต่อไป = เสียงปิดท้ายแปลงร่าง (skillSound)
          p.cutsceneShown[CUT.transform] = true;
          engine.queueCutscene(p, CUT.transform);
        } else engine.sfx(SFX.complete); // ส่งก่อนป้ายสกิล (เสียง done) → client เล่นต่อกัน
        engine.log(`👑 ${p.name} สวมเกราะราชัน — ${def.armorName}`);
        return ` — ${def.armorName}`;
      }
      if (tier === "secondary") {
        reset(s);
        s.finishRound = engine.roundNumber;
        const n = finish(engine, p, targets, opts.dir);
        return n ? ` — โดน ${n} คน` : "";
      }
      return "";
    },

    // ---------- จอมราชัน ----------
    onEndTurn(engine) {
      for (const p of Object.values(engine.players)) {
        if (!isMe(p) || !p.alive || st(p).armored) continue;
        const healed = engine.healHp(p, HUMAN_REGEN);
        if (healed > 0) engine.log(`👑 ${p.name} จอมราชัน — ฟื้นพลังชีวิต +${healed}`);
      }
    },
    onRoundStartTick(engine, p) { if (isMe(p)) p._ohgerRound = engine.roundNumber; },
    damageBonus(engine, attacker, target, ctx) {
      if (!armored(attacker)) return 0;
      if (ctx) ctx.ohgerArmor = ARMOR_ATK;
      return ARMOR_ATK;
    },
    attackFxNames(attacker, atkCtx) { return atkCtx && atkCtx.ohgerArmor ? [`จอมราชัน +${atkCtx.ohgerArmor}`] : []; },

    // คุวากาตะ: จดทิศการตี (เป้ายังอยู่ช่องเดิม) → หลังฉากตี 50% คลื่นดาบไปข้างหลัง 4 ช่อง
    onStrikeResolved(engine, a, t, res) {
      if (!armored(a)) return;
      const s = st(a);
      if (FORM === "kuwagata" && a.pos && t && t.pos) {
        const dx = t.pos.x - a.pos.x, dy = t.pos.y - a.pos.y;
        s.lastDir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      }
      // คามาคิริ: ดูดพลังชีวิตเท่าที่ตีเข้าเลือดได้ (สูงสุด 3)
      if (FORM === "kamakiri" && t && s.preHp[t.id] != null) {
        const lost = Math.max(0, s.preHp[t.id] - Math.max(0, t.hp || 0));
        delete s.preHp[t.id];
        const n = Math.min(NUM.kamakiriDrain.cap, lost);
        if (n > 0) {
          const healed = engine.healHp(a, n);
          engine.log(`🦗 ${a.name} ดูดพลังชีวิต ${t.name} +${healed}`);
        }
      }
    },
    beforeStrikeHit(engine, a, t) {
      if (FORM === "kamakiri" && armored(a) && t) st(a).preHp[t.id] = Math.max(0, t.hp || 0);
      return [];
    },
    afterBoardAttack(engine, a) {
      if (FORM !== "kuwagata" || !armored(a)) return null;
      const s = st(a), dir = s.lastDir && OPPOSITE[s.lastDir];
      s.lastDir = null;
      if (!dir || !roll(NUM.kuwagataWave.pct)) return null;
      return () => {
        if (!a.alive || !a.pos) return 0;
        const tiles = tilesOf(engine, a, dir, { kind: "line", len: NUM.kuwagataWave.len, width: 1 });
        fx(engine, a, "wave", tiles, { dir });
        engine.log(`🪲 ${a.name} คลื่นดาบไปข้างหลัง`);
        for (const t of unitsOn(engine, tiles)) if (enemyOf(engine, a, t)) engine.skillStrike(a, t, "คลื่นดาบคุวากาตะ");
        return BEAT.wave;
      };
    },
    // ทอมโบ: 25% ได้ตีปกติครั้งที่ 2 (ครั้งเดียวต่อตาเดิน)
    extraStrike(engine, p) {
      if (FORM !== "tonbo" || !armored(p) || !p.alive) return false;
      const s = st(p);
      if (s.twiceUsed || !roll(NUM.tonboTwice.pct)) return false;
      s.twiceUsed = true;
      engine.log(`🪰 ${p.name} ได้ตีปกติครั้งที่ 2`);
      return true;
    },
    // พาพิยอง: ตีปกติโดน 20% ติดถูกตรึง 1 เทิร์น
    onStrikeLanded(engine, a, t) {
      if (FORM !== "papiyon" || !armored(a) || !t || !t.alive || !roll(NUM.papiyonRoot.pct)) return [];
      return debuff(engine, t, "rooted", 1, NUM.papiyonRoot.turns, "ถูกตรึง") ? ["ถูกตรึง"] : [];
    },
    // ฮาจิ: ถูกโจมตี 50% → หลังตาเดินของผู้โจมตีจบ ถอยห่าง 2 ช่อง + เทิร์นถัดไปเดิน +2
    onAttacked(engine, p, attacker, kind) {
      if (FORM !== "hachi" || !armored(p) || !p.alive || !attacker || attacker.id === p.id || engine.sameTeam(p, attacker)) return;
      if (!["strike", "gun", "damage"].includes(kind)) return;
      const s = st(p);
      if (s.fleeSeq === engine.commandSeq) return;
      s.fleeSeq = engine.commandSeq;
      if (!roll(NUM.hachiFlee.pct) || !attacker.pos) return;
      s.flee = { x: attacker.pos.x, y: attacker.pos.y };
      s.movRound = engine.roundNumber + 1;
      engine.log(`🐝 ${p.name} เตรียมถอยห่างจาก ${attacker.name}`);
    },
    afterActorEnd(engine) {
      let any = false;
      for (const p of Object.values(engine.players)) {
        if (!isMe(p) || FORM !== "hachi") continue;
        const s = st(p);
        const from = s.flee;
        s.flee = null;
        if (!from || !p.alive || !p.pos) continue;
        const dx = p.pos.x - from.x, dy = p.pos.y - from.y;
        const dir = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
        if (backstep(engine, p, dir, NUM.hachiFlee.back, false)) { any = true; engine.log(`🐝 ${p.name} ถอยห่างจากศัตรู`); }
      }
      return any ? BEAT.flee : 0;
    },

    // ---------- ตัดผลสกิล (server/sever.js) ----------
    severables(engine, p) {
      if (!isMe(p)) return [];
      const s = st(p), out = [];
      if (s.armored) out.push({ key: `${ID}Armor`, label: def.armorName, at: s.armAt || 0, cancel() { s.armored = false; reset(s); } });
      if (s.phase === "charge" || s.phase === "standby") out.push({ key: `${ID}Finish`, label: "Ohger Finish", at: s.chargeAt || 0, cancel() { reset(s); } });
      return out;
    },

    // ---------- ข้อมูลให้ client (players[].ohger — HUD แกนดาบ) ----------
    ohgerState(engine, p) {
      if (!isMe(p)) return undefined;
      const s = st(p);
      // next = ปุ่มที่ไฟกระพริบ (ขั้นแรก = สีตัวเอง · ลูป = ปุ่มถัดไป · ชาร์จ = สีตัวเอง)
      const next = s.armored ? (s.phase === "charge" ? OWN : null) : (s.phase === "loop" ? SEQ[s.idx] : canTransform(engine, p) ? OWN : null);
      return {
        own: OWN, form: FORM, armored: !!s.armored, phase: s.phase, step: s.idx, steps: SEQ.length, pulls: s.pulls, pullsMax: FINISH_PULLS, next,
        canTransform: canTransform(engine, p), canFinish: canFinish(engine, p), canRevert: canRevert(engine, p),
        armorImg: IMG.armor, faceImg: IMG.face,
      };
    },
    skillLocks(engine, p) {
      if (!isMe(p)) return undefined;
      return { basic: { locked: true, free: true }, secondary: { locked: st(p).phase !== "standby" } };
    },
  };
}

module.exports = { makeOhger, SFX, SEQ, FINISH_AREA, NUM, FINISH_PULLS, HUMAN_REGEN, ARMOR_ATK };
