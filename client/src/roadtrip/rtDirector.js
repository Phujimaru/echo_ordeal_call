// ============================================================
//  Road Trip — ผู้กำกับฉากขับ 3D ระหว่างฉากเปลี่ยน (RtTransitions.jsx สั่ง · RoadDrive.jsx ส่งเข้า road3d update ทุกเฟรม)
//   slowTo(k, ms)  = รถชะลอ (0 = ตามความเร็วจริงจาก server · 1 = จอดสนิท) — ภาพอย่างเดียว ระยะทางจริงนับที่ server
//   shot(name, ms) = มุมกล้องตามบท ทับกล้องปกติ (ผสมกับท่าของกล้องปกติด้วยน้ำหนัก w → จบบทกล้องปกติรับต่อเนียน)
//     intro   : รถตู้แล่นเข้าหากล้องเตี้ยด้านหน้า → กล้องโค้งเลียบข้างรถ → ไปจบท่ากล้องไล่หลัง
//     pullover: ยกกล้องเฉียงหน้า-ข้างตอนรถชะลอเข้าจุดพัก
//     swoop   : กล้องโฉบขึ้นไปมุมเฉียงจากบนแบบกระดานต่อสู้ (TILT 32° ฝั่ง +z = มุมกล้องของ road3d createRoadUnderlay)
//     swing   : เหวี่ยงจากหลังรถอ้อมไปมุมกระดาน (ถูกไล่ล่าบนรถตู้)
//     pullout : กล้องเตี้ยข้างรถตอนรถออกตัวจากจุดพัก/สนามสู้ → คืนกล้องปกติ
//  ฉากขับซ่อน (จุดพัก/ต่อสู้) = ไม่มีการอัปเดต → บทกล้องค้างได้ ไม่มีผล
// ============================================================
import * as THREE from "three";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const span = (u, a, b) => clamp01((u - a) / Math.max(1e-6, b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const TILT = 32 * Math.PI / 180;

const S = { shot: null, slow: { from: 0, to: 0, t0: 0, ms: 1 }, scene: null, rear: null };

export function attachScene(scene) { S.scene = scene; }
export function detachScene(scene) { if (S.scene === scene) S.scene = null; }
export function sceneNow() { return S.scene; }

function slowAt(now) {
  const s = S.slow;
  return s.from + (s.to - s.from) * easeInOut(span(now - s.t0, 0, s.ms));
}
/** รถชะลอสู่ค่า to (0..1) ในเวลา ms · now = performance.now() */
export function slowTo(to, ms = 1000, from = null) {
  const now = performance.now();
  S.slow = { from: from == null ? slowAt(now) : from, to: clamp01(to), t0: now, ms: Math.max(1, ms) };
}
export function shot(name, ms, opts = {}) { S.shot = { name, t0: performance.now(), ms: Math.max(1, ms), ...opts }; }
export function clearShot(name = null) { if (!name || (S.shot && S.shot.name === name)) S.shot = null; }
export function reset() { S.shot = null; S.slow = { from: 0, to: 0, t0: 0, ms: 1 }; S.rear = null; }
/** ประตูท้ายรถตู้ 3D: true เปิด · false ปิด · null = ตาม state จริง (ค้างข้ามช่วงที่ฉากขับซ่อน — จอดจุดพักแล้วประตูเปิดรอ) */
export function rear(open) { S.rear = open == null ? null : !!open; }

const _np = new THREE.Vector3(), _nq = new THREE.Quaternion(), _p = new THREE.Vector3(), _l = new THREE.Vector3();
const _o = new THREE.PerspectiveCamera();

// ท่ากล้องตามบท (รถตู้อยู่ x = 0 · หน้ารถ = +x · z = เลนปัจจุบัน) → น้ำหนักทับกล้องปกติ (0..1)
function pose(sh, k, Z, v) {
  switch (sh.name) {
    case "intro": {
      // ① กล้องเตี้ยกลางถนนข้างหน้า รถตู้แล่นเข้าหา ② เครนข้ามหลังคา ③ ลงท่าไล่หลัง (ผสมคืนกล้องปกติ)
      const a1 = easeOut(span(k, 0, 0.4)), e = easeInOut(span(k, 0.4, 0.84));
      const x = e > 0 ? lerp(16, -15, e) : lerp(42, 16, a1);
      const y = lerp(1.05, 5.2, e) + 5.2 * Math.sin(Math.PI * e);
      _p.set(x, y, Z + lerp(2.4, 0.4, e));
      _l.set(lerp(0, 6, easeInOut(span(k, 0.55, 0.9))), lerp(1.3, 1.6, e), Z);
      return 1 - easeInOut(span(k, 0.8, 1));
    }
    case "pullover": {
      const a = lerp(0.9, 0.62, easeOut(k));
      _p.set(Math.cos(a) * 15, lerp(4, 6.5, k), Z + Math.sin(a) * 15);
      _l.set(-1, 0.9, Z);
      return easeInOut(span(k, 0, 0.45));
    }
    case "swoop": {
      const e = easeInOut(span(k, 0, 0.9));
      const d = lerp(15, 26, e), pit = lerp(0.3, TILT, e);
      const a = lerp(Math.PI * 0.82, Math.PI / 2, e); // จากหลังเฉียงข้าง → ข้างรถ (ฝั่ง +z)
      _p.set(Math.cos(a) * Math.cos(pit) * d, Math.sin(pit) * d + 1.5 * (1 - e), Z + Math.sin(a) * Math.cos(pit) * d);
      _l.set(lerp(2, 0, e), lerp(1.2, 0, e), Z);
      return easeOut(span(k, 0, 0.35));
    }
    case "swing": {
      const e = easeInOut(span(k, 0, 0.92));
      const a = lerp(Math.PI * 1.02, Math.PI / 2, e);
      const d = lerp(15, 26, e), pit = lerp(0.36, TILT, e);
      _p.set(Math.cos(a) * Math.cos(pit) * d, Math.sin(pit) * d, Z + Math.sin(a) * Math.cos(pit) * d);
      _l.set(lerp(-3, 0, e), lerp(0.8, 0, e), Z);
      return easeOut(span(k, 0, 0.25));
    }
    case "pullout": {
      _p.set(lerp(9, -2, k), lerp(2, 2.8, k), Z + lerp(12, 13, k));
      _l.set(lerp(1, 4, k) + Math.min(6, v * 0.05), 1.1, Z);
      return 1 - easeInOut(span(k, 0.38, 1));
    }
    default:
      return 0;
  }
}

// road3d update เรียกหลังกล้องปกติวางท่าแล้ว: ผสมท่าตามบทเข้าไป
function cutCam(camera, info) {
  const sh = S.shot;
  if (!sh) return;
  const k = clamp01((performance.now() - sh.t0) / sh.ms);
  const w = clamp01(pose(sh, k, info.z || 0, info.v || 0));
  if (w <= 0) return;
  _np.copy(camera.position); _nq.copy(camera.quaternion);
  _o.position.copy(_p); _o.up.set(0, 1, 0); _o.lookAt(_l);
  camera.position.lerpVectors(_np, _p, w);
  camera.quaternion.slerpQuaternions(_nq, _o.quaternion, w);
  camera.updateMatrixWorld();
}

/** RoadDrive เรียกทุกเฟรม → ส่งเข้า scene.update (slow · cutCam · มุมกล้องบังคับระหว่างบท) */
export function frameOpts(now = performance.now()) {
  const sh = S.shot;
  if (sh && now - sh.t0 > sh.ms) S.shot = null;
  return { slow: slowAt(now), cutCam: S.shot ? cutCam : null, camOverride: S.shot ? "chase" : null, rear: S.rear };
}
