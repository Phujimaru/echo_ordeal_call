// ============================================================
//  โมเดล 3D ของดวงจันทร์ + Moon Cell (โหมด Moon Cell · GRID_PLAN §8.4) — ใช้ร่วมกันระหว่างหน้าเลือกโหมด (ModeVote) และฉากเข้าด่าน (moonFlight)
//  ดวงจันทร์: ผิวขาวอมฟ้า + หลุม + ตารางข้อมูล (moonTexture ของ moonFlight) · เส้นละติจูด/ลองจิจูดฟ้า · วงแหวนข้อมูลเส้นประม่วง · แสงเรือง
//  Moon Cell: ลูกบาศก์ฟ้าโปร่งแสง แบ่งเป็นบล็อก 3×3 เส้นขอบเรือง + แสงในแกน ลอยเหนือขั้วบนของดวงจันทร์ (ภาพแรงบันดาลใจของผู้ใช้)
//  ดวงจันทร์รัศมี 1 หน่วย · cell = ตำแหน่ง Moon Cell ในกลุ่ม (ที่ปักหมุดโหมด)
// ============================================================
import { moonTexture, glowTexture } from "../oc/intro/moonFlight";

/** ลูกบาศก์ Moon Cell ขนาดด้าน size — คืน { group, update(dt, clock), mats } */
export function createMoonCellCube(THREE, size = 0.42) {
  const mats = [];
  const mat = (m) => { mats.push(m); return m; };
  const group = new THREE.Group();
  const spin = new THREE.Group();
  group.add(spin);
  const box = new THREE.BoxGeometry(size, size, size, 3, 3, 3);
  const shell = new THREE.Mesh(box, mat(new THREE.MeshBasicMaterial({ color: 0x3d8bd9, transparent: true, opacity: 0.32, depthWrite: false })));
  const grid = new THREE.LineSegments(new THREE.WireframeGeometry(box), mat(new THREE.LineBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.45 })));
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size)), mat(new THREE.LineBasicMaterial({ color: 0xe6f4ff, transparent: true, opacity: 1 })));
  const core = new THREE.Mesh(new THREE.BoxGeometry(size * 0.34, size * 0.34, size * 0.34), mat(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })));
  spin.add(shell, grid, edge, core);
  spin.rotation.set(0.62, 0.78, 0);
  const glow = new THREE.Sprite(mat(new THREE.SpriteMaterial({ map: glowTexture(THREE, "rgba(225,242,255,.95)", "rgba(61,139,217,.4)"), transparent: true, depthWrite: false })));
  glow.scale.setScalar(size * 3.2);
  group.add(glow);
  return {
    group, mats,
    update(dt, clock) {
      spin.rotation.y += dt * 0.35;
      group.position.y = Math.sin(clock * 1.3) * size * 0.08;
      core.material.opacity = (0.7 + 0.3 * Math.sin(clock * 2.4)) * (core.material.userData.k ?? 1);
    },
  };
}

export function createMoonModel(THREE) {
  const mats = [];
  const mat = (m) => { mats.push(m); return m; };
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 48), mat(new THREE.MeshLambertMaterial({ map: moonTexture(THREE) })));
  body.add(sphere);
  {
    const pts = [], R = 1.02;
    const dir = (lo, la) => { const a = (lo * Math.PI) / 180, b = (la * Math.PI) / 180; return new THREE.Vector3(Math.cos(b) * Math.sin(a) * R, Math.sin(b) * R, Math.cos(b) * Math.cos(a) * R); };
    for (let la = -60; la <= 60; la += 30) for (let lo = 0; lo < 360; lo += 5) pts.push(dir(lo, la), dir(lo + 5, la));
    for (let lo = 0; lo < 360; lo += 30) for (let la = -84; la < 84; la += 5) pts.push(dir(lo, la), dir(lo, la + 5));
    body.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), mat(new THREE.LineBasicMaterial({ color: 0x3d8bd9, transparent: true, opacity: 0.3 }))));
  }
  const ringMat = mat(new THREE.LineDashedMaterial({ color: 0x9b4f96, transparent: true, opacity: 0.7, dashSize: 0.12, gapSize: 0.08 }));
  {
    const pts = [];
    for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6)); }
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat);
    ring.computeLineDistances();
    ring.rotation.set(0.35, 0, -0.25);
    group.add(ring);
  }
  const glow = new THREE.Sprite(mat(new THREE.SpriteMaterial({ map: glowTexture(THREE, "rgba(230,244,255,.9)", "rgba(190,227,248,.4)"), transparent: true, depthWrite: false })));
  glow.scale.setScalar(4.2);
  group.add(glow);

  const cell = createMoonCellCube(THREE, 0.42);
  const cellAnchor = new THREE.Group(); // ตัวลูกบาศก์ขยับขึ้นลงเองใน update — ยึดตำแหน่งด้วยกลุ่มนี้
  cellAnchor.position.set(0, 1.5, 0);
  cellAnchor.add(cell.group);
  group.add(cellAnchor);
  mats.push(...cell.mats);

  const cellHit = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  cellAnchor.add(cellHit);
  const hits = [sphere];
  let opacity = 1;

  return {
    group, hits, cellHit, cellAnchor,
    update(dt, clock) {
      body.rotation.y += dt * 0.08;
      ringMat.dashOffset = (ringMat.dashOffset || 0) - dt * 0.4;
      cell.update(dt, clock);
    },
    /** จาง/โผล่ทั้งโมเดล (0..1) */
    setOpacity(k) {
      opacity = k;
      group.visible = k > 0.01;
      for (const m of mats) {
        if (m.userData.baseOpacity == null) m.userData.baseOpacity = m.opacity;
        m.userData.k = k;
        m.transparent = true;
        m.opacity = m.userData.baseOpacity * k;
      }
    },
    get opacity() { return opacity; },
  };
}
