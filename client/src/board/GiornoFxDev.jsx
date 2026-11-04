// เฉพาะ dev: หน้าดูกระดาน ?board=1&giorno=1 — ปุ่มเล่นเอฟเฟกต์ของโจรุโน่ (giornoFx.js) โดยไม่ต้องเปิดห้องจริง
//  me = โจรุโน่ · ศัตรูตัวแรก = เป้า · เหตุการณ์ = รูปแบบเดียวกับ socket "giornoFx" ของ server · ปุ่มสลับ = ตัวหมาก (Requiem/รอผลธนู/วนตาย/ต้นไม้/สะท้อน/Muda)
import { useEffect } from "react";
import { GIO_EVENT_FX, GIO_FX_DUR, GIO_REWIND_HIT, GIO_SLAM_HIT } from "./giornoFx";

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
  const shake = (amp, ms) => setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp, dur: 420 }]), ms);
  // เป้าเดินมาแล้ว 2 ช่องจากช่องต้นตา (state อยู่ที่ back แล้ว — แบบเดียวกับ server)
  const rewind = (gap = 2) => {
    const a = me(), t = foe();
    if (!a || !t) return;
    const from = { x: t.x + (t.x > 4 ? -gap : gap), y: t.y };
    setFocus({ x: t.x, y: t.y });
    pushFx([{ kind: "gioRewind", id: a.id, x: a.x, y: a.y, size: 1, attacker: t.id, from, back: { x: t.x, y: t.y }, gioAt: { x: a.x, y: a.y }, dur: 2600 }]);
    shake(5, GIO_REWIND_HIT * 2600);
  };
  const bullet = () => {
    const a = me(), t = foe();
    if (!a || !t) return;
    const dx = Math.sign(t.x - a.x), dy = dx ? 0 : Math.sign(t.y - a.y) || 1;
    ev("bullet", a, { dir: { x: dx, y: dy }, tiles: [1, 2, 3, 4, 5].map((n) => ({ x: a.x + dx * n, y: a.y + dy * n })) });
  };
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
    ["ตื่นร่าง", () => ev("awake")],
    ["กระสุน", bullet],
    ["พุ่งชน", () => { const t = foe(); ev("slam", me(), { to: t ? { x: t.x, y: t.y } : null }); shake(6, GIO_SLAM_HIT * GIO_FX_DUR.gioSlam); }],
    ["Return to Zero", () => rewind()],
    ["Zero ไม่ขยับ", () => rewind(0)],
    ["วนฟื้น", () => ev("loopRevive", foe())],
    ["วนตาย", () => ev("loopDie", foe())],
    ["◻ Requiem", () => toggle("requiem")],
    ["◻ รอผลธนู", () => toggle("arrowWait")],
    ["◻ วนตาย", () => toggle("loop")],
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
