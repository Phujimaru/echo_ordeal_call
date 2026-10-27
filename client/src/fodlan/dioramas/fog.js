// ด่าน II ป่าผนึก — ป่าสนดำในหมอกหนา · เสาเวทมืด (สีม่วง) · คบเพลิง · กล่องเสบียง
//  สภาพอากาศ (ไอพิษ): หมอกเปลี่ยนเป็นม่วงอมเขียว + ละอองพิษลอย
import { budget, rng, fbm2, skyDome, terrain, pineForest, particles, camPath, fire, fogBank, lightShaft, softTex } from "../kit";

const pathX = (z) => 2.2 * Math.sin(z / 9);

function runeTexture(THREE) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, 128, 512);
  const r = rng(61);
  g.strokeStyle = "#fff"; g.lineWidth = 5; g.lineCap = "round";
  for (let y = 40; y < 480; y += 46) {
    g.beginPath();
    let x = 30 + r() * 20;
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += 10 + r() * 14; g.lineTo(x, y + (r() - 0.5) * 30); }
    g.stroke();
    if (r() > 0.4) { g.beginPath(); g.arc(64, y + 18, 7, 0, Math.PI * 2); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function pillar(THREE, tex, scale = 1) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: "#1c1826", roughness: 0.8, metalness: 0.2, emissive: "#a35cff", emissiveMap: tex, emissiveIntensity: 1.6 });
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.8, 6.5, 6), mat);
  col.position.y = 3.25;
  g.add(col);
  const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), new THREE.MeshStandardMaterial({ color: "#3b1d63", emissive: "#c38cff", emissiveIntensity: 2.2, roughness: 0.3 }));
  cap.position.y = 7.6; cap.scale.y = 1.6;
  g.add(cap);
  const shards = [];
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.TetrahedronGeometry(0.22, 0), cap.material);
    g.add(s); shards.push(s);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE), color: "#9b5cff", transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.setScalar(6); glow.position.y = 7.4;
  g.add(glow);
  const light = new THREE.PointLight("#a46bff", 40, 22, 1.5);
  light.position.y = 6;
  g.add(light);
  g.scale.setScalar(scale);
  return {
    group: g,
    update(t) {
      cap.rotation.y = t * 0.7;
      shards.forEach((s, i) => {
        const a = t * 0.9 + (i / shards.length) * Math.PI * 2;
        s.position.set(Math.cos(a) * 1.5, 7.2 + Math.sin(t * 1.7 + i) * 0.5, Math.sin(a) * 1.5);
        s.rotation.set(t * 2 + i, t * 1.3, 0);
      });
      const k = 0.8 + 0.2 * Math.sin(t * 2.3);
      mat.emissiveIntensity = 1.3 * k + 0.4;
      glow.material.opacity = 0.45 * k + 0.15;
      light.intensity = 32 * k + 8;
    },
  };
}

export async function buildFog(THREE, { weather = false, lowQ = false } = {}) {
  const r = rng(202);
  const group = new THREE.Group();
  const toxic = weather;
  const fogCol = toxic ? "#3e3450" : "#36403f";
  const sky = skyDome(THREE, toxic ? { top: "#1a1424", mid: "#3e3450", bottom: "#151018" } : { top: "#151b22", mid: "#36403f", bottom: "#121614" });
  group.add(sky.mesh);
  const fog = new THREE.FogExp2(fogCol, toxic ? 0.05 : 0.046);

  const hFn = (x, z) => (fbm2(x * 0.06, z * 0.06, 4, 3) - 0.5) * 2.4 + Math.max(0, Math.abs(x - pathX(z)) - 3) * 0.04;
  const col = (x, z, h) => {
    const n = fbm2(x * 0.2, z * 0.2, 3, 4);
    const onPath = Math.abs(x - pathX(z)) < 1.6;
    if (onPath) return [0.24 + n * 0.08, 0.2 + n * 0.06, 0.15];
    return [0.11 + n * 0.08, 0.17 + n * 0.1, 0.12 + n * 0.05];
  };
  group.add(await terrain(THREE, { w: 160, d: 160, seg: lowQ ? 70 : 120, heightFn: hFn, colorFn: col }));

  const pts = [];
  const N = lowQ ? 520 : 1250;
  const tick = budget();
  for (let i = 0; i < N * 3 && pts.length < N; i++) {
    if (i % 64 === 0) await tick();
    const x = (r() - 0.5) * 140, z = (r() - 0.5) * 140, sc = 1.7 + r() * 1.6;
    // ทางเดินกล้อง: เว้นเกินรัศมีกิ่งล่างสุด (1.25 × ขนาด) ไม่ให้กล้องทะลุต้นไม้
    if (Math.abs(x - pathX(z)) < 1.8 + 1.3 * sc) continue;
    if (Math.hypot(x - pathX(-16), z + 16) < 7) continue; // ลานเสาเวท
    pts.push([x, hFn(x, z) - 0.3, z, sc]);
  }
  group.add(pineForest(THREE, pts, { leaf: "#16241e", leaf2: "#1d2e26", trunk: "#251a14", tiers: 4 }));

  const runes = runeTexture(THREE);
  const pillars = [
    pillar(THREE, runes, 1.25),
    pillar(THREE, runes, 0.8),
    pillar(THREE, runes, 0.75),
  ];
  pillars[0].group.position.set(pathX(-16), hFn(pathX(-16), -16), -16);
  pillars[1].group.position.set(-9, hFn(-9, 6), 6);
  pillars[2].group.position.set(10, hFn(10, -4), -4);
  pillars.forEach((p) => group.add(p.group));

  // คบเพลิงสองข้างทาง + กล่องเสบียง
  const torches = [[pathX(14) + 2.6, 14], [pathX(2) - 2.8, 2]].map(([x, z], i) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.2, 5), new THREE.MeshLambertMaterial({ color: "#3a2616" }));
    const y0 = hFn(x, z);
    pole.position.set(x, y0 + 1.1, z);
    const f = fire(THREE, { scale: 0.42, intensity: 22, dist: 26, embers: lowQ ? 14 : 28, seed: 30 + i });
    f.group.position.set(x, y0 + 2.2, z);
    group.add(pole, f.group);
    return f;
  });
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.8), new THREE.MeshLambertMaterial({ color: "#7a5532" }));
  crate.position.set(pathX(8) + 2.2, hFn(pathX(8) + 2.2, 8) + 0.4, 8);
  crate.rotation.y = 0.5;
  group.add(crate);

  const bank = fogBank(THREE, { count: lowQ ? 18 : 34, box: [70, 3.5, 90], y: 0.2, color: toxic ? "#9c86b4" : "#a9b6b6", opacity: 0.3, size: [14, 30], seed: 21 });
  group.add(bank.group);
  // ลำแสงจันทร์ลอดยอดไม้
  const shafts = [[-4, 10], [5, -2], [-2, -9]].map(([x, z], i) => {
    const s = lightShaft(THREE, { radiusTop: 0.8, radiusBottom: 3.4, height: 26, color: toxic ? "#cbb4ff" : "#cfe2ff", opacity: 0.16 });
    s.mesh.position.set(x, 24, z);
    s.mesh.rotation.z = 0.22 + i * 0.05;
    group.add(s.mesh);
    return s;
  });
  let toxins = null;
  if (toxic) {
    toxins = particles(THREE, { kind: "mote", count: lowQ ? 260 : 600, box: [40, 8, 40], vel: [0.4, 0.25, -0.2], size: 0.12, color: "#a3ff7a", opacity: 0.7, seed: 23, additive: true });
    group.add(toxins.object);
  }
  const hemi = new THREE.HemisphereLight(toxic ? "#7a6a9a" : "#6f7f90", "#0a0d0b", 0.7);
  const moon = new THREE.DirectionalLight("#9fb6d6", 0.45);
  moon.position.set(-20, 40, 10);
  group.add(hemi, moon);

  const cam = camPath(THREE,
    [[pathX(34), 2.6, 34], [pathX(22), 2.3, 22], [pathX(10), 2.2, 10], [pathX(0), 2.4, 0], [pathX(-6) + 0.6, 3.1, -6]],
    [[pathX(24), 2, 24], [pathX(12), 2, 12], [pathX(0), 2.4, 0], [pathX(-12), 4, -12], [pathX(-16), 6.8, -16]],
  );

  return {
    group, fog, cam, events: [],
    update(t, u, H, camPos) {
      pillars.forEach((p) => p.update(t));
      torches.forEach((f) => f.update(t, H));
      bank.update(t);
      shafts.forEach((s) => { s.uniforms.t.value = t; });
      if (toxins) { toxins.update(t, H); toxins.object.position.set(camPos.x, camPos.y - 3, camPos.z); }
    },
  };
}
