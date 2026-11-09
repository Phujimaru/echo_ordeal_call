// ============================================================
//  ช่วงลูกโลกของฉากเข้าสนาม Eos (MatchIntro โหมด eos) — บนลูกโลกร่วมใบเดิม · พรีวิว dev: ?eos
//   โลกหมุนหาหมุด Eos (ฟ้าคริสตัล — หมุดเดียวกับหน้าเลือกโหมด ModeVote) → หมุดเรือง → ดิ่งชนผิวโลก
//   ชน (EOS_T.crash) = แฟลชฟ้า → EosCine (canvas) ทะลุเมฆลงมาบินเลียบขอบฟ้าต่อ
//  u = เวลา / D ของทั้งฉาก · เสียงดิ่ง/ทะลุเมฆใช้ไฟล์ฉาก Fodlan เดิม (/fodlan/sfx/cine_*.mp3)
// ============================================================
import { dirFromLonLat } from "../globe/globeCore";
import { createDiveCamera, createMarker, aimAngles, setAim, nearYaw } from "../oc/intro/diveKit";
import { fodlanAudio } from "../fodlan/fodlanAudio";
import { EOS_GEO, EOS_T } from "./eosMeta";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const span = (u, a, b) => clamp01((u - a) / (b - a));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createEosFlight(core, { lowQ = false, wrapEl = null, start = 0 } = {}) {
  const { THREE } = core;
  const audio = fodlanAudio();
  try { audio.preload(["cine_dive", "cine_clouds"]); } catch { /* ไม่มีเสียง */ }
  const dir = dirFromLonLat(EOS_GEO.lon, EOS_GEO.lat);
  const P = new THREE.Vector3();
  let diveCam = null, marker = null, yaw0 = null, pitch0 = 0, lastU = 0, done = false;
  const cues = [
    [EOS_T.turn - 0.02, () => audio.sfx("cine_dive")],
    [EOS_T.crash - 0.01, () => audio.sfx("cine_clouds")],
  ];

  const restore = () => {
    diveCam?.restore();
    diveCam = null;
    const wrap = typeof wrapEl === "function" ? wrapEl() : wrapEl;
    if (wrap) { wrap.style.transform = ""; wrap.style.filter = ""; }
  };

  return {
    /** u = 0..1 ของทั้งฉาก (หลังชนแล้วไม่ทำอะไร — EosCine บังจอทึบ) */
    frame(u) {
      for (const [cu, fn] of cues) if (lastU < cu && u >= cu) { try { fn(); } catch { /* เสียงห้ามทำฉากพัง */ } }
      lastU = u;
      if (u >= EOS_T.crash) {
        if (!done) { done = true; restore(); }
        return;
      }
      if (!diveCam) diveCam = createDiveCamera(core, { lowQ, wrapEl });
      if (!marker) marker = createMarker(core, dir, core.spin, { inner: 0xe6f7ff, mid: 0x5fb8ff, outer: 0x9fe2ff });
      const aim = aimAngles(core, dir);
      if (yaw0 == null) { yaw0 = core.world.rotation.y; pitch0 = core.world.rotation.x; }
      const ty = nearYaw(yaw0, aim.yaw);
      const k = easeInOut(span(u, 0, EOS_T.turn));
      setAim(core, yaw0 + (ty - yaw0) * k, pitch0 + (aim.pitch - pitch0) * k);
      P.copy(dir);
      core.spin.localToWorld(P);
      // หมุดเรือง (ขยายวงแสงก่อนดิ่ง)
      marker.update(span(u, EOS_T.turn - 0.06, EOS_T.turn), performance.now() - start, 1.35);
      const d = span(u, EOS_T.dive, EOS_T.crash);
      diveCam.frame(P, Math.pow(d, 2.4), d);
    },
    restore,
    dispose() {
      restore();
      if (marker) core.spin.remove(marker.group);
      marker = null;
    },
  };
}
