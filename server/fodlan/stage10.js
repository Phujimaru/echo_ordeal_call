// ============================================================
//  Nautilus ชั้น 4 "นครจมบาดาล" −3,000 ม. (ด่าน 10 · area 49 · GRID_PLAN §8.9) — ผัง server/fodlan/map10.js · ภาพ client/src/board/fodlan/city.js
//  ฮุคของชั้น = ของกลาง (nautilusLayer.makeLayer) + ลูกเล่นโต้ตอบ/ความมืด/สภาพอากาศ (ntCity.js: รูปปั้นเทพยิงลำแสง · แผ่นกดเสาล้ม · ประตูหิน+คันโยก ·
//   วงอักขระผนึกสกิล · อักขระบนพื้น · รูปปั้นเรืองแสง · แท่นบูชาทะเล · น้ำวนยักษ์ · กระแสน้ำเย็นจัด)
//  ทาลัสซา/เรือ/ออกซิเจน = ของทั้งโหมด (nautilus.js) — ตัวคุมเรียกเพิ่มจากฮุคตรงนี้เอง
// ============================================================
const { makeLayer } = require("./nautilusLayer");
const C = require("./ntCity");

const base = makeLayer(10);
module.exports = {
  ...base,
  enter(ctx, st) { if (base.enter) base.enter(ctx, st); C.enter(ctx, st); },
  publicInfo(ctx, st) { return { ...(base.publicInfo ? base.publicInfo(ctx, st) : {}), ...C.publicInfo(ctx, st) }; },
  hudActions: C.hudActions,
  charAction: C.charAction,
  objects: C.objects,
  strikeObject: C.strikeObject,
  layer: C.layer,
  layerVer: C.layerVer,
  onUnitEnd: C.onUnitEnd,
  onEndTurn: C.onEndTurn,
  weatherStart: C.weatherStart,
  weatherEnd: C.weatherEnd,
  movMod: C.movMod,
  vision: C.vision,
  hides: C.hides,
  hazardAt: C.hazardAt,
};
