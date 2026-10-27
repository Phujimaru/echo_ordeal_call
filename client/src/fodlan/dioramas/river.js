// ด่าน I ป่าริมแม่น้ำแอร์มิด — ป่าสนสองฝั่งแม่น้ำใหญ่ · เรือลำใหญ่จอดเทียบท่า
//  สภาพอากาศ (ฝนฟ้าผ่า): ฟ้าครึ้ม ฝนตกหนัก ฟ้าแลบ 2 ครั้ง · ไม่มี: บ่ายแดดทอง
import { budget, rng, fbm2, smooth, clamp01, skyDome, water, terrain, pineForest, particles, camPath, fire } from "../kit";

const riverZ = (x) => 10 * Math.sin(x / 22) + 4 * Math.sin(x / 9 + 1);

function boat(THREE) {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: "#5a3a22" });
  const dark = new THREE.MeshLambertMaterial({ color: "#3a2414" });
  // ตัวเรือ: กล่องที่บีบหัวท้ายให้แหลม + ท้องเรือรูปตัว V
  const hull = new THREE.BoxGeometry(10, 1.6, 3.4, 20, 4, 6);
  const p = hull.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const end = Math.pow(Math.abs(x) / 5, 2.4);
    const bottom = clamp01((0.8 - y) / 1.6);
    p.setZ(i, z * (1 - end * 0.92) * (1 - bottom * 0.55));
    p.setY(i, y + end * 0.7);
  }
  hull.computeVertexNormals();
  const h = new THREE.Mesh(hull, wood);
  h.position.y = 0.3;
  g.add(h);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.12, 2.9), dark);
  deck.position.y = 1.12;
  g.add(deck);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 2.2), wood);
  cabin.position.set(-2.6, 1.8, 0);
  g.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.15, 2.5), dark);
  roof.position.set(-2.6, 2.5, 0);
  g.add(roof);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 8, 6), dark);
  mast.position.set(0.8, 5, 0);
  g.add(mast);
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.6, 6), dark);
  yard.rotation.x = Math.PI / 2; yard.position.set(0.8, 7.6, 0);
  g.add(yard);
  const sail = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 4.3, 8), new THREE.MeshLambertMaterial({ color: "#d9c9a4" }));
  sail.rotation.x = Math.PI / 2; sail.position.set(0.8, 7.35, 0);
  g.add(sail);
  // ตะเกียงท้ายเรือ
  const lamp = fire(THREE, { scale: 0.28, intensity: 14, dist: 30, embers: 0, seed: 9 });
  lamp.group.position.set(4.3, 1.4, 0);
  g.add(lamp.group);
  return { group: g, lamp };
}

export async function buildRiver(THREE, { weather = false, lowQ = false } = {}) {
  const r = rng(101);
  const group = new THREE.Group();
  const rain = weather;
  const sky = skyDome(THREE, rain
    ? { top: "#1d2633", mid: "#4d5a68", bottom: "#2c343c" }
    : { top: "#3d74b0", mid: "#f0c48c", bottom: "#7a5c44", sun: [0.62, 0.16, -0.78], sunColor: "#ffd59a", sunSize: 0.05 });
  group.add(sky.mesh);
  const fog = rain ? new THREE.Fog("#4f5b68", 14, 120) : new THREE.Fog("#d8b388", 40, 210);

  const hFn = (x, z) => {
    const d = Math.abs(z - riverZ(x));
    const n = fbm2(x * 0.03 + 3, z * 0.03 + 7, 4, 5);
    const hills = (n - 0.4) * 7;
    const rim = smooth(clamp01((Math.hypot(x, z * 1.2) - 55) / 40)) * 26 * (0.6 + n);
    const bank = smooth(clamp01((d - 4) / 6));
    return -1.6 + bank * (1.6 + Math.max(0, hills) + 0.6) + rim;
  };
  const col = (x, z, h, slope) => {
    const d = Math.abs(z - riverZ(x));
    const n = fbm2(x * 0.1, z * 0.1, 3, 8);
    if (d < 5.2 && h < 0.4) return [0.42 + n * 0.1, 0.36 + n * 0.08, 0.26];        // ตลิ่งโคลน
    if (slope > 0.45) return [0.36 + n * 0.1, 0.33 + n * 0.08, 0.28];               // หินผา
    const wet = rain ? 0.78 : 1;
    const far = Math.min(1, Math.max(0, (h - 2) / 20));
    return [(0.2 + n * 0.12 - far * 0.06) * wet, (0.36 + n * 0.14 - far * 0.08) * wet, (0.14 + n * 0.06 + far * 0.04) * wet];
  };
  const ground = await terrain(THREE, { w: 220, d: 220, seg: lowQ ? 110 : 170, heightFn: hFn, colorFn: col });
  group.add(ground);
  const river = water(THREE, rain
    ? { w: 220, d: 220, seg: lowQ ? 60 : 110, deep: "#1d3440", shallow: "#4d6b76", foam: "#c8d8e0", flow: [1, 0.1], amp: 0.12 }
    : { w: 220, d: 220, seg: lowQ ? 60 : 110, deep: "#21505e", shallow: "#6fb0b4", foam: "#fff3d6", flow: [1, 0.1], amp: 0.1 });
  river.mesh.position.y = -0.55;
  group.add(river.mesh);

  // ป่า: สุ่มบนกริด เว้นแม่น้ำ + ทางกล้อง
  const pts = [];
  const N = lowQ ? 420 : 950;
  const tick = budget();
  for (let i = 0; i < N * 3 && pts.length < N; i++) {
    if (i % 64 === 0) await tick();
    const x = (r() - 0.5) * 190, z = (r() - 0.5) * 190;
    const d = Math.abs(z - riverZ(x));
    if (d < 7.5 || fbm2(x * 0.05, z * 0.05, 3, 2) < 0.42) continue;
    if (Math.abs(x - 7) < 7 && z > riverZ(7) && z < riverZ(7) + 12) continue; // ท่าเรือ
    pts.push([x, hFn(x, z) - 0.2, z, 1.1 + r() * 1.3]);
  }
  group.add(pineForest(THREE, pts, rain ? { leaf: "#22402c", leaf2: "#2c4f36" } : { leaf: "#2f5a34", leaf2: "#467a3e" }));

  // ท่าเรือ + เรือ
  const bz = riverZ(7);
  const dock = new THREE.Group();
  const plank = new THREE.MeshLambertMaterial({ color: "#6a4a2c" });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3, 0.22, 7.5), plank);
  deck.position.set(9, 0.35, bz + 6.2);
  dock.add(deck);
  for (const [dx, dz] of [[-1.3, -3.4], [1.3, -3.4], [-1.3, 0], [1.3, 0], [-1.3, 3.4], [1.3, 3.4]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.4, 6), plank);
    post.position.set(9 + dx, -0.4, bz + 6.2 + dz);
    dock.add(post);
  }
  group.add(dock);
  const b = boat(THREE);
  b.group.position.set(5.5, -0.75, bz + 3.6);
  b.group.rotation.y = 0.08;
  group.add(b.group);

  const hemi = new THREE.HemisphereLight(rain ? "#9fb0c4" : "#ffe6c0", rain ? "#1c2420" : "#2a2016", rain ? 1.1 : 1.15);
  const sun = new THREE.DirectionalLight(rain ? "#c8d4e4" : "#ffc98a", rain ? 0.6 : 2.6);
  sun.position.set(60, 22, -80);
  group.add(hemi, sun);

  let drops = null, bolt = null;
  if (rain) {
    drops = particles(THREE, { kind: "rain", count: lowQ ? 2600 : 6500, box: [70, 36, 70], vel: [-3, -34, 1.5], len: 1.5, color: "#c4d4e4", opacity: 0.32, seed: 13 });
    group.add(drops.object);
    // สายฟ้า (เส้นหยัก) ไกลๆ บนฟ้า
    const bp = [];
    let x = 30, y = 70, z = -110;
    for (let i = 0; i < 14; i++) { const nx = x + (r() - 0.5) * 9, ny = y - 5.5, nz = z + (r() - 0.5) * 3; bp.push(new THREE.Vector3(x, y, z), new THREE.Vector3(nx, ny, nz)); x = nx; y = ny; z = nz; }
    bolt = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(bp), new THREE.LineBasicMaterial({ color: "#eef4ff", transparent: true, opacity: 0, fog: false }));
    group.add(bolt);
  }

  const cam = camPath(THREE,
    [[-70, 24, riverZ(-70) - 4], [-46, 12, riverZ(-46)], [-26, 6, riverZ(-26) + 1], [-10, 4.6, riverZ(-10) - 2], [-3.5, 5, bz - 7.5]],
    [[-20, 6, riverZ(-20) + 4], [-6, 2, riverZ(-6)], [6, 1, riverZ(6)], [7, 1.8, bz + 3], [6, 2, bz + 3.6]],
  );
  // ฟ้าแลบ 2 ครั้ง (u) — เสียงฟ้าร้องเล่นจาก events
  const STRIKES = [0.34, 0.72];
  const events = rain ? [{ u: 0.34, sfx: "wx_thunder" }, { u: 0.72, sfx: "wx_thunder2" }] : [];

  return {
    group, fog, cam, events,
    update(t, u, H, camPos) {
      river.update(t);
      b.lamp.update(t, H);
      b.group.position.y = -0.75 + Math.sin(t * 1.1) * 0.06;
      b.group.rotation.z = Math.sin(t * 0.8) * 0.015;
      if (drops) { drops.update(t, H); drops.object.position.set(camPos.x, camPos.y - 18, camPos.z); }
      if (rain) {
        let f = 0;
        for (const s of STRIKES) { const d = u - s; if (d >= 0 && d < 0.05) f = Math.max(f, (d < 0.012 ? 1 : 0.55) * (1 - d / 0.05) * (0.7 + 0.3 * Math.sin(d * 900))); }
        sky.uniforms.flash.value = f * 0.85;
        river.uniforms.flash.value = f;
        hemi.intensity = 1.1 + f * 4;
        bolt.material.opacity = f > 0.3 ? 1 : 0;
      }
    },
  };
}
