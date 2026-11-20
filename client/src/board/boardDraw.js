// ============================================================
//  ตัววาดกระดานเดินได้ (ระบบใหม่แบบ Fire Emblem — ดู GRID_PLAN.md §11)
//  พอร์ตจากต้นแบบ .claude/plans/region1-board.html (หน้าตาฉาก) + grid-prototype.html (คณิตกล้อง/เลือกช่อง)
//
//  แนวคิด
//   - วาดในพิกัด "ตรรกะ" 1280 × 720 แบบต้นแบบเสมอ แล้วย่อ/ขยายลงแคนวาสจริงด้วย view (computeView)
//     จอกว้าง/สูงกว่า 16:9 = เห็นพื้น/ท้องฟ้า/ฉากรอบนอกเพิ่ม กระดานไม่ถูกตัด
//   - ชั้นอบ 2 ชั้น
//      scene = ฟ้า ฉากหลัง ลายพื้น ของสองข้าง (ไม่หมุนตามกระดาน) — อบต่อ ภูมิภาค/ขนาด/กลางคืน/แนวกระดาน (ตั้ง/นอน)
//      board = ฐานกระดาน ช่อง ช่องพิเศษ จุดฟื้นฟู เส้นตาราง แสงแดด/ความมืด — อบต่อ แผนที่/ขนาด/กลางคืน/มุมหมุน
//     ระหว่างหมุนกระดาน (≈250ms) ชั้น board วาดสดทุกเฟรม · ชั้น scene ค่อยๆ เปลี่ยน (crossfade)
//   - ชั้นเคลื่อนไหว (ไฮไลต์ สิ่งกีดขวาง ตัวละคร ร้าน เอฟเฟกต์) วาดใหม่ทุกเฟรม เรียงตามความลึกของมุมมอง
//   - ธีมรายภูมิภาค (ฉาก/สี/อนุภาค) อยู่ที่ regionThemes.js · สิ่งกีดขวาง/ช่องพิเศษ/จุดฟื้นฟูอยู่ที่ boardProps.js
//   - lowQ = ข้ามอนุภาค ใบไม้หน้ากล้อง แอนิเมชันช่องพิเศษ และหมุนกระดานทันที
//   - มุมใกล้ (ซูม) = ขยายภาพ 2 มิติทั้งเฟรม (computeView ใส่ cam) · ชั้นอบยังอบด้วยเฟรมปกติ (base view) แต่ละเอียดขึ้น
//     (res = dpr × ZOOM_K ไม่เกิน 2) แล้ววาดขยายลงจอ · กล้องเลื่อนได้แค่ในเฟรมปกติ (clampCam) ชั้นอบจึงครอบคลุมเสมอ
//
//  พิกัดช่อง: x = คอลัมน์ 0..cols-1 (ซ้าย→ขวา) · y = แถว 0..rows-1 (ไกล→ใกล้กล้อง ที่มุม 0) · key = "x,y"
//  map.special["x,y"] = ช่องพิเศษ (flowers forest thorns shallow whirl quicksand ice lava power) · map.flow["x,y"] = up/down/left/right (น้ำวน)
// ============================================================
import {
  LH, LW, P, computeView, depthOf, gEllipse, key, normColor, parseKey, project, pitchOf, rgbOf, toLogical, toView, unproject, viewTurn, viewCenter,
  frameToScreen, localFrame, withLocalFrame, setCullView, onScreen,
} from "./boardGeo";
import { drawShopStall, shopDims, SHOP_TOP_Z } from "./shopProps";
import { TALL_KINDS, animHeal, animSpecial, bakeSpecial, drawObstacle } from "./boardProps";
import { themeOf } from "./regionThemes";
import { drawFodlanAir, drawFodlanGround, fodlanItems, isFodlanTall } from "./fodlan/index";
import { HK_FX_DUR, hikaruFx, isHikaruFx } from "./hikaruFx";
import { KIRA_FX_DUR, isKiraFx, kiraFx } from "./kiraFx";
import { OT_FX_DUR, isOtFx, optimusFx } from "./optimusFx";
import { DIO_FX_DUR, dioFx, isDioFx } from "./dioFx";
import { GIO_FX_DUR, gioForeAlpha, gioRewindLayer, giornoFx, isGioFx } from "./giornoFx";
import { ARJ_FX_DUR, arjunaBoardFx, isArjFx } from "./arjunaBoardFx";
import { ICE_FX_DUR, drawIceSpike, iceFx, iceSpikeLv, iceSpikeRise, isIceFx } from "./iceFx";
import { SH_FX_DUR, drawIdleWings, idleWingsDepth, isShadowFx, shadowBackDepth, shadowFx } from "./shadowFx";
import { YUNA_FX_DUR, drawYunaZones, isYunaFx, yunaFx } from "./yunaFx";
import { GRAY_FX_DUR, drawGrayAir, drawGrayGround, grayFx, isGrayFx } from "./grayFx";
import { GIL_FX_DUR, drawGilAir, drawGilGround, gilFx, isGilFx } from "./gilFx";
import { GYRO_FX_DUR, gyroBallItems, gyroFx, isGyroFx } from "./gyroFx";
import { DIEGO_FX_DUR, diegoAmbientNow, diegoFireItems, diegoFx, diegoTimeLayer, drawDiegoGround, isDiegoFx } from "./diegoFx";
import { VAL_FX_DUR, isValentineFx, valentineDimGround, valentineDimLayer, valentineFlip, valentineFx, valentineItems, valentinePuppets } from "./valentineFx";
import { FERN_FX_DUR, drawFernAir, fernFx, isFernFx } from "./fernFx";
import { CELINE_FX_DUR, celineFx, celineItems, celineWallRise, drawCelineAir, drawCelineGround, drawCelineWall, isCelineFx } from "./celineFx";
import { RYOUGI_FX_DUR, drawRyougiAir, drawRyougiGround, isRyougiFx, ryougiFx, ryougiItems } from "./ryougiFx";
import { EMIYA_FX_DUR, drawEmiyaSky, drawEmiyaWorld, emiyaFx, emiyaItems, emiyaWorldOn, isEmiyaFx } from "./emiyaFx";
import { FAIZ_FX_DUR, faizFx, isFaizFx } from "./faizFx";
import { ZECT_FX_DUR, isZectFx, zectFx } from "./zectFx";
import { KIRI_FX_DUR, drawKiriGround, isKiriFx, kiriFx } from "./kiriFx";
import { SHINRA_FX_DUR, isShinraFx, shinraFx } from "./shinraFx";
import { MIDORIYA_FX_DUR, isMidoriyaFx, midoriyaFx } from "./midoriyaFx";
import { MAGNA_FX_DUR, isMagnaFx, magnaFx, magnaChains } from "./magnaFx";
import { NARU_FX_DUR, isNaruFx, naruhodoFx } from "./naruhodoFx";
import { DINO_FX_DUR, isDinoFx, dinoFx } from "./dinoFx";
import { MASTER_FX_DUR, isMasterFx, masterFx, drawElemFields } from "./masterFx";
import { KAZUMA_FX_DUR, isKazumaFx, kazumaFx } from "./kazumaFx";
import { ROLAND_FX_DUR, isRolandFx, rolandFx } from "./rolandFx";
import { OTOYA_FX_DUR, isOtoyaFx, otoyaFx, otoyaLinks, otoyaMoon, otoyaNight } from "./otoyaFx";
import { ELEM_FX_DUR, isElemFx, elemFx } from "./elementFx";
import { MOON_FX_DUR, drawMoonGround, isMoonFx, moonFx } from "./moonFx";
import { DIVINE_FX_DUR, divineFx, isDivineFx } from "./divineFx";
import { LAW_FX_DUR, drawLawAir, drawLawGround, drawLawRock, isLawFx, isLawRock, lawFx, lawItems, lawRockRise, lawSliced } from "./lawFx";
import { behindDome, clipOutDomes, drawStormAir, drawStormGround, stormWallItems } from "./sootStorm";
import { drawRtObstacle, isRtObstacle, rtAir, rtGround, rtItems, rtSkipTerrain } from "./roadtrip/props";
import { isRtArea } from "./roadtrip/theme";
import { drawYukiDim } from "./yukiFx";
import { EOS_HEAL_AREA, drawBoardLayer, drawGroundWarp, drawShop, drawShopLabel } from "./boardBake";
import { REDUCED, setCamera } from "./boardCamera";
import { DEATH_BOOM_MS, SMASH_MS, STYLE_MS, burstFx, deathBoomFx, echoFx, floatText, hairFx, rockFx, slashFx, smashFx } from "./boardFxBasic";
import { BEAM_T, beamFx, quakeFx } from "./boardFxBeam";
import { SL_LIFE, SORA_T, boomFx, darkWaveFx, dashFx, mythSlashFx, wheelAt, wheelFx } from "./boardFxSora";
import { SORA_FRAME_FX_DUR, drawSoraShell, isSoraFrameFx, soraFrameFx } from "./soraFrameFx";
import { drawHighlights } from "./boardHighlights";
import { COLONY_FLOOR, GROW_MS, UNIT_FRAME, drawAnyUnit, emoteFx, growFx, teamPingFx, unitHex } from "./boardUnits";

export { LW, LH, key, parseKey, project, unproject, computeView, toLogical };

// ส่งต่อทุกชื่อที่ไฟล์นี้เคย export (ก่อนแยกไฟล์) — ผู้เรียกไม่ต้องแก้ import
export { mapSignature, prepareMap, bakeScene, prewarmGround, bakeBoard, bakeLayers } from "./boardBake";
export {
  reducedMotion, OV, pickTile, tileCenter, normRot, setCamera, ZOOM_K, ZOOM_LEVELS, ZOOM_STEPS, clampZoom, boardBox, clampCam, RTS_VIEW_TILES,
  rtsZoomRange, rtsZoomOf, clampCamRts, camEyeY, camFromEye, inCamView,
} from "./boardCamera";
export { vitalBig, vitalHeight, drawVitalBar, GROW_MS, bigDrawSize } from "./boardUnits";
export { smashDur, STYLE_HIT, DEATH_BOOM_MS, deathBoomFx } from "./boardFxBasic";
export { prepareHighlights } from "./boardHighlights";
export { BEAM_T, prepareBeam, beamColors, QUAKE_T, prepareQuake } from "./boardFxBeam";
export { SORA_T, dashDur, DARK_T, prepareDarkWave } from "./boardFxSora";

export const FX_DUR = {
  darkWave: 3000, emote: 2600, teamPing: 3200,
  slash: 420, float: 1300, burst: 560, beam: BEAM_T.charge + BEAM_T.extend + BEAM_T.hold + BEAM_T.fade + 40, quake: 2200, grow: GROW_MS, smash: SMASH_MS,
  mythSlash: SORA_T.slash2 + SL_LIFE + 40, soraWheel: SORA_T.wheel, soraBoom: SORA_T.boom, soraDash: SORA_T.wheel + 2000, ...SORA_FRAME_FX_DUR, deathBoom: DEATH_BOOM_MS, ...STYLE_MS, ...HK_FX_DUR, ...ICE_FX_DUR, ...SH_FX_DUR,
  ...FAIZ_FX_DUR, ...ZECT_FX_DUR, ...ROLAND_FX_DUR, ...KIRA_FX_DUR, ...YUNA_FX_DUR, ...GRAY_FX_DUR, ...GYRO_FX_DUR, ...DIEGO_FX_DUR, ...VAL_FX_DUR, ...FERN_FX_DUR, ...CELINE_FX_DUR, ...RYOUGI_FX_DUR, ...EMIYA_FX_DUR, ...KAZUMA_FX_DUR, ...MOON_FX_DUR, ...LAW_FX_DUR, ...DIVINE_FX_DUR, ...OT_FX_DUR, ...GIO_FX_DUR, ...ARJ_FX_DUR, ...DIO_FX_DUR, ...OTOYA_FX_DUR, ...GIL_FX_DUR, ...KIRI_FX_DUR, ...SHINRA_FX_DUR, ...MIDORIYA_FX_DUR, ...MAGNA_FX_DUR, ...NARU_FX_DUR, ...DINO_FX_DUR, ...MASTER_FX_DUR, ...ELEM_FX_DUR,
};


// =================================================================== frame
//  st = { info, view, dpr, bake, turn, night, lowQ, units (พร้อมวาด), hl, shops (state.shops), hover, fx (กำลังเล่น) }
//   grays? = รองโกมิเนียตที่กำลังชาร์จ [{ id, x, y, size, dir, left, tiles }] (grayFx.js)
//   gils? = กิลกาเมช [{ id, x, y, size, ea, storm, warns, weapons, charge }] (gilFx.js)
//   ferns? = เฟิร์นที่ Zoltraak ครั้งที่ 6 พร้อม / เพิ่มระยะรออยู่ [{ id, x, y, size, empowered, boost }] (fernFx.js — แสงปลายคทา)
//   gyroBalls? = ลูกเหล็กของไจโรบนพื้น [{ owner, color, x, y, seq }] (gyroFx.js)
//   diego? = { oil, fire, ash, nets } ชั้นพื้นของดิเอโก้ · timeFreeze? = { by } หยุดเวลาอยู่ (diegoFx.js)
//   celine? = { flora, kings, hold, preview } ของค้างของเซลิน (celineFx.js) · terrain "icewall" = กำแพงน้ำแข็ง (drawCelineWall)
//   ryougi? = { units: [{ id, eyes, mind, bloom }], blood: [{ x, y, size, id }] } เรียวกิ (ryougiFx.js) · terrain "chasm" = ช่องพัง (drawRyougiGround — ไม่ใช่สิ่งกีดขวาง)
//   emiya? = { ubw, units: [{ id, weapon }] } ชิโร่ (emiyaFx.js) — โลกแห่งดาบ (พื้นซีเปีย/ดาบปัก/เฟือง) · อาวุธที่ถือลอยข้างตัว
//   law? = { rooms, objects, marks, hearts, armed, rocks } ของค้างของลอว์ (lawFx.js) — Room · วัตถุลอย · มาร์ก · หัวใจ · terrain "icewall" ที่อยู่ใน rocks = หนามหิน
//   moon? = state.moon ของโหมด Moon Cell { curse, pillars, … } (moonFx.js — พื้นที่คำสาป/ช่องเสาข้อมูล)
//   valentine? = { flags } ธงปักของวาเลนไทน์ · dimLayers? = [{ kind: "par"|"veil", k }] มุมมองของมิติ (valentineFx.js)
//   view = มุมมองที่แสดงจริง (มีซูม/เลื่อนได้)
//   bake = { scene, sceneFrom?, mix?, board?, fore, marks, view?, res? } — board = null → วาดชั้นกระดานสด (ระหว่างหมุน)
//          view/res = เฟรมปกติ + ความละเอียดที่ใช้อบ (ไม่ใส่ = เท่ากับ view/dpr)
//   turn = มุมมองตอนนี้ (หน่วย 90° ทศนิยมได้)
//  คืน boxes = กล่องคลิกของตัวละคร (พิกัดตรรกะ) เรียงหน้า→หลัง
// ชั้นอบที่ย่อ/ขยายลงขนาดจอแล้ว (ชั้นอบ → { key: มุมกล้อง, c: แคนวาสขนาดจอ }) · มุมกล้องของเฟรมก่อน (เท่ากัน = กล้องนิ่ง)
const SCREEN_CACHE = new WeakMap();
let lastViewKey = "";
// สนาม Eos: ชนิดสิ่งกีดขวางที่ไม่มีแอนิเมชัน (วาดรวมเป็นภาพเดียวตอนกล้องนิ่ง — drawFrame)
const STATIC_OB = new Set(["fd_eos_bldg", "fd_eos_wall", "fd_eos_tree", "fd_eos_rock", "fd_eos_garage"]);
const STATIC_CACHE = { key: null, prev: null, cv: null };
export function drawFrame(g, st, now) {
  const { info, view, dpr, bake, night, lowQ, units, hl, hover, fx } = st;
  setCamera(info, st.turn || 0);
  const T = themeOf(info.area), C = T.pal[night ? "night" : "day"];
  const L = () => g.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.ox, dpr * view.oy);
  // ชั้นอบ → จอ: เฟรมเดียวกัน = วางตรงพิกเซล · มุมใกล้/ความละเอียดต่าง = วาดตามพิกัดตรรกะ (ขยาย/เลื่อนตามกล้อง)
  const bv = (bake && bake.view) || view, bres = (bake && bake.res) || dpr;
  const exact = bres === dpr && bv.k === view.k && bv.ox === view.ox && bv.oy === view.oy;
  // มุมใกล้ (ซูม) = ชั้นอบความละเอียดสูงต้องย่อ/ขยายลงจอ — แพงมากถ้าทำทุกเฟรม (3 ชั้น × หลายล้านพิกเซล — สาเหตุเกมกระตุก 2026-11-09)
  //  กล้องนิ่ง = ย่อครั้งเดียวเก็บเป็นภาพขนาดจอ (SCREEN_CACHE) แล้ววางตรงพิกเซล · กล้องขยับ (เลื่อน/ซูม/จอสั่น) = ย่อสดเหมือนเดิม
  const vkey = `${g.canvas.width}x${g.canvas.height}|${dpr}|${view.k}|${view.ox}|${view.oy}|${bv.k}|${bv.x0}|${bv.y0}|${bres}`;
  const steady = vkey === lastViewKey;
  lastViewKey = vkey;
  const blit = (cv) => {
    if (exact) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(cv, 0, 0); return; }
    if (steady && typeof document !== "undefined") {
      let e = SCREEN_CACHE.get(cv);
      if (!e || e.key !== vkey) {
        const c = e && e.c.width === g.canvas.width && e.c.height === g.canvas.height ? e.c : document.createElement("canvas");
        c.width = g.canvas.width; c.height = g.canvas.height;
        const x = c.getContext("2d");
        x.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.ox, dpr * view.oy);
        x.drawImage(cv, bv.x0, bv.y0, cv.width / (bres * bv.k), cv.height / (bres * bv.k));
        e = { key: vkey, c };
        SCREEN_CACHE.set(cv, e);
      }
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(e.c, 0, 0);
      return;
    }
    L(); g.drawImage(cv, bv.x0, bv.y0, cv.width / (bres * bv.k), cv.height / (bres * bv.k));
  };
  // สนาม Colony: พื้น/ผนังกั้น/โดม วาดเป็น 3D ใต้แคนวาสนี้ (colony3d.js) — ชั้นนี้โปร่ง วาดไฮไลต์ + สไปรต์ 2D (บ้าน ตึก ต้นไม้ แคปซูล ตัวละคร)
  //  สไปรต์ยืนบนผิวโค้ง: วาดในกรอบหมุน (withLocalFrame) ให้ "ขึ้น" ชี้เข้าแกน — บนเพดานจึงเห็นกลับหัว
  const colony = !!st.colony;
  // Road Trip ตอนต่อสู้: ถนน/ฉาก/รถตู้วาดเป็น 3D ใต้แคนวาสนี้ (roadtrip/road3d.js createRoadUnderlay — ตัวฉายภาพแบบ Colony แต่พื้นเรียบ) — ชั้นนี้โปร่ง
  const rt3d = !!st.roadtrip3d;
  if (colony || rt3d) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height); }
  if (bake && bake.scene) {
    if (bake.sceneFrom && bake.mix < 1) {
      blit(bake.sceneFrom);
      g.globalAlpha = Math.max(0, bake.mix); blit(bake.scene); g.globalAlpha = 1;
    } else blit(bake.scene);
  }
  L();
  // จันทร์แดง (Wake Up 1 ของคุเรไน โอโตยะ — otoyaFx.js): บนฟ้าของฉาก หลังชั้นกระดาน
  if (st.otoya && st.otoya.night && !colony && !rt3d) otoyaMoon(g, now, lowQ);
  const f = { info, C, night, lowQ, view, marks: (bake && bake.marks) || {} };
  if (T.animBack && !colony && !rt3d) T.animBack(g, f, lowQ ? 0 : now);
  if (colony) {
    // พื้นวาดใน 3D — ช่องพิเศษที่เกิดระหว่างเกม (ธารน้ำแข็ง พื้นเปียก พื้นไฟ ...) วาดทับที่นี่ (เดิมไม่วาดเลย = มองไม่เห็นพื้นน้ำแข็ง · บั๊ก 2026-11-09)
    //  ช่องของสนามเอง (น้ำตื้น ลิฟต์ สายพาน ราง วาร์ป หอ) = ระบายลงพื้น 3D อยู่แล้ว — วาดซ้ำชั้น 2D = ขอบเส้นประลอยทับกำแพง/ตึก (เห็นทะลุ)
    for (const sp of info.special) {
      if (COLONY_FLOOR.has(sp.kind)) continue;
      bakeSpecial(g, sp, { night, C, area: info.area });
      animSpecial(g, sp, { night, lowQ, area: info.area }, lowQ ? 0 : now);
    }
  }
  else if (rt3d) {
    // Road Trip 3D: พื้นถนนวาดใน 3D — วาดเฉพาะช่องพิเศษที่เกิดระหว่างเกม (ไม่ใช่พื้นรถตู้)
    for (const sp of info.special) {
      if (sp.kind === "van") continue;
      bakeSpecial(g, sp, { night, C, area: info.area });
    }
  }
  else if (bake && bake.board) {
    // ชั้นคมจางเข้าทับพื้นแบบพื้นผิว (กล้องเพิ่งหยุด) — ไม่สลับวูบ
    if (bake.boardFade != null && bake.boardFade < 1) { drawGroundWarp(g, info, view, night, view); g.globalAlpha = bake.boardFade; blit(bake.board); g.globalAlpha = 1; }
    else blit(bake.board);
    L();
  }
  else if (st.warpGround && !colony) drawGroundWarp(g, info, bv, night, view); // กล้องขยับ: พื้นแบบพื้นผิว (เร็ว) แทนวาดสด
  else drawBoardLayer(g, info, bv, night);
  // กลางคืนจันทร์แดง (Wake Up 1 ของคุเรไน โอโตยะ — otoyaFx.js): ย้อมแดงทั้งจอ ใต้ตัวละคร
  if (st.otoya && st.otoya.night) otoyaNight(g);
  // วงเวทเคลื่อนไหว (ด่าน I)
  const pz = colony ? null : info.plaza;
  if (pz) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 800);
    g.save(); gEllipse(g, pz.x, pz.y, 1.55 * pz.sc); g.clip();
    const [cx, cy, s] = P(pz.x, pz.y);
    const gl = g.createRadialGradient(cx, cy, 0, cx, cy, s * 1.6 * pz.sc);
    gl.addColorStop(0, night ? `rgba(150,205,255,${0.35 + 0.25 * pulse})` : `rgba(127,184,230,${0.2 + 0.18 * pulse})`); gl.addColorStop(1, "rgba(127,184,230,0)");
    g.fillStyle = gl; g.fillRect(cx - s * 2 * pz.sc, cy - s * 2 * pz.sc, s * 4 * pz.sc, s * 4 * pz.sc); g.restore();
    g.save(); g.setLineDash([6, 7]); g.lineDashOffset = -now / 60; g.strokeStyle = C.line; g.lineWidth = 1.4; gEllipse(g, pz.x, pz.y, 1.8 * pz.sc, 0, 60); g.stroke(); g.restore();
  }
  // ช่องพิเศษ/จุดฟื้นฟูขยับเบาๆ (lowQ = หยุดนิ่ง)
  const tA = lowQ ? 0 : now;
  if (!colony) for (const sp of info.special) if (!(rt3d && sp.kind === "van")) animSpecial(g, sp, { night, lowQ, area: info.area }, tA);
  if (info.heal.length && !pz && !colony && info.area !== EOS_HEAL_AREA) animHeal(g, info, { night, C, area: info.area }, tA);
  // ผู้นำแห่งตระกูลเรียวกิ (ryougiFx.js): ช่องพัง (terrain "chasm") · กองเลือด · เนตรมณะ (มืดจาง + รอยร้าวแดง) · ส่วนบนพื้นของฉาก — ใต้ไฮไลต์
  const ry = st.ryougi || null, rFx = fx.some((e) => isRyougiFx(e.kind));
  drawRyougiGround(g, ry, info, fx, now, lowQ, { view, C });
  // เอมิยะ ชิโร่ (emiyaFx.js): โลก Unlimited Blade Works — พื้นโทนส้มซีเปีย (ใต้ไฮไลต์)
  const em = st.emiya || null, emWorld = emiyaWorldOn(em, fx, now);
  if (emWorld) drawEmiyaWorld(g, em, info, fx, now, lowQ);
  // ม่านแดง (ระบำเขม่า · เคท): พื้นมืด → ม่านรอบขอบเรียงความลึกกับตัวละคร → เขม่าในอากาศ — sootStorm.js
  const storms = st.storms && st.storms.length ? st.storms : null;
  if (storms) drawStormGround(g, storms, info, now, lowQ);
  // หมอกพิษ / หลุมดำที่ค้างบนกระดาน (ปฏิกิริยาธาตุของ Master — masterFx.js drawElemFields)
  if (st.elemFields && st.elemFields.length) drawElemFields(g, st.elemFields, now, lowQ);
  // เกรย์ชาร์จรองโกมิเนียต / กำลังยิง (grayFx.js): สนามมืดลง + แนวลำแสงสีทอง — ใต้ไฮไลต์และตัวละคร
  const grays = st.grays && st.grays.length ? st.grays : null;
  if (grays || fx.some((e) => e.kind === "grayBeam")) drawGrayGround(g, grays, fx, view, now, lowQ);
  // กิลกาเมช (gilFx.js): พายุ (ฟ้ามืดแดง) · ช่องที่สายฟ้าเล็ง · แนว Enuma Elish ที่รอยิง · อาวุธที่ปักค้าง · วิมานะใต้หมาก — ใต้ไฮไลต์และตัวละคร
  const gils = st.gils && st.gils.length ? st.gils : null;
  if (gils || fx.some((e) => e.kind === "gilEnuma")) drawGilGround(g, gils, units, fx, now, lowQ, view);
  // ยูกินับถอยหลังเกิดใหม่เป็นประตู (yukiFx.js): กระดานมืดลง ~25% — เรียกทุกเฟรมให้ค่อยๆ มืด/สว่างคืนเอง
  drawYukiDim(g, units, view, now);
  const ferns = st.ferns && st.ferns.length ? st.ferns : null; // เฟิร์น: แสงปลายคทา (วาดหลังตัวละคร — drawFernAir)
  // วงเพลงของยูนะ (yunaFx.js) — บนพื้น ใต้ไฮไลต์
  if (st.songs && st.songs.length) drawYunaZones(g, st.songs, info, now, lowQ);
  // ดิเอโก้ (diegoFx.js): แอ่งน้ำมัน · พื้นไหม้ · ขี้เถ้า · ตาข่ายของเรา — ใต้ไฮไลต์ · ระหว่างหยุดเวลาทุกอย่างหยุดขยับ (amb)
  const amb = diegoAmbientNow(st.timeFreeze || null, now);
  const dGround = st.diego || null, dFx = dGround || fx.some((e) => isDiegoFx(e.kind));
  if (dFx) drawDiegoGround(g, dGround, fx, now, lowQ, amb);
  // เอมิยะ คริซุงุ (kiriFx.js): กับดักระเบิด ไฟแดงกะพริบ (ทุกคนเห็น) — ใต้ไฮไลต์
  if (st.kiri) drawKiriGround(g, st.kiri, now, lowQ);
  // โลกคู่ขนาน (วาเลนไทน์): ตะเข็บบางรอบขอบกระดาน — บนพื้น ใต้ไฮไลต์
  if (st.dimLayers && st.dimLayers.length) valentineDimGround(g, info, st.dimLayers, now, lowQ);
  // เซลิน (celineFx.js): พรมกลีบใต้พุ่มดอกไม้ · วงเถาวัลย์ทองใต้ราชาดอกไม้ — ใต้ไฮไลต์
  const cel = st.celine || null, cFx = fx.some((e) => isCelineFx(e.kind));
  if (cel) drawCelineGround(g, cel, fx, now, lowQ, units);
  // Moon Cell (moonFx.js): พื้นที่คำสาปที่เตือนไว้ · ช่องเสาข้อมูลที่จะพุ่ง — ใต้ไฮไลต์
  if (st.moon && !colony) drawMoonGround(g, st.moon, info, now, lowQ);
  // Fodlan (board/fodlan/): ของบนพื้นของด่าน + ช่องเตือนกะพริบแดง — ใต้ไฮไลต์
  const fd = st.fodlan || null;
  setCullView(st.uiK && !colony ? view : null); // สนาม Eos (กล้อง RTS): ตัดของนอกจอ
  if (fd) drawFodlanGround(g, fd, info, now, lowQ);
  // Road Trip: เส้นถนนเลื่อน (บนรถตู้) · พื้นในรถ · รอยเท้า — ใต้ไฮไลต์
  const rtOn = isRtArea(info.area);
  if (rtOn) { UNIT_FRAME.night = !!night; if (!rt3d) rtGround(g, info, units, now, lowQ, night); }
  // ทราฟาก้า ลอว์ (lawFx.js): พื้น Room + ด้านหลังโดม — ใต้ไฮไลต์ (เรียกทุกเฟรม: จำ Room ที่มีอยู่แล้วตอนเฟรมแรก ไม่เล่นฉากกางซ้ำ)
  const law = st.law || null, lFx = fx.some((e) => isLawFx(e.kind));
  drawLawGround(g, law, fx, now, lowQ);
  // Colony: ช่องไฮไลต์ (เดิน/ตี/สกิล/พื้นที่/อันตราย/เป้า) วาดลงพื้นในฉาก 3D (colony3d.paintHighlights) — กำแพง/ตึกบังได้ ไม่เห็นทะลุ
  drawHighlights(g, info, colony ? { ...hl, danger: new Set(), move: new Set(), attack: new Set(), skill: new Set(), aoe: new Set(), ghost: new Set(), target: null } : hl, hover, now);
  // ของบนพื้นใต้ตัวละครของธีม (ถ้ามี)
  if (T.overBoard && !colony && !rt3d) T.overBoard(g, f, now);
  // เรียงความลึก (ตามมุมมอง): สิ่งกีดขวาง + ร้าน + ตัวละคร
  const items = [];
  // ตัวใหญ่: จุดกลางตัว (เรียงความลึก/จางสิ่งกีดขวางที่อยู่หลัง)
  const uv = units.map((u) => { const h = Math.max(1, u.size | 0) / 2; return colony || rt3d ? [0, depthOf(u.rx + h + (u.ox || 0), u.ry + h + (u.oy || 0))] : toView(u.rx + h + (u.ox || 0), u.ry + h + (u.oy || 0)); });
  // Colony: จุดบนจอของหมาก (ตัดสินว่าสิ่งกีดขวางสูงบังตัวที่อยู่ไกลกว่าไหม — เทียบในกรอบหมุนของสิ่งกีดขวาง)
  //  เทียบทั้งเท้าและหัว (z ≈ ความสูงหมาก) — หมากที่ยืนเยื้องหลังสิ่งปลูกสร้างแค่ครึ่งตัวก็ทำให้จาง
  const usc = colony ? units.map((u) => { const h = Math.max(1, u.size | 0) / 2, x = u.rx + h + (u.ox || 0), y = u.ry + h + (u.oy || 0); return [P(x, y), P(x, y, 0.75 + (u.hz || 0))]; }) : null;
  const behind = (x, y) => {
    if (rt3d) return false; // Road Trip 3D: ไม่จางสิ่งกีดขวาง (มุมกล้อง 3D)
    if (colony) {
      const fr = localFrame(x + 0.5, y + 0.5), d = depthOf(x + 0.5, y + 0.5);
      if (!fr) return false;
      const c = Math.cos(fr.th), s = Math.sin(fr.th);
      const S = fr.s * fr.k;
      return usc.some((pp, i) => {
        if (!(uv[i][1] < d)) return false;
        return pp.some((p) => {
          if (!Number.isFinite(p[0])) return false;
          const dx = p[0] - fr.x, dy = p[1] - fr.y, lx = dx * c + dy * s, ly = -dx * s + dy * c;
          return Math.abs(lx) < S * 0.85 && ly < S * 0.3 && ly > -S * 2.6;
        });
      });
    }
    const [vx, vy] = toView(x + 0.5, y + 0.5);
    return uv.some(([ux, uy]) => Math.abs(ux - vx) < 0.9 && uy < vy && uy >= vy - 2.2);
  };
  // Colony: วาด fn ในกรอบหมุนรอบ (ax, ay) · กล่องชี้ของหมาก (boxes) ที่เพิ่มระหว่างนั้น = แปลงกลับเป็นจอจริง
  const occ = colony && st.colonyOcclude != null ? st.colonyOcclude : null, burn = colony && st.colonyBurn != null ? st.colonyBurn : null; // Colony: แถวหลังม่านเหล็กที่ปิดแล้ว = ไม่วาด
  const UNIT_MIN_S = 62;
  let frameK = 1;
  const onWall = (ax, ay, fn, keep = false) => {
    if (!colony) return fn;
    return () => {
      if (occ != null && ay < occ) return;
      if (burn != null && ay > burn) return; // ระเบิดตอนจบ: กำแพงไฟกลืนไปแล้ว
      const fr = localFrame(ax, ay);
      if (!fr) return;
      // หมาก (keep): ไกลแค่ไหนก็ไม่เล็กกว่าช่องขนาด UNIT_MIN_S บนจอ — รูป/หลอดเลือดอ่านออกเสมอ
      if (keep) fr.k = Math.max(fr.k, Math.min(1.8, UNIT_MIN_S / fr.s));
      frameK = fr.k;
      const n0 = boxes.length;
      // ไกลกล้อง = จางลงตามหมอกของฉาก 3D (ปลายอุโมงค์ไม่รก) · หมาก (keep) จางแค่นิดเดียว — ต้องเห็นศัตรูเสมอ
      //  นับจากระยะโฟกัสของกล้อง (colonyNear) — ซูมออกแล้วสิ่งปลูกสร้างรอบตัวไม่หายไปตามหมอก (บั๊ก "ขยับกล้องแล้วตึกหาย" 2026-11-09)
      const near = Number.isFinite(st.colonyNear) ? st.colonyNear : 5;
      const dist = -depthOf(ax, ay);
      let far = keep ? Math.min(0.3, Math.max(0, (dist - near - 10) / 30)) : Math.min(0.75, Math.max(0, (dist - near - 5) / 14));
      // สิ่งปลูกสร้างที่อยู่ติดกล้อง (ผนังข้าง/เพดานเหนือหัว) = จางหาย แทนการขยายใหญ่จนแตกเต็มมุมจอ
      if (!keep && dist < 3.2) far = Math.max(far, Math.min(1, (3.2 - dist) / 1.6));
      if (far >= 0.99) return;
      if (far > 0) { g.save(); g.globalAlpha *= 1 - far; }
      withLocalFrame(g, fr, fn);
      if (far > 0) g.restore();
      for (let i = n0; i < boxes.length; i++) {
        const b = boxes[i], pts = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].map(([x, y]) => frameToScreen(fr, x, y));
        b.x0 = Math.min(...pts.map((q) => q[0])); b.x1 = Math.max(...pts.map((q) => q[0]));
        b.y0 = Math.min(...pts.map((q) => q[1])); b.y1 = Math.max(...pts.map((q) => q[1]));
      }
    };
  };
  const boxes = [];
  const octx = { area: info.area, C, night, cols: info.cols, hitT: st.hitT || null };
  const statics = []; // ของนิ่งของสนาม Eos — ดู STATIC_CACHE
  // หนามน้ำแข็ง: Lv ที่แสดง = ค่าที่ BoardStage ค้างไว้ระหว่างเล่นเหตุการณ์ (ice.lv) หรือ terrain · พุ่งขึ้นจากพื้นตาม fx iceSpikeUp
  const ice = st.ice || null; // { lv: { "x,y": Lv ที่แสดงแทน terrain (0 = ซ่อน) } } — BoardStage ค้างไว้ระหว่างเล่น iceFx
  const iceLv = ice && ice.lv ? ice.lv : null;
  const pushSpike = (x, y, lv) => {
    if (!(lv > 0)) return;
    const fade = behind(x, y);
    items.push({ d: depthOf(x + 0.5, y + 0.5) + 0.05, f: () => drawIceSpike(g, x, y, lv, { rise: iceSpikeRise(fx, x, y, now), alpha: fade ? 0.45 : 1 }) });
  };
  for (const t of info.terrain) {
    if (t.kind === "chasm") continue; // ช่องพังของเรียวกิ = หลุมบนพื้น (drawRyougiGround) ไม่มีสไปรต์
    if (t.kind === "breach") continue; // Colony: รูรั่ว = หลุมบนพื้น 3D (colony3d)
    // Road Trip: ช่องของวัตถุ (rt_<ชนิด>) วาดทั้งชิ้นใน rtItems · ของข้างทาง (หิน ต้นไม้ ป้าย กรวย รถพัง) วาดที่นี่
    if (rtOn && rtSkipTerrain(t.kind)) continue;
    if (rtOn && rt3d && isRtObstacle(t.kind)) continue; // Road Trip 3D: สิ่งกีดขวางข้างทางเป็นโมเดล 3D ในฉากใต้กระดาน
    if (rtOn && isRtObstacle(t.kind)) { if (onScreen(t.x + 0.5, t.y + 0.5, 3)) { const tt = t; items.push({ d: depthOf(t.x + 0.5, t.y + 0.5) + 0.05, f: () => drawRtObstacle(g, tt, { night, area: info.area, info, terrainKind: info.terrainKind }, now) }); } continue; }
    // Colony: บ้าน · ตึก · ต้นไม้ · ป้อมปืน = โมเดล 3D ยึดพื้นในฉาก (colonyModels.js) — ชั้น 2D ไม่วาด
    if (colony && (t.kind === "house" || t.kind === "tower" || t.kind === "tree" || t.kind === "turret")) continue;
    // กำแพงน้ำแข็งของเซลิน — งอกขึ้นตาม fx celineWall · ตัวละครยืนหลัง = จาง
    if (t.kind === "icewall") {
      // หนามหิน Takt ของลอว์ (ชั้นหนามเดียวกัน · look "lawRock") — พุ่งขึ้นตามฉาก lawTakt
      if (law && isLawRock(law, t.x, t.y)) {
        const fade = behind(t.x, t.y), rise = lFx ? lawRockRise(fx, t.x, t.y, now) : 1;
        items.push({ d: depthOf(t.x + 0.5, t.y + 0.5) + 0.05, f: () => drawLawRock(g, t.x, t.y, { rise, alpha: fade ? 0.5 : 1, now, lowQ }) });
        continue;
      }
      const fade = behind(t.x, t.y), rise = cFx ? celineWallRise(fx, t.x, t.y, now) : 1;
      items.push({ d: depthOf(t.x + 0.5, t.y + 0.5) + 0.05, f: () => drawCelineWall(g, t.x, t.y, t.conn, { rise, alpha: fade ? 0.45 : 1, now, lowQ }) });
      continue;
    }
    const sLv = iceSpikeLv(t.kind);
    if (sLv) { const k = key(t.x, t.y); pushSpike(t.x, t.y, iceLv && k in iceLv ? iceLv[k] : sLv); continue; }
    if (!onScreen(t.x + 0.5, t.y + 0.5, 4)) continue; // นอกจอ = ไม่วาด (เผื่อของสูง ~4 ช่อง)
    const fade = (TALL_KINDS.has(t.kind) || isFodlanTall(t.kind, info.area)) && behind(t.x, t.y);
    // สนาม Eos (กล้อง RTS): ตึก/กำแพง/ต้นไม้/หิน/อู่ ไม่ขยับ → เก็บไปวาดรวมเป็นภาพเดียว (STATIC_CACHE) ไม่วาดใหม่ทุกเฟรม
    if (st.uiK && !colony && !fade && STATIC_OB.has(t.kind)) { statics.push({ d: depthOf(t.x + 0.5, t.y + 0.5) + 0.05, t }); continue; }
    const f0 = () => drawObstacle(g, t, octx, now);
    items.push({ d: depthOf(t.x + 0.5, t.y + 0.5) + 0.05, f: onWall(t.x + 0.5, t.y + 0.5, fade ? () => { g.save(); g.globalAlpha = 0.38; f0(); g.restore(); } : f0) });
  }
  // หนามที่ server เอาออกแล้วแต่ยังค้างไว้ (แตกตอนเหตุการณ์ถึง) / ยังไม่อยู่ใน terrain
  if (iceLv) for (const [k, lv] of Object.entries(iceLv)) {
    if (!(lv > 0)) continue;
    const [x, y] = parseKey(k);
    if (!iceSpikeLv(String((info.terrainKind && info.terrainKind[k]) || ""))) pushSpike(x, y, lv);
  }
  // Colony: แคปซูลร้าน 3 แบบ · น้ำพุ · หอสังเกตการณ์ = โมเดล 3D ในฉาก (colonyModels.js)
  const caps = colony && Array.isArray(st.colonyCapsule) ? st.colonyCapsule : []; // ใช้ตัดสินป้ายร้าน (ลงถึงพื้นแล้ว)
  // ร้านบนกระดาน (state.shops — สูงสุด 3 ร้าน · ร้านปกติ 1×1 · พ่อค้าเร่ 2×1 แบบ 2.5D) — เรียงความลึกที่กลางพื้นที่ · ตัวละครยืนหลังร้าน = ร้านจาง
  const shopList = Array.isArray(st.shops) ? st.shops.filter((sh) => sh && Number.isFinite(sh.x) && Number.isFinite(sh.y)) : [];
  // Road Trip: ร้าน = อาคารมินิมาร์ท/สำนักงานบนแผนที่ (props.js) — ไม่วาดแผงร้านเล็ก/ป้ายร้าน
  if (!colony && !rtOn) for (const sh of shopList) {
    if (sh.kind === "capsule") continue;
    if (sh.kind === "nautilus") continue; // Nautilus: ร้าน = ตัวเรือที่ท่าจอด (board/fodlan/shipArt.js วาดเอง — ไม่วาดแผงร้านทับ)
    const [w, h] = shopDims(sh);
    if (!onScreen(sh.x + w / 2, sh.y + h / 2, 2.5, Math.max(w, h))) continue;
    let fade = false;
    for (let dy = 0; dy < h && !fade; dy++) for (let dx = 0; dx < w && !fade; dx++) fade = behind(sh.x + dx, sh.y + dy);
    items.push({ d: depthOf(sh.x + w / 2, sh.y + h / 2) + 0.05, f: () => { if (fade) { g.save(); g.globalAlpha = 0.45; } drawShopStall(g, sh.kind, sh.x, sh.y, now, night); if (fade) g.restore(); } });
  }
  // Colony: แถบเลือด/ป้ายของหมากไม่ย่อตามระยะ (ชดเชย k ของกรอบหมุน) + หนาขึ้นอีกนิดให้อ่านง่ายบนผิวโค้ง
  const unitDraw = (u, ax, ay) => () => {
    // สนาม Eos (กล้อง RTS ซูมใกล้): ป้าย/แถบเลือดบนหมากขนาดบนจอคงที่ ไม่ขยายตามซูม (ผู้ใช้สั่ง 2026-11-09 — ป้ายใหญ่เต็มจอ)
    if (!colony && st.uiK) { UNIT_FRAME.uiPiece = true; try { drawAnyUnit(g, u, now, boxes); } finally { UNIT_FRAME.uiPiece = false; } return; }
    if (!colony) { drawAnyUnit(g, u, now, boxes); return; }
    // แถบ/ป้ายบนหมาก: ขนาดบนจอคงที่ (ชดเชยการย่อ/ขยายของกรอบ) — หนาพอมองง่าย
    UNIT_FRAME.uiK = Math.min(2.6, 1.3 / (frameK || 1));
    UNIT_FRAME.piece3d = true;
    try { drawAnyUnit(g, u, now, boxes); } finally { UNIT_FRAME.piece3d = false; UNIT_FRAME.uiK = 1; }
  };
  // ลอว์: ตัวที่ถูกมาร์ก = ร่างถูกตัดเป็นชิ้นลอยแยก (lawSliced อัปเดต/อบชิ้นส่วน · หมากวาดแบบ lawCut)
  const lCut = law || lFx ? lawSliced(law, units, fx, now, g, (c, uu) => drawAnyUnit(c, uu, now, null)) : null;
  units.forEach((u0, i) => { const u = lCut && lCut.has(u0.id) ? { ...u0, lawCut: true } : u0; const h = Math.max(1, u.size | 0) / 2, ax = u.rx + h + (u.ox || 0), ay = u.ry + h + (u.oy || 0); items.push({ d: uv[i][1] + (u.isActor ? 0.001 : 0), f: onWall(ax, ay, unitDraw(u, ax, ay), true) }); });
  // กรงจักรหนู (โซระ): ครึ่งหลังวาดก่อนตัวที่อยู่ข้างใน · ครึ่งหน้าวาดทับ
  for (const e of fx) {
    if (e.kind !== "soraWheel") continue;
    const h = Math.max(1, e.size | 0) / 2, [wx, wy] = wheelAt(e, now - e.t0, lowQ || REDUCED), d = depthOf(wx + h, wy + h);
    items.push({ d: d - 0.003, f: () => wheelFx(g, e, now, lowQ, false) }, { d: d + 0.003, f: () => wheelFx(g, e, now, lowQ, true) });
  }
  // กระดองเต่า (โซระ Tutle Frame): ครอบคน = โดมรอบตำแหน่งที่วาดของคนนั้น (ตามตอนถูกดัน) วาดทับหมาก · วางบนพื้น = กระดองที่ช่อง
  if (Array.isArray(st.soraShells)) for (const sh of st.soraShells) {
    const u = sh.on ? units.find((x) => x.id === sh.on) : null;
    if (sh.on && !u) continue;
    const n = u ? Math.max(1, u.size | 0) : 1, x = u ? u.rx + (u.ox || 0) : sh.x, y = u ? u.ry + (u.oy || 0) : sh.y;
    items.push({ d: depthOf(x + n / 2, y + n / 2) + (u ? 0.004 : -0.002), f: () => drawSoraShell(g, { x, y, size: n, on: sh.on }, now, lowQ) });
  }
  // เคท: ปีกเขม่า (ฉากบิน + ปีกค้างในม่านแดง u.wings) วาดหลังหมากของตัวเอง
  for (const e of fx) {
    const d = isShadowFx(e.kind) ? shadowBackDepth(e, now) : null;
    if (d != null) items.push({ d, f: () => shadowFx(g, e, now, lowQ, true, units) });
  }
  for (const u of units) {
    const d = idleWingsDepth(u, fx, now);
    if (d != null) items.push({ d, f: () => drawIdleWings(g, u, now, lowQ) });
  }
  if (storms) stormWallItems(items, g, storms, info, now, lowQ);
  // ลูกเหล็กของไจโรบนพื้น (หมุนตลอด + วงสีเจ้าของ) — เรียงความลึกกับตัวละคร
  if ((st.gyroBalls && st.gyroBalls.length) || fx.some((e) => e.kind === "gyroThrow")) gyroBallItems(items, g, st.gyroBalls, fx, now, lowQ);
  // เปลวไฟกองไฟของดิเอโก้ — เรียงความลึกกับตัวละคร
  if (dFx) diegoFireItems(items, g, dGround, fx, now, lowQ, amb);
  // วาเลนไทน์: ธงปัก (โบกตลอด) + ผ้าในฉาก + ภาพที่จับไว้ของตัวที่หายจาก state แล้ว — เรียงความลึกกับตัวละคร
  const vFlags = st.valentine && Array.isArray(st.valentine.flags) ? st.valentine.flags : null, vFx = fx.some((e) => isValentineFx(e.kind));
  if (vFlags || vFx) valentineItems(items, g, vFlags, fx, now, lowQ);
  // เซลิน: พุ่มดอกไม้ (ครึ่งหลัง/หน้าตัวละคร) · กำแพงที่ค้างไว้ถึงจังหวะปะทะ · พรีวิวกำแพงตอนเลือกช่อง
  if (cel) celineItems(items, g, { ...cel, terrain: info.terrainKind }, fx, now, lowQ);
  // ลอว์: วัตถุลอย (ก้อนพื้นที่ถูกตัด) + ร่างที่ถูกตัด (มาร์ก)
  if (law || lCut) lawItems(items, g, law, units, fx, now, lowQ);
  // Fodlan: เรือ · เครื่องยิงหิน · ธง · กองไฟ · บัลลังก์ … (เรียงความลึกกับตัวละคร)
  if (fd) fodlanItems(items, g, fd, info, units, now, lowQ);
  // Road Trip: มินิมาร์ท อู่ ตู้น้ำมัน ชิงช้าสวรรค์ … + รถตู้จอด/ห้องในรถตู้ (เรียงความลึกกับตัวละคร)
  if (rtOn && !rt3d) rtItems(items, g, info, units, now, lowQ, night); // Road Trip 3D: รถตู้/ของในรถเป็นโมเดล 3D แล้ว
  // เรียวกิ: เงาติดตาตอนพุ่ง/ตี · ใบมีดที่มือ · กลีบวนรอบตัว · ตาเรือง
  if (ry || rFx) ryougiItems(items, g, ry, units, fx, now, lowQ, (u) => drawAnyUnit(g, u, now, null));
  // ชิโร่: ดาบปักพื้นในโลก UBW · อาวุธที่ถือลอยข้างตัว
  if (em || emWorld) emiyaItems(items, g, em, units, fx, now, lowQ, info);
  if (vFx) for (const pu of valentinePuppets(fx, now, lowQ)) items.push({ d: depthOf(pu.rx + 0.5 + (pu.ox || 0), pu.ry + 0.5 + (pu.oy || 0)) + 0.0005, f: () => drawAnyUnit(g, pu, now, null) });
  // ของนิ่ง (สนาม Eos): กล้องนิ่ง 2 เฟรมติด = วาดรวมลงแคนวาสเดียวแล้ววางทีเดียว (ประหยัด ~10–20ms/เฟรมตอนนิ่งที่จอ 1600×900)
  //  ใต้ตัวละครทั้งหมด → ของนิ่งที่อยู่หน้าตัวละครและทับกล่องของตัวนั้น วาดซ้ำทับอีกที (ลำดับบัง/ถูกบังยังถูก)
  //  กล้องขยับ (คีย์เปลี่ยนทุกเฟรม) = วาดสดในลำดับความลึกตามเดิม
  if (statics.length) {
    let sig = statics.length;
    for (const o of statics) sig = (sig * 31 + o.t.x * 97 + o.t.y * 13 + o.t.kind.length) % 1000000007;
    const vc = viewCenter();
    const skey = `${g.canvas.width}x${g.canvas.height}|${dpr}|${view.k}|${view.ox}|${view.oy}|${viewTurn()}|${vc ? vc.x + "," + vc.y : ""}|${pitchOf()}|${night}|${sig}|${st.fodlan ? JSON.stringify(st.fodlan.lightsOff || null) : ""}`;
    const sc = STATIC_CACHE;
    if (sc.key !== skey && sc.prev === skey && typeof document !== "undefined") {
      if (!sc.cv) sc.cv = document.createElement("canvas");
      if (sc.cv.width !== g.canvas.width || sc.cv.height !== g.canvas.height) { sc.cv.width = g.canvas.width; sc.cv.height = g.canvas.height; }
      const cg = sc.cv.getContext("2d");
      cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, sc.cv.width, sc.cv.height);
      cg.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.ox, dpr * view.oy);
      for (const o of statics.slice().sort((a, b) => a.d - b.d)) drawObstacle(cg, o.t, octx, now);
      sc.key = skey;
    }
    sc.prev = skey;
    if (sc.key === skey) {
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(sc.cv, 0, 0); g.restore(); L();
      // ตัวละครที่มีของนิ่งอยู่ข้างหน้าและทับกัน → วาดของนิ่งชิ้นนั้นซ้ำหลังตัวละคร (เรียงตามความลึก)
      const ub = units.filter((u) => !u.corpse).map((u) => {
        const h = Math.max(1, u.size | 0) / 2, ax = (u.rx != null ? u.rx : u.x) + h + (u.ox || 0), ay = (u.ry != null ? u.ry : u.y) + h + (u.oy || 0);
        const [sx, sy, s] = P(ax, ay);
        return { d: depthOf(ax, ay), x0: sx - s * h * 1.5, x1: sx + s * h * 1.5, y0: sy - s * 1.9 * h * 2, y1: sy + s * 0.3 };
      });
      for (const o of statics) {
        const [sx, sy, s] = P(o.t.x + 0.5, o.t.y + 0.5);
        const b = { x0: sx - s * 1.0, x1: sx + s * 1.0, y0: sy - s * 3.2, y1: sy + s * 0.6 };
        if (ub.some((u) => o.d > u.d && b.x0 < u.x1 && b.x1 > u.x0 && b.y0 < u.y1 && b.y1 > u.y0)) items.push({ d: o.d, f: () => drawObstacle(g, o.t, octx, now) });
      }
    } else for (const o of statics) items.push({ d: o.d, f: () => drawObstacle(g, o.t, octx, now) });
  }
  items.sort((a, b) => a.d - b.d);
  for (const it of items) it.f();
  if (st.otoya && st.otoya.links && st.otoya.links.length) otoyaLinks(g, st.otoya.links, units, now, lowQ); // สายโน้ตดนตรีในหัวใจ (เหนือตัวละคร)
  if (units.some((u) => u.chain)) magnaChains(g, units, now, lowQ); // โซ่ Soul Chain ของแม็กน่า (เหนือตัวละคร · ฟ้า = Finisher รอทำงาน)
  if (storms) drawStormAir(g, storms, info, now, lowQ);
  // ป้าย "🏪 N" (เหลือ N เทิร์น) เหนือกลางร้านแต่ละร้าน · Colony = เฉพาะแคปซูลที่ลงถึงพื้นแล้ว
  if (!rtOn) for (const sh of shopList) {
    if (!(sh.turnsLeft > 0) || (colony ? !caps.some((c) => c.x === sh.x && c.y === sh.y && !(c.z > 0.05)) : sh.kind === "capsule" || sh.capsule)) continue;
    const [w, h] = colony ? [1, 1] : shopDims(sh);
    // ร้านอยู่หลังโดมเขม่า (ม่านแดง — มุมคนนอก) = ป้ายถูกโดมบังส่วนที่ซ้อนกัน
    const hide = storms && behindDome(storms, sh.x, sh.y) && clipOutDomes(g, storms);
    drawShopLabel(g, sh.x, sh.y, sh.turnsLeft, w, h, colony ? 1.7 : (SHOP_TOP_Z[sh.kind] || 1.6) - 0.05, sh.capsule ? "capsule" : sh.kind, night);
    if (hide) g.restore();
  }
  // อนุภาค (ข้ามเมื่อ lowQ) — ไม่วาดทับโดมเขม่าของม่านแดง (คนนอกต้องมองไม่เห็นข้างใน)
  if (!lowQ) {
    const domeClip = storms ? clipOutDomes(g, storms) : false;
    if (pz) {
      for (let i = 0; i < 18; i++) {
        const a = i * 2.4, r = (i % 6) / 6 * 1.6 * pz.sc, ph = (now / (2000 + i * 170) + i * 0.37) % 1;
        const [sx, sy] = P(pz.x + Math.cos(a) * r, pz.y + Math.sin(a) * r, 0.2 + ph * 1.8);
        g.globalAlpha = Math.sin(ph * Math.PI) * (night ? 0.95 : 0.7);
        g.fillStyle = C.spark; g.beginPath(); g.arc(sx, sy, night ? 2.6 : 2, 0, 7); g.fill();
      }
      if (night) {
        for (let i = 0; i < 26; i++) {
          const ph = (now / (5000 + i * 300) + i * 0.21) % 1, a = i * 1.7 + now / 4000;
          const [x, y] = P(pz.x + Math.cos(a) * (2 + (i % 5) * 0.9), pz.y + Math.sin(a * 1.3) * (2 + (i % 4)), 0.4 + Math.sin(ph * 6.28) * 0.4 + 1);
          g.globalAlpha = 0.5 + 0.5 * Math.sin(now / 300 + i); g.fillStyle = "#fff3b0"; g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill();
        }
      }
      g.globalAlpha = 1;
    }
    if (T.ambient && !colony && !rt3d) { g.save(); T.ambient(g, f, now); g.restore(); }
    if (domeClip) g.restore();
  }
  // หอกรองโกมิเนียตลอยเหนือหัวเกรย์ + ละอองทองวนเข้าหอก (ทับตัวละคร)
  if (grays) drawGrayAir(g, grays, units, now, lowQ);
  // กิลกาเมช: ระลอกทองหลังตัว / ดาบ EA หมุนข้างตัว + ออร่าเกราะทอง · ฝนของพายุ (ทับตัวละคร)
  if (gils) drawGilAir(g, gils, units, fx, now, lowQ, view);
  // เฟิร์น: แสงที่ปลายคทา (Zoltraak ครั้งที่ 6 พร้อม / เพิ่มระยะ) — ทับตัวละคร
  if (ferns) drawFernAir(g, ferns, units, now, lowQ);
  // ราชาดอกไม้ (เซลิน): มงกุฎลอย + กลีบโคจร + ผีเสื้อ (ทับตัวละคร)
  if (cel) drawCelineAir(g, cel, units, now, lowQ);
  // ลอว์: ผิวโดม Room ด้านหน้า · รอยตัด (มาร์ก) · หัวใจ · ท่าไม้ตายที่รอตี (ทับตัวละคร)
  if (law) drawLawAir(g, law, units, fx, now, lowQ);
  // Fodlan: สภาพอากาศ/ฉากเหตุการณ์ (ฝน ฟ้าผ่า ไฟมังกร ซึนามิ …) + หมอกนอกระยะมองเห็น — ทับตัวละคร
  if (fd) drawFodlanAir(g, fd, info, units, now, lowQ, view);
  // Road Trip: หลังคาปั๊ม · สายโคม · อนุภาคกิจกรรม — ทับตัวละคร
  if (rtOn) rtAir(g, info, units, now, lowQ, night);
  // เรียวกิหลังดับสิ้นซะ: กลีบซากุระปลิวทั่วกระดาน (ทับตัวละคร)
  if (ry) drawRyougiAir(g, ry, info, fx, now, lowQ);
  // โลก UBW ของชิโร่: เฟืองยักษ์ + ประกายไฟ (ทับตัวละคร)
  if (emWorld) drawEmiyaSky(g, em, info, fx, now, lowQ, view);
  // หยุดเวลา (เดอะเวิลด์): ซีเปีย + แถบสีกลับด้านที่ขอบวง → วาดดิเอโก้ (+ม้า) ซ้ำให้สีปกติ — ใต้เอฟเฟกต์ครั้งเดียว (ของที่ค้างกลางอากาศยังมีสี)
  if (st.timeFreeze || fx.some((e) => e.kind === "diegoStop" || e.kind === "diegoResume")) {
    diegoTimeLayer(g, { info, view, units, fx, freeze: st.timeFreeze || null, now, lowQ, redraw: (u) => drawAnyUnit(g, u, now, null) });
  }
  // Return to Zero ของโจรุโน่: ครอบทั้งกระดาน → โจรุโน่ + ผู้โจมตีสีปกติ
  if (fx.some((e) => e.kind === "gioRewind")) gioRewindLayer(g, { info, view, units, fx, now, lowQ, redraw: (u) => drawAnyUnit(g, u, now, null) });
  // มุมมองของมิติ (วาเลนไทน์): มองจากหลังผ้า = ซีดลง ขอบน้ำเงินจาง ตัวเราสีปกติ (โลกคู่ขนานไม่เปลี่ยนสี)
  if (st.dimLayers && st.dimLayers.length) valentineDimLayer(g, { view, layers: st.dimLayers, now, lowQ, units, dpr, redraw: (u) => drawAnyUnit(g, u, now, null) });
  // เอฟเฟกต์ครั้งเดียว
  let rctx = null;
  for (const e of fx) {
    if (occ != null && Number.isFinite(e.y) && e.y < occ) continue;
    const p = (now - e.t0) / (FX_DUR[e.kind] || 1000);
    if (e.kind === "emote") emoteFx(g, e, p);
    else if (e.kind === "teamPing") teamPingFx(g, e, p, now);
    else if (e.kind === "slash") slashFx(g, e.x, e.y, p, e.rgb || "255,255,255");
    else if (e.kind === "burst") burstFx(g, e.x, e.y, p, e.rgb || "255,211,106");
    else if (e.kind === "beam") beamFx(g, e, now, lowQ);
    else if (e.kind === "quake") quakeFx(g, e, now, lowQ);
    else if (e.kind === "darkWave") darkWaveFx(g, e, now, lowQ);
    else if (e.kind === "mythSlash") mythSlashFx(g, e, now, lowQ);
    else if (e.kind === "soraDash") dashFx(g, e, now, lowQ);
    else if (e.kind === "soraBoom") boomFx(g, e, now, lowQ);
    else if (isSoraFrameFx(e.kind)) soraFrameFx(g, e, now, lowQ);
    else if (e.kind === "grow") growFx(g, e, now);
    else if (e.kind === "smash") smashFx(g, e, now);
    else if (e.kind === "echo") echoFx(g, e, now);
    else if (e.kind === "hair") hairFx(g, e, now);
    else if (e.kind === "rock") rockFx(g, e, now);
    else if (isHikaruFx(e.kind)) hikaruFx(g, e, now, lowQ);
    else if (isKiraFx(e.kind)) kiraFx(g, e, now, lowQ);
    else if (isOtFx(e.kind)) optimusFx(g, e, now, lowQ);
    else if (isGioFx(e.kind)) giornoFx(g, e, now, lowQ, (uu, x, y, r, a) => unitHex(g, uu, x, y, r, a));
    else if (isArjFx(e.kind)) arjunaBoardFx(g, e, now, lowQ);
    else if (isYunaFx(e.kind)) yunaFx(g, e, now, lowQ);
    else if (isGrayFx(e.kind)) grayFx(g, e, now, lowQ, view);
    else if (isGilFx(e.kind)) gilFx(g, e, now, lowQ); // กิลกาเมช (Fake) (gilFx.js)
    else if (isGyroFx(e.kind)) gyroFx(g, e, now, lowQ, view);
    else if (isDiegoFx(e.kind)) diegoFx(g, e, now, lowQ, view);
    else if (isDioFx(e.kind)) dioFx(g, e, now, lowQ, view);
    else if (isFaizFx(e.kind)) faizFx(g, e, now, lowQ);
    else if (isZectFx(e.kind)) zectFx(g, e, now, lowQ); // ไรเดอร์ ZECT (zectFx.js)
    else if (isKiriFx(e.kind)) kiriFx(g, e, now, lowQ); // เอมิยะ คริซุงุ (kiriFx.js)
    else if (isShinraFx(e.kind)) shinraFx(g, e, now, lowQ); // คุซาคาเบะ ชินระ (shinraFx.js)
    else if (isMidoriyaFx(e.kind)) midoriyaFx(g, e, now, lowQ); // มิโดริยะ อิซึคุ (midoriyaFx.js)
    else if (isMagnaFx(e.kind)) magnaFx(g, e, now, lowQ); // แม็กน่า สวิง (magnaFx.js)
    else if (isNaruFx(e.kind)) naruhodoFx(g, e, now, lowQ); // นารุโฮโดะ ริวอิจิ (naruhodoFx.js)
    else if (isDinoFx(e.kind)) dinoFx(g, e, now, lowQ); // ดิเอโก้ อสูรกายดึกดำบรรพ์ (dinoFx.js)
    else if (isMasterFx(e.kind)) masterFx(g, e, now, lowQ); // Master (masterFx.js)
    else if (isValentineFx(e.kind)) valentineFx(g, e, now, lowQ);
    else if (isFernFx(e.kind)) fernFx(g, e, now, lowQ);
    else if (isCelineFx(e.kind)) celineFx(g, e, now, lowQ, view);
    else if (isRyougiFx(e.kind)) ryougiFx(g, e, now, lowQ, rctx || (rctx = { view, info, units, octx, redraw: (u) => drawAnyUnit(g, u, now, null), drawShop: (x, y) => drawShop(g, x, y, C, now, night) }));
    else if (isEmiyaFx(e.kind)) emiyaFx(g, e, now, lowQ, { info });
    else if (isKazumaFx(e.kind)) kazumaFx(g, e, now, lowQ);
    else if (isRolandFx(e.kind)) rolandFx(g, e, now, lowQ);
    else if (isOtoyaFx(e.kind)) otoyaFx(g, e, now, lowQ); // คุเรไน โอโตยะ (otoyaFx.js)
    else if (isElemFx(e.kind)) elemFx(g, e, now, lowQ); // ระบบธาตุ (elementFx.js)
    else if (lFx && isLawFx(e.kind)) lawFx(g, e, now, lowQ, law);
    else if (isMoonFx(e.kind)) moonFx(g, e, now, lowQ, { info });
    else if (isDivineFx(e.kind)) divineFx(g, e, now, lowQ); // นกหวีดอัญเชิญมนต์อสูรเทพ (divineFx.js)
    else if (isIceFx(e.kind)) iceFx(g, e, now, lowQ);
    else if (isShadowFx(e.kind)) shadowFx(g, e, now, lowQ);
    else if (e.kind === "deathBoom") deathBoomFx(g, e, now, lowQ);
    else if (e.kind === "float") floatText(g, e.x, e.y, String(e.text == null ? "" : e.text), e.color || "#ffffff", p, e.size || 24, e.z == null ? 2.4 : e.z);
  }
  // พาข้ามโลก (วาเลนไทน์): พื้นที่ของแนวพลิกกลับหัวแล้วตั้งตรง
  if (vFx) valentineFlip(g, fx, now, lowQ, view, dpr);
  if (bake && bake.fore) { g.globalAlpha = gioForeAlpha(fx, now); if (g.globalAlpha > 0) blit(bake.fore); g.globalAlpha = 1; }
  setCullView(null);
  g.setTransform(1, 0, 0, 1, 0, 0);
  boxes.sort((a, b) => b.d - a.d);
  return boxes;
}

// สีประจำตัว → "r,g,b" (ใช้กับเอฟเฟกต์ฟัน)
export function rgbString(c) { return rgbOf(normColor(c)).join(","); }
export { normColor };
