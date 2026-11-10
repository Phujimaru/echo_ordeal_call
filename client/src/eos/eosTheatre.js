// ============================================================
//  "โรงละคร" ฉากเปิดสนาม Eos (ผู้ใช้สั่ง 2026-11-10 "เปลี่ยนฉากเปิดใหม่ทั้งหมด ให้สวยเหมือนฉากเปิดอื่นๆ")
//   ฉาก 3 มิติด้วยชุดเครื่องมือเดียวกับฉาก Fodlan (fodlan/kit.js) บนลูกโลกร่วมใบเดิม (ต่อจากช่วงดิ่ง eosFlight.js)
//   ดินแดน Lucis ยามพลบค่ำ (กลางคืน = ฟ้าดาว ไฟเมืองสว่าง):
//    ทะลุชั้นเมฆลงเหนือทะเลสาบ → ร่อนต่ำตามทางหลวงที่มีรถวิ่ง ป่าสน แท่งหินสูง → เชิดขึ้นเห็นนครหลวงในโดมเวทเรืองย้อนแดด
//    → เสาคริสตัล 5 ต้นยิงลำแสงขึ้นฟ้าทีละต้น → พุ่งเข้าหาเสากลาง
//  const th = createEosTheatre(core, { night, lowQ })
//   await th.ready · th.enter() (ใต้แฟลช) · th.frame(k, t) (k = 0..1 ของช่วงฉากนี้) · th.restore() · th.dispose()
//  ของทั้งหมดอยู่ใต้ th.root (core.scene) · ขยับทุกเฟรมด้วย shader/ค่าเดียว ไม่สร้างของใหม่ระหว่างเล่น
// ============================================================
import { skyDome, terrain, water, pineForest, particles, camPath, lightShaft, fogBank, puffTex, softTex, rng, fbm2, smooth, clamp01, span, easeOut, easeInOut, idle, budget, disposeTree } from "../fodlan/kit";

// ---------- ผังโลกของฉาก (หน่วย = เมตรของฉาก) ----------
const LAKE = { x: -35, z: 25, r: 30 };
const CITY = { x: 55, z: -85, r: 30 };
export const roadZ = (x) => 14 * Math.sin(x / 28) - 0.3 * x + 8; // ทางหลวงคดเคี้ยว
const PILLARS = [[-70, 18], [-38, -30], [42, -38], [76, 14], [5, -12]]; // ต้นสุดท้าย = เสากลางที่กล้องพุ่งเข้าหา
const SPIRES = [[-14, -40, 30], [-58, -12, 24], [30, 34, 20], [30, -60, 28], [-8, 46, 18], [64, -26, 22], [-84, -40, 34], [90, -50, 30], [-30, -60, 26]];

const lakeD = (x, z) => Math.hypot(x - LAKE.x, (z - LAKE.z) * 1.15);

function heightAt(x, z) {
  const n = fbm2(x * 0.018 + 4, z * 0.018 + 9, 5, 3);
  let h = 0.4 + (n - 0.45) * 7;
  // ทะเลสาบ: แอ่งลึก ขอบลาด
  const ld = lakeD(x, z);
  if (ld < LAKE.r + 12) h = h * smooth(clamp01((ld - LAKE.r + 4) / 16)) - 3.2 * (1 - smooth(clamp01((ld - LAKE.r + 6) / 10)));
  // ทางหลวง: ปรับพื้นให้เรียบ
  const dr = Math.abs(z - roadZ(x));
  if (dr < 9) h = h * smooth(clamp01((dr - 2.5) / 6.5)) + 0.3 * (1 - smooth(clamp01((dr - 2.5) / 6.5)));
  // เขตเมือง: ลานเรียบ
  const cd = Math.hypot(x - CITY.x, z - CITY.z);
  if (cd < CITY.r + 14) h = h * smooth(clamp01((cd - CITY.r) / 14)) + 0.6 * (1 - smooth(clamp01((cd - CITY.r) / 14)));
  // ภูเขาล้อมรอบไกลๆ
  const R = Math.hypot(x * 0.9, z);
  const rim = smooth(clamp01((R - 105) / 70));
  h += rim * (30 + fbm2(x * 0.04, z * 0.04, 4, 11) * 55);
  return Math.max(h, -4);
}

function colorAt(x, z, h, slope, night) {
  const n = fbm2(x * 0.09, z * 0.09, 3, 8);
  const dr = Math.abs(z - roadZ(x));
  let c;
  if (dr < 2.2) c = [0.2 + n * 0.03, 0.2 + n * 0.03, 0.21];                         // ยางมะตอย
  else if (dr < 3.2) c = [0.62, 0.55, 0.42];                                         // ไหล่ทาง
  else if (lakeD(x, z) < LAKE.r + 2 && h < 0.6) c = [0.74, 0.66, 0.48];             // หาดทรายริมทะเลสาบ
  else if (h > 48) c = [0.86, 0.88, 0.92];                                           // หิมะยอดเขา
  else if (slope > 0.42 || h > 24) c = [0.42 + n * 0.08, 0.38 + n * 0.07, 0.36 + n * 0.06]; // หินผา
  else {
    const dry = clamp01((fbm2(x * 0.03 + 20, z * 0.03, 3, 5) - 0.45) * 2.4);    // ทุ่งหญ้าแห้งสลับเขียว
    c = [0.27 + n * 0.1 + dry * 0.28, 0.42 + n * 0.12 + dry * 0.12, 0.17 + n * 0.05];
  }
  if (night) c = [c[0] * 0.42, c[1] * 0.48, c[2] * 0.7];
  return c;
}

// หน้าต่างเมือง (พื้นผิวลายช่องแสง)
function windowTex(THREE, night) {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, 64, 128);
  const r = rng(night ? 41 : 42);
  for (let y = 4; y < 124; y += 8) for (let x = 4; x < 60; x += 8) {
    if (r() < (night ? 0.55 : 0.28)) { g.fillStyle = r() < 0.7 ? "#ffcf7a" : "#bfe4ff"; g.fillRect(x, y, 4, 5); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// โดมกำแพงเวท: เปลือกครึ่งทรงกลม ขอบสว่าง (fresnel) + ลายหกเหลี่ยมไหลขึ้น · additive ไม่โดนหมอก
function magicDome(THREE, r) {
  const uniforms = { t: { value: 0 }, op: { value: 0.55 }, col: { value: new THREE.Color("#8fdcff") } };
  const m = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: "varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP=position; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }",
    fragmentShader: [
      "uniform float t,op; uniform vec3 col; varying vec3 vN; varying vec3 vV; varying vec3 vP;",
      "float hexd(vec2 p){ p=abs(p); return max(dot(p,normalize(vec2(1.,1.732))),p.x); }",
      "void main(){",
      " float fr=pow(1.-abs(dot(vN,vV)),2.2);",
      " vec2 uv=vec2(atan(vP.z,vP.x)*6.,vP.y*.22-t*.35); vec2 g=vec2(1.,1.732); vec2 a=mod(uv,g)-g*.5; vec2 b=mod(uv-g*.5,g)-g*.5; vec2 q=dot(a,a)<dot(b,b)?a:b;",
      " float line=smoothstep(.46,.5,hexd(q)); float wave=.5+.5*sin(vP.y*.25-t*2.);",
      " float a2=op*(fr*.9+line*.35*wave+.04);",
      " gl_FragColor=vec4(col,a2);",
      "#include <colorspace_fragment>",
      "}",
    ].join("\n"),
  });
  const geo = new THREE.SphereGeometry(r, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
  return { mesh: new THREE.Mesh(geo, m), uniforms };
}

function makeCity(THREE, night, lowQ) {
  const g = new THREE.Group();
  const r = rng(77);
  const win = windowTex(THREE, night);
  const mat = new THREE.MeshLambertMaterial({ color: night ? "#2a3248" : "#5a6478", emissive: "#ffffff", emissiveMap: win, emissiveIntensity: night ? 1.4 : 0.35 });
  const n = lowQ ? 70 : 140;
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(box, mat, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (CITY.r - 4);
    const k = 1 - d / CITY.r;
    const h = 4 + r() * 10 + k * k * 34;
    v.set(CITY.x + Math.cos(a) * d, 0.5, CITY.z + Math.sin(a) * d);
    q.setFromAxisAngle(up, r() * Math.PI);
    s.set(2.2 + r() * 3, h, 2.2 + r() * 3);
    inst.setMatrixAt(i, m4.compose(v, q, s));
  }
  g.add(inst);
  // ป้อมกลางนคร (ยอดแหลมหลายชั้น)
  const stone = new THREE.MeshLambertMaterial({ color: night ? "#323a52" : "#6c7488", emissive: "#ffd89a", emissiveIntensity: night ? 0.25 : 0.05 });
  let y = 0.5;
  for (const [w, hh] of [[11, 14], [8, 16], [5.5, 14], [3.4, 12]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, hh, w), stone);
    b.position.set(CITY.x, y + hh / 2, CITY.z); g.add(b); y += hh;
  }
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.8, 16, 6), stone);
  spire.position.set(CITY.x, y + 8, CITY.z); g.add(spire);
  // กำแพงเมือง
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(CITY.r + 2, CITY.r + 2.6, 5, 64, 1, true), new THREE.MeshLambertMaterial({ color: night ? "#3a3a44" : "#8c8474", side: THREE.DoubleSide }));
  wall.position.set(CITY.x, 2.6, CITY.z); g.add(wall);
  const dome = magicDome(THREE, CITY.r + 6);
  dome.mesh.position.set(CITY.x, 0.4, CITY.z);
  g.add(dome.mesh);
  // แสงเมือง (เรือง)
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE), color: night ? "#ffc070" : "#ffd9a0", transparent: true, opacity: night ? 0.55 : 0.25, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.scale.set(120, 60, 1); glow.position.set(CITY.x, 18, CITY.z);
  g.add(glow);
  return { group: g, dome, win };
}

function makePillar(THREE, x, z, y0) {
  const g = new THREE.Group();
  g.position.set(x, y0, z);
  const rock = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.6, 1.6, 7), new THREE.MeshLambertMaterial({ color: "#6a6460", flatShading: true }));
  rock.position.y = 0.6; g.add(rock);
  const crysMat = new THREE.MeshBasicMaterial({ color: "#9fe6ff", transparent: true, opacity: 0.92 });
  const crys = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), crysMat);
  crys.scale.set(1, 3.4, 1); crys.position.y = 5.4; g.add(crys);
  for (const [dx, dz, s] of [[1.4, 0.4, 0.55], [-1.2, -0.6, 0.45], [0.2, -1.3, 0.4]]) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), crysMat);
    c.scale.set(s, s * 3, s); c.position.set(dx, 1.8 + s * 1.5, dz); c.rotation.z = dx * 0.25; g.add(c);
  }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE), color: "#8fdcff", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  halo.scale.set(18, 18, 1); halo.position.y = 5.4; g.add(halo);
  const beam = lightShaft(THREE, { radiusTop: 1.6, radiusBottom: 2.6, height: 170, color: "#bdf0ff", opacity: 0 });
  beam.mesh.position.y = 175; beam.mesh.material.fog = false; g.add(beam.mesh);
  return { group: g, crys, halo, beam, crysMat };
}

function makeCar(THREE, night) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: "#1c1c22" });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 1.6), paint); body.position.y = 0.65; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 1.4), new THREE.MeshLambertMaterial({ color: "#2b3442" })); cab.position.set(-0.2, 1.25, 0); g.add(cab);
  const wheel = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12); wheel.rotateX(Math.PI / 2);
  const tire = new THREE.MeshLambertMaterial({ color: "#0c0c0c" });
  for (const [x, z] of [[1.1, 0.8], [-1.1, 0.8], [1.1, -0.8], [-1.1, -0.8]]) { const w = new THREE.Mesh(wheel, tire); w.position.set(x, 0.36, z); g.add(w); }
  const lamps = [];
  for (const z of [0.5, -0.5]) {
    const l = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE), color: "#fff2d0", transparent: true, opacity: night ? 1 : 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    l.scale.set(1.6, 1.6, 1); l.position.set(1.75, 0.7, z); g.add(l); lamps.push(l);
  }
  const tail = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(THREE), color: "#ff3a2a", transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  tail.scale.set(1.1, 0.8, 1); tail.position.set(-1.75, 0.7, 0); g.add(tail);
  return g;
}

export function createEosTheatre(core, { night = false, lowQ = false } = {}) {
  const { THREE, scene, camera } = core;
  const root = new THREE.Group();
  root.name = "eos-intro";
  root.visible = false;
  scene.add(root);
  let disposed = false, built = false;
  const saved = { entered: false };
  const S = {};

  const ready = (async () => {
    await idle();
    const tick = budget();
    const grp = new THREE.Group();
    // ท้องฟ้า: พลบค่ำ (ตะวันตกดินหลังนคร) / กลางคืน
    const sunDir = [CITY.x, 9, CITY.z];
    S.sky = skyDome(THREE, night
      ? { top: "#050a1c", mid: "#1b2a55", bottom: "#0b1020", sun: sunDir, sunColor: "#c8d8ff", sunSize: 0.012 }
      : { top: "#35508e", mid: "#f4a96a", bottom: "#4a3a44", sun: sunDir, sunColor: "#ffd08a", sunSize: 0.05 });
    grp.add(S.sky.mesh);
    S.fog = night ? new THREE.Fog("#141c38", 70, 340) : new THREE.Fog("#e9a978", 70, 360);
    if (night) { // ดาว
      const r = rng(9), n = lowQ ? 600 : 1400, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, e = 0.08 + r() * 1.3; pos.set([Math.cos(a) * Math.cos(e) * 800, Math.sin(e) * 800, Math.sin(a) * Math.cos(e) * 800], i * 3); }
      const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      grp.add(new THREE.Points(gg, new THREE.PointsMaterial({ color: "#ffffff", size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 })));
    }
    await tick();
    // พื้นดิน + ทะเลสาบ
    const ground = await terrain(THREE, { w: 360, d: 360, seg: lowQ ? 120 : 200, heightFn: heightAt, colorFn: (x, z, h, sl) => colorAt(x, z, h, sl, night) });
    grp.add(ground);
    S.lake = water(THREE, night
      ? { w: 120, d: 110, seg: lowQ ? 40 : 80, deep: "#0b1a33", shallow: "#1e3a5c", foam: "#9fb8e0", flow: [0.3, 0.1], amp: 0.06, opacity: 0.94 }
      : { w: 120, d: 110, seg: lowQ ? 40 : 80, deep: "#21507a", shallow: "#d99a6a", foam: "#fff0d8", flow: [0.3, 0.1], amp: 0.06, opacity: 0.94 });
    S.lake.mesh.position.set(LAKE.x, -1.1, LAKE.z);
    grp.add(S.lake.mesh);
    await tick();
    // ป่าสน (เป็นกลุ่มตาม noise · เว้นถนน ทะเลสาบ เมือง เสา)
    const r = rng(23), pts = [], N = lowQ ? 700 : 1600;
    for (let i = 0; i < N * 4 && pts.length < N; i++) {
      if (i % 64 === 0) await tick();
      const x = (r() - 0.5) * 300, z = (r() - 0.5) * 300;
      if (fbm2(x * 0.035, z * 0.035, 3, 2) < 0.5) continue;
      if (Math.abs(z - roadZ(x)) < 7 || lakeD(x, z) < LAKE.r + 4 || Math.hypot(x - CITY.x, z - CITY.z) < CITY.r + 10) continue;
      if (PILLARS.some(([px, pz], i) => Math.hypot(x - px, z - pz) < (i === PILLARS.length - 1 ? 22 : 7))) continue; // เสากลาง = ลานโล่งกว้าง (กล้องพุ่งเข้าหาช่วงท้าย)
      if (Math.hypot(x - 18, z - 8) < 12) continue; // ทางกล้องช่วงเชิดขึ้น
      const y = heightAt(x, z);
      if (y > 26) continue;
      pts.push([x, y - 0.2, z, 1.4 + r() * 1.8]);
    }
    grp.add(pineForest(THREE, pts, night ? { leaf: "#13261e", leaf2: "#1b3226", trunk: "#1c140e" } : { leaf: "#2c5a33", leaf2: "#4c7a38", trunk: "#4a3424" }));
    await tick();
    // แท่งหินสูง (ภูมิประเทศเอกลักษณ์ของทุ่งกว้าง)
    const rockMat = new THREE.MeshLambertMaterial({ color: night ? "#3c3a44" : "#b39a80", flatShading: true });
    for (const [x, z, h] of SPIRES) {
      const geo = new THREE.CylinderGeometry(0.5 + (h % 3) * 0.3, 3.8 + (h % 2) * 0.8, h, 6, 6); // ยอดเรียวแหลม ฐานกว้าง (แท่งหินทุ่งกว้าง)
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const yy = p.getY(i), k = 1 + 0.18 * Math.sin(yy * 0.9 + x); p.setX(i, p.getX(i) * k + Math.sin(yy * 0.25 + x) * 0.9); p.setZ(i, p.getZ(i) * k + Math.cos(yy * 0.2 + z) * 0.7); } // ชั้นหินเป็นริ้ว + เอียงคด
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, rockMat);
      m.position.set(x, heightAt(x, z) + h / 2 - 0.5, z);
      grp.add(m);
    }
    // นครหลวง + โดม
    S.city = makeCity(THREE, night, lowQ);
    grp.add(S.city.group);
    // เสาคริสตัล 5 ต้น
    S.pillars = PILLARS.map(([x, z]) => { const p = makePillar(THREE, x, z, heightAt(x, z)); grp.add(p.group); return p; });
    // รถบนทางหลวง
    S.car = makeCar(THREE, night);
    grp.add(S.car);
    // เมฆที่กล้องพุ่งทะลุลงมา + หมอกต่ำเหนือทะเลสาบ + ฝุ่นแสงลอย
    S.clouds = [];
    const cr = rng(17);
    for (let i = 0; i < (lowQ ? 30 : 60); i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(THREE), color: night ? (i % 3 ? "#5a6a9a" : "#3e4a78") : (i % 3 ? "#ffe7cc" : "#f5c49a"), transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
      const a = cr() * Math.PI * 2, d = Math.sqrt(cr()) * 60;
      sp.position.set(-44 + Math.cos(a) * d, 60 + cr() * 45, 58 + Math.sin(a) * d * 0.8);
      const s = 26 + cr() * 30;
      sp.scale.set(s, s * 0.6, 1); sp.material.rotation = cr() * Math.PI;
      sp.userData.op = 0.55 + cr() * 0.4;
      grp.add(sp); S.clouds.push(sp);
    }
    S.mist = fogBank(THREE, { count: lowQ ? 10 : 20, box: [90, 3, 80], y: 0.5, color: night ? "#4a5a88" : "#ffd6b0", opacity: 0.22, size: [22, 40], seed: 5 });
    S.mist.group.position.set(LAKE.x, 0, LAKE.z);
    grp.add(S.mist.group);
    S.motes = particles(THREE, { kind: "snow", count: lowQ ? 300 : 700, box: [70, 24, 70], vel: [0.8, 0.25, 0.3], size: 0.22, color: night ? "#9fdcff" : "#ffe2a8", opacity: 0.55, seed: 21, additive: true });
    grp.add(S.motes.object);
    // แสง
    S.hemi = new THREE.HemisphereLight(night ? "#5a6aa8" : "#ffd6b0", night ? "#0a0c18" : "#3a2e3c", night ? 0.75 : 1.05);
    S.sun = new THREE.DirectionalLight(night ? "#8aa0ff" : "#ffb070", night ? 0.6 : 2.3);
    S.sun.position.set(CITY.x * 2, 40, CITY.z * 2);
    grp.add(S.hemi, S.sun);
    // เส้นทางกล้อง (k = 0..1): เหนือเมฆเหนือทะเลสาบ → ร่อนตามถนน → เชิดขึ้นเห็นนคร/เสา → พุ่งหาเสากลาง
    const [cx, cz] = PILLARS[4], cy = heightAt(cx, cz);
    S.cam = camPath(THREE,
      [[-46, 128, 64], [-40, 58, 52], [-30, 13, roadZ(-30) + 9], [-10, 6.5, roadZ(-10) + 6], [10, 7, roadZ(10) + 5], [22, 16, 14], [16, 13, 8], [cx - 1, cy + 8, cz + 18], [cx - 4, cy + 4.6, cz + 13.4]], // ช็อตจบ: มุมต่ำ เสากลางกลางจอ นครในโดมอยู่ด้านหลังพอดี
      [[-36, 0, 22], [-30, 0, 16], [-5, 3, roadZ(-5)], [18, 3, roadZ(18)], [40, 6, roadZ(40) - 6], [CITY.x, 14, CITY.z], [CITY.x - 10, 12, CITY.z + 20], [cx + 2, cy + 7, cz - 2], [cx + 3, cy + 9, cz - 4]],
    );
    root.add(grp);
    S.grp = grp;
    built = true;
  })();

  const tmp = new THREE.Vector3();
  let lastFov = camera.fov;
  return {
    root, ready,
    get built() { return built; },
    enter() {
      if (saved.entered) return;
      saved.entered = true;
      saved.near = camera.near; saved.far = camera.far; saved.fov = camera.fov; saved.fog = scene.fog;
      saved.worldVis = core.world ? core.world.visible : null;
      saved.sandVis = core.sand ? core.sand.visible : null;
      saved.lights = [];
      scene.children.forEach((o) => { if (o.isLight && o.visible) { saved.lights.push(o); o.visible = false; } });
      if (core.world) core.world.visible = false;
      if (core.sand) core.sand.visible = false;
      camera.near = 0.1; camera.far = 2400; camera.updateProjectionMatrix();
      scene.fog = S.fog || null;
      root.visible = true;
    },
    /** k = 0..1 ของช่วงฉากนี้ · t = วินาทีนาฬิกาฉาก */
    frame(k, t) {
      if (!built) return;
      const kc = easeInOut(clamp01(k)) * 0.55 + clamp01(k) * 0.45;
      const p = S.cam.at(kc);
      camera.position.copy(p.pos);
      camera.lookAt(p.look);
      const fov = 46 + (1 - easeOut(span(k, 0, 0.25))) * 14 - span(k, 0.85, 1) * 6;
      if (Math.abs(fov - lastFov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); lastFov = fov; }
      // เมฆจางเมื่อกล้องลงพ้น
      for (const s of S.clouds) s.material.opacity = s.userData.op * clamp01((camera.position.y - s.position.y + 8) / 18) * (1 - span(k, 0.18, 0.3));
      S.lake.update(t);
      S.mist.update(t);
      S.motes.update(t, core.size?.h || 900);
      S.motes.object.position.set(camera.position.x, camera.position.y - 12, camera.position.z);
      S.city.dome.uniforms.t.value = t;
      // รถวิ่งตามทางหลวง (เร็วกว่ากล้องเล็กน้อย — แซงไปข้างหน้า)
      const cxp = -26 + k * 85, cz = roadZ(cxp) + 1.1;
      S.car.position.set(cxp, heightAt(cxp, cz) + 0.05, cz);
      tmp.set(1, 0, roadZ(cxp + 0.5) - roadZ(cxp - 0.5)).normalize();
      S.car.rotation.y = Math.atan2(-tmp.z, tmp.x);
      // เสาคริสตัล: ยิงลำแสงทีละต้น (เสากลางสุดท้าย สว่างสุด)
      S.pillars.forEach((pl, i) => {
        const on = span(k, 0.5 + i * 0.055, 0.56 + i * 0.055), last = i === S.pillars.length - 1;
        const pulse = 0.85 + 0.15 * Math.sin(t * 3 + i);
        pl.beam.uniforms.op.value = on * (last ? 1.6 : 1.1) * pulse * (night ? 0.8 : 1);
        pl.beam.uniforms.t.value = t;
        pl.halo.material.opacity = (0.15 + on * (last ? 0.85 : 0.6)) * pulse;
        pl.crys.rotation.y = t * 0.6 + i;
        pl.crysMat.color.setHSL(0.54, 0.9, 0.62 + on * 0.18);
      });
    },
    restore() {
      if (!saved.entered) return;
      saved.entered = false;
      root.visible = false;
      camera.near = saved.near; camera.far = saved.far; camera.fov = saved.fov; camera.updateProjectionMatrix();
      scene.fog = saved.fog || null;
      saved.lights.forEach((l) => { l.visible = true; });
      if (core.world && saved.worldVis != null) core.world.visible = saved.worldVis;
      if (core.sand && saved.sandVis != null) core.sand.visible = saved.sandVis;
    },
    dispose() {
      disposed = true;
      this.restore();
      scene.remove(root);
      disposeTree(root);
      S.city?.win?.dispose?.();
      void disposed;
    },
  };
}
