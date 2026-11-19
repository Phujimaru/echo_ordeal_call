// ============================================================
//  Nautilus — แถบพลังชีวิตทาลัสซา (ผู้ใช้แจ้ง 2026-11-19: "มันไม่แสดงพลังชีวิตของปลา")
//  กลางจอด้านบน เฉพาะตอนปลาวาฬอยู่บนกระดาน (state.fodlan.board.whale · server/fodlan/thalassa.js publicInfo)
//  ชื่อ + หลอด + ตัวเลขเท่านั้น (กฎห้ามข้อความอธิบาย) · โดนตี = หลอดขาวค้างแล้วไหลตาม + กะพริบ
// ============================================================
import { useEffect, useRef, useState } from "react";
import "./ntWhaleBar.css";

export default function NtWhaleBar({ whale, zoom = 1 }) {
  const hp = whale ? Math.max(0, whale.hp) : 0, max = whale ? Math.max(1, whale.hpMax || 1) : 1;
  const [lag, setLag] = useState(hp);
  const [hit, setHit] = useState(0);
  const prev = useRef(hp);
  useEffect(() => {
    if (hp < prev.current) {
      setHit((h) => h + 1);
      const t = setTimeout(() => setLag(hp), 650);
      prev.current = hp;
      return () => clearTimeout(t);
    }
    prev.current = hp; setLag(hp);
    return undefined;
  }, [hp]);
  if (!whale || !whale.on || whale.dead) return null;
  const pct = (v) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  return (
    <div className="nt-whalebar" style={{ "--k": zoom }} data-low={hp / max <= 0.3 ? "1" : undefined}>
      <div className="nt-whalebar-head"><b>ทาลัสซา</b><span>{hp}<i>/{max}</i></span></div>
      <div className="nt-whalebar-track">
        <span className="nt-whalebar-lag" style={{ width: pct(Math.max(lag, hp)) }} />
        <span className="nt-whalebar-fill" style={{ width: pct(hp) }} />
        {hit > 0 && <b key={hit} className="nt-whalebar-flash" />}
        {Array.from({ length: Math.max(0, Math.floor(max / 10) - 1) }, (_, i) => <i key={i} style={{ left: pct((i + 1) * 10) }} />)}
      </div>
    </div>
  );
}
