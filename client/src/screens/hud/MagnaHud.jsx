// ============================================================
//  HUD ของแม็กน่า สวิง (characters/magna.js · GRID_PLAN §7.35)
//   MagnaHeat  แถบ OverHeat 0–8: ช่องไฟเอียง 8 ช่อง ไล่สีเหลือง→แดง · หมุดที่ 3 / 5 / 8 (ระยะตี 2 · ลุกไหม้ · ลดดาเมจ)
//   cool = เทิร์นนี้ยังไม่ตีจะลด 1 (ช่องบนสุดกะพริบฟ้า) · sealed = สกิลติดตัวถูกปิด (เทา)
//   ตำแหน่ง: เกาะมุมขวาบนของแผงตัวเรา (.hud-prof) — ไม่ทับช่องสกิล/มือไพ่ (ตามขนาดจอ/ซูม HUD)
//  จอคอม/แท็บเล็ตเท่านั้น · ไม่มีข้อความอธิบาย (ไอคอน + ตัวเลข)
// ============================================================
import { useEffect, useRef, useState } from "react";
import "./magnaHud.css";

const MAX = 8;
const MARKS = { 3: "range", 5: "burn", 8: "guard" };

function Mark({ kind }) {
  if (kind === "range") return <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 6h10M8 3l3 3-3 3M4 3L1 6l3 3" /></svg>;
  if (kind === "burn") return <svg viewBox="0 0 12 12" aria-hidden="true"><path className="fill" d="M6 .8c1 2.2 3.6 3.4 3.4 6.4C9.3 9.6 7.8 11.2 6 11.2S2.7 9.6 2.6 7.6c-.1-1.8 1-2.6 1.6-4 .4.9.8 1.4 1.4 1.8C5.8 3.9 5.6 2.4 6 .8Z" /></svg>;
  return <svg viewBox="0 0 12 12" aria-hidden="true"><path className="fill" d="M6 .9 10.6 2.6v3.2c0 2.6-1.9 4.5-4.6 5.3C3.3 10.3 1.4 8.4 1.4 5.8V2.6Z" /></svg>;
}

// มุมขวาบนของแผงตัวเรา → { left, top } (ไม่เจอแผง = null → ใช้ตำแหน่งสำรองใน CSS)
function useProfAnchor(ref) {
  const [at, setAt] = useState(null);
  useEffect(() => {
    let raf = 0, last = "";
    const tick = () => {
      const prof = document.querySelector(".hud-prof"), el = ref.current;
      if (prof && el) {
        const b = prof.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
        const next = b.width > 0 ? { left: Math.max(8, Math.round(b.right - w)), top: Math.round(b.top - h - 6) } : null;
        const key = next ? `${next.left}:${next.top}` : "";
        if (key !== last) { last = key; setAt(next); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref]);
  return at;
}

export function MagnaHeat({ magna, lowQ }) {
  const ref = useRef(null);
  const at = useProfAnchor(ref);
  if (!magna || magna.heat == null) return null;
  const heat = Math.max(0, Math.min(MAX, magna.heat));
  return (
    <div ref={ref} style={at ? { left: at.left, top: at.top, bottom: "auto", transform: "none" } : undefined} className={`mg-heat ${heat >= MAX ? "is-max" : ""} ${magna.cool ? "is-cool" : ""} ${magna.sealed ? "is-sealed" : ""}`} data-low={lowQ ? "true" : "false"}>
      <svg className="mg-ico" viewBox="0 0 20 28" aria-hidden="true">
        <path className="o" d="M10 1 C13 7 19 10 18 18 C17.4 23.5 14 27 10 27 C6 27 2.6 23.5 2 18 C1.6 13 5 11 6.5 6.5 C7.6 9 8.4 10.5 10 11.5 C10.5 8 9.6 4.5 10 1 Z" />
        <path className="i" d="M10 12 C12 15.5 14.6 17 14 20.8 C13.6 23.6 12 25.2 10 25.2 C8 25.2 6.4 23.6 6.1 21 C5.8 18.4 7.6 17.4 8.4 15 C9 16.4 9.6 16.8 10 17 C10.4 15.4 9.8 13.8 10 12 Z" />
      </svg>
      <div className="mg-cells">
        {Array.from({ length: MAX }, (_, i) => {
          const n = i + 1, on = n <= heat;
          return (
            <i key={n} className={`mg-cell ${on ? "on" : ""} ${on && n === heat ? "top" : ""} ${MARKS[n] ? "mark" : ""}`} style={{ "--k": i / (MAX - 1) }}>
              {MARKS[n] && <span className={`mg-mark ${on ? "on" : ""}`}><Mark kind={MARKS[n]} /></span>}
            </i>
          );
        })}
      </div>
      <b className="mg-num">{heat}<small>/{MAX}</small></b>
    </div>
  );
}
