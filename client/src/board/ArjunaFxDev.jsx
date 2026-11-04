// เฉพาะ dev: หน้าดูกระดาน ?board=1&arjuna2=1 — ปุ่มเล่นเอฟเฟกต์ของมหาเทพอรชุน (arjunaBoardFx.js)
//  me = อรชุน · ศัตรูตัวแรก = เป้า · เหตุการณ์ = รูปแบบเดียวกับ socket "arjunaFx" · ฉากท่าไม้ตายดูที่ ?arjuna=N
import { useEffect, useState } from "react";
import { ARJ_EVENT_FX, ARJ_FX_DUR } from "./arjunaBoardFx";
import { playSfx } from "../audio";

const CUR = { units: [] };
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "5px 11px", border: "1px solid rgba(60,240,255,.6)", background: "rgba(10,20,50,.85)", borderRadius: 6 };

export default function ArjunaFxDev({ units, setUnits, pushFx, setFocus }) {
  useEffect(() => { CUR.units = units; });
  const [slow, setSlow] = useState(1);
  const pace = (kind) => (slow > 1 ? { dur: ARJ_FX_DUR[kind] * slow } : {});
  const me = () => CUR.units.find((u) => u.id === "me");
  const foe = () => CUR.units.find((u) => u.id !== "me");
  const ev = (kind, who = me()) => {
    if (!who) return;
    setFocus({ x: who.x, y: who.y });
    pushFx([{ kind: ARJ_EVENT_FX[kind], x: who.x, y: who.y, size: who.size || 1, ...pace(ARJ_EVENT_FX[kind]) }]);
  };
  const strike = (kind) => {
    const a = me(), t = foe();
    if (!a || !t) return;
    if (slow === 1) playSfx(kind === "arjunaBomb" ? "arj_bomb" : "arj_arrow");
    pushFx([{ kind, x: a.x, y: a.y, size: 1, to: { x: t.x, y: t.y }, ...pace(kind) }]);
  };
  const cut = (v) => {
    const a = me();
    if (!a) return;
    if (slow === 1) playSfx("arj_slash");
    pushFx([{ kind: "arjunaCut", x: a.x, y: a.y, size: 1, band: { v, a0: (v ? a.x : a.y) - 1, a1: (v ? a.x : a.y) + 2 }, cols: 14, rows: 14, ...pace("arjunaCut") }]);
  };
  const toggle = (key) => setUnits((list) => list.map((u) => (u.id === "me" ? { ...u, arjuna: { ...(u.arjuna || {}), [key]: !(u.arjuna && u.arjuna[key]) } } : u)));
  const list = [
    ["ระเบิดลง", () => strike("arjunaBomb")],
    ["ธนูยิง", () => strike("arjunaArrow")],
    ["สับแผนที่ แนวนอน", () => cut(false)],
    ["สับแผนที่ แนวตั้ง", () => cut(true)],
    ["ตะเกียงวิญญาณ", () => { if (slow === 1) playSfx("arj_lamp"); ev("lamp"); }],
    ["ขจัดสิ่งแปลกปลอม", () => { if (slow === 1) playSfx("arj_purge"); ev("purge"); }],
    ["จุติทำงาน", () => ev("jutti")],
    ["◻ ติดจุติ", () => toggle("jutti")],
    ["◻ ขจัด", () => toggle("purge")],
    [slow > 1 ? "ความเร็ว ×1/6" : "ความเร็วปกติ", () => setSlow((v) => (v > 1 ? 1 : 6))],
  ];
  return (
    <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexWrap: "wrap", gap: 6, maxWidth: 520, justifyContent: "flex-end" }}>
      {list.map(([label, fn]) => <button key={label} type="button" style={btn} onClick={fn}>{label}</button>)}
    </div>
  );
}
