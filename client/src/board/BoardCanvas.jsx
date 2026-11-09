// ============================================================
//  BoardCanvas — กระดานเดินได้แบบ Fire Emblem (คอมโพเนนต์แสดงผลล้วน ไม่รู้กติกาเกม)
//  ตัววาดอยู่ใน boardDraw.js · หน้าดูตัวอย่าง: ?board=1 (BoardPreview.jsx)
//
//  props
//   map         { area, cols, rows, terrain: { "x,y": "tree"|"pillar"|"banner"|"hedge"|… }, heal: ["x,y"…], spawns: [{x,y}], shopSpots }
//               (= state.board · heal รับได้ทั้ง array ของ "x,y" / [x,y] / {x,y} และ Set · ชนิดสิ่งกีดขวางที่ไม่รู้จัก = ก้อนหิน)
//   units       [{ id, x, y, img, color, name, hp, maxHp, armor, maxArmor, isMe, isActor, teamId, tag, alive?, alpha?, cloak? }]
//               aura = "kira" → หมอกดำแดงรอบตัว (กิระร่างราชาแมลงอวกาศ — boardDraw kiraAura)
//               yuki = { left, at } → ยูกินับถอยหลังเกิดใหม่เป็นประตู: ออร่าฟ้า-ขาวไหลเข้าตัว + ตัวเลข · กระดานมืดลง (yukiFx.js)
//               cloak = ซ่อนจากศัตรูอยู่ (เราเห็นเพราะเป็นตัวเอง/ทีมเดียวกัน) → วาดจางแบบเงา + แถบแสงพาดช้าๆ
//               wings = เคทยืนในม่านแดงของตัวเอง → ปีกเขม่ากางค้างหลังหมาก (shadowFx.js drawIdleWings) · fx ke* ย้ายหมากเองได้ (shadowPose)
//               masked = ผู้ชมติด "มืดบอด" → หมากขาวล้วน ไม่มีรูป/ชื่อ/แถบเลือด · corpse = ร่างล้มของระบบคู่ (เงาราบบนช่อง)
//               tag = ป้ายเหนือหัว: "18" / "พอ" / "แตก" (แตก = ป้ายแดง) หรือ { text, bust, backs } · alive === false = ไม่วาด
//   highlights  { move, attack, skill, aoe, danger: ["x,y"…], path: [{x,y}…], target?: {x,y}, push?: { from, to, collide } } — ไม่ใส่ได้ทุกช่อง
//   shops       state.shops | null — ร้านบนกระดาน [{ id, kind, x, y, size, turnsLeft }] (2×2 · ป้าย "🏪 N" วาดในแคนวาส)
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
//   map.special { "x,y": "flowers"|"forest"|"thorns"|"shallow"|"whirl"|"quicksand"|"ice"|"lava"|"power" } · map.flow { "x,y": "up"|"down"|"left"|"right" }
//   anim        { kind: "move", id, path, stepMs? (ms ต่อช่อง — ไม่ใส่ = STEP_MS) } | { kind: "push", id, from, to, collide }
//               | { kind: "lunge", id, from, to, hitId } (ง้าง → พุ่งเข้าหาเป้า → กลับที่เดิม · จังหวะชน = เป้า hitId สั่น)
//               | { kind: "wheel", id, at, ms, dir } (โซระวิ่งในกรงจักร: ยืนที่ at เด้งถี่ขึ้นเรื่อยๆ ms มิลลิวินาที)
//               | { kind: "fling", id, from, to, ms? } (ถูกเหวี่ยงลอยโค้งไปตกที่ to — ไกลได้หลายช่อง · ลงพื้น = สั่น)
//               — เปลี่ยนอ็อบเจกต์ = เล่นใหม่ · จบแล้วเรียก onAnimDone()
//   glides      { [id]: { key, path, stepMs } } — เดินตามเส้นทางพร้อมกันได้หลายตัว (ช่วง Clock Up) · key ใหม่ = เล่นใหม่ · ไม่เรียก onAnimDone
//   fx          [{ key, kind: "slash"|"burst"|"float", x, y, text?, color?, size? }] — เอฟเฟกต์ครั้งเดียว เล่นเมื่อเห็น key ใหม่
//               | { key, kind: "beam", x, y (ช่องคนยิง), dir: "up"|"down"|"left"|"right", len, color } — ลำแสง Beam Magnum
//                 เริ่มช่องติดคนยิงยาว len ช่อง (ตัดที่ขอบกระดาน) · ตัวที่ยืนในแนวสั่นตอนลำแสงถึง · tone: "blue" = ปืนโซระ
//               | โซระ: "mythSlash" (ฟันมีด 2 ครั้ง — เป้าสั่น 2 จังหวะ) · "soraWheel" · "soraDash" · "soraBoom" (ดู boardDraw.js · dur = ระยะเล่นถ้าส่งมา)
//   cinema      { a: {x,y}, b: {x,y}, z } | null — กล้องฉากตี: ซูมเข้ากลางระหว่างสองช่อง (z เท่า) · กลับเป็น null = คืนกล้องเดิม
//               ระหว่างนี้ไม่สนใจ focus/ซูม (จำค่าซูมล่าสุดไว้ใช้ตอนคืน)
//   onTileClick(x, y) · onUnitClick(id) (ไม่ส่งมา = เรียก onTileClick ที่ช่องของตัวนั้นแทน) · onHoverTile(x|null, y|null)
//   ice         Ice Spike: { lv: { "x,y": Lv ที่แสดงแทน terrain (0 = ซ่อน) } } | null (ดู iceFx.js)
//               fx ของ Ice Spike: ice* (iceFx.js) · iceShake { amp } = จอสั่นแบบเลื่อนกล้อง (แรงตาม amp · lowQ/ลดการเคลื่อนไหว = ไม่สั่น)
//   zero        state.zero (ห่วงเวลาซีโร่: { stage, seals, pickups }) — ผนึก/โซ่/ของฟื้นพลังชีวิตบนสนาม area 8–11
//   zeroScene   { seq, mode: "enter"|"break"|"release", stage, seal } | null — seq ใหม่ = เล่นฉากเปลี่ยนผ่าน:
//               จับภาพเฟรมล่าสุดไว้ (สนามเดิม) แล้วเผยเฟรมใหม่ใต้คลื่น (เข้า/เปลี่ยนเฟส) หรือแตกเป็นเศษกระจก (ปลดผนึก) — zeroTheme.js
//   songs       [{ kind: "delete"|"smile"|"idol", x, y, r }] — วงเพลงของยูนะบนพื้น (yunaFx.js drawYunaZones)
//               units[].rider = { img, color, name } → ตัวที่ขี่อยู่บนหลัง (ขี่ผู้เล่นอื่น — server/ride.js)
//   grays       [{ id, x, y, size, dir, left, tiles }] — เกรย์กำลังชาร์จรองโกมิเนียต: สนามมืด + แนวลำแสงทอง + หอกลอยเหนือหัว (grayFx.js)
//               fx ของเกรย์: gray* (grayFx.js — ท่าตีปกติ · keeper/grave/reap · grayBeam = ลำแสงรองโกมิเนียต)
//   gils        [{ id, x, y, size, ea, storm, warns, weapons, charge }] — กิลกาเมช: พายุ/ช่องที่สายฟ้าเล็ง/อาวุธที่ปักค้าง/แนว Enuma Elish/วิมานะ/ดาบ EA (gilFx.js)
//               fx ของกิลกาเมช: gil* (gilFx.js — socket "gilFx" · ท่าตีปกติ gilEa)
//   ferns       [{ id, x, y, size, empowered, boost }] — เฟิร์นที่ Zoltraak ครั้งที่ 6 พร้อม / เพิ่มระยะรออยู่: แสงที่ปลายคทา (fernFx.js)
//               fx ของเฟิร์น: fern* (fernFx.js — fernZoltraak / fernZoltraakMax ตีปกติ · เหตุการณ์ socket "fernFx")
//   gyroBalls   [{ owner, color, x, y, seq }] — ลูกเหล็กของไจโรบนพื้น (หมุนตลอด + วงสีเจ้าของ · gyroFx.js gyroBallItems)
//               units[].gyro = { mounted, empowered, horseHp } — ม้าใต้หมาก / ออร่าทอง · fx gyro* ย้ายหมากเองได้ (gyroPose)
//   diego       { oil: [{x,y}], fire: [{x,y,left}], ash: [{x,y}], nets: [{x,y,color}] } | null — ชั้นพื้นของดิเอโก้ แบรนโด (diegoFx.js)
//               units[].diego = { mounted, horseHp } — ซิลเวอร์ บูลเล็ตใต้หมาก · units[].dstat = { soaked, netted } — หยดน้ำมัน/ลวดรัดตัว
//               fx diego* ย้ายหมากเองได้ (diegoPose — ถูกตาข่ายดึง · ควบกลอุบาย · กระเด็น)
//   timeFreeze  { by } | null — หยุดเวลาอยู่ (state.timeFreeze): กระดานซีเปีย ยกเว้นหมากของ by + นาฬิกาเดินติ๊ก (diegoTimeLayer)
//   celine      { flora: [{ x, y, left, made }], kings: [{ id, x, y, size }], hold: [{ x, y }], preview: { tiles, orient, ok } } | null
//               — พุ่มดอกไม้ / ราชาดอกไม้ / กำแพงที่ค้างไว้ถึงจังหวะปะทะ / พรีวิวกำแพงตอนเลือกช่อง (celineFx.js) · fx celine* · celinePose ย้ายหมากตอนสลับตำแหน่ง
//   takutos     [{ id, x, y, size, emerald, sapphire, judgment, collapse }] — ทาวเบิร์นของทาคุโตะ: ดาบลอยข้างตัว / ดาบแห่งการพิพากษาพาดหลัง / ออร่าแดงช่วงพังทลาย
//               (takutoFx.js) · fx takuto* · takutoPose ย้ายหมากตอนพุ่ง/สลับตำแหน่ง
//   emiya       { ubw, units: [{ id, weapon }] } | null — เอมิยะ ชิโร่: โลก Unlimited Blade Works · อาวุธที่ถือ (emiyaFx.js) · fx emiya*
//   otoya       { night: bool, links: [{ from, to }] } | null — คุเรไน โอโตยะ: ฟ้าจันทร์แดง (Wake Up 1) · สายโน้ตดนตรีในหัวใจ (otoyaFx.js) · units[].otoya = ผลค้างบนตัว
//   ryougi      { units: [{ id, eyes, mind, bloom }], blood: [{ x, y, size, id }] } | null — ผู้นำแห่งตระกูลเรียวกิ: เนตรมณะ (มืดจาง + รอยร้าวแดง) /
//               ใบมีดที่มือ / ซากุระทั่วกระดาน · กองเลือด (ryougiFx.js) · map.terrain "chasm" = ช่องพัง · fx ryougi* · ryougiPose ย้ายหมากตอนตี/พุ่ง/ถูกเหวี่ยง
//               units[].ryougiSlain + corpse = ศพที่ถูกเรียวกิสังหาร วาดเป็นกองเลือด
//   law         { rooms, objects, marks, hearts, armed, rocks } | null — ทราฟาก้า ลอว์: Room (โดมเยื่อฟ้า · seq ใหม่ = ฉากกาง) / วัตถุลอย / ตัวที่ถูกมาร์ก = ร่างแยกชิ้นลอย (หมากวาดแบบ lawCut) /
//               หัวใจ (เหนือหัวเหยื่อ + ลอยข้างลอว์) / ท่าไม้ตายที่รอตี · rocks = ["x,y"] terrain "icewall" ที่วาดเป็นหนามหิน (lawFx.js) · fx law*
//   valentine   state.board.valentine { flags: [{ x, y, ownerId }] } | null — ธงปักของฟันนี่ วาเลนไทน์ (valentineFx.js · โบกตลอด)
//               units[].ghostDim = อยู่คนละชั้นมิติกับเรา (ภาพโปร่งภาพเดียว · กดไม่ได้) · units[].summon = { kind: "clone"|"double" } (ตัวเหมือน = ตะเข็บ)
//               fx val* ซ่อน/ตัด/บีบ/เจาะรูหมากเอง (valentineMod) · ตัวเหมือนวิ่ง (valentinePose)
//   dimView     "par" | "veil" | null — ชั้นมิติของตัวที่เราคุม: โลกคู่ขนาน / มองจากมิติหลบสายตา (ค่อยๆ เปลี่ยน 600ms)
//   storms      state.board.storms [{ x0, y0, x1, y1, owner, left }] — ม่านแดง (ระบำเขม่า · เคท) วาดค้าง/กลืนพื้นที่/จางหาย — sootStorm.js
//   colony      state.colony (สนาม Colony — map.wrap) → ฉาก 3D (colony3d.js) ใต้แคนวาสนี้ + ตัวฉายภาพทรงกระบอก (boardGeo.setCustomProjection)
//               กล้อง 3D แทนกล้องเอียง: rotation = หมุน 90° · zoom = ระยะ · view "top" = ก้มสุด · focus = ตามตัวเมื่อหลุดจอ · ลากซ้าย = หมุนรอบ 360°/ก้มเงย · ลากขวา/Shift/ลูกศร = เลื่อน · ล้อ = ซูม · Space = กลับที่ตัวเรา
//   onColonyAway(bool)  กล้อง Colony ออกห่างจากตัวเรา (อิสระ/หมากหลุดจอ) เปลี่ยน → แจ้ง (ปุ่มกลับที่หมาก)
//   colonyHome  ตัวเลขใดๆ — เปลี่ยนค่า = กล้อง Colony กลับมาที่ตัวเรา (ปุ่มเป้าใน BoardStage)
//   colonyEvents [{ key, kind, data }] — boardFx ของ Colony (colonyScene/colonySeal/colonyBoom/colonyJump/colonyLift) เล่นเมื่อเห็น key ใหม่
//  ขนาด: เต็มกล่องแม่ (ResizeObserver) · devicePixelRatio สูงสุด 2 (lowQ = 1)
//  พิกัด DOM ↔ กระดาน ภายนอก: tileCenter(x, y, z) (ตรรกะ ณ กล้องที่วาดล่าสุด) → computeView(w, h, cam) — cam อยู่ภายในคอมโพเนนต์นี้
//   ป้ายที่ต้องเกาะช่องให้วาดในแคนวาสแทน (เช่นป้ายร้าน)
// ============================================================
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  bakeBoard, bakeScene, beamColors, camEyeY, camFromEye, clampCam, computeView, drawFrame, FX_DUR, GROW_MS, inCamView, key, LH, LW, smashDur,
  mapSignature, normColor, normRot, pickTile, prepareBeam, prepareDarkWave, prepareQuake, prepareHighlights, prepareMap, project, reducedMotion, rgbString,
  setCamera, SORA_T, toLogical, unproject, ZOOM_LEVELS, ZOOM_STEPS, clampZoom, clampCamRts, rtsZoomRange, rtsZoomOf,
} from "./boardDraw";
import { boardPaused } from "./boardPause";
import { hkBeamHitMs } from "./hikaruFx";
import { iceShakeOffset } from "./iceFx";
import { shadowPose } from "./shadowFx";
import { GYRO_RIDE_Z, gyroPose } from "./gyroFx";
import { DIEGO_RIDE_Z, diegoPose } from "./diegoFx";
import { dioPose } from "./dioFx";
import { OT_RIDE_Z, otRides } from "./optimusFx";
import { GIO_TREE_Z, gioLifted, gioPose } from "./giornoFx";
import { valentineMod, valentinePose } from "./valentineFx";
import { celinePose } from "./celineFx";
import { takutoPose } from "./takutoFx";
import { ryougiPose } from "./ryougiFx";
import { stormShakeOffset, syncStorms } from "./sootStorm";
import {
  easeInOut, enterAnim, makeShards, drawShards, segT, SEAL_Z, ZERO_SCENE_MS, zeroAccent, zeroBeam, zeroCracks, zeroWavePath, zeroWaveRing,
} from "./zeroTheme";
// มุมมองของมิติ (วาเลนไทน์): dimView เปลี่ยน = ค่อยๆ เปลี่ยน · ฉากพาข้ามโลก/กลับโลกหลักกำลังเล่น = รอจังหวะในฉาก
const DIM_FADE = 600;
function dimLayersOf(st, kind, now) {
  const want = kind === "par" || kind === "veil" ? kind : null;
  if (!st.dimV) st.dimV = { kind: want, t0: -1e9, prev: null };
  const d = st.dimV;
  if (d.kind !== want) {
    let t0 = now;
    for (const e of st.fxActive || []) {
      if (e.kind === "valParallel" && want === "par" && now - e.t0 < 1800) t0 = Math.max(t0, e.t0 + 1150);
      if (e.kind === "valDimOut" && d.kind === "par" && now - e.t0 < 900) t0 = Math.max(t0, e.t0 + 300);
      if (e.kind === "valVeilIn" && want === "veil" && now - e.t0 < 1100) t0 = Math.max(t0, e.t0 + 560);
    }
    st.dimV = { kind: want, t0, prev: d.kind, prevK: d.kind ? Math.min(1, Math.max(0, (now - d.t0) / DIM_FADE)) : 0 };
  }
  const c = st.dimV, k = Math.min(1, Math.max(0, (now - c.t0) / DIM_FADE)), out = [];
  if (c.prev && k < 1) out.push({ kind: c.prev, k: c.prevK * (1 - Math.min(1, Math.max(0, (now - Math.min(c.t0, now)) / DIM_FADE))) });
  if (c.kind) out.push({ kind: c.kind, k });
  return out.length ? out : null;
}
// ช่อง (x, y) อยู่ในตัวของ u ไหม (ตัวใหญ่ = size × size ช่อง นับจากมุมบนซ้าย)
const onBody = (u, x, y) => x >= u.x && x < u.x + Math.max(1, u.size | 0) && y >= u.y && y < u.y + Math.max(1, u.size | 0);
import { P as projectZ, PITCH_BIRD, PITCH_LOW, PITCH_NORMAL, setPitch, setCustomProjection, customProjection } from "./boardGeo";
import { createColonyView } from "./colony3d";
import { setEosFast } from "./fodlan/stage6";

// ผนึก 4 มุม (ตรงกับ server/board.js ZERO_SEALS) — จุดเริ่มคลื่น/รอยร้าวของฉากห่วงเวลาซีโร่
const ZERO_CORNERS = [[0, 0], [13, 0], [13, 13], [0, 13]];

const BUSY_HOLD = 600; // หลังมีอะไรขยับ วาด 60 เฟรมต่ออีกเท่านี้ (ms) ก่อนลดเหลือ 30 ตอนกระดานนิ่ง
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
const YAW_SPEED = 0.55;  // RTS: ค้าง Q/E หมุน (รอบละ 90° ต่อวินาที × ค่านี้)
const RTS_SHARP_MS = 140; // RTS: กล้องนิ่งนานเท่านี้ (ms) แล้วอบชั้นพื้นใหม่ให้คมเท่าจอ
const RTS_BASE_Z = 0.62; // RTS: เฟรมอบกว้างกว่าจอ (ซูมออก) — ดู base ในลูปวาด
const EDGE_PX = 22;    // RTS (สนาม Eos): เมาส์ห่างขอบแคนวาสไม่เกินนี้ = เลื่อนกล้อง
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
  const glRef = useRef(null); // สนาม Colony: แคนวาส WebGL ใต้ชั้น 2D
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
      glides: new Map(),     // id → { key, t0 } เดินคู่ขนาน (ช่วง Clock Up — prop glides)
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
      // กระดานนิ่ง (มีแค่ของขยับเบาๆ — ต้นไม้/น้ำ/ไฮไลต์กะพริบ) = 30 เฟรม · มีอะไรเกิดขึ้น = 60 เฟรมทันที แล้วค้างไว้อีก BUSY_HOLD
      //  (ผู้ใช้ 2026-11-09 "เกมกระตุกตลอดเวลา": วาดทั้งกระดานใหม่ทุกเฟรมแม้ไม่มีอะไรเปลี่ยน — ลดงานครึ่งหนึ่งในเวลาส่วนใหญ่ของเกม)
      const hovKey = st.hover ? `${st.hover.x},${st.hover.y}` : "";
      const busyNow = p !== st.busyProps || hovKey !== st.busyHov || !!st.camAnim || !!st.drag || st.keys.size > 0
        || st.fxActive.length > 0 || (st.anim && !st.anim.done) || st.turnFrom !== st.turnTo || !!p.cinema || !!(p.glides && Object.keys(p.glides).length);
      st.busyProps = p; st.busyHov = hovKey;
      if (busyNow) st.busyUntil = now + BUSY_HOLD;
      const idle = now > (st.busyUntil || 0);
      if (import.meta.env.DEV) window.__boardIdle = idle; // dev: ตรวจว่ากระดานเข้าโหมดนิ่งได้จริง
      const minGap = paused ? 250 : lowQ || idle ? 1000 / 30 : 1000 / 60;
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
      // --- สนาม Colony: ฉาก 3D + ตัวฉายภาพทรงกระบอก (ไม่ใช่ Colony = คืนกล้องเอียงปกติ)
      const colony = !!(p.colony && p.map && p.map.wrap);
      if (colony && !st.cv3 && glRef.current) { try { st.cv3 = createColonyView(glRef.current, { lowQ }); } catch (err) { console.error("colony3d", err); st.cv3 = null; } }
      if (import.meta.env.DEV && st.cv3) window.__colony3d = st.cv3; // dev (เฉพาะแคนวาสที่เป็น Colony — แคนวาสอื่นในหน้าไม่ทับเป็น null): เรียกฉากซ้ำจาก console (__colony3d.onEvent("colonyBoom", { dead: [] }))
      if (!colony && st.cv3) { st.cv3.dispose(); st.cv3 = null; }
      if (!st.cv3 && customProjection()) setCustomProjection(null);
      if (glRef.current) glRef.current.style.display = st.cv3 ? "block" : "none";
      // --- ขนาด + ชั้นนิ่ง
      const dpr = Math.min(lowQ ? 1 : 2, window.devicePixelRatio || 1);
      const { w, h } = st.size;
      const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
      if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
      // เฟรมปกติ (ชั้นอบใช้อันนี้เสมอ) · กล้อง RTS (สนาม Eos): ถอยเฟรมออก (z 0.62) ให้ชั้นอบครอบเลยขอบกระดาน — ยืนชิดขอบแผนที่แล้วตัวเรายังอยู่กลางจอได้
      const base = p.rts && !st.cv3 ? computeView(w, h, { z: RTS_BASE_Z, cx: LW / 2, cy: LH / 2 }) : computeView(w, h);
      st.base = base;
      // --- มุมมอง (หมุนนุ่มๆ ไปทางที่สั้นกว่า)
      const target = st.cv3 ? 0 : normRot(p.rotation); // Colony: หมุนมุมมองด้วยกล้อง 3D แทน
      if (st.rotTarget === null) { st.rotTarget = target; st.turn = st.turnFrom = st.turnTo = target; }
      else if (target !== st.rotTarget) {
        // มุมใกล้: จำจุดบนกระดานที่อยู่กลางส่วนที่มองเห็น แล้วหมุนรอบจุดนั้น
        if (st.cam.z > 1.001) {
          if (st.camAnim) { st.cam = st.camAnim.to; st.camAnim = null; }
          setCamera(info, st.turn);
          const gp = unproject(st.cam.cx, camEyeY(base, st.cam.z, st.cam.cy));
          const cl = (v, hi) => Math.max(0, Math.min(hi, v));
          st.pivot = gp ? { x: cl(gp.x, info.cols), y: cl(gp.y, info.rows) } : { x: info.cols / 2, y: info.rows / 2 };
          // กล้อง RTS (สนาม Eos — ผู้ใช้สั่ง 2026-11-09): Q/E หมุนรอบตัวหมากของเรา ไม่ใช่รอบกลางจอ (p.selfPos)
          if (p.rts && p.selfPos && Number.isFinite(p.selfPos.x)) st.pivot = { x: p.selfPos.x + 0.5, y: p.selfPos.y + 0.5 };
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
      // กล้อง RTS (สนาม Eos — ผู้ใช้สั่ง 2026-11-09): ค้าง Q/E = หมุนนุ่มต่อเนื่องทุกองศารอบตัวเรา (ไม่กระตุกทีละ 90°)
      const yawDt = st.yawT ? Math.min(50, now - st.yawT) : 0;
      st.yawT = st.yaw ? now : 0;
      if (p.rts && !st.cv3 && st.yaw && !turning) {
        st.turn = (((st.turn + st.yaw * YAW_SPEED * yawDt / 1000) % 4) + 4) % 4;
        st.turnFrom = st.turnTo = st.turn;
        turning = true; // วาดสด (ไม่อบ) ระหว่างหมุน
        if (p.selfPos && Number.isFinite(p.selfPos.x)) st.pivot = { x: p.selfPos.x + 0.5, y: p.selfPos.y + 0.5 };
        st.yawMoved = true;
      } else if (st.yawMoved && !st.yaw) {
        // ปล่อยปุ่ม: บอก BoardStage ทิศที่ใกล้สุด (WASD ตามมุมกล้อง) โดยไม่ให้เกิดแอนิเมชันหมุน 90°
        st.yawMoved = false;
        st.rotTarget = normRot(Math.round(st.turn));
        if (typeof p.onYawSettle === "function") p.onYawSettle(st.rotTarget);
      }
      // --- มุมกล้อง: มองจากด้านบน = 90° (ชั้นอบแยกตามมุม)
      const pitch = p.view === "top" && !st.cv3 ? PITCH_BIRD : p.rts && !st.cv3 ? PITCH_LOW : PITCH_NORMAL;
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
      const zl = st.cv3 ? 0 : clampZoom(p.zoom); // Colony: ซูมด้วยกล้อง 3D (กล้อง 2D อยู่กับที่)
      // กล้อง RTS ของแผนที่ใหญ่ (p.rts — สนาม Eos · GRID_PLAN §8.6): จออยู่ในแผนที่ตลอด (ไม่เห็นขอบ) · ซูมต่อเนื่อง · ลาก/ชิดขอบจอ/ลูกศร = เลื่อนได้ทุกระดับ
      const rts = !!p.rts && !st.cv3;
      const rr = rts ? rtsZoomRange(info, base, pitch === PITCH_BIRD) : null;
      st.rts = rts; st.rtsRange = rr;
      const cc = (cam) => (rts ? clampCamRts(info, base, cam, rr) : clampCam(info, base, cam));
      const zk = (lv) => (rts ? rtsZoomOf(rr, lv) : zoomKOf(pitch, lv));
      // จุดบนจอ (sx, sy) → กลางกล้อง: RTS = กลางจอจริง (เผื่อ HUD ล่างเล็กน้อย) · ปกติ = กลางส่วนที่มองเห็นเหนือ HUD
      const eyeTo = (z, sx, sy) => (rts ? { cx: sx, cy: sy + 50 / (z * RTS_BASE_Z) } : camFromEye(base, z, sx, sy));
      // กล้องฉากตี: เข้า = จำกล้องเดิมแล้วซูมเข้ากลางคู่ที่ตีกัน · ออก = คืนกล้องเดิม (ระหว่างฉากไม่สนใจ focus/ซูม)
      const cin = !st.cv3 && p.cinema && p.cinema.a && p.cinema.b ? p.cinema : null;
      if (cin !== st.cinemaRef) {
        const was = st.cinemaRef;
        st.cinemaRef = cin;
        if (cin) {
          if (!was) st.cinemaBack = st.camAnim ? { ...st.camAnim.to } : { ...st.cam };
          const [ax, ay] = project(cin.a.x + 0.5, cin.a.y + 0.5), [bx, by] = project(cin.b.x + 0.5, cin.b.y + 0.5);
          const z = Math.max(1, cin.z || 2);
          startAnim(cc({ z, cx: (ax + bx) / 2, cy: (ay + by) / 2 - 18 / z }), CINEMA_MS);
        } else if (st.cinemaBack) {
          const back = zl === st.zoomLv ? st.cinemaBack : (zl ? { z: zk(zl), cx: st.cinemaBack.cx, cy: st.cinemaBack.cy } : { z: 1, cx: LW / 2, cy: LH / 2 });
          st.cinemaBack = null; st.zoomLv = zl;
          startAnim(cc(back), CINEMA_MS);
        }
      }
      if (st.cinemaRef) { st.focusRef = p.focus; }
      else if (zl && st.zoomLv === zl && st.zoomPitch !== pitch) {
        // สลับมุมมองระหว่างมุมใกล้: คงจุดกลางไว้ ปรับขนาดขยายตามมุมใหม่
        st.zoomPitch = pitch;
        startAnim(cc({ z: zk(zl), cx: st.cam.cx, cy: st.cam.cy }), ZOOM_MS);
      }
      else if (zl !== st.zoomLv) {
        const first = st.zoomLv === null;
        st.zoomLv = zl;
        st.zoomPitch = pitch;
        let to;
        if (zl) {
          const z1 = zk(zl), a = st.zoomAnchor && now - st.zoomAnchor.t < 800 ? st.zoomAnchor : null, fp = focusPt(p.focus);
          const from = st.camAnim ? st.camAnim.to : st.cam;
          if (a) {
            // ล้อเมาส์: จุดใต้เมาส์อยู่ที่เดิมบนจอ
            const r = from.z / z1;
            to = { z: z1, cx: a.lx - r * (a.lx - from.cx), cy: a.ly - r * (a.ly - from.cy) };
          } else if (from.z > 1.001) to = { z: z1, cx: from.cx, cy: from.cy }; // เปลี่ยนระดับระหว่างซูมอยู่ = คงจุดกลางเดิม
          else if (fp) to = { z: z1, ...camFromEye(base, z1, fp[0], fp[1]) };
          else to = { z: z1, cx: from.cx, cy: from.cy };
        } else if (rts) { const from = st.camAnim ? st.camAnim.to : st.cam; to = { z: zk(0), cx: from.cx, cy: from.cy }; }
        else to = { z: 1, cx: LW / 2, cy: LH / 2 };
        st.zoomAnchor = null; st.pivot = null;
        to = cc(to);
        if (first) { st.cam = to; st.camAnim = null; } else startAnim(to, ZOOM_MS);
      }
      if (p.focus !== st.focusRef) {
        st.focusRef = p.focus;
        const fp = focusPt(p.focus), goal = st.camAnim ? st.camAnim.to : st.cam;
        if (fp && (zl || rts) && !st.pivot && !(st.drag && st.drag.moved) && !inCamView(base, goal, fp[0], fp[1])) {
          startAnim(cc({ z: goal.z, ...camFromEye(base, goal.z, fp[0], fp[1]) }), FOCUS_MS);
        }
      }
      if (st.camAnim) {
        const A = st.camAnim, pr = Math.min(1, (now - A.t0) / A.dur), e = ease(pr);
        st.cam = { z: A.from.z + (A.to.z - A.from.z) * e, cx: A.from.cx + (A.to.cx - A.from.cx) * e, cy: A.from.cy + (A.to.cy - A.from.cy) * e };
        if (pr >= 1) { st.cam = A.to; st.camAnim = null; }
      }
      if ((zl || rts) && st.keys.size && dt > 0) {
        let kx = 0, ky = 0;
        for (const c of st.keys) { const v = ARROWS[c]; if (v) { kx += v[0]; ky += v[1]; } }
        const sp = PAN_SPEED * dt / 1000 / st.cam.z;
        if (kx || ky) { st.camAnim = null; st.cam = { ...st.cam, cx: st.cam.cx + kx * sp, cy: st.cam.cy + ky * sp }; }
      }
      if (st.pivot) {
        const [sx, sy] = project(st.pivot.x, st.pivot.y);
        st.cam = { z: st.cam.z, ...eyeTo(st.cam.z, sx, sy) };
        if (!turning) st.pivot = null;
      }
      // RTS: เมาส์ชิดขอบจอ = เลื่อน (ไม่ลากอยู่ · หน้าต่างมีโฟกัส) · ปุ่มกลับที่ตัวเรา (p.camHome เปลี่ยน) = เลื่อนไปที่ focus
      if (rts && st.ptr && !st.drag && dt > 0 && typeof document !== "undefined" && document.hasFocus()) {
        const r = cvRef.current.getBoundingClientRect(), ex = st.ptr.clientX - r.left, ey = st.ptr.clientY - r.top;
        const kx = ex < EDGE_PX ? -1 : ex > r.width - EDGE_PX ? 1 : 0, ky = ey < EDGE_PX ? -1 : ey > r.height - EDGE_PX ? 1 : 0;
        if (kx || ky) { const sp = PAN_SPEED * dt / 1000 / st.cam.z; st.camAnim = null; st.cam = { ...st.cam, cx: st.cam.cx + kx * sp, cy: st.cam.cy + ky * sp }; }
      }
      // RTS: ตัวเราเดินไปช่องใหม่ (ไม่ได้ลากกล้องอยู่) → กล้องตามให้ตัวเราอยู่กลางจอ (ผู้ใช้สั่ง "ตัวเราอยู่กลางจอเสมอ")
      const selfKey = rts && p.selfPos ? `${p.selfPos.x},${p.selfPos.y}` : null;
      if (selfKey !== st.selfKey) {
        const was = st.selfKey;
        st.selfKey = selfKey;
        if (selfKey && !(st.drag && st.drag.moved)) {
          const [sx, sy] = project(p.selfPos.x + 0.5, p.selfPos.y + 0.5);
          const to = cc({ z: st.cam.z, ...eyeTo(st.cam.z, sx, sy) });
          if (was == null) { st.cam = to; st.camAnim = null; } else startAnim(to, FOCUS_MS);
        }
      }
      if (rts && p.camHome !== st.camHome) {
        const fp = st.camHome !== undefined ? focusPt(p.focus) : null;
        st.camHome = p.camHome;
        if (fp) startAnim(cc({ z: st.cam.z, ...eyeTo(st.cam.z, fp[0], fp[1]) }), FOCUS_MS);
      }
      st.cam = cc(st.cam);
      const view = rts ? computeView(w, h, { ...st.cam, z: st.cam.z * RTS_BASE_Z }) : st.cam.z > 1.0001 ? computeView(w, h, st.cam) : base; // RTS: z นับจากเฟรมอบที่ถอยออก
      st.view = view;
      // กล้อง RTS: กล้องกำลังเคลื่อน (ลาก/ชิดขอบ/ลูกศร/ล้อ/แอนิเมชัน/หมุน) → วาดพื้นสดที่มุมกล้องจริงทุกเฟรม (คมตลอด ไม่ต้องรออบ)
      const vk = `${view.k}|${view.ox}|${view.oy}|${st.turn}`;
      if (vk !== st.prevVK) { st.prevVK = vk; st.moveUntil = now + 160; }
      const camMoving = rts && (now < (st.moveUntil || 0) || !!st.camAnim || !!(st.drag && st.drag.moved) || st.keys.size > 0 || !!st.yaw);
      // ความละเอียดของชั้นอบ: มุมใกล้อบละเอียดขึ้น (ไม่เกิน 2 · lowQ = เท่าจอ) — ไม่ให้ภาพแตกตอนขยาย
      //  ทุกระดับที่ซูมอยู่ใช้ชั้นอบความละเอียดเดียว (ของระดับสูงสุด) — เปลี่ยนระดับไม่ต้องอบใหม่
      const res = lowQ || (!zl && !rts) ? dpr : Math.round(Math.min(2, dpr * (rts ? rr.max : zoomKOf(pitch, ZOOM_STEPS - 1))) * 100) / 100;
      // --- ชั้นอบ: ฉาก (ตามแนวกระดาน ตั้ง/นอน) + กระดาน (ตามมุม)
      const tB0 = performance.now();
      const sceneOf = (turn) => {
        const par = rts ? Math.round(turn * 1000) / 1000 : normRot(turn) % 2, sk = `${info.area}|${info.cols}x${info.rows}|${w}x${h}|${res}|${night}|${lowQ}|${par}|${pitch}`;
        let sc = st.scenes.get(sk);
        if (!sc) {
          sc = bakeScene(info, base, res, night, lowQ, par);
          st.scenes.set(sk, sc);
          if (st.scenes.size > 6) st.scenes.delete(st.scenes.keys().next().value);
          if (turning) st.turnT0 = performance.now() - (now - st.turnT0); // ไม่นับเวลาอบเข้าไปในแอนิเมชัน
        }
        return sc;
      };
      // RTS ระหว่างค้าง Q/E: ใช้ฉากที่อบไว้ล่าสุด (ไม่อบใหม่ทุกเฟรม) — ปล่อยปุ่มแล้วค่อยอบที่มุมใหม่
      const scTo = st.cv3 ? { scene: null, fore: null, marks: {} } : rts && st.yaw && st.lastSc ? st.lastSc : (st.lastSc = sceneOf(turning ? st.turnTo : st.turn));
      const scFrom = !st.cv3 && turning && normRot(st.turnFrom) % 2 !== normRot(st.turnTo) % 2 ? sceneOf(st.turnFrom) : null;
      let boardCv = null;
      if (!turning && !st.cv3 && !(camMoving && !lowQ)) {
        const rk = rts ? Math.round(st.turn * 1000) / 1000 : normRot(st.turn);
        const bk = `${st.sig}|${w}x${h}|${res}|${night}|${rk}|${pitch}`;
        boardCv = st.boards.get(bk);
        if (!boardCv) {
          boardCv = bakeBoard(info, base, res, night, rk, rts);
          st.boards.set(bk, boardCv);
          if (st.boards.size > 6) st.boards.delete(st.boards.keys().next().value);
        }
      }
      const tB = performance.now() - tB0;
      if (tB > 8 && st.camAnim) st.camAnim.t0 += tB; // ไม่นับเวลาอบเข้าไปในการซูม/เลื่อน
      setEosFast(rts && (turning || camMoving)); // สนาม Eos: ระหว่างวาดพื้นสด ข้ามรายละเอียดเล็ก
      let bake = { scene: scTo.scene, fore: scTo.fore, marks: scTo.marks, board: boardCv, sceneFrom: scFrom && scFrom.scene, mix, view: base, res };
      // กล้อง RTS (สนาม Eos — ผู้ใช้สั่ง "ภาพแตก"): กล้องนิ่งเกิน RTS_SHARP_MS → อบฉาก+กระดานใหม่ที่มุมกล้องปัจจุบันความละเอียดเท่าจอ
      //  (drawFrame วางตรงพิกเซล — คมทุกระดับซูม) · ระหว่างเลื่อน/ซูม/หมุนใช้ชั้นอบเดิมขยายไปก่อน
      if (rts && !turning && !lowQ && !st.cv3) {
        const still = !camMoving && !st.pivot;
        const ck = `${st.sig}|${w}x${h}|${dpr}|${night}|${st.turn}|${pitch}|${view.k}|${view.ox}|${view.oy}`;
        if (!still) st.stillAt = 0;
        else if (st.sharpKey !== ck) {
          if (!st.stillAt) st.stillAt = now;
          if (now - st.stillAt >= RTS_SHARP_MS) {
            const sc = bakeScene(info, view, dpr, night, lowQ, st.turn);
            st.sharp = { scene: sc.scene, fore: sc.fore, marks: sc.marks, board: bakeBoard(info, view, dpr, night, st.turn, true) };
            st.sharpKey = ck;
          }
        }
        if (st.sharp && st.sharpKey === ck) bake = { ...bake, scene: st.sharp.scene, fore: st.sharp.fore || bake.fore, marks: st.sharp.marks, board: st.sharp.board, sceneFrom: null, view, res: dpr };
      }
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
          if (f.kind === "darkWave") {
            item.dark = info ? prepareDarkWave(f, info.cols, info.rows) : null;
            if (!item.dark) continue;
            item.dur = item.dark.dur;
            item.dark.tiles.forEach((t, i) => {
              const hu = units.find((u) => onBody(u, t.x, t.y) && u.alive !== false);
              if (hu) st.hitT.set(hu.id, now + item.dark.hits[i]);
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
          // Return to Zero ของโจรุโน่: จำหน้าตาผู้โจมตีไว้วาดภาพติดตา
          if (f.kind === "gioRewind") {
            const au = units.find((u) => u.id === f.attacker);
            if (au) item.ghost = { img: au.img, name: au.name, masked: !!au.masked, color: "#d9c8ff", size: Math.max(1, au.size | 0) };
          }
          st.fxActive.push(item);
        }
        if (st.fxSeen.size > 400) st.fxSeen = new Set([...st.fxSeen].slice(-200));
      }
      st.fxActive = st.fxActive.filter((f) => now - f.t0 < (f.dur || FX_DUR[f.kind] || 1000));
      for (const f of st.fxActive) if (f.hitU != null && !f.hit2 && now - f.t0 >= SORA_T.slash2) { f.hit2 = true; st.hitT.set(f.hitU, now); }

      // --- สนาม Colony: เหตุการณ์ใหม่ → ฉาก 3D · อัปเดตกล้อง/ฉาก แล้วตั้งตัวฉายภาพก่อนวาดชั้น 2D
      if (st.cv3) {
        for (const ev of Array.isArray(p.colonyEvents) ? p.colonyEvents : []) {
          if (!ev || ev.key == null || st.fxSeen.has("c" + ev.key)) continue;
          st.fxSeen.add("c" + ev.key);
          st.cv3.onEvent(ev.kind, ev.data);
        }
        if (p.colonyHome !== st.colonyHome) { if (st.colonyHome !== undefined) { st.cv3.skipShot(); st.cv3.home(); } st.colonyHome = p.colonyHome; }
        st.cv3.update(now, dt, { map: p.map, colony: p.colony, units, focus: p.focus, rotation: p.rotation, zoom: p.zoom, view: p.view, night, size: { w, h }, base, cinema: p.cinema, hl });
        setCustomProjection(st.cv3);
      }
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
        // เดินคู่ขนาน (ช่วง Clock Up — หลายคนเดินพร้อมกัน ไม่ต่อคิว anim): เล่นตามเส้นทางนับจากเวลาที่เห็น key ใหม่
        const gl = p.glides && p.glides[u.id];
        if (gl && Array.isArray(gl.path) && gl.path.length > 1 && !(an && !an.done && an.obj.id === u.id)) {
          let rec = st.glides.get(u.id);
          if (!rec || rec.key !== gl.key) { rec = { key: gl.key, t0: now }; st.glides.set(u.id, rec); }
          const gp = animPose({ kind: "move", path: gl.path, stepMs: gl.stepMs }, now - rec.t0);
          if (!gp.done) { rx = gp.x; ry = gp.y; ox = 0; oy = 0; }
        }
        // ฉากของเคท & เอมิลิโกะ (บิน/ถูกดึง/พุ่ง/ฟื้น) ย้ายหมากเอง — ทับแอนิเมชันอื่น
        const sp = u.corpse ? null : shadowPose(st.fxActive, u.id, now);
        if (sp) { rx = sp.x; ry = sp.y; ox = 0; oy = 0; hz = sp.hz || 0; sq = sp.sq || 0; }
        // ฉากของไจโร (ถูกดึง/กระเด็น/ดันออกข้าง) ย้ายหมากเอง — ค้างที่ปลายทางจน state มาถึง
        const gp = sp || u.corpse ? null : gyroPose(st.fxActive, u, now);
        if (gp) { rx = gp.x; ry = gp.y; ox = 0; oy = 0; hz = gp.hz || 0; sq = gp.sq || 0; }
        // ไจโรขี่ม้า: หมากนั่งบนหลังม้า (ม้าวาดใต้หมาก — gyroFx.js gyroHorse)
        if (u.gyro && u.gyro.mounted) hz += GYRO_RIDE_Z;
        // ฉากของดิเอโก้ (ถูกตาข่ายดึง · ควบกลอุบาย · กระเด็น) · ขี่ซิลเวอร์ บูลเล็ต/กำลังควบ = นั่งบนหลังม้า
        const dp = sp || gp || u.corpse ? null : diegoPose(st.fxActive, u, now);
        if (dp) { rx = dp.x; ry = dp.y; ox = 0; oy = 0; hz = dp.hz || 0; sq = dp.sq || 0; }
        // ฉากของดิโอ: พุ่งขึ้นฟ้าไปเอารถบดถนน · ลงพร้อมรถ
        const dip = sp || gp || dp || u.corpse ? null : dioPose(st.fxActive, { id: u.id, rx, ry }, now);
        if (dip) { rx = dip.x; ry = dip.y; ox = 0; oy = 0; hz = dip.hz || 0; sq = 0; }
        const dgo = u.diego ? { ...u.diego, charge: !!(dp && dp.charge) } : null;
        if (dgo && (dgo.mounted || dgo.charge)) hz += DIEGO_RIDE_Z;
        // รถบรรทุกเก่า / รถบรรทุก: หมากนั่งบนรถ (รถวาดใต้หมาก — optimusFx.js otTruck)
        if (otRides(u)) hz += OT_RIDE_Z;
        // ลอยบนต้นไม้ของโจรุโน่ (giornoFx.js gioUnitBack วาดต้นไม้ใต้หมาก)
        if (gioLifted(u)) hz += GIO_TREE_Z;
        // ฉากของวาเลนไทน์: ตัวเหมือนวิ่งเข้าหาเป้า · ซ่อน/ตัด/บีบ/เจาะรูหมาก (valMod)
        const vp = sp || gp || dp || u.corpse ? null : valentinePose(st.fxActive, u, now);
        if (vp) { rx = vp.x; ry = vp.y; ox = 0; oy = 0; hz = vp.hz || 0; sq = 0; }
        // ฉากของเซลิน: คนที่ถูกสลับตำแหน่งลอยขึ้น บินโค้ง แล้วลงที่ใหม่ (celinePose)
        const cpo = sp || gp || dp || vp || u.corpse ? null : celinePose(st.fxActive, u, now);
        if (cpo) { rx = cpo.x; ry = cpo.y; ox = 0; oy = 0; hz = cpo.hz || 0; sq = 0; }
        // ฉากของทาคุโตะ: พุ่งต้นตาเดิน (เลื่อนเร็ว) · ดาบประกายแสง (ทาคุโตะ/เป้าวาบหายแล้วโผล่ที่ใหม่ — alpha)
        const tpo = sp || gp || dp || vp || cpo || u.corpse ? null : takutoPose(st.fxActive, u, now);
        if (tpo) { rx = tpo.x; ry = tpo.y; ox = 0; oy = 0; hz = tpo.hz || 0; sq = 0; }
        // ฉากของเรียวกิ: พุ่งเข้าตี/กระโดดข้ามหัว · พุ่งดับสิ้นซะ · คน/ศพในแนวถูกเหวี่ยงออกข้าง (ศพด้วย)
        const rpo = sp || gp || dp || vp || cpo || tpo ? null : ryougiPose(st.fxActive, u, now);
        if (rpo) { rx = rpo.x; ry = rpo.y; ox = 0; oy = 0; hz = rpo.hz || 0; sq = 0; }
        // Return to Zero ของโจรุโน่: ผู้โจมตีถูกดึงถอยหลังจากจุดที่ยืนกลับช่องต้นตา
        const gio = sp || gp || dp || vp || cpo || tpo || rpo || u.corpse ? null : gioPose(st.fxActive, u, now);
        if (gio) { rx = gio.x; ry = gio.y; ox = 0; oy = 0; hz = gio.hz; sq = 0; }
        // สนาม Colony: ถูกดูด/โคโลนีหมุน (ขยับตามฉาก) · กำลังลอยผ่านแกน/ลิฟต์ (ฉาก 3D วาดแทน)
        if (st.cv3) {
          if (st.cv3.hidden(u.id, now)) continue;
          const cpo2 = st.cv3.pose(u.id, now);
          if (cpo2) { rx = cpo2.x; ry = cpo2.y; ox = 0; oy = 0; }
        }
        const vmod = u.corpse ? null : valentineMod(st.fxActive, u, now);
        const k = key(u.x, u.y), us = Math.max(1, u.size | 0);
        // ตัวใหญ่: ช่องไหนของตัวอยู่ในไฮไลต์ก็นับ
        const any = (set) => { if (us <= 1) return set.has(k); for (let dy = 0; dy < us; dy++) for (let dx = 0; dx < us; dx++) if (set.has(key(u.x + dx, u.y + dy))) return true; return false; };
        let reticle = null, alpha = u.alpha == null ? 1 : u.alpha;
        if (u.cloak) alpha *= lowQ || reducedMotion() ? 0.45 : 0.45 + 0.06 * Math.sin(now / 420);
        if (!u.isMe && !u.isActor && !u.corpse) {
          if (any(hl.aoe)) reticle = "aoe";
          else if (any(hl.skill)) reticle = "skill";
          else if (any(hl.attack) || (hl.target && hl.target.x === u.x && hl.target.y === u.y)) reticle = "attack";
          else if (targeting) alpha *= 0.5;
        }
        list.push({
          id: u.id, rx, ry, ox, oy, hz, sq, color: normColor(u.color), img: u.img, name: u.name,
          hp: u.hp, maxHp: u.maxHp, armor: u.armor, maxArmor: u.maxArmor,
          isMe: !!u.isMe, ally: !!u.ally && !u.isMe, isActor: !!u.isActor, tag: u.masked ? null : u.tag, reticle, alpha, cloak: !!u.cloak && !lowQ, aura: u.aura || null, faizTrail: u.faizTrail || false, yuki: u.yuki || null, rider: u.rider || null, gyro: u.gyro || null, diego: dgo, truck: u.truck || null, giorno: u.giorno || null, otoya: u.otoya || null, dio: u.dio || null, arjuna: u.arjuna || null, dstat: u.dstat || null, lowQ,
          masked: !!u.masked, corpse: !!u.corpse, ryougiSlain: !!u.ryougiSlain, // มืดบอด = ขาวล้วน · ร่างของตัวที่ล้ม (ระบบคู่) · ถูกเรียวกิสังหาร = กองเลือด
          hitT: st.hitT.get(u.id) || 0,
          size: us, art: u.art || null, face: u.face || null,
          valMod: vmod, ghostDim: !!u.ghostDim, summon: u.summon || null,
          grow: (() => { const gr = st.grow.get(u.id); if (gr && now - gr.t0 > GROW_MS) { st.grow.delete(u.id); return null; } return gr || null; })(),
          hovered: !!hov && st.hoverUnit === u.id,
        });
        // เคท: wings = ปีกค้างในม่านแดง · fly = กำลังบิน (ไม่มีแท่งต่อลงพื้น) · alpha ของฉากฟื้น
        const lu = list[list.length - 1];
        if (u.wings) lu.wings = true;
        if (sp) { if (sp.fly) lu.fly = true; if (sp.alpha != null) lu.alpha *= sp.alpha; }
        if (tpo && tpo.alpha != null) lu.alpha *= tpo.alpha;
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
      const shk = iceShakeOffset(st.fxActive, now, lowQ) || stormShakeOffset(now, lowQ);
      // ม่านแดง (เคท): จำม่านที่หายไว้เล่นตอนจาง — sootStorm.js
      const storms = syncStorms(st.stormMem || (st.stormMem = new Map()), p.storms, list, now);
      //  ขยาย 3% รอบกลางจอระหว่างสั่น — ขอบภาพไม่โผล่
      const dView = shk ? { ...view, k: view.k * 1.03, ox: w / 2 + (view.ox - w / 2) * 1.03 + shk[0] * view.k, oy: h / 2 + (view.oy - h / 2) * 1.03 + shk[1] * view.k } : view;
      // ล้างสถานะ canvas ทุกเฟรม: ตัววาดตัวไหนโยน error ระหว่าง save()…restore() (เช่นกลาง "lighter")
      //  สถานะจะค้างข้ามเฟรม → ทุกอย่างถูกบวกแสงจนกระดานขาวทั้งแผ่น (บั๊กจอขาว 5.6.21–5.6.22) · error ไม่ทำให้เฟรมถัดไปพัง
      const frame = (target) => {
        if (target.reset) target.reset();
        else { target.setTransform(1, 0, 0, 1, 0, 0); target.globalCompositeOperation = "source-over"; target.globalAlpha = 1; target.filter = "none"; }
        try { return drawFrameOf(target); } catch (err) {
          const msg = String((err && err.stack) || err);
          if (!st.drawErrs) st.drawErrs = new Set();
          if (!st.drawErrs.has(msg)) { st.drawErrs.add(msg); console.error("drawFrame", err); }
          if (target.reset) target.reset();
          return st.boxes || [];
        }
      };
      const drawFrameOf = (target) => drawFrame(target, {
        info, view: dView, dpr, bake, ice: p.ice || null, turn: st.turn, night, lowQ, units: list, hl,
        shops: p.shops || null, hover: hov, fx: st.fxActive,
        zero: p.zero || null, zeroAnim, hitT: st.hitT, storms, songs: p.songs || null, grays: p.grays || null, gils: p.gils || null, ferns: p.ferns || null, gyroBalls: p.gyroBalls || null,
        diego: p.diego || null, timeFreeze: p.timeFreeze || null,
        valentine: p.valentine || null, celine: p.celine || null, moon: p.moon || null, takutos: p.takutos || null, ryougi: p.ryougi || null, otoya: p.otoya || null, emiya: p.emiya || null, law: p.law || null, fodlan: p.fodlan || null, dimLayers: dimLayersOf(st, p.dimView, now),
        colony: !!st.cv3, colonyNear: st.cv3 ? st.cv3.focusDist() : null, colonyCapsule: st.cv3 ? st.cv3.capsuleAt(now) : null, colonyTurrets: p.colony && p.colony.turrets ? p.colony.turrets : null, colonyOcclude: st.cv3 ? st.cv3.occludeBelow() : null, colonyBurn: st.cv3 ? st.cv3.burnFrom() : null,
      }, now);
      if (!zs) {
        st.boxes = frame(g);
        // Colony: แฟลชขาวตอนระเบิด/ปิดผนึก
        // Colony: ลูกศรขอบจอชี้หมากที่อยู่นอกจอ (สีประจำตัว · ตัวเราขอบทอง) — เห็นทุกคนเสมอแม้หมุนกล้องไปทางอื่น
        if (st.cv3 && !(st.cv3.flash() > 0.5)) {
          const inset = { l: 70, r: 70, t: 96, b: 170 };
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          for (const u of list) {
            if (u.corpse || st.cv3.hidden(u.id, now)) continue;
            const hs = Math.max(1, u.size | 0) / 2, m = st.cv3.edgeMark(u.rx + hs, u.ry + hs, inset);
            if (!m) continue;
            const r = u.isMe ? 17 : 14;
            g.save(); g.translate(m.x, m.y); g.globalAlpha = u.isMe ? 1 : 0.9;
            g.rotate(m.ang);
            g.fillStyle = u.color || "#7fb8e6"; g.strokeStyle = u.isMe ? "#f0c868" : "#ffffff"; g.lineWidth = u.isMe ? 3 : 2;
            g.beginPath(); g.moveTo(r + 13, 0); g.lineTo(r - 2, -10); g.lineTo(r - 2, 10); g.closePath(); g.fill(); g.stroke();
            g.rotate(-m.ang);
            g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.stroke();
            // เลือดที่เหลือ = วงขาวรอบใน (เต็มวง = เลือดเต็ม)
            const hpK = u.maxHp > 0 ? Math.max(0, Math.min(1, (u.hp || 0) / u.maxHp)) : 1;
            g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 3;
            g.beginPath(); g.arc(0, 0, r - 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpK); g.stroke();
            if (u.ally) { g.fillStyle = "#ffffff"; g.beginPath(); g.arc(0, 0, 3.5, 0, Math.PI * 2); g.fill(); }
            g.restore();
          }
          // กล้องออกห่างตัวเรา → BoardStage โชว์ปุ่มกลับที่หมาก
          const away = st.cv3.away();
          if (away !== st.colonyAway) { st.colonyAway = away; if (typeof p.onColonyAway === "function") p.onColonyAway(away); }
        }
        const fl = st.cv3 ? st.cv3.flash() : 0;
        if (fl > 0.01) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = `rgba(${st.cv3.flashColor()},${Math.min(1, fl)})`; g.fillRect(0, 0, cv.width, cv.height); }
      }
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
      if (st.cv3 && !e.ctrlKey && e.deltaY) { e.preventDefault(); st.cv3.zoomBy(e.deltaY); return; } // Colony: ซูมต่อเนื่อง
      // RTS (สนาม Eos): ล้อ = ซูมต่อเนื่องเข้าหาจุดใต้เมาส์ (ไม่ผ่านระดับ +/−)
      if (st.rts && st.rtsRange && st.view && !e.ctrlKey && e.deltaY) {
        e.preventDefault();
        const from = st.camAnim ? st.camAnim.to : st.cam, rr = st.rtsRange;
        const z1 = Math.max(rr.min, Math.min(rr.max, from.z * Math.exp(-Math.max(-120, Math.min(120, e.deltaY)) * 0.0022)));
        const r = cv.getBoundingClientRect(), [lx, ly] = toLogical(st.view, e.clientX - r.left, e.clientY - r.top), k = from.z / z1;
        st.camAnim = null;
        st.cam = { z: z1, cx: lx - k * (lx - from.cx), cy: ly - k * (ly - from.cy) };
        return;
      }
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
      // Colony: ลูกศร = เลื่อนกล้อง (WASD = เดินตัวละคร — BoardStage) · Space = กลับมาที่ตัว (กลางฉากอีเวนต์ = ข้ามฉาก) · V = มุมมองตามแกน
      if (st.cv3 && !typing(e) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const mv = { ArrowUp: [0, -70], ArrowDown: [0, 70], ArrowLeft: [-70, 0], ArrowRight: [70, 0] }[e.code];
        if (mv) { e.preventDefault(); st.cv3.pan(-mv[0], -mv[1]); return; }
        if (e.code === "Space") { e.preventDefault(); st.cv3.skipShot(); st.cv3.home(); return; }
        if (e.code === "KeyV") { st.cv3.toggleAxis(); return; }
      }
      if (st.rts && (e.code === "KeyQ" || e.code === "KeyE") && !typing(e) && !e.ctrlKey && !e.metaKey && !e.altKey) { st.yaw = e.code === "KeyQ" ? -1 : 1; return; }
      if (!ARROWS[e.code] || !(st.rts || clampZoom(propsRef.current.zoom) > 0) || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      // กดครั้งแรก = ขยับทันทีหนึ่งก้าว (กดแล้วปล่อยเร็วกว่า 1 เฟรมก็ยังขยับ) · ค้าง = เลื่อนต่อเนื่องในลูปวาด
      if (!e.repeat && !st.keys.has(e.code)) {
        const [kx, ky] = ARROWS[e.code], step = TAP_STEP / st.cam.z;
        st.camAnim = null; st.cam = { ...st.cam, cx: st.cam.cx + kx * step, cy: st.cam.cy + ky * step };
      }
      st.keys.add(e.code);
    };
    const onKeyUp = (e) => { st.keys.delete(e.code); if ((e.code === "KeyQ" && st.yaw < 0) || (e.code === "KeyE" && st.yaw > 0)) st.yaw = 0; };
    const onBlur = () => { st.keys.clear(); st.drag = null; st.yaw = 0; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect();
      if (st.cv3) { st.cv3.dispose(); st.cv3 = null; setCustomProjection(null); }
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
    if (st.cv3 && e.button <= 2) {
      if (e.button === 1) e.preventDefault();
      // Colony: ลากซ้าย = หมุนกล้องรอบตัวอิสระ 360° + ก้มเงย (ผู้ใช้สั่ง 2026-11-09 "ควรจะหมุนได้รอบ") · ลากขวา/กลาง หรือ Shift + ลากซ้าย = เลื่อน (ลากพื้น)
      st.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, moved: e.button !== 0, button: e.button, pan: e.button !== 0 || e.shiftKey };
      try { cvRef.current.setPointerCapture(e.pointerId); } catch { /* ไม่รองรับ */ }
      return;
    }
    if (!(st.rts || clampZoom(propsRef.current.zoom) > 0) || e.button > 2) return;
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
    cvRef.current.style.cursor = hot && (p.onTileClick || p.onUnitClick) ? "pointer" : st.rts || clampZoom(p.zoom) > 0 ? "grab" : "default";
  };
  useLayoutEffect(() => {
    S.current.refreshHover = () => { const st = S.current; if (st.ptr && !(st.drag && st.drag.moved)) hoverAt(st.ptr); };
  });
  const onPointerMove = (e) => {
    const st = S.current, d = st.drag;
    st.ptr = { clientX: e.clientX, clientY: e.clientY };
    if (d && d.id === e.pointerId) {
      if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > DRAG_PX) d.moved = true;
      if (d.moved && st.cv3) {
        const dx = e.clientX - d.lx, dy = e.clientY - d.ly;
        if (d.pan) st.cv3.pan(dx, dy); else st.cv3.orbit(dx, dy);
        d.lx = e.clientX; d.ly = e.clientY;
        cvRef.current.style.cursor = "grabbing";
        return;
      }
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
    // Alt + คลิก = ปักหมุดให้เพื่อนร่วมทีม (BoardStage onPing — โหมดทีม/Moon Cell)
    if (e.altKey && typeof p.onPing === "function") { const at = tile || (unit && unit.pos); if (at) p.onPing(at.x, at.y); return; }
    if (unit && typeof p.onUnitClick === "function") { p.onUnitClick(unit.id); return; }
    if (tile && typeof p.onTileClick === "function") p.onTileClick(tile.x, tile.y);
  };

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <canvas ref={glRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "none", pointerEvents: "none" }} />
      <canvas
        ref={cvRef}
        style={{ position: "relative", display: "block", width: "100%", height: "100%", touchAction: props.colony || props.rts || clampZoom(props.zoom) > 0 ? "none" : "manipulation" }}
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
