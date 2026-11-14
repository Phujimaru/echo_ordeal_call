// ============================================================
//  ฉากเข้าโหมด Road Trip ช่วงลูกโลก (MatchIntro โหมด roadtrip) — บนลูกโลกร่วมใบเดิมของหน้าเลือกโหมด (ไม่ตัดฉาก)
//   โลกหมุนหาหมุดส้ม Road Trip (หมุดเดียวกับ ModeVote · RT_GEO) → หมุดเรือง → ดิ่งชนผิวโลก → แฟลชส้ม-ขาว
//   → MatchIntro ส่งต่อ (handoff) ใต้แฟลช → จอขับ 3D + ฉากเปิดทริป (RtTransitions.jsx RtIntro) รับช่วงต่อจากแฟลชเดิม
//  u = เวลา / D ของช่วงนี้ · ชั้น DOM (เส้นความเร็ว + แฟลช) = RtDiveCine ใน RtTransitions.jsx ตามสัดส่วนเดียวกัน (RT_DIVE_T)
// ============================================================
import { dirFromLonLat } from "../globe/globeCore";
import { createDiveCamera, createMarker, aimAngles, setAim, nearYaw } from "../oc/intro/diveKit";
import { RT_GEO } from "./rtMeta";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const span = (u, a, b) => clamp01((u - a) / (b - a));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// สัดส่วนเวลา: หมุนโลกถึงหมุด (turn) → เริ่มดิ่ง (dive) → ชนผิวโลก = แฟลชทึบ (crash)
export const RT_DIVE_T = { turn: 0.36, dive: 0.42, crash: 0.9 };

export function createRtFlight(core, { lowQ = false, wrapEl = null, start = 0 } = {}) {
  const { THREE } = core;
  const dir = dirFromLonLat(RT_GEO.lon, RT_GEO.lat);
  const P = new THREE.Vector3();
  let diveCam = null, marker = null, yaw0 = null, pitch0 = 0;
  return {
    /** u = 0..1 ของช่วงลูกโลก */
    frame(u) {
      if (!diveCam) diveCam = createDiveCamera(core, { lowQ, wrapEl });
      if (!marker) marker = createMarker(core, dir, core.spin, { inner: 0xfff1e0, mid: 0xf08a4b, outer: 0xffc48a });
      const aim = aimAngles(core, dir);
      if (yaw0 == null) { yaw0 = core.world.rotation.y; pitch0 = core.world.rotation.x; }
      const ty = nearYaw(yaw0, aim.yaw);
      const k = easeInOut(span(u, 0, RT_DIVE_T.turn));
      setAim(core, yaw0 + (ty - yaw0) * k, pitch0 + (aim.pitch - pitch0) * k);
      P.copy(dir);
      core.spin.localToWorld(P);
      marker.update(span(u, RT_DIVE_T.turn - 0.12, RT_DIVE_T.turn), performance.now() - start, 1.3);
      const d = span(u, RT_DIVE_T.dive, RT_DIVE_T.crash);
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
