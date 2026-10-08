// ============================================================
//  BoardCanvas — กระดานเดินได้แบบ Fire Emblem (คอมโพเนนต์แสดงผลล้วน ไม่รู้กติกาเกม)
//  ตัววาดอยู่ใน boardDraw.js · หน้าดูตัวอย่าง: ?board=1 (BoardPreview.jsx)
//
//  props
//   map         { area, cols, rows, terrain: { "x,y": "tree"|"pillar"|"banner"|"hedge"|… }, heal: ["x,y"…], spawns: [{x,y}], shopSpots }
//               (= state.board · heal รับได้ทั้ง array ของ "x,y" / [x,y] / {x,y} และ Set · ชนิดสิ่งกีดขวางที่ไม่รู้จัก = ก้อนหิน)
//   units       [{ id, x, y, img, color, name, hp, maxHp, armor, maxArmor, isMe, isActor, teamId, tag, alive? }]
//               tag = ป้ายเหนือหัว: "18" / "พอ" / "แตก" (แตก = ป้ายแดง) หรือ { text, bust, backs } · alive === false = ไม่วาด
//   highlights  { move, attack, skill, aoe, danger: ["x,y"…], path: [{x,y}…], target?: {x,y}, push?: { from, to, collide } } — ไม่ใส่ได้ทุกช่อง
//   shopPos     {x,y} | null — แผงร้านค้ามายา
//   night, lowQ boolean
//   rotation    0|1|2|3 = หมุนมุมมองทีละ 90° ตามเข็มนาฬิกา (ค่าเริ่ม 0) — หมุนแค่ภาพ ทุก prop และคอลแบ็กยังเป็นพิกัดกระดานเดิม
//               เปลี่ยนค่า = หมุนนุ่มๆ ≈250ms (lowQ = ทันที) · กล้องจัดกลาง/ย่อพอดีจาก map.cols × map.rows หลังหมุนเอง
//               (กระดานจัตุรัส เช่น 14 × 14 = ทุกมุมกรอบเท่ากัน) · มุมใกล้ = หมุนรอบจุดกลางของส่วนที่มองเห็น
//   zoom        0 = มุมปกติ (เห็นทั้งกระดาน) · 1 = มุมใกล้ (ขยาย ZOOM_K = 1.6 เท่า เลื่อนดูได้ทั้งสนาม) — เปลี่ยน = ซูมนุ่มๆ (lowQ = ทันที)
//               มุมใกล้: ลากเมาส์ซ้ายบนกระดาน (เกิน 6px = ลาก ไม่นับเป็นคลิก) / ลากปุ่มขวา-กลาง / แตะลาก / ปุ่มลูกศร = เลื่อนกล้อง
//   onZoomChange(0|1)  ล้อเมาส์ขึ้น = 1 (ซูมเข้าหาจุดใต้เมาส์) · ลง = 0 — ไม่ส่งมา = ล้อเมาส์ไม่ทำอะไร (zoom เป็น prop ควบคุมจากแม่)
//   focus       {x,y} — เปลี่ยนอ็อบเจกต์ = ถ้าช่องนั้นอยู่นอกส่วนที่มองเห็น (มุมใกล้) เลื่อนกล้องนุ่มๆ ไปให้อยู่กลาง ·
//               ใช้เป็นจุดกลางตอนกดซูมเข้าด้วยปุ่มด้วย (ซูมด้วยล้อ = จุดใต้เมาส์) · มุมปกติไม่มีผล
//   shopLabel   string|number|null — ป้าย "🏪 N" เหนือแผงร้าน (วาดในแคนวาส ตามซูม/เลื่อน/หมุนเอง)
//   map.special { "x,y": "flowers"|"forest"|"thorns"|"shallow"|"whirl"|"quicksand"|"ice"|"lava"|"power" } · map.flow { "x,y": "up"|"down"|"left"|"right" }
//   anim        { kind: "move", id, path } | { kind: "push", id, from, to, collide } — เปลี่ยนอ็อบเจกต์ = เล่นใหม่ · จบแล้วเรียก onAnimDone()
//   fx          [{ key, kind: "slash"|"float", x, y, text?, color?, size? }] — เอฟเฟกต์ครั้งเดียว เล่นเมื่อเห็น key ใหม่
//   onTileClick(x, y) · onUnitClick(id) (ไม่ส่งมา = เรียก onTileClick ที่ช่องของตัวนั้นแทน) · onHoverTile(x|null, y|null)
//  ขนาด: เต็มกล่องแม่ (ResizeObserver) · devicePixelRatio สูงสุด 2 (lowQ = 1)
//  พิกัด DOM ↔ กระดาน ภายนอก: tileCenter(x, y, z) (ตรรกะ ณ กล้องที่วาดล่าสุด) → computeView(w, h, cam) — cam อยู่ภายในคอมโพเนนต์นี้
//   ป้ายที่ต้องเกาะช่องให้วาดในแคนวาสแทน (เช่น shopLabel)
// ============================================================
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  bakeBoard, bakeScene, camEyeY, camFromEye, clampCam, computeView, drawFrame, FX_DUR, inCamView, key, LH, LW,
  mapSignature, normColor, normRot, pickTile, prepareHighlights, prepareMap, project, rgbString, setCamera, toLogical,
  unproject, ZOOM_K,
} from "./boardDraw";

const STEP_MS = 120;   // เวลาเดินต่อ 1 ช่อง
const PUSH_MS = 240;   // ถอย 1 ช่อง
const BUMP_MS = 280;   // ถอยชน (ขยับไปนิดแล้วเด้งกลับ)
const TURN_MS = 250;   // หมุนมุมมอง 90°
const ZOOM_MS = 280;   // ซูมเข้า/ออก
const FOCUS_MS = 420;  // เลื่อนกล้องตามตัวละคร
const DRAG_PX = 6;     // ลากเกินนี้ = เลื่อนกล้อง (ไม่นับเป็นคลิก)
const PAN_SPEED = 720; // ปุ่มลูกศร: ตรรกะ/วินาที ที่ z = 1
const TAP_STEP = 48;   // ปุ่มลูกศรกดครั้งเดียว: ตรรกะ ที่ z = 1
const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

// ตำแหน่งระหว่างเล่นแอนิเมชัน → { x, y, ox, oy, done, hitAt? }
function animPose(a, t) {
  if (a.kind === "move") {
    const pts = a.path;
    const dur = Math.max(1, pts.length - 1) * STEP_MS, p = Math.min(1, t / dur);
    if (pts.length < 2 || p >= 1) { const e = pts[pts.length - 1]; return { x: e.x, y: e.y, ox: 0, oy: 0, done: p >= 1 || pts.length < 2 }; }
    const f = p * (pts.length - 1), i = Math.floor(f), k = f - i, A = pts[i], B = pts[i + 1];
    return { x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k, ox: 0, oy: 0, done: false };
  }
  // push
  const { from, to } = a;
  if (a.collide) {
    const p = Math.min(1, t / BUMP_MS), peak = 90 / BUMP_MS;
    const b = p < peak ? p / peak : 1 - (p - peak) / (1 - peak);
    const e = 0.25 * (1 - Math.pow(1 - Math.max(0, b), 2));
    return { x: from.x, y: from.y, ox: (to.x - from.x) * e, oy: (to.y - from.y) * e, done: p >= 1, hitAt: 90 };
  }
  const p = Math.min(1, t / PUSH_MS), e = 1 - Math.pow(1 - p, 3);
  return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, ox: 0, oy: 0, done: p >= 1 };
}
function animFinal(a) {
  if (a.kind === "move") return a.path[a.path.length - 1];
  return a.collide ? a.from : a.to;
}
function validAnim(a) {
  if (!a || a.id == null) return false;
  if (a.kind === "move") return Array.isArray(a.path) && a.path.length > 0;
  if (a.kind === "push") return !!(a.from && a.to);
  return false;
}

export default function BoardCanvas(props) {
  const wrapRef = useRef(null);
  const cvRef = useRef(null);
  const propsRef = useRef(props);
  // สถานะภายในทั้งหมดอยู่ใน ref เดียว — ลูป rAF อ่านค่าล่าสุดโดยไม่ต้องเริ่มใหม่
  const S = useRef(null);
  if (S.current === null) {
    S.current = {
      size: { w: 0, h: 0 }, mapRef: undefined, sig: "", info: null,
      scenes: new Map(),     // key → { scene, fore, marks } (เก็บไม่เกิน 3)
      rotTarget: null, turn: 0, turnFrom: 0, turnTo: 0, turnT0: 0, // มุมมอง (หน่วย 90° ต่อเนื่อง)
      hlRef: undefined, hl: prepareHighlights(null),
      anim: null,            // { obj, t0, startX, startY, done, hit }
      fxSeen: new Set(), fxRef: undefined, fxActive: [],
      hitT: new Map(),       // id → เวลาโดนตี (สั่น/แฟลช)
      hover: null, hoverUnit: null, boxes: [], view: null, base: null, lastDraw: 0, lastT: 0,
      boards: new Map(),     // key → ชั้นกระดานอบแล้ว (เก็บไม่เกิน 2 — ปกติ/มุมใกล้)
      // กล้อง: cam = { z, cx, cy } ตอนนี้ · zoomLv = prop zoom ล่าสุด · camAnim = เลื่อน/ซูมนุ่มๆ · pivot = จุดบนกระดานที่หมุนรอบ
      cam: { z: 1, cx: LW / 2, cy: LH / 2 }, zoomLv: null, camAnim: null, pivot: null,
      zoomAnchor: null, focusRef: undefined, keys: new Set(), drag: null, suppressClick: false,
    };
  }
  useLayoutEffect(() => { propsRef.current = props; });

  useEffect(() => {
    const wrap = wrapRef.current, cv = cvRef.current, st = S.current;
    const g = cv.getContext("2d");
    let raf = 0, alive = true;

    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      st.size = { w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) };
    });
    ro.observe(wrap);
    const r0 = wrap.getBoundingClientRect();
    st.size = { w: Math.max(1, Math.round(r0.width)), h: Math.max(1, Math.round(r0.height)) };

    const tick = (now) => {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      const p = propsRef.current;
      const lowQ = !!p.lowQ, night = !!p.night;
      if (lowQ && now - st.lastDraw < 32) return; // lowQ ≈ 30 fps
      st.lastDraw = now;

      // --- แผนที่ (อบใหม่เมื่อเนื้อหาเปลี่ยนจริง ไม่ใช่แค่อ็อบเจกต์ใหม่จาก server)
      if (p.map !== st.mapRef) {
        st.mapRef = p.map;
        const sig = mapSignature(p.map);
        if (sig !== st.sig || !st.info) { st.sig = sig; st.info = prepareMap(p.map); }
      }
      const info = st.info;
      // --- ขนาด + ชั้นนิ่ง
      const dpr = Math.min(lowQ ? 1 : 2, window.devicePixelRatio || 1);
      const { w, h } = st.size;
      const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
      if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
      const base = computeView(w, h); // เฟรมปกติ (ชั้นอบใช้อันนี้เสมอ)
      st.base = base;
      // --- มุมมอง (หมุนนุ่มๆ ไปทางที่สั้นกว่า)
      const target = normRot(p.rotation);
      if (st.rotTarget === null) { st.rotTarget = target; st.turn = st.turnFrom = st.turnTo = target; }
      else if (target !== st.rotTarget) {
        // มุมใกล้: จำจุดบนกระดานที่อยู่กลางส่วนที่มองเห็น แล้วหมุนรอบจุดนั้น
        if (st.cam.z > 1.001) {
          if (st.camAnim) { st.cam = st.camAnim.to; st.camAnim = null; }
          setCamera(info, st.turn);
          const gp = unproject(st.cam.cx, camEyeY(base, st.cam.z, st.cam.cy));
          const cl = (v, hi) => Math.max(0, Math.min(hi, v));
          st.pivot = gp ? { x: cl(gp.x, info.cols), y: cl(gp.y, info.rows) } : { x: info.cols / 2, y: info.rows / 2 };
        }
        let d = (((target - st.rotTarget) % 4) + 4) % 4;
        if (d === 3) d = -1;
        st.rotTarget = target; st.turnFrom = st.turn; st.turnTo += d; st.turnT0 = now;
        if (lowQ) { st.turnTo = ((st.turnTo % 4) + 4) % 4; st.turn = st.turnFrom = st.turnTo; }
      }
      let turning = false, mix = 1;
      if (st.turn !== st.turnTo) {
        const pr = Math.min(1, (now - st.turnT0) / TURN_MS);
        if (pr >= 1) { st.turnTo = ((st.turnTo % 4) + 4) % 4; st.turn = st.turnFrom = st.turnTo; }
        else { turning = true; mix = ease(pr); st.turn = st.turnFrom + (st.turnTo - st.turnFrom) * mix; }
      }
      // --- กล้องมุมใกล้ (ซูม/เลื่อน) — คำนวณในพิกัดตรรกะของเฟรมปกติ
      setCamera(info, st.turn);
      const dt = Math.min(50, now - (st.lastT || now));
      st.lastT = now;
      const startAnim = (to, dur) => {
        if (lowQ) { st.cam = to; st.camAnim = null; return; }
        st.camAnim = { from: { ...st.cam }, to, t0: now, dur };
      };
      const focusPt = (f) => (f && Number.isFinite(f.x) && Number.isFinite(f.y) ? project(f.x + 0.5, f.y + 0.5) : null);
      const zl = p.zoom ? 1 : 0;
      if (zl !== st.zoomLv) {
        const first = st.zoomLv === null;
        st.zoomLv = zl;
        let to;
        if (zl) {
          const z1 = ZOOM_K, a = st.zoomAnchor && now - st.zoomAnchor.t < 800 ? st.zoomAnchor : null, fp = focusPt(p.focus);
          if (a) {
            // ล้อเมาส์: จุดใต้เมาส์อยู่ที่เดิมบนจอ
            const r = st.cam.z / z1;
            to = { z: z1, cx: a.lx - r * (a.lx - st.cam.cx), cy: a.ly - r * (a.ly - st.cam.cy) };
          } else if (fp) to = { z: z1, ...camFromEye(base, z1, fp[0], fp[1]) };
          else to = { z: z1, cx: st.cam.cx, cy: st.cam.cy };
        } else to = { z: 1, cx: LW / 2, cy: LH / 2 };
        st.zoomAnchor = null; st.pivot = null;
        to = clampCam(info, base, to);
        if (first) { st.cam = to; st.camAnim = null; } else startAnim(to, ZOOM_MS);
      }
      if (p.focus !== st.focusRef) {
        st.focusRef = p.focus;
        const fp = focusPt(p.focus), goal = st.camAnim ? st.camAnim.to : st.cam;
        if (fp && zl && !st.pivot && !(st.drag && st.drag.moved) && !inCamView(base, goal, fp[0], fp[1])) {
          startAnim(clampCam(info, base, { z: goal.z, ...camFromEye(base, goal.z, fp[0], fp[1]) }), FOCUS_MS);
        }
      }
      if (st.camAnim) {
        const A = st.camAnim, pr = Math.min(1, (now - A.t0) / A.dur), e = ease(pr);
        st.cam = { z: A.from.z + (A.to.z - A.from.z) * e, cx: A.from.cx + (A.to.cx - A.from.cx) * e, cy: A.from.cy + (A.to.cy - A.from.cy) * e };
        if (pr >= 1) { st.cam = A.to; st.camAnim = null; }
      }
      if (zl && st.keys.size && dt > 0) {
        let kx = 0, ky = 0;
        for (const c of st.keys) { const v = ARROWS[c]; if (v) { kx += v[0]; ky += v[1]; } }
        const sp = PAN_SPEED * dt / 1000 / st.cam.z;
        if (kx || ky) { st.camAnim = null; st.cam = { ...st.cam, cx: st.cam.cx + kx * sp, cy: st.cam.cy + ky * sp }; }
      }
      if (st.pivot) {
        const [sx, sy] = project(st.pivot.x, st.pivot.y);
        st.cam = { z: st.cam.z, ...camFromEye(base, st.cam.z, sx, sy) };
        if (!turning) st.pivot = null;
      }
      st.cam = clampCam(info, base, st.cam);
      const view = st.cam.z > 1.0001 ? computeView(w, h, st.cam) : base;
      st.view = view;
      // ความละเอียดของชั้นอบ: มุมใกล้อบละเอียดขึ้น (ไม่เกิน 2 · lowQ = เท่าจอ) — ไม่ให้ภาพแตกตอนขยาย
      const res = lowQ || !zl ? dpr : Math.round(Math.min(2, dpr * ZOOM_K) * 100) / 100;
      // --- ชั้นอบ: ฉาก (ตามแนวกระดาน ตั้ง/นอน) + กระดาน (ตามมุม)
      const tB0 = performance.now();
      const sceneOf = (turn) => {
        const par = normRot(turn) % 2, sk = `${info.area}|${info.cols}x${info.rows}|${w}x${h}|${res}|${night}|${lowQ}|${par}`;
        let sc = st.scenes.get(sk);
        if (!sc) {
          sc = bakeScene(info, base, res, night, lowQ, par);
          st.scenes.set(sk, sc);
          if (st.scenes.size > 4) st.scenes.delete(st.scenes.keys().next().value);
          if (turning) st.turnT0 = performance.now() - (now - st.turnT0); // ไม่นับเวลาอบเข้าไปในแอนิเมชัน
        }
        return sc;
      };
      const scTo = sceneOf(turning ? st.turnTo : st.turn);
      const scFrom = turning && normRot(st.turnFrom) % 2 !== normRot(st.turnTo) % 2 ? sceneOf(st.turnFrom) : null;
      let boardCv = null;
      if (!turning) {
        const bk = `${st.sig}|${w}x${h}|${res}|${night}|${normRot(st.turn)}`;
        boardCv = st.boards.get(bk);
        if (!boardCv) {
          boardCv = bakeBoard(info, base, res, night, normRot(st.turn));
          st.boards.set(bk, boardCv);
          if (st.boards.size > 2) st.boards.delete(st.boards.keys().next().value);
        }
      }
      const tB = performance.now() - tB0;
      if (tB > 8 && st.camAnim) st.camAnim.t0 += tB; // ไม่นับเวลาอบเข้าไปในการซูม/เลื่อน
      const bake = { scene: scTo.scene, fore: scTo.fore, marks: scTo.marks, board: boardCv, sceneFrom: scFrom && scFrom.scene, mix, view: base, res };
      // --- ไฮไลต์
      if (p.highlights !== st.hlRef) { st.hlRef = p.highlights; st.hl = prepareHighlights(p.highlights); }
      const hl = st.hl;
      const units = Array.isArray(p.units) ? p.units : [];

      // --- แอนิเมชัน
      const a = p.anim;
      if (a !== (st.anim && st.anim.obj)) {
        if (validAnim(a)) {
          const u = units.find((v) => v.id === a.id);
          st.anim = { obj: a, t0: now, startX: u ? u.x : null, startY: u ? u.y : null, done: false, hit: false, missing: !u };
        } else {
          st.anim = a ? { obj: a, t0: now, done: false, invalid: true } : null;
        }
      }
      const an = st.anim;
      let pose = null;
      if (an && !an.invalid && !an.missing) {
        pose = animPose(an.obj, now - an.t0);
        if (pose.hitAt != null && !an.hit && now - an.t0 >= pose.hitAt) { an.hit = true; st.hitT.set(an.obj.id, now); }
      }
      if (an && !an.done && (an.invalid || an.missing || (pose && pose.done))) {
        an.done = true;
        if (typeof p.onAnimDone === "function") p.onAnimDone();
      }

      // --- เอฟเฟกต์ครั้งเดียว
      if (p.fx !== st.fxRef) {
        st.fxRef = p.fx;
        for (const f of Array.isArray(p.fx) ? p.fx : []) {
          if (!f || f.key == null || st.fxSeen.has(f.key)) continue;
          st.fxSeen.add(f.key);
          const item = { ...f, t0: now };
          if (f.kind === "slash") {
            const hitU = units.find((u) => u.x === f.x && u.y === f.y && u.alive !== false);
            if (hitU) st.hitT.set(hitU.id, now);
            if (!item.rgb) item.rgb = f.color ? rgbString(f.color) : "255,255,255";
          }
          st.fxActive.push(item);
        }
        if (st.fxSeen.size > 400) st.fxSeen = new Set([...st.fxSeen].slice(-200));
      }
      st.fxActive = st.fxActive.filter((f) => now - f.t0 < (FX_DUR[f.kind] || 1000));

      // --- ตัวละครพร้อมวาด
      const targeting = hl.skill.size > 0 || hl.aoe.size > 0;
      const hov = st.hover;
      const list = [];
      for (const u of units) {
        if (!u || u.alive === false || !Number.isFinite(u.x) || !Number.isFinite(u.y)) continue;
        let rx = u.x, ry = u.y, ox = 0, oy = 0;
        if (an && !an.invalid && !an.missing && an.obj.id === u.id) {
          if (!an.done && pose) { rx = pose.x; ry = pose.y; ox = pose.ox; oy = pose.oy; }
          else {
            // จบแล้วแต่ state ยังไม่อัปเดต → ค้างที่ปลายทาง (กันเด้งกลับที่เดิม)
            const fin = animFinal(an.obj);
            if ((u.x === an.startX && u.y === an.startY) || (u.x === fin.x && u.y === fin.y)) { rx = fin.x; ry = fin.y; }
          }
        }
        const k = key(u.x, u.y);
        let reticle = null, alpha = 1;
        if (!u.isMe && !u.isActor) {
          if (hl.aoe.has(k)) reticle = "aoe";
          else if (hl.skill.has(k)) reticle = "skill";
          else if (hl.attack.has(k) || (hl.target && hl.target.x === u.x && hl.target.y === u.y)) reticle = "attack";
          else if (targeting) alpha = 0.5;
        }
        list.push({
          id: u.id, rx, ry, ox, oy, color: normColor(u.color), img: u.img, name: u.name,
          hp: u.hp, maxHp: u.maxHp, armor: u.armor, maxArmor: u.maxArmor,
          isMe: !!u.isMe, isActor: !!u.isActor, tag: u.tag, reticle, alpha,
          hitT: st.hitT.get(u.id) || 0,
          hovered: !!hov && st.hoverUnit === u.id,
        });
      }

      st.boxes = drawFrame(g, {
        info, view, dpr, bake, turn: st.turn, night, lowQ, units: list, hl,
        shopPos: p.shopPos || null, shopLabel: p.shopLabel, hover: hov, fx: st.fxActive,
      }, now);
      // กล้องขยับ (ซูม/เลื่อน/หมุน) ใต้เมาส์ที่อยู่นิ่ง → ช่องที่ชี้เปลี่ยน
      const vs = `${view.k}|${view.ox}|${view.oy}|${st.turn}`;
      if (vs !== st.viewSig) { st.viewSig = vs; if (st.refreshHover) st.refreshHover(); }
    };
    raf = requestAnimationFrame(tick);

    // ล้อเมาส์: ขึ้น = มุมใกล้ (ซูมเข้าหาจุดใต้เมาส์) · ลง = มุมปกติ (ต้อง passive: false เพื่อกันหน้าเลื่อน)
    const onWheel = (e) => {
      const pp = propsRef.current, cb = pp.onZoomChange;
      if (typeof cb !== "function" || e.ctrlKey || !e.deltaY) return;
      e.preventDefault();
      const want = e.deltaY < 0 ? 1 : 0;
      if (want === (pp.zoom ? 1 : 0)) return;
      if (want && st.view) {
        const r = cv.getBoundingClientRect(), [lx, ly] = toLogical(st.view, e.clientX - r.left, e.clientY - r.top);
        st.zoomAnchor = { lx, ly, t: performance.now() };
      }
      cb(want);
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });
    // ปุ่มลูกศร = เลื่อนกล้อง (มุมใกล้เท่านั้น · ค้างไว้ = เลื่อนต่อเนื่อง)
    const typing = (e) => e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    const onKeyDown = (e) => {
      if (!ARROWS[e.code] || !propsRef.current.zoom || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      // กดครั้งแรก = ขยับทันทีหนึ่งก้าว (กดแล้วปล่อยเร็วกว่า 1 เฟรมก็ยังขยับ) · ค้าง = เลื่อนต่อเนื่องในลูปวาด
      if (!e.repeat && !st.keys.has(e.code)) {
        const [kx, ky] = ARROWS[e.code], step = TAP_STEP / st.cam.z;
        st.camAnim = null; st.cam = { ...st.cam, cx: st.cam.cx + kx * step, cy: st.cam.cy + ky * step };
      }
      st.keys.add(e.code);
    };
    const onKeyUp = (e) => { st.keys.delete(e.code); };
    const onBlur = () => { st.keys.clear(); st.drag = null; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect();
      wrap.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // ---------- เมาส์ / แตะ ----------
  const locate = (e) => {
    const st = S.current, cv = cvRef.current;
    if (!st.view || !st.info) return { tile: null, unit: null };
    setCamera(st.info, st.turn);
    const r = cv.getBoundingClientRect();
    const [lx, ly] = toLogical(st.view, e.clientX - r.left, e.clientY - r.top);
    const units = Array.isArray(propsRef.current.units) ? propsRef.current.units : [];
    let unit = null;
    for (const b of st.boxes) { if (lx >= b.x0 && lx <= b.x1 && ly >= b.y0 && ly <= b.y1) { unit = units.find((u) => u.id === b.id) || null; if (unit) break; } }
    let tile = pickTile(st.info, lx, ly);
    if (tile) {
      // กล่องรูปตัวหมากสูงทับ 1–2 ช่องด้านหลัง: คนที่ยืนบนช่องใต้เมาส์ชนะเสมอ ·
      //  ช่องว่างที่กดได้ (เดิน/สกิล/ตีหมู่) ชนะกล่องของตัวที่ยืนช่องอื่น — ไม่งั้นเดินถอยไปทางหลังตัวเองไม่ได้
      const onTile = units.find((u) => u.alive !== false && u.x === tile.x && u.y === tile.y) || null;
      const k = key(tile.x, tile.y), hl = st.hl;
      if (onTile) unit = onTile;
      else if (unit && (hl.move.has(k) || hl.skill.has(k) || hl.aoe.has(k))) unit = null;
    }
    if (unit) tile = { x: unit.x, y: unit.y };
    return { tile, unit };
  };
  const setHover = (tile, unitId) => {
    const st = S.current, prev = st.hover;
    st.hoverUnit = unitId;
    const same = (!tile && !prev) || (tile && prev && tile.x === prev.x && tile.y === prev.y);
    if (same) return;
    st.hover = tile;
    const cb = propsRef.current.onHoverTile;
    if (typeof cb === "function") cb(tile ? tile.x : null, tile ? tile.y : null);
  };
  // ลากเลื่อนกล้อง (มุมใกล้เท่านั้น): ปุ่มซ้าย/แตะ = ต้องลากเกิน DRAG_PX ก่อน (สั้นกว่านั้นยังเป็นคลิก) · ปุ่มขวา/กลาง = ลากทันที
  const onPointerDown = (e) => {
    const st = S.current;
    st.suppressClick = false;
    if (!propsRef.current.zoom || e.button > 2) return;
    if (e.button === 1) e.preventDefault(); // กันเมาส์กลางเลื่อนหน้าอัตโนมัติ
    st.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, moved: e.button !== 0, button: e.button };
    try { cvRef.current.setPointerCapture(e.pointerId); } catch { /* ไม่รองรับ */ }
  };
  const endDrag = (e) => {
    const st = S.current, d = st.drag;
    if (!d || d.id !== e.pointerId) return;
    if (d.moved && d.button === 0) st.suppressClick = true;
    st.drag = null;
    try { cvRef.current.releasePointerCapture(e.pointerId); } catch { /* ปล่อยแล้ว */ }
  };
  const hoverAt = (e) => {
    const st = S.current;
    const { tile, unit } = locate(e);
    setHover(tile, unit ? unit.id : null);
    const p = propsRef.current, hl = st.hl, k = tile ? key(tile.x, tile.y) : null;
    const hot = !!unit || (k && (hl.move.has(k) || hl.attack.has(k) || hl.skill.has(k) || hl.aoe.has(k)));
    cvRef.current.style.cursor = hot && (p.onTileClick || p.onUnitClick) ? "pointer" : p.zoom ? "grab" : "default";
  };
  useLayoutEffect(() => {
    S.current.refreshHover = () => { const st = S.current; if (st.ptr && !(st.drag && st.drag.moved)) hoverAt(st.ptr); };
  });
  const onPointerMove = (e) => {
    const st = S.current, d = st.drag;
    st.ptr = { clientX: e.clientX, clientY: e.clientY };
    if (d && d.id === e.pointerId) {
      if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > DRAG_PX) d.moved = true;
      if (d.moved) {
        const k = (st.base ? st.base.k : 1) * st.cam.z;
        st.camAnim = null;
        st.cam = { ...st.cam, cx: st.cam.cx - (e.clientX - d.lx) / k, cy: st.cam.cy - (e.clientY - d.ly) / k };
        d.lx = e.clientX; d.ly = e.clientY;
        cvRef.current.style.cursor = "grabbing";
        return;
      }
    }
    hoverAt(e);
  };
  const onPointerLeave = () => { S.current.ptr = null; setHover(null, null); };
  const onClick = (e) => {
    if (S.current.suppressClick) { S.current.suppressClick = false; return; }
    const { tile, unit } = locate(e);
    const p = propsRef.current;
    if (unit && typeof p.onUnitClick === "function") { p.onUnitClick(unit.id); return; }
    if (tile && typeof p.onTileClick === "function") p.onTileClick(tile.x, tile.y);
  };

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <canvas
        ref={cvRef}
        style={{ display: "block", width: "100%", height: "100%", touchAction: props.zoom ? "none" : "manipulation" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={onPointerLeave}
        onClick={onClick}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
