// ============================================================
//  หน้าดูฉาก "บินจากโลกไปดวงจันทร์" (เฉพาะ dev) — เปิดด้วย  ?moon  ต่อท้าย URL (http://localhost:5173/?moon)
//  ฉากเข้าด่านของโหมด Moon Cell (Raid Boss — GRID_PLAN §8.4)
//  ใช้งาน: MatchIntro ถาม onOutro() ตอนช่วงเปิดตัวผู้เล่นจบ → คืน { moon: true, durationMs: MOON_MS }
//   แล้ว server ต้องพักเกมให้นานพอ (ช่วงเปิดตัวผู้เล่น + ~6 วิ) — ดู moonFlight.js
//  หน้านี้ใช้ลูกโลกของ MatchIntro เอง (เกมจริงใช้ลูกโลกร่วมที่วาดใต้ฉาก — ห้ามทาสีทึบที่ .ocd-bg)
// ============================================================
import { useState } from "react";
import MatchIntro from "./MatchIntro";
import { MOON_MS } from "./moonFlight";
import { COLONY_MS } from "./colonyFlight";
import { NT_GLOBE_MS } from "../../nautilus/ntFlight";
import NautilusDive from "../../nautilus/NautilusDive";

// ?colony = ฉากเข้าด่าน Colony แทนดวงจันทร์
const COLONY = new URLSearchParams(location.search).has("colony");
// ?ntglobe = ฉากลูกโลกของ Nautilus → ต่อฉากดำน้ำ (NautilusDive mode start) ใต้แฟลช เหมือนเกมจริง
const NTG = new URLSearchParams(location.search).has("ntglobe");
// ?colony=30000 = ยืดฉากให้ช้าลง (มิลลิวินาที) ไว้ดูทีละช่วง
const COLONY_D = Number(new URLSearchParams(location.search).get("colony")) || COLONY_MS;

const mk = (id, name, color, ch, chName, img, position) => ({
  id, name, color, position, connected: true, alive: true, img,
  character: { id: ch, img, name: chName },
});
const MUIMI = "/characters/muimi/muimi.webp";
const OBERON = "/characters/oberon(summer)/oberon_summer.webp";
const PLAYERS = [
  mk("p1", "คุณ", "#3d8bd9", "muimi", "มุยมิ", MUIMI, 1),
  mk("p2", "Rin", "#d2455b", "oberon_summer", "โอเบรอน (ฤดูร้อน)", OBERON, 2),
  mk("p3", "Kaze", "#2f9e8f", "muimi", "มุยมิ", MUIMI, 3),
  mk("p4", "Nox", "#6a5acd", "oberon_summer", "โอเบรอน (ฤดูร้อน)", OBERON, 4),
];

export default function MoonFlightPreview() {
  const [run, setRun] = useState(0);
  const [nt, setNt] = useState(0);
  const [gone, setGone] = useState(false); // ฉากลูกโลกจบ = ถอด MatchIntro (เหมือน App)
  return (
    <div style={{ position: "fixed", inset: 0 }} onDoubleClick={() => setRun((r) => r + 1)} title="ดับเบิลคลิกเพื่อเล่นใหม่">
      {!(NTG && nt === run + 1 && gone) && <MatchIntro
        key={run}
        players={PLAYERS}
        area={1}
        onOutro={() => {
          if (NTG) { setTimeout(() => setNt(run + 1), NT_GLOBE_MS - 220); return { nautilus: true, durationMs: NT_GLOBE_MS }; }
          return COLONY ? { colony: true, durationMs: COLONY_D } : { moon: true, durationMs: MOON_MS };
        }}
        onHandoff={() => {}}
        onDone={() => { if (!NTG) setRun((r) => r + 1); else setGone(true); }}
      />}
      {NTG && nt === run + 1 && <NautilusDive key={nt} mode="start" from={7} to={7} durationMs={9400} onDone={() => { setNt(0); setGone(false); setRun((r) => r + 1); }} />}
    </div>
  );
}
