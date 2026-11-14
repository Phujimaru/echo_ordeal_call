// Road Trip — ปุ่ม "?" คู่มือ (ตลอดทริป: จอขับ + กระดานจุดพัก/ต่อสู้ — Game.jsx GameBoard)
//  หน้าต่างคู่มือโหลดตอนกดครั้งแรก (React.lazy) — RtGuide ดึง props.js ของกระดาน ถ้า import ตรงจะสลับลำดับโหลดโมดูลกระดานจนพัง (MODS before initialization)
import { lazy, Suspense, useState } from "react";
import { clickSound } from "../audio";
import { tip } from "./rtTip";
import "./rtGuide.css";

const RtGuide = lazy(() => import("./RtGuide"));

export function RtGuideButton({ state }) {
  const [open, setOpen] = useState(false);
  const rt = state && state.roadtrip;
  if (!rt) return null;
  const n = (state.players || []).filter((p) => !p.summon && !p.duoOf).length;
  return (
    <>
      <button type="button" className="rtg-btn rt-ui" aria-label="คู่มือ" {...tip("คู่มือ")} onClick={() => { clickSound(); setOpen(true); }}>?</button>
      {open && <Suspense fallback={null}><RtGuide rt={rt} players={n} onClose={() => setOpen(false)} /></Suspense>}
    </>
  );
}
export default RtGuideButton;
