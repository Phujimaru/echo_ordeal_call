// เฉพาะ dev: หน้าดูกระดาน ?board=1&midoriya=1 — ปุ่มเล่นเอฟเฟกต์ของมิโดริยะ อิซึคุ (midoriyaFx.js)
//  Smash ต่อยไปทางขวาจาก "me" (ตัวไม่ขยับจริง — ดูแค่ภาพ) · ช่องพื้นที่คิดด้วย boardRules.lineTiles เหมือนเกมจริง
//  คอนโซล: window.__midoriyaFx(kind) = เล่นชุดเดียวกับปุ่ม (punch / cowlPunch / smash / throw / detroit / delaware / million / recoil / cowl / aura)
import { useEffect, useRef, useState } from "react";
import * as Rules from "./boardRules";
import { MIDORIYA_T, smashDur } from "./midoriyaFx";
import { playSfx } from "../audio";

const CUR = { units: [] };
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid #5fe39a", background: "rgba(10,90,50,.95)" };
const AREA = {
  smash: { len: 5, width: 1, cone: true, self: 5 }, throw: { len: 7, width: 1, self: 2 }, detroit: { len: 6, width: 1, cone: true, self: 6 },
  delaware: { len: 7, width: 3, self: 3 }, million: { len: 7, width: 1, cone: true, self: 14 },
};

const CLIP = (form) => `/characters/midoriya_izuku/${form}.mp4`;

export default function MidoriyaFxDev({ units, setUnits, pushFx, setFocus, map, setShake }) {
  useEffect(() => { CUR.units = units; });
  // เหมือนเกมจริง: คลิปเต็มจอพร้อมเสียงก่อน → จบแล้วผลบนกระดาน (กดที่คลิป = ข้าม)
  const [clip, setClip] = useState(null);
  const after = useRef(null);
  const endClip = () => { setClip(null); const f = after.current; after.current = null; if (f) f(); };
  const me = () => { const u = CUR.units.find((x) => x.id === "me"); return { x: u.x, y: u.y }; };
  const foe = () => {
    const m = me();
    const list = CUR.units.filter((u) => u.id !== "me").sort((a, b) => Math.abs(a.x - m.x) + Math.abs(a.y - m.y) - (Math.abs(b.x - m.x) + Math.abs(b.y - m.y)));
    return list[0] ? { x: list[0].x, y: list[0].y } : { x: m.x + 1, y: m.y };
  };
  const smash = (form, cowl = false, withClip = true) => {
    if (withClip) { after.current = () => smash(form, cowl, false); setClip(CLIP(form)); return; }
    const a = me(), ar = AREA[form];
    const tiles = map ? Rules.lineTiles(map, a.x, a.y, "right", ar.len, ar.width, 1, 0, !!ar.cone) : [];
    pushFx([{ kind: "midoriyaSmash", x: a.x, y: a.y, dir: "right", form, cowl, tiles, dur: smashDur(form) }]);
    playSfx(form === "million" ? (cowl === "noclip" ? "midoriya_million" : "midoriya_million_storm") : "midoriya_smash_storm"); // เหมือนเกมจริง (หลังคลิปจบ)
    const big = form === "million", beat = big ? MIDORIYA_T.million : MIDORIYA_T.smash;
    for (const d of big ? [0, 120, 260, 420, 620, 900, 1250] : [0, 150, 350]) setTimeout(() => setShake && setShake((n) => n + 1), beat + d);
    setTimeout(() => { pushFx([{ kind: "midoriyaRecoil", x: a.x, y: a.y, n: AREA[form].self }]); playSfx("midoriya_recoil"); }, beat + 60); // ร่างกายรับแรง (เกมจริง: ตอนดาเมจลง)
    setFocus({ x: a.x + 3, y: a.y });
  };
  const play = {
    punch: () => { const a = me(), b = foe(); pushFx([{ kind: "midoriyaPunch", x: a.x, y: a.y, to: b, size: 1, toSize: 1 }]); playSfx("midoriya_punch"); setFocus(b); },
    cowlPunch: () => { const a = me(), b = foe(); pushFx([{ kind: "midoriyaPunchCowl", x: a.x, y: a.y, to: b, size: 1, toSize: 1 }]); playSfx("midoriya_punch_cowl"); setFocus(b); },
    smash: () => smash("smash"), throw: () => smash("throw"), detroit: () => smash("detroit", true), delaware: () => smash("delaware"), million: () => smash("million"), millionNoClip: () => smash("million", "noclip", false),
    recoil: () => { const a = me(); pushFx([{ kind: "midoriyaRecoil", x: a.x, y: a.y, n: 14 }]); playSfx("midoriya_recoil"); setFocus(a); },
    cowl: () => { const a = me(); pushFx([{ kind: "midoriyaCowl", x: a.x, y: a.y }]); playSfx("midoriya_cowl"); setFocus(a); },
    aura: () => setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, aura: u.aura === "midoriyaCowl" ? null : "midoriyaCowl" } : u))),
  };
  useEffect(() => {
    window.__midoriyaFx = (k) => play[k] && play[k]();
    return () => { delete window.__midoriyaFx; };
  });
  const labels = [["punch", "ต่อย"], ["cowlPunch", "ต่อย (Full Cowl)"], ["smash", "Smash"], ["throw", "ปาของ"], ["detroit", "Detroit"], ["delaware", "Delaware"], ["million", "1,000,000%"], ["millionNoClip", "1,000,000% (ไม่มีคลิป)"], ["recoil", "รับแรง"], ["cowl", "Full Cowl"], ["aura", "ออร่า"]];
  return (
    <>
    {clip && (
      <div onClick={endClip} style={{ position: "fixed", inset: 0, zIndex: 60, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <video src={clip} autoPlay playsInline onEnded={endClip} onError={endClip} style={{ maxWidth: "100%", maxHeight: "100%" }} />
      </div>
    )}
    <div style={{ position: "fixed", left: 12, bottom: 12, zIndex: 50, display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 760 }}>
      {labels.map(([k, l]) => <button key={k} style={btn} onClick={() => play[k]()}>{l}</button>)}
    </div>
    </>
  );
}
