// ============================================================
//  "โรงละคร" ของฉาก Fodlan — วางแผนที่ทวีป + ฉากเข้าด่านลงใน scene ของ three.js ที่มีอยู่แล้ว
//  ใช้ได้ทั้งกับลูกโลกร่วม (ฉากเปิดแมตช์ — core จาก GlobeCanvas) และ renderer ของตัวเอง (ฉากเปลี่ยนแผนที่)
//
//  const th = createFodlanTheatre(core, { stage, weather, lowQ, from })
//   await th.ready            — สร้างแผนที่ (แบ่งงานเป็นช่วง) + ฉากด่าน + คอมไพล์ shader ล่วงหน้าเสร็จ
//   th.enter()                — ซ่อนลูกโลก/แสงเดิม ตั้งกล้อง (near/far) — เรียกตอนแฟลชบังจอ
//   th.show("map" | "stage")  — สลับสิ่งที่เห็น (หมอก/แสงของแต่ละฝั่ง)
//   th.mapCam(pos, look, fov) / th.stageFrame(k, t, dt) — คุมกล้อง
//   th.restore()              — คืนทุกอย่างที่แก้ใน core (ฉากถูกยกเลิกกลางคัน/จบ)
//  ของ 3D ทั้งหมดอยู่ใต้ th.root (core.scene) — dispose() เก็บกวาด
// ============================================================
import { buildFodlanMap } from "./fodlanMap";
import { buildDiorama } from "./dioramas/index";
import { FODLAN_STAGES } from "./stages";
import { disposeTree, puffTex, rng, idle } from "./kit";


export function createFodlanTheatre(core, { stage = 1, weather = false, lowQ = false } = {}) {
  const { THREE, scene, camera, renderer } = core;
  const root = new THREE.Group();
  root.name = "fodlan";
  scene.add(root);

  let map = null, dio = null, clouds = null, mode = null, disposed = false;
  const saved = { entered: false };

  // ชั้นเมฆที่กล้องพุ่งทะลุลงมาก่อนเห็นแผนที่
  const makeClouds = () => {
    const g = new THREE.Group();
    const r = rng(17);
    const items = [];
    for (let i = 0; i < (lowQ ? 28 : 54); i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(THREE), color: i % 3 ? "#fff3dc" : "#f2d9b0", transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 13;
      sp.position.set(Math.cos(a) * d, 9 + r() * 16, Math.sin(a) * d * 0.8 + 3);
      const s = 7 + r() * 9;
      sp.scale.set(s, s * 0.62, 1);
      sp.material.rotation = r() * Math.PI;
      sp.userData.op = 0.55 + r() * 0.4;
      g.add(sp); items.push(sp);
    }
    return {
      group: g,
      update(camY, k) {
        // ก้อนที่กล้องลงมาพ้นแล้วจางหาย · k = ความเข้มรวม
        items.forEach((s) => { s.material.opacity = s.userData.op * k * Math.min(1, Math.max(0, (camY - s.position.y + 1.5) / 4)); });
      },
    };
  };

  const prewarm = async (obj, fog) => {
    if (!renderer?.compileAsync) return;
    const tmp = new THREE.Scene();
    tmp.fog = fog;
    const vis = obj.visible;
    obj.visible = true;
    tmp.add(obj);
    try { await renderer.compileAsync(tmp, camera); } catch { /* คอมไพล์ตอนเห็นจริงแทน */ }
    // วาดครั้งแรกลงเป้าเล็กๆ 1 ครั้ง = อัปโหลดพื้นผิว/บัฟเฟอร์ขึ้น GPU ตอนนี้ (ไม่ใช่ตอนแฟลชเปลี่ยนฉาก)
    await idle();
    try {
      const rt = new THREE.WebGLRenderTarget(4, 4);
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(rt);
      renderer.render(tmp, camera);
      renderer.setRenderTarget(prev);
      rt.dispose();
    } catch { /* ไม่เป็นไร */ }
    obj.visible = vis;
    if (!disposed) root.add(obj);
  };

  const ready = (async () => {
    await idle();
    const mk = (n) => performance.mark?.(`fd:${n}`);
    mk("map0");
    map = await buildFodlanMap(THREE, { lowQ });
    mk("map1");
    if (disposed) return;
    map.group.visible = false;
    root.add(map.group);
    clouds = makeClouds();
    map.group.add(clouds.group);
    await idle();
    mk("dio0");
    dio = await buildDiorama(THREE, stage, { weather, lowQ });
    mk("dio1");
    dio.group.visible = false;
    root.add(dio.group);
    await idle();
    try { renderer.initTexture?.(map.tex); } catch { /* อัปโหลดตอนวาดจริงแทน */ }
    mk("warmMap");
    await prewarm(map.group, map.fog);
    mk("warmDio");
    await prewarm(dio.group, dio.fog);
    mk("done");
  })();

  const look = new THREE.Vector3();
  let lastFov = camera.fov;
  const setFov = (f) => { if (Math.abs(f - lastFov) > 0.01) { camera.fov = f; camera.updateProjectionMatrix(); lastFov = f; } };

  return {
    root, ready,
    get map() { return map; },
    get dio() { return dio; },
    get clouds() { return clouds; },
    get mode() { return mode; },
    stageInfo: FODLAN_STAGES[stage - 1],
    /** ซ่อนลูกโลก + แสงเดิมของฉาก · ตั้งกล้องให้เห็นไกล */
    enter() {
      if (saved.entered) return;
      saved.entered = true;
      saved.near = camera.near; saved.far = camera.far; saved.fov = camera.fov;
      saved.fog = scene.fog;
      saved.worldVis = core.world ? core.world.visible : null;
      saved.sandVis = core.sand ? core.sand.visible : null;
      saved.lights = [];
      scene.children.forEach((o) => { if (o.isLight && o.visible) { saved.lights.push(o); o.visible = false; } });
      if (core.world) core.world.visible = false;
      if (core.sand) core.sand.visible = false;
      camera.near = 0.03; camera.far = 2600;
      camera.updateProjectionMatrix();
    },
    show(which) {
      mode = which;
      if (map) map.group.visible = which === "map";
      if (dio) dio.group.visible = which === "stage";
      scene.fog = which === "map" ? map?.fog || null : which === "stage" ? dio?.fog || null : saved.fog || null;
      if (which === "stage" && dio && !dio.group.parent) root.add(dio.group);
      if (which === "map" && map && !map.group.parent) root.add(map.group);
    },
    mapCam(pos, at, fov = 34) {
      camera.position.copy(pos);
      camera.lookAt(at);
      setFov(fov);
    },
    /** กล้องฉากด่านตามเส้นทางของด่าน · k = 0..1 ของฉากด่าน */
    stageFrame(k, t, fov = 50) {
      if (!dio) return;
      const p = dio.cam.at(k);
      camera.position.copy(p.pos);
      camera.lookAt(look.copy(p.look));
      setFov(fov);
      dio.update(t, k, core.size?.h || 900, camera.position);
    },
    update(t) {
      if (map && mode === "map") map.update(t, core.size?.h || 900);
    },
    restore() {
      if (!saved.entered) return;
      saved.entered = false;
      camera.near = saved.near; camera.far = saved.far; camera.fov = saved.fov;
      camera.updateProjectionMatrix();
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
      map?.tex?.dispose?.();
    },
  };
}
