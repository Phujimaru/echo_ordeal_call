// ============================================================
//  ฉากเข้าสนาม Eos (MatchIntro โหมด eos) — บนลูกโลกร่วมใบเดิม · พรีวิว dev: ?eos
//   A โลกหมุนหาหมุด Eos (ฟ้าคริสตัล — หมุดเดียวกับหน้าเลือกโหมด ModeVote) → หมุดเรือง → ดิ่งชนผิวโลก
//   B แฟลช → ฉาก 3 มิติดินแดน Lucis (eosTheatre.js — สร้างตั้งแต่เริ่มฉาก ระหว่างโลกหมุน) จนจบ → แฟลชขาวส่งต่อกระดาน
//  ชั้น DOM (แถบภาพยนตร์ · ชื่อ EOS · ชื่อโซนเกิด · แฟลช) = EosCine.jsx ตามเวลาเดียวกัน (EOS_T)
//  u = เวลา / D ของทั้งฉาก · เสียงฉากใช้ไฟล์ฉาก Fodlan เดิม (/fodlan/sfx/cine_*.mp3)
// ============================================================
import { dirFromLonLat } from "../globe/globeCore";
import { createDiveCamera, createMarker, aimAngles, setAim, nearYaw } from "../oc/intro/diveKit";
import { fodlanAudio } from "../fodlan/fodlanAudio";
import { EOS_GEO, EOS_T } from "./eosMeta";
import { createEosTheatre } from "./eosTheatre";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const span = (u, a, b) => clamp01((u - a) / (b - a));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createEosFlight(core, { lowQ = false, wrapEl = null, start = 0, night = false } = {}) {
  const { THREE } = core;
  const audio = fodlanAudio();
  try { audio.preload(["cine_dive", "cine_clouds", "cine_reveal", "cine_swoop", "cine_map", "cine_stage"]); } catch { /* ไม่มีเสียง */ }
  const theatre = createEosTheatre(core, { night, lowQ });
  if (import.meta.env.DEV) { window.__eosTheatre = theatre; theatre.ready.catch((err) => console.error("[eos] สร้างฉากเปิดไม่ได้:", err)); } // dev: ตรวจสถานะฉาก
  const dir = dirFromLonLat(EOS_GEO.lon, EOS_GEO.lat);
  const P = new THREE.Vector3();
  let diveCam = null, marker = null, yaw0 = null, pitch0 = 0, lastU = 0, entered = false;
  const cues = [
    [EOS_T.turn - 0.02, () => audio.sfx("cine_dive")],
    [EOS_T.crash - 0.01, () => audio.sfx("cine_clouds")],
    [EOS_T.reveal, () => audio.sfx("cine_reveal")],
    [EOS_T.glide, () => audio.sfx("cine_swoop", { gain: 0.8 })],
    [EOS_T.pillars, () => audio.sfx("cine_map", { gain: 0.85 })],
    [EOS_T.title - 0.02, () => audio.sfx("cine_stage", { gain: 0.8 })],
  ];
  const k3d = (u) => span(u, EOS_T.crash, 1); // u ทั้งฉาก → 0..1 ของช่วงฉาก 3 มิติ

  const restoreDive = () => {
    diveCam?.restore();
    diveCam = null;
    const wrap = typeof wrapEl === "function" ? wrapEl() : wrapEl;
    if (wrap) { wrap.style.transform = ""; wrap.style.filter = ""; }
  };

  return {
    theatre,
    /** u = 0..1 ของทั้งฉาก · t = วินาทีนาฬิกาฉาก */
    frame(u, t = performance.now() / 1000) {
      for (const [cu, fn] of cues) if (lastU < cu && u >= cu) { try { fn(); } catch { /* เสียงห้ามทำฉากพัง */ } }
      lastU = u;
      if (u < EOS_T.crash) {
        // ---------- A: หมุนโลก → ดิ่ง ----------
        if (!diveCam) diveCam = createDiveCamera(core, { lowQ, wrapEl });
        if (!marker) marker = createMarker(core, dir, core.spin, { inner: 0xe6f7ff, mid: 0x5fb8ff, outer: 0x9fe2ff });
        const aim = aimAngles(core, dir);
        if (yaw0 == null) { yaw0 = core.world.rotation.y; pitch0 = core.world.rotation.x; }
        const ty = nearYaw(yaw0, aim.yaw);
        const k = easeInOut(span(u, 0, EOS_T.turn));
        setAim(core, yaw0 + (ty - yaw0) * k, pitch0 + (aim.pitch - pitch0) * k);
        P.copy(dir);
        core.spin.localToWorld(P);
        marker.update(span(u, EOS_T.turn - 0.06, EOS_T.turn), performance.now() - start, 1.35);
        const d = span(u, EOS_T.dive, EOS_T.crash);
        diveCam.frame(P, Math.pow(d, 2.4), d);
        return;
      }
      // ---------- B: ฉาก 3 มิติ (สลับใต้แฟลช · ยังสร้างไม่เสร็จ = ค้างใต้แฟลช) ----------
      if (!entered) {
        if (!theatre.built) return;
        entered = true;
        restoreDive();
        if (marker) { core.spin.remove(marker.group); marker = null; }
        theatre.enter();
      }
      theatre.frame(k3d(u), t);
    },
    restore() { restoreDive(); theatre.restore(); },
    dispose() {
      restoreDive();
      theatre.dispose();
      if (marker) core.spin.remove(marker.group);
      marker = null;
    },
  };
}
