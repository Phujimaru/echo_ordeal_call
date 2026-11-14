// Road Trip — มินิเกมแคมป์ (ผู้ใช้สั่ง 2026-11-14 "เล่นได้จริง ไม่ใช่กดแล้วได้ผล") · ผลส่งให้ server ตัดสินรางวัล (server/roadtrip/camp.js)
//  TimingBar  = เข็มแกว่ง กด Space/คลิก ตอนอยู่ในแถบ (คนข้าว · ขันน็อต) → คะแนน 0..1
//  HoldToast  = กดค้างปิ้งมาร์ชเมลโล่ ปล่อยตอนเหลืองทอง (เลย = ไหม้ → 0)
//  RhythmTap  = โน้ตวิ่งเข้าวง กดตามจังหวะ (ร้องเพลงรอบกองไฟ)
//  StarPick   = หากลุ่มดาวที่ตรงกับภาพเป้าหมาย 1 ใน 3 (วาดจากเมล็ดเดียวกันทุกเครื่อง)
//  StoryVote  = เลือกตอนจบเรื่องผี 1 ใน 3 (โหวต — เสียงข้างมากได้เหรียญ)
//  ปุ่มลัด: Space (e.code) · คำอธิบายอยู่ในกล่องชี้เท่านั้น (กฎ CLAUDE.md)
import { useEffect, useRef, useState } from "react";
import { clickSound } from "../audio";

function useRaf(on) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!on) return undefined;
    let id = 0;
    const loop = (now) => { setT(now); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [on]);
  return t;
}
function useSpace(fn, on = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!on) return undefined;
    const d = (e) => { if (e.code === "Space" && !e.repeat) { e.preventDefault(); ref.current("down"); } };
    const u = (e) => { if (e.code === "Space") { e.preventDefault(); ref.current("up"); } };
    window.addEventListener("keydown", d); window.addEventListener("keyup", u);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, [on]);
}

// ---------------------------------------------------------------- เข็มแกว่ง (rounds ครั้ง · แถบเขียวสุ่มตำแหน่งทุกครั้ง)
export function TimingBar({ icon = "🥄", rounds = 3, zone = 0.18, period = 1300, onDone }) {
  const [hits, setHits] = useState([]);
  const [zc, setZc] = useState(() => 0.25 + Math.random() * 0.5);
  const t0 = useRef(performance.now());
  const done = hits.length >= rounds;
  const now = useRaf(!done);
  const pos = (Math.sin(((now - t0.current) / period) * Math.PI * 2) + 1) / 2;
  const press = () => {
    if (done) return;
    clickSound();
    const d = Math.abs(pos - zc), q = d <= zone / 2 ? 1 - d / zone : 0;
    const next = [...hits, q];
    setHits(next); setZc(0.25 + Math.random() * 0.5);
    if (next.length >= rounds) onDone(next.reduce((a, b) => a + b, 0) / rounds);
  };
  useSpace((k) => { if (k === "down") press(); }, !done);
  return (
    <div className="cg cg-timing" onClick={press}>
      <span className="cg-ic" aria-hidden="true">{icon}</span>
      <div className="cg-track">
        <i className="cg-zone" style={{ left: `${(zc - zone / 2) * 100}%`, width: `${zone * 100}%` }} />
        <i className="cg-needle" style={{ left: `${pos * 100}%` }} />
      </div>
      <span className="cg-dots">{Array.from({ length: rounds }, (_, i) => <b key={i} data-q={hits[i] == null ? "wait" : hits[i] >= 0.6 ? "great" : hits[i] > 0 ? "ok" : "miss"} />)}</span>
      <kbd>Space</kbd>
    </div>
  );
}

// ---------------------------------------------------------------- มาร์ชเมลโล่: กดค้าง (เมาส์/Space) ความสุกขึ้น · ปล่อย = ส่ง · เกิน 1 = ไหม้
const TOAST_MS = 3200;
export function HoldToast({ onDone }) {
  const [hold, setHold] = useState(false);
  const [lv, setLv] = useState(0);
  const [res, setRes] = useState(null);
  const last = useRef(0);
  const now = useRaf(hold && res == null);
  useEffect(() => {
    if (!hold || res != null) return;
    if (last.current) setLv((v) => { const n = v + (now - last.current) / TOAST_MS; if (n > 1.12) { setRes(0); setHold(false); onDone(0); } return n; });
    last.current = now;
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps
  const down = () => { if (res != null) return; last.current = 0; setHold(true); };
  const up = () => { if (!hold || res != null) return; setHold(false); const s = lv > 1 ? 0 : lv; setRes(s); onDone(s); };
  useSpace((k) => (k === "down" ? down() : up()), res == null);
  const c = lv < 0.5 ? "#fff8ee" : lv < 0.85 ? "#ffdf9a" : lv <= 1 ? "#e8a04a" : "#3a2a20";
  return (
    <div className="cg cg-toast" onPointerDown={down} onPointerUp={up} onPointerLeave={up}>
      <span className="cg-mallow" style={{ background: c, boxShadow: hold ? "0 0 18px #ff8a3d" : "none" }} />
      <div className="cg-track"><i className="cg-zone" style={{ left: "85%", width: "15%" }} /><i className="cg-fill" style={{ width: `${Math.min(1, lv) * 100}%` }} /></div>
      {res != null ? <b className="cg-res">{res >= 0.85 ? "✨" : res >= 0.5 ? "👍" : "🔥"}</b> : <kbd>Space</kbd>}
    </div>
  );
}

// ---------------------------------------------------------------- ร้องเพลง: โน้ต 8 ตัว 100 BPM เข้าวงเป้า · กดตอนทับวง (≤ 150 ms ดี · ≤ 60 ms เป๊ะ)
export function RhythmTap({ beats = 8, bpm = 100, onDone }) {
  const t0 = useRef(performance.now() + 1500);
  const gap = 60000 / bpm;
  const [hit, setHit] = useState({});
  const [sent, setSent] = useState(false);
  const now = useRaf(!sent);
  const at = (i) => t0.current + i * gap;
  useEffect(() => {
    if (!sent && now > at(beats - 1) + 400) { setSent(true); onDone(Object.values(hit).reduce((a, b) => a + b, 0) / beats); }
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps
  const press = () => {
    if (sent) return;
    const t = performance.now();
    let best = -1, bd = 1e9;
    for (let i = 0; i < beats; i++) { const d = Math.abs(t - at(i)); if (d < bd && hit[i] == null) { bd = d; best = i; } }
    if (best < 0 || bd > 150) return;
    clickSound();
    setHit((h) => ({ ...h, [best]: bd <= 60 ? 1 : 0.6 }));
  };
  useSpace((k) => { if (k === "down") press(); }, !sent);
  return (
    <div className="cg cg-rhythm" onPointerDown={press}>
      <span className="cg-ic" aria-hidden="true">🎸</span>
      <div className="cg-lane">
        <i className="cg-target" />
        {Array.from({ length: beats }, (_, i) => {
          const x = 10 + ((at(i) - now) / (gap * 4)) * 90;
          if (x < -5 || x > 105) return null;
          return <b key={i} className="cg-note" data-hit={hit[i] != null ? "true" : "false"} style={{ left: `${x}%` }}>♪</b>;
        })}
      </div>
      <span className="cg-score">{Object.keys(hit).length}/{beats}</span>
      <kbd>Space</kbd>
    </div>
  );
}

// ---------------------------------------------------------------- ดูดาว: กลุ่มดาว 3 แบบจากเมล็ดเดียวกัน (ทุกเครื่องเห็นเหมือนกัน) · เป้า = แบบที่ answer
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shapes(seed) {
  const r = rng(seed);
  return [0, 1, 2].map(() => Array.from({ length: 5 }, () => [10 + r() * 80, 10 + r() * 80]));
}
function Constellation({ pts, size = 90, rot = 0, faint = false }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ transform: `rotate(${rot}deg)` }} aria-hidden="true">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={faint ? "rgba(200,220,255,.35)" : "rgba(200,220,255,.8)"} strokeWidth="1.5" strokeDasharray="3 3" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3.2} fill="#fff6c8" />)}
    </svg>
  );
}
export function StarPick({ seed = 1, answer = 0, onPick, picked = null }) {
  const list = shapes(seed);
  return (
    <div className="cg cg-stars">
      <div className="cg-sky-target"><Constellation pts={list[answer]} size={110} rot={(seed % 4) * 90} /></div>
      <div className="cg-opts">
        {list.map((pts, i) => (
          <button key={i} type="button" className="cg-opt" data-on={picked === i ? "true" : "false"} disabled={picked != null} onClick={() => { clickSound(); onPick(i); }}>
            <Constellation pts={pts} size={84} faint />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- เล่าเรื่องผี: ต้นเรื่อง (ไอคอนตามเมล็ด) แล้วโหวตตอนจบ 1 ใน 3
const OPEN = ["🌲", "🌕", "👣", "🚪", "📻", "🦉"];
const ENDS = [["👻", "ผีโบกรถ"], ["🧟", "ซอมบี้"], ["🕯️", "เทียนดับ"], ["🪞", "เงาในกระจก"], ["🎎", "ตุ๊กตา"], ["🐈‍⬛", "แมวดำ"]];
export function StoryVote({ seed = 1, onPick, picked = null, votes = 0, of = 0 }) {
  const r = rng(seed);
  const open = [0, 1, 2].map(() => OPEN[Math.floor(r() * OPEN.length)]);
  const pool = [...ENDS].sort(() => r() - 0.5).slice(0, 3);
  return (
    <div className="cg cg-story">
      <div className="cg-open">{open.map((e, i) => <span key={i}>{e}</span>)}<span>…</span></div>
      <div className="cg-opts">
        {pool.map(([ic, nm], i) => (
          <button key={i} type="button" className="cg-opt cg-end" data-on={picked === i ? "true" : "false"} disabled={picked != null} onClick={() => { clickSound(); onPick(i); }}>
            <span className="cg-end-ic">{ic}</span><b>{nm}</b>
          </button>
        ))}
      </div>
      <span className="cg-score">🗳️ {votes}/{of}</span>
    </div>
  );
}
