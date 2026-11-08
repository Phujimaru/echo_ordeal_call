// เฉพาะ dev: หน้าดูกระดาน ?board=1&otoya=1 — ปุ่มเล่นเอฟเฟกต์ของคุเรไน โอโตยะ (otoyaFx.js) โดยไม่ต้องเปิดห้องจริง
//  me = โอโตยะ · ตัวที่สอง = เป้า · เหตุการณ์ = รูปแบบเดียวกับ socket "otoyaFx" ของ server · ◻ = สลับผลค้างบนตัว / ชั้นกระดาน
import { useEffect } from "react";
import { otoyaEventFx } from "./otoyaFx";

const CUR = { units: [] };
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid rgba(255,60,80,.6)", background: "rgba(30,6,12,.94)" };

export default function OtoyaFxDev({ units, setUnits, pushFx, setFocus, otoya, setOtoya }) {
  useEffect(() => { CUR.units = units; });
  const me = () => CUR.units.find((u) => u.id === "me");
  const foe = () => CUR.units.find((u) => u.id !== "me");
  const ev = (kind, who = me(), extra = {}) => {
    if (!who) return;
    setFocus({ x: who.x, y: who.y });
    const f = otoyaEventFx({ kind, id: who.id, at: { x: who.x, y: who.y }, size: who.size || 1, ...extra });
    if (f) pushFx([f]);
  };
  const toFoe = () => { const t = foe(); return t ? { to: { x: t.x, y: t.y }, targetId: t.id, tsize: t.size || 1 } : {}; };
  const toggle = (id, key) => setUnits((list) => list.map((u) => (u.id === id ? { ...u, otoya: { ...(u.otoya || {}), [key]: !(u.otoya && u.otoya[key]) } } : u)));
  const cur = otoya || { night: false, links: [] };
  const setNight = () => setOtoya({ ...cur, night: !cur.night });
  const setLink = () => {
    const t = foe();
    const on = cur.links.length > 0;
    setOtoya({ ...cur, links: on || !t ? [] : [{ from: "me", to: t.id }] });
    toggle("me", "playing");
    if (t) toggle(t.id, "heart");
  };
  const list = [
    ["ปากหวาน", () => ev("sweet")],
    ["ดนตรีในหัวใจ", () => ev("heart", me(), toFoe())],
    ["หยุดบรรเลง", () => ev("heartEnd", me(), toFoe())],
    ["แปลงร่าง", () => ev("henshin")],
    ["คืนร่าง", () => ev("revert")],
    ["ตั้งหลุมพราง", () => ev("trapSet")],
    ["หลุมพรางทำงาน", () => ev("trap", me(), toFoe())],
    ["ตรึง", () => ev("seal", me(), toFoe())],
    ["Wake Up 2", () => ev("wake2")],
    ["จันทร์แดง", () => ev("bloodMoon")],
    ["◻ กลางคืนแดง", setNight],
    ["◻ สายดนตรี", setLink],
    ["◻ Dark Kiva", () => toggle("me", "kiva")],
    ["◻ หลุมพราง", () => toggle("me", "trap")],
    ["◻ Wake Up 2", () => toggle("me", "wake2")],
  ];
  return (
    <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 520, justifyContent: "flex-end" }}>
      {list.map(([label, fn]) => <button key={label} type="button" style={btn} onClick={fn}>{label}</button>)}
    </div>
  );
}
