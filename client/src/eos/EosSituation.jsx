// ============================================================
//  แผง "สถานการณ์ตอนนี้" ของสนาม Eos — เปิดจากปุ่มบนแถบซ้ายบน (ข้างตัวนับเทิร์น — SelfHud HudTopBar · journey.eos)
//  การ์ดต่อเรื่อง: ไอคอน · หัวเรื่อง · รายละเอียด · "ต้องทำ" · กดการ์ดที่มีตำแหน่ง = กล้องไปดู (window event "eos:look" → BoardStage)
//  ข้อมูล: eosSituation(state) (eos/eosSituation.js) · Esc / กดพื้นหลัง = ปิด
// ============================================================
import { useEffect } from "react";
import { eosSituation } from "./eosSitData";
import "./eosSituation.css";

export default function EosSituation({ state, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const list = eosSituation(state);
  const look = (at) => { if (!at) return; window.dispatchEvent(new CustomEvent("eos:look", { detail: at })); onClose(); };
  return (
    <div className="eos-sit-back" onClick={onClose}>
      <div className="eos-sit" role="dialog" aria-label="สถานการณ์" onClick={(e) => e.stopPropagation()}>
        <header><b>สถานการณ์</b><span>รอบที่ {state.roundNumber}</span><button type="button" aria-label="ปิด" onClick={onClose}>✕</button></header>
        <ul>
          {list.map((s) => (
            <li key={s.key} data-tone={s.tone} data-go={s.at ? "true" : undefined} onClick={() => look(s.at)}>
              <span className="ico">{s.icon}</span>
              <span className="txt">
                <b>{s.title}</b>
                {s.detail && <span className="det">{s.detail}</span>}
                {s.todo && <span className="todo">➜ {s.todo}</span>}
              </span>
              {s.at && <span className="go" aria-hidden="true">◎</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
