// ด่าน V หลุมศพศักดิ์สิทธิ์ — ห้องโถงหินใต้อารามเรืองแสงเขียว · บัลลังก์หินเรียงสองแถว (ศิลาตราฝังพนักพิง)
//  สุดทางเดิน = แท่นขั้นบันได + บัลลังก์ผู้ให้กำเนิด ลำแสงเขียวส่องลงมา · ช่วงท้าย "แสงเขียวเรือง" พุ่งไล่ไปตามพื้น
import { rng, smooth, span, skyDome, particles, camPath, lightShaft, softTex } from "../kit";

const HALL_L = 120, THRONE_Z = -92;

function floorTextures(THREE) {
  const S = 1024;
  const c = document.createElement("canvas"), e = document.createElement("canvas");
  c.width = e.width = S; c.height = e.height = S;
  const g = c.getContext("2d"), ge = e.getContext("2d");
  g.fillStyle = "#2a2e2c"; g.fillRect(0, 0, S, S);
  ge.fillStyle = "#000"; ge.fillRect(0, 0, S, S);
  const r = rng(91);
  const tile = S / 8;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const v = 36 + r() * 22;
    g.fillStyle = `rgb(${v},${v + 4},${v + 2})`;
    g.fillRect(x * tile + 3, y * tile + 3, tile - 6, tile - 6);
    for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(0,0,0,${r() * 0.15})`; g.fillRect(x * tile + r() * tile, y * tile + r() * tile, 2 + r() * 6, 2 + r() * 6); }
  }
  // ร่องเรืองแสงเขียว (เฉพาะ emissive) — เส้นกลางทาง + ลายวงตรา
  ge.strokeStyle = "#fff"; ge.lineWidth = 6;
  ge.beginPath(); ge.moveTo(S / 2, 0); ge.lineTo(S / 2, S); ge.stroke();
  ge.lineWidth = 3;
  ge.beginPath(); ge.arc(S / 2, S / 2, S * 0.18, 0, Math.PI * 2); ge.stroke();
  ge.beginPath(); ge.arc(S / 2, S / 2, S * 0.24, 0, Math.PI * 2); ge.stroke();
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; ge.beginPath(); ge.moveTo(S / 2 + Math.cos(a) * S * 0.18, S / 2 + Math.sin(a) * S * 0.18); ge.lineTo(S / 2 + Math.cos(a) * S * 0.24, S / 2 + Math.sin(a) * S * 0.24); ge.stroke(); }
  const t = new THREE.CanvasTexture(c), te = new THREE.CanvasTexture(e);
  for (const x of [t, te]) { x.colorSpace = THREE.SRGBColorSpace; x.wrapS = x.wrapT = THREE.RepeatWrapping; x.repeat.set(1, HALL_L / 30); }
  return { t, te };
}

export async function buildTomb(THREE, { lowQ = false } = {}) {
  const r = rng(505);
  const group = new THREE.Group();
  const sky = skyDome(THREE, { top: "#020605", mid: "#06140f", bottom: "#020403" });
  group.add(sky.mesh);
  const fog = new THREE.FogExp2("#06140f", 0.02);

  const { t: ft, te } = floorTextures(THREE);
  const floorMat = new THREE.MeshStandardMaterial({ map: ft, emissiveMap: te, emissive: "#38ff9a", emissiveIntensity: 0.7, roughness: 0.55, metalness: 0.1 });
  // คลื่นแสงเขียวไล่ไปตามพื้น (uniform เดียว ไม่ต้องสร้าง material ใหม่)
  const pulse = { z: { value: 999 } };
  floorMat.onBeforeCompile = (sh) => {
    sh.uniforms.uPz = pulse.z;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp; uniform float uPz;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n totalEmissiveRadiance *= 1. + 5. * exp(-pow((vWp.z - uPz) * .35, 2.));");
  };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, HALL_L), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.z = -HALL_L / 2 + 14;
  group.add(floor);

  const stone = new THREE.MeshStandardMaterial({ color: "#3a403c", roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: "#1e2321", roughness: 0.95 });
  for (const sx of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.5, 40, HALL_L), dark);
    wall.position.set(sx * 15.5, 20, -HALL_L / 2 + 14);
    group.add(wall);
  }
  // เสา
  const PN = 11;
  const pillarG = new THREE.CylinderGeometry(1.05, 1.15, 34, 12);
  const pillars = new THREE.InstancedMesh(pillarG, stone, PN * 2);
  const capG = new THREE.BoxGeometry(3, 1.2, 3);
  const caps = new THREE.InstancedMesh(capG, stone, PN * 4);
  {
    const m = new THREE.Matrix4();
    let i = 0, j = 0;
    for (let k = 0; k < PN; k++) for (const sx of [-1, 1]) {
      const z = 10 - k * 10;
      m.makeTranslation(sx * 10.5, 17, z); pillars.setMatrixAt(i++, m);
      m.makeTranslation(sx * 10.5, 0.6, z); caps.setMatrixAt(j++, m);
      m.makeTranslation(sx * 10.5, 33.5, z); caps.setMatrixAt(j++, m);
    }
  }
  group.add(pillars, caps);

  // บัลลังก์สองแถว (หันเข้าทางเดิน) — ที่นั่ง/พนักพิง/ที่วางแขน + ศิลาตราเรืองแสง
  const TN = 9;
  const seatG = new THREE.BoxGeometry(1.8, 0.9, 1.7);
  const backG = new THREE.BoxGeometry(1.9, 5.2, 0.45);
  const armG = new THREE.BoxGeometry(0.3, 0.5, 1.6);
  const seat = new THREE.InstancedMesh(seatG, stone, TN * 2), back = new THREE.InstancedMesh(backG, stone, TN * 2), arm = new THREE.InstancedMesh(armG, stone, TN * 4);
  const gemMat = new THREE.MeshStandardMaterial({ color: "#1d6f4a", emissive: "#4dffaa", emissiveIntensity: 2.2, roughness: 0.2 });
  const gems = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.28, 0), gemMat, TN * 2);
  const glowSprites = [];
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    let a = 0;
    for (let k = 0; k < TN; k++) for (const [sx, i] of [[-1, k * 2], [1, k * 2 + 1]]) {
      const z = 4 - k * 9.2, x = sx * 6;
      q.setFromAxisAngle(up, sx < 0 ? Math.PI / 2 : -Math.PI / 2);
      const off = (lx, ly, lz) => v.set(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
      m.compose(off(0, 0.45, 0), q, s); seat.setMatrixAt(i, m);
      m.compose(off(0, 2.6, -0.85), q, s); back.setMatrixAt(i, m);
      m.compose(off(-0.95, 1.1, 0), q, s); arm.setMatrixAt(a++, m);
      m.compose(off(0.95, 1.1, 0), q, s); arm.setMatrixAt(a++, m);
      const gp = off(0, 4.2, -0.6).clone();
      m.compose(gp, q, s); gems.setMatrixAt(i, m);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE), color: "#48ff9e", transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
      gl.position.copy(gp); gl.scale.setScalar(2.2); gl.userData.z = z;
      group.add(gl); glowSprites.push(gl);
    }
  }
  group.add(seat, back, arm, gems);

  // แท่นขั้นบันได + บัลลังก์ผู้ให้กำเนิด
  for (let k = 0; k < 4; k++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(16 - k * 3, 0.8, 12 - k * 2.4), stone);
    step.position.set(0, 0.4 + k * 0.8, THRONE_Z - k * 0.4);
    group.add(step);
  }
  const top = 3.2;
  const big = new THREE.Group();
  big.position.set(0, top, THRONE_Z - 1.5);
  const bSeat = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 3), stone); bSeat.position.y = 0.7; big.add(bSeat);
  const bBack = new THREE.Mesh(new THREE.BoxGeometry(3.6, 9, 0.8), stone); bBack.position.set(0, 4.5, -1.3); big.add(bBack);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3, 4), stone); spire.position.set(0, 10.4, -1.3); spire.rotation.y = Math.PI / 4; big.add(spire);
  for (const sx of [-1, 1]) { const a2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 2.8), stone); a2.position.set(sx * 1.7, 1.8, 0); big.add(a2); }
  const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), gemMat);
  crest.position.set(0, 7.2, -0.8); big.add(crest);
  const crestGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE), color: "#5dffb0", transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  crestGlow.scale.setScalar(7); crestGlow.position.copy(crest.position); big.add(crestGlow);
  group.add(big);
  // วงตราลอยหลังบัลลังก์
  const sigil = new THREE.Mesh(new THREE.RingGeometry(5.2, 5.5, 96), new THREE.MeshBasicMaterial({ color: "#5dffb0", transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  sigil.position.set(0, top + 7, THRONE_Z - 4.5);
  const sigil2 = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.75, 6), sigil.material);
  sigil2.position.copy(sigil.position);
  group.add(sigil, sigil2);

  const beam = lightShaft(THREE, { radiusTop: 1.2, radiusBottom: 5, height: 46, color: "#9dffcf", opacity: 0.42 });
  beam.mesh.position.set(0, 46, THRONE_Z - 1);
  group.add(beam.mesh);
  const shafts = [-18, -46, -70].map((z) => {
    const s = lightShaft(THREE, { radiusTop: 0.6, radiusBottom: 2.6, height: 38, color: "#7dffbf", opacity: 0.12 });
    s.mesh.position.set((r() - 0.5) * 4, 38, z);
    group.add(s.mesh);
    return s;
  });

  const dust = particles(THREE, { kind: "mote", count: lowQ ? 260 : 700, box: [26, 18, 110], vel: [0.05, 0.25, -0.1], size: 0.07, color: "#8affc4", opacity: 0.8, seed: 97, additive: true });
  dust.object.position.set(0, 0, -40);
  group.add(dust.object);

  const hemi = new THREE.HemisphereLight("#3a7a5e", "#030806", 0.55);
  const lights = [0, -30, -60].map((z) => { const l = new THREE.PointLight("#3dff9a", 60, 34, 1.4); l.position.set(0, 7, z); group.add(l); return l; });
  const throneLight = new THREE.PointLight("#62ffb4", 240, 50, 1.3);
  throneLight.position.set(0, top + 9, THRONE_Z + 2);
  group.add(hemi, throneLight);

  const cam = camPath(THREE,
    [[0, 18, 22], [0, 11, 0], [0, 6, -30], [0, 4.4, -58], [0, 5, -72]],
    [[0, 4, -20], [0, 3, -45], [0, 4, -75], [0, 7, -92], [0, 8.4, -94]],
  );
  const events = [{ u: 0.7, sfx: "glow_pulse" }, { u: 0.86, sfx: "throne" }];

  return {
    group, fog, cam, events,
    update(t, u, H) {
      dust.update(t, H);
      beam.uniforms.t.value = t;
      shafts.forEach((s) => { s.uniforms.t.value = t; });
      sigil.rotation.z = t * 0.15; sigil2.rotation.z = -t * 0.25;
      crest.rotation.y = t * 0.8;
      // แสงเขียวเรือง: คลื่นแสงวิ่งจากทางเข้าไปหาบัลลังก์ (u 0.7–0.9) แล้วทุกอย่างสว่างขึ้น
      const pk = span(u, 0.7, 0.9);
      pulse.z.value = pk > 0 && pk < 1 ? 14 - pk * (14 - THRONE_Z) : 999;
      const lit = smooth(span(u, 0.82, 0.95));
      gemMat.emissiveIntensity = 2 + Math.sin(t * 3) * 0.4 + lit * 3;
      glowSprites.forEach((g) => { const near = pk > 0 && pk < 1 ? Math.exp(-Math.pow((g.userData.z - pulse.z.value) * 0.2, 2)) : 0; g.material.opacity = 0.4 + 0.2 * Math.sin(t * 2 + g.userData.z) + near * 0.8 + lit * 0.3; });
      crestGlow.material.opacity = 0.7 + lit * 0.3 + Math.sin(t * 4) * 0.1;
      crestGlow.scale.setScalar(7 + lit * 6);
      throneLight.intensity = 220 + lit * 400;
      beam.uniforms.op.value = 0.36 + lit * 0.4;
      lights.forEach((l, i) => { l.intensity = 50 + 15 * Math.sin(t * 2 + i); });
      floorMat.emissiveIntensity = 0.6 + lit * 0.8 + 0.1 * Math.sin(t * 2);
    },
  };
}
