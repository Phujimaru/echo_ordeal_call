// ============================================================
//  BoardStage — กระดานเดินได้ในเกมจริง (จอคอม/แท็บเล็ต · GRID_PLAN §11)
//  แปลง state จาก server → props ของ BoardCanvas + ส่ง socket ตอนผู้เล่นกด
//   · ตาของเรา: ฟ้า = เดินถึง · แดง = เดินแล้วตีถึง · ชี้ศัตรู = แผนเดินเข้าไปตี + หน้าต่างคาดการณ์ + ลูกศรถอย
//   · โหมดเลือกเป้า (pick) จาก Game.jsx: สกิล target / aoe / line · ปืน GUTS · Mark 42
//   · นอกตาเรา: ชี้ตัวละคร = เห็นระยะเดิน/ตีของคนนั้น · กดตัวละคร = ดูสถานะ
//   · แถบลำดับเดินด้านบน · แบนเนอร์ "ลำดับเดิน" ตอน ORDER · ปุ่มระยะอันตราย · ป้ายข้อมูลช่อง · ป้ายร้านค้า
//   · ฉากตีบนกระดาน (ฟัน → สวน → ถอย/ชน) แทน AttackFx เต็มจอ
//  กติกาเดิน/ระยะใช้ boardRules.js (สร้างจาก server/board.js — ผลตรงกับ server)
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BoardCanvas from "./BoardCanvas";
import * as Rules from "./boardRules";
import { computeView, tileCenter } from "./boardDraw";
import { socket } from "../socket";
import { clickSound, playSfx } from "../audio";
import { GUTS_AMMO_INFO } from "../data/shop";
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
// ป้ายเหนือหัว: ช่วงจั่ว = หลังไพ่ + "พอ" · หลังเปิดไพ่ = แต้ม หรือ "แตก"
function tagOf(p, phase) {
  if (phase === "PLAYING") return { backs: p.cardCount || 0, text: p.locked ? "พอ" : "" };
  if (p.score == null) return null;
  return p.busted ? "แตก" : String(p.score);
}
// ความเสียหาย n หน่วย ลงเกราะก่อน → { hp, armor } ที่เหลือ
function afterHit(p, n) {
  const armor = p.armor || 0, hp = p.hp || 0;
  const toArmor = Math.min(armor, n);
  return { armor: armor - toArmor, hp: Math.max(0, hp - (n - toArmor)) };
}

export default function BoardStage({ state, me, lowQ, vp, pick, onInspect, registerOther, hidden }) {
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
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.key === "q" || e.key === "Q") rotate(-1);
      else if (e.key === "e" || e.key === "E") rotate(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rotate]);
  const hoverUnit = hover ? state.players.find((p) => p.alive && samePos(p.pos, hover)) : null;

  // ---------- ระยะเดินของเรา ----------
  const myReach = useMemo(() => {
    if (!myTurn || !map) return null;
    const mov = canMove ? (me.mov || 0) : 0;
    return Rules.reachable(map, unitOf(me), mov, ruleUnits, { isAlly, blocked });
  }, [myTurn, canMove, map, me, ruleUnits, isAlly, blocked]);

  // แผนตีศัตรูที่ชี้อยู่: ช่องยืนที่เดินน้อยสุดซึ่งตีถึง + ตีสวนได้ไหม + ถอยไปไหน
  const plan = useMemo(() => {
    if (!myTurn || pick || !myReach || !hoverUnit || !isEnemy(hoverUnit) || !hoverUnit.pos) return null;
    const foe = hoverUnit;
    const range = me.range || [1, 1];
    let best = null;
    for (const n of myReach.values()) {
      if (!Rules.inRange(range, Rules.dist(n, foe.pos))) continue;
      if (!best || n.d < best.d) best = n;
    }
    if (!best) return null;
    const stand = { x: best.x, y: best.y };
    const counter = Rules.canCounter(foe.range || [1, 1], stand, foe.pos);
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
  }, [myTurn, pick, myReach, hoverUnit, me, ruleUnits, map, blocked]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!seeded.current) { seeded.current = true; prevPos.current = nextPos; prevVit.current = nextVit; return; }

    // เดิน: ตำแหน่งคนที่กำลังเดินเปลี่ยนตามเส้นทางของตานี้
    const anims = [];
    const path = state.action && state.action.path;
    if (state.actorId && path && path.length > 1) {
      const id = state.actorId, before = prevPos.current[id], now = nextPos[id];
      if (before && now && !samePos(before, now) && samePos(path[0], before) && samePos(path[path.length - 1], now)) {
        anims.push({ kind: "move", id, path, seq: ++fxSeq.current });
      }
    }
    // ฉากตี: ฟัน → (สวน) → ถอย/ชน
    const involved = new Set();
    if (freshAtk) {
      const a = freshAtk;
      involved.add(a.byId); involved.add(a.targetId);
      const tPos = nextPos[a.targetId] || prevPos.current[a.targetId];
      const fromPos = a.push ? a.push.from : (nextPos[a.byId] || prevPos.current[a.byId]);
      if (a.push) setHold((h) => ({ ...h, [a.byId]: a.push.from }));
      // เสียงตีจังหวะแรก App เล่นให้แล้ว (createPhaseSoundTracker) — ที่นี่เล่นเฉพาะเสียงตีสวน
      if (tPos) {
        const first = a.gun ? (GUTS_AMMO_INFO[a.gun]?.name || "ยิง")
          : a.dodge ? "หลบ" : `-${a.dmg}`;
        pushFx([
          { kind: "slash", x: tPos.x, y: tPos.y, color: a.byColor },
          { kind: "float", x: tPos.x, y: tPos.y, text: first, color: a.gun ? "#ffd27a" : undefined, size: a.gun ? 20 : undefined },
          ...(a.kill ? [{ kind: "float", x: tPos.x, y: tPos.y - 0.6, text: "ตกรอบ", color: "#ff8f8f", size: 22 }] : []),
        ]);
      }
      let t = 0;
      if (a.counter && fromPos) {
        t = 560;
        const c = a.counter;
        later(t, () => {
          playSfx(c.byAttackSound || "attack");
          pushFx([
            { kind: "slash", x: fromPos.x, y: fromPos.y, color: c.byColor },
            { kind: "float", x: fromPos.x, y: fromPos.y, text: c.dodge ? "หลบ" : `สวน -${c.dmg}`, color: "#ffb0a8", size: 22 },
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
    }
    // เลือด/เกราะเปลี่ยนนอกฉากตี (สกิล/สถานะ/ช่องพิเศษ) → ตัวเลขลอย
    for (const p of state.players) {
      if (involved.has(p.id) || !p.pos) continue;
      const d = (nextVit[p.id] || 0) - (prevVit.current[p.id] ?? nextVit[p.id]);
      if (d < 0) pushFx([{ kind: "float", x: p.pos.x, y: p.pos.y, text: `${d}` }]);
      else if (d > 0) pushFx([{ kind: "float", x: p.pos.x, y: p.pos.y, text: `+${d}`, color: "#8ff0b0" }]);
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

  // ---------- ตัวละครบนกระดาน ----------
  const units = useMemo(() => state.players.filter((p) => p.alive && p.pos).map((p) => {
    const at = hold[p.id] || p.pos;
    return {
      id: p.id, x: at.x, y: at.y, img: p.img, color: p.color, name: p.name,
      hp: p.hp ?? 0, maxHp: p.maxHp ?? 0, armor: p.armor ?? 0, maxArmor: p.maxArmor ?? 0,
      isMe: !!me && p.id === me.id, isActor: p.id === state.actorId, teamId: p.teamId || null,
      tag: tagOf(p, phase),
    };
  }), [state.players, state.actorId, me, phase, hold]);

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
    if (myTurn && !busy && !pendingAttack.current && plan && plan.foe.id === id) {
      clickSound();
      if (samePos(plan.stand, me.pos)) socket.emit("attack", { targetId: id });
      else { pendingAttack.current = id; socket.emit("move", { x: plan.stand.x, y: plan.stand.y }); }
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

  // ป้ายร้านค้าลอยเหนือแผง (ตำแหน่งจอจากสูตรเดียวกับตัววาด)
  const shopTag = useMemo(() => {
    if (!shopPos || !vp) return null;
    const view = computeView(vp.w, vp.h);
    const [lx, ly] = tileCenter(shopPos.x, shopPos.y, 2.1, rotation);
    return { left: view.ox + lx * view.k, top: view.oy + ly * view.k };
  }, [shopPos, vp, rotation]);

  // ---------- หน้าต่างคาดการณ์ ----------
  const forecast = plan && state.forecast ? state.forecast[plan.foe.id] : null;

  // ---------- แถบลำดับเดิน ----------
  const order = phase === "PLAYING" || !state.turnOrder || !state.turnOrder.length
    ? [...state.players].filter((p) => p.alive).sort((a, b) => (a.position || 0) - (b.position || 0)).map((p) => p.id)
    : state.turnOrder;
  const actorIdx = state.actorId ? order.indexOf(state.actorId) : -1;

  if (!map) return null;
  return (
    <div className="bs-root" data-hidden={hidden ? "true" : "false"}>
      <BoardCanvas
        map={state.board}
        units={units}
        highlights={highlights}
        shopPos={shopPos}
        night={night}
        lowQ={lowQ}
        rotation={rotation}
        anim={anim}
        fx={fx}
        onAnimDone={onAnimDone}
        onTileClick={onTileClick}
        onUnitClick={onUnitClick}
        onHoverTile={(x, y) => setHover(x == null ? null : { x, y })}
      />

      {/* แถบลำดับเดิน */}
      <div className="bs-order" data-phase={phase}>
        {order.map((id, i) => {
          const p = byId[id];
          if (!p) return null;
          const done = phase !== "PLAYING" && actorIdx >= 0 && i < actorIdx;
          const cur = id === state.actorId;
          const tag = tagOf(p, phase);
          return (
            <div key={id} className="bs-order-item" data-cur={cur ? "true" : "false"} data-done={done || !p.alive ? "true" : "false"} style={{ "--bs-c": p.color }}
              ref={(el) => registerOther && registerOther(id, el)}>
              <img src={p.img} alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
              <span className="bs-order-name">{p.name}</span>
              {typeof tag === "string" ? <span className="bs-order-tag" data-bust={tag === "แตก" ? "true" : "false"}>{tag}</span>
                : tag && tag.text ? <span className="bs-order-tag">{tag.text}</span> : null}
            </div>
          );
        })}
      </div>

      {/* แบนเนอร์ลำดับเดิน (ORDER ~2 วิ) */}
      {phase === "ORDER" && (
        <div className="bs-banner" key={`order-${state.roundNumber}`}>
          <div className="bs-banner-title">ลำดับเดิน</div>
          <div className="bs-banner-row">
            {order.map((id, i) => {
              const p = byId[id];
              if (!p) return null;
              const tag = tagOf(p, phase);
              return (
                <div key={id} className="bs-banner-item" style={{ "--bs-c": p.color, animationDelay: `${i * 0.08}s` }}>
                  <span className="bs-banner-n">{i + 1}</span>
                  <img src={p.img} alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                  <span className="bs-banner-name">{p.name}</span>
                  {typeof tag === "string" && <span className="bs-order-tag" data-bust={tag === "แตก" ? "true" : "false"}>{tag}</span>}
                </div>
              );
            })}
          </div>
        </div>
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

      {/* ปุ่มระยะอันตราย + หมุนกระดาน */}
      <div className="bs-tools">
        <button type="button" className="bs-tool" title="หมุนซ้าย (Q)" onClick={() => { clickSound(); rotate(-1); }}>⟲</button>
        <button type="button" className="bs-tool" title="หมุนขวา (E)" onClick={() => { clickSound(); rotate(1); }}>⟳</button>
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

      {/* ป้ายร้านค้า: เหลือ N เทิร์น */}
      {shopTag && state.shopTurnsLeft > 0 && (
        <div className="bs-shoptag" style={{ left: shopTag.left, top: shopTag.top }}>🏪 {state.shopTurnsLeft}</div>
      )}

      {/* หน้าต่างคาดการณ์ (แบบ FE) */}
      {plan && (
        <div className="bs-fc">
          <FcSide p={me} label="เรา" dmg={forecast ? forecast.dmg : null} take={plan.counter && forecast ? forecast.back : 0} />
          <div className="bs-fc-mid">
            <span>{forecast && forecast.dmg != null ? `-${forecast.dmg}` : "?"}</span>
            <span className="bs-fc-arrow">⚔</span>
            <span>{plan.counter ? (forecast && forecast.back != null ? `สวน -${forecast.back}` : "สวน") : "ไม่สวน"}</span>
            {plan.push && <span className="bs-fc-push">{plan.push.collide ? "ชน -1" : "ถอย 1"}</span>}
          </div>
          <FcSide p={plan.foe} label="เป้า" take={forecast ? forecast.dmg : 0} right />
        </div>
      )}
    </div>
  );
}

// ฝั่งหนึ่งของหน้าต่างคาดการณ์: รูป · ชื่อ · เลือด/เกราะ ตอนนี้ → หลังโดน
function FcSide({ p, label, take, right }) {
  if (!p) return null;
  const after = afterHit(p, take || 0);
  return (
    <div className="bs-fc-side" data-right={right ? "true" : "false"} style={{ "--bs-c": p.color }}>
      <img src={p.img} alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
      <div className="bs-fc-info">
        <div className="bs-fc-label">{label}</div>
        <div className="bs-fc-name">{p.name}</div>
        <div className="bs-fc-vit">
          <span className="bs-fc-hp">♥ {p.hp ?? "?"}{take ? <b> → {after.hp}</b> : null}</span>
          <span className="bs-fc-ar">⛨ {p.armor ?? "?"}{take ? <b> → {after.armor}</b> : null}</span>
        </div>
      </div>
    </div>
  );
}
