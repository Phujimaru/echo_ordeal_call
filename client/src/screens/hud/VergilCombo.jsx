// ============================================================
//  เวอจิล — แผงคอมโบ (me.vergil · characters/vergil.js vergilState) · หน้าตา/ตำแหน่งใน vergilCombo.css (ฝั่งซ้าย · โทน HUD ของเกม)
//   v = { combo, left, max, doppel, at, target, seq, routes, route, routeAt } · left/max = ms ที่เหลือ/เต็ม ตอน server ส่ง state
//   v.seq = ลำดับปุ่มที่กดไปแล้ว ("b" ปุ่ม 1 ฟันโหมกระหน่ำ · "s" ปุ่ม 2 ฟันขึ้น) · v.routes = ท่าคอมโบทั้งหมด · v.route/routeAt = ท่าล่าสุด (ชื่อเด้ง)
//   live = ตาเดินของเราและเกมอยู่ในตาเดิน (คลิป/ฉาก = แถบเวลาหยุด)
//  ปุ่ม 📖 คู่มือ (ผู้ใช้สั่ง 2026-11-21 — คู่มือมีคำอธิบายผลได้ตามที่ผู้ใช้ขอ) · จอคอม/แท็บเล็ตเท่านั้น
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
const KEY_NUM = { b: "1", s: "2" };

// ไอคอนหนังสือ (emoji 📖 บางเครื่องแสดงเป็นกล่องว่าง)
const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 5.5C4.5 4 8 4 12 6c4-2 7.5-2 10-.5v13c-2.5-1.5-6-1.5-10 .5-4-2-7.5-2-10-.5z" />
    <path d="M12 6v13" />
  </svg>
);

function Key({ k, st = "", big = false }) {
  return <span className="vgc-key" data-k={k} data-st={st} data-big={big ? "true" : undefined}>{KEY_NUM[k]}</span>;
}

function Manual({ routes, onClose }) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") close.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="vgc vgc-manual-bg" role="dialog" aria-modal="true" onClick={onClose} style={{ pointerEvents: "auto", width: "auto", left: 0, top: 0 }}>
      <div className="vgc-card vgc-manual" onClick={(e) => e.stopPropagation()}>
        <div className="vgc-head">
          <span className="vgc-title" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className="vgc-book" style={{ border: 0, background: "none", padding: 0 }}><BookIcon /></span>คู่มือคอมโบ</span>
          <button type="button" className="vgc-book" onClick={onClose}>✕</button>
        </div>
        <div className="vgc-legend">
          <span><Key k="b" big /> ฟันโหมกระหน่ำ</span>
          <span><Key k="s" big /> ฟันขึ้น</span>
        </div>
        {routes.map((r) => (
          <div key={r.key} className="vgc-mrow">
            <span className="vgc-keys">{r.seq.split("").map((k, i) => <Key key={i} k={k} big />)}</span>
            <div>
              <div className="vgc-mname">{r.name}</div>
              <div className="vgc-mdesc">{r.desc}</div>
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
  // เส้นตายของแถบเวลา: ตั้งใหม่ทุกครั้งที่ server ส่งค่าใหม่ (เทียบเวลาเครื่องตัวเอง) · paused = ms ที่ค้างไว้ระหว่างคลิป/ฉาก
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
  const rank = rankOf(v.combo);
  const seq = v.seq || "";
  const routes = v.routes || [];
  // ท่าที่ยังกดต่อได้จากลำดับตอนนี้ (ลำดับว่าง = ทุกท่า) — ท่าที่ใกล้ครบอยู่บนสุด
  const open = routes.filter((r) => r.seq.startsWith(seq) && r.seq.length > seq.length)
    .sort((a, b) => a.seq.length - b.seq.length);
  const showList = live || seq.length > 0;
  return (
    <>
      <div className="vgc">
        <div className="vgc-card">
          <div className="vgc-head">
            <span className="vgc-title">Combo</span>
            {v.doppel && <span className="vgc-doppel">👥</span>}
            <button type="button" className="vgc-book" onClick={() => setManual(true)} aria-label="คู่มือคอมโบ"><BookIcon /></button>
          </div>
          {v.combo > 0 ? (
            <div className="vgc-style">
              <div className="vgc-row">
                {rank && <span className="vgc-plate"><img key={rank} className="vgc-rank vg-rank-pop" data-rank={rank} src={RANK_IMG(rank)} alt="" draggable={false} /></span>}
                <div className="vgc-hits">
                  <span className="vgc-hitnum">{v.combo}</span>
                  <span className="vgc-hitlbl">HIT</span>
                </div>
              </div>
              <div className="vgc-meter">
                <i style={{ transform: `scaleX(${Math.min(1, v.combo / at)})` }} />
                <b style={{ left: "33.33%" }} /><b style={{ left: "66.66%" }} />
              </div>
              {v.max > 0 && (
                <div className="vgc-timer" data-low={frac < 0.34 ? "true" : "false"}>
                  <i style={{ transform: `scaleX(${frac})` }} />
                </div>
              )}
            </div>
          ) : (
            <div className="vgc-mini"><span className="vgc-hitlbl">0 HIT</span></div>
          )}
        </div>
        {flash && <div key={flash.k} className="vgc-pop">{flash.name}</div>}
        {showList && open.length > 0 && (
          <div className="vgc-card vgc-list">
            {open.slice(0, 4).map((r) => (
              <div key={r.key} className="vgc-item" data-near={seq.length > 0 && r.seq.length - seq.length === 1 ? "true" : "false"}>
                <span className="vgc-name">{r.name}</span>
                <span className="vgc-keys">
                  {r.seq.split("").map((k, i) => <Key key={i} k={k} st={i < seq.length ? "done" : i === seq.length ? "next" : ""} />)}
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
