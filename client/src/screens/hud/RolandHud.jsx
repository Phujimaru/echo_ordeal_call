// ============================================================
//  HUD ของโรลันด์ Black Silence (characters/roland.js · GRID_PLAN §7.25)
//   RolandEgo  แถบ EGO Page: Emotion เป็นเพชร 5 เม็ด + หน้า EGO 5 แบบ — แบบที่เลือกแล้วสว่างเรืองเขียว ×จำนวนซ้อน
//              Fervent Beats แสดงเทิร์นที่เหลือก่อนตาย · คูลดาวน์รวมเป็นนาฬิกาทราย
//  จอคอม/แท็บเล็ตเท่านั้น · ไม่มีข้อความอธิบาย (ชื่อ + ตัวเลข + ไอคอน)
// ============================================================
import "./rolandHud.css";

function Page({ e, i }) {
  const on = e.n > 0;
  return (
    <div className={`rl-page ${on ? "on" : ""} ${e.k === "fervent" && on ? "fervent" : ""}`} style={{ "--d": `${i * 70}ms` }} title={e.name}>
      <img src={e.img} alt={e.name} draggable={false} />
      <i className="rl-shine" />
      {e.n > 1 && <b className="rl-stack">×{e.n}</b>}
      {e.turns > 0 && <b className="rl-turns">{e.turns}</b>}
    </div>
  );
}

export function RolandEgo({ roland, lowQ }) {
  if (!roland || !Array.isArray(roland.egos)) return null;
  const emo = roland.emotion || 0, max = roland.emotionMax || 5;
  return (
    <div className="rl-ego" data-low={lowQ ? "true" : "false"}>
      <div className="rl-emo">
        {Array.from({ length: max }, (_, i) => <i key={i} className={`rl-gem ${i < emo ? "on" : ""}`} />)}
      </div>
      <span className="rl-sep" />
      <div className="rl-pages">
        {roland.egos.map((e, i) => <Page key={e.k} e={e} i={i} />)}
      </div>
      {roland.egoCd > 0 && <b className="rl-cd">⏳{roland.egoCd}</b>}
    </div>
  );
}
