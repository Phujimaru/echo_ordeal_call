// ============================================================
//  ฉากเปลี่ยนแผนที่ของโหมด Fodlan (ต้นเทิร์น 7 สุ่มไปด่านอื่น — GRID_PLAN §8.5) — ไม่ใช้ลูกโลก
//  <FodlanTravel from={1..5} to={1..5} weather={bool} durationMs={ms} lowQ onDone />
//  หมึกปาดจากกระดาน → แผนที่ทวีปบนโต๊ะ (หมุดด่านเดิมสว่าง) → เส้นทางประลากจากด่านเดิมไปด่านใหม่ กล้องตามหัวเส้น
//  → หมุดด่านใหม่สว่าง → โฉบลง → แฟลชสีด่าน → ฉากเข้าด่าน + ป้ายชื่อ → แฟลชขาว (onDone)
//  renderer ของตัวเอง (ซ้อนบนกระดาน) · เริ่มนับเวลาเมื่อสร้างฉากเสร็จ (ระหว่างนั้นหมึกบังจอ)
// ============================================================
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createFodlanTheatre } from "./fodlanTheatre";
import FodlanCine from "./FodlanCine";
import { clampFodlanStage, FODLAN_TRAVEL_MS, FODLAN_TRAVEL_T as T } from "./stages";
import { span, easeInOut, easeOut, easeIn, smooth, clamp01 } from "./kit";
import { fodlanAudio } from "./fodlanAudio";
import { playMusic } from "../audio";

export default function FodlanTravel({ from = 1, to = 2, weather = false, durationMs, lowQ = false, onDone }) {
  const a = clampFodlanStage(from), b = clampFodlanStage(to);
  const D = Math.max(5000, Number(durationMs) || FODLAN_TRAVEL_MS);
  const ref = useRef(null);
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowQ, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowQ ? 1 : 1.75));
    renderer.debug.checkShaderErrors = false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#1a0d06");
    const camera = new THREE.PerspectiveCamera(34, 1, 0.03, 2600);
    const size = { w: 1, h: 1 };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      size.w = Math.max(1, r.width); size.h = Math.max(1, r.height);
      renderer.setSize(size.w, size.h, false);
      camera.aspect = size.w / size.h; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
    const core = { THREE, scene, camera, renderer, get size() { return size; } };
    const theatre = createFodlanTheatre(core, { stage: b, weather, lowQ });
    const audio = fodlanAudio();
    const info = theatre.stageInfo;
    audio.preload(["cine_map", "cine_swoop", "cine_stage", "war_horn", info.amb, info.wx, ...(b === 4 ? ["campfire"] : [])].filter(Boolean));

    let raf = 0, start = 0, alive = true, finished = false, route = null, lastU = -1, dioEvents = null;
    const cam = new THREE.Vector3(), at = new THREE.Vector3(), MA = new THREE.Vector3(), MB = new THREE.Vector3(), tok = new THREE.Vector3(), tmp = new THREE.Vector3();
    const swoop = { from: new THREE.Vector3(), look: new THREE.Vector3(), set: false };
    const cues = [
      [0.001, () => playMusic("fodlan_map", performance.now())], // เพลงฉากแผนที่ระหว่างเปลี่ยนด่าน (เริ่มต้นเพลงทุกครั้ง)
      [0.02, () => audio.sfx("cine_map", { gain: 0.8 })],
      [T.route, () => audio.sfx("war_horn", { gain: 0.55 })],
      [T.swoop, () => audio.sfx("cine_swoop")],
      [T.stage - 0.01, () => { audio.sfx("cine_stage"); audio.setStage(b, { weather, fade: 3 }); audio.thunder(b === 1 && weather); playMusic(`fodlan_${b}${weather ? "_wx" : ""}`); }],
    ];

    theatre.ready.then(() => {
      if (!alive) return;
      theatre.enter();
      theatre.show("map");
      theatre.map.setReveal(-1);
      route = theatre.map.route(a, b);
      start = performance.now();
      setStarted(true);
    });

    const frame = (now) => {
      if (!alive) return;
      const t = now / 1000;
      if (start) {
        const u = import.meta.env.DEV && window.__fdU != null ? window.__fdU : clamp01((now - start) / D);
        for (const [cu, fn] of cues) if (lastU < cu && u >= cu) { try { fn(); } catch { /* */ } }
        const map = theatre.map;
        map.markers[a - 1].group.getWorldPosition(MA);
        map.markers[b - 1].group.getWorldPosition(MB);
        if (u < T.stage) {
          if (theatre.mode !== "map") theatre.show("map");
          map.markers.forEach((mk) => {
            const id = mk.stage.id;
            mk.set(1, id === a ? 1 - smooth(span(u, T.focus - 0.06, T.focus)) : id === b ? smooth(span(u, T.focus - 0.04, T.focus + 0.02)) : 0);
          });
          const rk = easeInOut(span(u, T.route, T.focus - 0.02));
          route.setProgress(rk, t);
          theatre.clouds.update(99, 0);
          theatre.update(t);
          if (u < T.swoop) {
            route.tokenPos(Math.max(0.0001, rk), tok);
            const k0 = easeOut(span(u, 0, T.route));
            // เปิด: ใกล้หมุดเดิม → ถอยขึ้นเห็นทั้งสองหมุด แล้วตามหัวเส้น
            tmp.copy(MA).add(new THREE.Vector3(0.3, 2.2, 3)).lerp(new THREE.Vector3((MA.x + MB.x) / 2, 9.5, (MA.z + MB.z) / 2 + 7.5), k0);
            cam.copy(tmp).lerp(new THREE.Vector3(tok.x * 0.6, 7.2, tok.z * 0.6 + 6), smooth(span(u, T.route, T.swoop)) * 0.55);
            at.copy(MA).lerp(tok, smooth(span(u, T.route - 0.04, T.route + 0.1)));
            theatre.mapCam(cam, at, 34);
          } else {
            if (!swoop.set) { swoop.from.copy(camera.position); swoop.look.copy(at); swoop.set = true; }
            const k = span(u, T.swoop, T.stage);
            const k1 = easeInOut(clamp01(k / 0.7)), k2 = easeIn(clamp01((k - 0.62) / 0.38));
            tmp.copy(MB).add(new THREE.Vector3(0.4, 2.4, 3.2));
            cam.copy(swoop.from).lerp(tmp, k1);
            cam.y += Math.sin(k1 * Math.PI) * 1.2;
            cam.lerp(tmp.copy(MB).setY(MB.y + 0.3), k2 * 0.96);
            at.copy(swoop.look).lerp(MB, easeInOut(clamp01(k * 1.6)));
            theatre.mapCam(cam, at, 34 + k2 * 30);
          }
        } else {
          if (theatre.mode !== "stage") { theatre.show("stage"); dioEvents = (theatre.dio?.events || []).map((e) => ({ ...e, done: false })); }
          const kd = span(u, T.stage, 1);
          const k = 1 - Math.pow(1 - kd, 1.5);
          theatre.stageFrame(k, t, 52 - 8 * easeOut(kd));
          dioEvents?.forEach((e) => { if (!e.done && k >= e.u) { e.done = true; try { audio.sfx(e.sfx); } catch { /* */ } } });
        }
        lastU = u;
        if (u >= 1 && !finished) { finished = true; doneRef.current?.(); }
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      route?.dispose();
      theatre.dispose();
      renderer.dispose();
    };
    // ฉากหนึ่งครั้งต่อการ mount (ใส่ key ใหม่เมื่อเปลี่ยนแผนที่รอบใหม่)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, background: "#1a0d06" }}>
      <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      {started && <FodlanCine D={D} stage={b} travel />}
    </div>
  );
}
