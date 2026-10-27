// ด่าน IV เทือกเขาฟาร์กัส — ช่องเขาหิมะ · กองไฟ 2 กอง (วงความอบอุ่นเรืองบนหิมะ) · แอ่งน้ำแข็งใหญ่จุดเดียว
//  สภาพอากาศ (พายุหิมะ): หิมะซัดแนวนอน หมอกหนา กองไฟดับวูบ
import { budget, rng, fbm2, smooth, clamp01, span, skyDome, terrain, pineForest, particles, camPath, fire, softTex, puffTex } from "../kit";

function iceTexture(THREE) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(256, 256, 20, 256, 256, 256);
  grd.addColorStop(0, "#e8f8ff"); grd.addColorStop(1, "#8ec4e4");
  g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  const r = rng(71);
  g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1.5;
  for (let i = 0; i < 40; i++) {
    let x = r() * 512, y = r() * 512;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 70; y += (r() - 0.5) * 70; g.lineTo(x, y); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function buildSnow(THREE, { weather = false, lowQ = false } = {}) {
  const r = rng(404);
  const group = new THREE.Group();
  const storm = weather;
  const sky = skyDome(THREE, storm ? { top: "#5d6f84", mid: "#c3ccd6", bottom: "#8c98a6" } : { top: "#5f86b4", mid: "#e6edf4", bottom: "#a2b4c6", sun: [0.4, 0.3, -0.86], sunColor: "#fff6e0", sunSize: 0.04 });
  group.add(sky.mesh);
  const fog = storm ? new THREE.FogExp2("#b9c4d0", 0.014) : new THREE.Fog("#dbe5ee", 40, 260);

  const hFn = (x, z) => {
    const valley = smooth(clamp01((Math.abs(z + 0.08 * x) - 9) / 50));
    const ridged = 1 - Math.abs(fbm2(x * 0.018 + 5, z * 0.018, 5, 7) * 2 - 1);
    const bumps = (fbm2(x * 0.08, z * 0.08, 3, 9) - 0.5) * 1.6;
    return valley * (8 + ridged * 52) + bumps;
  };
  const col = (x, z, h, slope) => {
    const n = fbm2(x * 0.12, z * 0.12, 3, 3);
    if (slope > 0.42) return [0.42 + n * 0.1, 0.44 + n * 0.1, 0.5 + n * 0.08];      // หินโผล่
    const shade = 0.86 + n * 0.12;
    return [0.8 * shade, 0.86 * shade, 0.95 * shade];
  };
  group.add(await terrain(THREE, { w: 280, d: 280, seg: lowQ ? 120 : 190, heightFn: hFn, colorFn: col }));

  const pts = [];
  const N = lowQ ? 300 : 700;
  const tick = budget();
  for (let i = 0; i < N * 4 && pts.length < N; i++) {
    if (i % 64 === 0) await tick();
    const x = (r() - 0.5) * 230, z = (r() - 0.5) * 230, h = hFn(x, z);
    if (h > 26 || Math.abs(z + 0.08 * x) < 7 || fbm2(x * 0.04, z * 0.04, 3, 6) < 0.45) continue;
    pts.push([x, h - 0.3, z, 1 + r() * 1.2]);
  }
  group.add(pineForest(THREE, pts, { leaf: "#2a4a3e", leaf2: "#34584a", snow: true }));

  // แอ่งน้ำแข็งใหญ่
  const ice = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshStandardMaterial({ map: iceTexture(THREE), roughness: 0.08, metalness: 0.25 }));
  ice.rotation.x = -Math.PI / 2; ice.scale.set(13, 8, 1);
  ice.position.set(14, hFn(14, 2) + 0.12, 2);
  group.add(ice);

  // กองไฟ 2 กอง + วงความอบอุ่น + ควัน
  const camps = [[-8, -3], [26, -6]].map(([x, z], i) => {
    const y = hFn(x, z);
    const f = fire(THREE, { scale: 1.3, intensity: 70, dist: 24, embers: lowQ ? 24 : 60, seed: 70 + i });
    f.group.position.set(x, y, z);
    const ring = new THREE.Mesh(new THREE.RingGeometry(5.6, 6, 64), new THREE.MeshBasicMaterial({ color: "#ffb070", transparent: true, opacity: 0.35, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, y + 0.15, z);
    const warm = new THREE.Mesh(new THREE.CircleGeometry(6, 48), new THREE.MeshBasicMaterial({ map: softTex(THREE), color: "#ff9a50", transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending }));
    warm.rotation.x = -Math.PI / 2; warm.position.set(x, y + 0.1, z);
    const logs = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 6), new THREE.MeshLambertMaterial({ color: "#3a2414" }));
      l.rotation.set(0, (k / 4) * Math.PI, Math.PI / 2 - 0.25); l.position.set(x, y + 0.25, z);
      logs.add(l);
    }
    const smoke = [];
    for (let k = 0; k < 7; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(THREE), color: "#7d8590", transparent: true, opacity: 0.3, depthWrite: false }));
      s.userData.ph = k / 7;
      group.add(s); smoke.push(s);
    }
    group.add(f.group, ring, warm, logs);
    return { f, ring, warm, smoke, x, y, z };
  });

  const snow = particles(THREE, storm
    ? { kind: "snow", count: lowQ ? 3500 : 9000, box: [60, 30, 60], vel: [-16, -7, 3], size: 0.22, color: "#ffffff", opacity: 0.9, seed: 81 }
    : { kind: "snow", count: lowQ ? 1400 : 3500, box: [80, 40, 80], vel: [-1.2, -2.6, 0.4], size: 0.2, color: "#ffffff", opacity: 0.85, seed: 81 });
  group.add(snow.object);

  const hemi = new THREE.HemisphereLight("#eef4ff", "#6a7a8e", storm ? 0.9 : 1.2);
  const sun = new THREE.DirectionalLight("#fff3dc", storm ? 0.5 : 1.7);
  sun.position.set(60, 50, -80);
  group.add(hemi, sun);

  const cam = camPath(THREE,
    [[-120, 46, 22], [-80, 30, 12], [-48, 18, 8], [-28, 11, 9], [-21, 8.5, 10]],
    [[-70, 14, 2], [-40, 6, 0], [-18, 3, -2], [-8, 2, -4], [-3, 2.5, -5]],
  );
  // พายุหิมะ: กองไฟวูบดับช่วงท้ายฉาก (ตรงกับกติกา: พายุทำให้กองไฟดับ 3 เทิร์น)
  const events = storm ? [{ u: 0.8, sfx: "torch_out" }] : [];

  return {
    group, fog, cam, events,
    update(t, u, H, camPos) {
      const out = storm ? smooth(span(u, 0.8, 0.88)) : 0;
      camps.forEach((c, i) => {
        c.f.update(t, H);
        c.f.group.scale.setScalar(Math.max(0.001, 1 - out));
        c.ring.material.opacity = (0.28 + 0.1 * Math.sin(t * 2 + i)) * (1 - out);
        c.warm.material.opacity = 0.32 * (1 - out);
        c.smoke.forEach((s) => {
          const k = (t * 0.12 + s.userData.ph) % 1;
          s.position.set(c.x + k * (storm ? -14 : 3), c.y + 1.5 + k * 16, c.z);
          s.scale.setScalar(2 + k * 7 + out * 3);
          s.material.opacity = (0.35 + out * 0.3) * Math.sin(k * Math.PI);
        });
      });
      snow.update(t, H);
      snow.object.position.set(camPos.x, camPos.y - 20, camPos.z);
    },
  };
}
