// ============================================================
//  อาร์มสตรอง — หน้าต่างกดรัว (state.armQte · characters/armstrong.js qteView)
//   guard = ผู้โจมตีกดรัว 5 วิ (ยืนวัดกันบลูกผู้ชาย) · ult = อาร์มสตรองกดรัว 10 วิ (ไปคุยกับรากมะม่วง)
//   ซ้อนบนคลิป (คัตซีน z 150) · Space (e.code — คีย์บอร์ดไทยก็ได้) หรือคลิก · คนอื่นเห็นแค่เวลา
//  จอคอม/แท็บเล็ตเท่านั้น · ไม่มีข้อความอธิบาย (ชื่อ ตัวเลข ไอคอน)
// ============================================================
import { useEffect, useRef, useState } from "react";
import "./armstrongMash.css";

export default function ArmstrongMash({ qte, players, myIds, onMash }) {
  const [taps, setTaps] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const seqRef = useRef(0);
  const [end, setEnd] = useState(0);
  const [pop, setPop] = useState(0);
  const mine = !!qte && myIds.includes(qte.by);

  // หน้าต่างใหม่: นับใหม่ · เส้นตาย = เวลาที่รับ state + ms ที่เหลือ (ไม่เทียบนาฬิกา server ตรงๆ)
  useEffect(() => {
    if (!qte || qte.seq === seqRef.current) return;
    seqRef.current = qte.seq;
    setEnd(Date.now() + (qte.left || 0));
    setTaps(0);
  }, [qte]);
  useEffect(() => {
    if (!qte) return undefined;
    const id = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(id);
  }, [qte]);
  const open = !!qte && now < end;

  useEffect(() => {
    if (!mine || !open) return undefined;
    const hit = () => { setTaps((n) => n + 1); setPop((n) => n + 1); onMash(); };
    const onKey = (e) => {
      if (e.repeat || !(e.code === "Space" || e.key === " ")) return;
      e.preventDefault();
      hit();
    };
    const onDown = (e) => { if (e.button === 0) { e.preventDefault(); hit(); } };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [mine, open, onMash]);

  if (!qte) return null;
  const by = players.find((p) => p.id === qte.by);
  const left = Math.max(0, Math.min(1, (end - now) / (qte.ms || 1)));
  const dmg = Math.min(qte.cap, Math.floor(taps / (qte.per || 10)));
  return (
    <div className={`arm-mash ${qte.kind} ${mine ? "me" : ""} ${open ? "" : "done"}`}>
      <div className="arm-mash-who">
        {by && <img src={by.character?.cover || by.img} alt="" draggable={false} />}
        <span>{by?.name || ""}</span>
      </div>
      {mine && (
        <div className="arm-mash-core">
          <div className="arm-mash-ring" key={pop}>
            <span className="arm-mash-taps">{taps}</span>
          </div>
          <div className="arm-mash-dmg">+{dmg}<small>/{qte.cap}</small></div>
          <div className="arm-mash-keys"><kbd>␣</kbd><span>🖱️</span></div>
        </div>
      )}
      <div className="arm-mash-bar"><i style={{ transform: `scaleX(${left})` }} /></div>
    </div>
  );
}
