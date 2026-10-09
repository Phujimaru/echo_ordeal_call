// ============================================================
//  BoardStage — กระดานเดินได้ในเกมจริง (จอคอม/แท็บเล็ต · GRID_PLAN §11)
//  แปลง state จาก server → props ของ BoardCanvas + ส่ง socket ตอนผู้เล่นกด
//   · ตาของเรา: ฟ้า = เดินถึง · แดง = เดินแล้วตีถึง · ชี้ศัตรู = แผนเดินเข้าไปตี + หน้าต่างคาดการณ์ + ลูกศรถอย
//   · โหมดเลือกเป้า (pick) จาก Game.jsx: สกิล target / aoe / line · ปืน GUTS · Mark 42
//   · นอกตาเรา: ชี้ตัวละคร = เห็นระยะเดิน/ตีของคนนั้น · กดตัวละคร = ดูสถานะ
//   · แถบลำดับเดินด้านบน (หกเหลี่ยมใหญ่บนเส้นโคจร) · ฉากลำดับเดินเต็มจอตอน ORDER · ฉากตาเดิน (แบบ A) ทุกครั้งที่ขึ้นตาใหม่
//   · กดศัตรู / ปุ่มโจมตี = หน้าคาดการณ์เต็มจอ (แทน HUD) → ยืนยัน = เดินเข้าไปตี · ฉากตี: กล้องซูมเข้าคู่ · หมากพุ่งชน · ปะทะ + เสียง
//   · ตาของเรา: W A S D (ตำแหน่งปุ่ม — แป้นไทยก็ใช้ได้) เลื่อนช่องเป้าหมายตามมุมกล้อง · Enter/Space = เดิน/เปิดหน้าคาดการณ์ · Esc = ยกเลิก
//   · ปุ่มระยะอันตราย · ป้ายข้อมูลช่อง · ป้ายร้านค้า (วาดในแคนวาส)
//   · กล้อง: หมุน ⟲ ⟳ (Q/E) · ซูม ＋/－ (ล้อเมาส์) มุมปกติ/มุมใกล้ — จำไว้ในเครื่อง · มุมใกล้: ลาก/ลูกศรเลื่อนดู
//     เริ่มตาใคร/ตี/เดิน/เลือดเปลี่ยน → ส่ง focus ให้ BoardCanvas เลื่อนตามถ้าอยู่นอกจอ
//   · ฉากตีบนกระดาน (พุ่งชน → ปะทะ → สวน → ถอย/ชน) แทน AttackFx เต็มจอ — เสียงตีเล่นที่จังหวะปะทะ (App ไม่เล่นซ้ำในโหมดกระดาน)
//  กติกาเดิน/ระยะใช้ boardRules.js (สร้างจาก server/board.js — ผลตรงกับ server)
// ============================================================
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BoardCanvas from "./BoardCanvas";
import * as Rules from "./boardRules";
import { socket } from "../socket";
import { clickSound, playSfx } from "../audio";
import { GUTS_AMMO_INFO } from "../data/shop";
import { ForecastScreen, OrderCall, TurnCall } from "./BoardScenes";
import { faceStyle } from "./charFace";
import "./boardStage.css";

const key = (x, y) => `${x},${y}`;
const samePos = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
// ทิศจากช่องเราไปช่องที่ชี้ (แกนที่ห่างกว่า) — ใช้กับสกิลแนว
function dirToward(from, to) {
  if (!from || !to) return null;
  const dx = to.x - from.x, dy = to.y - from.y;
  if (!dx && !dy) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}
// ทิศบนจอ → ทิศบนกระดาน ตามมุมที่หมุน (rotation = จำนวน 90° ตามเข็ม · เหมือน boardGeo.toView)
//  ขวาบนจอ = (cos, −sin) · ลงล่างจอ (เข้าหากล้อง) = (sin, cos)
function screenDir(rotation, code) {
  const a = (rotation % 4) * Math.PI / 2, c = Math.round(Math.cos(a)), sn = Math.round(Math.sin(a));
  if (code === "KeyD") return { x: c, y: -sn };
  if (code === "KeyA") return { x: -c, y: sn };
  if (code === "KeyS") return { x: sn, y: c };
  if (code === "KeyW") return { x: -sn, y: -c };
  return null;
}
const HEX_PTS = "50,0 100,28.5 100,85.5 50,114 0,85.5 0,28.5";

//  props เพิ่ม (ดีไซน์ UI ใหม่): atkSignal = ตัวเลขเปลี่ยน = ปุ่ม "โจมตี" ถูกกด · onAttackables(ids) = ศัตรูที่ตาเราตีถึง (เดินแล้วตีได้)
//   onOverlay(bool) = หน้าคาดการณ์เปิด/ปิด (Game ซ่อน HUD ทั้งหมด) · onCall(bool) = ฉากเต็มจอกำลังเล่น
export default function BoardStage({ state, me, lowQ, vp, pick, onInspect, registerOther, hidden, atkSignal = 0, onAttackables, onOverlay }) {
  const phase = state.gameState;
  const map = useMemo(() => Rules.normalizeMap(state.board), [state.board]);
  const teamMode = state.gameMode === "duo" || state.gameMode === "trio";
  const shopPos = state.shopPos || null;
  const blocked = useMemo(() => (shopPos ? new Set([key(shopPos.x, shopPos.y)]) : null), [shopPos]);
  const night = state.cycle === "night";

  // ผู้เล่นบนกระดาน (รูปที่ boardRules ใช้)
  const byId = useMemo(() => Object.fromEntries(state.players.map((p) => [p.id, p])), [state.players]);
  const ruleUnits = useMemo(
    () => state.players.filter((p) => p.alive && p.pos).map((p) => ({ id: p.id, x: p.pos.x, y: p.pos.y, alive: true, teamId: p.teamId || null })),
    [state.players],
  );
  const isAlly = useCallback((a, b) => teamMode && !!a.teamId && a.teamId === b.teamId, [teamMode]);
  const unitOf = (p) => (p && p.pos ? { id: p.id, x: p.pos.x, y: p.pos.y, alive: true, teamId: p.teamId || null } : null);
  const isEnemy = (p) => !!p && !!me && p.id !== me.id && !(teamMode && me.teamId && p.teamId === me.teamId);

  const action = state.action;
  const myTurn = !!me && me.alive && !!me.pos && phase === "ACTION" && state.actorId === me.id && !!action;
  const canMove = myTurn && !action.moved && !action.locked;

  // ---------- โฮเวอร์ / ระยะอันตราย ----------
  const [hover, setHover] = useState(null);
  const [danger, setDanger] = useState(false);
  // หมุนกระดาน 4 มุม (ทีละ 90° ตามเข็มนาฬิกา) — จำไว้ในเครื่องผู้เล่น · Q / E = หมุนซ้าย / ขวา
  const [rotation, setRotation] = useState(() => {
    try { return Number(localStorage.getItem("echo.boardRotation")) % 4 || 0; } catch { return 0; }
  });
  const rotate = useCallback((d) => setRotation((r) => {
    const n = (r + d + 4) % 4;
    try { localStorage.setItem("echo.boardRotation", String(n)); } catch { /* ไม่มีที่เก็บ */ }
    return n;
  }), []);
  // ซูม 2 ระดับ: 0 = มุมปกติ (เห็นทั้งกระดาน) · 1 = มุมใกล้ (ค่าเริ่ม — ผู้ใช้ตัดสิน 2026-10-09) — จำไว้ในเครื่องผู้เล่น · ล้อเมาส์บนกระดาน/ปุ่ม ＋－
  const [zoom, setZoomState] = useState(() => {
    try { return localStorage.getItem("echo.boardZoom") === "0" ? 0 : 1; } catch { return 1; }
  });
  const setZoom = useCallback((z) => {
    const n = z ? 1 : 0;
    setZoomState(n);
    try { localStorage.setItem("echo.boardZoom", String(n)); } catch { /* ไม่มีที่เก็บ */ }
  }, []);
  // จุดที่กล้องมุมใกล้ควรเห็น (อ็อบเจกต์ใหม่ = เลื่อนไปถ้าอยู่นอกจอ)
  const [focus, setFocus] = useState(() => (me && me.pos ? { x: me.pos.x, y: me.pos.y } : null));
  const look = useCallback((pos) => { if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) setFocus({ x: pos.x, y: pos.y }); }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      // ใช้ตำแหน่งปุ่ม (e.code) ไม่ใช่ตัวอักษร — แป้นโหมดไทย Q/E พิมพ์เป็น ๆ/ำ
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === "KeyQ") rotate(-1);
      else if (e.code === "KeyE") rotate(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rotate]);
  const hoverUnit = hover ? state.players.find((p) => p.alive && samePos(p.pos, hover)) : null;
  // เริ่มตาใคร (รวมตาเรา) → กล้องตามคนนั้น (ปรับ state ระหว่าง render ตามตาที่เปลี่ยน — ไม่ต้องรอ effect)
  const [lookedTurn, setLookedTurn] = useState("");
  const turnKey = phase === "ACTION" && state.actorId ? `${state.roundNumber}|${state.actorId}` : lookedTurn;
  if (turnKey !== lookedTurn) {
    setLookedTurn(turnKey);
    const a = byId[state.actorId];
    if (a && a.pos) setFocus({ x: a.pos.x, y: a.pos.y });
  }

  // ---------- ระยะเดินของเรา ----------
  const myReach = useMemo(() => {
    if (!myTurn || !map) return null;
    const mov = canMove ? (me.mov || 0) : 0;
    return Rules.reachable(map, unitOf(me), mov, ruleUnits, { isAlly, blocked });
  }, [myTurn, canMove, map, me, ruleUnits, isAlly, blocked]);

  // แผนตีศัตรู foe: ช่องยืนที่เดินน้อยสุดซึ่งตีถึง + ตีสวนได้ไหม + ถอยไปไหน (ตีไม่ถึง = null)
  const planFor = useCallback((foe) => {
    if (!myTurn || pick || !myReach || !foe || !isEnemy(foe) || !foe.pos || !foe.alive) return null;
    const range = me.range || [1, 1];
    let best = null;
    for (const n of myReach.values()) {
      if (!Rules.inRange(range, Rules.dist(n, foe.pos))) continue;
      if (!best || n.d < best.d) best = n;
    }
    if (!best) return null;
    const stand = { x: best.x, y: best.y };
    // ตีสวนเฉพาะคนที่มีความสามารถ (foe.counter — ตอนนี้ไม่มีใคร)
    const counter = !!foe.counter && Rules.canCounter(foe.range || [1, 1], stand, foe.pos);
    let push = null;
    if (counter) {
      const moved = ruleUnits.map((u) => (u.id === me.id ? { ...u, ...stand } : u));
      const pb = Rules.pushback(map, stand, foe.pos, moved, { selfId: me.id, blocked });
      push = { from: stand, to: { x: pb.x, y: pb.y }, collide: pb.collide };
      if (pb.collide) {
        // ลูกศรชน: ชี้ไปช่องที่ควรถอย (ขยับนิดแล้วเด้งกลับ)
        const dx = Math.sign(stand.x - foe.pos.x), dy = Math.sign(stand.y - foe.pos.y);
        push.to = Math.abs(stand.x - foe.pos.x) >= Math.abs(stand.y - foe.pos.y) && dx ? { x: stand.x + dx, y: stand.y } : { x: stand.x, y: stand.y + (dy || 1) };
      }
    }
    return { foe, stand, path: Rules.pathTo(myReach, stand.x, stand.y), counter, push };
  }, [myTurn, pick, myReach, me, ruleUnits, map, blocked]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = useMemo(() => (hoverUnit ? planFor(hoverUnit) : null), [planFor, hoverUnit]);
  // ศัตรูที่ตาเราตีถึง (ใกล้สุดก่อน) — ปุ่ม "โจมตี" ใช้ · ส่งให้ Game เฉพาะตอนรายการเปลี่ยน
  const attackables = useMemo(() => {
    if (!myTurn || pick) return [];
    return state.players.map((p) => planFor(p)).filter(Boolean).sort((a, b) => (a.path ? a.path.length : 0) - (b.path ? b.path.length : 0)).map((pl) => pl.foe.id);
  }, [myTurn, pick, state.players, planFor]);
  const atkSig = attackables.join(",");
  useEffect(() => { if (onAttackables) onAttackables(atkSig ? atkSig.split(",") : []); }, [atkSig]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- หน้าคาดการณ์เต็มจอ (กดศัตรู / ปุ่มโจมตี) ----------
  const [fcId, setFcId] = useState(null);
  const fcFoe = fcId ? byId[fcId] : null;
  const fcPlan = fcFoe ? planFor(fcFoe) : null;
  if (fcId && !fcPlan) setFcId(null); // หมดตา/เป้าหลุดระยะ = ปิดเอง
  useEffect(() => { if (onOverlay) onOverlay(!!fcId); }, [fcId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [seenAtkSignal, setSeenAtkSignal] = useState(atkSignal);
  if (atkSignal !== seenAtkSignal) {
    setSeenAtkSignal(atkSignal);
    if (attackables.length) setFcId(attackables[0]);
  }

  // ---------- โหมดเลือกเป้า (สกิล/ปืน/Mark 42) ----------
  const pickInfo = useMemo(() => {
    if (!pick || !me || !me.pos || !map) return null;
    if (pick.kind === "target") {
      const tiles = Rules.tilesInRange(map, me.pos.x, me.pos.y, pick.range);
      const keys = new Set(tiles.map((t) => key(t.x, t.y)));
      if (pick.self) keys.add(key(me.pos.x, me.pos.y));
      const valid = new Set(state.players.filter((p) => p.alive && p.pos && keys.has(key(p.pos.x, p.pos.y)) && (!pick.allow || pick.allow(p))).map((p) => p.id));
      return { skill: [...keys], valid };
    }
    if (pick.kind === "aoe") return { aoe: Rules.aoeTiles(map, me.pos.x, me.pos.y, pick.radius).map((t) => key(t.x, t.y)) };
    if (pick.kind === "line") {
      const dir = dirToward(me.pos, hover) || pick.lastDir || "up";
      return { dir, aoe: Rules.lineTiles(map, me.pos.x, me.pos.y, dir, pick.len, pick.width).map((t) => key(t.x, t.y)) };
    }
    return null;
  }, [pick, me, map, hover, state.players]);

  // ---------- ระยะอันตราย: ช่องที่ศัตรูทุกคนเดินแล้วตีถึง ----------
  const dangerKeys = useMemo(() => {
    if (!danger || !map || !me) return null;
    const out = new Set();
    for (const p of state.players) {
      if (!p.alive || !p.pos || !isEnemy(p)) continue;
      const z = Rules.threatZone(map, unitOf(p), p.mov || 0, p.range || [1, 1], ruleUnits, { isAlly, blocked });
      for (const k of z.move) out.add(k);
      for (const k of z.threat) out.add(k);
    }
    return [...out];
  }, [danger, map, me, state.players, ruleUnits, isAlly, blocked]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- แอนิเมชัน: เดิน (จาก action.path) / ถอย (ฉากตี) ----------
  const [animQ, setAnimQ] = useState([]);
  const anim = animQ[0] || null;
  const [fx, setFx] = useState([]);
  const fxSeq = useRef(0);
  const pushFx = useCallback((list) => setFx((old) => [...old.slice(-30), ...list.map((f) => ({ ...f, key: ++fxSeq.current }))]), []);
  const [hold, setHold] = useState({}); // id → ช่องที่ค้างไว้ระหว่างฉากตี (ก่อนแอนิเมชันถอยเริ่ม)
  const [cinema, setCinema] = useState(null); // กล้องฉากตี { a, b, z }
  const [ghost, setGhost] = useState(null);   // เป้าที่ตกรอบในฉากตี (วาดค้างไว้จนถึงจังหวะปะทะ)
  const [shake, setShake] = useState(0);      // จอสั่น/แฟลช (เลขเปลี่ยน = เล่นใหม่)
  const prevPlayers = useRef({});
  const prevPos = useRef({});
  const prevVit = useRef({});
  const seenAttack = useRef(null);
  const seeded = useRef(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms, fn) => { timers.current.push(setTimeout(fn, ms)); };

  useEffect(() => {
    const atk = phase === "ATTACKING" ? state.attack : null;
    const freshAtk = atk && atk.id !== seenAttack.current ? atk : null;
    if (freshAtk) seenAttack.current = freshAtk.id;
    const nextPos = {}, nextVit = {};
    for (const p of state.players) { nextPos[p.id] = p.pos ? { ...p.pos } : null; nextVit[p.id] = (p.hp || 0) + (p.armor || 0); }
    const lastPlayers = prevPlayers.current;
    prevPlayers.current = Object.fromEntries(state.players.map((p) => [p.id, p]));
    if (!seeded.current) { seeded.current = true; prevPos.current = nextPos; prevVit.current = nextVit; return; }

    // เดิน: ตำแหน่งคนที่กำลังเดินเปลี่ยนตามเส้นทางของตานี้
    const anims = [];
    const path = state.action && state.action.path;
    if (state.actorId && path && path.length > 1) {
      const id = state.actorId, before = prevPos.current[id], now = nextPos[id];
      if (before && now && !samePos(before, now) && samePos(path[0], before) && samePos(path[path.length - 1], now)) {
        anims.push({ kind: "move", id, path, seq: ++fxSeq.current });
        look(now);
      }
    }
    // ฉากตี (ดีไซน์ใหม่): กล้องซูมเข้าคู่ → หมากพุ่งชน → ปะทะ (แสงแตก + จอสั่น/แฟลช + เลขดาเมจ + เสียงตี) → (สวน) → ถอย/ชน → กล้องคืน
    //  ยิงปืน = ไม่พุ่ง (ยิงจากที่ยืน) · lowQ = ไม่ซูม/ไม่พุ่ง (ปะทะทันที)
    const involved = new Set();
    if (freshAtk) {
      const a = freshAtk;
      involved.add(a.byId); involved.add(a.targetId);
      const tPos = nextPos[a.targetId] || prevPos.current[a.targetId];
      const fromPos = a.push ? a.push.from : (nextPos[a.byId] || prevPos.current[a.byId]);
      if (a.push) setHold((h) => ({ ...h, [a.byId]: a.push.from }));
      const melee = !a.gun && fromPos && tPos && Math.abs(fromPos.x - tPos.x) + Math.abs(fromPos.y - tPos.y) <= 2;
      const ZOOM_IN = lowQ ? 0 : 480;
      const HIT = ZOOM_IN + (melee && !lowQ ? 385 : 120);
      // เป้าตกรอบ (server เอาออกจากกระดานแล้ว) = วาดค้างไว้ถึงจังหวะปะทะ
      if (a.kill && tPos && !nextPos[a.targetId] && lastPlayers[a.targetId]) {
        const t = lastPlayers[a.targetId];
        setGhost({ id: t.id, x: tPos.x, y: tPos.y, img: t.img, color: t.color, name: t.name, hp: t.hp ?? 0, maxHp: t.maxHp ?? 0, armor: t.armor ?? 0, maxArmor: t.maxArmor ?? 0 });
        later(HIT + 380, () => setGhost(null));
      }
      if (tPos) {
        look(tPos);
        if (!lowQ && fromPos) setCinema({ a: fromPos, b: tPos, z: 2 });
        if (melee && !lowQ) later(ZOOM_IN, () => setAnimQ((q) => [...q, { kind: "lunge", id: a.byId, from: fromPos, to: tPos, hitId: a.targetId, seq: ++fxSeq.current }]));
        later(HIT, () => {
          playSfx(a.byAttackSound || "attack");
          setShake((n) => n + 1);
          const first = a.gun ? (GUTS_AMMO_INFO[a.gun]?.name || "ยิง") : a.dodge ? "หลบ" : `-${a.dmg}`;
          pushFx([
            { kind: a.dodge ? "slash" : "burst", x: tPos.x, y: tPos.y, color: a.byColor },
            { kind: "float", x: tPos.x, y: tPos.y, text: first, color: a.gun ? "#ffd27a" : undefined, size: a.gun ? 20 : 30, z: lowQ ? 2.4 : 1.5 },
            ...(a.kill ? [{ kind: "float", x: tPos.x, y: tPos.y - 0.6, text: "ตกรอบ", color: "#ff8f8f", size: 24, z: lowQ ? 2.4 : 1.5 }] : []),
          ]);
        });
      }
      let t = HIT;
      if (a.counter && fromPos) {
        t = HIT + 640;
        const c = a.counter;
        later(t, () => {
          playSfx(c.byAttackSound || "attack");
          setShake((n) => n + 1);
          pushFx([
            { kind: c.dodge ? "slash" : "burst", x: fromPos.x, y: fromPos.y, color: c.byColor },
            { kind: "float", x: fromPos.x, y: fromPos.y, text: c.dodge ? "หลบ" : `สวน -${c.dmg}`, color: "#ffb0a8", size: 24 },
          ]);
        });
      }
      if (a.push) {
        later(t + 420, () => {
          setHold((h) => { const n = { ...h }; delete n[a.byId]; return n; });
          setAnimQ((q) => [...q, { kind: "push", id: a.byId, from: a.push.from, to: a.push.to, collide: a.push.collide, seq: ++fxSeq.current }]);
          if (a.push.collide) pushFx([{ kind: "float", x: a.push.from.x, y: a.push.from.y, text: "ชน -1", color: "#ffc56b", size: 22 }]);
        });
      }
      if (!lowQ) later(t + (a.push ? 900 : 1000), () => setCinema(null));
    }
    // เลือด/เกราะเปลี่ยนนอกฉากตี (สกิล/สถานะ/ช่องพิเศษ) → ตัวเลขลอย (กล้องตามคนแรกที่โดน)
    let hurtPos = null;
    for (const p of state.players) {
      if (involved.has(p.id) || !p.pos) continue;
      const d = (nextVit[p.id] || 0) - (prevVit.current[p.id] ?? nextVit[p.id]);
      if (d < 0) pushFx([{ kind: "float", x: p.pos.x, y: p.pos.y, text: `${d}` }]);
      else if (d > 0) pushFx([{ kind: "float", x: p.pos.x, y: p.pos.y, text: `+${d}`, color: "#8ff0b0" }]);
      if (d && !hurtPos) hurtPos = p.pos;
    }
    if (hurtPos && !freshAtk) look(hurtPos);
    // ขยับเองนอกการเดิน/ฉากตี (น้ำวนดัน ฯลฯ) ระยะ 1–2 ช่อง = เลื่อนไปแทนการกระโดด
    for (const p of state.players) {
      const before = prevPos.current[p.id], now = nextPos[p.id];
      if (!before || !now || samePos(before, now) || involved.has(p.id) || anims.some((a) => a.id === p.id)) continue;
      if (Math.abs(before.x - now.x) + Math.abs(before.y - now.y) > 2) continue; // ไกลกว่านั้น = วางใหม่ (เปลี่ยนภูมิภาค/ย้อนการเดิน)
      if (p.id === state.actorId && !(state.action && state.action.moved)) continue; // กดย้อน = กลับที่เดิมทันที
      anims.push({ kind: "push", id: p.id, from: before, to: now, collide: false, seq: ++fxSeq.current });
    }
    if (anims.length) setAnimQ((q) => [...q, ...anims]);
    prevPos.current = nextPos;
    prevVit.current = nextVit;
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps -- เทียบกับ state ก่อนหน้าเท่านั้น

  // เดินแล้วตีต่อ: รอแอนิเมชันเดินจบก่อนค่อยสั่งตี
  const pendingAttack = useRef(null);
  const onAnimDone = useCallback(() => {
    setAnimQ((q) => q.slice(1));
    const pa = pendingAttack.current;
    if (pa) { pendingAttack.current = null; socket.emit("attack", { targetId: pa }); }
  }, []);
  // ตานี้จบ/เปลี่ยนคน = ล้างตีค้าง
  useEffect(() => { if (!myTurn) pendingAttack.current = null; }, [myTurn]);

  // ---------- ไฮไลต์ ----------
  const highlights = useMemo(() => {
    const h = {};
    if (dangerKeys) h.danger = dangerKeys;
    if (anim) return h;
    if (pickInfo) {
      if (pickInfo.skill) h.skill = pickInfo.skill;
      if (pickInfo.aoe) h.aoe = pickInfo.aoe;
      // ชี้คนที่เลือกได้ = ไฮไลต์ช่องของคนนั้น (คนนอกระยะไม่ขึ้น — กดไม่ได้)
      if (pickInfo.valid && hoverUnit && hoverUnit.pos && pickInfo.valid.has(hoverUnit.id)) h.target = { x: hoverUnit.pos.x, y: hoverUnit.pos.y };
      return h;
    }
    if (myTurn && myReach) {
      const range = me.range || [1, 1];
      if (canMove) {
        const z = Rules.threatZone(map, unitOf(me), me.mov || 0, range, ruleUnits, { isAlly, blocked });
        h.move = [...z.move];
        h.attack = [...z.threat];
      } else {
        h.attack = Rules.tilesInRange(map, me.pos.x, me.pos.y, range).map((t) => key(t.x, t.y));
      }
      if (plan) {
        if (plan.path && plan.path.length > 1) h.path = plan.path;
        h.target = { x: plan.foe.pos.x, y: plan.foe.pos.y };
        if (plan.push) h.push = plan.push;
      } else if (hover && canMove && myReach.has(key(hover.x, hover.y))) {
        h.path = Rules.pathTo(myReach, hover.x, hover.y);
      } else if (hoverUnit && hoverUnit.pos && isEnemy(hoverUnit)) {
        // ชี้ศัตรูที่ตาเราเดินไปตีไม่ถึง = เห็นระยะเดิน+ตีของศัตรูตัวนั้น (แบบ FE)
        const z = Rules.threatZone(map, unitOf(hoverUnit), hoverUnit.mov || 0, hoverUnit.range || [1, 1], ruleUnits, { isAlly, blocked });
        h.danger = [...new Set([...(h.danger || []), ...z.move, ...z.threat])];
      }
      return h;
    }
    // นอกตาเรา: ชี้ตัวละคร = ระยะเดิน/ตีของคนนั้น (แบบ FE)
    if (hoverUnit && hoverUnit.pos && map) {
      const z = Rules.threatZone(map, unitOf(hoverUnit), hoverUnit.mov || 0, hoverUnit.range || [1, 1], ruleUnits, { isAlly, blocked });
      h.move = [...z.move];
      h.attack = [...z.threat];
    }
    return h;
  }, [dangerKeys, anim, pickInfo, myTurn, myReach, canMove, plan, hover, hoverUnit, map, me, ruleUnits, isAlly, blocked]);
  // โหมดเลือกเป้า: คนที่เลือกไม่ได้ (นอกระยะ/ไม่ใช่เป้าของท่านี้) ส่งธง dim ให้ตัววาด (GRID_PLAN §7 "คนนอกระยะจางลง")
  const pickValid = pickInfo && pickInfo.valid ? pickInfo.valid : null;

  // ---------- ตัวละครบนกระดาน ----------
  const units = useMemo(() => state.players.filter((p) => p.alive && p.pos).map((p) => {
    const at = hold[p.id] || p.pos;
    return {
      id: p.id, x: at.x, y: at.y, img: p.img, color: p.color, name: p.name,
      hp: p.hp ?? 0, maxHp: p.maxHp ?? 0, armor: p.armor ?? 0, maxArmor: p.maxArmor ?? 0,
      isMe: !!me && p.id === me.id, isActor: p.id === state.actorId, teamId: p.teamId || null,
      dim: !!pickValid && !pickValid.has(p.id),
    };
  }).concat(ghost && !state.players.some((p) => p.id === ghost.id && p.alive && p.pos) ? [{ ...ghost, isMe: false, isActor: false, teamId: null }] : []),
  [state.players, state.actorId, me, hold, pickValid, ghost]);

  // ---------- คลิก ----------
  const busy = !!anim;
  const onUnitClick = (id) => {
    const p = byId[id];
    if (!p) return;
    if (pick) {
      if (pick.kind === "target" && pickInfo && pickInfo.valid.has(id)) { clickSound(); pick.onPick(id); }
      else if (pick.kind === "aoe" && pickInfo && pickInfo.aoe.includes(key(p.pos.x, p.pos.y))) { clickSound(); pick.onConfirm(); }
      else if (pick.kind === "line" && pickInfo) { clickSound(); pick.onPick(pickInfo.dir); }
      return;
    }
    if (myTurn && !busy && !pendingAttack.current && planFor(p)) {
      clickSound();
      setFcId(id);
      return;
    }
    if (onInspect) onInspect(id);
  };
  const onTileClick = (x, y) => {
    const k = key(x, y);
    if (pick) {
      if (pick.kind === "aoe" && pickInfo && pickInfo.aoe.includes(k)) { clickSound(); pick.onConfirm(); }
      else if (pick.kind === "line" && pickInfo) { clickSound(); pick.onPick(dirToward(me.pos, { x, y }) || pickInfo.dir); }
      return;
    }
    if (!myTurn || busy || !canMove || !myReach) return;
    const n = myReach.get(k);
    if (!n || n.d === 0) return;
    clickSound();
    socket.emit("move", { x, y });
  };
  // ยืนยันโจมตีจากหน้าคาดการณ์: ยืนติดเป้าแล้ว = ตีเลย · ยังไม่ติด = เดินไปช่องยืนก่อน แล้วตีเมื่อแอนิเมชันเดินจบ
  const confirmAttack = useCallback(() => {
    const pl = fcPlan;
    setFcId(null);
    if (!pl || !myTurn || pendingAttack.current) return;
    clickSound();
    if (samePos(pl.stand, me.pos)) socket.emit("attack", { targetId: pl.foe.id });
    else { pendingAttack.current = pl.foe.id; socket.emit("move", { x: pl.stand.x, y: pl.stand.y }); }
  }, [fcPlan, myTurn, me]);
  const cancelForecast = useCallback(() => { clickSound(); setFcId(null); }, []);

  // ---------- เดินด้วยคีย์บอร์ด (ตาของเรา) ----------
  //  W A S D อ่านจากตำแหน่งปุ่ม (e.code) — แป้นภาษาไทยก็ใช้ได้ · เลื่อนช่องเป้าหมาย (ช่องที่เดินถึง หรือศัตรูที่ตีถึง) ตามทิศบนจอ
  //  Enter / Space = เดินไปช่องนั้น (ทับศัตรู = เปิดหน้าคาดการณ์) · Esc = ยกเลิก · เมาส์ขยับ = กลับไปใช้ตำแหน่งเมาส์
  const [kbCur, setKbCur] = useState(null);
  const kbKey = `${myTurn}|${state.actorId}|${action && action.moved}`;
  const [kbFor, setKbFor] = useState(kbKey);
  if (kbKey !== kbFor) { setKbFor(kbKey); setKbCur(null); }
  useEffect(() => {
    if (!myTurn || pick || fcId) return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return;
      const cur = kbCur || (hover && hover) || (me && me.pos) || null;
      const dir = screenDir(rotation, e.code);
      if (dir && cur) {
        e.preventDefault();
        // ก้าวไปทางนั้นจนเจอช่องที่ไปได้ (ข้ามช่องที่เดินไม่ถึง สูงสุด 6 ช่อง)
        for (let i = 1; i <= 6; i++) {
          const nx = cur.x + dir.x * i, ny = cur.y + dir.y * i;
          if (!Rules.inBounds(map, nx, ny)) break;
          const reach = myReach && myReach.has(key(nx, ny));
          const foe = state.players.find((p) => p.alive && p.pos && p.pos.x === nx && p.pos.y === ny);
          if (reach || (foe && planFor(foe)) || (me.pos && nx === me.pos.x && ny === me.pos.y)) {
            const t = { x: nx, y: ny };
            setKbCur(t); setHover(t); look(t);
            break;
          }
        }
        return;
      }
      if ((e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space") && kbCur) {
        e.preventDefault();
        const foe = state.players.find((p) => p.alive && samePos(p.pos, kbCur));
        if (foe && foe.id !== me.id) { if (planFor(foe)) { clickSound(); setFcId(foe.id); } return; }
        if (canMove && myReach && myReach.has(key(kbCur.x, kbCur.y)) && !samePos(kbCur, me.pos) && !anim) { clickSound(); socket.emit("move", { x: kbCur.x, y: kbCur.y }); setKbCur(null); }
        return;
      }
      if (e.code === "Escape" && kbCur) { setKbCur(null); setHover(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [myTurn, pick, fcId, kbCur, hover, me, rotation, map, myReach, state.players, planFor, canMove, anim, look]);

  // Esc = ออกจากโหมดเลือกเป้า
  useEffect(() => {
    if (!pick || !pick.onCancel) return undefined;
    const onKey = (e) => { if (e.key === "Escape") pick.onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pick]);

  // ---------- ป้ายข้อมูลช่อง ----------
  const tileInfo = useMemo(() => {
    if (!hover || !map) return null;
    if (samePos(shopPos, hover)) return { icon: "🏪", name: "ร้านค้ามายา", desc: state.shopTurnsLeft ? `เหลือ ${state.shopTurnsLeft} เทิร์น` : "" };
    return Rules.tileInfo(map, hover.x, hover.y); // ช่องพิเศษ / จุดฟื้นฟู (ชื่อตามภูมิภาค) · พื้นธรรมดา = null
  }, [hover, map, shopPos, state.shopTurnsLeft]);

  // ---------- ฉากเต็มจอ: ลำดับเดิน (ORDER) · ตาเดิน (ทุกครั้งที่ขึ้นตาใหม่) ----------
  const sk = vp ? Math.min(vp.w / 1920, vp.h / 1080) : 1; // ตัวย่อของเวทีออกแบบ 1920 × 1080
  const seat = [...state.players].filter((p) => p.alive || p.score != null).sort((a, b) => (a.position || 0) - (b.position || 0)).map((p) => p.id);
  const [call, setCall] = useState(null); // { id, key }
  const callKey = phase === "ACTION" && state.actorId ? `${state.roundNumber}|${state.actorId}` : "";
  const [calledKey, setCalledKey] = useState("");
  if (callKey && callKey !== calledKey) {
    setCalledKey(callKey);
    setCall({ id: state.actorId, key: callKey });
  }
  const endCall = useCallback(() => setCall(null), []);
  // เสียงฉากตาเดิน (ผู้ใช้ให้ไฟล์มา 2026-10-09): ตาเรา = notificate_mine · ตาคนอื่น = notificate
  useEffect(() => { if (call) playSfx(call.id === (me && me.id) ? "notificate_mine" : "notificate"); }, [call]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- แถบลำดับเดิน ----------
  const order = phase === "PLAYING" || !state.turnOrder || !state.turnOrder.length
    ? [...state.players].filter((p) => p.alive).sort((a, b) => (a.position || 0) - (b.position || 0)).map((p) => p.id)
    : state.turnOrder;
  const actor = state.actorId ? byId[state.actorId] : null;

  // แถบลำดับเดินชนแถบบนซ้าย (รอบ/ภูมิภาค) ในแนวนอน — จอแคบหรือคนเยอะ → ลดลงไปอยู่ใต้แถบบน
  //  วัดใหม่เมื่อจอ/รายชื่อ/ข้อความแถบบนเปลี่ยน (เทียบแค่แนวนอน ตำแหน่งแนวตั้งไม่มีผล) · setState เฉพาะตอนค่าเปลี่ยน
  const orderRef = useRef(null);
  const [orderLow, setOrderLow] = useState(0); // 0 = ที่เดิม · ตัวเลข = ระยะจากขอบบน (ใต้แถบบนซ้าย)
  const [orderDx, setOrderDx] = useState(0);   // ชนแถบบนซ้ายแต่เลื่อนขวาแล้วยังพ้นปุ่มกล้อง = เลื่อนขวาแทนการลงล่าง (ไม่บังกระดาน)
  const orderSig = `${vp ? vp.w : 0}x${vp ? vp.h : 0}|${order.join(",")}|${phase}|${state.roundNumber}|${state.journey ? state.journey.name : ""}`;
  useLayoutEffect(() => {
    const el = orderRef.current;
    const top = document.querySelector(".hud-top");
    let low = 0, dx = 0;
    if (el && top) {
      const a = el.getBoundingClientRect(), b = top.getBoundingClientRect();
      const left = a.left - orderDx, right = a.right - orderDx; // ตำแหน่งตอนยังไม่เลื่อน
      if (b.width > 0 && left < b.right + 8 && right > b.left - 8) {
        const need = b.right + 12 - left, tools = document.querySelector(".bs-tools");
        const limit = tools ? tools.getBoundingClientRect().left - 8 : window.innerWidth - 8;
        if (right + need <= limit) dx = Math.round(need);
        else low = Math.round(b.bottom + 6);
      }
    }
    setOrderLow(low);
    setOrderDx(dx);
  }, [orderSig, map, state.actorId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!map) return null;
  return (
    <div className="bs-root" data-hidden={hidden ? "true" : "false"} data-order-low={orderLow ? "true" : "false"}
      data-fc={fcId ? "true" : "false"} data-shake={shake % 2 ? "true" : "false"}
      style={{ "--bs-k": Math.max(0.55, Math.min(1.3, sk)), "--bs-order-dx": `${orderDx}px`, ...(orderLow ? { "--bs-order-top": `${orderLow}px` } : null) }}>
      <BoardCanvas
        map={state.board}
        units={units}
        highlights={highlights}
        shopPos={shopPos}
        night={night}
        lowQ={lowQ}
        rotation={rotation}
        zoom={zoom}
        onZoomChange={setZoom}
        focus={focus}
        cinema={cinema}
        shopLabel={state.shopTurnsLeft > 0 ? state.shopTurnsLeft : null}
        anim={anim}
        fx={fx}
        onAnimDone={onAnimDone}
        onTileClick={onTileClick}
        onUnitClick={onUnitClick}
        onHoverTile={(x, y) => setHover(x == null ? null : { x, y })}
      />

      {/* คนที่กำลังเดิน (บนกลาง) — แทนแถบลำดับทุกคน (ผู้ใช้สั่ง 2026-10-09: เหลือเฉพาะคนที่เดินตอนนี้ + รูปโปรไฟล์) · ช่วงอื่นไม่มี */}
      {actor && (phase === "ACTION" || phase === "ATTACKING") && (
        <div className="bs-actor" key={`actor-${actor.id}-${state.roundNumber}`} ref={orderRef} style={{ "--bs-c": actor.color || "#7fb8e6" }}>
          <div className="bs-actor-hexw" ref={(el) => registerOther && registerOther(actor.id, el)}>
            <svg className="bs-actor-ring" viewBox="0 0 100 114" preserveAspectRatio="none" aria-hidden="true"><polygon points={HEX_PTS} /></svg>
            <div className="bs-actor-frame" />
            <div className="bs-actor-face"><img src={actor.img} alt="" style={faceStyle(actor)} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} /></div>
          </div>
          <div className="bs-actor-plate">
            <b>{me && actor.id === me.id ? "คุณ" : actor.name}</b>
            {actor.character && actor.character.name && <small>{actor.character.name}</small>}
          </div>
          <span className="bs-actor-pts" data-bust={actor.busted ? "true" : "false"}>{actor.busted ? "แตก" : actor.score ?? "?"}</span>
        </div>
      )}

      {/* ฉากลำดับเดินเต็มจอ (ORDER ~6.5 วิ) */}
      {/* ฉากเต็มจอทั้งหมดไปอยู่ที่ <body> (ทับ HUD ทุกชั้น) */}
      {phase === "ORDER" && createPortal(
        <OrderCall key={`order-${state.roundNumber}`} k={sk} round={state.roundNumber} seat={seat.filter((id) => order.includes(id))} order={order} byId={byId} myId={me && me.id} lowQ={lowQ} />,
        document.body,
      )}
      {/* ฉากตาเดิน (แบบ A ประตูหกเหลี่ยม) */}
      {call && phase === "ACTION" && byId[call.id] && createPortal(
        <TurnCall key={call.key} k={sk} p={byId[call.id]} rank={Math.max(1, order.indexOf(call.id) + 1)} isMe={!!me && call.id === me.id} onDone={endCall} />,
        document.body,
      )}

      {/* โหมดเลือกเป้า */}
      {pick && (
        <div className="bs-pick">
          <span className="bs-pick-label">{pick.label}</span>
          {pick.kind === "aoe" && <button type="button" className="bs-btn bs-btn-gold" onClick={() => { clickSound(); pick.onConfirm(); }}>ใช้</button>}
          {pick.kind === "target" && pickInfo && pickInfo.valid.size === 0 && <span className="bs-pick-none">ไม่มีเป้าในระยะ</span>}
          <button type="button" className="bs-btn" onClick={() => { clickSound(); pick.onCancel(); }}>ยกเลิก</button>
        </div>
      )}

      {/* ปุ่มระยะอันตราย + หมุนกระดาน + ซูม */}
      <div className="bs-tools">
        <button type="button" className="bs-tool" title="หมุนซ้าย (Q)" onClick={() => { clickSound(); rotate(-1); }}>⟲</button>
        <button type="button" className="bs-tool" title="หมุนขวา (E)" onClick={() => { clickSound(); rotate(1); }}>⟳</button>
        <button type="button" className="bs-tool" data-on={zoom ? "true" : "false"} title={zoom ? "ซูมออก" : "ซูมเข้า"}
          onClick={() => { clickSound(); if (!zoom && me && me.pos) look(me.pos); setZoom(zoom ? 0 : 1); }}>{zoom ? "－" : "＋"}</button>
        <button type="button" className="bs-danger" data-on={danger ? "true" : "false"} onClick={() => { clickSound(); setDanger((v) => !v); }}>
          ระยะอันตราย
        </button>
      </div>

      {/* ป้ายข้อมูลช่อง */}
      {tileInfo && (
        <div className="bs-tile">
          <div className="bs-tile-name">{tileInfo.icon ? `${tileInfo.icon} ` : ""}{tileInfo.name}</div>
          {tileInfo.desc && <div className="bs-tile-desc">{tileInfo.desc}</div>}
        </div>
      )}

      {/* หน้าคาดการณ์ผลการตี (แทน HUD ทั้งจอ) */}
      {fcPlan && me && createPortal(
        <ForecastScreen
          k={sk} me={me} foe={fcPlan.foe}
          fc={state.forecast ? state.forecast[fcPlan.foe.id] : null}
          counter={!!fcPlan.counter}
          accurate={!!(me.statuses && me.statuses.accurate > 0)}
          onConfirm={confirmAttack} onCancel={cancelForecast}
        />,
        document.body,
      )}
      {shake > 0 && !lowQ && <div className="bs-flash" key={`flash-${shake}`} />}
    </div>
  );
}
