// ขบวนการจอมราชันคิงโอเจอร์ — แกนดาบ Ohger Calibur กลาง HUD (สกิลพื้นฐาน + รองรวมเป็นก้อนเดียว — GRID_PLAN §7.22) · จอคอม/แท็บเล็ต
//  me.ohger = { own, armored, phase (null | loop | charge | standby), step, steps, pulls, pullsMax, next, canTransform, canFinish }
//  ดาบตั้ง เห็นแค่ด้าม · เรนเดอร์โมเดล "Ohger Caliber" by Ahbangkun (Sketchfab, CC-BY-4.0) สีเรียบแบบภาพอ้างอิงจากผู้ใช้
//   (ต้นแบบ .claude/plans/ohger-sword.html · ไฟล์ /characters/ohger/ohger_caliber.glb)
//  กดชิ้นจริงบนโมเดล (raycast) → onPress("b1"…"b5" | "trigger") · ไฟกระพริบ = ปุ่มที่ต้องกดต่อ · ใบดาบโคนเติมแสงสีร่าง · ไม่มีข้อความ
import { useEffect, useRef } from "react";
import "./ohgerSword.css";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const GLB = "/characters/ohger/ohger_caliber.glb";
const SEQ = [2, 3, 4, 5, 1];
// ชิ้นที่กดได้ (ชื่อ mesh หลัง three ตัดจุด) · ไก = ชิ้นดำซ้ายล่างใต้วงน้ำเงิน (ผู้ใช้ชี้ 2026-10-28) · คามาคิริ = เสี้ยวเหลืองบนห่วงขวา
const PART_MESH = {
  b1: (n) => n.startsWith("Circle008_"),
  b2: (n) => n.startsWith("Circle016_"),
  b3: (n) => n === "Circle030_yelloww_0",
  b4: (n) => n.startsWith("Circle010_"),
  b5: (n) => n.startsWith("Circle018_"),
  trigger: (n) => n.startsWith("Plane014_"),
};
const PART_GLOW = { b1: 0xff3b30, b2: 0x3d6bff, b3: 0xffc61a, b4: 0xb14bff, b5: 0xdfe4ee }; // ไกเรืองเป็นสีร่างของตัวเอง (OWN_HEX)
const OWN_HEX = { 1: 0xff3b30, 2: 0x3d6bff, 3: 0xffc61a, 4: 0xb14bff, 5: 0xdfe4ee };
const PARTS = Object.keys(PART_MESH);
// ท่ากดจากแอนิเมชันในโมเดล (ตัดเฉพาะกระดูกของชิ้นนั้น — วินาทีในคลิป "Scene")
const PRESS = {
  b5: [["Bone003_03"], 16.317, 16.583], b2: [["Bone004_04"], 8.017, 8.4], b3: [["Bone005_06"], 10.75, 11.217],
  b4: [["Bone008_08"], 13.467, 13.85], // ไก (Plane014) ไม่มีท่าในคลิป — ไฟวาบอย่างเดียว
};

let glbPromise = null;
const loadGlb = () => (glbPromise ||= new GLTFLoader().loadAsync(GLB).catch((e) => { glbPromise = null; throw e; }));

// โหมดไฟของแต่ละชิ้น: off | dim | blink | lit
function partMode(o, name) {
  if (!o) return "off";
  const own = `b${o.own}`;
  if (!o.armored) {
    if (o.phase === "loop") return name === `b${o.next}` ? "blink" : SEQ.slice(0, o.step).map((n) => `b${n}`).includes(name) ? "lit" : "off";
    if (o.canTransform) return name === own ? "blink" : "dim";
    return "off";
  }
  if (o.phase === "charge") return name === own ? "blink" : name === "trigger" ? "lit" : "dim";
  if (o.phase === "standby") return name === own || name === "trigger" ? "lit" : "dim";
  if (name === "trigger") return o.canFinish ? "blink" : "dim";
  return name === own ? "lit" : "off";
}
// กดได้ไหม (ลูปแปลงร่าง: ปุ่มสีไหนก็ได้ — ผิดคือโทษ · ขั้นแรก: เฉพาะสีตัวเอง)
function canPress(o, name) {
  if (!o) return false;
  if (!o.armored) {
    if (o.phase === "loop") return name !== "trigger";
    return !!o.canTransform && name === `b${o.own}`;
  }
  if (o.phase === "charge") return true;
  if (o.phase === "standby") return name === "trigger";
  return name === "trigger" && !!o.canFinish;
}
function fillOf(o) {
  if (!o) return 0;
  if (!o.armored) return o.phase === "loop" ? 0.06 + 0.94 * (o.step / (o.steps || 5)) : 0;
  if (o.phase === "charge") return o.pulls / (o.pullsMax || 3);
  return 1;
}

function buildScene(canvas, gltf) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(-1, 2, 3); scene.add(key);
  const cam = new THREE.PerspectiveCamera(20, 1, 0.01, 50);
  const pivot = new THREE.Group(); scene.add(pivot);
  // สำเนาฉากต่อดาบ 1 เล่ม (แชร์ geometry กับไฟล์ที่โหลดไว้)
  const model = gltf.scene.clone(true);
  pivot.add(model); model.updateMatrixWorld(true);
  const solid = [];
  let blade = null;
  model.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (/Outline/.test(o.name)) { o.material = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.FrontSide }); return; } // เส้นขอบแบบ inverted hull
    o.material = new THREE.MeshLambertMaterial({ color: m.color.clone(), side: m.side });
    if (o.name.includes("Light_Sword")) { blade = o; o.material.color.setHex(0xd2d5d8); }
    solid.push(o);
  });
  // จัดแนว: ปลายดาบชี้ขึ้น · หน้าใบดาบหันเข้ากล้อง · หัวหมุน (ฮาจิ) อยู่ซ้าย · เอียงขวาเล็กน้อย
  {
    const tmp = new THREE.Vector3(), all = [], bp = [];
    for (const o of solid) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i += 5) all.push(tmp.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).clone()); }
    const pb = blade.geometry.attributes.position; for (let i = 0; i < pb.count; i += 2) bp.push(tmp.fromBufferAttribute(pb, i).applyMatrix4(blade.matrixWorld).clone());
    const ctr = new THREE.Box3().setFromPoints(all).getCenter(new THREE.Vector3());
    let tip = bp[0]; for (const p of bp) if (p.distanceTo(ctr) > tip.distanceTo(ctr)) tip = p;
    let pom = all[0]; for (const p of all) if (p.distanceTo(tip) > pom.distanceTo(tip)) pom = p;
    const qa = new THREE.Quaternion().setFromUnitVectors(tip.clone().sub(pom).normalize(), new THREE.Vector3(0, 1, 0));
    const bq = bp.map((p) => p.clone().sub(ctr).applyQuaternion(qa));
    let yaw = 0, best = Infinity;
    for (let a = 0; a < Math.PI; a += Math.PI / 120) {
      const c = Math.cos(a), s = Math.sin(a); let lo = Infinity, hi = -Infinity;
      for (const p of bq) { const z = -p.x * s + p.z * c; lo = Math.min(lo, z); hi = Math.max(hi, z); }
      if (hi - lo < best) { best = hi - lo; yaw = a; }
    }
    const knob = new THREE.Box3().setFromObject(model.getObjectByName("Circle018")).getCenter(new THREE.Vector3()).sub(ctr).applyQuaternion(qa);
    if (knob.x * Math.cos(yaw) + knob.z * Math.sin(yaw) > 0) yaw += Math.PI;
    const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.12);
    pivot.quaternion.copy(tilt.multiply(qy.multiply(qa)));
    model.position.copy(ctr).negate();
    pivot.updateMatrixWorld(true);
  }
  const glowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,.5)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  })();
  const parts = {};
  for (const name of PARTS) {
    const meshes = []; model.traverse((o) => { if (o.isMesh && !/Outline/.test(o.name) && PART_MESH[name](o.name)) meshes.push(o); });
    const mats = meshes.map((o) => (o.material = o.material.clone()));
    mats.forEach((m) => (m.userData.base = m.color.clone()));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: PART_GLOW[name] || 0xffffff, transparent: true, opacity: 0, depthTest: false, blending: THREE.AdditiveBlending }));
    scene.add(halo);
    const b = new THREE.Box3(); meshes.forEach((m) => b.expandByObject(m));
    const size = b.getSize(new THREE.Vector3());
    halo.position.copy(b.getCenter(new THREE.Vector3())).add(new THREE.Vector3(0, 0, 0.2));
    halo.scale.setScalar(Math.min(size.x, size.y) * 1.8 + 0.06);
    parts[name] = { meshes, mats, halo, kick: 0 };
  }
  const meshPart = new Map(); for (const [n, p] of Object.entries(parts)) p.meshes.forEach((m) => meshPart.set(m, n));
  // แสงเติมใบดาบ — สำเนาใบดาบ + ระนาบตัดตามแกน Y
  const bb = new THREE.Box3().setFromObject(blade);
  const fillPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const fillMesh = new THREE.Mesh(blade.geometry, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, clippingPlanes: [fillPlane] }));
  blade.add(fillMesh); fillMesh.scale.setScalar(1.003);
  // ท่ากด
  const mixer = new THREE.AnimationMixer(model), clips = {};
  const src = gltf.animations[0];
  for (const [n, [bones, t0, t1]] of Object.entries(PRESS)) {
    const tracks = [];
    for (const tr of src ? src.tracks : []) {
      if (!bones.some((b) => tr.name.startsWith(b + "."))) continue;
      const k = tr.getValueSize(), T = [], V = [];
      tr.times.forEach((t, i) => { if (t >= t0 - 1e-3 && t <= t1 + 1e-3) { T.push(t - t0); for (let j = 0; j < k; j++) V.push(tr.values[i * k + j]); } });
      if (T.length > 1) tracks.push(new tr.constructor(tr.name, T, V));
    }
    if (tracks.length) clips[n] = new THREE.AnimationClip(n, t1 - t0, tracks);
  }
  function frame() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    const box = new THREE.Box3(); for (const p of Object.values(parts)) p.meshes.forEach((m) => box.expandByObject(m));
    const hgt = box.max.y - box.min.y; box.max.y += hgt * 0.12; box.min.y -= hgt * 0.22; // กรอบแน่น = ชิ้นใหญ่ กดง่าย (ผู้ใช้สั่ง)
    const sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    const dist = Math.max(sz.y / 2 / t, sz.x / 2 / t / cam.aspect) * 1.05;
    cam.position.set(c.x, c.y, c.z + dist + 0.4); cam.lookAt(c); cam.updateProjectionMatrix();
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function hitAt(x, y) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(solid, false)[0]; return hit ? meshPart.get(hit.object) || null : null;
  }
  // ชี้พลาดเล็กน้อยรอบเคอร์เซอร์ยังติด (ชิ้นเล็ก)
  function pick(x, y) {
    const direct = hitAt(x, y); if (direct) return direct;
    const votes = {};
    for (let a = 0; a < 8; a++) { const n = hitAt(x + Math.cos(a * Math.PI / 4) * 7, y + Math.sin(a * Math.PI / 4) * 7); if (n) votes[n] = (votes[n] || 0) + 1; }
    return Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0] || null;
  }
  function press(name) {
    const p = parts[name]; if (p) p.kick = 1;
    const c = clips[name]; if (!c) return;
    const act = mixer.clipAction(c); act.reset(); act.setLoop(THREE.LoopOnce, 1); act.play();
  }
  return { renderer, scene, cam, parts, mixer, fillPlane, fillMesh, fillY0: bb.min.y, fillY1: bb.max.y, frame, pick, press, glowTex };
}

export default function OhgerSword({ ohger, interactive, onPress }) {
  const canvasRef = useRef(null);
  const live = useRef({ ohger, interactive });
  useEffect(() => { live.current = { ohger, interactive }; });
  const sceneRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let raf = 0, dead = false, ro = null;
    const clock = new THREE.Clock();
    let fill = 0;
    loadGlb().then((gltf) => {
      if (dead) return;
      const S = buildScene(canvas, gltf);
      sceneRef.current = S;
      S.frame();
      ro = new ResizeObserver(() => S.frame()); ro.observe(canvas);
      const tick = () => {
        const dt = clock.getDelta(), t = clock.elapsedTime, o = live.current.ohger;
        S.mixer.update(dt);
        const bl = 0.5 + 0.5 * Math.sin(t * 8);
        for (const name of PARTS) {
          const p = S.parts[name], m = partMode(o, name); p.kick = Math.max(0, p.kick - dt * 3);
          let e = 0, h = 0, dim = 1;
          if (m === "blink") { e = 0.25 + 0.75 * bl; h = 0.2 + 0.65 * bl; } else if (m === "lit") { e = 0.45; h = 0.15; } else if (m === "dim") dim = 0.4;
          e += p.kick; h += p.kick * 0.7;
          const glow = name === "trigger" ? OWN_HEX[o && o.own] || 0xffffff : PART_GLOW[name];
          if (name === "trigger") p.halo.material.color.setHex(glow);
          for (const mat of p.mats) { mat.color.copy(mat.userData.base).multiplyScalar(dim); mat.emissive.setHex(glow); mat.emissiveIntensity = e * (name === "b5" || name === "trigger" ? 0.6 : 0.8); }
          p.halo.material.opacity = Math.min(0.6, h * 0.6);
        }
        fill += (fillOf(o) - fill) * Math.min(1, dt * 10);
        S.fillPlane.constant = S.fillY0 + (S.fillY1 - S.fillY0) * fill;
        S.fillMesh.visible = fill > 0.002;
        S.fillMesh.material.color.setHex(OWN_HEX[o && o.own] || 0xffffff);
        S.fillMesh.material.opacity = o && o.phase === "standby" ? 0.55 + 0.35 * Math.sin(t * 10) : 0.75;
        S.renderer.render(S.scene, S.cam);
        raf = requestAnimationFrame(tick);
      };
      tick();
    }).catch(() => { /* โหลดโมเดลไม่ได้ (ไฟล์ยังไม่ขึ้น R2) — ปล่อยช่องว่าง */ });
    return () => {
      dead = true; cancelAnimationFrame(raf); if (ro) ro.disconnect();
      const S = sceneRef.current; sceneRef.current = null;
      if (S) {
        S.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
        S.glowTex.dispose(); S.renderer.dispose();
      }
    };
  }, []);

  const target = (e) => {
    const S = sceneRef.current;
    if (!S || !live.current.interactive) return null;
    const n = S.pick(e.clientX, e.clientY);
    return n && canPress(live.current.ohger, n) ? n : null;
  };
  return (
    <div className="ohger-sword">
      <canvas
        ref={canvasRef}
        onPointerMove={(e) => { e.currentTarget.style.cursor = target(e) ? "pointer" : "default"; }}
        onPointerDown={(e) => {
          const n = target(e);
          if (!n) return;
          sceneRef.current.press(n);
          onPress(n);
        }}
      />
    </div>
  );
}
