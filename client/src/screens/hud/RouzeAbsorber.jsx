// เคนซากิ คาซุมะ — Rouze Absorber (ที่ข้อมือ) (GRID_PLAN §7.19.1)
//  ภาพตัดจากคลิปอ้างอิง (kazuma_absorber_*.webp) · screen: "empty" = ช่องกลางว่าง · "queen" = เสียบ ♠Q แล้ว · "king" = หน้าจอโพทองบนพื้นน้ำเงิน
//  RouzeAbsorber = ตัวเครื่อง · EvolutionScene = ฉากเข้าร่าง King: เสียบ ♠Q ช่องกลาง → รูด ♠K ช่องข้าง → หน้าจอทอง → แฟลช → ส่ง useSkill (คลิปต่อทันที)
//  ลากการ์ดเองหรือคลิกให้การ์ดวิ่งเข้าที่ · Esc / คลิกขวา = ยกเลิกก่อนรูด ♠K · ไม่มีข้อความอธิบาย (กฎผู้ใช้)
import { useEffect, useRef, useState } from "react";
import { playSfx, startLoopSfx, stopLoopSfx } from "../../audio";
import "./rouzeAbsorber.css";

const CARD = (k) => `/characters/kensaki_kazuma/cards/kazuma_card_${k}.webp`;
const STEP_FLASH_MS = 1750, STEP_EMIT_MS = 2350, ABSORB_MS = 1150; // ABSORB_MS = ความยาวเสียง Absorb Queen ก่อนเข้าเสียงสแตนด์บาย

// ภาพตัวเครื่องตัดจากคลิปอ้างอิงของผู้ใช้ (พื้นโปร่งใส) — ตรงตามต้นฉบับทุกสถานะ
const DEVICE = (k) => `/characters/kensaki_kazuma/kazuma_absorber_${k}.webp`;
export function RouzeAbsorber({ screen = "empty", glow = false, className = "" }) {
  return <img className={`rz-device ${className}`} src={DEVICE(screen)} data-glow={glow ? "true" : "false"} alt="" draggable={false} />;
}

// การ์ดลากได้: ลากถึงเป้า = รับ · คลิก = รับ · ปล่อยนอกเป้า = กลับที่
function DragCard({ k, side, active, used, targetRef, onAccept }) {
  const [drag, setDrag] = useState(null);
  const start = useRef(null);
  const onDown = (e) => {
    if (!active) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0 });
  };
  const onMove = (e) => { if (start.current) setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y }); };
  const onUp = (e) => {
    if (!start.current) return;
    const moved = Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y);
    start.current = null;
    setDrag(null);
    const r = targetRef.current && targetRef.current.getBoundingClientRect();
    const inside = r && e.clientX >= r.left - 30 && e.clientX <= r.right + 30 && e.clientY >= r.top - 30 && e.clientY <= r.bottom + 30;
    if (moved < 8 || inside) onAccept();
  };
  return (
    <button
      type="button"
      className="rz-card"
      data-side={side}
      data-active={active ? "true" : "false"}
      data-used={used ? "true" : "false"}
      style={drag ? { transform: `translate(${drag.x}px, ${drag.y}px) scale(1.04)`, transition: "none", zIndex: 5 } : undefined}
      disabled={!active}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      <img src={CARD(k)} alt="" draggable={false} />
    </button>
  );
}

export function EvolutionScene({ onDone, onClose }) {
  const [step, setStep] = useState(0); // 0 รอ ♠Q · 1 รอ ♠K · 2 รูด ♠K → หน้าจอทอง · 3 แฟลช
  const center = useRef(null), side = useRef(null);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });
  useEffect(() => {
    if (step >= 2) return undefined;
    const close = (e) => { if (e.type === "contextmenu") e.preventDefault(); if (e.type !== "keydown" || e.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    window.addEventListener("contextmenu", close);
    return () => { window.removeEventListener("keydown", close); window.removeEventListener("contextmenu", close); };
  }, [step, onClose]);
  useEffect(() => {
    if (step === 2) { const a = setTimeout(() => setStep(3), STEP_FLASH_MS); return () => clearTimeout(a); }
    if (step === 3) { const b = setTimeout(() => done.current(), STEP_EMIT_MS - STEP_FLASH_MS); return () => clearTimeout(b); }
    return undefined;
  }, [step]);
  // หลังเสียบ ♠Q เครื่องส่งเสียงสแตนด์บายวนรอรูด ♠K (ปุ่ม LOOP ของ soundboard)
  useEffect(() => {
    if (step !== 1) return undefined;
    const t = setTimeout(() => startLoopSfx("kazuma_king_loop"), ABSORB_MS);
    return () => { clearTimeout(t); stopLoopSfx(); };
  }, [step]);
  const queen = () => { playSfx("kazuma_king_absorb"); setStep(1); };
  const king = () => { stopLoopSfx(); playSfx("kazuma_card_evolution"); setStep(2); };
  return (
    <div className="rz-scene" data-step={step}>
      <div className="rz-stage">
        <DragCard k="queen" side="left" active={step === 0} used={step > 0} targetRef={center} onAccept={queen} />
        <div className="rz-device-wrap">
          {step === 2 && <img className="rz-swipe" src={CARD("king")} alt="" draggable={false} />}
          <RouzeAbsorber screen={step >= 2 ? "king" : step === 1 ? "queen" : "empty"} glow={step >= 2} />
          <span ref={center} className="rz-target-center" aria-hidden="true" />
          <span ref={side} className="rz-target-side" aria-hidden="true" />
        </div>
        <DragCard k="king" side="right" active={step === 1} used={step > 1} targetRef={side} onAccept={king} />
      </div>
      <div className="rz-flash" aria-hidden="true" />
    </div>
  );
}
