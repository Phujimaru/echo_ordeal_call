// ============================================================
//  Nautilus ชั้น 5 "ร่องลึกก้นสมุทร" −10,000 ม. (ด่าน 11 · area 50 · GRID_PLAN §8.9) — ผัง server/fodlan/map11.js · ภาพ client/src/board/fodlan/abyss.js
//  ฮุคของชั้น = ของกลาง (nautilusLayer.makeLayer) + ความมืด/ลูกเล่นโต้ตอบ (ntAbyss.js: มืดสนิท · แพลงก์ตอนเรือง · ไฟล่อปลาตกเบ็ด · พลุแสง · ทุบแพลงก์ตอน · ทุบสะพานหิน · ร่องลึก/หลุมดิ่ง · บ่อน้ำเกลือ · ความมืดบีบ)
//  ทาลัสซา (ดุสุด)/เรือ/ไฟฉายเรือ/ออกซิเจน = ของทั้งโหมด (nautilus.js) — ตัวคุมเรียกเพิ่มจากฮุคตรงนี้เอง · ชั้นนี้อยู่จนมีผู้ชนะ
// ============================================================
const { makeLayer } = require("./nautilusLayer");
const A = require("./ntAbyss");

const base = makeLayer(11);
module.exports = {
  ...base,
  enter(ctx, st) { if (base.enter) base.enter(ctx, st); A.enter(ctx, st); },
  publicInfo(ctx, st) { return { ...(base.publicInfo ? base.publicInfo(ctx, st) : {}), ...A.publicInfo(ctx, st) }; },
  hudActions: A.hudActions,
  charAction: A.charAction,
  layer: A.layer,
  layerVer: A.layerVer,
  atkBonus: A.atkBonus,
  onUnitEnd: A.onUnitEnd,
  onEndTurn: A.onEndTurn,
  weatherStart: A.weatherStart,
  weatherEnd: A.weatherEnd,
  vision: A.vision,
  hides: A.hides,
  hazardAt: A.hazardAt,
};
