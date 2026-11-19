// ============================================================
//  Nautilus — แผงอ่านสภาพอากาศ (ผู้ใช้สั่ง 2026-11-19: "แต่ละสภาพอากาศต้องกดอ่านได้นะ มุมซ้ายบน")
//  เปิดจากปุ่มชั้นบนแถบซ้ายบน (SelfHud HudTopBar · journey) · ข้อความอธิบาย = ผู้ใช้สั่งเอง (ข้อยกเว้นของกฎห้ามข้อความอธิบายใน UI)
//  ใช้หน้าตาเดียวกับแผงสถานการณ์ของ Eos (eos/eosSituation.css) · Esc / กดพื้นหลัง = ปิด
// ============================================================
import { useEffect } from "react";
import "../eos/eosSituation.css";

export const NT_WEATHER = {
  nt_storm: { icon: "🌀", name: "พายุใต้ทะเล", text: "ทุกจบเทิร์น ทุกคนถูกกระแสน้ำพัด 2 ช่องตามลูกศรบนพื้น (ตกหลุมน้ำเงิน/ถูกหอยมุกงับได้) · ตะกอนฟุ้ง มองเห็นแค่ระยะ 4 จากตัวเองและเพื่อน" },
  nt_sharks: { icon: "🦈", name: "ฝูงฉลามได้กลิ่นเลือด", text: "ฝูงฉลามวนหาคนที่เลือดน้อยที่สุดแล้วพุ่งกัดทุกเทิร์น · ดูช่องเตือนสีแดงแล้วหนี" },
  nt_silt: { icon: "🟤", name: "กระแสตะกอนถล่ม", text: "กำแพงตะกอนกวาดข้ามกระดานจากขอบ · โดนแล้วเสียพลังชีวิตและถูกผลัก · ทิ้งเนินตะกอนที่เดินช้า" },
  nt_eruption: { icon: "🌋", name: "ภูเขาไฟใต้ทะเลปะทุ", text: "หินร้อนตกลงตามช่องเตือน (ลุกไหม้) · ปล่องทุกปล่องพ่นพร้อมกัน" },
  nt_quake: { icon: "💥", name: "แผ่นดินไหวใต้ทะเล", text: "พื้นสั่น บางช่องแตกเป็นหลุม · หินหล่นตามช่องเตือน" },
  nt_maelstrom: { icon: "🌀", name: "น้ำวนยักษ์", text: "น้ำวนกลางกระดานดูดทุกคนเข้าหา 1 ช่องทุกเทิร์น · ยิ่งใกล้กลางยิ่งอันตราย" },
  nt_cold: { icon: "🥶", name: "กระแสน้ำเย็นจัด", text: "น้ำเย็นจัด เดินได้น้อยลง 1 ช่อง" },
  nt_dark: { icon: "🌑", name: "ความมืดบีบ", text: "ความมืดกินเข้ามาจากขอบกระดาน · ใครอยู่นอกแสงตอนจบเทิร์นโดนความเสียหาย" },
};

export default function NautilusWeather({ state, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const fd = state.fodlan || {};
  const w = fd.weather, info = w && NT_WEATHER[w.kind];
  return (
    <div className="eos-sit-back" onClick={onClose}>
      <div className="eos-sit" role="dialog" aria-label="สภาพอากาศ" onClick={(e) => e.stopPropagation()}>
        <header><b>{fd.name || "Nautilus"}</b><span>{Number.isFinite(fd.depth) ? `−${Math.abs(fd.depth).toLocaleString("en-US")} ม.` : ""}</span><button type="button" aria-label="ปิด" onClick={onClose}>✕</button></header>
        <ul>
          {info ? (
            <li data-tone="warn">
              <span className="ico">{info.icon}</span>
              <span className="txt"><b>{info.name} · อีก {w.left} เทิร์น</b><span className="det">{info.text}</span></span>
            </li>
          ) : (
            <li data-tone="ok"><span className="ico">🌊</span><span className="txt"><b>ทะเลสงบ</b></span></li>
          )}
        </ul>
      </div>
    </div>
  );
}
