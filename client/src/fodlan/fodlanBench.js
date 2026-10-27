// ============================================================
//  วัดความลื่นของฉาก Fodlan (เฉพาะ dev — ?fodlan=bench&stage=3&wx=1&lowq=1)
//  วาดทีละเฟรมแบบบังคับรอ GPU (readPixels 1 จุด) จึงวัดได้แม้แท็บถูกซ่อน (rAF ถูกชะลอ)
//  ผล: window.__fdBench = { build, firstMap, firstStage, map: {avg, p95, max}, stage: {...}, long: [งานยาว > 50ms ระหว่างสร้าง] }
// ============================================================
import * as THREE from "three";
import { createFodlanTheatre } from "./fodlanTheatre";
import { MAP_W } from "./fodlanMap";

const stats = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return { avg: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2), max: +s[s.length - 1].toFixed(2) };
};

export async function runFodlanBench({ stage = 1, weather = false, lowQ = false, w = 1280, h = 720, dpr = 1 } = {}) {
  const long = [];
  let po = null;
  try { po = new PerformanceObserver((l) => l.getEntries().forEach((e) => long.push([Math.round(e.startTime), Math.round(e.duration)]))); po.observe({ type: "longtask", buffered: false }); } catch { /* ไม่รองรับ */ }
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:${h}px`;
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowQ });
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  renderer.debug.checkShaderErrors = false;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, w / h, 0.03, 2600);
  const core = { THREE, scene, camera, renderer, size: { w, h } };
  const gl = renderer.getContext();
  const px = new Uint8Array(4);
  const draw = () => { const t0 = performance.now(); renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return performance.now() - t0; };

  const t0 = performance.now();
  const th = createFodlanTheatre(core, { stage, weather, lowQ });
  await th.ready;
  const build = Math.round(performance.now() - t0);
  th.enter();

  // แผนที่: กล้องลงจากเหนือเมฆจนลอยเหนือทวีป
  th.show("map");
  const mapT = [];
  let firstMap = 0;
  for (let i = 0; i < 90; i++) {
    const k = i / 89, t = i / 60;
    const y = 34 - 23 * k;
    th.mapCam(new THREE.Vector3(0, y, 5 + 4 * k), new THREE.Vector3(0, 0, 0.4), 40);
    th.map.markers.forEach((m) => m.set(k, m.stage.id === stage ? k : 0));
    th.map.setReveal(k < 0.6 ? k * 20 : -1, 0, 0);
    th.clouds.update(y, 1 - k);
    th.update(t);
    const ms = draw();
    if (i === 0) firstMap = ms; else mapT.push(ms);
  }
  // ฉากด่าน
  th.show("stage");
  const stT = [];
  let firstStage = 0;
  for (let i = 0; i < 150; i++) {
    const k = i / 149, t = 10 + i / 60;
    const a = performance.now();
    th.stageFrame(k, t, 50);
    const upd = performance.now() - a;
    const ms = draw() + upd;
    if (i === 0) firstStage = ms; else stT.push(ms);
  }
  po?.disconnect();
  const out = {
    stage, weather, lowQ, size: `${w}x${h}@${dpr}`, build, firstMap: +firstMap.toFixed(1), firstStage: +firstStage.toFixed(1),
    map: stats(mapT), stage_: stats(stT), long, gpu: (() => { const d = gl.getExtension("WEBGL_debug_renderer_info"); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : "?"; })(),
    marks: performance.getEntriesByType("mark").filter((m) => m.name.startsWith("fd:")).map((m) => `${m.name.slice(3)}@${Math.round(m.startTime)}`).join(" "),
    calls: renderer.info.render.calls, tris: renderer.info.render.triangles, mapW: MAP_W,
  };
  th.dispose();
  renderer.dispose();
  canvas.remove();
  return out;
}
