// หน้าดูกระดานเดินได้ (เฉพาะ dev): ?board=1 — ดู main.jsx
//  ไว้ตรวจตัววาด BoardCanvas โดยไม่ต้องเปิดห้องจริง: ด่าน I + ตัวละครจำลอง 6 ตัว
//  คลิกตัวละคร = เลือกเป็นคนเดิน · คลิกช่องฟ้า = เดิน · คลิกศัตรูในช่องแดง = เดินเข้าไปตี (สวน/ถอย/ชน แบบง่าย)
//  ปุ่ม: กลางคืน · ประหยัดสเปก (lowQ) · ระยะอันตราย · โหมด เดิน / สกิลระยะ 3 / ตีหมู่ 5
//  BFS ในไฟล์นี้เป็นของหน้าทดสอบเท่านั้น — เกมจริงคำนวณที่ server (server/board.js)
import { useMemo, useRef, useState } from "react";
import BoardCanvas from "./BoardCanvas";

// สำเนาแผนที่ภูมิภาค I จาก server/board.js MAPS[1] ในรูปแบบที่ server จะส่งมาเป็น state.board
const t = (list) => list.map(([x, y]) => `${x},${y}`);
const REGION1 = {
  area: 1, cols: 16, rows: 12,
  terrain: Object.fromEntries([
    ...t([[0, 0], [1, 1], [0, 7], [1, 8], [0, 10], [15, 0], [14, 1], [15, 7], [14, 8], [15, 10], [3, 6], [12, 6]]).map((k) => [k, "tree"]),
    ...t([[4, 3], [11, 3], [4, 8], [11, 8]]).map((k) => [k, "pillar"]),
    ...t([[6, 1], [9, 1]]).map((k) => [k, "banner"]),
    ...t([[5, 9], [10, 9], [5, 2], [10, 2]]).map((k) => [k, "hedge"]),
  ]),
  heal: t([[7, 5], [8, 5], [7, 6], [8, 6]]),
  spawns: [[2, 9], [13, 9], [1, 4], [14, 4], [4, 0], [11, 0], [7, 11]].map(([x, y]) => ({ x, y })),
  shopSpots: [[7, 2], [2, 2], [13, 2], [2, 10], [13, 10], [8, 9]].map(([x, y]) => ({ x, y })),
};
const SHOP = { x: 7, y: 2 };
const MUIMI = "/characters/muimi/muimi.webp";
const OBERON = "/characters/oberon(summer)/oberon_summer.webp";
const MOV = 4;

const initialUnits = () => [
  { id: "me", name: "มุยมิ", img: MUIMI, color: "#3B82C4", x: 2, y: 9, hp: 5, maxHp: 7, armor: 2, maxArmor: 3, tag: "18" },
  { id: "p2", name: "โอเบรอน", img: OBERON, color: "#C0392B", x: 6, y: 8, hp: 6, maxHp: 7, armor: 1, maxArmor: 3, tag: "พอ" },
  { id: "p3", name: "มุยมิ (บอท)", img: MUIMI, color: "#9B4F96", x: 11, y: 5, hp: 7, maxHp: 7, armor: 3, maxArmor: 3, tag: "แตก" },
  { id: "p4", name: "โอเบรอน (บอท)", img: OBERON, color: "#2E9E4B", x: 9, y: 3, hp: 4, maxHp: 7, armor: 0, maxArmor: 3, tag: { backs: 2 } },
  { id: "p5", name: "ไม่มีรูป", img: "/characters/__missing__.webp", color: "#E5B33B", x: 12, y: 9, hp: 3, maxHp: 7, armor: 3, maxArmor: 3, tag: "20" },
  { id: "p6", name: "โอเบรอน 2", img: OBERON, color: "#E86A2B", x: 3, y: 3, hp: 7, maxHp: 7, armor: 2, maxArmor: 3, tag: "15" },
];

const key = (x, y) => `${x},${y}`;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const inB = (x, y) => x >= 0 && y >= 0 && x < REGION1.cols && y < REGION1.rows;
const isBlocked = (x, y) => !inB(x, y) || !!REGION1.terrain[key(x, y)] || (x === SHOP.x && y === SHOP.y);
const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// BFS 4 ทิศ ไม่เกิน mov ก้าว — ตัวละครอื่นขวางทาง
function reach(units, u, mov) {
  const start = { x: u.x, y: u.y, d: 0, prev: null };
  const R = new Map([[key(u.x, u.y), start]]), q = [start];
  while (q.length) {
    const c = q.shift();
    if (c.d >= mov) continue;
    for (const [dx, dy] of DIRS) {
      const nx = c.x + dx, ny = c.y + dy, k = key(nx, ny);
      if (R.has(k) || isBlocked(nx, ny) || units.some((o) => o.id !== u.id && o.x === nx && o.y === ny)) continue;
      const n = { x: nx, y: ny, d: c.d + 1, prev: c };
      R.set(k, n); q.push(n);
    }
  }
  return R;
}
function pathOf(R, x, y) {
  let n = R.get(key(x, y));
  if (!n) return null;
  const out = [];
  while (n) { out.unshift({ x: n.x, y: n.y }); n = n.prev; }
  return out;
}
// ช่องแดง = ตีถึงหลังเดิน (ระยะ 1) ไม่รวมช่องที่เดินถึง
function threat(R) {
  const out = new Set();
  for (const n of R.values()) for (const [dx, dy] of DIRS) {
    const x = n.x + dx, y = n.y + dy, k = key(x, y);
    if (!R.has(k) && inB(x, y) && !REGION1.terrain[k]) out.add(k);
  }
  return out;
}
function diamond(cx, cy, r) {
  const out = [];
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
    const d = Math.abs(dx) + Math.abs(dy);
    if (d >= 1 && d <= r && inB(cx + dx, cy + dy)) out.push(key(cx + dx, cy + dy));
  }
  return out;
}
// ถอย 1 ช่องออกจากผู้สวน · ไม่มีที่ถอย = ชน
function pushback(units, a, d) {
  const dx = a.x - d.x, dy = a.y - d.y;
  const dirs = Math.abs(dx) > Math.abs(dy) ? [[Math.sign(dx), 0]] : Math.abs(dy) > Math.abs(dx) ? [[0, Math.sign(dy)]] : [[0, Math.sign(dy)], [Math.sign(dx), 0]];
  for (const [ux, uy] of dirs) {
    const nx = a.x + ux, ny = a.y + uy;
    if (!isBlocked(nx, ny) && !units.some((o) => o.id !== a.id && o.x === nx && o.y === ny)) return { to: { x: nx, y: ny }, collide: false };
  }
  const [ux, uy] = dirs[0];
  return { to: { x: a.x + ux, y: a.y + uy }, collide: true };
}
const hurt = (u, n) => { let { armor, hp } = u; for (let i = 0; i < n; i++) { if (armor > 0) armor--; else hp--; } return { ...u, armor, hp: Math.max(0, hp) }; };

const btn = (on) => ({
  font: "500 14px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "6px 12px",
  border: "1px solid " + (on ? "#f0c868" : "rgba(127,184,230,.35)"), background: on ? "#3d5f8f" : "rgba(22,36,64,.94)",
});

export default function BoardPreview() {
  const [units, setUnitsState] = useState(initialUnits);
  const unitsRef = useRef(units); // ค่าล่าสุดสำหรับ setTimeout/คอลแบ็กแอนิเมชัน
  const setUnits = (fn) => {
    const next = typeof fn === "function" ? fn(unitsRef.current) : fn;
    unitsRef.current = next;
    setUnitsState(next);
  };
  const [actorId, setActorId] = useState("me");
  const [mode, setMode] = useState("move"); // move | skill | aoe
  const [night, setNight] = useState(false);
  const [lowQ, setLowQ] = useState(false);
  const [danger, setDanger] = useState(false);
  const [hover, setHover] = useState(null);
  const [anim, setAnim] = useState(null);
  const [fx, setFx] = useState([]);
  const [log, setLog] = useState("คลิกช่องฟ้าเพื่อเดิน · คลิกศัตรูในช่องแดงเพื่อตี");
  const after = useRef(null);   // งานต่อหลังแอนิเมชันจบ
  const fxId = useRef(0);

  const actor = units.find((u) => u.id === actorId) || units[0];
  const R = useMemo(() => reach(units, actor, MOV), [units, actor]);
  const busy = !!anim;

  const pushFx = (list) => setFx((old) => [...old.slice(-30), ...list.map((f) => ({ ...f, key: ++fxId.current }))]);

  // เป้าที่ชี้อยู่ (ศัตรูในช่องแดง/ติดตัว) → ช่องยืนตี + พรีวิวถอย
  const plan = useMemo(() => {
    if (mode !== "move" || !hover) return null;
    const foe = units.find((u) => u.x === hover.x && u.y === hover.y && u.id !== actor.id);
    if (!foe) return null;
    let best = null;
    for (const n of R.values()) {
      if (man(n, foe) !== 1) continue;
      if (!best || n.d < best.d) best = n;
    }
    if (!best) return null;
    const stand = { x: best.x, y: best.y };
    const moved = units.map((u) => (u.id === actor.id ? { ...u, ...stand } : u));
    return { foe, stand, path: pathOf(R, stand.x, stand.y), push: { from: stand, ...pushback(moved, { ...actor, ...stand }, foe) } };
  }, [mode, hover, units, actor, R]);

  const highlights = useMemo(() => {
    const h = {};
    if (danger) {
      const d = new Set();
      for (const u of units) {
        if (u.id === "me") continue;
        const r = reach(units, u, MOV);
        for (const k of r.keys()) d.add(k);
        for (const k of threat(r)) d.add(k);
      }
      h.danger = [...d];
    }
    if (busy) return h;
    if (mode === "move") {
      h.move = [...R.keys()];
      h.attack = [...threat(R)];
      if (plan) { h.path = plan.path; h.target = { x: plan.foe.x, y: plan.foe.y }; h.push = plan.push; }
      else if (hover && R.has(key(hover.x, hover.y))) h.path = pathOf(R, hover.x, hover.y);
    } else if (mode === "skill") {
      h.skill = diamond(actor.x, actor.y, 3);
    } else if (mode === "aoe") {
      h.aoe = diamond(actor.x, actor.y, 5);
    }
    return h;
  }, [danger, busy, mode, R, plan, hover, actor, units]);

  const viewUnits = units.map((u) => ({ ...u, isMe: u.id === "me", isActor: u.id === actor.id, teamId: null }));

  const walk = (path, then) => {
    if (!path || path.length < 2) { if (then) then(); return; }
    after.current = () => {
      const end = path[path.length - 1];
      setUnits((us) => us.map((u) => (u.id === actor.id ? { ...u, x: end.x, y: end.y } : u)));
      if (then) then();
    };
    setAnim({ kind: "move", id: actor.id, path });
  };
  const strike = (foe, stand) => {
    // ตี → สวน (ระยะ 1 ทุกตัว) → ถอย/ชน
    pushFx([{ kind: "slash", x: foe.x, y: foe.y, color: actor.color }, { kind: "float", x: foe.x, y: foe.y, text: "-1" }]);
    setUnits((us) => us.map((u) => (u.id === foe.id ? hurt(u, 1) : u)));
    setTimeout(() => {
      pushFx([{ kind: "slash", x: stand.x, y: stand.y, color: foe.color }, { kind: "float", x: stand.x, y: stand.y, text: "สวน -1", color: "#ffb0a8", size: 22 }]);
      setUnits((us) => us.map((u) => (u.id === actor.id ? hurt(u, 1) : u)));
      setTimeout(() => {
        const us = unitsRef.current;
        const me = us.find((u) => u.id === actor.id);
        const pb = pushback(us, me, foe);
        after.current = () => {
          if (pb.collide) {
            setUnits((v) => v.map((u) => (u.id === actor.id ? hurt(u, 1) : u)));
            pushFx([{ kind: "float", x: me.x, y: me.y, text: "ชน -1", color: "#ffc56b", size: 22 }]);
            setLog("หลังพิงสิ่งกีดขวาง → ถอยไม่ได้ ชน −1");
          } else {
            setUnits((v) => v.map((u) => (u.id === actor.id ? { ...u, ...pb.to } : u)));
            pushFx([{ kind: "float", x: pb.to.x, y: pb.to.y, text: "ถอย", color: "#ffd27a", size: 20 }]);
            setLog("โดนสวน → ถอย 1 ช่อง");
          }
        };
        setAnim({ kind: "push", id: actor.id, from: { x: me.x, y: me.y }, to: pb.to, collide: pb.collide });
      }, 420);
    }, 520);
  };

  const onAnimDone = () => {
    const f = after.current;
    after.current = null;
    setAnim(null);
    if (f) f();
  };

  const onTileClick = (x, y) => {
    if (busy) return;
    const k = key(x, y);
    if (mode === "move" && R.has(k)) { walk(pathOf(R, x, y)); setLog(`เดินไป (${x}, ${y})`); return; }
    if (mode === "aoe" && highlights.aoe && highlights.aoe.includes(k)) {
      const hit = units.filter((u) => u.id !== actor.id && man(u, actor) <= 5);
      pushFx(hit.flatMap((u) => [{ kind: "slash", x: u.x, y: u.y, color: "#ffcf5a" }, { kind: "float", x: u.x, y: u.y, text: "-1" }]));
      setUnits((us) => us.map((u) => (hit.some((h) => h.id === u.id) ? hurt(u, 1) : u)));
      setLog(`ตีหมู่โดน ${hit.length} คน`); setMode("move");
    }
  };
  const onUnitClick = (id) => {
    if (busy) return;
    const u = units.find((v) => v.id === id);
    if (!u) return;
    if (id === actor.id) return;
    if (mode === "skill" && man(u, actor) <= 3) {
      pushFx([{ kind: "slash", x: u.x, y: u.y, color: "#c9a2ff" }, { kind: "float", x: u.x, y: u.y, text: "ลุกไหม้ +2", color: "#ffb347", size: 20 }]);
      setLog(`ใช้สกิลใส่ ${u.name}`); setMode("move"); return;
    }
    if (mode === "aoe") { onTileClick(u.x, u.y); return; }
    if (mode === "move" && plan && plan.foe.id === id) {
      const stand = plan.stand;
      setLog(`ตี ${u.name}`);
      walk(plan.path, () => strike(u, stand));
      return;
    }
    setActorId(id); setMode("move"); setLog(`เลือก ${u.name} เป็นคนเดิน`);
  };

  const reset = () => { setUnits(initialUnits()); setActorId("me"); setMode("move"); setAnim(null); after.current = null; setLog("รีเซ็ตแล้ว"); };

  return (
    <div style={{ position: "fixed", inset: 0, background: night ? "#0d1830" : "#dfeaf6", fontFamily: "Kanit, sans-serif" }}>
      <BoardCanvas
        map={REGION1}
        units={viewUnits}
        highlights={highlights}
        shopPos={SHOP}
        night={night}
        lowQ={lowQ}
        anim={anim}
        fx={fx}
        onAnimDone={onAnimDone}
        onTileClick={onTileClick}
        onUnitClick={onUnitClick}
        onHoverTile={(x, y) => setHover(x == null ? null : { x, y })}
      />
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 640 }}>
        <button style={btn(night)} onClick={() => setNight((v) => !v)}>กลางคืน</button>
        <button style={btn(lowQ)} onClick={() => setLowQ((v) => !v)}>ประหยัดสเปก</button>
        <button style={btn(danger)} onClick={() => setDanger((v) => !v)}>ระยะอันตราย</button>
        <span style={{ width: 8 }} />
        <button style={btn(mode === "move")} onClick={() => setMode("move")}>เดิน</button>
        <button style={btn(mode === "skill")} onClick={() => setMode("skill")}>สกิล ระยะ 3</button>
        <button style={btn(mode === "aoe")} onClick={() => setMode("aoe")}>ตีหมู่ รอบตัว 5</button>
        <button style={btn(false)} onClick={reset}>รีเซ็ต</button>
      </div>
      <div style={{ position: "absolute", left: 12, bottom: 12, padding: "8px 14px", color: "#fff", background: "rgba(22,36,64,.94)", font: "400 14px Kanit, sans-serif" }}>
        <div>คนเดิน: <b>{actor.name}</b> (เดิน {MOV}) · โหมด: {mode === "move" ? "เดิน" : mode === "skill" ? "สกิลระยะ 3" : "ตีหมู่ 5"}</div>
        <div style={{ color: "#9db8da" }}>ชี้ช่อง: {hover ? `(${hover.x}, ${hover.y})` : "—"} · {log}</div>
      </div>
    </div>
  );
}
