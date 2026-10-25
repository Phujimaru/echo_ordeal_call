// เคนซากิ คาซุมะ — ช่องสกิลรองเฉพาะตัว (Blay Rouzer) + แผงเลือกการ์ด — จอคอม/แท็บเล็ต (GRID_PLAN §7.19)
//  me.kazuma = { blade, hand: [{ k, n }], cards (รายใบตามลำดับที่ใส่), maxCards, combo, picksLeft (ช่องว่างในกอง — รวมไม่เกิน 3 ใบ), maxTypes, armed, metal } · การ์ด 9 ใบ = skill.choices จาก server
//  (choices: { key, name, img, cost, count, locked, desc }) · ชี้ค้าง = คำอธิบายการ์ด (c.desc — กฎผู้ใช้ 2026-10-19) · ไม่มีข้อความอื่น
//  กดการ์ด = ใช้แต้มทันที (socket useSkill tier "secondary" form) · แผงไม่ปิดเอง เลือกต่อได้จนกองเต็ม 3 ใบ · Esc / คลิกนอก / คลิกขวา = ปิด
import { useEffect, useRef, useState } from "react";
import { clickSound } from "../../audio";
import "./bladeRouzer.css";

const COMBO_NAME = { blast: "Lightning Blast", slash: "Lightning Slash", sonic: "Lightning Sonic" };
const PICKS = 3;
// ช่องการ์ดในกอง: 1 ช่อง = 1 ใบตามลำดับที่ใส่ · ใบซ้ำวางเรียงข้างกัน ไม่ซ้อน (ผู้ใช้สั่ง 2026-10-25)
function stackSlots(k) {
  const cards = Array.isArray(k.cards) ? k.cards : (k.hand || []).flatMap((c) => Array.from({ length: c.n }, () => c.k));
  return Array.from({ length: k.maxCards || PICKS }, (_, i) => cards[i] || null);
}

function Pips({ left, max = PICKS }) {
  return (
    <span className="kz-pips" aria-label={`${left}/${max}`}>
      {Array.from({ length: max }, (_, i) => <span key={i} data-on={i < left ? "true" : "false"} />)}
    </span>
  );
}

// ช่องสกิลรองบนแผงล่าง: ถาดการ์ดของ Blay Rouzer — การ์ดในกองเรียงพัดรายใบ (สูงสุด 3 ใบ) · ช่องว่างที่เหลือ · ครบสูตร = เรืองทอง
export function BladeRouzerSlot({ kazuma, skill, disabled, onOpen }) {
  const k = kazuma || {};
  const slots = stackSlots(k);
  const imgOf = (key) => (skill?.choices || []).find((c) => c.key === key)?.img;
  const usable = !disabled;
  return (
    <button
      type="button"
      className="hud-skill kz-slot"
      data-tier="secondary"
      data-state={usable ? "ready" : "off"}
      data-combo={k.combo || undefined}
      data-blade={k.blade ? "true" : "false"}
      disabled={!usable}
      onClick={() => usable && onOpen()}
    >
      <span className="kz-tray">
        <span className="kz-tray-spade" aria-hidden="true">♠</span>
        <span className="kz-fan">
          {slots.map((c, i) => (
            <span key={i} className="kz-fan-card" data-i={i} data-empty={c ? "false" : "true"}>
              {c ? <img src={imgOf(c)} alt="" draggable={false} /> : <span className="kz-fan-blank">♠</span>}
            </span>
          ))}
        </span>
        {k.blade && <Pips left={k.picksLeft ?? PICKS} />}
      </span>
      <span className="hud-skill-label">
        <span className="hud-skill-tier">รอง</span>
        <span className="hud-skill-name">{k.combo ? COMBO_NAME[k.combo] : skill?.name || "Blay Rouzer"}</span>
      </span>
      {skill && <span className="hud-skill-cost">{skill.choices?.[0]?.cost ?? skill.cost} แต้ม</span>}
    </button>
  );
}

// แผงเลือกการ์ด: ถาด 3 ช่องด้านบน (กองปัจจุบัน + ชื่อท่าที่ผสมได้) · การ์ด 9 ใบเรียงเป็นพัดด้านล่าง
export function BladeRouzerPanel({ kazuma, choices = [], points = 0, isOk = () => true, onPick, onClose }) {
  const k = kazuma || {};
  const slots = stackSlots(k);
  const [hover, setHover] = useState(null);
  const [swipe, setSwipe] = useState(null); // { key, seq } — การ์ดที่เพิ่งรูด (เล่นภาพรูดผ่าน)
  const seq = useRef(0);
  const tip = choices.find((c) => c.key === hover && c.desc);
  const imgOf = (key) => choices.find((c) => c.key === key)?.img;
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    const onCtx = (e) => { e.preventDefault(); onClose(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("contextmenu", onCtx);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("contextmenu", onCtx); };
  }, [onClose]);
  useEffect(() => {
    if (!swipe) return undefined;
    const t = setTimeout(() => setSwipe((s) => (s && s.seq === swipe.seq ? null : s)), 700);
    return () => clearTimeout(t);
  }, [swipe]);
  const mid = (choices.length - 1) / 2;
  return (
    <div className="kz-panel" onClick={() => { clickSound(); onClose(); }}>
      <div className="kz-panel-in" onClick={(e) => e.stopPropagation()}>
        <div className="kz-head">
          <span className="kz-title">Blay Rouzer</span>
          <Pips left={k.picksLeft ?? PICKS} />
          <span className="kz-sp">◆{points}</span>
        </div>
        <div className="kz-rouzer" data-combo={k.combo || undefined}>
          {slots.map((c, i) => (
            <div key={i} className="kz-slotcard" data-empty={c ? "false" : "true"}>
              {c ? <img src={imgOf(c)} alt="" draggable={false} /> : <span className="kz-slotcard-blank">♠</span>}
            </div>
          ))}
          <div className="kz-combo" data-on={k.combo ? "true" : "false"}>{k.combo ? COMBO_NAME[k.combo] : ""}</div>
        </div>
        <div className="kz-deck">
          {choices.map((c, i) => {
            const ok = isOk(c);
            const d = i - mid;
            const swiping = swipe && swipe.key === c.key;
            return (
              <div
                key={c.key}
                className="kz-deck-slot"
                style={{ "--rot": `${d * 4.2}deg`, "--lift": `${Math.abs(d) * Math.abs(d) * 3.2}px`, zIndex: hover === c.key ? 30 : 10 - Math.abs(Math.round(d)) }}
                onMouseEnter={() => setHover(c.key)}
                onMouseLeave={() => setHover((h) => (h === c.key ? null : h))}
              >
                <button
                  type="button"
                  className="kz-card"
                  data-ok={ok ? "true" : "false"}
                  data-swipe={swiping ? "true" : "false"}
                  key={swiping ? `s${swipe.seq}` : "idle"}
                  disabled={!ok}
                  onClick={() => {
                    if (!ok) return;
                    seq.current += 1;
                    setSwipe({ key: c.key, seq: seq.current });
                    onPick(c);
                  }}
                >
                  <img src={c.img} alt={c.name} draggable={false} />
                  {(c.count || 0) > 0 && <span className="kz-count">×{c.count}</span>}
                  <span className="kz-cost">◆{c.cost}</span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="kz-tip" data-on={tip ? "true" : "false"} aria-live="polite">{tip ? tip.desc : ""}</div>
      </div>
    </div>
  );
}
