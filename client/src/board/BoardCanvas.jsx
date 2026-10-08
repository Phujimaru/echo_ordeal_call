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
//               เปลี่ยนค่า = หมุนนุ่มๆ ≈250ms (lowQ = ทันที) · 90°/270° กระดานเป็น 12 กว้าง × 16 ลึก กล้องย่อให้พอดีเอง
//   map.special { "x,y": "flowers"|"forest"|"thorns"|"shallow"|"whirl"|"quicksand"|"ice"|"lava"|"power" } · map.flow { "x,y": "up"|"down"|"left"|"right" }
//   anim        { kind: "move", id, path } | { kind: "push", id, from, to, collide } — เปลี่ยนอ็อบเจกต์ = เล่นใหม่ · จบแล้วเรียก onAnimDone()
//   fx          [{ key, kind: "slash"|"float", x, y, text?, color?, size? }] — เอฟเฟกต์ครั้งเดียว เล่นเมื่อเห็น key ใหม่
//   onTileClick(x, y) · onUnitClick(id) (ไม่ส่งมา = เรียก onTileClick ที่ช่องของตัวนั้นแทน) · onHoverTile(x|null, y|null)
//  ขนาด: เต็มกล่องแม่ (ResizeObserver) · devicePixelRatio สูงสุด 2 (lowQ = 1)
// ============================================================
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  bakeBoard, bakeScene, computeView, drawFrame, FX_DUR, key, mapSignature, normColor, normRot,
  pickTile, prepareHighlights, prepareMap, rgbString, setCamera, toLogical,
} from "./boardDraw";

const STEP_MS = 120;   // เวลาเดินต่อ 1 ช่อง
const PUSH_MS = 240;   // ถอย 1 ช่อง
const BUMP_MS = 280;   // ถอยชน (ขยับไปนิดแล้วเด้งกลับ)
const TURN_MS = 250;   // หมุนมุมมอง 90°
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
      boardKey: "", boardCv: null,
      rotTarget: null, turn: 0, turnFrom: 0, turnTo: 0, turnT0: 0, // มุมมอง (หน่วย 90° ต่อเนื่อง)
      hlRef: undefined, hl: prepareHighlights(null),
      anim: null,            // { obj, t0, startX, startY, done, hit }
      fxSeen: new Set(), fxRef: undefined, fxActive: [],
      hitT: new Map(),       // id → เวลาโดนตี (สั่น/แฟลช)
      hover: null, hoverUnit: null, boxes: [], view: null, lastDraw: 0,
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
      const view = computeView(w, h);
      st.view = view;
      // --- มุมมอง (หมุนนุ่มๆ ไปทางที่สั้นกว่า)
      const target = normRot(p.rotation);
      if (st.rotTarget === null) { st.rotTarget = target; st.turn = st.turnFrom = st.turnTo = target; }
      else if (target !== st.rotTarget) {
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
      // --- ชั้นอบ: ฉาก (ตามแนวกระดาน ตั้ง/นอน) + กระดาน (ตามมุม)
      const sceneOf = (turn) => {
        const par = normRot(turn) % 2, sk = `${info.area}|${info.cols}x${info.rows}|${w}x${h}|${dpr}|${night}|${lowQ}|${par}`;
        let sc = st.scenes.get(sk);
        if (!sc) {
          sc = bakeScene(info, view, dpr, night, lowQ, par);
          st.scenes.set(sk, sc);
          if (st.scenes.size > 3) st.scenes.delete(st.scenes.keys().next().value);
          if (turning) st.turnT0 = performance.now() - (now - st.turnT0); // ไม่นับเวลาอบเข้าไปในแอนิเมชัน
        }
        return sc;
      };
      const scTo = sceneOf(turning ? st.turnTo : st.turn);
      const scFrom = turning && normRot(st.turnFrom) % 2 !== normRot(st.turnTo) % 2 ? sceneOf(st.turnFrom) : null;
      let boardCv = null;
      if (!turning) {
        const bk = `${st.sig}|${w}x${h}|${dpr}|${night}|${normRot(st.turn)}`;
        if (bk !== st.boardKey) { st.boardKey = bk; st.boardCv = bakeBoard(info, view, dpr, night, normRot(st.turn)); }
        boardCv = st.boardCv;
      }
      const bake = { scene: scTo.scene, fore: scTo.fore, marks: scTo.marks, board: boardCv, sceneFrom: scFrom && scFrom.scene, mix };
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
        shopPos: p.shopPos || null, hover: hov, fx: st.fxActive,
      }, now);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); };
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
  const onPointerMove = (e) => {
    const { tile, unit } = locate(e);
    setHover(tile, unit ? unit.id : null);
    const p = propsRef.current, hl = S.current.hl, k = tile ? key(tile.x, tile.y) : null;
    const hot = !!unit || (k && (hl.move.has(k) || hl.attack.has(k) || hl.skill.has(k) || hl.aoe.has(k)));
    cvRef.current.style.cursor = hot && (p.onTileClick || p.onUnitClick) ? "pointer" : "default";
  };
  const onPointerLeave = () => { setHover(null, null); };
  const onClick = (e) => {
    const { tile, unit } = locate(e);
    const p = propsRef.current;
    if (unit && typeof p.onUnitClick === "function") { p.onUnitClick(unit.id); return; }
    if (tile && typeof p.onTileClick === "function") p.onTileClick(tile.x, tile.y);
  };

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <canvas
        ref={cvRef}
        style={{ display: "block", width: "100%", height: "100%", touchAction: "manipulation" }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onClick={onClick}
      />
    </div>
  );
}
