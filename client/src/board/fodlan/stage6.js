// ============================================================
//  ภาพของสนาม Eos (GRID_PLAN §8.6 — ธีม Final Fantasy XV · "ด่าน 6" ของตัวกลาง ./index.js) · กติกา server/fodlan/stage6.js · ผัง server/fodlan/map6.js
//   อารมณ์: โลกกว้างแสงอบอุ่นยามบ่าย (กลางวัน) / ฟ้าน้ำเงินเข้ม ดาว ไฟเมืองเรือง (กลางคืน — เวลาปีศาจ)
//   ธีม (อบ): ฟ้า + ภูเขาไกล + เงาตึกระฟ้าของนครหลวงหลังกระดาน · ข้างกระดาน: ต้นไม้/หิน/ทราย
//   bakeSpecial (อบใต้เส้นตาราง): ถนนยางมะตอย+เส้นจราจร · ลานเมืองหินปู · ทราย · สะพาน · คอกโชโกโบะ
//   deco: น้ำลึก (ทะเลสาบ) + คลอง Altissia
//   สิ่งกีดขวาง: ตึก (หน้าต่างติดไฟกลางคืน) · กำแพงเมือง · เสาไฟถนน · ต้นไม้ · หิน · ปั๊มน้ำมัน · อู่ซ่อมรถ
//   items: รถ 3 คัน (เหลือง/แดง/เทา — วาดด้วยโค้ด ตามสีรถในภาพของผู้ใช้) · โชโกโบะ (ภาพผู้ใช้ /eos/img/chocobo.webp) ใต้คนขี่ · ปีศาจ (/eos/img/daemonN.webp)
//   air: ฝนฟ้าคะนอง · หมอก · ฉากเหตุการณ์ (fx) + เสียง (client/src/eos/eosAudio.js)
//   ขั้น 4: รางรถไฟ + ขบวนรถไฟ · ชานชาลา · อุโมงค์ · ท่า/เรือกอนโดลา · แคมป์ · จุดตกปลา · สุสานราชวงศ์ (ส่วน "ขั้น 4" ท้ายไฟล์) · เสายึดพื้นที่ 5 แบบตามโซน (drawPillar)
//  แยกไฟล์ (2026-11-15 · ย้ายโค้ดล้วน): eosBase · eosFlora · eosPillars · eosTownArt · eosObstacles · eosUnits · eosRail · eosCamp · eosSfx · eosPveArt · eosPve · eosFx — ไฟล์นี้ส่งออกชื่อเดิมครบ
//  ⚠️ ห้ามเรียกของจาก ./index ตอนโหลดไฟล์ (index import ไฟล์นี้ — วน) · ใช้ได้ในฟังก์ชันวาดเท่านั้น
// ============================================================
import { LW, P, PS, depthOf, gEllipse, glow, onScreen, quad, rng, sceneSize } from "../boardGeo";
import { EOS_AREA } from "../boardRules";
import { fxActive, fxOnce, fxT } from "./index";
import { TAU, hash, K, ease, fx, CAR_MS, CAR_COLORS, PAL, img, CHOCO_IMG, MAGITEK_IMG, daemonImg, MAGITEK_EX_IMG, fitH, glowAt, HEIGHT, castShadows,
  skyFill, mountains, skyline, TILES, STATIC_TR, GRASS_BUCKETS, WATER_SET, ROAD_SET, vnoise, mix, msFill, FILL_CHUNK, FAST, setFor, LAST_NIGHT,
  palOf, zoneAt, regPoly, setFxNow, setLastFd, setTramOff } from "./eosBase";
import { treeShape, uprightList, underItem, cactusShape, gridSegs, rockShape } from "./eosFlora";
import { frustum } from "./eosPillars";
import { TOWN_RECTS, lastFx, BRIDGE_UP, bridgeLeaf, domeGrow, drawDome, drawBarrier } from "./eosTownArt";
import { dynShadow } from "./eosObstacles";
import { MOVES, smooth, daemonWalk, mobWalk, posOf, pathOf, drawCar, sprite, mobPos, allyLinks, threatOf, unitAt, MOB_MS, MOB_HEAD, MOB_LAST,
  mobFacing, screenFace, mobAttackOf, hpPips, drawBeast, shipsOf, drawChest, drawRubble, dropZ, drawDropship } from "./eosUnits";
import { RAIL_Y, p4Norm, bakeP4 } from "./eosRail";
import { supplyCars, drawTrainCar, p4Ground, p4Items, p4Fx, p4AirAlways } from "./eosCamp";
import { sfx, bolt, playFx } from "./eosSfx";
import { drawGoldChoco, drawNest, drawLament, drawGiant, drawCivilian } from "./eosPveArt";
import { pve3Ground, pve3Fx, TRAIT_LOOK, drawTraitMark, eliteRing, mobBadges, drawBoss, drawConvoy, drawSpirit, drawBeacon, drawWard, pveGround } from "./eosPve";
import { pve2Fx, pveFx, stage2Fx, stage3Fx } from "./eosFx";
export { fx, preloadEosArt, setEosFast, eosFast } from "./eosBase";
export { drawObstacle } from "./eosObstacles";

export const kinds = [
  "fd_eos_bldg", "fd_eos_wall", "fd_eos_lamp", "fd_eos_tree", "fd_eos_rock", "fd_eos_water", "fd_eos_canal", "fd_eos_pump", "fd_eos_garage", "fd_eos_daemon",
  "fd_eos_road", "fd_eos_plaza", "fd_eos_sand", "fd_eos_bridge", "fd_eos_stable", "fd_eos_car", "fd_eos_chocobo",
  "fd_eos_forest", "fd_eos_shallow", "fd_eos_pillar",
  // ขั้น 2 (ลูกเล่นปั่นป่วน): คันโยกสะพาน · แท่นโดม · แผงไฟเมือง · ชั้น layer: สะพานที่ยก · กำแพงเวทที่ประตู · ซากรถ
  "fd_eos_lever", "fd_eos_domecore", "fd_eos_switch", "fd_eos_bridgeup", "fd_eos_barrier", "fd_eos_wreck",
  // ขั้น 3 (ลูกเล่นโจมตี): ถังน้ำมัน · แหล่งหินเวท · ป้อมปืนบนกำแพง · มอนสเตอร์ (วาดใน items)
  "fd_eos_barrel", "fd_eos_crystal", "fd_eos_turret", "fd_eos_mob", "fd_eos_chest", "fd_eos_barricade",
  // ขั้น 4 (เดินทาง + เก็บของ): ชานชาลา · ปากอุโมงค์ · ท่ากอนโดลา · แคมป์ · จุดตกปลา (ช่องพิเศษ — วาดเองทั้งหมด) · สุสานราชวงศ์ (สิ่งกีดขวาง)
  "fd_eos_station", "fd_eos_tunnel", "fd_eos_dock", "fd_eos_camp", "fd_eos_fish", "fd_eos_tomb",
  // ของประจำเมือง (2026-11-12 — server/fodlan/eosTowns.js): ศาลเทพธิดา Altissia · ร้านอาหาร · บ้านฟาร์มโชโกโบะ
  "fd_eos_shrine", "fd_eos_diner", "fd_eos_ranch",
];
export const tall = ["fd_eos_bldg", "fd_eos_tree", "fd_eos_lamp", "fd_eos_pillar", "fd_eos_bridgeup", "fd_eos_barrier", "fd_eos_turret", "fd_eos_tomb", "fd_eos_shrine", "fd_eos_diner", "fd_eos_ranch"];
export const fogRGB = "150,165,185";
export const theme = {
  pal: PAL,
  back(c) {
    const { g, C, night, bY, VX0, VW, VY0 } = c;
    skyFill(c, C.sky);
    if (night) {
      const R = rng(5);
      for (let i = 0; i < 320; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.6})`; g.fillRect(VX0 + R() * VW, VY0 + R() * (bY - VY0 - 40), 1.2, 1.2); }
      glow(g, VX0 + VW * 0.78, VY0 + 70, 60, "220,230,255", 0.6);
      g.fillStyle = "#e8eefc"; g.beginPath(); g.arc(VX0 + VW * 0.78, VY0 + 70, 14, 0, TAU); g.fill();
    } else glow(g, VX0 + VW * 0.25, bY - 120, 260, "255,215,150", 0.35);
    mountains(c, C.mtn[0], bY - 70, 60, 0.0035, 0.4);
    skyline(c, bY - 18);
    mountains(c, C.mtn[1], bY - 16, 18, 0.008, 1.7);
  },
  ground(c) {
    const { g, C, R, bY, wx0, wx1, wy1 } = c;
    const area = (wx1 - wx0) * (wy1 + 1);
    for (let i = 0, n = Math.min(900, Math.round(area * 0.5)); i < n; i++) {
      const [sx, sy, s] = PS(wx0 + R() * (wx1 - wx0), -1 + R() * (wy1 + 1));
      if (sy < bY) continue;
      g.fillStyle = C.grass[i % C.grass.length]; g.globalAlpha = 0.35 + R() * 0.3;
      g.beginPath(); g.ellipse(sx, sy, s * (0.2 + R() * 0.4), s * (0.06 + R() * 0.08), 0, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  },
  side(c) {
    const { g, C, VX0, VX1, VW } = c, { cols, rows } = sceneSize();
    const rs = rng(91), band = 2.4 + Math.max(0, (VW - LW) / 60);
    const list = [];
    for (let i = 0; i < 160; i++) {
      list.push([-1.4 - rs() * band, rs() * (rows + 0.5), rs()]);
      list.push([cols + 0.4 + rs() * band, rs() * (rows + 0.5), rs()]);
    }
    list.sort((a, b) => a[1] - b[1]).forEach(([x, y, r]) => {
      const [sx, sy, s] = PS(x, y);
      if (sx < VX0 - 80 || sx > VX1 + 80) return;
      if (r < 0.65) treeShape(g, sx, sy, s * (1 + r * 0.6), C, r);
      else rockShape(g, sx, sy, s * 0.9, C);
    });
  },
  // น้ำลึก/คลอง (หลังเส้นตาราง)
  // พื้นทั้งกระดาน (อบ — ใต้เส้นตาราง): หญ้าไล่สีตาม noise + พื้นแต่ละชนิดเป็นก้อนโค้งกลืนกัน (ไม่ลงสีทีละช่อง — ผู้ใช้สั่ง "ต้องสมจริง")
  //  เทคนิค: วงกลมซ้อนกันที่กลางช่องของชนิดเดียวกัน (รัศมีเกินครึ่งช่อง + สั่นตาม noise) = ขอบโค้งต่อกันเป็นผืน · ขอบนุ่มด้วยชั้นจางรัศมีใหญ่กว่า
  //  แล้วโรยของชิ้นเล็กตามขอบ (กก ก้อนหิน หญ้าแห้ง พุ่มไม้) ให้รอยต่อดูเป็นธรรมชาติ
  base(c) {
    const { g, C, info } = c;
    if (info.area !== EOS_AREA) return;
    const T = TILES;
    // หญ้า: สีไล่ตาม noise ความถี่ต่ำ (ไม่มีลายตาหมากรุก)
    // 8 ระดับสี วาดทีละระดับ (fill เดียวต่อระดับ — เร็วพอวาดสดตอนหมุน)
    const GB = 8;
    for (let b = 0; b < GB; b++) {
      g.fillStyle = mix(C.grassA, C.grassB, (b + 0.5) / GB);
      g.beginPath();
      let n = 0;
      for (const t of GRASS_BUCKETS[b]) {
        const a = P(t.x - 0.02, t.y - 0.02), b1 = P(t.x + 1.02, t.y - 0.02), c2 = P(t.x + 1.02, t.y + 1.02), d = P(t.x - 0.02, t.y + 1.02);
        g.moveTo(a[0], a[1]); g.lineTo(b1[0], b1[1]); g.lineTo(c2[0], c2[1]); g.lineTo(d[0], d[1]); g.closePath();
        if (++n % FILL_CHUNK === 0) { g.fill(); g.beginPath(); } // เติมเป็นชุด (เส้นทางเดียวหลายร้อยรูป = ช้ามากบน GPU canvas)
      }
      g.fill();
    }
    const dim = { cols: info.cols, rows: info.rows };
    const sand = setFor("sand", T.sand), forest = setFor("forest", T.forest), wet = setFor("wet", [...T.shallow, ...T.water]), deep = setFor("deep", T.water), road = setFor("road", T.road);
    // ทราย: ขอบนอกจาง (ทรายปนหญ้า) → เนื้อทราย
    msFill(g, sand, C.sandEdge, { ...dim, jitter: 0.45, th: 0.32, seed: 1, alpha: 0.75 });
    msFill(g, sand, C.sand, { ...dim, jitter: 0.45, th: 0.5, seed: 1 });
    // เนินทราย: ผืนสีเข้มกว่าตาม noise (ทะเลทรายไม่เป็นสีเดียวทั้งผืน)
    msFill(g, setFor("dune", T.sand.filter((t) => vnoise(t.x * 0.34 + 4, t.y * 0.34 + 1) > 0.56)), C.sand2, { ...dim, jitter: 0.55, th: 0.5, seed: 8, alpha: 0.3 });
    // พื้นป่า: ดินชื้นเข้ม (ขอบคด)
    msFill(g, forest, C.forestFloor2, { ...dim, jitter: 0.4, th: 0.36, seed: 2 });
    msFill(g, forest, C.forestFloor, { ...dim, jitter: 0.4, th: 0.55, seed: 2 });
    // ป่า Duscae (ผู้ใช้สั่ง 2026-11-10 "ป่าดูเป็นพื้นเรียบๆ ไม่มีอะไร"): ผืนมอสเขียวสด + ผืนใบไม้ร่วงสีน้ำตาล สลับตาม noise
    msFill(g, setFor("forestMoss", T.forest.filter((t) => vnoise(t.x * 0.42 + 7, t.y * 0.42 + 2) > 0.55)), C.moss, { ...dim, jitter: 0.6, th: 0.55, seed: 11, alpha: 0.55 });
    msFill(g, setFor("forestLitter", T.forest.filter((t) => vnoise(t.x * 0.5 + 3, t.y * 0.5 + 9) < 0.32)), C.litter, { ...dim, jitter: 0.6, th: 0.55, seed: 12, alpha: 0.5 });
    // ลานเมือง (เมืองเป็นเส้นตรงได้ — หินปูพื้น)
    //  (เดิมสลับสีทีละช่องแบบตาหมากรุก → ดูเป็นกระดานหมากรุก) ตอนนี้: สีเดียวไล่อ่อนเข้มเล็กน้อยต่อช่อง + รอยต่อแผ่นหินแบบก่ออิฐ
    //  Altissia = หินอ่อนครีมอุ่น · เมืองอื่น = หินเทา
    for (const t of T.plaza) {
      const alt = zoneAt(t.x, t.y) === "altissia";
      quad(g, t.x, t.y, -0.012); g.fillStyle = mix(alt ? C.marble : C.plaza, alt ? C.marble2 : C.plaza2, hash(t.x * 3 + 1, t.y * 5 + 2) * 0.3); g.fill();
    }
    if (!FAST) {
      g.strokeStyle = C.joint; g.lineWidth = 1; g.beginPath();
      let nj = 0;
      const ln = (x0, y0, x1, y1) => { const a = P(x0, y0), b = P(x1, y1); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); if (++nj % 96 === 0) { g.stroke(); g.beginPath(); } };
      for (const t of T.plaza) {
        ln(t.x, t.y + 0.5, t.x + 1, t.y + 0.5);
        ln(t.x + 0.5, t.y, t.x + 0.5, t.y + 0.5);
        ln(t.x + 0.25, t.y + 0.5, t.x + 0.25, t.y + 1); ln(t.x + 0.75, t.y + 0.5, t.x + 0.75, t.y + 1);
      }
      g.stroke();
    }
    // น้ำ: ชายฝั่งทราย → น้ำตื้น → น้ำลึก (ขอบคดตาม noise)
    msFill(g, wet, C.shore, { ...dim, jitter: 0.4, th: 0.28, seed: 3 });
    msFill(g, wet, C.bank, { ...dim, jitter: 0.4, th: 0.5, seed: 3 });                       // ผนังตลิ่ง (มองเห็นฝั่งไกล)
    msFill(g, wet, C.shallow, { ...dim, jitter: 0.4, th: 0.5, seed: 3, oy: 0.16 });            // ผิวน้ำต่ำกว่าพื้น
    msFill(g, deep, C.water, { ...dim, jitter: 0.35, th: 0.5, seed: 4, oy: 0.16 });
    msFill(g, deep, C.water2, { ...dim, jitter: 0.3, th: 0.78, seed: 5, alpha: 0.6, oy: 0.16 });
    // คลองเมืองน้ำ: ขอบหิน
    //  ผืนต่อเนื่อง (เดิมวาดทีละช่อง → เห็นรอยต่อเป็นตาราง): ขอบหิน → ผนังคลอง → ผิวน้ำต่ำกว่าขอบ → แสงสะท้อนกลางคลอง
    const canal = setFor("canalUnder", [...T.canal, ...T.bridge]); // สะพาน Altissia พาดคลอง → คลองต่อใต้สะพาน
    msFill(g, canal, C.curb, { ...dim, th: 0.36 });
    msFill(g, canal, C.bank, { ...dim, th: 0.45 });
    msFill(g, canal, C.canal, { ...dim, th: 0.5, oy: 0.08 });
    msFill(g, canal, C.canalHi, { ...dim, jitter: 0.35, th: 0.8, seed: 7, alpha: 0.5, oy: 0.08 });
    // เงาทอดตามทิศแสง (สิ่งกีดขวางที่สูง) + เงามืดรอบฐานตึก/กำแพง (ambient occlusion)
    castShadows(g, C, c.night);
    // ถนน: ไหล่ทางดิน → ยางมะตอย (ขอบตรง เลี้ยวลบมุม 45°) → เส้นขอบถนน
    msFill(g, road, C.shoulder, { ...dim, th: 0.42 });
    msFill(g, road, C.roadLine, { ...dim, th: 0.5 });   // เส้นขอบถนนสีขาว
    msFill(g, road, C.road, { ...dim, th: 0.57 });
    // รอยล้อ/คราบน้ำมันบนถนน
    if (!FAST) for (const t of T.road) {
      const R = rng(t.x * 53 + t.y * 19);
      if (R() < 0.35) { const [px, py, s] = P(t.x + 0.2 + R() * 0.6, t.y + 0.2 + R() * 0.6); g.fillStyle = C.roadStain; g.beginPath(); g.ellipse(px, py, s * (0.1 + R() * 0.12), s * 0.04, R() * 3, 0, TAU); g.fill(); }
    }
    // สะพาน (ไม้บนน้ำ) · คอกโชโกโบะ (ฟาง)
    for (const t of T.bridge) {
      quad(g, t.x + 0.08, t.y - 0.02, 0.06); g.fillStyle = C.bridge; g.fill();
      g.strokeStyle = "rgba(0,0,0,.32)"; g.lineWidth = 1;
      for (let i = 1; i < 5; i++) { const a = P(t.x + 0.1, t.y + i / 5, 0.06), b = P(t.x + 0.9, t.y + i / 5, 0.06); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    }
    msFill(g, setFor("stable", T.stable), C.hay, { cols: info.cols, rows: info.rows, jitter: 0.3, th: 0.45, seed: 6 });
    // ขั้น 4: รางรถไฟ · ชานชาลา · สะพานท่าเรือ/ท่าตกปลา · ลานแคมป์ · หน้าอุโมงค์
    bakeP4(g, C, c.night);
  },
  // เส้นตาราง (boardDraw เรียกแทนตารางเต็มผืน): ขีดเฉพาะรอยต่อระหว่างช่องพื้นที่เดินได้ — ไม่ขีดทับน้ำ/คลอง/ตึก/กำแพง (เดิมน้ำเป็นตารางสี่เหลี่ยม)
  //  รอยต่อที่ติดทราย = จางครึ่งหนึ่ง (ทรายสีอ่อน เส้นเดิมเด่นเกิน)
  grid(c) {
    const { g, C, info } = c;
    if (info.area !== EOS_AREA) return false;
    const segs = gridSegs(info.cols, info.rows);
    g.strokeStyle = C.grid; g.lineWidth = 1;
    for (const [list, a] of [[segs.norm, 1], [segs.soft, 0.5]]) {
      g.globalAlpha = a; g.beginPath();
      let n = 0;
      for (const [x0, y0, x1, y1] of list) { const p = P(x0, y0), q = P(x1, y1); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); if (++n % 96 === 0) { g.stroke(); g.beginPath(); } } // ขีดเป็นชุด (เส้นเดียว 1400 ท่อน ช้ามาก)
      g.stroke();
    }
    g.globalAlpha = 1;
    return true;
  },
  // ของชิ้นเล็กตามรอยต่อ (อบ — หลังเส้นตาราง): กก ริมน้ำ · ก้อนหินริมทราย · ดอกไม้/หญ้าในทุ่ง · พุ่มไม้ใต้ร่มป่า
  deco(c) {
    const { g, C, info } = c;
    if (info.area !== EOS_AREA) return;
    const T = TILES, isW = (x, y) => WATER_SET.has(K(x, y));
    const lite = false; // ผู้ใช้สั่ง "texture หาย" — วาดรายละเอียดครบแม้กล้องกำลังเคลื่อน
    // ประกายบนผิวน้ำ (ทะเลสาบ/ทะเล + คลอง)
    g.strokeStyle = C.foam; g.lineWidth = 1;
    for (const t of [...T.water, ...T.canal]) {
      const R = rng(t.x * 31 + t.y * 17);
      g.globalAlpha = 0.3;
      for (let i = 0; i < 2; i++) { const yy = t.y + 0.2 + R() * 0.6, a = P(t.x + 0.1 + R() * 0.3, yy), b = P(t.x + 0.5 + R() * 0.4, yy); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    }
    g.globalAlpha = 1;
    // ทะเลสาบ Cleigne (ปรับภาพ 2026-11-10): ใบบัวสีเขียวมีดอกชมพู ใกล้ฝั่ง · เรือพายไม้จอดริมฝั่งบางจุด
    for (const t of T.water) {
      if (t.x > 13 || t.y < 10 || t.y > 21) continue;
      const nearShore = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => !isW(t.x + dx, t.y + dy));
      const R = rng(t.x * 113 + t.y * 7);
      if (nearShore) for (let i = 0; i < 3; i++) {
        if (R() > 0.55) continue;
        const [px, py, s] = P(t.x + R(), t.y + R(), 0), r = s * (0.07 + R() * 0.06), a0 = R() * TAU;
        g.fillStyle = c.night ? "#1f4a2c" : "#4f9a46"; g.beginPath(); g.moveTo(px, py); g.ellipse(px, py, r, r * 0.55, 0, a0 + 0.35, a0 + TAU - 0.05); g.closePath(); g.fill();
        g.strokeStyle = c.night ? "rgba(0,0,0,.3)" : "rgba(30,70,30,.45)"; g.lineWidth = 1; g.stroke();
        if (R() < 0.3) { g.fillStyle = c.night ? "#a06a8a" : "#f4a6c8"; g.beginPath(); g.arc(px + r * 0.2, py - r * 0.15, Math.max(1.5, r * 0.32), 0, TAU); g.fill(); g.fillStyle = "#fff3a0"; g.beginPath(); g.arc(px + r * 0.2, py - r * 0.15, Math.max(0.8, r * 0.12), 0, TAU); g.fill(); }
      }
      if (nearShore && hash(t.x * 3, t.y * 5) < 0.07) { // เรือพาย
        const [bx, by, s] = P(t.x + 0.5, t.y + 0.5, 0.05), ang = hash(t.x, t.y) * Math.PI;
        g.save(); g.translate(bx, by); g.scale(1, 0.55); g.rotate(ang);
        g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(s * 0.03, s * 0.05, s * 0.36, s * 0.13, 0, 0, TAU); g.fill();
        g.fillStyle = c.night ? "#3a2a1c" : "#7a5230"; g.beginPath(); g.ellipse(0, 0, s * 0.34, s * 0.12, 0, 0, TAU); g.fill();
        g.fillStyle = c.night ? "#4a3626" : "#a87a4a"; g.beginPath(); g.ellipse(0, 0, s * 0.27, s * 0.075, 0, 0, TAU); g.fill();
        g.strokeStyle = c.night ? "#2a1e14" : "#5a3a20"; g.lineWidth = Math.max(1, s * 0.02);
        for (const k of [-0.1, 0.08]) { g.beginPath(); g.moveTo(s * k, -s * 0.07); g.lineTo(s * k, s * 0.07); g.stroke(); }
        g.beginPath(); g.moveTo(-s * 0.02, 0); g.lineTo(-s * 0.2, s * 0.24); g.moveTo(-s * 0.02, 0); g.lineTo(-s * 0.2, -s * 0.24); g.stroke();
        g.restore();
      }
    }
    // กกริมน้ำตื้น
    g.strokeStyle = C.reed; g.lineWidth = 1.2;
    for (const t of T.shallow) {
      const R = rng(t.x * 7 + t.y * 131);
      for (let i = 0; i < 5; i++) {
        const x = t.x + R(), y = t.y + R();
        if (isW(Math.floor(x), Math.floor(y))) continue;
        const p0 = P(x, y), p1 = P(x + 0.03, y, 0.22 + R() * 0.2);
        g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
      }
    }
    // ก้อนหินเล็ก/หญ้าแห้งริมทะเลทราย
    if (!lite) for (const t of T.sand) {
      const R = rng(t.x * 91 + t.y * 13);
      if (R() < 0.3) { const [px, py, s] = P(t.x + R(), t.y + R()); g.fillStyle = C.pebble; g.beginPath(); g.ellipse(px, py, s * 0.06, s * 0.035, 0, 0, TAU); g.fill(); }
      if (R() < 0.25) { const [px, py, s] = P(t.x + R(), t.y + R()); g.strokeStyle = C.dryGrass; g.lineWidth = 1; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(px, py); g.lineTo(px + k * s * 0.05, py - s * 0.12); g.stroke(); } }
    }
    // ลอนทราย (ลมพัดทางเดียวกันทั้งทะเลทราย) + กระบองเพชรต้นเล็ก (เฉพาะช่องว่าง ไม่ติดถนน)
    if (!lite) {
      for (const t of T.sand) {
        const R = rng(t.x * 61 + t.y * 43);
        if (R() < 0.55) {
          const x = t.x + R() * 0.3, y = t.y + 0.15 + R() * 0.7, w = 0.6 + R() * 0.35;
          const a = P(x, y), m = P(x + w * 0.5, y - 0.06), b = P(x + w, y + 0.02);
          g.strokeStyle = C.dune; g.lineWidth = 1.2; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(m[0], m[1], b[0], b[1]); g.stroke();
          g.strokeStyle = C.duneHi; g.lineWidth = 1; g.beginPath(); g.moveTo(a[0], a[1] - 1.5); g.quadraticCurveTo(m[0], m[1] - 1.5, b[0], b[1] - 1.5); g.stroke();
        }
        if (!c.flat && R() < 0.11 && !STATIC_TR[K(t.x, t.y)] && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ROAD_SET.has(K(t.x + dx, t.y + dy)))) {
          const [px, py, s] = P(t.x + 0.3 + R() * 0.4, t.y + 0.35 + R() * 0.4);
          cactusShape(g, px, py, s * (0.75 + R() * 0.4), C, R());
        }
      }
    }
    // ทุ่งหญ้า: ดอกไม้/กอหญ้า (เว้นถนน/เมือง)
    if (!lite && !c.flat) for (const t of T.grass) { // flat = วาดสดทับ (upright)
      const R = rng(t.x * 17 + t.y * 71);
      for (let i = 0; i < 3; i++) {
        const [px, py, s] = P(t.x + R(), t.y + R());
        if (R() < 0.5) { g.strokeStyle = C.tuft; g.lineWidth = 1; g.beginPath(); g.moveTo(px - s * 0.04, py); g.lineTo(px, py - s * 0.09); g.lineTo(px + s * 0.04, py); g.stroke(); }
        else if (R() < 0.3) { g.fillStyle = C.flowers[Math.floor(R() * C.flowers.length)]; g.beginPath(); g.arc(px, py - 1, Math.max(1, s * 0.025), 0, TAU); g.fill(); }
      }
    }
    // ป่า: ไม้พื้นล่างหลายชนิด เรียงจากไกลไปใกล้ — เฟิร์น · พุ่มสองชั้น · เห็ด (กลางคืนเรืองแสง) · ขอนไม้ล้ม · ดอกไม้ป่า · แสงลอดใบไม้
    const under = [];
    for (const t of T.forest) {
      const R = rng(t.x * 29 + t.y * 37), solid = !!STATIC_TR[K(t.x, t.y)];
      if (R() < 0.7) under.push({ k: "fern", x: t.x + 0.15 + R() * 0.7, y: t.y + 0.15 + R() * 0.7, r: 0.09 + R() * 0.07, v: R() });
      if (R() < 0.45) under.push({ k: "bush", x: t.x + 0.15 + R() * 0.7, y: t.y + 0.15 + R() * 0.7, r: 0.12 + R() * 0.08, v: R() });
      if (R() < 0.12) under.push({ k: "shroom", x: t.x + 0.2 + R() * 0.6, y: t.y + 0.2 + R() * 0.6, r: 0.06, v: R() });
      if (!solid && R() < 0.09) under.push({ k: "log", x: t.x + 0.5, y: t.y + 0.5, r: 0.36, v: R() });
      if (R() < 0.35) under.push({ k: "flower", x: t.x + R(), y: t.y + R(), r: 0.03, v: R() });
    }
    // แสงลอดใบไม้ (ใต้ทุกอย่าง)
    for (const t of T.forest) {
      const R = rng(t.x * 13 + t.y * 71);
      if (R() > 0.45) continue;
      const [px, py, s] = P(t.x + R(), t.y + R());
      g.save(); g.globalAlpha = c.night ? 0.07 : 0.16; g.fillStyle = `rgb(${C.ray})`;
      g.beginPath(); g.ellipse(px, py, s * (0.12 + R() * 0.15), s * (0.05 + R() * 0.05), R() * 3, 0, TAU); g.fill(); g.restore();
    }
    if (c.flat) return; // ภาพพื้นแบบพื้นผิว (groundTexture): ของตั้งขึ้นวาดสดทับทีหลัง (upright)
    under.sort((a, b) => depthOf(a.x, a.y) - depthOf(b.x, b.y));
    for (const u of under) underItem(g, u, C, c.night);
  },
  // ของตั้งขึ้นบนพื้น (ไม้พื้นล่างในป่า + กระบองเพชรเล็ก) — วาดสดทับพื้นแบบพื้นผิวระหว่างกล้องขยับ (boardDraw.drawGroundWarp)
  //  ผู้ใช้แจ้ง 2026-11-10 กระพริบ: ภาพพื้นมองตรงลงมาทำให้ของพวกนี้แบนตอนขยับ แล้วตั้งขึ้นตอนหยุด · ตัดของนอกจอ
  upright(c) {
    const { g, C, info } = c;
    if (info.area !== EOS_AREA) return;
    const list = uprightList();
    for (const u of list) {
      if (!onScreen(u.x, u.y, 0.5, 0.5)) continue;
      if (u.k === "tuft") { const [px, py, s] = P(u.x, u.y); g.strokeStyle = C.tuft; g.lineWidth = 1; g.beginPath(); g.moveTo(px - s * 0.04, py); g.lineTo(px, py - s * 0.09); g.lineTo(px + s * 0.04, py); g.stroke(); }
      else if (u.k === "gflower") { const [px, py, s] = P(u.x, u.y); g.fillStyle = C.flowers[Math.floor(u.v * C.flowers.length)]; g.beginPath(); g.arc(px, py - 1, Math.max(1, s * 0.025), 0, TAU); g.fill(); }
      else if (u.k === "cactus") { const [px, py, s] = P(u.x, u.y); cactusShape(g, px, py, s * u.sc, C, u.v); }
      else underItem(g, u, C, c.night);
    }
  },
  ambient(g, f, t) {
    const { night, lowQ } = f;
    if (!lowQ && !night) { // ลำแสงแดดเฉียงลอดยอดไม้ป่า Duscae (กลางวัน)
      for (let i = 0; i < 6; i++) {
        const x0 = 16 + i * 2 + Math.sin(t / 5000 + i) * 0.3, y0 = 12 + (i * 3) % 8, a = 0.07 + 0.04 * Math.sin(t / 2600 + i * 1.7);
        const top = P(x0 - 1.2, y0 - 0.8, 3.2), b0 = P(x0 - 0.25, y0, 0), b1 = P(x0 + 0.25, y0 + 0.2, 0);
        const gr = g.createLinearGradient(top[0], top[1], (b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2);
        gr.addColorStop(0, "rgba(255,240,190,0)"); gr.addColorStop(0.6, `rgba(255,240,190,${a})`); gr.addColorStop(1, `rgba(255,240,190,${a * 0.4})`);
        g.fillStyle = gr; g.beginPath(); g.moveTo(top[0] - 4, top[1]); g.lineTo(top[0] + 4, top[1]); g.lineTo(b1[0], b1[1]); g.lineTo(b0[0], b0[1]); g.closePath(); g.fill();
      }
    }
    if (lowQ || !night) return;
    // หิ่งห้อยเหนือป่า Duscae (กลางคืน)
    for (let i = 0; i < 18; i++) {
      const a = t / (3200 + i * 250) + i * 1.7, x0 = 15 + (i * 5) % 12, y0 = 11 + (i * 3) % 9;
      const [x, y] = P(x0 + Math.cos(a) * 0.8, y0 + Math.sin(a * 0.9) * 0.6, 0.4 + Math.sin(a * 2) * 0.2);
      const k = 0.4 + 0.4 * Math.sin(t / 380 + i);
      glowAt(g, x, y, 7, "210,255,150", k * 0.7);
    }
  },
};

// =================================================================== ช่องพิเศษ: พื้นวาดรวมใน theme.base แล้ว — ไม่อบทีละช่อง
export function bakeSpecial() {}
export function animSpecial() {}

// =================================================================== ground (ใต้ไฮไลต์)
// อ่างน้ำพุกลางลาน Altissia (ช่องฟื้นฟู map.heal 2×2) — พื้น: ขอบหินกลม + น้ำกระเพื่อม · กลางอ่าง (items): เสาน้ำพุ 3 ชั้น + สายน้ำ
let FOUNTAIN = null, FOUNTAIN_SIG = ""; // คำนวณจาก info.heal ของกระดาน (fountainFrom)
function fountainFrom(info) {
  const h = (info && info.heal) || [];
  const sig = h.map((t) => `${t.x},${t.y}`).join("|");
  if (sig === FOUNTAIN_SIG) return FOUNTAIN;
  FOUNTAIN_SIG = sig;
  if (!h.length) return (FOUNTAIN = null);
  const xs = h.map((t) => t.x), ys = h.map((t) => t.y);
  return (FOUNTAIN = { x: (Math.min(...xs) + Math.max(...xs) + 1) / 2, y: (Math.min(...ys) + Math.max(...ys) + 1) / 2, r: (Math.max(...xs) - Math.min(...xs) + 1) / 2 - 0.06 });
}
function fountainBasin(g, now, night, lowQ) {
  const F = FOUNTAIN; if (!F) return;
  gEllipse(g, F.x, F.y, F.r + 0.06, 0.0, 40); g.fillStyle = "rgba(0,0,0,.18)"; g.fill();
  gEllipse(g, F.x, F.y, F.r, 0.16, 40); g.fillStyle = night ? "#8d939c" : "#e4e1d8"; g.fill(); // ขอบหิน
  gEllipse(g, F.x, F.y, F.r - 0.12, 0.13, 40); g.fillStyle = night ? "#1f4f6e" : "#4fa3cf"; g.fill(); // ผิวน้ำ
  if (!lowQ) for (let i = 0; i < 3; i++) { const k = ((now / 1800) + i / 3) % 1; gEllipse(g, F.x, F.y, 0.2 + k * (F.r - 0.35), 0.135, 32); g.strokeStyle = `rgba(220,245,255,${0.45 * (1 - k)})`; g.lineWidth = 1.5; g.stroke(); }
  gEllipse(g, F.x, F.y, F.r - 0.12, 0.13, 40); g.strokeStyle = night ? "rgba(150,210,255,.35)" : "rgba(255,255,255,.55)"; g.lineWidth = 1.2; g.stroke();
}
function fountainCore(g, now, night, lowQ) {
  const F = FOUNTAIN;
  if (!F) return;
  const tier = (r, z0, z1, col, top) => frustum(g, regPoly(F.x, F.y, r, 10), z0, regPoly(F.x, F.y, r * 0.92, 10), z1, col, top);
  tier(0.3, 0.13, 0.28, night ? "#9aa0a8" : "#ece9e0", night ? "#2a5a7a" : "#5fb3dc");
  tier(0.07, 0.28, 0.5, night ? "#a2a8b0" : "#f2efe8", null);
  tier(0.17, 0.5, 0.56, night ? "#a8aeb6" : "#f6f3ec", night ? "#2a5a7a" : "#6cc0e6");
  const top = P(F.x, F.y, 0.7), s = top[2];
  glowAt(g, top[0], top[1], s * 0.5, "180,230,255", night ? 0.55 : 0.35);
  if (lowQ) return;
  // สายน้ำพุ่งขึ้นแล้วโค้งลงอ่าง (8 สาย) + ละออง
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU + now / 4000;
    const p0 = P(F.x, F.y, 0.6), pm = P(F.x + Math.cos(a) * 0.3, F.y + Math.sin(a) * 0.3, 0.85), p1 = P(F.x + Math.cos(a) * 0.62, F.y + Math.sin(a) * 0.62, 0.15);
    g.strokeStyle = night ? "rgba(170,220,255,.55)" : "rgba(235,250,255,.8)"; g.lineWidth = Math.max(1.2, s * 0.018);
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(pm[0], pm[1] - s * 0.08, p1[0], p1[1]); g.stroke();
  }
  for (let i = 0; i < 10; i++) { const k = ((now / 900) + hash(i, 4)) % 1, a = hash(i, 9) * TAU, q = P(F.x + Math.cos(a) * 0.15 * k, F.y + Math.sin(a) * 0.15 * k, 0.6 + k * 0.3); g.fillStyle = `rgba(235,250,255,${0.8 * (1 - k)})`; g.beginPath(); g.arc(q[0], q[1], Math.max(1, s * 0.012), 0, TAU); g.fill(); }
}
export function ground(g, fd, info, now, lowQ = false) {
  setLastFd(fd);
  setTramOff(!!fd && Array.isArray(fd.trams) && !fd.trams.length);
  fountainFrom(info);
  fountainBasin(g, now, !!fd.night || LAST_NIGHT, lowQ);
  // สะพานกำลังลดลง (ชั้น layer ไม่มี fd_eos_bridgeup แล้ว — วาดบานสะพานตกลงทับสะพานที่อบไว้)
  const be = lastFx("bridge");
  if (be && !be.up && !fd.bridgeUp) {
    const p = fxT(be, now, fx.bridge);
    if (p < 1) for (const t of be.tiles || TILES.bridge) bridgeLeaf(g, t.x, t.y, PAL[fd.night || LAST_NIGHT ? "night" : "day"], BRIDGE_UP * (1 - ease(p)));
  }
  // รอยไหม้ฟ้าผ่า
  for (const e of fxActive(fd, now)) {
    if (e.kind !== "lightning") continue;
    const p = fxT(e, now, fx.lightning), [x, y, s] = P(e.x + 0.5, e.y + 0.5);
    g.fillStyle = `rgba(14,10,8,${0.6 * (1 - p)})`; g.beginPath(); g.ellipse(x, y, s * 0.38, s * 0.15, 0, 0, TAU); g.fill();
  }
  // วงมืดใต้ปีศาจ
  for (const d of fd.daemons || []) {
    const pos = smooth(d.id, d.x, d.y, now, ...daemonWalk(fd, d.id, now));
    const [x, y, s] = P(pos.x + 0.5, pos.y + 0.5);
    g.fillStyle = "rgba(60,0,40,.35)"; g.beginPath(); g.ellipse(x, y, s * 0.45, s * 0.17, 0, 0, TAU); g.fill();
  }
  // ขั้น 3: เงาทอดของถัง/หินเวท · รอยไหม้ระเบิด · เงา/เป้าของยานลำเลียง
  const night = !!fd.night || LAST_NIGHT;
  for (const b of fd.barrels || []) dynShadow(g, b.x, b.y, HEIGHT.fd_eos_barrel, 0.2, night);
  for (const c of fd.crystals || []) dynShadow(g, c.x, c.y, HEIGHT.fd_eos_crystal, 0.22, night);
  for (const e of fxActive(fd, now)) {
    if (e.kind !== "barrel_boom") continue;
    const p = fxT(e, now, fx.barrel_boom);
    for (const t of e.tiles || [{ x: e.x, y: e.y }]) {
      const c = t.x === e.x && t.y === e.y;
      gEllipse(g, t.x + 0.5, t.y + 0.5, c ? 0.5 : 0.36, 0.01, 18, c ? 0.5 : 0.32);
      g.fillStyle = `rgba(16,10,8,${(c ? 0.7 : 0.45) * (1 - p * p)})`; g.fill();
    }
  }
  p4Ground(g, fd, now, night); // ขั้น 4
  pveGround(g, fd, now, lowQ);
  pve3Ground(g, fd, now, lowQ); // วงไฟแคมป์ · เส้นทางยักษ์หิน
  for (const ds of shipsOf(fd)) { // ยานลงได้หลายลำพร้อมกัน (กลางวัน — ผู้ใช้สั่ง 2026-11-10)
  if (ds && ds.state === "landed") {
    const z = dropZ(ds, now);
    gEllipse(g, ds.x + 1, ds.y + 1, 0.95, 0, 30, 0.8); g.fillStyle = `rgba(0,0,0,${Math.max(0.08, 0.42 - z * 0.04)})`; g.fill();
  } else if (ds && ds.state === "warn") {
    const cx = ds.x + 1, cy = ds.y + 1, a = 0.55 + 0.3 * Math.sin(now / 160);
    g.strokeStyle = `rgba(255,50,40,${a})`; g.lineWidth = 2;
    gEllipse(g, cx, cy, 1.15, 0.03, 40); g.fillStyle = `rgba(255,50,40,${0.08 + 0.06 * Math.sin(now / 160)})`; g.fill(); g.stroke(); // เขตลงจอด: พื้นแดงจาง + ขอบทึบ (เลิกเส้นประ)
    gEllipse(g, cx, cy, 0.5, 0.03, 24); g.stroke();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const p0 = P(cx + dx * 0.6, cy + dy * 0.6, 0.03), p1 = P(cx + dx * 1.3, cy + dy * 1.3, 0.03);
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    }
  }
  }
  void info;
}

// =================================================================== items (เรียงความลึกกับตัวละคร)
export function items(list, g, fd, info, units, now, lowQ) {
  const night = !!fd.night || LAST_NIGHT;
  if (fd.eos) list.push({ d: -1e9, f: () => allyLinks(g, units, now, lowQ) }); // ร่วมแรง: เส้นโยงเพื่อนในระยะ 2 (ใต้ทุกอย่าง)
  if (fountainFrom(info)) list.push({ d: depthOf(FOUNTAIN.x, FOUNTAIN.y), f: () => fountainCore(g, now, night, lowQ) });
  // รถ 1 ช่อง (ผู้ใช้สั่ง 2026-11-09 — ขึ้นขี่แล้วขับแบบม้า): จอด = ตามตำแหน่งรถ · มีคนขับ = ใต้หมากคนขับ (ตามตำแหน่งวาดของหมาก วิ่งไปพร้อมกัน)
  //  ภาพรถของผู้ใช้หันซ้ายเป็นค่าเริ่ม → กลับด้านตามทิศที่วิ่งบนจอ (หมุนกล้องได้) · ขึ้นรถ = รถยุบรับน้ำหนัก + ไฟหน้าวาบ · ชน = รถพุ่งไปครึ่งช่องแล้วถอย
  for (const c of fd.cars || []) {
    const drv = c.driver ? unitAt(units, c.driver) : null;
    let cx, cy, moving = false;
    if (drv) { cx = drv.x; cy = drv.y; }
    else { const pos = smooth(c.id, c.x, c.y, now, CAR_MS); cx = pos.x + 0.5; cy = pos.y + 0.5; moving = pos.moving; }
    const last = MOB_LAST.get(c.id);
    if (last && Math.abs(cx - last.x) + Math.abs(cy - last.y) > 0.002) moving = true;
    if (!MOB_HEAD.has(c.id)) MOB_HEAD.set(c.id, { dx: c.dx || -1, dy: c.dy || 0 });
    const head = mobFacing(c.id, { x: cx, y: cy });
    const flip = screenFace(cx, cy, head) > 0;
    const mnt = lastFx("car_mount"), ramE = lastFx("car_ram");
    const mk = mnt && mnt.car === c.id ? fxT(mnt, now, 700) : 1, rk = ramE && ramE.car === c.id ? fxT(ramE, now, 520) : 1;
    let lx = 0, ly = 0;
    if (rk >= 0 && rk < 1 && ramE.at) { const j = Math.sin(rk * Math.PI) * 0.45; lx = (ramE.at.x - ramE.x) * j; ly = (ramE.at.y - ramE.y) * j; }
    const squash = mk >= 0 && mk < 1 ? Math.sin(mk * Math.PI * 2) * 0.06 * (1 - mk) : 0;
    const im = img(`/eos/img/car${c.img}.webp`), col = CAR_COLORS[c.img] || CAR_COLORS[1];
    const X = cx + lx, Y = cy + ly;
    list.push({
      d: depthOf(X, Y) - (drv ? 0.02 : 0),
      f: () => {
        const rumble = moving && !lowQ ? Math.sin(now / 45) * 0.012 : 0;
        if (!im) { drawCar(g, X, Y, Math.abs(head.dx) >= Math.abs(head.dy) ? "h" : "v", col, night, now, moving); return; }
        const [sx, sy, s] = P(X, Y + 0.12);
        const w = s * 1.5, h = w * (im.naturalHeight / im.naturalWidth) * (1 - squash);
        g.fillStyle = "rgba(0,0,0,.4)"; g.beginPath(); g.ellipse(sx, sy - s * 0.03, w * 0.46, s * 0.2, 0, 0, TAU); g.fill();
        g.save(); g.translate(sx, sy - rumble * s); if (flip) g.scale(-1, 1);
        if (c.broken) g.filter = "grayscale(.7) brightness(.55)"; // รถพัง: ซีดดำ + ควัน
        g.drawImage(im, -w / 2, -h, w, h); g.filter = "none"; g.restore();
        if (c.broken && !lowQ) for (let i = 0; i < 5; i++) { const t = ((now / 900) + i / 5) % 1; g.fillStyle = `rgba(60,60,64,${0.45 * (1 - t)})`; g.beginPath(); g.arc(sx + Math.sin(i * 2 + t * 3) * s * 0.12, sy - h * 0.7 - t * s * 0.9, s * (0.08 + t * 0.16), 0, TAU); g.fill(); }
        if (!drv && c.maxHp) hpPips(g, X, Y, 1.05, c.hp ?? c.maxHp, c.maxHp, 0, 0, "ally"); // รถจอด: หลอดเลือดรถ (คนขับอยู่ = หลอดบนตัวคนขับเป็นของรถแทน)
        const hx = sx + (flip ? 1 : -1) * w * 0.42, hy = sy - h * 0.3;
        if (night || (mk >= 0 && mk < 1)) glowAt(g, hx, hy, s * (night ? 0.7 : 0.45), "255,240,200", night ? 0.6 : 0.8 * (1 - mk));
        if (moving && !lowQ) for (let i = 0; i < 4; i++) {
          const t = ((now / 380) + i / 4) % 1, ex = sx - (flip ? 1 : -1) * (w * 0.5 + t * s * 0.5), ey = sy - s * (0.05 + t * 0.12);
          g.fillStyle = `rgba(190,185,175,${0.32 * (1 - t)})`; g.beginPath(); g.arc(ex, ey, s * (0.05 + t * 0.1), 0, TAU); g.fill();
        }
      },
    });
  }
  // โชโกโบะว่างในคอก / ข้างทาง
  for (const c of fd.chocos || []) {
    if (c.x == null || c.rider) continue;
    const bob = lowQ ? 0 : Math.abs(Math.sin(now / 420 + c.x)) * 0.04;
    const flip = hash(c.x, c.y) < 0.5;
    list.push({ d: depthOf(c.x + 0.5, c.y + 0.5), f: () => { sprite(g, CHOCO_IMG, c.x + 0.5, c.y + 0.55, bob, 0.8, flip); if (c.maxHp) hpPips(g, c.x + 0.5, c.y + 0.55, 0.95, c.hp ?? c.maxHp, c.maxHp, 0, 0, "ally"); } });
  }
  // โชโกโบะใต้คนขี่ (ตามตำแหน่งวาดของหมาก)
  for (const [pid] of Object.entries(fd.riders || {})) {
    const u = unitAt(units, pid);
    if (!u) continue;
    const bob = lowQ ? 0 : Math.abs(Math.sin(now / 260)) * 0.05;
    list.push({ d: depthOf(u.x, u.y) - 0.01, f: () => sprite(g, CHOCO_IMG, u.x, u.y + 0.08, bob, 1.1, false) });
  }
  // ปีศาจ
  for (const d of fd.daemons || []) {
    const pos = mobPos(units, d.id, smooth(d.id, d.x, d.y, now, ...daemonWalk(fd, d.id, now)));
    const cx = pos.x + 0.5, cy = pos.y + 0.55;
    list.push({
      d: depthOf(cx, cy),
      f: () => {
        const breathe = lowQ ? 0 : Math.sin(now / 520 + d.kind) * 0.03;
        const [sx, sy, s] = P(cx, cy, 0);
        if (d.trait === "boss") { drawBoss(g, d, cx, cy, sx, sy, s, now, lowQ, breathe); return; }
        const tr = TRAIT_LOOK[d.trait] || null;
        glowAt(g, sx, sy - s * 0.6, s * 1.1, tr ? tr.rgb : "150,30,120", tr ? 0.5 + 0.15 * Math.sin(now / 240) : 0.35);
        if (d.trait === "healer" && !lowQ) { // วงสมุนไพรเขียวหมุนใต้เท้า
          g.save(); g.translate(sx, sy); g.scale(1, 0.42); g.rotate(now / 1600);
          g.strokeStyle = "rgba(120,255,170,.45)"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, s * 0.6, 0, TAU); g.stroke(); g.setLineDash([]); g.restore();
        }
        if (d.elite) eliteRing(g, cx, cy, now, lowQ);
        sprite(g, daemonImg(d.kind), cx, cy, breathe, fitH(daemonImg(d.kind), d.trait === "swarm" ? 0.85 : d.trait === "splitling" ? 1.0 : d.trait === "bomber" ? 1.3 : d.trait === "splitter" || d.trait === "shield" ? 1.6 : 1.45), d.kind % 2 === 0);
        drawTraitMark(g, d, cx, cy, d.trait === "swarm" ? 1.25 : 2.0, now, lowQ);
        if (d.trait === "bomber") { // ไส้ตะเกียงลุก + ตัวพองตามจังหวะ
          const k = 0.5 + 0.5 * Math.sin(now / 130);
          glowAt(g, sx, sy - s * 0.75, s * (0.45 + k * 0.25), "255,120,30", 0.55 + k * 0.3);
          if (!lowQ) for (let i = 0; i < 4; i++) { const a = now / 90 + i * 1.6; g.fillStyle = `rgba(255,${180 + i * 15},80,${0.9 - i * 0.15})`; g.fillRect(sx + Math.cos(a) * s * 0.12, sy - s * 1.35 - ((now / 6 + i * 13) % 14), 2, 2); }
        }
        if (d.trait === "healer") { const top = P(cx, cy, 1.75); g.fillStyle = "#7dffaa"; g.fillRect(top[0] - 2, top[1] - 7, 4, 14); g.fillRect(top[0] - 7, top[1] - 2, 14, 4); }
        const top = hpPips(g, cx, cy, 1.6, d.hp, d.maxHp, d.armor, d.maxArmor);
        mobBadges(g, d, top, now, lowQ, threatOf(units, d.id)); // ระดับ · ความสามารถ · หัวหน้า
      },
    });
  }
  // ขั้น 3: มอนสเตอร์ (เลื่อนนุ่มตามเส้นทาง "mob_move" · พุ่งเข้าหาเป้าตอน "mob_attack")
  const hitE = lastFx("mob_hit");
  for (const m of fd.mobs || []) {
    if (m.type === "gold") { // โชโกโบะทอง (วิ่งหนี — ภาพโชโกโบะเรืองทอง + ประกาย)
      const gw = mobWalk(fd, m.id, now, 700);
      const gp = mobPos(units, m.id, smooth(`mob:${m.id}`, m.x, m.y, now, gw.ms, gw.path, gw.start));
      const gh = mobFacing(m.id, gp);
      list.push({ d: depthOf(gp.x + 0.5, gp.y + 0.55), f: () => drawGoldChoco(g, m, gp.x + 0.5, gp.y + 0.55, now, lowQ, gp.moving, screenFace(gp.x + 0.5, gp.y + 0.5, gh) > 0) });
      continue;
    }
    if (m.type === "nest") { // รังปีศาจ (อยู่กับที่)
      const hn = hitE && hitE.id === m.id ? fxT(hitE, now, fx.mob_hit) : 1;
      list.push({ d: depthOf(m.x + 0.5, m.y + 0.5), f: () => drawNest(g, m, m.x + 0.5, m.y + 0.55, now, lowQ, hn) });
      continue;
    }
    if (m.type === "lament") { // ผู้คร่ำครวญ (บอสท้ายเกม Lament — วูบไปมา ไม่เดิน)
      const bl = lastFx("lament_blink"), bk = bl && bl.id === m.id && bl.from ? fxT(bl, now, fx.lament_blink) : 1;
      const hl = hitE && hitE.id === m.id ? fxT(hitE, now, fx.mob_hit) : 1;
      list.push({ d: depthOf(m.x + 0.5, m.y + 0.55), f: () => drawLament(g, m, m.x + 0.5, m.y + 0.55, now, lowQ, bk, hl, fd.lament ? fd.lament.phase : 1) });
      continue;
    }
    if (m.type === "giant") { // ยักษ์หิน (เดินตามเส้นทาง — เลื่อนนุ่ม)
      const gp = smooth(`mob:${m.id}`, m.x, m.y, now, 1400);
      const gh = mobFacing(m.id, gp), hg = hitE && hitE.id === m.id ? fxT(hitE, now, fx.mob_hit) : 1;
      list.push({ d: depthOf(gp.x + 0.5, gp.y + 0.55), f: () => drawGiant(g, m, gp.x + 0.5, gp.y + 0.55, now, lowQ, gp.moving, screenFace(gp.x + 0.5, gp.y + 0.5, gh) > 0 ? 1 : -1, hg) });
      continue;
    }
    const beast = m.type === "beast";
    const wk = mobWalk(fd, m.id, now, MOB_MS);
    const pos = mobPos(units, m.id, smooth(`mob:${m.id}`, m.x, m.y, now, wk.ms, wk.path, wk.start));
    let head = mobFacing(m.id, pos), lunge = 0;
    const atk = mobAttackOf(m.id, now), tu = atk ? unitAt(units, atk.a.target) : null;
    if (tu) {
      head = { dx: tu.x - (pos.x + 0.5), dy: tu.y - (pos.y + 0.5) };
      MOB_HEAD.set(m.id, head);
      lunge = Math.sin(Math.min(1, atk.p / 0.6) * Math.PI) * 0.24;
    }
    const hl = Math.hypot(head.dx, head.dy) || 1;
    const cx = pos.x + 0.5 + (head.dx / hl) * lunge, cy = pos.y + 0.55 + (head.dy / hl) * lunge;
    const hit = hitE && hitE.id === m.id ? fxT(hitE, now, fx.mob_hit) : 1;
    list.push({
      d: depthOf(cx, cy),
      f: () => {
        const [sx, sy, s] = P(cx, cy);
        const face = screenFace(cx, cy, head);
        g.fillStyle = "rgba(0,0,0,.38)"; g.beginPath(); g.ellipse(sx, sy, s * (beast ? 0.6 : 0.3), s * (beast ? 0.21 : 0.11), 0, 0, TAU); g.fill();
        const shake = hit < 1 ? Math.sin(hit * 50) * s * 0.03 * (1 - hit) : 0;
        if (beast) drawBeast(g, sx + shake, sy, s, face, now, pos.moving, lowQ);
        else {
          if (m.elite) eliteRing(g, cx, cy, now, lowQ);
          const bob = pos.moving && !lowQ ? Math.abs(Math.sin(now / 140)) * 0.04 : 0;
          if (m.trait === "mech") {
            if (m.face) { // จุดอ่อนด้านหลัง (ตีจากฝั่งนี้แรง +2): ลูกศรส้มบนพื้นฝั่งตรงข้ามทิศที่หัน
              const bx0 = cx - m.face.dx * 0.62, by0 = cy - m.face.dy * 0.62, k = 0.55 + 0.35 * Math.sin(now / 220);
              gEllipse(g, bx0, by0, 0.26, 0.02, 20); g.fillStyle = `rgba(255,150,40,${0.18 * k})`; g.fill(); g.strokeStyle = `rgba(255,170,60,${k})`; g.lineWidth = 2.5; g.stroke();
              const a0 = P(bx0 - m.face.dx * 0.12, by0 - m.face.dy * 0.12, 0.03), a1 = P(bx0 + m.face.dx * 0.14, by0 + m.face.dy * 0.14, 0.03);
              g.strokeStyle = `rgba(255,200,90,${k})`; g.lineWidth = 3; g.beginPath(); g.moveTo(a0[0], a0[1]); g.lineTo(a1[0], a1[1]); g.stroke();
            }
            glowAt(g, sx, sy - s * 0.7, s * 1.2, "255,70,50", 0.22 + 0.1 * Math.sin(now / 300)); sprite(g, MAGITEK_EX_IMG, cx + shake / s, cy, bob * 0.5, fitH(MAGITEK_EX_IMG, 2.0, 2.4), face > 0); } // หุ่นเกราะจักรวรรดิ (ภาพผู้ใช้)
          else sprite(g, MAGITEK_IMG, cx + shake / s, cy, bob, 1.45, face > 0); // ภาพหันซ้าย → หันขวาให้กลับด้าน
          drawTraitMark(g, m, cx, cy, 2.0, now, lowQ);
          if (m.trait === "sniper") { const v = P(cx + face * 0.12, cy, 1.18); glowAt(g, v[0], v[1], s * 0.28, "255,40,40", 0.75 + 0.2 * Math.sin(now / 150)); g.fillStyle = "#ff4a3a"; g.fillRect(v[0] - 4, v[1] - 1.5, 8, 3); }
        }
        if (hit < 1) { const q = P(cx, cy, beast ? 1.0 : 0.7); glowAt(g, q[0], q[1], s * (beast ? 1.1 : 0.7), "255,255,255", (1 - hit) * 0.7); }
        const top = hpPips(g, cx, cy, beast ? 2.0 : m.trait === "mech" ? 2.15 : 1.6, m.hp, m.maxHp, m.armor, m.maxArmor);
        if (m.aggro) glowAt(g, top[0], top[1] - s * 0.22, s * 0.32, "255,40,30", 0.55 + 0.25 * Math.sin(now / 200));
        if (m.type !== "nest" && m.type !== "gold" && m.type !== "giant") mobBadges(g, m, top, now, lowQ, threatOf(units, m.id)); // ระดับ · ความสามารถ · หัวหน้า
      },
    });
  }
  // PVE รอบสอง: รถเสบียง (ยูนิตฝ่ายเรา — วาดแทนหมาก) · ดวงวิญญาณเพื่อนที่ล้ม · หมุดภารกิจสำรวจ · โล่เสา
  if (fd.convoy) {
    const c = fd.convoy, cu = unitAt(units, c.id);
    const pos = cu ? { x: cu.x - 0.5, y: cu.y - 0.5 } : smooth(c.id, c.x, c.y, now, CAR_MS, pathOf(fd, "convoy_move", c.id) || null);
    const head = mobFacing(c.id, { x: pos.x + 0.5, y: pos.y + 0.5 });
    list.push({ d: depthOf(pos.x + 0.5, pos.y + 0.5), f: () => drawConvoy(g, pos.x + 0.5, pos.y + 0.5, head, c, now, night, lowQ) });
  }
  for (const sp of fd.spirits || []) list.push({ d: depthOf(sp.x + 0.5, sp.y + 0.5), f: () => drawSpirit(g, sp, now, lowQ) });
  for (const c of fd.civs || []) { // พลเรือน (ยูนิตฝ่ายเรา — วาดแทนหมาก)
    const cu = unitAt(units, c.id), pos = cu ? { x: cu.x, y: cu.y } : { x: c.x + 0.5, y: c.y + 0.5 };
    const lead = c.follow ? unitAt(units, c.follow) : null;
    list.push({ d: depthOf(pos.x, pos.y), f: () => drawCivilian(g, c, pos.x, pos.y + 0.05, now, lowQ, lead) });
  }
  for (const q of fd.quests || []) if (q.type === "scout") list.push({ d: depthOf(q.x + 0.5, q.y + 0.5), f: () => drawBeacon(g, q, now, lowQ) });
  for (const pl of fd.pillars || []) if ((pl.ward || 0) > 0) list.push({ d: depthOf(pl.x + 0.5, pl.y + 0.5) + 0.01, f: () => drawWard(g, pl, now) });
  // ขั้น 3: ยานลำเลียงจอดลอย (ทับคนที่อยู่ใต้ยาน)
  for (const ds of shipsOf(fd)) {
    if (ds.state !== "landed") continue;
    const z = dropZ(ds, now);
    list.push({
      d: Math.max(depthOf(ds.x + 0.1, ds.y + 0.1), depthOf(ds.x + 1.9, ds.y + 0.1), depthOf(ds.x + 0.1, ds.y + 1.9), depthOf(ds.x + 1.9, ds.y + 1.9)),
      f: () => drawDropship(g, ds.x, ds.y, z, now, lowQ),
    });
  }
  if (fd.dome && Array.isArray(fd.dome.gates)) for (const t of fd.dome.gates) list.push({ d: depthOf(t.x + 0.5, t.y + 0.5), f: () => drawBarrier(g, t.x, t.y, now) }); // ผู้เล่นเดินทะลุได้ มอนทุบได้
  const sup = fd.sky && fd.sky.supply;
  if (sup) for (const car of supplyCars(sup)) list.push({ d: depthOf((car.a + car.b) / 2, RAIL_Y + 0.5), f: () => drawTrainCar(g, car, car.dir, night, now, []) });
  for (const w of (fd.cityWalls && fd.cityWalls.broken) || []) list.push({ d: depthOf(w.x + 0.5, w.y + 0.5), f: () => drawRubble(g, w.x, w.y, palOf({ night })) });
  // หีบสมบัติ (ผู้ใช้สั่ง 2026-11-10 — ของให้ไปเก็บทั่วแผนที่)
  for (const c of fd.chests || []) list.push({ d: depthOf(c.x + 0.5, c.y + 0.5), f: () => drawChest(g, c.x + 0.5, c.y + 0.5, now, night, lowQ) });
  p4Items(list, g, fd, units, now, lowQ, night); // ขั้น 4
  void info;
}
// ท้องฟ้าพิเศษ (PVE รอบหก): คราสกลางวัน = ม่านมืดอมแดง + ขอบจอมืด · จันทร์เต็มดวง = แสงเงินอาบทั้งจอ
//  (เลิกวาดดวงอาทิตย์/ดวงจันทร์เป็นวงกลมแปะมุมจอ — ผู้ใช้ 2026-11-10 "ดวงอาทิตย์แปะลอยตามจอ ตลกมาก")
function skyFx(g, fd, now, lowQ, X0, Y0, W, H) {
  const sk = fd.sky || {};
  if (sk.eclipse) {
    g.fillStyle = "rgba(40,10,20,.24)"; g.fillRect(X0, Y0, W, H);
    const vg = g.createRadialGradient(X0 + W / 2, Y0 + H / 2, Math.min(W, H) * 0.3, X0 + W / 2, Y0 + H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(60,10,0,${0.45 + (lowQ ? 0 : 0.05 * Math.sin(now / 900))})`);
    g.fillStyle = vg; g.fillRect(X0, Y0, W, H);
  }
  if (sk.fullMoon) { g.fillStyle = "rgba(170,190,230,.1)"; g.fillRect(X0, Y0, W, H); }
}
let NIGHT_WAS = null;
export function air(g, fd, info, units, now, lowQ, view) {
  for (const e0 of fd.fx || []) { const e = p4Norm(e0); if (fx[e.kind] && fxOnce(e)) playFx(e); }
  // กลางวัน ↔ กลางคืน: เสียงเปลี่ยนช่วง
  if (NIGHT_WAS !== null && NIGHT_WAS !== !!fd.night && fd.night) sfx("night_fall", { gain: 0.7 });
  NIGHT_WAS = !!fd.night;
  const W = view ? view.x1 - view.x0 : LW, H = view ? view.y1 - view.y0 : 720, X0 = view ? view.x0 : 0, Y0 = view ? view.y0 : 0;
  const kind = fd.weather && fd.weather.kind;
  let flash = 0;
  if (fd.blood) { // คืนพระจันทร์สีเลือด: ทั้งกระดานอมแดงเต้นช้าๆ
    g.fillStyle = `rgba(120,0,20,${0.2 + 0.05 * Math.sin(now / 900)})`; g.fillRect(X0, Y0, W, H);
  }
  if (fd.final) { // คืนสุดท้าย: ม่านม่วงแดงเข้ม + ขอบจอมืด (vignette)
    g.fillStyle = `rgba(50,0,40,${0.16 + 0.04 * Math.sin(now / 700)})`; g.fillRect(X0, Y0, W, H);
    const vg = g.createRadialGradient(X0 + W / 2, Y0 + H / 2, Math.min(W, H) * 0.35, X0 + W / 2, Y0 + H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(30,0,20,.5)"); g.fillStyle = vg; g.fillRect(X0, Y0, W, H);
  }
  if (kind === "eos_storm") {
    g.fillStyle = fd.night ? "rgba(2,5,16,.38)" : "rgba(20,28,40,.34)"; g.fillRect(X0, Y0, W, H);
    if (!lowQ) {
      // ขนาดเส้นฝนคงที่บนจอ (กล้องซูมใกล้ = พิกัดตรรกะเล็กลง) — ไม่หนาเป็นแท่งตอนซูม
      const zf = Math.max(0.12, Math.min(1.6, W / LW));
      g.strokeStyle = "rgba(205,220,240,.42)"; g.lineWidth = zf; g.beginPath();
      for (let i = 0; i < 170; i++) {
        const sp = (0.85 + hash(i, 2) * 0.5) * zf, y = Y0 + ((hash(i, 1) * H + now * sp) % (H + 40 * zf)) - 20 * zf, x = X0 + ((hash(i, 3) * W - (now * sp) * 0.25) % W + W) % W;
        g.moveTo(x, y); g.lineTo(x - 5 * zf, y + 18 * zf);
      }
      g.stroke();
    }
    const slot = Math.floor(now / 7000), at = hash(slot, 9) * 5600, d = now - slot * 7000 - at;
    if (d >= 0 && d < 260) flash = Math.max(flash, (d < 70 || (d > 140 && d < 200) ? 0.2 : 0.05));
  } else if (kind === "eos_sand") {
    // พายุทราย (ขั้น 5 · L21): ม่านทรายหมุนเฉพาะเหนือทะเลทราย Leide (x 13–31 · y 20–31) + ฝุ่นพัดเฉียง · ตัวเราอยู่ในโซน = ทั้งจอขุ่นด้วย
    const me = (units || []).find((u) => u.isMe && !u.corpse);
    const mx = me ? (me.rx != null ? me.rx : me.x) : -1, my = me ? (me.ry != null ? me.ry : me.y) : -1;
    const inside = mx >= 13 && my >= 20;
    const tint = fd.night ? "60,44,26" : "196,160,108";
    if (inside) { g.fillStyle = `rgba(${tint},${fd.night ? 0.42 : 0.36})`; g.fillRect(X0, Y0, W, H); }
    // ม่านทรายบนโซน: วงหมุนหลายชั้นตามช่องในทะเลทราย (หนาแน่นกลางโซน)
    const step = lowQ || FAST ? 3 : 2;
    for (let y = 20; y <= 31; y += step) for (let x = 13; x <= 31; x += step) {
      const ph = (now / (2600 + hash(x, y) * 1800) + hash(y, x)) % 1;
      const [sx, sy, s] = P(x + 0.5 + Math.sin(ph * TAU) * 0.6, y + 0.5, 0.4 + hash(x, y + 3) * 0.6);
      glowAt(g, sx, sy, s * (1.3 + hash(x + 1, y) * 0.9), tint, (inside ? 0.18 : 0.3) * (0.6 + 0.4 * Math.sin(ph * TAU * 2)));
    }
    if (!lowQ) {
      const zf = Math.max(0.12, Math.min(1.6, W / LW));
      g.strokeStyle = `rgba(${tint},${inside ? 0.55 : 0.3})`; g.lineWidth = 1.2 * zf; g.beginPath();
      const n = inside ? 150 : 60;
      for (let i = 0; i < n; i++) {
        let x, y;
        if (inside) { x = X0 + ((hash(i, 3) * W + now * (0.5 + hash(i, 2) * 0.4) * zf) % W); y = Y0 + hash(i, 1) * H + Math.sin(now / 300 + i) * 6 * zf; }
        else {
          const tx = 13 + hash(i, 3) * 19, ty = 20 + hash(i, 1) * 12, dx = ((now / 900 + hash(i, 4)) % 1) * 2.5;
          const p = P(tx + dx, ty, 0.3 + hash(i, 5) * 0.8); x = p[0]; y = p[1];
        }
        g.moveTo(x, y); g.lineTo(x - 14 * zf, y + 3 * zf);
      }
      g.stroke();
    }
  } else if (kind === "eos_snow") {
    // พายุหิมะ (ผู้ใช้สั่ง 2026-11-10): ม่านขาวฟ้า + เกล็ดหิมะปลิวเฉียง (ขนาดคงที่บนจอ) + ลมหอบเป็นระลอก
    const zf = Math.max(0.12, Math.min(1.6, W / LW)), gust = 0.5 + 0.5 * Math.sin(now / 1700);
    g.fillStyle = fd.night ? `rgba(40,55,85,${0.3 + 0.06 * gust})` : `rgba(225,236,248,${0.26 + 0.08 * gust})`; g.fillRect(X0, Y0, W, H);
    const n = lowQ ? 70 : FAST ? 140 : 230;
    g.fillStyle = fd.night ? "rgba(220,232,255,.75)" : "rgba(255,255,255,.92)";
    for (let i = 0; i < n; i++) {
      const sp = (0.05 + hash(i, 2) * 0.06) * zf, r = (0.8 + hash(i, 4) * 2.2) * zf;
      const y = Y0 + ((hash(i, 1) * H + now * sp) % (H + 20 * zf)) - 10 * zf;
      const x = X0 + ((hash(i, 3) * W - now * sp * (1.4 + gust) + Math.sin(now / 600 + i) * 8 * zf) % W + W) % W;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    if (!lowQ) for (let i = 0; i < 6; i++) { // ลมหิมะเป็นแผ่นจางวิ่งผ่าน
      const ph = (now / (5200 + i * 700) + hash(i, 8)) % 1;
      glowAt(g, X0 + W * (1.2 - ph * 1.4), Y0 + hash(i, 9) * H, H * 0.28, fd.night ? "160,180,215" : "250,252,255", 0.16 * gust);
    }
  } else if (kind === "eos_magnet") {
    // พายุแม่เหล็ก (PVE รอบหก): แสงออโรราเขียวม่วงพลิ้วเป็นริ้ว + จอกระพริบรบกวนเป็นช่วง
    const zf = Math.max(0.12, Math.min(1.6, W / LW));
    g.fillStyle = fd.night ? "rgba(20,10,40,.28)" : "rgba(60,40,90,.16)"; g.fillRect(X0, Y0, W, H);
    if (!lowQ) for (let r = 0; r < 4; r++) {
      const yb = Y0 + H * (0.12 + r * 0.09), rgb = r % 2 ? "120,255,190" : "190,120,255";
      g.beginPath();
      for (let i = 0; i <= 24; i++) { const x = X0 + (W * i) / 24, y = yb + Math.sin(i * 0.6 + now / (900 + r * 200) + r) * 18 * zf; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.strokeStyle = `rgba(${rgb},${0.18 + 0.08 * Math.sin(now / 500 + r)})`; g.lineWidth = 16 * zf; g.stroke();
    }
    const slot = Math.floor(now / 4200), d = now - slot * 4200 - hash(slot, 11) * 3400;
    if (d >= 0 && d < 180 && !lowQ) { g.fillStyle = "rgba(200,255,230,.08)"; for (let i = 0; i < 12; i++) g.fillRect(X0, Y0 + hash(i, slot) * H, W, 2 * zf); }
  } else if (kind === "eos_fog" && !lowQ) {
    for (let i = 0; i < 10; i++) {
      const ph = (now / (22000 + i * 1500) + hash(i, 5)) % 1;
      glowAt(g, X0 + ph * W * 1.4 - W * 0.2, Y0 + hash(i, 6) * H, H * 0.35, fd.night ? "90,105,130" : "220,226,232", 0.22);
    }
  }
  skyFx(g, fd, now, lowQ, X0, Y0, W, H); // คราส · จันทร์เต็มดวง (PVE รอบหก)
  // โดมกำแพงเวท (ขึ้น = โตจากพื้น · สลาย = จางหาย)
  if (fd.dome && Array.isArray(fd.dome.rect)) drawDome(g, fd.dome.rect, domeGrow(now), 1, now, lowQ);
  else {
    const off = lastFx("dome_off");
    const p = off ? fxT(off, now, fx.dome_off) : 1;
    if (p < 1) drawDome(g, off.rect || TOWN_RECTS.insomnia, 1 + p * 0.06, 1 - p, now, lowQ);
  }
  p4AirAlways(g, fd, now); // ขั้น 4: ไฟหน้ารถไฟที่ขอบแผนที่ระหว่างเตือน
  const out = { flash: 0 };
  setFxNow(now);
  for (const e0 of fxActive(fd, now)) {
    const e = p4Norm(e0), p = fxT(e, now, e.seqd ? 1 : fx[e.kind] || 1500); // seqd: ฉากย่อยคำนวณเองตามคิว (subP) — p ทั้งก้อนไม่ใช้
    if (stage2Fx(g, e, p, now, lowQ)) continue;
    if (stage3Fx(g, e, p, now, lowQ, units, out, Y0)) continue;
    if (p4Fx(g, e, p, now, lowQ, units, out, !!fd.night)) continue;
    if (pveFx(g, e, p, lowQ)) continue;
    if (pve2Fx(g, e, p, lowQ, units)) continue;
    if (pve3Fx(g, e, p, lowQ, units, out)) continue;
    if (e.kind === "lightning") {
      const [x, y, s] = P(e.x + 0.5, e.y + 0.5);
      if (p < 0.12) flash = Math.max(flash, 0.4 * (1 - p / 0.12));
      const a = p < 0.5 ? 1 : Math.max(0, 1 - (p - 0.5) * 2.4);
      if (a > 0) bolt(g, x + (hash(e.seq, 4) - 0.5) * 60, Y0 - 10, x, y, e.seq, Math.max(1.6, s * 0.05), a);
      glowAt(g, x, y, s * (0.7 + p * 0.8), "200,225,255", (1 - p) * 0.9);
    } else if (e.kind === "daemon_spawn" || e.kind === "daemon_dissolve") {
      for (const t of e.list || []) {
        const [x, y, s] = P(t.x + 0.5, t.y + 0.5);
        const rise = e.kind === "daemon_spawn" ? p : 1 - p;
        g.fillStyle = e.kind === "daemon_spawn" ? `rgba(40,0,30,${0.6 * (1 - p)})` : `rgba(255,240,200,${0.6 * (1 - p)})`;
        g.fillRect(x - s * 0.25, y - s * 2 * rise, s * 0.5, s * 2 * rise);
        glowAt(g, x, y - s * 0.6, s * 1.4, e.kind === "daemon_spawn" ? "160,20,120" : "255,230,170", (1 - p) * 0.8);
      }
    } else if (e.kind === "daemon_attack") {
      for (const a of e.attacks || []) {
        const u = unitAt(units, a.target);
        if (!u) continue;
        const [x, y, s] = P(u.x, u.y, 0.6);
        g.strokeStyle = `rgba(255,60,90,${1 - p})`; g.lineWidth = Math.max(2, s * 0.05);
        for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x - s * 0.3 + i * s * 0.1, y - s * 0.3); g.lineTo(x + s * 0.3 + i * s * 0.1, y + s * 0.2); g.stroke(); }
      }
    } else if (e.kind === "daemon_die") {
      const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.6);
      for (let i = 0; i < 14; i++) {
        const ang = hash(i, e.seq) * TAU, r = s * 1.2 * p;
        g.fillStyle = `rgba(120,30,110,${1 - p})`; g.beginPath(); g.arc(x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.6 - s * 0.6 * p, Math.max(1, s * 0.05), 0, TAU); g.fill();
      }
      glowAt(g, x, y, s * 1.4, "200,60,180", (1 - p) * 0.8);
    } else if (e.kind === "daemon_hit" || e.kind === "daemon_struck") {
      const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.7);
      glowAt(g, x, y, s * 0.8, "255,255,255", (1 - p) * 0.7);
    } else if (e.kind === "choco_mount" || e.kind === "choco_fall" || e.kind === "choco_dismount") {
      const [x, y, s] = P(e.x + 0.5, e.y + 0.5, 0.6);
      for (let i = 0; i < 10; i++) {
        const ang = hash(i, e.seq) * TAU, r = s * 0.8 * p;
        g.save(); g.translate(x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.5 + s * 0.4 * p); g.rotate(ang + now / 200);
        g.fillStyle = `rgba(255,214,90,${1 - p})`; g.beginPath(); g.ellipse(0, 0, s * 0.06, s * 0.02, 0, 0, TAU); g.fill(); g.restore();
      }
    } else if (e.kind === "car_drive" && !lowQ) {
      for (const h of e.hits || []) {
        if (!h.from) continue;
        const [x, y, s] = P(h.from.x + 0.5, h.from.y + 0.5, 0.5);
        if (p > 0.35) glowAt(g, x, y, s * 1.0, "255,230,180", (1 - p) * 0.9);
      }
      const m = MOVES.get(e.car);
      if (m) {
        const pos = posOf(m, now);
        if (pos.moving) for (let i = 0; i < 6; i++) {
          const [x, y, s] = P(pos.x + 1 + (hash(i, e.seq) - 0.5) * 1.6, pos.y + 1 + (hash(i + 3, e.seq) - 0.5) * 1.6, 0.05);
          g.fillStyle = `rgba(200,190,170,${0.35 * (1 - p)})`; g.beginPath(); g.arc(x, y, s * (0.08 + hash(i, 9) * 0.08), 0, TAU); g.fill();
        }
      }
    }
  }
  // หมอกบางตามระยะ (aerial perspective): ด้านไกล (บนจอ) จางเป็นสีฟ้า → ใกล้กล้องใส
  if (!lowQ) {
    const gr = g.createLinearGradient(0, Y0, 0, Y0 + H * 0.55);
    gr.addColorStop(0, fd.night ? "rgba(40,60,110,.32)" : "rgba(205,222,240,.34)"); gr.addColorStop(1, "rgba(205,222,240,0)");
    g.fillStyle = gr; g.fillRect(X0, Y0, W, H * 0.55);
  }
  flash = Math.max(flash, out.flash);
  if (flash > 0) { g.fillStyle = `rgba(232,240,255,${flash})`; g.fillRect(X0, Y0, W, H); }
  void info;
}
