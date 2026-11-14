// ============================================================
//  รถตู้ 3D จริง (client/src/roadtrip/van3d.js) เป็นภาพสไปรต์บนกระดาน 2D ของจุดพัก (ผู้ใช้สั่ง 2026-11-14 "ใช้รถ 3D จริง")
//  WebGLRenderer นอกจอตัวเดียว (ไม่ติด DOM · ใช้ซ้ำ) · กล้องตั้งฉาก (Orthographic) มุมก้มเท่ากระดาน (pitchOf) หมุนตามมุมมอง (viewTurn ทีละ 90°)
//  ไม่เรนเดอร์ทุกเฟรม: เรนเดอร์ใหม่เฉพาะเมื่อกุญแจเปลี่ยน (สี ทรง ของแต่ง อัปเกรด ทะเบียน กลางคืน มุมกล้อง ประตูท้าย ขนาดภาพเป็นขั้น)
//   หน่วงรวม ~150ms (แก้ในอู่รัวๆ = เรนเดอร์ครั้งเดียว) · ระหว่างรอ/หมุนมุมมอง/ไม่มี WebGL = props.js ใช้รถ 2D เดิม
//  vanSprite(look, night, s, devK) → { cv, R } | null  — cv = ภาพจัตุรัส ด้าน 2R ช่อง · จุดกลางภาพ = จุดกลางพื้นใต้รถ
//  หน่วย: 1 ช่องกระดาน = 1 หน่วยฉาก · ความยาวรถ ≈ 3.9 ช่อง ตามแกน x ของกระดาน (หน้ารถ = +x)
// ============================================================
import { pitchOf, viewTurn } from "../boardGeo";

const R = 2.7;                 // ครึ่งกรอบภาพ (ช่อง)
const LEN = 3.9, WID = 1.9;    // ขนาดรถบนกระดาน (vanBlock 4×2)
let THREE = null, mod = null, RoomEnv = null, envTex = null, loading = null, failed = false;
let renderer = null, scene = null, cam = null, hemi = null, sun = null, van = null, fit = null;
const CACHE = new Map();       // กุญแจ → { cv, R }
let pendKey = null, pendT = 0, timer = null, lastUse = 0, idleTimer = null;
export const VAN_SPRITE_STATS = { renders: 0, lastMs: 0, maxMs: 0, buildMs: 0, fit: null };
export const vanSpriteCache = () => CACHE; // dev: ตรวจภาพที่อบไว้
if (import.meta.env && import.meta.env.DEV && typeof window !== "undefined") window.__vanSprite = { stats: VAN_SPRITE_STATS, cache: CACHE };

function load() {
  if (loading || failed) return;
  loading = Promise.all([import("three"), import("../../roadtrip/van3d.js"), import("three/examples/jsm/environments/RoomEnvironment.js")]).then(([t, m, re]) => { THREE = t; mod = m; RoomEnv = re.RoomEnvironment; })
    .catch((e) => { failed = true; VAN_SPRITE_STATS.err = String(e && e.message || e); });
}
function setup() {
  if (renderer || failed) return !!renderer;
  const t0 = performance.now();
  try {
    const cv = document.createElement("canvas");
    renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: false, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(1);
  } catch (e) { failed = true; renderer = null; VAN_SPRITE_STATS.err = String(e && e.message || e); return false; }
  scene = new THREE.Scene();
  // แสงสะท้อนรอบตัว (สีเคลือบเงาของรถต้องมีอะไรสะท้อน ไม่งั้นทึบหม่น) + ฟ้า/พื้น + แดด
  try { const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromScene(new RoomEnv(), 0.04).texture; pm.dispose(); scene.environment = envTex; } catch { /* ไม่มีก็ได้ */ }
  hemi = new THREE.HemisphereLight(0xf4f6ff, 0x9a9480, 1.6); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff4e0, 2.4); scene.add(sun); scene.add(sun.target);
  cam = new THREE.OrthographicCamera(-R, R, R, -R, 0.1, 100);
  van = mod.createVan({ lowQ: false });
  van.setView("out"); van.setRoof(false);
  van.tick(0, 0, { speed: 0 });
  scene.add(van.group);
  // ย่อรถให้ยาว LEN ช่อง (วัดครั้งเดียวจากรถเปล่า — ของแต่งไม่ทำให้รถหด/ขยาย)
  van.group.updateMatrixWorld(true);
  // กรอบจากชิ้นที่มองเห็นเท่านั้น (ลำแสงไฟหน้า/ของแต่งที่ปิดอยู่ไม่นับ)
  const box = new THREE.Box3(), tmp = new THREE.Box3();
  van.group.traverseVisible((o) => { if (o.isMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(tmp); } });
  const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const k = Math.min(LEN / size.x, WID / size.z);
  fit = { k, cx: c.x, cz: c.z, y0: box.min.y };
  van.group.scale.setScalar(k);
  van.group.position.set(-fit.cx * k, -fit.y0 * k, -fit.cz * k);
  VAN_SPRITE_STATS.buildMs = Math.round(performance.now() - t0); VAN_SPRITE_STATS.fit = { k, x: +size.x.toFixed(2), y: +size.y.toFixed(2), z: +size.z.toFixed(2) };
  return true;
}
// มุมกล้องของกระดานตอนนี้ (มุมหมุนต้องเป็นจำนวนเต็ม — ระหว่างหมุนนุ่มๆ ใช้รถ 2D)
function camKey() {
  const tr = viewTurn(), t = Math.round(tr);
  if (Math.abs(tr - t) > 1e-3) return null;
  return `${pitchOf()}|${((t % 4) + 4) % 4}`;
}
function render(key, look, night, px) {
  const t0 = performance.now();
  const [pitch, turn] = key.split("#")[0].split("|").map(Number);
  van.setState(look); van.setNight(night); van.setRoof(false);
  van.tick(0, 1, { speed: 0 });
  // ทิศเข้าหากล้องบนกระดาน f = (sinθ, cosθ) → ฉาก: x = กระดาน x · z = กระดาน y · y = ขึ้น
  const th = turn * Math.PI / 2, fx = Math.sin(th), fy = Math.cos(th), a = pitch * Math.PI / 180;
  cam.position.set(fx * Math.cos(a) * 30, Math.sin(a) * 30, fy * Math.cos(a) * 30);
  if (pitch >= 80) cam.up.set(-fx, 0, -fy); else cam.up.set(0, 1, 0);
  cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  // แสง: แดดเฉียงซ้ายบน (เข้ากับหน้าสว่าง/ข้างเข้มของกระดาน) · กลางคืนฟ้าอมน้ำเงินมืด
  hemi.color.set(night ? 0x6a7ab8 : 0xf4f6ff); hemi.groundColor.set(night ? 0x1c2238 : 0x9a9480); hemi.intensity = night ? 0.8 : 1.5;
  sun.color.set(night ? 0x9fb0e8 : 0xfff4e0); sun.intensity = night ? 0.45 : 2.4;
  scene.environmentIntensity = night ? 0.22 : 0.85;
  sun.position.set(-6, 10, 8); sun.target.position.set(0, 0, 0);
  renderer.setSize(px, px, false);
  renderer.render(scene, cam);
  const cv = document.createElement("canvas"); cv.width = cv.height = px;
  cv.getContext("2d").drawImage(renderer.domElement, 0, 0);
  const ms = performance.now() - t0;
  VAN_SPRITE_STATS.renders++; VAN_SPRITE_STATS.lastMs = Math.round(ms * 10) / 10; VAN_SPRITE_STATS.maxMs = Math.max(VAN_SPRITE_STATS.maxMs, VAN_SPRITE_STATS.lastMs);
  return { cv, R };
}
function schedule(key, look, night, px) {
  if (pendKey === key) return;
  pendKey = key; pendT = performance.now();
  clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    if (!mod) { pendKey = null; return; }
    // ครั้งแรก: สร้างรถ (task หนึ่ง) → คอมไพล์เชเดอร์แบบไม่บล็อก (compileAsync) → เรนเดอร์ใน task ถัดไป — ไม่กองเป็นก้อนเดียวให้เฟรมสะดุด
    if (!renderer) {
      if (!setup()) { pendKey = null; return; }
      const t1 = performance.now();
      // คอมไพล์ทั้งชุดกลางวันและกลางคืน (กลางคืนเปิดไฟหน้า/ไฟในรถ = จำนวนแสงเปลี่ยน = เชเดอร์ชุดใหม่ — วัดได้ 1.2 วิ ถ้าปล่อยให้คอมไพล์ตอนเรนเดอร์)
      try {
        van.setState(look);
        if (renderer.compileAsync) for (const nt of [!night, night]) { van.setNight(nt); await renderer.compileAsync(scene, cam); if (!renderer) return; }
        van.setNight(night);
      } catch { /* คอมไพล์ตอนเรนเดอร์แทน */ }
      VAN_SPRITE_STATS.compileMs = Math.round(performance.now() - t1);
      await new Promise((r) => setTimeout(r, 0));
      if (!renderer || pendKey !== key) return;
    }
    try { CACHE.set(key, render(key, look, night, px)); } catch (e) { failed = true; VAN_SPRITE_STATS.err = String(e && e.stack || e); }
    if (CACHE.size > 8) CACHE.delete(CACHE.keys().next().value);
    pendKey = null;
  }, 150);
}
function idleCheck() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (performance.now() - lastUse > 14000) disposeVanSprite(); else idleCheck(); }, 15000);
}
// look = state.roadtrip.van · s = ขนาดช่องบนจอ (ตรรกะ) · devK = สเกลตรรกะ → พิกเซลจริง
export function vanSprite(look, night, s, devK) {
  VAN_SPRITE_STATS.calls = (VAN_SPRITE_STATS.calls || 0) + 1;
  if (failed || typeof document === "undefined") return null;
  lastUse = performance.now();
  if (!idleTimer) idleCheck();
  if (!mod) { load(); return null; }
  const ck = camKey();
  if (!ck) return null;
  // ขนาดภาพเป็นขั้น (2 เท่าของบนจอ ปัดขึ้นเป็น 2^n · 128–1024) — ซูมทีละนิดไม่เรนเดอร์ใหม่
  const want = Math.min(1024, Math.max(128, 2 * R * s * devK * 2));
  const px = Math.pow(2, Math.ceil(Math.log2(want)));
  const v = look || {};
  const lk = [v.paint, v.style, (v.decor || []).join(","), JSON.stringify(v.upg || {}), v.plate, night ? 1 : 0, v.rearOpen ? 1 : 0].join("|");
  const key = `${ck}#${lk}#${px}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  schedule(key, { ...v }, !!night, px);
  // ระหว่างรอ: ใช้ภาพมุมเดียวกันที่มีอยู่ (เช่นกำลังเปลี่ยนสีในอู่ / ขนาดเปลี่ยนขั้น) — มุมต่างกัน = null (รถ 2D)
  let best = null;
  for (const [k, e] of CACHE) if (k.startsWith(ck + "#")) best = e;
  return best;
}
export function disposeVanSprite() {
  clearTimeout(timer); clearTimeout(idleTimer); timer = idleTimer = null; pendKey = null;
  CACHE.clear();
  if (van) { van.dispose(); van = null; }
  if (envTex) { envTex.dispose(); envTex = null; }
  if (renderer) { renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); renderer = null; }
  scene = cam = hemi = sun = fit = null;
}
// อุ่นเครื่องล่วงหน้า (เรียกตอนกำลังเข้าจุดพัก — ฉากเปลี่ยน/จอมืด): โหลดโมดูล + สร้างรถ + คอมไพล์เชเดอร์ ก่อนกระดานโผล่
//  ไม่เรียกก็ได้ (vanSprite ทำเองตอนเจอครั้งแรก แต่จะสะดุด ~150–200ms หนึ่งครั้ง)
export async function prewarmVanSprite(look, night) {
  if (failed || typeof document === "undefined") return;
  lastUse = performance.now(); if (!idleTimer) idleCheck();
  load(); await loading;
  if (!mod || renderer || !setup()) return;
  try { van.setState(look || {}); if (renderer.compileAsync) for (const nt of [!night, !!night]) { van.setNight(nt); await renderer.compileAsync(scene, cam); } } catch { /* ไม่เป็นไร */ }
}
