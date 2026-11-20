// ไอคอนหลักฐานจาก atlas — ใช้ได้ทั้งฉากศาลและ HUD ในเกมหลัก: <EvidenceIcon idx={n} size={px} />
//  u = true → size เป็นหน่วย --u ของฉากศาล (ขยายตามจอ) แทน px
import { EVIDENCE_ATLAS } from "./evidenceData";

export function EvidenceIcon({ idx, size = 48, u = false, className = "", style }) {
  const { src, cols, rows, cell } = EVIDENCE_ATLAS, k = size / cell;
  const L = (n) => (u ? `calc(var(--u) * ${n})` : `${n}px`);
  const i = Math.max(0, idx | 0);
  return (
    <span className={`cevicon ${className}`} style={{
      display: "inline-block", width: L(size), height: L(size), flex: "none",
      backgroundImage: `url(${src})`, backgroundSize: `${L(cols * cell * k)} ${L(rows * cell * k)}`,
      backgroundPosition: `${L(-(i % cols) * cell * k)} ${L(-Math.floor(i / cols) * cell * k)}`, imageRendering: "pixelated", ...style,
    }} />
  );
}
