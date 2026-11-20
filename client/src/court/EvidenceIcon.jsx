// ไอคอนหลักฐานจาก atlas — ใช้ได้ทั้งฉากศาลและ HUD ในเกมหลัก: <EvidenceIcon idx={n} size={px} />
import { EVIDENCE_ATLAS } from "./evidenceData";

export function EvidenceIcon({ idx, size = 48, className = "", style }) {
  const { src, cols, rows, cell } = EVIDENCE_ATLAS, k = size / cell;
  return (
    <span className={`cevicon ${className}`} style={{
      display: "inline-block", width: size, height: size, flex: "none",
      backgroundImage: `url(${src})`, backgroundSize: `${cols * cell * k}px ${rows * cell * k}px`,
      backgroundPosition: `${-(idx % cols) * cell * k}px ${-Math.floor(idx / cols) * cell * k}px`, imageRendering: "pixelated", ...style,
    }} />
  );
}
