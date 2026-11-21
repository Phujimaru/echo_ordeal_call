// ============================================================
//  เวอจิล — ตัวนับ HIT + แถบเวลาต่อคอมโบ + แถบท่าคอมโบ + คู่มือ (me.vergil · characters/vergil.js vergilState)
//   v = { combo, left, max, doppel, at, target, seq, routes, route, routeAt } · left/max = ms ที่เหลือ/เต็ม ตอน server ส่ง state
//   v.seq = ลำดับปุ่มที่กดไปแล้ว ("b" ฟันโหมกระหน่ำ · "s" ฟันขึ้น) · v.routes = ท่าคอมโบทั้งหมด · v.route/routeAt = ท่าล่าสุด (ชื่อเด้ง)
//   live = ตาเดินของเราและเกมอยู่ในตาเดิน (คลิป/ฉาก = แถบหยุด)
//  แถบท่าที่กดต่อได้ + ปุ่ม 📖 คู่มือ (ผู้ใช้สั่ง 2026-11-21 — คู่มือมีคำอธิบายผลได้ตามที่ผู้ใช้ขอ) · จอคอม/แท็บเล็ตเท่านั้น
// ============================================================
import { useEffect, useRef, useState } from "react";
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
const KEY_IMG = { b: "/characters/vergil/skill1.webp", s: "/characters/vergil/skill2.webp" };
const KEY_NUM = { b: "1", s: "2" };

// ปุ่มในลำดับ: รูปสกิล + เลขปุ่มลัด · next = ปุ่มที่ต้องกดต่อ (เรืองแสง) · done = กดไปแล้ว · todo = ยังไม่ถึง
function Key({ k, size = 26, state = "" }) {
  const glow = state === "next" ? "0 0 10px #7dd3fc, 0 0 2px #fff" : "none";
  const border = state === "next" ? "#e0f2ff" : state === "done" ? "#38bdf8" : "rgba(255,255,255,0.35)";
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size, borderRadius: 6, overflow: "hidden",
      border: `1.5px solid ${border}`, boxShadow: glow, opacity: state === "todo" ? 0.55 : 1, flex: "0 0 auto" }}>
      <img src={KEY_IMG[k]} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <span style={{ position: "absolute", right: 1, bottom: -1, fontSize: size * 0.42, fontWeight: 900, color: "#fff", textShadow: "0 0 3px #000, 0 0 2px #000" }}>{KEY_NUM[k]}</span>
    </span>
  );
}

function Manual({ routes, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(4,8,20,0.72)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "min(640px, 92vw)", maxHeight: "86vh", overflowY: "auto", background: "linear-gradient(160deg,#0b1b33,#071022)", border: "1px solid #38bdf8",
          borderRadius: 14, padding: "18px 20px", color: "#e0f2ff", boxShadow: "0 0 40px rgba(56,189,248,0.35)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>📖 คู่มือคอมโบ</div>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "1px solid #38bdf8", color: "#e0f2ff", borderRadius: 8, padding: "2px 10px", cursor: "pointer" }}>✕</button>
        </div>
        {routes.map((r) => (
          <div key={r.key} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 14px", alignItems: "center", padding: "9px 0", borderTop: "1px solid rgba(56,189,248,0.2)" }}>
            <div style={{ display: "flex", gap: 4 }}>{r.seq.split("").map((k, i) => <Key key={i} k={k} size={30} />)}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#7dd3fc" }}>{r.name}</div>
              <div style={{ fontSize: 13.5, opacity: 0.9 }}>{r.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VergilCombo({ v, live }) {
  const [now, setNow] = useState(() => Date.now());
  const [manual, setManual] = useState(false);
  // ชื่อท่าคอมโบเด้ง (routeAt เปลี่ยน = ท่าใหม่ออก)
  const [flash, setFlash] = useState(null);
  const seenRoute = useRef(v?.routeAt || 0);
  const routeAt = v?.routeAt || 0, routeKey = v?.route || null, routeList = v?.routes || null;
  useEffect(() => {
    if (!routeAt || routeAt === seenRoute.current) return undefined;
    seenRoute.current = routeAt;
    const r = (routeList || []).find((x) => x.key === routeKey);
    if (!r) return undefined;
    setFlash({ name: r.name, k: routeAt });
    const t = setTimeout(() => setFlash(null), 1500);
    return () => clearTimeout(t);
  }, [routeAt, routeKey, routeList]);
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

  if (!v) return null;
  const at = v.at || 30;
  const left = v.max ? (clock.paused != null ? clock.paused : Math.max(0, clock.end - now)) : 0;
  const frac = v.max ? Math.min(1, left / v.max) : 0;
  const c = tone(v.combo, at);
  const rank = rankOf(v.combo);
  const seq = v.seq || "";
  const routes = v.routes || [];
  // ท่าที่ยังกดต่อได้จากลำดับตอนนี้ (ลำดับว่าง = ทุกท่า) — เรียงท่าที่ใกล้ครบก่อน
  const open = routes.filter((r) => r.seq.startsWith(seq) && r.seq.length > seq.length)
    .sort((a, b) => a.seq.length - b.seq.length);
  const showHints = live || seq.length > 0;
  return (
    <>
      <div
        style={{
          position: "fixed", right: 28, top: "24%", zIndex: 60, pointerEvents: "none",
          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6,
          fontFamily: "inherit", textShadow: `0 0 12px ${c}, 0 2px 4px rgba(0,0,0,0.9)`,
        }}
      >
        <button type="button" onClick={() => setManual(true)} aria-label="คู่มือคอมโบ"
          style={{ pointerEvents: "auto", cursor: "pointer", background: "rgba(7,16,34,0.82)", border: "1px solid #38bdf8", borderRadius: 10,
            color: "#e0f2ff", fontSize: 18, padding: "3px 10px", textShadow: "none" }}>📖</button>
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
        {flash && <div key={flash.k} className="vg-route-pop" style={{ fontSize: 26, fontWeight: 900, fontStyle: "italic", color: "#e0f2ff", letterSpacing: 1 }}>{flash.name}</div>}
        {showHints && open.length > 0 && (
          <div style={{ marginTop: 4, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, textShadow: "0 1px 3px #000",
            background: "rgba(7,16,34,0.6)", borderRadius: 10, padding: "6px 8px", border: "1px solid rgba(56,189,248,0.35)" }}>
            {open.slice(0, 5).map((r) => (
              <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: "#bae6fd", whiteSpace: "nowrap" }}>{r.name}</span>
                <span style={{ display: "flex", gap: 3 }}>
                  {r.seq.split("").map((k, i) => <Key key={i} k={k} size={22} state={i < seq.length ? "done" : i === seq.length ? "next" : "todo"} />)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {manual && <Manual routes={routes} onClose={() => setManual(false)} />}
    </>
  );
}
