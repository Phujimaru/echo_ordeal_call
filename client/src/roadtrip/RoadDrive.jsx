// Road Trip — หน้าขับ 3D เต็มจอ (phase intro / drive / fork / event · GRID_PLAN §8.8)
//  ฉาก: roadtrip/road3d.js createRoadDrive (รถตู้ van3d.js + ถนน 5 ภูมิภาค + กลางคืน + สิ่งกีดขวาง + ป้ายทางแยก)
//  props: { state, lowQ } — แผงทางแยก/เหตุการณ์/วิทยุ อยู่ใน RoadtripScreen (ซ้อนทับจอนี้)
//  HUD ล่างกลาง: ความเร็ว · กม. · น้ำมัน · HP รถ · ไนตรัส (ตัวเลข/ไอคอนเท่านั้น) · ปุ่มนั่ง/ลุกที่คนขับ · แถวมุมกล้อง 9 แบบ
//  คีย์: ←/→ หรือ A/D เปลี่ยนเลน · Shift ไนตรัส (คนขับเท่านั้น) · Space แตร (ทุกคน) · C วนมุมกล้อง
//  เมาส์: ลาก = หันมอง · ล้อ = ซูม · ดับเบิลคลิก = คืนค่า · คลิกของในรถ = เล่น (เฉพาะเครื่องเรา) · เกียร์/ที่นั่งคนขับ = นั่ง/ลุก
//  ?fps=1 = ตัวเลข FPS / เวลาต่อเฟรม (dev)
import { useEffect, useRef, useState } from "react";
import { createRoadDrive, DRIVE_CAMS } from "./road3d";
import { createVanSfx } from "./van3d";
import { rtEmit, noteServerNow, serverNow } from "./rtSocket";
import { rtSfx } from "./rtAudio";
import * as radio from "./radio";
import { clickSound } from "../audio";
import { tip as hoverTip } from "./rtTip";
import { attachScene, detachScene, frameOpts } from "./rtDirector";
import "./RoadDrive.css";

const CAM_KEY = "echo_rt_cam";
const SHOW_FPS = typeof location !== "undefined" && new URLSearchParams(location.search).get("fps") === "1";
const STATION_BPM = [118, 132, 144, 80, 60];
const loadCam = () => { try { const c = localStorage.getItem(CAM_KEY); return DRIVE_CAMS.some((d) => d[0] === c) ? c : "chase"; } catch { return "chase"; } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const NO_LOOK = { yaw: 0, pitch: 0, zoom: 0 };

const I_FUEL = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15" /><path d="M4 20h11" /><path d="M7 8h5" /><path d="M14 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3" /></svg>;
const I_HP = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15V9a2 2 0 0 1 2-2h9l4 4h1a2 2 0 0 1 2 2v2" /><circle cx="7" cy="16.5" r="2" /><circle cx="17" cy="16.5" r="2" /><path d="M9 16.5h6" /></svg>;
const I_NOS = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>;
const I_SEAT = <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2" /><path d="M12 14v6.5M10 12H3.5M14 12h6.5" /></svg>;

export default function RoadDrive({ state, lowQ = false, active = true }) {
  const activeRef = useRef(active);
  activeRef.current = active;
  const cvRef = useRef(null);
  const wrapRef = useRef(null);
  const sceneRef = useRef(null);
  const stRef = useRef(state);
  stRef.current = state;
  const [cam, setCamState] = useState(loadCam);
  const camRef = useRef(cam);
  const look = useRef({ yaw: 0, pitch: 0, zoom: 0 });
  const [hud, setHud] = useState({ kmh: 0 });
  const [tip, setTip] = useState(null);
  const [fps, setFps] = useState(null);
  const laneWant = useRef(null);

  const rt = (state && state.roadtrip) || {};
  const van = rt.van || {};
  const selfId = state ? state.youId : null;
  const amDriver = van.driverId != null && van.driverId === selfId;
  const seatTaken = van.driverId != null && !amDriver;

  const setCam = (m) => {
    camRef.current = m; setCamState(m);
    look.current = { yaw: 0, pitch: m === "sky" ? 0.8 : 0, zoom: 0 };
    try { localStorage.setItem(CAM_KEY, m); } catch { /* ไม่มีที่เก็บ */ }
  };
  const toggleSeat = () => {
    const s = stRef.current, v = (s && s.roadtrip && s.roadtrip.van) || {};
    const me = s ? s.youId : null;
    if (v.driverId != null && v.driverId !== me) return;
    rtEmit("rt:seat", { seat: v.driverId === me ? null : "driver" });
  };

  // ---- ฉาก 3D (สร้างครั้งเดียว · ทำลายตอนออก)
  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return undefined;
    const synth = createVanSfx();
    const onSfx = (name) => { if (!rtSfx(name)) synth.play(name); };
    const onAction = (a, arg) => {
      if (a === "seat") toggleSeat();
      else if (a === "horn") rtEmit("rt:horn", {});
      else if (a === "cam") setCam(arg === "sky" ? "roof" : arg || "roof");
    };
    let scene = null;
    try { scene = createRoadDrive(cv, { lowQ, onSfx, onAction }); } catch (err) { console.error("road3d", err); return undefined; }
    sceneRef.current = scene;
    attachScene(scene); // ฉากเปลี่ยน (RtTransitions → rtDirector) สั่งชะลอ/บทกล้อง
    if (import.meta.env.DEV) window.__roadDrive = scene;
    let raf = 0, last = performance.now(), alive = true, lastHud = 0, lastInside = null;
    const fr = { n: 0, t0: performance.now(), worst: 0, sum: 0 };
    const frame = (now) => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (document.hidden || !activeRef.current) { last = now; return; } // แท็บซ่อน / จุดพัก-ต่อสู้ (ซ่อนจอขับ) = ไม่วาด
      const dtMs = Math.min(100, now - last); last = now;
      const s = stRef.current, r = s && s.roadtrip;
      if (r && Number.isFinite(r.now)) noteServerNow(r.now);
      const rr = r && r.radio, st = rr && rr.src === "synth" ? clamp(+rr.station || 0, 0, 4) : -1;
      const beat = st >= 0 ? Math.max(0, 1 - (((now / 1000) * STATION_BPM[st] / 60) % 1) * 4) : 0;
      const t0 = performance.now();
      const dir = frameOpts(now);
      const out = scene.update(now, dtMs, { rt: r, cam: dir.camOverride || (camRef.current === "sky" ? "roof" : camRef.current), look: dir.camOverride ? NO_LOOK : look.current, players: s && s.players, srvOffset: serverNow() - Date.now(), beat, slow: dir.slow, cutCam: dir.cutCam, rear: dir.rear });
      const ft = performance.now() - t0;
      if (out && out.inside !== lastInside) { lastInside = out.inside; radio.setInside(out.inside); }
      if (out && now - lastHud > 120) { lastHud = now; setHud((h) => (h.kmh === out.kmh ? h : { kmh: out.kmh })); }
      if (SHOW_FPS) {
        fr.n++; fr.sum += ft; fr.worst = Math.max(fr.worst, dtMs);
        if (now - fr.t0 > 1000) {
          const info = scene.info();
          setFps({ fps: Math.round(fr.n * 1000 / (now - fr.t0)), cpu: (fr.sum / fr.n).toFixed(1), worst: Math.round(fr.worst), calls: info.render.calls, tris: Math.round(info.render.triangles / 1000) });
          fr.n = 0; fr.sum = 0; fr.worst = 0; fr.t0 = now;
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false; cancelAnimationFrame(raf);
      radio.setInside(false);
      detachScene(scene);
      scene.dispose(); synth.dispose();
      sceneRef.current = null;
      if (import.meta.env.DEV && window.__roadDrive === scene) window.__roadDrive = null;
    };
  }, [lowQ]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- คีย์บอร์ด
  useEffect(() => {
    const typing = (e) => e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    const onKey = (e) => {
      if (!activeRef.current || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const s = stRef.current, v = (s && s.roadtrip && s.roadtrip.van) || {};
      const driver = v.driverId != null && v.driverId === (s && s.youId);
      const k = e.key.toLowerCase();
      if (k === "c" && !e.repeat) { const i = DRIVE_CAMS.findIndex((c) => c[0] === camRef.current); setCam(DRIVE_CAMS[(i + 1) % DRIVE_CAMS.length][0]); return; }
      if (k === " " || e.code === "Space") { e.preventDefault(); if (!e.repeat) rtEmit("rt:horn", {}); return; }
      if (!driver) return;
      if (k === "arrowleft" || k === "a" || k === "arrowright" || k === "d") {
        e.preventDefault();
        if (e.repeat) return;
        const cur = laneWant.current != null ? laneWant.current : Number.isFinite(+v.lane) ? +v.lane : 0;
        const nx = clamp(cur + (k === "arrowleft" || k === "a" ? -1 : 1), -1, 1);
        laneWant.current = nx;
        rtEmit("rt:steer", { lane: nx });
        return;
      }
      if (k === "shift" && !e.repeat) { e.preventDefault(); rtEmit("rt:nitro", {}); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // เลนจริงจาก server มาถึง = ล้างค่าที่กดค้างไว้
  useEffect(() => { laneWant.current = null; }, [van.lane]);

  // ---- เมาส์: ลาก = หันมอง · ล้อ = ซูม · ดับเบิลคลิก = คืนค่า · คลิกของในรถ
  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return undefined;
    let drag = null, hoverHit = null, pend = null;
    const ndc = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)]; };
    const down = (e) => { if (e.button !== 0) return; drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch { /* */ } };
    const move = (e) => {
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 5) drag.moved = true;
        if (drag.moved) {
          const L = look.current, fp = ["driver", "hood", "bumper", "roof", "wheel", "sky"].includes(camRef.current);
          L.yaw -= dx * 0.005; L.pitch = clamp(L.pitch - dy * 0.004, -0.9, 0.9);
          if (fp) L.yaw = clamp(L.yaw, -2.6, 2.6);
          setTip(null);
        }
        drag.x = e.clientX; drag.y = e.clientY;
        return;
      }
      // ชี้ของในรถ (ทุก 1 เฟรม — เก็บไว้ทำใน rAF ถัดไป)
      pend = { e: { clientX: e.clientX, clientY: e.clientY } };
      if (!move.raf) move.raf = requestAnimationFrame(() => {
        move.raf = 0;
        const sc = sceneRef.current; if (!sc || !pend) return;
        const [nx, ny] = ndc(pend.e);
        const hit = sc.pick(nx, ny);
        sc.hover(hit); hoverHit = hit;
        cv.style.cursor = hit ? "pointer" : "grab";
        const r = wrapRef.current ? wrapRef.current.getBoundingClientRect() : { left: 0, top: 0 };
        setTip(hit ? { name: hit.name, x: pend.e.clientX - r.left, y: pend.e.clientY - r.top } : null);
      });
    };
    const up = (e) => {
      const d = drag; drag = null;
      try { cv.releasePointerCapture(e.pointerId); } catch { /* */ }
      if (d && !d.moved) {
        const sc = sceneRef.current; if (!sc) return;
        const [nx, ny] = ndc(e);
        const hit = sc.pick(nx, ny) || hoverHit;
        if (hit) hit.run();
      }
    };
    const wheel = (e) => { e.preventDefault(); look.current.zoom = clamp(look.current.zoom + e.deltaY * 0.02, -25, 25); };
    const dbl = () => { look.current = { yaw: 0, pitch: 0, zoom: 0 }; };
    const leave = () => { const sc = sceneRef.current; if (sc) sc.hover(null); hoverHit = null; setTip(null); };
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("pointerleave", leave);
    cv.addEventListener("wheel", wheel, { passive: false });
    cv.addEventListener("dblclick", dbl);
    return () => {
      if (move.raf) cancelAnimationFrame(move.raf);
      cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move); cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointercancel", up); cv.removeEventListener("pointerleave", leave);
      cv.removeEventListener("wheel", wheel); cv.removeEventListener("dblclick", dbl);
    };
  }, []);

  const hpMax = Math.max(1, +van.hpMax || 20), fuelMax = Math.max(1, +van.fuelMax || 40);
  const hpK = clamp((+van.hp || 0) / hpMax, 0, 1), fuelK = clamp((+van.fuel || 0) / fuelMax, 0, 1);
  const nosLv = (van.upg && +van.upg.nitro) || 0, nosK = clamp(+van.nitro || 0, 0, 1);
  const km = Number.isFinite(+rt.km) ? +rt.km : 0;
  const intro = rt.phase === "intro";

  return (
    <div className="rtd" ref={wrapRef} data-night={rt.night ? "true" : "false"}>
      <canvas ref={cvRef} className="rtd-cv" />
      {!intro && (
        <div className="rtd-cams" role="toolbar">
          {DRIVE_CAMS.map(([k, n]) => (
            <button key={k} type="button" className="rtd-cam" data-on={cam === k || (cam === "sky" && k === "roof") ? "true" : "false"} {...hoverTip("กด C สลับมุมกล้อง · ลากเมาส์หันมอง · ล้อเมาส์ซูม · ดับเบิลคลิกคืนค่า", n)} onClick={() => { clickSound(); setCam(k); }}>{n}</button>
          ))}
        </div>
      )}
      {!intro && (
        <div className="rtd-hud">
          <button type="button" className="rtd-seat" data-on={amDriver ? "true" : "false"} disabled={seatTaken} onClick={() => { clickSound(); toggleSeat(); }} {...hoverTip(amDriver ? "ลุกจากที่นั่งคนขับ ให้คนอื่นขับแทน" : "นั่งที่คนขับ (ใครนั่งก่อนได้ก่อน) · A/D หรือ ←/→ เปลี่ยนเลน · Shift ไนตรัส · Space บีบแตร", amDriver ? "ลุก" : "ขับ")}>
            {I_SEAT}<span>{amDriver ? "ลุก" : "ขับ"}</span>
          </button>
          <div className="rtd-spd"><b>{hud.kmh}</b><small>กม./ชม.</small></div>
          <div className="rtd-col">
            <div className="rtd-km">{km.toFixed(1)}<small>กม.</small></div>
            <div className="rtd-bar rtd-hp" data-low={hpK < 0.3 ? "true" : "false"} {...hoverTip("HP รถตู้ — หมดเมื่อไหร่ การเดินทางจบทันที", "รถตู้")}>{I_HP}<span><i style={{ width: `${hpK * 100}%` }} /></span><em>{Math.ceil(+van.hp || 0)}</em></div>
            <div className="rtd-bar rtd-fuel" data-low={fuelK < 0.2 ? "true" : "false"} {...hoverTip("น้ำมัน (ลิตร) — หมดถังรถคลานได้แค่ 30 กม./ชม. · เติมที่ปั๊ม", "น้ำมัน")}>{I_FUEL}<span><i style={{ width: `${fuelK * 100}%` }} /></span><em>{Math.round(+van.fuel || 0)}</em></div>
            {nosLv > 0 && <div className="rtd-bar rtd-nos" {...hoverTip("ไนตรัส — คนขับกด Shift เร่ง ×1.5 นาน 5 วิ · เติมเต็มทุกจุดพัก", "ไนตรัส")}>{I_NOS}<span><i style={{ width: `${nosK * 100}%` }} /></span><em>{nosLv}</em></div>}
          </div>
        </div>
      )}
      {tip && <div className="rtd-tip" style={{ left: tip.x, top: tip.y }}>{tip.name}</div>}
      {SHOW_FPS && fps && <div className="rtd-fps">{fps.fps} fps · {fps.cpu} ms · max {fps.worst} ms · {fps.calls} dc · {fps.tris}k ▲</div>}
    </div>
  );
}
