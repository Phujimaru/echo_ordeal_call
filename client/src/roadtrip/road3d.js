// ============================================================
//  โหมด Road Trip (GRID_PLAN §8.8) — ฉากถนน 3D (พอร์ต/ต่อยอดจากต้นแบบ .claude/plans/road-trip-van.html)
//  ภูมิภาค 5 แบบ: plains ทุ่งหญ้า · desert ทะเลทราย (ทราย กระบองเพชร เมซา) · forest ป่าทึบ · snow หิมะ (สน หิมะตก) · ghost เมืองร้าง (บ้านพัง หมอก เสาหัก)
//  กลางวัน/กลางคืน (ฟ้า ดาว จันทร์ ไฟทาง ไฟหน้า) · รถคันอื่น · สิ่งกีดขวางในเลน (state.roadtrip.hazards — เรืองเตือนล่วงหน้า) · ป้ายทางแยก (phase fork) · เส้นความเร็ว/ไนตรัส
//
//  ใช้ 2 แบบ:
//   (ก) createRoadDrive(canvas, { lowQ, onSfx, onAction }) — หน้าขับเต็มจอ (มุมกล้อง 9 แบบ) · update(now, dt, { rt, selfId, cam, look, players })
//   (ข) createRoadUnderlay(canvas, { lowQ }) — ฉากใต้กระดานตอนต่อสู้ (API เดียวกับ board/colony3d.js — boardGeo.setCustomProjection)
//       update(now, dt, { map, units, focus, rotation, zoom, view, night, size, base, roadtrip }) · project(x, y, z) → [lx, ly, s] · unproject · depth · dispose
//  แกนโลก: ถนนวิ่งตามแกน X (หน้ารถ = +X) · เลน −1/0/1 อยู่ที่ z = เลน × LANE · ฉากเลื่อนไป −X ตามความเร็ว (รถอยู่ที่ x = 0 เสมอ)
//  ประสิทธิภาพ: ของข้างทางเป็น InstancedMesh (วางซ้ำ 2 ชุดต่อ SPAN แล้วเลื่อนทั้งกลุ่ม — ไม่ต้องอัปเดตทีละต้น) · เส้นถนน = เท็กซ์เจอร์เลื่อน
//   ไม่สร้างอ็อบเจกต์ใหม่ในลูป · คอมไพล์ shader ล่วงหน้าทั้งกลางวัน/กลางคืน (สลับแล้วไม่สะดุด)
// ============================================================
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createVan, canvasTex, mergeStatic } from "./van3d";
import { takeRtShake } from "../board/roadtrip/rtTimeline";
import { RT_DEFS } from "../board/roadtrip/maps.gen";

export const LANE = 3.3, ROAD_W = 10.8;
export const REGIONS = ["plains", "desert", "forest", "snow", "ghost"];
const SPAN = 300; // ของข้างทางวนทุก 300 หน่วย (2 ชุดต่อกัน)
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (a, b = 0, c = 0) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const strHash = (v) => { const s = String(v); let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ---------------------------------------------------------------- สีประจำภูมิภาค (กลางวัน / กลางคืน)
const REGION = {
  plains: {
    ground: [100, 30, 38, 22, 60], groundBase: "#9fbf6e", shoulder: 0xc9b48a, road: 0xffffff,
    sky: [0x5fa8e6, 0xeaf3f6], skyN: [0x050a1c, 0x1a2446], fog: [0xe2eef4, 45, 230], fogN: [0x141d3a, 30, 125],
    hills: [0x7da86a, 0x6b9a78], sun: [0xfff0d8, 2.6], hemi: [0xe3f3ff, 0x7d6c56, 0.75], clouds: true,
  },
  desert: {
    ground: [36, 12, 52, 30, 72], groundBase: "#e3c48d", shoulder: 0xd8b07a, road: 0xf2e8da,
    sky: [0x3f8ede, 0xf6e7c8], skyN: [0x06081c, 0x2a2440], fog: [0xf3e2c0, 55, 260], fogN: [0x1a1830, 35, 130],
    hills: [0xd9a46a, 0xc98a55], sun: [0xffe6c0, 3.0], hemi: [0xfff4e0, 0x9a7a52, 0.8], clouds: true,
  },
  forest: {
    ground: [105, 40, 26, 26, 42], groundBase: "#5f8a45", shoulder: 0x8a7a5a, road: 0xe8ece8,
    sky: [0x6aa8d8, 0xdfeee6], skyN: [0x040a14, 0x12242a], fog: [0xcfe2d6, 25, 160], fogN: [0x0d1a1e, 18, 95],
    hills: [0x3f6e4a, 0x4d7d52], sun: [0xfff2d8, 2.3], hemi: [0xdff2e6, 0x4a5a3a, 0.7], clouds: true,
  },
  snow: {
    ground: [205, 8, 4, 88, 99], groundBase: "#eef3f7", shoulder: 0xdfe6ee, road: 0xd9dde3,
    sky: [0x8fb4d8, 0xf2f6fa], skyN: [0x060c1e, 0x26324c], fog: [0xe8eef4, 22, 150], fogN: [0x16203a, 18, 100],
    hills: [0xf4f8fb, 0xdfe8f0], sun: [0xf4f8ff, 2.2], hemi: [0xeef6ff, 0x9aa8b8, 0.95], clouds: true,
  },
  ghost: {
    ground: [30, 8, 6, 30, 44], groundBase: "#6b6660", shoulder: 0x5f5850, road: 0x9a9898,
    sky: [0x3a3550, 0x9a8f9a], skyN: [0x05040c, 0x1c1426], fog: [0x8f8a98, 10, 95], fogN: [0x15111e, 8, 72],
    hills: [0x4a4550, 0x3f3a46], sun: [0xd8c8e8, 1.3], hemi: [0xb8b0c8, 0x3a3540, 0.6], clouds: false,
  },
};
const regionOf = (id) => (REGION[id] ? id : "plains");

// ---------------------------------------------------------------- ฉากโลก (ใช้ร่วมทั้งหน้าขับ/ใต้กระดาน)
function createWorld(renderer, scene, { lowQ = false, traffic = true, sceneryShadows = true }) {
  const disposables = [];
  const own = (x) => { disposables.push(x); return x; };
  const std = (color, o = {}) => own(new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02, ...o }));
  const ctex = (w, h, draw) => own(canvasTex(w, h, draw, lowQ ? 2 : 8));
  const shadowsScenery = !lowQ && sceneryShadows; // ใต้กระดาน: ของข้างทางไม่ทอดเงา (เงาอบครั้งเดียว ไม่ต้องวาดใหม่ตอนฉากเลื่อน)

  // ---- ฟ้า ดาว จันทร์
  const skyU = { top: { value: new THREE.Color(0x5fa8e6) }, bot: { value: new THREE.Color(0xeaf3f6) } };
  const sky = new THREE.Mesh(own(new THREE.SphereGeometry(500, 32, 16)), own(new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: "uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h = clamp(vP.y*1.8+0.05,0.,1.); gl_FragColor = vec4(mix(bot,top,pow(h,0.65)),1.); }",
  })));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  const stars = (() => {
    const p = [];
    for (let i = 0; i < 900; i++) { const u = hash(i, 1) * TAU, v = hash(i, 2) * 0.5 + 0.06; p.push(Math.cos(u) * Math.cos(v) * 450, Math.sin(v) * 450, Math.sin(u) * Math.cos(v) * 450); }
    const g = own(new THREE.BufferGeometry()); g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    return new THREE.Points(g, own(new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0, depthWrite: false })));
  })();
  stars.frustumCulled = false; scene.add(stars);
  const glowTex = ctex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const moon = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: ctex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 20, 64, 64, 64); gr.addColorStop(0, "rgba(255,250,230,1)"); gr.addColorStop(0.42, "rgba(255,248,220,1)"); gr.addColorStop(0.5, "rgba(220,230,255,.35)"); gr.addColorStop(1, "rgba(200,210,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = "rgba(200,195,180,.5)"; g.beginPath(); g.arc(54, 56, 7, 0, TAU); g.arc(72, 72, 5, 0, TAU); g.arc(70, 50, 4, 0, TAU); g.fill();
  }), fog: false, transparent: true, depthWrite: false, opacity: 0 })));
  moon.scale.setScalar(70); moon.renderOrder = -9; scene.add(moon);

  // ---- แสง (เงาจากดวงอาทิตย์ตามรถ)
  const hemi = new THREE.HemisphereLight(0xe3f3ff, 0x7d6c56, 0.75); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lowQ ? 1024 : 2048, lowQ ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const SUN_OFF = new THREE.Vector3(12, 20, 9);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; pmrem.dispose();
  scene.environment = envTex;
  const fog = new THREE.Fog(0xe2eef4, 45, 230); scene.fog = fog;

  // ---- พื้น/ถนน (เท็กซ์เจอร์เลื่อนตามระยะทาง)
  const groundTex = {};
  const groundTexOf = (id) => {
    if (groundTex[id]) return groundTex[id];
    const R = REGION[id], [h0, hs, s0, l0, l1] = R.ground;
    const t = ctex(256, 256, (g) => {
      g.fillStyle = R.groundBase; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) { g.fillStyle = `hsl(${h0 + hash(i, 7) * hs - hs / 2},${s0 + hash(i, 8) * 20}%,${l0 + hash(i, 9) * (l1 - l0)}%)`; g.fillRect(hash(i, 1) * 256, hash(i, 2) * 256, 2, 2 + hash(i, 3) * 4); }
      if (id === "ghost") { g.strokeStyle = "rgba(30,25,25,.35)"; g.lineWidth = 2; for (let i = 0; i < 10; i++) { g.beginPath(); g.moveTo(hash(i, 4) * 256, hash(i, 5) * 256); g.lineTo(hash(i, 6) * 256, hash(i, 11) * 256); g.stroke(); } }
      if (id === "snow") { g.fillStyle = "rgba(170,195,220,.35)"; for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(hash(i, 12) * 256, hash(i, 13) * 256, 12 + hash(i, 14) * 20, 4, 0, 0, TAU); g.fill(); } }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(100, 100);
    return (groundTex[id] = t);
  };
  const groundMat = std(0xffffff, { roughness: 1, map: groundTexOf("plains") });
  const groundGeo = own(new THREE.PlaneGeometry(600, 600)); groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, groundMat); ground.receiveShadow = true; scene.add(ground);
  const asphaltTex = ctex(256, 256, (g) => {
    g.fillStyle = "#575c64"; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) { const l = 28 + hash(i, 21) * 22; g.fillStyle = `hsl(215,6%,${l}%)`; g.fillRect(hash(i, 22) * 256, hash(i, 23) * 256, 1.5, 1.5); }
    for (let i = 0; i < 6; i++) { g.strokeStyle = "rgba(20,22,26,.25)"; g.lineWidth = 2; g.beginPath(); g.moveTo(hash(i, 24) * 256, hash(i, 25) * 256); g.lineTo(hash(i, 26) * 256, hash(i, 27) * 256); g.stroke(); }
  });
  asphaltTex.wrapS = asphaltTex.wrapT = THREE.RepeatWrapping; asphaltTex.repeat.set(60, 1.4);
  const roadMat = std(0xffffff, { roughness: 0.92, map: asphaltTex });
  const roadGeo = own(new THREE.PlaneGeometry(600, ROAD_W)); roadGeo.rotateX(-Math.PI / 2);
  const road = new THREE.Mesh(roadGeo, roadMat); road.position.y = 0.012; road.receiveShadow = true; scene.add(road);
  const lineMat = std(0xf3efe2, { roughness: 0.6 });
  const edgeGeo = own(new THREE.PlaneGeometry(600, 0.16)); edgeGeo.rotateX(-Math.PI / 2);
  for (const z of [-ROAD_W / 2 + 0.25, ROAD_W / 2 - 0.25]) { const e = new THREE.Mesh(edgeGeo, lineMat); e.position.set(0, 0.02, z); e.receiveShadow = true; scene.add(e); }
  const dashTex = ctex(64, 8, (g) => { g.clearRect(0, 0, 64, 8); g.fillStyle = "#f3efe2"; g.fillRect(0, 0, 31, 8); });
  dashTex.wrapS = THREE.RepeatWrapping; dashTex.repeat.set(120, 1);
  const dashMat = std(0xffffff, { roughness: 0.6, map: dashTex, transparent: true, alphaTest: 0.5 });
  dashMat.transparent = false;
  const dashGeo = own(new THREE.PlaneGeometry(600, 0.16)); dashGeo.rotateX(-Math.PI / 2);
  for (const z of [-LANE / 2, LANE / 2]) { const d = new THREE.Mesh(dashGeo, dashMat); d.position.set(0, 0.022, z); d.receiveShadow = true; scene.add(d); }
  const shoulderMat = std(0xc9b48a, { roughness: 1 });
  const shGeo = own(new THREE.PlaneGeometry(600, 1.8)); shGeo.rotateX(-Math.PI / 2);
  for (const z of [-ROAD_W / 2 - 0.9, ROAD_W / 2 + 0.9]) { const s = new THREE.Mesh(shGeo, shoulderMat); s.position.set(0, 0.008, z); s.receiveShadow = true; scene.add(s); }

  // ---- ของข้างทาง: InstancedMesh ต่อชิ้นส่วน · วาง 2 ชุด (x, x + SPAN) แล้วเลื่อนทั้งกลุ่ม
  const _o = new THREE.Object3D(), _m = new THREE.Matrix4(), _p = new THREE.Matrix4(), _c = new THREE.Color();
  const partM = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx, order = "XYZ") => {
    _o.position.set(x, y, z); _o.rotation.set(rx, ry, rz, order); _o.scale.set(sx, sy, sz); _o.updateMatrix(); return _o.matrix.clone();
  };
  // prefab = [{ geo, mat, m (Matrix4 เฉพาะชิ้น), tint (ใช้สีต่อต้น), shadow }]
  function scatter(group, prefab, list, x0 = -80) {
    const n = list.length * 2;
    if (!n) return;
    for (const part of prefab) {
      const im = new THREE.InstancedMesh(part.geo, part.mat, n);
      let k = 0;
      for (let copy = 0; copy < 2; copy++) for (const pl of list) {
        _o.position.set(x0 + pl.x + copy * SPAN, pl.y || 0, pl.z); _o.rotation.set(0, pl.ry || 0, pl.tilt || 0, "YXZ"); _o.scale.setScalar(pl.s || 1);
        if (pl.sy) _o.scale.y *= pl.sy;
        _o.updateMatrix();
        _m.multiplyMatrices(_o.matrix, part.m);
        im.setMatrixAt(k, _m);
        if (part.tint) im.setColorAt(k, _c.setHex(pl.c != null ? pl.c : 0xffffff));
        k++;
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = shadowsScenery && part.shadow !== false; im.receiveShadow = true;
      im.computeBoundingSphere();
      group.add(im);
    }
  }
  const G = {}; // เรขาคณิตใช้ร่วม
  const geo = (k, mk) => G[k] || (G[k] = own(mk()));
  const rbox = (w, h, d, r) => own(new RoundedBoxGeometry(w, h, d, 2, r));
  // วัสดุของข้างทาง (สีขาว + สีต่อต้นผ่าน instanceColor)
  const tintMat = std(0xffffff, { roughness: 0.9 });
  const barkMat = std(0x7a5636, { roughness: 1 });
  const metalMat = std(0x9aa3ad, { metalness: 0.6, roughness: 0.35 });
  const woodMat = std(0x6e5034, { roughness: 1 });
  const lampHeadMat = std(0xfff3d0, { emissive: 0xffd68a, emissiveIntensity: 0, roughness: 0.4 });
  const snowMat = std(0xf6f9fc, { roughness: 0.95 });
  const darkWin = std(0x1a1820, { roughness: 0.6, emissive: 0xffb860, emissiveIntensity: 0 });

  const P = {
    pine: () => [
      { geo: geo("trunk", () => new THREE.CylinderGeometry(0.16, 0.24, 1.6, 7)), mat: barkMat, m: partM(0, 0.8, 0) },
      ...[0, 1, 2].map((k) => ({ geo: geo("cone" + k, () => new THREE.ConeGeometry(1.5 - k * 0.35, 1.7, 9)), mat: tintMat, m: partM(0, 1.9 + k * 0.85, 0), tint: true })),
    ],
    snowPine: () => [
      { geo: geo("trunk", () => new THREE.CylinderGeometry(0.16, 0.24, 1.6, 7)), mat: barkMat, m: partM(0, 0.8, 0) },
      ...[0, 1, 2].map((k) => ({ geo: geo("cone" + k, () => new THREE.ConeGeometry(1.5 - k * 0.35, 1.7, 9)), mat: tintMat, m: partM(0, 1.9 + k * 0.85, 0), tint: true })),
      ...[0, 1, 2].map((k) => ({ geo: geo("cap" + k, () => new THREE.ConeGeometry((1.5 - k * 0.35) * 0.62, 0.75, 9)), mat: snowMat, m: partM(0, 2.3 + k * 0.85, 0), shadow: false })),
    ],
    round: () => [
      { geo: geo("trunk", () => new THREE.CylinderGeometry(0.16, 0.24, 1.6, 7)), mat: barkMat, m: partM(0, 0.8, 0) },
      ...[[0, 2.4, 0, 1.1], [0.5, 2.0, 0.3, 0.85], [-0.45, 2.1, -0.35, 0.9], [0.1, 2.95, -0.1, 0.8]].map(([x, y, z, r], k) => ({ geo: geo("ico1", () => new THREE.IcosahedronGeometry(1, 1)), mat: tintMat, m: partM(x, y, z, 0, k, 0, r), tint: true })),
    ],
    palm: () => [
      { geo: geo("trunk", () => new THREE.CylinderGeometry(0.16, 0.24, 1.6, 7)), mat: barkMat, m: partM(0, 1.75, 0, 0, 0, 0, 0.8, 2.2, 0.8) },
      ...[0, 1, 2, 3, 4, 5].map((k) => {
        _o.position.set(0, 3.6, 0); _o.rotation.set(1.15, k / 6 * TAU, 0, "YXZ"); _o.scale.set(1, 1, 1); _o.updateMatrix(); _o.translateY(0.9); _o.updateMatrix();
        return { geo: geo("frond", () => new THREE.ConeGeometry(0.28, 2.2, 5)), mat: tintMat, m: _o.matrix.clone(), tint: true };
      }),
    ],
    bush: () => [{ geo: geo("ico0", () => new THREE.IcosahedronGeometry(0.55, 0)), mat: tintMat, m: partM(0, 0.22, 0, 0, 0, 0, 1, 0.7, 1), tint: true }],
    lamp: () => [
      { geo: geo("pole", () => new THREE.CylinderGeometry(0.08, 0.11, 5.4, 8)), mat: metalMat, m: partM(0, 2.7, 0) },
      { geo: geo("arm", () => new THREE.BoxGeometry(0.08, 0.08, 1.6)), mat: metalMat, m: partM(0, 5.3, 0.75) },
      { geo: geo("lhead", () => rbox(0.5, 0.14, 0.3, 0.05)), mat: lampHeadMat, m: partM(0, 5.22, 1.5), shadow: false },
    ],
    telepole: () => [
      { geo: geo("tpole", () => new THREE.CylinderGeometry(0.1, 0.13, 6, 6)), mat: woodMat, m: partM(0, 3, 0) },
      { geo: geo("tbar", () => new THREE.BoxGeometry(0.1, 0.1, 1.8)), mat: woodMat, m: partM(0, 5.5, 0) },
      { geo: geo("tins", () => new THREE.CylinderGeometry(0.05, 0.05, 0.14, 6)), mat: std(0x6fa8c8, { roughness: 0.3 }), m: partM(0, 5.62, 0.7), shadow: false },
    ],
    saguaro: () => {
      const cm = tintMat, cg = geo("cact", () => new THREE.CylinderGeometry(0.28, 0.32, 1, 9)), cs = geo("cactS", () => new THREE.SphereGeometry(0.3, 9, 6));
      return [
        { geo: cg, mat: cm, m: partM(0, 1.6, 0, 0, 0, 0, 1, 3.2, 1), tint: true },
        { geo: cs, mat: cm, m: partM(0, 3.2, 0, 0, 0, 0, 0.95), tint: true },
        { geo: cg, mat: cm, m: partM(0, 1.5, 0.45, Math.PI / 2, 0, 0, 0.62, 0.8, 0.62), tint: true },
        { geo: cg, mat: cm, m: partM(0, 2.05, 0.8, 0, 0, 0, 0.62, 1.2, 0.62), tint: true },
        { geo: cs, mat: cm, m: partM(0, 2.65, 0.8, 0, 0, 0, 0.6), tint: true },
        { geo: cg, mat: cm, m: partM(0, 1.2, -0.42, -Math.PI / 2, 0, 0, 0.55, 0.7, 0.55), tint: true },
        { geo: cg, mat: cm, m: partM(0, 1.6, -0.72, 0, 0, 0, 0.55, 0.9, 0.55), tint: true },
        { geo: cs, mat: cm, m: partM(0, 2.05, -0.72, 0, 0, 0, 0.53), tint: true },
      ];
    },
    barrel: () => [{ geo: geo("cactS", () => new THREE.SphereGeometry(0.3, 9, 6)), mat: tintMat, m: partM(0, 0.3, 0, 0, 0, 0, 1.4, 1.1, 1.4), tint: true }],
    rock: () => [{ geo: geo("rock", () => new THREE.DodecahedronGeometry(1, 0)), mat: tintMat, m: partM(0, 0.25, 0, 0, 0, 0, 1.2, 0.6, 1), tint: true }],
    mesa: () => [
      { geo: geo("mesa", () => new THREE.CylinderGeometry(9, 11, 14, 7)), mat: tintMat, m: partM(0, 7, 0, 0, 0, 0, 1.4, 1, 1), tint: true, shadow: false },
      { geo: geo("mesaT", () => new THREE.CylinderGeometry(9.2, 9.2, 1.6, 7)), mat: std(0xa8553a, { roughness: 1 }), m: partM(0, 13.4, 0, 0, 0, 0, 1.4, 1, 1), shadow: false },
    ],
    mound: () => [{ geo: geo("mound", () => new THREE.SphereGeometry(1, 12, 6)), mat: snowMat, m: partM(0, 0, 0, 0, 0, 0, 1.7, 0.45, 1.2) }],
    log: () => [{ geo: geo("log", () => new THREE.CylinderGeometry(0.28, 0.3, 3, 8)), mat: barkMat, m: partM(0, 0.28, 0, 0, 0, Math.PI / 2) }],
    deadTree: () => [
      { geo: geo("dtr", () => new THREE.CylinderGeometry(0.1, 0.2, 3.2, 6)), mat: tintMat, m: partM(0, 1.6, 0), tint: true },
      { geo: geo("dbr", () => new THREE.CylinderGeometry(0.03, 0.07, 1.4, 5)), mat: tintMat, m: partM(0.35, 2.6, 0, 0, 0, -0.9), tint: true },
      { geo: geo("dbr", () => new THREE.CylinderGeometry(0.03, 0.07, 1.4, 5)), mat: tintMat, m: partM(-0.3, 2.2, 0.1, 0.3, 0, 0.8), tint: true },
      { geo: geo("dbr", () => new THREE.CylinderGeometry(0.03, 0.07, 1.4, 5)), mat: tintMat, m: partM(0, 3.1, -0.3, -0.7, 0, 0.1, 0.8), tint: true },
    ],
    house: () => [
      { geo: geo("hBody", () => new THREE.BoxGeometry(4, 3, 4)), mat: tintMat, m: partM(0, 1.5, 0), tint: true },
      { geo: geo("hRoof", () => new THREE.CylinderGeometry(2.4, 2.4, 4.3, 3, 1)), mat: std(0x3a2e2a, { roughness: 1 }), m: partM(0.2, 3.65, 0, 0.18, 0, Math.PI / 2, 1, 1, 0.55) },
      { geo: geo("hWin", () => new THREE.BoxGeometry(0.06, 0.8, 0.9)), mat: darkWin, m: partM(2.01, 1.8, -0.9), shadow: false },
      { geo: geo("hWin", () => new THREE.BoxGeometry(0.06, 0.8, 0.9)), mat: darkWin, m: partM(2.01, 1.8, 0.9), shadow: false },
      { geo: geo("hDoor", () => new THREE.BoxGeometry(0.9, 1.7, 0.06)), mat: darkWin, m: partM(0, 0.85, 2.01), shadow: false },
      { geo: geo("hRub", () => new THREE.DodecahedronGeometry(0.5, 0)), mat: tintMat, m: partM(-2.4, 0.2, 1.6, 0, 0, 0, 1.3, 0.6, 1), tint: true },
    ],
    brokenPole: () => [
      { geo: geo("pole", () => new THREE.CylinderGeometry(0.08, 0.11, 5.4, 8)), mat: metalMat, m: partM(0, 2.7, 0) },
      { geo: geo("arm", () => new THREE.BoxGeometry(0.08, 0.08, 1.6)), mat: metalMat, m: partM(0, 5.3, 0.75, 0.4, 0, 0) },
      { geo: geo("lhead", () => rbox(0.5, 0.14, 0.3, 0.05)), mat: lampHeadMat, m: partM(0, 5.0, 1.45, 0.6, 0, 0), shadow: false },
    ],
    fence: () => [
      { geo: geo("fPost", () => new THREE.BoxGeometry(0.12, 1, 0.12)), mat: woodMat, m: partM(0, 0.5, 0) },
      { geo: geo("fRail", () => new THREE.BoxGeometry(3, 0.1, 0.06)), mat: woodMat, m: partM(1.5, 0.75, 0) },
      { geo: geo("fRail", () => new THREE.BoxGeometry(3, 0.1, 0.06)), mat: woodMat, m: partM(1.5, 0.4, 0) },
    ],
  };

  // ตำแหน่งของข้างทางแต่ละภูมิภาค (คงที่ด้วย hash) — x ∈ [0, SPAN) · side ±1
  const sideZ = (i, s, near, far) => (hash(i, s, 7) < 0.5 ? -1 : 1) * (ROAD_W / 2 + near + hash(i, s, 8) * (far - near));
  const place = (n, seed, near, far, f = () => ({})) => {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: hash(i, seed, 1) * SPAN, z: sideZ(i, seed, near, far), ry: hash(i, seed, 3) * TAU, s: 0.8 + hash(i, seed, 4) * 0.6, ...f(i) });
    return out;
  };
  const pick = (arr, i, s) => arr[Math.floor(hash(i, s, 5) * arr.length) % arr.length];
  const lampList = (step, side = -1) => { const o = []; for (let x = 0; x < SPAN; x += step) o.push({ x, z: side * (ROAD_W / 2 + 1.2), ry: side < 0 ? 0 : Math.PI, s: 1 }); return o; };
  const LEAF = [0x5f9a4a, 0x76ad52, 0x4e8a5a, 0x8db85a];
  const sets = {}; const lampPts = {};
  function buildSet(id) {
    const g = new THREE.Group(); g.name = "scenery-" + id;
    const lamps = [];
    if (id === "plains") {
      scatter(g, P.pine(), place(36, 1, 3, 42, (i) => ({ c: pick(LEAF, i, 1) })));
      scatter(g, P.round(), place(40, 2, 3, 44, (i) => ({ c: pick(LEAF, i, 2) })));
      scatter(g, P.palm(), place(18, 3, 3, 30, (i) => ({ c: pick(LEAF, i, 3), s: 0.9 + hash(i, 3, 4) * 0.4 })));
      scatter(g, P.bush(), place(90, 4, 2, 16, (i) => ({ c: pick(LEAF, i, 4) })));
      scatter(g, P.fence(), place(14, 5, 6, 12, () => ({ ry: 0, s: 1 })));
      const ll = lampList(18); scatter(g, P.lamp(), ll); lamps.push(...ll);
    } else if (id === "desert") {
      const CACT = [0x4f8a4a, 0x5f9a52, 0x6a9a5a];
      scatter(g, P.saguaro(), place(46, 11, 3, 50, (i) => ({ c: pick(CACT, i, 1), s: 0.8 + hash(i, 11, 4) * 0.7 })));
      scatter(g, P.barrel(), place(50, 12, 2, 22, (i) => ({ c: pick(CACT, i, 2), s: 0.6 + hash(i, 12, 4) * 0.6 })));
      scatter(g, P.rock(), place(60, 13, 2, 45, (i) => ({ c: pick([0xc99a6a, 0xb8875a, 0xd8b088], i, 3), s: 0.4 + hash(i, 13, 4) * 1.3 })));
      scatter(g, P.mesa(), place(9, 14, 70, 150, (i) => ({ c: pick([0xc9784a, 0xd98a55, 0xb86a40], i, 4), s: 0.8 + hash(i, 14, 4) * 0.9 })));
      scatter(g, P.telepole(), lampList(24, 1));
    } else if (id === "forest") {
      const DARK = [0x2f6a3a, 0x3a7a42, 0x2a5a36, 0x46804a];
      scatter(g, P.pine(), place(120, 21, 2.5, 40, (i) => ({ c: pick(DARK, i, 1), s: 1 + hash(i, 21, 4) * 0.9 })));
      scatter(g, P.round(), place(70, 22, 3, 40, (i) => ({ c: pick(DARK, i, 2), s: 0.9 + hash(i, 22, 4) * 0.6 })));
      scatter(g, P.bush(), place(110, 23, 1.6, 12, (i) => ({ c: pick([0x3f7a3a, 0x4f8a42, 0x5a8a3a], i, 3) })));
      scatter(g, P.log(), place(14, 24, 2.5, 12));
      scatter(g, P.rock(), place(20, 25, 2, 20, (i) => ({ c: pick([0x7a7f78, 0x8a8f86], i, 3), s: 0.4 + hash(i, 25, 4) * 0.8 })));
    } else if (id === "snow") {
      const SP = [0x2f5a48, 0x355f4c, 0x2a4f42];
      scatter(g, P.snowPine(), place(100, 31, 3, 44, (i) => ({ c: pick(SP, i, 1), s: 0.9 + hash(i, 31, 4) * 0.8 })));
      scatter(g, P.mound(), place(60, 32, 2, 30, () => ({ ry: 0 })));
      scatter(g, P.rock(), place(24, 33, 2, 26, (i) => ({ c: pick([0x9aa4ae, 0x8a949e], i, 3), s: 0.4 + hash(i, 33, 4) * 0.9 })));
      const ll = lampList(22); scatter(g, P.lamp(), ll); lamps.push(...ll);
    } else if (id === "ghost") {
      scatter(g, P.house(), place(18, 41, 7, 36, (i) => ({ c: pick([0x7a6e66, 0x6a625e, 0x8a7a70, 0x5e5a62], i, 1), s: 0.85 + hash(i, 41, 4) * 0.4 })));
      scatter(g, P.deadTree(), place(50, 42, 2.5, 40, (i) => ({ c: pick([0x3a322e, 0x4a3f38, 0x2e2a2a], i, 2) })));
      scatter(g, P.rock(), place(40, 43, 2, 24, (i) => ({ c: pick([0x5a5550, 0x6a645e], i, 3), s: 0.3 + hash(i, 43, 4) * 0.8 })));
      const bp = []; for (let x = 0; x < SPAN; x += 20) bp.push({ x, z: -(ROAD_W / 2 + 1.2), ry: 0, s: 1, tilt: (hash(x, 44) - 0.5) * 0.7 });
      scatter(g, P.brokenPole(), bp); lamps.push(...bp.filter((_, i) => i % 2 === 0));
    }
    // แสงไฟทาง (กลางคืน) = จุดเรืองแสง 1 draw call
    if (lamps.length) {
      const pts = [];
      for (let copy = 0; copy < 2; copy++) for (const l of lamps) pts.push(-80 + l.x + copy * SPAN, 5.18, l.z + (l.z < 0 ? 1.5 : -1.5));
      const pg = own(new THREE.BufferGeometry()); pg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      const pm = own(new THREE.PointsMaterial({ map: glowTex, color: id === "ghost" ? 0xb8ffd8 : 0xffd68a, size: 4.5, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      const pp = new THREE.Points(pg, pm); g.add(pp); lampPts[id] = pm;
    }
    g.visible = false; scene.add(g);
    if (clipPlanes) applyClip(g);
    return (sets[id] = g);
  }
  const setOf = (id) => sets[id] || buildSet(id);
  // ระนาบตัดของข้างทาง (ฉากใต้กระดาน: ของที่อยู่ระหว่างกล้องกับกระดานไม่บังหน้ากล้อง)
  let clipPlanes = null;
  function applyClip(root) { root.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.clippingPlanes = clipPlanes; }); }); }
  function setClip(planes) { clipPlanes = planes; for (const k in sets) applyClip(sets[k]); for (const k in hillSets) applyClip(hillSets[k]); }

  // ---- ภูเขาไกล (ต่อภูมิภาค · ไม่เลื่อน)
  const hillGeo = own(new THREE.SphereGeometry(1, 20, 10)), mountGeo = own(new THREE.ConeGeometry(1, 1, 7));
  const hillSets = {};
  function hillsOf(id) {
    if (hillSets[id]) return hillSets[id];
    const R = REGION[id], cone = id === "snow" || id === "forest";
    const im = new THREE.InstancedMesh(cone ? mountGeo : hillGeo, tintMat, 16);
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1;
      _o.position.set(-220 + i * 32, cone ? 0 : -2, side * (115 + hash(i, 4) * 60)); _o.rotation.set(0, hash(i, 6) * TAU, 0);
      if (cone) _o.scale.set(26 + hash(i, 1) * 24, 22 + hash(i, 2) * 26, 26 + hash(i, 3) * 20); else _o.scale.set(30 + hash(i, 1) * 40, 10 + hash(i, 2) * 14, 18 + hash(i, 3) * 10);
      _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); im.setColorAt(i, _c.setHex(R.hills[i % 2]));
    }
    im.computeBoundingSphere(); im.visible = false; scene.add(im);
    if (id === "snow") {
      // ยอดหิมะ (กรวยเล็กครอบยอดเขา)
      const caps = new THREE.InstancedMesh(mountGeo, snowMat, 16);
      _p.compose(new THREE.Vector3(0, 0.31, 0), new THREE.Quaternion(), new THREE.Vector3(0.43, 0.38, 0.43));
      for (let i = 0; i < 16; i++) { im.getMatrixAt(i, _m); _m.multiply(_p); caps.setMatrixAt(i, _m); }
      caps.computeBoundingSphere(); caps.visible = false; scene.add(caps); im.userData.caps = caps;
    }
    return (hillSets[id] = im);
  }

  // ---- เมฆ (กลางวัน)
  const cloudMat = std(0xffffff, { roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.15 });
  const cloudIM = new THREE.InstancedMesh(own(new THREE.IcosahedronGeometry(1, 1)), cloudMat, 48);
  const clouds = [];
  for (let i = 0; i < 12; i++) clouds.push({ x: -170 + i * 29, y: 36 + hash(i, 5) * 14, z: -90 + hash(i, 6) * 180, puffs: [0, 1, 2, 3].map((k) => [k * 2.4 - 3.6, hash(i, k, 1) * 1.5, (hash(i, k, 2) - 0.5) * 3, 2 + hash(i, k) * 2.2]) });
  cloudIM.frustumCulled = false; scene.add(cloudIM);
  function placeClouds() {
    let k = 0;
    for (const c of clouds) for (const [px, py, pz, r] of c.puffs) { _o.position.set(c.x + px, c.y + py, c.z + pz); _o.rotation.set(0, 0, 0); _o.scale.set(r, r * 0.6, r); _o.updateMatrix(); cloudIM.setMatrixAt(k++, _o.matrix); }
    cloudIM.instanceMatrix.needsUpdate = true;
  }
  placeClouds();

  // ---- หิมะตก / เถ้าลอย (shader — ไม่อัปเดตบน CPU)
  const PART_N = lowQ ? 1400 : 3200;
  const partU = { uTime: { value: 0 }, uScroll: { value: 0 }, uColor: { value: new THREE.Color(0xffffff) }, uFall: { value: 3 }, uSize: { value: 0.12 }, uOpacity: { value: 0 }, uDrift: { value: 1 } };
  const particles = (() => {
    const p = new Float32Array(PART_N * 3), sd = new Float32Array(PART_N);
    for (let i = 0; i < PART_N; i++) { p[i * 3] = hash(i, 61) * 110; p[i * 3 + 1] = hash(i, 62) * 22; p[i * 3 + 2] = (hash(i, 63) - 0.5) * 70; sd[i] = hash(i, 64); }
    const g = own(new THREE.BufferGeometry()); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("seed", new THREE.BufferAttribute(sd, 1));
    const m = own(new THREE.ShaderMaterial({
      uniforms: partU, transparent: true, depthWrite: false, fog: false,
      vertexShader: `uniform float uTime; uniform float uScroll; uniform float uFall; uniform float uSize; uniform float uDrift; attribute float seed; varying float vA;
        void main(){ vec3 p = position; p.y = mod(p.y - uTime * uFall * (0.7 + seed * 0.6), 22.0);
          p.x = mod(p.x - uScroll + sin(uTime * 0.8 + seed * 20.0) * uDrift, 110.0) - 40.0; p.z += sin(uTime * 0.6 + seed * 31.0) * uDrift;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * (0.6 + seed) * 600.0 / max(1.0, -mv.z); vA = smoothstep(80.0, 20.0, -mv.z); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.1, length(d)); gl_FragColor = vec4(uColor, a * uOpacity * vA); }`,
    }));
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.visible = false; return pts;
  })();
  scene.add(particles);

  // ---- รถคันอื่น (หน้าขับเท่านั้น)
  const CAR_COLS = [0xe8504a, 0xf2c94c, 0x5aa0e0, 0xf0f0ea, 0x3fae7a, 0x9b6bd8];
  const carGlass = std(0x22323f, { roughness: 0.1, metalness: 0.3 });
  const carTire = std(0x1e1f22);
  const carTail = std(0xd8342c, { emissive: 0xff2a1a, emissiveIntensity: 0.6 });
  const carHead = std(0xfff6d8, { emissive: 0xfff2c0, emissiveIntensity: 0.2 });
  const carBodyG = rbox(4.3, 0.85, 2.0, 0.25), carCabG = rbox(2.3, 0.75, 1.8, 0.25), carGlG = rbox(2.32, 0.5, 1.82, 0.2);
  const carWheelG = own(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16)), carLtG = own(new THREE.BoxGeometry(0.06, 0.18, 0.36));
  function makeCar(i, parent, crashed = false) {
    const g = new THREE.Group();
    const paintC = own(new THREE.MeshPhysicalMaterial({ color: CAR_COLS[i % CAR_COLS.length], roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    add(carBodyG, paintC, 0, 0.85, 0); add(carCabG, paintC, -0.3, 1.6, 0); add(carGlG, carGlass, -0.3, 1.65, 0).scale.set(0.98, 1, 1.002);
    for (const x of [1.35, -1.35]) for (const z of [0.9, -0.9]) add(carWheelG, carTire, x, 0.42, z).rotation.x = Math.PI / 2;
    for (const z of [0.7, -0.7]) { add(carLtG, crashed ? carTail : carTail, -2.16, 1.0, z); add(carLtG, carHead, 2.16, 1.0, z); }
    mergeStatic(g); parent.add(g); return g;
  }
  const trafficCars = [];
  const trafficG = new THREE.Group(); scene.add(trafficG);
  if (traffic) for (let i = 0; i < 5; i++) trafficCars.push({ car: makeCar(i, trafficG), lane: [-1, 0, 1][i % 3], z: 0, v: 10, x: 40 + i * 30 });
  trafficCars.forEach((t) => { t.z = t.lane * LANE; });
  trafficG.visible = traffic;

  // ---- สิ่งกีดขวาง (state.roadtrip.hazards) + แถบเรืองเตือนในเลน
  const HZ_KINDS = ["rock", "cones", "car", "log", "pothole"];
  const coneMat = std(0xff7a1a, { roughness: 0.5 }), stripeMat = std(0xffffff, { roughness: 0.5 }), rockMat = std(0x8a8580, { roughness: 1 }), holeMat = std(0x18191c, { roughness: 1 });
  function hazardModel(kind) {
    const g = new THREE.Group();
    const add = (geo0, mat, x, y, z) => { const m = new THREE.Mesh(geo0, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    if (kind === "rock") { add(geo("hzRock", () => new THREE.DodecahedronGeometry(1.1, 0)), rockMat, 0, 0.7, 0).scale.set(1.2, 0.85, 1); add(geo("hzRock", () => null), rockMat, 0.9, 0.35, 0.7).scale.setScalar(0.45); }
    else if (kind === "cones") for (const z of [-1, 0, 1]) { add(geo("hzCone", () => new THREE.ConeGeometry(0.32, 0.9, 12)), coneMat, (z & 1) * 0.6, 0.45, z * 1.0); add(geo("hzStripe", () => new THREE.CylinderGeometry(0.2, 0.25, 0.14, 12)), stripeMat, (z & 1) * 0.6, 0.48, z * 1.0); }
    else if (kind === "car") { const c = makeCar(3, g, true); c.rotation.set(0.08, 0.6, 0.25); c.position.y = 0.1; }
    else if (kind === "log") { add(geo("hzLog", () => new THREE.CylinderGeometry(0.45, 0.5, 3.0, 10)), barkMat, 0, 0.45, 0).rotation.x = Math.PI / 2; }
    else { const h = add(geo("hzHole", () => new THREE.CircleGeometry(1.1, 18)), holeMat, 0, 0.03, 0); h.rotation.x = -Math.PI / 2; h.scale.set(1, 0.75, 1); h.castShadow = false; add(geo("hzHole", () => null), holeMat, 0.9, 0.031, 0.8).rotation.x = -Math.PI / 2; }
    return g;
  }
  const warnGeo = own(new THREE.PlaneGeometry(1, 2.6)); warnGeo.rotateX(-Math.PI / 2); warnGeo.translate(-0.5, 0, 0);
  const warnTex = ctex(128, 32, (g) => { const gr = g.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, "rgba(255,80,50,0)"); gr.addColorStop(0.7, "rgba(255,80,50,.8)"); gr.addColorStop(1, "rgba(255,200,80,1)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 32); for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(255,240,200,.5)"; g.beginPath(); g.moveTo(20 + k * 18, 4); g.lineTo(30 + k * 18, 16); g.lineTo(20 + k * 18, 28); g.lineTo(26 + k * 18, 16); g.fill(); } });
  const hzSlots = [];
  const hzG = new THREE.Group(); scene.add(hzG);
  for (let i = 0; i < 6; i++) {
    const root = new THREE.Group(); root.visible = false; hzG.add(root);
    const warn = new THREE.Mesh(warnGeo, own(new THREE.MeshBasicMaterial({ map: warnTex, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending, fog: false })));
    warn.position.y = 0.04; warn.renderOrder = 3; root.add(warn);
    hzSlots.push({ root, warn, models: {}, id: null, kind: null, arr: 0, lane: 0, hit: false, fly: 0 });
  }

  // ---- ป้ายทางแยก (phase fork): ซุ้มคร่อมถนน ป้าย 2–3 ใบ (ไอคอน + ลูกศร)
  const FORK_ICON = { gas: "⛽", motel: "🛏️", fight: "⚔️", elite: "💀", event: "❓", boss: "👹" };
  const FORK_COL = { gas: "#ff8a3d", motel: "#5aa0e0", fight: "#d9534f", elite: "#8a3fd8", event: "#3fae7a", boss: "#2a1a1a" };
  const gantry = new THREE.Group(); gantry.visible = false; scene.add(gantry);
  {
    const m = std(0x5d6670, { metalness: 0.6, roughness: 0.4 });
    for (const z of [-ROAD_W / 2 - 1, ROAD_W / 2 + 1]) { const p = new THREE.Mesh(own(new THREE.CylinderGeometry(0.18, 0.22, 7.2, 10)), m); p.position.set(0, 3.6, z); p.castShadow = true; gantry.add(p); }
    const beam = new THREE.Mesh(own(new THREE.BoxGeometry(0.4, 0.4, ROAD_W + 2.4)), m); beam.position.set(0, 7, 0); beam.castShadow = true; gantry.add(beam);
  }
  const signSlots = [];
  for (let i = 0; i < 3; i++) {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 192;
    const t = own(new THREE.CanvasTexture(cv)); t.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(own(new THREE.PlaneGeometry(3.0, 2.25)), own(new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.35, roughness: 0.6, side: THREE.DoubleSide })));
    mesh.rotation.y = -Math.PI / 2; mesh.position.set(-0.25, 5.6, 0); gantry.add(mesh);
    signSlots.push({ cv, t, mesh, key: "" });
  }
  function drawSign(s, kind, dir) {
    const k = `${kind}|${dir}`;
    if (s.key === k) return;
    s.key = k;
    const g = s.cv.getContext("2d");
    g.fillStyle = FORK_COL[kind] || "#2d333b"; g.fillRect(0, 0, 256, 192);
    g.strokeStyle = "#fff"; g.lineWidth = 8; g.strokeRect(8, 8, 240, 176);
    g.font = '96px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(FORK_ICON[kind] || "❔", 128, 84);
    // ลูกศรทิศ
    g.fillStyle = "#fff"; g.save(); g.translate(128, 158); g.rotate(dir * 0.7);
    g.beginPath(); g.moveTo(0, -20); g.lineTo(18, 2); g.lineTo(7, 2); g.lineTo(7, 18); g.lineTo(-7, 18); g.lineTo(-7, 2); g.lineTo(-18, 2); g.closePath(); g.fill(); g.restore();
    s.t.needsUpdate = true;
  }

  // ---- เส้นความเร็ว (ไนตรัส/เร็วมาก)
  const SL_N = 56;
  const slMat = own(new THREE.MeshBasicMaterial({ color: 0xdff6ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  const speedLines = new THREE.InstancedMesh(own(new THREE.BoxGeometry(1, 0.025, 0.025)), slMat, SL_N);
  const slData = []; for (let i = 0; i < SL_N; i++) { const a = hash(i, 71) * TAU, r = 2.6 + hash(i, 72) * 7; slData.push({ x: (hash(i, 73) - 0.5) * 70, y: 1.6 + Math.sin(a) * r * 0.6, z: Math.cos(a) * r, len: 2 + hash(i, 74) * 5 }); }
  speedLines.frustumCulled = false; speedLines.visible = false; scene.add(speedLines);

  // ---------------------------------------------------------------- สถานะฉาก
  const W = {
    region: "plains", regionTo: null, fade: 0, nightK: 0, night: false, scroll: 0, t: 0, flicker: 1,
    pal: { skyT: new THREE.Color(), skyB: new THREE.Color(), fog: new THREE.Color(), sun: new THREE.Color(), hemiS: new THREE.Color(), hemiG: new THREE.Color() },
  };
  const _ca = new THREE.Color(), _cb = new THREE.Color();
  function showRegion(id) {
    for (const k in sets) sets[k].visible = false;
    for (const k in hillSets) { hillSets[k].visible = false; if (hillSets[k].userData.caps) hillSets[k].userData.caps.visible = false; }
    setOf(id).visible = true;
    const h = hillsOf(id); h.visible = true; if (h.userData.caps) h.userData.caps.visible = true;
    groundMat.map = groundTexOf(id);
    const R = REGION[id];
    shoulderMat.color.setHex(R.shoulder); roadMat.color.setHex(R.road);
    dashMat.visible = id !== "ghost";
    cloudIM.visible = R.clouds;
    particles.visible = id === "snow" || id === "ghost";
    partU.uColor.value.setHex(id === "snow" ? 0xffffff : 0xb8b0c8); partU.uFall.value = id === "snow" ? 2.6 : 0.35; partU.uSize.value = id === "snow" ? 0.11 : 0.07; partU.uDrift.value = id === "snow" ? 1.2 : 2.5;
    W.region = id;
  }
  function setRegion(id, instant = false) {
    id = regionOf(id);
    if (!W.inited) { W.inited = true; instant = true; } // ครั้งแรก = ไม่จางหมอก
    if (id === W.region && !W.regionTo) return;
    if (instant || !sets[W.region]) { W.regionTo = null; W.fade = 0; showRegion(id); return; }
    if (W.regionTo === id) return;
    W.regionTo = id; W.fadeT = 0;
  }
  function setNight(on) { if (W.nightInit == null) { W.nightInit = true; W.nightK = on ? 1 : 0; } W.night = !!on; }

  function applyPalette() {
    const R = REGION[W.region], n = W.nightK;
    const mix = (a, b, out) => out.setHex(a).lerp(_cb.setHex(b), n);
    mix(R.sky[0], R.skyN[0], skyU.top.value); mix(R.sky[1], R.skyN[1], skyU.bot.value);
    mix(R.fog[0], R.fogN[0], fog.color);
    // เปลี่ยนภูมิภาค: หมอกหนาขึ้นช่วงสั้นๆ แล้วสลับฉากตอนมองไม่เห็น
    const fd = W.fade;
    fog.near = lerp(lerp(R.fog[1], R.fogN[1], n), 4, fd); fog.far = lerp(lerp(R.fog[2], R.fogN[2], n), 22, fd);
    hemi.color.setHex(R.hemi[0]).lerp(_ca.setHex(0x6f86c8), n); hemi.groundColor.setHex(R.hemi[1]).lerp(_ca.setHex(0x1a1a28), n);
    hemi.intensity = lerp(R.hemi[2], 0.32, n);
    sun.color.setHex(R.sun[0]).lerp(_ca.setHex(0x9fb6ff), n); sun.intensity = lerp(R.sun[1], 0.42, n);
    scene.environmentIntensity = lerp(1, 0.18, n);
    stars.material.opacity = n * 0.9; moon.material.opacity = n;
    cloudMat.color.setHex(0xffffff).lerp(_ca.setHex(0x4a5578), n); cloudMat.emissiveIntensity = 0.15 * (1 - n);
    partU.uOpacity.value = W.region === "snow" ? 0.95 : 0.55;
    const flick = W.region === "ghost" ? W.flicker : 1;
    lampHeadMat.emissiveIntensity = n * 2.5 * flick;
    for (const k in lampPts) lampPts[k].opacity = n * 0.85 * (k === "ghost" ? flick : 1);
    darkWin.emissiveIntensity = W.region === "ghost" ? n * 0.6 * (W.flicker > 0.5 ? 1 : 0.2) : 0;
    carTail.emissiveIntensity = lerp(0.6, 2, n); carHead.emissiveIntensity = lerp(0.2, 2.2, n);
    for (const s of signSlots) s.mesh.material.emissiveIntensity = lerp(0.35, 1.1, n);
  }

  // ---- ทุกเฟรม: dx = ระยะที่ฉากเลื่อน (หน่วยโลก) · focus = จุดศูนย์กลางเงา (รถ)
  function update(dt, t, dx, focusX = 0, focusZ = 0) {
    W.t = t;
    W.nightK += ((W.night ? 1 : 0) - W.nightK) * Math.min(1, dt * 1.4);
    if (Math.abs(W.nightK - (W.night ? 1 : 0)) < 0.002) W.nightK = W.night ? 1 : 0;
    if (W.regionTo) {
      W.fadeT += dt;
      if (W.fadeT < 0.7) W.fade = easeIO(W.fadeT / 0.7);
      else { if (W.region !== W.regionTo) showRegion(W.regionTo); W.fade = 1 - easeIO(clamp((W.fadeT - 0.7) / 0.9, 0, 1)); if (W.fadeT >= 1.6) { W.regionTo = null; W.fade = 0; } }
    }
    W.flicker = Math.sin(t * 23) > 0.85 || Math.sin(t * 7.1) > 0.97 ? 0.15 : 1;
    applyPalette();
    W.scroll += dx;
    const g = sets[W.region];
    if (g) g.position.x = -(((W.scroll % SPAN) + SPAN) % SPAN);
    groundMat.map.offset.x = (W.scroll / 6) % 1; asphaltTex.offset.x = (W.scroll / 10) % 1; dashTex.offset.x = (W.scroll / 5) % 1;
    partU.uTime.value = t; partU.uScroll.value = (W.scroll * 0.6) % 110;
    // เมฆลอยช้าๆ
    if (cloudIM.visible) { for (const c of clouds) { c.x -= dx * 0.03 + dt * 0.5; if (c.x < -180) c.x += 350; } placeClouds(); }
    // เงาตามรถ
    sun.position.set(focusX + SUN_OFF.x, SUN_OFF.y, focusZ + SUN_OFF.z); sun.target.position.set(focusX, 0, focusZ);
  }
  // ฟ้า/ดาวตามกล้อง (ไม่มีขอบ)
  function follow(cam) {
    sky.position.copy(cam.position); stars.position.copy(cam.position);
    moon.position.set(cam.position.x + 260, cam.position.y + 170, cam.position.z - 160);
  }

  function dispose() {
    for (const k in sets) sets[k].traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
    for (const k in hillSets) { hillSets[k].dispose(); if (hillSets[k].userData.caps) hillSets[k].userData.caps.dispose(); }
    cloudIM.dispose(); speedLines.dispose();
    trafficG.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
    hzG.traverse((o) => { if (o.isMesh && o.geometry && !Object.values(G).includes(o.geometry)) o.geometry.dispose(); });
    disposables.forEach((d) => { try { d.dispose(); } catch { /* แล้ว */ } });
    envTex.dispose();
  }

  // ชิ้นของข้างทางแบบโมเดลเดี่ยว (สิ่งกีดขวางบนกระดานต่อสู้) — ใช้เรขาคณิตร่วม · สีต่อชิ้นผ่านวัสดุแคช
  const tintCache = new Map();
  const tintOf = (c) => { let m = tintCache.get(c); if (!m) { m = std(c, { roughness: 0.9 }); tintCache.set(c, m); } return m; };
  function prefabModel(name, tint = 0xffffff) {
    const g = new THREE.Group();
    for (const part of P[name]()) {
      const m = new THREE.Mesh(part.geo, part.tint ? tintOf(tint) : part.mat);
      m.applyMatrix4(part.m); m.castShadow = true; m.receiveShadow = true; g.add(m);
    }
    return g;
  }
  const isSharedGeo = (geo0) => { for (const k in G) if (G[k] === geo0) return true; return geo0 === carBodyG || geo0 === carCabG || geo0 === carGlG || geo0 === carWheelG || geo0 === carLtG; };
  return {
    W, sun, fog, setRegion, setNight, update, follow, dispose, showRegion, prefabModel, isSharedGeo, std, setClip,
    trafficCars, hzSlots, HZ_KINDS, hazardModel, gantry, signSlots, drawSign, speedLines, slData, slMat, setOf,
  };
}

// ---------------------------------------------------------------- ตัวช่วยร่วม: renderer
function makeRenderer(canvas, lowQ, alpha = false) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowQ, alpha, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowQ ? 1 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = lowQ ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  return renderer;
}
// เวลาที่สิ่งกีดขวางถึงรถ (นาฬิกาเครื่องเรา) — กันนาฬิกา server/เครื่องไม่ตรงกัน: ครั้งแรกที่เห็นยึดระยะเวลาที่เหลือไว้ (≤ 3.2 วิ)
function hazardArrival(map, h, nowMs, srvOffset) {
  let a = map.get(h.id);
  if (a == null) {
    const left = srvOffset != null ? h.at - (nowMs + srvOffset) : h.at - nowMs;
    a = nowMs + clamp(left, 300, 3400);
    map.set(h.id, a);
  }
  return a;
}

// ================================================================ (ก) หน้าขับเต็มจอ
export const DRIVE_CAMS = [["chase", "ไล่หลัง"], ["far", "ไกล"], ["driver", "คนขับ"], ["hood", "ฝากระโปรง"], ["bumper", "กันชน"], ["roof", "ซันรูฟ"], ["wheel", "ข้างล้อ"], ["cine", "ภาพยนตร์"], ["inside", "ในรถ"]];
const FP = { driver: [[2.3, 2.42, 1.0], [14, 1.6, 1.0]], hood: [[3.95, 2.1, 0], [16, 1.5, 0]], bumper: [[4.6, 0.72, 0], [16, 0.72, 0]], roof: [[0.5, 4.2, 0], [14, 2.9, 0]], wheel: [[1.6, 0.85, 1.7 + 1.2], [12, 0.6, 1.7 + 0.4]] };

export function createRoadDrive(canvas, { lowQ = false, onSfx = () => {}, onAction = () => {} } = {}) {
  const renderer = makeRenderer(canvas, lowQ);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 700);
  camera.position.set(-14, 5.5, 0);
  const world = createWorld(renderer, scene, { lowQ, traffic: true });
  const van = createVan({ lowQ, onSfx, onAction });
  scene.add(van.group);
  van.setRoof(true);
  world.showRegion("plains");

  const D = { v: 0, z: 0, zv: 0, lastV: 0, roll: 0, pitch: 0, shake: 0, boostT: 0, laneT: 0, lastLane: 0, fxSeen: new Set(), arr: new Map(), cam: "chase", camT: 0, introT0: null, size: { w: 0, h: 0 } };
  // คอมไพล์ shader ล่วงหน้า (กลางวัน + กลางคืน) — สลับวัน/คืนกลางทางแล้วไม่สะดุด
  try {
    renderer.compile(scene, camera);
    van.setNight(true); world.setOf("snow"); world.setOf("ghost"); renderer.compile(scene, camera); van.setNight(false);
  } catch { /* ไม่เป็นไร */ }

  const _v = new THREE.Vector3(), _d = new THREE.Vector3(), _t = new THREE.Vector3(), _j = new THREE.Vector3(), _ax = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);
  const ray = new THREE.Raycaster(), _ndc = new THREE.Vector2();

  function resize(w, h) {
    if (w === D.size.w && h === D.size.h) return;
    D.size = { w, h }; renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
  }

  function camera3(dt, t, mode, look, boosting) {
    const fp = FP[mode];
    const fov = (boosting ? 54 : 40 + D.v * 0.15) + (fp ? 14 : 0) + (look.zoom || 0);
    camera.fov += (clamp(fov, 18, 95) - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix();
    const sh = D.shake + van.shake() + (boosting ? 0.06 : 0);
    _j.set((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    if (fp) {
      van.body.updateMatrixWorld();
      _v.set(fp[0][0], fp[0][1], fp[0][2]); _d.set(fp[1][0], fp[1][1], fp[1][2]).sub(_v).normalize();
      _d.applyAxisAngle(Y, (look.yaw || 0) - D.zv * (mode === "driver" ? 0.03 : 0.015));
      _ax.crossVectors(_d, Y).normalize(); _d.applyAxisAngle(_ax, look.pitch || 0);
      camera.position.copy(_v); van.body.localToWorld(camera.position);
      camera.position.addScaledVector(_j, mode === "bumper" || mode === "wheel" ? 0.6 : 0.2);
      _t.copy(_v).addScaledVector(_d, 10); van.body.localToWorld(_t);
      camera.lookAt(_t);
    } else if (mode === "chase" || mode === "far") {
      const far = mode === "far";
      _v.set(far ? -26 - D.v * 0.12 : -13 - D.v * 0.08, far ? 11 : 5.2, 0).applyAxisAngle(Y, look.yaw || 0);
      _v.y = Math.max(0.8, _v.y - (look.pitch || 0) * 12);
      _v.z += D.z * (far ? 0.4 : 0.55);
      camera.position.lerp(_v, Math.min(1, dt * 3)); camera.position.add(_j);
      camera.lookAt(6 * Math.cos(look.yaw || 0), 1.6, D.z * 0.8 + 6 * Math.sin(-(look.yaw || 0)));
    } else if (mode === "cine") {
      const an = t * 0.22 + (look.yaw || 0), r = 12 - (look.zoom || 0) * 0.2;
      camera.position.set(Math.cos(an) * r, 2.6 + Math.sin(t * 0.37) * 1.6 - (look.pitch || 0) * 6, D.z + Math.sin(an) * r);
      camera.lookAt(0, 1.5, D.z);
    } else {
      _v.set(-3.5, 10, 7.5).applyAxisAngle(Y, look.yaw || 0); _v.z += D.z;
      camera.position.lerp(_v, Math.min(1, dt * 3)); camera.lookAt(-0.3, 0.8, D.z);
    }
  }

  const NO_LOOK = { yaw: 0, pitch: 0, zoom: 0 };
  // rt = state.roadtrip · cam = มุมกล้อง · look = { yaw, pitch, zoom } · players = [{ id, img, color }] (หาคนขับ) · srvOffset = นาฬิกา server − เครื่องเรา (ไม่รู้ = null)
  //  rear (null | bool) = บังคับประตูท้าย · slow (0..1) = ชะลอ/จอด ตามฉากเปลี่ยน · cutCam(camera, { z, v, t }) = บทกล้องของฉากเปลี่ยน (roadtrip/rtDirector.js) ทับกล้องปกติ
  function update(nowMs, dtMs, { rt, cam = "chase", look = NO_LOOK, players = null, srvOffset = null, beat = 0, slow = 0, cutCam = null, rear = null } = {}) {
    const dt = Math.min(0.05, Math.max(0, dtMs / 1000)), t = nowMs / 1000;
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; resize(w, h);
    const vs = rt && rt.van ? rt.van : null;
    if (rt) {
      world.setRegion(rt.region && rt.region.id);
      world.setNight(!!rt.night);
      if (vs) van.setState(vs);
      if (rear != null) van.setRear(rear); // ฉากเปลี่ยน: ประตูท้ายเปิดตอนจอดจุดพัก → ปิดตอนออกตัว (rtDirector)
      van.setRadio(rt.radio || null);
      const drv = vs && vs.driverId != null ? (players || []).find((p) => p && p.id === vs.driverId) : null;
      van.setDriver(vs && vs.driverId != null ? { img: drv && drv.img, color: (drv && drv.color) || "#ff8a3d" } : null);
      // เหตุการณ์ชั่วคราว (key กันเล่นซ้ำ)
      for (const f of Array.isArray(rt.fx) ? rt.fx : []) {
        const k = f && (f.key ?? f.id ?? `${f.k}|${f.at || ""}`);
        if (!f || D.fxSeen.has(k)) continue;
        D.fxSeen.add(k);
        // เสียงของ fx เล่นที่ rtAudio.handleFx (App) — ที่นี่ภาพอย่างเดียว
        if (f.k === "nitro") D.boostT = 1.6;
        else if (f.k === "crash" || f.k === "hit" || f.k === "hazardHit") D.shake = Math.max(D.shake, 0.6);
        else if (f.k === "turret") van.fireTurret(undefined, false);
      }
      if (D.fxSeen.size > 300) D.fxSeen = new Set([...D.fxSeen].slice(-120));
    }
    const nightOn = world.W.nightK > 0.5;
    van.setNight(nightOn);
    // ---- ความเร็ว/เลน (จาก server · นุ่มๆ)
    const phase = rt ? rt.phase : "drive";
    const vT = (vs ? Math.max(0, (+vs.kmh || 0) / 4) : 22) * (1 - clamp(+slow || 0, 0, 1));
    D.boostT = Math.max(0, D.boostT - dt);
    const boosting = (D.boostT > 0 || !!(vs && vs.boost)) && !(slow > 0.3);
    D.v += ((boosting ? vT * 1.35 : vT) - D.v) * Math.min(1, dt * (boosting ? 1.5 : 0.9));
    const acc = (D.v - D.lastV) / Math.max(dt, 1e-3); D.lastV = D.v;
    const lane = vs && Number.isFinite(+vs.lane) ? clamp(Math.round(+vs.lane), -1, 1) : 0;
    if (lane !== D.lastLane) { D.lastLane = lane; onSfx("lane"); }
    const pz = D.z;
    D.z += (lane * LANE - D.z) * Math.min(1, dt * [3.2, 4.2, 5.2, 6.6][van.suspLv()]);
    D.zv = (D.z - pz) / Math.max(dt, 1e-3);
    D.roll += (-D.zv * 0.022 - D.roll) * Math.min(1, dt * 6);
    D.pitch += (clamp(acc * 0.004, -0.05, 0.05) - D.pitch) * Math.min(1, dt * 4);
    van.group.position.z = D.z; van.group.rotation.y = -D.zv * 0.012;
    van.tick(dt, t, { speed: D.v, roll: D.roll, pitch: D.pitch, steer: D.zv * 0.16, beat, boost: boosting });
    const dx = D.v * dt;
    world.update(dt, t, dx, 0, D.z);
    // ---- รถคันอื่น: หลบเลนรถตู้ (ไม่ชนกัน — ความเสียหายมาจาก server เท่านั้น)
    for (const tr of world.trafficCars) {
      tr.x += (tr.v - D.v) * dt;
      if (tr.x < -80) { tr.x = 90 + Math.random() * 60; tr.v = D.v * (0.45 + Math.random() * 0.3) + 3; tr.lane = [-1, 0, 1][Math.floor(Math.random() * 3)]; tr.z = tr.lane * LANE; }
      else if (tr.x > 150) { tr.x = -70 - Math.random() * 10; tr.v = D.v + 4 + Math.random() * 4; tr.lane = [-1, 0, 1][Math.floor(Math.random() * 3)]; tr.z = tr.lane * LANE; }
      const near = tr.x > -14 && tr.x < 22 && Math.abs(tr.lane * LANE - D.z) < 2.4;
      if (near) {
        const opts = [-1, 0, 1].filter((l) => l !== lane && Math.abs(l * LANE - D.z) > 2.4);
        if (opts.length) tr.lane = opts.reduce((a, b) => (Math.abs(b - tr.lane) < Math.abs(a - tr.lane) ? b : a));
        else if (tr.x > 0) tr.v = Math.max(tr.v, D.v + 2); else tr.v = Math.min(tr.v, D.v - 2);
      }
      const zp = tr.z; tr.z += (tr.lane * LANE - tr.z) * Math.min(1, dt * 2.2);
      tr.car.position.set(tr.x, 0, tr.z); tr.car.rotation.y = -(tr.z - zp) / Math.max(dt, 1e-3) * 0.04;
    }
    // ---- สิ่งกีดขวาง
    const hz = rt && Array.isArray(rt.hazards) ? rt.hazards : [];
    const slots = world.hzSlots;
    for (const s of slots) s.live = false;
    for (const hzd of hz) {
      if (!hzd || hzd.id == null) continue;
      let s = slots.find((q) => q.id === hzd.id);
      if (!s) { s = slots.find((q) => q.id == null || (!q.root.visible && q.fly <= 0)); if (!s) continue; s.id = hzd.id; s.hit = false; s.fly = 0; s.passed = false; }
      s.live = true; s.lane = clamp(Math.round(+hzd.lane || 0), -1, 1);
      s.arr = hazardArrival(D.arr, hzd, Date.now(), srvOffset);
      const kind = hzd.kind && world.HZ_KINDS.includes(hzd.kind) ? hzd.kind : world.HZ_KINDS[Math.floor(hash(strHash(hzd.id), 91) * 5) % 5];
      if (s.kind !== kind) { for (const k in s.models) s.models[k].visible = false; if (!s.models[kind]) { s.models[kind] = world.hazardModel(kind); s.root.add(s.models[kind]); } s.models[kind].visible = true; s.kind = kind; }
    }
    const nowC = Date.now();
    for (const s of slots) {
      if (s.id == null) continue;
      const left = (s.arr - nowC) / 1000, x = left * Math.max(D.v, 4);
      if (!s.live && left > 0) { s.root.visible = false; s.id = null; continue; } // server เอาออกก่อนถึง
      if (x < -60 && s.fly <= 0) { s.root.visible = false; D.arr.delete(s.id); s.id = null; continue; }
      s.root.visible = true;
      if (!s.passed && left <= 0) {
        s.passed = true;
        if (Math.abs(D.z - s.lane * LANE) < 1.8) { s.hit = true; s.fly = 1.2; D.shake = Math.max(D.shake, 0.7); van.bump(0.6); }
      }
      const m = s.models[s.kind];
      if (s.fly > 0) { s.fly -= dt; const k = 1.2 - s.fly; m.position.set(-k * 6, Math.sin(Math.min(1, k / 1.2) * Math.PI) * 3, (s.lane >= 0 ? 1 : -1) * k * 5); m.rotation.set(k * 5, k * 3, 0); }
      else { m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); }
      s.root.position.set(x, 0, s.lane * LANE);
      // แถบเรืองเตือน: จากของ → รถ (เฉพาะก่อนถึง)
      const wl = Math.max(0, x - 4.5);
      s.warn.visible = left > 0 && wl > 0.5;
      s.warn.scale.set(wl, 1, 1); s.warn.material.opacity = (0.35 + 0.35 * Math.sin(t * 10)) * clamp(1 - left / 3.4, 0.3, 1);
    }
    if (D.arr.size > 60) for (const k of [...D.arr.keys()].slice(0, 30)) D.arr.delete(k);
    // ---- ป้ายทางแยก
    const fork = rt && rt.phase === "fork" && rt.fork && Array.isArray(rt.fork.options) ? rt.fork : null;
    world.gantry.visible = !!fork;
    if (fork) {
      const n = Math.min(3, fork.options.length);
      const total = 15000, left = rt.endsAt ? clamp(rt.endsAt - (Date.now() + (srvOffset || 0)), 0, total) : total * 0.5;
      world.gantry.position.x = lerp(28, 120, left / total);
      world.signSlots.forEach((s, i) => {
        s.mesh.visible = i < n;
        if (i < n) { const dir = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; drawSign(s, fork.options[i].kind, dir); s.mesh.position.z = dir * (n === 3 ? 3.4 : 2.4); }
      });
    }
    // ---- เส้นความเร็ว
    const slOp = (boosting ? 0.55 : 0) + clamp((D.v - 30) / 40, 0, 1) * 0.18;
    world.slMat.opacity += (slOp - world.slMat.opacity) * Math.min(1, dt * 5);
    world.speedLines.visible = world.slMat.opacity > 0.01;
    if (world.speedLines.visible) {
      const sp = D.v * 1.6 * dt, _o = SL_O;
      world.slData.forEach((d, i) => {
        d.x -= sp; if (d.x < -40) d.x += 80;
        _o.position.set(d.x, d.y, d.z + D.z); _o.scale.set(d.len * (1 + D.v / 30), 1, 1); _o.updateMatrix(); world.speedLines.setMatrixAt(i, _o.matrix);
      });
      world.speedLines.instanceMatrix.needsUpdate = true;
    }
    // ---- กล้อง (ฉากเปิด = ภาพยนตร์ ~6 วิ)
    let mode = cam;
    if (phase === "intro" && !cutCam) { if (D.introT0 == null) D.introT0 = t; if (t - D.introT0 < 6.5) mode = "cine"; } else D.introT0 = null; // มีบทกล้องฉากเปิด (rtDirector) = ใช้บทนั้นแทน
    if (mode !== D.cam) { D.cam = mode; van.setView(mode === "driver" ? "drv" : mode === "inside" ? "cut" : "out"); }
    van.setRoof(mode !== "inside");
    D.shake = Math.max(0, D.shake - dt * 1.6);
    camera3(dt, t, mode, look || NO_LOOK, boosting);
    if (cutCam) cutCam(camera, { z: D.z, v: D.v, t });
    world.follow(camera);
    // รถคันอื่นที่เข้าใกล้กล้องเกินไป (ฉากภาพยนตร์/ข้างล้อ/ไกล) = ซ่อน ไม่ให้วิ่งทะลุจอ
    for (const tr of world.trafficCars) { const dx = tr.car.position.x - camera.position.x, dz = tr.car.position.z - camera.position.z; tr.car.visible = dx * dx + dz * dz > 49; }
    renderer.render(scene, camera);
    return { kmh: Math.round(D.v * 4), boosting, inside: mode === "driver" || mode === "inside" };
  }
  const SL_O = new THREE.Object3D();
  function drawSign(s, kind, dir) { world.drawSign(s, kind, dir); }

  // เลือกของในรถ: ndc (−1..1) → { name, run } | null
  function pickAt(nx, ny) {
    _ndc.set(nx, ny); ray.setFromCamera(_ndc, camera);
    return van.pick(ray);
  }
  return {
    update, pick: pickAt, hover: (hit) => van.hover(hit), van, camera, renderer,
    info: () => renderer.info,
    dispose() {
      van.dispose(); world.dispose(); renderer.dispose(); // ไม่ forceContextLoss — แคนวาสเดิมอาจถูกใช้สร้างฉากใหม่ (StrictMode / ต่อสู้รอบถัดไป)
    },
  };
}

// ================================================================ (ข) ฉากใต้กระดานตอนต่อสู้ (แบบ Colony)
//  กระดาน (bx, by) 1 ช่อง = 1 หน่วยโลก · รถตู้จอดตาม map.vanBlock / map.vanTiles / ช่อง terrain "van" (ไม่มี = กลางกระดาน หันขวา)
//  ช่องในรถตู้ยกขึ้นเท่าพื้นห้องในรถ (ชั้น 2D วาดหมาก/ไฮไลต์บนพื้นรถ) · กล้องล็อกมุมเฉียงแบบกระดานปกติ + ซูม 5 ขั้น + หมุน 90° (Q/E)
const ZOOM_K = [1, 0.84, 0.7, 0.58, 0.48];
const TILT = 32 * Math.PI / 180, TOP = 84 * Math.PI / 180;
//  ที่มาของตำแหน่งรถ (ตามลำดับ): ฟิลด์ของแผนที่ที่ server ส่ง → ผังใน board/roadtrip/maps.gen.js (RT_DEFS[area]) → ช่อง special "van" / terrain "rt_van"
//  vanTiles / special van = ห้องในรถ 3×7 เดินได้ (ยกพื้น) · vanBlock / rt_van = รถจอดเป็นสิ่งกีดขวาง (ย่อรถให้พอดีบล็อก ไม่ยกพื้น)
const toPt = (p) => (Array.isArray(p) ? p : typeof p === "string" ? p.split(",").map(Number) : p ? [p.x, p.y] : null);
function vanLayout(map) {
  const cols = (map && map.cols) || 20, rows = (map && map.rows) || 11;
  const def = (map && RT_DEFS[map.area]) || {};
  const pick = (k) => (map && (map[k] || (map.rt && map.rt[k]))) || def[k] || null;
  let tiles = [], walk = false;
  const vt = pick("vanTiles");
  if (Array.isArray(vt)) { tiles = vt.map(toPt).filter((p) => p && Number.isFinite(p[0])); walk = tiles.length > 0; }
  const vb = !tiles.length && pick("vanBlock");
  if (vb && Number.isFinite(vb.x0)) { for (let x = vb.x0; x <= vb.x1; x++) for (let y = vb.y0; y <= vb.y1; y++) tiles.push([x, y]); }
  if (!tiles.length && map && map.special) for (const [k, v] of Object.entries(map.special)) if (String(v) === "van") { const [x, y] = k.split(",").map(Number); if (Number.isFinite(x)) { tiles.push([x, y]); walk = true; } }
  if (!tiles.length && map && map.terrain) for (const [k, v] of Object.entries(map.terrain)) if (/(^|_)van$/.test(String(v))) { const [x, y] = k.split(",").map(Number); if (Number.isFinite(x)) tiles.push([x, y]); }
  let x0, x1, y0, y1;
  if (tiles.length) { x0 = Math.min(...tiles.map((p) => p[0])); x1 = Math.max(...tiles.map((p) => p[0])); y0 = Math.min(...tiles.map((p) => p[1])); y1 = Math.max(...tiles.map((p) => p[1])); }
  const has = tiles.length > 0;
  const cx = has ? (x0 + x1 + 1) / 2 : cols / 2, cy = has ? (y0 + y1 + 1) / 2 : rows / 2;
  const alongX = has ? x1 - x0 >= y1 - y0 : true;
  // หน้ารถ: ฝั่งที่มีช่องคนขับ (driverTile) · ไม่มี = +x / +y
  const dt0 = pick("driverTile");
  const drv = Array.isArray(dt0) ? dt0 : dt0 && Number.isFinite(dt0.x) ? [dt0.x, dt0.y] : null;
  let f = alongX ? [1, 0] : [0, 1];
  if (drv) { const ddx = drv[0] + 0.5 - cx, ddy = drv[1] + 0.5 - cy; f = alongX ? [ddx < 0 ? -1 : 1, 0] : [0, ddy < 0 ? -1 : 1]; }
  else {
    // ไม่มีช่องคนขับ (รถจอด) — ท้ายรถ = ฝั่งที่มี rearTiles · หน้ารถอยู่ตรงข้าม
    const rr = pick("rearTiles");
    const rp = Array.isArray(rr) ? rr.map(toPt).filter((p) => p && Number.isFinite(p[0])) : [];
    if (rp.length) { const rx = rp.reduce((a, p) => a + p[0] + 0.5, 0) / rp.length - cx, ry = rp.reduce((a, p) => a + p[1] + 0.5, 0) / rp.length - cy; f = alongX ? [rx > 0 ? -1 : 1, 0] : [0, ry > 0 ? -1 : 1]; }
  }
  // กระดาน → โลก: หมุน (det +1) ให้หน้ารถ = +X
  const R = f[0] === 1 ? [1, 0, 0, 1] : f[0] === -1 ? [-1, 0, 0, -1] : f[1] === 1 ? [0, 1, -1, 0] : [0, -1, 1, 0]; // [a b; c d]: X = a·dx + b·dy · Z = c·dx + d·dy
  // คนขับต้องอยู่ฝั่ง +Z ของรถ (พวงมาลัยขวา) — ไม่งั้นสะท้อนโมเดล
  let mirror = false;
  if (drv) { const dx = drv[0] + 0.5 - cx, dy = drv[1] + 0.5 - cy; mirror = R[2] * dx + R[3] * dy < -0.01; }
  // รถจอดเป็นสิ่งกีดขวาง (บล็อกเล็กกว่ารถจริง) = ย่อรถทั้งคันให้พอดีบล็อก
  const len = has ? (alongX ? x1 - x0 + 1 : y1 - y0 + 1) : 7, wid = has ? (alongX ? y1 - y0 + 1 : x1 - x0 + 1) : 3;
  const scale = walk ? 1 : Math.min(1, len / 8.6, wid / 3.5);
  return { cols, rows, has, walk, scale, x0, x1, y0, y1, cx, cy, R, mirror, sig: `${map && map.area}|${cols}x${rows}|${x0},${y0},${x1},${y1}|${f}|${drv}|${walk}` };
}

export function createRoadUnderlay(canvas, { lowQ = false } = {}) {
  const renderer = makeRenderer(canvas, lowQ);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 700);
  const world = createWorld(renderer, scene, { lowQ, traffic: false, sceneryShadows: false });
  // ของข้างทางฝั่งกล้องเลยขอบกระดานไป = ตัดทิ้ง (เสาไฟ/ต้นไม้ไม่บังหน้าจอ) · ระนาบหมุนตามกล้องทุกเฟรม (ไม่คอมไพล์ใหม่)
  renderer.localClippingEnabled = true;
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 6);
  world.setClip([clipPlane]);
  // เงา: มีแต่รถตู้ที่ทอดเงา → อบแผนที่เงาเฉพาะตอนรถเปลี่ยน (ประตู/ป้อม/ทรง/อัปเกรด/กลางคืน/ภูมิภาค) — ฉากเลื่อนไม่ต้องวาดรอบเงาใหม่
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  const van = createVan({ lowQ });
  scene.add(van.group);
  van.setView("board");
  world.showRegion("plains");
  try { renderer.compile(scene, camera); van.setNight(true); renderer.compile(scene, camera); van.setNight(false); } catch { /* ไม่เป็นไร */ }

  // เส้นตารางกระดานบนถนน (แทนชั้นกระดาน 2D)
  const gridMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false });
  let grid = null;
  const L = { lay: vanLayout(null), floor: 0.62 };
  function buildGrid() {
    if (grid) { scene.remove(grid); grid.geometry.dispose(); }
    const { cols, rows } = L.lay, pts = [], A = new THREE.Vector3();
    const push = (bx, by) => { toWorld(bx, by, 0, A, true); pts.push(A.x, 0.035, A.z); };
    for (let x = 0; x <= cols; x++) { push(x, 0); push(x, rows); }
    for (let y = 0; y <= rows; y++) { push(0, y); push(cols, y); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    grid = new THREE.LineSegments(g, gridMat); grid.renderOrder = 2; scene.add(grid);
  }
  // ---------------------------------------------------------------- สิ่งกีดขวางบนกระดาน (terrain rt_*) เป็นโมเดล 3D ตามภูมิภาค — ชั้น 2D ไม่วาดซ้ำ
  const obsG = new THREE.Group(); scene.add(obsG);
  let obsSig = "", obsMapRef = null, obsRegion = null;
  const OBS_KINDS = new Set(["rt_rock", "rt_tree", "rt_sign", "rt_cone", "rt_wreck", "rt_barrier"]);
  const obsMats = {};
  const oMat = (k, c, o) => obsMats[k] || (obsMats[k] = world.std(c, o));
  const _gc = {};
  const geoBox = (w, h, d) => _gc[`b${w},${h},${d}`] || (_gc[`b${w},${h},${d}`] = new THREE.BoxGeometry(w, h, d));
  const geoCyl = (a, b, h, n) => _gc[`c${a},${b},${h},${n}`] || (_gc[`c${a},${b},${h},${n}`] = new THREE.CylinderGeometry(a, b, h, n));
  const geoDodeca = () => _gc.d || (_gc.d = new THREE.DodecahedronGeometry(1, 0));
  const ownGeo = (g0) => world.isSharedGeo(g0) || Object.values(_gc).includes(g0);
  function clearObs() {
    obsG.traverse((o) => { if (o.isMesh && o.geometry && !ownGeo(o.geometry)) o.geometry.dispose(); });
    obsG.clear();
  }
  function disposeObs() { clearObs(); Object.values(_gc).forEach((g0) => g0.dispose()); Object.values(obsMats).forEach((m) => m.dispose()); }
  const TREE_OF = { plains: ["round", 0x76ad52, 0.46], desert: ["saguaro", 0x5f9a52, 0.42], forest: ["pine", 0x2f6a3a, 0.4], snow: ["snowPine", 0x2f5a48, 0.4], ghost: ["deadTree", 0x3a322e, 0.5] };
  const ROCK_OF = { plains: 0x8a8f86, desert: 0xc99a6a, forest: 0x7a7f78, snow: 0x9aa4ae, ghost: 0x6a6670 };
  function obsModel(kind, region, i) {
    const h = (k) => hash(i, k, 17);
    let g;
    if (kind === "rt_tree") { const [n, c, sc] = TREE_OF[region] || TREE_OF.plains; g = world.prefabModel(n, c); g.scale.setScalar(sc * (0.9 + h(1) * 0.25)); g.rotation.y = h(2) * TAU; }
    else if (kind === "rt_rock") {
      g = new THREE.Group();
      if (region === "ghost") { // เมืองร้าง: ป้ายหลุมศพ
        const stone = oMat("grave", 0x8a8790, { roughness: 0.95 });
        const slab = new THREE.Mesh(geoBox(0.56, 0.62, 0.16), stone); slab.position.y = 0.31; g.add(slab);
        const top = new THREE.Mesh(geoCyl(0.28, 0.28, 0.16, 16), stone); top.rotation.x = Math.PI / 2; top.position.y = 0.62; g.add(top);
        const mound = new THREE.Mesh(geoBox(0.6, 0.08, 0.7), oMat("dirt", 0x4a3f38, { roughness: 1 })); mound.position.set(0, 0.04, 0.32); g.add(mound);
        g.rotation.set(0, (h(3) - 0.5) * 0.4, (h(4) - 0.5) * 0.25);
      } else {
        const m = oMat("rock" + region, ROCK_OF[region] || ROCK_OF.plains, { roughness: 1, flatShading: true });
        for (let k = 0; k < 3; k++) {
          const r = new THREE.Mesh(geoDodeca(), m), s0 = k ? 0.2 + h(k + 5) * 0.12 : 0.4;
          r.scale.set(s0 * 1.2, s0 * 0.8, s0); r.position.set(k ? (h(k + 7) - 0.5) * 0.6 : 0, s0 * 0.5, k ? (h(k + 9) - 0.5) * 0.6 : 0); r.rotation.set(h(k + 11) * 3, h(k + 12) * 3, 0); g.add(r);
        }
        if (region === "snow") { const cap = new THREE.Mesh(geoDodeca(), oMat("snowcap", 0xf6f9fc, { roughness: 0.95, flatShading: true })); cap.scale.set(0.4, 0.14, 0.34); cap.position.y = 0.4; g.add(cap); }
      }
    } else if (kind === "rt_cone") { g = world.hazardModel("cones"); g.scale.setScalar(0.42); g.rotation.y = h(1) * TAU; }
    else if (kind === "rt_sign") {
      g = new THREE.Group();
      const k1 = oMat("signK", 0x1f2a33, { roughness: 0.6 });
      const post = new THREE.Mesh(geoCyl(0.035, 0.04, 1.5, 8), oMat("post", 0x9aa3ad, { metalness: 0.6, roughness: 0.4 })); post.position.y = 0.75; g.add(post);
      const rim = new THREE.Mesh(geoBox(0.7, 0.7, 0.03), k1); rim.position.set(0, 1.35, 0.02); rim.rotation.z = Math.PI / 4; g.add(rim);
      const plate = new THREE.Mesh(geoBox(0.6, 0.6, 0.04), oMat("signY", 0xf2c84b, { roughness: 0.5 })); plate.position.set(0, 1.35, 0.03); plate.rotation.z = Math.PI / 4; g.add(plate);
      const bar = new THREE.Mesh(geoBox(0.07, 0.22, 0.03), k1); bar.position.set(0, 1.41, 0.055); g.add(bar);
      const dot = new THREE.Mesh(geoBox(0.07, 0.07, 0.03), k1); dot.position.set(0, 1.23, 0.055); g.add(dot);
      g.rotation.y = (h(1) - 0.5) * 0.5;
    } else if (kind === "rt_barrier") {
      g = new THREE.Group();
      const wM = oMat("barW", 0xeeeeea, { roughness: 0.7 });
      const base = new THREE.Mesh(geoBox(0.92, 0.22, 0.4), wM); base.position.y = 0.11; g.add(base);
      const top = new THREE.Mesh(geoBox(0.92, 0.32, 0.2), wM); top.position.y = 0.38; g.add(top);
      for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(geoBox(0.14, 0.33, 0.21), oMat("barR", 0xd9453b, { roughness: 0.6 })); st.position.set(-0.3 + k * 0.3, 0.385, 0); st.rotation.z = 0.5; g.add(st); }
      const lamp = new THREE.Mesh(geoCyl(0.06, 0.06, 0.06, 10), oMat("barL", 0xffb020, { emissive: 0xff9a00, emissiveIntensity: 0.8 })); lamp.position.set(0.3, 0.58, 0); g.add(lamp);
    } else { // rt_wreck (2 ช่องต่อกัน = คันเดียว) — สีซีด/สนิมตามภูมิภาค
      g = world.hazardModel("car"); g.scale.setScalar(0.46);
      const RUST = { plains: [0x8a5a48, 0x6a7a8a, 0x9a8a5a], desert: [0xa86a3a, 0xb8955a, 0x7a5a3a], forest: [0x4a6a4a, 0x7a5a3a, 0x5a6a7a], snow: [0x7a8a9a, 0x9a6a5a, 0x5a6a7a], ghost: [0x4a3f3a, 0x5a5250, 0x3a3436] }[region] || [0x8a5a48];
      const c = RUST[Math.floor(h(5) * RUST.length) % RUST.length];
      g.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshPhysicalMaterial) { o.material = oMat("wreck" + c, c, { roughness: 0.85, metalness: 0.3 }); } });
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  function syncObs(map, region) {
    if (map === obsMapRef && region === obsRegion) return;
    obsMapRef = map; obsRegion = region;
    const terr = (map && map.terrain) || {}, list = [];
    for (const [k, v] of Object.entries(terr)) if (OBS_KINDS.has(String(v))) { const [x, y] = k.split(",").map(Number); if (Number.isFinite(x)) list.push([x, y, String(v)]); }
    list.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    const sig = `${region}|${L.lay.sig}|` + list.map((t) => t.join(",")).join(";");
    if (sig === obsSig) return;
    obsSig = sig;
    clearObs();
    const used = new Set(), A = new THREE.Vector3();
    const has = (x, y, kind) => list.some((t) => t[0] === x && t[1] === y && t[2] === kind);
    list.forEach(([x, y, kind]) => {
      const key = `${x},${y}`; if (used.has(key)) return; used.add(key);
      const m = obsModel(kind, region, x * 31 + y * 7);
      let cx = x + 0.5, cy = y + 0.5, dirX = 1, dirY = 0;
      if (kind === "rt_wreck") { // คู่ช่องติดกัน = รถพังคันเดียวตามแนวนั้น
        if (has(x + 1, y, kind) && !used.has(`${x + 1},${y}`)) { used.add(`${x + 1},${y}`); cx += 0.5; }
        else if (has(x, y + 1, kind) && !used.has(`${x},${y + 1}`)) { used.add(`${x},${y + 1}`); cy += 0.5; dirX = 0; dirY = 1; }
        else m.scale.setScalar(0.3);
      }
      toWorld(cx, cy, 0, A, true);
      const R = L.lay.R, bx = R[0] * dirX + R[1] * dirY, bz = R[2] * dirX + R[3] * dirY;
      m.position.copy(A);
      if (kind === "rt_wreck" || kind === "rt_barrier") m.rotation.y += Math.atan2(-bz, bx);
      obsG.add(m);
    });
    C.shadowFrames = 0; // อบเงาใหม่ (มีสิ่งกีดขวางเพิ่ม/หาย)
  }

  // ---------------------------------------------------------------- เอฟเฟกต์ชั่วคราว: กระสุนส่องวิถี · ควันยาง (พูลคงที่ ไม่สร้างใหม่)
  const _b = new THREE.Vector3();
  const tracerGeo = new THREE.BoxGeometry(1, 0.05, 0.05); tracerGeo.translate(0.5, 0, 0);
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const smokeTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, "rgba(235,235,235,.9)"); gr.addColorStop(1, "rgba(235,235,235,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const FXP = [];
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(tracerGeo, tracerMat.clone()); m.visible = false; m.renderOrder = 5; scene.add(m); FXP.push({ kind: "tracer", o: m, t: 0, life: 0 }); }
  for (let i = 0; i < 16; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 })); sp.visible = false; scene.add(sp); FXP.push({ kind: "smoke", o: sp, t: 0, life: 0 }); }
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0xffc060, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
  flash.visible = false; scene.add(flash);
  function fxSpawn(kind, a, b, delay = 0) {
    const e = FXP.find((q) => q.kind === kind && q.life <= 0) || FXP.find((q) => q.kind === kind);
    if (!e) return;
    e.t = -delay; e.life = kind === "tracer" ? 0.16 : 0.9;
    if (kind === "tracer") {
      e.o.position.copy(a); const d = _b2.copy(b).sub(a), len = d.length();
      e.o.scale.set(len, 1, 1); e.o.rotation.set(0, Math.atan2(-d.z, d.x), Math.atan2(d.y, Math.hypot(d.x, d.z)), "YZX");
      flash.position.copy(b); flash.userData.t = 0.25 + delay;
    } else { e.o.position.copy(a); e.o.scale.setScalar(0.4); }
  }
  const _b2 = new THREE.Vector3();
  function fxTick(dt) {
    let live = false;
    for (const e of FXP) {
      if (e.life <= 0) { if (e.o.visible) e.o.visible = false; continue; }
      e.t += dt; live = true;
      if (e.t < 0) { e.o.visible = false; continue; }
      const k = e.t / e.life;
      if (k >= 1) { e.life = 0; e.o.visible = false; continue; }
      e.o.visible = true;
      if (e.kind === "tracer") e.o.material.opacity = 1 - k;
      else { e.o.material.opacity = 0.55 * (1 - k); e.o.scale.setScalar(0.4 + k * 1.6); e.o.position.y += dt * 0.6; e.o.position.x -= dt * 3; }
    }
    if (flash.userData.t > 0) { flash.userData.t -= dt; flash.visible = true; flash.material.opacity = Math.min(1, flash.userData.t * 4); flash.scale.setScalar(1.2 + Math.random() * 0.4); live = true; } else flash.visible = false;
    C.fxLive = live;
  }
  function disposeFx() { tracerGeo.dispose(); tracerMat.dispose(); smokeTex.dispose(); FXP.forEach((e) => e.o.material.dispose()); flash.material.dispose(); }

  // ---------------------------------------------------------------- ความสูงของหมาก (ชั้น 2D): พื้นถนน 0 · ช่องรถตู้ = พื้นรถ · คนบนหลังคา = หลังคา
  //  project() ยกช่องรถตู้ให้อยู่แล้ว (ไฮไลต์/หมากยืนนิ่ง) → unitLift คืนส่วนต่างเป็น hz (หน่วยช่อง) ให้ BoardCanvas บวกเข้าหมาก:
  //  เปลี่ยนระดับ (กระโดดขึ้น/ลงรถ · ปีนหลังคา) = โค้งกระโดดนุ่ม 0.4 วิ แทนการกระตุกขึ้นทันที
  const LIFT = new Map(); // id → { cur, from, to, t0 }
  function unitLift(id, cx, cy, nowS) {
    const tileL = inVan(cx, cy) ? L.floor : 0;
    const roofExtra = id != null && id === C.roofId ? Math.max(0, van.roofY() - L.floor) : 0;
    const want = tileL + roofExtra;
    let e = LIFT.get(id);
    if (!e) { e = { cur: want, from: want, to: want, t0: -9 }; LIFT.set(id, e); }
    if (Math.abs(want - e.to) > 1e-3) { e.from = e.cur; e.to = want; e.t0 = nowS; }
    const k = Math.min(1, (nowS - e.t0) / (roofExtra || e.from > e.to + 1 ? 0.55 : 0.4));
    const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    e.cur = e.from + (e.to - e.from) * ease + Math.sin(Math.PI * k) * (0.35 + Math.abs(e.to - e.from) * 0.25) * (k < 1 ? 1 : 0);
    if (k >= 1) e.cur = e.to;
    if (LIFT.size > 80) LIFT.delete(LIFT.keys().next().value);
    C.liftAnim = C.liftAnim || k < 1;
    return e.cur - tileL;
  }

  function inVan(bx, by) { const l = L.lay; return l.has && l.walk && bx >= l.x0 - 1e-6 && bx <= l.x1 + 1 + 1e-6 && by >= l.y0 - 1e-6 && by <= l.y1 + 1 + 1e-6; }
  function toWorld(bx, by, z, out, flat = false) {
    const l = L.lay, dx = bx - l.cx, dy = by - l.cy;
    return out.set(l.R[0] * dx + l.R[1] * dy, z + (!flat && inVan(bx, by) ? L.floor : 0), l.R[2] * dx + l.R[3] * dy);
  }
  function toBoard(X, Z) { const l = L.lay; return { x: l.R[0] * X + l.R[2] * Z + l.cx, y: l.R[1] * X + l.R[3] * Z + l.cy }; } // ผกผันของเมทริกซ์หมุน = ทรานสโพส

  const C = { yaw: 0, yawT: null, pitch: TILT, dist: 30, tx: 0, tz: 0, off: [0, 0], w: 1, h: 1, base: null, scroll: { round: null, t0: 0, from: 0, to: 0, k: 1 }, fx: new Set(), shake: 0 };
  let mapSig = "";
  const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _tgt = new THREE.Vector3();
  const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

  function placeCamera(dist, off) {
    const cp = Math.cos(C.pitch), sp = Math.sin(C.pitch);
    // ทิศกล้องในพิกัดกระดาน: มุมมอง rotation r → กล้องอยู่ฝั่ง (sin θ, cos θ) ของกระดาน (แบบ boardGeo toView)
    const bx = Math.sin(C.yaw), by = Math.cos(C.yaw), R = L.lay.R;
    const wx = R[0] * bx + R[1] * by, wz = R[2] * bx + R[3] * by;
    camera.position.set(C.tx + wx * cp * dist, sp * dist, C.tz + wz * cp * dist);
    camera.near = Math.max(0.1, dist * 0.3);
    { // ระนาบตัดของข้างทาง: ทิศกล้องบนพื้น · ห่างจากกลางกระดานเกินครึ่งความลึกกระดาน + 0.6 = ตัด
      const ext = (Math.abs(bx) > Math.abs(by) ? L.lay.cols : L.lay.rows) / 2 + 0.6;
      clipPlane.normal.set(-wx, 0, -wz); clipPlane.constant = ext + wx * (C.bcx0 || 0) + wz * (C.bcz0 || 0);
    }
    // ขึ้น = ทิศ "ไกลกล้อง" (ไม่ใช่แกน Y — มุมบนสุดยังไม่หมุนพลิก)
    camera.up.set(0, 1, 0);
    if (C.pitch > 1.3) camera.up.set(-wx, 0, -wz);
    camera.lookAt(C.tx, 0, C.tz);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const e = camera.projectionMatrix.elements; e[8] -= off[0]; e[9] -= off[1];
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
  // ระยะ/เลื่อนภาพให้กระดานทั้งแผ่นพอดีกรอบตรรกะ (เว้น HUD ล่าง แบบกระดานปกติ) — คำนวณทุกเฟรม (ถูก: 6 จุด × 3 รอบ)
  const FIT = { x0: 70, x1: 1210, y0: 64, y1: 548 };
  function fit() {
    const b = C.base || { k: 1, ox: 0, oy: 0 }, l = L.lay;
    const pts = [[0, 0], [l.cols, 0], [0, l.rows], [l.cols, l.rows]];
    let dist = C.dist, off = [0, 0];
    for (let it = 0; it < 4; it++) {
      placeCamera(dist, off);
      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      for (let i = 0; i < 4; i++) {
        toWorld(pts[i][0], pts[i][1], 0, corners[i], true).project(camera);
        const lx = ((corners[i].x + 1) / 2 * C.w - b.ox) / b.k, ly = ((1 - corners[i].y) / 2 * C.h - b.oy) / b.k;
        minX = Math.min(minX, lx); maxX = Math.max(maxX, lx); minY = Math.min(minY, ly); maxY = Math.max(maxY, ly);
      }
      const s = Math.max((maxX - minX) / (FIT.x1 - FIT.x0), (maxY - minY) / (FIT.y1 - FIT.y0));
      if (Number.isFinite(s) && s > 0) dist = clamp(dist * (it < 2 ? s : Math.sqrt(s)), 6, 120);
      // เลื่อนจุดกลางภาพ (หน่วย NDC)
      const cxL = (minX + maxX) / 2, cyL = (minY + maxY) / 2, wantX = (FIT.x0 + FIT.x1) / 2, wantY = (FIT.y0 + FIT.y1) / 2;
      off = [off[0] - ((cxL - wantX) * b.k) / C.w * 2, off[1] + ((cyL - wantY) * b.k) / C.h * 2]; // ขวาเกิน = เลื่อนซ้าย · ต่ำเกิน = เลื่อนขึ้น
    }
    return { dist, off };
  }

  // p = { map, units, focus, rotation, zoom, view, night, size, base, roadtrip }
  function update(nowMs, dtMs, p) {
    const dt = Math.min(0.05, Math.max(0, (dtMs || 16) / 1000)), t = nowMs / 1000;
    const { map, size, base } = p;
    if (!map) return;
    if (size && (size.w !== C.w || size.h !== C.h)) { C.w = size.w; C.h = size.h; renderer.setSize(C.w, C.h, false); camera.aspect = C.w / Math.max(1, C.h); camera.updateProjectionMatrix(); }
    C.base = base;
    const lay = vanLayout(map);
    if (lay.sig !== mapSig) {
      mapSig = lay.sig; L.lay = lay;
      // ช่องรถตู้ 3×7: กลางห้อง (x = −0.5 ในกรอบรถ) ตรงกลางบล็อก
      // ห้องในรถ: กลางตาราง 3×7 (x = −0.5 ในกรอบรถ) ตรงกลางบล็อก · รถจอด: กลางตัวรถตรงกลางบล็อก (ย่อตามบล็อก)
      van.group.position.set(lay.walk ? 0.5 : 0, 0, 0); van.group.scale.set(lay.scale, lay.scale, lay.scale * (lay.mirror ? -1 : 1));
      van.setView(lay.walk ? "board" : "out");
      van.group.visible = true;
      buildGrid();
    }
    const rt = p.roadtrip || null;
    syncObs(map, rt && rt.region && REGION[rt.region.id] ? rt.region.id : world.W.region);
    if (rt) {
      world.setRegion(rt.region && rt.region.id);
      if (rt.van) van.setState(rt.van);
      for (const f of Array.isArray(rt.fx) ? rt.fx : []) {
        const k = f && (f.key ?? f.id ?? `${f.k}|${f.at || ""}`);
        if (!f || C.fx.has(k)) continue;
        C.fx.add(k);
        if (f.k === "turret") {
          // เป้า: x,y หรือ to {x,y} หรือ target {x,y} — หันป้อม · แสงปากกระบอก · กระสุนส่องวิถี 3 นัด
          const tg = Number.isFinite(f.x) ? f : f.to || f.target || f.at || null;
          if (tg && Number.isFinite(tg.x) && Number.isFinite(tg.y)) {
            toWorld(tg.x + 0.5, tg.y + 0.5, 0.5, _a);
            if (van.aimFire(_a, _b)) for (let k = 0; k < 3; k++) fxSpawn("tracer", _b, _a, k * 0.11);
          } else van.fireTurret(undefined, false);
        }
        if (f.k === "swerve") { C.sw = { t0: t, side: f.side === "left" || f.side < 0 ? -1 : 1 }; C.shake = Math.max(C.shake, 0.5); }
        if (f.k === "crash" || f.k === "hit") C.shake = Math.max(C.shake, 0.35);
      }
      if (C.fx.size > 300) C.fx = new Set([...C.fx].slice(-120));
    }
    world.setNight(p.night != null ? !!p.night : !!(rt && rt.night));
    van.setNight(world.W.nightK > 0.5);
    L.floor = van.floorY();
    // ถนนเลื่อน (สู้บนรถตู้): เปลี่ยนรอบ = ไหลไป scroll ช่อง (+ ระยะเสริมให้รู้สึกวิ่ง) แบบนุ่ม 1.4 วิ
    const cb = rt && rt.combat;
    const onvan = !!(cb && cb.kind === "onvan");
    let dx = 0, speed = 0;
    // สู้บนรถตู้: รถวิ่งตลอด (ถนน/ของข้างทาง/เมฆไหลผ่าน ล้อหมุน ตัวรถโยกเบาๆ) — ตารางกระดานอยู่กับรถ ไม่ขยับ · เปลี่ยนรอบ = กระชากเพิ่มอีกช่วง
    const CRUISE = 24;
    if (onvan) { C.cruise = Math.min(CRUISE, (C.cruise || 0) + dt * 12); dx = C.cruise * dt; speed = C.cruise; } else C.cruise = 0;
    if (onvan) {
      if (C.scroll.round == null) C.scroll.round = cb.round;
      if (cb.round !== C.scroll.round) {
        C.scroll.round = cb.round; C.scroll.t0 = t; C.scroll.k = 0;
        C.scroll.from = 0; C.scroll.to = Math.max(1, +cb.scroll || 1) + 30; C.scroll.done = 0;
      }
      if (C.scroll.k < 1) {
        C.scroll.k = clamp((t - C.scroll.t0) / 1.4, 0, 1);
        const pos = C.scroll.to * easeIO(C.scroll.k);
        const ex = pos - C.scroll.done; C.scroll.done = pos; dx += ex; speed += ex / Math.max(dt, 1e-3);
      }
    } else C.scroll.round = null;
    // โยกเบาๆ (เล็กพอที่หมากบนพื้นรถไม่ดูลอย) — กระชากตอนเปลี่ยนรอบ = เงยหน้านิดหนึ่ง
    const lurch = onvan && C.scroll.k < 1 ? Math.sin(C.scroll.k * Math.PI) : 0;
    C.runSpeed = onvan ? speed : 0;
    let roll = onvan ? Math.sin(t * 1.7) * 0.004 + Math.sin(t * 4.3) * 0.002 : 0;
    const pitchV = onvan ? Math.sin(t * 2.3) * 0.002 - lurch * 0.012 : 0;
    // หักหลบ/พุ่งชน (fx swerve): รถเอียง + ไถลไปข้างแล้วกลับ + ควันยาง
    let slide = 0;
    if (C.sw) {
      const k = (t - C.sw.t0) / 1.1;
      if (k >= 1) C.sw = null;
      else {
        const env = Math.sin(Math.PI * Math.min(1, k * 1.2)) * (1 - k * 0.3);
        roll += -C.sw.side * 0.07 * env; slide = C.sw.side * 0.18 * env;
        if (Math.random() < dt * 30) { van.group.updateMatrixWorld(); for (const wx of [-2.6, 2.6]) { _b.set(wx, 0.3, -C.sw.side * 1.5).applyMatrix4(van.group.matrixWorld); fxSpawn("smoke", _b); } }
      }
    }
    van.group.position.z = slide; // เลื่อนข้างในโลก (แกนข้างของรถ = Z)
    van.tick(dt, t, { speed: onvan ? Math.max(speed, 0) : 0, roll, pitch: pitchV, steer: 0, beat: 0 });
    world.update(dt, t, dx, 0, 0);
    // เงาอบใหม่เฉพาะตอนรถเปลี่ยน
    fxTick(dt);
    if (rt && rt.combat) van.setRoofStand(rt.combat.roofId != null);
    C.roofId = rt && rt.combat ? rt.combat.roofId : null;
    const vSig = rt && rt.van;
    if (vSig !== C.vanRef || van.busy() || C.shadowFrames < 3 || world.W.regionTo != null || (world.W.nightK > 0 && world.W.nightK < 1) || lurch > 0) { C.vanRef = vSig; renderer.shadowMap.needsUpdate = true; }
    C.shadowFrames = (C.shadowFrames || 0) + 1;
    // ---- กล้อง: หมุน 90° นุ่มๆ · มุมเอียง/บน · ซูม 5 ขั้นเข้าหาโฟกัส
    const rot = Number.isFinite(+p.rotation) ? +p.rotation : 0;
    const yawT = rot * Math.PI / 2;
    if (C.yawT == null) { C.yawT = yawT; C.yaw = yawT; }
    if (yawT !== C.yawT) { let d = yawT - C.yaw; d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; C.yawT = yawT; C.yawGoal = C.yaw + d; }
    if (C.yawGoal != null) { C.yaw += (C.yawGoal - C.yaw) * Math.min(1, dt * 7); if (Math.abs(C.yawGoal - C.yaw) < 1e-3) { C.yaw = C.yawGoal; C.yawGoal = null; } }
    const pitchT = p.view === "top" ? TOP : TILT;
    C.pitch += (pitchT - C.pitch) * Math.min(1, dt * 6);
    if (Math.abs(pitchT - C.pitch) < 1e-4) C.pitch = pitchT;
    toWorld(L.lay.cols / 2, L.lay.rows / 2, 0, _a, true);
    C.tx = _a.x; C.tz = _a.z;
    const bcx = _a.x, bcz = _a.z;
    C.bcx0 = bcx; C.bcz0 = bcz;
    const f = fit(); C.dist = f.dist;
    const zl = clamp(Number.isFinite(+p.zoom) ? Math.round(+p.zoom) : 0, 0, 4);
    const fo = p.focus && Number.isFinite(p.focus.x) ? p.focus : null;
    toWorld(fo ? fo.x + 0.5 : L.lay.cols / 2, fo ? fo.y + 0.5 : L.lay.rows / 2, 0, _tgt, true);
    const k = zl / 4 * 0.85, gx = lerp(bcx, _tgt.x, k), gz = lerp(bcz, _tgt.z, k);
    C.camTx = C.camTx == null ? gx : lerp(C.camTx, gx, Math.min(1, dt * 4));
    C.camTz = C.camTz == null ? gz : lerp(C.camTz, gz, Math.min(1, dt * 4));
    C.zd = C.zd == null ? ZOOM_K[zl] : lerp(C.zd, ZOOM_K[zl], Math.min(1, dt * 5));
    C.tx = C.camTx; C.tz = C.camTz;
    C.anim = Math.abs(C.camTx - gx) + Math.abs(C.camTz - gz) > 0.01 || Math.abs(C.zd - ZOOM_K[zl]) > 0.002 || C.pitch !== pitchT;
    C.shake = Math.max(C.shake, takeRtShake()); // ปะทะหนักบนกระดาน 2D (ท่าบอส — board/roadtrip/rtTimeline.rtShake)
    C.shake = Math.max(0, C.shake - dt * 1.4);
    placeCamera(f.dist * C.zd, f.off);
    if (C.shake > 0) { camera.position.x += (Math.random() - 0.5) * C.shake; camera.position.y += (Math.random() - 0.5) * C.shake; camera.updateMatrixWorld(); }
    world.follow(camera);
    renderer.render(scene, camera);
  }

  // ---------------------------------------------------------------- ตัวฉายภาพให้ชั้น 2D
  function project(x, y, z = 0) {
    toWorld(x, y, z, _v);
    _v.applyMatrix4(camera.matrixWorldInverse);
    const depth = -_v.z;
    if (depth < 0.05) return [NaN, NaN, 0];
    _v.applyMatrix4(camera.projectionMatrix);
    const b = C.base || { k: 1, ox: 0, oy: 0 };
    const cssX = (_v.x + 1) / 2 * C.w, cssY = (1 - _v.y) / 2 * C.h;
    const focalL = (C.h / 2) / Math.tan(camera.fov * Math.PI / 360) / (b.k || 1);
    return [(cssX - b.ox) / b.k, (cssY - b.oy) / b.k, focalL / depth];
  }
  function depth(x, y) { toWorld(x, y, 0, _v).applyMatrix4(camera.matrixWorldInverse); return _v.z; }
  const ray = new THREE.Raycaster(), _n = new THREE.Vector2();
  function unproject(lx, ly) {
    const b = C.base || { k: 1, ox: 0, oy: 0 };
    const cssX = b.ox + lx * b.k, cssY = b.oy + ly * b.k;
    _n.set(cssX / C.w * 2 - 1, -(cssY / C.h * 2 - 1)); ray.setFromCamera(_n, camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    if (Math.abs(d.y) < 1e-6) return null;
    // พื้นรถตู้ก่อน (ยกสูง) แล้วค่อยพื้นถนน
    if (L.lay.has && L.lay.walk) {
      const tt = (L.floor - o.y) / d.y;
      if (tt > 0) { const q = toBoard(o.x + d.x * tt, o.z + d.z * tt); if (inVan(q.x, q.y)) return q; }
    }
    const tt = -o.y / d.y; if (tt <= 0) return null;
    const q = toBoard(o.x + d.x * tt, o.z + d.z * tt);
    if (q.x < 0 || q.y < 0 || q.x >= L.lay.cols || q.y >= L.lay.rows) return null;
    return q;
  }

  // API เดียวกับ colony3d (BoardCanvas ใช้ช่องเดียวกัน st.cv3) — ส่วนที่เป็นของ Colony = ว่าง
  return {
    isRoad: true,
    // ความสูงเพิ่มของหมาก id ที่จุดกลางตัว (cx, cy) — หน่วยช่อง (BoardCanvas บวกเข้า u.hz)
    unitLift: (id, cx, cy) => unitLift(id, cx, cy, performance.now() / 1000),
    runSpeed: () => C.runSpeed || 0, // ความเร็วถนนตอนนี้ (หน่วย/วิ) — มอนวิ่งไล่ตามจังหวะนี้ (mobArt.setRtMobRun)
    update, project, depth, unproject,
    busy: () => C.cruise > 0 || !!C.sw || !!C.fxLive || ((la) => { C.liftAnim = false; return la; })(!!C.liftAnim) || C.scroll.k < 1 ||  // บนรถตู้: ถนนวิ่งตลอด = วาด 60 fps (30 fps ดูกระตุก — ผู้ใช้ต้องการคุณภาพสูงสุด)
      C.yawGoal != null || !!C.anim || C.shake > 0 || world.W.regionTo != null || (world.W.nightK > 0 && world.W.nightK < 1) || (van.group.visible && van.busy()),
    onEvent() {}, pose() { return null; }, hidden() { return false; }, occludeBelow() { return null; }, capsuleAt() { return []; },
    flash() { return 0; }, flashColor() { return "255,255,255"; }, burnFrom() { return null; },
    orbit() {}, pan() {}, zoomBy() {}, recenter() {}, home() {}, away() { return false; }, edgeMark() { return null; },
    focusDist() { return C.dist * (C.zd || 1); }, toggleAxis() {}, skipShot() {}, setFocusId() {},
    van, camera,
    dispose(lose = false) {
      if (grid) grid.geometry.dispose(); gridMat.dispose();
      disposeObs(); disposeFx();
      van.dispose(); world.dispose(); renderer.dispose();
      if (lose) { try { renderer.forceContextLoss(); } catch { /* แล้ว */ } } // ออกจากกระดานจริง = คืน context ทันที
    },
  };
}
