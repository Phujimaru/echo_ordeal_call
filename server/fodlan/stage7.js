// ============================================================
//  Nautilus ชั้น 1 "แนวปะการัง" −30 ม. (ด่าน 7 · area 46 · GRID_PLAN §8.9) — ผัง server/fodlan/map7.js · ภาพ client/src/board/fodlan/reef.js
//  ฮุคของชั้น = ของกลาง (nautilusLayer.makeLayer) + ลูกเล่นโต้ตอบ (ntReef.js: ปลาปักเป้า · หอยเม่น · ทุบสันปะการัง · วาล์วกระแสน้ำ · หอยมุก · หลุมน้ำเงิน)
//  ทาลัสซา/เรือ/ออกซิเจน = ของทั้งโหมด (nautilus.js) — ตัวคุมเรียกเพิ่มจากฮุคตรงนี้เอง
// ============================================================
const { makeLayer } = require("./nautilusLayer");
const R = require("./ntReef");

const base = makeLayer(7);
module.exports = {
  ...base,
  enter(ctx, st) { if (base.enter) base.enter(ctx, st); R.enter(ctx, st); },
  publicInfo(ctx, st) { return { ...(base.publicInfo ? base.publicInfo(ctx, st) : {}), ...R.publicInfo(ctx, st) }; },
  hudActions: R.hudActions,
  charAction: R.charAction,
  objects: R.objects,
  strikeObject: R.strikeObject,
  layer: R.layer,
  layerVer: R.layerVer,
  onUnitEnd: R.onUnitEnd,
  onEndTurn: R.onEndTurn,
  hazardAt: R.hazardAt,
};
