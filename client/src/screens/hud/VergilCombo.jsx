// ============================================================
//  เวอจิล — ตัวนับ HIT + แถบเวลาต่อคอมโบ (me.vergil · characters/vergil.js vergilState)
//   v = { combo, left, max, doppel, at, target } · left/max = ms ที่เหลือ/เต็ม ตอน server ส่ง state
//   live = ตาเดินของเราและเกมอยู่ในตาเดิน (คลิป/ฉาก = แถบหยุด)
//  จอคอม/แท็บเล็ตเท่านั้น · ไม่มีข้อความอธิบาย (ตัวเลข + ไอคอน)
// ============================================================
import { useEffect, useState } from "react";
import "./vergilCombo.css";

// เป้าของปุ่มฟันรัว: เป้าที่ฟันล่าสุด (ยังติดตัว) → ไม่มี = หน่วยเดียวที่ติดตัว · หลายตัว = null (เลือกบนกระดาน)
export function vergilQuickTarget(me, players) {
  if (!me?.pos || !Array.isArray(players)) return null;
  const near = players.filter((p) => p.id !== me.id && p.alive && p.pos
    && Math.abs(p.pos.x - me.pos.x) + Math.abs(p.pos.y - me.pos.y) === 1);
  const last = me.vergil?.target && near.find((p) => p.id === me.vergil.target);
  if (last) return last.id;
  return near.length === 1 ? near[0].id : null;
}

// แรงค์สไตล์ (รูปผู้ใช้ — client/public/characters/vergil/rank) · SSS ขึ้นก่อน Judgment Cut End ที่ 30
const RANKS = [["sss", 26], ["ss", 22], ["s", 17], ["a", 12], ["b", 8], ["c", 4], ["d", 1]];
export const rankOf = (n) => { for (const [k, min] of RANKS) if (n >= min) return k; return null; };
const RANK_IMG = (k) => `/characters/vergil/rank/${k}.webp`;
if (typeof Image === "function") for (const [k] of RANKS) { const im = new Image(); im.src = RANK_IMG(k); }

const tone = (n, at) => (n >= at - 5 ? "#e0f2ff" : n >= 20 ? "#7dd3fc" : n >= 10 ? "#38bdf8" : "#0ea5e9");

export default function VergilCombo({ v, live }) {
  const [now, setNow] = useState(() => Date.now());
  // เส้นตายของแถบ: ตั้งใหม่ทุกครั้งที่ server ส่งค่าใหม่ (เทียบเวลาเครื่องตัวเอง) · paused = ms ที่ค้างไว้ระหว่างคลิป/ฉาก
  const [clock, setClock] = useState({ end: 0, paused: null });
  const key = v ? `${v.combo}:${v.left}:${v.max}` : "";
  const left0 = v?.left || 0;
  useEffect(() => {
    setClock({ end: Date.now() + left0, paused: null });
  }, [key, left0]);
  useEffect(() => {
    setClock((c) => {
      if (live) return c.paused != null ? { end: Date.now() + c.paused, paused: null } : c;
      return c.paused == null ? { ...c, paused: Math.max(0, c.end - Date.now()) } : c;
    });
  }, [live]);
  const ticking = !!v && v.max > 0;
  useEffect(() => {
    if (!ticking) return undefined;
    const id = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(id);
  }, [ticking]);

  if (!v || (!v.combo && !v.doppel)) return null;
  const at = v.at || 30;
  const left = v.max ? (clock.paused != null ? clock.paused : Math.max(0, clock.end - now)) : 0;
  const frac = v.max ? Math.min(1, left / v.max) : 0;
  const c = tone(v.combo, at);
  const rank = rankOf(v.combo);
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed", right: 28, top: "38%", zIndex: 60, pointerEvents: "none",
        display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6,
        fontFamily: "inherit", textShadow: `0 0 12px ${c}, 0 2px 4px rgba(0,0,0,0.9)`,
      }}
    >
      {v.doppel && <div style={{ fontSize: 22, color: "#c4b5fd", textShadow: "0 0 10px #8b5cf6" }}>👥</div>}
      {rank && (
        <img
          key={rank} src={RANK_IMG(rank)} alt="" draggable={false}
          className="vg-rank-pop"
          style={{ height: rank === "sss" ? 118 : rank === "ss" ? 108 : 96, width: "auto", filter: "drop-shadow(0 0 10px rgba(0,0,0,0.8))" }}
        />
      )}
      {v.combo > 0 && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, color: c, fontWeight: 900, fontStyle: "italic" }}>
          <span style={{ fontSize: 56, lineHeight: 1 }}>{v.combo}</span>
          <span style={{ fontSize: 20, letterSpacing: 2 }}>HIT</span>
        </div>
      )}
      {v.combo > 0 && (
        <div style={{ width: 180, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, (v.combo / at) * 100)}%`, height: "100%", background: "linear-gradient(90deg,#0ea5e9,#e0f2ff)" }} />
        </div>
      )}
      {v.max > 0 && (
        <div style={{ width: 180, height: 10, borderRadius: 5, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(125,211,252,0.6)", overflow: "hidden" }}>
          <div style={{ width: "100%", height: "100%", background: frac < 0.34 ? "#f43f5e" : c, transform: `scaleX(${frac})`, transformOrigin: "left center", willChange: "transform" }} />
        </div>
      )}
    </div>
  );
}
