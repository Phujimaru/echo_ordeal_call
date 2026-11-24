// เฉพาะ dev: หน้าดูกระดาน ?board=1&ophy=1 — ปุ่มเล่นเอฟเฟกต์ของ Ophy (ophyFx.js) ด้วยเหตุการณ์ชุดเดียวกับ socket "ophyFx"
//  ยิงขวดแต่ละชนิดใส่ศัตรูที่ใกล้สุด · สวนกลับ · หม้อระเบิด · ดื่ม · วาร์ป · ของตก/เก็บ · ไก่/นก · ลำดับยาบนหัว/Lock in/calculated
import { useEffect, useState } from "react";
import { OPHY_T, ophyEventFx } from "./ophyFx";
import { playSfx } from "../audio";

const CUR = { units: [] };
const POTS = ["base", "frost", "bolt", "venom", "flame", "heal", "noheal", "ward", "invis", "warp", "morph"];
const RGB = { base: "58,120,230", frost: "60,205,225", bolt: "235,210,60", venom: "200,40,200", flame: "245,135,30", heal: "40,215,90", noheal: "60,55,80", ward: "150,190,120", invis: "220,228,240", warp: "130,100,230", morph: "220,40,40" };
const btn = { font: "500 12px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "3px 7px", border: "1px solid #c99aff", background: "rgba(60,20,90,.92)" };
const box = (c, r = 1) => { const t = []; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) t.push({ x: c.x + dx, y: c.y + dy }); return t; };

export default function OphyFxDev({ units, setUnits, pushFx, setFocus, setGround, setShake }) {
  useEffect(() => { CUR.units = units; });
  const [ground, setG] = useState({ drops: [], nodes: [] });
  useEffect(() => { setGround(ground.drops.length || ground.nodes.length ? ground : null); }, [ground, setGround]);
  const me = () => { const u = CUR.units.find((x) => x.id === "me"); return { x: u.x, y: u.y }; };
  const foe = () => {
    const m = me();
    const list = CUR.units.filter((u) => u.id !== "me").sort((a, b) => Math.abs(a.x - m.x) + Math.abs(a.y - m.y) - (Math.abs(b.x - m.x) + Math.abs(b.y - m.y)));
    return list[0] ? { x: list[0].x, y: list[0].y } : { x: m.x + 2, y: m.y };
  };
  const play = (ev) => {
    const out = ophyEventFx(ev);
    for (const f of out.fx) setTimeout(() => pushFx([{ ...f, delay: undefined }]), f.delay | 0);
    for (const [n, ms] of out.sfx) setTimeout(() => playSfx(n), ms);
    for (const ms of out.shake) setTimeout(() => setShake && setShake((n) => n + 1), ms);
  };
  const shoot = (potion, counter = false) => {
    const a = me(), b = foe();
    play({ kind: "throw", id: "me", from: a, to: b, potion, rgb: RGB[potion], tiles: box(b), counter });
    setTimeout(() => play({ kind: "splash", at: b, potion, rgb: RGB[potion], tiles: box(b), hits: ["x"] }), counter ? OPHY_T.counterFly : OPHY_T.fly);
    setFocus({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  };
  const toggleMe = (patch) => setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, ...patch(u) } : u)));
  const act = {
    boom: () => { const a = me(); play({ kind: "boom", at: a, tiles: box(a) }); playSfx("elem_blast"); setFocus(a); },
    drink: (k) => { const a = me(); play({ kind: "drink", id: "me", at: a, potion: k, rgb: RGB[k] }); setFocus(a); },
    warp: () => { const a = me(), to = { x: a.x + 3, y: a.y + 1 }; play({ kind: "warp", id: "me", from: a, to }); setTimeout(() => setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, x: to.x, y: to.y } : u))), 500); setFocus(to); },
    drop: () => {
      const b = foe();
      const ks = ["herb", "orb", "crystal", "pulse", "water", "spirit"];
      const drops = box(b).filter(() => Math.random() < 0.4).slice(0, 4).map((t, i) => ({ id: Date.now() + i, x: t.x, y: t.y, k: ks[(Math.random() * 6) | 0] }));
      play({ kind: "drop", from: b, drops });
      setTimeout(() => setG((g) => ({ ...g, drops: [...g.drops, ...drops.map((d) => ({ ...d, left: 3 }))] })), 800);
      setFocus(b);
    },
    pick: () => { play({ kind: "pick", id: "me", drops: [] }); setG((g) => ({ ...g, drops: [] })); },
    nodes: () => { const a = me(); setG((g) => ({ ...g, nodes: g.nodes.length ? [] : [{ x: a.x - 2, y: a.y + 1 }, { x: a.x + 1, y: a.y - 2 }] })); },
    queue: () => toggleMe((u) => ({ ophy: u.ophy ? null : { queue: ["frost", "bolt", "flame", "base"], lockIn: false, calc: false } })),
    lockIn: () => toggleMe((u) => ({ ophy: { queue: ["frost", "bolt", "flame", "base"], ...(u.ophy || {}), lockIn: !(u.ophy && u.ophy.lockIn) } })),
    calc: () => toggleMe((u) => ({ ophy: { queue: ["frost", "bolt", "flame", "base"], ...(u.ophy || {}), calc: !(u.ophy && u.ophy.calc) } })),
    standee: () => toggleMe((u) => ({ standee: u.standee ? null : "/characters/ophy/standee.webp" })),
    chicken: () => setUnits((us) => { const f = foe(); return us.map((u) => (u.x === f.x && u.y === f.y && u.id !== "me" ? { ...u, standee: u.standee ? null : "/characters/ophy/chicken.webp" } : u)); }),
    bird: () => toggleMe((u) => ({ standee: u.standee === "/characters/ophy/bird.webp" ? null : "/characters/ophy/bird.webp" })),
  };
  useEffect(() => { window.__ophyPlay = play; window.__ophyFoe = foe; window.__ophyFx = (k, arg) => (POTS.includes(k) ? shoot(k, !!arg) : act[k] && act[k](arg)); });
  return (
    <div style={{ position: "fixed", left: 8, bottom: 8, zIndex: 60, display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 560 }}>
      {POTS.map((k) => <button key={k} type="button" style={btn} onClick={() => shoot(k)}>{k}</button>)}
      <button type="button" style={btn} onClick={() => shoot("venom", true)}>สวน</button>
      {["boom", "warp", "drop", "pick", "nodes", "queue", "lockIn", "calc", "standee", "chicken", "bird"].map((k) => <button key={k} type="button" style={btn} onClick={() => act[k]()}>{k}</button>)}
      {["heal", "morph", "invis"].map((k) => <button key={`d${k}`} type="button" style={btn} onClick={() => act.drink(k)}>ดื่ม {k}</button>)}
    </div>
  );
}
