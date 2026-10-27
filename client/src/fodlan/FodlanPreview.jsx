// ============================================================
//  หน้าดูฉาก Fodlan (เฉพาะ dev)
//   ?fodlan            = ฉากเปิดแมตช์ ดิ่งลงหมุด Fodlan → แผนที่ทวีป → ด่าน I
//   ?fodlan=3&wx=1     = เข้าด่าน III แบบมีสภาพอากาศ (ใช้ดูฉากด่านอื่น — เกมจริงด่านแรกคือ I เสมอ)
//   ?fodlan=travel&from=1&to=4&wx=1 = ฉากเปลี่ยนแผนที่กลางเกม
//   &d=20000 = ยืดฉาก (มิลลิวินาที) · &lowq=1 = โหมดประหยัด · ดับเบิลคลิก = เล่นใหม่
//  window.__fdStats = เวลาต่อเฟรมของรอบล่าสุด (ใช้ตรวจความลื่น)
// ============================================================
import { useEffect, useState } from "react";
import MatchIntro from "../oc/intro/MatchIntro";
import FodlanTravel from "./FodlanTravel";
import { FODLAN_INTRO_MS, FODLAN_TRAVEL_MS } from "./stages";
import { fodlanAudio } from "./fodlanAudio";

const Q = new URLSearchParams(location.search);
const TRAVEL = Q.get("fodlan") === "travel";
const STAGE = TRAVEL ? 1 : Math.max(1, Math.min(5, Number(Q.get("fodlan")) || 1));
const WX = Q.get("wx") === "1";
const LOWQ = Q.get("lowq") === "1";
const D = Number(Q.get("d")) || (TRAVEL ? FODLAN_TRAVEL_MS : FODLAN_INTRO_MS);

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
];

function useFrameStats(run) {
  useEffect(() => {
    const st = { t0: performance.now(), frames: [] };
    window.__fdStats = st;
    let raf = 0, last = performance.now();
    const loop = (now) => { st.frames.push([Math.round(now - st.t0), +(now - last).toFixed(1)]); last = now; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [run]);
}

export default function FodlanPreview() {
  if (Q.get("fodlan") === "bench") return <Bench />;
  return <Scene />;
}

// ?fodlan=bench&stage=1..5&wx=1&lowq=1 — วัดเวลาวาดต่อเฟรม (fodlanBench.js) · ผลอยู่ที่ window.__fdBench
function Bench() {
  const [res, setRes] = useState(null);
  useEffect(() => {
    import("./fodlanBench").then(({ runFodlanBench }) => runFodlanBench({ stage: Number(Q.get("stage")) || 1, weather: WX, lowQ: LOWQ }))
      .then((r) => { window.__fdBench = r; setRes(r); })
      .catch((e) => { window.__fdBench = { error: String(e) }; setRes({ error: String(e) }); });
  }, []);
  return <pre style={{ position: "fixed", right: 8, bottom: 8, color: "#fff", font: "12px monospace", zIndex: 9 }}>{res ? JSON.stringify(res, null, 1) : "…"}</pre>;
}

function Scene() {
  const [run, setRun] = useState(0);
  useFrameStats(run);
  const again = () => { fodlanAudio().stop(0.4); setRun((r) => r + 1); };
  return (
    // พื้นหลังขาวแบบเกมจริง (ลูกโลกร่วมอยู่บน .oc-screen สีขาว — theme.css) · ฉากเปลี่ยนแผนที่มีพื้นทึบของตัวเอง
    <div style={{ position: "fixed", inset: 0, background: "radial-gradient(120% 90% at 50% 42%, #fff 0%, var(--oc-snow) 46%, #e2ecf7 100%)" }} onDoubleClick={again}>
      {TRAVEL ? (
        <FodlanTravel key={run} from={Number(Q.get("from")) || 1} to={Number(Q.get("to")) || 2} weather={WX} durationMs={D} lowQ={LOWQ} onDone={() => {}} />
      ) : (
        <MatchIntro
          key={run}
          players={PLAYERS}
          area={1}
          lowQ={LOWQ}
          fodlan={{ stage: STAGE, weather: WX }}
          onOutro={() => ({ fodlan: true, stage: STAGE, weather: WX, durationMs: D })}
          onHandoff={() => {}}
          onDone={() => {}}
        />
      )}
    </div>
  );
}
