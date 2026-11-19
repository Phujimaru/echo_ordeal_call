// ============================================================
//  ชั้น DOM ของฉากลูกโลก Nautilus (MatchIntro โหมด nautilus · ntFlight.js) — ป้ายชื่อโหมด · ขอบจอน้ำทะเลตอนดิ่ง · แฟลชละอองน้ำทึบตอนแตะผิวทะเล
//  เสียง: ลมพุ่งตอนเริ่มดิ่ง · น้ำกระจายตอนแตะผิวทะเล (/nautilus/sfx — ไม่มีวีดีโอในฉากนี้)
// ============================================================
import { useEffect } from "react";
import { NT_DIVE_T } from "./ntFlight";
import { playSfx, registerSounds } from "../audio";
import "./ntGlobe.css";

let SND = false;
export default function NtGlobeCine({ D }) {
  useEffect(() => {
    if (!SND) { SND = true; registerSounds({ ntg_rush: "/nautilus/sfx/rush.mp3", ntg_splash: "/nautilus/sfx/splash.mp3", ntg_bubbles: "/nautilus/sfx/bubbles.mp3" }); }
    const ts = [
      setTimeout(() => playSfx("ntg_rush", { gain: 0.7 }), NT_DIVE_T.dive * D),
      setTimeout(() => { playSfx("ntg_splash", { gain: 0.9 }); playSfx("ntg_bubbles", { gain: 0.6 }); }, (NT_DIVE_T.crash - 0.04) * D),
    ];
    return () => ts.forEach(clearTimeout);
  }, [D]);
  const ms = (k) => `${Math.round(k * D)}ms`;
  return (
    <div className="ntg-dive" aria-hidden="true" style={{ "--lock": ms(NT_DIVE_T.turn - 0.04), "--dive": ms(NT_DIVE_T.dive), "--crash": ms(NT_DIVE_T.crash - 0.05), "--crash-dur": ms(0.08) }}>
      <div className="ntg-dive-tag"><i /><b>NAUTILUS</b><i /></div>
      <i className="ntg-dive-rush" />
      <i className="ntg-dive-flash" />
    </div>
  );
}
