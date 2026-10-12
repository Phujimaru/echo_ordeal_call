// หน้าดูฉากเปลี่ยนภูมิภาค RegionTravel (เฉพาะ dev ไม่ต่อ socket): ?travel=3-5 (จากภูมิภาค 3 ไป 5)
//  พารามิเตอร์: d=ms (ความยาวฉาก · ค่าเริ่ม 8400 เท่าเกมจริง — ตั้งยาวไว้ดูช้าๆ/แคปจอ) · route=1-4-3 (เส้นทางที่ผ่านมา จบที่ต้นทาง)
//  low=1 (โหมดเครื่องสเปกต่ำ) · จบฉากแล้วเล่นซ้ำเอง
import { useState } from "react";
import RegionTravel from "./RegionTravel";

export default function TravelPreview() {
  const q = new URLSearchParams(location.search);
  const [from, to] = (q.get("travel") || "1-4").split("-").map(Number);
  const route = q.get("route") ? q.get("route").split("-").map(Number) : [from];
  const d = Number(q.get("d")) || 8400;
  const [seq, setSeq] = useState(0);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#c9d6c0" }}>
      <RegionTravel
        key={seq}
        from={from}
        to={to}
        route={route}
        durationMs={d}
        lowQ={q.get("low") === "1"}
        onDone={() => setTimeout(() => setSeq((s) => s + 1), 1200)}
      />
    </div>
  );
}
