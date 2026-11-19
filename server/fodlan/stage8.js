// ============================================================
//  Nautilus ชั้น 2 "ซากเรือรบ" −200 ม. (ด่าน 8 · area 47 · GRID_PLAN §8.9) — ผัง server/fodlan/map8.js · ภาพ client/src/board/fodlan/wreck.js
//  ฮุคของชั้น = ของกลาง (nautilusLayer.makeLayer) + ลูกเล่นโต้ตอบ/สภาพอากาศ (ntWreck.js: ปืนใหญ่ · ถังดินปืน · กว้านโซ่สมอ · ปั้นจั่นรอก ·
//   ประตูกั้นน้ำ · ปลาไหลมอเรย์ · หีบสมบัติ · ตัวเรือถล่ม · ฉากมืดลง · ฝูงฉลาม · กระแสตะกอนถล่ม)
//  ทาลัสซา/เรือ/ออกซิเจน = ของทั้งโหมด (nautilus.js) — ตัวคุมเรียกเพิ่มจากฮุคตรงนี้เอง
// ============================================================
const { makeLayer } = require("./nautilusLayer");
const W = require("./ntWreck");

const base = makeLayer(8);
module.exports = {
  ...base,
  enter(ctx, st) { if (base.enter) base.enter(ctx, st); W.enter(ctx, st); },
  publicInfo(ctx, st) { return { ...(base.publicInfo ? base.publicInfo(ctx, st) : {}), ...W.publicInfo(ctx, st) }; },
  hudActions: W.hudActions,
  charAction: W.charAction,
  objects: W.objects,
  strikeObject: W.strikeObject,
  layer: W.layer,
  layerVer: W.layerVer,
  preRound: W.preRound,
  weatherStart: W.weatherStart,
  onUnitEnd: W.onUnitEnd,
  onEndTurn: W.onEndTurn,
  hazardAt: W.hazardAt,
};
