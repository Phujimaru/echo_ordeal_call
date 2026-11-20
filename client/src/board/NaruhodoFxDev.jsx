// เฉพาะ dev: หน้าดูกระดาน ?board=1&naruhodo=1 — ปุ่มเล่นเอฟเฟกต์ของนารุโฮโดะ ริวอิจิ (naruhodoFx.js) + HUD จำลอง (NaruhodoHud.jsx)
//  "me" = นารุโฮโดะ · เป้า = ตัวที่ใกล้สุด · ปุ่มแรกชุดบน = socket จริง (naruEventFx เดียวกับเกม) · ชุดล่าง = สลับสถานะ HUD
//  คอนโซล: window.__naruFx(name, payload) = ส่ง payload ของ socket ตรงๆ (เช่น "naruhodoPoint", { kind: "point", targetId: "p2", dir: "right", icon: 46 })
import { useEffect, useState } from "react";
import { naruEventFx } from "./naruhodoFx";
import { playSfx } from "../audio";
import NaruhodoHud from "../screens/hud/NaruhodoHud";

const CUR = { units: [] };
const btn = (on) => ({ font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: `1px solid ${on ? "#ffd36a" : "#6f9be0"}`, background: on ? "rgba(140,90,10,.95)" : "rgba(20,50,110,.95)" });
const IMG = "/characters/naruhodo_ryuichi/naruhodo.webp";
const EVIDENCE = [
  { id: "e1", round: 2, actorId: "p2", actorName: "โอเบรอน", kind: "basic", skill: "ตีปกติ", targetName: "มุยมิ", type: "weapon", icon: 46, name: "มีดเปื้อนเลือด", desc: "โอเบรอน ใช้ ตีปกติ ใส่ มุยมิ ตอนเทิร์น 2", used: false },
  { id: "e2", round: 3, actorId: "p2", actorName: "โอเบรอน", kind: "move", skill: "เดิน", targetName: null, type: "foot", icon: 83, name: "แม่พิมพ์รอยเท้า", desc: "รอยเท้าของ โอเบรอน เดินข้ามสนามตอนเทิร์น 3", used: false },
  { id: "e3", round: 3, actorId: "p3", actorName: "มุยมิ (บอท)", kind: "secondary", skill: "ดาบสนิม", targetName: "โอเบรอน 2", type: "receipt", icon: 12, name: "ใบเสร็จ", desc: "มุยมิ (บอท) ใช้ ดาบสนิม ใส่ โอเบรอน 2 ตอนเทิร์น 3", used: true },
  { id: "e4", round: 4, actorId: "p4", actorName: "โอเบรอน (บอท)", kind: "ultimate", skill: "ดาบสะบั้น", targetName: "มุยมิ", type: "witness", icon: 25, name: "กล้องถ่ายรูป", desc: "โอเบรอน (บอท) ใช้ ดาบสะบั้น ใส่ มุยมิ ตอนเทิร์น 4", used: false },
];

export default function NaruhodoFxDev({ units, setUnits, pushFx, setFocus }) {
  useEffect(() => { CUR.units = units; });
  const [hud, setHud] = useState({ dock: true, hold: "ready", mini: null, alibi: false, result: null, scout: true });
  const [picking, setPicking] = useState(false);
  const meU = () => CUR.units.find((x) => x.id === "me");
  const foeU = () => {
    const m = meU();
    return CUR.units.filter((u) => u.id !== "me").sort((a, b) => Math.abs(a.x - m.x) + Math.abs(a.y - m.y) - (Math.abs(b.x - m.x) + Math.abs(b.y - m.y)))[0] || null;
  };
  const posOf = (id) => { const u = CUR.units.find((x) => x.id === id); return u ? { x: u.x, y: u.y } : null; };
  // payload แบบเดียวกับ server · เสียงตอนกดสกิล (server skillSound) จำลองที่นี่
  const SKILL_SFX = { point: "naru_point", scout: "naru_scout", cast: "naru_trial_open" };
  const send = (name, payload) => {
    const me = meU();
    const ev = { id: "me", from: { x: me.x, y: me.y }, ...payload };
    if (SKILL_SFX[ev.kind]) playSfx(SKILL_SFX[ev.kind]);
    const out = naruEventFx(name, ev, { posOf, sizeOf: () => 1 });
    if (!out) return;
    pushFx(out.fx);
    if (out.look) setFocus(out.look);
    for (const [s, ms] of out.sfx) setTimeout(() => playSfx(s), ms);
  };
  // ทิศแนว 3 ช่องจากตัวไปทางเป้า (แกนที่ห่างกว่า)
  const dirTo = (b) => {
    const a = meU(), dx = b.x - a.x, dy = b.y - a.y;
    return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "down" : "up";
  };
  const tileOf = (u) => ({ x: u.x, y: u.y });
  const play = {
    point: () => { const f = foeU(); send("naruhodoPoint", { kind: "point", targetId: f.id, to: tileOf(f), dir: dirTo(f), icon: null }); },
    pointEv: () => { const f = foeU(); send("naruhodoPoint", { kind: "point", targetId: f.id, to: tileOf(f), dir: dirTo(f), icon: 46 }); },
    scout: () => { const f = foeU(); send("naruhodoScout", { kind: "scout", targetId: f.id, to: tileOf(f), icon: 83 }); },
    gather: () => { const f = foeU(); send("naruhodoScout", { kind: "gather", targetId: f.id, to: tileOf(f), icon: 12 }); },
    trial: () => { const f = foeU(); send("naruhodoTrial", { kind: "cast", targetId: f.id, to: tileOf(f) }); },
    trialDodge: () => { const f = foeU(); send("naruhodoTrial", { kind: "cast", targetId: f.id, to: tileOf(f) }); setTimeout(() => send("naruhodoTrial", { kind: "dodge", targetId: f.id, to: tileOf(f) }), 0); },
    holdIt: () => { const f = foeU(); send("naruhodoHoldIt", { kind: "shout", targetId: f.id, to: tileOf(f) }); },
    tradeSp: () => send("naruhodoScout", { kind: "trade", icon: 46, reward: "sp", amount: 2 }),
    tradeHp: () => send("naruhodoScout", { kind: "trade", icon: 83, reward: "hp", amount: 1 }),
    tradeHold: () => send("naruhodoScout", { kind: "trade", icon: 12, reward: "hold", amount: 1 }),
    object: () => { const f = foeU(); send("naruhodoHoldIt", { kind: "object", targetId: f.id, to: tileOf(f), icon: 46 }); playSfx("naru_objection"); },
  };
  const toggleMark = (k) => {
    const f = foeU();
    if (!f) return;
    setUnits((us) => us.map((u) => (u.id === f.id ? { ...u, naru: { ...(u.naru || {}), [k]: !(u.naru && u.naru[k]) } } : u)));
  };
  useEffect(() => {
    window.__naruFx = (name, payload) => send(name, payload || {});
    return () => { delete window.__naruFx; };
  });
  // ---------- HUD จำลอง ----------
  const foe = foeU() || { id: "p2" };
  const players = CUR.units.map((u) => ({ id: u.id, name: u.name, img: u.id === "me" ? IMG : u.img, alive: true, pos: { x: u.x, y: u.y },
    character: u.id === foe.id ? { basic: { name: "เสบียงฉุกเฉิน", img: "/characters/muimi/muimi_skill1.webp" }, secondary: { name: "ดาบสนิม", img: "/characters/muimi/muimi_skill2.png" }, ultimate: { name: "ดาบสะบั้นหอคอยสวรรค์", img: "/characters/muimi/muimi_skill3.webp" } } : null }));
  const me = {
    id: "me", name: "นารุโฮโดะ ริวอิจิ", img: IMG, courtAlibi: hud.alibi ? 2 : 0,
    naruhodo: { evidence: hud.dock ? EVIDENCE.map((e) => (e.actorId === "p2" ? { ...e, actorId: foe.id } : e)) : [], holdCd: hud.hold === "cd" ? 2 : 0, holdReady: hud.hold === "ready", noMoveNext: false,
      scout: hud.scout ? { targetId: foe.id, until: 5, cds: { basic: 0, secondary: 2, ultimate: 4 } } : null },
  };
  const deadline = hud.mini || hud.alibi ? hud.deadline : null;
  const holdIt = hud.mini ? { lawyerId: "me", actorId: foe.id, phase: hud.mini, deadline, result: hud.result, seq: hud.seq }
    : hud.alibi ? { lawyerId: "x", actorId: "me", phase: "alibi", deadline } : null;
  const state = { gameState: "ACTION", actorId: hud.hold === "hide" ? "me" : foe.id, players, holdIt, court: null };
  const set = (patch) => setHud((h) => ({ ...h, ...patch }));
  const stamp = () => Date.now() + (hud.alibi ? 3000 : 15000);
  const fxLabels = [["point", "เอานี่ไปดู!"], ["pointEv", "เอานี่ไปดู! + หลักฐาน"], ["scout", "สืบสวน"], ["gather", "เก็บหลักฐาน"], ["trial", "เริ่มการไต่สวน"], ["trialDodge", "ไต่สวน หลบ"], ["holdIt", "รอเดี๋ยว!!!"], ["object", "คัดค้าน!"], ["tradeSp", "แลก SP"], ["tradeHp", "แลก ❤"], ["tradeHold", "แลก ⏳"]];
  return (
    <>
      <NaruhodoHud state={state} me={me} hidden={false} zoom={1} emit={(e, p) => { console.log("emit", e, p); if (e === "holdItAct" && p.kind === "object") set({ result: { kind: "object", ok: true }, seq: (hud.seq || 0) + 1 }); if (e === "holdItAlibi") set({ alibi: false }); }}
        movePicking={picking} onPickMove={() => setPicking((v) => !v)} />
      <div style={{ position: "fixed", left: 12, top: 12, zIndex: 50, display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 820 }}>
        {fxLabels.map(([k, l]) => <button key={k} style={btn(false)} onClick={() => play[k]()}>{l}</button>)}
        <button style={btn(false)} onClick={() => toggleMark("scout")}>🔍 บนหมาก</button>
        <button style={btn(false)} onClick={() => toggleMark("objected")}>✋ บนหมาก</button>
      </div>
      <div style={{ position: "fixed", left: 12, top: 48, zIndex: 50, display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 820 }}>
        <button style={btn(hud.dock)} onClick={() => set({ dock: !hud.dock })}>แฟ้ม</button>
        <button style={btn(hud.scout)} onClick={() => set({ scout: !hud.scout })}>สืบสวน HUD</button>
        {["ready", "cd", "off", "hide"].map((k) => <button key={k} style={btn(hud.hold === k)} onClick={() => set({ hold: k })}>ปุ่ม {k}</button>)}
        <button style={btn(hud.mini === "choose")} onClick={() => set({ mini: hud.mini ? null : "choose", alibi: false, result: null, deadline: stamp() })}>ตาแทรก</button>
        <button style={btn(hud.alibi)} onClick={() => set({ alibi: !hud.alibi, mini: null, deadline: Date.now() + 3000 })}>📍</button>
        <button style={btn(false)} onClick={() => set({ mini: "choose", result: { kind: "object", ok: false }, seq: (hud.seq || 0) + 1 })}>สวนกลับ</button>
      </div>
    </>
  );
}
