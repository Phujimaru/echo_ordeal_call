// เฉพาะ dev: หน้าดูกระดาน ?board=1&fern=1 — ปุ่มเล่นเอฟเฟกต์ของเฟิร์น (fernFx.js) โดยไม่ต้องเปิดห้องจริง
//  มุยมิ (me) กลายเป็นเฟิร์น — ปุ่มสร้าง payload แบบเดียวกับ server (GRID_PLAN §7.14) แล้วผ่าน FERN_EVENT_FX เหมือน BoardStage
//  Zoltraak = attackStyle "fernZoltraak" ตามแนว 3 ช่องไปทางศัตรูใกล้สุด · ชาร์จ 0..3 = ชั้นวงเวท (prop ferns) · ปิด = ไม่ชาร์จ
//  คอนโซล: window.__fernFx({ kind: "cannon", from: { x, y }, to: { x, y } }) = ส่ง payload ของ socket "fernFx" ตรงๆ
import { useEffect } from "react";
import { FERN_CANNON, FERN_EVENT_FX, FERN_EVENT_SFX } from "./fernFx";
import { playSfx } from "../audio";

const IMG = "/characters/fern/fern.webp";
function fernUnits(list) {
  return list.map((u) => (u.id === "me" ? { ...u, x: 4, y: 8, name: "เฟิร์น", img: IMG, color: "#8E7CC3", hp: 5, maxHp: 5, armor: 2, maxArmor: 2 } : u));
}
const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid rgba(180,210,255,.6)", background: "rgba(24,22,48,.94)" };

export default function FernFxDev({ units, pushFx, setFocus, map, ferns, setFerns }) {
  const get = (id) => units.find((u) => u.id === id);
  const inB = (x, y) => x >= 0 && y >= 0 && x < map.cols && y < map.rows;
  const F = () => get("me");
  const foes = () => { const d = F(); return units.filter((u) => u.id !== "me").sort((a, b) => man(a, d) - man(b, d)); };
  const play = (ev) => {
    const kind = FERN_EVENT_FX[ev.kind];
    if (!kind) return;
    const at = ev.kind === "cannon" ? ev.to : ev.at;
    pushFx([{ ...ev, kind, x: at.x, y: at.y, ...(ev.kind === "cannon" && ev.hitId ? { hitIds: [ev.hitId], hitDelay: FERN_CANNON.hit } : {}) }]);
    if (FERN_EVENT_SFX[ev.kind]) playSfx(FERN_EVENT_SFX[ev.kind]);
    setFocus({ x: at.x, y: at.y });
    if (ev.kind === "cannon") {
      setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: 10, dur: 900 }, { kind: "float", x: at.x, y: at.y, text: `-${ev.dmg || 5}`, size: 34, z: 1.5 }]), FERN_CANNON.hit);
    }
  };
  useEffect(() => { window.__fernFx = (ev) => play(ev); return () => { delete window.__fernFx; }; });
  const me = () => { const d = F(); return { x: d.x, y: d.y }; };
  // แนว 3 ช่องที่มีศัตรูใกล้สุด (ไม่มี = ทิศขวา)
  const zoltraak = () => {
    const d = F();
    let best = null;
    for (const [dx, dy] of DIR4) {
      const lane = [];
      for (let i = 1; i <= 3 && inB(d.x + dx * i, d.y + dy * i); i++) lane.push({ x: d.x + dx * i, y: d.y + dy * i });
      if (!lane.length) continue;
      const hits = units.filter((u) => u.id !== "me" && lane.some((t) => t.x === u.x && t.y === u.y));
      if (!best || hits.length > best.hits.length) best = { lane, hits };
    }
    if (!best) return;
    const to = best.hits[0] ? { x: best.hits[0].x, y: best.hits[0].y } : best.lane[best.lane.length - 1];
    pushFx([{ kind: "fernZoltraak", x: d.x, y: d.y, size: 1, to, lane: best.lane, color: d.color }]);
    setFocus(to);
    setTimeout(() => {
      playSfx("fern_zoltraak");
      pushFx(best.hits.flatMap((u) => [{ kind: "burst", x: u.x, y: u.y, color: d.color }, { kind: "float", x: u.x, y: u.y, text: "-2", size: 28, z: 1.5 }]));
    }, 270);
  };
  const cannon = () => {
    const f = foes()[0];
    if (!f) return;
    play({ kind: "cannon", from: me(), to: { x: f.x, y: f.y }, dmg: 3 + Math.max(0, (ferns && ferns.charge) || 0), hitId: f.id });
    setFerns(null);
  };
  const charge = (n) => setFerns(n == null ? null : { charge: n });
  const rows = [
    [["Zoltraak", zoltraak], ["ร่ายต่อเนื่อง", () => play({ kind: "cast", at: me() })], ["ซ่อนเร้นมานา", () => play({ kind: "conceal", at: me() })],
      ["เผยตัว", () => play({ kind: "unveil", at: me() })], ["Defensive Magic", () => play({ kind: "shield", at: me() })]],
    [["วาร์ปหาย", () => play({ kind: "warpOut", at: me() })], ["วาร์ปปรากฏ", () => play({ kind: "warpIn", at: me() })], ["เผยตำแหน่ง", () => play({ kind: "reveal", at: me() })],
      ["ชาร์จ 0", () => charge(0)], ["ชาร์จ 1", () => charge(1)], ["ชาร์จ 2", () => charge(2)], ["ชาร์จ 3", () => charge(3)], ["ปิดชาร์จ", () => charge(null)],
      ["Orbital Cannon", cannon], ["ยกเลิกชาร์จ", () => { play({ kind: "fizzle", at: me() }); setFerns(null); }]],
  ];
  return (
    <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", maxWidth: 900 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {r.map(([label, fn]) => <button key={label} style={btn} onClick={fn}>{label}</button>)}
        </div>
      ))}
    </div>
  );
}
FernFxDev.units = fernUnits; // BoardPreview ใช้ตอนสร้างตัวละครจำลอง
