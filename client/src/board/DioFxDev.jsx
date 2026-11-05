// เฉพาะ dev: หน้าดูกระดาน ?board=1&dio=1 — ปุ่มเล่นเอฟเฟกต์ของดิโอ บรันโด (dioFx.js) + ตัวอย่าง HUD / ดวล Last Stand
//  me = ดิโอ · ศัตรูตัวแรก = เป้า · เหตุการณ์ = รูปแบบเดียวกับ socket "dioFx"
import { useEffect, useState } from "react";
import { dioEventFx } from "./dioFx";
import { DioGauge, DioInterrupt, LastStandDuel } from "../screens/hud/DioHud";

const CUR = { units: [] };
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid rgba(255,200,60,.6)", background: "rgba(30,24,10,.85)", borderRadius: 6 };
const cards = (...v) => v.map((n, i) => ({ v: n, c: ["red", "blue", "green", "yellow"][i % 4] }));

export default function DioFxDev({ units, setUnits, pushFx, setFocus, setFreeze }) {
  useEffect(() => { CUR.units = units; });
  const [duel, setDuel] = useState(null);
  const [gauge, setGauge] = useState(false);
  const me = () => CUR.units.find((u) => u.id === "me");
  const foe = () => CUR.units.find((u) => u.id !== "me");
  const posOf = (id) => { const u = CUR.units.find((q) => q.id === id); return u ? { x: u.x, y: u.y } : null; };
  const play = (ev) => {
    const out = dioEventFx({ id: "me", color: "#e9ad24", ...ev }, { posOf, sizeOf: () => 1, idAt: () => null });
    pushFx(out.fx);
    for (const [ms, list] of out.later) setTimeout(() => pushFx(list), ms);
  };
  const at = () => { const a = me(); return a ? { x: a.x, y: a.y } : null; };
  const tile = () => { const t = foe(); return t ? { x: t.x, y: t.y } : null; };
  // เป้าอยู่ติดแนว 2 ช่อง = ย้ายมาห่าง 2 ช่องก่อนเล่น
  const near = () => {
    const a = me();
    if (a) setUnits((l) => { let done = false; return l.map((u) => { if (u.id === "me" || done) return u; done = true; return { ...u, x: a.x + 2, y: a.y }; }); });
  };
  const stand = (kind) => { near(); setTimeout(() => play({ kind, from: at(), dir: "right", hits: [{ id: foe().id }] }), 50); };
  const toggleAura = (k) => setUnits((l) => l.map((u) => (u.id === "me" ? { ...u, dio: { stop: k === "stop" ? !(u.dio && u.dio.stop) : !!(u.dio && u.dio.stop), blood: k === "blood" ? ((u.dio && u.dio.blood) ? 0 : 8) : (u.dio ? u.dio.blood : 0) } } : u)));
  const list = [
    ["ตีปกติ", () => { const a = me(), t = foe(); if (a && t) pushFx([{ kind: "dioPunch", x: a.x, y: a.y, size: 1, to: tile() }]); }],
    ["มีด", () => play({ kind: "knife", from: at(), to: tile(), targetId: foe().id })],
    ["มีด (หยุดเวลา)", () => play({ kind: "knife", from: at(), to: tile(), targetId: foe().id, frozen: true })],
    ["SHINEI!", () => stand("shine")],
    ["MUDA", () => stand("muda")],
    ["ดูดเลือด", () => play({ kind: "drain", from: tile(), targetId: foe().id })],
    ["กด Za warudo", () => play({ kind: "press", at: at() })],
    ["เวลาหยุด", () => { play({ kind: "timeStop", at: at() }); if (setFreeze) setFreeze({ by: "me" }); }],
    ["เวลาเดินต่อ", () => { play({ kind: "timeResume", at: at(), hits: [{ id: foe().id, dmg: 3, kill: false }] }); if (setFreeze) setTimeout(() => setFreeze(null), 700); }],
    ["ลอยขึ้น", () => play({ kind: "rollerLift", at: at(), to: tile() })],
    ["Road Roller", () => play({ kind: "roller", at: tile(), land: at(), targetId: foe().id, size: 1 })],
    ["ค้างรถบดถนน", () => pushFx([{ kind: "dioRoller", id: "me", at: tile(), size: 1, dur: 5000, holdT: 620 }])],
    ["ชนะ Last Stand", () => play({ kind: "lastWin", from: tile(), at: at(), targetId: foe().id, amount: 2 })],
    ["◻ ออร่าหยุดเวลา", () => toggleAura("stop")],
    ["◻ ออร่าเลือด", () => toggleAura("blood")],
    ["◻ แถบ HUD", () => setGauge((v) => !v)],
    ["◻ ดวล", () => setDuel((d) => (d ? null : { dioId: "me", foeId: "x", side: "dio", hands: { dio: cards(9, 7), foe: [{ hidden: true }, { hidden: true }, { hidden: true }] }, stood: { dio: false, foe: true }, winner: null, scores: { dio: 16, foe: null }, target: 21 }))],
  ];
  return (
    <>
      <div style={{ position: "fixed", top: 8, left: 8, right: 8, zIndex: 80, display: "flex", flexWrap: "wrap", gap: 5 }}>
        {list.map(([name, fn]) => <button key={name} type="button" style={btn} onClick={fn}>{name}</button>)}
      </div>
      {gauge && <DioGauge dio={{ meter: 5, meterMax: 8, blood: 7, bloodMax: 10, stopping: true, actions: 3, pending: 0 }} />}
      {gauge && <DioInterrupt dio={{ canInterrupt: true, interruptActions: 4 }} onPress={() => {}} />}
      <LastStandDuel duel={duel} timeLeft={24} players={[{ id: "me", name: "ดิโอ บรันโด", img: "/characters/dio_brando/dio.webp" }, { id: "x", name: "มุยมิ", img: "/characters/muimi/muimi_skill3.webp" }]} onDraw={() => setDuel((d) => ({ ...d, hands: { ...d.hands, dio: [...d.hands.dio, ...cards(3)] }, scores: { ...d.scores, dio: d.scores.dio + 3 } }))} onStand={() => setDuel((d) => ({ ...d, winner: "dio", stood: { dio: true, foe: true }, hands: { ...d.hands, foe: cards(10, 5, 2) }, scores: { ...d.scores, foe: 17 } }))} />
    </>
  );
}
