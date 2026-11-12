// ============================================================
//  ไรเดอร์ ZECT — แกนร่วมของ 4 ตัว (ง่าย · ไม่ unique — GRID_PLAN §7.28)
//    daisuke (Drake · Rider Shooting) · yaguruma (TheBee · Rider Sting) · kagami (Gatack · Rider Kick) · tsurugi (Sasword · Rider Slash)
//  ต้นฉบับยุคไพ่: repo Phujimaru/game_Echo characters/_zect.js — ย้ายมากระดานตามคำตัดสินผู้ใช้ 2026-11-07
//
//  ร่าง: คน (ยังไม่แปลงร่าง — ปุ่มเดียว Henshin) → Masked (PUT ON) ⇄ Rider (CAST OFF)
//    คน: เดิน 4 เกราะ 3 · PUT ON: เดิน 3 เกราะสูงสุด 5 ฟื้นปกติ ฟื้นพลังชีวิต 2 ทุก 3 เทิร์นติดกัน
//    CAST OFF: เดิน 5 เกราะสูงสุด 3 ไม่ฟื้น พลังโจมตี +1
//  Clock Up (สกิลรอง · 2 แต้ม · คูลดาวน์ 2 เทิร์น · ต้อง CAST OFF) — ระบบกลาง server/clockUp.js
//    ตาตัวเอง = useSkill · นอกตา (แทรก/เข้าร่วม) = charAction "zect:clock" (ปุ่มลอยบน HUD)
//  สกิลติดตัว Zect: ระหว่าง Clock Up หลบ 25% · ตีคนที่ Clock Up ด้วยกัน +1
//  ท่าไม้ตาย (ต้อง CAST OFF · คูลดาวน์ 2 เทิร์น) ต่างกันตามตัว — cfg.ult: "shooting" | "sting" | "kick" | "slash"
//
//  Claude ตัดสินเอง (GRID_PLAN §7.28): Clock Up/ท่าไม้ตายต้อง CAST OFF ตามกติกาเดิม · CAST OFF ตัดเกราะเกิน 3 ·
//    วีดีโอแปลงร่าง/CAST OFF/Clock Up เล่นครั้งแรกต่อเกม (รอบหลัง Clock Up ใช้เสียงจาก clock_up.mp4) · คลิปท่าไม้ตายเล่นทุกครั้ง
// ============================================================

// เวลาตาเดิน (อ่านตอนเรียก — server/constants ← _transforms ← โมดูลนี้ require วนกัน)
const actionTime = () => require("../server/constants").ACTION_TIME;
const PassiveSeal = require("../server/passiveSeal"); // ลบสกิลติดตัว (server/passiveSeal.js)

const ZECT_IDS = new Set(["daisuke", "yaguruma", "kagami", "tsurugi"]);
const MOV = { human: null, putOn: 3, castOff: 5, clock: 7 };
const ARMOR = { putOn: 5, castOff: 3 };
const CAST_OFF_ATK = 1;
const PUT_ON_HEAL = 2;
const PUT_ON_EVERY = 3;
const CLOCK_COST = 2;
const CLOCK_CD = 2;
const CLOCK_HITS = 2;
const ULT_CD = 2;
const ZECT_DODGE = 25;
const MIRROR_ATK = 1;
const SHOOT = { atk: 1, strip: 1 };
const STING = { atk: 1, poison: 3, decay: 2 };
const KICK = { steps: [1, 1, 3], atk: 1, shock: 5, chaa: 3, pierceCap: 3 };
const SLASH = { second: 1, poison: 3 };

const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
// คูลดาวน์ N เทิร์น = เว้นเต็ม N เทิร์นถัดไป (กดเทิร์น R → กดได้อีกเทิร์น R + N + 1)
const cdReady = (engine, n) => engine.roundNumber + n + 1;

function fresh() {
  return {
    henshin: false, castOff: false, modeAt: 0, putOnTurns: 0,
    clockReady: 0, ultReady: 0,
    kick: 0, kickArmed: false, kickAt: 0, kickClip: false,
    slash: false, slashAt: 0,
    endAfter: false, clockClipShown: false, armed: null, armClip: null, armAt: 0,
  };
}

function makeZect(cfg) {
  const ID = cfg.id;
  const DIR = `/characters/${ID}`;
  const IMG = Object.fromEntries(Object.entries(cfg.img).map(([k, f]) => [k, `${DIR}/${f}`]));
  const VIDEO = Object.fromEntries(Object.entries(cfg.video).map(([k, f]) => [k, `${DIR}/${f}`]));
  const CUT = Object.fromEntries(Object.keys(cfg.video).map((k) => [k, `${ID}_${k}`]));
  const isMe = (p) => !!p && p.characterId === ID && !p.summon;
  const st = (p) => p.zect || (p.zect = fresh());
  const castOff = (p) => isMe(p) && st(p).henshin && st(p).castOff;
  const inClock = (engine, p) => !!engine.clockUp.activeMember(p);

  function clipOnce(engine, p, key) {
    if (p.cutsceneShown[key]) return false;
    p.cutsceneShown[key] = true;
    engine.queueCutscene(p, key);
    return true;
  }
  const log = (engine, msg) => engine.log(msg);

  // ---------- ร่าง ----------
  function setCastOff(engine, p, on) {
    const s = st(p);
    s.castOff = on;
    s.modeAt = engine.severStamp();
    s.putOnTurns = 0;
    if (on && p.armor > ARMOR.castOff) p.armor = ARMOR.castOff;
  }

  // ---------- Clock Up ----------
  const clockOpts = () => ({ kind: "zect", secs: actionTime(), max: CLOCK_HITS, music: "full_force" });
  function clockReadyFor(engine, p) {
    const s = st(p);
    return s.henshin && s.castOff && cdLeft(s.clockReady, engine.roundNumber) === 0 && (p.skillPoints || 0) >= CLOCK_COST
      && !((p.statuses.noskill || 0) > 0) && !engine.stuck(p);
  }
  function payClock(engine, p) {
    const s = st(p);
    p.skillPoints -= CLOCK_COST;
    s.clockReady = cdReady(engine, CLOCK_CD);
  }
  // คลิป Clock Up เล่นทุกครั้งที่กด (ผู้ใช้สั่ง 2026-11-07)
  function clockClip(engine, p) {
    engine.queueCutscene(p, CUT.clockUp);
    return true;
  }
  function canClockOffTurn(engine, p) {
    return isMe(p) && p.alive && clockReadyFor(engine, p) && !!engine.clockUp.canEnter(p);
  }
  function clockOffTurn(engine, p) {
    if (!canClockOffTurn(engine, p)) return false;
    // ท่าที่กดนอกตาตัวเอง: Return to Zero ของโจรุโน่ยกเลิกได้ก่อนเสียอะไร (แบบดิโอ)
    if (engine.timeStop.denyPress(p)) return true;
    const how = engine.clockUp.canEnter(p);
    payClock(engine, p);
    engine.skillFlash({ name: "Clock Up", img: IMG.clock, by: p.name, color: engine.colorOf(p) });
    log(engine, `⏱️ ${p.name} Clock Up${how === "join" ? " — เข้าร่วม" : " — แทรกเวลา"}`);
    engine.clockUp.enter(p, clockOpts());
    if (how === "join" && clockClip(engine, p)) engine.pausePlayingForCutscene();
    return true;
  }

  // ---------- ท่าไม้ตาย ----------
  const ult = cfg.ult;
  // ระหว่าง Clock Up ท่าไม้ตายทุกท่า = กดแล้วเป็นบัฟของตีปกติครั้งถัดไป ไม่ต้องเลือกช่อง (ผู้ใช้สั่ง 2026-11-07)
  //  คลิปเล่นตอนตีลง (preAttackClip) · นับเป็นการตีครั้งนั้นเอง · Rider Kick เป็นแบบชาร์จแล้วเสริมตีปกติอยู่แล้ว
  //  นอก Clock Up: Shooting/Sting/Slash ตีเป้าทันที (Slash นับครั้งแรก)
  const clockOn = (p) => !!require("../server/clockUp").activeMember(p);
  const buffMode = (p) => ult !== "kick" && clockOn(p);
  const ULT_NAME = { shooting: "Rider Shooting", sting: "Rider Sting", kick: "Rider Kick", slash: "Rider Slash" }[ult];
  const ultHits = (p) => !buffMode(p) && (ult === "shooting" || ult === "sting" || (ult === "slash" && !st(p).slash));
  const ultArea = { shooting: { kind: "line", len: 5, width: 1, hostile: true }, sting: { kind: "target", range: 1, hostile: true }, kick: { kind: "self" }, slash: { kind: "target", range: 1, hostile: true } }[ult];

  // ท่าไม้ตายที่เป็นสกิล: เอฟเฟกต์บนกระดานหลังคลิปจบ (client/src/board/zectFx.js)
  function ultFx(engine, p, kind, t, extra) {
    if (!t || !t.pos || !p.pos) return;
    const data = { kind, from: { ...p.pos }, to: { ...t.pos }, ...(extra || {}) };
    engine.deferAfterCutscene(() => engine.boardFx("zectFx", data));
  }
  function foes(engine, p, ids) {
    return (ids || []).map((id) => engine.players[id]).filter((t) => t && t.alive && t.pos && t.id !== p.id && !engine.sameTeam(p, t));
  }
  function nearest(engine, p, list) {
    const d = (t) => Math.abs(t.pos.x - p.pos.x) + Math.abs(t.pos.y - p.pos.y);
    return list.slice().sort((a, b) => d(a) - d(b))[0] || null;
  }
  function useUlt(engine, p, targets) {
    const s = st(p);
    const r = engine.roundNumber;
    if (buffMode(p)) {
      s.armed = ult;
      s.armAt = engine.severStamp();
      s.slash = false;
      s.ultReady = cdReady(engine, ULT_CD);
      engine.sfx("zect_kick_charge");
      log(engine, `⚡ ${p.name} ${ULT_NAME} — ตีปกติครั้งถัดไป`);
      return;
    }
    if (ult === "shooting") {
      const t = nearest(engine, p, foes(engine, p, targets));
      s.ultReady = cdReady(engine, ULT_CD);
      engine.queueCutscene(p, CUT.rider);
      if (!t) return;
      ultFx(engine, p, "zUltShoot", t);
      if (engine.skillDodge(p, t, "Rider Shooting")) return;
      const strip = Math.min(SHOOT.strip, t.armor || 0);
      if (strip > 0) { t.armor -= strip; log(engine, `🔫 ${p.name} Rider Shooting ล้างเกราะ ${t.name} ${strip}`); }
      engine.skillStrike(p, t, "Rider Shooting", { bonus: SHOOT.atk, sure: true });
      return;
    }
    if (ult === "sting") {
      const t = foes(engine, p, targets)[0];
      s.ultReady = cdReady(engine, ULT_CD);
      engine.queueCutscene(p, CUT.rider);
      if (t) ultFx(engine, p, "zUltSting", t);
      if (!t || engine.skillDodge(p, t, "Rider Sting")) return;
      if ((t.statuses.resist || 0) > 0) {
        delete t.statuses.resist;
        if (t.statusAmt) delete t.statusAmt.resist;
        log(engine, `🐝 ${p.name} Rider Sting ล้างต้านสถานะของ ${t.name}`);
      }
      engine.skillStrike(p, t, "Rider Sting", { bonus: STING.atk, sure: true });
      if (t.alive) {
        if (engine.applyPoison(t, STING.poison)) log(engine, `🐝 ${t.name} ติดพิษร้าย ${STING.poison} เทิร์น`);
        if (engine.applyDebuff(t, "decay", null, STING.decay)) log(engine, `🐝 ${t.name} ติดผุพัง ${STING.decay} เทิร์น`);
      }
      return;
    }
    if (ult === "kick") {
      s.kick += 1;
      s.kickAt = engine.severStamp();
      if (s.kick >= KICK.steps.length) {
        s.kickArmed = true;
        engine.queueCutscene(p, CUT.kickThree);
        log(engine, `⚡ ${p.name} Rider Kick — ชาร์จครบ`);
      } else {
        if (s.kick === 1) engine.queueCutscene(p, CUT.kickOne);
        else engine.sfx("zect_kick_charge");
        log(engine, `⚡ ${p.name} Rider Kick — ชาร์จ ${s.kick}/${KICK.steps.length}`);
      }
      return;
    }
    if (ult === "slash") {
      const t = foes(engine, p, targets)[0];
      if (!s.slash) {
        s.slash = true;
        s.slashAt = engine.severStamp();
        engine.queueCutscene(p, CUT.slashFirst);
        if (t) ultFx(engine, p, "zUltSlash", t);
        if (!t || engine.skillDodge(p, t, "Rider Slash")) return;
        const gone = engine.stripLatestBuff(t);
        if (gone) log(engine, `🦂 ${p.name} Rider Slash ปาดบัฟ ${gone} ของ ${t.name}`);
        engine.skillStrike(p, t, "Rider Slash", { sure: true });
        return;
      }
      s.slash = false;
      s.ultReady = cdReady(engine, ULT_CD);
      engine.queueCutscene(p, CUT.slashFinal);
      if (t) ultFx(engine, p, "zUltSlash", t, { final: true });
      if (!t || engine.skillDodge(p, t, "Rider Slash")) return;
      engine.dealMixed(t, SLASH.second, true);
      log(engine, `🦂 ${p.name} Rider Slash → ${t.name} -${SLASH.second} (ลดเกราะก่อน)`);
      if (t.alive && t.hp <= 0) engine.instantDeath(t);
      if (!t.alive) { t.pos = null; return; }
      if (engine.applyPoison(t, SLASH.poison)) log(engine, `🦂 ${t.name} ติดพิษร้าย ${SLASH.poison} เทิร์น`);
    }
    void r;
  }

  const mod = {
    id: ID, IMG, VIDEO, CUT, ZECT: true,
    CLOCK_COST, CLOCK_CD, CLOCK_HITS, ULT_CD, ZECT_DODGE, KICK, ARMOR, MOV,
    resetCombat(p) { if (isMe(p)) p.zect = fresh(); },
    isCastOff: castOff,

    // ---------- หน้าตา ----------
    displayImg(p) {
      if (!isMe(p)) return null;
      const s = st(p);
      return !s.henshin ? null : s.castOff ? IMG.castOff : IMG.putOn;
    },
    characterPub(engine, p) {
      if (!isMe(p) || !st(p).henshin) return null;
      return { name: cfg.rider, img: st(p).castOff ? IMG.castOff : IMG.putOn };
    },
    // มองไม่เห็น (หมอก/พุ่มหญ้า): แปลงร่างแล้ว = ร่าง Masked เสมอ (ไม่บอก PUT ON/CAST OFF · ไม่ย้อนเป็นภาพคน)
    unseenLook(p) {
      if (!isMe(p) || !st(p).henshin) return null;
      return { img: IMG.putOn, name: cfg.rider };
    },
    skillHidden(p, tier) { return tier !== "basic" && !st(p).henshin; },
    skillPub(p, tier) {
      const s = st(p);
      if (tier === "basic") {
        if (!s.henshin) return { name: "Henshin", img: IMG.putOn, desc: `แปลงร่างเป็น ${cfg.rider} (Masked Form)` };
        return s.castOff
          ? { name: "PUT ON", img: IMG.putOn }
          : { name: "CAST OFF", img: IMG.castOff };
      }
      if (tier === "ultimate" && ult === "kick") {
        const step = Math.min(s.kick, KICK.steps.length - 1);
        return s.kickArmed ? { name: "Rider Kick ✓" } : { name: `Rider Kick ${s.kick}/${KICK.steps.length}`, cost: KICK.steps[step] };
      }
      if (tier === "ultimate" && s.armed) return { name: `${ULT_NAME} ✓` };
      if (tier === "ultimate" && ult === "slash" && s.slash) return { name: "Rider Slash 2", cost: 0 };
      return null;
    },
    skillArea(p, tier, area) { return tier !== "ultimate" ? area : buffMode(p) ? { kind: "self" } : ultArea; },
    skillCost(p, tier, base) {
      const s = st(p);
      if (tier === "basic") return 0;
      if (tier === "secondary") return CLOCK_COST;
      if (ult === "kick") return KICK.steps[Math.min(s.kick, KICK.steps.length - 1)];
      if (ult === "slash" && s.slash && !buffMode(p)) return 0;
      return base;
    },
    skillFree(p, tier) { return tier === "basic" || (tier === "ultimate" && ult === "slash" && st(p).slash); },
    // Clock Up ไม่กินโควตา — ใช้ท่าไม้ตายต่อในช่วง Clock Up ได้ (Rider Slash/Shooting)
    skipsTurnQuota(p, tier) { return tier === "basic" || tier === "secondary" || (tier === "ultimate" && (ult === "kick" || (ult === "slash" && st(p).slash))); },
    ignoresTurnQuota(p, tier) { return tier === "basic" || (tier === "ultimate" && (ult === "kick" || (ult === "slash" && st(p).slash))); },
    keepsMove(engine, p, tier) {
      if (tier === "basic" || tier === "secondary") return true;
      return ult === "kick" || ult === "slash" || buffMode(p);
    },
    silentFlash(p, tier) { return tier === "basic" || tier === "secondary"; },
    skillSound() { return null; },
    endsTurn(engine, p, tier) {
      if (tier !== "ultimate" || !ultHits(p)) return false;
      const m = engine.clockUp.activeMember(p);
      return !!m && m.hits + 1 >= m.max;
    },

    canUseSkill(engine, p, tier, targets) {
      const s = st(p);
      if (tier === "basic") return !s.henshin || !inClock(engine, p);
      if (!s.henshin) return false;
      if (tier === "secondary") return clockReadyFor(engine, p) && !inClock(engine, p) && !engine.clockUp.active();
      if (tier === "ultimate") {
        if (!s.castOff) return false;
        if (ult === "kick") return !s.kickArmed && cdLeft(s.ultReady, engine.roundNumber) === 0;
        if (buffMode(p)) return !s.armed && cdLeft(s.ultReady, engine.roundNumber) === 0;
        if (ult === "slash" && s.slash) return foes(engine, p, targets).length > 0;
        if (cdLeft(s.ultReady, engine.roundNumber) > 0) return false;
        return ult === "shooting" ? true : foes(engine, p, targets).length > 0;
      }
      return false;
    },
    applyInstantSkill(engine, p, tier, targets) {
      const s = st(p);
      if (tier === "basic") {
        if (!s.henshin) {
          s.henshin = true;
          s.castOff = false;
          s.modeAt = engine.severStamp();
          clipOnce(engine, p, CUT.henshin);
          engine.skillFlash({ name: "Henshin", img: IMG.putOn, by: p.name, color: engine.colorOf(p) });
          log(engine, `🪲 ${p.name} Henshin — ${cfg.rider}`);
          return "";
        }
        const on = !s.castOff;
        setCastOff(engine, p, on);
        if (on) clipOnce(engine, p, CUT.castOff);
        engine.skillFlash({ name: on ? "CAST OFF" : "PUT ON", img: on ? IMG.castOff : IMG.putOn, by: p.name, color: engine.colorOf(p) });
        log(engine, `🪲 ${p.name} ${on ? "CAST OFF — Rider Form" : "PUT ON — Masked Form"}`);
        return "";
      }
      if (tier === "secondary") {
        s.clockReady = cdReady(engine, CLOCK_CD);
        engine.skillFlash({ name: "Clock Up", img: IMG.clock, by: p.name, color: engine.colorOf(p) });
        clockClip(engine, p);
        engine.clockUp.start(p, clockOpts());
        log(engine, `⏱️ ${p.name} Clock Up`);
        return "";
      }
      if (tier === "ultimate") {
        const counts = ultHits(p);
        useUlt(engine, p, targets);
        if (counts) engine.clockUp.countHit(p);
      }
      return "";
    },

    // ---------- ตาเดิน ----------
    mov(p) {
      if (!isMe(p)) return null;
      const s = st(p);
      if (!s.henshin) return null;
      if (require("../server/clockUp").activeMember(p)) return MOV.clock;
      return s.castOff ? MOV.castOff : MOV.putOn;
    },
    maxArmor(p, base) {
      if (!isMe(p)) return base;
      const s = st(p);
      return !s.henshin ? base : s.castOff ? ARMOR.castOff : ARMOR.putOn;
    },
    blocksArmorRegen(p) { return castOff(p); },
    damageBonus(engine, attacker, target) {
      if (!isMe(attacker)) return 0;
      const s = st(attacker);
      // สกิลติดตัว Zect: ตีคนที่ Clock Up ด้วยกัน +1 (ลบสกิลติดตัว = ไม่ได้)
      const mirror = PassiveSeal.on(attacker) && inClock(engine, attacker) && target && engine.clockUp.activeMember(target) ? MIRROR_ATK : 0;
      const armed = s.armed === "shooting" ? SHOOT.atk : s.armed === "sting" ? STING.atk : 0;
      return (castOff(attacker) ? CAST_OFF_ATK : 0) + mirror + (s.kickArmed ? KICK.atk : 0) + armed;
    },
    attackFxNames(p) {
      const s = st(p), out = [];
      if (castOff(p)) out.push(`CAST OFF +${CAST_OFF_ATK}`);
      if (s.kickArmed) out.push("Rider Kick");
      if (s.armed) out.push(ULT_NAME);
      return out;
    },
    // ท่าตี/เสียงตีปกติเฉพาะตัว (client/src/board/zectFx.js · client/public/characters/zect/atk_*.m4a)
    attackStyle(p) {
      if (!isMe(p)) return null;
      const s = st(p);
      if (s.armed === "shooting") return "zDrakeUlt";
      if (s.kickArmed) return "zKick";
      return s.henshin ? cfg.style : null;
    },
    attackSound(p) { return isMe(p) && st(p).henshin ? cfg.sound : undefined; },
    // สกิลติดตัว Zect: หลบ 25% ระหว่าง Clock Up (ลบสกิลติดตัว = ไม่ได้)
    ownEvade(p) { return isMe(p) && p.alive && PassiveSeal.on(p) && p.zect && p.zect.henshin && require("../server/clockUp").activeMember(p) ? ZECT_DODGE : 0; },

    // Rider Kick: ตีปกติครั้งถัดไป
    strikePierces(engine, attacker, target) { return isMe(attacker) && st(attacker).kickArmed && !!target && (target.statuses.resist || 0) > 0; },
    damageCap(engine, p, kind) {
      if (!isMe(p) || !(kind === "strike" || engine.inStrike())) return null;
      const s = st(p);
      return s.kickArmed && s.kickPierce ? KICK.pierceCap : null;
    },
    beforeStrikeHit(engine, attacker, target) {
      if (!isMe(attacker)) return [];
      const s = st(attacker);
      s.kickPierce = s.kickArmed && !!target && (target.statuses.resist || 0) > 0;
      if (s.kickPierce) return ["Rider Kick ทะลุเกราะ"];
      if (!s.armed || !target || !target.alive) return [];
      // ท่าไม้ตายเสริมตีปกติ (Clock Up): ผลก่อนดาเมจเหมือนท่าเดิม
      if (s.armed === "shooting" && (target.armor || 0) > 0) {
        const strip = Math.min(SHOOT.strip, target.armor);
        target.armor -= strip;
        return [`ล้างเกราะ ${strip}`];
      }
      if (s.armed === "sting" && (target.statuses.resist || 0) > 0) {
        delete target.statuses.resist;
        if (target.statusAmt) delete target.statusAmt.resist;
        return ["ล้างต้านสถานะ"];
      }
      if (s.armed === "slash") {
        const gone = engine.stripLatestBuff(target);
        return gone ? [`ปาดบัฟ ${gone}`] : [];
      }
      return [];
    },
    onStrikeLanded(engine, attacker, target) {
      if (!isMe(attacker)) return [];
      const s = st(attacker);
      if (s.armed === "sting" && target && target.alive) {
        const out = [];
        if (engine.applyPoison(target, STING.poison)) out.push(`พิษร้าย ${STING.poison} เทิร์น`);
        if (engine.applyDebuff(target, "decay", null, STING.decay)) out.push(`ผุพัง ${STING.decay} เทิร์น`);
        return out;
      }
      if (!s.kickArmed || !target || !target.alive || s.kickPierce) return [];
      const names = [];
      if (engine.applyShock(target, KICK.shock)) names.push(`ช็อต ${KICK.shock} เทิร์น`);
      if (engine.applyDebuff(target, "chaa", null, KICK.chaa)) names.push(`ชา ${KICK.chaa} เทิร์น`);
      return names;
    },
    onStrikeResolved(engine, attacker, target, res, { counter } = {}) {
      if (!isMe(attacker) || counter) return;
      const s = st(attacker);
      if (s.armed) {
        const kind = s.armed;
        s.armed = null;
        if (res && res.dodge) return;
        s.armClip = kind === "slash" ? CUT.slashFinal : CUT.rider;
        // เอฟเฟกต์ท่าไม้ตายตรงจังหวะปะทะ · Rider Slash: ฟันที่สองตามหลังตีปกติ (ลดเกราะก่อน) + พิษร้าย
        const fxKind = { shooting: "zUltShoot", sting: "zUltSting", slash: "zUltSlash" }[kind];
        if (target && target.pos && attacker.pos) engine.boardFxAtHit("zectFx", { kind: fxKind, from: { ...attacker.pos }, to: { ...target.pos }, final: kind === "slash" });
        if (kind === "slash" && target && target.alive) {
          engine.dealMixed(target, SLASH.second, true);
          log(engine, `🦂 ${attacker.name} Rider Slash → ${target.name} -${SLASH.second} (ลดเกราะก่อน)`);
          if (target.alive && target.hp <= 0) engine.instantDeath(target);
          if (!target.alive) { target.pos = null; return; }
          if (engine.applyPoison(target, SLASH.poison)) log(engine, `🦂 ${target.name} ติดพิษร้าย ${SLASH.poison} เทิร์น`);
        }
        return;
      }
      if (!s.kickArmed) return;
      s.kickArmed = false;
      s.kickPierce = false;
      s.kick = 0;
      s.ultReady = cdReady(engine, ULT_CD);
      if (!res || !res.dodge) s.kickClip = true;
    },
    preAttackClip(engine, attacker) {
      if (!isMe(attacker)) return null;
      const s = st(attacker);
      if (s.armClip) { const k = s.armClip; s.armClip = null; return k; }
      if (!s.kickClip) return null;
      s.kickClip = false;
      return CUT.kickFinal;
    },
    // Rider Slash ครั้งสองไม่ได้กด = หมดไปกับตานั้น (เข้าคูลดาวน์)
    onActorEnd(engine, p) {
      if (!isMe(p)) return;
      const s = st(p);
      if (s.slash) { s.slash = false; s.ultReady = cdReady(engine, ULT_CD); }
      s.armed = null;
    },

    // ---------- จังหวะเทิร์น ----------
    onRoundStartTick(engine, p) {
      if (!isMe(p) || !p.alive) return;
      const s = st(p);
      if (!s.henshin || s.castOff) { s.putOnTurns = 0; return; }
      if (PassiveSeal.sealed(p)) return; // ลบสกิลติดตัว: ไม่นับเพิ่ม/ไม่ฟื้น (ค่าที่นับไว้ไม่หาย)
      s.putOnTurns += 1;
      if (s.putOnTurns < PUT_ON_EVERY) return;
      s.putOnTurns = 0;
      const got = engine.healHp(p, PUT_ON_HEAL);
      if (got > 0) log(engine, `🛡️ ${p.name} PUT ON — ฟื้นพลังชีวิต +${got}`);
    },

    // ---------- Clock Up นอกตา ----------
    charAction(engine, p, key) { return isMe(p) && key === "zect:clock" && clockOffTurn(engine, p); },
    onExtraTurn(engine, p, kind) {
      if (!isMe(p) || kind !== "clockUp") return;
      if (clockClip(engine, p)) engine.pausePlayingForCutscene();
    },
    onClockDone(engine, p, why) {
      if (!isMe(p)) return;
      st(p).armed = null; // ท่าไม้ตายเสริมตีปกติใช้ได้เฉพาะใน Clock Up
      engine.sfx("zect_clockover");
      void why;
    },

    // ---------- ผลสกิลที่ตัดได้ (server/sever.js) ----------
    severables(engine, p) {
      if (!isMe(p) || !p.alive) return [];
      const s = st(p), out = [];
      if (s.slash) out.push({ key: "slash", label: "Rider Slash", at: s.slashAt, cancel: () => { s.slash = false; s.ultReady = cdReady(engine, ULT_CD); } });
      if (s.armed) out.push({ key: "armed", label: ULT_NAME, at: s.armAt, cancel: () => { s.armed = null; } });
      if (s.kick > 0 || s.kickArmed) out.push({ key: "kick", label: "Rider Kick", at: s.kickAt, cancel: () => { s.kick = 0; s.kickArmed = false; } });
      if (s.henshin && s.castOff) out.push({ key: "castOff", label: "CAST OFF", at: s.modeAt, cancel: () => setCastOff(engine, p, false) });
      return out;
    },

    skillLocks(engine, p) {
      if (!isMe(p)) return undefined;
      const s = st(p), r = engine.roundNumber;
      const clock = engine.clockUp.activeMember(p);
      return {
        basic: { cd: 0, locked: s.henshin && !!clock },
        secondary: { cd: cdLeft(s.clockReady, r), locked: !s.castOff || !!clock },
        ultimate: { cd: ult === "kick" && s.kick > 0 ? 0 : cdLeft(s.ultReady, r), locked: !s.castOff || s.kickArmed || !!s.armed },
      };
    },
    // players[].zect — ปุ่ม Clock Up นอกตา (ZectClock.jsx)
    zectState(engine, p) {
      if (!isMe(p)) return undefined;
      const s = st(p);
      return {
        henshin: s.henshin, castOff: s.castOff, kick: s.kick, kickArmed: s.kickArmed, slash: s.slash,
        clockCd: cdLeft(s.clockReady, engine.roundNumber), clockCost: CLOCK_COST, img: IMG.clock,
        canClock: canClockOffTurn(engine, p),
      };
    },
  };
  return mod;
}

module.exports = { makeZect, ZECT_IDS };
