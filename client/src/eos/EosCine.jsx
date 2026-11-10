// ============================================================
//  ชั้น DOM ของฉากเข้าสนาม Eos (ซ้อนบนฉาก 3 มิติของ eosFlight.js / eosTheatre.js) — CSS animation ล้วน
//  ผู้ใช้สั่ง 2026-11-10 "เปลี่ยนฉากเปิดใหม่ทั้งหมด สวยเหมือนฉากเปิดอื่นๆ" — แบบเดียวกับ FodlanCine
//   แถบภาพยนตร์ · แฟลชฟ้าตอนชนโลก · ชื่อ EOS (ทองคริสตัล) · ป้ายชื่อโซนที่เราเกิด · แฟลชขาวส่งต่อกระดาน
//  <EosCine D={ms ทั้งฉาก} self={{x,y}} /> · เวลาเป็นสัดส่วนของ D ตาม EOS_T · ข้อความมีแค่ชื่อ (กฎ UI)
// ============================================================
import { EOS_T, EOS_ZONE_INFO } from "./eosMeta";
import { eosZoneAt } from "./eosAudio";
import "./eosCine.css";

export default function EosCine({ D, self = null }) {
  const zone = self && Number.isFinite(self.x) ? eosZoneAt(self.x, self.y) : "wild";
  const z = EOS_ZONE_INFO[zone] || EOS_ZONE_INFO.wild;
  const ms = (k) => `${Math.round(k * D)}ms`;
  const style = {
    "--c": z.c, "--g": z.g,
    "--bars-at": ms(EOS_T.crash),
    "--punch-at": ms(EOS_T.crash - 0.025), "--punch-dur": ms(0.11),
    "--mark-at": ms(EOS_T.reveal), "--mark-dur": ms(0.2),
    "--title-at": ms(EOS_T.title), "--title-dur": ms(0.962 - EOS_T.title),
    "--white-at": ms(0.955), "--white-dur": ms(0.045),
  };
  return (
    <div className="eoc" style={style} aria-hidden="true">
      <i className="eoc-bar top" />
      <i className="eoc-bar bot" />
      <i className="eoc-punch" />
      <i className="eoc-vig" />
      <div className="eoc-mark">
        <i className="eoc-rule" />
        <b className="oc-latin">EOS</b>
        <i className="eoc-rule" />
      </div>
      <div className="eoc-title">
        <span className="eoc-crys" />
        <span className="eoc-line"><i /><b>{z.name}</b><i /></span>
        <span className="eoc-latin oc-latin">{z.latin}</span>
      </div>
      <i className="eoc-white" />
    </div>
  );
}
