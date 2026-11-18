// ============================================================
//  useCharSocketFx — ส่วนของ BoardStage: เหตุการณ์ socket เฉพาะตัวละคร (ชุดสอง)
//    เคท & เอมิลิโกะ · ไจโร · Clock Up เดินพร้อมกัน · ดิเอโก้ · ดิโอ · ZECT · คริซุงุ · ชินระ · นักบินปริศนา
//    วาเลนไทน์ · เซลิน · เรียวกิ · ชิโร่ · คาซุมะ · โรลันด์ · ลอว์ · Moon Cell · นกหวีดอัญเชิญ
//    ย้ายมาจาก BoardStage.jsx ทั้งก้อน (โค้ดเดิม · ค่าที่ใช้ส่งมาทาง ctx)
// ============================================================
/* eslint-disable react-hooks/exhaustive-deps, react-hooks/immutability -- โค้ดย้ายมาจาก BoardStage ทั้งก้อน:
   ค่าใน ctx เป็น ref / setState / ฟังก์ชันของ BoardStage (ที่นั่น lint รู้ว่าคงที่) · รายการ deps เดิมตามต้นฉบับ */
import { useEffect } from "react";
import * as Rules from "../boardRules";
import { socket } from "../../socket";
import { playSfx } from "../../audio";
import { shadowEventFx } from "../shadowFx";
import { gyroEventFx } from "../gyroFx";
import { diegoEventFx } from "../diegoFx";
import { dioEventFx } from "../dioFx";
import { ZECT_FX_DUR } from "../zectFx";
import { KIRI_FX_DUR } from "../kiriFx";
import { SHINRA_FX_DUR, SHINRA_T, latomBoomStart, latomFxDur } from "../shinraFx";
import { MIDORIYA_T, smashDur } from "../midoriyaFx";
import { SORA_FRAME_T, shellThrowDur } from "../soraFrameFx";
import { MASTER_T, masterPose } from "../masterFx";
import { P as projectTile, LW, LH } from "../boardGeo";
import { valentineEventFx } from "../valentineFx";
import { celineEventFx } from "../celineFx";
import { ryougiEventFx } from "../ryougiFx";
import { emiyaEventFx } from "../emiyaFx";
import { kazumaEventFx } from "../kazumaFx";
import { rolandEventFx } from "../rolandFx";
import { LAW_ON_HIT, lawEventFx } from "../lawFx";
import { moonEventFx } from "../moonFx";
import { divineEventFx } from "../divineFx";
import { sameSide } from "../../duo";
import { key, sizeOfP, boxOfP, dimOf } from "./stageRules";

export default function useCharSocketFx(ctx) {
  const { boardRef, byIdRef, celineHitAt, dashSkip, diegoDefer, hitFx, lawHitAt, look, lowQ, mapRef, myIdRef, pendingAttack, prevPlayers, pushFx, ryougiHitAt, ryougiSlain, setDiegoGhosts, setFaces, setGlides, setShake, shadowBusy, timers, wallClaim } = ctx;
  // ---------- เคท & เอมิลิโกะ: socket "shadowFx" (สัญญา .claude/plans/kate-emiliko-contract.md · ตัววาด shadowFx.js) ----------
  //  "storm" (ฉากท่าไม้ตายเคท) อยู่ที่อื่น — shadowEventFx ข้ามให้เอง
  useEffect(() => {
    const posOf = (id) => { const p = byIdRef.current[id] || (prevPlayers.current || {})[id]; return p && p.pos ? p.pos : null; };
    const idsOn = (tiles, owner) => {
      const ks = new Set(tiles.map((t) => key(t.x, t.y))), me0 = byIdRef.current[owner];
      return Object.values(byIdRef.current).filter((p) => p && p.alive && p.pos && p.id !== owner && p.duoOf !== owner && p.duoWith !== owner
        && !(me0 && (me0.duoOf === p.id || me0.duoWith === p.id))
        && Rules.footprint(p.pos.x, p.pos.y, sizeOfP(p)).some((t) => ks.has(key(t.x, t.y)))).map((p) => p.id);
    };
    const onShadow = (ev) => {
      const out = shadowEventFx(ev, { posOf, idsOn });
      if (!out.fx.length) return;
      const t0 = performance.now();
      for (const b of out.busy) shadowBusy.current[b.id] = Math.max(shadowBusy.current[b.id] || 0, t0 + b.ms);
      pushFx(out.fx);
      const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
      for (const [name, ms] of out.sfx) at(ms, () => playSfx(name));
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(ms, () => pushFx(list.map((f) => (f.kind === "float" ? { ...f, z: lowQ ? 2.4 : 1.5 } : f))));
    };
    socket.on("shadowFx", onShadow);
    return () => socket.off("shadowFx", onShadow);
  }, [pushFx, look, lowQ]);

  // ไจโร: socket "gyroFx" { kind: throw | recall | secret | golden | breaker | horse | goldenTick, id, color, ... } → gyroFx.js
  //  หมากที่ฉากย้ายเอง (ถูกดึง/กระเด็น/ดันออกข้าง) จดไว้ใน shadowBusy (ไม่เลื่อน/ไถลซ้ำตอน state มาถึง) · เสียงมาจาก server
  useEffect(() => {
    const posOf = (id) => { const p = byIdRef.current[id] || (prevPlayers.current || {})[id]; return p && p.pos ? p.pos : null; };
    const sizeOf = (id) => sizeOfP(byIdRef.current[id]);
    const idAt = (t) => { const p = Object.values(byIdRef.current).find((q) => q && q.alive && q.pos && Rules.covers(boxOfP(q), t.x, t.y)); return p ? p.id : null; };
    const terrainAt = (x, y) => { const b = boardRef.current; return b && b.terrain ? b.terrain[key(x, y)] || null : null; };
    const onGyro = (ev) => {
      const out = gyroEventFx(ev, { posOf, sizeOf, idAt, terrainAt });
      if (!out.fx.length) return;
      const t0 = performance.now();
      for (const b of out.busy) shadowBusy.current[b.id] = Math.max(shadowBusy.current[b.id] || 0, t0 + b.ms);
      pushFx(out.fx);
      const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(ms, () => pushFx(lowQ ? list.filter((f) => f.kind !== "iceShake") : list));
    };
    socket.on("gyroFx", onGyro);
    return () => socket.off("gyroFx", onGyro);
  }, [pushFx, look, lowQ]);

  // ดิเอโก้ แบรนโด (โลกคู่ขนาน): socket "diegoFx" { kind, id, color, frozen?, ... } → diegoFx.js (GRID_PLAN §7.12)
  //  หมากที่ฉากย้ายเอง (ตาข่ายดึง · ควบกลอุบาย · กระเด็น) จดไว้ใน shadowBusy · เลขดาเมจรอขึ้นตอนของถึงตัว (diegoDefer)
  //  ตกรอบตอนเวลาเดินต่อ = วาดร่างค้าง (diegoGhosts) จนของที่ค้างกลางอากาศพุ่งถึง · เสียงมาจาก server
  useEffect(() => {
    const posOf = (id) => { const p = byIdRef.current[id] || (prevPlayers.current || {})[id]; return p && p.pos ? p.pos : null; };
    const sizeOf = (id) => sizeOfP(byIdRef.current[id]);
    const idAt = (t) => { const p = Object.values(byIdRef.current).find((q) => q && q.alive && q.pos && Rules.covers(boxOfP(q), t.x, t.y)); return p ? p.id : null; };
    const playOut = (out) => {
      if (!out.fx.length) return;
      const t0 = performance.now();
      for (const b of out.busy) shadowBusy.current[b.id] = Math.max(shadowBusy.current[b.id] || 0, t0 + b.ms);
      for (const d of out.defer) diegoDefer.current[d.id] = Math.max(diegoDefer.current[d.id] || 0, t0 + d.ms);
      if (out.ghosts.length) {
        const add = {};
        for (const gh of out.ghosts) { const p = byIdRef.current[gh.id]; if (p && p.pos) add[gh.id] = { ...p }; }
        setDiegoGhosts((g) => ({ ...g, ...add }));
        // กันค้าง: ไม่มีใครตกรอบจริง (state ไม่เปลี่ยน) = เอาร่างออกเมื่อเลยจังหวะ
        for (const gh of out.ghosts) timers.current.push(setTimeout(() => setDiegoGhosts((g) => { if (!g[gh.id]) return g; const n = { ...g }; delete n[gh.id]; return n; }), gh.ms + 1500));
      }
      pushFx(out.fx);
      const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(ms, () => pushFx(lowQ ? list.filter((f) => f.kind !== "iceShake") : list));
    };
    const onDiego = (ev) => playOut(diegoEventFx(ev, { posOf, sizeOf, idAt }));
    const onDio = (ev) => playOut(dioEventFx(ev, { posOf, sizeOf, idAt })); // ดิโอ บรันโด (dioFx.js) — ใช้ตัวรับเดียวกัน
    // ไรเดอร์ ZECT: ท่าไม้ตายที่เป็นสกิล (หลังคลิปจบ — zectFx.js)
    const onZect = (ev) => {
      if (!ev || !ev.from || !ev.to || !(ev.kind in ZECT_FX_DUR)) return;
      pushFx([{ kind: ev.kind, x: ev.from.x, y: ev.from.y, to: { x: ev.to.x, y: ev.to.y }, final: !!ev.final }]);
      // ชนกัน (Clock Up): จอสั่นทันทีพร้อมเสียงกระแทก แล้วสั่นซ้ำ
      if (ev.kind === "zClash") { look({ x: Math.round((ev.from.x + ev.to.x) / 2), y: Math.round((ev.from.y + ev.to.y) / 2) }); if (!lowQ) { setShake((n) => n + 1); timers.current.push(setTimeout(() => setShake((n) => n + 1), 140)); } return; }
      if (!lowQ) timers.current.push(setTimeout(() => setShake((n) => n + 1), ev.kind === "zUltSlash" ? 150 : 650));
    };
    hitFx.current.zectFx = onZect; // ท่าไม้ตายเสริมตีปกติ (Clock Up): engine.boardFxAtHit — เล่นตรงจังหวะปะทะ
    // ช่วง Clock Up (server/clockUp.js walked): เดินเร็วตามเส้นทาง ทุกคนเห็นพร้อมกัน · มาก่อน state — state ที่ตามมาไม่ต้องเลื่อนซ้ำ (dashSkip)
    const onClockWalk = (ev) => {
      const path = ev && Array.isArray(ev.path) ? ev.path.filter((t) => t && Number.isFinite(t.x) && Number.isFinite(t.y)).map((t) => ({ x: t.x, y: t.y })) : [];
      if (path.length < 2 || ev.id == null) return;
      const end = path[path.length - 1], a = path[path.length - 2];
      dashSkip.current[ev.id] = end;
      const stepMs = ev.step > 0 ? ev.step : 70;
      setGlides((g) => ({ ...g, [ev.id]: { key: ev.seq, path, stepMs } }));
      setFaces((f) => ({ ...f, [ev.id]: { x: Math.sign(end.x - a.x), y: Math.sign(end.y - a.y) } }));
      // เดินแล้วตีต่อในช่วง Clock Up: การเดินแบบนี้ไม่ผ่านคิวแอนิเมชัน (anim) — ตีที่รอไว้ต้องส่งเองตอนวิ่งถึง
      //  (บัค 2026-11-11: กดตีเป้าที่ต้องเดินไปก่อน = เดินแล้วไม่ตี + กดตีซ้ำไม่ได้ทั้งช่วง — คริซุงุ Time Alter / ไรเดอร์ ZECT / Start Up)
      if (ev.id === myIdRef.current && pendingAttack.current) {
        const pa = pendingAttack.current;
        timers.current.push(setTimeout(() => {
          if (pendingAttack.current !== pa) return;
          pendingAttack.current = null;
          socket.emit("attack", { targetId: pa });
        }, (path.length - 1) * stepMs + 60));
      }
    };
    socket.on("clockWalk", onClockWalk);
    socket.on("diegoFx", onDiego);
    socket.on("dioFx", onDio);
    socket.on("zectFx", onZect);
    // เอมิยะ คริซุงุ (kiriFx.js): โยนของ / กับดักระเบิด / Thompson Contender
    const KIRI_KIND = { throw: "kiriThrow", boom: "kiriBoom", shot: "kiriShot" };
    const onKiri = (ev) => {
      const kind = ev && KIRI_KIND[ev.kind];
      const from = ev && (ev.from || ev.at);
      if (!kind || !(kind in KIRI_FX_DUR) || !from) return;
      const tiles = Array.isArray(ev.tiles) ? ev.tiles.filter((t) => t && Number.isFinite(t.x) && Number.isFinite(t.y)).map((t) => ({ x: t.x, y: t.y })) : null;
      pushFx([{ kind, x: from.x, y: from.y, to: ev.to ? { x: ev.to.x, y: ev.to.y } : null, item: ev.item || null, tiles }]);
      if (kind === "kiriBoom" && !lowQ) setShake((n) => n + 1);
      if (kind === "kiriShot" && !lowQ) timers.current.push(setTimeout(() => setShake((n) => n + 1), 120));
    };
    socket.on("kiriFx", onKiri);
    // คุซาคาเบะ ชินระ (shinraFx.js): ฮีโร่ / พายุไฟ / อุ่นเครื่อง / ลาทัม (เส้นไฟ + ลูกไฟที่เป้า) / มอดไหม้
    const SHINRA_KIND = { hero: "shinraHero", storm: "shinraStorm", warm: "shinraWarm", latom: "shinraLatom", latomHit: "shinraLatomHit", detonate: "shinraDetonate", smolder: "shinraSmolder" };
    const onShinra = (ev) => {
      const kind = ev && SHINRA_KIND[ev.kind];
      const at = ev && ev.at;
      if (!kind || !(kind in SHINRA_FX_DUR) || !at || !Number.isFinite(at.x) || !Number.isFinite(at.y)) return;
      const tl = (arr) => (Array.isArray(arr) ? arr.filter((t) => t && Number.isFinite(t.x) && Number.isFinite(t.y)).map((t) => ({ x: t.x, y: t.y })) : null);
      const path = tl(ev.path);
      if (kind === "shinraDetonate") playSfx("shinra_detonate"); // ตรงจังหวะปะทะ (hitFx) · ไม่มีคลิป
      pushFx([{ kind, x: at.x, y: at.y, tiles: tl(ev.tiles), path, ...(kind === "shinraLatom" ? { dur: latomFxDur(path) } : {}) }]);
      // ลาทัม: ระเบิดปิดท้ายไล่ตามทาง — เสียงตูมตาม + จอสั่น 2 จังหวะ (หลังคลิป · ไม่ซ้อนวีดีโอ)
      if (kind === "shinraLatom" && path && path.length > 2) {
        const at0 = latomBoomStart(path);
        timers.current.push(setTimeout(() => playSfx("shinra_latom_boom"), at0));
        if (!lowQ) { timers.current.push(setTimeout(() => setShake((n) => n + 1), at0 + 40)); timers.current.push(setTimeout(() => setShake((n) => n + 1), at0 + 260)); }
      }
      if (lowQ) return;
      if (kind === "shinraWarm") timers.current.push(setTimeout(() => setShake((n) => n + 1), 380));
      else if (kind === "shinraStorm") timers.current.push(setTimeout(() => setShake((n) => n + 1), SHINRA_T.stormBeat));
      else if (kind === "shinraLatomHit" || kind === "shinraDetonate") setShake((n) => n + 1);
    };
    socket.on("shinraFx", onShinra);
    // มิโดริยะ อิซึคุ (midoriyaFx.js): Smash (ชาร์จ → คลื่นลมกวาดพื้นที่) / ร่างกายรับแรง / Full Cowl · smashHit = จอสั่นตอนปะทะ
    const MIDORIYA_KIND = { smash: "midoriyaSmash", recoil: "midoriyaRecoil", cowl: "midoriyaCowl" };
    const onMidoriya = (ev) => {
      const at = ev && ev.at;
      if (!ev || !at || !Number.isFinite(at.x) || !Number.isFinite(at.y)) return;
      if (ev.kind === "smashHit") { if (!lowQ) setShake((n) => n + 1); return; }
      const kind = MIDORIYA_KIND[ev.kind];
      if (!kind) return;
      const tiles = Array.isArray(ev.tiles) ? ev.tiles.filter((t) => t && Number.isFinite(t.x) && Number.isFinite(t.y)).map((t) => ({ x: t.x, y: t.y })) : null;
      pushFx([{ kind, x: at.x, y: at.y, tiles, dir: ev.dir, form: ev.form, cowl: !!ev.cowl, n: ev.n, ...(kind === "midoriyaSmash" ? { dur: smashDur(ev.form) } : {}) }]);
      // พายุลม: จอสั่นต่อเนื่องหลังจังหวะปะทะ (1,000,000% หนักและนานสุด)
      if (kind === "midoriyaSmash" && !lowQ) {
        const big = ev.form === "million", beat = big ? MIDORIYA_T.million : MIDORIYA_T.smash;
        for (const d of big ? [0, 120, 260, 420, 620, 900, 1250] : [0, 150, 350]) timers.current.push(setTimeout(() => setShake((n) => n + 1), beat + d));
      }
    };
    socket.on("midoriyaFx", onMidoriya);
    // แม็กน่า สวิง (magnaFx.js): บอลไฟ / ตีบอล / ปาบอลโซ่ / โซ่ติด-ขาด / Finisher (โซ่ฟ้า → ดึง → ระเบิด) / Knuckle / Boost
    //  เสียงฝั่ง client เฉพาะจังหวะที่ไม่มีคลิป: ปาพลาด (โดน = คลิป Deathmatch ตามมา) · ดึง/ระเบิด/โซ่ขาด (หลังคลิป Finisher จบแล้ว)
    const MAGNA_KIND = { ball: "magnaBall", bat: "magnaBat", batHit: "magnaBatHit", throw: "magnaThrow", link: "magnaLink", unlink: "magnaUnlink", arm: "magnaArm", pull: "magnaPull", finHit: "magnaFinHit", knuckle: "magnaKnuckleOn", boost: "magnaBoost", heat: "magnaHeat" };
    const okT = (t) => !!t && Number.isFinite(t.x) && Number.isFinite(t.y);
    const onMagna = (ev) => {
      const kind = ev && MAGNA_KIND[ev.kind];
      if (!kind) return;
      const at = okT(ev.at) ? ev.at : okT(ev.to) ? ev.to : null;
      if (!at) return;
      pushFx([{ kind, x: at.x, y: at.y, to: okT(ev.to) ? { x: ev.to.x, y: ev.to.y } : null, from: okT(ev.from) ? { x: ev.from.x, y: ev.from.y } : null, n: ev.n, target: ev.target || null, miss: !!ev.miss, heat: ev.heat }]);
      if (kind === "magnaThrow" && ev.miss) playSfx("magna_throw");
      else if (kind === "magnaPull") playSfx("magna_pull");
      else if (kind === "magnaFinHit") { playSfx("magna_fin_hit"); if (!lowQ) setShake((n) => n + 1); }
      else if (kind === "magnaUnlink") playSfx("magna_chain_break");
      else if (kind === "magnaLink") { if (!lowQ) setShake((n) => n + 1); }
      else if (kind === "magnaBatHit" && !lowQ) setShake((n) => n + 1);
    };
    socket.on("magnaFx", onMagna);
    // โซระ Eagle / Tutle / Orca Frame (soraFrameFx.js): พายุขนนก · พายุน้ำ · โยน/ครอบ/แตกกระดอง · วาร์ป · โซนาร์ (Orca Echo — เฉพาะโซระ)
    //  ทุกเหตุการณ์มาหลังคลิปจบแล้ว (เสียงไม่ซ้อนวีดีโอ)
    const pt = (o) => (o && Number.isFinite(o.x) && Number.isFinite(o.y) ? { x: o.x, y: o.y } : null);
    const onSora = (ev) => {
      if (!ev) return;
      const at = pt(ev.at);
      if (ev.kind === "eagleStorm" && at) {
        const pulled = Array.isArray(ev.pulled) ? ev.pulled.map((m) => ({ from: pt(m.from), to: pt(m.to) })).filter((m) => m.from) : [];
        pushFx([{ kind: "soraEagleStorm", x: at.x, y: at.y, size: Math.max(1, ev.size | 0), r: ev.r || 2, pulled }]);
        look(at);
        playSfx("sora_eagle_storm");
        if (!lowQ) for (const d of [0, 120, 280]) timers.current.push(setTimeout(() => setShake((n) => n + 1), SORA_FRAME_T.stormHit + d));
      } else if (ev.kind === "orcaStorm" && Array.isArray(ev.tiles)) {
        const tiles = ev.tiles.map(pt).filter(Boolean);
        if (!tiles.length) return;
        pushFx([{ kind: "soraOrcaStorm", x: tiles[0].x, y: tiles[0].y, tiles }]);
        look(tiles[0]);
        playSfx("sora_orca_storm");
        if (!lowQ) for (const d of [0, 160, 360]) timers.current.push(setTimeout(() => setShake((n) => n + 1), SORA_FRAME_T.stormHit + d));
      } else if (ev.kind === "shellThrow") {
        const from = pt(ev.from), to = pt(ev.to), hit = pt(ev.hit);
        if (!from || !to) return;
        const dest = hit || to, flight = Math.max(1, Math.abs(dest.x - from.x) + Math.abs(dest.y - from.y));
        const e = { kind: "soraShellThrow", x: from.x, y: from.y, from, to, hit, arc: !!ev.arc, flight };
        pushFx([{ ...e, dur: shellThrowDur(e) }]);
        look(from);
        playSfx("sora_tutle_throw");
        timers.current.push(setTimeout(() => { look(dest); if (!hit) playSfx("sora_tutle_land"); }, SORA_FRAME_T.shellLead + flight * SORA_FRAME_T.shellStep));
      } else if (ev.kind === "encase" && at) {
        pushFx([{ kind: "soraEncase", x: at.x, y: at.y, at }]);
        playSfx("sora_tutle_clamp");
        if (!lowQ) setShake((n) => n + 1);
      } else if (ev.kind === "shellBreak" && at) {
        pushFx([{ kind: "soraShellBreak", x: at.x, y: at.y, at }]);
        look(at);
        playSfx("sora_tutle_break");
        if (!lowQ) { setShake((n) => n + 1); timers.current.push(setTimeout(() => setShake((n) => n + 1), 180)); }
      } else if (ev.kind === "warp") {
        const from = pt(ev.from), to = pt(ev.to);
        if (!from || !to) return;
        pushFx([{ kind: "soraWarp", x: to.x, y: to.y, from, to }]);
        look(to);
        playSfx("sora_tutle_warp");
      } else if (ev.kind === "sonar" && at) {
        pushFx([{ kind: "soraSonar", x: at.x, y: at.y, at }]);
        playSfx("sora_orca_sonar");
      }
    };
    socket.on("soraFx", onSora);
    hitFx.current.shinraFx = onShinra; // มอดไหม้จากภายใน: engine.boardFxAtHit — ระเบิดตรงจังหวะปะทะ
    return () => { socket.off("diegoFx", onDiego); socket.off("dioFx", onDio); socket.off("zectFx", onZect); socket.off("kiriFx", onKiri); socket.off("shinraFx", onShinra); socket.off("midoriyaFx", onMidoriya); socket.off("magnaFx", onMagna); socket.off("soraFx", onSora); socket.off("clockWalk", onClockWalk); };
  }, [pushFx, look, lowQ]);

  // นักบินปริศนา / บานาจ ลิงซ์ (GRID_PLAN §7.5.1): socket "sliverFx" { kind, id, ... } — แสงแตก/จอสั่นตามเหตุการณ์ (ตำแหน่งใหม่มากับ state)
  useEffect(() => {
    const onSliver = (ev) => {
      if (!ev || !ev.kind) return;
      const burstAt = (t, size = 1, color = ev.color) => t && { kind: "burst", x: t.x + (size - 1) / 2, y: t.y + (size - 1) / 2, color };
      if (ev.kind === "boxDrop" && ev.at) {
        look(ev.at);
        pushFx([burstAt(ev.at, ev.size || 2, "#ffd36a"), { kind: "slash", x: ev.at.x + 0.5, y: ev.at.y + 0.5, color: ev.color || "#ffffff" }].filter(Boolean));
        if (!lowQ) setShake((n) => n + 1);
      } else if (ev.kind === "boxWear" && ev.at) {
        pushFx([burstAt(ev.at, 2, "#ffffff")]);
      } else if (ev.kind === "funnels") {
        pushFx((ev.spawns || []).map((s) => burstAt(s.at, 1, "#7dffb0")).filter(Boolean));
      } else if (ev.kind === "funnelFade" || ev.kind === "funnelBreak") {
        pushFx([...(ev.at && !Array.isArray(ev.at) ? [ev.at] : ev.at || [])].map((t) => burstAt(t, 1, "#ffffff")).filter(Boolean));
      } else if (ev.kind === "guard" && ev.at) {
        pushFx([burstAt(ev.at, 1, "#7dffb0"), ...(ev.ids || []).map((id) => { const p = byIdRef.current[id]; return p && p.pos ? { kind: "slash", x: p.pos.x, y: p.pos.y, color: "#7dffb0" } : null; }).filter(Boolean)]);
      } else if ((ev.kind === "absorb" || ev.kind === "absorbHit" || ev.kind === "ntd") && ev.at) {
        pushFx([burstAt(ev.at, 1, ev.kind === "ntd" ? "#ff3b4e" : "#8fd8ff")]);
      }
    };
    socket.on("sliverFx", onSliver);
    return () => socket.off("sliverFx", onSliver);
  }, [pushFx, look, lowQ]);

  // ฟันนี่ วาเลนไทน์ (D4C): socket "valentineFx" { kind, id, ... } → valentineFx.js (GRID_PLAN §7.13)
  //  ตัวที่ฉากย้ายเอง (ตัวเหมือนวิ่ง · ตัวที่กำลังพัง) จดไว้ใน shadowBusy · เลขดาเมจรอขึ้นตอนกระสุน/เมนเจอร์ถึงตัว (diegoDefer — ใช้ร่วม)
  //  lookOf = หน้าตาตอนเกิดเหตุการณ์ (ฉากวาดภาพที่จับไว้ของตัวที่ state เอาออก/ซ่อนแล้ว) · เสียงมาจาก server
  useEffect(() => {
    const recOf = (id) => byIdRef.current[id] || (prevPlayers.current || {})[id] || null;
    const posOf = (id) => { const p = recOf(id); return p && p.pos ? p.pos : null; };
    const sizeOf = (id) => sizeOfP(recOf(id));
    const lookOf = (id) => {
      const p = recOf(id);
      return p ? { img: p.img, color: p.color, name: p.name, hp: p.hp, maxHp: p.maxHp, armor: p.armor, maxArmor: p.maxArmor, size: sizeOfP(p), summon: p.summon || null } : null;
    };
    //  ev.delay (ms) = ฉากนี้เริ่มทีหลัง (ตัวเหมือนเดินถึงก่อนค่อยชน · หลายตัวต่อกัน) — จับหน้าตา/ตำแหน่งตอนเหตุการณ์มาถึง (state ตามมาทันที)
    const onVal = (ev) => {
      const out = valentineEventFx(ev, { posOf, sizeOf, lookOf });
      if (!out.fx.length) return;
      const delay = Math.max(0, Number(ev && ev.delay) || 0);
      const t0 = performance.now() + delay;
      for (const b of out.busy) shadowBusy.current[b.id] = Math.max(shadowBusy.current[b.id] || 0, t0 + b.ms);
      for (const d of out.defer) diegoDefer.current[d.id] = Math.max(diegoDefer.current[d.id] || 0, t0 + d.ms);
      const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
      at(delay, () => pushFx(out.fx));
      for (const [pos, ms] of out.look) at(delay + ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(delay + ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(delay + ms, () => pushFx(list.map((f) => (f.kind === "float" ? { ...f, z: lowQ ? 2.4 : 1.5 } : f))));
    };
    socket.on("valentineFx", onVal);
    return () => socket.off("valentineFx", onVal);
  }, [pushFx, look, lowQ]);

  // องค์หญิงดอกไม้ เซลิน: socket "celineFx" { kind, id, color, ... } → celineFx.js (GRID_PLAN §7.15 · contract §5) · เสียงมาจาก server (ผลติดหลังตี = ev.sound เล่นที่นี่)
  //  swap = คนที่ถูกสลับบินโค้งตามฉาก (celinePose) — จดไว้ใน shadowBusy (ไม่เลื่อนซ้ำตอน state มาถึง)
  //  wallBreak จากการตี = รอ state ของฉากตี (ฉากตีวาดแตกเองตอนปะทะ — wallClaim) · ผลติดหลังตีปกติ = รอถึงจังหวะปะทะ (celineHitAt)
  useEffect(() => {
    const recOf = (id) => byIdRef.current[id] || (prevPlayers.current || {})[id] || null;
    const posOf = (id) => { const p = recOf(id); return p && p.pos ? p.pos : null; };
    const sizeOf = (id) => sizeOfP(recOf(id));
    const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
    const run = (ev) => {
      const out = celineEventFx(ev, { posOf, sizeOf });
      if (typeof ev.sound === "string") playSfx(ev.sound); // ผลติดหลังตีปกติ: เสียงมากับ payload (ดังพร้อมภาพตอนปะทะ)
      if (!out.fx.length) return;
      const t0 = performance.now();
      for (const b of out.busy) shadowBusy.current[b.id] = Math.max(shadowBusy.current[b.id] || 0, t0 + b.ms);
      pushFx(out.fx);
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(ms, () => pushFx(list.map((f) => (f.kind === "float" ? { ...f, z: lowQ ? 2.4 : 1.5 } : f))));
    };
    const ON_HIT = { burn: 1, shock: 1, gust: 1, collide: 1 };
    const onCeline = (ev) => {
      if (!ev || typeof ev !== "object") return;
      if (ev.kind === "wallBreak" && ev.why !== "expire") {
        at(140, () => {
          const now = performance.now();
          const tiles = (Array.isArray(ev.tiles) ? ev.tiles : []).filter((t) => t && !((wallClaim.current[key(t.x, t.y)] || 0) > now));
          if (tiles.length) run({ ...ev, tiles });
        });
        return;
      }
      if (ON_HIT[ev.kind]) {
        at(120, () => { const wait = celineHitAt.current - performance.now(); if (wait > 0) at(wait + 60, () => run(ev)); else run(ev); });
        return;
      }
      run(ev);
    };
    socket.on("celineFx", onCeline);
    return () => socket.off("celineFx", onCeline);
  }, [pushFx, look, lowQ]);

  // ผู้นำแห่งตระกูลเรียวกิ: socket "ryougiFx" { kind, id, color, at, size, ... } → ryougiFx.js (GRID_PLAN §7.17 · contract §3) · เสียงมาจาก server
  //  dash / crumble = ตัวที่ฉากย้ายเอง (ryougiPose) จดไว้ใน shadowBusy · kill / sever จากการตีปกติ = เริ่มตอนจังหวะปะทะของฉากตี (gate ← ryougiHitAt)
  //  kill = จับหน้าตาเป้าตอนเหตุการณ์มาถึง (state ตามมาเอาตัวออก) + กันระเบิดตกรอบ (ryougiSlain)
  useEffect(() => {
    const recOf = (id) => byIdRef.current[id] || (prevPlayers.current || {})[id] || null;
    const posOf = (id) => { const p = recOf(id); return p && p.pos ? p.pos : null; };
    const sizeOf = (id) => sizeOfP(recOf(id));
    const lookOf = (id) => { const p = recOf(id); return p ? { img: p.masked ? null : p.img, color: p.masked ? "#ffffff" : p.color, name: p.name } : null; };
    const foesOf = (owner) => {
      const me0 = recOf(owner);
      return Object.values(byIdRef.current).filter((p) => p && p.alive && p.pos && p.id !== owner
        && !(me0 && (sameSide(p, me0) || (!!me0.teamId && p.teamId === me0.teamId)))
        && (!me0 || dimOf(p) === dimOf(me0))).map((p) => p.id);
    };
    const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
    const onRyougi = (ev) => {
      const out = ryougiEventFx(ev, { posOf, sizeOf, lookOf, foesOf });
      // เสียงสังหาร/ตัดผลสกิลจากการตีปกติ (ev.sound / ev.line) — server ส่งตอนเริ่มฉากตี → เล่นตรงจังหวะปะทะของฉากตีเรียวกิ
      const sounds = [ev.sound, ev.line].filter(Boolean);
      if (sounds.length) at(125, () => at(Math.max(0, ryougiHitAt.current - performance.now()), () => { for (const s of sounds) playSfx(s); }));
      if (!out.fx.length) return;
      const t0 = performance.now();
      for (const id of out.slain) ryougiSlain.current[id] = t0 + 6000;
      for (const b of out.busy) shadowBusy.current[b.id] = Math.max(shadowBusy.current[b.id] || 0, t0 + b.ms);
      for (const g of out.gates) {
        if (g.mode !== "hit") { g.gate.at = t0; continue; }
        // state ของฉากตีตามมาหลัง socket นี้ — รอให้ฉากตีตั้งจังหวะปะทะก่อน (ไม่มีฉากตี = เริ่มทันที)
        at(120, () => { const n = performance.now(); g.gate.at = ryougiHitAt.current > n ? ryougiHitAt.current : n; });
      }
      pushFx(out.fx);
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(ms, () => pushFx(list));
    };
    socket.on("ryougiFx", onRyougi);
    return () => socket.off("ryougiFx", onRyougi);
  }, [pushFx, look, lowQ]);

  // เอมิยะ ชิโร่: socket "emiyaFx" { kind, id, color, at, size, ... } → emiyaFx.js (GRID_PLAN §7.18 · contract §3) · เสียงมาจาก server
  //  เลขดาเมจของสกิลมากับเหตุการณ์ (throwHit / caladbolgBlast / caladbolgSplash / excaliburHit) — ตรงจังหวะที่ server ลงผล
  useEffect(() => {
    const recOf = (id) => byIdRef.current[id] || (prevPlayers.current || {})[id] || null;
    const posOf = (id) => { const p = recOf(id); return p && p.pos ? p.pos : null; };
    const sizeOf = (id) => sizeOfP(recOf(id));
    const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
    const z = (list) => list.map((f) => (f.kind === "float" ? { ...f, z: lowQ ? 2.4 : 1.5 } : f));
    const onEmiya = (ev) => {
      const out = emiyaEventFx(ev, { posOf, sizeOf });
      if (out.fx.length) pushFx(z(out.fx));
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(ms, () => pushFx(z(list)));
    };
    socket.on("emiyaFx", onEmiya);
    return () => socket.off("emiyaFx", onEmiya);
  }, [pushFx, look, lowQ]);
  // เคนซากิ คาซุมะ: socket "kazumaFx" { kind, id, color, at, size, ... } → kazumaFx.js (GRID_PLAN §7.19) · เสียงมาจาก server
  useEffect(() => {
    const recOf = (id) => byIdRef.current[id] || (prevPlayers.current || {})[id] || null;
    const posOf = (id) => { const p = recOf(id); return p && p.pos ? p.pos : null; };
    const sizeOf = (id) => sizeOfP(recOf(id));
    const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
    const z = (list) => list.map((f) => (f.kind === "float" ? { ...f, z: lowQ ? 2.4 : 1.5 } : f));
    const onKazuma = (ev) => {
      const out = kazumaEventFx(ev, { posOf, sizeOf });
      if (out.fx.length) pushFx(z(out.fx));
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(ms, () => pushFx(z(list)));
    };
    // โรลันด์: socket "rolandFx" → rolandFx.js (GRID_PLAN §7.25) · จั่วการ์ด = เสียงเฉพาะเจ้าของ
    const onRoland = (ev) => {
      const out = rolandEventFx(ev, { sizeOf });
      if (out.sound) playSfx(out.sound);
      if (out.fx.length) pushFx(z(out.fx));
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
    };
    socket.on("kazumaFx", onKazuma);
    socket.on("rolandFx", onRoland);
    return () => { socket.off("kazumaFx", onKazuma); socket.off("rolandFx", onRoland); };
  }, [pushFx, look, lowQ]);
  // ทราฟาก้า ลอว์: socket "lawFx" { kind, id, color, at, size, ... } → lawFx.js (GRID_PLAN §7.20 · .claude/plans/law-contract.md §4) · ยังไม่มีเสียง
  //  shuffle = วาร์ปทันที (จดไว้ใน shadowBusy — ไม่เลื่อนเดินตอน state มาถึง) · gamma / mess / mark = รอถึงจังหวะปะทะของฉากตีลอว์ (lawHitAt)
  //  rockDown จากการตี = ฉากตีวาดหินพังเอง (lawRockBreak — ช่องถูกจองใน wallClaim)
  useEffect(() => {
    const recOf = (id) => byIdRef.current[id] || (prevPlayers.current || {})[id] || null;
    const posOf = (id) => { const p = recOf(id); return p && p.pos ? p.pos : null; };
    const sizeOf = (id) => sizeOfP(recOf(id));
    const colorOf = (id) => { const p = recOf(id); return p && !p.masked ? p.color : null; };
    const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
    const z = (list) => list.map((f) => (f.kind === "float" ? { ...f, z: lowQ ? 2.4 : 1.5 } : f));
    const run = (ev) => {
      const out = lawEventFx(ev, { posOf, sizeOf, colorOf });
      if (!out.fx.length) return;
      const t0 = performance.now();
      for (const b of out.busy) shadowBusy.current[b.id] = Math.max(shadowBusy.current[b.id] || 0, t0 + b.ms);
      pushFx(z(out.fx));
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(ms, () => pushFx(z(list)));
    };
    const onLaw = (ev) => {
      if (!ev || typeof ev !== "object") return;
      if (ev.kind === "rockDown" && ev.why === "hit") {
        at(140, () => {
          const now = performance.now();
          const tiles = (Array.isArray(ev.tiles) ? ev.tiles : []).filter((t) => t && !((wallClaim.current[key(t.x, t.y)] || 0) > now));
          if (tiles.length) run({ ...ev, tiles });
        });
        return;
      }
      if (LAW_ON_HIT[ev.kind]) {
        at(120, () => { const wait = lawHitAt.current - performance.now(); if (wait > 0) at(wait, () => run(ev)); else run(ev); });
        return;
      }
      run(ev);
    };
    socket.on("lawFx", onLaw);
    return () => socket.off("lawFx", onLaw);
  }, [pushFx, look, lowQ]);
  // Moon Cell (GRID_PLAN §8.4): socket "moonScene" (ฉากต้นเทิร์นระหว่างพักเกม) → moonFx.js — เสาข้อมูลพุ่ง · ฟื้นคืนชีพ · คำสาปลง/เตือน/สลาย
  useEffect(() => {
    let lastSeq = null;
    const recOf = (id) => byIdRef.current[id] || (prevPlayers.current || {})[id] || null;
    const posOf = (id) => { const p = recOf(id); return p && p.pos ? p.pos : null; };
    const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
    const z = (list) => list.map((f) => (f.kind === "float" ? { ...f, z: lowQ ? 2.4 : 1.5 } : f));
    const onMoon = (scene) => {
      if (!scene || scene.seq === lastSeq) return;
      lastSeq = scene.seq;
      const out = moonEventFx(scene, { posOf });
      if (out.fx.length) pushFx(z(out.fx));
      for (const [pos, ms] of out.look) at(ms, () => look(pos));
      if (!lowQ) for (const ms of out.shake) at(ms, () => setShake((n) => n + 1));
      for (const [ms, list] of out.later) at(ms, () => pushFx(z(list)));
    };
    socket.on("moonScene", onMoon);
    return () => socket.off("moonScene", onMoon);
  }, [pushFx, look, lowQ]);
  // นกหวีดอัญเชิญมนต์อสูรเทพ (server/whistle.js): socket "divineFx" → divineFx.js — มนต์ลงสนาม / สายฟ้าพิพากษาฟาดช่องไฟ
  useEffect(() => {
    let lastKey = null;
    const posOf = (id) => { const p = byIdRef.current[id] || (prevPlayers.current || {})[id] || null; return p && p.pos ? { x: p.pos.x, y: p.pos.y, size: p.size || 1 } : null; };
    const onDivine = (ev) => {
      const k = ev ? `${ev.seq}|${ev.land ? 1 : 0}` : null;
      if (!ev || k === lastKey) return;
      lastKey = k;
      const m = mapRef.current || {};
      const out = divineEventFx(ev, { cols: m.cols, rows: m.rows, posOf, lowQ });
      if (out.fx.length) pushFx(out.fx);
      if (out.look) look(out.look);
      if (!lowQ) for (const ms of out.shake) timers.current.push(setTimeout(() => setShake((n) => n + 1), ms));
    };
    socket.on("divineFx", onDivine);
    return () => socket.off("divineFx", onDivine);
  }, [pushFx, look, lowQ]);

  // ---------- Master (masterFx.js · GRID_PLAN §7.34): socket "masterFx" — ทุกท่า: จอสั่น + กล้องเลื่อนไปจุดเกิดเหตุ + ซูมกระแทก (ผู้ใช้ "เต็มที่ ทุกท่า") ----------
  useEffect(() => {
    const ok = (t) => !!t && Number.isFinite(t.x) && Number.isFinite(t.y);
    const tl = (arr) => (Array.isArray(arr) ? arr.filter(ok).map((t) => ({ x: t.x, y: t.y })) : null);
    const posOf = (id) => { const p = byIdRef.current[id] || (prevPlayers.current || {})[id]; return p && p.pos ? { x: p.pos.x, y: p.pos.y, size: sizeOfP(p) } : null; };
    const at = (ms, fn) => (ms > 0 ? timers.current.push(setTimeout(fn, ms)) : fn());
    const shake = (...list) => { if (!lowQ) for (const ms of list) at(ms, () => setShake((n) => n + 1)); };
    // ซูมกระแทก: ขยายภาพกระดานชั่วคราวรอบจุดเกิดเหตุ (transform อย่างเดียว — ไม่แตะระดับซูมที่ผู้เล่นตั้ง)
    const punch = (pos, ms, k = 1.12) => {
      if (lowQ || !pos || typeof document === "undefined") return;
      const cv = document.querySelector(".bs-root canvas");
      if (!cv || typeof cv.animate !== "function") return;
      const n = Math.max(1, pos.size | 0), [sx, sy] = projectTile(pos.x + n / 2, pos.y + n / 2, 0.6);
      cv.style.transformOrigin = `${Math.max(0, Math.min(100, (sx / LW) * 100))}% ${Math.max(0, Math.min(100, (sy / LH) * 100))}%`;
      cv.animate([{ transform: "scale(1)" }, { transform: `scale(${k})`, offset: 0.35 }, { transform: "scale(1)" }], { duration: ms, easing: "ease-out" });
    };
    const onMaster = (ev) => {
      if (!ev || !ev.kind) return;
      const pos = ok(ev.at) ? { x: ev.at.x, y: ev.at.y, size: Math.max(1, ev.size | 0) } : ev.id ? posOf(ev.id) : null;
      const base = pos ? { x: pos.x, y: pos.y, size: pos.size, phase: ev.phase || 1, by: ev.id } : null;
      switch (ev.kind) {
        case "land": {
          if (!base) return;
          const hit = MASTER_T.land * 0.42;
          masterPose(ev.id, "land", null, MASTER_T.land);
          pushFx([{ kind: "masterLand", ...base }]);
          playSfx("master_meteor"); at(hit, () => playSfx("master_shockwave"));
          look(pos);
          at(hit, () => punch(pos, 700, 1.18));
          shake(hit, hit + 140, hit + 320, hit + 560);
          break;
        }
        case "revive": {
          if (!base) return;
          masterPose(ev.id, "revive", null, MASTER_T.revive);
          pushFx([{ kind: "masterRevive", ...base, phase: 2 }]);
          playSfx("master_choir"); at(MASTER_T.revive * 0.45, () => playSfx("master_shockwave"));
          look(pos);
          punch(pos, 1200, 1.1);
          shake(MASTER_T.revive * 0.45, MASTER_T.revive * 0.45 + 200);
          break;
        }
        case "down": if (base) { pushFx([{ kind: "masterDown", ...base }]); shake(0, 160); punch(pos, 600, 1.08); } break;
        case "death": if (base) { pushFx([{ kind: "masterDeath", ...base }]); look(pos); shake(800, 950, 1200); at(800, () => punch(pos, 900, 1.2)); } break;
        case "summon": {
          if (!base) return;
          masterPose(ev.id, "roar", null, 1200);
          const units = Array.isArray(ev.units) ? ev.units.filter((u) => u && ok(u.at)).map((u) => ({ id: u.id, at: { x: u.at.x, y: u.at.y }, kind: u.kind })) : [];
          pushFx([{ kind: "masterSummon", ...base, units }]);
          at(150, () => playSfx("master_summon"));
          look(pos);
          punch(pos, 900, 1.08);
          shake(0, 180, 360);
          break;
        }
        case "slam": {
          if (!base) return;
          const hit = MASTER_T.slam * 0.8;
          masterPose(ev.id, "slam", ev.dir, hit / 0.78);
          pushFx([{ kind: "masterSlam", ...base, dir: ev.dir, tiles: tl(ev.tiles) || [], big: !!ev.big }]);
          at(hit * 0.62, () => playSfx("master_swing")); // เงื้อเสร็จ → ฟาดลง
          at(hit, () => { playSfx("master_stomp"); playSfx("master_wave"); }); // ดาบกระแทกพื้น + คลื่นหนาม
          look(pos);
          at(hit, () => punch(pos, ev.big ? 800 : 600, ev.big ? 1.16 : 1.1));
          shake(hit, hit + 160, ...(ev.big ? [hit + 330, hit + 520] : []));
          break;
        }
        case "knock": {
          if (!base) return;
          const T = ev.wave ? MASTER_T.knock2 : MASTER_T.knock;
          masterPose(ev.id, "sweep", ev.dir, (T * 0.45) / 0.55); // ฟาดกวาด (q 0.55) ตรงจังหวะใบดาบพุ่ง (T·0.45)
          pushFx([{ kind: "masterKnock", ...base, dir: ev.dir, tiles: tl(ev.tiles) || [], wave: ev.wave | 0, dur: T + 700 }]);
          look(pos);
          at(T * 0.45, () => punch(pos, 500, 1.08));
          shake(T * 0.5, T * 0.7);
          break;
        }
        case "smite": {
          if (!base) return;
          const T = ev.bolt ? MASTER_T.smite2 : MASTER_T.smite, strike = T * 0.72;
          masterPose(ev.id, "raise", null, T + 300);
          const targets = (Array.isArray(ev.ids) ? ev.ids : []).map(posOf).filter(Boolean);
          pushFx([{ kind: "masterSmite", ...base, targets, bolt: ev.bolt | 0, dark: !!ev.dark, dur: T + 900 }]);
          at(strike, () => punch(pos, 600, 1.1));
          shake(strike, strike + 120, strike + 300);
          break;
        }
        case "undeadRise": if (base) pushFx([{ kind: "masterRise", ...base }]); break;
        case "slamHit": case "knockHit": case "smiteHit": if (!lowQ) setShake((n) => n + 1); break;
        default: break;
      }
    };
    socket.on("masterFx", onMaster);
    return () => socket.off("masterFx", onMaster);
  }, [pushFx, look, lowQ]);
}
