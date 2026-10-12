// ============================================================
//  BoardCanvas — กระดานเดินได้แบบ Fire Emblem (คอมโพเนนต์แสดงผลล้วน ไม่รู้กติกาเกม)
//  ตัววาดอยู่ใน boardDraw.js · หน้าดูตัวอย่าง: ?board=1 (BoardPreview.jsx)
//
//  props
//   map         { area, cols, rows, terrain: { "x,y": "tree"|"pillar"|"banner"|"hedge"|… }, heal: ["x,y"…], spawns: [{x,y}], shopSpots }
//               (= state.board · heal รับได้ทั้ง array ของ "x,y" / [x,y] / {x,y} และ Set · ชนิดสิ่งกีดขวางที่ไม่รู้จัก = ก้อนหิน)
//   units       [{ id, x, y, img, color, name, hp, maxHp, armor, maxArmor, isMe, isActor, teamId, tag, alive?, alpha?, cloak? }]
//               cloak = ซ่อนจากศัตรูอยู่ (เราเห็นเพราะเป็นตัวเอง/ทีมเดียวกัน) → วาดจางแบบเงา + แถบแสงพาดช้าๆ
//               tag = ป้ายเหนือหัว: "18" / "พอ" / "แตก" (แตก = ป้ายแดง) หรือ { text, bust, backs } · alive === false = ไม่วาด
//   highlights  { move, attack, skill, aoe, danger: ["x,y"…], path: [{x,y}…], target?: {x,y}, push?: { from, to, collide } } — ไม่ใส่ได้ทุกช่อง
//   shopPos     {x,y} | null — แผงร้านค้ามายา
//   night, lowQ boolean
//   rotation    0|1|2|3 = หมุนมุมมองทีละ 90° ตามเข็มนาฬิกา (ค่าเริ่ม 0) — หมุนแค่ภาพ ทุก prop และคอลแบ็กยังเป็นพิกัดกระดานเดิม
//               เปลี่ยนค่า = หมุนนุ่มๆ ≈250ms (lowQ = ทันที) · กล้องจัดกลาง/ย่อพอดีจาก map.cols × map.rows หลังหมุนเอง
//               (กระดานจัตุรัส เช่น 14 × 14 = ทุกมุมกรอบเท่ากัน) · มุมใกล้ = หมุนรอบจุดกลางของส่วนที่มองเห็น
//   zoom        ระดับซูม 0..ZOOM_STEPS−1 (ผู้ใช้สั่ง 2026-10-11 — เดิมมีแค่ย่อสุด/ซูมสุด): 0 = เห็นทั้งกระดาน · ยิ่งมากยิ่งใกล้
//               (ตัวคูณต่อระดับ ZOOM_LEVELS — มุมบนขยายมากกว่าเพราะช่องเล็กกว่า) · เลื่อนดูได้ทั้งสนามเมื่อ > 0 — เปลี่ยน = ซูมนุ่มๆ (lowQ = ทันที)
//   view        "tilt" (ค่าเริ่ม · กล้องเอียง 32°) | "top" = มองจากด้านบน 90° — แยกจากซูม: มุมบนก็ซูม/เลื่อน/หมุนได้เหมือนเดิม
//               มุมใกล้: ลากเมาส์ซ้ายบนกระดาน (เกิน 6px = ลาก ไม่นับเป็นคลิก) / ลากปุ่มขวา-กลาง / แตะลาก / ปุ่มลูกศร = เลื่อนกล้อง
//   onZoomChange(level)  ล้อเมาส์ขึ้น = ใกล้ขึ้น 1 ระดับ (ซูมเข้าหาจุดใต้เมาส์) · ลง = ไกลขึ้น 1 ระดับ — ไม่ส่งมา = ล้อเมาส์ไม่ทำอะไร (zoom เป็น prop ควบคุมจากแม่)
//   focus       {x,y} — เปลี่ยนอ็อบเจกต์ = ถ้าช่องนั้นอยู่นอกส่วนที่มองเห็น (มุมใกล้) เลื่อนกล้องนุ่มๆ ไปให้อยู่กลาง ·
//               ใช้เป็นจุดกลางตอนกดซูมเข้าด้วยปุ่มด้วย (ซูมด้วยล้อ = จุดใต้เมาส์) · มุมปกติไม่มีผล
//   shopLabel   string|number|null — ป้าย "🏪 N" เหนือแผงร้าน (วาดในแคนวาส ตามซูม/เลื่อน/หมุนเอง)
//   map.special { "x,y": "flowers"|"forest"|"thorns"|"shallow"|"whirl"|"quicksand"|"ice"|"lava"|"power" } · map.flow { "x,y": "up"|"down"|"left"|"right" }
//   anim        { kind: "move", id, path, stepMs? (ms ต่อช่อง — ไม่ใส่ = STEP_MS) } | { kind: "push", id, from, to, collide }
//               | { kind: "lunge", id, from, to, hitId } (ง้าง → พุ่งเข้าหาเป้า → กลับที่เดิม · จังหวะชน = เป้า hitId สั่น)
//               | { kind: "wheel", id, at, ms, dir } (โซระวิ่งในกรงจักร: ยืนที่ at เด้งถี่ขึ้นเรื่อยๆ ms มิลลิวินาที)
//               | { kind: "fling", id, from, to, ms? } (ถูกเหวี่ยงลอยโค้งไปตกที่ to — ไกลได้หลายช่อง · ลงพื้น = สั่น)
//               — เปลี่ยนอ็อบเจกต์ = เล่นใหม่ · จบแล้วเรียก onAnimDone()
//   fx          [{ key, kind: "slash"|"burst"|"float", x, y, text?, color?, size? }] — เอฟเฟกต์ครั้งเดียว เล่นเมื่อเห็น key ใหม่
//               | { key, kind: "beam", x, y (ช่องคนยิง), dir: "up"|"down"|"left"|"right", len, color } — ลำแสง Beam Magnum
//                 เริ่มช่องติดคนยิงยาว len ช่อง (ตัดที่ขอบกระดาน) · ตัวที่ยืนในแนวสั่นตอนลำแสงถึง · tone: "blue" = ปืนโซระ
//               | โซระ: "mythSlash" (ฟันมีด 2 ครั้ง — เป้าสั่น 2 จังหวะ) · "soraWheel" · "soraDash" · "soraBoom" (ดู boardDraw.js · dur = ระยะเล่นถ้าส่งมา)
//   cinema      { a: {x,y}, b: {x,y}, z } | null — กล้องฉากตี: ซูมเข้ากลางระหว่างสองช่อง (z เท่า) · กลับเป็น null = คืนกล้องเดิม
//               ระหว่างนี้ไม่สนใจ focus/ซูม (จำค่าซูมล่าสุดไว้ใช้ตอนคืน)
//   onTileClick(x, y) · onUnitClick(id) (ไม่ส่งมา = เรียก onTileClick ที่ช่องของตัวนั้นแทน) · onHoverTile(x|null, y|null)
//   ice         Ice Spike: { lv: { "x,y": Lv ที่แสดงแทน terrain (0 = ซ่อน) }, prisons: [{ x, y, size }] } | null (ดู iceFx.js)
//               fx ของ Ice Spike: ice* (iceFx.js) · iceShake { amp } = จอสั่นแบบเลื่อนกล้อง (แรงตาม amp · lowQ/ลดการเคลื่อนไหว = ไม่สั่น)
//   zero        state.zero (ห่วงเวลาซีโร่: { stage, seals, pickups }) — ผนึก/โซ่/ของฟื้นพลังชีวิตบนสนาม area 8–11
//   zeroScene   { seq, mode: "enter"|"break"|"release", stage, seal } | null — seq ใหม่ = เล่นฉากเปลี่ยนผ่าน:
//               จับภาพเฟรมล่าสุดไว้ (สนามเดิม) แล้วเผยเฟรมใหม่ใต้คลื่น (เข้า/เปลี่ยนเฟส) หรือแตกเป็นเศษกระจก (ปลดผนึก) — zeroTheme.js
//  ขนาด: เต็มกล่องแม่ (ResizeObserver) · devicePixelRatio สูงสุด 2 (lowQ = 1)
//  พิกัด DOM ↔ กระดาน ภายนอก: tileCenter(x, y, z) (ตรรกะ ณ กล้องที่วาดล่าสุด) → computeView(w, h, cam) — cam อยู่ภายในคอมโพเนนต์นี้
//   ป้ายที่ต้องเกาะช่องให้วาดในแคนวาสแทน (เช่น shopLabel)
// ============================================================
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  bakeBoard, bakeScene, beamColors, camEyeY, camFromEye, clampCam, computeView, drawFrame, FX_DUR, GROW_MS, inCamView, key, LH, LW, smashDur,
  mapSignature, normColor, normRot, pickTile, prepareBeam, prepareQuake, prepareHighlights, prepareMap, project, reducedMotion, rgbString,
  setCamera, SORA_T, toLogical, unproject, ZOOM_LEVELS, ZOOM_STEPS, clampZoom,
} from "./boardDraw";
import { boardPaused } from "./boardPause";
import { hkBeamHitMs } from "./hikaruFx";
import { iceShakeOffset } from "./iceFx";
import {
  easeInOut, enterAnim, makeShards, drawShards, segT, SEAL_Z, ZERO_SCENE_MS, zeroAccent, zeroBeam, zeroCracks, zeroWavePath, zeroWaveRing,
} from "./zeroTheme";
// ช่อง (x, y) อยู่ในตัวของ u ไหม (ตัวใหญ่ = size × size ช่อง นับจากมุมบนซ้าย)
const onBody = (u, x, y) => x >= u.x && x < u.x + Math.max(1, u.size | 0) && y >= u.y && y < u.y + Math.max(1, u.size | 0);
import { P as projectZ, PITCH_BIRD, PITCH_NORMAL, setPitch } from "./boardGeo";

// ผนึก 4 มุม (ตรงกับ server/board.js ZERO_SEALS) — จุดเริ่มคลื่น/รอยร้าวของฉากห่วงเวลาซีโร่
const ZERO_CORNERS = [[0, 0], [13, 0], [13, 13], [0, 13]];

const PAUSE_BAKE_AFTER = 1200; // พักกระดานแล้วนานเท่านี้ ค่อยเริ่มอบชั้นนิ่งล่วงหน้า (ms)
const STEP_MS = 120;   // เวลาเดินต่อ 1 ช่อง
// เดินกระโดด (Echo — a.hop = ขนาดตัว): ช่องละ 1 กระโดด · ตัวใหญ่ช้าและหนักกว่า · ยุบตัวตอนลงพื้น
const HOP_MS = (n) => (n > 1 ? 250 + n * 20 : 200);
const HOP_Z = (n) => (n > 1 ? 0.22 + n * 0.05 : 0.32);
const PUSH_MS = 240;   // ถอย 1 ช่อง
const BUMP_MS = 280;   // ถอยชน (ขยับไปนิดแล้วเด้งกลับ)
const LUNGE_MS = 620;  // พุ่งชน (ง้าง 40% → พุ่ง → ชน ที่ 62% → กลับ)
const LUNGE_HIT = 0.62;
const CINEMA_MS = 520; // กล้องฉากตี ซูมเข้า/ออก
const TURN_MS = 250;   // หมุนมุมมอง 90°
const ZOOM_MS = 280;   // ซูมเข้า/ออก
const FOCUS_MS = 420;  // เลื่อนกล้องตามตัวละคร
// มองจากด้านบน: ช่องเล็กกว่ามุมเอียง (~33 px ตรรกะ ทุกแถว เทียบมุมเอียงกลางกระดาน ~44 px) → ตัวคูณแต่ละระดับมากกว่า (ZOOM_LEVELS.top ใน boardDraw.js)
const zoomKOf = (pitch, lv) => (pitch === PITCH_BIRD ? ZOOM_LEVELS.top : ZOOM_LEVELS.tilt)[clampZoom(lv)];
const ZOOM_WHEEL_GAP = 130; // ล้อเมาส์/ทัชแพดยิงถี่ — ขยับได้ระดับละครั้งต่อช่วงนี้ (ms)
const DRAG_PX = 6;     // ลากเกินนี้ = เลื่อนกล้อง (ไม่นับเป็นคลิก)
const PAN_SPEED = 720; // ปุ่มลูกศร: ตรรกะ/วินาที ที่ z = 1
const TAP_STEP = 48;   // ปุ่มลูกศรกดครั้งเดียว: ตรรกะ ที่ z = 1
const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

// ฉากห่วงเวลาซีโร่ (zs = { mode, stage, seal, t0, snap }) — zb = เฟรมใหม่ · snap = ภาพนิ่งสนามเดิม
//  enter   0–0.8s เวลาหยุด (สีจาง) · 0.8s ลำแสงกลางสนาม · 1.8–3.4s คลื่นกลืนสนาม → เผยห่วงเวลา (โซ่/ผนึกค่อยๆ โผล่ — enterAnim)
//  break   คลื่นจากผนึกที่แตก 0.8–2.1s → สนามระดับใหม่
//  release รอยร้าวทั้งจอจากผนึกสุดท้าย → แสงวาบ 1.45s → ห่วงเวลาแตกเป็นเศษกระจกร่วง เผยสนามเดิม
function drawZeroScene(g, zs, zb, view, dpr, info, lowQ, now) {
  const t = (now - zs.t0) / 1000;
  const L = () => g.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.ox, dpr * view.oy);
  const I = () => g.setTransform(1, 0, 0, 1, 0, 0);
  const cx = info.cols / 2, cy = info.rows / 2;
  const [sxC, syC] = ZERO_CORNERS[zs.seal] || ZERO_CORNERS[0];
  const reveal = (ox, oy, r) => {
    if (r <= 0) return;
    g.save(); L(); zeroWavePath(g, ox, oy, r, info.rows); g.clip(); I(); g.drawImage(zb, 0, 0); g.restore();
  };
  g.save();
  if (zs.mode === "enter") {
    I();
    const gray = segT(t, 0, 0.8);
    if (!lowQ && "filter" in g) g.filter = `grayscale(${gray}) brightness(${1 - 0.12 * gray})`;
    g.drawImage(zs.snap, 0, 0);
    g.filter = "none";
    const r = 15 * easeInOut(segT(t, 1.8, 3.4));
    reveal(cx, cy, r);
    L();
    zeroWaveRing(g, cx, cy, r, r > 0 ? 1 - segT(t, 3.0, 3.5) : 0, "255,140,210");
    zeroBeam(g, cx, cy, 1 - Math.pow(1 - segT(t, 0.8, 1.5), 3), segT(t, 1.5, 1.9) * (1 - segT(t, 3.0, 3.6)), segT(t, 0.8, 0.9) * (1 - segT(t, 3.2, 3.8)));
  } else if (zs.mode === "break") {
    I(); g.drawImage(zs.snap, 0, 0);
    const r = 24 * easeInOut(segT(t, 0.8, 2.1));
    reveal(sxC + 0.5, syC + 0.5, r);
    L(); zeroWaveRing(g, sxC + 0.5, syC + 0.5, r, r > 0 ? 1 - segT(t, 1.8, 2.2) : 0, zeroAccent(zs.stage));
  } else {
    // release: ภาพนิ่ง (ห่วงเวลา) ใช้กล้องของผนึกสุดท้ายเดิม — แผนที่ 14×14 เท่ากันทุกภูมิภาค
    const [ox, oy] = projectZ(sxC + 0.5, syC + 0.5, SEAL_Z);
    if (t < 1.45) {
      I(); g.drawImage(zs.snap, 0, 0);
      L(); zeroCracks(g, ox, oy, 1 - Math.pow(1 - segT(t, 0.9, 1.42), 3));
    } else {
      I(); g.drawImage(zb, 0, 0);
      L();
      if (!zs.shards) {
        // ภาพนิ่ง + รอยร้าวเต็ม ณ ตอนแตก
        const c2 = document.createElement("canvas"); c2.width = zs.snap.width; c2.height = zs.snap.height;
        const x2 = c2.getContext("2d"); x2.drawImage(zs.snap, 0, 0);
        x2.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.ox, dpr * view.oy); zeroCracks(x2, ox, oy, 1);
        zs.img = c2; zs.shards = makeShards(view, ox, oy);
      }
      if (!lowQ) drawShards(g, zs.shards, zs.img, view, t - 1.45);
    }
    const f = Math.max(0, 1 - Math.abs(t - 1.45) / 0.45);
    if (f > 0) { I(); g.fillStyle = `rgba(255,240,250,${f})`; g.fillRect(0, 0, zb.width, zb.height); }
  }
  g.restore();
  g.setTransform(1, 0, 0, 1, 0, 0);
}

// ตำแหน่งระหว่างเล่นแอนิเมชัน → { x, y, ox, oy, done, hitAt? }
function animPose(a, t) {
  if (a.kind === "move") {
    const pts = a.path, hop = a.hop | 0;
    const dur = Math.max(1, pts.length - 1) * (hop ? HOP_MS(hop) : a.stepMs > 0 ? a.stepMs : STEP_MS), p = Math.min(1, t / dur);
    if (pts.length < 2 || p >= 1) { const e = pts[pts.length - 1]; return { x: e.x, y: e.y, ox: 0, oy: 0, done: p >= 1 || pts.length < 2 }; }
    const f = p * (pts.length - 1), i = Math.floor(f), k = f - i, A = pts[i], B = pts[i + 1];
    if (!hop) return { x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k, ox: 0, oy: 0, done: false };
    // กระโดด: ย่อตัว (0–15%) → ลอยโค้ง → ลงพื้นยุบ (85–100%)
    const air = Math.min(1, Math.max(0, (k - 0.15) / 0.7)), m = air * air * (3 - 2 * air);
    const sq = k < 0.15 ? 0.1 * Math.sin((k / 0.15) * Math.PI) : k > 0.85 ? 0.14 * Math.sin(((k - 0.85) / 0.15) * Math.PI) : -0.05 * Math.sin(air * Math.PI);
    return { x: A.x + (B.x - A.x) * m, y: A.y + (B.y - A.y) * m, ox: 0, oy: 0, hz: Math.sin(air * Math.PI) * HOP_Z(hop), sq, done: false };
  }
  if (a.kind === "wheel") {
    // วิ่งในกรงจักร: เด้งขึ้นลงถี่ขึ้นตามความเร็วล้อ (เร่งแบบเดียวกับ wheelFx) + เอนไปทางพุ่งนิดๆ · ลดการเคลื่อนไหว = ยืนนิ่ง
    const T = a.ms > 0 ? a.ms : SORA_T.wheel, p = Math.min(1, t / T), at = a.at;
    if (reducedMotion()) return { x: at.x, y: at.y, ox: 0, oy: 0, done: p >= 1 };
    const tt = Math.min(t, T), ph = 0.012 * tt + 0.033 * tt * tt * tt / (3 * T * T), b = Math.abs(Math.sin(ph));
    // lunge = เป้ายืนติดตัว (ไม่มีทางพุ่ง): ช่วงท้ายพุ่งเข้าหาเป้าครึ่งช่องไปพร้อมล้อ (ตรงกับ wheelAt ใน boardDraw.js)
    const lunge = a.lunge ? 0.45 * Math.sin(Math.min(1, Math.max(0, (t - (T - 260)) / 260)) * Math.PI / 2) : 0;
    const dl = Math.hypot(a.dir && a.dir.x, a.dir && a.dir.y) || 1, lean = 0.06 * p + lunge;
    return { x: at.x, y: at.y, ox: a.dir ? (a.dir.x / dl) * lean : 0, oy: a.dir ? (a.dir.y / dl) * lean : 0, hz: b * 0.07, sq: 0.06 * (1 - b) - 0.02, done: p >= 1 };
  }
  if (a.kind === "fling") {
    // ถูกเหวี่ยง: ลอยโค้ง (สูงตามระยะ) + ยืด/หดสลับเหมือนหมุนคว้าง · ลงพื้น = สั่น
    const { from, to } = a, D = Math.hypot(to.x - from.x, to.y - from.y), T = a.ms > 0 ? a.ms : 280 + D * 70;
    const p = Math.min(1, t / T), e = 1 - Math.pow(1 - p, 2);
    const sq = reducedMotion() ? 0 : Math.sin(p * Math.PI * 4) * 0.14 * (1 - p);
    return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, ox: 0, oy: 0, hz: Math.sin(p * Math.PI) * (0.3 + D * 0.12), sq, done: p >= 1, hitAt: T * 0.96 };
  }
  if (a.kind === "lunge") {
    const { from, to } = a, p = Math.min(1, t / LUNGE_MS);
    const reach = Math.max(0, Math.hypot(to.x - from.x, to.y - from.y) - 0.55);
    const ux = (to.x - from.x) / (Math.hypot(to.x - from.x, to.y - from.y) || 1), uy = (to.y - from.y) / (Math.hypot(to.x - from.x, to.y - from.y) || 1);
    let d;
    if (p < 0.4) d = -0.22 * Math.sin((p / 0.4) * Math.PI / 2);                       // ง้าง
    else if (p < LUNGE_HIT) { const q = (p - 0.4) / (LUNGE_HIT - 0.4); d = -0.22 + (reach + 0.22) * q * q; } // พุ่ง (เร่ง)
    else { const q = (p - LUNGE_HIT) / (1 - LUNGE_HIT); d = reach * (1 - (1 - Math.pow(1 - q, 3))); }   // กลับ
    return { x: from.x, y: from.y, ox: ux * d, oy: uy * d, done: p >= 1, hitAt: LUNGE_MS * LUNGE_HIT, hitId: a.hitId };
  }
  // push
  const { from, to } = a;
  if (a.collide) {
    const p = Math.min(1, t / BUMP_MS), peak = 90 / BUMP_MS;
    const b = p < peak ? p / peak : 1 - (p - peak) / (1 - peak);
    const e = 0.25 * (1 - Math.pow(1 - Math.max(0, b), 2));
    return { x: from.x, y: from.y, ox: (to.x - from.x) * e, oy: (to.y - from.y) * e, done: p >= 1, hitAt: 90 };
  }
  const p = Math.min(1, t / (a.ms > 0 ? a.ms : PUSH_MS)), e = 1 - Math.pow(1 - p, 3); // ms = ถูกผลักไกล (Strium Ray)
  return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, ox: 0, oy: 0, done: p >= 1 };
}
function animFinal(a) {
  if (a.kind === "move") return a.path[a.path.length - 1];
  if (a.kind === "wheel") return a.at;
  if (a.kind === "fling") return a.to;
  if (a.kind === "lunge") return a.from;
  return a.collide ? a.from : a.to;
}
function validAnim(a) {
  if (!a || a.id == null) return false;
  if (a.kind === "move") return Array.isArray(a.path) && a.path.length > 0;
  if (a.kind === "push" || a.kind === "lunge" || a.kind === "fling") return !!(a.from && a.to);
  if (a.kind === "wheel") return !!a.at;
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
      scenes: new Map(),     // key → { scene, fore, marks } (เก็บไม่เกิน 6 — ห่วงเวลาซีโร่ 4 ระดับ + สนามเดิมที่ต้องกลับไป)
      rotTarget: null, turn: 0, turnFrom: 0, turnTo: 0, turnT0: 0, // มุมมอง (หน่วย 90° ต่อเนื่อง)
      hlRef: undefined, hl: prepareHighlights(null),
      anim: null,            // { obj, t0, startX, startY, done, hit }
      fxSeen: new Set(), fxRef: undefined, fxActive: [],
      hitT: new Map(),       // id → เวลาโดนตี (สั่น/แฟลช)
      grow: new Map(),       // id → { t0, from, to } กำลังเปลี่ยนขนาด (Echo ขยายร่าง)
      hover: null, hoverUnit: null, boxes: [], view: null, base: null, lastDraw: 0, lastT: 0,
      boards: new Map(),     // key → ชั้นกระดานอบแล้ว (เก็บไม่เกิน 6 — ปกติ/มุมใกล้ · ห่วงเวลาซีโร่ 4 ระดับ + สนามเดิม)
      // กล้อง: cam = { z, cx, cy } ตอนนี้ · zoomLv = prop zoom ล่าสุด · camAnim = เลื่อน/ซูมนุ่มๆ · pivot = จุดบนกระดานที่หมุนรอบ
      cam: { z: 1, cx: LW / 2, cy: LH / 2 }, zoomLv: null, camAnim: null, pivot: null,
      zoomAnchor: null, focusRef: undefined, keys: new Set(), drag: null, suppressClick: false,
      cinemaRef: null, cinemaBack: null, // กล้องฉากตี: ค่า prop ล่าสุด · กล้องก่อนเข้าฉาก (คืนค่าตอนจบ)
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
      // จำกัดเฟรม: ปกติ 60 · lowQ 30 — จอ 120/144Hz ไม่ต้องวาดทั้งกระดานใหม่เกินจำเป็น (วาดสดทุกชิ้นทุกเฟรม กิน CPU มาก)
      //  พัก (ฉากทึบบังกระดาน ดู boardPause.js): ไม่วาดเฟรม · หลังพักได้สักพัก (ฉากที่บังผ่านช่วงหนักตอนเริ่มไปแล้ว)
      //  ค่อยอบชั้นนิ่งของแผนที่ใหม่ไว้ล่วงหน้าเป็นระยะ — ตอนฉากเปิดเผยกระดานจะได้ไม่ต้องอบในเฟรมนั้น
      const paused = boardPaused();
      if (!paused) st.pausedAt = 0;
      else if (!st.pausedAt) st.pausedAt = now;
      if (paused && now - st.pausedAt < PAUSE_BAKE_AFTER) return;
      const minGap = paused ? 250 : lowQ ? 1000 / 30 : 1000 / 60;
      const gap = now - st.lastDraw;
      if (gap < minGap - 1) return;
      st.lastDraw = gap < minGap * 2 ? now - (gap % minGap) : now;

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
      // --- มุมกล้อง: มองจากด้านบน = 90° (ชั้นอบแยกตามมุม)
      const pitch = p.view === "top" ? PITCH_BIRD : PITCH_NORMAL;
      if (pitch !== st.pitch) {
        // เปลี่ยนมุมมอง: กล้องมุมใกล้คงจุดกลางบนกระดานไว้ (ตำแหน่งบนจอเปลี่ยนตามมุม)
        const was = st.pitch;
        st.pitch = pitch;
        if (was != null && st.cam.z > 1.001 && st.info) {
          setPitch(was); setCamera(st.info, st.turn);
          const b0 = computeView(st.size.w, st.size.h), gp = unproject(st.cam.cx, camEyeY(b0, st.cam.z, st.cam.cy));
          setPitch(pitch); setCamera(st.info, st.turn);
          if (gp) { const [sx, sy] = project(gp.x, gp.y); st.cam = { z: st.cam.z, ...camFromEye(b0, st.cam.z, sx, sy) }; st.camAnim = null; }
        }
      }
      setPitch(pitch);
      // --- กล้องมุมใกล้ (ซูม/เลื่อน) — คำนวณในพิกัดตรรกะของเฟรมปกติ
      setCamera(info, st.turn);
      const dt = Math.min(50, now - (st.lastT || now));
      st.lastT = now;
      const startAnim = (to, dur) => {
        if (lowQ) { st.cam = to; st.camAnim = null; return; }
        st.camAnim = { from: { ...st.cam }, to, t0: now, dur };
      };
      const focusPt = (f) => (f && Number.isFinite(f.x) && Number.isFinite(f.y) ? project(f.x + 0.5, f.y + 0.5) : null);
      const zl = clampZoom(p.zoom);
      // กล้องฉากตี: เข้า = จำกล้องเดิมแล้วซูมเข้ากลางคู่ที่ตีกัน · ออก = คืนกล้องเดิม (ระหว่างฉากไม่สนใจ focus/ซูม)
      const cin = p.cinema && p.cinema.a && p.cinema.b ? p.cinema : null;
      if (cin !== st.cinemaRef) {
        const was = st.cinemaRef;
        st.cinemaRef = cin;
        if (cin) {
          if (!was) st.cinemaBack = st.camAnim ? { ...st.camAnim.to } : { ...st.cam };
          const [ax, ay] = project(cin.a.x + 0.5, cin.a.y + 0.5), [bx, by] = project(cin.b.x + 0.5, cin.b.y + 0.5);
          const z = Math.max(1, cin.z || 2);
          startAnim(clampCam(info, base, { z, cx: (ax + bx) / 2, cy: (ay + by) / 2 - 18 / z }), CINEMA_MS);
        } else if (st.cinemaBack) {
          const back = zl === st.zoomLv ? st.cinemaBack : (zl ? { z: zoomKOf(pitch, zl), cx: st.cinemaBack.cx, cy: st.cinemaBack.cy } : { z: 1, cx: LW / 2, cy: LH / 2 });
          st.cinemaBack = null; st.zoomLv = zl;
          startAnim(clampCam(info, base, back), CINEMA_MS);
        }
      }
      if (st.cinemaRef) { st.focusRef = p.focus; }
      else if (zl && st.zoomLv === zl && st.zoomPitch !== pitch) {
        // สลับมุมมองระหว่างมุมใกล้: คงจุดกลางไว้ ปรับขนาดขยายตามมุมใหม่
        st.zoomPitch = pitch;
        startAnim(clampCam(info, base, { z: zoomKOf(pitch, zl), cx: st.cam.cx, cy: st.cam.cy }), ZOOM_MS);
      }
      else if (zl !== st.zoomLv) {
        const first = st.zoomLv === null;
        st.zoomLv = zl;
        st.zoomPitch = pitch;
        let to;
        if (zl) {
          const z1 = zoomKOf(pitch, zl), a = st.zoomAnchor && now - st.zoomAnchor.t < 800 ? st.zoomAnchor : null, fp = focusPt(p.focus);
          const from = st.camAnim ? st.camAnim.to : st.cam;
          if (a) {
            // ล้อเมาส์: จุดใต้เมาส์อยู่ที่เดิมบนจอ
            const r = from.z / z1;
            to = { z: z1, cx: a.lx - r * (a.lx - from.cx), cy: a.ly - r * (a.ly - from.cy) };
          } else if (from.z > 1.001) to = { z: z1, cx: from.cx, cy: from.cy }; // เปลี่ยนระดับระหว่างซูมอยู่ = คงจุดกลางเดิม
          else if (fp) to = { z: z1, ...camFromEye(base, z1, fp[0], fp[1]) };
          else to = { z: z1, cx: from.cx, cy: from.cy };
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
      //  ทุกระดับที่ซูมอยู่ใช้ชั้นอบความละเอียดเดียว (ของระดับสูงสุด) — เปลี่ยนระดับไม่ต้องอบใหม่
      const res = lowQ || !zl ? dpr : Math.round(Math.min(2, dpr * zoomKOf(pitch, ZOOM_STEPS - 1)) * 100) / 100;
      // --- ชั้นอบ: ฉาก (ตามแนวกระดาน ตั้ง/นอน) + กระดาน (ตามมุม)
      const tB0 = performance.now();
      const sceneOf = (turn) => {
        const par = normRot(turn) % 2, sk = `${info.area}|${info.cols}x${info.rows}|${w}x${h}|${res}|${night}|${lowQ}|${par}|${pitch}`;
        let sc = st.scenes.get(sk);
        if (!sc) {
          sc = bakeScene(info, base, res, night, lowQ, par);
          st.scenes.set(sk, sc);
          if (st.scenes.size > 6) st.scenes.delete(st.scenes.keys().next().value);
          if (turning) st.turnT0 = performance.now() - (now - st.turnT0); // ไม่นับเวลาอบเข้าไปในแอนิเมชัน
        }
        return sc;
      };
      const scTo = sceneOf(turning ? st.turnTo : st.turn);
      const scFrom = turning && normRot(st.turnFrom) % 2 !== normRot(st.turnTo) % 2 ? sceneOf(st.turnFrom) : null;
      let boardCv = null;
      if (!turning) {
        const bk = `${st.sig}|${w}x${h}|${res}|${night}|${normRot(st.turn)}|${pitch}`;
        boardCv = st.boards.get(bk);
        if (!boardCv) {
          boardCv = bakeBoard(info, base, res, night, normRot(st.turn));
          st.boards.set(bk, boardCv);
          if (st.boards.size > 6) st.boards.delete(st.boards.keys().next().value);
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
        if (pose.hitAt != null && !an.hit && now - an.t0 >= pose.hitAt) { an.hit = true; st.hitT.set(pose.hitId != null ? pose.hitId : an.obj.id, now); }
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
          if (f.kind === "beam") {
            item.beam = info ? prepareBeam(f, info.cols, info.rows) : null;
            if (!item.beam) continue;
            Object.assign(item, beamColors(f.color));
            item.beam.tiles.forEach((t, i) => {
              const hu = units.find((u) => onBody(u, t.x, t.y) && u.alive !== false);
              if (hu && (f.hitId == null || hu.id === f.hitId)) st.hitT.set(hu.id, now + item.beam.hits[i]); // hitId = ลำแสงตีปกติ สั่นเฉพาะเป้า
            });
          }
          if (f.kind === "quake") {
            item.quake = info ? prepareQuake(f, info.cols, info.rows) : null;
            if (!item.quake) continue;
            item.dur = item.quake.dur;
            item.quake.tiles.forEach((t, i) => {
              const hu = units.find((u) => onBody(u, t.x, t.y) && u.alive !== false);
              if (hu) st.hitT.set(hu.id, now + item.quake.hits[i]);
            });
          }
          if (f.kind === "slash" || f.kind === "burst") {
            const hitU = units.find((u) => onBody(u, f.x, f.y) && u.alive !== false);
            if (hitU) st.hitT.set(hitU.id, now);
            if (!item.rgb) item.rgb = f.color ? rgbString(f.color) : "255,255,255";
          }
          // ฟันมีดโซระ: เป้าสั่นตอนฟันแรก (ตอนนี้) + ฟันที่สอง (ดูด้านล่าง)
          if (f.kind === "mythSlash") {
            const hitU = units.find((u) => onBody(u, f.x, f.y) && u.alive !== false);
            if (hitU) { st.hitT.set(hitU.id, now); item.hitU = hitU.id; }
          }
          if (f.kind === "grow" && f.id != null) st.grow.set(f.id, { t0: now, from: f.from | 0, to: f.to | 0 });
          // ปะทะที่บอกเป้าเอง (ไรโด ฮิคารุ hkHit: ทุกคนที่โดนในแนว) = สั่น/แฟลชพร้อมกัน
          if (Array.isArray(f.hitIds)) for (const id of f.hitIds) st.hitT.set(id, now + (f.hitDelay | 0));
          // ลำแสงท่าไม้ตายฮิคารุ: คนในช่องที่ลำแสงวิ่งถึงสั่นตามจังหวะ
          if ((f.kind === "hkCross" || f.kind === "hkStriumRay") && Array.isArray(f.tiles)) {
            for (const t of f.tiles) {
              const hu = units.find((u) => onBody(u, t.x, t.y) && u.alive !== false && u.id !== f.id);
              if (hu) st.hitT.set(hu.id, now + hkBeamHitMs(f, t));
            }
          }
          if (f.kind === "smash") item.dur = smashDur(f.tiles);
          st.fxActive.push(item);
        }
        if (st.fxSeen.size > 400) st.fxSeen = new Set([...st.fxSeen].slice(-200));
      }
      st.fxActive = st.fxActive.filter((f) => now - f.t0 < (f.dur || FX_DUR[f.kind] || 1000));
      for (const f of st.fxActive) if (f.hitU != null && !f.hit2 && now - f.t0 >= SORA_T.slash2) { f.hit2 = true; st.hitT.set(f.hitU, now); }

      // --- ตัวละครพร้อมวาด
      const targeting = hl.skill.size > 0 || hl.aoe.size > 0;
      const hov = st.hover;
      const list = [];
      for (const u of units) {
        if (!u || u.alive === false || !Number.isFinite(u.x) || !Number.isFinite(u.y)) continue;
        let rx = u.x, ry = u.y, ox = 0, oy = 0, hz = 0, sq = 0;
        if (an && !an.invalid && !an.missing && an.obj.id === u.id) {
          if (!an.done && pose) { rx = pose.x; ry = pose.y; ox = pose.ox; oy = pose.oy; hz = pose.hz || 0; sq = pose.sq || 0; }
          else {
            // จบแล้วแต่ state ยังไม่อัปเดต → ค้างที่ปลายทาง (กันเด้งกลับที่เดิม)
            const fin = animFinal(an.obj);
            if ((u.x === an.startX && u.y === an.startY) || (u.x === fin.x && u.y === fin.y)) { rx = fin.x; ry = fin.y; }
          }
        }
        const k = key(u.x, u.y), us = Math.max(1, u.size | 0);
        // ตัวใหญ่: ช่องไหนของตัวอยู่ในไฮไลต์ก็นับ
        const any = (set) => { if (us <= 1) return set.has(k); for (let dy = 0; dy < us; dy++) for (let dx = 0; dx < us; dx++) if (set.has(key(u.x + dx, u.y + dy))) return true; return false; };
        let reticle = null, alpha = u.alpha == null ? 1 : u.alpha;
        if (u.cloak) alpha *= lowQ || reducedMotion() ? 0.45 : 0.45 + 0.06 * Math.sin(now / 420);
        if (!u.isMe && !u.isActor) {
          if (any(hl.aoe)) reticle = "aoe";
          else if (any(hl.skill)) reticle = "skill";
          else if (any(hl.attack) || (hl.target && hl.target.x === u.x && hl.target.y === u.y)) reticle = "attack";
          else if (targeting) alpha *= 0.5;
        }
        list.push({
          id: u.id, rx, ry, ox, oy, hz, sq, color: normColor(u.color), img: u.img, name: u.name,
          hp: u.hp, maxHp: u.maxHp, armor: u.armor, maxArmor: u.maxArmor,
          isMe: !!u.isMe, isActor: !!u.isActor, tag: u.tag, reticle, alpha, cloak: !!u.cloak && !lowQ,
          hitT: st.hitT.get(u.id) || 0,
          size: us, art: u.art || null, face: u.face || null,
          grow: (() => { const gr = st.grow.get(u.id); if (gr && now - gr.t0 > GROW_MS) { st.grow.delete(u.id); return null; } return gr || null; })(),
          hovered: !!hov && st.hoverUnit === u.id,
        });
      }

      // --- ฉากห่วงเวลาซีโร่: seq ใหม่ = จับภาพเฟรมล่าสุด (สนามก่อนเปลี่ยน) ไว้ก่อนวาดเฟรมใหม่
      const zsP = p.zeroScene && p.zeroScene.seq != null ? p.zeroScene : null;
      if (zsP && zsP.seq !== st.zsSeq) {
        st.zsSeq = zsP.seq;
        const snap = document.createElement("canvas");
        snap.width = cv.width; snap.height = cv.height;
        if (cv.width > 1 && cv.height > 1) snap.getContext("2d").drawImage(cv, 0, 0);
        st.zs = { mode: zsP.mode, stage: zsP.stage || 1, seal: zsP.seal | 0, t0: now, snap, shards: null };
      }
      const zs = st.zs && now - st.zs.t0 < (ZERO_SCENE_MS[st.zs.mode] || 0) ? st.zs : null;
      if (!zs && st.zs) st.zs = null;
      const zeroAnim = zs && zs.mode === "enter" ? enterAnim(now - zs.t0) : null;

      if (paused) return;
      // จอสั่นของ Ice Spike: เลื่อนภาพทั้งเฟรม (ไม่กระทบการเลือกช่อง — st.view ยังเป็นมุมจริง)
      const shk = iceShakeOffset(st.fxActive, now, lowQ);
      //  ขยาย 3% รอบกลางจอระหว่างสั่น — ขอบภาพไม่โผล่
      const dView = shk ? { ...view, k: view.k * 1.03, ox: w / 2 + (view.ox - w / 2) * 1.03 + shk[0] * view.k, oy: h / 2 + (view.oy - h / 2) * 1.03 + shk[1] * view.k } : view;
      const frame = (target) => drawFrame(target, {
        info, view: dView, dpr, bake, ice: p.ice || null, turn: st.turn, night, lowQ, units: list, hl,
        shopPos: p.shopPos || null, shopLabel: p.shopLabel, hover: hov, fx: st.fxActive,
        zero: p.zero || null, zeroAnim, hitT: st.hitT,
      }, now);
      if (!zs) st.boxes = frame(g);
      else {
        // เฟรมใหม่วาดลงชั้นแยก แล้วประกอบกับภาพนิ่งของสนามเดิมตามจังหวะฉาก
        if (!st.zbuf) st.zbuf = document.createElement("canvas");
        const zb = st.zbuf;
        if (zb.width !== cv.width || zb.height !== cv.height) { zb.width = cv.width; zb.height = cv.height; }
        st.boxes = frame(zb.getContext("2d"));
        drawZeroScene(g, zs, zb, view, dpr, info, lowQ, now);
      }
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
      const cur = clampZoom(pp.zoom);
      const want = clampZoom(cur + (e.deltaY < 0 ? 1 : -1));
      if (want === cur) return;
      const tNow = performance.now();
      if (st.wheelAt && tNow - st.wheelAt < ZOOM_WHEEL_GAP) return;
      st.wheelAt = tNow;
      if (want > 0 && st.view) {
        const r = cv.getBoundingClientRect(), [lx, ly] = toLogical(st.view, e.clientX - r.left, e.clientY - r.top);
        st.zoomAnchor = { lx, ly, t: performance.now() };
      }
      cb(want);
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });
    // ปุ่มลูกศร = เลื่อนกล้อง (มุมใกล้เท่านั้น · ค้างไว้ = เลื่อนต่อเนื่อง)
    const typing = (e) => e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    const onKeyDown = (e) => {
      if (!ARROWS[e.code] || !(clampZoom(propsRef.current.zoom) > 0) || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
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
    // ห่วงเวลาซีโร่: กดที่ตัวผนึก (ลอยเหนือแท่น) = ช่องของผนึกนั้น
    const zp = propsRef.current.zero;
    if (!unit && zp && Array.isArray(zp.seals)) {
      for (const sl of zp.seals) {
        if (sl.broken) continue;
        const [sx, sy, s] = projectZ(sl.x + 0.5, sl.y + 0.5, SEAL_Z);
        if (Math.hypot(lx - sx, ly - sy) < s * 1.1) { tile = { x: sl.x, y: sl.y }; break; }
      }
    }
    if (tile) {
      // กล่องรูปตัวหมากสูงทับ 1–2 ช่องด้านหลัง: คนที่ยืนบนช่องใต้เมาส์ชนะเสมอ ·
      //  ช่องว่างที่กดได้ (เดิน/สกิล/ตีหมู่) ชนะกล่องของตัวที่ยืนช่องอื่น — ไม่งั้นเดินถอยไปทางหลังตัวเองไม่ได้
      const onTile = units.find((u) => u.alive !== false && onBody(u, tile.x, tile.y)) || null;
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
    if (!(clampZoom(propsRef.current.zoom) > 0) || e.button > 2) return;
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
    cvRef.current.style.cursor = hot && (p.onTileClick || p.onUnitClick) ? "pointer" : clampZoom(p.zoom) > 0 ? "grab" : "default";
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
        style={{ display: "block", width: "100%", height: "100%", touchAction: clampZoom(props.zoom) > 0 ? "none" : "manipulation" }}
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
