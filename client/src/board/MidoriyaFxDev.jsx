// เฉพาะ dev: หน้าดูกระดาน ?board=1&midoriya=1 — ปุ่มเล่นเอฟเฟกต์ของมิโดริยะ อิซึคุ (midoriyaFx.js)
//  Smash ต่อยไปทางขวาจาก "me" (ตัวไม่ขยับจริง — ดูแค่ภาพ) · ช่องพื้นที่คิดด้วย boardRules.lineTiles เหมือนเกมจริง
//  คอนโซล: window.__midoriyaFx(kind) = เล่นชุดเดียวกับปุ่ม (punch / cowlPunch / smash / throw / detroit / delaware / million / recoil / cowl / aura)
import { useEffect } from "react";
import * as Rules from "./boardRules";
import { smashDur } from "./midoriyaFx";

const CUR = { units: [] };
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid #5fe39a", background: "rgba(10,90,50,.95)" };
const AREA = {
  smash: { len: 5, width: 1, cone: true }, throw: { len: 7, width: 1 }, detroit: { len: 6, width: 1, cone: true },
  delaware: { len: 7, width: 3 }, million: { len: 7, width: 1, cone: true },
};

export default function MidoriyaFxDev({ units, setUnits, pushFx, setFocus, map }) {
  useEffect(() => { CUR.units = units; });
  const me = () => { const u = CUR.units.find((x) => x.id === "me"); return { x: u.x, y: u.y }; };
  const foe = () => {
    const m = me();
    const list = CUR.units.filter((u) => u.id !== "me").sort((a, b) => Math.abs(a.x - m.x) + Math.abs(a.y - m.y) - (Math.abs(b.x - m.x) + Math.abs(b.y - m.y)));
    return list[0] ? { x: list[0].x, y: list[0].y } : { x: m.x + 1, y: m.y };
  };
  const smash = (form, cowl = false) => {
    const a = me(), ar = AREA[form];
    const tiles = map ? Rules.lineTiles(map, a.x, a.y, "right", ar.len, ar.width, 1, 0, !!ar.cone) : [];
    pushFx([{ kind: "midoriyaSmash", x: a.x, y: a.y, dir: "right", form, cowl, tiles, dur: smashDur(form) }]);
    setFocus({ x: a.x + 3, y: a.y });
  };
  const play = {
    punch: () => { const a = me(), b = foe(); pushFx([{ kind: "midoriyaPunch", x: a.x, y: a.y, to: b, size: 1, toSize: 1 }]); setFocus(b); },
    cowlPunch: () => { const a = me(), b = foe(); pushFx([{ kind: "midoriyaPunchCowl", x: a.x, y: a.y, to: b, size: 1, toSize: 1 }]); setFocus(b); },
    smash: () => smash("smash"), throw: () => smash("throw"), detroit: () => smash("detroit", true), delaware: () => smash("delaware"), million: () => smash("million"),
    recoil: () => { const a = me(); pushFx([{ kind: "midoriyaRecoil", x: a.x, y: a.y, n: 14 }]); setFocus(a); },
    cowl: () => { const a = me(); pushFx([{ kind: "midoriyaCowl", x: a.x, y: a.y }]); setFocus(a); },
    aura: () => setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, aura: u.aura === "midoriyaCowl" ? null : "midoriyaCowl" } : u))),
  };
  useEffect(() => {
    window.__midoriyaFx = (k) => play[k] && play[k]();
    return () => { delete window.__midoriyaFx; };
  });
  const labels = [["punch", "ต่อย"], ["cowlPunch", "ต่อย (Full Cowl)"], ["smash", "Smash"], ["throw", "ปาของ"], ["detroit", "Detroit"], ["delaware", "Delaware"], ["million", "1,000,000%"], ["recoil", "รับแรง"], ["cowl", "Full Cowl"], ["aura", "ออร่า"]];
  return (
    <div style={{ position: "fixed", left: 12, bottom: 12, zIndex: 50, display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 760 }}>
      {labels.map(([k, l]) => <button key={k} style={btn} onClick={() => play[k]()}>{l}</button>)}
    </div>
  );
}
