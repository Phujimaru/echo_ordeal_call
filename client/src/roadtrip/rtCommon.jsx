// Road Trip — ชิ้นส่วนร่วมของแผง: วงนับถอยหลัง · จุดผู้เล่น · ปุ่มลัดตัวเลข
import { useEffect, useRef, useState } from "react";
import { serverNow } from "./rtSocket";

// นาฬิกาเดินทุก ms (ไม่ re-render ทั้งเกม — เฉพาะแผงที่ใช้)
export function useNow(ms = 250) {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

// ความยาวเต็มของช่วง (จำค่าแรกที่เห็นต่อ endsAt) — server ไม่ส่งเวลาเริ่ม
function useSpan(endsAt, now) {
  const ref = useRef({ endsAt: null, span: 1 });
  if (ref.current.endsAt !== endsAt) ref.current = { endsAt, span: Math.max(1, (endsAt || now) - now) };
  return ref.current.span;
}

export function CountRing({ endsAt, low = 5, size = 52 }) {
  const now = useNow(250);
  const span = useSpan(endsAt, now);
  if (!endsAt) return null;
  const left = Math.max(0, endsAt - now);
  const secs = Math.ceil(left / 1000);
  const r = size / 2 - 4, c = 2 * Math.PI * r;
  const mm = secs >= 60 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` : String(secs);
  return (
    <span className="rt-ring" data-low={secs <= low ? "true" : "false"} style={{ width: size, height: size }} role="timer" aria-label={String(secs)}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="bg" cx={size / 2} cy={size / 2} r={r} />
        <circle className="fg" cx={size / 2} cy={size / 2} r={r} strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, left / span))} />
      </svg>
      <b className="rt-num" style={secs >= 60 ? { fontSize: 14 } : undefined}>{mm}</b>
    </span>
  );
}

// แถบเวลาบาง (การ์ดเหตุการณ์)
export function TimeBar({ endsAt }) {
  const now = useNow(250);
  const span = useSpan(endsAt, now);
  if (!endsAt) return null;
  return <div className="rt-event-time" aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(1, (endsAt - now) / span)) * 100}%` }} /></div>;
}

export function Dots({ players }) {
  return <span className="rt-dots">{players.map((p) => <i key={p.id} style={{ background: p.color || "#999" }} title={p.name} />)}</span>;
}

// ปุ่มลัด 1–9 (ตำแหน่งปุ่ม e.code — แป้นไทยก็ใช้ได้) · ไม่ทำงานตอนพิมพ์ในช่องข้อความ / มีหน้าต่างอื่นบัง (aria-modal)
export function useDigitKeys(count, onPick, enabled = true) {
  const cb = useRef(onPick);
  cb.current = onPick;
  useEffect(() => {
    if (!enabled || !count) return undefined;
    const onKey = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || "");
      if (!m) return;
      const i = Number(m[1]) - 1;
      if (i >= count) return;
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (document.querySelector("[aria-modal='true']")) return;
      e.preventDefault();
      cb.current(i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, enabled]);
}

export const playerById = (players) => Object.fromEntries((players || []).map((p) => [p.id, p]));
