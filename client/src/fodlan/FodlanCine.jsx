// ============================================================
//  ชั้น DOM ของฉากเข้าโหมด Fodlan (ซ้อนบน canvas ของ fodlanFlight.js) — ทุกอย่างเป็น CSS animation
//  เวลาเป็นสัดส่วนของ --D ตาม FODLAN_T (fodlanFlight.js) · ข้อความมีแค่ชื่อ (กฎ UI)
//  <FodlanCine D={ms} stage={1..5} travel={false} />
//   travel = ฉากเปลี่ยนแผนที่กลางเกม (ไม่มีช่วงดิ่งโลก/ชื่อทวีป · จังหวะ FODLAN_TRAVEL_T)
// ============================================================
import { fodlanStage, FODLAN_TRAVEL_T } from "./stages";
import { FODLAN_T } from "./fodlanFlight";
import "./fodlan.css";

export default function FodlanCine({ D, stage, travel = false }) {
  const s = fodlanStage(stage);
  const T = travel ? FODLAN_TRAVEL_T : FODLAN_T;
  const ms = (k) => `${Math.round(k * D)}ms`;
  const style = {
    "--c": s.color, "--g": s.glow,
    "--bars-at": ms(travel ? 0 : T.crash),
    "--punch-at": ms((T.crash ?? 0) - 0.025), "--punch-dur": ms(0.1),
    "--mark-at": ms((T.reveal ?? 0) + 0.03), "--mark-dur": ms(0.25),
    "--sflash-at": ms(T.stage - 0.03), "--sflash-dur": ms(0.09),
    "--title-at": ms(T.title), "--title-dur": ms(0.962 - T.title),
    "--white-at": ms(0.955), "--white-dur": ms(0.045),
    "--ink-dur": ms(0.12),
  };
  return (
    <div className={`fdc${travel ? " is-travel" : ""}`} style={style} aria-hidden="true">
      <i className="fdc-bar top" />
      <i className="fdc-bar bot" />
      {!travel && <i className="fdc-punch" />}
      {!travel && (
        <div className="fdc-mark">
          <i className="fdc-rule" />
          <b className="oc-latin">FÓDLAN</b>
          <i className="fdc-rule" />
        </div>
      )}
      {travel && <i className="fdc-ink" />}
      <i className="fdc-stageflash" />
      <div className="fdc-title">
        <span className="fdc-num">{s.numeral}</span>
        <span className="fdc-line"><i /><b>{s.name}</b><i /></span>
        <span className="fdc-latin oc-latin">{s.latin}</span>
      </div>
      <i className="fdc-white" />
    </div>
  );
}
