// เฉพาะ dev: หน้าดูกระดาน ?board=1&shinra=1 — ปุ่มเล่นเอฟเฟกต์ไฟของคุซาคาเบะ ชินระ (shinraFx.js)
//  เป้า = ตัวที่ใกล้ "me" ที่สุด · ลาทัมพุ่งจาก me ไปทางขวา 5 ช่อง (ตัวไม่ขยับจริง — ดูแค่ภาพ)
//  คอนโซล: window.__shinraFx(kind) = เล่นชุดเดียวกับปุ่ม (kick / blaze / hero / storm / warm / latom / detonate / smolder / prints / aura)
import { useEffect } from "react";
import { SHINRA_T, SHINRA_MS, latomDur } from "./shinraFx";
import { playSfx } from "../audio";

const CUR = { units: [] };
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid #ff9a4a", background: "rgba(120,40,10,.95)" };

export default function ShinraFxDev({ units, setUnits, pushFx, setFocus }) {
  useEffect(() => { CUR.units = units; });
  const me = () => { const u = CUR.units.find((x) => x.id === "me"); return { x: u.x, y: u.y }; };
  const foe = () => {
    const m = me();
    const list = CUR.units.filter((u) => u.id !== "me").sort((a, b) => Math.abs(a.x - m.x) + Math.abs(a.y - m.y) - (Math.abs(b.x - m.x) + Math.abs(b.y - m.y)));
    return list[0] ? { x: list[0].x, y: list[0].y } : { x: m.x + 1, y: m.y };
  };
  const ring = (c) => { const out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) out.push({ x: c.x + dx, y: c.y + dy }); return out; };
  const play = {
    kick: () => { const a = me(), b = foe(); pushFx([{ kind: "shinraKick", x: a.x, y: a.y, to: b, size: 1, toSize: 1 }]); playSfx("shinra_kick"); setFocus(b); },
    blaze: () => { const a = me(), b = foe(); pushFx([{ kind: "shinraKickBlaze", x: a.x, y: a.y, to: b, size: 1, toSize: 1 }]); playSfx("shinra_kick_blaze"); setFocus(b); },
    hero: () => { const a = me(); pushFx([{ kind: "shinraHero", x: a.x, y: a.y }]); playSfx("shinra_hero"); setFocus(a); },
    storm: () => { const a = me(); pushFx([{ kind: "shinraStorm", x: a.x, y: a.y, tiles: ring(a) }]); playSfx("shinra_storm"); setFocus(a); },
    warm: () => { const a = me(); pushFx([{ kind: "shinraWarm", x: a.x, y: a.y }]); playSfx("shinra_warm"); setFocus(a); },
    latom: () => {
      const a = me(), path = [a, ...[1, 2, 3, 4, 5].map((i) => ({ x: a.x + i, y: a.y }))];
      pushFx([{ kind: "shinraLatom", x: a.x, y: a.y, path, dur: latomDur(path) + 900 }]);
      playSfx("shinra_latom"); setFocus(path[3]);
      setTimeout(() => pushFx([{ kind: "shinraLatomHit", x: a.x + 3, y: a.y }]), latomDur(path));
    },
    detonate: () => { const b = foe(); pushFx([{ kind: "shinraDetonate", x: b.x, y: b.y }]); playSfx("shinra_detonate"); setFocus(b); },
    smolder: () => { const a = me(); pushFx([{ kind: "shinraSmolder", x: a.x, y: a.y }]); setFocus(a); },
    prints: () => { const a = me(), path = [a, ...[1, 2, 3, 4].map((i) => ({ x: a.x + i, y: a.y - (i > 2 ? 1 : 0) }))]; pushFx([{ kind: "shinraPrints", x: a.x, y: a.y, path, step: 120, dur: 3600 + path.length * 120 }]); setFocus(a); },
    aura: () => setUnits((us) => us.map((u) => (u.id === "me" ? { ...u, aura: u.aura === "shinraHero" ? "shinraBlaze" : u.aura === "shinraBlaze" ? null : "shinraHero" } : u))),
  };
  useEffect(() => {
    window.__shinraFx = (k) => play[k] && play[k]();
    return () => { delete window.__shinraFx; };
  });
  const labels = [["kick", "เตะ"], ["blaze", "เตะ (อุ่นเครื่อง)"], ["hero", "ฮีโร่"], ["storm", "อุ้งเท้าปีศาจ"], ["warm", "อุ่นเครื่อง"], ["latom", "ลาทัม"], ["detonate", "มอดไหม้"], ["smolder", "ได้มอดไหม้"], ["prints", "รอยเท้า"], ["aura", "ออร่า"]];
  return (
    <div style={{ position: "fixed", left: 12, bottom: 12, zIndex: 50, display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 760 }}>
      {labels.map(([k, l]) => <button key={k} style={btn} onClick={() => play[k]()}>{l}</button>)}
    </div>
  );
}
ShinraFxDev.MS = SHINRA_MS;
ShinraFxDev.T = SHINRA_T;
