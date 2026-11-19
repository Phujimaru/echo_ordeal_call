// ============================================================
//  Nautilus ชั้น 3 "ปล่องภูเขาไฟใต้ทะเล" −1,000 ม. (ด่าน 9 · area 48 · GRID_PLAN §8.9) — ผัง server/fodlan/map9.js · ภาพ client/src/board/fodlan/vents.js
//  ฮุคของชั้น = ของกลาง (nautilusLayer.makeLayer) + ลูกเล่นโต้ตอบ/จังหวะปล่อง/ความมืด/สภาพอากาศ (ntVents.js:
//   บิดหัวปล่อง · อุดปล่อง · กลิ้งหินลาวา · ปล่องแรงดัน · ปล่องพ่นเป็นจังหวะ · รอยแยกลาวา · ผลักลงลาวา/หลุม · ภูเขาไฟปะทุ · แผ่นดินไหว)
//  ทาลัสซา/เรือ/ออกซิเจน = ของทั้งโหมด (nautilus.js) — ตัวคุมเรียกเพิ่มจากฮุคตรงนี้เอง
// ============================================================
const { makeLayer } = require("./nautilusLayer");
const V = require("./ntVents");

const base = makeLayer(9);
module.exports = {
  ...base,
  enter(ctx, st) { if (base.enter) base.enter(ctx, st); V.enter(ctx, st); },
  publicInfo(ctx, st) { return { ...(base.publicInfo ? base.publicInfo(ctx, st) : {}), ...V.publicInfo(ctx, st) }; },
  hudActions: V.hudActions,
  charAction: V.charAction,
  layer: V.layer,
  layerVer: V.layerVer,
  preRound: V.preRound,
  weatherStart: V.weatherStart,
  onUnitEnd: V.onUnitEnd,
  onEndTurn: V.onEndTurn,
  hazardAt: V.hazardAt,
  vision: V.vision,
  hides: V.hides,
};
