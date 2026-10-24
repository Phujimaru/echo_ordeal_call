// เฉพาะ dev: หน้าดูกระดาน ?board=1&fern=1 — ปุ่มเล่นเอฟเฟกต์ของเฟิร์น (fernFx.js) โดยไม่ต้องเปิดห้องจริง
//  มุยมิ (me) กลายเป็นเฟิร์น — ปุ่มสร้าง payload แบบเดียวกับ server (GRID_PLAN §7.14) แล้วผ่าน FERN_EVENT_FX เหมือน BoardStage
//  Zoltraak 3 / 6 = attackStyle "fernZoltraak" ตามแนว 3 หรือ 6 ช่องไปทางที่โดนศัตรูมากสุด · Zoltraak 6th = "fernZoltraakMax" (แนว 3 ช่อง)
//  แสงปลายคทา (prop ferns) = สลับ empowered / boost
//  คอนโซล: window.__fernFx({ kind: "reset", at: { x, y } }) = ส่ง payload ของ socket "fernFx" ตรงๆ
import { useEffect } from "react";
import { FERN_EVENT_FX, FERN_EVENT_SFX, FERN_HIT_P, FERN_MS, FERN_SFX_LEAD } from "./fernFx";
import { playSfx } from "../audio";

const IMG = "/characters/fern/fern.webp";
function fernUnits(list) {
  return list.map((u) => (u.id === "me" ? { ...u, x: 4, y: 8, name: "เฟิร์น", img: IMG, color: "#8E7CC3", hp: 5, maxHp: 5, armor: 2, maxArmor: 2 } : u));
}
const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid rgba(180,210,255,.6)", background: "rgba(24,22,48,.94)" };

export default function FernFxDev({ units, pushFx, setFocus, map, ferns, setFerns }) {
  const inB = (x, y) => x >= 0 && y >= 0 && x < map.cols && y < map.rows;
  const F = () => units.find((u) => u.id === "me");
  const play = (ev) => {
    const kind = FERN_EVENT_FX[ev.kind];
    if (!kind || !ev.at) return;
    pushFx([{ ...ev, kind, x: ev.at.x, y: ev.at.y, size: 1 }]);
    if (FERN_EVENT_SFX[ev.kind]) playSfx(FERN_EVENT_SFX[ev.kind]);
    setFocus({ x: ev.at.x, y: ev.at.y });
  };
  useEffect(() => { window.__fernFx = (ev) => play(ev); return () => { delete window.__fernFx; }; });
  const me = () => { const d = F(); return { x: d.x, y: d.y }; };
  // แนว len ช่องที่โดนศัตรูมากสุด (เสมอ = ทิศแรก · ไม่มีใคร = ทิศขวา)
  const zoltraak = (len, style) => {
    const d = F();
    let best = null;
    for (const [dx, dy] of DIR4) {
      const lane = [];
      for (let i = 1; i <= len && inB(d.x + dx * i, d.y + dy * i); i++) lane.push({ x: d.x + dx * i, y: d.y + dy * i });
      if (!lane.length) continue;
      const hits = units.filter((u) => u.id !== "me" && lane.some((t) => t.x === u.x && t.y === u.y));
      if (!best || hits.length > best.hits.length) best = { lane, hits };
    }
    if (!best) return;
    const to = best.hits[0] ? { x: best.hits[0].x, y: best.hits[0].y } : best.lane[best.lane.length - 1];
    pushFx([{ kind: style, x: d.x, y: d.y, size: 1, to, lane: best.lane, color: d.color }]);
    setFocus(to);
    const max = style === "fernZoltraakMax";
    const hit = Math.round(FERN_MS[style] * FERN_HIT_P[style]);
    setTimeout(() => playSfx(max ? "fern_zoltraak_max" : "fern_zoltraak"), Math.max(0, hit - FERN_SFX_LEAD)); // เสียงร่ายก่อน · ระเบิดตรงปะทะ
    setTimeout(() => {
      pushFx(best.hits.flatMap((u) => [{ kind: "burst", x: u.x, y: u.y, color: d.color }, { kind: "float", x: u.x, y: u.y, text: "-2", size: max ? 32 : 28, z: 1.5 }]));
    }, hit);
  };
  const glowToggle = (k) => setFerns({ empowered: !!(ferns && ferns.empowered), boost: !!(ferns && ferns.boost), [k]: !(ferns && ferns[k]) });
  const rows = [
    [["Zoltraak 3", () => zoltraak(3, "fernZoltraak")], ["Zoltraak 6", () => zoltraak(6, "fernZoltraak")], ["Zoltraak เสริมพลัง", () => zoltraak(3, "fernZoltraakMax")],
      ["Zoltraak เสริมพลัง · 6", () => zoltraak(6, "fernZoltraakMax")]],
    [["ร่ายต่อเนื่อง", () => play({ kind: "cast", at: me() })], ["เพิ่มระยะ", () => play({ kind: "boost", at: me() })], ["ซ่อนเร้นมานา", () => play({ kind: "conceal", at: me() })],
      ["ออกจากซ่อนเร้น", () => play({ kind: "unveil", at: me() })], ["ผู้เชี่ยวชาญเวทมนต์พื้นฐาน", () => play({ kind: "shield", at: me() })]],
    [["ครบ 4", () => play({ kind: "empower", at: me() })], ["รีเซ็ท", () => play({ kind: "reset", at: me() })],
      [`คทา เสริมพลัง ${ferns && ferns.empowered ? "✓" : "✗"}`, () => glowToggle("empowered")], [`คทา เพิ่มระยะ ${ferns && ferns.boost ? "✓" : "✗"}`, () => glowToggle("boost")]],
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
