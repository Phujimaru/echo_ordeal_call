// ============================================================
//  useIceFx — ส่วนของ BoardStage: Ice Spike เล่นเหตุการณ์ socket "iceFx" ตามลำดับ (ค้างภาพจนจบชุด)
//    ย้ายมาจาก BoardStage.jsx ทั้งก้อน (โค้ดเดิม · ค่าที่ใช้ส่งมาทาง ctx)
// ============================================================
/* eslint-disable react-hooks/exhaustive-deps, react-hooks/immutability -- โค้ดย้ายมาจาก BoardStage ทั้งก้อน:
   ค่าใน ctx เป็น ref / setState / ฟังก์ชันของ BoardStage (ที่นั่น lint รู้ว่าคงที่) · รายการ deps เดิมตามต้นฉบับ */
import { useEffect, useLayoutEffect, useRef } from "react";
import { socket } from "../../socket";
import { playSfx } from "../../audio";
import { ICE_T, iceTrailDur } from "../iceFx";
import { dryTileFx, wetTileFx } from "../shadowFx";
import { key, samePos, sizeOfP, BIG_ART, boardSpikeLv, ENERGY_C } from "./stageRules";

export default function useIceFx(ctx) {
  const { boardRef, byIdRef, finishIceRef, fxSeq, iceRun, iceSeen, isShadowBusy, later, look, lowQ, prevPlayers, pushFx, setAnimQ, setFaces, setIceGhosts, setIceHold, setIceLv, setIceMask, setShake } = ctx;
  const finishIce = (run) => {
    if (!run || run.done) return;
    run.done = true; run.active = false;
    clearTimeout(run.safety);
    if (iceRun.current !== run) return;
    setIceHold({}); setIceLv(null); setIceMask(null); setIceGhosts({});
  };
  const startIce = (events) => {
    if (iceRun.current && !iceRun.current.done) finishIce(iceRun.current);
    const bd = boardRef.current || {}, pl = prevPlayers.current || {};
    const run = { ids: new Set(), active: true, gotState: false, done: false, pos: {}, snap: {}, snd: {}, lv: {} };
    iceRun.current = run;
    const ok = (t) => !!t && Number.isFinite(t.x) && Number.isFinite(t.y);
    const pts = (list) => (Array.isArray(list) ? list.filter(ok).map((t) => ({ x: t.x, y: t.y })) : []);
    const lvMap = {}, mask = {}, hold = {}, ghosts = {};
    const noteLv = (x, y) => { const k = key(x, y); if (!(k in lvMap)) lvMap[k] = boardSpikeLv(bd, k); };
    const noteIce = (t) => { if (!ok(t)) return; const k = key(t.x, t.y), was = (bd.special || {})[k] || null; if (was !== "ice" && !(k in mask)) mask[k] = was; };
    for (const ev of events) {
      if (!ev || typeof ev !== "object") continue;
      for (const id of [ev.id, ev.by]) {
        const p = id != null ? pl[id] : null;
        if (!p || run.ids.has(id)) continue;
        run.ids.add(id);
        if (p.alive && p.pos) { run.pos[id] = { x: p.pos.x, y: p.pos.y }; hold[id] = run.pos[id]; run.snap[id] = p; ghosts[id] = p; }
      }
      if ((ev.kind === "spike" || ev.kind === "spikeUp" || ev.kind === "spikeDown" || ev.kind === "trample") && ok(ev)) noteLv(ev.x, ev.y);
      if (ev.kind === "lay") for (const t of pts(ev.tiles)) noteIce(t);
      // ทำลายธารน้ำแข็ง (Ice Spike): ช่องที่หายยังเป็นน้ำแข็งจนเหตุการณ์ถึง
      if (ev.kind === "melt") for (const t of pts(ev.tiles)) { const k = key(t.x, t.y); if (!(k in mask)) mask[k] = "ice"; }
      // พื้นเปียก (เอมิลิโกะ): ช่องเปียกใหม่ซ่อนไว้จนน้ำกระเซ็นถึง · ช่องที่ถูแห้งยังเปียกจนไม้ถูผ่าน
      if (ev.kind === "wet" || ev.kind === "dry") for (const t of pts(ev.tiles)) {
        const k = key(t.x, t.y), was = (bd.special || {})[k] || null;
        if (!(k in mask) && (ev.kind === "wet" ? was !== "wet" : was === "wet")) mask[k] = ev.kind === "wet" ? was : "wet";
      }
    }
    Object.assign(run.lv, lvMap);
    setIceHold(hold);
    setIceLv(Object.keys(lvMap).length ? lvMap : null);
    setIceMask(Object.keys(mask).length ? mask : null);
    setIceGhosts(ghosts);
    run.safety = setTimeout(() => finishIce(run), 30000); // กันค้าง (แอนิเมชันไม่จบ ฯลฯ)
    const live = () => !run.done && iceRun.current === run;
    // เสียงซ้ำในเวลาใกล้กัน (ติดเชื่องช้าหลายคนพร้อมกัน) = ดังครั้งเดียว
    const sfx = (name) => { const t = performance.now(); if (run.snd[name] && t - run.snd[name] < 110) return; run.snd[name] = t; playSfx(name); };
    const pick2 = (a, b) => (Math.random() < 0.5 ? a : b);
    const setLv = (x, y, lv) => { const k = key(x, y); run.lv[k] = lv; setIceLv((m) => ({ ...(m || {}), [k]: lv })); };
    const reveal = (list) => {
      const ks = list.filter(ok).map((t) => key(t.x, t.y));
      setIceMask((m) => { if (!m) return m; const n = { ...m }; for (const k of ks) delete n[k]; return Object.keys(n).length ? n : null; });
    };
    const shake = (amp) => { if (!lowQ) pushFx([{ kind: "iceShake", x: 0, y: 0, amp }]); };
    const posOf = (id) => run.pos[id] || (byIdRef.current[id] && byIdRef.current[id].pos) || null;
    const die = (id, at) => {
      const t = run.snap[id];
      if (!t || !at) return;
      pushFx([
        { kind: "float", x: at.x, y: at.y - 0.6, text: "ตกรอบ", color: "#ff8f8f", size: 24, z: lowQ ? 2.4 : 1.5 },
        { kind: "deathBoom", x: at.x, y: at.y, size: sizeOfP(t), img: t.img, color: t.color, name: t.name },
      ]);
      playSfx("death_boom");
      if (!lowQ) setShake((n) => n + 1);
      setIceGhosts((g) => { if (!g[id]) return g; const n = { ...g }; delete n[id]; return n; });
    };
    const float = (at, text, color, dy = 0, size = 28) => { if (at) pushFx([{ kind: "float", x: at.x, y: at.y + dy, text, ...(color ? { color } : {}), size, z: lowQ ? 2.4 : 1.5 }]); };
    let step = () => {};
    const enqueue = (a, end) => {
      setAnimQ((q) => [...q, { ...a, seq: ++fxSeq.current, iceRun: run, iceHoldEnd: end, then: () => { run.pos[a.id] = end; step(); } }]);
      return "anim";
    };
    const face = (id, a, b) => { if (a && b && (a.x !== b.x || a.y !== b.y)) setFaces((f) => ({ ...f, [id]: { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) } })); };
    // คืนค่า: "anim" = รอแอนิเมชันจบ · ตัวเลข = รอกี่ ms ก่อนเหตุการณ์ถัดไป
    const fire = (ev) => {
      if (!ev || typeof ev !== "object") return 0;
      const id = ev.id;
      switch (ev.kind) {
        case "walk": {
          const path = pts(ev.path);
          if (path.length < 2 || !run.pos[id]) { if (path.length) run.pos[id] = path[path.length - 1]; return 0; }
          const mover = byIdRef.current[id], hop = mover && mover.character && BIG_ART[mover.character.id] ? sizeOfP(mover) : 0;
          const end = path[path.length - 1];
          face(id, path[path.length - 2], end);
          look(end);
          return enqueue({ kind: "move", id, path, hop }, end);
        }
        case "slide": {
          let path = pts(ev.path);
          const cur = run.pos[id];
          if (cur && path.length && !samePos(cur, path[0])) path = [cur, ...path];
          if (path.length < 2 || !cur) { if (path.length) run.pos[id] = path[path.length - 1]; return 0; }
          const end = path[path.length - 1], dur = iceTrailDur(path, ICE_T.slideStep);
          // ฉาก shadowFx ย้ายตัวนี้อยู่แล้ว (แส้เขม่าพุ่ง) = ไม่ไถลซ้ำ
          if (isShadowBusy(id)) { run.pos[id] = end; setIceHold((h) => ({ ...h, [id]: end })); return 0; }
          // ไถลบนพื้นเปียก / เอมิลิโกะถือไม้ถูพื้น = ทางน้ำ (เสียงไม้ถูพื้น server เล่นเอง)
          const spOf = (b, t) => ((b && b.special) || {})[key(t.x, t.y)];
          const mopper = byIdRef.current[id] && byIdRef.current[id].shadow && byIdRef.current[id].shadow.weapon === "mop";
          const water = path.some((t) => spOf(bd, t) === "wet" || spOf(boardRef.current, t) === "wet") || (mopper && !path.some((t) => spOf(bd, t) === "ice"));
          pushFx([{ kind: water ? "keWetTrail" : "iceTrail", path, step: ICE_T.slideStep, dur, len: dur }]);
          if (!water) sfx(pick2("is_slide_1", "is_slide_2"));
          else if (!mopper) sfx("ke_slide");
          face(id, path[path.length - 2], end);
          look(end);
          return enqueue({ kind: "move", id, path, stepMs: ICE_T.slideStep }, end);
        }
        case "knock": {
          if (!ok(ev.from) || !ok(ev.to) || !run.pos[id]) return 0;
          const from = { x: ev.from.x, y: ev.from.y }, to = { x: ev.to.x, y: ev.to.y };
          return enqueue({ kind: "push", id, from, to, collide: !!ev.collide }, ev.collide ? from : to);
        }
        case "hit": {
          const at = ok(ev) ? { x: ev.x, y: ev.y } : posOf(id);
          if (!at) return 0;
          const dmg = Math.max(0, ev.dmg | 0);
          const mop = ev.style === "mop"; // ไม้ถูพื้นไถลชน (เอมิลิโกะ)
          pushFx([{ kind: mop ? "keMopHit" : "iceHit", x: at.x, y: at.y, dmg, max: !!ev.max, hitIds: id != null ? [id] : [] }]);
          if (dmg > 0) float(at, `-${dmg}`, ev.max ? "#d8f2ff" : undefined, 0, ev.max ? 40 : 30);
          sfx(mop ? "ke_hit_mop" : ev.max ? "is_hit_max" : pick2("is_hit", "is_hit_alt"));
          shake(2.5 + dmg * 1.8 + (ev.max ? 4 : 0));
          if (ev.max && !lowQ) setShake((n) => n + 1);
          look(at);
          if (ev.kill) die(id, at);
          return ev.max ? ICE_T.hitStop : 90;
        }
        case "bump": {
          const at = ok(ev) ? { x: ev.x, y: ev.y } : posOf(id);
          if (!at) return 0;
          pushFx([{ kind: "iceBump", x: at.x, y: at.y, hitIds: id != null ? [id] : [] }]);
          sfx("is_bump");
          shake(2);
          return 60;
        }
        // Mouse Separade (โซระ): ตัวใหญ่ถูกผลักไปติดของ — x, y = มุมบนซ้ายของตัว
        case "crash": {
          const at = ok(ev) ? { x: ev.x, y: ev.y } : posOf(id);
          if (!at) return 0;
          const n = run.snap[id] ? sizeOfP(run.snap[id]) : 1, mid = { x: at.x + (n - 1) / 2, y: at.y + (n - 1) / 2 };
          pushFx([{ kind: "iceBump", x: mid.x, y: mid.y, hitIds: id != null ? [id] : [] }]);
          if (ev.dmg > 0) float(mid, `-${ev.dmg}`, "#ffc56b", 0, 30);
          sfx("is_bump");
          shake(4);
          look(mid);
          if (ev.kill) die(id, at);
          return 120;
        }
        case "spike": {
          if (!ok(ev)) return 0;
          const who = ev.by != null ? ev.by : id, at = posOf(who), lvTo = Math.max(0, ev.lvTo | 0);
          setLv(ev.x, ev.y, lvTo);
          pushFx([{ kind: "iceSpikeBreak", x: ev.x, y: ev.y, lv: lvTo, hitIds: who != null ? [who] : [] }]);
          sfx("is_skill_2_broke");
          if (ev.own) { float(at, `+${ev.energy || 2}`, ENERGY_C); sfx("is_spike_self"); }
          else if (ev.dmg > 0) float(at, `-${ev.dmg}`);
          shake(3);
          if (ev.kill) die(who, at);
          return 80;
        }
        // ตัวใหญ่เดินเหยียบหนาม: หนามแตกทันที · ดาเมจขึ้นที่ช่องหนาม (x, y)
        case "trample": {
          if (!ok(ev)) return 0;
          const at = { x: ev.x, y: ev.y };
          setLv(ev.x, ev.y, 0);
          pushFx([{ kind: "iceSpikeBreak", x: ev.x, y: ev.y, lv: 0, hitIds: ev.by != null ? [ev.by] : [] }]);
          sfx("is_skill_2_broke");
          if (ev.dmg > 0) float(at, `-${ev.dmg}`);
          shake(2 + Math.max(0, ev.dmg | 0) * 1.5);
          if (ev.kill) die(ev.by, posOf(ev.by));
          return 80;
        }
        case "slow": {
          const at = posOf(id);
          if (at) pushFx([{ kind: "iceSlow", x: at.x, y: at.y }]);
          sfx("is_slow");
          return 0;
        }
        case "regen": {
          const at = posOf(id);
          if (!at) return 0;
          pushFx([{ kind: "iceRegen", x: at.x, y: at.y }]);
          if (ev.hp > 0) float(at, `+${ev.hp}`, "#8ff0b0");
          if (ev.sp > 0) float(at, `+${ev.sp}`, ENERGY_C, -0.55, 24);
          sfx("is_regen");
          return 0;
        }
        case "spikeUp": {
          if (!ok(ev)) return 0;
          const lv = Math.max(1, ev.lv | 0);
          setLv(ev.x, ev.y, lv);
          pushFx([{ kind: "iceSpikeUp", x: ev.x, y: ev.y, lv, from: ev.from | 0 }]);
          sfx("is_skill_2");
          look(ev);
          return 140;
        }
        case "spikeDown": {
          if (!ok(ev)) return 0;
          const lv = Math.max(0, ev.lv | 0);
          setLv(ev.x, ev.y, lv);
          pushFx([{ kind: "iceSpikeBreak", x: ev.x, y: ev.y, lv }]);
          sfx("is_skill_2_broke");
          return 0;
        }
        // เอมิลิโกะ: น้ำกระเซ็นเป็นพื้นเปียก / ไม้ถูพื้นเช็ดแห้ง (เสียงน้ำ server เล่นเอง)
        case "wet":
        case "dry": {
          const tiles = pts(ev.tiles);
          if (!tiles.length) return 0;
          reveal(tiles);
          pushFx(ev.kind === "wet" ? wetTileFx(tiles) : dryTileFx(tiles));
          return 0;
        }
        case "lay": {
          const tiles = pts(ev.tiles);
          if (!tiles.length) return 0;
          reveal(tiles);
          pushFx(tiles.map((t, i) => { const delay = Math.min(i * ICE_T.layStep, 600); return { kind: "iceLay", x: t.x, y: t.y, delay, dur: 560 + delay }; }));
          const n = Math.min(4, tiles.length), gap = n > 1 ? Math.min(600, (tiles.length - 1) * ICE_T.layStep) / (n - 1) : 0;
          for (let k = 0; k < n; k++) later(Math.round(k * Math.max(110, gap)), () => { if (live()) playSfx(pick2("is_gp_1", "is_gp_2")); });
          return 0;
        }
        case "melt": {
          const tiles = pts(ev.tiles);
          if (!tiles.length) return 0;
          reveal(tiles);
          pushFx(tiles.map((t) => ({ kind: "iceMelt", x: t.x, y: t.y })));
          sfx("is_skill_2_broke");
          look(tiles[0]);
          return 120;
        }
        case "burst": {
          const at = ok(ev) ? { x: ev.x, y: ev.y } : posOf(id);
          if (!at) return 0;
          pushFx([{ kind: "iceBurst", x: at.x, y: at.y }]);
          sfx("is_burst");
          shake(6);
          look(at);
          return 180;
        }
        // Shock Wave (Ice Spike ในสนาม Eos): คลื่นข้าวหลามตัดระยะ r จาก { x, y, size } · hits = ใครโดนเท่าไร / หลบ / ตาย
        case "shock": {
          if (!ok(ev)) return 0;
          const n = Math.max(1, ev.size | 0);
          pushFx([{ kind: "iceShock", x: ev.x, y: ev.y, size: n, r: Math.max(1, ev.r | 0), square: !!ev.square }]);
          sfx("is_burst");
          shake(4 + Math.min(4, (ev.hits || []).length));
          if ((ev.r | 0) < 20) look({ x: ev.x + (n - 1) / 2, y: ev.y + (n - 1) / 2 });
          for (const h of ev.hits || []) {
            const at = posOf(h.id);
            if (!at) continue;
            if (h.dodge) { float(at, "หลบ", "#d8f2ff", 0, 24); continue; }
            pushFx([{ kind: "iceBump", x: at.x, y: at.y, hitIds: [h.id] }]);
            if (h.dmg > 0) float(at, `-${h.dmg}`, "#d8f2ff");
            if (h.kill) die(h.id, at);
          }
          return 260;
        }
        case "surge": {
          // ท่าไม้ตาย Ice Surge: คลื่นน้ำแข็งแผ่ทั้งสนามจากตัว · หนามที่ขึ้น Lv ตามมาเป็น spikeUp
          const at = ok(ev) ? { x: ev.x, y: ev.y } : posOf(id);
          if (!at) return 0;
          look(at);
          playSfx("is_ult");
          pushFx([{ kind: "iceSurge", x: at.x, y: at.y }]);
          shake(7);
          return ICE_T.surge;
        }
        default:
          return 0;
      }
    };
    let i = 0;
    step = () => {
      if (!live()) return;
      while (i < events.length) {
        const w = fire(events[i++]);
        if (w === "anim") return;
        if (w > 0) { later(w, step); return; }
      }
      finishIce(run);
    };
    step();
  };
  const startIceRef = useRef(startIce);
  useLayoutEffect(() => { startIceRef.current = startIce; finishIceRef.current = finishIce; });
  useEffect(() => {
    const onIce = (m) => {
      if (!m || !Array.isArray(m.events) || !m.events.length) return;
      if (m.seq != null && m.seq === iceSeen.current) return;
      iceSeen.current = m.seq;
      startIceRef.current(m.events);
    };
    socket.on("iceFx", onIce);
    return () => socket.off("iceFx", onIce);
  }, []);
}
