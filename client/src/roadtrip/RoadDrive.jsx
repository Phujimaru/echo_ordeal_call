// Road Trip — หน้าขับ 3D เต็มจอ (phase intro / drive / fork / event · GRID_PLAN §8.8)
//  ฉาก: roadtrip/road3d.js createRoadDrive (รถตู้ van3d.js + ถนน 5 ภูมิภาค + กลางคืน + สิ่งกีดขวาง + ป้ายทางแยก)
//  props: { state, lowQ } — แผงทางแยก/เหตุการณ์/วิทยุ อยู่ใน RoadtripScreen (ซ้อนทับจอนี้)
//  HUD ล่างกลาง: ความเร็ว · กม. · น้ำมัน · HP รถ · ไนตรัส (ตัวเลข/ไอคอนเท่านั้น) · ปุ่มนั่ง/ลุกที่คนขับ · แถวมุมกล้อง 9 แบบ
//  คีย์: ←/→ หรือ A/D เปลี่ยนเลน · Shift ไนตรัส (คนขับเท่านั้น) · Space แตร (ทุกคน) · C วนมุมกล้อง
//  เมาส์: ลาก = หันมอง · ล้อ = ซูม · ดับเบิลคลิก = คืนค่า · คลิกของในรถ = เล่น (เฉพาะเครื่องเรา) · เกียร์/ที่นั่งคนขับ = นั่ง/ลุก
//  ?fps=1 = ตัวเลข FPS / เวลาต่อเฟรม (dev)
import { useEffect, useRef, useState } from "react";
import { createRoadDrive, DRIVE_CAMS, VAN_HATCH_TILE } from "./road3d";
import { createVanSfx } from "./van3d";
import { rtEmit, noteServerNow, serverNow } from "./rtSocket";
import { rtSfx } from "./rtAudio";
import * as radio from "./radio";
import { clickSound } from "../audio";
import { tip as hoverTip } from "./rtTip";
import { attachScene, detachScene, frameOpts } from "./rtDirector";
import VanFun, { FUN_PROPS, useFunToasts, FunToasts } from "./VanFun";
import StashPanel from "./StashPanel";
import CampVote from "./CampVote";
import { RT_DEFS, RT_ONVAN } from "../board/roadtrip/maps.gen";
import "./RoadDrive.css";

// กล่องเก็บของกลาง = ของในรถ "stash" (ผู้ใช้สั่ง 2026-11-14): คลิกกล่อง → server เดินไปแล้ว fx vanProp → เปิดแผง · เดินออกห่าง = ปิด
const STASH_TILE = ((RT_DEFS[RT_ONVAN] || {}).vanProps || {}).stash || [7, 6];
const atStash = (mp) => !!mp && !mp.roof && Math.abs(mp.x - STASH_TILE[0]) + Math.abs(mp.y - STASH_TILE[1]) <= 1;

const CAM_KEY = "echo_rt_cam";
const SHOW_FPS = typeof location !== "undefined" && new URLSearchParams(location.search).get("fps") === "1";
const STATION_BPM = [118, 132, 144, 80, 60];
const loadCam = () => { try { const c = localStorage.getItem(CAM_KEY); return DRIVE_CAMS.some((d) => d[0] === c) ? c : "chase"; } catch { return "chase"; } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const NO_LOOK = { yaw: 0, pitch: 0, zoom: 0 };
// มุมกล้อง: คนขับเห็นครบ 9 มุม · คนอื่นเห็น 2 ปุ่ม (ผู้ใช้สั่ง 2026-11-14) — ภายนอก = ไล่หลัง · ภายใน = ผ่าห้องในรถ
const RIDER_CAMS = [["chase", "ภายนอก"], ["inside", "ภายใน"]];
const RIDER_OK = new Set(RIDER_CAMS.map((c) => c[0]));
const camsFor = (driver) => (driver ? DRIVE_CAMS : RIDER_CAMS);
// เดินในรถ (state.roadtrip.vanPos): คลิกพื้น (มุมในรถ/คนขับ) หรือดาดฟ้า (มุมนอกรถ) · WASD/ลูกศร · E = ขึ้น/ลงซันรูฟ
//  คนขับ: คลิกเดินได้เฉพาะมุมในรถ/คนขับ (มุมนอกรถคลิกพลาดแล้วหลุดจากที่นั่งง่าย) · A/D/ลูกศร = เปลี่ยนเลน (ไม่เดิน)
const WALK_CAMS = new Set(["inside", "driver"]);
const isHatch = (t) => !!t && t.x === VAN_HATCH_TILE[0] && t.y === VAN_HATCH_TILE[1];
const climbOf = (mp) => ({ x: VAN_HATCH_TILE[0], y: VAN_HATCH_TILE[1], roof: !mp.roof, near: true }); // near: ปากช่องมีคนยืน = ไปช่องติดกัน
// ของที่ทำงานในเครื่อง (ไม่ส่งเป็นของใช้ร่วม): แตร · นั่ง/ลุก · วิทยุ (แผงวิทยุ) · กล้องส่องทางไกล/ดูดาว (มุมกล้อง)
const LOCAL_PROPS = new Set(["horn", "seat", "gear", "radio", "binoc", "scope"]);
const myVanPos = (s) => { const r = s && s.roadtrip; return r && r.vanPos && s.youId != null ? r.vanPos[s.youId] || null : null; };

const I_FUEL = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15" /><path d="M4 20h11" /><path d="M7 8h5" /><path d="M14 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3" /></svg>;
const I_HP = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15V9a2 2 0 0 1 2-2h9l4 4h1a2 2 0 0 1 2 2v2" /><circle cx="7" cy="16.5" r="2" /><circle cx="17" cy="16.5" r="2" /><path d="M9 16.5h6" /></svg>;
const I_NOS = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>;
const I_SEAT = <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2" /><path d="M12 14v6.5M10 12H3.5M14 12h6.5" /></svg>;

const THR_KEYS = { KeyW: 1, ArrowUp: 1, KeyS: -1, ArrowDown: -1 }; // e.code — แป้นไทยก็กดได้
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
  const [stashOpen, setStashOpen] = useState(false); // กล่องเก็บของกลางของรถ (เปิดจากกล่องในรถเท่านั้น)
  const stashSeen = useRef(null);
  const [fps, setFps] = useState(null);
  const laneWant = useRef(null);
  const funApi = useRef(null); // กิจกรรมในรถ (VanFun) — คลิกของ 3D ที่เป็นกิจกรรม = ส่งไปที่นี่
  const [funToasts, pushFunToast] = useFunToasts();

  const rt = (state && state.roadtrip) || {};
  const van = rt.van || {};
  const selfId = state ? state.youId : null;
  const amDriver = van.driverId != null && van.driverId === selfId;
  const seatTaken = van.driverId != null && !amDriver;
  const nameOf = (id) => { const pl = ((state && state.players) || []).find((x) => x.id === id); return pl ? pl.name : ""; };
  const driverPl = van.driverId != null ? ((state && state.players) || []).find((x) => x.id === van.driverId) || null : null;
  // ผู้ส่องทาง (กิจกรรมกล้องส่องทางไกลบนดาดฟ้า) = กล้องซูมจากหลังคาแทนมุมปกติ
  const spotRef = useRef(false);
  spotRef.current = !!(rt.fun && Array.isArray(rt.fun.spot) && rt.fun.spot.includes(selfId));
  const amDriverRef = useRef(amDriver);
  amDriverRef.current = amDriver;
  // ป้ายประกาศคนขับเปลี่ยน (ทุกเครื่อง) — นั่ง/ยกให้/ลุก/ปล่อยเพราะไม่ขยับ
  const [seatToast, setSeatToast] = useState(null);
  const lastDrv = useRef(undefined);
  useEffect(() => {
    const id = van.driverId != null ? van.driverId : null;
    if (lastDrv.current === undefined || rt.phase === "intro") { lastDrv.current = id; return undefined; }
    if (lastDrv.current === id) return undefined;
    lastDrv.current = id;
    const pl = id != null ? ((state && state.players) || []).find((x) => x.id === id) : null;
    setSeatToast({ k: Date.now(), name: pl ? pl.name : null, color: (pl && pl.color) || null, me: id != null && id === selfId });
    const t = setTimeout(() => setSeatToast(null), 2600);
    return () => clearTimeout(t);
  }, [van.driverId]); // eslint-disable-line react-hooks/exhaustive-deps
  // ไม่ใช่คนขับแล้ว (หรือเริ่มเป็นผู้โดยสาร) แต่อยู่มุมของคนขับ = กลับมุมภายนอก · ได้เป็นคนขับ = คงมุมเดิม
  useEffect(() => { if (!amDriver && !RIDER_OK.has(camRef.current)) setCam("chase"); }, [amDriver]); // eslint-disable-line react-hooks/exhaustive-deps
  // คนขับยังอยู่หน้าจอ: ขยับเมาส์/กดปุ่ม/เลื่อน = ส่ง rt:alive ทุก ~5 วิ (server นับไม่ขยับ 20 วิ = ที่นั่งว่าง — กันคน AFK แต่ไม่ไล่คนที่ขับตรงเฉยๆ)
  useEffect(() => {
    if (!amDriver || !active) return undefined;
    let last = 0;
    const ping = () => { const now = Date.now(); if (now - last < 5000 || document.hidden) return; last = now; rtEmit("rt:alive", {}); };
    ping();
    const evs = ["pointermove", "pointerdown", "keydown", "wheel"];
    for (const e of evs) window.addEventListener(e, ping, { passive: true });
    return () => { for (const e of evs) window.removeEventListener(e, ping); };
  }, [amDriver, active]);

  const setCam = (m) => {
    camRef.current = m; setCamState(m);
    look.current = { yaw: 0, pitch: m === "sky" ? 0.8 : 0, zoom: 0 };
    try { localStorage.setItem(CAM_KEY, m); } catch { /* ไม่มีที่เก็บ */ }
  };
  // คลิกเดินได้ไหม: มีที่ในรถ · คนขับ = เฉพาะมุมในรถ/คนขับ
  const canWalk = (s, mp) => {
    if (!mp) return false;
    const v = (s && s.roadtrip && s.roadtrip.van) || {};
    return WALK_CAMS.has(camRef.current) || v.driverId == null || v.driverId !== s.youId;
  };
  const toggleSeat = () => {
    const s = stRef.current, v = (s && s.roadtrip && s.roadtrip.van) || {};
    const me = s ? s.youId : null;
    if (v.driverId != null && v.driverId !== me) return;
    rtEmit("rt:seat", { seat: v.driverId === me ? null : "driver" });
  };

  // ---- ฉาก 3D (สร้างครั้งเดียว · ทำลายตอนออก) · WebGL context หาย = แคนวาสใหม่ + สร้างฉากใหม่ (glGen)
  const [glGen, setGlGen] = useState(0);
  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return undefined;
    let lostT = 0;
    const onLost = (e) => { e.preventDefault(); clearTimeout(lostT); lostT = setTimeout(() => setGlGen((g) => g + 1), 250); };
    cv.addEventListener("webglcontextlost", onLost);
    const synth = createVanSfx();
    const onSfx = (name) => { if (!rtSfx(name)) synth.play(name); };
    const onAction = (a, arg) => {
      if (a === "seat") toggleSeat();
      else if (a === "horn") rtEmit("rt:horn", {});
      else if (a === "cam") setCam(arg === "sky" ? "roof" : arg || "roof");
    };
    let scene = null;
    try { scene = createRoadDrive(cv, { lowQ, onSfx, onAction }); } catch (err) { console.error("road3d", err); cv.removeEventListener("webglcontextlost", onLost); return undefined; }
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
      const out = scene.update(now, dtMs, { rt: r, cam: dir.camOverride || (spotRef.current ? "spot" : camRef.current === "sky" ? "roof" : camRef.current), look: dir.camOverride ? NO_LOOK : look.current, players: s && s.players, selfId: s ? s.youId : null, srvOffset: serverNow() - Date.now(), beat, slow: dir.slow, cutCam: dir.cutCam, rear: dir.rear });
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
      cv.removeEventListener("webglcontextlost", onLost); clearTimeout(lostT);
      radio.setInside(false);
      detachScene(scene);
      try { scene.dispose(); } catch { /* context หายไปแล้ว */ }
      synth.dispose();
      sceneRef.current = null;
      if (import.meta.env.DEV && window.__roadDrive === scene) window.__roadDrive = null;
    };
  }, [lowQ, glGen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- คีย์บอร์ด
  const thrHeld = useRef(new Set());
  const thrSent = useRef(0);
  const sendThr = () => {
    const h = thrHeld.current, up = h.has("KeyW") || h.has("ArrowUp"), dn = h.has("KeyS") || h.has("ArrowDown");
    const t = up && !dn ? 1 : dn && !up ? -1 : 0;
    const s = stRef.current, v = (s && s.roadtrip && s.roadtrip.van) || {};
    const drv = v.driverId != null && v.driverId === (s && s.youId);
    if (!drv && t !== 0) return;
    if (t === thrSent.current && (v.throttle | 0) === t) return;
    thrSent.current = t;
    rtEmit("rt:throttle", { t });
  };
  useEffect(() => {
    const typing = (e) => e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    const onKey = (e) => {
      if (!activeRef.current || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const s = stRef.current, v = (s && s.roadtrip && s.roadtrip.van) || {};
      const driver = v.driverId != null && v.driverId === (s && s.youId);
      // ใช้ตำแหน่งปุ่ม (e.code) — แป้นภาษาไทยก็กดได้ (ผู้ใช้แจ้ง 2026-11-14: เผลอเป็นไทยแล้ว WASD ไม่ทำงาน)
      const k = { KeyC: "c", KeyA: "a", KeyD: "d", Space: " ", ShiftLeft: "shift", ShiftRight: "shift", ArrowLeft: "arrowleft", ArrowRight: "arrowright" }[e.code] || "";
      if (k === "c" && !e.repeat) { const list = camsFor(driver), i = list.findIndex((c) => c[0] === camRef.current); setCam(list[(i + 1) % list.length][0]); return; }
      if (k === " " || e.code === "Space") { e.preventDefault(); if (!e.repeat) rtEmit("rt:horn", {}); return; }
      // เดินในรถทีละช่อง (ไม่ใช่คนขับ · ทุกมุมกล้อง): W/↑ ไปหน้ารถ · S/↓ ไปท้าย · A/← ซ้าย · D/→ ขวา (ตามคนขับ) · E ขึ้น/ลงซันรูฟ
      const mp = myVanPos(s);
      if (!driver && mp) {
        if (e.code === "KeyE") { e.preventDefault(); if (!e.repeat) rtEmit("rt:vanWalk", climbOf(mp)); return; }
        const st0 = { KeyW: [1, 0], ArrowUp: [1, 0], KeyS: [-1, 0], ArrowDown: [-1, 0], KeyA: [0, -1], ArrowLeft: [0, -1], KeyD: [0, 1], ArrowRight: [0, 1] }[e.code];
        if (st0) { e.preventDefault(); if (!e.repeat || performance.now() - (onKey.last || 0) > 180) { onKey.last = performance.now(); rtEmit("rt:vanWalk", { x: mp.x + st0[0], y: mp.y + st0[1], roof: !!mp.roof }); } return; }
      }
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
      // คันเร่ง/เบรก (คนขับ): W/↑ เร่ง · S/↓ เบรก · ปล่อย = ความเร็วปกติ — ส่งเฉพาะตอนค่าเปลี่ยน (server ไล่ความเร็วเอง)
      const tk = THR_KEYS[e.code];
      if (tk) { e.preventDefault(); thrHeld.current.add(e.code); sendThr(); return; }
      if (k === "shift" && !e.repeat) { e.preventDefault(); rtEmit("rt:nitro", {}); }
    };
    const onUp = (e) => { if (THR_KEYS[e.code] && thrHeld.current.delete(e.code)) sendThr(); };
    const onBlur = () => { if (thrHeld.current.size) { thrHeld.current.clear(); sendThr(); } };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onUp); window.removeEventListener("blur", onBlur); };
  }, []);
  // ไม่ได้เป็นคนขับแล้ว / ออกจากจอขับ = ล้างปุ่มที่ค้าง (server ปล่อยคันเร่งเองอยู่แล้ว)
  useEffect(() => { if (!amDriver || !active) { thrHeld.current.clear(); thrSent.current = 0; } }, [amDriver, active]);
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
          const L = look.current, fp = spotRef.current || ["driver", "hood", "bumper", "roof", "wheel", "sky"].includes(camRef.current);
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
        const s = stRef.current, mp = myVanPos(s), walkOk = canWalk(s, mp);
        const crew = hit ? null : sc.crewAt(nx, ny);
        const tile = !hit && walkOk ? sc.tileAt(nx, ny) : null;
        const climb = tile && mp && isHatch(tile) && !!tile.roof === !!mp.roof;
        sc.showWalk(tile, mp);
        cv.style.cursor = hit || tile ? "pointer" : "grab";
        const r = wrapRef.current ? wrapRef.current.getBoundingClientRect() : { left: 0, top: 0 };
        const label = hit ? hit.name : crew ? crew.name : climb ? (mp.roof ? "ลงในรถ (E)" : "ขึ้นหลังคา (E)") : null;
        setTip(label ? { name: label, x: pend.e.clientX - r.left, y: pend.e.clientY - r.top } : null);
      });
    };
    const up = (e) => {
      const d = drag; drag = null;
      try { cv.releasePointerCapture(e.pointerId); } catch { /* */ }
      if (d && !d.moved) {
        const sc = sceneRef.current; if (!sc) return;
        const [nx, ny] = ndc(e);
        const hit = sc.pick(nx, ny) || hoverHit;
        const s = stRef.current, mp = myVanPos(s);
        if (hit) {
          if (mp && hit.key && FUN_PROPS.has(hit.key) && funApi.current) { funApi.current.prop(hit.key); return; } // กิจกรรมกับเพื่อน (vanfun.js)
          // ของใช้ร่วม (มี vanPos = server รองรับ): server เดินไปช่องว่างที่ติดของให้ (ถ้ายังไม่ติด) แล้วใช้ตอนถึง — ท่า/เสียงเล่นจาก fx ให้ทุกคน
          if (mp && hit.key && !LOCAL_PROPS.has(hit.key)) rtEmit("rt:vanProp", { prop: hit.key });
          else hit.run();
          return;
        }
        if (canWalk(s, mp)) {
          const tile = sc.tileAt(nx, ny);
          // ช่องซันรูฟชั้นเดียวกับเรา = ปีนขึ้น/ลง (ช่องอื่น = เดินไป · server หาทางผ่านซันรูฟเอง)
          if (tile) { clickSound(); rtEmit("rt:vanWalk", isHatch(tile) && !!tile.roof === !!mp.roof ? climbOf(mp) : tile); }
        }
      }
    };
    const wheel = (e) => { e.preventDefault(); look.current.zoom = clamp(look.current.zoom + e.deltaY * 0.02, -25, 25); };
    const dbl = () => { look.current = { yaw: 0, pitch: 0, zoom: 0 }; };
    const leave = () => { const sc = sceneRef.current; if (sc) { sc.hover(null); sc.showWalk(null); } hoverHit = null; setTip(null); };
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

  // fx vanProp "stash" ของเรา (ถึงกล่องแล้ว) = เปิดแผงกล่องรถ · ครั้งแรกที่เห็น fx = จำ key อย่างเดียว (ไม่เปิดของเก่า)
  useEffect(() => {
    const list = Array.isArray(rt.fx) ? rt.fx : [];
    const num = (f) => (typeof f.key === "number" ? f.key : 0); // fx บางชนิดมี key เป็นข้อความ (ข้อมูลทับเลข fx) — ข้าม
    const top = list.reduce((m, f) => Math.max(m, num(f)), 0);
    if (stashSeen.current == null) { stashSeen.current = top; return; }
    const hit = list.some((f) => num(f) > stashSeen.current && f.k === "vanProp" && f.prop === "stash" && f.id === selfId);

    stashSeen.current = Math.max(stashSeen.current, top);
    if (hit) setStashOpen(true);
  }, [rt.fx]); // eslint-disable-line react-hooks/exhaustive-deps
  const myPos = myVanPos(state);
  if (stashOpen && !atStash(myPos)) setStashOpen(false); // เดินออกห่างกล่อง = ปิด
  const hpMax = Math.max(1, +van.hpMax || 20), fuelMax = Math.max(1, +van.fuelMax || 40);
  const hpK = clamp((+van.hp || 0) / hpMax, 0, 1), fuelK = clamp((+van.fuel || 0) / fuelMax, 0, 1);
  const nosLv = (van.upg && +van.upg.nitro) || 0, nosK = clamp(+van.nitro || 0, 0, 1);
  const km = Number.isFinite(+rt.km) ? +rt.km : 0;
  const intro = rt.phase === "intro";

  return (
    <div className="rtd" ref={wrapRef} data-night={rt.night ? "true" : "false"}>
      <canvas key={glGen} ref={cvRef} className="rtd-cv" />
      {!intro && (
        <div className="rtd-cams" role="toolbar">
          {camsFor(amDriver).map(([k, n]) => (
            <button key={k} type="button" className="rtd-cam" data-on={cam === k || (cam === "sky" && k === "roof") ? "true" : "false"} {...hoverTip("กด C สลับมุมกล้อง · ลากเมาส์หันมอง · ล้อเมาส์ซูม · ดับเบิลคลิกคืนค่า", n)} onClick={() => { clickSound(); setCam(k); }}>{n}</button>
          ))}
        </div>
      )}
      {!intro && seatToast && (
        <div key={seatToast.k} className="rtd-seat-toast" data-empty={seatToast.name ? "false" : "true"} style={seatToast.color ? { "--dc": seatToast.color } : undefined}>
          {I_SEAT}<span>{seatToast.name ? `${seatToast.name} ขับ` : "ที่นั่งคนขับว่าง"}</span>
        </div>
      )}
      {!intro && (
        <div className="rtd-hud">
          <div className="rtd-driver" data-empty={driverPl ? "false" : "true"} data-me={amDriver ? "true" : "false"} style={driverPl && driverPl.color ? { "--dc": driverPl.color } : undefined}>
            <span className="rtd-driver-face">{driverPl && driverPl.img ? <img src={driverPl.img} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : null}<i>{I_SEAT}</i></span>
            <b>{driverPl ? driverPl.name : "ว่าง"}</b>
          </div>
          {seatTaken ? (
            <button type="button" className="rtd-seat" data-on={van.seatReq === selfId ? "true" : "false"} onClick={() => { clickSound(); rtEmit("rt:seat", { seat: "request" }); }} {...hoverTip(van.seatReq === selfId ? "กดอีกครั้งเพื่อยกเลิกคำขอ" : `ขอให้ ${nameOf(van.driverId)} ยกที่นั่งคนขับให้ · คนขับไม่บังคับรถเกิน 20 วิ ที่นั่งว่างเอง`, "ขอขับ")}>
              {I_SEAT}<span>{van.seatReq === selfId ? "รอ…" : "ขอขับ"}</span>
            </button>
          ) : (
            <button type="button" className="rtd-seat" data-on={amDriver ? "true" : "false"} onClick={() => { clickSound(); toggleSeat(); }} {...hoverTip(amDriver ? "ลุกจากที่นั่งคนขับ ให้คนอื่นขับแทน" : "นั่งที่คนขับ (ใครนั่งก่อนได้ก่อน) · A/D หรือ ←/→ เปลี่ยนเลน · W/↑ เร่ง · S/↓ เบรก · Shift ไนตรัส · Space บีบแตร", amDriver ? "ลุก" : "ขับ")}>
              {I_SEAT}<span>{amDriver ? "ลุก" : "ขับ"}</span>
            </button>
          )}
          {amDriver && van.seatReq && (
            <button type="button" className="rtd-seat rtd-give" onClick={() => { clickSound(); rtEmit("rt:seat", { seat: "give" }); }} {...hoverTip("ยกที่นั่งคนขับให้", "ยกให้")}>
              {I_SEAT}<span>ยกให้ {nameOf(van.seatReq)}</span>
            </button>
          )}
          <div className="rtd-spd">
            <i className="rtd-thr" data-t={(van.throttle | 0) > 0 ? "up" : (van.throttle | 0) < 0 ? "down" : "0"} aria-hidden="true"><svg viewBox="0 0 12 20"><path className="u" d="M2 8l4-4 4 4" /><path className="d" d="M2 12l4 4 4-4" /></svg></i>
            <b>{hud.kmh}</b><small>กม./ชม.</small>
          </div>
          <div className="rtd-col">
            <div className="rtd-km">{km.toFixed(1)}<small>กม.</small></div>
            <div className="rtd-bar rtd-hp" data-low={hpK < 0.3 ? "true" : "false"} {...hoverTip("HP รถตู้ — หมดเมื่อไหร่ การเดินทางจบทันที", "รถตู้")}>{I_HP}<span><i style={{ width: `${hpK * 100}%` }} /></span><em>{Math.ceil(+van.hp || 0)}</em></div>
            <div className="rtd-bar rtd-fuel" data-low={fuelK < 0.2 ? "true" : "false"} {...hoverTip("น้ำมัน (ลิตร) — หมดถังรถคลานได้แค่ 30 กม./ชม. · เติมที่ปั๊ม", "น้ำมัน")}>{I_FUEL}<span><i style={{ width: `${fuelK * 100}%` }} /></span><em>{Math.round(+van.fuel || 0)}</em></div>
            {nosLv > 0 && <div className="rtd-bar rtd-nos" {...hoverTip("ไนตรัส — คนขับกด Shift เร่ง ×1.5 นาน 5 วิ · เติมเต็มทุกจุดพัก", "ไนตรัส")}>{I_NOS}<span><i style={{ width: `${nosK * 100}%` }} /></span><em>{nosLv}</em></div>}
          </div>
        </div>
      )}
      {!intro && <VanFun state={state} amDriver={amDriver} funApi={funApi} onToast={pushFunToast} />}
      {!intro && <FunToasts list={funToasts} />}
      {!intro && van.stash && stashOpen && (() => {
        const meP = state && (state.players || []).find((p) => p.id === state.youId);
        return <div className="rtd-stash-wrap"><StashPanel stash={van.stash} me={meP} players={state.players || []} bagSlots={(meP && meP.bagSlots) || 5} onClose={() => setStashOpen(false)} onEat={(it) => rtEmit("rt:use", { uid: it.uid })} /></div>;
      })()}
      {!intro && <CampVote rt={rt} players={(state && state.players) || []} youId={selfId} />}
      {tip && <div className="rtd-tip" style={{ left: tip.x, top: tip.y }}>{tip.name}</div>}
      {SHOW_FPS && fps && <div className="rtd-fps">{fps.fps} fps · {fps.cpu} ms · max {fps.worst} ms · {fps.calls} dc · {fps.tris}k ▲</div>}
    </div>
  );
}
