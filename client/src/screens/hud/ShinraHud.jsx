// ============================================================
//  HUD ของคุซาคาเบะ ชินระ (characters/kusakabe_shinra.js · GRID_PLAN §7.32)
//   ShinraEmber  แถบเปลวเพลง: เปลวไฟทีละดวง (สูงสุด 5 · อุ่นเครื่องพอแล้ว 8 — ดวงที่ 6–8 โทนแดงดำ)
//  จอคอม/แท็บเล็ตเท่านั้น · ไม่มีข้อความอธิบาย (ไอคอน + ตัวเลข)
// ============================================================
import "./shinraHud.css";

function Flame({ on, blaze, i }) {
  return (
    <i className={`sh-flame ${on ? "on" : ""} ${blaze ? "blaze" : ""}`} style={{ "--d": `${(i * 137) % 900}ms` }}>
      <svg viewBox="0 0 20 28" aria-hidden="true">
        <path className="sh-outer" d="M10 1 C13 7 19 10 18 18 C17.4 23.5 14 27 10 27 C6 27 2.6 23.5 2 18 C1.6 13 5 11 6.5 6.5 C7.6 9 8.4 10.5 10 11.5 C10.5 8 9.6 4.5 10 1 Z" />
        <path className="sh-inner" d="M10 12 C12 15.5 14.6 17 14 20.8 C13.6 23.6 12 25.2 10 25.2 C8 25.2 6.4 23.6 6.1 21 C5.8 18.4 7.6 17.4 8.4 15 C9 16.4 9.6 16.8 10 17 C10.4 15.4 9.8 13.8 10 12 Z" />
      </svg>
    </i>
  );
}

export function ShinraEmber({ shinra, lowQ }) {
  if (!shinra || shinra.ember == null) return null;
  const max = Math.max(5, shinra.max || 5);
  return (
    <div className={`sh-ember ${shinra.warm ? "is-warm" : ""} ${shinra.smolder ? "is-smolder" : ""}`} data-low={lowQ ? "true" : "false"}>
      <div className="sh-flames">
        {Array.from({ length: max }, (_, i) => <Flame key={i} i={i} on={i < shinra.ember} blaze={i >= 5} />)}
      </div>
      <b className="sh-num">{shinra.ember}/{max}</b>
    </div>
  );
}
