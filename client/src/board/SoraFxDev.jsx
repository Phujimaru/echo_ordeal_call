// เฉพาะ dev: หน้าดูกระดาน ?board=1&sora=1 — ปุ่มเล่นเอฟเฟกต์ Mouse Separade ของโซระ (วงล้อ + เงาพุ่ง / ระเบิด) ร่างปกติและ Fire Frame
//  พุ่งจาก me ไปทางขวา 3 ช่อง (ตัวไม่ขยับจริง — ดูแค่ภาพเอฟเฟกต์) · ระเบิดที่ช่องปลายทาง
//  คอนโซล: window.__soraFx(fire, boom) = เล่นชุดเดียวกับปุ่ม
import { useEffect } from "react";
import { SORA_T, dashDur } from "./boardDraw";
import { playSfx } from "../audio";

const CUR = { units: [] };
const btn = (fire) => ({ font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: `1px solid ${fire ? "#ff9a4a" : "rgba(95,227,255,.6)"}`, background: fire ? "rgba(120,40,10,.95)" : "rgba(18,24,34,.94)" });

export default function SoraFxDev({ units, pushFx, setFocus }) {
  useEffect(() => { CUR.units = units; });
  const me = () => { const u = CUR.units.find((x) => x.id === "me"); return { x: u.x, y: u.y }; };
  const wheel = (fire) => {
    const s0 = me(), pts = [s0, ...[1, 2, 3].map((i) => ({ x: s0.x + i, y: s0.y }))];
    pushFx([
      { kind: "soraWheel", x: s0.x, y: s0.y, size: 1, dir: { x: 1, y: 0 }, spin: SORA_T.wheel, path: pts, step: SORA_T.step, dur: SORA_T.wheel + 3 * SORA_T.step + 160, fire },
      { kind: "soraDash", path: pts, step: SORA_T.step, delay: SORA_T.wheel, size: 1, dur: SORA_T.wheel + dashDur(pts, SORA_T.step), fire },
    ]);
    setFocus(s0);
    playSfx("sora_squeak"); playSfx("sora_wheel");
    setTimeout(() => playSfx("sora_dash"), SORA_T.wheel);
  };
  const boom = (fire) => {
    const s0 = me(), at = { x: s0.x + 3, y: s0.y };
    pushFx([{ kind: "soraBoom", x: at.x, y: at.y, size: 1, fire }]);
    setFocus(at);
  };
  useEffect(() => {
    window.__soraFx = (fire, b) => (b ? boom(!!fire) : wheel(!!fire));
    return () => { delete window.__soraFx; };
  });
  return (
    <div style={{ position: "fixed", left: 12, bottom: 12, zIndex: 50, display: "flex", gap: 6 }}>
      <button style={btn(false)} onClick={() => wheel(false)}>วงล้อ</button>
      <button style={btn(true)} onClick={() => wheel(true)}>วงล้อไฟ</button>
      <button style={btn(false)} onClick={() => boom(false)}>ระเบิด</button>
      <button style={btn(true)} onClick={() => boom(true)}>ระเบิดไฟ</button>
    </div>
  );
}
