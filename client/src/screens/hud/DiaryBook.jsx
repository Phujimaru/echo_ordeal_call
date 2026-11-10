// เจ้าหญิง Echo — ไดอารี่ความทรงจำ: สมุดเปิดเลือกตัวละครที่จะได้สกิล (ผู้ใช้สั่ง 2026-11-10 — "สมุดสวยๆ ที่เปิดแล้วเห็นตัวละครให้เลือก")
//  choices = skill.choices จาก server (characters/echo.js bookChoices): [{ key, name, img, desc, locked }]
//  หน้าละ 6 ตัว (สองหน้า = 12) · ลูกศร/คีย์ ← → พลิกหน้า (หน้าขวาพลิกรอบสันแบบ 3 มิติ) · ชี้ค้าง = รายชื่อสกิลของตัวนั้น (c.desc — กฎผู้ใช้ 2026-10-19)
//  กดตัวละคร = เลือก (การเลือก = การยืนยัน) · Esc / คลิกนอกเล่ม / คลิกขวา = ปิด · ในสมุดไม่มีข้อความอธิบาย มีแค่ชื่อและเลขหน้า
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clickSound } from "../../audio";
import "./diaryBook.css";

const PER_PAGE = 6;
const FLIP_MS = 620;
const OPEN_MS = 900;  // เล่มปิดลอยขึ้น → ปกหมุนเปิดรอบสัน
const CLOSE_MS = 700; // ปกพับปิด → เล่มย่อลงกลับกลางจอ

function Card({ c, ok, onPick, onHover }) {
  return (
    <button
      type="button"
      className={`db-card${ok ? "" : " is-off"}`}
      disabled={!ok}
      onClick={() => onPick(c)}
      onMouseEnter={() => onHover(c.key)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(c.key)}
      onBlur={() => onHover(null)}
    >
      <span className="db-frame">
        <img src={c.img} alt="" draggable={false} onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
        {!ok && <span className="db-lock" aria-hidden="true">🔒</span>}
      </span>
      <span className="db-name">{c.name}</span>
    </button>
  );
}

function Page({ side, items, num, isOk, onPick, onHover }) {
  return (
    <div className={`db-page db-${side}`}>
      <div className="db-page-inner">
        <Ornament />
        <div className="db-grid">
          {items.map((c) => <Card key={c.key} c={c} ok={isOk(c)} onPick={onPick} onHover={onHover} />)}
        </div>
        {num > 0 && <span className="db-num">{num}</span>}
      </div>
    </div>
  );
}

// ปกหน้า (ม่วงลายทอง พระจันทร์เสี้ยว + ดาว — ตามปกสมุดในภาพของ Echo) · ด้านในปก = ม่วงเข้มขอบทอง
function FrontCover() {
  return (
    <div className="db-fcover" aria-hidden="true">
      <div className="db-fcover-face db-fcover-out">
        <svg viewBox="0 0 200 260" className="db-fcover-art">
          <rect x="10" y="10" width="180" height="240" rx="8" fill="none" stroke="#e3c27a" strokeWidth="2.2" />
          <rect x="18" y="18" width="164" height="224" rx="6" fill="none" stroke="#e3c27a" strokeWidth="1" opacity=".7" />
          <circle cx="100" cy="130" r="58" fill="none" stroke="#e3c27a" strokeWidth="1.4" opacity=".8" />
          <circle cx="100" cy="130" r="48" fill="none" stroke="#e3c27a" strokeWidth=".8" opacity=".6" />
          <path d="M112 92 A40 40 0 1 0 112 168 A32 32 0 1 1 112 92 Z" fill="#f2d48c" />
          <path d="M128 112 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" fill="#fff3d2" />
          <path d="M100 30 l2.4 6.6 6.6 2.4 -6.6 2.4 -2.4 6.6 -2.4 -6.6 -6.6 -2.4 6.6 -2.4 Z" fill="#e3c27a" />
          <path d="M100 212 l2.4 6.6 6.6 2.4 -6.6 2.4 -2.4 6.6 -2.4 -6.6 -6.6 -2.4 6.6 -2.4 Z" fill="#e3c27a" />
          {[[30, 30], [170, 30], [30, 230], [170, 230]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3" fill="#e3c27a" />)}
        </svg>
      </div>
      <div className="db-fcover-face db-fcover-in" />
    </div>
  );
}

// ลายดาวมุมหน้า + เส้นกรอบลาเวนเดอร์ (ตามหน้ากระดาษในภาพหนังสือของ Echo)
function Ornament() {
  const corner = (cls) => (
    <svg className={`db-corner ${cls}`} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M4 20 Q4 4 20 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 4.5 L10.2 8.3 L14 9.5 L10.2 10.7 L9 14.5 L7.8 10.7 L4 9.5 L7.8 8.3 Z" fill="currentColor" />
      <circle cx="17" cy="15" r="1.3" fill="currentColor" />
      <circle cx="13" cy="19" r="0.9" fill="currentColor" />
    </svg>
  );
  return (
    <>
      <span className="db-border" aria-hidden="true" />
      {corner("tl")}{corner("tr")}{corner("bl")}{corner("br")}
    </>
  );
}

// สมุดกลาง HUD (แทนช่องสกิลพื้นฐาน — ผู้ใช้สั่ง 2026-11-10 "เอาแบบอยู่กลางจอ เป็นเล่ม") · แบบเดียวกับแกนดาบคิงโอเจอร์
//  สมุดตั้งลอยเหนือแผงล่าง หายใจขึ้นลงช้าๆ · ชี้ = ยกขึ้น แสงทองรั่วจากขอบกระดาษ · กด = เปิดสมุด (DiaryBook)
//  ใช้ไม่ได้ (ไม่ใช่ตาเรา/ติดคูลดาวน์) = สีเทา · คูลดาวน์ = ⏳n บนปก · มีแค่ชื่อสกิลกับแต้ม
export function DiaryCenter({ skill, disabled, cooldown = 0, onOpen }) {
  const usable = !disabled;
  return (
    <div className="db-center">
      <button
        type="button"
        className="db-center-book"
        data-state={usable ? "ready" : "off"}
        disabled={!usable}
        onClick={() => usable && onOpen()}
        aria-label={skill?.name}
      >
        <span className="db-center-glow" aria-hidden="true" />
        <img src={skill?.img} alt="" draggable={false} />
        <span className="db-slot-motes" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
        {cooldown > 0 && <span className="db-slot-cd">⏳{cooldown}</span>}
      </button>
      <span className="db-center-label">
        <b>{skill?.name}</b>
        <span>{skill?.cost || 0} แต้ม</span>
      </span>
    </div>
  );
}

export default function DiaryBook({ choices = [], isOk = () => true, onPick, onClose }) {
  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < choices.length; i += PER_PAGE) out.push(choices.slice(i, i + PER_PAGE));
    if (out.length % 2) out.push([]);
    return out.length ? out : [[], []];
  }, [choices]);
  const spreads = pages.length / 2;
  const [spread, setSpread] = useState(0);
  const [flip, setFlip] = useState(null); // { dir: 1 | -1, to }
  const [hover, setHover] = useState(null);
  const tip = choices.find((c) => c.key === hover);
  // อนิเมชันเปิด/ปิดเล่ม: opening → open → closing (เล่นจบแล้วค่อยปิดจริง / ค่อยส่งตัวที่เลือก)
  const [phase, setPhase] = useState("opening");
  useEffect(() => { const t = setTimeout(() => setPhase((p) => (p === "opening" ? "open" : p)), OPEN_MS); return () => clearTimeout(t); }, []);
  const closingRef = useRef(false);
  const shut = useCallback((after) => {
    if (closingRef.current) return;
    closingRef.current = true;
    setPhase("closing");
    setTimeout(after, CLOSE_MS);
  }, []);
  const close = useCallback(() => shut(onClose), [shut, onClose]);

  const turn = useCallback((dir) => {
    if (flip || phase !== "open") return;
    const to = spread + dir;
    if (to < 0 || to >= spreads) return;
    clickSound();
    setHover(null);
    setFlip({ dir, to });
    setTimeout(() => { setSpread(to); setFlip(null); }, FLIP_MS);
  }, [flip, spread, spreads, phase]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") turn(1);
      else if (e.key === "ArrowLeft") turn(-1);
    };
    const onCtx = (e) => { e.preventDefault(); close(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("contextmenu", onCtx);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("contextmenu", onCtx); };
  }, [close, turn]);

  // เลือกแล้ว = ปิดเล่มก่อน แล้วค่อยใช้สกิล (ภาพปิดสวยกว่าตัดหาย)
  const pick = (c) => { if (!isOk(c) || phase !== "open") return; clickSound(); shut(() => onPick(c)); };
  const pg = (i) => pages[i] || [];
  const props = { isOk, onPick: pick, onHover: setHover };
  // ระหว่างพลิก: ไปข้างหน้า = หน้าซ้ายยังเป็นของเดิม หน้าขวาข้างใต้เป็นของใหม่ · ใบที่พลิก = หน้า (ขวาเดิม) / หลัง (ซ้ายใหม่)
  //  ย้อนกลับ = กลับด้าน (ใบพลิกจากซ้ายไปขวา)
  const L = flip ? (flip.dir > 0 ? spread * 2 : flip.to * 2) : spread * 2;
  const R = flip ? (flip.dir > 0 ? flip.to * 2 + 1 : spread * 2 + 1) : spread * 2 + 1;

  return (
    <div className={`db-overlay is-${phase}`} onClick={() => { clickSound(); close(); }}>
      <div className="db-stage" onClick={(e) => e.stopPropagation()}>
        <div className={`db-book is-${phase}`}>
          <div className="db-cover" aria-hidden="true" />
          <div className="db-block" aria-hidden="true" />
          <Page side="left" items={pg(L)} num={L + 1} {...props} />
          <Page side="right" items={pg(R)} num={R + 1} {...props} />
          <div className="db-spine" aria-hidden="true" />
          {flip && (
            <div className={`db-leaf ${flip.dir > 0 ? "go-next" : "go-prev"}`} style={{ animationDuration: `${FLIP_MS}ms` }}>
              <div className="db-leaf-face db-front">
                <Page side={flip.dir > 0 ? "right" : "left"} items={pg(flip.dir > 0 ? spread * 2 + 1 : spread * 2)} num={0} {...props} />
              </div>
              <div className="db-leaf-face db-back">
                <Page side={flip.dir > 0 ? "left" : "right"} items={pg(flip.dir > 0 ? flip.to * 2 : flip.to * 2 + 1)} num={0} {...props} />
              </div>
            </div>
          )}
          <button type="button" className="db-turn db-prev" disabled={spread === 0 || !!flip} onClick={() => turn(-1)} aria-label="ก่อนหน้า">‹</button>
          <button type="button" className="db-turn db-next" disabled={spread >= spreads - 1 || !!flip} onClick={() => turn(1)} aria-label="ถัดไป">›</button>
          <span className="db-ribbon" aria-hidden="true" />
          {phase !== "open" && <FrontCover />}
        </div>
        <div className={`db-tip${tip ? " is-on" : ""}`} aria-live="polite">
          {tip ? <><b>{tip.name}</b><span>{tip.desc}</span></> : null}
        </div>
      </div>
    </div>
  );
}
