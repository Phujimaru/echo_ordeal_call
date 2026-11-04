// ============================================================
//  หน้าดูฉากท่าไม้ตาย Mahapralaya (เฉพาะ dev) — http://localhost:5173/?arjuna=<จำนวนคนที่โดน 0..6>
//  ดับเบิลคลิก = เล่นใหม่ · window.__seek(วินาที) = ภาพนิ่ง ณ เวลานั้น · __seek(null) = เล่นต่อ
// ============================================================
import { useEffect, useRef, useState } from "react";
import ArjunaUlt from "./ArjunaUlt";

const SAMPLE = [
  ["muimi", "/characters/muimi/muimi.webp", "#e0525a"],
  ["giorno", "/characters/giorno_giovanna/giorno.webp", "#f0b93a"],
  ["fern", "/characters/fern/fern.webp", "#5aa7e8"],
  ["law", "/characters/trafalgar_law/law.webp", "#62c47a"],
  ["gray", "/characters/gray/gray.webp", "#a070e0"],
  ["ryougi", "/characters/ryougi/ryougi.webp", "#e87ac0"],
];

export default function ArjunaUltPreview() {
  const n = Math.max(0, Math.min(6, Number(new URLSearchParams(location.search).get("arjuna") || 3)));
  const targets = SAMPLE.slice(0, n).map(([id, img, color], i) => ({ id, img, color, dmg: [6, 4, 5, 3, 6, 2][i] }));
  const [seq, setSeq] = useState(1);
  const seekRef = useRef(null);
  useEffect(() => { window.__seek = (s) => { seekRef.current = s; }; }, []);
  return (
    <div style={{ position: "fixed", inset: 0, background: "repeating-conic-gradient(#2b3a52 0 25%, #24324a 0 50%) 0 0 / 64px 64px" }} onDoubleClick={() => setSeq((s) => s + 1)}>
      <ArjunaUlt key={seq} run={{ seq, targets }} seekRef={seekRef} onDone={() => {}} />
    </div>
  );
}
