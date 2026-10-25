// ============================================================
//  โมเดล 3D ของโคโลนีอวกาศ (โหมด Colony · GRID_PLAN §8.3) — ใช้ร่วมกันระหว่างหน้าเลือกโหมด (ModeVote) และฉากเข้าด่าน (colonyFlight)
//  หน้าตาตามภาพอ้างอิงของผู้ใช้ (โคโลนีแบบ Gundam Unicorn): ทรงกระบอกโลหะลายวงจรฟ้า · หน้าต่างยาว 3 แถบ ·
//   กระจกสะท้อนแสง 3 แผ่นกางจากท้ายกระบอก · ปลายหน้าเป็นโดมกระจก + ดุมกลม + วงแหวนใหญ่มีไฟเขียว/ฟ้าสลับ ต่อซี่ลวดเข้าดุม ·
//   ท้ายกระบอกมีท่าเทียบยาน (วงไฟฟ้าตรงแกน) = ทางเข้าของฉากเข้าด่าน
//  แกนกระบอก = แกน Z ของกลุ่ม (+Z = โดม · −Z = ท่าเทียบยาน) · ขนาดยาว L = 3 หน่วย รัศมี R = 0.34
//  ตัวกระบอก + กระจก หมุนรอบแกนช้าๆ (โคโลนีหมุนสร้างแรงโน้มถ่วง) · วงแหวนไม่หมุน
// ============================================================
export const COLONY_L = 3;
export const COLONY_R = 0.34;

function canvasTex(THREE, w, h, paint) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  paint(cv.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
// สุ่มแบบกำหนดค่า (ลายเหมือนเดิมทุกครั้ง)
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// ผิวกระบอก: เหล็กขาวอมฟ้า + รอยต่อแผ่น + เส้นวงจรฟ้า (u = รอบวง · v = ตามแกน)
function hullTexture(THREE) {
  return canvasTex(THREE, 1024, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, "#c9d4e2"); grd.addColorStop(0.5, "#eef3f9"); grd.addColorStop(1, "#c9d4e2");
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(90,110,140,.35)"; g.lineWidth = 2;
    for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const r = rng(11);
    g.lineWidth = 2.5;
    for (let i = 0; i < 90; i++) { // ลายวงจร: เส้นหักฉาก + จุดปลาย
      let x = r() * w, y = r() * h;
      g.strokeStyle = `rgba(61,139,217,${0.35 + r() * 0.45})`;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { if (r() < 0.5) x += (r() - 0.5) * 120; else y += (r() - 0.5) * 90; g.lineTo(x, y); }
      g.stroke();
      g.fillStyle = "rgba(61,139,217,.8)"; g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.7 ? "rgba(255,214,140,.65)" : "rgba(160,220,255,.7)"; g.fillRect(r() * w, r() * h, 3, 2); } // ไฟหน้าต่างเล็ก
  });
}
// กระจกสะท้อน: ฟ้าเข้ม→ฟ้าอ่อน + กริด + ลายวงจรขาว
function mirrorTexture(THREE) {
  return canvasTex(THREE, 256, 768, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, "#2f6fc4"); grd.addColorStop(0.5, "#79b6ee"); grd.addColorStop(1, "#3a7fd0");
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(220,240,255,.35)"; g.lineWidth = 2;
    for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const r = rng(23);
    g.strokeStyle = "rgba(240,250,255,.55)"; g.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 3; k++) { if (r() < 0.5) x += (r() - 0.5) * 80; else y += (r() - 0.5) * 120; g.lineTo(x, y); }
      g.stroke();
    }
    g.strokeStyle = "rgba(230,240,250,.95)"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); // กรอบ
  });
}
function glowTexture(THREE, inner, outer) {
  return canvasTex(THREE, 128, 128, (g) => {
    const m = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    m.addColorStop(0, inner); m.addColorStop(0.4, outer); m.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = m; g.fillRect(0, 0, 128, 128);
  });
}

/**
 * สร้างโมเดลโคโลนี
 * @returns {{ group, hits, anchors, port, dome, update(dt, clock), setOpacity(k) }}
 *   anchors = จุดวางหมุด/ป้ายบนตัวกระบอก (พิกัดในกลุ่ม) · port/dome = ปลายสองด้าน (พิกัดในกลุ่ม)
 */
export function createColonyModel(THREE, { lowQ = false } = {}) {
  const L = COLONY_L, R = COLONY_R;
  const group = new THREE.Group();
  const spin = new THREE.Group(); // ส่วนที่หมุนรอบแกน
  group.add(spin);
  const mats = [];
  const mat = (m) => { mats.push(m); return m; };

  // ---- ตัวกระบอก
  const hull = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, L, lowQ ? 32 : 64, 1, false),
    mat(new THREE.MeshStandardMaterial({ map: hullTexture(THREE), metalness: 0.45, roughness: 0.42 })),
  );
  hull.rotation.x = Math.PI / 2;
  spin.add(hull);
  // ขอบปลายสองด้าน (วงเหล็กหนา)
  for (const z of [-L / 2, L / 2]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 1.01, 0.022, 8, 48), mat(new THREE.MeshStandardMaterial({ color: 0xdfe7f1, metalness: 0.6, roughness: 0.3 })));
    rim.position.z = z;
    spin.add(rim);
  }

  // ---- หน้าต่าง 3 แถบ + กระจกสะท้อน 3 แผ่น (กางจากท้ายกระบอก)
  const winMat = mat(new THREE.MeshStandardMaterial({ color: 0xbfe3ff, emissive: 0x4c9be6, emissiveIntensity: 0.55, metalness: 0.2, roughness: 0.12 }));
  const mirMat = mat(new THREE.MeshStandardMaterial({ map: mirrorTexture(THREE), metalness: 0.75, roughness: 0.18, emissive: 0x1d4f8f, emissiveIntensity: 0.25, side: THREE.DoubleSide }));
  const mirrors = [];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.014, L * 0.94), winMat);
    strip.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    strip.rotation.z = a + Math.PI / 2;
    spin.add(strip);
    // บานพับอยู่ท้ายกระบอก (−Z) · กางออกจากแกน 26°
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * R * 1.02, Math.sin(a) * R * 1.02, -L / 2);
    pivot.rotation.order = "ZYX";
    pivot.rotation.z = a;
    pivot.rotation.y = 0.45;
    const geo = new THREE.PlaneGeometry(0.62, L * 0.95);
    geo.rotateX(Math.PI / 2); // ยาวตามแกน Z
    geo.rotateZ(Math.PI / 2); // ด้านกว้างไปตามแนวสัมผัสรอบวง (หน้าแผ่นหันออกจากแกน)
    const panel = new THREE.Mesh(geo, mirMat);
    panel.position.z = L * 0.475;
    pivot.add(panel);
    spin.add(pivot);
    mirrors.push(panel);
  }

  // ---- ปลายหน้า: โดมกระจก
  const domeMat = mat(new THREE.MeshStandardMaterial({ color: 0xcfeaff, emissive: 0x7fb8e6, emissiveIntensity: 0.35, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.6 }));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R * 0.98, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  dome.rotation.x = Math.PI / 2;
  dome.position.z = L / 2;
  spin.add(dome);
  // โครงโดม
  {
    const pts = [];
    for (let m = 0; m < 12; m++) {
      const t = (m / 12) * Math.PI * 2;
      for (let i = 0; i < 8; i++) {
        const a0 = (i / 8) * (Math.PI / 2), a1 = ((i + 1) / 8) * (Math.PI / 2);
        pts.push(new THREE.Vector3(Math.cos(a0) * Math.cos(t) * R, Math.cos(a0) * Math.sin(t) * R, L / 2 + Math.sin(a0) * R),
          new THREE.Vector3(Math.cos(a1) * Math.cos(t) * R, Math.cos(a1) * Math.sin(t) * R, L / 2 + Math.sin(a1) * R));
      }
    }
    spin.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), mat(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }))));
  }

  // ---- ดุม + วงแหวนใหญ่ + ซี่ลวด (ไม่หมุน)
  const hubZ = L / 2 + R * 1.25;
  const metal = mat(new THREE.MeshStandardMaterial({ color: 0xe6edf5, metalness: 0.55, roughness: 0.3 }));
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), mat(new THREE.MeshStandardMaterial({ map: hullTexture(THREE), metalness: 0.5, roughness: 0.35 })));
  hub.position.z = hubZ;
  group.add(hub);
  const RING = 1.05;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RING, 0.03, 10, lowQ ? 64 : 128), metal);
  ring.position.z = hubZ;
  group.add(ring);
  const lights = [];
  const nSeg = 24;
  for (let i = 0; i < nSeg; i++) {
    const t = (i / nSeg) * Math.PI * 2;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.075), metal);
    seg.position.set(Math.cos(t) * RING, Math.sin(t) * RING, hubZ);
    seg.rotation.z = t + Math.PI / 2;
    group.add(seg);
    const lm = mat(new THREE.MeshBasicMaterial({ color: i % 2 ? 0x57e690 : 0x5fc8ff }));
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.08), lm);
    lamp.position.set(Math.cos(t) * (RING - 0.03), Math.sin(t) * (RING - 0.03), hubZ);
    lamp.rotation.z = t + Math.PI / 2;
    group.add(lamp);
    lights.push(lm);
  }
  for (let i = 0; i < 4; i++) {
    const t = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const len = RING - 0.12;
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 6), metal);
    spoke.position.set(Math.cos(t) * (0.12 + len / 2), Math.sin(t) * (0.12 + len / 2), hubZ);
    spoke.rotation.z = t - Math.PI / 2;
    group.add(spoke);
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, hubZ - L / 2, 10), metal);
  neck.rotation.x = Math.PI / 2;
  neck.position.z = (hubZ + L / 2) / 2;
  group.add(neck);

  // ---- ท้ายกระบอก: ท่าเทียบยาน (ทางเข้า)
  const cap = new THREE.Mesh(new THREE.CircleGeometry(R * 0.99, 48), mat(new THREE.MeshStandardMaterial({ color: 0xb8c6d8, metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide })));
  cap.position.z = -L / 2 - 0.001;
  cap.rotation.y = Math.PI;
  spin.add(cap);
  const portMat = mat(new THREE.MeshBasicMaterial({ color: 0x8fe0ff, transparent: true, opacity: 0.95 }));
  const port = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.09, 40), portMat);
  port.position.z = -L / 2 - 0.004;
  port.rotation.y = Math.PI;
  group.add(port);
  const portGlow = new THREE.Sprite(mat(new THREE.SpriteMaterial({ map: glowTexture(THREE, "rgba(200,240,255,1)", "rgba(95,200,255,.45)"), transparent: true, depthWrite: false })));
  portGlow.scale.setScalar(0.5);
  portGlow.position.z = -L / 2 - 0.02;
  group.add(portGlow);

  const anchors = [-1.2, 0, 1.2].map((z) => new THREE.Vector3(0, R + 0.02, z));
  const hits = [hull, dome, hub, ...mirrors];
  let opacity = 1;

  return {
    group, hits, anchors,
    port: new THREE.Vector3(0, 0, -L / 2), dome: new THREE.Vector3(0, 0, L / 2),
    portGlow,
    update(dt, clock) {
      spin.rotation.z += dt * 0.18;
      lights.forEach((m, i) => { const on = 0.55 + 0.45 * Math.sin(clock * 3 + i * 0.9); m.color.setHex(i % 2 ? 0x57e690 : 0x5fc8ff).multiplyScalar(on); });
      portMat.opacity = (0.65 + 0.35 * Math.sin(clock * 4)) * opacity;
      portGlow.material.opacity = (0.7 + 0.3 * Math.sin(clock * 4)) * opacity;
    },
    /** จาง/โผล่ทั้งโมเดล (0..1) */
    setOpacity(k) {
      opacity = k;
      group.visible = k > 0.01;
      for (const m of mats) {
        if (m.userData.baseOpacity == null) m.userData.baseOpacity = m.opacity;
        m.transparent = true;
        m.opacity = m.userData.baseOpacity * k;
      }
    },
  };
}
