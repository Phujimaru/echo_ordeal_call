// ============================================================
//  useBoardEventFx — ส่วนของ BoardStage: เหตุการณ์ socket บนกระดาน (ชุดแรก)
//    ลำแสง Beam Magnum · คลื่นดาบ · คลื่นมืด · ยูนะ · เกรย์ · กิลกาเมช · ออพติมัส · โจรุโน่ · โอโตยะ
//    ธาตุ (ออร่า/ปฏิกิริยา/ระเบิด) · อรชุน · เฟิร์น · ไรโด ฮิคารุ · ขยายร่าง/พังสิ่งกีดขวาง
//    ย้ายมาจาก BoardStage.jsx ทั้งก้อน (โค้ดเดิม · ค่าที่ใช้ส่งมาทาง ctx)
// ============================================================
/* eslint-disable react-hooks/exhaustive-deps, react-hooks/immutability -- โค้ดย้ายมาจาก BoardStage ทั้งก้อน:
   ค่าใน ctx เป็น ref / setState / ฟังก์ชันของ BoardStage (ที่นั่น lint รู้ว่าคงที่) · รายการ deps เดิมตามต้นฉบับ */
import { useEffect, useLayoutEffect, useRef } from "react";
import * as Rules from "../boardRules";
import { socket } from "../../socket";
import { playSfx } from "../../audio";
import { BEAM_T, DARK_T, QUAKE_T } from "../boardDraw";
import { HK_BEAM } from "../hikaruFx";
import { YUNA_EVENT_FX } from "../yunaFx";
import { GRAY_BEAM, GRAY_EVENT_FX } from "../grayFx";
import { GIL_EVENT_FX, GIL_T } from "../gilFx";
import { FERN_EVENT_FX } from "../fernFx";
import { OT_ARC_HIT, OT_ARC_MS, OT_EVENT_FX } from "../optimusFx";
import { GIO_EVENT_FX, GIO_FX_DUR, GIO_REWIND_HIT, GIO_SLAM_HIT } from "../giornoFx";
import { BAKE_EVENT_FX, BAKE_FX_DUR } from "../bakeFx";
import { OBV_EVENT_FX, OBV_FX_DUR } from "../oberonFx";
import { ARJ_EVENT_FX } from "../arjunaBoardFx";
import { otoyaEventFx } from "../otoyaFx";
import { sameSide } from "../../duo";
import { key, samePos, sizeOfP, dimOf } from "./stageRules";

export default function useBoardEventFx(ctx) {
  const { boardRef, hitFx, hkPushTo, look, lowQ, prevPlayers, pushFx, setShake, state, timers } = ctx;
  // ลำแสง Beam Magnum (นักบินปริศนา) — server ส่งให้ทุกคน { from, dir, len, color } · ลำแสงเริ่มช่องติด from
  //  กล้องมุมใกล้ตามกลางแนวถ้าอยู่นอกจอ · จังหวะยิง (หลังชาร์จ) = จอสั่น/แฟลช
  useEffect(() => {
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const onBeam = (b) => {
      const v = b && DIRS[b.dir];
      if (!v || !b.from || !Number.isFinite(b.from.x) || !Number.isFinite(b.from.y)) return;
      pushFx([{ kind: "beam", x: b.from.x, y: b.from.y, dir: b.dir, len: b.len, color: b.color, tone: b.tone || null }]);
      const bd = boardRef.current || {}, half = Math.ceil((Number(b.len) || 6) / 2);
      const cl = (n, hi) => Math.max(0, Math.min(Math.max(0, (hi || 1) - 1), n));
      look({ x: cl(b.from.x + v[0] * half, bd.cols), y: cl(b.from.y + v[1] * half, bd.rows) });
      if (!lowQ) timers.current.push(setTimeout(() => setShake((n) => n + 1), BEAM_T.charge));
    };
    socket.on("beamFx", onBeam);
    return () => socket.off("beamFx", onBeam);
  }, [pushFx, look, lowQ]);

  // คลื่นดาบถล่ม (มุยมิ: ท่าไม้ตาย / ดาบสนิมระหว่างดาบสะบั้น) — { from, dir, len, width, color } · กล้องตามกลางแนว · จอสั่นตอนดาบแถวแรก/แถวท้ายปักพื้น
  useEffect(() => {
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const onQuake = (b) => {
      const v = b && DIRS[b.dir];
      if (!v || !b.from || !Number.isFinite(b.from.x) || !Number.isFinite(b.from.y)) return;
      const len = Number(b.len) || 4;
      pushFx([{ kind: "quake", x: b.from.x, y: b.from.y, dir: b.dir, len, width: b.width, color: b.color }]);
      const bd = boardRef.current || {}, half = Math.ceil(len / 2);
      const cl = (n, hi) => Math.max(0, Math.min(Math.max(0, (hi || 1) - 1), n));
      look({ x: cl(b.from.x + v[0] * half, bd.cols), y: cl(b.from.y + v[1] * half, bd.rows) });
      if (!lowQ) {
        timers.current.push(setTimeout(() => setShake((n) => n + 1), QUAKE_T.fall));
        if (len > 1) timers.current.push(setTimeout(() => setShake((n) => n + 1), QUAKE_T.fall + (len - 1) * QUAKE_T.stagger));
      }
    };
    socket.on("quakeFx", onQuake);
    return () => socket.off("quakeFx", onQuake);
  }, [pushFx, look, lowQ]);
  // คลื่นความมืด (กิระ) — { from, dir, len, width, color } · กล้องตามกลางแนว · จอสั่นตอนแถวแรกซัดลง
  useEffect(() => {
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const onDark = (b) => {
      const v = b && DIRS[b.dir];
      if (!v || !b.from || !Number.isFinite(b.from.x) || !Number.isFinite(b.from.y)) return;
      const len = Number(b.len) || 4;
      pushFx([{ kind: "darkWave", x: b.from.x, y: b.from.y, dir: b.dir, len, width: b.width, color: b.color }]);
      playSfx("kira_wave");
      const bd = boardRef.current || {}, half = Math.ceil(len / 2);
      const cl = (n, hi) => Math.max(0, Math.min(Math.max(0, (hi || 1) - 1), n));
      look({ x: cl(b.from.x + v[0] * half, bd.cols), y: cl(b.from.y + v[1] * half, bd.rows) });
      if (!lowQ) timers.current.push(setTimeout(() => setShake((n) => n + 1), DARK_T.rise));
    };
    socket.on("darkWaveFx", onDark);
    return () => socket.off("darkWaveFx", onDark);
  }, [pushFx, look, lowQ]);

  // ยูนะ: socket "yunaFx" { kind, at, from, to, r, song, ... } → เอฟเฟกต์บนกระดาน (yunaFx.js) · เสียงมาจาก server (sfx / skillFlash)
  useEffect(() => {
    const onYuna = (e) => {
      const kind = e && YUNA_EVENT_FX[e.kind];
      if (!kind) return;
      pushFx([{ ...e, kind, x: e.at ? e.at.x : e.to ? e.to.x : 0, y: e.at ? e.at.y : e.to ? e.to.y : 0 }]);
      if ((e.kind === "revive" || e.kind === "idol") && e.at) look(e.at);
      if (e.kind === "idol" && !lowQ) setShake((n) => n + 1);
    };
    socket.on("yunaFx", onYuna);
    return () => socket.off("yunaFx", onYuna);
  }, [pushFx, look, lowQ]);

  // เกรย์: socket "grayFx" { kind: keeper | grave | reap | beam, at, ... } → เอฟเฟกต์บนกระดาน (grayFx.js) · เสียง keeper/grave/reap มาจาก server
  //  beam (รองโกมิเนียต): เสียงลำแสง + กล้องตามกลางแนว · ดาเมจลงที่ GRAY_BEAM.hit = คนในแนวสั่น + จอสั่น/แฟลช + กล้องสั่นแรง
  const playersRef = useRef(state.players);
  useLayoutEffect(() => { playersRef.current = state.players; });
  useEffect(() => {
    const onGray = (e) => {
      const kind = e && GRAY_EVENT_FX[e.kind];
      if (!kind || !e.at || !Number.isFinite(e.at.x) || !Number.isFinite(e.at.y)) return;
      const f = { ...e, kind, x: e.at.x, y: e.at.y };
      if (e.kind === "beam") {
        const tiles = Array.isArray(e.tiles) ? e.tiles.filter((t) => t && Number.isFinite(t.x) && Number.isFinite(t.y)) : [];
        const set = new Set(tiles.map((t) => key(t.x, t.y)));
        const list = playersRef.current, caster = list.find((p) => p.alive && p.pos && samePos(p.pos, e.at)) || null;
        const ally = (p) => !!caster && (p.id === caster.id || sameSide(p, caster) || (!!caster.teamId && p.teamId === caster.teamId));
        f.hitIds = list.filter((p) => p.alive && p.pos && !ally(p) && (!caster || dimOf(p) === dimOf(caster)) && Rules.footprint(p.pos.x, p.pos.y, sizeOfP(p)).some((t) => set.has(key(t.x, t.y)))).map((p) => p.id);
        f.hitDelay = GRAY_BEAM.hit;
        playSfx("gray_beam");
        if (tiles.length) {
          const xs = tiles.map((t) => t.x), ys = tiles.map((t) => t.y);
          look({ x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2), y: Math.round((Math.min(...ys) + Math.max(...ys)) / 2) });
        } else look(e.at);
        if (!lowQ) {
          timers.current.push(setTimeout(() => setShake((n) => n + 1), GRAY_BEAM.hit));
          timers.current.push(setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: 9, dur: 1100 }]), GRAY_BEAM.hit));
          timers.current.push(setTimeout(() => setShake((n) => n + 1), GRAY_BEAM.hit + 650));
        }
      } else look(e.kind === "reap" && e.from ? e.from : e.at);
      pushFx([f]);
    };
    socket.on("grayFx", onGray);
    return () => socket.off("grayFx", onGray);
  }, [pushFx, look, lowQ]);

  // กิลกาเมช (Fake): socket "gilFx" { kind, id, at, ... } → gilFx.js · เสียงมาจาก server (engine.sfx)
  //  gate = กล้องตามกิล · volleyEnd = คนที่คุกเข่า (knelt ids → ตำแหน่ง) · bolts/storm = จอสั่น · enuma = กล้องตามกลางแนว + จอสั่นตอนลำแสงออก
  useEffect(() => {
    const onGil = (e) => {
      const kind = e && GIL_EVENT_FX[e.kind];
      if (!kind || !e.at || !Number.isFinite(e.at.x) || !Number.isFinite(e.at.y)) return;
      const f = { ...e, kind, x: e.at.x, y: e.at.y };
      const list = playersRef.current;
      if (e.kind === "gate") look(e.at);
      if (e.kind === "volleyEnd") {
        f.kneelAt = (e.knelt || []).map((id) => list.find((p) => p.id === id && p.pos)).filter(Boolean).map((p) => ({ x: p.pos.x, y: p.pos.y }));
      }
      if (e.kind === "shot" && e.big && !lowQ) timers.current.push(setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: 7, dur: 600 }]), GIL_T.travelBig));
      if ((e.kind === "bolts" || e.kind === "storm") && !lowQ) setShake((n) => n + 1);
      if (e.kind === "enuma") {
        const tiles = Array.isArray(e.tiles) ? e.tiles.filter((t) => t && Number.isFinite(t.x) && Number.isFinite(t.y)) : [];
        if (tiles.length) {
          const xs = tiles.map((t) => t.x), ys = tiles.map((t) => t.y);
          look({ x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2), y: Math.round((Math.min(...ys) + Math.max(...ys)) / 2) });
        } else look(e.at);
        if (!lowQ) {
          timers.current.push(setTimeout(() => setShake((n) => n + 1), GIL_T.enumaHit));
          timers.current.push(setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: 12, dur: 1600 }]), GIL_T.enumaHit));
        }
      }
      pushFx([f]);
    };
    socket.on("gilFx", onGil);
    return () => socket.off("gilFx", onGil);
  }, [pushFx, look, lowQ]);

  // รถบรรทุกเก่า / ออพติมัส ไพร์ม: socket "optimusFx" { kind: arc | transform | stance | heal, id, at, dir?, tiles?, form? } → optimusFx.js
  //  เสียงมาจาก server (engine.sfx — characters/old_truck.js) · ท่าไม้ตาย: กล้องตามกลางวง + จอสั่นตอนคลื่นปะทะ
  useEffect(() => {
    const onOt = (e) => {
      const kind = e && OT_EVENT_FX[e.kind];
      if (!kind || !e.at || !Number.isFinite(e.at.x) || !Number.isFinite(e.at.y)) return;
      const p = e.id != null ? playersRef.current.find((q) => q.id === e.id) : null;
      look(e.at);
      pushFx([{ ...e, kind, x: e.at.x, y: e.at.y, size: p ? sizeOfP(p) : 1 }]);
      if (kind === "otArc" && !lowQ) timers.current.push(setTimeout(() => setShake((n) => n + 1), OT_ARC_HIT * OT_ARC_MS));
    };
    socket.on("optimusFx", onOt);
    return () => socket.off("optimusFx", onOt);
  }, [pushFx, look, lowQ]);
  // โจรุโน่: socket "giornoFx" { kind, id, at, size, toAt?, to?, tiles?, attacker?, from?, back?, gioAt?, seconds? } → giornoFx.js · เสียงมาจาก server (characters/giorno_giovanna.js)
  useEffect(() => {
    const onGio = (e) => {
      const kind = e && GIO_EVENT_FX[e.kind];
      if (!kind || !e.at || !Number.isFinite(e.at.x) || !Number.isFinite(e.at.y)) return;
      // Return to Zero: กล้องตามผู้โจมตีที่ถูกย้อน · เล่นตามเวลาที่ server ส่ง
      const rew = kind === "gioRewind", dur = rew && e.seconds > 0 ? e.seconds * 1000 : GIO_FX_DUR[kind];
      look(rew && e.from ? e.from : e.at);
      pushFx([{ ...e, kind, x: e.at.x, y: e.at.y, size: e.size || 1, dur }]);
      if (kind === "gioMuda" && !lowQ) timers.current.push(setTimeout(() => setShake((n) => n + 1), 500));
      // จอสั่นเบาแบบเลื่อนกล้อง 1 ครั้ง (iceShake — setShake มีแฟลชเต็มจอ ห้ามใช้กับฉากนี้)
      if (rew || kind === "gioSlam") timers.current.push(setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: rew ? 5 : 6, dur: 420 }]), (rew ? GIO_REWIND_HIT : GIO_SLAM_HIT) * dur));
    };
    hitFx.current.giornoFx = onGio;
    socket.on("giornoFx", onGio);
    return () => socket.off("giornoFx", onGio);
  }, [pushFx, look, lowQ]);
  // เค็นโซ ซุกะ: socket "bakeFx" { kind, id, at, targetId?, n? } → bakeFx.js · corrode/decay มาตอนปะทะ (boardFxAtHit → hitFx)
  //  เสียงการกัดกิน/ผุพัง/ได้ยิงอีกครั้งเล่นที่นี่ (ไม่มีคลิปในจังหวะนั้น) · แปลงร่าง/คืนร่าง เสียงมาจาก server
  useEffect(() => {
    const onBake = (e) => {
      const kind = e && BAKE_EVENT_FX[e.kind];
      if (!kind || !e.at || !Number.isFinite(e.at.x) || !Number.isFinite(e.at.y)) return;
      pushFx([{ kind, x: e.at.x, y: e.at.y, size: e.size || 1, n: e.n | 0, dur: BAKE_FX_DUR[kind] }]);
      if (kind === "bakeCorrode") playSfx("bake_corrode");
      else if (kind === "bakeDecay") playSfx("bake_decay");
      else if (kind === "bakeAgain") playSfx("bake_again");
    };
    hitFx.current.bakeFx = onBake;
    socket.on("bakeFx", onBake);
    return () => socket.off("bakeFx", onBake);
  }, [pushFx]);
  // โอเบรอน (วอร์ติเกิร์น): socket "oberonFx" { kind, id, at, targets?, hits?, mode?, n?, reason? } → oberonFx.js
  //  swallow/release/lie = ฉากใหญ่ทั้งกระดาน (จอสั่น) · เสียงมาจาก server (ผู้ใช้จะส่งเสียงจริงมาภายหลัง)
  useEffect(() => {
    const onObv = (e) => {
      const kind = e && OBV_EVENT_FX[e.kind];
      if (!kind || !e.at || !Number.isFinite(e.at.x) || !Number.isFinite(e.at.y)) return;
      const f = { kind, x: e.at.x, y: e.at.y, size: e.size || 1, n: e.n | 0, mode: e.mode || null, dur: OBV_FX_DUR[kind] };
      if (Array.isArray(e.targets)) f.targets = e.targets;
      if (Array.isArray(e.hits)) f.hits = e.hits;
      const out = [f];
      if (kind === "obvSwallow" || kind === "obvLie") out.push({ kind: "iceShake", x: 0, y: 0, amp: kind === "obvLie" ? 9 : 7, dur: kind === "obvLie" ? 1400 : 1100 });
      pushFx(out);
    };
    hitFx.current.oberonFx = onObv;
    socket.on("oberonFx", onObv);
    return () => socket.off("oberonFx", onObv);
  }, [pushFx]);
  // คุเรไน โอโตยะ: socket "otoyaFx" { kind, id, at, size, to?, targetId?, tsize?, n? } → otoyaFx.js · เสียงมาจาก server
  useEffect(() => {
    const onOtoya = (e) => {
      const f = otoyaEventFx(e);
      if (!f || !e.at || !Number.isFinite(e.at.x) || !Number.isFinite(e.at.y)) return;
      look(e.kind === "trap" || e.kind === "seal" ? e.to || e.at : e.at);
      pushFx([f]);
      if ((e.kind === "henshin" || e.kind === "trap") && !lowQ) timers.current.push(setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: 4, dur: 360 }]), 300));
    };
    socket.on("otoyaFx", onOtoya);
    return () => socket.off("otoyaFx", onOtoya);
  }, [pushFx, look, lowQ]);
  // ระบบธาตุ (server/element.js · elementFx.js): ติดคราบ · ปฏิกิริยา (ฉาก + ป้ายชื่อ) · ระเบิดธาตุ
  useEffect(() => {
    const posOf = (id) => { const q = playersRef.current.find((u) => u.id === id); return q && q.pos ? { x: q.pos.x, y: q.pos.y, size: sizeOfP(q) } : null; };
    const onAura = (e) => { const t = e && posOf(e.id); if (t) pushFx([{ kind: "elAura", at: t, x: t.x, y: t.y, size: t.size, el: e.el }]); };
    const onReact = (e) => {
      if (!e || !e.at || !Number.isFinite(e.at.x)) return;
      const ringAt = (e.ring || []).map(posOf).filter(Boolean);
      // ลูกโซ่ (server/element.js): ทอดที่ step เล่นหลังทอดก่อนหน้า · เส้นธาตุวิ่งจากตัวก่อนหน้า (จับตำแหน่งตอนรับ — คนตายจะหายจากกระดานทีหลัง)
      if (e.chainFrom) {
        const from = posOf(e.chainFrom);
        const fxs = [
          ...(from ? [{ kind: "elLink", a: e.a, b: e.b, from, to: { x: e.at.x, y: e.at.y, size: e.size || 1 }, x: e.at.x, y: e.at.y, size: e.size || 1 }] : []),
          { kind: "elReact", rx: e.key, a: e.a, b: e.b, at: e.at, x: e.at.x, y: e.at.y, size: e.size || 1, ringAt },
          { kind: "elName", name: e.name, a: e.a, b: e.b, at: e.at, x: e.at.x, y: e.at.y, size: e.size || 1 },
        ];
        // เสียงทอดลูกโซ่เล่นที่นี่ตามจังหวะภาพ (server เล่นเฉพาะทอดแรก)
        timers.current.push(setTimeout(() => { pushFx(fxs); playSfx(`elem_${e.key}`); }, 420 * Math.max(1, e.step | 0)));
        return;
      }
      look(e.at);
      pushFx([
        { kind: "elReact", rx: e.key, a: e.a, b: e.b, at: e.at, x: e.at.x, y: e.at.y, size: e.size || 1, ringAt },
        { kind: "elName", name: e.name, a: e.a, b: e.b, at: e.at, x: e.at.x, y: e.at.y, size: e.size || 1 },
      ]);
      // จอสั่นตามความแรง (iceShake = เลื่อนกล้อง ไม่มีแฟลชเต็มจอ)
      const SHAKE = { burst: [10, 900, 280], blast: [14, 1100, 40], erode: [8, 600, 650], conduct: [6, 500, 560], vapor: [4, 600, 100], freeze: [5, 500, 420], swirl: [4, 900, 200] };
      const sh = SHAKE[e.key];
      if (sh && !lowQ) timers.current.push(setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: sh[0], dur: sh[1] }]), sh[2]));
    };
    const onBomb = (e) => {
      if (!e || !e.to || !e.from) return;
      look(e.to);
      pushFx([{ kind: "elBomb", el: e.el, from: e.from, to: e.to, tiles: e.tiles || [], x: e.to.x, y: e.to.y, size: 1 }]);
      if (!lowQ) timers.current.push(setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: e.el === "bolt" || e.el === "fire" ? 9 : 6, dur: 700 }]), 600)); // ตกพื้น (BOMB_FLY 0.3 × 2 วิ)
    };
    socket.on("elemAura", onAura);
    socket.on("elemReact", onReact);
    socket.on("elemBomb", onBomb);
    return () => { socket.off("elemAura", onAura); socket.off("elemReact", onReact); socket.off("elemBomb", onBomb); };
  }, [pushFx, look, lowQ]);
  // มหาเทพอรชุน: socket "arjunaFx" { kind, id, at, size } → arjunaBoardFx.js · จุติเล่นกับทุกคนที่ติดสถานะ
  useEffect(() => {
    const onArj = (e) => {
      const kind = e && ARJ_EVENT_FX[e.kind];
      if (!kind || !e.at || !Number.isFinite(e.at.x) || !Number.isFinite(e.at.y)) return;
      look(e.at);
      pushFx([{ ...e, kind, x: e.at.x, y: e.at.y, size: e.size || 1 }]);
    };
    socket.on("arjunaFx", onArj);
    return () => socket.off("arjunaFx", onArj);
  }, [pushFx, look]);
  // เฟิร์น: socket "fernFx" { kind: cast | boost | conceal | unveil | shield | empower | reset, at, id } → fernFx.js
  //  เสียงมาจาก server (engine.sfx ส่งพร้อมเหตุการณ์ — characters/fern.js) · conceal = เห็นเฉพาะเจ้าของ (กล้องไม่ตาม)
  useEffect(() => {
    const onFern = (e) => {
      const kind = e && FERN_EVENT_FX[e.kind];
      if (!kind || !e.at || !Number.isFinite(e.at.x) || !Number.isFinite(e.at.y)) return;
      const p = e.id != null ? playersRef.current.find((q) => q.id === e.id) : null;
      if (e.kind !== "conceal") look(e.at);
      pushFx([{ ...e, kind, x: e.at.x, y: e.at.y, size: p ? sizeOfP(p) : 1 }]);
    };
    socket.on("fernFx", onFern);
    return () => socket.off("fernFx", onFern);
  }, [pushFx, look]);

  // ท่าไม้ตายไรโด ฮิคารุ: { id, kind: "cross" | "ray", from, size, dir, len, width, tiles } — ชาร์จที่หน้าตัว → ลำแสงวิ่งถึงปลาย (= ดาเมจลง)
  //  กล้องตามกลางแนว · จอสั่นตอนลำแสงปล่อย/ถึงปลาย · hikaruPush { moves: [{ id, from, to }] } = คนที่ถูกผลัก (เลื่อนตามเมื่อ state มาถึง)
  useEffect(() => {
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const onBeam = (b) => {
      const v = b && DIRS[b.dir];
      if (!v || !b.from || !Number.isFinite(b.from.x) || !Number.isFinite(b.from.y)) return;
      const n = Math.max(1, b.size | 0), len = Number(b.len) || 5;
      pushFx([{ kind: b.kind === "ray" ? "hkStriumRay" : "hkCross", id: b.id, x: b.from.x, y: b.from.y, size: n, dir: b.dir, len, width: Number(b.width) || 1, tiles: Array.isArray(b.tiles) ? b.tiles : [] }]);
      const bd = boardRef.current || {}, c = (n - 1) / 2, reach = n / 2 + len / 2;
      const cl = (q, hi) => Math.max(0, Math.min(Math.max(0, (hi || 1) - 1), q));
      look({ x: cl(Math.round(b.from.x + c + v[0] * reach), bd.cols), y: cl(Math.round(b.from.y + c + v[1] * reach), bd.rows) });
      playSfx(b.kind === "ray" ? "hk_ray" : "hk_cross"); // ช่วงดังสุดของไฟล์ ≈ จังหวะลำแสงปล่อย (HK_BEAM.charge)
      if (!lowQ) {
        timers.current.push(setTimeout(() => setShake((k) => k + 1), HK_BEAM.charge));
        timers.current.push(setTimeout(() => setShake((k) => k + 1), HK_BEAM.reach));
      }
    };
    const onPush = (m) => {
      for (const mv of (m && Array.isArray(m.moves) ? m.moves : [])) {
        if (mv && mv.id != null && mv.to && Number.isFinite(mv.to.x) && Number.isFinite(mv.to.y)) hkPushTo.current[mv.id] = mv;
      }
    };
    socket.on("hikaruBeam", onBeam);
    socket.on("hikaruPush", onPush);
    return () => { socket.off("hikaruBeam", onBeam); socket.off("hikaruPush", onPush); };
  }, [pushFx, look, lowQ]);

  // ขยายร่าง (Echo): { id, from, to, at, prev, pushed, smashed } — 1 → 2 = ทะลุออกจากกรอบหกเหลี่ยม · ขั้นต่อไป = แรงกระแทกรอบตัว
  //  ของที่พังตอนขยาย = ของแตก · กล้องตามตัว · จอสั่น
  useEffect(() => {
    const onGrow = (g) => {
      if (!g || !g.at || !Number.isFinite(g.at.x) || !Number.isFinite(g.at.y)) return;
      const p = (prevPlayers.current || {})[g.id];
      pushFx([{ kind: "grow", id: g.id, x: g.at.x, y: g.at.y, from: g.from | 0, to: g.to | 0, color: p && p.color }]);
      if (g.smashed && g.smashed.length) pushFx([{ kind: "smash", tiles: g.smashed }]);
      look({ x: g.at.x + ((g.to | 0) - 1) / 2, y: g.at.y + ((g.to | 0) - 1) / 2 });
      if (!lowQ && g.to > g.from) timers.current.push(setTimeout(() => setShake((n) => n + 1), g.from <= 1 ? 520 : 260));
      playSfx(g.to > g.from ? "attack" : "notificate");
    };
    const onSmash = (m) => {
      if (!m || !Array.isArray(m.tiles) || !m.tiles.length) return;
      pushFx([{ kind: "smash", tiles: m.tiles }]);
      if (!lowQ) setShake((n) => n + 1);
    };
    socket.on("growFx", onGrow);
    socket.on("smashFx", onSmash);
    return () => { socket.off("growFx", onGrow); socket.off("smashFx", onSmash); };
  }, [pushFx, look, lowQ]);
}
