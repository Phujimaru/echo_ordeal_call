// ============================================================
//  ฉากเข้าโหมด Nautilus ช่วงลูกโลก (MatchIntro โหมด nautilus · ผู้ใช้สั่ง 2026-11-19) — บนลูกโลกร่วมใบเดิมของหน้าเลือกโหมด (ไม่ตัดฉาก)
//   โลกหมุนหาหมุดฟ้าน้ำทะเล Nautilus (หมุดเดียวกับ ModeVote · NAUTILUS_GEO กลางมหาสมุทร) → หมุดเรือง → ดิ่งลงผิวทะเล → แฟลชละอองน้ำ
//   → MatchIntro ส่งต่อใต้แฟลช → App เปิดฉากดำน้ำ (NautilusDive mode "start" เริ่มที่ผิวทะเล) รับช่วงต่อ
//  u = เวลา / D ของช่วงนี้ · ชั้น DOM (ป้าย/ขอบน้ำ/แฟลช) = NtGlobeCine.jsx ตามสัดส่วนเดียวกัน (NT_DIVE_T)
// ============================================================
import { dirFromLonLat } from "../globe/globeCore";
import { createDiveCamera, createMarker, aimAngles, setAim, nearYaw } from "../oc/intro/diveKit";
import { NAUTILUS_GEO } from "./nautilusMeta";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const span = (u, a, b) => clamp01((u - a) / (b - a));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// สัดส่วนเวลา: หมุนโลกถึงหมุด (turn) → เริ่มดิ่ง (dive) → แตะผิวทะเล = แฟลชทึบ (crash)
export const NT_DIVE_T = { turn: 0.38, dive: 0.44, crash: 0.9 };
export const NT_GLOBE_MS = 3600;

export function createNtFlight(core, { lowQ = false, wrapEl = null, start = 0 } = {}) {
  const { THREE } = core;
  const dir = dirFromLonLat(NAUTILUS_GEO.lon, NAUTILUS_GEO.lat);
  const P = new THREE.Vector3();
  let diveCam = null, marker = null, yaw0 = null, pitch0 = 0;
  return {
    /** u = 0..1 ของช่วงลูกโลก */
    frame(u) {
      if (!diveCam) diveCam = createDiveCamera(core, { lowQ, wrapEl });
      if (!marker) marker = createMarker(core, dir, core.spin, { inner: 0xe8fdff, mid: 0x1fb8c4, outer: 0x9be9f0 });
      const aim = aimAngles(core, dir);
      if (yaw0 == null) { yaw0 = core.world.rotation.y; pitch0 = core.world.rotation.x; }
      const ty = nearYaw(yaw0, aim.yaw);
      const k = easeInOut(span(u, 0, NT_DIVE_T.turn));
      setAim(core, yaw0 + (ty - yaw0) * k, pitch0 + (aim.pitch - pitch0) * k);
      P.copy(dir);
      core.spin.localToWorld(P);
      marker.update(span(u, NT_DIVE_T.turn - 0.12, NT_DIVE_T.turn), performance.now() - start, 1.3);
      const d = span(u, NT_DIVE_T.dive, NT_DIVE_T.crash);
      diveCam.frame(P, Math.pow(d, 2.4), d);
    },
    restore() {
      diveCam?.restore();
      diveCam = null;
    },
    dispose() {
      diveCam?.restore();
      diveCam = null;
      if (marker) core.spin.remove(marker.group);
      marker = null;
    },
  };
}
