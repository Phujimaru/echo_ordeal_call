// ============================================================
//  Nautilus ชั้น 6 "ทะเลข้อมูลจินตภาพ" (ด่าน 12 · area 51 · GRID_PLAN §8.9 ชั้น 6) — ผัง server/fodlan/map12.js · ภาพ client/src/board/fodlan/imaginary.js
//  ชั้น 5 อยู่ 3 เทิร์นแล้วกลายร่างเป็นชั้นนี้ (server/fodlan.js maybeAdvance) · อยู่จนมีผู้ชนะ
//  ฮุคของชั้น = ของกลาง (nautilusLayer.makeLayer) + คุณสมบัติจินตภาพ α–ζ / ระลอกข้อมูล (ntImaginary.js)
//  ทาลัสซาถาวร+ร่างข้อมูล (thalassa.js) · ไม่มีออกซิเจน (nautilusO2.js) · เรือ = ของทั้งโหมด (nautilus.js)
// ============================================================
const { makeLayer } = require("./nautilusLayer");
const I = require("./ntImaginary");

const base = makeLayer(12);
module.exports = {
  ...base,
  enter(ctx, st) { if (base.enter) base.enter(ctx, st); I.enter(ctx, st); },
  publicInfo(ctx, st) { return { ...(base.publicInfo ? base.publicInfo(ctx, st) : {}), ...I.publicInfo(ctx, st) }; },
  preRound: I.preRound,
  atkBonus: I.atkBonus,
  movMod: I.movMod,
  critPct: I.critPct,
  incoming: I.incoming,
  onUnitEnd: I.onUnitEnd,
  onEndTurn: I.onEndTurn,
};
