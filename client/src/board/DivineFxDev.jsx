// เฉพาะ dev: หน้าดูกระดาน ?board=1&divine=1 — ปุ่มเล่นเอฟเฟกต์มนต์อสูรเทพของนกหวีดอัญเชิญ (divineFx.js) โดยไม่ต้องเปิดห้องจริง
//  มุยมิ (me) = ผู้เป่า · เหตุการณ์ = รูปแบบเดียวกับ socket "divineFx" ของ server · Judgment Bolt ลงผลที่ DIVINE_LAND_MS (สุ่มช่องไฟจำลอง)
//  ภาพนิ่ง: ?dvshot=1 + await window.__dvShot("ชื่อปุ่ม", ms) = กดแล้วหยุดนาฬิกาเฟรมไว้ที่ ms หลังกด
import { useEffect } from "react";
import { DIVINE_LAND_MS, divineEventFx } from "./divineFx";

if (typeof window !== "undefined" && /[?&]dvshot=1/.test(location.search)) {
  const orig = window.requestAnimationFrame.bind(window);
  let last = null, freezeAt = null;
  const clock = (t) => (freezeAt != null ? Math.min(t, freezeAt) : t);
  window.requestAnimationFrame = (cb) => { last = cb; return orig((t) => cb(clock(t))); };
  const tick = () => new Promise((r) => setTimeout(r, 40));
  window.__dvShot = async (label, ms) => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === label);
    if (!b) return "no button";
    const c = performance.now() + 16;
    freezeAt = c + (Number(ms) || 0);
    b.click();
    await tick();
    if (last) last(c);
    await new Promise((r) => setTimeout(r, Math.max(40, Number(ms) || 0)));
    if (last) last(freezeAt);
    return "ok";
  };
  window.__dvUnfreeze = () => { freezeAt = null; };
}
const CUR = { units: [], seq: 0 };
const nextSeq = () => ++CUR.seq;
// ช่องไฟจำลอง (สุ่ม 40% ของช่องที่ไม่ใช่สิ่งกีดขวาง)
function fireTiles(map) {
  const out = [];
  for (let y = 0; y < map.rows; y++) for (let x = 0; x < map.cols; x++) if (!map.terrain[`${x},${y}`] && Math.random() < 0.4) out.push({ x, y });
  return out;
}
const btn = { font: "500 13px Kanit, sans-serif", color: "#fff", cursor: "pointer", padding: "4px 9px", border: "1px solid rgba(242,207,110,.6)", background: "rgba(24,18,30,.94)" };

export default function DivineFxDev({ units, map, pushFx, setFocus }) {
  useEffect(() => { CUR.units = units; });
  const posOf = (id) => { const u = CUR.units.find((v) => v.id === id); return u ? { x: u.x, y: u.y, size: u.size || 1 } : null; };
  const cols = map.cols, rows = map.rows;
  const play = (ev) => {
    const out = divineEventFx(ev, { cols, rows, posOf });
    if (out.fx.length) pushFx(out.fx);
    if (out.look) setFocus(out.look);
    for (const ms of out.shake) setTimeout(() => pushFx([{ kind: "iceShake", x: 0, y: 0, amp: 6, dur: 400 }]), ms);
  };
  const boltLand = (seq) => {
    const tiles = fireTiles(map);
    const hits = CUR.units.filter((u) => u.id !== "me").map((u) => u.id);
    play({ seq, spell: "judgmentBolt", land: true, by: "me", tiles, hits });
  };
  const cast = (spell) => {
    const me = posOf("me");
    const seq = nextSeq();
    play({ seq, spell, by: "me", at: me ? { x: me.x, y: me.y } : null, size: 1 });
    if (spell === "judgmentBolt") setTimeout(() => boltLand(seq), DIVINE_LAND_MS.judgmentBolt);
  };
  const list = [["Cross Winds", "crossWinds"], ["Tsunami", "tsunami"], ["Diamond Dust", "diamondDust"], ["Judgment Bolt", "judgmentBolt"]];
  return (
    <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", gap: 4 }}>
      {list.map(([label, key]) => <button key={key} style={btn} onClick={() => cast(key)}>{label}</button>)}
      <button style={btn} onClick={() => boltLand(nextSeq())}>สายฟ้าลง</button>
    </div>
  );
}
