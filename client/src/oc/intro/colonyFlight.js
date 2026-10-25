// ============================================================
//  ฉากเข้าด่าน Colony: ปลายฉากเปิดแมตช์ (MatchIntro โหมด colony) — บนลูกโลกร่วมใบเดิม (ผู้ใช้สั่ง 2026-10-25)
//  เปิดตัวผู้เล่นโคจรรอบโลกเหมือนเดิม → กล้องหมุนเหวี่ยงรอบโลก (เอียงตัว) → โคโลนีโผล่จากหลังโลก →
//  กล้องวนเข้าแนวแกนท้ายโคโลนีพร้อมควงสว่าน 1 รอบ → พุ่งเข้าท่าเทียบยาน (วงไฟฟ้ากลางแกน) → แฟลชขาว (DOM) ส่งต่อเข้ากระดาน
//  ใช้: App คืน { colony: true, durationMs } จาก onOutro ของ MatchIntro · server พักเกมช่วงเปิดตัว + ~6 วิ (ฉาก journey "start")
//  ของ 3D ที่เพิ่มใน core.scene ถูก scopeCore เก็บกวาดเอง · restore() คืนกล้องเมื่อฉากถูกยกเลิกกลางคัน
//  u = เวลา / D (0..1)
// ============================================================
import { REDUCED, clamp01, easeInOutCubic, span } from "./diveKit";
import { createColonyModel } from "../../globe/colonyModel";

export const COLONY_MS = 6800;
// สัดส่วนเวลา (คูณ D) — DOM ใน MatchIntro ใช้จังหวะเดียวกัน (เส้นพุ่ง/แฟลช)
export const COLONY_T = { reveal: 0.3, align: 0.4, roll0: 0.42, roll1: 0.66, dash: 0.64, flash: 0.93 };

export function createColonyFlight(core, { lowQ = false } = {}) {
  const { THREE, camera, scene } = core;
  const E = core.world.position.clone();
  // โคโลนีลอยอยู่หลัง-ขวาของโลก · ท้ายกระบอก (ท่าเทียบยาน) หันเข้าหาโลก
  const C = E.clone().add(new THREE.Vector3(4.4, 0.9, -5.6));
  const S = 0.8; // ขนาดโคโลนีในฉากนี้
  const colony = createColonyModel(THREE, { lowQ });
  colony.group.position.copy(C);
  const axis = C.clone().sub(E).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.35).normalize();
  colony.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);
  colony.group.scale.setScalar(S);
  scene.add(colony.group);
  colony.group.updateMatrixWorld();
  const port = colony.group.localToWorld(colony.port.clone());

  const near0 = camera.near;
  camera.near = 0.01;
  camera.updateProjectionMatrix();
  const sandMat = core.sand?.material;
  const sand0 = sandMat ? sandMat.opacity : 0;
  const cam = new THREE.Vector3(), look = new THREE.Vector3(), orbitP = new THREE.Vector3(), lineP = new THREE.Vector3();
  const fwd = new THREE.Vector3(), up = new THREE.Vector3(), q = new THREE.Quaternion();
  const Y = new THREE.Vector3(0, 1, 0);
  let lastFov = camera.fov, clock = 0;

  return {
    /** u = ความคืบหน้าของฉาก 0..1 */
    frame(u, dt = 0.016) {
      clock += dt;
      colony.update(dt, clock);
      if (REDUCED) {
        camera.position.copy(port).addScaledVector(axis, -2.2 * S);
        camera.up.set(0, 1, 0);
        camera.lookAt(port);
        return;
      }
      // 1) เหวี่ยงรอบโลกไปฝั่งโคโลนี: มุมรอบแกน Y 0 → 132° ระยะ 6 → 4.8 · ยกกล้องขึ้นเล็กน้อย (โคโลนีโผล่จากขอบโลก)
      const k = easeInOutCubic(span(u, 0, COLONY_T.align));
      const a = 1.55 * k, R = 6 - 0.6 * k;
      orbitP.set(E.x + R * Math.sin(a), E.y + 0.9 * Math.sin(k * Math.PI), E.z + R * Math.cos(a));
      // 2) วนเข้าแนวแกนท้ายโคโลนี
      const m = easeInOutCubic(span(u, COLONY_T.reveal, COLONY_T.dash));
      lineP.copy(port).addScaledVector(axis, -2.8 * S);
      cam.copy(orbitP).lerp(lineP, m);
      // 3) พุ่งเข้าท่าเทียบยาน (เร่งขึ้นเรื่อยๆ จนทะลุ)
      const d = Math.pow(span(u, COLONY_T.dash, 0.97), 2.2);
      if (d > 0) cam.copy(lineP).lerp(port.clone().addScaledVector(axis, 0.2 * S), d);
      if (!lowQ && d > 0.6) { const sh = ((d - 0.6) / 0.4) * 0.012; cam.x += (Math.random() - 0.5) * sh; cam.y += (Math.random() - 0.5) * sh; }
      // มุมมอง: โลก → โคโลนี → ทะลุแกน
      look.copy(E).lerp(C, easeInOutCubic(span(u, 0.1, 0.3)));
      if (m > 0) look.lerp(port.clone().addScaledVector(axis, 3), m);
      camera.position.copy(cam);
      // เอียงตัวตอนเหวี่ยง + ควงสว่าน 1 รอบรอบแกนมอง
      fwd.copy(look).sub(cam).normalize();
      const bank = -0.55 * Math.sin(Math.PI * clamp01(u / COLONY_T.align));
      const roll = bank + Math.PI * 2 * easeInOutCubic(span(u, COLONY_T.roll0, COLONY_T.roll1));
      q.setFromAxisAngle(fwd, roll);
      up.copy(Y).applyQuaternion(q);
      camera.up.copy(up);
      camera.lookAt(look);
      const fov = 32 + 12 * Math.sin(Math.PI * k) + 40 * Math.pow(span(u, 0.72, 0.97), 3);
      if (Math.abs(fov - lastFov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); lastFov = fov; }
      if (sandMat) sandMat.opacity = sand0 * (1 - clamp01((u - 0.55) * 3));
      colony.portGlow.scale.setScalar(0.5 + 1.6 * d);
    },
    restore() {
      camera.near = near0;
      camera.fov = 32;
      camera.up.set(0, 1, 0);
      camera.position.set(0, 0, 6);
      camera.rotation.set(0, 0, 0);
      camera.updateProjectionMatrix();
      if (sandMat) sandMat.opacity = sand0;
    },
  };
}
