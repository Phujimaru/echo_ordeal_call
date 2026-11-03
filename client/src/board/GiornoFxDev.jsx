// เฉพาะ dev: หน้าดูกระดาน ?board=1&giorno=1 — ปุ่มเล่นเอฟเฟกต์ของโจรุโน่ (giornoFx.js) โดยไม่ต้องเปิดห้องจริง
//  me = โจรุโน่ · ศัตรูตัวแรก = เป้า · เหตุการณ์ = รูปแบบเดียวกับ socket "giornoFx" ของ server · ปุ่มสลับ = ตัวหมาก (ต้นไม้/สะท้อน/Muda)
import { useEffect } from "react";
import { GIO_EVENT_FX } from "./giornoFx";

const CUR = { units: [] };
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid rgba(255,200,60,.6)", background: "rgba(30,24,10,.94)" };

export default function GiornoFxDev({ units, setUnits, pushFx, setFocus }) {
  useEffect(() => { CUR.units = units; });
  const me = () => CUR.units.find((u) => u.id === "me");
  const foe = () => CUR.units.find((u) => u.id !== "me");
  const ev = (kind, who = me(), extra = {}) => {
    if (!who) return;
    setFocus({ x: who.x, y: who.y });
    pushFx([{ kind: GIO_EVENT_FX[kind], x: who.x, y: who.y, size: who.size || 1, ...extra }]);
  };
  const punch = (kind = "gioPunch") => {
    const a = me(), t = foe();
    if (!a || !t) return;
    pushFx([{ kind, x: a.x, y: a.y, size: 1, to: { x: t.x, y: t.y } }]);
  };
  const toggle = (key) => setUnits((list) => list.map((u) => (u.id === "me" ? { ...u, giorno: { ...(u.giorno || {}), [key]: !(u.giorno && u.giorno[key]) } } : u)));
  const list = [
    ["ตีปกติ", () => punch()],
    ["คริ", () => punch("gioRush")],
    ["ชีวิตทดแทน", () => ev("life")],
    ["ต้นตอแห่งชีวิต", () => ev("reflect")],
    ["สะท้อน", () => { const t = foe(); ev("reflectHit", me(), { toAt: t ? { x: t.x, y: t.y } : null }); }],
    ["ต้นไม้", () => ev("tree")],
    ["ตรึง", () => ev("root", foe())],
    ["หลบ", () => ev("dodge")],
    ["Muda", () => ev("burst")],
    ["Muda โดน", () => ev("muda", foe())],
    ["ฮีลเพื่อน", () => ev("heal", foe())],
    ["◻ ลอย", () => toggle("tree")],
    ["◻ สะท้อน", () => toggle("reflect")],
    ["◻ Muda", () => toggle("muda")],
  ];
  return (
    <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 520, justifyContent: "flex-end" }}>
      {list.map(([label, fn]) => <button key={label} type="button" style={btn} onClick={fn}>{label}</button>)}
    </div>
  );
}
