// ============================================================
//  หน้าดูฉากท่าไม้ตาย Echo "ก่อกำเนิดใหม่" (เฉพาะ dev) — http://localhost:5173/?rebirth=<ภูมิภาคปลายทาง 1..7>&from=<ภูมิภาคเดิม>
//  จำลอง server: พักเกม 18 วิ แล้ว waiting = false (เปลี่ยนภูมิภาค) · ดับเบิลคลิก = เล่นใหม่
//  window.__seek(วินาที) = ดูภาพนิ่ง ณ เวลานั้น · __seek(null) = เล่นต่อ
// ============================================================
import { useEffect, useState } from "react";
import EchoRebirth from "./EchoRebirth";
import { clampJourneyArea } from "../../journey/areas";

export default function EchoRebirthPreview() {
  const q = new URLSearchParams(location.search);
  const to = clampJourneyArea(q.get("rebirth") || 4);
  const from = clampJourneyArea(q.get("from") || (to === 1 ? 2 : 1));
  const [run, setRun] = useState(0);
  return <Run key={run} from={from} to={to} onReplay={() => setRun((r) => r + 1)} />;
}

function Run({ from, to, onReplay }) {
  const [waiting, setWaiting] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setWaiting(false), 18000);
    return () => clearTimeout(t);
  }, []);
  const area = waiting ? from : to;
  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: area === to ? "repeating-conic-gradient(#e4c88c 0 25%, #d8b878 0 50%) 0 0 / 64px 64px" : "repeating-conic-gradient(#8ac46c 0 25%, #7fb862 0 50%) 0 0 / 64px 64px",
      }}
      onDoubleClick={onReplay}
    >
      <EchoRebirth from={from} to={to} endsInMs={18000} waiting={waiting} onDone={() => {}} />
    </div>
  );
}
